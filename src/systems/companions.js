// Companions who fight beside Eirik. In the open world he can take two of the six with him (data/companions.js);
// in the story's battles, whichever of them the scene puts on the line fight with their own kit, and he can call on
// their skills there too. Each has a way of fighting (how fast, how hard, how well they guard) and one skill.
// Keys: call the first / second companion's skill, and an order (with me / wait here) for the open world.
import * as THREE from 'three';
import { COMPANIONS, PARTY_MAX, available, HOME, ASK, GREET } from '../data/companions.js';

const _o = new THREE.Vector3(), _d = new THREE.Vector3();
const flat = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);

export class Companions {
  constructor(game) {
    this.g = game; this.cd = {}; this.waiting = false; this.cutArmed = 0; this.holdT = 0; this.held = []; this.mend = null; this.dashes = [];
    this.shotT = {}; this.hudKey = '';
    game.events.on('allyDown', (n, by) => this.down(n, by));
    game.events.on('postureBroken', (e) => this.broken(e));
  }
  get st() { return this.g.state; }
  get open() { return this.st.stage === 'open' && this.g.story.open && this.g.story.open.built; }
  get party() { return this.st.party || (this.st.party = []); }
  kit(n) { return n ? COMPANIONS[n.id] : null; }
  /** Who stands with Eirik now: his party in the open world; in a story battle, the companions the scene has on the line. */
  present() {
    const g = this.g;
    if (this.open) return this.party.map((id) => g.npcs.get(id)).filter((n) => n && n.visible);
    const b = g.story.a2 && g.story.a2.battle, sk = b && b.sk;
    if (!sk || g.state.stage !== 'act2') return [];
    const out = sk.allies.filter((n) => this.kit(n) && n.visible && !n.dead);
    const a = g.npcs.get('astrid'); // Astrid on the field, bow in hand, is with him whether or not she holds a place in the line
    if (a && a.visible && !a.dead && !out.includes(a) && flat(a, g.player) < 45) out.push(a);
    return out.slice(0, PARTY_MAX);
  }
  /** The story's fights pass this with a companion's blows: their own kit, scaled to the battle. */
  opts(n, scale = 1, extra = {}) { return { lethal: 0, kit: this.kit(n), scale, ...extra }; }
  /** Enemies that may be taken on: not a champion (he is Eirik's), not a man in a hide-duel (the law says one against one). */
  fair(e) { return e && e.cb && !e.dead && !e.cb.out && !e.cb.holm; }
  foes() { return this.g.combat.alive().filter((e) => this.fair(e)); }

  // ---- one blow ------------------------------------------------------------------------------------------
  /** A companion's blow lands on an enemy (called from NPC.fight with their kit). */
  blow(n, e) {
    const g = this.g, k = this.kit(n), c = e.cb;
    if (!k || !this.fair(e)) return;
    const s = (n.opts && n.opts.scale) || 1;
    let dmg = k.dmg * s;
    if (n.id === 'svanhild' && c.state === 'stagger') dmg *= 2.2; // she does not waste an opening
    const flinch = Math.random() < (k.posture >= 20 ? 0.55 : 0.18); // a heavy blow rocks him; quick cuts mostly do not stop his own stroke
    g.combat.hurt(e, dmg, k.posture, { flinch });
    if (k.double) g.after(0.15, () => { if (this.fair(e)) g.combat.hurt(e, dmg * 0.8, k.posture, { flinch: false }); });
    if (flat(n, g.player) < 34) g.audio.play(n.id === 'brokk' || n.id === 'torvald' ? 'thud' : 'steel', { vol: 0.32 });
  }

