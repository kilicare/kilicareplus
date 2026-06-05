from django.urls import path
from . import views

urlpatterns = [
    path('',              views.notifications_list_view),
    path('sync/',         views.notifications_sync_view),
    path('<int:pk>/read/', views.mark_read_view),
    path('read-all/',     views.mark_all_read_view),
    path('unread-count/', views.unread_count_view),
]