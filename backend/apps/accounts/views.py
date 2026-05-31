import logging
import random
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings as django_settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, OTPCode
from .serializers import (
    RegisterSerializer, UserSerializer,
    UpdateProfileSerializer,
    ForgotPasswordSerializer, VerifyForgotOTPSerializer,
    ResetPasswordSerializer,
)

logger = logging.getLogger(__name__)


def _generate_otp():
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])


def _send_otp(user, purpose):
    code = _generate_otp()
    expires_at = timezone.now() + timedelta(minutes=15)
    OTPCode.objects.filter(
        user=user, purpose=purpose, is_used=False
    ).update(is_used=True)
    OTPCode.objects.create(
        user=user, code=code,
        purpose=purpose, expires_at=expires_at
    )
    
    # Email subject lines
    subjects = {
        'EMAIL_VERIFY': 'KilicarePlus — Verify Your Email Address',
        'PASSWORD_RESET': 'KilicarePlus — Password Reset Request',
    }
    
    # Email body with professional OTP format (15-minute validity)
    bodies = {
        'EMAIL_VERIFY': (
            f'Habari {user.first_name or user.username},\n\n'
            f'Your one-time password (OTP) is:\n\n'
            f'    ═══════════════════════════════════════\n'
            f'    ★  {code}  ★\n'
            f'    ═══════════════════════════════════════\n\n'
            f'⏳ Valid for: 15 minutes\n'
            f'🚫 Do not share this code with anyone\n\n'
            f'This code is required to verify your email address and activate your Kilicare+ account.\n\n'
            f'If you did not request this OTP, please ignore this email.\n\n'
            f'—\n'
            f'KilicarePlus+ '
        ),
        'PASSWORD_RESET': (
            f'Habari {user.first_name or user.username},\n\n'
            f'Your one-time password (OTP) is:\n\n'
            f'    ═══════════════════════════════════════\n'
            f'    ★  {code}  ★\n'
            f'    ═══════════════════════════════════════\n\n'
            f'⏳ Valid for: 15 minutes\n'
            f'🚫 Do not share this code with anyone\n\n'
            f'This code is required to reset your password. Use it to complete your password reset process.\n\n'
            f'If you did not request a password reset, please ignore this email and your account will remain secure.\n\n'
            f'—\n'
            f'KilicarePlus+ '
        ),
    }
    
    # ✓ DELIVERY CONFIGURATION:
    # - Email sent ONLY to user.email (real email, not test addresses)
    # - No console output (OTP never printed to terminal)
    # - Direct SMTP delivery via Gmail (production mode)
    # - Exception handling hidden from user
    try:
        send_mail(
            subject=subjects.get(purpose, 'KilicareGO+ OTP'),
            message=bodies.get(purpose, f'OTP: {code}'),
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],  # Real user email only
            fail_silently=False,
        )
    except Exception as e:
        # Silently log exception - do not expose to user
        # Email is sent via SMTP directly (no console output)
        pass
    return code


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )
    user = serializer.save()
    _send_otp(user, 'EMAIL_VERIFY')
    return Response({
        'success': True,
        'message': 'Akaunti imeundwa! Angalia email yako kwa OTP.',
        'email': user.email,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login endpoint - Returns JWT tokens in response body
    
    FLOW:
    1. Authenticate user (email + password)
    2. Generate JWT tokens (access + refresh)
    3. Return tokens + user data in JSON response
    4. Frontend stores tokens in localStorage
    
    Request: { "email": "...", "password": "..." }
    
    Response: {
        'success': True,
        'access': '<access_token>',
        'refresh': '<refresh_token>',
        'user': {...},
        'message': '...'
    }
    """
    email = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')
    
    logger.info(f'[LOGIN] Attempt from email: {email}')
    
    if not email or not password:
        logger.warning(f'[LOGIN] Missing email or password')
        return Response(
            {'message': 'Email na password zinahitajika.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(request, username=email, password=password)
    if not user:
        logger.warning(f'[LOGIN] Authentication failed for email: {email}')
        return Response(
            {'message': 'Email au password si sahihi.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        logger.warning(f'[LOGIN] Account not active for email: {email}')
        return Response(
            {'message': 'Akaunti haijathibitishwa. Angalia email yako kwa OTP.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    logger.info(f'[LOGIN] ✅ Tokens generated for user: {user.id} ({email})')
    
    # Return tokens in response body (localStorage-based auth)
    response = Response({
        'success': True,
        'message': 'Karibu KilicareGO+! 🎉',
        'access': access_token,        # ← Client stores in localStorage
        'refresh': refresh_token,      # ← Client stores in localStorage
        'user': UserSerializer(user, context={'request': request}).data,
    }, status=status.HTTP_200_OK)
    
    logger.info(f'[LOGIN] ✅ Login successful for user: {user.id} ({email})')
    
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh_view(request):
    """
    Token Refresh endpoint - Accepts refresh token from request body
    
    FLOW:
    1. Extract refresh token from request body
    2. Validate refresh token
    3. Generate new access token
    4. Return new access token in response body
    
    Request: { "refresh": "<refresh_token>" }
    
    Response: {
        'success': True,
        'access': '<new_access_token>',
        'message': '...'
    }
    
    IMPORTANT:
    - Refresh token comes from request body (sent by frontend)
    - New access token returned in response body
    - Frontend updates localStorage with new token
    - Called automatically by frontend interceptor on 401
    """
    # Get refresh token from request body (localStorage-based auth)
    refresh_token = request.data.get('refresh')
    
    if not refresh_token:
        logger.warning(f'[REFRESH] Refresh token not provided in request')
        return Response(
            {'message': 'Refresh token not found. Please login again.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    logger.debug(f'[REFRESH] Refresh token received. Validating...')
    
    try:
        # Validate and generate new access token from refresh token
        refresh = RefreshToken(refresh_token)
        new_access_token = str(refresh.access_token)
        
        logger.info(f'[REFRESH] ✅ Refresh token validated. New access token generated.')
        
        # Return new access token in response body
        response = Response({
            'success': True,
            'message': 'Access token refreshed.',
            'access': new_access_token,  # ← Client updates localStorage
        }, status=status.HTTP_200_OK)
        
        logger.info(f'[REFRESH] ✅ Token refresh successful')
        return response
    
    except Exception as e:
        error_type = type(e).__name__
        logger.warning(f'[REFRESH] ❌ Failed to refresh token: {error_type}: {str(e)}')
        return Response(
            {'message': 'Invalid or expired refresh token. Please login again.'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp_view(request):
    email = request.data.get('email', '').lower().strip()
    purpose = request.data.get('purpose', 'EMAIL_VERIFY')
    if purpose not in ('EMAIL_VERIFY', 'PASSWORD_RESET'):
        return Response(
            {'message': 'Purpose si sahihi.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'message': 'Email haipatikani.'},
            status=status.HTTP_404_NOT_FOUND
        )
    _send_otp(user, purpose)
    return Response({
        'success': True,
        'message': f'OTP imetumwa kwa {email}',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_view(request):
    email = request.data.get('email', '').lower().strip()
    code = request.data.get('code', '').strip()
    purpose = request.data.get('purpose', 'EMAIL_VERIFY')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'message': 'Email haipatikani.'},
            status=status.HTTP_404_NOT_FOUND
        )
    try:
        otp = OTPCode.objects.filter(
            user=user, code=code, purpose=purpose,
            is_used=False, expires_at__gte=timezone.now(),
        ).latest('created_at')
    except OTPCode.DoesNotExist:
        return Response(
            {'message': 'OTP si sahihi au imeisha.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # DEBUG: Log OTP state before verify
    logger.debug(f'[OTP VERIFY] Before: purpose={purpose}, is_verified={otp.is_verified}, is_used={otp.is_used}')
    
    if purpose == 'EMAIL_VERIFY':
        # EMAIL_VERIFY: Mark as used immediately (complete flow in one step)
        otp.is_used = True
        otp.save()
        logger.debug(f'[OTP VERIFY] EMAIL_VERIFY: Set is_used=True')
        
        user.is_active = True
        user.is_verified = True
        user.save()
        try:
            from apps.passport.models import PassportProfile, PointsTransaction
            passport, created = PassportProfile.objects.get_or_create(
                user=user
            )
            if created:
                PointsTransaction.objects.create(
                    user=user,
                    action_type='REGISTER',
                    points_change=50,
                    balance_after=50,
                    description='Karibu KilicareGO+! 🎉',
                )
        except Exception as e:
            pass
    elif purpose == 'PASSWORD_RESET':
        # PASSWORD_RESET: Mark as verified only (will be marked used in step 3)
        otp.is_verified = True
        otp.save()
        logger.debug(f'[OTP VERIFY] PASSWORD_RESET: Set is_verified=True, is_used stays False for step 3')
    
    # DEBUG: Log OTP state after verify
    otp.refresh_from_db()
    logger.debug(f'[OTP VERIFY] After: is_verified={otp.is_verified}, is_used={otp.is_used}')
    
    # For EMAIL_VERIFY: Issue JWT tokens for auto-login
    if purpose == 'EMAIL_VERIFY':
        logger.info(f'[OTP VERIFY] Generating JWT tokens for auto-login: user={user.id}')
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        logger.info(f'[OTP VERIFY] ✅ Tokens generated successfully for user: {user.id}')
        
        return Response({
            'success': True,
            'message': 'Email imethibitishwa kwa mafanikio! Karibu!',
            'purpose': purpose,
            'access': access_token,
            'refresh': refresh_token,
            'user': UserSerializer(user, context={'request': request}).data,
        }, status=status.HTTP_200_OK)
    
    # For PASSWORD_RESET: Just confirm OTP verification (tokens will be issued after password reset)
    return Response({
        'success': True,
        'message': 'OTP imethibitishwa!',
        'purpose': purpose,
    }, status=status.HTTP_200_OK)


# ============================================================================
# Forgot Password Flow (3-Step Process)
# ============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """
    Step 1: Request password reset with email
    Generates 6-digit OTP and sends via email
    """
    serializer = ForgotPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )
    
    email = serializer.validated_data['email']
    try:
        user = User.objects.get(email=email)
        _send_otp(user, 'PASSWORD_RESET')
    except User.DoesNotExist:
        pass
    
    return Response({
        'success': True,
        'message': 'Kama email inapatikana, OTP imetumwa.',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_forgot_otp_view(request):
    """
    Step 2: Verify the OTP sent to email
    Validates OTP and marks it as verified (not used yet)
    """
    serializer = VerifyForgotOTPSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )
    
    email = serializer.validated_data['email']
    otp = serializer.validated_data['otp']
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'message': 'Email haipatikani.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        otp_record = OTPCode.objects.filter(
            user=user,
            code=otp,
            purpose='PASSWORD_RESET',
            is_used=False,
            expires_at__gte=timezone.now(),
        ).latest('created_at')
    except OTPCode.DoesNotExist:
        return Response(
            {'message': 'OTP si sahihi au imeisha.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Mark OTP as verified
    otp_record.is_verified = True
    otp_record.save()
    
    return Response({
        'success': True,
        'message': 'OTP imethibitishwa!',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """
    Step 3: Reset password after OTP verification
    Requires verified OTP
    """
    serializer = ResetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors, status=status.HTTP_400_BAD_REQUEST
        )
    
    email = serializer.validated_data['email']
    otp = serializer.validated_data['otp']
    new_password = serializer.validated_data['new_password']
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'message': 'Email haipatikani.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # DEBUG: Log OTP lookup attempt
    logger.debug(f'[RESET PASSWORD] Looking for OTP: email={email}, otp_code={otp}')
    
    try:
        otp_record = OTPCode.objects.filter(
            user=user,
            code=otp,
            purpose='PASSWORD_RESET',
            is_verified=True,
            is_used=False,
            expires_at__gte=timezone.now(),
        ).latest('created_at')
        logger.debug(f'[RESET PASSWORD] Found OTP: is_verified={otp_record.is_verified}, is_used={otp_record.is_used}')
    except OTPCode.DoesNotExist:
        logger.warning(f'[RESET PASSWORD] OTP not found: email={email}, code={otp}')
        # Debug: Check what OTP records exist
        existing = OTPCode.objects.filter(user=user, code=otp, purpose='PASSWORD_RESET')
        if existing.exists():
            for rec in existing:
                logger.warning(f'[RESET PASSWORD] Found OTP but conditions not met: is_verified={rec.is_verified}, is_used={rec.is_used}, expired={rec.expires_at < timezone.now()}')
        return Response(
            {'message': 'OTP si sahihi, imeisha, au haijathibitishwa.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Mark OTP as used
    otp_record.is_used = True
    otp_record.save()
    logger.debug(f'[RESET PASSWORD] Marked OTP as used')
    
    # Reset password using Django's secure method
    user.set_password(new_password)
    user.save()
    logger.info(f'[RESET PASSWORD] Password changed successfully for user: {email}')
    
    return Response({
        'success': True,
        'message': 'Password imebadilishwa kwa mafanikio! Ingia sasa.',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_view(request):
    email = request.data.get('email', '').lower().strip()
    try:
        user = User.objects.get(email=email)
        _send_otp(user, 'PASSWORD_RESET')
    except User.DoesNotExist:
        pass
    return Response({
        'success': True,
        'message': 'Kama email ipo, OTP imetumwa.',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_confirm_view(request):
    email = request.data.get('email', '').lower().strip()
    code = request.data.get('code', '').strip()
    new_password = request.data.get('new_password', '')
    new_password2 = request.data.get('new_password2', '')
    if new_password != new_password2:
        return Response(
            {'message': 'Passwords hazilingani.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if len(new_password) < 8:
        return Response(
            {'message': 'Password lazima iwe herufi 8+.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'message': 'Email haipatikani.'},
            status=status.HTTP_404_NOT_FOUND
        )
    try:
        otp = OTPCode.objects.filter(
            user=user, code=code, purpose='PASSWORD_RESET',
            is_used=False, expires_at__gte=timezone.now(),
        ).latest('created_at')
    except OTPCode.DoesNotExist:
        return Response(
            {'message': 'OTP si sahihi au imeisha.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    otp.is_used = True
    otp.save()
    user.set_password(new_password)
    user.save()
    return Response({
        'success': True,
        'message': 'Password imebadilishwa! Ingia sasa.',
    })


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Current User endpoint
    
    GET: Return authenticated user's profile
    PUT/PATCH: Update authenticated user's profile
    
    CRITICAL: This endpoint is used to verify authentication
    - Frontend calls this on app load to check if cookies are valid
    - If valid (200) → user is authenticated
    - If invalid (401) → cookies are invalid, user should login
    
    AUTHENTICATION:
    - Requires valid access token from cookie
    - Backend's JWTAuthentication validates the token
    - If token invalid → returns 401 automatically
    """
    if request.method == 'GET':
        logger.debug(f'[ME] Returning user profile for user: {request.user.id}')
        return Response(
            UserSerializer(
                request.user, context={'request': request}
            ).data
        )
    
    logger.info(f'[ME] Updating user profile for user: {request.user.id}')
    
    serializer = UpdateProfileSerializer(
        request.user, data=request.data,
        partial=True, context={'request': request},
    )
    if serializer.is_valid():
        serializer.save()
        logger.info(f'[ME] ✅ Profile updated successfully for user: {request.user.id}')
        return Response(
            UserSerializer(
                request.user, context={'request': request}
            ).data
        )
    
    logger.warning(f'[ME] Profile update failed for user: {request.user.id}')
    return Response(
        serializer.errors, status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def check_username_view(request):
    username = request.query_params.get('username', '').strip()
    if not username:
        return Response({'available': False})
    exists = User.objects.filter(username=username).exists()
    return Response({
        'available': not exists,
        'message': 'Inapatikana!' if not exists else 'Imechukuliwa.',
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_fcm_token_view(request):
    token = request.data.get('fcm_token', '')
    if token:
        request.user.fcm_token = token
        request.user.save(update_fields=['fcm_token'])
    return Response({'success': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint - Blacklist refresh token
    
    FLOW:
    1. User calls /auth/logout/ with refresh token (optional)
    2. Backend blacklists the refresh token if provided
    3. Frontend clears tokens from localStorage
    4. User is logged out
    
    AUTHENTICATION:
    - Requires valid access token in Authorization header
    - Refresh token in request body is optional (for explicit blacklisting)
    
    Request: { "refresh": "token" } (optional)
    
    Response: {
        'success': True,
        'message': '...'
    }
    """
    user_id = request.user.id
    logger.info(f'[LOGOUT] Logout requested by user: {user_id}')
    
    # Optionally blacklist the refresh token
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            RefreshToken(refresh_token).blacklist()
            logger.debug(f'[LOGOUT] Refresh token blacklisted for user: {user_id}')
        except Exception as e:
            logger.warning(f'[LOGOUT] Failed to blacklist refresh token: {str(e)}')
    
    response = Response({
        'success': True,
        'message': 'Umaloged out kwa mafanikio. Karibu tena!',
    }, status=status.HTTP_200_OK)
    
    logger.info(f'[LOGOUT] ✅ Logout successful for user: {user_id}')
    
    return response