from django.conf import settings


def create_notification(
    recipient,
    notification_type: str,
    title: str,
    body: str,
    data: dict = None,
    sender=None,
):
    """Create notification + WebSocket + FCM"""
    from .models import Notification
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    notif = Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notification_type=notification_type,
        title=title,
        body=body,
        data=data or {},
    )

    # Real-time via WebSocket
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{recipient.id}',
            {
                'type': 'notification_message',
                'notification': {
                    'id':                notif.id,
                    'notification_type': notification_type,
                    'title':             title,
                    'body':              body,
                    'data':              data or {},
                    'is_read':           False,
                    'created_at':        notif.created_at.isoformat(),
                    'sender': {
                        'username': sender.username if sender else None,
                        'avatar':   (
                            sender.profile.avatar.url
                            if sender and hasattr(sender, 'profile')
                            and sender.profile.avatar
                            else None
                        ),
                    } if sender else None,
                },
            },
        )
    except Exception as e:
        print(f'[WS Notification] {e}')

    # FCM push
    import logging
    logger = logging.getLogger(__name__)
    try:
        if hasattr(recipient, 'fcm_token') and recipient.fcm_token:
            _send_fcm(recipient.fcm_token, title, body, data or {})
            notif.fcm_sent = True
            notif.save(update_fields=['fcm_sent'])
    except Exception as e:
        logger.error(f'[FCM] Failed to send FCM notification to user {recipient.id}: {e}')

    return notif


def _send_fcm(token: str, title: str, body: str, data: dict):
    """Firebase Cloud Messaging"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        import firebase_admin
        from firebase_admin import messaging, credentials

        if not firebase_admin._apps:
            cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', '')
            if not cred_path:
                logger.warning('[FCM] FIREBASE_CREDENTIALS_PATH not set in settings. FCM disabled.')
                return
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                logger.info('[FCM] Firebase initialized successfully')
            except Exception as e:
                logger.error(f'[FCM] Failed to initialize Firebase: {e}')
                return

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={str(k): str(v) for k, v in data.items()},
            token=token,
            android=messaging.AndroidConfig(priority='high'),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound='default', badge=1)
                )
            ),
        )
        messaging.send(message)
        logger.info(f'[FCM] Push notification sent successfully to token {token[:10]}...')
    except Exception as e:
        logger.error(f'[FCM Send] Failed to send notification: {e}')