import math
import logging
from django.db import models, transaction
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class SOSAlert(models.Model):
    SEVERITY = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    STATUS = [
        ('ACTIVE', 'Active'),
        ('ASSIGNED', 'Assigned'),
        ('ON_THE_WAY', 'On The Way'),
        ('ON_SITE', 'On Site'),
        ('COMPLETED', 'Completed'),
        ('ESCALATED', 'Escalated'),
        ('RESOLVED', 'Resolved'),
        ('CANCELLED', 'Cancelled'),
        ('HANDOFF', 'Handoff'),
    ]
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        'ACTIVE': ['ASSIGNED', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
        'ASSIGNED': ['ON_THE_WAY', 'HANDOFF', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
        'ON_THE_WAY': ['ON_SITE', 'HANDOFF', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
        'ON_SITE': ['COMPLETED', 'HANDOFF', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
        'COMPLETED': ['RESOLVED'],  # COMPLETED leads to RESOLVED
        'HANDOFF': ['ASSIGNED', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
        'ESCALATED': ['ASSIGNED', 'ON_THE_WAY', 'ON_SITE', 'RESOLVED', 'CANCELLED'],
        'RESOLVED': [],  # Terminal state
        'CANCELLED': [],  # Terminal state
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sos_alerts',
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    location_address = models.CharField(
        max_length=500, null=True, blank=True
    )
    severity = models.CharField(
        max_length=10, choices=SEVERITY, default='HIGH'
    )
    status = models.CharField(
        max_length=15, choices=STATUS, default='ACTIVE'
    )
    message = models.TextField(null=True, blank=True)
    responder_count = models.PositiveIntegerField(default=0)
    
    # Primary responder assignment
    primary_responder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='primary_alerts',
        help_text="The guide currently assigned as primary responder"
    )
    assigned_at = models.DateTimeField(null=True, blank=True, help_text="When primary responder was assigned")
    
    # Admin override tracking
    admin_override_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sos_overrides',
        help_text="Admin who overrode this alert"
    )
    admin_override_reason = models.TextField(null=True, blank=True)
    admin_override_at = models.DateTimeField(null=True, blank=True)
    
    # Escalation tracking
    escalated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sos_escalations',
        help_text="User who escalated this alert"
    )
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalation_reason = models.TextField(null=True, blank=True)
    
    # Response time tracking
    first_response_at = models.DateTimeField(null=True, blank=True, help_text="Time of first responder")
    avg_response_time_minutes = models.FloatField(null=True, blank=True, help_text="Average time to respond")

    # Chat integration
    chat_room = models.ForeignKey(
        'messaging.ChatRoom',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sos_alerts',
        help_text="Chat room for ongoing conversation between tourist and guide"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['severity', '-created_at']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['primary_responder', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
        constraints = [
            # Ensure that an incident can only have one active primary responder
            # This is enforced at the database level to prevent race conditions
            models.CheckConstraint(
                check=models.Q(primary_responder__isnull=True) | models.Q(status__in=['ASSIGNED', 'ON_THE_WAY', 'ON_SITE', 'COMPLETED', 'HANDOFF']),
                name='primary_responder_only_when_assigned',
                violation_error_message='Primary responder can only be set when incident is in assigned state'
            )
        ]

    def __str__(self):
        return (
            f'SOS {self.severity} — {self.user.username} '
            f'({self.status})'
        )
    
    def can_transition_to(self, new_status):
        """Check if state transition is valid."""
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])
    
    def transition_to(self, new_status, actor=None, reason=None):
        """
        Transition to new status with validation and audit logging.
        """
        if not self.can_transition_to(new_status):
            raise ValueError(f"Invalid transition from {self.status} to {new_status}")
        
        old_status = self.status
        self.status = new_status
        
        # Set timestamps based on status
        if new_status == 'RESOLVED':
            self.resolved_at = timezone.now()
        elif new_status == 'CANCELLED':
            self.cancelled_at = timezone.now()
        elif new_status == 'ASSIGNED':
            self.assigned_at = timezone.now()
        elif new_status == 'ON_SITE':
            # Track when guide is on site (if primary responder exists)
            if self.primary_responder:
                primary_response = self.responses.filter(responder=self.primary_responder).first()
                if primary_response:
                    primary_response.transition_guide_status('ARRIVED')
        elif new_status == 'COMPLETED':
            # Mark primary responder as completed
            if self.primary_responder:
                primary_response = self.responses.filter(responder=self.primary_responder).first()
                if primary_response:
                    primary_response.transition_guide_status('COMPLETED')
        
        # Track escalation
        if new_status == 'ESCALATED':
            self.escalated_by = actor
            self.escalated_at = timezone.now()
            self.escalation_reason = reason
        
        # Track admin override
        if actor and actor.role == 'ADMIN' and new_status in ['RESOLVED', 'CANCELLED']:
            self.admin_override_by = actor
            self.admin_override_at = timezone.now()
            self.admin_override_reason = reason
        
        self.save()
        
        # Audit log
        from apps.admin_ops.services import log_sos_action
        log_sos_action(
            actor=actor,
            action_type=f'SOS_{new_status.upper()}',
            alert_id=self.id,
            target_user=self.user,
            reason=reason,
        )
        
        return True
    
    @transaction.atomic
    def assign_primary_responder(self, responder, actor=None):
        """
        Assign a guide as the primary responder for this SOS alert.
        This operation is atomic to prevent race conditions.
        
        All assignment logic MUST go through this method.
        """
        # Lock the alert and responses to prevent concurrent assignments
        alert = SOSAlert.objects.select_for_update().get(id=self.id)
        
        # Check if already assigned to this responder
        if alert.primary_responder and alert.primary_responder.id == responder.id:
            # Already assigned, no change needed
            return False
        
        # Lock all responses for this alert to prevent concurrent modifications
        responses = SOSResponse.objects.select_for_update().filter(alert=alert)
        
        # Verify responder has actually responded to this incident
        responder_response = responses.filter(responder=responder).first()
        if not responder_response:
            raise ValueError("Responder has not responded to this incident")
        
        old_primary = alert.primary_responder
        old_primary_response = responses.filter(responder=old_primary).first() if old_primary else None
        
        # Atomic assignment: set new primary immediately
        alert.primary_responder = responder
        alert.assigned_at = timezone.now()
        alert.save(update_fields=['primary_responder', 'assigned_at'])
        
        # Use IncidentStateService for state change
        from .services import IncidentStateService
        IncidentStateService.set_assigned_state(alert, actor=actor or responder)
        
        # Update the new primary's response status to ACCEPTED
        responder_response.transition_guide_status('ACCEPTED')
        
        # Mark old primary as INTERESTED (standby) if exists
        if old_primary_response:
            from .services import IncidentStateService
            IncidentStateService.set_standby_status(old_primary_response)
        
        # Mark all other responders as standby
        for response in responses.exclude(responder=responder):
            from .services import IncidentStateService
            IncidentStateService.set_standby_status(response)
        
        # Create timeline event
        from .services import SOSEventService
        event_type = 'PRIMARY_REASSIGNED' if old_primary else 'GUIDE_ASSIGNED'
        SOSEventService.create_event(
            alert=alert,
            event_type=event_type,
            actor=actor or responder,
            response=responder_response,
            data={
                'responder_id': responder.id,
                'responder_username': responder.username,
                'previous_responder_id': old_primary.id if old_primary else None,
                'previous_responder_username': old_primary.username if old_primary else None,
            }
        )
        
        return True


class SOSResponse(models.Model):
    GUIDE_STATUS = [
        ('INTERESTED', 'Interested'),
        ('ACCEPTED', 'Accepted'),
        ('ON_THE_WAY', 'On The Way'),
        ('ARRIVED', 'Arrived'),
        ('COMPLETED', 'Completed'),
        ('UNABLE_TO_CONTINUE', 'Unable To Continue'),
    ]
    
    alert = models.ForeignKey(
        SOSAlert, on_delete=models.CASCADE, related_name='responses'
    )
    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    message = models.TextField()
    eta_minutes = models.PositiveIntegerField(null=True, blank=True)
    guide_status = models.CharField(
        max_length=20, choices=GUIDE_STATUS, default='INTERESTED'
    )
    is_onsite = models.BooleanField(default=False)
    onsite_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True, help_text="When guide accepted assignment")
    on_the_way_at = models.DateTimeField(null=True, blank=True, help_text="When guide started traveling")
    arrived_at = models.DateTimeField(null=True, blank=True, help_text="When guide arrived on site")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When guide completed the rescue")
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['alert', 'created_at']),
            models.Index(fields=['responder', '-created_at']),
            models.Index(fields=['alert', 'responder']),
            models.Index(fields=['guide_status', '-created_at']),
            models.Index(fields=['alert', 'guide_status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['alert', 'responder'],
                name='unique_responder_per_alert',
                violation_error_message='A guide can only respond to an incident once'
            )
        ]

    def __str__(self):
        return f'{self.responder.username} → Alert {self.alert.id}'
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Update alert's first response time if this is the first response
        alert = self.alert
        if alert.first_response_at is None:
            alert.first_response_at = timezone.now()
            
            # Calculate response time in minutes
            response_time = (alert.first_response_at - alert.created_at).total_seconds() / 60
            alert.avg_response_time_minutes = response_time
            alert.save(update_fields=['first_response_at', 'avg_response_time_minutes'])
    
    def transition_guide_status(self, new_status, actor=None):
        """
        Transition guide status with timestamp updates.
        """
        valid_transitions = {
            'INTERESTED': ['ACCEPTED'],
            'ACCEPTED': ['ON_THE_WAY'],
            'ON_THE_WAY': ['ARRIVED'],
            'ARRIVED': ['COMPLETED'],
            'COMPLETED': [],  # Terminal state
        }
        
        if new_status not in valid_transitions.get(self.guide_status, []):
            raise ValueError(f"Invalid guide status transition from {self.guide_status} to {new_status}")
        
        self.guide_status = new_status
        
        # Update timestamps based on status
        if new_status == 'ACCEPTED':
            self.accepted_at = timezone.now()
        elif new_status == 'ON_THE_WAY':
            self.on_the_way_at = timezone.now()
        elif new_status == 'ARRIVED':
            self.arrived_at = timezone.now()
            self.is_onsite = True
            self.onsite_at = timezone.now()
        elif new_status == 'COMPLETED':
            self.completed_at = timezone.now()
        
        self.save()
        return True


