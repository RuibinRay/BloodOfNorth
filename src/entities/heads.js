// Faces and hair: the head of every figure, built from its look.
//
// The skull is a ball shaped by the face it is given (the jaw, the chin, the cheekbones, the ridge of the brow, the
// sockets the eyes sit in) and painted in its own vertex colours: cheeks, shadowed sockets, the shadow of a beard, the
// scalp under the hair, soot or mud. On it: a nose and ears; eyes whose irises turn to look and whose lids close over
// them; brows; lips on a jaw that opens to speak; and hair and beard in one of many styles, greying with age.
//
// Everything is in the head joint's own space: the joint is at the top of the neck and the middle of the skull is 0.15
// above it; +z is the way the face looks, +x is the figure's left. Pieces that bend (the lips, the jaw and the chin,
// a beard, hair that hangs onto the back) are skinned to two joints at once: every joint used that way has the head's
// own frame when nothing moves, so a vertex can lie anywhere between the two (see fuse in humanoid.js).
//
// What a look can say (all optional; humanoid.js has the defaults):
//   face       even | lean | broad | long | round | square | heavy | heart | gaunt   the shape of the skull and jaw
//   jaw chin cheek ridge hollow full   numbers that override the shape (jaw width, chin forward, cheekbones, brow ridge,
//                                       hollow cheeks, round cheeks)
//   nose       straight | hooked | snub | broad | broken | button | long        noseSize: a number about 1
//   ears       small | big | out        eyeSize, eyeSet (how far apart), eyes (colour), blind (milky eyes)
//   brows      thickness, about 1 (0.7 thin, 1.4 heavy)   browArch: how high they curve
//   lips       thin | full                mouth: width, about 1
//   eyeShape   round | narrow | hooded | deep | up | down   (wide open, narrowed, a fold of skin over the lid, set deep
//              under the brow, the outer corners lifted, the outer corners drooping); almond, the default, says nothing
//   mouthShape bow | pout | crooked     (a cupid's bow, a full lower lip, one corner higher)   corners: -1..1, the mouth
//              turned down or up when the face is at rest
//   age        0..1, lines in the face    rosy: 0..1 cheeks   freckles: 0..1   soot, mud: 0..1 (smears on the face)
//   hairStyle  see HAIR below            fringe: 0..1 (hair over the brow)   recede: 0..1 (a receding hairline)
//   part       center | side            grey: 0..1 (grey through hair and beard)   temples: 0..1 (grey at the temples)
//   beard      stubble | short | full | long | belt | forked | braided | goatee     beardHair: its colour, if not the hair's
//   moustache  thin | full | droop | false (each beard has its own unless this says)  earring: true (a gold ring, left ear)
//   circlet    true: a plain iron band round the brow
// In humanoid.js: mood (the face worn at rest: smile, smirk, scowl, worried, grin...), squint (0..1, lids that sit low),
// wry (one brow raised).
import * as THREE from 'three';
import { clamp, smoothstep, lerp, noise2 } from '../core/util.js';
import { at } from '../world/geo.js';

const HC = 0.138, R0 = 0.112, DEG = Math.PI / 180; // the middle of the skull, above the joint
/** Eye shapes: sq lids lower (+) or higher (-) at rest; low the lower lid lower (+) or higher (-); tilt the outer corners up (+);
 *  deep set back under the brow; hood a fold of skin over the upper lid. */
const EYES = { almond: {}, round: { sq: -0.28, low: 0.14 }, narrow: { sq: 0.38, low: -0.13 }, hooded: { sq: 0.14, hood: 1 }, deep: { sq: 0.16, deep: 0.0048 },
  up: { tilt: 0.26, sq: 0.04 }, down: { tilt: -0.24, sq: 0.1 } };
const G = (v, m, w) => Math.exp(-(((v - m) / w) ** 2));
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/** Skull shapes: proportions [w, h, d] of the ball, and how strong the jaw, chin, cheekbones, brow ridge, hollows and round cheeks are. */
const SHAPES = {
  even: { w: 0.95, h: 1.13, d: 1.02, jaw: 0.86, chin: 0.28, cheek: 0.3, ridge: 0.35, hollow: 0, full: 0 },
  lean: { w: 0.89, h: 1.17, d: 1.0, jaw: 0.8, chin: 0.32, cheek: 0.5, ridge: 0.4, hollow: 0.45, full: 0 },
  broad: { w: 1.03, h: 1.08, d: 1.05, jaw: 0.97, chin: 0.22, cheek: 0.35, ridge: 0.55, hollow: 0, full: 0.1 },
  long: { w: 0.92, h: 1.22, d: 1.0, jaw: 0.84, chin: 0.38, cheek: 0.3, ridge: 0.42, hollow: 0.2, full: 0 },
  round: { w: 1.0, h: 1.06, d: 1.04, jaw: 0.96, chin: 0.06, cheek: 0.1, ridge: 0.15, hollow: 0, full: 0.6 },
  square: { w: 0.99, h: 1.12, d: 1.04, jaw: 1.0, chin: 0.32, cheek: 0.3, ridge: 0.55, hollow: 0.1, full: 0 },
  heavy: { w: 1.05, h: 1.1, d: 1.06, jaw: 1.05, chin: 0.36, cheek: 0.3, ridge: 0.75, hollow: 0, full: 0.25 },
  heart: { w: 0.93, h: 1.12, d: 1.0, jaw: 0.74, chin: 0.16, cheek: 0.5, ridge: 0.15, hollow: 0.1, full: 0 },
  gaunt: { w: 0.88, h: 1.18, d: 0.99, jaw: 0.8, chin: 0.3, cheek: 0.65, ridge: 0.55, hollow: 0.85, full: 0 },
};
function shapeOf(L) {
  const s = { ...(SHAPES[L.face] || SHAPES.even) };
  if (L.female) { s.ridge *= 0.3; s.jaw *= 0.95; s.chin *= 0.7; }
  if (L.child) { s.ridge = 0; s.jaw = Math.min(0.92, s.jaw + 0.04); s.chin = 0.1; s.cheek *= 0.3; s.hollow = 0; s.full = Math.max(s.full, 0.55); }
  for (const k of ['jaw', 'chin', 'cheek', 'ridge', 'hollow', 'full']) if (typeof L[k] === 'number') s[k] = L[k];
  s.W = R0 * s.w; s.H = R0 * s.h; s.D = R0 * s.d;
  s.ex = 0.37 * (L.eyeSet || 1); s.ey = 0.13; s.my = -0.4; // where the eyes and the mouth are, as fractions of the skull
  return s;
}
/** A point of the unit ball (x left, y up, z forward) moved onto this skull. */
function skull(s, ux, uy, uz) {
  const front = Math.max(0, uz), back = Math.max(0, -uz), ax = Math.abs(ux), sx = ux < 0 ? -1 : 1;
  let x = ux * (1 - (1 - s.jaw) * smoothstep(0.05, -0.9, uy)), y = uy, z = uz;
  if (uz < 0) z *= 1 - 0.3 * smoothstep(-0.1, -0.9, uy);                                 // the back of the head tucks in above the neck
  z += s.chin * 0.15 * G(ux, 0, 0.32) * G(uy, -0.8, 0.2) * front;                          // the chin
  y -= s.chin * 0.03 * G(ux, 0, 0.3) * G(uy, -0.9, 0.15) * front;
  x += sx * (s.cheek * 0.05 * G(uy, -0.05, 0.16) - s.hollow * 0.06 * G(uy, -0.38, 0.16)) * G(uz, 0.55, 0.35); // cheekbones, and hollows under them
  x += sx * s.full * 0.06 * G(uy, -0.35, 0.3) * G(uz, 0.4, 0.45);                          // round cheeks
  z += s.full * 0.04 * G(ax, 0.45, 0.25) * G(uy, -0.3, 0.25) * front;
  z += s.ridge * 0.06 * G(uy, 0.3, 0.09) * G(ux, 0, 0.6) * front;                          // the ridge of the brow
  z -= 0.1 * G(ax, s.ex, 0.17) * G(uy, s.ey + 0.01, 0.12) * front;                         // the sockets of the eyes
  x -= sx * 0.035 * G(uy, 0.35, 0.15) * G(uz, 0.35, 0.3);                                 // the temples
  z -= 0.05 * G(uy, 0.25, 0.3) * back;                                                     // the back of the skull
  return [x * s.W, HC + y * s.H, z * s.D];
}
const dirOf = (th, ph) => [Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th)]; // th round from the front (+ to the left), ph down from the top
const onSkull = (s, th, ph) => { const d = dirOf(th, ph); return skull(s, d[0], d[1], d[2]); };
/** Which way is out from the skull at a direction of the ball. */
const outAt = (s, d) => { const n = [d[0] / s.W, d[1] / s.H, d[2] / s.D], l = Math.hypot(...n); return [n[0] / l, n[1] / l, n[2] / l]; };
/** How far forward the face is at (x, y) of the head. */
function surfZ(s, x, y) {
  const uy = clamp((y - HC) / s.H, -0.99, 0.99), ux = clamp(x / (s.W * (1 - (1 - s.jaw) * smoothstep(0.05, -0.9, uy))), -0.99, 0.99);
  return skull(s, ux, uy, Math.sqrt(Math.max(1e-4, 1 - ux * ux - uy * uy)))[2];
}

