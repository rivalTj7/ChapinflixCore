# routers/movie_viewer.py
from typing import Optional, Any, List
import json, re, glob, math, asyncio, base64
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from authkit import auth_optional, auth_required, AuthContext
from models.schemas import MovieDetail, CanViewResponse, PlayResult
from db_mongo import get_db
from utils import now_utc, in_window, to_jsonable
from azure_movies_blob import generate_read_sas_url, download_blob_to_path
from utils_stream import prepare_dir, ffmpeg_chunk, has_chunks, SEG_DUR, CODECS, CHUNK_DIR
import shutil  # for cleanup on websocket end

router = APIRouter(prefix="/movie", tags=["movie-viewer"])

# ----- helpers -----
async def _get_movie_by_slug(db, slug: str) -> dict | None:
    return await db.movies.find_one(
        {"slug": slug.lower()},
        {"_id": 1, "title": 1, "slug": 1, "classification_code": 1,
         "category_slugs": 1, "images": 1, "is_free": 1,
         "available_from": 1, "available_until": 1,
         "video_blob_path": 1, "video_url": 1}
    )

def _can_view(doc: dict, is_paid: bool) -> tuple[bool, Optional[str]]:
    ok, reason = in_window(now_utc(), doc.get("available_from"), doc.get("available_until"))
    if not ok:
        return False, reason
    if not doc.get("is_free", False) and not is_paid:
        return False, "payment_required"
    return True, None


from pydantic import BaseModel
from typing import Literal

# ---- add just below helpers ----
class WatchEvent(BaseModel):
    event: Literal["start", "progress", "finish"]
    position_sec: float | None = None
# ----- endpoints -----
@router.get("/{slug}", response_model=MovieDetail)
async def get_detail_by_slug(slug: str, db = Depends(get_db)):   # <— inject db
    doc = await _get_movie_by_slug(db, slug)
    if not doc:
        raise HTTPException(404, "Movie not found")
    return MovieDetail(
        movie_id=str(doc["_id"]),
        title=doc["title"],
        slug=doc["slug"],
        classification=doc.get("classification_code"),
        categories=doc.get("category_slugs") or [],
        images=to_jsonable(doc.get("images") or []),
        is_free=bool(doc.get("is_free", False)),
        available_from=doc.get("available_from"),
        available_until=doc.get("available_until"),
    )

@router.get("/{slug}/can-view", response_model=CanViewResponse)
async def can_view_by_slug(
    slug: str,
    auth: Optional[AuthContext] = Depends(auth_optional),
    db = Depends(get_db),                                           # <— inject db
):
    doc = await _get_movie_by_slug(db, slug)
    if not doc:
        raise HTTPException(404, "Movie not found")
    ok, reason = _can_view(doc, bool(auth.paid) if auth else False)
    return CanViewResponse(allowed=ok, denial_reason=reason)

@router.post("/{slug}/play", response_model=PlayResult)
async def play_by_slug(slug: str, ctx: AuthContext = Depends(auth_required), db = Depends(get_db)):  # <— inject db
    doc = await _get_movie_by_slug(db, slug)
    if not doc:
        raise HTTPException(404, "Movie not found")
    ok, reason = _can_view(doc, bool(ctx.paid))
    res = PlayResult(allowed=ok, denial_reason=reason)
    if ok:
        res.title = doc["title"]
        res.slug = doc["slug"]
        res.is_free = bool(doc.get("is_free", False))
        res.video_blob_path = doc.get("video_blob_path")
        res.video_url = doc.get("video_url")
    return res

@router.post("/{slug}/prepare")
async def prepare_movie(slug: str, ctx: AuthContext = Depends(auth_required)):
    db = await get_db()
    doc = await _get_movie_by_slug(db, slug)
    if not doc:
        raise HTTPException(404, "Movie not found")

    ok, reason = _can_view(doc, bool(ctx.paid))
    if not ok:
        raise HTTPException(403, reason or "forbidden")

    blob_name = doc.get("video_blob_path")
    if not blob_name:
        raise HTTPException(400, "Movie has no uploaded video_blob_path")

    # Single shared folder: wipe and recreate
    workdir = prepare_dir(clean=True)           # ./chunks_cache/
    src = workdir / "source.mp4"

    # Optional: SAS (for logs/diagnostics)
    _ = generate_read_sas_url(blob_name, minutes=30)

    # Download to ./chunks_cache/source.mp4
    download_blob_to_path(blob_name, str(src))

    # ffmpeg -> init.mp4 + chunk_XXX.m4s in ./chunks_cache/
    try:
        ffmpeg_chunk(src, workdir)
    except Exception as e:
        shutil.rmtree(workdir, ignore_errors=True)
        raise HTTPException(500, f"ffmpeg failed: {e}")

    return {
        "ok": True,
        "chunks_dir": str(workdir),
        "segments": len(list(workdir.glob("chunk_*.m4s"))),
        "has_init": (workdir / "init.mp4").exists(),
    }



