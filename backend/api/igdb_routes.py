import json
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional

import httpx

from models.igdb_models import GameBasicInfo
from services.igdb_client import igdb_client
from services.redis_client import get_redis
from services.popularity_service import refresh_popular_by_type, refresh_genre_list, refresh_popular_recent, refresh_custom_top100

router = APIRouter()

@router.get("/search", response_model=List[Dict[str, Any]])
async def search_games_route(query: str = Query(..., min_length=2), limit: int = Query(10, ge=1, le=50)):
    """
    Search games by name.
    Returns: id, name, slug, first_release_date, cover.image_id, genres.name
    Example: GET /igdb/search?query=witcher&limit=10
    """
    try:
        results = await igdb_client.search_games(search_term=query, limit=limit)
        return results
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"IGDB API error: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Search error: {exc}")


@router.get("/detail/{game_id}", response_model=Dict[str, Any])
async def get_game_detail_route(game_id: int):
    """
    Get all detail fields for a game by ID.
    Returns: id, name, slug, summary, storyline, genres, platforms, screenshots, videos, similar_games, companies
    Example: GET /igdb/detail/1942
    """
    game = await igdb_client.get_game_detail(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Spiel nicht gefunden.")
    return game

# --- 1) Angepasste /popular_recent Route ---
@router.get(
    "/popular_recent",
    response_model=List[Dict[str, Any]],
    summary="Popular games from the last 12 months with scores"
)
async def get_popular_recent_route(
    limit: int = Query(20, ge=1, le=100, description="Max number of games to return")
):
    redis = await get_redis()
    cache_key = "popular_recent"

    if (blob := await redis.get(cache_key)):
        games = json.loads(blob)
        return games[:limit]

    try:
        return await refresh_popular_recent(limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error fetching popular_recent: {exc}")

# --- 2) Angepasste /top100_custom Route ---
@router.get(
    "/top100_custom",
    response_model=List[Dict[str, Any]],
    summary="Top 100 games based on custom popularity weights"
)
async def get_top100_custom_route(
    limit: int = Query(20, ge=1, le=100, description="Max number of games (1–100)")
):
    redis = await get_redis()
    cache_key = "custom_top100"

    if (blob := await redis.get(cache_key)):
        games = json.loads(blob)
        return games[:limit]

    try:
        return await refresh_custom_top100(limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error fetching custom_top100: {exc}")

@router.get("/popular/type", response_model=List[Dict[str, Any]])
async def get_popular_by_type(
    limit: int    = Query(20, ge=1, le=100),
    pop_type: int = Query(5,  ge=1,  description="Popularity type ID")
):
    """Popular games by a specific popularity type (e.g., 24h peak = type 5)"""
    redis     = await get_redis()
    cache_key = f"popular_by_type:{pop_type}"

    if (blob := await redis.get(cache_key)):
        games = json.loads(blob)
        return games[:limit]

    try:
        return await refresh_popular_by_type(pop_type=pop_type, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error fetching IGDB data: {exc}")


@router.get("/genre_list", response_model=List[Dict[str, Any]])
async def get_games_by_genre_route(
    genre_id: int         = Query(..., ge=0),
    min_rating_count: int = Query(5, ge=0),
    limit: int            = Query(20, ge=1, le=100),
):
    try:
        return await refresh_genre_list(
            genre_id, min_rating_count, limit
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"IGDB error: {exc}")