// ---- building surfaces ---------------------------------------------------------------------------------------
/** A surface from a grid of points: P(i, j) for column i of nu and row j of nv; C(i, j, p) its colour (linear rgb).
 *  wrap: the last column is the first (smooth the normals there); poles: rows 0 and nv each meet in one point. */
function grid(nu, nv, P, C, o = {}) {
  const n = (nu + 1) * (nv + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3), idx = [];
  for (let j = 0, k = 0; j <= nv; j++) for (let i = 0; i <= nu; i++, k++) {
    const p = P(i, j); pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2];
    uv[k * 2] = i / nu; uv[k * 2 + 1] = 1 - j / nv;
    const c = C(i, j, p); col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const N = g.attributes.normal, avg = (list) => { let x = 0, y = 0, z = 0; for (const v of list) { x += N.getX(v); y += N.getY(v); z += N.getZ(v); } const l = Math.hypot(x, y, z) || 1; for (const v of list) N.setXYZ(v, x / l, y / l, z / l); };
  if (o.wrap) for (let j = 0; j <= nv; j++) avg([j * (nu + 1), j * (nu + 1) + nu]);
  if (o.poles) for (const j of [0, nv]) avg(Array.from({ length: nu + 1 }, (_, i) => j * (nu + 1) + i));
  if (o.wrap) g.userData.closes = true; // whole repeats of the grain round it (see dress)
  return g;
}
/** A tube along a curve: radius R(t) (t from 0 at the start to 1 at the end), C(t, a, p) its colour. */
function tube(pts, R, nr, ns, C, wobble) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), fr = curve.computeFrenetFrames(ns, false), c = new THREE.Vector3();
  return grid(nr, ns, (i, j) => {
    const t = j / ns, a = (i / nr) * Math.PI * 2, r = R(t, a); curve.getPointAt(t, c);
    const N = fr.normals[j], B = fr.binormals[j], w = wobble ? wobble(t) : 0;
    return [c.x + (Math.cos(a) * r + w) * N.x + Math.sin(a) * r * B.x, c.y + (Math.cos(a) * r + w) * N.y + Math.sin(a) * r * B.y, c.z + (Math.cos(a) * r + w) * N.z + Math.sin(a) * r * B.z];
  }, (i, j, p) => C(j / ns, (i / nr) * Math.PI * 2, p), { wrap: true });
}
/** A thin ribbon lying on the face through [x, y] points: scars, lines of age, freckles. */
function stroke(s, pts, w, col, lift = 0.0007) {
  const n = pts.length - 1, W = typeof w === 'number' ? () => w : w;
  return grid(n, 1, (i, j) => {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, h = (j - 0.5) * W(i / n);
    const x = p[0] - (ty / l) * h, y = p[1] + (tx / l) * h;
    return [x, y, surfZ(s, x, y) + lift];
  }, () => col);
}
/** Give a geometry a second joint to follow, by how much at each of its points (w(p) from 0 to 1). */
function blend(g, bone2, w) {
  const P = g.attributes.position, a = new Float32Array(P.count);
  for (let i = 0; i < P.count; i++) a[i] = clamp(w([P.getX(i), P.getY(i), P.getZ(i)]), 0, 1);
  g.setAttribute('w2', new THREE.BufferAttribute(a, 1)); g.userData.bone2 = bone2;
  return g;
}
const made = (g, stuff, hex) => { g.userData.stuff = stuff; g.userData.hex = hex; return g; };

// ---- hair ------------------------------------------------------------------------------------------------------
// line: where the hair starts, as the height on the skull (1 the top, 0 the middle, -1 the chin), at 0, 35, 58 (the
// corner of the temple), 70 and 80 (the sideburn), 95 (over the ear), 125 (behind it) and 180 degrees (the nape)
// round from the brow. vol: how thick it
// lies on the top, the sides and the back. long: where hanging hair ends at the sides and at the back (head height).
const LINE_AT = [0, 35, 58, 70, 80, 95, 125, 180];
const TIED = { line: [0.7, 0.65, 0.52, 0.39, 0.16, 0.38, -0.06, -0.42], vol: [0.011, 0.0075, 0.009], tufts: 0.04, part: 'center' };
const LOOSE = { line: [0.68, 0.63, 0.5, 0.3, 0, 0.25, -0.1, -0.4], vol: [0.018, 0.014, 0.016], tufts: 0.14 };
export const HAIR = {
  short: { line: [0.68, 0.63, 0.5, 0.31, 0.02, 0.3, -0.12, -0.45], vol: [0.02, 0.011, 0.014], tufts: 0.22 },
  crop: { line: [0.7, 0.65, 0.52, 0.36, 0.1, 0.32, -0.1, -0.42], vol: [0.0065, 0.0045, 0.0055], tufts: 0.05 },
  tousled: { line: [0.66, 0.61, 0.48, 0.315, 0.05, 0.3, -0.15, -0.5], vol: [0.028, 0.016, 0.018], tufts: 0.5, tips: 0.7, fringe: 0.5 },
  swept: { line: [0.7, 0.65, 0.52, 0.34, 0.06, 0.3, -0.12, -0.5], vol: [0.026, 0.012, 0.018], tufts: 0.12, quiff: 1 },
  shoulder: { ...LOOSE, long: [-0.02, -0.07], jag: 0.5 },
  long: { ...LOOSE, long: [-0.07, -0.26], jag: 0.6 },
  mane: { line: [0.64, 0.59, 0.47, 0.285, 0, 0.25, -0.1, -0.4], vol: [0.034, 0.027, 0.03], tufts: 0.6, long: [-0.06, -0.2], jag: 1.2, flare: 0.05 },
  warrior: { ...LOOSE, long: [-0.06, -0.24], jag: 0.6, sideBraids: true },
  tail: { ...TIED, part: null, tail: 0.24 },
  braid: { ...TIED, braid: 'back' },
  braidfront: { ...TIED, braid: 'front' },
  braids: { ...TIED, braid: 'two' },
  bun: { ...TIED, bun: 0.12 },
  lowbun: { ...TIED, bun: -0.22 },
  topknot: { line: [0.72, 0.67, 0.54, 0.42, 0.2, 0.4, -0.05, -0.35], vol: [0.005, 0.0035, 0.004], tufts: 0.05, knot: true },
  balding: { line: [0.68, 0.63, 0.5, 0.325, 0.05, 0.32, -0.12, -0.45], vol: [0.011, 0.011, 0.014], tufts: 0.25, from: 0.42, front: 62 },
  cropped: { line: [0.68, 0.63, 0.5, 0.36, 0.12, 0.32, -0.1, -0.45], vol: [0.011, 0.006, 0.008], tufts: 0.1, tips: 0.4 },
};
function lineAt(vals, deg) {
  for (let k = 0; k < LINE_AT.length - 1; k++) if (deg <= LINE_AT[k + 1]) { const t = (deg - LINE_AT[k]) / (LINE_AT[k + 1] - LINE_AT[k]); return vals[k] + (vals[k + 1] - vals[k]) * t * t * (3 - 2 * t); }
  return vals[vals.length - 1];
}
/** The colour of a hair at a place: stripes of lighter and darker locks, grey where age has put it. Grey comes in
 *  streaks (whole locks of it, more of them the greyer), and at the temples first. */
