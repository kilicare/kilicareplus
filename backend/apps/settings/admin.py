from django.contrib import admin
from .models import UserSettings


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    """Admin interface for UserSettings model."""
    
    list_display = ['user', 'profile_visibility', 'language', 'theme', 'updated_at']
    list_filter = ['profile_visibility', 'language', 'theme', 'email_notifications', 'push_notifications']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Notification Settings', {
            'fields': ('email_notifications', 'push_notifications', 'sms_notifications')
        }),
        ('Privacy Settings', {
            'fields': ('profile_visibility', 'show_location', 'allow_follow_requests')
        }),
        ('App Settings', {
            'fields': ('language', 'theme')
        }),
        ('Feature Toggles', {
            'fields': ('enable_ai_chat', 'enable_predictions', 'enable_sos', 'enable_showcase', 'enable_moments')
        }),
        ('Content Preferences', {
            'fields': ('content_filter', 'auto_download_media', 'low_data_mode')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
