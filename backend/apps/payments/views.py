import json
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from .mpesa import MPesaDaraja
from apps.subscriptions.models import UserSubscription, SubscriptionPayment


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mpesa_stk_push_view(request):
    """Initiate M-Pesa STK Push for subscription payment"""
    phone = request.data.get('phone', '')
    plan_name = request.data.get('plan_name')
    billing_cycle = request.data.get('billing_cycle', 'monthly')
    amount = request.data.get('amount')

    if not phone or not plan_name or not amount:
        return Response(
            {'message': 'phone, plan_name na amount zinahitajika.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        mpesa = MPesaDaraja()
        result = mpesa.stk_push(
            phone=phone,
            amount=int(amount),
            account_ref=f'KILI{request.user.id}',
            description=f'{plan_name} {billing_cycle}',
        )

        if result.get('ResponseCode') == '0':
            # Store pending payment tracking
            checkout_id = result.get('CheckoutRequestID')
            # Create pending payment record
            request.session['pending_payment'] = {
                'checkout_request_id': checkout_id,
                'plan_name': plan_name,
                'billing_cycle': billing_cycle,
                'amount': amount,
                'user_id': request.user.id,
            }
            return Response({
                'success': True,
                'checkout_request_id': checkout_id,
                'message': 'STK Push imetumwa. Thibitisha kwenye simu yako.',
            })
        else:
            return Response({
                'success': False,
                'message': result.get(
                    'errorMessage',
                    'STK Push imeshindwa. Jaribu tena.'
                ),
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {'message': f'Hitilafu: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mpesa_query_view(request):
    """Check STK Push payment status"""
    checkout_request_id = request.data.get('checkout_request_id')
    if not checkout_request_id:
        return Response(
            {'message': 'checkout_request_id inahitajika.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        mpesa = MPesaDaraja()
        result = mpesa.query_stk(checkout_request_id)
        return Response(result)
    except Exception as e:
        return Response(
            {'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback_view(request):
    """Safaricom webhook — no auth required"""
    try:
        data = request.data
        result = MPesaDaraja.parse_callback(data)

        if result['success']:
            checkout_id = result.get('checkout_request_id')
            # Find pending payment and activate subscription
            payment = SubscriptionPayment.objects.filter(
                mpesa_checkout_request_id=checkout_id,
                status='PENDING',
            ).first()

            if payment:
                payment.status = 'COMPLETED'
                payment.mpesa_transaction_code = result['transaction_code']
                payment.paid_at = timezone.now()
                payment.save()

                sub = payment.subscription
                sub.status = 'ACTIVE'
                sub.save(update_fields=['status'])

        return Response({'ResultCode': 0, 'ResultDesc': 'Success'})

    except Exception as e:
        return Response({'ResultCode': 1, 'ResultDesc': str(e)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_pending_payment_view(request):
    """Create pending payment record before STK push"""
    from apps.subscriptions.models import SubscriptionPlan
    from apps.subscriptions.services import get_user_active_subscription
    from datetime import timedelta

    plan_name = request.data.get('plan_name')
    billing_cycle = request.data.get('billing_cycle', 'monthly')
    checkout_request_id = request.data.get('checkout_request_id')

    try:
        plan = SubscriptionPlan.objects.get(name=plan_name)
        today = timezone.now().date()

        if billing_cycle == 'weekly':
            end_date = today + timedelta(days=7)
            amount = plan.price_weekly or 0
        else:
            end_date = today + timedelta(days=30)
            amount = plan.price_monthly or 0

        sub = UserSubscription.objects.create(
            user=request.user,
            plan=plan,
            status='ACTIVE',
            billing_cycle=billing_cycle,
            end_date=end_date,
        )

        SubscriptionPayment.objects.create(
            subscription=sub,
            amount=amount,
            currency='TZS',
            mpesa_checkout_request_id=checkout_request_id,
            status='PENDING',
        )

        return Response({'success': True, 'subscription_id': sub.id})

    except SubscriptionPlan.DoesNotExist:
        return Response({'message': 'Plan haipatikani.'}, status=404)
    except Exception as e:
        return Response({'message': str(e)}, status=400)