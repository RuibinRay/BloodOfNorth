// The places Act V adds (docs/story, Act V): Håkon's hunting camp on the mainland (a palisade, the mews, the kennels,
// a pen of prisoners, a harbor, and the tannery yard that is the way in), Old Thrand's turf hut on Gannet Rock, and
// on Vængr the forest settlement, the harbor and what the berserkers burned. Everything is a procedural stand-in
// for real art. What the story brings and takes away are stages (see mainland.js).
import * as THREE from 'three';
import { M, Builder, at, box, cyl, cone, sphere, tint } from './geo.js';
import { heightAt } from './terrain.js';
import * as P from './props.js';
import { MAIN, place } from './layout.js';
import { house, palisade, deck, ruin } from './realm_props.js';
import { stage, range } from './mainland.js';

const gy = heightAt;
const SR = { L: 20, B: 4.2, seed: 21, mast: 9, sail: false };

function hunt(ctx, world, scene) {
  const s = MAIN.find((m) => m.id === 'hunt'), X = (dx, dz) => [s.x + dx, s.z + dz], W = (n, dx = 0, dz = 0) => { const p = place('hunt', n, dx, dz); return [p.x, p.z]; };
  const stages = {}, st = (name, on, f) => (stages[name] = stage(world, scene, on, f));
  // the palisade: a gate on the harbor side, and a door on the south into the tannery yard
  palisade(ctx, [X(-84, -8), X(-84, -34), X(-16, -34), X(-16, 30), X(-49.6, 30)], 3.4);
  palisade(ctx, [X(-56.4, 30), X(-84, 30), X(-84, 0)], 3.4);
  for (const [dx, dz] of [[-84, -8], [-84, 0], [-49.6, 30], [-56.4, 30]]) { const [x, z] = X(dx, dz); ctx.b.add(at(box(0.45, 4.6, 0.45), x, gy(x, z) + 2.2, z), M.timber); }
  // the tannery yard, set apart because of the smell: three pits of hides soaking in urine, dog dung and lime
  P.fence(ctx, [X(-72, 30.4), X(-72, 54), X(-58.5, 54)]); P.fence(ctx, [X(-47.5, 54), X(-34, 54), X(-34, 30.4)]);
  const pits = [[-64, 41], [-53, 45], [-42, 41]].map(([dx, dz], i) => { const [x, z] = X(dx, dz), y = gy(x, z);
    ctx.b.add(tint(at(box(3.4, 0.08, 2.4), x, y + 0.03, z, 0, i * 0.2 - 0.2, 0), 0x3a3222, 0.2, i + 2), M.vcPlain);
    for (const [ex, ez, lx, lz] of [[0, 1.3, 3.8, 0.2], [0, -1.3, 3.8, 0.2], [1.8, 0, 0.2, 2.8], [-1.8, 0, 0.2, 2.8]]) { const [qx, qz] = P.toWorld(x, z, i * 0.2 - 0.2, ex, ez); ctx.b.add(at(box(lx, 0.22, lz), qx, y + 0.1, qz, 0, i * 0.2 - 0.2, 0), M.timber); }
    return { x, z }; });
  P.dryingRack(ctx, ...X(-68, 49), 0.2); P.dryingRack(ctx, ...X(-39, 49), -0.3); P.dryingRack(ctx, ...X(-46, 34.6), 1.5); P.barrel(ctx, ...X(-69.6, 35)); P.barrel(ctx, ...X(-68.4, 36.2)); P.barrel(ctx, ...X(-36.6, 36));
  for (let i = 0; i < 4; i++) { const [x, z] = X(-59 + i * 0.5, 36 + (i % 2) * 0.5); ctx.b.add(tint(at(box(1.5, 0.07, 1.1), x, gy(x, z) + 0.06 + i * 0.07, z, 0, i * 0.5, 0), 0x8a6a48, 0.2, i), M.vcPlain); } // a stack of scraped hides
  // inside: the lodge, the long mews, the kennels, the pen, the fire
  house(ctx, ...W('lodge'), 0, 14, { wid: 6.6, ridge: 5, door: 1, smoke: true }); P.bench(ctx, ...W('lodge', -3, 5), 0);
  const mw = W('mews'), my = gy(...mw);
  ctx.b.add(at(box(17, 2.3, 0.14), mw[0], my + 1.15, mw[1] - 1.7), M.plank); ctx.addBox(mw[0], mw[1] - 1.7, 8.5, 0.2, 0, 2.4);          // the back wall
  for (const k of [-8.4, -4.2, 0, 4.2, 8.4]) ctx.b.add(at(cyl(0.09, 0.11, 2.6, 6), mw[0] + k, my + 1.3, mw[1] + 1.5), M.bark);
  ctx.b.add(at(box(17.6, 0.2, 3.8, 2), mw[0], my + 2.6, mw[1], 0.16, 0, 0), M.thatch);
  ctx.b.add(at(cyl(0.035, 0.035, 16, 5), mw[0], my + 1.25, mw[1] - 0.9, 0, 0, Math.PI / 2), M.timber);                                  // the perch
  for (let i = 0; i < 9; i++) { const x = mw[0] - 7 + i * 1.6; ctx.b.add(tint(at(sphere(0.13, 6, 5), x, my + 1.46, mw[1] - 0.9, 0, 0, 0, 0.8, 1.5, 1), [0x6a5a48, 0x8a8478, 0x4a4038][i % 3], 0.15, i), M.vcPlain); ctx.b.add(tint(at(sphere(0.07, 5, 4), x, my + 1.7, mw[1] - 0.86), 0x2a2420, 0.1, i), M.vcPlain); } // hawks and falcons, hooded
  const cg = [mw[0] + 7.4, mw[1] + 0.2];
  ctx.b.add(at(box(0.7, 0.8, 0.7), cg[0], my + 0.4, cg[1]), M.timber); for (const [ex, ez] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3], [0, -0.3], [0, 0.3], [-0.3, 0], [0.3, 0]]) ctx.b.add(at(cyl(0.012, 0.012, 0.55, 4), cg[0] + ex, my + 1.07, cg[1] + ez), M.bark);
  ctx.b.add(at(box(0.72, 0.04, 0.72), cg[0], my + 1.36, cg[1]), M.plank); ctx.addCircle(cg[0], cg[1], 0.5, 1.4);                         // a small wooden cage
  const kn = W('kennel'); ctx.b.add(at(box(4.2, 1.1, 2.2), kn[0], gy(...kn) + 0.55, kn[1]), M.plank); ctx.b.add(at(box(4.6, 0.18, 2.8, 2), kn[0], gy(...kn) + 1.2, kn[1], 0.14, 0, 0), M.thatch); ctx.addBox(kn[0], kn[1], 2.1, 1.1, 0, 1.2);
  const pn = W('pen'); P.fence(ctx, [[pn[0] - 5, pn[1] - 4], [pn[0] + 5, pn[1] - 4], [pn[0] + 5, pn[1] + 4], [pn[0] - 5, pn[1] + 4], [pn[0] - 5, pn[1] - 4]]);
  for (const [dx, dz] of [[-5, -4], [5, -4], [5, 4], [-5, 4]]) ctx.b.add(at(cyl(0.12, 0.14, 2.6, 6), pn[0] + dx, gy(pn[0] + dx, pn[1] + dz) + 1.3, pn[1] + dz), M.bark);
  const fr = W('camp', 4, -2); P.fireRing(ctx, ...fr, 0.7); P.bench(ctx, fr[0] - 2.6, fr[1], 1.57); P.bench(ctx, fr[0] + 2.6, fr[1], 1.57); P.woodpile(ctx, ...X(-22, 8), 1.5, 4, 8); P.cart(ctx, ...X(-74, -22), 0.3);
  // the harbor: a pier, and grain and weapons waiting on it
  const hb = W('harbor'); deck(ctx, world, hb[0], hb[1], Math.PI / 2, 14, { y: 1.2 });
  for (const [dx, dz] of [[14, -2.4], [13, -1.2], [15.6, 2.0]]) P.barrel(ctx, hb[0] + dx, hb[1] + dz); P.crate(ctx, hb[0] + 17, hb[1] + 1.6, 0.3, 0.9); P.crate(ctx, hb[0] + 16.4, hb[1] - 2.6, 1.0, 0.8);
  st('supply', true, (c, w, objs) => { // his supply ships: gone by dawn
    for (const [dx, dz, sd] of [[-3, -5.4, 141], [-7, 5.6, 143]]) { const m = P.makeShip({ L: 15, B: 5, D: 1.9, rise: 1.7, seed: sd, sail: false, shields: false, mast: 8 }); m.position.set(hb[0] + dx, -0.2, hb[1] + dz); m.rotation.y = Math.PI / 2; objs.push(m); }
  });
  const far = new Builder(); range(far, [[2130, 2620, 230, 330], [2180, 2800, 260, 360], [2110, 2960, 220, 320]], 19); scene.add(far.build({ cast: false, receive: false }));
  return { id: 'hunt', s, stages, X, pits, cage: { x: cg[0], z: cg[1], y: my + 1.0 }, pen: { x: pn[0], z: pn[1] }, door: X(-53, 30), yard: X(-53, 42), way: X(-53, 56), gate: X(-84, -4), fire: fr, mews: mw, kennel: kn, land: W('land'), harbor: hb };
}

