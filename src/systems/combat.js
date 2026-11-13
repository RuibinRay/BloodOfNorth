// Melee combat against real opponents: health, guard (posture), telegraphed attacks, and simple
// group tactics (only one or two attack at a time; the rest circle). Enemies are ordinary NPCs whose
// `mode` is 'enemy'; this system drives them.
import * as THREE from 'three';
import { clamp, damp, dampAngle, angleDiff } from '../core/util.js';
import { STORM } from '../entities/player.js';

const _v = new THREE.Vector3();

/** A shove through the guard: little harm, but it cannot be blocked and it takes his breath. Used against a man who only blocks. */
const GUARD_BREAK = { id: 'shove', anim: 'shove', dur: 0.85, hitAt: 0.45, dmg: 6, unblockable: true, drain: 35, rest: 0.6 };

export class Combat {
  constructor(game) {
    this.g = game; this.enemies = []; this.target = null; this.harryCd = 0; this.active = false;
    game.events.on('playerSwing', (n, heavy, mod) => this.playerSwing(n, heavy, mod));
    this.t = 0; this.habit = { block: 0, dodge: 0, heavy: 0 };
    game.events.on('swingStart', (heavy) => this.onSwingStart(heavy));
    game.events.on('dodge', () => { this.habit.dodge = Math.min(6, this.habit.dodge + 1); });
    game.events.on('playerBash', () => this.playerBash());
    this.shots = []; this.hazards = []; this.cast = null;
    game.events.on('thunder', () => this.thunder());
    game.events.on('stormStep', (e) => this.stormStepHit(e));
    game.events.on('stormCry', () => this.stormCry());
  }
  /** Champions' skills. A move may also carry: `name` (called out on screen as it starts); `shots` { n, kind: 'arrow' | 'javelin' | 'knife',
   *  gap, dmg, fx } (a volley instead of a blow); `dash` 'flank' | 'behind' | 'back' (where he is when the blow comes; `beat` gives two
   *  footfalls of warning and says which side); `fx` { poison, slow, disarm, blind, noShield: seconds, fury: n } on a hit; `smash`: seconds
   *  a shield stays split after catching it; `guardDrain`: breath a block costs; `needShield`: only a shield stops it; `whiff`: seconds he
   *  is left open if it lands on nothing; `tire`: wind it costs him (opts.wind: he tires, and slows when blown); `taunt` + `say` + `fury`
   *  (words, not a blow: they make Eirik angry unless his guard is up); `trap` { kind, r, sec, dmg } (the ground under Eirik).
   *  Options beyond those above: `range` (the distance he likes), `honor` + `honorLine` (will not strike a man who cannot answer),
   *  `flit` (gone again the moment her blow is thrown), `wind`, `spentLine`. */
  /** Moves (elites): `moves` is a list of { anim, dur, hitAt, dmg, reach?, arc?, unblockable?, aoe?, lunge?, then?, chain? }; `phases` a list of
   *  { at: fraction of health, line, set: {...}, do?(e) } applied once each; `dodge` 0..1 chance to step out of a heavy blow; `smart` lets him
   *  adapt to habits (a guard-break against a man who only blocks, a held swing against one who only rolls); `armor` scales light blows;
   *  `counter` answers a guarded blow at once; `keepAway` (archers) rolls back when closed on. */
  /** Turn an NPC into an opponent. Options: hp, dmg, skill (0..1 chance to guard), boss, training, duel (an ally keeping it busy), job, onDown,
   *  kind: 'archer' (stands off and shoots), 'shield' (cannot be cut from the front until his guard breaks), 'berserk' (no guard, no waiting his turn). */
  add(npc, o = {}) {
    npc.mode = 'enemy'; npc.talk = null; npc.dead = false;
    npc.cb = Object.assign({ hp: 110, dmg: 15, skill: 0.55, state: 'approach', t: 0, posture: 0, strafe: Math.random() < 0.5 ? 1 : -1, reach: 2.1 }, o);
    npc.cb.maxHp = npc.cb.hp; if (npc.cb.kind === 'berserk') npc.cb.skill = 0;
    npc.cb.phase = 0; if (npc.cb.dodge === undefined) npc.cb.dodge = npc.cb.smart ? (npc.cb.boss ? 0.3 : 0.12) : 0;
    npc.h.setLoop('guard');
    this.enemies.push(npc); this.active = true;
    return npc;
  }
  get st() { return this.g.state; }
  alive() { return this.enemies.filter((e) => !e.dead && !e.cb.out); }
  clear() { this.enemies = []; this.target = null; this.active = false; this.cast = null; this.g.player.target = null; this.g.ui.setTarget(null); for (const s of this.shots) { s.on = false; s.mesh.visible = false; } for (const h of this.hazards) h.mesh.visible = false; this.hazards = []; }
  attackers() { return this.enemies.filter((e) => !e.dead && (e.cb.state === 'windup' || e.cb.state === 'strike')).length; }
  maxAttackers() { const d = this.g.settings.difficulty; return d === 'hard' ? 2 : d === 'easy' ? 1 : this.alive().length >= 4 ? 2 : 1; }

  /** o.flinch: false = the blow lands without throwing him off his stroke (a companion's light, quick cuts). */
  hurt(e, dmg, posture = 0, o = {}) {
    const c = e.cb, g = this.g;
    if (e.dead || c.out) return;
    c.hp -= dmg; c.posture = Math.min(100, c.posture + posture);
    g.fx.burst('blood', e.pos.x, e.pos.y + 1.2 * e.h.scale, e.pos.z, 5);
    if (c.training) c.hp = Math.max(c.hp, 1);
    if (c.hp <= 0) return this.kill(e);
    if (o.flinch !== false && c.state !== 'strike' && c.state !== 'stagger') e.h.play('stagger', 0.32);
    this.checkPosture(e);
  }
  checkPosture(e) {
    const c = e.cb;
    if (c.posture < 100 || c.state === 'stagger') return;
    c.state = 'stagger'; c.t = 2.3; e.h.action = null; e.h.play('stagger', 2.3);
    this.g.audio.play('parry'); this.g.ui.toast('Guard broken — strike!');
    this.g.events.emit('postureBroken', e);
  }
  kill(e) {
    const c = e.cb;
    if (this.target === e) this.target = null;
    if (c.onDown) { c.out = true; c.onDown(e); } else e.die(false, true);
    if (!c.training) this.g.state.xp += c.boss ? 25 : 6; // renown for the fallen
    this.g.fx.burst('blood', e.pos.x, e.pos.y + 1.1, e.pos.z, c.boss ? 22 : 10); if (c.boss) { this.g.slowT = Math.max(this.g.slowT || 0, 0.9); this.g.player.cam.kick = -9; }
    this.g.events.emit('enemyDown', e);
  }

