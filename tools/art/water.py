#!/usr/bin/env python3
"""The water's ripples, made rather than painted (free; no picture is generated for these).

Writes public/art/world/water_a.jpg and water_b.jpg: tangent-space normal maps of wind-driven water, each one seamless
tile. They come from a wave spectrum (the shape real wind seas have: long waves strong, short waves weak, most of them
running with the wind), summed with an inverse FFT, so they tile exactly and look like water rather than a pattern.
  water_a  the longer ripples, running with the wind (+x), a tile is ~24 m of sea in the game
  water_b  fine chop running every way, a tile is ~6 m
The red and green channels are the surface's slope across and along (0.5 is level), blue is the up part.

  python3 tools/art/water.py [repo root]
"""
import os, sys
import numpy as np
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = os.path.join(ROOT, 'public/art/world')


def sea(n, kmin, kmax, spread, power, seed, slope):
    """A height field from a directional spectrum on an n x n torus, as a normal map."""
    rng = np.random.default_rng(seed)
    k = np.fft.fftfreq(n) * n                      # integer wave numbers: every wave fits the tile a whole number of times
    kx, ky = np.meshgrid(k, k)
    kk = np.hypot(kx, ky)
    kk[0, 0] = 1
    band = ((kk >= kmin) & (kk <= kmax)).astype(np.float64)
    soft = np.clip((kk - kmin) / (kmin * 0.5), 0, 1) * np.clip((kmax - kk) / (kmax * 0.25), 0, 1)
    ang = np.arctan2(ky, kx)
    dirf = np.abs(np.cos(ang)) ** spread if spread > 0 else 1.0   # waves running with the wind (and against it, a little)
    amp = band * soft * dirf * kk ** (-power)
    spec = amp * np.exp(2j * np.pi * rng.random((n, n))) * (rng.normal(1.0, 0.25, (n, n)))
    # slopes: d/dx of exp(i k x) is i k
    sx = np.real(np.fft.ifft2(spec * 1j * kx))
    sy = np.real(np.fft.ifft2(spec * 1j * ky))
    s = np.sqrt((sx ** 2 + sy ** 2).mean())
    sx, sy = sx / s * slope, sy / s * slope
    nz = 1.0 / np.sqrt(1 + sx ** 2 + sy ** 2)
    nx, ny = -sx * nz, -sy * nz
    rgb = np.stack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz * 0.5 + 0.5], axis=2)
    return Image.fromarray((rgb * 255).clip(0, 255).round().astype(np.uint8))


os.makedirs(OUT, exist_ok=True)
sea(512, 3, 60, 1.2, 1.6, 7, 0.32).save(os.path.join(OUT, 'water_a.jpg'), quality=94)
sea(512, 8, 150, 0.0, 1.35, 11, 0.26).save(os.path.join(OUT, 'water_b.jpg'), quality=94)
print('water_a.jpg, water_b.jpg written to', OUT)
