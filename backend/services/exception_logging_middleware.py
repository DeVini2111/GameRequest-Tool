from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.requests import Request
from services.logging_service import app_logger
import traceback

class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:  # noqa: BLE001
            # Log full stack trace
            tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            app_logger.error(f"Unhandled exception during request {request.url.path}: {exc}\n{tb_str}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )
