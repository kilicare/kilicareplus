from django.urls import path
from . import views

urlpatterns = [
    path('', views.experiences_list_view),
    path('today/', views.today_experiences_view),
    path('create/', views.create_experience_view),
    path('<int:pk>/', views.experience_detail_view),
    path('<int:pk>/toggle-today/', views.toggle_today_view),
    path('my-experiences/', views.my_experiences_view),
]