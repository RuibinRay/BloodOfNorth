// Open-world systems (prototype): the law (wolf-marks and standing in a district) and mounts
// (a horse on land, a rowing boat at sea). Design reference: docs/OPEN_WORLD.md.
import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/util.js';
import { heightAt } from '../world/terrain.js';
import { makeShip } from '../world/props.js';
import { M } from '../world/geo.js';
import { BOUNDS } from '../world/layout.js';
import { horseModel } from '../entities/wildlife.js';

export const MARK_NAMES = ['', 'Fined', 'Hue and cry', 'Lesser outlawry', 'Full outlawry', 'Wolf in hallowed places'];
export const TIERS = [
  { min: 0, name: 'Wolf', hail: "Wolf's-head! Keep back from me!" },
  { min: 15, name: 'Stranger', hail: 'Traveller. Keep that axe in your belt while you are here.' },
  { min: 40, name: 'Guest', hail: '{n}. You are welcome at the fire.' },
  { min: 60, name: 'Kinsman', hail: 'Ravensson! Friend. Sit, eat. The white bird too.' },
  { min: 80, name: 'Jarl', hail: 'Lord. The island is yours to call on.' },
  { min: 100, name: 'King', hail: 'My king.' },
];
/** Law-districts. Outlawry and standing are kept per district: cross the water and you may be a stranger again. */
export const DISTRICTS = {
  vestland: { name: 'Vestland', local: 'the Vestland', seat: 'Gulen', champion: 'Hallvard' },
  skerries: { name: 'The Skerries', local: 'the Skerries', seat: 'Kinn', champion: 'Sigtrygg Salt-Beard' },
};
const WEIGHT = { assault: 1, theft: 1, killing: 2 };
const _v = new THREE.Vector3();

/** Outlawry and standing, per law-district. State lives in game.state.open so it is saved
 *  (the Vestland's on the object itself, as in 0.5 saves; the Skerries' under .sk). */
export class Law {
  constructor(game) { this.g = game; this.id = 'vestland'; this.huntT = 0; this.onChange = null; }
  get s() { const o = this.g.state.open; return this.id === 'vestland' ? o : o.sk; }
  get district() { return DISTRICTS[this.id].name; }
  get def() { return DISTRICTS[this.id]; }
  tier() { const s = this.s; if (s.marks >= 4) return TIERS[0]; let t = TIERS[0]; for (const x of TIERS) if (s.standing >= x.min) t = x; return t; }
  addStanding(n, why) {
    const s = this.s, before = this.tier().name;
    s.standing = clamp(s.standing + n, 0, 100);
    if (why) this.g.ui.toast(`${why} (${n > 0 ? '+' : ''}${n} standing)`);
    const now = this.tier().name;
    if (now !== before) { this.g.ui.questBanner(`Standing in ${this.district}`, now); this.g.audio.play(n > 0 ? 'questDone' : 'uiBack'); }
  }
  /** A crime only counts if somebody who is not dead saw it. `witnesses` is a list of NPCs that could have. */
  crime(kind, where, witnesses) {
    const g = this.g, s = this.s;
    const seen = witnesses.find((n) => n.visible && !n.dead && Math.hypot(n.pos.x - where.x, n.pos.z - where.z) < 32);
    if (!seen) { g.ui.toast('Nobody saw.'); return false; }
    const before = s.marks;
    s.marks = Math.min(5, s.marks + WEIGHT[kind]); s.cool = 0;
    this.addStanding(-10 * WEIGHT[kind]);
    g.ui.toast(`${seen.name} saw the ${kind}. ${MARK_NAMES[s.marks]}.`);
    if (s.marks !== before) { g.audio.play('horn', { freq: 110, vol: 0.4 }); if (this.onChange) this.onChange(s.marks, before); }
    return true;
  }
  clear(how) {
    const s = this.s, before = s.marks;
    s.marks = 0; s.cool = 0; this.huntT = 0;
    this.g.ui.toast(how); this.g.audio.play('chime');
    if (this.onChange) this.onChange(0, before);
  }
  update(dt) {
    const g = this.g, s = this.s;
    if (!g.combat.active && g.mode === 'play') for (const d of [g.state.open, g.state.open.sk]) { // talk dies down, here and across the water
      if (!d || d.marks <= 0) continue;
      d.cool = (d.cool || 0) + dt;
      if (d.cool > 150) { d.cool = 0; const b = d.marks; d.marks--; if (d === s) { g.ui.toast('Talk dies down. A wolf-mark fades.'); if (this.onChange) this.onChange(d.marks, b); } }
    }
    g.ui.setLaw({ district: this.district, tier: this.tier().name, marks: s.marks, name: MARK_NAMES[s.marks] });
  }
}

