// Melee combat against real opponents: health, guard (posture), telegraphed attacks, and simple
// group tactics (only one or two attack at a time; the rest circle). Enemies are ordinary NPCs whose
// `mode` is 'enemy'; this system drives them.
import * as THREE from 'three';
import { clamp, damp, dampAngle, angleDiff } from '../core/util.js';

const _v = new THREE.Vector3();

export class Combat {
  constructor(game) {
    this.g = game; this.enemies = []; this.target = null; this.harryCd = 0; this.active = false;
    game.events.on('playerSwing', (n, heavy) => this.playerSwing(n, heavy));
  }
  /** Turn an NPC into an opponent. Options: hp, dmg, skill (0..1 chance to guard), boss, training, duel (an ally keeping it busy), job, onDown. */
  add(npc, o = {}) {
    npc.mode = 'enemy'; npc.talk = null; npc.dead = false;
    npc.cb = Object.assign({ hp: 110, dmg: 15, skill: 0.55, state: 'approach', t: 0, posture: 0, strafe: Math.random() < 0.5 ? 1 : -1, reach: 2.1 }, o);
    npc.cb.maxHp = npc.cb.hp;
    npc.h.setLoop('guard');
    this.enemies.push(npc); this.active = true;
    return npc;
  }
  alive() { return this.enemies.filter((e) => !e.dead && !e.cb.out); }
  clear() { this.enemies = []; this.target = null; this.active = false; this.g.player.target = null; this.g.ui.setTarget(null); }
  attackers() { return this.enemies.filter((e) => !e.dead && (e.cb.state === 'windup' || e.cb.state === 'strike')).length; }
  maxAttackers() { const d = this.g.settings.difficulty; return d === 'hard' ? 2 : d === 'easy' ? 1 : this.alive().length >= 4 ? 2 : 1; }

  hurt(e, dmg, posture = 0) {
    const c = e.cb, g = this.g;
    if (e.dead || c.out) return;
    c.hp -= dmg; c.posture = Math.min(100, c.posture + posture);
    g.fx.burst('blood', e.pos.x, e.pos.y + 1.2 * e.h.scale, e.pos.z, 5);
    if (c.training) c.hp = Math.max(c.hp, 1);
    if (c.hp <= 0) return this.kill(e);
    if (c.state !== 'strike' && c.state !== 'stagger') e.h.play('stagger', 0.32);
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
    if (c.onDown) { c.out = true; c.onDown(e); } else e.die();
    this.g.events.emit('enemyDown', e);
  }

