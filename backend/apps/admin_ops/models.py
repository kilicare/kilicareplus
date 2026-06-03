from django.db import models
from django.conf import settings


class BettingPredictionRecord(models.Model):
    """
    Track all betting predictions made by users through AI Chat.
    Used for analytics, audit trails, and deletion history.
    
    This replaces UserPrediction as the source-of-truth for prediction history.
    Predictions are never deleted, only marked as deleted_at (soft delete).
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='betting_predictions_records'
    )
    
    # Prediction details
    home_team = models.CharField(max_length=100)
    away_team = models.CharField(max_length=100)
    league = models.CharField(max_length=50)
    
    # Original user query (for audit trail)
    original_query = models.TextField(blank=True)
    
    # AI Chat context
    ai_message_id = models.CharField(max_length=50, blank=True, help_text="Link to AIMessage for context")
    ai_thread_id = models.CharField(max_length=50, blank=True, help_text="Link to AIThread for conversation")
    
    # Prediction data (from predictor engine)
    prediction_data = models.JSONField(default=dict, blank=True)
    
    # Soft delete tracking (for analytics)
    deleted_at = models.DateTimeField(null=True, blank=True, help_text="Null = not deleted, timestamp = deleted")
    delete_reason = models.CharField(max_length=200, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['user', 'league']),
            models.Index(fields=['deleted_at']),  # For analytics queries
        ]
    
    def __str__(self):
        status = 'deleted' if self.deleted_at else 'active'
        return f"{self.user.email} — {self.home_team} vs {self.away_team} [{status}]"
    
    def soft_delete(self, reason: str = "User deleted"):
        """Soft delete by recording deletion timestamp"""
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.delete_reason = reason
        self.save(update_fields=['deleted_at', 'delete_reason', 'updated_at'])
