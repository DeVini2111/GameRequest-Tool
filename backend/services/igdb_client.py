import json
import logging
import time
from datetime import datetime, timedelta
import os
import httpx
from typing import List, Optional, Dict, Any, Set

from dotenv import load_dotenv
from services.logging_service import app_logger

load_dotenv()

IGDB_CLIENT_ID     = os.getenv("IGDB_CLIENT_ID")
IGDB_CLIENT_SECRET = os.getenv("IGDB_CLIENT_SECRET")
TOKEN_URL          = "https://id.twitch.tv/oauth2/token"
IGDB_BASE_URL      = "https://api.igdb.com/v4"

_token_cache: Optional[str] = None

logging.basicConfig(
    level=logging.INFO,  # or DEBUG for more details
    format="%(asctime)s - %(levelname)s - %(message)s"
)


def transform_game_basic_info(raw: dict) -> dict:
    """
    Takes a raw IGDB game object with nested genres.name
    and returns a reduced dict with only essential fields.
    """
    nested = raw.get("genres") or []
    genre_names = [g["name"] for g in nested]
    
    return {
        "id":                 raw.get("id"),
        "name":               raw.get("name"),
        "slug":               raw.get("slug"),
        "cover":              raw.get("cover"),
        "first_release_date": raw.get("first_release_date"),
        "total_rating_count": raw.get("total_rating_count"),
        "genre_names":        genre_names,
    }

