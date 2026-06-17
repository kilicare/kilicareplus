import logging
from typing import Optional, Dict, Any
from django.db import transaction
from .models import SOSAlert, SOSResponse, SOSEvent

logger = logging.getLogger(__name__)


class SOSEventService:
    """
    Unified service for creating SOS events and dispatching notifications.
    This is the single source of truth for all SOS timeline events.
    """
    
    @staticmethod
    def create_event(
        alert: SOSAlert,
        event_type: str,
        actor=None,
        response: Optional[SOSResponse] = None,
        message=None,
        data: Optional[Dict[str, Any]] = None,
    ) -> SOSEvent:
        """
        Create an SOS event and dispatch notification.
        
        Args:
            alert: The SOS alert
            event_type: Type of event (from SOSEvent.EVENT_TYPES)
            actor: User who triggered the event
            response: Related SOSResponse (if applicable)
            message: Related Message (if applicable)
            data: Additional event metadata
            
        Returns:
            Created SOSEvent instance
        """
        data = data or {}
        
        with transaction.atomic():
            # Create the event
            event = SOSEvent.objects.create(
                alert=alert,
                event_type=event_type,
                actor=actor,
                response=response,
                message=message,
                data=data,
            )
            
            # Dispatch notification based on event type
            SOSEventService._dispatch_notification(event)
            
            logger.info(f"[SOSEventService] Created event {event_type} for alert {alert.id}")
            return event
    
    @staticmethod
    def _dispatch_notification(event: SOSEvent) -> None:
        """
        Dispatch notification for the event using existing notification system.
        """
        from apps.notifications.event_dispatcher import notify_event
        
        alert = event.alert
        event_type = event.event_type
        actor = event.actor
        
        # Determine notification target based on event type
        target = None
        notification_type = None
        payload = event.data.copy()
        
        if event_type == 'SOS_CREATED':
            # Notify nearby guides (handled in consumer, but we log here)
            notification_type = 'SOS_CREATED'
            # Tourist gets confirmation via WebSocket in consumer
            
        elif event_type == 'GUIDE_RESPONDED':
            # Notify the tourist
            target = alert.user
            notification_type = 'SOS_RESPONSE'
            payload.update({
                'alert_id': alert.id,
                'responder_id': actor.id if actor else None,
                'responder_username': actor.username if actor else None,
                'message': event.response.message if event.response else '',
            })
            
        elif event_type == 'CHAT_MESSAGE':
            # Notify the other participant in the chat
            if actor and actor != alert.user:
                # Guide sent message, notify tourist
                target = alert.user
            elif actor and actor == alert.user:
                # Tourist sent message, notify the guide who responded
                # Find the first responder
                first_response = alert.responses.first()
                if first_response:
                    target = first_response.responder
            
            notification_type = 'NEW_MESSAGE'
            payload.update({
                'alert_id': alert.id,
                'message_id': event.message.id if event.message else None,
                'preview': event.message.content[:80] if event.message else '',
            })
            
        elif event_type == 'SOS_RESOLVED':
            # Notify all participants
            notification_type = 'SOS_RESOLVED'
            payload.update({
                'alert_id': alert.id,
                'resolved_by': actor.username if actor else 'System',
            })
            # Notify tourist
            if alert.user != actor:
                notify_event(
                    notification_type,
                    actor=actor,
                    target=alert.user,
                    payload=payload,
                )
            # Notify responders
            for response in alert.responses.all():
                if response.responder != actor:
                    notify_event(
                        notification_type,
                        actor=actor,
                        target=response.responder,
                        payload=payload,
                    )
            return  # Already dispatched
            
        elif event_type == 'SOS_CANCELLED':
            # Notify responders
            notification_type = 'SOS_CANCELLED'
            payload.update({
                'alert_id': alert.id,
                'cancelled_by': actor.username if actor else 'System',
            })
            for response in alert.responses.all():
                if response.responder != actor:
                    notify_event(
                        notification_type,
                        actor=actor,
                        target=response.responder,
                        payload=payload,
                    )
            return  # Already dispatched
            
        elif event_type == 'SOS_ESCALATED':
            # Notify admin (if actor is not admin)
            notification_type = 'SOS_ESCALATED'
            payload.update({
                'alert_id': alert.id,
                'escalated_by': actor.username if actor else 'System',
                'reason': data.get('reason', ''),
            })
            # Could notify admins here if needed
            return  # No notification for now
        
        # Dispatch notification if target determined
        if target and notification_type and actor:
            try:
                notify_event(
                    notification_type,
                    actor=actor,
                    target=target,
                    payload=payload,
                )
            except Exception as e:
                logger.error(f"[SOSEventService] Failed to dispatch notification: {e}")
    
    @staticmethod
    def get_timeline(alert_id: int) -> list:
        """
        Get structured timeline for an SOS alert.
        
        Args:
            alert_id: The SOS alert ID
            
        Returns:
            List of event dictionaries with all necessary data
        """
        events = SOSEvent.objects.filter(
            alert_id=alert_id
        ).select_related(
            'actor', 'response', 'message', 'message__sender'
        ).order_by('created_at')
        
        timeline = []
        for event in events:
            event_data = {
                'id': event.id,
                'event_type': event.event_type,
                'created_at': event.created_at.isoformat(),
                'actor': {
                    'id': event.actor.id,
                    'username': event.actor.username,
                    'first_name': event.actor.first_name,
                } if event.actor else None,
                'data': event.data,
            }
            
            # Add response data if applicable
            if event.response:
                event_data['response'] = {
                    'id': event.response.id,
                    'message': event.response.message,
                    'eta_minutes': event.response.eta_minutes,
                    'responder_username': event.response.responder.username,
                }
            
            # Add message data if applicable
            if event.message:
                event_data['message'] = {
                    'id': event.message.id,
                    'content': event.message.content,
                    'sender_id': event.message.sender.id,
                    'sender_username': event.message.sender.username,
                    'timestamp': event.message.timestamp.isoformat(),
                }
            
            timeline.append(event_data)
        
        return timeline
