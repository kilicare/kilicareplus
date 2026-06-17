import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Avg, Count, F
from django.db import transaction
from .models import SOSAlert, SOSResponse
from .serializers import SOSAlertSerializer, SOSResponseSerializer, SOSAlertListSerializer
from .permissions import IsTourist, IsLocalGuide
from core.permissions import IsAdmin

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTourist])
def my_alerts_view(request):
    """Get tourist's own SOS alerts with optional responses."""
    include_responses = request.query_params.get('include_responses', 'false').lower() == 'true'
    
    # Get all alerts for this tourist, ordered by most recent
    alerts = SOSAlert.objects.filter(
        user=request.user
    ).select_related('user', 'user__profile', 'chat_room').prefetch_related('responses__responder__profile').order_by('-created_at')
    
    if include_responses:
        serializer = SOSAlertSerializer(alerts, many=True)
    else:
        serializer = SOSAlertListSerializer(alerts, many=True)
    
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_alerts_view(request):
    """For LOCAL_GUIDE and ADMIN — see all active SOS nearby (distance filtered for guides)"""
    # Allow ADMIN and LOCAL_GUIDE to access this endpoint
    if request.user.role not in ('LOCAL_GUIDE', 'ADMIN'):
        return Response({'message': 'Permission denied'}, status=403)
    
    if request.user.role == 'ADMIN':
        # Admins see all active alerts without distance filtering
        alerts = SOSAlert.objects.filter(
            status__in=('ACTIVE', 'RESPONDING', 'ESCALATED')
        ).select_related('user', 'user__profile', 'chat_room').order_by('-created_at')
    else:
        # Guides see nearby alerts with distance filtering
        alerts = SOSAlert.objects.filter(
            status__in=('ACTIVE', 'RESPONDING', 'ESCALATED')
        ).select_related('user', 'user__profile', 'chat_room').order_by('-created_at')

    data = []
    for a in alerts:
        profile = getattr(a.user, 'profile', None)
        
        # Calculate distance if guide has location
        distance_km = None
        guide_lat = None
        guide_lng = None
        if hasattr(request.user, 'profile') and hasattr(request.user.profile, 'latitude') and hasattr(request.user.profile, 'longitude'):
            guide_lat = request.user.profile.latitude
            guide_lng = request.user.profile.longitude
        if request.user.role == 'LOCAL_GUIDE' and guide_lat and guide_lng:
            from .consumers import haversine_km
            distance_km = haversine_km(
                guide_lat,
                guide_lng,
                a.latitude,
                a.longitude
            )
            # Only include alerts within 10km for guides
            if distance_km > 10:
                continue
        
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
            'distance_km': round(distance_km, 2) if distance_km else None,
            'created_at': a.created_at.isoformat(),
            'escalated_at': a.escalated_at.isoformat() if a.escalated_at else None,
            'chat_room_name': a.chat_room.name if a.chat_room else None,
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


# ════════════════════════════════════════════════════════════════════════════
# RESPONSE AND CHAT INTEGRATION
# ════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alert_responses_view(request, alert_id):
    """Get all responses for a specific SOS alert."""
    try:
        alert = SOSAlert.objects.select_related('user', 'chat_room').get(id=alert_id)
        
        # Check permission: tourist can only see their own alerts, guides can see any
        if request.user.role == 'TOURIST' and alert.user != request.user:
            return Response({'message': 'Permission denied'}, status=403)
        
        responses = SOSResponse.objects.filter(
            alert=alert
        ).select_related('responder__profile', 'alert__chat_room').order_by('created_at')
        
        serializer = SOSResponseSerializer(responses, many=True)
        return Response(serializer.data)
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alert_chat_room_view(request, alert_id):
    """Get or create chat room for an SOS alert."""
    try:
        alert = SOSAlert.objects.select_related('user', 'chat_room').get(id=alert_id)
        
        # Check permission: tourist can only access their own alerts, guides can access any
        if request.user.role == 'TOURIST' and alert.user != request.user:
            return Response({'message': 'Permission denied'}, status=403)
        
        # If chat room already exists, return it with latest messages
        if alert.chat_room:
            from apps.messaging.models import Message
            # Get latest 5 messages for preview
            messages = Message.objects.filter(
                room=alert.chat_room
            ).select_related('sender', 'sender__profile').order_by('-timestamp')[:5]
            
            # Get unread count
            unread_count = Message.objects.filter(
                room=alert.chat_room,
                is_read=False
            ).exclude(sender=request.user).count()
            
            messages_data = []
            for msg in reversed(messages):
                messages_data.append({
                    'id': msg.id,
                    'content': msg.content,
                    'sender_id': msg.sender.id,
                    'sender_username': msg.sender.username,
                    'sender_first_name': msg.sender.first_name,
                    'sender_avatar': (
                        msg.sender.profile.avatar.url
                        if hasattr(msg.sender, 'profile') and msg.sender.profile.avatar
                        else None
                    ),
                    'timestamp': msg.timestamp.isoformat(),
                    'is_read': msg.is_read,
                })
            
            return Response({
                'room_name': alert.chat_room.name,
                'exists': True,
                'messages': messages_data,
                'unread_count': unread_count,
            })
        
        # If no responses yet, no chat room exists
        return Response({
            'room_name': None,
            'exists': False,
            'message': 'Chat room will be created when a guide responds',
        })
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alert_timeline_view(request, alert_id):
    """Get structured event timeline for an SOS alert."""
    try:
        alert = SOSAlert.objects.select_related('user').get(id=alert_id)
        
        # Check permission: tourist can only see their own alerts, guides can see any
        if request.user.role == 'TOURIST' and alert.user != request.user:
            return Response({'message': 'Permission denied'}, status=403)
        
        from .services import SOSEventService
        timeline = SOSEventService.get_timeline(alert_id)
        
        return Response({
            'alert_id': alert_id,
            'timeline': timeline,
        })
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)