from rest_framework.permissions import BasePermission


class IsLocalGuide(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_active
                and request.user.role == 'LOCAL_GUIDE')


class IsVerifiedGuide(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_active
                and request.user.role == 'LOCAL_GUIDE'
                and request.user.is_verified)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_active
                and request.user.role == 'ADMIN')


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_active
                and request.user.role == 'ADMIN'
                and request.user.email.endswith('@kilicarego.com'))


class IsB2B(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_active
                and request.user.role == 'B2B')


class IsTourist(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_active
                and request.user.role == 'TOURIST')


class IsLocalGuideOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_active
                and request.user.role in ('LOCAL_GUIDE', 'ADMIN'))


class IsB2BOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and request.user.is_active
                and request.user.role in ('B2B', 'ADMIN'))


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or not request.user.is_active:
            return False
        if request.user.role == 'ADMIN':
            return True
        owner = (getattr(obj, 'user', None)
                 or getattr(obj, 'posted_by', None)
                 or getattr(obj, 'owner', None)
                 or getattr(obj, 'created_by', None)
                 or getattr(obj, 'local', None))
        return owner == request.user


class IsOrganizationOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or not request.user.is_active:
            return False
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'B2B':
            from apps.b2b.models import B2BClient
            try:
                b2b_profile = request.user.b2b_profile
                if hasattr(obj, 'organization'):
                    return obj.organization == b2b_profile
                if hasattr(obj, 'b2b_client'):
                    return obj.b2b_client == b2b_profile
            except Exception:
                pass
        return False