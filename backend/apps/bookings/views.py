from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

from .models import Booking, BookingReview
from .serializers import BookingSerializer, BookingReviewSerializer
from core.permissions import IsLocalGuide
from apps.notifications.event_dispatcher import notify_event


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_booking_view(request):
    """Tourist creates a booking"""
    guide_id = request.data.get('guide_id')
    experience_id = request.data.get('experience_id')
    amount = request.data.get('amount')
    scheduled_date = request.data.get('scheduled_date')
    scheduled_time = request.data.get('scheduled_time')
    location = request.data.get('location')

    # Validate required fields
    if not guide_id or not amount:
        return Response(
            {'message': 'guide_id na amount zinahitajika.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not scheduled_date or not scheduled_time:
        return Response(
            {'message': 'Tarehe na wakati zinahitajika.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not location:
        return Response(
            {'message': 'Eneo linahitajika.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check guide has booking system
    try:
        from apps.accounts.models import User
        guide = User.objects.get(id=guide_id, role='LOCAL_GUIDE')
    except User.DoesNotExist:
        return Response({'message': 'Guide haipatikani.'}, status=404)

    booking = Booking(
        tourist=request.user,
        guide=guide,
        title=request.data.get('title', f'Booking na {guide.username}'),
        description=request.data.get('description', ''),
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        duration_hours=float(request.data.get('duration_hours', 2)),
        location=location,
        participants=int(request.data.get('participants', 1)),
        amount=amount,
        special_requests=request.data.get('special_requests', ''),
        status='PENDING',
    )

    if experience_id:
        try:
            from apps.experiences.models import Experience
            booking.experience_id = experience_id
        except Exception:
            pass

    booking.calculate_fees()
    booking.save()

    # Send booking request notification to guide
    try:
        notify_event(
            'BOOKING_REQUEST',
            actor=request.user,
            target=guide,
            payload={
                'booking_id': booking.id,
                'title': booking.title,
                'amount': booking.amount,
                'scheduled_date': booking.scheduled_date,
            }
        )
    except Exception:
        pass

    return Response(
        BookingSerializer(booking, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_bookings_view(request):
    """Tourist's bookings"""
    bookings = Booking.objects.filter(
        tourist=request.user
    ).select_related('guide', 'guide__profile', 'experience')
    return Response(
        BookingSerializer(
            bookings, many=True, context={'request': request}
        ).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def guide_bookings_view(request):
    """Guide's bookings"""
    bookings = Booking.objects.filter(
        guide=request.user
    ).select_related('tourist', 'tourist__profile', 'experience')
    return Response(
        BookingSerializer(
            bookings, many=True, context={'request': request}
        ).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def booking_detail_view(request, pk):
    try:
        booking = Booking.objects.get(
            pk=pk,
            tourist=request.user
        ) if request.user.role == 'TOURIST' else Booking.objects.get(
            pk=pk,
            guide=request.user,
        )
    except Booking.DoesNotExist:
        # Try either
        try:
            booking = Booking.objects.get(pk=pk)
            if booking.tourist != request.user and booking.guide != request.user:
                return Response({'message': 'Ruhusa haitoshi.'}, status=403)
        except Booking.DoesNotExist:
            return Response({'message': 'Haipatikani.'}, status=404)
    return Response(
        BookingSerializer(booking, context={'request': request}).data
    )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def booking_action_view(request, pk, action):
    """Actions: confirm, start, complete, cancel, dispute"""
    try:
        booking = Booking.objects.get(pk=pk)
    except Booking.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)

    if action == 'confirm':
        # Guide confirms
        if booking.guide != request.user:
            return Response({'message': 'Ruhusa haitoshi.'}, status=403)
        if booking.status != 'PENDING':
            return Response({'message': 'Booking si PENDING.'}, status=400)
        booking.status = 'CONFIRMED'

        # Send booking confirmed notification to tourist
        try:
            notify_event(
                'BOOKING_CONFIRMED',
                actor=request.user,
                target=booking.tourist,
                payload={
                    'booking_id': booking.id,
                    'title': booking.title,
                    'scheduled_date': booking.scheduled_date,
                    'scheduled_time': booking.scheduled_time,
                }
            )
        except Exception:
            pass

    elif action == 'payment_received':
        # Mark escrow held after M-Pesa confirmation
        booking.status = 'ESCROW_HELD'
        booking.mpesa_code = request.data.get('mpesa_code')

        # Send payment received notification to guide
        try:
            notify_event(
                'PAYMENT_RECEIVED',
                actor=booking.tourist,
                target=booking.guide,
                payload={
                    'booking_id': booking.id,
                    'amount': booking.amount,
                    'mpesa_code': booking.mpesa_code,
                }
            )
        except Exception:
            pass

    elif action == 'start':
        # Guide starts experience
        if booking.guide != request.user:
            return Response({'message': 'Ruhusa haitoshi.'}, status=403)
        booking.status = 'IN_PROGRESS'

    elif action == 'complete':
        # Tourist marks complete — releases escrow
        if booking.tourist != request.user:
            return Response({'message': 'Ruhusa haitoshi.'}, status=403)
        if booking.status not in ('IN_PROGRESS', 'ESCROW_HELD', 'CONFIRMED'):
            return Response({'message': 'Haiwezekani kukamilisha sasa.'}, status=400)
        booking.status = 'COMPLETED'
        booking.escrow_released_at = timezone.now()

        # Award points
        try:
            request.user.passport.award_points('BOOKING_COMPLETED')
            booking.guide.passport.award_points('BOOKING_COMPLETED')
        except Exception:
            pass

    elif action == 'cancel':
        if booking.tourist != request.user and booking.guide != request.user:
            return Response({'message': 'Ruhusa haitoshi.'}, status=403)
        if booking.status in ('COMPLETED', 'REFUNDED'):
            return Response({'message': 'Haiwezekani kufuta.'}, status=400)
        booking.status = 'CANCELLED'
        booking.cancelled_by = request.user
        booking.cancellation_reason = request.data.get('reason', '')

    elif action == 'dispute':
        if booking.tourist != request.user:
            return Response({'message': 'Ruhusa haitoshi.'}, status=403)
        booking.status = 'DISPUTED'

    else:
        return Response({'message': f'Action {action} haijulikani.'}, status=400)

    booking.save()
    return Response(
        BookingSerializer(booking, context={'request': request}).data
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_review_view(request, pk):
    """Tourist adds review after booking completed"""
    try:
        booking = Booking.objects.get(
            pk=pk, tourist=request.user, status='COMPLETED'
        )
    except Booking.DoesNotExist:
        return Response({'message': 'Booking haipatikani au haijamalizika.'}, status=404)

    if hasattr(booking, 'review'):
        return Response({'message': 'Umeshakabua.'}, status=400)

    rating = int(request.data.get('rating', 0))
    if not 1 <= rating <= 5:
        return Response({'message': 'Rating lazima iwe 1-5.'}, status=400)

    review = BookingReview.objects.create(
        booking=booking,
        reviewer=request.user,
        rating=rating,
        review=request.data.get('review', ''),
    )

    # Send review received notification to guide
    try:
        notify_event(
            'REVIEW_RECEIVED',
            actor=request.user,
            target=booking.guide,
            payload={
                'booking_id': booking.id,
                'rating': rating,
            }
        )
    except Exception:
        pass

    return Response(
        BookingReviewSerializer(review).data,
        status=status.HTTP_201_CREATED,
    )