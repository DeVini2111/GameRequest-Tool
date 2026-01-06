from pydantic import BaseModel
from typing import Optional, List

# === Einzelkomponenten ===

class Cover(BaseModel):
    image_id: Optional[str]

class Screenshot(BaseModel):
    image_id: str

class Video(BaseModel):
    video_id: str

class CompanyLogo(BaseModel):
    image_id: Optional[str]

class Company(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    logo: Optional[CompanyLogo] = None

class InvolvedCompany(BaseModel):
    company: Company

class Genre(BaseModel):
    name: str

class Platform(BaseModel):
    name: str

# === Gemeinsame Spiel-Basisdaten ===

class GameBase(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    first_release_date: Optional[int] = None
    cover: Optional[Cover] = None
    genres: Optional[List[int]] = []
    genre_names: Optional[List[str]] = []

# === For /search ===

class GameResult(GameBase):
    pass

# === For /popular_basic ===

class GameBasicInfo(GameBase):
    weighted_score: float

# === For /detail/{id} ===

class GameDetail(GameBase):
    summary: Optional[str] = None
    rating: Optional[float] = None
    aggregated_rating: Optional[float] = None
    genres: List[Genre] = []
    platforms: List[Platform] = []
    screenshots: List[Screenshot] = []
    videos: List[Video] = []
    involved_companies: List[InvolvedCompany] = []
