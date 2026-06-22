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
    
    # SETTINGS GUARD: Check if SOS is enabled for this user
    from apps.settings.guards import require_feature_enabled
    require_feature_enabled(request.user, 'sos')
    
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
    
    # SETTINGS GUARD: Check if SOS is enabled for this user
    from apps.settings.guards import require_feature_enabled
    require_feature_enabled(request.user, 'sos')
    
    # Allow ADMIN and LOCAL_GUIDE to access this endpoint
    if request.user.role not in ('LOCAL_GUIDE', 'ADMIN'):
        return Response({'message': 'Permission denied'}, status=403)
    
    if request.user.role == 'ADMIN':
        # Admins see all active alerts without distance filtering
        alerts = SOSAlert.objects.filter(
            status__in=('WAITING_FOR_RESPONDER', 'ACTIVE', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'ESCALATED')
        ).select_related('user', 'user__profile', 'chat_room', 'primary_responder').prefetch_related('responses__responder__profile').order_by('-created_at')
    else:
        # Guides see nearby alerts with distance filtering
        alerts = SOSAlert.objects.filter(
            status__in=('WAITING_FOR_RESPONDER', 'ACTIVE', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'ESCALATED')
        ).select_related('user', 'user__profile', 'chat_room', 'primary_responder').prefetch_related('responses__responder__profile').order_by('-created_at')

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
        
        # Build responses array with responder details
        responses_data = []
        for response in a.responses.select_related('responder__profile').order_by('created_at'):
            responder_profile = getattr(response.responder, 'profile', None)
            responses_data.append({
                'id': response.id,
                'responder_id': response.responder.id,
                'responder_username': response.responder.username,
                'responder_first_name': response.responder.first_name,
                'responder_avatar': (
                    responder_profile.avatar.url
                    if responder_profile and responder_profile.avatar
                    else None
                ),
                'message': response.message,
                'eta_minutes': response.eta_minutes,
                'guide_status': response.guide_status,
                'is_primary': a.primary_responder_id == response.responder.id,
                'created_at': response.created_at.isoformat(),
            })
        
        # Get timeline data
        from .services import SOSEventService
        timeline_data = SOSEventService.get_timeline(a.id)
        
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
            'responses': responses_data,
            'timeline': timeline_data,
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistics_view(request):
    from django.utils import timezone
    today = timezone.now().date()
    return Response({
        'active': SOSAlert.objects.filter(status='ACTIVE').count(),
        'responding': SOSAlert.objects.filter(status__in=['ASSIGNED', 'ON_THE_WAY', 'ARRIVED']).count(),
        'escalated': SOSAlert.objects.filter(status='ESCALATED').count(),
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
        alert = SOSAlert.objects.select_for_update().get(id=alert_id)
        
        # Use IncidentStateService for state change
        from .services import IncidentStateService
        IncidentStateService.set_resolved_state(alert, actor=request.user, reason=reason)
        
        # Create ADMIN_INTERVENTION event
        from .services import SOSEventService
        SOSEventService.create_event(
            alert=alert,
            event_type='ADMIN_INTERVENTION',
            actor=request.user,
            data={
                'action': 'resolve',
                'reason': reason,
            }
        )
        
        # Also create SOS_RESOLVED event for state change
        SOSEventService.create_event(
            alert=alert,
            event_type='SOS_RESOLVED',
            actor=request.user,
            data={
                'admin_intervention': True,
                'reason': reason,
            }
        )
        
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
        alert = SOSAlert.objects.select_for_update().get(id=alert_id)
        
        # Use IncidentStateService for state change
        from .services import IncidentStateService
        IncidentStateService.set_cancelled_state(alert, actor=request.user, reason=reason)
        
        # Create ADMIN_INTERVENTION event
        from .services import SOSEventService
        SOSEventService.create_event(
            alert=alert,
            event_type='ADMIN_INTERVENTION',
            actor=request.user,
            data={
                'action': 'cancel',
                'reason': reason,
            }
        )
        
        # Also create SOS_CANCELLED event for state change
        SOSEventService.create_event(
            alert=alert,
            event_type='SOS_CANCELLED',
            actor=request.user,
            data={
                'admin_intervention': True,
                'reason': reason,
            }
        )
        
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
        alert = SOSAlert.objects.select_for_update().get(id=alert_id)
        
        # Use IncidentStateService for state change
        from .services import IncidentStateService
        IncidentStateService.set_escalated_state(alert, actor=request.user, reason=reason)
        
        # Create ADMIN_INTERVENTION event
        from .services import SOSEventService
        SOSEventService.create_event(
            alert=alert,
            event_type='ADMIN_INTERVENTION',
            actor=request.user,
            data={
                'action': 'escalate',
                'reason': reason,
            }
        )
        
        # Also create SOS_ESCALATED event for state change
        SOSEventService.create_event(
            alert=alert,
            event_type='SOS_ESCALATED',
            actor=request.user,
            data={
                'admin_intervention': True,
                'reason': reason,
            }
        )
        
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
        alert = SOSAlert.objects.select_related('user', 'primary_responder').get(id=alert_id)
        
        # Security validation: only tourist, responders, standby responders, admins can access
        from .services import IncidentSecurityService
        can_access, error_msg = IncidentSecurityService.can_access_timeline(alert, request.user)
        if not can_access:
            return Response({'message': error_msg}, status=403)
        
        from .services import SOSEventService
        timeline = SOSEventService.get_timeline(alert_id)
        
        return Response({
            'alert_id': alert_id,
            'timeline': timeline,
        })
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)


# ════════════════════════════════════════════════════════════════════════════
# GUIDE LIFECYCLE ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLocalGuide])
def guide_create_response_view(request, alert_id):
    """Guide creates a response to an SOS alert."""
    try:
        # Rate limiting check
        from .services import IncidentSecurityService
        can_proceed, rate_error = IncidentSecurityService.check_rate_limit(request.user, 'response_creation')
        if not can_proceed:
            return Response({'message': rate_error}, status=429)
        
        alert = SOSAlert.objects.select_for_update().get(id=alert_id)
        
        # Validate alert is still active
        if alert.status in ('RESOLVED', 'CANCELLED'):
            return Response({'message': 'Alert is no longer active'}, status=400)
        
        # Check if guide already responded (unique constraint)
        existing_response = SOSResponse.objects.filter(
            alert=alert,
            responder=request.user
        ).first()
        
        if existing_response:
            return Response({'message': 'You have already responded to this alert'}, status=400)
        
        message = request.data.get('message', '')
        eta_minutes = request.data.get('eta_minutes')
        
        if not message:
            return Response({'message': 'Message is required'}, status=400)
        
        # Create response atomically
        with transaction.atomic():
            from apps.messaging.models import ChatRoom
            from .services import SOSEventService, IncidentStateService
            
            # Create or get chat room
            if not alert.chat_room:
                chat_room = ChatRoom.get_or_create_dm(request.user.id, alert.user_id)
                alert.chat_room = chat_room
                alert.save(update_fields=['chat_room'])
            
            response = SOSResponse.objects.create(
                alert=alert,
                responder=request.user,
                message=message,
                eta_minutes=eta_minutes,
            )
            
            # STEP 2: Do NOT change status - keep WAITING_FOR_RESPONDER
            # STEP 2: Do NOT call IncidentStateService.set_responding_state - that's Step 3
            
            # Atomic update of responder count
            from django.db.models import F
            alert.responder_count = F('responder_count') + 1
            alert.save(update_fields=['responder_count', 'chat_room'])
            alert.refresh_from_db(fields=['responder_count'])
            
            # Create GUIDE_INTERESTED event
            SOSEventService.create_event(
                alert=alert,
                event_type='GUIDE_INTERESTED',
                actor=request.user,
                response=response,
                data={
                    'message': message,
                    'eta_minutes': eta_minutes,
                    'chat_room_name': alert.chat_room.name if alert.chat_room else None,
                }
            )
            
            # STEP 2: Do NOT trigger smart dispatch - that's Step 3
        
        return Response({
            'success': True,
            'response_id': response.id,
            'guide_status': response.guide_status,
            'alert_status': alert.status,
        })
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)
    except ValueError as e:
        return Response({'message': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLocalGuide])
