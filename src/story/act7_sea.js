// Act VII at sea: "Fire on the Water" (the fleet in the rain, Star-Fall, the fire arrows, the ship whose archers rake
// the decks, Leif's passage past the rocks, the ram) and "Two Blades, One Sea" (Leif and Ulf on the benches, the
// boarders, the duel across two burning decks, the black raven, the rail). The fleet does not sail: sixty-two ships
// are nine, thirty chained warships are seven, and the Sea-Raven stands where Act IV left her, with the war round her.
// This file also holds what all three parts of the act share: fire arrows, and scenes told line by line.
// See act7_shore.js (the landing to the hall gate) and act7_hall.js (the Ironwolf, the dead, the crown).
import * as THREE from 'three';
import { makeShip } from '../world/props.js';
import { AT_SEA } from '../world/layout.js';
import { clamp } from '../core/util.js';
import { A7, CAST7, TOLD, SAID, LEIF_LINES, ULF_END } from '../data/act7.js';
import { FOES } from './champions.js';
import { Knack } from '../systems/activities2.js';
import { A4Part, TEN } from './act4_home.js';

export const SEA7 = ['w7dawn', 'w7fire', 'w7ulf', 'w7calm'], SHORE7 = ['w7shore', 'w7bend', 'w7pens', 'w7bridge', 'w7gate'], HALL7 = ['w7hall', 'w7duel', 'w7after', 'w7graves', 'w7crown'];
export const WAR7 = [...SEA7, ...SHORE7, ...HALL7];
const RAIN = { w7dawn: 0.7, w7fire: 1, w7ulf: 1, w7calm: 0.6, w7shore: 0.9, w7bend: 0.9, w7pens: 0.7, w7bridge: 0.6, w7gate: 0.5, w7after: 0.25 };
const NAMED = ['leif', 'astrid', 'svanhild', 'ingrid', 'torvald', 'hroald', 'arvid', 'jorund', 'ragnvald', 'thora', 'gudmund', 'halvar', 'eyvind', 'eystein', 'hallvard', 'aslak', 'svein'];
const DECK = [[1.2, 3.4], [-1.3, -1.0], [0.9, -4.6]];                 // where the Sea-Raven's deck catches
const _v = new THREE.Vector3();

/** Fire arrows: rags soaked in burning pitch, and the rain does not put them out. */
class War {
  constructor(game) { this.g = game; this.arrows = []; this.fires = []; }
  mesh() {
    const m = new THREE.Group(), shaft = new THREE.CylinderGeometry(0.014, 0.014, 0.86, 4), head = new THREE.SphereGeometry(0.07, 6, 5);
    shaft.rotateX(Math.PI / 2); head.translate(0, 0, 0.42);
    m.add(new THREE.Mesh(shaft, new THREE.MeshBasicMaterial({ color: 0x1a1512 })), new THREE.Mesh(head, new THREE.MeshBasicMaterial({ color: 0xffb040, toneMapped: false })));
    m.visible = false; this.g.scene.add(m); return m;
  }
  /** Loose them from a point onto points [[x, y, z]]. o: T (seconds in the air), burn (seconds each burns where it lands), hurt (what one costs a man it lands beside with no shield up). */
  loose(from, pts, o = {}) {
    for (const to of pts) {
      let a = this.arrows.find((x) => !x.on);
      if (!a) { if (this.arrows.length >= 28) break; a = { m: this.mesh(), on: false }; this.arrows.push(a); }
      Object.assign(a, { on: true, t: -Math.random() * 0.45, T: (o.T || 1.5) * (0.9 + Math.random() * 0.2), a: from, b: to, burn: o.burn || 0, hurt: o.hurt || 0, puff: 0 });
    }
    this.g.audio.play('bow', { vol: 0.5 }); this.g.audio.play('whoosh', { vol: 0.6 });
  }
  /** A volley out of the rain onto the ground round a point: a few of them straight at him. */
  rain(cx, cz, n, spread, from, o = {}) {
    const g = this.g, p = g.player, pts = [];
    for (let i = 0; i < n; i++) {
      const his = i < (o.onHim ?? 2), x = his ? p.pos.x + (Math.random() - 0.5) * 1.4 : cx + (Math.random() - 0.5) * spread, z = his ? p.pos.z + (Math.random() - 0.5) * 1.4 : cz + (Math.random() - 0.5) * spread;
      pts.push([x, Math.max(0, g.world.groundAt(x, z)) + 0.05, z]);
    }
    this.loose(from, pts, o);
  }
  /** Something burns for a while. */
  burn(x, y, z, size, secs) { const f = this.g.fx.addFire(x, y, z, size, { smoke: false }); this.fires.push({ f, t: secs }); return f; }
  land(a) {
    const g = this.g, p = g.player, [x, y, z] = a.b, d = Math.hypot(p.pos.x - x, p.pos.z - z);
    g.fx.burst('ember', x, y + 0.1, z, 7); g.fx.burst('spark', x, y + 0.1, z, 3);
    if (d < 28) g.audio.play('arrowHit', { vol: clamp(0.6 - d / 50, 0.08, 0.6) });
    if (a.burn && y > 0.3 && this.fires.length < 9) this.burn(x, y, z, 0.5, a.burn);
    if (!a.hurt || d > 1.45 || g.mode !== 'play' || g.ravens.eye || p.iframes > 0) return;
    if (p.blocking && p.hasShield()) { g.audio.play('clack'); g.fx.burst('spark', p.pos.x, p.pos.y + 1.4, p.pos.z, 6); p.cam.shake = Math.max(p.cam.shake, 0.1); return; }
    p.health = Math.max(6, p.health - a.hurt); p.h.play('stagger', 0.35); g.audio.play('hurt'); p.cam.shake = 0.22; g.ui.pulse('hurt', 0.5); // fire arrows wound; they do not finish him
  }
  clear() { for (const a of this.arrows) { a.on = false; a.m.visible = false; } for (const f of this.fires) this.g.fx.removeFire(f.f); this.fires = []; }
  update(dt) {
    const g = this.g;
    for (const a of this.arrows) {
      if (!a.on) continue;
      a.t += dt; if (a.t < 0) continue;
      const u = Math.min(1, a.t / a.T), H = a.T * 8, at = (k, out) => out.set(a.a[0] + (a.b[0] - a.a[0]) * k, a.a[1] + (a.b[1] - a.a[1]) * k + H * k * (1 - k), a.a[2] + (a.b[2] - a.a[2]) * k);
      at(u, a.m.position); a.m.lookAt(at(Math.min(1.02, u + 0.03), _v)); a.m.visible = true;
      if ((a.puff -= dt) <= 0) { a.puff = 0.09; g.fx.burst('ember', a.m.position.x, a.m.position.y, a.m.position.z, 1); }
      if (u >= 1) { a.on = false; a.m.visible = false; this.land(a); }
    }
    for (const f of this.fires) if ((f.t -= dt) <= 0) g.fx.removeFire(f.f);
    this.fires = this.fires.filter((f) => f.t > 0);
  }
}

