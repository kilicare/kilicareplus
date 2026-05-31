from django.contrib import admin
from .models import Booking, BookingReview


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'tourist', 'guide', 'title',
        'amount', 'status', 'scheduled_date', 'created_at',
    ]
    list_filter = ['status', 'payment_method']
    search_fields = ['tourist__email', 'guide__email', 'title']


@admin.register(BookingReview)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['reviewer', 'booking', 'rating', 'created_at']
    list_filter = ['rating']