"""Builds the site icons: the logo over the desert at dusk, like the top of the site.

- assets/icons/icon-512.png, icon-192.png: full logo (phones, app lists, big tabs)
- assets/icons/apple-touch-icon.png (180): full logo, for iPhone home screens
- assets/icons/favicon-32.png: just the trilobite, because the words can't be read that small

Needs Pillow and numpy. Run: python tools/make-icons.py
"""
import importlib.util
from pathlib import Path

from PIL import Image, ImageFilter

from desert_scene import GAME_DIR, logo, scene

OUT = GAME_DIR / "assets" / "icons"
CREAM = (255, 244, 226, 255)
OUTLINE = (43, 22, 8, 255)


def logo_icon(size, scale):
    """The desert with the horizon low down and the logo centred, `scale` x its pixel size."""
    view = size * 2.2
    art = logo(scale)
    img = scene(size, size, view, top=round(0.327 * view - 0.74 * size), shift=0.3)
    img.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return img


def trilobite_icon(size):
    spec = importlib.util.spec_from_file_location("make_logo", Path(__file__).with_name("make-logo.py"))
    make_logo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(make_logo)
    bug = make_logo.trilobite_mask(size - 6)
    pad = 3
    mask = Image.new("L", (size, size), 0)
    mask.paste(bug, ((size - bug.width) // 2, pad))
    img = scene(size, size, size * 2.2, top=round(0.327 * size * 2.2 - 0.74 * size), shift=0.3)
    img.paste(Image.new("RGBA", img.size, OUTLINE), (0, 0), mask.filter(ImageFilter.MaxFilter(3)))
    img.paste(Image.new("RGBA", img.size, CREAM), (0, 0), mask)
    return img


def main():
    OUT.mkdir(exist_ok=True)
    for name, img in [
        ("icon-512.png", logo_icon(512, 5)),
        ("icon-192.png", logo_icon(192, 2)),
        ("apple-touch-icon.png", logo_icon(180, 2)),
        ("favicon-32.png", trilobite_icon(32)),
    ]:
        img.convert("RGB").save(OUT / name, optimize=True)
        print(f"Saved assets/icons/{name} ({img.width}x{img.height})")


if __name__ == "__main__":
    main()
