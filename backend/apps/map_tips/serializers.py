from rest_framework import serializers
from .models import Tip


class TipSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    creator_role = serializers.CharField(
        source='created_by.role', read_only=True
    )
    creator_avatar = serializers.SerializerMethodField()
    is_upvoted = serializers.SerializerMethodField()

    class Meta:
        model = Tip
        fields = [
            'id', 'title', 'description', 'category', 'sub_topics',
            'latitude', 'longitude', 'location_address',
            'creator_username', 'creator_role', 'creator_avatar',
            'trust_score', 'upvotes', 'is_verified',
            'is_upvoted', 'created_at',
        ]
        read_only_fields = [
            'id', 'trust_score', 'upvotes', 'is_verified', 'created_at',
        ]

    def get_creator_avatar(self, obj):
        try:
            av = obj.created_by.profile.avatar
            if av:
                req = self.context.get('request')
                url = av.url
                if req and not url.startswith('http'):
                    return req.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None

    def get_is_upvoted(self, obj):
        req = self.context.get('request')
        if req and req.user.is_authenticated:
            return obj.upvote_set.filter(user=req.user).exists()
        return False