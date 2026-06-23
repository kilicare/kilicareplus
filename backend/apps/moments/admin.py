from django.contrib import admin
from .models import Moment, MomentMedia, MomentLike, MomentSave


class MomentMediaInline(admin.TabularInline):
    model = MomentMedia
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Moment)
class MomentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'posted_by', 'media_count',
        'views', 'trending_score', 'created_at',
    ]
    list_filter = ['visibility', 'is_featured']
    search_fields = ['posted_by__username', 'caption']
    inlines = [MomentMediaInline]
    fieldsets = (
        ('Poster', {
            'fields': ('posted_by',)
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

    def media_count(self, obj):
        return obj.media_items.count()
    media_count.short_description = 'Media Items'


