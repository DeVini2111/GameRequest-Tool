from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.setup_service import SetupService
from services.auth_service import AuthService
from models.user_models import UserRead
from models.database import UserRole

router = APIRouter()

class AdminSetup(BaseModel):
    username: str
    password: str

@router.get("/needs-setup")
async def check_setup():
    """Check if setup is needed"""
    needs_setup = await SetupService.needs_setup()
    return {"needs_setup": needs_setup}

@router.post("/create-admin")
async def create_admin(setup: AdminSetup):
    """Create initial admin and return login token"""
    
    try:
        # Check if setup is needed
        if not await SetupService.needs_setup():
            raise HTTPException(400, "Setup already completed")
        
        print(f"Creating admin user: {setup.username}")
        
        # Create admin user using AuthService
        admin_user = await AuthService.create_user(
            username=setup.username,
            password=setup.password,
            role=UserRole.ADMIN
        )
        
        print(f"Admin user created: {admin_user.id}, {admin_user.username}")
        
        # Generate token
        token = AuthService.create_access_token(data={"sub": str(admin_user.id)})
        
        print(f"Token generated successfully")
        
        return {
            "success": True,
            "user": UserRead.model_validate(admin_user),
            "access_token": token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Setup failed with error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Setup failed: {str(e)}")

@router.post("/reset")
async def reset_setup():
    """Reset setup by deleting admin users"""
    deleted_count = await SetupService.reset_setup()
    return {
        "message": f"Setup reset - deleted {deleted_count} admin users",
        "can_setup": True
    }

@router.get("/admin-users")
async def get_admin_users():
    """See current admin users"""
    admins = await SetupService.get_admin_users()
    return {
        "admin_count": len(admins),
        "admins": [
            {
                "id": admin.id,
                "username": admin.username,
                "created_at": admin.created_at
            } for admin in admins
        ]
    }