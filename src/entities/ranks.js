// Rank and file: the men of a shield wall, drawn as copies of one braced figure (instanced meshes), so that a line
// of a hundred costs about as much to draw as one jointed character. Each man is a rigid pose (knees bent, shield up,
// spear or axe over the rim) that leans, heaves, recoils and falls as a whole, with a weapon arm that moves on its own.
// PLACEHOLDER art, like the jointed figure in humanoid.js, and built to the same measurements so the two stand together.
import * as THREE from 'three';
import { M, at, box, cyl, cone, sphere, tint, merge as mergeGeo, shieldGeo } from '../world/geo.js';
import { dress } from './humanoid.js';

/** Join pieces into one. Each says what it is made of (wool, leather, hair: see STUFF in geo.js) so that the rank and
 *  file wear the same weave and leather as the jointed figures beside them; a piece that says nothing is plain. */
const merge = (list) => mergeGeo(list.map((g) => (g.attributes.cell ? g : dress(g, 'plain'))));
const wool = (g) => dress(g, 'wool'), hide = (g) => dress(g, 'leather'), hairy = (g) => dress(g, 'hair');

const UP = new THREE.Vector3(0, 1, 0), SHOULDER = new THREE.Vector3(-0.2, 1.36, 0.13);
const _m = new THREE.Matrix4(), _a = new THREE.Matrix4(), _b = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** A limb: a capsule from one point to another. */
function limb(a, b, r) {
  const va = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(va), len = d.length();
  const g = new THREE.CapsuleGeometry(r, len, 1, 5);
  g.applyMatrix4(new THREE.Matrix4().compose(va.addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), new THREE.Vector3(1, 1, 1)));
  return g;
}
const white = (g, seed) => wool(tint(g, 0xffffff, 0.1, seed));

