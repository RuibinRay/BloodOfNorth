// Act VI on Myrholm: "The Marsh Queen" (Thora's refusal, Gest in the channel, what the white raven finds, Astrid
// released on Eirik's surety, Prince Eyvind, the leeches and the man the bog kept, the death trap round the old
// watchtower, Eydis the Mire, and Myrholm's oath). Myrholm is the great island of the sandbox, at story scale; the
// hunt across it is cut into three places by the story's own "slow and miserable". See act6_home.js.
import { CAST6, A6, SIGNS } from '../data/act6.js';
import { FOES } from './champions.js';
import { Knack } from '../systems/activities2.js';
import { A4Part } from './act4_home.js';

const MARSH = ['mday', 'mmorn', 'mhunt', 'mtower', 'mcouncil'];

export class A6Marsh extends A4Part {
  constructor(game, core) { super(game, core); this.seen = [false, false]; }
  get M() { return this.g.world.main.myr6; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, M = this.M, S = M.st;
    for (const id of ['thora', 'eyvind', 'gest']) { const n = g.addNPC(id, CAST6[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    this.eydis = g.addNPC('eydis', { name: 'Eydis the Mire', look: FOES.find((f) => f.id === 'eydis').look }); this.eydis.visible = false;
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 3, priority: 3, label, enabled, use, ...o });
    I('a6body', M.gest, 'Look at the arrow', () => q.at('q_marsh', 'gest') && !this.busy, () => { this.busy = true; c.say('a6_gest', null, () => { this.busy = false; q.notify('event', 'a6gest'); }); }, { r: 4.5 });
    I('a6leech', M.leech, 'Burn the leeches off with a hot knife', () => q.at('q_marsh', 'leech') && !g.activity, () => this.leech());
    I('a6wire', S.wire, 'Step over it, where Astrid points', () => q.at('q_marsh', 'wire') && !this.busy, () => { c.sub('Astrid finds the tripwires.', 4); g.player.h.play('dodge', 0.6); q.notify('event', 'a6wire'); }, { r: 3.4 });
    I('a6ecamp', S.ecamp, "Search Eydis's camp", () => q.at('q_marsh', 'camp') && !this.busy, () => { this.busy = true; g.player.h.play('pickup', 0.9); c.say('a6_proof', null, () => { this.busy = false; q.notify('event', 'a6proof'); }); }, { r: 3.6 });
    SIGNS.forEach(([id, label, text]) => g.ravens.addMarkable({ id: 'a6sign_' + id, pos: () => ({ x: S[id][0], z: S[id][1] }), r: 50, label, enabled: () => q.at('q_marsh', 'signs') && c.phase === 'mmorn' && !this.found[id],
      onMark: () => { this.found[id] = true; c.sub(text, 6); q.notify('event', 'a6sign'); if (q.at('q_marsh', 'surety')) g.after(6.2, () => c.sub('He needs a tracker.', 4)); } }));
    M.archers.forEach(([x, z], i) => g.ravens.addMarkable({ id: 'a6archer' + i, pos: () => ({ x, z }), r: 40, label: 'an archer in the reeds', enabled: () => q.at('q_marsh', 'archers') && !this.seen[i],
      onMark: () => { this.seen[i] = true; const n = c.battle.foes[i]; n.crouch = false; q.notify('event', 'a6archer'); if (q.at('q_marsh', 'eydis')) c.sub('{w} spots the archers.', 4); } }));
    g.events.on('harried', (e) => { if (e === this.eydis && this.duel && !this.duel.called) this.raven(e); });
    g.events.on('enemyHit', (e) => { if (e === this.eydis && this.duel && this.duel.called && !this.duel.broke) this.shaft(e); });
  }
  clear(phase) {
    const g = this.g, c = this.c, on = MARSH.includes(phase);
    this.M.st.set(on);
    for (const n of [c.npc('thora'), c.npc('eyvind'), c.npc('gest'), this.eydis]) n.visible = false;
    this.duel = null; this.busy = false; this.eydis.cb = null; this.found = {}; this.joinOn = false; this.bogOn = false; this.arrested = false;
    if (on) { c.W.stages.searaven.set(false); c.act.glowTarget = 0; if (phase !== 'mtower' && g.combat.active) g.combat.clear(); }
  }
  /** Who is where on Myrholm. */
  dress(name) {
    const g = this.g, c = this.c, p = g.player, M = this.M, X = M.X, T = c.sea.town, J = c.battle.jarn, mq = this.at('q_marsh'), cg = M.st.cage;
    const P = (id, x, z, face, loop, hold) => this.put(id, x, z, face, loop, hold), at = (id, dx, dz, face, loop, hold) => P(id, ...X(dx, dz), face, loop, hold);
    const hall = X(8, -50), bow = (n) => { n.h.hold('L', 'bow'); return n; }, follow = (id, d) => { const n = P(id, p.pos.x + (d > 3 ? -1.6 : 1.4), p.pos.z + (d > 3 ? 1.2 : 1.6), p.yaw); n.follow(p, { dist: d }); return n; };
    const guard = (i, dx, dz, face) => { const n = at(J[i], dx, dz, face, 'guard', 'spear'); n.name = 'A guard of Myrholm'; n.talk = () => n.say('...', 2); return n; };
    const council = (list) => list.forEach(([dx, dz], i) => { const n = at(T[i], dx, dz, hall); n.name = 'One of the seven families'; });
    const caged = (ids) => ids.forEach((id, i) => { P(id, cg.x - 0.8 + i * 0.8, cg.z - 0.4 + (i % 2) * 0.9, [cg.front[0], cg.front[1]], id === 'leif' ? 'sit' : null); });
    if (name === 'mday' || name === 'mmorn' || name === 'mcouncil') {
      at('thora', 8, -50, name === 'mday' ? X(14, -70) : X(10, -60)); guard(0, 5, -47.6, X(10, -60)); guard(1, 11.4, -47.8, X(10, -60));
      council([[2, -56], [14.6, -56.4], [-1.4, -52], [17.6, -52.4], [0.6, -60.6], [16.4, -60.4], [8.6, -63.4]].slice(0, name === 'mmorn' ? 5 : 7));
      if (name !== 'mmorn' || mq < 5) at('eyvind', 10.6, -48.8, X(10, -60));
    }
    if (name === 'mday') { follow('astrid', 2.6).h.hold('L', 'bow'); follow('leif', 3.6); follow('ingrid', 4.6); }
    if (name === 'mmorn') {
      this.fix(c.npc('gest'), M.gest[0], Math.max(-0.28, g.world.groundAt(...M.gest)) + 0.05, M.gest[1], 1.2, 'dead'); c.npc('gest').talk = null;
      if (mq === 1 && !this.arrested) { bow(at('astrid', 14, -46, X(10, -60))); at('leif', 16, -44.6, X(10, -60)); at('ingrid', 15.6, -47.6, X(10, -60)); guard(2, 60.6, -55, M.gest); guard(3, 61, -61.4, M.gest); }
      else if (mq < 5) { caged(['astrid', 'leif', 'ingrid']); guard(2, cg.x - 3, cg.z + 2.6, [cg.front[0], cg.front[1] + 4]); }
      else { caged(['ingrid']); bow(follow('astrid', 2.6)); follow('leif', 3.8); at('eyvind', -8, 14, [p.pos.x, p.pos.z], 'crouch'); c.npc('eyvind').crouch = true; }
      return;
    }
    if (name === 'mhunt') {
      bow(P('astrid', M.leech[0] - 2.4, M.leech[1] + 1.6, M.leech)); P('leif', M.leech[0] + 2.2, M.leech[1] + 2.4, M.leech); P('eyvind', M.leech[0] + 0.6, M.leech[1] - 1.5, M.leech, mq === 6 ? 'kneel' : null);
      if (mq >= 7) for (const id of ['astrid', 'leif', 'eyvind']) c.npc(id).follow(p, { dist: id === 'eyvind' ? 2.2 : id === 'astrid' ? 3.2 : 4.2 });
      return;
    }
    if (name === 'mtower') {
      const w = M.st.wire, G = M.ground, e = this.eydis;
      bow(P('astrid', mq <= 8 ? w[0] + 1.8 : G[0] + 3, mq <= 8 ? w[1] - 0.6 : G[1] - 3, mq <= 8 ? w : M.tower, mq <= 8 ? 'kneel' : null)); P('leif', mq <= 9 ? M.from[0] + 2 : G[0] + 4.6, mq <= 9 ? M.from[1] + 1 : G[1] - 1.4, M.tower, null, 'seax'); P('eyvind', G[0] + (mq <= 9 ? 0 : 2), G[1] + (mq <= 9 ? 0 : -4.4), mq <= 9 ? w : M.tower);
      M.archers.forEach(([x, z], i) => { const n = P(c.battle.foes[i], x, z, M.tower, null, null); n.name = 'An archer in the reeds'; n.h.hold('L', 'bow'); n.talk = null; n.crouch = !this.seen[i] && mq <= 10; n.visible = mq <= 11; });
      if (mq <= 11) { P(e, M.mire[0], M.mire[1], [p.pos.x, p.pos.z], 'guard', 'spear'); e.h.hold('L', 'javelins'); e.talk = null; }
      else { P(e, M.mire[0], M.mire[1], 0); e.die(true); }
      return;
    }
    if (name === 'mcouncil') { bow(at('astrid', 12.6, -57, hall)); at('leif', 14.4, -58.4, hall); at('ingrid', 6.4, -57.6, hall); }
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!MARSH.includes(c.phase)) return false;
    if (id === 'thora') {
      if (q.at('q_marsh', 'thora')) c.say('a6_thora', n, () => q.notify('talk', 'thora'));
      else if (q.at('q_marsh', 'surety')) c.say('a6_surety', n, () => q.notify('talk', 'thora'));
      else if (q.at('q_marsh', 'council')) c.say('a6_trust', n, () => q.notify('talk', 'thora'));
      else n.say("My people have survived by staying out of other men's wars.", 4);
      return true;
    }
    const line = { eyvind: "You don't know the channels. I do.", astrid: 'I count my arrows every night.', leif: c.phase === 'mhunt' || c.phase === 'mtower' ? 'I have never wanted to be anywhere less.' : '...', ingrid: '...' }; // (game: from the story's sentences)
    if (line[id]) { n.say(line[id], 3); return true; }
    if (/^kp/.test(id)) { n.say('...', 2); return true; }
    return false;
  }
  cues = {
    /** Astrid, Leif and Ingrid are arrested: Eirik is at the cage. */
    arrest() { const cg = this.M.st.cage; this.arrested = true; this.dress('mmorn'); this.g.player.teleport(cg.front[0], cg.front[1], Math.PI); },
    sulk() { const e = this.c.npc('eyvind'), [x, z] = this.M.X(22, -46); e.goTo(x, z, {}); },
  };
  leech() {
    const g = this.g, c = this.c, [x, z] = this.M.leech;
    new Knack(g, { label: 'Burn the leeches off with a hot knife', verb: 'touch', cfg: A6.knack.leech, anim: 'pickup', hold: 'seax', sound: 'ignite', bad: 'The head stays in', at: [x - 0.9, z + 0.6, g.player.yaw], seed: 6,
      onDone: () => { c.npc('eyvind').setLoop(null); for (const id of ['astrid', 'leif', 'eyvind']) c.npc(id).follow(g.player, { dist: id === 'eyvind' ? 2.2 : id === 'astrid' ? 3.2 : 4.2 }); g.quests.notify('event', 'a6leech'); } }).start();
  }
  // ---- the old watchtower: Eydis the Mire ---------------------------------------------------------
  duelStart() {
    const g = this.g, c = this.c, p = g.player, e = this.eydis, def = FOES.find((f) => f.id === 'eydis'), R = A6.eydis, [x, z] = this.M.mire;
    if (this.duel) return;
    this.duel = { called: false, broke: false, t: 0, hinted: false };
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    g.combat.add(e, { ...structuredClone(def.cb), hp: R.hp, dmg: R.dmg, boss: true, smart: true, onDown: (en) => this.eydisFalls(en) });
    for (let i = 0; i < 5; i++) { const a = 0.4 + i * 1.257; g.combat.trap(x + Math.cos(a) * 7.5, z + Math.sin(a) * 7.5, { kind: 'stakes', r: 2.1, sec: 9999, dmg: 5, arm: 0 }); } // pits full of sharpened stakes, hidden under the water
    g.audio.setMusic('raid'); g.ui.questBanner('fourth of the seven · the drowned watchtower, Myrholm', 'Eydis the Mire');
    c.sub('The fight is in knee-deep water under the rotting watchtower. Eydis keeps Eirik at the end of her long spear, jabbing and retreating, throwing javelins from a bundle on her back.', 10);
  }
  /** The black raven drops out of the mist straight into her face. */
  raven(e) {
    const c = this.c, d = this.duel;
    d.called = true; c.hint(null);
    c.sub("Then Eirik calls {b}. The black raven drops out of the mist straight into Eydis's face, screaming and clawing. For one heartbeat she raises her arm to protect her eyes.", 8);
    this.g.after(8.2, () => { if (this.duel && !this.duel.broke) c.sub('One heartbeat is enough.', 4); });
  }
  /** Raven-Feeder breaks her spear shaft, then her guard. */
  shaft(e) {
    const g = this.g, c = this.c, d = this.duel, cb = e.cb, R = A6.eydis;
    d.broke = true; e.h.hold('R', null); g.audio.play('split'); g.player.cam.shake = 0.4;
    cb.hp = Math.min(cb.hp, cb.maxHp * R.after); cb.reach = 1.7; cb.range = 0; cb.dodge = 0; cb.moves = cb.moves.filter((m) => m.id === 'sw').map((m) => ({ ...m, reach: 1.7, unblockable: false, dmg: 8 })); cb.phases = [];
    cb.posture = 100; g.combat.checkPosture(e);
    c.sub('Eirik closes the distance and Raven-Feeder breaks her spear shaft, then her guard.', 7);
  }
  eydisFalls(e) {
    const g = this.g, c = this.c, p = g.player;
    g.combat.clear(); e.cb = null; p.mortal = false; g.slowT = 0.9; c.hint(null); this.duel = null; g.audio.setMusic('sorrow'); e.mode = 'idle'; e.die();
    for (const n of c.battle.foes.slice(0, 2)) n.visible = false; // her archers are gone into the reeds (game)
    g.after(3, () => g.ui.card('Eydis the Mire', "The fourth of Håkon's seven champions is dead.", 5).then(() => g.quests.notify('event', 'a6eydis')));
  }

