from django.db import models
from django.conf import settings
from django.utils import timezone


class PassportProfile(models.Model):
    LEVEL_CHOICES = [
        ('EXPLORER',   'Explorer'),
        ('ADVENTURER', 'Adventurer'),
        ('GUARDIAN',   'Guardian'),
        ('LEGEND',     'Legend'),
    ]

    user        = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passport',
    )
    points      = models.PositiveIntegerField(default=50)
    level       = models.CharField(
        max_length=15, choices=LEVEL_CHOICES, default='EXPLORER'
    )
    trust_score = models.FloatField(default=50.0)
    total_days  = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    qr_code     = models.TextField(blank=True, null=True)
    achievement_stamps = models.JSONField(default=list, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} — {self.level} ({self.points} pts)'

    def recalculate_level(self):
        if self.points >= 5000:
            self.level = 'LEGEND'
        elif self.points >= 2000:
            self.level = 'GUARDIAN'
        elif self.points >= 500:
            self.level = 'ADVENTURER'
        else:
            self.level = 'EXPLORER'
        self.save(update_fields=['points', 'level', 'trust_score'])

    def award_points(self, action_type: str, extra_pts: int = 0):
        from apps.passport.services import award_points_to_user
        return award_points_to_user(self.user, action_type, extra_pts)


class PointsTransaction(models.Model):
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='point_transactions',
        db_index=True,
    )
    action_type   = models.CharField(max_length=50, db_index=True)
    points_change = models.IntegerField()
    balance_after = models.PositiveIntegerField()
    description   = models.CharField(max_length=200)
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action_type', 'created_at']),
        ]

    def __str__(self):
        return f'{self.user.username}: {self.points_change:+d} ({self.action_type})'


class Badge(models.Model):
    BADGE_TYPE_CHOICES = [
        ('MILESTONE', 'Milestone'),
        ('ACHIEVEMENT', 'Achievement'),
        ('SPECIAL', 'Special'),
    ]
    
    name             = models.CharField(max_length=100, unique=True)
    description      = models.TextField()
    icon             = models.CharField(max_length=10)
    criteria_points  = models.IntegerField(default=0)
    badge_type       = models.CharField(
        max_length=15, choices=BADGE_TYPE_CHOICES, default='MILESTONE'
    )
    is_active        = models.BooleanField(default=True)

    class Meta:
        ordering = ['criteria_points']

    def __str__(self):
        return f'{self.icon} {self.name}'


class UserBadge(models.Model):
    user        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_badges',
    )
    badge       = models.ForeignKey(
        Badge, on_delete=models.CASCADE
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')
        ordering = ['-unlocked_at']

    def __str__(self):
        return f'{self.user.username} — {self.badge.name}'