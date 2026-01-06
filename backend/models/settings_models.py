from pydantic import BaseModel
from typing import Optional

class SystemSettings(BaseModel):
    # General Settings
    maxRequestsPerUser: int = -1  # -1 = unlimited (only applies to regular users, not admins)
    
    # Request Management
    requireAdminApproval: bool = True
    allowUserRequestDeletion: bool = False
    
    # Telegram Notifications
    telegramEnabled: bool = False
    telegramBotToken: str = ""
    telegramChatId: str = ""
    notifyOnNewRequest: bool = True
    notifyOnStatusChange: bool = True
    notifyOnUserRegistration: bool = False
    notifyOnSystemErrors: bool = False
    
    # Logging
    enableApplicationLogs: bool = True
    enableErrorLogs: bool = True
    enableAuditLogs: bool = True
    logRetentionDays: int = 30
    logLevel: str = "INFO"

class TelegramTestRequest(BaseModel):
    bot_token: str
    chat_id: str
