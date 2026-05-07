from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from authkit import auth_optional, AuthContext
from db_mongo import get_db
from models.schemas import (
    MovieCarouselItem,
    FeaturedMovie,
    Category,
    CarouselResponse
) 
from utils_catalog import availability_filter, project_carousel, now_utc
from recommendations_client import get_recommendations_client

router = APIRouter(prefix="/catalog", tags=["catalog-viewer"])

def _uid(auth: Optional[AuthContext]) -> Optional[int]:
    return auth.user_id if auth else None

def _mv_row_to_item(doc) -> MovieCarouselItem:
    # prefer nested stats.* if present, fallback to top-level if you've been storing view_count there
    view_count = doc.get("view_count")
    if view_count is None:
        view_count = (doc.get("stats") or {}).get("view_count")

    watch_count = (doc.get("stats") or {}).get("watch_count")
    last_viewed = (doc.get("stats") or {}).get("last_viewed")

    return MovieCarouselItem(
        movie_id=str(doc["_id"]),
        title=doc.get("title", ""),
        slug=doc.get("slug", ""),
        synopsis_short=doc.get("synopsis_short"),
        poster_url=doc.get("poster_url"),
        classification_code=doc.get("classification_code"),
        duration_minutes=doc.get("duration_minutes"),
        is_free=bool(doc.get("is_free", False)),
        view_count=view_count,
        upload_date=doc.get("created_at"),
        last_viewed=last_viewed,
        watch_count=watch_count,
    )

@router.get("/recommendations/for-you", response_model=CarouselResponse)
async def get_recommendations_for_you(
    rec_type: str = Query("general", description="general, genre, collaborative"),
    limit: int = Query(10, ge=1, le=20),
    auth: Optional[AuthContext] = Depends(auth_optional),
):
    '''
    Obtiene recomendaciones usando el servicio de IA
    - general: Para todos (sin login)
    - genre: Basado en géneros favoritos (requiere login)
    - collaborative: Basado en usuarios similares (requiere login)
    '''
    client = get_recommendations_client()
    
    if rec_type == "general":
        result = client.get_general_recommendations(limit=limit)
    elif rec_type == "genre":
        if not auth:
            raise HTTPException(status_code=401, detail="Authentication required for personalized recommendations")
        result = client.get_genre_based_recommendations(user_id=auth.user_id, limit=limit)
    elif rec_type == "collaborative":
        if not auth:
            raise HTTPException(status_code=401, detail="Authentication required for personalized recommendations")
        result = client.get_collaborative_recommendations(user_id=auth.user_id, limit=limit)
    else:
        raise HTTPException(status_code=400, detail="Invalid recommendation type")
    
    # Convertir a CarouselResponse
    items = [
        MovieCarouselItem(
            movie_id=rec["content_id"],
            title=rec["title"],
            slug=rec["slug"],
            synopsis_short=rec.get("synopsis_short"),
            poster_url=rec.get("poster_url"),
            classification_code=rec.get("classification_code"),
            duration_minutes=rec.get("duration_minutes"),
            is_free=rec["is_free"],
        )
        for rec in result.get("recommendations", [])
    ]
    
    return CarouselResponse(items=items, total=result.get("total", 0))

# ---------- MOST POPULAR ----------
@router.get("/most-popular", response_model=CarouselResponse)
async def get_most_popular(
    limit: int = Query(20, ge=1, le=100),
    auth: Optional[AuthContext] = Depends(auth_optional),
    db = Depends(get_db),
):
    """
    Popularity: sort by stats.view_count desc, then view_count desc, then created_at desc.
    Works even if stats.* is missing (falls back).
    """
    filt = availability_filter()
    cur = db.movies.find(filt, projection=project_carousel()).sort([
        ("stats.view_count", -1),
        ("view_count", -1),
        ("created_at", -1),
    ]).limit(limit)
    docs = await cur.to_list(length=limit)
    items = [_mv_row_to_item(d) for d in docs]
    return CarouselResponse(items=items, total=len(items))

# ---------- TOP 15 ----------
@router.get("/top-15", response_model=CarouselResponse)
async def get_top_15(
    auth: Optional[AuthContext] = Depends(auth_optional),
    db = Depends(get_db),
):
    # Same sort criteria; hard limit 15
    limit = 15
    filt = availability_filter()
    cur = db.movies.find(filt, projection=project_carousel()).sort([
        ("stats.view_count", -1),
        ("view_count", -1),
        ("created_at", -1),
    ]).limit(limit)
    docs = await cur.to_list(length=limit)
    items = [_mv_row_to_item(d) for d in docs]
    return CarouselResponse(items=items, total=len(items))

# ---------- RECENTLY ADDED ----------
@router.get("/recently-added", response_model=CarouselResponse)
async def get_recently_added(
    limit: int = Query(20, ge=1, le=100),
    auth: Optional[AuthContext] = Depends(auth_optional),
    db = Depends(get_db),
):
    filt = availability_filter()
    cur = db.movies.find(filt, projection=project_carousel()).sort([("created_at", -1)]).limit(limit)
    docs = await cur.to_list(length=limit)
    items = [_mv_row_to_item(d) for d in docs]
    return CarouselResponse(items=items, total=len(items))

