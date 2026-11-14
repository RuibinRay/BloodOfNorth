// The great islands of the story (GREAT in layout.js): Jarnøy, Solvik, Svartøy, Myrholm and Skalløy. Each has a
// heightfield patch of its own out in the open sea beyond the home waters, so an island can be as large as the
// chapters set on it need. heightAt() in terrain.js asks realmAt() for anything outside the valley and the chart.
import * as THREE from 'three';
import { fbm, noise2, smoothstep, lerp, nearPolyline } from '../core/util.js';
import { GREAT, MAIN } from './layout.js';
import { patch, TEX, hazeCull } from './geo.js';

const C = 5, SEA = -13, DEEP = [58, 70, 76], SHORE = [0.8, 0.93];
const ALL = [...GREAT, ...MAIN]; // the great islands, then the two stretches of mainland coast

for (const s of ALL) {
  s.ca = Math.cos(s.a || 0); s.sa = Math.sin(s.a || 0);
  s.half = s.half || Math.ceil((s.r * (s.k || 1) * 1.22) / C) * C; // half the side of its square patch
  s.n = (2 * s.half) / C; s.x0 = s.x - s.half; s.z0 = s.z - s.half;
  s.H = new Float32Array((s.n + 1) * (s.n + 1));
}

/** The shape of one island: a stretched, turned, wobbly-edged shelf with bays bitten out of it, hills, level
 *  ground where the story needs it, ravines and channels, a beach and shallows. */
function rawAt(s, x, z) {
  const dx = x - s.x, dz = z - s.z, ex = dx - (s.o ? s.o[0] : 0), ez = dz - (s.o ? s.o[1] : 0), sh = s.shore || SHORE;
  const u = (ex * s.ca + ez * s.sa) / (s.k || 1), v = -ex * s.sa + ez * s.ca;
  let d = Math.hypot(u, v) * (1 + (s.wob ?? 0.2) * fbm(x * 0.0055 + s.x * 0.013, z * 0.0055 - s.z * 0.013, 3));
  for (const b of s.bays || []) { const bd = Math.hypot(dx - b[0], dz - b[1]); if (bd < b[2]) d = Math.max(d, s.r * (sh[0] + (1.07 - sh[0]) * (1 - bd / b[2]))); }
  return offshore(s, x, z, dx, dz, d >= s.r ? SEA : shelf(s, x, z, dx, dz, d, sh));
}
/** Skerries off the coast, and pools where the sea floor is set (a wreck a man can dive to). */
function offshore(s, x, z, dx, dz, h) {
  for (const i of s.isles || []) {
    const id = Math.hypot(dx - i[0], dz - i[1]) * (1 + 0.14 * noise2(x * 0.07 + 3, z * 0.07 - 5));
    if (id < i[2]) h = Math.max(h, lerp(lerp(i[3] + noise2(x * 0.2, z * 0.2) * 0.5, -2.2, smoothstep(i[2] * 0.6, i[2] * 0.86, id)), SEA, smoothstep(i[2] * 0.86, i[2], id)));
  }
  for (const p of s.pools || []) { const pd = Math.hypot(dx - p[0], dz - p[1]); if (pd < p[2]) h = lerp(p[3] + noise2(x * 0.3, z * 0.3) * 0.25, h, smoothstep(p[2] * 0.6, p[2], pd)); }
  return h;
}
function shelf(s, x, z, dx, dz, d, sh) {
  let top = s.h + fbm(x * 0.012 + s.x, z * 0.012 - s.z, 3) * s.rough + fbm(x * 0.05, z * 0.05, 2) * 0.3;
  for (const p of s.hills || []) top += p[2] * (1 - smoothstep(0, p[3], Math.hypot(dx - p[0], dz - p[1])));
  if (s.marsh) { // reed flats a hand above the water, shallows a man can wade, and pools he cannot
    const n = fbm(x * 0.021 + 5, z * 0.021 - 9, 3);
    top += n * 0.8;
    if (n < -0.16) top = Math.min(top, -0.22 - (-0.16 - n) * 2.2);
    top = Math.max(top, -0.68); // every pool can be waded; only the channels need a boat or a bridge
  }
  const cut = (c) => { const cd = nearPolyline(dx, dz, c.pts, c.w); if (cd < c.w) top = Math.min(top, lerp(c.y, top, smoothstep(c.w * 0.4, c.w, cd))); };
  for (const c of s.cuts || []) if (!c.late) cut(c);
  if (s.marsh) for (const r of s.roads || []) { const rd = nearPolyline(dx, dz, r, 6); if (rd < 6) top = Math.max(top, lerp(0.5, top, smoothstep(2.5, 6, rd))); } // causeways
  for (const f of s.flats || []) { const fd = Math.hypot(dx - f[0], dz - f[1]); if (fd < f[2]) top = lerp(f[3], top, smoothstep(f[2] * 0.62, f[2], fd)); }
  for (const c of s.cuts || []) if (c.late) cut(c); // a river keeps its bed through level ground
  const land = lerp(top, -2.2, smoothstep(s.r * sh[0], s.r * sh[1], d));
  return lerp(land, SEA, smoothstep(s.r * sh[1], s.r, d));
}

