// Act II — "The Farmer's Axe", as the owner's story tells it (docs/story, Act II): nine chapters in Bjornstead, the
// coastal village of twenty roofs, and in Kaupang. This file holds what every chapter of the mainland acts shares
// (the village and its people, the times of day, the helpers) and Act II's Chapters 1 to 3. Act III ("The Wolves
// of Iron") runs on the same machinery: its chapters are in act3_home.js, act3_isle.js and act3_battle.js. The raid and the Hall of Wolves are in act2_raid.js,
// the peddlers and the walls in act2_winter.js, Kaupang and the first oath in act2_sea.js.
// Step handlers are idempotent: they run on play, on load and from the test harness (r = restoring).
import * as THREE from 'three';
import { shared, M, box, cyl, sphere, tint, at } from '../world/geo.js';
import { DIALOGUE, HINTS } from '../data/act1.js';
import { CAST2, KIDS, VILLAGERS, A2 } from '../data/act2.js';
import { EIRIK_ADULT } from '../entities/player.js';
import { horseModel } from '../entities/wildlife.js';
import { goatModel, pigModel, cowModel } from '../entities/beasts.js';
import { Woodcutting } from '../systems/activities.js';
import { Knack, Bout } from '../systems/activities2.js';
import { dampAngle } from '../core/util.js';
import { A2Raid } from './act2_raid.js';
import { A2Winter } from './act2_winter.js';
import { A2Sea } from './act2_sea.js';
import { A3Home } from './act3_home.js';
import { A3Isle } from './act3_isle.js';
import { A3Battle } from './act3_battle.js';
import { A4Home } from './act4_home.js';
import { A4Voyage } from './act4_voyage.js';
import { A4Wessex } from './act4_wessex.js';
import { A4Six } from './act4_six.js';
import { A4Sound } from './act4_sound.js';

const SUMMER = { snow: 0, fog: 0, overcast: 0.06, wind: 0.9 }, MIST = { snow: 0, fog: 0.05, overcast: 0.3, wind: 0.8 }, DUSK = { snow: 0, fog: 0.03, overcast: 0.4, wind: 1.3 }, GREY = { snow: 0, fog: 0.02, overcast: 0.55, wind: 1.2 }, FROST = { snow: 0.08, fog: 0.03, overcast: 0.5, wind: 1.2 }, SMOKE = { snow: 0, fog: 0.06, overcast: 0.6, wind: 1.3 }, FOG = { snow: 0, fog: 0.12, overcast: 0.7, wind: 0.6 };
/** The times of day the act moves through: hour, weather, music, and whether the feast is laid. */
export const PHASES = {
  morning: { time: 8.6, w: SUMMER, day: true }, hunt: { time: 11.2, w: SUMMER, day: true }, thing: { time: 13.4, w: SUMMER }, feast: { time: 16.72, w: SUMMER, feast: true }, dawn: { time: 7.12, w: MIST, day: true },
  raid: { time: 16.7, w: DUSK, music: 'raid' }, after: { time: 17.1, w: DUSK, music: 'sorrow' }, hall: { time: 16.35, w: GREY, music: 'sorrow' },
  ped: { time: 12.6, w: GREY, day: true }, pednight: { time: 22.5, w: GREY, music: 'sorrow' }, pedmorn: { time: 8.2, w: GREY, day: true }, pedeve: { time: 21.5, w: GREY, music: 'sorrow' },
  stones: { time: 10.5, w: GREY }, work: { time: 12.2, w: SUMMER, day: true }, frost: { time: 9.4, w: FROST, snow: 0.07, day: true },
  market: { time: 11.5, w: SUMMER, at: 'kaupang' }, tavern: { time: 17.4, w: DUSK, at: 'kaupang' }, skerry: { time: 9.2, w: SUMMER, at: 'kaupang' }, kthing: { time: 13, w: SUMMER, at: 'kaupang' },
  oath: { time: 16.72, w: FROST, snow: 0.07, feast: true }, oathnight: { time: 22, w: FROST, snow: 0.07, music: 'sorrow' },
  // Act III: Ravenhold through a year, and Jarnøy
  a3spring: { time: 9.2, w: SUMMER, day: true }, a3stones: { time: 10.6, w: GREY }, a3month: { time: 13, w: SUMMER, day: true }, a3hills: { time: 15.2, w: GREY, day: true }, a3drill: { time: 8.4, w: MIST, day: true },
  jday: { time: 11, w: SUMMER, at: 'jarnoy' }, jtax: { time: 10.2, w: GREY, at: 'jarnoy' }, jnine: { time: 15.4, w: GREY, at: 'jarnoy' }, jprep: { time: 13, w: SUMMER, at: 'jarnoy' },
  jdawn: { time: 7.25, w: MIST, at: 'jarnoy', music: 'raid' }, jbattle: { time: 8.8, w: SMOKE, at: 'jarnoy', music: 'raid' }, jnight: { time: 21.6, w: GREY, at: 'jarnoy', music: 'sorrow' }, jfeast: { time: 16.6, w: SUMMER, at: 'jarnoy' },
  a3autumn: { time: 12.5, w: GREY, day: true }, a3yew: { time: 16.2, w: SUMMER, day: true },
  // Act IV: Ravenhold two years on; the decks at sea; Wessex; the six islands; Hedeby Sound
  a4quiet: { time: 9.4, w: SUMMER, day: true }, a4refuge: { time: 15, w: SMOKE, day: true }, a4frost: { time: 13.2, w: FROST, snow: 0.07, feast: true }, a4week: { time: 18.3, w: GREY, music: 'sorrow' }, a4sail: { time: 8.2, w: MIST, day: true },
  a4burn: { time: 17.4, w: SMOKE, music: 'sorrow' }, a4dark: { time: 22.2, w: GREY, music: 'sorrow' },
  a4sea: { time: 11, w: SUMMER, at: 'sea' }, a4seaeve: { time: 17.9, w: DUSK, at: 'sea' }, a4fog: { time: 9.6, w: FOG, at: 'sea', music: 'raid' }, a4seanight: { time: 22, w: GREY, at: 'sea', music: 'sorrow' },
  a4home: { time: 14, w: GREY, at: 'sea' }, a4homenight: { time: 23, w: GREY, at: 'sea', music: 'sorrow' }, a4smoke: { time: 10.4, w: SMOKE, at: 'sea', music: 'sorrow' },
  wday: { time: 11, w: SUMMER, at: 'wessex' }, wherb: { time: 14.2, w: SUMMER, at: 'wessex' }, wmorn: { time: 7.4, w: MIST, at: 'wessex' }, wdusk: { time: 17.8, w: DUSK, at: 'wessex' },
  kinn: { time: 12, w: SMOKE, at: 'six', music: 'raid' }, fedje: { time: 14, w: GREY, at: 'six', music: 'sorrow' }, skorpa: { time: 17, w: DUSK, at: 'six', music: 'raid' }, gulen: { time: 10, w: GREY, at: 'six', music: 'sorrow' },
  solvik: { time: 15, w: SMOKE, at: 'six', music: 'sorrow' }, solviknight: { time: 22.4, w: GREY, at: 'six', music: 'sorrow' }, solvikmorn: { time: 7.6, w: MIST, at: 'six' },
  hsail: { time: 10.2, w: MIST, at: 'hedeby' }, hbattle: { time: 11.4, w: SMOKE, at: 'hedeby', music: 'raid' }, hbeach: { time: 21, w: GREY, at: 'hedeby', music: 'sorrow' },
};
/** Where the village stands on an ordinary day: [dx, dz, facing (a yaw, or a point to face), loop, held]. */
const DAY = {
  signe: [-2.5, 122.6, [-2.5, 126], 'cook'], bjorn: [-19.6, 131.8, [-23, 130]], freydis: [12, 150, 2.6], hauk: [58, 127, 1.2, 'hoe', 'hoe'], grjotgard: [-70, 139.6, 0.4], lawman: [-88.6, 95.6, 2.2, 'sit'],
  girl1: [7.3, 141.4, [9, 139]], girl2: [11.2, 140.6, [9, 139]],
  v0: [0.4, 250, 0.2, 'fish', 'rod'], v1: [-9.4, 119.7, [-9.4, 118], 'weave'], v2: [12.6, 213, 1.0, 'kneel'], v3: [-30, 151, 1.6], v4: [-126, 100, 0.6, 'hoe', 'hoe'], v5: [27, 98.6, 2.0, 'cook'],
  v6: [-51.4, 157.4, [-51.4, 158.6], 'hammer', 'hammer'], v7: [40, 148, -1.5], v8: [0.5, 119.7, 0, 'sit'], v9: [93, 42, 1.0],
  kid0: [-6, 142, 1], kid1: [-3, 146, 2], kid2: [4, 152, 3], kid3: [16, 134, 4], kid4: [-12, 150, 5], kid5: [20, 142, 0],
};
const IDLE = ['A good day for it.', 'The herring are late this year.', 'Old Skeggi got into my washing again.', 'Bjorn says the weather will hold.', 'Mind the pigs. They remember faces.', 'Your birds have been at the fish racks.']; // (game: village small talk)

