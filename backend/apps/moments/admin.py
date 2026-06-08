from django.contrib import admin
from .models import Moment, MomentLike, MomentSave


@admin.register(Moment)
class MomentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'posted_by', 'media_type',
        'views', 'trending_score', 'created_at',
    ]
    list_filter = ['media_type', 'visibility', 'is_featured']
    search_fields = ['posted_by__username', 'caption']
    fieldsets = (
        ('Poster', {
            'fields': ('posted_by',)
        }),
        ('Media', {
            'fields': ('media', 'media_type', 'thumbnail'),
            'description': 'The main media (image or video) for this moment'
        }),
        ('Audio', {
            'fields': ('audio',),
            'description': 'Optional background music - leave blank if not needed',
            'classes': ('collapse',)
        }),
        ('Details', {
            'fields': ('caption', 'location', 'latitude', 'longitude')
        }),
        ('Engagement', {
            'fields': ('views', 'shares', 'trending_score'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('visibility', 'is_verified', 'is_featured')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'trending_score', 'views', 'shares']


