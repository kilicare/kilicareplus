from django.urls import path
from . import views

urlpatterns = [
    path('contacts/', views.contacts_view),
    path('start-dm/', views.start_dm_view),
    path('<str:room_name>/', views.room_messages_view),
]