from django.urls import path
from . import views

urlpatterns = [
    path('plans/', views.plans_list_view),
    path('my-subscription/', views.my_subscription_view),
    path('start-trial/', views.start_trial_view),
    path('activate/', views.activate_view),
    path('cancel/', views.cancel_view),
    path('payment-history/', views.payment_history_view),
]