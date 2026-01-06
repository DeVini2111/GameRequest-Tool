from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from models.database import GameRequestDB, RequestStatus, UserDB, AsyncSessionLocal
from models.request import GameRequestCreate, GameRequestUpdate, GameRequestWithUser
from services.settings_service import SettingsService
from services.telegram_service import telegram_service
from services.logging_service import app_logger

class RequestService:
    
    @staticmethod
    async def create_request(request: GameRequestCreate, user_id: int) -> GameRequestDB:
        # Check if user can create request based on settings
        can_create = await SettingsService.can_user_create_request(user_id)
        if not can_create:
            settings = await SettingsService.get_settings()
            app_logger.warning(
                f"Request creation blocked: User {user_id} exceeded limit of {settings.maxRequestsPerUser}",
                user_id=user_id,
                action="REQUEST_BLOCKED"
            )
            raise ValueError(f"Maximum number of requests reached. Limit: {settings.maxRequestsPerUser}")
        
        async with AsyncSessionLocal() as session:
            # Get user and settings to check approval logic
            user_query = select(UserDB).where(UserDB.id == user_id)
            user_result = await session.execute(user_query)
            user = user_result.scalar_one_or_none()
            
            settings = await SettingsService.get_settings()
            
            # Determine initial status based on settings and user role
            initial_status = RequestStatus.PENDING
            
            # Admins always get auto-approved
            if user and user.role == 'admin':
                initial_status = RequestStatus.APPROVED
            # Regular users get approved if admin approval is not required
            elif not settings.requireAdminApproval:
                initial_status = RequestStatus.APPROVED
            
            db_request = GameRequestDB(
                **request.dict(),
                requester_id=user_id,
                status=initial_status
            )
            session.add(db_request)
            await session.commit()
            await session.refresh(db_request)
            
            # Log request creation
            app_logger.info(
                f"New game request created: '{request.game_name}' (ID: {db_request.id})",
                user_id=user_id,
                action="REQUEST_CREATED"
            )
            
            # Send Telegram notification for new request
            try:
                # Create GameRequest object for notification
                from models.request import GameRequest
                request_for_notification = GameRequest(
                    id=db_request.id,
                    game_name=db_request.game_name,
                    igdb_id=db_request.igdb_id,
                    igdb_cover_url=db_request.igdb_cover_url,
                    igdb_genres=db_request.igdb_genres,
                    comment=db_request.comment,
                    status=db_request.status,
                    admin_notes=db_request.admin_notes,
                    created_at=db_request.created_at,
                    updated_at=db_request.updated_at,
                    requester_id=db_request.requester_id
                )
                
                await telegram_service.notify_new_request(
                    request_for_notification,
                    user.username if user else 'Unbekannt'
                )
            except Exception as e:
                # Don't fail request creation if notification fails
                app_logger.error(f"Failed to send Telegram notification for new request: {str(e)}", user_id=user_id)
                print(f"Failed to send Telegram notification: {e}")
            
            return db_request
    
    @staticmethod
    async def get_request(request_id: int) -> Optional[GameRequestDB]:
        """Get single request by ID"""
        async with AsyncSessionLocal() as session:
            query = select(GameRequestDB).options(selectinload(GameRequestDB.requester)).where(GameRequestDB.id == request_id)
            result = await session.execute(query)
            return result.scalar_one_or_none()
    
    @staticmethod
    async def get_requests(
        status: Optional[RequestStatus] = None,
        user_id: Optional[int] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[GameRequestDB]:
        async with AsyncSessionLocal() as session:
            query = select(GameRequestDB).options(selectinload(GameRequestDB.requester))
            
            if status:
                query = query.where(GameRequestDB.status == status)
            
            if user_id:
                query = query.where(GameRequestDB.requester_id == user_id)
                
            query = query.order_by(desc(GameRequestDB.created_at)).offset(skip).limit(limit)
            result = await session.execute(query)
            return result.scalars().all()
    
    @staticmethod
    def to_response_model(db_request: GameRequestDB) -> GameRequestWithUser:
        """Convert DB model to response model with user info"""
        from models.user_models import UserSummary
        
        # Create user summary if requester exists
        user_summary = None
        if db_request.requester:
            user_summary = UserSummary(
                id=db_request.requester.id,
                username=db_request.requester.username,
                full_name=db_request.requester.username  # Use username as full_name fallback
            )
        
        return GameRequestWithUser(
            id=db_request.id,
            game_name=db_request.game_name,
            igdb_id=db_request.igdb_id,
            igdb_cover_url=db_request.igdb_cover_url,
            igdb_genres=db_request.igdb_genres,
            comment=db_request.comment,
            status=db_request.status,
            created_at=db_request.created_at,
            updated_at=db_request.updated_at,
            admin_notes=db_request.admin_notes,
            requester_id=db_request.requester_id,
            user=user_summary
        )
    
    @staticmethod
    async def update_request(
        request_id: int, 
        request_update: GameRequestUpdate
    ) -> Optional[GameRequestDB]:
        async with AsyncSessionLocal() as session:
            # Get request
            query = select(GameRequestDB).where(GameRequestDB.id == request_id)
            result = await session.execute(query)
            db_request = result.scalar_one_or_none()
            
            if not db_request:
                return None
                
            # Update fields
            update_data = request_update.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_request, field, value)
            
            await session.commit()
            await session.refresh(db_request)
            return db_request
    
    @staticmethod
    async def delete_request(request_id: int) -> bool:
        async with AsyncSessionLocal() as session:
            query = select(GameRequestDB).where(GameRequestDB.id == request_id)
            result = await session.execute(query)
            db_request = result.scalar_one_or_none()
            
            if not db_request:
                return False
                
            await session.delete(db_request)
            await session.commit()
            return True
    
    @staticmethod
    async def user_can_modify_request(request: GameRequestDB, user: UserDB) -> bool:
        """Check if user can modify a request respecting settings"""
        if user.role == "admin":
            return True

        # Only requester may delete, and only if setting allows
        if request.requester_id != user.id:
            return False

        settings = await SettingsService.get_settings()
        return settings.allowUserRequestDeletion
    
    @staticmethod
    async def get_requests_count_by_status(session, user_id: Optional[int] = None) -> dict:
        """Get count of requests grouped by status - ASYNC VERSION"""
        counts = {}
        for status in RequestStatus:
            query = select(func.count(GameRequestDB.id)).where(GameRequestDB.status == status)
            if user_id:
                query = query.where(GameRequestDB.requester_id == user_id)
            
            result = await session.execute(query)
            count = result.scalar()
            counts[status.value] = count
        return counts
    
    @staticmethod
    async def mark_request_as_available(request_id: int, admin_id: int) -> Optional[GameRequestDB]:
        """Admin marks request as available (installed)"""
        async with AsyncSessionLocal() as session:
            # Get request with requester info
            query = select(GameRequestDB).options(selectinload(GameRequestDB.requester)).where(GameRequestDB.id == request_id)
            result = await session.execute(query)
            request = result.scalar_one_or_none()
            
            if not request:
                return None
                
            request.status = RequestStatus.COMPLETED
            request.admin_notes = f"Game was installed and is available (Admin ID: {admin_id})"
            await session.commit()
            await session.refresh(request)
            return request
    
    @staticmethod
    async def is_game_available(igdb_id: int) -> bool:
        """Check if game is already available (COMPLETED request exists)"""
        async with AsyncSessionLocal() as session:
            query = select(GameRequestDB).where(
                GameRequestDB.igdb_id == igdb_id,
                GameRequestDB.status == RequestStatus.COMPLETED
            )
            result = await session.execute(query)
            return result.first() is not None
    
    @staticmethod
    async def get_game_request_status(igdb_id: int, user_id: Optional[int] = None) -> dict:
        """Comprehensive status check for a game"""
        async with AsyncSessionLocal() as session:
            # Check if game is available (completed request exists)
            available_query = select(GameRequestDB).where(
                GameRequestDB.igdb_id == igdb_id,
                GameRequestDB.status == RequestStatus.COMPLETED
            )
            available_result = await session.execute(available_query)
            is_available = available_result.first() is not None
            
            # Check if user has pending/approved request for this game
            user_request = None
            if user_id:
                user_query = select(GameRequestDB).where(
                    GameRequestDB.igdb_id == igdb_id,
                    GameRequestDB.requester_id == user_id,
                    GameRequestDB.status.in_([RequestStatus.PENDING, RequestStatus.APPROVED])
                )
                user_result = await session.execute(user_query)
                user_request = user_result.scalar_one_or_none()
            
            # Check if ANY user has pending/approved request
            any_pending_query = select(GameRequestDB).where(
                GameRequestDB.igdb_id == igdb_id,
                GameRequestDB.status.in_([RequestStatus.PENDING, RequestStatus.APPROVED])
            )
            any_pending_result = await session.execute(any_pending_query)
            has_pending_request = any_pending_result.first() is not None
            
            return {
                "is_available": is_available,
                "user_has_request": user_request is not None,
                "user_request_status": user_request.status if user_request else None,
                "has_pending_request": has_pending_request,
                "can_request": not is_available and not has_pending_request
            }
    
    @staticmethod
    async def update_request_status(
        request_id: int, 
        new_status: RequestStatus,
        admin_user: UserDB = None
    ) -> Optional[GameRequestDB]:
        """Update only the status of a request"""
        async with AsyncSessionLocal() as session:
            # Get request with requester info
            query = select(GameRequestDB).options(selectinload(GameRequestDB.requester)).where(GameRequestDB.id == request_id)
            result = await session.execute(query)
            db_request = result.scalar_one_or_none()
            
            if not db_request:
                return None
            
            old_status = db_request.status
            
            # Update status
            db_request.status = new_status
            await session.commit()
            await session.refresh(db_request)
            
            # Log status change
            app_logger.audit(
                "REQUEST_STATUS_UPDATED",
                admin_user.id if admin_user else db_request.requester_id,
                f"Request '{db_request.game_name}' (ID: {request_id}) status changed from {old_status.value} to {new_status.value}"
            )
            
            # Send Telegram notification for status changes
            if old_status != new_status:
                try:
                    # Create GameRequest object for notification
                    from models.request import GameRequest
                    request_for_notification = GameRequest(
                        id=db_request.id,
                        game_name=db_request.game_name,
                        igdb_id=db_request.igdb_id,
                        igdb_cover_url=db_request.igdb_cover_url,
                        igdb_genres=db_request.igdb_genres,
                        comment=db_request.comment,
                        status=db_request.status,
                        admin_notes=db_request.admin_notes,
                        created_at=db_request.created_at,
                        updated_at=db_request.updated_at,
                        requester_id=db_request.requester_id
                    )
                    
                    await telegram_service.notify_status_change(
                        request_for_notification,
                        old_status,
                        db_request.requester.username if db_request.requester else 'Unbekannt',
                        admin_user.username if admin_user else None
                    )
                except Exception as e:
                    # Don't fail status update if notification fails
                    app_logger.error(f"Failed to send Telegram notification for status change: {str(e)}")
            
            return db_request