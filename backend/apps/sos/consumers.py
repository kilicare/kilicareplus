import json
import math
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


class SOSConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return

        await self.channel_layer.group_add(
            'sos_global', self.channel_name
        )

        # Guides get SOS alerts
        if self.user.role == 'LOCAL_GUIDE':
            await self.channel_layer.group_add(
                'sos_guides', self.channel_name
            )

        # User-specific room (to receive responses)
        await self.channel_layer.group_add(
            f'sos_user_{self.user.id}', self.channel_name
        )

        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            'sos_global', self.channel_name
        )
        await self.channel_layer.group_discard(
            'sos_guides', self.channel_name
        )
        await self.channel_layer.group_discard(
            f'sos_user_{self.user.id}', self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'create_sos':
            alert = await self.create_alert(data)
            # Notify ALL guides
            await self.channel_layer.group_send('sos_guides', {
                'type': 'sos_new_alert',
                'alert': {
                    'id': alert.id,
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'latitude': alert.latitude,
                    'longitude': alert.longitude,
                    'severity': alert.severity,
                    'message': alert.message or '',
                    'status': alert.status,
                    'created_at': alert.created_at.isoformat(),
                },
            })
            # Confirm to user
            await self.send(text_data=json.dumps({
                'type': 'sos_created',
                'alert_id': alert.id,
            }))

        elif action == 'respond_sos':
            alert_id = data.get('alert_id')
            response = await self.create_response(
                alert_id,
                data.get('message', ''),
                data.get('eta_minutes'),
            )
            if response:
                alert = await self.get_alert(alert_id)
                # Notify the tourist
                await self.channel_layer.group_send(
                    f'sos_user_{alert.user_id}',
                    {
                        'type': 'sos_response_received',
                        'response': {
                            'responder_id': self.user.id,
                            'responder_username': self.user.username,
                            'message': response.message,
                            'eta_minutes': response.eta_minutes,
                            'created_at': response.created_at.isoformat(),
                        },
                    }
                )
                # Award points to responder
                await self.award_responder_points()

        elif action == 'resolve_sos':
            alert_id = data.get('alert_id')
            await self.resolve_alert(alert_id)
            await self.channel_layer.group_send('sos_global', {
                'type': 'sos_resolved',
                'alert_id': alert_id,
            })

        elif action == 'cancel_sos':
            alert_id = data.get('alert_id')
            await self.cancel_alert(alert_id)

    async def sos_new_alert(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_sos',
            **event,
        }))

    async def sos_response_received(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_response',
            **event,
        }))

    async def sos_resolved(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_resolved',
            'alert_id': event['alert_id'],
        }))

    @database_sync_to_async
    def create_alert(self, data):
        from .models import SOSAlert
        alert = SOSAlert.objects.create(
            user=self.user,
            latitude=data['latitude'],
            longitude=data['longitude'],
            severity=data.get('severity', 'HIGH'),
            message=data.get('message', ''),
        )
        return alert

    @database_sync_to_async
    def create_response(self, alert_id, message, eta=None):
        from .models import SOSAlert, SOSResponse
        try:
            alert = SOSAlert.objects.get(id=alert_id)
            response = SOSResponse.objects.create(
                alert=alert,
                responder=self.user,
                message=message,
                eta_minutes=eta,
            )
            alert.status = 'RESPONDING'
            alert.responder_count += 1
            alert.save(update_fields=['status', 'responder_count'])
            return response
        except SOSAlert.DoesNotExist:
            return None

    @database_sync_to_async
    def get_alert(self, alert_id):
        from .models import SOSAlert
        return SOSAlert.objects.get(id=alert_id)

    @database_sync_to_async
    def resolve_alert(self, alert_id):
        from .models import SOSAlert
        from django.utils import timezone
        SOSAlert.objects.filter(
            id=alert_id, user=self.user
        ).update(status='RESOLVED', resolved_at=timezone.now())

    @database_sync_to_async
    def cancel_alert(self, alert_id):
        from .models import SOSAlert
        SOSAlert.objects.filter(
            id=alert_id, user=self.user
        ).update(status='CANCELLED')

    @database_sync_to_async
    def award_responder_points(self):
        try:
            self.user.passport.award_points('SOS_RESPONSE')
        except Exception:
            pass