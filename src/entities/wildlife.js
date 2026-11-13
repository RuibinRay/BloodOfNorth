// Wildlife (hares, deer, ravens, sheep) and arrows.
import * as THREE from 'three';
import { clamp, damp, dampAngle, angleDiff } from '../core/util.js';
import { M, at, box, cyl, cone, sphere, capsule, tint, merge } from '../world/geo.js';
import { heightAt } from '../world/terrain.js';
import { makeItem, dress } from './humanoid.js';

const _v = new THREE.Vector3(), _u = new THREE.Vector3();
// Every piece of an animal says what it is covered in (TEX.beast: see STUFF in geo.js); one that says nothing is plain.
const mesh = (geos) => { const m = new THREE.Mesh(merge(geos.map((g) => (g.attributes.cell ? g : dress(g, 'plain')))), M.beast); m.castShadow = true; return m; };
const pelt = (g) => dress(g, 'pelt'), coat = (g) => dress(g, 'coat'), fleece = (g) => dress(g, 'fleece'), feather = (g) => dress(g, 'feather'), mane = (g) => dress(g, 'mane');

function hareModel() {
  const g = new THREE.Group(), fur = 0x8a7a66;
  g.add(mesh([
    pelt(tint(at(sphere(0.14, 8, 6), 0, 0.16, 0, 0, 0, 0, 0.8, 0.85, 1.35), fur, 0.15, 1)),
    pelt(tint(at(sphere(0.08, 7, 5), 0, 0.27, 0.17), fur, 0.12, 2)),
    tint(at(capsule(0.018, 0.12, 4), 0.03, 0.4, 0.14, -0.25, 0, 0), 0x7a6a58, 0.1, 3), tint(at(capsule(0.018, 0.12, 4), -0.03, 0.4, 0.14, -0.25, 0, 0), 0x7a6a58, 0.1, 4),
    fleece(tint(at(sphere(0.045, 5, 4), 0, 0.19, -0.19), 0xe8e2d6, 0.05, 5)),
    tint(at(sphere(0.012, 4, 3), 0.045, 0.3, 0.22), 0x120c08, 0, 6), tint(at(sphere(0.012, 4, 3), -0.045, 0.3, 0.22), 0x120c08, 0, 7),
  ]));
  return g;
}
function deerModel(stag) {
  const g = new THREE.Group(), fur = 0x8c6a48, parts = [
    coat(tint(at(capsule(0.27, 0.72, 8), 0, 0.98, 0, Math.PI / 2, 0, 0, 1, 1, 1.05), fur, 0.1, 1)),
    coat(tint(at(capsule(0.1, 0.42, 6), 0, 1.32, 0.56, 0.75, 0, 0), fur, 0.1, 2)),
    coat(tint(at(sphere(0.12, 7, 6), 0, 1.6, 0.8, 0, 0, 0, 0.85, 0.9, 1.5), 0x9a7854, 0.08, 3)),
    fleece(tint(at(sphere(0.06, 5, 4), 0, 1.02, -0.66), 0xe8e0d0, 0.05, 4)),
    tint(at(cone(0.035, 0.14, 4), 0.09, 1.72, 0.72, -0.3, 0, -0.5), fur, 0.05, 5), tint(at(cone(0.035, 0.14, 4), -0.09, 1.72, 0.72, -0.3, 0, 0.5), fur, 0.05, 6),
    tint(at(sphere(0.016, 4, 3), 0.09, 1.63, 0.86), 0x120c08, 0, 7), tint(at(sphere(0.016, 4, 3), -0.09, 1.63, 0.86), 0x120c08, 0, 8),
  ];
  if (stag) for (const s of [-1, 1]) {
    parts.push(tint(at(cyl(0.012, 0.022, 0.5, 4), s * 0.12, 1.92, 0.7, -0.35, 0, -s * 0.45), 0xd8ccb0, 0.05, 9));
    parts.push(tint(at(cyl(0.008, 0.014, 0.22, 4), s * 0.2, 2.02, 0.76, 0.6, 0, -s * 0.2), 0xd8ccb0, 0.05, 10));
    parts.push(tint(at(cyl(0.008, 0.014, 0.2, 4), s * 0.17, 1.9, 0.82, 1.0, 0, -s * 0.1), 0xd8ccb0, 0.05, 11));
  }
  g.add(mesh(parts));
  g.userData.legs = [];
  for (const [x, z] of [[0.13, 0.36], [-0.13, 0.36], [0.13, -0.38], [-0.13, -0.38]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.86, z);
    leg.add(mesh([coat(tint(at(capsule(0.045, 0.72, 5), 0, -0.4, 0), 0x6e5238, 0.1, 12))]));
    g.add(leg); g.userData.legs.push(leg);
  }
  return g;
}
/** fur, low: the colour of his pelt, and of his legs, muzzle and tail (a hound is a wolf in brown). */
export function wolfModel(fur = 0x6e6e72, low = 0x5c5c60) {
  const g = new THREE.Group(), wild = fur === 0x6e6e72, pale = (hex) => (wild ? hex : fur);
  g.add(mesh([
    pelt(tint(at(capsule(0.18, 0.58, 8), 0, 0.6, 0, Math.PI / 2, 0, 0, 1, 1, 1.02), fur, 0.14, 1)),
    pelt(tint(at(sphere(0.22, 8, 6), 0, 0.61, 0.27, 0, 0, 0, 0.95, 1.08, 1.0), pale(0x747478), 0.14, 11)),   // a deep chest
    pelt(tint(at(sphere(0.2, 8, 6), 0, 0.6, -0.3, 0, 0, 0, 0.95, 1.0, 1.05), fur, 0.14, 12)),          // and lean haunches
    pelt(tint(at(sphere(0.2, 7, 5), 0, 0.7, 0.34, 0.3, 0, 0, 1.0, 1.1, 0.9), pale(0x77777b), 0.14, 10)),     // the ruff of his neck
    pelt(tint(at(sphere(0.15, 7, 6), 0, 0.8, 0.52, 0, 0, 0, 0.9, 0.92, 1.15), pale(0x7a7a7e), 0.1, 2)),
    coat(tint(at(cone(0.075, 0.26, 6), 0, 0.77, 0.76, Math.PI / 2, 0, 0, 1, 1, 0.8), wild ? 0x55555a : low, 0.08, 3)), // the muzzle
    coat(tint(at(box(0.07, 0.022, 0.18), 0, 0.715, 0.72, 0.12, 0, 0), 0x3c3c40, 0.05, 13)),             // the lower jaw, a little open
    tint(at(sphere(0.022, 5, 4), 0, 0.775, 0.885), 0x141416, 0, 14),                                      // the nose
    pelt(tint(at(cone(0.05, 0.15, 4), 0.085, 0.97, 0.47, -0.15, 0, -0.15), fur, 0.05, 4)), pelt(tint(at(cone(0.05, 0.15, 4), -0.085, 0.97, 0.47, -0.15, 0, 0.15), fur, 0.05, 5)),
    pelt(tint(at(capsule(0.075, 0.42, 6), 0, 0.5, -0.64, -0.9, 0, 0), low, 0.14, 6)),                     // a brush of a tail
    tint(at(sphere(0.016, 4, 3), 0.07, 0.85, 0.63), 0xd8b040, 0, 7), tint(at(sphere(0.016, 4, 3), -0.07, 0.85, 0.63), 0xd8b040, 0, 8),
  ]));
  g.userData.legs = [];
  for (const [x, z] of [[0.11, 0.32], [-0.11, 0.32], [0.11, -0.34], [-0.11, -0.34]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.52, z);
    leg.add(mesh([pelt(tint(at(capsule(0.056, 0.17, 5), 0, -0.1, 0), fur, 0.12, 9)), coat(tint(at(capsule(0.033, 0.22, 5), 0, -0.345, 0.01), low, 0.1, 15)), coat(tint(at(box(0.07, 0.04, 0.1), 0, -0.5, 0.025), 0x48484c, 0.05, 16))])); // thigh, shank, paw
    g.add(leg); g.userData.legs.push(leg);
  }
  return g;
}
/** hide, dark: the colour of his coat, and of his mane, tail and lower legs. */
export function horseModel(hide = 0x7a5636, dark = 0x2e2018) {
  const g = new THREE.Group();
  g.add(mesh([
    coat(tint(at(capsule(0.3, 0.96, 8), 0, 1.16, 0, Math.PI / 2, 0, 0, 1, 1, 1.05), hide, 0.1, 1)),
    coat(tint(at(sphere(0.34, 9, 7), 0, 1.2, 0.5, 0, 0, 0, 0.98, 1.06, 0.92), hide, 0.1, 10)),              // the chest
    coat(tint(at(sphere(0.36, 9, 7), 0, 1.22, -0.5, 0, 0, 0, 1.0, 1.04, 0.96), hide, 0.1, 11)),             // the quarters
    coat(tint(at(capsule(0.17, 0.56, 7), 0, 1.6, 0.74, 0.72, 0, 0, 0.85, 1, 1.15), hide, 0.1, 2)),          // the neck, deeper than it is wide
    coat(tint(at(sphere(0.15, 8, 6), 0, 1.97, 1.08, 0.55, 0, 0, 0.8, 0.9, 1.75), hide, 0.08, 3)),
    coat(tint(at(sphere(0.1, 7, 5), 0, 1.84, 1.29, 0.55, 0, 0, 0.85, 0.85, 1.2), hide === 0x7a5636 ? 0x5a3e28 : dark, 0.08, 12)), // the muzzle
    mane(tint(at(box(0.07, 0.62, 0.1), 0, 1.742, 0.579, 0.72, 0, 0), dark, 0.16, 4)),                         // the mane, lying along the crest of the neck
    mane(tint(at(box(0.07, 0.16, 0.12), 0, 2.07, 0.99, 0.9, 0, 0), dark, 0.16, 13)),                        // the forelock
    mane(tint(at(capsule(0.075, 0.66, 6), 0, 0.92, -0.9, -0.22, 0, 0), dark, 0.16, 5)),                     // the tail, hanging
    tint(at(cone(0.04, 0.13, 4), 0.08, 2.12, 0.98), hide, 0.05, 6), tint(at(cone(0.04, 0.13, 4), -0.08, 2.12, 0.98), hide, 0.05, 7),
    tint(at(sphere(0.022, 5, 4), 0.105, 2.0, 1.1), 0x120c08, 0, 14), tint(at(sphere(0.022, 5, 4), -0.105, 2.0, 1.1), 0x120c08, 0, 15),
    tint(at(box(0.56, 0.05, 0.62), 0, 1.5, -0.05), 0x7a2a22, 0.1, 16), tint(at(box(0.44, 0.1, 0.5), 0, 1.55, -0.05), 0x4a3424, 0.1, 8), // a blanket, and the saddle on it
  ]));
  g.userData.legs = [];
  for (const [x, z] of [[0.17, 0.52], [-0.17, 0.52], [0.17, -0.55], [-0.17, -0.55]]) {
    const leg = new THREE.Group(); leg.position.set(x, 1.0, z);
    leg.add(mesh([coat(tint(at(capsule(0.09, 0.34, 6), 0, -0.2, 0), hide, 0.1, 9)), coat(tint(at(capsule(0.046, 0.4, 5), 0, -0.68, 0), dark, 0.1, 17)), tint(at(cyl(0.06, 0.072, 0.09, 6), 0, -0.955, 0.01), 0x16110c, 0.05, 18)])); // thigh, cannon, hoof
    g.add(leg); g.userData.legs.push(leg);
  }
  return g;
}
function sheepModel() {
  const g = new THREE.Group();
  const parts = [fleece(tint(at(sphere(0.34, 8, 6), 0, 0.55, 0, 0, 0, 0, 0.9, 0.85, 1.3), 0xd8d2c2, 0.14, 1)), coat(tint(at(sphere(0.12, 6, 5), 0, 0.68, 0.45, 0, 0, 0, 0.8, 0.9, 1.3), 0x3a3028, 0.1, 2))];
  for (const [x, z] of [[0.14, 0.25], [-0.14, 0.25], [0.14, -0.25], [-0.14, -0.25]]) parts.push(tint(at(cyl(0.035, 0.035, 0.36, 4), x, 0.18, z), 0x3a3028, 0.05, 3));
  g.add(mesh(parts));
  return g;
}
/** A wing seen from above: broad at the body, narrowing to three spread fingers at the tip. side: +1 or -1. */
function wingGeo(side) {
  const pts = [[0.04, 0.09], [0.3, 0.11], [0.5, 0.07], [0.58, 0.03], [0.5, 0.0], [0.57, -0.04], [0.48, -0.05], [0.53, -0.1], [0.42, -0.1], [0.25, -0.14], [0.04, -0.12]];
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(side * x, -z)));
  return at(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }), 0, -0.006, 0, -Math.PI / 2, 0, 0); // flat in the air, a finger thick
}
export function ravenModel(col = 0x14141a, beak = 0x2a2a30) {
  const g = new THREE.Group(), eye = col > 0x808080 ? 0x2a2420 : 0x6a6a72;
  g.add(mesh([
    feather(tint(at(sphere(0.1, 7, 6), 0, 0, 0, 0, 0, 0, 0.78, 0.8, 1.8), col, 0.1, 1)),
    feather(tint(at(sphere(0.062, 7, 6), 0, 0.035, 0.17, 0, 0, 0, 0.95, 1, 1.1), col, 0.08, 5)),                     // the head
    tint(at(cone(0.024, 0.13, 5), 0, 0.022, 0.29, Math.PI / 2 + 0.12, 0, 0, 1, 1, 0.8), beak, 0, 2),                  // a heavy beak, turned down a little
    tint(at(sphere(0.011, 4, 3), 0.045, 0.055, 0.2), eye, 0, 6), tint(at(sphere(0.011, 4, 3), -0.045, 0.055, 0.2), eye, 0, 7),
    ...[-0.32, 0, 0.32].map((a, k) => feather(tint(at(box(0.055, 0.01, 0.26), Math.sin(a) * 0.12, -0.005 * k, -0.16 - Math.cos(a) * 0.12, 0, a, 0), col, 0.12, 8 + k))), // the tail, spread in a wedge
  ]));
  g.userData.wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group();
    w.add(mesh([feather(tint(wingGeo(s), col, 0.15, 4))]));
    g.add(w); g.userData.wings.push(w);
  }
  return g;
}
export class Wildlife {
  constructor(game) {
    this.game = game; this.animals = []; this.arrows = []; this.ravens = [];
    this.arrowGeo = merge([
      tint(at(cyl(0.008, 0.008, 0.62, 4), 0, 0, 0, Math.PI / 2, 0, 0), 0xcab890, 0.05, 1),
      tint(at(cone(0.02, 0.07, 4), 0, 0, 0.34, Math.PI / 2, 0, 0), 0x6a6e74, 0, 2),
      tint(at(box(0.05, 0.002, 0.12), 0, 0, -0.26), 0xe8e0d0, 0, 3), tint(at(box(0.002, 0.05, 0.12), 0, 0, -0.26), 0xe8e0d0, 0, 4),
    ]);
  }
  spawn(kind, x, z, opts = {}) {
    const model = kind === 'hare' ? hareModel() : kind === 'deer' ? deerModel(opts.stag) : kind === 'wolf' ? wolfModel() : sheepModel();
    const a = {
      kind, model, pos: model.position, yaw: Math.random() * 6.28, state: 'graze', t: Math.random() * 4, speed: 0,
      home: opts.home || { x, z, r: kind === 'deer' ? 16 : kind === 'hare' ? 14 : 3.2 }, dest: null, hp: kind === 'deer' ? 2 : 1, dead: false, harvested: false,
      alarm: 0, hop: Math.random() * 6, stag: !!opts.stag, tag: opts.tag,
    };
    a.pos.set(x, heightAt(x, z), z);
    this.game.scene.add(model);
    this.animals.push(a);
    return a;
  }
  remove(a) { this.game.scene.remove(a.model); const i = this.animals.indexOf(a); if (i >= 0) this.animals.splice(i, 1); }
  clear(kind) { for (const a of [...this.animals]) if (!kind || a.kind === kind) this.remove(a); }
  count(kind, alive = true) { return this.animals.filter((a) => a.kind === kind && (!alive || !a.dead)).length; }

