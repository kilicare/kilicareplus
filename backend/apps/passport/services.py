from django.utils import timezone
import qrcode
import io
import base64
import logging
from django.conf import settings
from .models import PassportProfile, PointsTransaction, Badge, UserBadge

logger = logging.getLogger(__name__)

POINT_ACTIONS = {
    'POST_MOMENT':           5,
    'GET_LIKE':              1,
    'CREATE_TIP':            10,
    'TIP_UPVOTED':           2,
    'TIP_VERIFIED':          15,
    'CREATE_EXPERIENCE':     20,
    'BOOKING_COMPLETED':     25,
    'RECEIVE_5STAR_REVIEW':  30,
    'SOS_RESPONSE':          20,
    'FOLLOW_RECEIVED':       2,
    'BADGE_UNLOCK':          10,
    'SHOWCASE_SALE':         15,
    'ADMIN_AWARD':           0,
    'LEVEL_UP':              50,
}

BADGES_SEED = [
    {
        'name': 'Karibu Tanzania',
        'description': 'Jiunge na KilicareGO+ familia',
        'icon': '🌍',
        'criteria_points': 50,
        'badge_type': 'MILESTONE',
    },
    {
        'name': 'Mpigapicha',
        'description': 'Chapisha Moment yako ya kwanza',
        'icon': '📸',
        'criteria_points': 100,
        'badge_type': 'ACHIEVEMENT',
    },
    {
        'name': 'Mzungumzaji',
        'description': 'Tuma ujumbe 10',
        'icon': '💬',
        'criteria_points': 150,
        'badge_type': 'ACHIEVEMENT',
    },
    {
        'name': 'Mhifadhi',
        'description': 'Chapisha tip ya kwanza',
        'icon': '🛡️',
        'criteria_points': 200,
        'badge_type': 'ACHIEVEMENT',
    },
    {
        'name': 'Mwelekezi',
        'description': 'Wageuze watu 5 wafuate',
        'icon': '📍',
        'criteria_points': 300,
        'badge_type': 'ACHIEVEMENT',
    },
    {
        'name': 'Mwenza',
        'description': 'Jibu SOS ya kwanza',
        'icon': '🤝',
        'criteria_points': 500,
        'badge_type': 'ACHIEVEMENT',
    },
    {
        'name': 'Mkurugenzi',
        'description': 'Chapisha uzoefu 3',
        'icon': '⭐',
        'criteria_points': 750,
        'badge_type': 'ACHIEVEMENT',
    },
    {
        'name': 'Mtaalam',
        'description': 'Pata pointi 1000',
        'icon': '🎯',
        'criteria_points': 1000,
        'badge_type': 'MILESTONE',
    },
    {
        'name': 'Msimamizi',
        'description': 'Pata pointi 5000',
        'icon': '👑',
        'criteria_points': 5000,
        'badge_type': 'MILESTONE',
    },
    {
        'name': 'Msimamizi Mkuu',
        'description': 'Pata pointi 10000 — hadithi ya kweli!',
        'icon': '🔥',
        'criteria_points': 10000,
        'badge_type': 'SPECIAL',
    },
]


def seed_badges():
    for b in BADGES_SEED:
        Badge.objects.get_or_create(
            name=b['name'], defaults=b
        )
    print(f'✅ Badges seeded: {Badge.objects.count()}')


def generate_qr_code(passport):
    """Generate QR code for passport"""
    if passport.qr_code:
        return passport.qr_code
    
    # Create QR code data
    qr_data = f"KGO-{passport.user.id:06d}|{passport.user.username}|{passport.level}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Convert to base64
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Save to passport
    passport.qr_code = qr_base64
    passport.save(update_fields=['qr_code'])
    
    return qr_base64


def award_achievement_stamp(user, stamp_type: str, metadata: dict = None):
    """Award an achievement stamp to user's passport"""
    passport, _ = PassportProfile.objects.get_or_create(user=user)
    
    stamp = {
        'type': stamp_type,
        'awarded_at': timezone.now().isoformat(),
        'metadata': metadata or {},
    }
    
    # Check if stamp already exists
    if passport.achievement_stamps:
        for existing_stamp in passport.achievement_stamps:
            if existing_stamp.get('type') == stamp_type:
                return None  # Already has this stamp
    
    # Add stamp
    if not passport.achievement_stamps:
        passport.achievement_stamps = []
    passport.achievement_stamps.append(stamp)
    passport.save(update_fields=['achievement_stamps'])
    
    return stamp


