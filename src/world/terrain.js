// Heightfield terrain for the Hrafnvik valley: a fjord to the south, mountains on three sides,
// a river on the east flank and a flattened shelf for the village.
import * as THREE from 'three';
import { fbm, noise2, smoothstep, lerp, clamp, nearPolyline } from '../core/util.js';
import { FLATS, PATHS, FIELDS, VILLAGE, POI, ISLES } from './layout.js';
import { patch, waterPatch, TEX, shared } from './geo.js';
import { realmAt, buildRealmHeights, buildRealm } from './realm.js';

export const SIZE = 640, HALF = SIZE / 2, N = 256, CELL = SIZE / N;
const H = new Float32Array((N + 1) * (N + 1));
/** The sea chart: a coarser heightfield under and around the valley. It carries the mainland coast outside
 *  the valley's own grid and 1.3 km of open water and islands to the south. */
export const CH = { x0: -640, z0: -480, w: 1280, d: 2080, nx: 256, nz: 416, c: 5 };
const CHH = new Float32Array((CH.nx + 1) * (CH.nz + 1));

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

function chartRaw(x, z) {
  // the mainland: the valley's walls run on as a coastal massif, which breaks up and sinks toward the south
  const ax = Math.abs(x), coast = 505 + fbm(x * 0.006 + 2.3, 1.7, 3) * 120 - smoothstep(330, 600, ax) * 110;
  const k = (1 - smoothstep(coast - 200, coast, z)) * (1 - smoothstep(450, 615, ax + fbm(4.1, z * 0.007, 2) * 45)) * (1 - smoothstep(-345, -470, z));
  const sea = lerp(-13 + fbm(x * 0.004 + 9, z * 0.004 - 3, 3) * 2.5, base(x, z), k);
  let h = sea;
  for (const s of ISLES) {
    // an island: a stretched, turned, wobbly-edged shelf with a beach, shallows round it, and maybe a hill
    const dx = x - s.x, dz = z - s.z, ca = Math.cos(s.a || 0), sa = Math.sin(s.a || 0);
    const d = Math.hypot((dx * ca + dz * sa) / (s.k || 1), -dx * sa + dz * ca) * (1 + 0.3 * fbm(x * 0.013 + s.x * 0.7, z * 0.013 - s.z * 0.7, 2));
    if (d >= s.r) continue;
    let top = s.h + fbm(x * 0.02 + s.x, z * 0.02 - s.z, 3) * s.rough;
    if (s.p) top += s.p[2] * (1 - smoothstep(0, s.p[3], Math.hypot(dx - s.p[0], dz - s.p[1])));
    const land = lerp(-2.2, top, 1 - smoothstep(s.r * 0.42, s.r * 0.86, d));
    h = Math.max(h, lerp(sea, land, 1 - smoothstep(s.r * 0.86, s.r, d)));
  }
  return h;
}
function chartAt(x, z) {
  const fx = clamp((x - CH.x0) / CH.c, 0, CH.nx - 0.001), fz = clamp((z - CH.z0) / CH.c, 0, CH.nz - 0.001);
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * (CH.nx + 1) + ix;
  return lerp(lerp(CHH[i], CHH[i + 1], tx), lerp(CHH[i + CH.nx + 1], CHH[i + CH.nx + 2], tx), tz);
}
function mainAt(x, z) {
  const fx = clamp((x + HALF) / CELL, 0, N - 0.001), fz = clamp((z + HALF) / CELL, 0, N - 0.001);
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * (N + 1) + ix;
  return lerp(lerp(H[i], H[i + 1], tx), lerp(H[i + N + 1], H[i + N + 2], tx), tz);
}
/** Bilinear height lookup on the mesh grids (matches the rendered surface): the valley, the chart of the home
 *  waters round it, or (beyond the chart) the great islands of the open sea. */
