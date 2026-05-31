from django.db import models
from django.conf import settings


class Tip(models.Model):
    CATEGORY_CHOICES = [
        ('SAFETY', 'Safety'),
        ('LIFESTYLE', 'Lifestyle'),
        ('NAVIGATION', 'Navigation'),
        ('EXPERIENCE', 'Experience'),
        ('ACCESSIBILITY', 'Accessibility'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default='LIFESTYLE'
    )
    sub_topics = models.JSONField(default=list)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_address = models.CharField(
        max_length=300, null=True, blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    trust_score = models.FloatField(default=50.0)
    upvotes = models.PositiveIntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-trust_score', '-created_at']

    def __str__(self):
        return f'{self.category}: {self.title}'


class TipUpvote(models.Model):
    tip = models.ForeignKey(
        Tip, on_delete=models.CASCADE, related_name='upvote_set'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tip', 'user')


class TipReport(models.Model):
    REASON_CHOICES = [
        ('INACCURATE', 'Inaccurate'),
        ('SPAM', 'Spam'),
        ('INAPPROPRIATE', 'Inappropriate'),
        ('OUTDATED', 'Outdated'),
    ]
    tip = models.ForeignKey(
        Tip, on_delete=models.CASCADE, related_name='reports'
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)