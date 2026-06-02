from django.urls import path
from . import views

urlpatterns = [
    path('users/', views.users_list_view),
    path('users/<int:user_id>/role/', views.change_role_view),
    path('users/<int:user_id>/points/', views.award_points_view),
    path('users/<int:user_id>/suspend/', views.suspend_user_view),
    path('moderation/moments/', views.moderation_moments_view),
    path('moderation/moments/<int:moment_id>/', views.moment_action_view),
    path('moderation/tips/', views.tips_queue_view),
    path('moderation/tips/<int:tip_id>/verify/', views.verify_tip_view),
    path('sos/statistics/', views.sos_statistics_view),
    path('revenue/', views.revenue_stats_view),
]