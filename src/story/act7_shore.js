// Act VII on Svartøy, from the surf to the hall gate: "The Black Shore" (the landing, two pushes up from the sand,
// and twice going back for men who are cut off), "The Red-Hand Returns" (Kettil at the bend), "The Pens" (played as
// Torvald, with Star-Fall), "Vigdis, the Left Hand" (the burning bridge) and "Gorm, the Right Hand" (the gate).
// The two pushes up from the sand are shield walls (systems/shieldwall.js): about a hundred and fifty a side as rank
// and file, with the kings and jarls in the front rank. The rescues and the later fights are small. See act7_sea.js.
import { CAST3 } from '../data/act3.js';
import { QUESTS } from '../data/act1.js';
import { A7, TOLD, SAID, KARI_LINES, GORM_LINES } from '../data/act7.js';
import { EIRIK_ADULT } from '../entities/player.js';
import { FOES } from './champions.js';
import { Knack } from '../systems/activities2.js';
import { TEN } from './act4_home.js';
import { A7Part, SHORE7, HALL7 } from './act7_sea.js';
import { WALL } from '../data/shieldwall.js';

const LINE7 = ['svanhild', 'hroald', 'jorund', 'ragnvald', ...TEN];   // the kings and jarls each hold part of the line
const BLADE = { svanhild: 'sword', hroald: 'sword', jorund: 'sword', ragnvald: 'axe' };
const CUT = [[-44, -196], [34, -196]];                                // where the two groups are cut off
const WL = [{ x: [-15.75, 29.75], z: -216, from: [[-2, -191], [18, -190], [-22, -191]] }, { x: [-23, 19], z: -189, from: [[-14, -171], [-10, -168]] }]; // where the line stands at the start of each push, and where their reserves come down from
const lineX = (st, k) => WL[st].x[0] + ((WL[st].x[1] - WL[st].x[0]) * k) / (LINE7.length - 1);