function hairCol(base, grey, temples, i, j, deg, uy, k = 1) {
  const lock = 0.82 + 0.34 * (0.5 + 0.5 * noise2(i * 1.37 + 3.1, j * 0.45));
  const gk = clamp(smoothstep(1.02 - grey, 1.22 - grey, hash(i, 3) * 0.85 + hash(i, j) * 0.15) * 0.62 + grey * 0.22 + temples * G(deg, 70, 22) * G(uy, 0.32, 0.28), 0, 1);
  return mul(mix(base, GREY, gk), lock * k);
}
const GREY = lin(0xb9b5ad);

export function buildHead(h, L, part, face, grp) {
  const j = h.j, s = shapeOf(L), skin = lin(L.skin), b = L.build, hs = L.child ? 1.24 : 1, st = HAIR[L.hairStyle] || null;
  const hairC = lin(L.hair), beardC = lin(L.beardHair ?? L.hair), grey = L.grey || 0, temples = L.temples || 0, helm = L.helmet || L.skull;
  const rosy = L.rosy ?? (L.child ? 0.5 : L.female ? 0.3 : 0.22), age = L.age || 0;
  // joints. Each that bends a piece with another has the head's own frame at rest (see the top of this file).
  const pivot = grp(j.head, 0, HC - 0.003, -0.028); j.jaw = grp(pivot, 0, 0.003 - HC, 0.028); h.jawPivot = pivot; // the jaw turns about a point in front of the ear
  j.nape = grp(j.chest, 0, 0.42, 0); j.nape.scale.setScalar(hs);                                      // where the head is when it is not turned: what hangs below the jaw follows the body
  const hp = grp(j.nape, 0, 0.17, -0.01); j.hang = grp(hp, 0, -0.17, 0.01); h.hangPivot = hp;          // hair that hangs down the back, and swings
  const cL = grp(j.head, 0, 0, 0), cR = grp(j.head, 0, 0, 0); h.fCornL = cL; h.fCornR = cR;             // the corners of the mouth

  // ---- where the parts of the face are ----
  const Ym = HC + s.my * s.H, hw = 0.0215 * (L.female ? 0.94 : 1) * (L.child ? 0.8 : 1) * (L.mouth || 1); h.mouthW = hw;
  const jawW = (p) => { const side = smoothstep(0.02, 0.075, Math.abs(p[0])); return smoothstep(Ym + 0.001 + 0.01 * side, Ym - 0.006 - 0.022 * side, p[1]) * smoothstep(-0.055, 0.015, p[2]); };
  const beard = L.beard || null, BD = BEARD[beard] || null;
  const hairline = (deg) => { // where the hair starts, the height on the skull, at an angle from the brow
    if (!st) return 2;
    const line = [...st.line], fr = L.fringe ?? st.fringe ?? 0, rc = L.recede || 0;
    line[0] = lerp(line[0], 0.33, fr) + 0.18 * rc; line[1] = lerp(line[1], 0.4, fr * 0.6) + 0.26 * rc;
    return lineAt(line, deg);
  };
  const beardTop = (deg) => BD ? lineAt(BD.top, Math.min(180, deg * 1.0)) : -2;

  // ---- the skull ----
  const NU = 24, NV = 14;
  const thAt = (i) => { const t = (i / NU) * 2 - 1; return Math.PI * t * (0.6 + 0.4 * t * t); }; // denser over the face
  const phAt = (jj) => { const t = jj / NV; return Math.PI * (t + (0.36 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI)); };
  const soot = L.soot || 0, mud = L.mud || 0, SOOT = lin(0x2a2420), MUD = lin(0x5a4630);
  const headGeo = grid(NU, NV, (i, jj) => onSkull(s, thAt(i), phAt(jj)), (i, jj) => {
    const th = thAt(i), ph = phAt(jj), d = dirOf(th, ph), ax = Math.abs(d[0]), uy = d[1], front = Math.max(0, d[2]), deg = Math.abs(th) / DEG;
    let c = mul(skin, 1 + (hash(i, jj) - 0.5) * 0.05);
    c = mul(c, 1 - (0.14 + 0.1 * age) * G(ax, s.ex, 0.2) * G(uy, s.ey, 0.15) * front);             // the sockets
    c = mul(c, 1 - 0.16 * smoothstep(-0.55, -0.95, uy));                                           // under the jaw
    c = mix(c, ROSY, rosy * 0.4 * G(ax, 0.48, 0.18) * G(uy, -0.14, 0.2) * front);                   // the cheeks
    if (soot) c = mix(c, SOOT, soot * clamp(0.35 + 0.9 * noise2(d[0] * 4 + 7, uy * 4), 0, 1) * (0.4 + front));
    if (mud) c = mix(c, MUD, mud * clamp(0.6 * noise2(d[0] * 9, uy * 2.5) + 0.25, 0, 1) * front * G(ax, 0.5, 0.3));
    // the scalp under the hair is the hair's colour, so nothing pale shows between locks
    const hl = hairline(deg), from = st && st.from != null ? st.from : 2, bareFront = st && st.front ? smoothstep(st.front + 8, st.front - 12, deg) : 0;
    if (st && uy > hl + 0.06 && !(uy > from - 0.04) && bareFront < 0.02) c = mix(c, mul(hairCol(hairC, grey, temples, i, jj, deg, uy), 0.55), 0.9);
    else if (L.hairStyle === 'shaved' && uy > 0.3 - 0.25 * smoothstep(60, 150, deg)) c = mix(c, mul(hairC, 0.7), 0.4);
    else if ((L.hairStyle === 'bald' || L.hairStyle === 'balding') && uy > 0.4) c = mul(c, 1.06);
    // a beard's shadow on the skin, or stubble
    const bt = beardTop(deg), stub = beard === 'stubble' ? lineAt([-0.2, -0.23, -0.2, -0.15, -0.08, 0.04, 0.04, 0.04], deg) : -2;
    const lips = G(d[0] / 0.2, 0, 1) * G(uy, s.my, 0.07);
    if (BD && uy < bt && deg < (BD.side || 90) && lips < 0.5) c = mix(c, mul(beardC, 0.5), 0.85);
    else if (stub > -2 && deg < 92) c = mix(c, mix(mul(skin, 0.82), mul(beardC, 0.6), 0.45), 0.42 * (1 - lips) * smoothstep(stub, stub - 0.14, uy) * smoothstep(92, 70, deg)); // stubble: a shadow, soft at its edges
    return c;
  }, { wrap: true, poles: true });
  const head = [made(blend(headGeo, j.jaw, jawW), 'plain', L.skin)];

  // ---- the nose ----
  head.push(made(noseGeo(s, L, skin, rosy), 'plain', L.skin));
  // ---- the ears ----
  if (!(st && st.long)) for (const sx of [1, -1]) head.push(made(earGeo(s, L, skin, sx), 'plain', L.skin)); // hair that hangs covers them

  // the body below the head, in the head's own measure (a child's head is drawn larger): how wide and deep the neck and
  // chest are at a height, how far forward the chest (and an apron) is, how far back the back (and a cloak, a fur)
  const bodyAt = (y) => { const c = y * hs + 0.42, t = clamp((c + 0.19) / 0.5, 0, 1), rx = c > 0.31 ? 0.062 : lerp(0.165, 0.2 * b, t); return { rx: rx / hs, rz: (c > 0.31 ? 0.062 : rx * 0.68) / hs, chest: c <= 0.31 }; };
  const frontZ = (x, y) => { const B = bodyAt(y); return B.rz * Math.sqrt(Math.max(0, 1 - (x / B.rx) ** 2)) + (B.chest && L.apron ? 0.022 : 0.006) / hs; };
  const backZ = (y) => { const B = bodyAt(y); return B.rz + ((B.chest && L.cloak ? 0.04 * b : 0) + (B.chest && L.fur ? 0.04 : 0) + 0.006) / hs; };

  // ---- hair ----
  const hang = [], nape = []; // pieces on the head that blend into the swinging hang, or into the still nape
  if (st) {
    const shell = hairShell(s, L, st, hairC, grey, temples, hairline, helm, NU, thAt);
    head.push(made(shell.geo, 'hair', L.hair));
    if (st.long) hang.push(made(curtain(s, L, st, shell, hairC, grey, temples, b, hs, thAt, NU), 'hair', L.hair));
    if (st.tail) hang.push(...tail(s, L, hairC, grey, st.tail));
    const kid = L.child ? 0.72 : 1;
    if (st.braid === 'back') { const r = 0.02, ys = [-0.08, -0.2, -0.33 * kid]; hang.push(...braidOf(s, [[0, HC - 0.03, -(s.D + 0.004)], [0, 0.04, -(s.D * 0.98 + 0.008)], ...ys.map((y) => [0, y, -(backZ(y) + r)])], r, hairC, grey)); }
    const front = (sx, r, len) => { const x = (k) => (sx * (0.12 - 0.007 * k) * b) / hs, ys = [-0.15 / hs, (-0.29 / hs) * len]; return [[sx * s.W * 0.8, HC - 0.055, -s.D * 0.62], [sx * s.W * 0.93, HC - 0.13, -0.025], [x(0), -0.032 / hs + r, 0.02 / hs], ...ys.map((y, k) => [x(k + 1), y, frontZ(x(k + 1), y) + r + 0.002])]; };
    if (st.braid === 'front') nape.push(...braidOf(s, front(L.braidSide || 1, 0.019, kid), 0.019, hairC, grey));
    if (st.braid === 'two') for (const sx of [1, -1]) nape.push(...braidOf(s, front(sx, 0.016, 0.8 * kid), 0.016, hairC, grey));
    if (st.sideBraids) for (const sx of [1, -1]) nape.push(...braidOf(s, [[sx * s.W * 0.9, HC + 0.035, s.D * 0.45], [sx * s.W * 1.02, HC - 0.04, s.D * 0.5], [sx * s.W * 1.05, HC - 0.12, s.D * 0.5], [sx * s.W * 1.02, -0.02, 0.06]], 0.0085, hairC, grey, 9));
    if (st.bun != null) head.push(made(bunGeo(s, st.bun, hairC, grey), 'hair', L.hair));
    if (st.knot) head.push(made(at(new THREE.SphereGeometry(0.048, 9, 6), 0, HC + s.H + 0.02, -0.03), 'hair', L.hair), made(at(new THREE.CylinderGeometry(0.02, 0.03, 0.05, 7), 0, HC + s.H - 0.005, -0.03), 'hair', L.hair));
    if (st.knot) for (const g of head.slice(-2)) paint(g, mul(hairC, 0.95));
  }
  if (L.circlet) { // a plain iron band round the brow, over the hair
    const ring = grid(NU, 1, (i, k) => { const th = thAt(i), uy = lerp(0.58, 0.42, smoothstep(0, 160, Math.abs(th) / DEG)) + (k ? 0.1 : 0), d = dirOf(th, Math.acos(uy)), p = skull(s, ...d), n = outAt(s, d), T = (st ? st.vol[0] * 0.6 : 0) + 0.006; return [p[0] + n[0] * T, p[1] + n[1] * T, p[2] + n[2] * T]; }, (i, k) => lin(k ? 0x5a5e64 : 0x4a4d52), { wrap: true });
    head.push(made(ring, 'plain', 0x4a4d52));
  }
  // ---- the beard ----
  if (BD) {
    head.push(made(beardShell(s, L, BD, beardC, grey, temples, Ym, hw, jawW, j.jaw), 'hair', L.hair));
    if (BD.len) nape.push(...longBeard(s, L, BD, beardC, grey, temples, Ym, b, hs, j));
    if (BD.braid) nape.push(...braidOf(s, [[0, Ym - 0.05, s.D * 0.98], [0, HC - s.H * 1.02, s.D * 0.95], [0, -0.02, 0.1], [0, -0.13, frontZ(0, -0.13) + 0.018]], 0.014, beardC, grey + 0.1));
  }
  const mo = L.moustache ?? (BD ? BD.mo : null);
  if (mo) head.push(made(moustache(s, mo, beardC, grey, temples, Ym, hw), 'hair', L.hair));

  part(j.head, head);
  for (const g of hang) blend(g, j.hang, (p) => smoothstep(0.1, -0.03, p[1]));
  for (const g of nape) if (!g.userData.bone2) blend(g, j.nape, (p) => smoothstep(0.06, -0.06, p[1]));
  if (hang.length) part(j.head, hang);
  const napeJaw = nape.filter((g) => g.userData.onJaw), napeHead = nape.filter((g) => !g.userData.onJaw);
  if (napeHead.length) part(j.head, napeHead);
  if (napeJaw.length) part(j.jaw, napeJaw);

  buildFace(h, L, s, face, grp, { skin, hairC, beardC, grey, temples, Ym, hw, age, rosy });
}

