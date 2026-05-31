from django.db import models
from django.conf import settings
from django.utils import timezone


class SubscriptionPlan(models.Model):
    PLAN_NAMES = [
        ('FREE', 'Free'),
        ('BASIC_CREATOR', 'Basic Creator'),
        ('BUSINESS_CREATOR', 'Business Creator'),
        ('PRO_GUIDE', 'Pro Guide'),
        ('TOURIST_PREMIUM', 'Tourist Premium'),
        ('SPORTS_PREMIUM', 'Sports Premium'),
    ]
    name = models.CharField(
        max_length=25, choices=PLAN_NAMES, unique=True
    )
    display_name = models.CharField(max_length=60)
    description = models.TextField(blank=True)
    price_weekly = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    price_monthly = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    max_experiences = models.IntegerField(default=2)
    max_showcase_items = models.IntegerField(default=0)
    has_verified_badge = models.BooleanField(default=False)
    has_booking_system = models.BooleanField(default=False)
    has_analytics = models.BooleanField(default=False)
    has_featured_placement = models.BooleanField(default=False)
    visibility_multiplier = models.FloatField(default=1.0)
    has_ai_unlimited = models.BooleanField(default=False)
    has_offline_mode = models.BooleanField(default=False)
    has_predictions_all = models.BooleanField(default=False)
    has_whatsapp_alerts = models.BooleanField(default=False)
    trial_days = models.IntegerField(default=14)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order']

    def __str__(self):
        return f'{self.display_name}'


class UserSubscription(models.Model):
    STATUS = [
        ('ACTIVE', 'Active'),
        ('TRIAL', 'Trial'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
    ]
    BILLING = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('free', 'Free'),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    plan = models.ForeignKey(
        SubscriptionPlan, on_delete=models.PROTECT
    )
    status = models.CharField(
        max_length=15, choices=STATUS, default='TRIAL'
    )
    billing_cycle = models.CharField(
        max_length=10, choices=BILLING, default='monthly'
    )
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField()
    trial_end_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    mpesa_subscription_id = models.CharField(
        max_length=100, null=True, blank=True
    )
    stripe_subscription_id = models.CharField(
        max_length=100, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} — {self.plan.name} ({self.status})'

    @property
    def is_currently_active(self):
        today = timezone.now().date()
        return (
            self.status in ('ACTIVE', 'TRIAL') and
            self.end_date >= today
        )

    def get_plan_features(self):
        return {
            'max_experiences': self.plan.max_experiences,
            'max_showcase_items': self.plan.max_showcase_items,
            'has_verified_badge': self.plan.has_verified_badge,
            'has_booking_system': self.plan.has_booking_system,
            'has_analytics': self.plan.has_analytics,
            'has_featured_placement': self.plan.has_featured_placement,
            'visibility_multiplier': self.plan.visibility_multiplier,
            'has_ai_unlimited': self.plan.has_ai_unlimited,
            'has_offline_mode': self.plan.has_offline_mode,
            'has_predictions_all': self.plan.has_predictions_all,
            'has_whatsapp_alerts': self.plan.has_whatsapp_alerts,
        }


class SubscriptionPayment(models.Model):
    STATUS = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    ]
    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=5, default='TZS')
    mpesa_transaction_code = models.CharField(
        max_length=50, null=True, blank=True
    )
    mpesa_checkout_request_id = models.CharField(
        max_length=100, null=True, blank=True
    )
    stripe_payment_intent_id = models.CharField(
        max_length=100, null=True, blank=True
    )
    status = models.CharField(
        max_length=15, choices=STATUS, default='PENDING'
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return (
            f'Payment TZS {self.amount} — '
            f'{self.subscription.user.username} ({self.status})'
        )