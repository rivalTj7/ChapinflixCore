# utils_stream.py
import shutil
import subprocess
from pathlib import Path

# Single shared working folder (NOT per movie)
CHUNK_DIR = Path("./chunks_cache")
SEG_DUR = 2
CODECS = "avc1.42E01E,mp4a.40.2"

def prepare_dir(clean: bool = True) -> Path:
    if clean and CHUNK_DIR.exists():
        shutil.rmtree(CHUNK_DIR)
    CHUNK_DIR.mkdir(parents=True, exist_ok=True)
    return CHUNK_DIR

def ffmpeg_chunk(mp4_path: Path, out_dir: Path) -> None:
    """
    Create init.mp4 + chunk_XXX.m4s into out_dir.

    IMPORTANT:
    - Use an ABSOLUTE path for the input (mp4_path), because we're running ffmpeg with cwd=out_dir.
    - Keep outputs as relative names so they land inside out_dir.
    """
    # Ensure out_dir exists (prepare_dir() already did this)
    out_dir.mkdir(parents=True, exist_ok=True)

    # ABSOLUTE input path fixes "No such file or directory" when cwd=out_dir
    input_abs = str(mp4_path.resolve())

    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error",
        "-i", input_abs,
        "-map", "0:v:0?", "-map", "0:a:0?",
        "-c:v", "libx264", "-profile:v", "baseline", "-level", "3.0", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-f", "hls",
        "-hls_time", str(SEG_DUR),
        "-hls_playlist_type", "vod",
        "-hls_segment_type", "fmp4",
        "-hls_fmp4_init_filename", "init.mp4",     # written in out_dir
        "-hls_segment_filename", "chunk_%03d.m4s", # written in out_dir
        "playlist.m3u8",                           # written in out_dir
    ]
    subprocess.run(cmd, check=True, cwd=str(out_dir))

def has_chunks() -> bool:
    return (CHUNK_DIR / "init.mp4").exists()

def clean_dir():
    if CHUNK_DIR.exists():
        shutil.rmtree(CHUNK_DIR)
