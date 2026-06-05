from django.db import transaction
from django.utils import timezone
from .models import AuditLog


def log_audit(
    actor,
    action_type: str,
    action_description: str,
    target_user=None,
    before_state: dict = None,
    after_state: dict = None,
    reason: str = None,
    metadata: dict = None,
    ip_address: str = None,
    user_agent: str = None,
) -> AuditLog:
    """
    Create an immutable audit log entry for critical system actions.
    
    Args:
        actor: User performing the action
        action_type: Type of action (from AuditLog.ACTION_CHOICES)
        action_description: Human-readable description
        target_user: User affected by the action (if applicable)
        before_state: State before action (JSON-serializable)
        after_state: State after action (JSON-serializable)
        reason: Reason for the action
        metadata: Additional context (JSON-serializable)
        ip_address: IP address of the actor
        user_agent: User agent string
    
    Returns:
        AuditLog instance
    """
    return AuditLog.objects.create(
        actor=actor,
        target_user=target_user,
        action_type=action_type,
        action_description=action_description,
        before_state=before_state or {},
        after_state=after_state or {},
        reason=reason or '',
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent or '',
    )


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_client_user_agent(request):
    """Extract user agent from request."""
    return request.META.get('HTTP_USER_AGENT', '')[:500]  # Limit length


def log_role_change(actor, target_user, old_role, new_role, reason=None, request=None):
    """Log role change action."""
    return log_audit(
        actor=actor,
        action_type='ROLE_CHANGE',
        action_description=f'Changed role from {old_role} to {new_role}',
        target_user=target_user,
        before_state={'role': old_role},
        after_state={'role': new_role},
        reason=reason,
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_client_user_agent(request) if request else None,
    )


def log_points_award(actor, target_user, points_change, balance_after, reason=None, request=None):
    """Log points award action."""
    return log_audit(
        actor=actor,
        action_type='POINTS_AWARD',
        action_description=f'Awarded {points_change} points',
        target_user=target_user,
        before_state={'points_change': points_change},
        after_state={'balance_after': balance_after},
        reason=reason,
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_client_user_agent(request) if request else None,
    )


def log_user_suspension(actor, target_user, is_active, reason=None, request=None):
    """Log user suspension/activation action."""
    action_type = 'USER_SUSPENSION' if not is_active else 'USER_ACTIVATION'
    action_description = 'Suspended user' if not is_active else 'Activated user'
    return log_audit(
        actor=actor,
        action_type=action_type,
        action_description=action_description,
        target_user=target_user,
        before_state={'is_active': not is_active},
        after_state={'is_active': is_active},
        reason=reason,
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_client_user_agent(request) if request else None,
    )


def log_sos_action(actor, action_type, alert_id, target_user=None, reason=None, request=None):
    """Log SOS-related actions."""
    return log_audit(
        actor=actor,
        action_type=action_type,
        action_description=f'SOS action on alert {alert_id}',
        target_user=target_user,
        metadata={'alert_id': alert_id},
        reason=reason,
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_client_user_agent(request) if request else None,
    )


def log_moderation_action(actor, action_type, target_content_type, target_content_id, target_user=None, reason=None, request=None):
    """Log moderation actions."""
    return log_audit(
        actor=actor,
        action_type=action_type,
        action_description=f'Moderation action on {target_content_type} {target_content_id}',
        target_user=target_user,
        metadata={
            'content_type': target_content_type,
            'content_id': target_content_id,
        },
        reason=reason,
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_client_user_agent(request) if request else None,
    )
