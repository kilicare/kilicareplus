from django.urls import path
from . import views

urlpatterns = [
    # System predictions (available to all users)
    path('today/', views.predictions_today_view, name='predictions-today'),
    path('upcoming/', views.predictions_upcoming_view, name='predictions-upcoming'),
    path('accuracy/', views.accuracy_stats_view, name='predictions-accuracy'),
    path('leagues/', views.leagues_view, name='predictions-leagues'),
    
    # Team validation (used by AI Chat betting endpoints)
    path('teams/', views.team_suggestions_view, name='predictions-teams'),
] 
