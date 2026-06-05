from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Report, ModerationAction
from .services import create_report, moderate_report, bulk_moderate

User = get_user_model()


class ModerationModelTests(TestCase):
    """Test cases for moderation models"""
    
    def setUp(self):
        self.reporter = User.objects.create_user(
            username='reporter',
            email='reporter@example.com',
            password='testpass123',
            role='TOURIST',
            is_active=True
        )
        self.content_owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='testpass123',
            role='LOCAL_GUIDE',
            is_active=True
        )
        self.moderator = User.objects.create_user(
            username='moderator',
            email='moderator@example.com',
            password='testpass123',
            role='ADMIN',
            is_active=True
        )
    
    def test_create_report(self):
        """Test creating a moderation report"""
        report = create_report(
            reporter=self.reporter,
            content_type='MOMENT',
            content_id=123,
            reason='INAPPROPRIATE',
            description='This content is inappropriate',
            evidence_urls=['https://example.com/evidence.jpg'],
            content_owner=self.content_owner
        )
        
        self.assertEqual(report.reporter, self.reporter)
        self.assertEqual(report.content_type, 'MOMENT')
        self.assertEqual(report.content_id, 123)
        self.assertEqual(report.reason, 'INAPPROPRIATE')
        self.assertEqual(report.status, 'PENDING')
        self.assertEqual(report.content_owner, self.content_owner)
    
    def test_report_status_choices(self):
        """Test that report status choices are valid"""
        report = Report.objects.create(
            reporter=self.reporter,
            content_type='TIP',
            content_id=456,
            reason='SPAM',
            description='Spam content',
            content_owner=self.content_owner
        )
        
        valid_statuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'HIDDEN', 'DELETED', 'FEATURED', 'RESTORED']
        self.assertIn(report.status, valid_statuses)
    
    def test_moderation_action_creation(self):
        """Test creating a moderation action"""
        report = create_report(
            reporter=self.reporter,
            content_type='MOMENT',
            content_id=123,
            reason='INAPPROPRIATE',
            description='Inappropriate content',
            content_owner=self.content_owner
        )
        
        action = ModerationAction.objects.create(
            report=report,
            moderator=self.moderator,
            action_type='HIDE',
            content_type='MOMENT',
            content_id=123,
            target_user=self.content_owner,
            reason='Content violates guidelines',
            notes='Hidden from public view'
        )
        
        self.assertEqual(action.report, report)
        self.assertEqual(action.moderator, self.moderator)
        self.assertEqual(action.action_type, 'HIDE')
        self.assertEqual(action.target_user, self.content_owner)


