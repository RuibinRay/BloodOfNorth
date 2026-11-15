// The body below the head, built the way the head is (heads.js): each part is one skin drawn through rings of a
// profile, instead of a ball, a tube and a box pushed together.
//   the torso, one skin from below the belt to the neck: a waist, a chest (a bust on a woman), shoulders that slope
//     up to the neck; the lower part follows the hips and the upper the chest, so it bends at the waist;
//   each arm, one skin from the shoulder to the wrist that bends at the elbow; a sleeve over it, short or long;
//   each leg, one skin from the hip to the ankle that bends at the knee, with trousers, leg wraps and a boot;
//   hands with a palm, four fingers that curl round what is held, and a thumb (the fingers are drawn only near);
//   a tunic skirt or a long dress whose front and back go a little way with each thigh, an apron, a mail shirt.
// How a person is built: look.build (the breadth of shoulders and chest), look.heft (thickness all over), look.belly,
// look.bust, look.stoop (an old back; from age if not given). A child is built like a small adult, without them.
//
// Pieces that bend use the second joint of fuse() in humanoid.js: a geometry hangs from one joint and follows a
// second one (userData.bone2) by a weight at each vertex (attribute w2). Both joints must have the same frame when
// nothing moves, so each second joint here is a "twin": a group hung from the joint that bends and set back by its
// offset, so that at rest it sits exactly where the first joint is.
import * as THREE from 'three';
import { smoothstep } from '../core/util.js';
import { at, sphere, tint } from '../world/geo.js';

const TAU = Math.PI * 2;
const KEYS = ['rx', 'f', 'k', 'cx', 'cz', 'p', 'w', 'bust'];
const DEF = { rx: 0.05, f: 0.05, k: 0.05, cx: 0, cz: 0, p: 2, w: 0, bust: 0 };
/** One ring of a profile at height y, between the two rings either side of it. Profiles go from the top down. */
function sample(P, y) {
  const fill = (r) => { const o = { y: r.y }; for (const k of KEYS) o[k] = r[k] ?? DEF[k]; return o; };
  if (y >= P[0].y) return { ...fill(P[0]), y };
  const last = P[P.length - 1];
  if (y <= last.y) return { ...fill(last), y };
  for (let i = 1; i < P.length; i++) if (y >= P[i].y) {
    const a = fill(P[i - 1]), b = fill(P[i]), t = (a.y - y) / (a.y - b.y), o = { y };
    for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
    return o;
  }
}
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const _c = new THREE.Color(), _d = new THREE.Color();
/** A skin through a profile, at the heights ys (top first). opts:
 *  n: vertices round; grow: added all round (a layer over another); hex: its colour (and so its stuff, see stuffOf),
 *  col(y): a different colour at some heights (two equal heights in ys make a clean edge between colours);
 *  arc: [a0, a1] only part of the way round (0 is +x, a quarter turn is the front, +z);
 *  axis 'z': the rings go along z (a foot), the front of the profile is up;
 *  shape(v): moves a vertex {x, y, z, a, r} (folds); wfn(v): the second joint's share at a vertex;
 *  dark(v): how much darker a vertex is (1 as it is); capTop, capBot: close the ends; seed, jitter. */
