# ===================== models/schemas.py =====================
from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import datetime

class MovieDetail(BaseModel):
    movie_id: str
    title: str
    slug: str
    classification: Optional[str]
    categories: Optional[List[str]] = None
    images: Optional[List[Any]] = None
    is_free: bool
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    # Useful for the player integration later:
    video_blob_path: Optional[str] = None   # "<_id>.mp4" stored in Azure
    video_url: Optional[str] = None         # if your container is public (as set by catalog)

class CanViewResponse(BaseModel):
    allowed: bool
    denial_reason: Optional[str] = None

class PlayResult(BaseModel):
    allowed: bool
    denial_reason: Optional[str] = None
    title: Optional[str] = None
    slug: Optional[str] = None
    is_free: Optional[bool] = None
    video_blob_path: Optional[str] = None   # for future signed URL generation
    video_url: Optional[str] = None         # if public, you can stream directly
