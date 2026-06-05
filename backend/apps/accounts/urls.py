from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.register_view),
    path('login/', views.login_view),
    path('refresh/', views.token_refresh_view),  # Custom view for cookie-based refresh
    path('logout/', views.logout_view),  # Custom view for cookie-based logout
    
    # OTP Management
    path('otp/send/', views.send_otp_view),
    path('otp/verify/', views.verify_otp_view),
    
    # Forgot Password Flow (New 3-Step Process)
    path('forgot-password/', views.forgot_password_view),
    path('verify-forgot-otp/', views.verify_forgot_otp_view),
    path('reset-password/', views.reset_password_view),
    
    # Legacy Password Reset (kept for compatibility)
    path('password/reset/', views.password_reset_view),
    path('password/confirm/', views.password_confirm_view),
    
    # User Profile
    path('me/', views.me_view),
    path('users/<str:username>/profile/', views.public_profile_view),
    path('check-username/', views.check_username_view),
    path('fcm-token/', views.update_fcm_token_view),
]