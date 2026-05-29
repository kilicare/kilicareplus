from django.contrib import admin
from .models import PassportProfile, PointsTransaction, Badge, UserBadge


@admin.register(PassportProfile)
class PassportAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'points', 'trust_score']
    list_filter = ['level']
    search_fields = ['user__email', 'user__username']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['icon', 'name', 'criteria_points', 'badge_type']


@admin.register(PointsTransaction)
class PointsTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'action_type', 'points_change',
        'balance_after', 'created_at',
    ]


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'unlocked_at']