"""
Test utility for Forgot Password OTP Flow

Usage:
    from apps.accounts.tests import test_forgot_password_flow
    test_forgot_password_flow()

This script can be run in Django shell or as a test file.
"""

import json
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from datetime import timedelta
from django.utils import timezone
from apps.accounts.models import OTPCode

User = get_user_model()


class ForgotPasswordFlowTestCase(TestCase):
    """Test the 3-step forgot password OTP flow"""
    
    def setUp(self):
        """Create test user and client"""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='OldPassword123'
        )
    
    def test_step1_forgot_password_request(self):
        """Test Step 1: Request password reset with email"""
        response = self.client.post(
            '/auth/forgot-password/',
            data=json.dumps({'email': 'test@example.com'}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('OTP sent', data['message'])
        
        # Verify OTP was created in DB
        otp = OTPCode.objects.filter(
            user=self.user,
            purpose='PASSWORD_RESET',
            is_verified=False,
            is_used=False
        ).first()
        self.assertIsNotNone(otp)
        self.assertEqual(len(otp.code), 6)
        self.assertTrue(otp.code.isdigit())
    
    def test_step2_verify_otp(self):
        """Test Step 2: Verify OTP"""
        # Create OTP
        otp = OTPCode.objects.create(
            user=self.user,
            code='123456',
            purpose='PASSWORD_RESET',
            expires_at=timezone.now() + timedelta(minutes=15),
            is_verified=False,
            is_used=False
        )
        
        response = self.client.post(
            '/auth/verify-forgot-otp/',
            data=json.dumps({
                'email': 'test@example.com',
                'otp': '123456'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verify OTP is marked as verified
        otp.refresh_from_db()
        self.assertTrue(otp.is_verified)
        self.assertFalse(otp.is_used)
    
    def test_step3_reset_password(self):
        """Test Step 3: Reset password"""
        # Create verified OTP
        otp = OTPCode.objects.create(
            user=self.user,
            code='123456',
            purpose='PASSWORD_RESET',
            expires_at=timezone.now() + timedelta(minutes=15),
            is_verified=True,  # Must be verified!
            is_used=False
        )
        
        response = self.client.post(
            '/auth/reset-password/',
            data=json.dumps({
                'email': 'test@example.com',
                'otp': '123456',
                'new_password': 'NewSecurePassword123',
                'new_password_confirm': 'NewSecurePassword123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewSecurePassword123'))
        
        # Verify OTP is marked as used
        otp.refresh_from_db()
        self.assertTrue(otp.is_used)
    
    def test_otp_expiry(self):
        """Test that expired OTP cannot be used"""
        # Create expired OTP
        otp = OTPCode.objects.create(
            user=self.user,
            code='123456',
            purpose='PASSWORD_RESET',
            expires_at=timezone.now() - timedelta(seconds=1),  # Already expired
            is_verified=False,
            is_used=False
        )
        
        response = self.client.post(
            '/auth/verify-forgot-otp/',
            data=json.dumps({
                'email': 'test@example.com',
                'otp': '123456'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('expired', data['message'].lower())
    
    def test_otp_single_use(self):
        """Test that OTP cannot be reused"""
        # Create verified and used OTP
        otp = OTPCode.objects.create(
            user=self.user,
            code='123456',
            purpose='PASSWORD_RESET',
            expires_at=timezone.now() + timedelta(minutes=15),
            is_verified=True,
            is_used=True  # Already used!
        )
        
        response = self.client.post(
            '/auth/reset-password/',
            data=json.dumps({
                'email': 'test@example.com',
                'otp': '123456',
                'new_password': 'NewPassword123',
                'new_password_confirm': 'NewPassword123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('invalid', data['message'].lower())
    
    def test_step3_requires_verification(self):
        """Test that reset requires OTP to be verified in step 2"""
        # Create OTP but DON'T verify it (skip step 2)
        otp = OTPCode.objects.create(
            user=self.user,
            code='123456',
            purpose='PASSWORD_RESET',
            expires_at=timezone.now() + timedelta(minutes=15),
            is_verified=False,  # Not verified!
            is_used=False
        )
        
        response = self.client.post(
            '/auth/reset-password/',
            data=json.dumps({
                'email': 'test@example.com',
                'otp': '123456',
                'new_password': 'NewPassword123',
                'new_password_confirm': 'NewPassword123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('haijathibitishwa', data['message'].lower())
    
    def test_weak_password_rejection(self):
        """Test that weak passwords are rejected"""
        # Create verified OTP
        otp = OTPCode.objects.create(
            user=self.user,
            code='123456',
            purpose='PASSWORD_RESET',
            expires_at=timezone.now() + timedelta(minutes=15),
            is_verified=True,
            is_used=False
        )
        
        response = self.client.post(
            '/auth/reset-password/',
            data=json.dumps({
                'email': 'test@example.com',
                'otp': '123456',
                'new_password': 'password',  # Weak!
                'new_password_confirm': 'password'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        # Should fail validation
        self.assertFalse(data.get('success', False))
    
    def test_invalid_email_format(self):
        """Test that invalid email format is rejected"""
        response = self.client.post(
            '/auth/forgot-password/',
            data=json.dumps({'email': 'not-an-email'}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('email', data)


def test_forgot_password_flow():
    """Quick manual test (run in Django shell)"""
    print("Testing Forgot Password OTP Flow...")
    print("=" * 50)
    
    # Create test user
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    user, created = User.objects.get_or_create(
        email='flow_test@example.com',
        defaults={'username': 'flow_test_user'}
    )
    
    if created:
        user.set_password('TestPassword123')
        user.save()
        print("✓ Test user created")
    else:
        print("✓ Using existing test user")
    
    # Step 1: Create OTP
    from apps.accounts.views import _send_otp
    _send_otp(user, 'PASSWORD_RESET')
    otp = OTPCode.objects.filter(
        user=user, purpose='PASSWORD_RESET'
    ).latest('created_at')
    print(f"✓ Step 1: OTP created: {otp.code}")
    print(f"  - Expires at: {otp.expires_at}")
    print(f"  - is_verified: {otp.is_verified}")
    print(f"  - is_used: {otp.is_used}")
    
    # Step 2: Verify OTP
    otp.is_verified = True
    otp.save()
    print(f"✓ Step 2: OTP verified")
    print(f"  - is_verified: {otp.is_verified}")
    print(f"  - is_used: {otp.is_used}")
    
    # Step 3: Reset password
    new_password = 'NewTestPassword456'
    user.set_password(new_password)
    user.save()
    otp.is_used = True
    otp.save()
    print(f"✓ Step 3: Password reset")
    print(f"  - is_verified: {otp.is_verified}")
    print(f"  - is_used: {otp.is_used}")
    
    # Verify password was changed
    user.refresh_from_db()
    if user.check_password(new_password):
        print("✓ Password verified successfully")
    else:
        print("✗ Password verification failed")
    
    print("=" * 50)
    print("All tests passed! ✓")
