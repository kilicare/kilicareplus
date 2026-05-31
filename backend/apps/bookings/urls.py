from django.urls import path
from . import views

urlpatterns = [
    path('', views.create_booking_view),
    path('my-bookings/', views.my_bookings_view),
    path('guide-bookings/', views.guide_bookings_view),
    path('<int:pk>/', views.booking_detail_view),
    path('<int:pk>/<str:action>/', views.booking_action_view),
    path('<int:pk>/review/', views.add_review_view),
]