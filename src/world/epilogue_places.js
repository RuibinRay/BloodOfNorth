// What the Epilogue adds to Ravenhold, twelve years after the war (docs/story, Epilogue): the town spilled beyond
// the old palisade (houses, workshops, gardens, a market on the strand), a busier harbor with ships from Wessex,
// Frisia, Dublin and the eastern rivers, the row of carved stones at the edge of town, the children's hall and
// Torvald's small house with Star-Fall on its wall, Leif's big house by the harbor (the one building in the game
// that can be walked into), a fence being mended, and Bjorn's mound under the old birch, whose split trunk has
// grown two great crowns. Everything is a procedural stand-in for real art, and everything here is a stage
// (see mainland.js): it is there only while the Epilogue is.
import * as THREE from 'three';
import { M, at, box, cyl, cone, sphere, tint } from './geo.js';
import { heightAt } from './terrain.js';
import * as P from './props.js';
import { house } from './realm_props.js';
import { stage, stall } from './mainland.js';
import { E8, E8B as B } from '../data/epilogue.js';

const gy = heightAt;

export function buildEpiloguePlaces(ctx, world, scene) {
  const town = stage(world, scene, false, (c, w, objs) => {
    // the town has spilled far beyond the palisade: houses, workshops, gardens
    const OUT = [[-124, 118, 0.3, 10], [-134, 140, 1.5, 9], [-128, 162, 0.1, 10], [-146, 154, 1.6, 9], [-140, 178, 0.2, 10], [-122, 186, 1.4, 9], [138, 104, 1.5, 10], [146, 126, 0.1, 9], [140, 152, 1.6, 10], [156, 170, 0.2, 9], [62, 48, 0.2, 9], [-74, 44, 1.5, 9]];
    OUT.forEach(([dx, dz, ry, len], i) => house(c, ...B(dx, dz), ry, len, { roof: i % 3 ? 'turf' : 'thatch', door: i % 2 ? 1 : -1, smoke: i % 3 === 0 }));
    for (const [dx, dz, ry] of [[-112, 130, 0.3], [-118, 170, 0.1], [-150, 128, 1.5], [132, 138, 0.1], [70, 62, 0.2]]) { // gardens: rows of green in a rail fence
      const [x, z] = B(dx, dz), y = gy(x, z);
      for (let k = 0; k < 5; k++) { const [rx, rz] = P.toWorld(x, z, ry, 0, -2.4 + k * 1.2); c.b.add(tint(at(box(7, 0.28, 0.5), rx, y + 0.1, rz, 0, ry, 0), k % 2 ? 0x4f7a34 : 0x5f8a3c, 0.25, k + dx), M.vcPlain); }
      P.fence(c, [P.toWorld(x, z, ry, -4.2, -3.4), P.toWorld(x, z, ry, 4.2, -3.4), P.toWorld(x, z, ry, 4.2, 3.4), P.toWorld(x, z, ry, -4.2, 3.4), P.toWorld(x, z, ry, -4.2, -1)], { collide: false });
    }
    for (const [dx, dz, ry, what] of [[-118, 150, 1.5, 'loom'], [-116, 104, 0.2, 'cooper'], [130, 90, 0.1, 'rope']]) { // open workshops
      const [x, z] = B(dx, dz), y = gy(x, z);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [px, pz] = P.toWorld(x, z, ry, sx * 2.2, sz * 1.6); c.b.add(at(box(0.2, 2.4, 0.2), px, y + 1.2, pz), M.timber); }
      c.b.add(at(box(5, 0.24, 3.8, 2), x, y + 2.5, z, 0.1, ry, 0), M.thatch);
      if (what === 'loom') P.loom(c, x, z, ry); else if (what === 'cooper') { for (let k = 0; k < 4; k++) P.barrel(c, ...P.toWorld(x, z, ry, -1.4 + k * 0.9, 0.6)); } else for (let k = 0; k < 5; k++) c.b.add(tint(at(cyl(0.12, 0.12, 0.3, 8), ...((q) => [q[0], y + 0.15, q[1]])(P.toWorld(x, z, ry, -1.6 + k * 0.8, 0)), 0, 0, 0), 0xb8a070, 0.2, k), M.vcPlain); // coils of rope
    }
    // the market on the strand, outside the south gate
    [[-24, 211, 0x8a2a22], [-13, 212.6, 0x2f4a5c], [14, 213, 0xc9b27a], [25, 211.6, 0x3a6a4a]].forEach(([dx, dz, col], i) => stall(c, ...B(dx, dz), 0, col, 31 + i));
    P.dryingRack(c, ...B(-32, 207.5), 0.1); P.dryingRack(c, ...B(32, 207), -0.1); P.barrel(c, ...B(-18, 214.5)); P.barrel(c, ...B(-17, 215.4)); P.crate(c, ...B(19, 215.6), 0.3, 0.8); P.crate(c, ...B(20.2, 216.2), 1.1, 0.7); P.cart(c, ...B(-6, 200), 0.2);
    // the harbor: Leif's four ships at the pier, and ships from Wessex, Frisia, Dublin and the far eastern rivers
    for (const [dx, dz, L] of [[4.4, 238, 19], [-4.4, 252, 18], [4.4, 252, 20]]) { const m = P.makeShip({ L, B: 4.2, seed: 300 + dz, sail: false, mast: 9 }), [x, z] = B(dx, dz); m.position.set(x, -0.15, z); objs.push(m); }
    for (const [dx, dz, ry, L, Bw, sail] of [[-54, 250, 1.3, 20, 4.2, true], [-40, 246, 0.4, 22, 6.6, true], [-22, 254, 0.2, 18, 4.2, false], [24, 250, -0.3, 24, 7, true], [42, 243, -0.4, 16, 3.8, false], [-8, 270, 0.1, 21, 6.2, true], [16, 274, -0.1, 20, 4.4, true]]) {
      const m = P.makeShip({ L, B: Bw, D: Bw > 5 ? 2.2 : 1.55, rise: Bw > 5 ? 1.8 : 2.5, seed: 320 + dx, sail, shields: Bw < 5, mast: Bw > 5 ? 11 : 9 }), [x, z] = B(dx, dz); m.position.set(x, -0.15, z); m.rotation.y = ry; objs.push(m);
    }
    // the row of carved stones at the edge of town: one for every person from Ravenhold who died in the war (Ari Hauksson's first)
    const st = E8.stones, stones = [];
    for (let i = 0; i < st.n; i++) { const [x, z] = B(st.first[0] - i * st.gap, st.first[1]); P.runestone(c, x, z, 0); stones.push([x, z]); }
    // the children's hall, and Torvald's small house beside it, Star-Fall on its wall
    const kh = house(c, ...B(...E8.kids), 0, 13, { wid: 6, ridge: 4.4, roof: 'thatch', door: 1, smoke: true });
    for (let k = 0; k < 5; k++) { const [x, z] = B(E8.kids[0] - 4 + k * 0.7, E8.kids[1] + 3.35); c.b.add(tint(at(cyl(0.26, 0.26, 0.04, 12), x, gy(x, z) + 0.3, z, 1.25, 0, 0), [0x7c2a22, 0x2f4a5c, 0xc9b27a][k % 3], 0.1, k), M.vcPlain); } // little shields against the wall
    const th = house(c, ...B(...E8.torvald), 0, 7, { wid: 4.2, ridge: 3.2, door: 1, smoke: true });
    { const [x, z] = B(E8.torvald[0] + 1.6, E8.torvald[1] + 2.28), y = gy(x, z) + 1.15;
      c.b.add(tint(at(cyl(0.022, 0.028, 0.95, 6), x, y, z, 0, 0, Math.PI / 2), 0x5c4630, 0.08, 1), M.vcPlain); c.b.add(tint(at(box(0.26, 0.15, 0.15), x + 0.48, y, z), 0x0e0e12, 0.12, 2), M.vcPlain); c.b.add(tint(at(box(0.04, 0.16, 0.16), x + 0.48, y, z), 0x4a5a70, 0, 3), M.vcPlain);
      for (const k of [-0.3, 0.3]) c.b.add(at(box(0.04, 0.12, 0.08), x + k, y + 0.08, z - 0.04), M.iron); } // two pegs
    P.bench(c, ...B(E8.torvald[0] - 1.6, E8.torvald[1] + 3.2), 0);
    // a fence being mended, a rail down, and the children's cloth by the stream
    { const [x, z] = B(...E8.fence), y = gy(x, z); P.fence(c, [[x - 7, z], [x - 0.6, z]], { collide: false }); P.fence(c, [[x + 1.4, z + 0.1], [x + 7, z + 0.2]], { collide: false });
      c.b.add(at(box(2.2, 0.09, 0.09), x + 0.4, y + 0.08, z + 0.7, 0, 0.3, 0), M.timber); c.b.add(at(cyl(0.07, 0.08, 1.5, 5), x + 0.4, y + 0.55, z), M.bark); }
    { const [x, z] = B(...E8.stream); c.b.add(tint(at(box(1.9, 0.03, 1.5), x, gy(x, z) + 0.03, z, 0, 0.3, 0), 0xd8cfb8, 0.1, 5), M.vcPlain); }
    return { stones, kids: kh, torvald: th };
  });

  // Leif's house: a big house by the harbor, with a view of the ships. Walls, a floor to stand on, a roof open along the ridge.
  const HS = E8.house, [hx, hz] = B(...HS.at), hy = HS.y, x0 = hx - HS.hl, x1 = hx + HS.hl, z0 = hz - HS.hw, z1 = hz + HS.hw;
  const home = stage(world, scene, false, (c, w) => {
    c.b.add(at(box(HS.hl * 2 + 0.8, 0.9, HS.hw * 2 + 0.8), hx, hy - 0.5, hz), M.stone);
    c.b.add(at(box(HS.hl * 2, 0.1, HS.hw * 2, 2.2), hx, hy - 0.04, hz), M.plank);
    w.addDeck({ x: hx, z: hz, yaw: 0, hw: HS.hl - 0.2, hl: HS.hw - 0.2, y: hy });
    const wall = (x, y, z, sx, sy, sz) => c.b.add(at(box(sx, sy, sz, 2.2), x, y, z), M.plank);
    wall(hx, hy + 1.5, z0, HS.hl * 2 + 0.6, 3, 0.3); c.addBox(hx, z0, HS.hl + 0.3, 0.15, 0, 3);                 // north
    wall(hx, hy + 0.5, z1, HS.hl * 2 + 0.6, 1, 0.3); wall(hx, hy + 2.6, z1, HS.hl * 2 + 0.6, 0.8, 0.3);          // south, with a window to the sea
    wall(x0 - 0.3 + 2.55, hy + 1.6, z1, 5.1, 1.2, 0.3); wall(hx + 3.75, hy + 1.6, z1, 7.1, 1.2, 0.3); c.addBox(hx, z1, HS.hl + 0.3, 0.15, 0, 3);
    wall(x0, hy + 1.5, hz, 0.3, 3, HS.hw * 2 + 0.6); c.addBox(x0, hz, 0.15, HS.hw + 0.3, 0, 3);                  // west, the hearth wall
    wall(x1, hy + 1.5, hz - 2.55, 0.3, 3, 3.5); wall(x1, hy + 1.5, hz + 2.55, 0.3, 3, 3.5); wall(x1, hy + 2.6, hz, 0.3, 0.8, 1.6); // east, and the door
    c.addBox(x1, hz - 2.55, 0.15, 1.75, 0, 3); c.addBox(x1, hz + 2.55, 0.15, 1.75, 0, 3);
    for (const k of [-1, 1]) c.b.add(at(box(0.18, 2.4, 0.18), x1 + 0.12, hy + 1.2, hz + k * 0.85), M.timber);   // the carved door-posts
    for (const s of [-1, 1]) c.b.add(at(box(HS.hl * 2 + 1.2, 0.3, 3.6, 2.4), hx, hy + 3.86, hz + s * (HS.hw - 1.58), -s * 0.5, 0, 0), M.turf); // the roof, open along the ridge
    for (const x of [x0, x1]) c.b.add(at(box(0.3, 1.0, 5.4), x, hy + 3.5, hz), M.plank);
    for (const dx of [-4, 0, 4]) c.b.add(at(box(0.22, 0.22, HS.hw * 2), hx + dx, hy + 3.0, hz), M.timber);        // tie-beams
    // the hearth, and the Twins above it, side by side
    c.b.add(at(box(1.5, 0.3, 1.5), x0 + 1.4, hy + 0.15, hz), M.stone); c.b.add(at(box(1.1, 0.08, 1.1), x0 + 1.4, hy + 0.32, hz), M.ember); c.addBox(x0 + 1.4, hz, 0.75, 0.75, 0, 0.4);
    for (const k of [-1, 1]) { // the long seax and the short sword, crossed, hilts down
      const th = 0.72 * k, len = k < 0 ? 0.7 : 0.54, dy = -Math.sin(th), dz = Math.cos(th), sg = dy < 0 ? 1 : -1, cx = x0 + 0.2, cy = hy + 2.0, cz = hz;
      const ey = cy + sg * dy * len / 2, ez = cz + sg * dz * len / 2;
      c.b.add(at(box(0.025, 0.06, len), cx, cy, cz, th, 0, 0), M.iron);
      c.b.add(tint(at(box(0.05, 0.035, 0.2), cx, ey, ez, th + Math.PI / 2, 0, 0), 0x6e5a36, 0, 2), M.vcPlain);
      c.b.add(tint(at(box(0.04, 0.04, 0.15), cx, ey + sg * dy * 0.09, ez + sg * dz * 0.09, th, 0, 0), 0x3a2a1c, 0, 3), M.vcPlain);
    }
    // the table, the benches, the accounts, the herbs, a bed under furs, a chest
    const tx = hx + 0.6, tz = hz + 0.2, ty = hy;
    c.b.add(at(box(2.8, 0.1, 1.1), tx, ty + 0.8, tz), M.plank); for (const [lx, lz] of [[-1.2, -0.42], [1.2, -0.42], [-1.2, 0.42], [1.2, 0.42]]) c.b.add(at(box(0.1, 0.78, 0.1), tx + lx, ty + 0.39, tz + lz), M.timber);
    c.addBox(tx, tz, 1.4, 0.55, 0, 0.9);
    for (const k of [-1, 1]) c.b.add(at(box(2.6, 0.08, 0.32), tx, ty + 0.45, tz + k * 0.95), M.plank);
    for (let i = 0; i < 6; i++) c.b.add(tint(at(box(0.04, 0.03, 0.32), tx - 0.9 + i * 0.07, ty + 0.87, tz - 0.25, 0, 0.1 * i, 0), 0xc9b48a, 0.1, i), M.vcPlain); // tally sticks: the accounts
    c.b.add(tint(at(sphere(0.2, 8, 6), tx + 0.9, ty + 0.9, tz + 0.1, 0, 0, 0, 1, 0.45, 1), 0x8a6a40, 0.1, 9), M.vcPlain);
    for (let i = 0; i < 9; i++) c.b.add(tint(at(box(0.08, 0.5, 0.08), x0 + 2.6 + i * 0.9, hy + 2.7, z0 + 0.35, 0, i, 0.1), 0x5a7a3a, 0.3, i), M.vcPlain); // herbs drying under the eaves
    c.b.add(at(box(2.2, 0.08, 0.5), hx - 1.5, hy + 1.5, z0 + 0.3), M.plank); for (let i = 0; i < 6; i++) c.b.add(tint(at(cyl(0.09, 0.08, 0.22, 7), hx - 2.4 + i * 0.36, hy + 1.66, z0 + 0.3), [0x8a6a4a, 0x5a6a7a, 0xb0703a][i % 3], 0.1, i), M.vcPlain);
    c.b.add(tint(at(box(2.0, 0.4, 1.4), x0 + 1.4, hy + 0.2, z0 + 1.0), 0x6a5a48, 0.2, 3), M.vcPlain); c.b.add(tint(at(box(1.9, 0.12, 1.3), x0 + 1.4, hy + 0.46, z0 + 1.0), 0x8a7a64, 0.3, 4), M.vcPlain); c.addBox(x0 + 1.4, z0 + 1.0, 1.0, 0.7, 0, 0.5);
    c.b.add(at(box(0.9, 0.5, 0.55), x1 - 1.4, hy + 0.25, z0 + 0.6), M.timber); c.b.add(at(box(0.94, 0.06, 0.59), x1 - 1.4, hy + 0.52, z0 + 0.6), M.iron);
    c.b.add(tint(at(box(3.2, 0.02, 2.0), tx, hy + 0.02, tz + 0.1), 0x7a3a2a, 0.2, 7), M.vcPlain);
    // outside: barrels by the door, shields on the wall
    P.barrel(c, x1 + 1.0, hz - 2.6); P.barrel(c, x1 + 1.2, hz - 1.7);
    for (let k = 0; k < 4; k++) c.b.add(tint(at(cyl(0.42, 0.42, 0.05, 14), [hx - 5.6, hx - 4.1, hx + 2.2, hx + 3.7][k], hy + 1.9, z1 + 0.2, Math.PI / 2, 0, 0), [0x7c2a22, 0x2f4a5c, 0xc9b27a, 0x3a6a4a][k], 0.1, k), M.vcPlain);
    return { table: { x: tx, y: ty + 0.85, z: tz }, hearth: { x: x0 + 1.4, y: hy + 0.4, z: hz }, door: { x: x1, z: hz }, window: { x: hx - 1, z: z1 }, twins: { x: x0 + 0.2, y: hy + 2.05, z: hz }, x0, x1, z0, z1, y: hy };
  });

  // the old birch: the split trunk grown into two great crowns leaning together, and Bjorn's mound beneath it
  const birch = stage(world, scene, false, (c) => {
    const [bx, bz] = B(-20, 10), by = gy(bx, bz);
    for (const k of [-1, 1]) {
      c.b.add(tint(at(cyl(0.2, 0.42, 7.4, 7), bx + k * 0.9, by + 3.5, bz, 0, 0, -k * 0.24), 0xd8d2c4, 0.12, 6), M.vcPlain); // white bark
      for (let i = 0; i < 4; i++) c.b.add(tint(at(box(0.36, 0.06, 0.34), bx + k * (0.5 + i * 0.25), by + 1.4 + i * 1.5, bz, 0, 0, -k * 0.24), 0x2a2622, 0.1, i), M.vcPlain); // its black marks
      for (const [dx, dy, dz, sc] of [[1.9, 8.2, 0, 2.7], [1.2, 9.4, 0.8, 1.9], [2.6, 7.0, -0.9, 1.7]]) c.b.add(tint(at(new THREE.IcosahedronGeometry(1, 1), bx + k * dx * 0.82, by + dy, bz + dz * k, 0, dx, 0, sc, sc * 0.78, sc), k < 0 ? 0x4a7a3a : 0x527f3c, 0.3, 7 + dx), M.vcPlain);
    }
    c.b.add(tint(at(new THREE.IcosahedronGeometry(1, 1), bx, by + 9.6, bz + 0.2, 0, 0.4, 0, 1.6, 1.0, 1.4), 0x4f7c3a, 0.3, 11), M.vcPlain); // where the two crowns meet
    const [mx, mz] = B(...E8.mound), my = gy(mx, mz);
    c.b.add(tint(at(sphere(1, 14, 9), mx, my - 0.75, mz, 0, 0.25, 0, 2.3, 1.55, 3.0), 0x6a8f45, 0.15, 21), M.vcPlain); c.addCircle(mx, mz, 2.3, 1.2);
    const [sx, sz] = B(...E8.stone), sy = gy(sx, sz);
    c.b.add(at(box(0.95, 0.56, 0.62), sx, sy + 0.24, sz, 0.04, 0.5, 0), M.stone); c.addCircle(sx, sz, 0.55, 0.6);
    return { stone: { x: sx, y: sy + 0.52, z: sz }, perch: { x: bx + 1.4, y: by + 6.6, z: bz + 0.3 }, branch: { x: bx - 1.2, y: by + 6.0, z: bz - 0.2 }, top: B(...E8.top) };
  });
  return { e8: { town, home, birch } };
}
