from django.contrib import admin
from .models import SOSAlert, SOSResponse


@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'severity', 'status',
        'responder_count', 'created_at',
    ]
    list_filter = ['severity', 'status']
    search_fields = ['user__email']


@admin.register(SOSResponse)
class SOSResponseAdmin(admin.ModelAdmin):
    list_display = ['responder', 'alert', 'eta_minutes', 'is_onsite']