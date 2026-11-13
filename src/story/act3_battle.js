// Act III, Chapters 4 to 6 on Jarnøy: "The Battle of Iron Shore" (six days of digging, arrows from the ridge, the
// Stinking Ditch, the shield wall, the side gate, Grjotgard), "The Longshot" (through the burning granary to Arne in
// the watchtower) and "The Enemy Who Escaped" (Ulf Two-Blades, the burning boats, the pyres).
// The battle is a stand-in for the story's hundred and fifty against two hundred: about sixteen defenders and a
// stream of attackers who fight in pairs along the trench, while the ones who break through come for Eirik.
import * as THREE from 'three';
import { M, cyl, tint, at } from '../world/geo.js';
import { makeShip } from '../world/props.js';
import { RAIDER_LOOKS } from '../data/act1.js';
import { A3, JARN_LOOKS } from '../data/act3.js';
import { FOES } from './champions.js';
import { Knack } from '../systems/activities2.js';
import { PHASES } from './act2.js';

const DIGS = [[181, 84], [179, 114]], LINE = ['j0', 'arvid', 'hauk', 'v0', 'j1', 'v2', 'torvald', 'grjotgard', 'v3', 'j2', 'v5', 'j3', 'v7', 'j4', 'v9', 'j5'];
const TEN = ['hauk', 'grjotgard', 'v0', 'v2', 'v3', 'leif'], RIDGE = [[132, -112], [148, -118], [164, -116], [180, -110], [196, -104]], SHIPS = [[210, 98], [209, 110], [208, 122]];

