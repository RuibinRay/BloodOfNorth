// Jarnøy's harbour town as Act III needs it (docs/story, Act III): the wall on its landward sides with three gates,
// the houses outside it, and what the Battle of Iron Shore brings and leaves. The parts the story changes are
// stages (world.main.jarnoy.stages, see mainland.js). In the sandbox the stake line and the open ditch stand, as
// they do after the battle.
import * as THREE from 'three';
import { M, at, box, cyl, cone, sphere, capsule, tint } from './geo.js';
import { heightAt } from './terrain.js';
import * as P from './props.js';
import { GREAT } from './layout.js';
import { house, palisade, stakes } from './realm_props.js';
import { stage, table } from './mainland.js';

export function buildJarnoyTown(ctx, world, scene) {
  const s = GREAT.find((g) => g.id === 'jarnoy'), J = (dx, dz) => [s.x + dx, s.z + dz], gy = heightAt;
  const stages = {}, st = (name, on, f) => (stages[name] = stage(world, scene, on, f));
  // the town wall: west and south (the east side is the harbour). Gates: west by the watchtower, south on the shore road, and a side gate
  for (const seg of [[[118, -76], [118, -67]], [[118, -51.5], [118, -46]], [[118, -38], [118, 24], [147, 24]], [[153, 24], [173, 24]], [[181, 24], [232, 22]]]) palisade(ctx, seg.map(([dx, dz]) => J(dx, dz)), 3.6);
  for (const [dx, dz, ns] of [[118, -42, 0], [177, 24, 1]]) for (const k of [-1, 1]) { const [x, z] = J(dx + (ns ? k * 4.4 : 0), dz + (ns ? 0 : k * 4.4)); ctx.b.add(at(box(0.5, 5, 0.5), x, gy(x, z) + 2.4, z), M.timber); }
  const sg = J(150, 24);
  st('sideShut', true, (c) => { c.b.add(at(box(6.2, 3.2, 0.16), sg[0], gy(...sg) + 1.5, sg[1]), M.timber); for (const k of [-1, 0, 1]) c.b.add(at(box(0.12, 3.2, 0.24), sg[0] + k * 2.2, gy(...sg) + 1.5, sg[1] + 0.1), M.dark); c.addBox(sg[0], sg[1], 3.1, 0.25, 0, 3.2); });
  st('sideOpen', false, (c) => { c.b.add(at(box(6.0, 3.2, 0.16), sg[0] - 3.0 - 0.4, gy(...sg) + 1.5, sg[1] + 2.9, 0, 1.45, 0), M.timber); });
  // the houses outside the wall
  const outer = [house(ctx, ...J(146, 41), 0.1, 9, { door: -1 }), house(ctx, ...J(161, 53), 1.5, 9, { door: 1 }), house(ctx, ...J(197, 43), -0.2, 9, { roof: 'thatch', door: -1 })].map((h) => h.door);
  P.dryingRack(ctx, ...J(136, 50), 0.4); P.fence(ctx, [J(150, 60), J(170, 62)], { collide: false });

  // ---- the Iron Shore ---------------------------------------------------------------------
  st('stakes', true, (c) => { // the trench across the beach, lined with sharpened stakes
    const a = J(184, 68), b = J(181, 130), len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), n = Math.round(len / 5);
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; c.b.add(at(box(len / n + 0.4, 0.1, 2.4), x + 0.7, gy(x, z) + 0.03, z, 0, ry, 0), M.dark); c.b.add(tint(at(box(len / n + 0.3, 0.6, 1.2), x - 1.3, gy(x, z) + 0.2, z, 0, ry, 0), 0x6a5a44, 0.25, k + 2), M.vcPlain); }
    stakes(c, a[0] + 0.4, a[1], b[0] + 0.4, b[1], 0.6); stakes(c, a[0] + 1.5, a[1] + 0.5, b[0] + 1.5, b[1] + 0.5, 0.75, 1.3);
  });
  const dc = J(192.5, 116), dy = gy(...dc);
  st('ditch', false, (c) => { // the Stinking Ditch, under a thin layer of sand and seaweed
    c.b.add(tint(at(box(3.4, 0.06, 23), dc[0], dy + 0.05, dc[1], 0, 0.04, 0), 0xb8a888, 0.18, 4), M.vcPlain);
    for (let i = 0; i < 9; i++) c.b.add(tint(at(sphere(0.5, 6, 5), dc[0] + ((i * 7) % 5 - 2) * 0.5, dy + 0.08, dc[1] - 10 + i * 2.5, 0, i, 0, 1, 0.08, 1.4), 0x3a4a2a, 0.3, i), M.vcPlain);
  });
  st('ditchOpen', true, (c) => {
    c.b.add(tint(at(box(3.4, 0.16, 23), dc[0], dy + 0.02, dc[1], 0, 0.04, 0), 0x2a2616, 0.3, 5), M.vcPlain);
    for (let i = 0; i < 12; i++) c.b.add(tint(at(sphere(0.6, 6, 5), dc[0] + ((i * 5) % 7 - 3) * 0.7, dy + 0.05, dc[1] - 11 + i * 2, 0, i, 0, 1.2, 0.07, 1), 0x4a4420, 0.3, i + 3), M.vcPlain);
  });
  st('fleet', false, (c, w, objs) => { // eleven longships out of the mist: four on the beach, six standing off (the eleventh is Ulf's, at the harbour)
    const ship = (dx, dz, yaw, seed, sail) => { const m = P.makeShip({ L: 20, B: 4.3, seed, sail }), [x, z] = J(dx, dz); m.position.set(x, -0.15, z); m.rotation.y = yaw; objs.push(m); };
    [[221, 98, 3], [220, 110, 5], [219, 122, 8], [241, 84, 13]].forEach(([dx, dz, sd]) => ship(dx, dz, -Math.PI / 2, sd, false));
    [[262, 68, 17], [284, 104, 19], [270, 142, 23], [304, 58, 29], [314, 126, 31], [298, 162, 37]].forEach(([dx, dz, sd], i) => ship(dx, dz, -Math.PI / 2 + (i % 3 - 1) * 0.2, sd, true));
  });
  const pyres = [[158, 86], [166, 94], [160, 104], [170, 110], [162, 120]].map(([dx, dz]) => J(dx, dz));
  st('pyres', false, (c) => { // the dead are laid on pyres on the beach with their weapons
    pyres.forEach(([x, z], i) => { const y = gy(x, z);
      for (let k = 0; k < 3; k++) for (let j = 0; j < 4 - k; j++) c.b.add(at(cyl(0.14, 0.16, 2.6, 6), x + (j - (3 - k) / 2) * 0.36, y + 0.16 + k * 0.3, z, Math.PI / 2, k % 2 ? 1.57 : 0, 0), M.bark);
      c.b.add(tint(at(capsule(0.24, 1.3, 6), x, y + 1.12, z, Math.PI / 2, 0, 0), 0xcfc6b0, 0.15, i), M.vcPlain); c.b.add(at(cyl(0.42, 0.42, 0.06, 12), x + 0.1, y + 1.4, z + 0.1), M.plank);
      c.addCircle(x, z, 1.5, 1.2); });
  });
  // ---- the harbour --------------------------------------------------------------------------
  const boats = [[234, -28.6], [244, -28.6], [254, -28.6]].map(([dx, dz]) => J(dx, dz));
  st('boats', false, (c, w, objs) => { boats.forEach(([x, z], i) => { const b = P.makeShip({ L: 6.4, B: 1.8, D: 0.62, rise: 0.7, seed: 41 + i }); b.position.set(x, -0.12, z); b.rotation.y = Math.PI / 2; objs.push(b); }); }); // three fishing boats at the pier
  const sr = J(252, -19.4);
  st('ship', false, (c, w, objs) => { // the Sea-Raven at Jarnøy's pier, and the two fishing boats that came with her
    const m = P.makeShip({ L: 20, B: 4.2, seed: 21, sail: false, mast: 9 }); m.position.set(sr[0], -0.15, sr[1]); m.rotation.y = Math.PI / 2; objs.push(m); w.addDeck({ x: sr[0], z: sr[1], yaw: Math.PI / 2, hw: 3.0, hl: 7.6, y: -0.15 + m.userData.deckY });
    for (const [dx, dz, ry] of [[224, -42, 0.5], [223, -50, 0.9]]) { const b = P.makeShip({ L: 6.4, B: 1.7, D: 0.62, rise: 0.75, seed: dx }), [x, z] = J(dx, dz); b.position.set(x, Math.max(-0.1, gy(x, z)), z); b.rotation.set(0.04, ry, 0.1); objs.push(b); }
  });
  // ---- King Hroald's hall: a hospital before the battle, a feast after it ------------------------
  const hall = J(78, -14), H = (lx, lz) => P.toWorld(hall[0], hall[1], 0.2, lx, lz);
  st('hospital', false, (c) => { // straw laid out for beds, linen boiling, honey, moss, yarrow and wine lined up for wounds (stand-in: before the doors, not inside)
    for (const lz of [11.5, 15]) for (let i = 0; i < 5; i++) { const [x, z] = H(-8 + i * 3, lz), y = gy(x, z); c.b.add(at(box(0.95, 0.2, 2.0), x, y + 0.1, z, 0, 0.2, 0), M.hay); c.b.add(tint(at(box(0.8, 0.05, 0.6), x, y + 0.23, z - 0.6, 0, 0.2, 0), 0xe8e2d2, 0.1, i), M.vcPlain); }
    const [fx, fz] = H(-12.5, 14); P.fireRing(c, fx, fz, 0.6); c.b.add(at(cyl(0.34, 0.28, 0.5, 9), fx, gy(fx, fz) + 0.55, fz), M.iron);
    table(c, ...H(9.5, 15), 0.2, 4);
  });
  st('jfeast', false, (c) => { table(c, ...H(-1, 12), 0.2, 9); table(c, ...H(-1, 17), 0.2, 9); P.barrel(c, ...H(-8, 14.5)); const [x, z] = H(7.5, 10); c.b.add(at(box(0.9, 0.55, 0.6), x, gy(x, z) + 0.28, z, 0, 0.2, 0), M.timber); c.b.add(tint(at(box(0.8, 0.1, 0.5), x, gy(x, z) + 0.58, z, 0, 0.2, 0), 0xd9b040, 0.15, 3), M.vcPlain); });
  return { id: 'jarnoy', s, stages, outer, sideGate: sg, ditch: dc, pyres, boats, ship: sr, hall, H, tower: world.realm.jarnoy.tower };
}
