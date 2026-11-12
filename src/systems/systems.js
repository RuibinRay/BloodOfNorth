// Core RPG systems: quests, dialogue, inventory and the cinematic camera.
import * as THREE from 'three';
import { clamp, lerp } from '../core/util.js';

// ---------------------------------------------------------------------------------------
// Quests — data-driven. Steps complete when a matching notify(type, key) arrives.
// ---------------------------------------------------------------------------------------
export class Quests {
  constructor(game, defs) { this.game = game; this.defs = defs; }
  get st() { return this.game.state.quests; }
  isActive(id) { return this.st[id]?.status === 'active'; }
  isDone(id) { return this.st[id]?.status === 'done'; }
  step(id) { const q = this.st[id]; return q && q.status === 'active' ? this.defs[id].steps[q.step] : null; }
  stepId(id) { return this.step(id)?.id ?? null; }
  at(id, stepId) { return this.stepId(id) === stepId; }

  start(id) {
    if (this.st[id]) return;
    const def = this.defs[id];
    this.st[id] = { status: 'active', step: 0, count: 0 };
    this.game.ui.questBanner(def.kind === 'main' ? 'New Quest' : 'Side Quest', def.title);
    this.game.audio.play('chime');
    this.enter(id, false);
  }
  enter(id, restoring = false) {
    const s = this.step(id);
    if (!s) return;
    this.game.story.onStep(id, s.id, restoring);
    this.game.ui.refreshTracker();
    if (!restoring && !s.noSave) this.game.autosave();
  }
  notify(type, key, n = 1) {
    for (const id of Object.keys(this.st)) {
      const q = this.st[id];
      if (q.status !== 'active') continue;
      const s = this.defs[id].steps[q.step];
      if (!s || s.type !== type) continue;
      if (s.key && s.key !== key && !(Array.isArray(s.key) && s.key.includes(key))) continue;
      q.count += n;
      if (q.count >= (s.count || 1)) this.advance(id);
      else this.game.ui.refreshTracker();
    }
  }
  advance(id) {
    const q = this.st[id], def = this.defs[id];
    q.step++; q.count = 0;
    if (q.step >= def.steps.length) return this.complete(id);
    this.game.audio.play('pickup', { vol: 0.7 });
    this.enter(id);
  }
  complete(id) {
    const q = this.st[id], def = this.defs[id];
    q.status = 'done';
    this.game.ui.questBanner('Quest Complete', def.title);
    this.game.audio.play('questDone');
    this.game.state.xp += def.xp || 0;
    this.game.story.onQuestDone(id);
    this.game.ui.refreshTracker();
    if (def.next) this.start(def.next); else this.game.autosave();
  }
  /** Active quests for the HUD: main quest first. */
  tracked() {
    return Object.keys(this.st).filter((id) => this.st[id].status === 'active')
      .map((id) => ({ id, def: this.defs[id], q: this.st[id], step: this.defs[id].steps[this.st[id].step] }))
      .sort((a, b) => (a.def.kind === 'main' ? 0 : 1) - (b.def.kind === 'main' ? 0 : 1));
  }
}

// ---------------------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------------------
export class Inventory {
  constructor(game, items) { this.game = game; this.items = items; }
  get data() { return this.game.state.inventory; }
  count(id) { return this.data[id] || 0; }
  has(id, n = 1) { return this.count(id) >= n; }
  add(id, n = 1, quiet = false) {
    this.data[id] = this.count(id) + n;
    if (!quiet) { this.game.ui.toast(`+${n} ${this.items[id]?.name ?? id}`); this.game.audio.play('pickup'); }
    this.game.events.emit('item', id, this.data[id]);
  }
  remove(id, n = 1, quiet = false) {
    const have = this.count(id);
    if (have <= 0) return false;
    this.data[id] = Math.max(0, have - n);
    if (!this.data[id]) delete this.data[id];
    if (!quiet) this.game.ui.toast(`−${Math.min(n, have)} ${this.items[id]?.name ?? id}`);
    this.game.events.emit('item', id, this.data[id] || 0);
    return true;
  }
}

