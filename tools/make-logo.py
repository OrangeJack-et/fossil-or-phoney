"""Builds assets/ui/logo.png: the FOSSIL / or / PHONEY title, in the same style as
the Riddle-da-Fiddle logo.

- Letters: Pixelify Sans Bold, cream with a dark outline and a burnt-orange
  drop shadow.
- "or" sits on the scroll banner from the Quintino Pixels UI pack (CC0).
- Behind them: a pixelated trilobite silhouette, from the CC0 trilobite icon on
  SVG Repo (tools/trilobite.svg).

Everything is drawn at 1x as pixel art, then scaled up 2x with hard edges.

Needs Pillow and the Pixelify Sans font (Open Font License), which isn't stored
in this project. Download "PixelifySans[wght].ttf" from
https://github.com/google/fonts/tree/main/ofl/pixelifysans and run:
    python tools/make-logo.py path/to/PixelifySans[wght].ttf
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

GAME_DIR = Path(__file__).resolve().parent.parent
TOOLS = GAME_DIR / "tools"
OUT = GAME_DIR / "assets" / "ui" / "logo.png"

# Colours, matching the Riddle-da-Fiddle logo.
CREAM = (255, 244, 226, 255)
OUTLINE = (43, 22, 8, 255)
SHADOW = (196, 90, 16, 255)
SILHOUETTE = (98, 52, 30, 255)  # a touch lighter than Riddle's, to show on the darker background
BANNER_TEXT = (43, 22, 8, 255)

W, H = 200, 160       # canvas at 1x (roomy, so the tilted trilobite never gets clipped; trimmed at the end)
OVERLAP = 4           # how many pixels the "or" banner overlaps each word
SCALE = 2             # final size is 2x
TRILOBITE_HEIGHT = 82  # pixels tall at 1x, before tilting
TILT = -16             # degrees


# ---------- A tiny SVG path reader (enough for the trilobite icon) ----------

def svg_subpaths(d):
    """Turns an SVG path into a list of polygons (lists of points). Curves are
    flattened into short straight lines. Supports M m L l H h V v C c Z z."""
    tokens = re.findall(r"[MmLlHhVvCcZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?", d)
    polys, current = [], []
    x = y = sx = sy = 0.0
    cmd = None
    i = 0

    def num():
        nonlocal i
        value = float(tokens[i])
        i += 1
        return value

    while i < len(tokens):
        if re.fullmatch(r"[A-Za-z]", tokens[i]):
            cmd = tokens[i]
            i += 1
            if cmd in "Zz":
                if current:
                    polys.append(current)
                current = []
                x, y = sx, sy
                continue
        rel = cmd.islower()
        c = cmd.upper()
        if c == "M":
            dx, dy = num(), num()
            x, y = (x + dx, y + dy) if rel else (dx, dy)
            if current:
                polys.append(current)
            current = [(x, y)]
            sx, sy = x, y
            cmd = "l" if rel else "L"  # extra pairs after M are line-tos
        elif c == "L":
            dx, dy = num(), num()
            x, y = (x + dx, y + dy) if rel else (dx, dy)
            current.append((x, y))
        elif c == "H":
            v = num()
            x = x + v if rel else v
            current.append((x, y))
        elif c == "V":
            v = num()
            y = y + v if rel else v
            current.append((x, y))
        elif c == "C":
            pts = [num() for _ in range(6)]
            if rel:
                pts = [pts[0] + x, pts[1] + y, pts[2] + x, pts[3] + y, pts[4] + x, pts[5] + y]
            x1, y1, x2, y2, x3, y3 = pts
            for step in range(1, 17):
                t = step / 16
                mt = 1 - t
                current.append((
                    mt**3 * x + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t**3 * x3,
                    mt**3 * y + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t**3 * y3,
                ))
            x, y = x3, y3
        else:
            raise ValueError(f"Unsupported path command {cmd}")
    if current:
        polys.append(current)
    return polys


def trilobite_mask(height):
    """The trilobite icon as a 1-bit pixel silhouette, `height` pixels tall."""
    svg = (TOOLS / "trilobite.svg").read_text(encoding="utf-8")
    d = re.search(r'\sd="([^"]+)"', svg).group(1)
    big = 1024  # draw large first, so the shrink can average it into clean pixels
    k = big / 512
    mask = Image.new("L", (big, big), 0)
    for poly in svg_subpaths(d):
        layer = Image.new("L", (big, big), 0)
        ImageDraw.Draw(layer).polygon([(px * k, py * k) for px, py in poly], fill=255)
        mask = ImageChops.logical_xor(mask.convert("1"), layer.convert("1")).convert("L")  # holes cut out
    mask = mask.crop(mask.getbbox())
    width = round(mask.width * height / mask.height)
    small = mask.resize((width, height), Image.BOX)  # average, then...
    return small.point(lambda v: 255 if v >= 110 else 0)  # ...snap to on/off pixels


# ---------- Letters ----------

def text_mask(text, font):
    left, top, right, bottom = font.getbbox(text)
    img = Image.new("L", (right - left + 2, bottom - top + 2), 0)
    draw = ImageDraw.Draw(img)
    draw.fontmode = "1"  # no anti-aliasing: crisp pixels
    draw.text((-left + 1, -top + 1), text, font=font, fill=255)
    return img.crop(img.getbbox())


def shifted(mask, dx, dy):
    out = Image.new("L", mask.size, 0)
    out.paste(mask, (dx, dy))
    return out


def stamp(canvas, mask, colour, at):
    solid = Image.new("RGBA", mask.size, colour)
    canvas.paste(solid, at, mask)


def draw_word(canvas, word_mask, at):
    """Cream letters, dark outline, and an outlined burnt-orange shadow, like Riddle-da-Fiddle."""
    pad = 4
    m = Image.new("L", (word_mask.width + pad * 2, word_mask.height + pad * 2), 0)
    m.paste(word_mask, (pad, pad))
    grow = lambda mask: mask.filter(ImageFilter.MaxFilter(3))  # 1 pixel thicker
    shadow = shifted(m, 2, 2)
    x, y = at[0] - pad, at[1] - pad
    stamp(canvas, grow(shadow), OUTLINE, (x, y))
    stamp(canvas, shadow, SHADOW, (x, y))
    stamp(canvas, grow(m), OUTLINE, (x, y))
    stamp(canvas, m, CREAM, (x, y))


def banner(width):
    """Stretches the UI pack's scroll banner to `width` (a 9-slice: 6 px sides, 4 px top and bottom)."""
    src = Image.open(GAME_DIR / "assets" / "ui" / "banner.png").convert("RGBA")
    sw, sh = src.size
    side, cap = 6, 4
    out = Image.new("RGBA", (width, sh), (0, 0, 0, 0))
    middle = width - side * 2
    for y0, y1 in ((0, cap), (cap, sh - cap), (sh - cap, sh)):
        row_h = y1 - y0
        out.paste(src.crop((0, y0, side, y1)), (0, y0))
        out.paste(src.crop((side, y0, sw - side, y1)).resize((middle, row_h), Image.NEAREST), (side, y0))
        out.paste(src.crop((sw - side, y0, sw, y1)), (width - side, y0))
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    font_path = sys.argv[1]
    big_font = ImageFont.truetype(font_path, 24)
    big_font.set_variation_by_axes([700])  # bold
    small_font = ImageFont.truetype(font_path, 13)
    small_font.set_variation_by_axes([500])

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # The trilobite, tilted and centred behind everything.
    bug = trilobite_mask(TRILOBITE_HEIGHT).rotate(TILT, resample=Image.NEAREST, expand=True)
    stamp(canvas, bug, SILHOUETTE, ((W - bug.width) // 2, (H - bug.height) // 2))

    # "or" on the scroll banner, centred; FOSSIL just above it and PHONEY just
    # below, close enough that the banner overlaps both words by a few pixels.
    word = text_mask("or", small_font)
    ribbon = banner(word.width + 18)
    rx, ry = (W - ribbon.width) // 2, (H - ribbon.height) // 2
    top, bottom = text_mask("FOSSIL", big_font), text_mask("PHONEY", big_font)
    draw_word(canvas, top, ((W - top.width) // 2 - 1, ry - top.height + OVERLAP))
    draw_word(canvas, bottom, ((W - bottom.width) // 2 - 1, ry + ribbon.height - OVERLAP))
    canvas.alpha_composite(ribbon, (rx, ry))  # drawn last, so it sits on top of both words
    stamp(canvas, word, BANNER_TEXT, (rx + (ribbon.width - word.width) // 2, ry + (ribbon.height - word.height) // 2))

    canvas = canvas.crop(canvas.getbbox())
    final = canvas.resize((canvas.width * SCALE, canvas.height * SCALE), Image.NEAREST)
    final.save(OUT, optimize=True)
    print(f"Saved {OUT.relative_to(GAME_DIR)} ({final.width}x{final.height}, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
