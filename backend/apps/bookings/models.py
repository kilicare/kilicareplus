from django.db import models
from django.conf import settings


class Booking(models.Model):
    STATUS = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('ESCROW_HELD', 'Escrow Held'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('DISPUTED', 'Disputed'),
        ('REFUNDED', 'Refunded'),
    ]
    PAYMENT_METHOD = [
        ('MPESA', 'M-Pesa'),
        ('CARD', 'Card'),
        ('CASH', 'Cash'),
    ]

    tourist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings_as_tourist',
    )
    guide = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings_as_guide',
    )
    experience = models.ForeignKey(
        'experiences.Experience',
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    duration_hours = models.FloatField(default=2.0)
    location = models.CharField(max_length=300)
    participants = models.PositiveIntegerField(default=1)

    # Financials
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    guide_payout = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    currency = models.CharField(max_length=5, default='TZS')

    status = models.CharField(
        max_length=15, choices=STATUS, default='PENDING'
    )
    payment_method = models.CharField(
        max_length=10, choices=PAYMENT_METHOD, default='MPESA'
    )
    mpesa_code = models.CharField(max_length=50, null=True, blank=True)
    escrow_released_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cancelled_bookings',
    )
    special_requests = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f'Booking #{self.id} — {self.tourist.username} '
            f'with {self.guide.username}'
        )

    def calculate_fees(self):
        """Platform takes 10%, guide gets 90%"""
        self.platform_fee = self.amount * 10 / 100
        self.guide_payout = self.amount - self.platform_fee


class BookingReview(models.Model):
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name='review'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    rating = models.PositiveSmallIntegerField()
    review = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update guide trust score
        try:
            guide = self.booking.guide
            reviews = BookingReview.objects.filter(booking__guide=guide)
            avg = reviews.aggregate(
                avg=models.Avg('rating')
            )['avg'] or 50
            # Convert 1-5 rating to 0-100 trust score
            trust = (avg / 5) * 100
            guide.passport.trust_score = round(trust, 1)
            guide.passport.save(update_fields=['trust_score'])

            if self.rating == 5:
                guide.passport.award_points('RECEIVE_5STAR_REVIEW')
        except Exception:
            pass