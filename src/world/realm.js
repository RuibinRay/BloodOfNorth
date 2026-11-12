// The great islands of the story (GREAT in layout.js): Jarnøy, Solvik, Svartøy, Myrholm and Skalløy. Each has a
// heightfield patch of its own out in the open sea beyond the home waters, so an island can be as large as the
// chapters set on it need. heightAt() in terrain.js asks realmAt() for anything outside the valley and the chart.
import * as THREE from 'three';
import { fbm, noise2, smoothstep, lerp, distToPolyline } from '../core/util.js';
import { GREAT } from './layout.js';
import { patch, TEX } from './geo.js';

const C = 5, SEA = -13, DEEP = [58, 70, 76];

for (const s of GREAT) {
  s.ca = Math.cos(s.a || 0); s.sa = Math.sin(s.a || 0);
  s.half = Math.ceil((s.r * (s.k || 1) * 1.22) / C) * C; // half the side of its square patch
  s.n = (2 * s.half) / C; s.x0 = s.x - s.half; s.z0 = s.z - s.half;
  s.H = new Float32Array((s.n + 1) * (s.n + 1));
}

/** The shape of one island: a stretched, turned, wobbly-edged shelf with bays bitten out of it, hills, level
 *  ground where the story needs it, ravines and channels, a beach and shallows. */
function rawAt(s, x, z) {
  const dx = x - s.x, dz = z - s.z;
  const u = (dx * s.ca + dz * s.sa) / (s.k || 1), v = -dx * s.sa + dz * s.ca;
  let d = Math.hypot(u, v) * (1 + 0.2 * fbm(x * 0.0055 + s.x * 0.013, z * 0.0055 - s.z * 0.013, 3));
  for (const b of s.bays || []) { const bd = Math.hypot(dx - b[0], dz - b[1]); if (bd < b[2]) d = Math.max(d, s.r * (0.8 + 0.27 * (1 - bd / b[2]))); }
  if (d >= s.r) return SEA;
  let top = s.h + fbm(x * 0.012 + s.x, z * 0.012 - s.z, 3) * s.rough + fbm(x * 0.05, z * 0.05, 2) * 0.3;
  for (const p of s.hills || []) top += p[2] * (1 - smoothstep(0, p[3], Math.hypot(dx - p[0], dz - p[1])));
  if (s.marsh) { // reed flats a hand above the water, shallows a man can wade, and pools he cannot
    const n = fbm(x * 0.021 + 5, z * 0.021 - 9, 3);
    top += n * 0.8;
    if (n < -0.16) top = Math.min(top, -0.22 - (-0.16 - n) * 2.2);
    top = Math.max(top, -0.68); // every pool can be waded; only the channels need a boat or a bridge
  }
  for (const c of s.cuts || []) { const cd = distToPolyline(dx, dz, c.pts); if (cd < c.w) top = Math.min(top, lerp(c.y, top, smoothstep(c.w * 0.4, c.w, cd))); }
  if (s.marsh) for (const r of s.roads || []) { const rd = distToPolyline(dx, dz, r); if (rd < 6) top = Math.max(top, lerp(0.5, top, smoothstep(2.5, 6, rd))); } // causeways
  for (const f of s.flats || []) { const fd = Math.hypot(dx - f[0], dz - f[1]); if (fd < f[2]) top = lerp(f[3], top, smoothstep(f[2] * 0.62, f[2], fd)); }
  const land = lerp(top, -2.2, smoothstep(s.r * 0.8, s.r * 0.93, d));
  return lerp(land, SEA, smoothstep(s.r * 0.93, s.r, d));
}

export function buildRealmHeights() {
  for (const s of GREAT) for (let j = 0; j <= s.n; j++) for (let i = 0; i <= s.n; i++) {
    const edge = i === 0 || j === 0 || i === s.n || j === s.n;
    s.H[j * (s.n + 1) + i] = edge ? SEA : rawAt(s, s.x0 + i * C, s.z0 + j * C);
  }
}
/** Height on a great island's grid, or the open sea floor. */
export function realmAt(x, z) {
  for (const s of GREAT) {
    const fx = (x - s.x0) / C, fz = (z - s.z0) / C;
    if (fx < 0 || fz < 0 || fx >= s.n || fz >= s.n) continue;
    const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * (s.n + 1) + ix, H = s.H;
    return lerp(lerp(H[i], H[i + 1], tx), lerp(H[i + s.n + 1], H[i + s.n + 2], tx), tz);
  }
  return SEA;
}
/** Which great island (x, z) lies on or just off, or null. */
export function greatAt(x, z, pad = 0) {
  for (const s of GREAT) if (Math.abs(x - s.x) < s.half + pad && Math.abs(z - s.z) < s.half + pad) return s;
  return null;
}
/** How near (x, z) is to level ground or a road on its island: trees and boulders keep off these. */
export function realmClear(s, x, z) {
  const dx = x - s.x, dz = z - s.z;
  for (const f of s.flats || []) if (Math.hypot(dx - f[0], dz - f[1]) < f[2] * 0.95) return false;
  for (const r of s.roads || []) if (distToPolyline(dx, dz, r) < 5) return false;
  return true;
}

