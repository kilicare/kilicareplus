from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('TOURIST', 'Tourist'),
        ('LOCAL_GUIDE', 'Local Guide'),
        ('ADMIN', 'Admin'),
        ('B2B', 'B2B Client'),
    ]
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(
        max_length=15, choices=ROLE_CHOICES, default='TOURIST'
    )
    is_verified = models.BooleanField(default=False)
    fcm_token = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'accounts_user'

    def __str__(self):
        return f'{self.username} ({self.role})'


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'), ('F', 'Female'), ('O', 'Other'),
    ]
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='profile'
    )
    avatar = models.ImageField(
        upload_to='avatars/', blank=True, null=True
    )
    cover_photo = models.ImageField(
        upload_to='covers/', blank=True, null=True
    )
    bio = models.TextField(max_length=300, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(
        max_length=1, choices=GENDER_CHOICES, blank=True, null=True
    )
    website = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Profile: {self.user.username}'


class OTPCode(models.Model):
    PURPOSE_CHOICES = [
        ('EMAIL_VERIFY', 'Email Verification'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('PHONE_VERIFY', 'Phone Verification'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)  # Marked as verified in step 2
    is_used = models.BooleanField(default=False)  # Marked as used in step 3
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'OTP for {self.user.email}'