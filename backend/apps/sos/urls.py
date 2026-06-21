from django.urls import path
from . import views

urlpatterns = [
    path('my-alerts/', views.my_alerts_view),
    path('active/', views.active_alerts_view),
    path('statistics/', views.statistics_view),
    
    # Admin SOS Operations
    path('admin/all/', views.admin_all_alerts_view),
    path('admin/<int:alert_id>/resolve/', views.admin_resolve_sos_view),
    path('admin/<int:alert_id>/cancel/', views.admin_cancel_sos_view),
    path('admin/<int:alert_id>/escalate/', views.admin_escalate_sos_view),
    path('admin/<int:alert_id>/reassign/', views.admin_reassign_primary_view),
    
    # Geospatial
    path('nearby-guides/', views.nearby_guides_view),
    
    # Response and Chat Integration
    path('<int:alert_id>/responses/', views.alert_responses_view),
    path('<int:alert_id>/chat-room/', views.alert_chat_room_view),
    
    # Timeline
    path('<int:alert_id>/timeline/', views.alert_timeline_view),
    
    # Guide Lifecycle
    path('<int:alert_id>/guide/respond/', views.guide_create_response_view),
    path('<int:alert_id>/guide/accept/', views.guide_accept_assignment_view),
    path('<int:alert_id>/guide/update-status/', views.guide_update_status_view),
]