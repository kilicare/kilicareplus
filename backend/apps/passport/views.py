from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PassportProfile, PointsTransaction, Badge
from .serializers import (
    PassportProfileSerializer,
    PointsTransactionSerializer,
    BadgeSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_passport_view(request):
    passport, _ = PassportProfile.objects.get_or_create(
        user=request.user,
        defaults={'points': 50, 'level': 'EXPLORER'},
    )
    return Response(PassportProfileSerializer(passport).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_transactions_view(request):
    txns = PointsTransaction.objects.filter(
        user=request.user
    )[:50]
    return Response(
        PointsTransactionSerializer(txns, many=True).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_badges_view(request):
    badges = Badge.objects.filter(
        is_active=True
    ).order_by('criteria_points')
    return Response(
        BadgeSerializer(
            badges, many=True, context={'user': request.user}
        ).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leaderboard_view(request):
    passports = PassportProfile.objects.select_related(
        'user', 'user__profile'
    ).order_by('-points')[:50]
    data = []
    for i, p in enumerate(passports, 1):
        profile = getattr(p.user, 'profile', None)
        data.append({
            'rank': i,
            'user_id': p.user.id,
            'username': p.user.username,
            'first_name': p.user.first_name,
            'avatar': (
                profile.avatar.url
                if profile and profile.avatar
                else None
            ),
            'role': p.user.role,
            'points': p.points,
            'level': p.level,
            'trust_score': p.trust_score,
            'is_me': p.user == request.user,
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_stats_view(request):
    passport = getattr(request.user, 'passport', None)
    return Response({
        'current_points': passport.points if passport else 0,
        'level': passport.level if passport else 'EXPLORER',
        'trust_score': passport.trust_score if passport else 50,
    })