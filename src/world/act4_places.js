// The places Act IV adds (docs/story, Act IV): the English port where the River Itchen meets the sea, with its burh,
// its stone church and King Alfred's reeve; Hedeby Sound, the narrow channel with three signal headlands; the
// treasure ship Fafnir's Bed and her escort out of sight of land; and what Håkon's week of burning leaves on Kinn,
// Fedje, Skorpa and Gulen. Everything is a procedural stand-in for real art. What the story brings and takes away
// are stages (see mainland.js), off unless the story switches them on.
import * as THREE from 'three';
import { M, Builder, at, box, cyl, cone, sphere, tint } from './geo.js';
import { heightAt } from './terrain.js';
import * as P from './props.js';
import { MAIN, AT_SEA, place } from './layout.js';
import { house, deck, ruin, pole } from './realm_props.js';
import { stage, stall, range } from './mainland.js';

const gy = heightAt;
const SR = { L: 20, B: 4.2, seed: 21, mast: 9 };                                   // the Sea-Raven
const KNARR = { L: 24, B: 7.4, D: 2.4, rise: 1.9, seed: 71, shields: false, mast: 11 }; // Fafnir's Bed: a huge, fat-bellied knarr
/** A ship that can be walked on: the model, and its deck. */
function afloat(w, objs, opt, x, z, yaw, hw, hl) {
  const m = P.makeShip(opt); m.position.set(x, -0.15, z); m.rotation.y = yaw; objs.push(m);
  return { m, x, z, yaw, y: -0.15 + m.userData.deckY, deck: w.addDeck({ x, z, yaw, hw, hl, y: -0.15 + m.userData.deckY }) };
}
/** An earth bank along a line, in short lengths so it follows the ground, with its ditch on the side away from (cx, cz). */
function bank(ctx, pts, cx, cz, h = 2.3) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), n = Math.max(1, Math.round(len / 6));
    let nx = -(bz - az) / len, nz = (bx - ax) / len; if (nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      ctx.b.add(tint(at(box(len / n + 0.6, h, 3.6, 2), x, gy(x, z) + h / 2 - 0.3, z, 0, ry, 0), 0x5a6e3c, 0.22, i * 7 + k), M.vcPlain);
      ctx.b.add(tint(at(box(len / n + 0.6, 0.5, 2.2), x, gy(x, z) + h - 0.1, z, 0, ry, 0), 0x6a7c44, 0.2, i + k), M.vcPlain);
      ctx.b.add(at(box(len / n + 0.4, 0.1, 2.6), x + nx * 3.6, gy(x + nx * 3.6, z + nz * 3.6) + 0.03, z + nz * 3.6, 0, ry, 0), M.dark);
    }
    ctx.addBox((ax + bx) / 2, (az + bz) / 2, len / 2 + 0.3, 1.5, ry, h);
  }
}

function wessex(ctx, world, scene) {
  const s = MAIN.find((m) => m.id === 'wessex'), W = (n, dx = 0, dz = 0) => { const p = place('wessex', n, dx, dz); return [p.x, p.z]; }, X = (dx, dz) => [s.x + dx, s.z + dz];
  const stages = {}, st = (name, on, f) => (stages[name] = stage(world, scene, on, f));
  // the quay and two piers, as at any trading port
  const q = W('quay'), qy = 1.6;
  ctx.b.add(at(box(6, 3.4, 74, 2.4), q[0], qy - 1.7, q[1]), M.stone); world.addDeck({ x: q[0], z: q[1], yaw: 0, hw: 3, hl: 37, y: qy });
  deck(ctx, world, ...W('pier'), Math.PI / 2, 19, { y: 1.45 }); deck(ctx, world, ...W('pier2'), Math.PI / 2, 19, { y: 1.45 });
  for (const [dx, dz] of [[128, -24], [126.8, -22.6], [128, 30], [127, 52]]) P.barrel(ctx, ...X(dx, dz));
  for (const [dx, dz, ry] of [[127, 6, 0.2], [125.8, 7.4, 1.0], [127.6, 44, 0.4]]) P.crate(ctx, ...X(dx, dz), ry, 0.9);
  // the burh: an earth wall and a ditch round the town, built to stop exactly the kind of people Eirik's crew look like
  const RING = [[[124, -60], [70, -68], [20, -62], [-10, -36], [-16, 8]], [[-16, 32], [-12, 70], [14, 100], [66, 110], [124, 104]]];
  for (const seg of RING) bank(ctx, seg.map(([dx, dz]) => X(dx, dz)), ...X(60, 20));
  for (const k of [8, 32]) { const [x, z] = X(-16, k); ctx.b.add(at(box(0.5, 4.4, 0.5), x, gy(x, z) + 2.1, z), M.timber); }
  ctx.b.add(at(box(0.4, 0.4, 24.6), ...((p) => [p[0], gy(p[0], p[1]) + 4.2, p[1]])(X(-16, 20))), M.timber);
  // houses under thatch, the market street, the reeve's hall
  let n = 0;
  for (const [dx, dz, ry, len] of [[96, -2, 0, 10], [72, -4, 0, 10], [48, -2, 0, 9], [98, -34, 0, 10], [74, -40, 0.1, 10], [100, 44, 0, 10], [38, 44, 0, 10], [14, 46, 0.2, 9], [40, 74, 0, 10], [84, 84, 0.1, 10], [14, 2, 1.5, 9], [4, 62, 1.4, 8]]) house(ctx, ...X(dx, dz), ry, len, { roof: 'thatch', door: dz < 20 ? 1 : -1, smoke: n++ % 3 === 0 });
  const stalls = [[104, 14, 0, 0x8a2a22], [90, 26, Math.PI, 0xc9b27a], [76, 14, 0, 0x2f4a5c], [62, 26, Math.PI, 0x3a6a4a], [48, 14, 0, 0xb0703a], [34, 26, Math.PI, 0x6a4a7a]].map(([dx, dz, ry, col], i) => { stall(ctx, ...X(dx, dz), ry, col, i + 21); return X(dx, dz + (ry ? -2.2 : 2.2)); });
  P.well(ctx, ...X(22, 18)); P.cart(ctx, ...X(110, 24), 0.2);
  const hl = W('hall'); const hall = house(ctx, ...hl, 0, 15, { wid: 7.4, ridge: 5.6, roof: 'thatch', door: -1, doorX: 2, smoke: true }); pole(ctx, hl[0] + 6, hl[1] - 6.4, 4.2, 0x8a2a22); P.bench(ctx, hl[0] - 4, hl[1] - 5.4, 0);
  // the stone church with its bell
  const ch = W('church'), cy = gy(...ch);
  ctx.b.add(at(box(8, 5.2, 15, 2.2), ch[0], cy + 2.5, ch[1]), M.stone); ctx.addBox(ch[0], ch[1], 4, 7.5, 0, 5.2);
  for (const k of [-1, 1]) ctx.b.add(at(box(5.4, 0.3, 15.6, 2.4), ch[0] + k * 2.1, cy + 6.3, ch[1], 0, 0, -k * 0.7), M.thatch);
  ctx.b.add(at(box(4.4, 11, 4.4, 2.2), ch[0], cy + 5.4, ch[1] - 9.6), M.stone); ctx.addBox(ch[0], ch[1] - 9.6, 2.2, 2.2, 0, 11);
  ctx.b.add(at(cone(3.4, 2.6, 4), ch[0], cy + 12.2, ch[1] - 9.6, 0, Math.PI / 4, 0), M.thatch);
  for (const k of [-1, 1]) ctx.b.add(at(box(1.3, 1.9, 0.14), ch[0] + k * 2.22, cy + 9.2, ch[1] - 9.6, 0, Math.PI / 2, 0), M.dark);
  ctx.b.add(at(box(1.3, 1.9, 0.14), ch[0], cy + 9.2, ch[1] - 7.38), M.dark);
  const bell = new THREE.Mesh(at(cyl(0.2, 0.42, 0.6, 9), 0, -0.3, 0), M.iron); bell.position.set(ch[0], cy + 9.9, ch[1] - 7.2); scene.add(bell);
  ctx.b.add(at(box(1.5, 2.4, 0.14), ch[0] + 4.02, cy + 1.2, ch[1] + 3, 0, Math.PI / 2, 0), M.dark); // the south door
  for (const [a, b2, c2] of [[0.12, 1.5, 0.12], [0.9, 0.12, 0.12]]) ctx.b.add(at(box(a, b2, c2), ch[0], cy + 8.4 + (a < 0.5 ? 0 : 0.3), ch[1] + 7.5), M.timber);
  for (let i = 0; i < 6; i++) { const [x, z] = [ch[0] + 9 + (i % 3) * 2.4, ch[1] - 3 + Math.floor(i / 3) * 3.4]; ctx.b.add(at(box(0.5, 0.9, 0.14), x, gy(x, z) + 0.4, z), M.stone); } // graves
  // the farm outside the wall, where a little girl is burning with fever
  const fm = W('farm'), farm = house(ctx, ...fm, 0.1, 10, { roof: 'thatch', door: 1, smoke: true });
  P.hayStack(ctx, fm[0] - 9, fm[1] + 3, 0.9); P.fence(ctx, [[fm[0] - 14, fm[1] + 12], [fm[0] + 12, fm[1] + 14], [fm[0] + 14, fm[1] - 6]], { collide: false }); P.well(ctx, fm[0] + 8, fm[1] + 7); P.bench(ctx, fm[0] - 3, fm[1] + 5.2, 0.1);
  { const x = farm.door.x + 1.7, z = farm.door.z + 1.5; ctx.b.add(at(box(1.0, 0.16, 1.8), x, gy(x, z) + 0.08, z, 0, 1.6, 0), M.hay); } // a straw pallet by the door (buildings cannot be entered)
  // the harbor wall, south of the quay
  const wl = W('wall'); ctx.b.add(at(box(0.7, 1.0, 22, 2.2), wl[0], gy(...wl) + 0.4, wl[1]), M.stone); ctx.addBox(wl[0], wl[1], 0.35, 11, 0, 1);
  // the ships, while they are here
  st('ships', false, (c, w, objs) => { const a = afloat(w, objs, { ...SR, sail: false }, ...W('ship'), Math.PI / 2, 2.2, 7.6), b = afloat(w, objs, { ...KNARR, sail: false }, ...W('knarr'), Math.PI / 2, 3.2, 8.6); return { searaven: a, knarr: b }; });
  const far = new Builder(); range(far, [[-2090, 1990, 44, 270], [-2140, 2230, 54, 330], [-2080, 2470, 46, 280], [-1760, 2570, 38, 250], [-1700, 1840, 34, 230]], 13); // low downs, not mountains scene.add(far.build({ cast: false, receive: false }));
  return { id: 'wessex', s, stages, quayY: qy, stalls, hall: hall.door, farm: farm.door, church: { x: ch[0], z: ch[1] }, bell, wall: { x: wl[0], z: wl[1], y: gy(...wl) + 0.9 }, X };
}

