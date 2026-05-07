# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    database_url: str

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    refresh_token_grace_period_hours: int = 24

    # Email (Resend remains but unused for Gmail path)
    resend_api_key: str = "unused"
    email_from: str  # set to your Gmail so headers match
    email_from_name: str = "SA Practice 2"

    # Gmail SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 465
    smtp_user: str
    smtp_pass: str

    # Security
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30
    cookie_secure: bool = False          # true on ngrok/https
    cookie_samesite: str = "lax"
    # Encryption
    aes_key: str

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
