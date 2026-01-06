from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import asyncio
import re
from datetime import datetime

from models.database import get_async_db, GameRequestDB, RequestStatus
from models.user_models import UserRead
from services.auth_deps import get_current_user
from services.igdb_client import igdb_client
from services.logging_service import app_logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter()

class ImportRequest(BaseModel):
    games: List[str]  # List of game names, one name per line

class ImportResult(BaseModel):
    total_games: int
    successful_imports: int
    failed_imports: int
    imported_games: List[Dict[str, Any]]
    failed_games: List[Dict[str, str]]

def clean_game_name(name: str) -> str:
    """
    Cleans game names of common suffixes that could interfere with the search.
    """
    # Remove common suffixes
    name = re.sub(r'\s*\(.*?\)\s*', '', name)  # Remove brackets
    name = re.sub(r'\s*:.*$', '', name)  # Remove everything after ":"
    name = re.sub(r'\s*-.*$', '', name)  # Remove everything after "-"
    name = re.sub(r'\s+', ' ', name)  # Multiple spaces to one
    return name.strip()

async def find_best_match_for_game(game_name: str) -> Optional[Dict[str, Any]]:
    """
    Finds the best match for a game name.
    Tries first the original name, then cleaned name.
    """
    try:
        # First search with original name
        results = await igdb_client.search_games(search_term=game_name, limit=5)
        
        if results:
            # Take the first result as the best match
            return results[0]
        
        # Wenn keine Ergebnisse, probiere bereinigten Namen
        cleaned_name = clean_game_name(game_name)
        if cleaned_name != game_name and len(cleaned_name) >= 2:
            app_logger.info(f"Trying cleaned name '{cleaned_name}' for '{game_name}'", action="IMPORT_RETRY")
            results = await igdb_client.search_games(search_term=cleaned_name, limit=5)
            
            if results:
                return results[0]
        
        return None
        
    except Exception as e:
        app_logger.error(f"Error searching for game '{game_name}': {str(e)}", action="IMPORT_SEARCH_ERROR")
        return None

