// Act IV at Ravenhold: the opening of "The Golden Voyage" (two quiet years, the ship from Solvik, Ari), the boats of
// refugees in "Six Islands Burning", "The Council of Six", the letter and the ribbon of "The Betrayal at Hedeby
// Sound", and "Driftwood". The voyage is in act4_voyage.js, Wessex in act4_wessex.js, the burned islands in
// act4_six.js and Hedeby Sound in act4_sound.js. See act2.js for what the mainland acts share.
import { makeShip } from '../world/props.js';
import { CAST3 } from '../data/act3.js';
import { CAST4, KINGS, RIBBON_LINES } from '../data/act4.js';
import { PHASES } from './act2.js';

/** What every part of Act IV shares. */
export class A4Part {
  constructor(game, core) { this.g = game; this.c = core; }
  get st() { return this.g.state; }
  /** How far a quest has come: -1 not begun, its step while active, 99 when done. */
  at(id) { const q = this.st.quests[id]; return !q ? -1 : q.status === 'done' ? 99 : q.step; }
  count(id) { const q = this.st.quests[id]; return q && q.status === 'active' ? q.count : 0; }
  /** Stand someone at a point of the world, facing a yaw or a point [x, z]. */
  put(id, x, z, face, loop, hold) {
    const n = typeof id === 'string' ? this.c.npc(id) : id;
    if (n.dead) n.revive();
    n.visible = true; n.mode = 'idle'; n.cb = null; n.crouch = false; n.held = false; n.pose = null; n.keepDry = false;
    n.teleport(x, z, typeof face === 'number' ? face : face ? Math.atan2(face[0] - x, face[1] - z) : n.yaw);
    n.setLoop(loop || null); n.h.hold('R', hold || null); n.h.hold('L', null); n.faceT = null;
    if (typeof id === 'string') n.talk = () => this.c.talkTo(id);
    return n;
  }
  /** Someone the story holds still where the ground does not (a masthead, the water, a wall to sit on). */
  fix(n, x, y, z, yaw, pose) { n.visible = true; n.mode = 'crew'; n.pos.set(x, y, z); n.yaw = yaw; n.root.rotation.y = yaw; n.pose = pose || null; return n; }
  /** Keep the story's held people breathing. */
  crew(list, dt) { for (const n of list) if (n.visible && n.mode === 'crew' && !n.dead) { n.h.setLoop(n.pose || null); n.h.setLocomotion(0, false); n.h.update(dt); } }
  dyn() { return undefined; }
  talk() { return false; }
  clear() {}
  update() {}
}

export const TEN = ['v0', 'v2', 'v3', 'v5', 'v7', 'v9']; // Ravenhold's best (six stand in for ten)
const KING_IDS = ['eystein', 'ragnvald', 'hallvard', 'aslak', 'svein'];
const IDLE = { freydis: 'Taxes.', hrefna: 'Goat urine. It has always been goat urine.', brokk: 'The sea is for fish and fools.', envoy: 'King Eystein is afraid Håkon will take it.' }; // (game: built from the story's own sentences)

