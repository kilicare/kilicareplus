import logging
from typing import Optional, Dict, Any
from django.db import transaction
from django.utils import timezone
from .models import SOSAlert, SOSResponse, SOSEvent

logger = logging.getLogger(__name__)


class IncidentStateService:
    """
    Centralized state engine for SOS incident lifecycle.
    All status changes MUST go through this service.
    No direct status mutations allowed anywhere in the codebase.
    """
    
    @staticmethod
    @transaction.atomic
    def set_responding_state(alert: SOSAlert) -> SOSAlert:
        """
        Set alert to RESPONDING state when first guide responds.
        This is the only way to transition to RESPONDING.
        """
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        if alert.status in ('RESOLVED', 'CANCELLED'):
            raise ValueError(f"Cannot set RESPONDING state on {alert.status} alert")
        
        alert.status = 'ASSIGNED'  # Changed from RESPONDING to match model STATUS choices
        alert.save(update_fields=['status'])
        
        logger.info(f"[IncidentStateService] Alert {alert.id} set to ASSIGNED")
        return alert
    
    @staticmethod
    @transaction.atomic
    def set_on_the_way_state(alert: SOSAlert, actor=None) -> SOSAlert:
        """
        Set alert to ON_THE_WAY state when primary responder starts traveling.
        This is the only way to transition to ON_THE_WAY.
        """
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        if not alert.can_transition_to('ON_THE_WAY'):
            raise ValueError(f"Cannot transition from {alert.status} to ON_THE_WAY")
        
        alert.transition_to('ON_THE_WAY', actor=actor)
        
        logger.info(f"[IncidentStateService] Alert {alert.id} set to ON_THE_WAY by {actor}")
        return alert
    
    @staticmethod
    @transaction.atomic
    def set_on_site_state(alert: SOSAlert, actor=None) -> SOSAlert:
        """
        Set alert to ON_SITE state when primary responder arrives.
        This is the only way to transition to ON_SITE.
        """
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        if not alert.can_transition_to('ON_SITE'):
            raise ValueError(f"Cannot transition from {alert.status} to ON_SITE")
        
        alert.transition_to('ON_SITE', actor=actor)
        
        logger.info(f"[IncidentStateService] Alert {alert.id} set to ON_SITE by {actor}")
        return alert
    
    @staticmethod
    @transaction.atomic
    def set_completed_state(alert: SOSAlert, actor=None) -> SOSAlert:
        """
        Set alert to COMPLETED state when primary responder completes rescue.
        This is the only way to transition to COMPLETED.
        """
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        if not alert.can_transition_to('COMPLETED'):
            raise ValueError(f"Cannot transition from {alert.status} to COMPLETED")
        
        alert.transition_to('COMPLETED', actor=actor)
        
        logger.info(f"[IncidentStateService] Alert {alert.id} set to COMPLETED by {actor}")
        return alert
    
    @staticmethod
    @transaction.atomic
    def set_escalated_state(alert: SOSAlert, actor=None, reason: str = None) -> SOSAlert:
        """
        Set alert to ESCALATED state.
        This is the only way to transition to ESCALATED.
        """
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        if not alert.can_transition_to('ESCALATED'):
            raise ValueError(f"Cannot transition from {alert.status} to ESCALATED")
        
        alert.transition_to('ESCALATED', actor=actor, reason=reason)
        
        logger.info(f"[IncidentStateService] Alert {alert.id} set to ESCALATED by {actor}")
        return alert
    
    @staticmethod
    @transaction.atomic
    def set_resolved_state(alert: SOSAlert, actor=None, reason: str = None) -> SOSAlert:
        """
        Set alert to RESOLVED state.
        This is the only way to transition to RESOLVED.
        """
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        alert.transition_to('RESOLVED', actor=actor, reason=reason)
        
        logger.info(f"[IncidentStateService] Alert {alert.id} set to RESOLVED by {actor}")
        return alert
    
    @staticmethod
    @transaction.atomic
    def set_cancelled_state(alert: SOSAlert, actor=None, reason: str = None) -> SOSAlert:
        """
        Set alert to CANCELLED state.
        This is the only way to transition to CANCELLED.
        """
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        alert.transition_to('CANCELLED', actor=actor, reason=reason)
        
        logger.info(f"[IncidentStateService] Alert {alert.id} set to CANCELLED by {actor}")
        return alert
    
    @staticmethod
    @transaction.atomic
    def set_assigned_state(alert: SOSAlert, actor=None) -> SOSAlert:
        """
        Set alert to ASSIGNED state when primary responder is assigned.
        This is the only way to transition to ASSIGNED.
        """
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        alert.status = 'ASSIGNED'
        alert.assigned_at = timezone.now()
        alert.save(update_fields=['status', 'assigned_at'])
        
        logger.info(f"[IncidentStateService] Alert {alert.id} set to ASSIGNED by {actor}")
        return alert
    
    @staticmethod
    @transaction.atomic
    def set_standby_status(response: SOSResponse) -> SOSResponse:
        """
        Set a response to INTERESTED (standby) status.
        This is the only way to mark a responder as standby.
        """
        response = SOSResponse.objects.select_for_update().get(id=response.id)
        response.transition_guide_status('INTERESTED')
        
        logger.info(f"[IncidentStateService] Response {response.id} set to INTERESTED (standby)")
        return response


