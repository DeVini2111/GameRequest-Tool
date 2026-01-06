"""
Logging API Routes

Provides endpoints for log management and viewing.
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import datetime
import os
from pathlib import Path

from services.auth_deps import get_current_admin
from services.logging_service import app_logger
from models.database import UserDB

router = APIRouter(prefix="/api/logs", tags=["logs"])

@router.get("/recent")
async def get_recent_logs(
    lines: int = 100,
    current_user: UserDB = Depends(get_current_admin)
) -> List[dict]:
    """
    Get recent log entries
    Only accessible by admin users
    """
    try:
        logs = app_logger.get_recent_logs(lines)
        return logs
    except Exception as e:
        app_logger.error(f"Failed to fetch recent logs: {str(e)}", user_id=current_user.id)
        raise HTTPException(status_code=500, detail="Error loading logs")

@router.get("/download")
async def download_log_file(
    current_user: UserDB = Depends(get_current_admin)
):
    """
    Download complete log file
    Only accessible by admin users
    """
    try:
        log_file_path = app_logger.get_log_file_path()
        
        if not log_file_path or not log_file_path.exists():
            raise HTTPException(status_code=404, detail="Log file not found")
        
        app_logger.audit("LOG_DOWNLOADED", current_user.id, "Downloaded application log file")
        
        # Read a snapshot to avoid size changes during streaming (fixes Content-Length errors)
        content = log_file_path.read_bytes()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gamerequest_logs_{timestamp}.log"
        headers = {
            "Content-Disposition": f"attachment; filename={filename}"
        }
        return Response(content=content, media_type="text/plain", headers=headers)
        
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"Failed to download log file: {str(e)}", user_id=current_user.id, action="LOG_DOWNLOAD")
        raise HTTPException(status_code=500, detail="Error downloading log file")

@router.post("/cleanup")
async def cleanup_old_logs(
    current_user: UserDB = Depends(get_current_admin)
):
    """
    Manually trigger cleanup of old log files
    Only accessible by admin users
    """
    try:
        app_logger.audit("LOG_CLEANUP_TRIGGERED", current_user.id, "Manual log cleanup triggered")
        await app_logger.cleanup_old_logs()
        return {"message": "Old log files were successfully cleaned up"}
    except Exception as e:
        app_logger.error(f"Manual log cleanup failed: {str(e)}", user_id=current_user.id)
        raise HTTPException(status_code=500, detail="Error during log cleanup")
