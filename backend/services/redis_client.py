import asyncio
import os
import redis.asyncio as redis
from services.logging_service import app_logger

redis_instance: redis.Redis | None = None

async def get_redis() -> redis.Redis:
    global redis_instance
    if redis_instance is None:
        try:
            # Get Redis URL from environment or build from components
            redis_url = os.getenv("REDIS_URL")
            if not redis_url:
                # Build from components (for Docker Compose)
                redis_host = os.getenv("REDIS_HOST", "redis")
                redis_port = os.getenv("REDIS_PORT", "6379")
                redis_password = os.getenv("REDIS_PASSWORD", "")
                
                if redis_password:
                    redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}"
                else:
                    redis_url = f"redis://{redis_host}:{redis_port}"
            
            # build the asynchronous client
            redis_instance = redis.from_url(
                redis_url, 
                decode_responses=True
            )
            # Test connection
            await redis_instance.ping()
            app_logger.info("Redis connection established", action="REDIS_CONNECT")
        except Exception as e:
            app_logger.error(f"Redis connection failed: {str(e)}")
            raise
    return redis_instance

async def close_redis() -> None:
    global redis_instance
    if redis_instance:
        try:
            await redis_instance.close()
            app_logger.info("Redis connection closed", action="REDIS_DISCONNECT")
        except Exception as e:
            app_logger.error(f"Redis disconnect error: {str(e)}")
        finally:
            redis_instance = None


async def clear_cache() -> None:
    """
    Clears on server startup (or whenever desired) all
    old keys so they are re-cached on next access.
    """
    try:
        client = await get_redis()
        await client.flushdb()
        app_logger.info("Redis cache cleared", action="CACHE_CLEAR")
    except Exception as e:
        app_logger.error(f"Cache clear failed: {str(e)}")