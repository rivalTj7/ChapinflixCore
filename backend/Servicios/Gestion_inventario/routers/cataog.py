# routers/cataog.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
import json
from db_mongo import get_db
from authkit import content_handler_required, AuthContext
from models.schemas import MoviePatch, ToggleActive, ToggleFree, Availability, CategoryReplace, ImageCreate, ReorderImages, CategoryCreate, CategoryUpdate, BulkPayload
from utils import str_to_dt, oid, now_utc
from azure_movies_blob import upload_movie_stream  # <--- NEW

router = APIRouter(prefix="/catalog", tags=["catalog"])

def _clean(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None}

def _parse_categories(cats_str: str | None, cats_json: str | None):
    """
    Accept categories either as comma-separated string or a JSON string of list.
    """
    if cats_json:
        try:
            arr = json.loads(cats_json)
            if isinstance(arr, list):
                return [str(s).lower() for s in arr]
        except Exception:
            pass
    if cats_str:
        return [s.strip().lower() for s in cats_str.split(",") if s.strip()]
    return []

# ---------- Movies (multipart create with direct Azure upload) ----------
@router.post("/movies")
async def create_movie(
    # Required
    title: str = Form(...),
    slug: str = Form(...),

    # Optional metadata
    synopsis_short: str | None = Form(None),
    synopsis_long:  str | None = Form(None),
    duration_minutes: int | None = Form(None),
    release_date: str | None = Form(None),  # "YYYY-MM-DD" or ISO
    classification_code: str | None = Form(None),
    studio_name: str | None = Form(None),
    language: str | None = Form(None),
    country: str | None = Form(None),
    poster_url: str | None = Form(None),
    banner_url: str | None = Form(None),
    trailer_url: str | None = Form(None),
    is_free: bool | None = Form(False),
    available_from: str | None = Form(None),
    available_until: str | None = Form(None),
    created_by: str | None = Form(None),

    # Categories as either comma-separated or JSON string
    category_slugs: str | None = Form(None),
    category_slugs_json: str | None = Form(None),

    # The MP4 file (required)
    video: UploadFile = File(...),

    db = Depends(get_db),
    auth: AuthContext = Depends(content_handler_required),
):
    # Quick content-type / extension checks (soft checks, not bulletproof)
    ct = (video.content_type or "").lower()
    if not (ct == "video/mp4" or (video.filename or "").lower().endswith(".mp4")):
        raise HTTPException(status_code=400, detail="Only MP4 files are allowed")

    cats = _parse_categories(category_slugs, category_slugs_json)

    # Prepare initial doc (without video fields)
    doc = _clean({
        "title": title,
        "slug": slug.lower(),
        "synopsis_short": synopsis_short,
        "synopsis_long": synopsis_long,
        "duration_minutes": duration_minutes,
        "release_date": str_to_dt(release_date),
        "classification_code": classification_code,
        "studio_name": studio_name,
        "language": language,
        "country": country,
        "poster_url": poster_url,
        "banner_url": banner_url,
        "trailer_url": trailer_url,
        "is_free": bool(is_free or False),
        "available_from": str_to_dt(available_from),
        "available_until": str_to_dt(available_until),
        "is_active": True,
        "created_by": created_by,
        "category_slugs": cats,
        "images": [],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    })

    # 1) Insert to get _id (unique slug enforced by index; DuplicateKeyError handled)
    try:
        res = await db.movies.insert_one(doc)
        _id = res.inserted_id
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail=f"Movie slug '{doc['slug']}' already exists")

    # 2) Upload to Azure Blob using the Mongo _id as the blob name
    blob_name = f"{_id}.mp4"
    try:
        video_url = upload_movie_stream(blob_name, video.file, overwrite=True)
    except Exception as e:
        # Roll back the document if blob upload failed
        await db.movies.delete_one({"_id": _id})
        raise HTTPException(status_code=400, detail=f"Video upload failed: {e}")

    # 3) Update the doc with the video info
    update = {
        "video_blob_path": f"{blob_name}",
        "video_url": video_url,      # public (non-SAS) URL; may require SAS to play if container is private
        "video_content_type": "video/mp4",
        "video_filename": video.filename,
        "updated_at": now_utc(),
    }
    await db.movies.update_one({"_id": _id}, {"$set": update})

    return {"movie_id": str(_id), "video_url": video_url}


