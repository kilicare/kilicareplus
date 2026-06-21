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

        # User-specific room (to receive responses and nearby alerts)
        await self.channel_layer.group_add(
            f'sos_user_{self.user.id}', self.channel_name
        )

        await self.accept()
        logger.info(f"[SOSConsumer] User {self.user.id} connected successfully")

    async def disconnect(self, code):
        logger.info(f"[SOSConsumer] User {self.user.id} disconnecting (code: {code})")
        await self.channel_layer.group_discard(
            f'sos_user_{self.user.id}', self.channel_name
        )
        
        # Cleanup incident-specific groups
        # Get all incident groups this user was part of and clean them up
        if hasattr(self, 'incident_groups'):
            for incident_id in self.incident_groups:
                await self.channel_layer.group_discard(
                    f'incident_{incident_id}', self.channel_name
                )
    
    @database_sync_to_async
    def can_join_incident_group(self, alert_id: int) -> bool:
        """
        Check if user can join incident-scoped group.
        Only tourist, responders, standby responders, and admins can join.
        """
        from .models import SOSAlert, SOSResponse
        from .services import IncidentSecurityService
        
        try:
            alert = SOSAlert.objects.get(id=alert_id)
            can_access, _ = IncidentSecurityService.can_access_timeline(alert, self.user)
            return can_access
        except SOSAlert.DoesNotExist:
            return False
    
    async def join_incident_group(self, alert_id: int):
        """Join incident-scoped group if user has access."""
        can_join = await self.can_join_incident_group(alert_id)
        if can_join:
            await self.channel_layer.group_add(
                f'incident_{alert_id}', self.channel_name
            )
            # Track incident groups for cleanup
            if not hasattr(self, 'incident_groups'):
                self.incident_groups = set()
            self.incident_groups.add(alert_id)
            logger.info(f"[SOSConsumer] User {self.user.id} joined incident_{alert_id} group")
        else:
            logger.warning(f"[SOSConsumer] User {self.user.id} denied access to incident_{alert_id} group")

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
            # Notify admins via WebSocket for Phase 1
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admins = await database_sync_to_async(list)(User.objects.filter(role='ADMIN'))
            for admin in admins:
                await self.channel_layer.group_send(
                    f'sos_user_{admin.id}',
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
                        },
                    }
                )
            logger.info(f"[SOSConsumer] Notified {len(admins)} admins")
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
                responder_count = alert.responder_count
                
                # STEP 2: Send interest registered message to guide
                await self.channel_layer.group_send(
                    f'sos_user_{self.user.id}',
                    {
                        'type': 'sos_interest_registered',
                        'alert_id': alert.id,
                        'responder_id': responder_id,
                    }
                )
                
                # STEP 2: Send responder interest update to tourist (for live confidence update)
                await self.channel_layer.group_send(
                    f'sos_user_{alert.user_id}',
                    {
                        'type': 'sos_responder_interest',
                        'alert_id': alert.id,
                        'responder_count': responder_count,
                        'responder': {
                            'id': responder_id,
                            'username': responder_username,
                        }
                    }
                )
                
                # STEP 2: Notify admins about new responder interest
                from django.contrib.auth import get_user_model
                User = get_user_model()
                admins = await database_sync_to_async(list)(User.objects.filter(role='ADMIN'))
                for admin in admins:
                    await self.channel_layer.group_send(
                        f'sos_user_{admin.id}',
                        {
                            'type': 'sos_responder_interest',
                            'alert_id': alert.id,
                            'responder_count': responder_count,
                            'responder': {
                                'id': responder_id,
                                'username': responder_username,
                            }
                        }
                    )
                
                logger.info(f"[SOSConsumer] Interest registered for SOS {alert_id}, responder count: {responder_count}")
                
                # STEP 2: Create notifications based on responder count
                await self.dispatch_step2_notifications(alert, responder_count, responder_username)
                
                # Dispatch event-driven notification
                await self.dispatch_sos_response_notification(alert, response_message)
                # Award points to responder
                await self.award_responder_points()
            else:
                logger.warning(f"[SOSConsumer] Failed to create response for alert {alert_id}")

        elif action == 'resolve_sos':
            alert_id = data.get('alert_id')
            await self.resolve_alert(alert_id)
            # Broadcast to incident-scoped group
            await self.channel_layer.group_send(f'incident_{alert_id}', {
                'type': 'sos_resolved',
                'alert_id': alert_id,
            })

        elif action == 'cancel_sos':
            alert_id = data.get('alert_id')
            await self.cancel_alert(alert_id)
            # Broadcast to incident-scoped group
            await self.channel_layer.group_send(f'incident_{alert_id}', {
                'type': 'sos_cancelled',
                'alert_id': alert_id,
            })
        
        elif action == 'escalate_sos':
            alert_id = data.get('alert_id')
            reason = data.get('reason', 'User escalation')
            await self.escalate_alert(alert_id, reason)
            # Broadcast to incident-scoped group
            await self.channel_layer.group_send(f'incident_{alert_id}', {
                'type': 'sos_escalated',
                'alert_id': alert_id,
                'reason': reason,
            })

        elif action == 'accept_assignment':
            alert_id = data.get('alert_id')
            response = await self.accept_assignment(alert_id)
            if response:
                alert = await self.get_alert(alert_id)
                # Broadcast to incident-scoped group
                await self.channel_layer.group_send(f'incident_{alert_id}', {
                    'type': 'sos_assignment_accepted',
                    'alert_id': alert_id,
                    'responder_id': self.user.id,
                    'responder_username': self.user.username,
                })

        elif action == 'update_guide_status':
            alert_id = data.get('alert_id')
            new_status = data.get('status')
            response = await self.update_guide_status(alert_id, new_status)
            if response:
                alert = await self.get_alert(alert_id)
                # Broadcast to incident-scoped group
                await self.channel_layer.group_send(f'incident_{alert_id}', {
                    'type': 'sos_guide_status_updated',
                    'alert_id': alert_id,
                    'responder_id': self.user.id,
                    'responder_username': self.user.username,
                    'status': new_status,
                    'alert_status': alert.status,
                })
        
        elif action == 'join_incident':
            alert_id = data.get('alert_id')
            await self.join_incident_group(alert_id)

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

    async def sos_assignment_accepted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'assignment_accepted',
            **event,
        }))

    async def sos_guide_status_updated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'guide_status_updated',
            **event,
        }))
    
    async def sos_cancelled(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_cancelled',
            **event,
        }))
    
    async def sos_escalated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_escalated',
            **event,
        }))

    async def sos_interest_registered(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_interest_registered',
            'alert_id': event['alert_id'],
            'responder_id': event['responder_id'],
        }))

    async def sos_responder_interest(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_responder_interest',
            'alert_id': event['alert_id'],
            'responder_count': event['responder_count'],
            'responder': event['responder'],
        }))

    @database_sync_to_async
    def dispatch_step2_notifications(self, alert, responder_count, responder_username):
        from apps.notifications.models import Notification
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # STEP 2: Create notifications based on responder count
        if responder_count == 1:
            # First interest - notify tourist
            Notification.objects.create(
                recipient=alert.user,
                notification_type='SOS_INTEREST_REGISTERED',
                title='👀 A responder has noticed your incident',
                body=f'{responder_username} has expressed interest in helping you.',
                data={'alert_id': alert.id, 'responder_username': responder_username}
            )
            logger.info(f"[SOSConsumer] Created first interest notification for tourist {alert.user.id}")
        elif responder_count > 1:
            # Additional responders - notify tourist about multiple responders
            Notification.objects.create(
                recipient=alert.user,
                notification_type='SOS_MULTIPLE_RESPONDERS',
                title=f'🚑 {responder_count} responders are now available nearby',
                body=f'Multiple responders are available to help with your incident.',
                data={'alert_id': alert.id, 'responder_count': responder_count}
            )
            logger.info(f"[SOSConsumer] Created multiple responders notification for tourist {alert.user.id}")
        
        # STEP 2: Notify guide that they are now a candidate
        Notification.objects.create(
            recipient=self.user,
            notification_type='SOS_RESPONDER_CANDIDATE',
            title='🟡 You are now a responder candidate',
            body='Awaiting dispatch decision',
            data={'alert_id': alert.id}
        )
        logger.info(f"[SOSConsumer] Created responder candidate notification for guide {self.user.id}")
        
        # STEP 2: Notify admins about new responder interest
        admins = User.objects.filter(role='ADMIN')
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                notification_type='SOS_NEW_RESPONDER_INTEREST',
                title='🚑 New responder interest registered',
                body=f'{responder_username} has expressed interest in Incident #{alert.id}',
                data={'alert_id': alert.id, 'responder_username': responder_username}
            )
        logger.info(f"[SOSConsumer] Created new responder interest notifications for {admins.count()} admins")

    @database_sync_to_async
    def create_alert(self, data):
        from .models import SOSAlert
        from .services import SOSEventService

        # Debug: Log received severity
        logger.info(f"[SOSConsumer] Received severity from frontend: {data.get('severity')}")
        logger.info(f"[SOSConsumer] Full data keys: {list(data.keys())}")

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
        from .services import SOSEventService, IncidentStateService
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
                
                # STEP 2: Do NOT change status - keep WAITING_FOR_RESPONDER
                # STEP 2: Do NOT call SmartDispatchService - that's STEP 3
                
                # Atomic update of responder count
                alert.responder_count = F('responder_count') + 1
                alert.save(update_fields=['responder_count', 'chat_room'])
                
                # Refresh to get the actual value after F() update
                alert.refresh_from_db(fields=['responder_count'])
                
                # Create GUIDE_INTERESTED event
                SOSEventService.create_event(
                    alert=alert,
                    event_type='GUIDE_INTERESTED',
                    actor=self.user,
                    response=response,
                    data={
                        'message': message,
                        'eta_minutes': eta,
                        'chat_room_name': alert.chat_room.name if alert.chat_room else None,
                    }
                )
                
                # STEP 2: NO SmartDispatchService call - that's STEP 3
                
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
        return SOSAlert.objects.select_related('chat_room').get(id=alert_id)

    @database_sync_to_async
    def resolve_alert(self, alert_id):
        from .models import SOSAlert
        from .services import SOSEventService, IncidentStateService
        
        try:
            alert = SOSAlert.objects.select_for_update().get(id=alert_id, user=self.user)
            
            # Use IncidentStateService for state change
            IncidentStateService.set_resolved_state(alert, actor=self.user)
            
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
        from .services import SOSEventService, IncidentStateService
        
        try:
            alert = SOSAlert.objects.select_for_update().get(id=alert_id, user=self.user)
            
            # Use IncidentStateService for state change
            IncidentStateService.set_cancelled_state(alert, actor=self.user)
            
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
        from .services import SOSEventService, IncidentStateService
        try:
            alert = SOSAlert.objects.select_for_update().get(id=alert_id, user=self.user)
            
            # Use IncidentStateService for state change
            IncidentStateService.set_escalated_state(alert, actor=self.user, reason=reason)
            
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

    @database_sync_to_async
    def accept_assignment(self, alert_id):
        """Guide accepts assignment as primary responder."""
        from .models import SOSAlert, SOSResponse
        from .services import SOSEventService, IncidentStateService
        try:
            alert = SOSAlert.objects.select_for_update().get(id=alert_id)
            response = SOSResponse.objects.filter(
                alert=alert,
                responder=self.user
            ).first()
            
            if not response:
                logger.warning(f"[SOSConsumer] No response found for guide {self.user.id} on alert {alert_id}")
                return None
            
            # Security validation: only primary responder can accept
            from .services import IncidentSecurityService
            can_perform, error_msg = IncidentSecurityService.can_guide_perform_lifecycle_action(alert, self.user)
            if not can_perform:
                logger.warning(f"[SOSConsumer] {error_msg} for guide {self.user.id} on alert {alert_id}")
                return None
            
            # Transition guide status to ACCEPTED
            response.transition_guide_status('ACCEPTED')
            
            # Create GUIDE_ACCEPTED event
            SOSEventService.create_event(
                alert=alert,
                event_type='GUIDE_ACCEPTED',
                actor=self.user,
                response=response,
                data={
                    'responder_id': self.user.id,
                    'responder_username': self.user.username,
                }
            )
            
            # Update alert status using IncidentStateService
            IncidentStateService.set_on_the_way_state(alert, actor=self.user)
            
            # Check if standby promotion is needed
            from .services import StandbyPromotionService
            StandbyPromotionService.check_and_promote_standby(alert)
            
            logger.info(f"[SOSConsumer] Guide {self.user.username} accepted assignment for alert {alert_id}")
            return response
        except SOSAlert.DoesNotExist:
            logger.warning(f"[SOSConsumer] Alert {alert_id} not found")
            return None
        except Exception as e:
            logger.error(f"[SOSConsumer] Error accepting assignment: {e}")
            return None
    
    @database_sync_to_async
    def update_guide_status(self, alert_id, new_status):
        """Guide updates their status (on_the_way, arrived, completed)."""
        from .models import SOSAlert, SOSResponse
        from .services import SOSEventService, IncidentStateService
        try:
            alert = SOSAlert.objects.select_for_update().get(id=alert_id)
            response = SOSResponse.objects.filter(
                alert=alert,
                responder=self.user
            ).first()
            
            if not response:
                logger.warning(f"[SOSConsumer] No response found for guide {self.user.id} on alert {alert_id}")
                return None
            
            # Security validation: only primary responder can update status
            from .services import IncidentSecurityService
            can_perform, error_msg = IncidentSecurityService.can_guide_perform_lifecycle_action(alert, self.user)
            if not can_perform:
                logger.warning(f"[SOSConsumer] {error_msg} for guide {self.user.id} on alert {alert_id}")
                return None
            
            # Map frontend status to model status
            status_mapping = {
                'on_the_way': 'ON_THE_WAY',
                'arrived': 'ARRIVED',
                'completed': 'COMPLETED',
            }
            
            model_status = status_mapping.get(new_status)
            if not model_status:
                logger.warning(f"[SOSConsumer] Invalid guide status: {new_status}")
                return None
            
            # Transition guide status
            response.transition_guide_status(model_status)
            
            # Create appropriate event
            event_type_mapping = {
                'ON_THE_WAY': 'GUIDE_ON_THE_WAY',
                'ARRIVED': 'GUIDE_ARRIVED',
                'COMPLETED': 'GUIDE_COMPLETED',
            }
            
            event_type = event_type_mapping.get(model_status)
            if event_type:
                SOSEventService.create_event(
                    alert=alert,
                    event_type=event_type,
                    actor=self.user,
                    response=response,
                    data={
                        'responder_id': self.user.id,
                        'responder_username': self.user.username,
                    }
                )
            
            # Update alert status using IncidentStateService
            if model_status == 'ON_THE_WAY':
                IncidentStateService.set_on_the_way_state(alert, actor=self.user)
            elif model_status == 'ARRIVED':
                IncidentStateService.set_arrived_state(alert, actor=self.user)
            elif model_status == 'COMPLETED':
                # Guide completed the rescue - resolve the incident
                IncidentStateService.set_resolved_state(alert, actor=self.user, reason='Guide completed rescue')
            
            # Check if standby promotion is needed
            from .services import StandbyPromotionService
            StandbyPromotionService.check_and_promote_standby(alert)
            
            logger.info(f"[SOSConsumer] Guide {self.user.username} updated status to {model_status} for alert {alert_id}")
            return response
        except SOSAlert.DoesNotExist:
            logger.warning(f"[SOSConsumer] Alert {alert_id} not found")
            return None
        except Exception as e:
            logger.error(f"[SOSConsumer] Error updating guide status: {e}")
            return None