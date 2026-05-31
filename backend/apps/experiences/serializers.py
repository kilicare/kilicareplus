from rest_framework import serializers
from .models import Experience, ExperienceMedia


class ExperienceMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ExperienceMedia
        fields = ['id', 'file', 'file_url', 'is_primary', 'order']

    def get_file_url(self, obj):
        req = self.context.get('request')
        if obj.file:
            url = obj.file.url
            if req and not url.startswith('http'):
                return req.build_absolute_uri(url)
            return url
        return None


class ExperienceSerializer(serializers.ModelSerializer):
    guide_username = serializers.CharField(
        source='local.username', read_only=True
    )
    guide_avatar = serializers.SerializerMethodField()
    guide_trust = serializers.SerializerMethodField()
    guide_verified = serializers.BooleanField(
        source='local.is_verified', read_only=True
    )
    media = ExperienceMediaSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Experience
        fields = [
            'id', 'guide_username', 'guide_avatar',
            'guide_trust', 'guide_verified',
            'title', 'description', 'location',
            'latitude', 'longitude', 'category',
            'price_range', 'price_min', 'price_max',
            'today_moment_active', 'is_active',
            'subscription_required', 'views',
            'media', 'primary_image', 'created_at',
        ]
        read_only_fields = ['id', 'views', 'created_at']

    def get_guide_avatar(self, obj):
        try:
            av = obj.local.profile.avatar
            if av:
                req = self.context.get('request')
                url = av.url
                if req and not url.startswith('http'):
                    return req.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None

    def get_guide_trust(self, obj):
        try:
            return obj.local.passport.trust_score
        except Exception:
            return 50

    def get_primary_image(self, obj):
        primary = obj.media.filter(is_primary=True).first()
        if not primary:
            primary = obj.media.first()
        if primary:
            return ExperienceMediaSerializer(
                primary, context=self.context
            ).data
        return None