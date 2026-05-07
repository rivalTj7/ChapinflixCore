from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

# Request models
class UserListFilters(BaseModel):
    query: Optional[str] = None
    created_from: Optional[datetime] = None
    created_to: Optional[datetime] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    is_paid: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_content_handler: Optional[bool] = None
    two_fa_enabled: Optional[bool] = None
    locked_only: Optional[bool] = None
    failed_login_min: Optional[int] = None
    order_by: str = "created_at"
    order_dir: str = "DESC"
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)

class SetActive(BaseModel):
    is_active: bool

class SetVerified(BaseModel):
    is_verified: bool

class SetPaid(BaseModel):
    is_paid: bool

class SetAdmin(BaseModel):
    is_admin: bool

class SetContentHandler(BaseModel):
    is_content_handler: bool

# Response models
class UserListItem(BaseModel):
    id: int
    email: str
    username: str
    first_name: str
    last_name: str
    is_active: bool
    is_verified: bool
    is_paid: bool
    is_admin: bool
    is_content_handler: bool
    two_fa_enabled: bool
    failed_login_attempts: int
    locked_until: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class UserListResponse(BaseModel):
    total_count: int
    items: List[UserListItem]

class UserCounters(BaseModel):
    count_total: int
    count_active: int
    count_verified: int
    count_paid: int
    count_admin: int
    count_content_handler: int
    count_twofa_enabled: int
    count_locked: int
    count_failed_ge_n: int

class UserDetail(BaseModel):
    id: int
    email: str
    username: str
    first_name: str
    last_name: str
    is_active: bool
    is_verified: bool
    is_paid: bool
    is_admin: bool
    is_content_handler: bool
    two_fa_enabled: bool
    failed_login_attempts: int
    locked_until: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    email_tokens_total: int
    email_tokens_active: int
    refresh_tokens_total: int
    refresh_tokens_active: int