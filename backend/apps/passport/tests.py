from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import PassportProfile, Badge, UserBadge, PointsTransaction
from .services import award_points_to_user, seed_badges, award_achievement_stamp

User = get_user_model()


class PointsSystemTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_award_points_basic(self):
        """Test basic point awarding"""
        txn = award_points_to_user(self.user, 'POST_MOMENT')
        self.assertIsNotNone(txn)
        self.assertEqual(txn.points_change, 5)
        self.assertEqual(txn.action_type, 'POST_MOMENT')

    def test_award_points_level_progression(self):
        """Test level progression based on points"""
        passport = PassportProfile.objects.get(user=self.user)
        self.assertEqual(passport.level, 'EXPLORER')
        
        # Award enough points for ADVENTURER (500)
        for _ in range(100):
            award_points_to_user(self.user, 'POST_MOMENT')
        
        passport.refresh_from_db()
        self.assertEqual(passport.level, 'ADVENTURER')

    def test_prevent_negative_points(self):
        """Test that negative points are prevented"""
        txn = award_points_to_user(self.user, 'INVALID_ACTION', extra_pts=-100)
        self.assertIsNone(txn)

    def test_rate_limiting(self):
        """Test rate limiting for spam actions"""
        # Try to award points 11 times in quick succession
        for _ in range(11):
            award_points_to_user(self.user, 'POST_MOMENT')
        
        # The 11th should be rate limited
        passport = PassportProfile.objects.get(user=self.user)
        # Should only have 10 transactions * 5 points = 50 points
        self.assertEqual(passport.points, 50)

    def test_transaction_integrity(self):
        """Test transaction records are created correctly"""
        award_points_to_user(self.user, 'POST_MOMENT')
        txn = PointsTransaction.objects.filter(user=self.user).first()
        
        self.assertEqual(txn.user, self.user)
        self.assertEqual(txn.points_change, 5)
        self.assertEqual(txn.balance_after, 55)  # 50 initial + 5


class BadgeSystemTests(TestCase):
    def setUp(self):
        seed_badges()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_badges_seeded(self):
        """Test that all 10 badges are seeded"""
        self.assertEqual(Badge.objects.count(), 10)

    def test_badge_unlock_on_points(self):
        """Test badge unlocks when reaching point thresholds"""
        # Award 100 points for first badge
        for _ in range(20):
            award_points_to_user(self.user, 'POST_MOMENT')
        
        # Check if badge was unlocked
        user_badges = UserBadge.objects.filter(user=self.user)
        self.assertGreater(user_badges.count(), 0)

    def test_no_duplicate_badges(self):
        """Test that badges cannot be unlocked twice"""
        award_points_to_user(self.user, 'ADMIN_AWARD', extra_pts=1000)
        award_points_to_user(self.user, 'ADMIN_AWARD', extra_pts=1000)
        
        # Should still have only one badge for this threshold
        user_badges = UserBadge.objects.filter(user=self.user)
        badge_names = [ub.badge.name for ub in user_badges]
        self.assertEqual(badge_names.count('Mtaalam'), 1)


class LevelProgressionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_explorer_to_adventurer(self):
        """Test progression from EXPLORER to ADVENTURER (500 points)"""
        passport = PassportProfile.objects.get(user=self.user)
        award_points_to_user(self.user, 'ADMIN_AWARD', extra_pts=500)
        
        passport.refresh_from_db()
        self.assertEqual(passport.level, 'ADVENTURER')

    def test_adventurer_to_guardian(self):
        """Test progression from ADVENTURER to GUARDIAN (2000 points)"""
        passport = PassportProfile.objects.get(user=self.user)
        award_points_to_user(self.user, 'ADMIN_AWARD', extra_pts=2000)
        
        passport.refresh_from_db()
        self.assertEqual(passport.level, 'GUARDIAN')

    def test_guardian_to_legend(self):
        """Test progression from GUARDIAN to LEGEND (5000 points)"""
        passport = PassportProfile.objects.get(user=self.user)
        award_points_to_user(self.user, 'ADMIN_AWARD', extra_pts=5000)
        
        passport.refresh_from_db()
        self.assertEqual(passport.level, 'LEGEND')


class LeaderboardTests(TestCase):
    def setUp(self):
        # Create multiple users with different point levels
        self.user1 = User.objects.create_user(username='user1', email='u1@test.com', password='pass')
        self.user2 = User.objects.create_user(username='user2', email='u2@test.com', password='pass')
        self.user3 = User.objects.create_user(username='user3', email='u3@test.com', password='pass')
        
        award_points_to_user(self.user1, 'ADMIN_AWARD', extra_pts=1000)
        award_points_to_user(self.user2, 'ADMIN_AWARD', extra_pts=500)
        award_points_to_user(self.user3, 'ADMIN_AWARD', extra_pts=2000)

    def test_leaderboard_ranking(self):
        """Test that leaderboard ranks users correctly by points"""
        from .views import leaderboard_view
        from rest_framework.test import APIRequestFactory
        from rest_framework.request import Request
        
        factory = APIRequestFactory()
        request = factory.get('/api/passport/leaderboard/')
        request.user = self.user1
        
        response = leaderboard_view(request)
        leaderboard = response.data['leaderboard']
        
        # user3 should be first (2000 points), user1 second (1000), user2 third (500)
        self.assertEqual(leaderboard[0]['username'], 'user3')
        self.assertEqual(leaderboard[1]['username'], 'user1')
        self.assertEqual(leaderboard[2]['username'], 'user2')


class PassportSystemTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_achievement_stamp_award(self):
        """Test achievement stamp awarding"""
        stamp = award_achievement_stamp(
            self.user,
            'FIRST_MOMENT',
            {'moment_id': 123}
        )
        
        self.assertIsNotNone(stamp)
        self.assertEqual(stamp['type'], 'FIRST_MOMENT')
        
        passport = PassportProfile.objects.get(user=self.user)
        self.assertEqual(len(passport.achievement_stamps), 1)

    def test_no_duplicate_stamps(self):
        """Test that stamps cannot be awarded twice"""
        award_achievement_stamp(self.user, 'FIRST_MOMENT')
        award_achievement_stamp(self.user, 'FIRST_MOMENT')
        
        passport = PassportProfile.objects.get(user=self.user)
        self.assertEqual(len(passport.achievement_stamps), 1)

    def test_qr_code_generation(self):
        """Test QR code generation"""
        from .services import generate_qr_code
        passport = PassportProfile.objects.get(user=self.user)
        
        qr_code = generate_qr_code(passport)
        self.assertIsNotNone(qr_code)
        self.assertGreater(len(qr_code), 0)
        
        # Second call should return existing QR code
        qr_code2 = generate_qr_code(passport)
        self.assertEqual(qr_code, qr_code2)