  // ---- the open world: who comes along ----------------------------------------------------------------------
  /** The open world is built: put the companions the story has given him where he can find them. */
  buildOpen(open) {
    const g = this.g;
    this.openRef = open; this.origin = {};
    for (const id of Object.keys(COMPANIONS)) {
      const k = COMPANIONS[id];
      if (!available(id, this.st)) { this.party.splice(0, this.party.length, ...this.party.filter((x) => x !== id)); continue; }
      let n = g.npcs.get(id);
      // not one of the open world's own people (an act's NPC of the same name, hidden): a new one
      if (!n || n.dead || !n.home) { const [x, z, yaw] = HOME[id]; n = open.person(id, k.name, k.look, x, z, yaw, { law: false, role: 'companion' }); }
      n.role = 'companion'; n.dead = false;
      this.origin[id] = [n.pos.x, n.pos.z, n.yaw, n.baseLoop || null];
      n.ctalk = () => this.talk(n); n.talk = n.ctalk; n.talkLabel = `Talk to ${k.name}`;
      n.h.hold('R', k.hold[0]); n.h.hold('L', k.hold[1]);
    }
    for (const id of [...this.party]) { const n = g.npcs.get(id); if (n) this.join(n, true); else this.party.splice(this.party.indexOf(id), 1); }
    g.events.on('mounted', (type) => { if (type !== 'horse') for (const n of this.present()) { n.aboard = true; n.visible = false; n.stop(); } });
    g.events.on('dismounted', () => this.landAll());
  }
  landAll() {
    const p = this.g.player;
    this.party.forEach((id, i) => { const n = this.g.npcs.get(id); if (!n || !n.aboard) return; n.aboard = false; n.visible = true; n.teleport(p.pos.x - Math.sin(p.yaw + 0.8 * (i ? -1 : 1)) * 2.2, p.pos.z - Math.cos(p.yaw + 0.8 * (i ? -1 : 1)) * 2.2, p.yaw); this.heel(n); });
  }
  talk(n) {
    const g = this.g, k = this.kit(n), id = n.id, mine = this.party.includes(id), full = this.party.length >= PARTY_MAX, S = k.name;
    const ask = mine ? { t: '"Go home. I will find you there."', to: 'leave', fx: { do: () => { this.pend = () => this.leave(n); } } }
      : full ? { t: `"Come with me." (two already walk with you: ${this.party.map((x) => COMPANIONS[x].name).join(' and ')})`, to: 'full' }
        : { t: '"Come with me."', to: 'join', fx: { do: () => { this.pend = () => this.join(n); } } };
    this.openRef.say([
      { s: S, t: GREET[id] },
      { s: 'Eirik', t: '', choices: [ask, { t: '"What do you bring to a fight?"', to: 'kit' }, { t: '"Nothing. Go on."', to: 'end' }] },
      { id: 'join', s: S, t: ASK[id][0], to: 'end' },
      { id: 'leave', s: S, t: ASK[id][1], to: 'end' },
      { id: 'full', s: S, t: 'Two at your back is a war band. Send one of them home first.', to: 'end' },
      { id: 'kit', s: S, t: `${k.style} ${k.skill.name}: ${k.skill.desc}`, to: 'end' },
    ], n, () => { const f = this.pend; this.pend = null; if (f) f(); });
  }
  join(n, quiet = false) {
    const g = this.g, k = this.kit(n), p = g.player;
    if (!this.party.includes(n.id)) this.party.push(n.id);
    n.role = 'companion'; n.hpMax = k.hp; n.hp = k.hp; n.guard = k.guard; n.wounded = false; n.aboard = false; n.visible = true;
    n.setLoop(null); n.h.hold('R', k.hold[0]); n.h.hold('L', k.hold[1]); n.keepDry = false;
    if (quiet) { const i = this.party.indexOf(n.id); n.teleport(p.pos.x + (i ? -1.8 : 1.8), p.pos.z - 1.6, p.yaw); }
    else { g.ui.toast(`${k.name} walks with you. ${g.input.label(this.party.indexOf(n.id) ? 'call2' : 'call1')}: ${k.skill.name}`); g.audio.play('chime'); }
    this.heel(n);
  }
  leave(n) {
    const o = this.origin[n.id], k = this.kit(n);
    this.party.splice(this.party.indexOf(n.id), 1);
    n.hpMax = 0; n.wounded = false; n.stop(); n.setLoop(null);
    const back = () => { n.yaw = o[2]; n.setLoop(o[3]); };
    if (o && n.dist({ x: o[0], z: o[1] }) < 160) n.goTo(o[0], o[1], { onArrive: back }); else if (o) { n.teleport(o[0], o[1], o[2]); back(); }
    this.g.ui.toast(`${k.name} goes home.`);
  }
  /** At his heels, each in their own place: the archer and the healer a little further back. */
  heel(n) {
    const k = this.kit(n), i = this.party.indexOf(n.id);
    n.follow(this.g.player, { dist: (k.ranged ? 5.5 : k.healer ? 4 : 2.6) + i * 0.9 });
  }

