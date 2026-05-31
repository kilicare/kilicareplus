from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication


class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope['user'] = scope.get('user', AnonymousUser())
        query_string = scope.get('query_string', b'')

        if query_string:
            query_params = parse_qs(query_string.decode(errors='ignore'))
            token_values = query_params.get('token') or []
            if token_values:
                user = await self.get_user_from_token(token_values[0])
                if user is not None:
                    scope['user'] = user

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token)
            return jwt_auth.get_user(validated_token)
        except Exception:
            return None
