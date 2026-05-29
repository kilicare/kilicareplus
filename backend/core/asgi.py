import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE', 'core.settings.development'
)

django_asgi_app = get_asgi_application()

from apps.messaging.routing import websocket_urlpatterns as chat_ws
from apps.sos.routing import websocket_urlpatterns as sos_ws
from apps.notifications.routing import websocket_urlpatterns as notif_ws

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(chat_ws + sos_ws + notif_ws)
        )
    ),
})