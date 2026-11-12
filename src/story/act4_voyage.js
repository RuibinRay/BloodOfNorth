// Act IV at sea, on the deck of the Sea-Raven beside the treasure ship: the days aboard of "The Golden Voyage", all of
// "Wolves on the Water" (three longships out of the fog, the boarding, Rurik Shieldsplitter), "The Iron Circle" (the
// sealed chest, and what only the white raven sees) and the masthead of "Six Islands Burning".
// The ships do not sail: the two decks stand in open water, and Leif's seamanship is told. See act4_home.js.
import * as THREE from 'three';
import { cone, at } from '../world/geo.js';
import { makeShip } from '../world/props.js';
import { AT_SEA } from '../world/layout.js';
import { dampAngle } from '../core/util.js';
import { A4, CAST4 } from '../data/act4.js';
import { FOES } from './champions.js';
import { Knack } from '../systems/activities2.js';
import { A4Part, TEN } from './act4_home.js';

const SEA = ['a4sea', 'a4seaeve', 'a4fog', 'a4seanight', 'a4home', 'a4homenight', 'a4smoke'];
const LS = [[-72, -96], [66, -112], [-48, 124]];                      // where the three longships wait in the fog
const ROUND = [[-6.3, 0.4, 0], [27.4, -4, 0.25], [6, 31, 1.8]];       // alongside the Sea-Raven, off the knarr, across the bows
const SEATS = [[-1.6, 1.3], [1.6, 1.3], [-1.6, 3.2], [1.6, 5.0], [-1.0, 6.4], [0.8, 6.9]]; // where the ten sit on the rowing benches
const IDLE = { leif: 'Read the swell.', ari: 'It shows where the sun is, through cloud!', gisli: 'By the fourth day everyone has lice.', ingrid: 'Hands. In seawater. Before eating.', solcap: 'The most valuable cargo Solvik has ever sent.', astrid: '...' }; // (game: from the story's sentences)

