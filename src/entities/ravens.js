// Eirik's two ravens: a rare white one and her black brother.
// The black raven keeps close to Eirik. The white one can be flown ("Raven's Eye") to scout from
// above and mark what she sees. Later acts build on this: see docs/OPEN_WORLD.md.
import { ravenModel } from './wildlife.js';
import { clamp, damp } from '../core/util.js';

const LEASH = 170, MIN_ALT = 9, MAX_ALT = 60;

export class Ravens {
  constructor(game) {
    this.g = game; this.mode = 'hidden'; this.eye = false; this.t = 0;
    this.white = ravenModel(0xe9e6df, 0xcaa79c); this.black = ravenModel(0x14141a);
    for (const m of [this.white, this.black]) { m.visible = false; m.scale.setScalar(1.25); game.scene.add(m); }
    this.yaw = 0; this.pitch = 0.55; this.alt = 20; this.speed = 9; this.markables = []; this.target = null; this.leashT = -10;
  }
  /** [white, black] — chosen by the player in Chapter 3. */
  names() { return this.g.state.ravenNames || ['Mjöll', 'Sót']; }
  /** 'hidden' until they fledge, then 'follow'. */
  setMode(m) {
    if (m !== 'follow' && this.eye) this.exitEye();
    this.mode = m;
    this.white.visible = this.black.visible = m === 'follow';
    if (m === 'follow') { const p = this.g.player.pos; this.white.position.set(p.x + 2, p.y + 4, p.z); this.black.position.set(p.x - 1, p.y + 3, p.z); }
  }
  /** The black raven dives at an enemy for `t` seconds. */
  harry(e, t) { this.harryT = { e, t }; }
  /** Something the white raven can spot from the air: { id, pos(), r, label, enabled?, onMark }. */
  addMarkable(mk) { this.markables = this.markables.filter((x) => x.id !== mk.id); this.markables.push(mk); }

  enterEye() {
    const g = this.g, p = g.player;
    if (this.mode !== 'follow' || this.eye || p.frozen || g.activity || g.mode !== 'play') return false;
    this.eye = true; this.yaw = p.cam.yaw; this.pitch = 0.55; this.alt = 20; this.speed = 9;
    this.white.position.set(p.pos.x, p.pos.y + 6, p.pos.z);
    g.audio.play('raven'); g.ui.ravenHUD(true, this.names()[0]);
    g.events.emit('ravenEye', true);
    return true;
  }
  exitEye() {
    const g = this.g;
    if (!this.eye) return;
    this.eye = false; this.target = null;
    g.ui.ravenHUD(false); g.audio.play('raven', { vol: 0.6 });
    g.camera.fov = g.baseFov; g.camera.updateProjectionMatrix();
    g.events.emit('ravenEye', false);
  }

  update(dt) {
    if (this.mode !== 'follow') return;
    const g = this.g, p = g.player, w = this.white, b = this.black;
    this.t += dt;
    const flap = (m, rate) => { const f = Math.sin(this.t * rate) * 0.75; m.userData.wings[0].rotation.z = f; m.userData.wings[1].rotation.z = -f; };
    const drift = (m, x, y, z, k) => {
      const px = m.position.x, pz = m.position.z, e = 1 - Math.exp(-k * dt);
      m.position.x += (x - px) * e; m.position.y += (y - m.position.y) * e; m.position.z += (z - pz) * e;
      if (Math.hypot(m.position.x - px, m.position.z - pz) > 1e-4) m.rotation.y = Math.atan2(m.position.x - px, m.position.z - pz);
    };
    // the black brother never leaves the boy; while she is away he circles higher, a beacon to find from the air
    const a = this.t * 0.9, br = this.eye ? 4.5 : 2.4, bh = this.eye ? 7 : 2.9;
    const hr = this.harryT;
    if (hr && hr.t > 0 && !hr.e.dead) { // harrying: all beak and wings in someone's face
      hr.t -= dt;
      drift(b, hr.e.pos.x + Math.sin(this.t * 9) * 0.35, hr.e.pos.y + 1.75 * hr.e.h.scale + Math.cos(this.t * 7) * 0.2, hr.e.pos.z + Math.cos(this.t * 9) * 0.35, 9);
      flap(b, 22);
    } else {
      drift(b, p.pos.x + Math.cos(a) * br, p.pos.y + bh + Math.sin(this.t * 1.7) * 0.25, p.pos.z + Math.sin(a) * br, 3);
      flap(b, 11);
    }
    if (!this.eye) {
      const a2 = -this.t * 0.6 + 2;
      drift(w, p.pos.x + Math.cos(a2) * 4.5, p.pos.y + 5.2 + Math.sin(this.t * 1.1) * 0.5, p.pos.z + Math.sin(a2) * 4.5, 2.5);
      flap(w, 9);
      return;
    }

    // ---- Raven's Eye: fly the white raven -------------------------------------------------
    const inp = g.input, live = g.mode === 'play';
    const mv = live ? inp.move() : { x: 0, y: 0 }, lk = live ? inp.look(dt) : { dx: 0, dy: 0 };
    this.yaw -= lk.dx + mv.x * 1.5 * dt;
    this.pitch = clamp(this.pitch + lk.dy, 0.1, 1.35);
    this.speed = damp(this.speed, mv.y > 0.3 ? 15 : mv.y < -0.3 ? 4 : 9, 3, dt);
    if (live) this.alt = clamp(this.alt + ((inp.held('dodge') ? 1 : 0) - (inp.held('crouch') ? 1 : 0)) * 13 * dt, MIN_ALT, MAX_ALT);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let x = w.position.x + sy * this.speed * dt, z = w.position.z + cy * this.speed * dt;
    const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
    if (d > LEASH) {
      x = p.pos.x + (dx / d) * LEASH; z = p.pos.z + (dz / d) * LEASH;
      if (this.t - this.leashT > 6) { this.leashT = this.t; g.ui.toast(`${this.names()[0]} will not fly further from you`); }
    }
    x = clamp(x, -305, 305); z = clamp(z, -305, 305);
    const y = damp(w.position.y, Math.max(g.world.groundAt(x, z), 0) + this.alt, 3, dt);
    w.position.set(x, y, z); w.rotation.set(0, this.yaw, -mv.x * 0.35);
    flap(w, this.speed > 12 ? 13 : 8);
    const c = g.camera, cp = Math.cos(this.pitch);
    c.position.set(x - sy * 4.2, y + 1.6, z - cy * 4.2);
    c.lookAt(x + sy * 12 * cp, y - 12 * Math.sin(this.pitch), z + cy * 12 * cp);
    if (c.fov !== 62) { c.fov = 62; c.updateProjectionMatrix(); }

    // what can she see? (ahead of her and within range)
    let best = null, bd = Infinity;
    for (const m of this.markables) {
      if (m.done || (m.enabled && !m.enabled())) continue;
      const q = m.pos(), ex = q.x - x, ez = q.z - z, e = Math.hypot(ex, ez);
      if (e > (m.r || 32)) continue;
      if (e > 7 && (ex * sy + ez * cy) / e < 0.3) continue;
      if (e < bd) { bd = e; best = m; }
    }
    this.target = best;
    g.ui.ravenPrompt(best ? best.label : null);
    if (best && live && inp.hit('interact')) { best.done = true; g.audio.play('chime'); best.onMark(best); }
  }
}
