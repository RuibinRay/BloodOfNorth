// What stands on the great islands: the towns, halls and landmarks the story names (docs/story), placed at
// PLACES in layout.js. Everything here is a procedural stand-in for real art. The places where the champions are
// fought (the watchtower, the bridge, the hall, two ships' decks...) are returned in world.realm for the story code.
import * as THREE from 'three';
import { M, at, box, cyl, cone, sphere, tint, patch } from './geo.js';
import { heightAt } from './terrain.js';
import * as P from './props.js';
import { GREAT, place } from './layout.js';
import { rng, noise2 } from '../core/util.js';

let N = 0;
const quiet = (ctx) => ({ ...ctx, smoke: [] }); // most roofs do not smoke: a hundred chimneys is a lot of particles
export function house(ctx, x, z, ry, len = 11, o = {}) {
  return P.longhouse(o.smoke ? ctx : quiet(ctx), { id: 'r' + N++, x, z, ry, len, wid: o.wid || 5.4, ridge: o.ridge || 4.0, roof: o.roof || 'turf', door: o.door ?? 1, doorX: o.doorX || 0 });
}
/** A wall of upright logs along a polyline. */
export function palisade(ctx, pts, h = 3.3) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, y = Math.min(heightAt(ax, az), heightAt(bx, bz), heightAt(mx, mz));
    ctx.b.add(at(box(len + 0.3, h + 1, 0.34), mx, y + h / 2 - 0.5, mz, 0, ry, 0), M.timber);
    const n = Math.max(1, Math.round(len / 2.4));
    for (let k = 0; k <= n; k++) { const t = k / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t; ctx.b.add(at(cone(0.2, 0.7, 5), px, y + h + 0.3, pz), M.timber); ctx.b.add(at(cyl(0.2, 0.22, h + 1, 5), px, y + h / 2 - 0.5, pz), M.timber); }
    ctx.addBox(mx, mz, len / 2, 0.3, ry, h);
  }
}
/** A plank pier or bridge: a walkable deck with rails, on posts that reach the ground. Its long axis runs along yaw. */
export function deck(ctx, world, x, z, yaw, hl, { hw = 1.6, y = 1.2, rails = false, mat = M.plank } = {}) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  ctx.b.add(at(box(hw * 2, 0.2, hl * 2, 2.2), x, y - 0.1, z, 0, yaw, 0), mat);
  for (let t = -hl + 0.6; t <= hl - 0.5; t += 4.5) for (const k of [-1, 1]) {
    const px = x + s * t + c * k * (hw - 0.15), pz = z + c * t - s * k * (hw - 0.15), gy = Math.max(-3, heightAt(px, pz)), len = y - gy + 0.4;
    if (len > 0.5) ctx.b.add(at(cyl(0.13, 0.16, len, 6), px, y - len / 2, pz), M.bark);
    if (rails) ctx.b.add(at(cyl(0.07, 0.08, 1.15, 5), px, y + 0.55, pz), M.timber);
  }
  if (rails) for (const k of [-1, 1]) {
    const rx = x + c * k * (hw - 0.05), rz = z - s * k * (hw - 0.05);
    ctx.b.add(at(box(0.1, 0.1, hl * 2), rx, y + 1.05, rz, 0, yaw, 0), M.timber); ctx.b.add(at(box(0.08, 0.08, hl * 2), rx, y + 0.55, rz, 0, yaw, 0), M.timber);
    ctx.addBox(x + c * k * (hw + 0.12), z - s * k * (hw + 0.12), 0.12, hl, yaw, 1.2);
  }
  return world.addDeck({ x, z, yaw, hw, hl, y });
}
/** A square stone tower with a fighting top. Hollow in plan: four walls, and a deck inside them at the top. */
export function tower(ctx, world, x, z, half = 4.2, h = 9) {
  const y0 = heightAt(x, z) - 0.3, w = 0.8;
  for (const [dx, dz, lx, lz] of [[0, -half, half * 2 + w, w], [0, half, half * 2 + w, w], [-half, 0, w, half * 2 + w], [half, 0, w, half * 2 + w]]) {
    ctx.b.add(at(box(lx, h + 1.5, lz, 2.2), x + dx, y0 + (h + 1.5) / 2, z + dz), M.stone);
    ctx.addBox(x + dx, z + dz, lx / 2, lz / 2, 0, h + 1.5);
  }
  for (let i = 0; i < 4; i++) for (const k of [-1, 1]) { // merlons
    const a = i < 2, sx = a ? k * (half - 1.4) : (i === 2 ? -half : half), sz = a ? (i === 0 ? -half : half) : k * (half - 1.4);
    ctx.b.add(at(box(a ? 1.3 : w, 0.7, a ? w : 1.3), x + sx, y0 + h + 1.85, z + sz), M.stone);
  }
  ctx.b.add(at(box(half * 2, 0.3, half * 2, 2), x, y0 + h - 0.15, z), M.plank);
  ctx.b.add(at(box(1.3, 2.1, 0.12), x, y0 + 1.05, z + half + 0.42), M.dark);
  ctx.b.add(at(box(0.5, 1.1, 0.12), x - half - 0.42, y0 + h - 2.2, z, 0, Math.PI / 2, 0), M.dark); // the arrow slit that faces the town
  world.addDeck({ x, z, yaw: 0, hw: half - w / 2, hl: half - w / 2, y: y0 + h });
  return { x, z, y: y0 + h, half: half - w / 2 - 0.4, foot: { x, z: z + half + 2 } };
}
/** A burned-out building: a stone footing and what is left of the posts. */
export function ruin(ctx, x, z, ry, len = 10, wid = 5) {
  const y = heightAt(x, z), r = rng((x * 13 + z * 7) | 0);
  ctx.b.add(at(box(len, 0.5, wid), x, y + 0.1, z, 0, ry, 0), M.stone);
  for (let i = 0; i < 7; i++) { const [px, pz] = P.toWorld(x, z, ry, (r() - 0.5) * len, (r() < 0.5 ? -1 : 1) * wid / 2); ctx.b.add(tint(at(cyl(0.11, 0.14, 0.8 + r() * 2.2, 5), px, y + 1, pz, (r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5), 0x16120f, 0.3, i), M.vcPlain); }
  ctx.b.add(tint(at(box(len * 0.7, 0.16, 0.2), x, y + 0.45, z, 0.1, ry + 0.4, 0.12), 0x1a1512, 0.3, 2), M.vcPlain);
  ctx.addBox(x, z, len / 2, wid / 2, ry, 0.6);
}
/** A clay smelting furnace. */
function furnace(ctx, x, z) {
  const y = heightAt(x, z);
  ctx.b.add(tint(at(cyl(0.45, 0.85, 1.7, 8), x, y + 0.8, z), 0x8a5a3c, 0.2, 3), M.vc);
  ctx.b.add(at(cyl(0.3, 0.3, 0.1, 8), x, y + 1.66, z), M.ember);
  ctx.addCircle(x, z, 0.9, 1.6);
}
/** Sharpened stakes along a line, leaning the way an enemy would come from. */
export function stakes(ctx, ax, az, bx, bz, lean = 0.6, step = 1.0) {
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / step)), ry = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
  for (let k = 0; k <= n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; ctx.b.add(at(cyl(0.015, 0.075, 1.7, 5), x, heightAt(x, z) + 0.55, z, lean, ry, 0), M.bark); }
}
/** A hut on a platform on stilts (Myrholm). */
function stilt(ctx, world, x, z, ry) {
  const y = 1.5;
  ctx.b.add(at(box(7.4, 0.22, 7.4, 2), x, y - 0.11, z, 0, ry, 0), M.plank);
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 0, 1]) { const [px, pz] = P.toWorld(x, z, ry, sx * 3.3, sz * 3.3), gy = Math.max(-2.5, heightAt(px, pz)); ctx.b.add(at(cyl(0.13, 0.16, y - gy + 0.5, 6), px, (y + gy - 0.5) / 2, pz), M.bark); }
  const [hx, hz] = P.toWorld(x, z, ry, -0.9, -1.0);
  ctx.b.add(at(box(4.2, 1.9, 3.4), hx, y + 0.95, hz, 0, ry, 0), M.plank);
  for (const s of [-1, 1]) ctx.b.add(at(box(4.9, 0.26, 2.5, 2.4), ...((q) => [q[0], y + 2.5, q[1]])(P.toWorld(hx, hz, ry, 0, s * 0.95)), s * 0.7, ry, 0), M.thatch);
  ctx.b.add(at(box(0.9, 1.6, 0.1), ...((q) => [q[0], y + 0.8, q[1]])(P.toWorld(hx, hz, ry, 0.4, 1.72)), 0, ry, 0), M.dark);
  ctx.addBox(hx, hz, 2.1, 1.7, ry, 3);
  const [lx, lz] = P.toWorld(x, z, ry, 2.2, 4.9);
  ctx.b.add(at(box(1.1, 0.1, 3.6), lx, y - 0.75, lz, 0.42, ry, 0), M.plank); // the plank up from the mud
  return world.addDeck({ x, z, yaw: ry, hw: 3.7, hl: 3.7, y });
}
/** A moored longship that can be walked on. */
export function mooredShip(scene, world, x, z, yaw, L = 21, seed = 5) {
  const m = P.makeShip({ L, B: 4.4, seed, sail: false, mast: 9 });
  m.position.set(x, -0.15, z); m.rotation.y = yaw; scene.add(m);
  return world.addDeck({ x, z, yaw, hw: 2.35, hl: L / 2 - 2.4, y: -0.15 + m.userData.deckY });
}
export const pole = (ctx, x, z, h, cloth) => { // a banner on a pole
  const y = heightAt(x, z);
  ctx.b.add(at(cyl(0.06, 0.08, h, 5), x, y + h / 2, z), M.timber);
  ctx.b.add(tint(at(box(0.05, 1.7, 1.1), x, y + h - 1.0, z + 0.6), cloth, 0.15, 4), M.vcPlain);
};

