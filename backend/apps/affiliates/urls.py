from django.urls import path
from . import views

urlpatterns = [
    path('', views.affiliates_list_view, name='affiliates-list'),
    path('<int:affiliate_id>/click/', views.affiliate_click_view, name='affiliate-click'),
] 
