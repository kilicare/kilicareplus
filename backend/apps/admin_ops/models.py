from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    Centralized audit trail for all critical system actions.
    Immutable logs for security, compliance, and debugging.
    """
    
    ACTION_CHOICES = [
        ('ROLE_CHANGE', 'Role Change'),
        ('POINTS_AWARD', 'Points Award'),
        ('USER_SUSPENSION', 'User Suspension'),
        ('USER_ACTIVATION', 'User Activation'),
        ('MODERATION_ACTION', 'Moderation Action'),
        ('SOS_OVERRIDE', 'SOS Override'),
        ('SOS_RESOLVE', 'SOS Resolve'),
        ('SOS_CANCEL', 'SOS Cancel'),
        ('SOS_ESCALATE', 'SOS Escalate'),
        ('ADMIN_ACTION', 'Admin Action'),
        ('B2B_EXPORT', 'B2B Export'),
        ('ANALYTICS_ACCESS', 'Analytics Access'),
        ('SYSTEM_OVERRIDE', 'System Override'),
        ('BOOKING_OVERRIDE', 'Booking Override'),
        ('PAYMENT_OVERRIDE', 'Payment Override'),
    ]
    
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs_as_actor',
        help_text="User who performed the action"
    )
    
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs_as_target',
        help_text="User affected by the action"
    )
    
    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    action_description = models.CharField(max_length=200)
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # State tracking
    before_state = models.JSONField(default=dict, blank=True, help_text="State before action")
    after_state = models.JSONField(default=dict, blank=True, help_text="State after action")
    
    # Metadata
    reason = models.TextField(blank=True, help_text="Reason for the action")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional context")
    
    # Immutable
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['actor', 'created_at']),
            models.Index(fields=['target_user', 'created_at']),
            models.Index(fields=['action_type', 'created_at']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
    
    def __str__(self):
        actor_str = self.actor.username if self.actor else 'System'
        target_str = self.target_user.username if self.target_user else 'N/A'
        return f"{actor_str} → {self.action_type} → {target_str} ({self.created_at})"


class BettingPredictionRecord(models.Model):
    """
    Track all betting predictions made by users through AI Chat.
    Used for analytics, audit trails, and deletion history.
    
    This replaces UserPrediction as the source-of-truth for prediction history.
    Predictions are never deleted, only marked as deleted_at (soft delete).
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='betting_predictions_records'
    )
    
    # Prediction details
    home_team = models.CharField(max_length=100)
    away_team = models.CharField(max_length=100)
    league = models.CharField(max_length=50)
    
    # Original user query (for audit trail)
    original_query = models.TextField(blank=True)
    
    # AI Chat context
    ai_message_id = models.CharField(max_length=50, blank=True, help_text="Link to AIMessage for context")
    ai_thread_id = models.CharField(max_length=50, blank=True, help_text="Link to AIThread for conversation")
    
    # Prediction data (from predictor engine)
    prediction_data = models.JSONField(default=dict, blank=True)
    
    # Soft delete tracking (for analytics)
    deleted_at = models.DateTimeField(null=True, blank=True, help_text="Null = not deleted, timestamp = deleted")
    delete_reason = models.CharField(max_length=200, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['user', 'league']),
            models.Index(fields=['deleted_at']),  # For analytics queries
        ]
    
    def __str__(self):
        status = 'deleted' if self.deleted_at else 'active'
        return f"{self.user.email} — {self.home_team} vs {self.away_team} [{status}]"
    
    def soft_delete(self, reason: str = "User deleted"):
        """Soft delete by recording deletion timestamp"""
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.delete_reason = reason
        self.save(update_fields=['deleted_at', 'delete_reason', 'updated_at'])


class LandingPageConfig(models.Model):
    """
    Configuration for landing page images and content.
    Managed by admin dashboard only.
    """

    # CTA Section
    cta_background_image = models.URLField(
        blank=True,
        help_text="Background image for CTA section"
    )

    # Experience Cards
    serengeti_image = models.URLField(
        blank=True,
        help_text="Image for Serengeti Safari experience card"
    )
    kilimanjaro_image = models.URLField(
        blank=True,
        help_text="Image for Kilimanjaro Trek experience card"
    )
    zanzibar_image = models.URLField(
        blank=True,
        help_text="Image for Zanzibar Beach experience card"
    )
    ngorongoro_image = models.URLField(
        blank=True,
        help_text="Image for Ngorongoro Crater experience card"
    )

    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='landing_page_updates'
    )

    class Meta:
        verbose_name = "Landing Page Configuration"
        verbose_name_plural = "Landing Page Configurations"

    def __str__(self):
        return f"Landing Page Config (updated {self.updated_at})"


class Testimonial(models.Model):
    """
    User testimonials/reviews for the landing page.
    Managed by admin dashboard - admin can feature real user reviews.
    """

    # User info
    name = models.CharField(max_length=100, help_text="Full name of the reviewer")
    role = models.CharField(max_length=100, help_text="Role/Title (e.g., Travel Blogger, Local Guide)")
    avatar_letter = models.CharField(max_length=1, help_text="First letter for avatar")

    # Review content
    text = models.TextField(help_text="Review text/testimonial")
    rating = models.IntegerField(default=5, help_text="Rating out of 5")
    location = models.CharField(max_length=100, help_text="Location where experience happened")

    # Styling
    color = models.CharField(
        max_length=7,
        default='#F5A623',
        help_text="Color for the testimonial card (hex code)"
    )

    # Optional link to user profile or external URL
    profile_url = models.URLField(blank=True, help_text="Optional link to user profile or external site")

    # Admin controls
    is_featured = models.BooleanField(default=True, help_text="Show on landing page")
    display_order = models.IntegerField(default=0, help_text="Order of display (lower = first)")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='testimonial_updates'
    )

    class Meta:
        ordering = ['display_order', '-created_at']
        verbose_name = "Testimonial"
        verbose_name_plural = "Testimonials"

    def __str__(self):
        return f"{self.name} - {self.role}"