async def create_completed_request(
    game_data: Dict[str, Any], 
    original_name: str,
    user: UserRead,
    db: AsyncSession
) -> GameRequestDB:
    """
    Creates a completed request for an imported game.
    """
    # Create cover URL if available
    cover_url = None
    if game_data.get("cover") and game_data["cover"].get("image_id"):
        cover_url = f"https://images.igdb.com/igdb/image/upload/t_cover_big/{game_data['cover']['image_id']}.jpg"
    
    # Summarize genres
    genres = ", ".join(game_data.get("genre_names", [])) if game_data.get("genre_names") else None
    
    # Create request
    request = GameRequestDB(
        game_name=game_data["name"],
        igdb_id=game_data["id"],
        igdb_cover_url=cover_url,
        igdb_genres=genres,
        comment=f"Imported from library. Original name: '{original_name}'" if original_name != game_data["name"] else "Imported from library",
        status=RequestStatus.COMPLETED,
        admin_notes="Automatically imported from library",
        requester_id=user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(request)
    return request

@router.post("/text", response_model=ImportResult)
async def import_games_from_text(
    import_data: ImportRequest,
    current_user: UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Imports games from a text list and creates completed requests.
    Optimized for batch processing with automatic duplicate detection.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can import games")
    
    app_logger.info(f"Starting text import for {len(import_data.games)} games", 
                   action="IMPORT_START", user_id=current_user.id)
    
    # Clean and validate input
    game_names = [name.strip() for name in import_data.games if name.strip()]
    
    if not game_names:
        raise HTTPException(status_code=400, detail="No valid game names provided")
    
    if len(game_names) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 games per import")
    
    # Check for already existing games
    existing_games = await db.execute(
        select(GameRequestDB.game_name).where(
            GameRequestDB.game_name.in_(game_names)
        )
    )
    existing_names = {name for (name,) in existing_games.fetchall()}
    
    # Filter out already existing games
    new_game_names = [name for name in game_names if name not in existing_names]
    
    app_logger.info(f"Filtered {len(existing_names)} existing games, processing {len(new_game_names)} new games", 
                   action="IMPORT_FILTER")
    
    successful_imports = []
    failed_imports = []
    
    # Batch-Verarbeitung mit Concurrency-Limit
    semaphore = asyncio.Semaphore(5)  # Maximum 5 concurrent API calls
    
    async def process_game(game_name: str):
        async with semaphore:
            try:
                # Find the best match
                game_data = await find_best_match_for_game(game_name)
                
                if not game_data:
                    failed_imports.append({
                        "name": game_name,
                        "reason": "No matching game found in IGDB"
                    })
                    return
                
                # Check if this IGDB game already exists
                existing_request = await db.execute(
                    select(GameRequestDB).where(GameRequestDB.igdb_id == game_data["id"])
                )
                if existing_request.fetchone():
                    failed_imports.append({
                        "name": game_name,
                        "reason": f"Game '{game_data['name']}' already exists in system"
                    })
                    return
                
                # Create completed request
                request = await create_completed_request(game_data, game_name, current_user, db)
                
                successful_imports.append({
                    "original_name": game_name,
                    "igdb_name": game_data["name"],
                    "igdb_id": game_data["id"],
                    "cover_url": request.igdb_cover_url,
                    "genres": request.igdb_genres
                })
                
                app_logger.info(f"Successfully imported '{game_name}' as '{game_data['name']}'", 
                               action="IMPORT_SUCCESS")
                
            except Exception as e:
                failed_imports.append({
                    "name": game_name,
                    "reason": f"Error during import: {str(e)}"
                })
                app_logger.error(f"Failed to import '{game_name}': {str(e)}", action="IMPORT_ERROR")
    
    # Execute all imports in parallel
    await asyncio.gather(*[process_game(name) for name in new_game_names])
    
    # Save all changes
    try:
        await db.commit()
        app_logger.info(f"Import completed: {len(successful_imports)} successful, {len(failed_imports)} failed", 
                       action="IMPORT_COMPLETE", user_id=current_user.id)
    except Exception as e:
        await db.rollback()
        app_logger.error(f"Failed to commit import: {str(e)}", action="IMPORT_COMMIT_ERROR")
        raise HTTPException(status_code=500, detail="Failed to save imported games")
    
    # Add already existing games to Failed
    for existing_name in existing_names:
        failed_imports.append({
            "name": existing_name,
            "reason": "Game already exists in system"
        })
    
    return ImportResult(
        total_games=len(game_names),
        successful_imports=len(successful_imports),
        failed_imports=len(failed_imports),
        imported_games=successful_imports,
        failed_games=failed_imports
    )

@router.get("/suggestions")
async def get_game_suggestions(
    q: str,
    limit: int = 10,
    current_user: UserRead = Depends(get_current_user)
):
    """
    Provides game suggestions for autocomplete based on IGDB search.
    Can be used for import and general search.
    """
    try:
        if len(q.strip()) < 2:
            return []
        
        app_logger.info(f"Game suggestions requested for query: '{q}'", 
                       action="SUGGESTIONS_REQUEST", user_id=current_user.id)
        
        # Suche in IGDB
        results = await igdb_client.search_games(search_term=q.strip(), limit=limit)
        
        suggestions = []
        for game in results:
            # Cover URL erstellen falls vorhanden
            cover_url = None
            if game.get("cover") and game["cover"].get("image_id"):
                cover_url = f"https://images.igdb.com/igdb/image/upload/t_cover_small/{game['cover']['image_id']}.jpg"
            
            # Release year extrahieren
            release_year = None
            if game.get("first_release_date"):
                from datetime import datetime
                release_year = datetime.fromtimestamp(game["first_release_date"]).year
            
            suggestions.append({
                "id": game["id"],
                "name": game["name"],
                "cover_url": cover_url,
                "release_year": release_year,
                "genres": game.get("genre_names", [])[:3],  # Max 3 genres for UI
                "platforms": game.get("platform_names", [])[:3] if game.get("platform_names") else []
            })
        
        app_logger.info(f"Returned {len(suggestions)} suggestions for query: '{q}'", 
                       action="SUGGESTIONS_SUCCESS")
        
        return suggestions
        
    except Exception as e:
        app_logger.error(f"Error getting game suggestions for query '{q}': {str(e)}", 
                        action="SUGGESTIONS_ERROR")
        return []

@router.get("/status")
async def get_import_status(
    current_user: UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Returns statistics about imported games.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can view import status")
    
    # Count imported games (completed requests with "Imported" in admin_notes)
    result = await db.execute(
        select(GameRequestDB).where(
            GameRequestDB.status == RequestStatus.COMPLETED,
            GameRequestDB.admin_notes.like("%imported%")
        )
    )
    imported_requests = result.fetchall()
    
    return {
        "total_imported_games": len(imported_requests),
        "last_import": max([req[0].updated_at for req in imported_requests]) if imported_requests else None
    }
