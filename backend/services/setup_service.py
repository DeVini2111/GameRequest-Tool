from sqlalchemy import select, delete
from models.database import AsyncSessionLocal, UserDB, UserRole

class SetupService:
    
    @staticmethod
    async def needs_setup() -> bool:
        """Check if initial admin setup is needed"""
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    select(UserDB).where(UserDB.role == UserRole.ADMIN.value)
                )
                admin_exists = result.first()
                return admin_exists is None
            except Exception as e:
                print(f"Error checking setup status: {e}")
                # On error, allow setup
                return True
    
    @staticmethod
    async def reset_setup():
        """Delete all admin users to allow new setup"""
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    delete(UserDB).where(UserDB.role == UserRole.ADMIN.value)
                )
                await session.commit()
                return result.rowcount
            except Exception as e:
                print(f"Error resetting setup: {e}")
                await session.rollback()
                return 0
    
    @staticmethod
    async def get_admin_users():
        """Get all admin users"""
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(
                    select(UserDB).where(UserDB.role == UserRole.ADMIN.value)
                )
                return result.scalars().all()
            except Exception as e:
                print(f"Error getting admin users: {e}")
                return []