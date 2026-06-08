from rest_framework.throttling import UserRateThrottle


class FollowSpamThrottle(UserRateThrottle):
    scope = 'follow_spam'


class LikeSpamThrottle(UserRateThrottle):
    scope = 'like_spam'


class NotificationSpamThrottle(UserRateThrottle):
    scope = 'notif_spam'


class MomentCreationThrottle(UserRateThrottle):
    scope = 'moment_creation'
