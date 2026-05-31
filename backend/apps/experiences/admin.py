from django.contrib import admin
from .models import Experience, ExperienceMedia


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'local', 'category',
        'today_moment_active', 'is_active', 'views',
    ]
    list_filter = ['category', 'is_active', 'today_moment_active']
    search_fields = ['title', 'local__username']

    def toggle_today(self, request, queryset):
        for exp in queryset:
            exp.today_moment_active = not exp.today_moment_active
            exp.save()
    toggle_today.short_description = 'Toggle Today Active'