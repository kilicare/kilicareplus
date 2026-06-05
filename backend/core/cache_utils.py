import redis
import environ
from django.core.cache import cache

env = environ.Env()


def get_redis_client():
    redis_url = env('REDIS_URL', default='redis://localhost:6379/1')
    return redis.from_url(redis_url)


def invalidate_feed_cache():
    """Invalidate all feed page cache and trending moment cache keys."""
    try:
        r = get_redis_client()
        # Scan and delete all feed page cache keys
        for key in r.scan_iter("*feed_page_*"):
            r.delete(key)
        # Scan and delete trending cache
        for key in r.scan_iter("*feed_trending*"):
            r.delete(key)
    except Exception:
        pass


def invalidate_profile_cache(username_or_id):
    """Invalidate cached profile data for a specific username or ID."""
    try:
        r = get_redis_client()
        for key in r.scan_iter(f"*user_profile:{username_or_id}*"):
            r.delete(key)
    except Exception:
        pass


def invalidate_followers_cache(user_id):
    """Invalidate cached followers/following list counts and list structures."""
    try:
        r = get_redis_client()
        for key in r.scan_iter(f"*followers_list:{user_id}*"):
            r.delete(key)
        for key in r.scan_iter(f"*following_list:{user_id}*"):
            r.delete(key)
        for key in r.scan_iter(f"*follow_check:{user_id}*"):
            r.delete(key)
    except Exception:
        pass
