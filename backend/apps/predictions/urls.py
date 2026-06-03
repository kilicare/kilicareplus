from django.urls import path
from . import views

urlpatterns = [
    # Existing
    path('today/', views.predictions_today_view, name='predictions-today'),
    path('upcoming/', views.predictions_upcoming_view, name='predictions-upcoming'),
    path('accuracy/', views.accuracy_stats_view, name='predictions-accuracy'),
    path('leagues/', views.leagues_view, name='predictions-leagues'),
    
    # NEW - Custom predictions
    path('generate/', views.generate_prediction_view, name='predictions-generate'),
    path('history/', views.prediction_history_view, name='predictions-history'),
    path('<int:prediction_id>/feedback/', views.prediction_feedback_view, name='predictions-feedback'),
    path('analytics/', views.prediction_analytics_view, name='predictions-analytics'),
    
    # NEW - AI Analysis (Premium)
    path('ai-analyze/', views.ai_predict_analyze_view, name='predictions-ai-analyze'),
] 
