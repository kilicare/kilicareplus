from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum

from .models import PassportProfile, Badge, UserBadge, PointsTransaction
from .serializers import (
    PassportSerializer, BadgeSerializer,
    TransactionSerializer, LeaderboardEntrySerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_passport_view(request):
    from .services import generate_qr_code
    passport, _ = PassportProfile.objects.get_or_create(
        user=request.user
    )
    passport.recalculate_level()
    generate_qr_code(passport)
    return Response(
        PassportSerializer(passport, context={'request': request}).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def badges_view(request):
    badges = Badge.objects.all().order_by('criteria_points')
    return Response(
        BadgeSerializer(
            badges, many=True, context={'request': request}
        ).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transactions_view(request):
    txns = PointsTransaction.objects.filter(
        user=request.user
    ).order_by('-created_at')[:60]
    return Response(TransactionSerializer(txns, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leaderboard_view(request):
    from django.utils import timezone
    from datetime import timedelta
    
    period = request.query_params.get('period', 'all')
    
    # Calculate date range based on period
    now = timezone.now()
    if period == 'daily':
        start_date = now - timedelta(days=1)
    elif period == 'weekly':
        start_date = now - timedelta(weeks=1)
    elif period == 'monthly':
        start_date = now - timedelta(days=30)
    elif period == 'yearly':
        start_date = now - timedelta(days=365)
    else:  # all-time
        start_date = None
    
    if start_date:
        # Filter transactions by period and aggregate points
        from django.db.models import Sum
        user_points = PointsTransaction.objects.filter(
            created_at__gte=start_date,
            points_change__gt=0
        ).values('user').annotate(
            period_points=Sum('points_change')
        ).order_by('-period_points')[:50]
        
        user_ids = [up['user'] for up in user_points]
        passports = PassportProfile.objects.filter(
            user_id__in=user_ids
        ).select_related('user', 'user__profile')
        
        # Create mapping of user_id to period points
        points_map = {up['user']: up['period_points'] for up in user_points}
        
        # Sort passports by period points
        passports = sorted(
            passports,
            key=lambda p: points_map.get(p.user_id, 0),
            reverse=True
        )
        
        # Calculate my rank for this period
        my_period_points = PointsTransaction.objects.filter(
            user=request.user,
            created_at__gte=start_date,
            points_change__gt=0
        ).aggregate(total=Sum('points_change'))['total'] or 0
        
        my_rank = len([up for up in user_points if up['period_points'] > my_period_points]) + 1
        my_points = my_period_points
    else:
        # All-time leaderboard
        passports = PassportProfile.objects.filter(
            points__gt=0
        ).select_related(
            'user', 'user__profile'
        ).order_by('-points')[:50]
        
        my_passport, _ = PassportProfile.objects.get_or_create(
            user=request.user
        )
        my_rank = PassportProfile.objects.filter(
            points__gt=my_passport.points
        ).count() + 1
        my_points = my_passport.points
        points_map = {}

    serialized = LeaderboardEntrySerializer(
        passports, many=True, context={'request': request}
    ).data

    # Add rank and period points
    for i, entry in enumerate(serialized):
        entry['rank'] = i + 1
        entry['is_me'] = entry.get('user_id') == request.user.id
        if start_date:
            entry['period_points'] = points_map.get(entry['user_id'], 0)

    return Response({
        'leaderboard': serialized,
        'my_rank':     my_rank,
        'my_points':   my_points,
        'period':      period,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_view(request):
    user = request.user

    moments_count = 0
    tips_count    = 0
    bookings_done = 0

    try:
        from apps.moments.models import Moment
        moments_count = Moment.objects.filter(posted_by=user).count()
    except Exception:
        pass

    try:
        from apps.map_tips.models import Tip
        tips_count = Tip.objects.filter(created_by=user).count()
    except Exception:
        pass

    try:
        from apps.bookings.models import Booking
        bookings_done = Booking.objects.filter(
            tourist=user, status='COMPLETED'
        ).count()
    except Exception:
        pass

    total_pts = PointsTransaction.objects.filter(
        user=user, points_change__gt=0
    ).aggregate(total=Sum('points_change'))['total'] or 0

    return Response({
        'moments_posted':     moments_count,
        'tips_created':       tips_count,
        'bookings_completed': bookings_done,
        'total_points_earned': total_pts,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_badges_view(request):
    """Force check and award any missed badges"""
    passport, _ = PassportProfile.objects.get_or_create(
        user=request.user
    )
    all_badges = Badge.objects.all()
    user_badge_ids = set(
        UserBadge.objects.filter(user=request.user)
        .values_list('badge_id', flat=True)
    )

    newly_unlocked = []
    for badge in all_badges:
        if badge.id in user_badge_ids:
            continue
        if badge.criteria_points > 0 and passport.points >= badge.criteria_points:
            UserBadge.objects.get_or_create(
                user=request.user, badge=badge
            )
            newly_unlocked.append({
                'id': badge.id, 'name': badge.name,
                'icon': badge.icon,
            })

    return Response({
        'newly_unlocked': newly_unlocked,
        'count': len(newly_unlocked),
    })