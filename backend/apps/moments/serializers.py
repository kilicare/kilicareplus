from rest_framework import serializers
from django.conf import settings
from django.db.models import Count, Q, Prefetch
import logging
from .models import Moment, MomentLike, MomentSave

logger = logging.getLogger(__name__)


class MomentSerializer(serializers.ModelSerializer):
    posted_by_username = serializers.CharField(
        source='posted_by.username', read_only=True
    )
    posted_by_avatar_url = serializers.SerializerMethodField()
    posted_by_role = serializers.CharField(
        source='posted_by.role', read_only=True
    )
    posted_by_verified = serializers.BooleanField(
        source='posted_by.is_verified', read_only=True
    )
    media_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    trust_score = serializers.SerializerMethodField()

    class Meta:
        model = Moment
        fields = [
            'id', 'posted_by_username', 'posted_by_avatar_url',
            'posted_by_role', 'posted_by_verified',
            'media', 'media_url', 'thumbnail_url', 'media_type',
            'audio', 'audio_url',
            'caption', 'location', 'latitude', 'longitude',
            'views', 'shares', 'trending_score',
            'like_count', 'is_liked', 'is_saved',
            'trust_score', 'visibility', 'created_at',
        ]
        read_only_fields = ['id', 'views', 'trending_score', 'created_at']

    def validate_media(self, value):
        """Validate media file type and size"""
        if not value:
            return value
        
        # Check file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError(
                'Faili ni kubwa sana. Maksimum ni 50MB.'
            )
        
        # Check file type
        allowed_types = ['image/', 'video/']
        content_type = value.content_type if hasattr(value, 'content_type') else None
        if content_type and not any(content_type.startswith(t) for t in allowed_types):
            raise serializers.ValidationError(
                'Aina ya faili haijaidhinishwa. Tumia picha au video tu.'
            )
        
        return value

    def validate_audio(self, value):
        """Validate audio file type and size"""
        if not value:
            return value
        
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if value.size > max_size:
            raise serializers.ValidationError(
                'Faili ya sauti ni kubwa sana. Maksimum ni 10MB.'
            )
        
        # Check file type
        content_type = value.content_type if hasattr(value, 'content_type') else None
        if content_type and not content_type.startswith('audio/'):
            raise serializers.ValidationError(
                'Aina ya faili haijaidhinishwa. Tumia sauti tu.'
            )
        
        return value

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

    def get_audio_url(self, obj):
        req = self.context.get('request')
        if obj.audio:
            url = obj.audio.url
            if req and not url.startswith('http'):
                return req.build_absolute_uri(url)
            return url
        return None

    def get_posted_by_avatar_url(self, obj):
        try:
            # Check if user has a profile before accessing avatar
            if hasattr(obj.posted_by, 'profile') and obj.posted_by.profile and obj.posted_by.profile.avatar:
                av = obj.posted_by.profile.avatar
                req = self.context.get('request')
                url = av.url
                if req and not url.startswith('http'):
                    return req.build_absolute_uri(url)
                return url
        except Exception as e:
            # Only log unexpected errors, not missing profiles (expected for users without profiles)
            if not isinstance(e, (AttributeError, ObjectDoesNotExist)):
                logger.warning(f"[Moments] Failed to get avatar URL for moment: {e}")
        return None

    def get_like_count(self, obj):
        # Call the method if it exists, otherwise count likes
        if hasattr(obj, 'like_count') and callable(obj.like_count):
            return obj.like_count()
        return obj.likes.count()

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
        except Exception as e:
            logger.warning(f"[Moments] Failed to get trust score, using default 50: {e}")
            return 50