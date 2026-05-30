from django.db import models
from django.conf import settings


class Moment(models.Model):
    MEDIA_CHOICES = [('image', 'Image'), ('video', 'Video')]
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
    media = models.FileField(upload_to='moments/')
    media_type = models.CharField(
        max_length=10, choices=MEDIA_CHOICES, default='image'
    )
    thumbnail = models.ImageField(
        upload_to='thumbnails/', null=True, blank=True
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

    def comment_count(self):
        return self.comments.count()


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


class MomentComment(models.Model):
    moment = models.ForeignKey(
        Moment, on_delete=models.CASCADE, related_name='comments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    text = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.user.username}: {self.text[:30]}'


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