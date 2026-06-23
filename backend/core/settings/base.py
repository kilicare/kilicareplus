import environ
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])

# Validate BASE_URL in production mode
BASE_URL = env('BASE_URL', default='http://localhost:8000')
if not DEBUG and BASE_URL.startswith('http://localhost'):
    raise ValueError(
        'BASE_URL is set to localhost in production mode. '
        'Please set BASE_URL to your production backend URL (e.g., https://your-app.onrender.com)'
    )

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
    'cloudinary',
    'cloudinary_storage',
    'django_celery_beat',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.passport',
    'apps.moments',
    'apps.ai_chat',
    'apps.messaging',
    'apps.sos',
    'apps.map_tips',
    'apps.experiences',
    'apps.subscriptions',
    'apps.payments',
    'apps.showcase',
    'apps.bookings',
    'apps.predictions',
    'apps.affiliates',
    'apps.notifications',
    'apps.follow',
    'apps.b2b',
    'apps.admin_ops',
    'apps.moderation',
    'apps.settings',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ],
    },
}]

# Database configuration using DATABASE_URL
# Automatically switches between local PostgreSQL and Render PostgreSQL
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default=env('DATABASE_URL', default='postgresql://lastmateru:Gervas03@@@localhost:5432/kilicarego'),
        conn_max_age=600,
        ssl_require='sslmode=require' if not DEBUG else None,
    )
}

# Safe channel layer: Use InMemoryChannelLayer for dev mode (no Redis dependency)
# Falls back to in-memory channel layer if Redis is unavailable
USE_REDIS_CHANNELS = env.bool('USE_REDIS_CHANNELS', default=False)

if USE_REDIS_CHANNELS and not DEBUG:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [(env('REDIS_HOST', default='localhost'), 6379)],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# Safe Celery configuration: Use always eager mode for dev (no Redis dependency)
# Tasks execute synchronously in dev mode
CELERY_BROKER_URL = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Dar_es_Salaam'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Execute tasks synchronously in dev mode (no Redis required)
CELERY_TASK_ALWAYS_EAGER = env.bool('CELERY_TASK_ALWAYS_EAGER', default=DEBUG)
CELERY_TASK_EAGER_PROPAGATES = True

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.PublicEndpointAwareJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    # Disable throttling in dev mode to prevent Redis dependency crashes
    'DEFAULT_THROTTLE_CLASSES': [] if DEBUG else [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'follow_spam': '15/minute',
        'like_spam': '30/minute',
        'notif_spam': '60/minute',
        'moment_creation': '5/minute',
        # Authentication throttles - Protect against brute force attacks
        'login': '5/minute',
        'register': '3/hour',
        'token_refresh': '10/minute',
        'otp': '3/minute',
        'password_reset': '3/hour',
    }
}

# Safe cache backend: Use LocMemCache for dev mode (no Redis dependency)
# Falls back to in-memory cache if Redis is unavailable
USE_REDIS_CACHE = env.bool('USE_REDIS_CACHE', default=False)

if USE_REDIS_CACHE and not DEBUG:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': env('REDIS_URL', default='redis://localhost:6379/1'),
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }

from datetime import timedelta
SIMPLE_JWT = {
    # Token Lifetimes
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    
    # Rotation & Blacklist
    # Phase 1: Enable token rotation for hybrid auth system
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    # Hybrid auth support:
    # - Refresh tokens now sent in HttpOnly cookies (Phase 1)
    # - Access tokens still returned in response body
    # - localStorage-based JWT still supported (backward compatibility)
}

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://kilicareplus.vercel.app',
])

# Phase 1: Enable credentials support for cookie-based refresh tokens
CORS_ALLOW_CREDENTIALS = True

# Add CSRF trusted origins for cookie-based requests
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://kilicareplus.vercel.app',
])

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': env('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': env('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': env('CLOUDINARY_API_SECRET', default=''),
}
# Only use Cloudinary if credentials are properly configured
if env('CLOUDINARY_CLOUD_NAME', default='') and env('CLOUDINARY_API_KEY', default='') and env('CLOUDINARY_API_SECRET', default=''):
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# WhiteNoise configuration for static file serving with Daphne
WHITENOISE_STATIC_PREFIX = 'static'
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = DEBUG  # Auto-refresh static files in development

EMAIL_BACKEND = env(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend'
)
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='KilicareGO+ <noreply@kilicarego.com>')

GROQ_API_KEY = env('GROQ_API_KEY', default='')
PREDICTOR_ENGINE_URL = env('PREDICTOR_ENGINE_URL', default='http://localhost:8001')
MPESA_CONSUMER_KEY = env('MPESA_CONSUMER_KEY', default='')
MPESA_CONSUMER_SECRET = env('MPESA_CONSUMER_SECRET', default='')
MPESA_SHORTCODE = env('MPESA_SHORTCODE', default='174379')
MPESA_PASSKEY = env('MPESA_PASSKEY', default='')
MPESA_ENV = env('MPESA_ENV', default='sandbox')
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='')
PREDICTOR_URL = env('PREDICTOR_URL', default='http://localhost:8001')
BASE_URL = env('BASE_URL', default='http://localhost:8000')
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')
FIREBASE_CREDENTIALS_PATH = env('FIREBASE_CREDENTIALS_PATH', default='')

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Dar_es_Salaam'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]