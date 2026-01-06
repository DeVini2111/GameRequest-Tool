from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from models.database import AsyncSessionLocal, UserDB, UserRole
from services.auth_service import AuthService
from typing import Optional

# Security scheme
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserDB:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify token
    token = credentials.credentials
    payload = AuthService.verify_token(token)
    
    if payload is None:
        raise credentials_exception
    
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    try:
        user_id = int(user_id)
    except ValueError:
        raise credentials_exception
    
    # Get user from database
    user = await AuthService.get_user_by_id(user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user

async def get_current_admin(current_user: UserDB = Depends(get_current_user)) -> UserDB:
    """Get current authenticated admin user"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security_optional)) -> Optional[UserDB]:
    """Get current user if authenticated, otherwise None"""
    if not credentials:
        return None
        
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
