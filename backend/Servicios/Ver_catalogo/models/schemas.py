from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class MovieCarouselItem(BaseModel):
    movie_id: str
    title: str
    slug: str
    synopsis_short: Optional[str]
    poster_url: Optional[str]
    classification_code: Optional[str]
    duration_minutes: Optional[int]
    is_free: bool
    view_count: Optional[int] = None
    upload_date: Optional[datetime] = None
    last_viewed: Optional[datetime] = None
    watch_count: Optional[int] = None

class FeaturedMovie(BaseModel):
    movie_id: str
    title: str
    slug: str
    synopsis_short: Optional[str]
    synopsis_long: Optional[str]
    banner_url: Optional[str]
    poster_url: Optional[str]
    classification_code: Optional[str]
    duration_minutes: Optional[int]
    is_free: bool

class Category(BaseModel):
    category_id: str
    name: str
    slug: str
    parent_id: Optional[str]

class CarouselResponse(BaseModel):
    items: List[MovieCarouselItem]
    total: int