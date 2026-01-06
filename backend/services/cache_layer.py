import json
from .redis_client import get_redis
from .igdb_client import igdb_client
from .logging_service import app_logger

async def get_cached_raw_primitives(types: list[int], limit: int = 500) -> list[dict]:
    redis = await get_redis()
    key = "raw_primitives_" + "_".join(map(str, types))
    
    try:
        cached = await redis.get(key)
        if cached:
            app_logger.info(f"Cache hit for primitives key: {key}", action="CACHE_HIT")
            return json.loads(cached)
        
        app_logger.info(f"Cache miss for primitives key: {key}, fetching from IGDB", action="CACHE_MISS")
        raw = await igdb_client.get_popularity_primitives(types=types, limit=limit)
        await redis.set(key, json.dumps(raw), ex=86400)
        app_logger.info(f"Cache set for primitives key: {key} (expires in 24h)", action="CACHE_SET")
        return raw
    except Exception as e:
        app_logger.error(f"Cache operation failed for key {key}: {str(e)}")
        # Fallback: try to get from IGDB directly
        try:
            return await igdb_client.get_popularity_primitives(types=types, limit=limit)
        except Exception as igdb_error:
            app_logger.error(f"IGDB fallback failed: {str(igdb_error)}")
            return []
