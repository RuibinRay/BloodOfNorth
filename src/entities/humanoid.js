// Procedural articulated character: a jointed figure built from primitives with a pose-blending
// animator. PLACEHOLDER art — the rig interface (joints, play/setLoop/hold) is what the game codes
// against, so rigged GLB characters can replace the meshes later without touching gameplay.
import * as THREE from 'three';
import { clamp, smoothstep } from '../core/util.js';
import { M, at, box, cyl, cone, sphere, capsule, tint, merge } from '../world/geo.js';

const D = { hip: 0.94, thigh: 0.44, shin: 0.44, chestY: 0.2, shoulderY: 0.3, shoulderX: 0.2, neckY: 0.42, upper: 0.29, fore: 0.27 };
const DEFAULT_LOOK = {
  scale: 1, child: false, female: false, build: 1, skin: 0xd8a888, hair: 0x6b4a2b, hairStyle: 'short', beard: null,
  tunic: 0x6f6048, trim: 0x8a2f25, legs: 0x4b4034, boots: 0x33261a, cloak: null, fur: false, helmet: false, apron: null,
};
const POSE_KEYS = ['hy', 'hrx', 'hry', 'crx', 'cry', 'crz', 'nrx', 'nry', 'slx', 'sly', 'slz', 'srx', 'sry', 'srz', 'elL', 'elR', 'llx', 'llz', 'lrx', 'lrz', 'knL', 'knR', 'pitch', 'by'];
const REST = { slz: 0.09, srz: -0.09, elL: -0.12, elR: -0.12 };

