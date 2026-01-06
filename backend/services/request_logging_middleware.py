"""
HTTP Request Logging Middleware

Logs all incoming HTTP requests with details for monitoring and debugging.
"""
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from services.logging_service import app_logger
import json

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        
        # Endpoints to exclude from logging (to avoid spam)
        self.exclude_paths = {
            "/health",
            "/api/logs/recent",  # Don't log the logs endpoint itself
            "/docs",
            "/openapi.json",
            "/favicon.ico"
        }
    
    async def dispatch(self, request: Request, call_next):
        # Skip logging for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)
        
        start_time = time.time()
        
        # Extract request info
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        method = request.method
        url = str(request.url)
        
        # Get user info from token if available
        user_info = "anonymous"
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                from services.auth_service import AuthService
                token = auth_header.split(" ")[1]
                payload = AuthService.verify_token(token)
                if payload and payload.get("sub"):
                    user_info = f"user_{payload.get('sub')}"
            except:
                pass
        
        # Log request start
        app_logger.info(
            f"HTTP {method} {url} - {user_info} from {client_ip}",
            action="HTTP_REQUEST"
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate response time
            process_time = time.time() - start_time
            
            # Log successful response
            app_logger.info(
                f"HTTP {method} {url} - {response.status_code} in {process_time:.3f}s - {user_info}",
                action="HTTP_RESPONSE"
            )
            
            # Log slow requests (>2 seconds)
            if process_time > 2.0:
                app_logger.warning(
                    f"SLOW REQUEST: {method} {url} took {process_time:.3f}s - {user_info}"
                )
            
            return response
            
        except Exception as e:
            # Log failed requests
            process_time = time.time() - start_time
            app_logger.error(
                f"HTTP {method} {url} - ERROR after {process_time:.3f}s: {str(e)} - {user_info}",
                action="HTTP_ERROR"
            )
            raise