  addRavens(cx, cz, n = 7, radius = 34, height = 26) {
    for (let i = 0; i < n; i++) {
      const m = ravenModel(); this.game.scene.add(m);
      this.ravens.push({ m, cx, cz, r: radius * (0.6 + Math.random() * 0.7), h: height + Math.random() * 10, a: Math.random() * 6.28, w: (0.16 + Math.random() * 0.1) * (i % 2 ? 1 : -1), ph: Math.random() * 6 });
    }
  }

  /** An arrow, or with opts.kind 'axe' a thrown axe (opts.dmg, opts.posture: what it does to a man). */
  shoot(origin, dir, speed, owner, opts = {}) {
    const m = opts.kind === 'axe' ? makeItem('throwaxe') : new THREE.Mesh(this.arrowGeo, M.vcPlain);
    m.position.copy(origin).addScaledVector(dir, 0.3);
    this.game.scene.add(m);
    this.arrows.push({ m, v: dir.clone().multiplyScalar(speed), stuck: false, life: 0, owner, in: null, off: null, kind: opts.kind || 'arrow', dmg: opts.dmg, posture: opts.posture, spin: 0, power: opts.power, perfect: !!opts.perfect });
  }

  hitAnimal(a, vital) {
    const g = this.game;
    if (a.dead) return;
    a.hp -= vital ? 2 : 1;
    g.audio.play('arrowHit');
    g.fx.burst('blood', a.pos.x, a.pos.y + (a.kind === 'deer' ? 1 : 0.2), a.pos.z, 6);
    if (a.hp <= 0) {
      a.dead = true; a.state = 'dead'; a.speed = 0;
      g.events.emit('kill', a.kind, a, vital);
    } else { a.state = 'flee'; a.alarm = 6; a.wounded = true; g.events.emit('wound', a.kind, a); }
  }

