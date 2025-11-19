"""
Core utility functions and helpers.
"""
from functools import wraps
from django.core.cache import cache
from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework import status


def cache_result(timeout=300, key_prefix=''):
    """
    Decorator to cache function results.
    
    Args:
        timeout: Cache timeout in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}_{func.__name__}_{str(args)}_{str(kwargs)}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            return result
        return wrapper
    return decorator


def method_cache_result(timeout=300, key_prefix=''):
    """
    Method decorator for caching class method results.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # Generate cache key including instance
            cache_key = f"{key_prefix}_{self.__class__.__name__}_{func.__name__}_{str(args)}_{str(kwargs)}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute method and cache result
            result = func(self, *args, **kwargs)
            cache.set(cache_key, result, timeout)
            return result
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern):
    """
    Invalidate all cache keys matching a pattern.
    Note: This requires Redis with keys() support or a custom cache backend.
    """
    try:
        # This works with Redis backend
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(pattern)
        elif hasattr(cache, '_cache') and hasattr(cache._cache, 'delete_pattern'):
            cache._cache.delete_pattern(pattern)
        else:
            # For other backends, we can't easily delete by pattern
            # In production, use Redis for proper pattern deletion
            pass
    except Exception as e:
        # Log error but don't fail
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Cache invalidation failed: {e}")


def delete_cache_keys(keys):
    """
    Delete multiple cache keys.
    """
    for key in keys:
        cache.delete(key)


class CacheMixin:
    """
    Mixin class for views that need caching functionality.
    """
    cache_timeout = 300
    cache_key_prefix = ''
    
    def get_cache_key(self, *args, **kwargs):
        """Generate cache key for this view."""
        return f"{self.cache_key_prefix}_{self.__class__.__name__}_{str(args)}_{str(kwargs)}"
    
    def get_cached_response(self, cache_key):
        """Get cached response if available."""
        return cache.get(cache_key)
    
    def set_cached_response(self, cache_key, response_data):
        """Cache response data."""
        cache.set(cache_key, response_data, self.cache_timeout)

