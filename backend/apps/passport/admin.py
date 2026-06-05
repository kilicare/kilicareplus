from django.contrib import admin
from .models import PassportProfile, Badge, UserBadge, PointsTransaction


@admin.register(PassportProfile)
class PassportAdmin(admin.ModelAdmin):
    list_display  = ['user', 'points', 'level', 'trust_score']
    list_filter   = ['level']
    search_fields = ['user__username', 'user__email']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['icon', 'name', 'criteria_points']
    ordering     = ['criteria_points']


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display  = ['user', 'badge', 'unlocked_at']
    search_fields = ['user__username']


@admin.register(PointsTransaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'action_type', 'points_change',
        'balance_after', 'created_at',
    ]
    list_filter  = ['action_type']