/** Old Thrand's turf hut near the top of Gannet Rock, and the forest settlement, harbor and burned villages on Vængr. */
function isles5(world, scene) {
  const stages = {}, st = (name, f) => (stages[name] = stage(world, scene, false, f));
  st('gannet', (c, w, objs) => {
    const d = house(c, 471, 1125, 0.5, 5, { wid: 4, ridge: 3, roof: 'turf', door: 1, smoke: true }).door;
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 10 + (i % 5) * 4, x = 476 + Math.cos(a) * r, z = 1120 + Math.sin(a) * r; c.b.add(tint(at(sphere(0.9, 6, 4), x, gy(x, z) + 0.03, z, 0, a, 0, 1, 0.06, 0.7), 0xe8e6e0, 0.1, i), M.vcPlain); } // white with bird droppings
    const b = P.makeShip({ L: 6.2, B: 1.9, D: 0.6, rise: 0.6, seed: 12 }); b.position.set(463, -0.1, 1167); b.rotation.y = 0.4; objs.push(b);
    return { door: d, hut: [471, 1125], land: [466, 1158], top: [478, 1118] };
  });
  st('vaengr', (c, w, objs) => {
    const doors = [[-4, 1204, 0.3], [15, 1198, -0.4], [26, 1213, 1.2], [3, 1219, 0.1], [-15, 1214, 1.5]].map(([x, z, ry]) => house(c, x, z, ry, 8, { wid: 4.6, roof: 'turf', door: 1 }).door);
    P.well(c, 6, 1209); P.woodpile(c, -8, 1210, 0.4, 4, 7); P.dryingRack(c, 18, 1206, 0.6);
    deck(c, w, 88, 1222, Math.PI / 2, 9, { y: 1.2 });
    const m = P.makeShip(SR); m.position.set(93, -0.15, 1216.6); m.rotation.y = Math.PI / 2; objs.push(m); w.addDeck({ x: 93, z: 1216.6, yaw: Math.PI / 2, hw: 2.2, hl: 7.6, y: -0.15 + m.userData.deckY });
    ruin(c, -112, 1232, 0.4, 8, 4.6); ruin(c, -104, 1241, 1.2, 7, 4.4); ruin(c, -56, 1198, -0.2, 8, 4.6); ruin(c, -66, 1203, 1.0, 7, 4.4); // two fishing villages, burned
    for (const [x, z, sd] of [[8, 1171, 151], [30, 1174, 153]]) { const ls = P.makeShip({ L: 21, B: 4.4, seed: sd, sail: false }); ls.position.set(x, -0.15, z); ls.rotation.y = 0; objs.push(ls); } // the berserkers' ships, on the north coast
    return { doors, village: [6, 1209], pier: [82, 1222], north: [[4, 1187], [24, 1188], [-3, 1192]], holm: [-92, 1286], burnt: [[-110, 1235], [-60, 1200]], hall: [-66, 1266] };
  });
  return { stages };
}

export function buildAct5Places(ctx, world, scene) {
  return { hunt: hunt(ctx, world, scene), isles5: isles5(world, scene) };
}