export class Act2 {
  constructor(game, act) {
    this.g = game; this.act = act; this.built = false; this.phase = null; this.t = 0; this.heard = {};
    this.raid = new A2Raid(game, this); this.winter = new A2Winter(game, this); this.sea = new A2Sea(game, this);
    this.home3 = new A3Home(game, this); this.isle = new A3Isle(game, this); this.battle = new A3Battle(game, this);
    this.home4 = new A4Home(game, this); this.voy = new A4Voyage(game, this); this.wx = new A4Wessex(game, this); this.six = new A4Six(game, this); this.snd = new A4Sound(game, this);
    this.parts = [this.raid, this.winter, this.sea, this.home3, this.isle, this.battle, this.home4, this.voy, this.wx, this.six, this.snd]; // in the order they are built
    this.talkers = [this.snd, this.six, this.wx, this.voy, this.home4, this.home3, this.isle, this.battle, this.raid, this.winter, this.sea]; // the later act answers first
    this.steps = {};
    for (const [k, f] of Object.entries(this.own)) this.steps[k] = f.bind(this);
    for (const part of this.parts) for (const [k, f] of Object.entries(part.steps)) this.steps[k] = f.bind(part);
  }
  get st() { return this.g.state; }
  get W() { return this.g.world.main.bjornstead; }
  npc(id) { return this.g.npcs.get(id); }
  /** A point in Bjornstead, by offset from its centre. */
  B(dx, dz) { const s = this.W.s; return [s.x + dx, s.z + dz]; }
  hint(k) { this.g.ui.hint(k ? this.g.fmt(HINTS[k] || k) : null); }
  sub(text, dur = 5, speaker = '') { this.g.ui.subtitle(this.g.fmt(speaker), this.g.fmt(text), dur); }
  /** Narration, one line after another. */
  tell(lines, each = 5.5) { lines.forEach((t, i) => this.g.after(i * each + 0.01, () => this.sub(t, each - 0.3))); return new Promise((r) => this.g.after(lines.length * each, r)); }
  /** A conversation from the act's script; a node with fx.do = 'name' calls this.cue(name). */
  say(id, npc, onEnd) {
    const g = this.g;
    g.dialogue.trees.__a2 = DIALOGUE[id].map((n) => (n.fx && typeof n.fx.do === 'string' ? { ...n, fx: { ...n.fx, do: () => this.cue(n.fx.do) } } : n));
    g.dialogue.start('__a2', { npc: npc || null, onEnd });
  }
  cue(name) { for (const p of [this, ...this.parts]) if (p.cues && p.cues[name]) return p.cues[name].call(p); }
  fade(mid, out = 1.0, back = 1.0) { const g = this.g; g.player.frozen = true; return g.ui.fade(true, out).then(() => mid()).then(() => g.ui.fade(false, back)).then(() => { g.player.frozen = false; }); }
  fail(title, text) {
    const g = this.g, A = this.act;
    if (A.failing) return;
    A.failing = true; g.player.frozen = true; g.player.h.play('fall', 1.2, { onEnd: () => { g.player.loopOverride = 'dead'; } });
    g.ui.fade(true, 1.8).then(() => g.ui.card(title, text, 3.4)).then(() => g.reloadCheckpoint());
  }

