// Instanced forest, undergrowth, rocks and grass.
// Everything here is laid out in map cells, each cell its own batch with its own bounds, so that only the cells in
// front of the camera (or inside the sun's shadow box) are drawn. Trees far off are drawn with a simpler shape, grass
// and bushes are dropped beyond the distance at which they can be seen, and nothing is drawn past the haze.
import * as THREE from 'three';
import { rng, noise2, clamp } from '../core/util.js';
import { M, at, cyl, cone, tint, merge, patch, hazeRange } from './geo.js';
import { ART } from '../data/art.js';
import { heightAt, slopeAt, forestDensity, distToPaths, inField, riverX, HALF } from './terrain.js';
import { VILLAGE, POI, ISLES, SEA_CLEAR, GREAT, MAIN } from './layout.js';
import { realmClear } from './realm.js';

function pineGeo() {
  const parts = [tint(at(cyl(0.1, 0.3, 10, 6), 0, 5, 0), 0x4a382a, 0.25, 1)];
  const layers = [[2.5, 3.4, 3.2], [2.15, 3.2, 4.9], [1.75, 3.0, 6.5], [1.3, 2.8, 8.0], [0.85, 2.6, 9.6]];
  layers.forEach(([r, h, y], i) => parts.push(tint(at(cone(r, h, 7), 0, y, 0, 0, i * 0.9, 0), i % 2 ? 0x27432c : 0x1f3a27, 0.3, i + 2)));
  return merge(parts);
}
function birchGeo() {
  const parts = [tint(at(cyl(0.07, 0.16, 7, 6), 0, 3.5, 0), 0xd8d4c8, 0.35, 3)];
  const blobs = [[0, 6.4, 0, 1.9], [0.9, 5.5, 0.4, 1.4], [-0.8, 5.7, -0.5, 1.5], [0.2, 7.5, -0.3, 1.2]];
  blobs.forEach(([x, y, z, s], i) => parts.push(tint(at(new THREE.IcosahedronGeometry(1, 1), x, y, z, 0, i, 0, s, s * 0.85, s), i % 2 ? 0xc79a2e : 0xb9832a, 0.35, i + 5)));
  parts.push(tint(at(cyl(0.03, 0.05, 2.2, 4), 0.5, 5.0, 0.2, 0, 0, -0.7), 0xcfcabd, 0.2, 9));
  return merge(parts);
}
// ---- trees with bark and boughs -----------------------------------------------------------------------------------
// Close to, a tree wears a picture (public/art/world, built by tools/art/world.py from Higgsfield originals): bark down
// its left quarter, foliage in the rest. A piece's own UVs are squeezed into its strip of that picture.
const strip = (g, u0, u1, vr = 1) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), uv.getY(i) * vr); return g; };
/** A pine: a barked trunk and five skirts of boughs. Each skirt is an open cone whose top is solid needles and whose
 *  lower third is hanging boughs cut out of the picture, so the layers below show through its ragged edge. */
function pineNearGeo() {
  const parts = [tint(strip(at(new THREE.CylinderGeometry(0.1, 0.3, 10, 6, 1, true), 0, 5, 0), 0.012, 0.238, 3), 0xe6dcd2, 0.2, 1)];
  const layers = [[3.1, 4.5, 2.9], [2.7, 4.2, 4.6], [2.2, 3.9, 6.2], [1.65, 3.6, 7.8], [1.1, 3.3, 9.5]];
  layers.forEach(([r, h, y], i) => parts.push(tint(strip(at(new THREE.ConeGeometry(r, h, 10, 1, true), 0, y, 0, 0, i * 0.9, 0), 0.262, 0.992), i % 2 ? 0x9cb4c4 : 0x86a0b2, 0.25, i + 2))); // a cool tint: the picture is a yellower, lighter green than the far trees
  return merge(parts);
}
/** A birch: a white barked trunk, a small core of leaf-covered masses, and sprays of twigs bursting outward from it
 *  in every direction, so that the crown's whole outline is leaves against the sky. */
