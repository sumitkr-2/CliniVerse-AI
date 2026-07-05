import json
import logging
from typing import Any, Optional
import redis
from app.core.config import settings

logger = logging.getLogger("app.cache")


class CacheService:
    _redis_client: Optional[redis.Redis] = None
    _memory_cache = {}

    @classmethod
    def get_redis(cls) -> Optional[redis.Redis]:
        """Gets or initializes the Redis connection with fallback to None."""
        if cls._redis_client is None:
            try:
                if settings.REDIS_URL:
                    cls._redis_client = redis.Redis.from_url(
                        settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2
                    )
                    # Test ping
                    cls._redis_client.ping()
                    logger.info("Connected to Redis successfully.")
                else:
                    logger.warning("REDIS_URL is not set. Caching will run in-memory.")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Falling back to in-memory caching.")
                cls._redis_client = None
        return cls._redis_client

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """Gets value from Redis cache, falls back to memory cache."""
        r = cls.get_redis()
        if r:
            try:
                val = r.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.warning(f"Redis get failed: {e}")
        return cls._memory_cache.get(key)

    @classmethod
    def set(cls, key: str, value: Any, expire_seconds: int = 3600) -> None:
        """Sets key-value in Redis cache, falls back to memory cache."""
        r = cls.get_redis()
        if r:
            try:
                r.set(key, json.dumps(value), ex=expire_seconds)
                return
            except Exception as e:
                logger.warning(f"Redis set failed: {e}")
        cls._memory_cache[key] = value
