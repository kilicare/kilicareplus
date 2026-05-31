from rest_framework import serializers
from .models import Booking, BookingReview


class BookingSerializer(serializers.ModelSerializer):
    tourist_username = serializers.CharField(
        source='tourist.username', read_only=True
    )
    tourist_avatar = serializers.SerializerMethodField()
    guide_username = serializers.CharField(
        source='guide.username', read_only=True
    )
    guide_avatar = serializers.SerializerMethodField()
    guide_trust = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()
    experience_title = serializers.CharField(
        source='experience.title', read_only=True
    )

    class Meta:
        model = Booking
        fields = [
            'id', 'tourist_username', 'tourist_avatar',
            'guide_username', 'guide_avatar', 'guide_trust',
            'experience_title', 'title', 'description',
            'scheduled_date', 'scheduled_time', 'duration_hours',
            'location', 'participants', 'amount', 'platform_fee',
            'guide_payout', 'currency', 'status', 'payment_method',
            'mpesa_code', 'escrow_released_at', 'special_requests',
            'has_review', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'platform_fee', 'guide_payout',
            'escrow_released_at', 'created_at', 'updated_at',
        ]

    def get_tourist_avatar(self, obj):
        try:
            av = obj.tourist.profile.avatar
            if av:
                return av.url
        except Exception:
            pass
        return None

    def get_guide_avatar(self, obj):
        try:
            av = obj.guide.profile.avatar
            if av:
                return av.url
        except Exception:
            pass
        return None

    def get_guide_trust(self, obj):
        try:
            return obj.guide.passport.trust_score
        except Exception:
            return 50

    def get_has_review(self, obj):
        return hasattr(obj, 'review')


class BookingReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingReview
        fields = ['id', 'rating', 'review', 'created_at']