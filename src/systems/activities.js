// Hands-on activities: woodcutting, fire-making, fishing and sparring.
import * as THREE from 'three';
import { clamp, damp, angleDiff } from '../core/util.js';
import { M, at, cyl, sphere, tint, merge } from '../world/geo.js';
import { riverSurfaceY } from '../world/terrain.js';

const diffMul = (g) => (g.settings.difficulty === 'easy' ? 1.35 : g.settings.difficulty === 'hard' ? 0.75 : 1);
const _v = new THREE.Vector3();

/** Shared base: an activity owns input while game.mode === 'activity'. */
class Activity {
  constructor(game) { this.game = game; this.done = false; }
  begin() { this.game.activity = this; this.game.setMode('activity'); this.game.player.equip('none'); }
  finish(completed) {
    const g = this.game;
    if (g.activity === this) g.activity = null;
    g.ui.meter.hide(); g.cine.release(); g.setMode('play');
    g.player.loopOverride = null;
    this.cleanup(completed);
    if (completed && this.onDone) this.onDone();
  }
  cleanup() {}
  pressed() { const i = this.game.input; return i.hit('interact') || i.hit('attack') || i.hit('dodge'); }
  wantsExit() { const i = this.game.input; return i.hit('pause') || i.hit('crouch'); }
}

// ---------------------------------------------------------------------------------------
// Woodcutting: stop the swinging marker inside the sweet spot to split each log.
// ---------------------------------------------------------------------------------------
export class Woodcutting extends Activity {
  constructor(game, { x, z, count = 5, onSplit, onDone }) {
    super(game); this.x = x; this.z = z; this.need = count; this.onSplit = onSplit; this.onDone = onDone;
    this.split = 0; this.t = 0; this.swinging = false; this.halves = [];
  }
  start() {
    const g = this.game, p = g.player;
    this.begin();
    p.teleport(this.x + 0.05, this.z + 1.0, Math.PI);
    p.h.hold('R', 'smallaxe');
    this.y = g.world.groundAt(this.x, this.z) + 0.55;
    this.log = new THREE.Mesh(tint(cyl(0.15, 0.16, 0.5, 8), 0x8a6a48, 0.15, 3), M.vcPlain);
    this.log.castShadow = true; g.scene.add(this.log);
    this.placeLog();
    g.cine.hold([this.x + 2.6, this.y + 1.05, this.z + 2.3], [this.x, this.y + 0.25, this.z + 0.3], { fov: 46 });
    this.showMeter();
  }
  zone() { const w = clamp((0.24 - this.split * 0.022) * diffMul(this.game), 0.1, 0.4), c = 0.5 + Math.sin(this.split * 2.4) * 0.22; return [c - w / 2, c + w / 2]; }
  showMeter() {
    const g = this.game;
    g.ui.meter.show({ label: `Split the logs  ·  ${this.split} / ${this.need}`, hint: `[${g.input.label('interact')}] strike when the mark is in the gold  ·  [${g.input.label('crouch')}] stop`, zone: this.zone() });
  }
  placeLog() { this.log.visible = true; this.log.position.set(this.x, this.y + 0.25, this.z); this.log.rotation.set(0, Math.random() * 3, 0); }
  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt * (2.3 + this.split * 0.28);
    const pos = 0.5 + 0.5 * Math.sin(this.t);
    if (!this.swinging) g.ui.meter.set(pos);
    for (const h of this.halves) { // tumbling halves
      h.v.y -= 9.8 * dt; h.m.position.addScaledVector(h.v, dt); h.m.rotation.z += h.spin * dt;
      const floor = g.world.groundAt(h.m.position.x, h.m.position.z) + 0.1;
      if (h.m.position.y < floor) { h.m.position.y = floor; h.v.set(0, 0, 0); h.spin = 0; }
    }
    if (this.wantsExit() && !this.swinging) return this.finish(false);
    if (this.pressed() && !this.swinging) {
      const [a, b] = this.zone(), good = pos >= a && pos <= b;
      this.swinging = true;
      g.audio.play('whoosh', { vol: 0.7 });
      p.h.play('chop', 0.8, {
        hitAt: 0.45,
        onHit: () => {
          if (good) {
            g.audio.play('split'); g.fx.burst('chips', this.x, this.y + 0.45, this.z, 14);
            this.log.visible = false;
            for (const s of [-1, 1]) {
              const m = new THREE.Mesh(tint(at(cyl(0.15, 0.16, 0.5, 8, 1.6, false), 0, 0, 0, 0, 0, 0, 0.5, 1, 1), 0x9a7a52, 0.15, 5), M.vcPlain);
              m.castShadow = true; m.position.set(this.x + s * 0.12, this.y + 0.25, this.z); g.scene.add(m);
              this.halves.push({ m, v: new THREE.Vector3(s * (1.3 + Math.random()), 2.2, (Math.random() - 0.5) * 1.2), spin: -s * 5 });
            }
            this.split++;
            if (this.onSplit) this.onSplit(this.split);
            g.player.cam.shake = 0.12;
          } else {
            g.audio.play('chop', { vol: 0.6 }); g.fx.burst('chips', this.x, this.y + 0.45, this.z, 3);
            g.ui.toast(pos < a ? 'Too early — a glancing blow' : 'Too late — a glancing blow');
          }
        },
        onEnd: () => {
          this.swinging = false;
          if (this.split >= this.need) return this.finish(true);
          if (!this.log.visible) this.placeLog();
          this.showMeter();
        },
      });
    }
  }
  cleanup() {
    const g = this.game;
    g.scene.remove(this.log);
    g.player.h.hold('R', null);
    const halves = this.halves; // leave the split wood lying for a while
    g.after(40, () => halves.forEach((h) => g.scene.remove(h.m)));
  }
}