function loft(P, ys, o = {}) {
  const n = o.n || 8, arc = o.arc, cols = arc ? n + 1 : n + 1, grow = o.grow || 0, R = ys.length;
  const pos = [], uv = [], w2 = [], col = [], idx = [], r = rng((o.seed || 7) * 7919 + 13), jit = o.jitter ?? 0.05;
  const push = (x, y, z, u, v, w, hex, k) => {
    if (o.axis === 'z') pos.push(x, z, y); else pos.push(x, y, z);
    uv.push(u, v); w2.push(w);
    _c.set(hex); const j = (1 + (r() - 0.5) * jit) * k; col.push(_c.r * j, _c.g * j, _c.b * j);
  };
  let v = 0, prev = null;
  for (let i = 0; i < R; i++) {
    const s = sample(P, ys[i]), hex = (o.col && o.col(ys[i], i)) ?? o.hex;
    if (prev) v += Math.abs(prev.y - s.y) + 0.001;
    prev = s;
    for (let c = 0; c < cols; c++) {
      const a = arc ? arc[0] + ((arc[1] - arc[0]) * c) / n : (TAU * c) / n, ca = Math.cos(a), sa = Math.sin(a), e = 2 / s.p;
      const ex = Math.sign(ca) * Math.abs(ca) ** e, ez = Math.sign(sa) * Math.abs(sa) ** e;
      const V = { x: s.cx + (s.rx + grow) * ex, y: s.y, z: s.cz + ((sa >= 0 ? s.f : s.k) + grow) * ez, a, r: s, i };
      if (s.bust && sa > 0) { const dx = Math.abs(V.x - s.cx); V.z += s.bust * Math.exp(-(((dx - 0.082) / 0.052) ** 2)) * sa; } // two breasts, or a man's chest, either side of the middle
      if (o.shape) o.shape(V);
      const w = o.wfn ? o.wfn(V) : s.w;
      push(V.x, V.y, V.z, c / n, v, w, hex, o.dark ? o.dark(V) : 1);
    }
  }
  for (let i = 0; i < R - 1; i++) for (let c = 0; c < cols - 1; c++) {
    const a = i * cols + c, b = a + 1, d = a + cols, e = d + 1;
    if (o.axis === 'z') idx.push(a, b, d, b, e, d); else idx.push(a, d, b, b, d, e);
  }
  for (const [end, ring, sgn] of [[o.capTop, 0, 1], [o.capBot, R - 1, -1]]) {
    if (!end) continue;
    const s = sample(P, ys[ring]), y = s.y + sgn * (typeof end === 'number' ? end : 0), base = ring * cols, ci = pos.length / 3;
    let w = 0; for (let c = 0; c < cols; c++) w += w2[base + c]; w /= cols;
    push(s.cx, y, s.cz, 0.5, v + 0.01, w, (o.col && o.col(ys[ring], ring)) ?? o.hex, o.dark ? o.dark({ x: s.cx, y, z: s.cz, r: s }) : 1);
    for (let c = 0; c < cols - 1; c++) {
      const a = base + c, b = a + 1;
      if ((sgn > 0) !== (o.axis === 'z')) idx.push(ci, a, b); else idx.push(ci, b, a);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('w2', new THREE.Float32BufferAttribute(w2, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (!arc) { // the seam: the first and last vertex of each ring are one point, so they share one normal
    const N = g.attributes.normal;
    for (let i = 0; i < R; i++) {
      const a = i * cols, b = a + cols - 1;
      _d.setRGB(N.getX(a) + N.getX(b), N.getY(a) + N.getY(b), N.getZ(a) + N.getZ(b));
      const l = Math.hypot(_d.r, _d.g, _d.b) || 1;
      N.setXYZ(a, _d.r / l, _d.g / l, _d.b / l); N.setXYZ(b, _d.r / l, _d.g / l, _d.b / l);
    }
  }
  g.userData.hex = o.hex; g.userData.closes = !arc;
  if (o.bone2) g.userData.bone2 = o.bone2;
  return g;
}
/** Heights from a to b (a above b) in k equal steps, and any of extra between them. */
const span = (a, b, k) => Array.from({ length: k + 1 }, (_, i) => a + ((b - a) * i) / k);
const twin = (grp, joint, x, y, z) => grp(joint, x, y, z);

// ---- profiles: how a person is built -----------------------------------------------------------------------
/** The torso, in the chest's frame: from below the belt (where the hips take it) to the base of the neck. */
function torsoProfile(L, B) {
  const { b, fem, dep, belly, bust, stoop, wb, bw } = B;
  return [
    { y: 0.405, rx: 0.058 * Math.sqrt(b), f: 0.05, k: 0.054, cz: -0.008, p: 2 },
    { y: 0.372, rx: 0.094 * Math.sqrt(Math.min(bw, 1.1)), f: 0.06 * dep, k: 0.068 * dep, cz: -0.012, p: 2.2 },
    { y: 0.338, rx: 0.155 * bw - 0.07 * Math.max(0, bw - 1), f: 0.075 * dep, k: 0.086 * dep + 0.006 * stoop, cz: -0.012, p: 2.6 },
    { y: 0.29, rx: 0.192 * bw, f: 0.095 * dep, k: (0.104 + 0.016 * stoop) * dep, cz: -0.006, p: 3 },
    { y: 0.22, rx: 0.186 * bw, f: (0.114 + 0.004 * belly) * dep, k: (0.114 + 0.016 * stoop) * dep, p: 2.8, bust: fem ? 0.018 * bust : 0.004 },
    { y: 0.135, rx: (fem ? 0.165 : 0.176) * bw, f: (0.118 + 0.01 * belly) * dep, k: (0.107 + 0.008 * stoop) * dep, p: 2.6, bust: fem ? 0.042 * bust : 0.009 },
    { y: 0.05, rx: (fem ? 0.142 : 0.162) * (wb + bw) / 2, f: (0.112 + 0.05 * belly) * dep, k: 0.1 * dep, p: 2.5, w: 0.1, bust: fem ? 0.008 * bust : 0 },
    { y: -0.05, rx: (fem ? 0.13 : 0.152) * wb, f: (0.104 + 0.075 * belly) * dep, k: 0.095 * dep, p: 2.4, w: 0.5 },
    { y: -0.13, rx: (fem ? 0.138 : 0.15) * wb, f: (0.1 + 0.05 * belly) * dep, k: 0.097 * dep, p: 2.3, w: 0.88 },
    { y: -0.21, rx: (fem ? 0.15 : 0.148) * wb, f: (0.1 + 0.02 * belly) * dep, k: 0.1 * dep, p: 2.2, w: 1 },
  ];
}
/** An arm, in the shoulder's frame (s: +1 the left, -1 the right): deltoid, upper arm, elbow, forearm, wrist. */
function armProfile(s, am) {
  return [
    { y: 0.044, rx: 0.02 * am, f: 0.02 * am, k: 0.02 * am, cx: -0.024 * s, w: 0 },
    { y: 0.03, rx: 0.046 * am, f: 0.044 * am, k: 0.048 * am, cx: -0.01 * s },
    { y: -0.002, rx: 0.06 * am, f: 0.057 * am, k: 0.059 * am, cx: 0.005 * s },
    { y: -0.05, rx: 0.058 * am, f: 0.055 * am, k: 0.056 * am, cx: 0.008 * s },
    { y: -0.1, rx: 0.05 * am, f: 0.055 * am, k: 0.049 * am, cx: 0.003 * s, cz: 0.002 },
    { y: -0.18, rx: 0.046 * am, f: 0.049 * am, k: 0.046 * am },
    { y: -0.245, rx: 0.042 * am, f: 0.042 * am, k: 0.045 * am, w: 0.08 },
    { y: -0.29, rx: 0.04 * am, f: 0.04 * am, k: 0.046 * am, w: 0.5 },
    { y: -0.335, rx: 0.043 * am, f: 0.046 * am, k: 0.043 * am, w: 0.94 },
    { y: -0.4, rx: 0.038 * am, f: 0.042 * am, k: 0.039 * am, w: 1 },
    { y: -0.48, rx: 0.028 * Math.sqrt(am), f: 0.034 * Math.sqrt(am), k: 0.032 * Math.sqrt(am), w: 1 },
    { y: -0.55, rx: 0.019 * Math.sqrt(am), f: 0.028 * Math.sqrt(am), k: 0.027 * Math.sqrt(am), w: 1 },
  ];
}
/** A leg, in the hip's frame: thigh, knee, calf, ankle. */
function legProfile(s, lm) {
  return [
    { y: 0.03, rx: 0.068 * lm, f: 0.07 * lm, k: 0.076 * lm, cx: -0.022 * s, w: 0 },
    { y: -0.04, rx: 0.081 * lm, f: 0.085 * lm, k: 0.09 * lm, cx: -0.01 * s },
    { y: -0.13, rx: 0.077 * lm, f: 0.082 * lm, k: 0.077 * lm, cz: 0.004 },
    { y: -0.26, rx: 0.066 * lm, f: 0.07 * lm, k: 0.063 * lm, cz: 0.004 },
    { y: -0.37, rx: 0.056 * lm, f: 0.058 * lm, k: 0.054 * lm, w: 0.1 },
    { y: -0.44, rx: 0.053 * lm, f: 0.057 * lm, k: 0.05 * lm, cz: 0.004, w: 0.55 },
    { y: -0.5, rx: 0.051 * lm, f: 0.05 * lm, k: 0.056 * lm, w: 0.96 },
    { y: -0.58, rx: 0.051 * lm, f: 0.045 * lm, k: 0.064 * lm, w: 1 },
    { y: -0.68, rx: 0.044 * lm, f: 0.041 * lm, k: 0.05 * lm, w: 1 },
    { y: -0.79, rx: 0.034 * lm, f: 0.035 * lm, k: 0.035 * lm, w: 1 },
    { y: -0.85, rx: 0.035 * lm, f: 0.037 * lm, k: 0.037 * lm, w: 1 },
  ];
}

/** How a person is built, from their look. */
export function buildOf(L) {
  const b = L.build ?? 1, kid = !!L.child, fem = !!L.female && !kid, age = L.age || 0, heft = L.heft ?? 1;
  const belly = kid ? 0 : L.belly ?? 0, stoop = kid ? 0 : L.stoop ?? smoothstep(0.62, 1, age) * 0.75;
  return {
    b, kid, fem, heft, belly, stoop, bust: fem ? L.bust ?? 1 : 0,
    bw: b * (fem ? 0.9 : 1),                                         // shoulders and chest
    wb: (0.78 + 0.22 * b) * heft * (1 + belly * 0.14),              // the waist
    dep: (0.84 + 0.16 * b) * heft,                                   // front to back
    am: (0.7 + 0.3 * b) * heft * (fem ? 0.84 : 1) * (age > 0.7 ? 0.92 : 1), // arms
    lm: (0.8 + 0.2 * b) * heft * (fem ? 0.96 : 1) * (age > 0.7 ? 0.94 : 1), // legs
    hm: (0.88 + 0.12 * b) * (fem ? 0.88 : 1),                       // hands
    shX: 0.18 * b * (fem ? 0.9 : 1),                                 // where the shoulder joints are
  };
}

/** Build the body: the joints of the arms and legs (j.sh, el, ha, lg, kn and the fingers) and every piece below the
 *  head, onto the figure h. part(bone, geos) adds to the body mesh, face(bone, geos) to the mesh drawn only near.
 *  C: the colours of what is worn ({ wear, MAIL, FUR, BELT, BRONZE }). D: the skeleton's lengths. */
export function buildBody(h, L, D, part, face, grp, C) {
  const j = h.j, B = (h.built = buildOf(L)), { b, fem, kid, dep, am, lm, hm } = B, wear = C.wear;
  const T = torsoProfile(L, B);
  // the hips carry a twin of the chest, so the lower torso can follow the hips
  const waist = twin(grp, j.hips, 0, D.chestY, 0);

  // ---- the torso, the collar, the belt
  const torso = [loft(T, [0.405, 0.372, 0.338, 0.29, 0.22, 0.135, 0.05, -0.05, -0.13, -0.21], { n: 16, hex: wear, bone2: waist, seed: 5 })];
  torso.push(loft(T, [-0.112, -0.166], { n: 16, grow: 0.007, hex: C.BELT, bone2: waist, seed: 3, jitter: 0.04 })); // the belt
  torso.push(loft(T, [0.388, 0.384, 0.356, 0.35], { n: 16, grow: 0.0045, hex: L.trim, bone2: waist, seed: 9, jitter: 0.03 })); // the neck of the tunic, in the colour of the trim
  if (L.apron) { // an apron, close over the front of the chest
    torso.push(loft(T, fem ? [0.215, 0.21, 0.135, 0.05, -0.05, -0.12] : [0.2, 0.135, 0.05, -0.05, -0.12], { n: 6, arc: [Math.PI * 0.27, Math.PI * 0.73], grow: 0.006, hex: L.apron, bone2: waist, seed: 10, jitter: 0.03 }));
    if (fem) for (const sx of [-1, 1]) torso.push(tint(at(sphere(0.026, 8, 5), sx * 0.09 * B.bw, 0.215, sample(T, 0.215).f + 0.012 + 0.012 * B.bust, 0, 0, 0, 1, 0.75, 0.45), C.BRONZE, 0.04, 48 + sx)); // the two brooches of an apron dress
  }
  if (L.cloak) torso.push(tint(at(sphere(0.03, 7, 5), 0.105 * B.bw, 0.3, sample(T, 0.3).f + 0.01, 0, 0, 0, 1, 1, 0.4), C.BRONZE, 0.04, 48)); // the brooch that holds it
  if (L.fur) for (const [x, y, z, s] of [[0.17, 0.33, -0.02, 0.13], [-0.17, 0.33, -0.02, 0.13], [0, 0.31, -0.1, 0.15], [0, 0.2, -0.13, 0.13]])
    torso.push(tint(at(new THREE.IcosahedronGeometry(1, 1), x * B.bw, y, z * dep, 0, 0, 0, s * 1.25, s * 0.8, s), C.FUR, 0.3, 12 + x * 10));
  // the neck, reaching up into the head so its end never shows, darker under the jaw
  const neck = new THREE.CylinderGeometry(0.046 * Math.sqrt(b) * (fem ? 0.88 : 1), 0.06 * Math.sqrt(b) * (fem ? 0.88 : 1), 0.17, 10, 1, true);
  at(neck, 0, 0.39, -0.004); tint(neck, L.skin, 0.03, 8);
  { const P = neck.attributes.position, Cc = neck.attributes.color; for (let i = 0; i < P.count; i++) { const f = 1 - 0.28 * smoothstep(0.33, 0.46, P.getY(i)); Cc.setXYZ(i, Cc.getX(i) * f, Cc.getY(i) * f, Cc.getZ(i) * f); } }
  neck.userData.closes = true; torso.push(neck);
  h.chestMesh = part(grp(j.chest, 0, 0, 0), torso);
  if (L.cloak) { // over the shoulders and round the back, open in front, wider toward the hem; it swings from its own joint
    j.cloak = grp(j.chest, 0, 0.31, -0.02);
    const t = (y) => sample(T, y), C2 = [
      { y: 0.352 - 0.31, rx: t(0.338).rx + 0.016, f: t(0.338).f + 0.016, k: t(0.338).k + 0.016, cz: t(0.338).cz + 0.02, p: 2.6 },
      { y: 0.29 - 0.31, rx: t(0.29).rx + 0.03 + 0.04 * am, f: t(0.29).f + 0.02, k: t(0.29).k + 0.024, cz: t(0.29).cz + 0.02, p: 2.8 },
      { y: 0.08 - 0.31, rx: 0.2 * B.bw + 0.07, f: t(0.08).f + 0.03, k: t(0.135).k + 0.04, cz: 0.02, p: 2.4 },
      { y: -0.3 - 0.31, rx: 0.24 * B.bw + 0.08, f: 0.15 * dep, k: 0.17 * dep + 0.04, cz: 0.02, p: 2.2 },
      { y: -0.71 - 0.31, rx: 0.28 * B.bw + 0.09, f: 0.18 * dep, k: 0.22 * dep + 0.04, cz: 0.02, p: 2 },
    ];
    part(j.cloak, [loft(C2, C2.map((r) => r.y), { n: 12, arc: [0.3, -Math.PI - 0.3], hex: L.cloak, seed: 11, jitter: 0.08,
      shape: (v) => { const d = smoothstep(0.0, -0.9, v.y), q = 1 + 0.05 * d * Math.sin(v.a * 6 + 1.1); v.x *= q; v.z = (v.z - 0.02) * q + 0.02; } })]);
  }

  // ---- below the belt: the buckle, what is under the skirt (the skirt itself is made once the thighs are there to follow)
  const hp = T.map((r) => ({ ...r, y: r.y + D.chestY })), hips = [];
  if (!L.apron) hips.push(tint(at(new THREE.BoxGeometry(0.05, 0.044, 0.012), 0, 0.061, sample(hp, 0.06).f + 0.012), C.BRONZE, 0.04, 47)); // the buckle
  const pel = [{ y: 0.03, rx: 0.135 * B.wb, f: 0.09 * dep, k: 0.09 * dep, p: 2.3 }, { y: -0.06, rx: 0.14 * B.wb, f: 0.088 * dep, k: 0.092 * dep, p: 2.3 }, { y: -0.12, rx: 0.1, f: 0.07 * dep, k: 0.08 * dep }];
  hips.push(loft(pel, [0.03, -0.06, -0.12], { n: 10, hex: L.legs, capBot: 0.02, seed: 4 }));
  part(j.hips, hips);

  // ---- the arms and hands
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const sh = (j['sh' + side] = grp(j.chest, s * B.shX, D.shoulderY, 0)); sh.rotation.order = 'YXZ';
    const el = (j['el' + side] = grp(sh, 0, -D.upper, 0));
    const ha = (j['ha' + side] = grp(el, 0, -D.fore, 0));
    const elT = twin(grp, el, 0, D.upper, 0), A = armProfile(s, am);
    const short = L.sleeve == null, low = L.sleeve ?? L.skin, end = -0.205;
    const whole = !short && L.sleeve === wear; // a long sleeve of the same cloth: one piece from the shoulder to the wrist
    const arm = whole ? [loft(A, [0.044, 0.03, -0.002, -0.05, -0.1, -0.16, -0.245, -0.29, -0.335, -0.4, -0.48, -0.55], { n: 8, hex: wear, bone2: elT, seed: 40 + s, capTop: 0.006 })]
      : [loft(A, [0.044, 0.03, -0.002, -0.05, -0.1, -0.16, end, end], { n: 8, hex: wear, bone2: elT, seed: 40 + s, capTop: 0.006, shape: (v) => { if (v.i >= 6) { const k = v.i === 7 ? 0.0055 : 0.0035; v.x += Math.cos(v.a) * k; v.z += Math.sin(v.a) * k; if (v.i === 7) v.y -= 0.012; } } }), // the end of the sleeve stands a little proud
        loft(A, [-0.17, -0.245, -0.29, -0.335, -0.4, -0.48, -0.55], { n: 8, hex: low, bone2: elT, seed: 41 + s, grow: short ? 0 : 0.002 })];
    const band = (ys, k) => loft(A, ys, { n: 8, hex: L.trim, bone2: elT, seed: 49, jitter: 0.03, shape: (v) => { const g = v.i === 0 || v.i === 3 ? 0.002 : k; v.x += Math.cos(v.a) * g; v.z += Math.sin(v.a) * g; } });
    if (short && !L.mail) arm.push(band([-0.19, -0.19, -0.222, -0.222], 0.0075)); // a short sleeve ends in a band above the elbow
    if (!short) arm.push(band([-0.5, -0.5, -0.535, -0.535], 0.0055)); // and a long one at the wrist
    part(sh, arm);
    buildHand(h, side, s, ha, L, hm, part, face, grp);
  }

  // ---- the legs and boots
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const lg = (j['lg' + side] = grp(j.hips, s * 0.094 * Math.sqrt(B.wb) * (fem ? 1.04 : 1), 0, 0));
    j['kn' + side] = grp(lg, 0, -D.thigh, 0);
    const knT = twin(grp, j['kn' + side], 0, D.thigh, 0), G = legProfile(s, lm), wraps = L.wraps ?? L.legs;
    const leg = [loft(G, [0.03, -0.04, -0.13, -0.26, -0.37, -0.44, -0.5, -0.52, -0.52, -0.6, -0.7, -0.79], { n: 8, hex: L.legs, bone2: knT, seed: 43 + s,
      col: (y, i) => (i >= 8 ? wraps : L.legs),
      shape: (v) => { if (v.i >= 8) { v.x += Math.cos(v.a) * 0.003; v.z += Math.sin(v.a) * 0.003; } } })]; // the wraps over the trousers, from below the knee
    // the boot: a shaft with a turned top, and a foot with a heel, an instep and a toe, the sole darker
    leg.push(loft(G, [-0.715, -0.722, -0.74, -0.8, -0.86], { n: 8, hex: L.boots, bone2: knT, seed: 45 + s, wfn: () => 1, shape: (v) => { const k = [0.003, 0.0115, 0.01, 0.008, 0.008][v.i]; v.x += Math.cos(v.a) * k; v.z += Math.sin(v.a) * k; } }));
    const sole = -D.thigh - 0.465, F = [ // along the foot from the heel to the toe: y here is how far forward, f and k how far above and below the middle of it
      { y: -0.08, rx: 0.02, f: 0.026, k: 0.026, cz: sole + 0.034 },
      { y: -0.07, rx: 0.034, f: 0.04, k: 0.04, cz: sole + 0.042 },
      { y: -0.03, rx: 0.04, f: 0.046, k: 0.046, cz: sole + 0.046, p: 2.4 },
      { y: 0.025, rx: 0.043, f: 0.04, k: 0.04, cz: sole + 0.04, p: 2.5 },
      { y: 0.08, rx: 0.047, f: 0.032, k: 0.032, cz: sole + 0.032, p: 2.6 },
      { y: 0.13, rx: 0.044, f: 0.027, k: 0.027, cz: sole + 0.027, p: 2.4 },
      { y: 0.162, rx: 0.033, f: 0.022, k: 0.022, cz: sole + 0.022, p: 2.2 },
      { y: 0.178, rx: 0.016, f: 0.013, k: 0.013, cz: sole + 0.016 },
    ].map((r) => ({ ...r, rx: r.rx * (0.9 + 0.1 * lm) * (fem ? 0.92 : 1), cx: -0.004 * s }));
    leg.push(loft(F.slice().reverse(), F.map((r) => r.y).reverse(), { n: 8, axis: 'z', hex: L.boots, bone2: knT, wfn: () => 1, seed: 46 + s, capTop: 0.004, capBot: 0.004, dark: (v) => (v.z < sole + 0.006 ? 0.5 : 1) }));
    part(lg, leg);
  }

  // ---- the skirt or dress, in two halves that each go a way with their thigh (a woman's dress to the ankle, a man's tunic to the thigh)
  const long = !!L.female, hem = long ? -0.86 : -0.33, flare = long ? 0.3 : 0.24, top = sample(hp, 0.03);
  const skirt = [
    { y: 0.035, rx: top.rx + 0.003, f: top.f + 0.003, k: top.k + 0.003, p: 2.3 },
    { y: -0.06, rx: (long ? 0.176 : 0.178) * B.wb, f: (0.122 + 0.02 * B.belly) * dep, k: 0.118 * dep, p: 2.2 },
    { y: long ? -0.2 : -0.17, rx: 0.2 * B.wb * (fem ? 1.05 : 1), f: 0.148 * dep, k: 0.15 * dep, p: 2.1 },
    { y: hem, rx: flare * B.wb, f: flare * 0.78 * dep, k: flare * 0.8 * dep, p: 2 },
  ];
  const ys = long ? [0.035, -0.06, -0.2, -0.4, -0.6, -0.82, -0.82, hem] : [0.035, -0.06, -0.17, -0.295, -0.295, hem], sk = [];
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const follow = grp(j['lg' + side], -j['lg' + side].position.x, 0, 0), arc = s > 0 ? [-Math.PI / 2, Math.PI / 2] : [Math.PI / 2, Math.PI * 1.5]; // the hips' frame, carried by the thigh
    const by = (k, low) => (v) => k * smoothstep(0.015, 0.13, s * v.x) * smoothstep(0.0, low, v.y);
    sk.push(loft(skirt, ys, { n: 8, arc, hex: L.tunic, bone2: follow, seed: 2 + s, col: (y, i) => (i >= ys.length - 2 ? L.trim : L.tunic),
      shape: (v) => { const q = 1 + 0.045 * smoothstep(-0.02, long ? -0.6 : -0.25, v.y) * Math.sin(v.a * 7 + 0.6); v.x *= q; v.z *= q; }, // folds
      wfn: by(long ? 0.42 : 0.62, long ? -0.5 : -0.25) }));
    if (L.mail) sk.push(loft(skirt, [0.035, -0.06, -0.17], { n: 8, arc, grow: 0.006, hex: C.MAIL, bone2: follow, seed: 20 + s, wfn: by(0.6, -0.25) })); // a mail shirt to the thigh, over the tunic
    if (L.apron) sk.push(loft(skirt, long ? [0.035, -0.06, -0.2, -0.4, -0.62] : [0.035, -0.06, -0.17, -0.28], { n: 3, arc: s > 0 ? [Math.PI / 2 - 0.42, Math.PI / 2] : [Math.PI / 2, Math.PI / 2 + 0.42], grow: 0.012, hex: L.apron, bone2: follow, seed: 30 + s, jitter: 0.03, wfn: by(0.3, -0.3) }));
  }
  part(j.hips, sk);
}

/** A hand: the palm on the wrist (drawn at any distance), the fingers and thumb drawn only near, on joints that curl. */
function buildHand(h, side, s, ha, L, hm, part, face, grp) {
  const j = h.j, P = [
    { y: 0.012, rx: 0.019, f: 0.028, k: 0.027 },
    { y: -0.015, rx: 0.017, f: 0.033, k: 0.032, cx: 0.001 * s },
    { y: -0.045, rx: 0.015, f: 0.038, k: 0.036, cx: 0.002 * s, cz: 0.002 },
    { y: -0.07, rx: 0.013, f: 0.039, k: 0.036, cz: 0.002 },
    { y: -0.082, rx: 0.009, f: 0.033, k: 0.03, cz: 0.002 },
  ].map((r) => ({ ...r, y: r.y * hm, rx: r.rx * hm, f: r.f * hm, k: r.k * hm, cx: (r.cx || 0) * hm, cz: (r.cz || 0) * hm }));
  part(ha, [loft(P, P.map((r) => r.y), { n: 8, hex: L.skin, seed: 60 + s, capBot: 0.004, jitter: 0.03 })]);
  // the knuckles (fi), the middle joints of the fingers (fi2, with its twin back at the knuckles), the thumb (th)
  const fi = (j['fi' + side] = grp(ha, -0.002 * s * hm, -0.078 * hm, 0)), fi2 = (j['fj' + side] = grp(fi, 0, -0.04 * hm, 0)), fiT = grp(fi2, 0, 0.04 * hm, 0);
  const th = (j['th' + side] = grp(ha, -0.007 * s * hm, -0.02 * hm, 0.03 * hm)); th.rotation.order = 'XZY';
  const near = [];
  for (const [z, len, r] of [[0.026, 0.07, 0.0088], [0.009, 0.078, 0.0092], [-0.009, 0.073, 0.0088], [-0.026, 0.058, 0.0078]]) {
    const F = [
      { y: 0.006, rx: r, f: r * 1.05, k: r * 1.1, cz: z, p: 2.4 },
      { y: -0.034, rx: r * 0.95, f: r, k: r * 1.02, cz: z, p: 2.4, w: 0 },
      { y: -0.046, rx: r * 0.92, f: r * 0.96, k: r, cz: z, p: 2.4, w: 1 },
      { y: -(len - 0.01), rx: r * 0.8, f: r * 0.82, k: r * 0.85, cz: z, p: 2.2, w: 1 },
      { y: -len, rx: r * 0.55, f: r * 0.55, k: r * 0.6, cz: z, w: 1 },
    ].map((q) => ({ ...q, y: q.y * hm, rx: q.rx * hm, f: q.f * hm, k: q.k * hm, cz: q.cz * hm }));
    near.push(loft(F, F.map((q) => q.y), { n: 5, hex: L.skin, bone2: fiT, seed: 70 + z * 1000, capBot: 0.003 * hm, jitter: 0.03 }));
  }
  face(fi, near);
  const TH = [
    { y: 0.008, rx: 0.012, f: 0.013, k: 0.013 }, { y: -0.03, rx: 0.011, f: 0.011, k: 0.012 }, { y: -0.034, rx: 0.0105, f: 0.0105, k: 0.011 },
    { y: -0.052, rx: 0.009, f: 0.0095, k: 0.0095 }, { y: -0.058, rx: 0.0055, f: 0.006, k: 0.006 },
  ].map((q) => ({ ...q, y: q.y * hm, rx: q.rx * hm, f: q.f * hm, k: q.k * hm }));
  face(th, [at(loft(TH, TH.map((q) => q.y), { n: 5, hex: L.skin, seed: 80 + s, capBot: 0.003 * hm, jitter: 0.03 }), 0, 0, 0, -0.34, 0, -0.42 * s)]);
}

/** Where a held thing sits in the hand: in the fist, as the fingers close round it. */
export function gripPoint(s, hm) { return [-0.024 * s * hm, -0.054 * hm, 0.02]; }
/** Curl the fingers of a hand: c 0 open and easy, 1 closed round a haft. */
export function curl(h, side, c) {
  const j = h.j, s = side === 'L' ? 1 : -1;
  if (!j['fi' + side]) return;
  j['fi' + side].rotation.z = -s * (0.22 + 1.28 * c);
  j['fj' + side].rotation.z = -s * (0.3 + 1.6 * c);
  j['th' + side].rotation.set(0.15 * c, 0, -s * (0.05 + 0.55 * c));
}
