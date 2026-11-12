// Player controller (Eirik) and third-person camera.
import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp, angleDiff } from '../core/util.js';
import { Humanoid, makeItem } from './humanoid.js';
import { shared } from '../world/geo.js';
import { WEAPONS, MELEE_ORDER } from '../data/weapons.js';
import { ITEMS } from '../data/act1.js';

const _look = new THREE.Vector3();
export const EIRIK_ADULT = {
  scale: 1.0, build: 1.08, skin: 0xdcae8e, hair: 0xa87e45, hairStyle: 'long', beard: 'short', eyes: 0x86aec6, scar: 'lightning',
  tunic: 0x55664a, trim: 0xb0652a, legs: 0x4a3f33, boots: 0x33261a, sleeve: 0x55664a,
};
export const EIRIK_CHILD = {
  scale: 0.7, child: true, skin: 0xe2b494, hair: 0xb58a4e, hairStyle: 'short', eyes: 0x86aec6, scar: 'lightning',
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
    this.health = 100; this.stamina = 100; this.warmth = 100; this.hunger = 100;
    this.headPos = new THREE.Vector3(); // where others look when they look at him
    this.ward = 0; this.wardT = 0; this.camSide = 1; this.lastMove = { x: 0, y: 0 }; this.lungeT = 0; this.execT = 0; this.exK = 0;
    this.crouch = false; this.equipped = 'none'; this.aiming = false; this.draw = 0;
    this.blocking = false; this.blockT = 0; this.combo = 0; this.comboT = 0;
    this.dodgeT = 0; this.dodgeDir = new THREE.Vector3(); this.iframes = 0; this.staminaDelay = 0;
    this.noise = 0; this.sprinting = false; this.frozen = false; this.atkHold = 0; this.adult = false; this.mortal = false;
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
    this.h.hold('R', name === 'woodsword' ? (this.adult ? 'woodsword_big' : 'woodsword') : WEAPONS[name] ? WEAPONS[name].hold || name : null);
    if (this.adult) this.showBackAxe(name !== 'father_axe' && this.game.inventory.has('father_axe') && !this.game.state.flags.axeHidden);
    this.h.hold('L', name === 'bow' ? 'bow' : this.offItem(name));
    this.game.audio.play('page');
    this.game.events.emit('equip', name);
    return true;
  }
  isMelee() { return !!WEAPONS[this.equipped]; }
  /** While the bow is drawn: dots along the path the arrow will take. */
  updateArc() {
    const g = this.game;
    const show = this.aiming && this.draw >= 0.35 && g.inventory.count('arrow') > 0;
    if (!this.arc) {
      if (!show) return;
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
      this.arc = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.075, color: 0xfff0c0, transparent: true, opacity: 0.8, depthWrite: false }));
      this.arc.frustumCulled = false; g.scene.add(this.arc);
    }
    this.arc.visible = show;
    if (!show) return;
    g.camera.getWorldDirection(_d); this.h.handWorld('L', _v);
    const dir = this.aimPoint(_d).sub(_v).normalize(), sp = 26 + this.draw * 22, a = this.arc.geometry.attributes.position;
    let x = _v.x + dir.x * 0.6, y = _v.y + dir.y * 0.6, z = _v.z + dir.z * 0.6, vx = dir.x * sp, vy = dir.y * sp, vz = dir.z * sp, done = false;
    for (let i = 0; i < 14; i++) {
      if (!done) for (let k = 0; k < 4; k++) { vy -= 6.5 * 0.02; x += vx * 0.02; y += vy * 0.02; z += vz * 0.02; if (y < g.world.groundAt(x, z)) { done = true; break; } }
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  }
  /** The numbers for what is in his hand (see data/weapons.js). */
  weaponDef() { return WEAPONS[this.equipped] || WEAPONS.woodsword; }
  /** What rides in the off hand beside the axe: a shield if he owns one, else the Left Brother; weapon3 swaps them. */
  offItem(name = this.equipped) {
    const inv = this.game.inventory, fl = this.game.state.flags, W = WEAPONS[name];
    if (W && W.offHold) return W.offHold; // a second blade
    if (!W || !W.off) return null;
    const sh = inv.has('shield'), ax = W.off === 'any' && inv.has('brother_axe');
    return sh && !(ax && fl.offAxe) ? 'shield' : ax ? 'brother_axe' : null;
  }
  hasShield() { return this.offItem() === 'shield'; }
  /** Red Mist (Berserker): badly hurt, and the better for it. */
  mist() { return this.health < 35 && this.game.skills.has('b_mist'); }
  /** Both Brothers in hand: every blow lands harder. */
  dual() { return this.offItem() === 'brother_axe'; }
  swapOffHand() {
    const g = this.game, inv = g.inventory, fl = g.state.flags;
    if (!inv.has('shield') || !inv.has('brother_axe')) return;
    fl.offAxe = !fl.offAxe; g.audio.play('page');
    if (this.isMelee()) this.h.hold('L', this.offItem());
    g.ui.toast(fl.offAxe ? 'Off hand: the Left Brother. Harder blows, no shield.' : 'Off hand: shield.');
  }
  /** A shove with the shield boss: no wound to speak of, but it breaks a man's rhythm and wears his guard. */
  bash() {
    const g = this.game, h = this.h;
    if (h.busy || this.bashT > 0 || this.stamina < 12) return;
    this.stamina -= 12; this.staminaDelay = 0.7; this.bashT = g.skills.has('s_boss') ? 0.7 : 1.1;
    h.play('shove', 0.42, { hitAt: 0.35, onHit: () => g.events.emit('playerBash') });
    g.audio.play('whoosh', { vol: 0.5 });
  }
  /** The Storm-Ward turns a blow: light, noise, and the world held still for a breath. */
  wardFlash(from) {
    const g = this.game, ax = from.x - this.pos.x, az = from.z - this.pos.z, ad = Math.hypot(ax, az) || 1;
    for (let i = 0; i < 3; i++) g.fx.burst('spark', this.pos.x + (ax / ad) * (0.5 + i * 0.35), this.pos.y + 1.0 + i * 0.25, this.pos.z + (az / ad) * (0.5 + i * 0.35), 10);
    g.audio.play('parry'); g.audio.play('steel'); g.audio.play('drum', { vol: 0.8 });
    g.hitStop = 0.12; g.slowT = 0.45; this.cam.shake = 0.3; this.wardT = Math.min(this.wardT, 0.18); // one blow turned, and a moment more
    g.events.emit('warded');
  }
  /** An arrow arrives. Only a raised shield stops it. */
  receiveArrow(from, dmg) {
    const g = this.game;
    if (this.iframes > 0) return 'dodged';
    if (this.wardT > 0) { this.wardFlash(from); return 'warded'; }
    const facing = Math.abs(angleDiff(this.yaw, Math.atan2(from.x - this.pos.x, from.z - this.pos.z))) < 1.2;
    if (this.blocking && facing && this.hasShield()) { g.audio.play('clack'); if (!g.skills.has('s_wall')) this.stamina = Math.max(0, this.stamina - 4); return 'blocked'; }
    this.health = Math.max(this.mortal ? 0 : 1, this.health - dmg);
    this.h.play('stagger', 0.35); g.audio.play('hurt'); this.cam.shake = 0.18;
    if (this.health <= 0) g.events.emit('playerDied');
    return 'hit';
  }
  /** The melee weapon slot 1 draws: Ragnar's axe once he has taken it up, otherwise the practice blade. */
  melee() { const own = this.meleeOwned(), last = this.game.state.flags.melee; return own.includes(last) ? last : own[0] || null; }
  /** The melee weapons he can draw now, in the order the weapon key steps through them. A child has only the practice blade. */
  meleeOwned() {
    const g = this.game, inv = g.inventory, grown = g.state.stage === 'act2' || g.state.stage === 'open';
    const real = grown ? MELEE_ORDER.filter((k) => inv.has(k) && !(k === 'father_axe' && g.state.flags.axeHidden)) : [];
    return real.length ? real : inv.has('woodsword') ? ['woodsword'] : [];
  }
  /** A thrown axe: at the man he is facing if there is one, else where the camera looks. */
  throwAxe() {
    const g = this.game, h = this.h, inv = g.inventory;
    if (h.busy || !this.adult || this.throwT > 0 || this.blocking || this.aiming) return;
    if (inv.count('throwaxe') <= 0) { if (inv.has('father_axe')) g.ui.toast('No throwing axes'); return; }
    const tg = this.target && !this.target.dead && this.target.dist(this) < 24 ? this.target : null;
    if (tg) this.yaw = Math.atan2(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z);
    this.throwT = g.skills.has('h_axe') ? 0.5 : 0.9; this.stamina = Math.max(0, this.stamina - 6); this.staminaDelay = 0.5;
    h.play('atk1', 0.42, { hitAt: 0.36, onHit: () => {
      if (inv.count('throwaxe') <= 0) return;
      inv.remove('throwaxe', 1, true);
      h.handWorld('R', _v);
      let dir;
      if (tg && !tg.dead) { const d = tg.dist(this), t = d / 19; dir = new THREE.Vector3(tg.pos.x - _v.x, tg.pos.y + 1.15 * tg.h.scale + 3.25 * t * t - _v.y, tg.pos.z - _v.z).normalize(); } // lift for the drop
      else { g.camera.getWorldDirection(_d); dir = this.aimPoint(_d).sub(_v).normalize(); dir.y += 0.06; dir.normalize(); }
      g.wildlife.shoot(_v, dir, 19, this, { kind: 'axe', dmg: g.skills.has('h_axe') ? 40 : 30, posture: 32 });
      g.audio.play('whoosh'); g.events.emit('throw');
    } });
  }
  swing(heavy) {
    const g = this.game, h = this.h;
    const W = this.weaponDef();
    if (h.busy || this.blocking || this.stamina < (heavy ? 14 : 6) * W.stam) return;
    const n = heavy ? 3 : (this.combo % 3) + 1, mv = this.lastMove;
    let anim = (heavy && W.animHeavy) || W.anim || 'atk' + n, mod = {}, speed = W.speed;
    // which way he is pushing chooses the blow (a grown man with a weapon that swings: a spear always thrusts, a maul always comes down)
    if (!W.anim && this.adult) {
      if (!heavy && Math.abs(mv.x) > 0.5 && Math.abs(mv.x) > Math.abs(mv.y)) { anim = mv.x < 0 ? 'atk2' : 'atk1'; mod = { arc: 1.3, sweep: 1, dir: 'side' }; } // sideways: a wide cut that reaches one more man
      else if (!heavy && mv.y < -0.5) { anim = 'atk3'; mod = { posture: 1.6, dmg: 1.1, dir: 'over' }; speed *= 0.9; }                                  // back: down onto his guard
      else if (heavy && mv.y > 0.5 && !W.animHeavy) { anim = 'thrust'; mod = { reach: 0.7, arc: 0.6, lunge: 2.6, dir: 'thrust' }; }                    // forward and heavy: a lunging thrust
    }
    if (W.double && !heavy) anim = this.combo % 2 ? 'twinL' : 'atk1'; // one hand, then the other
    if (heavy && this.combo >= 2) { mod.dmg = (mod.dmg || 1) * 1.2; mod.combo = true; speed *= 1.25; } // two light blows, then the heavy one: it comes faster and harder
    this.stamina -= (heavy ? 16 : 7) * W.stam; this.staminaDelay = 0.6; this.combo = heavy ? 0 : this.combo + 1; this.comboT = 1.0; this.crouch = false;
    g.audio.play('whoosh'); g.events.emit('swingStart', heavy);
    const tg = this.target, gap = tg ? Math.hypot(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z) : 9; // soft lock: turn to face a nearby opponent
    if (tg && gap < 3.6 + (mod.reach || 0)) this.yaw = Math.atan2(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z);
    const dur = (heavy ? 0.85 : n === 3 ? 0.62 : 0.5) / speed;
    this.lungeT = dur * 0.36; this.lungeV = mod.lunge || (tg && gap > W.reach - 0.6 && gap < 5 ? 2.6 : 0.7); // he steps into the blow
    h.play(anim, dur, { hitAt: heavy ? 0.45 : 0.4, onHit: () => {
      g.events.emit('playerSwing', n, heavy, mod);
      if (W.double && !heavy) g.after(0.11, () => g.events.emit('playerSwing', n, heavy, { ...mod, dmg: (mod.dmg || 1) * W.double, second: true }));
    } });
  }
  /** Swap the body (child to grown man) while keeping position, camera and everything that points at the player. */
  setLook(look, adult) {
    // what the player chose for him (Appearance) lies over the look the story gives; a child keeps only the eyes and the scar
    const own = this.game.state.look || {}, mine = adult ? own : { eyes: own.eyes, scar: own.scar };
    for (const k in mine) if (mine[k] === undefined) delete mine[k];
    this.baseLook = look; look = Object.assign({}, look, mine, { scar: look.scar }); // the lightning scar is his, whatever else changes
    const nh = new Humanoid(look);
    this.root.remove(this.h.body); this.root.add(nh.body);
    nh.root = this.root; nh.onStep = this.h.onStep; nh.lift = this.h.lift; this.look = look;
    this.h = nh; this.adult = adult; this.backAxe = null; this.equipped = 'none';
    this.speedMul = adult ? 1.28 : 1; this.cam.maxDist = adult ? 4.9 : 4.1;
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
        const r = a.kind === 'deer' ? 1.0 : 0.55, cy = a.pos.y + (a.kind === 'deer' ? 1.1 : a.kind === 'wolf' ? 0.6 : 0.2);
        if (Math.abs(pt.x - a.pos.x) < r && Math.abs(pt.z - a.pos.z) < r && Math.abs(pt.y - cy) < r) return pt;
      }
    }
    return pt;
  }

  /** Called by attackers. Returns 'dodged' | 'parried' | 'blocked' | 'hit'. */
  receive(attacker, dmg, opts = {}) {
    const g = this.game;
    if (this.iframes > 0) return 'dodged';
    if (this.wardT > 0) { this.wardFlash(attacker.pos); return 'warded'; }
    const facing = Math.abs(angleDiff(this.yaw, Math.atan2(attacker.pos.x - this.pos.x, attacker.pos.z - this.pos.z))) < 1.2;
    if (this.blocking && facing && !opts.unblockable) {
      if (this.blockT < this.weaponDef().parry + (g.skills.has('s_turn') ? 0.1 : 0)) {
        g.audio.play('parry'); this.h.play('parry', 0.3);
        this.h.handWorld('R', _v); g.fx.burst('chips', _v.x, _v.y + 0.2, _v.z, 6);
        this.ward = Math.min(100, this.ward + 18);
        this.riposteT = g.skills.has('s_answer') ? 1.7 : 1.0; g.hitStop = 0.07; // the next blow inside a second cannot be guarded
        return 'parried';
      }
      const iron = this.hasShield() && g.skills.has('s_iron');
      this.stamina -= this.hasShield() ? (iron ? 3.5 : 7) : this.weaponDef().block; this.staminaDelay = 0.8; g.audio.play('clack');
      if (this.stamina <= 0) { this.stamina = 0; if (!iron) { this.h.play('stagger', 0.6); return 'hit'; } }
      // the blow lands on the guard: he gives a little ground, and iron rings where the weapons met
      this.h.play('blockhit', 0.24);
      const ax = attacker.pos.x - this.pos.x, az = attacker.pos.z - this.pos.z, ad = Math.hypot(ax, az) || 1;
      g.fx.burst('spark', this.pos.x + (ax / ad) * 0.55, this.pos.y + 1.25, this.pos.z + (az / ad) * 0.55, 7);
      if (g.world.walkable(this.pos.x - (ax / ad) * 0.22, this.pos.z - (az / ad) * 0.22)) { this.pos.x -= (ax / ad) * 0.22; this.pos.z -= (az / ad) * 0.22; }
      this.cam.shake = 0.12;
      return 'blocked';
    }
    this.health = Math.max(this.mortal ? 0 : 1, this.health - dmg);
    if (!this.mist()) this.h.play('stagger', 0.5); // the red mist: a blow no longer breaks his swing
    g.audio.play('hurt'); this.cam.shake = 0.25;
    if (this.health <= 0) g.events.emit('playerDied');
    return 'hit';
  }

  update(dt, ctrl) {
    const g = this.game, inp = g.input, h = this.h, cam = this.cam, world = g.world;
    ctrl = ctrl && !this.frozen && !g.ravens.eye;
    const mv = ctrl ? inp.move() : { x: 0, y: 0, mag: 0 };
    const fX = Math.sin(cam.yaw), fZ = Math.cos(cam.yaw), rX = -Math.cos(cam.yaw), rZ = Math.sin(cam.yaw);
    let dx = fX * mv.y + rX * mv.x, dz = fZ * mv.y + rZ * mv.x;
    const dm = Math.hypot(dx, dz);
    if (dm > 1e-4) { dx /= dm; dz /= dm; }

    if (ctrl) {
      if (inp.hit('crouch')) this.crouch = !this.crouch;
      if (inp.hit('weapon1')) { // draw the last one used; again steps to the next he carries; after the last, put away
        const own = this.meleeOwned(), i = own.indexOf(this.equipped), next = i < 0 ? this.melee() : own[i + 1] || 'none';
        if (next) { this.equip(next); if (next !== 'none') { g.state.flags.melee = next; if (own.length > 1) g.ui.toast(ITEMS[next] ? ITEMS[next].name : next); } }
      }
      if (inp.hit('throw')) this.throwAxe();
      if (inp.hit('weapon2')) this.equip(this.equipped === 'bow' ? 'none' : 'bow');
      if (inp.hit('holster')) this.equip('none');
      if (inp.hit('weapon3')) this.swapOffHand();
      if (inp.hit('interact')) g.tryInteract();
    }
    const wantAimOrBlock = ctrl && inp.held('block');
    this.aiming = wantAimOrBlock && this.equipped === 'bow' && !h.busy;
    const wasBlocking = this.blocking;
    this.blocking = wantAimOrBlock && this.isMelee() && this.dodgeT <= 0;
    this.blockT = this.blocking ? (wasBlocking ? this.blockT + dt : 0) : 0;

    // --- actions ---
    this.comboT -= dt; if (this.comboT <= 0) this.combo = 0;
    this.riposteT = (this.riposteT || 0) - dt; this.bashT = (this.bashT || 0) - dt; this.throwT = (this.throwT || 0) - dt;
    if (ctrl && this.blocking && this.hasShield() && inp.hit('attack')) this.bash();
    this.iframes -= dt;
    this.lastMove.x = mv.x; this.lastMove.y = mv.y;
    // dodge: a roll going forward or at a sprint, a quick sidestep otherwise (a boy only rolls)
    const roll = !this.adult || inp.held('sprint') || (dm > 0.2 && mv.y > 0.5), dodgeCost = roll ? 16 : 10;
    if (ctrl && inp.hit('dodge') && this.dodgeT <= 0 && this.stamina >= dodgeCost && !this.aiming) {
      this.dodgeDur = this.dodgeT = roll ? 0.42 : 0.26; this.dodgeK = roll ? 6.2 : 7.4; this.iframes = roll ? 0.32 : 0.2;
      this.stamina -= dodgeCost; this.staminaDelay = roll ? 0.7 : 0.45; this.crouch = false;
      if (dm > 0.2) this.dodgeDir.set(dx, 0, dz); else this.dodgeDir.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      h.play(roll ? 'dodge' : 'sidestep', this.dodgeT); g.audio.play('whoosh', { vol: 0.6 }); g.events.emit('dodge', roll);
    }
    // the Storm-Ward: for a moment, whatever comes is turned
    this.wardT -= dt;
    if (ctrl && inp.hit('ward') && this.adult && this.isMelee()) {
      if (this.ward >= 50 && this.wardT <= 0 && !h.busy) { this.ward -= 50; this.wardT = 0.6; h.play('ward', 0.5); g.audio.play('parry', { vol: 0.6 }); h.handWorld('R', _v); g.fx.burst('spark', _v.x, _v.y + 0.2, _v.z, 8); g.events.emit('ward'); }
      else if (this.ward < 50) g.ui.toast('The Storm-Ward is not ready: land blows and parry to fill it');
    }
    if (ctrl && inp.hit('shoulder')) this.camSide = -this.camSide;
    // melee: tap for a light blow; hold and release (or keep holding) for a heavy one that breaks a guard
    if (ctrl && this.isMelee()) {
      if (inp.held('attack') && this.atkHold >= 0) this.atkHold += dt;
      const rel = inp.released('attack') && this.atkHold > 0;
      if (rel || this.atkHold > 0.62) { this.swing(this.atkHold > 0.36); this.atkHold = rel ? 0 : -1; }
      if (!inp.held('attack') && this.atkHold < 0) this.atkHold = 0;
    } else this.atkHold = 0;
    if (ctrl && inp.hit('attack')) {
      if (this.equipped === 'bow' && this.aiming) {
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
    if (this.aiming) this.draw = Math.min(1, this.draw + dt / (g.skills.has('h_still') ? 0.5 : 0.75)); else this.draw = 0;
    this.updateArc();
    h.param = this.draw;
    h.setLoop(this.aiming ? 'aim' : this.blocking ? 'block' : this.loopOverride || null);

    // --- locomotion ---
    this.sprinting = ctrl && inp.held('sprint') && mv.mag > 0.5 && this.stamina > 1 && !this.crouch && !this.aiming && !this.blocking;
    let top = this.crouch ? SPEED.crouch : this.aiming ? SPEED.aim : this.blocking ? (this.hasShield() && g.skills.has('s_wall') ? SPEED.jog : SPEED.block) : this.sprinting ? SPEED.sprint : SPEED.jog;
    if (h.busy && this.dodgeT <= 0) top *= 0.35;
    top *= this.speedMul ?? 1;
    this.speed = damp(this.speed, mv.mag * top, 10, dt);
    if (this.sprinting) { this.stamina -= (g.skills.has('y_road') ? 6 : 10) * dt; this.staminaDelay = 0.9; }
    this.staminaDelay -= dt;
    if (this.staminaDelay <= 0) this.stamina = Math.min(100, this.stamina + 17 * dt);
    this.stamina = Math.max(0, this.stamina);
    if (this.health < 100) this.health = Math.min(100, this.health + (g.combat.active && this.mortal ? 0.3 : 1.5) * dt);

    const px = this.pos.x, pz = this.pos.z;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const k = (this.dodgeK || 6.2) * Math.max(0.25, this.dodgeT / (this.dodgeDur || 0.42));
      this.pos.x += this.dodgeDir.x * k * dt; this.pos.z += this.dodgeDir.z * k * dt;
    } else if (this.speed > 0.02 && dm > 1e-4) {
      this.pos.x += dx * this.speed * dt; this.pos.z += dz * this.speed * dt;
    }
    if (this.lungeT > 0) { // the step that carries a blow in; it stops short of the man
      this.lungeT -= dt;
      const tg = this.target;
      if (!tg || Math.hypot(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z) > 1.4) { this.pos.x += Math.sin(this.yaw) * this.lungeV * dt; this.pos.z += Math.cos(this.yaw) * this.lungeV * dt; }
    }
    world.resolve(this.pos, 0.3);
    if (!world.walkable(this.pos.x, this.pos.z)) { this.pos.x = px; this.pos.z = pz; this.speed *= 0.5; }
    if (!this.riding) this.pos.y = damp(this.pos.y, world.groundAt(this.pos.x, this.pos.z), 20, dt); // a mount carries him
    this.moving = Math.hypot(this.pos.x - px, this.pos.z - pz) > 0.0005;

    if (this.blocking && this.target && Math.hypot(this.target.pos.x - this.pos.x, this.target.pos.z - this.pos.z) < 6) this.yaw = dampAngle(this.yaw, Math.atan2(this.target.pos.x - this.pos.x, this.target.pos.z - this.pos.z), 16, dt);
    else if (this.aiming || this.blocking) this.yaw = dampAngle(this.yaw, cam.yaw, 16, dt);
    else if (this.faceTarget) this.yaw = dampAngle(this.yaw, Math.atan2(this.faceTarget.x - this.pos.x, this.faceTarget.z - this.pos.z), 8, dt);
    else if (dm > 1e-4 && this.speed > 0.1 && this.dodgeT <= 0) this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 11, dt);
    this.root.rotation.y = this.yaw;
    // his face and where he looks: the man he is fighting, the person he is talking to, else straight ahead
    this.headPos.set(this.pos.x, this.pos.y + h.headHeight(), this.pos.z);
    const dn = g.mode === 'dialogue' && g.dialogue.npc, look = this.target && !this.target.dead ? this.target : dn && dn.visible ? dn : null;
    if (look) { _look.set(look.pos.x, look.pos.y + look.h.headHeight(), look.pos.z); h.lookAt(_look); } else h.lookAt(null);
    h.baseMood = this.health < 35 && this.mortal ? 'pain' : this.stamina < 16 ? 'tired' : g.combat.active ? 'anger' : 'neutral';
    h.breath = this.stamina < 30 ? 2.8 : this.sprinting || g.combat.active ? 1.8 : 1;
    h.setLocomotion(this.moving ? this.speed : 0, this.crouch);
    h.update(dt);
    this.noise = !this.moving ? 0 : this.crouch ? 1.2 : this.sprinting ? 10 : 5;
    this.updateCamera(dt, ctrl);
  }

  updateCamera(dt, ctrl) {
    const g = this.game, cam = this.cam, c = g.camera;
    if (g.cine.active || g.ravens.eye) return;
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
    const rX = -Math.cos(cam.yaw), rZ = Math.sin(cam.yaw), off = 0.55 * cam.aimK * this.camSide; // the bow can be aimed over either shoulder
    const tx = cam.target.x + rX * off, ty = cam.target.y + 0.1 * cam.aimK, tz = cam.target.z + rZ * off;
    this.execT -= dt; this.exK = damp(this.exK, this.execT > 0 ? 1 : 0, 9, dt); cam.yaw += this.exK * 0.9 * dt; // a finishing blow: the camera comes in and swings round
    const want = lerp(lerp(cam.maxDist + (g.combat.active && !this.riding ? 1.2 : 0), 2.5, this.exK), 1.75, cam.aimK); // a fight is framed wider
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
