from typing import Optional, List
from pydantic import BaseModel

class MovieCreate(BaseModel):
    title: str
    slug: str
    synopsis_short: Optional[str] = None
    synopsis_long: Optional[str] = None
    duration_minutes: Optional[int] = None
    release_date: Optional[str] = None
    classification_code: Optional[str] = None
    studio_name: Optional[str] = None
    language: Optional[str] = None
    country: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    trailer_url: Optional[str] = None
    is_free: Optional[bool] = False
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    created_by: Optional[str] = None
    category_slugs: Optional[List[str]] = None

class MoviePatch(BaseModel):
    title: Optional[str] = None
    synopsis_short: Optional[str] = None
    synopsis_long: Optional[str] = None
    duration_minutes: Optional[int] = None
    release_date: Optional[str] = None
    classification_code: Optional[str] = None
    studio_name: Optional[str] = None
    language: Optional[str] = None
    country: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    trailer_url: Optional[str] = None
    is_free: Optional[bool] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    is_active: Optional[bool] = None

class ToggleActive(BaseModel):
    is_active: bool

class ToggleFree(BaseModel):
    is_free: bool

class Availability(BaseModel):
    available_from: Optional[str] = None
    available_until: Optional[str] = None

class CategoryReplace(BaseModel):
    category_slugs: List[str]

class ImageCreate(BaseModel):
    url: str
    label: Optional[str] = None
    sort_order: Optional[int] = None

class ReorderImages(BaseModel):
    image_ids: List[str]

class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: Optional[bool] = None

class BulkItem(BaseModel):
    title: Optional[str] = None
    slug: str
    synopsis_short: Optional[str] = None
    synopsis_long: Optional[str] = None
    duration_minutes: Optional[int] = None
    release_date: Optional[str] = None
    classification_code: Optional[str] = None
    studio_name: Optional[str] = None
    language: Optional[str] = None
    country: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    trailer_url: Optional[str] = None
    is_free: Optional[bool] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    categories: Optional[List[str]] = None

class BulkPayload(BaseModel):
    items: List[BulkItem]
    created_by: Optional[str] = None
