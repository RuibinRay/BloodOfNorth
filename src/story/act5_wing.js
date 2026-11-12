// Act V away from home, by sea: Gannet Rock and Old Thrand ("The Ring of Halfdan"), and Vængr ("The Wing Isle":
// Svanhild at the harbor, Jarl Jorund, sixty berserkers in the forest settlement, Skarde Bear-Maw on the holmgang
// ground, and the voyage home). Gannet Rock and Vængr are the small islands of the sandbox, so the march and the
// battle are short. See act5_home.js.
import { ravenModel } from '../entities/wildlife.js';
import { AT_SEA } from '../world/layout.js';
import { CAST5, A5, ZERK } from '../data/act5.js';
import { FOES } from './champions.js';
import { A4Part, TEN } from './act4_home.js';

const ISLE = ['gday', 'vday', 'vfight', 'vholm', 'a5deck'];
const LIE = 'I was there, you know. At the farm in the snow. I held the torches. Your father begged at the end. Squealed like a pig.';

export class A5Wing extends A4Part {
  constructor(game, core) { super(game, core); this.zerks = []; this.birds = []; this.fires = []; }
  get IS() { return this.g.world.main.isles5.stages; }
  build() {
    const g = this.g, c = this.c;
    for (const id of ['thrand', 'jorund']) { const n = g.addNPC(id, CAST5[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    this.skarde = g.addNPC('skarde', { name: 'Skarde Bear-Maw', look: FOES.find((f) => f.id === 'skarde').look }); this.skarde.visible = false;
    for (let i = 0; i < 8; i++) { const n = g.addNPC('zerk' + i, { name: 'A berserker', look: ZERK[i % ZERK.length], runSpeed: 4.4 }); n.visible = false; n.walkSpeed = 3.6; this.zerks.push(n); }
    for (let i = 0; i < 12; i++) { const m = ravenModel(0xe9e6df, 0xd8b040); m.scale.setScalar(0.9); m.visible = false; g.scene.add(m); this.birds.push(m); } // so many seabirds that the sky is noisy with them
    this.puffin = ravenModel(0x1c1c20, 0xe07a2a); this.puffin.scale.setScalar(0.6); this.puffin.visible = false; g.scene.add(this.puffin);
  }
  clear(phase) {
    const g = this.g, c = this.c, IS = this.IS;
    IS.gannet.set(phase === 'gday'); IS.vaengr.set(phase === 'vday' || phase === 'vfight' || phase === 'vholm');
    for (const n of [c.npc('thrand'), c.npc('jorund'), this.skarde, ...this.zerks]) n.visible = false;
    for (const m of this.birds) m.visible = phase === 'gday'; this.puffin.visible = phase === 'gday';
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    this.duel = null; this.busy = false; this.joined = false; this.shotT = 3; this.skarde.cb = null;
    if (ISLE.includes(phase) && phase !== 'vfight' && phase !== 'vholm' && g.combat.active) g.combat.clear();
  }
  // ---- the sailings ------------------------------------------------------------------------------
  sailTo(title, text, phase, at, key) {
    const g = this.g, c = this.c, p = g.player;
    c.home5.busy = true; p.frozen = true;
    g.ui.fade(true, 1.2).then(() => g.ui.card(title, text, text.length > 60 ? 9 : 4.5)).then(() => { c.setPhase(phase, true); p.teleport(at[0], at[1], at[2]); this.dress(phase); g.quests.notify('event', key); return g.ui.fade(false, 1.2); }).then(() => { p.frozen = false; });
  }
  toGannet() { const G = this.IS.gannet; this.sailTo('Gannet Rock', 'Gannet Rock is a tower of stone white with bird droppings, so many seabirds wheeling over it that the sky is noisy with them.', 'gday', [...G.land, Math.PI], 'a5gannet'); }
  toVaengr() { const V = this.IS.vaengr; this.sailTo('Vængr', 'The Wing Isle', 'vday', [V.pier[0] - 1, V.pier[1], -Math.PI / 2], 'a5vaengr'); }
  /** Who is where on Gannet Rock, on Vængr, or on the Sea-Raven's deck coming home. */
  dress(name) {
    const g = this.g, c = this.c, p = g.player, w = g.world, IS = this.IS, wg = this.at('q_wing'), J = c.battle.jarn;
    const P = (id, x, z, face, loop, hold) => this.put(id, x, z, face, loop, hold);
    if (name === 'gday') {
      const G = IS.gannet, d = G.door, t = P('thrand', d.x + 0.4, d.z + 1.5, [d.x - 2, d.z + 4], 'sit'); t.talk = () => c.talkTo('thrand');
      this.puffin.position.set(d.x + 1.5, w.groundAt(d.x + 1.5, d.z + 1.2) + 0.02, d.z + 1.2); this.puffin.rotation.y = 2.4; for (const k of this.puffin.userData.wings) k.rotation.z = 0; this.puffin.userData.wings[0].rotation.z = -1.3; this.puffin.userData.wings[1].rotation.z = 1.3;
      P('leif', p.pos.x + 1.4, p.pos.z + 1, 0).follow(p, { dist: 3 });
      return;
    }
    if (name === 'a5deck') { // the voyage home: the greatest sword-fighter in the islands, with her head over the side
      const SS = w.main.sea, S = (dx, dz) => [AT_SEA.x + dx, AT_SEA.z + dz];
      SS.set(true); SS.knarr.set(false);
      P('leif', ...S(1.2, -6.6), 0).keepDry = true; P('svanhild', ...S(-1.9, -0.6), -Math.PI / 2, 'kneel').keepDry = true; P('astrid', ...S(1.5, -1.6), 0.4).h.hold('L', 'bow'); P('gisli', ...S(-0.6, -5.8), 0.6);
      [[-1.6, 1.3], [1.6, 1.3], [-1.6, 3.2], [1.6, 5.0]].forEach(([dx, dz], i) => P(TEN[i], ...S(dx, dz), dx > 0 ? -Math.PI / 2 : Math.PI / 2, 'sit'));
      return;
    }
    // ---- Vængr ----
    const V = IS.vaengr, [px, pz] = V.pier, [hx, hz] = V.holm, guards = (list) => list.forEach(([x, z, face], i) => { const n = P(J[i], x, z, face, 'guard', 'sword'); n.name = "One of Jorund's guard"; n.h.hold('L', 'shield'); n.talk = () => n.say('Trained since childhood.', 2.5); }); // (game)
    const sv = (x, z, face) => { const n = P('svanhild', x, z, face); n.h.hold('R', 'sword'); return n; };
    if (name === 'vday') {
      sv(px - 6, pz + 0.4, [px, pz]); P('jorund', V.hall[0], V.hall[1], [V.hall[0] + 6, V.hall[1] - 4]); guards([[V.hall[0] - 2.4, V.hall[1] + 1.2, 1.2], [V.hall[0] + 2.2, V.hall[1] + 1.6, 0.8]]);
      P('leif', px + 3, pz - 1, -1.4); P('astrid', px + 1, pz + 1.6, -1.6).h.hold('L', 'bow'); TEN.forEach((id, i) => { const n = P(id, px + 4 + (i % 3) * 1.4, pz - 0.8 + Math.floor(i / 3) * 1.4, -Math.PI / 2); n.h.hold('L', 'shield'); n.h.hold('R', 'spear'); });
      return;
    }
    for (const [x, z] of V.burnt) this.fires.push(g.fx.addFire(x, w.groundAt(x, z) + 1.4, z, 2.4)); // two fishing villages, burning
    if (name === 'vfight') {
      const [vx, vz] = V.village, here = wg >= 4;
      TEN.forEach((id, i) => { const n = P(id, here ? vx - 6 + i * 2.4 : p.pos.x + 2 + (i % 3) * 1.6, here ? vz - 9 - (i % 2) * 1.6 : p.pos.z + 2 + Math.floor(i / 3) * 1.6, here ? Math.PI : 0, here ? 'guard' : null, 'spear'); n.h.hold('L', 'shield'); if (!here) n.follow(p, { dist: 3 + i * 0.7 }); });
      const l = P('leif', p.pos.x - 1.6, p.pos.z + 1.4, 0, null, 'seax'), a = P('astrid', p.pos.x + 1.6, p.pos.z + 1.6, 0); a.h.hold('L', 'bow'); l.follow(p, { dist: 2.6 }); a.follow(p, { dist: 3.4 });
      P('jorund', V.hall[0], V.hall[1], 0.6); return;
    }
    // the holmgang ground: a square of hazel posts by the shore
    const sk = this.skarde, done = wg >= 7;
    if (!done) { this.put(sk, hx, hz, Math.atan2(p.pos.x - hx, p.pos.z - hz), 'guard', 'daneaxe'); sk.talk = null; this.zerks.slice(0, 2).forEach((n, i) => { this.put(n, hx - 6.5, hz - 3 + i * 6, Math.PI / 2, 'guard', 'axe'); n.talk = null; }); }
    else { this.put(sk, hx, hz, 0); sk.die(true); P('jorund', hx + 6.4, hz - 4.4, [hx, hz]); guards([[hx + 7.4, hz - 7.4, [hx, hz]], [hx + 9.6, hz - 6.2, [hx, hz]]]); } // behind him, so he is the one you reach first
    sv(hx + 6.4, hz + (done ? 2.6 : 5), [hx, hz]); P('leif', hx + 9, hz + 6, [hx, hz], null, 'seax'); P('astrid', hx + 10.4, hz + 3.4, [hx, hz]).h.hold('L', 'bow');
    TEN.forEach((id, i) => { const n = P(id, hx + 11 + (i % 2) * 1.6, hz - 2 + i * 1.5, [hx, hz], 'guard', 'spear'); n.h.hold('L', 'shield'); });
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!ISLE.includes(c.phase)) return false;
    if (id === 'thrand') { if (q.at('q_ring', 'thrand')) c.say('a5_thrand', n, () => { g.player.loopOverride = null; q.notify('talk', 'thrand'); }); else n.say("Your mother had her father's eyes.", 4); return true; }
    if (id === 'svanhild' && q.at('q_wing', 'svanhild')) { c.say('a5_svanhild', n, () => q.notify('talk', 'svanhild')); return true; }
    if (id === 'jorund' && q.at('q_wing', 'jorund')) { c.say('a5_jorund', n, () => q.notify('talk', 'jorund')); return true; }
    if (id === 'jorund' && q.at('q_wing', 'join')) { c.say('a5_join', n, () => q.notify('talk', 'jorund')); return true; }
    if (id === 'svanhild' && q.at('q_wing', 'sick')) { c.say('a5_sick', n, () => q.notify('talk', 'svanhild')); return true; }
    const line = { svanhild: c.phase === 'a5deck' ? 'Not a word.' : 'I would rather know whether you keep your promises.', jorund: 'I have kept Vængr free for thirty years by trusting no one.', leif: c.phase === 'a5deck' ? 'I said nothing.' : '...', astrid: '...' }; // (game: from the story's sentences)
    if (line[id]) { n.say(line[id], 3); return true; }
    if (/^v\d/.test(id)) { n.say('...', 2); return true; }
    return false;
  }
  cues = {
    floor() { this.g.player.loopOverride = 'sit'; },
    landed() { const g = this.g, V = this.IS.vaengr; g.audio.play('horn', { freq: 84, vol: 0.5 }); for (const [x, z] of V.burnt) this.fires.push(g.fx.addFire(x, g.world.groundAt(x, z) + 1.4, z, 2.4)); },
  };

  // ---- the forest settlement -----------------------------------------------------------------------
  hold() {
    const g = this.g, c = this.c, p = g.player, V = this.IS.vaengr, R = { ...A5.zerk, pool: this.zerks, dress: (e) => { e.h.hold('L', null); e.h.hold('R', ['axe', 'daneaxe', 'axe', 'club'][this.zerks.indexOf(e) % 4]); } };
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    TEN.forEach((id, i) => { const n = c.npc(id); if (n.dist(p) > 14) n.teleport(p.pos.x - 6 + i * 2.4, p.pos.z + 3 + (i % 2) * 1.6, Math.PI); n.stop(); n.setLoop('guard'); });
    c.npc('leif').stop(); c.npc('astrid').stop();
    c.battle.startSkirmish([...TEN, 'leif'], V.north, R.n, R.atOnce, () => { g.audio.setMusic('sorrow'); g.quests.notify('event', 'a5held'); }, R);
    g.audio.setMusic('raid'); g.ui.questBanner('Vængr', 'the third village'); c.hint('deckHold');
    c.sub('The fight runs through a forest settlement of log houses, through smoke and screaming.', 7);
  }
  /** Svanhild arrives with thirty guards (three). */
  join() {
    const g = this.g, c = this.c, p = g.player, k = c.battle.sk, J = c.battle.jarn, V = this.IS.vaengr;
    this.joined = true;
    const s = this.put('svanhild', V.village[0] - 16, V.village[1] + 14, [V.village[0], V.village[1]], 'guard', 'sword'); s.talk = null;
    const add = [s, ...[0, 1, 2].map((i) => { const n = this.put(J[i], V.village[0] - 18 + i * 1.6, V.village[1] + 16 + i, [V.village[0], V.village[1]], 'guard', 'sword'); n.name = "One of Jorund's guard"; n.h.hold('L', 'shield'); return n; })];
    add.forEach((n, i) => { const hx = p.pos.x - 4 + i * 2.6, hz = p.pos.z - 2.5; n.busy = null; n.engaged = false; n.home = [hx, hz, Math.PI]; n.goTo(hx, hz, { run: true, onArrive: (o) => { o.yaw = Math.PI; o.setLoop('guard'); } }); k.allies.push(n); });
    c.sub('Svanhild arrives with thirty guards. She fights beside Eirik, and he sees that she is the best sword fighter he has ever seen: every cut is perfect, every step is placed. Astrid shoots berserkers who keep coming with three arrows in them.', 11);
  }
  // ---- the holmgang ground: Skarde Bear-Maw -----------------------------------------------------------
  duelStart() {
    const g = this.g, c = this.c, p = g.player, sk = this.skarde, def = FOES.find((f) => f.id === 'skarde'), R = A5.skarde, s = c.npc('svanhild'), Z = this.zerks;
    if (this.duel) return;
    this.duel = { lied: false };
    c.sub("Svanhild steps forward. Skarde's guards rush her, and she is fighting four at once. Eirik steps into the square instead.", 8);
    s.setLoop(null); s.fight(Z[0], { lethal: 0 }); Z[0].setLoop(null); Z[0].fight(s, { lethal: 0 }); Z[1].setLoop(null); Z[1].fight(s, { lethal: 0 }); // seen, not played
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    const cb = structuredClone(def.cb); cb.moves = cb.moves.filter((m) => m.id !== 'lie'); // the lie is told once, by the story
    g.combat.add(sk, { ...cb, hp: R.hp, dmg: R.dmg, boss: true, smart: true, onDown: (e) => this.skardeFalls(e), phases: [{ at: R.lieAt, do: (e) => this.lie(e) }] });
    g.audio.setMusic('raid'); g.ui.questBanner('third of the seven · the holmgang ground, Vængr', 'Skarde Bear-Maw');
    g.after(8.5, () => c.sub("Skarde is the strongest man Eirik has ever faced. His axe splits Eirik's shield on the first blow. He laughs and talks the whole time.", 8));
  }
  /** The lie, the rage, the mud, his father's voice. */
  lie(e) {
    const g = this.g, c = this.c, p = g.player, R = A5.skarde;
    if (this.duel.lied) return;
    this.duel.lied = true; p.frozen = true; e.h.play('cheer', 1.4); c.sub(LIE, 8, 'Skarde Bear-Maw');
    g.after(8.2, () => {
      c.sub("It is a lie. Eirik saw his father die. But the rage comes up through him like fire, and he does exactly what Skarde wants. He charges, swinging wildly, defense forgotten. Skarde's axe handle cracks him across the face and sends him sprawling. Stormguard does not come; he is too angry to reach it.", 13);
      p.yaw = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z); ['atk1', 'atk2', 'atk3'].forEach((k, i) => g.after(1 + i * 0.7, () => { p.h.play(k, 0.6); g.audio.play('whoosh', { vol: 0.5 }); }));
      g.after(3.6, () => { e.h.play('shove', 0.7); g.audio.play('hurt'); g.audio.play('thud'); p.cam.shake = 0.5; p.health = Math.max(25, p.health - 30); p.h.play('fall', 0.9, { onEnd: () => { p.loopOverride = 'dead'; } }); });
    });
    g.after(21.5, () => c.sub("On his back in the mud, blood in his eyes, Eirik hears his father's voice.", 5));
    g.after(26.6, () => c.sub('A blade may save your life, but wisdom decides when to draw it.', 6.5, 'Ragnar'));
    g.after(33.4, () => { p.loopOverride = null; p.frozen = false; c.hint('waitHim'); c.sub('He breathes. He gets up slowly. He stops attacking. He waits.', 6); });
    g.after(40, () => { if (this.duel) c.sub('Skarde comes at him again and again, and Eirik gives ground, blocks, slips aside, lets the giant tire himself out on air. The madness that makes a berserker so terrible also burns him out.', 10); });
  }
  skardeFalls(e) {
    const g = this.g, c = this.c, p = g.player, Z = this.zerks, V = this.IS.vaengr, s = c.npc('svanhild');
    g.combat.clear(); e.cb = null; p.mortal = false; g.slowT = 0.9; p.wardFlash(e.pos); c.hint(null); this.duel = null; g.audio.setMusic('sorrow');
    c.sub("After a long time, Skarde's swings get slower. His breath rasps. Then he makes one huge, desperate overhead swing. Stormguard flares. Eirik steps inside it and drives Raven-Feeder up under the bear-skull helm.", 11);
    e.mode = 'idle'; e.die();
    g.after(11.4, () => g.ui.card('Skarde Bear-Maw', "The third of Håkon's seven champions is dead.", 5).then(() => {
      c.sub('The remaining berserkers, their madness broken, flee to their ships.', 6);
      s.stop(); s.setLoop(null); for (const n of Z.slice(0, 2)) { n.stop(); n.setLoop(null); n.goTo(V.north[0][0], V.north[0][1], { run: true, onArrive: (o) => { o.visible = false; } }); }
      g.after(6.4, () => { g.quests.notify('event', 'a5skarde'); this.dress('vholm'); }); // Jorund comes to the holmgang ground
    }));
  }

  // =====================================================================================
  steps = {
    'q_ring.hut'(r) { const g = this.g, c = this.c; c.setPhase('gday', r); if (r) { g.player.teleport(...this.IS.gannet.land, Math.PI); this.dress('gday'); } else c.sub('Thrand lives in a turf hut near the top. He is ancient, half blind, and he keeps a pet puffin.', 8); },
    'q_ring.thrand'(r) { const g = this.g, c = this.c; c.setPhase('gday', r); if (r) { g.player.teleport(471.6, 1129.4, Math.PI); this.dress('gday'); } },
    'q_wing.svanhild'(r) { const g = this.g, c = this.c; c.setPhase('vday', r); if (r) { g.player.teleport(this.IS.vaengr.pier[0] - 1, this.IS.vaengr.pier[1], -Math.PI / 2); } },
    'q_wing.jorund'(r) { const g = this.g, c = this.c; c.setPhase('vday', r); if (r) g.player.teleport(this.IS.vaengr.pier[0] - 8, this.IS.vaengr.pier[1], -Math.PI / 2); },
    'q_wing.village'(r) {
      const g = this.g, c = this.c, V = this.IS.vaengr;
      if (r) g.player.teleport(V.hall[0] + 4, V.hall[1] - 3, 0.9);
      c.setPhase('vfight', r); if (!r) this.dress('vfight');
      c.sub('He, Astrid, Leif and twenty Ravenhold warriors march to defend the third village.', 7);
    },
    'q_wing.hold'(r) { const g = this.g, c = this.c, V = this.IS.vaengr; if (r) g.player.teleport(V.village[0], V.village[1] + 4, Math.PI); c.setPhase('vfight', r); this.dress('vfight'); this.hold(); },
    'q_wing.holm'(r) {
      const g = this.g, c = this.c, V = this.IS.vaengr;
      if (r) g.player.teleport(V.village[0], V.village[1] + 4, 2.4);
      c.setPhase('vholm', r); if (!r) this.dress('vholm');
      c.sub("The battle ends on Vængr's holmgang ground, a square of hazel posts by the shore where men fight formal duels to settle disputes. Skarde stands in the middle of it with his axe and roars a challenge.", 11);
    },
    'q_wing.skarde'(r) { const g = this.g, c = this.c, V = this.IS.vaengr; if (r) g.player.teleport(V.holm[0] + 7, V.holm[1] + 1, -Math.PI / 2); c.setPhase('vholm', r); if (r) this.dress('vholm'); this.duelStart(); },
    'q_wing.join'(r) { const g = this.g, c = this.c, V = this.IS.vaengr; if (r) g.player.teleport(V.holm[0] + 3, V.holm[1] + 1, -Math.PI / 2); c.setPhase('vholm', r); if (r) this.dress('vholm'); },
    'q_wing.sick'(r) {
      const g = this.g, c = this.c, at = () => g.player.teleport(AT_SEA.x + 0.3, AT_SEA.z + 2.6, Math.PI);
      if (r) { c.setPhase('a5deck', r); return at(); }
      c.fade(() => { c.setPhase('a5deck', true); at(); if (g.player.equipped !== 'none') g.player.equip('none'); }, 1.4, 1.4);
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase;
    if (!ISLE.includes(ph)) return;
    if (ph === 'gday') { const G = this.IS.gannet, t = (this.bt = (this.bt || 0) + dt); this.birds.forEach((m, i) => { const a = t * (0.5 + (i % 4) * 0.12) + i * 1.7, r = 12 + (i % 5) * 5, f = Math.sin(t * 6 + i) * 0.7; m.position.set(G.top[0] + Math.cos(a) * r, 26 + (i % 6) * 2.4 + Math.sin(a * 0.7) * 2, G.top[1] + Math.sin(a) * r); m.rotation.y = -a; m.userData.wings[0].rotation.z = f; m.userData.wings[1].rotation.z = -f; });
      if (g.mode === 'play' && ((this.cryT = (this.cryT || 0) - dt) <= 0)) { this.cryT = 2.5 + Math.random() * 3; g.audio.play('bird', { vol: 0.35 }); } }
    if (g.mode === 'cutscene') return;
    const k = c.battle.sk;
    if (k && ph === 'vfight') {
      c.battle.updateSkirmish(dt);
      if (c.battle.sk) {
        if (!this.joined && k.spawned >= A5.zerk.guardsAt) this.join();
        if ((this.shotT -= dt) <= 0) { this.shotT = A5.zerk.astrid[0]; const live = k.live.filter((e) => !e.dead && e.cb), e = live[(Math.random() * live.length) | 0], a = c.npc('astrid'); if (e) { a.face(e.pos.x, e.pos.z); a.h.play('shoot', 0.8); g.audio.play('bow', { vol: 0.6 }); g.after(0.45, () => { if (!e.dead && e.cb) g.combat.hurt(e, A5.zerk.astrid[1], 20); }); } }
      }
    }
  }
}
