// What Act VII adds (docs/story, Act VII). At sea: Håkon's chained line across the harbor mouth, the ship whose
// archers rake the fleet, the Kinn ship that burns, and Ulf's flagship locked to the Sea-Raven by her ram. On
// Svartøy: the fleet on the black sand, the boathouse that is the field hospital, stakes and wolf banners up the
// slopes, the locks on the pens, the hall's great gate, and afterwards the graves by the shore. On Gulen: the
// banners of ten islands round the law-rock. Everything is a procedural stand-in for real art, and everything
// here is a stage (see mainland.js): it is there only while the story is.
import * as THREE from 'three';
import { M, at, box, cyl, cone, sphere, tint } from './geo.js';
import { heightAt } from './terrain.js';
import * as P from './props.js';
import { GREAT, AT_SEA, POI } from './layout.js';
import { house, stakes, pole } from './realm_props.js';
import { stage } from './mainland.js';
import { afloat } from './act4_places.js';

const gy = heightAt;
const LONG = (seed) => ({ L: 21, B: 4.4, seed, sail: false });

function sea7(world, scene) {
  const { x, z } = AT_SEA, S = (dx, dz) => [x + dx, z + dz]; // +z is the Sea-Raven's bow: Håkon's line lies ahead of it
  const wall = stage(world, scene, false, (c, w, objs) => { // thirty warships chained bow to stern across the harbor mouth: a floating wall (seven of them)
    for (let i = 0; i < 7; i++) { const m = P.makeShip(LONG(171 + i)); m.position.set(x - 69 + i * 23, -0.15, z + 74 + Math.sin(i * 1.3) * 2); m.rotation.y = Math.PI / 2; objs.push(m);
      if (i < 6) c.b.add(at(box(3.4, 0.09, 0.09), x - 57.5 + i * 23, 0.9, z + 74), M.iron); }
  });
  const raker = stage(world, scene, false, (c, w, objs) => { // the ship whose archers are putting fire into the fleet
    const sh = afloat(w, objs, LONG(181), x - 3, z + 28, Math.PI / 2 - 0.12, 2.2, 8);
    return { sh, spots: [[-9.4, 27.4], [-5.2, 28.2], [-0.6, 28.4], [3.8, 28.9]].map(([dx, dz]) => ({ x: x + dx, y: sh.y, z: z + dz })) };
  });
  const kinn = stage(world, scene, false, (c, w, objs) => { const m = P.makeShip({ L: 19, B: 4.2, seed: 191, sail: true }); m.position.set(x + 15, -0.15, z + 3); m.rotation.y = 0.1; objs.push(m); return { x: x + 15, z: z + 3, y: -0.15 + m.userData.deckY }; }); // the Kinn ship next to the Sea-Raven
  const fleet = stage(world, scene, false, (c, w, objs) => { // sixty-two ships (nine of them), astern and on either beam
    [[-30, -22, 0.1], [-16, -40, -0.1], [20, -34, 0.15], [34, -16, -0.05], [-46, -48, 0.2], [44, -46, 0.1], [0, -58, 0], [-28, -66, -0.1], [26, -70, 0.12]].forEach(([dx, dz, ry], i) => { const m = P.makeShip({ L: 18 + (i % 3) * 2, B: 4.2, seed: 201 + i, sail: i % 2 === 0 }); m.position.set(x + dx, -0.15, z + dz); m.rotation.y = ry; objs.push(m); });
  });
  const flag = stage(world, scene, false, (c, w, objs) => { // Ulf's flagship, her ram in the Sea-Raven's side: two decks that touch, and the ram between them
    const sh = afloat(w, objs, { L: 22, B: 4.6, seed: 9, sail: false }, x - 4.4, z + 0.6, 0.05, 2.3, 8.2);
    c.b.add(at(box(2.8, 0.24, 0.5), x - 2.2, sh.y + 0.03, z + 1.2, 0, 0.2, 0), M.timber); // the ram itself, a narrow beam above the black water
    return { sh, deck: [x - 4.4, z + 0.6] };
  });
  return { S, wall, raker, kinn, fleet, flag };
}

