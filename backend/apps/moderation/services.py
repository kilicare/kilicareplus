from django.db import transaction
from django.utils import timezone
from .models import Report, ModerationAction


def create_report(
    reporter,
    content_type: str,
    content_id: int,
    reason: str,
    description: str,
    evidence_urls: list = None,
    content_owner=None,
):
    """
    Create a new moderation report.
    """
    report = Report.objects.create(
        reporter=reporter,
        content_type=content_type,
        content_id=content_id,
        content_owner=content_owner,
        reason=reason,
        description=description,
        evidence_urls=evidence_urls or [],
    )
    return report


def moderate_report(
    report_id: int,
    moderator,
    action: str,
    reason: str,
    notes: str = None,
    request=None,
):
    """
    Take moderation action on a report with audit logging.
    """
    report = Report.objects.get(id=report_id)
    
    # Update report status based on action
    action_to_status = {
        'APPROVE': 'APPROVED',
        'REJECT': 'REJECTED',
        'HIDE': 'HIDDEN',
        'DELETE': 'DELETED',
        'FEATURE': 'FEATURED',
        'RESTORE': 'RESTORED',
    }
    
    report.status = action_to_status.get(action, report.status)
    report.moderator = moderator
    report.moderator_notes = notes or reason
    report.action_taken = action
    report.reviewed_at = timezone.now()
    report.resolved_at = timezone.now()
    report.save()
    
    # Log moderation action
    from apps.admin_ops.services import get_client_ip, get_client_user_agent
    ModerationAction.objects.create(
        report=report,
        moderator=moderator,
        action_type=action,
        content_type=report.content_type,
        content_id=report.content_id,
        target_user=report.content_owner,
        reason=reason,
        notes=notes or '',
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_client_user_agent(request) if request else None,
    )
    
    # Notify content owner if action taken
    if report.content_owner and action in ['HIDE', 'DELETE', 'FEATURE']:
        from apps.notifications.event_dispatcher import notify_event
        notify_event(
            type='MODERATION_ACTION',
            actor=moderator,
            target=report.content_owner,
            payload={
                'content_type': report.content_type,
                'content_id': report.content_id,
                'action': action,
                'reason': reason,
            },
        )
    
    return report


def bulk_moderate(
    report_ids: list,
    moderator,
    action: str,
    reason: str,
    notes: str = None,
    request=None,
):
    """
    Take bulk moderation action on multiple reports.
    """
    from apps.admin_ops.services import get_client_ip, get_client_user_agent
    
    action_to_status = {
        'APPROVE': 'APPROVED',
        'REJECT': 'REJECTED',
        'HIDE': 'HIDDEN',
        'DELETE': 'DELETED',
        'FEATURE': 'FEATURED',
        'RESTORE': 'RESTORED',
    }
    
    updated_reports = []
    for report_id in report_ids:
        try:
            report = Report.objects.get(id=report_id)
            report.status = action_to_status.get(action, report.status)
            report.moderator = moderator
            report.moderator_notes = notes or reason
            report.action_taken = action
            report.reviewed_at = timezone.now()
            report.resolved_at = timezone.now()
            report.save()
            updated_reports.append(report)
            
            # Log moderation action
            ModerationAction.objects.create(
                report=report,
                moderator=moderator,
                action_type=action,
                content_type=report.content_type,
                content_id=report.content_id,
                target_user=report.content_owner,
                reason=reason,
                notes=notes or '',
                ip_address=get_client_ip(request) if request else None,
                user_agent=get_client_user_agent(request) if request else None,
            )
        except Report.DoesNotExist:
            continue
    
    return updated_reports


def get_moderation_queue(status_filter: str = None, limit: int = 50):
    """
    Get moderation queue with optional status filter.
    """
    reports = Report.objects.select_related('reporter', 'content_owner', 'moderator')
    
    if status_filter:
        reports = reports.filter(status=status_filter)
    else:
        reports = reports.filter(status__in=['PENDING', 'UNDER_REVIEW'])
    
    return reports.order_by('priority', '-created_at')[:limit]


def get_moderation_stats():
    """
    Get moderation statistics.
    """
    return {
        'pending': Report.objects.filter(status='PENDING').count(),
        'under_review': Report.objects.filter(status='UNDER_REVIEW').count(),
        'approved': Report.objects.filter(status='APPROVED').count(),
        'rejected': Report.objects.filter(status='REJECTED').count(),
        'hidden': Report.objects.filter(status='HIDDEN').count(),
        'deleted': Report.objects.filter(status='DELETED').count(),
        'featured': Report.objects.filter(status='FEATURED').count(),
        'total': Report.objects.count(),
    }
