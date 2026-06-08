# Generated migration to remove COMMENT notification type

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('LIKE', 'Like'),
                    ('FOLLOW', 'Follow'),
                    ('SOS_RESPONSE', 'SOS Response'),
                    ('BOOKING_REQUEST', 'Booking Request'),
                    ('BOOKING_CONFIRMED', 'Booking Confirmed'),
                    ('BOOKING_COMPLETED', 'Booking Completed'),
                    ('PAYMENT_RECEIVED', 'Payment Received'),
                    ('BADGE_UNLOCK', 'Badge Unlock'),
                    ('POINTS_AWARDED', 'Points Awarded'),
                    ('TIP_VERIFIED', 'Tip Verified'),
                    ('NEW_MESSAGE', 'New Message'),
                    ('SUBSCRIPTION_EXPIRING', 'Subscription Expiring'),
                    ('SHOWCASE_ORDER', 'Showcase Order'),
                    ('SHOWCASE_DELIVERED', 'Showcase Delivered'),
                    ('LEVEL_UP', 'Level Up'),
                    ('REVIEW_RECEIVED', 'Review Received'),
                ],
                max_length=30
            ),
        ),
    ]
