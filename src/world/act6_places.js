// What Act VI adds to places that are already on the map (docs/story, Act VI). On Myrholm: the cage where the
// queen holds Astrid, Leif and Ingrid, and what the white raven finds (a camp, a trail, a boat under cut branches,
// Eydis's own camp, a tripwire). On Skalløy: the Sea-Raven at the pier, the lump of sky-iron, the ships that bring
// Bersi, the funeral boat, and a rail of stone along the quarry's edge. At Ravenhold: the sail-cloth roof over the
// war council, King Hroald's tent, the wedding's mead. Everything is a procedural stand-in for real art, and
// everything here is a stage (see mainland.js): it is there only while the story is.
import { M, at, box, cyl, cone, sphere, tint } from './geo.js';
import { heightAt } from './terrain.js';
import * as P from './props.js';
import { GREAT, MAIN } from './layout.js';
import { stage } from './mainland.js';

const gy = heightAt;
const SR = { L: 20, B: 4.2, seed: 21, mast: 9, sail: false };
/** A cage of upright logs, open to the sky. */
function cage(c, x, z, h = 1.7) {
  const y = gy(x, z);
  for (let i = 0; i <= 8; i++) for (const [dx, dz] of [[-h + i * h / 4, -h], [-h + i * h / 4, h], [-h, -h + i * h / 4], [h, -h + i * h / 4]]) c.b.add(at(cyl(0.07, 0.08, 2.4, 5), x + dx, y + 1.2, z + dz), M.bark);
  for (const [dx, dz, lx, lz] of [[0, -h, h * 2 + 0.3, 0.14], [0, h, h * 2 + 0.3, 0.14], [-h, 0, 0.14, h * 2 + 0.3], [h, 0, 0.14, h * 2 + 0.3]]) { c.b.add(at(box(lx, 0.14, lz), x + dx, y + 2.3, z + dz), M.timber); c.addBox(x + dx, z + dz, lx / 2, lz / 2, 0, 2.4); }
  return { x, z, y, front: [x, z + h + 1.6] };
}

function myr(world, scene) {
  const s = GREAT.find((g) => g.id === 'myrholm'), X = (dx, dz) => [s.x + dx, s.z + dz];
  const st = stage(world, scene, false, (c, w, objs) => {
    const cg = cage(c, ...X(-32, -40));
    // a camp where someone has been watching the queen's hall
    const cp = X(-52, 36); P.leanTo(c, cp[0], cp[1], -0.9); P.fireRing(c, cp[0] + 2.6, cp[1] - 1.4, 0.5);
    c.b.add(tint(at(box(1.8, 0.05, 0.8), cp[0] + 0.4, gy(...cp) + 0.05, cp[1] + 0.3, 0, 0.5, 0), 0x4a4434, 0.2, 2), M.vcPlain);
    // a trail of trampled reeds
    const tr = X(-40, 90);
    for (let i = 0; i < 9; i++) { const x = tr[0] - i * 2.1 + Math.sin(i) * 0.8, z = tr[1] + i * 3.4; c.b.add(tint(at(box(1.5, 0.04, 2.6), x, Math.max(-0.3, gy(x, z)) + 0.05, z, 0, 0.5 + i * 0.1, 0), 0x5a5630, 0.25, i), M.vcPlain); }
    // a boat hidden under cut branches, on the west channel
    const bt = X(-116, 98), b = P.makeShip({ L: 6.2, B: 2.1, D: 0.5, rise: 0.4, sail: false, shields: false, seed: 31 }); b.position.set(bt[0], -0.1, bt[1]); b.rotation.y = 0.5; objs.push(b);
    for (let i = 0; i < 9; i++) c.b.add(tint(at(cone(0.5, 2.2, 5), bt[0] - 2 + i * 0.5, 0.55 + (i % 3) * 0.12, bt[1] - 1 + (i % 4) * 0.6, 1.35, i * 0.8, 0.2), 0x3e4a26, 0.25, i), M.vcPlain);
    // a tripwire, where Astrid finds it
    const tw = X(-52, 160);
    for (const k of [-1, 1]) c.b.add(at(cyl(0.03, 0.04, 0.5, 4), tw[0] + k * 1.6, Math.max(-0.3, gy(tw[0] + k * 1.6, tw[1])) + 0.2, tw[1]), M.bark);
    c.b.add(tint(at(box(3.2, 0.012, 0.012), tw[0], Math.max(-0.3, gy(...tw)) + 0.3, tw[1]), 0x8a7a5a, 0.1, 1), M.vcPlain);
    // Eydis's camp, on the one dry rise west of the tower
    const ec = X(-100, 196); P.leanTo(c, ec[0], ec[1], 1.5); P.crate(c, ec[0] + 1.8, ec[1] + 1.2, 0.3, 0.7); P.fireRing(c, ec[0] + 3, ec[1] - 1.6, 0.5);
    for (let i = 0; i < 5; i++) c.b.add(at(cyl(0.015, 0.02, 1.7, 4), ec[0] - 1 + i * 0.1, gy(...ec) + 0.8, ec[1] + 2.2, 0.25, 0, 0.1 * i), M.bark); // a bundle of javelins
    return { cage: cg, camp: cp, trail: tr, boat: bt, wire: tw, ecamp: [ec[0] + 2.6, ec[1] + 1.6] };
  });
  return { id: 'myr6', s, X, st, hall: X(6, -36), landing: X(34, -212), gest: X(67.6, -58), join: X(-8, 14), peat: X(170, -70), leech: X(150, -58), from: X(-34, 146), ground: X(-58, 172), tower: X(-70, 186), mire: X(-69, 195), archers: [X(-40, 198), X(-96, 172)] };
}

