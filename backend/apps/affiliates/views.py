from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Affiliate, AffiliateClick


@api_view(['GET'])
@permission_classes([AllowAny])
def affiliates_list_view(request):
    """List all active affiliates"""
    affiliates = Affiliate.objects.filter(status='ACTIVE')
    
    data = [{
        'id': a.id,
        'name': a.name,
        'description': a.description,
        'logo': a.logo,
        'click_count': a.click_count,
    } for a in affiliates]
    
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def affiliate_click_view(request, affiliate_id):
    """Track affiliate click"""
    affiliate = get_object_or_404(Affiliate, id=affiliate_id, status='ACTIVE')
    
    # Create click record
    click = AffiliateClick.objects.create(
        affiliate=affiliate,
        user=request.user if request.user.is_authenticated else None,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )
    
    # Increment click count
    affiliate.click_count = (affiliate.click_count or 0) + 1
    affiliate.save(update_fields=['click_count'])
    
    return Response({
        'success': True,
        'message': 'Click tracked',
        'affiliate_url': affiliate.affiliate_url,
    })