  /** The player's blade lands (called at the hit frame of the swing). */
  playerSwing(n, heavy) {
    const g = this.g, p = g.player;
    if (!this.active) return;
    const real = p.equipped === 'father_axe';
    const near = this.alive().map((e) => ({ e, d: e.dist(p) })).filter((x) => x.d < 2.45).sort((a, b) => a.d - b.d);
    let hits = 0;
    for (const { e } of near) {
      if (Math.abs(angleDiff(p.yaw, Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z))) > 1.05) continue;
      const c = e.cb, open = ['stagger', 'harried', 'windup', 'strike', 'duel'].includes(c.state);
      if (!heavy && !open && Math.random() < c.skill * 0.62) { // guarded: no damage, but it wears the guard down
        e.h.play('parry', 0.3); g.audio.play(real ? 'steel' : 'clack'); p.cam.shake = 0.08;
        e.h.handWorld('R', _v); g.fx.burst(real ? 'spark' : 'chips', _v.x, _v.y + 0.2, _v.z, 6);
        c.posture = Math.min(100, c.posture + 16); this.checkPosture(e);
      } else {
        let dmg = (real ? 1 : 0.5) * (heavy ? 32 : 12 + n * 2);
        if (real && g.inventory.has('brother_axe')) dmg *= 1.25; // the Left Brother in the off hand
        if (c.state === 'stagger') dmg *= 1.8;
        g.audio.play('arrowHit'); g.audio.play('thud', { vol: 0.5 }); p.cam.shake = heavy ? 0.22 : 0.1;
        const a = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z), k = heavy ? 0.7 : 0.3;
        e.pos.x += Math.sin(a) * k; e.pos.z += Math.cos(a) * k;
        g.events.emit('enemyHit', e, heavy);
        this.hurt(e, dmg, heavy ? (c.boss ? 26 : 38) : c.boss ? 4 : 9);
      }
      if (++hits >= (heavy ? 2 : 1)) break;
    }
  }
  enemyStrike(e) {
    const g = this.g, p = g.player, c = e.cb;
    if (e.dead || c.state !== 'strike') return;
    g.audio.play('whoosh', { vol: 0.6 });
    if (e.dist(p) > c.reach + 0.25 || Math.abs(angleDiff(e.yaw, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z))) > 1.1) return;
    const res = p.receive(e, c.dmg + (c.rage ? 4 : 0));
    if (res === 'parried') {
      c.posture = Math.min(100, c.posture + (c.boss ? 24 : 42)); c.state = 'recover'; c.t = 0.9;
      e.h.action = null; e.h.play('stagger', 0.5); this.checkPosture(e); g.events.emit('parried', e);
    } else if (res === 'blocked') c.posture = Math.min(100, c.posture + 6);
  }
  /** Send the black raven at the current target's face. */
  harry() {
    const g = this.g, e = this.target;
    if (g.ravens.mode !== 'follow' || g.ravens.eye || !e) return;
    if (this.harryCd > 0) { g.ui.toast(`${g.ravens.names()[1]} is not ready`); return; }
    this.harryCd = 14; e.cb.state = 'harried'; e.cb.t = 3.2; e.h.action = null;
    g.ravens.harry(e, 3.2); g.audio.play('raven'); g.events.emit('harried', e);
  }

  think(e, dt) {
    const g = this.g, p = g.player, c = e.cb, h = e.h;
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz) || 1;
    const diff = g.settings.difficulty === 'easy' ? 0.8 : g.settings.difficulty === 'hard' ? 1.25 : 1;
    let mx = 0, mz = 0, speed = 0, face = Math.atan2(dx, dz);
    c.t -= dt;
    if (c.state !== 'stagger') c.posture = Math.max(0, c.posture - 6 * dt);

    if (c.duel && !c.duel.dead && d > 3.2 && c.state !== 'stagger' && c.state !== 'harried') { // busy with an ally
      const q = c.duel, qx = q.pos.x - e.pos.x, qz = q.pos.z - e.pos.z, qd = Math.hypot(qx, qz) || 1;
      c.state = 'duel'; face = Math.atan2(qx, qz);
      if (qd > 2.0) { mx = qx / qd; mz = qz / qd; speed = 3.2; }
      if (c.t <= 0 && qd < 2.6 && !h.busy) {
        c.t = 1.4 + Math.random() * 1.4;
        h.play('atk' + (1 + ((Math.random() * 3) | 0)), 0.7, { hitAt: 0.4, onHit: () => { if (!q.dead) { q.h.play('parry', 0.3); if (e.dist(p) < 30) g.audio.play('steel', { vol: 0.3 }); } } });
      }
    } else {
      if (c.state === 'duel') { c.state = 'circle'; c.t = 0.6; }
      if (c.state === 'approach') {
        if (c.job && !c.job.done && d > 4.5) { // an errand, e.g. firing the barn
          const jx = c.job.x - e.pos.x, jz = c.job.z - e.pos.z, jd = Math.hypot(jx, jz);
          if (jd > 1) { mx = jx / jd; mz = jz / jd; speed = 3.3; face = Math.atan2(jx, jz); }
          else { c.job.t = (c.job.t || 0) + dt; face = Math.atan2(c.job.fx - e.pos.x, c.job.fz - e.pos.z); if (c.job.t > c.job.time) { c.job.done = true; c.job.onDone(e); } }
        } else { mx = dx / d; mz = dz / d; speed = 4.3; if (d < 3.3) { c.state = 'circle'; c.t = 0.5 + Math.random() * 1.2; } }
      } else if (c.state === 'circle') {
        const r = clamp(d - 2.7, -1, 1);
        mx = (dx / d) * r * 0.9 - (dz / d) * c.strafe * 0.75; mz = (dz / d) * r * 0.9 + (dx / d) * c.strafe * 0.75; speed = 1.7;
        if (d > 5.5) c.state = 'approach';
        else if (c.t <= 0) {
          if (this.attackers() < this.maxAttackers() && !p.frozen) { c.state = 'windup'; c.t = 0.9; }
          else { c.t = 0.4 + Math.random() * 0.8; if (Math.random() < 0.3) c.strafe = -c.strafe; }
        }
      } else if (c.state === 'windup') { // step in, then swing
        if (d > 1.75) { mx = dx / d; mz = dz / d; speed = 3.6; }
        if (d <= 1.9 || c.t <= 0) {
          c.state = 'strike';
          const dur = (c.boss ? 1.05 : 1.25) / diff / (c.rage ? 1.25 : 1);
          if (e === this.target) g.ui.alert();
          h.play('atk' + (1 + ((Math.random() * 3) | 0)), dur, {
            hitAt: 0.4, onHit: () => this.enemyStrike(e),
            onEnd: () => { if (c.state === 'strike') { c.state = 'recover'; c.t = (c.rage ? 0.35 : 0.7) + Math.random() * 0.5; } },
          });
        }
      } else if (c.state === 'strike') { if (d > 1.5) { mx = dx / d; mz = dz / d; speed = 1.6; } }
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
    e.yaw = dampAngle(e.yaw, face, c.state === 'strike' ? 5 : 9, dt);
    e.pos.y = damp(e.pos.y, g.world.groundAt(e.pos.x, e.pos.z), 18, dt);
    e.root.rotation.y = e.yaw;
    h.setLocomotion(e.speed > 0.2 ? e.speed : 0, false);
    h.setLoop(c.state === 'stagger' || c.state === 'harried' ? null : 'guard');
    h.update(dt);
  }

  update(dt) {
    const g = this.g, p = g.player;
    if (!this.active) return;
    const alive = this.alive();
    if (g.mode !== 'play') { for (const e of alive) { e.h.setLocomotion(0, false); e.h.update(dt); } return; }
    let best = null, bs = Infinity;
    for (const e of alive) {
      const d = e.dist(p); if (d > 8) continue;
      const s = d + Math.abs(angleDiff(p.cam.yaw, Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z))) * 1.5;
      if (s < bs) { bs = s; best = e; }
    }
    this.target = best; p.target = best;
    for (const e of alive) {
      if (e.cb.boss && !e.cb.rage && e.cb.hp < e.cb.maxHp * 0.5) { e.cb.rage = true; if (e.cb.rageLine) e.say(e.cb.rageLine, 3.5); g.audio.play('shout'); }
      this.think(e, dt);
    }
    g.ui.setTarget(best ? { name: best.name, hp: best.cb.hp / best.cb.maxHp, posture: best.cb.posture / 100, broken: best.cb.state === 'stagger' } : null);
    this.harryCd = Math.max(0, this.harryCd - dt);
    if (g.input.hit('harry')) this.harry();
  }
}
