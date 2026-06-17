from rest_framework import permissions


class IsTourist(permissions.BasePermission):
    """
    Permission class to check if user is a TOURIST.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'TOURIST'


class IsLocalGuide(permissions.BasePermission):
    """
    Permission class to check if user is a LOCAL_GUIDE.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'LOCAL_GUIDE'


class IsAlertOwnerOrGuide(permissions.BasePermission):
    """
    Permission class to check if user is the alert owner (tourist) or a guide.
    Used for endpoints that both tourists and guides can access.
    """
    def has_object_permission(self, request, view, obj):
        # Tourist can access their own alerts
        if request.user.role == 'TOURIST':
            return obj.user == request.user
        # Guide can access any alert (for viewing/responding)
        if request.user.role == 'LOCAL_GUIDE':
            return True
        return False
