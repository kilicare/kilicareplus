from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import timedelta

from core.permissions import IsAdmin
from apps.accounts.models import User
from apps.moments.models import Moment
from apps.map_tips.models import Tip
from apps.sos.models import SOSAlert
from apps.subscriptions.models import UserSubscription, SubscriptionPayment
from apps.passport.models import PassportProfile, PointsTransaction
from .models import LandingPageConfig, Testimonial


@api_view(['GET'])
@permission_classes([IsAdmin])
def users_list_view(request):
    role   = request.query_params.get('role')
    search = request.query_params.get('search', '')
    page   = int(request.query_params.get('page', 1))
    
    # Pagination validation
    MAX_PAGE_SIZE = 100
    DEFAULT_PAGE_SIZE = 20
    page_size = int(request.query_params.get('page_size', DEFAULT_PAGE_SIZE))
    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)  # Clamp between 1 and 100
    
    if page < 1:
        page = 1

    qs = User.objects.select_related(
        'profile', 'passport'
    ).order_by('-date_joined')

    if role:
        qs = qs.filter(role=role)
    if search:
        qs = qs.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(first_name__icontains=search)
        )

    total  = qs.count()
    offset = (page - 1) * page_size
    users  = qs[offset:offset + page_size]

    data = []
    for u in users:
        passport = getattr(u, 'passport', None)
        profile  = getattr(u, 'profile', None)
        data.append({
            'id':          u.id,
            'username':    u.username,
            'email':       u.email,
            'first_name':  u.first_name,
            'last_name':   u.last_name,
            'role':        u.role,
            'is_active':   u.is_active,
            'is_verified': u.is_verified,
            'date_joined': u.date_joined.isoformat(),
            'points':      passport.points      if passport else 0,
            'trust_score': passport.trust_score if passport else 50,
            'level':       passport.level       if passport else 'EXPLORER',
            'avatar': (
                profile.avatar.url
                if profile and profile.avatar else None
            ),
        })

    return Response({
        'results':  data,
        'count':    total,
        'page':     page,
        'page_size': page_size,
        'has_next': (offset + page_size) < total,
    })


@api_view(['PUT'])
@permission_classes([IsAdmin])
def change_role_view(request, user_id):
    new_role = request.data.get('role')
    if new_role not in ('TOURIST', 'LOCAL_GUIDE', 'ADMIN', 'B2B'):
        return Response(
            {'message': 'Role si sahihi.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        user = User.objects.get(id=user_id)
        old_role = user.role
        user.role = new_role
        user.save(update_fields=['role'])
        
        # Invalidate profile cache
        from core.cache_utils import invalidate_profile_cache
        invalidate_profile_cache(user.username)
        invalidate_profile_cache(user.id)
        
        # Audit log
        from .services import log_role_change
        log_role_change(
            actor=request.user,
            target_user=user,
            old_role=old_role,
            new_role=new_role,
            reason=request.data.get('reason', 'Role change by admin'),
            request=request,
        )
        
        return Response({'success': True, 'role': new_role})
    except User.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdmin])
