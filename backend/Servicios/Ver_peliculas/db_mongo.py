# ===================== db_mongo.py =====================
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings, SettingsConfigDict

class MongoSettings(BaseSettings):
    mongo_uri: str
    mongo_db: str = "chapinflix_content"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = MongoSettings()

_client: AsyncIOMotorClient | None = None
_db = None

async def init_mongo():
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=10_000)
        _db = _client[settings.mongo_db]
    return _db

async def get_db():
    if _db is None:
        await init_mongo()
    return _db

async def close_mongo():
    global _client
    if _client:
        _client.close()
        _client = None
