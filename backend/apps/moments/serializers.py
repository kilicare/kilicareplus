from rest_framework import serializers
from django.conf import settings
from .models import Moment, MomentLike, MomentComment, MomentSave


class MomentCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source='user.username', read_only=True
    )
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = MomentComment
        fields = [
            'id', 'username', 'avatar_url',
            'text', 'created_at',
        ]

    def get_avatar_url(self, obj):
        try:
            av = obj.user.profile.avatar
            if av:
                req = self.context.get('request')
                url = av.url
                if req and not url.startswith('http'):
                    return req.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None


class MomentSerializer(serializers.ModelSerializer):
    posted_by_username = serializers.CharField(
        source='posted_by.username', read_only=True
    )
    posted_by_avatar = serializers.SerializerMethodField()
    posted_by_role = serializers.CharField(
        source='posted_by.role', read_only=True
    )
    posted_by_verified = serializers.BooleanField(
        source='posted_by.is_verified', read_only=True
    )
    media_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    trust_score = serializers.SerializerMethodField()

    class Meta:
        model = Moment
        fields = [
            'id', 'posted_by_username', 'posted_by_avatar',
            'posted_by_role', 'posted_by_verified',
            'media', 'media_url', 'thumbnail_url', 'media_type',
            'caption', 'location', 'latitude', 'longitude',
            'views', 'shares', 'trending_score',
            'like_count', 'comment_count', 'is_liked', 'is_saved',
            'trust_score', 'visibility', 'created_at',
        ]
        read_only_fields = ['id', 'views', 'trending_score', 'created_at']

    def get_media_url(self, obj):
        req = self.context.get('request')
        if obj.media:
            url = obj.media.url
            if req and not url.startswith('http'):
                return req.build_absolute_uri(url)
            return url
        return None

    def get_thumbnail_url(self, obj):
        req = self.context.get('request')
        if obj.thumbnail:
            url = obj.thumbnail.url
            if req and not url.startswith('http'):
                return req.build_absolute_uri(url)
            return url
        return None

    def get_posted_by_avatar(self, obj):
        try:
            av = obj.posted_by.profile.avatar
            if av:
                req = self.context.get('request')
                url = av.url
                if req and not url.startswith('http'):
                    return req.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        req = self.context.get('request')
        if req and req.user.is_authenticated:
            return obj.likes.filter(user=req.user).exists()
        return False

    def get_is_saved(self, obj):
        req = self.context.get('request')
        if req and req.user.is_authenticated:
            return obj.saves.filter(user=req.user).exists()
        return False

    def get_trust_score(self, obj):
        try:
            return obj.posted_by.passport.trust_score
        except Exception:
            return 50