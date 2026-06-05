from rest_framework import serializers
from .models import PassportProfile, Badge, UserBadge, PointsTransaction


class PassportSerializer(serializers.ModelSerializer):
    username    = serializers.CharField(source='user.username', read_only=True)
    next_level  = serializers.SerializerMethodField()
    points_to_next = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model  = PassportProfile
        fields = [
            'points', 'level', 'trust_score', 'total_days',
            'username', 'next_level', 'points_to_next',
            'progress_percent', 'created_at', 'qr_code',
            'achievement_stamps',
        ]

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
            'LEGEND': 0,
        }
        return max(0, THRESHOLDS.get(obj.level, 0) - obj.points)

    def get_progress_percent(self, obj):
        PREV = {'EXPLORER': 0, 'ADVENTURER': 500,
                'GUARDIAN': 2000, 'LEGEND': 5000}
        CURR = {'EXPLORER': 500, 'ADVENTURER': 2000,
                'GUARDIAN': 5000, 'LEGEND': 10000}
        prev = PREV.get(obj.level, 0)
        curr = CURR.get(obj.level, 10000)
        rng  = curr - prev
        if rng <= 0:
            return 100
        prog = obj.points - prev
        return min(100, round(prog / rng * 100, 1))


class BadgeSerializer(serializers.ModelSerializer):
    is_unlocked    = serializers.SerializerMethodField()
    user_progress  = serializers.SerializerMethodField()
    unlocked_at    = serializers.SerializerMethodField()

    class Meta:
        model  = Badge
        fields = [
            'id', 'name', 'description', 'icon',
            'criteria_points', 'is_unlocked',
            'user_progress', 'unlocked_at',
        ]

    def get_is_unlocked(self, obj):
        req = self.context.get('request')
        if not req:
            return False
        return UserBadge.objects.filter(
            user=req.user, badge=obj
        ).exists()

    def get_user_progress(self, obj):
        req = self.context.get('request')
        if not req or obj.criteria_points <= 0:
            return 0
        try:
            pp = req.user.passport
            return min(100, round(pp.points / obj.criteria_points * 100, 0))
        except Exception:
            return 0

    def get_unlocked_at(self, obj):
        req = self.context.get('request')
        if not req:
            return None
        ub = UserBadge.objects.filter(
            user=req.user, badge=obj
        ).first()
        return ub.unlocked_at.isoformat() if ub else None


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PointsTransaction
        fields = [
            'id', 'action_type', 'points_change',
            'balance_after', 'description', 'created_at',
        ]


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    user_id    = serializers.IntegerField(source='user.id', read_only=True)
    username   = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    role       = serializers.CharField(source='user.role', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    is_me      = serializers.SerializerMethodField()

    class Meta:
        model  = PassportProfile
        fields = [
            'user_id', 'username', 'first_name', 'role',
            'avatar_url', 'points', 'level', 'trust_score', 'is_me',
        ]

    def get_avatar_url(self, obj):
        try:
            if obj.user.profile.avatar:
                return obj.user.profile.avatar.url
        except Exception:
            pass
        return None

    def get_is_me(self, obj):
        req = self.context.get('request')
        return req and req.user.id == obj.user_id