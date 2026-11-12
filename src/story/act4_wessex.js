// Act IV, Chapter 3: "The English Court". The port where the River Itchen meets the sea: monks who run, Wulfstan who
// counts every arm-ring twice, a little girl with a fever, Leif going from market to market, and the harbor wall.
// See act4_home.js for what Act IV's parts share.
import { KIDS } from '../data/act2.js';
import { CAST4, MONK, WALL_LINES } from '../data/act4.js';
import { A4Part } from './act4_home.js';

const WX = ['wday', 'wherb', 'wmorn', 'wdusk'];
const STALLS = [[104, 14, 0], [90, 26, 1], [76, 14, 0], [62, 26, 1], [48, 14, 0], [34, 26, 1]], HERB = [1, 3, 4]; // the three he buys at
const ENGLISH = ['Hwæt wilt þu?', 'Twa penegas.', 'God þe mid sie.', 'Norþmenn...']; // (game: a language close enough to Norse that you can almost understand it)
const HAGGLE = ['Leif, without being asked, goes from market to market finding the herbs she needs,', 'haggling in broken English,', 'and even pays full price for them without complaining once.'];

export class A4Wessex extends A4Part {
  get WW() { return this.g.world.main.wessex; }
  /** A point by offset from the centre of the Wessex shore. */
  X(dx, dz) { return this.WW.X(dx, dz); }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world;
    for (const id of ['wulfstan', 'priest', 'mother', 'father']) { const n = g.addNPC(id, CAST4[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    this.monks = [0, 1, 2].map((i) => { const n = g.addNPC('monk' + i, { name: 'A monk', look: { ...MONK, hair: [0x5a4a3a, 0x8a8478, 0x3a2e24][i] }, runSpeed: 4.4 }); n.visible = false; n.talk = () => c.sub('He crosses himself.', 2.5); return n; });
    this.girl = g.addNPC('wgirl', { name: 'The little girl', look: KIDS[0] }); this.girl.visible = false;
    const fd = this.WW.farm; this.bed = [fd.x + 1.7, fd.z + 1.5];
    w.addInteractable({ id: 'a4herb', pos: () => { const [x, z] = this.WW.stalls[HERB[Math.min(2, this.count('q_court'))]]; return { x, z }; }, x: 0, z: 0, r: 3, priority: 3, label: 'Wait while Leif haggles', enabled: () => q.at('q_court', 'herbs') && !this.haggling, use: () => this.haggle() });
    w.addInteractable({ id: 'a4watch', x: this.bed[0] - 0.6, z: this.bed[1] + 2.2, r: 3.4, priority: 3, label: 'Give Ingrid the herbs, and keep watch with her', enabled: () => q.at('q_court', 'watch') && !this.watching, use: () => this.watch() });
  }
  clear(phase) {
    const c = this.c, on = WX.includes(phase);
    this.WW.stages.ships.set(on);
    for (const id of ['wulfstan', 'priest', 'mother', 'father']) c.npc(id).visible = false;
    for (const n of [...this.monks, this.girl]) n.visible = false;
    this.fled = false; this.feverOn = false; this.wallOn = false; this.haggling = false; this.bellT = 0;
  }
  ashore() { this.g.player.teleport(...this.X(134, 12), -Math.PI / 2); }
  keeper(i) { return this.c.sea.town[i]; }
  dress(name) {
    const c = this.c, T = c.sea.town, ct = this.at('q_court'), wl = this.WW.wall, [bx, bz] = this.bed;
    const P = (id, dx, dz, face, loop, hold) => this.put(id, ...this.X(dx, dz), typeof face === 'number' ? face : face ? this.X(face[0], face[1]) : undefined, loop, hold);
    STALLS.forEach(([dx, dz, back], i) => { const n = T[i]; n.name = i % 2 ? 'A townswoman of Wessex' : 'A townsman of Wessex'; P(n.id, dx, dz + (back ? 1.4 : -1.4), back ? Math.PI : 0); });
    T[6].name = 'A townsman of Wessex'; T[7].name = 'A townswoman of Wessex';
    P('wulfstan', 64, 51.4, Math.PI); P('solcap', 140, 43.6, -Math.PI / 2);
    c.battle.jarn.slice(0, 4).forEach((n, i) => { n.name = 'A guard of Solvik'; this.put(n, ...this.X(134 + (i % 2) * 2, 38 + i * 2.2), -Math.PI / 2, 'carry'); n.talk = () => n.say('He counts every arm-ring twice.', 3); });
    P('torvald', 131, 6, 2).h.hold('R', 'maul'); P('astrid', 132.6, 2, 2.4).h.hold('L', 'bow'); P('ari', 136, 9, -1.2); P('gisli', 136, -2, -1.4);
    if (name === 'wday') {
      P('leif', 131.6, 15, -Math.PI / 2, 'carry'); P('ingrid', 132, 24, -1.8); P(T[6].id, 22, 22, 1.2); P(T[7].id, 118, 24, -1.6, 'carry');
      if (ct <= 1) [[112, 17.6], [114.4, 20.6], [110, 22.4]].forEach(([dx, dz], i) => { const n = this.put(this.monks[i], ...this.X(dx, dz), this.X(112, 20), i ? 'talk' : null); n.talk = () => c.sub('He crosses himself.', 2.5); });
    } else if (name !== 'wdusk') { // at the farm outside the wall
      const morn = name === 'wmorn';
      this.fix(this.girl, bx, this.g.world.groundAt(bx, bz) + 0.12, bz, 1.6, morn ? 'sit' : 'lie');
      this.put('ingrid', bx - 0.9, bz + 0.7, [bx, bz], 'kneel'); this.put('mother', bx + 1.0, bz + 0.9, morn ? [bx - 0.9, bz + 0.7] : [bx, bz], 'kneel'); this.put('father', bx + 2.0, bz - 0.6, [bx, bz]);
      if (!morn) { this.put('priest', bx - 4.4, bz + 3.4, [bx, bz], 'talk'); this.put(T[6], bx - 6.2, bz + 4.6, [bx, bz]); this.put(T[7], bx - 5.4, bz + 6, [bx, bz]); }
      const l = P('leif', -55, 46, [-62, 38]); if (ct === 3 || ct === 4) l.follow(this.g.player, { dist: 2.6 });
    } else { // the harbor wall, that evening
      this.fix(c.npc('leif'), wl.x + 0.25, wl.y - 0.45, wl.z - 1.5, Math.PI / 2, 'sit'); this.fix(c.npc('ingrid'), wl.x + 0.25, wl.y - 0.45, wl.z - 0.3, Math.PI / 2, 'sit');
    }
  }
  dyn(name) {
    if (name !== 'a4work' || !this.g.quests.at('q_court', 'herbs')) return undefined;
    const [x, z] = this.WW.stalls[HERB[Math.min(2, this.count('q_court'))]]; return { x, z, y: this.g.world.groundAt(x, z) + 2.2 };
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!WX.includes(c.phase)) return false;
    if (id === 'wulfstan') { if (q.at('q_court', 'wulfstan')) c.say('a4_wulfstan', n, () => q.notify('talk', 'wulfstan')); else c.sub('A careful, polite man named Wulfstan, who counts every arm-ring twice.', 4); return true; }
    if (id === 'priest') { c.sub('A priest shouts at her.', 3); return true; }
    if (id === 'mother' || id === 'father') { n.say('...', 2); return true; }
    if (id === 'leif') { n.say('Furs! I only want to sell them furs.', 3); return true; } // (game: from the story's sentence)
    if (id === 'ingrid') { n.say('A fever does not care which god you pray to.', 3.5); return true; }
    if (/^kp/.test(id)) { n.say(ENGLISH[(Math.random() * ENGLISH.length) | 0], 3); return true; }
    if (id === 'solcap') { n.say('Count them again, he says. Again!', 3); return true; } // (game)
    return false;
  }
  cues = { priest() { this.c.npc('priest').h.play('cheer', 1.0); this.g.audio.play('shout', { vol: 0.5 }); } };

  haggle() {
    const g = this.g, c = this.c, i = this.count('q_court'), l = c.npc('leif'), s = HERB[i], [x, z] = this.WW.stalls[s], k = this.keeper(s);
    this.haggling = true;
    l.stop(); l.teleport(x + 0.9, z, Math.atan2(k.pos.x - x - 0.9, k.pos.z - z)); l.setLoop('talk'); k.setLoop('talk');
    c.sub(HAGGLE[i], 5);
    g.after(4.6, () => { l.setLoop(null); k.setLoop(null); l.h.play('pickup', 0.8); g.audio.play('pickup'); l.follow(g.player, { dist: 2.6 }); this.haggling = false; g.quests.notify('event', 'a4herb'); });
  }
  watch() {
    const g = this.g, c = this.c, p = g.player, [bx, bz] = this.bed;
    this.watching = true; p.frozen = true;
    g.ui.fade(true, 1.4).then(() => g.ui.card('', 'She cools the child with wet cloths, makes willow-bark tea and stays awake with her for two nights.', 6.5))
      .then(() => { c.setPhase('wmorn', true); p.teleport(bx - 1.6, bz + 2.6, Math.atan2(1.6, -2.6)); return g.ui.fade(false, 1.6); })
      .then(() => { c.sub("The fever breaks on the third morning. The girl's mother cries and kisses Ingrid's hands.", 8); return new Promise((r) => g.after(8.5, r)); })
      .then(() => g.ui.fade(true, 1.4)).then(() => { c.setPhase('wdusk', true); p.teleport(...this.X(134, 54), 0); g.quests.notify('event', 'a4watch'); return g.ui.fade(false, 1.4); })
      .then(() => { p.frozen = false; this.watching = false; });
  }
  playWall() {
    const g = this.g, c = this.c, p = g.player, wl = this.WW.wall, l = c.npc('leif'), i = c.npc('ingrid');
    this.wallOn = true; p.frozen = true; g.ravens.exitEye();
    const eye = (n) => () => [n.pos.x, n.pos.y + 1.15, n.pos.z];
    const cam = { both: { from: [wl.x + 6, wl.y + 1.0, wl.z + 4], to: [wl.x + 4.6, wl.y + 0.9, wl.z + 2.6], look: [wl.x, wl.y + 0.5, wl.z - 0.9], fov: 40 },
      leif: { from: [wl.x + 2.6, wl.y + 0.6, wl.z - 3.4], look: eye(l), fov: 30 }, ingrid: { from: [wl.x + 2.6, wl.y + 0.6, wl.z + 1.6], look: eye(i), fov: 30 } };
    const shots = WALL_LINES.map(([who, sp, text], k) => { const v = cam[who], dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.2, v.from[1], v.from[2] + 0.25], look: v.look, fov: v.fov, sub: [sp, text, dur - 0.3],
      onStart: k === 4 ? () => { i.mode = 'idle'; i.pose = null; i.teleport(wl.x - 0.9, wl.z - 0.3, -Math.PI / 2); i.goTo(wl.x - 26, wl.z - 16, { onArrive: (o) => { o.visible = false; } }); } : null }; });
    g.cine.play(shots, { onEnd: () => { p.frozen = false; g.quests.notify('event', 'a4wall'); } });
  }

  // =====================================================================================
  steps = {
    'q_court.port'(r) {
      const g = this.g, c = this.c;
      if (r) { c.setPhase('wday', r); return this.ashore(); }
      c.fade(() => { c.setPhase('wday', true); this.ashore(); return g.ui.card('Wessex', "Fafnir's Bed arrives in Wessex nine days later, at a busy trading port where the River Itchen meets the sea.", 7); }, 1.4, 1.4)
        .then(() => c.tell(['England is another world. There are stone churches with bells.', "There are fortified towns called burhs, with earth walls and ditches, built by King Alfred to stop exactly the kind of people Eirik's crew look like."], 7));
    },
    'q_court.wulfstan'(r) { const c = this.c; c.setPhase('wday', r); if (r) this.ashore(); else c.sub('People speak a language close enough to Norse that you can almost understand it, which makes misunderstandings worse.', 7); },
    'q_court.farm'(r) { const c = this.c; c.setPhase('wherb', r); if (r) this.g.player.teleport(...this.X(40, 20), -Math.PI / 2); else c.sub("In the town, a farming family's little girl is burning with fever.", 6); },
    'q_court.herbs'(r) { const c = this.c; c.setPhase('wherb', r); if (r) this.g.player.teleport(...this.X(-52, 42), Math.PI / 2); c.npc('leif').follow(this.g.player, { dist: 2.6 }); },
    'q_court.watch'(r) { const c = this.c; c.setPhase('wherb', r); if (r) this.g.player.teleport(...this.X(30, 21), -Math.PI / 2); c.npc('leif').follow(this.g.player, { dist: 2.6 }); },
    'q_court.wall'(r) { const c = this.c; c.setPhase('wdusk', r); if (r) this.g.player.teleport(...this.X(134, 54), 0); },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, near = (x, z, d) => Math.hypot(p.pos.x - x, p.pos.z - z) < d;
    if (!WX.includes(c.phase)) return;
    this.crew([this.girl, c.npc('leif'), c.npc('ingrid')], dt);
    if (this.bellT > 0) { this.bellT -= dt; this.WW.bell.rotation.z = Math.sin(this.bellT * 5) * 0.5 * Math.min(1, this.bellT / 2); if (this.bellT % 1.25 < dt) g.audio.play('chime', { vol: 0.35 }); }
    if (g.mode !== 'play') return;
    if (c.phase === 'wday' && !this.fled && this.monks[0].visible && this.monks[0].dist(p) < 15) { // monks who cross themselves and run when they see Norse sails
      this.fled = true; this.bellT = 9; const [dx, dz] = this.X(34.4, -31);
      this.monks.forEach((n, i) => { n.setLoop(null); n.h.play('cheer', 0.6); g.after(0.7 + i * 0.25, () => n.goPath([this.X(60, 16 - i), this.X(46, -10), [dx, dz]], { run: true, onArrive: (o) => { o.visible = false; } })); });
      c.sub('There are monks with shaved heads who cross themselves and run when they see Norse sails, which annoys Leif enormously because he wants to sell them furs.', 9);
      c.npc('leif').h.play('cheer', 0.9);
    }
    if (q.at('q_court', 'farm') && !this.feverOn && near(this.bed[0] - 1, this.bed[1] + 4, 9)) { this.feverOn = true; c.say('a4_fever', c.npc('ingrid'), () => q.notify('event', 'a4fever')); }
    if (q.at('q_court', 'wall') && c.phase === 'wdusk' && !this.wallOn && near(this.WW.wall.x - 3, this.WW.wall.z, 9)) this.playWall();
  }
}
