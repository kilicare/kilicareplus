from django.db import models
from django.conf import settings


class UserSettings(models.Model):
    """
    User settings model for controlling app behavior, notifications, privacy, and feature toggles.
    This enables a settings-driven architecture where user preferences control feature availability.
    """
    
    # User relationship
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='settings',
        unique=True
    )
    
    # Notification Settings
    email_notifications = models.BooleanField(default=True, help_text="Enable email notifications")
    push_notifications = models.BooleanField(default=True, help_text="Enable push notifications")
    sms_notifications = models.BooleanField(default=False, help_text="Enable SMS notifications")
    
    # Privacy Settings
    PROFILE_VISIBILITY_CHOICES = [
        ('PUBLIC', 'Public - Visible to everyone'),
        ('FOLLOWERS', 'Followers Only'),
        ('PRIVATE', 'Private - Hidden from everyone'),
    ]
    profile_visibility = models.CharField(
        max_length=20,
        choices=PROFILE_VISIBILITY_CHOICES,
        default='PUBLIC',
        help_text="Who can view your profile"
    )
    show_location = models.BooleanField(default=True, help_text="Show your location on map")
    allow_follow_requests = models.BooleanField(default=True, help_text="Allow others to follow you")
    
    # App Settings
    LANGUAGE_CHOICES = [
        ('sw', 'Kiswahili'),
        ('en', 'English'),
        ('fr', 'Français'),
        ('es', 'Español'),
        ('de', 'Deutsch'),
        ('ar', 'العربية'),
        ('zh', '中文'),
    ]
    language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='sw',
        help_text="Preferred language"
    )
    
    THEME_CHOICES = [
        ('dark', 'Dark'),
        ('light', 'Light'),
        ('auto', 'Auto (System)'),
    ]
    theme = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default='dark',
        help_text="App theme preference"
    )
    
    # Feature Toggles - Settings-Driven Architecture
    enable_ai_chat = models.BooleanField(default=True, help_text="Enable AI Chat feature")
    enable_predictions = models.BooleanField(default=True, help_text="Enable Sports Predictions feature")
    enable_sos = models.BooleanField(default=True, help_text="Enable SOS Emergency feature")
    enable_showcase = models.BooleanField(default=True, help_text="Enable Virtual Showcase feature")
    enable_moments = models.BooleanField(default=True, help_text="Enable Social Moments feature")
    
    # Content Preferences
    CONTENT_FILTER_CHOICES = [
        ('NONE', 'No Filter'),
        ('LOW', 'Low Sensitivity'),
        ('MEDIUM', 'Medium Sensitivity'),
        ('HIGH', 'High Sensitivity'),
    ]
    content_filter = models.CharField(
        max_length=20,
        choices=CONTENT_FILTER_CHOICES,
        default='MEDIUM',
        help_text="Content filtering sensitivity"
    )
    
    # Data & Storage
    auto_download_media = models.BooleanField(default=False, help_text="Auto-download media on mobile data")
    low_data_mode = models.BooleanField(default=False, help_text="Reduce data usage (lower quality images)")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Settings"
        verbose_name_plural = "User Settings"
    
    def __str__(self):
        return f'{self.user.username} Settings'
    
    def save(self, *args, **kwargs):
        # Ensure settings exist for user
        if not hasattr(self, 'user'):
            raise ValueError("UserSettings must be associated with a user")
        super().save(*args, **kwargs)