// what each kind of ground is painted in: [grass a, grass b, heather, shore, rock, worn earth]
const GROUND = {
  iron: [[86, 100, 52], [118, 112, 60], [124, 84, 70], [120, 108, 96], [70, 64, 64], [108, 78, 60]],
  gold: [[124, 122, 58], [160, 146, 76], [150, 118, 78], [196, 176, 120], [128, 120, 106], [150, 122, 82]],
  black: [[66, 72, 50], [84, 84, 64], [70, 62, 62], [44, 42, 46], [56, 54, 58], [78, 70, 62]],
  marsh: [[98, 108, 54], [124, 124, 62], [92, 84, 52], [80, 70, 48], [98, 94, 84], [84, 70, 50]],
  stone: [[94, 104, 58], [120, 116, 66], [112, 100, 88], [150, 144, 128], [146, 144, 138], [128, 116, 98]],
};

function buildIsle(s) {
  const n = s.n, nv = (n + 1) * (n + 1), pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(n * n * 6);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const k = j * (n + 1) + i;
    pos[k * 3] = s.x0 + i * C; pos[k * 3 + 1] = s.H[k]; pos[k * 3 + 2] = s.z0 + j * C;
    uv[k * 2] = i / n; uv[k * 2 + 1] = 1 - j / n;
  }
  let q = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, e = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = e; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();

  const T = 640, cv = document.createElement('canvas'); cv.width = cv.height = T;
  const g = cv.getContext('2d'), img = g.createImageData(T, T), d = img.data, px = (2 * s.half) / T, P = GROUND[s.ground] || GROUND.stone;
  const mix = (o, c, t) => { d[o] += (c[0] - d[o]) * t; d[o + 1] += (c[1] - d[o + 1]) * t; d[o + 2] += (c[2] - d[o + 2]) * t; };
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
    const x = s.x0 + (i + 0.5) * px, z = s.z0 + (j + 0.5) * px, h = realmAt(x, z), o = (j * T + i) * 4, dx = x - s.x, dz = z - s.z;
    const sl = Math.hypot(realmAt(x + 2.5, z) - h, realmAt(x, z + 2.5) - h) / 2.5, nn = noise2(x * 0.09, z * 0.09) * 0.5 + 0.5, n2 = noise2(x * 0.021 + 7, z * 0.021) * 0.5 + 0.5;
    d[o] = lerp(P[0][0], P[1][0], nn); d[o + 1] = lerp(P[0][1], P[1][1], nn); d[o + 2] = lerp(P[0][2], P[1][2], nn); d[o + 3] = 255;
    mix(o, P[2], smoothstep(0.5, 0.8, n2) * 0.6);                                   // heather, or ash, or reed-brown
    if (s.ground === 'iron') mix(o, [150, 66, 44], smoothstep(0.72, 0.9, noise2(x * 0.016 - 3, z * 0.05 + 11) * 0.5 + 0.5) * 0.75); // ore stains the streams red
    for (const f of s.flats || []) { const fd = Math.hypot(dx - f[0], dz - f[1]); if (fd < f[2]) mix(o, P[5], (1 - smoothstep(f[2] * 0.35, f[2], fd)) * 0.55 * (0.6 + nn * 0.4)); }
    for (const r of s.roads || []) { const rd = distToPolyline(dx, dz, r); if (rd < 4) mix(o, P[5], (1 - smoothstep(1.2, 4, rd)) * 0.85); }
    mix(o, P[3], 1 - smoothstep(0.3, s.marsh ? 0.5 : 1.6, h));                       // the shore
    mix(o, P[4], smoothstep(0.42, 0.85, sl));                                       // rock where it is steep
    mix(o, DEEP, smoothstep(-2.5, -8, h));                                          // every sea floor ends the same colour, so no island shows a seam
    const k = 1.04 + nn * 0.14; d[o] *= k; d[o + 1] *= k; d[o + 2] *= k;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(geo, patch(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96, metalness: 0 }), { detail: TEX.detail, snow: 1 }));
  m.receiveShadow = true; m.name = 'isle_' + s.id;
  return m;
}
export function buildRealm(scene) {
  for (const s of GREAT) scene.add(buildIsle(s));
  // one floor under the whole open sea, the colour every island's shallows fade to
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), new THREE.MeshStandardMaterial({ color: new THREE.Color(DEEP[0] / 255, DEEP[1] / 255, DEEP[2] / 255).convertSRGBToLinear().multiplyScalar(1.1), roughness: 1, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, SEA - 3, 1600); scene.add(floor);
}
