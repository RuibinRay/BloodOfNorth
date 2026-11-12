// Act II's hands-on work: Knack (a timed stroke: digging, setting posts, keeping a straight face), Bout (answer a
// shouted call in time: wrestling, the shield wall) and Dive (swim down to a wreck and bring silver up on one breath).
import * as THREE from 'three';
import { clamp, damp } from '../core/util.js';
import { M, sphere, box, tint } from '../world/geo.js';
import { Activity } from './activities.js';

const diffMul = (g) => (g.settings.difficulty === 'easy' ? 1.35 : g.settings.difficulty === 'hard' ? 0.75 : 1);

// ---------------------------------------------------------------------------------------
// Knack: stop the swinging mark inside the gold. `cfg` is [good strokes needed, speed, width of the gold].
// ---------------------------------------------------------------------------------------
export class Knack extends Activity {
  constructor(game, o) { super(game); Object.assign(this, { anim: 'chop', animDur: 0.8, hold: null, loop: null, sound: 'chop', bad: 'A wasted stroke', verb: 'strike' }, o); this.good = 0; this.t = 0; this.busy = false; }
  start() {
    const g = this.game, p = g.player;
    this.begin();
    if (this.at) p.teleport(this.at[0], this.at[1], this.at[2] ?? p.yaw);
    if (this.hold) p.h.hold('R', this.hold);
    if (this.loop) p.loopOverride = this.loop;
    const y = p.pos.y, s = Math.sin(p.yaw), c = Math.cos(p.yaw);
    g.cine.hold([p.pos.x + c * 2.4 - s * 2.0, y + 1.5, p.pos.z - s * 2.4 - c * 2.0], [p.pos.x + s * 0.6, y + 0.9, p.pos.z + c * 0.6], { fov: 46 });
    this.show();
  }
  zone() { const w = clamp(this.cfg[2] * diffMul(this.game) - this.good * 0.015, 0.1, 0.4), c = 0.5 + Math.sin(this.good * 2.3 + (this.seed || 0)) * 0.24; return [c - w / 2, c + w / 2]; }
  show() { const g = this.game; g.ui.meter.show({ label: `${this.label}  ·  ${this.good} / ${this.cfg[0]}`, hint: `[${g.input.label('interact')}] ${this.verb} when the mark is in the gold  ·  [${g.input.label('crouch')}] stop`, zone: this.zone() }); }
  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt * this.cfg[1];
    const pos = 0.5 + 0.5 * Math.sin(this.t);
    if (!this.busy) g.ui.meter.set(pos);
    if (this.wantsExit() && !this.busy) return this.finish(false);
    if (!this.pressed() || this.busy) return;
    const [a, b] = this.zone(), ok = pos >= a && pos <= b;
    this.busy = true;
    const land = () => {
      if (ok) { this.good++; g.audio.play(this.sound); if (this.onGood) this.onGood(this.good); }
      else { g.audio.play('miss', { vol: 0.6 }); g.ui.toast(this.bad); if (this.onBad) this.onBad(); }
    };
    const after = () => { this.busy = false; if (this.good >= this.cfg[0]) return this.finish(true); this.show(); };
    if (this.anim) p.h.play(this.anim, this.animDur, { hitAt: 0.45, onHit: land, onEnd: after }); else { land(); g.after(0.45, after); }
  }
  cleanup(done) { if (this.hold) this.game.player.h.hold('R', null); if (!done && this.onStop) this.onStop(); }
}

