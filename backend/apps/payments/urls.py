from django.urls import path
from . import views

urlpatterns = [
    path('mpesa/stk-push/', views.mpesa_stk_push_view),
    path('mpesa/query/', views.mpesa_query_view),
    path('mpesa/callback/', views.mpesa_callback_view),
    path('mpesa/create-pending/', views.create_pending_payment_view),
]