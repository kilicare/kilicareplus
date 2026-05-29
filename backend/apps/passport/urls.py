from django.urls import path
from . import views

urlpatterns = [
    path('my-passport/', views.my_passport_view),
    path('transactions/', views.my_transactions_view),
    path('badges/', views.my_badges_view),
    path('leaderboard/', views.leaderboard_view),
    path('stats/', views.my_stats_view),
]