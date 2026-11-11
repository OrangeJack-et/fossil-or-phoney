"""Find, review and add specimen photos from Wikimedia Commons.

Three steps:

  1. search  - look up photos on Commons and remember the openly licensed ones
               python tools/commons.py search "Archaeopteryx" "Dimetrodon skull"

  2. sheet   - build a contact sheet to compare candidates side by side
               python tools/commons.py sheet
               then open http://localhost:8000/tools/_work/sheet.html
               (with `python -m http.server 8000` running in this folder)

  3. add     - download one candidate, crop it, resize it, save it to assets/,
               and print the "image" and "photo" lines for specimens.json
               python tools/commons.py add archaeopteryx 12 --crop 0,0,1,0.85

Crop values are fractions of the photo: left, top, right, bottom. So
0,0,1,0.85 keeps everything except the bottom 15% (handy for cutting off labels).

Needs Python 3.10+ and Pillow (pip install pillow).
"""

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

GAME_DIR = Path(__file__).resolve().parent.parent
WORK_DIR = GAME_DIR / "tools" / "_work"
CANDIDATES_FILE = WORK_DIR / "candidates.json"
ASSETS_DIR = GAME_DIR / "assets"

API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "fossil-or-phoney-photo-tool/1.0 (educational daily game)"
SECONDS_BETWEEN_REQUESTS = 5  # be polite: Commons limits how fast programs can ask
SAVED_WIDTH = 480             # pixels; the game only shows about 128 across

# Licences that allow use on a public website with credit.
ALLOWED_LICENCE = re.compile(r"^(CC0|Public domain|CC BY(-SA)? \d(\.\d)?)", re.IGNORECASE)

_last_request = 0.0