  // =====================================================================================
  // The village and its people (built once)
  // =====================================================================================
  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g, A = this.act, p = g.player, st = this.st, W = this.W, q = g.quests;
    st.stage = 'act2'; st.flags.a2v = 2;
    for (const n of g.npcs.values()) { n.visible = false; n.talk = null; }
    A.cookFire.on = A.greenFire.on = A.forgeFire.on = A.campFire.on = false;
    A.glowTarget = 0; g.sky.fireGlow = 0; A.snowTarget = 0; shared.uSnow.value = 0;
    A.tracks.visible = false; A.clearPickups(); g.wildlife.clear();
    p.setLook(EIRIK_ADULT, true);
    if (!g.inventory.has('bow')) g.inventory.add('bow', 1, true);
    if (g.inventory.count('arrow') < 14) g.inventory.add('arrow', 14 - g.inventory.count('arrow'), true);
    if (st.flags.axeHidden === undefined) st.flags.axeHidden = true;
    if (st.flags.axeHidden && g.inventory.has('father_axe')) g.inventory.remove('father_axe', 9, true); // under the flat stone by the hearth, untouched for ten years
    p.showBackAxe(!st.flags.axeHidden); g.ravens.setMode('follow');

    const mk = (id, def) => { const n = g.addNPC(id, def); n.talk = () => this.talkTo(id); n.visible = false; return n; };
    for (const id of ['bjorn', 'signe', 'freydis', 'hauk', 'grjotgard', 'lawman', 'girl1', 'girl2']) mk(id, CAST2[id]);
    KIDS.forEach((look, i) => { const n = mk('kid' + i, { name: 'A child', look, runSpeed: 3.2 }); n.kid = true; });
    VILLAGERS.forEach(([name, look], i) => mk('v' + i, { name, look }));
    this.folk = ['hauk', 'grjotgard', 'lawman', 'girl1', 'girl2', ...VILLAGERS.map((_, i) => 'v' + i), ...KIDS.map((_, i) => 'kid' + i)];

    // fires: the forge, and the cooking fire before the hall
    const f = W.forge; this.forgeFire = g.fx.addFire(f.x, f.y, f.z, 0.4, { smoke: true });
    const [cx, cz] = this.B(-2.5, 126.4); this.cook = g.fx.addFire(cx, g.world.groundAt(cx, cz) + 0.15, cz, 0.5);
    const [fx, fz] = this.B(12, 130.5); this.feastFire = g.fx.addFire(fx, g.world.groundAt(fx, fz) + 0.2, fz, 1.2, { on: false });
    // animals: sheep by the stream, pigs in the sty, Old Skeggi
    for (const [dx, dz] of [[96, 30], [102, 36], [106, 28], [92, 40], [110, 42], [100, 24]]) g.wildlife.spawn('sheep', ...this.B(dx, dz), { home: { x: this.B(100, 34)[0], z: this.B(100, 34)[1], r: 14 } });
    this.pigs = [[48, 151, 0.6], [52.5, 152.5, 2.2], [50, 148.5, 4]].map(([dx, dz, ry]) => { const m = pigModel(), [x, z] = this.B(dx, dz); m.position.set(x, g.world.groundAt(x, z) + 0.04, z); m.rotation.y = ry; g.scene.add(m); return m; });
    this.goat = { m: goatModel(), pos: null, yaw: 0, speed: 0, to: null, roof: false, hop: 0 }; this.goat.pos = this.goat.m.position; g.scene.add(this.goat.m); this.goatHome();
    this.cow = cowModel(); { const [x, z] = this.B(-86, 99); this.cow.position.set(x, g.world.groundAt(x, z), z); this.cow.rotation.y = 0.8; this.cow.visible = false; g.scene.add(this.cow); }

