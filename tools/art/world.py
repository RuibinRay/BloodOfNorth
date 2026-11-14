#!/usr/bin/env python3
"""Work the generated originals into the textures the 3D world uses (called by tools/art.mjs; free).

Reads assets/generated/<id>.png and writes public/art/world/:
  ground_grass.jpg, ground_sand.jpg, ground_rock.jpg   seamless, with their average colour taken out, so the ground's own
                                                       painted colour decides the hue and these add the grain (x2 in the shader)
  foam.jpg                                             seamless white-on-black sea foam, as a mask
  pine.webp     [bark | skirt of boughs]               one picture for a pine: bark down the left quarter, and a skirt whose
                                                       top is solid needles and whose bottom edge is cut-out hanging boughs
  birch.webp    [bark | leaves | twigs]                bark, a solid mass of leaves, and a cut-out spray of twigs
  figure.jpg    wool fur mail / plain hair leather     six squares of grain for the figures (grey, to multiply their colours),
                                                       each one repeat with a border of itself round it
  beast.jpg, gear.jpg                                  the same kind of sheet as figure.jpg, for animals and for weapons and tools
  hull.jpg, sail.jpg, shields.jpg                      a strake of a ship's hull, her sail, four round shields (see ships())
  door.jpg, carved.jpg                                 a longhouse door; carved timber for door posts, gables and stem posts
A piece whose original is missing is skipped, and the game falls back to what it drew before.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
SRC, OUT = os.path.join(ROOT, 'assets/generated'), os.path.join(ROOT, 'public/art/world')


def src(name):
    for ext in ('.png', '.jpg', '.jpeg', '.webp'):
        p = os.path.join(SRC, name + ext)
        if os.path.exists(p):
            return Image.open(p).convert('RGB')
    return None


def tile(im, size):
    """Seamless: the middle of the picture over a copy shifted by half, which has the seams in its middle."""
    w = size * 2
    a = np.asarray(im.resize((w, w), Image.LANCZOS), dtype=np.float32)
    b = np.roll(a, (w // 2, w // 2), axis=(0, 1))
    r = np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w / 5.0)
    m = np.clip(np.minimum.outer(r, r), 0, 1)[..., None]
    out = a * m + b * (1 - m)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)


def grain(im, mean=128.0, gray=False, gain=1.0, hue=0.35):
    """Take the average colour out: what is left says how much lighter or darker (and a little warmer or cooler) each
    spot is. hue: how much of the colour difference is kept; the rest is plain light and dark."""
    a = np.asarray(im, dtype=np.float32)
    g = a.mean(axis=2, keepdims=True).repeat(3, axis=2)
    a = g if gray else g + (a - g) * hue
    avg = a.reshape(-1, 3).mean(axis=0)
    a = ((a / avg - 1.0) * gain + 1.0) * mean
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def cutout(im, lo=150, hi=235):
    """A thing photographed on white: opaque where it is, clear where the white was, and the thing's own colour bled
    under the clear part so that no white fringe shows when the picture is drawn small."""
    a = np.asarray(im, dtype=np.float32)
    whiteness = a.min(axis=2)                       # white is the only thing bright in every channel
    alpha = np.clip((hi - whiteness) / (hi - lo), 0, 1)
    al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))  # pull the edge in a pixel
    alpha = np.asarray(al, dtype=np.float32) / 255
    solid = alpha > 0.6
    avg = a[solid].mean(axis=0) if solid.any() else np.array([60, 80, 50], dtype=np.float32)
    rgb = a * alpha[..., None] + avg * (1 - alpha[..., None])
    return Image.fromarray(np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')


def level(im, target):
    """Bring a picture's average brightness to a target, so every tree starts from the same green. A cut-out keeps
    its edge, and only what is solid is measured."""
    if im.mode == 'RGBA':
        a = np.asarray(im, dtype=np.float32)
        solid = a[..., 3] > 150
        k = target / max(1.0, a[..., :3][solid].mean() if solid.any() else a[..., :3].mean())
        a[..., :3] = (a[..., :3] * k).clip(0, 255)
        return Image.fromarray(a.astype(np.uint8), 'RGBA')
    a = np.asarray(im.convert('RGB'), dtype=np.float32)
    k = target / max(1.0, a.mean())
    return Image.fromarray((a * k).clip(0, 255).astype(np.uint8))


def save(im, name, q=88):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    if name.endswith('.webp'):
        im.save(p, 'WEBP', quality=q, method=6)
    else:
        im.convert('RGB').save(p, 'JPEG', quality=q, optimize=True)


def ground():
    for name, out, gain in (('w_grass', 'ground_grass.jpg', 1.0), ('w_sand', 'ground_sand.jpg', 2.2), ('w_rock', 'ground_rock.jpg', 1.0),  # the sand came out as soft dunes: more grain
                            ('w_dirt', 'ground_dirt.jpg', 1.3), ('w_forest', 'ground_forest.jpg', 1.0), ('w_snow', 'ground_snow.jpg', 1.6), ('w_cliff', 'ground_cliff.jpg', 1.1)):
        im = src(name)
        if im:
            save(grain(tile(im, 512), gain=gain), out)
    im = src('w_lace') or src('w_foam')  # the finer foam of the graphics pass, else the first one
    if im:
        a = np.asarray(tile(im, 512).convert('L'), dtype=np.float32)
        a = np.clip((a - 40) / 170, 0, 1) * 255   # black stays black, foam goes to white
        save(Image.fromarray(a.astype(np.uint8)).convert('RGB'), 'foam.jpg', 85)


def pine():
    bark, needles, bough = src('w_bark_pine'), src('w_needles'), src('w_bough')
    if not (bark and needles and bough):
        return
    W, H, BW = 1024, 512, 256
    at = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    b = level(tile(bark, 256), 105).convert('RGBA')
    for y in (0, 256):
        at.paste(b, (0, y))
    # the skirt: solid needles down to a little past half way, then hanging boughs, cut out
    RW = W - BW
    n = level(tile(needles, 256), 78).convert('RGBA')
    skirt = Image.new('RGBA', (RW, H), (0, 0, 0, 0))
    for x in range(0, RW, 256):
        for y in (0, 256):
            skirt.paste(n, (x, y))
    a = np.asarray(skirt).copy()
    fade = np.clip((330 - np.arange(H)) / 60.0, 0, 1)   # solid above 270, gone by 330
    a[..., 3] = (a[..., 3] * fade[:, None]).astype(np.uint8)
    skirt = Image.fromarray(a, 'RGBA')
    cut = level(cutout(bough), 92)
    bw, bh = 200, 300
    cut = cut.resize((bw, bh), Image.LANCZOS)
    rng = np.random.default_rng(7)
    for row, (top, count) in enumerate(((120, 6), (205, 6))):
        for i in range(count):
            x = int((i + (0.5 if row else 0)) * RW / count + rng.integers(-14, 15)) - bw // 2
            piece = cut.resize((int(bw * rng.uniform(0.85, 1.1)), int(bh * rng.uniform(0.9, 1.05))), Image.LANCZOS)
            if rng.random() < 0.5:
                piece = piece.transpose(Image.FLIP_LEFT_RIGHT)
            for dx in (0, RW, -RW):                    # wrap round the skirt, so its two ends meet
                if -piece.size[0] < x + dx < RW:
                    layer = Image.new('RGBA', (RW, H), (0, 0, 0, 0)); layer.paste(piece, (x + dx, top)); skirt.alpha_composite(layer)
    at.paste(skirt, (BW, 0))
    save(at, 'pine.webp', 90)


def birch():
    bark, leaves, twig = src('w_bark_birch'), src('w_leaves'), src('w_twig')
    if not (bark and leaves and twig):
        return
    W, H = 1024, 512
    at = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    b = level(tile(bark, 256), 190).convert('RGBA')
    for y in (0, 256):
        at.paste(b, (0, y))
    lv = level(tile(leaves, 384), 135).convert('RGBA')
    at.paste(lv.resize((384, 512), Image.LANCZOS), (256, 0))
    at.paste(level(cutout(twig, lo=165, hi=240), 150).resize((384, 512), Image.LANCZOS), (640, 0))
    save(at, 'birch.webp', 90)


def repeatable(im, size, fine=0):
    """One repeat of a stuff, for things with a pattern or a lie to them (a weave, rings, strands), which the plain
    tile() above smears or cuts across. Along each side it finds how far along the picture best matches its own
    start (so a weave is cut on a whole number of threads), and fades the start into what follows that cut.
    fine: take out light and dark broader than this many pixels (of 512), leaving the fine marks."""
    a = np.asarray(im.convert('L').resize((512, 512), Image.LANCZOS), dtype=np.float32)
    if fine:
        a = a - np.asarray(Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(fine)), dtype=np.float32) + a.mean()
    o = 64
    for axis in (0, 1):
        a = np.moveaxis(a, axis, 0)
        s = min(range(330, 512 - o + 1), key=lambda k: float(np.abs(a[:o] - a[k:k + o]).mean()))
        w = ((np.arange(o) + 0.5) / o)[:, None]
        out = a[:s].copy()
        out[:o] = a[:o] * w + a[s:s + o] * (1 - w)
        a = np.moveaxis(out, 0, axis)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((size, size), Image.LANCZOS).convert('RGB')


def band(im):
    """The tallest strip of a picture between two dark gaps that run across it (one board of a planked wall, one bar
    of a stack of steel), as a picture of its own."""
    a = np.asarray(im.convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
    smooth = np.convolve(a.mean(axis=(1, 2)), np.ones(5) / 5, mode='same')
    seams = [y for y in range(8, 1016) if smooth[y] == smooth[y - 8:y + 9].min() and smooth[y] < np.median(smooth) * 0.8]
    seams = [0] + [y for i, y in enumerate(seams) if i == 0 or y - seams[i - 1] > 20] + [1023]
    _, top, bot = max((b - t, t, b) for t, b in zip(seams, seams[1:]))
    return Image.fromarray(a[top + 5:bot - 4].clip(0, 255).astype(np.uint8))


def sheet(out, cells, gains, fine=None, pre=None):
    """Six squares, each holding one repeat of its stuff 224 pixels across with the repeat carried on into a 16-pixel
    border, so the game can lay any number of repeats over a sleeve, a flank or a blade out of one picture without a
    seam. Each square is grey and averages the same in light, so that it can lighten as well as darken whatever colour
    the game gives the thing. cells: six names of originals, None for a plain square (the first of the bottom row is
    always plain: it is what a piece gets if it says nothing)."""
    if not all(src(c) for c in cells if c):
        return
    at = Image.new('RGB', (768, 512), (205, 205, 205))
    to_lin = lambda v: np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    to_srgb = lambda v: np.where(v <= 0.0031308, v * 12.92, 1.055 * v ** (1 / 2.4) - 0.055)
    flat = float(to_lin(np.float32(205 / 255.0)))   # what the game divides by
    for i, c in enumerate(cells):
        if not c:
            continue
        im = (pre or {}).get(c, lambda x: x)(src(c))
        t = grain(repeatable(im, 224, fine=(fine or {}).get(c, 0)), mean=205.0, gray=True, gain=gains.get(c, 1.0))
        lin = to_lin(np.asarray(t, dtype=np.float32) / 255.0)
        t = Image.fromarray((to_srgb((lin * (flat / lin.mean())).clip(0, 1)) * 255).round().astype(np.uint8))
        cell = Image.new('RGB', (256, 256))
        for x in (-208, 16, 240):
            for y in (-208, 16, 240):
                cell.paste(t, (x, y))
        at.paste(cell, ((i % 3) * 256, (i // 3) * 256))
    save(at, out, 92)


def figure():
    """figure.jpg: what people wear. wool fur mail / plain hair leather."""
    sheet('figure.jpg', ['c_wool', 'c_fur', 'c_mail', None, 'c_hair', 'c_leather'],
          {'c_wool': 0.55, 'c_fur': 0.85, 'c_mail': 0.75, 'c_leather': 1.7, 'c_hair': 0.9}, fine={'c_leather': 14})


def beasts():
    """beast.jpg: what animals are covered in. pelt coat feather / plain mane fleece."""
    sheet('beast.jpg', ['c_fur', 'a_coat', 'a_feather', None, 'c_hair', 'a_fleece'],
          {'c_fur': 1.1, 'a_coat': 3.2, 'a_feather': 1.0, 'c_hair': 1.0, 'a_fleece': 0.9}, fine={'a_fleece': 30})


def gear():
    """gear.jpg: what weapons and tools are made of. wood wrap steel / plain plain plain. The steel is one bar of the
    picture (it came as a stack of them)."""
    sheet('gear.jpg', ['g_wood', 'g_wrap', 'g_steel', None, None, None],
          {'g_wood': 1.6, 'g_wrap': 0.45, 'g_steel': 0.9}, fine={'g_steel': 40}, pre={'g_steel': band})


def ships():
    """hull.jpg: one strake of a clinker hull, to be laid once on every strake the game builds: a single board of the
    planking picture, the shadow of the strake above along its top, a row of rivet heads along its bottom.
    sail.jpg: the sail without its ragged edges. shields.jpg: four round shields, two by two, each filling its square."""
    im = src('s_hull')
    if im:
        a = np.asarray(im.resize((1024, 1024), Image.LANCZOS), dtype=np.float32)
        rows = a.mean(axis=(1, 2))
        smooth = np.convolve(rows, np.ones(5) / 5, mode='same')
        seams = [y for y in range(8, 1016) if smooth[y] == smooth[y - 8:y + 9].min() and smooth[y] < np.median(smooth) * 0.8]
        seams = [y for i, y in enumerate(seams) if i == 0 or y - seams[i - 1] > 20]
        gaps = sorted(((b - t, t, b) for t, b in zip(seams, seams[1:])), reverse=True)
        _, top, bot = gaps[0] if gaps else (0, 300, 380)
        band = a[top + 4:bot - 3]                                  # one board, clear of the gaps above and below it
        o = 160                                                   # make it meet itself end to end
        w = ((np.arange(o) + 0.5) / o)[None, :, None]
        band = np.concatenate([band[:, :o] * w + band[:, 1024 - o:] * (1 - w), band[:, o:1024 - o]], axis=1)
        t = np.asarray(Image.fromarray(band.clip(0, 255).astype(np.uint8)).resize((512, 128), Image.LANCZOS), dtype=np.float32)
        t *= 62.0 / t.mean()                                      # tarred, but not so black that the grain is lost
        t = np.where(t > 80, 80 + (t - 80) * 0.22, t)             # a pale knot would be seen again on every strake: quieten it
        y = np.arange(128)[:, None, None]
        t *= 1.0 - 0.62 * np.clip((16 - y) / 16.0, 0, 1) ** 1.5    # the shadow under the lap of the strake above
        t *= 1.0 + 0.22 * np.clip((y - 119) / 9.0, 0, 1)          # the worn lower edge
        yy, xx = np.mgrid[0:128, 0:512]
        for cx in range(16, 512, 32):                             # rivets: a dark ring, an iron head, a point of light
            d = np.hypot(xx - cx, yy - 108)
            t = np.where((d < 5.2)[..., None], t * 0.55, t)
            t = np.where((d < 3.6)[..., None], np.array([92, 88, 84], dtype=np.float32), t)
            t = np.where((np.hypot(xx - cx + 1, yy - 107) < 1.3)[..., None], np.array([150, 146, 140], dtype=np.float32), t)
        save(Image.fromarray(t.clip(0, 255).astype(np.uint8)), 'hull.jpg', 90)
    im = src('s_sail')
    if im:
        w, h = im.size
        save(im.crop((int(w * 0.07), int(h * 0.06), int(w * 0.93), int(h * 0.94))).resize((512, 512), Image.LANCZOS), 'sail.jpg', 88)
    cells = [src('s_shield_%d' % i) for i in (1, 2, 3, 4)]
    if all(cells):
        at = Image.new('RGB', (512, 512))
        for i, im in enumerate(cells):
            a = np.asarray(im, dtype=np.float32)
            solid = a.min(axis=2) < 225                           # not the white it lies on
            ys, xs = np.where(solid)
            cx, cy, r = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, max(xs.max() - xs.min(), ys.max() - ys.min()) / 2
            c = im.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r))).resize((256, 256), Image.LANCZOS)
            ca = np.asarray(c, dtype=np.float32)
            yy, xx = np.mgrid[0:256, 0:256]
            d = np.hypot(xx - 127.5, yy - 127.5)
            rim = ca[(d > 116) & (d < 124)].mean(axis=0)          # outside the circle, more of its own rim: nothing white to creep in
            ca = np.where((d > 124)[..., None], rim, ca)
            at.paste(Image.fromarray(ca.clip(0, 255).astype(np.uint8)), ((i % 2) * 256, (i // 2) * 256))
        save(at, 'shields.jpg', 90)


def buildings():
    """door.jpg: the door alone, out of its frame. carved.jpg: carved timber that repeats. banners.jpg: two banners."""
    im = src('b_door')
    if im:
        w, h = im.size
        save(im.crop((int(w * 0.075), int(h * 0.095), int(w * 0.925), int(h * 0.965))).resize((384, 512), Image.LANCZOS), 'door.jpg', 88)
    im = src('b_carved')
    if im:
        save(level(im.resize((512, 512), Image.LANCZOS), 70), 'carved.jpg', 88)
    pair = [src('b_banner_raven'), src('b_banner_wolf')]
    if all(pair):                                                  # banners.jpg: the crowned raven and the wolf, side by side
        at = Image.new('RGB', (512, 384))
        for i, im in enumerate(pair):
            w, h = im.size
            at.paste(im.crop((int(w * 0.045), int(h * 0.045), int(w * 0.955), int(h * 0.935))).resize((256, 384), Image.LANCZOS), (i * 256, 0))
        save(at, 'banners.jpg', 88)


for f in (ground, pine, birch, figure, beasts, gear, ships, buildings):
    f()