  /** The player's blade lands (called at the hit frame of the swing). */
  playerSwing(n, heavy, mod = {}) {
    const g = this.g, p = g.player;
    if (!this.active) return;
    const W = p.weaponDef(), real = W.real, sk = g.skills;
    if (heavy && W.slam && !mod.noSlam) return this.slam(W);
    const near = this.alive().map((e) => ({ e, d: e.dist(p) })).filter((x) => x.d < W.reach + (mod.reach || 0)).sort((a, b) => a.d - b.d);
    const riposte = p.riposteT > 0 || !!mod.pierce; // straight after a parry (or the Turning Blow): this one cannot be guarded
    if (p.riposteT > 0) p.riposteT = 0;
    let hits = 0;
    for (const { e } of near) {
      if (Math.abs(angleDiff(p.yaw, Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z))) > W.arc * (mod.arc || 1)) continue;
      const c = e.cb, open = ['stagger', 'harried', 'windup', 'strike', 'duel'].includes(c.state) || c.openT > 0; // openT: he swung at nothing and is still off balance
      // a shield-bearer facing him turns every blow until his guard is broken or he is caught mid-swing
      const wall = c.kind === 'shield' && !open && !riposte && Math.abs(angleDiff(e.yaw, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z))) < 1.2;
      if (!riposte && !open && (heavy ? wall : wall || Math.random() < c.skill * 0.62)) { // guarded: no damage, but it wears the guard down
        e.h.play('parry', 0.3); g.audio.play(real ? 'steel' : 'clack'); p.cam.shake = heavy ? 0.16 : 0.08;
        e.h.handWorld(wall ? 'L' : 'R', _v); g.fx.burst(real ? 'spark' : 'chips', _v.x, _v.y + 0.2, _v.z, heavy ? 14 : 8); if (real) g.fx.flare(_v.x, _v.y + 0.2, _v.z, heavy ? 1.5 : 0.9);
        c.posture = Math.min(100, c.posture + (heavy && W.breaker ? 100 : (heavy ? 42 : wall ? 10 : 16) * W.posture * (mod.posture || 1))); this.checkPosture(e);
        if (c.counter && c.state !== 'stagger' && (c.counterCd || 0) <= 0) { c.state = 'windup'; c.t = 0.22; c.counterCd = 2.2; } // she turns the blow and answers it // a long axe goes through a shield
        if (heavy && wall && sk.has('b_cleave')) this.hurt(e, W.dmg * 16, 0); // Cleave: half of it gets through
      } else {
        let dmg = W.dmg * (heavy ? 32 : 12 + n * 2) * (mod.dmg || 1);
        if (c.armor && !heavy) dmg *= c.armor; // mail and a thick hide: light blows count for less
        if (!mod.second && p.breakT <= 0 && !p.stormDead) p.ward = Math.min(100, p.ward + (heavy ? 10 : 6)); // landed blows fill the storm bar
        if (p.breakT > 0) { dmg *= 1.35; if (!mod.second) this.arc(e); } // Stormbreak: harder, and a spark jumps to a second man
        if (riposte) g.slowT = Math.max(g.slowT || 0, 0.18);
        if (p.dual()) dmg *= 1.25; // the Left Brother in the off hand
        if (riposte) dmg *= W.riposte * (sk.has('s_answer') ? 1.2 : 1);
        if (p.mist()) dmg *= 1.3;
        if (sk.has('b_warm')) p.stamina = Math.min(100, p.stamina + 3);
        if (W.stop && !heavy && c.state === 'windup' && !c.boss) { c.state = 'recover'; c.t = 0.8; e.h.action = null; } // a spear point stops a swing that has started
        const finish = heavy && c.state === 'stagger'; // a heavy blow on a broken guard ends it
        if (finish) { dmg = c.boss ? dmg * 3 : c.hp + 1; g.slowT = 0.7; p.execT = 0.9; g.audio.play('split'); g.events.emit('finisher', e); if (sk.has('b_harvest')) { p.stamina = Math.min(100, p.stamina + 30); p.health = Math.min(100, p.health + 12); } }
        else if (c.state === 'stagger') dmg *= 1.8;
        g.hitStop = finish ? 0 : heavy ? 0.08 : 0.045;
        g.audio.play('arrowHit'); g.audio.play('thud', { vol: 0.5 }); p.cam.shake = finish ? 0.4 : heavy ? 0.22 : 0.1; p.cam.kick = finish ? -8 : heavy ? -4.5 : -1.6;
        { const hy = e.pos.y + 1.25 * e.h.scale; g.fx.flare(e.pos.x, hy, e.pos.z, finish ? 2.4 : heavy ? 1.6 : 0.9, 1, 0.9, 0.8, 0.09); g.fx.burst('blood', e.pos.x, hy, e.pos.z, finish ? 18 : heavy ? 9 : 3); if (finish) g.fx.ring(e.pos.x, e.pos.y, e.pos.z, { r0: 0.3, r1: 3.4, dur: 0.5, color: 0xffd9a0, a: 0.6 }); }
        const a = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z), k = heavy ? 0.7 : 0.3;
        if (!c.keepDry || g.world.walkable(e.pos.x + Math.sin(a) * k, e.pos.z + Math.cos(a) * k)) { e.pos.x += Math.sin(a) * k; e.pos.z += Math.cos(a) * k; }
        g.events.emit('enemyHit', e, heavy);
        this.hurt(e, dmg, (heavy ? (c.boss ? 26 : 38) : c.boss ? 4 : 9) * W.posture * (mod.posture || 1));
      }
      if (++hits >= W.sweep[heavy ? 1 : 0] + (mod.sweep || 0) + (heavy && sk.has('b_arc') ? 1 : 0)) break;
    }
  }
  /** A maul's heavy blow: the ground takes it, and so does everyone near where it lands. */
  slam(W) {
    const g = this.g, p = g.player, ix = p.pos.x + Math.sin(p.yaw) * 1.7, iz = p.pos.z + Math.cos(p.yaw) * 1.7, iy = g.world.groundAt(ix, iz);
    g.audio.play('thud'); g.audio.play('split'); g.audio.play('drum', { vol: 0.7 }); p.cam.shake = 0.55; g.hitStop = 0.1;
    g.fx.burst('chips', ix, iy + 0.15, iz, 26); g.fx.burst('spark', ix, iy + 0.2, iz, 8); g.fx.burst('dirt', ix, iy + 0.1, iz, 22); g.fx.ring(ix, iy, iz, { r0: 0.4, r1: W.slam + 0.6, dur: 0.42, color: 0xe8d8b8, a: 0.7 }); p.cam.kick = -5;
    for (const e of this.alive()) {
      const d = Math.hypot(e.pos.x - ix, e.pos.z - iz), c = e.cb;
      if (d > W.slam) continue;
      const finish = c.state === 'stagger';
      let dmg = W.dmg * 32 * (d < 1.3 ? 1 : 0.6);
      if (finish) { dmg = c.boss ? dmg * 3 : c.hp + 1; g.slowT = 0.7; p.execT = 0.9; }
      const a = Math.atan2(e.pos.x - ix, e.pos.z - iz), k = 0.9;
      if (!c.keepDry || g.world.walkable(e.pos.x + Math.sin(a) * k, e.pos.z + Math.cos(a) * k)) { e.pos.x += Math.sin(a) * k; e.pos.z += Math.cos(a) * k; }
      if ((c.state === 'windup' || c.state === 'strike') && !c.boss) { c.state = 'recover'; c.t = 1.0; e.h.action = null; }
      g.events.emit('enemyHit', e, true);
      this.hurt(e, dmg, c.kind === 'shield' ? 100 : (c.boss ? 40 : 70));
    }
    p.ward = Math.min(100, p.ward + 12);
  }
  /** Who the camera lock should take: the man nearest the middle of the view; or, changing from `from`, the next man to that `side` of him. */
  pickLock(from, side = 0) {
    const p = this.g.player, yaw = p.cam.yaw;
    const list = this.alive().filter((e) => e !== from && e.dist(p) < 20).map((e) => ({ e, d: e.dist(p), rel: angleDiff(yaw, Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z)) }));
    const fit = side ? list.filter((o) => o.rel * side < 0) : list;
    fit.sort((a, b) => (a.d + Math.abs(a.rel) * 5) - (b.d + Math.abs(b.rel) * 5));
    return fit.length ? fit[0].e : null;
  }
  /** Stormbreak: a spark of lightning from the man just struck to another near him. */
  arc(from) {
    const g = this.g, o = this.alive().filter((x) => x !== from && x.dist(from) < 5.5).sort((a, b) => a.dist(from) - b.dist(from))[0];
    g.fx.burst('spark', from.pos.x, from.pos.y + 1.2, from.pos.z, 8);
    if (!o) return;
    g.fx.bolt(o.pos.x, o.pos.y, o.pos.z, 7); g.audio.play('steel', { vol: 0.5 });
    this.hurt(o, 16, o.cb.boss ? 8 : 22);
  }
  /** Thunder Smash lands: lightning where the axe comes down, and everyone near it pays. */
  thunder() {
    const g = this.g, p = g.player, W = p.weaponDef(), ix = p.pos.x + Math.sin(p.yaw) * 1.5, iz = p.pos.z + Math.cos(p.yaw) * 1.5, iy = g.world.groundAt(ix, iz);
    g.fx.bolt(ix, iy, iz); g.audio.play('thunder'); g.audio.play('split'); p.cam.shake = 0.75; g.hitStop = 0.12; g.fx.burst('chips', ix, iy + 0.15, iz, 22);
    g.fx.burst('dirt', ix, iy + 0.1, iz, 26); g.fx.ring(ix, iy, iz, { r0: 0.5, r1: STORM.smashR + 1, dur: 0.5, color: 0xbfe0ff, a: 0.9 }); g.fx.ring(ix, iy, iz, { r0: 0.2, r1: STORM.smashR * 0.6, dur: 0.3, color: 0xffffff, a: 0.8 }); g.fx.flare(ix, iy + 0.6, iz, 4.5, 0.75, 0.88, 1, 0.14); g.ui.pulse('white', 0.3); p.cam.kick = -7;
    if (!this.active) return;
    for (const e of this.alive()) {
      const d = Math.hypot(e.pos.x - ix, e.pos.z - iz), c = e.cb;
      if (d > STORM.smashR) continue;
      let dmg = STORM.smashDmg * Math.sqrt(W.dmg) * (d < 1.9 ? 1 : 0.65) * (p.breakT > 0 ? 1.35 : 1);
      if (c.state === 'stagger') { dmg = c.boss ? dmg * 2.2 : c.hp + 1; g.slowT = 0.7; p.execT = 0.9; g.events.emit('finisher', e); }
      const a = Math.atan2(e.pos.x - ix, e.pos.z - iz), k = c.boss ? 0.6 : 1.4;
      if (g.world.walkable(e.pos.x + Math.sin(a) * k, e.pos.z + Math.cos(a) * k)) { e.pos.x += Math.sin(a) * k; e.pos.z += Math.cos(a) * k; }
      if (c.state === 'windup' || c.state === 'strike') { c.state = 'recover'; c.t = c.boss ? 0.8 : 1.4; e.h.action = null; } // thunder stops a swing that has started, whoever's it is
      g.events.emit('enemyHit', e, true);
      this.hurt(e, dmg, c.kind === 'shield' ? 100 : c.boss ? 45 : 80);
    }
  }
  /** Storm-Step: the cut as he goes through. */
  stormStepHit(e) {
    const g = this.g, p = g.player;
    if (!this.active || !e || e.dead || e.cb.out) return;
    const c = e.cb;
    if ((c.state === 'windup' || c.state === 'strike') && !c.boss) { c.state = 'recover'; c.t = 0.9; e.h.action = null; }
    g.audio.play('arrowHit'); g.hitStop = 0.06; p.cam.shake = 0.18; g.events.emit('enemyHit', e, false);
    this.hurt(e, STORM.stepDmg * p.weaponDef().dmg * (p.breakT > 0 ? 1.35 : 1), c.boss ? 14 : 30);
  }
  /** Storm-Cry: the blow they were about to throw is gone, and the crew take heart. */
  stormCry() {
    const g = this.g, p = g.player;
    g.audio.play('thunder', { vol: 0.55 }); p.cam.shake = 0.45; g.fx.ring(p.pos.x, p.pos.y, p.pos.z, { r0: 0.6, r1: STORM.cryR, dur: 0.7, color: 0xbfe0ff, a: 0.6 }); p.cam.kick = 4;
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283; g.fx.burst('dust', p.pos.x + Math.cos(a) * 2.2, p.pos.y + 0.2, p.pos.z + Math.sin(a) * 2.2, 2); }
    for (const e of this.alive()) {
      const c = e.cb;
      if (e.dist(p) > STORM.cryR || c.state === 'stagger') continue;
      const mid = c.state === 'windup' || c.state === 'strike';
      if (mid || !c.boss) { c.state = 'recover'; c.t = c.boss ? 0.9 : mid ? 1.7 : 1.2; e.h.action = null; e.h.play('stagger', 0.6); }
      c.posture = Math.min(99, c.posture + (c.boss ? 10 : 30));
    }
    let n = 0;
    for (const m of g.npcs.values()) if (m.hpMax && !m.dead && !m.wounded && m.dist(p) < 16 && m.hp < m.hpMax) { m.hp = Math.min(m.hpMax, m.hp + m.hpMax * 0.3); n++; }
    if (n) g.ui.toast('The crew take heart');
  }
  /** Where a champion is when his blow comes: at Eirik's flank (two blows a side: left, left, right, right), behind him, or back out of reach. */
  dash(e, mv) {
    const g = this.g, p = g.player, c = e.cb, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), rx = -Math.cos(p.yaw), rz = Math.sin(p.yaw);
    let ox, oz;
    if (mv.dash === 'flank') { c.beat = (c.beat || 0) + 1; c.side = ((c.beat - 1) >> 1) % 2 ? 1 : -1; ox = rx * c.side * 1.5 + fx * 0.5; oz = rz * c.side * 1.5 + fz * 0.5; }
    else if (mv.dash === 'behind') { ox = -fx * 1.6; oz = -fz * 1.6; }
    else { const d = e.dist(p) || 1; ox = ((e.pos.x - p.pos.x) / d) * 4.2; oz = ((e.pos.z - p.pos.z) / d) * 4.2; }
    for (const k of [1, 0.7, 0.45]) {
      const x = p.pos.x + ox * k, z = p.pos.z + oz * k;
      if (!g.world.walkable(x, z) || g.world.pointInBox(x, z, 0.35) || Math.abs(g.world.groundAt(x, z) - p.pos.y) > 1.2) continue;
      g.fx.burst('dust', e.pos.x, e.pos.y + 0.3, e.pos.z, 5);
      e.pos.x = x; e.pos.z = z; e.pos.y = g.world.groundAt(x, z); e.yaw = Math.atan2(p.pos.x - x, p.pos.z - z); e.root.rotation.y = e.yaw;
      g.fx.burst('dust', x, e.pos.y + 0.3, z, 5); g.audio.play('whoosh', { vol: 0.5 });
      break;
    }
  }
  /** What a champion's blow leaves on him. */
  afflict(fx) {
    const p = this.g.player, note = { poison: 'Poison in the wound', slow: 'Mud to the knee', disarm: 'Your weapon is hooked out of your hand', blind: 'Mud in your eyes', noShield: 'Your shield is split' };
    for (const k in note) if (fx[k]) p.afflict(k, fx[k], note[k]);
    if (fx.fury) p.fury = Math.min(100, p.fury + fx.fury);
    if (fx.drain) p.stamina = Math.max(0, p.stamina - fx.drain);
  }
  /** Bad ground: stake pits and sucking mud. It slows whoever stands in it, and stakes cut. */
  trap(x, z, o) {
    const g = this.g, m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: o.kind === 'stakes' ? 0x4a3a28 : o.kind === 'fire' ? 0xff7a2a : 0x2a2418, transparent: true, opacity: o.kind === 'fire' ? 0.28 : 0.5, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.scale.setScalar(o.r); m.position.set(x, Math.max(0.02, g.world.groundAt(x, z)) + 0.07, z); m.renderOrder = 2; g.scene.add(m);
    this.hazards.push({ x, z, r: o.r, t: o.sec ?? 12, arm: o.arm ?? 0.8, kind: o.kind, dmg: o.dmg || 0, mesh: m, tick: 0 });
  }
  updateHazards(dt) {
    const g = this.g, p = g.player;
    for (const h of this.hazards) {
      h.t -= dt; h.arm -= dt; h.tick -= dt;
      if (h.arm > 0 || h.t <= 0 || p.iframes > 0 || Math.hypot(p.pos.x - h.x, p.pos.z - h.z) > h.r) continue;
      if (h.kind !== 'fire') p.afflict('slow', 0.5, h.kind === 'stakes' ? 'Stakes under the water' : 'Mud to the knee');
      if (h.dmg) p.health = Math.max(p.mortal ? 1 : 2, p.health - h.dmg * dt);
      if (h.tick <= 0) { h.tick = 0.45; g.fx.burst(h.kind === 'stakes' ? 'blood' : h.kind === 'fire' ? 'spark' : 'splash', p.pos.x, p.pos.y + 0.3, p.pos.z, 4); if (h.kind === 'fire') g.audio.play('hurt', { vol: 0.4 }); }
    }
    for (const h of this.hazards) if (h.t <= 0) { g.scene.remove(h.mesh); h.mesh.geometry.dispose(); }
    this.hazards = this.hazards.filter((h) => h.t > 0);
  }
  /** What he throws next. An elite draws from his own moves; a clever man shoves through the guard of someone who only blocks. */
  pickMove(e, d) {
    const c = e.cb;
    if (c.smart && this.habit.block >= 3 && !c.training) { this.habit.block = 0; return GUARD_BREAK; }
    if (!c.moves) return null;
    const used = c.used || (c.used = {}), fit = c.moves.filter((m) => (!m.min || d >= m.min) && !(m.uses && (used[m.id] || 0) >= m.uses));
    const pick = fit[(Math.random() * fit.length) | 0] || c.moves[0];
    if (pick.uses) used[pick.id] = (used[pick.id] || 0) + 1; // some things a man only says twice
    return pick;
  }
  strike(e, mv, diff = 1) {
    const g = this.g, c = e.cb, h = e.h;
    c.state = 'strike'; c.move = mv; c.landed = false;
    if (mv && mv.name) this.cast = { e, name: mv.name, t: 2.4 };
    if (mv && mv.dash) this.dash(e, mv);
    if (c.wind !== undefined && mv) { // a man who throws everything into every blow runs out of it
      c.wind = Math.max(0, c.wind - (mv.tire ?? 7));
      if (c.wind < 28 && !c.spent) { c.spent = true; c.slow = 1.4; c.restAdd = 1.0; if (c.spentLine) e.say(c.spentLine, 4); g.ui.toast(`${e.name} is blown. Now.`); }
    }
    const hold = c.smart && this.habit.dodge >= 3 ? 1.22 : 1; // against a man who always rolls: hold the swing a beat longer
    const dur = (mv ? mv.dur : c.boss ? 1.05 : 1.25) * hold / diff / (c.rage || c.kind === 'berserk' ? 1.25 : 1) * (c.slow || 1);
    if (mv && mv.beat) { for (const k of [0.16, 0.32]) g.after(dur * mv.hitAt * k * 2.4, () => g.audio.play('step', { vol: 1.6 })); g.ui.warn(c.side > 0 ? 'r' : 'l'); }
    if (hold > 1) this.habit.dodge -= 1;
    if (e === this.target || (mv && (mv.unblockable || mv.aoe))) g.ui.alert(!!(mv && (mv.unblockable || mv.aoe)));
    h.play(mv ? mv.anim : 'atk' + (1 + ((Math.random() * 3) | 0)), dur, {
      hitAt: mv ? mv.hitAt : 0.4, onHit: () => this.enemyStrike(e),
      onEnd: () => {
        if (c.state !== 'strike') return;
        const next = mv && mv.then && Math.random() < (mv.chain ?? 0.85) && c.moves && c.moves.find((m) => m.id === mv.then);
        if (next && !e.dead) this.strike(e, next, diff); // the next blow of a string
        else {
          c.state = 'recover'; c.t = ((mv && mv.rest) || ((c.rage ? 0.35 : 0.7) + Math.random() * 0.5)) + (c.restAdd || 0);
          if (mv && mv.whiff && !c.landed) { c.t = Math.max(c.t, mv.whiff); c.openT = mv.whiff; h.play('stagger', Math.min(1.2, mv.whiff * 0.6)); } // all of it into empty air
          else if (c.flit) { c.state = 'evade'; c.t = 0.34; }
        }
      },
    });
  }
  /** Eirik has begun a swing: a quick man steps out of a heavy one. */
  onSwingStart(heavy) {
    const p = this.g.player;
    if (!this.active) return;
    if (heavy) this.habit.heavy = Math.min(6, this.habit.heavy + 1);
    for (const e of this.alive()) {
      const c = e.cb;
      if (!heavy || !c.dodge || e.dist(p) > 3.3 || !['circle', 'recover', 'approach'].includes(c.state) || c.evadeCd > 0) continue;
      if (Math.random() < c.dodge + (c.smart && this.habit.heavy >= 3 ? 0.3 : 0)) { c.state = 'evade'; c.t = 0.42; c.evadeCd = 2.4; e.h.play('sidestep', 0.3); this.habit.heavy = Math.max(0, this.habit.heavy - 2); }
    }
  }
  /** The white raven calls when a blow is coming from where Eirik is not looking. */
  threat(e) {
    const g = this.g, p = g.player;
    if (g.ravens.mode !== 'follow' || this.t - (this.warnT || -9) < 1.4) return;
    const rel = angleDiff(p.cam.yaw, Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z));
    if (Math.abs(rel) < 1.15) return; // he can see it himself
    this.warnT = this.t; g.audio.play('raven', { vol: 0.5 }); g.ui.warn(Math.abs(rel) > 2.4 ? 'b' : rel > 0 ? 'l' : 'r');
  }
  enemyStrike(e) {
    const g = this.g, p = g.player, c = e.cb;
    if (e.dead || c.state !== 'strike') return;
    g.audio.play('whoosh', { vol: 0.6 });
    const mv = c.move, dmg = (mv ? mv.dmg : c.dmg) + (c.rage ? 4 : 0);
    if (mv && mv.taunt) { // words, not a blow: they land on a man whose guard is down
      c.landed = true; if (mv.say) e.say(mv.say, 4.5);
      if (p.blocking) g.ui.toast('You keep your head'); else p.fury = Math.min(100, p.fury + (mv.fury || 50));
      return;
    }
    if (mv && mv.shots) { c.landed = true; for (let i = 0; i < mv.shots.n; i++) g.after(i * (mv.shots.gap ?? 0.18), () => this.shoot(e, mv.shots)); return; }
    if (mv && mv.trap) { c.landed = true; this.trap(p.pos.x, p.pos.z, mv.trap); return; }
    let res;
    if (mv && mv.aoe) { // a blow into the ground: everyone inside the ring, whichever way he faces; it cannot be blocked
      const ix = e.pos.x + Math.sin(e.yaw) * 1.5, iz = e.pos.z + Math.cos(e.yaw) * 1.5;
      { const iy = g.world.groundAt(ix, iz); g.fx.burst('chips', ix, iy + 0.15, iz, 24); g.fx.burst('dirt', ix, iy + 0.1, iz, 20); g.fx.ring(ix, iy, iz, { r0: 0.4, r1: mv.aoe + 0.4, dur: 0.42, color: 0xff8a50, a: 0.85 }); }
      g.audio.play('thud'); g.audio.play('drum', { vol: 0.6 }); p.cam.shake = Math.max(p.cam.shake, 0.3);
      if (Math.hypot(p.pos.x - ix, p.pos.z - iz) > mv.aoe) return;
      res = p.receive(e, dmg, { unblockable: true });
    } else {
      if (e.dist(p) > ((mv && mv.reach) || c.reach) + 0.25 || Math.abs(angleDiff(e.yaw, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z))) > ((mv && mv.arc) || 1.1)) return;
      res = p.receive(e, dmg, { unblockable: !!(mv && (mv.unblockable || (mv.needShield && !p.hasShield()))) });
    }
    c.landed = res !== 'dodged';
    if (mv && mv.fx && res === 'hit') this.afflict(mv.fx);
    if (mv && mv.smash && (res === 'blocked' || res === 'hit' || res === 'parried') && p.hasShield()) p.afflict('noShield', mv.smash, 'Your shield is split');
    if (mv && mv.guardDrain && res === 'blocked') p.stamina = Math.max(0, p.stamina - mv.guardDrain);
    if (mv && mv.hook && (res === 'blocked' || res === 'hit')) p.afflict('disarm', mv.hook, 'Your weapon is hooked out of your hand');
    if (res === 'blocked') this.habit.block = Math.min(6, this.habit.block + 1);
    if (mv && mv.drain && res === 'hit') { p.stamina = Math.max(0, p.stamina - mv.drain); this.habit.block = 0; } // a shove through the guard takes his breath
    if (res === 'hit' && mv && mv.unblockable && !this.st.flags.redHint) { this.st.flags.redHint = true; g.ui.hint('A red flash means the blow cannot be blocked. Step out of it with {dodge}, or turn it with the Stormguard ({ward}) if Eirik is calm and the storm bar is half full.'); }
    if (res === 'warded') { // the Stormguard: the blow comes back up his own arm
      c.state = 'recover'; c.t = 1.5; e.h.action = null; e.h.play('stagger', 0.9);
      g.fx.burst('spark', e.pos.x, e.pos.y + 1.3, e.pos.z, 14);
      this.hurt(e, 18, c.boss ? 45 : 80);
    } else if (res === 'parried') {
      c.posture = Math.min(100, c.posture + (c.parryBreak || (c.boss ? 24 : 42))); c.state = 'recover'; c.t = 0.9;
      e.h.action = null; e.h.play('stagger', 0.5); this.checkPosture(e); g.events.emit('parried', e);
    } else if (res === 'blocked') c.posture = Math.min(100, c.posture + 6);
  }
  /** The shield boss in a man's chest: stops a swing that has started, and wears his guard. */
  playerBash() {
    const g = this.g, p = g.player;
    if (!this.active) return;
    const e = this.alive().map((x) => ({ x, d: x.dist(p) })).filter((o) => o.d < 2.3 && Math.abs(angleDiff(p.yaw, Math.atan2(o.x.pos.x - p.pos.x, o.x.pos.z - p.pos.z))) < 1.0).sort((a, b) => a.d - b.d)[0];
    if (!e) return;
    const c = e.x.cb;
    g.audio.play('thud'); p.cam.shake = 0.14; g.hitStop = 0.05;
    if (c.state === 'windup' || c.state === 'strike') { c.state = 'recover'; c.t = 0.9; e.x.h.action = null; }
    this.hurt(e.x, 4, (c.boss ? 14 : 30) * (g.skills.has('s_boss') ? 1.7 : 1));
    const a = Math.atan2(e.x.pos.x - p.pos.x, e.x.pos.z - p.pos.z);
    if (!c.keepDry || g.world.walkable(e.x.pos.x + Math.sin(a) * 0.5, e.x.pos.z + Math.cos(a) * 0.5)) { e.x.pos.x += Math.sin(a) * 0.5; e.x.pos.z += Math.cos(a) * 0.5; }
  }
  /** An archer looses at where Eirik will be in a moment. */
  shoot(e, o = {}) {
    const g = this.g, p = g.player;
    if (e.dead || !this.active) return;
    let s = this.shots.find((x) => !x.on);
    if (!s) {
      if (this.shots.length >= 12) return;
      const geo = new THREE.CylinderGeometry(0.014, 0.014, 0.78, 4); geo.rotateX(Math.PI / 2);
      s = { mesh: new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2a2018 })), a: new THREE.Vector3(), b: new THREE.Vector3(), on: false };
      g.scene.add(s.mesh); this.shots.push(s);
    }
    e.h.handWorld('L', _v); s.a.copy(_v);
    const T = e.dist(p) / 24 + 0.2, lead = p.moving ? p.speed * T * 0.75 : 0;
    s.b.set(p.pos.x + Math.sin(p.yaw) * lead + (Math.random() - 0.5) * 0.7, p.pos.y + 1.1, p.pos.z + Math.cos(p.yaw) * lead + (Math.random() - 0.5) * 0.7);
    s.t = 0; s.T = T; s.on = true; s.from = e; s.mesh.visible = true; s.dmg = o.dmg ?? (e.cb ? e.cb.dmg : 9); s.fx = o.fx || null;
    s.mesh.scale.set(o.kind === 'javelin' ? 2.4 : 1, o.kind === 'javelin' ? 2.4 : 1, o.kind === 'javelin' ? 2.2 : o.kind === 'knife' ? 0.45 : 1);
    g.audio.play('bow', { vol: 0.6 }); if (e.dist(p) < 30) g.ui.alert(); this.threat(e);
  }
  updateShots(dt) {
    const g = this.g, p = g.player;
    for (const s of this.shots) {
      if (!s.on) continue;
      s.t += dt;
      const u = Math.min(1, s.t / s.T), at = (k) => _v.set(s.a.x + (s.b.x - s.a.x) * k, s.a.y + (s.b.y - s.a.y) * k + s.T * 5 * k * (1 - k), s.a.z + (s.b.z - s.a.z) * k);
      s.mesh.position.copy(at(u)); s.mesh.lookAt(at(Math.min(1.02, u + 0.04)));
      if (u < 1) continue;
      s.on = false; s.mesh.visible = false;
      if (Math.hypot(p.pos.x - s.b.x, p.pos.z - s.b.z) < 0.95) { if (p.receiveArrow(s.from.pos, s.dmg) === 'hit' && s.fx) this.afflict(s.fx); }
      else g.fx.burst('chips', s.b.x, s.b.y - 0.9, s.b.z, 3);
    }
  }
  /** Send the black raven at the current target's face. */
  harry() {
    const g = this.g, e = this.target;
    if (g.ravens.mode !== 'follow' || g.ravens.eye || !e) return;
    if (this.harryCd > 0) { g.ui.toast(`${g.ravens.names()[1]} is not ready`); return; }
    const lord = g.skills.has('w_raven'), hold = lord ? 5 : 3.2;
    this.harryCd = lord ? 8 : 14; e.cb.state = 'harried'; e.cb.t = hold; e.h.action = null;
    g.ravens.harry(e, hold); g.audio.play('raven'); g.events.emit('harried', e);
  }

  think(e, dt) {
    const g = this.g, p = g.player, c = e.cb, h = e.h;
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1;
    const diff = g.settings.difficulty === 'easy' ? 0.8 : g.settings.difficulty === 'hard' ? 1.25 : 1;
    let mx = 0, mz = 0, speed = 0, face = Math.atan2(dx, dz);
    const x0 = e.pos.x, z0 = e.pos.z;
    c.t -= dt;
    if (c.state !== 'stagger') c.posture = Math.max(0, c.posture - 6 * dt);

    const busy = c.duel && !c.duel.dead && !c.duel.wounded;
    c.counterCd = (c.counterCd || 0) - dt; c.evadeCd = (c.evadeCd || 0) - dt; c.openT = (c.openT || 0) - dt;
    if (c.wind !== undefined && c.state !== 'strike') c.wind = Math.min(100, c.wind + 1.2 * dt);
    if (c.kind === 'archer' && c.keepAway && !busy && d <= 5.5 && c.evadeCd <= 0 && c.state !== 'stagger' && c.state !== 'harried' && c.state !== 'evade') { c.state = 'evade'; c.t = 0.75; c.evadeCd = 3.2; h.play('dodge', 0.5); }
    if (c.kind === 'archer' && !busy && d > 5.5 && c.state !== 'stagger' && c.state !== 'harried' && c.state !== 'evade') { // stands off and shoots; up close he fights like anyone
      c.state = 'ranged';
      if (d > 24) { mx = dx / d; mz = dz / d; speed = 3.4; c.aimT = 0; }
      else if ((c.aimT = (c.aimT || 0) + dt) > (c.aimEvery || 2.7) && !h.busy && !p.frozen) {
        c.aimT = Math.random() * 0.6;
        const n = (c.shotN = (c.shotN || 0) + 1), v = c.volley && n % c.volley.every === 0 ? c.volley : c.pin && n % c.pin.every === 0 ? c.pin : null; // a champion archer's named shots
        if (v) this.cast = { e, name: v.name, t: 2.4 };
        h.play('shoot', 0.4, { hitAt: 0.3, onHit: () => { if (v) for (let i = 0; i < (v.n || 1); i++) g.after(i * 0.2, () => this.shoot(e, v)); else this.shoot(e); } });
      }
    } else if (busy && (d > 3.2 || c.taunt) && c.state !== 'stagger' && c.state !== 'harried') { // busy with an ally (taunt: called onto a shield, he stays there even beside Eirik)
      const q = c.duel, qx = q.pos.x - e.pos.x, qz = q.pos.z - e.pos.z, qd = Math.hypot(qx, qz) || 1;
      c.state = 'duel'; face = Math.atan2(qx, qz);
      if (qd > 2.0) { mx = qx / qd; mz = qz / qd; speed = 3.2; }
      if (c.t <= 0 && qd < 2.6 && !h.busy) {
        c.t = 1.4 + Math.random() * 1.4;
        h.play('atk' + (1 + ((Math.random() * 3) | 0)), 0.7, { hitAt: 0.4, onHit: () => {
          if (q.dead || q.wounded) return;
          const near = e.dist(p) < 30;
          if (q.hpMax && Math.random() >= (q.guard ?? 0.55)) { // an ally who can be hurt (the crew, a companion): the blows their guard does not turn get through
            q.hp -= c.dmg * 0.6; q.h.play('stagger', 0.35); if (near) g.audio.play('hurt', { vol: 0.35 });
            if (q.hp <= 0) g.events.emit('allyDown', q, e);
          } else { q.h.play('parry', 0.3); if (near) g.audio.play('steel', { vol: 0.3 }); }
        } });
      }
    } else {
      if (c.state === 'duel' || c.state === 'ranged') { c.state = 'circle'; c.t = 0.6; }
      if (c.state === 'approach') {
        if (c.job && !c.job.done && d > 4.5) { // an errand, e.g. firing the barn
          const jx = c.job.x - e.pos.x, jz = c.job.z - e.pos.z, jd = Math.hypot(jx, jz);
          if (jd > 1) { mx = jx / jd; mz = jz / jd; speed = 3.3; face = Math.atan2(jx, jz); }
          else { c.job.t = (c.job.t || 0) + dt; face = Math.atan2(c.job.fx - e.pos.x, c.job.fz - e.pos.z); if (c.job.t > c.job.time) { c.job.done = true; c.job.onDone(e); } }
        } else { mx = dx / d; mz = dz / d; speed = 4.3; if (d < (c.range || 2.7) + 0.6) { c.state = 'circle'; c.t = 0.5 + Math.random() * 1.2; } }
      } else if (c.state === 'circle') {
        const r = clamp(d - (c.range || 2.7), -1, 1);
        mx = (dx / d) * r * 0.9 - (dz / d) * c.strafe * 0.75; mz = (dz / d) * r * 0.9 + (dx / d) * c.strafe * 0.75; speed = 1.7;
        if (d > 5.5) c.state = 'approach';
        else if (c.t <= 0) {
          if (c.honor && (p.stamina < 6 || p.fx.disarm > 0 || (p.h.action && p.h.action.name === 'stagger'))) { c.t = 0.8; if (!c.honorSaid) { c.honorSaid = true; if (c.honorLine) e.say(c.honorLine, 3.5); } } // he will not strike a man who cannot answer
          else if ((this.attackers() < this.maxAttackers() || c.kind === 'berserk') && !p.frozen) { c.state = 'windup'; c.t = c.kind === 'berserk' ? 0.6 : 0.9; this.threat(e); } // a berserker does not wait his turn
          else { c.t = 0.4 + Math.random() * 0.8; if (Math.random() < 0.3) c.strafe = -c.strafe; }
        }
      } else if (c.state === 'windup') { // step in, then swing
        if (d > c.reach - 0.35) { mx = dx / d; mz = dz / d; speed = 3.6; }
        if (d <= c.reach - 0.2 || c.t <= 0) this.strike(e, this.pickMove(e, d), diff);
      } else if (c.state === 'strike') { const lu = c.move && c.move.lunge; if (d > 1.5) { mx = dx / d; mz = dz / d; speed = lu || 1.6; } }
      else if (c.state === 'evade') { // out of the way of a heavy blow, or (an archer) out of reach
        mx = -dx / d - (dz / d) * c.strafe * 0.6; mz = -dz / d + (dx / d) * c.strafe * 0.6; speed = 5.4;
        if (c.t <= 0) { c.state = 'circle'; c.t = 0.25; }
      }
      else if (c.state === 'recover') { if (c.t <= 0) { c.state = 'circle'; c.t = (c.rage ? 0.5 : 1.0) + (Math.random() * 1.4) / diff; } }
      else if (c.state === 'stagger') { face = e.yaw; if (c.t <= 0) { c.state = 'circle'; c.posture = 0; c.t = 0.8; } }
      else if (c.state === 'harried') { face = e.yaw + 0.5; if (c.t <= 0) { c.state = 'circle'; c.t = 0.6; } else if (!h.busy) h.play('stagger', 0.5); }
    }

    const ml = Math.hypot(mx, mz);
    if (ml > 0.01 && speed > 0) {
      const px = e.pos.x, pz = e.pos.z;
      e.pos.x += (mx / ml) * speed * dt; e.pos.z += (mz / ml) * speed * dt;
      g.world.resolve(e.pos, 0.34);
      e.speed = damp(e.speed, Math.hypot(e.pos.x - px, e.pos.z - pz) / Math.max(dt, 1e-4), 10, dt);
    } else e.speed = damp(e.speed, 0, 12, dt);
    for (const o of this.enemies) { // do not stack on each other
      if (o === e || o.dead) continue;
      const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, od = Math.hypot(ox, oz);
      if (od < 0.9 && od > 1e-3) { e.pos.x += (ox / od) * (0.9 - od) * 0.5; e.pos.z += (oz / od) * (0.9 - od) * 0.5; }
    }
    if (d < 0.75) { e.pos.x -= (dx / d) * (0.75 - d); e.pos.z -= (dz / d) * (0.75 - d); }
    if (c.keepDry && !g.world.walkable(e.pos.x, e.pos.z)) { e.pos.x = x0; e.pos.z = z0; } // on a deck: the rail is the edge of the world
    e.yaw = dampAngle(e.yaw, face, c.state === 'strike' ? 5 : 9, dt);
    e.pos.y = damp(e.pos.y, g.world.groundAt(e.pos.x, e.pos.z), 18, dt);
    e.root.rotation.y = e.yaw;
    h.lookAt(c.state === 'duel' ? null : p.headPos); h.breath = 1.8;
    h.setLocomotion(e.speed > 0.2 ? e.speed : 0, false);
    h.setLoop(c.state === 'stagger' || c.state === 'harried' ? null : c.state === 'ranged' ? 'aim' : 'guard'); h.param = c.state === 'ranged' ? Math.min(1, (c.aimT || 0) / 2.7) : 0;
    h.update(dt);
  }

  update(dt) {
    const g = this.g, p = g.player;
    if (!this.active) return;
    this.t += dt;
    this.updateShots(g.mode === 'play' ? dt : 0); if (g.mode === 'play') this.updateHazards(dt);
    if (this.cast && ((this.cast.t -= dt) <= 0 || this.cast.e.dead)) this.cast = null;
    const alive = this.alive();
    if (g.mode !== 'play') { for (const e of alive) { e.h.setLocomotion(0, false); e.h.update(dt); } return; }
    let best = null, bs = Infinity;
    for (const e of alive) {
      const d = e.dist(p); if (d > 8) continue;
      const s = d + Math.abs(angleDiff(p.cam.yaw, Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z))) * 1.5;
      if (s < bs) { bs = s; best = e; }
    }
    if (p.lock && !p.lock.dead && !p.lock.cb.out) best = p.lock; // a locked man stays the target whoever else is nearer
    this.target = best; p.target = best;
    for (const k in this.habit) this.habit[k] = Math.max(0, this.habit[k] - dt * 0.12); // habits fade if he changes his ways
    for (const e of alive) {
      const c = e.cb, ph = c.phases && c.phases[c.phase];
      if (ph && c.hp < c.maxHp * ph.at) { // the fight changes
        c.phase++; Object.assign(c, ph.set || {}); c.state = 'recover'; c.t = 1.4; c.posture = 0; e.h.action = null; e.h.play('cheer', 1.0);
        if (ph.line) e.say(ph.line, 4); g.audio.play('shout'); g.audio.play('horn', { freq: 90, vol: 0.4 });
        if (ph.do) ph.do(e);
      }
      if (!e.cb || e.cb.out) continue; // what the change did ended the fight
      if (e.cb.boss && !e.cb.rage && e.cb.hp < e.cb.maxHp * 0.5) { e.cb.rage = true; if (e.cb.rageLine) e.say(e.cb.rageLine, 3.5); g.audio.play('shout'); }
      this.think(e, dt);
    }
    if (best && !best.cb) best = this.target = p.target = null; // the fight ended inside this frame
    g.ui.setTarget(best ? { name: best.name, hp: best.cb.hp / best.cb.maxHp, posture: best.cb.posture / 100, broken: best.cb.state === 'stagger', skill: this.cast ? (this.cast.e === best ? this.cast.name : `${this.cast.e.name}: ${this.cast.name}`) : '' } : null);
    this.harryCd = Math.max(0, this.harryCd - dt);
    if (g.input.hit('harry')) this.harry();
  }
}