/** The figure, facing +z with his feet at the origin, in the pieces that are coloured or moved separately. */
function build() {
  const SKIN = 0xd3a283, LEGS = 0x4b4034, BOOT = 0x33261a, IRON = 0x70747a, WOOD = 0x7a5c3c, HAIR = 0x5a4028;
  // cloth: takes the colour of his tunic
  const cloth = merge([
    white(at(cyl(0.2, 0.165, 0.5, 7), 0, 1.12, 0.07, 0.28, 0, 0, 1, 1, 0.68), 1),
    white(at(cyl(0.176, 0.25, 0.36, 7, 1.6, true), 0, 0.74, 0, 0.1, 0, 0, 1, 1, 0.82), 2),
    white(at(sphere(0.086, 5, 4), 0.2, 1.36, 0.13), 3), white(at(sphere(0.086, 5, 4), -0.2, 1.36, 0.13), 4),
    white(limb([0.2, 1.35, 0.13], [0.25, 1.13, 0.3], 0.054), 5),
  ]);
  // what is the same on every man: legs, boots, belt, skin, beard, the shield's boss and grip
  const fixed = merge([
    wool(tint(limb([0.1, 0.86, 0], [0.12, 0.47, 0.2], 0.076), LEGS, 0.06, 6)), wool(tint(limb([0.12, 0.47, 0.2], [0.11, 0.09, 0.22], 0.058), LEGS, 0.1, 7)),
    wool(tint(limb([-0.1, 0.86, 0], [-0.12, 0.46, -0.08], 0.076), LEGS, 0.06, 8)), wool(tint(limb([-0.12, 0.46, -0.08], [-0.11, 0.09, -0.3], 0.058), LEGS, 0.1, 9)),
    hide(tint(at(box(0.105, 0.1, 0.25), 0.11, 0.05, 0.27), BOOT, 0.06, 10)), hide(tint(at(box(0.105, 0.1, 0.25), -0.11, 0.05, -0.26, 0, 0.25, 0), BOOT, 0.06, 11)),
    hide(tint(at(cyl(0.184, 0.184, 0.055, 7, 1.6, true), 0, 0.905, 0.012, 0.1, 0, 0, 1, 1, 0.82), 0x3b2a1a, 0.05, 12)),
    tint(at(cyl(0.05, 0.058, 0.13, 5, 1.6, true), 0, 1.44, 0.165, 0.28, 0, 0), SKIN, 0.03, 13),
    tint(at(sphere(0.112, 7, 5), 0, 1.585, 0.2, 0, 0, 0, 0.95, 1.13, 1.02), SKIN, 0.03, 14),
    tint(at(box(0.022, 0.042, 0.03), 0, 1.573, 0.312), SKIN, 0.02, 15),
    hairy(tint(at(sphere(0.098, 5, 4), 0, 1.52, 0.232, 0, 0, 0, 0.95, 0.85, 0.9), HAIR, 0.14, 16)),
    tint(limb([0.25, 1.13, 0.3], [0.1, 1.15, 0.45], 0.045), SKIN, 0.04, 17),
    tint(at(sphere(0.07, 5, 3), 0.05, 1.12, 0.535, 0, 0, 0, 1, 1, 0.6), IRON, 0, 18),
  ]);
  // the top of his head: iron for a helmet, or the colour of his hair
  const cap = merge([tint(at(new THREE.SphereGeometry(0.128, 7, 3, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 1.6, 0.2, -0.1, 0, 0, 1, 1.12, 1.05), 0xffffff, 0.1, 19)]);
  // the shield: one of the four painted ones (TEX.shields), a copy of the figure for each
  const shields = [0, 1, 2, 3].map((d) => at(at(shieldGeo(0.4, 0.03, d, 12), 0, 0, 0, Math.PI / 2, 0, 0), 0.05, 1.12, 0.5, -0.06, 0, 0));
  // the weapon arm, about the shoulder: a spear held overhand, or an axe raised
  const S = SHOULDER, off = (g) => at(g, -S.x, -S.y, -S.z);
  const spear = merge([
    tint(off(limb([S.x, S.y, S.z], [-0.3, 1.47, -0.02], 0.054)), SKIN, 0.04, 20), tint(off(limb([-0.3, 1.47, -0.02], [-0.27, 1.6, 0.14], 0.045)), SKIN, 0.04, 21),
    off(at(merge([tint(at(cyl(0.015, 0.017, 2.0, 5), 0, 0, 0.35, Math.PI / 2, 0, 0), WOOD, 0.08, 22), tint(at(cone(0.035, 0.26, 4), 0, 0, 1.47, Math.PI / 2, 0, 0), IRON, 0, 23)]), -0.27, 1.6, 0.14, 0.07, 0, 0)),
  ]);
  const axe = merge([
    tint(off(limb([S.x, S.y, S.z], [-0.32, 1.5, 0.0], 0.054)), SKIN, 0.04, 25), tint(off(limb([-0.32, 1.5, 0.0], [-0.3, 1.72, 0.1], 0.045)), SKIN, 0.04, 26),
    off(at(merge([tint(at(cyl(0.016, 0.018, 0.74, 5), 0, 0.25, 0), WOOD, 0.08, 27), tint(at(box(0.03, 0.17, 0.2), 0, 0.56, 0.1), IRON, 0, 28)]), -0.3, 1.72, 0.1, 0.5, 0, 0)),
  ]);
  return { cloth, fixed, cap, shields, spear, axe };
}

let GEO = null;

export class Ranks {
  /** One set of instanced meshes for every man of every wall in the scene. */
  static get(scene, max = 420) { if (!scene.userData.ranks) scene.userData.ranks = new Ranks(scene, max); return scene.userData.ranks; }
  constructor(scene, max) {
    GEO = GEO || build();
    this.max = max; this.used = new Uint8Array(max); this.dsg = new Uint8Array(max); this.n = 0;
    const mk = (geo, shadow, mat = M.char) => { const m = new THREE.InstancedMesh(geo, mat, max); m.count = 0; m.frustumCulled = false; m.castShadow = shadow; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m; };
    this.cloth = mk(GEO.cloth, true); this.fixed = mk(GEO.fixed, false); this.cap = mk(GEO.cap, false); this.spear = mk(GEO.spear, false); this.axe = mk(GEO.axe, false);
    this.shields = GEO.shields.map((geo) => mk(geo, true, M.shield)); // the body and the shield throw the shadow
    this.all = [this.cloth, this.fixed, this.cap, ...this.shields, this.spear, this.axe];
    for (let i = 0; i < max; i++) for (const m of this.all) m.setMatrixAt(i, ZERO);
    for (const m of [this.cloth, this.cap]) m.setColorAt(0, _c.set(0xffffff)); // makes the colour buffer (white until a man takes the place)
  }
  /** Take a place for one man. design: which of the four painted shields he carries. Returns his index, or -1 when every place is taken. */
  take(tunic, cap, design = 0) {
    let i = 0; while (i < this.max && this.used[i]) i++;
    if (i >= this.max) return -1;
    this.used[i] = 1; this.dsg[i] = design & 3; this.n = Math.max(this.n, i + 1);
    this.cloth.setColorAt(i, _c.set(tunic)); this.cap.setColorAt(i, _c.set(cap));
    this.dirtyColor = true;
    return i;
  }
  free(i) {
    if (i < 0 || !this.used[i]) return;
    this.used[i] = 0; for (const m of this.all) m.setMatrixAt(i, ZERO);
    while (this.n > 0 && !this.used[this.n - 1]) this.n--;
    this.dirty = true;
  }
  /** Place one man. pitch: forward lean (falling over is ±1.5); arm: 0 at rest .. 1 struck out, below 0 drawn back; kind: 0 spear, 1 axe. */
  set(i, x, y, z, yaw, pitch, arm, kind, scale = 1) {
    _e.set(pitch, yaw, 0); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(scale, scale, scale));
    this.cloth.setMatrixAt(i, _m); this.fixed.setMatrixAt(i, _m); this.cap.setMatrixAt(i, _m);
    for (let d = 0; d < 4; d++) this.shields[d].setMatrixAt(i, d === this.dsg[i] ? _m : ZERO);
    // the arm turns about the shoulder: a spear goes out along its own line; an axe comes over and down
    if (kind) _a.makeRotationX(arm * 1.25); else { _a.makeRotationX(Math.max(0, arm) * 0.1); _a.setPosition(0, -Math.max(0, arm) * 0.05, arm * 0.55); }
    _b.makeTranslation(SHOULDER.x, SHOULDER.y, SHOULDER.z).multiply(_a); _a.multiplyMatrices(_m, _b);
    (kind ? this.axe : this.spear).setMatrixAt(i, _a); (kind ? this.spear : this.axe).setMatrixAt(i, ZERO);
    this.dirty = true;
  }
  /** Call once a frame after the men have been placed. */
  commit() {
    if (this.dirty) { for (const m of this.all) { m.count = this.n; m.instanceMatrix.needsUpdate = true; } this.dirty = false; }
    if (this.dirtyColor) { for (const m of [this.cloth, this.cap]) m.instanceColor.needsUpdate = true; this.dirtyColor = false; }
  }
}
