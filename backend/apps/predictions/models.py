from django.db import models
from django.conf import settings
import json

class Match(models.Model):
    """
    Match predictions from FastAPI predictor.
    These are system-wide match predictions, NOT user-specific.
    """
    
    LEAGUE_CHOICES = [
        ('EPL', 'English Premier League'),
        ('LA_LIGA', 'La Liga'),
        ('BUNDESLIGA', 'Bundesliga'),
    ]
    
    RESULT_CHOICES = [
        ('1', 'Home Win'),
        ('X', 'Draw'),
        ('2', 'Away Win'),
    ]
    
    # External ID from predictor (e.g., football-data.org ID)
    external_id = models.CharField(max_length=100, unique=True, db_index=True)
    
    # League
    league = models.CharField(max_length=50, choices=LEAGUE_CHOICES)
    
    # Teams
    home_team = models.CharField(max_length=100)
    away_team = models.CharField(max_length=100)
    home_team_logo = models.URLField(blank=True, null=True)
    away_team_logo = models.URLField(blank=True, null=True)
    
    # Match timing
    scheduled_at = models.DateTimeField(db_index=True)
    
    # Predictions (probabilities 0-1)
    home_win_prob = models.FloatField(null=True, blank=True)
    draw_prob = models.FloatField(null=True, blank=True)
    away_win_prob = models.FloatField(null=True, blank=True)
    
    # Betting predictions
    over_25_prob = models.FloatField(null=True, blank=True)  # Over 2.5 goals
    btts_prob = models.FloatField(null=True, blank=True)     # Both teams to score
    
    # Value bet signal
    value_bet = models.CharField(max_length=50, blank=True)  # e.g., "1", "X", "2", "Over2.5", etc.
    signal_category = models.CharField(max_length=50, blank=True)
    confidence = models.FloatField(null=True, blank=True)    # 0-1
    
    # RESULT TRACKING
    prediction_result = models.CharField(max_length=10, blank=True, choices=RESULT_CHOICES, help_text="What the AI predicted")
    actual_result = models.CharField(max_length=10, blank=True, choices=RESULT_CHOICES, help_text="What actually happened")
    prediction_correct = models.BooleanField(null=True, blank=True)
    
    # All predictor data (JSON for extensibility)
    predictor_data = models.JSONField(default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-scheduled_at']
        indexes = [
            models.Index(fields=['league', 'scheduled_at']),
            models.Index(fields=['external_id']),
            models.Index(fields=['prediction_correct']),
        ]
    
    def __str__(self):
        return f"{self.home_team} vs {self.away_team} ({self.league})"


class UserPrediction(models.Model):
    """
    User-specific predictions created through AI Chat or predictions endpoints.
    Tracks user predictions, feedback, and analysis history.
    """
    
    LEAGUE_CHOICES = [
        ('EPL', 'English Premier League'),
        ('LA_LIGA', 'La Liga'),
        ('BUNDESLIGA', 'Bundesliga'),
    ]
    
    FEEDBACK_CHOICES = [
        ('1', 'Home Win'),
        ('X', 'Draw'),
        ('2', 'Away Win'),
    ]
    
    # User
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='predictions')
    
    # Match info
    league = models.CharField(max_length=50, choices=LEAGUE_CHOICES, db_index=True)
    home_team = models.CharField(max_length=100)
    away_team = models.CharField(max_length=100)
    
    # Prediction data from predictor
    prediction_data = models.JSONField(default=dict, blank=True)
    
    # User feedback (actual match result)
    user_feedback = models.CharField(max_length=10, blank=True, choices=FEEDBACK_CHOICES)
    user_feedback_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)  # Soft delete
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['league', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.home_team} vs {self.away_team}"
