from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SOSAlert, SOSResponse


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
            'created_at': a.created_at.isoformat(),
            'resolved_at': (
                a.resolved_at.isoformat() if a.resolved_at else None
            ),
        }
        for a in alerts
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_alerts_view(request):
    """For LOCAL_GUIDE — see all active SOS nearby"""
    alerts = SOSAlert.objects.filter(
        status__in=('ACTIVE', 'RESPONDING')
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
            'created_at': a.created_at.isoformat(),
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
        'resolved_today': SOSAlert.objects.filter(
            status='RESOLVED',
            resolved_at__date=today,
        ).count(),
        'total': SOSAlert.objects.count(),
    })