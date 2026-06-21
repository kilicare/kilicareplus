from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPES = [
        ('LIKE',                  'Like'),
        ('FOLLOW',                'Follow'),
        ('SOS_RESPONSE',          'SOS Response'),
        ('SOS_CREATED',           'SOS Created'),
        ('SOS_RESOLVED',          'SOS Resolved'),
        ('SOS_CANCELLED',         'SOS Cancelled'),
        ('SOS_ESCALATED',         'SOS Escalated'),
        # STEP 2: New notification types for responder interest
        ('SOS_INTEREST_REGISTERED', 'SOS Interest Registered'),
        ('SOS_MULTIPLE_RESPONDERS', 'SOS Multiple Responders'),
        ('SOS_RESPONDER_CANDIDATE', 'SOS Responder Candidate'),
        ('SOS_NEW_RESPONDER_INTEREST', 'SOS New Responder Interest'),
        ('BOOKING_REQUEST',       'Booking Request'),
        ('BOOKING_CONFIRMED',     'Booking Confirmed'),
        ('BOOKING_COMPLETED',     'Booking Completed'),
        ('PAYMENT_RECEIVED',      'Payment Received'),
        ('BADGE_UNLOCK',          'Badge Unlock'),
        ('POINTS_AWARDED',        'Points Awarded'),
        ('TIP_VERIFIED',          'Tip Verified'),
        ('NEW_MESSAGE',           'New Message'),
        ('SUBSCRIPTION_EXPIRING', 'Subscription Expiring'),
        ('SHOWCASE_ORDER',        'Showcase Order'),
        ('SHOWCASE_DELIVERED',    'Showcase Delivered'),
        ('LEVEL_UP',              'Level Up'),
        ('REVIEW_RECEIVED',       'Review Received'),
    ]

    recipient          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    sender             = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sent_notifications',
    )
    notification_type  = models.CharField(max_length=30, choices=TYPES)
    title              = models.CharField(max_length=200)
    body               = models.TextField()
    data               = models.JSONField(default=dict)
    is_read            = models.BooleanField(default=False)
    fcm_sent           = models.BooleanField(default=False)
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.recipient.username} — {self.notification_type}'