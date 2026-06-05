from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Count
from .models import Report, ModerationAction
from .services import (
    create_report,
    moderate_report,
    bulk_moderate,
    get_moderation_queue,
    get_moderation_stats,
)
from core.permissions import IsAdmin


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_report_view(request):
    """Create a new moderation report"""
    content_type = request.data.get('content_type')
    content_id = request.data.get('content_id')
    reason = request.data.get('reason')
    description = request.data.get('description')
    evidence_urls = request.data.get('evidence_urls', [])
    
    # Validate content owner
    content_owner = None
    if content_type == 'MOMENT':
        from apps.moments.models import Moment
        try:
            moment = Moment.objects.get(id=content_id)
            content_owner = moment.posted_by
        except Moment.DoesNotExist:
            return Response({'message': 'Moment not found'}, status=404)
    elif content_type == 'TIP':
        from apps.map_tips.models import Tip
        try:
            tip = Tip.objects.get(id=content_id)
            content_owner = tip.created_by
        except Tip.DoesNotExist:
            return Response({'message': 'Tip not found'}, status=404)
    elif content_type == 'EXPERIENCE':
        from apps.experiences.models import Experience
        try:
            exp = Experience.objects.get(id=content_id)
            content_owner = exp.local
        except Experience.DoesNotExist:
            return Response({'message': 'Experience not found'}, status=404)
    elif content_type == 'USER':
        from apps.accounts.models import User
        try:
            content_owner = User.objects.get(id=content_id)
        except User.DoesNotExist:
            return Response({'message': 'User not found'}, status=404)
    
    # Prevent self-reporting
    if content_owner == request.user:
        return Response({'message': 'Cannot report yourself'}, status=400)
    
    report = create_report(
        reporter=request.user,
        content_type=content_type,
        content_id=content_id,
        reason=reason,
        description=description,
        evidence_urls=evidence_urls,
        content_owner=content_owner,
    )
    
    return Response({
        'id': report.id,
        'status': report.status,
        'created_at': report.created_at.isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def moderation_queue_view(request):
    """Get moderation queue for admins"""
    status_filter = request.query_params.get('status')
    limit = int(request.query_params.get('limit', 50))
    
    # Pagination validation
    MAX_LIMIT = 100
    limit = min(max(limit, 1), MAX_LIMIT)  # Clamp between 1 and 100
    
    reports = get_moderation_queue(status_filter, limit)
    
    data = []
    for report in reports:
        data.append({
            'id': report.id,
            'content_type': report.content_type,
            'content_id': report.content_id,
            'reason': report.reason,
            'description': report.description,
            'status': report.status,
            'priority': report.priority,
            'reporter': {
                'id': report.reporter.id,
                'username': report.reporter.username,
            } if report.reporter else None,
            'content_owner': {
                'id': report.content_owner.id,
                'username': report.content_owner.username,
            } if report.content_owner else None,
            'moderator': {
                'id': report.moderator.id,
                'username': report.moderator.username,
            } if report.moderator else None,
            'created_at': report.created_at.isoformat(),
            'reviewed_at': report.reviewed_at.isoformat() if report.reviewed_at else None,
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def moderation_stats_view(request):
    """Get moderation statistics"""
    stats = get_moderation_stats()
    return Response(stats)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def moderate_report_view(request, report_id):
    """Take moderation action on a report"""
    action = request.data.get('action')
    reason = request.data.get('reason')
    notes = request.data.get('notes', '')
    
    valid_actions = ['APPROVE', 'REJECT', 'HIDE', 'DELETE', 'FEATURE', 'RESTORE']
    if action not in valid_actions:
        return Response({'message': f'Invalid action. Must be one of: {valid_actions}'}, status=400)
    
    try:
        report = moderate_report(
            report_id=report_id,
            moderator=request.user,
            action=action,
            reason=reason,
            notes=notes,
            request=request,
        )
        
        return Response({
            'id': report.id,
            'status': report.status,
            'action_taken': report.action_taken,
            'moderated_at': report.resolved_at.isoformat() if report.resolved_at else None,
        })
    except Report.DoesNotExist:
        return Response({'message': 'Report not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdmin])
def bulk_moderate_view(request):
    """Take bulk moderation action on multiple reports"""
    report_ids = request.data.get('report_ids', [])
    action = request.data.get('action')
    reason = request.data.get('reason')
    notes = request.data.get('notes', '')
    
    valid_actions = ['APPROVE', 'REJECT', 'HIDE', 'DELETE', 'FEATURE', 'RESTORE']
    if action not in valid_actions:
        return Response({'message': f'Invalid action. Must be one of: {valid_actions}'}, status=400)
    
    if not report_ids:
        return Response({'message': 'No report IDs provided'}, status=400)
    
    updated_reports = bulk_moderate(
        report_ids=report_ids,
        moderator=request.user,
        action=action,
        reason=reason,
        notes=notes,
        request=request,
    )
    
    return Response({
        'count': len(updated_reports),
        'action': action,
        'report_ids': [r.id for r in updated_reports],
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def moderation_history_view(request):
    """Get moderation action history"""
    limit = int(request.query_params.get('limit', 100))
    moderator_id = request.query_params.get('moderator_id')
    
    # Pagination validation
    MAX_LIMIT = 200
    limit = min(max(limit, 1), MAX_LIMIT)  # Clamp between 1 and 200
    
    actions = ModerationAction.objects.select_related('moderator', 'target_user', 'report')
    
    if moderator_id:
        actions = actions.filter(moderator_id=moderator_id)
    
    actions = actions.order_by('-created_at')[:limit]
    
    data = []
    for action in actions:
        data.append({
            'id': action.id,
            'action_type': action.action_type,
            'content_type': action.content_type,
            'content_id': action.content_id,
            'moderator': {
                'id': action.moderator.id,
                'username': action.moderator.username,
            } if action.moderator else None,
            'target_user': {
                'id': action.target_user.id,
                'username': action.target_user.username,
            } if action.target_user else None,
            'reason': action.reason,
            'notes': action.notes,
            'report_id': action.report.id if action.report else None,
            'created_at': action.created_at.isoformat(),
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_reports_view(request):
    """Get reports created by the current user"""
    reports = Report.objects.filter(
        reporter=request.user
    ).select_related('moderator', 'content_owner').order_by('-created_at')[:50]
    
    data = []
    for report in reports:
        data.append({
            'id': report.id,
            'content_type': report.content_type,
            'content_id': report.content_id,
            'reason': report.reason,
            'description': report.description,
            'status': report.status,
            'moderator': {
                'id': report.moderator.id,
                'username': report.moderator.username,
            } if report.moderator else None,
            'moderator_notes': report.moderator_notes,
            'created_at': report.created_at.isoformat(),
            'resolved_at': report.resolved_at.isoformat() if report.resolved_at else None,
        })
    
    return Response(data)
