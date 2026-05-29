from rest_framework import serializers
from .models import PassportProfile, PointsTransaction, Badge, UserBadge


class PassportProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username', read_only=True
    )
    first_name = serializers.CharField(
        source='user.first_name', read_only=True
    )
    avatar_url = serializers.SerializerMethodField()
    level_display = serializers.SerializerMethodField()
    next_level = serializers.SerializerMethodField()
    points_to_next = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = PassportProfile
        fields = [
            'id', 'username', 'first_name', 'avatar_url',
            'trust_score', 'points', 'level', 'level_display',
            'next_level', 'points_to_next', 'progress_percent',
            'is_verified', 'created_at',
        ]

    def get_avatar_url(self, obj):
        try:
            profile = obj.user.profile
            if profile.avatar:
                return profile.avatar.url
        except Exception:
            pass
        return None

    def get_level_display(self, obj):
        MAP = {
            'EXPLORER': 'Explorer 🧭',
            'ADVENTURER': 'Adventurer ⚡',
            'GUARDIAN': 'Guardian 🛡️',
            'LEGEND': 'Legend 👑',
        }
        return MAP.get(obj.level, obj.level)

    def get_next_level(self, obj):
        NEXT = {
            'EXPLORER': 'ADVENTURER',
            'ADVENTURER': 'GUARDIAN',
            'GUARDIAN': 'LEGEND',
            'LEGEND': None,
        }
        return NEXT.get(obj.level)

    def get_points_to_next(self, obj):
        THRESHOLDS = {
            'EXPLORER': 500,
            'ADVENTURER': 2000,
            'GUARDIAN': 5000,
            'LEGEND': None,
        }
        t = THRESHOLDS.get(obj.level)
        return max(0, t - obj.points) if t else 0

    def get_progress_percent(self, obj):
        RANGES = {
            'EXPLORER': (0, 500),
            'ADVENTURER': (500, 2000),
            'GUARDIAN': (2000, 5000),
            'LEGEND': (5000, 5000),
        }
        start, end = RANGES.get(obj.level, (0, 100))
        if start == end:
            return 100
        return round(
            min(100, max(0, (obj.points - start) / (end - start) * 100)),
            1,
        )


class PointsTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsTransaction
        fields = [
            'id', 'action_type', 'points_change',
            'balance_after', 'description', 'created_at',
        ]


class BadgeSerializer(serializers.ModelSerializer):
    is_unlocked = serializers.SerializerMethodField()
    unlocked_at = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = [
            'id', 'name', 'description', 'icon',
            'criteria_points', 'badge_type',
            'is_unlocked', 'unlocked_at', 'user_progress',
        ]

    def get_is_unlocked(self, obj):
        user = self.context.get('user')
        if not user:
            return False
        return UserBadge.objects.filter(user=user, badge=obj).exists()

    def get_unlocked_at(self, obj):
        user = self.context.get('user')
        if not user:
            return None
        try:
            return UserBadge.objects.get(
                user=user, badge=obj
            ).unlocked_at
        except UserBadge.DoesNotExist:
            return None

    def get_user_progress(self, obj):
        user = self.context.get('user')
        if not user:
            return 0
        try:
            pts = user.passport.points
            return round(
                min(100, (pts / obj.criteria_points) * 100), 1
            )
        except Exception:
            return 0