  // ---- falling, and getting up -------------------------------------------------------------------------------
  down(n, by) {
    const g = this.g, k = this.kit(n);
    if (!k || !this.party.includes(n.id) || n.wounded) return;
    n.wounded = true; n.recT = 0; n.mode = 'idle'; n.partner = null; n.setLoop('kneel');
    if (by && by.cb && by.cb.duel === n) by.cb.duel = null; // the man who put them down turns on someone else
    for (const e of g.combat.alive()) if (e.cb.duel === n) e.cb.duel = null;
    g.ui.toast(`${k.name} is down.`); g.audio.play('hurt', { vol: 0.7 });
    n.talkLabel = `Help ${k.name} up`; n.talk = () => this.up(n, true);
  }
  up(n, byHand) {
    const g = this.g, k = this.kit(n);
    if (!n.wounded) return;
    n.wounded = false; n.hp = Math.round(n.hpMax * (byHand ? 0.5 : 0.4)); n.setLoop(null); n.talk = n.ctalk; n.talkLabel = `Talk to ${k.name}`;
    if (byHand) { g.player.h.play('pickup', 0.6); g.audio.play('chime'); }
    g.ui.toast(`${k.name} is on ${k.name === 'Leif' || k.name === 'Torvald' || k.name === 'Brokk' ? 'his' : 'her'} feet again.`);
    this.heel(n);
  }