  update(dt) {
    const g = this.game, p = g.player, world = g.world;
    // ---- animals ----
    for (const a of this.animals) {
      if (a.dead) {
        a.model.rotation.z = damp(a.model.rotation.z, Math.PI / 2, 6, dt);
        a.pos.y = damp(a.pos.y, heightAt(a.pos.x, a.pos.z) + (a.kind === 'deer' ? 0.28 : 0.1), 6, dt);
        continue;
      }
      if (a.ai) { // scripted animals (the wolf) drive themselves
        a.ai(a, dt);
        a.hop += dt * (4 + a.speed * 2.2);
        a.pos.y = heightAt(a.pos.x, a.pos.z);
        const lg = a.model.userData.legs;
        if (lg) { const s = Math.sin(a.hop) * clamp(a.speed / 5, 0, 0.9); lg[0].rotation.x = s; lg[1].rotation.x = -s; lg[2].rotation.x = -s; lg[3].rotation.x = s; }
        a.model.rotation.y = a.yaw;
        continue;
      }
      const dx = a.pos.x - p.pos.x, dz = a.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      const fearR = a.kind === 'sheep' ? 0 : (a.kind === 'deer' ? 1.55 : 1) * (p.crouch ? (p.moving ? 5.2 : 3.6) : p.sprinting ? 16 : p.moving ? 11 : 8);
      a.t -= dt;
      if (a.state !== 'flee' && d < fearR) { a.state = 'flee'; a.alarm = 3.5 + Math.random() * 2; g.events.emit('spook', a.kind, a); }
      let want = 0;
      if (a.state === 'flee') {
        a.alarm -= dt;
        // run away from the player but bend back toward home so the herd stays findable
        let fx = dx / (d || 1), fz = dz / (d || 1);
        const hx = a.home.x - a.pos.x, hz = a.home.z - a.pos.z, hd = Math.hypot(hx, hz);
        if (hd > a.home.r * 2.2) { fx += (hx / hd) * 1.4; fz += (hz / hd) * 1.4; }
        a.yaw = dampAngle(a.yaw, Math.atan2(fx, fz), 7, dt);
        want = (a.kind === 'deer' ? 9.5 : 6.5) * (a.wounded ? 0.6 : 1);
        if (a.alarm <= 0 && d > fearR * 1.5) { a.state = 'graze'; a.t = 2 + Math.random() * 3; a.dest = null; }
      } else if (a.dest) {
        const tx = a.dest.x - a.pos.x, tz = a.dest.z - a.pos.z, td = Math.hypot(tx, tz);
        if (td < 0.6) { a.dest = null; a.t = 2 + Math.random() * 5; }
        else { a.yaw = dampAngle(a.yaw, Math.atan2(tx, tz), 4, dt); want = a.kind === 'hare' ? 2.2 : 1.1; }
      } else if (a.t <= 0) {
        const ang = Math.random() * 6.28, r = Math.random() * a.home.r;
        a.dest = { x: a.home.x + Math.cos(ang) * r, z: a.home.z + Math.sin(ang) * r };
      }
      a.speed = damp(a.speed, want, 6, dt);
      if (a.speed > 0.05) {
        const px = a.pos.x, pz = a.pos.z;
        a.pos.x += Math.sin(a.yaw) * a.speed * dt; a.pos.z += Math.cos(a.yaw) * a.speed * dt;
        world.resolve(a.pos, a.kind === 'deer' ? 0.5 : 0.2);
        if (!world.walkable(a.pos.x, a.pos.z)) { a.pos.x = px; a.pos.z = pz; a.yaw += 2.2; }
      }
      a.hop += dt * (4 + a.speed * 2.2);
      const ground = heightAt(a.pos.x, a.pos.z);
      if (a.kind === 'hare') {
        a.pos.y = ground + (a.speed > 0.2 ? Math.abs(Math.sin(a.hop)) * 0.16 * Math.min(1, a.speed / 2) : 0);
        a.model.rotation.x = a.speed > 0.2 ? Math.cos(a.hop) * -0.25 : 0;
      } else {
        a.pos.y = ground;
        const legs = a.model.userData.legs;
        if (legs) { const s = Math.sin(a.hop) * clamp(a.speed / 5, 0, 0.9); legs[0].rotation.x = s; legs[1].rotation.x = -s; legs[2].rotation.x = -s; legs[3].rotation.x = s; }
        if (a.kind === 'deer') a.model.children[0].rotation.x = a.state === 'graze' && !a.dest && a.speed < 0.1 ? damp(a.model.children[0].rotation.x, 0.0, 3, dt) : 0;
      }
      a.model.rotation.y = a.yaw;
    }
    // ---- ravens ----
    for (const r of this.ravens) {
      r.a += r.w * dt; r.ph += dt * 9;
      const x = r.cx + Math.cos(r.a) * r.r, z = r.cz + Math.sin(r.a) * r.r;
      r.m.position.set(x, heightAt(r.cx, r.cz) + r.h + Math.sin(r.a * 3) * 2, z);
      r.m.rotation.y = Math.atan2(-Math.sin(r.a) * Math.sign(r.w), Math.cos(r.a) * Math.sign(r.w));
      const flap = Math.sin(r.ph) * 0.7;
      r.m.userData.wings[0].rotation.z = flap; r.m.userData.wings[1].rotation.z = -flap;
    }
    // ---- arrows ----
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const ar = this.arrows[i];
      ar.life += dt;
      if (ar.stuck) {
        if (ar.in && !ar.in.harvested) { ar.m.position.copy(ar.in.pos).add(ar.off); }
        const d = ar.m.position.distanceTo(p.pos);
        if ((d < 1.3 && ar.life > 0.8 && !ar.in) || ar.life > 90 || (ar.in && ar.in.harvested)) {
          if (d < 1.3 && !ar.in) { g.inventory.add(ar.kind === 'axe' ? 'throwaxe' : 'arrow', 1, true); g.audio.play('pickup', { vol: 0.5 }); }
          g.scene.remove(ar.m); this.arrows.splice(i, 1);
        }
        continue;
      }
      const steps = 3, sdt = dt / steps;
      for (let s = 0; s < steps && !ar.stuck; s++) {
        ar.v.y -= 6.5 * sdt;
        ar.m.position.addScaledVector(ar.v, sdt);
        const pos = ar.m.position;
        _v.copy(pos).add(ar.v); ar.m.lookAt(_v);
        if (ar.owner === p && s === 0) { const tr = g.fx.trailFor(ar); if (tr) { _v.set(pos.x, pos.y + 0.03, pos.z); _u.set(pos.x, pos.y - 0.03, pos.z); if (ar.perfect) tr.add(_v, _u, 1, 0.85, 0.5, 0.75); else tr.add(_v, _u, 0.9, 0.92, 1, 0.3 + (ar.power || 0.5) * 0.25); } } // a thread of air behind it
        if (ar.kind === 'axe') ar.m.rotateX((ar.spin += sdt * 17)); // it turns in the air
        for (const a of this.animals) {
          if (a.dead) continue;
          const big = a.kind === 'deer';
          const mid = a.kind === 'sheep' || a.kind === 'wolf';
          const cy = a.pos.y + (big ? 1.0 : mid ? 0.6 : 0.2), rad = big ? 0.62 : mid ? 0.5 : 0.33;
          let hit = Math.hypot(pos.x - a.pos.x, pos.y - cy, pos.z - a.pos.z) < rad, vital = false;
          if (big && !hit) { // head / neck: a clean kill
            const hx = a.pos.x + Math.sin(a.yaw) * 0.7, hz = a.pos.z + Math.cos(a.yaw) * 0.7;
            if (Math.hypot(pos.x - hx, pos.y - (a.pos.y + 1.5), pos.z - hz) < 0.34) { hit = true; vital = true; }
          }
          if (hit) {
            if (a.kind === 'sheep') { g.ui.toast("Those are Gunnar's sheep!"); a.state = 'flee'; a.alarm = 3; ar.stuck = true; ar.life = 85; break; }
            ar.stuck = true; ar.in = a; ar.off = pos.clone().sub(a.pos); ar.life = 0;
            this.hitAnimal(a, vital);
            if (ar.owner === p) { g.ui.hitMark(vital ? 'head' : a.dead ? 'kill' : ''); g.fx.burst('blood', pos.x, pos.y, pos.z, 4); }
            break;
          }
        }
        if (!ar.stuck && g.combat.active) for (const e of g.combat.alive()) { // arrows hurt people too
          const top = 1.9 * e.h.scale;
          if (Math.hypot(pos.x - e.pos.x, pos.z - e.pos.z) < 0.45 && pos.y > e.pos.y && pos.y < e.pos.y + top) {
            const head = pos.y > e.pos.y + top * 0.8, mine = ar.owner === p;
            ar.stuck = true; ar.life = 89; g.audio.play('arrowHit');
            if (ar.kind === 'axe') { ar.m.visible = false; if ((e.cb.state === 'windup' || e.cb.state === 'strike') && !e.cb.boss) { e.cb.state = 'recover'; e.cb.t = 0.9; e.h.action = null; } g.audio.play('thud', { vol: 0.6 }); g.hitStop = 0.05; }
            else { // the arrow stays in him, and goes where he goes
              ar.m.position.addScaledVector(ar.v, -0.004); e.root.attach(ar.m); (e.quills || (e.quills = [])).push(ar.m); if (e.quills.length > 5) e.root.remove(e.quills.shift()); ar.gone = true;
              g.fx.flare(pos.x, pos.y, pos.z, head ? 1.2 : 0.7, 1, 0.9, 0.8, 0.08); g.fx.burst('blood', pos.x, pos.y, pos.z, head ? 10 : 5); g.hitStop = Math.max(g.hitStop || 0, head ? 0.06 : 0.03);
            }
            const pw = ar.power != null ? (0.7 + 0.45 * ar.power) * (ar.perfect ? 1.25 : 1) : 1; // a full draw hits harder; a perfect loose harder still
            g.combat.hurt(e, ar.dmg ?? (head ? 60 : 28) * pw * (g.skills.has('h_broad') ? 1.4 : 1), ar.posture ?? 20);
            if (mine) { g.ui.hitMark(e.dead || !e.cb || e.cb.out ? 'kill' : head ? 'head' : ''); if (head) g.audio.play('clack', { vol: 0.7 }); }
            break;
          }
        }
        if (ar.stuck) break;
        if (pos.y < heightAt(pos.x, pos.z) + 0.02) { ar.stuck = true; ar.life = 0; g.audio.play('arrowHit', { vol: 0.35 }); g.events.emit('arrowLand', pos); break; }
        if (pos.y < heightAt(pos.x, pos.z) + 7) {
          _v.copy(pos); const bx = pos.x, bz = pos.z;
          world.resolve(_v, 0.03);
          if (Math.hypot(_v.x - bx, _v.z - bz) > 0.001) { ar.stuck = true; ar.life = 0; g.audio.play('arrowHit', { vol: 0.6 }); g.events.emit('arrowHit', pos); break; }
        }
      }
      if (ar.gone) { this.arrows.splice(i, 1); continue; }
      if (ar.life > 8 && !ar.stuck) { g.scene.remove(ar.m); this.arrows.splice(i, 1); }
    }
  }
}
