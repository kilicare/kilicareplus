from rest_framework import serializers
from .models import VirtualShowcase, ShowcaseItem, ShowcaseMedia, ShowcaseOrder


class ShowcaseMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ShowcaseMedia
        fields = ['id', 'file', 'file_url', 'is_primary', 'order']

    def get_file_url(self, obj):
        req = self.context.get('request')
        if obj.file:
            url = obj.file.url
            if req and not url.startswith('http'):
                return req.build_absolute_uri(url)
            return url
        return None


class ShowcaseItemSerializer(serializers.ModelSerializer):
    media = ShowcaseMediaSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    owner_username = serializers.CharField(
        source='showcase.owner.username', read_only=True
    )

    class Meta:
        model = ShowcaseItem
        fields = [
            'id', 'owner_username', 'title', 'description',
            'price', 'currency', 'is_negotiable',
            'stock_count', 'category', 'is_available',
            'views', 'media', 'primary_image', 'created_at',
        ]
        read_only_fields = ['id', 'views', 'created_at']

    def get_primary_image(self, obj):
        primary = obj.media.filter(is_primary=True).first()
        if not primary:
            primary = obj.media.first()
        if primary:
            return ShowcaseMediaSerializer(
                primary, context=self.context
            ).data
        return None


class VirtualShowcaseSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(
        source='owner.username', read_only=True
    )
    owner_avatar = serializers.SerializerMethodField()
    owner_verified = serializers.BooleanField(
        source='owner.is_verified', read_only=True
    )
    owner_trust = serializers.SerializerMethodField()
    items = ShowcaseItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    banner_url = serializers.SerializerMethodField()

    class Meta:
        model = VirtualShowcase
        fields = [
            'id', 'owner_username', 'owner_avatar',
            'owner_verified', 'owner_trust',
            'title', 'description', 'banner_image', 'banner_url',
            'theme_color', 'is_active', 'total_views',
            'items', 'item_count', 'created_at',
        ]
        read_only_fields = ['id', 'total_views', 'created_at']

    def get_owner_avatar(self, obj):
        try:
            av = obj.owner.profile.avatar
            if av:
                req = self.context.get('request')
                url = av.url
                if req and not url.startswith('http'):
                    return req.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None

    def get_owner_trust(self, obj):
        try:
            return obj.owner.passport.trust_score
        except Exception:
            return 50

    def get_item_count(self, obj):
        return obj.items.filter(is_available=True).count()

    def get_banner_url(self, obj):
        req = self.context.get('request')
        if obj.banner_image:
            url = obj.banner_image.url
            if req and not url.startswith('http'):
                return req.build_absolute_uri(url)
            return url
        return None


class ShowcaseOrderSerializer(serializers.ModelSerializer):
    item_title = serializers.CharField(source='item.title', read_only=True)
    buyer_username = serializers.CharField(
        source='buyer.username', read_only=True
    )
    seller_username = serializers.CharField(
        source='item.showcase.owner.username', read_only=True
    )

    class Meta:
        model = ShowcaseOrder
        fields = [
            'id', 'item_title', 'buyer_username', 'seller_username',
            'quantity', 'unit_price', 'total_amount',
            'platform_fee', 'seller_payout',
            'status', 'escrow_held', 'escrow_released_at',
            'delivery_notes', 'mpesa_transaction_code',
            'dispute_reason', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'platform_fee', 'seller_payout',
            'escrow_released_at', 'created_at', 'updated_at',
        ]