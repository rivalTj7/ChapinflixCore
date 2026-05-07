# utils.py
from datetime import datetime
from bson import ObjectId

def str_to_dt(s: str | None):
    if not s: return None
    # Accept "YYYY-MM-DD" or full ISO; let fromisoformat try
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None

def oid(s: str | None):
    if not s: return None
    return ObjectId(s) if ObjectId.is_valid(s) else None

def now_utc():
    return datetime.utcnow()