export class A4Home extends A4Part {
  constructor(game, core) { super(game, core); this.heard = {}; this.fires = []; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world;
    for (const id of ['envoy', 'hrefna', 'peddler', ...KING_IDS]) { const n = g.addNPC(id, CAST4[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    if (this.st.quests.q_gold) { // Ari is sixteen now, and taller than his father
      g.scene.remove(c.npc('ari').root);
      const n = g.addNPC('ari', { ...CAST3.ari, role: "Hauk's son, sixteen", look: { ...CAST3.ari.look, scale: 1.03, build: 0.96 } }); n.visible = false; n.talk = () => c.talkTo('ari');
    }
    this.solShip = makeShip({ L: 16, B: 4, D: 1.4, rise: 1.9, seed: 91, sail: false, shields: false, mast: 8 });
    { const [x, z] = c.B(4.4, 239); this.solShip.position.set(x, -0.15, z); this.solShip.visible = false; g.scene.add(this.solShip); }
    w.addInteractable({ id: 'a4sail', x: c.B(-2.2, 236)[0], z: c.B(-2.2, 236)[1], r: 3.6, priority: 3, label: 'Board the Sea-Raven', enabled: () => q.at('q_gold', 'sail') || q.at('q_sound', 'convoy'), use: () => (q.at('q_gold', 'sail') ? this.sail() : this.convoy()) });
    w.addInteractable({ id: 'a4kneel', pos: () => c.npc('hauk').pos, x: 0, z: 0, r: 2.8, priority: 3, label: 'Kneel beside him', enabled: () => q.at('q_drift', 'hauk') && this.haukDown && !this.kneeling, use: () => this.kneel() });
  }
  clear(phase) {
    const g = this.g, c = this.c, at = PHASES[phase] && PHASES[phase].at;
    for (const id of ['envoy', 'hrefna', 'peddler', ...KING_IDS]) c.npc(id).visible = false;
    this.solShip.visible = false; this.envoyOn = false;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    if (['sea', 'wessex', 'six', 'hedeby'].includes(at)) c.W.stages.searaven.set(false); // she is away
    if (phase.startsWith('a4') || ['sea', 'wessex', 'six', 'hedeby'].includes(at)) c.act.glowTarget = phase === 'a4burn' ? 0.35 : 0;
  }
  /** Ravenhold, where Act IV has brought it. */
  dressed(name) {
    if (!name.startsWith('a4') || PHASES[name].at) return;
    const c = this.c, g = this.g, put = (id, s) => c.post(id, s), gd = this.at('q_gold'), T = c.sea.town;
    c.npc('grjotgard').visible = false;                            // he did not come home from Jarnøy
    if (PHASES[name].day) put('v6', [-0.9, 244, 0.2, 'fish', 'rod']); // the village smith still goes fishing
    const folk = (spots, name2, loop) => T.forEach((n, i) => { if (!spots[i]) return; n.name = name2; put(n.id, [...spots[i], loop && i % 2 ? loop : null]); });
    if (name === 'a4quiet') {
      put('brokk', [-65.3, 149.4, [-64.2, 149.4], 'hammer', 'hammer']);
      put('freydis', [1.6, 191.6, [-1.4, 189.8]]); put('leif', [-1.4, 189.8, [1.6, 191.6], 'talk']);
      put('ingrid', [-32.6, 118.8, [-35.4, 120.4]]); put('hrefna', [-35.4, 120.4, [-32.6, 118.8], 'talk']);
      put('astrid', [9, 128, 2.6]).h.hold('L', 'bow'); put('gisli', [4.4, 224.6, 3.4]); put('ari', [56.4, 124.6, [58, 127]]);
      put('torvald', [98, 46, [98, 38]]).h.hold('R', 'maul');
      TEN.forEach((id, i) => { const n = put(id, [98 + (i - 2.5) * 1.2, 38.4, 0, 'guard']); n.h.hold('L', 'shield'); n.h.hold('R', 'spear'); });
      if (gd >= 1) { put('envoy', [0.9, 217, Math.PI]); this.solShip.visible = true; }
      if (gd >= 3) { // the escort musters on the strand
        TEN.forEach((id, i) => { const n = put(id, [-8 + (i % 3) * 2.4, 213 + (i > 2 ? 2.4 : 0), 0]); n.h.hold('L', 'shield'); n.h.hold('R', 'spear'); });
        put('torvald', [4.4, 215, 0]).h.hold('R', 'maul'); put('astrid', [6.4, 217, -0.3]).h.hold('L', 'bow'); put('ingrid', [7.6, 214.6, -0.4]); put('leif', [-1.8, 229.6, Math.PI]);
        put('ari', [1.6, 224.4, 0]); put('hauk', [3.4, 221, [1.6, 224.4]]); put('bjorn', [-11, 211, 0.6]); put('freydis', [-12.6, 212.6, 0.8]);
      }
    }
    if (name === 'a4refuge') { // boatloads of refugees at the pier
      folk([[0.6, 226, Math.PI], [-0.8, 222, Math.PI], [1.0, 218, Math.PI], [-2, 214, 2.6], [3, 212, -2.8], [-5, 210, 2.2], [6, 209, -2.4], [0, 207, Math.PI]], 'A refugee', 'carry');
      put('freydis', [1.6, 210.4, 0]); put('leif', [-1.6, 231, Math.PI]); put('gisli', [1.2, 233, Math.PI]); put('ingrid', [-6, 206, 0.4]); put('brokk', [-65.3, 149.4, [-64.2, 149.4], 'hammer', 'hammer']);
    }
    if (name === 'a4frost') { // the six kings before Bjorn's longhouse
      const t = [-4, 128];
      put('eystein', [-7.6, 126.5, t]); put('ragnvald', [-4.4, 126.2, t, 'talk']); put('hallvard', [-1.2, 126.5, t]); put('aslak', [-7.4, 130.0, t]); put('svein', [-0.8, 130.0, t]); put('hroald', [-4.2, 130.6, t]);
      put('bjorn', [1.6, 128, t]); put('torvald', [3.8, 131.2, t]).h.hold('R', 'maul'); put('astrid', [4.6, 126.2, t]).h.hold('L', 'bow'); put('leif', [5.8, 129, t]); put('ingrid', [5.2, 132.6, t]);
      put('signe', [-2.5, 122.6, t]); put('freydis', [-104, 150, [-130, 158]]); put('brokk', [-65.3, 149.4, [-64.2, 149.4], 'hammer', 'hammer']); put('hauk', [9, 134, t]); put('ari', [10.4, 132.6, t]);
      folk([[-132, 157, 1.2], [-136, 155, -1.6], [-147, 161.6, 1.4], [-134, 173, 0.2], [-126, 162, -2], [-150, 152, 0.8], [-20, 160, 2], [14, 162, -1.4]], 'A refugee', 'sit');
      TEN.forEach((id, i) => put(id, [-14 + i * 5.6, 141 + (i % 2) * 3, Math.PI]));
    }
    if (name === 'a4week') { put('torvald', [-113, 147, -1.6]).h.hold('R', 'maul'); put('peddler', [-128, 150, 1.5]); }
    if (name === 'a4sail') { // the convoy loads
      folk([[0.6, 224, 0], [-0.8, 220, 0], [1.0, 228, 0], [-2, 216, 0.4], [3, 214, -0.4], [-5, 212, 0.2], [6, 211, -0.2], [0, 232, 0]], 'A refugee', 'carry');
      put('leif', [-1.8, 229.6, Math.PI]); put('astrid', [6.4, 217, -0.3]).h.hold('L', 'bow'); put('ingrid', [7.6, 214.6, -0.4]); put('ari', [4.4, 219.6, 0]); put('gisli', [1.2, 233, Math.PI]);
      put('bjorn', [-11, 211, 0.6]); put('freydis', [-12.6, 212.6, 0.8]); put('hauk', [3.2, 221.6, [4.4, 219.6]]); put('brokk', [-65.3, 149.4, [-64.2, 149.4], 'hammer', 'hammer']);
      TEN.slice(0, 4).forEach((id, i) => { const n = put(id, [-8 + i * 2.4, 213, 0]); n.h.hold('L', 'shield'); n.h.hold('R', 'spear'); });
    }
    if (name === 'a4burn' || name === 'a4dark') { // what Kettil left
      const dark = name === 'a4dark';
      put('freydis', [0.5, 205.6, 0]); put('bjorn', [0.5, 119.7, 0, 'sit']); put('signe', [-1.6, 121.4, [0.5, 119.7]]); put('hrefna', [-6, 202.6, 0.6]); put('brokk', [-9, 203.4, 0.4]).h.hold('R', 'hammer');
      put('hauk', [0.4, 224.6, dark ? 0.4 : 0, dark ? 'mourn' : null]); put('leif', [-3.4, 214.4, Math.PI]); put('ingrid', [3.6, 215.2, Math.PI]); put('astrid', [5.6, 216.4, Math.PI]); put('gisli', [-5.2, 216, Math.PI]);
      [['v1', 47, 208, 'mourn'], ['v3', 60, 206.4, null], ['v5', 71, 203, 'mourn'], ['v8', -14, 200, null], ['v0', 12, 204, null]].forEach(([id, dx, dz, loop]) => put(id, [dx, dz, [62, 212], loop]));
      for (const [dx, dz, s] of [[50, 215, 1.1], [64, 212, 1.4], [78, 207, 1.0], [1, 246, 0.9]]) { const [x, z] = c.B(dx, dz); this.fires.push(g.fx.addFire(x, Math.max(1.2, g.world.groundAt(x, z) + 0.5), z, dark ? s * 0.6 : s)); }
    }
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests, ph = c.phase;
    if (!ph || !ph.startsWith('a4') || PHASES[ph].at) return false;
    if (id === 'torvald' && q.at('q_gold', 'torvald')) { c.say('a4_years', n, () => q.notify('talk', 'torvald')); return true; }
    if (id === 'envoy' && q.at('q_gold', 'envoy')) { this.envoy(); return true; }
    if (id === 'ari' && q.at('q_gold', 'ari')) { c.say('a4_ari', n, () => q.notify('talk', 'ari')); return true; }
    if (id === 'freydis' && q.at('q_six', 'refugees')) { c.say('a4_refugees', n, () => q.notify('talk', 'freydis')); return true; }
    if (id === 'bjorn' && q.at('q_council', 'speak')) { c.say('a4_speak', n, () => q.notify('talk', 'bjorn')); return true; }
    if (id === 'eystein' && q.at('q_council', 'token')) { c.say('a4_token', n, () => q.notify('talk', 'eystein')); return true; }
    if (KINGS[id] && ph === 'a4frost') { c.sub(KINGS[id], 6.5); if (q.at('q_council', 'kings') && !this.heard[id]) { this.heard[id] = true; q.notify('event', 'a4king'); } return true; }
    if (id === 'freydis' && q.at('q_drift', 'freydis')) { c.say('a4_gate', n, () => q.notify('talk', 'freydis')); return true; }
    if (ph === 'a4burn' || ph === 'a4dark' || ph === 'a4week') { n.say('...', 2); return true; }
    if (/^kp/.test(id)) { n.say('We heard Ravenhold takes people in.', 3.5); return true; } // (game: from the story's sentence)
    if (IDLE[id] && (ph === 'a4quiet' || id === 'hrefna' || id === 'envoy')) { n.say(IDLE[id], 3.5); return true; }
    if (ph === 'a4frost' && id === 'bjorn') { n.say('Listen to them first.', 3); return true; } // (game)
    return false;
  }
  cues = {
    ariyes() { const a = this.c.npc('ari'); a.h.play('cheer', 1.2); },
    agree() { for (const id of [...KING_IDS, 'hroald', 'bjorn']) this.c.npc(id).h.play('cheer', 1.2); this.g.audio.play('questDone'); },
  };
  envoy() { const c = this.c; if (this.envoyOn) return; this.envoyOn = true; c.say('a4_envoy', c.npc('envoy'), () => { this.envoyOn = false; this.g.quests.notify('event', 'a4envoy'); }); }

  // ---- the two sailings --------------------------------------------------------------------
  sail() {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true;
    g.ui.fade(true, 1.2).then(() => g.ui.card("Fafnir's Bed", 'The most valuable cargo Solvik has ever sent', 4.5)).then(() => { c.setPhase('a4sea', true); c.voy.aboard(); return g.ui.fade(false, 1.2); })
      .then(() => { p.frozen = false; g.quests.notify('event', 'a4sailed'); });
  }
  convoy() {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true;
    g.ui.fade(true, 1.2).then(() => g.ui.card('Hedeby Sound', 'The convoy sails: twenty ships full of refugees, grain and wounded, with the Sea-Raven and eight warships guarding them. Torvald is in charge of the signal fires along the coast that tell the fleet which channel is safe.', 10))
      .then(() => { c.setPhase('hsail', true); c.snd.aboard(false); return g.ui.fade(false, 1.2); }).then(() => { p.frozen = false; g.quests.notify('event', 'a4convoy'); });
  }

  // ---- the letter and the ribbon (Chapter 7) ---------------------------------------------------
  playRibbon() {
    const g = this.g, c = this.c, p = g.player, t = c.npc('torvald'), pd = c.npc('peddler'), [gx, gz] = c.B(-113, 147), y = g.world.groundAt(gx, gz);
    if (this.ribbonOn) return;
    this.ribbonOn = true; p.frozen = true; g.ravens.exitEye(); p.teleport(...c.B(-70, 150), -1.5);
    const eye = (up) => () => [t.pos.x, t.pos.y + up, t.pos.z];
    const cams = [
      { from: [gx - 9, y + 2.4, gz + 8], to: [gx - 6.5, y + 1.9, gz + 5.5], look: eye(1.2), fov: 40, onStart: () => pd.goTo(gx - 1.5, gz + 0.3, { speed: 1.5, onArrive: (o) => { o.h.play('pickup', 0.9); t.h.play('pickup', 0.9); } }) },
      { from: [gx - 2.6, y + 1.6, gz + 2.0], to: [gx - 2.2, y + 1.6, gz + 1.6], look: eye(1.45), fov: 30, onStart: () => pd.goTo(gx - 16, gz + 5, { onArrive: (o) => { o.visible = false; } }) },
      { from: [gx - 1.9, y + 1.7, gz - 1.6], look: eye(1.3), fov: 28 },
      { from: [gx - 6, y + 3.4, gz - 6], to: [gx - 4, y + 2.8, gz - 4], look: eye(1.2), fov: 44 },
      { from: [gx - 2.8, y + 1.3, gz + 2.6], to: [gx - 2.0, y + 1.4, gz + 2.0], look: eye(0.95), fov: 34, onStart: () => { g.sky.time = 2.2; t.setLoop('sit'); } },
      { from: [gx - 1.9, y + 1.1, gz - 1.4], look: eye(1.0), fov: 26 },
    ];
    const shots = RIBBON_LINES.map((text, i) => { const dur = 3 + text.length * 0.058, v = cams[i]; return { dur, from: v.from, to: v.to || [v.from[0] - 0.2, v.from[1], v.from[2] + 0.2], look: v.look, fov: v.fov, sub: ['', text, dur - 0.3], onStart: v.onStart }; });
    g.cine.play(shots, { onEnd: () => g.ui.fade(true, 1.2).then(() => { this.ribbonOn = false; g.quests.notify('event', 'a4ribbon'); return g.ui.fade(false, 1.2); }).then(() => { p.frozen = false; }) });
  }

  // ---- Driftwood (Chapter 8) -------------------------------------------------------------------
  kneel() {
    const g = this.g, c = this.c, p = g.player, h = c.npc('hauk');
    this.kneeling = true; p.frozen = true;
    p.teleport(h.pos.x + 0.85, h.pos.z + 0.25, Math.atan2(-0.85, -0.25)); p.loopOverride = 'kneel';
    c.sub('Eirik kneels beside him and puts a hand on his shoulder, and stays there until it is dark.', 7.5);
    g.after(6.5, () => g.ui.fade(true, 2.6).then(() => { p.loopOverride = null; c.setPhase('a4dark', true); g.quests.notify('event', 'a4hauk'); return g.ui.fade(false, 2.2); }).then(() => { p.frozen = false; }));
  }
  playBirch() {
    const g = this.g, c = this.c, p = g.player, R = g.ravens, [bx, bz] = c.B(-20, 10), by = g.world.groundAt(bx, bz), [px, pz] = c.B(-17.2, 13.4), py = g.world.groundAt(px, pz), [hx, hz] = c.B(30, 216);
    if (this.birchOn) return;
    this.birchOn = true; p.frozen = true; p.teleport(px, pz, 0.35); p.loopOverride = 'sit'; R.exitEye(); R.setMode('hidden');
    g.cine.play([
      { dur: 10, from: [px + 3.6, py + 1.0, pz + 5], to: [px + 2.6, py + 2.6, pz + 3.6], look: [bx, by + 4.8, bz], fov: 46, sub: ['', 'Later, Eirik climbs alone to the old birch on the hill. The lightning-split trunk has grown two new crowns, one on each side.', 9.5] },
      { dur: 7.5, from: [px - 2.4, py + 1.2, pz + 2.8], to: [px - 1.8, py + 1.3, pz + 2.4], look: [px, py + 0.8, pz], fov: 36, sub: ['', 'He remembers making his first fire under its twin, alone and starving, ten years ago.', 7] },
      { dur: 6, from: [px + 1.5, py + 0.8, pz + 2.5], look: [px, py + 0.8, pz], fov: 34, sub: ['', g.fmt('{b} lands beside him. {w} lands on his shoulder.'), 5.6],
        onStart: () => { R.black.visible = R.white.visible = true; R.black.position.set(px + 0.75, py + 0.04, pz + 0.35); R.black.rotation.set(0, -0.8, 0); R.white.position.set(px - 0.24, py + 0.86, pz + 0.02); R.white.rotation.set(0, 0.5, 0); for (const m of [R.white, R.black]) { m.userData.wings[0].rotation.z = -1.35; m.userData.wings[1].rotation.z = 1.35; } g.audio.play('raven'); } }, // wings folded
      { dur: 3.8, from: [px + 0.7, py + 1.0, pz + 1.6], look: [px - 0.2, py + 0.9, pz], fov: 26, sub: [g.fmt('{w}'), 'Home?', 3.4] },
      { dur: 6.5, from: [px - 1.2, py + 2.4, pz - 3], to: [px - 0.8, py + 2.8, pz - 2.4], look: [hx, 2, hz], fov: 38, sub: ['', 'Eirik looks down at the smoking harbor.', 6] },
      { dur: 5, from: [px + 1.4, py + 0.9, pz + 2.0], look: [px, py + 0.85, pz], fov: 28, sub: ['Eirik', 'Not yet.', 4.4] },
    ], { skippable: false, onEnd: () => { p.loopOverride = null; g.quests.notify('event', 'a4home'); } });
  }

  // =====================================================================================
  steps = {
    'q_gold.torvald'(r) {
      const g = this.g, c = this.c;
      c.setPhase('a4quiet', r);
      if (this.st.flags.a4begun) return; // the act opens once, however it is entered
      this.st.flags.a4begun = true;
      g.player.frozen = true; g.player.teleport(...c.B(-1, 142), Math.PI);
      g.ui.card('Act Four', 'Blood Across the Sea', 4.2).then(() => { g.player.frozen = false; c.sub('Two quiet years pass. Ravenhold grows.', 6); });
    },
    'q_gold.envoy'(r) { const c = this.c; c.setPhase('a4quiet', r); c.post('envoy', [0.9, 217, Math.PI]); this.solShip.visible = true; },
    'q_gold.ari'(r) { this.c.setPhase('a4quiet', r); },
    'q_gold.sail'(r) { const c = this.c; c.setPhase('a4quiet', r); if (!r) this.dressed('a4quiet'); },
    'q_six.refugees'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a4refuge', r);
      c.fade(() => { c.setPhase('a4refuge', true); g.player.teleport(...c.B(-1, 228), Math.PI); if (g.player.equipped !== 'none') g.player.equip('none'); return g.ui.card('Ravenhold', 'They escort boatloads of refugees to Ravenhold.', 5); }, 1.2, 1.2);
    },
    'q_council.hall'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a4frost', r);
      c.fade(() => { c.setPhase('a4frost', true); g.player.teleport(...c.B(0, 203), Math.PI); return g.ui.card('The Council of Six', 'In the first frost, the six kings come to Ravenhold.', 5); }, 1.2, 1.2)
        .then(() => c.tell(['Ravenhold is not a village anymore. It has a harbor with twelve ships, a market, two forges, a healing house, three hundred people inside its walls and more camped outside.',
          'Refugees from all six islands have come there because they heard Ravenhold takes people in. Freydis has organized all of it: food rations, shelter, work.'], 8.5));
    },
    'q_council.kings'(r) { const c = this.c; c.setPhase('a4frost', r); this.heard = {}; if (!r) c.sub("The kings meet in Bjorn's longhouse. It is not friendly.", 5); },
    'q_council.speak'(r) { this.c.setPhase('a4frost', r); },
    'q_council.token'(r) { this.c.setPhase('a4frost', r); },
    'q_sound.letter'(r) {
      const c = this.c;
      if (r) { c.setPhase('a4week', r); return this.playRibbon(); }
      c.fade(() => { c.setPhase('a4week', true); }, 1.4, 0.8).then(() => this.playRibbon());
    },
    'q_sound.convoy'(r) { const g = this.g, c = this.c; c.setPhase('a4sail', r); if (!r) { g.player.teleport(...c.B(-1, 150), 0); c.sub('The convoy sails.', 4); } },
    'q_drift.freydis'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a4burn', r);
      c.fade(() => { c.setPhase('a4burn', true); g.player.teleport(...c.B(0, 217), Math.PI); if (g.player.equipped !== 'none') g.player.equip('none'); return g.ui.card('Driftwood', 'The survivors limp back to Ravenhold. It is worse there.', 5.5); }, 1.4, 1.4);
    },
    'q_drift.hauk'(r) { this.c.setPhase('a4burn', r); this.haukDown = false; this.kneeling = false; },
    'q_drift.birch'(r) { this.c.setPhase('a4dark', r); },
    'q_drift.home'(r) { this.c.setPhase('a4dark', r); this.playBirch(); },
  };

  update() {
    const g = this.g, c = this.c, q = g.quests, p = g.player;
    if (g.mode !== 'play') return;
    if (q.at('q_gold', 'envoy') && c.phase === 'a4quiet' && c.npc('envoy').visible && c.npc('envoy').dist(p) < 6.5) this.envoy();
    if (q.at('q_drift', 'hauk') && c.phase === 'a4burn' && !this.haukDown && c.npc('hauk').dist(p) < 8) {
      const h = c.npc('hauk'); this.haukDown = true; h.face(p.pos.x, p.pos.z);
      c.sub("Hauk is waiting on the pier. He sees Eirik's face and he knows before anyone says anything. He sinks down onto the wet planks.", 8.5);
      g.after(3.4, () => h.setLoop('mourn'));
    }
  }
}
