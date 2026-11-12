// Non-player characters: villagers with simple behaviours, scripted companions and raiders with perception.
import * as THREE from 'three';
import { clamp, damp, dampAngle, angleDiff } from '../core/util.js';
import { Humanoid } from './humanoid.js';

const _v = new THREE.Vector3();

export class NPC {
  constructor(game, id, def) {
    this.game = game; this.id = id; this.name = def.name; this.def = def;
    this.h = new Humanoid(def.look);
    this.root = this.h.root; this.pos = this.root.position;
    this.yaw = 0; this.speed = 0; this.mode = 'idle';
    this.walkSpeed = def.walkSpeed ?? 1.5; this.runSpeed = def.runSpeed ?? 3.8;
    this.path = []; this.opts = {}; this.loop = null; this.talk = null; this.talkLabel = null;
    this.dead = false; this.crouch = false; this.faceT = null; this.stuck = 0; this.sidestep = 0; this.sideDir = 1;
    this.raider = null; this.aware = 0; this.fightT = 0; this.partner = null; this.barkT = 0; this.torch = null;
    game.scene.add(this.root);
    this.h.onStep = () => {
      const d = Math.hypot(this.pos.x - game.player.pos.x, this.pos.z - game.player.pos.z);
      if (d < 14) game.audio.play('step', { vol: 0.5 * (1 - d / 14) });
    };
  }
  get visible() { return this.root.visible; }
  set visible(v) { this.root.visible = v; }
  dist(o) { const p = o.pos || o; return Math.hypot(this.pos.x - p.x, this.pos.z - p.z); }

  teleport(x, z, yaw = this.yaw) {
    this.pos.set(x, this.game.world.groundAt(x, z), z);
    this.yaw = yaw; this.root.rotation.y = yaw; this.speed = 0; this.mode = 'idle'; this.path = [];
    this.h.setLocomotion(0, this.crouch); this.h.snap();
    return this;
  }
  setLoop(name) { this.loop = name; return this; }
  stop() { this.mode = 'idle'; this.path = []; return this; }
  face(x, z) { this.faceT = { x, z }; return this; }
  faceEntity(e) { this.faceT = e ? e.pos : null; return this; }
  goTo(x, z, opts = {}) { return this.goPath([[x, z]], opts); }
  goPath(pts, opts = {}) { this.mode = 'goto'; this.path = pts.map((p) => ({ x: p[0], z: p[1] })); this.opts = opts; this.faceT = null; return this; }
  /** Walk a path but wait for the player to keep up. */
  lead(pts, opts = {}) { this.goPath(pts, opts); this.mode = 'lead'; return this; }
  follow(target, opts = {}) { this.mode = 'follow'; this.followT = target; this.opts = opts; this.faceT = null; return this; }
  fight(partner, opts = {}) { this.mode = 'fight'; this.partner = partner; this.opts = opts; this.fightT = 0.4 + Math.random() * 1.2; this.h.setLoop('guard'); return this; }
  say(text, dur) { this.game.ui.subtitle(this.name, text, dur); }
  die(quiet = false) {
    if (this.dead) return;
    this.dead = true; this.mode = 'dead'; this.talk = null; this.loop = 'dead';
    this.h.play('fall', 1.1, { onEnd: () => {} });
    if (!quiet && this.dist(this.game.player) < 30) this.game.audio.play('thud', { vol: 0.6 });
  }
  revive() { this.dead = false; this.mode = 'idle'; this.loop = null; this.h.action = null; }

