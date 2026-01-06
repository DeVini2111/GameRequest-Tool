"""
Telegram Notification Service

Handles sending notifications to Telegram channels with game information and cover images.
"""
import asyncio
import logging
from typing import Optional, Dict, Any
import aiohttp
from services.settings_service import SettingsService
from models.request import GameRequest, RequestStatus

logger = logging.getLogger(__name__)

class TelegramService:
    def __init__(self):
        self.settings_service = SettingsService()
    
    async def _get_telegram_config(self) -> tuple[str, str, bool]:
        """Get Telegram configuration from settings"""
        settings = await self.settings_service.get_settings()
        return (
            settings.telegramBotToken,
            settings.telegramChatId,
            settings.telegramEnabled
        )
    
    async def _send_message(self, text: str, photo_url: Optional[str] = None) -> bool:
        """Send message to Telegram channel"""
        try:
            bot_token, chat_id, enabled = await self._get_telegram_config()
            
            if not enabled or not bot_token or not chat_id:
                logger.info("Telegram notifications disabled or not configured")
                return False
            
            url = f"https://api.telegram.org/bot{bot_token}/"
            
            async with aiohttp.ClientSession() as session:
                if photo_url:
                    # Send photo with caption
                    endpoint = url + "sendPhoto"
                    data = {
                        'chat_id': chat_id,
                        'photo': photo_url,
                        'caption': text,
                        'parse_mode': 'HTML'
                    }
                else:
                    # Send text message
                    endpoint = url + "sendMessage"
                    data = {
                        'chat_id': chat_id,
                        'text': text,
                        'parse_mode': 'HTML'
                    }
                
                async with session.post(endpoint, data=data) as response:
                    if response.status == 200:
                        logger.info("Telegram message sent successfully")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to send Telegram message: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False
    
    async def send_test_message(self, bot_token: str, chat_id: str) -> bool:
        """Send a test message to verify Telegram configuration"""
        try:
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = {
                'chat_id': chat_id,
                'text': '🎮 <b>GameRequest Test</b>\n\nTelegram notifications are successfully configured!',
                'parse_mode': 'HTML'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=data) as response:
                    if response.status == 200:
                        logger.info("Telegram test message sent successfully")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to send Telegram test message: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending Telegram test message: {e}")
            return False
    
    async def notify_new_request(self, request: GameRequest, requester_username: str) -> bool:
        """Send notification for new game request"""
        settings = await self.settings_service.get_settings()
        if not settings.notifyOnNewRequest:
            return False
        
        # Build message
        status_emoji = "📝"
        message = f"{status_emoji} <b>New Game Request</b>\n\n"
        message += f"🎮 <b>Game:</b> {request.game_name}\n"
        message += f"👤 <b>Requested by:</b> {requester_username}\n"
        message += f"🆔 <b>Request ID:</b> #{request.id}\n"
        
        if request.comment:
            message += f"💬 <b>Comment:</b> {request.comment}\n"
        
        if request.igdb_genres:
            message += f"🎯 <b>Genres:</b> {request.igdb_genres}\n"
        
        message += f"📅 <b>Created:</b> {request.created_at.strftime('%d.%m.%Y %H:%M')}\n"
        message += f"⚡ <b>Status:</b> {self._get_status_text(request.status)}"
        
        return await self._send_message(message, request.igdb_cover_url)
    
    async def notify_status_change(self, request: GameRequest, old_status: RequestStatus, 
                                 requester_username: str, admin_username: Optional[str] = None) -> bool:
        """Send notification for request status change"""
        settings = await self.settings_service.get_settings()
        if not settings.notifyOnStatusChange:
            return False
        
        # Build message
        status_emoji = self._get_status_emoji(request.status)
        message = f"{status_emoji} <b>Status Change</b>\n\n"
        message += f"🎮 <b>Game:</b> {request.game_name}\n"
        message += f"👤 <b>Requested by:</b> {requester_username}\n"
        message += f"🆔 <b>Request ID:</b> #{request.id}\n"
        message += f"📊 <b>Status:</b> {self._get_status_text(old_status)} → {self._get_status_text(request.status)}\n"
        
        if admin_username:
            message += f"👨‍💼 <b>Processed by:</b> {admin_username}\n"
        
        if request.admin_notes:
            message += f"📝 <b>Admin Notes:</b> {request.admin_notes}\n"
        
        message += f"📅 <b>Updated:</b> {request.updated_at.strftime('%d.%m.%Y %H:%M')}"
        
        return await self._send_message(message, request.igdb_cover_url)
    
    async def notify_user_registration(self, username: str) -> bool:
        """Send notification for new user registration"""
        settings = await self.settings_service.get_settings()
        if not settings.notifyOnUserRegistration:
            return False
        
        from datetime import datetime
        now = datetime.now()
        
        message = f"👤 <b>New User Registration</b>\n\n"
        message += f"🆔 <b>Username:</b> {username}\n"
        message += f"📅 <b>Registered:</b> {now.strftime('%d.%m.%Y %H:%M')}"
        
        return await self._send_message(message)
    
    def _get_status_emoji(self, status: RequestStatus) -> str:
        """Get emoji for request status"""
        emoji_map = {
            RequestStatus.PENDING: "⏳",
            RequestStatus.APPROVED: "✅", 
            RequestStatus.REJECTED: "❌",
            RequestStatus.COMPLETED: "🎉"
        }
        return emoji_map.get(status, "📋")
    
    def _get_status_text(self, status: RequestStatus) -> str:
        """Get text for request status"""
        status_map = {
            RequestStatus.PENDING: "Pending",
            RequestStatus.APPROVED: "Approved",
            RequestStatus.REJECTED: "Rejected", 
            RequestStatus.COMPLETED: "Completed"
        }
        return status_map.get(status, str(status))


# Global instance
telegram_service = TelegramService()
