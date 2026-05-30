from django.contrib import admin
from .models import Moment, MomentLike, MomentComment, MomentSave


@admin.register(Moment)
class MomentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'posted_by', 'media_type',
        'views', 'trending_score', 'created_at',
    ]
    list_filter = ['media_type', 'visibility', 'is_featured']
    search_fields = ['posted_by__username', 'caption']


@admin.register(MomentComment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'moment', 'text', 'created_at']