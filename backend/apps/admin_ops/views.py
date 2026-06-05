from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from core.permissions import IsAdmin
from apps.accounts.models import User
from apps.moments.models import Moment
from apps.map_tips.models import Tip
from apps.sos.models import SOSAlert
from apps.subscriptions.models import UserSubscription, SubscriptionPayment
from apps.passport.models import PassportProfile, PointsTransaction


@api_view(['GET'])
@permission_classes([IsAdmin])
def users_list_view(request):
    role   = request.query_params.get('role')
    search = request.query_params.get('search', '')
    page   = int(request.query_params.get('page', 1))
    
    # Pagination validation
    MAX_PAGE_SIZE = 100
    DEFAULT_PAGE_SIZE = 20
    page_size = int(request.query_params.get('page_size', DEFAULT_PAGE_SIZE))
    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)  # Clamp between 1 and 100
    
    if page < 1:
        page = 1

    qs = User.objects.select_related(
        'profile', 'passport'
    ).order_by('-date_joined')

    if role:
        qs = qs.filter(role=role)
    if search:
        qs = qs.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(first_name__icontains=search)
        )

    total  = qs.count()
    offset = (page - 1) * page_size
    users  = qs[offset:offset + page_size]

    data = []
    for u in users:
        passport = getattr(u, 'passport', None)
        profile  = getattr(u, 'profile', None)
        data.append({
            'id':          u.id,
            'username':    u.username,
            'email':       u.email,
            'first_name':  u.first_name,
            'last_name':   u.last_name,
            'role':        u.role,
            'is_active':   u.is_active,
            'is_verified': u.is_verified,
            'date_joined': u.date_joined.isoformat(),
            'points':      passport.points      if passport else 0,
            'trust_score': passport.trust_score if passport else 50,
            'level':       passport.level       if passport else 'EXPLORER',
            'avatar': (
                profile.avatar.url
                if profile and profile.avatar else None
            ),
        })

    return Response({
        'results':  data,
        'count':    total,
        'page':     page,
        'page_size': page_size,
        'has_next': (offset + page_size) < total,
    })


@api_view(['PUT'])
@permission_classes([IsAdmin])
def change_role_view(request, user_id):
    new_role = request.data.get('role')
    if new_role not in ('TOURIST', 'LOCAL_GUIDE', 'ADMIN', 'B2B'):
        return Response(
            {'message': 'Role si sahihi.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        user = User.objects.get(id=user_id)
        old_role = user.role
        user.role = new_role
        user.save(update_fields=['role'])
        
        # Invalidate profile cache
        from core.cache_utils import invalidate_profile_cache
        invalidate_profile_cache(user.username)
        invalidate_profile_cache(user.id)
        
        # Audit log
        from .services import log_role_change
        log_role_change(
            actor=request.user,
            target_user=user,
            old_role=old_role,
            new_role=new_role,
            reason=request.data.get('reason', 'Role change by admin'),
            request=request,
        )
        
        return Response({'success': True, 'role': new_role})
    except User.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdmin])
