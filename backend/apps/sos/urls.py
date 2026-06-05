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
    path('admin/<int:alert_id>/priority/', views.admin_set_priority_view),
    
    # Geospatial
    path('nearby-guides/', views.nearby_guides_view),
]