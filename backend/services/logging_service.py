"""
Application Logging Service

Handles centralized logging for the GameRequest application with file rotation and management.
"""
import logging
import os
from datetime import datetime, timedelta
from typing import List, Optional
import glob
from pathlib import Path
from logging.handlers import RotatingFileHandler

# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

class AppLogger:
    def __init__(self):
        self.logger = logging.getLogger("GameRequest")
        self.logger.setLevel(logging.INFO)
        self.enable_application_logs = True
        self.enable_error_logs = True
        self.enable_audit_logs = True
        
        # Prevent duplicate handlers
        if not self.logger.handlers:
            self._setup_handlers()
    
    def _setup_handlers(self):
        """Setup file handlers for different log types"""
        
        # Single log file for all messages
        log_handler = RotatingFileHandler(
            LOGS_DIR / "application.log",
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        log_handler.setLevel(logging.INFO)
        log_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        log_handler.setFormatter(log_formatter)
        self.logger.addHandler(log_handler)
        
        # Console handler for development
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)

    def apply_settings(self, settings):
        """Apply logging enable flags and level."""
        self.enable_application_logs = getattr(settings, "enableApplicationLogs", True)
        self.enable_error_logs = getattr(settings, "enableErrorLogs", True)
        self.enable_audit_logs = getattr(settings, "enableAuditLogs", True)
        # Keep log level fixed at INFO to simplify configuration
        fixed_level = logging.INFO
        self.logger.setLevel(fixed_level)
        for handler in self.logger.handlers:
            handler.setLevel(fixed_level)
    
    def info(self, message: str, user_id: Optional[int] = None, action: Optional[str] = None):
        """Log application activity"""
        if not self.enable_application_logs:
            return
        log_message = message
        if user_id:
            log_message = f"[User {user_id}] {message}"
        if action:
            log_message = f"[{action}] {log_message}"
        self.logger.info(log_message)
    
    def error(self, message: str, exc_info=True, user_id: Optional[int] = None, action: Optional[str] = None):
        """Log errors"""
        if not self.enable_error_logs:
            return
        log_message = message
        if user_id:
            log_message = f"[User {user_id}] {message}"
        if action:
            log_message = f"[{action}] {log_message}"
        self.logger.error(log_message, exc_info=exc_info)
    
    def warning(self, message: str, user_id: Optional[int] = None, action: Optional[str] = None):
        """Log warnings"""
        if not self.enable_application_logs:
            return
        log_message = message
        if user_id:
            log_message = f"[User {user_id}] {message}"
        if action:
            log_message = f"[{action}] {log_message}"
        self.logger.warning(log_message)
    
    def audit(self, action: str, user_id: int, details: str = "", **kwargs):
        """Log audit trail for important actions"""
        if not self.enable_audit_logs:
            return
        message = f"AUDIT: {action} by user {user_id}"
        if details:
            message += f" - {details}"
        # Add any additional details from kwargs
        if kwargs:
            import json
            message += f" - Additional data: {json.dumps(kwargs)}"
        self.logger.info(f"[AUDIT] {message}")
    
    async def cleanup_old_logs(self):
        """Remove old log files based on retention settings"""
        try:
            # Dynamic import to avoid circular dependency
            from services.settings_service import SettingsService
            settings = await SettingsService.get_settings()
            retention_days = settings.logRetentionDays
            
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            
            # Find all log files
            log_files = glob.glob(str(LOGS_DIR / "*.log*"))
            
            for log_file in log_files:
                file_path = Path(log_file)
                if file_path.stat().st_mtime < cutoff_date.timestamp():
                    try:
                        os.remove(log_file)
                        self.info(f"Deleted old log file: {file_path.name}")
                    except Exception as e:
                        self.error(f"Failed to delete log file {file_path.name}: {str(e)}")
                        
        except Exception as e:
            self.error(f"Log cleanup failed: {str(e)}")
    
    def get_recent_logs(self, lines: int = 100) -> List[dict]:
        """Get recent log entries from log file"""
        logs = []
        
        try:
            # Read from application.log only
            app_log_path = LOGS_DIR / "application.log"
            if app_log_path.exists():
                logs.extend(self._read_log_file(app_log_path, "APPLICATION", lines))
            
            # Sort by timestamp (newest first)
            logs.sort(key=lambda x: x['timestamp'], reverse=True)
            # Normalize datetimes to ISO strings for JSON responses
            normalized = []
            for entry in logs[:lines]:
                entry = dict(entry)
                ts = entry.get('timestamp')
                if isinstance(ts, datetime):
                    entry['timestamp'] = ts.isoformat()
                normalized.append(entry)
            return normalized
            
        except Exception as e:
            self.error(f"Failed to read recent logs: {str(e)}")
            return []
    
    def _read_log_file(self, file_path: Path, log_type: str, max_lines: int) -> List[dict]:
        """Read and parse log file entries"""
        logs = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            # Get last max_lines
            recent_lines = lines[-max_lines:] if len(lines) > max_lines else lines
            
            for line in recent_lines:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    # Parse log line format: timestamp - level - message
                    parts = line.split(' - ', 2)
                    if len(parts) >= 3:
                        timestamp_str = parts[0]
                        level = parts[1]
                        message = parts[2]
                        
                        # Parse timestamp
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
                        
                        logs.append({
                            'timestamp': timestamp,
                            'level': level,
                            'message': message,
                            'type': log_type,
                            'formatted_time': timestamp.strftime('%d.%m.%Y %H:%M:%S')
                        })
                except Exception:
                    # If parsing fails, add as raw entry
                    logs.append({
                        'timestamp': datetime.now(),
                        'level': 'INFO',
                        'message': line,
                        'type': log_type,
                        'formatted_time': datetime.now().strftime('%d.%m.%Y %H:%M:%S')
                    })
                    
        except Exception as e:
            self.error(f"Failed to read log file {file_path}: {str(e)}")
            
        return logs
    
    def get_log_file_path(self) -> Optional[Path]:
        """Get path to log file for download"""
        return LOGS_DIR / "application.log"

# Global logger instance
app_logger = AppLogger()
