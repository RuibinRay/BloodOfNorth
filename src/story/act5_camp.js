// Act V, Chapter 3 at Håkon's hunting camp: "The Raven Taken". The black raven's eyes, the tannery yard, the pits
// when the dogs come sniffing, the pen of eleven prisoners, the cage in the mews, the fight on the way out, and the
// harbor at dawn with the supply ships gone. The camp's "thirty guards" are six who walk or sit, and five more who
// come at the end. See act5_home.js for the two ends of the chapter at Ravenhold.
import { wolfModel } from '../entities/wildlife.js';
import { CAST5, A5, SOT } from '../data/act5.js';
import { Knack } from '../systems/activities2.js';
import { A4Part } from './act4_home.js';

const CAMP = ['hnight', 'hdawn'];
const PATROLS = [[[-24, 24], [-24, -10]], [[-80, -29], [-20, -29]], [[-80, -4], [-80, 10]]], FIRE = [[-51, -2.4], [-45, -1.6], [-48, -5]];
const SNIFF = [[-53, 27], [-53, 35], [-61, 44.6], [-52, 49.6], [-44, 44], [-53, 35], [-53, 26]]; // where the dogs are walked round the yard
const SHOUT = ['There! In the yard!', 'Someone is in the camp!', 'You! Stand where you are!'];

