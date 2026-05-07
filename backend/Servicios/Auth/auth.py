from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Request, Response
from fastapi.security import HTTPBearer
import secrets
import pyotp
import qrcode
import io
import base64
from config import get_settings
from models import User, RefreshToken
from crypto import aes_cipher
from security import get_token_from_request
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        # Get token from cookie
        token = get_token_from_request(request, expected_type="access")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authenticated"
            )
        return token

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, custom_claims: Optional[dict] = None) -> str:
    to_encode = data.copy()
    if custom_claims:
        to_encode.update(custom_claims)
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def create_refresh_token(data: dict, custom_claims: Optional[dict] = None) -> str:
    to_encode = data.copy()
    if custom_claims:
        to_encode.update(custom_claims)
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def verify_token(token: str, token_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def save_refresh_token(db: Session, user_id: int, token: str):
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    refresh_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(refresh_token)
    db.commit()

# auth.py
from datetime import datetime, timedelta, timezone

def is_token_in_grace_period(token: str) -> bool:
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm],
            options={"verify_exp": False}
        )
        # Make both timestamps UTC-aware to avoid naive/aware comparisons
        exp = datetime.fromtimestamp(payload['exp'], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        grace_period_end = exp + timedelta(hours=settings.refresh_token_grace_period_hours)
        return now <= grace_period_end
    except Exception:
        return False


def generate_2fa_secret() -> str:
    return pyotp.random_base32()

def generate_qr_code(username: str, secret: str) -> str:
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=username,
        issuer_name='SA Practice 2'
    )
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

def verify_totp(secret: str, token: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)

def generate_email_verification_token() -> str:
    return secrets.token_urlsafe(32)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    settings = get_settings()
    # Decide cookie attrs by environment
    # Example flags you can put in .env:
    # COOKIE_SECURE=true on ngrok/https, false locally
    # COOKIE_SAMESITE=none on ngrok (cross-site), lax/strict locally
    secure = getattr(settings, "cookie_secure", False)
    samesite = getattr(settings, "cookie_samesite", "lax")  # "none" for cross-site
    # IMPORTANT: if samesite == "none", secure MUST be True (browser rule)
    if samesite.lower() == "none":
        secure = True

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,                   # "none" for ngrok/external
        max_age=settings.access_token_expire_minutes * 60,
        path="/",                            # explicit helps
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
    )