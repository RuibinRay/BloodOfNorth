// Farm animals of Bjornstead that the story names: Old Skeggi the goat, the pigs, the red cow. Stand-in models with
// four legs that swing (userData.legs), like the horse in wildlife.js.
import * as THREE from 'three';
import { M, at, cyl, cone, sphere, capsule, tint, merge } from '../world/geo.js';
import { dress } from './humanoid.js';

// What each piece is covered in (TEX.beast, as in wildlife.js); a piece that says nothing is plain.
const all = (geos) => merge(geos.map((g) => (g.attributes.cell ? g : dress(g, 'plain'))));
const pelt = (g) => dress(g, 'pelt'), coat = (g) => dress(g, 'coat');

function beast(parts, legs, legLen, legCol) {
  const g = new THREE.Group(), body = new THREE.Mesh(all(parts), M.beast); body.castShadow = true; g.add(body);
  g.userData.legs = [];
  for (const [x, z] of legs) { const leg = new THREE.Group(); leg.position.set(x, legLen, z); const m = new THREE.Mesh(all([coat(tint(at(cyl(0.045, 0.03, legLen, 5), 0, -legLen / 2, 0), legCol, 0.1, 3))]), M.beast); m.castShadow = true; leg.add(m); g.add(leg); g.userData.legs.push(leg); }
  return g;
}
export function goatModel() {
  const c = 0xcfc8b8, d = 0x4a4238;
  return beast([pelt(tint(at(capsule(0.17, 0.5, 6), 0, 0.56, 0, Math.PI / 2, 0, 0), c, 0.12, 1)), coat(tint(at(sphere(0.11, 7, 6), 0, 0.8, 0.42, 0.3, 0, 0, 0.9, 1, 1.5), c, 0.1, 2)),
    tint(at(cone(0.025, 0.24, 5), 0.06, 0.96, 0.34, -0.9, 0, 0.15), d, 0.1, 4), tint(at(cone(0.025, 0.24, 5), -0.06, 0.96, 0.34, -0.9, 0, -0.15), d, 0.1, 5),
    pelt(tint(at(cone(0.035, 0.16, 5), 0, 0.66, 0.5, Math.PI, 0, 0), c, 0.1, 6)), pelt(tint(at(cone(0.03, 0.12, 4), 0, 0.66, -0.42, -1.2, 0, 0), c, 0.1, 7))], [[0.1, 0.24], [-0.1, 0.24], [0.1, -0.24], [-0.1, -0.24]], 0.42, d);
}
export function pigModel() {
  const c = 0xc79a88;
  return beast([coat(tint(at(capsule(0.23, 0.5, 6), 0, 0.42, 0, Math.PI / 2, 0, 0), c, 0.12, 1)), coat(tint(at(sphere(0.16, 7, 6), 0, 0.46, 0.46, 0, 0, 0, 1, 1, 1.2), c, 0.1, 2)), tint(at(cyl(0.07, 0.08, 0.1, 7), 0, 0.42, 0.66, Math.PI / 2, 0, 0), 0xb07a70, 0.1, 3)],
    [[0.13, 0.24], [-0.13, 0.24], [0.13, -0.24], [-0.13, -0.24]], 0.24, 0x8a6a5c);
}
export function cowModel() {
  const c = 0x8a3a24;
  return beast([coat(tint(at(capsule(0.36, 0.95, 7), 0, 1.02, 0, Math.PI / 2, 0, 0), c, 0.12, 1)), coat(tint(at(sphere(0.2, 7, 6), 0, 1.2, 0.86, 0.4, 0, 0, 0.9, 1, 1.6), c, 0.1, 2)),
    tint(at(cone(0.035, 0.26, 5), 0.16, 1.4, 0.74, 0, 0, -0.9), 0xd8d0b8, 0.1, 4), tint(at(cone(0.035, 0.26, 5), -0.16, 1.4, 0.74, 0, 0, 0.9), 0xd8d0b8, 0.1, 5), tint(at(sphere(0.13, 6, 5), 0, 0.62, -0.2, 0, 0, 0, 1.2, 0.7, 1.2), 0xd8b8a8, 0.1, 6)],
    [[0.2, 0.5], [-0.2, 0.5], [0.2, -0.5], [-0.2, -0.5]], 0.72, 0x5a2a1c);
}