def guide_accept_assignment_view(request, alert_id):
    """Guide accepts assignment as primary responder."""
    try:
        # Rate limiting check
        from .services import IncidentSecurityService
        can_proceed, rate_error = IncidentSecurityService.check_rate_limit(request.user, 'status_updates')
        if not can_proceed:
            return Response({'message': rate_error}, status=429)
        
        alert = SOSAlert.objects.select_related('user', 'primary_responder').get(id=alert_id)
        response = SOSResponse.objects.select_related('responder').filter(
            alert=alert,
            responder=request.user
        ).first()
        
        if not response:
            return Response({'message': 'No response found for this alert'}, status=404)
        
        # Security validation: only primary responder can accept
        can_perform, error_msg = IncidentSecurityService.can_guide_perform_lifecycle_action(alert, request.user)
        if not can_perform:
            return Response({'message': error_msg}, status=403)
        
        # Transition guide status to ACCEPTED
        response.transition_guide_status('ACCEPTED')
        
        # Create GUIDE_ACCEPTED event
        from .services import SOSEventService
        SOSEventService.create_event(
            alert=alert,
            event_type='GUIDE_ACCEPTED',
            actor=request.user,
            response=response,
            data={
                'responder_id': request.user.id,
                'responder_username': request.user.username,
            }
        )
        
        # Update alert status to ON_THE_WAY
        alert.transition_to('ON_THE_WAY', actor=request.user)
        
        return Response({
            'success': True,
            'guide_status': response.guide_status,
            'alert_status': alert.status,
        })
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)
    except ValueError as e:
        return Response({'message': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLocalGuide])
