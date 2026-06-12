from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class FollowSpamThrottle(UserRateThrottle):
    scope = 'follow_spam'


class LikeSpamThrottle(UserRateThrottle):
    scope = 'like_spam'


class NotificationSpamThrottle(UserRateThrottle):
    scope = 'notif_spam'


class MomentCreationThrottle(UserRateThrottle):
    scope = 'moment_creation'


# Authentication throttles - Protect against brute force attacks
class LoginThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterThrottle(AnonRateThrottle):
    scope = 'register'


class TokenRefreshThrottle(AnonRateThrottle):
    scope = 'token_refresh'


class OTPThrottle(AnonRateThrottle):
    scope = 'otp'


class PasswordResetThrottle(AnonRateThrottle):
    scope = 'password_reset'
