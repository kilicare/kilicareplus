import math
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Tip, TipUpvote, TipReport
from .serializers import TipSerializer
from core.permissions import IsLocalGuideOrAdmin


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tips_list_view(request):
    category = request.query_params.get('category')
    qs = Tip.objects.select_related(
        'created_by', 'created_by__profile'
    ).order_by('-trust_score', '-created_at')
    if category:
        qs = qs.filter(category=category)
    return Response(
        TipSerializer(qs[:50], many=True, context={'request': request}).data
    )


@api_view(['POST'])
@permission_classes([IsLocalGuideOrAdmin])
def create_tip_view(request):
    serializer = TipSerializer(
        data=request.data, context={'request': request}
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    tip = serializer.save(created_by=request.user)

    # Points
    try:
        request.user.passport.award_points('CREATE_TIP')
    except Exception:
        pass

    return Response(
        TipSerializer(tip, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upvote_tip_view(request, pk):
    try:
        tip = Tip.objects.get(pk=pk)
    except Tip.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)

    upvote, created = TipUpvote.objects.get_or_create(
        tip=tip, user=request.user
    )
    if not created:
        upvote.delete()
        tip.upvotes = max(0, tip.upvotes - 1)
        tip.trust_score = max(0, tip.trust_score - 1)
        upvoted = False
    else:
        tip.upvotes += 1
        tip.trust_score = min(100, tip.trust_score + 2)
        upvoted = True
        try:
            tip.created_by.passport.award_points('TIP_UPVOTED')
        except Exception:
            pass

    tip.save(update_fields=['upvotes', 'trust_score'])
    return Response({'upvoted': upvoted, 'upvotes': tip.upvotes})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nearby_tips_view(request):
    lat = request.query_params.get('lat')
    lng = request.query_params.get('lng')
    radius = float(request.query_params.get('radius', 10))

    if not lat or not lng:
        return Response({'message': 'lat na lng zinahitajika.'}, status=400)

    lat, lng = float(lat), float(lng)
    all_tips = Tip.objects.filter(
        latitude__isnull=False, longitude__isnull=False
    ).select_related('created_by', 'created_by__profile')

    nearby = []
    for tip in all_tips:
        dist = _haversine(lat, lng, tip.latitude, tip.longitude)
        if dist <= radius:
            nearby.append(tip)

    nearby.sort(key=lambda t: t.trust_score, reverse=True)
    return Response(
        TipSerializer(
            nearby[:30], many=True, context={'request': request}
        ).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trending_tips_view(request):
    tips = Tip.objects.order_by('-upvotes', '-trust_score')[:10]
    return Response(
        TipSerializer(tips, many=True, context={'request': request}).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tips_view(request):
    tips = Tip.objects.filter(created_by=request.user).order_by('-created_at')
    return Response(
        TipSerializer(tips, many=True, context={'request': request}).data
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_tip_view(request, pk):
    try:
        tip = Tip.objects.get(pk=pk)
    except Tip.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)
    TipReport.objects.get_or_create(
        tip=tip, reporter=request.user,
        defaults={
            'reason': request.data.get('reason', 'SPAM'),
            'description': request.data.get('description', ''),
        },
    )
    return Response({'message': 'Imeripotiwa. Asante!'})


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))