class IncidentSecurityService:
    """
    Security validation service for SOS incident operations.
    Enforces authorization rules and access control.
    """
    
    # Rate limiting configuration (requests per minute)
    RATE_LIMITS = {
        'status_updates': 10,
        'assignment_actions': 5,
        'response_creation': 3,
    }
    
    @staticmethod
    def check_rate_limit(user, action_type: str) -> tuple[bool, str]:
        """
        Check if user has exceeded rate limit for a specific action type.
        
        Args:
            user: The user to check
            action_type: Type of action (status_updates, assignment_actions, response_creation)
            
        Returns:
            (allowed, error_message)
        """
        from django.core.cache import cache
        from django.utils import timezone
        
        limit = IncidentSecurityService.RATE_LIMITS.get(action_type, 10)
        cache_key = f"sos_rate_limit_{user.id}_{action_type}"
        
        # Get current count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            return False, f"Rate limit exceeded for {action_type}. Please try again later."
        
        # Increment count with 1-minute expiry
        cache.set(cache_key, current_count + 1, 60)
        
        return True, ""
    
    @staticmethod
    def can_guide_perform_lifecycle_action(alert: SOSAlert, user) -> tuple[bool, str]:
        """
        Validate that a guide can perform lifecycle actions (accept, on_the_way, arrived, complete).
        Only PRIMARY responder can perform these actions.
        
        Returns:
            (allowed, error_message)
        """
        if alert.primary_responder != user:
            return False, "Only the primary responder can perform this action"
        
        return True, ""
    
    @staticmethod
    def can_admin_reassign_responder(alert: SOSAlert, new_responder_id: int) -> tuple[bool, str]:
        """
        Validate that admin can reassign to the specified responder.
        Admin can only assign responders already attached to the incident.
        
        Returns:
            (allowed, error_message)
        """
        # Check if responder has already responded to this incident
        response_exists = SOSResponse.objects.filter(
            alert=alert,
            responder_id=new_responder_id
        ).exists()
        
        if not response_exists:
            return False, "Selected responder has not responded to this incident"
        
        return True, ""
    
    @staticmethod
    def can_access_timeline(alert: SOSAlert, user) -> tuple[bool, str]:
        """
        Validate that user can access incident timeline.
        Only: tourist, responders, standby responders, admins can access.
        
        Returns:
            (allowed, error_message)
        """
        # Tourist can access their own alerts
        if alert.user == user:
            return True, ""
        
        # Admins can access all alerts
        if user.role == 'ADMIN':
            return True, ""
        
        # Responders (primary and standby) can access
        has_response = SOSResponse.objects.filter(
            alert=alert,
            responder=user
        ).exists()
        
        if has_response:
            return True, ""
        
        return False, "You do not have permission to access this timeline"


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
            
            # Dispatch notification after transaction commits for consistency
            # This ensures notifications are only sent if the event creation succeeds
            transaction.on_commit(lambda: SOSEventService._dispatch_notification(event))
            
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
        
        elif event_type == 'GUIDE_INTERESTED':
            # Guide showed interest, notify tourist
            target = alert.user
            notification_type = 'SOS_RESPONSE'
            payload.update({
                'alert_id': alert.id,
                'responder_id': actor.id if actor else None,
                'responder_username': actor.username if actor else None,
                'message': event.response.message if event.response else '',
            })
            
        elif event_type == 'GUIDE_ASSIGNED':
            # Guide assigned as primary, notify tourist and guide
            notification_type = 'SOS_RESPONSE'
            payload.update({
                'alert_id': alert.id,
                'responder_id': actor.id if actor else None,
                'responder_username': actor.username if actor else None,
                'message': 'Umepewa msaidizi mkuu',
            })
            # Notify tourist
            if alert.user != actor:
                notify_event(
                    notification_type,
                    actor=actor,
                    target=alert.user,
                    payload=payload,
                )
            # Notify the assigned guide
            if actor and actor != alert.user:
                notify_event(
                    notification_type,
                    actor=alert.user,
                    target=actor,
                    payload=payload,
                )
            return  # Already dispatched
            
        elif event_type == 'GUIDE_ACCEPTED':
            # Guide accepted assignment, notify tourist
            target = alert.user
            notification_type = 'SOS_RESPONSE'
            payload.update({
                'alert_id': alert.id,
                'responder_id': actor.id if actor else None,
                'responder_username': actor.username if actor else None,
                'message': 'Msaidizi amekubali kuja',
            })
            
        elif event_type == 'GUIDE_ON_THE_WAY':
            # Guide is on the way, notify tourist
            target = alert.user
            notification_type = 'SOS_RESPONSE'
            payload.update({
                'alert_id': alert.id,
                'responder_id': actor.id if actor else None,
                'responder_username': actor.username if actor else None,
                'message': 'Msaidizi yuko njiani',
            })
            
        elif event_type == 'GUIDE_ARRIVED':
            # Guide arrived on site, notify tourist
            target = alert.user
            notification_type = 'SOS_RESPONSE'
            payload.update({
                'alert_id': alert.id,
                'responder_id': actor.id if actor else None,
                'responder_username': actor.username if actor else None,
                'message': 'Msaidizi amefika',
            })
            
        elif event_type == 'GUIDE_COMPLETED':
            # Guide completed the rescue, notify tourist
            target = alert.user
            notification_type = 'SOS_RESPONSE'
            payload.update({
                'alert_id': alert.id,
                'responder_id': actor.id if actor else None,
                'responder_username': actor.username if actor else None,
                'message': 'Msaidizi amemaliza usaidizi',
            })
            
        elif event_type == 'PRIMARY_REASSIGNED':
            # Primary responder was reassigned, notify all parties
            notification_type = 'SOS_RESPONSE'
            payload.update({
                'alert_id': alert.id,
                'old_primary_username': data.get('old_primary_username'),
                'new_primary_username': data.get('new_primary_username'),
                'reason': data.get('reason', ''),
                'message': f'Msaidizi mkuu amebadilishwa: {data.get("new_primary_username")}',
            })
            # Notify tourist
            if alert.user != actor:
                notify_event(
                    notification_type,
                    actor=actor,
                    target=alert.user,
                    payload=payload,
                )
            # Notify old primary
            old_primary_id = data.get('old_primary_id')
            if old_primary_id:
                from apps.accounts.models import User
                try:
                    old_primary = User.objects.get(id=old_primary_id)
                    if old_primary != actor:
                        notify_event(
                            notification_type,
                            actor=actor,
                            target=old_primary,
                            payload=payload,
                        )
                except User.DoesNotExist:
                    pass
            # Notify new primary
            new_primary_id = data.get('new_primary_id')
            if new_primary_id:
                from apps.accounts.models import User
                try:
                    new_primary = User.objects.get(id=new_primary_id)
                    if new_primary != actor:
                        notify_event(
                            notification_type,
                            actor=actor,
                            target=new_primary,
                            payload=payload,
                        )
                except User.DoesNotExist:
                    pass
            return  # Already dispatched
        
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
            'actor', 'response__responder', 'message__sender'
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