/** Paint a whole geometry one colour. */
function paint(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }

function noseGeo(s, L, skin, rosy) {
  const kind = L.nose || (L.child ? 'button' : 'straight'), size = (L.noseSize || 1) * (L.child ? 0.78 : L.female ? 0.88 : 1);
  const len = 0.041 * size * (kind === 'long' ? 1.16 : kind === 'button' ? 0.82 : 1);
  const yR = HC + (s.ey - 0.03) * s.H, yB = yR - len;
  const P = 0.021 * size * (kind === 'snub' ? 0.82 : kind === 'button' ? 0.76 : kind === 'hooked' ? 1.12 : kind === 'long' ? 1.08 : 1);
  const Wd = 0.0102 * size * (kind === 'broad' ? 1.38 : kind === 'button' ? 1.05 : 1), red = L.redNose ? 0.5 : 0;
  const NA = 8, NT = 7;
  return grid(NA, NT + 1, (i, jj) => {
    const a = -Math.PI / 2 + (Math.PI * i) / NA, t = Math.min(1, jj / NT), floor = jj > NT;
    const w = lerp(0.0042, Wd, Math.pow(t, 1.4)) + 0.0036 * size * G(t, 0.88, 0.12) * (kind === 'broad' ? 1.4 : 1);
    let p = P * (t < 0.82 ? lerp(0.2, 1, Math.pow(t / 0.82, 1.15)) : lerp(1, 0.42, (t - 0.82) / 0.18)), y = lerp(yR, yB, t), x = Math.sin(a) * w;
    if (kind === 'hooked') { p += 0.0045 * G(t, 0.42, 0.18); y -= 0.0035 * smoothstep(0.7, 1, t); }
    if (kind === 'snub') { y += 0.0045 * smoothstep(0.55, 1, t); p *= 1 - 0.12 * G(t, 0.5, 0.2); }
    if (kind === 'broken') { x += 0.003 * G(t, 0.38, 0.2); p += 0.0025 * G(t, 0.4, 0.12); }
    const ridge = Math.pow(Math.max(0, Math.cos(a)), lerp(0.45, 0.9, t)), z = surfZ(s, x, y) - 0.0016 + (floor ? 0 : ridge * p);
    return [x, y, z];
  }, (i, jj) => {
    const a = -Math.PI / 2 + (Math.PI * i) / NA, t = Math.min(1, jj / NT), ca = Math.max(0, Math.cos(a));
    if (jj > NT) return mul(skin, Math.abs(a) > 0.25 && Math.abs(a) < 1.3 ? 0.42 : 0.7);           // underneath: the nostrils
    return mix(mul(skin, 1 + 0.05 * ca * (1 - t)), ROSY_N, (rosy * 0.45 + red) * G(t, 0.86, 0.22) * ca);
  });
}
const ROSY_N = lin(0xc05a50), ROSY = lin(0xc8645a);