function hedeby(ctx, world, scene) {
  const s = MAIN.find((m) => m.id === 'hedeby'), X = (dx, dz) => [s.x + dx, s.z + dz];
  const stages = {}, st = (name, on, f) => (stages[name] = stage(world, scene, on, f));
  // a signal beacon on each of the three headlands
  const heads = ['h1', 'h2', 'h3'].map((k) => { const p = place('hedeby', k), y = gy(p.x, p.z);
    ctx.b.add(at(cyl(1.5, 1.7, 0.5, 9), p.x, y + 0.2, p.z), M.stone);
    for (let i = 0; i < 5; i++) ctx.b.add(at(cyl(0.11, 0.13, 2.0, 5), p.x + Math.cos(i * 1.257) * 0.5, y + 1.3, p.z + Math.sin(i * 1.257) * 0.5, Math.sin(i * 1.257) * 0.3, 0, -Math.cos(i * 1.257) * 0.3), M.bark);
    ctx.addCircle(p.x, p.z, 1.6, 1.4);
    return { x: p.x, y: y + 2.0, z: p.z }; });
  // rocks in the channel: the ones a ship does not see until she is on them
  const rocks = [[-126, 178], [-112, 168], [-131, 196]].map(([dx, dz], i) => { const [x, z] = X(dx, dz); for (let k = 0; k < 3; k++) ctx.b.add(at(sphere(1, 7, 5), x + (k - 1) * 1.6, -0.5, z + (k % 2) * 1.2, 0, i + k, 0, 1.5 - k * 0.3, 0.7, 1.2), M.stone); return { x, z }; });
  const sp = place('hedeby', 'ship'), np = place('hedeby', 'north');
  st('north', false, (c, w, objs) => { // the convoy off the second headland, waiting on the signal
    const sr = afloat(w, objs, { ...SR, sail: true }, np.x, np.z, 0, 2.2, 7.6);
    for (const [dx, dz, ry, L, sd] of [[-152, -86, 0.1, 13, 81], [-128, -96, -0.1, 11, 82], [-144, -122, 0.05, 13, 83], [-160, -20, 0.2, 20, 87], [-124, -18, -0.1, 11, 84]]) { const m = P.makeShip({ L, B: 4.2, D: 1.7, rise: L > 15 ? 2.4 : 1.4, seed: sd, sail: true, shields: L > 15, mast: L > 15 ? 9 : 6.5 }), [x, z] = X(dx, dz); m.position.set(x, -0.2, z); m.rotation.y = ry; objs.push(m); }
    return { sr };
  });
  st('convoy', false, (c, w, objs) => { // the Sea-Raven in the narrow eastern channel, and the slow refugee boats round her
    const sr = afloat(w, objs, { ...SR, sail: true }, sp.x, sp.z, 0, 2.2, 7.6), boats = [];
    for (const [dx, dz, ry, L, sd] of [[-128, 112, 0.1, 13, 81], [-110, 124, -0.1, 11, 82], [-132, 176, 0.2, 13, 83], [-108, 186, -0.2, 11, 84], [-122, 214, 0.05, 13, 85], [-120, 84, 0, 11, 86]]) {
      const m = P.makeShip({ L, B: 4.2, D: 1.7, rise: 1.4, seed: sd, sail: true, shields: false, mast: 6.5 }), [x, z] = X(dx, dz); m.position.set(x, -0.2, z); m.rotation.y = ry; objs.push(m); boats.push(m);
    }
    return { sr, boats };
  });
  st('wrecks', false, (c, w, objs) => { // nightfall: what washes up
    for (const [dx, dz, ry, L, sd, roll] of [[-100, 140, 0.7, 13, 83, 0.5], [-101, 166, -0.5, 11, 84, -0.6], [-106, 152, 0.15, 20, 21, 0.3], [-126, 120, 1.2, 13, 81, 0.7], [-124, 186, -0.9, 11, 82, -0.8]]) {
      const m = P.makeShip({ L, B: 4.2, D: 1.6, rise: 1.5, seed: sd, sail: false, shields: false, mast: L > 15 ? 9 : 5 }), [x, z] = X(dx, dz); m.position.set(x, Math.max(-0.7, gy(x, z) - 0.2), z); m.rotation.set(0.06, ry, roll); objs.push(m);
    }
    for (let i = 0; i < 12; i++) { const [x, z] = X(-96 + ((i * 7) % 11) * 1.2, 136 + i * 2.8); c.b.add(at(cyl(0.1, 0.13, 2 + (i % 3), 5), x, gy(x, z) + 0.12, z, Math.PI / 2, i * 0.9, 0), M.bark); }
  });
  const far = new Builder(); range(far, [[2120, 2130, 220, 320], [2170, 2330, 260, 360], [2110, 2560, 210, 310]], 17); scene.add(far.build({ cast: false, receive: false }));
  return { id: 'hedeby', s, stages, heads, rocks, ship: { x: sp.x, z: sp.z }, north: { x: np.x, z: np.z }, beach: place('hedeby', 'beach'), X };
}

