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


    # Testimonials Management (Admin)
    path('testimonials/',                    views.admin_testimonials_view),
    path('testimonials/<int:testimonial_id>/', views.admin_testimonial_detail_view),

    # Payments & Subscriptions (Admin)
    path('subscriptions/',                   views.admin_subscriptions_list_view),
    path('subscriptions/<int:subscription_id>/', views.admin_subscription_detail_view),
    path('subscriptions/activate/',          views.admin_subscription_activate_view),
    path('subscriptions/<int:subscription_id>/cancel/', views.admin_subscription_cancel_view),
    path('subscriptions/<int:subscription_id>/extend/', views.admin_subscription_extend_view),
    path('payments/',                        views.admin_payments_list_view),
    path('payments/<int:payment_id>/',       views.admin_payment_detail_view),
    path('payments/<int:payment_id>/refund/', views.admin_payment_refund_view),
    path('payments/revenue-stats/',          views.admin_payments_revenue_stats_view),
]