// Player controller (Eirik) and third-person camera.
import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp, angleDiff } from '../core/util.js';
import { Humanoid, makeItem } from './humanoid.js';
import { shared } from '../world/geo.js';

export const EIRIK_CHILD = {
  scale: 0.7, child: true, skin: 0xe2b494, hair: 0xb58a4e, hairStyle: 'short',
  tunic: 0x7f8f66, trim: 0xb0652a, legs: 0x5a4a38, boots: 0x3a2a1c, sleeve: 0x7f8f66,
};
const SPEED = { jog: 3.3, sprint: 5.0, crouch: 1.5, aim: 1.3, block: 1.2 };
const _v = new THREE.Vector3(), _d = new THREE.Vector3();

export class Player {
  constructor(game) {
    this.game = game;
    this.h = new Humanoid(EIRIK_CHILD);
    this.root = this.h.root; this.pos = this.root.position;
    this.yaw = Math.PI; this.speed = 0; this.moving = false;
    this.health = 100; this.stamina = 100; this.warmth = 100;
    this.crouch = false; this.equipped = 'none'; this.aiming = false; this.draw = 0;
    this.blocking = false; this.blockT = 0; this.combo = 0; this.comboT = 0;
    this.dodgeT = 0; this.dodgeDir = new THREE.Vector3(); this.iframes = 0; this.staminaDelay = 0;
    this.noise = 0; this.sprinting = false; this.frozen = false;
    this.cam = { yaw: Math.PI, pitch: 0.3, dist: 4.1, aimK: 0, target: new THREE.Vector3(), shake: 0, maxDist: 4.1 };
    this.backAxe = null;
    this.h.onStep = () => {
      const snow = shared.uSnow.value > 0.35;
      game.audio.play('step', { snow, vol: this.crouch ? 0.25 : this.sprinting ? 1.2 : 0.8 });
      if (snow && !this.crouch) game.fx.burst('snowpuff', this.pos.x, this.pos.y + 0.05, this.pos.z, 2);
    };
  }

  teleport(x, z, yaw = this.yaw) {
    this.pos.set(x, this.game.world.groundAt(x, z), z);
    this.yaw = yaw; this.root.rotation.y = yaw; this.speed = 0;
    this.cam.yaw = yaw; this.cam.target.set(x, this.pos.y + 1, z);
    this.h.snap();
  }
  equip(name) {
    if (name !== 'none' && !this.game.inventory.has(name)) return false;
    if (this.equipped === name) return true;
    this.equipped = name; this.aiming = false; this.blocking = false; this.draw = 0;
    this.h.hold('R', name === 'woodsword' ? 'woodsword' : null);
    this.h.hold('L', name === 'bow' ? 'bow' : null);
    this.game.audio.play('page');
    this.game.events.emit('equip', name);
    return true;
  }
  showBackAxe(on) {
    if (on && !this.backAxe) {
      this.backAxe = makeItem('father_axe');
      this.backAxe.position.set(0.05, 0.3, -0.16); this.backAxe.rotation.set(1.35, 0.3, 0);
      this.h.j.chest.add(this.backAxe);
    } else if (!on && this.backAxe) { this.h.j.chest.remove(this.backAxe); this.backAxe = null; }
  }

  /** Where the crosshair is actually pointing: march the camera ray until it meets ground or an animal,
   *  so arrows converge on the thing under the crosshair instead of a fixed far point. */
  aimPoint(dir) {
    const g = this.game, o = g.camera.position, pt = new THREE.Vector3();
    for (let d = 2; d <= 70; d += 0.4) {
      pt.copy(o).addScaledVector(dir, d);
      if (pt.y < g.world.groundAt(pt.x, pt.z) + 0.05) return pt;
      for (const a of g.wildlife.animals) {
        const r = a.kind === 'deer' ? 1.0 : 0.55, cy = a.pos.y + (a.kind === 'deer' ? 1.1 : 0.2);
        if (Math.abs(pt.x - a.pos.x) < r && Math.abs(pt.z - a.pos.z) < r && Math.abs(pt.y - cy) < r) return pt;
      }
    }
    return pt;
  }

  /** Called by attackers. Returns 'dodged' | 'parried' | 'blocked' | 'hit'. */
  receive(attacker, dmg) {
    const g = this.game;
    if (this.iframes > 0) return 'dodged';
    const facing = Math.abs(angleDiff(this.yaw, Math.atan2(attacker.pos.x - this.pos.x, attacker.pos.z - this.pos.z))) < 1.2;
    if (this.blocking && facing) {
      if (this.blockT < 0.26) {
        g.audio.play('parry'); this.h.play('parry', 0.3);
        this.h.handWorld('R', _v); g.fx.burst('chips', _v.x, _v.y + 0.2, _v.z, 6);
        return 'parried';
      }
      this.stamina -= 14; this.staminaDelay = 0.8; g.audio.play('clack');
      if (this.stamina <= 0) { this.stamina = 0; this.h.play('stagger', 0.6); return 'hit'; }
      return 'blocked';
    }
    this.health = Math.max(1, this.health - dmg);
    this.h.play('stagger', 0.5); g.audio.play('hurt'); this.cam.shake = 0.25;
    return 'hit';
  }

