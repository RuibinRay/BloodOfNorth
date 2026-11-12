// Heightfield terrain for the Hrafnvik valley: a fjord to the south, mountains on three sides,
// a river on the east flank and a flattened shelf for the village.
import * as THREE from 'three';
import { fbm, noise2, smoothstep, lerp, clamp, distToPolyline } from '../core/util.js';
import { FLATS, PATHS, FIELDS, VILLAGE, POI } from './layout.js';
import { patch, TEX } from './geo.js';

export const SIZE = 640, HALF = SIZE / 2, N = 256, CELL = SIZE / N;
const H = new Float32Array((N + 1) * (N + 1));

export function riverX(z) { return 78 + Math.sin(z * 0.021) * 22 + Math.sin(z * 0.055 + 1.3) * 6; }
const floorY = (z) => 3.5 - z * 0.018;
const riverBedY = (z) => Math.max(-1.4, floorY(z) - 1.6);
export const riverSurfaceY = (z) => Math.max(0.04, riverBedY(z) + 0.8);

function base(x, z) {
  let floor = floorY(z) - smoothstep(150, 270, z) * 10;
  const mx = smoothstep(120, 300, Math.abs(x));
  const mz = smoothstep(-170, -310, z);
  const m = Math.max(mx, mz);
  let h = floor + m * m * 95;
  h += fbm(x * 0.011 + 3.1, z * 0.011 - 7.7, 4) * (2.2 + m * 26);
  h += fbm(x * 0.06, z * 0.06, 2) * 0.35;
  return h;
}
function raw(x, z) {
  let h = base(x, z);
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < f.r) h = lerp(h, f.h, 1 - smoothstep(f.r * 0.55, f.r, d));
  }
  const dr = Math.abs(x - riverX(z));
  if (dr < 14) {
    const w = (1 - smoothstep(3.5, 13, dr)) * (1 - smoothstep(175, 215, z));
    h = lerp(h, riverBedY(z), w);
  }
  return h;
}

/** Bilinear height lookup on the mesh grid (matches the rendered surface). */
export function heightAt(x, z) {
  const fx = clamp((x + HALF) / CELL, 0, N - 0.001), fz = clamp((z + HALF) / CELL, 0, N - 0.001);
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * (N + 1) + ix;
  return lerp(lerp(H[i], H[i + 1], tx), lerp(H[i + N + 1], H[i + N + 2], tx), tz);
}
export function slopeAt(x, z) {
  const e = 1.5;
  return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
}
export function distToPaths(x, z) {
  let best = Infinity;
  for (const p of PATHS) { const d = distToPolyline(x, z, p.pts) - p.w * 0.5; if (d < best) best = d; }
  return best;
}
export function inField(x, z) {
  for (const f of FIELDS) {
    const c = Math.cos(f.ry), s = Math.sin(f.ry), dx = x - f.x, dz = z - f.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < f.w / 2 && Math.abs(lz) < f.d / 2) return lx;
  }
  return null;
}
/** 0..1 tree density: thick to the west and north, none in the village, on trails or by the water. */
export function forestDensity(x, z) {
  const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  if (dv < VILLAGE.r + 6) return 0;
  if (z > 132) return 0;
  if (Math.abs(x - riverX(z)) < 12) return 0;
  if (distToPaths(x, z) < 1.6) return 0;
  if (inField(x, z) !== null) return 0;
  for (let i = 1; i < FLATS.length; i++) {
    const f = FLATS[i];
    if (Math.hypot(x - f.x, z - f.z) < f.r * 0.72) return 0;
  }
  let d = Math.max(smoothstep(-48, -92, x), smoothstep(-30, -80, z), smoothstep(112, 150, x) * 0.8);
  d = Math.max(d, 0.06);
  d *= 0.55 + 0.6 * (fbm(x * 0.03 + 11, z * 0.03 - 5, 2) * 0.5 + 0.5);
  d *= smoothstep(VILLAGE.r + 6, VILLAGE.r + 34, dv);
  return clamp(d, 0, 1);
}

export function buildHeights() {
  for (const f of FLATS) if (f.h === undefined) f.h = base(f.x, f.z) + (f.dh || 0);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H[j * (N + 1) + i] = raw(-HALF + i * CELL, -HALF + j * CELL);
  // the fishing rock sits on the west bank of the river, east of the village
  POI.fishing.z = 58; POI.fishing.x = riverX(58) - 8.6;
}

