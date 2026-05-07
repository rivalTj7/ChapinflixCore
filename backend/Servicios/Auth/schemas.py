from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)

class UserLogin(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None

class TokenRefresh(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    first_name: str
    last_name: str
    is_active: bool
    is_verified: bool
    two_fa_enabled: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class MessageResponse(BaseModel):
    message: str

class Enable2FAResponse(BaseModel):
    secret: str
    qr_code: str
    
class Verify2FA(BaseModel):
    totp_code: str