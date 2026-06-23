from rest_framework import serializers
from django.conf import settings
from django.db.models import Count, Q, Prefetch
import logging
from .models import Moment, MomentMedia, MomentLike, MomentSave

logger = logging.getLogger(__name__)


class MomentMediaSerializer(serializers.ModelSerializer):
    """Serializer for individual media items (image, video, audio)"""
    
    class Meta:
        model = MomentMedia
        fields = [
            'id',
            'media_type',
            'url',
            'public_id',
            'duration',
            'width',
            'height',
            'file_size',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class MomentSerializer(serializers.ModelSerializer):
    """Serializer for Moment with nested media items"""
    
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
    media_items = MomentMediaSerializer(many=True, read_only=True)
    media_items_data = MomentMediaSerializer(
        many=True, write_only=True, required=False
    )
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    trust_score = serializers.SerializerMethodField()

    class Meta:
        model = Moment
        fields = [
            'id',
            'posted_by_username',
            'posted_by_avatar_url',
            'posted_by_role',
            'posted_by_verified',
            'media_items',
            'media_items_data',
            'caption',
            'location',
            'latitude',
            'longitude',
            'views',
            'shares',
            'trending_score',
            'like_count',
            'is_liked',
            'is_saved',
            'trust_score',
            'visibility',
            'created_at',
        ]
        read_only_fields = ['id', 'views', 'trending_score', 'created_at']

    def validate_media_items_data(self, value):
        """Validate that at least one media item is provided"""
        if not value or len(value) == 0:
            raise serializers.ValidationError(
                'At least one media item (image, video, or audio) must be provided.'
            )
        
        # Validate each media item
        for item in value:
            if not item.get('url'):
                raise serializers.ValidationError(
                    'Each media item must have a URL.'
                )
            if not item.get('public_id'):
                raise serializers.ValidationError(
                    'Each media item must have a public_id.'
                )
            if not item.get('media_type'):
                raise serializers.ValidationError(
                    'Each media item must have a media_type (image, video, or audio).'
                )
        
        return value

    def create(self, validated_data):
        """Create Moment with nested media items"""
        # Extract media items data
        media_items_data = validated_data.pop('media_items_data', [])
        
        # Create the moment
        moment = Moment.objects.create(**validated_data)
        
        # Create related media items
        for media_data in media_items_data:
            MomentMedia.objects.create(moment=moment, **media_data)
        
        return moment

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