function paintAlbedo() {
  const T = 1024, c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d'), img = g.createImageData(T, T), d = img.data;
  const px = SIZE / T;
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const grassA = [92, 104, 50], grassB = [128, 116, 58], grassC = [150, 128, 70], floorF = [72, 66, 42], dirt = [112, 90, 64],
    rock = [116, 112, 106], sand = [156, 146, 118], gravel = [110, 108, 100], snow = [228, 232, 240], soil = [98, 76, 52], mud = [84, 72, 54];
  for (let j = 0; j < T; j++) {
    const z = -HALF + (j + 0.5) * px;
    for (let i = 0; i < T; i++) {
      const x = -HALF + (i + 0.5) * px;
      const h = heightAt(x, z);
      const sl = Math.hypot(heightAt(x + 1.2, z) - h, heightAt(x, z + 1.2) - h) / 1.2;
      const n = noise2(x * 0.09, z * 0.09) * 0.5 + 0.5, n2 = noise2(x * 0.5 + 40, z * 0.5) * 0.5 + 0.5;
      let col = mix3(grassA, grassB, n);
      col = mix3(col, grassC, smoothstep(0.55, 0.9, n2) * 0.5);
      // forest floor
      const fd = forestDensityFast(x, z);
      col = mix3(col, floorF, smoothstep(0.15, 0.55, fd) * 0.85);
      // worn ground in the village and on trails
      const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
      col = mix3(col, dirt, (1 - smoothstep(18, 60, dv)) * 0.35 * (0.5 + n2 * 0.5));
      const dp = distToPaths(x, z);
      if (dp < 1.4) col = mix3(col, dirt, (1 - smoothstep(-0.2, 1.4, dp)) * (0.75 + n2 * 0.25));
      const fl = inField(x, z);
      if (fl !== null) { const furrow = Math.sin(fl * 5.2) * 0.5 + 0.5; col = mix3(soil, [70, 54, 38], furrow * 0.6); }
      // shore, riverbed
      if (h < 1.3) col = mix3(col, sand, 1 - smoothstep(0.3, 1.3, h));
      if (h < 0.1) col = mix3(col, gravel, 0.6);
      const dr = Math.abs(x - riverX(z));
      if (dr < 12 && z < 200) col = mix3(col, n2 > 0.5 ? gravel : mud, 1 - smoothstep(6, 12, dr));
      // rock on slopes, snow on the heights
      col = mix3(col, rock, smoothstep(0.42, 0.85, sl));
      col = mix3(col, snow, smoothstep(46, 62, h + n * 10) * (1 - smoothstep(0.9, 1.5, sl) * 0.7));
      const k = 1.04 + n2 * 0.16, o = (j * T + i) * 4;
      d[o] = col[0] * k; d[o + 1] = col[1] * k; d[o + 2] = col[2] * k; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, canvas: c };
}
// cheaper density for per-pixel painting (skips trail/field tests which are painted separately)
function forestDensityFast(x, z) {
  const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  if (dv < VILLAGE.r + 6 || z > 132) return 0;
  let d = Math.max(smoothstep(-48, -92, x), smoothstep(-30, -80, z), smoothstep(112, 150, x) * 0.8);
  return d * smoothstep(VILLAGE.r + 6, VILLAGE.r + 34, dv);
}

export function buildTerrain(scene) {
  const pos = new Float32Array((N + 1) * (N + 1) * 3), uv = new Float32Array((N + 1) * (N + 1) * 2);
  const idx = new Uint32Array(N * N * 6);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const k = j * (N + 1) + i;
    pos[k * 3] = -HALF + i * CELL; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = -HALF + j * CELL;
    uv[k * 2] = i / N; uv[k * 2 + 1] = 1 - j / N;
  }
  let q = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, e = c + 1;
    idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = e;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const albedo = paintAlbedo();
  const mat = patch(new THREE.MeshStandardMaterial({ map: albedo.tex, roughness: 0.96, metalness: 0 }), { detail: TEX.detail, snow: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // --- water: the fjord (one big plane at sea level) and the river ribbon ---
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x24465a, roughness: 0.08, metalness: 0.55, transparent: true, opacity: 0.88,
    normalMap: TEX.waterN, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 1.3,
  });
  TEX.waterN.repeat.set(150, 150);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), waterMat);
  sea.rotation.x = -Math.PI / 2; sea.position.y = 0; sea.receiveShadow = true;
  scene.add(sea);

  const seg = 220, rp = [], ruv = [], ri = [];
  for (let s = 0; s <= seg; s++) {
    const z = -300 + (s / seg) * 500, x = riverX(z), y = riverSurfaceY(z), w = 9.5;
    rp.push(x - w, y, z, x + w, y, z);
    ruv.push(0, z / 6, 3, z / 6);
    if (s < seg) { const a = s * 2; ri.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  rgeo.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2));
  rgeo.setIndex(ri); rgeo.computeVertexNormals();
  const riverN = TEX.waterN.clone(); riverN.needsUpdate = true; riverN.repeat.set(1, 1);
  const riverMat = waterMat.clone(); riverMat.normalMap = riverN; riverMat.color.set(0x2c5062); riverMat.opacity = 0.82;
  const river = new THREE.Mesh(rgeo, riverMat);
  river.receiveShadow = true;
  scene.add(river);

  return {
    mesh, sea, river, albedoCanvas: albedo.canvas,
    update(t) {
      TEX.waterN.offset.set(t * 0.004, t * 0.0026);
      riverN.offset.set(0, -t * 0.22); // flows south, toward the fjord
    },
  };
}