export class A4Voyage extends A4Part {
  constructor(game, core) { super(game, core); this.ls = []; this.fires = []; }
  get SS() { return this.g.world.main.sea; }
  /** A point by offset from the Sea-Raven's mast (+x east, where the knarr lies; +z south, her bow). */
  S(dx, dz) { return [AT_SEA.x + dx, AT_SEA.z + dz]; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, SS = this.SS;
    { const n = g.addNPC('solcap', CAST4.solcap); n.visible = false; n.talk = () => c.talkTo('solcap'); }
    this.rurik = g.addNPC('rurik', { name: 'Rurik Shieldsplitter', look: FOES.find((f) => f.id === 'rurik').look }); this.rurik.visible = false;
    for (let i = 0; i < 3; i++) { const m = makeShip({ L: 21, B: 4.4, seed: 101 + i * 7, sail: true }); m.visible = false; g.scene.add(m); this.ls.push({ m, to: null }); }
    this.cook = g.fx.addFire(SS.fire.x, SS.fire.y, SS.fire.z, 0.35, { on: false });
    this.smokes = [[-420, -260], [380, -330], [520, 120], [-300, 380], [140, 470], [-560, 60]].map(([dx, dz]) => { // smoke on every horizon
      const sm = new THREE.Mesh(at(cone(30, 190, 9, 1, true), 0, 95, 0, Math.PI, 0, 0), new THREE.MeshBasicMaterial({ color: 0x4a4644, transparent: true, opacity: 0.5, fog: false, depthWrite: false, side: THREE.DoubleSide }));
      const [x, z] = this.S(dx, dz); sm.position.set(x, 0, z); sm.visible = false; g.scene.add(sm); return sm; });
    const I = (id, pos, label, enabled, use) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 2.3, priority: 3, label, enabled, use });
    I('a4chest', SS.chest, 'Open the sealed chest', () => q.at('q_circle', 'chest') && !this.reading, () => this.letters());
    I('a4sleep', this.S(0.4, -4.4), 'Sleep', () => q.at('q_circle', 'sleep') && !this.sleeping, () => this.sleep());
    I('a4mast', this.S(0.3, 1.0), 'Call up to Astrid at the masthead', () => q.at('q_six', 'smoke') && c.phase === 'a4smoke', () => c.say('a4_smoke', null, () => q.notify('talk', 'astrid')));
    LS.forEach((_, i) => g.ravens.addMarkable({ id: 'a4ls' + i, pos: () => ({ x: this.ls[i].m.position.x, z: this.ls[i].m.position.z }), r: 62, label: 'a longship in the fog, closing', enabled: () => q.at('q_water', 'ships') && c.phase === 'a4fog',
      onMark: () => { if (!this.count('q_water')) c.sub('Three longships are closing from two directions.', 5); q.notify('event', 'a4longship'); } }));
  }
  clear(phase) {
    const g = this.g, c = this.c, on = SEA.includes(phase);
    this.SS.set(on);
    c.npc('solcap').visible = false; this.rurik.visible = false; this.rurik.cb = null;
    for (const s of this.ls) { s.m.visible = false; s.to = null; }
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    for (const sm of this.smokes) sm.visible = phase === 'a4smoke';
    this.duel = null; this.reading = false; this.sleeping = false; this.bg = null; this.offerOn = false; this.dicing = false; this.far = null; this.wantBoard = false;
    this.cook.on = on && (phase.endsWith('night') || phase === 'a4seaeve');
    if (on && phase !== 'a4fog' && g.combat.active) g.combat.clear();
  }
  /** Put Eirik on the Sea-Raven's deck. */
  aboard() { const p = this.g.player; p.teleport(...this.S(0.3, 2.6), Math.PI); }
  /** Who is where on the two decks. */
  dress(name) {
    const c = this.c, w = this.at('q_water');
    const P = (id, dx, dz, face, loop, hold) => { const n = this.put(id, ...this.S(dx, dz), typeof face === 'number' ? face : face ? this.S(face[0], face[1]) : undefined, loop, hold); n.keepDry = true; return n; };
    P('leif', 1.2, -6.6, 0); P('gisli', -1.8, -0.7, -Math.PI / 2); P('ingrid', -0.4, -3.0, [-1.3, -3.4]); P('astrid', 1.5, -1.4, 0.4).h.hold('L', 'bow'); P('ari', -0.6, -5.8, [1.2, -6.6]);
    P('torvald', 0.1, 4.5, 2.6).h.hold('R', 'maul');
    SEATS.forEach(([dx, dz], i) => P(TEN[i], dx, dz, dx > 0 ? -Math.PI / 2 : Math.PI / 2, name.endsWith('night') ? 'lie' : 'sit'));
    P('solcap', 13, -7.2, 0);
    c.battle.jarn.slice(0, 6).forEach((n, i) => { n.name = 'A guard of Solvik'; const m = this.put(n, ...this.S(10.8 + (i % 2) * 4.4, -5 + Math.floor(i / 2) * 4.6), i % 2 ? Math.PI / 2 : -Math.PI / 2, 'guard', 'spear'); m.h.hold('L', 'shield'); m.keepDry = true; m.talk = () => m.say('Forty of us, and I would still rather be ashore.', 3); }); // (game)
    if (name === 'a4seaeve') { P('leif', 0.4, -6.4, [1.2, -5.6], 'sit'); P('ingrid', -1.2, -4.2, [1.2, -5.6]); P('gisli', 1.9, -4.4, [1.2, -5.6], 'sit'); }
    if (name === 'a4fog') {
      const far = w <= 1 && w >= 0;
      this.ls.forEach((s, i) => { const [x, z] = this.S(...(far ? LS[i] : ROUND[i])); s.m.visible = true; s.m.position.set(x, -0.15, z); s.m.rotation.y = far ? Math.atan2(AT_SEA.x - x, AT_SEA.z - z) : ROUND[i][2]; s.to = null; });
      const r = this.fix(this.rurik, 0, 0, 0, 0, 'guard'); r.revive(); r.mode = 'crew'; r.h.hold('R', 'sword'); r.h.hold('L', 'halfshield'); this.prow();
      if (w >= 3) this.arm();
    }
    if (name === 'a4seanight') { P('torvald', -1.8, -0.7, -Math.PI / 2).h.hold('R', null); P('gisli', 0.5, -1.7, 0.6, 'lie'); P('astrid', -1.6, -5.0, 1.2, 'sit').h.hold('L', 'bow'); }
    if (name === 'a4home') P('torvald', 0.5, 5.9, [-0.9, 5.4]).h.hold('R', null);
    if (name === 'a4smoke') this.mast();
  }
  /** Astrid at the masthead. */
  mast() { const a = this.c.npc('astrid'); this.fix(a, AT_SEA.x + 0.05, this.SS.sr.y + 7.4, AT_SEA.z + 0.36, -Math.PI / 2, 'aim'); a.h.hold('L', 'bow'); a.talk = () => this.c.talkTo('astrid'); }
  /** Rurik stands on the prow of the lead ship. */
  prow() { const s = this.ls[0].m, y = s.rotation.y, r = this.rurik; r.pos.set(s.position.x + Math.sin(y) * 7.4, -0.15 + s.userData.deckY + 0.5, s.position.z + Math.cos(y) * 7.4); r.yaw = Math.atan2(AT_SEA.x - r.pos.x, AT_SEA.z - r.pos.z); r.root.rotation.y = r.yaw; }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!SEA.includes(c.phase)) return false;
    if (id === 'leif' && q.at('q_gold', 'sun')) { c.say('a4_sun', n, () => this.sunstone()); return true; }
    if (id === 'gisli' && q.at('q_gold', 'belt')) { c.say('a4_belt', n, () => q.notify('talk', 'gisli')); return true; }
    if (id === 'ingrid' && q.at('q_gold', 'wash')) { c.say('a4_wash', n, () => this.wash()); return true; }
    if (id === 'leif' && q.at('q_gold', 'dice')) { this.dice(n); return true; }
    if (id === 'torvald' && q.at('q_water', 'torvald')) { c.say('a4_night', n, () => q.notify('talk', 'torvald')); return true; }
    if (id === 'astrid' && q.at('q_six', 'smoke')) { c.say('a4_smoke', n, () => q.notify('talk', 'astrid')); return true; }
    if (IDLE[id]) { n.say(IDLE[id], 3.2); return true; }
    if (/^v\d/.test(id)) { n.say('The salted herring is green at the edges.', 3.2); return true; }
    return false;
  }
  cues = {
    belt() { const gi = this.c.npc('gisli'); gi.h.play('pickup', 1.2); this.g.audio.play('splash', { vol: 0.3 }); },
    cup() { this.c.npc('ingrid').h.play('pickup', 0.9); this.g.audio.play('splash', { vol: 0.4 }); },
    order() { this.g.audio.play('horn', { freq: 96, vol: 0.5 }); this.rurik.h.play('cheer', 0.9); },
  };

  // ---- the days aboard (Chapter 1) -----------------------------------------------------------
  sunstone() {
    const g = this.g, c = this.c;
    c.hint('sunstone');
    new Knack(g, { label: 'Turn the sunstone until it shows where the sun is', verb: 'hold it there', cfg: A4.knack.sun, anim: null, sound: 'chime', bad: 'Only cloud', seed: 3,
      onStop: () => c.hint(null), onDone: () => { c.hint(null); c.npc('ari').h.play('cheer', 1.0); g.quests.notify('talk', 'leif'); } }).start();
  }
  wash() {
    const g = this.g, p = g.player, [tx, tz] = this.SS.tub;
    p.frozen = true; p.teleport(tx + 0.9, tz + 0.25, Math.atan2(-0.9, -0.25)); g.audio.play('splash', { vol: 0.5 });
    p.h.play('pickup', 1.0, { onEnd: () => { p.frozen = false; g.quests.notify('talk', 'ingrid'); } });
  }
  dice(l) {
    const g = this.g, c = this.c, [dx, dz] = this.SS.dice;
    if (this.dicing) return;
    this.dicing = true;
    c.say('a4_dice', l, () => new Knack(g, { label: 'Throw the dice against Leif', verb: 'throw', cfg: A4.knack.dice, anim: 'pickup', animDur: 0.6, sound: 'clack', bad: 'The dice skitter off the barrel', at: [dx - 0.95, dz + 0.1, Math.PI / 2], seed: 5,
      onGood: (k) => { g.ui.toast(['Leif wins.', 'Leif wins again.', 'Leif wins. Every game.'][k - 1] || 'Leif wins.'); l.h.play('cheer', 0.7); }, onStop: () => { this.dicing = false; },
      onDone: () => { const i = c.npc('ingrid'); i.teleport(dx - 0.2, dz + 1.1, Math.PI); c.say('a4_dice2', i, () => { this.dicing = false; g.quests.notify('event', 'a4dice'); }); } }).start());
  }

  // ---- three longships out of the fog (Chapter 2) ---------------------------------------------------
  surround(now) {
    this.ls.forEach((s, i) => { const [x, z] = this.S(ROUND[i][0], ROUND[i][1]); s.m.visible = true; s.to = [x, z, ROUND[i][2]]; if (now) { s.m.position.set(x, -0.15, z); s.m.rotation.y = ROUND[i][2]; s.to = null; } });
  }
  /** Everyone to their place for the fight. */
  arm() {
    const c = this.c;
    TEN.forEach((id, i) => { const n = this.put(id, ...this.S(0.9 + (i % 2) * 0.6, -5.2 + i * 2.0), -Math.PI / 2, 'guard', 'spear'); n.h.hold('L', 'shield'); n.keepDry = true; });
    this.put('torvald', ...this.S(13.6, 1.6), Math.PI / 2, 'guard', 'maul').keepDry = true; this.put('ingrid', ...this.S(11.6, -2.6), 0.6, 'carry').keepDry = true; this.put('ari', ...this.S(13.2, 5.2), 2.4, 'carry').keepDry = true;
    this.mast(); c.npc('astrid').talk = null;
  }
  boarding() {
    const g = this.g, c = this.c, p = g.player, R = A4.board, P = c.raid.pool, J = c.battle.jarn;
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    c.battle.startSkirmish(TEN, [this.S(-1.6, -4.6), this.S(-1.6, 0.9), this.S(-1.6, 5)], R.n, R.atOnce, () => g.quests.notify('event', 'a4held'), R);
    this.bg = { t: 0, said: 0, shot: 3 };
    g.ui.questBanner('Wolves on the Water', 'grappling hooks'); c.hint('deckHold');
    // Torvald holds the knarr's side against a boarding party (seen, not played)
    this.far = [0, 1].map((i) => { const e = this.put(P[i], ...this.S(15.4, 1.2 + i * 3.2), -Math.PI / 2, 'guard', i ? 'axe' : 'sword'); e.name = "Rurik's man"; e.h.hold('L', 'shield'); e.talk = null; e.keepDry = true; return e; });
    const t = c.npc('torvald'); t.fight(this.far[0], { lethal: 0 }); this.far[0].fight(t, { lethal: 0 }); J[3].fight(this.far[1], { lethal: 0 }); this.far[1].fight(J[3], { lethal: 0 });
  }
  duelStart() {
    const g = this.g, c = this.c, p = g.player, r = this.rurik, def = FOES.find((f) => f.id === 'rurik'), R = A4.rurik, B = c.battle;
    if (this.duel) return;
    g.combat.clear(); B.sk = null; this.bg = null;
    for (const e of B.foes) e.visible = false;
    for (const n of [...(this.far || []), c.npc('torvald'), B.jarn[3]]) { n.stop(); n.setLoop('guard'); n.face(p.pos.x, p.pos.z); } // his men stop fighting to watch. So do Eirik's
    [[-1.2, -6.2], [-0.3, -7.1], [-0.9, 6.2], [0, 7.0], [0.9, 6.2], [1.7, -5.0]].forEach(([dx, dz], i) => { const n = this.put(TEN[i], ...this.S(dx, dz), this.S(0, 0), 'guard', 'spear'); n.h.hold('L', 'shield'); n.keepDry = true; });
    this.put(r, ...this.S(-1.5, 0.8), Math.PI / 2); r.h.hold('R', 'sword'); r.h.hold('L', 'halfshield'); r.keepDry = true; r.talk = null;
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    g.combat.add(r, { ...structuredClone(def.cb), hp: R.hp, dmg: R.dmg, boss: true, smart: true, keepDry: true, onDown: (e) => this.rurikFalls(e),
      phases: [{ at: R.talkAt, do: () => c.say('a4_shield', null) }, { at: R.slipAt, do: (e) => this.slip(e) }] });
    this.duel = { t: 0 };
    g.ui.questBanner('second of the seven · the deck of the Sea-Raven', 'Rurik Shieldsplitter'); c.hint('rurik');
    c.tell(["Then Rurik boards the Sea-Raven himself and challenges Eirik to single combat. His men stop fighting to watch. So do Eirik's.",
      'Rurik is the best pure swordsman Eirik has ever faced: calm, precise, never wasting a move. His shield is everywhere. They fight across the narrow deck, between the rowing benches, back and forth.'], 8);
  }
  /** He will not strike when Eirik slips on a wet oar, and waits for him to stand. */
  slip(e) {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true; g.audio.play('thud'); p.h.play('fall', 0.9, { onEnd: () => { p.loopOverride = 'dead'; } });
    c.sub("The duel lasts a long time. In the end, Rurik's honor is what beats him: he will not strike when Eirik slips on a wet oar, and waits for him to stand.", 9);
    g.after(1.4, () => e.say('Stand up. I will wait.', 3));
    g.after(4.4, () => { p.loopOverride = null; p.frozen = false; if (e.cb) e.cb.openT = 2.2; });
  }
  rurikFalls(e) {
    const g = this.g, c = this.c, p = g.player, [mx, mz] = this.S(-0.1, -0.75);
    g.combat.clear(); e.cb = null; e.mode = 'idle'; p.mortal = false; g.slowT = 0.8; g.audio.play('hurt'); c.hint(null);
    e.h.hold('L', null); e.h.play('stagger', 0.9);
    c.sub('Eirik does not make the same choice. When Rurik overextends, Raven-Feeder bites through his shield arm and then his mail.', 7);
    g.after(2.4, () => this.fix(e, mx, this.SS.sr.y, mz, Math.PI, 'sit'));
    g.after(7.4, () => c.say('a4_rurik', null, () => {
      e.mode = 'idle'; e.pose = null; e.die(true);
      g.ui.card('Rurik Shieldsplitter', "The second of Håkon's seven champions is dead.", 5).then(() => {
        c.sub("Rurik's men keep their word: they surrender, every one of them, because that was his rule. Eirik lets them keep one ship and sail home with their dead.", 9);
        for (const n of this.far || []) n.visible = false;
        const [x, z] = this.S(-260, -150); this.ls[0].to = [x, z, -2];
        g.after(9.4, () => c.fade(() => { c.setPhase('a4seanight', true); this.aboard(); if (p.equipped !== 'none') p.equip('none'); g.quests.notify('event', 'a4rurik'); }, 1.4, 1.4));
      });
    }));
  }

  // ---- the sealed chest (Chapter 4) ----------------------------------------------------------------------
  letters() {
    const g = this.g, c = this.c;
    this.reading = true; g.player.h.play('pickup', 0.9); g.audio.play('page');
    c.say('a4_letters', c.npc('torvald'), () => { this.reading = false; g.quests.notify('event', 'a4chest'); });
  }
  sleep() {
    const g = this.g, c = this.c, p = g.player, SS = this.SS, f = SS.fire, y = SS.sr.y;
    this.sleeping = true; p.frozen = true;
    g.ui.fade(true, 1.4).then(() => {
      c.setPhase('a4homenight', true); this.sleeping = true; p.teleport(...this.S(0.4, -4.4), 0); p.loopOverride = 'lie'; g.ravens.setMode('hidden');
      const t = this.put('torvald', f.x - 0.3, f.z + 1.0, [f.x, f.z], 'kneel'); let n = 0;
      g.ui.fade(false, 1.4);
      g.cine.play([
        { dur: 10, from: [f.x - 6, y + 5.6, f.z + 3.6], to: [f.x - 4.4, y + 4.4, f.z + 2.8], look: [f.x, y + 0.5, f.z + 0.5], fov: 38, sub: ['', "That night, when Eirik is asleep, Torvald takes three of the letters out of the chest and burns them in the ship's cooking fire.", 9.5],
          onUpdate: (k) => { if (k > 0.3 + n * 0.2 && n < 3) { n++; t.h.play('pickup', 0.8); g.fx.burst('spark', f.x, f.y + 0.2, f.z, 14); g.audio.play('ignite', { vol: 0.4 }); } } },
        { dur: 7, from: [f.x + 1.8, y + 1.2, f.z + 3], to: [f.x + 1.3, y + 1.3, f.z + 2.4], look: () => [t.pos.x, t.pos.y + 0.85, t.pos.z], fov: 30, sub: ['', g.fmt('Only {w} sees him do it, and she does not know what it means.'), 6.5] },
      ], { skippable: false, onEnd: () => g.ui.fade(true, 1.4).then(() => { p.loopOverride = null; g.ravens.setMode('follow'); this.sleeping = false; g.quests.notify('event', 'a4sleep'); }) });
    });
  }

  // =====================================================================================
  steps = {
    'q_gold.sun'(r) { this.c.setPhase('a4sea', r); if (r) this.aboard(); },
    'q_gold.belt'(r) { this.c.setPhase('a4sea', r); if (r) this.aboard(); },
    'q_gold.wash'(r) { this.c.setPhase('a4sea', r); if (r) this.aboard(); },
    'q_gold.dice'(r) {
      const c = this.c;
      if (r) { c.setPhase('a4seaeve', r); return this.aboard(); }
      c.fade(() => { c.setPhase('a4seaeve', true); this.aboard(); }, 1.2, 1.2);
    },
    'q_water.eye'(r) {
      const g = this.g, c = this.c;
      if (r) { c.setPhase('a4fog', r); this.aboard(); return c.hint('fog'); }
      c.fade(() => { c.setPhase('a4fog', true); this.aboard(); return g.ui.card('Wolves on the Water', 'On the sixth day', 4); }, 1.2, 1.2).then(() => { c.sub('On the sixth day, {w} sees movement behind a fog bank.', 6); c.hint('fog'); });
    },
    'q_water.ships'(r) { const c = this.c; c.setPhase('a4fog', r); if (r) this.aboard(); c.hint('fog'); },
    'q_water.offer'(r) { const c = this.c; c.setPhase('a4fog', r); if (r) this.aboard(); c.hint(null); this.g.ravens.exitEye(); this.surround(r); },
    'q_water.board'(r) { const c = this.c; c.setPhase('a4fog', r); if (r) { this.aboard(); this.surround(true); } this.arm(); this.wantBoard = true; },
    'q_water.rurik'(r) { const c = this.c; c.setPhase('a4fog', r); if (r) { this.aboard(); this.surround(true); this.arm(); } this.duelStart(); },
    'q_water.torvald'(r) { const c = this.c; c.setPhase('a4seanight', r); if (r) this.aboard(); },
    'q_circle.chest'(r) {
      const g = this.g, c = this.c;
      if (r) { c.setPhase('a4home', r); return this.aboard(); }
      c.fade(() => { c.setPhase('a4home', true); this.aboard(); return g.ui.card('The Iron Circle', 'On the voyage home', 4); }, 1.2, 1.2);
    },
    'q_circle.sleep'(r) { this.c.setPhase('a4home', r); if (r) this.aboard(); },
    'q_six.smoke'(r) {
      const g = this.g, c = this.c, p = g.player;
      if (r) { c.setPhase('a4smoke', r); return this.aboard(); }
      p.frozen = true;
      g.ui.fade(true, 0.6).then(() => g.ui.card('Six Islands Burning', 'On the last day of the voyage', 4.5)).then(() => { c.setPhase('a4smoke', true); this.aboard(); return g.ui.fade(false, 1.4); })
        .then(() => { p.frozen = false; c.sub('On the last day of the voyage, Astrid climbs the mast and goes very still.', 6); });
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests;
    if (!SEA.includes(c.phase)) return;
    this.crew([this.rurik, c.npc('astrid')], dt);
    for (const s of this.ls) if (s.m.visible && s.to) { // the longships close
      const dx = s.to[0] - s.m.position.x, dz = s.to[1] - s.m.position.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { s.m.rotation.y = s.to[2]; s.to = null; continue; }
      const v = Math.min(d, (d > 20 ? 12 : 4.5) * dt); s.m.position.x += (dx / d) * v; s.m.position.z += (dz / d) * v;
      s.m.rotation.y = dampAngle(s.m.rotation.y, d > 8 ? Math.atan2(dx, dz) : s.to[2], d > 8 ? 2.5 : 1.6, dt);
    }
    if (c.phase !== 'a4fog' || g.mode === 'cutscene') return;
    if (this.rurik.visible && this.rurik.mode === 'crew' && !this.duel) this.prow();
    if (q.at('q_water', 'offer') && !this.offerOn && g.mode === 'play') { this.offerOn = true; g.after(1.6, () => { if (q.at('q_water', 'offer')) c.say('a4_offer', null, () => q.notify('event', 'a4offer')); }); }
    if (this.wantBoard && q.at('q_water', 'board') && !this.ls[0].to && g.mode === 'play') { this.wantBoard = false; this.boarding(); } // once his ship is alongside
    if (c.battle.sk) c.battle.updateSkirmish(dt);
    const b = this.bg;
    if (b && q.at('q_water', 'board') && g.mode === 'play') { // what the rest of the battle is doing
      b.t += dt; b.shot -= dt;
      if (b.said === 0 && b.t > 3) { b.said = 1; c.tell(['The sea battle is brutal. Ships grind together and grappling hooks fly.',
        "Astrid shoots from the Sea-Raven's mast, picking off enemy steersmen. Leif swings the Sea-Raven across the bow of one longship and snaps its oars like twigs.",
        "Fire arrows land on Fafnir's Bed's deck, and Ingrid and Ari run with buckets of seawater to put them out. Torvald holds the knarr's side against a boarding party, his hammer cracking shields."], 8); }
      if (b.said === 1 && b.t > 11.5) { b.said = 2; g.audio.play('split'); g.audio.play('thud'); g.player.cam.shake = 0.25; }
      if (b.said === 2 && b.t > 19.5) { b.said = 3; for (const [dx, dz] of [[11.6, -1], [14.2, 3.4]]) { const [x, z] = this.S(dx, dz); this.fires.push(g.fx.addFire(x, this.SS.kn.y + 0.2, z, 0.9)); } g.audio.play('ignite'); }
      if (b.said === 3 && b.t > 30) { b.said = 4; for (const f of this.fires) g.fx.removeFire(f); this.fires = []; g.audio.play('splash'); }
      if (b.shot <= 0) { b.shot = 3.5 + Math.random() * 2; c.npc('astrid').h.play('shoot', 0.7); g.audio.play('bow', { vol: 0.4 }); }
    }
  }
}