export function heightAt(x, z) {
  if (x <= HALF && x >= -HALF && z <= HALF && z >= -HALF) return mainAt(x, z);
  if (x >= CH.x0 && x <= CH.x0 + CH.w && z <= CH.z0 + CH.d) return chartAt(x, z);
  return realmAt(x, z);
}
export function slopeAt(x, z) {
  const e = 1.5;
  return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
}
/** How far (x, z) is from the edge of the nearest path. Only distances under `within` are exact; past that it may answer Infinity. */
export function distToPaths(x, z, within = Infinity) {
  let best = Infinity;
  for (const p of PATHS) { const d = nearPolyline(x, z, p.pts, within + p.w * 0.5) - p.w * 0.5; if (d < best) best = d; }
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
  if (distToPaths(x, z, 1.6) < 1.6) return 0;
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
  for (let j = 0; j <= CH.nz; j++) for (let i = 0; i <= CH.nx; i++) {
    const x = CH.x0 + i * CH.c, z = CH.z0 + j * CH.c, e = Math.min(HALF - Math.abs(x), HALF - Math.abs(z));
    // under the valley's own mesh the chart ducks out of sight; along the seam it sits a hand's width lower
    CHH[j * (CH.nx + 1) + i] = e < 0 ? chartRaw(x, z) : e === 0 ? mainAt(x, z) - 0.15 : e <= 10 ? mainAt(x, z) - 3 : -60;
  }
  buildRealmHeights();
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
    rock = [116, 112, 106], sand = [182, 164, 126], gravel = [110, 108, 100], snow = [228, 232, 240], soil = [98, 76, 52], mud = [84, 72, 54];
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
      const dp = distToPaths(x, z, 1.4);
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
      if (h < -2.5) col = mix3(col, [58, 70, 76], smoothstep(-2.5, -8, h)); // the deep fjord floor matches the open sea's
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

function buildChart() {
  const nx = CH.nx, nz = CH.nz, nv = (nx + 1) * (nz + 1), pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(nx * nz * 6);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i;
    pos[k * 3] = CH.x0 + i * CH.c; pos[k * 3 + 1] = CHH[k]; pos[k * 3 + 2] = CH.z0 + j * CH.c;
    uv[k * 2] = i / nx; uv[k * 2 + 1] = 1 - j / nz;
  }
  let q = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, e = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = e; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
  // painted colour, to match the valley: shingle at the waterline, grass and heather, rock on slopes, snow on the heights
  const TW = 768, TH = Math.round((TW * CH.d) / CH.w), cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const g = cv.getContext('2d'), img = g.createImageData(TW, TH), d = img.data, px = CH.w / TW;
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const x = CH.x0 + (i + 0.5) * px, z = CH.z0 + (j + 0.5) * px, h = heightAt(x, z), o = (j * TW + i) * 4;
    const sl = Math.hypot(heightAt(x + 2.5, z) - h, heightAt(x, z + 2.5) - h) / 2.5, nn = noise2(x * 0.09, z * 0.09) * 0.5 + 0.5, n2 = noise2(x * 0.021 + 7, z * 0.021) * 0.5 + 0.5;
    let r = lerp(92, 128, nn), gg = lerp(104, 116, nn), b = lerp(50, 58, nn);
    const hth = smoothstep(0.5, 0.8, n2) * 0.6; r = lerp(r, 118, hth); gg = lerp(gg, 92, hth); b = lerp(b, 84, hth);       // heather
    const sh = 1 - smoothstep(0.3, 1.5, h); r = lerp(r, 182, sh); gg = lerp(gg, 164, sh); b = lerp(b, 126, sh);            // shingle
    const rk = smoothstep(0.42, 0.85, sl); r = lerp(r, 116, rk); gg = lerp(gg, 112, rk); b = lerp(b, 106, rk);              // rock
    const sn = smoothstep(46, 62, h + nn * 10) * (1 - smoothstep(0.9, 1.5, sl) * 0.7); r = lerp(r, 228, sn); gg = lerp(gg, 232, sn); b = lerp(b, 240, sn);
    const dp = smoothstep(-2.5, -8, h); r = lerp(r, 58, dp); gg = lerp(gg, 70, dp); b = lerp(b, 76, dp);                      // deep floor: the colour of the open sea's
    const k = 1.04 + nn * 0.14; d[o] = r * k; d[o + 1] = gg * k; d[o + 2] = b * k; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(geo, patch(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.96, metalness: 0 }), { detail: TEX.detail, snow: 1 }));
  m.receiveShadow = true;
  return m;
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
  scene.add(buildChart());
  buildRealm(scene);

  // --- water: the fjord (one big plane at sea level) and the river ribbon ---
  const waterMat = waterPatch(new THREE.MeshStandardMaterial({
    color: 0x1f4254, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 1,
    normalMap: TEX.waterN, normalScale: new THREE.Vector2(0.42, 0.42), envMapIntensity: 1.3,
  }));
  TEX.waterN.repeat.set(580, 580);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), waterMat); // the home waters and the open sea of the ten islands
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, 1600); sea.receiveShadow = true;
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
  const riverMat = waterPatch(waterMat.clone()); riverMat.normalMap = riverN; riverMat.color.set(0x2c5062); riverMat.opacity = 0.92;
  const river = new THREE.Mesh(rgeo, riverMat);
  river.receiveShadow = true;
  scene.add(river);

  return {
    mesh, sea, river, albedoCanvas: albedo.canvas,
    iced: false,
    /** Freeze or thaw the river surface (Chapter 2). */
    setIce(on) {
      this.iced = on;
      riverMat.color.set(on ? 0xdbe8f0 : 0x2c5062); riverMat.opacity = on ? 0.96 : 0.92; riverMat.userData.ice.value = on ? 1 : 0;
      riverMat.roughness = on ? 0.42 : 0.08; riverMat.metalness = on ? 0.05 : 0.55; riverMat.normalScale.setScalar(on ? 0.12 : 0.55);
    },
    update(t) {
      const dr = shared.uSeaDrift.value; // the sea flowing past a ship the story sails (a tile of ripples is 10000 / 580 m; the plane's v runs against world z)
      TEX.waterN.offset.set(t * 0.004 + dr.x * 0.058, t * 0.0026 - dr.y * 0.058);
      if (!this.iced) riverN.offset.set(0, -t * 0.22); // flows south, toward the fjord
    },
  };
}
