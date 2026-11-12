// Instanced forest, undergrowth, rocks and grass.
import * as THREE from 'three';
import { rng, noise2, clamp } from '../core/util.js';
import { M, at, cyl, cone, tint, merge, patch } from './geo.js';
import { heightAt, slopeAt, forestDensity, distToPaths, inField, riverX, HALF } from './terrain.js';
import { VILLAGE, POI } from './layout.js';

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

  const instanced = (geo, mat, list, { cast = true, collide = 0, hue = 0.12 } = {}) => {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((t, i) => {
      e.set((R() - 0.5) * 0.06, t.ry, (R() - 0.5) * 0.06); q.setFromEuler(e);
      v.set(t.x, t.y, t.z); s.set(t.sc * (t.sx || 1), t.sc * (t.sy || 1), t.sc * (t.sz || 1));
      mesh.setMatrixAt(i, m4.compose(v, q, s));
      const k = 0.8 + R() * 0.4;
      mesh.setColorAt(i, col.setRGB(k * (1 + (R() - 0.5) * hue), k, k * (1 - R() * hue)));
      if (collide) world.addCircle(t.x, t.z, collide * t.sc, 8);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = cast; mesh.receiveShadow = true; mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  };
  const treeMat = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { sway: 0.0032, snow: 0.8 });
  const birchMat = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { sway: 0.006, snow: 0.7 });
  instanced(pineGeo(), treeMat, pines, { collide: 0.36 });
  instanced(birchGeo(), birchMat, birches, { collide: 0.2, hue: 0.2 });

  // bushes along the forest edge, rocks everywhere
  const bushes = [], rocks = [];
  for (let i = 0; i < 2600 && bushes.length < 800; i++) {
    const x = (R() - 0.5) * 560, z = (R() - 0.5) * 560, d = forestDensity(x, z), h = heightAt(x, z);
    if (d < 0.04 || d > 0.7 || h < 1 || h > 60 || distToPaths(x, z) < 1.2) continue;
    bushes.push({ x, z, y: h - 0.05, sc: 0.7 + R() * 0.9, ry: R() * 6.28 });
  }
  for (let i = 0; i < 2400 && rocks.length < 520; i++) {
    const x = (R() - 0.5) * 600, z = (R() - 0.5) * 600, h = heightAt(x, z);
    if (h < -0.6 || distToPaths(x, z) < 1.5 || inField(x, z) !== null) continue;
    const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
    if (dv < VILLAGE.r - 4) continue;
    const big = R() < 0.14 || slopeAt(x, z) > 0.5;
    const sc = big ? 1.1 + R() * 1.7 : 0.25 + R() * 0.5;
    rocks.push({ x, z, y: h - sc * 0.2, sc, sx: 0.8 + R() * 0.6, sy: 0.7 + R() * 0.5, sz: 0.8 + R() * 0.6, ry: R() * 6.28, big: sc > 1.05 });
  }
  instanced(bushGeo(), patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { sway: 0.02, snow: 0.8 }), bushes, { cast: false });
  const rockMesh = instanced(rockGeo(), M.vc, rocks, { hue: 0.05 });
  rocks.forEach((r) => { if (r.big) world.addCircle(r.x, r.z, 0.78 * r.sc, 1.2 * r.sc); });

  // grass
  const want = quality === 'high' ? 90000 : quality === 'low' ? 18000 : 52000;
  const grass = new THREE.InstancedMesh(grassGeo(), patch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { sway: 0.5, snow: 1, upNormal: true }), want);
  let n = 0;
  for (let i = 0; i < want * 6 && n < want; i++) {
    const x = -200 + R() * 330, z = -175 + R() * 330;
    const h = heightAt(x, z);
    if (h < 0.75 || h > 40) continue;
    if (distToPaths(x, z) < 0.25 || inField(x, z) !== null) continue;
    if (Math.abs(x - riverX(z)) < 8.5) continue;
    const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
    const w = clamp(1.15 - forestDensity(x, z) * 1.3, 0.12, 1) * (dv < 40 ? 0.45 : 1) * (0.5 + 0.5 * (noise2(x * 0.08, z * 0.08) * 0.5 + 0.5));
    if (R() > w) continue;
    if (world.pointInBox(x, z, 0.2)) continue;
    const sc = 0.7 + R() * 0.9;
    e.set(0, R() * 6.28, 0); q.setFromEuler(e); v.set(x, h - 0.03, z); s.set(sc, sc, sc);
    grass.setMatrixAt(n, m4.compose(v, q, s));
    const k = 0.75 + R() * 0.5;
    grass.setColorAt(n, col.setRGB(k * (0.95 + R() * 0.3), k, k * 0.85));
    n++;
  }
  grass.count = n;
  grass.instanceMatrix.needsUpdate = true; grass.instanceColor.needsUpdate = true;
  grass.receiveShadow = true; grass.castShadow = false; grass.frustumCulled = false;
  scene.add(grass);
  return { grass, rockMesh, counts: { pines: pines.length, birches: birches.length, bushes: bushes.length, rocks: rocks.length, grass: n } };
}