class SmartDispatchService:
    """
    Smart dispatch service for automatic primary responder selection.
    Evaluates ETA, availability, and existing assignment state to select the best responder.
    All operations are atomic to prevent race conditions.
    """
    
    @staticmethod
    def select_primary_responder(alert: SOSAlert) -> Optional['User']:
        """
        Select the best primary responder from all responses.
        
        Selection criteria (in order of priority):
        1. Lowest ETA (if provided)
        2. First responder (if no ETA provided)
        3. Verified guides preferred
        
        Args:
            alert: The SOS alert (must be locked with select_for_update)
            
        Returns:
            The selected User as primary responder, or None if no responses
        """
        responses = alert.responses.filter(
            guide_status='INTERESTED'
        ).select_related('responder', 'responder__profile')
        
        if not responses.exists():
            return None
        
        # If already has primary responder, keep them unless they failed
        if alert.primary_responder:
            primary_response = responses.filter(responder=alert.primary_responder).first()
            if primary_response and primary_response.guide_status in ['INTERESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED']:
                # Primary is still active, keep them
                return alert.primary_responder
        
        # Select based on ETA (lower is better)
        responses_with_eta = responses.filter(eta_minutes__isnull=False).order_by('eta_minutes')
        if responses_with_eta.exists():
            selected = responses_with_eta.first()
            return selected.responder
        
        # No ETA provided, select first responder
        selected = responses.order_by('created_at').first()
        return selected.responder if selected else None
    
    @staticmethod
    @transaction.atomic
    def dispatch_primary(alert: SOSAlert) -> bool:
        """
        Dispatch primary responder assignment with atomic locking.
        
        Args:
            alert: The SOS alert
            
        Returns:
            True if assignment was made, False otherwise
        """
        # Lock the alert and responses to prevent race conditions
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        if alert.status in ('RESOLVED', 'CANCELLED'):
            return False
        
        selected_responder = SmartDispatchService.select_primary_responder(alert)
        if not selected_responder:
            return False
        
        # Assign primary with atomic operation
        was_assigned = alert.assign_primary_responder(selected_responder)
        if was_assigned:
            # Update the response status to ACCEPTED
            response = alert.responses.filter(responder=selected_responder).first()
            if response:
                response.transition_guide_status('ACCEPTED')
            
            # Mark other responders as standby using IncidentStateService
            for response in alert.responses.exclude(responder=selected_responder):
                IncidentStateService.set_standby_status(response)
            
            logger.info(f"[SmartDispatch] Assigned {selected_responder.username} as primary for alert {alert.id}")
            return True
        
        return False


