import json
import math
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


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
            logger.warning(f"[SOSConsumer] Connection rejected: user not authenticated")
            await self.close()
            return

        logger.info(f"[SOSConsumer] User {self.user.id} ({self.user.username}) connecting to SOS WebSocket")

        await self.channel_layer.group_add(
            'sos_global', self.channel_name
        )

        # User-specific room (to receive responses and nearby alerts)
        await self.channel_layer.group_add(
            f'sos_user_{self.user.id}', self.channel_name
        )

        await self.accept()
        logger.info(f"[SOSConsumer] User {self.user.id} connected successfully")

    async def disconnect(self, code):
        logger.info(f"[SOSConsumer] User {self.user.id} disconnecting (code: {code})")
        await self.channel_layer.group_discard(
            'sos_global', self.channel_name
        )
        await self.channel_layer.group_discard(
            f'sos_user_{self.user.id}', self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        logger.info(f"[SOSConsumer] Received action: {action} from user {self.user.id}")

        if action == 'create_sos':
            alert = await self.create_alert(data)
            logger.info(f"[SOSConsumer] SOS alert created: {alert.id} by user {self.user.id}")
            # Notify nearby guides only (within 10km)
            nearby_guides = await self.get_nearby_guides(alert.latitude, alert.longitude, max_distance_km=10)
            logger.info(f"[SOSConsumer] Notifying {len(nearby_guides)} nearby guides")
            for guide in nearby_guides:
                await self.channel_layer.group_send(
                    f'sos_user_{guide.id}',
                    {
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
                            'distance_km': guide.distance_km,
                        },
                    }
                )
            # Confirm to user
            await self.send(text_data=json.dumps({
                'type': 'sos_created',
                'alert_id': alert.id,
                'nearby_guide_count': len(nearby_guides),
            }))

        elif action == 'respond_sos':
            alert_id = data.get('alert_id')
            logger.info(f"[SOSConsumer] Guide {self.user.id} responding to SOS {alert_id}")
            response = await self.create_response(
                alert_id,
                data.get('message', ''),
                data.get('eta_minutes'),
            )
            if response:
                alert = await self.get_alert(alert_id)
                # Extract all data before async context
                chat_room_name = alert.chat_room.name if alert.chat_room else None
                response_message = response.message
                response_eta = response.eta_minutes
                response_created = response.created_at.isoformat()
                responder_id = self.user.id
                responder_username = self.user.username
                
                # Notify the tourist
                await self.channel_layer.group_send(
                    f'sos_user_{alert.user_id}',
                    {
                        'type': 'sos_response_received',
                        'response': {
                            'responder_id': responder_id,
                            'responder_username': responder_username,
                            'message': response_message,
                            'eta_minutes': response_eta,
                            'created_at': response_created,
                            'chat_room_name': chat_room_name,
                        },
                    }
                )
                # Also notify the guide about the chat room
                await self.channel_layer.group_send(
                    f'sos_user_{self.user.id}',
                    {
                        'type': 'sos_chat_room_created',
                        'alert_id': alert.id,
                        'chat_room_name': chat_room_name,
                    }
                )
                logger.info(f"[SOSConsumer] Response sent to tourist {alert.user_id}, chat room: {chat_room_name or 'None'}")
                # Dispatch event-driven notification
                await self.dispatch_sos_response_notification(alert, response_message)
                # Award points to responder
                await self.award_responder_points()
            else:
                logger.warning(f"[SOSConsumer] Failed to create response for alert {alert_id}")

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
        
        elif action == 'escalate_sos':
            alert_id = data.get('alert_id')
            reason = data.get('reason', 'User escalation')
            await self.escalate_alert(alert_id, reason)

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

    async def sos_chat_room_created(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_chat_room',
            'alert_id': event['alert_id'],
            'chat_room_name': event['chat_room_name'],
        }))

    async def sos_resolved(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_resolved',
            'alert_id': event['alert_id'],
        }))

    @database_sync_to_async
    def create_alert(self, data):
        from .models import SOSAlert
        from .services import SOSEventService
        
        alert = SOSAlert.objects.create(
            user=self.user,
            latitude=data['latitude'],
            longitude=data['longitude'],
            severity=data.get('severity', 'HIGH'),
            message=data.get('message', ''),
        )
        
        # Create SOS_CREATED event
        SOSEventService.create_event(
            alert=alert,
            event_type='SOS_CREATED',
            actor=self.user,
            data={
                'severity': alert.severity,
                'message': alert.message,
                'latitude': alert.latitude,
                'longitude': alert.longitude,
            }
        )
        
        return alert

    @database_sync_to_async
    def create_response(self, alert_id, message, eta=None):
        from django.db import transaction
        from django.db.models import F
        from .models import SOSAlert, SOSResponse
        from .services import SOSEventService
        from apps.messaging.models import ChatRoom
        try:
            with transaction.atomic():
                alert = SOSAlert.objects.select_for_update().get(id=alert_id)
                
                # Create or get chat room on first response
                if not alert.chat_room:
                    chat_room = ChatRoom.get_or_create_dm(self.user.id, alert.user_id)
                    alert.chat_room = chat_room
                    logger.info(f"[SOSConsumer] Created chat room {chat_room.name} for SOS {alert_id}")
                
                response = SOSResponse.objects.create(
                    alert=alert,
                    responder=self.user,
                    message=message,
                    eta_minutes=eta,
                )
                
                # Atomic update of status and responder count
                alert.status = 'RESPONDING'
                alert.responder_count = F('responder_count') + 1
                alert.save(update_fields=['status', 'responder_count', 'chat_room'])
                
                # Refresh to get the actual value after F() update
                alert.refresh_from_db(fields=['responder_count'])
                
                # Create GUIDE_RESPONDED event
                SOSEventService.create_event(
                    alert=alert,
                    event_type='GUIDE_RESPONDED',
                    actor=self.user,
                    response=response,
                    data={
                        'message': message,
                        'eta_minutes': eta,
                        'chat_room_name': alert.chat_room.name if alert.chat_room else None,
                    }
                )
                
                logger.info(f"[SOSConsumer] Response created for SOS {alert_id}, responder count: {alert.responder_count}")
                return response
        except SOSAlert.DoesNotExist:
            logger.warning(f"[SOSConsumer] Alert {alert_id} not found")
            return None
        except Exception as e:
            logger.error(f"[SOSConsumer] Error creating response: {e}")
            return None

    @database_sync_to_async
    def get_alert(self, alert_id):
        from .models import SOSAlert
        return SOSAlert.objects.get(id=alert_id)

    @database_sync_to_async
    def resolve_alert(self, alert_id):
        from .models import SOSAlert
        from .services import SOSEventService
        from django.utils import timezone
        
        try:
            alert = SOSAlert.objects.get(id=alert_id, user=self.user)
            alert.status = 'RESOLVED'
            alert.resolved_at = timezone.now()
            alert.save(update_fields=['status', 'resolved_at'])
            
            # Create SOS_RESOLVED event
            SOSEventService.create_event(
                alert=alert,
                event_type='SOS_RESOLVED',
                actor=self.user,
                data={
                    'resolved_at': alert.resolved_at.isoformat(),
                }
            )
        except SOSAlert.DoesNotExist:
            logger.warning(f"[SOSConsumer] Alert {alert_id} not found for user {self.user.id}")

    @database_sync_to_async
    def cancel_alert(self, alert_id):
        from .models import SOSAlert
        from .services import SOSEventService
        from django.utils import timezone
        
        try:
            alert = SOSAlert.objects.get(id=alert_id, user=self.user)
            alert.status = 'CANCELLED'
            alert.cancelled_at = timezone.now()
            alert.save(update_fields=['status', 'cancelled_at'])
            
            # Create SOS_CANCELLED event
            SOSEventService.create_event(
                alert=alert,
                event_type='SOS_CANCELLED',
                actor=self.user,
                data={
                    'cancelled_at': alert.cancelled_at.isoformat(),
                }
            )
        except SOSAlert.DoesNotExist:
            logger.warning(f"[SOSConsumer] Alert {alert_id} not found for user {self.user.id}")

    @database_sync_to_async
    def escalate_alert(self, alert_id, reason):
        from .models import SOSAlert
        from .services import SOSEventService
        try:
            alert = SOSAlert.objects.get(id=alert_id, user=self.user)
            alert.transition_to('ESCALATED', actor=self.user, reason=reason)
            
            # Create SOS_ESCALATED event
            SOSEventService.create_event(
                alert=alert,
                event_type='SOS_ESCALATED',
                actor=self.user,
                data={
                    'reason': reason,
                    'escalated_at': alert.escalated_at.isoformat() if alert.escalated_at else None,
                }
            )
            return True
        except SOSAlert.DoesNotExist:
            return False

    @database_sync_to_async
    def award_responder_points(self):
        try:
            self.user.passport.award_points('SOS_RESPONSE')
        except Exception:
            pass

    @database_sync_to_async
    def dispatch_sos_response_notification(self, alert, message):
        from apps.notifications.event_dispatcher import notify_event
        notify_event(
            'SOS_RESPONSE',
            actor=self.user,
            target=alert.user,
            payload={
                'alert_id': alert.id,
                'message': message,
            }
        )

    @database_sync_to_async
    def get_nearby_guides(self, lat, lon, max_distance_km=10):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        guides = []
        for guide in User.objects.filter(role='LOCAL_GUIDE').select_related('profile'):
            if hasattr(guide, 'profile') and guide.profile.latitude and guide.profile.longitude:
                distance = haversine_km(lat, lon, guide.profile.latitude, guide.profile.longitude)
                if distance <= max_distance_km:
                    guides.append({
                        'id': guide.id,
                        'username': guide.username,
                        'distance_km': round(distance, 2),
                    })
        return guides