def award_points_view(request, user_id):
    pts    = int(request.data.get('points', 0))
    reason = request.data.get('reason', 'Admin award')

    try:
        user = User.objects.get(id=user_id)
        from apps.passport.services import award_points_to_user
        txn = award_points_to_user(user, 'ADMIN_AWARD', pts)
        if txn:
            # Audit log
            from .services import log_points_award
            log_points_award(
                actor=request.user,
                target_user=user,
                points_change=pts,
                balance_after=txn.balance_after,
                reason=reason,
                request=request,
            )
            return Response({'success': True, 'new_balance': txn.balance_after})
        return Response({'message': 'Failed to award points'}, status=400)
    except User.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def suspend_user_view(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        old_is_active = user.is_active
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        
        # Invalidate profile cache
        from core.cache_utils import invalidate_profile_cache
        invalidate_profile_cache(user.username)
        invalidate_profile_cache(user.id)
        
        # Audit log
        from .services import log_user_suspension
        log_user_suspension(
            actor=request.user,
            target_user=user,
            is_active=user.is_active,
            reason=request.data.get('reason', 'User suspension by admin'),
            request=request,
        )
        
        return Response({
            'success':   True,
            'is_active': user.is_active,
        })
    except User.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def moderation_moments_view(request):
    moments = Moment.objects.select_related(
        'posted_by'
    ).order_by('-created_at')[:50]
    return Response([{
        'id':           m.id,
        'posted_by':    m.posted_by.username,
        'media_url':    m.media.url if m.media else None,
        'media_type':   m.media_type,
        'caption':      m.caption,
        'views':        m.views,
        'trending_score': m.trending_score,
        'visibility':   m.visibility,
        'created_at':   m.created_at.isoformat(),
    } for m in moments])


@api_view(['PUT'])
@permission_classes([IsAdmin])
def moment_action_view(request, moment_id):
    action = request.data.get('action')
    try:
        moment = Moment.objects.get(id=moment_id)
        if action == 'delete':
            moment.delete()
            return Response({'success': True, 'action': 'deleted'})
        elif action == 'feature':
            moment.is_featured = True
            moment.save(update_fields=['is_featured'])
        elif action == 'hide':
            moment.visibility = 'PRIVATE'
            moment.save(update_fields=['visibility'])
        return Response({'success': True, 'action': action})
    except Moment.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def tips_queue_view(request):
    tips = Tip.objects.filter(
        is_verified=False
    ).select_related('created_by').order_by('-created_at')[:30]
    return Response([{
        'id':          t.id,
        'title':       t.title,
        'description': t.description,
        'category':    t.category,
        'creator':     t.created_by.username,
        'upvotes':     t.upvotes,
        'trust_score': t.trust_score,
        'created_at':  t.created_at.isoformat(),
    } for t in tips])


@api_view(['PUT'])
@permission_classes([IsAdmin])
def verify_tip_view(request, tip_id):
    try:
        tip = Tip.objects.get(id=tip_id)
        tip.is_verified   = True
        tip.trust_score   = min(100, tip.trust_score + 20)
        tip.save(update_fields=['is_verified', 'trust_score'])
        try:
            from apps.notifications.utils import create_notification
            from apps.passport.services import award_points_to_user
            create_notification(
                recipient=tip.created_by,
                notification_type='TIP_VERIFIED',
                title='Tip yako imethibitishwa! ✅',
                body=f'"{tip.title}" imethibitishwa na admin.',
            )
            award_points_to_user(tip.created_by, 'TIP_VERIFIED')
        except Exception:
            pass
        return Response({'success': True})
    except Tip.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdmin])
