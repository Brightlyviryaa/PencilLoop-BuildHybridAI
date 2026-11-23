"""
Generate 20 synthetic "handwritten" robot plans for MANUAL accuracy checks of
the scan feature (they are not used by automated tests except sample-plan.png).

Each fixture has an expected AST in fixtures/scan/manifest.json. Images vary
handwriting font, arrows vs. words, rotation, lighting, paper tint, noise,
smudges and repeat notation. Real photos of children's paper should be added
by the tester; never commit photos that show names or faces.

Usage: python3 -I scripts/generate_scan_fixtures.py
"""
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'fixtures', 'scan')
FONTS = [
    '/System/Library/Fonts/Noteworthy.ttc',
    '/System/Library/Fonts/MarkerFelt.ttc',
    '/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf',
    '/System/Library/Fonts/Supplemental/Chalkboard.ttc',
    '/System/Library/Fonts/Supplemental/Comic Sans MS.ttf',
]

M = lambda n: {'type': 'move', 'steps': n}
L = {'type': 'turn', 'direction': 'left'}
R = {'type': 'turn', 'direction': 'right'}
REP = lambda t, c: {'type': 'repeat', 'times': t, 'commands': c}

# (id, lines-to-draw, expected commands, style, note)
CASES = [
    ('01-words-basic', ['move 3', 'turn left', 'move 3'], [M(3), L, M(3)], 'words', 'Level 1 solution in words'),
    ('02-arrows-basic', ['^3', 'L', '^3'], [M(3), L, M(3)], 'arrows', 'Arrow symbols'),
    ('03-forward-word', ['forward 2', 'turn right', 'forward 1'], [M(2), R, M(1)], 'words', 'Synonym "forward"'),
    ('04-short-LR', ['go 2', 'R', 'go 3', 'L', 'go 3', 'R', 'go 2'], [M(2), R, M(3), L, M(3), R, M(2)], 'words', 'Level 2 solution, terse'),
    ('05-repeat-bracket', ['repeat 5 [', '  move 1', '  turn left', '  move 1', '  turn right', ']'], [REP(5, [M(1), L, M(1), R])], 'words', 'Level 3 loop'),
    ('06-repeat-x', ['x3 (move 1, turn right)'], [REP(3, [M(1), R])], 'words', 'Inline xN notation'),
    ('07-numbered-list', ['1. move 2', '2. turn left', '3. move 4'], [M(2), L, M(4)], 'words', 'Numbered list'),
    ('08-arrows-noisy', ['^2', 'R', '^1'], [M(2), R, M(1)], 'arrows-noise', 'Heavy paper noise'),
    ('09-rotated', ['move 1', 'turn right', 'move 2'], [M(1), R, M(2)], 'rotate', 'Photo rotated ~12°'),
    ('10-dim-light', ['move 3', 'turn left', 'move 2'], [M(3), L, M(2)], 'dim', 'Low light gradient'),
    ('11-upper-case', ['MOVE 2', 'TURN RIGHT', 'MOVE 2'], [M(2), R, M(2)], 'words', 'Upper case'),
    ('12-missing-number', ['move', 'turn left', 'move'], [M(1), L, M(1)], 'words', 'No number means 1'),
    ('13-big-number', ['move 9', 'turn left'], [M(5), L], 'words', 'Out-of-range → clamped to 5 with warning'),
    ('14-smudged', ['move 2', '~~~~', 'turn left'], [M(2), L], 'smudge', 'Illegible middle line → needsReview'),
    ('15-crossed-out', ['move 2', '-turn right-', 'turn left', 'move 1'], [M(2), L, M(1)], 'strike', 'Crossed-out step must be skipped'),
    ('16-with-doodle', ['move 1', 'turn right', 'move 3'], [M(1), R, M(3)], 'doodle', 'Doodle (star) to ignore'),
    ('17-two-columns', ['move 1   turn left', 'move 2   turn right'], [M(1), L, M(2), R], 'words', 'Two steps per line'),
    ('18-tiny-writing', ['move 2', 'turn right', 'move 2', 'turn left', 'move 1'], [M(2), R, M(2), L, M(1)], 'tiny', 'Small handwriting'),
    ('19-blue-paper', ['^1', 'L', '^2', 'R'], [M(1), L, M(2), R], 'tinted', 'Tinted paper, arrows'),
    ('20-not-a-plan', ['shopping: apples, milk'], [], 'words', 'Not a robot plan → expect error / no steps'),
]


