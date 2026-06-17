import math
import logging
from django.db import models
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
        ('RESPONDING', 'Responding'),
        ('ESCALATED', 'Escalated'),
        ('RESOLVED', 'Resolved'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    # Valid state transitions
    VALID_TRANSITIONS = {
        'ACTIVE': ['RESPONDING', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
        'RESPONDING': ['ESCALATED', 'RESOLVED', 'CANCELLED'],
        'ESCALATED': ['RESPONDING', 'RESOLVED', 'CANCELLED'],
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


class SOSResponse(models.Model):
    alert = models.ForeignKey(
        SOSAlert, on_delete=models.CASCADE, related_name='responses'
    )
    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    message = models.TextField()
    eta_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_onsite = models.BooleanField(default=False)
    onsite_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['alert', 'created_at']),
            models.Index(fields=['responder', '-created_at']),
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


class SOSEvent(models.Model):
    """
    Unified event timeline for SOS system.
    Every action in SOS creates an event - this is the single source of truth.
    """
    EVENT_TYPES = [
        ('SOS_CREATED', 'SOS Created'),
        ('GUIDE_RESPONDED', 'Guide Responded'),
        ('CHAT_MESSAGE', 'Chat Message'),
        ('STATUS_CHANGE', 'Status Changed'),
        ('SOS_RESOLVED', 'SOS Resolved'),
        ('SOS_CANCELLED', 'SOS Cancelled'),
        ('SOS_ESCALATED', 'SOS Escalated'),
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
        ]
        verbose_name = "SOS Event"
        verbose_name_plural = "SOS Events"
    
    def __str__(self):
        actor_str = self.actor.username if self.actor else 'System'
        return f"{self.event_type} — {actor_str} — Alert {self.alert.id}"