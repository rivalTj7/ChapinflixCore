from sqlalchemy import Column, BigInteger, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "app_users"  # Changed from "users"
    __table_args__ = {'schema': 'app'}  # Added schema
    
    id = Column(BigInteger, primary_key=True, index=True)  # Changed from Integer
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    two_fa_enabled = Column(Boolean, default=False)
    two_fa_secret = Column(Text, nullable=True)
    failed_login_attempts = Column(Integer, default=0)  # This stays Integer
    locked_until = Column(DateTime(timezone=True), nullable=True)  # Added timezone
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    is_paid = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_content_handler = Column(Boolean, default=False)
    
    # Relationships
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    __table_args__ = {'schema': 'app'}  # Added schema
    
    id = Column(BigInteger, primary_key=True, index=True)  # Changed from Integer
    user_id = Column(BigInteger, ForeignKey("app.app_users.id", ondelete="CASCADE"))  # Changed reference
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    user = relationship("User", back_populates="email_verification_tokens")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {'schema': 'app'}  # Added schema
    
    id = Column(BigInteger, primary_key=True, index=True)  # Changed from Integer
    user_id = Column(BigInteger, ForeignKey("app.app_users.id", ondelete="CASCADE"))  # Changed reference
    token = Column(Text, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    user = relationship("User", back_populates="refresh_tokens")