function svart7(world, scene) {
  const s = GREAT.find((g) => g.id === 'svartoy'), X = (dx, dz) => [s.x + dx, s.z + dz];
  const shore = stage(world, scene, false, (c, w, objs) => {
    [[-34, -262, 0.2, 211], [-16, -268, -0.1, 213], [18, -266, 0.1, 215], [36, -258, -0.2, 217], [56, -250, 0.3, 219], [-54, -252, -0.3, 221]].forEach(([dx, dz, ry, sd]) => { const m = P.makeShip({ L: 19, B: 4.2, seed: sd, sail: false }); const [x, z] = X(dx, dz); m.position.set(x, -0.1, z); m.rotation.y = ry; objs.push(m); }); // the fleet, run up onto the black sand
    const bh = X(-30, -226); house(c, bh[0], bh[1], 0.3, 9, { roof: 'thatch', door: 1 }); // a fisherman's boathouse by the landing: Ingrid's field hospital
    for (let i = 0; i < 4; i++) { const x = bh[0] + 6 + (i % 2) * 2.2, z = bh[1] + 1 + Math.floor(i / 2) * 2.4; c.b.add(tint(at(box(1.9, 0.14, 0.8), x, gy(x, z) + 0.1, z, 0, 0.3, 0), 0xc9b060, 0.2, i), M.vcPlain); }
    // what Håkon's men have put across the slopes
    stakes(c, ...X(-40, -184), ...X(-12, -180), -0.6); stakes(c, ...X(14, -180), ...X(44, -186), -0.6); stakes(c, ...X(-30, -164), ...X(-6, -160), -0.6); stakes(c, ...X(28, -162), ...X(52, -168), -0.6);
    for (const [dx, dz] of [[-22, -176], [26, -174], [-8, -128], [30, -132], [-18, -120]]) pole(c, ...X(dx, dz), 5.5, 'wolf');
    P.cart(c, ...X(8, -152), 1.2); P.cart(c, ...X(20, -146), -0.4); // the reserve's barricade at the bend
    return { hospital: [bh[0] + 7, bh[1] + 2], land: X(0, -238) };
  });
  const locks = stage(world, scene, false, (c, w, objs) => { // the pens: three doors, three locks (each its own mesh: Star-Fall takes them off)
    const pts = [[-11, 14.8], [15, 26.8], [-7, 40.8]].map(([dx, dz]) => X(30 + dx, 222 - 22 + dz));
    const bars = pts.map(([x, z]) => { const y = gy(x, z), g = new THREE.Group(); g.add(new THREE.Mesh(at(box(1.3, 0.12, 0.12), x, y + 1.0, z), M.iron), new THREE.Mesh(at(box(0.22, 0.26, 0.14), x, y + 0.86, z), M.iron)); objs.push(g); return g; });
    const gt = X(59.5, 226); for (const k of [-1, 1]) { c.b.add(at(box(0.4, 3.4, 0.4), gt[0], gy(...gt) + 1.7, gt[1] + k * 2.9), M.timber); } c.b.add(at(box(0.4, 0.36, 6.2), gt[0], gy(...gt) + 3.5, gt[1]), M.timber); // the gate in the east fence, at the top of the goat path
    return { pts, bars, gate: gt };
  });
  const gate = stage(world, scene, false, (c) => { // the great wooden gate of the hall, shut
    const h = X(0, 116), y = gy(h[0], h[1]) + 0.0, z = h[1] - 18;
    for (const k of [-1, 1]) c.b.add(at(box(2.0, 4.2, 0.26), h[0] + k * 1.02, y + 2.1, z), M.timber);
    for (const k of [-1, 1]) for (const hy of [1, 2.2, 3.4]) c.b.add(at(box(1.9, 0.14, 0.3), h[0] + k * 1.02, y + hy, z), M.iron);
    c.addBox(h[0], z, 2.1, 0.3, 0, 4.4);
    return { x: h[0], z, front: [h[0], z - 3] };
  });
  const graves = stage(world, scene, false, (c) => { // they bury the dead of both sides
    const out = []; for (let i = 0; i < 22; i++) { const [x, z] = X(-76 + (i % 11) * 5.4, -206 + Math.floor(i / 11) * 6.5), y = gy(x, z); c.b.add(tint(at(sphere(1, 7, 5), x, y + 0.05, z, 0, 0.2 * i, 0, 1.2, 0.26, 0.6), 0x2e2a26, 0.2, i), M.vcPlain); if (i % 3 === 0) c.b.add(at(box(0.16, 0.7, 0.07), x + 1.2, y + 0.35, z), M.stone); out.push([x, z]); }
    const st = X(-22, -236), sy = gy(...st); c.b.add(at(box(0.9, 1.1, 0.3), st[0], sy + 0.5, st[1], 0.06, 0.4, 0), M.stone); c.addCircle(st[0], st[1], 0.6, 1.2); // the stone Hauk carves Ari's name on
    return { stone: st };
  });
  return { id: 'svart7', s, X, shore, locks, gate, graves };
}

function gulen7(world, scene) {
  const R = POI.lawRock;
  const thing = stage(world, scene, false, (c) => { // the greatest Thing anyone has ever seen: the banners of ten islands round the law-rock
    const cols = [0x8a8a90, 0xc9a24a, 0x2f4a5c, 0x4a4a52, 0x4a5a3a, 0x8a7a4a, 0x3a3a4a, 0x3e4a3a, 0x5a4a3a, 0x16161a];
    for (let i = 0; i < 10; i++) { const a = 0.4 + (i / 10) * 5.4, x = R.x + Math.cos(a) * 11, z = R.z + Math.sin(a) * 11; pole(c, x, z, 5.2, cols[i]); }
    return { x: R.x, z: R.z };
  });
  return { thing, rock: [R.x, R.z] };
}

export function buildAct7Places(ctx, world, scene) {
  return { sea7: sea7(world, scene), svart7: svart7(world, scene), gulen7: gulen7(world, scene) };
}
