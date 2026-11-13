#!/usr/bin/env python3
"""Turn a generated original into a game-ready file (called by tools/art.mjs).

  post.py <src> <dst> cover <w> <h> [top]   crop to fill w x h (top: keep the top of the picture, for a face), then save
  post.py <src> <dst> tile <size>          make the picture repeat without a seam, then save at size x size
  post.py <src> <dst> inner <w> <h> <f>     the middle fraction f of the picture, cropped to fill w x h
  post.py <src> <dst> flip                  the same picture turned the other way
  post.py <src> <dst> fit <w> <h>           scale to fit inside w x h

The format is taken from the name of <dst>: .webp (quality 82) or .jpg (quality 88).
"""
import sys
from PIL import Image, ImageChops


def save(im, dst):
    im = im.convert('RGB')
    if dst.endswith('.webp'):
        im.save(dst, 'WEBP', quality=82, method=6)
    else:
        im.save(dst, 'JPEG', quality=88, optimize=True)


def cover(im, w, h, top=False):
    sw, sh = im.size
    k = max(w / sw, h / sh)
    im = im.resize((max(w, round(sw * k)), max(h, round(sh * k))), Image.LANCZOS)
    x = (im.size[0] - w) // 2
    y = 0 if top else (im.size[1] - h) // 2
    return im.crop((x, y, x + w, y + h))


def ramp(n, edge):
    """0 at both ends of a line of n pixels, rising to 255 over `edge` pixels."""
    return bytes(min(255, round(255 * min(i, n - 1 - i) / edge)) for i in range(n))


def tile(im, size):
    """The picture, shifted by half, is seamless at its edges and has its seams through the middle; the picture itself
    is seamless through the middle. Take the middle of one and the edges of the other."""
    im = cover(im, size * 2, size * 2).convert('RGB')
    w, h = im.size
    shifted = ImageChops.offset(im, w // 2, h // 2)
    edge = w // 5
    mx = Image.frombytes('L', (w, 1), ramp(w, edge)).resize((w, h))
    my = Image.frombytes('L', (1, h), ramp(h, edge)).resize((w, h))
    mask = ImageChops.darker(mx, my)  # 255 in the middle, 0 along every edge
    return Image.composite(im, shifted, mask).resize((size, size), Image.LANCZOS)


def main():
    src, dst, mode, *a = sys.argv[1:]
    im = Image.open(src)
    if mode == 'cover':
        im = cover(im, int(a[0]), int(a[1]), len(a) > 2 and a[2] == 'top')
    elif mode == 'tile':
        im = tile(im, int(a[0]))
    elif mode == 'inner':  # the middle of the picture only (a sheet whose edges curl), then crop to fill
        f = float(a[2]); sw, sh = im.size
        im = im.crop((round(sw * (1 - f) / 2), round(sh * (1 - f) / 2), round(sw * (1 + f) / 2), round(sh * (1 + f) / 2)))
        im = cover(im, int(a[0]), int(a[1]))
    elif mode == 'flip':  # the same picture turned the other way
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    elif mode == 'fit':
        im.thumbnail((int(a[0]), int(a[1])), Image.LANCZOS)
    else:
        raise SystemExit('unknown mode ' + mode)
    save(im, dst)


main()