export class A3Battle {
  constructor(game, core) { this.g = game; this.c = core; this.foes = []; this.jarn = []; this.arrows = []; this.fires = []; this.sk = null; this.t = 0; this.saved = []; }
  get st() { return this.g.state; }
  get JT() { return this.g.world.main.jarnoy; }
  J(dx, dz) { return this.c.isle.J(dx, dz); }
  at(id) { const q = this.st.quests[id]; return !q ? -1 : q.status === 'done' ? 99 : q.step; }
  count(id) { const q = this.st.quests[id]; return q && q.status === 'active' ? q.count : 0; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, JT = this.JT;
    for (let i = 0; i < 20; i++) { const n = g.addNPC('a3e' + i, { name: "Håkon's man", look: RAIDER_LOOKS[i % RAIDER_LOOKS.length] }); n.visible = false; n.walkSpeed = 3.4; this.foes.push(n); }
    for (let i = 0; i < 8; i++) { const n = g.addNPC('j' + i, { name: 'A fighter of Jarnøy', look: JARN_LOOKS[i % JARN_LOOKS.length] }); n.visible = false; n.talk = () => n.say('Jarnøy bends. It does not break.', 3); this.jarn.push(n); } // (game)
    for (let i = 0; i < A3.rain.arrows; i++) { const m = new THREE.Mesh(tint(at(cyl(0.012, 0.012, 0.85, 4), 0, 0, 0), 0x15120f, 0.1, 2), M.vcPlain); m.visible = false; g.scene.add(m); this.arrows.push({ m, t: -1 }); }
    this.ulfShip = makeShip({ L: 21, B: 4.4, seed: 61, sail: false }); this.ulfShip.visible = false; g.scene.add(this.ulfShip);
    this.ulf = g.addNPC('ulf', { name: 'Ulf Two-Blades', look: FOES.find((f) => f.id === 'ulf').look }); this.ulf.visible = false;
    this.arne = g.addNPC('arne', { name: 'Arne Longshot', look: FOES.find((f) => f.id === 'arne').look }); this.arne.visible = false;
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, ...(typeof pos === 'function' ? { pos, x: 0, z: 0 } : { x: pos[0], z: pos[1] }), r: 3, priority: 3, label, enabled, use, ...o });
    I('a3dig', () => { const [x, z] = this.J(...DIGS[Math.min(1, this.count('q_shore'))]); return { x, z }; }, 'Dig the trench and set the stakes', () => q.at('q_shore', 'trench'), () => this.dig());
    I('a3fill', this.J(190.4, 116), 'Fill the Stinking Ditch', () => q.at('q_shore', 'ditch'), () => this.fill(), { r: 3.6 });
    I('a3rest', this.J(168, -17), 'Rest until dawn', () => q.at('q_shore', 'dawn'), () => this.dawn(), { r: 3.4 });
    I('a3granary', this.J(127.6, -44.6), 'Go through the fire', () => q.at('q_long', 'fire') && !this.climbing, () => this.throughFire(), { r: 3.6 });
    I('a3boat', () => { const i = this.nextBoat(), [x, z] = JT.boats[i < 0 ? 0 : i]; return { x, z: z + 3.4 }; }, 'Cut the mooring line and pull them out', () => q.at('q_ulf', 'boats') && this.nextBoat() >= 0 && !g.activity, () => this.pull(this.nextBoat()), { r: 3.2 });
    I('a3house', () => { const d = JT.outer[Math.min(2, this.count('q_shore'))]; return { x: d.x, z: d.z }; }, 'Get the family out', () => q.at('q_shore', 'families') && !this.grjotOn, () => this.family(), { r: 3.2 });
    RIDGE.forEach(([dx, dz], i) => g.ravens.addMarkable({ id: 'a3arch' + i, pos: () => ({ x: this.J(dx, dz)[0], z: this.J(dx, dz)[1] }), r: 34, label: 'an archer behind a tree', enabled: () => q.at('q_shore', 'archers') && this.archers && !this.archers[i].dead, onMark: () => this.callArcher(i) }));
    g.ravens.addMarkable({ id: 'a3way', pos: () => ({ x: this.J(130, -49)[0], z: this.J(130, -49)[1] }), r: 46, label: 'a way up the back of the tower', enabled: () => q.at('q_long', 'way'),
      onMark: () => { c.sub("She shows him a way up: through the burning granary, up a collapsed roof beam, across to a ledge on the tower's back wall where there is no window.", 9); q.notify('event', 'a3way'); } });
    g.events.on('warded', () => { if (this.duel) this.duel.wards++; });
  }
  dyn(name) {
    const q = this.g.quests, JT = this.JT, w = this.g.world;
    if (name !== 'a3work') return undefined;
    const mk = (x, z) => ({ x, z, y: w.groundAt(x, z) + 2 });
    if (q.at('q_shore', 'trench')) return mk(...this.J(...DIGS[Math.min(1, this.count('q_shore'))]));
    if (q.at('q_shore', 'families')) { const d = JT.outer[Math.min(2, this.count('q_shore'))]; return mk(d.x, d.z); }
    if (q.at('q_ulf', 'boats')) { const i = this.nextBoat(); return i < 0 ? null : mk(JT.boats[i][0], JT.boats[i][1] + 3.4); }
    return null;
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (id === 'leif' && q.at('q_shore', 'leif')) { c.say('a3_ditch', n, () => q.notify('talk', 'leif')); return true; }
    if (PHASES[c.phase] && PHASES[c.phase].at === 'jarnoy') {
      if (id === 'torvald') { n.say(c.phase === 'jbattle' ? 'Hold. HOLD!' : 'Dig. A trench is worth ten men.', 3); return true; } // (game)
      if (id === 'astrid') { n.say('I know where they must pass.', 3); return true; } // (game)
      if (id === 'leif') { n.say('Seventeen sea battles.', 3); return true; }
    }
    return false;
  }

  // ---- what stands on the beach, by how far the story has come -------------------------------
  stages(phase) {
    const S = this.JT.stages, sh = this.at('q_shore'), begun = this.at('q_isle') >= 0, battle = phase === 'jdawn' || phase === 'jbattle';
    S.stakes.set(!begun || sh >= 1); S.ditch.set(begun && sh >= 3 && sh < 9); S.ditchOpen.set(!begun || sh >= 9);
    S.fleet.set(battle); S.boats.set(battle); S.sideShut.set(!(sh >= 9 && sh <= 99 && battle)); S.sideOpen.set(sh >= 9 && battle);
  }
  clear(phase) {
    const g = this.g;
    this.stages(phase);
    for (const n of [...this.foes, ...this.jarn, this.ulf, this.arne]) n.visible = false;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    for (const a of this.arrows) { a.m.visible = false; a.t = -1; }
    this.sk = null; this.rain = null; this.charge = null; this.duel = null; this.archers = null; this.ulfShip.visible = false; this.boatT = 0; this.saved = []; this.grjotOn = false; this.climbing = false; this.pyreOn = false; this.salute = null;
    if (phase !== 'jbattle' && phase !== 'jdawn' && g.combat.active && PHASES[phase] && PHASES[phase].at === 'jarnoy') g.combat.clear();
    this.c.act.glowTarget = phase === 'jbattle' ? 0.5 : phase === 'jnight' ? 0.4 : this.c.act.glowTarget;
    if (phase.startsWith('a3') || (PHASES[phase] && PHASES[phase].at === 'jarnoy' && phase !== 'jbattle' && phase !== 'jnight')) this.c.act.glowTarget = 0;
  }
  /** The defenders, where this hour of the battle has them (called after the island's own people are placed). */
  dress(name) {
    const g = this.g, c = this.c, I = c.isle, P = (id, s) => I.post(id, s), arm = (n, w = 'spear') => { n.h.hold('L', 'shield'); n.h.hold('R', w); return n; };
    const sh = this.at('q_shore'), lg = this.at('q_long'), ul = this.at('q_ulf');
    if (name === 'jprep') { // six days of preparation
      P('torvald', [176, 98, 1.6]).h.hold('R', 'maul'); P('brokk', [181, 70, 2]).h.hold('R', 'hammer');
      ['hauk', 'grjotgard', 'v0', 'v2', 'v3', 'v5', 'v7', 'v9'].forEach((id, i) => P(id, [181.4 - (i % 2) * 2.4, 74 + i * 6.6, [186, 74 + i * 6.6], 'hoe', 'hoe']));
      this.jarn.slice(0, 6).forEach((n, i) => P(n.id, [174 + (i % 2) * 3, 78 + i * 7, 1.6, i % 2 ? 'hammer' : 'chopping', i % 2 ? 'hammer' : 'woodaxe']));
    }
    if (name === 'jdawn') { // mustered in the town; Arne's archers on the wooded ridge to the north
      LINE.forEach((id, i) => arm(P(id, [158 + (i % 8) * 3, -14 + (i > 7 ? 4 : 0), 0, 'guard']), id === 'torvald' ? 'maul' : id === 'arvid' ? 'sword' : 'spear'));
      P('astrid', [172, -22, 0]).h.hold('L', 'bow'); P('leif', [176, -8, 0]).h.hold('R', 'seax'); P('ingrid', [...I.h(-3, 10.6), 1]); P('hroald', [...I.h(8, 6.4), 0.3]);
      this.jarn.slice(6).forEach((n, i) => P(n.id, [168 + i * 6, -24, 0]).h.hold('L', 'bow'));
      this.archers = RIDGE.map(([dx, dz], i) => { const n = this.foes[i], [x, z] = this.J(dx, dz); if (n.dead) n.revive(); n.visible = true; n.cb = null; n.name = "One of Arne's archers"; n.teleport(x, z, Math.PI); n.setLoop('aim'); n.h.hold('L', 'bow'); n.h.hold('R', null); n.talk = null; if (sh >= 7 || (sh === 6 && i < this.count('q_shore'))) n.die(true); return n; });
    }
    if (name !== 'jbattle') return;
    P('ingrid', [...I.h(-3, 10.6), 1]); P('hroald', [...I.h(8, 6.4), 0.3]);
    const line = (ids) => ids.forEach((id) => { const i = LINE.indexOf(id); arm(P(id, [178, 74 + i * 3.2, Math.PI / 2, 'guard']), id === 'torvald' ? 'maul' : id === 'arvid' ? 'sword' : 'spear'); });
    P('astrid', [171, 96, Math.PI / 2]).h.hold('L', 'bow'); this.jarn.slice(6).forEach((n, i) => P(n.id, [170, 86 + i * 20, Math.PI / 2]).h.hold('L', 'bow'));
    if (sh >= 7 && sh <= 9) { line(LINE); arm(P('leif', [178, 126, Math.PI / 2]), 'seax'); }
    else { // the wall holds under Torvald; ten have gone back with Eirik
      line(LINE.filter((id) => !TEN.includes(id)));
      if (sh >= 10 && sh < 99) TEN.forEach((id, i) => arm(P(id, [146 + i * 1.6, 30 + (i % 2) * 2, Math.PI]), id === 'leif' ? 'seax' : 'spear'));
      else { ['hauk', 'v0', 'v2', 'v3'].forEach((id, i) => arm(P(id, [144 + i * 3, 18, Math.PI]))); if (ul < 0) arm(P('leif', [156, 16, Math.PI]), 'seax'); c.npc('grjotgard').visible = false; }
    }
    this.burn(sh >= 9 || lg >= 0 || ul >= 0);
    if (lg >= 0 && lg < 99) this.onTower();
    if (ul >= 0 && ul < 3) this.harbor(ul);
  }
  /** Arne Longshot in the watchtower, shooting down into the battle. */
  onTower() { const tw = this.JT.tower, a = this.arne; if (a.cb) return; a.revive(); a.visible = true; a.mode = 'crew'; a.pos.set(tw.x, tw.y, tw.z - tw.half + 0.8); a.yaw = 0; a.root.rotation.y = 0; a.h.hold('L', 'bow'); a.h.hold('R', null); a.pose = 'aim'; }
  /** The granary alight, and two roofs in the town. */
  burn(on) {
    const g = this.g;
    if (!on || this.fires.length) return;
    for (const [dx, dz, s] of [[127, -51, 2.2], [130, -49, 2.6], [133, -47, 2.2], [148, -52, 1.8], [189, -54, 1.8]]) { const [x, z] = this.J(dx, dz); this.fires.push(g.fx.addFire(x, g.world.groundAt(x, z) + 3.4, z, s)); }
  }

  // ---- six days ------------------------------------------------------------------------------
  dig() {
    const g = this.g, c = this.c, i = this.count('q_shore'), [x, z] = this.J(...DIGS[Math.min(1, i)]);
    new Knack(g, { label: 'Dig the trench and set the stakes', verb: 'dig', cfg: A3.knack.trench, hold: 'hoe', sound: 'thud', at: [x - 1.2, z, Math.PI / 2], seed: i + 2,
      onDone: () => { if (i >= 1) { c.sub('They dig a trench across the beach and line it with sharpened stakes. Brokk and the Jarnøy smiths work day and night at the furnaces, making spearheads and arrowheads.', 9); g.after(0.1, () => this.stages(c.phase)); } g.quests.notify('event', 'a3trench'); } }).start();
  }
  fill() {
    const g = this.g, c = this.c, [x, z] = this.J(190.4, 116);
    new Knack(g, { label: "Shovel the town's midden into the ditch", verb: 'shovel', cfg: A3.knack.ditch, hold: 'hoe', sound: 'splash', bad: 'He gags', at: [x - 1.4, z, Math.PI / 2], seed: 8,
      onDone: () => { g.quests.notify('event', 'a3ditch'); this.stages(c.phase); c.sub('They cover it with a thin layer of sand and seaweed. Astrid places archers in the forest where she knows the attackers must pass.', 8); } }).start();
  }
  dawn() {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true;
    g.ui.fade(true, 1.2).then(() => g.ui.card('The Battle of Iron Shore', 'The enemy fleet appears at dawn: eleven longships out of the mist.', 6))
      .then(() => { c.setPhase('jdawn', true); p.teleport(...this.J(170, -9), 0); c.ensureArmed(); p.equip('father_axe'); return g.ui.fade(false, 1.2); })
      .then(() => { p.frozen = false; g.quests.notify('event', 'a3dawn'); });
  }

  // ---- arrows from the ridge -----------------------------------------------------------------------
  volley() {
    const g = this.g, c = this.c, p = g.player, R = A3.rain, live = this.archers ? this.archers.filter((n) => !n.dead).length : 5;
    if (!live) return;
    for (const a of this.arrows.slice(0, Math.round(R.arrows * live / 5))) { const tx = p.pos.x + (Math.random() - 0.5) * 22, tz = p.pos.z + (Math.random() - 0.5) * 16; a.t = -Math.random() * 0.35; a.to = [tx, g.world.groundAt(tx, tz) + 0.3, tz]; a.m.visible = true; }
    g.audio.play('whoosh'); g.audio.play('bow', { vol: 0.5 });
    g.after(0.55, () => {
      const under = p.blocking && p.hasShield();
      if (under) { g.audio.play('clack'); g.after(0.08, () => g.audio.play('clack', { vol: 0.6 })); }
      else if (g.mode === 'play' && !g.ravens.eye) { p.health = Math.max(p.mortal ? 0 : 1, p.health - R.dmg * (0.5 + live / 10)); p.h.play('stagger', 0.4); g.audio.play('hurt'); p.cam.shake = 0.2; if (p.health <= 0) g.events.emit('playerDied'); }
      else g.audio.play('clack', { vol: 0.5 });
      for (const id of LINE) { const n = c.npc(id); if (n.visible) n.h.play('blockhit', 0.4); }
      if (g.quests.at('q_shore', 'shields')) g.quests.notify('event', 'a3volley');
    });
  }
  callArcher(i) {
    const g = this.g, c = this.c, e = this.archers[i], a = c.npc('astrid');
    a.h.play('shoot', 0.8); g.audio.play('bow');
    g.after(0.7, () => { e.die(); g.audio.play('arrowHit', { vol: 0.6 }); if (i === 0 || this.archers.filter((n) => n.dead).length === 1) c.sub('He calls their positions to Astrid. Her archers start shooting back with deadly accuracy.', 6); g.quests.notify('event', 'a3archer'); });
  }

  // ---- the skirmish: pairs along a line, and the ones who come for Eirik ---------------------------------
  /** Take an attacker from the pool (never one still standing) and put him at a point. */
  foe(x, z) {
    const g = this.g, live = this.sk ? this.sk.live : [];
    const R = this.R, pool = R.pool || this.foes;
    const e = pool.find((n) => !n.visible) || pool.find((n) => n.dead && !live.includes(n) && this.t - (n.diedAt || 0) > 9) || pool.find((n) => n.dead && !live.includes(n));
    if (!e) return null;
    g.combat.enemies = g.combat.enemies.filter((n) => n !== e);
    e.revive(); e.visible = true; e.cb = null; e.name = "Håkon's man"; e.partner = null; e.mine = false; e.diedAt = 0; e.crouch = false; e.teleport(x, z, -Math.PI / 2); e.setLoop(null);
    const i = pool.indexOf(e); e.h.hold('R', ['axe', 'sword', 'spear', 'axe'][i % 4]); e.h.hold('L', i % 3 === 2 ? null : 'shield'); e.talk = null; e.raider = null;
    if (R.name) e.name = R.name; if (R.dress) R.dress(e, i);
    return e;
  }
  /** He has broken through: he comes for Eirik. */
  mine(e) { const g = this.g, R = this.R; e.mine = true; g.player.mortal = true; g.combat.add(e, { hp: R.hp, dmg: R.dmg, skill: R.skill, ...(R.opt || {}) }); }
  /** The numbers of the fight in hand: Act III's battle, unless a later act brought its own. */
  get R() { return (this.sk && this.sk.R) || A3.battle; }
  /** He is held by a defender (who strikes him when he closes), unless Eirik comes within reach. */
  pair(e, a) { const g = this.g, R = this.R; e.mine = false; a.busy = e; a.engaged = false; a.busyT = 0; g.combat.add(e, { hp: R.hp, dmg: R.dmg, skill: R.skill, duel: a, ...(R.opt || {}) }); }
  engage(a) {
    const R = this.R, e = a.busy;
    a.engaged = true;
    a.fight(e, { lethal: 0, dmg: R.allyDmg * (a.id === 'torvald' || a.id === 'arvid' ? 1.7 : 1), onWin: (x) => { x.busy = null; x.engaged = false; x.setLoop('guard'); if (x.home && this.sk) x.goTo(x.home[0], x.home[1], { onArrive: (y) => { y.yaw = x.home[2]; } }); } });
  }
  startSkirmish(allies, from, budget, atOnce, done, R = null) {
    const c = this.c;
    for (const id of allies) { const n = c.npc(id); n.busy = null; n.engaged = false; n.home = [n.pos.x, n.pos.z, n.yaw]; }
    this.sk = { allies: allies.map((id) => c.npc(id)), from, budget, atOnce, done, R, spawned: 0, live: [], t: 1.2, said: 0, T: 0 };
  }
  updateSkirmish(dt) {
    const g = this.g, k = this.sk;
    k.T += dt; k.t -= dt;
    for (const e of k.live) if (e.dead && !e.diedAt) e.diedAt = this.t;
    k.live = k.live.filter((e) => !e.dead && e.visible);
    for (const a of k.allies) if (a.busy) {
      const e = a.busy; a.busyT = (a.busyT || 0) + dt;
      if (e.dead || !e.visible) { if (!a.engaged) a.busy = null; }
      else if (!a.engaged && (a.dist(e) < 4.6 || a.busyT > 5)) this.engage(a);          // he closes, or the defender goes to meet him
      else if (a.busyT > 16 && a.dist(e) > 6 && e.cb) { e.cb.duel = null; e.mine = true; a.busy = null; a.engaged = false; a.stop(); a.setLoop('guard'); } // something is between them: he comes for Eirik instead
    }
    if (k.t <= 0 && k.spawned < k.budget) {
      k.t = 1.6 + Math.random() * 1.2;
      const [fx, fz] = k.from[k.spawned % k.from.length], mine = k.live.filter((e) => e.mine).length, free = k.allies.find((a) => a.visible && !a.dead && !a.busy);
      if (mine < k.atOnce && (k.spawned % 3 === 2 || !free)) { const e = this.foe(fx, fz + (Math.random() - 0.5) * 3); if (e) { this.mine(e); k.live.push(e); k.spawned++; } }
      else if (free) { const e = this.foe(fx, fz + (Math.random() - 0.5) * 3); if (e) { this.pair(e, free); k.live.push(e); k.spawned++; } }
    }
    if (k.spawned >= k.budget && !k.live.length) { const f = k.done; this.sk = null; g.combat.clear(); f(); }
  }

  // ---- the gate, the families, Grjotgard ---------------------------------------------------------------
  family() {
    const g = this.g, c = this.c, q = g.quests, i = this.count('q_shore'), d = this.JT.outer[Math.min(2, i)], [gx, gz] = this.JT.sideGate, T = c.sea.town;
    g.player.h.play('shove', 0.5); g.audio.play('clack');
    for (const [k, n] of [T[i], c.npc('kid' + i), c.npc('kid' + (i + 3))].entries()) { if (n.dead) n.revive(); n.visible = true; n.held = true; n.name = k ? 'A child' : 'A woman of Jarnøy'; n.teleport(d.x + k * 0.7, d.z + 0.4 * k, 0); n.setLoop(null); n.goPath([[gx + (k - 1), gz + 3], [gx + (k - 1), gz - 6]], { run: true, onArrive: (o) => { o.visible = false; } }); }
    if (i < 2) return q.notify('event', 'a3family');
    // the third house: Grjotgard is covering the street
    this.grjotOn = true;
    const gr = c.npc('grjotgard'), h = c.npc('hauk'), e = this.foe(d.x + 9, d.z + 5);
    gr.stop(); gr.teleport(d.x + 4, d.z + 2.4, Math.PI / 2); gr.setLoop('guard');
    if (e) { e.h.hold('R', 'spear'); e.goTo(gr.pos.x + 1.8, gr.pos.z, { run: true, onArrive: (o) => { o.h.play('thrust', 0.6); g.audio.play('hurt'); gr.h.play('fall', 1.0); gr.setLoop('lie'); gr.h.hold('R', null);
      g.after(0.7, () => { h.stop(); h.teleport(gr.pos.x - 0.9, gr.pos.z + 0.6, Math.PI / 2); h.setLoop('kneel'); o.die(); g.audio.play('thud'); });
      g.after(2.2, () => c.say('a3_grjot', gr, () => { gr.die(true); g.audio.setMusic('sorrow'); q.notify('event', 'a3family'); })); } }); }
    else c.say('a3_grjot', gr, () => { gr.die(true); q.notify('event', 'a3family'); });
  }

  // ---- the Longshot ------------------------------------------------------------------------------------------
  throughFire() {
    const g = this.g, c = this.c, p = g.player, tw = this.JT.tower, [x, z] = this.J(127.6, -44.6);
    this.climbing = true;
    new Knack(g, { label: 'Through the fire, his cloak over his head', verb: 'go', cfg: A3.knack.fire, anim: 'dodge', animDur: 0.6, sound: 'crackle', bad: 'The heat blisters his hands', at: [x, z, -2.6], seed: 4, onStop: () => { this.climbing = false; },
      onBad: () => { p.health = Math.max(15, p.health - 8); g.audio.play('hurt', { vol: 0.5 }); },
      onDone: () => c.fade(() => { p.teleport(tw.x, tw.z + tw.half - 0.6, Math.PI); c.sub('He climbs the beam with the heat blistering his hands. He reaches the ledge and comes in through the top hatch.', 6); }, 0.6, 0.8).then(() => g.quests.notify('event', 'a3fire')) }).start();
  }
  arneFight() {
    const g = this.g, c = this.c, p = g.player, a = this.arne, tw = this.JT.tower;
    a.mode = 'crew'; a.pose = 'aim'; a.yaw = 0; a.root.rotation.y = 0; p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    c.sub('Arne is waiting for him. He knew. He has strung tripwires across the floor and hung a net of fishhooks in the doorway.', 6);
    g.after(1.6, () => { // point-blank
      a.h.play('shoot', 0.7); g.audio.play('bow');
      g.after(0.35, () => {
        p.wardFlash(a.pos); c.sub("He shoots at Eirik at point-blank range. Stormguard flares and Eirik catches the arrow on his shield; the point punches through the wood a finger's length from his eye.", 8);
        a.pose = null; a.h.hold('L', null); a.h.hold('R', 'seax'); a.mode = 'idle';
        const moves = structuredClone(FOES.find((f) => f.id === 'arne').cb.moves);
        g.combat.add(a, { hp: A3.arne.hp, dmg: A3.arne.dmg, skill: 0.3, dodge: 0.5, boss: true, smart: true, keepDry: true, moves, onDown: (e) => this.arneFalls(e),
          phases: [{ at: 0.5, do: (e) => { e.say('The wolf said you could see what birds see.', 4); g.after(4.2, () => c.sub('Then he should have told you I could see you.', 4, 'Eirik')); } }] });
        for (const [dx, dz] of [[-1.3, 0.6], [1.4, -0.4], [0.2, 2.4]]) g.combat.trap(tw.x + dx, tw.z + dz, { kind: 'stakes', r: 0.8, sec: 9999, dmg: 5, arm: 1.5 }); // tripwires and fishhooks
        g.ui.questBanner('first of the seven · the watchtower, Jarnøy', 'Arne Longshot');
        g.after(8.5, () => c.sub('Arne drops the bow and pulls a seax and throwing knives. He fights like a cornered cat, slashing and darting away.', 6));
      });
    });
  }
  arneFalls(e) {
    const g = this.g, c = this.c, p = g.player, tw = this.JT.tower;
    for (const x of [...g.combat.alive()]) if (x !== e) g.combat.kill(x);
    g.combat.clear(); e.cb = null; e.mode = 'idle'; e.h.play('fall', 0.9); p.mortal = false; g.slowT = 0.8; g.audio.play('hurt');
    c.sub('Eirik corners him by the window. Arne goes for his last throwing knife. Eirik is faster. Raven-Feeder takes Arne Longshot in the chest, and the archer falls back through the window into the burning granary.', 9);
    g.after(1.3, () => { e.visible = false; g.audio.play('thud'); });
    g.after(9.2, () => g.ui.card('Arne Longshot', "The first of Håkon's seven champions is dead.", 5).then(() => c.fade(() => { p.teleport(tw.foot.x, tw.foot.z + 2, 0); p.equip('father_axe'); }, 0.8, 0.8))
      .then(() => { c.sub('Below, the attackers see Arne fall. Without his arrows, their attack loses its shape. The defenders begin pushing them back toward the beach.', 8); g.quests.notify('event', 'a3arne'); }));
  }

  // ---- Ulf Two-Blades, and the boats ----------------------------------------------------------------------------
  /** The harbour as Ulf's part of the battle finds it. step: 0 he is coming, 1 the duel, 2 the boats. */
  harbor(step) {
    const g = this.g, c = this.c, I = c.isle, JT = this.JT, u = this.ulf, [sx, sz] = this.J(283, -24);
    this.ulfShip.visible = true; this.ulfShip.position.set(sx, -0.15, sz); this.ulfShip.rotation.y = Math.PI / 2;
    const T = c.sea.town; this.people = JT.boats.map(([x, z], i) => [T[4 + (i % 4)], c.npc('kid' + i), c.npc('kid' + (i + 3))].map((n, k) => { if (n.dead) n.revive(); n.visible = !this.saved.includes(i); n.held = true; n.mode = 'crew'; n.name = k ? 'A child' : 'One of the old people'; n.pos.set(x - 1.4 + k * 1.4, 0.32, z); n.root.rotation.y = 0; n.pose = 'cower'; n.talk = null; return n; }));
    I.post('leif', [203, -27, [214, -24]]).h.hold('R', 'seax'); I.post('arvid', [201, -19.6, [214, -24]]).h.hold('R', 'sword');
    u.revive(); u.visible = true; u.cb = null; u.mode = 'idle'; u.talk = null; u.h.hold('R', 'sword'); u.h.hold('L', 'sword');
    if (step < 2) { u.teleport(...this.J(215, -23.6), -Math.PI / 2); u.setLoop('guard'); }
    else { u.mode = 'crew'; u.pos.set(sx - 5.4, this.ulfShip.userData.deckY - 0.15, sz); u.root.rotation.y = -Math.PI / 2; u.pose = null; for (const [x, z] of JT.boats) if (this.fires.length < 12) this.fires.push(g.fx.addFire(x, 0.9, z, 1.5)); }
  }
  startDuel() {
    const g = this.g, c = this.c, p = g.player, u = this.ulf, U = A3.ulf;
    if (this.duel) return;
    p.mortal = false; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    const moves = structuredClone(FOES.find((f) => f.id === 'ulf').cb.moves);
    g.combat.add(u, { hp: U.hp, dmg: U.dmg, skill: 0.7, dodge: 0.55, counter: true, boss: true, smart: true, training: true, keepDry: true, slow: 0.86, moves });
    this.duel = { t: 0, wards: 0, done: false };
    g.ui.questBanner('sixth of the seven · the harbor, Jarnøy', 'Ulf Two-Blades'); c.hint('ulf');
    c.sub('Ulf is a different kind of fighter from anyone Eirik has faced. He is fast, terrifyingly fast, attacking with both swords at once, changing direction mid-swing, laughing the whole time.', 9);
  }
  choose() {
    const g = this.g, c = this.c, u = this.ulf, JT = this.JT, [ex, ez] = this.J(264, -24);
    this.duel.done = true; c.hint(null);
    u.say('Getting tired, farmer?', 3.5);
    g.after(3.6, () => {
      g.combat.clear(); u.cb = null; u.mode = 'idle'; u.setLoop(null); u.h.play('cheer', 0.9); g.audio.play('shout'); g.audio.play('ignite');
      for (const [x, z] of JT.boats) this.fires.push(g.fx.addFire(x, 0.9, z, 1.5));
      c.sub('Then Ulf does something cold. He shouts an order, and his men throw torches into three fishing boats tied at the pier. The boats are full of women, children and old people who were hiding there to escape by sea.', 9);
      g.after(4.5, () => { u.say('Choose.', 3); u.goPath([this.J(232, -24), [ex, ez]], { speed: 2.4, onArrive: (o) => { o.mode = 'crew'; o.pos.set(this.ulfShip.position.x - 5.4, this.ulfShip.userData.deckY - 0.15, this.ulfShip.position.z); o.root.rotation.y = -Math.PI / 2; o.pose = null; } }); g.quests.notify('event', 'a3choose'); });
    });
  }
  nextBoat() { for (const i of [0, 1, 2]) if (!this.saved.includes(i) && i !== this.leifBoat) return i; return -1; }
  saveBoat(i) {
    const g = this.g, c = this.c, [x, z] = this.JT.boats[i];
    if (this.saved.includes(i)) return;
    this.saved.push(i);
    this.people[i].forEach((n, k) => { n.mode = 'idle'; n.teleport(x - 1.4 + k * 1.4, z + 4.6, 0); n.setLoop('cower'); });
    g.audio.play('splash'); g.fx.burst('splash', x, 0, z + 1.5, 12);
    g.quests.notify('event', 'a3boat');
  }
  pull(i) {
    const g = this.g, [x, z] = this.JT.boats[i];
    new Knack(g, { label: 'Cut the mooring line and pull them out', verb: 'pull', cfg: A3.knack.pull, anim: 'pickup', animDur: 0.7, sound: 'splash', bad: 'The fire drives him back', at: [x, z + 3.4, Math.PI], seed: i + 1,
      onBad: () => { g.player.health = Math.max(12, g.player.health - 6); }, onDone: () => this.saveBoat(i) }).start();
  }
  playSalute() {
    const g = this.g, c = this.c, p = g.player, s = this.ulfShip, u = this.ulf, y = s.userData.deckY - 0.15;
    if (g.activity) g.activity.finish(false);
    this.salute = { t: 0 }; p.frozen = true; u.mode = 'crew'; u.pose = null; u.h.play('cheer', 30);
    g.cine.play([{ dur: 8, from: () => [s.position.x - 14, 3.4, s.position.z - 9], look: () => [s.position.x - 5.4, y + 1.4, s.position.z], fov: 36, sub: ['Ulf Two-Blades', 'Next time, I will not run.', 6],
      onUpdate: (k, dt) => { s.position.x += dt * (1.2 + k * 3); u.pos.set(s.position.x - 5.4, y, s.position.z); u.root.rotation.y = -Math.PI / 2; } }],
    { skippable: false, onEnd: () => { this.salute = null; p.frozen = true;
      g.ui.fade(true, 1.4).then(() => g.ui.card('', "The battle is won. Håkon's survivors escape in five of their eleven ships. But the cost is terrible. Thirty-one of Jarnøy's fighters are dead and nine of Ravenhold's. The town is half burned.", 9))
        .then(() => { c.setPhase('jnight', true); p.teleport(...this.J(176, 78), 2.6); if (p.equipped !== 'none') p.equip('none'); return g.ui.fade(false, 1.4); }).then(() => { p.frozen = false; }); } });
  }

  // =====================================================================================
  steps = {
    'q_shore.trench'(r) { const c = this.c; c.setPhase('jprep', r); this.stages('jprep'); if (r && c.isle.away()) this.g.player.teleport(...this.J(170, 86), 0.3); if (!r) c.sub('Eirik and Torvald spend six days preparing.', 5); },
    'q_shore.leif'(r) { const c = this.c; c.setPhase('jprep', r); this.stages('jprep'); c.isle.post('leif', [186, 110, [190, 116]]); c.isle.post('ingrid', [187.6, 113, [186, 110]]); },
    'q_shore.ditch'(r) { this.c.setPhase('jprep', r); this.stages('jprep'); },
    'q_shore.dawn'(r) { const c = this.c; c.setPhase('jprep', r); this.stages('jprep'); if (!r) this.g.after(8.5, () => c.sub("Astrid's scouts report about two hundred, led by two champions: Arne Longshot, the archer, and Ulf Two-Blades, who has never been beaten in a duel.", 9)); },
    'q_shore.shields'(r) {
      const g = this.g, c = this.c;
      c.setPhase('jdawn', r); g.player.mortal = true; c.ensureArmed(); if (g.player.equipped !== 'father_axe') g.player.equip('father_axe');
      this.rain = { t: 3.2, warned: false }; c.hint('shieldsUp');
      if (!r) c.sub("First Arne's archers land on the wooded headland and start shooting down into the town from the ridge. Arrows fall like rain.", 7);
    },
    'q_shore.eye'(r) { const c = this.c; c.setPhase('jdawn', r); this.rain = { t: 6, warned: false }; c.hint('ravenRidge'); if (!r) c.sub('Eirik closes his eyes and sends {w} over the ridge.', 5); },
    'q_shore.archers'(r) { const c = this.c; c.setPhase('jdawn', r); this.rain = this.rain || { t: 6, warned: false }; c.hint('ravenRidge'); },
    'q_shore.beach'(r) { const g = this.g, c = this.c; this.rain = null; if (r) c.setPhase('jbattle', r); else { c.hint(null); c.sub("Then Ulf's warriors charge across the beach.", 5); g.after(1.5, () => c.fade(() => { c.setPhase('jbattle', true); g.player.teleport(...this.J(172, 60), 2.8); }, 0.8, 0.8)); } },
    'q_shore.wall'(r) {
      const g = this.g, c = this.c;
      c.setPhase('jbattle', r); c.ensureArmed(); if (g.player.equipped !== 'father_axe') g.player.equip('father_axe'); g.player.mortal = true;
      if (r) g.player.teleport(...this.J(176, 100), Math.PI / 2);
      this.charge = { t: 0, men: SHIPS.flatMap(([dx, dz], i) => [0, 1].map((k) => { const e = this.foe(...this.J(dx - k * 2, dz + k * 1.6)); e.goTo(...this.J(193.4, 108 + i * 6 + k * 3), { run: true }); return e; })), in: 0, said: 0 };
      g.ui.questBanner('The Battle of Iron Shore', 'the charge across the beach'); c.hint('wallHold');
    },
    'q_shore.gate'(r) {
      const g = this.g, c = this.c;
      c.setPhase('jbattle', r); this.stages('jbattle'); this.burn(true); g.player.mortal = true; c.hint(null); g.combat.clear();
      if (r) g.player.teleport(...this.J(174, 60), 0);
      for (const id of TEN) { const n = c.npc(id); if (r) n.teleport(g.player.pos.x + 2 + Math.random() * 3, g.player.pos.z + 2 + Math.random() * 3, 0); n.setLoop(null); n.follow(g.player, { dist: 2.6 + Math.random() * 2 }); }
      if (!r) c.tell(['Then a Jarnøy man, a fisherman whose wife and children live outside the wall, hears screams from the outer houses, panics and opens the side gate to go to them. Enemy warriors pour through.',
        'Eirik has to choose: hold the shield wall at the beach, or go back and plug the gate and get the families out of the outer houses.', 'He leaves Torvald in command of the wall and takes ten men to the gate.'], 7.5);
    },
    'q_shore.hold'(r) {
      const g = this.g, c = this.c, G = A3.battle.gate;
      c.setPhase('jbattle', r); this.burn(true); g.player.mortal = true; if (g.player.equipped !== 'father_axe') g.player.equip('father_axe');
      if (r) g.player.teleport(...this.J(150, 29), Math.PI);
      TEN.forEach((id, i) => { const n = c.npc(id), p = g.player; if (n.dist(p) > 12) n.teleport(p.pos.x - Math.sin(p.yaw) * (6 + i) + (i % 2 ? 2 : -2), p.pos.z - Math.cos(p.yaw) * (6 + i), p.yaw); n.stop(); n.setLoop('guard'); }); // the ten come up behind him
      this.startSkirmish(TEN, [this.J(156, 40), this.J(134, 36)], G.n, G.atOnce, () => { c.npc('hauk').say('They are running!', 3); g.quests.notify('event', 'a3held'); });
      g.ui.questBanner('The side gate', 'hold it');
    },
    'q_shore.families'(r) { const g = this.g, c = this.c; c.setPhase('jbattle', r); this.burn(true); if (r) g.player.teleport(...this.J(150, 31), Math.PI); c.npc('grjotgard').setLoop('guard'); if (!r) c.sub('They hold it, but it costs them. Now the families in the outer houses.', 5); },
    'q_long.eye'(r) {
      const g = this.g, c = this.c;
      c.setPhase('jbattle', r); this.burn(true); this.onTower(); c.hint('eyeUp'); if (r) g.player.teleport(...this.J(150, 14), 0);
      if (!r) g.after(1.5, () => c.tell(["Arne Longshot has climbed into the town's stone watchtower. From there he can see and shoot anywhere in the battle. Every few breaths, another defender falls with one of his black-feathered arrows in him.",
        "Astrid tries to shoot him, but the tower's narrow window protects him; she hits the stone a hand's width from his face, twice. Eirik sends {w} circling the tower."], 8.5));
    },
    'q_long.way'(r) { const c = this.c; c.setPhase('jbattle', r); this.burn(true); this.onTower(); c.hint('Fly to the watchtower at the north-west corner of the town. Press {interact} when she sees a way up.'); },
    'q_long.fire'(r) { const g = this.g, c = this.c; c.setPhase('jbattle', r); this.burn(true); this.onTower(); c.hint(null); if (r) g.player.teleport(...this.J(134, -38), -2.4); },
    'q_long.arne'(r) { const g = this.g, c = this.c, tw = this.JT.tower; c.setPhase('jbattle', r); this.burn(true); this.onTower(); if (r) g.player.teleport(tw.x, tw.z + tw.half - 0.6, Math.PI); this.arneFight(); },
    'q_ulf.harbor'(r) { const g = this.g, c = this.c, tw = this.JT.tower; c.setPhase('jbattle', r); this.burn(true); this.harbor(0); if (r) g.player.teleport(tw.foot.x, tw.foot.z + 2, 0); if (!r) g.after(8.4, () => c.sub('Eirik finds Ulf Two-Blades near the harbor, cutting his way toward the iron stores.', 6)); },
    'q_ulf.duel'(r) { const g = this.g, c = this.c; c.setPhase('jbattle', r); this.burn(true); this.harbor(1); if (r) g.player.teleport(...this.J(207, -24), Math.PI / 2); this.startDuel(); },
    'q_ulf.boats'(r) {
      const g = this.g, c = this.c;
      c.setPhase('jbattle', r); this.burn(true); g.combat.clear(); g.player.mortal = false; this.boatT = A3.boats.secs; this.leifBoat = 2; this.leifT = A3.boats.leif;
      if (r) { g.player.teleport(...this.J(224, -24), Math.PI / 2); this.saved = []; this.harbor(2); const n = this.count('q_ulf'); for (let i = 0; i < n; i++) { const b = i === 0 ? 2 : i - 1; if (!this.saved.includes(b)) { this.saved.push(b); this.people[b].forEach((p, k) => { p.mode = 'idle'; p.teleport(this.JT.boats[b][0] - 1.4 + k * 1.4, this.JT.boats[b][1] + 4.6, 0); p.setLoop('cower'); }); } } }
      const l = c.npc('leif'), [lx, lz] = this.JT.boats[2]; l.setLoop(null); l.goTo(lx, lz + 3.6, { run: true });
      if (!r) c.sub('Eirik chooses the boats. He and Leif cut the mooring lines and pull people out of the burning hulls and into the water.', 7);
    },
    'q_ulf.pyres'(r) {
      const g = this.g, c = this.c, I = c.isle;
      if (!r) { c.hint(null); c.sub('They get everyone out.', 3); return g.after(2.5, () => this.playSalute()); }
      c.setPhase('jnight', r);
    },
  };
  /** The beach at night: the pyres, and everyone who is left. */
  night() {
    const g = this.g, c = this.c, I = c.isle, JT = this.JT;
    for (const [x, z] of JT.pyres) this.fires.push(g.fx.addFire(x, g.world.groundAt(x, z) + 1.3, z, 1.9));
    I.post('hroald', [172.4, 100, [166, 100]]); I.post('arvid', [170.6, 101.6, [172.4, 100]]).h.hold('R', null); I.post('ingrid', [173.6, 96.6, [166, 100]]);
    ['torvald', 'astrid', 'leif', 'brokk', 'hauk', 'v0', 'v2', 'v3', 'v5', 'v7', 'v9', 'j0', 'j1', 'j2', 'j3'].forEach((id, i) => { const a = 0.4 + i * 0.36; I.post(id, [165 + Math.cos(a) * 14, 102 + Math.sin(a) * 22, [165, 102], i % 4 === 3 ? 'mourn' : null]); });
  }

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player;
    this.t += dt;
    for (const a of this.arrows) if (a.m.visible) { // arrows fall like rain
      a.t += dt; const k = Math.min(1, Math.max(0, a.t) / 0.5);
      a.m.position.set(a.to[0], a.to[1] + (1 - k) * 22, a.to[2] - (1 - k) * 12); a.m.rotation.set(-0.5, 0, 0);
      if (a.t > 7) a.m.visible = false;
    }
    if (this.arne.visible && this.arne.mode === 'crew') { this.arne.h.setLoop(this.arne.pose || null); this.arne.h.setLocomotion(0, false); this.arne.h.update(dt); }
    if (this.ulf.visible && this.ulf.mode === 'crew') { this.ulf.h.setLoop(this.ulf.pose || null); this.ulf.h.setLocomotion(0, false); this.ulf.h.update(dt); }
    if (this.people && c.phase === 'jbattle') for (const grp of this.people) for (const n of grp) if (n.visible && n.mode === 'crew') { n.h.setLoop('cower'); n.h.update(dt); }
    if (c.phase === 'jnight' && !this.fires.length) this.night();
    if (!PHASES[c.phase] || PHASES[c.phase].at !== 'jarnoy' || g.mode === 'cutscene') return;
    const R = this.rain;
    if (R && this.archers && g.mode === 'play' && !g.ravens.eye) { // the next volley
      R.t -= dt;
      if (R.t < A3.rain.warn && !R.warned) { R.warned = true; g.ui.alert(true); c.npc('astrid').say('Shields up!', 1.4); }
      if (R.t <= 0) { R.t = A3.rain.every * (q.at('q_shore', 'shields') ? 1 : 1.5); R.warned = false; this.volley(); }
    }
    const ch = this.charge;
    if (ch) { // the front rank hits the Stinking Ditch
      ch.t += dt; const [dx, dz] = this.JT.ditch;
      for (const e of ch.men) if (!e.inDitch && Math.abs(e.pos.x - dx) < 2.4 && Math.abs(e.pos.z - dz) < 12.5) { e.inDitch = true; e.stop(); e.setLoop('kneel'); e.h.play('stagger', 0.8); g.audio.play('splash'); ch.in++; if (ch.in === 1) { this.JT.stages.ditch.set(false); this.JT.stages.ditchOpen.set(true); } }
      if (ch.in >= 2 && ch.said === 0) { ch.said = 1; ch.t = 0; c.tell(['The front rank hits the Stinking Ditch. The sand gives way and a dozen men go in up to their waists. The smell rolls across the battlefield like a wall. Men retch. Some stop fighting entirely to be sick.',
        'One warrior climbs out, sees what he is covered in, and simply runs back to his ship. The defenders cheer. For about a minute, it is the funniest thing anyone has ever seen.'], 7.5); for (const id of LINE) c.npc(id).h.play('cheer', 1.2); }
      if (ch.said === 1 && ch.t > 7.5) { ch.said = 2; const e = ch.men.find((x) => x.inDitch); if (e) { e.setLoop(null); e.goTo(...this.J(212, 110), { run: true, onArrive: (o) => { o.visible = false; } }); } }
      if ((ch.said === 2 && ch.t > 15) || ch.t > 40) { // then the rest come over the stakes and the real fighting begins
        this.charge = null; c.sub('Then the rest come over the stakes and the real fighting begins.', 5);
        const W = A3.battle.wall; this.startSkirmish(LINE, SHIPS.map(([x, z]) => this.J(x - 12, z)), W.budget, W.atOnce, () => q.notify('event', 'a3wall'));
        for (const e of ch.men) { e.inDitch = false; if (!e.visible || e.dead) continue; e.setLoop(null); const free = this.sk.allies.find((a) => !a.busy); if (free) this.pair(e, free); else this.mine(e); this.sk.live.push(e); this.sk.spawned++; } // the ones who climbed out
      }
    }
    const k = this.sk;
    if (k) {
      this.updateSkirmish(dt);
      if (this.sk && q.at('q_shore', 'wall')) { if (k.said === 0 && k.T > 14) { k.said = 1; c.sub('It is chaos and noise. The shield walls crash together. Torvald holds the center with his hammer, steady as a rock. Arvid fights like a madman to prove his father wrong.', 9); }
        if (k.said === 1 && k.T > 38) { k.said = 2; this.burn(true); c.sub('A granary catches fire and the smoke covers everything.', 6); } }
    }
    if (q.at('q_ulf', 'harbor') && this.ulf.visible) this.ulf.h.setLoop('guard');
    const d = this.duel;
    if (d && !d.done && q.at('q_ulf', 'duel')) { // he cannot be beaten here; the Stormguard saves Eirik twice
      d.t += dt; const u = this.ulf, U = A3.ulf;
      if (p.health < 34 && d.wards < U.wards) { p.ward = 100; p.fury = 0; }
      if (d.wards >= U.wards || d.t > U.secs || (u.cb && u.cb.hp < u.cb.maxHp * U.hpAt)) this.choose();
    }
    if (q.at('q_ulf', 'boats') && g.mode === 'play') {
      this.boatT -= dt; this.leifT -= dt;
      if (this.leifT <= 0 && !this.saved.includes(this.leifBoat)) this.saveBoat(this.leifBoat);
      const n = Math.ceil(this.boatT); if (n !== this.boatShown) { this.boatShown = n; g.ui.hint(`The boats are burning. Cut the lines and pull them out.  ${Math.max(0, n)}`); }
      if (this.boatT <= 0) c.fail('The Boats', 'The boats burned to the waterline, with everyone in them.');
    }
    if (q.at('q_ulf', 'pyres') && c.phase === 'jnight' && !this.pyreOn && g.mode === 'play' && Math.hypot(p.pos.x - this.J(168, 100)[0], p.pos.z - this.J(168, 100)[1]) < 9) { this.pyreOn = true; c.say('a3_pyres', c.npc('hroald'), () => q.notify('event', 'a3pyres')); }
  }
}
