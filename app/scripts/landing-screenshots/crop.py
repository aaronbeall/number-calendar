"""Crops raw captures into the light and dark .webp screenshots used by the landing page.

Each entry: name -> (raw capture, crop box in raw pixels or None for the whole image, max width).
Raw desktop captures are 2x a 1000px (or 1280px) viewport; phone captures are 3x a 390px viewport.
"""
from PIL import Image
import glob
import os

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '../../src/assets/landing')
os.makedirs(out, exist_ok=True)

crops = {
    # Hero
    'calendar': ('d-pnl', (0, 0, 2000, 1920), 1600),
    'phone-calendar': ('m-pnl', None, 585),
    # One week each: higher is better vs lower is better
    'week-pnl': ('d-pnl', (0, 1490, 2000, 1915), 1200),
    'week-weight': ('d-weight', (0, 1030, 2000, 1475), 1200),
    'm-week-pnl': ('m-pnl-full', (0, 1530, 1170, 2075), 780),
    'm-week-weight': ('m-weight-full', (0, 975, 1170, 1520), 780),
    # Day editor: entries and that day's stats
    'entry': ('d-panel', (1236, 180, 2000, 1395), 760),
    # Celebrating wins
    'celebrate': ('d-celebrate', (300, 390, 2260, 1580), 1400),
    'm-celebrate': ('m-celebrate', (0, 660, 1170, 2460), 780),
    'targets': ('d-targets', (50, 630, 1950, 1145), 1200),
    # Analysis
    'an-projections': ('d-an-projections', None, 1200),
    'an-deviation': ('d-an-monthly-deviation', None, 1000),
    'an-momentum': ('d-an-momentum-quadrant', None, 1000),
    'm-an-projections': ('m-an-projections', (0, 0, 1074, 1490), 780),
    'm-an-momentum': ('m-an-momentum-quadrant', None, 780),
}

# Remove crops that are no longer listed, so the folder matches this file.
for f in glob.glob(f'{out}/*.webp'):
    base = os.path.basename(f).rsplit('-', 1)[0]
    if base not in crops:
        os.remove(f)

total = 0
for theme in ['light', 'dark']:
    for name, (src, box, width) in crops.items():
        im = Image.open(f'{here}/raw/{theme}-{src}.png').convert('RGB')
        if box:
            im = im.crop(box)
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        path = f'{out}/{name}-{theme}.webp'
        im.save(path, 'WEBP', quality=80, method=6)
        total += os.path.getsize(path)
print(total // 1024, 'KB')
