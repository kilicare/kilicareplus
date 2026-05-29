from django.db import models
from django.conf import settings


class PassportProfile(models.Model):
    LEVEL_CHOICES = [
        ('EXPLORER', 'Explorer'),
        ('ADVENTURER', 'Adventurer'),
        ('GUARDIAN', 'Guardian'),
        ('LEGEND', 'Legend'),
    ]
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passport',
    )
    trust_score = models.FloatField(default=50.0)
    points = models.PositiveIntegerField(default=50)
    level = models.CharField(
        max_length=15, choices=LEVEL_CHOICES, default='EXPLORER'
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} — {self.level}'

    def recalculate_level(self):
        if self.points >= 5000:
            self.level = 'LEGEND'
        elif self.points >= 2000:
            self.level = 'GUARDIAN'
        elif self.points >= 500:
            self.level = 'ADVENTURER'
        else:
            self.level = 'EXPLORER'
        self.save(update_fields=['level', 'updated_at'])

    def award_points(self, action_type: str, description: str = ''):
        from .services import POINT_ACTIONS
        points = POINT_ACTIONS.get(action_type, 0)
        if points <= 0:
            return 0
        old_level = self.level
        self.points += points
        self.recalculate_level()
        PointsTransaction.objects.create(
            user=self.user,
            action_type=action_type,
            points_change=points,
            balance_after=self.points,
            description=description
            or action_type.replace('_', ' ').title(),
        )
        if self.level != old_level:
            try:
                from apps.notifications.utils import create_notification
                create_notification(
                    recipient=self.user,
                    notification_type='LEVEL_UP',
                    title=f'🎉 Level up! {self.level}',
                    body=(
                        f'Hongera! Uko kwenye kiwango cha {self.level}'
                    ),
                    data={'level': self.level},
                )
            except Exception:
                pass
        return points


class PointsTransaction(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    action_type = models.CharField(max_length=50)
    points_change = models.IntegerField()
    balance_after = models.PositiveIntegerField()
    description = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        sign = '+' if self.points_change > 0 else ''
        return (
            f'{self.user.username}: '
            f'{sign}{self.points_change} pts'
        )


class Badge(models.Model):
    BADGE_TYPE = [
        ('MILESTONE', 'Milestone'),
        ('ACHIEVEMENT', 'Achievement'),
        ('SPECIAL', 'Special'),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=10)
    criteria_points = models.PositiveIntegerField()
    badge_type = models.CharField(
        max_length=15, choices=BADGE_TYPE, default='MILESTONE'
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.icon} {self.name}'


class UserBadge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')