  // ---- skills ---------------------------------------------------------------------------------------------------
  /** The man nearest Eirik who is coming for him, or the man he has locked onto. */
  threat(maxFrom = 40, from = this.g.player) {
    const p = this.g.player, t = p.lock || p.target;
    if (this.fair(t) && flat(t, from) < maxFrom) return t;
    return this.foes().filter((e) => flat(e, from) < maxFrom).sort((a, b) => (a.cb.duel ? 6 : 0) + flat(a, p) - (b.cb.duel ? 6 : 0) - flat(b, p))[0] || null;
  }
  call(i) {
    const g = this.g, n = this.present()[i];
    if (!n) return;
    const k = this.kit(n), id = n.id;
    if (n.wounded) return g.ui.toast(`${k.name} is down.`);
    if ((this.cd[id] || 0) > 0) return g.ui.toast(`${k.skill.name}: ${Math.ceil(this.cd[id])} s`);
    let ok = false;
    if (id === 'leif' || id === 'brokk') {
      const e = [n.mode === 'fight' ? n.partner : null, this.threat(9, n)].find((x) => this.fair(x) && flat(x, n) < 9); // a few quick steps, no further
      if (e) { ok = true; this.dash(n, e, id === 'leif' ? 'atk2' : 'chop', () => (id === 'leif' ? this.trick(n, e) : this.sunder(n, e))); }
    } else if (id === 'svanhild') {
      const e = this.foes().filter((x) => x.cb.state === 'stagger' && flat(x, n) < 14).sort((a, b) => flat(a, n) - flat(b, n))[0];
      if (e) { ok = true; this.dash(n, e, 'thrust', () => this.cut(n, e), false); } else { ok = true; this.cutArmed = 8; g.ui.toast('Svanhild waits for a guard to break.'); }
    } else if (id === 'astrid') {
      const e = this.threat(45, n);
      if (e) { ok = true; n.stop(); n.faceEntity(e); n.h.play('shoot', 0.55, { hitAt: 0.4, onHit: () => { this.loose(n, e, { dmg: 34, posture: 70, speed: 72 }); if (this.fair(e)) e.h.play('stagger', 0.6); } }); }
    } else if (id === 'torvald') {
      const p = g.player, near = this.foes().filter((e) => !e.cb.boss && flat(e, p) < 9 && (!e.cb.duel || e.cb.duel.dead)).slice(0, 3);
      if (near.length) { ok = true; this.held = near; this.holdT = 8; for (const e of near) { e.cb.duel = n; e.cb.state = 'duel'; e.cb.taunt = true; } n.guard = 0.92; n.h.play('blockhit', 0.5); }
    } else if (id === 'ingrid') {
      const p = g.player;
      if (p.health < 100) { ok = true; this.mend = { n, t: 0 }; n.follow(p, { dist: 0.9 }); }
    }
    if (!ok) return g.ui.toast(id === 'ingrid' ? 'Eirik is not hurt.' : id === 'torvald' ? 'No one is pressing Eirik.' : `${k.name} is too far from any of them.`);
    this.cd[id] = k.skill.cd; if (k.bark) n.say(k.bark, 2);
    g.audio.play('shout', { vol: 0.5 });
  }
  /** Close the last few steps fast, then strike. */
  dash(n, e, anim, hit, stay = true) {
    const prev = { mode: n.mode, partner: n.partner, opts: n.opts, followT: n.followT };
    n.mode = 'dash';
    const d = flat(n, e), k = d > 1.4 ? (d - 1.2) / d : 0;
    this.dashes.push({ n, e, anim, hit, prev, stay, t: 0, dur: 0.12 + d * 0.035, x0: n.pos.x, z0: n.pos.z, x1: n.pos.x + (e.pos.x - n.pos.x) * k, z1: n.pos.z + (e.pos.z - n.pos.z) * k });
  }
  trick(n, e) { // a boot to the knee, an elbow to the jaw: his guard is gone and he is down for a breath
    const c = e.cb, g = this.g;
    c.posture = c.boss ? Math.min(100, c.posture + 55) : 100; g.combat.hurt(e, 4, 0); g.combat.checkPosture(e);
    if (!e.dead) e.h.play('stagger', 1.0); g.audio.play('thud', { vol: 0.6 });
  }
  sunder(n, e) { // forty years at the anvil in one blow
    const c = e.cb, g = this.g;
    if (c.kind === 'shield') { c.kind = null; e.h.hold('L', null); g.ui.toast('The shield splits.'); }
    c.posture = c.boss ? Math.min(100, c.posture + 60) : 100; g.combat.hurt(e, 18, 0); g.combat.checkPosture(e);
    g.audio.play('chop'); g.hitStop = Math.max(g.hitStop || 0, 0.05);
  }
  cut(n, e) { // once is enough
    const c = e.cb, g = this.g;
    g.combat.hurt(e, c.boss ? c.maxHp * 0.18 : c.hp + 1, 0); g.audio.play('steel'); g.slowT = Math.max(g.slowT || 0, 0.25);
  }
  broken(e) { // a guard breaks: Svanhild, if she was waiting for it, is there first
    if (this.cutArmed <= 0) return;
    const n = this.present().find((x) => x.id === 'svanhild');
    if (!n || n.wounded || !this.fair(e) || flat(n, e) > 14) return;
    this.cutArmed = 0; this.dash(n, e, 'thrust', () => this.cut(n, e), false);
  }
  /** An arrow from a companion's bow, aimed to drop onto a man's chest where he will be. */
  loose(n, e, o) {
    const g = this.g, sp = o.speed || 55;
    _o.set(n.pos.x, n.pos.y + 1.45 * n.h.scale, n.pos.z);
    const lead = Math.hypot(e.pos.x - _o.x, e.pos.z - _o.z) / sp, tx = e.pos.x + (e._vx || 0) * lead, tz = e.pos.z + (e._vz || 0) * lead;
    const dx = tx - _o.x, dz = tz - _o.z, dh = Math.hypot(dx, dz), t = dh / sp;
    _d.set(dx, e.pos.y + 1.15 * e.h.scale - _o.y + 0.5 * 6.5 * t * t, dz).normalize();
    g.wildlife.shoot(_o, _d, sp, n, { dmg: o.dmg, posture: o.posture });
    g.audio.play('bow', { vol: 0.4 });
  }

