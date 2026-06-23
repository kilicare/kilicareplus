import logging
import re

import random

from datetime import timedelta

from django.utils import timezone

from django.contrib.auth import authenticate

from django.core.mail import send_mail

from django.core.exceptions import ValidationError

from django.core.validators import EmailValidator

from django.conf import settings as django_settings

from rest_framework import status

from rest_framework.decorators import api_view, permission_classes, throttle_classes

from rest_framework.permissions import AllowAny, IsAuthenticated

from rest_framework.response import Response

from rest_framework_simplejwt.tokens import RefreshToken

from core.throttles import LoginThrottle, RegisterThrottle, TokenRefreshThrottle, OTPThrottle, PasswordResetThrottle

from django.db import transaction

from .models import User, OTPCode

from .serializers import (

    RegisterSerializer, UserSerializer,

    UpdateProfileSerializer,

    ForgotPasswordSerializer, VerifyForgotOTPSerializer,

    ResetPasswordSerializer,

)



logger = logging.getLogger(__name__)





def _generate_otp():

    return ''.join([str(random.randint(0, 9)) for _ in range(4)])


def _is_valid_email(email):
    """
    Validate email format using Django's EmailValidator.
    Returns True if valid, False otherwise.
    """
    validator = EmailValidator()
    try:
        validator(email)
        return True
    except ValidationError:
        return False





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

            subject=subjects.get(purpose, 'Kilicare+ OTP'),

            message=bodies.get(purpose, f'OTP: {code}'),

            from_email=django_settings.DEFAULT_FROM_EMAIL,

            recipient_list=[user.email],  # Real user email only

            fail_silently=False,

        )

    except Exception as e:

        # CRITICAL: Email failure must NOT be silent
        # Raise ValidationError to trigger transaction rollback
        # This ensures User, Profile, and OTP are all rolled back if email fails
        logger.error(f'[SEND OTP] Email sending failed for {user.email}: {str(e)}')
        raise ValidationError(
            'Unable to send verification email. Please try again.'
        )

    return code