  update(dt, ctrl) {
    const g = this.game, inp = g.input, h = this.h, cam = this.cam, world = g.world;
    ctrl = ctrl && !this.frozen;
    const mv = ctrl ? inp.move() : { x: 0, y: 0, mag: 0 };
    const fX = Math.sin(cam.yaw), fZ = Math.cos(cam.yaw), rX = -Math.cos(cam.yaw), rZ = Math.sin(cam.yaw);
    let dx = fX * mv.y + rX * mv.x, dz = fZ * mv.y + rZ * mv.x;
    const dm = Math.hypot(dx, dz);
    if (dm > 1e-4) { dx /= dm; dz /= dm; }

    if (ctrl) {
      if (inp.hit('crouch')) this.crouch = !this.crouch;
      if (inp.hit('weapon1')) this.equip(this.equipped === 'woodsword' ? 'none' : 'woodsword');
      if (inp.hit('weapon2')) this.equip(this.equipped === 'bow' ? 'none' : 'bow');
      if (inp.hit('holster')) this.equip('none');
      if (inp.hit('interact')) g.tryInteract();
    }
    const wantAimOrBlock = ctrl && inp.held('block');
    this.aiming = wantAimOrBlock && this.equipped === 'bow' && !h.busy;
    const wasBlocking = this.blocking;
    this.blocking = wantAimOrBlock && this.equipped === 'woodsword' && this.dodgeT <= 0;
    this.blockT = this.blocking ? (wasBlocking ? this.blockT + dt : 0) : 0;

    // --- actions ---
    this.comboT -= dt; if (this.comboT <= 0) this.combo = 0;
    this.iframes -= dt;
    if (ctrl && inp.hit('dodge') && this.dodgeT <= 0 && this.stamina >= 16 && !this.aiming) {
      this.dodgeT = 0.42; this.iframes = 0.32; this.stamina -= 16; this.staminaDelay = 0.7; this.crouch = false;
      if (dm > 0.2) this.dodgeDir.set(dx, 0, dz); else this.dodgeDir.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      h.play('dodge', 0.42); g.audio.play('whoosh', { vol: 0.6 }); g.events.emit('dodge');
    }
    if (ctrl && inp.hit('attack')) {
      if (this.equipped === 'woodsword' && !h.busy && this.stamina >= 6 && !this.blocking) {
        const n = (this.combo % 3) + 1;
        this.stamina -= 7; this.staminaDelay = 0.6; this.combo++; this.comboT = 1.0; this.crouch = false;
        g.audio.play('whoosh');
        const tg = this.target; // soft lock: turn to face a nearby opponent
        if (tg && Math.hypot(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z) < 3.4) this.yaw = Math.atan2(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z);
        h.play('atk' + n, n === 3 ? 0.62 : 0.5, { hitAt: 0.4, onHit: () => g.events.emit('playerSwing', n) });
      } else if (this.equipped === 'bow' && this.aiming) {
        if (this.draw >= 0.35 && g.inventory.count('arrow') > 0) {
          g.camera.getWorldDirection(_d);
          h.handWorld('L', _v);
          const dir = this.aimPoint(_d).sub(_v).normalize();
          g.wildlife.shoot(_v, dir, 26 + this.draw * 22, this);
          g.inventory.remove('arrow', 1, true);
          g.audio.play('bow'); h.play('shoot', 0.3); this.draw = 0;
          g.events.emit('shoot');
        } else if (g.inventory.count('arrow') <= 0) g.ui.toast('No arrows left');
      }
    }
    if (this.aiming) this.draw = Math.min(1, this.draw + dt / 0.75); else this.draw = 0;
    h.param = this.draw;
    h.setLoop(this.aiming ? 'aim' : this.blocking ? 'block' : this.loopOverride || null);

    // --- locomotion ---
    this.sprinting = ctrl && inp.held('sprint') && mv.mag > 0.5 && this.stamina > 1 && !this.crouch && !this.aiming && !this.blocking;
    let top = this.crouch ? SPEED.crouch : this.aiming ? SPEED.aim : this.blocking ? SPEED.block : this.sprinting ? SPEED.sprint : SPEED.jog;
    if (h.busy && this.dodgeT <= 0) top *= 0.35;
    top *= this.speedMul ?? 1;
    this.speed = damp(this.speed, mv.mag * top, 10, dt);
    if (this.sprinting) { this.stamina -= 10 * dt; this.staminaDelay = 0.9; }
    this.staminaDelay -= dt;
    if (this.staminaDelay <= 0) this.stamina = Math.min(100, this.stamina + 17 * dt);
    this.stamina = Math.max(0, this.stamina);
    if (this.health < 100) this.health = Math.min(100, this.health + 1.5 * dt);

    const px = this.pos.x, pz = this.pos.z;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const k = 6.2 * Math.max(0.25, this.dodgeT / 0.42);
      this.pos.x += this.dodgeDir.x * k * dt; this.pos.z += this.dodgeDir.z * k * dt;
    } else if (this.speed > 0.02 && dm > 1e-4) {
      this.pos.x += dx * this.speed * dt; this.pos.z += dz * this.speed * dt;
    }
    world.resolve(this.pos, 0.3);
    if (!world.walkable(this.pos.x, this.pos.z)) { this.pos.x = px; this.pos.z = pz; this.speed *= 0.5; }
    this.pos.y = damp(this.pos.y, world.groundAt(this.pos.x, this.pos.z), 20, dt);
    this.moving = Math.hypot(this.pos.x - px, this.pos.z - pz) > 0.0005;