/** What every part of Act VII shares. */
export class A7Part extends A4Part {
  get war() { return this.c.sea7.arrows7; }
  get S7() { return this.g.world.main.sea7; }
  get V7() { return this.g.world.main.svart7; }
  /** Eirik, armed for war. */
  arm() { const p = this.g.player; p.mortal = true; this.c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe'); }
  /** Lines said one after another: [speaker, text]. */
  said(list) {
    const g = this.g, c = this.c; let t = 0.01;
    for (const [s, text] of list) { const d = Math.max(3, 1.6 + text.length * 0.055); g.after(t, () => c.sub(text, d - 0.2, s)); t += d; }
    return new Promise((r) => g.after(t, r));
  }
  /** A scene told line by line: [who the camera is on, speaker, text, what happens]. If it is skipped, onEnd still puts everything where the scene would have left it. */
  scene(lines, cam, act, onEnd) {
    const g = this.g;
    g.cine.play(lines.map(([who, sp, text, k]) => { const v = cam[who], dur = 2.8 + text.length * 0.058, f = v.from;
      return { dur, from: f, to: v.to || (typeof f === 'function' ? null : [f[0] + 0.25, f[1], f[2] + 0.2]), look: v.look, fov: v.fov || 38, sub: [sp, g.fmt(text), dur - 0.3], onStart: k && act[k] ? act[k] : null }; }), { onEnd });
  }
  /** One of Håkon's ten, with the skills the Wolf's Table gives him and the numbers this act does. A phase with `use: i` takes what his i-th change does to him. */
  champion(e, id, R, o = {}) {
    const g = this.g, def = FOES.find((f) => f.id === id), cb = structuredClone(def.cb), sets = (cb.phases || []).map((ph) => ph.set || {});
    delete cb.phases;
    const phases = (o.phases || []).map((ph) => (ph.use === undefined ? ph : { ...ph, set: { ...sets[ph.use], ...(ph.set || {}) } }));
    e.h.hold('R', def.hold[0]); e.h.hold('L', def.hold[1]);
    g.combat.add(e, { ...cb, hp: R.hp, dmg: R.dmg, ...(R.parryBreak ? { parryBreak: R.parryBreak } : {}), boss: true, smart: true, ...o, phases }); // parryBreak: the guard a parry wears off him (a boss's is 24)
    g.audio.setMusic('raid'); g.audio.play('horn', { freq: def.n > 7 ? 82 : 110, vol: 0.5 });
    g.ui.questBanner(`${def.title} · ${o.where || def.where}`, def.name);
    return def;
  }
  /** A load: he stands where this step begins. */
  here(r, at, yaw = 0) { if (r) this.g.player.teleport(at[0], at[1], yaw); }
  near(at, d) { const p = this.g.player.pos; return Math.hypot(p.x - at[0], p.z - at[1]) < d; }
}

export class A7Sea extends A7Part {
  constructor(game, core) { super(game, core); this.arrows7 = new War(game); this.fires = []; this.deck = []; this.vT = 0; }
  get SS() { return this.g.world.main.sea; }
  /** A point by offset from the Sea-Raven's mast (+x east; +z south, her bow). */
  S(dx, dz) { return [AT_SEA.x + dx, AT_SEA.z + dz]; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world;
    for (const id of ['kari', 'guide']) { const n = g.addNPC(id, CAST7[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    this.boat = makeShip({ L: 9, B: 2.6, sail: false, shields: false, seed: 33 }); this.boat.visible = false; g.scene.add(this.boat); // one of Queen Thora's flat-bottomed marsh boats
    w.addInteractable({ id: 'a7smother', pos: () => this.nextFire() || { x: 0, z: 0 }, x: 0, z: 0, r: 2.1, priority: 3, label: 'Smother it', enabled: () => q.at('q_firewater', 'fire') && !!this.nextFire() && !this.busy, use: () => this.smother() });
    w.addInteractable({ id: 'a7oar', x: this.S(0.9, -5.2)[0], z: this.S(0.9, -5.2)[1], r: 2.6, priority: 3, label: 'Take the oar with Leif', enabled: () => q.at('q_firewater', 'rocks') && !this.busy && !g.activity, use: () => this.rocks() });
  }
  clear(phase) {
    const g = this.g, c = this.c, S7 = this.S7, on = SEA7.includes(phase), any = WAR7.includes(phase);
    for (const s of [S7.wall, S7.raker, S7.kinn, S7.fleet, S7.flag]) s.set(false);
    S7.flag.group.position.set(0, 0, 0);
    for (const id of ['kari', 'guide']) c.npc(id).visible = false;
    if (any) for (const id of NAMED) { const n = c.npc(id); if (n) n.visible = false; } // each scene of the act places its own people
    this.boat.visible = false; this.arrows7.clear();
    for (const f of this.fires) g.fx.removeFire(f); this.fires = []; this.deck = [];
    this.busy = false; this.duel = null; this.archers = null; this.slide = null; this.fall = null; this.vT = 4; this.told = 0; this.drift = null;
    if (any || this.rained) { g.fx.setRain(RAIN[phase] || 0); this.rained = any; }
    if (!on) return;
    this.SS.set(true); c.W.stages.searaven.set(false); c.act.glowTarget = phase === 'w7dawn' ? 0 : 0.45;
    if (g.combat.active) g.combat.clear(); c.battle.sk = null;
  }
  fire(x, y, z, s) { const f = this.g.fx.addFire(x, y, z, s); this.fires.push(f); return f; }
  nextFire() { const p = this.g.player.pos; let best = null, bd = 1e9; for (const f of this.deck) { const d = Math.hypot(f.x - p.x, f.z - p.z); if (f.on && d < bd) { bd = d; best = f; } } return best; }
  /** Who is where on the Sea-Raven, and what is round her. */
  dress(name) {
    const g = this.g, c = this.c, S7 = this.S7, fw = this.at('q_firewater'), bl = this.at('q_blades'), y = this.SS.sr.y, { x, z } = AT_SEA, u = c.battle.ulf;
    const P = (id, dx, dz, face, loop, hold) => { const n = this.put(id, ...this.S(dx, dz), typeof face === 'number' ? face : face ? this.S(face[0], face[1]) : undefined, loop, hold); n.keepDry = true; return n; };
    const battle = name === 'w7fire' || name === 'w7ulf';
    for (const f of this.fires) g.fx.removeFire(f); this.fires = []; this.deck = []; // a step that dresses the deck again starts from bare boards
    S7.kinn.set(true); S7.fleet.set(true); S7.wall.set(battle && fw >= 2); S7.raker.set(name === 'w7fire' && fw === 2); S7.flag.set(name !== 'w7dawn' && fw >= 4);
    P('leif', 1.2, -6.6, 0); P('astrid', 1.7, 0.9, 0, battle ? 'aim' : null).h.hold('L', 'bow');
    { const s = name === 'w7ulf' ? P('svanhild', 0.3, -5.8, 0, 'guard', 'sword') : P('svanhild', -1.4, 2.6, 0, battle ? 'guard' : null, 'sword'); if (battle) s.h.hold('L', 'shield'); } // out of the way of the two of them
    TEN.forEach((id, i) => { const n = P(id, i < 3 ? -1.6 : 1.6, [-6.4, -4.4, 4.6, -3.0, 2.0, 5.9][i], 0, battle ? 'guard' : 'sit', battle ? 'spear' : null); if (battle) n.h.hold('L', 'shield'); });
    if (name === 'w7dawn') { // the marsh boat, slipping away into the mist
      const b = this.boat, [bx, bz] = this.S(-13, 7), by = -0.15 + (b.userData.deckY ?? 0.7);
      b.visible = true; b.position.set(bx, -0.15, bz); b.rotation.y = -1.9; this.drift = { x: bx, z: bz, y: by, t: 0 };
      this.fix(c.npc('torvald'), bx, by, bz, -1.9, 'sit').h.hold('R', 'starfall'); this.fix(c.npc('guide'), bx + 2.6, by, bz + 0.9, -1.9, null);
      c.battle.jarn.slice(0, 3).forEach((n, i) => { n.revive(); n.name = "One of Torvald's twenty"; this.fix(n, bx - 1.6 - i * 1.1, by, bz - 0.5 - i * 0.35, -1.9, 'sit').h.hold('R', null); });
      return;
    }
    if (fw >= 1) { this.fire(S7.kinn.x, S7.kinn.y + 4.6, S7.kinn.z, 3.4); this.fire(S7.kinn.x - 0.6, S7.kinn.y + 0.4, S7.kinn.z - 4, 1.5); } // the Kinn ship: a sail goes up in a sheet of flame
    if (fw === 1) { const n = this.count('q_firewater'); this.deck = DECK.slice(n).map(([dx, dz]) => { const [fx, fz] = this.S(dx, dz); return { x: fx, z: fz, on: true, f: this.fire(fx, y + 0.12, fz, 0.75) }; }); }
    if (fw >= 2 && battle) { // Ulf, on the prow of the biggest ship
      u.revive(); this.fix(u, x + 9.6, y + 0.55, z + 72.6, Math.PI, 'guard'); u.h.hold('R', 'sword'); u.h.hold('L', 'sword'); u.talk = null;
    }
    if (name === 'w7fire' && fw === 2) { // the ship whose archers are raking the fleet
      const n0 = this.count('q_firewater');
      this.archers = S7.raker.spots.map((s, i) => { const n = c.raid.pool[i]; n.revive(); n.cb = null; n.name = "One of Ulf's archers"; n.talk = null; n.hp7 = 2; this.fix(n, s.x, s.y, s.z, Math.PI, 'aim'); n.h.hold('L', 'bow'); n.h.hold('R', null); n.h.param = 0.6; if (i < n0) n.visible = false; return n; });
    }
    if (fw >= 4) for (const dx of [-46, 0, 46]) this.fire(x + dx, 1.9, z + 74, 2.6); // the floating wall, broken and burning
    if (name === 'w7ulf' || name === 'w7calm') {
      for (const [dx, dz, s] of [[-5.6, -5.4, 1.3], [-3.4, 6.6, 1.1], [1.6, -7.0, 0.9]]) this.fire(...((p) => [p[0], y + 0.15, p[1]])(this.S(dx, dz)), s); // both of them burning
      const l = P('leif', -0.1, -0.8, Math.PI, bl >= 1 ? 'sit' : null, 'seax'); l.h.hold('L', bl >= 3 ? null : 'sword'); if (bl >= 3) l.h.hold('R', null);
      if (name === 'w7calm') { u.visible = false; S7.flag.group.position.y = -1.25; g.world.removeDeck(S7.flag.sh.deck); return; } // Ulf's ship is sinking
      this.put(u, ...this.S(-5.0, bl === 1 ? 5.6 : -2.4), Math.PI / 2, 'guard', 'sword'); u.h.hold('L', 'sword'); u.keepDry = true; u.talk = null;
    }
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!SEA7.includes(c.phase)) return false;
    if (id === 'leif' && q.at('q_blades', 'kit')) { c.say('a7_kit', n, () => q.notify('talk', 'leif')); return true; }
    if (id === 'leif') { n.say(c.phase === 'w7dawn' ? 'Sixty-two ships. I have counted them twice.' : 'I know these waters.', 3.2); return true; } // (game: from the story's sentences)
    if (['astrid', 'svanhild'].includes(id) || /^v\d/.test(id)) { n.say('...', 2); return true; }
    return false;
  }
  cues = {
    fireCry() { const g = this.g; g.audio.play('raven'); g.audio.play('horn', { freq: 84, vol: 0.5 }); g.player.cam.shake = 0.2; this.volley(9, 0); },
  };
  dyn(name) {
    const q = this.g.quests;
    if (name !== 'a7work' || !q.at('q_firewater', 'fire')) return undefined;
    const f = this.nextFire(); return f ? { x: f.x, z: f.z, y: this.SS.sr.y + 1.6 } : null;
  }

  // ---- fire on the water --------------------------------------------------------------------------
  /** A volley onto the Sea-Raven: from the ship ahead while her archers live, else from the cliffs. */
  volley(n, onHim = 2) {
    const g = this.g, c = this.c, { x, z } = AT_SEA, live = this.archers ? this.archers.filter((a) => !a.dead && a.visible) : [];
    const from = live.length ? [x - 3, this.SS.sr.y + 2.2, z + 28] : [x + 70, 46, z + 150];
    for (const a of live) a.h.play('shoot', 0.6);
    this.war.rain(x, z + 0.5, n, 13, from, { T: live.length ? 1.25 : 1.9, burn: 5, hurt: A7.volley.dmg, onHim });
    if (onHim) g.ui.alert(true);
    g.after(live.length ? 1.3 : 1.95, () => { for (const id of TEN) { const m = c.npc(id); if (m.visible && m.loop === 'guard') m.h.play('blockhit', 0.4); } });
  }
  smother() {
    const g = this.g, p = g.player, f = this.nextFire();
    if (!f) return;
    this.busy = true; p.h.play('pickup', 0.9, { onEnd: () => { this.busy = false; } });
    g.after(0.45, () => { f.on = false; g.fx.removeFire(f.f); g.audio.play('splash', { vol: 0.5 }); g.fx.burst('splash', f.x, this.SS.sr.y + 0.3, f.z, 14); g.fx.burst('dust', f.x, this.SS.sr.y + 0.4, f.z, 8); g.quests.notify('event', 'a7fire'); });
  }
  /** His arrows against the archers on the other deck: one that is fully drawn, or in the head, is enough. */
  hits(dt) {
    const g = this.g, p = g.player, A = g.wildlife.arrows;
    for (let i = A.length - 1; i >= 0; i--) {
      const ar = A[i]; if (ar.stuck || ar.owner !== p) continue;
      const b = ar.m.position, ax = b.x - ar.v.x * dt, ay = b.y - ar.v.y * dt, az = b.z - ar.v.z * dt, sx = b.x - ax, sz = b.z - az, sl = sx * sx + sz * sz || 1e-6;
      for (const n of this.archers) {
        if (n.dead || !n.visible) continue;
        const t = clamp(((n.pos.x - ax) * sx + (n.pos.z - az) * sz) / sl, 0, 1), hy = ay + (b.y - ay) * t;
        if (Math.hypot(ax + sx * t - n.pos.x, az + sz * t - n.pos.z) > 0.5 || hy < n.pos.y || hy > n.pos.y + 1.95) continue;
        const head = hy > n.pos.y + 1.5;
        b.set(ax + sx * t, hy, az + sz * t); n.root.attach(ar.m); (n.quills || (n.quills = [])).push(ar.m); A.splice(i, 1);
        g.audio.play('arrowHit'); g.fx.burst('blood', b.x, hy, b.z, head ? 10 : 5); g.fx.flare(b.x, hy, b.z, 0.8, 1, 0.9, 0.8, 0.08); g.hitStop = Math.max(g.hitStop || 0, 0.04);
        n.hp7 -= head || ar.perfect || (ar.power ?? 0) > 0.7 ? 2 : 1;
        if (n.hp7 <= 0) { n.mode = 'idle'; n.pose = null; n.die(); g.ui.hitMark(head ? 'head' : 'kill'); g.quests.notify('event', 'a7archer'); }
        else { n.h.play('stagger', 0.5); g.ui.hitMark(''); }
        break;
      }
    }
  }
  rocks() {
    const g = this.g, c = this.c, p = g.player;
    this.busy = true;
    new Knack(g, { label: 'Hold her off the rocks', verb: 'heave', cfg: A7.knack.rocks, anim: 'shove', animDur: 0.7, sound: 'thud', bad: 'She scrapes paint off her side', at: [...this.S(0.2, -5.4), 0.5], seed: 6,
      onBad: () => { p.cam.shake = 0.35; g.audio.play('split', { vol: 0.5 }); }, onStop: () => { this.busy = false; },
      onDone: () => { p.cam.shake = 0.3; g.audio.play('split'); c.tell(TOLD.rocks.slice(1), 7).then(() => { this.busy = false; g.quests.notify('event', 'a7rocks'); }); } }).start();
  }
  /** Ulf's flagship swings round and rams the Sea-Raven amidships. */
  ram() {
    const c = this.c, S7 = this.S7;
    if (this.slide) return;
    S7.flag.set(true); S7.flag.group.position.set(-52, 0, 20); this.slide = { t: 0 };
    c.sub(TOLD.ram, 6); this.g.audio.play('horn', { freq: 70, vol: 0.6 });
  }
  struck() {
    const g = this.g, c = this.c, p = g.player, y = this.SS.sr.y;
    this.slide = null; this.S7.flag.group.position.set(0, 0, 0);
    p.cam.shake = 0.95; g.hitStop = 0.1; g.audio.play('split'); g.audio.play('thud'); g.audio.play('drum'); p.h.play('stagger', 0.8); g.ui.pulse('white', 0.25);
    for (const dz of [-4, -1, 2, 5]) { const [x, z] = this.S(-2.2, dz); g.fx.burst('chips', x, y + 0.4, z, 16); g.fx.burst('splash', x, y - 0.3, z, 10); }
    for (const id of [...TEN, 'svanhild', 'astrid', 'leif']) { const n = c.npc(id); if (n.visible) n.h.play('stagger', 0.7); }
    g.after(1.6, () => g.quests.notify('event', 'a7ram'));
  }

  // ---- two blades, one sea ----------------------------------------------------------------------------
  playLeif() {
    const g = this.g, c = this.c, p = g.player, u = c.battle.ulf, l = c.npc('leif'), y = this.SS.sr.y, mid = () => [(u.pos.x + l.pos.x) / 2, y + 1.2, (u.pos.z + l.pos.z) / 2];
    if (this.busy) return;
    this.busy = true; p.frozen = true; g.ravens.exitEye(); c.hint(null);
    this.put(u, ...this.S(-5.0, -2.4), Math.PI / 2, 'guard', 'sword'); u.h.hold('L', 'sword'); u.keepDry = true; u.talk = null;
    this.put(l, ...this.S(0.8, -3.6), this.S(-5, -2.4), 'guard', 'seax'); l.h.hold('L', 'sword'); l.keepDry = true;
    const sit = () => { u.stop(); l.stop(); this.put(l, ...this.S(-0.1, -0.8), Math.PI, 'sit', 'seax').h.hold('L', 'sword'); this.put(u, ...this.S(-1.2, -2.8), this.S(0.5, 4), 'guard', 'sword').h.hold('L', 'sword'); u.keepDry = true; u.talk = null; };
    const cam = { both: { from: () => [AT_SEA.x + 3.6, y + 2.4, AT_SEA.z + 1.6], look: mid, fov: 40 }, leif: { from: () => [l.pos.x - 1.5, y + 1.5, l.pos.z + 1.4], look: () => [l.pos.x, y + 1.45, l.pos.z], fov: 30 }, ulf: { from: () => [u.pos.x + 1.9, y + 1.5, u.pos.z + 1.5], look: () => [u.pos.x, y + 1.45, u.pos.z], fov: 32 } };
    const act = {
      leap: () => { u.setLoop(null); u.goTo(...this.S(-1.5, -2.8), { run: true, onArrive: (o) => o.setLoop('guard') }); g.audio.play('shout'); },
      spar: () => { l.fight(u, { lethal: 0 }); u.fight(l, { lethal: 0 }); },
      cut: () => { u.stop(); l.stop(); u.h.play('atk2', 0.5); g.after(0.25, () => { l.h.play('stagger', 0.7); g.audio.play('hurt'); g.fx.burst('blood', l.pos.x, y + 1.4, l.pos.z, 12); }); g.after(1.0, () => { u.h.play('shove', 0.5); g.after(0.25, () => { g.audio.play('thud'); l.h.play('fall', 0.9, { onEnd: sit }); }); }); },
    };
    this.scene(LEIF_LINES, cam, act, () => { sit(); p.frozen = false; this.busy = false; g.quests.notify('event', 'a7leif'); });
  }
  /** Twenty of his best men, as six. */
  board() {
    const g = this.g, c = this.c, R = { ...A7.board };
    this.arm();
    TEN.forEach((id, i) => { const n = this.put(id, ...this.S(0.7 + (i % 2) * 0.7, -5.4 + i * 2.1), -Math.PI / 2, 'guard', 'spear'); n.h.hold('L', 'shield'); n.keepDry = true; });
    c.battle.startSkirmish(TEN, [this.S(-4.6, -4.8), this.S(-4.6, 0.4), this.S(-4.6, 5.2)], R.n, R.atOnce, () => g.quests.notify('event', 'a7held'), R);
    g.ui.questBanner('Two Blades, One Sea', 'hold the Sea-Raven'); c.hint('deckHold');
  }
  duelStart() {
    const g = this.g, c = this.c, p = g.player, u = c.battle.ulf, R = A7.ulf;
    if (this.duel) return;
    g.combat.clear(); c.battle.sk = null; for (const e of c.battle.foes) e.visible = false;
    this.put(u, ...this.S(-3.4, 1.2), [p.pos.x, p.pos.z]); u.keepDry = true; u.talk = null;
    this.arm(); this.duel = { done: false };
    this.champion(u, 'ulf', R, { keepDry: true, where: 'two burning decks', onDown: (e) => this.ulfEnd(e), phases: [{ at: 0.6, use: 0, do: () => c.sub(TOLD.duel[1], 10) }, { at: R.endAt, do: (e) => this.ulfEnd(e) }] });
    c.hint(null); c.sub(TOLD.duel[0], 10); g.after(10.4, () => { if (this.duel && !this.duel.done) this.said(SAID.ulf); });
  }
  /** He goes for the kill, and the black raven comes down out of the smoke. */
  ulfEnd(e) {
    const g = this.g, c = this.c, p = g.player, d = this.duel, y = this.SS.sr.y;
    if (!d || d.done) return;
    d.done = true; g.combat.clear(); e.cb = null; p.frozen = true; p.mortal = false; c.hint(null); g.ravens.exitEye();
    const [ex, ez] = this.S(-0.7, 3.6), [px, pz] = this.S(0.9, 2.3), [rx, rz] = this.S(-2.0, 4.4);
    this.put(e, ex, ez, [px, pz], 'guard', 'sword').h.hold('L', 'sword'); e.keepDry = true; e.talk = null;
    p.teleport(px, pz, Math.atan2(ex - px, ez - pz));
    const onRail = () => { this.fix(e, rx - 0.2, y + 0.36, rz, Math.PI / 2, 'sit'); e.h.hold('R', null); e.h.hold('L', null); };
    const cam = { ulf: { from: () => [AT_SEA.x + 1.4, y + 1.5, AT_SEA.z + 5.6], look: () => [e.pos.x, e.pos.y + (e.mode === 'crew' ? 1.0 : 1.45), e.pos.z], fov: 32 }, both: { from: () => [AT_SEA.x + 3.4, y + 1.9, AT_SEA.z + 5.4], look: () => [(ex + px) / 2, y + 1.2, (ez + pz) / 2], fov: 38 }, eirik: { from: () => [AT_SEA.x - 0.6, y + 1.6, AT_SEA.z + 4.4], look: () => [p.pos.x, y + 1.5, p.pos.z], fov: 30 } };
    const act = {
      sot: () => { e.h.play('atk3', 1.5); g.audio.play('raven'); g.ravens.harry(e, 3); g.after(0.9, () => { e.h.play('stagger', 0.8); g.fx.burst('blood', e.pos.x, y + 1.6, e.pos.z, 4); }); },
      gap: () => { p.h.play('blockhit', 0.35); g.audio.play('steel'); g.fx.burst('spark', (ex + px) / 2, y + 1.3, (ez + pz) / 2, 16); g.after(0.5, () => { p.h.play('atk2', 0.55); g.after(0.24, () => { g.slowT = 0.8; g.audio.play('arrowHit'); g.audio.play('hurt'); g.fx.burst('blood', e.pos.x, y + 1.3, e.pos.z, 20); p.cam.shake = 0.4; e.h.play('stagger', 1.2); }); }); },
      rail: () => { e.setLoop(null); e.goTo(rx + 0.3, rz, { speed: 1.1, onArrive: onRail }); },
      fall: () => { onRail(); this.fall = { t: 0, x: rx - 0.2, y: y + 0.36, z: rz }; },
    };
    this.scene(ULF_END, cam, act, () => {
      e.visible = false; this.fall = null; e.root.rotation.x = 0;
      g.ui.card('Ulf Two-Blades', "The sixth of Håkon's seven champions is dead.", 5).then(() => c.fade(() => { c.setPhase('w7calm', true); p.teleport(...this.S(0.9, 1.4), Math.PI); if (p.equipped !== 'none') p.equip('none'); g.quests.notify('event', 'a7ulf'); }, 1.2, 1.2));
    });
  }

  // =====================================================================================
  steps = {
    'q_firewater.torvald'(r) {
      const g = this.g, c = this.c, p = g.player, go = () => c.say('a7_starfall', null, () => g.quests.notify('event', 'a7starfall'));
      const at = () => { p.teleport(...this.S(0.3, 5.4), 0); if (p.equipped !== 'none') p.equip('none'); };
      if (this.st.flags.a7begun) { c.setPhase('w7dawn', r); at(); return g.after(0.9, go); }
      this.st.flags.a7begun = true; p.frozen = true; // the act opens once, however it is entered
      g.ui.fade(true, 0.6).then(() => g.ui.card('Act Seven', 'The Raven King  ·  Eirik is twenty-nine', 4.6)).then(() => { c.setPhase('w7dawn', true); at(); return g.ui.fade(false, 1.6); })
        .then(() => g.ui.card('Fire on the Water', 'The fleet of the nine oaths approaches Svartøy on a grey morning in early spring. Rain falls on dark water. There are sixty-two ships.', 7)).then(() => { p.frozen = false; go(); });
    },
    'q_firewater.fire'(r) {
      const g = this.g, c = this.c;
      c.setPhase('w7fire', r); this.here(r, this.S(0.3, 4.6), 0); this.arm(); c.hint('fireDeck');
      if (!r) c.tell(TOLD.sea, 9);
    },
    'q_firewater.archers'(r) {
      const g = this.g, c = this.c, p = g.player;
      c.setPhase('w7fire', r); this.here(r, this.S(0.3, 5.6), 0); this.dress('w7fire'); p.mortal = true;
      if (g.inventory.count('arrow') < 24) g.inventory.add('arrow', 24 - g.inventory.count('arrow'), true);
      if (p.equipped !== 'bow') p.equip('bow');
      c.hint('rake'); if (!r) c.tell(TOLD.wall, 8.5);
    },
    'q_firewater.rocks'(r) {
      const g = this.g, c = this.c;
      c.setPhase('w7fire', r); this.here(r, this.S(0.3, 3), Math.PI); this.dress('w7fire'); this.arm(); c.hint(null);
      if (!r) c.tell([...TOLD.battle, TOLD.rocks[0]], 9);
    },
    'q_firewater.ram'(r) { const c = this.c; c.setPhase('w7fire', r); this.here(r, this.S(0.3, 2), Math.PI); this.dress('w7fire'); this.arm(); this.g.after(r ? 1.2 : 0.4, () => this.ram()); },
    'q_blades.leif'(r) { const g = this.g, c = this.c; c.setPhase('w7ulf', r); this.here(r, this.S(0.6, 4.4), Math.PI); this.arm(); g.after(r ? 1 : 0.2, () => this.playLeif()); },
    'q_blades.board'(r) { const c = this.c; c.setPhase('w7ulf', r); this.here(r, this.S(0.6, 3.4), -Math.PI / 2); this.dress('w7ulf'); this.board(); },
    'q_blades.ulf'(r) { const c = this.c; c.setPhase('w7ulf', r); this.here(r, this.S(0.6, 3), -Math.PI / 2); this.dress('w7ulf'); this.duelStart(); },
    'q_blades.kit'(r) { const g = this.g, c = this.c; c.setPhase('w7calm', r); this.here(r, this.S(0.9, 1.4), Math.PI); if (g.player.equipped !== 'none') g.player.equip('none'); g.player.mortal = false; },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase;
    if (!WAR7.includes(ph)) return;
    this.arrows7.update(g.mode === 'play' || g.mode === 'cutscene' ? dt : 0);
    if (!SEA7.includes(ph)) return;
    const u = c.battle.ulf;
    this.crew([c.npc('torvald'), c.npc('guide'), ...c.battle.jarn.slice(0, 3), u, ...(this.archers || [])], dt);
    const dr = this.drift; // the marsh boat slips away from the fleet into the mist
    if (dr && ph === 'w7dawn') {
      dr.t += dt; const k = Math.max(0, dr.t - 6) * 1.5, bx = dr.x - k * 0.95, bz = dr.z - k * 0.32;
      this.boat.position.set(bx, -0.15, bz); this.boat.visible = k < 90;
      c.npc('torvald').pos.set(bx, dr.y, bz); c.npc('guide').pos.set(bx + 2.6, dr.y, bz + 0.9); c.battle.jarn.slice(0, 3).forEach((n, i) => { n.pos.set(bx - 1.6 - i * 1.1, dr.y, bz - 0.5 - i * 0.35); n.visible = k < 90; });
      c.npc('torvald').visible = c.npc('guide').visible = k < 90;
    }
    const sl = this.slide;
    if (sl) { sl.t = Math.min(1, sl.t + dt / 4.2); const k = 1 - (1 - sl.t) * (1 - sl.t), G = this.S7.flag.group.position; G.set(-52 * (1 - k), 0, 20 * (1 - k)); this.fix(u, AT_SEA.x - 4.4 + G.x, this.SS.sr.y + 0.2, AT_SEA.z + 7.4 + G.z, Math.PI / 2, 'guard'); if (sl.t >= 1) this.struck(); }
    const f = this.fall; // backward off the rail, into the sea
    if (f) { f.t += dt; const e = u; e.pos.set(f.x - f.t * 1.6, f.y + f.t * 1.2 - f.t * f.t * 7, f.z); e.root.rotation.x = -Math.min(1.5, f.t * 2.4); if (f.t > 1.25 && !f.wet) { f.wet = true; e.visible = false; e.root.rotation.x = 0; g.audio.play('splash'); g.fx.burst('splash', f.x - 2, 0.1, f.z, 26); } }
    if (g.mode !== 'play') return;
    if (c.battle.sk) c.battle.updateSkirmish(dt);
    if (ph === 'w7fire' || ph === 'w7ulf') { // fire arrows keep coming
      const fw = this.at('q_firewater'), live = this.archers ? this.archers.filter((a) => !a.dead && a.visible).length : 0;
      if ((this.vT -= dt) <= 0 && !this.busy && !g.dialogue.active) { this.vT = A7.volley.every * (ph === 'w7ulf' ? 2.2 : fw === 2 ? 0.8 : 1) * (0.8 + Math.random() * 0.4); this.volley(fw === 2 ? 2 + live * 2 : A7.volley.n, ph === 'w7ulf' ? 0 : 2); }
      if (this.archers && fw === 2) this.hits(dt);
      if (ph === 'w7fire' && fw >= 1 && Math.random() < dt * 0.25) { const [sx, sz] = [this.S7.kinn.x + 3 + Math.random() * 3, this.S7.kinn.z - 6 + Math.random() * 12]; g.fx.burst('splash', sx, 0.1, sz, 10); if (Math.random() < 0.4) g.audio.play('splash', { vol: 0.3 }); } // men leap into the freezing sea
    }
  }
}
