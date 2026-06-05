from urllib.parse import parse_qs, urlparse
import logging
import redis
import environ

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # 1. Enforce origin checks
        if not self.check_origin(scope):
            logger.warning("[WS Handshake] Rejected due to origin mismatch")
            await send({"type": "websocket.close", "code": 4403})
            return

        scope['user'] = scope.get('user', AnonymousUser())
        query_string = scope.get('query_string', b'')

        token = None
        if query_string:
            query_params = parse_qs(query_string.decode(errors='ignore'))
            token_values = query_params.get('kili_access_token') or query_params.get('token') or []
            if token_values:
                token = token_values[0]

        # 2. Token signature validation (server-side only, reject malformed)
        if token:
            user = await self.get_user_from_token(token)
            if user is not None:
                scope['user'] = user

        # 3. Prevent anonymous connections
        if not scope['user'].is_authenticated:
            logger.warning("[WS Handshake] Anonymous connection rejected")
            await send({"type": "websocket.close", "code": 4401})
            return

        # 4. Rate limit connections per user using Redis (max 5 connections per 10s)
        user_id = scope['user'].id
        is_limited = await self.rate_limit_connection(user_id)
        if is_limited:
            logger.warning(f"[WS Handshake] Connection rate limit exceeded for user {user_id}")
            await send({"type": "websocket.close", "code": 4429})
            return

        return await super().__call__(scope, receive, send)

    def check_origin(self, scope):
        headers = dict(scope.get('headers', []))
        origin = headers.get(b'origin', b'').decode('utf-8')
        if not origin:
            # Allow clients with no origin header (like mobile apps, tests, etc.)
            return True

        parsed_origin = urlparse(origin)
        origin_host = parsed_origin.netloc
        origin_domain = origin_host.split(':')[0]

        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])

        for allowed in allowed_origins:
            parsed_allowed = urlparse(allowed)
            if parsed_allowed.netloc == origin_host or parsed_allowed.netloc == origin_domain:
                return True

        for host in allowed_hosts:
            if host == '*' or host == origin_domain:
                return True

        return False

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token)
            return jwt_auth.get_user(validated_token)
        except (InvalidToken, TokenError, Exception) as e:
            logger.warning(f"[WS Handshake] Rejected invalid/spoofed token: {e}")
            return None

    @database_sync_to_async
    def rate_limit_connection(self, user_id):
        # Safe rate limiting: Only use Redis if configured and available
        # Otherwise, skip rate limiting (graceful degradation)
        env = environ.Env()
        use_redis_rate_limit = env.bool('USE_REDIS_RATE_LIMIT', default=False)
        
        if not use_redis_rate_limit:
            # Skip rate limiting if Redis not configured
            return False
        
        redis_url = env('REDIS_URL', default='redis://localhost:6379/0')
        try:
            r = redis.from_url(redis_url)
            key = f"ws_conn_rate:{user_id}"
            count = r.incr(key)
            if count == 1:
                r.expire(key, 10)
            if count > 5:
                return True
            return False
        except Exception as e:
            logger.error(f"[WS Handshake] Redis error in connection rate limit: {e}")
            # Allow connection if rate limiting fails (graceful degradation)
            return False
