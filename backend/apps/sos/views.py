from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Avg, Count
from .models import SOSAlert, SOSResponse
from core.permissions import IsAdmin


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_alerts_view(request):
    alerts = SOSAlert.objects.filter(
        user=request.user
    ).order_by('-created_at')[:20]
    data = [
        {
            'id': a.id,
            'latitude': a.latitude,
            'longitude': a.longitude,
            'severity': a.severity,
            'status': a.status,
            'message': a.message,
            'responder_count': a.responder_count,
            'priority': a.priority,
            'first_response_at': a.first_response_at.isoformat() if a.first_response_at else None,
            'avg_response_time_minutes': a.avg_response_time_minutes,
            'created_at': a.created_at.isoformat(),
            'resolved_at': (
                a.resolved_at.isoformat() if a.resolved_at else None
            ),
            'escalated_at': a.escalated_at.isoformat() if a.escalated_at else None,
        }
        for a in alerts
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_alerts_view(request):
    """For LOCAL_GUIDE — see all active SOS nearby"""
    alerts = SOSAlert.objects.filter(
        status__in=('ACTIVE', 'RESPONDING', 'ESCALATED')
    ).select_related('user', 'user__profile').order_by('-created_at')

    data = []
    for a in alerts:
        profile = getattr(a.user, 'profile', None)
        data.append({
            'id': a.id,
            'user': {
                'id': a.user.id,
                'username': a.user.username,
                'first_name': a.user.first_name,
                'avatar': (
                    profile.avatar.url
                    if profile and profile.avatar
                    else None
                ),
            },
            'latitude': a.latitude,
            'longitude': a.longitude,
            'location_address': a.location_address,
            'severity': a.severity,
            'status': a.status,
            'message': a.message,
            'responder_count': a.responder_count,
            'priority': a.priority,
            'created_at': a.created_at.isoformat(),
            'escalated_at': a.escalated_at.isoformat() if a.escalated_at else None,
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistics_view(request):
    from django.utils import timezone
    today = timezone.now().date()
    return Response({
        'active_count': SOSAlert.objects.filter(status='ACTIVE').count(),
        'responding_count': SOSAlert.objects.filter(status='RESPONDING').count(),
        'escalated_count': SOSAlert.objects.filter(status='ESCALATED').count(),
        'resolved_today': SOSAlert.objects.filter(
            status='RESOLVED',
            resolved_at__date=today,
        ).count(),
        'total': SOSAlert.objects.count(),
        'avg_response_time_minutes': SOSAlert.objects.filter(
            avg_response_time_minutes__isnull=False
        ).aggregate(avg=Avg('avg_response_time_minutes'))['avg'] or 0,
    })


# ════════════════════════════════════════════════════════════════════════════
# ADMIN SOS OPERATIONS
# ════════════════════════════════════════════════════════════════════════════

@api_view(['PUT'])
@permission_classes([IsAdmin])
def admin_resolve_sos_view(request, alert_id):
    """Admin override to resolve an SOS alert"""
    reason = request.data.get('reason', 'Admin override')
    
    try:
        alert = SOSAlert.objects.get(id=alert_id)
        alert.transition_to('RESOLVED', actor=request.user, reason=reason)
        return Response({'success': True, 'status': 'RESOLVED'})
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)
    except ValueError as e:
        return Response({'message': str(e)}, status=400)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def admin_cancel_sos_view(request, alert_id):
    """Admin override to cancel an SOS alert"""
    reason = request.data.get('reason', 'Admin override')
    
    try:
        alert = SOSAlert.objects.get(id=alert_id)
        alert.transition_to('CANCELLED', actor=request.user, reason=reason)
        return Response({'success': True, 'status': 'CANCELLED'})
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)
    except ValueError as e:
        return Response({'message': str(e)}, status=400)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def admin_escalate_sos_view(request, alert_id):
    """Admin escalate an SOS alert"""
    reason = request.data.get('reason', 'Admin escalation')
    
    try:
        alert = SOSAlert.objects.get(id=alert_id)
        alert.transition_to('ESCALATED', actor=request.user, reason=reason)
        return Response({'success': True, 'status': 'ESCALATED'})
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)
    except ValueError as e:
        return Response({'message': str(e)}, status=400)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def admin_set_priority_view(request, alert_id):
    """Admin set priority for an SOS alert"""
    priority = int(request.data.get('priority', 5))
    
    if priority < 1 or priority > 10:
        return Response({'message': 'Priority must be between 1 and 10'}, status=400)
    
    try:
        alert = SOSAlert.objects.get(id=alert_id)
        alert.priority = priority
        alert.save(update_fields=['priority'])
        
        # Audit log
        from apps.admin_ops.services import log_sos_action
        log_sos_action(
            actor=request.user,
            action_type='SOS_PRIORITY_CHANGE',
            alert_id=alert.id,
            target_user=alert.user,
            reason=f'Priority set to {priority}',
        )
        
        return Response({'success': True, 'priority': priority})
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_all_alerts_view(request):
    """Admin view all SOS alerts with filtering"""
    status_filter = request.query_params.get('status')
    severity_filter = request.query_params.get('severity')
    limit = int(request.query_params.get('limit', 50))
    
    # Pagination validation
    MAX_LIMIT = 100
    limit = min(max(limit, 1), MAX_LIMIT)  # Clamp between 1 and 100
    
    alerts = SOSAlert.objects.select_related('user', 'user__profile').order_by('-created_at')
    
    if status_filter:
        alerts = alerts.filter(status=status_filter)
    if severity_filter:
        alerts = alerts.filter(severity=severity_filter)
    
    data = []
    for a in alerts[:limit]:
        profile = getattr(a.user, 'profile', None)
        data.append({
            'id': a.id,
            'user': {
                'id': a.user.id,
                'username': a.user.username,
                'first_name': a.user.first_name,
                'avatar': (
                    profile.avatar.url
                    if profile and profile.avatar
                    else None
                ),
            },
            'latitude': a.latitude,
            'longitude': a.longitude,
            'location_address': a.location_address,
            'severity': a.severity,
            'status': a.status,
            'message': a.message,
            'responder_count': a.responder_count,
            'priority': a.priority,
            'created_at': a.created_at.isoformat(),
            'resolved_at': a.resolved_at.isoformat() if a.resolved_at else None,
            'escalated_at': a.escalated_at.isoformat() if a.escalated_at else None,
            'admin_override_by': a.admin_override_by.username if a.admin_override_by else None,
            'admin_override_reason': a.admin_override_reason,
        })
    
    return Response(data)