  /** A load: he stands on Myrholm, where this step begins. */
  here(r, at, yaw = 0) { if (r) this.g.player.teleport(at[0], at[1], yaw); }
  // =====================================================================================
  steps = {
    'q_marsh.thora'(r) {
      const g = this.g, c = this.c, p = g.player, M = this.M;
      if (this.st.flags.a6begun) { this.here(r, M.landing, 0); return c.setPhase('mday', r); }
      this.st.flags.a6begun = true; // the act opens once, however it is entered
      p.frozen = true; p.teleport(M.landing[0], M.landing[1], 0); c.setPhase('mday', true); if (p.equipped !== 'none') p.equip('none');
      g.ui.card('Act Six', 'The Nine Oaths', 4.2).then(() => { p.frozen = false; c.tell(['Myrholm is a world of water. Reed beds taller than a man. Black pools. Narrow channels that wind for miles and lead nowhere.', 'Islands of solid ground where villages stand on wooden stilts. Mist every morning. Midges every evening. Leeches always.'], 7.5); });
    },
    'q_marsh.gest'(r) {
      const g = this.g, c = this.c, at = this.M.X(12, -64);
      if (r) { this.here(r, at, 0); return c.setPhase('mmorn', r); }
      c.fade(() => { g.player.teleport(at[0], at[1], 0); c.setPhase('mmorn', true); return g.ui.card('', 'The next morning', 3); }, 1.2, 1.2);
    },
    'q_marsh.eye'(r) { const c = this.c, f = this.M.st.cage.front; this.here(r, f, Math.PI); c.setPhase('mmorn', r); if (!r) this.dress('mmorn'); c.hint('marshEye'); if (!r) c.sub('Eirik sends {w} over the marshes, day after day. She finds things nobody on the ground could see.', 8); },
    'q_marsh.signs'(r) { const c = this.c; this.here(r, this.M.st.cage.front, Math.PI); c.setPhase('mmorn', r); c.hint('marshEye'); },
    'q_marsh.surety'(r) { const c = this.c; this.here(r, this.M.st.cage.front, Math.PI); c.setPhase('mmorn', r); c.hint(null); this.g.ravens.exitEye(); },
    'q_marsh.eyvind'(r) { const c = this.c; this.here(r, this.M.X(10, -42), -0.3); c.setPhase('mmorn', r); this.dress('mmorn'); },
    'q_marsh.leech'(r) {
      const g = this.g, c = this.c, at = [this.M.leech[0] - 5, this.M.leech[1] + 4];
      if (r) { this.here(r, at, 2.2); return c.setPhase('mhunt', r); }
      c.fade(() => { g.player.teleport(at[0], at[1], 2.2); c.setPhase('mhunt', true); return g.ui.card('', 'The hunt through the marsh is slow and miserable. They wade waist-deep in brown water.', 6); }, 1.2, 1.2)
        .then(() => c.sub('The leeches are everywhere; Eyvind shows them how to burn them off with a hot knife without leaving the head in.', 8));
    },
    'q_marsh.peat'(r) { const c = this.c; this.here(r, [this.M.leech[0] - 1, this.M.leech[1] + 1], 2.2); c.setPhase('mhunt', r); if (r) this.dress('mhunt'); },
    'q_marsh.wire'(r) {
      const g = this.g, c = this.c, M = this.M, lines = ['At the end of the trail they find the killer. She is Eydis the Mire, the spear-champion. She does not fight like the others. She is a hunter who makes her prey come to her.',
        "She killed Gest with Astrid's arrow to turn the families against each other and against Eirik, so that Myrholm would tear itself apart and fall into Håkon's hand without a single ship.",
        'She has turned the area around the old watchtower into a death trap. Pits full of sharpened stakes hidden under the water. Tripwires. Archers in the reeds. False trails that lead into sucking mud.'];
      if (r) { this.here(r, M.from, -0.73); return c.setPhase('mtower', r); }
      c.fade(() => { g.player.teleport(M.from[0], M.from[1], -0.73); c.setPhase('mtower', true); }, 1.2, 1.2).then(() => c.tell(lines, 9.5));
    },
    'q_marsh.ground'(r) { const c = this.c, w = this.M.st.wire; this.here(r, [w[0] + 0.4, w[1] + 2], -0.5); c.setPhase('mtower', r); this.dress('mtower'); if (!r) this.g.after(4.2, () => c.sub('Eyvind knows where the solid ground is.', 4)); },
    'q_marsh.archers'(r) { const c = this.c; this.here(r, this.M.ground, -0.7); c.setPhase('mtower', r); this.dress('mtower'); c.hint('archerEye'); },
    'q_marsh.eydis'(r) {
      const g = this.g, c = this.c; this.here(r, this.M.ground, -0.7); c.setPhase('mtower', r); g.ravens.exitEye(); c.hint(null); if (r) this.seen = [true, true]; this.dress('mtower');
      g.after(r ? 0.5 : 4.5, () => { if (g.quests.at('q_marsh', 'eydis')) { if (!r) c.sub('Eirik goes in.', 3); this.duelStart(); } });
    },
    'q_marsh.camp'(r) { const c = this.c, M = this.M; this.here(r, [M.mire[0] - 4, M.mire[1] - 2], -1.6); c.setPhase('mtower', r); if (r) this.dress('mtower'); },
    'q_marsh.council'(r) {
      const g = this.g, c = this.c, at = this.M.X(10, -60);
      if (r) { this.here(r, at, 0); return c.setPhase('mcouncil', r); }
      c.fade(() => { g.player.teleport(at[0], at[1], 0); c.setPhase('mcouncil', true); if (g.player.equipped !== 'none') g.player.equip('none'); }, 1.4, 1.4);
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase, M = this.M;
    if (!MARSH.includes(ph)) return;
    this.crew([c.npc('gest')], dt);
    if (g.mode !== 'play') return;
    const near = (at, d) => Math.hypot(p.pos.x - at[0], p.pos.z - at[1]) < d;
    if (q.at('q_marsh', 'eyvind') && !this.joinOn && near(M.join, 7)) { this.joinOn = true; const e = c.npc('eyvind'); e.crouch = false; e.setLoop(null); c.say('a6_eyvind', e, () => q.notify('event', 'a6eyvind')); }
    if (q.at('q_marsh', 'peat') && !this.bogOn && near(M.peat, 6.5)) { this.bogOn = true; c.say('a6_bog', null, () => q.notify('event', 'a6peat')); }
    const d = this.duel, e = this.eydis;
    if (d && e.cb && !d.called) { // every time he charges, the mud grabs his feet and she punishes him
      const R = A6.eydis, low = e.cb.hp <= e.cb.maxHp * R.floor;
      d.t += dt; if (low) e.cb.hp = e.cb.maxHp * R.floor;
      if (!d.hinted && (low || d.t > R.hintAfter)) { d.hinted = true; c.sub('Every time he charges, the mud grabs his feet and she punishes him. He takes a cut on the shoulder, then the leg. The water around him turns red.', 9); c.hint('callSot'); }
      else if (d.hinted && low && (d.again = (d.again || 0) + dt) > R.again) { d.again = 0; c.hint('callSot'); this.g.audio.play('raven', { vol: 0.7 }); } // held at the floor and still no raven: {b} calls from the mist, and the hint stands again (game)
    }
  }
}