export function buildRealmHeights() {
  for (const s of ALL) for (let j = 0; j <= s.n; j++) for (let i = 0; i <= s.n; i++) {
    const edge = i === 0 || j === 0 || i === s.n || j === s.n;
    s.H[j * (s.n + 1) + i] = edge ? SEA : rawAt(s, s.x0 + i * C, s.z0 + j * C);
  }
}
/** Height on a great island's grid, or the open sea floor. */
export function realmAt(x, z) {
  for (const s of ALL) {
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
/** Which stretch of mainland coast (x, z) lies on, or null. */
export function mainAt(x, z, pad = 0) {
  for (const s of MAIN) if (Math.abs(x - s.x) < s.half + pad && Math.abs(z - s.z) < s.half + pad) return s;
  return null;
}
/** How near (x, z) is to level ground or a road on its island: trees and boulders keep off these. */
export function realmClear(s, x, z) {
  const dx = x - s.x, dz = z - s.z;
  for (const f of s.flats || []) if (Math.hypot(dx - f[0], dz - f[1]) < f[2] * 0.95) return false;
  for (const r of s.roads || []) if (nearPolyline(dx, dz, r, 5) < 5) return false;
  for (const f of s.fields || []) if (inField(f, dx, dz, 3)) return false;
  return true;
}

const inField = (f, dx, dz, pad = 0) => { const c = Math.cos(f[4] || 0), sn = Math.sin(f[4] || 0), lx = (dx - f[0]) * c - (dz - f[1]) * sn, lz = (dx - f[0]) * sn + (dz - f[1]) * c; return Math.abs(lx) < f[2] / 2 + pad && Math.abs(lz) < f[3] / 2 + pad; };

// what each kind of ground is painted in: [grass a, grass b, heather, shore, rock, worn earth]
const GROUND = {
  iron: [[86, 100, 52], [118, 112, 60], [124, 84, 70], [120, 108, 96], [70, 64, 64], [108, 78, 60]],
  gold: [[124, 122, 58], [160, 146, 76], [150, 118, 78], [196, 176, 120], [128, 120, 106], [150, 122, 82]],
  black: [[66, 72, 50], [84, 84, 64], [70, 62, 62], [44, 42, 46], [56, 54, 58], [78, 70, 62]],
  marsh: [[98, 108, 54], [124, 124, 62], [92, 84, 52], [80, 70, 48], [98, 94, 84], [84, 70, 50]],
  stone: [[94, 104, 58], [120, 116, 66], [112, 100, 88], [150, 144, 128], [146, 144, 138], [128, 116, 98]],
  green: [[82, 124, 54], [118, 146, 66], [112, 122, 70], [176, 168, 132], [128, 124, 112], [134, 112, 82]],
  home: [[84, 112, 54], [118, 132, 64], [108, 104, 66], [156, 144, 114], [112, 108, 102], [122, 100, 74]],
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

  // The ground's picture is painted after the game has started, a slice at a time (see paintLater): every island
  // is far out to sea, behind the haze, when the title comes up. Until then the canvas is one plain colour, and if an
  // island is about to be drawn before its turn has come it is painted there and then.
  const T = 640, cv = document.createElement('canvas'); cv.width = cv.height = T;
  const g = cv.getContext('2d'), P = GROUND[s.ground] || GROUND.stone;
  g.fillStyle = `rgb(${P.slice(0, 2).reduce((a, c) => a.map((v, i) => v + c[i] / 2), [0, 0, 0]).map(Math.round)})`; g.fillRect(0, 0, T, T);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(geo, patch(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96, metalness: 0 }), { detail: TEX.detail, snow: 1 }));
  m.receiveShadow = true; m.name = 'isle_' + s.id;
  const job = { s, g, img: g.createImageData(T, T), T, P, tex, row: 0 };
  m.onBeforeRender = () => { if (job.row < T) paintIsle(job, Infinity); };
  waiting.push(job);
  return hazeCull(m); // an island's ground is not drawn once the haze has taken it
}
const waiting = [];
/** Paint rows of an island's ground for up to `ms` milliseconds; the picture goes to the screen once it is whole. */
function paintIsle(job, ms) {
  const { s, img, T, P } = job, d = img.data, px = (2 * s.half) / T, from = job.row, t0 = performance.now();
  const mix = (o, c, t) => { d[o] += (c[0] - d[o]) * t; d[o + 1] += (c[1] - d[o + 1]) * t; d[o + 2] += (c[2] - d[o + 2]) * t; };
  for (; job.row < T && performance.now() - t0 < ms; job.row++) for (let j = job.row, i = 0; i < T; i++) {
    const x = s.x0 + (i + 0.5) * px, z = s.z0 + (j + 0.5) * px, h = realmAt(x, z), o = (j * T + i) * 4, dx = x - s.x, dz = z - s.z;
    const sl = Math.hypot(realmAt(x + 2.5, z) - h, realmAt(x, z + 2.5) - h) / 2.5, nn = noise2(x * 0.09, z * 0.09) * 0.5 + 0.5, n2 = noise2(x * 0.021 + 7, z * 0.021) * 0.5 + 0.5;
    d[o] = lerp(P[0][0], P[1][0], nn); d[o + 1] = lerp(P[0][1], P[1][1], nn); d[o + 2] = lerp(P[0][2], P[1][2], nn); d[o + 3] = 255;
    mix(o, P[2], smoothstep(0.5, 0.8, n2) * 0.6);                                   // heather, or ash, or reed-brown
    if (s.ground === 'iron') mix(o, [150, 66, 44], smoothstep(0.72, 0.9, noise2(x * 0.016 - 3, z * 0.05 + 11) * 0.5 + 0.5) * 0.75); // ore stains the streams red
    for (const f of s.flats || []) { if (f[4]) continue; const fd = Math.hypot(dx - f[0], dz - f[1]); if (fd < f[2]) mix(o, P[5], (1 - smoothstep(f[2] * 0.35, f[2], fd)) * 0.55 * (0.6 + nn * 0.4)); }
    for (const f of s.fields || []) if (inField(f, dx, dz)) mix(o, (Math.floor((dx * Math.cos(f[4] || 0) - dz * Math.sin(f[4] || 0)) / 1.6) & 1) ? [182, 156, 74] : [168, 140, 62], 0.9); // barley, in rows
    for (const r of s.roads || []) { const rd = nearPolyline(dx, dz, r, 4); if (rd < 4) mix(o, P[5], (1 - smoothstep(1.2, 4, rd)) * 0.85); }
    mix(o, P[3], 1 - smoothstep(0.3, s.marsh ? 0.5 : 1.6, h));                       // the shore
    mix(o, P[4], smoothstep(0.42, 0.85, sl));                                       // rock where it is steep
    mix(o, DEEP, smoothstep(-2.5, -8, h));                                          // every sea floor ends the same colour, so no island shows a seam
    const k = 1.04 + nn * 0.14; d[o] *= k; d[o + 1] *= k; d[o + 2] *= k;
  }
  if (job.row > from) job.g.putImageData(img, 0, 0, 0, from, T, job.row - from);
  if (job.row >= T) job.tex.needsUpdate = true;
}
/** Paint the islands' ground in the gaps between frames, a few milliseconds at a time, until all are done. */
function paintLater() {
  const job = waiting.find((j) => j.row < j.T);
  if (!job) return;
  const idle = window.requestIdleCallback && window.requestIdleCallback.bind(window);
  if (idle) idle((dl) => { paintIsle(job, Math.max(2, Math.min(8, dl.timeRemaining() - 1))); paintLater(); }, { timeout: 200 });
  else setTimeout(() => { paintIsle(job, 6); paintLater(); }, 16);
}
/** Paint every island's ground now (a test that wants the finished pictures at once). */
export function paintRealmNow() { for (const j of waiting) if (j.row < j.T) paintIsle(j, Infinity); }
/** How many rows of island ground are still to be painted. */
export const realmLeft = () => waiting.reduce((n, j) => n + j.T - j.row, 0);
export function buildRealm(scene) {
  for (const s of ALL) scene.add(buildIsle(s));
  setTimeout(paintLater, 0); // once the boot that is building the world has finished
  // one floor under the whole open sea, the colour every island's shallows fade to
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), new THREE.MeshStandardMaterial({ color: new THREE.Color(DEEP[0] / 255, DEEP[1] / 255, DEEP[2] / 255).convertSRGBToLinear().multiplyScalar(1.1), roughness: 1, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, SEA - 3, 1600); scene.add(floor);
}
