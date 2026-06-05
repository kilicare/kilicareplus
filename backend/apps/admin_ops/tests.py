from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import AuditLog
from .services import log_audit, log_role_change, log_points_award, log_user_suspension

User = get_user_model()


class AuditLogTests(TestCase):
    """Test cases for the audit log framework"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@kilicarego.com',
            password='testpass123',
            role='ADMIN',
            is_active=True
        )
        self.regular_user = User.objects.create_user(
            username='user',
            email='user@example.com',
            password='testpass123',
            role='TOURIST',
            is_active=True
        )
    
    def test_create_audit_log(self):
        """Test creating a basic audit log entry"""
        log = log_audit(
            actor=self.admin_user,
            action_type='ADMIN_ACTION',
            action_description='Test action',
            target_user=self.regular_user,
            reason='Test reason',
        )
        
        self.assertEqual(log.actor, self.admin_user)
        self.assertEqual(log.target_user, self.regular_user)
        self.assertEqual(log.action_type, 'ADMIN_ACTION')
        self.assertEqual(log.action_description, 'Test action')
        self.assertEqual(log.reason, 'Test reason')
    
    def test_log_role_change(self):
        """Test logging role changes"""
        log = log_role_change(
            actor=self.admin_user,
            target_user=self.regular_user,
            old_role='TOURIST',
            new_role='LOCAL_GUIDE',
            reason='Promotion to guide',
        )
        
        self.assertEqual(log.action_type, 'ROLE_CHANGE')
        self.assertEqual(log.before_state, {'role': 'TOURIST'})
        self.assertEqual(log.after_state, {'role': 'LOCAL_GUIDE'})
    
    def test_log_points_award(self):
        """Test logging point awards"""
        log = log_points_award(
            actor=self.admin_user,
            target_user=self.regular_user,
            points_change=100,
            balance_after=150,
            reason='Bonus points',
        )
        
        self.assertEqual(log.action_type, 'POINTS_AWARD')
        self.assertEqual(log.before_state, {'points_change': 100})
        self.assertEqual(log.after_state, {'balance_after': 150})
    
    def test_log_user_suspension(self):
        """Test logging user suspensions"""
        log = log_user_suspension(
            actor=self.admin_user,
            target_user=self.regular_user,
            is_active=False,
            reason='Violation of terms',
        )
        
        self.assertEqual(log.action_type, 'USER_SUSPENSION')
        self.assertEqual(log.before_state, {'is_active': True})
        self.assertEqual(log.after_state, {'is_active': False})
    
    def test_audit_log_immutability(self):
        """Test that audit logs are immutable (created_at should not change)"""
        log = log_audit(
            actor=self.admin_user,
            action_type='ADMIN_ACTION',
            action_description='Test action',
        )
        
        original_created_at = log.created_at
        
        # Try to update the log (should not change created_at)
        log.reason = 'Updated reason'
        log.save()
        
        # Reload from database
        log.refresh_from_db()
        
        # created_at should remain the same
        self.assertEqual(log.created_at, original_created_at)


class PermissionTests(TestCase):
    """Test cases for the enhanced permission system"""
    
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@kilicarego.com',
            password='testpass123',
            role='ADMIN',
            is_active=True
        )
        self.super_admin_user = User.objects.create_user(
            username='superadmin',
            email='superadmin@kilicarego.com',
            password='testpass123',
            role='ADMIN',
            is_active=True
        )
        self.guide_user = User.objects.create_user(
            username='guide',
            email='guide@example.com',
            password='testpass123',
            role='LOCAL_GUIDE',
            is_active=True,
            is_verified=True
        )
        self.unverified_guide = User.objects.create_user(
            username='unguide',
            email='unguide@example.com',
            password='testpass123',
            role='LOCAL_GUIDE',
            is_active=True,
            is_verified=False
        )
        self.b2b_user = User.objects.create_user(
            username='b2b',
            email='b2b@example.com',
            password='testpass123',
            role='B2B',
            is_active=True
        )
        self.tourist_user = User.objects.create_user(
            username='tourist',
            email='tourist@example.com',
            password='testpass123',
            role='TOURIST',
            is_active=True
        )
        self.inactive_user = User.objects.create_user(
            username='inactive',
            email='inactive@example.com',
            password='testpass123',
            role='TOURIST',
            is_active=False
        )
    
    def test_is_admin_permission(self):
        """Test IsAdmin permission"""
        from core.permissions import IsAdmin
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        permission = IsAdmin()
        
        # Admin user should have permission
        request = factory.get('/')
        request.user = self.admin_user
        self.assertTrue(permission.has_permission(request, None))
        
        # Tourist should not have permission
        request.user = self.tourist_user
        self.assertFalse(permission.has_permission(request, None))
        
        # Inactive user should not have permission
        request.user = self.inactive_user
        self.assertFalse(permission.has_permission(request, None))
    
    def test_is_verified_guide_permission(self):
        """Test IsVerifiedGuide permission"""
        from core.permissions import IsVerifiedGuide
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        permission = IsVerifiedGuide()
        
        # Verified guide should have permission
        request = factory.get('/')
        request.user = self.guide_user
        self.assertTrue(permission.has_permission(request, None))
        
        # Unverified guide should not have permission
        request.user = self.unverified_guide
        self.assertFalse(permission.has_permission(request, None))
        
        # Admin should not have permission
        request.user = self.admin_user
        self.assertFalse(permission.has_permission(request, None))
    
    def test_is_b2b_permission(self):
        """Test IsB2B permission"""
        from core.permissions import IsB2B
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        permission = IsB2B()
        
        # B2B user should have permission
        request = factory.get('/')
        request.user = self.b2b_user
        self.assertTrue(permission.has_permission(request, None))
        
        # Tourist should not have permission
        request.user = self.tourist_user
        self.assertFalse(permission.has_permission(request, None))
    
    def test_is_tourist_permission(self):
        """Test IsTourist permission"""
        from core.permissions import IsTourist
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        permission = IsTourist()
        
        # Tourist should have permission
        request = factory.get('/')
        request.user = self.tourist_user
        self.assertTrue(permission.has_permission(request, None))
        
        # Guide should not have permission
        request.user = self.guide_user
        self.assertFalse(permission.has_permission(request, None))