// ---- persistent overlay poses -----------------------------------------------------------
const LOOPS = {
  block: (p) => { p.srx = -1.45; p.sry = 0.55; p.srz = 0; p.elR = -1.5; p.slx = -0.5; p.elL = -1.2; p.crx = 0.1; p.knL = p.knR = 0.3; p.hy = -0.04; },
  guard: (p) => { p.srx = -0.75; p.sry = 0.2; p.elR = -1.0; p.slx = -0.5; p.elL = -0.9; p.knL = p.knR = 0.22; p.hy = -0.03; p.crx = 0.08; },
  aim: (p, t, h) => { const d = h.param; p.cry = -0.45; p.slx = -1.5; p.sly = 0.45; p.slz = 0; p.elL = -0.05; p.srx = -1.45; p.sry = -0.6 - 0.5 * d; p.srz = 0; p.elR = -0.8 - 1.5 * d; p.nry = 0.3; },
  carry: (p) => { p.slx = p.srx = -0.6; p.elL = p.elR = -1.4; },
  sit: (p) => { p.hy = -0.52; p.llx = p.lrx = -1.45; p.knL = p.knR = 1.5; p.crx = 0.14; p.slx = p.srx = -0.5; p.elL = p.elR = -0.6; },
  warm: (p, t) => { p.hy = -0.52; p.llx = p.lrx = -1.45; p.knL = p.knR = 1.5; p.crx = 0.3; p.slx = p.srx = -1.15 + Math.sin(t * 1.3) * 0.04; p.elL = p.elR = -0.3; p.nrx = 0.2; },
  kneel: (p) => { p.hy = -0.43; p.llx = -1.4; p.knL = 1.5; p.lrx = 0.15; p.knR = 1.55; p.crx = 0.42; p.srx = -0.9; p.elR = -0.5; p.slx = -0.7; p.elL = -0.6; p.nrx = 0.2; },
  talk: (p, t) => { p.srx = -0.45 + Math.sin(t * 2.6) * 0.12; p.elR = -1.15 + Math.sin(t * 3.1) * 0.15; p.nry = Math.sin(t * 0.9) * 0.08; },
  hammer: (p, t) => { const s = Math.sin(t * 5.2); p.srx = -1.3 + Math.max(-0.2, s) * 0.8; p.elR = -0.9 - s * 0.2; p.crx = 0.25; p.slx = -0.55; p.elL = -1.0; },
  hoe: (p, t) => { const s = Math.sin(t * 2.4); p.slx = p.srx = -0.95 + s * 0.5; p.sry = 0.25; p.sly = -0.25; p.elL = p.elR = -0.6; p.crx = 0.35 + s * 0.15; p.knL = p.knR = 0.25; },
  chopping: (p, t) => { const s = Math.sin(t * 2.3), d = Math.max(-0.4, s); p.slx = p.srx = -1.75 + d * 1.15; p.sry = 0.28; p.sly = -0.28; p.elL = p.elR = -0.5 - d * 0.3; p.crx = 0.22 - d * 0.3; p.knL = p.knR = 0.2; },
  weave: (p, t) => { p.slx = -1.25 + Math.sin(t * 2) * 0.16; p.srx = -1.25 + Math.cos(t * 2) * 0.16; p.elL = p.elR = -0.7; },
  cook: (p, t) => { p.hy = -0.43; p.llx = -1.4; p.knL = 1.5; p.lrx = 0.15; p.knR = 1.55; p.crx = 0.45; p.srx = -1.0; p.sry = 0.2 + Math.sin(t * 2.5) * 0.25; p.elR = -0.45; p.nrx = 0.25; },
  torch: (p) => { p.slx = -1.25; p.sly = 0.2; p.elL = -0.5; },
  cower: (p, t) => { p.crx = 0.4; p.nrx = 0.25; p.slx = p.srx = -0.95; p.elL = p.elR = -2.0; p.hy = -0.12 + Math.sin(t * 9) * 0.004; p.knL = p.knR = 0.5; },
  fish: (p, t) => { p.srx = -0.95 + Math.sin(t * 0.8) * 0.03; p.elR = -0.7; p.slx = -0.6; p.elL = -0.95; },
  dead: (p) => { p.pitch = -1.5; p.by = 0.16; p.slz = 1.0; p.srz = -1.0; p.llx = 0.08; p.lrx = -0.1; p.nry = 0.5; p.elL = -0.3; p.elR = -0.5; },
  mourn: (p) => { p.hy = -0.43; p.llx = -1.4; p.knL = 1.5; p.lrx = 0.15; p.knR = 1.55; p.crx = 0.7; p.nrx = 0.45; p.slx = p.srx = -0.8; p.elL = p.elR = -0.9; },
};
// ---- one-shot actions: keyframes [startFraction, poseOverrides] ----------------------
const ACTIONS = {
  atk1: [[0, { srx: -2.5, sry: -0.55, elR: -1.0, cry: -0.5, crx: -0.05 }], [0.38, { srx: -0.55, sry: 0.55, elR: -0.1, cry: 0.5, crx: 0.28, hy: -0.05 }], [0.64, { srx: -0.5, sry: 0.4, elR: -0.5, cry: 0.2 }]],
  atk2: [[0, { srx: -1.35, sry: 1.0, elR: -1.2, cry: 0.55 }], [0.38, { srx: -1.35, sry: -0.9, elR: -0.1, cry: -0.5, crx: 0.15 }], [0.64, { srx: -1.0, sry: -0.5, elR: -0.6, cry: -0.2 }]],
  atk3: [[0, { srx: -3.0, elR: -1.1, crx: -0.22, slx: -2.0, elL: -1.0 }], [0.4, { srx: -0.8, elR: -0.05, crx: 0.5, hy: -0.1, knL: 0.4, knR: 0.4, slx: -0.7 }], [0.68, { srx: -0.6, elR: -0.5, crx: 0.25 }]],
  chop: [[0, { srx: -2.9, slx: -2.9, sry: 0.25, sly: -0.25, elR: -0.9, elL: -0.9, crx: -0.25 }], [0.45, { srx: -0.75, slx: -0.75, sry: 0.3, sly: -0.3, elR: -0.15, elL: -0.15, crx: 0.62, hy: -0.12, knL: 0.45, knR: 0.45 }], [0.72, { srx: -0.7, slx: -0.7, sry: 0.3, sly: -0.3, elR: -0.4, elL: -0.4, crx: 0.4 }]],
  stagger: [[0, { crx: -0.4, nrx: -0.3, slx: -0.6, srx: -0.6, slz: 0.7, srz: -0.7, hy: -0.06, knL: 0.3, knR: 0.3 }], [0.6, { crx: -0.1 }]],
  dodge: [[0, { hy: -0.42, crx: 0.95, nrx: 0.4, llx: -1.3, lrx: -1.3, knL: 2.0, knR: 2.0, slx: -0.9, srx: -0.9, elL: -1.6, elR: -1.6 }], [0.7, { hy: -0.2, crx: 0.4, llx: -0.6, lrx: -0.6, knL: 1.0, knR: 1.0 }]],
  parry: [[0, { srx: -1.9, sry: 0.75, elR: -0.7, cry: 0.25 }], [0.5, { srx: -1.5, sry: 0.5, elR: -1.3 }]],
  shoot: [[0, { cry: -0.45, slx: -1.5, sly: 0.45, elL: -0.05, srx: -1.3, sry: -1.3, elR: -0.5 }], [0.6, {}]],
  pickup: [[0, { hy: -0.4, crx: 0.95, llx: -1.0, lrx: -1.0, knL: 1.8, knR: 1.8, srx: -0.9, elR: -0.2, nrx: 0.2 }], [0.65, { hy: -0.15, crx: 0.4 }]],
  strike: [[0, { srx: -1.0, sry: 0.3, elR: -1.2, slx: -0.8, sly: -0.3, elL: -1.0 }], [0.3, { srx: -0.7, sry: 0.45, elR: -0.7, slx: -0.8, sly: -0.3, elL: -1.0 }], [0.6, { srx: -0.9, sry: 0.3, elR: -1.1, slx: -0.8, sly: -0.3, elL: -1.0 }]],
  cast: [[0, { srx: -2.6, elR: -0.9, crx: -0.15 }], [0.4, { srx: -1.1, elR: -0.1, crx: 0.2 }], [0.7, { srx: -0.9, elR: -0.6 }]],
  fall: [[0, { crx: -0.5, nrx: -0.4, slz: 0.9, srz: -0.9, knL: 0.6, knR: 0.6, hy: -0.2 }], [0.35, { pitch: -1.5, by: 0.16, slz: 1.0, srz: -1.0, nry: 0.5 }]],
  cheer: [[0, { srx: -2.8, elR: -0.3, slx: -2.8, elL: -0.3 }], [0.7, {}]],
  give: [[0, { srx: -1.2, elR: -0.4 }], [0.7, {}]],
  shove: [[0, { srx: -1.4, slx: -1.4, elL: -0.2, elR: -0.2, crx: 0.3 }], [0.6, {}]],
};

