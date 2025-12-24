#!/usr/bin/env python3
import json
import os
import subprocess
from datetime import datetime

BASE_DIR = "/var/www/schizo-studios/music/astroenergies"
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
COVERS_DIR = os.path.join(BASE_DIR, "img", "covers")
OUT_JSON = os.path.join(BASE_DIR, "data", "local_tracks.json")

AUDIO_EXTS = {".mp3", ".m4a", ".flac", ".ogg", ".wav"}
FALLBACK_COVER = "img/astroenergies-logo.png"

def title_from_filename(fname: str) -> str:
    base = os.path.splitext(fname)[0]
    return base.replace("_", " ").replace("-", " ").strip()

def file_date(path: str) -> str:
    ts = os.path.getmtime(path)
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")

def run(cmd):
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

def extract_cover_ffmpeg(audio_path: str, out_jpg: str) -> bool:
    """
    Extract embedded cover art using ffmpeg.
    Returns True if a cover was extracted.
    """
    # If already exists and non-empty, keep it.
    if os.path.isfile(out_jpg) and os.path.getsize(out_jpg) > 2048:
        return True

    # ffmpeg tries to map the attached picture stream if present
    # -y overwrite, -an no audio, -vframes 1 first frame/art
    cmd = [
        "ffmpeg", "-y",
        "-i", audio_path,
        "-an",
        "-vcodec", "mjpeg",
        "-vframes", "1",
        out_jpg
    ]
    p = run(cmd)
    if os.path.isfile(out_jpg) and os.path.getsize(out_jpg) > 2048:
        return True

    # Cleanup tiny/failed file
    if os.path.isfile(out_jpg):
        try:
            os.remove(out_jpg)
        except Exception:
            pass
    return False

def main():
    if not os.path.isdir(AUDIO_DIR):
        raise SystemExit(f"Missing audio dir: {AUDIO_DIR}")

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    os.makedirs(COVERS_DIR, exist_ok=True)

    tracks = []
    for fname in sorted(os.listdir(AUDIO_DIR)):
        path = os.path.join(AUDIO_DIR, fname)
        if not os.path.isfile(path):
            continue

        ext = os.path.splitext(fname)[1].lower()
        if ext not in AUDIO_EXTS:
            continue

        base = os.path.splitext(fname)[0]
        cover_rel = FALLBACK_COVER

        cover_out = os.path.join(COVERS_DIR, f"{base}.jpg")
        if extract_cover_ffmpeg(path, cover_out):
            cover_rel = f"img/covers/{base}.jpg"

        tracks.append({
            "title": title_from_filename(fname),
            "release": file_date(path),
            "file": f"audio/{fname}",
            "cover": cover_rel,
            "note": "Local master"
        })

    payload = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "count": len(tracks),
        "tracks": tracks
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(tracks)} tracks -> {OUT_JSON}")
    print(f"Covers in -> {COVERS_DIR}")

if __name__ == "__main__":
    main()
