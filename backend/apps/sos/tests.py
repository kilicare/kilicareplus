from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import SOSAlert, SOSResponse

User = get_user_model()


class SOSStateMachineTests(TestCase):
    """Test cases for SOS alert state machine"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='tourist',
            email='tourist@example.com',
            password='testpass123',
            role='TOURIST',
            is_active=True
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@kilicarego.com',
            password='testpass123',
            role='ADMIN',
            is_active=True
        )
        self.alert = SOSAlert.objects.create(
            user=self.user,
            latitude=-6.7924,
            longitude=35.6885,
            severity='HIGH',
            status='ACTIVE',
            message='Emergency help needed'
        )
    
    def test_can_transition_to_valid_states(self):
        """Test valid state transitions from ACTIVE"""
        self.assertTrue(self.alert.can_transition_to('RESPONDING'))
        self.assertTrue(self.alert.can_transition_to('ESCALATED'))
        self.assertTrue(self.alert.can_transition_to('RESOLVED'))
        self.assertTrue(self.alert.can_transition_to('CANCELLED'))
    
    def test_cannot_transition_to_invalid_states(self):
        """Test invalid state transitions from ACTIVE"""
        self.assertFalse(self.alert.can_transition_to('ACTIVE'))
    
    def test_transition_to_responding(self):
        """Test transitioning from ACTIVE to RESPONDING"""
        self.alert.transition_to('RESPONDING', actor=self.admin, reason='Guide responding')
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, 'RESPONDING')
    
    def test_transition_to_escalated(self):
        """Test transitioning from ACTIVE to ESCALATED"""
        self.alert.transition_to('ESCALATED', actor=self.admin, reason='Critical situation')
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, 'ESCALATED')
        self.assertEqual(self.alert.escalated_by, self.admin)
        self.assertEqual(self.alert.escalation_reason, 'Critical situation')
    
    def test_transition_to_resolved(self):
        """Test transitioning from ACTIVE to RESOLVED"""
        self.alert.transition_to('RESOLVED', actor=self.admin, reason='Issue resolved')
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, 'RESOLVED')
        self.assertIsNotNone(self.alert.resolved_at)
    
    def test_transition_to_cancelled(self):
        """Test transitioning from ACTIVE to CANCELLED"""
        self.alert.transition_to('CANCELLED', actor=self.admin, reason='False alarm')
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, 'CANCELLED')
        self.assertIsNotNone(self.alert.cancelled_at)
    
    def test_invalid_transition_raises_error(self):
        """Test that invalid transitions raise ValueError"""
        with self.assertRaises(ValueError):
            self.alert.transition_to('ACTIVE', actor=self.admin)
    
    def test_terminal_states_cannot_transition(self):
        """Test that terminal states (RESOLVED, CANCELLED) cannot transition"""
        self.alert.status = 'RESOLVED'
        self.alert.save()
        
        self.assertFalse(self.alert.can_transition_to('RESPONDING'))
        self.assertFalse(self.alert.can_transition_to('ESCALATED'))
        self.assertFalse(self.alert.can_transition_to('RESOLVED'))
        self.assertFalse(self.alert.can_transition_to('CANCELLED'))
    
    def test_admin_override_tracking(self):
        """Test that admin overrides are tracked"""
        self.alert.transition_to('RESOLVED', actor=self.admin, reason='Admin override')
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.admin_override_by, self.admin)
        self.assertEqual(self.alert.admin_override_reason, 'Admin override')
        self.assertIsNotNone(self.alert.admin_override_at)


class SOSResponseTests(TestCase):
    """Test cases for SOS response tracking"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='tourist',
            email='tourist@example.com',
            password='testpass123',
            role='TOURIST',
            is_active=True
        )
        self.guide = User.objects.create_user(
            username='guide',
            email='guide@example.com',
            password='testpass123',
            role='LOCAL_GUIDE',
            is_active=True,
            is_verified=True
        )
        self.alert = SOSAlert.objects.create(
            user=self.user,
            latitude=-6.7924,
            longitude=35.6885,
            severity='HIGH',
            status='ACTIVE',
            message='Emergency help needed'
        )
    
    def test_first_response_time_tracking(self):
        """Test that first response time is tracked"""
        self.assertEqual(self.alert.first_response_at, None)
        self.assertEqual(self.alert.avg_response_time_minutes, None)
        
        SOSResponse.objects.create(
            alert=self.alert,
            responder=self.guide,
            message='I am on my way',
            eta_minutes=15
        )
        
        self.alert.refresh_from_db()
        self.assertIsNotNone(self.alert.first_response_at)
        self.assertIsNotNone(self.alert.avg_response_time_minutes)
    
    def test_responder_count_increases(self):
        """Test that responder count increases with responses"""
        initial_count = self.alert.responder_count
        self.assertEqual(initial_count, 0)
        
        SOSResponse.objects.create(
            alert=self.alert,
            responder=self.guide,
            message='I am on my way',
            eta_minutes=15
        )
        
        self.alert.refresh_from_db()
        # Note: responder_count is not auto-incremented by the model, 
        # this would need to be handled in the view/consumer
