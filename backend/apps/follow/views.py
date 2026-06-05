from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache

from .models import Follow
from apps.accounts.models import User
from core.throttles import FollowSpamThrottle
from core.cache_utils import invalidate_followers_cache, invalidate_profile_cache
from apps.notifications.event_dispatcher import notify_event


def _user_data(user, request_user=None):
    try:
        av = user.profile.avatar.url if user.profile.avatar else None
    except Exception:
        av = None
    is_following = False
    if request_user:
        is_following = Follow.objects.filter(
            follower=request_user, following=user
        ).exists()
    return {
        'id':           user.id,
        'username':     user.username,
        'first_name':   user.first_name,
        'role':         user.role,
        'is_verified':  user.is_verified,
        'avatar':       av,
        'is_following': is_following,
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([FollowSpamThrottle])
def toggle_follow_view(request, user_id):
    if request.user.id == user_id:
        return Response(
            {'message': 'Huwezi kujifuata mwenyewe.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'message': 'Mtumiaji haipatikani.'}, status=404)

    existing = Follow.objects.filter(
        follower=request.user, following=target
    ).first()

    if existing:
        existing.delete()
        following = False
    else:
        Follow.objects.create(follower=request.user, following=target)
        following = True

        # Send follow notification via unified event dispatcher
        notify_event(
            'FOLLOW',
            actor=request.user,
            target=target,
            payload={
                'user_id': request.user.id,
                'username': request.user.username
            }
        )

        try:
            from apps.passport.services import award_points_to_user
            award_points_to_user(target, 'FOLLOW_RECEIVED')
        except Exception:
            pass

    # Real-time WebSocket sync of follower counts
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        followers_count = Follow.objects.filter(following=target).count()
        following_count = Follow.objects.filter(follower=target).count()
        
        # Broadcast target update
        async_to_sync(channel_layer.group_send)(
            f'notifications_{target.id}',
            {
                'type': 'unread_count_update', # trigger UI sync
                'count': NotificationConsumer_count(target) if 'NotificationConsumer_count' in globals() else 0,
            }
        )
        # We can send a custom event of type "follow_sync"
        async_to_sync(channel_layer.group_send)(
            f'notifications_{target.id}',
            {
                'type': 'gamification_update',
                'update_type': 'follow_sync',
                'data': {
                    'user_id': target.id,
                    'followers_count': followers_count,
                    'following_count': following_count,
                }
            }
        )
    except Exception:
        pass

    # Invalidate followers caches for both users
    invalidate_followers_cache(request.user.id)
    invalidate_followers_cache(user_id)
    invalidate_profile_cache(request.user.username)
    invalidate_profile_cache(target.username)

    followers = Follow.objects.filter(following=target).count()
    return Response({
        'following':       following,
        'followers_count': followers,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def followers_list_view(request, user_id):
    cache_key = f"followers_list:{user_id}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    follows = Follow.objects.filter(
        following_id=user_id
    ).select_related('follower', 'follower__profile')
    
    data = [_user_data(f.follower, request.user) for f in follows]
    cache.set(cache_key, data, 1800) # TTL: 30 minutes
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def following_list_view(request, user_id):
    cache_key = f"following_list:{user_id}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    follows = Follow.objects.filter(
        follower_id=user_id
    ).select_related('following', 'following__profile')
    
    data = [_user_data(f.following, request.user) for f in follows]
    cache.set(cache_key, data, 1800) # TTL: 30 minutes
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_follow_view(request, user_id):
    cache_key = f"follow_check:{user_id}:{request.user.id}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data)

    is_following = Follow.objects.filter(
        follower=request.user, following_id=user_id
    ).exists()
    followers = Follow.objects.filter(following_id=user_id).count()
    following = Follow.objects.filter(follower_id=user_id).count()
    
    data = {
        'is_following':    is_following,
        'followers_count': followers,
        'following_count': following,
    }
    cache.set(cache_key, data, 1800) # TTL: 30 minutes
    return Response(data)