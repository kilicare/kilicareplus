import logging
from typing import Any
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


# ── Event Type Registry ───────────────────────────────────────────────────────
class EventType:
    LIKE                  = 'LIKE'
    FOLLOW                = 'FOLLOW'
    SOS_RESPONSE          = 'SOS_RESPONSE'
    BOOKING_REQUEST       = 'BOOKING_REQUEST'
    BOOKING_CONFIRMED     = 'BOOKING_CONFIRMED'
    BOOKING_COMPLETED     = 'BOOKING_COMPLETED'
    PAYMENT_RECEIVED      = 'PAYMENT_RECEIVED'
    BADGE_UNLOCK          = 'BADGE_UNLOCK'
    POINTS_AWARDED        = 'POINTS_AWARDED'
    TIP_VERIFIED          = 'TIP_VERIFIED'
    NEW_MESSAGE           = 'NEW_MESSAGE'
    SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING'
    SHOWCASE_ORDER        = 'SHOWCASE_ORDER'
    SHOWCASE_DELIVERED    = 'SHOWCASE_DELIVERED'
    LEVEL_UP              = 'LEVEL_UP'
    REVIEW_RECEIVED       = 'REVIEW_RECEIVED'


def map_event_type(event_type: str) -> str:
    """Map generic events to target notification types."""
    mapping = {
        'LIKE_EVENT': EventType.LIKE,
        'FOLLOW_EVENT': EventType.FOLLOW,
        'SOS_EVENT': EventType.SOS_RESPONSE,
        'BOOKING_EVENT': EventType.BOOKING_REQUEST,
        'PAYMENT_EVENT': EventType.PAYMENT_RECEIVED,
    }
    return mapping.get(event_type, event_type)


def _build_config(
    event_type: str,
    actor,
    payload: dict,
) -> tuple[str, str]:
    """Return (title, body) for a given event + actor + payload."""
    name = actor.first_name or actor.username if actor else 'Mtu'

    configs = {
        EventType.LIKE: (
            f'❤️ {name} amependa moment yako!',
            payload.get('moment_caption', 'Moment yako imependwa')[:80],
        ),
        EventType.FOLLOW: (
            f'👤 {name} anakufuata!',
            'Mtu mpya amejiunga na safari yako 🌍',
        ),
        EventType.SOS_RESPONSE: (
            f'🆘 {name} anajibu SOS yako!',
            payload.get('message', 'Mtu anakusaidia — angalia sasa!')[:80],
        ),
        EventType.BOOKING_REQUEST: (
            f'📅 Ombi jipya la booking kutoka {name}',
            payload.get('experience_title', 'Uzoefu wako umepata ombi')[:80],
        ),
        EventType.BOOKING_CONFIRMED: (
            '✅ Booking yako imethibitishwa!',
            payload.get('experience_title', 'Safari yako ipo tayari')[:80],
        ),
        EventType.BOOKING_COMPLETED: (
            '🎉 Booking imekamilika!',
            'Tafadhali acha ukaguzi — safari ilikuwa nzuri!',
        ),
        EventType.PAYMENT_RECEIVED: (
            f'💰 Malipo yamepokelewa!',
            f"TZS {payload.get('amount', '—')} imeingizwa kwenye akaunti yako",
        ),
        EventType.BADGE_UNLOCK: (
            f"🏆 Beji mpya! {payload.get('badge_icon', '')} {payload.get('badge_name', '')}",
            f"Umepata \"{payload.get('badge_name', '')}\" 🏆",
        ),
        EventType.POINTS_AWARDED: (
            f"⭐ Pointi +{payload.get('points', 0)}!",
            payload.get('description', 'Hongera, umepata pointi!'),
        ),
        EventType.TIP_VERIFIED: (
            '✓ Tip yako imethibitishwa!',
            f"\"{payload.get('tip_title', 'Tip')}\" imethibitishwa na admin.",
        ),
        EventType.NEW_MESSAGE: (
            f'💬 Ujumbe mpya kutoka {name}',
            payload.get('preview', 'Una ujumbe mpya')[:80],
        ),
        EventType.SUBSCRIPTION_EXPIRING: (
            '⏰ Usajili wako unakaribia kumalizika!',
            f"Siku {payload.get('days_left', 3)} zimebaki — fanya upya sasa",
        ),
        EventType.SHOWCASE_ORDER: (
            f'🛍️ Oda mpya kutoka {name}!',
            payload.get('item_name', 'Bidhaa yako imeuuzwa')[:80],
        ),
        EventType.SHOWCASE_DELIVERED: (
            '📦 Oda imefika!',
            payload.get('item_name', 'Oda yako imefika')[:80],
        ),
        EventType.LEVEL_UP: (
            f"🚀 Umepanda kiwango! → {payload.get('new_level', '')}",
            f"Hongera! Uko {payload.get('new_level', '')} sasa na pointi {payload.get('points', 0)}!",
        ),
        EventType.REVIEW_RECEIVED: (
            f'⭐ Ukaguzi mpya kutoka {name}!',
            payload.get('review_text', 'Angalia ukaguzi wako mpya')[:80],
        ),
    }

    return configs.get(event_type, (f'🔔 Taarifa mpya kutoka {name}', ''))


def notify_event(type: str, actor, target, payload: dict = None) -> None:
    """
    Unified entry point.
    1. Saves notification in DB.
    2. Enqueues delivery Celery task.
    3. Handles WebSocket emission.
    4. Handles Firebase push delivery.
    """
    if actor is not None and target is not None and actor.id == target.id:
        # Prevent self-notification
        return

    payload = payload or {}
    mapped_type = map_event_type(str(type))

    try:
        title, body = _build_config(mapped_type, actor, payload)

        from apps.notifications.models import Notification
        from apps.notifications.tasks import send_notification_task

        # 1. Save notification in DB
        notif = Notification.objects.create(
            recipient=target,
            sender=actor,
            notification_type=mapped_type,
            title=title,
            body=body,
            data=payload,
        )

        # Invalidate unread cache
        from django.core.cache import cache
        cache.delete(f"user_unread_count:{target.id}")

        # 2-4. Send Celery task to handle WS broadcast + FCM push asynchronously
        send_notification_task.delay(notification_id=notif.id)

    except Exception as e:
        logger.exception(f"[EventDispatcher] notify_event failed for {mapped_type}: {e}")
        # Fallback to sync delivery
        _sync_fallback(mapped_type, actor, target, payload)


def dispatch_event(
    event_type: Any,
    actor,
    target,
    payload: dict[str, Any] | None = None,
    *,
    title: str | None = None,
    body: str | None = None,
) -> None:
    """
    Legacy wrapper delegating to notify_event.
    """
    notify_event(str(event_type), actor, target, payload)


def _sync_fallback(event_type, actor, target, payload):
    """Synchronous fallback when Celery is down."""
    from apps.notifications.utils import create_notification
    auto_title, auto_body = _build_config(event_type, actor, payload)
    create_notification(
        recipient=target,
        sender=actor,
        notification_type=str(event_type),
        title=auto_title,
        body=auto_body,
        data=payload,
    )