@router.patch("/movies/{movie_id}")
async def patch_movie(movie_id: str, patch: MoviePatch, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id:
        raise HTTPException(400, "Invalid movie_id")
    p = patch.model_dump(exclude_none=True)
    # convert date strings
    for k in ("available_from", "available_until", "release_date"):
        if k in p:
            p[k] = str_to_dt(p[k])
    p["updated_at"] = now_utc()
    await db.movies.update_one({"_id": _id}, {"$set": _clean(p)})
    return {"ok": True}

@router.put("/movies/{movie_id}/active")
async def set_movie_active(movie_id: str, body: ToggleActive, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id: raise HTTPException(400, "Invalid movie_id")
    await db.movies.update_one({"_id": _id}, {"$set": {"is_active": body.is_active, "updated_at": now_utc()}})
    return {"ok": True}

@router.put("/movies/{movie_id}/availability")
async def set_movie_availability(movie_id: str, body: Availability, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id: raise HTTPException(400, "Invalid movie_id")
    af = str_to_dt(body.available_from)
    au = str_to_dt(body.available_until)
    await db.movies.update_one({"_id": _id}, {"$set": {"available_from": af, "available_until": au, "updated_at": now_utc()}})
    return {"ok": True}

@router.put("/movies/{movie_id}/is-free")
async def set_movie_is_free(movie_id: str, body: ToggleFree, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id: raise HTTPException(400, "Invalid movie_id")
    await db.movies.update_one({"_id": _id}, {"$set": {"is_free": body.is_free, "updated_at": now_utc()}})
    return {"ok": True}

# ---------- Movie Categories ----------
@router.put("/movies/{movie_id}/categories")
async def replace_movie_categories(movie_id: str, body: CategoryReplace, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id: raise HTTPException(400, "Invalid movie_id")
    slugs = [s.lower() for s in (body.category_slugs or [])]
    await db.movies.update_one({"_id": _id}, {"$set": {"category_slugs": slugs, "updated_at": now_utc()}})
    return {"ok": True}

@router.post("/movies/{movie_id}/categories/{slug}")
async def add_movie_category(movie_id: str, slug: str, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id: raise HTTPException(400, "Invalid movie_id")
    await db.movies.update_one({"_id": _id}, {"$addToSet": {"category_slugs": slug.lower()}, "$set": {"updated_at": now_utc()}})
    return {"ok": True}

@router.delete("/movies/{movie_id}/categories/{slug}")
async def remove_movie_category(movie_id: str, slug: str, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id: raise HTTPException(400, "Invalid movie_id")
    await db.movies.update_one({"_id": _id}, {"$pull": {"category_slugs": slug.lower()}, "$set": {"updated_at": now_utc()}})
    return {"ok": True}

# ---------- Images ----------
@router.post("/movies/{movie_id}/images")
async def add_movie_image(movie_id: str, body: ImageCreate, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id: raise HTTPException(400, "Invalid movie_id")
    img = {"_id": ObjectId(), "url": body.url, "label": body.label, "sort_order": body.sort_order}
    await db.movies.update_one({"_id": _id}, {"$push": {"images": img}, "$set": {"updated_at": now_utc()}})
    return {"image_id": str(img["_id"])}

@router.put("/movies/{movie_id}/images/reorder")
async def reorder_movie_images(movie_id: str, body: ReorderImages, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(movie_id)
    if not _id: raise HTTPException(400, "Invalid movie_id")
    # Retrieve current images
    doc = await db.movies.find_one({"_id": _id}, {"images": 1})
    if not doc: raise HTTPException(404, "Movie not found")
    by_id = {str(i["_id"]): i for i in (doc.get("images") or [])}
    new_order = [by_id[iid] for iid in body.image_ids if iid in by_id]
    await db.movies.update_one({"_id": _id}, {"$set": {"images": new_order, "updated_at": now_utc()}})
    return {"ok": True}

@router.delete("/images/{image_id}")
async def delete_image(image_id: str, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    iid = oid(image_id)
    if not iid: raise HTTPException(400, "Invalid image_id")
    await db.movies.update_many({}, {"$pull": {"images": {"_id": iid}}})
    return {"ok": True}

# ---------- Categories (basic mgmt) ----------
@router.post("/categories")
async def create_category(body: CategoryCreate, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    doc = {
        "name": body.name,
        "slug": body.slug.lower(),
        "parent_id": oid(body.parent_id),
        "is_active": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        res = await db.categories.insert_one(doc)
        return {"category_id": str(res.inserted_id)}
    except DuplicateKeyError:
        # Return existing id instead of 400
        existing = await db.categories.find_one({"slug": doc["slug"]}, {"_id": 1})
        return {"category_id": str(existing["_id"])}

@router.patch("/categories/{category_id}")
async def update_category(category_id: str, body: CategoryUpdate, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(category_id)
    if not _id: raise HTTPException(400, "Invalid category_id")
    p = {k:v for k,v in body.model_dump(exclude_none=True).items()}
    if "slug" in p: p["slug"] = p["slug"].lower()
    if "parent_id" in p: p["parent_id"] = oid(p["parent_id"])
    p["updated_at"] = now_utc()
    await db.categories.update_one({"_id": _id}, {"$set": p})
    return {"ok": True}

@router.delete("/categories/{category_id}")
async def soft_delete_category(category_id: str, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    _id = oid(category_id)
    if not _id: raise HTTPException(400, "Invalid category_id")
    await db.categories.update_one({"_id": _id}, {"$set": {"is_active": False, "updated_at": now_utc()}})
    return {"ok": True}

# ---------- Bulk Upsert ----------
@router.post("/movies/bulk-upsert")
async def bulk_upsert(payload: BulkPayload, db=Depends(get_db), auth: AuthContext = Depends(content_handler_required)):
    inserted = 0
    updated = 0
    for item in payload.items:
        data = item.model_dump(exclude_none=True)
        slug = data["slug"].lower()
        # normalize dates
        for k in ("available_from","available_until","release_date"):
            if k in data: data[k] = str_to_dt(data[k])
        data.setdefault("category_slugs", data.pop("categories", []))
        data["updated_at"] = now_utc()
        # upsert by slug
        res = await db.movies.update_one(
            {"slug": slug},
            {"$setOnInsert": {
                "created_at": now_utc(),
                "images": [],
                "is_active": True,
            }, "$set": data},
            upsert=True
        )
        if res.matched_count == 0 and res.upserted_id:
            inserted += 1
        else:
            updated += 1
    return {"inserted": inserted, "updated": updated}
