from django.db import models
from django.conf import settings


class B2BClient(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='b2b_profile',
    )
    company_name = models.CharField(max_length=200)
    company_type = models.CharField(
        max_length=50,
        choices=[
            ('HOTEL', 'Hotel'),
            ('SAFARI', 'Safari Company'),
            ('BOARD', 'Tourism Board'),
            ('AIRLINE', 'Airline'),
            ('OTHER', 'Other'),
        ],
        default='HOTEL',
    )
    location = models.CharField(max_length=200)
    contact_email = models.EmailField()
    is_verified = models.BooleanField(default=False)
    subscription_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.company_name} ({self.company_type})'