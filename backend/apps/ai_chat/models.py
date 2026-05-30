from django.db import models
from django.conf import settings


class AIThread(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_threads',
    )
    title = models.CharField(max_length=200, default='Mazungumzo Mapya')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.user.username} — {self.title}'


class AIMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    thread = models.ForeignKey(
        AIThread, on_delete=models.CASCADE, related_name='messages'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    image_url = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class UserAIPreference(models.Model):
    LANG_CHOICES = [('sw', 'Kiswahili'), ('en', 'English')]
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_preference',
    )
    preferred_language = models.CharField(
        max_length=3, choices=LANG_CHOICES, default='sw'
    )
    daily_message_count = models.IntegerField(default=0)
    last_reset_date = models.DateField(auto_now_add=True)

    def reset_if_needed(self):
        from django.utils import timezone
        today = timezone.now().date()
        if self.last_reset_date != today:
            self.daily_message_count = 0
            self.last_reset_date = today
            self.save(update_fields=['daily_message_count', 'last_reset_date'])

    def can_send_message(self, is_premium: bool) -> bool:
        self.reset_if_needed()
        if is_premium:
            return True
        return self.daily_message_count < 20