// ---------------------------------------------------------------------------------------
// Dialogue — a list of nodes: { id?, s: speaker, t: text, choices?: [{ t, to?, fx? }], to?, fx?, if? }
// ---------------------------------------------------------------------------------------
export class Dialogue {
  constructor(game, trees) { this.game = game; this.trees = trees; this.active = false; }
  cond(c) {
    if (!c) return true;
    const st = this.game.state;
    if (typeof c === 'string') return c[0] === '!' ? !st.flags[c.slice(1)] : !!st.flags[c];
    if (c.item) return this.game.inventory.has(c.item, c.n || 1);
    if (c.noItem) return !this.game.inventory.has(c.noItem, c.n || 1);
    return true;
  }
  start(id, { npc = null, onEnd = null } = {}) {
    const tree = this.trees[id];
    if (!tree) { if (onEnd) onEnd(); return; }
    const g = this.game;
    this.nodes = tree; this.i = -1; this.npc = npc; this.onEnd = onEnd; this.active = true; this.sel = 0;
    g.setMode('dialogue');
    g.player.equipHidden = true;
    if (npc) {
      npc.prevMode = npc.mode === 'idle' ? null : { mode: npc.mode, path: npc.path, opts: npc.opts, followT: npc.followT };
      npc.mode = 'idle'; npc.faceEntity(g.player); g.player.faceTarget = npc.pos;
      g.cine.dialogueShot(g.player, npc);
    }
    this.goto(0);
  }
  goto(i) {
    while (i < this.nodes.length && !this.cond(this.nodes[i].if)) i++;
    if (i >= this.nodes.length) return this.finish();
    this.i = i; this.shown = 0; this.sel = 0;
    const n = this.nodes[i];
    this.text = n.t || '';
    this.choices = n.choices || null;
    if (this.npc) this.npc.h.setLoop && (this.npc.talking = n.s === this.npc.name);
    this.game.ui.showDialogue(n.s, '', this.text.length ? null : this.choices, this.sel);
    this.game.audio.play('page', { vol: 0.5 });
  }
  jump(label) {
    if (label === 'end') return this.finish();
    const i = this.nodes.findIndex((n) => n.id === label);
    this.goto(i < 0 ? this.nodes.length : i);
  }
  advance(choice = null) {
    const n = this.nodes[this.i];
    if (this.shown < this.text.length) { this.shown = this.text.length; this.game.ui.showDialogue(n.s, this.text, this.choices, this.sel); return; }
    if (this.choices) {
      if (choice === null) choice = this.sel;
      const c = this.choices[choice];
      if (!c) return;
      this.game.applyFx(c.fx);
      this.game.state.choices.push({ node: n.id || this.i, pick: c.t });
      this.game.audio.play('ui');
      if (c.to) return this.jump(c.to);
      return this.goto(this.i + 1);
    }
    this.game.applyFx(n.fx);
    if (n.to) return this.jump(n.to);
    this.goto(this.i + 1);
  }
  finish() {
    const g = this.game, npc = this.npc, f = this.onEnd;
    this.active = false; this.onEnd = null; this.npc = null;
    g.ui.hideDialogue();
    g.player.faceTarget = null; g.player.equipHidden = false;
    g.cine.release();
    if (npc) { npc.talking = false; npc.faceT = null; if (npc.prevMode && npc.mode === 'idle') Object.assign(npc, npc.prevMode); npc.prevMode = null; }
    g.setMode('play');
    if (f) f();
  }
  update(dt) {
    if (!this.active) return;
    const g = this.game, inp = g.input, n = this.nodes[this.i];
    if (this.shown < this.text.length) {
      this.shown = Math.min(this.text.length, this.shown + dt * 52);
      g.ui.showDialogue(n.s, this.text.slice(0, this.shown | 0), this.shown >= this.text.length ? this.choices : null, this.sel);
    }
    if (this.choices && this.shown >= this.text.length) {
      const len = this.choices.length;
      if (inp.hit('back') || inp.hit('camDown')) { this.sel = (this.sel + 1) % len; g.ui.showDialogue(n.s, this.text, this.choices, this.sel); g.audio.play('ui', { vol: 0.5 }); }
      if (inp.hit('forward') || inp.hit('camUp')) { this.sel = (this.sel + len - 1) % len; g.ui.showDialogue(n.s, this.text, this.choices, this.sel); g.audio.play('ui', { vol: 0.5 }); }
      for (let k = 0; k < len; k++) if (inp.pressed.has('Digit' + (k + 1))) return this.advance(k);
    }
    if (inp.hit('interact') || inp.hit('dodge') || inp.pressed.has('Enter')) this.advance();
  }
}

// ---------------------------------------------------------------------------------------
// Cinematic camera: scripted shots for cutscenes, plus "held" shots for dialogue / activities.
// A point may be [x, y, z] or a function returning one (to track moving things).
// ---------------------------------------------------------------------------------------
const pt = (p, k) => (typeof p === 'function' ? p(k) : p);
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