def guide_update_status_view(request, alert_id):
    """Guide updates their status (on_the_way, arrived, completed)."""
    try:
        # Rate limiting check
        from .services import IncidentSecurityService
        can_proceed, rate_error = IncidentSecurityService.check_rate_limit(request.user, 'status_updates')
        if not can_proceed:
            return Response({'message': rate_error}, status=429)
        
        alert = SOSAlert.objects.select_for_update().get(id=alert_id)
        response = SOSResponse.objects.filter(
            alert=alert,
            responder=request.user
        ).first()
        
        if not response:
            return Response({'message': 'No response found for this alert'}, status=404)
        
        # Security validation: only primary responder can update status
        can_perform, error_msg = IncidentSecurityService.can_guide_perform_lifecycle_action(alert, request.user)
        if not can_perform:
            return Response({'message': error_msg}, status=403)
        
        # Map frontend status to model status
        status_mapping = {
            'on_the_way': 'ON_THE_WAY',
            'arrived': 'ARRIVED',
            'completed': 'COMPLETED',
            'unable_to_continue': 'UNABLE_TO_CONTINUE',
        }
        
        new_status = request.data.get('status')
        model_status = status_mapping.get(new_status)
        
        if not model_status:
            return Response({'message': f'Invalid status: {new_status}'}, status=400)
        
        # Handle UNABLE_TO_CONTINUE - failure scenario
        if model_status == 'UNABLE_TO_CONTINUE':
            # Mark guide as unable to continue
            response.guide_status = 'UNABLE_TO_CONTINUE'
            response.save(update_fields=['guide_status'])
            
            # Create PRIMARY_FAILED event
            from .services import SOSEventService
            SOSEventService.create_event(
                alert=alert,
                event_type='PRIMARY_FAILED',
                actor=request.user,
                response=response,
                data={
                    'primary_username': request.user.username,
                    'reason': 'Unable to continue',
                }
            )
            
            # Trigger standby promotion
            from .services import StandbyPromotionService
            StandbyPromotionService.check_and_promote_standby(alert)
            
            return Response({
                'success': True,
                'guide_status': response.guide_status,
                'alert_status': alert.status,
            })
        
        # Use atomic transaction for state change
        with transaction.atomic():
            # Transition guide status
            response.transition_guide_status(model_status)
            
            # Create appropriate event
            from .services import SOSEventService
            event_type_mapping = {
                'ON_THE_WAY': 'GUIDE_ON_THE_WAY',
                'ARRIVED': 'GUIDE_ARRIVED',
                'COMPLETED': 'GUIDE_COMPLETED',
            }
            
            event_type = event_type_mapping.get(model_status)
            if event_type:
                SOSEventService.create_event(
                    alert=alert,
                    event_type=event_type,
                    actor=request.user,
                    response=response,
                    data={
                        'responder_id': request.user.id,
                        'responder_username': request.user.username,
                    }
                )
            
            # Update alert status using IncidentStateService
            from .services import IncidentStateService
            if model_status == 'ON_THE_WAY':
                IncidentStateService.set_on_the_way_state(alert, actor=request.user)
            elif model_status == 'ARRIVED':
                IncidentStateService.set_arrived_state(alert, actor=request.user)
            elif model_status == 'COMPLETED':
                # Guide completed the rescue - resolve the incident
                IncidentStateService.set_resolved_state(alert, actor=request.user, reason='Guide completed rescue')
        
        return Response({
            'success': True,
            'guide_status': response.guide_status,
            'alert_status': alert.status,
        })
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)
    except ValueError as e:
        return Response({'message': str(e)}, status=400)