// ---------------------------------------------------------------------------------------
// Fire-making: three good flint strikes. In a storm, a bad strike costs progress.
// ---------------------------------------------------------------------------------------
export class FireMaking extends Activity {
  constructor(game, { x, z, storm = false, onDone }) {
    super(game); this.x = x; this.z = z; this.storm = storm; this.onDone = onDone;
    this.embers = 0; this.need = 3; this.t = 0; this.busy = false;
  }
  start() {
    const g = this.game, p = g.player;
    this.begin();
    p.teleport(this.x + 0.25, this.z + 1.05, Math.PI);
    p.loopOverride = 'kneel';
    this.y = g.world.groundAt(this.x, this.z);
    g.cine.hold([this.x + 2.0, this.y + 1.0, this.z + 2.2], [this.x, this.y + 0.3, this.z + 0.2], { fov: 44 });
    this.showMeter();
  }
  zone() { const w = clamp((this.storm ? 0.15 : 0.22) * diffMul(this.game), 0.09, 0.36), c = 0.5 + Math.sin(this.embers * 1.9 + 1) * 0.25; return [c - w / 2, c + w / 2]; }
  showMeter() {
    const g = this.game;
    g.ui.meter.show({ label: `Strike sparks into the tinder  ·  ${this.embers} / ${this.need}`, hint: `[${g.input.label('interact')}] strike the flint when the mark is in the gold${this.storm ? '  ·  the wind steals a bad spark' : ''}`, zone: this.zone() });
  }
  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt * (this.storm ? 3.5 : 2.7);
    const pos = 0.5 + 0.5 * Math.sin(this.t);
    if (!this.busy) g.ui.meter.set(pos);
    if (this.wantsExit() && !this.busy) return this.finish(false);
    if (this.pressed() && !this.busy) {
      const [a, b] = this.zone(), good = pos >= a && pos <= b;
      this.busy = true;
      p.h.play('strike', 0.5, {
        hitAt: 0.3,
        onHit: () => {
          g.audio.play('flint');
          g.fx.burst('spark', this.x, this.y + 0.3, this.z + 0.25, good ? 16 : 6);
          if (good) this.embers++;
          else if (this.storm && this.embers > 0) { this.embers--; g.ui.toast('The wind snuffs the ember'); }
          else g.ui.toast('The spark dies');
        },
        onEnd: () => {
          this.busy = false;
          if (this.embers >= this.need) { g.audio.play('ignite'); return this.finish(true); }
          this.showMeter();
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------------------
// Fishing: cast, wait for the bite, strike, then reel without snapping the line.
// ---------------------------------------------------------------------------------------
export class Fishing extends Activity {
  constructor(game, { x, z, wx, wz, onCatch }) {
    super(game); this.x = x; this.z = z; this.wx = wx; this.wz = wz; this.onCatch = onCatch;
    this.phase = 'idle'; this.t = 0; this.tension = 0; this.progress = 0; this.pull = 0.3;
  }
  start() {
    const g = this.game, p = g.player;
    this.begin();
    p.teleport(this.x, this.z, Math.atan2(this.wx - this.x, this.wz - this.z));
    p.h.hold('R', 'rod'); p.loopOverride = 'fish';
    this.wy = riverSurfaceY(this.wz) + 0.03;
    this.bob = new THREE.Mesh(tint(sphere(0.07, 7, 5), 0xc23a2a), M.vcPlain); g.scene.add(this.bob);
    this.lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.line = new THREE.Line(this.lineGeo, new THREE.LineBasicMaterial({ color: 0xe8e2d2, transparent: true, opacity: 0.7 }));
    this.line.frustumCulled = false; g.scene.add(this.line);
    const dx = this.wx - this.x, dz = this.wz - this.z, d = Math.hypot(dx, dz);
    g.cine.hold([this.x - (dx / d) * 2.6 - (dz / d) * 2.0, p.pos.y + 1.75, this.z - (dz / d) * 2.6 + (dx / d) * 2.0], [this.wx, this.wy, this.wz], { fov: 48 });
    this.cast();
  }
  cast() {
    const g = this.game;
    this.phase = 'cast'; this.t = 0;
    g.ui.meter.show({ label: 'Casting…', hint: `[${g.input.label('crouch')}] stop fishing`, mode: 'text' });
    g.player.h.play('cast', 0.8, { hitAt: 0.45, onHit: () => g.audio.play('whoosh', { vol: 0.5 }) });
    this.bob.visible = false;
  }
  update(dt) {
    const g = this.game, p = g.player, inp = g.input;
    this.t += dt;
    // rod tip -> bobber line
    p.h.handWorld('R', _v);
    const tipX = _v.x + Math.sin(p.yaw) * 1.5, tipY = _v.y + 1.2, tipZ = _v.z + Math.cos(p.yaw) * 1.5;
    const arr = this.lineGeo.attributes.position.array;
    arr[0] = tipX; arr[1] = tipY; arr[2] = tipZ; arr[3] = this.bob.position.x; arr[4] = this.bob.position.y; arr[5] = this.bob.position.z;
    this.lineGeo.attributes.position.needsUpdate = true;
    this.line.visible = this.bob.visible;

    if (this.wantsExit()) return this.finish(false);
    if (this.phase === 'cast') {
      if (this.t > 0.75) {
        this.phase = 'wait'; this.t = 0; this.biteAt = 2.2 + Math.random() * 4.2;
        this.bob.visible = true; this.bob.position.set(this.wx, this.wy, this.wz);
        g.audio.play('splash', { vol: 0.5 }); g.fx.burst('splash', this.wx, this.wy, this.wz, 8);
        g.ui.meter.show({ label: 'Wait for the bite…', hint: 'Watch the float', mode: 'text' });
      }
    } else if (this.phase === 'wait') {
      this.bob.position.y = this.wy + Math.sin(this.t * 2.2) * 0.012;
      if (this.pressed()) { g.ui.toast('Too soon — you scared it off'); return this.cast(); }
      if (this.t > this.biteAt) {
        this.phase = 'bite'; this.t = 0;
        g.audio.play('bite'); g.fx.burst('splash', this.wx, this.wy, this.wz, 6);
        g.ui.meter.show({ label: 'A bite!', hint: `[${inp.label('interact')}] strike now!`, mode: 'text', alert: true });
      }
    } else if (this.phase === 'bite') {
      this.bob.position.y = this.wy - 0.06 + Math.sin(this.t * 30) * 0.02;
      if (this.pressed()) {
        this.phase = 'reel'; this.t = 0; this.tension = 0.25; this.progress = 0.12;
        g.ui.meter.show({ label: 'Reel it in', hint: `Hold [${inp.label('interact')}] to pull  ·  ease off before the line snaps`, mode: 'reel' });
      } else if (this.t > 0.95 * diffMul(g)) { g.ui.toast('It got away'); this.cast(); }
    } else if (this.phase === 'reel') {
      this.pull = clamp(this.pull + (Math.random() - 0.5) * dt * 3, 0.1, 0.75);
      const holding = inp.held('interact') || inp.held('attack') || inp.held('dodge');
      if (holding) { this.progress += dt * 0.34; this.tension += dt * (0.5 + this.pull) * (1 / diffMul(g)); if (Math.random() < dt * 9) g.audio.play('reel'); }
      else { this.tension -= dt * 0.75; this.progress -= dt * 0.07; }
      this.tension = clamp(this.tension, 0, 1); this.progress = clamp(this.progress, 0, 1);
      g.ui.meter.reel(this.progress, this.tension);
      const k = 1 - this.progress * 0.75;
      this.bob.position.set(this.x + (this.wx - this.x) * k + Math.sin(this.t * 7) * 0.25 * this.pull, this.wy - 0.03, this.z + (this.wz - this.z) * k + Math.cos(this.t * 5) * 0.25 * this.pull);
      if (Math.random() < dt * 6) g.fx.burst('splash', this.bob.position.x, this.wy, this.bob.position.z, 2);
      if (this.tension >= 1) { g.audio.play('miss'); g.ui.toast('The line snapped!'); this.cast(); }
      else if (this.progress >= 1) {
        g.audio.play('splash'); g.fx.burst('splash', this.bob.position.x, this.wy, this.bob.position.z, 14);
        g.inventory.add('fish', 1);
        if (this.onCatch) this.onCatch();
        this.cast();
      }
    }
  }
  cleanup() {
    const g = this.game;
    g.scene.remove(this.bob); g.scene.remove(this.line);
    g.player.h.hold('R', null);
  }
}

// ---------------------------------------------------------------------------------------
// Sparring: the father drills strike / block / parry / dodge. Runs inside normal play mode.
// ---------------------------------------------------------------------------------------
export class Sparring {
  constructor(game, npc, { centre, onResult }) {
    this.game = game; this.npc = npc; this.centre = centre; this.onResult = onResult;
    this.attacking = false; this.cool = 2.0; this.phase = 'strike'; this.active = true;
    this.off = game.events.on('playerSwing', () => this.playerSwing());
    npc.mode = 'spar'; npc.h.setLoop('guard'); game.player.target = npc;
  }
  setPhase(p) { this.phase = p; this.cool = 1.6; }
  playerSwing() {
    if (!this.active) return;
    const g = this.game, p = g.player, n = this.npc;
    const d = n.dist(p), facing = Math.abs(angleDiff(p.yaw, Math.atan2(n.pos.x - p.pos.x, n.pos.z - p.pos.z))) < 0.9;
    if (d > 2.0 || !facing) return;
    n.h.play('parry', 0.35); g.audio.play('clack');
    n.h.handWorld('R', _v); g.fx.burst('chips', _v.x, _v.y + 0.25, _v.z, 5);
    this.onResult('strike');
  }
  update(dt) {
    if (!this.active) return;
    const g = this.game, p = g.player, n = this.npc;
    // keep a fighting distance, face the pupil
    const d = n.dist(p), ang = Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z);
    n.yaw = n.yaw + angleDiff(n.yaw, ang) * Math.min(1, dt * 7);
    let sp = 0;
    if (!this.attacking) {
      if (d > 2.0) sp = Math.min(2.4, (d - 1.6) * 2.5);
      else if (d < 1.2) sp = -1.2;
      const px = n.pos.x, pz = n.pos.z;
      n.pos.x += Math.sin(n.yaw) * sp * dt; n.pos.z += Math.cos(n.yaw) * sp * dt;
      g.world.resolve(n.pos, 0.32);
      if (Math.hypot(n.pos.x - this.centre.x, n.pos.z - this.centre.z) > 9) { n.pos.x = px; n.pos.z = pz; }
    }
    n.speed = damp(n.speed, Math.abs(sp), 10, dt);
    n.root.rotation.y = n.yaw;
    n.pos.y = damp(n.pos.y, g.world.groundAt(n.pos.x, n.pos.z), 18, dt);
    n.h.setLocomotion(n.speed > 0.2 ? n.speed : 0, false);
    n.h.setLoop('guard');
    n.h.update(dt);

    this.cool -= dt;
    if (this.phase !== 'strike' && this.phase !== 'rest' && !this.attacking && this.cool <= 0 && d < 3.2) {
      this.attacking = true;
      const k = 1 + ((Math.random() * 3) | 0), dur = 1.55 / (g.settings.difficulty === 'hard' ? 1.25 : g.settings.difficulty === 'easy' ? 0.85 : 1);
      g.ui.alert();
      n.h.play('atk' + k, dur, {
        hitAt: 0.4,
        onHit: () => {
          g.audio.play('whoosh');
          if (n.dist(p) > 2.5) return this.onResult('missed');
          this.onResult(p.receive(n, 6));
        },
        onEnd: () => { this.attacking = false; this.cool = 1.5 + Math.random() * 1.2; },
      });
    }
  }
  stop() { this.active = false; this.off(); this.game.player.target = null; this.npc.mode = 'idle'; this.npc.h.setLoop(null); this.npc.loop = null; }
}