export class A7Shore extends A7Part {
  constructor(game, core) { super(game, core); this.fires = []; this.flung = []; this.vT = 0; }
  get RS() { return this.g.world.realm.svartoy; }
  X(dx, dz) { return this.V7.X(dx, dz); }
  build() {
    const g = this.g, q = g.quests, F = (id) => FOES.find((f) => f.id === id);
    this.vigdis = g.addNPC('a7vigdis', { name: 'Vigdis Quickblood', look: F('vigdis').look }); this.gorm = g.addNPC('a7gorm', { name: 'Gorm Stone-Lung', look: F('gorm').look });
    this.vigdis.visible = this.gorm.visible = false;
    g.world.addInteractable({ id: 'a7lock', pos: () => this.nextLock() || { x: 0, z: 0 }, x: 0, z: 0, r: 2.7, priority: 3, label: 'Break the lock', enabled: () => q.at('q_pens', 'locks') && !!this.nextLock() && !this.busy && !g.activity, use: () => this.lock() });
    g.events.on('warded', () => { const d = this.vd; if (d && !d.done && !d.said) { d.said = true; d.beat = Math.max(d.beat, g.combat.t + A7.vigdis.talk); g.after(1.4, () => this.said(SAID.vigdis)); } }); // the bridge's next beat waits for her words
  }
  clear(phase) {
    const g = this.g, c = this.c, V = this.V7, on = SHORE7.includes(phase), isle = on || (HALL7.includes(phase) && phase !== 'w7crown');
    V.shore.set(isle); V.locks.set(isle); V.gate.set(on); V.graves.set(phase === 'w7graves');
    this.vigdis.visible = this.gorm.visible = false; this.vigdis.cb = this.gorm.cb = null;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    this.busy = false; this.group = null; this.kd = null; this.kOn = false; this.endIt = null; this.vd = null; this.gd = null; this.flung = []; this.burning = 0; this.vT = 5; this.dismounted = false; this.gormOn = false; this.stepsSaid = false;
    if (this.tor && phase !== 'w7pens') this.asTorvald(false);
    if (!this.tor && this.st.flags.a7lent && phase !== 'w7pens') { g.inventory.remove('maul', 1, true); this.st.flags.a7lent = false; } // a load: the hammer was Torvald's
    if (!on) return;
    c.W.stages.searaven.set(false); c.act.glowTarget = phase === 'w7pens' ? 0.2 : 0.4;
    if (g.combat.active) g.combat.clear(); c.battle.sk = null;
    const r = c.column(); r.on = false; r.horse.visible = false; r.k.visible = false;
  }
  fire(x, z, y = 0.2, s = 1.4) { const f = this.g.fx.addFire(x, this.g.world.groundAt(x, z) + y, z, s); this.fires.push(f); return f; }
  /** Who is where on Svartøy. */
  dress(name) {
    const g = this.g, c = this.c, p = g.player, w = g.world, J = c.battle.jarn, T = c.sea.town, P = c.raid.pool, bs = this.at('q_blackshore');
    const at = (id, dx, dz, face, loop, hold) => this.put(id, ...this.X(dx, dz), face, loop, hold);
    const arm = (n, wp = 'spear') => { n.h.hold('R', wp); n.h.hold('L', 'shield'); return n; }, bow = (n) => { n.h.hold('L', 'bow'); return n; };
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    if (name !== 'w7pens') { // Ingrid's field hospital in the fisherman's boathouse by the landing
      const [hx, hz] = this.V7.shore.hospital;
      this.put('ingrid', hx - 0.2, hz + 0.9, [hx - 1, hz - 1], 'kneel');
      T.slice(0, 3).forEach((n, i) => { n.revive(); n.talk = null; n.name = i < 2 ? 'A wounded man' : "One of Queen Thora's healers";
        if (i < 2) this.fix(n, hx - 1 + i * 2.2, w.groundAt(hx - 1 + i * 2.2, hz - 1) + 0.24, hz - 1, 1.87, 'lie'); else this.put(n, hx + 1.6, hz + 2.2, [hx + 1.2, hz + 1.4], 'kneel'); });
    }
    if (name === 'w7shore') {
      // the line: where this push starts, or where the last one ended
      const wade = bs === 0, st = bs >= 3 ? 1 : 0, adv = bs === 2 ? A7.wall[0].goal : bs >= 4 ? A7.wall[1].goal : 0, lz = WL[st].z + adv, B = c.battle;
      if (!this.marching) LINE7.forEach((id, i) => { const dx = lineX(st, i); arm(at(id, wade ? dx * 0.8 : dx, wade ? -241 - (i % 3) * 1.2 : lz, 0, wade ? null : 'guard'), BLADE[id]); });
      if (bs <= 1) { if (!(B.wall && B.wall.o.stage === 0 && B.wall.phase === 'wait')) this.formLine(0, { wait: true, land: wade }); }   // theirs stands off above the sand until the push
      else if (bs !== 3 && !(B.wall && B.wall.o.stage === st && B.wall.over === 'broke')) this.formLine(st, { rest: true, adv });       // the line stands where it won to
      bow(at('astrid', -6, wade ? -246 : lz - 9, 0)); J.slice(6).forEach((n, i) => { n.name = "One of Astrid's archers"; bow(this.put(n, ...this.X(2 + i * 4, wade ? -247 : lz - 9.6), 0)); n.talk = null; });
      at('leif', 5, -234, this.X(0, -200), null, 'seax');
      for (const [dx, dz] of [[-30, -183], [26, -185], [-8, -175]]) this.fire(...this.X(dx, dz), 2.2, 1.9); // the burned-out warehouses are alight again
      if (bs === 2 || bs === 4) this.cutOff(bs === 4 ? 1 : 0);
      if (wade && !this.waded) { this.waded = true; for (const id of LINE7) { const n = c.npc(id), i = LINE7.indexOf(id); n.goTo(...this.X(lineX(0, i), WL[0].z), { speed: 2.3 + (i % 3) * 0.2, onArrive: (o) => { o.yaw = 0; o.setLoop('guard'); } }); } }
      return;
    }
    if (name === 'w7bend') { // Håkon's reserve, and its commander on a black horse
      const r = c.column(), k = r.k, [kx, kz] = this.X(13, -154.5), rh = this.at('q_redhand');
      r.on = true; r.horse.visible = true; r.path = []; r.speed = 0; r.mounted = true; r.yaw = Math.PI; r.pos.set(kx, w.groundAt(kx, kz), kz); r.horse.rotation.y = Math.PI;
      k.revive(); k.visible = true; k.cb = null; k.mode = 'crew'; k.talk = null; k.name = 'Kettil Red-Hand'; k.h.hold('R', 'smallaxe'); k.h.hold('L', 'buckler');
      this.men = P.slice(6, 12); this.men.forEach((e, i) => { const dx = i < 3 ? -13 + i * 4 : 24 + (i - 3) * 4; e.revive(); e.name = "One of Håkon's reserve"; arm(this.put(e, ...this.X(dx, -155.5), Math.PI, 'guard'), ['axe', 'sword', 'spear'][i % 3]); e.talk = null;
        const a = arm(at(TEN[i], dx, -158.2, 0, 'guard')); if (rh === 0) { a.fight(e, { lethal: 0 }); e.fight(a, { lethal: 0 }); } });
      arm(at('svanhild', 2, -168, 0, 'guard'), 'sword'); bow(at('astrid', -4, -171, 0));
      return;
    }
    if (name === 'w7pens') {
      const pn = this.at('q_pens'), n0 = this.count('q_pens'), L = this.V7.locks, [gx, gz] = L.gate;
      J.slice(0, 5).forEach((n, i) => { n.revive(); n.name = "One of Torvald's twenty"; const m = this.put(n, p.pos.x + 1.5 + (i % 2) * 1.6, p.pos.z + 1.2 + i * 1.1, p.yaw, null, ['axe', 'spear', 'sword'][i % 3]); m.h.hold('L', 'shield'); m.talk = null; if (pn <= 1) m.follow(p, { dist: 2.4 + i * 0.9 }); else m.setLoop('guard'); });
      this.put('guide', ...this.X(99, 249), this.X(60, 226)).talk = null;
      if (pn === 0) P.slice(0, 2).forEach((e, i) => { e.revive(); e.name = A7.pens.name; arm(this.put(e, gx - 2.5, gz - 1.4 + i * 2.8, Math.PI / 2, 'guard'), i ? 'spear' : 'axe'); e.talk = null; });
      const open = pn > 2 ? 3 : pn === 2 ? n0 : 0; // the doors already broken
      L.bars.forEach((m, i) => { m.visible = i >= open; });
      for (let i = 0; i < open; i++) this.freed(i, true);
      return;
    }
    if (name === 'w7bridge') {
      const b = this.RS.bridge, e = this.vigdis;
      e.revive(); this.put(e, b.x, b.z, Math.PI, 'guard', 'seax').h.hold('L', 'seax'); e.talk = null;
      arm(at('svanhild', -2.6, -127, 0, 'guard'), 'sword'); TEN.slice(0, 4).forEach((id, i) => arm(at(id, -5 + i * 3.4, -130, 0, 'guard'))); bow(at('astrid', 4, -133, 0));
      return;
    }
    if (name === 'w7gate') {
      const gm = this.at('q_gorm'), e = this.gorm, G = this.V7.gate;
      e.revive(); this.put(e, G.x, G.z - 4.6, Math.PI, 'guard', 'club').h.hold('L', 'ironshield'); e.talk = null;
      arm(at('svanhild', -2.4, 76, 0, 'guard'), 'sword'); TEN.slice(0, 3).forEach((id, i) => arm(at(id, -6 + i * 5, 73, 0, 'guard'))); bow(at('astrid', 5, 71, 0));
      J.slice(0, 2).forEach((n, i) => { n.revive(); n.name = i ? 'A Vængr swordsman' : 'A Jarnøy champion'; arm(this.put(n, ...this.X(i ? 3.4 : -4.4, 79), 0, 'guard'), i ? 'sword' : 'axe'); n.talk = null; });
      if (gm >= 1) this.thrown();
    }
  }
  talk(id, n) {
    const c = this.c;
    if (!SHORE7.includes(c.phase)) return false;
    if (id === 'ingrid') { n.say('Clean water. And keep them coming.', 3); return true; } // (game)
    if (id === 'leif') { n.say('I am bringing them up. Go.', 3); return true; }            // (game)
    n.say('...', 2); return true;
  }
  cues = {
    dismount() { const g = this.g, r = this.c.column(), k = r.k, p = g.player; r.mounted = false; this.dismounted = true; k.mode = 'idle'; k.pose = null; k.teleport(r.pos.x - 1.7, r.pos.z - 1.6, Math.atan2(p.pos.x - r.pos.x + 1.7, p.pos.z - r.pos.z + 1.6)); k.setLoop('guard'); g.audio.play('thud', { vol: 0.5 }); },
  };
  dyn(name) {
    if (name !== 'a7work' || !this.g.quests.at('q_pens', 'locks')) return undefined;
    const l = this.nextLock(); return l ? { x: l.x, z: l.z, y: this.g.world.groundAt(l.x, l.z) + 2 } : null;
  }