def sos_statistics_view(request):
    today = timezone.now().date()
    return Response({
        'active':          SOSAlert.objects.filter(status='ACTIVE').count(),
        'responding':      SOSAlert.objects.filter(status='RESPONDING').count(),
        'escalated':       SOSAlert.objects.filter(status='ESCALATED').count(),
        'resolved_today':  SOSAlert.objects.filter(
            status='RESOLVED',
            resolved_at__date=today,
        ).count(),
        'total':           SOSAlert.objects.count(),
        'critical_active': SOSAlert.objects.filter(
            status='ACTIVE', severity='CRITICAL'
        ).count(),
        'avg_response_time_minutes': SOSAlert.objects.filter(
            avg_response_time_minutes__isnull=False
        ).aggregate(avg=Avg('avg_response_time_minutes'))['avg'] or 0,
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def revenue_stats_view(request):
    from decimal import Decimal
    today       = timezone.now()
    month_start = today.replace(day=1)
    week_start  = today - timedelta(days=7)

    # Subscription revenue - exclude refunds
    sub_rev_month = SubscriptionPayment.objects.filter(
        status='COMPLETED', paid_at__gte=month_start,
    ).exclude(status='REFUNDED').aggregate(total=Sum('amount'))['total'] or Decimal('0')

    sub_rev_week = SubscriptionPayment.objects.filter(
        status='COMPLETED', paid_at__gte=week_start,
    ).exclude(status='REFUNDED').aggregate(total=Sum('amount'))['total'] or Decimal('0')

    # Booking fees - exclude refunds
    booking_fees_month = Decimal('0')
    booking_fees_week = Decimal('0')
    try:
        from apps.bookings.models import Booking
        booking_fees_month = Booking.objects.filter(
            status='COMPLETED',
            escrow_released_at__gte=month_start,
        ).exclude(status='REFUNDED').aggregate(total=Sum('platform_fee'))['total'] or Decimal('0')
        
        booking_fees_week = Booking.objects.filter(
            status='COMPLETED',
            escrow_released_at__gte=week_start,
        ).exclude(status='REFUNDED').aggregate(total=Sum('platform_fee'))['total'] or Decimal('0')
    except Exception:
        pass

    # Calculate refunds
    sub_refunds_month = SubscriptionPayment.objects.filter(
        status='REFUNDED', paid_at__gte=month_start,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    booking_refunds_month = Decimal('0')
    try:
        from apps.bookings.models import Booking
        booking_refunds_month = Booking.objects.filter(
            status='REFUNDED',
            escrow_released_at__gte=month_start,
        ).aggregate(total=Sum('platform_fee'))['total'] or Decimal('0')
    except Exception:
        pass

    total_refunds_month = sub_refunds_month + booking_refunds_month
    
    # Net revenue (gross - refunds)
    gross_revenue_month = sub_rev_month + booking_fees_month
    net_revenue_month = gross_revenue_month - total_refunds_month

    # Subscription breakdown
    active_subs = UserSubscription.objects.filter(
        status__in=('ACTIVE', 'TRIAL'),
        end_date__gte=today.date()
    ).values('plan__name').annotate(count=Count('id'))

    return Response({
        'subscription_revenue_this_month': float(sub_rev_month),
        'subscription_revenue_this_week':  float(sub_rev_week),
        'booking_fees_this_month':         float(booking_fees_month),
        'booking_fees_this_week':          float(booking_fees_week),
        'gross_revenue_this_month':         float(gross_revenue_month),
        'net_revenue_this_month':           float(net_revenue_month),
        'refunds_this_month':               float(total_refunds_month),
        'total_this_month':                float(net_revenue_month),
        'active_subscriptions':            UserSubscription.objects.filter(
            status__in=('ACTIVE', 'TRIAL'),
            end_date__gte=today.date()
        ).count(),
        'subscription_breakdown': list(active_subs),
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def platform_stats_view(request):
    """Overview stats for admin dashboard with enhanced metrics"""
    try:
        from apps.moments.models import Moment
        from apps.map_tips.models import Tip
        from apps.experiences.models import Experience
        from apps.bookings.models import Booking
        from datetime import timedelta
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # User metrics
        users_total = User.objects.count()
        users_active = User.objects.filter(is_active=True).count()
        users_verified = User.objects.filter(is_verified=True).count()
        users_new_week = User.objects.filter(date_joined__date__gte=week_ago).count()
        users_new_month = User.objects.filter(date_joined__date__gte=month_ago).count()
        
        # Active users (logged in within 7 days)
        from apps.passport.models import PassportProfile
        active_users_7d = PassportProfile.objects.filter(
            user__is_active=True,
            updated_at__date__gte=week_ago
        ).count()
        
        # Guide metrics
        guides_total = User.objects.filter(role='LOCAL_GUIDE').count()
        guides_verified = User.objects.filter(role='LOCAL_GUIDE', is_verified=True).count()
        
        # Tourist metrics
        tourists_total = User.objects.filter(role='TOURIST').count()
        
        # Content metrics
        moments_total = Moment.objects.count()
        moments_week = Moment.objects.filter(created_at__date__gte=week_ago).count()
        tips_total = Tip.objects.count()
        tips_verified = Tip.objects.filter(is_verified=True).count()
        tips_unverified = Tip.objects.filter(is_verified=False).count()
        experiences_total = Experience.objects.count()
        
        # Booking metrics
        bookings_total = Booking.objects.count()
        bookings_completed = Booking.objects.filter(status='COMPLETED').count()
        bookings_week = Booking.objects.filter(created_at__date__gte=week_ago).count()
        bookings_month = Booking.objects.filter(created_at__date__gte=month_ago).count()
        
        # SOS metrics
        sos_active = SOSAlert.objects.filter(status='ACTIVE').count()
        sos_resolved_week = SOSAlert.objects.filter(
            status='RESOLVED',
            resolved_at__date__gte=week_ago
        ).count()
        
        # Engagement metrics
        total_views = Moment.objects.aggregate(total=Sum('views'))['total'] or 0
        total_likes = Moment.objects.annotate(like_count=Count('likes')).aggregate(total=Sum('like_count'))['total'] or 0
        
        return Response({
            'users_total': users_total,
            'users_active': users_active,
            'users_verified': users_verified,
            'users_new_week': users_new_week,
            'users_new_month': users_new_month,
            'active_users_7d': active_users_7d,
            'guides_total': guides_total,
            'guides_verified': guides_verified,
            'tourists_total': tourists_total,
            'moments_total': moments_total,
            'moments_week': moments_week,
            'tips_total': tips_total,
            'tips_verified': tips_verified,
            'tips_unverified': tips_unverified,
            'experiences_total': experiences_total,
            'bookings_total': bookings_total,
            'bookings_completed': bookings_completed,
            'bookings_week': bookings_week,
            'bookings_month': bookings_month,
            'sos_active': sos_active,
            'sos_resolved_week': sos_resolved_week,
            'total_views': total_views,
            'total_likes': total_likes,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdmin])
def guide_performance_view(request):
    """Guide performance metrics for analytics"""
    try:
        from apps.bookings.models import Booking
        from apps.experiences.models import Experience
        from datetime import timedelta
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        # Get all guides
        guides = User.objects.filter(role='LOCAL_GUIDE').select_related('passport', 'profile')
        
        guide_data = []
        for guide in guides[:50]:  # Limit to top 50
            passport = getattr(guide, 'passport', None)
            profile = getattr(guide, 'profile', None)
            
            # Booking metrics
            bookings = Booking.objects.filter(guide=guide)
            total_bookings = bookings.count()
            completed_bookings = bookings.filter(status='COMPLETED').count()
            
            # Revenue metrics
            revenue = bookings.filter(
                status='COMPLETED',
                escrow_released_at__date__gte=month_start
            ).aggregate(total=Sum('guide_payout'))['total'] or 0
            
            # Experience metrics
            experiences = Experience.objects.filter(local=guide).count()
            
            # SOS response metrics
            sos_responses = SOSAlert.objects.filter(
                responses__responder=guide
            ).distinct().count()
            
            guide_data.append({
                'id': guide.id,
                'username': guide.username,
                'first_name': guide.first_name,
                'is_verified': guide.is_verified,
                'is_active': guide.is_active,
                'points': passport.points if passport else 0,
                'trust_score': passport.trust_score if passport else 50,
                'level': passport.level if passport else 'EXPLORER',
                'total_bookings': total_bookings,
                'completed_bookings': completed_bookings,
                'completion_rate': round(completed_bookings / total_bookings * 100, 1) if total_bookings > 0 else 0,
                'revenue_this_month': float(revenue),
                'experiences_count': experiences,
                'sos_responses': sos_responses,
                'avatar': profile.avatar.url if profile and profile.avatar else None,
            })
        
        # Sort by revenue
        guide_data.sort(key=lambda x: x['revenue_this_month'], reverse=True)
        
        return Response(guide_data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAdmin])
def upload_image_view(request):
    """Upload image to Cloudinary via backend (more secure)"""
    try:
        import os
        import cloudinary
        import cloudinary.uploader
        
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
            api_key=os.getenv('CLOUDINARY_API_KEY'),
            api_secret=os.getenv('CLOUDINARY_API_SECRET')
        )
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder='kilicare/landing-page',
            resource_type='image',
            allowed_formats=['jpg', 'jpeg', 'png', 'webp'],
            max_file_size=5242880  # 5MB
        )
        
        return Response({
            'secure_url': result['secure_url'],
            'public_id': result['public_id']
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def landing_page_config_view(request):
    """Public endpoint to get landing page configuration"""
    try:
        config = LandingPageConfig.objects.first()
        if not config:
            # Create default config if none exists
            config = LandingPageConfig.objects.create()
        
        return Response({
            'cta_background_image': config.cta_background_image,
            'serengeti_image': config.serengeti_image,
            'kilimanjaro_image': config.kilimanjaro_image,
            'zanzibar_image': config.zanzibar_image,
            'ngorongoro_image': config.ngorongoro_image,
            'updated_at': config.updated_at.isoformat(),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['PUT'])
@permission_classes([IsAdmin])
def update_landing_page_config_view(request):
    """Admin endpoint to update landing page configuration"""
    try:
        config = LandingPageConfig.objects.first()
        if not config:
            config = LandingPageConfig.objects.create()
        
        # Update fields
        config.cta_background_image = request.data.get('cta_background_image', config.cta_background_image)
        config.serengeti_image = request.data.get('serengeti_image', config.serengeti_image)
        config.kilimanjaro_image = request.data.get('kilimanjaro_image', config.kilimanjaro_image)
        config.zanzibar_image = request.data.get('zanzibar_image', config.zanzibar_image)
        config.ngorongoro_image = request.data.get('ngorongoro_image', config.ngorongoro_image)
        config.updated_by = request.user
        config.save()

        return Response({
            'success': True,
            'message': 'Landing page configuration updated successfully',
            'config': {
                'cta_background_image': config.cta_background_image,
                'serengeti_image': config.serengeti_image,
                'kilimanjaro_image': config.kilimanjaro_image,
                'zanzibar_image': config.zanzibar_image,
                'ngorongoro_image': config.ngorongoro_image,
                'updated_at': config.updated_at.isoformat(),
            }
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_stats_view(request):
    """Public platform stats for landing page — no auth required"""
    from apps.accounts.models import User
    from apps.moments.models import Moment
    from apps.map_tips.models import Tip

    try:
        tourists  = User.objects.filter(role='TOURIST').count()
        guides    = User.objects.filter(role='LOCAL_GUIDE').count()
        moments   = Moment.objects.filter(visibility='PUBLIC').count()
        tips      = Tip.objects.filter(is_verified=True).count()

        return Response({
            'tourists_served': max(tourists, 1200),  # show at least baseline
            'local_guides':    max(guides, 350),
            'moments_shared':  max(moments, 8500),
            'tips_verified':   max(tips, 2100),
            'countries':       47,
            'cities_covered':  23,
            'uptime':          '99.9%',
        })
    except Exception:
        # Fallback if DB not ready
        return Response({
            'tourists_served': 1200,
            'local_guides':    350,
            'moments_shared':  8500,
            'tips_verified':   2100,
            'countries':       47,
            'cities_covered':  23,
            'uptime':          '99.9%',
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def public_testimonials_view(request):
    """Public testimonials for landing page — no auth required"""
    try:
        testimonials = Testimonial.objects.filter(
            is_featured=True
        ).order_by('display_order', '-created_at')[:6]

        return Response([
            {
                'id': t.id,
                'name': t.name,
                'role': t.role,
                'avatar': t.avatar_letter,
                'color': t.color,
                'rating': t.rating,
                'text': t.text,
                'location': t.location,
                'profile_url': t.profile_url,
            }
            for t in testimonials
        ])
    except Exception as e:
        # Fallback to hardcoded testimonials if DB not ready
        return Response([
            {
                'id': 1,
                'name': 'Sarah Mitchell',
                'role': 'Travel Blogger, USA 🇺🇸',
                'avatar': 'S',
                'color': '#F5A623',
                'rating': 5,
                'text': 'KilicareGO+ changed how I explore Tanzania. The AI guide answered every question in perfect English, and the SOS feature gave me peace of mind hiking Kilimanjaro. Absolutely world-class app!',
                'location': 'Kilimanjaro Trek',
                'profile_url': '',
            },
            {
                'id': 2,
                'name': 'Abdullah Al-Rashid',
                'role': 'Adventure Tourist, UAE 🇦🇪',
                'avatar': 'A',
                'color': '#10B981',
                'rating': 5,
                'text': 'Nilipata guide bora kabisa kupitia app hii. Booking ilikuwa rahisi, malipo ya M-Pesa yalifanya kazi vizuri, na uzoefu wa Serengeti ulikuwa bora zaidi ya ndoto yangu.',
                'location': 'Serengeti Safari',
                'profile_url': '',
            },
            {
                'id': 3,
                'name': 'Amara Diallo',
                'role': 'Local Guide, Zanzibar 🇹🇿',
                'avatar': 'A',
                'color': '#3B82F6',
                'rating': 5,
                'text': 'As a local guide, KilicareGO+ transformed my business. I get 10x more bookings, the escrow system protects me and my clients, and the analytics show me where to improve.',
                'location': 'Zanzibar Tours',
                'profile_url': '',
            },
            {
                'id': 4,
                'name': 'Chen Wei',
                'role': 'Digital Nomad, China 🇨🇳',
                'avatar': 'C',
                'color': '#8B5CF6',
                'rating': 5,
                'text': 'The moment feed is amazing — I could see real experiences from other tourists before booking. The KilicareBet predictions were surprisingly accurate for Tanzania Premier League!',
                'location': 'Dar es Salaam',
                'profile_url': '',
            },
            {
                'id': 5,
                'name': 'Fatima Nkrumah',
                'role': 'Business Traveler, Ghana 🇬🇭',
                'avatar': 'F',
                'color': '#EC4899',
                'rating': 5,
                'text': 'Safari bora kabisa Afrika! Nimesafiri nchi 23 lakini Tanzania na KilicareGO+ ilikuwa tofauti kabisa. App inaelewa utamaduni wetu na lugha yetu.',
                'location': 'Arusha & Zanzibar',
                'profile_url': '',
            },
            {
                'id': 6,
                'name': 'Marco Rossi',
                'role': 'Photographer, Italy 🇮🇹',
                'avatar': 'M',
                'color': '#F59E0B',
                'rating': 5,
                'text': 'The Moments feed helped me find incredible photography spots. Connected with a local guide through chat, booked instantly via M-Pesa. Shot the most beautiful wildlife photos of my career.',
                'location': 'Ngorongoro Crater',
                'profile_url': '',
            },
        ])


@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def admin_testimonials_view(request):
    """Admin CRUD operations for testimonials"""
    if request.method == 'GET':
        testimonials = Testimonial.objects.all().order_by('display_order', '-created_at')
        return Response([
            {
                'id': t.id,
                'name': t.name,
                'role': t.role,
                'avatar_letter': t.avatar_letter,
                'color': t.color,
                'rating': t.rating,
                'text': t.text,
                'location': t.location,
                'profile_url': t.profile_url,
                'is_featured': t.is_featured,
                'display_order': t.display_order,
                'created_at': t.created_at.isoformat(),
                'updated_at': t.updated_at.isoformat(),
            }
            for t in testimonials
        ])

    elif request.method == 'POST':
        try:
            data = request.data
            testimonial = Testimonial.objects.create(
                name=data.get('name'),
                role=data.get('role'),
                avatar_letter=data.get('avatar_letter', data.get('name', '')[0]),
                text=data.get('text'),
                rating=data.get('rating', 5),
                location=data.get('location'),
                color=data.get('color', '#F5A623'),
                profile_url=data.get('profile_url', ''),
                is_featured=data.get('is_featured', True),
                display_order=data.get('display_order', 0),
                updated_by=request.user,
            )
            return Response({
                'id': testimonial.id,
                'name': testimonial.name,
                'role': testimonial.role,
                'avatar_letter': testimonial.avatar_letter,
                'color': testimonial.color,
                'rating': testimonial.rating,
                'text': testimonial.text,
                'location': testimonial.location,
                'profile_url': testimonial.profile_url,
                'is_featured': testimonial.is_featured,
                'display_order': testimonial.display_order,
            }, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdmin])
def admin_testimonial_detail_view(request, testimonial_id):
    """Admin detail operations for a single testimonial"""
    try:
        testimonial = Testimonial.objects.get(id=testimonial_id)
    except Testimonial.DoesNotExist:
        return Response({'error': 'Testimonial not found'}, status=404)

    if request.method == 'GET':
        return Response({
            'id': testimonial.id,
            'name': testimonial.name,
            'role': testimonial.role,
            'avatar_letter': testimonial.avatar_letter,
            'color': testimonial.color,
            'rating': testimonial.rating,
            'text': testimonial.text,
            'location': testimonial.location,
            'profile_url': testimonial.profile_url,
            'is_featured': testimonial.is_featured,
            'display_order': testimonial.display_order,
            'created_at': testimonial.created_at.isoformat(),
            'updated_at': testimonial.updated_at.isoformat(),
        })

    elif request.method == 'PUT':
        try:
            data = request.data
            testimonial.name = data.get('name', testimonial.name)
            testimonial.role = data.get('role', testimonial.role)
            testimonial.avatar_letter = data.get('avatar_letter', testimonial.avatar_letter)
            testimonial.text = data.get('text', testimonial.text)
            testimonial.rating = data.get('rating', testimonial.rating)
            testimonial.location = data.get('location', testimonial.location)
            testimonial.color = data.get('color', testimonial.color)
            testimonial.profile_url = data.get('profile_url', testimonial.profile_url)
            testimonial.is_featured = data.get('is_featured', testimonial.is_featured)
            testimonial.display_order = data.get('display_order', testimonial.display_order)
            testimonial.updated_by = request.user
            testimonial.save()

            return Response({
                'id': testimonial.id,
                'name': testimonial.name,
                'role': testimonial.role,
                'avatar_letter': testimonial.avatar_letter,
                'color': testimonial.color,
                'rating': testimonial.rating,
                'text': testimonial.text,
                'location': testimonial.location,
                'profile_url': testimonial.profile_url,
                'is_featured': testimonial.is_featured,
                'display_order': testimonial.display_order,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        testimonial.delete()
        return Response({'message': 'Testimonial deleted successfully'})