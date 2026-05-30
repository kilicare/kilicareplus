from django.contrib import admin
from .models import AIThread, AIMessage, UserAIPreference


@admin.register(AIThread)
class AIThreadAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'updated_at']
    search_fields = ['user__email', 'title']


@admin.register(UserAIPreference)
class AIPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'preferred_language', 'daily_message_count']