function skal(world, scene) {
  const s = GREAT.find((g) => g.id === 'skalloy'), X = (dx, dz) => [s.x + dx, s.z + dz];
  const ship = stage(world, scene, false, (c, w, objs) => { // the Sea-Raven at the pier
    const [x, z] = X(-224, -39.4), m = P.makeShip(SR); m.position.set(x, -0.15, z); m.rotation.y = Math.PI / 2; objs.push(m); w.addDeck({ x, z, yaw: Math.PI / 2, hw: 2.2, hl: 7.6, y: -0.15 + m.userData.deckY });
  });
  const iron = stage(world, scene, false, (c) => { // a lump of black, heavy iron that fell from the sky in a fireball
    const [x, z] = X(-5, -25.4), y = gy(x, z);
    c.b.add(at(cyl(0.34, 0.38, 0.55, 8), x, y + 0.27, z), M.bark); c.b.add(tint(at(sphere(0.24, 6, 5), x, y + 0.7, z, 0.3, 0.6, 0, 1.2, 0.8, 1), 0x0e0e12, 0.25, 4), M.vcPlain); c.addCircle(x, z, 0.5, 1);
    return { x, z };
  });
  const raiders = stage(world, scene, false, (c, w, objs) => { // eighty of Håkon's toughest, with axes, iron bars and buckets of pitch
    for (const [dx, dz, ry, sd] of [[-238, -8, 1.8, 161], [-234, -62, 1.4, 163]]) { const m = P.makeShip({ L: 21, B: 4.4, seed: sd, sail: false }); const [x, z] = X(dx, dz); m.position.set(x, -0.15, z); m.rotation.y = ry; objs.push(m); }
  });
  const pyre = stage(world, scene, false, (c, w, objs) => { // a small boat dragged up onto the beach and filled with dry wood
    const [x, z] = X(-204, 2), y = gy(x, z), b = P.makeShip({ L: 6.4, B: 2.1, D: 0.6, rise: 0.6, sail: false, shields: false, seed: 44 }); b.position.set(x, y + 0.15, z); b.rotation.y = 0.3; objs.push(b);
    for (let i = 0; i < 7; i++) c.b.add(at(cyl(0.09, 0.1, 1.9, 5), x - 0.5 + (i % 3) * 0.5, y + 0.5 + (i % 2) * 0.16, z - 1 + i * 0.3, Math.PI / 2, 0.3 + (i % 2) * 0.3, 0), M.bark);
    c.b.add(at(box(0.22, 0.2, 0.16), x + 0.3, y + 0.95, z + 1.5), M.iron); // a little anvil at his feet
    c.addCircle(x, z, 1.5, 1.4);
    return { x, z, y, front: [x + 3.4, z + 1.4] };
  });
  const q = X(158, 62);
  const rail = stage(world, scene, false, (c) => { c.addBox(q[0] + 23.5, q[1], 0.5, 22, 0, 6); c.addBox(q[0] + 8, q[1] - 22, 16, 0.5, 0, 6); c.addBox(q[0] + 8, q[1] + 22, 16, 0.5, 0, 6); }); // nobody walks off the cliff by accident
  return { id: 'skal6', s, X, ship, iron, raiders, pyre, rail, pier: X(-204, -34), harbor: X(-150, -27), forge: X(-10, -22), door: X(-2.6, -22), anvil: X(-9.8, -21.4), hall: X(-58, 86), hallFront: X(-52, 96), lanes: [X(-136, -30), X(-122, -14), X(-106, -24)], from: [X(-166, -30), X(-160, -14)], street: X(-30, -20), quarry: q, ledge: q[0] + 14, edge: q[0] + 19 };
}