    if (this.blocking && this.target && Math.hypot(this.target.pos.x - this.pos.x, this.target.pos.z - this.pos.z) < 6) this.yaw = dampAngle(this.yaw, Math.atan2(this.target.pos.x - this.pos.x, this.target.pos.z - this.pos.z), 16, dt);
    else if (this.aiming || this.blocking) this.yaw = dampAngle(this.yaw, cam.yaw, 16, dt);
    else if (this.faceTarget) this.yaw = dampAngle(this.yaw, Math.atan2(this.faceTarget.x - this.pos.x, this.faceTarget.z - this.pos.z), 8, dt);
    else if (dm > 1e-4 && this.speed > 0.1 && this.dodgeT <= 0) this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 11, dt);
    this.root.rotation.y = this.yaw;
    h.setLocomotion(this.moving ? this.speed : 0, this.crouch);
    h.update(dt);
    this.noise = !this.moving ? 0 : this.crouch ? 1.2 : this.sprinting ? 10 : 5;
    this.updateCamera(dt, ctrl);
  }

  updateCamera(dt, ctrl) {
    const g = this.game, cam = this.cam, c = g.camera;
    if (g.cine.active) return;
    if (ctrl || g.mode === 'play') {
      const lk = g.input.look(dt);
      cam.yaw -= lk.dx; cam.pitch = clamp(cam.pitch + lk.dy, -0.42, 1.25);
    }
    cam.aimK = damp(cam.aimK, this.aiming ? 1 : 0, 10, dt);
    const headY = this.pos.y + this.h.headHeight() + 0.12;
    cam.target.x = damp(cam.target.x, this.pos.x, 22, dt);
    cam.target.z = damp(cam.target.z, this.pos.z, 22, dt);
    cam.target.y = damp(cam.target.y, headY, 12, dt);
    const cp = Math.cos(cam.pitch), dirX = -Math.sin(cam.yaw) * cp, dirY = Math.sin(cam.pitch), dirZ = -Math.cos(cam.yaw) * cp;
    const rX = -Math.cos(cam.yaw), rZ = Math.sin(cam.yaw), off = 0.55 * cam.aimK;
    const tx = cam.target.x + rX * off, ty = cam.target.y + 0.1 * cam.aimK, tz = cam.target.z + rZ * off;
    const want = lerp(cam.maxDist, 1.75, cam.aimK);
    let d = want;
    for (let s = 0.5; s <= want; s += 0.3) {
      if (ty + dirY * s < 5.2 && g.world.pointInBox(tx + dirX * s, tz + dirZ * s, 0.3)) { d = Math.max(0.45, s - 0.45); break; }
    }
    cam.dist = d < cam.dist ? d : damp(cam.dist, d, 5, dt);
    let x = tx + dirX * cam.dist, y = ty + dirY * cam.dist, z = tz + dirZ * cam.dist;
    y = Math.max(y, g.world.groundAt(x, z) + 0.35);
    if (cam.shake > 0 && g.settings.cameraShake) {
      cam.shake = Math.max(0, cam.shake - dt);
      x += (Math.random() - 0.5) * cam.shake * 0.5; y += (Math.random() - 0.5) * cam.shake * 0.5;
    }
    c.position.set(x, y, z);
    c.lookAt(tx, ty, tz);
    const fov = lerp(g.baseFov ?? 58, 40, cam.aimK);
    if (Math.abs(c.fov - fov) > 0.05) { c.fov = damp(c.fov, fov, 9, dt); c.updateProjectionMatrix(); }
  }
}