# ------- WebSocket: exact local-stream protocol over a SINGLE shared folder -------
CHUNK_RE = re.compile(r"chunk_(\d{3})\.m4s$")

def _b64(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii")

def _chunk_indices(dirpath: Path) -> List[int]:
    idx = []
    for p in glob.glob(str(dirpath / "chunk_*.m4s")):
        m = CHUNK_RE.search(p)
        if m:
            idx.append(int(m.group(1)))
    idx.sort()
    return idx

def _chunk_path(dirpath: Path, i: int) -> Path:
    return dirpath / f"chunk_{i:03d}.m4s"

@router.websocket("/ws/watch/{slug}")
async def watch_slug(websocket: WebSocket, slug: str):
    await websocket.accept()

    # Validate movie (optional for auth/analytics parity with your flow)
    db = await get_db()
    doc = await _get_movie_by_slug(db, slug)
    if not doc:
        await websocket.send_text(json.dumps({"type": "error", "msg": "Movie not found"}))
        await websocket.close()
        return

    # Work from the single shared folder prepared by /prepare
    init_file = CHUNK_DIR / "init.mp4"
    if not init_file.exists():
        await websocket.send_text(json.dumps({"type": "error", "msg": "init.mp4 missing; call /prepare first"}))
        await websocket.close()
        return

    idxs = _chunk_indices(CHUNK_DIR)
    if not idxs:
        await websocket.send_text(json.dumps({"type": "error", "msg": "no chunk_XXX.m4s files; call /prepare first"}))
        await websocket.close()
        return

    first_idx, last_idx = idxs[0], idxs[-1]

    # Send meta + init + status (exact protocol as your local script)
    await websocket.send_text(json.dumps({
        "type": "meta",
        "segDuration": SEG_DUR,
        "codecs": CODECS,
        "chunkFirst": first_idx,
        "chunkLast": last_idx,
    }))
    await websocket.send_text(json.dumps({"type": "init", "base64": _b64(init_file.read_bytes())}))
    await websocket.send_text(json.dumps({"type": "status", "msg": "ready"}))

    paused = True
    current_idx = first_idx
    pump_task: Optional[asyncio.Task] = None

    async def push_from(idx: int):
        nonlocal current_idx, paused
        current_idx = max(first_idx, min(idx, last_idx))
        try:
            while not paused and current_idx <= last_idx:
                p = _chunk_path(CHUNK_DIR, current_idx)
                if not p.exists():
                    await websocket.send_text(json.dumps({"type": "error", "msg": f"missing {p.name}"}))
                    break
                await websocket.send_text(json.dumps({
                    "type": "segment",
                    "index": current_idx,
                    "base64": _b64(p.read_bytes())
                }))
                current_idx += 1
                # light pacing; client buffers anyway
                await asyncio.sleep(SEG_DUR * 0.1)
            if current_idx > last_idx:
                await websocket.send_text(json.dumps({"type": "eos"}))
        except WebSocketDisconnect:
            return

    def stop_pumper():
        nonlocal pump_task
        if pump_task and not pump_task.done():
            pump_task.cancel()
        pump_task = None

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            kind = msg.get("type")

            if kind == "PLAY":
                paused = False
                stop_pumper()
                pump_task = asyncio.create_task(push_from(current_idx))
                await websocket.send_text(json.dumps({"type": "ack", "cmd": "PLAY", "from": current_idx}))

            elif kind == "PAUSE":
                paused = True
                stop_pumper()
                await websocket.send_text(json.dumps({"type": "ack", "cmd": "PAUSE", "pos": current_idx}))

            elif kind == "SEEK":
                t = float(msg.get("timeSec", 0))
                i = int(math.floor(t / SEG_DUR))
                i = max(first_idx, min(i, last_idx))
                paused = False
                stop_pumper()
                pump_task = asyncio.create_task(push_from(i))
                await websocket.send_text(json.dumps({"type": "ack", "cmd": "SEEK", "to": i}))

            elif kind == "START":
                t = float(msg.get("startTimeSec", 0))
                i = int(math.floor(t / SEG_DUR))
                i = max(first_idx, min(i, last_idx))
                paused = False
                stop_pumper()
                pump_task = asyncio.create_task(push_from(i))
                await websocket.send_text(json.dumps({"type": "ack", "cmd": "START", "from": i}))

            elif kind == "STOP":
                paused = True
                stop_pumper()
                await websocket.send_text(json.dumps({"type": "ack", "cmd": "STOP"}))
                await websocket.close()
                break

            else:
                await websocket.send_text(json.dumps({"type": "warn", "msg": f"unknown command: {kind}"}))

    except WebSocketDisconnect:
        pass
    finally:
        stop_pumper()
        # Tear down the single workspace when viewer disconnects
        try:
            shutil.rmtree(CHUNK_DIR, ignore_errors=True)
        except Exception:
            pass
