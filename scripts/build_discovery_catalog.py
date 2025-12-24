#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path("/var/www/schizo-studios/music/astroenergies")
AUDIO_DIR = ROOT / "audio"
OUT_FILE = ROOT / "data" / "discovery_catalog.json"
META_FILE = ROOT / "data" / "release_dates.json"

EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}

def load_release_map():
    if not META_FILE.exists():
        return {}
    try:
        return json.loads(META_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}

def nice_title(stem: str) -> str:
    return stem.strip()

release_map = load_release_map()

tracks = []
if AUDIO_DIR.exists():
    for p in sorted(AUDIO_DIR.iterdir()):
        if not p.is_file():
            continue
        if p.suffix.lower() not in EXTS:
            continue

        stem = p.stem
        release = str(release_map.get(stem, "")).strip()

        tracks.append({
            "title": nice_title(stem),
            "release": release,  # REAL date if provided, otherwise blank
            "url": "",
            "artwork": ""
        })

payload = {
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "tracks": tracks
}

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
OUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print(f"Wrote {len(tracks)} tracks -> {OUT_FILE}")
print(f"Using release map: {META_FILE} ({len(release_map)} entries)")
