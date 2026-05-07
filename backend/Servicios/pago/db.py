import os
import asyncpg
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql://localhost/dev"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
_pool: asyncpg.Pool | None = None

async def init_pool():
    global _pool
    if _pool is None:
        db_url = os.getenv("DATABASE_URL", settings.database_url)
        _pool = await asyncpg.create_pool(dsn=db_url, min_size=1, max_size=10)
    return _pool

async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

async def get_conn():
    pool = await init_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO app, public;")
        yield conn