// ---------------------------------------------------------------------------------------
// Bout: someone shouts, and the right answer has to come inside a breath. calls = [{ say, key, label }], taken in
// turn; `need` right answers end it. A wrong key or a late one is a miss and the call comes again.
// ---------------------------------------------------------------------------------------
export class Bout extends Activity {
  constructor(game, o) { super(game); Object.assign(this, { window: 1.15, need: 5, title: '' }, o); this.ok = 0; this.i = 0; this.wait = 1.4; this.live = 0; this.misses = 0; }
  start() {
    const g = this.game, p = g.player;
    this.begin();
    if (this.at) p.teleport(this.at[0], this.at[1], this.at[2] ?? p.yaw);
    if (this.loop) p.loopOverride = this.loop;
    if (this.cam) g.cine.hold(this.cam[0], this.cam[1], { fov: 46 });
    g.ui.meter.show({ label: this.title, hint: 'Wait for it…', mode: 'reel' }); g.ui.meter.reel(0, 0);
  }
  update(dt) {
    const g = this.game, inp = g.input, c = this.calls[this.i % this.calls.length];
    if (this.last) { // the story's own ending: one key, no clock
      if (inp.hit(this.last.key)) return this.finish(true);
      return;
    }
    if (this.live <= 0) {
      this.wait -= dt;
      if (this.wait <= 0) { this.live = this.window * diffMul(g); g.ui.meter.show({ label: c.say, hint: `[${inp.label(c.key)}] ${c.label}`, mode: 'reel', alert: true }); g.ui.alert(); g.audio.play('shout', { vol: 0.5 }); if (this.onCall) this.onCall(c); }
      else if (['attack', 'block', 'dodge', 'interact'].some((k) => inp.hit(k))) { this.wait = Math.max(this.wait, 0.8); g.ui.toast('Too soon'); }
      g.ui.meter.reel(this.ok / this.need, 0);
      return;
    }
    this.live -= dt;
    g.ui.meter.reel(this.ok / this.need, 1 - this.live / (this.window * diffMul(g)));
    const hit = inp.hit(c.key) || (c.key === 'block' && inp.held('block')), wrong = !hit && ['attack', 'block', 'dodge', 'interact'].some((k) => k !== c.key && inp.hit(k));
    if (!hit && !wrong && this.live > 0) return;
    const ok = hit;
    this.live = 0; this.wait = 1.1 + Math.random() * 1.1;
    if (ok) { this.ok++; this.i++; g.audio.play('clack'); } else { this.misses++; g.audio.play('miss', { vol: 0.6 }); }
    if (this.onAnswer) this.onAnswer(c, ok, this.ok);
    if (this.ok >= this.need) {
      if (this.ending) { this.last = this.ending; g.ui.meter.show({ label: this.ending.say, hint: `[${inp.label(this.ending.key)}] ${this.ending.label}`, mode: 'text', alert: true }); return; }
      return this.finish(true);
    }
    g.ui.meter.show({ label: this.title, hint: ok ? 'Good. Wait for it…' : 'Missed. Again…', mode: 'reel' });
  }
}

