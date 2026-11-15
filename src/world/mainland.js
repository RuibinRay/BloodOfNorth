// The mainland coast (MAIN in layout.js): Bjornstead, the village of twenty roofs that Act II opens in, and Kaupang, the
// great market four days' sail down the coast. Everything here is a procedural stand-in for real art. The parts of a
// place that the story changes (houses that burn, walls that get built, a ship that comes home) are stages: each has
// its own meshes and its own colliders, and is switched on and off by the story (world.main.<place>.stages).
import * as THREE from 'three';
import { M, Builder, at, box, cyl, cone, sphere, tint, merge, patch } from './geo.js';
import { standOfPines } from './vegetation.js';
import { heightAt } from './terrain.js';
import * as P from './props.js';
import { MAIN, place } from './layout.js';
import { house, palisade, deck, ruin, stakes, pole, gate } from './realm_props.js';
import { rng } from '../core/util.js';

/** A switchable part of a place. build(ctx, w, objs) adds geometry to ctx.b, colliders through ctx and w, and whole
 *  objects (a ship) to objs; whatever it returns is kept on the stage. */
export function stage(world, scene, on, build) {
  const b = new Builder(), boxes = [], circles = [], decks = [], objs = [];
  const ctx = { b, smoke: [], addBox: (...a) => { const o = world.addBox(...a); boxes.push(o); return o; }, addCircle: (...a) => { const o = world.addCircle(...a); circles.push(o); return o; } };
  const w = { addBox: ctx.addBox, addCircle: ctx.addCircle, addDeck: (d) => { decks.push(d); return world.addDeck(d); } };
  const extra = build(ctx, w, objs) || {};
  const group = b.build({ still: 256 }); for (const o of objs) group.add(o); scene.add(group);
  const s = { group, on: true, ...extra, set(v) {
    v = !!v; if (v === s.on) return s;
    s.on = v; group.visible = v;
    for (const o of boxes) { const i = world.boxes.indexOf(o); if (v && i < 0) world.boxes.push(o); if (!v && i >= 0) world.boxes.splice(i, 1); }
    for (const c of circles) { if (v) world.putCircle(c); else world.removeCircle(c); }
    for (const d of decks) { if (!v) world.removeDeck(d); else if (!world.decks.includes(d)) world.addDeck(d); }
    return s;
  } };
  if (!on) s.set(false);
  return s;
}
const gy = (x, z) => heightAt(x, z);
/** A market stall: four posts, a board, a coloured awning. */
export function stall(ctx, x, z, ry, cloth, seed = 1) {
  const y = gy(x, z), r = rng(seed);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [px, pz] = P.toWorld(x, z, ry, sx * 1.3, sz * 0.8); ctx.b.add(at(cyl(0.05, 0.06, sz > 0 ? 2.3 : 1.9, 5), px, y + (sz > 0 ? 1.15 : 0.95), pz), M.timber); }
  ctx.b.add(at(box(2.7, 0.08, 1.0), x, y + 0.85, z, 0, ry, 0), M.plank);
  ctx.b.add(tint(at(box(3.0, 0.05, 2.0), x, y + 2.12, z, 0.22, ry, 0), cloth, 0.12, seed), M.vcPlain);
  for (let i = 0; i < 6; i++) { const [px, pz] = P.toWorld(x, z, ry, -1.05 + i * 0.42, (r() - 0.5) * 0.4); ctx.b.add(tint(at(i % 2 ? sphere(0.11, 6, 5) : box(0.2, 0.16, 0.2), px, y + 0.99, pz, 0, r() * 3, 0), [0x7fb4c9, 0x9a3a2a, 0xd9c98a, 0x5a6a7a, 0xc9a24a, 0x6a8a4a][i], 0.1, i + seed), M.vcPlain); }
  ctx.addBox(x, z, 1.4, 0.55, ry, 1);
}
/** A long trestle table with a bench either side. */
export function table(ctx, x, z, ry, len = 6) {
  const y = gy(x, z);
  ctx.b.add(at(box(len, 0.09, 0.95), x, y + 0.8, z, 0, ry, 0), M.plank);
  for (const k of [-1, 1]) { const [px, pz] = P.toWorld(x, z, ry, k * (len / 2 - 0.6), 0); ctx.b.add(at(box(0.1, 0.8, 0.8), px, y + 0.4, pz, 0, ry, 0), M.timber); }
  for (const k of [-1, 1]) { const [px, pz] = P.toWorld(x, z, ry, 0, k * 0.95); ctx.b.add(at(box(len - 0.4, 0.07, 0.34), px, y + 0.45, pz, 0, ry, 0), M.plank); for (const e of [-1, 1]) { const [qx, qz] = P.toWorld(px, pz, ry, e * (len / 2 - 0.8), 0); ctx.b.add(at(box(0.09, 0.45, 0.3), qx, y + 0.22, qz, 0, ry, 0), M.timber); } }
  for (let i = 0; i < 7; i++) { const [px, pz] = P.toWorld(x, z, ry, -len / 2 + 0.6 + i * ((len - 1.2) / 6), (i % 2 ? 0.18 : -0.16)); ctx.b.add(tint(at(i % 3 ? cyl(0.09, 0.07, 0.14, 7) : sphere(0.16, 7, 5), px, y + 0.92, pz, 0, 0, 0, 1, i % 3 ? 1 : 0.5, 1), i % 3 ? 0x7a5a3a : 0xb08a5a, 0.15, i), M.vcPlain); }
  ctx.addBox(x, z, len / 2, 0.5, ry, 0.9);
}
/** Far mountains: the land goes on beyond what can be walked. */
export function range(b, pts, seed) {
  const r = rng(seed);
  for (const [x, z, h, w] of pts) b.add(tint(at(cone(w, h, 7), x, h / 2 - 14, z, 0, r() * 3, 0, 1, 1, 0.8 + r() * 0.5), [0x5c6a58, 0x66705e, 0x545f56][(r() * 3) | 0], 0.2, (x + z) | 0), M.vcPlain);
}

/** Where Act I's last chapters happen in Bjornstead (offsets from the village's centre, as B() takes them). Used by
 *  the village (the props) and by story/act1_ch3.js (the people, the markers, what can be used). */
export function ACT1_SPOTS(B, barnDoor) {
  const nest = B(-80, 196);
  return {
    nest, logs: [[nest[0] - 8, nest[1] - 5.4], [nest[0], nest[1] - 7.9], [nest[0] - 6.5, nest[1] + 3.1]],
    fire: B(-2.5, 126.4), seat: B(0.6, 128.6), basket: B(-1.4, 129.2), signe: B(-4.8, 127.8), bjorn: B(-19, 127.5), freydis: B(6, 141),
    chop: B(-23, 130), pen: B(100, 34), lambPost: B(-8, 142), wake: B(4, 135), barrow: B(96, -24), axeStone: B(62, 48), tarn: B(-140, -50),
    hrefna: B(-70, 139.5), skyIron: barnDoor ? [barnDoor.x - 1.4, barnDoor.z + 1.6] : B(34, 124), birch: B(-20, 10), hunters: B(178, 30), lamb: B(-142, 124),
    nestPath: [B(6, 146), B(-6, 160), B(-28, 200), B(-58, 204), [nest[0] + 1.5, nest[1] + 1.2]],
  };
}

