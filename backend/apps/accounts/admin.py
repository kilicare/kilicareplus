from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile, OTPCode


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        'email', 'username', 'role',
        'is_verified', 'is_active', 'date_joined',
    ]
    list_filter = ['role', 'is_verified', 'is_active']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-date_joined']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Kilicare+', {
            'fields': ('role', 'phone', 'is_verified', 'fcm_token'),
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Kilicare+', {'fields': ('email', 'role', 'phone')}),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'location', 'gender']
    search_fields = ['user__email', 'user__username']


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'code', 'purpose', 'is_used',
        'expires_at', 'created_at',
    ]
    list_filter = ['purpose', 'is_used']