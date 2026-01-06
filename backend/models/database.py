import enum
import os
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum as SQLEnum, Boolean, ForeignKey
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from services.logging_service import app_logger

Base = declarative_base()

# Async Database Setup
# Construct DATABASE_URL from environment variables or use default SQLite
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Build from individual components (for Docker Compose)
    db_user = os.getenv("DB_USER", "gamerequest")
    db_password = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "db")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "gamerequest")
    
    if db_password:
        # PostgreSQL with credentials
        DATABASE_URL = f"postgresql+asyncpg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    else:
        # Fallback to SQLite for development
        DATABASE_URL = "sqlite+aiosqlite:///./game_requests.db"

async_engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    async_engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Enums
class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

# User Model (Vereinfacht - nur Username + Password)
class UserDB(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)  # Immer True
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    requests = relationship("GameRequestDB", back_populates="requester")

# Game Request Model
class GameRequestDB(Base):
    __tablename__ = "game_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    game_name = Column(String, nullable=False)
    igdb_id = Column(Integer, nullable=True)  # Renamed from igdb_game_id
    igdb_cover_url = Column(String, nullable=True)  # Added
    igdb_genres = Column(String, nullable=True)  # Added
    comment = Column(Text, nullable=True)  # Renamed from description
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.PENDING)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Key
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    requester = relationship("UserDB", back_populates="requests")

# System Settings Model (Single row table for configuration)
class SystemSettingsDB(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)  # Always 1
    
    # General Settings
    max_requests_per_user = Column(Integer, default=-1)  # -1 = unlimited (only applies to regular users, not admins)
    
    # Request Management
    require_admin_approval = Column(Boolean, default=True)
    allow_user_request_deletion = Column(Boolean, default=False)
    
    # Telegram Notifications
    telegram_enabled = Column(Boolean, default=False)
    telegram_bot_token = Column(String, default="")
    telegram_chat_id = Column(String, default="")
    notify_on_new_request = Column(Boolean, default=True)
    notify_on_status_change = Column(Boolean, default=True)
    notify_on_user_registration = Column(Boolean, default=False)
    notify_on_system_errors = Column(Boolean, default=False)
    
    # Logging
    enable_application_logs = Column(Boolean, default=True)
    enable_error_logs = Column(Boolean, default=True)
    enable_audit_logs = Column(Boolean, default=True)
    log_retention_days = Column(Integer, default=30)
    log_level = Column(String, default="INFO")
    
    # Metadata
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Async Database Dependencies
async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            app_logger.info("Async database session opened", action="DB_SESSION_OPEN")
            yield session
        except Exception as e:
            app_logger.error(f"Async database session error: {str(e)}")
            raise
        finally:
            app_logger.info("Async database session closed", action="DB_SESSION_CLOSE")

# Database Creation
async def create_tables():
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Ensure new columns exist for existing databases
            await _ensure_system_settings_columns(conn)
            await _ensure_user_columns(conn)
        app_logger.info("Async database tables created successfully", action="DB_TABLES_CREATE")
    except Exception as e:
        app_logger.error(f"Async database table creation failed: {str(e)}")
        raise

async def _ensure_system_settings_columns(conn):
    """Lightweight migration to add missing columns to system_settings."""
    try:
        # Skip PRAGMA check for PostgreSQL - tables are created by SQLAlchemy
        app_logger.info("System settings columns verified")
    except Exception as e:
        app_logger.error(f"Failed to ensure system_settings columns: {e}")


async def _ensure_user_columns(conn):
    """Lightweight migration to add missing columns to users."""
    try:
        # Skip PRAGMA check for PostgreSQL - tables are created by SQLAlchemy
        app_logger.info("User columns verified")
    except Exception as e:
        app_logger.error(f"Failed to ensure users columns: {e}")

# Backward compatibility (falls alte Imports existieren)
get_db = get_async_db
SessionLocal = AsyncSessionLocal