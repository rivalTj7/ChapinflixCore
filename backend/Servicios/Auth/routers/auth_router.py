from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
from database import get_db
from models import User, EmailVerificationToken, RefreshToken
from schemas import (
    UserRegister, UserLogin, TokenRefresh, UserResponse, 
    TokenResponse, MessageResponse, Enable2FAResponse, Verify2FA
)
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    verify_token, save_refresh_token, is_token_in_grace_period, JWTBearer,
    generate_2fa_secret, generate_qr_code, verify_totp, generate_email_verification_token,
    set_auth_cookies
)
from crypto import aes_cipher
from email_service import send_verification_email
from config import get_settings
from security import get_token_from_request

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=MessageResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    
    # Encrypt sensitive data
    encrypted_email = aes_cipher.encrypt(user_data.email)
    encrypted_first_name = aes_cipher.encrypt(user_data.first_name)
    encrypted_last_name = aes_cipher.encrypt(user_data.last_name)
    
    # Create user
    user = User(
        email=encrypted_email,
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        first_name=encrypted_first_name,
        last_name=encrypted_last_name,
        is_active=False,
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate and save verification token
    verification_token = generate_email_verification_token()
    token_entry = EmailVerificationToken(
        user_id=user.id,
        token=verification_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(token_entry)
    db.commit()
    
    # Send verification email
    verification_link = f"http://localhost:3000/verify-email?token={verification_token}"
    send_verification_email(user_data.email, user_data.username, verification_link)
    
    return {"message": "User registered successfully. Please check your email to verify your account."}

@router.get("/verify-email", response_model=MessageResponse)
async def verify_email(token: str, db: Session = Depends(get_db)):
    token_entry = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token
    ).first()
    
    if not token_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    if token_entry.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired"
        )
    
    # Activate user
    user = token_entry.user
    user.is_verified = True
    user.is_active = True
    
    # Delete used token
    db.delete(token_entry)
    db.commit()
    
    return {"message": "Email verified successfully. You can now login."}

@router.post("/login", response_model=TokenResponse)
async def login(response: Response, credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked until {user.locked_until}"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        user.failed_login_attempts += 1
        
        if user.failed_login_attempts >= settings.max_login_attempts:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.lockout_duration_minutes)
            user.failed_login_attempts = 0
        
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if email is verified
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please verify your email first"
        )
    
    # Check 2FA if enabled
    if user.two_fa_enabled:
        if not credentials.totp_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="2FA code required"
            )
        
        # Decrypt the secret to verify
        decrypted_secret = aes_cipher.decrypt(user.two_fa_secret)
        if not verify_totp(decrypted_secret, credentials.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )
    
    # Reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    # Create tokens
    token_data = {"sub": str(user.id)}
    claims = {
    "paid": bool(user.is_paid),
    "admin": bool(user.is_admin),
    "content_handler": bool(user.is_content_handler),
}
    access_token = create_access_token(token_data, custom_claims=claims)
    refresh_token = create_refresh_token(token_data, custom_claims=claims)
    
    # Save refresh token
    save_refresh_token(db, user.id, refresh_token)
    
    # Set cookies
    set_auth_cookies(response, access_token, refresh_token)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )
    
    # Check if token is in grace period
    if not is_token_in_grace_period(refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    
    # Verify refresh token
    payload = verify_token(refresh_token, "refresh")
    user_id = int(payload.get("sub"))
    
    # Check if refresh token exists in database
    token_entry = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token,
        RefreshToken.user_id == user_id
    ).first()
    
    if not token_entry:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Delete old refresh token
    db.delete(token_entry)
    db.commit()
    
    # Create new tokens
    token_data = {"sub": str(user_id)}
    user = db.query(User).filter(User.id == user_id).first()
    claims = {
    "paid": bool(user.is_paid),
    "admin": bool(user.is_admin),
    "content_handler": bool(user.is_content_handler),
} if user else {"paid": False, "admin": False, "content_handler": False}
    new_access_token = create_access_token({"sub": str(user_id)}, custom_claims=claims)
    new_refresh_token = create_refresh_token({"sub": str(user_id)}, custom_claims=claims)
    
    # Save new refresh token
    save_refresh_token(db, user_id, new_refresh_token)
    
    # Set new cookies
    set_auth_cookies(response, new_access_token, new_refresh_token)
    
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    
    if refresh_token:
        # Delete refresh token from database
        token_entry = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token
        ).first()
        if token_entry:
            db.delete(token_entry)
            db.commit()
    
    # Clear cookies
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    
    return {"message": "Logged out successfully"}

@router.post("/enable-2fa", response_model=Enable2FAResponse)
async def enable_2fa(request: Request, db: Session = Depends(get_db)):
    # Get user from token
    token = get_token_from_request(request, expected_type="access")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    payload = verify_token(token)
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if user.two_fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    # Generate secret and QR code
    secret = generate_2fa_secret()
    qr_code = generate_qr_code(user.username, secret)
    
    # Save encrypted secret temporarily (will be confirmed with verify-2fa)
    user.two_fa_secret = aes_cipher.encrypt(secret)
    db.commit()
    
    return {"secret": secret, "qr_code": qr_code}

@router.post("/verify-2fa", response_model=MessageResponse)
async def verify_2fa(request: Request, data: Verify2FA, db: Session = Depends(get_db)):
    # Get user from token
    token = get_token_from_request(request, expected_type="access")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    payload = verify_token(token)
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user.two_fa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup not initiated"
        )
    
    # Verify the TOTP code
    decrypted_secret = aes_cipher.decrypt(user.two_fa_secret)
    if not verify_totp(decrypted_secret, data.totp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code"
        )
    
    # Enable 2FA
    user.two_fa_enabled = True
    db.commit()
    
    return {"message": "2FA enabled successfully"}

@router.post("/disable-2fa", response_model=MessageResponse)
async def disable_2fa(request: Request, data: Verify2FA, db: Session = Depends(get_db)):
    # Get user from token
    token = get_token_from_request(request, expected_type="access")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    payload = verify_token(token)
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user.two_fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )
    
    # Verify the TOTP code before disabling
    decrypted_secret = aes_cipher.decrypt(user.two_fa_secret)
    if not verify_totp(decrypted_secret, data.totp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code"
        )
    
    # Disable 2FA
    user.two_fa_enabled = False
    user.two_fa_secret = None
    db.commit()
    
    return {"message": "2FA disabled successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    # Get user from token
    token = get_token_from_request(request, expected_type="access")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    payload = verify_token(token)
    user_id = int(payload.get("sub"))
    is_paid_claim = bool(payload.get("paid", False))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Decrypt sensitive data for response
    return UserResponse(
        id=user.id,
        email=aes_cipher.decrypt(user.email),
        username=user.username,
        first_name=aes_cipher.decrypt(user.first_name),
        last_name=aes_cipher.decrypt(user.last_name),
        is_active=user.is_active,
        is_verified=user.is_verified,
        two_fa_enabled=user.two_fa_enabled,
        created_at=user.created_at
    )