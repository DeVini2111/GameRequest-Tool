from fastapi import APIRouter, HTTPException, Depends
from models.settings_models import SystemSettings, TelegramTestRequest
from services.auth_deps import get_current_admin
from services.settings_service import SettingsService
from services.telegram_service import telegram_service
from services.logging_service import app_logger
from models.database import UserDB

router = APIRouter()

@router.get("/settings", response_model=SystemSettings)
async def get_settings(
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Get system settings"""
    try:
        settings = await SettingsService.get_settings()
        app_logger.info("Settings retrieved", user_id=admin_user.id, action="SETTINGS_READ")
        return settings
    except Exception as e:
        app_logger.error(f"Error loading settings: {e}", user_id=admin_user.id, action="SETTINGS_READ")
        raise HTTPException(status_code=500, detail=f"Error loading settings: {str(e)}")

@router.put("/settings", response_model=SystemSettings)
async def update_settings(
    settings: SystemSettings,
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Update system settings"""
    try:
        # Validate settings
        if settings.maxRequestsPerUser < -1:
            raise HTTPException(status_code=400, detail="Max requests per user must be -1 or greater")
        
        if settings.logRetentionDays < 1 or settings.logRetentionDays > 365:
            raise HTTPException(status_code=400, detail="Log retention days must be between 1 and 365")
        
        updated_settings = await SettingsService.update_settings(settings)
        
        # Log settings changes
        app_logger.audit(
            "SETTINGS_UPDATED", 
            admin_user.id, 
            f"Updated system settings: max_requests={settings.maxRequestsPerUser}, "
            f"admin_approval={settings.requireAdminApproval}, "
            f"log_retention={settings.logRetentionDays}d"
        )
        
        return updated_settings
        
    except ValueError as e:
        app_logger.error(f"Validation error updating settings: {e}", user_id=admin_user.id, action="SETTINGS_UPDATED")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        app_logger.error(f"Error updating settings: {e}", user_id=admin_user.id, action="SETTINGS_UPDATED")
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")

@router.post("/telegram/test")
async def test_telegram_connection(
    test_request: TelegramTestRequest,
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Test Telegram bot connection"""
    try:
        if not test_request.bot_token or not test_request.chat_id:
            raise HTTPException(status_code=400, detail="Bot token and chat ID are required")
        
        success = await telegram_service.send_test_message(
            test_request.bot_token, 
            test_request.chat_id
        )
        
        if success:
            app_logger.info(f"Telegram connection test successful", user_id=admin_user.id, action="TELEGRAM_TEST")
            return {"message": "Telegram connection successful", "success": True}
        else:
            app_logger.warning(f"Telegram connection test failed", user_id=admin_user.id)
            raise HTTPException(status_code=400, detail="Telegram connection failed. Check your bot token and chat ID.")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing Telegram connection: {str(e)}")

@router.get("/logs/recent")
async def get_recent_logs(
    admin_user: UserDB = Depends(get_current_admin),
    limit: int = 50
):
    """Admin: Get recent log entries (placeholder)"""
    # This is a placeholder - in a real implementation you would read from log files
    sample_logs = [
        {
            "timestamp": "2024-08-25 15:30:22",
            "level": "INFO",
            "message": "System started",
            "source": "main"
        },
        {
            "timestamp": "2024-08-25 15:25:15", 
            "level": "INFO",
            "message": "New request #123 received",
            "source": "requests"
        },
        {
            "timestamp": "2024-08-25 15:20:08",
            "level": "WARNING", 
            "message": "High memory usage detected",
            "source": "system"
        },
        {
            "timestamp": "2024-08-25 15:15:33",
            "level": "INFO",
            "message": "Backup completed successfully", 
            "source": "backup"
        },
        {
            "timestamp": "2024-08-25 15:10:12",
            "level": "INFO",
            "message": f"User '{admin_user.username}' logged in",
            "source": "auth"
        }
    ]
    
    return {"logs": sample_logs[:limit]}

@router.delete("/logs/clear")
async def clear_logs(
    admin_user: UserDB = Depends(get_current_admin)
):
    """Admin: Clear log files (placeholder)"""
    # This is a placeholder - in a real implementation you would clear actual log files
    return {"message": "Logs cleared successfully"}
