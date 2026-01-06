from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.database import RequestStatus
from models.user_models import UserSummary

class GameRequestBase(BaseModel):
    game_name: str
    igdb_id: Optional[int] = None
    igdb_cover_url: Optional[str] = None
    igdb_genres: Optional[str] = None
    comment: Optional[str] = None

class GameRequestCreate(GameRequestBase):
    pass

class GameRequestUpdate(BaseModel):
    status: Optional[RequestStatus] = None
    admin_notes: Optional[str] = None

class GameRequest(GameRequestBase):
    id: int
    requester_id: int
    status: RequestStatus
    created_at: datetime
    updated_at: datetime
    admin_notes: Optional[str] = None

    class Config:
        from_attributes = True

# Response Model with User Info for Frontend
class GameRequestWithUser(GameRequest):
    user: Optional[UserSummary] = None