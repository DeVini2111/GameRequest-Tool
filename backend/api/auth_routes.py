from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from models.user_models import LoginRequest, LoginResponse, UserRead, Token, ProfileUpdateRequest, PasswordChangeRequest
from services.auth_service import AuthService
from services.auth_deps import get_current_user
from models.database import UserDB
from sqlalchemy import select, func
from models.database import AsyncSessionLocal, GameRequestDB

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint using OAuth2PasswordRequestForm"""
    user = await AuthService.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = AuthService.create_access_token(data={"sub": str(user.id)})
    
    # Convert user to UserRead
    user_read = UserRead.model_validate(user)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_read
    )

@router.post("/login-json", response_model=LoginResponse)
async def login_json(login_data: LoginRequest):
    """Login endpoint using JSON"""
    user = await AuthService.authenticate_user(login_data.username, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = AuthService.create_access_token(data={"sub": str(user.id)})
    
    # Convert user to UserRead
    user_read = UserRead.model_validate(user)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_read
    )

@router.get("/me", response_model=UserRead)
async def read_me(current_user: UserDB = Depends(get_current_user)):
    """Get current user"""
    return UserRead.model_validate(current_user)

@router.get("/account-info")
async def get_account_info(current_user: UserDB = Depends(get_current_user)):
    """Get detailed account information"""
    async with AsyncSessionLocal() as session:
        # Get request count
        request_count_result = await session.execute(
            select(func.count(GameRequestDB.id)).where(GameRequestDB.requester_id == current_user.id)
        )
        request_count = request_count_result.scalar()
        
        last_login_display = current_user.last_login.strftime("%B %d, %Y %H:%M") if current_user.last_login else "Never"

        return {
            "member_since": current_user.created_at.strftime("%B %d, %Y"),
            "last_login": last_login_display,
            "total_requests": request_count,
            "account_status": "Active" if current_user.is_active else "Inactive"
        }

@router.post("/logout")
async def logout():
    """Logout endpoint"""
    # With JWT tokens, logout is handled client-side by removing the token
    return {"message": "Successfully logged out"}

@router.put("/update-profile", response_model=UserRead)
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: UserDB = Depends(get_current_user)
):
    """Update user profile"""
    try:
        updated_user = await AuthService.update_user_profile(
            current_user.id,
            profile_data.username
        )
        return UserRead.model_validate(updated_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.put("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: UserDB = Depends(get_current_user)
):
    """Change user password"""
    try:
        await AuthService.change_password(
            current_user.id,
            password_data.current_password,
            password_data.new_password
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )