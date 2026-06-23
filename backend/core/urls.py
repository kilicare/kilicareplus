
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health(request):
    return JsonResponse({
        "status": "ok",
        "service": "kilicareplus"
    })

urlpatterns = [
    path('', health),
    path('django-admin/', admin.site.urls),
    path('auth/', include('apps.accounts.urls')),
    path('api/moments/', include('apps.moments.urls')),
    path('api/ai/', include('apps.ai_chat.urls')),
    path('api/chat/', include('apps.messaging.urls')),
    path('api/sos/', include('apps.sos.urls')),
    path('api/tips/', include('apps.map_tips.urls')),
    path('api/experiences/', include('apps.experiences.urls')),
    path('api/subscriptions/', include('apps.subscriptions.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/showcase/', include('apps.showcase.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/passport/', include('apps.passport.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/follow/', include('apps.follow.urls')),
    path('api/predictions/', include('apps.predictions.urls')),
    path('api/affiliates/', include('apps.affiliates.urls')),
    path('api/b2b/', include('apps.b2b.urls')),
    path('api/admin-ops/', include('apps.admin_ops.urls')),
    path('api/admin/', include('apps.admin_ops.urls')),
    path('api/moderation/', include('apps.moderation.urls')),
    path('api/settings/', include('apps.settings.urls')),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL, document_root=settings.MEDIA_ROOT
    )