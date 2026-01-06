import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List
from .redis_client import get_redis
import json
from .igdb_client import igdb_client
from .cache_layer import get_cached_raw_primitives

# Popularity type weighting configurations
WEIGHTS = {
    "popular_recent": {1: 0.20, 2: 0.50, 3: 0.30},
    "custom_top100":  {2: 0.20, 3: 0.40, 4: 0.40},
}


async def compute_and_cache(
    cache_key: str,
    types: list[int],
    weight_map: dict[int, float],
    min_rating_count: int
) -> list[dict]:
    """
    Compute weighted scores for games and cache the result.
    
    1. Fetch raw popularity primitives for given types
    2. Calculate weighted scores based on weight_map
    3. Fetch basic game info
    4. Combine scores with game info
    5. Cache and return
    """
    redis = await get_redis()

    # Fetch raw popularity data
    raw = await get_cached_raw_primitives(types, limit=500)

    # Calculate weighted scores
    scored = igdb_client.compute_weighted_scores(raw, weight_map)
    scored.sort(key=lambda x: x["weighted_score"], reverse=True)

    # Fetch basic game information
    basic = await igdb_client.get_basic_game_info_from_entries(scored, min_rating_count)
    lookup = {g["id"]: g for g in basic}

    # Combine scores with game information
    combined = []
    for entry in scored:
        game = lookup.get(entry["game_id"])
        # Skip entries without game data or missing name
        if not game or not game.get("name"):
            continue
        game["weighted_score"] = entry["weighted_score"]
        combined.append(game)

    # Cache and return
    await redis.set(cache_key, json.dumps(combined), ex=86400)
    return combined


async def refresh_popular_recent(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Fetch popular games from the last 12 months with weighted scores.
    """
    lower_bound = int((datetime.utcnow() - timedelta(days=365)).timestamp())
    upper_bound = int(datetime.utcnow().timestamp())

    cached_games = await compute_and_cache(
        cache_key="popular_recent_full",
        types=[1, 2, 3],
        weight_map=WEIGHTS["popular_recent"],
        min_rating_count=3
    )

    # Filter by release date (include games without dates)
    recent_games = [
        game for game in cached_games
        if not game.get("first_release_date")
        or (lower_bound <= game["first_release_date"] <= upper_bound)
    ]

    redis = await get_redis()
    await redis.set("popular_recent", json.dumps(recent_games), ex=86400)

    return recent_games[:limit]

async def refresh_custom_top100(limit: int = 100) -> List[Dict[str, Any]]:
    """
    Fetch top 100 games based on custom popularity weights.
    """
    games = await compute_and_cache(
        cache_key="custom_top100",
        types=[2, 3, 4],
        weight_map=WEIGHTS["custom_top100"],
        min_rating_count=0
    )
    return games[:limit]


async def refresh_popular_by_type(pop_type: int = 5, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Fetch popular games by a specific popularity type (e.g., type 5 = 24h peak).
    """
    cache_key = f"popular_by_type:{pop_type}"
    games = await compute_and_cache(
        cache_key=cache_key,
        types=[pop_type],
        weight_map={pop_type: 1.0},
        min_rating_count=0
    )
    return games[:limit]

async def refresh_genre_list(
    genre_id: int,
    min_rating_count: int,
    limit: int,
) -> List[Dict[str, Any]]:
    """
    Fetch games by genre from IGDB and cache the result.
    Returns basic game information (id, name, cover, genres, etc.)
    """
    cache_key = f"genre_list:{genre_id}:{min_rating_count}:"
    redis = await get_redis()

    # Try cache first
    if (data := await redis.get(cache_key)):
        games = json.loads(data)
        return games[:limit]

    # Cache miss: fetch from IGDB
    raw_list = await igdb_client.get_games_by_genre(
        genre_id=genre_id,
        min_rating_count=min_rating_count
    )

    # Cache and return
    await redis.set(cache_key, json.dumps(raw_list), ex=86400)
    return raw_list[:limit]



async def refresh_all_popularities():
    """
    Refresh all popularity caches in parallel.
    This is called during application startup.
    """
    await asyncio.gather(
        refresh_popular_recent(),
        refresh_custom_top100(),
        refresh_popular_by_type(5, 20),
    )
