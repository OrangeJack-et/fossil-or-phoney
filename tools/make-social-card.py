"""Builds assets/social-card.png, the preview image shown when the game's link is shared.

Everything is drawn at a quarter size, then scaled up 4x with hard edges, so the
text and photo come out as chunky pixel art. Run: python tools/make-social-card.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

GAME_DIR = Path(__file__).resolve().parent.parent
SCALE = 4
W, H = 300, 157  # x4 = 1200 x 628
BG, PANEL, EDGE, INK, LIGHT, ACCENT, TEAL = "#2e222f", "#ffce9b", "#b57952", "#3b2410", "#fff4e2", "#ce3535", "#30e1b9"

font = ImageFont.load_default_imagefont()  # a tiny bitmap font: perfect for pixel art


def big_text(text, colour, factor):
    """Draws text with the bitmap font, then scales it up with hard edges."""
    left, top, right, bottom = font.getbbox(text)
    layer = Image.new("RGBA", (right + 1, bottom + 1), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((0, 0), text, font=font, fill=colour)
    return layer.resize((layer.width * factor, layer.height * factor), Image.NEAREST)


card = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(card)

# Photo panel on the left: a pixelated ammonite.
draw.rectangle([10, 22, 116, 128], fill="#125458")
photo = Image.open(GAME_DIR / "assets" / "ammonite-dactylioceras.jpg").convert("RGB")
side = min(photo.size)
photo = photo.crop(((photo.width - side) // 2, (photo.height - side) // 2,
                    (photo.width + side) // 2, (photo.height + side) // 2)).resize((100, 100), Image.LANCZOS)
card.paste(photo, (13, 25))

# Title and tagline on the right.
x = 130
card.paste(big_text("INTERDIMENSIONAL GAMES CAFE", TEAL, 1), (x, 24), big_text("INTERDIMENSIONAL GAMES CAFE", TEAL, 1))
for i, (word, colour) in enumerate([("FOSSIL", LIGHT), ("OR", LIGHT), ("PHONEY?", ACCENT)]):
    layer = big_text(word, colour, 3)
    card.paste(layer, (x, 38 + i * 26), layer)
tagline = big_text("A daily guessing game", PANEL, 1)
card.paste(tagline, (x, 120), tagline)
url = big_text("fossil.jackmarsters.com", EDGE, 1)
card.paste(url, (x, 134), url)

card = card.resize((W * SCALE, H * SCALE), Image.NEAREST)
out = GAME_DIR / "assets" / "social-card.png"
card.save(out, optimize=True)
print(f"Saved {out.relative_to(GAME_DIR)} ({card.width}x{card.height}, {out.stat().st_size // 1024} KB)")
