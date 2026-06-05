from django.urls import path
from . import views

urlpatterns = [
    path('my-passport/',  views.my_passport_view),
    path('badges/',       views.badges_view),
    path('transactions/', views.transactions_view),
    path('leaderboard/',  views.leaderboard_view),
    path('stats/',        views.stats_view),
    path('check-badges/', views.check_badges_view),
]