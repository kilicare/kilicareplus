from rest_framework import serializers
from django.utils import timezone
from .models import SubscriptionPlan, UserSubscription, SubscriptionPayment


class PlanSerializer(serializers.ModelSerializer):
    is_popular = serializers.SerializerMethodField()
    savings_percent = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'display_name', 'description',
            'price_weekly', 'price_monthly',
            'max_experiences', 'max_showcase_items',
            'has_verified_badge', 'has_booking_system',
            'has_analytics', 'has_featured_placement',
            'visibility_multiplier', 'has_ai_unlimited',
            'has_offline_mode', 'has_predictions_all',
            'has_whatsapp_alerts', 'trial_days',
            'is_popular', 'savings_percent', 'sort_order',
        ]

    def get_is_popular(self, obj):
        return obj.name == 'PRO_GUIDE'

    def get_savings_percent(self, obj):
        if obj.price_weekly and obj.price_monthly:
            weekly_monthly = float(obj.price_weekly) * 4.3
            saving = (weekly_monthly - float(obj.price_monthly)) / weekly_monthly * 100
            return round(saving, 0)
        return 0


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan', 'status', 'billing_cycle',
            'start_date', 'end_date', 'trial_end_date',
            'auto_renew', 'days_remaining', 'is_active',
            'features', 'created_at',
        ]

    def get_days_remaining(self, obj):
        today = timezone.now().date()
        delta = (obj.end_date - today).days
        return max(0, delta)

    def get_is_active(self, obj):
        return obj.is_currently_active

    def get_features(self, obj):
        return obj.get_plan_features()


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPayment
        fields = [
            'id', 'amount', 'currency', 'mpesa_transaction_code',
            'status', 'paid_at', 'created_at',
        ]