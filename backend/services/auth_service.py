from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select
from models.database import AsyncSessionLocal, UserDB, UserRole
from services.telegram_service import telegram_service
from services.logging_service import app_logger

# Password context
# Use bcrypt_sha256 to remove the 72-byte password limit but keep compatibility with existing hashes
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    deprecated="auto"
)

# JWT settings
SECRET_KEY = "game-request-secret-key-change-in-production-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

class AuthService:
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def validate_password(password: str) -> None:
        """Validate password requirements"""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        if not any(c.isupper() for c in password):
            raise ValueError("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            raise ValueError("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            raise ValueError("Password must contain at least one number")
    
    @staticmethod
    def create_access_token(data: dict) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    async def authenticate_user(username: str, password: str) -> Optional[UserDB]:
        """Authenticate user by username/password"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(UserDB).where(UserDB.username == username)
            )
            user = result.scalar_one_or_none()
            
            if not user or not user.is_active:
                app_logger.warning(f"Failed login attempt for username: {username} (user not found or inactive)")
                return None
                
            if not AuthService.verify_password(password, user.hashed_password):
                app_logger.warning(f"Failed login attempt for username: {username} (invalid password)", user_id=user.id)
                return None
            
            # Update last login timestamp
            user.last_login = datetime.utcnow()
            await session.commit()
            await session.refresh(user)

            app_logger.info(f"Successful login for user: {username}", user_id=user.id, action="USER_LOGIN")
            return user
    
    @staticmethod
    async def get_user_by_id(user_id: int) -> Optional[UserDB]:
        """Get user by ID"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(UserDB).where(UserDB.id == user_id)
            )
            return result.scalar_one_or_none()
    
    @staticmethod
    async def create_user(username: str, password: str, role: UserRole = UserRole.USER) -> UserDB:
        """Create new user"""
        # Validate password requirements
        AuthService.validate_password(password)
        
        async with AsyncSessionLocal() as session:
            # Check if user exists
            result = await session.execute(
                select(UserDB).where(UserDB.username == username)
            )
            if result.first():
                raise ValueError("Username already exists")
            
            # Create user
            user = UserDB(
                username=username,
                hashed_password=AuthService.get_password_hash(password),
                role=role,
                is_active=True,
                is_superuser=role == UserRole.ADMIN,
                is_verified=True
            )
            
            session.add(user)
            await session.commit()
            await session.refresh(user)
            
            # Log user creation
            app_logger.audit(
                "USER_CREATED",
                user.id,
                f"New user '{username}' created with role {role.value}"
            )
            
            # Send Telegram notification for new user registration
            # Only for regular users, not admin users created by setup
            if role == UserRole.USER:
                try:
                    await telegram_service.notify_user_registration(username)
                except Exception as e:
                    # Don't fail user creation if notification fails
                    app_logger.error(f"Failed to send Telegram notification for user registration: {str(e)}", user_id=user.id)
            
            return user
    
    @staticmethod
    async def update_user_profile(user_id: int, new_username: str) -> UserDB:
        """Update user profile (username)"""
        async with AsyncSessionLocal() as session:
            # Get current user
            result = await session.execute(
                select(UserDB).where(UserDB.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                raise ValueError("User not found")
            
            # Check if new username already exists (if different from current)
            if new_username != user.username:
                username_check = await session.execute(
                    select(UserDB).where(UserDB.username == new_username)
                )
                if username_check.scalar_one_or_none():
                    raise ValueError("Username already exists")
                
                user.username = new_username
            
            await session.commit()
            await session.refresh(user)
            return user
    
    @staticmethod
    async def change_password(user_id: int, current_password: str, new_password: str) -> bool:
        """Change user password"""
        # Validate new password
        AuthService.validate_password(new_password)
        
        async with AsyncSessionLocal() as session:
            # Get current user
            result = await session.execute(
                select(UserDB).where(UserDB.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                raise ValueError("User not found")
            
            # Verify current password
            if not AuthService.verify_password(current_password, user.hashed_password):
                raise ValueError("Current password is incorrect")
            
            # Update password
            user.hashed_password = AuthService.get_password_hash(new_password)
            await session.commit()
            return True
