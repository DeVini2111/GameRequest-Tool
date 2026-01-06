from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from models.database import AsyncSessionLocal, SystemSettingsDB
from models.settings_models import SystemSettings
from services.logging_service import app_logger
import httpx
import asyncio

class SettingsService:
    
    @staticmethod
    async def get_settings() -> SystemSettings:
        """Get system settings, create default if not exists"""
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    select(SystemSettingsDB).where(SystemSettingsDB.id == 1)
                )
                settings_db = result.scalar_one()
                
                # Convert DB model to Pydantic model
                settings = SystemSettings(
                    maxRequestsPerUser=settings_db.max_requests_per_user,
                    requireAdminApproval=settings_db.require_admin_approval,
                    allowUserRequestDeletion=settings_db.allow_user_request_deletion,
                    telegramEnabled=settings_db.telegram_enabled,
                    telegramBotToken=settings_db.telegram_bot_token,
                    telegramChatId=settings_db.telegram_chat_id,
                    notifyOnNewRequest=settings_db.notify_on_new_request,
                    notifyOnStatusChange=settings_db.notify_on_status_change,
                    notifyOnUserRegistration=settings_db.notify_on_user_registration,
                    notifyOnSystemErrors=settings_db.notify_on_system_errors,
                    enableApplicationLogs=settings_db.enable_application_logs,
                    enableErrorLogs=settings_db.enable_error_logs,
                    enableAuditLogs=settings_db.enable_audit_logs,
                    logRetentionDays=settings_db.log_retention_days,
                    logLevel=settings_db.log_level
                )
                app_logger.apply_settings(settings)
                return settings
                
            except NoResultFound:
                # Create default settings if not exists
                default_settings = SystemSettingsDB(id=1)
                session.add(default_settings)
                await session.commit()
                await session.refresh(default_settings)
                
                settings = SystemSettings()
                app_logger.apply_settings(settings)
                return settings  # Return default values
    
    @staticmethod
    async def update_settings(settings: SystemSettings) -> SystemSettings:
        """Update system settings"""
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    select(SystemSettingsDB).where(SystemSettingsDB.id == 1)
                )
                settings_db = result.scalar_one()
                
            except NoResultFound:
                # Create if not exists
                settings_db = SystemSettingsDB(id=1)
                session.add(settings_db)
            
            # Update all fields
            settings_db.max_requests_per_user = settings.maxRequestsPerUser
            settings_db.require_admin_approval = settings.requireAdminApproval
            settings_db.allow_user_request_deletion = settings.allowUserRequestDeletion
            settings_db.telegram_enabled = settings.telegramEnabled
            settings_db.telegram_bot_token = settings.telegramBotToken
            settings_db.telegram_chat_id = settings.telegramChatId
            settings_db.notify_on_new_request = settings.notifyOnNewRequest
            settings_db.notify_on_status_change = settings.notifyOnStatusChange
            settings_db.notify_on_user_registration = settings.notifyOnUserRegistration
            settings_db.notify_on_system_errors = settings.notifyOnSystemErrors
            settings_db.enable_application_logs = settings.enableApplicationLogs
            settings_db.enable_error_logs = settings.enableErrorLogs
            settings_db.enable_audit_logs = settings.enableAuditLogs
            settings_db.log_retention_days = settings.logRetentionDays
            settings_db.log_level = settings.logLevel
            
            await session.commit()
            await session.refresh(settings_db)

            # Apply logging settings immediately
            app_logger.apply_settings(settings)
            
            return settings
    
    @staticmethod
    async def can_user_create_request(user_id: int) -> bool:
        """Check if user can create a new request based on settings (admins are unlimited)"""
        # Check if user is admin first
        from models.database import UserDB, UserRole
        async with AsyncSessionLocal() as session:
            user_result = await session.execute(
                select(UserDB).where(UserDB.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            # Admins have unlimited requests
            if user and user.role == UserRole.ADMIN:
                return True
        
        settings = await SettingsService.get_settings()
        
        if settings.maxRequestsPerUser == -1:  # Unlimited for regular users
            return True
        
        # Count active requests for regular user
        from models.database import GameRequestDB, RequestStatus
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(GameRequestDB).where(
                    GameRequestDB.requester_id == user_id,
                    GameRequestDB.status.in_([RequestStatus.PENDING, RequestStatus.APPROVED])
                )
            )
            active_requests = result.scalars().all()
            
            return len(active_requests) < settings.maxRequestsPerUser
    
    @staticmethod
    async def test_telegram_connection(bot_token: str, chat_id: str) -> bool:
        """Test Telegram bot connection by sending a test message"""
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": "🤖 GameRequest System - Telegram connection test successful!\n\nThis message confirms that the Telegram integration is correctly configured.",
                "parse_mode": "HTML"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("ok", False)
                else:
                    app_logger.error(f"Telegram API error: {response.status_code} - {response.text}")
                    return False
                    
        except httpx.TimeoutException:
            app_logger.error("Telegram API timeout")
            return False
        except Exception as e:
            app_logger.error(f"Telegram test error: {str(e)}")
            return False
    
    @staticmethod
    async def send_telegram_notification(message: str, notification_type: str = "info") -> bool:
        """Send a notification via Telegram if enabled"""
        try:
            settings = await SettingsService.get_settings()
            
            if not settings.telegramEnabled or not settings.telegramBotToken or not settings.telegramChatId:
                return False
            
            # Check if this notification type is enabled
            type_enabled_map = {
                "new_request": settings.notifyOnNewRequest,
                "status_change": settings.notifyOnStatusChange,
                "user_registration": settings.notifyOnUserRegistration,
                "system_error": settings.notifyOnSystemErrors
            }
            
            if notification_type in type_enabled_map and not type_enabled_map[notification_type]:
                return False
            
            # Add emoji based on type
            emoji_map = {
                "new_request": "🎮",
                "status_change": "📝",
                "user_registration": "👤",
                "system_error": "🚨",
                "info": "ℹ️"
            }
            
            emoji = emoji_map.get(notification_type, "📢")
            formatted_message = f"{emoji} {message}"
            
            url = f"https://api.telegram.org/bot{settings.telegramBotToken}/sendMessage"
            payload = {
                "chat_id": settings.telegramChatId,
                "text": formatted_message,
                "parse_mode": "HTML"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                return response.status_code == 200
                
        except Exception as e:
            app_logger.error(f"Failed to send Telegram notification: {str(e)}")
            return False
