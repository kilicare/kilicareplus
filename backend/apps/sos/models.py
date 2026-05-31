import math
from django.db import models
from django.conf import settings


class SOSAlert(models.Model):
    SEVERITY = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    STATUS = [
        ('ACTIVE', 'Active'),
        ('RESPONDING', 'Responding'),
        ('RESOLVED', 'Resolved'),
        ('CANCELLED', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sos_alerts',
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    location_address = models.CharField(
        max_length=500, null=True, blank=True
    )
    severity = models.CharField(
        max_length=10, choices=SEVERITY, default='HIGH'
    )
    status = models.CharField(
        max_length=15, choices=STATUS, default='ACTIVE'
    )
    message = models.TextField(null=True, blank=True)
    responder_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f'SOS {self.severity} — {self.user.username} '
            f'({self.status})'
        )


class SOSResponse(models.Model):
    alert = models.ForeignKey(
        SOSAlert, on_delete=models.CASCADE, related_name='responses'
    )
    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    message = models.TextField()
    eta_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_onsite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.responder.username} → Alert {self.alert.id}'