const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const part = (parent, geos) => { const m = new THREE.Mesh(merge(geos), M.char); m.castShadow = true; parent.add(m); return m; };

export class Humanoid {
  constructor(look = {}) {
    const L = (this.look = Object.assign({}, DEFAULT_LOOK, look));
    this.scale = L.scale;
    this.root = new THREE.Group();
    this.body = grp(this.root, 0, 0, 0);
    this.body.scale.setScalar(L.scale);
    const j = (this.j = {}), b = L.build;
    j.hips = grp(this.body, 0, D.hip, 0);
    j.chest = grp(j.hips, 0, D.chestY, 0);
    j.head = grp(j.chest, 0, D.neckY, 0);
    if (L.child) j.head.scale.setScalar(1.24);

    // pelvis + hem
    const hip = [tint(at(capsule(0.15, 0.1, 8), 0, 0.02, 0, 0, 0, Math.PI / 2, 1, 1, 0.75), L.tunic, 0.06, 1)];
    if (L.female) hip.push(tint(at(cyl(0.17, 0.34, 0.9, 12, 1.6, true), 0, -0.43, 0, 0, 0, 0, 1, 1, 0.86), L.tunic, 0.08, 2));
    else hip.push(tint(at(cyl(0.176, 0.24, 0.36, 10, 1.6, true), 0, -0.16, 0, 0, 0, 0, 1, 1, 0.8), L.tunic, 0.08, 2));
    hip.push(tint(at(cyl(0.182, 0.182, 0.055, 10), 0, 0.06, 0, 0, 0, 0, 1, 1, 0.8), 0x3b2a1a, 0.05, 3));
    if (L.apron) hip.push(tint(at(box(0.26, 0.62, 0.02), 0, -0.25, 0.16), L.apron, 0.05, 4));
    part(j.hips, hip);

    // torso
    const ch = [
      tint(at(cyl(0.2 * b, 0.165, 0.5, 10), 0, 0.06, 0, 0, 0, 0, 1, 1, 0.68), L.tunic, 0.06, 5),
      tint(at(sphere(0.086, 8, 6), D.shoulderX * b, D.shoulderY, 0), L.tunic, 0.05, 6),
      tint(at(sphere(0.086, 8, 6), -D.shoulderX * b, D.shoulderY, 0), L.tunic, 0.05, 7),
      tint(at(cyl(0.05, 0.058, 0.13, 8), 0, 0.37, 0), L.skin, 0.03, 8),
      tint(at(cyl(0.085, 0.1, 0.045, 10), 0, 0.322, 0, 0, 0, 0, 1, 1, 0.8), L.trim, 0.05, 9),
    ];
    if (L.apron) ch.push(tint(at(box(0.24, 0.3, 0.02), 0, 0.05, 0.135), L.apron, 0.05, 10));
    if (L.cloak) ch.push(tint(at(new THREE.CylinderGeometry(0.23 * b, 0.37, 1.02, 10, 1, true, Math.PI * 0.5, Math.PI), 0, -0.2, -0.02), L.cloak, 0.1, 11));
    if (L.fur) for (const [x, y, z, s] of [[0.17, 0.33, -0.02, 0.13], [-0.17, 0.33, -0.02, 0.13], [0, 0.31, -0.1, 0.15], [0, 0.2, -0.13, 0.13]])
      ch.push(tint(at(new THREE.IcosahedronGeometry(1, 1), x * b, y, z, 0, 0, 0, s * 1.25, s * 0.8, s), 0x6c6a66, 0.3, 12 + x * 10));
    part(j.chest, ch);

    // head
    const hd = [
      tint(at(sphere(0.112, 10, 8), 0, 0.15, 0, 0, 0, 0, 0.95, 1.13, 1.02), L.skin, 0.03, 20),
      tint(at(sphere(0.013, 5, 4), 0.04, 0.165, 0.103), 0x1a1410, 0, 21), tint(at(sphere(0.013, 5, 4), -0.04, 0.165, 0.103), 0x1a1410, 0, 22),
      tint(at(box(0.022, 0.042, 0.03), 0, 0.138, 0.112), L.skin, 0.02, 23),
    ];
    const cap = () => at(new THREE.SphereGeometry(0.122, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.54), 0, 0.16, -0.012, -0.18, 0, 0, 1, 1.1, 1.06);
    if (L.helmet) {
      hd.push(tint(at(new THREE.SphereGeometry(0.128, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 0.165, 0, 0, 0, 0, 1, 1.12, 1.05), 0x70747a, 0.08, 24));
      hd.push(tint(at(cyl(0.131, 0.131, 0.028, 10), 0, 0.166, 0, 0, 0, 0, 1, 1, 1.05), 0x4c4f54, 0.05, 25));
      hd.push(tint(at(box(0.024, 0.1, 0.02), 0, 0.125, 0.128), 0x4c4f54, 0.05, 26));
    } else if (L.hairStyle !== 'bald') hd.push(tint(cap(), L.hair, 0.12, 27));
    if (L.hairStyle === 'long' || L.hairStyle === 'braid' || L.hairStyle === 'braids')
      hd.push(tint(at(new THREE.CylinderGeometry(0.118, 0.128, 0.24, 9, 1, true, Math.PI * 0.5, Math.PI), 0, 0.05, -0.01), L.hair, 0.12, 28));
    if (L.hairStyle === 'braid') hd.push(tint(at(capsule(0.032, 0.3, 5), 0, -0.14, -0.12, 0.12, 0, 0), L.hair, 0.15, 29));
    if (L.hairStyle === 'braids') for (const s of [-1, 1]) hd.push(tint(at(capsule(0.028, 0.26, 5), s * 0.1, -0.1, 0.05, -0.1, 0, 0), L.hair, 0.15, 30 + s));
    if (L.hairStyle === 'bun') hd.push(tint(at(sphere(0.055, 7, 5), 0, 0.24, -0.09), L.hair, 0.1, 32));
    if (L.beard === 'short') hd.push(tint(at(sphere(0.098, 8, 6), 0, 0.085, 0.03, 0, 0, 0, 0.95, 0.85, 0.9), L.hair, 0.12, 33));
    if (L.beard === 'long') { hd.push(tint(at(sphere(0.1, 8, 6), 0, 0.08, 0.03, 0, 0, 0, 0.95, 0.9, 0.9), L.hair, 0.12, 33)); hd.push(tint(at(cone(0.075, 0.26, 7), 0, -0.05, 0.06, Math.PI, 0, 0), L.hair, 0.12, 34)); }
    part(j.head, hd);

    // limbs
    for (const [side, sx] of [['L', 1], ['R', -1]]) {
      const sh = (j['sh' + side] = grp(j.chest, sx * D.shoulderX * b, D.shoulderY, 0)); sh.rotation.order = 'YXZ';
      const el = (j['el' + side] = grp(sh, 0, -D.upper, 0));
      j['ha' + side] = grp(el, 0, -D.fore, 0);
      part(sh, [tint(at(capsule(0.054 * Math.sqrt(b), 0.2, 6), 0, -0.145, 0), L.tunic, 0.06, 40)]);
      part(el, [tint(at(capsule(0.045 * Math.sqrt(b), 0.19, 6), 0, -0.13, 0), L.sleeve ?? L.skin, 0.04, 41), tint(at(sphere(0.048, 6, 5), 0, -0.285, 0, 0, 0, 0, 0.9, 1.15, 0.7), L.skin, 0.03, 42)]);
      const lg = (j['lg' + side] = grp(j.hips, sx * 0.095, 0, 0));
      const kn = (j['kn' + side] = grp(lg, 0, -D.thigh, 0));
      part(lg, [tint(at(capsule(0.076, 0.3, 6), 0, -0.22, 0), L.legs, 0.06, 43)]);
      part(kn, [tint(at(capsule(0.058, 0.3, 6), 0, -0.21, 0), L.wraps ?? L.legs, 0.1, 44), tint(at(box(0.105, 0.1, 0.25), 0, -0.415, 0.045), L.boots, 0.06, 45)]);
    }

    this.cur = {}; this.tgt = {};
    for (const k of POSE_KEYS) { this.cur[k] = REST[k] || 0; this.tgt[k] = 0; }
    this.t = Math.random() * 10; this.phase = 0; this.speed = 0; this.crouch = false; this.param = 0;
    this.loop = null; this.action = null; this.items = { L: null, R: null }; this.onStep = null; this._ls = 0;
    this.applyPose();
  }

  setLocomotion(speed, crouch = false) { this.speed = speed; this.crouch = crouch; }
  setLoop(name) { this.loop = name; }
  /** Play a one-shot action. opts: { hitAt: 0..1, onHit, onEnd } */
  play(name, dur, opts = {}) { this.action = { name, t: 0, dur, ...opts, fired: false }; }
  get busy() { return !!this.action; }

  hold(side, name) {
    const h = this.j['ha' + side];
    if (this.items[side]) { h.remove(this.items[side]); this.items[side] = null; }
    if (name) { const it = makeItem(name); it.position.set(0, -0.03, 0.02); h.add(it); this.items[side] = it; it.userData.name = name; }
  }
  held(side) { return this.items[side] ? this.items[side].userData.name : null; }

  update(dt) {
    this.t += dt;
    const p = this.tgt, sp = this.speed / this.scale;
    for (const k of POSE_KEYS) p[k] = REST[k] || 0;
    if (sp > 0.12) this.phase += dt * (4.4 + sp * 1.05) * (this.crouch ? 0.8 : 1);
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    if (sp > 0.3 && Math.sign(s) !== this._ls && this.onStep) this.onStep();
    this._ls = Math.sign(s);
    if (this.crouch) {
      const a = sp > 0.12 ? Math.min(1, sp / 1.5) : 0;
      p.hy = -0.34; p.crx = 0.5; p.nrx = -0.35;
      p.llx = -1.0 - s * 0.3 * a; p.lrx = -1.0 + s * 0.3 * a;
      p.knL = 1.85 + Math.max(0, c) * 0.3 * a; p.knR = 1.85 + Math.max(0, -c) * 0.3 * a;
      p.slx = -0.35 + s * 0.22 * a; p.srx = -0.35 - s * 0.22 * a; p.elL = p.elR = -0.9;
    } else if (sp > 0.12) {
      const A = clamp(0.26 + sp * 0.16, 0.3, 1.0), run = smoothstep(2.4, 4.6, sp);
      p.llx = -s * A; p.lrx = s * A;
      p.knL = 0.1 + Math.max(0, c) * A * 1.35; p.knR = 0.1 + Math.max(0, -c) * A * 1.35;
      p.slx = s * A * 0.75; p.srx = -s * A * 0.75; p.elL = p.elR = -(0.2 + run * 0.95);
      p.hy = Math.cos(this.phase * 2) * 0.022 * A - 0.01;
      p.crx = 0.05 + run * 0.2; p.cry = s * 0.12 * A; p.hry = -s * 0.07 * A;
    } else {
      p.crx = 0.02 + Math.sin(this.t * 1.5) * 0.014; p.nry = Math.sin(this.t * 0.37) * 0.13; p.nrx = Math.sin(this.t * 0.23) * 0.04;
    }
    if (this.loop && LOOPS[this.loop]) LOOPS[this.loop](p, this.t, this);
    let lambda = 11;
    const a = this.action;
    if (a) {
      a.t += dt;
      const f = a.t / a.dur, keys = ACTIONS[a.name];
      if (keys) { let pose = keys[0][1]; for (const [at_, ps] of keys) if (f >= at_) pose = ps; for (const k in pose) p[k] = pose[k]; }
      lambda = 21;
      if (!a.fired && a.onHit && f >= (a.hitAt ?? 0.4)) { a.fired = true; a.onHit(); }
      if (f >= 1) { this.action = null; if (a.onEnd) a.onEnd(); }
    }
    const k = 1 - Math.exp(-lambda * dt), cu = this.cur;
    for (const key of POSE_KEYS) cu[key] += (p[key] - cu[key]) * k;
    this.applyPose();
  }
  applyPose() {
    const c = this.cur, j = this.j;
    j.hips.position.y = D.hip + c.hy; j.hips.rotation.set(c.hrx, c.hry, 0);
    j.chest.rotation.set(c.crx, c.cry, c.crz); j.head.rotation.set(c.nrx, c.nry, 0);
    j.shL.rotation.set(c.slx, c.sly, c.slz); j.shR.rotation.set(c.srx, c.sry, c.srz);
    j.elL.rotation.x = c.elL; j.elR.rotation.x = c.elR;
    j.lgL.rotation.set(c.llx, 0, c.llz); j.lgR.rotation.set(c.lrx, 0, c.lrz);
    j.knL.rotation.x = c.knL; j.knR.rotation.x = c.knR;
    this.body.rotation.x = c.pitch; this.body.position.y = c.by;
  }
  /** Snap straight to the current target pose (used when teleporting / restoring). */
  snap() { this.update(0.0001); for (const k of POSE_KEYS) this.cur[k] = this.tgt[k]; this.applyPose(); }
  headHeight() { return (D.hip + this.cur.hy + D.chestY + D.neckY + 0.15) * this.scale; }
  handWorld(side, out) { return this.j['ha' + side].getWorldPosition(out); }
}

// ---------------------------------------------------------------------------------------
// Hand-held items. Local +Z is "away from the fist" (blade / haft direction).
// ---------------------------------------------------------------------------------------
const itemCache = new Map();
function itemGeo(name) {
  if (itemCache.has(name)) return itemCache.get(name);
  const W = 0x8a6a44, WD = 0x5c4630, IR = 0x9aa0a8, g = [];
  const bladeZ = (len, w, col, seed) => tint(at(box(w, 0.016, len), 0, 0, len / 2 + 0.07), col, 0.06, seed);
  switch (name) {
    case 'woodsword': g.push(bladeZ(0.52, 0.045, W, 1), tint(at(box(0.15, 0.03, 0.03), 0, 0, 0.07), WD, 0, 2), tint(at(cyl(0.017, 0.017, 0.13, 5), 0, 0, 0, Math.PI / 2, 0, 0), WD, 0, 3)); break;
    case 'woodsword_big': g.push(bladeZ(0.78, 0.055, W, 1), tint(at(box(0.2, 0.035, 0.035), 0, 0, 0.07), WD, 0, 2), tint(at(cyl(0.02, 0.02, 0.16, 5), 0, 0, 0, Math.PI / 2, 0, 0), WD, 0, 3)); break;
    case 'sword': g.push(bladeZ(0.82, 0.05, IR, 1), tint(at(box(0.2, 0.035, 0.035), 0, 0, 0.07), 0x6e5a36, 0, 2), tint(at(cyl(0.02, 0.02, 0.16, 5), 0, 0, 0, Math.PI / 2, 0, 0), WD, 0, 3), tint(at(sphere(0.03, 5, 4), 0, 0, -0.09), 0x6e5a36, 0, 4)); break;
    case 'axe': case 'father_axe':
      g.push(tint(at(cyl(0.016, 0.02, 0.66, 5), 0, 0, 0.23, Math.PI / 2, 0, 0), WD, 0.08, 1));
      g.push(tint(at(box(0.022, 0.2, 0.1), 0, -0.07, 0.5), IR, 0.06, 2), tint(at(box(0.024, 0.07, 0.07), 0, 0.0, 0.5), 0x70747a, 0, 3));
      if (name === 'father_axe') g.push(tint(at(box(0.026, 0.03, 0.03), 0, 0, 0.2), 0x8a2f25, 0, 4), tint(at(box(0.026, 0.03, 0.03), 0, 0, 0.3), 0x8a2f25, 0, 5));
      break;
    case 'woodaxe': g.push(tint(at(cyl(0.02, 0.024, 0.85, 5), 0, 0, 0.3, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.03, 0.2, 0.13), 0, -0.06, 0.68), IR, 0.06, 2)); break;
    case 'smallaxe': g.push(tint(at(cyl(0.014, 0.017, 0.5, 5), 0, 0, 0.17, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.02, 0.13, 0.08), 0, -0.04, 0.38), IR, 0.06, 2)); break;
    case 'spear': g.push(tint(at(cyl(0.015, 0.017, 2.0, 5), 0, 0, 0.35, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(cone(0.035, 0.26, 4), 0, 0, 1.47, Math.PI / 2, 0, 0), IR, 0, 2)); break;
    case 'hammer': g.push(tint(at(cyl(0.014, 0.016, 0.36, 5), 0, 0, 0.14, Math.PI / 2, 0, 0), WD, 0, 1), tint(at(box(0.05, 0.11, 0.05), 0, 0, 0.32), 0x5a5e64, 0, 2)); break;
    case 'hoe': g.push(tint(at(cyl(0.015, 0.017, 1.4, 5), 0, 0, 0.5, Math.PI / 2, 0, 0), WD, 0, 1), tint(at(box(0.11, 0.02, 0.14), 0, -0.08, 1.18, 1.1, 0, 0), 0x5a5e64, 0, 2)); break;
    case 'rod': g.push(tint(at(cyl(0.006, 0.014, 2.3, 4), 0, 0, 1.05, Math.PI / 2, 0, 0), WD, 0.05, 1)); break;
    case 'torch': g.push(tint(at(cyl(0.02, 0.016, 0.55, 5), 0, 0, 0.2, Math.PI / 2, 0, 0), WD, 0, 1), tint(at(sphere(0.055, 6, 5), 0, 0, 0.5), 0x2a1408, 0, 2)); break;
    case 'bow': case 'bow_big': {
      const R = name === 'bow' ? 0.62 : 0.9, A = 0.62, pts = [];
      for (let i = 0; i <= 10; i++) { const a = -A + (i / 10) * 2 * A; pts.push(new THREE.Vector3(0, R - R * Math.cos(a), R * Math.sin(a))); }
      g.push(tint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.011, 5), 0x7a5a36, 0.05, 1));
      g.push(tint(at(cyl(0.003, 0.003, 2 * R * Math.sin(A), 3), 0, R - R * Math.cos(A), 0, Math.PI / 2, 0, 0), 0xd8d0c0, 0, 2));
      break;
    }
    case 'shield': {
      g.push(tint(at(cyl(0.4, 0.4, 0.03, 16), 0.09, 0.08, 0.0, 0, 0, Math.PI / 2), 0x7c2a22, 0.1, 1));
      g.push(tint(at(sphere(0.07, 7, 5), 0.11, 0.08, 0, 0, 0, 0, 0.6, 1, 1), IR, 0, 2));
      break;
    }
    case 'firewood': for (let i = 0; i < 4; i++) g.push(tint(at(cyl(0.05, 0.05, 0.55, 5), -0.14 + (i % 2) * 0.1, 0.02 + ((i / 2) | 0) * 0.09, 0.08, 0, 0, Math.PI / 2), 0x7a5c3c, 0.15, i)); break;
    case 'fish': g.push(tint(at(sphere(0.06, 6, 5), 0, -0.14, 0.02, 0, 0, 0, 0.5, 2.6, 1), 0x9aa6a8, 0.15, 1)); break;
    default: g.push(tint(box(0.05, 0.05, 0.05), 0xffffff));
  }
  const geo = merge(g);
  itemCache.set(name, geo);
  return geo;
}
export function makeItem(name) {
  const m = new THREE.Mesh(itemGeo(name), M.vcPlain);
  m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  return g;
}