function birchNearGeo() {
  const parts = [tint(strip(at(new THREE.CylinderGeometry(0.07, 0.16, 7, 6, 1, true), 0, 3.5, 0), 0.012, 0.238, 2), 0xffffff, 0.1, 3)];
  const core = [[0, 6.3, 0, 1.3], [0.7, 5.6, 0.3, 1.0], [-0.6, 5.8, -0.4, 1.05], [0.15, 7.2, -0.2, 0.9]];
  core.forEach(([x, y, z, sc], i) => parts.push(tint(strip(at(new THREE.IcosahedronGeometry(1, 1), x, y, z, 0, i, 0, sc, sc * 0.85, sc), 0.262, 0.618), i % 2 ? 0xd2bc8e : 0xbea878, 0.3, i + 5)));
  const R = rng(77), m = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const spray = (cx, cy, cz, w, seed) => { // one spray, growing out of (cx, cy, cz) along dir; lit as part of a round crown, not as a flat card
    const g = new THREE.PlaneGeometry(w, w * 1.12), n = g.attributes.normal;
    g.translate(0, w * 0.46, 0);
    q.setFromUnitVectors(up, dir); roll.setFromAxisAngle(up, R() * 6.28); q.multiply(roll);
    g.applyMatrix4(m.compose(new THREE.Vector3(cx, cy, cz), q, one));
    const nx = dir.x * 0.75, ny = dir.y * 0.75 + 0.45, nz = dir.z * 0.75, nl = Math.hypot(nx, ny, nz);
    for (let k = 0; k < n.count; k++) n.setXYZ(k, nx / nl, ny / nl, nz / nl);
    parts.push(tint(strip(g, 0.632, 0.992), seed % 3 ? 0xf6e6c4 : 0xe2cea4, 0.2, 20 + seed));
  };
  const N = 16;
  for (let i = 0; i < N; i++) { // the crown: sprays spread evenly round a sphere (a spiral), each knocked a little off true
    const yy = 1 - (i + 0.5) / N * 1.5, rr = Math.sqrt(Math.max(0, 1 - yy * yy)), a = i * 2.39996 + R() * 0.5;
    dir.set(Math.cos(a) * rr + (R() - 0.5) * 0.5, yy + (R() - 0.5) * 0.4, Math.sin(a) * rr + (R() - 0.5) * 0.5).normalize();
    spray(dir.x * 0.25, 6.2 + dir.y * 0.3, dir.z * 0.25, 3.0 + R() * 0.9, i);
  }
  for (let i = 0; i < 7; i++) { // and lower boughs, hanging outward and down from the trunk
    const a = i * 0.9 + R() * 0.5;
    dir.set(Math.cos(a), -0.35 - R() * 0.35, Math.sin(a)).normalize();
    spray(dir.x * 0.3, 5.0 + R() * 0.9, dir.z * 0.3, 2.4 + R() * 0.7, 40 + i);
  }
  parts.push(tint(strip(at(new THREE.CylinderGeometry(0.03, 0.05, 2.2, 4, 1, true), 0.5, 5.0, 0.2, 0, 0, -0.7), 0.012, 0.238), 0xffffff, 0.1, 9));
  return merge(parts);
}
/** The same trees as seen from far off: the same height, spread and colours in a few flat-sided pieces. */
function pineFarGeo() {
  return merge([tint(at(cyl(0.1, 0.3, 4, 4, 1.6, true), 0, 2, 0), 0x4a382a, 0.25, 1),
    tint(at(cone(2.4, 5.2, 5), 0, 4.4, 0), 0x1f3a27, 0.3, 2), tint(at(cone(1.5, 5.4, 5), 0, 8.2, 0, 0, 0.6, 0), 0x27432c, 0.3, 3)]);
}
function birchFarGeo() {
  return merge([tint(at(cyl(0.07, 0.16, 7, 4, 1.6, true), 0, 3.5, 0), 0xd8d4c8, 0.35, 3),
    tint(at(new THREE.IcosahedronGeometry(1, 0), 0.1, 6.2, 0, 0, 0, 0, 2.3, 1.9, 2.3), 0xc79a2e, 0.35, 5), tint(at(new THREE.IcosahedronGeometry(1, 0), 0.2, 7.5, -0.3, 0, 1, 0, 1.3, 1.1, 1.3), 0xb9832a, 0.35, 6)]);
}
function bushGeo() {
  const parts = [[0, 0.45, 0, 0.7], [0.5, 0.35, 0.2, 0.5], [-0.4, 0.3, -0.3, 0.45]]
    .map(([x, y, z, s], i) => tint(at(new THREE.IcosahedronGeometry(1, 1), x, y, z, 0, i * 2, 0, s, s * 0.8, s), i ? 0x5d4a2a : 0x3c4a2a, 0.4, i + 11));
  return merge(parts);
}
function rockGeo() {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + noise2(x * 1.7 + y * 2.3, z * 1.9 - y) * 0.26;
    p.setXYZ(i, x * k, y * k * 0.7, z * k);
  }
  g.computeVertexNormals();
  return tint(g, 0x8a8782, 0.22, 17);
}
function grassGeo() {
  const blades = [], c0 = new THREE.Color(0x56642e), c1 = new THREE.Color(0xb9b06a);
  for (let b = 0; b < 4; b++) {
    const h = 0.34 + (b % 3) * 0.07;
    const g = new THREE.PlaneGeometry(0.05, h, 1, 2), p = g.attributes.position, n = g.attributes.normal;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + h / 2) / h;
      p.setXYZ(i, p.getX(i) * (1 - t * 0.88), t * h, t * t * 0.16);
      n.setXYZ(i, 0, 1, 0);
      col[i * 3] = c0.r + (c1.r - c0.r) * t; col[i * 3 + 1] = c0.g + (c1.g - c0.g) * t; col[i * 3 + 2] = c0.b + (c1.b - c0.b) * t;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    blades.push(at(g, Math.cos(b * 1.7) * 0.07, 0, Math.sin(b * 1.7) * 0.07, 0.12 + (b % 2) * 0.2, b * 1.7 + 0.4, 0));
  }
  return merge(blades);
}