function earGeo(s, L, skin, sx) {
  const sz = (L.ears === 'big' ? 1.18 : L.ears === 'small' ? 0.86 : 1) * (L.child ? 0.94 : 1), out = L.ears === 'out' ? 0.5 : 0.1;
  const g = new THREE.SphereGeometry(1, 8, 6), P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r2 = y * y + z * z, lobe = y < -0.45 ? lerp(1, 0.62, (-y - 0.45) / 0.55) : 1;
    let X = x * 0.0055;
    if (x > 0) X -= 0.0062 * sz * Math.max(0, 1 - r2 * 1.25);                              // the hollow of the ear, inside its rim
    P.setXYZ(i, X, y * 0.0265 * sz, z * 0.0165 * sz * lobe * (y > 0.2 ? 1.1 : 1));
    col.set(mul(mix(skin, ROSY, x > 0 && r2 < 0.75 ? 0.22 : 0.1), x > 0 && r2 < 0.75 ? 0.78 : 1), i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  g.rotateX(-0.14); g.rotateY(-out); // the top leans back; the back edge stands off the head
  if (sx < 0) g.scale(-1, 1, 1);
  g.translate(sx * s.W * 0.955, HC - 0.012, -0.014);
  return g;
}

function hairShell(s, L, st, hairC, grey, temples, hairline, helm, NU, thAt) {
  const NV = 6, long = !!st.long, seed = (L.hair % 97) * 0.13;
  const from = st.from != null ? Math.acos(st.from) : 0, frontBare = st.front || 0;
  const ph1 = [], ph0 = [], blunt = [];
  for (let i = 0; i <= NU; i++) {
    const th = thAt(i), deg = Math.abs(th) / DEG, jag = (st.tips || 0) * (i % 2 ? 0.05 : -0.02) * smoothstep(60, 10, deg);
    let p1 = Math.acos(clamp(hairline(deg) - jag, -0.97, 0.97));
    if (frontBare) p1 = lerp(from, p1, smoothstep(frontBare - 12, frontBare + 8, deg));
    ph0.push(from); ph1.push(Math.max(p1, from + 0.001));
    blunt.push(long && deg > 66 ? 1 : (L.fringe ?? st.fringe ?? 0) * smoothstep(45, 15, deg));
  }
  const at_ = (i, jj) => {
    const th = thAt(i), last = jj > NV, ph = last ? ph1[i] : lerp(ph0[i], ph1[i], jj / NV), d = dirOf(th, ph), p = skull(s, ...d), n = outAt(s, d), deg = Math.abs(th) / DEG, uy = d[1];
    const v = st.vol;
    let T = lerp(lerp(v[1], v[2], smoothstep(90, 160, deg)), v[0], smoothstep(0.25, 0.85, uy));
    T *= 1 + (st.tufts || 0) * noise2(th * 4 + seed, ph * 6 + seed);
    if (st.quiff) T += 0.016 * G(deg, 0, 40) * G(uy, 0.72, 0.18);
    T *= 1 + (st.locks ?? 0.45) * (i % 2 ? 0.3 : -0.22) * smoothstep(0.97, 0.7, uy);          // locks: the hair lies in ridges from the crown
    if (st.part === 'center' || L.part) T *= 1 - 0.45 * G(deg, L.part === 'side' ? 28 : 0, 9) * smoothstep(0.4, 0.8, uy);
    T *= lerp(smoothstep(0, 0.32, ph1[i] - ph), 1, blunt[i]);
    if (st.from != null) T *= smoothstep(ph0[i], ph0[i] + 0.3, ph);
    if (st.front) T *= smoothstep(st.front - 8, st.front + 24, deg);                          // a band of hair that thins out toward the temples
    if (helm) T = Math.min(T, 0.0045);
    if (last) T = 0.0012;
    return [p[0] + n[0] * T, p[1] + n[1] * T, p[2] + n[2] * T];
  };
  const geo = grid(NU, NV + 1, at_, (i, jj) => {
    const th = thAt(i), ph = jj > NV ? ph1[i] : lerp(ph0[i], ph1[i], jj / NV), uy = Math.cos(ph), deg = Math.abs(th) / DEG;
    const part = (st.part === 'center' || L.part) ? 1 - 0.4 * G(deg, L.part === 'side' ? 28 : 0, 6) * smoothstep(0.45, 0.8, uy) : 1;
    return hairCol(hairC, grey, temples, i, jj, deg, uy, (jj > NV ? 0.55 : 1) * (1 + 0.1 * G(ph, 0.6, 0.35)) * part);
  }, { wrap: true, poles: true });
  return { geo, at: at_, NV, ph1 };
}
/** Hair that hangs: from the hairline at the sides and back, straight down from the widest of the skull, over the
 *  shoulders and down the back, its ends in uneven locks. */
function curtain(s, L, st, shell, hairC, grey, temples, b, hs, thAt, NU) {
  const cols = [], K = 7, flare = st.flare || 0.012, back = 0.14 * b + (L.cloak ? 0.025 : 0) + (L.fur ? 0.03 : 0) + 0.012; // over the collar of a cloak, under its wide back
  for (let i = 0; i <= NU; i++) if (Math.abs(thAt(i)) / DEG >= 66) cols.push(i);
  // put the columns in order round the back: from the left side (66 degrees) through the seam to the right side
  const left = cols.filter((i) => thAt(i) > 0), right = cols.filter((i) => thAt(i) < 0 && i > 0);
  const order = [...left, ...right.map((i) => i)];
  const vol = st.vol, hx = s.W + vol[1] + 0.004, hz = s.D * 1.05 + vol[2];
  const env = (th, y) => {
    let r = 1 / Math.hypot(Math.sin(th) / hx, Math.cos(th) / hz);
    const below = smoothstep(0.0, -0.11, y);
    if (below > 0) r = Math.max(r, lerp(r, 1 / Math.hypot(Math.sin(th) / ((0.2 * b + 0.07) / hs), Math.cos(th) / (back / hs)) + 0.008, below));
    return r;
  };
  return grid(order.length - 1, K, (c, k) => {
    const i = order[c], th = thAt(i), top = shell.at(i, shell.NV), t = k / K, deg = Math.abs(th) / DEG;
    if (k === 0) return top;
    const end = lerp(st.long[0], st.long[1], smoothstep(80, 150, deg)) * (L.child ? 0.8 : 1) - (st.jag || 0) * (c % 2 ? 0.024 : 0) - 0.012 * hash(i, 5) * (st.jag || 0);
    const y = lerp(top[1], end, Math.pow(t, 0.85)), r0 = Math.hypot(top[0], top[2]);
    const r = Math.max(lerp(r0, env(th, y), smoothstep(0, 0.3, t)), env(th, y) * smoothstep(0, 0.3, t)) + flare * t * t;
    return [Math.sin(th) * r, y, Math.cos(th) * r];
  }, (c, k) => {
    const i = order[c], th = thAt(i), deg = Math.abs(th) / DEG;
    return hairCol(hairC, grey, temples, i, shell.NV + k, deg, 0.1 - k * 0.1, (1 + 0.1 * (k / K)) * (k === 0 ? 0.9 : 1));
  });
}
/** A braid: a rope of crossing locks, thinner toward its tie, with a tuft beyond it. */
function braidOf(s, pts, r0, hairC, grey, n = 16) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), len = curve.getLength(), lobes = Math.max(4, Math.round(len / (r0 * 1.7)));
  const g = tube(pts, (t) => r0 * lerp(1, 0.6, t) * (0.8 + 0.2 * Math.abs(Math.sin(t * lobes * Math.PI))) * (t > 0.94 ? lerp(1, 0.5, (t - 0.94) / 0.06) : 1), 5, n + 6,
    (t, a) => { const lobe = Math.sin(t * lobes * Math.PI + (Math.sin(t * lobes * Math.PI * 2) > 0 ? a : -a) * 0.5); return hairCol(hairC, grey, 0, Math.round(t * 40), Math.round(a), 0, 0, 0.8 + 0.28 * (0.5 + 0.5 * lobe)); },
    (t) => r0 * 0.28 * Math.sin(t * lobes * Math.PI) * (1 - t));
  const end = curve.getPointAt(1), dir = curve.getTangentAt(1);
  const q =new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), tf = new THREE.Matrix4().makeRotationFromQuaternion(q);
  const tie2 = new THREE.CylinderGeometry(r0 * 0.72, r0 * 0.72, r0 * 0.9, 7, 1, true).applyMatrix4(tf).translate(end.x, end.y, end.z);
  const tuft = new THREE.ConeGeometry(r0 * 0.75, r0 * 3.2, 7, 1, true).rotateX(Math.PI).applyMatrix4(tf).translate(end.x + dir.x * r0 * 1.8, end.y + dir.y * r0 * 1.8, end.z + dir.z * r0 * 1.8);
  return [made(g, 'hair', 0), made(paint(tie2, lin(0x3b2a1a)), 'leather', 0), made(paint(tuft, mul(hairC, 0.95)), 'hair', 0)];
}
function tail(s, L, hairC, grey, len) {
  const top = [0, HC - 0.02, -s.D * 1.02], pts = [top, [0, HC - 0.07, -s.D * 1.12], [0, HC - 0.16, -s.D * 1.06], [0, HC - 0.06 - len, -s.D * 0.95 - 0.02]];
  const g = tube(pts, (t) => 0.019 * (t < 0.12 ? lerp(0.75, 1, t / 0.12) : lerp(1, 0.25, Math.pow((t - 0.12) / 0.88, 1.3))), 7, 12, (t, a) => hairCol(hairC, grey, 0, Math.round(a * 3), Math.round(t * 9), 0, 0, 0.9 + 0.12 * t));
  const tie = paint(at(new THREE.TorusGeometry(0.014, 0.0045, 4, 9), 0, HC - 0.035, -s.D * 1.06, 0.5, 0, 0), lin(0x3b2a1a));
  return [made(g, 'hair', 0), made(tie, 'leather', 0)];
}
function bunGeo(s, y, hairC, grey) {
  const uy = y, d = dirOf(Math.PI, Math.acos(uy)), p = skull(s, ...d), n = outAt(s, d), g = new THREE.SphereGeometry(1, 11, 8), P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), yy = P.getY(i), z = P.getZ(i), a = Math.atan2(x, yy);
    col.set(hairCol(hairC, grey, 0, Math.round(a * 4), 0, 0, 0, 0.82 + 0.25 * (0.5 + 0.5 * Math.sin(a * 3 + z * 6))), i * 3);
    P.setXYZ(i, x * 0.042, yy * 0.037, z * 0.03);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return g.translate(p[0] + n[0] * 0.026, p[1] + n[1] * 0.026, p[2] + n[2] * 0.026);
}

