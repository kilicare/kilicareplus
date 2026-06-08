from django.urls import path
from . import views

urlpatterns = [
    # Users
    path('users/',                           views.users_list_view),
    path('users/<int:user_id>/role/',        views.change_role_view),
    path('users/<int:user_id>/points/',      views.award_points_view),
    path('users/<int:user_id>/suspend/',     views.suspend_user_view),

    # Moderation
    path('moderation/moments/',              views.moderation_moments_view),
    path('moderation/moments/<int:moment_id>/', views.moment_action_view),
    path('moderation/tips/',                 views.tips_queue_view),
    path('moderation/tips/<int:tip_id>/verify/', views.verify_tip_view),

    # Stats
    path('sos/statistics/',                  views.sos_statistics_view),
    path('revenue/',                         views.revenue_stats_view),
    path('platform-stats/',                  views.platform_stats_view),
    path('guide-performance/',                views.guide_performance_view),

    # Landing Page Configuration
    path('landing-page/upload-image/',       views.upload_image_view),
    path('landing-page/config/',             views.landing_page_config_view),
    path('landing-page/config/update/',      views.update_landing_page_config_view),

    # Public Stats (for landing page)
    path('public-stats/',                    views.public_stats_view),
    path('public-testimonials/',             views.public_testimonials_view),

    # Testimonials Management (Admin)
    path('testimonials/',                    views.admin_testimonials_view),
    path('testimonials/<int:testimonial_id>/', views.admin_testimonial_detail_view),
]