export class Cine {
  constructor(game) { this.game = game; this.active = false; this.shots = null; this.heldShot = null; this.skipT = 0; }
  play(shots, { onEnd = null, skippable = true } = {}) {
    const g = this.game;
    this.shots = shots; this.i = -1; this.onEnd = onEnd; this.skippable = skippable; this.active = true; this.heldShot = null; this.skipT = 0;
    g.setMode('cutscene'); g.ui.letterbox(true);
    this.next();
  }
  next() {
    this.i++;
    if (this.i >= this.shots.length) return this.end();
    this.shot = this.shots[this.i]; this.t = 0;
    if (this.shot.onStart) this.shot.onStart();
    if (this.shot.sub) this.game.ui.subtitle(this.shot.sub[0], this.shot.sub[1], this.shot.sub[2] ?? this.shot.dur - 0.3);
  }
  end() {
    const g = this.game, f = this.onEnd;
    this.active = false; this.shots = null; this.shot = null; this.onEnd = null;
    g.ui.letterbox(false); g.ui.skipHint(0);
    g.camera.fov = g.baseFov; g.camera.updateProjectionMatrix();
    g.setMode('play');
    if (f) f();
  }
  /** Smoothly hold the camera on a fixed composition (does not change game mode). */
  hold(pos, look, { fov = 50, blend = 0.7 } = {}) {
    const c = this.game.camera;
    this.active = true; this.shots = null;
    this.heldShot = { pos, look, fov, blend, t: 0, p0: c.position.clone(), l0: c.getWorldDirection(new THREE.Vector3()).multiplyScalar(6).add(c.position), f0: c.fov };
  }
  release() { if (this.heldShot) { this.heldShot = null; this.active = false; } }
  dialogueShot(player, npc) {
    const g = this.game, px = player.pos.x, pz = player.pos.z, nx = npc.pos.x, nz = npc.pos.z;
    let dx = px - nx, dz = pz - nz; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const ph = player.h.headHeight(), nh = npc.h.headHeight();
    let best = null;
    for (const side of [1, -1]) {
      const cx = px + dx * 1.5 + -dz * side * 1.15, cz = pz + dz * 1.5 + dx * side * 1.15;
      const cy = Math.max(g.world.groundAt(cx, cz) + 0.5, player.pos.y + ph + 0.35);
      if (!g.world.pointInBox(cx, cz, 0.3)) { best = [cx, cy, cz]; break; }
      if (!best) best = [cx, cy, cz];
    }
    this.hold(best, () => [nx + dx * 0.4, npc.pos.y + nh * 0.92 - (nh - ph) * 0.25, nz + dz * 0.4], { fov: 44, blend: 0.9 });
  }
  update(dt) {
    if (!this.active) return;
    const g = this.game, c = g.camera;
    if (this.heldShot) {
      const h = this.heldShot; h.t += dt;
      const k = clamp(h.t / h.blend, 0, 1), e = k * k * (3 - 2 * k);
      _a.fromArray(pt(h.pos, 1)); _b.fromArray(pt(h.look, 1));
      c.position.lerpVectors(h.p0, _a, e);
      _b.lerpVectors(h.l0, _b, e); c.lookAt(_b);
      c.fov = lerp(h.f0, h.fov, e); c.updateProjectionMatrix();
      return;
    }
    const s = this.shot; if (!s) return;
    this.t += dt;
    const k = clamp(this.t / s.dur, 0, 1), e = s.linear ? k : k * k * (3 - 2 * k);
    _a.fromArray(pt(s.from, k));
    if (s.to) { _b.fromArray(pt(s.to, k)); _a.lerp(_b, e); }
    c.position.copy(_a);
    _a.fromArray(pt(s.look, k));
    if (s.lookTo) { _b.fromArray(pt(s.lookTo, k)); _a.lerp(_b, e); }
    c.lookAt(_a);
    const fov = s.fov ?? 45;
    if (c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); }
    if (s.onUpdate) s.onUpdate(k, dt);
    if (this.skippable) {
      if (g.input.held('dodge') || g.input.held('interact')) this.skipT += dt; else this.skipT = Math.max(0, this.skipT - dt * 2);
      g.ui.skipHint(this.skipT / 1.0);
      if (this.skipT >= 1.0) { this.skipT = 0; return this.end(); }
    }
    if (this.t >= s.dur) this.next();
  }
}
