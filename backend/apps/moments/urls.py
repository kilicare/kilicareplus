from django.urls import path
from . import views

urlpatterns = [
    path('feed/', views.feed_view),
    path('trending/', views.trending_view),
    path('', views.create_moment_view),
    path('<int:pk>/', views.moment_detail_view),
    path('<int:pk>/like/', views.like_view),
    path('<int:pk>/comment/', views.comment_view),
    path('<int:pk>/comments/', views.comments_view),
    path('<int:pk>/save/', views.save_view),
    path('<int:pk>/delete/', views.delete_moment_view),
    path('my-moments/', views.my_moments_view),
    path('saved/', views.saved_moments_view),
]