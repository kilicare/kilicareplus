from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import SubscriptionPlan, UserSubscription, SubscriptionPayment
from .serializers import PlanSerializer, SubscriptionSerializer
from .services import (
    get_user_active_subscription, start_trial,
    activate_subscription,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plans_list_view(request):
    plans = SubscriptionPlan.objects.filter(
        is_active=True
    ).order_by('sort_order')
    return Response(PlanSerializer(plans, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_subscription_view(request):
    sub = get_user_active_subscription(request.user)
    if not sub:
        # Return free plan info
        try:
            free_plan = SubscriptionPlan.objects.get(name='FREE')
            return Response({
                'plan': PlanSerializer(free_plan).data,
                'status': 'FREE',
                'is_active': True,
                'days_remaining': None,
                'features': {
                    'max_experiences': 2,
                    'max_showcase_items': 0,
                    'has_verified_badge': False,
                    'has_booking_system': False,
                    'has_analytics': False,
                    'has_featured_placement': False,
                    'visibility_multiplier': 1.0,
                    'has_ai_unlimited': False,
                },
            })
        except SubscriptionPlan.DoesNotExist:
            return Response({'status': 'FREE'})
    return Response(SubscriptionSerializer(sub).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_trial_view(request):
    plan_name = request.data.get('plan_name')
    if not plan_name:
        return Response(
            {'message': 'plan_name inahitajika.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if already has active subscription
    existing = get_user_active_subscription(request.user)
    if existing:
        return Response(
            {'message': 'Una subscription inayoendelea tayari.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if already used trial
    used_trial = UserSubscription.objects.filter(
        user=request.user, status='TRIAL',
    ).exists()
    if used_trial:
        return Response(
            {'message': 'Umeshakuwa na trial mara moja.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        sub = start_trial(request.user, plan_name)
        return Response(
            SubscriptionSerializer(sub).data,
            status=status.HTTP_201_CREATED,
        )
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {'message': 'Plan haipatikani.'},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_view(request):
    """Activate subscription after payment confirmed"""
    plan_name = request.data.get('plan_name')
    billing_cycle = request.data.get('billing_cycle', 'monthly')
    mpesa_code = request.data.get('mpesa_transaction_code')

    if not plan_name:
        return Response(
            {'message': 'plan_name inahitajika.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        sub = activate_subscription(
            request.user, plan_name, billing_cycle, mpesa_code
        )
        return Response(
            SubscriptionSerializer(sub).data,
            status=status.HTTP_201_CREATED,
        )
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {'message': 'Plan haipatikani.'},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_view(request):
    sub = get_user_active_subscription(request.user)
    if not sub:
        return Response(
            {'message': 'Huna subscription inayoendelea.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    sub.status = 'CANCELLED'
    sub.auto_renew = False
    sub.cancelled_at = timezone.now()
    sub.save(update_fields=['status', 'auto_renew', 'cancelled_at'])
    return Response({'message': 'Subscription imefutwa. Unaendelea hadi siku ya mwisho.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history_view(request):
    payments = SubscriptionPayment.objects.filter(
        subscription__user=request.user
    ).order_by('-created_at')[:20]
    data = [
        {
            'id': p.id,
            'amount': p.amount,
            'currency': p.currency,
            'mpesa_code': p.mpesa_transaction_code,
            'status': p.status,
            'plan': p.subscription.plan.display_name,
            'paid_at': p.paid_at,
            'created_at': p.created_at,
        }
        for p in payments
    ]
    return Response(data)