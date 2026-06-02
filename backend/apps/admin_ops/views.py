from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from core.permissions import IsAdmin
from apps.accounts.models import User, UserProfile
from apps.moments.models import Moment
from apps.map_tips.models import Tip
from apps.sos.models import SOSAlert
from apps.subscriptions.models import UserSubscription, SubscriptionPayment
from apps.passport.models import PassportProfile


@api_view(['GET'])
@permission_classes([IsAdmin])
def users_list_view(request):
    role = request.query_params.get('role')
    search = request.query_params.get('search', '')
    page = int(request.query_params.get('page', 1))
    page_size = 20

    qs = User.objects.select_related('profile', 'passport').order_by('-date_joined')

    if role:
        qs = qs.filter(role=role)
    if search:
        qs = qs.filter(
            username__icontains=search
        ) | qs.filter(email__icontains=search)

    total = qs.count()
    offset = (page - 1) * page_size
    users = qs[offset:offset + page_size]

    data = []
    for u in users:
        data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'role': u.role,
            'is_active': u.is_active,
            'is_verified': u.is_verified,
            'date_joined': u.date_joined,
            'points': getattr(u, 'passport', None) and u.passport.points or 0,
            'trust_score': getattr(u, 'passport', None) and u.passport.trust_score or 50,
            'avatar': (
                u.profile.avatar.url
                if hasattr(u, 'profile') and u.profile.avatar
                else None
            ),
        })

    return Response({
        'results': data,
        'count': total,
        'page': page,
        'has_next': (offset + page_size) < total,
    })


@api_view(['PUT'])
@permission_classes([IsAdmin])
def change_role_view(request, user_id):
    new_role = request.data.get('role')
    if new_role not in ('TOURIST', 'LOCAL_GUIDE', 'ADMIN', 'B2B'):
        return Response({'message': 'Role si sahihi.'}, status=400)
    try:
        user = User.objects.get(id=user_id)
        user.role = new_role
        user.save(update_fields=['role'])
        return Response({'success': True, 'role': new_role})
    except User.DoesNotExist:
        return Response({'message': 'Mtumiaji haipatikani.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdmin])
def award_points_view(request, user_id):
    points = int(request.data.get('points', 0))
    reason = request.data.get('reason', 'Admin award')

    try:
        user = User.objects.get(id=user_id)
        passport, _ = PassportProfile.objects.get_or_create(user=user)

        from apps.passport.models import PointsTransaction
        passport.points += points
        passport.recalculate_level()
        PointsTransaction.objects.create(
            user=user,
            action_type='ADMIN_AWARD',
            points_change=points,
            balance_after=passport.points,
            description=reason,
        )
        return Response({'success': True, 'new_balance': passport.points})
    except User.DoesNotExist:
        return Response({'message': 'Mtumiaji haipatikani.'}, status=404)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def suspend_user_view(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({
            'success': True,
            'is_active': user.is_active,
        })
    except User.DoesNotExist:
        return Response({'message': 'Mtumiaji haipatikani.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def moderation_moments_view(request):
    """Moments zinazolalamikiwa"""
    moments = Moment.objects.order_by('-created_at')[:50]
    data = [
        {
            'id': m.id,
            'posted_by': m.posted_by.username,
            'media_url': m.media.url if m.media else None,
            'media_type': m.media_type,
            'caption': m.caption,
            'views': m.views,
            'trending_score': m.trending_score,
            'created_at': m.created_at,
        }
        for m in moments
    ]
    return Response(data)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def moment_action_view(request, moment_id):
    action = request.data.get('action')
    try:
        moment = Moment.objects.get(id=moment_id)
        if action == 'delete':
            moment.delete()
            return Response({'success': True, 'action': 'deleted'})
        elif action == 'feature':
            moment.is_featured = True
            moment.save(update_fields=['is_featured'])
        elif action == 'hide':
            moment.visibility = 'PRIVATE'
            moment.save(update_fields=['visibility'])
        return Response({'success': True, 'action': action})
    except Moment.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def tips_queue_view(request):
    tips = Tip.objects.filter(
        is_verified=False
    ).select_related('created_by').order_by('-created_at')[:30]
    data = [
        {
            'id': t.id,
            'title': t.title,
            'description': t.description,
            'category': t.category,
            'creator': t.created_by.username,
            'upvotes': t.upvotes,
            'trust_score': t.trust_score,
            'created_at': t.created_at,
        }
        for t in tips
    ]
    return Response(data)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def verify_tip_view(request, tip_id):
    try:
        tip = Tip.objects.get(id=tip_id)
        tip.is_verified = True
        tip.trust_score = min(100, tip.trust_score + 20)
        tip.save(update_fields=['is_verified', 'trust_score'])
        try:
            from apps.notifications.utils import create_notification
            create_notification(
                recipient=tip.created_by,
                notification_type='TIP_VERIFIED',
                title='Tip yako imethibitishwa! ✅',
                body=f'"{tip.title}" imethibitishwa na admin.',
            )
            tip.created_by.passport.award_points('TIP_VERIFIED')
        except Exception:
            pass
        return Response({'success': True})
    except Tip.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def sos_statistics_view(request):
    from django.utils import timezone
    today = timezone.now().date()
    return Response({
        'active': SOSAlert.objects.filter(status='ACTIVE').count(),
        'responding': SOSAlert.objects.filter(status='RESPONDING').count(),
        'resolved_today': SOSAlert.objects.filter(
            status='RESOLVED', resolved_at__date=today
        ).count(),
        'total': SOSAlert.objects.count(),
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def revenue_stats_view(request):
    from django.utils import timezone
    from django.db.models import Sum
    from apps.bookings.models import Booking

    today = timezone.now()
    month_start = today.replace(day=1)

    sub_revenue = SubscriptionPayment.objects.filter(
        status='COMPLETED',
        paid_at__gte=month_start,
    ).aggregate(total=Sum('amount'))['total'] or 0

    booking_fees = Booking.objects.filter(
        status='COMPLETED',
        escrow_released_at__gte=month_start,
    ).aggregate(total=Sum('platform_fee'))['total'] or 0

    return Response({
        'subscription_revenue_this_month': float(sub_revenue),
        'booking_fees_this_month': float(booking_fees),
        'total_this_month': float(sub_revenue + booking_fees),
        'active_subscriptions': UserSubscription.objects.filter(
            status__in=('ACTIVE', 'TRIAL')
        ).count(),
    })