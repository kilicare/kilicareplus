from django.urls import path
from . import views

urlpatterns = [
    path('my-alerts/', views.my_alerts_view),
    path('active/', views.active_alerts_view),
    path('statistics/', views.statistics_view),
]