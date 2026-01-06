from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

# Database
from models.database import create_tables

# API Routes
from api.requests_routes import router as requests_router
from api.igdb_routes import router as igdb_router
from api.setup_route import router as setup_router
from api.admin_routes import router as admin_router
from api.auth_routes import router as auth_router
from api.settings_routes import router as settings_router
from api.logs_routes import router as logs_router
from api.import_routes import router as import_router
from api.debug_routes import router as debug_router

from services.redis_client       import get_redis, close_redis, clear_cache
from services.igdb_client       import igdb_client
from services.popularity_service import refresh_all_popularities
from services.logging_service   import app_logger
from services.request_logging_middleware import RequestLoggingMiddleware
from services.exception_logging_middleware import ExceptionLoggingMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---

    print("🚀 Creating database tables...")
    await create_tables()
    print("✅ Database ready")

    # Initialize logging
    app_logger.info("GameRequest application starting up", action="SYSTEM_STARTUP")

    # Delete old cache
    await clear_cache()

    # Cleanup old logs on startup
    await app_logger.cleanup_old_logs()

    # Initialize Redis connection
    app.state.redis = await get_redis()
    igdb_client.redis = app.state.redis

    # Get Twitch token and fill popularities cache
    await igdb_client._get_access_token()
    await refresh_all_popularities()

    yield  # hier laufen deine Endpoints

    # --- Shutdown ---
    app_logger.info("GameRequest application shutting down", action="SYSTEM_SHUTDOWN")
    await close_redis()

app = FastAPI(title="Game Request Tool Backend", lifespan=lifespan)

# Configure CORS
# Get allowed origins from environment or use default "*" for development
cors_origins = os.getenv("CORS_ORIGINS", "*")
if cors_origins == "*":
    allow_origins = ["*"]
else:
    # Parse comma-separated origins
    allow_origins = [origin.strip() for origin in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)
# Add exception logging middleware to capture unhandled errors
app.add_middleware(ExceptionLoggingMiddleware)

# 🔧 SETUP ROUTES (public for initial setup)
app.include_router(setup_router, prefix="/setup", tags=["setup"])

# 🔒 AUTH ROUTES (JWT-basierte Authentifizierung)
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# 🔒 ADMIN ROUTES (admin only)
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(settings_router, prefix="/api/admin", tags=["settings"])
app.include_router(logs_router)
app.include_router(import_router, prefix="/api/import", tags=["import"])

# 🔒 PROTECTED ROUTES
app.include_router(requests_router, prefix="/api/requests", tags=["Requests"])
app.include_router(igdb_router, prefix="/igdb", tags=["IGDB"])

# 🐛 DEBUG ROUTES
app.include_router(debug_router, prefix="/api/debug", tags=["debug"])

# 🌐 SERVE FRONTEND (static files from build)
# In Docker, frontend is built and copied to /app/frontend_dist
# In development, frontend is served separately by npm dev
frontend_dist = Path("/app/frontend_dist")
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

@app.get("/")
async def root():
    from services.setup_service import SetupService
    needs_setup = await SetupService.needs_setup()
    
    if needs_setup:
        return {"message": "Setup required", "setup_url": "/setup"}
    return {"message": "Game Request API Ready"}


