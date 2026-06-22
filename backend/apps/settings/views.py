from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import UserSettings
from .serializers import UserSettingsSerializer


class UserSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for UserSettings model.
    Provides CRUD operations for user settings.
    """
    serializer_class = UserSettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only return settings for the authenticated user."""
        return UserSettings.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Automatically associate settings with the authenticated user."""
        serializer.save(user=self.request.user)
    
    def get_object(self):
        """Get or create settings for the authenticated user."""
        settings_obj, created = UserSettings.objects.get_or_create(
            user=self.request.user,
            defaults=self.request.data if self.request.data else {}
        )
        return settings_obj
    
    @action(detail=False, methods=['get'])
    def my_settings(self, request):
        """
        Get the authenticated user's settings.
        Creates default settings if they don't exist.
        """
        settings_obj, created = UserSettings.objects.get_or_create(
            user=request.user
        )
        serializer = self.get_serializer(settings_obj)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def update_settings(self, request):
        """
        Partially update the authenticated user's settings.
        Creates default settings if they don't exist.
        """
        settings_obj, created = UserSettings.objects.get_or_create(
            user=request.user
        )
        serializer = self.get_serializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def reset_defaults(self, request):
        """
        Reset user settings to default values.
        """
        settings_obj = get_object_or_404(UserSettings, user=request.user)
        
        # Reset to defaults
        settings_obj.email_notifications = True
        settings_obj.push_notifications = True
        settings_obj.sms_notifications = False
        settings_obj.profile_visibility = 'PUBLIC'
        settings_obj.show_location = True
        settings_obj.allow_follow_requests = True
        settings_obj.language = 'sw'
        settings_obj.theme = 'dark'
        settings_obj.enable_ai_chat = True
        settings_obj.enable_predictions = True
        settings_obj.enable_sos = True
        settings_obj.enable_showcase = True
        settings_obj.enable_moments = True
        settings_obj.content_filter = 'MEDIUM'
        settings_obj.auto_download_media = False
        settings_obj.low_data_mode = False
        settings_obj.save()
        
        serializer = self.get_serializer(settings_obj)
        return Response(serializer.data)