  // ---- the Black Shore -----------------------------------------------------------------------------
  /** A push up from the sand: 0 the harbor town, 1 the road. */
  push(i) {
    const g = this.g, c = this.c, B = c.battle;
    this.arm();
    const done = () => g.quests.notify('event', i ? 'a7road' : 'a7town');
    const fail = () => c.fail('The Black Shore', 'The line broke on the sand. Stand in it, raise your guard when their horn sounds, and sound your own when they reel.');
    if (B.wall && B.wall.o.stage === i && B.wall.phase === 'wait') B.wall.go({ mode: 'push', done, fail });
    else { const w = this.formLine(i, { mode: 'push', wait: true, done, fail, march: i === 1 }); g.after(i ? 5.5 : 1.5, () => { if (B.wall === w) w.go(); }); } // theirs comes on once ours has come up and formed
    LINE7.forEach((id, k) => { const n = c.npc(id), [x, z] = this.X(lineX(i, k), WL[i].z); n.home = [x, z, 0]; if (n.dist({ x, z }) > 2) n.goTo(x, z, { run: true, onArrive: (o) => { o.yaw = 0; o.setLoop('guard'); } }); });
    g.ui.questBanner('The Black Shore', i ? 'the road' : 'the harbor town'); c.hint('wallPush');
  }
  /** The alliance's line and Håkon's, as rank and file. land: ours wades in from the surf; march: ours comes up from where the first push ended; rest: ours only, standing where it won to. */
  formLine(stage, { mode = 'auto', wait = false, rest = false, adv = 0, land = false, march = false, done = null, fail = null } = {}) {
    const c = this.c, W = WL[stage], z = W.z + adv + WALL.gap / 2, w0 = WL[0];
    const from = land ? (f, n) => this.X((w0.x[0] + ((w0.x[1] - w0.x[0]) * f) / (n - 1)) * 0.8, -243 - Math.random() * 5)
      : march ? (f, n) => this.X(w0.x[0] + ((w0.x[1] - w0.x[0]) * f) / (n - 1), w0.z + A7.wall[0].goal - Math.random() * 3) : null;
    return c.battle.startWall({ stage, a: this.X(W.x[0], z), b: this.X(W.x[1], z), face: 0, heroes: LINE7.map((id) => c.npc(id)), anchors: ['svanhild', 'hroald'], paint: ['alliance', 'wolves'],
      mode, wait, rest, R: { ...A7.shore }, cfg: { ...A7.wall[stage], ...(rest ? { ranks: [3, 0], reserve: [0, 0] } : {}) }, thin: rest ? [0.3, 0] : null,
      arrive: from && { from, speed: land ? 2.4 : 3.6 }, from: W.from.map(([x, zz]) => this.X(x, zz)), done, fail });
  }
  /** A group of allies cut off, and the men round them (seen, until he comes back for them). */
  cutOff(i) {
    const c = this.c, [cx, cz] = this.X(...CUT[i]), mine = c.battle.jarn.slice(i * 3, i * 3 + 3), foes = c.raid.pool.slice(i * 4, i * 4 + 4);
    mine.forEach((n, k) => { const a = k * 2.1; n.revive(); n.name = i ? 'A fighter of Jarnøy' : 'A Vængr swordsman'; this.put(n, cx + Math.cos(a) * 0.9, cz + Math.sin(a) * 0.9, [cx + Math.cos(a) * 5, cz + Math.sin(a) * 5], 'guard', i ? 'spear' : 'sword').h.hold('L', 'shield'); n.talk = null; });
    foes.forEach((e, k) => { const a = k * 1.57 + 0.4; e.revive(); e.name = A7.rescue.name; this.put(e, cx + Math.cos(a) * 3.3, cz + Math.sin(a) * 3.3, [cx, cz], 'guard', ['axe', 'sword', 'spear', 'axe'][k]).h.hold('L', 'shield'); e.talk = null; });
    mine.forEach((n, k) => { n.fight(foes[k], { lethal: 0 }); foes[k].fight(n, { lethal: 0 }); });
    this.group = { i, mine, foes, on: false, at: [cx, cz] };
  }
  /** He has come back for them. */
  rescue() {
    const g = this.g, c = this.c, G = this.group, R = A7.rescue;
    G.on = true; this.arm(); c.hint(null);
    for (const e of G.foes) { e.stop(); g.combat.add(e, { hp: R.hp, dmg: R.dmg, skill: R.skill }); }
    G.mine.forEach((n, k) => n.fight(G.foes[k], { lethal: 0, dmg: R.allyDmg }));
    g.ui.questBanner('cut off', G.i ? 'the men of Jarnøy' : 'the men of Vængr');
  }
  saved() {
    const g = this.g, c = this.c, G = this.group, [hx, hz] = this.V7.shore.hospital;
    this.group = null; g.combat.clear();
    G.mine.forEach((n, k) => { n.stop(); n.setLoop(null); n.h.play('cheer', 1.0); g.after(1.6, () => n.goTo(hx + 4 + k * 1.6, hz + 5, { onArrive: (o) => o.setLoop('sit') })); });
    c.sub(TOLD.back[G.i], 10); g.after(G.i ? 6 : 3, () => g.quests.notify('event', 'a7back'));
  }

