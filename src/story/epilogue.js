// The Epilogue, "The Old Birch", as the owner's story tells it: twelve years later. Ravenhold (the harbor and the
// market, the row of carved stones, Halvar and the Thing-Ring, the people the war left); Leif's House (Liv, the
// dice, the Twins on the wall); The Last Lesson (the walk up the hill with Little Brokk, Bjorn's mound, the young
// raven with one white feather, and the view rising over the town and out to sea). Nothing is fought.
// The places are in world/epilogue_places.js; the words in data/epilogue.js. See act2.js for what the mainland acts share.
import * as THREE from 'three';
import { ravenModel } from '../entities/wildlife.js';
import { makeItem } from '../entities/humanoid.js';
import { EIRIK_ADULT } from '../entities/player.js';
import { E8, CAST8, EIRIK_41, HARBOR, STONE_LINES, LIV_LINES, WALK, LESSON_LINES, RAVENS, HOME, FINALE } from '../data/epilogue.js';
import { DAY } from './act2.js';
import { A7Part } from './act7_sea.js';

export const E8P = ['e8morn', 'e8noon', 'e8eve'];
const FOLK = { svanhild: 'svanhild', astrid: 'astrid', heal: 'hrefna', hall: 'signe', goat: 'hallvard' }; // the five to see, and who stands for each on the map
const WHO = { svanhild: 'svanhild', astrid: 'astrid', kari: 'astrid', karison: 'astrid', hrefna: 'heal', ingrid: 'heal', signe: 'hall', freydis: 'hall', lbrokk: 'hall', leif: 'goat', hallvard: 'goat', j0: 'svanhild', j1: 'svanhild', j2: 'svanhild', j3: 'svanhild' };
const SAYS = { svanhild: 'e8_svanhild', astrid: 'e8_astrid', heal: 'e8_heal', hall: 'e8_hall', goat: 'e8_goat' };
const TRADERS = ['A trader from Wessex', 'A Frisian trader', 'A trader from Dublin', 'A trader from the eastern rivers'];
const _v = new THREE.Vector3();
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const ease = (k) => k * k * (3 - 2 * k);

