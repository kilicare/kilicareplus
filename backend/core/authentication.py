"""
Custom Authentication Backend for KilicareGO

This authentication class provides context-aware JWT validation:
- Public endpoints bypass JWT validation entirely
- Protected endpoints require valid JWT tokens
- Prevents stale tokens from blocking public endpoints like login
"""

import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


class PublicEndpointAwareJWTAuthentication(JWTAuthentication):
    """
    JWT Authentication that bypasses validation for public endpoints.
    
    Public endpoints that MUST NOT require JWT validation:
    - /auth/login/
    - /auth/register/
    - /auth/refresh/
    - /auth/otp/send/
    - /auth/otp/verify/
    """
    
    # Public endpoint paths that bypass JWT validation
    PUBLIC_ENDPOINTS = [
        '/auth/login/',
        '/auth/register/',
        '/auth/refresh/',
        '/auth/otp/send/',
        '/auth/otp/verify/',
    ]
    
    def authenticate(self, request):
        """
        Authenticate request only if endpoint is NOT public.
        
        For public endpoints, return None immediately without JWT validation.
        For protected endpoints, perform standard JWT validation.
        """
        # Check if request path is a public endpoint
        request_path = request.path
        
        if self.is_public_endpoint(request_path):
            # Public endpoint - bypass JWT validation entirely
            logger.debug(f'[Auth] Public endpoint detected: {request_path} - bypassing JWT validation')
            return None
        
        # Protected endpoint - perform standard JWT validation
        try:
            result = super().authenticate(request)
            if result:
                logger.debug(f'[Auth] JWT validation successful for: {request_path}')
            return result
        except (InvalidToken, TokenError) as e:
            logger.warning(f'[Auth] JWT validation failed for {request_path}: {str(e)}')
            raise
    
    def is_public_endpoint(self, path: str) -> bool:
        """
        Check if the given path is a public endpoint.
        
        Args:
            path: Request path (e.g., '/auth/login/')
            
        Returns:
            True if path is public, False otherwise
        """
        return any(public_path in path for public_path in self.PUBLIC_ENDPOINTS)