// ---------------------------------------------------------------------------------------
// Dive: the pool over the wreck. He swims where he looks; {crouch} goes down, {dodge} comes up. Silver is taken from
// the wreck two handfuls at a time and emptied into the basket on its rope at the surface, which is also where the
// air is. If the breath runs out he comes up choking and whatever he carried is back on the bottom.
// With `rescue` set it is the last dive instead: the basket in his arms, a man under a beam, and the tide running.
// ---------------------------------------------------------------------------------------
export class Dive extends Activity {
  constructor(game, o) {
    super(game); Object.assign(this, o);
    this.breath = 100; this.carry = 0; this.count = 0; this.yaw = 0; this.camPitch = 0.3; this.t = 0; this.glints = []; this.lift = 0; this.phase = this.rescue ? 'basket' : 'haul';
  }
  start() {
    const g = this.game, p = g.player, c = this.cfg;
    this.begin();
    this.pos = new THREE.Vector3(this.rope.x + 1.2, -0.95, this.rope.z + 0.6);
    p.pos.copy(this.pos); p.float = this.pos.y; p.loopOverride = 'tread'; p.frozen = true;
    this.yaw = Math.atan2(this.x - this.pos.x, this.z - this.pos.z); p.yaw = this.yaw;
    this.tintEl = document.createElement('div'); this.tintEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 30%,rgba(20,90,96,0.25),rgba(4,30,40,0.72));opacity:0;transition:opacity .25s;z-index:3'; document.body.appendChild(this.tintEl);
    if (!this.rescue) for (let i = 0; i < c.need + 3; i++) this.addGlint(i);
    this.ropeMesh = new THREE.Mesh(tint(box(0.05, this.floorY * -1 - 1.5, 0.05), 0x8a7a5a, 0.1, 1), M.vcPlain); this.ropeMesh.position.set(this.rope.x, (this.floorY - 1.5) / 2 + 1.5, this.rope.z); g.scene.add(this.ropeMesh);
    this.cam = new THREE.Vector3(); this.look = new THREE.Vector3();
    g.cine.hold(() => this.cam.toArray(), () => this.look.toArray(), { fov: 60, blend: 0.4 });
    this.hud();
    if (this.rescue) { this.pos.set(this.rescue.ledge.x, this.floorY + 2.2, this.rescue.ledge.z); this.breath = 78; }
  }
  addGlint(i) {
    const g = this.game, a = i * 2.4 + 0.7, r = 2.2 + (i % 4) * 1.5, x = this.x + Math.cos(a) * r, z = this.z + 2 + Math.sin(a) * r * 0.8, y = g.world.groundAt(x, z) + 0.25;
    const m = new THREE.Mesh(tint(sphere(0.2, 7, 5), 0xe8e4d4, 0.1, i), new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x9aa4a0, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.35 }));
    m.scale.set(1.3, 0.5, 1); m.position.set(x, y, z); g.scene.add(m); this.glints.push(m);
  }
  hud() {
    const g = this.game, inp = g.input, c = this.cfg;
    const label = this.rescue ? { basket: 'The basket is in his arms. Gisli is under the beam.', swim: 'Gisli is pinned under the beam', beam: 'Lift the beam', up: 'Up. Take him up.' }[this.phase] : `Silver in the basket  ·  ${this.count} / ${c.need}${this.carry ? `  ·  ${this.carry} in hand` : ''}`;
    const hint = this.rescue ? { basket: `[${inp.label('interact')}] let go of the basket`, swim: `[${inp.label('crouch')}] down  ·  [${inp.label('dodge')}] up`, beam: `hold [${inp.label('interact')}]`, up: `[${inp.label('dodge')}] up` }[this.phase]
      : `[${inp.label('crouch')}] dive  ·  [${inp.label('dodge')}] rise  ·  [${inp.label('interact')}] take silver  ·  surface at the rope to empty your hands`;
    g.ui.meter.show({ label, hint, mode: 'reel', alert: this.breath < 25 });
  }
  update(dt) {
    const g = this.game, p = g.player, inp = g.input, c = this.cfg, lk = inp.look(dt), mv = inp.move();
    this.t += dt;
    this.yaw -= lk.dx; this.camPitch = clamp(this.camPitch + lk.dy, -0.5, 1.1);
    const under = this.pos.y < -1.2, heavy = this.phase === 'basket', sp = c.swim * (heavy ? 0.3 : this.phase === 'up' ? 0.75 : 1);
    const s = Math.sin(this.yaw), co = Math.cos(this.yaw);
    let vx = (s * mv.y - co * mv.x) * sp, vz = (co * mv.y + s * mv.x) * sp, vy = (inp.held('dodge') ? c.rise : 0) - (inp.held('crouch') ? c.sink : 0) + (under ? 0.35 : 0);
    if (heavy) vy = Math.min(vy, -0.2); // the basket is the weight of a man
    if (this.rescue && this.phase !== 'up') { vx += this.rescue.tide[0] * c.tide; vz += this.rescue.tide[1] * c.tide; } // the tide has turned early
    if (this.phase === 'beam') { vx = vz = vy = 0; }
    this.pos.x += vx * dt; this.pos.z += vz * dt; this.pos.y = clamp(this.pos.y + vy * dt, Math.max(this.floorY, g.world.groundAt(this.pos.x, this.pos.z)) + 0.55, -0.95);
    const dx = this.pos.x - this.x, dz = this.pos.z - this.z, d = Math.hypot(dx, dz), R = this.radius;
    if (d > R) { this.pos.x = this.x + (dx / d) * R; this.pos.z = this.z + (dz / d) * R; }
    if (g.world.groundAt(this.pos.x, this.pos.z) > this.pos.y - 0.5) { this.pos.x -= vx * dt; this.pos.z -= vz * dt; } // rock
    p.pos.copy(this.pos); p.float = this.pos.y; p.yaw = Math.hypot(vx, vz) > 0.3 ? Math.atan2(vx, vz) : p.yaw; p.root.rotation.y = p.yaw;
    p.loopOverride = under ? 'swim' : 'tread';
    // camera: behind and a little above, looking where he swims
    const cp = Math.cos(this.camPitch), back = 3.6;
    this.cam.set(this.pos.x - s * back * cp, Math.max(this.pos.y + 1.2 + Math.sin(this.camPitch) * back, g.world.groundAt(this.pos.x - s * back * cp, this.pos.z - co * back * cp) + 0.5), this.pos.z - co * back * cp);
    this.look.set(this.pos.x + s * 1.5, this.pos.y + 0.9, this.pos.z + co * 1.5);
    this.tintEl.style.opacity = this.cam.y < -0.1 ? 1 : 0;
    // breath
    this.breath = clamp(this.breath + (under ? -100 / (c.breath * diffMul(g)) : 55) * dt, 0, 100);
    g.ui.meter.reel(this.rescue ? (this.phase === 'beam' ? this.lift / c.beam : this.phase === 'up' ? clamp(1 - (this.pos.y + 1.2) / (this.floorY + 1.2), 0, 1) : 0) : this.count / c.need, 1 - this.breath / 100);
    if (under && this.t % 1.3 < dt) g.fx.burst('splash', this.pos.x, this.pos.y + 1.0, this.pos.z, 2);
    if (this.breath <= 0) return this.choke();
    for (const m of this.glints) m.rotation.y += dt * 1.5;
    if (this.mates) this.mates.forEach((n, i) => this.mate(n, i, dt));
    if (this.rescue) return this.updateRescue(dt, under);

    // take silver / empty hands at the rope
    if (inp.hit('interact') && this.carry < c.carry) {
      const m = this.glints.find((x) => x.position.distanceTo(this.pos) < 1.7);
      if (m) { g.scene.remove(m); this.glints.splice(this.glints.indexOf(m), 1); this.carry++; g.audio.play('pickup'); this.hud(); if (this.onTake) this.onTake(this.carry); }
    }
    if (!under && this.carry && Math.hypot(this.pos.x - this.rope.x, this.pos.z - this.rope.z) < 2.6) {
      const n = this.carry; this.carry = 0; this.count += n; g.audio.play('chime'); g.fx.burst('splash', this.rope.x, 0, this.rope.z, 8); this.hud();
      if (this.onSilver) this.onSilver(n, this.count);
      if (this.count >= c.need) return this.finish(true);
    }
    if (this.wantsExit() && !under && !inp.held('crouch')) { /* {crouch} is the dive key here: only Esc leaves */ if (inp.hit('pause')) return this.finish(false); }
  }
  mate(n, i, dt) { // the others dive beside him: down to the wreck and up to the rope, over and over
    const k = (this.t * 0.16 + i * 0.47) % 1, down = k < 0.5 ? k * 2 : 2 - k * 2, a = i * 2.6 + 1;
    n.pos.set(this.rope.x + Math.cos(a) * 2.5 + (this.x + Math.cos(a) * 4 - this.rope.x) * down, -0.95 + (this.floorY + 1.6) * down, this.rope.z + Math.sin(a) * 2.5 + (this.z + 2 + Math.sin(a) * 3 - this.rope.z) * down);
    n.yaw = Math.atan2(this.x - n.pos.x, this.z - n.pos.z) + (k < 0.5 ? 0 : Math.PI); n.root.rotation.y = n.yaw;
    n.h.setLoop(down > 0.06 ? 'swim' : 'tread'); n.h.setLocomotion(0, false); n.h.update(dt);
  }
  updateRescue(dt, under) {
    const g = this.game, inp = g.input, c = this.cfg, r = this.rescue, gi = r.gisli;
    if (this.phase === 'basket') {
      r.basket.position.set(this.pos.x, this.pos.y + 0.7, this.pos.z);
      if (inp.hit('interact')) { this.phase = 'swim'; this.sink = { v: 0 }; g.audio.play('splash', { vol: 0.6 }); this.hud(); if (r.onDrop) r.onDrop(); }
    } else if (this.sink) { this.sink.v += dt * 1.2; r.basket.position.y -= this.sink.v * dt; r.basket.position.x += r.tide[0] * 2.4 * dt; r.basket.position.z += r.tide[1] * 2.4 * dt; r.basket.rotation.z += dt; }
    if (this.phase === 'swim' && Math.hypot(this.pos.x - gi.pos.x, this.pos.z - gi.pos.z) < 1.9 && this.pos.y < gi.pos.y + 2) { this.phase = 'beam'; this.hud(); }
    if (this.phase === 'beam') {
      if (inp.held('interact')) { this.lift += dt; r.beam.rotation.z = -0.15 - (this.lift / c.beam) * 0.5; r.beam.position.y = r.beamY + (this.lift / c.beam) * 0.9; if (this.t % 0.5 < dt) g.audio.play('chop', { vol: 0.3 }); }
      else this.lift = Math.max(0, this.lift - dt * 0.6);
      if (this.lift >= c.beam) { this.phase = 'up'; g.audio.play('split'); this.hud(); }
    }
    if (this.phase === 'up') { // Gisli comes up in his arm
      gi.pos.set(this.pos.x + Math.sin(this.yaw + 1.4) * 0.7, this.pos.y - 0.1, this.pos.z + Math.cos(this.yaw + 1.4) * 0.7); gi.root.rotation.y = this.yaw; gi.h.setLoop('tread'); gi.h.update(dt);
      if (!under) return this.finish(true);
    } else { gi.h.setLoop('lie'); gi.h.update(dt); }
  }
  choke() {
    const g = this.game;
    g.audio.play('hurt'); g.ui.toast(this.rescue ? 'No air. He comes up, breathes, and goes down again.' : this.carry ? 'No air. He comes up choking, and the silver goes back to the bottom.' : 'No air. He comes up choking.');
    if (!this.rescue) { for (let i = 0; i < this.carry; i++) this.addGlint(this.glints.length + 7 + i); this.carry = 0; }
    this.pos.y = -0.95; this.breath = 60; this.hud();
  }
  cleanup() {
    const g = this.game, p = g.player;
    for (const m of this.glints) g.scene.remove(m); g.scene.remove(this.ropeMesh);
    this.tintEl.remove(); p.float = null; p.frozen = false; p.loopOverride = null;
    if (this.back) p.teleport(this.back[0], this.back[1], this.back[2] ?? p.yaw);
  }
}