/** Out of sight of land: the Sea-Raven and, a ship's length to port, the treasure ship. */
function atSea(world, scene) {
  const { x, z } = AT_SEA;
  const st = stage(world, scene, false, (c, w, objs) => {
    const sr = afloat(w, objs, { ...SR, sail: true }, x, z, 0, 2.2, 7.6), kn = afloat(w, objs, { ...KNARR, sail: true }, x + 13, z, 0, 3.2, 8.6), y = sr.y;
    c.b.add(at(box(1.0, 0.16, 1.0), x + 0.9, y + 0.08, z + 3.2), M.stone); c.b.add(at(cyl(0.3, 0.26, 0.34, 9), x + 0.9, y + 0.5, z + 3.2), M.iron); // the cooking fire: a box of sand and stones, and the pot
    c.b.add(at(cyl(0.3, 0.26, 0.7, 9), x - 1.3, y + 0.35, z - 3.4), M.plank);                                                                // a tub of seawater
    c.b.add(at(box(0.9, 0.5, 0.55), x - 0.9, y + 0.25, z + 5.4, 0, 0.3, 0), M.timber); c.b.add(at(box(0.94, 0.06, 0.59), x - 0.9, y + 0.52, z + 5.4, 0, 0.3, 0), M.iron); // the sealed chest
    c.b.add(at(cyl(0.28, 0.24, 0.6, 9), x + 1.2, y + 0.3, z - 5.6), M.plank);                                                                // the barrel the dice are thrown on
    for (let i = 0; i < 8; i++) c.b.add(tint(at(box(1.1, 0.7, 0.8), x + 13 - 2.2 + (i % 4) * 1.5, kn.y + 0.35 + Math.floor(i / 4) * 0.72, z - 3 + (i % 2) * 0.9), [0x6a4a2a, 0x8a6a40, 0x5a3a24][i % 3], 0.15, i), M.vcPlain); // the cargo
    c.addCircle(x, z, 0.3, 3);
    return { sr, kn, fire: { x: x + 0.9, y: y + 0.6, z: z + 3.2 }, tub: [x - 1.3, z - 3.4], chest: [x - 0.9, z + 5.4], dice: [x + 1.2, z - 5.6] };
  });
  return st;
}

