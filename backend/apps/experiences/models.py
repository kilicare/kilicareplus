from django.db import models
from django.conf import settings


class Experience(models.Model):
    CATEGORY_CHOICES = [
        ('Safari', 'Safari'),
        ('Food', 'Food & Drink'),
        ('Culture', 'Culture'),
        ('Nightlife', 'Night Life'),
        ('Beach', 'Beach'),
        ('Adventure', 'Adventure'),
        ('Art', 'Art & Craft'),
    ]

    local = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='experiences',
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=300)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES
    )
    price_range = models.CharField(max_length=100, null=True, blank=True)
    price_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    price_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    today_moment_active = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    subscription_required = models.CharField(
        max_length=25, default='FREE'
    )
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.local.username}'


class ExperienceMedia(models.Model):
    experience = models.ForeignKey(
        Experience, on_delete=models.CASCADE, related_name='media'
    )
    file = models.ImageField(upload_to='experiences/')
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']