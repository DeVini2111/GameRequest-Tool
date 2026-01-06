from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models.database import UserRole

class UserRead(BaseModel):
    """User Read Schema"""
    id: int
    username: str
    role: UserRole
    is_active: bool
    is_superuser: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    """User Create Schema"""
    username: str
    password: str
    role: Optional[UserRole] = UserRole.USER
    
class UserUpdate(BaseModel):
    """User Update Schema"""
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class ProfileUpdateRequest(BaseModel):
    """Profile Update Request Schema"""
    username: str

class PasswordChangeRequest(BaseModel):
    """Password Change Request Schema"""
    current_password: str
    new_password: str
    
class LoginRequest(BaseModel):
    """Login Request Schema"""
    username: str
    password: str
    
class LoginResponse(BaseModel):
    """Login Response Schema"""
    access_token: str
    token_type: str = "bearer"
    user: UserRead
    
class Token(BaseModel):
    """Token Schema"""
    access_token: str
    token_type: str

# Separate User Summary for Request Responses
class UserSummary(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True