# ════════════════════════════════════════════════════════════════════════════
# ADMIN REASSIGNMENT ENDPOINT
# ════════════════════════════════════════════════════════════════════════════

@api_view(['PUT'])
@permission_classes([IsAdmin])
def admin_reassign_primary_view(request, alert_id):
    """Admin reassigns primary responder to a different guide."""
    try:
        # Rate limiting check
        from .services import IncidentSecurityService
        can_proceed, rate_error = IncidentSecurityService.check_rate_limit(request.user, 'assignment_actions')
        if not can_proceed:
            return Response({'message': rate_error}, status=429)
        
        alert = SOSAlert.objects.select_for_update().get(id=alert_id)
        new_responder_id = request.data.get('responder_id')
        reason = request.data.get('reason', 'Admin reassignment')
        
        if not new_responder_id:
            return Response({'message': 'responder_id is required'}, status=400)
        
        # Security validation: admin can only assign responders already attached to incident
        can_reassign, error_msg = IncidentSecurityService.can_admin_reassign_responder(alert, new_responder_id)
        if not can_reassign:
            return Response({'message': error_msg}, status=400)
        
        from apps.accounts.models import User
        new_responder = User.objects.get(id=new_responder_id, role='LOCAL_GUIDE')
        
        # Check if new responder has a response for this alert
        response = SOSResponse.objects.filter(
            alert=alert,
            responder=new_responder
        ).first()
        
        if not response:
            return Response({'message': 'Selected responder has not responded to this alert'}, status=400)
        
        # Reassign primary using atomic method
        was_assigned = alert.assign_primary_responder(new_responder, actor=request.user)
        
        if was_assigned:
            # Create ADMIN_INTERVENTION event for reassignment
            from .services import SOSEventService
            SOSEventService.create_event(
                alert=alert,
                event_type='PRIMARY_REASSIGNED',
                actor=request.user,
                data={
                    'admin_intervention': True,
                    'reason': reason,
                    'new_primary_id': new_responder.id,
                    'new_primary_username': new_responder.username,
                }
            )
            
            return Response({
                'success': True,
                'primary_responder_id': alert.primary_responder.id,
                'primary_responder_username': alert.primary_responder.username,
                'alert_status': alert.status,
            })
        else:
            return Response({'message': 'Failed to reassign primary responder'}, status=400)
            
    except SOSAlert.DoesNotExist:
        return Response({'message': 'Alert not found'}, status=404)
    except User.DoesNotExist:
        return Response({'message': 'Responder not found'}, status=404)
    except ValueError as e:
        return Response({'message': str(e)}, status=400)