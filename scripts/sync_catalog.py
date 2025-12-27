#!/usr/bin/env python3
"""
Generate:
- data/local_tracks.json (from ./audio folder)
- data/apple_catalog.json (from iTunes Search API for two artist IDs)

Artist IDs from your Apple Music URLs:
1832538332 and 1831765259
"""

from __future__ import annotations
import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.parse import urlencode

HERE = Path(__file__).resolve().parent.parent  # .../music/astroenergies
AUDIO_DIR = HERE / "audio"
DATA_DIR = HERE / "data"
LOCAL_JSON = DATA_DIR / "local_tracks.json"
APPLE_JSON = DATA_DIR / "apple_catalog.json"

ARTIST_IDS = ["1832538332", "1831765259"]

AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}

def http_json(url: str, timeout: int = 20) -> dict:
    req = Request(url, headers={"User-Agent": "astroenergies-catalog-sync/1.0"})
    with urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", errors="replace"))

def title_from_filename(name: str) -> str:
    base = Path(name).stem
    base = base.replace("_", " ").replace("-", " ").strip()
    base = re.sub(r"\s+", " ", base)
    return base

def iso_date(s: str) -> str:
    # iTunes returns ISO-ish timestamps, keep YYYY-MM-DD for display
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.date().isoformat()
    except Exception:
        return s[:10] if s else ""

def build_local_tracks() -> list[dict]:
    tracks = []
    if not AUDIO_DIR.exists():
        return tracks

    for p in sorted(AUDIO_DIR.iterdir()):
        if not p.is_file():
            continue
        if p.suffix.lower() not in AUDIO_EXTS:
            continue

        tracks.append({
            "title": title_from_filename(p.name),
            "release": "",                 # you can fill later via Apple cross-ref if you want
            "file": f"audio/{p.name}",     # relative to /music/astroenergies/
            "note": "Local master",
        })
    return tracks

def fetch_itunes_artist_catalog(artist_id: str) -> list[dict]:
    # Use lookup by artist id, pull albums + songs.
    # iTunes Search API docs: lookup with id-based requests
    # (Apple's doc lives in the archived developer library)
    params = {
        "id": artist_id,
        "entity": "song",
        "limit": "200",
    }
    url = "https://itunes.apple.com/lookup?" + urlencode(params)
    data = http_json(url)

    releases = []
    for item in data.get("results", []):
        kind = item.get("kind", "")
        wrapper = item.get("wrapperType", "")

        # We only care about songs/tracks here
        if wrapper != "track" or kind != "song":
            continue

        title = item.get("trackName", "")
        date = iso_date(item.get("releaseDate", ""))
        apple_url = item.get("trackViewUrl", "")
        track_id = str(item.get("trackId", ""))

        releases.append({
            "id": f"apple-track-{track_id}",
            "title": title,
            "releaseDate": date,
            "kind": "track",
            "source": f"Apple Music (artist {artist_id})",
            "url": apple_url,
        })

    return releases

def dedupe_releases(releases: list[dict]) -> list[dict]:
    # Dedup by (title lower, date) first, fallback by url
    seen = set()
    out = []
    for r in releases:
        key = (str(r.get("title", "")).strip().lower(), str(r.get("releaseDate", "")).strip())
        key2 = str(r.get("url", "")).strip()
        if key in seen or (key2 and key2 in seen):
            continue
        seen.add(key)
        if key2:
            seen.add(key2)
        out.append(r)

    # Sort newest first (future dates will float to top too)
    def sort_key(x):
        d = x.get("releaseDate") or "0000-00-00"
        return d
    out.sort(key=sort_key, reverse=True)
    return out

def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)

def main() -> int:
    local = build_local_tracks()
    write_json(LOCAL_JSON, local)

    all_releases = []
    for aid in ARTIST_IDS:
        try:
            all_releases.extend(fetch_itunes_artist_catalog(aid))
        except Exception as e:
            print(f"[warn] Apple fetch failed for {aid}: {e}", file=sys.stderr)

    all_releases = dedupe_releases(all_releases)

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "artistIds": ARTIST_IDS,
        "releases": all_releases,
    }
    write_json(APPLE_JSON, payload)

    print(f"Wrote: {LOCAL_JSON} ({len(local)} local files)")
    print(f"Wrote: {APPLE_JSON} ({len(all_releases)} apple tracks)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
