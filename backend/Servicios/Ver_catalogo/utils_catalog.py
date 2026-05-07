# utils_catalog.py
from datetime import datetime, timezone
from typing import Dict, Any

def now_utc():
    return datetime.now(timezone.utc)

def ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None: return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

def availability_filter(now: datetime | None = None) -> Dict[str, Any]:
    """
    Build a Mongo filter enforcing:
      - is_active == True
      - (available_from is null OR now >= available_from)
      - (available_until is null OR now <= available_until)
    """
    n = ensure_aware(now or now_utc())
    return {
        "is_active": True,
        "$and": [
            {"$or": [{"available_from": None}, {"available_from": {"$lte": n}}]},
            {"$or": [{"available_until": None}, {"available_until": {"$gte": n}}]},
        ]
    }

def project_carousel():
    # Minimal projection to speed up queries for rails
    return {
        "_id": 1,
        "title": 1,
        "slug": 1,
        "synopsis_short": 1,
        "poster_url": 1,
        "classification_code": 1,
        "duration_minutes": 1,
        "is_free": 1,
        "created_at": 1,
        # optional stats if present
        "view_count": 1,
        "stats.view_count": 1,
        "stats.watch_count": 1,
        "stats.last_viewed": 1,
    }