class StandbyPromotionService:
    """
    Standby promotion service for automatic failover when primary responder fails.
    All operations are atomic to prevent race conditions.
    """
    
    @staticmethod
    @transaction.atomic
    def check_and_promote_standby(alert: SOSAlert) -> bool:
        """
        Check if primary responder has failed and promote best standby.
        
        Failure conditions:
        - Primary responder cancelled their response
        - Primary responder has been inactive for too long (configurable)
        - Primary responder explicitly declined
        
        Args:
            alert: The SOS alert
            
        Returns:
            True if promotion occurred, False otherwise
        """
        # Lock the alert to prevent race conditions
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        if not alert.primary_responder:
            # No primary, try to assign one
            return SmartDispatchService.dispatch_primary(alert)
        
        # Check if primary is still active
        primary_response = alert.responses.filter(
            responder=alert.primary_responder
        ).first()
        
        if not primary_response:
            # Primary response deleted, promote standby
            return StandbyPromotionService._promote_best_standby(alert)
        
        # Check if primary has failed (based on status)
        if primary_response.guide_status in ('COMPLETED', 'UNABLE_TO_CONTINUE'):
            # Primary completed or unable to continue, promote standby
            if primary_response.guide_status == 'UNABLE_TO_CONTINUE':
                logger.warning(f"[StandbyPromotion] Primary {alert.primary_responder.username} unable to continue, promoting standby")
            return StandbyPromotionService._promote_best_standby(alert)
        
        # Check if primary has been inactive for too long
        # For now, we'll use a simple heuristic: if primary hasn't updated status in 30 minutes
        from django.utils import timezone
        from datetime import timedelta
        timeout_threshold = timezone.now() - timedelta(minutes=30)
        
        if (primary_response.guide_status == 'ACCEPTED' and 
            primary_response.accepted_at and 
            primary_response.accepted_at < timeout_threshold):
            # Primary accepted but hasn't moved in 30 minutes, promote standby
            logger.warning(f"[StandbyPromotion] Primary {alert.primary_responder.username} inactive, promoting standby")
            return StandbyPromotionService._promote_best_standby(alert)
        
        return False
    
    @staticmethod
    @transaction.atomic
    def _promote_best_standby(alert: SOSAlert) -> bool:
        """
        Promote the best standby responder to primary.
        This is atomic - no temporary "no primary responder" state.
        
        Args:
            alert: The SOS alert (must be locked with select_for_update)
            
        Returns:
            True if promotion occurred, False otherwise
        """
        # Lock the alert again to ensure atomicity
        alert = SOSAlert.objects.select_for_update().get(id=alert.id)
        
        old_primary = alert.primary_responder
        
        # Select new primary BEFORE clearing old one
        # This prevents the "no primary" state
        selected_responder = SmartDispatchService.select_primary_responder(alert)
        
        if not selected_responder:
            # No standby available, clear primary
            alert.primary_responder = None
            alert.save(update_fields=['primary_responder'])
            logger.warning(f"[StandbyPromotion] No standby available for alert {alert.id}, primary cleared")
            return False
        
        # Atomic swap: assign new primary immediately
        alert.primary_responder = selected_responder
        alert.assigned_at = timezone.now()
        
        # Use IncidentStateService for state change
        IncidentStateService.set_assigned_state(alert, actor=selected_responder)
        
        # Update the new primary's response status
        new_response = alert.responses.filter(responder=selected_responder).first()
        if new_response:
            new_response.transition_guide_status('ACCEPTED')
        
        # Mark old primary as INTERESTED (standby) using IncidentStateService
        if old_primary:
            old_response = alert.responses.filter(responder=old_primary).first()
            if old_response:
                IncidentStateService.set_standby_status(old_response)
        
        # Mark other responders as standby using IncidentStateService
        for response in alert.responses.exclude(responder=selected_responder):
            IncidentStateService.set_standby_status(response)
        
        # Create reassignment event
        SOSEventService.create_event(
            alert=alert,
            event_type='PRIMARY_REASSIGNED',
            actor=selected_responder,
            data={
                'old_primary_id': old_primary.id if old_primary else None,
                'old_primary_username': old_primary.username if old_primary else None,
                'new_primary_id': selected_responder.id,
                'new_primary_username': selected_responder.username,
                'reason': 'Standby promotion',
            }
        )
        
        logger.info(f"[StandbyPromotion] Promoted {selected_responder.username} from standby for alert {alert.id}")
        return True