    // things to use
    const w = g.world, I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 2.4, priority: 2, label, enabled, use, ...o });
    I('a2chop', this.B(-23, 130), 'Split the firewood', () => q.at('q_ten', 'split'), () => this.chop());
    I('a2elk', this.B(146, -52), 'The fallen elk', () => q.at('q_farm', 'elk'), () => this.elk(), { r: 3.2 });
    I('a2feast', this.B(-4, 119.4), 'Wait for the feast', () => q.at('q_farm', 'feast'), () => this.fade(() => { this.setPhase('feast', true); g.player.teleport(...this.B(-2, 138), Math.PI); }).then(() => q.notify('event', 'a2feast')), { r: 3 });
    const mark = (id, dx, dz, label, enabled, onMark, r = 34) => g.ravens.addMarkable({ id, pos: () => { const [x, z] = this.B(dx, dz); return { x, z }; }, r, label, enabled, onMark });
    for (const [id, dx, dz, label, word] of [['a2water', 152, -84, 'the stream, running low', 'Water.'], ['a2blood', 131, -66, 'something dark on the leaves', 'Blood.'], ['a2branch', 139, -57, 'a snapped birch bough', 'Broken branch.']])
      mark(id, dx, dz, label, () => q.at('q_farm', 'signs'), () => { this.sub(word, 3.5, '{w}'); q.notify('event', 'a2sign'); });
    g.ravens.addMarkable({ id: 'a2riders', pos: () => this.riderPos(), r: 90, label: 'armed men on the river road', enabled: () => q.at('q_smoke', 'spot'),
      onMark: () => { this.sub('Seven armed men coming along the road, wolf heads painted on their shields. The man in front rides a black horse. He holds the reins in his left hand. His right hand is a twisted, scarred claw.', 10); q.notify('event', 'ridersSpotted'); } });
    // the signs of the hunt: blood on the leaves, the broken bough
    const sg = (g2, dx, dz, y = 0.05) => { const [x, z] = this.B(dx, dz), m = new THREE.Mesh(g2, M.vcPlain); m.position.set(x, w.groundAt(x, z) + y, z); g.scene.add(m); return m; };
    sg(tint(at(sphere(0.5, 7, 5), 0, 0, 0, 0, 0, 0, 1.2, 0.05, 0.8), 0x5a1410, 0.2, 2), 131, -66); sg(tint(at(cyl(0.05, 0.08, 2.4, 5), 0, 0.5, 0, 0, 0, 1.1), 0xd9d5c8, 0.2, 3), 139, -57, 0.3);
    this.elkBody = g.wildlife.spawn('deer', ...this.B(146, -52), { stag: true }); this.elkBody.dead = true; this.elkBody.harvested = true; this.elkBody.model.scale.setScalar(1.45); this.elkBody.model.visible = false;

    g.events.on('ravenEye', (on) => { if (on && st.stage === 'act2') q.notify('event', 'ravenEye'); });
    g.events.on('playerDied', () => { if (st.stage === 'act2') this.fail('Fallen', 'Guard. Wait for the opening. Break his guard, then strike.'); });
    for (const part of this.parts) part.build();
  }

  // ---- phases --------------------------------------------------------------------------
  post(id, spec) {
    const n = this.npc(id), [dx, dz, face, loop, hold] = spec, [x, z] = this.B(dx, dz);
    if (n.dead) n.revive();
    n.visible = true; n.cb = null; n.crouch = false; n.held = false;
    n.teleport(x, z, typeof face === 'number' ? face : face ? Math.atan2(this.B(face[0], face[1])[0] - x, this.B(face[0], face[1])[1] - z) : n.yaw);
    n.setLoop(loop || null); n.h.hold('R', hold || null); n.h.hold('L', null); n.faceT = null; n.talk = () => this.talkTo(id);
    return n;
  }
  /** Stand people in a ring round a point, facing it. */
  ring(ids, dx, dz, r0 = 4, loop = null, from = 0, arc = 6.283) {
    ids.forEach((id, i) => { const a = from + (i / ids.length) * arc, r = r0 + (i % 3) * 1.1; this.post(id, [dx + Math.cos(a) * r, dz + Math.sin(a) * r, [dx, dz], loop]); });
  }
  /** The world as the story has left it so far. */
  /** How far the story has come, read from the quests (so a load, or a jump in a test, sees the same village). */
  prog() {
    const q = this.g.quests, sq = this.st.quests, step = (id) => (sq[id] && sq[id].status === 'active' ? sq[id].step : -1), done = (id) => q.isDone(id), w = step('q_walls'), pd = step('q_peddlers');
    return { raided: done('q_axe') || step('q_axe') >= 9, armed: done('q_axe') || step('q_axe') >= 2, walls: done('q_walls') || w >= 9 ? 4 : w >= 8 ? 3 : w >= 7 ? 2 : w >= 6 ? 1 : 0,
      seaRaven: done('q_captain'), peddlers: pd >= 0 && pd <= 6, netUp: pd === 5 || pd === 6, frying: pd >= 7 || done('q_peddlers'),
      ravenhold: !!sq.q_fifty, forge2: done('q_iron') || step('q_iron') >= 3,
      a4: !!sq.q_gold, refugees: done('q_six') || step('q_six') >= 4, fleet: !!sq.q_council && !sq.q_drift, burnt: !!sq.q_drift };
  }
  applyWorld() {
    const fl = this.prog(), S = this.W.stages, K = this.g.world.main.kaupang.stages, walls = fl.walls;
    if (fl.armed) this.ensureArmed();
    S.homes.set(!fl.raided); S.ashes.set(!!fl.raided);
    S.ditch.set(walls >= 1); S.trench.set(walls >= 2); S.privy.set(walls < 2); S.wall.set(walls >= 3); S.tower.set(walls >= 4);
    S.searaven.set(!!fl.seaRaven); K.ship.set(!fl.seaRaven); S.raven.set(fl.ravenhold); S.forge2.set(fl.forge2);
    S.camp.set(!!fl.peddlers); S.net.set(!!fl.netUp);
    S.market.set(fl.a4); S.heal.set(fl.a4); S.ware.set(fl.a4 && !fl.burnt); S.refugees.set(fl.refugees); S.fleet.set(fl.fleet); S.burnt.set(fl.burnt); S.crowns.set(fl.a4);
    if (fl.frying && !this.pan) { const [x, z] = this.B(-2.6, 117.9), m = new THREE.Mesh(tint(at(cyl(0.17, 0.17, 0.03, 12), 0, 0, 0, Math.PI / 2, 0, 0), 0x1c1c20, 0.1, 2), M.vcPlain); m.position.set(x, this.g.world.groundAt(x, z) + 1.5, z); this.g.scene.add(m); this.pan = m; // Skull-Ringer, on its peg by the door
      this.g.world.addInteractable({ id: 'a2pan', x, z, r: 1.6, label: 'Skull-Ringer', use: () => this.sub('The village laughs about the frying pan for years. Freydis keeps it on a peg by the door and calls it Skull-Ringer.', 6) }); }
  }
  ensureArmed() {
    const g = this.g, fl = this.st.flags;
    if (fl.axeHidden === false && g.inventory.has('father_axe') && g.inventory.has('shield')) return;
    fl.axeHidden = false;
    for (const id of ['father_axe', 'shield']) if (!g.inventory.has(id)) g.inventory.add(id, 1, true);
    g.player.showBackAxe(g.player.equipped !== 'father_axe');
  }
  setPhase(name, r) {
    this.build(); this.applyWorld();
    if (this.phase === name && !r) return;
    const g = this.g, A = this.act, ph = PHASES[name];
    this.phase = name;
    g.sky.time = ph.time; A.wTarget = { ...ph.w }; if (r) Object.assign(g.sky.weather, ph.w);
    A.snowTarget = ph.snow || 0; if (r) shared.uSnow.value = ph.snow || 0;
    g.audio.setMusic(ph.music || 'day');
    this.W.stages.feast.set(!!ph.feast); this.feastFire.on = !!ph.feast;
    this.cook.on = !ph.feast && g.sky.time < 17 && g.sky.time > 7.5 && !ph.at; this.forgeFire.on = this.cook.on;
    this.cow.visible = false; this.elkBody.model.visible = false;
    for (const id of this.folk) this.npc(id).visible = false;
    for (const id of ['bjorn', 'signe', 'freydis']) this.npc(id).visible = false;
    for (const part of this.parts) part.clear(name);
    const host = { kaupang: this.sea, jarnoy: this.isle, sea: this.voy, wessex: this.wx, six: this.six, hedeby: this.snd }[ph.at];
    if (host) return host.dress(name, r);
    this.dress(name, r);
  }
  /** Who is where in Bjornstead at this time of day. */
  dress(name) {
    const day = () => { for (const id in DAY) this.post(id, DAY[id]); };
    const all = [...this.folk.filter((id) => !id.startsWith('kid')), 'signe', 'freydis'];
    if (PHASES[name].day) day();
    if (name === 'morning') { this.npc('freydis').visible = this.g.quests.at('q_ten', 'freydis') || this.g.quests.isActive('q_farm'); }
    if (name === 'thing') { day(); this.post('hauk', [-88, 99, [-86, 99]]); this.post('grjotgard', [-84.4, 100.6, [-86, 99]]); this.post('lawman', [-91, 93.6, [-86, 99], 'talk']); this.post('bjorn', [-87, 94.4, [-86, 99]]); this.ring(['v3', 'v7', 'v9', 'v5'], -87, 98, 6.5, null, 0.6, 2.6); this.cow.visible = true; }
    if (name === 'feast' || name === 'oath') { // everyone at the long tables before the hall
      const seats = []; for (const tz of [128, 133.5]) for (const side of [-1, 1]) for (let i = 0; i < 5; i++) seats.push([-6.6 + i * 1.5, tz + side * 0.95, side > 0 ? Math.PI : 0, 'sit']);
      all.forEach((id, i) => { if (seats[i]) this.post(id, seats[i]); });
      this.post('bjorn', [3.4, 130.8, [-4, 130.8]]); this.post('freydis', [4.6, 135.6, [0, 135]]);
      KIDS.forEach((_, i) => this.post('kid' + i, DAY['kid' + i]));
    }
    if (name === 'dawn') { this.post('bjorn', [-2.4, 124.6, 0.4]); this.post('freydis', [-6, 123, 0.2]); for (const id of ['v0', 'v2', 'v4', 'hauk', 'v7', 'v9']) this.npc(id).visible = false; }
    for (const part of this.parts) if (part.dressed) part.dressed(name);
    if (name === 'stones') { this.ring(all.filter((id) => !['hauk', 'grjotgard', 'v4', 'v2'].includes(id)), -92, 92, 5.4, null, 0.3, 4.6); this.post('bjorn', [-88.4, 89, [-92, 92]]); this.post('hauk', [-99.6, 97, [-92, 92]]); this.post('grjotgard', [-84.6, 99.4, [-92, 92]]); this.post('v4', [-101, 84.4, [-103, 86]]); this.post('v2', [-102.6, 86.2, [-101, 84.4]]); }
  }

  // ---- conversations -------------------------------------------------------------------
  talkTo(id) {
    const g = this.g, q = g.quests, n = this.npc(id), done = () => q.notify('talk', id);
    for (const part of this.talkers) if (part.talk(id, n)) return;
    if (id === 'freydis' && q.at('q_ten', 'freydis')) return this.say('a2_freydis1', n, done);
    if (id === 'bjorn' && q.at('q_farm', 'bjorn')) return this.say('a2_hunt', n, done);
    if (q.at('q_farm', 'sides') && (id === 'hauk' || id === 'grjotgard')) return this.say(id === 'hauk' ? 'a2_hauk' : 'a2_grjot', n, () => { if (!this.heard[id]) { this.heard[id] = true; done(); } });
    if (id === 'bjorn' && q.at('q_farm', 'judge')) return this.say('a2_cow', n, done);
    if (id === 'freydis' && q.at('q_farm', 'kaestur')) return this.say('a2_kaestur', n, () => this.kaestur());
    if (id === 'bjorn' && q.at('q_farm', 'wrestle')) return this.say('a2_wrestle', n, () => this.wrestle());
    if (id === 'bjorn' && q.at('q_smoke', 'yard')) return this.tribute();
    if (n.kid) return n.say(['Skeggi ate a boot!', 'Is the white bird yours? Can I hold her?', 'Tag! You are the wolf!'][(Math.random() * 3) | 0], 3);
    n.say(g.fmt(IDLE[(Math.random() * IDLE.length) | 0]), 3.5);
  }

  // =====================================================================================
  // Chapter 1: Ten Winters
  // =====================================================================================
  chop() {
    const g = this.g, b = this.npc('bjorn'), [x, z] = this.B(-23, 130);
    const work = () => new Woodcutting(g, { x, z, count: A2.split, onDone: () => this.say('a2_wood2', b, () => { this.goat.loose = true; g.quests.notify('event', 'a2split'); }) }).start();
    if (this.wood1) return work();
    this.wood1 = true; this.say('a2_wood1', b, work);
  }
  goatHome() { const [x, z] = this.B(-15, 135), go = this.goat; go.roof = false; go.to = null; go.pos.set(x, this.g.world.groundAt(x, z), z); go.yaw = 2; go.m.rotation.set(0, 2, 0); }
  goatRoof() { const h = this.W.houses.hall, go = this.goat; go.roof = true; go.to = null; go.pos.set(h.ridgePts[2].x, h.ridgePts[2].y + 0.52, h.ridgePts[2].z); go.m.rotation.set(0, 1.57, 0); }
  updateGoat(dt) {
    const g = this.g, go = this.goat, p = g.player, q = g.quests, c = A2.goat;
    if (go.roof || !go.m.visible) return;
    if (q.at('q_ten', 'goat') && !go.to && Math.hypot(p.pos.x - go.pos.x, p.pos.z - go.pos.z) < c.near) { // turned: he bolts for the far side of the yard
      const spots = [[-14, 136], [14, 150], [-10, 156], [22, 132], [-26, 146], [4, 128]].map(([dx, dz]) => this.B(dx, dz)).sort((a, b) => Math.hypot(b[0] - p.pos.x, b[1] - p.pos.z) - Math.hypot(a[0] - p.pos.x, a[1] - p.pos.z));
      go.to = spots[(Math.random() * 2) | 0]; go.runT = 0; g.audio.play('bird', { vol: 0.4 }); q.notify('event', 'a2goat');
      if (!q.at('q_ten', 'goat')) return; // the third time he goes up the turf of the roof
      const b = this.npc('bjorn'); if (b.mode === 'idle') b.follow({ pos: go.pos }, { dist: 2.4 });
    }
    if (go.to) {
      const dx = go.to[0] - go.pos.x, dz = go.to[1] - go.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.6 || (go.runT += dt) > 7) { go.to = null; go.speed = 0; } else { go.yaw = dampAngle(go.yaw, Math.atan2(dx, dz), 10, dt); go.pos.x += (dx / d) * c.speed * dt; go.pos.z += (dz / d) * c.speed * dt; g.world.resolve(go.pos, 0.3); go.speed = c.speed; }
    }
    go.pos.y = g.world.groundAt(go.pos.x, go.pos.z); go.hop += dt * (4 + go.speed * 2.4);
    const s = Math.sin(go.hop) * (go.speed > 0.5 ? 0.8 : 0), lg = go.m.userData.legs; lg[0].rotation.x = s; lg[1].rotation.x = -s; lg[2].rotation.x = -s; lg[3].rotation.x = s;
    go.m.rotation.y = go.yaw;
  }

  // =====================================================================================
  // Chapter 2: A Farmer's Life
  // =====================================================================================
  elk() {
    const g = this.g;
    g.player.frozen = true; g.player.h.play('pickup', 0.9);
    g.ui.card('The Wounded Elk', 'Shot by some other hunter who never found it. It feeds the village for a week.', 5).then(() => { g.player.frozen = false; g.inventory.add('venison', 6); g.quests.notify('event', 'a2elk'); });
  }
  kaestur() {
    const g = this.g, f = this.npc('freydis'), p = g.player;
    new Knack(g, { label: 'Keep a perfectly calm face', verb: 'swallow', cfg: A2.knack.calm, anim: null, sound: 'pickup', bad: 'His eyes water', seed: 2,
      onDone: () => this.fade(() => { p.teleport(...this.B(-8, 108.4), 0.3); return g.ui.card('', 'He keeps a perfectly calm face, walks behind the longhouse and throws up into the pig trough. The pigs eat that too.', 6.5); }, 0.8, 0.8)
        .then(() => { p.teleport(f.pos.x - 1.4, f.pos.z + 0.4, 1.3); g.quests.notify('event', 'a2kaestur'); }) }).start();
  }
  wrestle() {
    const g = this.g, b = this.npc('bjorn'), p = g.player, [x, z] = this.B(8, 143);
    b.teleport(x + 1.5, z, -Math.PI / 2); b.setLoop('guard'); p.teleport(x, z, Math.PI / 2);
    for (const id of this.folk) { const n = this.npc(id); if (n.visible && !n.kid) n.face(x, z); }
    new Bout(g, { title: 'Wrestling Bjorn', need: A2.bout.wrestle, window: A2.bout.window, loop: 'guard', cam: [[x + 0.7, g.world.groundAt(x, z) + 1.7, z + 4.2], [x + 0.75, g.world.groundAt(x, z) + 1.0, z]],
      calls: [{ say: 'He heaves!', key: 'block', label: 'brace' }, { say: 'An opening!', key: 'attack', label: 'shove' }],
      ending: { say: 'This year Eirik could win. Everyone can see it.', key: 'interact', label: 'let Bjorn throw him' },
      onCall: (c) => { if (c.key === 'block') b.h.play('shove', 0.9); },
      onAnswer: (c, ok) => { if (c.key === 'attack' && ok) { p.h.play('shove', 0.6); b.h.play('stagger', 0.5); } else if (!ok) p.h.play('stagger', 0.5); else p.h.play('blockhit', 0.3); },
      onDone: () => { b.h.play('shove', 0.7); p.h.play('fall', 1.0, { onEnd: () => { p.loopOverride = 'dead'; } }); g.audio.play('thud');
        g.after(1.6, () => { p.loopOverride = null; b.setLoop(null); for (const id of this.folk) { const n = this.npc(id); if (n.visible && !n.kid && n.loop !== 'sit') n.h.play('cheer', 1.2); } this.say('a2_wrestle2', b, () => g.quests.notify('event', 'a2wrestle')); }); } }).start();
  }
  lookAtBirch() {
    const g = this.g, p = g.player, [bx, bz] = this.B(-20, 10), by = g.world.groundAt(bx, bz);
    this.birchSeen = true; p.frozen = true; g.sky.time = 19.6; g.audio.setMusic('sorrow');
    g.cine.play([{ dur: 9, from: [p.pos.x + 1.2, p.pos.y + 1.7, p.pos.z + 2.6], to: [p.pos.x + 0.4, p.pos.y + 2.2, p.pos.z + 0.6], look: [bx, by + 3, bz], fov: 40,
      sub: ['', 'That night Eirik looks up at the old birch behind the village. His scar begins to ache. A storm is coming. He does not know yet that it is not a storm of weather.', 8.5] }],
    { onEnd: () => g.ui.fade(true, 1.4).then(() => { p.frozen = false; g.quests.notify('event', 'a2birch'); return g.ui.fade(false, 1.2); }) });
  }

  // =====================================================================================
  // Chapter 3: Smoke on the Ridge
  // =====================================================================================
  /** Kettil on his black horse and six men on foot: built once, driven along a path. */
  column() {
    if (this.riders) return this.riders;
    const g = this.g, horse = horseModel();
    horse.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.color.set(0x34302e); } }); g.scene.add(horse);
    const k = g.addNPC('kettil', CAST2.kettil); k.h.hold('R', 'smallaxe'); k.h.hold('L', 'buckler'); k.mode = 'crew';
    const men = this.raid.pool.slice(0, 6);
    return (this.riders = { horse, k, men, pos: horse.position, yaw: 0, path: [], speed: 0, hop: 0, on: false, mounted: true });
  }
  riderPos() { const r = this.riders; return r && r.on ? { x: r.pos.x, z: r.pos.z } : { x: this.B(150, -60)[0], z: this.B(150, -60)[1] }; }
  /** Put the column on the road at a point, facing along it. */
  setColumn(dx, dz, yaw, on = true) {
    const g = this.g, r = this.column(), [x, z] = this.B(dx, dz), s = Math.sin(yaw), c = Math.cos(yaw);
    r.on = on; r.horse.visible = on; r.k.visible = on; r.path = []; r.speed = 0; r.yaw = yaw; r.mounted = true; r.k.mode = 'crew'; r.k.talk = null;
    r.pos.set(x, g.world.groundAt(x, z), z); r.horse.rotation.y = yaw;
    r.men.forEach((n, i) => { n.visible = on; if (n.dead) n.revive(); n.cb = null; n.name = "Håkon's man"; n.teleport(x - s * (3 + Math.floor(i / 2) * 2.2) + c * (i % 2 ? 1.1 : -1.1), z - c * (3 + Math.floor(i / 2) * 2.2) - s * (i % 2 ? 1.1 : -1.1), yaw); n.h.hold('R', ['axe', 'spear', 'sword'][i % 3]); n.h.hold('L', 'shield'); n.setLoop('guard'); });
  }
  rideTo(pts, speed, onArrive) { const r = this.column(); r.path = pts.map(([dx, dz]) => this.B(dx, dz)); r.speed = speed; r.onArrive = onArrive; r.men.forEach((n, i) => n.follow({ pos: r.pos }, { dist: 3 + i * 0.9 })); }
  updateColumn(dt) {
    const r = this.riders, g = this.g;
    if (!r || !r.on) return;
    if (r.path.length) {
      const [tx, tz] = r.path[0], dx = tx - r.pos.x, dz = tz - r.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.8) { r.path.shift(); if (!r.path.length) { r.men.forEach((n) => { n.stop(); n.yaw = r.yaw; }); const f = r.onArrive; r.onArrive = null; if (f) f(); } }
      else { r.yaw = dampAngle(r.yaw, Math.atan2(dx, dz), 5, dt); r.pos.x += Math.sin(r.yaw) * r.speed * dt; r.pos.z += Math.cos(r.yaw) * r.speed * dt; r.hop += dt * (3 + r.speed * 2); }
    }
    r.pos.y = g.world.groundAt(r.pos.x, r.pos.z); r.horse.rotation.y = r.yaw;
    const s = Math.sin(r.hop) * (r.path.length ? 0.6 : 0), lg = r.horse.userData.legs; lg[0].rotation.x = s; lg[1].rotation.x = -s; lg[2].rotation.x = -s; lg[3].rotation.x = s;
    if (r.mounted) { const k = r.k; k.pos.set(r.pos.x, r.pos.y + 1.02, r.pos.z); k.yaw = r.yaw; k.root.rotation.y = r.yaw; k.h.setLoop('sit'); k.h.setLocomotion(0, false); k.h.update(dt); }
  }
  tribute() {
    const g = this.g, r = this.column(), b = this.npc('bjorn'), p = g.player;
    if (this.tributeOn || !r.on || r.path.length) return b.say('Stand by me. Say nothing.', 3);
    this.tributeOn = true;
    this.say('a2_tribute', r.k, () => {
      r.k.mode = 'crew'; this.rideTo([[40, 147], [100, 132], [116, 100], [124, 20]], 5.2, () => this.setColumn(150, -60, 0, false));
      this.sub('They ride away. Everybody in Bjornstead knows they will be back.', 6);
      g.after(6.5, () => g.quests.notify('event', 'a2tribute'));
    });
    r.k.mode = 'crew';
  }
  cues = {
    slap() { const g = this.g, b = this.npc('bjorn'), p = g.player, r = this.riders; b.h.play('stagger', 0.9); g.audio.play('thud'); p.teleport((b.pos.x + r.pos.x) / 2, (b.pos.z + r.pos.z) / 2, Math.atan2(r.pos.x - b.pos.x, r.pos.z - b.pos.z)); },
  };

  // =====================================================================================
  // Quest step handlers (Chapters 1 to 3; the rest are in the parts)
  // =====================================================================================
  own = {
    'q_ten.wake'() {
      const g = this.g, p = g.player;
      this.setPhase('morning', true); this.goatHome(); this.goat.loose = false;
      p.frozen = true; p.teleport(...this.B(-21.6, 132.6), 2.6);
      g.ui.card('Act Two', "The Farmer's Axe  ·  ten winters later", 4.2).then(() => { p.frozen = false; g.quests.notify('event', 'woke5'); });
    },
    'q_ten.split'(r) { this.setPhase('morning', r); this.goatHome(); if (!r) this.sub('A summer morning so beautiful it almost hurts. Sheep graze by the stream. Smoke rises straight up from twenty roofs. Gulls argue over the fishing boats.', 8); },
    'q_ten.goat'(r) { this.setPhase('morning', r); if (r) this.goatHome(); this.hint('goat'); if (!r) this.g.after(1.2, () => this.sub('Bjorn chases the goat around the yard with one bare foot while the whole village laughs.', 6)); },
    'q_ten.freydis'(r) {
      this.setPhase('morning', r); this.hint(null); this.goatRoof();
      const b = this.npc('bjorn'), f = this.post('freydis', [30, 150, -1.6]);
      b.stop(); b.face(this.goat.pos.x, this.goat.pos.z);
      if (!r) { this.sub('By the time anyone notices, only the laces are left. Skeggi escapes onto the longhouse roof and finishes the laces there.', 7); f.goTo(...this.B(8, 147), { speed: 1.5 }); } else f.teleport(...this.B(8, 147), -1.6);
    },
    'q_farm.bjorn'(r) { this.setPhase('morning', r); this.goatRoof(); this.post('bjorn', DAY.bjorn); },
    'q_farm.forest'(r) { this.setPhase('hunt', r); this.goatHome(); },
    'q_farm.eye'(r) { this.setPhase('hunt', r); this.hint('eyeUp'); if (!r) this.sub('He sends {w} up through the trees and closes his eyes. Her thoughts come in pieces.', 6); },
    'q_farm.signs'(r) { this.setPhase('hunt', r); this.hint('eyeUp'); },
    'q_farm.elk'(r) { this.setPhase('hunt', r); this.hint(null); this.elkBody.model.visible = true; },
    'q_farm.thing'(r) { this.setPhase('thing', r); if (!r) this.sub('There is a dispute at the local Thing, the open-air assembly where free men settle arguments. Two neighbors, Hauk and Grjotgard, both claim a red cow.', 8); },
    'q_farm.sides'(r) { this.setPhase('thing', r); },
    'q_farm.judge'(r) { this.setPhase('thing', r); },
    'q_farm.feast'(r) { this.setPhase('thing', r); },
    'q_farm.kaestur'(r) { this.setPhase('feast', r); if (!r) this.sub('The harvest feast is the best night of the year. There is roast mutton, barley bread, smoked salmon, ale and mead. There is also kaestur.', 8); },
    'q_farm.wrestle'(r) { this.setPhase('feast', r); },
    'q_farm.birch'(r) { this.setPhase('feast', r); this.birchSeen = false; },
    'q_smoke.dawn'() {
      const g = this.g, p = g.player;
      this.setPhase('dawn', true); this.setColumn(150, -60, 3.3, true);
      p.frozen = true; p.teleport(...this.B(-3, 121.6), 0.3);
      g.ui.card('Smoke on the Ridge', 'At dawn', 3.6).then(() => { p.frozen = false; this.sub('Wolves.', 4, '{w}'); g.quests.notify('event', 'a2dawn'); });
    },
    'q_smoke.eye'(r) { this.setPhase('dawn', r); this.setColumn(150, -60, 3.3, true); this.hint('eyeUp'); },
    'q_smoke.spot'(r) { this.setPhase('dawn', r); this.setColumn(150, -60, 3.3, true); this.hint('eyeUp'); },
    'q_smoke.yard'(r) {
      this.setPhase('dawn', r); this.hint(null); this.tributeOn = false;
      this.post('bjorn', [2, 141, [14, 143]]); this.post('girl1', DAY.girl1); this.post('girl2', DAY.girl2); this.post('signe', [-3, 122, 0.6]); this.post('freydis', [-0.6, 138.6, [14, 143]]);
      this.setColumn(72, 145.4, -1.5, true); this.rideTo([[13, 143.4]], 3.6);
      if (!r) this.sub('They ride into Bjornstead.', 4);
    },
  };

  // =====================================================================================
  update(dt) {
    if (!this.built) return;
    const g = this.g, q = g.quests, p = g.player, ph = PHASES[this.phase];
    this.t += dt;
    if (ph && g.mode === 'play' && !g.cine.active) g.sky.time = Math.min(ph.time + 0.25, g.sky.time + dt / 500);
    this.st.time = g.sky.time; p.warmth = 100; p.hunger = 100;
    // the step asks him to go somewhere
    const tr = q.tracked()[0];
    if (tr && tr.step.type === 'reach' && tr.step.marker && tr.step.marker.pos && g.mode === 'play') {
      const [x, z] = tr.step.marker.pos, ok = !this.reachOk || !this.reachOk[tr.step.key] || this.reachOk[tr.step.key]();
      if (ok && Math.hypot(p.pos.x - x, p.pos.z - z) < (tr.step.r || 8)) q.notify('reach', tr.step.key);
    }
    if (q.at('q_farm', 'birch') && !this.birchSeen && g.mode === 'play' && Math.hypot(p.pos.x - this.B(-9, 66)[0], p.pos.z - this.B(-9, 66)[1]) < 9) this.lookAtBirch();
    this.updateGoat(dt); this.updateColumn(dt);
    if (q.at('q_smoke', 'yard') && !this.tributeOn && g.mode === 'play' && this.riders && this.riders.on && !this.riders.path.length && this.npc('bjorn').dist(p) < 9) this.tribute();
    // children run about; pigs root
    if (!PHASES[this.phase]?.at) for (let i = 0; i < KIDS.length; i++) { const n = this.npc('kid' + i); if (!n.visible || n.mode !== 'idle' || n.held || Math.random() > dt * 0.35) continue; const d = DAY['kid' + i]; n.goTo(...this.B(d[0] + (Math.random() - 0.5) * 16, d[1] + (Math.random() - 0.5) * 12), { run: Math.random() < 0.6 }); }
    for (const m of this.pigs) m.rotation.x = Math.sin(this.t * 1.3 + m.position.x) * 0.05;
    for (const part of this.parts) part.update(dt);
  }
  /** Where the HUD points for a step whose marker moves. */
  dyn(name) {
    if (name === 'goat') return this.goat.roof ? null : { x: this.goat.pos.x, z: this.goat.pos.z, y: this.goat.pos.y + 1.5 };
    for (const part of this.parts) { const d = part.dyn && part.dyn(name); if (d !== undefined) return d; }
    return null;
  }
  /** What the village is called: Bjornstead, until the sailors name it for its ravens. */
  get townName() { return this.st.quests.q_fifty ? 'Ravenhold' : 'Bjornstead'; }
  playEnding4() {
    const g = this.g, st = this.st;
    if (this.ending) return;
    this.ending = true; g.player.frozen = true; g.ravens.exitEye();
    g.ui.fade(true, 2.4).then(() => g.ui.card('Blood Across the Sea', 'End of Act Four', 4.5)).then(() => { st.stage = 'complete'; g.autosave(); this.act.showChapterEnd(); });
  }
  playEnding3() {
    const g = this.g, st = this.st;
    if (this.ending) return;
    this.ending = true; g.player.frozen = true; g.ravens.exitEye();
    g.ui.fade(true, 1.2).then(() => g.ui.card('The Wolves of Iron', 'End of Act Three', 4.5)).then(() => { st.stage = 'complete'; g.autosave(); this.act.showChapterEnd(); });
  }
  playEnding() {
    const g = this.g, st = this.st;
    if (this.ending) return;
    this.ending = true; g.player.frozen = true; g.ravens.exitEye();
    g.ui.fade(true, 2.6).then(() => g.ui.card('', 'Far to the west, on an island he has only heard of, smoke is rising.', 6))
      .then(() => g.ui.card("The Farmer's Axe", 'End of Act Two', 4.5)).then(() => { st.stage = 'complete'; g.autosave(); this.act.showChapterEnd(); });
  }
}