// ---- beards ----------------------------------------------------------------------------------------------------
// top: where the beard starts on the cheek, as height on the skull, at the angles of LINE_AT (only the front half
// matters). T: how thick on the cheeks; chin: how much more on the chin; len: where a long beard ends
// (head height); mo: the moustache it has.
const BTOP = [-0.24, -0.29, -0.2, -0.11, -0.02, 0.1, 0.1, 0.1];
const BEARD = {
  short: { top: BTOP, T: 0.0075, chin: 0.006, mo: 'thin' },
  full: { top: [-0.24, -0.22, -0.13, -0.05, 0.04, 0.12, 0.12, 0.12], T: 0.016, chin: 0.014, bush: 0.35, mo: 'full' },
  long: { top: BTOP, T: 0.011, chin: 0.01, len: -0.11, mo: 'full' },
  belt: { top: BTOP, T: 0.012, chin: 0.01, len: -0.4, mo: 'droop' },
  forked: { top: BTOP, T: 0.011, chin: 0.01, len: -0.17, fork: true, mo: 'droop' },
  braided: { top: BTOP, T: 0.009, chin: 0.008, braid: true, mo: 'droop' },
  goatee: { top: [-0.3, -0.32, -0.6, -0.9, -1, -1, -1, -1], T: 0.0075, chin: 0.008, side: 36, mo: 'thin' },
};
function beardShell(s, L, BD, beardC, grey, temples, Ym, hw, jawW, jaw) {
  const NB = 16, MB = 8, side = (BD.side || 92) * DEG;
  const thAt = (i) => { const t = (i / NB) * 2 - 1; return side * t * (0.55 + 0.45 * t * t); };
  const top = (th) => Math.acos(clamp(lineAt(BD.top, Math.abs(th) / DEG), -0.97, 0.97)), bot = 168 * DEG;
  const hole = (x, y) => { const e = (x / (hw * 1.12)) ** 2 + ((y - Ym + 0.0008) / 0.007) ** 2; return smoothstep(1.2, 0.7, e); };
  const g = grid(NB, MB, (i, jj) => {
    const th = thAt(i), p0 = top(th), ph = lerp(p0, bot, Math.pow(jj / MB, 0.85)), d = dirOf(th, ph), p = skull(s, ...d), n = outAt(s, d), deg = Math.abs(th) / DEG;
    let T = BD.T + BD.chin * G(d[1], -0.78, 0.25) * G(deg, 0, 45);
    T *= 1 + (BD.bush || 0.15) * noise2(th * 5 + 2, ph * 6);
    T *= smoothstep(0, 0.22, ph - p0) * smoothstep(side / DEG, side / DEG - 14, deg);
    T = lerp(T, -0.003, hole(p[0], p[1]));
    return [p[0] + n[0] * T, p[1] + n[1] * T, p[2] + n[2] * T];
  }, (i, jj) => {
    const th = thAt(i), deg = Math.abs(th) / DEG;
    return hairCol(beardC, grey + 0.08, 0, i, jj + 3, deg, -0.2, 0.92 + 0.08 * (jj / MB)) .map((v, q) => lerp(v, GREY[q], temples * 0.5 * smoothstep(40, 85, deg)));
  });
  return blend(g, jaw, jawW);
}
function longBeard(s, L, BD, beardC, grey, temples, Ym, b, hs, j) {
  // a wedge hanging from the chin down the chest: its top hidden in the beard on the jaw
  const yChin = HC - s.H * 0.97, zChin = surfZ(s, 0, yChin + 0.012), end = BD.len * (L.child ? 0.7 : 1);
  const chestZ = (y) => { const c = y * hs + 0.42, r = c > 0.31 ? 0.07 : lerp(0.165, 0.2 * b, (c + 0.19) / 0.5) * 0.68 + (L.apron ? 0.03 : 0.016) + (L.fur ? 0.01 : 0); return r / hs; };
  const parts = BD.fork ? [-1, 1] : [0];
  return parts.map((f) => {
    const NUw = 10, MV = 7, aw0 = s.W * s.jaw * (BD.fork ? 0.5 : 0.82), ad0 = 0.036;
    const geo = grid(NUw, MV, (i, k) => {
      const t = k / MV, a = (i / NUw) * Math.PI * 2, y = lerp(yChin + 0.035, end, Math.pow(t, 0.9));
      const aw = k === MV ? 0.007 : lerp(aw0, aw0 * 0.32, Math.pow(t, 1.4)), ad = k === MV ? 0.005 : lerp(ad0, 0.017, t), cx = f * lerp(aw0 * 0.55, aw0 * 1.1, t);
      const cz = Math.max(lerp(zChin - 0.012, zChin, t), chestZ(y) + ad * 0.75), ca = Math.cos(a);
      return [cx + Math.sin(a) * aw * (1 + 0.1 * noise2(a * 3, t * 5)), y + (k === MV ? -0.015 * hash(i, 9) : 0), cz + ca * ad * (ca > 0 ? 1.15 : 0.75)];
    }, (i, k) => hairCol(beardC, grey + 0.1, temples, i, k + 20, 30, -0.4, 0.9 + 0.1 * (k / MV)), { wrap: true });
    geo.userData.onJaw = true;
    return made(blend(geo, j.nape, (p) => smoothstep(yChin + 0.02, yChin - 0.09, p[1])), 'hair', 0);
  });
}
function moustache(s, kind, beardC, grey, temples, Ym, hw) {
  const droop = kind === 'droop' ? 1 : 0.4, r = kind === 'thin' ? 0.0034 : kind === 'full' ? 0.0056 : 0.005;
  const P = (x, y) => [x, y, surfZ(s, x, y) + r * 0.9];
  const pts = [P(-(hw + 0.004), Ym - 0.012 * droop - 0.003), P(-hw * 0.92, Ym + 0.0015), P(-hw * 0.45, Ym + 0.0055), P(0, Ym + 0.0068), P(hw * 0.45, Ym + 0.0055), P(hw * 0.92, Ym + 0.0015), P(hw + 0.004, Ym - 0.012 * droop - 0.003)];
  return tube(pts, (t) => r * (0.35 + 0.65 * Math.sin(Math.PI * t) ** 0.6), 5, 10, (t, a) => hairCol(beardC, grey + 0.08, temples, Math.round(a * 2), Math.round(t * 12), 20, -0.3, 0.88 + 0.15 * Math.cos(a)));
}

