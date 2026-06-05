"""
Safe Cache Wrapper

Provides safe cache operations that never crash due to Redis unavailability.
All cache operations are wrapped in try/except with safe fallbacks.
"""
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)


def safe_get(key, default=None):
    """
    Safely get value from cache.
    
    Returns default if cache operation fails.
    """
    try:
        return cache.get(key, default)
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to get key {key}: {e}')
        return default


def safe_set(key, value, timeout=300):
    """
    Safely set value in cache.
    
    Returns True if successful, False otherwise.
    """
    try:
        cache.set(key, value, timeout)
        return True
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to set key {key}: {e}')
        return False


def safe_delete(key):
    """
    Safely delete key from cache.
    
    Returns True if successful, False otherwise.
    """
    try:
        cache.delete(key)
        return True
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to delete key {key}: {e}')
        return False


def safe_get_many(keys):
    """
    Safely get multiple keys from cache.
    
    Returns dict with keys that succeeded, empty dict on failure.
    """
    try:
        return cache.get_many(keys)
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to get many keys: {e}')
        return {}


def safe_set_many(mapping, timeout=300):
    """
    Safely set multiple keys in cache.
    
    Returns True if successful, False otherwise.
    """
    try:
        cache.set_many(mapping, timeout)
        return True
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to set many keys: {e}')
        return False


def safe_delete_many(keys):
    """
    Safely delete multiple keys from cache.
    
    Returns True if successful, False otherwise.
    """
    try:
        cache.delete_many(keys)
        return True
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to delete many keys: {e}')
        return False


def safe_clear():
    """
    Safely clear all cache.
    
    Returns True if successful, False otherwise.
    """
    try:
        cache.clear()
        return True
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to clear cache: {e}')
        return False


def safe_incr(key, delta=1):
    """
    Safely increment key in cache.
    
    Returns new value if successful, None otherwise.
    """
    try:
        return cache.incr(key, delta)
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to increment key {key}: {e}')
        return None


def safe_decr(key, delta=1):
    """
    Safely decrement key in cache.
    
    Returns new value if successful, None otherwise.
    """
    try:
        return cache.decr(key, delta)
    except Exception as e:
        logger.warning(f'[SafeCache] Failed to decrement key {key}: {e}')
        return None
