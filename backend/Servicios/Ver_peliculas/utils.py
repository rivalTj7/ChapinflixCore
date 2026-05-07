from datetime import datetime, timezone
from bson import ObjectId
from typing import Any

def now_utc():
    return datetime.now(timezone.utc)

def ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Treat naive as UTC
        return dt.replace(tzinfo=timezone.utc)
    return dt

def in_window(now: datetime, start: datetime | None, end: datetime | None):
    """
    Accepts naive or aware datetimes; coerces to aware-UTC before comparing.
    Returns (ok, reason).
    """
    start = ensure_aware(start)
    end   = ensure_aware(end)
    if start and now < start:
        return False, "not_yet_available"
    if end and now > end:
        return False, "expired"
    return True, None

def to_jsonable(obj: Any) -> Any:
    """
    Recursively convert ObjectId -> str and leave other types intact.
    Use for nested documents like images.
    """
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_jsonable(x) for x in obj]
    return obj

def oid(s: str | None):
    if not s:
        return None
    return ObjectId(s) if ObjectId.is_valid(s) else None