function bjornstead(ctx, world, scene) {
  const s = MAIN.find((m) => m.id === 'bjornstead'), W = (n, dx = 0, dz = 0) => { const p = place('bjornstead', n, dx, dz); return [p.x, p.z]; }, B = (dx, dz) => [s.x + dx, s.z + dz];
  const houses = {}, stages = {}, st = (name, on, f) => (stages[name] = stage(world, scene, on, f));
  // Bjorn's hall at the head of the yard, the barn across it, the well between
  houses.hall = P.longhouse(ctx, { id: 'bjornhall', x: W('hall')[0], z: W('hall')[1], ry: 0, len: 17, wid: 6.8, ridge: 4.9, roof: 'turf', door: 1, doorX: 2 });
  houses.barn = P.longhouse({ ...ctx, smoke: [] }, { id: 'bjbarn', x: W('barn')[0], z: W('barn')[1], ry: Math.PI / 2, len: 12, wid: 6.4, ridge: 4.8, roof: 'thatch', door: -1, doorX: 0 });
  P.well(ctx, ...W('well')); P.choppingBlock(ctx, ...W('chop')); P.woodpile(ctx, ...W('chop', -4.5, -3.5), 0.3, 5, 9); P.woodpile(ctx, ...W('chop', -6, 1.5), 1.4, 4, 7);
  P.fireRing(ctx, ...W('hall', 3.5, 12.4), 0.6); // the cooking fire before the door
  P.bench(ctx, ...W('hall', 6.5, 5.4), 0); P.bench(ctx, ...W('hall', -6, 5.4), 0); P.barrel(ctx, ...W('hall', 0.6, 4.6)); P.loom(ctx, ...W('hall', -3.4, 4.4), 0);
  P.hayStack(ctx, ...B(31, 103), 0.95); P.hayStack(ctx, ...B(45, 106), 0.85); P.cart(ctx, ...B(22, 127), 0.5); P.fence(ctx, [B(28, 108), B(20, 110)]);
  // the barn door that can be slammed: a leaf hung on the north post
  const bd = houses.barn.door, door = new THREE.Group(), leaf = new THREE.Mesh(box(0.12, 2.3, 2.5), M.timber);
  leaf.position.set(0, 1.15, 1.25); leaf.castShadow = true; door.add(leaf); door.position.set(bd.x + 1.25, gy(bd.x, bd.z), bd.z - 1.25); scene.add(door);
  // the pigsty: a rail pen, a low shed, and mud to the ankle
  const sty = W('sty');
  P.fence(ctx, [[sty[0] - 5.5, sty[1] - 4.5], [sty[0] + 5.5, sty[1] - 4.5], [sty[0] + 5.5, sty[1] + 4.5], [sty[0] - 5.5, sty[1] + 4.5], [sty[0] - 5.5, sty[1] + 1.2]], { collide: false }); // open at the west corner
  ctx.b.add(tint(at(box(10.4, 0.07, 8.4), sty[0], gy(...sty) + 0.045, sty[1]), 0x2a2018, 0.25, 4), M.vcPlain);
  ctx.b.add(at(box(3.4, 1.0, 2.4), sty[0] + 3.4, gy(...sty) + 0.5, sty[1] - 3), M.plank); ctx.b.add(at(box(3.9, 0.2, 2.9, 2), sty[0] + 3.4, gy(...sty) + 1.15, sty[1] - 3, 0.16, 0, 0), M.thatch); ctx.addBox(sty[0] + 3.4, sty[1] - 3, 1.7, 1.2, 0, 1.2);
  ctx.b.add(at(box(1.6, 0.3, 0.5), sty[0] - 2.5, gy(...sty) + 0.18, sty[1] + 3.4), M.timber); // the trough
  // the smithy and the smokehouse, and the narrow lane between them (a dead end: barrels stop the far side)
  const sm = P.smithy(ctx, ...W('smithy'), Math.PI / 2);
  houses.smoke = house(ctx, ...W('smoke'), Math.PI / 2, 7, { wid: 4, ridge: 3.4, door: 1, smoke: true });
  const ln = W('lane'); P.barrel(ctx, ln[0] - 0.55, ln[1] + 4.3); P.barrel(ctx, ln[0] + 0.45, ln[1] + 4.5); P.crate(ctx, ln[0], ln[1] + 5.3, 0.4, 0.9); ctx.addBox(ln[0], ln[1] + 4.6, 1.3, 0.5, 0, 1.4);
  P.woodpile(ctx, ...W('smithy', -4.6, 0), Math.PI / 2, 4, 8);
  // the other roofs: eighteen more with these two (two of them burn)
  const HOMES = [[-16, 172, 1.5708, 10, 1], [16, 170, 1.5708, 10, -1], [18, 190, 1.5708, 9, -1], [-20, 192, 1.5708, 8, 1], [-36, 176, 0.15, 10, -1], [-72, 132, 0.2, 10, 1], [-90, 126, 1.4, 9, 1], [-44, 98, 0.3, 10, 1],
    [-58, 80, 1.5, 9, 1], [24, 92, 0.1, 10, 1], [46, 84, 1.5, 9, 1], [62, 120, 1.5708, 9, -1], [74, 152, 0.2, 10, -1], [66, 174, -0.2, 10, -1], [84, 114, 1.5, 9, 1], [40, 186, 0.1, 9, -1]];
  HOMES.forEach(([dx, dz, ry, len, dr], i) => { houses['h' + i] = house(ctx, ...B(dx, dz), ry, len, { roof: i % 3 ? 'turf' : 'thatch', door: dr, smoke: i % 2 === 0 }); });
  const LOST = [[-62, 178, -0.1, 10], [-80, 162, 1.5, 9]];
  st('homes', true, (c) => { LOST.forEach(([dx, dz, ry, len], i) => { houses['lost' + i] = house(c, ...B(dx, dz), ry, len, { roof: 'thatch', door: i ? 1 : -1 }); }); });
  const fld = s.fields[0];
  st('ashes', false, (c) => { // what the raid leaves: two houses, a third of the barley, four graves under the birch hill
    for (const [dx, dz, ry, len] of LOST) ruin(c, ...B(dx, dz), ry, len, 5);
    c.b.add(tint(at(box(30, 0.07, 26), s.x + fld[0] - 6, gy(s.x + fld[0], s.z + fld[1]) + 0.07, s.z + fld[1] + 4, 0, fld[4], 0), 0x15120f, 0.3, 3), M.vcPlain);
    for (let i = 0; i < 4; i++) { const [x, z] = B(-48 + i * 4.2, 40 + i * 3.6), y = gy(x, z); c.b.add(tint(at(sphere(1, 8, 6), x, y + 0.05, z, 0, 0.7, 0, 1.0, 0.36, 1.9), 0x4a3c2c, 0.2, i + 2), M.vcPlain); c.b.add(at(box(0.5, 0.7, 0.16), x - 1.3, y + 0.32, z + 1.5, 0, 0.7, 0), M.stone); }
  });
  P.dryingRack(ctx, ...B(-26, 203), 0.1); P.dryingRack(ctx, ...B(27, 202), -0.1); P.dryingRack(ctx, ...B(-46, 158.5), 1.57); P.barrel(ctx, ...B(-11, 201)); P.crate(ctx, ...B(9, 202), 0.3);
  // the Thing stones
  const th = W('thing');
  for (let i = 0; i < 7; i++) { const a = i * 0.898 + 0.3; P.runestone(ctx, th[0] + Math.cos(a) * 6.5, th[1] + Math.sin(a) * 6.5, -a + 1.57); }
  ctx.b.add(at(box(2.2, 0.5, 1.4, 1.2), th[0], gy(...th) + 0.2, th[1], 0, 0.4, 0), M.stone); ctx.addBox(th[0], th[1], 1.1, 0.7, 0.4, 0.5);
  // the barley field outside the west fence, the pasture by the stream
  const c4 = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([sx, sz]) => P.toWorld(s.x + fld[0], s.z + fld[1], -fld[4], (sx * fld[2]) / 2 + sx, (sz * fld[3]) / 2 + sz));
  P.fence(ctx, c4, { collide: false });
  const pa = W('pasture'); P.fence(ctx, [[pa[0] - 22, pa[1] + 16], [pa[0] - 24, pa[1] - 14], [pa[0] - 4, pa[1] - 24]], { collide: false }); P.hayStack(ctx, pa[0] - 18, pa[1] + 6, 0.8);
  // the harbour: the pier, boats on the strand and one afloat
  deck(ctx, world, ...W('pier'), 0, 21, { y: 1.3 });
  for (const [dx, dz, ry, sd, tilt] of [[-14, 216, 0.5, 3, 0.12], [13, 217, -0.6, 4, -0.1], [3.6, 240, 0.05, 8, 0]]) {
    const b = P.makeShip({ L: 6.4, B: 1.7, D: 0.62, rise: 0.75, seed: sd }), [x, z] = B(dx, dz);
    b.position.set(x, tilt ? gy(x, z) + 0.02 : -0.12, z); b.rotation.set(0.04 * (tilt ? 1 : 0), ry, tilt); scene.add(b); if (tilt) world.addCircle(x, z, 1.3, 1);
  }
  // the plank bridge where the coast road crosses the river
  deck(ctx, world, ...W('bridge'), Math.PI / 2, 10, { hw: 1.7, y: 3.3, rails: true });
  // the old latrine, inside where the wall will run (until it is moved)
  st('privy', true, (c) => { const [x, z] = W('latrine'), y = gy(x, z); for (const [dx, dz, ry] of [[0, -1.2, 0], [-1.2, 0, 1.57], [1.2, 0, 1.57]]) c.b.add(tint(at(box(2.4, 1.5, 0.08), x + dx, y + 0.75, z + dz, 0, ry, 0), 0x6a5a40, 0.25, 3), M.vcPlain); c.b.add(at(box(2, 0.1, 1.6), x, y + 0.03, z + 0.3), M.dark); c.addBox(x, z - 1.2, 1.2, 0.15, 0, 1.5); });
  st('trench', false, (c) => { const [x, z] = W('trench'), y = gy(x, z); c.b.add(at(box(6, 0.1, 1.1), x, y + 0.04, z, 0, 0.3, 0), M.dark); c.b.add(tint(at(box(6.4, 0.5, 0.9), x + 0.4, y + 0.2, z - 1.3, 0, 0.3, 0), 0x4a3a28, 0.25, 4), M.vcPlain); for (const k of [-1, 1]) c.b.add(tint(at(box(2.6, 1.5, 0.08), x + k * 1.6, y + 0.75, z + 1.5, 0, 0.3, 0), 0x6a5a40, 0.25, 5 + k), M.vcPlain); });
  // the old birch on the hill behind the village. Act I: whole until the lightning finds it (birchWhole), then split
  // (birchSplit); from Act II on, split and still green, with the young yew grown up through the scorched stump (yew)
  const bi = W('birch'), by = gy(...bi);
  st('birchSplit', true, (c) => {
    for (const k of [-1, 1]) c.b.add(tint(at(cyl(0.14, 0.32, 3.8, 6), bi[0] + k * 0.3, by + 1.8, bi[1], 0, 0, -k * 0.17), 0x2a221c, 0.2, 6), M.vcPlain);
    for (const [dx, dy, dz, sc] of [[-1.0, 3.7, 0.2, 1.4], [1.1, 4.0, -0.3, 1.5], [0.1, 4.9, 0.5, 1.2], [-0.3, 2.9, -0.9, 1.0], [1.6, 3.0, 0.8, 0.9]]) c.b.add(tint(at(new THREE.IcosahedronGeometry(1, 1), bi[0] + dx, by + dy, bi[1] + dz, 0, dx, 0, sc, sc * 0.8, sc), 0x2c4a2a, 0.3, 7), M.vcPlain);
    c.addCircle(bi[0], bi[1], 0.7, 4);
  });
  st('yew', true, (c) => { for (const [dx, dz, h] of [[0.05, -0.15, 2.4], [0.45, 0.3, 1.5], [-0.4, 0.25, 1.7]]) c.b.add(tint(at(cone(0.55, h, 6), bi[0] + dx, by + h / 2 + 0.2, bi[1] + dz), 0x1e3a26, 0.25, 12), M.vcPlain); }); // the young yew that has grown
  st('birchWhole', false, (c) => {
    c.b.add(tint(at(cyl(0.16, 0.34, 8.4, 7), bi[0], by + 4.1, bi[1]), 0xd9d5c8, 0.18, 8), M.vcPlain);
    for (const [dx, dy, dz, sc] of [[0, 8.6, 0, 2.3], [-1.6, 7.2, 0.6, 1.7], [1.5, 7.4, -0.5, 1.8], [0.3, 6.2, 1.5, 1.4], [-0.4, 6.4, -1.5, 1.4]]) c.b.add(tint(at(new THREE.IcosahedronGeometry(1, 1), bi[0] + dx, by + dy, bi[1] + dz, 0, dx, 0, sc, sc * 0.85, sc), 0x6a8a3a, 0.3, 9), M.vcPlain);
    c.b.add(tint(at(cyl(0.05, 0.09, 3.2, 5), bi[0] + 1.3, by + 6.6, bi[1] + 0.2, 0, 0, -1.1), 0xd9d5c8, 0.18, 10), M.vcPlain); // the branch the ravens cling to
    c.addCircle(bi[0], bi[1], 0.6, 4);
  });
  // Act I's Bjornstead (the owner's story, Chapters 4 to 6): the raven pines on the rise west of the harbour and the one
  // the storm brought down with its nest, and the old things round the village that wait for a grown man (the omens)
  const A1 = ACT1_SPOTS(B, houses.barn.door);
  st('act1', false, (c, _w, objs) => {
    const [nx, nz] = A1.nest, ny = gy(nx, nz), R1 = rng(31);
    const pines = []; // the raven pines: the forest's own tree (vegetation.js), placed by hand
    for (const [dx, dz, sc] of [[-6, -4, 0.95], [4, -7, 1.15], [-11, 3, 0.9], [7, 5, 1.05], [-2, 9, 1.0], [12, -2, 0.85]]) {
      const x = nx + dx, z = nz + dz;
      pines.push({ x, y: gy(x, z) - 0.15, z, sc: sc * 1.15, ry: R1() * 6.28 });
      c.addCircle(x, z, 0.4, 2);
    }
    objs.push(standOfPines(pines));
    c.b.add(at(cyl(0.2, 0.34, 9.5, 7), nx - 3.6, ny + 0.32, nz - 1.6, Math.PI / 2 - 0.05, 1.15, 0), M.bark); // the storm-felled pine
    c.addBox(nx - 3.6, nz - 1.6, 4.6, 0.35, 1.15 - Math.PI / 2, 0.7);
    c.b.add(tint(at(new THREE.TorusGeometry(0.34, 0.13, 5, 10), nx, ny + 0.14, nz, Math.PI / 2, 0, 0), 0x4a3a28, 0.35, 3), M.vc);
    for (const [[x, z], r] of A1.logs.map((l, i) => [l, [0.4, 1.9, 2.7][i]])) c.b.add(at(cyl(0.17, 0.2, 1.5, 6), x, gy(x, z) + 0.16, z, Math.PI / 2, r, 0), M.bark);
    const [bx, bz] = A1.barrow, bwy = gy(bx, bz); // the mound ringed with stones, and a hilt standing out of it
    const mound = new THREE.Mesh(tint(at(sphere(3.3, 14, 8), bx, bwy - 0.55, bz, 0, 0, 0, 1, 0.55, 1), 0x56603e, 0.3, 4), patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { snow: 0.9 })); // turf under the snow
    mound.receiveShadow = true; objs.push(mound);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283; c.b.add(at(sphere(0.34 + (i % 3) * 0.08, 6, 5), bx + Math.cos(a) * 3.4, bwy + 0.1, bz + Math.sin(a) * 3.4, 0, i, 0, 1, 0.75, 1), M.stone); }
    c.b.add(at(box(0.05, 0.36, 0.03), bx, bwy + 1.0, bz, 0.12, 0.4, 0.06), M.dark); c.b.add(at(box(0.3, 0.045, 0.06), bx, bwy + 0.84, bz, 0.12, 0.4, 0.06), M.iron); c.b.add(at(sphere(0.045, 6, 5), bx + 0.01, bwy + 1.2, bz + 0.02), M.iron);
    const [sx, sz] = A1.skyIron; // the black stone that props the barn door
    c.b.add(tint(at(new THREE.IcosahedronGeometry(0.42, 1), sx, gy(sx, sz) + 0.24, sz, 0, 0.7, 0, 1.15, 0.8, 1), 0x1b1a1e, 0.25, 5), M.vcPlain); c.addCircle(sx, sz, 0.5, 0.6);
    P.runestone(c, ...A1.axeStone, 0.5); // the stone in the north meadow: two axes, a wing, a star
    const [tx, tz] = A1.tarn, ty = gy(tx, tz); // the tarn whose ice never melts, and the long shadow under it
    const ice = new THREE.Mesh(new THREE.CircleGeometry(6.4, 28), new THREE.MeshStandardMaterial({ color: 0xd3e5f0, roughness: 0.22, metalness: 0.1 }));
    ice.rotation.x = -Math.PI / 2; ice.position.set(tx, ty + 0.06, tz); ice.receiveShadow = true;
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 3.3), new THREE.MeshBasicMaterial({ color: 0x1c2a36, transparent: true, opacity: 0.6, depthWrite: false }));
    shade.rotation.set(-Math.PI / 2, 0, 0.5); shade.position.set(tx + 0.6, ty + 0.085, tz - 0.4);
    objs.push(ice, shade);
  });
  // timber in the hills: stumps and felled trunks
  const tm = W('timber'), R = rng(77);
  for (let i = 0; i < 7; i++) { const x = tm[0] + (R() - 0.5) * 22, z = tm[1] + (R() - 0.5) * 18; ctx.b.add(at(cyl(0.3, 0.36, 0.5, 7), x, gy(x, z) + 0.2, z), M.bark); }
  for (let i = 0; i < 4; i++) { const x = tm[0] - 6 + i * 3.4, z = tm[1] + 8 + (i % 2) * 1.5; ctx.b.add(at(cyl(0.24, 0.3, 7, 7), x, gy(x, z) + 0.3, z, Math.PI / 2, 0.3 + i * 0.2, 0), M.bark); }

  // ---- what the story builds or brings -------------------------------------------------
  const RING = [[[-6, 58], [40, 60], [80, 72], [104, 100], [106, 127]], [[106, 135], [100, 170], [78, 196], [40, 206], [4, 208]], [[-4, 208], [-40, 206], [-76, 196], [-100, 172], [-108, 150]], [[-108, 142], [-112, 100], [-100, 72], [-60, 60], [-12, 58]]];
  const out = (p, d) => { const dx = p[0], dz = p[1] - 134, l = Math.hypot(dx, dz) || 1; return B(p[0] + (dx / l) * d, p[1] + (dz / l) * d); };
  st('ditch', false, (c) => { for (const seg of RING) for (let i = 0; i < seg.length - 1; i++) { // drawn, not dug: a dark cut, the spoil banked behind it, stakes in its bottom
    const a = out(seg[i], 5), b = out(seg[i + 1], 5), a2 = out(seg[i], 2.6), b2 = out(seg[i + 1], 2.6), len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), n = Math.max(1, Math.round(len / 5));
    for (let k = 0; k < n; k++) { // in short lengths, so it follows the ground
      const t = (k + 0.5) / n, mx = a[0] + (b[0] - a[0]) * t, mz = a[1] + (b[1] - a[1]) * t, bx = a2[0] + (b2[0] - a2[0]) * t, bz = a2[1] + (b2[1] - a2[1]) * t;
      c.b.add(at(box(len / n + 0.4, 0.1, 2.6), mx, gy(mx, mz) + 0.03, mz, 0, ry, 0), M.dark);
      c.b.add(tint(at(box(len / n + 0.3, 0.8, 1.4), bx, gy(bx, bz) + 0.25, bz, 0, ry, 0), 0x4a3a28, 0.25, i + k + 3), M.vcPlain);
    }
    stakes(c, a[0], a[1], b[0], b[1], 0.5, 1.4);
  } });
  st('wall', false, (c) => { for (const seg of RING) palisade(c, seg.map(([dx, dz]) => B(dx, dz)), 3.7); for (const g of ['gateE', 'gateW', 'gateN', 'gateS']) { const [x, z] = W(g), [cx, cz] = B(0, 0), ns = g === 'gateN' || g === 'gateS'; gate(c, x, z, ns ? (cz > z ? 0 : Math.PI) : (cx > x ? Math.PI / 2 : -Math.PI / 2), ns ? 6.8 : 8.8, 5.0, 0x2f4a5c); } });
  st('tower', false, (c) => { // the watchtower on the hill by the old birch
    const x = bi[0] + 8, z = bi[1] + 5, y = gy(x, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.b.add(at(cyl(0.16, 0.2, 9, 6), x + sx * 1.5, y + 4.4, z + sz * 1.5, sz * 0.05, 0, -sx * 0.05), M.bark);
    c.b.add(at(box(3.9, 0.2, 3.9, 2), x, y + 6.6, z), M.plank); for (const [dx, dz, lx, lz] of [[0, -1.9, 3.9, 0.1], [0, 1.9, 3.9, 0.1], [-1.9, 0, 0.1, 3.9], [1.9, 0, 0.1, 3.9]]) c.b.add(at(box(lx, 0.1, lz), x + dx, y + 7.6, z + dz), M.timber);
    c.b.add(at(cone(3.2, 1.8, 4), x, y + 9.7, z, 0, Math.PI / 4, 0), M.thatch); c.b.add(at(box(0.5, 6.8, 0.1), x + 1.2, y + 3.3, z + 2.0, 0.12, 0, 0), M.timber);
    c.addCircle(x, z, 2.1, 7);
  });
  st('feast', false, (c) => { table(c, ...W('hall', 2, 14), 0, 7); table(c, ...W('hall', 2, 19.5), 0, 7); P.fireRing(c, ...W('hall', 16, 16.5), 0.9); P.barrel(c, ...W('hall', -4.5, 16.5)); P.barrel(c, ...W('hall', -4.5, 17.8)); });
  st('camp', false, (c) => { const [x, z] = W('camp'); P.cart(c, x + 3, z - 2.5, 0.4); P.fireRing(c, x, z, 0.5); P.leanTo(c, x - 3.4, z - 1.2, 1.2); P.crate(c, x + 1.6, z + 2.4, 0.5, 0.6); c.b.add(tint(at(box(2.6, 0.12, 1.8), x + 5.2, gy(x + 5.2, z + 1) + 0.5, z + 1, 0.1, 0.4, 0.06), 0x5a5444, 0.2, 3), M.vcPlain); });
  st('net', false, (c) => { // a fishing net strung across the street
    const [x, z] = B(0, 160), y = gy(x, z);
    for (const k of [-1, 1]) c.b.add(at(cyl(0.06, 0.07, 1.6, 5), x + k * 4.6, y + 0.75, z), M.timber);
    for (let i = 0; i < 6; i++) c.b.add(tint(at(box(9.2, 0.025, 0.025), x, y + 0.15 + i * 0.24, z), 0x8a8468, 0.1, i), M.vcPlain);
    for (let i = 0; i <= 18; i++) c.b.add(tint(at(box(0.025, 1.3, 0.025), x - 4.5 + i * 0.5, y + 0.75, z), 0x8a8468, 0.1, i), M.vcPlain);
  });
  st('searaven', false, (c, w, objs) => { // Leif's ship, home at the pier
    const m = P.makeShip({ L: 20, B: 4.2, seed: 21, sail: false, mast: 9 }), [x, z] = W('pier', -4.3, 5);
    m.position.set(x, -0.15, z); objs.push(m); w.addDeck({ x, z, yaw: 0, hw: 2.2, hl: 7.6, y: -0.15 + m.userData.deckY });
  });
  st('raven', false, (c) => { // Bjorn gives up, and carves a raven on the gate
    const [x, z] = W('gateN'), y = gy(x, z);
    c.b.add(at(box(7.4, 0.5, 0.5), x, y + 4.9, z), M.timber); c.b.add(at(box(1.9, 1.3, 0.14), x, y + 5.9, z), M.plank);
    c.b.add(tint(at(sphere(0.34, 7, 6), x, y + 5.85, z - 0.1, 0, 0, 0, 1, 1.2, 0.3), 0x14141a, 0.1, 2), M.vcPlain); c.b.add(tint(at(cone(0.1, 0.34, 4), x + 0.3, y + 6.14, z - 0.1, 0, 0, -1.3), 0x14141a, 0.1, 3), M.vcPlain);
    for (const k of [-1, 1]) c.b.add(tint(at(box(0.7, 0.3, 0.06), x + k * 0.5, y + 5.75, z - 0.1, 0, 0, k * 0.5), 0x14141a, 0.1, 4), M.vcPlain);
  });
  st('forge2', false, (c) => { const f = P.smithy(c, ...B(-64, 150), Math.PI / 2); P.woodpile(c, ...B(-69, 150), Math.PI / 2, 4, 8); P.crate(c, ...B(-62, 145.6), 0.3, 0.8); return { forge: f.forge, anvil: f.anvil }; }); // the second forge, built with Jarnøy's smiths
  // ---- Act IV: two quiet years, then the council, then Kettil ---------------------------------
  st('market', false, (c) => { [[-6, 197, 0x8a2a22], [6, 197, 0x2f4a5c], [-6, 187, 0xc9b27a], [6, 187, 0x3a6a4a]].forEach(([dx, dz, col], i) => stall(c, ...B(dx, dz), dx < 0 ? Math.PI / 2 : -Math.PI / 2, col, i + 11)); P.barrel(c, ...B(-7.4, 192)); P.crate(c, ...B(7.6, 192), 0.3, 0.8); }); // Freydis's market by the harbor
  st('heal', false, (c) => { houses.heal = house(c, ...B(-34, 113), 0.2, 9, { roof: 'thatch', door: 1, smoke: true }); P.dryingRack(c, ...B(-33, 120.6), 0.2); P.bench(c, ...B(-27.6, 119.4), 0.2); P.barrel(c, ...B(-39, 118.6)); }); // Ingrid's healing house
  const WARE = [[50, 215, 0.2], [64, 212, 0.15], [78, 207, 0.4]];
  st('ware', false, (c) => { WARE.forEach(([dx, dz, ry], i) => house(c, ...B(dx, dz), ry, 9, { wid: 5.6, roof: 'thatch', door: -1 })); P.barrel(c, ...B(57, 209)); P.crate(c, ...B(71, 206.4), 0.4, 0.9); P.cart(c, ...B(44, 209), 0.3); });
  const moor = (objs, list) => list.forEach(([dx, dz, ry, L, sd, burnt]) => { const m = P.makeShip({ L, B: L > 16 ? 4.2 : 3.2, D: L > 16 ? 1.55 : 1.1, rise: L > 16 ? 2.5 : 1.6, seed: sd, sail: false, shields: L > 16 && !burnt, mast: L > 16 ? 9 : 6.5 }), [x, z] = B(dx, dz); m.position.set(x, burnt ? -0.75 : -0.15, z); m.rotation.set(burnt ? 0.08 : 0, ry, burnt ? 0.5 : 0); objs.push(m); });
  st('fleet', false, (c, w, objs) => moor(objs, [[-50, 246, 0.4, 14, 51], [-37, 252, 0.3, 20, 52], [-24, 258, 0.2, 14, 53], [-12, 264, 0.1, 20, 54], [13, 264, -0.1, 14, 55], [25, 258, -0.2, 20, 56], [37, 252, -0.3, 14, 57], [50, 246, -0.4, 20, 58], [0, 278, 0, 20, 59], [62, 240, -0.5, 14, 60], [-62, 240, 0.5, 14, 61]])); // twelve ships, with the Sea-Raven
  st('refugees', false, (c) => { // more camped outside the walls
    [[-128, 152, 0.4], [-136, 160, 1.2], [-146, 166, 2.0], [-132, 170, -0.6], [-150, 140, 0.2], [-158, 156, 1.6], [-142, 176, 2.6], [-124, 164, -1.2]].forEach(([dx, dz, ry]) => P.leanTo(c, ...B(dx, dz), ry));
    for (const [dx, dz] of [[-134, 156], [-148, 160], [-136, 172]]) P.fireRing(c, ...B(dx, dz), 0.5);
    P.cart(c, ...B(-122, 156), 1.0); P.crate(c, ...B(-140, 150), 0.3, 0.7); P.barrel(c, ...B(-152, 150));
  });
  st('burnt', false, (c, w, objs) => { // what Kettil's three ships left: the harbor, three warehouses and the food stored for winter
    for (const [dx, dz, ry] of WARE) { ruin(c, ...B(dx, dz), ry, 9, 5.6); const [x, z] = B(dx, dz); c.b.add(tint(at(box(13, 0.06, 9.5), x, gy(x, z) + 0.05, z, 0, ry, 0), 0x1a1612, 0.3, 5), M.vcPlain); } // scorched ground
    moor(objs, [[-20, 236, 0.9, 14, 62, 1], [16, 238, -0.7, 14, 63, 1], [34, 246, 0.3, 20, 64, 1]]);
    for (let i = 0; i < 7; i++) { const [x, z] = B(-2 + (i % 2) * 4, 236 + i * 2.6); c.b.add(tint(at(cyl(0.12, 0.15, 2.4 + (i % 3) * 0.6, 5), x, 0.9, z, (i % 3 - 1) * 0.3, 0, (i % 2 ? 1 : -1) * 0.25), 0x16120f, 0.3, i), M.vcPlain); } // the charred end of the pier
  });
  // ---- Act V: ashes again, the winter of hunger, the cell, the feast of survivors ------------------
  st('tower2', false, (c) => { // a new watchtower by the harbor gate (three refugee families sleep in a barn for it)
    const [x, z] = B(-15, 201.5), y = gy(x, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.b.add(at(cyl(0.16, 0.2, 8.4, 6), x + sx * 1.4, y + 4.1, z + sz * 1.4, sz * 0.05, 0, -sx * 0.05), M.bark);
    c.b.add(at(box(3.7, 0.2, 3.7, 2), x, y + 6.2, z), M.plank); for (const [dx, dz, lx, lz] of [[0, -1.8, 3.7, 0.1], [0, 1.8, 3.7, 0.1], [-1.8, 0, 0.1, 3.7], [1.8, 0, 0.1, 3.7]]) c.b.add(at(box(lx, 0.1, lz), x + dx, y + 7.2, z + dz), M.timber);
    c.b.add(at(cone(3.0, 1.7, 4), x, y + 9.2, z, 0, Math.PI / 4, 0), M.thatch); c.b.add(at(box(0.5, 6.4, 0.1), x - 1.1, y + 3.1, z - 1.9, -0.12, 0, 0), M.timber);
    c.addCircle(x, z, 2.0, 7);
  });
  st('slip', false, (c, w, objs) => { // a new ship on the slip (less firewood in the coldest month)
    const [x, z] = B(-36, 217), y = gy(x, z), m = P.makeShip({ L: 16, B: 3.8, D: 1.3, rise: 2.0, seed: 97, sail: false, shields: false, mast: 0.4 });
    m.position.set(x, y + 0.75, z); m.rotation.set(0, 0.5, 0); objs.push(m);
    for (const k of [-5, -1.6, 1.6, 5]) { const [px, pz] = P.toWorld(x, z, 0.5, 0, k); for (const e of [-1, 1]) { const [qx, qz] = P.toWorld(px, pz, 0.5, e * 1.5, 0); c.b.add(at(cyl(0.09, 0.11, 1.5, 5), qx, y + 0.6, qz, 0, 0, e * 0.35), M.bark); } }
    P.woodpile(c, ...B(-44, 212), 0.5, 4, 8); c.addBox(x, z, 1.9, 7.6, -0.5, 2);
  });
  st('sick', false, (c) => { // the sick go into a separate hall: the barn
    const d = houses.barn.door;
    for (let i = 0; i < 4; i++) { const x = d.x - 2.6 - (i % 2) * 1.5, z = d.z - 3.4 + i * 2.2; c.b.add(at(box(1.9, 0.18, 0.95), x, gy(x, z) + 0.09, z), M.hay); }
    c.b.add(tint(at(box(0.06, 1.3, 1.1), d.x - 0.5, gy(d.x, d.z) + 2.3, d.z, 0, 0, 0), 0xd8d2c2, 0.1, 3), M.vcPlain); P.fireRing(c, d.x - 5.6, d.z + 5.2, 0.5); c.b.add(at(cyl(0.32, 0.26, 0.46, 9), d.x - 5.6, gy(d.x - 5.6, d.z + 5.2) + 0.52, d.z + 5.2), M.iron);
  });
  st('privy2', false, (c) => { const [x, z] = B(17, 146), y = gy(x, z); for (const [dx, dz, ry] of [[0, -1.2, 0], [-1.2, 0, 1.57], [1.2, 0, 1.57]]) c.b.add(tint(at(box(2.4, 1.5, 0.08), x + dx, y + 0.75, z + dz, 0, ry, 0), 0x6a5a40, 0.25, 3), M.vcPlain); c.b.add(at(box(2, 0.1, 1.6), x, y + 0.03, z + 0.3), M.dark); c.addBox(x, z - 1.2, 1.2, 0.15, 0, 1.5); }); // too near the well, again
  st('bedding', false, (c) => { const [x, z] = B(113, 150), y = gy(x, z); for (let i = 0; i < 7; i++) c.b.add(tint(at(box(1.3, 0.2, 0.8), x + (i % 3 - 1) * 0.5, y + 0.1 + i * 0.13, z + (i % 2) * 0.4, 0, i * 0.7, 0), [0xcfc6b0, 0x8a7a5a, 0xa89a7a][i % 3], 0.2, i), M.vcPlain); });
  st('cell', false, (c) => { // where Torvald is held for judgment: logs, a turf roof, bars
    const [x, z] = B(-88, 160), y = gy(x, z);
    c.b.add(at(box(3.4, 2.3, 0.3), x, y + 1.15, z - 1.6), M.timber); for (const k of [-1, 1]) c.b.add(at(box(0.3, 2.3, 3.2), x + k * 1.7, y + 1.15, z), M.timber);
    c.b.add(at(box(4.2, 0.3, 4, 2.4), x, y + 2.45, z), M.turf); c.b.add(at(box(3.4, 0.1, 3.2), x, y + 0.04, z), M.plank);
    for (let i = 0; i < 9; i++) c.b.add(at(cyl(0.045, 0.045, 2.3, 5), x - 1.6 + i * 0.4, y + 1.15, z + 1.55), M.dark);
    c.b.add(at(box(3.6, 0.14, 0.14), x, y + 1.3, z + 1.56), M.iron); c.addBox(x, z, 1.85, 1.75, 0, 2.6);
    return { x, z, front: [x, z + 3.0] };
  });
  st('butts', false, (c) => { // two straw targets for the feast
    const out = [[34, 141], [34.6, 146]].map(([dx, dz]) => { const [x, z] = B(dx, dz), y = gy(x, z);
      for (const k of [-1, 0, 1]) c.b.add(at(cyl(0.04, 0.05, 1.9, 5), x + 0.3 + (k ? 0.2 : 0.5), y + 0.9, z + k * 0.5, 0, 0, k ? -0.2 : 0.35), M.bark);
      c.b.add(at(cyl(0.6, 0.6, 0.2, 14), x, y + 1.25, z, 0, 0, Math.PI / 2), M.hay); c.b.add(tint(at(cyl(0.2, 0.2, 0.22, 10), x, y + 1.25, z, 0, 0, Math.PI / 2), 0x8a2a22, 0.1, 2), M.vcPlain);
      return { x, y: y + 1.25, z }; });
    return { targets: out, line: B(16, 143.5) };
  });
  st('hnef', false, (c) => { for (const [dx, dz] of [[-12, 147], [-8.6, 150]]) { const [x, z] = B(dx, dz), y = gy(x, z); c.b.add(at(box(1.1, 0.03, 1.1), x, y + 0.03, z, 0, 0.3, 0), M.dark); for (let i = 0; i < 9; i++) c.b.add(tint(at(sphere(0.045, 5, 4), x - 0.36 + (i % 3) * 0.36, y + 0.07, z - 0.36 + Math.floor(i / 3) * 0.36), i === 4 ? 0xd8b040 : i % 2 ? 0xe8e4d8 : 0x2a2622, 0.1, i), M.vcPlain); } }); // boards scratched in the dirt
  st('hwall', false, (c) => { const [x, z] = B(-17, 222.4), y = gy(x, z); c.b.add(at(box(17, 1.0, 0.7, 2.2), x, y + 0.35, z, 0, -0.1, 0), M.stone); c.addBox(x, z, 8.5, 0.35, -0.1, 0.9); return { x, z, y: y + 0.85 }; }); // the harbor wall
  st('mboat', false, (c, w, objs) => { const b = P.makeShip({ L: 6.2, B: 1.9, D: 0.6, rise: 0.6, seed: 12 }), [x, z] = B(-3.2, 249); b.position.set(x, -0.1, z); b.rotation.y = 0.2; objs.push(b); return { x, z }; }); // from Myrholm, near midnight
  const wh = B(-153, 207), whRy = 2.56; // along the shoreline, her opened flank toward the land
  const whale = (objs, cut) => { // a whale the size of a longship, beached along the shore
    const g2 = new THREE.Group(), add = (geo, col, v = 0.12, sd = 1) => g2.add(new THREE.Mesh(tint(geo, col, v, sd), M.vcPlain));
    add(at(sphere(1, 16, 10), 0, 1.7, 0, 0, 0, 0, 9.4, 2.3, 2.7), 0x3c4650, 0.1, 2); add(at(sphere(1, 14, 8), 0.4, 1.0, 0, 0, 0, 0, 8.6, 1.5, 2.5), 0x8e959a, 0.1, 3);
    add(at(cone(1.5, 6.4, 9), -11.2, 1.5, 0, 0, 0, Math.PI / 2, 1, 1, 0.8), 0x3c4650, 0.1, 4);
    for (const k of [-1, 1]) add(at(sphere(1, 8, 5), -14.6, 1.3, k * 1.5, 0, k * 0.5, 0, 1.3, 0.16, 1.9), 0x343c46, 0.1, 5);
    add(at(sphere(1, 8, 5), 2.5, 1.0, 2.9, 0.5, 0.3, 0, 1.7, 0.14, 0.9), 0x343c46, 0.1, 6); add(at(sphere(0.1, 6, 5), 7.4, 2.0, 1.75), 0x101014, 0, 7);
    if (cut) { // the flank opened: red meat, pale blubber, ribs
      add(at(box(6.4, 2.0, 0.5), -0.6, 1.5, 2.55, 0.12, 0, 0), 0x7a1e1a, 0.25, 8); add(at(box(6.6, 0.3, 0.6), -0.6, 2.6, 2.5, 0.12, 0, 0), 0xe0d4c0, 0.1, 9);
      for (let i = 0; i < 6; i++) add(at(cyl(0.06, 0.07, 2.1, 5), -3.2 + i * 1.05, 1.5, 2.85, 0.2, 0, 0), 0xe8e2d2, 0.08, i);
      for (let i = 0; i < 6; i++) add(at(box(0.9, 0.4, 0.7), -4 + i * 1.7, 0.25, 4.6 + (i % 2) * 0.8, 0, i, 0), i % 2 ? 0xe0d4c0 : 0x8a2a24, 0.15, i + 3);
    }
    g2.position.set(wh[0], Math.max(-0.3, gy(...wh) - 0.5), wh[1]); g2.rotation.y = whRy; objs.push(g2);
  };
  st('whale', false, (c, w, objs) => { whale(objs, false); c.addBox(wh[0], wh[1], 9, 2.5, whRy, 4); return { x: wh[0], z: wh[1], at: (lx, lz) => P.toWorld(wh[0], wh[1], whRy, lx, lz), flank: [0, 1, 2].map((i) => P.toWorld(wh[0], wh[1], whRy, -3 + i * 3, 4.4)) }; });
  st('whaleCut', false, (c, w, objs) => { whale(objs, true); c.addBox(wh[0], wh[1], 9, 2.5, whRy, 4);
    for (const [lx, lz, ry] of [[-6, 8.5, 0.4], [1, 9.5, -0.2], [7, 8, 0.9]]) { const [x, z] = P.toWorld(wh[0], wh[1], whRy, lx, lz), y = gy(x, z); c.b.add(at(box(2.2, 0.12, 1.0), x, y + 0.3, z, 0, ry, 0), M.plank); for (const k of [-1, 1]) { const [qx, qz] = P.toWorld(x, z, ry, 0, k * 0.45); c.b.add(at(box(2.6, 0.1, 0.08), qx, y + 0.1, qz, 0, ry, 0), M.timber); } c.b.add(tint(at(box(1.4, 0.5, 0.8), x, y + 0.6, z, 0, ry, 0), 0x8a2a24, 0.2, 4), M.vcPlain); } }); // sledges, loaded
  st('crowns', false, (c) => { // the lightning-split trunk has grown two new crowns, one on each side
    for (const k of [-1, 1]) {
      c.b.add(tint(at(cyl(0.07, 0.12, 2.8, 5), bi[0] + k * 1.25, by + 4.3, bi[1], 0, 0, -k * 0.8), 0xd9d5c8, 0.18, 10), M.vcPlain);
      for (const [dx, dy, dz, sc] of [[2.4, 5.6, 0.2, 1.5], [3.0, 4.6, -0.6, 1.1], [1.9, 6.5, 0.6, 1.0]]) c.b.add(tint(at(new THREE.IcosahedronGeometry(1, 1), bi[0] + k * dx, by + dy, bi[1] + dz, 0, dx, 0, sc, sc * 0.8, sc), 0x5a8a40, 0.3, 9), M.vcPlain);
    }
  });
  const far = new Builder(); range(far, [[980, 60, 230, 330], [1280, 0, 290, 380], [1600, 70, 240, 340], [1880, 200, 200, 300], [760, 180, 170, 260]], 5); scene.add(far.build({ cast: false, receive: false }));
  return { id: 'bjornstead', s, stages, houses, barnDoor: door, forge: sm.forge, anvil: sm.anvil, hallDoor: houses.hall.door, ring: RING };
}

function kaupang(ctx, world, scene) {
  const s = MAIN.find((m) => m.id === 'kaupang'), W = (n, dx = 0, dz = 0) => { const p = place('kaupang', n, dx, dz); return [p.x, p.z]; }, K = (dx, dz) => [s.x + dx, s.z + dz];
  const stages = {}, st = (name, on, f) => (stages[name] = stage(world, scene, on, f));
  // the stone quay, two piers into the basin, warehouses behind
  const q = W('quay'), qy = 1.6;
  ctx.b.add(at(box(6, 3.4, 74, 2.4), q[0], qy - 1.7, q[1]), M.stone); world.addDeck({ x: q[0], z: q[1], yaw: 0, hw: 3, hl: 37, y: qy });
  deck(ctx, world, ...W('pier'), Math.PI / 2, 19, { y: 1.45 }); deck(ctx, world, ...W('pier2'), Math.PI / 2, 19, { y: 1.45 });
  for (const dz of [-36, -10, 50]) house(ctx, ...K(-116, dz), Math.PI / 2, 11, { wid: 6, roof: 'thatch', door: -1 });
  for (const [dx, dz] of [[-128, -30], [-127, -28.6], [-129, 34], [-127.6, 60], [-129.2, 61]]) P.barrel(ctx, ...K(dx, dz));
  for (const [dx, dz, ry] of [[-128, 8, 0.2], [-126.8, 9.4, 1.0], [-128, 30, 0.4], [-128.4, -40, 0.1]]) P.crate(ctx, ...K(dx, dz), ry, 0.9);
  P.barrel(ctx, ...W('barrel')); // where a captain without a ship sits and drinks
  // the market street: stalls under coloured awnings
  [[-106, 14, 0, 0x8a2a22], [-94, 26, Math.PI, 0xc9b27a], [-82, 14, 0, 0x2f4a5c], [-70, 26, Math.PI, 0x6a4a7a], [-58, 14, 0, 0xb0703a], [-46, 26, Math.PI, 0x3a6a4a], [-34, 14, 0, 0xc9a24a]].forEach(([dx, dz, ry, col], i) => stall(ctx, ...K(dx, dz), ry, col, i + 3));
  P.cart(ctx, ...K(-100, 24), 0.2); P.well(ctx, ...K(-20, 20));
  // the town: rows of houses either side of the street
  let n = 0;
  for (const [dx, dz, ry, len] of [[-96, 0, 0, 10], [-74, -2, 0, 10], [-52, 0, 0, 10], [-30, 2, 0, 9], [-96, -24, 0, 10], [-72, -26, 0, 10], [-48, -24, 0, 10], [-24, -22, 0, 9], [-90, -48, 0.1, 10], [-64, -50, 0, 10], [-38, -48, -0.1, 9],
    [-88, 40, 0, 10], [-36, 42, 0, 10], [-14, 46, 0.2, 9], [-36, 66, 0, 10], [-72, 86, 0.1, 10], [-46, 90, 0, 9], [-96, 98, 0.2, 9], [-8, 0, 1.5, 9], [-4, -30, 1.5, 9]]) house(ctx, ...K(dx, dz), ry, len, { roof: n % 2 ? 'thatch' : 'turf', door: dz < 20 ? 1 : -1, smoke: n++ % 3 === 0 });
  const tv = W('tavern'); house(ctx, ...tv, 0, 14, { wid: 7, ridge: 5.4, door: -1, doorX: 2, smoke: true }); pole(ctx, tv[0] + 5, tv[1] - 6, 3.4, 0x8a5a2a); P.bench(ctx, tv[0] - 3, tv[1] - 5.2, 0); P.barrel(ctx, tv[0] + 0.4, tv[1] - 5);
  // the thrall pen by the harbour
  const pn = W('pen'); P.fence(ctx, [[pn[0] - 7, pn[1] - 5], [pn[0] + 7, pn[1] - 5], [pn[0] + 7, pn[1] + 5], [pn[0] - 7, pn[1] + 5], [pn[0] - 7, pn[1] - 5]]);
  for (const [dx, dz] of [[-7, -5], [7, -5], [7, 5], [-7, 5]]) ctx.b.add(at(cyl(0.12, 0.14, 2.6, 6), pn[0] + dx, gy(pn[0] + dx, pn[1] + dz) + 1.3, pn[1] + dz), M.bark);
  // the Thing place above the town
  const th = W('thing'); for (let i = 0; i < 9; i++) { const a = i * 0.698; P.runestone(ctx, th[0] + Math.cos(a) * 7.5, th[1] + Math.sin(a) * 7.5, -a + 1.57); }
  ctx.b.add(at(box(2.4, 0.6, 1.6, 1.2), th[0], gy(...th) + 0.25, th[1]), M.stone); ctx.addBox(th[0], th[1], 1.2, 0.8, 0, 0.6);
  // ships: Leif's at the north pier (until she sails), a knarr at the south pier, the boat they borrow
  st('ship', true, (c, w, objs) => { const m = P.makeShip({ L: 20, B: 4.2, seed: 21, sail: false, mast: 9 }), [x, z] = W('ship'); m.position.set(x, -0.15, z); m.rotation.y = Math.PI / 2; objs.push(m); w.addDeck({ x, z, yaw: Math.PI / 2, hw: 2.2, hl: 7.6, y: -0.15 + m.userData.deckY }); });
  const kn = P.makeShip({ L: 15, B: 5, D: 1.9, rise: 1.7, seed: 31, sail: false, shields: false, mast: 8 }), kp = W('pier2', -1, -5.2); kn.position.set(kp[0], -0.2, kp[1]); kn.rotation.y = Math.PI / 2; scene.add(kn);
  st('skiff', true, (c, w, objs) => { const b = P.makeShip({ L: 6.2, B: 1.9, D: 0.6, rise: 0.6, seed: 12 }), [x, z] = W('boat'); b.position.set(x, -0.1, z); b.rotation.y = Math.PI / 2; objs.push(b); });
  // the Skerries: the rock, the cave mouth over the pool, the wreck of the knarr on the bottom
  const wr = W('wreck'), R = rng(41);
  for (const [dx, dz, sx, sy, sz, y] of [[-9.5, 4, 3.2, 4.6, 3.4, 1.5], [9.5, 3, 3.4, 4.2, 3.2, 1.2], [0, 10, 6.2, 2.4, 3.2, 6.6], [-6, 9, 3.4, 3.6, 3, 3.2], [7, 9, 3.2, 3.8, 3.2, 3.0], [0, 15, 7, 3.2, 4, 3.4]]) ctx.b.add(at(sphere(1, 9, 7), wr[0] + dx, y, wr[1] + dz, 0, R() * 3, 0, sx, sy, sz), M.stone);
  world.addCircle(wr[0] - 9.5, wr[1] + 4, 3, 5); world.addCircle(wr[0] + 9.5, wr[1] + 3, 3, 5);
  const hull = P.makeShip({ L: 13, B: 4.4, D: 1.8, rise: 1.5, seed: 9, sail: false, shields: false, mast: 5 }); hull.position.set(wr[0] + 1, heightAt(wr[0], wr[1]) + 0.5, wr[1] + 2.5); hull.rotation.set(0.1, 0.9, 0.55); scene.add(hull);
  for (let i = 0; i < 5; i++) ctx.b.add(at(cyl(0.12, 0.15, 3 + R() * 2, 6), wr[0] - 4 + R() * 8, heightAt(wr[0], wr[1]) + 0.3 + R() * 0.5, wr[1] - 3 + R() * 9, Math.PI / 2 + (R() - 0.5), R() * 3, 0), M.bark);
  st('skiffOut', false, (c, w, objs) => { const b = P.makeShip({ L: 6.2, B: 1.9, D: 0.6, rise: 0.6, seed: 12 }); b.position.set(wr[0] + 12, -0.1, wr[1] - 6); b.rotation.y = 0.7; objs.push(b); });
  const far = new Builder(); range(far, [[2230, 3080, 240, 330], [2290, 3380, 280, 360], [2150, 3660, 230, 330], [1800, 3760, 200, 300]], 9); scene.add(far.build({ cast: false, receive: false }));
  return { id: 'kaupang', s, stages, wreck: { x: wr[0], z: wr[1], y: heightAt(wr[0], wr[1]) }, quayY: qy };
}

export function buildMainland(ctx, world, scene) {
  return { bjornstead: bjornstead(ctx, world, scene), kaupang: kaupang(ctx, world, scene) };
}