# ════════════════════════════════════════════════════════════════════════════
# GEOSPATIAL QUERIES
# ════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nearby_guides_view(request):
    """Find nearby guides for a given location"""
    lat = float(request.query_params.get('latitude'))
    lon = float(request.query_params.get('longitude'))
    radius_km = float(request.query_params.get('radius_km', 10))
    
    # Simple bounding box query (can be enhanced with proper geospatial)
    # 1 degree ≈ 111 km
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * abs(lat) if lat != 0 else 111.0)
    
    from apps.accounts.models import User
    from apps.accounts.models import UserProfile
    
    guides = User.objects.filter(
        role='LOCAL_GUIDE',
        is_active=True,
        is_verified=True
    ).select_related('profile')
    
    nearby_guides = []
    for guide in guides:
        if hasattr(guide, 'profile') and guide.profile.location:
            # This is simplified - in production use PostGIS
            # For now, we'll return all verified guides
            nearby_guides.append({
                'id': guide.id,
                'username': guide.username,
                'first_name': guide.first_name,
                'avatar': (
                    guide.profile.avatar.url
                    if guide.profile.avatar
                    else None
                ),
                'location': guide.profile.location,
                'is_verified': guide.is_verified,
            })
    
    return Response({
        'latitude': lat,
        'longitude': lon,
        'radius_km': radius_km,
        'guides': nearby_guides[:20],  # Limit results
    })