from django.db import models
from django.conf import settings


class Moment(models.Model):
    VISIBILITY = [
        ('PUBLIC', 'Public'),
        ('FOLLOWERS', 'Followers'),
        ('PRIVATE', 'Private'),
    ]

    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='moments',
    )
    caption = models.TextField(max_length=500, null=True, blank=True)
    location = models.CharField(max_length=200, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    views = models.PositiveIntegerField(default=0)
    shares = models.PositiveIntegerField(default=0)
    trending_score = models.FloatField(default=0.0)
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    visibility = models.CharField(
        max_length=15, choices=VISIBILITY, default='PUBLIC'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.posted_by.username} — {self.created_at:%Y-%m-%d}'

    def like_count(self):
        return self.likes.count()


class MomentMedia(models.Model):
    MEDIA_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
    ]

    moment = models.ForeignKey(
        Moment,
        on_delete=models.CASCADE,
        related_name='media_items',
    )
    media_type = models.CharField(
        max_length=10,
        choices=MEDIA_TYPE_CHOICES,
    )
    url = models.URLField(max_length=500)
    public_id = models.CharField(max_length=255)
    duration = models.FloatField(null=True, blank=True, help_text="Duration in seconds for audio/video")
    width = models.IntegerField(null=True, blank=True, help_text="Width in pixels for image/video")
    height = models.IntegerField(null=True, blank=True, help_text="Height in pixels for image/video")
    file_size = models.BigIntegerField(null=True, blank=True, help_text="File size in bytes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.media_type} — {self.public_id}'


class MomentLike(models.Model):
    moment = models.ForeignKey(
        Moment, on_delete=models.CASCADE, related_name='likes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('moment', 'user')


class MomentSave(models.Model):
    moment = models.ForeignKey(
        Moment, on_delete=models.CASCADE, related_name='saves'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('moment', 'user')