def draw_arrow(d, x, y, size, color, kind, rnd):
    """Hand-drawn-ish arrow glyphs: ^ (forward), L (turn left), R (turn right)."""
    j = lambda: rnd.uniform(-2.5, 2.5)
    w = max(4, size // 9)
    if kind == '^':
        d.line([(x + size * 0.3 + j(), y + size + j()), (x + size * 0.3 + j(), y + j())], fill=color, width=w)
        d.line([(x + j(), y + size * 0.35 + j()), (x + size * 0.3, y + j()), (x + size * 0.6 + j(), y + size * 0.35 + j())], fill=color, width=w, joint='curve')
        return size * 0.75
    # curved turn arrows
    cx, cy, r = x + size * 0.5, y + size * 0.6, size * 0.4
    if kind == 'L':
        d.arc([cx - r, cy - r, cx + r, cy + r], start=270, end=360 + 90 * 0, fill=color, width=w)
        d.line([(cx + r + j(), cy + j()), (cx + r + j(), cy + size * 0.4 + j())], fill=color, width=w)
        d.line([(cx - size * 0.05, cy - r - size * 0.18 + j()), (cx - size * 0.2, cy - r + j()), (cx - size * 0.05, cy - r + size * 0.18 + j())], fill=color, width=w)
    else:
        d.arc([cx - r, cy - r, cx + r, cy + r], start=180, end=270, fill=color, width=w)
        d.line([(cx - r + j(), cy + j()), (cx - r + j(), cy + size * 0.4 + j())], fill=color, width=w)
        d.line([(cx + size * 0.05, cy - r - size * 0.18 + j()), (cx + size * 0.2, cy - r + j()), (cx + size * 0.05, cy - r + size * 0.18 + j())], fill=color, width=w)
    return size


def render(case_id, lines, style, seed):
    rnd = random.Random(seed)
    W, H = 1100, 1400
    paper = (252, 250, 242) if style != 'tinted' else (226, 238, 255)
    img = Image.new('RGB', (W, H), paper)
    d = ImageDraw.Draw(img)
    # ruled lines
    for yy in range(160, H, 90):
        d.line([(60, yy), (W - 60, yy)], fill=(205, 220, 240), width=2)
    font_path = FONTS[seed % len(FONTS)]
    size = 46 if style == 'tiny' else 78
    font = ImageFont.truetype(font_path, size)
    ink = rnd.choice([(30, 35, 60), (25, 45, 120), (55, 55, 55)])
    y = 190
    for line in lines:
        x = 110 + rnd.randint(-15, 15)
        if style.startswith('arrows') and line[0] in '^LR' and len(line) <= 3:
            adv = draw_arrow(d, x, y - size * 0.15, size, ink, line[0], rnd)
            if len(line) > 1:
                d.text((x + adv + 20, y), line[1:], font=font, fill=ink)
        elif style == 'arrows' or style == 'tinted':
            if line[0] in '^LR':
                adv = draw_arrow(d, x, y - size * 0.15, size, ink, line[0], rnd)
                if len(line) > 1:
                    d.text((x + adv + 20, y), line[1:], font=font, fill=ink)
            else:
                d.text((x, y), line, font=font, fill=ink)
        elif line.startswith('~'):
            for k in range(6):
                d.line([(x + k * 40, y + 30 + rnd.randint(-20, 20)), (x + k * 40 + 60, y + 10 + rnd.randint(-20, 20))], fill=(90, 90, 100), width=18)
        elif line.startswith('-') and line.endswith('-'):
            text = line.strip('-')
            d.text((x, y), text, font=font, fill=ink)
            tw = d.textlength(text, font=font)
            d.line([(x - 10, y + size * 0.55), (x + tw + 10, y + size * 0.45)], fill=ink, width=7)
        else:
            d.text((x, y + rnd.randint(-4, 4)), line, font=font, fill=ink)
        y += int(size * 1.45) if style != 'tiny' else 90
    if style == 'doodle':
        cx, cy, r = 880, 260, 80
        pts = [(cx + r * math.cos(a) * (1 if i % 2 == 0 else 0.45), cy + r * math.sin(a) * (1 if i % 2 == 0 else 0.45)) for i, a in enumerate([k * math.pi / 5 - math.pi / 2 for k in range(10)])]
        d.polygon(pts, outline=(230, 120, 40), width=6)
    if style == 'arrows-noise':
        px = img.load()
        for _ in range(60000):
            xx, yy = rnd.randrange(W), rnd.randrange(H)
            g = rnd.randint(150, 235)
            px[xx, yy] = (g, g, g)
    if style == 'dim':
        grad = Image.linear_gradient('L').resize((W, H)).point(lambda v: int(v * 0.55))
        img = Image.composite(Image.new('RGB', (W, H), (40, 40, 50)), img, grad)
    if style == 'rotate':
        img = img.rotate(12, expand=True, fillcolor=(120, 110, 100))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    path = os.path.join(OUT, f'{case_id}.jpg')
    img.convert('RGB').save(path, quality=86)
    return path


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = []
    for i, (cid, lines, expected, style, note) in enumerate(CASES):
        render(cid, lines, style, i + 7)
        manifest.append({'file': f'{cid}.jpg', 'expected': expected, 'style': style, 'note': note})
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f'wrote {len(manifest)} fixtures to {os.path.normpath(OUT)}')


if __name__ == '__main__':
    main()