// ---- the face: eyes, lids, brows, lips (drawn only near the camera) ----------------------------------------------
function buildFace(h, L, s, face, grp, o) {
  const j = h.j, f = (h.face = grp(j.head, 0, 0, 0)), { skin, hairC, grey, Ym, hw, age } = o;
  const re = 0.0128 * (L.eyeSize || 1) * (L.child ? 1.12 : 1), exr = s.ex * s.W, ey = HC + s.ey * s.H;
  const E = EYES[L.eyeShape] || EYES.almond;
  const zc = surfZ(s, exr, ey) + 0.1 * s.D * 0.98 - re * 1.04 - (E.deep || 0);
  h.eyeSq = E.sq || 0; // how low the lids sit, read by updateFace
  const tilt = (g, cx, cy, sx) => { if (E.tilt) { g.translate(-cx, -cy, 0); g.rotateZ(sx * E.tilt); g.translate(cx, cy, 0); } return g; }; // lift (or drop) the outer corner
  const still = [], ink = lin(L.eyes);
  // the whites of the eyes, and the lower lids
  for (const sx of [1, -1]) {
    const w = new THREE.SphereGeometry(re, 12, 8), P = w.attributes.position, col = new Float32Array(P.count * 3), white = lin(L.blind ? 0xd8d6d0 : 0xe9e3d6);
    for (let i = 0; i < P.count; i++) { const z = P.getZ(i) / re, x = (P.getX(i) / re) * sx; col.set(mix(mul(white, 0.78 + 0.22 * z), lin(0xd09a90), 0.25 * smoothstep(0.2, 0.9, -x) * (1 - z)), i * 3); }
    w.setAttribute('color', new THREE.BufferAttribute(col, 3)); still.push(w.translate(sx * exr, ey, zc));
    const low = grid(10, 2, (i, k) => { const a = Math.PI / 2 - 1.3 + (2.6 * i) / 10, t = 1.9 + (E.low || 0) + 0.36 * k, r = re * 1.1; return [sx * exr - r * Math.cos(a) * Math.sin(t), ey + r * Math.cos(t), zc + r * Math.sin(a) * Math.sin(t)]; },
      (i, k) => (k === 0 ? mul(skin, 0.62) : mul(skin, 0.92)));
    still.push(tilt(low, sx * exr, ey, sx));
    if (E.hood) still.push(grid(10, 2, (i, k) => { // a fold of skin from the brow bone over the upper lid, lowest at the outer corner
      const a = Math.PI / 2 - 1.25 + (2.5 * i) / 10, outer = sx > 0 ? i / 10 : 1 - i / 10, t = [0.55, 0.95, 1.18 + 0.12 * outer][k], r = re * (1.24 - 0.04 * k);
      return [sx * exr - r * Math.cos(a) * Math.sin(t), ey + r * Math.cos(t), zc + r * Math.sin(a) * Math.sin(t)];
    }, (i, k) => mul(skin, k === 2 ? 0.74 : 0.92)));
  }
  // scars, lines of age, freckles: thin strokes on the skin
  const scar = (pts, col) => still.push(stroke(s, pts.map(([x, y]) => [x, y - 0.1665 + ey]), 0.0036, col)); // drawn about the eyes where they were first placed
  if (L.scar === 'lightning') { // a fork of lightning through the left eye: forehead to brow, then the cheek, with a small branch
    const c = mix(skin, lin(0xf4d8d0), 0.6);
    scar([[0.064, 0.226], [0.046, 0.211], [0.056, 0.199], [0.042, 0.186]], c);
    scar([[0.05, 0.147], [0.036, 0.133], [0.049, 0.121], [0.037, 0.104]], c);
    scar([[0.036, 0.133], [0.024, 0.126]], c);
  }
  for (const sc of [L.scar, L.scar2]) { // ordinary scars, on the right side so they never hide the lightning
    if (sc === 'cheek') scar([[-0.074, 0.142], [-0.052, 0.13], [-0.03, 0.118]], lin(0xe9c8be));
    if (sc === 'brow') scar([[-0.052, 0.208], [-0.044, 0.194], [-0.036, 0.18]], lin(0xe9c8be));
    if (sc === 'lip') scar([[-0.012, Ym + 0.017 + 0.1665 - ey], [-0.016, Ym + 0.003 + 0.1665 - ey], [-0.02, Ym - 0.013 + 0.1665 - ey]], lin(0xe9c8be));
  }
  if (age > 0.25) { // lines of age: the brow, the eyes' corners, from the nose to the mouth
    const lc = mul(skin, 0.72), k = smoothstep(0.25, 0.9, age), wl = 0.0014 + 0.0008 * k;
    for (const dy of [0.045, 0.056, 0.067].slice(0, age > 0.55 ? 3 : 2)) still.push(stroke(s, [[-0.032, ey + dy - 0.002], [-0.012, ey + dy], [0.012, ey + dy], [0.032, ey + dy - 0.002]], wl, lc));
    for (const sx of [1, -1]) {
      for (const dy of [-0.004, 0.003, 0.009]) still.push(stroke(s, [[sx * (exr + re * 1.3), ey + dy * 0.6], [sx * (exr + re * 1.3 + 0.008), ey + dy]], wl * 0.8, lc));
      still.push(stroke(s, [[sx * 0.012, Ym + 0.024], [sx * (hw + 0.004), Ym + 0.008], [sx * (hw + 0.006), Ym - 0.006]], wl * 1.2, lc));
    }
  }
  if (L.freckles) { const fc = mix(skin, lin(0x8a4a2a), 0.42), n = Math.round(34 * L.freckles); for (let i = 0; i < n; i++) { const sx = i % 2 ? 1 : -1, x = sx * (0.006 + 0.05 * hash(i, 1)), y = ey - 0.006 - 0.032 * hash(i, 2); still.push(stroke(s, [[x, y], [x + 0.0013, y + 0.0004]], 0.0014, fc)); } }
  if (L.earring) { const e = at(new THREE.TorusGeometry(0.0062, 0.0012, 4, 10), s.W * 0.985, HC - 0.04, -0.012, 0, Math.PI / 2, 0); still.push(paint(e, lin(0xd8a840))); }
  face(f, still);

  // irises: one joint for each eye, at its middle, so it turns to look
  h.fEye = [];
  for (const sx of [1, -1]) {
    const e = grp(f, sx * exr, ey, zc); h.fEye.push(e);
    const cap = (r, ang, rows, C) => { const g = new THREE.SphereGeometry(r, 14, rows, 0, Math.PI * 2, 0, ang); g.rotateX(Math.PI / 2); const P = g.attributes.position, col = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) col.set(C(Math.acos(clamp(P.getZ(i) / r, -1, 1)) / ang), i * 3); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };
    const iris = cap(re * 1.03, 0.62, 4, (t) => mul(ink, t > 0.85 ? 0.45 : 1.18 - 0.35 * t));
    const pupil = cap(re * 1.06, L.blind ? 0.2 : 0.27, 2, () => lin(L.blind ? 0x9a9c9e : 0x0a0806));
    const glint = paint(at(new THREE.SphereGeometry(0.0013, 4, 3), 0.0034, 0.0038, re * 1.07), lin(0xffffff));
    face(e, [iris, pupil, glint]);
  }
  // lids: one joint across both eyes turns both upper lids about the line through their middles
  h.fLid = grp(f, 0, ey, zc); h._lid = 0.1;
  const lash = lin(L.child ? 0x2a1e18 : 0x1a1410), lashLen = L.female ? 1.3 : L.child ? 1.2 : 1.12, lids = [];
  for (const sx of [1, -1]) {
    const r = re * 1.14, cx = sx * exr;
    lids.push(tilt(grid(12, 5, (i, k) => { const a = Math.PI / 2 - 1.3 + (2.6 * i) / 12, t = (1.78 * k) / 5; return [cx - r * Math.cos(a) * Math.sin(t), r * Math.cos(t), r * Math.sin(a) * Math.sin(t)]; },
      (i, k) => (k === 5 ? lash : k === 4 ? mul(skin, 0.8) : mul(skin, 0.92 - 0.04 * age))), cx, 0, sx));
    lids.push(tilt(grid(12, 1, (i, k) => { // the lashes, longest at the outer corner
      const a = Math.PI / 2 - 1.3 + (2.6 * i) / 12, outer = sx > 0 ? i / 12 : 1 - i / 12, rr = k ? r * (lashLen + 0.1 * outer * (lashLen - 1) * 4) : r, t = k ? 1.62 : 1.78;
      return [cx - rr * Math.cos(a) * Math.sin(t), rr * Math.cos(t), rr * Math.sin(a) * Math.sin(t)];
    }, () => lash), cx, 0, sx));
  }
  face(h.fLid, lids);
  // brows, each on its own joint so it can tilt and rise
  h.fBrow = {}; h.browY = ey + 0.024 * (L.child ? 0.95 : 1);
  const thick = (L.brows ?? (L.female ? 0.72 : L.child ? 0.78 : 1)) * (age > 0.6 ? 1.15 : 1), arch = L.browArch ?? (L.female ? 0.0042 : 0.0024);
  const bc = mix(mul(hairC, 0.62), GREY, clamp(grey * 0.8 - 0.1, 0, 0.8));
  for (const [k, sx] of [['L', 1], ['R', -1]]) {
    const bx = sx * (exr + 0.002), bz = surfZ(s, bx, h.browY), g = (h.fBrow[k] = grp(f, bx, h.browY, bz));
    face(g, [grid(7, 2, (i, r) => {
      const xl = -0.019 + (0.043 * i) / 7, t = (xl + 0.019) / 0.043, th = thick * lerp(0.0064, 0.0024, t);
      const y = arch * (1 - ((xl - 0.004) / 0.022) ** 2) - 0.0045 * smoothstep(0.012, 0.024, xl) + (r - 1) * th * 0.5, x = sx * xl;
      return [x, y, surfZ(s, bx + x, h.browY + y) - bz + 0.0012 + (r === 1 ? 0.0011 * thick : 0)];
    }, (i, r) => mul(bc, r === 1 ? 1.08 : 0.88))]);
  }
  // the mouth: lips in two halves (each bends toward its own corner), the dark inside, the upper teeth
  const lipC = mix(skin, lin(L.female ? 0xb04a4a : 0x9a5048), L.female ? 0.66 : L.child ? 0.55 : 0.5);
  const ms = L.mouthShape, full = L.lips === 'thin' ? 0.62 : L.lips === 'full' ? 1.3 : 1;
  const upH = 0.0042 * full * (L.female ? 1.12 : 1) * (ms === 'pout' ? 0.85 : 1), loH = 0.0058 * full * (L.female ? 1.12 : 1) * (ms === 'pout' ? 1.55 : 1);
  // the mouth at rest: its corners turned up or down (one of them, crooked), and a cupid's bow in the top of the upper lip
  const cn = L.corners || 0, rest = (x) => { const side = ms === 'crooked' ? (x > 0 ? 2.4 : 0) : 1; return 0.0034 * (cn + (ms === 'crooked' ? 0.35 : 0)) * side * (x / hw) ** 2; };
  const bow = (xl) => (ms === 'bow' ? 0.0013 * (G(xl, 0.0058, 0.0032) - 0.85 * G(xl, 0, 0.0022)) : 0);
  const lip = (sx, upper) => {
    const g = grid(4, 2, (i, r) => {
      const xl = (hw * i) / 4, prof = 0.35 + 0.65 * (1 - (xl / hw) ** 2), x = sx * xl;
      const y = (upper ? [Ym + 0.0003, Ym + upH * prof * 0.5, Ym + upH * prof + bow(xl)][r] : [Ym - 0.0002, Ym - loH * prof * 0.5, Ym - loH * prof][r]) + rest(x);
      const dz = [0.0032 * prof + 0.001, (upper ? 0.0042 : 0.005 * (ms === 'pout' ? 1.7 : 1)) * prof + 0.001, 0.0008][r];
      return [x, y, surfZ(s, x, y) + dz];
    }, (i, r) => mul(lipC, r === 1 ? 1.1 : r === 0 ? 0.6 : 0.95));
    return blend(g, sx > 0 ? h.fCornL : h.fCornR, (p) => smoothstep(0.45 * hw, hw, Math.abs(p[0])));
  };
  face(f, [lip(1, true), lip(-1, true)]);
  face(j.jaw, [lip(1, false), lip(-1, false)]);
  const inside = grid(6, 2, (i, r) => { const x = -0.85 * hw + (1.7 * hw * i) / 6, y = Ym + 0.0006 - 0.0006 * r + rest(x); return [x, y, surfZ(s, x, y) + 0.0016]; }, () => lin(0x1c0c0a));
  const teeth = grid(4, 1, (i, r) => { const x = -0.7 * hw + (1.4 * hw * i) / 4, y = Ym + 0.0004 - 0.0042 * r; return [x, y, surfZ(s, x, y) + 0.0022]; }, (i, r) => lin(r ? 0xc8c0ae : 0xdcd5c4));
  face(f, [blend(inside, j.jaw, (p) => smoothstep(Ym + 0.0006, Ym - 0.0006, p[1])), teeth]);
}
