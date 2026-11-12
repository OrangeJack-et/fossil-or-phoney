"""Builds assets/social-card.png, the preview image shown when the game's link is
shared (WhatsApp, Discord, etc.): the logo over the desert at dusk, like the top of
the site, with the cafe name above and the web address below.

Needs Pillow and numpy. Run: python tools/make-social-card.py
"""
from PIL import Image, ImageDraw, ImageFont

from desert_scene import GAME_DIR, logo, scene

W, H = 1200, 628
TEAL, LIGHT, SHADOW = (48, 225, 185, 255), (255, 244, 226, 255), (43, 22, 8, 255)

font = ImageFont.load_default_imagefont()  # a tiny bitmap font: perfect for pixel art


def pixel_text(text, colour, factor):
    """Bitmap text scaled up with hard edges, with a dark 1-pixel drop shadow."""
    left, top, right, bottom = font.getbbox(text)
    layer = Image.new("RGBA", (right + 2, bottom + 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.text((1, 1), text, font=font, fill=SHADOW)
    draw.text((0, 0), text, font=font, fill=colour)
    return layer.resize((layer.width * factor, layer.height * factor), Image.NEAREST)


view = H * 1.5
card = scene(W, H, view, top=round(0.327 * view - 0.66 * H), shift=0.3)

art = logo(4)
card.alpha_composite(art, ((W - art.width) // 2, 92))

top_text = pixel_text("INTERDIMENSIONAL GAMES CAFE", TEAL, 4)
card.alpha_composite(top_text, ((W - top_text.width) // 2, 34))
url = pixel_text("fossil.jackmarsters.com", LIGHT, 4)
card.alpha_composite(url, ((W - url.width) // 2, H - url.height - 34))

out = GAME_DIR / "assets" / "social-card.png"
card.convert("RGB").save(out, optimize=True)
print(f"Saved {out.relative_to(GAME_DIR)} ({card.width}x{card.height}, {out.stat().st_size // 1024} KB)")