/** What Håkon's week leaves on the four small islands of the six. */
function isles(world, scene) {
  const stages = {}, st = (name, f) => (stages[name] = stage(world, scene, false, f));
  st('kinn', (c, w, objs) => { // a burning harbor on the north shore
    deck(c, w, -20, 689, 0, 13, { y: 1.2 });
    const doors = [[-38, 716, 0.2], [-6, 720, -0.1], [18, 724, 0.3]].map(([x, z, ry]) => house(c, x, z, ry, 9, { roof: 'thatch', door: -1 }).door);
    for (const [x, z, ry, roll] of [[-31, 692, 0.8, 0.9], [-9, 690, -0.5, -0.8]]) { const b = P.makeShip({ L: 6.4, B: 1.8, D: 0.62, rise: 0.7, seed: x }); b.position.set(x, -0.5, z); b.rotation.set(0.1, ry, roll); objs.push(b); } // sunk fishing boats
    const sr = P.makeShip({ ...SR, sail: false }); sr.position.set(-20, -0.15, 652); sr.rotation.y = Math.PI / 2; objs.push(sr);
    const skiff = P.makeShip({ L: 6.2, B: 1.9, D: 0.6, rise: 0.6, seed: 12 }); skiff.position.set(-16.6, -0.1, 698); objs.push(skiff);
    return { pier: [-20, 689], water: [[-22.4, 684], [-17.6, 680], [-22.4, 694]], fires: [[-38, 716, 4, 2.2], [-6, 720, 4, 2.4], [18, 724, 4, 2.0], [-20, 677.5, 1.4, 1.3]], doors };
  });
  st('fedje', (c) => { for (const [x, z, ry] of [[203, 598, 0.3], [204.4, 599.2, 1.1], [211, 598.6, 0.6]]) P.crate(c, x, z, ry, 0.8); P.cart(c, 213, 592.5, 0.9); P.barrel(c, 201.6, 592); return { camp: [207, 594], land: [150, 600], trail: [[152, 600], [168, 592], [184, 596], [197, 594]] }; }); // loot heaped at the pilot's station
  st('skorpa', (c) => { // the signal tower on the hill
    const x = -224, z = 1034, y = gy(x, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.b.add(at(cyl(0.16, 0.2, 8, 6), x + sx * 1.4, y + 3.8, z + sz * 1.4, sz * 0.05, 0, -sx * 0.05), M.bark);
    c.b.add(at(box(3.6, 0.2, 3.6, 2), x, y + 6.2, z), M.plank); c.b.add(at(cyl(0.5, 0.36, 0.5, 8), x, y + 6.55, z), M.iron); c.b.add(at(box(0.5, 6.4, 0.1), x + 1.1, y + 3.1, z + 1.9, 0.12, 0, 0), M.timber);
    c.addCircle(x, z, 2.0, 7);
    return { tower: { x, y: y + 7, z }, top: [-230, 1040], from: [[-196, 1040], [-230, 1006], [-204, 1064]] };
  });
  st('gulen', (c) => { // three steadings, and straw laid out by the hall for the wounded
    const farms = [[-75, 247, 0.6], [-37, 246, -0.5], [-43, 283, 2.4]];
    for (const [x, z, ry] of farms) { P.leanTo(c, x, z, ry); P.hayStack(c, x + Math.cos(ry) * 3, z + Math.sin(ry) * 3, 0.6); }
    const beds = [0, 1, 2].map((i) => { const x = -58 + i * 2.2, z = 277; c.b.add(at(box(0.95, 0.2, 2.0), x, gy(x, z) + 0.1, z), M.hay); return [x, z]; });
    return { farms, beds, ingrid: [-55.8, 273.6], horse: [-50, 262] };
  });
  return { stages };
}

export function buildAct4Places(ctx, world, scene) {
  return { wessex: wessex(ctx, world, scene), hedeby: hedeby(ctx, world, scene), sea: atSea(world, scene), isles: isles(world, scene) };
}