class IgdbClient:
    def __init__(self):
        self.client = httpx.AsyncClient()
        self.token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.redis = None

    
    async def _get_redis(self):
        return self.redis

    async def _get_access_token(self) -> str:
        now = datetime.utcnow()
        if self.token and self.token_expires_at and now < self.token_expires_at:
            logging.debug("[TOKEN] Returning cached token")
            return self.token

        logging.info("[TOKEN] Fetching new access token from Twitch")
        params = {
            "client_id": IGDB_CLIENT_ID,
            "client_secret": IGDB_CLIENT_SECRET,
            "grant_type": "client_credentials",
        }

        r = await self.client.post(TOKEN_URL, params=params)
        r.raise_for_status()
        data = r.json()
        self.token = data["access_token"]
        # expires_in is in seconds; refresh a minute early
        expires_in = data.get("expires_in", 0)
        self.token_expires_at = now + timedelta(seconds=max(expires_in - 60, 0))
        return self.token


    async def _post_query(self, endpoint: str, query: str) -> List[Dict[str, Any]]:
        """
        Makes a POST request to /v4/{endpoint} with the IGDB query
        and returns the raw JSON list.
        """
        token = await self._get_access_token()
        url = f"{IGDB_BASE_URL}/{endpoint}"
        headers = {
            "Client-ID": IGDB_CLIENT_ID,
            "Authorization": f"Bearer {token}",
        }


        start_time = time.perf_counter()
        try:
            resp = await self.client.post(url, headers=headers, content=query)
            duration = time.perf_counter() - start_time

            app_logger.info(f"IGDB API call: {endpoint} - {resp.status_code} in {duration:.2f}s", action="IGDB_API_CALL")

            if resp.status_code != 200:
                app_logger.error(f"IGDB API error: {endpoint} returned {resp.status_code}")

            resp.raise_for_status()
            return resp.json()

        except httpx.HTTPStatusError as exc:
            # If auth failed (token expired/revoked), refresh token once and retry.
            if exc.response.status_code in (401, 403):
                self.token = None
                self.token_expires_at = None
                fresh_token = await self._get_access_token()
                retry_headers = {
                    "Client-ID": IGDB_CLIENT_ID,
                    "Authorization": f"Bearer {fresh_token}",
                }
                retry_resp = await self.client.post(url, headers=retry_headers, content=query)
                duration = time.perf_counter() - start_time
                app_logger.info(
                    f"IGDB API retry: {endpoint} - {retry_resp.status_code} in {duration:.2f}s",
                    action="IGDB_API_CALL",
                )
                retry_resp.raise_for_status()
                return retry_resp.json()

            duration = time.perf_counter() - start_time
            app_logger.error(f"IGDB API HTTP error: {endpoint} failed after {duration:.2f}s - {exc}")
            raise
        except httpx.TimeoutException:
            duration = time.perf_counter() - start_time
            app_logger.error(f"IGDB API timeout: {endpoint} after {duration:.2f}s")
            raise
        except Exception as e:
            duration = time.perf_counter() - start_time
            app_logger.error(f"IGDB API error: {endpoint} failed after {duration:.2f}s - {str(e)}")
            raise

    async def search_games(self, search_term: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search games by name and return extended fields for GameCoverCard.
        Filters only PC games (platforms.slug = "win").
        """
        igdb_query = f'''
            search "{search_term}";
            fields id, name, slug, first_release_date, cover.image_id, genres.name;
            where cover != null & platforms.slug = "win";
            limit {limit};
        '''
        raw_results = await self._post_query("games", igdb_query)
        
        # Use the same transformation as other endpoints for consistency
        return [transform_game_basic_info(game) for game in raw_results]


    async def get_game_detail(self, game_id: int) -> Optional[Dict[str, Any]]:
        """
        Get all detail fields for a game (GameDetail) including similar games.
        Filters only PC games (platforms.slug = "win").
        """
        igdb_query = f'''
            fields id,name,slug,summary,storyline,first_release_date,rating,aggregated_rating,
                   genres.name,platforms.name,
                   cover.image_id,screenshots.image_id,videos.video_id,videos.name,
                   similar_games,
                   involved_companies.company.id,
                   involved_companies.company.name,
                   involved_companies.company.slug,
                   involved_companies.company.logo.image_id,
                   involved_companies.developer,
                   involved_companies.publisher;
            where id = {game_id} & platforms.slug = "win";
            limit 1;
        '''
        raw_list = await self._post_query("games", igdb_query)
        if not raw_list:
            return None
        
        game_data = raw_list[0]
        
        # Resolve similar games using the existing function
        if game_data.get("similar_games"):
            similar_game_ids = game_data["similar_games"][:12]  # Limit auf 12
            
            # Create entries in the expected format for get_basic_game_info_from_entries
            raw_entries = [{"game_id": gid} for gid in similar_game_ids]
            
            # Use the existing function (without rating filter for similar games)
            similar_games_details = await self.get_basic_game_info_from_entries(
                raw_entries, 
                min_rating_count=0
            )
            
            game_data["similar_games_details"] = similar_games_details
        
        return game_data

    async def get_popularity_primitives(self, types: List[int], limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch raw data for all specified popularity_type IDs sorted by value desc.
        """
        types_list = ",".join(str(t) for t in types)
        igdb_query = f'''
            fields game_id, popularity_type, value, calculated_at;
            where popularity_type = ({types_list});
            sort value desc;
            limit {limit};
        '''
        return await self._post_query("popularity_primitives", igdb_query)

    def compute_weighted_scores(
        self,
        raw_entries: List[Dict[str, Any]],
        weight_map: Dict[int, float]
    ) -> List[Dict[str, Any]]:
        """
        Takes raw entries from popularity_primitives (list of dicts)
        and calculates a "weighted_score" for each game_id based on weight_map.
        Returns a list of dicts with:
        {
          "game_id": <int>,
          "weighted_score": <float>,
          "details": {popularity_type_id: value, ...}
        }
        """
        scores_temp: Dict[int, Dict[int, float]] = {}
        for entry in raw_entries:
            gid = entry["game_id"]
            ptype = entry["popularity_type"]
            val = entry.get("value", 0.0) or 0.0
            if gid not in scores_temp:
                scores_temp[gid] = {}
            scores_temp[gid][ptype] = val

        result_list: List[Dict[str, Any]] = []
        for gid, type_dict in scores_temp.items():
            weighted_score = 0.0
            for ptype, weight in weight_map.items():
                val = type_dict.get(ptype, 0.0)
                weighted_score += weight * val

            result_list.append({
                "game_id": gid,
                "weighted_score": weighted_score,
                "details": type_dict.copy()
            })

        return result_list




    async def get_games_by_genre(
        self,
        genre_id: int,
        min_rating_count: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Gets games of a certain genre (genre_id) for a certain platform (platform_slug),
        filters by minimum total_rating_count, sorts by rating DESC and returns maximum 'limit'.
        Returns only basic fields: id, name, slug, first_release_date, cover.image_id, rating, total_rating_count, genres.name
        """
        igdb_query = (
            "fields id,name,slug,first_release_date,cover.image_id,total_rating_count, genres.name;"
            f" where genres = ({genre_id})"
            f" & total_rating_count > {min_rating_count}"
            f" & platforms.slug = \"win\";"
            f" sort rating desc;"
            f" limit 500;"
        )

        try:
            raw_list = await self._post_query("games", igdb_query)
        except httpx.HTTPStatusError as exc:
            # Wir werfen die Exception hoch, der Router behandelt sie
            raise exc

        # flattening via Helper
        return [transform_game_basic_info(raw) for raw in raw_list]

    
    
    async def get_basic_game_info_from_entries(
        self,
        raw_entries: list[dict],
        min_rating_count: int = 0
    ) -> list[dict]:
        if not raw_entries:
            return []

        game_ids = [e["game_id"] for e in raw_entries]
        limit = len(game_ids)

        # build WHERE clause (with optional rating filter)…
        base_where = f"id = ({','.join(map(str, game_ids))}) & platforms.slug = \"win\""
        if min_rating_count > 0:
            where = f"where {base_where} & total_rating_count >= {min_rating_count};"
        else:
            where = f"where {base_where};"

        # request both the IDs _and_ the nested genre objects in one go
        query = (
            "fields "
            "id, name, slug, cover.image_id, first_release_date, "
            "total_rating_count, "
            "genres.name; "
            f"{where} "
            f"limit {limit};"
        )

        games = await self._post_query("games", query) or []
        lookup = {g["id"]: g for g in games}

        # reassemble in the same order, flattening genres
        result = []
        for gid in game_ids:
            raw = lookup.get(gid)
            if not raw:
                # Fallback-Stub
                result.append(transform_game_basic_info({ "id": gid }))
            else:
                result.append(transform_game_basic_info(raw))
        return result




    
igdb_client = IgdbClient()