function home(world, scene) {
  const s = MAIN.find((m) => m.id === 'bjornstead'), B = (dx, dz) => [s.x + dx, s.z + dz];
  const roof = stage(world, scene, false, (c) => { // Ravenhold's longhouse is too small, so they meet in a field under a sail-cloth roof
    const [x, z] = B(76, 132), y = gy(x, z);
    for (const dx of [-8, 0, 8]) for (const dz of [-5, 5]) { c.b.add(at(cyl(0.1, 0.12, 4, 6), x + dx, y + 2, z + dz), M.bark); c.addCircle(x + dx, z + dz, 0.2, 4); }
    for (const k of [-1, 1]) c.b.add(tint(at(box(8.3, 0.05, 10.6), x + k * 4.1, y + 3.82, z, 0, 0, k * 0.07), k > 0 ? 0xd8d2bc : 0xb8423a, 0.12, 3 + k), M.vcPlain); // red and white, like a sail
    const [tx, tz] = [x, z - 2.4];
    c.b.add(at(box(2.6, 0.1, 1.4), tx, y + 0.8, tz), M.plank); for (const k of [-1, 1]) c.b.add(at(box(0.12, 0.8, 1.2), tx + k * 1.1, y + 0.4, tz), M.timber); c.addBox(tx, tz, 1.3, 0.7, 0, 0.9);
    c.b.add(tint(at(box(2.2, 0.02, 1.1), tx, y + 0.87, tz), 0xd8d2bc, 0.1, 5), M.vcPlain); // the secret channels, in charcoal on sail-cloth
    for (let i = 0; i < 6; i++) c.b.add(tint(at(box(0.5 + (i % 3) * 0.3, 0.012, 0.03), tx - 0.7 + (i % 3) * 0.6, y + 0.885, tz - 0.3 + (i % 2) * 0.5, 0, i * 0.7, 0), 0x1a1612, 0.1, i), M.vcPlain);
    return { x, z, table: [tx, tz + 1.5] };
  });
  const tent = stage(world, scene, false, (c) => { // King Hroald's tent
    const [x, z] = B(98, 150), y = gy(x, z);
    c.b.add(tint(at(cone(2.9, 3.4, 4), x, y + 1.7, z, 0, Math.PI / 4, 0), 0xc9bfa4, 0.12, 6), M.vcPlain); c.b.add(at(box(0.9, 1.7, 0.1), x - 2.06, y + 0.85, z, 0, Math.PI / 2, 0), M.dark); c.addCircle(x, z, 2.2, 3);
    return { x, z, door: [x - 3.4, z] };
  });
  const mead = stage(world, scene, false, (c) => { for (const [dx, dz] of [[9, 126], [10.2, 126.6], [9.4, 127.8], [10.8, 128], [11.6, 126.4]]) P.barrel(c, ...B(dx, dz)); }); // a month's worth of mead
  return { id: 'home6', B, roof, tent, mead };
}

export function buildAct6Places(ctx, world, scene) {
  return { myr6: myr(world, scene), skal6: skal(world, scene), home6: home(world, scene) };
}
