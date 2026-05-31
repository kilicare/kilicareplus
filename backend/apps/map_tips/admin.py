from django.contrib import admin
from .models import Tip, TipUpvote, TipReport


@admin.register(Tip)
class TipAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'category', 'created_by',
        'upvotes', 'trust_score', 'is_verified',
    ]
    list_filter = ['category', 'is_verified']
    search_fields = ['title', 'description']
    actions = ['verify_tips']

    def verify_tips(self, request, queryset):
        queryset.update(is_verified=True)
    verify_tips.short_description = 'Thibitisha tips zilizochaguliwa'