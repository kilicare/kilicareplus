from django.contrib import admin
from .models import SubscriptionPlan, UserSubscription, SubscriptionPayment


@admin.register(SubscriptionPlan)
class PlanAdmin(admin.ModelAdmin):
    list_display = [
        'display_name', 'name', 'price_weekly', 'price_monthly',
        'max_experiences', 'has_verified_badge', 'is_active',
    ]
    list_filter = ['is_active']


@admin.register(UserSubscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'plan', 'status', 'billing_cycle',
        'start_date', 'end_date',
    ]
    list_filter = ['status', 'billing_cycle', 'plan']
    search_fields = ['user__email', 'user__username']


@admin.register(SubscriptionPayment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'subscription', 'amount', 'currency',
        'status', 'mpesa_transaction_code', 'paid_at',
    ]
    list_filter = ['status', 'currency']