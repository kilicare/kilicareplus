from django.urls import path
from . import views

urlpatterns = [
    path('<int:user_id>/toggle/',   views.toggle_follow_view),
    path('<int:user_id>/followers/', views.followers_list_view),
    path('<int:user_id>/following/', views.following_list_view),
    path('<int:user_id>/check/',    views.check_follow_view),
]