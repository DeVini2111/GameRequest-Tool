from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select, func
from typing import List
from pydantic import BaseModel

from models.database import AsyncSessionLocal, UserDB, UserRole, GameRequestDB
from models.user_models import UserRead, UserCreate, UserUpdate
from services.auth_deps import get_current_admin
from services.auth_service import AuthService
from services.logging_service import app_logger

router = APIRouter()

class PasswordResetRequest(BaseModel):
    new_password: str

@router.post("/users", response_model=UserRead)
async def create_user_admin(
    user_data: UserCreate,
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Create new user"""
    
    try:
        # Create user using AuthService
        new_user = await AuthService.create_user(
            username=user_data.username,
            password=user_data.password,
            role=user_data.role
        )
        
        app_logger.audit(
            "USER_CREATED_BY_ADMIN",
            admin_user.id,
            f"Created user '{user_data.username}' with role {user_data.role.value}"
        )
        
        return UserRead.model_validate(new_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating user: {str(e)}")

@router.get("/users", response_model=List[UserRead])
async def get_all_users(
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Get all users"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(UserDB))
        users = result.scalars().all()
        return [UserRead.model_validate(user) for user in users]

@router.get("/users/{user_id}", response_model=UserRead)
async def get_user_by_id(
    user_id: int,
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Get specific user by ID"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(UserDB).where(UserDB.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserRead.model_validate(user)

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    new_role: UserRole,
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Update user role"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(UserDB).where(UserDB.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.role = new_role
        user.is_superuser = new_role == UserRole.ADMIN
        await session.commit()
        return {"message": f"User role updated to {new_role}"}

@router.put("/users/{user_id}/active")
async def toggle_user_active(
    user_id: int,
    is_active: bool,
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Activate/Deactivate user"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(UserDB).where(UserDB.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.is_active = is_active
        await session.commit()
        return {"message": f"User {'activated' if is_active else 'deactivated'}"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    force: bool = Query(False),
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Delete user"""
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(UserDB).where(UserDB.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user has any game requests
        requests_result = await session.execute(
            select(GameRequestDB).where(GameRequestDB.requester_id == user_id)
        )
        user_requests = requests_result.scalars().all()
        
        if user_requests and not force:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete user '{user.username}'. User has {len(user_requests)} game request(s). Please delete or reassign the requests first."
            )
        
        # If force=True, delete all user's requests first
        if user_requests and force:
            for request in user_requests:
                await session.delete(request)
        
        await session.delete(user)
        await session.commit()
        
        message = "User deleted"
        if user_requests and force:
            message += f" (along with {len(user_requests)} game request(s))"
        
        return {"message": message}

@router.get("/users/request-counts")
async def get_user_request_counts(
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Get request counts for all users"""
    async with AsyncSessionLocal() as session:
        # Get all users with their request counts
        result = await session.execute(
            select(UserDB.id, UserDB.username, func.count(GameRequestDB.id).label('request_count'))
            .outerjoin(GameRequestDB, UserDB.id == GameRequestDB.requester_id)
            .group_by(UserDB.id, UserDB.username)
        )
        
        user_counts = {}
        for row in result:
            user_counts[row.id] = row.request_count
            
        return user_counts

@router.put("/users/{user_id}/password")
async def reset_user_password(
    user_id: int,
    password_data: PasswordResetRequest,
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Reset user password"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(UserDB).where(UserDB.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate password requirements
        try:
            AuthService.validate_password(password_data.new_password)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Update password using AuthService
        user.hashed_password = AuthService.get_password_hash(password_data.new_password)
        await session.commit()
        
        return {"message": "Password updated successfully"}