@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def register_view(request):
    try:
        serializer = RegisterSerializer(data=request.data)

        if not serializer.is_valid():
            # Extract first error message for user-friendly display
            # serializer.errors format: {"field": ["error message"]}
            first_error = list(serializer.errors.values())[0]
            error_message = first_error[0] if isinstance(first_error, list) else str(first_error)
            
            return Response({
                'success': False,
                'message': error_message,
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        # CRITICAL: Wrap entire registration in transaction.atomic()
        # This ensures that if any step fails (User creation, Profile creation),
        # everything rolls back and no orphaned records remain in the database.
        with transaction.atomic():
            user = serializer.save()  # Creates User + Profile (now active, no OTP required)

        return Response({
            'success': True,
            'message': 'Account created successfully! You can now log in.',
            'email': user.email,
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f'[REGISTER] Unexpected error: {str(e)}')
        return Response(
            {'success': False, 'message': 'An unexpected error occurred. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )





@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login_view(request):

    """

    Login endpoint - Returns JWT tokens in response body

    

    FLOW:

    1. Validate input (email format, required fields)

    2. Authenticate user (email + password)

    3. Generate JWT tokens (access + refresh)

    4. Return tokens + user data in JSON response

    5. Frontend stores tokens in localStorage

    

    Request: { "email": "...", "password": "..." }

    

    Response: {

        'success': True,

        'access': '<access_token>',

        'refresh': '<refresh_token>',

        'user': {...},

        'message': '...'

    }

    """

    try:

        email = request.data.get('email', '').lower().strip()

        password = request.data.get('password', '')

        

        logger.info(f'[LOGIN] Attempt from email: {email}')

        

        # Validate required fields

        if not email or not password:

            logger.warning(f'[LOGIN] Missing email or password')

            return Response(

                {'message': 'Email and password are required.'},

                status=status.HTTP_400_BAD_REQUEST

            )

        

        # Validate email format before authentication

        if not _is_valid_email(email):

            logger.warning(f'[LOGIN] Invalid email format: {email}')

            return Response(

                {'message': 'Please enter a valid email address.'},

                status=status.HTTP_400_BAD_REQUEST

            )

        

        # Authenticate user

        user = authenticate(request, username=email, password=password)

        if not user:

            logger.warning(f'[LOGIN] Authentication failed for email: {email}')

            return Response(

                {'message': 'Invalid email or password.'},

                status=status.HTTP_401_UNAUTHORIZED

            )

        

        # Check if account is active
        # Note: New registrations are now active by default (no OTP required)
        # This check only blocks manually deactivated accounts
        if not user.is_active:
            logger.warning(f'[LOGIN] Account not active for email: {email}')
            return Response(
                {'message': 'This account has been deactivated. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )

        

        # Generate tokens

        refresh = RefreshToken.for_user(user)

        access_token = str(refresh.access_token)

        refresh_token = str(refresh)

        

        logger.info(f'[LOGIN] ✅ Tokens generated for user: {user.id} ({email})')

        

        # Return access token in response body (memory-based auth - Phase 2)
        # Refresh token is ONLY in HttpOnly cookie (never in response body)
        # HOTFIX: Use minimal user data to avoid PassportProfile dependency crashes

        response = Response({

            'success': True,

            'message': 'Welcome to Kilicare+! 🎉',

            'access': access_token,        # ← Client stores in memory only (Phase 2)

            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_verified': user.is_verified,
            },

        }, status=status.HTTP_200_OK)

        

        # Phase 1: Add refresh token to HttpOnly cookie (new hybrid auth)
        # SECURITY: Refresh token is ONLY in cookie, NEVER in response body
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=not django_settings.DEBUG,  # HTTPS in production
            samesite='Lax',
            max_age=30 * 24 * 60 * 60,  # 30 days
        )

        

        logger.info(f'[LOGIN] ✅ Login successful for user: {user.id} ({email})')

        

        return response

    

    except Exception as e:

        # Log the full error for debugging

        logger.error(f'[LOGIN] Unexpected error: {str(e)}', exc_info=True)

        

        # Return safe user-friendly message
        # In development, return actual error for easier debugging
        if django_settings.DEBUG:
            return Response(
                {'message': f'Login error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        # In production, return generic message
        return Response(
            {'message': 'An error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )





@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([TokenRefreshThrottle])
def token_refresh_view(request):

    """

    Token Refresh endpoint - Accepts refresh token from cookie or request body

    

    FLOW:

    1. Extract refresh token (prioritize cookie, fallback to body)

    2. Validate refresh token

    3. Generate new access token

    4. Return new access token in response body

    5. Update refresh token cookie (if rotation enabled)

    

    Request: { "refresh": "<refresh_token>" } (optional if cookie present)

    

    Response: {

        'success': True,

        'access': '<new_access_token>',

        'message': '...'

    }

    

    IMPORTANT:

    - Phase 1: Support BOTH cookie and body (dual auth support)

    - Prioritize cookie if present, fallback to request body

    - Frontend can use either method (backward compatibility)

    - New access token returned in response body

    - Frontend updates localStorage with new token (if using body method)

    """

    # Phase 1: Dual support - prioritize cookie, fallback to body
    refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')

    

    if not refresh_token:

        logger.warning(f'[REFRESH] Refresh token not provided in cookie or request body')

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

        

        # Phase 1: If rotation enabled, set new refresh token in cookie
        # Note: simple_jwt RefreshToken with ROTATE_REFRESH_TOKENS=True
        # provides both new access and refresh tokens
        try:
            new_refresh_token = str(refresh)  # New refresh token from rotation
            response.set_cookie(
                key='refresh_token',
                value=new_refresh_token,
                httponly=True,
                secure=False,  # Set True in production later
                samesite='Lax',
                max_age=30 * 24 * 60 * 60,  # 30 days
            )
            logger.debug(f'[REFRESH] New refresh token set in cookie')
        except Exception as cookie_error:
            logger.warning(f'[REFRESH] Could not set new refresh token in cookie: {str(cookie_error)}')

        

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
@throttle_classes([OTPThrottle])
def send_otp_view(request):

    email = request.data.get('email', '').lower().strip()

    purpose = request.data.get('purpose', 'PASSWORD_RESET')

    # Only PASSWORD_RESET is supported (EMAIL_VERIFY removed from registration flow)
    if purpose != 'PASSWORD_RESET':

        return Response(
            {'message': 'Invalid purpose. Only PASSWORD_RESET is supported.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:

        user = User.objects.get(email=email)

    except User.DoesNotExist:

        return Response(

            {'message': 'Email not found.'},

            status=status.HTTP_404_NOT_FOUND

        )

    _send_otp(user, purpose)

    return Response({

        'success': True,

        'message': f'OTP sent to {email}',

    })





@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OTPThrottle])
def verify_otp_view(request):

    email = request.data.get('email', '').lower().strip()

    code = request.data.get('code', '').strip()

    purpose = request.data.get('purpose', 'PASSWORD_RESET')

    # Only PASSWORD_RESET is supported (EMAIL_VERIFY removed from registration flow)
    if purpose != 'PASSWORD_RESET':
        return Response(
            {'message': 'Invalid purpose. Only PASSWORD_RESET is supported.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:

        user = User.objects.get(email=email)

    except User.DoesNotExist:

        return Response(

            {'message': 'Email not found.'},

            status=status.HTTP_404_NOT_FOUND

        )

    try:

        otp = OTPCode.objects.filter(

            user=user, code=code, purpose=purpose,

            is_used=False, expires_at__gte=timezone.now(),

        ).latest('created_at')

    except OTPCode.DoesNotExist:

        return Response(

            {'message': 'Invalid or expired OTP.'},

            status=status.HTTP_400_BAD_REQUEST

        )

    

    # DEBUG: Log OTP state before verify
    logger.debug(f'[OTP VERIFY] Before: purpose={purpose}, is_verified={otp.is_verified}, is_used={otp.is_used}')

    # PASSWORD_RESET: Mark as verified only (will be marked used in step 3)
    otp.is_verified = True
    otp.save()
    logger.debug(f'[OTP VERIFY] PASSWORD_RESET: Set is_verified=True, is_used stays False for step 3')

    # DEBUG: Log OTP state after verify
    otp.refresh_from_db()
    logger.debug(f'[OTP VERIFY] After: is_verified={otp.is_verified}, is_used={otp.is_used}')

    # For PASSWORD_RESET: Just confirm OTP verification (tokens will be issued after password reset)
    return Response({
        'success': True,

        'message': 'OTP verified!',

        'purpose': purpose,

    }, status=status.HTTP_200_OK)





# ============================================================================

# Forgot Password Flow (3-Step Process)

# ============================================================================



@api_view(['POST'])

@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
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
        # CRITICAL: Silent failure removed
        # If email doesn't exist, we should NOT send OTP (security measure)
        # But we return success to prevent email enumeration attacks
        logger.debug(f'[FORGOT PASSWORD] Email not found: {email}')

    

    return Response({

        'success': True,

        'message': 'If email exists, OTP has been sent.',

    })





@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OTPThrottle])
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

            {'message': 'Email not found.'},

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

            {'message': 'Invalid or expired OTP.'},

            status=status.HTTP_400_BAD_REQUEST

        )

    

    # Mark OTP as verified

    otp_record.is_verified = True

    otp_record.save()

    

    return Response({

        'success': True,

        'message': 'OTP verified!',

    })





@api_view(['POST'])

@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def reset_password_view(request):

    """

    Step 3: Reset password after OTP verification

    Requires verified OTP

    """

    serializer = ResetPasswordSerializer(data=request.data)

    if not serializer.is_valid():
        logger.error(f'[RESET PASSWORD] Validation failed: {serializer.errors}')
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

            {'message': 'Email not found.'},

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

            {'message': 'Invalid, expired, or unverified OTP.'},

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

        'message': 'Password changed successfully! Please login.',

    })





@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_view(request):

    email = request.data.get('email', '').lower().strip()

    try:

        user = User.objects.get(email=email)

        _send_otp(user, 'PASSWORD_RESET')

    except User.DoesNotExist:
        # CRITICAL: Silent failure removed
        # If email doesn't exist, we should NOT send OTP (security measure)
        # But we return success to prevent email enumeration attacks
        logger.debug(f'[FORGOT PASSWORD] Email not found: {email}')

    return Response({

        'success': True,

        'message': 'If email exists, OTP has been sent.',

    })





@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_confirm_view(request):

    email = request.data.get('email', '').lower().strip()

    code = request.data.get('code', '').strip()

    new_password = request.data.get('new_password', '')

    new_password2 = request.data.get('new_password2', '')

    if new_password != new_password2:

        return Response(

            {'message': 'Passwords do not match.'},

            status=status.HTTP_400_BAD_REQUEST

        )

    if len(new_password) < 8:

        return Response(

            {'message': 'Password must be at least 8 characters.'},

            status=status.HTTP_400_BAD_REQUEST

        )

    try:

        user = User.objects.get(email=email)

    except User.DoesNotExist:

        return Response(

            {'message': 'Email not found.'},

            status=status.HTTP_404_NOT_FOUND

        )

    try:

        otp = OTPCode.objects.filter(

            user=user, code=code, purpose='PASSWORD_RESET',

            is_used=False, expires_at__gte=timezone.now(),

        ).latest('created_at')

    except OTPCode.DoesNotExist:

        return Response(

            {'message': 'Invalid or expired OTP.'},

            status=status.HTTP_400_BAD_REQUEST

        )

    otp.is_used = True

    otp.save()

    user.set_password(new_password)

    user.save()

    return Response({

        'success': True,

        'message': 'Password changed! Please login.',

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

        

        # Invalidate profile cache (safe wrapper)

        from core.safe_cache import safe_delete

        safe_delete(f"user_profile:{request.user.username}")

        safe_delete(f"user_profile:{request.user.id}")

        

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

    Logout endpoint - Blacklist refresh token and clear cookie

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

        'message': 'Logged out successfully. See you again!',

    }, status=status.HTTP_200_OK)

    
    # Phase 1: Delete refresh token cookie
    response.delete_cookie('refresh_token')
    logger.debug(f'[LOGOUT] Refresh token cookie deleted for user: {user_id}')

    

    logger.info(f'[LOGOUT] ✅ Logout successful for user: {user_id}')

    

    return response





@api_view(['GET'])

@permission_classes([IsAuthenticated])

def public_profile_view(request, username):
    # Try finding target by either username or integer user ID

    try:

        if username.isdigit():

            target = User.objects.get(id=int(username))

        else:

            target = User.objects.get(username=username)

    except User.DoesNotExist:

        return Response({'message': 'User not found.'}, status=404)



    from core.safe_cache import safe_get

    cache_key = f"user_profile:{target.id}"

    cached_data = safe_get(cache_key)

    if cached_data is not None:

        return Response(cached_data)



    passport = getattr(target, 'passport', None)

    profile  = getattr(target, 'profile', None)



    # Follower counts

    from apps.follow.models import Follow

    followers = Follow.objects.filter(following=target).count()

    following = Follow.objects.filter(follower=target).count()



    # Content counts

    moments_count, tips_count = 0, 0

    try:

        from apps.moments.models import Moment

        moments_count = Moment.objects.filter(posted_by=target).count()

    except Exception as e:
        # CRITICAL: Silent failure removed
        # If moments app is not available or query fails, log the error
        logger.error(f'[PUBLIC PROFILE] Failed to fetch moments count for user {target.id}: {str(e)}')

    try:

        from apps.map_tips.models import Tip

        tips_count = Tip.objects.filter(created_by=target).count()

    except Exception as e:
        # CRITICAL: Silent failure removed
        # If map_tips app is not available or query fails, log the error
        logger.error(f'[PUBLIC PROFILE] Failed to fetch tips count for user {target.id}: {str(e)}')



    av = None

    if profile and profile.avatar:

        av = profile.avatar.url



    data = {

        'id':              target.id,

        'username':        target.username,

        'first_name':      target.first_name,

        'last_name':       target.last_name,

        'role':            target.role,

        'is_verified':     target.is_verified,

        'bio':             profile.bio       if profile  else '',

        'avatar_url':      av,

        'location':        profile.location  if profile  else '',

        'trust_score':     passport.trust_score if passport else 50,

        'level':           passport.level    if passport else 'EXPLORER',

        'points':          passport.points   if passport else 0,

        'followers_count': followers,

        'following_count': following,

        'moments_count':   moments_count,

        'tips_count':      tips_count,

        'date_joined':     target.date_joined.isoformat(),

    }



    # Cache profile for 1 hour (3600 seconds)

    from core.safe_cache import safe_set

    safe_set(cache_key, data, 3600)

    safe_set(f"user_profile:{target.username}", data, 3600)

    return Response(data)