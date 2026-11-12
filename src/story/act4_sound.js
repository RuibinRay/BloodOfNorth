// Act IV, Chapter 7 at Hedeby Sound: the convoy off the second headland, the fire on the third, the trap in the
// narrow eastern channel (burning ropes, rocks the white raven spots, people in the water, boarders), Ari, the
// beach at nightfall, and Torvald with the blackened torch. The letter and the ribbon are in act4_home.js.
// The Sea-Raven's deck stands still in the channel: her steering is told, and her ramming is a shake and a fade.
import { makeShip } from '../world/props.js';
import { dampAngle } from '../core/util.js';
import { A4 } from '../data/act4.js';
import { Knack } from '../systems/activities2.js';
import { A4Part, TEN } from './act4_home.js';

const HED = ['hsail', 'hbattle', 'hbeach'];
const ROPES = [[1.5, -2.2], [-1.5, 3.2]], WATER = [[-3.0, -3.2], [3.0, 1.0], [-3.0, 4.6]], CREW = TEN.slice(0, 4);

export class A4Sound extends A4Part {
  constructor(game, core) { super(game, core); this.fires = []; this.ropeFires = []; this.es = []; this.o = [0, 0]; }
  get HS() { return this.g.world.main.hedeby; }
  H(dx, dz) { return this.HS.X(dx, dz); }
  /** A point on the Sea-Raven's deck, by offset from her mast (her bow is south, +z). */
  D(dx, dz) { return [this.o[0] + dx, this.o[1] + dz]; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, HS = this.HS;
    for (let i = 0; i < 2; i++) { const m = makeShip({ L: 21, B: 4.4, seed: 131 + i * 9, sail: true }); m.visible = false; g.scene.add(m); this.es.push({ m, to: null }); }
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, ...(typeof pos === 'function' ? { pos, x: 0, z: 0 } : { x: pos[0], z: pos[1] }), r: 2.4, priority: 3, label, enabled, use, ...o });
    I('a4rope', () => { const [x, z] = this.D(...ROPES[Math.min(1, this.count('q_sound'))]); return { x, z }; }, 'Cut the burning rope', () => q.at('q_sound', 'ropes') && !g.activity, () => this.cut());
    I('a4haul', () => { const [x, z] = this.rail(); return { x, z }; }, 'Haul them out of the water', () => q.at('q_sound', 'haul') && !g.activity, () => this.haul());
    I('a4hold', () => c.npc('ari').pos, 'Hold him', () => q.at('q_sound', 'ari') && this.ariDown && !this.holding, () => this.hold(), { r: 2.8 });
    I('a4sit', this.H(-74, 166), 'Sit down, alone', () => q.at('q_sound', 'alone') && !this.aloneOn, () => this.alone(), { r: 3.2 });
    g.ravens.addMarkable({ id: 'a4fire', pos: () => ({ x: HS.heads[2].x, z: HS.heads[2].z }), r: 70, label: 'a fire, burning on the third headland', enabled: () => q.at('q_sound', 'fire') && c.phase === 'hsail', onMark: () => this.third() });
    HS.rocks.forEach((rk, i) => g.ravens.addMarkable({ id: 'a4rock' + i, pos: () => rk, r: 46, label: 'a rock, just under the water', enabled: () => q.at('q_sound', 'rocks') && c.phase === 'hbattle',
      onMark: () => { c.npc('leif').h.play('shove', 0.7); g.audio.play('splash', { vol: 0.5 }); if (!this.count('q_sound')) c.sub('They steer through rocks that {w} spots from above.', 5); q.notify('event', 'a4rock'); } }));
  }
  clear(phase) {
    const g = this.g, S = this.HS.stages;
    S.north.set(phase === 'hsail'); S.convoy.set(phase === 'hbattle'); S.wrecks.set(phase === 'hbeach');
    for (const f of [...this.fires, ...this.ropeFires]) g.fx.removeFire(f); this.fires = []; this.ropeFires = [];
    for (const s of this.es) { s.m.visible = false; s.to = null; }
    this.ariDown = false; this.holding = false; this.sw = null; this.aloneOn = false; this.amb = 4;
    if (HED.includes(phase)) this.c.act.glowTarget = phase === 'hsail' ? 0 : 0.35;
    if (HED.includes(phase) && phase !== 'hbattle' && g.combat.active) g.combat.clear();
  }
  aboard() { this.g.player.teleport(...this.D(0.3, 2.6), 0); }
  /** Where Eirik stands at the rail to reach the next one in the water. */
  rail() { const [dx, dz] = WATER[Math.min(2, this.count('q_sound'))]; return this.D(dx > 0 ? 1.7 : -1.7, dz); }
  dress(name) {
    const g = this.g, c = this.c, w = g.world, HS = this.HS, T = c.sea.town, sd = this.at('q_sound'), n = this.count('q_sound'), h3 = HS.heads[2];
    const fire = (x, y, z, s) => this.fires.push(g.fx.addFire(x, y, z, s));
    fire(h3.x, h3.y, h3.z, 2.4); // the wrong fire
    if (name !== 'hbeach') {
      this.o = name === 'hsail' ? [HS.north.x, HS.north.z] : [HS.ship.x, HS.ship.z];
      const P = (id, dx, dz, face, loop, hold) => { const m = this.put(id, ...this.D(dx, dz), typeof face === 'number' ? face : face ? this.D(face[0], face[1]) : undefined, loop, hold); m.keepDry = true; return m; };
      P('leif', 1.2, -6.6, 0); P('gisli', -1.6, -5.4, 0.4); P('ingrid', -0.6, -3.2, 0.3); P('astrid', 0.9, 0.9, 0.5).h.hold('L', 'bow'); P('ari', 0.2, 2.0, [0.9, 0.9], 'carry');
      CREW.forEach((id, i) => { const m = P(id, i % 2 ? 1.5 : -1.5, 3.6 + Math.floor(i / 2) * 2.0, i % 2 ? -Math.PI / 2 : Math.PI / 2, 'guard', 'spear'); m.h.hold('L', 'shield'); });
      [[-1.3, -1.2], [1.4, -3.8]].forEach(([dx, dz], i) => { const m = this.put(T[i], ...this.D(dx, dz), 0.6, i ? 'cower' : 'sit'); m.name = 'A refugee'; m.keepDry = true; });
    }
    if (name === 'hbattle') {
      const S = HS.stages.convoy;
      for (const i of [2, 3]) { const b = S.boats[i]; fire(b.position.x, 1.6, b.position.z, 1.7); }
      this.sink = { b: S.boats[2], t: 0 };
      this.es.forEach((s, i) => { const far = [this.H(-152, 216), this.H(-98, 208)][i], near = [[...this.H(-139, 183), 0.9], [...this.H(-103, 178), -0.4]][i], side = [...this.D(6.4, 0.6), Math.PI]; s.m.visible = true;
        const at = sd <= 4 ? far : i === 1 && sd >= 7 ? side : near; s.m.position.set(at[0], -0.15, at[1]); s.m.rotation.y = at[2] ?? (i ? -0.6 : 0.6); s.to = sd <= 4 ? near : null; });
      if (sd >= 4 && sd <= 4) this.ropes(n);
      WATER.forEach(([dx, dz], i) => { const m = T[4 + i], [x, z] = this.D(dx, dz); m.name = 'A refugee'; m.talk = null; if (sd > 6 || (sd === 6 && i < n)) { this.put(m, ...this.D(dx > 0 ? 1.1 : -1.1, dz), 0, 'cower'); m.keepDry = true; } else if (sd >= 5) this.fix(m, x, -1.0, z, dx > 0 ? -Math.PI / 2 : Math.PI / 2, 'tread'); else m.visible = false; });
    }
    if (name === 'hbeach') { // nightfall
      for (const [dx, dz, s] of [[-126, 120, 1.8], [-124, 186, 1.6], [-112, 204, 1.4]]) { const [x, z] = this.H(dx, dz); fire(x, 1.2, z, s); }
      const B = (id, dx, dz, face, loop, hold) => this.put(id, ...this.H(dx, dz), typeof face === 'number' ? face : face ? this.H(face[0], face[1]) : undefined, loop, hold);
      const bound = sd >= 11;
      const t = B('torvald', -91, 141, -Math.PI / 2, bound ? 'kneel' : null, bound ? null : 'torch'); t.talk = () => c.talkTo('torvald');
      const a = c.npc('astrid'), [ax, az] = this.H(-78, 152); this.fix(a, ax, w.groundAt(ax, az) + 0.1, az, 1.2, 'lie'); a.h.hold('L', null);
      B('ingrid', -77.2, 153.4, [-78, 152], 'kneel'); B('leif', -74, 157, [-100, 150], 'sit'); B('gisli', -72.6, 159, 0.4, 'sit');
      [[-84, 150], [-80, 160], [-70, 150], [-76, 146], [-88, 158], [-68, 162]].forEach(([dx, dz], i) => { const m = this.put(T[i], ...this.H(dx, dz), -1.4 + i * 0.3, ['cower', 'mourn', 'sit'][i % 3]); m.name = 'A survivor'; });
      CREW.slice(0, 2).forEach((id, i) => B(id, bound ? -89.6 + i * 2.8 : -82 + i * 3, bound ? 142.6 : 163, bound ? [-91, 141] : -1.5, 'guard', 'spear'));
    }
  }
  /** Two ropes alight on the Sea-Raven. */
  ropes(done) {
    const g = this.g, y = this.HS.stages.convoy.sr.y;
    for (const f of this.ropeFires) g.fx.removeFire(f); this.ropeFires = [];
    ROPES.forEach(([dx, dz], i) => { if (i < done) return; const [x, z] = this.D(dx * 1.25, dz); this.ropeFires[i] = g.fx.addFire(x, y + 1.9, z, 0.7); });
  }
  dyn(name) {
    const q = this.g.quests, y = this.g.player.pos.y + 2.2;
    if (name !== 'a4work') return undefined;
    if (q.at('q_sound', 'ropes')) { const [x, z] = this.D(...ROPES[Math.min(1, this.count('q_sound'))]); return { x, z, y }; }
    if (q.at('q_sound', 'haul')) { const [x, z] = this.rail(); return { x, z, y }; }
    return undefined;
  }
  talk(id, n) {
    const c = this.c;
    if (!HED.includes(c.phase)) return false;
    if (this.sw && this.sw.stage === 3) { this.lower(); return true; }
    if (id === 'leif' && c.phase === 'hsail') { n.say('Second headland, we go wide. Third, we go through the narrows. Watch for the fire.', 5); return true; } // (game)
    n.say('...', 2); return true;
  }
  cues = { raise() { const p = this.g.player; this.c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe'); } };

  // ---- the third fire ---------------------------------------------------------------------------
  third() {
    const g = this.g, c = this.c;
    c.sub('He lights the third fire.', 4.5); c.hint(null);
    g.after(4, () => { g.ravens.exitEye(); c.fade(() => { c.setPhase('hbattle', true); this.aboard(); g.quests.notify('event', 'a4third');
      return g.ui.card('', 'The fleet turns into the narrow eastern channel, and enemy longships come out from behind the rocks on both sides. It is a trap.', 7.5); }, 1.0, 1.0); });
  }
  // ---- the trap -------------------------------------------------------------------------------------
  cut() {
    const g = this.g, c = this.c, p = g.player, i = this.count('q_sound'), [x, z] = this.D(...ROPES[i]);
    c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    new Knack(g, { label: 'Cut the burning rope', verb: 'cut', cfg: A4.knack.rope, anim: 'chop', sound: 'chop', bad: 'The fire licks at his hands', at: [x, z, ROPES[i][0] > 0 ? Math.PI / 2 : -Math.PI / 2], seed: i + 7,
      onBad: () => { p.health = Math.max(15, p.health - 5); }, onDone: () => { if (this.ropeFires[i]) { g.fx.removeFire(this.ropeFires[i]); this.ropeFires[i] = null; } g.quests.notify('event', 'a4rope'); } }).start();
  }
  haul() {
    const g = this.g, c = this.c, i = this.count('q_sound'), [dx, dz] = WATER[i], [px, pz] = this.rail(), [wx, wz] = this.D(dx, dz), n = c.sea.town[4 + i];
    new Knack(g, { label: 'Haul them out of the water', verb: 'pull', cfg: A4.knack.pull, anim: 'pickup', animDur: 0.7, sound: 'splash', bad: 'A wet hand slips out of his', at: [px, pz, dx > 0 ? Math.PI / 2 : -Math.PI / 2], seed: i + 3,
      onDone: () => { this.put(n, ...this.D(dx > 0 ? 1.1 : -1.1, dz), 0, 'cower'); n.keepDry = true; g.fx.burst('splash', wx, 0, wz, 10); g.quests.notify('event', 'a4haul'); } }).start();
  }
  board() {
    const g = this.g, c = this.c, p = g.player, R = A4.sound;
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    for (const id of CREW) c.npc(id).keepDry = true;
    c.battle.startSkirmish(CREW, [this.D(1.6, -4.2), this.D(1.6, 3.4)], R.n, R.atOnce, () => g.quests.notify('event', 'a4deck'), R);
    g.ui.questBanner('Hedeby Sound', 'they are coming over the side'); c.hint('deckHold');
  }
  /** A spear from an enemy ship takes him in the chest. */
  spear() {
    const g = this.g, c = this.c, a = c.npc('ari');
    if (this.ariDown) return;
    this.ariDown = true; g.combat.clear(); g.player.mortal = false; c.hint(null); g.audio.setMusic('sorrow');
    a.stop(); a.setLoop('lie'); a.h.play('fall', 1.0); g.audio.play('hurt'); g.after(0.5, () => g.audio.play('thud')); c.npc('astrid').h.play('stagger', 0.6);
  }
  hold() {
    const g = this.g, c = this.c, p = g.player, a = c.npc('ari'), as = c.npc('astrid');
    this.holding = true; p.frozen = true; if (p.equipped !== 'none') p.equip('none');
    p.teleport(a.pos.x + 0.8, a.pos.z + 0.3, Math.atan2(-0.8, -0.3)); p.loopOverride = 'kneel';
    c.say('a4_ari2', null, () => {
      c.sub('Astrid is hit by an arrow in the shoulder and keeps shooting until she faints. The Sea-Raven is rammed and starts taking water. Seven allied ships are lost. More than eighty people die.', 11.5);
      [0.6, 2.2, 3.8].forEach((t) => g.after(t, () => { as.h.play('shoot', 0.7); g.audio.play('bow', { vol: 0.5 }); }));
      g.after(5.2, () => { as.setLoop('lie'); as.h.play('fall', 1.0); });
      g.after(7.4, () => { p.cam.shake = 0.6; g.audio.play('split'); g.audio.play('thud'); g.after(0.4, () => g.audio.play('splash')); });
      g.after(12, () => g.ui.fade(true, 1.6).then(() => g.ui.card('', 'The survivors wash up on a rocky beach at nightfall.', 5.5)).then(() => {
        p.loopOverride = null; c.setPhase('hbeach', true); p.teleport(...this.H(-82, 156), -Math.PI / 2); g.quests.notify('event', 'a4ari'); return g.ui.fade(false, 1.6); }).then(() => { p.frozen = false; }));
    });
  }

  // ---- the beach -------------------------------------------------------------------------------------
  confront() {
    const g = this.g, c = this.c, p = g.player, t = c.npc('torvald');
    if (this.sw) return;
    this.sw = { stage: 0, t: 0 }; p.frozen = true; g.ravens.exitEye();
    p.teleport(t.pos.x + 2.4, t.pos.z + 1.0, Math.atan2(-2.4, -1.0)); t.face(p.pos.x, p.pos.z);
    c.say('a4_torch', t, () => { this.sw.stage = 1; c.hint('Press {attack}.'); });
  }
  swing() {
    const g = this.g, c = this.c, p = g.player, t = c.npc('torvald'), i = c.npc('ingrid'), mx = p.pos.x + (t.pos.x - p.pos.x) * 0.52, mz = p.pos.z + (t.pos.z - p.pos.z) * 0.52;
    this.sw.stage = 2; c.hint(null);
    p.h.play('atk3', 1.2, { hitAt: 0.42, onHit: () => { g.slowT = 1.4; g.audio.play('whoosh'); } });
    g.after(0.25, () => { this.put('ingrid', mx, mz, [p.pos.x, p.pos.z]); });
    c.sub("Eirik swings. Torvald does not raise his hammer to defend himself. At the very last moment, Ingrid throws herself between them. The axe stops a finger's width from her face.", 9);
    g.after(8.6, () => c.say('a4_between', i, () => { this.sw.stage = 3; this.sw.t = 0; }));
  }
  lower() {
    const g = this.g, c = this.c, p = g.player, t = c.npc('torvald');
    if (!this.sw || this.sw.stage !== 3 || this.sw.t < 2) return;
    this.sw.stage = 4; c.hint(null); if (p.equipped !== 'none') p.equip('none');
    g.after(4, () => { t.h.hold('R', null); t.setLoop('kneel'); CREW.slice(0, 2).forEach((id, k) => c.npc(id).goTo(t.pos.x + 1.4 + k * 0.4, t.pos.z + (k ? 1.6 : -1.6), {})); });
    c.tell(['Then he lowers the axe.', 'Torvald is disarmed, bound and taken prisoner for judgment by the alliance.'], 5.5).then(() => { p.frozen = false; g.quests.notify('event', 'a4swing'); });
  }
  alone() {
    const g = this.g, c = this.c, p = g.player, [x, z] = this.H(-74, 166), y = g.world.groundAt(x, z);
    this.aloneOn = true; p.frozen = true; p.teleport(x, z, -Math.PI / 2); p.loopOverride = 'sit'; g.ravens.exitEye();
    g.cine.play([{ dur: 12, from: [x + 4.6, y + 1.6, z + 3.4], to: [x + 2.4, y + 1.1, z + 1.6], look: [x, y + 0.8, z], fov: 36,
      sub: ['', 'That night Eirik sits alone and thinks about how close he came. For the first time he wonders whether revenge has become bigger than the person he wants to be.', 11.4] }],
    { skippable: false, onEnd: () => g.ui.fade(true, 1.8).then(() => { p.loopOverride = null; p.frozen = false; g.quests.notify('event', 'a4alone'); }) });
  }

  // =====================================================================================
  steps = {
    'q_sound.eye'(r) { const c = this.c; c.setPhase('hsail', r); if (r) this.aboard(); c.hint('fires'); },
    'q_sound.fire'(r) { const c = this.c; c.setPhase('hsail', r); if (r) this.aboard(); c.hint('fires'); },
    'q_sound.ropes'(r) {
      const g = this.g, c = this.c;
      c.setPhase('hbattle', r); if (r) this.aboard(); this.ropes(this.count('q_sound')); g.player.mortal = false; c.hint(null);
      if (!r) g.after(9.5, () => c.tell(["What follows is the worst day of Eirik's life since he was nine. Enemy ships ram the slow refugee boats. Fire arrows set sails alight.",
        'The channel is so narrow that the fleet cannot turn around, and so shallow that ships keep running aground. Eirik and Leif fight to cut burning ropes, haul people out of the water and steer through rocks that {w} spots from above.'], 9));
    },
    'q_sound.rocks'(r) { const c = this.c; c.setPhase('hbattle', r); if (r) this.aboard(); else this.dress2(); c.hint('rocks'); },
    'q_sound.haul'(r) { const c = this.c; c.setPhase('hbattle', r); if (r) this.aboard(); c.hint(null); this.g.ravens.exitEye(); },
    'q_sound.deck'(r) { const c = this.c; c.setPhase('hbattle', r); if (r) this.aboard(); else { const [x, z] = this.D(6.4, 0.6); this.es[1].to = [x, z, Math.PI]; } this.board(); },
    'q_sound.ari'(r) { const c = this.c; c.setPhase('hbattle', r); if (r) this.aboard(); this.g.after(r ? 0.5 : 1.6, () => this.spear()); },
    'q_sound.beach'(r) { const g = this.g, c = this.c; c.setPhase('hbeach', r); if (r) g.player.teleport(...this.H(-82, 156), -Math.PI / 2); else g.after(2, () => c.sub('Eirik walks along the beach looking for survivors. He finds Torvald standing alone by the shore, looking at the burning wrecks.', 9)); },
    'q_sound.swing'(r) { const g = this.g, c = this.c; c.setPhase('hbeach', r); if (r) g.player.teleport(...this.H(-84, 144), -Math.PI / 2); this.confront(); },
    'q_sound.alone'(r) { const g = this.g, c = this.c; c.setPhase('hbeach', r); if (r) g.player.teleport(...this.H(-82, 156), 0.6); this.sw = null; const t = c.npc('torvald'); t.h.hold('R', null); t.setLoop('kneel'); },
  };
  /** The people in the water appear once the ropes are cut. */
  dress2() { const T = this.c.sea.town; WATER.forEach(([dx, dz], i) => { const [x, z] = this.D(dx, dz); this.fix(T[4 + i], x, -1.0, z, dx > 0 ? -Math.PI / 2 : Math.PI / 2, 'tread'); }); }

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase;
    if (!HED.includes(ph)) return;
    this.crew([...c.sea.town, c.npc('astrid')], dt);
    for (const s of this.es) if (s.m.visible && s.to) { // they come out from behind the rocks
      const dx = s.to[0] - s.m.position.x, dz = s.to[1] - s.m.position.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { s.to = null; continue; }
      const v = Math.min(d, (d > 12 ? 7 : 3) * dt); s.m.position.x += (dx / d) * v; s.m.position.z += (dz / d) * v;
      s.m.rotation.y = dampAngle(s.m.rotation.y, d > 6 ? Math.atan2(dx, dz) : s.to[2], 2, dt);
    }
    if (ph === 'hbattle') {
      const k = this.sink; if (k && k.t < 1) { k.t = Math.min(1, k.t + dt / 40); k.b.rotation.z = k.t * 0.6; k.b.position.y = -0.2 - k.t * 0.9; } // a rammed boat goes over, slowly
      if (g.mode === 'play' && (this.amb -= dt) <= 0) { this.amb = 5 + Math.random() * 5; g.audio.play(['thud', 'split', 'shout', 'ignite', 'splash'][(Math.random() * 5) | 0], { vol: 0.35 }); if (Math.random() < 0.4) p.cam.shake = 0.12; }
      if (c.battle.sk && g.mode !== 'cutscene') c.battle.updateSkirmish(dt);
    }
    const s = this.sw;
    if (s && g.mode === 'play') {
      s.t += dt;
      if (s.stage === 1 && g.input.hit('attack')) this.swing();
      if (s.stage === 3) { if (s.t > 2 && !s.hinted) { s.hinted = true; c.hint('Lower the axe: {interact}'); } if (g.input.hit('interact')) this.lower(); }
    }
  }
}
