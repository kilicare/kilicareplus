from django.db import models
from django.conf import settings


class Report(models.Model):
    """
    User-generated reports for content moderation.
    Tracks reports on moments, tips, experiences, users, etc.
    """
    
    CONTENT_TYPE_CHOICES = [
        ('MOMENT', 'Moment'),
        ('TIP', 'Tip'),
        ('EXPERIENCE', 'Experience'),
        ('USER', 'User'),
        ('COMMENT', 'Comment'),
        ('MESSAGE', 'Message'),
    ]
    
    REASON_CHOICES = [
        ('INAPPROPRIATE', 'Inappropriate Content'),
        ('SPAM', 'Spam'),
        ('HARASSMENT', 'Harassment'),
        ('MISINFORMATION', 'Misinformation'),
        ('COPYRIGHT', 'Copyright Violation'),
        ('SCAM', 'Scam/Fraud'),
        ('VIOLENCE', 'Violence'),
        ('HATE_SPEECH', 'Hate Speech'),
        ('OTHER', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved - No Action'),
        ('REJECTED', 'Rejected - No Violation'),
        ('HIDDEN', 'Hidden - Violation Found'),
        ('DELETED', 'Deleted - Severe Violation'),
        ('FEATURED', 'Featured - High Quality'),
        ('RESTORED', 'Restored - Reinstated'),
    ]
    
    # Reporter
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reports_created',
        help_text="User who submitted the report"
    )
    
    # Content being reported
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES)
    content_id = models.PositiveIntegerField(help_text="ID of the reported content")
    content_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reports_received',
        help_text="User who owns the reported content"
    )
    
    # Report details
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(help_text="Detailed description of the issue")
    evidence_urls = models.JSONField(default=list, help_text="List of evidence URLs/screenshots")
    
    # Moderation status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Moderator action
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports_moderated',
        help_text="Moderator who handled this report"
    )
    moderator_notes = models.TextField(blank=True, help_text="Moderator's notes")
    action_taken = models.CharField(max_length=50, blank=True, help_text="Action taken by moderator")
    
    # Priority
    priority = models.PositiveIntegerField(default=5, help_text="1=highest, 10=lowest")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['content_type', 'content_id']),
            models.Index(fields=['priority', '-created_at']),
            models.Index(fields=['reporter', '-created_at']),
            models.Index(fields=['content_owner', '-created_at']),
        ]
        verbose_name = "Moderation Report"
        verbose_name_plural = "Moderation Reports"
    
    def __str__(self):
        return f'Report #{self.id} - {self.content_type} {self.content_id} ({self.status})'


class ModerationAction(models.Model):
    """
    Audit log for all moderation actions taken.
    """
    
    ACTION_CHOICES = [
        ('APPROVE', 'Approve Content'),
        ('REJECT', 'Reject Report'),
        ('HIDE', 'Hide Content'),
        ('DELETE', 'Delete Content'),
        ('FEATURE', 'Feature Content'),
        ('RESTORE', 'Restore Content'),
        ('SUSPEND_USER', 'Suspend User'),
        ('WARN_USER', 'Warn User'),
        ('BULK_DELETE', 'Bulk Delete'),
        ('BULK_HIDE', 'Bulk Hide'),
    ]
    
    report = models.ForeignKey(
        Report,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actions',
        help_text="Related report (if applicable)"
    )
    
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='moderation_actions',
        help_text="Moderator who took the action"
    )
    
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES)
    content_type = models.CharField(max_length=20, blank=True)
    content_id = models.PositiveIntegerField(null=True, blank=True)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderation_actions_received',
        help_text="User affected by the action"
    )
    
    # Action details
    reason = models.TextField(help_text="Reason for the action")
    notes = models.TextField(blank=True, help_text="Additional notes")
    
    # Before/after state
    before_state = models.JSONField(default=dict, blank=True)
    after_state = models.JSONField(default=dict, blank=True)
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['moderator', '-created_at']),
            models.Index(fields=['target_user', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
            models.Index(fields=['report', '-created_at']),
        ]
        verbose_name = "Moderation Action"
        verbose_name_plural = "Moderation Actions"
    
    def __str__(self):
        moderator_str = self.moderator.username if self.moderator else 'System'
        return f'{moderator_str} - {self.action_type} ({self.created_at})'