/** A horse and a boat. While riding, this class moves the player (player.frozen is set). */
export class Mounts {
  constructor(game) { this.g = game; this.horse = null; this.boat = null; this.on = null; this.t = 0; this.hintKey = ''; }

  spawnHorse(x, z) {
    const g = this.g, model = horseModel();
    g.scene.add(model);
    const h = (this.horse = { type: 'horse', model, pos: model.position, yaw: 1, speed: 0, hop: 0, called: false });
    h.pos.set(x, g.world.groundAt(x, z), z);
    g.world.addInteractable({ id: 'horse', pos: () => h.pos, r: 2.6, priority: 1, label: 'Mount the horse', enabled: () => !this.on, use: () => this.mount(h) });
    return h;
  }
  spawnBoat(x, z, yaw = 0) {
    const g = this.g, model = makeShip({ L: 6.4, B: 1.7, D: 0.62, rise: 0.75, seed: 7 });
    g.scene.add(model);
    const b = (this.boat = { type: 'boat', model, pos: model.position, yaw, speed: 0, sailUp: false, sailK: 0 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.7, 6), M.timber); mast.position.set(0, 2.1, 0.3);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.8, 5), M.timber); yard.rotation.z = Math.PI / 2; yard.position.set(0, 3.74, 0.37);
    const sg = new THREE.PlaneGeometry(2.6, 2.6, 6, 4), sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.cos((sp.getX(i) / 1.3) * 1.4) * 0.38 * (0.4 + 0.6 * (0.5 - sp.getY(i) / 2.6)));
    sg.computeVertexNormals(); sg.translate(0, -1.3, 0); // it hangs from the yard, so it furls upward
    b.sail = new THREE.Mesh(sg, M.sail); b.sail.position.set(0, 3.72, 0.43); b.sail.scale.y = 0.07;
    model.add(mast, yard, b.sail);
    b.pos.set(x, -0.14, z); model.rotation.y = yaw;
    g.world.addInteractable({ id: 'boat', pos: () => b.pos, r: 6, priority: 1, label: 'Board the boat', enabled: () => !this.on, use: () => this.mount(b) });
    return b;
  }
  /** First deep water on a line (for mooring the boat off a beach). */
  static deepWater(x, z0, z1, depth = -0.9) { for (let z = z0; z <= z1; z += 1) if (heightAt(x, z) < depth) return z; return z1; }

  mount(m) {
    const g = this.g, p = g.player;
    if (g.combat.active) { g.ui.toast('Not in the middle of a fight'); return; }
    this.on = m; p.frozen = true; p.riding = true; p.crouch = false; p.equip('none'); p.loopOverride = 'sit';
    p.h.lift = m.type === 'horse' ? 1.0 : 0.05; p.cam.maxDist = m.type === 'horse' ? 6.6 : 8.5;
    if (m.type === 'horse') m.yaw = p.yaw; else m.speed = 0;
    g.audio.play('page'); this.hintKey = ''; this.fresh = true; // the same key press must not dismount again
    g.events.emit('mounted', m.type);
  }
  dismount(to) {
    const g = this.g, p = g.player, m = this.on;
    if (!m) return;
    this.on = null; p.frozen = false; p.riding = false; p.loopOverride = null; p.h.lift = 0; p.cam.maxDist = p.adult ? 4.9 : 4.1;
    const x = to ? to.x : m.pos.x + Math.cos(m.yaw) * 1.3, z = to ? to.z : m.pos.z - Math.sin(m.yaw) * 1.3;
    p.pos.set(x, g.world.groundAt(x, z), z); p.speed = 0;
    m.speed = 0; m.sailUp = false; g.ui.hint(null); g.audio.play('uiBack');
    g.events.emit('dismounted', m.type);
  }
  whistle() {
    const g = this.g, h = this.horse;
    if (!h || this.on) return;
    if (Math.hypot(h.pos.x - g.player.pos.x, h.pos.z - g.player.pos.z) > 170) { g.audio.play('bird'); g.ui.toast('You whistle. She is too far to hear.'); return; }
    h.called = true; g.audio.play('bird'); g.after(0.12, () => g.audio.play('bird')); g.ui.toast('You whistle. Hooves answer.');
  }
  /** Nearest dry ground within reach of the boat. */
  shore() {
    const b = this.boat, w = this.g.world; let best = null, bd = Infinity;
    for (let r = 2.5; r <= 9; r += 1.3) for (let a = 0; a < 6.28; a += 0.4) {
      const x = b.pos.x + Math.cos(a) * r, z = b.pos.z + Math.sin(a) * r;
      if (heightAt(x, z) > 0.2 && r < bd) { bd = r; best = { x, z }; }
      else if (w.groundAt(x, z) > 0.9 && r < bd) { bd = r; best = { x, z }; } // the dock
    }
    return best;
  }
  hint(key, text) { if (this.hintKey !== key) { this.hintKey = key; this.g.ui.hint(text); } }

  update(dt) {
    const g = this.g, p = g.player, inp = g.input, live = g.mode === 'play', h = this.horse, m = this.on;
    this.t += dt;
    if (live && inp.hit('whistle')) this.whistle();
    if (h && m !== h) { // loose horse: stand, or come when called
      let want = 0;
      if (h.called) {
        const dx = p.pos.x - h.pos.x, dz = p.pos.z - h.pos.z, d = Math.hypot(dx, dz);
        if (d < 3.2) h.called = false; else { want = Math.min(11, 3 + d * 0.5); h.yaw = dampAngle(h.yaw, Math.atan2(dx, dz), 5, dt); }
      }
      h.speed = damp(h.speed, want, 3, dt);
      if (h.speed > 0.1) { _v.set(h.pos.x + Math.sin(h.yaw) * h.speed * dt, 0, h.pos.z + Math.cos(h.yaw) * h.speed * dt); g.world.resolve(_v, 0.5); if (g.world.walkable(_v.x, _v.z)) { h.pos.x = _v.x; h.pos.z = _v.z; } else h.called = false; }
      h.pos.y = damp(h.pos.y, g.world.groundAt(h.pos.x, h.pos.z), 14, dt);
    }
    if (h) {
      h.hop += dt * (3 + h.speed * 1.5);
      const s = Math.sin(h.hop) * clamp(h.speed / 9, 0, 0.8), lg = h.model.userData.legs;
      lg[0].rotation.x = s; lg[1].rotation.x = -s; lg[2].rotation.x = -s; lg[3].rotation.x = s;
      h.model.rotation.y = h.yaw;
    }
    if (!m) return;

    const mv = live ? inp.move() : { x: 0, y: 0, mag: 0 }, act = live && !this.fresh && inp.hit('interact');
    this.fresh = false;
    if (m.type === 'horse') {
      const cy = p.cam.yaw, dx = Math.sin(cy) * mv.y - Math.cos(cy) * mv.x, dz = Math.cos(cy) * mv.y + Math.sin(cy) * mv.x;
      const gallop = live && inp.held('sprint') && p.stamina > 3 && mv.mag > 0.3;
      const top = mv.mag > 0.1 ? (gallop ? 12.5 : 7) * mv.mag : 0;
      m.speed = damp(m.speed, top, top > m.speed ? 1.5 : 3.5, dt);
      if (mv.mag > 0.1) m.yaw = dampAngle(m.yaw, Math.atan2(dx, dz), 2.8, dt);
      if (gallop && m.speed > 8) { p.stamina -= 5 * dt; p.staminaDelay = 0.6; }
      _v.set(m.pos.x + Math.sin(m.yaw) * m.speed * dt, 0, m.pos.z + Math.cos(m.yaw) * m.speed * dt);
      g.world.resolve(_v, 0.55);
      if (g.world.walkable(_v.x, _v.z) && !g.world.onIce(_v.x, _v.z)) { m.pos.x = _v.x; m.pos.z = _v.z; } else m.speed *= 0.4;
      m.pos.y = damp(m.pos.y, g.world.groundAt(m.pos.x, m.pos.z), 14, dt);
      p.pos.copy(m.pos); p.yaw = m.yaw; p.root.rotation.y = m.yaw;
      if (m.speed > 2 && Math.sin(m.hop) * Math.sin(m.hop - dt * (3 + m.speed * 1.5)) < 0) g.audio.play('step', { vol: 0.9 });
      this.hint('horse', 'Ride with {forward}{left}{back}{right}. Hold {sprint} to gallop. {interact} to dismount, {whistle} to call the horse.');
      if (act) this.dismount();
    } else {
      if (live && inp.hit('sprint')) { m.sailUp = !m.sailUp; g.audio.play('page'); g.ui.toast(m.sailUp ? 'The sail is set.' : 'Sail down. Oars out.'); }
      // under sail she runs on her own; the oars are slower but will go anywhere
      const want = m.sailUp ? (mv.y < -0.1 ? 3.2 : 11.5) : mv.y > 0.1 ? 4.8 : mv.y < -0.1 ? -1.6 : 0;
      m.speed = damp(m.speed, want, m.sailUp ? 0.55 : 0.9, dt);
      m.yaw -= mv.x * (m.sailUp ? 0.62 : 0.95) * dt * clamp(Math.abs(m.speed) / 2 + 0.35, 0.35, 1);
      const nx = m.pos.x + Math.sin(m.yaw) * m.speed * dt, nz = m.pos.z + Math.cos(m.yaw) * m.speed * dt;
      const onChart = Math.abs(nx) < (nz > 322 ? BOUNDS.seaX - 6 : 300) && nz < BOUNDS.maxZ - 6;
      if (heightAt(nx, nz) < -0.45 && onChart) { m.pos.x = nx; m.pos.z = nz; }
      else {
        m.speed *= 0.2;
        if (!onChart && this.t - (this.edgeT || -99) > 12) { this.edgeT = this.t; g.ui.toast('The chart ends here. Past this the Whale Road has no names yet.'); }
        if (m.sailUp) { m.sailUp = false; if (onChart) g.ui.toast('She grounds. The sail comes down.'); }
      }
      m.sailK = damp(m.sailK, m.sailUp ? 1 : 0, 3.5, dt); m.sail.scale.y = 0.07 + 0.93 * m.sailK; p.cam.maxDist = 8.5 + 3.5 * m.sailK;
      m.pos.y = -0.14 + Math.sin(this.t * 1.3) * 0.04;
      m.model.rotation.set(Math.sin(this.t * 0.9) * 0.03, m.yaw, Math.sin(this.t * 1.1) * 0.04 + m.sailK * 0.07);
      p.pos.set(m.pos.x, 0.0, m.pos.z); p.yaw = m.yaw; p.root.rotation.y = m.yaw;
      if (Math.abs(m.speed) > 1 && this.t % (m.speed > 7 ? 0.5 : 1.4) < dt) { g.audio.play('splash', { vol: 0.25 }); g.fx.burst('splash', m.pos.x - Math.sin(m.yaw) * 2.6, 0.05, m.pos.z - Math.cos(m.yaw) * 2.6, 3); }
      const land = this.shore();
      if (land) this.hint('land', 'Press {interact} to step ashore.');
      else if (m.sailUp) this.hint('sail', 'Under sail. Steer with {left}{right}, hold {back} to spill the wind, {sprint} lowers the sail.');
      else this.hint('row', 'Row with {forward}, back water with {back}, steer with {left}{right}. {sprint} sets the sail.');
      if (land && act) this.dismount(land);
    }
  }
}
