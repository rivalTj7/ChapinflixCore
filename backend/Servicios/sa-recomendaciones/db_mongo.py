# db_mongo.py - VERSIÓN SYNC (pymongo en lugar de motor)
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from pydantic_settings import BaseSettings, SettingsConfigDict

class MongoSettings(BaseSettings):
    mongo_uri: str
    mongo_db: str = "content"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = MongoSettings()
_client: MongoClient | None = None
_db = None

def init_mongo():
    global _client, _db
    if _client is None:
        _client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=10_000)
        _db = _client[settings.mongo_db]
        
        # Helpful indexes (idempotent)
        _db.movies.create_index([("slug", ASCENDING)], unique=True, name="u_slug")
        _db.movies.create_index([("created_at", DESCENDING)], name="idx_created_at")
        _db.movies.create_index([("is_active", ASCENDING)], name="idx_is_active")
        _db.movies.create_index([("available_from", ASCENDING)], name="idx_available_from")
        _db.movies.create_index([("available_until", ASCENDING)], name="idx_available_until")
        _db.movies.create_index([("category_slugs", ASCENDING)], name="idx_category_slugs")
        _db.movies.create_index(
            [("title", TEXT), ("synopsis_short", TEXT), ("synopsis_long", TEXT)],
            name="t_movies",
            default_language="spanish",
            language_override="text_language",
        )
        _db.categories.create_index([("slug", ASCENDING)], unique=True, name="u_cat_slug")
        _db.categories.create_index([("is_active", ASCENDING)], name="idx_cat_active")
    
    return _db

def get_db():
    if _db is None:
        init_mongo()
    return _db

def close_mongo():
    global _client
    if _client:
        _client.close()
        _client = None