function jarnoy(ctx, world) {
  const W = (n, dx = 0, dz = 0) => { const p = place('jarnoy', n, dx, dz); return [p.x, p.z]; };
  // the harbour town on the east shore: the watchtower, the granary beside it, and the pier
  for (const [dx, dz, ry, len] of [[-22, -30, 0.3, 12], [18, -32, -0.2, 11], [-34, 10, 1.4, 10], [-8, 36, 0.1, 12], [22, 30, -0.5, 9], [-44, -12, 1.5, 9], [34, 4, 1.7, 9]]) house(ctx, ...W('town', dx, dz), ry, len, { roof: N % 2 ? 'thatch' : 'turf', smoke: N % 3 === 0 });
  P.well(ctx, ...W('town', -2, 2)); P.cart(ctx, ...W('town', 8, 12), 0.4); P.barrel(ctx, ...W('town', 30, -14)); P.crate(ctx, ...W('town', 31, -12.6), 0.3); P.dryingRack(ctx, ...W('town', 40, 22), 1.2); P.dryingRack(ctx, ...W('town', 44, -22), 1.4);
  deck(ctx, world, ...W('landing', 10, -2), Math.PI / 2, 20);
  const tw = tower(ctx, world, ...W('tower'), 4.2, 9);
  house(ctx, ...W('tower', 12, 13), 0.5, 9, { roof: 'thatch', door: 0 }); // the granary: its fallen roof-beam is the way up
  ctx.b.add(at(cyl(0.16, 0.2, 9, 6), tw.x + 7.5, tw.y - 4.3, tw.z + 6.5, 0, 0.9, 0.95), M.bark);
  // King Hroald's hall, which the princess turns into a hospital
  house(ctx, ...W('hall'), 0.2, 22, { wid: 8, ridge: 6, smoke: true, doorX: 3 }); P.runestone(ctx, ...W('hall', 14, 12), 0.4); P.bench(ctx, ...W('hall', 6, 8), 0.2); P.dryingRack(ctx, ...W('hall', -10, 9), 0.2);
  // (the Iron Shore's stake trench and the Stinking Ditch are in jarnoy_town.js: Act III digs them)
  // the furnaces on the hill, smoking day and night
  for (const [dx, dz] of [[-8, -6], [0, 4], [9, -4], [-14, 6], [6, 12]]) furnace(ctx, ...W('furnaces', dx, dz));
  P.smithy(ctx, ...W('furnaces', 16, 10), 0.6); P.woodpile(ctx, ...W('furnaces', -18, -8), 0.3, 5, 9); P.woodpile(ctx, ...W('furnaces', -4, 18), 1.2, 4, 8); house(ctx, ...W('furnaces', 4, -20), 0.1, 10);
  // the fishing hamlet the collectors burned
  ruin(ctx, ...W('hamlet', -8, -4), 0.3); ruin(ctx, ...W('hamlet', 8, 6), -0.4, 8, 4.4); P.dryingRack(ctx, ...W('hamlet', 2, -12), 0.8);
  return { tower: tw, shore: place('jarnoy', 'shore') };
}
function solvik(ctx, world, scene) {
  const W = (n, dx = 0, dz = 0) => { const p = place('solvik', n, dx, dz); return [p.x, p.z]; };
  // the Golden Quay: warehouses in two rows behind a stone quay
  for (const dz of [-38, -13, 12, 37]) house(ctx, ...W('quay', -24, dz), Math.PI / 2, 12, { wid: 6, roof: 'thatch', door: -1 });
  for (const dz of [-30, 0, 30]) house(ctx, ...W('quay', 12, dz), Math.PI / 2, 13, { wid: 6, door: 1, smoke: dz === 0 });
  for (const [dx, dz] of [[-6, -22], [-4, -20], [-8, 8], [-5, 22], [-3, 24]]) P.barrel(ctx, ...W('quay', dx, dz));
  for (const [dx, dz, ry] of [[-10, -6, 0.2], [-9, -4.6, 1.1], [-6, 16, 0.5], [-44, -20, 0.1], [-45.5, -18.8, 0.9], [-44, 12, 0.3]]) P.crate(ctx, ...W('quay', dx, dz), ry, 0.9);
  P.cart(ctx, ...W('quay', -6, 2), 1.3); P.bench(ctx, ...W('quay', 30, 16), 0.3); P.well(ctx, ...W('quay', 36, -6));
  const q = W('quay', -53, 4), qy = 1.4;
  ctx.b.add(at(box(6, 3, 96, 2.4), q[0], qy - 1.5, q[1]), M.stone); world.addDeck({ x: q[0], z: q[1], yaw: 0, hw: 3, hl: 48, y: qy });
  const j = W('quay', -74, 14); deck(ctx, world, j[0], j[1], Math.PI / 2, 19, { y: 1.3 });
  // the champion's ship lies along the jetty, waiting on the treasure ship
  const ship = mooredShip(scene, world, j[0] - 2, j[1] + 3.85, Math.PI / 2, 21, 7);
  // King Eystein's hall
  house(ctx, ...W('hall'), -0.3, 20, { wid: 7.6, ridge: 5.7, smoke: true }); P.runestone(ctx, ...W('hall', 12, 12), -0.2); P.bench(ctx, ...W('hall', -4, 9), -0.3);
  ruin(ctx, ...W('quay', 44, 40), 0.5); // the house whose people dig in the ashes
  // the sea cave on the south shore
  const c = W('cave'), cy = heightAt(c[0], c[1]);
  for (const [dx, dz, sx, sy] of [[-3.4, 3, 1.1, 1.5], [3.4, 3.4, 1.2, 1.4], [0, 4.2, 2.3, 0.8]]) ctx.b.add(at(sphere(2.4, 8, 6), c[0] + dx, cy + (dx ? 1.2 : 3.6), c[1] + dz, 0, dx, 0, sx, sy, 1.2), M.stone);
  world.addCircle(c[0] - 3.4, c[1] + 3, 2.2, 4); world.addCircle(c[0] + 3.4, c[1] + 3.4, 2.4, 4);
  return { ship };
}
function svartoy(ctx, world, scene) {
  const W = (n, dx = 0, dz = 0) => { const p = place('svartoy', n, dx, dz); return [p.x, p.z]; };
  // the war harbour: burned-out warehouses, two that stand, piers into the basin, and the flagship lashed to its consort
  for (const [dx, dz, ry] of [[-34, -6, 0.2], [-30, 22, 1.4], [26, 20, -0.3], [40, -4, 1.5], [-8, 30, 0.1]]) ruin(ctx, ...W('harbor', dx, dz), ry, 11, 5.4);
  house(ctx, ...W('harbor', -12, 4), 0.1, 12, { roof: 'thatch' }); house(ctx, ...W('harbor', 12, 8), 1.5, 10, { smoke: true });
  const pier = deck(ctx, world, ...W('harbor', 30, -55), 0, 25, { y: 1.2 }); deck(ctx, world, ...W('harbor', -30, -50), 0, 20, { y: 1.2 });
  const fa = mooredShip(scene, world, pier.x + 3.9, pier.z - 8, 0, 22, 9), fb = mooredShip(scene, world, pier.x + 8.5, pier.z - 8, 0, 19, 11);
  for (const dx of [-36, 36]) pole(ctx, ...W('harbor', dx, -18), 6, 0x16161a);
  // the bend in the road below the bridge, where the reserve waits
  stakes(ctx, ...W('bend', -12, 6), ...W('bend', 12, 8), -0.6); pole(ctx, ...W('bend', -9, -4), 5.5, 0x16161a); pole(ctx, ...W('bend', 9, -4), 5.5, 0x16161a);
  // the long bridge over the ravine
  const bn = place('svartoy', 'bridgeN'), bs = place('svartoy', 'bridgeS'), by = heightAt(bn.x, bn.z) + 0.05;
  const bridge = deck(ctx, world, bn.x, (bn.z + bs.z) / 2, 0, (bs.z - bn.z) / 2 - 7, { hw: 2.4, y: by, rails: true });
  // the upper town behind its palisade
  const t = place('svartoy', 'town'), ring = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * 6.283 + 0.196; ring.push([t.x + Math.sin(a) * 68, t.z - Math.cos(a) * 60]); }
  palisade(ctx, [[t.x + 4, t.z - 60], ...ring.slice(0, 8), [t.x + 4, t.z + 60]]); palisade(ctx, [[t.x - 4, t.z + 60], ...ring.slice(8, 16), [t.x - 4, t.z - 60]]); // gates north (the bridge road) and south (the hall road)
  for (const [dx, dz, ry, len] of [[-30, -18, 0.2, 12], [30, -16, -0.2, 12], [-36, 16, 1.5, 10], [36, 18, 1.6, 10], [-14, 34, 0.1, 9], [16, 36, -0.1, 9]]) house(ctx, ...W('town', dx, dz), ry, len, { smoke: N % 2 === 0 });
  P.well(ctx, ...W('town', 8, 0)); P.smithy(ctx, ...W('town', -12, -34), 0.2); P.pell(ctx, ...W('town', 18, -8)); P.pell(ctx, ...W('town', 21, -4));
  // the Hall of Wolves: long axis north to south, the gate at the north end, the high seat at the south
  const h = place('svartoy', 'hall'), y0 = heightAt(h.x, h.z), L = 36, Wd = 14, hl = L / 2, hw = Wd / 2;
  ctx.b.add(at(box(Wd, 0.1, L, 2.2), h.x, y0 - 0.02, h.z), M.plank);
  for (const s of [-1, 1]) { ctx.b.add(at(box(0.5, 4.4, L, 2), h.x + s * hw, y0 + 2.1, h.z), M.plank); ctx.addBox(h.x + s * hw, h.z, 0.3, hl, 0, 4.4); ctx.b.add(at(box(4.4, 0.3, L + 0.8, 2.4), h.x + s * (hw - 1.7), y0 + 5.3, h.z, 0, 0, -s * 0.55), M.turf); }
  ctx.b.add(at(box(Wd + 0.5, 4.4, 0.5, 2), h.x, y0 + 2.1, h.z + hl), M.plank); ctx.addBox(h.x, h.z + hl, hw + 0.3, 0.3, 0, 4.4);
  for (const s of [-1, 1]) { ctx.b.add(at(box(hw - 2, 4.4, 0.5, 2), h.x + s * (hw + 2) / 2, y0 + 2.1, h.z - hl), M.plank); ctx.addBox(h.x + s * (hw + 2) / 2, h.z - hl, (hw - 2) / 2, 0.3, 0, 4.4); ctx.b.add(at(box(0.5, 5.2, 0.6), h.x + s * 2.1, y0 + 2.6, h.z - hl - 0.1), M.timber); }
  ctx.b.add(at(box(5.2, 0.5, 0.7), h.x, y0 + 5.0, h.z - hl - 0.1), M.timber); ctx.b.add(tint(at(cone(0.5, 1.3, 4), h.x, y0 + 5.9, h.z - hl - 0.1), 0x14110f, 0.2, 2), M.vcPlain);
  for (let i = 0; i < 3; i++) ctx.b.add(at(box(5.4 + i * 0.8, 0.16, 0.8), h.x, y0 - 0.1 - i * 0.14, h.z - hl - 0.9 - i * 0.8), M.stone); // the steps
  for (let zz = -14; zz <= 14.01; zz += 5.6) {
    for (const s of [-1, 1]) { ctx.b.add(at(cyl(0.26, 0.3, 7.2, 8), h.x + s * 3.5, y0 + 3.6, h.z + zz), M.timber); ctx.addCircle(h.x + s * 3.5, h.z + zz, 0.36, 7); ctx.b.add(at(box(4.7, 0.24, 0.24), h.x + s * 1.85, y0 + 8.3, h.z + zz, 0, 0, s * 0.6), M.timber); }
    ctx.b.add(at(box(7.6, 0.3, 0.3), h.x, y0 + 7.1, h.z + zz), M.timber);
  }
  ctx.b.add(at(box(0.3, 0.3, L + 1), h.x, y0 + 9.5, h.z), M.timber);
  ctx.b.add(at(box(0.9, 0.1, 16), h.x, y0 + 0.08, h.z - 1), M.ember); // the long fire
  for (const s of [-1, 1]) ctx.b.add(at(box(0.25, 0.22, 16.4), h.x + s * 0.62, y0 + 0.1, h.z - 1), M.stone);
  ctx.b.add(at(box(1.7, 1.2, 1.1), h.x, y0 + 0.6, h.z + hl - 2), M.timber); ctx.b.add(at(box(1.9, 3.0, 0.22), h.x, y0 + 1.5, h.z + hl - 1.4), M.timber); // the high seat
  ctx.b.add(at(box(2.4, 0.1, 0.9), h.x, y0 + 0.85, h.z + hl - 4), M.plank); for (const s of [-1, 1]) ctx.b.add(at(box(0.12, 0.85, 0.7), h.x + s * 1.0, y0 + 0.42, h.z + hl - 4), M.timber);
  ctx.b.add(tint(at(new THREE.TorusGeometry(0.09, 0.022, 5, 10, 2.6), h.x - 0.12, y0 + 0.92, h.z + hl - 4, Math.PI / 2, 0, 0), 0xc9a24a, 0.1, 1), M.vcPlain); // the broken oath-ring
  ctx.b.add(tint(at(new THREE.TorusGeometry(0.09, 0.022, 5, 10, 2.6), h.x + 0.14, y0 + 0.92, h.z + hl - 3.9, Math.PI / 2, 0, 2.4), 0xc9a24a, 0.1, 1), M.vcPlain);
  ctx.addBox(h.x, h.z + hl - 1.9, 1.0, 0.8, 0, 1.2);
  for (const s of [-1, 1]) for (const zz of [-10, -2, 6]) { // weapon racks along the walls, and the old banners
    ctx.b.add(at(box(0.16, 1.7, 3.2), h.x + s * (hw - 0.5), y0 + 0.95, h.z + zz), M.dark);
    for (let k = 0; k < 4; k++) ctx.b.add(at(cyl(0.022, 0.022, 1.9, 5), h.x + s * (hw - 0.72), y0 + 1.0, h.z + zz - 1.2 + k * 0.8, 0.1, 0, 0), M.iron);
    ctx.b.add(tint(at(box(0.05, 2.6, 1.5), h.x + s * 3.5, y0 + 5.4, h.z + zz + 3.4), zz === -2 ? 0x3a2622 : 0x17171c, 0.2, 3 + zz), M.vcPlain);
  }
  // the thrall pens on the far side, and the hidden cove below them
  for (const [dx, dz, ry] of [[-14, -10, 0.1], [12, 2, 0.1], [-10, 16, 0.1]]) { const [px, pz] = W('pens', dx, dz), py = heightAt(px, pz); ctx.b.add(at(box(17, 2.1, 5.2, 2.2), px, py + 0.95, pz, 0, ry, 0), M.stone); ctx.b.add(at(box(17.8, 0.34, 6, 2.4), px, py + 2.15, pz, 0, ry, 0), M.turf); ctx.b.add(at(box(1.1, 1.6, 0.1), ...((q) => [q[0], py + 0.8, q[1]])(P.toWorld(px, pz, ry, 3, 2.64)), 0, ry, 0), M.dark); ctx.addBox(px, pz, 8.6, 2.7, ry, 2.2); }
  P.fence(ctx, [W('pens', -30, -22), W('pens', 28, -18), W('pens', 29.3, 1)]); P.fence(ctx, [W('pens', 29.7, 7), W('pens', 30, 26), W('pens', -4, 30)]); // the gap on the east side is the gate (Act VII) P.runestone(ctx, ...W('cove', -4, -6), 0.6);
  return { bridge: { x: bridge.x, z: bridge.z, y: by, hw: 2.0, hl: bridge.hl - 1 }, bend: place('svartoy', 'bend'), gate: { x: h.x, z: h.z - hl - 9 }, hall: { x: h.x, z: h.z, y: y0, hw: hw - 1, hl: hl - 1 }, ships: [fa, fb], pens: place('svartoy', 'pens') };
}
function myrholm(ctx, world, scene) {
  const W = (n, dx = 0, dz = 0) => { const p = place('myrholm', n, dx, dz); return [p.x, p.z]; };
  const s = GREAT.find((g) => g.id === 'myrholm');
  // Queen Thora's hall on the one hill, the seven families' stones, the healers' racks
  house(ctx, ...W('hall'), 0.4, 18, { wid: 7, ridge: 5.2, smoke: true, roof: 'thatch' });
  for (const [dx, dz, ry] of [[-24, 14, 0.3], [22, 18, -0.4], [26, -14, 1.3], [-22, -20, 1.6]]) house(ctx, ...W('hall', dx, dz), ry, 9, { roof: 'thatch' });
  for (let i = 0; i < 7; i++) { const a = i * 0.898; P.runestone(ctx, ...W('hall', Math.cos(a) * 6 + 2, Math.sin(a) * 6 + 30), -a + 1.57); }
  P.dryingRack(ctx, ...W('hall', -10, 12), 0.2); P.dryingRack(ctx, ...W('hall', -6, 15), 0.3); P.fireRing(ctx, ...W('hall', 2, 30), 0.6);
  // the landing: a jetty and the flat-bottomed boats
  deck(ctx, world, ...W('landing', 0, -24), 0, 14, { y: 1.0 }); P.leanTo(ctx, ...W('landing', 9, 4), -0.6);
  for (const [dx, dz, ry, sd] of [[-6, -22, 0.4, 3], [6, -30, -0.3, 6]]) { const b = P.makeShip({ L: 6.2, B: 2.1, D: 0.5, rise: 0.4, sail: false, shields: false, seed: sd }); const [bx, bz] = W('landing', dx, dz); b.position.set(bx, Math.max(-0.1, heightAt(bx, bz)), bz); b.rotation.y = ry; scene.add(b); }
  // the stilt villages
  for (const [n, list] of [['stiltsW', [[0, 0, 0.2], [-11, 8, 1.1], [9, 10, -0.5]]], ['stiltsE', [[0, 0, -0.3], [11, -7, 0.8], [-9, -10, 0.1]]]]) for (const [dx, dz, ry] of list) stilt(ctx, world, ...W(n, dx, dz), ry);
  for (const [dx, dz, yaw] of [[94, 60, 1.19], [-125, 30, 2.03]]) deck(ctx, world, s.x + dx, s.z + dz, yaw, 13, { hw: 1.3, y: 0.95 }); // plank bridges over the two channels
  // the old watchtower in the drowned ground: what is left of three walls, and the stake pits round it
  const t = place('myrholm', 'tower');
  for (const [dx, dz, lx, lz, hh] of [[0, -4, 8, 0.9, 5.5], [-4, 0, 0.9, 8, 3.4], [4, -1.5, 0.9, 5, 2.2]]) { ctx.b.add(at(box(lx, hh, lz, 2.2), t.x + dx, hh / 2 - 0.8, t.z + dz), M.stone); ctx.addBox(t.x + dx, t.z + dz, lx / 2, lz / 2, 0, hh); }
  ctx.b.add(at(cyl(0.14, 0.18, 6.5, 6), t.x + 1.2, 1.6, t.z + 0.4, 0.5, 0.4, 0.3), M.bark); ctx.b.add(at(cyl(0.12, 0.16, 5, 6), t.x - 1.6, 1.0, t.z + 1.8, -0.6, 1.9, 0.2), M.bark);
  for (let i = 0; i < 5; i++) { const a = 0.6 + i * 1.2; stakes(ctx, t.x + Math.cos(a) * 15 - 2, t.z + Math.sin(a) * 15 + 6, t.x + Math.cos(a) * 15 + 2, t.z + Math.sin(a) * 15 + 6, 0.25, 0.7); }
  // the peat cutting, and the man the bog kept
  const pt = place('myrholm', 'peat'), py = heightAt(pt.x, pt.z);
  ctx.b.add(tint(at(box(9, 0.3, 2.6), pt.x, py + 0.02, pt.z, 0, 0.3, 0), 0x1e1812, 0.2, 2), M.vcPlain); ctx.b.add(tint(at(box(1.7, 0.2, 0.45), pt.x + 1, py + 0.2, pt.z + 0.2, 0, 0.5, 0), 0x2a1c12, 0.3, 4), M.vcPlain);
  for (let i = 0; i < 5; i++) ctx.b.add(tint(at(box(0.5, 0.22, 0.3), pt.x - 4 + i * 0.6, py + 0.3 + (i % 2) * 0.22, pt.z - 2.2, 0, i, 0), 0x2a2018, 0.2, i), M.vcPlain);
  // reeds, taller than a man, wherever the ground is wet
  const R = rng(6021), geo = new THREE.ConeGeometry(0.07, 2.3, 4); geo.translate(0, 1.15, 0);
  const mesh = new THREE.InstancedMesh(geo, patch(new THREE.MeshLambertMaterial({ color: 0xffffff }), { sway: 0.03, snow: 0.5 }), 2600);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  let n = 0;
  for (let i = 0; i < 26000 && n < 2600; i++) {
    const a = R() * 6.283, d = Math.sqrt(R()) * s.r * 1.2, cx = s.x + Math.cos(a) * d, cz = s.z + Math.sin(a) * d, h = heightAt(cx, cz);
    if (h < -0.55 || h > 0.75 || noise2(cx * 0.05, cz * 0.05) < -0.1 || Math.hypot(cx - t.x, cz - t.z) < 13) continue;
    for (let k = 0; k < 5 && n < 2600; k++) {
      const x = cx + (R() - 0.5) * 2.4, z = cz + (R() - 0.5) * 2.4, k2 = 0.7 + R() * 0.7;
      e.set((R() - 0.5) * 0.2, R() * 6.28, (R() - 0.5) * 0.2); q.setFromEuler(e); v.set(x, Math.max(-0.5, heightAt(x, z)) - 0.1, z); sc.set(k2, k2, k2);
      mesh.setMatrixAt(n, m4.compose(v, q, sc)); const g = 0.75 + R() * 0.4; mesh.setColorAt(n, col.setRGB(0.42 * g, 0.44 * g, 0.2 * g)); n++;
    }
  }
  mesh.count = n; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false; mesh.castShadow = false; scene.add(mesh);
  return { mire: { x: t.x + 1, z: t.z + 9 }, reeds: n };
}
function skalloy(ctx, world) {
  const W = (n, dx = 0, dz = 0) => { const p = place('skalloy', n, dx, dz); return [p.x, p.z]; };
  for (const [dx, dz, ry, len] of [[-16, -22, 0.2, 11], [14, -24, -0.1, 10], [-20, 14, 1.5, 9], [10, 20, 0.2, 11], [30, -2, 1.6, 9]]) house(ctx, ...W('harbor', dx, dz), ry, len, { roof: N % 2 ? 'thatch' : 'turf', smoke: N % 3 === 0 });
  deck(ctx, world, ...W('landing', -14, 0), Math.PI / 2, 20); P.crate(ctx, ...W('harbor', -34, -6), 0.3, 1.0); P.crate(ctx, ...W('harbor', -32, -4.5), 1.0, 0.8); P.barrel(ctx, ...W('harbor', -30, 4));
  // the forge street: four workshops, the nephew's forge at its head, the gate the hammer came through
  const forges = [];
  for (const [dx, dz, ry] of [[-26, -16, 0], [-8, -16, 0], [10, -16, 0], [-26, 14, Math.PI], [-8, 14, Math.PI]]) forges.push(P.smithy(ctx, ...W('forge', dx, dz), ry));
  house(ctx, ...W('forge', 18, 14), 0, 12, { smoke: true }); const big = P.smithy(ctx, ...W('forge', 30, -2), -Math.PI / 2);
  for (const [dx, dz] of [[-36, -8], [-36, 8]]) { const [gx, gz] = W('forge', dx - 10, dz * 0.4); ctx.b.add(at(box(0.4, 3.6, 0.4), gx, heightAt(gx, gz) + 1.8, gz), M.timber); ctx.addCircle(gx, gz, 0.32, 3.4); }
  ctx.b.add(at(box(0.3, 0.3, 7), ...((q) => [q[0], heightAt(q[0], q[1]) + 3.5, q[1]])(W('forge', -46, 0))), M.timber);
  P.woodpile(ctx, ...W('forge', 0, 26), 0.1, 5, 10); P.woodpile(ctx, ...W('forge', 34, 22), 1.4, 4, 8); P.cart(ctx, ...W('forge', -18, 0), 0.1);
  house(ctx, ...W('hall'), 0.5, 17, { wid: 7, ridge: 5.2, smoke: true }); P.runestone(ctx, ...W('hall', -12, 10), 0.9);
  // the quarry on the cliff above the sea: cut blocks, a lifting frame, and the ledge of loose stone at the edge
  const q = place('skalloy', 'quarry'), qy = heightAt(q.x, q.z), R = rng(88);
  for (let i = 0; i < 16; i++) { const a = 1.9 + R() * 2.6, d = 15 + R() * 13, s = 1.1 + R() * 1.4, bx = q.x + Math.cos(a) * d, bz = q.z + Math.sin(a) * d; ctx.b.add(at(box(s * 1.5, s, s, 2), bx, heightAt(bx, bz) + s / 2 - 0.2, bz, 0, R() * 3, 0), M.stone); ctx.addBox(bx, bz, s * 0.7, s * 0.6, 0, s); }
  for (const k of [-1, 1]) ctx.b.add(at(cyl(0.14, 0.18, 6.4, 6), q.x - 12, qy + 3, q.z + k * 1.6 - 14, 0, 0, k * 0.18), M.bark);
  ctx.b.add(at(cyl(0.1, 0.1, 4, 6), q.x - 12, qy + 6.1, q.z - 14, Math.PI / 2, 0, 0), M.bark); ctx.b.add(at(box(1.4, 0.9, 1), q.x - 12, qy + 2.2, q.z - 14), M.stone);
  for (let i = 0; i < 9; i++) ctx.b.add(at(sphere(0.3 + R() * 0.35, 6, 5), q.x + 17 + R() * 5, heightAt(q.x + 19, q.z) + 0.1, q.z - 7 + i * 1.7, 0, i, 0, 1.3, 0.5, 1), M.stone);
  return { forge: place('skalloy', 'forge'), forges, big, quarry: { x: q.x, z: q.z, edge: q.x + 19 } };
}
/** The duelling ground on Vængr: a square of hazel posts by the shore. */
function holm(ctx, x, z) {
  const y = heightAt(x, z), s = 5;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ctx.b.add(at(cyl(0.05, 0.07, 1.5, 5), x + a * s, heightAt(x + a * s, z + b * s) + 0.7, z + b * s), M.bark);
  for (const [dx, dz, ry] of [[0, -s, 0], [0, s, 0], [-s, 0, Math.PI / 2], [s, 0, Math.PI / 2]]) ctx.b.add(tint(at(box(s * 2, 0.03, 0.03), x + dx, y + 1.15, z + dz, 0, ry, 0), 0x8a7a5a, 0.1, 1), M.vcPlain);
  return { x, z };
}

export function buildRealmProps(ctx, world, scene) {
  const out = { jarnoy: jarnoy(ctx, world), solvik: solvik(ctx, world, scene), svartoy: svartoy(ctx, world, scene), myrholm: myrholm(ctx, world, scene), skalloy: skalloy(ctx, world) };
  out.holm = holm(ctx, -92, 1286);
  return out;
}