  /** Step toward a point; returns remaining distance. */
  step(tx, tz, speed, dt) {
    let dx = tx - this.pos.x, dz = tz - this.pos.z; const d = Math.hypot(dx, dz);
    if (d < 1e-4) return 0;
    dx /= d; dz /= d;
    if (this.sidestep > 0) { // steer around whatever blocked us
      this.sidestep -= dt;
      const c = Math.cos(1.2 * this.sideDir), s = Math.sin(1.2 * this.sideDir), nx = dx * c + dz * s, nz = -dx * s + dz * c;
      dx = nx; dz = nz;
    }
    const px = this.pos.x, pz = this.pos.z, st = Math.min(d, speed * dt);
    this.pos.x += dx * st; this.pos.z += dz * st;
    this.game.world.resolve(this.pos, 0.32);
    if (this.keepDry && !this.game.world.walkable(this.pos.x, this.pos.z)) { this.pos.x = px; this.pos.z = pz; }
    const moved = Math.hypot(this.pos.x - px, this.pos.z - pz);
    if (moved < st * 0.35) { this.stuck += dt; if (this.stuck > 0.35) { this.stuck = 0; this.sidestep = 0.7; this.sideDir = -this.sideDir; } }
    else this.stuck = Math.max(0, this.stuck - dt);
    this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 9, dt);
    this.speed = damp(this.speed, moved / Math.max(dt, 1e-4), 10, dt);
    return d - st;
  }

  update(dt) {
    if (!this.root.visible || this.mode === 'spar' || this.mode === 'enemy' || this.mode === 'crew') return; // sparring, combat and the ship drive their own NPCs
    const g = this.game, p = g.player, h = this.h;
    let wantSpeed = 0;
    if (this.dead) { /* stay down */ }
    else if (this.mode === 'goto' || this.mode === 'lead') {
      const o = this.opts, tgt = this.path[0];
      let waiting = false;
      if (this.mode === 'lead') {
        const dp = this.dist(p);
        if (this.waiting ? dp > (o.resume ?? 5) : dp > (o.wait ?? 11)) waiting = true;
        this.waiting = waiting;
        if (waiting) {
          this.yaw = dampAngle(this.yaw, Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z), 6, dt);
          this.barkT -= dt;
          if (this.barkT <= 0 && o.bark) { this.barkT = 9; this.say(o.bark[(Math.random() * o.bark.length) | 0], 2.6); }
        }
      }
      if (tgt && !waiting) {
        wantSpeed = o.speed ?? (o.run ? this.runSpeed : this.walkSpeed);
        const rem = this.step(tgt.x, tgt.z, wantSpeed, dt);
        if (rem < (this.path.length > 1 ? 0.9 : o.stop ?? 0.35)) {
          this.path.shift();
          if (!this.path.length) { this.mode = 'idle'; const f = o.onArrive; this.opts = {}; if (f) f(this); }
        }
      }
    } else if (this.mode === 'follow') {
      const t = this.followT, o = this.opts, d = this.dist(t), keep = o.dist ?? 2.6;
      if (d > keep + 0.6) { wantSpeed = d > keep + 5 ? this.runSpeed + 1.4 : d > keep + 2 ? this.runSpeed : this.walkSpeed; this.step(t.pos.x, t.pos.z, wantSpeed, dt); }
      else this.yaw = dampAngle(this.yaw, Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z), 4, dt);
      if (o.matchCrouch) this.crouch = t.crouch;
    } else if (this.mode === 'fight') {
      const q = this.partner;
      if (q && !q.dead) {
        this.yaw = dampAngle(this.yaw, Math.atan2(q.pos.x - this.pos.x, q.pos.z - this.pos.z), 8, dt);
        const d = this.dist(q);
        if (d > 1.9) { wantSpeed = this.walkSpeed; this.step(q.pos.x, q.pos.z, wantSpeed, dt); }
        this.fightT -= dt;
        if (this.fightT <= 0 && !h.busy && d < 2.4) {
          this.fightT = 1.2 + Math.random() * 1.5;
          const n = 1 + ((Math.random() * 3) | 0);
          h.play('atk' + n, 0.6, { hitAt: 0.4, onHit: () => {
            if (q.dead) return;
            if (q.cb) { g.combat.hurt(q, this.opts.dmg ?? 12, 10); if (this.dist(p) < 34) g.audio.play('steel', { vol: 0.3 }); return; } // an ally's blow
            const near = this.dist(p) < 34;
            if (this.opts.lethal && Math.random() < this.opts.lethal) { q.die(); if (near) g.audio.play('hurt', { vol: 0.5 }); return; }
            q.h.play(Math.random() < 0.7 ? 'parry' : 'stagger', 0.4);
            if (near) g.audio.play(this.opts.wood ? 'clack' : 'steel', { vol: clamp(1 - this.dist(p) / 34, 0.1, 0.8) });
          } });
        }
      } else { this.mode = 'idle'; h.setLoop(null); if (this.opts.onWin) this.opts.onWin(this); }
    } else if (this.raider) wantSpeed = this.updateRaider(dt);

    h.lookAt(!this.dead && (this.mode === 'idle' || this.talking) && this.dist(p) < 7 ? p.headPos : null); // people look at him when he is near
    if (this.mode === 'idle' && !this.dead && this.faceT) this.yaw = dampAngle(this.yaw, Math.atan2(this.faceT.x - this.pos.x, this.faceT.z - this.pos.z), 6, dt);
    if (wantSpeed === 0) this.speed = damp(this.speed, 0, 12, dt);
    this.pos.y = damp(this.pos.y, g.world.groundAt(this.pos.x, this.pos.z), 18, dt);
    this.root.rotation.y = this.yaw;
    const moving = this.speed > 0.15;
    h.setLocomotion(moving ? this.speed : 0, this.crouch);
    if (this.mode !== 'fight') h.setLoop(this.talking && !this.dead ? 'talk' : moving && this.loop !== 'torch' && this.loop !== 'carry' && this.loop !== 'dead' ? null : this.loop);
    h.update(dt);
    if (this.torch) { h.handWorld('L', _v); this.torch.x = _v.x; this.torch.y = _v.y + 0.42; this.torch.z = _v.z; this.torch.on = !this.dead; }
  }

  // ---- raiders -----------------------------------------------------------------------
  makeRaider(patrol, { pause = 2.2, busy = false, shout = null } = {}) {
    this.raider = { patrol, i: 0, wait: 0, pause, shout, state: busy ? 'busy' : 'patrol', lost: 0, last: null, search: 0 };
    this.mode = 'raider'; this.aware = 0;
    return this;
  }
  canSee(p) {
    const g = this.game, dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    const diff = g.settings.difficulty === 'easy' ? 0.75 : g.settings.difficulty === 'hard' ? 1.2 : 1;
    const range = (p.crouch ? 8.5 : 17) * diff * (g.story.hideFactor ? g.story.hideFactor(p) : 1);
    if (d > range) return 0;
    const ang = Math.abs(angleDiff(this.yaw, Math.atan2(dx, dz)));
    if (ang > 1.0 && d > 2.2) return 0;
    if (g.world.losBlocked(this.pos.x, this.pos.z, p.pos.x, p.pos.z, p.crouch ? 0.9 : 1.5)) return 0;
    return d < 5 ? 3.0 : d < 10 ? 1.4 : 0.75;
  }
  updateRaider(dt) {
    const g = this.game, p = g.player, r = this.raider;
    let want = 0;
    if (r.state === 'busy' || !g.story.stealthActive) return 0;
    const see = this.canSee(p), heard = this.dist(p) < p.noise;
    if (see) this.aware += dt * see * (p.crouch ? 0.7 : 1.25);
    else if (heard) this.aware += dt * 0.55;
    else this.aware -= dt * 0.3;
    this.aware = clamp(this.aware, 0, 1.2);
    if (r.state === 'patrol') {
      if (this.aware >= 1) { r.state = 'chase'; r.lost = 0; this.say((r.shout || ['There! The boy!', "Ragnar's whelp — take him!", 'I see him!'])[(Math.random() * 3) | 0], 2.2); g.audio.play('shout'); g.events.emit('spotted', this); }
      else if (this.aware > 0.45) { // suspicious: stop and look
        this.yaw = dampAngle(this.yaw, Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z), 3, dt);
        this.barkT -= dt;
        if (this.barkT <= 0) { this.barkT = 7; this.say(['Hm. Something moved.', 'Who goes there?', 'Thought I heard something...'][(Math.random() * 3) | 0], 2); }
      } else if (r.patrol.length) {
        if (r.wait > 0) { r.wait -= dt; if (r.look !== undefined) this.yaw = dampAngle(this.yaw, r.look, 2.5, dt); }
        else {
          const t = r.patrol[r.i]; want = this.walkSpeed;
          if (this.step(t[0], t[1], want, dt) < 0.5) { r.i = (r.i + 1) % r.patrol.length; r.wait = r.pause * (0.6 + Math.random() * 0.8); r.look = this.yaw + (Math.random() - 0.5) * 2.4; }
        }
      }
    } else if (r.state === 'chase') {
      want = this.runSpeed + 0.7;
      const d = this.step(p.pos.x, p.pos.z, want, dt);
      if (see) { r.lost = 0; r.last = { x: p.pos.x, z: p.pos.z }; } else r.lost += dt;
      if (d < 1.15) { g.story.onCaught(this); r.state = 'patrol'; this.aware = 0; }
      else if (r.lost > 4.5) { r.state = 'search'; r.search = 6; this.say('Where did he go?', 2); }
    } else if (r.state === 'search') {
      r.search -= dt; this.aware = Math.max(this.aware, 0.5);
      if (r.last && this.dist(r.last) > 1) { want = this.walkSpeed * 1.3; this.step(r.last.x, r.last.z, want, dt); }
      else this.yaw += dt * 1.4;
      if (see) { r.state = 'chase'; r.lost = 0; }
      else if (r.search <= 0) { r.state = 'patrol'; this.aware = 0.2; }
    }
    return want;
  }
}
