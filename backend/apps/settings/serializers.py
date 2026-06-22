from rest_framework import serializers
from .models import UserSettings


class UserSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for UserSettings model.
    Handles all user preference settings including notifications, privacy, and feature toggles.
    """
    
    class Meta:
        model = UserSettings
        fields = [
            'id',
            # Notification Settings
            'email_notifications',
            'push_notifications',
            'sms_notifications',
            # Privacy Settings
            'profile_visibility',
            'show_location',
            'allow_follow_requests',
            # App Settings
            'language',
            'theme',
            # Feature Toggles
            'enable_ai_chat',
            'enable_predictions',
            'enable_sos',
            'enable_showcase',
            'enable_moments',
            # Content Preferences
            'content_filter',
            # Data & Storage
            'auto_download_media',
            'low_data_mode',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """
        Validate settings to ensure logical consistency.
        """
        # If low_data_mode is enabled, auto_download_media should be disabled
        if data.get('low_data_mode', False) and data.get('auto_download_media', False):
            raise serializers.ValidationError({
                'auto_download_media': 'Cannot enable auto-download when low data mode is active'
            })
        
        return data
