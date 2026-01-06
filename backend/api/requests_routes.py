from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from models.database import get_async_db, RequestStatus, UserDB
from models.request import GameRequest, GameRequestCreate, GameRequestUpdate, GameRequestWithUser
from services.request_service import RequestService
from services.auth_deps import get_current_user, get_current_admin, get_current_user_optional

router = APIRouter()

@router.post("/", response_model=GameRequest)
async def create_request(
    request: GameRequestCreate,
    current_user: UserDB = Depends(get_current_user)
):
    """Create a new game request"""
    db_request = await RequestService.create_request(request, current_user.id)
    return GameRequest.from_orm(db_request)

@router.get("/", response_model=List[GameRequestWithUser])
async def get_requests(
    status: Optional[RequestStatus] = Query(None),
    my_requests: bool = Query(False, description="Only show current user's requests"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: UserDB = Depends(get_current_user)
):
    """Get requests with optional filtering"""
    user_id = current_user.id if my_requests else None
    db_requests = await RequestService.get_requests(status=status, user_id=user_id, skip=skip, limit=limit)
    
    # Convert to response models
    return [RequestService.to_response_model(req) for req in db_requests]

@router.get("/{request_id}", response_model=GameRequest)
async def get_request(
    request_id: int,
    current_user: UserDB = Depends(get_current_user)
):
    """Get a specific request"""
    request = await RequestService.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Users can only see their own requests, admins can see all
    if not RequestService.user_can_modify_request(request, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return GameRequest.from_orm(request)

@router.put("/{request_id}", response_model=GameRequest)
async def update_request(
    request_id: int,
    request_update: GameRequestUpdate,
    current_user: UserDB = Depends(get_current_user)
):
    """Update a request"""
    request = await RequestService.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check permissions
    if not await RequestService.user_can_modify_request(request, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    updated_request = await RequestService.update_request(request_id, request_update)
    return GameRequest.from_orm(updated_request)

@router.patch("/{request_id}")
async def update_request_status(
    request_id: int,
    status_update: dict,
    current_admin: UserDB = Depends(get_current_admin)
):
    """Update only the status of a request (admin only)"""
    from models.database import RequestStatus
    
    request = await RequestService.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    new_status = status_update.get('status')
    if not new_status or new_status not in [status.value for status in RequestStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    updated_request = await RequestService.update_request_status(request_id, RequestStatus(new_status))
    return {"message": "Status updated successfully", "request": GameRequest.from_orm(updated_request)}

@router.delete("/{request_id}")
async def delete_request(
    request_id: int,
    current_user: UserDB = Depends(get_current_user)
):
    """Delete a request"""
    request = await RequestService.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check permissions
    if not RequestService.user_can_modify_request(request, current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await RequestService.delete_request(request_id)
    return {"message": "Request deleted successfully"}

@router.put("/{request_id}/mark-available")
async def mark_request_available(
    request_id: int,
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin marks request as installed/available"""
    updated_request = await RequestService.mark_request_as_available(request_id, admin_user.id)
    if not updated_request:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Game marked as available", "request": RequestService.to_response_model(updated_request)}

@router.get("/game/{igdb_id}/status")
async def get_game_status(
    igdb_id: int,
    current_user: UserDB = Depends(get_current_user_optional)
):
    """Get comprehensive status for a specific game"""
    user_id = current_user.id if current_user else None
    status = await RequestService.get_game_request_status(igdb_id, user_id)
    return status

@router.get("/game/{igdb_id}/available")
async def check_game_availability(igdb_id: int):
    """Check if game is available (has completed request)"""
    is_available = await RequestService.is_game_available(igdb_id)
    return {"igdb_id": igdb_id, "is_available": is_available}