  // ---- Kettil Red-Hand, at the bend ----------------------------------------------------------------------
  kettilDuel() {
    const c = this.c, k = c.column().k, R = A7.kettil;
    if (this.kd) return;
    this.arm(); this.kd = { done: false };
    this.champion(k, 'kettil', R, { where: 'the bend in the road', onDown: (e) => this.knees(e), phases: [{ at: 0.55, do: () => c.sub(TOLD.kettil[1], 12) }, { at: R.kneelAt, do: (e) => this.knees(e) }] });
    c.sub(TOLD.kettil[0], 11);
  }
  knees(e) {
    const g = this.g, c = this.c, p = g.player, d = this.kd;
    if (!d || d.done) return;
    d.done = true; g.combat.clear(); e.cb = null; e.mode = 'idle'; e.stop(); p.mortal = false; p.frozen = true; g.slowT = 0.6;
    e.h.hold('R', null); e.h.hold('L', null); e.yaw = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z); e.setLoop('kneel'); g.audio.play('thud');
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, dd = Math.hypot(dx, dz) || 1; p.teleport(e.pos.x + (dx / dd) * 1.7, e.pos.z + (dz / dd) * 1.7, Math.atan2(-dx, -dz));
    g.after(1.2, () => c.say('a7_knees', e, () => { this.endIt = { t: 0, e }; c.hint('endIt'); }));
  }
  /** The seventh and last of Håkon's champions. */
  end() {
    const g = this.g, c = this.c, p = g.player, e = this.endIt.e;
    this.endIt = null; c.hint(null);
    p.h.play('atk3', 0.75, { hitAt: 0.42, onHit: () => { g.slowT = 0.9; g.audio.play('arrowHit'); g.audio.play('thud'); g.fx.burst('blood', e.pos.x, e.pos.y + 0.9, e.pos.z, 20); p.cam.shake = 0.4; e.setLoop(null); e.die(); } });
    g.after(3.2, () => g.ui.card('Kettil Red-Hand', TOLD.seven[0], 6).then(() => {
      p.frozen = false; g.audio.setMusic('sorrow'); c.sub(TOLD.seven[1], 13);
      (this.men || []).forEach((m, i) => { const a = c.npc(TEN[i]); m.stop(); a.stop(); a.setLoop('guard'); if (i % 2) m.h.hold('R', null); m.setLoop(null); m.goTo(...this.X(6 + i * 2, -127), { run: i % 2 === 0, onArrive: (o) => { o.visible = false; } }); }); // they have not been paid enough to die
      g.after(13.4, () => g.quests.notify('event', 'a7kettil'));
    }));
  }

  // ---- the pens: Torvald, and Star-Fall --------------------------------------------------------------------
  /** For one chapter the story is Torvald's: the player is him. */
  asTorvald(on) {
    const g = this.g, p = g.player, st = this.st, own = st.look;
    if (on === !!this.tor) return;
    this.tor = on; p.other = on;
    st.look = null; p.setLook(on ? CAST3.torvald.look : EIRIK_ADULT, true); st.look = own; // the player's choices for Eirik's face are Eirik's
    if (on) { if (!g.inventory.has('maul')) { g.inventory.add('maul', 1, true); st.flags.a7lent = true; } p.equip('maul'); p.h.hold('R', 'starfall'); p.stormDead = true; p.ward = 0; g.ravens.setMode('hidden'); }
    else { if (st.flags.a7lent) { g.inventory.remove('maul', 1, true); st.flags.a7lent = false; } p.stormDead = false; p.showBackAxe(false); p.equip('father_axe'); g.ravens.setMode('follow'); }
    p.health = 100; p.stamina = 100;
  }
  /** More than twenty guards, as eight. */
  guards() {
    const g = this.g, c = this.c, R = { ...A7.pens }, X = (a, b) => this.X(a, b), ids = ['j0', 'j1', 'j2', 'j3', 'j4'];
    g.player.mortal = true;
    for (const e of c.raid.pool.slice(0, 2)) if (e.visible && !e.dead) g.combat.add(e, { hp: R.hp, dmg: R.dmg, skill: R.skill });
    for (const id of ids) { const n = c.npc(id); n.stop(); n.setLoop('guard'); }
    c.battle.startSkirmish(ids, [X(44, 214), X(34, 232), X(50, 237)], R.n, R.atOnce, () => { g.quests.notify('event', 'a7guards'); c.sub(TOLD.locks, 10); }, R);
    g.ui.questBanner('The Pens', 'through the gate'); c.sub(TOLD.pens[1], 11);
  }
  nextLock() { const i = this.count('q_pens'), pt = this.V7.locks.pts[i]; return this.g.quests.at('q_pens', 'locks') && pt ? { x: pt[0], z: pt[1] + 1.5 } : null; }
  lock() {
    const g = this.g, p = g.player, i = this.count('q_pens'), [x, z] = this.V7.locks.pts[i], y = g.world.groundAt(x, z);
    this.busy = true;
    new Knack(g, { label: 'Break the lock', verb: 'strike', cfg: A7.knack.lock, anim: 'slam', animDur: 0.95, sound: 'split', bad: 'The hammer skids off the iron', at: [x, z + 1.5, Math.PI], seed: i + 3,
      onGood: () => { p.cam.shake = 0.45; g.audio.play('steel'); g.fx.burst('spark', x, y + 1, z, 16); g.fx.burst('chips', x, y + 0.9, z, 12); g.fx.ring(x, y, z + 0.8, { r0: 0.3, r1: 2.6, dur: 0.4, color: 0xbfd0ff, a: 0.6 }); },
      onStop: () => { this.busy = false; },
      onDone: () => { this.busy = false; this.freed(i); g.quests.notify('event', 'a7lock'); } }).start();
  }
  /** A door is open: who comes out of it. */
  freed(i, quiet) {
    const g = this.g, c = this.c, p = g.player, T = c.sea.town, [x, z] = this.V7.locks.pts[i];
    const out = [T[i * 2], T[i * 2 + 1], i === 0 ? c.npc('kari') : i === 2 ? c.npc('arvid') : T[6]];
    this.V7.locks.bars[i].visible = false;
    out.forEach((n, k) => { n.revive(); n.talk = null; if (n.id.startsWith('kp')) n.name = 'A freed thrall';
      this.put(n, x - 2.4 + k * 2.3, z + 3.6 + (k % 2) * 1.4 + i * 0.3, [x, z + 9], null, n.id === 'arvid' ? 'sword' : n.id === 'kari' ? 'spear' : k ? 'axe' : null);
      if (!quiet) { n.teleport(x + (k - 1) * 0.5, z + 0.9, 0); n.goTo(x - 2.4 + k * 2.3, z + 3.6 + (k % 2) * 1.4 + i * 0.3, { onArrive: (o) => o.h.play('cheer', 1.0) }); } });
    if (quiet) return;
    g.audio.play('shout', { vol: 0.5 });
    if (i === 1) g.after(1.3, () => { p.health = Math.min(p.health, 44); p.h.play('stagger', 0.8); g.audio.play('hurt'); g.ui.pulse('hurt', 0.8); p.cam.shake = 0.35; g.fx.burst('blood', p.pos.x, p.pos.y + 1.1, p.pos.z, 10); g.ui.toast('A spear in the side. He keeps going.'); });
  }
  /** Down the hill; and what Astrid sees. */
  playKari() {
    const g = this.g, c = this.c, p = g.player, T = c.sea.town, X = (a, b) => this.X(a, b), w = g.world, a = c.npc('astrid'), k = c.npc('kari'), Y = (pt) => w.groundAt(pt[0], pt[1]);
    if (this.busy) return;
    this.busy = true; p.frozen = true; g.combat.clear(); c.hint(null);
    const A = X(-34, 224), K0 = X(-6, 226), rock = X(-14, 236), crowd = [...T, c.npc('arvid'), ...c.battle.jarn.slice(0, 5)];
    crowd.forEach((n, i) => { n.revive(); n.talk = null; this.put(n, ...X(18 - (i % 5) * 2.6, 220 + Math.floor(i / 5) * 2.6), X(-40, 224), null, n.id === 'arvid' ? 'sword' : [null, 'axe', 'spear'][i % 3]); });
    this.put(k, K0[0] + 4, K0[1], A, null, 'spear'); k.talk = null; this.put(a, A[0], A[1], K0, null).h.hold('L', 'bow'); a.talk = null;
    p.teleport(rock[0] + 26, rock[1] - 6, -Math.PI / 2);
    const mid = () => [(a.pos.x + k.pos.x) / 2, a.pos.y + 1.3, (a.pos.z + k.pos.z) / 2];
    const cam = { hill: { from: [K0[0] - 14, Y(K0) + 4.4, K0[1] + 9], to: [K0[0] - 17, Y(K0) + 3.6, K0[1] + 7], look: () => [k.pos.x + 4, k.pos.y + 1.2, k.pos.z - 2], fov: 46 },
      astrid: { from: [A[0] + 2.6, Y(A) + 1.6, A[1] + 1.2], look: () => [a.pos.x, a.pos.y + 1.5, a.pos.z], fov: 30 }, kari: { from: () => [k.pos.x - 2.6, k.pos.y + 1.5, k.pos.z + 1.4], look: () => [k.pos.x, k.pos.y + 1.45, k.pos.z], fov: 30 },
      two: { from: [A[0] + 4.4, Y(A) + 1.5, A[1] + 3.2], to: [A[0] + 3.4, Y(A) + 1.4, A[1] + 2.6], look: mid, fov: 32 }, torvald: { from: [rock[0] + 3.6, Y(rock) + 1.3, rock[1] - 2.4], look: () => [p.pos.x, p.pos.y + 0.8, p.pos.z], fov: 34 } };
    const hold = () => { k.stop(); k.h.hold('R', null); k.teleport(a.pos.x + 0.62, a.pos.z + 0.12, Math.atan2(-0.62, -0.12)); a.h.hold('L', null); a.setLoop('mourn'); k.setLoop('carry'); a.yaw = Math.atan2(0.62, 0.12); };
    const act = {
      pour: () => { crowd.forEach((n, i) => n.goPath([X(-8 - (i % 5) * 1.5, 212 + Math.floor(i / 5) * 2), X(-44 - (i % 5) * 2.6, 190 + Math.floor(i / 5) * 3.2 + (i % 2))], { run: true })); k.goTo(K0[0] - 12, K0[1] - 1, { run: true }); g.audio.play('shout'); }, // past her, down toward the bridge
      run: () => { k.h.hold('R', null); k.goTo(a.pos.x + 0.7, a.pos.z + 0.1, { run: true }); },
      hold,
      sit: () => { p.teleport(rock[0] + 0.5, rock[1] - 0.4, -2.2); p.loopOverride = 'sit'; },
    };
    this.scene(KARI_LINES, cam, act, () => { hold(); p.loopOverride = null; g.ui.fade(true, 1.4).then(() => { this.busy = false; g.quests.notify('event', 'a7kari'); }); });
  }

  // ---- Vigdis Quickblood, on the bridge ---------------------------------------------------------------------
  vigdisDuel() {
    const g = this.g, c = this.c, e = this.vigdis, R = A7.vigdis;
    if (this.vd) return;
    this.arm(); this.vd = { done: false, said: false, beat: 0 };
    // A burst of blows (a finisher on a broken guard) can cross two marks at once: the beats still come one after another.
    const beat = (fn) => (en) => { const d = this.vd, now = g.combat.t, at = Math.max(now, d.beat); d.beat = at + R.beat; if (at > now) g.after(at - now, () => { if (this.vd === d && !d.done) fn(en); }); else fn(en); };
    // The story: she sees the flash in his scar when the Stormguard saves him. If it has not yet, it turns her next blow
    // (the 'warded' handler in build() then plays the lines); if no blow of hers reaches him, her words come without that line.
    const sees = () => { const d = this.vd; if (d.said) return; g.player.wardT = Math.max(g.player.wardT, R.wardFor); g.after(R.wardFor + 0.5, () => { if (this.vd === d && !d.done && !d.said) { d.said = true; d.beat = Math.max(d.beat, g.combat.t + A7.vigdis.talk); this.said(SAID.vigdis.slice(1)); } }); };
    this.champion(e, 'vigdis', R, { where: 'the long bridge', onDown: (en) => this.vigdisFalls(en), phases: [
      { at: 0.62, do: beat(sees) },
      { at: 0.5, do: beat(() => this.alight(13, 3)) },
      { at: 0.28, use: 1, do: beat(() => { this.alight(7.5, 2.4); c.tell(TOLD.rhythm, 12); }) }] });
    c.sub(TOLD.vigdis[0], 13); g.after(2, () => c.hint('feet'));
  }
  /** Fire arrows from Håkon's last archers set the bridge alight: the safe ground shrinks. */
  alight(off, r) {
    const g = this.g, c = this.c, b = this.RS.bridge, first = !this.burning;
    this.burning = (this.burning || 0) + 1;
    this.war.loose([b.x + 30, b.y + 26, b.z + 70], [-1, 1].flatMap((s) => [[b.x - 1, b.y + 0.1, b.z + s * off], [b.x + 1.2, b.y + 0.1, b.z + s * (off + 1.5)], [b.x, b.y + 0.1, b.z + s * (off + 3)]]), { T: 1.5 });
    g.after(1.55, () => { for (const s of [-1, 1]) { this.fires.push(g.fx.addFire(b.x - s, b.y + 0.2, b.z + s * off, 1.5), g.fx.addFire(b.x + s * 1.2, b.y + 0.2, b.z + s * (off + 2.5), 1.2)); g.combat.trap(b.x, b.z + s * (off + 1), { kind: 'fire', r, sec: 9999, dmg: 9, arm: 1.2 }); }
      g.audio.play('ignite'); c.act.glowTarget = 0.7; if (first) c.sub(TOLD.alight, 10); });
  }
  vigdisFalls(e) {
    const g = this.g, c = this.c, p = g.player, d = this.vd, b = this.RS.bridge;
    if (!d || d.done) return;
    d.done = true; g.combat.clear(); e.cb = null; e.mode = 'idle'; e.die(); p.mortal = false; c.hint(null); g.audio.setMusic('sorrow');
    c.tell(TOLD.vigdisDown.slice(0, 2), 12).then(() => g.ui.card('Vigdis Quickblood', 'The Left Hand is dead.', 5)).then(() => {
      c.sub(TOLD.vigdisDown[2], 10); g.audio.play('split'); g.audio.play('thud'); p.cam.shake = 0.6;
      for (let i = 0; i < 5; i++) g.fx.burst('ember', b.x + (i - 2) * 0.8, b.y, b.z - 12 + i, 12);
      g.after(7, () => g.quests.notify('event', 'a7vigdis'));
    });
  }

  // ---- Gorm Stone-Lung, at the gate ----------------------------------------------------------------------------
  /** Thrown through the air by a swing of that shield. */
  fling(n, dx, dz, dead) { const g = this.g; n.stop(); n.mode = 'crew'; n.pose = 'dead'; g.audio.play('thud'); g.fx.burst('dust', n.pos.x, n.pos.y + 0.4, n.pos.z, 10); this.flung.push({ n, t: 0, x: n.pos.x, z: n.pos.z, dx, dz, dead }); }
  /** Where the scene before the gate leaves everyone. */
  thrown() {
    const c = this.c, J = c.battle.jarn, w = this.g.world;
    this.flung = [];
    J.slice(0, 2).forEach((n, i) => { const [x, z] = this.X(i ? 6.4 : -6.8, 86.5); n.dead = true; this.fix(n, x, w.groundAt(x, z) + 0.1, z, i ? 2 : -2, 'dead'); n.h.hold('L', null); });
    const s = this.put('svanhild', ...this.X(-3, 70), this.X(0, 90), 'guard', 'sword'); s.h.hold('L', 'shield');
  }
  playGorm() {
    const g = this.g, c = this.c, p = g.player, e = this.gorm, J = c.battle.jarn, s = c.npc('svanhild'), G = this.V7.gate, y = g.world.groundAt(G.x, G.z - 5);
    if (this.gormOn) return;
    this.gormOn = true; p.frozen = true; c.hint(null); g.ravens.exitEye();
    const hit = (n, k) => { n.h.play('atk' + k, 0.55); g.after(0.24, () => { g.audio.play('steel'); e.h.play('parry', 0.3); g.fx.burst('spark', e.pos.x, y + 1.5, e.pos.z - 0.8, 10); }); };
    const swat = (n, dx, dead) => { e.yaw = Math.atan2(n.pos.x - e.pos.x, n.pos.z - e.pos.z); e.h.play('shove', 0.6); g.after(0.26, () => { p.cam.shake = 0.3; this.fling(n, dx, -6.5, dead); }); };
    const cam = { gorm: { from: [G.x + 2.4, y + 1.3, G.z - 9.4], to: [G.x + 1.6, y + 1.6, G.z - 8.2], look: () => [e.pos.x, y + 2.0, e.pos.z], fov: 36 }, wide: { from: [G.x + 9, y + 3.4, G.z - 16], to: [G.x + 7, y + 3.0, G.z - 14], look: [G.x, y + 1.4, G.z - 7], fov: 44 },
      svan: { from: [G.x - 3.4, y + 1.5, G.z - 10.4], look: () => [s.pos.x, s.pos.y + 1.3, s.pos.z], fov: 34 } };
    const act = {
      try: () => { J[0].setLoop(null); J[0].goTo(G.x - 1.2, G.z - 6.4, { run: true, onArrive: (o) => { hit(o, 1); g.after(0.7, () => swat(o, -5.6, true)); } });
        g.after(3.2, () => { J[1].setLoop(null); J[1].goTo(G.x + 1.2, G.z - 6.4, { run: true, onArrive: (o) => { hit(o, 2); g.after(0.7, () => swat(o, 5.2, true)); } }); }); },
      svan: () => { s.setLoop(null); s.goTo(G.x - 0.4, G.z - 6.5, { run: true, onArrive: (o) => { hit(o, 1); g.after(0.6, () => hit(o, 2)); g.after(1.2, () => hit(o, 3)); g.after(2.0, () => swat(o, -2.4, false)); } }); },
      back: () => { this.thrown(); },
    };
    this.scene(GORM_LINES, cam, act, () => { this.thrown(); p.frozen = false; this.gormDuel(); });
  }
  gormDuel() {
    const g = this.g, c = this.c, e = this.gorm, R = A7.gorm;
    if (this.gd) return;
    this.gormOn = true; this.arm(); this.gd = { done: false };
    this.put(e, this.V7.gate.x, this.V7.gate.z - 4.6, Math.PI, 'guard'); e.talk = null;
    this.champion(e, 'gorm', R, { where: "the gate of Håkon's hall", onDown: (en) => this.gormFalls(en), phases: [
      { at: 0.78, do: () => c.sub(TOLD.gorm[1], 15) },
      { at: 0.5, use: 0, do: (en) => { en.h.hold('L', null); g.audio.play('split'); g.fx.burst('chips', en.pos.x, en.pos.y + 1.4, en.pos.z, 24); c.sub(TOLD.gormShield, 10); } }] });
    c.sub(TOLD.gorm[0], 13); g.after(3, () => c.hint('weak'));
  }
  gormFalls(e) {
    const g = this.g, c = this.c, p = g.player, d = this.gd, G = this.V7.gate, y = g.world.groundAt(G.x, G.z - 1);
    if (!d || d.done) return;
    d.done = true; g.combat.clear(); e.cb = null; e.mode = 'idle'; e.stop(); p.mortal = false; c.hint(null); g.slowT = 0.9; g.audio.setMusic('sorrow');
    e.h.hold('L', null); e.setLoop('kneel'); g.audio.play('thud'); p.cam.shake = 0.5;
    g.after(6.5, () => { this.fix(e, G.x, y, G.z - 0.75, Math.PI, 'sit'); g.audio.play('thud'); p.cam.shake = 0.3; });
    c.tell(TOLD.gormDown, 9).then(() => this.said(SAID.gorm)).then(() => {
      this.V7.gate.set(false); g.audio.play('split', { vol: 0.6 }); g.audio.play('thud'); this.fix(e, G.x - 3.6, y, G.z - 1.6, 2.2, 'dead');
      return g.ui.card('Gorm Stone-Lung', 'The Right Hand is dead.', 5);
    }).then(() => g.quests.notify('event', 'a7gorm'));
  }

  // =====================================================================================
  steps = {
    'q_blackshore.wade'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.X(0, -240.6);
      const go = () => { this.waded = false; c.setPhase('w7shore', true); p.teleport(at[0], at[1], 0); this.arm(); };
      if (r) return go();
      c.fade(() => { go(); return g.ui.card('The Black Shore', QUESTS.q_blackshore.desc, 7); }, 1.4, 1.4).then(() => { g.audio.play('horn', { freq: 96, vol: 0.5 }); c.tell(TOLD.shore.slice(0, 2), 9); c.hint('fireShore'); });
    },
    'q_blackshore.town'(r) { const c = this.c; c.setPhase('w7shore', r); this.here(r, this.X(0, -222), 0); if (r) this.dress('w7shore'); c.hint(null); this.push(0); if (!r) c.tell(TOLD.shore.slice(2), 10); },
    'q_blackshore.back1'(r) { const c = this.c; c.setPhase('w7shore', r); this.here(r, this.X(-6, -208), 0); this.arm(); this.dress('w7shore'); c.hint('goBack'); },
    'q_blackshore.road'(r) { const c = this.c; c.setPhase('w7shore', r); this.here(r, this.X(-30, -200), 1.2); this.marching = !r; this.dress('w7shore'); this.marching = false; c.hint(null); this.push(1); if (!r) this.g.after(10.5, () => c.tell(TOLD.slopes, 11)); },
    'q_blackshore.back2'(r) { const c = this.c; c.setPhase('w7shore', r); this.here(r, this.X(6, -186), 0); this.arm(); this.dress('w7shore'); c.hint('goBack'); },
    'q_blackshore.bend'(r) { const c = this.c; c.setPhase('w7shore', r); this.here(r, this.X(26, -194), -0.6); this.arm(); this.dress('w7shore'); c.hint(null); },
    'q_redhand.kettil'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.X(9, -166.5);
      const go = () => { c.setPhase('w7bend', true); p.teleport(at[0], at[1], 0.35); this.arm(); };
      if (r) return go();
      c.fade(() => { go(); return g.ui.card('The Red-Hand Returns', '', 3.6); }, 1.2, 1.2);
    },
    'q_pens.gate'(r) {
      const g = this.g, c = this.c, p = g.player, top = this.X(91, 246.5), gt = this.V7.locks.gate;
      const go = () => { c.setPhase('w7pens', true); this.asTorvald(true); p.teleport(top[0], top[1], Math.atan2(gt[0] - top[0], gt[1] - top[1])); p.mortal = true; this.dress('w7pens'); };
      if (r) { go(); return c.hint('asTorvald'); }
      c.fade(() => { go(); return g.ui.card('The Pens', QUESTS.q_pens.desc, 8); }, 1.4, 1.4).then(() => { c.sub(TOLD.pens[0], 13); c.hint('asTorvald'); });
    },
    'q_pens.guards'(r) { const c = this.c, gt = this.V7.locks.gate; if (r) { c.setPhase('w7pens', true); this.asTorvald(true); this.here(r, [gt[0] + 3, gt[1]], -Math.PI / 2); this.dress('w7pens'); } c.hint(null); this.guards(); },
    'q_pens.locks'(r) { const c = this.c, L = this.V7.locks; if (r) { c.setPhase('w7pens', true); this.asTorvald(true); this.here(r, [L.pts[0][0] + 4, L.pts[0][1] + 5], -2.4); this.dress('w7pens'); } this.g.player.mortal = false; },
    'q_pens.kari'(r) { const g = this.g, c = this.c, L = this.V7.locks; if (r) { c.setPhase('w7pens', true); this.asTorvald(true); this.here(r, [L.pts[2][0], L.pts[2][1] + 3], -2.4); this.dress('w7pens'); } g.after(r ? 1 : 2.6, () => this.playKari()); },
    'q_vigdis.bridge'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.X(1.5, -123);
      const go = () => { c.setPhase('w7bridge', true); p.teleport(at[0], at[1], 0); this.arm(); };
      if (r) return go();
      c.fade(() => { go(); return g.ui.card('Vigdis, the Left Hand', QUESTS.q_vigdis.desc, 7); }, 1.4, 1.4).then(() => c.tell(TOLD.bridge, 9));
    },
    'q_vigdis.vigdis'(r) { const c = this.c; c.setPhase('w7bridge', r); this.here(r, this.X(0, -97.5), 0); this.vigdisDuel(); },
    'q_gorm.gate'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.X(0, 67);
      const go = () => { c.setPhase('w7gate', true); p.teleport(at[0], at[1], 0); this.arm(); };
      if (r) return go();
      c.fade(() => { go(); return g.ui.card('Gorm, the Right Hand', QUESTS.q_gorm.desc, 7); }, 1.4, 1.4);
    },
    'q_gorm.gorm'(r) { const g = this.g, c = this.c; c.setPhase('w7gate', r); this.here(r, this.X(1.5, 82), 0); if (r) { this.arm(); return this.gormDuel(); } this.playGorm(); },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase;
    // a safety net: at Gorm's step there is always either his scene or his duel. Once in a playtest (2026-11-15) the
    // duel was wiped mid-fight (clear() ran: no gd, no Gorm) and the chapter could never end; set the step up again
    if (q.at('q_gorm', 'gorm') && !this.gd && !this.gormOn && g.mode === 'play' && !p.frozen && !c.act.failing) { this.gormLost = (this.gormLost || 0) + dt; if (this.gormLost > 1.5) { this.gormLost = 0; q.enter('q_gorm', true); return; } } else this.gormLost = 0;
    if (!SHORE7.includes(ph)) return;
    this.crew([...c.sea.town, ...c.battle.jarn, this.gorm, c.npc('svanhild')], dt);
    for (const f of this.flung) { // through the air, and down
      f.t += dt; const k = Math.min(1, f.t / 0.55), n = f.n, x = f.x + f.dx * k, z = f.z + f.dz * k;
      n.pos.set(x, g.world.groundAt(x, z) + 0.1 + Math.sin(k * Math.PI) * 1.5, z); n.root.rotation.y = n.yaw;
      if (k >= 1 && !f.done) { f.done = true; g.audio.play('thud'); g.fx.burst('dust', x, n.pos.y + 0.2, z, 12); if (f.dead) n.dead = true; }
    }
    if (this.tor && p.equipped !== 'maul') { p.equip('maul'); p.h.hold('R', 'starfall'); }
    const wl = c.battle.wall;
    if (wl) { wl.update(dt, g.mode === 'play'); if (wl.surges >= 2 && !wl.taught) { wl.taught = true; c.hint(null); } } // the strip at the top says the rest
    if (g.mode !== 'play') return;
    if (c.battle.sk) c.battle.updateSkirmish(dt);
    if (ph === 'w7shore') {
      if ((this.vT -= dt) <= 0) { this.vT = A7.volley.every * 1.25 * (0.8 + Math.random() * 0.4); const from = this.X(8, -150); this.war.rain(p.pos.x, p.pos.z + 3, A7.volley.n + 2, 24, [from[0], 44, from[1]], { T: 1.9, burn: 4, hurt: A7.volley.dmg, onHim: 2 }); g.ui.alert(true); }
      const G = this.group;
      if (G && !G.on && this.near(G.at, 13)) this.rescue();
      if (G && G.on && G.foes.every((e) => e.dead)) this.saved();
    }
    if (ph === 'w7bend') {
      const k = c.column().k;
      if (q.at('q_redhand', 'kettil') && !this.kOn && this.near([k.pos.x, k.pos.z], 12.5)) { this.kOn = true; c.say('a7_kettil', k, () => this.kettilDuel()); }
      if (this.endIt && g.input.hit('attack')) this.end();
    }
    if (ph === 'w7bridge' && this.burning && Math.random() < dt * 0.5) { const b = this.RS.bridge, s = Math.random() < 0.5 ? -1 : 1; g.fx.burst('ember', b.x + (Math.random() - 0.5) * 3, b.y + 0.2, b.z + s * (9 + Math.random() * 9), 8); if (Math.random() < 0.4) g.audio.play('split', { vol: 0.3 }); } // planks fall away into the ravine
    const e = this.gorm;
    if (ph === 'w7gate' && e.cb && !e.cb.out) { // on the wet steps of the hall his weight works against him
      const on = e.pos.z > this.V7.gate.z - 3.4; e.cb.restAdd = (e.cb.spent ? 1 : 0) + (on ? 0.9 : 0);
      if (on && !this.stepsSaid) { this.stepsSaid = true; g.ui.toast('On the slippery steps, the giant is slower to recover'); }
    }
  }
}