export class A5Camp extends A4Part {
  constructor(game, core) { super(game, core); this.dogs = []; }
  get HC() { return this.g.world.main.hunt; }
  X(dx, dz) { return this.HC.X(dx, dz); }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, HC = this.HC;
    this.ottar = g.addNPC('ottar', CAST5.ottar); this.ottar.visible = false;
    for (let i = 0; i < 4; i++) { const m = wolfModel(); m.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.color.set(i % 2 ? 0x9a7a5a : 0x6a5a48); } }); m.scale.setScalar(0.85); m.visible = false; g.scene.add(m); this.dogs.push(m); }
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 2.8, priority: 3, label, enabled, use, ...o });
    HC.pits.forEach((pt, i) => I('a5pit' + i, [pt.x, pt.z], 'Climb into the pit', () => q.at('q_taken', 'pits') && !this.inPit, () => this.enterPit(i), { r: 3.2 }));
    I('a5free', this.X(-64.4, 18.6), 'Cut them loose', () => q.at('q_taken', 'free') && !g.activity, () => this.free());
    I('a5cage', [HC.cage.x - 0.4, HC.cage.z + 1.2], 'Take off her hood', () => q.at('q_taken', 'cage') && !this.busy, () => this.cage());
    SOT.forEach(([id, text, where]) => g.ravens.addMarkable({ id: 'a5sot_' + id, pos: () => { const p = HC[where]; return { x: p[0], z: p[1] }; }, r: 44, label: text, enabled: () => q.at('q_taken', 'sot') && c.phase === 'hnight',
      onMark: () => { c.sub(text, 4, '{b}'); q.notify('event', 'a5sot'); } }));
  }
  /** Nobody can see a man who is up to his chin in a tanning pit. */
  hidden() { return !!this.inPit; }
  clear(phase) {
    const g = this.g, c = this.c, on = CAMP.includes(phase);
    this.HC.stages.supply.set(phase !== 'hdawn');
    this.ottar.visible = false; for (const m of this.dogs) m.visible = false;
    if (this.inPit) { g.player.float = null; g.player.frozen = false; } this.inPit = false; this.sniff = null; this.busy = false; this.fought = false; this.shotT = 3; this.leifSaid = false;
    c.act.stealthActive = false; g.ui.setDetection(-1);
    if (on && g.combat.active) g.combat.clear();
  }
  land() { const p = this.g.player, [x, z] = this.HC.land; p.teleport(x, z, Math.PI); if (p.equipped !== 'none') p.equip('none'); this.mates(); }
  /** Astrid and Leif, beside him. */
  mates() {
    const p = this.g.player, tk = this.at('q_taken');
    for (const [id, k, hold, side] of [['astrid', 1.6, 'bow', 'L'], ['leif', -1.6, 'seax', 'R']]) {
      const n = this.put(id, p.pos.x + k, p.pos.z + 1.6, Math.PI); n.h.hold(side, hold); n.talk = () => n.say('...', 1.5);
      if (tk <= 9) n.follow(p, { dist: id === 'astrid' ? 2.6 : 3.4, matchCrouch: true });
    }
    if (tk >= 9 && tk < 99 && this.c.phase === 'hnight') this.c.npc('leif').visible = false; // he has taken the eleven out through the tannery
  }
  toCamp() {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true;
    g.ui.fade(true, 1.2).then(() => g.ui.card("Håkon's hunting camp", "The hunting camp is fortified: a palisade, dogs, thirty guards and Håkon's hawks and falcons in long wooden mews.", 8))
      .then(() => { c.setPhase('hnight', true); this.land(); g.quests.notify('talk', 'astrid'); return g.ui.fade(false, 1.4); }).then(() => { p.frozen = false; });
  }
  dress(name) {
    const g = this.g, c = this.c, p = g.player, w = g.world, HC = this.HC, T = [...c.sea.town, ...c.sea.pen], F = c.battle.foes, tk = this.at('q_taken'), X = (dx, dz) => this.X(dx, dz);
    this.mates();
    if (name === 'hdawn') { // the harbor at dawn: the ships have sailed
      T.forEach((n, i) => { const [x, z] = [HC.land[0] - 6 + (i % 4) * 2.4, HC.land[1] + 4 + Math.floor(i / 4) * 2]; n.name = 'One of the eleven'; this.put(n, x, z, Math.PI, i % 3 ? null : 'sit'); n.talk = () => n.say('...', 2); });
      return;
    }
    // the guards who walk, the ones round the fire, and Ottar asleep by his birds
    const guard = (n, x, z, hold = 'spear') => { this.put(n, x, z, 0, null, hold); n.name = "One of Håkon's guards"; n.talk = null; return n; };
    if (tk <= 9) {
      PATROLS.forEach((pt, i) => guard(F[i], ...X(...pt[0])).makeRaider(pt.map(([dx, dz]) => X(dx, dz)), { pause: 2.6, shout: SHOUT }));
      FIRE.forEach(([dx, dz], i) => { const n = guard(F[3 + i], ...X(dx, dz), 'axe'); n.yaw = Math.atan2(HC.fire[0] - n.pos.x, HC.fire[1] - n.pos.z); n.root.rotation.y = n.yaw; n.makeRaider([], { busy: true }); n.setLoop('sit'); });
      this.put(this.ottar, HC.mews[0] - 7.4, HC.mews[1] + 0.6, Math.PI / 2, 'sit'); this.ottar.talk = null;
      if (!this.campFire) this.campFire = g.fx.addFire(HC.fire[0], w.groundAt(...HC.fire) + 0.2, HC.fire[1], 1.0);
    }
    [0, 1].forEach((i) => { const m = this.dogs[i], x = HC.kennel[0] - 1 + i * 2, z = HC.kennel[1] + 1.9; m.visible = true; m.position.set(x, w.groundAt(x, z) + 0.06, z); m.rotation.set(0, 1.6 + i, 1.45); }); // asleep by the kennel
    if (tk <= 8) T.forEach((n, i) => { const x = HC.pen.x - 3.6 + (i % 4) * 2.4, z = HC.pen.z - 2.4 + Math.floor(i / 4) * 2.4; n.name = 'A prisoner'; this.put(n, x, z, 1 + i, i % 2 ? 'sit' : 'cower'); n.talk = null; });
    else for (const n of T) n.visible = false;
    c.act.stealthActive = tk >= 7 && tk <= 9;
  }
  dyn(name) {
    const q = this.g.quests;
    if (name !== 'a5work' || !q.at('q_taken', 'pits')) return undefined;
    const pt = this.HC.pits[1]; return this.inPit ? null : { x: pt.x, z: pt.z, y: this.g.world.groundAt(pt.x, pt.z) + 2 };
  }
  talk(id, n) { if (!CAMP.includes(this.c.phase)) return false; n.say('...', 1.5); return true; }

  // ---- the pits ---------------------------------------------------------------------------------
  enterPit(i) {
    const g = this.g, c = this.c, p = g.player, w = g.world, P = this.HC.pits, sink = (n, pt) => this.fix(n, pt.x, w.groundAt(pt.x, pt.z) - 1.3, pt.z, 0.4, null);
    this.inPit = true; p.frozen = true; p.crouch = false; p.teleport(P[i].x, P[i].z, p.yaw); p.float = w.groundAt(P[i].x, P[i].z) - 1.3;
    sink(c.npc('astrid'), P[(i + 1) % 3]); sink(c.npc('leif'), P[(i + 2) % 3]); g.audio.play('splash', { vol: 0.5 }); c.hint(null);
    if (!this.sniff) this.sniffStart(0.5);
  }
  leavePit() {
    const g = this.g, c = this.c, p = g.player, P = this.HC.pits;
    this.inPit = false; p.float = null; p.frozen = false; p.teleport(p.pos.x, p.pos.z + 2.2, p.yaw); g.audio.play('splash', { vol: 0.4 });
    for (const [id, k] of [['astrid', 1.4], ['leif', -1.4]]) { const n = this.put(id, p.pos.x + k, p.pos.z + 0.8, 0); n.talk = () => n.say('...', 1.5); n.h.hold(id === 'astrid' ? 'L' : 'R', id === 'astrid' ? 'bow' : 'seax'); n.follow(p, { dist: id === 'astrid' ? 2.6 : 3.4, matchCrouch: true }); }
  }
  /** A guard walks two dogs round the tannery yard. */
  sniffStart(delay) {
    const g = this.g, c = this.c, h = c.battle.foes[6], w = g.world;
    this.sniff = { t: -delay, state: 'wait', h };
    g.after(Math.max(0.01, delay), () => {
      if (!this.sniff) return;
      const [x, z] = this.X(...SNIFF[0]); this.put(h, x, z, 0, null, 'spear'); h.name = 'A dog-handler'; h.talk = null; this.sniff.state = 'round';
      h.goPath(SNIFF.slice(1).map(([dx, dz]) => this.X(dx, dz)), { speed: 2.3, onArrive: (o) => { o.visible = false; this.dogs[2].visible = this.dogs[3].visible = false; if (this.sniff) this.sniff.state = 'gone'; } });
      [2, 3].forEach((i) => { const m = this.dogs[i]; m.visible = true; m.rotation.set(0, 0, 0); m.position.set(x, w.groundAt(x, z), z + 1); });
      g.audio.play('bird', { vol: 0.3 });
    });
  }
  // ---- the pen, the cage ----------------------------------------------------------------------------
  free() {
    const g = this.g, c = this.c, [x, z] = this.X(-64.4, 18.6), T = [...c.sea.town, ...c.sea.pen], l = c.npc('leif'), door = this.HC.door, way = this.HC.way;
    new Knack(g, { label: 'Cut the eleven prisoners loose', verb: 'cut', cfg: A5.knack.free, anim: 'pickup', animDur: 0.7, sound: 'chop', bad: 'The knot holds', at: [x, z, Math.atan2(this.HC.pen.x - x, this.HC.pen.z - z)], seed: 3,
      onDone: () => {
        l.stop(); l.crouch = true; l.goPath([[door[0], door[1] - 2], way, [way[0] - 4, way[1] + 26]], { onArrive: (o) => { o.visible = false; } });
        T.forEach((n, i) => { n.setLoop(null); n.crouch = true; g.after(0.4 + i * 0.5, () => n.goPath([[x + 1, z + 2], [door[0], door[1] - 2], way, [way[0] - 4 + (i % 3), way[1] + 24]], { speed: 2.2, onArrive: (o) => { o.visible = false; } })); });
        c.sub('Eirik refuses to leave them. That costs time.', 6); g.quests.notify('event', 'a5free');
      } }).start();
  }
  cage() {
    const g = this.g, c = this.c, p = g.player;
    this.busy = true; p.frozen = true; p.h.play('pickup', 1.0);
    c.say('a5_cage', null, () => { p.frozen = false; this.busy = false; g.audio.play('raven', { vol: 0.5 }); g.quests.notify('event', 'a5cage'); });
  }
  // ---- out through the tannery --------------------------------------------------------------------------
  fight() {
    const g = this.g, c = this.c, p = g.player, R = { ...A5.camp.fight, name: "One of Håkon's guards" }, [yx, yz] = this.HC.yard, door = this.HC.door;
    this.fought = true; c.act.stealthActive = false; g.ui.setDetection(-1); p.mortal = true; p.crouch = false; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    const l = this.put('leif', yx - 3, yz + 4, [door[0], door[1]], 'guard', 'seax'); l.talk = null; c.npc('astrid').stop(); c.npc('astrid').crouch = false;
    for (const n of c.battle.foes) n.visible = false; // the ones by the fire come running
    c.battle.startSkirmish(['leif'], [[door[0], door[1] + 1.5], [door[0] + 1, door[1] + 3]], R.n, R.atOnce, () => this.dawn(), R);
    g.audio.setMusic('raid'); g.audio.play('shout'); g.ui.questBanner('The tannery yard', 'out, with all of them');
  }
  dawn() {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true; p.mortal = false; g.audio.setMusic('sorrow');
    g.ui.fade(true, 1.6).then(() => g.ui.card('', "By dawn, Håkon's supply ships have sailed from the camp's harbor, loaded with grain and weapons for Svartøy. If Eirik had gone straight for the harbor, he could have burned them.", 10))
      .then(() => { c.setPhase('hdawn', true); this.land(); p.yaw = -2.4; p.root.rotation.y = p.yaw; if (p.equipped !== 'none') p.equip('none'); return g.ui.fade(false, 1.6); })
      .then(() => { c.sub('Saving the ones he loves has a cost. He knows it, and he would do it again.', 8); return new Promise((r) => g.after(9, r)); })
      .then(() => g.ui.fade(true, 1.4)).then(() => { g.quests.notify('event', 'a5tan'); return g.ui.fade(false, 1.4); }).then(() => { p.frozen = false; });
  }

  // =====================================================================================
  steps = {
    'q_taken.eye'(r) {
      const c = this.c; c.setPhase('hnight', r); if (r) this.land(); c.hint('sotEye');
      if (!r) c.sub("Eirik cannot use {w}'s eyes. He has never felt so blind. He uses {b} instead, but {b} sees the world as a list of things to steal and people to hate, and his pictures are hard to read.", 12);
    },
    'q_taken.sot'(r) { const c = this.c; c.setPhase('hnight', r); if (r) this.land(); c.hint('sotEye'); },
    'q_taken.yard'(r) {
      const g = this.g, c = this.c; c.setPhase('hnight', r); if (r) this.land(); g.ravens.exitEye(); c.hint('sneak');
      if (!r) c.sub("They get in at night through the camp's tannery yard. The tanning pits are full of animal hides soaking in a mixture of urine, dog dung and lime, which is how hides are softened.", 11);
    },
    'q_taken.pits'(r) {
      const g = this.g, c = this.c; c.setPhase('hnight', r); if (r) { g.player.teleport(...this.HC.way, Math.PI); this.mates(); } c.hint('pit');
      c.sub('When the dogs come sniffing, the three of them have to climb into the pits and sink up to their chins.', 8); if (!this.sniff) this.sniffStart(A5.camp.pit - 8);
    },
    'q_taken.pen'(r) { const g = this.g, c = this.c; c.setPhase('hnight', r); this.dress2(); if (r) { g.player.teleport(...this.HC.yard, Math.PI); this.mates(); } g.player.crouch = true; c.hint('sneak'); },
    'q_taken.free'(r) {
      const g = this.g, c = this.c; c.setPhase('hnight', r); this.dress2(); if (r) { g.player.teleport(...this.X(-62, 21), 2.4); this.mates(); }
      c.sub('Inside, they find more than the raven. There is a pen of eleven prisoners: farmers taken from the coast, waiting to be shipped to Svartøy as thralls.', 9);
    },
    'q_taken.cage'(r) { const g = this.g, c = this.c; c.setPhase('hnight', r); this.dress2(); if (r) { g.player.teleport(...this.X(-62, 21), 2.4); this.mates(); } c.hint('sneak'); },
    'q_taken.fight'(r) {
      const g = this.g, c = this.c; c.setPhase('hnight', r); c.act.stealthActive = false; g.ui.setDetection(-1); c.hint(null);
      if (r) { g.player.teleport(...this.X(-53, 26), 0); this.mates(); }
      else c.sub('They get out with the raven and all eleven prisoners, but it takes the whole night.', 7);
    },
  };
  /** Stealth is on from the tannery door inward. */
  dress2() { const tk = this.at('q_taken'); this.c.act.stealthActive = tk >= 7 && tk <= 9; }

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, w = g.world, F = c.battle.foes;
    if (!CAMP.includes(c.phase)) return;
    this.crew([c.npc('astrid'), c.npc('leif')], dt);
    const s = this.sniff;
    if (s && s.h.visible) { // the dogs go ahead of him, noses down
      [2, 3].forEach((i, k) => { const m = this.dogs[i], a = s.h.yaw + (k ? 0.5 : -0.5), x = s.h.pos.x + Math.sin(a) * 1.7, z = s.h.pos.z + Math.cos(a) * 1.7; m.position.set(x, w.groundAt(x, z), z); m.rotation.y = s.h.yaw; const sw = Math.sin(g.sky.time * 900 + k) * 0.5, lg = m.userData.legs; lg[0].rotation.x = sw; lg[1].rotation.x = -sw; lg[2].rotation.x = -sw; lg[3].rotation.x = sw; });
    }
    if (g.mode !== 'play') return;
    if (s && q.at('q_taken', 'pits')) {
      s.t += dt;
      if (this.inPit && !this.leifSaid && s.state === 'round' && s.t > 7) { this.leifSaid = true; c.sub('Leif mouths silently into the darkness, I will never forgive you for this.', 6.5); }
      if (s.state === 'round' && !this.inPit && (s.h.dist(p) < 8.5 || this.dogs[2].position.distanceTo(p.pos) < 6)) { g.audio.play('shout'); return c.onCaught(s.h); }
      if (s.state === 'gone') {
        this.sniff = null;
        if (!this.inPit) return q.notify('event', 'a5pits');
        c.sub('The dogs do not smell them. Nothing could smell anything over that pit.', 6); g.after(3.5, () => { if (this.inPit) { this.leavePit(); q.notify('event', 'a5pits'); } });
      }
    }
    if (c.act.stealthActive) { let aware = 0; for (const n of F) if (n.raider && n.visible) aware = Math.max(aware, n.aware); g.ui.setDetection(aware); if (aware > 0.3 && ((this.hb = (this.hb || 0) + dt) > 1.1)) { this.hb = 0; g.audio.play('heart', { vol: Math.min(1, Math.max(0.3, aware)) }); } }
    if (q.at('q_taken', 'fight') && !this.fought && c.phase === 'hnight' && Math.hypot(p.pos.x - this.HC.yard[0], p.pos.z - this.HC.yard[1]) < 8) this.fight();
    if (c.battle.sk) {
      c.battle.updateSkirmish(dt);
      if ((this.shotT -= dt) <= 0 && c.battle.sk) { this.shotT = A5.camp.astrid[0]; const live = c.battle.sk.live.filter((e) => !e.dead && e.cb), e = live[(Math.random() * live.length) | 0], a = c.npc('astrid'); if (e) { a.face(e.pos.x, e.pos.z); a.h.play('shoot', 0.8); g.audio.play('bow', { vol: 0.6 }); g.after(0.45, () => { if (!e.dead && e.cb) g.combat.hurt(e, A5.camp.astrid[1], 30); }); } }
    }
  }
}
