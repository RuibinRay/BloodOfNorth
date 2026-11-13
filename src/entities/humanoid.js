// Procedural articulated character: a jointed figure built from primitives with a pose-blending
// animator, a face (eyes that look and blink, brows, a mouth that moves with speech, expressions),
// breathing, cloth and hair that lag behind the body, feet that find sloping ground, and a second hand
// that finds the haft of a two-handed weapon. PLACEHOLDER art — the rig interface (joints, play/setLoop/hold) is what the game codes
// against, so rigged GLB characters can replace the meshes later without touching gameplay.
import * as THREE from 'three';
import { clamp, smoothstep, damp, angleDiff } from '../core/util.js';
import { M, at, box, cyl, cone, sphere, capsule, tint, merge } from '../world/geo.js';

const D = { hip: 0.94, thigh: 0.44, shin: 0.44, chestY: 0.2, shoulderY: 0.3, shoulderX: 0.2, neckY: 0.42, upper: 0.29, fore: 0.27 };
const DEFAULT_LOOK = {
  scale: 1, child: false, female: false, build: 1, skin: 0xd8a888, hair: 0x6b4a2b, hairStyle: 'short', beard: null,
  tunic: 0x6f6048, trim: 0x8a2f25, legs: 0x4b4034, boots: 0x33261a, cloak: null, fur: false, helmet: false, apron: null,
  eyes: 0x5a4632, face: 'even', scar: null, scar2: null, // eye colour; face shape: even | lean | broad | long; scar: 'lightning' (over the left eye) | 'cheek' | 'brow'
};
/** Head proportions by face shape: [width, height, depth] of the skull. */
const FACES = { even: [0.95, 1.13, 1.02], lean: [0.89, 1.17, 1.0], broad: [1.03, 1.08, 1.05], long: [0.92, 1.22, 1.0] };
/** Expressions. tilt: brows (+ inner ends down, - inner ends up); by: brow height; lid: 0 wide .. 1 shut; open: jaw; curve: mouth corners; wide: mouth width. */
const MOODS = {
  neutral: { tilt: 0, by: 0, lid: 0.1, open: 0, curve: 0, wide: 1 },
  anger: { tilt: 0.42, by: -0.004, lid: 0.28, open: 0.12, curve: -0.35, wide: 1.05 },
  pain: { tilt: -0.35, by: 0.001, lid: 0.7, open: 0.5, curve: -0.6, wide: 1.1 },
  fear: { tilt: -0.4, by: 0.006, lid: 0, open: 0.42, curve: -0.45, wide: 0.9 },
  sad: { tilt: -0.34, by: -0.001, lid: 0.4, open: 0, curve: -0.85, wide: 0.92 },
  laugh: { tilt: 0, by: 0.004, lid: 0.6, open: 0.75, curve: 1, wide: 1.2 },
  smile: { tilt: 0, by: 0.002, lid: 0.22, open: 0.05, curve: 0.75, wide: 1.12 },
  tired: { tilt: -0.16, by: 0, lid: 0.42, open: 0.5, curve: -0.2, wide: 0.95 },
  dead: { tilt: 0, by: 0, lid: 1, open: 0.22, curve: -0.1, wide: 0.95 },
};
/** How far the jaw opens for a letter (speech follows the words as they are spoken). */
const VISEME = { a: 0.95, o: 0.8, e: 0.55, i: 0.4, u: 0.45, y: 0.4, m: 0, b: 0, p: 0, f: 0.12, v: 0.12, w: 0.3, l: 0.35, r: 0.3, s: 0.2, t: 0.25, d: 0.28, n: 0.22, k: 0.3, g: 0.3, h: 0.45 };
const _t = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), DOWN = new THREE.Vector3(0, -1, 0), XAX = new THREE.Vector3(1, 0, 0);
const POSE_KEYS = ['hy', 'hrx', 'hry', 'crx', 'cry', 'crz', 'nrx', 'nry', 'slx', 'sly', 'slz', 'srx', 'sry', 'srz', 'elL', 'elR', 'llx', 'llz', 'lrx', 'lrz', 'knL', 'knR', 'pitch', 'by'];
const REST = { slz: 0.09, srz: -0.09, elL: -0.12, elR: -0.12 };