def award_points_view(request, user_id):
    pts    = int(request.data.get('points', 0))
    reason = request.data.get('reason', 'Admin award')

    try:
        user = User.objects.get(id=user_id)
        from apps.passport.services import award_points_to_user
        txn = award_points_to_user(user, 'ADMIN_AWARD', pts)
        if txn:
            # Audit log
            from .services import log_points_award
            log_points_award(
                actor=request.user,
                target_user=user,
                points_change=pts,
                balance_after=txn.balance_after,
                reason=reason,
                request=request,
            )
            return Response({'success': True, 'new_balance': txn.balance_after})
        return Response({'message': 'Failed to award points'}, status=400)
    except User.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def suspend_user_view(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        old_is_active = user.is_active
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        
        # Invalidate profile cache
        from core.cache_utils import invalidate_profile_cache
        invalidate_profile_cache(user.username)
        invalidate_profile_cache(user.id)
        
        # Audit log
        from .services import log_user_suspension
        log_user_suspension(
            actor=request.user,
            target_user=user,
            is_active=user.is_active,
            reason=request.data.get('reason', 'User suspension by admin'),
            request=request,
        )
        
        return Response({
            'success':   True,
            'is_active': user.is_active,
        })
    except User.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def moderation_moments_view(request):
    moments = Moment.objects.select_related(
        'posted_by'
    ).order_by('-created_at')[:50]
    return Response([{
        'id':           m.id,
        'posted_by':    m.posted_by.username,
        'media_url':    m.media.url if m.media else None,
        'media_type':   m.media_type,
        'caption':      m.caption,
        'views':        m.views,
        'trending_score': m.trending_score,
        'visibility':   m.visibility,
        'created_at':   m.created_at.isoformat(),
    } for m in moments])


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
    return Response([{
        'id':          t.id,
        'title':       t.title,
        'description': t.description,
        'category':    t.category,
        'creator':     t.created_by.username,
        'upvotes':     t.upvotes,
        'trust_score': t.trust_score,
        'created_at':  t.created_at.isoformat(),
    } for t in tips])


@api_view(['PUT'])
@permission_classes([IsAdmin])
def verify_tip_view(request, tip_id):
    try:
        tip = Tip.objects.get(id=tip_id)
        tip.is_verified   = True
        tip.trust_score   = min(100, tip.trust_score + 20)
        tip.save(update_fields=['is_verified', 'trust_score'])
        try:
            from apps.notifications.utils import create_notification
            from apps.passport.services import award_points_to_user
            create_notification(
                recipient=tip.created_by,
                notification_type='TIP_VERIFIED',
                title='Tip yako imethibitishwa! ✅',
                body=f'"{tip.title}" imethibitishwa na admin.',
            )
            award_points_to_user(tip.created_by, 'TIP_VERIFIED')
        except Exception:
            pass
        return Response({'success': True})
    except Tip.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def sos_statistics_view(request):
    today = timezone.now().date()
    return Response({
        'active':          SOSAlert.objects.filter(status='ACTIVE').count(),
        'responding':      SOSAlert.objects.filter(status='RESPONDING').count(),
        'escalated':       SOSAlert.objects.filter(status='ESCALATED').count(),
        'resolved_today':  SOSAlert.objects.filter(
            status='RESOLVED',
            resolved_at__date=today,
        ).count(),
        'total':           SOSAlert.objects.count(),
        'critical_active': SOSAlert.objects.filter(
            status='ACTIVE', severity='CRITICAL'
        ).count(),
        'avg_response_time_minutes': SOSAlert.objects.filter(
            avg_response_time_minutes__isnull=False
        ).aggregate(avg=Avg('avg_response_time_minutes'))['avg'] or 0,
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def revenue_stats_view(request):
    from decimal import Decimal
    today       = timezone.now()
    month_start = today.replace(day=1)
    week_start  = today - timedelta(days=7)

    # Subscription revenue - exclude refunds
    sub_rev_month = SubscriptionPayment.objects.filter(
        status='COMPLETED', paid_at__gte=month_start,
    ).exclude(status='REFUNDED').aggregate(total=Sum('amount'))['total'] or Decimal('0')

    sub_rev_week = SubscriptionPayment.objects.filter(
        status='COMPLETED', paid_at__gte=week_start,
    ).exclude(status='REFUNDED').aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # Booking fees - exclude refunds
    booking_fees_month = Decimal('0')
    booking_fees_week = Decimal('0')
    try:
        from apps.bookings.models import Booking
        booking_fees_month = Booking.objects.filter(
            status='COMPLETED',
            escrow_released_at__gte=month_start,
        ).exclude(status='REFUNDED').aggregate(total=Sum('platform_fee'))['total'] or Decimal('0')
        
        booking_fees_week = Booking.objects.filter(
            status='COMPLETED',
            escrow_released_at__gte=week_start,
        ).exclude(status='REFUNDED').aggregate(total=Sum('platform_fee'))['total'] or Decimal('0')
    except Exception:
        pass

    # Calculate refunds
    sub_refunds_month = SubscriptionPayment.objects.filter(
        status='REFUNDED', paid_at__gte=month_start,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    booking_refunds_month = Decimal('0')
    try:
        from apps.bookings.models import Booking
        booking_refunds_month = Booking.objects.filter(
            status='REFUNDED',
            escrow_released_at__gte=month_start,
        ).aggregate(total=Sum('platform_fee'))['total'] or Decimal('0')
    except Exception:
        pass

    total_refunds_month = sub_refunds_month + booking_refunds_month
    
    # Net revenue (gross - refunds)
    gross_revenue_month = sub_rev_month + booking_fees_month
    net_revenue_month = gross_revenue_month - total_refunds_month

    # Subscription breakdown
    active_subs = UserSubscription.objects.filter(
        status__in=('ACTIVE', 'TRIAL'),
        end_date__gte=today.date()
    ).values('plan__name').annotate(count=Count('id'))

    return Response({
        'subscription_revenue_this_month': float(sub_rev_month),
        'subscription_revenue_this_week':  float(sub_rev_week),
        'booking_fees_this_month':         float(booking_fees_month),
        'booking_fees_this_week':          float(booking_fees_week),
        'gross_revenue_this_month':         float(gross_revenue_month),
        'net_revenue_this_month':           float(net_revenue_month),
        'refunds_this_month':               float(total_refunds_month),
        'total_this_month':                float(net_revenue_month),
        'active_subscriptions':            UserSubscription.objects.filter(
            status__in=('ACTIVE', 'TRIAL'),
            end_date__gte=today.date()
        ).count(),
        'subscription_breakdown': list(active_subs),
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def platform_stats_view(request):
    """Overview stats for admin dashboard with enhanced metrics"""
    try:
        from apps.moments.models import Moment
        from apps.map_tips.models import Tip
        from apps.experiences.models import Experience
        from apps.bookings.models import Booking
        from datetime import timedelta
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # User metrics
        users_total = User.objects.count()
        users_active = User.objects.filter(is_active=True).count()
        users_verified = User.objects.filter(is_verified=True).count()
        users_new_week = User.objects.filter(date_joined__date__gte=week_ago).count()
        users_new_month = User.objects.filter(date_joined__date__gte=month_ago).count()
        
        # Active users (logged in within 7 days)
        from apps.passport.models import PassportProfile
        active_users_7d = PassportProfile.objects.filter(
            user__is_active=True,
            updated_at__date__gte=week_ago
        ).count()
        
        # Guide metrics
        guides_total = User.objects.filter(role='LOCAL_GUIDE').count()
        guides_verified = User.objects.filter(role='LOCAL_GUIDE', is_verified=True).count()
        
        # Tourist metrics
        tourists_total = User.objects.filter(role='TOURIST').count()
        
        # Content metrics
        moments_total = Moment.objects.count()
        moments_week = Moment.objects.filter(created_at__date__gte=week_ago).count()
        tips_total = Tip.objects.count()
        tips_verified = Tip.objects.filter(is_verified=True).count()
        tips_unverified = Tip.objects.filter(is_verified=False).count()
        experiences_total = Experience.objects.count()
        
        # Booking metrics
        bookings_total = Booking.objects.count()
        bookings_completed = Booking.objects.filter(status='COMPLETED').count()
        bookings_week = Booking.objects.filter(created_at__date__gte=week_ago).count()
        bookings_month = Booking.objects.filter(created_at__date__gte=month_ago).count()
        
        # SOS metrics
        sos_active = SOSAlert.objects.filter(status='ACTIVE').count()
        sos_resolved_week = SOSAlert.objects.filter(
            status='RESOLVED',
            resolved_at__date__gte=week_ago
        ).count()
        
        # Engagement metrics
        total_views = Moment.objects.aggregate(total=Sum('views'))['total'] or 0
        total_likes = Moment.objects.annotate(like_count=Count('likes')).aggregate(total=Sum('like_count'))['total'] or 0
        
        return Response({
            'users_total': users_total,
            'users_active': users_active,
            'users_verified': users_verified,
            'users_new_week': users_new_week,
            'users_new_month': users_new_month,
            'active_users_7d': active_users_7d,
            'guides_total': guides_total,
            'guides_verified': guides_verified,
            'tourists_total': tourists_total,
            'moments_total': moments_total,
            'moments_week': moments_week,
            'tips_total': tips_total,
            'tips_verified': tips_verified,
            'tips_unverified': tips_unverified,
            'experiences_total': experiences_total,
            'bookings_total': bookings_total,
            'bookings_completed': bookings_completed,
            'bookings_week': bookings_week,
            'bookings_month': bookings_month,
            'sos_active': sos_active,
            'sos_resolved_week': sos_resolved_week,
            'total_views': total_views,
            'total_likes': total_likes,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdmin])
def guide_performance_view(request):
    """Guide performance metrics for analytics"""
    try:
        from apps.bookings.models import Booking
        from apps.experiences.models import Experience
        from datetime import timedelta
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        # Get all guides
        guides = User.objects.filter(role='LOCAL_GUIDE').select_related('passport', 'profile')
        
        guide_data = []
        for guide in guides[:50]:  # Limit to top 50
            passport = getattr(guide, 'passport', None)
            profile = getattr(guide, 'profile', None)
            
            # Booking metrics
            bookings = Booking.objects.filter(guide=guide)
            total_bookings = bookings.count()
            completed_bookings = bookings.filter(status='COMPLETED').count()
            
            # Revenue metrics
            revenue = bookings.filter(
                status='COMPLETED',
                escrow_released_at__date__gte=month_start
            ).aggregate(total=Sum('guide_payout'))['total'] or 0
            
            # Experience metrics
            experiences = Experience.objects.filter(local=guide).count()
            
            # SOS response metrics
            sos_responses = SOSAlert.objects.filter(
                responses__responder=guide
            ).distinct().count()
            
            guide_data.append({
                'id': guide.id,
                'username': guide.username,
                'first_name': guide.first_name,
                'is_verified': guide.is_verified,
                'is_active': guide.is_active,
                'points': passport.points if passport else 0,
                'trust_score': passport.trust_score if passport else 50,
                'level': passport.level if passport else 'EXPLORER',
                'total_bookings': total_bookings,
                'completed_bookings': completed_bookings,
                'completion_rate': round(completed_bookings / total_bookings * 100, 1) if total_bookings > 0 else 0,
                'revenue_this_month': float(revenue),
                'experiences_count': experiences,
                'sos_responses': sos_responses,
                'avatar': profile.avatar.url if profile and profile.avatar else None,
            })
        
        # Sort by revenue
        guide_data.sort(key=lambda x: x['revenue_this_month'], reverse=True)
        
        return Response(guide_data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)