# db_mongo.py
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings, SettingsConfigDict
from pymongo import ASCENDING, DESCENDING, TEXT

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

        # Helpful indexes (idempotent)
        await _db.movies.create_index([("slug", ASCENDING)], unique=True, name="u_slug")
        await _db.movies.create_index([("created_at", DESCENDING)], name="idx_created_at")
        await _db.movies.create_index([("is_active", ASCENDING)], name="idx_is_active")
        await _db.movies.create_index([("available_from", ASCENDING)], name="idx_available_from")
        await _db.movies.create_index([("available_until", ASCENDING)], name="idx_available_until")
        await _db.movies.create_index([("category_slugs", ASCENDING)], name="idx_category_slugs")
        await _db.movies.create_index(
            [("title", TEXT), ("synopsis_short", TEXT), ("synopsis_long", TEXT)],
            name="t_movies",
            default_language="spanish",
            language_override="text_language",
        )

        await _db.categories.create_index([("slug", ASCENDING)], unique=True, name="u_cat_slug")
        await _db.categories.create_index([("is_active", ASCENDING)], name="idx_cat_active")

        # Optional (only if you later create user views)
        # await _db.user_views.create_index([("user_id", ASCENDING), ("movie_id", ASCENDING)], unique=True)
        # await _db.user_views.create_index([("last_viewed", DESCENDING)])

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