// ---- persistent overlay poses -----------------------------------------------------------
const LOOPS = {
  block: (p) => { p.srx = -1.45; p.sry = 0.55; p.srz = 0; p.elR = -1.5; p.slx = -0.5; p.elL = -1.2; p.crx = 0.1; p.knL = p.knR = 0.3; p.hy = -0.04; },
  guard: (p) => { p.srx = -0.75; p.sry = 0.2; p.elR = -1.0; p.slx = -0.5; p.elL = -0.9; p.knL = p.knR = 0.22; p.hy = -0.03; p.crx = 0.08; },
  aim: (p, t, h) => { // side on to the mark, the bow arm straight, the string hand coming back to the cheek; at full draw the arm trembles
    const d = h.param || 0, ap = clamp(h.aimPitch || 0, -0.5, 0.6), tr = d >= 0.99 ? Math.sin(t * 37) * 0.006 : 0, br = Math.sin(t * 1.6) * 0.012;
    p.cry = -0.5; p.hry = -0.3; p.crx = -0.05 * d + ap * 0.22; p.nry = 0.32; p.nrx = ap * 0.25;
    p.slx = -1.5 + ap * 0.7 + br + tr; p.sly = 0.45; p.slz = 0; p.elL = -0.05;
    p.srx = -1.45 + ap * 0.7 + br; p.sry = -0.55 - 0.55 * d; p.srz = 0; p.elR = -0.8 - 1.5 * d + tr * 2;
    p.llz = 0.1; p.lrz = -0.1; p.llx = -0.12; p.lrx = 0.1; p.knL = 0.12; p.knR = 0.1; p.hy = -0.02;
  },
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
  swim: (p, t) => { const k = Math.sin(t * 3.2); p.pitch = 1.25; p.by = 0.35; p.slx = -2.75 + k * 0.5; p.srx = -2.75 - k * 0.5; p.elL = p.elR = -0.25; p.llx = k * 0.4; p.lrx = -k * 0.4; p.knL = 0.2 + k * 0.2; p.knR = 0.2 - k * 0.2; p.nrx = -0.7; },
  tread: (p, t) => { const k = Math.sin(t * 2.6); p.slx = -1.2; p.srx = -1.2; p.slz = 0.9 + k * 0.25; p.srz = -0.9 - k * 0.25; p.elL = p.elR = -0.5; p.llx = k * 0.3; p.lrx = -k * 0.3; p.knL = p.knR = 0.4; },
  lie: (p) => { p.pitch = -1.5; p.by = 0.16; p.slx = -2.6; p.srx = -2.6; p.elL = -0.9; p.elR = -0.9; p.llx = 0.1; p.lrx = -0.08; },
  mourn: (p) => { p.hy = -0.43; p.llx = -1.4; p.knL = 1.5; p.lrx = 0.15; p.knR = 1.55; p.crx = 0.7; p.nrx = 0.45; p.slx = p.srx = -0.8; p.elL = p.elR = -0.9; },
};
// ---- one-shot actions ---------------------------------------------------------------
// Two kinds. A plain list of [startFraction, pose] holds each pose until the next (the body eases toward it).
// A list wrapped in S() is a curve: [fraction, pose, ease] keys that the body follows exactly, so a blow can gather,
// snap and follow through, with the hips, the knees and the off hand in it as well as the arm. A blow lands at about
// 0.4 to 0.5 of its length (see hitAt where it is played), so that is where each curve is fastest.
const S = (keys) => { keys.smooth = true; return keys; };
const EASE = { lin: (u) => u, in: (u) => u * u * u, snap: (u) => u * u * u * u, out: (u) => 1 - (1 - u) ** 3, io: (u) => u * u * (3 - 2 * u) };
function sampleKeys(keys, f, p) {
  let i = 0; while (i < keys.length - 1 && f >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], A = a[1];
  if (!b) { for (const k in A) p[k] = A[k]; return; }
  const u = EASE[b[2] || 'io'](clamp((f - a[0]) / (b[0] - a[0]), 0, 1)), B = b[1];
  for (const k in A) p[k] = A[k] + ((k in B ? B[k] : p[k]) - A[k]) * u; // a channel one key leaves out is the body's own pose there
  for (const k in B) if (!(k in A)) p[k] += (B[k] - p[k]) * u;
}
const mirror = (keys) => S(keys.map(([t, ps, e]) => { const o = {}; for (const k in ps) { const v = ps[k], m = { srx: 'slx', sry: 'sly', srz: 'slz', slx: 'srx', sly: 'sry', slz: 'srz', elR: 'elL', elL: 'elR', llx: 'lrx', lrx: 'llx', llz: 'lrz', lrz: 'llz', knL: 'knR', knR: 'knL' }[k] || k; o[m] = /^(s[lr]y|s[lr]z|cry|crz|hry|nry|l[lr]z)$/.test(k) ? -v : v; } return [t, o, e]; }));
const CUT = [ // a cut from the right shoulder down to the left hip: weight back, hips first, then the shoulders, the front knee takes it
  [0, { srx: -1.6, sry: -0.3, elR: -1.3, cry: -0.25, hry: -0.1 }],
  [0.18, { srx: -2.75, sry: -0.7, elR: -1.15, cry: -0.78, hry: -0.28, crx: -0.1, crz: -0.08, lrx: 0.25, llx: -0.2, knL: 0.25, hy: -0.03, slx: -0.5, sly: 0.3, elL: -1.1, nry: 0.35 }, 'out'],
  [0.27, { srx: -2.62, sry: -0.62, elR: -1.0, cry: -0.72, hry: -0.25, crx: -0.08, lrx: 0.22, llx: -0.25, knL: 0.3, hy: -0.04, slx: -0.5, sly: 0.3, elL: -1.1, nry: 0.3 }],
  [0.37, { srx: -0.6, sry: 0.7, elR: -0.08, cry: 0.72, hry: 0.3, crx: 0.32, crz: 0.1, llx: -0.55, knL: 0.55, lrx: 0.45, knR: 0.2, hy: -0.1, slx: 0.3, elL: -0.6, nry: -0.3 }, 'in'],
  [0.5, { srx: -0.35, sry: 0.98, elR: -0.3, cry: 0.88, hry: 0.34, crx: 0.36, crz: 0.1, llx: -0.5, knL: 0.5, lrx: 0.4, knR: 0.2, hy: -0.1, slx: 0.35, elL: -0.7, nry: -0.3 }, 'out'],
  [0.76, { srx: -0.6, sry: 0.4, elR: -0.8, cry: 0.25, hry: 0.1, crx: 0.12, llx: -0.2, knL: 0.2, lrx: 0.15, hy: -0.04 }, 'io'],
  [1, {}],
];
const ACTIONS = {
  atk1: S(CUT),
  atk2: S([ // the backhand: across the body from the left
    [0, { srx: -1.2, sry: 0.6, elR: -1.3, cry: 0.3 }],
    [0.18, { srx: -1.45, sry: 1.15, elR: -1.5, cry: 0.8, hry: 0.3, crx: 0.05, crz: 0.08, llx: 0.2, lrx: -0.25, knR: 0.3, hy: -0.04, slx: -0.3, elL: -0.9, nry: -0.35 }, 'out'],
    [0.27, { srx: -1.4, sry: 1.1, elR: -1.4, cry: 0.75, hry: 0.28, crz: 0.08, llx: 0.2, lrx: -0.28, knR: 0.32, hy: -0.05, slx: -0.3, elL: -0.9, nry: -0.3 }],
    [0.37, { srx: -1.35, sry: -0.95, elR: -0.08, cry: -0.68, hry: -0.3, crx: 0.2, crz: -0.1, lrx: -0.55, knR: 0.55, llx: 0.4, knL: 0.2, hy: -0.1, slx: -0.9, sly: 0.5, elL: -0.5, nry: 0.3 }, 'in'],
    [0.5, { srx: -1.25, sry: -1.2, elR: -0.25, cry: -0.86, hry: -0.34, crx: 0.22, crz: -0.1, lrx: -0.5, knR: 0.5, llx: 0.38, knL: 0.2, hy: -0.1, slx: -0.9, sly: 0.5, elL: -0.6, nry: 0.3 }, 'out'],
    [0.76, { srx: -1.0, sry: -0.5, elR: -0.7, cry: -0.25, hry: -0.1, crx: 0.1, lrx: -0.2, knR: 0.2, llx: 0.15, hy: -0.04 }, 'io'],
    [1, {}],
  ]),
  atk3: S([ // overhead: up on the toes, then everything comes down with it
    [0, { srx: -2.0, elR: -1.2, crx: -0.05 }],
    [0.2, { srx: -3.1, elR: -1.25, crx: -0.3, slx: -2.2, elL: -1.1, hy: 0.03, by: 0.03, lrx: 0.2, llx: -0.15, nrx: -0.2 }, 'out'],
    [0.29, { srx: -3.05, elR: -1.1, crx: -0.28, slx: -2.1, elL: -1.0, hy: 0.03, by: 0.03, lrx: 0.2, llx: -0.15, nrx: -0.18 }],
    [0.39, { srx: -0.75, elR: -0.03, crx: 0.58, hy: -0.16, by: 0, knL: 0.6, knR: 0.45, llx: -0.5, lrx: 0.3, slx: -0.6, elL: -0.4, nrx: 0.1 }, 'in'],
    [0.53, { srx: -0.5, elR: -0.12, crx: 0.68, hy: -0.2, knL: 0.7, knR: 0.5, llx: -0.5, lrx: 0.3, slx: -0.5, elL: -0.5, nrx: 0.1 }, 'out'],
    [0.78, { srx: -0.6, elR: -0.6, crx: 0.25, hy: -0.07, knL: 0.3, knR: 0.25, llx: -0.2, lrx: 0.12 }, 'io'],
    [1, {}],
  ]),
  chop: S([ // both hands on the haft
    [0, { srx: -1.8, slx: -1.8, sry: 0.25, sly: -0.25, elR: -1.0, elL: -1.0 }],
    [0.22, { srx: -3.0, slx: -3.0, sry: 0.25, sly: -0.25, elR: -1.0, elL: -1.0, crx: -0.3, hy: 0.02, nrx: -0.2 }, 'out'],
    [0.32, { srx: -2.95, slx: -2.95, sry: 0.25, sly: -0.25, elR: -0.9, elL: -0.9, crx: -0.28, hy: 0.02, nrx: -0.2 }],
    [0.43, { srx: -0.75, slx: -0.75, sry: 0.3, sly: -0.3, elR: -0.12, elL: -0.12, crx: 0.66, hy: -0.15, knL: 0.5, knR: 0.5, llx: -0.3, lrx: 0.2 }, 'in'],
    [0.57, { srx: -0.6, slx: -0.6, sry: 0.3, sly: -0.3, elR: -0.2, elL: -0.2, crx: 0.72, hy: -0.18, knL: 0.55, knR: 0.55, llx: -0.3, lrx: 0.2 }, 'out'],
    [0.82, { srx: -0.7, slx: -0.7, sry: 0.3, sly: -0.3, elR: -0.45, elL: -0.45, crx: 0.35, hy: -0.06, knL: 0.25, knR: 0.25 }, 'io'],
    [1, {}],
  ]),
  stagger: S([ // knocked back, then bent over and getting his breath
    [0, { crx: -0.5, nrx: -0.35, cry: 0.25, slx: -0.7, srx: -0.5, slz: 0.8, srz: -0.7, hy: -0.08, knL: 0.35, knR: 0.3, lrx: 0.35, llx: 0.1 }],
    [0.3, { crx: -0.3, nrx: -0.15, cry: 0.12, slx: -0.5, srx: -0.5, slz: 0.45, srz: -0.4, hy: -0.07, knL: 0.3, knR: 0.3, lrx: 0.22 }, 'out'],
    [0.55, { crx: 0.36, nrx: 0.3, slx: -0.3, srx: -0.35, slz: 0.2, srz: -0.2, elL: -0.5, elR: -0.6, hy: -0.12, knL: 0.42, knR: 0.42 }, 'io'],
    [0.86, { crx: 0.3, nrx: 0.22, slx: -0.3, srx: -0.4, elL: -0.5, elR: -0.7, hy: -0.1, knL: 0.38, knR: 0.38 }, 'io'],
    [1, {}],
  ]),
  dodge: [[0, { hy: -0.42, crx: 0.95, nrx: 0.4, llx: -1.3, lrx: -1.3, knL: 2.0, knR: 2.0, slx: -0.9, srx: -0.9, elL: -1.6, elR: -1.6 }], [0.7, { hy: -0.2, crx: 0.4, llx: -0.6, lrx: -0.6, knL: 1.0, knR: 1.0 }]],
  parry: S([[0, { srx: -1.4, sry: 0.5, elR: -1.2 }], [0.3, { srx: -2.0, sry: 0.85, elR: -0.75, cry: 0.32, crx: -0.08, hy: -0.05, knL: 0.3, knR: 0.3, lrx: 0.15 }, 'out'], [0.62, { srx: -1.7, sry: 0.6, elR: -1.1, cry: 0.15, hy: -0.03 }, 'io'], [1, {}]]),
  sidestep: [[0, { hy: -0.13, crx: 0.16, knL: 0.55, knR: 0.55, llz: 0.22, lrz: -0.22, slx: -0.3, srx: -0.3 }], [0.7, { hy: -0.05, knL: 0.2, knR: 0.2 }]],
  blockhit: S([[0, { srx: -1.25, sry: 0.7, elR: -1.9, slx: -0.7, elL: -1.6, crx: -0.2, hy: -0.1, knL: 0.42, knR: 0.42, lrx: 0.22, nrx: -0.1 }], [0.5, { srx: -1.4, sry: 0.55, elR: -1.55, slx: -0.55, elL: -1.3, crx: -0.02, hy: -0.06, knL: 0.3, knR: 0.3 }, 'out'], [1, {}]]),
  twinL: mirror(CUT),
  slam: S([ // sink, rise off the ground, and bring it all down
    [0, { srx: -1.8, slx: -1.8, elR: -0.9, elL: -0.9, crx: 0.1, hy: -0.08, knL: 0.3, knR: 0.3 }],
    [0.24, { srx: -3.1, slx: -3.1, sry: 0.2, sly: -0.2, elR: -0.75, elL: -0.75, crx: -0.4, hy: 0.05, by: 0.12, nrx: -0.25, llx: -0.2, lrx: 0.25 }, 'out'],
    [0.36, { srx: -3.1, slx: -3.1, sry: 0.2, sly: -0.2, elR: -0.7, elL: -0.7, crx: -0.38, hy: 0.05, by: 0.16, nrx: -0.25, llx: -0.3, lrx: 0.2, knL: 0.5, knR: 0.6 }],
    [0.46, { srx: -0.5, slx: -0.5, sry: 0.25, sly: -0.25, elR: -0.08, elL: -0.08, crx: 0.85, hy: -0.24, by: 0, knL: 0.8, knR: 0.8, llx: -0.45, lrx: 0.25 }, 'snap'],
    [0.6, { srx: -0.45, slx: -0.45, sry: 0.25, sly: -0.25, elR: -0.15, elL: -0.15, crx: 0.9, hy: -0.28, knL: 0.9, knR: 0.85, llx: -0.45, lrx: 0.25 }, 'out'],
    [0.84, { srx: -0.6, slx: -0.6, elR: -0.35, elL: -0.35, crx: 0.45, hy: -0.1, knL: 0.4, knR: 0.4 }, 'io'],
    [1, {}],
  ]),
  ward: S([[0, { srx: -1.4, sry: 0.2, elR: -1.6, slx: -1.4, sly: -0.2, elL: -1.6, hy: -0.08, knL: 0.35, knR: 0.35 }], [0.25, { srx: -1.8, sry: 0.2, elR: -1.9, slx: -1.8, sly: -0.2, elL: -1.9, crx: -0.12, hy: -0.03, by: 0.02, nrx: -0.15 }, 'out'], [0.7, { srx: -1.3, elR: -1.5, slx: -1.3, elL: -1.5, crx: -0.04 }, 'io'], [1, {}]]),
  thrust: S([ // the hand drawn back past the hip, then a lunge with the whole body behind the point
    [0, { srx: -0.2, elR: -1.3, cry: -0.3 }],
    [0.2, { srx: 0.6, sry: -0.2, elR: -1.35, cry: -0.75, hry: -0.25, crx: -0.06, lrx: 0.3, llx: -0.2, knL: 0.3, hy: -0.06, slx: -0.9, elL: -0.6, nry: 0.4 }, 'out'],
    [0.28, { srx: 0.55, sry: -0.2, elR: -1.3, cry: -0.7, hry: -0.22, crx: -0.05, lrx: 0.3, llx: -0.22, knL: 0.32, hy: -0.06, slx: -0.9, elL: -0.6, nry: 0.38 }],
    [0.37, { srx: -0.55, sry: 0.12, elR: -0.05, cry: 0.6, hry: 0.3, crx: 0.34, llx: -0.75, knL: 0.75, lrx: 0.55, knR: 0.1, hy: -0.17, slx: 0.4, elL: -0.7, nry: -0.3 }, 'in'],
    [0.52, { srx: -0.5, sry: 0.15, elR: -0.08, cry: 0.65, hry: 0.3, crx: 0.36, llx: -0.72, knL: 0.72, lrx: 0.52, knR: 0.1, hy: -0.17, slx: 0.4, elL: -0.7, nry: -0.3 }, 'out'],
    [0.78, { srx: -0.3, elR: -0.8, cry: 0.15, crx: 0.1, llx: -0.25, knL: 0.25, lrx: 0.15, hy: -0.05 }, 'io'],
    [1, {}],
  ]),
  shoot: S([ // the loose: the string hand flies back past the ear, the bow rocks forward in the fingers
    [0, { cry: -0.5, hry: -0.3, slx: -1.5, sly: 0.45, slz: 0, elL: -0.05, srx: -1.45, sry: -1.1, srz: 0, elR: -2.3, nry: 0.3 }],
    [0.3, { cry: -0.42, hry: -0.28, slx: -1.4, sly: 0.5, slz: 0, elL: -0.14, srx: -1.5, sry: -1.8, srz: 0, elR: -0.9, nry: 0.3, crx: -0.05 }, 'out'],
    [0.75, { cry: -0.35, hry: -0.2, slx: -1.3, sly: 0.45, elL: -0.2, srx: -1.2, sry: -1.2, elR: -0.8, nry: 0.25 }, 'io'],
    [1, {}],
  ]),
  nock: S([ // the next arrow, from the quiver at his hip to the string
    [0, { cry: -0.3, slx: -1.2, sly: 0.4, elL: -0.3, srx: -0.2, sry: -0.4, elR: -1.2, nry: 0.2 }],
    [0.35, { cry: -0.2, slx: -1.1, sly: 0.35, elL: -0.5, srx: 0.5, sry: -0.3, elR: -1.9, nry: 0.05, nrx: 0.12 }, 'out'],
    [0.8, { cry: -0.4, slx: -1.4, sly: 0.45, elL: -0.15, srx: -1.35, sry: -0.55, elR: -1.0, nry: 0.28 }, 'io'],
    [1, {}],
  ]),
  pickup: [[0, { hy: -0.4, crx: 0.95, llx: -1.0, lrx: -1.0, knL: 1.8, knR: 1.8, srx: -0.9, elR: -0.2, nrx: 0.2 }], [0.65, { hy: -0.15, crx: 0.4 }]],
  strike: [[0, { srx: -1.0, sry: 0.3, elR: -1.2, slx: -0.8, sly: -0.3, elL: -1.0 }], [0.3, { srx: -0.7, sry: 0.45, elR: -0.7, slx: -0.8, sly: -0.3, elL: -1.0 }], [0.6, { srx: -0.9, sry: 0.3, elR: -1.1, slx: -0.8, sly: -0.3, elL: -1.0 }]],
  cast: S([[0, { srx: -1.8, elR: -1.1, cry: -0.3 }], [0.28, { srx: -2.7, elR: -1.0, crx: -0.18, cry: -0.55, lrx: 0.25, llx: -0.15 }, 'out'], [0.42, { srx: -1.0, elR: -0.08, crx: 0.26, cry: 0.45, llx: -0.45, knL: 0.45, lrx: 0.35, hy: -0.07 }, 'in'], [0.7, { srx: -0.8, elR: -0.5, crx: 0.15, cry: 0.2 }, 'out'], [1, {}]]),
  fall: [[0, { crx: -0.5, nrx: -0.4, slz: 0.9, srz: -0.9, knL: 0.6, knR: 0.6, hy: -0.2 }], [0.35, { pitch: -1.5, by: 0.16, slz: 1.0, srz: -1.0, nry: 0.5 }]],
  cheer: [[0, { srx: -2.8, elR: -0.3, slx: -2.8, elL: -0.3 }], [0.7, {}]],
  give: [[0, { srx: -1.2, elR: -0.4 }], [0.7, {}]],
  shove: S([[0, { srx: -1.0, slx: -1.0, elL: -1.4, elR: -1.4, crx: -0.1, hy: -0.06 }], [0.3, { srx: -0.9, slx: -0.9, elL: -1.7, elR: -1.7, crx: -0.15, hy: -0.08, lrx: 0.2 }, 'out'], [0.47, { srx: -1.45, slx: -1.45, elL: -0.1, elR: -0.1, crx: 0.38, hy: -0.1, llx: -0.5, knL: 0.5, lrx: 0.4 }, 'in'], [0.75, { srx: -1.3, slx: -1.3, elL: -0.3, elR: -0.3, crx: 0.25, llx: -0.3, knL: 0.3 }, 'out'], [1, {}]]),
};
/** Where each weapon's edge runs, as distances up from the fist: the stroke it leaves in the air is drawn between them. */
const BLADE = { woodsword: [0.12, 0.58], woodsword_big: [0.12, 0.85], sword: [0.14, 0.9], axe: [0.32, 0.62], father_axe: [0.3, 0.64], brother_axe: [0.32, 0.62], daneaxe: [0.95, 1.55], anvilhammer: [0.85, 1.42], wolfsjudgment: [0.8, 1.3], starfall: [0.55, 0.95],
  club: [0.55, 1.15], woodaxe: [0.45, 0.8], longaxe: [0.75, 1.25], seax: [0.1, 0.52], maul: [0.75, 1.25], smallaxe: [0.2, 0.45], throwaxe: [0.2, 0.45], spear: [1.05, 1.7], hammer: [0.2, 0.38] };

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
    if (L.cloak) { j.cloak = grp(j.chest, 0, 0.31, -0.02); part(j.cloak, [tint(at(new THREE.CylinderGeometry(0.23 * b, 0.37, 1.02, 10, 1, true, Math.PI * 0.5, Math.PI), 0, -0.51, 0), L.cloak, 0.1, 11)]); } // hangs from the shoulders
    if (L.fur) for (const [x, y, z, s] of [[0.17, 0.33, -0.02, 0.13], [-0.17, 0.33, -0.02, 0.13], [0, 0.31, -0.1, 0.15], [0, 0.2, -0.13, 0.13]])
      ch.push(tint(at(new THREE.IcosahedronGeometry(1, 1), x * b, y, z, 0, 0, 0, s * 1.25, s * 0.8, s), 0x6c6a66, 0.3, 12 + x * 10));
    this.chestMesh = part(j.chest, ch);

    // head
    const hd = [
      tint(at(sphere(0.112, 12, 9), 0, 0.15, 0, 0, 0, 0, ...(FACES[L.face] || FACES.even)), L.skin, 0.03, 20),
      tint(at(box(0.022, 0.042, 0.03), 0, 0.138, 0.112), L.skin, 0.02, 23),
      tint(at(sphere(0.024, 6, 5), 0.108, 0.15, 0.0, 0, 0, 0, 0.5, 1.2, 0.8), L.skin, 0.03, 24), tint(at(sphere(0.024, 6, 5), -0.108, 0.15, 0.0, 0, 0, 0, 0.5, 1.2, 0.8), L.skin, 0.03, 25), // ears
    ];
    const cap = () => at(new THREE.SphereGeometry(0.122, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.54), 0, 0.16, -0.012, -0.18, 0, 0, 1, 1.1, 1.06);
    if (L.helmet) {
      hd.push(tint(at(new THREE.SphereGeometry(0.128, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 0.165, 0, 0, 0, 0, 1, 1.12, 1.05), 0x70747a, 0.08, 24));
      hd.push(tint(at(cyl(0.131, 0.131, 0.028, 10), 0, 0.166, 0, 0, 0, 0, 1, 1, 1.05), 0x4c4f54, 0.05, 25));
      hd.push(tint(at(box(0.024, 0.1, 0.02), 0, 0.125, 0.128), 0x4c4f54, 0.05, 26));
    } else if (L.skull) { // a bear's skull worn as a helm
      hd.push(tint(at(new THREE.SphereGeometry(0.135, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.52), 0, 0.17, 0.0, 0, 0, 0, 1.05, 1.1, 1.15), 0xd8cfb8, 0.1, 24));
      hd.push(tint(at(box(0.1, 0.06, 0.13), 0, 0.2, 0.13, 0.25, 0, 0), 0xd0c6ac, 0.08, 25));
      for (const sx of [-1, 1]) { hd.push(tint(at(cone(0.012, 0.05, 4), sx * 0.035, 0.155, 0.185, Math.PI, 0, 0), 0xefe8d8, 0, 26 + sx)); hd.push(tint(at(sphere(0.022, 5, 4), sx * 0.05, 0.215, 0.1), 0x18140f, 0, 28 + sx)); }
    } else if (L.hairStyle !== 'bald') hd.push(tint(cap(), L.hair, 0.12, 27));
    const back = []; // hair that hangs: its own piece, so it swings
    if (L.hairStyle === 'long' || L.hairStyle === 'braid' || L.hairStyle === 'braids')
      back.push(tint(at(new THREE.CylinderGeometry(0.118, 0.128, 0.24, 9, 1, true, Math.PI * 0.5, Math.PI), 0, -0.12, 0), L.hair, 0.12, 28));
    if (L.hairStyle === 'braid') back.push(tint(at(capsule(0.032, 0.3, 5), 0, -0.31, -0.11, 0.12, 0, 0), L.hair, 0.15, 29));
    if (L.hairStyle === 'tail') back.push(tint(at(capsule(0.036, 0.26, 5), 0, -0.2, -0.13, 0.35, 0, 0), L.hair, 0.15, 29), tint(at(sphere(0.045, 6, 5), 0, -0.02, -0.11), L.hair, 0.1, 35));
    if (L.hairStyle === 'topknot') hd.push(tint(at(sphere(0.05, 7, 5), 0, 0.275, -0.03), L.hair, 0.1, 36), tint(at(cyl(0.02, 0.03, 0.05, 6), 0, 0.245, -0.03), L.hair, 0.1, 37));
    if (back.length) { j.hair = grp(j.head, 0, 0.17, -0.01); part(j.hair, back); }
    if (L.hairStyle === 'braids') for (const s of [-1, 1]) hd.push(tint(at(capsule(0.028, 0.26, 5), s * 0.1, -0.1, 0.05, -0.1, 0, 0), L.hair, 0.15, 30 + s));
    if (L.hairStyle === 'bun') hd.push(tint(at(sphere(0.055, 7, 5), 0, 0.24, -0.09), L.hair, 0.1, 32));
    if (L.beard === 'short') hd.push(tint(at(sphere(0.098, 8, 6), 0, 0.085, 0.03, 0, 0, 0, 0.95, 0.85, 0.9), L.hair, 0.12, 33));
    if (L.beard === 'braided') { hd.push(tint(at(sphere(0.098, 8, 6), 0, 0.085, 0.03, 0, 0, 0, 0.95, 0.85, 0.9), L.hair, 0.12, 33)); for (const s of [-1, 1]) hd.push(tint(at(capsule(0.02, 0.2, 5), s * 0.035, -0.06, 0.085, -0.05, 0, 0), L.hair, 0.15, 38 + s)); }
    if (L.beard === 'stubble') hd.push(tint(at(sphere(0.108, 8, 6), 0, 0.105, 0.012, 0, 0, 0, 0.93, 0.62, 0.98), L.hair, 0.3, 33));
    if (L.beard === 'long') { hd.push(tint(at(sphere(0.1, 8, 6), 0, 0.08, 0.03, 0, 0, 0, 0.95, 0.9, 0.9), L.hair, 0.12, 33)); hd.push(tint(at(cone(0.075, 0.26, 7), 0, -0.05, 0.06, Math.PI, 0, 0), L.hair, 0.12, 34)); }
    part(j.head, hd);
    this.buildFace(L);

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
    this.fc = { ...MOODS.neutral }; this.mood = null; this.moodT = 0; this.baseMood = 'neutral'; this.blinkT = 1 + Math.random() * 4; this.blink = 0;
    this.gaze = { yaw: 0, pitch: 0 }; this.lookTarget = null; this.speech = null; this.jaw = 0; this.jawT = 0; this.breath = 1;
    this.ik = { l: 0, r: 0 }; this.sway = 0;
    this.applyPose();
  }

  // ---- the face -------------------------------------------------------------------------------
  buildFace(L) {
    const j = this.j, f = (this.face = grp(j.head, 0, 0, 0)), ex = 0.04, ey = 0.166, ez = 0.1;
    const soft = (geos) => { const m = part(f, geos); m.castShadow = false; return m; };
    const dark = (hex, k) => { const c = new THREE.Color(hex).multiplyScalar(k); return c.getHex(); };
    // what does not move: the whites of the eyes, and any scar
    const still = [];
    for (const s of [1, -1]) still.push(tint(at(sphere(0.02, 8, 6), s * ex, ey, ez - 0.004, 0, 0, 0, 1, 0.74, 0.5), 0xece6da, 0, 60 + s));
    const scarLine = (pts, hex) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], mx = (ax + bx) / 2, my = (ay + by) / 2;
      const zs = 0.114 * Math.sqrt(Math.max(0.05, 1 - (mx / 0.106) ** 2 - ((my - 0.15) / 0.127) ** 2)) + 0.004; // on the curve of the face
      still.push(tint(at(box(Math.hypot(bx - ax, by - ay) + 0.003, 0.0048, 0.003), mx, my, zs - 0.002, 0, 0, Math.atan2(by - ay, bx - ax)), hex, 0, 64 + i)); } };
    if (L.scar === 'lightning') { // a fork of lightning down through the left eye: forehead to brow, then cheek, with a small branch
      scarLine([[0.064, 0.226], [0.046, 0.211], [0.056, 0.199], [0.042, 0.186]], 0xf0cfc6);
      scarLine([[0.05, 0.147], [0.036, 0.133], [0.049, 0.121], [0.037, 0.104]], 0xf0cfc6);
      scarLine([[0.036, 0.133], [0.024, 0.126]], 0xf0cfc6);
    }
    for (const sc of [L.scar, L.scar2]) { // ordinary scars, on the right side so they never hide the lightning
      if (sc === 'cheek') scarLine([[-0.074, 0.142], [-0.03, 0.118]], 0xe9c8be);
      if (sc === 'brow') scarLine([[-0.052, 0.208], [-0.036, 0.18]], 0xe9c8be);
      if (sc === 'lip') scarLine([[-0.012, 0.118], [-0.02, 0.088]], 0xe9c8be);
    }
    soft(still);
    // the eyes themselves: iris, pupil and a point of light, moving together to look
    const iris = [];
    for (const s of [1, -1]) iris.push(
      tint(at(cyl(0.0098, 0.0098, 0.002, 10), s * ex, ey, ez + 0.0072, Math.PI / 2, 0, 0), L.eyes, 0.04, 70 + s),
      tint(at(cyl(0.0046, 0.0046, 0.002, 8), s * ex, ey, ez + 0.0084, Math.PI / 2, 0, 0), 0x0c0a08, 0, 72 + s),
      tint(at(sphere(0.0022, 4, 3), s * ex + 0.0034, ey + 0.0036, ez + 0.0092), 0xffffff, 0, 74 + s));
    this.fIris = soft(iris);
    // lids hinge at the top of the eye
    this.fLid = grp(f, 0, ey + 0.0165, 0);
    const lids = []; for (const s of [1, -1]) lids.push(
      tint(at(sphere(0.0222, 8, 5), s * ex, -0.0165, ez - 0.0035, 0, 0, 0, 1.03, 0.8, 0.8), dark(L.skin, 0.88), 0.02, 76 + s), // closes over the whole eye
      tint(at(box(0.034, 0.0042, 0.004), s * ex, -0.031, ez + 0.0125), dark(L.hair, 0.45), 0, 90 + s));                       // the lash line at its edge
    const lm = part(this.fLid, lids); lm.castShadow = false;
    // brows
    this.fBrow = {}; const bc = dark(L.hair, 0.72);
    for (const [k, s] of [['L', 1], ['R', -1]]) { const g = (this.fBrow[k] = grp(f, s * ex, ey + 0.0255, ez + 0.007)); const m = part(g, [tint(box(0.038, 0.0085, 0.008), bc, 0.1, 78 + s)]); m.castShadow = false; }
    // mouth: a slit that opens, and corners that rise or fall
    this.mouthY = 0.101; const mz = L.beard && L.beard !== 'stubble' ? 0.1235 : 0.1095, lip = L.female ? 0x7a3a36 : 0x3a1e1a;
    this.fMouth = soft([tint(at(sphere(0.021, 10, 6), 0, 0, -0.004, 0, 0, 0, 1, 0.19, 0.42), lip, 0, 80)]); this.fMouth.position.set(0, this.mouthY, mz); // a line when shut, an oval when open
    this.fCorn = soft([tint(at(sphere(0.0034, 5, 4), 0.0215, 0, 0), lip, 0, 81), tint(at(sphere(0.0034, 5, 4), -0.0215, 0, 0), lip, 0, 82)]); this.fCorn.position.set(0, this.mouthY, mz);
  }
  /** Hold an expression for a while (otherwise the face follows what the body is doing). */
  setMood(name, secs = 1.5) { this.mood = name; this.moodT = secs; }
  /** Speak a line: the mouth follows the letters at speaking pace. */
  say(text, cps = 15) { this.speech = { text: String(text), i: 0, t: 0, cps }; }
  /** One letter spoken now (dialogue feeds these as the words appear). */
  mouthChar(ch) { const c = (ch || '').toLowerCase(); this.jaw = VISEME[c] ?? (/[a-z]/.test(c) ? 0.3 : 0); this.jawT = /[,.;:!?]/.test(c) ? 0 : 0.12; }
  /** Look at a point in the world (null: look ahead). */
  lookAt(v) { this.lookTarget = v; }
  moodNow() {
    if (this.mood) return this.mood;
    const a = this.action && this.action.name, l = this.loop;
    if (l === 'dead' || a === 'fall') return 'dead';
    if (a === 'stagger') return 'pain';
    if (l === 'cower') return 'fear';
    if (l === 'mourn') return 'sad';
    if (a === 'cheer') return 'laugh';
    if ((a && /^(atk|chop|thrust|shove|parry|cleave|slam)/.test(a)) || l === 'guard' || l === 'block' || l === 'aim') return 'anger';
    return this.baseMood;
  }
  updateFace(dt) {
    const f = this.face, cam = Humanoid.cam;
    const near = !cam || cam.distanceToSquared(this.root.position) < 26 * 26; // beyond that a face is a few pixels: do not draw it
    f.visible = near;
    if (!near) return;
    if (this.moodT > 0 && (this.moodT -= dt) <= 0) this.mood = null;
    const m = MOODS[this.moodNow()] || MOODS.neutral, c = this.fc, k = 1 - Math.exp(-9 * dt);
    for (const key in m) c[key] += (m[key] - c[key]) * k;
    // blinking
    if ((this.blinkT -= dt) < 0) { this.blink = 0.13; this.blinkT = 2 + Math.random() * 4.5; }
    if (this.blink > 0) this.blink -= dt;
    const lid = this.blink > 0 ? 1 : c.lid;
    this.fLid.scale.y += ((0.1 + 0.9 * lid) - this.fLid.scale.y) * (1 - Math.exp(-38 * dt));
    // speech: letters at speaking pace, or fed one by one
    const sp = this.speech;
    if (sp) { sp.t += dt; const i = Math.floor(sp.t * sp.cps); if (i !== sp.i) { sp.i = i; this.mouthChar(sp.text[i]); } if (i >= sp.text.length) this.speech = null; }
    if (this.jawT > 0) this.jawT -= dt; else this.jaw = 0;
    const pant = c === this.fc && this.moodNow() === 'tired' ? Math.sin(this.t * 7) * 0.18 : 0;
    const open = Math.max(c.open + pant, this.jaw);
    this.jawNow = (this.jawNow || 0) + (open - (this.jawNow || 0)) * (1 - Math.exp(-26 * dt));
    this.fMouth.scale.set(c.wide * (1 - this.jawNow * 0.22), 1 + this.jawNow * 4.6, 1); this.fMouth.position.y = this.mouthY - this.jawNow * 0.006;
    this.fCorn.scale.x = c.wide * (1 - this.jawNow * 0.22); this.fCorn.position.y = this.mouthY - this.jawNow * 0.006 + c.curve * 0.0085; // corners ride with the mouth and lift or fall
    this.fBrow.L.rotation.z = c.tilt; this.fBrow.R.rotation.z = -c.tilt;
    this.fBrow.L.position.y = this.fBrow.R.position.y = 0.1915 + c.by;
    // the eyes go where the head has not yet reached
    this.fIris.position.set(clamp(this.gaze.yaw * 0.012, -0.0075, 0.0075), clamp(-this.gaze.pitch * 0.012, -0.005, 0.005), 0);
  }
  /** Head and eyes toward what he is looking at; cloth and hair; breath. */
  updateSecondary(dt) {
    const j = this.j, g = this.gaze;
    let wy = 0, wp = 0;
    if (this.lookTarget && this.loop !== 'dead') {
      j.head.getWorldPosition(_t); _u.copy(this.lookTarget).sub(_t);
      wy = clamp(angleDiff(this.root.rotation.y + this.cur.cry + this.cur.hry, Math.atan2(_u.x, _u.z)), -1.0, 1.0);
      wp = clamp(-Math.atan2(_u.y, Math.hypot(_u.x, _u.z)), -0.45, 0.5);
      if (Math.abs(wy) >= 1.0) wy = wp = 0; // behind him: he does not wring his neck
    }
    g.yaw = damp(g.yaw, wy, 7, dt); g.pitch = damp(g.pitch, wp, 7, dt);
    // cloth and hair swing back when he moves and settle when he stops
    const sp = this.speed / this.scale, want = -clamp(sp * 0.085, 0, 0.5) + Math.sin(this.t * 1.7) * 0.025 - Math.max(0, -this.cur.crx) * 0.5 + this.cur.crx * 0.6;
    this.sway = damp(this.sway, want, 5, dt);
    if (j.cloak) j.cloak.rotation.x = this.sway - this.cur.crx * 0.55 + Math.sin(this.phase * 2) * 0.03 * Math.min(1, sp / 3);
    if (j.hair) j.hair.rotation.x = this.sway * 0.8 - this.cur.nrx * 0.7 - g.pitch * 0.5;
    // breath
    const b = Math.sin(this.t * (1.5 + this.breath * 1.1)) * 0.012 * this.breath;
    this.chestMesh.scale.set(1 + b * 0.6, 1 + b * 0.25, 1 + b * 1.6);
  }
  /** Feet find the ground on a slope: the hips sink until the lower foot lands, the other leg folds. */
  plantFeet(p, dt) {
    const gnd = Humanoid.ground, l = this.loop;
    let dl = 0, dr = 0;
    if (gnd && this.face.visible && !this.lift && Math.abs(this.cur.pitch) < 0.2 && !(l === 'sit' || l === 'warm' || l === 'kneel' || l === 'cook' || l === 'mourn' || l === 'dead')) {
      const rp = this.root.position, yaw = this.root.rotation.y, cx = Math.cos(yaw) * 0.1 * this.scale, sx = Math.sin(yaw) * 0.1 * this.scale;
      dl = clamp(gnd(rp.x + cx, rp.z - sx) - rp.y, -0.28, 0.28) / this.scale; dr = clamp(gnd(rp.x - cx, rp.z + sx) - rp.y, -0.28, 0.28) / this.scale;
    }
    const ik = this.ik; ik.l = damp(ik.l, dl, 10, dt); ik.r = damp(ik.r, dr, 10, dt);
    const drop = Math.max(0, -Math.min(ik.l, ik.r)), ll = ik.l + drop, lr = ik.r + drop;
    if (drop < 0.004 && ll < 0.004 && lr < 0.004) return;
    p.hy -= drop; p.llx -= ll * 1.5; p.knL += ll * 3.1; p.lrx -= lr * 1.5; p.knR += lr * 3.1;
  }
  /** The left hand goes to the haft of a two-handed weapon (two-bone reach from the shoulder). */
  gripHaft() {
    const j = this.j, it = this.items.R, a = this.action && this.action.name, l = this.loop;
    if (!this.grip2 || !it || this.items.L || !this.face.visible) return;
    if ((l && l !== 'guard' && l !== 'block' && l !== 'talk') || (a && !/^(atk|chop|thrust|parry|cleave|slam)/.test(a))) return;
    j.chest.updateWorldMatrix(true, true);
    _t.set(0, 0, this.grip2).applyMatrix4(j.haR.matrixWorld); j.chest.worldToLocal(_t); // a point up the haft, seen from the chest
    _t.x -= D.shoulderX * this.look.build; _t.y -= D.shoulderY;
    const u = D.upper, fo = D.fore, len = clamp(_t.length(), 0.14, u + fo - 0.012);
    const E = Math.acos(clamp((u * u + fo * fo - len * len) / (2 * u * fo), -1, 1)), al = Math.acos(clamp((u * u + len * len - fo * fo) / (2 * u * len), -1, 1));
    _q.setFromUnitVectors(DOWN, _t.normalize()); _q2.setFromAxisAngle(XAX, al);
    j.shL.quaternion.copy(_q).multiply(_q2); j.elL.rotation.x = -(Math.PI - E);
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
    if (side === 'R') this.grip2 = { longaxe: 0.4, maul: 0.36, spear: 0.46 }[name] || 0; // where the second hand goes on a long haft
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
    this.plantFeet(p, dt);
    let lambda = 11;
    const a = this.action;
    if (a) {
      a.t += dt;
      const f = a.t / a.dur, keys = ACTIONS[a.name];
      if (keys && keys.smooth) sampleKeys(keys, Math.min(1, f), p);
      else if (keys) { let pose = keys[0][1]; for (const [at_, ps] of keys) if (f >= at_) pose = ps; for (const k in pose) p[k] = pose[k]; }
      lambda = keys && keys.smooth ? 42 : 21;
      if (!a.fired && a.onHit && f >= (a.hitAt ?? 0.4)) { a.fired = true; a.onHit(); }
      if (f >= 1) { this.action = null; if (a.onEnd) a.onEnd(); }
    }
    const k = 1 - Math.exp(-lambda * dt), cu = this.cur;
    for (const key of POSE_KEYS) cu[key] += (p[key] - cu[key]) * k;
    this.updateSecondary(dt);
    this.applyPose();
    this.updateFace(dt);
    const bow = this.items.L; // the bow bends and the string comes back with the draw
    if (bow && bow.userData.setDraw) { bow.userData.setDraw(this.loop === 'aim' ? this.param || 0 : 0, this.loop === 'aim' && this.nocked !== false); if (this.loop === 'aim' && !this.action) this.gripString(bow); }
  }
  /** The string hand goes to the nock, wherever the draw has brought it (two-bone reach from the right shoulder). */
  gripString(bow) {
    const j = this.j;
    j.chest.updateWorldMatrix(true, true); bow.updateWorldMatrix(true, false);
    _t.set(0, bow.userData.nockY(), 0).applyMatrix4(bow.matrixWorld); j.chest.worldToLocal(_t);
    _t.x += D.shoulderX * this.look.build; _t.y -= D.shoulderY;
    const u = D.upper, fo = D.fore, len = clamp(_t.length(), 0.16, u + fo - 0.012);
    const E = Math.acos(clamp((u * u + fo * fo - len * len) / (2 * u * fo), -1, 1)), al = Math.acos(clamp((u * u + len * len - fo * fo) / (2 * u * len), -1, 1));
    _q.setFromUnitVectors(DOWN, _t.normalize()); _q2.setFromAxisAngle(XAX, al);
    j.shR.quaternion.copy(_q).multiply(_q3.setFromAxisAngle(DOWN, Humanoid.elbowTwist ?? 1.9)).multiply(_q2); j.elR.rotation.x = -(Math.PI - E); // the elbow is carried out and back, not down
  }
  /** The two ends of the edge of what is in a hand, in the world: false if there is nothing there to cut with. */
  blade(side, base, tip) {
    const it = this.items[side], b = it && BLADE[it.userData.name];
    if (!b) return false;
    it.updateWorldMatrix(true, false);
    base.set(0, 0, b[0]).applyMatrix4(it.matrixWorld); tip.set(0, 0, b[1]).applyMatrix4(it.matrixWorld);
    return true;
  }
  applyPose() {
    const c = this.cur, j = this.j;
    j.hips.position.y = D.hip + c.hy; j.hips.rotation.set(c.hrx, c.hry, 0);
    j.chest.rotation.set(c.crx, c.cry, c.crz); j.head.rotation.set(c.nrx + this.gaze.pitch * 0.62, c.nry + this.gaze.yaw * 0.62, 0);
    j.shL.rotation.set(c.slx, c.sly, c.slz); j.shR.rotation.set(c.srx, c.sry, c.srz);
    j.elL.rotation.x = c.elL; j.elR.rotation.x = c.elR;
    j.lgL.rotation.set(c.llx, 0, c.llz); j.lgR.rotation.set(c.lrx, 0, c.lrz);
    j.knL.rotation.x = c.knL; j.knR.rotation.x = c.knR;
    this.body.rotation.x = c.pitch; this.body.position.y = c.by + (this.lift || 0);
    this.gripHaft();
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
    case 'axe': case 'father_axe': case 'brother_axe':
      g.push(tint(at(cyl(0.016, 0.02, 0.66, 5), 0, 0, 0.23, Math.PI / 2, 0, 0), WD, 0.08, 1));
      g.push(tint(at(box(0.022, 0.2, 0.1), 0, -0.07, 0.5), IR, 0.06, 2), tint(at(box(0.024, 0.07, 0.07), 0, 0.0, 0.5), 0x70747a, 0, 3));
      if (name === 'brother_axe') g.push(tint(at(box(0.026, 0.03, 0.03), 0, 0, 0.12), 0x4f7a8c, 0, 4), tint(at(box(0.026, 0.03, 0.03), 0, 0, 0.36), 0x4f7a8c, 0, 5), tint(at(box(0.028, 0.05, 0.05), 0, -0.1, 0.5), 0xc9b27a, 0, 6));
      if (name === 'father_axe') g.push( // Raven-Feeder: a bearded head, the dark iron collar at the top of the haft, ravens scratched into the steel
        tint(at(box(0.02, 0.1, 0.07), 0, -0.2, 0.47), IR, 0.06, 4), tint(at(cyl(0.027, 0.027, 0.085, 7), 0, 0, 0.41, Math.PI / 2, 0, 0), 0x1c1c20, 0, 5),
        tint(at(box(0.024, 0.045, 0.03), 0, -0.05, 0.5), 0x2a2a2e, 0, 6), tint(at(box(0.024, 0.03, 0.05), 0, -0.12, 0.5), 0x2a2a2e, 0, 7));
      break;
    case 'daneaxe': g.push(tint(at(cyl(0.022, 0.028, 1.75, 5), 0, 0, 0.62, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.028, 0.44, 0.24), 0, -0.14, 1.36), IR, 0.06, 2), tint(at(box(0.034, 0.08, 0.09), 0, 0.02, 1.36), 0x70747a, 0, 3)); break;
    case 'anvilhammer': g.push(tint(at(cyl(0.028, 0.034, 1.4, 6), 0, 0, 0.5, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.3, 0.26, 0.42), 0, 0, 1.2), 0x2c2d31, 0.08, 2), tint(at(box(0.34, 0.07, 0.07), 0, 0, 1.2), 0x1a1b1e, 0, 3), tint(at(box(0.07, 0.3, 0.07), 0, 0, 1.2), 0x1a1b1e, 0, 4)); break;
    case 'wolfsjudgment': { // Håkon's hammer: a head of black iron ringed with short spikes
      g.push(tint(at(cyl(0.024, 0.03, 1.35, 6), 0, 0, 0.48, Math.PI / 2, 0, 0), 0x3a2e24, 0.08, 1), tint(at(box(0.2, 0.2, 0.34), 0, 0, 1.12), 0x18181b, 0.08, 2));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; g.push(tint(at(cone(0.028, 0.11, 4), Math.cos(a) * 0.15, Math.sin(a) * 0.15, 1.12, 0, 0, a - Math.PI / 2), 0x30323a, 0, 3 + i)); }
      break;
    }
    case 'starfall': g.push(tint(at(cyl(0.02, 0.026, 0.95, 6), 0, 0, 0.34, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.15, 0.15, 0.26), 0, 0, 0.8), 0x0e0e12, 0.12, 2), tint(at(box(0.16, 0.04, 0.04), 0, 0, 0.8), 0x4a5a70, 0, 3)); break;
    case 'club': g.push(tint(at(cyl(0.05, 0.022, 1.15, 6), 0, 0, 0.42, Math.PI / 2, 0, 0), WD, 0.1, 1), tint(at(sphere(0.13, 7, 6), 0, 0, 1.0, 0, 0, 0, 1, 1, 1.25), 0x3a3d43, 0.08, 2)); break;
    case 'ironshield': g.push(tint(at(cyl(0.56, 0.56, 0.045, 18), 0.1, 0.08, 0, 0, 0, Math.PI / 2), 0x3a2e24, 0.1, 1), tint(at(new THREE.TorusGeometry(0.56, 0.03, 5, 18), 0.1, 0.08, 0, 0, Math.PI / 2, 0), 0x4c4f54, 0, 2), tint(at(sphere(0.1, 7, 5), 0.13, 0.08, 0, 0, 0, 0, 0.6, 1, 1), IR, 0, 3), tint(at(box(0.02, 1.0, 0.07), 0.125, 0.08, 0), 0x4c4f54, 0, 4), tint(at(box(0.02, 0.07, 1.0), 0.125, 0.08, 0), 0x4c4f54, 0, 5)); break;
    case 'halfshield': { // Rurik's: half black, half white
      const a = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 16, 1, false, 0, Math.PI), b = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 16, 1, false, Math.PI, Math.PI);
      g.push(tint(at(a, 0.09, 0.08, 0, 0, 0, Math.PI / 2), 0xe6e2d8, 0.06, 1), tint(at(b, 0.09, 0.08, 0, 0, 0, Math.PI / 2), 0x141416, 0.06, 2), tint(at(sphere(0.07, 7, 5), 0.11, 0.08, 0, 0, 0, 0, 0.6, 1, 1), IR, 0, 3));
      break;
    }
    case 'buckler': g.push(tint(at(cyl(0.2, 0.2, 0.03, 12), 0.07, 0.04, 0, 0, 0, Math.PI / 2), 0x4c4f54, 0.1, 1), tint(at(sphere(0.06, 6, 5), 0.09, 0.04, 0, 0, 0, 0, 0.7, 1, 1), 0x2a2c30, 0, 2)); break;
    case 'javelins': for (let i = 0; i < 3; i++) g.push(tint(at(cyl(0.011, 0.012, 1.3, 4), (i - 1) * 0.035, 0.02 * (i % 2), 0.2, Math.PI / 2, 0, 0), WD, 0.08, i), tint(at(cone(0.022, 0.16, 4), (i - 1) * 0.035, 0.02 * (i % 2), 0.92, Math.PI / 2, 0, 0), IR, 0, 4 + i)); break;
    case 'woodaxe': g.push(tint(at(cyl(0.02, 0.024, 0.85, 5), 0, 0, 0.3, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.03, 0.2, 0.13), 0, -0.06, 0.68), IR, 0.06, 2)); break;
    case 'longaxe': g.push(tint(at(cyl(0.02, 0.025, 1.4, 5), 0, 0, 0.5, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.03, 0.32, 0.2), 0, -0.11, 1.08), IR, 0.06, 2), tint(at(box(0.034, 0.07, 0.08), 0, 0.0, 1.08), 0x70747a, 0, 3)); break;
    case 'seax': g.push(bladeZ(0.46, 0.05, IR, 1), tint(at(box(0.11, 0.03, 0.03), 0, 0, 0.07), 0x6e5a36, 0, 2), tint(at(cyl(0.018, 0.018, 0.14, 5), 0, 0, 0, Math.PI / 2, 0, 0), WD, 0, 3)); break;
    case 'maul': g.push(tint(at(cyl(0.022, 0.028, 1.3, 6), 0, 0, 0.46, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.17, 0.17, 0.3), 0, 0, 1.08), 0x5a5e64, 0.08, 2), tint(at(box(0.19, 0.05, 0.05), 0, 0, 1.08), 0x3a3d43, 0, 3), tint(at(box(0.05, 0.19, 0.05), 0, 0, 1.08), 0x3a3d43, 0, 4)); break;
    case 'smallaxe': case 'throwaxe': g.push(tint(at(cyl(0.014, 0.017, 0.5, 5), 0, 0, 0.17, Math.PI / 2, 0, 0), WD, 0.08, 1), tint(at(box(0.02, 0.13, 0.08), 0, -0.04, 0.38), IR, 0.06, 2)); break;
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
/** A bow is three things: limbs that bend, a string that comes back to the cheek, and the arrow on it. */
function makeBow(name) {
  const R = name === 'bow' ? 0.62 : 0.9, A = 0.62, brace = R - R * Math.cos(A), tipZ = R * Math.sin(A), pull = 0.5 * (R / 0.62), g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 10; i++) { const a = -A + (i / 10) * 2 * A; pts.push(new THREE.Vector3(0, R - R * Math.cos(a), R * Math.sin(a))); }
  const limbs = new THREE.Mesh(tint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.012, 5), 0x7a5a36, 0.05, 1), M.vcPlain); limbs.castShadow = true; g.add(limbs);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  const string = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: 0xe8e0d0 })); string.frustumCulled = false; g.add(string);
  const L = 0.74 * (R / 0.62), arrow = new THREE.Mesh(merge([tint(at(cyl(0.006, 0.006, L, 4), 0, -L / 2, 0), 0xcdb48a, 0.05, 2), tint(at(cone(0.016, 0.07, 4), 0, -L - 0.03, 0, Math.PI, 0, 0), 0x9aa0a8, 0, 3),
    tint(at(box(0.001, 0.09, 0.03), 0, -0.06, 0), 0xd8d4cc, 0, 4), tint(at(box(0.03, 0.09, 0.001), 0, -0.06, 0), 0xd8d4cc, 0, 5)]), M.vcPlain); arrow.visible = false; g.add(arrow);
  g.userData.setDraw = (d, nocked) => {
    const p = sg.attributes.position, ny = brace + d * pull, fy = 1 + 0.5 * d, fz = 1 - 0.06 * d;
    limbs.scale.set(1, fy, fz);
    p.setXYZ(0, 0, brace * fy, -tipZ * fz); p.setXYZ(1, 0, ny, 0); p.setXYZ(2, 0, brace * fy, tipZ * fz); p.needsUpdate = true;
    arrow.visible = !!nocked; arrow.position.y = ny;
  };
  g.userData.nockY = () => arrow.position.y;
  g.userData.setDraw(0, false);
  return g;
}
export function makeItem(name) {
  if (name === 'bow' || name === 'bow_big') return makeBow(name);
  const m = new THREE.Mesh(itemGeo(name), M.vcPlain);
  m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  return g;
}
