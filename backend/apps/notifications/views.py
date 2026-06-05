from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification


def _serialize(notif, req=None):
    sender = notif.sender
    av = None
    if sender:
        try:
            if sender.profile.avatar:
                av = sender.profile.avatar.url
        except Exception:
            pass
    return {
        'id':                notif.id,
        'notification_type': notif.notification_type,
        'title':             notif.title,
        'body':              notif.body,
        'data':              notif.data,
        'is_read':           notif.is_read,
        'sender': {
            'username': sender.username if sender else None,
            'avatar':   av,
        } if sender else None,
        'created_at':  notif.created_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_list_view(request):
    notifs = Notification.objects.filter(
        recipient=request.user
    ).select_related('sender', 'sender__profile').order_by('-created_at')[:60]
    return Response([_serialize(n, request) for n in notifs])


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_read_view(request, pk):
    Notification.objects.filter(
        pk=pk, recipient=request.user
    ).update(is_read=True)
    from django.core.cache import cache
    cache.delete(f"user_unread_count:{request.user.id}")
    return Response({'success': True})


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_all_read_view(request):
    Notification.objects.filter(
        recipient=request.user, is_read=False
    ).update(is_read=True)
    from django.core.cache import cache
    cache.delete(f"user_unread_count:{request.user.id}")
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count_view(request):
    from django.core.cache import cache
    cache_key = f"user_unread_count:{request.user.id}"
    count = cache.get(cache_key)
    if count is None:
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        cache.set(cache_key, count, 600)  # TTL: 10 mins
    return Response({'count': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_sync_view(request):
    """Sync missed notifications on reconnect."""
    last_id = request.query_params.get('last_id')
    since = request.query_params.get('since')

    queryset = Notification.objects.filter(recipient=request.user).select_related('sender', 'sender__profile')

    if last_id:
        try:
            queryset = queryset.filter(id__gt=int(last_id))
        except ValueError:
            pass
    elif since:
        queryset = queryset.filter(created_at__gt=since)
    else:
        # Default fallback to unread
        queryset = queryset.filter(is_read=False)

    notifs = queryset.order_by('created_at')[:50]
    return Response([_serialize(n, request) for n in notifs])