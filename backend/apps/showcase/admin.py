from django.contrib import admin
from .models import VirtualShowcase, ShowcaseItem, ShowcaseOrder


@admin.register(VirtualShowcase)
class ShowcaseAdmin(admin.ModelAdmin):
    list_display = ['owner', 'title', 'is_active', 'total_views']


@admin.register(ShowcaseItem)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'showcase', 'price', 'is_available', 'views']
    list_filter = ['category', 'is_available']


@admin.register(ShowcaseOrder)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'buyer', 'item', 'total_amount', 'status', 'created_at',
    ]
    list_filter = ['status']