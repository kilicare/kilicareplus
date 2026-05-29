from rest_framework.permissions import BasePermission


class IsLocalGuide(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role == 'LOCAL_GUIDE')


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role == 'ADMIN')


class IsLocalGuideOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.role in ('LOCAL_GUIDE', 'ADMIN'))


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        owner = (getattr(obj, 'user', None)
                 or getattr(obj, 'posted_by', None)
                 or getattr(obj, 'owner', None)
                 or getattr(obj, 'created_by', None)
                 or getattr(obj, 'local', None))
        return owner == request.user