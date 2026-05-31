from django.urls import path
from . import views

urlpatterns = [
    path('', views.tips_list_view),
    path('create/', views.create_tip_view),
    path('<int:pk>/upvote/', views.upvote_tip_view),
    path('<int:pk>/report/', views.report_tip_view),
    path('nearby/', views.nearby_tips_view),
    path('trending/', views.trending_tips_view),
    path('my-tips/', views.my_tips_view),
]