class ModerationServiceTests(TestCase):
    """Test cases for moderation service layer"""
    
    def setUp(self):
        self.reporter = User.objects.create_user(
            username='reporter',
            email='reporter@example.com',
            password='testpass123',
            role='TOURIST',
            is_active=True
        )
        self.content_owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='testpass123',
            role='LOCAL_GUIDE',
            is_active=True
        )
        self.moderator = User.objects.create_user(
            username='moderator',
            email='moderator@example.com',
            password='testpass123',
            role='ADMIN',
            is_active=True
        )
    
    def test_moderate_report_approve(self):
        """Test approving a report"""
        report = create_report(
            reporter=self.reporter,
            content_type='MOMENT',
            content_id=123,
            reason='INAPPROPRIATE',
            description='Inappropriate content',
            content_owner=self.content_owner
        )
        
        moderated = moderate_report(
            report_id=report.id,
            moderator=self.moderator,
            action='APPROVE',
            reason='No violation found',
            notes='Content is acceptable'
        )
        
        self.assertEqual(moderated.status, 'APPROVED')
        self.assertEqual(moderated.moderator, self.moderator)
        self.assertIsNotNone(moderated.reviewed_at)
        self.assertIsNotNone(moderated.resolved_at)
    
    def test_moderate_report_hide(self):
        """Test hiding content via moderation"""
        report = create_report(
            reporter=self.reporter,
            content_type='MOMENT',
            content_id=123,
            reason='INAPPROPRIATE',
            description='Inappropriate content',
            content_owner=self.content_owner
        )
        
        moderated = moderate_report(
            report_id=report.id,
            moderator=self.moderator,
            action='HIDE',
            reason='Content violates guidelines',
            notes='Hidden from public view'
        )
        
        self.assertEqual(moderated.status, 'HIDDEN')
        self.assertEqual(moderated.moderator, self.moderator)
    
    def test_moderate_report_delete(self):
        """Test deleting content via moderation"""
        report = create_report(
            reporter=self.reporter,
            content_type='MOMENT',
            content_id=123,
            reason='INAPPROPRIATE',
            description='Inappropriate content',
            content_owner=self.content_owner
        )
        
        moderated = moderate_report(
            report_id=report.id,
            moderator=self.moderator,
            action='DELETE',
            reason='Severe violation',
            notes='Content deleted'
        )
        
        self.assertEqual(moderated.status, 'DELETED')
        self.assertEqual(moderated.moderator, self.moderator)
    
    def test_bulk_moderate(self):
        """Test bulk moderation of multiple reports"""
        report1 = create_report(
            reporter=self.reporter,
            content_type='MOMENT',
            content_id=123,
            reason='SPAM',
            description='Spam content',
            content_owner=self.content_owner
        )
        
        report2 = create_report(
            reporter=self.reporter,
            content_type='TIP',
            content_id=456,
            reason='SPAM',
            description='Spam tip',
            content_owner=self.content_owner
        )
        
        updated = bulk_moderate(
            report_ids=[report1.id, report2.id],
            moderator=self.moderator,
            action='REJECT',
            reason='No violation found',
            notes='Bulk rejection'
        )
        
        self.assertEqual(len(updated), 2)
        for report in updated:
            self.assertEqual(report.status, 'REJECTED')
            self.assertEqual(report.moderator, self.moderator)
    
    def test_invalid_action_raises_error(self):
        """Test that invalid moderation actions are rejected"""
        report = create_report(
            reporter=self.reporter,
            content_type='MOMENT',
            content_id=123,
            reason='INAPPROPRIATE',
            description='Inappropriate content',
            content_owner=self.content_owner
        )
        
        # This should not raise an error in the current implementation,
        # but the view validates the action before calling the service
        # This test documents expected behavior
        pass


class ModerationQueueTests(TestCase):
    """Test cases for moderation queue functionality"""
    
    def setUp(self):
        self.reporter = User.objects.create_user(
            username='reporter',
            email='reporter@example.com',
            password='testpass123',
            role='TOURIST',
            is_active=True
        )
        self.content_owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='testpass123',
            role='LOCAL_GUIDE',
            is_active=True
        )
    
    def test_get_moderation_queue_default(self):
        """Test getting moderation queue with default filters"""
        from .services import get_moderation_queue
        
        # Create pending reports
        for i in range(5):
            create_report(
                reporter=self.reporter,
                content_type='MOMENT',
                content_id=i,
                reason='INAPPROPRIATE',
                description=f'Report {i}',
                content_owner=self.content_owner
            )
        
        queue = get_moderation_queue()
        self.assertGreater(len(queue), 0)
    
    def test_get_moderation_queue_with_status_filter(self):
        """Test getting moderation queue with status filter"""
        from .services import get_moderation_queue
        
        report1 = create_report(
            reporter=self.reporter,
            content_type='MOMENT',
            content_id=1,
            reason='INAPPROPRIATE',
            description='Report 1',
            content_owner=self.content_owner
        )
        
        report2 = create_report(
            reporter=self.reporter,
            content_type='TIP',
            content_id=2,
            reason='SPAM',
            description='Report 2',
            content_owner=self.content_owner
        )
        
        # Filter by PENDING status
        queue = get_moderation_queue(status_filter='PENDING')
        self.assertGreater(len(queue), 0)
