from django.urls import path
from . import views

urlpatterns = [
    path('', views.showcases_list_view),
    path('my-showcase/', views.my_showcase_view),
    path('my-showcase/items/', views.add_item_view),
    path('my-showcase/items/<int:item_id>/', views.item_detail_view),
    path('<str:username>/', views.showcase_detail_view),
    path('orders/create/', views.create_order_view),
    path('orders/<int:order_id>/<str:action>/', views.order_action_view),
    path('orders/my-orders/', views.my_orders_view),
    path('orders/my-sales/', views.my_sales_view),
]