export class E8Part extends A7Part {
  constructor(game, core) { super(game, core); this.fires = []; }
  get E() { return this.g.world.main.e8; }
  B(dx, dz) { return this.c.B(dx, dz); }
  get seen() { return this.st.flags.e8seen || (this.st.flags.e8seen = []); }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world;
    for (const id in CAST8) { const n = g.addNPC(id, CAST8[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    // the young raven, black but for one white feather; and the old black raven who will not leave the birch
    this.young = ravenModel(0x14141a); this.young.scale.setScalar(1.05); this.young.visible = false; g.scene.add(this.young);
    { const f = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.016, 0.07), new THREE.MeshLambertMaterial({ color: 0xf2efe8 })); f.position.set(0.32, 0.006, 0.03); this.young.userData.wings[1].add(f); }
    this.old = ravenModel(0x14141a); this.old.scale.setScalar(1.25); this.old.visible = false; g.scene.add(this.old);
    // the Thing-Ring on Halvar's anvil, and Brokk's forging hammer above the door
    const F = c.W.stages.forge2, ax = F.anvil.x, az = F.anvil.z, ay = w.groundAt(ax, az) + 0.77;
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.034, 8, 22), new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.9, roughness: 0.3, emissive: 0x3a2a08 }));
    this.ring.rotation.x = Math.PI / 2; this.ring.position.set(ax, ay, az); this.ring.visible = false; g.scene.add(this.ring);
    // the smithy is open on its west side, toward the yard
    this.hammer = makeItem('hammer'); this.hammer.scale.setScalar(1.5); this.hammer.rotation.set(-Math.PI / 2, 0, 0); this.hammer.position.set(ax - 1.8, w.groundAt(ax, az) + 2.25, az + 0.6); this.hammer.visible = false; g.scene.add(this.hammer);
    w.addInteractable({ id: 'e8kneel', pos: () => { const s = this.E.birch.stone; return { x: s.x + 0.9, z: s.z + 0.9 }; }, x: 0, z: 0, r: 2.6, priority: 3, label: 'Kneel beside the young raven', enabled: () => q.at('q_lesson', 'home') && this.landed && !this.busy, use: () => this.playHome() });
  }
  clear(phase) {
    const g = this.g, c = this.c, p = g.player, on = E8P.includes(phase), E = this.E, S = c.W.stages;
    E.town.set(on); E.home.set(on); E.birch.set(on);
    for (const id in CAST8) c.npc(id).visible = false;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    this.young.visible = this.old.visible = this.ring.visible = this.hammer.visible = on;
    g.sky.fogMul = 1; this.busy = false; this.stonesOn = false; this.livOn = false; this.drop = null; this.flight = null; this.landed = false; this.fall = null; this.cawT = 0;
    if (on) {
      this.town12();
      c.act.glowTarget = phase === 'e8eve' ? 0.15 : 0; if (g.combat.active) g.combat.clear(); c.battle.sk = null;
      g.ravens.setMode('hidden'); this.hid = true; // the white raven died last winter; the black one will not leave the birch
      p.mortal = false;
      if (!this.aged) { this.aged = true; p.setLook(EIRIK_41, true); p.showBackAxe(g.inventory.has('father_axe')); }
      this.young.position.copy(this.at7(E.birch.branch)); this.young.rotation.set(0, 2.4, 0); this.youngWings(1.3);
      this.old.position.copy(this.at7(E.birch.perch)); this.old.rotation.set(0, -0.6, 0); for (const [i, s] of [[0, 1], [1, -1]]) this.old.userData.wings[i].rotation.z = 1.3 * s;
    } else if (this.aged) { this.aged = false; p.setLook(EIRIK_ADULT, true); }
    if (!on && this.hid) { this.hid = false; g.ravens.setMode('follow'); }
  }
  /** Ravenhold as twelve years have left it (Act2.applyWorld calls this whenever the Epilogue has begun, so a step that sets the world again keeps it). */
  town12() {
    const S = this.c.W.stages, H6 = this.g.world.main.home6;
    S.fleet.set(false); S.refugees.set(false); S.cell.set(false); S.burnt.set(false); S.ditch.set(false); // the war fleet has gone home; the ditch and its stakes are filled in; the palisade still stands
    S.market.set(true); S.heal.set(true); S.butts.set(true); S.searaven.set(true); S.ware.set(true); H6.roof.set(false); H6.tent.set(false);
  }
  at7(o) { return _v.set(o.x, o.y, o.z); }
  youngWings(a) { const W = this.young.userData.wings; W[0].rotation.z = a; W[1].rotation.z = -a; }
  fire(x, y, z, s) { const f = this.g.fx.addFire(x, y, z, s); this.fires.push(f); return f; }
  /** Stand someone at an offset from Bjornstead's centre. */
  at2(id, dx, dz, face, loop, hold) { const [x, z] = this.B(dx, dz); return this.put(id, x, z, Array.isArray(face) ? this.B(face[0], face[1]) : face, loop, hold); }

  /** Who is where in Ravenhold: in the morning, at midday, and in the evening. */
  dress(name) {
    const g = this.g, c = this.c, w = g.world, rv = this.at('q_ravenhold'), T = c.sea.town, J = c.battle.jarn, H = E8.house, F = c.W.stages.forge2;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    const go = c.goat, [gx, gz] = this.B(-92, 96); go.loose = false; go.roof = false; go.to = null; go.m.visible = true; go.pos.set(gx, w.groundAt(gx, gz), gz); go.m.rotation.set(0, 1.2, 0);
    c.cook.on = true;
    // the village, as on any day (Bjorn and Grjotgard are in their graves)
    const evening = name === 'e8eve';
    for (const id in DAY) {
      if (['bjorn', 'grjotgard', 'hauk', 'signe', 'freydis', 'lawman'].includes(id) || id.startsWith('kid')) continue;
      const d = DAY[id]; c.post(id, evening ? [d[0], d[1], d[2], /^v[0-9]$/.test(id) && +id[1] % 2 ? 'sit' : null] : d);
    }
    c.post('signe', [-2.5, 122.6, [-2.5, 126], evening ? null : 'cook']); c.post('freydis', [-0.6, 124.2, [-2.5, 124.6], 'talk']);
    // Halvar at Brokk's old forge, and his apprentice
    this.fire(F.forge.x, F.forge.y, F.forge.z, 0.45);
    if (!evening) { const n = this.put('halvar', F.anvil.x - 1.0, F.anvil.z + 0.2, [F.anvil.x, F.anvil.z], rv === 2 ? null : 'hammer', 'hammer'); n.talk = () => c.talkTo('halvar');
      this.put('apprentice', F.anvil.x - 0.1, F.anvil.z - 1.1, [F.anvil.x, F.anvil.z], 'hammer', 'hammer'); }
    if (evening) { // the fish-seller and the iron-merchant drink together; the children share bread by the stream; a fence is mended
      this.at2('fishseller', 0, 119.2, 0, 'sit').h.hold('R', 'cup'); this.at2('ironman', 1.3, 119.2, 0, 'sit').h.hold('R', 'cup');
      const [sx, sz] = E8.stream; ['kid0', 'kid1', 'kid2', 'kid3', 'kid4', 'kid5'].forEach((id, i) => { const a = (i / 6) * 6.283; const n = this.at2(id, sx + Math.cos(a) * 1.4, sz + Math.sin(a) * 1.1, [sx, sz], 'kneel'); n.held = true; if (i === 2) n.h.hold('R', 'loaf'); });
      const [fx, fz] = E8.fence; this.at2('farmer1', fx + 0.4, fz - 0.9, [fx + 0.4, fz], 'hammer', 'hammer'); this.at2('farmer2', fx - 0.8, fz - 1.0, [fx + 0.4, fz], 'talk');
      this.fire(...((q) => [q[0], w.groundAt(...q) + 0.15, q[1]])(this.B(3.5, 126.4)), 0.5);
      if (this.at('q_lesson') >= 0) { const b = this.put('lbrokk', g.player.pos.x + 1.2, g.player.pos.z + 0.8, g.player.yaw); b.h.hold('R', 'toyaxe'); b.talk = () => c.talkTo('lbrokk'); if (this.at('q_lesson') === 0) b.follow(g.player, { dist: 1.7 }); }
      c.post('hauk', [58, 127, 1.2, 'sit']);
      return;
    }
    // the market: the fish-seller and the iron-merchant argue over prices; traders from four coasts
    this.at2('fishseller', 2.4, 190.4, [4.2, 190.4], 'talk'); this.at2('ironman', 4.2, 190.4, [2.4, 190.4], 'talk');
    [[-24, 209.6], [-13, 211.2], [14, 211.6], [25, 210.2]].forEach(([dx, dz], i) => { const n = this.at2(T[i], dx, dz, [dx, dz + 3], i % 2 ? 'talk' : null); n.name = TRADERS[i]; n.talk = () => n.say('...', 2); });
    T.slice(4, 8).forEach((n, i) => { const m = this.at2(n, -6 + i * 4, 194 + (i % 2) * 3, [0, 192], i % 2 ? 'carry' : null); m.name = 'Someone at the market'; m.talk = () => m.say('...', 2); });
    // Svanhild and the young warriors in the fields above town: discipline, footwork, patience
    { const [dx, dz] = E8.drill; this.at2('svanhild', dx, dz - 3.6, [dx, dz], null, 'sword');
      J.slice(0, 4).forEach((n, i) => { n.revive(); n.name = 'A young warrior'; const m = this.at2(n, dx - 4 + (i >> 1) * 7 + (i % 2) * 1.8, dz + (i >> 1) * 3 + (i % 2) * 0.4, [dx, dz], 'guard', 'woodsword_big'); m.h.hold('L', 'shield'); m.talk = () => c.talkTo(n.id); });
      for (const k of [0, 2]) { J[k].fight(J[k + 1], { lethal: 0, wood: true }); J[k + 1].fight(J[k], { lethal: 0, wood: true }); } }
    // Astrid at the butts, Kári her best student, and his son after her arrows
    { const L = c.W.stages.butts.line, lx = L[0] - c.W.s.x, lz = L[1] - c.W.s.z; this.at2('astrid', lx, lz - 1.3, [34, 141], 'aim').h.hold('L', 'bow'); this.at2('kari', lx, lz + 1.4, [34.6, 146], 'aim').h.hold('L', 'bow'); this.at2('karison', lx - 1.8, lz - 0.6, [lx, lz - 1.3]); this.shotT = 2; }
    // the healing house: Hrefna and Ingrid, still arguing about goat urine
    if (name === 'e8morn') { this.at2('hrefna', -36.2, 119.4, [-33.8, 120.2], 'talk'); this.at2('ingrid', -33.8, 120.2, [-36.2, 119.4], 'talk'); }
    else this.at2('hrefna', -35, 119.6, 2.9, 'talk');
    // Little Brokk with his wooden axe at Bjorn's old chopping block
    this.at2('lbrokk', -22.4, 131.4, [-23, 130], 'chopping', 'toyaxe');
    // the Thing stones: Leif, Hallvard and the goat that cannot be sued
    if (name === 'e8morn') { this.at2('leif', -89.4, 95.8, [-92, 96], 'talk'); this.at2('hallvard', -94.2, 94.6, [-92, 96]); }
    // the stones, the children's hall, Torvald and Hauk
    const [s0x, s0z] = E8.stones.first, [kx, kz] = E8.kids;
    ['kid0', 'kid1', 'kid2', 'kid3', 'kid4', 'kid5'].forEach((id, i) => { const a = 0.3 + i * 0.5; const n = this.at2(id, kx - 3 + Math.cos(a) * 3, kz + 6 + Math.sin(a) * 2, [kx - 3, kz + 6], 'kneel'); n.held = true; });
    if (name === 'e8morn' && rv <= 1) { this.at2('torvald', s0x + 0.5, s0z + 1.3, [s0x, s0z], 'hoe', 'broom'); }
    else if (name === 'e8morn' && rv >= 2 && rv < 99) { this.at2('torvald', s0x - 0.6, s0z + 1.6, [s0x, s0z]).h.hold('R', 'cup'); this.at2('hauk', s0x + 0.8, s0z + 1.7, [s0x, s0z]).h.hold('R', 'cup'); }
    else { this.at2('torvald', kx - 3, kz + 3.6, [kx - 3, kz + 6]); c.post('hauk', [58, 127, 1.2, 'hoe', 'hoe']); }
    if (name === 'e8noon') { // Leif's house
      const t = this.E.home.table;
      this.fix(c.npc('liv'), t.x, t.y - 0.3, t.z, Math.PI, 'sit').h.hold('R', 'apple');
      const l = this.put('leif', t.x + 0.1, t.z - 1.25, [t.x, t.z]); l.talk = () => c.talkTo('leif');
      const d = this.E.home.door; this.put('ingrid', d.x + 3.4, d.z + 1.2, -Math.PI / 2).h.hold('L', 'basket');
    }
    void H;
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!E8P.includes(c.phase)) return false;
    if (id === 'halvar') { if (q.at('q_ravenhold', 'forge')) c.say('e8_forge', n, () => q.notify('talk', 'halvar')); else n.say('Learn first what the thing you make is meant to do.', 4); return true; }
    if (id === 'lbrokk' && q.at('q_lesson', 'lesson')) { this.playLesson(); return true; }
    if (id === 'fishseller' || id === 'ironman') { c.sub(HARBOR[2], 7); return true; }
    const k = c.phase === 'e8morn' || c.phase === 'e8noon' ? WHO[id] : null;
    if (k && (c.phase === 'e8morn' || k !== 'goat')) {
      const first = q.at('q_ravenhold', 'folk') && !this.seen.includes(k);
      c.say(SAYS[k], n, () => { if (first && !this.seen.includes(k)) { this.seen.push(k); q.notify('event', 'e8folk'); } });
      return true;
    }
    if (CAST8[id] || ['torvald', 'hauk', 'leif', 'ingrid', 'astrid', 'kari'].includes(id)) { n.say('...', 2); return true; }
    return false;
  }
  cues = {
    stopHer() { const a = this.c.npc('apprentice'), h = this.c.npc('halvar'); a.setLoop(null); h.setLoop(null); h.face(a.pos.x, a.pos.z); a.h.play('stagger', 0.4); this.g.audio.play('steel', { vol: 0.4 }); },
    thingRing() { const r = this.ring; this.g.fx.flare(r.position.x, r.position.y + 0.1, r.position.z, 1.2, 1, 0.85, 0.5, 0.3); this.g.audio.play('chime'); },
    steal() { const k = this.c.npc('karison'), a = this.c.npc('astrid'), [x, z] = [k.pos.x, k.pos.z]; k.goTo(a.pos.x - 0.5, a.pos.z - 0.3, { run: true, onArrive: (o) => { o.h.play('pickup', 0.6); a.face(o.pos.x, o.pos.z); o.goTo(x, z, { run: true, onArrive: (m) => m.face(a.pos.x, a.pos.z) }); } }); },
  };
  dyn(name) {
    if (name !== 'e8folk') return undefined;
    const p = this.g.player.pos; let best = null, bd = 1e9;
    for (const k in FOLK) { if (this.seen.includes(k)) continue; const n = this.c.npc(FOLK[k]); if (!n.visible) continue; const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z); if (d < bd) { bd = d; best = n; } }
    return best ? { x: best.pos.x, z: best.pos.z, y: best.pos.y + 2.4 } : null;
  }

  // ---- the row of stones ---------------------------------------------------------------------------
  playStones() {
    const g = this.g, c = this.c, p = g.player, w = g.world, t = c.npc('torvald'), h = c.npc('hauk'), [s0x, s0z] = this.B(...E8.stones.first), y0 = w.groundAt(s0x, s0z);
    const [kx, kz] = this.B(...E8.kids), [tx, tz] = this.B(E8.torvald[0] + 1.6, E8.torvald[1] + 2.28), ky = w.groundAt(kx, kz), ty = w.groundAt(tx, tz) - 0.4;
    this.stonesOn = true; this.busy = true; p.frozen = true; c.hint(null);
    p.teleport(s0x + 5, s0z + 7.5, Math.atan2(-5, -7.5));
    this.put(h, s0x + 14, s0z + 14, [s0x, s0z]).visible = false; h.h.hold('R', 'cup'); h.h.hold('L', 'cup');
    const eye = (n, up = 1.5) => () => [n.pos.x, n.pos.y + up, n.pos.z];
    const cam = { row: { from: [s0x + 6, y0 + 2.4, s0z + 4.5], to: [s0x + 5, y0 + 2.2, s0z + 4], look: [s0x - 22, y0 + 1, s0z], fov: 44 }, torvald: { from: [s0x + 2.6, y0 + 1.6, s0z + 3.6], look: eye(t), fov: 30 },
      wide: { from: [s0x + 7, y0 + 2.4, s0z + 9], look: () => [(t.pos.x + h.pos.x) / 2, y0 + 1.2, (t.pos.z + h.pos.z) / 2], fov: 40 }, two: { from: [s0x + 0.4, y0 + 1.6, s0z + 5.2], look: () => [(t.pos.x + h.pos.x) / 2, y0 + 1.35, (t.pos.z + h.pos.z) / 2], fov: 32 },
      hall: { from: [kx + 6, ky + 2.6, kz + 13], to: [kx + 4, ky + 2.4, kz + 12], look: [kx - 2, ky + 1.2, kz + 4], fov: 42 }, house: { from: [tx + 1.0, ty + 1.5, tz + 3.0], to: [tx + 0.6, ty + 1.45, tz + 2.3], look: [tx + 0.2, ty + 1.5, tz], fov: 34 } };
    const act = {
      sweep: () => { t.setLoop('hoe'); g.after(6.5, () => { t.setLoop(null); t.h.hold('R', null); t.face(s0x, s0z); }); },
      hauk: () => { h.visible = true; h.goTo(s0x + 0.8, s0z + 1.7, { onArrive: (o) => o.face(s0x, s0z) }); t.setLoop(null); t.h.hold('R', null); },
      cups: () => { h.teleport(s0x + 0.8, s0z + 1.7, Math.atan2(t.pos.x - h.pos.x, t.pos.z - h.pos.z)); h.h.play('give', 0.9); g.after(0.6, () => { h.h.hold('L', null); t.h.hold('R', 'cup'); t.face(h.pos.x, h.pos.z); }); g.after(2.4, () => { t.face(s0x, s0z); h.face(s0x, s0z); }); },
    };
    this.scene(STONE_LINES, cam, act, () => {
      h.visible = true; h.stop(); h.teleport(s0x + 0.8, s0z + 1.7, Math.atan2(s0x - h.pos.x, s0z - h.pos.z)); h.h.hold('L', null); t.stop(); t.setLoop(null); t.h.hold('R', 'cup'); t.face(s0x, s0z);
      p.frozen = false; this.busy = false; g.quests.notify('event', 'e8stones');
    });
  }

  // ---- Leif's house -----------------------------------------------------------------------------------
  playLiv() {
    const g = this.g, c = this.c, p = g.player, Hm = this.E.home, tb = Hm.table, y = Hm.y, l = c.npc('leif'), v = c.npc('liv'), i = c.npc('ingrid'), d = Hm.door, win = Hm.window;
    if (this.livOn) return;
    this.livOn = true; this.busy = true; p.frozen = true; c.hint(null);
    this.dress('e8noon');
    p.teleport(d.x - 1.4, d.z - 1.6, -Math.PI / 2 - 0.4);
    const eye = (n, up = 1.45) => () => [n.pos.x, n.pos.y + up, n.pos.z];
    const cam = { room: { from: [d.x - 0.8, y + 2.7, d.z + 2.6], to: [d.x - 1.4, y + 2.5, d.z + 2.2], look: [tb.x - 1.5, y + 1.0, tb.z], fov: 48 },
      leif: { from: () => [l.pos.x - 1.3, y + 1.6, l.pos.z + 2.2], look: eye(l, 1.55), fov: 32 }, liv: { from: [tb.x - 1.6, y + 1.3, tb.z - 1.0], look: eye(v, 0.95), fov: 30 },
      door: { from: [tb.x - 1.4, y + 1.6, tb.z + 1.4], look: () => [i.pos.x, y + 1.3, i.pos.z], fov: 38 }, ingrid: { from: () => [i.pos.x - 2.0, y + 1.6, i.pos.z - 0.8], look: eye(i, 1.5), fov: 30 },
      two: { from: [tb.x - 2.6, y + 1.7, tb.z + 2.2], look: [tb.x, y + 0.9, tb.z - 0.6], fov: 40 }, twins: { from: [Hm.x0 + 3.2, y + 1.9, tb.z + 0.6], to: [Hm.x0 + 2.4, y + 2.0, tb.z + 0.4], look: [Hm.x0 + 0.2, y + 2.05, tb.z - 0.2], fov: 34 },
      window: { from: [win.x + 1.3, y + 1.75, win.z - 3.8], to: [win.x + 1.0, y + 1.75, win.z - 3.4], look: [win.x - 0.2, y + 1.45, win.z + 6], fov: 40 } };
    const act = {
      wave: () => { l.h.play('give', 0.9); },
      ingrid: () => { i.goPath([[d.x + 1.2, d.z], [d.x - 1.6, d.z + 0.2], [tb.x + 1.3, tb.z + 0.9]], { onArrive: (o) => o.face(l.pos.x, l.pos.z) }); },
      fall: () => { this.fall = { t: 0, from: [v.pos.x, v.pos.y, v.pos.z] }; v.h.play('cheer', 0.8); l.goTo(tb.x - 0.2, tb.z - 0.95, { run: true }); },
      window: () => { this.fall = null; this.put(v, tb.x + 1.1, tb.z + 1.5, [l.pos.x, l.pos.z]).h.hold('R', 'apple'); v.talk = null; l.stop(); l.setLoop(null); l.teleport(win.x - 0.1, win.z - 0.75, 0); },
    };
    this.scene(LIV_LINES, cam, act, () => {
      this.fall = null; this.put(v, tb.x + 1.1, tb.z + 1.5, [win.x, win.z]).h.hold('R', 'apple'); v.talk = () => c.talkTo('liv');
      l.stop(); l.setLoop(null); l.teleport(win.x + 0.1, win.z - 0.9, 0); i.stop(); i.teleport(tb.x + 1.3, tb.z + 0.9, Math.atan2(l.pos.x - tb.x - 1.3, l.pos.z - tb.z - 0.9));
      p.frozen = false; this.busy = false; g.quests.notify('event', 'e8liv');
    });
  }

  // ---- the last lesson ---------------------------------------------------------------------------------
  playLesson() {
    const g = this.g, c = this.c, p = g.player, w = g.world, b = c.npc('lbrokk'), [tx, tz] = this.B(...E8.top), ty = w.groundAt(tx, tz), [bx, bz] = this.B(-20, 10), by = w.groundAt(bx, bz);
    const [fx, fz] = this.B(...E8.fence), [sx, sz] = this.B(...E8.stream), toTown = Math.atan2(this.B(0, 140)[0] - tx, this.B(0, 140)[1] - tz);
    if (this.busy) return;
    this.busy = true; p.frozen = true; c.hint(null);
    p.teleport(tx, tz, toTown); this.put(b, tx + 1.05, tz + 0.15, -Math.PI / 2 + 0.4).h.hold('R', 'toyaxe'); b.talk = null;
    const eye = (n, up) => () => [n.pos.x, n.pos.y + up, n.pos.z];
    const cam = { tree: { from: [tx + 4.6, ty + 1.6, tz + 6.4], to: [tx + 3.6, ty + 2.2, tz + 5.4], look: [bx, by + 6.5, bz], fov: 46 },
      boy: { from: [tx + 2.0, ty + 1.05, tz + 1.4], look: eye(b, 0.95), fov: 32 }, eirik: { from: () => [tx + 1.4, ty + (p.loopOverride === 'kneel' ? 1.1 : 1.6), tz + 2.2], look: () => [p.pos.x, p.pos.y + (p.loopOverride === 'kneel' ? 1.0 : 1.55), p.pos.z], fov: 30 },
      fence: { from: [tx + 1.0, ty + 2.4, tz + 1.2], look: [fx, w.groundAt(fx, fz) + 1.0, fz], fov: 11 }, stream: { from: [tx + 1.0, ty + 2.4, tz + 1.2], look: [sx, w.groundAt(sx, sz) + 0.6, sz], fov: 6.5 },
      two: { from: [tx - 2.4, ty + 1.3, tz + 2.4], to: [tx - 2.0, ty + 1.25, tz + 2.1], look: [tx + 0.5, ty + 0.95, tz], fov: 38 }, axe: { from: [tx + 0.5, ty + 1.2, tz + 1.5], look: () => { p.h.handWorld('R', _v); return [_v.x, _v.y, _v.z]; }, fov: 26 } };
    const act = {
      look: () => { p.yaw = Math.atan2(fx - tx, fz - tz); p.root.rotation.y = p.yaw; },
      kneel: () => { p.yaw = Math.atan2(b.pos.x - tx, b.pos.z - tz); p.root.rotation.y = p.yaw; p.loopOverride = 'kneel'; },
      take: () => { b.h.hold('R', null); p.h.hold('R', 'toyaxe'); g.audio.play('page'); },
      give: () => { p.h.hold('R', null); b.h.hold('R', 'toyaxe'); },
    };
    this.scene(LESSON_LINES, cam, act, () => {
      p.loopOverride = null; p.h.hold('R', null); b.h.hold('R', 'toyaxe'); p.frozen = false; this.busy = false;
      g.quests.notify('talk', 'lbrokk');
    });
  }
  /** The young raven drops out of the branches and lands on the stone. */
  ravenDown() {
    const g = this.g, c = this.c, s = this.E.birch.stone, br = this.E.birch.branch;
    c.tell([RAVENS[0]], 10).then(() => {
      this.young.visible = true; this.drop = { t: 0, a: [br.x, br.y, br.z], b: [s.x, s.y + 0.04, s.z] }; g.audio.play('raven', { vol: 0.6 });
      c.sub(g.fmt(RAVENS[1]), 11);
    });
  }
  playHome() {
    const g = this.g, c = this.c, p = g.player, s = this.E.birch.stone;
    if (this.busy) return;
    this.busy = true; p.frozen = true; c.hint(null);
    p.teleport(s.x + 0.85, s.z + 1.0, Math.atan2(-0.85, -1.0)); p.loopOverride = 'kneel';
    this.young.rotation.y = Math.atan2(p.pos.x - s.x, p.pos.z - s.z);
    g.cine.hold([s.x + 2.2, s.y + 0.9, s.z + 0.9], [s.x + 0.2, s.y + 0.35, s.z + 0.3], { fov: 34, blend: 1.4 });
    g.after(1.2, () => { this.young.rotation.z = 0.4; });
    c.tell(HOME, 6).then(() => { c.sub('Home.', 5); g.audio.play('chime', { vol: 0.5 }); return new Promise((r) => g.after(5.4, r)); }).then(() => { g.cine.release(); this.finale(); });
  }
  /** The view rises above the hill, the town and the harbor, and out to sea. */
  finale() {
    const g = this.g, c = this.c, p = g.player, w = g.world, s = this.E.birch.stone, [bx, bz] = this.B(-20, 10), by = w.groundAt(bx, bz);
    const pt = (dx, dz, h) => { const [x, z] = this.B(dx, dz); return [x, h, z]; };
    const P0 = [s.x + 2.0, s.y + 1.0, s.z + 2.4], P1 = [s.x + 1.2, s.y + 16, s.z + 10], P2 = pt(-6, 92, 46), P3 = pt(0, 150, 52), P4 = pt(0, 236, 58), P5 = pt(0, 360, 66), P6 = pt(0, 540, 76);
    const lookAhead = (q) => [q[0], 0, q[2] + 260];
    const seg = (A, Bp, lookA, lookB, lin) => ({ from: (k) => lerp3(A, Bp, lin ? k : ease(k)), look: (k) => lerp3(lookA, lookB, lin ? k : ease(k)), linear: true });
    const high = [P2, lerp3(P2, P3, 0.6), P3, lerp3(P3, P4, 0.55), P4];
    const shots = []; let hi = 0;
    for (const [where, sp, text, k] of FINALE) {
      const dur = 3.2 + text.length * 0.062; let sh;
      if (where === 'eirik') sh = { from: () => P0, look: () => [bx, by + 7.5, bz], fov: 42 };
      else if (where === 'rise') sh = seg(P0, P2, [bx, by + 7.5, bz], pt(0, 160, 3), false);
      else if (where === 'high') { sh = seg(high[hi], high[hi + 1], hi === 0 ? pt(0, 160, 3) : lookAhead(high[hi]), lookAhead(high[hi + 1]), true); hi++; }
      else sh = k === 'fly' ? seg(P4, P5, lookAhead(P4), lookAhead(P5), true) : seg(P5, P6, lookAhead(P5), lookAhead(P6), true);
      shots.push({ ...sh, dur, fov: sh.fov || 50, sub: [sp, g.fmt(text), dur - 0.3], onStart: k === 'fly' ? () => this.fly() : null });
    }
    const last = shots[shots.length - 1], up = last.from; let faded = false;
    last.onUpdate = (k) => { if (k > 0.82 && !faded) { faded = true; g.ui.fade(true, 1.8); } };
    void up;
    g.audio.setMusic('menu'); p.loopOverride = null; g.sky.fogMul = 0.3; // as a raven would see it: the air clears
    g.cine.play(shots, { skippable: false, onEnd: () => { this.flight = null; p.frozen = true; g.quests.notify('event', 'e8home'); } });
  }
  /** The young raven spreads its wings and flies out toward the sea. */
  fly() { const cam = this.g.camera; cam.getWorldDirection(_v); this.young.visible = true; this.young.rotation.set(0, 0, 0); this.flight = { t: 0, x: cam.position.x + _v.x * 7, y: cam.position.y - 2.2, z: cam.position.z + _v.z * 7 }; this.g.audio.play('raven', { vol: 0.5 }); }

  // =====================================================================================
  steps = {
    'q_ravenhold.market'(r) {
      const g = this.g, c = this.c, p = g.player, st = this.st, go = () => { c.setPhase('e8morn', true); p.teleport(...this.B(...E8.start), Math.PI); if (p.equipped !== 'none') p.equip('none'); };
      if (st.flags.e8begun) return go();
      st.flags.e8begun = true; p.frozen = true;
      for (const it of ['halfdan_ring', 'oath_ring']) if (g.inventory.has(it)) g.inventory.remove(it, 9, true); // both are in the Thing-Ring now
      g.ui.fade(true, 0.6).then(() => g.ui.card('Epilogue', 'The Old Birch  ·  twelve years later', 4.6)).then(() => { go(); return g.ui.fade(false, 1.8); })
        .then(() => g.ui.card('Ravenhold', 'Eirik is forty-one.', 3.6)).then(() => { p.frozen = false; c.tell(HARBOR, 8.5); });
    },
    'q_ravenhold.stones'(r) { const c = this.c; c.setPhase('e8morn', r); this.here(r, this.B(...E8.market), Math.PI); },
    'q_ravenhold.forge'(r) { const c = this.c, [x, z] = E8.stones.first; c.setPhase('e8morn', r); this.here(r, this.B(x + 5, z + 7.5), Math.PI); if (!r) this.dress('e8morn'); },
    'q_ravenhold.folk'(r) { const c = this.c, F = c.W.stages.forge2; c.setPhase('e8morn', r); this.here(r, [F.anvil.x - 3.2, F.anvil.z + 0.4], Math.PI / 2); c.hint('folk'); },
    'q_leifhouse.door'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.B(-18, 211), go = () => { c.setPhase('e8noon', true); p.teleport(at[0], at[1], -Math.PI / 2); };
      c.hint(null);
      if (r) return go();
      c.fade(() => { go(); return g.ui.card("Leif's House", 'The same day, at midday', 4); }, 1.4, 1.4);
    },
    'q_leifhouse.liv'(r) { const g = this.g, c = this.c, d = this.E.home.door; c.setPhase('e8noon', r); this.here(r, [d.x - 1.4, d.z - 1.6], -Math.PI / 2); g.after(r ? 1 : 0.3, () => this.playLiv()); },
    'q_lesson.hill'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.B(...E8.gate), go = () => { c.setPhase('e8eve', true); p.teleport(at[0], at[1], Math.PI); if (p.equipped !== 'none') p.equip('none'); this.dress('e8eve'); };
      if (r) return go();
      c.fade(() => { go(); return g.ui.card('The Last Lesson', 'That evening, the High King of the North walks up the hill behind Ravenhold to the old birch.', 7); }, 1.6, 1.6).then(() => c.tell(WALK, 10));
    },
    'q_lesson.lesson'(r) { const c = this.c; c.setPhase('e8eve', r); if (r) { this.here(r, this.B(...E8.top), 0.14); this.dress('e8eve'); } const b = c.npc('lbrokk'); b.follow(this.g.player, { dist: 1.6 }); },
    'q_lesson.home'(r) {
      const c = this.c, s = this.E.birch.stone;
      c.setPhase('e8eve', r);
      if (r) { this.here(r, this.B(...E8.top), 0.14); this.dress('e8eve'); this.young.position.set(s.x, s.y + 0.04, s.z); this.youngWings(1.3); this.landed = true; return c.hint('kneel'); }
      this.ravenDown();
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase;
    if (!E8P.includes(ph)) return;
    this.crew([c.npc('liv')], dt);
    const t = (this.wt = (this.wt || 0) + dt);
    // the young raven: down out of the branches onto the stone, and later out to sea
    const d = this.drop;
    if (d) { d.t = Math.min(1, d.t + dt / 2.2); const k = d.t, pos = lerp3(d.a, d.b, ease(k)); pos[1] += Math.sin(k * Math.PI) * 1.2; this.young.position.set(...pos); this.young.rotation.y = Math.atan2(d.b[0] - d.a[0], d.b[2] - d.a[2]); this.youngWings(k < 0.9 ? Math.sin(t * 22) * 0.9 : 0.1);
      if (k >= 1) { this.drop = null; this.landed = true; this.youngWings(1.3); this.young.rotation.y = Math.atan2(p.pos.x - d.b[0], p.pos.z - d.b[2]); g.after(5, () => { if (q.at('q_lesson', 'home') && !this.busy) c.hint('kneel'); }); } }
    const f = this.flight;
    if (f) { f.t += dt; f.z += dt * 26; f.y += dt * (f.t < 1.2 ? 1.2 : -1.4); this.young.position.set(f.x + Math.sin(f.t * 0.7) * 1.4, f.y, f.z); this.young.rotation.set(0, 0.08 * Math.sin(f.t), 0); this.youngWings(Math.sin(t * 16) * 0.95); }
    // the old black raven in the birch screams at anyone who walks under it
    if (this.old.visible) { const o = this.old.position, near = Math.hypot(p.pos.x - o.x, p.pos.z - o.z) < 7; this.cawT -= dt;
      const W = this.old.userData.wings, flap = this.cawT > 3.4 ? Math.sin(t * 30) * 0.7 : 1.3; W[0].rotation.z = flap; W[1].rotation.z = -flap;
      if (near && this.cawT <= 0 && g.mode !== 'cutscene') { this.cawT = 4; g.audio.play('raven', { vol: 0.8 }); } }
    // the bread goes round
    if (ph === 'e8eve' && Math.random() < dt * 0.25) { const i = (Math.random() * 6) | 0, n = c.npc('kid' + i); if (n.visible) n.h.play('give', 0.8); }
    // a fall into her father's arms
    const fl = this.fall;
    if (fl) { const v = c.npc('liv'), l = c.npc('leif'); fl.t = Math.min(1, fl.t + dt / 0.75); const k = fl.t, fx = l.pos.x + Math.sin(l.yaw) * 0.38, fz = l.pos.z + Math.cos(l.yaw) * 0.38, fy = l.pos.y + 0.78;
      v.pos.set(fl.from[0] + (fx - fl.from[0]) * k, fl.from[1] + (fy - fl.from[1]) * k + Math.sin(k * Math.PI) * 0.35, fl.from[2] + (fz - fl.from[2]) * k); v.root.rotation.z = Math.sin(k * Math.PI) * 0.9; if (k >= 1) { v.root.rotation.z = 0; l.setLoop('carry'); } }
    if (g.mode !== 'play') return;
    if (q.at('q_ravenhold', 'stones') && !this.stonesOn && this.near(this.B(E8.stones.first[0], E8.stones.first[1] + 3), 10)) this.playStones();
    if (ph !== 'e8eve' && (this.shotT -= dt) <= 0) { this.shotT = 3 + Math.random() * 3; const n = c.npc(Math.random() < 0.5 ? 'astrid' : 'kari'); if (n.visible && n.dist(p) < 40) { n.h.play('shoot', 0.6); g.audio.play('bow', { vol: 0.3 }); g.after(0.6, () => g.audio.play('arrowHit', { vol: 0.25 })); } }
  }
}