  // ---- every frame -----------------------------------------------------------------------------------------------
  update(dt) {
    const g = this.g, p = g.player, play = g.mode === 'play', open = this.open;
    for (const e of g.combat.enemies) { if (e._px != null && dt > 0) { e._vx = (e.pos.x - e._px) / dt; e._vz = (e.pos.z - e._pz) / dt; } e._px = e.pos.x; e._pz = e.pos.z; }
    if (play) {
      for (const id in this.cd) this.cd[id] = Math.max(0, this.cd[id] - dt);
      if (g.input.hit('call1')) this.call(0);
      if (g.input.hit('call2')) this.call(1);
      if (open && g.input.hit('order')) this.order();
    }
    this.cutArmed = Math.max(0, this.cutArmed - dt);
    // dashes in flight
    for (let i = this.dashes.length - 1; i >= 0; i--) {
      const s = this.dashes[i], n = s.n; s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      n.pos.x = s.x0 + (s.x1 - s.x0) * k; n.pos.z = s.z0 + (s.z1 - s.z0) * k; n.pos.y = g.world.groundAt(n.pos.x, n.pos.z);
      n.yaw = Math.atan2(s.e.pos.x - n.pos.x, s.e.pos.z - n.pos.z); n.root.rotation.y = n.yaw;
      if (k >= 1) {
        this.dashes.splice(i, 1);
        n.h.play(s.anim, 0.5, { hitAt: 0.35, onHit: () => { if (this.fair(s.e)) s.hit(); } });
        Object.assign(n, { mode: s.prev.mode === 'dash' ? 'idle' : s.prev.mode, partner: s.prev.partner, opts: s.prev.opts, followT: s.prev.followT });
        if (open && s.stay && this.fair(s.e) && !(n.mode === 'fight' && n.partner === s.e)) this.engage(n, s.e);
      }
    }
    // Hold the Line: the men he called onto his shield go back to Eirik when it ends
    if (this.holdT > 0 && (this.holdT -= dt) <= 0) {
      const t = this.held[0] && this.held[0].cb && this.held[0].cb.duel;
      for (const e of this.held) { if (!e.cb) continue; e.cb.taunt = false; if (e.cb.duel && (e.cb.duel.partner !== e || e.cb.duel.mode !== 'fight')) e.cb.duel = null; }
      this.held = []; if (t && this.kit(t)) t.guard = this.kit(t).guard;
    }
    // Ingrid with her kit
    if (this.mend) {
      const m = this.mend, n = m.n; m.t += dt;
      if (m.t > 7 || n.wounded) { this.mend = null; if (open) this.heel(n); }
      else if (flat(n, p) < 1.8 && !m.done) {
        m.done = true; n.stop(); n.faceEntity(p); n.h.play('pickup', 1.1);
        g.after(1.0, () => { p.health = Math.min(100, p.health + 40); if (p.fx) p.fx.bleed = 0; g.ui.toast('Ingrid binds the wound.'); g.audio.play('chime'); this.mend = null; if (this.open) this.heel(n); });
      }
    }
    if (open) this.updateParty(dt); else this.updateStory(dt);
  }
  order() {
    const g = this.g, list = this.present();
    if (!list.length) return;
    this.waiting = !this.waiting;
    for (const n of list) { if (n.wounded) continue; if (this.waiting) { n.stop(); n.post = [n.pos.x, n.pos.z]; } else { n.post = null; this.heel(n); } }
    g.ui.toast(this.waiting ? 'Wait here.' : 'With me.'); g.audio.play('shout', { vol: 0.4 });
  }
  updateParty(dt) {
    const g = this.g, p = g.player, fighting = g.combat.active && this.foes().length > 0;
    this.party.forEach((id, i) => {
      const n = g.npcs.get(id), k = COMPANIONS[id];
      if (!n || n.aboard || n.mode === 'dash') return;
      if (n.wounded) { if (!fighting && (n.recT += dt) > 4) this.up(n, false); return; }
      if (!fighting) n.hp = Math.min(n.hpMax, n.hp + 4 * dt);
      n.talk = fighting ? null : n.ctalk; // in a fight the prompt is for the fight, not for a word with them
      // fallen behind (he rode off, or climbed): catch up out of sight
      if (!this.waiting && flat(n, p) > 55 && !fighting) { n.teleport(p.pos.x - Math.sin(p.yaw) * (4 + i * 1.5), p.pos.z - Math.cos(p.yaw) * (4 + i * 1.5), p.yaw); this.heel(n); }
      if (this.mend && this.mend.n === n) return;
      if (k.healer) { this.updateHealer(n, dt); return; }
      if (k.ranged) { this.updateArcher(n, dt, true); return; }
      const busy = n.mode === 'fight' && this.fair(n.partner);
      if (n.mode === 'fight' && !busy) { if (n.post) n.goTo(...n.post); else this.heel(n); }
      if (busy || !fighting) { if (!busy && n.mode === 'idle' && !n.post && !this.waiting) this.heel(n); return; }
      // the man coming for Eirik first. A champion is his own fight: they keep the others off him, and he can call their skills on the champion
      const from = n.post ? { pos: { x: n.post[0], z: n.post[1] } } : p, reach = n.post ? 9 : 26;
      const free = this.foes().filter((e) => (!e.cb.duel || e.cb.duel.dead || e.cb.duel.wounded || e.cb.duel.partner !== e || e.cb.duel.mode !== 'fight') && flat(e, from) < reach && !e.cb.boss)
        .sort((a, b) => flat(a, p) + flat(a, n) * 0.5 - flat(b, p) - flat(b, n) * 0.5)[0];
      if (free) this.engage(n, free);
    });
  }
  /** Take a man on, and let go of any other who was left marked as theirs. */
  engage(n, e) {
    for (const x of this.g.combat.enemies) if (x !== e && x.cb && x.cb.duel === n && !x.cb.taunt) x.cb.duel = null;
    e.cb.duel = n; n.fight(e, this.opts(n, 1, { onWin: () => { if (n.post) n.goTo(...n.post); else this.heel(n); } }));
  }
  /** Astrid keeps back and shoots whoever is coming for Eirik. */
  updateArcher(n, dt, follow) {
    const g = this.g, k = this.kit(n), id = n.id;
    if ((this.shotT[id] = (this.shotT[id] || 0) - dt) > 0 || n.h.busy || g.mode !== 'play') return;
    const e = this.foes().filter((x) => !x.cb.boss && (!x.cb.duel || x.cb.duel.dead) && flat(x, n) < 36 && flat(x, n) > 2.5).sort((a, b) => flat(a, g.player) - flat(b, g.player))[0];
    if (!e) return;
    this.shotT[id] = k.rate[0] + Math.random() * k.rate[1];
    const was = n.mode; if (follow) n.stop(); n.faceEntity(e);
    n.h.play('shoot', 0.55, { hitAt: 0.4, onHit: () => { if (this.fair(e)) this.loose(n, e, { dmg: k.dmg, posture: k.posture, speed: 58 }); } });
    if (follow) g.after(0.7, () => { if (this.party.includes(id) && !n.wounded && n.mode === 'idle' && !this.waiting) this.heel(n); });
    else n.mode = was;
  }
  /** Ingrid: no blade. She gets the fallen back on their feet when no one is on top of them. */
  updateHealer(n, dt) {
    const g = this.g;
    const hurt = this.party.map((id) => g.npcs.get(id)).find((m) => m && m.wounded && !this.foes().some((e) => flat(e, m) < 5));
    if (hurt) {
      if (flat(n, hurt) > 1.6) { if (n.mode !== 'goto') n.goTo(hurt.pos.x, hurt.pos.z, { run: true }); }
      else if (!n.tending) { n.tending = true; n.stop(); n.setLoop('kneel'); g.after(2.4, () => { n.tending = false; n.setLoop(null); if (hurt.wounded) this.up(hurt, true); this.heel(n); }); }
    } else if (n.mode === 'idle' && !n.tending && !this.waiting) this.heel(n);
  }
  /** In the story's battles: Astrid on the field shoots for him; the line is the scene's own. */
  updateStory(dt) {
    const a = this.g.npcs.get('astrid');
    if (a && a.visible && !a.dead && a.mode === 'idle' && this.present().includes(a)) this.updateArcher(a, dt, false);
  }

  // ---- the strip above the health bar ---------------------------------------------------------------------------
  hud() {
    const g = this.g, list = g.mode === 'play' || g.mode === 'activity' ? this.present() : [];
    return list.map((n, i) => {
      const k = this.kit(n), cd = this.cd[n.id] || 0, hp = n.hpMax ? n.hp / n.hpMax : 1;
      return { name: k.name, skill: k.skill.name, key: g.input.label(i ? 'call2' : 'call1'), ready: cd <= 0 && !n.wounded, cd: cd > 0 ? Math.ceil(cd) : 0, hp: Math.max(0, Math.round(hp * 20) / 20), down: !!n.wounded, armed: n.id === 'svanhild' && this.cutArmed > 0 };
    });
  }
}
