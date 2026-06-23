"""
Authentication Configuration (Phase 3: Hybrid Auth Activation)

Controls the migration from localStorage-based JWT to HttpOnly cookie-based refresh.
Allows safe rollback if issues arise.
"""

import os
from django.conf import settings

# Phase 3: Enable Hybrid Auth System
# When True: Uses HttpOnly cookies for refresh tokens + memory access tokens
# When False: Falls back to legacy localStorage-based JWT
USE_HYBRID_AUTH = os.getenv('USE_HYBRID_AUTH', 'true').lower() == 'true'

# Security settings for hybrid auth
HYBRID_AUTH_CONFIG = {
    # Refresh token cookie settings
    'REFRESH_COOKIE_NAME': 'refresh_token',
    'REFRESH_COOKIE_HTTPONLY': True,
    'REFRESH_COOKIE_SECURE': not settings.DEBUG,  # HTTPS in production
    'REFRESH_COOKIE_SAMESITE': 'Lax',
    'REFRESH_COOKIE_MAX_AGE': 30 * 24 * 60 * 60,  # 30 days
    
    # Token rotation settings
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    
    # Security headers
    'CORS_ALLOW_CREDENTIALS': True,
}