class SOSEvent(models.Model):
    """
    Unified event timeline for SOS system.
    Every action in SOS creates an event - this is the single source of truth.
    """
    EVENT_TYPES = [
        ('SOS_CREATED', 'SOS Created'),
        ('GUIDE_INTERESTED', 'Guide Interested'),
        ('GUIDE_ASSIGNED', 'Guide Assigned'),
        ('GUIDE_ACCEPTED', 'Guide Accepted'),
        ('GUIDE_ON_THE_WAY', 'Guide On The Way'),
        ('GUIDE_ARRIVED', 'Guide Arrived'),
        ('GUIDE_COMPLETED', 'Guide Completed'),
        ('CHAT_MESSAGE', 'Chat Message'),
        ('STATUS_CHANGE', 'Status Changed'),
        ('SOS_RESOLVED', 'SOS Resolved'),
        ('SOS_CANCELLED', 'SOS Cancelled'),
        ('SOS_ESCALATED', 'SOS Escalated'),
        ('PRIMARY_REASSIGNED', 'Primary Reassigned'),
        ('ADMIN_INTERVENTION', 'Admin Intervention'),
    ]
    
    alert = models.ForeignKey(
        SOSAlert,
        on_delete=models.CASCADE,
        related_name='events',
        help_text="The SOS alert this event belongs to"
    )
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPES,
        db_index=True,
        help_text="Type of event"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sos_events',
        help_text="User who triggered this event"
    )
    
    # Optional links to related objects
    response = models.ForeignKey(
        SOSResponse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
        help_text="Related SOS response (if applicable)"
    )
    message = models.ForeignKey(
        'messaging.Message',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sos_events',
        help_text="Related chat message (if applicable)"
    )
    
    # Event data
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional event metadata"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['alert', '-created_at']),
            models.Index(fields=['event_type', '-created_at']),
            models.Index(fields=['actor', '-created_at']),
            models.Index(fields=['alert', 'event_type', '-created_at']),
        ]
        verbose_name = "SOS Event"
        verbose_name_plural = "SOS Events"
    
    def __str__(self):
        actor_str = self.actor.username if self.actor else 'System'
        return f"{self.event_type} — {actor_str} — Alert {self.alert.id}"