def fetch(url):
    """Downloads a URL, waiting between requests and backing off if Commons asks us to."""
    global _last_request
    for attempt in range(5):
        wait = SECONDS_BETWEEN_REQUESTS - (time.time() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.time()
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 429:
                raise
            pause = int(error.headers.get("Retry-After", 30 * (attempt + 1)))
            print(f"  Commons says slow down; waiting {pause}s...", file=sys.stderr)
            time.sleep(pause)
    raise RuntimeError(f"Gave up after repeated rate limits: {url}")


def strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


def load_candidates():
    if CANDIDATES_FILE.exists():
        return json.loads(CANDIDATES_FILE.read_text(encoding="utf-8"))
    return []


def save_candidates(candidates):
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    CANDIDATES_FILE.write_text(json.dumps(candidates, indent=1, ensure_ascii=False), encoding="utf-8")


def search(queries, limit):
    candidates = load_candidates()
    known = {c["title"] for c in candidates}
    for query in queries:
        params = {
            "action": "query", "format": "json", "generator": "search",
            "gsrnamespace": "6", "gsrsearch": query, "gsrlimit": str(limit),
            "prop": "imageinfo", "iiprop": "url|size|extmetadata|mime", "iiurlwidth": "960",
        }
        data = json.loads(fetch(API + "?" + urllib.parse.urlencode(params)))
        pages = sorted(data.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
        added = skipped = 0
        for page in pages:
            info = page["imageinfo"][0]
            meta = info.get("extmetadata", {})
            licence = strip_html(meta.get("LicenseShortName", {}).get("value"))
            if info.get("mime") not in ("image/jpeg", "image/png") or not ALLOWED_LICENCE.match(licence):
                skipped += 1
                continue
            if page["title"] in known:
                continue
            known.add(page["title"])
            candidates.append({
                "number": len(candidates),
                "query": query,
                "title": page["title"],
                "licence": licence,
                "licenceUrl": strip_html(meta.get("LicenseUrl", {}).get("value")) or None,
                "author": strip_html(meta.get("Artist", {}).get("value")),
                "description": strip_html(meta.get("ImageDescription", {}).get("value"))[:500],
                "size": [info["width"], info["height"]],
                "thumb": info.get("thumburl") or info["url"],
                "page": info["descriptionurl"],
            })
            added += 1
        print(f"{query}: {added} new candidates ({skipped} skipped for licence or file type)")
    save_candidates(candidates)


def sheet():
    candidates = load_candidates()
    parts = [
        "<!doctype html><meta charset='utf-8'><title>Candidates</title>",
        "<style>body{font:13px sans-serif;background:#2b2118;color:#f1e3c6;margin:16px}"
        "h2{margin:24px 0 8px}.row{display:flex;flex-wrap:wrap;gap:10px}"
        "figure{margin:0;width:220px}img{width:220px;height:165px;object-fit:contain;background:#000}"
        "figcaption{font-size:11px}a{color:#e07a2e}</style>",
    ]
    for query in dict.fromkeys(c["query"] for c in candidates):
        parts.append(f"<h2>{html.escape(query)}</h2><div class='row'>")
        for c in (c for c in candidates if c["query"] == query):
            parts.append(
                f"<figure><img loading='lazy' src='{html.escape(c['thumb'])}'>"
                f"<figcaption><b>#{c['number']}</b> {html.escape(c['title'][5:70])}<br>"
                f"{html.escape(c['licence'])} · {html.escape(c['author'][:40])}<br>"
                f"<a href='{html.escape(c['page'])}' target='_blank'>page</a> · "
                f"{html.escape(c['description'][:120])}</figcaption></figure>"
            )
        parts.append("</div>")
    out = WORK_DIR / "sheet.html"
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {out} with {len(candidates)} candidates")


def add(specimen_id, number, crop):
    from io import BytesIO
    from PIL import Image  # imported here so search/sheet work without Pillow

    candidate = next((c for c in load_candidates() if c["number"] == number), None)
    if candidate is None:
        sys.exit(f"No candidate #{number}. Run 'search' first.")

    image = Image.open(BytesIO(fetch(candidate["thumb"]))).convert("RGB")
    if crop:
        left, top, right, bottom = crop
        w, h = image.size
        image = image.crop((int(left * w), int(top * h), int(right * w), int(bottom * h)))
    if image.width > SAVED_WIDTH:
        image = image.resize((SAVED_WIDTH, round(image.height * SAVED_WIDTH / image.width)), Image.LANCZOS)

    ASSETS_DIR.mkdir(exist_ok=True)
    path = ASSETS_DIR / f"{specimen_id}.jpg"
    image.save(path, "JPEG", quality=85, optimize=True)
    print(f"Saved {path.relative_to(GAME_DIR)} ({image.width}x{image.height}, {path.stat().st_size // 1024} KB)")

    snippet = {
        "image": f"assets/{specimen_id}.jpg",
        "photo": {
            "author": candidate["author"],
            "licence": candidate["licence"],
            "licenceUrl": candidate["licenceUrl"],
            "page": candidate["page"],
        },
    }
    print("Paste into the specimen's entry in data/specimens.json:")
    lines = json.dumps(snippet, indent=2, ensure_ascii=False).splitlines()[1:-1]
    print("\n".join(line[2:] for line in lines))


def parse_crop(text):
    values = [float(v) for v in text.split(",")]
    if len(values) != 4 or not all(0 <= v <= 1 for v in values):
        raise argparse.ArgumentTypeError("crop needs four fractions between 0 and 1: left,top,right,bottom")
    return values


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)

    p_search = commands.add_parser("search", help="find openly licensed photos")
    p_search.add_argument("queries", nargs="+")
    p_search.add_argument("--limit", type=int, default=12, help="results to check per search")

    commands.add_parser("sheet", help="build a contact sheet of all candidates")

    p_add = commands.add_parser("add", help="save a candidate as a specimen photo")
    p_add.add_argument("specimen_id")
    p_add.add_argument("number", type=int, help="the candidate's # from the contact sheet")
    p_add.add_argument("--crop", type=parse_crop, help="left,top,right,bottom as fractions")

    args = parser.parse_args()
    if args.command == "search":
        search(args.queries, args.limit)
    elif args.command == "sheet":
        sheet()
    else:
        add(args.specimen_id, args.number, args.crop)


if __name__ == "__main__":
    main()
