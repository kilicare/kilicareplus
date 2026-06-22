"""
Central Settings Guard System

This module provides the single source of truth for all settings enforcement.
All feature access checks MUST go through these guard functions.

DO NOT bypass these guards. If you need to check a setting, use these functions.
"""

from typing import Optional
from django.core.exceptions import PermissionDenied
from .models import UserSettings


class SettingsGuardError(Exception):
    """Raised when a settings check fails."""
    pass


def get_user_settings(user) -> UserSettings:
    """
    Get or create user settings with caching.
    
    Args:
        user: User instance
        
    Returns:
        UserSettings instance
    """
    if not user.is_authenticated:
        raise SettingsGuardError("User must be authenticated")
    
    settings, created = UserSettings.objects.get_or_create(user=user)
    return settings


def check_feature_enabled(user, feature: str) -> bool:
    """
    Check if a feature is enabled for a user.
    
    Args:
        user: User instance
        feature: Feature name (e.g., 'ai_chat', 'predictions', 'sos', 'showcase', 'moments')
        
    Returns:
        bool: True if feature is enabled, False otherwise
        
    Raises:
        SettingsGuardError: If feature name is invalid
    """
    valid_features = {
        'ai_chat': 'enable_ai_chat',
        'predictions': 'enable_predictions',
        'sos': 'enable_sos',
        'showcase': 'enable_showcase',
        'moments': 'enable_moments',
    }
    
    if feature not in valid_features:
        raise SettingsGuardError(f"Invalid feature: {feature}. Valid features: {list(valid_features.keys())}")
    
    settings = get_user_settings(user)
    return getattr(settings, valid_features[feature], True)


def require_feature_enabled(user, feature: str):
    """
    Require a feature to be enabled. Raises PermissionDenied if disabled.
    
    Args:
        user: User instance
        feature: Feature name
        
    Raises:
        PermissionDenied: If feature is disabled
    """
    if not check_feature_enabled(user, feature):
        raise PermissionDenied(f"Feature '{feature}' is disabled in your settings")


def check_notification_enabled(user, notification_type: str) -> bool:
    """
    Check if a notification type is enabled for a user.
    
    Args:
        user: User instance
        notification_type: 'email', 'push', or 'sms'
        
    Returns:
        bool: True if notification type is enabled
    """
    settings = get_user_settings(user)
    
    notification_map = {
        'email': 'email_notifications',
        'push': 'push_notifications',
        'sms': 'sms_notifications',
    }
    
    if notification_type not in notification_map:
        raise SettingsGuardError(f"Invalid notification type: {notification_type}")
    
    return getattr(settings, notification_map[notification_type], True)


def check_profile_visibility(user, viewer) -> bool:
    """
    Check if viewer can see user's profile based on privacy settings.
    
    Args:
        user: Profile owner
        viewer: User trying to view the profile
        
    Returns:
        bool: True if viewer can see profile
    """
    # User can always see their own profile
    if user == viewer:
        return True
    
    settings = get_user_settings(user)
    visibility = settings.profile_visibility
    
    # PUBLIC: Everyone can see
    if visibility == 'PUBLIC':
        return True
    
    # PRIVATE: No one can see (except self, checked above)
    if visibility == 'PRIVATE':
        return False
    
    # FOLLOWERS: Only followers can see
    if visibility == 'FOLLOWERS':
        # Check if viewer follows user
        from apps.follow.models import Follow
        return Follow.objects.filter(follower=viewer, following=user).exists()
    
    return False


def check_location_sharing(user) -> bool:
    """
    Check if user has location sharing enabled.
    
    Args:
        user: User instance
        
    Returns:
        bool: True if location sharing is enabled
    """
    settings = get_user_settings(user)
    return settings.show_location


def check_follow_requests_allowed(user) -> bool:
    """
    Check if user allows follow requests.
    
    Args:
        user: User instance
        
    Returns:
        bool: True if follow requests are allowed
    """
    settings = get_user_settings(user)
    return settings.allow_follow_requests


def get_user_language(user) -> str:
    """
    Get user's preferred language.
    
    Args:
        user: User instance
        
    Returns:
        str: Language code (e.g., 'sw', 'en')
    """
    settings = get_user_settings(user)
    return settings.language


def get_user_theme(user) -> str:
    """
    Get user's preferred theme.
    
    Args:
        user: User instance
        
    Returns:
        str: Theme ('dark', 'light', 'auto')
    """
    settings = get_user_settings(user)
    return settings.theme


def check_content_filter(user, content_severity: str) -> bool:
    """
    Check if content should be filtered based on user's content filter settings.
    
    Args:
        user: User instance
        content_severity: Content severity level ('NONE', 'LOW', 'MEDIUM', 'HIGH')
        
    Returns:
        bool: True if content should be shown (not filtered), False if should be hidden
    """
    settings = get_user_settings(user)
    user_filter = settings.content_filter
    
    # Filter levels: NONE < LOW < MEDIUM < HIGH
    filter_levels = ['NONE', 'LOW', 'MEDIUM', 'HIGH']
    
    try:
        user_level = filter_levels.index(user_filter)
        content_level = filter_levels.index(content_severity)
        
        # Content is shown if its severity is <= user's filter level
        return content_level <= user_level
    except ValueError:
        # Invalid severity, default to showing
        return True


def check_low_data_mode(user) -> bool:
    """
    Check if user has low data mode enabled.
    
    Args:
        user: User instance
        
    Returns:
        bool: True if low data mode is enabled
    """
    settings = get_user_settings(user)
    return settings.low_data_mode


def check_auto_download_media(user) -> bool:
    """
    Check if user has auto-download media enabled.
    
    Args:
        user: User instance
        
    Returns:
        bool: True if auto-download is enabled
    """
    settings = get_user_settings(user)
    
    # Auto-download is disabled if low_data_mode is on
    if settings.low_data_mode:
        return False
    
    return settings.auto_download_media


# ============================================================================
# DECORATORS FOR CONVENIENCE
# ============================================================================

def feature_required(feature: str):
    """
    Decorator to require a feature to be enabled for a view.
    
    Usage:
        @feature_required('ai_chat')
        def my_view(request):
            ...
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            require_feature_enabled(request.user, feature)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def notification_filter(notification_type: str):
    """
    Decorator to check if notification type is enabled before sending.
    
    Usage:
        @notification_filter('email')
        def send_email_notification(user, ...):
            ...
    """
    def decorator(func):
        def wrapper(user, *args, **kwargs):
            if not check_notification_enabled(user, notification_type):
                return False  # Skip sending
            return func(user, *args, **kwargs)
        return wrapper
    return decorator