// ---- the meadow's plants (0.30) -----------------------------------------------------------------------------------
// Six painted plants (tools/art/world.py plants(): plants.webp, three wide and two high), each drawn as three crossed
// cards on the grass's own instances, so they cost no more draws than the blades did. [width, height] in metres.
export const PLANTS = [{ id: 'grass', size: [0.46, 0.36] }, { id: 'seed', size: [0.44, 0.6] }, { id: 'flowers', size: [0.52, 0.38] },
  { id: 'fern', size: [0.8, 0.68] }, { id: 'heather', size: [0.62, 0.4] }, { id: 'reeds', size: [0.52, 1.15] }];
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Which plant grows at (x, z), h metres up: reeds by the water, ferns along the wood, heather up the slopes,
 *  patches of flowers in the open meadow, and grass, some of it in seed, everywhere else. */
function plantKind(x, z, h) {
  const r = hash(x, z), wet = h < 1.35 || Math.abs(x - riverX(z)) < 10.5, fd = forestDensity(x, z);
  if (wet && r < 0.45) return 5;
  if (fd > 0.25 && r < 0.32) return 3;
  if (h > 12 && r < 0.4 * Math.min(1, (h - 12) / 10)) return 4;
  const meadow = noise2(x * 0.045 + 11, z * 0.045 - 4) > 0.22;
  if (r < (meadow ? 0.5 : 0.08) && fd < 0.3) return 2;
  return hash(z, x) < 0.3 ? 1 : 0;
}
/** Three crossed cards a metre square standing on their foot (the instance scales them), lighter toward the top. */
function plantGeo() {
  const cards = [];
  for (let k = 0; k < 3; k++) {
    const g = new THREE.PlaneGeometry(1, 1, 1, 2); g.translate(0, 0.5, 0);
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const t = p.getY(i), c = 0.82 + t * 0.3; col[i * 3] = c; col[i * 3 + 1] = c; col[i * 3 + 2] = c; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.rotateY((k * Math.PI) / 3); cards.push(g);
  }
  return merge(cards);
}
/** The tufts' material: the plant sheet, cut out where it is clear, each tuft reading its own square (aCell). */
function plantMaterial(url) {
  const map = new THREE.TextureLoader().load(url); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const mat = patch(new THREE.MeshLambertMaterial({ map, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.42 }), { sway: 0.07, snow: 1, upNormal: true });
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    base(sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * vec2(1.0 / 3.0, 0.5) + aCell;');
    // A blade's tip is thin: as the picture is drawn smaller (its smaller mip levels) the tip fades below the cut and
    // the tuft would end in a flat edge. So the farther down the mip chain, the more its edge is lifted.
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { vec2 tx = vMapUv * vec2(768.0, 512.0); float lod = max(0.0, 0.5 * log2(max(dot(dFdx(tx), dFdx(tx)), dot(dFdy(tx), dFdy(tx)))));
          diffuseColor.a *= 1.0 + lod * 0.45; }`);
  };
  const key = mat.customProgramCacheKey; mat.customProgramCacheKey = () => key() + '_plants';
  return mat;
}

const PICTURED = new Map();
/** A tree's picture as a material (one per picture, shared by the forest and by trees placed by hand). */
function pictured(url, sway, snow) {
  if (PICTURED.has(url)) return PICTURED.get(url);
  const ready = { ok: false }, map = new THREE.TextureLoader().load(url, () => { ready.ok = true; });
  map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.ClampToEdgeWrapping; map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  const p = { ready, mat: patch(new THREE.MeshLambertMaterial({ map, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.42 }), { sway, snow, upNormal: true }) }; // both sides of a bough take the light alike
  PICTURED.set(url, p);
  return p;
}
let standGeo = null;
/** Pines placed by hand (a story's grove): the forest's own tree, dressed as the forest draws it close to.
 *  `list` is [{ x, y, z, sc, ry }]; one draw for all of them. */
export function standOfPines(list) {
  const W3 = ART.world || {}, pic = W3.pine ? pictured(W3.pine, 0.0032, 0.8) : null;
  if (!standGeo) standGeo = pic ? pineNearGeo() : pineGeo();
  const mat = pic ? pic.mat : patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { sway: 0.0032, snow: 0.8 });
  const mesh = new THREE.InstancedMesh(standGeo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const ic = new Float32Array(list.length * 3);
  list.forEach((t, i) => {
    q.setFromEuler(e.set(0, t.ry, 0));
    mesh.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.sc, t.sc, t.sc)));
    const k = 0.85 + (i % 3) * 0.1; ic.set([k, k, k * 0.95], i * 3);
  });
  mesh.instanceColor = new THREE.InstancedBufferAttribute(ic, 3); mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere();
  return mesh;
}

export function scatterVegetation(scene, world, quality) {
  const R = rng(20241);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  const pines = [], birches = [];
  const add = (list, x, z, sc) => list.push({ x, z, y: heightAt(x, z) - 0.15, sc, ry: R() * 6.28 });
  const step = 5.6;
  for (let gx = -HALF + 6; gx < HALF - 6; gx += step) for (let gz = -HALF + 6; gz < HALF - 6; gz += step) {
    const x = gx + (R() - 0.5) * step, z = gz + (R() - 0.5) * step;
    const d = forestDensity(x, z);
    if (R() > d) continue;
    const h = heightAt(x, z);
    if (h < 1.0 || h > 74 || slopeAt(x, z) > 0.95) continue;
    const nearRiver = Math.abs(x - riverX(z)) < 38;
    if (R() < (nearRiver ? 0.55 : d < 0.25 ? 0.4 : 0.1)) add(birches, x, z, 0.75 + R() * 0.6);
    else add(pines, x, z, 0.75 + R() * 0.75);
  }
  // landmarks: the old birch at father's camp and the meeting tree on the village green
  birches.push({ x: POI.oldBirch.x, z: POI.oldBirch.z, y: heightAt(POI.oldBirch.x, POI.oldBirch.z) - 0.2, sc: 2.3, ry: 1 });
  birches.push({ x: 9, z: 50, y: heightAt(9, 50) - 0.2, sc: 2.0, ry: 2 });

  // ---- cells -------------------------------------------------------------------------------------------
  const cells = []; // { near, far, x, y, z, r, lodAt, range }
  const lodAt = quality === 'high' ? 300 : quality === 'low' ? 120 : 200, grassRange = quality === 'high' ? 110 : quality === 'low' ? 70 : 90;
  /** Put a batch of instances (each 16 numbers of matrix and 3 of colour, indexed by `idx`) on the map as one cell. */
  const cellOf = (geo, mat, mats, cols, idx, { cast, low = null, lowMat = null, ready = null, range = Infinity, extra = null }) => {
    const mesh = new THREE.InstancedMesh(extra ? geo.clone() : geo, mat, idx.length), ic = new Float32Array(idx.length * 3);
    idx.forEach((i, k) => { mesh.instanceMatrix.array.set(mats.subarray(i * 16, i * 16 + 16), k * 16); ic.set(cols.subarray(i * 3, i * 3 + 3), k * 3); });
    if (extra) { const d = new Float32Array(idx.length * extra.size); idx.forEach((i, k) => d.set(extra.data.subarray(i * extra.size, (i + 1) * extra.size), k * extra.size)); mesh.geometry.setAttribute(extra.name, new THREE.InstancedBufferAttribute(d, extra.size)); } // one more thing per instance (which plant a tuft is)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(ic, 3); mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = cast; mesh.receiveShadow = true; mesh.computeBoundingSphere(); // with bounds, the camera and the sun's shadow box each skip the cells they cannot see
    scene.add(mesh);
    let far = null;
    if (low) { // the same instances, drawn with the simpler shape
      far = new THREE.InstancedMesh(low, lowMat || mat, 0); far.count = idx.length; far.instanceMatrix = mesh.instanceMatrix; far.instanceColor = mesh.instanceColor;
      far.boundingSphere = mesh.boundingSphere.clone(); far.castShadow = false; far.receiveShadow = true; far.visible = false; scene.add(far);
    }
    const c = mesh.boundingSphere.center;
    cells.push({ near: mesh, far, ready, x: c.x, y: c.y, z: c.z, r: mesh.boundingSphere.radius, lodAt, range });
  };
  const byCell = (n, size, xz) => { const m = new Map(); for (let i = 0; i < n; i++) { const [x, z] = xz(i), k = Math.floor(x / size) + ',' + Math.floor(z / size); let a = m.get(k); if (!a) m.set(k, (a = [])); a.push(i); } return [...m.values()]; };
  /** A list of things of one shape, in cells `size` metres across. The matrices and colours are made in the list's own
   *  order, so the random stream, and with it every tree in the valley, is exactly where it was. */
  const instanced = (geo, mat, list, { cast = true, collide = 0, hue = 0.12, size = 128, low = null, lowMat = null, ready = null, range = Infinity } = {}) => {
    const mats = new Float32Array(list.length * 16), cols = new Float32Array(list.length * 3);
    list.forEach((t, i) => {
      e.set((R() - 0.5) * 0.06, t.ry, (R() - 0.5) * 0.06); q.setFromEuler(e);
      v.set(t.x, t.y, t.z); s.set(t.sc * (t.sx || 1), t.sc * (t.sy || 1), t.sc * (t.sz || 1));
      m4.compose(v, q, s).toArray(mats, i * 16);
      const k = 0.8 + R() * 0.4;
      col.setRGB(k * (1 + (R() - 0.5) * hue), k, k * (1 - R() * hue)).toArray(cols, i * 3);
      if (collide) world.addCircle(t.x, t.z, collide * t.sc, 8);
    });
    for (const idx of byCell(list.length, size, (i) => [list[i].x, list[i].z])) cellOf(geo, mat, mats, cols, idx, { cast, low, lowMat, ready, range });
  };
  const treeMat = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { sway: 0.0032, snow: 0.8 });
  const birchMat = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { sway: 0.006, snow: 0.7 });
  // Close to, trees wear their pictures (when the game has them); far off, and until a picture has loaded, they are
  // the plain shapes. One draw for a cell of trees either way.
  const W3 = ART.world || {}, pineFar = pineFarGeo(), birchFar = birchFarGeo(), rock = rockGeo();
  const pinePic = W3.pine ? pictured(W3.pine, 0.0032, 0.8) : null, birchPic = W3.birch ? pictured(W3.birch, 0.006, 0.7) : null;
  const pine = pinePic ? pineNearGeo() : pineGeo(), birch = birchPic ? birchNearGeo() : birchGeo();
  const pineOpt = { collide: 0.36, low: pineFar, ...(pinePic ? { lowMat: treeMat, ready: pinePic.ready } : {}) }, pineMat = pinePic ? pinePic.mat : treeMat;
  const birchOpt = { collide: 0.2, hue: 0.2, low: birchFar, ...(birchPic ? { lowMat: birchMat, ready: birchPic.ready } : {}) }, birchNearMat = birchPic ? birchPic.mat : birchMat;
  instanced(pine, pineMat, pines, pineOpt);
  instanced(birch, birchNearMat, birches, birchOpt);

  // bushes along the forest edge, rocks everywhere
  const bushes = [], rocks = [];
  for (let i = 0; i < 2600 && bushes.length < 800; i++) {
    const x = (R() - 0.5) * 560, z = (R() - 0.5) * 560, d = forestDensity(x, z), h = heightAt(x, z);
    if (d < 0.04 || d > 0.7 || h < 1 || h > 60 || distToPaths(x, z, 1.2) < 1.2) continue;
    bushes.push({ x, z, y: h - 0.05, sc: 0.7 + R() * 0.9, ry: R() * 6.28 });
  }
  for (let i = 0; i < 2400 && rocks.length < 520; i++) {
    const x = (R() - 0.5) * 600, z = (R() - 0.5) * 600, h = heightAt(x, z);
    if (h < -0.6 || distToPaths(x, z, 1.5) < 1.5 || inField(x, z) !== null) continue;
    const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
    if (dv < VILLAGE.r - 4 || Math.hypot(x - POI.farm.x, z - POI.farm.z) < 27) continue;
    const big = R() < 0.14 || slopeAt(x, z) > 0.5;
    const sc = big ? 1.1 + R() * 1.7 : 0.25 + R() * 0.5;
    rocks.push({ x, z, y: h - sc * 0.2, sc, sx: 0.8 + R() * 0.6, sy: 0.7 + R() * 0.5, sz: 0.8 + R() * 0.6, ry: R() * 6.28, big: sc > 1.05 });
  }
  instanced(bushGeo(), patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { sway: 0.02, snow: 0.8 }), bushes, { cast: false, size: 64, range: 260 });
  instanced(rock, M.vc, rocks, { hue: 0.05 });
  rocks.forEach((r) => { if (r.big) world.addCircle(r.x, r.z, 0.78 * r.sc, 1.2 * r.sc); });

  // grass
  const want = quality === 'high' ? 90000 : quality === 'low' ? 18000 : 52000;
  const plantsPic = (ART.world || {}).plants; // the painted tufts (plants.webp), else the drawn blades as before
  const grassMat = plantsPic ? plantMaterial(plantsPic) : patch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { sway: 0.5, snow: 1, upNormal: true });
  const gm = new Float32Array(want * 16), gc = new Float32Array(want * 3), gxz = new Float32Array(want * 2), gk = new Float32Array(want * 2);
  let n = 0;
  for (let i = 0; i < want * 6 && n < want; i++) {
    const x = -200 + R() * 425, z = -200 + R() * 355;
    const h = heightAt(x, z);
    if (h < 0.75 || h > 40) continue;
    if (distToPaths(x, z, 0.25) < 0.25 || inField(x, z) !== null) continue;
    if (Math.abs(x - riverX(z)) < 8.5) continue;
    const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
    const w = clamp(1.15 - forestDensity(x, z) * 1.3, 0.12, 1) * (dv < 40 ? 0.45 : 1) * (0.5 + 0.5 * (noise2(x * 0.08, z * 0.08) * 0.5 + 0.5));
    if (R() > w) continue;
    if (world.pointInBox(x, z, 0.2)) continue;
    const sc = 0.7 + R() * 0.9;
    e.set(0, R() * 6.28, 0); q.setFromEuler(e); v.set(x, h - 0.03, z);
    const kind = plantsPic ? plantKind(x, z, h) : 0, [pw, ph] = PLANTS[kind].size; // (its own dice: the valley's random stream is used as before)
    if (plantsPic) s.set(pw * sc, ph * sc, pw * sc); else s.set(sc, sc, sc);
    m4.compose(v, q, s).toArray(gm, n * 16); gxz[n * 2] = x; gxz[n * 2 + 1] = z; gk[n * 2] = (kind % 3) / 3; gk[n * 2 + 1] = 1 - (((kind / 3) | 0) + 1) / 2;
    const k = 0.75 + R() * 0.5, kg = R();
    if (!plantsPic) col.setRGB(k * (0.95 + kg * 0.3), k, k * 0.85); else if (kind < 2) { const kk = 1.1 + (k - 1) * 0.5; col.setRGB(kk * (1.12 + kg * 0.18), kk * 1.08, kk * 0.82); } // the painted grass is darker than the ground's: lifted to meet it else col.setRGB(0.85 + k * 0.2, 0.85 + k * 0.2, 0.82 + k * 0.2); // grass is tinted as before; flowers keep their own colours
    col.toArray(gc, n * 3);
    n++;
  }
  const grassG = plantsPic ? plantGeo() : grassGeo(); // a blade is a few centimetres wide: past ninety metres or so it is less than a pixel, so the cells out there are not drawn
  for (const idx of byCell(n, 40, (i) => [gxz[i * 2], gxz[i * 2 + 1]])) cellOf(grassG, grassMat, gm, gc, idx, { cast: false, range: grassRange, extra: plantsPic ? { name: 'aCell', data: gk, size: 2 } : null });
  // the sea chart: wind-bent pines and birch in groves, boulders on every shore (own random stream, so
  // the valley's trees stay exactly where the story expects them)
  const R2 = rng(9117), ip = [], ib = [], ir = [];
  const clearOf = (x, z) => SEA_CLEAR.every(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) > cr);
  for (const il of ISLES) {
    const nT = il.bare ? 0 : Math.round(il.r * 0.6), nR = Math.round(il.r * (il.bare ? 0.9 : 0.5));
    for (let i = 0, k = 0; i < nT * 5 && k < nT; i++) {
      const a = R2() * 6.28, d = Math.sqrt(R2()) * il.r * 0.8, x = il.x + Math.cos(a) * d, z = il.z + Math.sin(a) * d, h = heightAt(x, z);
      if (h < 1.8 || h > 24 || slopeAt(x, z) > 0.6 || !clearOf(x, z) || noise2(x * 0.035, z * 0.035) < 0.02) continue;
      (R2() < 0.3 ? ib : ip).push({ x, z, y: h - 0.15, sc: 0.6 + R2() * 0.6, ry: R2() * 6.28 }); k++;
    }
    for (let i = 0; i < nR; i++) {
      const a = R2() * 6.28, d = Math.sqrt(R2()) * il.r * 0.92, x = il.x + Math.cos(a) * d, z = il.z + Math.sin(a) * d, h = heightAt(x, z);
      if (h < -0.5 || !clearOf(x, z)) continue;
      const big = R2() < 0.16 || slopeAt(x, z) > 0.5, sc = big ? 1.1 + R2() * 1.9 : 0.3 + R2() * 0.6;
      ir.push({ x, z, y: h - sc * 0.2, sc, sx: 0.8 + R2() * 0.6, sy: 0.7 + R2() * 0.5, sz: 0.8 + R2() * 0.6, ry: R2() * 6.28, big: sc > 1.05 });
    }
  }
  // the great islands: woods where the story wants woods, boulders on every slope, nothing on level ground or roads
  // (a third random stream, so nothing above moves)
  const R3 = rng(4471);
  for (const il of GREAT) {
    const span = il.r * (il.k || 1), nT = Math.round(span * il.forest * 2.4), nR = Math.round(span * 0.55);
    for (let i = 0, k = 0; i < nT * 6 && k < nT; i++) {
      const a = R3() * 6.28, d = Math.sqrt(R3()) * span, x = il.x + Math.cos(a) * d, z = il.z + Math.sin(a) * d, h = heightAt(x, z);
      if (h < (il.marsh ? 0.5 : 2) || h > 46 || slopeAt(x, z) > 0.6 || !realmClear(il, x, z) || noise2(x * 0.02 + 3, z * 0.02) < (il.forest > 0.4 ? -0.25 : 0.1)) continue;
      (R3() < (il.marsh ? 0.8 : 0.3) ? ib : ip).push({ x, z, y: h - 0.15, sc: 0.7 + R3() * 0.7, ry: R3() * 6.28 }); k++;
    }
    for (let i = 0; i < nR; i++) {
      const a = R3() * 6.28, d = Math.sqrt(R3()) * span, x = il.x + Math.cos(a) * d, z = il.z + Math.sin(a) * d, h = heightAt(x, z);
      if (h < -0.5 || !realmClear(il, x, z)) continue;
      const big = R3() < 0.18 || slopeAt(x, z) > 0.5, sc = big ? 1.2 + R3() * 2.2 : 0.3 + R3() * 0.6;
      ir.push({ x, z, y: h - sc * 0.2, sc, sx: 0.8 + R3() * 0.6, sy: 0.7 + R3() * 0.5, sz: 0.8 + R3() * 0.6, ry: R3() * 6.28, big: sc > 1.05 });
    }
  }
  // the mainland coast: woods where the story hunts and cuts timber, a thin scatter elsewhere (a fourth stream)
  const R4 = rng(9127);
  for (const il of MAIN) {
    const put = (x, z, birch) => {
      const h = heightAt(x, z);
      if (h < 2.2 || h > 60 || slopeAt(x, z) > 0.7 || !realmClear(il, x, z)) return;
      (R4() < birch ? ib : ip).push({ x, z, y: h - 0.15, sc: 0.7 + R4() * 0.7, ry: R4() * 6.28 });
    };
    for (const w of il.woods || []) for (let i = 0, n = Math.round(w[2] * w[2] * 0.02); i < n; i++) { const a = R4() * 6.28, d = Math.sqrt(R4()) * w[2]; put(il.x + w[0] + Math.cos(a) * d, il.z + w[1] + Math.sin(a) * d, w[3]); }
    for (let i = 0; i < 260; i++) put(il.x + (R4() - 0.5) * 2 * il.half, il.z + (R4() - 0.5) * 2 * il.half, 0.35);
    for (let i = 0; i < 150; i++) {
      const x = il.x + (R4() - 0.5) * 2 * il.half, z = il.z + (R4() - 0.5) * 2 * il.half, h = heightAt(x, z);
      if (h < -0.5 || !realmClear(il, x, z)) continue;
      const big = R4() < 0.15 || slopeAt(x, z) > 0.5, sc = big ? 1.2 + R4() * 2 : 0.3 + R4() * 0.6;
      ir.push({ x, z, y: h - sc * 0.2, sc, sx: 0.8 + R4() * 0.6, sy: 0.7 + R4() * 0.5, sz: 0.8 + R4() * 0.6, ry: R4() * 6.28, big: sc > 1.05 });
    }
  }
  instanced(pine, pineMat, ip, pineOpt);
  instanced(birch, birchNearMat, ib, birchOpt);
  instanced(rock, M.vc, ir, { hue: 0.05 });
  ir.forEach((r) => { if (r.big) world.addCircle(r.x, r.z, 0.78 * r.sc, 1.2 * r.sc); });

  // The islands' and the coasts' ground cover (0.30): the painted tufts the valley has, a third as thick, on every
  // island of the chart, every great island and every stretch of mainland. There is far more land out there than in
  // the valley, so each piece is built only the first time the camera comes within a few hundred metres of it, and
  // a few milliseconds at a time in the gaps between frames, each with its own dice (nothing above moves).
  const patches = [];
  if (plantsPic) {
    ISLES.forEach((il, i) => patches.push({ x: il.x, z: il.z, half: il.r, seed: 7000 + i, clear: (x, z) => clearOf(x, z), wood: il.bare ? 9 : 0.1 }));
    GREAT.forEach((il, i) => patches.push({ x: il.x, z: il.z, half: il.half, seed: 7100 + i, clear: (x, z) => realmClear(il, x, z), wood: il.forest > 0.4 ? -0.25 : 0.1, marsh: !!il.marsh }));
    MAIN.forEach((il, i) => patches.push({ x: il.x, z: il.z, half: il.half, seed: 7200 + i, clear: (x, z) => realmClear(il, x, z), wood: 0.1 }));
  }
  const PER_M2 = quality === 'high' ? 0.18 : quality === 'low' ? 0.06 : 0.13;
  let growing = null;
  /** Which plant grows at (x, z), h up, on an island: reeds by the water, heather up the hills, ferns where the
   *  island's woods are, flowers in patches of open grass, and grass (some in seed). */
  const isleKind = (x, z, h, P) => {
    const r = hash(x, z);
    if (h < (P.marsh ? 1.2 : 1.5) && r < (P.marsh ? 0.6 : 0.45)) return 5;
    if (noise2(x * 0.02 + 3, z * 0.02) > P.wood + 0.1 && r < 0.3) return 3;
    if (h > 11 && r < 0.28 * Math.min(1, (h - 11) / 10)) return 4;
    if (r < (noise2(x * 0.045 + 11, z * 0.045 - 4) > 0.22 ? 0.45 : 0.06)) return 2;
    return hash(z, x) < 0.35 ? 1 : 0;
  };
  /** Scatter one piece's tufts for up to `ms` milliseconds; when all are placed, put them in cells and in the scene. */
  const grow = (P, ms) => {
    const t0 = performance.now();
    if (!P.g) { const n = Math.round(4 * P.half * P.half * PER_M2); P.g = { R: rng(P.seed), n, i: 0, k: 0, m: new Float32Array(n * 16), c: new Float32Array(n * 3), cell: new Float32Array(n * 2), xz: new Float32Array(n * 2) }; }
    const G = P.g;
    for (; G.i < G.n && performance.now() - t0 < ms; G.i++) {
      const x = P.x + (G.R() - 0.5) * 2 * P.half, z = P.z + (G.R() - 0.5) * 2 * P.half, ry = G.R() * 6.28, sc = 0.95 + G.R() * 0.85, k = 0.8 + G.R() * 0.4, kg = G.R();
      const h = heightAt(x, z);
      if (h < 0.35 || h > 40 || slopeAt(x, z) > 0.75 || !P.clear(x, z) || world.pointInBox(x, z, 0.3)) continue;
      const kind = isleKind(x, z, h, P), [pw, ph] = PLANTS[kind].size;
      e.set(0, ry, 0); q.setFromEuler(e); v.set(x, h - 0.03, z); s.set(pw * sc, ph * sc, pw * sc);
      m4.compose(v, q, s).toArray(G.m, G.k * 16); G.xz[G.k * 2] = x; G.xz[G.k * 2 + 1] = z;
      G.cell[G.k * 2] = (kind % 3) / 3; G.cell[G.k * 2 + 1] = 1 - (((kind / 3) | 0) + 1) / 2;
      if (kind < 2) { const kk = 1.1 + (k - 1) * 0.5; col.setRGB(kk * (1.12 + kg * 0.18), kk * 1.08, kk * 0.82); } else if (kind === 4) col.setRGB(1.25, 1.18, 1.22); else col.setRGB(0.85 + k * 0.2, 0.85 + k * 0.2, 0.82 + k * 0.2); // heather is a dark picture: lifted, so it does not read as a hole in the grass
      col.toArray(G.c, G.k * 3); G.k++;
    }
    if (G.i < G.n) return false;
    const geo = plantGeo();
    for (const idx of byCell(G.k, 40, (i) => [G.xz[i * 2], G.xz[i * 2 + 1]])) cellOf(geo, grassMat, G.m, G.c, idx, { cast: false, range: grassRange, extra: { name: 'aCell', data: G.cell, size: 2 } });
    P.g = null; P.done = true; P.count = G.k;
    return true;
  };
  /** Start the next piece the camera is near, and grow it in the gaps between frames. */
  const tend = (cx, cz) => {
    if (growing) return;
    const P = patches.find((P) => !P.done && Math.hypot(P.x - cx, P.z - cz) < P.half + 320);
    if (!P) return;
    growing = P;
    const step = (dl) => { if (grow(P, dl ? Math.max(2, Math.min(8, dl.timeRemaining() - 1)) : 6)) { growing = null; return; } window.requestIdleCallback ? requestIdleCallback(step, { timeout: 200 }) : setTimeout(step, 16); };
    step(null);
  };
  /** Each frame, before drawing: which cells are worth drawing from where the camera is (and nothing past the haze). */
  const update = (cam, density) => {
    const haze = hazeRange(cam, density), cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    if (patches.length) tend(cx, cz);
    let shown = 0;
    for (const c of cells) {
      const d = Math.hypot(c.x - cx, c.y - cy, c.z - cz) - c.r, seen = d < Math.min(haze, c.range), near = seen && (!c.far || (d < c.lodAt && (!c.ready || c.ready.ok)));
      c.near.visible = near; if (c.far) c.far.visible = seen && !near;
      if (seen) shown++;
    }
    return shown;
  };
  /** Grow every piece now (a test that wants them all). */
  const growAll = () => { for (const P of patches) if (!P.done) grow(P, Infinity); };
  return { update, cells, growAll, patches, counts: { pines: pines.length, birches: birches.length, bushes: bushes.length, rocks: rocks.length, grass: n, isles: ip.length + ib.length + ir.length, cells: cells.length } };
}
