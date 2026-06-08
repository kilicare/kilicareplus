from django.contrib import admin
from .models import AuditLog, BettingPredictionRecord, LandingPageConfig


@admin.register(LandingPageConfig)
class LandingPageConfigAdmin(admin.ModelAdmin):
    list_display = ['updated_at', 'updated_by']
    readonly_fields = ['updated_at', 'updated_by']
    fieldsets = (
        ('CTA Section', {
            'fields': ('cta_background_image',)
        }),
        ('Experience Cards', {
            'fields': ('serengeti_image', 'kilimanjaro_image', 'zanzibar_image', 'ngorongoro_image')
        }),
        ('Metadata', {
            'fields': ('updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
