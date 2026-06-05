import logging
from celery import shared_task
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


@shared_task
def send_fcm_notification_task(token, title, body, data=None):
    """Async FCM push notification task."""
    from apps.notifications.utils import _send_fcm
    _send_fcm(token, title, body, data or {})


@shared_task
def broadcast_ws_notification_task(recipient_id, notification_data):
    """Async WebSocket broadcast task using Redis channel layer."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{recipient_id}',
            {
                'type': 'notification_message',
                'notification': notification_data,
            }
        )
    except Exception as e:
        logger.error(f"[Celery WS Broadcast] Error broadcasting to notifications_{recipient_id}: {e}")


@shared_task
def create_notification_task(recipient_id, sender_id, notification_type, title, body, data=None):
    """Creates a notification database record, then triggers WS and FCM tasks."""
    User = get_user_model()
    try:
        recipient = User.objects.get(id=recipient_id)
        sender = User.objects.get(id=sender_id) if sender_id else None
    except User.DoesNotExist as e:
        logger.error(f"[Celery Create Notification] Failed: user does not exist. {e}")
        return None

    from apps.notifications.models import Notification
    notif = Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notification_type=notification_type,
        title=title,
        body=body,
        data=data or {},
    )

    # Cache Invalidation: invalidate unread counts
    from django.core.cache import cache
    cache.delete(f"user_unread_count:{recipient_id}")

    sender_avatar = None
    if sender:
        try:
            if sender.profile.avatar:
                sender_avatar = sender.profile.avatar.url
        except Exception:
            pass

    notification_data = {
        'id': notif.id,
        'notification_type': notification_type,
        'title': title,
        'body': body,
        'data': data or {},
        'is_read': False,
        'created_at': notif.created_at.isoformat(),
        'sender': {
            'username': sender.username if sender else None,
            'avatar': sender_avatar,
        } if sender else None,
    }

    # Asynchronously dispatch WS broadcast
    broadcast_ws_notification_task.delay(recipient_id, notification_data)

    # Asynchronously dispatch FCM push if recipient has a token
    if hasattr(recipient, 'fcm_token') and recipient.fcm_token:
        send_fcm_notification_task.delay(recipient.fcm_token, title, body, data or {})
        notif.fcm_sent = True
        notif.save(update_fields=['fcm_sent'])

    return notif.id


@shared_task
def send_notification_task(recipient_id=None, sender_id=None, notification_type=None, title=None, body=None, data=None, notification_id=None):
    """Orchestrates creating and delivering the notification using subtasks. Can accept notification_id or build a new one."""
    if notification_id:
        from apps.notifications.models import Notification
        try:
            notif = Notification.objects.get(id=notification_id)
        except Notification.DoesNotExist:
            logger.error(f"[Celery Send Notification] Notification ID {notification_id} not found")
            return None

        recipient = notif.recipient
        sender = notif.sender

        sender_avatar = None
        if sender:
            try:
                if sender.profile.avatar:
                    sender_avatar = sender.profile.avatar.url
            except Exception:
                pass

        notification_data = {
            'id': notif.id,
            'notification_type': notif.notification_type,
            'title': notif.title,
            'body': notif.body,
            'data': notif.data or {},
            'is_read': notif.is_read,
            'created_at': notif.created_at.isoformat(),
            'sender': {
                'username': sender.username if sender else None,
                'avatar': sender_avatar,
            } if sender else None,
        }

        # Invalidate cache
        from django.core.cache import cache
        cache.delete(f"user_unread_count:{recipient.id}")

        broadcast_ws_notification_task.delay(recipient.id, notification_data)

        if hasattr(recipient, 'fcm_token') and recipient.fcm_token:
            send_fcm_notification_task.delay(recipient.fcm_token, notif.title, notif.body, notif.data or {})
            notif.fcm_sent = True
            notif.save(update_fields=['fcm_sent'])

        return notif.id
    else:
        return create_notification_task(recipient_id, sender_id, notification_type, title, body, data)
