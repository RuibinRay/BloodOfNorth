// Act VI on Skalløy: "The Last Forge" (Brokk and Halvar, the sky-iron, Raven-Feeder's second reforging, the true
// story of the hand), "The Black Anvil" (three lanes, the doorway, Bersi through the streets to the quarry) and
// "The Smith's Last Words" (the forge before dawn, the boat on the beach, Star-Fall). Skalløy is the great island
// of the sandbox, at story scale. Eighty warriors are four to a lane. See act6_home.js.
import { CAST6, A6, DOOR_LINES } from '../data/act6.js';
import { FOES } from './champions.js';
import { REFORGE } from '../data/weapons.js';
import { A4Part, TEN } from './act4_home.js';

const FORGE = ['fday', 'fnight', 'fraid', 'fdawn', 'fpyre'];
const ESCORT = [TEN[0], TEN[1], TEN[2], TEN[3], 'j2', 'j3', 'j4']; // the alliance's small escort and Skalløy's few guards

export class A6Forge extends A4Part {
  constructor(game, core) { super(game, core); this.fires = []; }
  get S() { return this.g.world.main.skal6; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, S = this.S;
    for (const id of ['gudmund', 'halvar']) { const n = g.addNPC(id, CAST6[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    this.bersi = g.addNPC('bersi', { name: 'Bersi Black-Anvil', look: FOES.find((f) => f.id === 'bersi').look }); this.bersi.visible = false;
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 3, priority: 3, label, enabled, use, ...o });
    I('a6axe', S.X(-6.6, -20.4), 'Give them Raven-Feeder', () => q.at('q_lastforge', 'axe') && !this.busy, () => this.reforge(), { r: 3.4 });
    I('a6speak', S.pyre.front, 'Speak', () => q.at('q_smith', 'speak') && !this.busy, () => { this.busy = true; c.say('a6_funeral', null, () => { this.busy = false; q.notify('event', 'a6speak'); }); }, { r: 3.6 });
    I('a6light', S.pyre.front, 'Light the boat', () => q.at('q_smith', 'light') && !this.busy, () => this.light(), { r: 3.6 });
  }
  clear(phase) {
    const g = this.g, c = this.c, S = this.S, on = FORGE.includes(phase);
    S.ship.set(on); S.iron.set(phase === 'fday' || phase === 'fnight'); S.raiders.set(phase === 'fraid'); S.pyre.set(phase === 'fpyre'); S.rail.set(phase === 'fraid');
    for (const n of [c.npc('gudmund'), c.npc('halvar'), this.bersi]) n.visible = false;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    this.duel = null; this.fall = null; this.busy = false; this.met = false; this.doorOn = false; this.bersi.cb = null; this.lit = false;
    if (on) { c.W.stages.searaven.set(false); c.act.glowTarget = phase === 'fraid' ? 0.8 : 0; if (g.combat.active) g.combat.clear(); c.battle.sk = null; }
  }
  fire(x, z, y = 1.6, s = 2.2) { this.fires.push(this.g.fx.addFire(x, this.g.world.groundAt(x, z) + y, z, s)); }
  /** Who is where on Skalløy. */
  dress(name) {
    const g = this.g, c = this.c, p = g.player, S = this.S, X = S.X, T = c.sea.town, J = c.battle.jarn, lf = this.at('q_lastforge'), an = this.at('q_anvil'), sm = this.at('q_smith'), D = S.door;
    const at = (id, dx, dz, face, loop, hold) => this.put(id, ...X(dx, dz), face, loop, hold), bow = (n) => { n.h.hold('L', 'bow'); return n; }, sword = (n) => { n.h.hold('R', 'sword'); return n; };
    const smiths = () => { [[-66, -36, 1], [-48, -36, 1], [-30, -36, 1], [-66, -6, -1], [-48, -6, -1]].forEach(([dx, dz, k], i) => { const n = at(T[i], dx + k * 0.6, dz - k * 1.3, X(dx + k * 0.6, dz), 'hammer', 'hammer'); n.name = 'A smith of Skalløy'; }); };
    const boys = (spots) => spots.forEach(([dx, dz, loop], i) => { const n = at(T[5 + i], dx, dz, D, loop); n.name = 'An apprentice'; });
    const guards = (spots) => spots.forEach(([dx, dz, face], i) => { const n = at(J[i], dx, dz, face, 'guard', 'spear'); n.name = 'A guard of Skalløy'; n.talk = () => n.say('...', 2); });
    if (name === 'fday' || name === 'fnight') {
      const night = name === 'fnight';
      if (!night) smiths();
      at('gudmund', night ? -16 : -52.4, night ? -15 : 93.2, night ? X(-8, -20) : X(-44, 108)); if (!night) guards([[-55.4, 92.4, X(-44, 108)], [-50, 95.6, X(-44, 108)]]);
      if (lf === 0) { // across the harbor
        at('halvar', -150, -27, X(-200, -34)); this.put('brokk', p.pos.x + 1.2, p.pos.z + 1.6, p.yaw).follow(p, { dist: 2.2 });
        bow(this.put('astrid', p.pos.x - 1.4, p.pos.z + 2.4, p.yaw)).follow(p, { dist: 3.4 }); sword(this.put('svanhild', p.pos.x + 2.4, p.pos.z + 3, p.yaw)).follow(p, { dist: 4.4 });
        TEN.slice(0, 4).forEach((id, i) => at(id, -190 + i * 1.8, -30 + (i % 2) * 1.6, X(-150, -27)));
      } else {
        at('halvar', -6.4, -20.4, S.anvil, night ? 'sit' : 'hammer', night ? null : 'hammer'); at('brokk', night ? -4.6 : -6.6, night ? -23.4 : -23.2, night ? X(-8, -21.6) : S.anvil, night ? 'sit' : null);
        bow(at('astrid', -22, -13, X(-10, -22))); sword(at('svanhild', -20, -27, X(-10, -22))); boys([[-9, -25.2, night ? 'sit' : 'carry'], [-11.4, -19.6, night ? 'sit' : null], [-3.4, -18, night ? 'sit' : null]]);
        TEN.slice(0, 4).forEach((id, i) => at(id, -150 + i * 2.2, -24 - (i % 2) * 1.6, X(-200, -34), night ? 'sit' : null));
        if (night) this.fire(...X(-11.4, -21.4), 0.9, 0.6); // the dying forge
      }
      return;
    }
    if (name === 'fraid') {
      const be = this.bersi;
      for (const [dx, dz] of [[-156, -48], [-126, -50], [-160, -12], [-120, -6]]) this.fire(...X(dx, dz), 3, 2.6); // pitch on the roofs
      if (an >= 1 || an === 99) for (const [dx, dz] of [[-66, -36], [-48, -6], [-30, -36]]) this.fire(...X(dx, dz), 2.6, 2.2);
      if (an === 0) {
        const i = Math.min(2, this.count('q_anvil')), [lx, lz] = S.lanes[i];
        ESCORT.forEach((id, k) => { const n = this.put(id, lx + 1.5 + (k % 2) * 1.4, lz - 4.4 + k * 1.4, -Math.PI / 2, 'guard', k < 4 ? 'spear' : 'sword'); n.h.hold('L', 'shield'); if (k >= 4) n.name = 'A guard of Skalløy'; });
        if (!this.count('q_anvil')) { bow(at('astrid', -96, -22, X(-140, -26))); sword(at('svanhild', -98, -19, X(-140, -26))); T.slice(0, 5).forEach((n, k) => { n.name = 'A smith of Skalløy'; at(n, -92 + k * 2, -24 + (k % 2) * 3, X(40, 10)); }); this.flee(); }
      }
      if (an === 1) { // the doorway
        const b = this.put('brokk', D[0], D[1], X(7, -21.6), 'guard', 'hammer'); b.talk = null;
        this.put(be, ...X(6.6, -21.4), D, 'guard', 'anvilhammer'); be.talk = null;
        [[4, -25.2], [3.6, -18.2]].forEach(([dx, dz], k) => { const n = this.put(c.battle.foes[k], ...X(dx, dz), D, 'guard', k ? 'club' : 'axe'); n.name = "One of Håkon's toughest"; n.talk = null; });
        at('halvar', -8.6, -21.4, D, 'carry'); boys([[-9.6, -24.4, 'carry'], [-11, -20, 'cower'], [-8, -18.6, 'carry']]);
      }
      if (an === 2) { this.fix(c.npc('brokk'), D[0], g.world.groundAt(...D) + 0.12, D[1], 1.2, 'lie'); c.npc('brokk').h.hold('R', null); this.put(be, ...X(5.8, -21.4), [p.pos.x, p.pos.z], 'guard', 'anvilhammer'); be.talk = null; this.fire(...X(-10, -22), 2.8, 2.4); }
      return;
    }
    if (name === 'fdawn') {
      this.fix(c.npc('brokk'), D[0], g.world.groundAt(...D) + 0.12, D[1], 1.2, 'lie'); c.npc('brokk').h.hold('R', 'hammer');
      at('ingrid', -2.2, -20.4, D, 'kneel'); at('halvar', 0.6, -24.4, D); at('leif', 1.8, -18.4, D); bow(at('astrid', 4, -24.6, D)); sword(at('svanhild', 4.8, -19.6, D)); boys([[1.6, -27, null], [3.4, -27.6, null], [5.6, -26.4, null]]);
      this.fire(...X(-11.4, -21.4), 0.9, 0.9); // the forge fire, still burning
      return;
    }
    if (name === 'fpyre') {
      const P = S.pyre, f = P.front, b = c.npc('brokk');
      this.fix(b, P.x + 0.1, P.y + 0.72, P.z + 0.2, 0.3, 'dead'); b.h.hold('R', null);
      const arc = ['halvar', 'ingrid', 'leif', 'astrid', 'svanhild', 'gudmund', T[5].id, T[6].id, T[7].id, ...TEN.slice(0, 4)];
      arc.forEach((id, i) => { const a = -0.9 + i * 0.26, r = 6 + (i % 2) * 1.5, n = this.put(id, P.x + Math.sin(a) * r + 2, P.z + Math.cos(a) * r, [P.x, P.z]); if (id === 'astrid') bow(n); if (id.startsWith('kp')) n.name = 'An apprentice'; });
      if (sm >= 2 || sm === 99) this.light(true);
      void f;
    }
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!FORGE.includes(c.phase)) return false;
    if (id === 'halvar') { if (q.at('q_lastforge', 'forge')) c.say('a6_workshop', n, () => q.notify('talk', 'halvar')); else if (q.at('q_smith', 'halvar')) c.say('a6_starfall', n, () => q.notify('talk', 'halvar')); else n.say('Better than yours.', 3); return true; }
    if (id === 'gudmund') { if (q.at('q_lastforge', 'gudmund')) c.say('a6_gudmund', n, () => q.notify('talk', 'gudmund')); else if (q.at('q_lastforge', 'word')) c.say('a6_word', n, () => q.notify('talk', 'gudmund')); else n.say('If Skalløy sends one warrior, he will burn every workshop on the island.', 4.5); return true; } // (game: from the story's sentence)
    if (id === 'brokk') { if (q.at('q_lastforge', 'night')) c.say('a6_hand', n, () => q.notify('talk', 'brokk')); else n.say('Metal remembers every blow. So do men.', 3.5); return true; }
    if (['astrid', 'svanhild', 'leif', 'ingrid'].includes(id) || /^kp|^v\d/.test(id)) { n.say('...', 2); return true; }
    return false;
  }
  cues = {
    hammer() { const c = this.c, h = c.npc('halvar'), b = c.npc('brokk'); h.setLoop('kneel'); b.h.hold('R', null); h.h.hold('R', 'hammer'); },
    dies() { this.c.npc('brokk').pose = 'dead'; this.g.audio.setMusic('sorrow'); },
    arrows() { const c = this.c, a = c.npc('astrid'), P = this.S.pyre, [x, z] = [a.pos.x, a.pos.z]; a.goTo(P.x + 1.6, P.z + 1.4, { onArrive: (o) => { o.h.play('pickup', 0.9); o.goTo(x, z, { onArrive: (k) => k.face(P.x, P.z) }); } }); },
    cloth() { const c = this.c, i = c.npc('ingrid'), P = this.S.pyre, [x, z] = [i.pos.x, i.pos.z]; i.goTo(P.x + 1.5, P.z - 0.6, { onArrive: (o) => { o.h.play('pickup', 0.9); o.goTo(x, z, { onArrive: (k) => k.face(P.x, P.z) }); } }); },
    reforge3() { const g = this.g; this.st.flags.reforge = Math.max(3, this.st.flags.reforge || 0); g.audio.play('steel'); g.ui.questBanner('Reforged', REFORGE[3].name); },
    starfall() { const h = this.c.npc('halvar'); h.h.hold('R', 'starfall'); this.g.audio.play('clack'); },
  };
  // ---- the harbor, the forge -----------------------------------------------------------------------
  meet() {
    const g = this.g, c = this.c, p = g.player, b = c.npc('brokk'), h = c.npc('halvar');
    this.met = true; p.frozen = true;
    b.stop(); b.goTo(h.pos.x - 0.75, h.pos.z, { onArrive: (o) => { o.face(h.pos.x, h.pos.z); h.face(o.pos.x, o.pos.z); } });
    c.tell(['The arrival is peaceful and almost too pleasant. Brokk sees Halvar across the harbor, a broad young man of twenty-five with a leather apron and burn scars on his forearms, and the old smith drops his bag and walks straight into his arms.',
      'Neither of them says anything for a long time.'], 9).then(() => { p.frozen = false; g.quests.notify('event', 'a6halvar'); });
  }
  reforge() {
    const g = this.g, c = this.c, p = g.player, b = c.npc('brokk'), h = c.npc('halvar'), [ax, az] = this.S.anvil;
    this.busy = true; p.frozen = true; p.h.play('pickup', 0.8);
    c.sub('They work on Raven-Feeder too. Its edge is worn from years of fighting. Brokk and Halvar heat it, fold fresh Jarnøy iron into it, and quench it in seawater with a hiss and a cloud of steam.', 11);
    b.setLoop('hammer'); b.h.hold('R', 'hammer'); for (let i = 0; i < 6; i++) g.after(1 + i * 1.1, () => g.audio.play('steel', { vol: 0.5 }));
    g.after(8.6, () => { g.audio.play('ignite'); g.fx.burst('splash', ax, g.world.groundAt(ax, az) + 1, az, 22); h.h.play('pickup', 0.9); });
    g.after(11.4, () => c.say('a6_metal', b, () => {
      b.setLoop(null); this.st.flags.reforge = Math.max(2, this.st.flags.reforge || 0); g.ui.questBanner('Reforged', REFORGE[2].name);
      p.frozen = false; this.busy = false; g.quests.notify('event', 'a6reforge');
    }));
  }
  // ---- three lanes ----------------------------------------------------------------------------------
  /** Astrid and Svanhild get the smiths and their families out toward the hills. */
  flee() {
    const c = this.c, [x, z] = this.S.X(40, 10), gone = (o) => { o.visible = false; };
    for (const n of [c.npc('astrid'), c.npc('svanhild'), ...c.sea.town.slice(0, 5)]) n.goTo(x + (Math.random() - 0.5) * 4, z + (Math.random() - 0.5) * 4, { run: true, onArrive: gone });
  }
  lane(i) {
    const g = this.g, c = this.c, p = g.player, S = this.S, [lx, lz] = S.lanes[i], R = { ...A6.lane };
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    ESCORT.forEach((id, k) => { const n = c.npc(id); if (n.dist(p) > 16) n.teleport(lx + 2 + (k % 2) * 1.4, lz - 4.4 + k * 1.4, -Math.PI / 2); n.stop(); n.setLoop('guard'); });
    c.battle.startSkirmish(ESCORT, [[lx - 22, lz - 3], [lx - 20, lz + 5]], R.n, R.atOnce, () => {
      g.quests.notify('event', 'a6lane');
      if (g.quests.at('q_anvil', 'lanes')) { const [nx, nz] = S.lanes[i + 1]; ESCORT.forEach((id, k) => { const n = c.npc(id); n.setLoop(null); n.goTo(nx + 1.5 + (k % 2) * 1.4, nz - 4.4 + k * 1.4, { run: true, onArrive: (o) => { o.yaw = -Math.PI / 2; o.setLoop('guard'); } }); }); c.sub(i ? 'Then another.' : 'Eirik holds a narrow lane, then another.', 4); }
    }, R);
    g.audio.setMusic('raid'); if (!i) { g.ui.questBanner('Skalløy', 'hold the lane'); c.hint('deckHold'); }
  }
  dyn(name) {
    const q = this.g.quests, d = this.duel;
    if (name === 'a6ledge') return d && d.quarry && !d.done ? { x: this.S.ledge + 3, z: this.S.quarry[1], y: this.g.world.groundAt(this.S.ledge + 3, this.S.quarry[1]) + 1.6 } : null; // the ledge of loose stone
    if (name !== 'a6work' || !q.at('q_anvil', 'lanes')) return undefined;
    const [x, z] = this.S.lanes[Math.min(2, this.count('q_anvil'))]; return this.c.battle.sk ? null : { x, z, y: this.g.world.groundAt(x, z) + 2 };
  }
  // ---- the doorway ------------------------------------------------------------------------------------
  playDoor() {
    const g = this.g, c = this.c, p = g.player, S = this.S, D = S.door, y = g.world.groundAt(...D), b = c.npc('brokk'), be = this.bersi, W = c.battle.foes.slice(0, 2), h = c.npc('halvar'), boys = c.sea.town.slice(5, 8);
    this.doorOn = true; p.frozen = true; g.ravens.exitEye(); c.hint(null);
    p.teleport(D[0] + 13, D[1] + 5.5, -1.9);
    const eye = (n, up = 1.5) => () => [n.pos.x, n.pos.y + up, n.pos.z];
    const cam = { door: { from: [D[0] + 9.5, y + 2.2, D[1] + 4], to: [D[0] + 7.5, y + 1.9, D[1] + 3], look: [D[0] + 1, y + 1.3, D[1]], fov: 40 }, side: { from: [D[0] + 2.6, y + 1.7, D[1] - 6.4], to: [D[0] + 3.4, y + 1.6, D[1] - 5.6], look: [D[0] + 1, y + 1.2, D[1]], fov: 44 },
      bersi: { from: [D[0] - 0.6, y + 1.2, D[1] + 2.6], look: eye(be, 2.0), fov: 38 }, brokk: { from: [D[0] + 3.2, y + 1.7, D[1] + 2.4], look: () => [b.pos.x, b.pos.y + (b.mode === 'crew' ? 0.3 : 1.4), b.pos.z], fov: 32 }, eirik: { from: [D[0] + 4.6, y + 1.5, D[1] + 3.2], look: eye(p), fov: 30 } };
    const act = {
      fight: () => { W[0].setLoop(null); W[0].goTo(D[0] + 1.3, D[1] - 0.5, { run: true }); g.after(1.4, () => { b.h.play('atk2', 0.6); g.audio.play('thud'); W[0].stop(); W[0].h.play('fall', 0.9); g.after(0.5, () => W[0].die()); }); },
      knee: () => { W[1].setLoop(null); W[1].goTo(D[0] + 1.3, D[1] + 0.6, { run: true }); g.after(1.5, () => { b.h.play('atk1', 0.6); g.audio.play('thud'); W[1].stop(); g.after(0.3, () => W[1].die()); });
        h.setLoop(null); [h, ...boys].forEach((n, i) => { n.setLoop(null); n.goPath([[D[0] - 3.4, D[1] + 5.6 + i * 0.6], [D[0] - 20 - i, D[1] + 10 + i]], { run: true, onArrive: (o) => { o.visible = false; } }); }); }, // round the wall and away: there is no back door to walk through
      down: () => { be.setLoop(null); be.teleport(D[0] + 2.3, D[1] + 0.2, -Math.PI / 2); be.h.play('slam', 1.5); g.after(0.8, () => { g.audio.play('thud'); g.audio.play('hurt'); p.cam.shake = 0.6; b.h.play('fall', 0.8, { onEnd: () => { this.fix(b, D[0], y + 0.12, D[1], 1.2, 'lie'); } }); }); },
      run: () => { be.teleport(D[0] + 5, D[1] - 0.6, -Math.PI / 2); p.teleport(D[0] + 0.5, D[1] + 1.25, Math.PI); p.loopOverride = 'kneel'; },
      laugh: () => { be.h.play('cheer', 1.6); },
      ward: () => { p.loopOverride = null; p.yaw = Math.atan2(be.pos.x - p.pos.x, be.pos.z - p.pos.z); p.wardFlash(be.pos); g.audio.play('thunder', { vol: 0.5 }); },
    };
    const shots = DOOR_LINES.map(([who, sp, text, k]) => { const v = cam[who], dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.2, v.from[1], v.from[2] + 0.15], look: v.look, fov: v.fov, sub: [sp, text, dur - 0.3], onStart: k ? act[k] : null }; });
    g.cine.play(shots, { onEnd: () => { p.loopOverride = null; p.frozen = false; for (const n of [h, ...boys, ...W]) n.visible = false; if (b.mode !== 'crew') this.fix(b, D[0], y + 0.12, D[1], 1.2, 'lie'); g.quests.notify('event', 'a6door'); } }); // if it is skipped, it has still happened
  }
  // ---- Bersi Black-Anvil: the forge, the streets, the quarry -------------------------------------------------------
  duelStart() {
    const g = this.g, c = this.c, p = g.player, e = this.bersi, def = FOES.find((f) => f.id === 'bersi'), R = A6.bersi;
    if (this.duel) return;
    this.duel = { quarry: false, done: false };
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    const cb = structuredClone(def.cb);
    g.combat.add(e, { ...cb, hp: R.hp, dmg: R.dmg, boss: true, smart: true, onDown: (en) => this.drop(en), phases: [{ at: R.beamAt, do: () => this.beam() }, ...cb.phases, { at: R.quarryAt, do: (en) => this.toQuarry(en) }] });
    g.audio.setMusic('raid'); g.ui.questBanner('fifth of the seven · the forges of Skalløy', 'Bersi Black-Anvil');
    c.sub("The battle with Bersi is the hardest fight of Eirik's life. Bersi never seems to tire.", 7);
  }
  beam() {
    const g = this.g, c = this.c, p = g.player;
    c.sub("His hammer smashes Eirik's shield, then another one Eirik grabs off the floor. It crushes an anvil. It brings down a burning beam.", 9);
    p.afflict('noShield', 30, 'Your shield is split'); g.audio.play('split'); g.audio.play('thud'); p.cam.shake = 0.5; this.fire(p.pos.x - 3, p.pos.z + 1.5, 0.6, 1.4);
  }
  /** They fight out of the burning forge, through the streets, up the path to the stone quarry on the cliff above the sea. */
  toQuarry(e) {
    const g = this.g, c = this.c, p = g.player, S = this.S, [qx, qz] = S.quarry, d = this.duel;
    if (!d || d.quarry) return;
    d.quarry = true; e.cb.training = true; e.cb.state = 'recover'; e.cb.t = 999; // from here he cannot be cut down: only the edge will do it
    c.fade(() => { p.teleport(qx + 3, qz + 1, -Math.PI / 2); e.teleport(qx - 4, qz - 1, Math.PI / 2); e.cb.state = 'approach'; e.cb.t = 0; return g.ui.card('', 'They fight out of the burning forge, through the streets, up the path to the stone quarry on the cliff above the sea.', 7); }, 1.0, 1.0)
      .then(() => { c.sub('Eirik cannot block that hammer forever. Every time Stormguard saves him, he is weaker.', 7); c.hint('ledge'); });
  }
  /** He stops blocking, steps back onto the ledge of loose stone, and drops flat. */
  drop(e) {
    const g = this.g, c = this.c, p = g.player, d = this.duel;
    if (!d || d.done) return;
    d.done = true; g.combat.clear(); e.cb = null; e.mode = 'crew'; e.pose = null; c.hint(null); p.frozen = true; p.crouch = false; p.loopOverride = 'dead'; p.mortal = false;
    e.yaw = Math.PI / 2; e.root.rotation.y = e.yaw; e.h.play('slam', 1.4);
    g.after(0.7, () => { g.audio.play('thud'); g.audio.play('split'); p.cam.shake = 0.7; g.fx.burst('dust', e.pos.x + 1.6, e.pos.y + 0.2, e.pos.z, 20); });
    c.tell(['On the quarry edge, he does what Bersi will not expect. He stops blocking. He steps backward onto a ledge of loose stone, and when Bersi swings his huge overhead blow, Eirik drops flat.',
      "The hammer hits rock with all of Bersi's weight behind it. The ledge cracks. Bersi stumbles forward. Raven-Feeder hooks his ankle, and Bersi Black-Anvil goes over the quarry edge into the sea."], 10.5)
      .then(() => g.ui.card('Bersi Black-Anvil', "The fifth of Håkon's seven champions is dead.", 5))
      .then(() => { p.frozen = false; this.duel = null; g.audio.setMusic('sorrow'); c.sub('Only two of the seven are left: Ulf Two-Blades and Kettil Red-Hand.', 6); g.after(6.2, () => g.quests.notify('event', 'a6bersi')); });
    g.after(13.5, () => { p.loopOverride = null; p.h.play('atk2', 0.7); g.audio.play('whoosh'); this.fall = { t: 0, x: e.pos.x, y: e.pos.y, z: e.pos.z }; });
  }
  // ---- the beach ----------------------------------------------------------------------------------------------
  light(quiet) {
    const g = this.g, c = this.c, P = this.S.pyre;
    if (this.lit) return;
    this.lit = true; this.fires.push(g.fx.addFire(P.x, P.y + 1.0, P.z, 3.2)); c.act.glowTarget = 0.5;
    if (quiet) return;
    this.busy = true; g.player.h.play('pickup', 0.9); g.audio.play('ignite');
    c.sub('They light the boat. The smoke goes straight up.', 7); g.after(7.5, () => { this.busy = false; g.quests.notify('event', 'a6light'); });
  }

  /** A load: he stands on Skalløy, where this step begins. */
  here(r, at, yaw = 0) { if (r) this.g.player.teleport(at[0], at[1], yaw); }
  // =====================================================================================
  steps = {
    'q_lastforge.harbor'(r) {
      const g = this.g, c = this.c, S = this.S, P = S.pier;
      if (r) { this.here(r, P, Math.PI / 2); return c.setPhase('fday', r); }
      c.fade(() => { g.player.teleport(P[0], P[1], Math.PI / 2); c.setPhase('fday', true); if (g.player.equipped !== 'none') g.player.equip('none');
        return g.ui.card('The Last Forge', 'The last neutral island is Skalløy, the Forge Isle, a place of quarries and furnaces where half the anchors, nails and ship fittings in the North are made.', 8); }, 1.4, 1.4)
        .then(() => c.tell(['Brokk volunteers to go and talk to Gudmund. His nephew Halvar lives on Skalløy. Brokk has not seen him in twelve years.', 'Eirik goes with Brokk, Astrid, Svanhild and a small escort.'], 6.5));
    },
    'q_lastforge.forge'(r) {
      const g = this.g, c = this.c, at = this.S.X(-1.6, -21.4);
      if (r) { this.here(r, at, -Math.PI / 2); return c.setPhase('fday', r); }
      c.fade(() => { g.player.teleport(at[0], at[1], -Math.PI / 2); this.dress('fday'); }, 1.2, 1.2);
    },
    'q_lastforge.gudmund'(r) { const c = this.c; this.here(r, this.S.X(-1.6, -21.4), -Math.PI / 2); c.setPhase('fday', r); },
    'q_lastforge.axe'(r) { const c = this.c; this.here(r, this.S.X(-48, 98), 2.6); c.setPhase('fday', r); },
    'q_lastforge.night'(r) {
      const g = this.g, c = this.c, at = this.S.X(-1.4, -21);
      if (r) { this.here(r, at, -Math.PI / 2); return c.setPhase('fnight', r); }
      c.fade(() => { g.player.teleport(at[0], at[1], -Math.PI / 2); c.setPhase('fnight', true); return g.ui.card('', 'On the last night', 3); }, 1.2, 1.2);
    },
    'q_lastforge.word'(r) { const c = this.c; this.here(r, this.S.X(-1.4, -21), -Math.PI / 2); c.setPhase('fnight', r); },
    'q_anvil.lanes'(r) {
      const g = this.g, c = this.c, S = this.S, at = [S.lanes[0][0] + 9, S.lanes[0][1] + 3];
      const lines = ["Bersi Black-Anvil, the most feared of the seven champions, lands on Skalløy with eighty of Håkon's toughest warriors. They carry axes, iron bars and buckets of pitch.",
        'They have not come to conquer. They have come to destroy the forges, so that the alliance can never repair its ships.',
        "The alliance's small escort and Skalløy's few guards fight in the streets while Astrid and Svanhild get the smiths and their families out toward the hills."];
      if (r) { this.here(r, at, -Math.PI / 2); return c.setPhase('fraid', r); }
      c.fade(() => { g.player.teleport(at[0], at[1], -Math.PI / 2); c.setPhase('fraid', true); return g.ui.card('The Black Anvil', "That same night, Håkon's answer arrives.", 5); }, 1.4, 1.4)
        .then(() => { g.audio.play('horn', { freq: 84, vol: 0.5 }); c.tell(lines, 8.5); });
    },
    'q_anvil.door'(r) {
      const g = this.g, c = this.c, S = this.S; this.here(r, [S.lanes[2][0] + 6, S.lanes[2][1]], Math.PI / 2); c.setPhase('fraid', r); this.dress('fraid'); c.hint(null);
      if (!r) c.tell(['Bersi smashes through the gate of the forge complex. Halvar and his three apprentices are still inside, trying to save the tools.',
        'Bersi is a giant, bigger even than Gorm Stone-Lung, bald and black-bearded. He fights with a war hammer whose head is as big as an anvil. It is said he once killed a horse with one blow.'], 8.5);
    },
    'q_anvil.bersi'(r) { const c = this.c, D = this.S.door; this.here(r, [D[0] + 0.5, D[1] + 2.4], Math.PI / 2); c.setPhase('fraid', r); this.dress('fraid'); this.duelStart(); },
    'q_smith.brokk'(r) {
      const g = this.g, c = this.c, D = this.S.door, at = [D[0] + 1.3, D[1] + 0.3], go = () => c.say('a6_last', null, () => g.quests.notify('event', 'a6last'));
      if (r) { this.here(r, at, -Math.PI / 2); c.setPhase('fdawn', r); return g.after(0.8, go); }
      c.fade(() => { g.player.teleport(at[0], at[1], -Math.PI / 2); c.setPhase('fdawn', true); if (g.player.equipped !== 'none') g.player.equip('none'); }, 1.4, 1.4).then(go);
    },
    'q_smith.speak'(r) {
      const g = this.g, c = this.c, f = this.S.pyre.front, at = [f[0] + 3, f[1] + 2];
      if (r) { this.here(r, at, -2.2); return c.setPhase('fpyre', r); }
      c.fade(() => { g.player.teleport(at[0], at[1], -2.2); c.setPhase('fpyre', true); return g.ui.card("The Smith's Last Words", 'The alliance does not rush off to the next fight. They stay on Skalløy for nine days.', 6.5); }, 1.6, 1.6);
    },
    'q_smith.light'(r) { const c = this.c, f = this.S.pyre.front; this.here(r, f, -2.2); c.setPhase('fpyre', r); },
    'q_smith.halvar'(r) { const c = this.c, f = this.S.pyre.front; this.here(r, f, -2.2); c.setPhase('fpyre', r); if (r) this.light(true); },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase, S = this.S;
    if (!FORGE.includes(ph)) return;
    this.crew([c.npc('brokk')], dt);
    const f = this.fall; // over the quarry edge into the sea
    if (f) { f.t += dt; const e = this.bersi; e.pos.set(f.x + f.t * 9, f.y + f.t * 2.5 - f.t * f.t * 9, f.z); e.root.rotation.z = -f.t * 2.2; e.h.update(dt); if (f.t > 2.4) { e.visible = false; e.root.rotation.z = 0; this.fall = null; g.audio.play('splash', { vol: 0.6 }); } }
    if (g.mode !== 'play') return;
    const near = (at, d) => Math.hypot(p.pos.x - at[0], p.pos.z - at[1]) < d;
    if (q.at('q_lastforge', 'harbor') && !this.met && near(S.harbor, 15)) this.meet();
    if (ph === 'fraid') {
      if (c.battle.sk) c.battle.updateSkirmish(dt);
      else if (q.at('q_anvil', 'lanes') && near(S.lanes[Math.min(2, this.count('q_anvil'))], 8)) this.lane(Math.min(2, this.count('q_anvil')));
      if (q.at('q_anvil', 'door') && !this.doorOn && near(S.door, 24)) this.playDoor();
      const d = this.duel, e = this.bersi;
      if (d && d.quarry && !d.done && e.cb && p.crouch && p.pos.x > S.ledge && Math.abs(p.pos.z - S.quarry[1]) < 20 && e.cb.state === 'windup' && e.dist(p) < 7) this.drop(e);
    }
  }
}
