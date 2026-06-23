import logging
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError
from .models import User, UserProfile

logger = logging.getLogger(__name__)


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    cover_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'avatar', 'avatar_url', 'cover_photo',
            'cover_photo_url', 'bio', 'location',
            'date_of_birth', 'gender', 'website',
        ]

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            url = obj.avatar.url
            if request and not url.startswith('http'):
                return request.build_absolute_uri(url)
            return url
        return None

    def get_cover_photo_url(self, obj):
        request = self.context.get('request')
        if obj.cover_photo:
            url = obj.cover_photo.url
            if request and not url.startswith('http'):
                return request.build_absolute_uri(url)
            return url
        return None


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    passport_info = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name',
            'last_name', 'phone', 'role', 'is_verified',
            'date_joined', 'profile', 'passport_info',
        ]
        read_only_fields = ['id', 'date_joined', 'is_verified']

    def get_passport_info(self, obj):
        try:
            p = obj.passport
            return {
                'points': p.points,
                'level': p.level,
                'trust_score': p.trust_score,
            }
        except Exception as e:
            # Defensive fallback: Return None if passport data is not available
            # This should not happen after registration fix, but provides safety
            logger.warning(f'[USER SERIALIZER] Passport data not available for user {obj.id}: {str(e)}')
            return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, validators=[validate_password],
        error_messages={'required': 'Please enter your password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        error_messages={'required': 'Please confirm your password'}
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'role', 'phone',
        ]
        extra_kwargs = {
            'username': {'error_messages': {'required': 'Please enter a username'}},
            'email': {'error_messages': {'required': 'Please enter your email'}},
        }

    def validate_email(self, value):
        # Validate email format using Django's EmailValidator
        validator = EmailValidator()
        try:
            validator(value)
        except ValidationError:
            raise serializers.ValidationError('Please enter a valid email address.')
        
        # Check for duplicate email
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError(
                'This email is already registered. Please use a different email.'
            )
        return value.lower()

    def validate_username(self, value):
        # Validate username format: 3-30 chars, alphanumeric + underscore only
        import re
        if not re.match(r'^[a-zA-Z0-9_]{3,30}$', value):
            raise serializers.ValidationError(
                'Username must be 3-30 characters and contain only letters, numbers, and underscores.'
            )
        
        # Check for duplicate username
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                'This username is already taken. Please choose a different username.'
            )
        return value

    def validate(self, attrs):
        # Validate password match
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {'password': 'Passwords do not match'}
            )
        
        # Validate phone format if provided
        phone = attrs.get('phone')
        if phone:
            import re
            # Allow international phone numbers (digits, spaces, +, -, parentheses)
            if not re.match(r'^[\d\s+\-\(\)]{10,20}$', phone):
                raise serializers.ValidationError(
                    {'phone': 'Please enter a valid phone number.'}
                )
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = True  # User is active immediately after registration (no OTP required)
        user.is_verified = True  # User is verified immediately after registration (OTP verification removed)
        user.save()
        
        # Create UserProfile
        UserProfile.objects.create(user=user)
        
        # Create PassportProfile (required for complete user graph)
        from apps.passport.models import PassportProfile
        PassportProfile.objects.create(user=user)
        
        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(
        source='profile.bio', required=False, allow_blank=True
    )
    location = serializers.CharField(
        source='profile.location', required=False, allow_blank=True
    )
    avatar = serializers.ImageField(
        source='profile.avatar', required=False
    )
    cover_photo = serializers.ImageField(
        source='profile.cover_photo', required=False
    )
    gender = serializers.CharField(
        source='profile.gender', required=False, allow_blank=True
    )
    date_of_birth = serializers.DateField(
        source='profile.date_of_birth',
        required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'username', 'email', 'phone',
            'bio', 'location', 'avatar', 'cover_photo',
            'gender', 'date_of_birth',
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if profile_data:
            # Create profile if it doesn't exist
            if not hasattr(instance, 'profile'):
                from .models import UserProfile
                UserProfile.objects.create(user=instance)
            for attr, value in profile_data.items():
                setattr(instance.profile, attr, value)
            instance.profile.save()
        return instance


# ============================================================================
# Forgot Password Flow Serializers
# ============================================================================

class ForgotPasswordSerializer(serializers.Serializer):
    """Step 1: Request password reset with email"""
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError(
                'This email is not found.'
            )
        return value.lower()


class VerifyForgotOTPSerializer(serializers.Serializer):
    """Step 2: Verify OTP sent to email"""
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)

    def validate_email(self, value):
        return value.lower()

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                'OTP must be numeric only.'
            )
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Step 3: Reset password after OTP verification"""
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=4)
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        return value.lower()

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                'OTP must be numeric only.'
            )
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {'new_password': 'Passwords do not match.'}
            )
        
        # Check for common weak passwords
        weak_passwords = [
            'password', '12345678', 'qwerty123', 'admin123',
            '111111', '000000', 'abc123', 'test1234'
        ]
        if attrs['new_password'].lower() in weak_passwords:
            raise serializers.ValidationError(
                {'new_password': 'This password is too common. Please choose a different password.'}
            )
        
        return attrs