def award_points_to_user(user, action_type: str, extra_pts: int = 0):
    """Award points, update level, check badge unlocks with validation"""
    # Validate action_type
    if action_type not in POINT_ACTIONS and action_type != 'ADMIN_AWARD':
        logger.warning(f"[Passport] Invalid action_type: {action_type} for user {user.id}")
        return None
    
    pts = POINT_ACTIONS.get(action_type, 0) + extra_pts
    if pts == 0 and action_type != 'ADMIN_AWARD':
        logger.warning(f"[Passport] Zero points for action: {action_type} for user {user.id}")
        return None

    # Prevent negative points from exploits
    if pts < 0 and action_type != 'ADMIN_AWARD':
        logger.warning(f"[Passport] Negative points attempt: {pts} for action {action_type} by user {user.id}")
        return None

    # Rate limiting: prevent spam actions (max 10 same actions per minute)
    from django.utils import timezone
    from datetime import timedelta
    one_minute_ago = timezone.now() - timedelta(minutes=1)
    recent_count = PointsTransaction.objects.filter(
        user=user,
        action_type=action_type,
        created_at__gte=one_minute_ago
    ).count()
    
    if recent_count >= 10 and action_type != 'ADMIN_AWARD':
        logger.warning(f"[Passport] Rate limited: {action_type} for user {user.id} (count: {recent_count})")
        return None  # Rate limited

    # Use atomic transaction for consistency
    from django.db import transaction
    with transaction.atomic():
        passport, _ = PassportProfile.objects.select_for_update().get_or_create(user=user)
        old_level   = passport.level
        old_points  = passport.points

        # Prevent negative balance
        if passport.points + pts < 0:
            logger.warning(f"[Passport] Negative balance prevented: user {user.id} has {passport.points}, tried to add {pts}")
            return None

        # Prevent duplicate transactions within 1 second
        very_recent = PointsTransaction.objects.filter(
            user=user,
            action_type=action_type,
            points_change=pts,
            created_at__gte=timezone.now() - timedelta(seconds=1)
        ).exists()
        
        if very_recent and action_type != 'ADMIN_AWARD':
            logger.warning(f"[Passport] Duplicate transaction prevented: {action_type} for user {user.id}")
            return None  # Duplicate prevention

        passport.points += pts
        passport.recalculate_level()

        # Save transaction
        txn = PointsTransaction.objects.create(
            user=user,
            action_type=action_type,
            points_change=pts,
            balance_after=passport.points,
            description=f'{action_type.replace("_", " ").title()} (+{pts} pts)',
        )

        logger.info(f"[Passport] Points awarded: user {user.id}, action {action_type}, change {pts}, new balance {passport.points}")

        # Level up notification via unified event dispatcher
        if passport.level != old_level:
            logger.info(f"[Passport] Level up: user {user.id} from {old_level} to {passport.level}")
            try:
                from apps.notifications.event_dispatcher import notify_event
                notify_event(
                    'LEVEL_UP',
                    actor=user,
                    target=user,
                    payload={
                        'new_level': passport.level,
                        'points': passport.points,
                    }
                )
            except Exception as e:
                logger.error(f"[Passport] Failed to send level up notification for user {user.id}: {e}")

        # Check and award badges
        _check_badge_unlocks(user, passport)

        return txn


def _check_badge_unlocks(user, passport):
    """Check if user qualifies for any new badges"""
    all_badges   = Badge.objects.all()
    user_badge_ids = set(
        UserBadge.objects.filter(user=user)
        .values_list('badge_id', flat=True)
    )

    for badge in all_badges:
        if badge.id in user_badge_ids:
            continue

        should_unlock = False

        # Points-based badges
        if badge.criteria_points > 0 and passport.points >= badge.criteria_points:
            should_unlock = True

        if should_unlock:
            user_badge, created = UserBadge.objects.get_or_create(user=user, badge=badge)
            if created:
                logger.info(f"[Passport] Badge unlocked: user {user.id}, badge {badge.name} ({badge.icon})")

                # Award badge points
                passport.points += POINT_ACTIONS.get('BADGE_UNLOCK', 10)
                passport.save(update_fields=['points'])

                # Add transaction
                PointsTransaction.objects.create(
                    user=user,
                    action_type='BADGE_UNLOCK',
                    points_change=10,
                    balance_after=passport.points,
                    description=f'Badge imefunguliwa: {badge.name} {badge.icon}',
                )

                # Badge unlock notification via unified event dispatcher
                try:
                    from apps.notifications.event_dispatcher import notify_event
                    notify_event(
                        'BADGE_UNLOCK',
                        actor=user,
                        target=user,
                        payload={
                            'badge_id': badge.id,
                            'badge_name': badge.name,
                            'badge_icon': badge.icon,
                        }
                    )
                except Exception as e:
                    logger.error(f"[Passport] Failed to send badge unlock notification for user {user.id}, badge {badge.name}: {e}")