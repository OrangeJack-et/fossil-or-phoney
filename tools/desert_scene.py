"""The site's desert background (dusk sky, 4 rocky layers, vignette) as a still image,
matching #desert in css/style.css. Used by make-icons.py and make-social-card.py.
"""
from pathlib import Path

import numpy as np
from PIL import Image

GAME_DIR = Path(__file__).resolve().parent.parent
LAYERS = ["rocky-far-mountains", "rocky-nowater-far", "rocky-nowater-mid", "rocky-nowater-close"]
# The sky gradient from the CSS: (position as a fraction of the screen height, colour).
SKY = [(0.00, "#2e222f"), (0.14, "#3e2a4a"), (0.26, "#6b3450"), (0.36, "#b5543f"), (0.44, "#e08a4f")]


def _rgb(hex_colour):
    return [int(hex_colour[i:i + 2], 16) for i in (1, 3, 5)]


def scene(width, height, view_height, top=0, shift=0):
    """A width x height picture of the desert. view_height is the screen height the
    CSS would lay it out for (bigger = bigger rocks); `top` is how far down that
    screen the picture starts (it can be negative: more sky); `shift` slides the
    rocks sideways, as a fraction of a tile."""
    ys = (np.arange(height) + top) / view_height
    stops = [p for p, _ in SKY]
    sky = np.stack([np.interp(ys, stops, [_rgb(c)[k] for _, c in SKY]) for k in range(3)], axis=1)
    img = Image.fromarray(np.repeat(sky[:, None, :], width, axis=1).astype(np.uint8), "RGB").convert("RGBA")

    # Layers: top at 12% of the screen, 106% of the screen tall, repeating sideways.
    layer_top = round(0.12 * view_height - top)
    tile = round(1.06 * view_height)
    for i, name in enumerate(LAYERS):
        src = Image.open(GAME_DIR / "assets" / "bg" / f"{name}.png").convert("RGBA")
        src = src.resize((tile, tile), Image.LANCZOS)
        strip = Image.new("RGBA", (width + tile * 2, tile), (0, 0, 0, 0))
        for k in range(strip.width // tile + 1):
            strip.alpha_composite(src, (k * tile, 0)) if (k + 1) * tile <= strip.width else None
        x0 = round(tile * ((shift * (i + 1)) % 1))  # nearer layers slide further, like the drift
        strip = strip.crop((x0, max(0, -layer_top), x0 + width, tile))
        img.alpha_composite(strip, (0, max(0, layer_top)))

    # Vignette: darker towards the corners.
    yy, xx = np.mgrid[0:height, 0:width]
    d = np.sqrt(((xx - width / 2) / (width / 2)) ** 2 + ((yy - height / 2) / (height / 2)) ** 2) / np.sqrt(2)
    alpha = np.interp(d, [0, 0.4, 1], [0.05, 0.05, 0.55])
    shade = np.zeros((height, width, 4), np.uint8)
    shade[..., 0], shade[..., 1], shade[..., 2] = 20, 8, 12
    shade[..., 3] = (alpha * 255).astype(np.uint8)
    img.alpha_composite(Image.fromarray(shade, "RGBA"))
    return img


def logo(scale):
    """The title logo at `scale` times its 1x pixel-art size, with hard edges."""
    art = Image.open(GAME_DIR / "assets" / "ui" / "logo.png").convert("RGBA")
    art = art.resize((art.width // 2, art.height // 2), Image.NEAREST)  # logo.png is stored at 2x
    return art.resize((art.width * scale, art.height * scale), Image.NEAREST)