# ---------- RECENTLY WATCHED ----------
@router.get("/recently-watched", response_model=CarouselResponse)
async def get_recently_watched(
    limit: int = Query(20, ge=1, le=100),
    auth: Optional[AuthContext] = Depends(auth_optional),
    db = Depends(get_db),
):
    """
    Uses optional 'user_views' collection with documents like:
      { user_id: <int>, movie_id: ObjectId, last_viewed: ISODate, count: <int> }
    If user is anonymous or collection missing, returns empty.
    """
    user_id = _uid(auth)
    if not user_id:
        return CarouselResponse(items=[], total=0)

    # Guard if collection does not exist
    if "user_views" not in await db.list_collection_names():
        return CarouselResponse(items=[], total=0)

    filt = {"user_id": int(user_id)}
    uv = db.user_views.find(filt).sort([("last_viewed", -1)]).limit(limit)
    views = await uv.to_list(length=limit)
    movie_ids = [v.get("movie_id") for v in views if isinstance(v.get("movie_id"), ObjectId)]

    if not movie_ids:
        return CarouselResponse(items=[], total=0)

    # Apply availability on the movies side
    mfilt = availability_filter()
    mfilt["_id"] = {"$in": movie_ids}
    mdocs = await db.movies.find(mfilt, projection=project_carousel()).to_list(length=len(movie_ids))
    by_id = {str(d["_id"]): d for d in mdocs}

    items: List[MovieCarouselItem] = []
    for v in views:
        mid = v.get("movie_id")
        if not isinstance(mid, ObjectId):
            continue
        d = by_id.get(str(mid))
        if not d:
            continue
        # attach per-user last_viewed
        d = {**d, "stats": {**(d.get("stats") or {}), "last_viewed": v.get("last_viewed")}}
        items.append(_mv_row_to_item(d))

    return CarouselResponse(items=items[:limit], total=len(items))

# ---------- WATCH AGAIN ----------
@router.get("/watch-again", response_model=CarouselResponse)
async def get_watch_again(
    limit: int = Query(20, ge=1, le=100),
    auth: Optional[AuthContext] = Depends(auth_optional),
    db = Depends(get_db),
):
    """
    Same 'user_views' collection; select count > 1, order by last_viewed desc
    """
    user_id = _uid(auth)
    if not user_id:
        return CarouselResponse(items=[], total=0)

    if "user_views" not in await db.list_collection_names():
        return CarouselResponse(items=[], total=0)

    filt = {"user_id": int(user_id), "count": {"$gt": 1}}
    uv = db.user_views.find(filt).sort([("last_viewed", -1)]).limit(limit)
    views = await uv.to_list(length=limit)
    movie_ids = [v.get("movie_id") for v in views if isinstance(v.get("movie_id"), ObjectId)]

    if not movie_ids:
        return CarouselResponse(items=[], total=0)

    mfilt = availability_filter()
    mfilt["_id"] = {"$in": movie_ids}
    mdocs = await db.movies.find(mfilt, projection=project_carousel()).to_list(length=len(movie_ids))
    by_id = {str(d["_id"]): d for d in mdocs}

    items: List[MovieCarouselItem] = []
    for v in views:
        mid = v.get("movie_id")
        if not isinstance(mid, ObjectId):
            continue
        d = by_id.get(str(mid))
        if not d:
            continue
        d = {**d, "stats": {**(d.get("stats") or {}), "watch_count": v.get("count")}}
        items.append(_mv_row_to_item(d))

    return CarouselResponse(items=items[:limit], total=len(items))

# ---------- CATEGORIES ----------
@router.get("/categories", response_model=List[Category])
async def get_categories(db = Depends(get_db)):
    cur = db.categories.find({"is_active": True}, projection={"_id": 1, "name": 1, "slug": 1, "parent_id": 1}).sort([("name", 1)])
    docs = await cur.to_list(length=500)
    return [
        Category(
            category_id=str(d["_id"]),
            name=d.get("name", ""),
            slug=d.get("slug", ""),
            parent_id=str(d["parent_id"]) if d.get("parent_id") else None
        )
        for d in docs
    ]

@router.get("/category/{slug}", response_model=CarouselResponse)
async def get_movies_by_category(
    slug: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    auth: Optional[AuthContext] = Depends(auth_optional),
    db = Depends(get_db),
):
    filt = availability_filter()
    filt["category_slugs"] = slug.lower()

    cur = db.movies.find(filt, projection=project_carousel()).sort([("created_at", -1)]).skip(offset).limit(limit)
    docs = await cur.to_list(length=limit)
    items = [_mv_row_to_item(d) for d in docs]
    return CarouselResponse(items=items, total=len(items))

# ---------- FEATURED ----------
@router.get("/featured", response_model=Optional[FeaturedMovie])
async def get_featured_movie(
    auth: Optional[AuthContext] = Depends(auth_optional),
    db = Depends(get_db),
):
    """
    Choose a featured movie with a banner, newest first (and available).
    """
    filt = availability_filter()
    filt["banner_url"] = {"$ne": None}

    doc = await db.movies.find_one(
        filt,
        projection={
            "_id": 1, "title": 1, "slug": 1,
            "synopsis_short": 1, "synopsis_long": 1,
            "banner_url": 1, "poster_url": 1,
            "classification_code": 1, "duration_minutes": 1,
            "is_free": 1,
        },
        sort=[("created_at", -1)]
    )
    if not doc:
        return None

    return FeaturedMovie(
        movie_id=str(doc["_id"]),
        title=doc.get("title", ""),
        slug=doc.get("slug", ""),
        synopsis_short=doc.get("synopsis_short"),
        synopsis_long=doc.get("synopsis_long"),
        banner_url=doc.get("banner_url"),
        poster_url=doc.get("poster_url"),
        classification_code=doc.get("classification_code"),
        duration_minutes=doc.get("duration_minutes"),
        is_free=bool(doc.get("is_free", False)),
    )