from datetime import date, timedelta
from django.utils import timezone
from .models import SubscriptionPlan, UserSubscription, SubscriptionPayment

# Seed plans data — run once
PLANS_DATA = [
    {
        'name': 'FREE',
        'display_name': 'Free',
        'description': 'Anza safari yako ya KilicareGO+',
        'price_weekly': None,
        'price_monthly': None,
        'max_experiences': 2,
        'max_showcase_items': 0,
        'has_verified_badge': False,
        'has_booking_system': False,
        'has_analytics': False,
        'has_featured_placement': False,
        'visibility_multiplier': 1.0,
        'has_ai_unlimited': False,
        'has_offline_mode': False,
        'has_predictions_all': False,
        'has_whatsapp_alerts': False,
        'trial_days': 0,
        'sort_order': 0,
    },
    {
        'name': 'BASIC_CREATOR',
        'display_name': 'Basic Creator 🥉',
        'description': 'Kwa local guides wanaoanza',
        'price_weekly': 2000,
        'price_monthly': 5000,
        'max_experiences': 10,
        'max_showcase_items': 20,
        'has_verified_badge': False,
        'has_booking_system': False,
        'has_analytics': True,
        'has_featured_placement': False,
        'visibility_multiplier': 2.0,
        'has_ai_unlimited': False,
        'has_offline_mode': False,
        'has_predictions_all': False,
        'has_whatsapp_alerts': False,
        'trial_days': 14,
        'sort_order': 1,
    },
    {
        'name': 'BUSINESS_CREATOR',
        'display_name': 'Business Creator 🥈',
        'description': 'Kwa biashara zinazokua',
        'price_weekly': 5000,
        'price_monthly': 12000,
        'max_experiences': 30,
        'max_showcase_items': 100,
        'has_verified_badge': False,
        'has_booking_system': False,
        'has_analytics': True,
        'has_featured_placement': True,
        'visibility_multiplier': 5.0,
        'has_ai_unlimited': False,
        'has_offline_mode': False,
        'has_predictions_all': False,
        'has_whatsapp_alerts': False,
        'trial_days': 14,
        'sort_order': 2,
    },
    {
        'name': 'PRO_GUIDE',
        'display_name': 'Pro Guide 🥇',
        'description': 'Kwa guides wa kitaalamu — kamili kabisa',
        'price_weekly': 10000,
        'price_monthly': 25000,
        'max_experiences': 9999,
        'max_showcase_items': 500,
        'has_verified_badge': True,
        'has_booking_system': True,
        'has_analytics': True,
        'has_featured_placement': True,
        'visibility_multiplier': 10.0,
        'has_ai_unlimited': False,
        'has_offline_mode': False,
        'has_predictions_all': False,
        'has_whatsapp_alerts': False,
        'trial_days': 14,
        'sort_order': 3,
    },
    {
        'name': 'TOURIST_PREMIUM',
        'display_name': 'Tourist Premium 💎',
        'description': 'Kwa watalii wanaotaka zaidi',
        'price_weekly': None,
        'price_monthly': 6999,
        'max_experiences': 2,
        'max_showcase_items': 0,
        'has_verified_badge': False,
        'has_booking_system': False,
        'has_analytics': False,
        'has_featured_placement': False,
        'visibility_multiplier': 1.0,
        'has_ai_unlimited': True,
        'has_offline_mode': True,
        'has_predictions_all': False,
        'has_whatsapp_alerts': False,
        'trial_days': 14,
        'sort_order': 4,
    },
    {
        'name': 'SPORTS_PREMIUM',
        'display_name': 'Sports Premium 🎯',
        'description': 'Kwa wapenda michezo na predictions',
        'price_weekly': 1000,
        'price_monthly': 3000,
        'max_experiences': 2,
        'max_showcase_items': 0,
        'has_verified_badge': False,
        'has_booking_system': False,
        'has_analytics': False,
        'has_featured_placement': False,
        'visibility_multiplier': 1.0,
        'has_ai_unlimited': False,
        'has_offline_mode': False,
        'has_predictions_all': True,
        'has_whatsapp_alerts': True,
        'trial_days': 14,
        'sort_order': 5,
    },
]


def seed_plans():
    """Run this once to create all plans"""
    for plan_data in PLANS_DATA:
        SubscriptionPlan.objects.update_or_create(
            name=plan_data['name'],
            defaults=plan_data,
        )
    print(f'✅ Plans seeded: {SubscriptionPlan.objects.count()}')


def get_user_active_subscription(user):
    """Get user's current active subscription"""
    today = timezone.now().date()
    return UserSubscription.objects.filter(
        user=user,
        status__in=('ACTIVE', 'TRIAL'),
        end_date__gte=today,
    ).select_related('plan').first()


def start_trial(user, plan_name: str) -> UserSubscription:
    """Start a free trial for a user"""
    plan = SubscriptionPlan.objects.get(name=plan_name)
    today = timezone.now().date()
    trial_end = today + timedelta(days=plan.trial_days)
    end_date = today + timedelta(days=30)

    sub = UserSubscription.objects.create(
        user=user,
        plan=plan,
        status='TRIAL',
        billing_cycle='monthly',
        end_date=end_date,
        trial_end_date=trial_end,
    )
    return sub


def activate_subscription(
    user, plan_name: str, billing_cycle: str,
    mpesa_code: str = None
) -> UserSubscription:
    """Activate a subscription after payment"""
    plan = SubscriptionPlan.objects.get(name=plan_name)
    today = timezone.now().date()

    if billing_cycle == 'weekly':
        end_date = today + timedelta(days=7)
        amount = plan.price_weekly
    else:
        end_date = today + timedelta(days=30)
        amount = plan.price_monthly

    sub = UserSubscription.objects.create(
        user=user,
        plan=plan,
        status='ACTIVE',
        billing_cycle=billing_cycle,
        end_date=end_date,
    )

    if amount:
        SubscriptionPayment.objects.create(
            subscription=sub,
            amount=amount,
            currency='TZS',
            mpesa_transaction_code=mpesa_code,
            status='COMPLETED',
            paid_at=timezone.now(),
        )

    return sub