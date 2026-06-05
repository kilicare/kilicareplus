from django.urls import path
from . import views

urlpatterns = [
    # User reports
    path('create/', views.create_report_view),
    path('my-reports/', views.my_reports_view),
    
    # Admin moderation
    path('queue/', views.moderation_queue_view),
    path('stats/', views.moderation_stats_view),
    path('report/<int:report_id>/moderate/', views.moderate_report_view),
    path('bulk-moderate/', views.bulk_moderate_view),
    path('history/', views.moderation_history_view),
]
