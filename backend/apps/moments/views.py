from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.db.models import Q, Count, Case, When
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import random
import environ

from .models import Moment, MomentLike, MomentSave
from .serializers import MomentSerializer
from core.throttles import LikeSpamThrottle, NotificationSpamThrottle
from core.cache_utils import invalidate_feed_cache
from apps.notifications.event_dispatcher import notify_event

env = environ.Env()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feed_view(request):
    """Paginated feed with diversity — 20 moments per page (cached, user-aware)"""
    page = int(request.query_params.get('page', 1))
    page_size = 20
    offset = (page - 1) * page_size
    session_id = request.query_params.get('session_id', '')
    
    user_id = request.user.id
    cache_key = f"feed_user_{user_id}_page_{page}"
    
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    seen_posts_key = f"seen_posts_{user_id}_{session_id}"
    seen_posts = cache.get(seen_posts_key, [])

    base_queryset = Moment.objects.filter(visibility='PUBLIC').select_related('posted_by', 'posted_by__profile')
    
    if seen_posts:
        base_queryset = base_queryset.exclude(id__in=seen_posts)

    trending_count = int(page_size * 0.7)
    fresh_count = int(page_size * 0.2)
    discovery_count = page_size - trending_count - fresh_count

    trending_moments = list(base_queryset.order_by('-trending_score', '-created_at')[:trending_count * 2])
    
    one_day_ago = timezone.now() - timedelta(days=1)
    fresh_moments = list(base_queryset.filter(created_at__gte=one_day_ago).order_by('-created_at')[:fresh_count * 2])
    
    all_ids = set(m.id for m in trending_moments + fresh_moments)
    discovery_queryset = base_queryset.exclude(id__in=all_ids)
    discovery_moments = list(discovery_queryset.order_by('?')[:discovery_count * 2]) if discovery_queryset.exists() else []

    combined = []
    creator_history = []
    location_history = []

    for moment in trending_moments:
        if len(combined) >= trending_count:
            break
        if moment.posted_by_id not in creator_history[-3:] if creator_history else True:
            if moment.location not in location_history[-2:] if location_history else True:
                combined.append(moment)
                creator_history.append(moment.posted_by_id)
                if moment.location:
                    location_history.append(moment.location)

    for moment in fresh_moments:
        if len(combined) >= trending_count + fresh_count:
            break
        if moment.id not in [m.id for m in combined]:
            if moment.posted_by_id not in creator_history[-3:] if creator_history else True:
                if moment.location not in location_history[-2:] if location_history else True:
                    combined.append(moment)
                    creator_history.append(moment.posted_by_id)
                    if moment.location:
                        location_history.append(moment.location)

    for moment in discovery_moments:
        if len(combined) >= page_size:
            break
        if moment.id not in [m.id for m in combined]:
            combined.append(moment)

    if len(combined) < page_size:
        remaining = page_size - len(combined)
        fallback_ids = [m.id for m in combined]
        additional = base_queryset.exclude(id__in=fallback_ids).order_by('-trending_score', '-created_at')[:remaining]
        combined.extend(list(additional))

    moments = combined[:page_size]

    new_seen = [m.id for m in moments]
    updated_seen = list(set(seen_posts + new_seen))[-500:]
    cache.set(seen_posts_key, updated_seen, 3600)

    total = Moment.objects.filter(visibility='PUBLIC').count()
    serializer = MomentSerializer(moments, many=True, context={'request': request})
    
    response_data = {
        'results': serializer.data,
        'count': total,
        'page': page,
        'has_next': (offset + page_size) < total,
    }
    
    cache.set(cache_key, response_data, 300)
    return Response(response_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trending_view(request):
    """Get trending moments (cached)"""
    cache_key = "feed_trending"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    moments = Moment.objects.filter(
        visibility='PUBLIC', trending_score__gt=0
    ).order_by('-trending_score')[:10]
    
    data = MomentSerializer(moments, many=True, context={'request': request}).data
    cache.set(cache_key, data, 300) # TTL: 5 minutes
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_moment_view(request):
    serializer = MomentSerializer(
        data=request.data, context={'request': request}
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    moment = serializer.save(posted_by=request.user)

    # Award points
    try:
        request.user.passport.award_points('POST_MOMENT')
    except Exception:
        pass

    # Update trending score
    _update_trending(moment)
    
    # Invalidate feed cache
    invalidate_feed_cache()

    return Response(
        MomentSerializer(moment, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def moment_detail_view(request, pk):
    try:
        moment = Moment.objects.select_related(
            'posted_by', 'posted_by__profile'
        ).get(pk=pk)
    except Moment.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)

    # Increment views
    moment.views += 1
    moment.save(update_fields=['views'])
    _update_trending(moment)

    return Response(
        MomentSerializer(moment, context={'request': request}).data
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([LikeSpamThrottle])
def like_view(request, pk):
    try:
        moment = Moment.objects.get(pk=pk)
    except Moment.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)

    like, created = MomentLike.objects.get_or_create(
        moment=moment, user=request.user
    )
    if not created:
        like.delete()
        liked = False
    else:
        liked = True
        # Points: liker gets 0, poster gets +1
        try:
            moment.posted_by.passport.award_points('GET_LIKE')
        except Exception:
            pass

        # Trigger event notification
        notify_event(
            'LIKE',
            actor=request.user,
            target=moment.posted_by,
            payload={
                'moment_id': moment.id,
                'moment_caption': moment.caption or ''
            }
        )

    _update_trending(moment)
    
    # Invalidate cache
    invalidate_feed_cache()
    
    return Response({
        'liked': liked,
        'like_count': moment.likes.count(),
    })




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_view(request, pk):
    try:
        moment = Moment.objects.get(pk=pk)
    except Moment.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)

    save, created = MomentSave.objects.get_or_create(
        moment=moment, user=request.user
    )
    if not created:
        save.delete()
        saved = False
    else:
        saved = True

    return Response({'saved': saved})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_moments_view(request):
    moments = Moment.objects.filter(
        posted_by=request.user
    ).order_by('-created_at')
    return Response(
        MomentSerializer(
            moments, many=True, context={'request': request}
        ).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def saved_moments_view(request):
    saves = MomentSave.objects.filter(
        user=request.user
    ).select_related('moment').order_by('-created_at')
    moments = [s.moment for s in saves]
    return Response(
        MomentSerializer(
            moments, many=True, context={'request': request}
        ).data
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_moment_view(request, pk):
    try:
        moment = Moment.objects.get(pk=pk, posted_by=request.user)
    except Moment.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)
    moment.delete()
    
    # Invalidate cache
    invalidate_feed_cache()
    
    return Response(status=status.HTTP_204_NO_CONTENT)


def _update_trending(moment):
    """Simple trending score calculation"""
    score = (
        moment.likes.count() * 3 +
        moment.views * 0.1 +
        moment.shares * 4
    )
    Moment.objects.filter(pk=moment.pk).update(trending_score=score)