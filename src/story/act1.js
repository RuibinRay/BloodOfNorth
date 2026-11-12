// Act I, Chapter 1 — story director. Places the cast, reacts to quest steps, and stages the raid.
// Every onStep handler is idempotent so the same code runs for normal play and for loading a save.
import * as THREE from 'three';
import { POI } from '../world/layout.js';
import { heightAt, riverX } from '../world/terrain.js';
import { shared, M, at, cyl, tint } from '../world/geo.js';
import { makeShip, toWorld } from '../world/props.js';
import { CAST, RAIDER_LOOKS, HINTS } from '../data/act1.js';
import { Woodcutting, FireMaking, Fishing, Sparring } from '../systems/activities.js';
import { clamp, damp, lerp } from '../core/util.js';
import { Chapter2 } from './act1_ch2.js';
import { Chapter3 } from './act1_ch3.js';
import { Act2Ch1 } from './act2_ch1.js';
import { OpenProto } from './open_proto.js';

const PATH_TO_MEADOW = [[-38, 71.6], [-27, 70.5], [-17, 64.5], [-3, 57], [0, 46], [-7, 14], [-20, -12], [-22, -18], [-24, -22], [-43, -27], [-59, -34]];
const TRACKS = [[-80, -48], [-98, -54], [-118, -62], [-136, -78], [-146, -100], [-150, -116]];
const PATH_TO_CAMP = [[-142, -118], [-131, -106], [-121.5, -93.5]];
const FLEE_PATH = [[-23, 66], [-21, 56], [-21, 50], [-10, 43], [-7, 30], [-8, 12], [-19, -9], [-21.5, -13.5]];
const CAMP_SEAT = [POI.camp.x - 1.75, POI.camp.z + 1.0];
const DUEL = { ragnar: [-15, 70], hakon: [-10.5, 70.4], g1: [-6, 73.2], g2: [-6.5, 67.4] };
const GATE_PATROL = [[[-13, -9], [-19.5, -13.5]], [[-9, 2], [-14, -7]]];
const QUESTS_MAIN = ['q_morning', 'q_wood', 'q_hunt', 'q_fire', 'q_sword', 'q_supper', 'q_ashes', 'q_alone', 'q_white', 'q_ice', 'q_hearth', 'q_wings', 'q_ten', 'q_smoke', 'q_axe', 'q_open', 'q_sea'];
const WEATHER = {
  day: { snow: 0, fog: 0, overcast: 0.08, wind: 1 },
  dusk: { snow: 0.12, fog: 0.02, overcast: 0.3, wind: 1.1 },
  raid: { snow: 0.7, fog: 0.07, overcast: 0.6, wind: 1.3 },
  storm: { snow: 1, fog: 0.42, overcast: 1, wind: 2.6 },
};

export class Act1 {
  constructor(game) {
    this.g = game; this.stealthActive = false; this.pickups = []; this.raiders = []; this.spar = null;
    this.deerBody = null; this.nightBuilt = false; this.wTarget = { ...WEATHER.day }; this.snowTarget = 0; this.glowTarget = 0;
    this.failing = false; this.t = 0; this.arrowT = 0; this.ships = []; this.shipK = 1; this.cold = false; this.ending = false;
    this.houseFires = {}; this.schedT = 0;
    this.ch2 = new Chapter2(game, this);
    this.ch3 = new Chapter3(game, this);
    this.a2 = new Act2Ch1(game, this);
    this.open = new OpenProto(game, this);
  }
  hideFactor(p) { return this.st.stage === 'ch2' ? this.ch2.hideFactor(p) : 1; }
  npc(id) { return this.g.npcs.get(id); }
  /** Ragnar as he is out in the forest: bow in hand, no chopping animation. */
  fieldRagnar(n) { n.setLoop(null); n.crouch = false; n.h.hold('R', null); n.h.hold('L', 'bow_big'); }
  get st() { return this.g.state; }
  hint(key) { this.g.ui.hint(key ? HINTS[key] : null); }

  // =====================================================================================
  // Setup
  // =====================================================================================
  init() {
    const g = this.g, w = g.world;
    for (const id of ['ragnar', 'ylva', 'hrolf', 'brokk', 'odd', 'thyra', 'gunnar', 'asa', 'farmer1', 'farmer2']) {
      const n = g.addNPC(id, CAST[id]);
      n.talk = () => this.talkTo(id);
    }
    this.placeDayCast();

    // ambient fires and smoke
    this.cookFire = g.fx.addFire(POI.cookfire.x, heightAt(POI.cookfire.x, POI.cookfire.z) + 0.15, POI.cookfire.z, 0.55);
    this.forgeFire = g.fx.addFire(w.smithy.forge.x, w.smithy.forge.y, w.smithy.forge.z, 0.4, { smoke: true });
    this.greenFire = g.fx.addFire(3, heightAt(3, 50) + 0.15, 50, 0.5, { on: false });
    this.campFire = g.fx.addFire(POI.camp.x, heightAt(POI.camp.x, POI.camp.z) + 0.15, POI.camp.z, 0.6, { on: false });
    this.chimneys = w.smoke.map((s) => g.fx.addSmoke(s.x, s.y, s.z, /barn|boathouse|gulenhall/.test(s.id) ? 0 : 1));
    g.wildlife.addRavens(4, 46, 7, 36, 24);
    for (const [x, z] of [[-34, 17], [-32.5, 19.5], [-35.5, 19], [-31.5, 17]]) g.wildlife.spawn('sheep', x, z, { home: { x: -33.5, z: 18, r: 2.6 } });

    // interactables
    w.addInteractable({ id: 'chop', x: POI.chop.x, z: POI.chop.z, r: 2.3, label: 'Split logs', enabled: () => g.quests.at('q_wood', 'chop'), use: () => this.startChopping() });
    w.addInteractable({ id: 'fish', x: POI.fishing.x, z: POI.fishing.z, r: 2.8, label: 'Fish', enabled: () => this.st.stage === 'day', use: () => this.startFishing() });
    w.addInteractable({ id: 'campfire', x: POI.camp.x, z: POI.camp.z, r: 2.4, label: 'Light the fire', enabled: () => g.quests.at('q_fire', 'light') || g.quests.at('q_alone', 'light'), use: () => this.startFire() });
    w.addInteractable({ id: 'bed', x: POI.homeDoor.x, z: POI.homeDoor.z, r: 2.2, label: 'Go to bed', enabled: () => g.quests.at('q_supper', 'sleep'), use: () => this.goToBed() });
    w.addInteractable({ id: 'stone', x: POI.runestone.x, z: POI.runestone.z, r: 3, label: 'Read the carving', enabled: () => this.st.stage === 'day' && !this.st.flags.readStone, use: () => this.readStone() });
    w.addInteractable({ id: 'bark', x: POI.oldBirch.x, z: POI.oldBirch.z, r: 2.6, priority: 2, label: 'Peel birch bark', enabled: () => (g.quests.at('q_fire', 'gather') || g.quests.at('q_alone', 'gather')) && g.inventory.count('bark') < 1,
      use: () => { g.player.h.play('give', 0.5); g.inventory.add('bark', 1); this.checkTinder(); } });

    this.tracks = w.makeTracks(TRACKS);
    this.tracks.visible = false;

    // events
    g.events.on('kill', (kind, a, vital) => this.onKill(kind, a, vital));
    g.events.on('arrowHit', (pos) => { if (Math.hypot(pos.x - POI.target.x, pos.z - POI.target.z) < 1.0) { g.quests.notify('event', 'targetHit'); g.audio.play('clack', { vol: 0.5 }); } });
    g.events.on('item', () => this.checkTinder());
    g.events.on('equip', (name) => { if (name === 'bow' && g.quests.at('q_hunt', 'target')) g.ui.toast('Hold aim, then loose'); });
  }

  placeDayCast() {
    const w = this.g.world, sm = w.smithy;
    this.npc('ylva').teleport(POI.ylvaSpot.x, POI.ylvaSpot.z, Math.atan2(POI.cookfire.x - POI.ylvaSpot.x, POI.cookfire.z - POI.ylvaSpot.z)).setLoop('cook');
    const r = this.npc('ragnar'); r.teleport(POI.chop.x - 0.9, POI.chop.z + 1.25, 2.5).setLoop('chopping'); r.h.hold('R', 'woodaxe');
    this.npc('hrolf').teleport(5.75, 14.35, 0.5).setLoop('sit');
    const b = this.npc('brokk'); b.teleport(sm.anvil.x + Math.sin(-0.5) * -0.95, sm.anvil.z + Math.cos(-0.5) * -0.95, -0.5).setLoop('hammer'); b.h.hold('R', 'hammer');
    const o = this.npc('odd'); o.teleport(POI.dock.x, 166, 0).setLoop('fish'); o.h.hold('R', 'rod');
    this.npc('thyra').teleport(-2.2, 45.2, 2.2);
    const gd = w.houses.elder.door; this.npc('gunnar').teleport(gd.x - 0.6, gd.z, -Math.PI / 2);
    const [ax, az] = toWorld(-36.6, 39, Math.PI / 2 + 0.2, 0, -0.95);
    this.npc('asa').teleport(ax, az, Math.PI / 2 + 0.2).setLoop('weave');
    const f1 = this.npc('farmer1'); f1.teleport(31, -6, 1).setLoop('hoe'); f1.h.hold('R', 'hoe');
    const f2 = this.npc('farmer2'); f2.teleport(40, -1, -2).setLoop('hoe'); f2.h.hold('R', 'hoe');
  }

  newGame() {
    const g = this.g;
    this.st.stage = 'day'; g.sky.time = 8.7;
    g.player.teleport(POI.spawn.x, POI.spawn.z, 1.2);
    g.ui.card('Blood of the North', 'Hrafnvik, western Norway  ·  late autumn, 859', 4.2).then(() => g.quests.start('q_morning'));
  }
  /** Rebuild the scripted world from a loaded save. */
  restore() {
    const g = this.g, st = this.st;
    if (['day', 'ch2', 'ch3', 'act2', 'open'].includes(st.stage)) g.sky.time = st.time ?? 8;
    if (st.vitals) Object.assign(g.player, st.vitals);
    if (st.player) g.player.teleport(st.player.x, st.player.z, st.player.yaw);
    if (g.inventory.has('father_axe')) g.player.showBackAxe(true);
    for (const id of Object.keys(st.quests)) if (st.quests[id].status === 'active') g.quests.enter(id, true);
    // between chapters, or at the end of what is built: show the chapter summary
    const active = Object.values(st.quests).some((q) => q.status === 'active' && QUESTS_MAIN.includes(Object.keys(st.quests).find((k) => st.quests[k] === q)));
    if (!active && g.quests.isDone('q_alone')) { st.stage = g.quests.isDone('q_axe') ? 'complete' : g.quests.isDone('q_wings') ? 'act1done' : g.quests.isDone('q_ice') ? 'ch2done' : 'ch1done'; this.showChapterEnd(); }
  }

  // =====================================================================================
  // Conversations
  // =====================================================================================
  talkTo(id) {
    const g = this.g, q = g.quests, fl = this.st.flags;
    const d = (tree, onEnd) => g.dialogue.start(tree, { npc: this.npc(id), onEnd });
    const done = () => q.notify('talk', id);
    switch (id) {
      case 'ylva':
        if (q.at('q_morning', 'ylva')) return d('ylva_morning', done);
        if (q.at('q_supper', 'ylva')) return d('ylva_supper', () => {
          for (const it of ['hare', 'venison', 'fish']) if (g.inventory.count(it)) g.inventory.remove(it, 99, true);
          g.ui.toast('You hand over the day\'s catch'); done();
        });
        if (q.at('q_supper', 'sleep')) return d('ylva_bed');
        return d('ylva_idle');
      case 'ragnar':
        if (q.at('q_morning', 'ragnar')) return d('ragnar_chop', done);
        if (q.at('q_wood', 'chop')) return d('ragnar_chop_wait');
        if (q.at('q_wood', 'talk')) return d('ragnar_wood_done', done);
        if (q.at('q_hunt', 'talk')) return d('ragnar_tracks', done);
        if (q.at('q_hunt', 'talk2')) return d('ragnar_deer', done);
        if (q.at('q_fire', 'gather') || q.at('q_fire', 'light')) return d('ragnar_camp_wait');
        if (q.at('q_fire', 'talk')) return d('ragnar_fire', done);
        if (q.at('q_sword', 'talk')) return d('ragnar_yard', done);
        if (q.at('q_sword', 'talk2')) return d('ragnar_quote', done);
        if (q.isActive('q_supper')) return d('ragnar_evening');
        return d('ragnar_hunt_wait');
      case 'hrolf':
        if (!this.st.quests.s_skald) q.start('s_skald');
        if (q.at('s_skald', 'talk')) return d('hrolf_rumor', done);
        return d('hrolf_idle');
      case 'thyra': return d(fl.metThyra ? 'thyra_idle' : 'thyra', () => { fl.metThyra = true; });
      case 'farmer1': case 'farmer2': return d('farmer');
      default: return d(id);
    }
  }
  readStone() {
    const g = this.g;
    g.dialogue.start('runestone', { onEnd: () => { if (!this.st.quests.s_stone) g.quests.start('s_stone'); g.quests.notify('event', 'runestone'); } });
  }

  // =====================================================================================
  // Activities
  // =====================================================================================
  startChopping() {
    const g = this.g, q = this.st.quests.q_wood;
    new Woodcutting(g, {
      x: POI.chop.x, z: POI.chop.z, count: 5 - (q?.count || 0),
      onSplit: () => {
        g.inventory.add('firewood', 2);
        const lines = ['Good.', 'Again. Let the hatchet fall.', "That's the way.", 'One more like that.'];
        if (Math.random() < 0.7) this.npc('ragnar').say(lines[(Math.random() * lines.length) | 0], 1.8);
        g.quests.notify('activity', 'chop');
      },
    }).start();
  }
  startFishing() {
    const g = this.g, z = POI.fishing.z + 0.4;
    new Fishing(g, { x: POI.fishing.x + 1.6, z, wx: riverX(z) - 1.2, wz: z + 1.5, onCatch: () => g.quests.notify('event', 'fishCaught') }).start();
  }
  startFire() {
    const g = this.g, storm = this.st.stage !== 'day';
    new FireMaking(g, {
      x: POI.camp.x, z: POI.camp.z, storm,
      onDone: () => {
        g.inventory.remove('stick', 3, true); g.inventory.remove('bark', 1, true);
        this.campFire.on = true;
        g.quests.notify('activity', 'fire');
      },
    }).start();
  }
  checkTinder() {
    const g = this.g;
    if ((g.quests.at('q_fire', 'gather') || g.quests.at('q_alone', 'gather')) && g.inventory.has('stick', 3) && g.inventory.has('bark', 1)) g.quests.notify('event', 'tinderReady');
  }
  spawnPickups() {
    const g = this.g;
    this.clearPickups();
    const spots = [[5.5, 4], [-6, 6.5], [8, -5], [-9, -3.5], [2.5, 10], [-3, -9.5], [11, 3]];
    spots.forEach(([dx, dz], i) => {
      const x = POI.camp.x + dx, z = POI.camp.z + dz, id = 'stick' + i;
      const m = new THREE.Mesh(tint(at(cyl(0.022, 0.03, 0.62, 5), 0, 0, 0, Math.PI / 2, i * 1.3, 0), 0x6a5038, 0.2, i), M.vcPlain);
      m.position.set(x, heightAt(x, z) + 0.06, z); m.castShadow = true; g.scene.add(m);
      this.pickups.push({ id, m });
      g.world.addInteractable({ id, x, z, r: 1.7, label: 'Pick up dry stick', priority: 1, use: () => {
        g.player.h.play('pickup', 0.55); g.scene.remove(m); g.world.removeInteractable(id);
        this.pickups = this.pickups.filter((q) => q.id !== id);
        g.inventory.add('stick', 1);
      } });
    });
  }
  clearPickups() { for (const p of this.pickups) { this.g.scene.remove(p.m); this.g.world.removeInteractable(p.id); } this.pickups = []; }

  onKill(kind, a, vital) {
    const g = this.g;
    if (kind === 'wolf') return this.ch2.onWolfKilled(a);
    if (kind === 'deer') { this.st.flags.cleanKill = !!vital || !a.wounded; this.deerBody = a; }
    const id = 'body' + Math.random().toString(36).slice(2, 7);
    g.world.addInteractable({ id, pos: () => a.pos, r: kind === 'deer' ? 2.6 : 1.9, label: kind === 'deer' ? 'Harvest the deer' : 'Pick up the hare', priority: 2, use: () => {
      g.world.removeInteractable(id);
      g.player.h.play('pickup', 0.6);
      a.harvested = true;
      g.after(0.45, () => g.wildlife.remove(a));
      if (kind === 'deer') { g.inventory.add('venison', 3); g.inventory.add('hide', 1, true); g.quests.notify('event', 'harvestDeer'); }
      else g.inventory.add('hare', 1);
    } });
    g.quests.notify('kill', kind);
  }
  ensureHares() {
    const g = this.g, n = g.wildlife.count('hare');
    for (let i = n; i < 5; i++) { const a = Math.random() * 6.28, r = 6 + Math.random() * 12; g.wildlife.spawn('hare', POI.meadow.x - 4 + Math.cos(a) * r, POI.meadow.z - 6 + Math.sin(a) * r, { home: { x: POI.meadow.x - 4, z: POI.meadow.z - 6, r: 15 } }); }
  }
  ensureDeer() {
    const g = this.g;
    if (g.wildlife.count('deer') >= 2) return;
    g.wildlife.clear('deer');
    [[0, 0, true], [5, 3, false], [-4, 5, false]].forEach(([dx, dz, stag]) => g.wildlife.spawn('deer', POI.deer.x + dx, POI.deer.z + dz, { stag, home: { x: POI.deer.x, z: POI.deer.z, r: 14 } }));
  }

  // =====================================================================================
  // Quest step handlers
  // =====================================================================================
  onStep(qid, sid, r) {
    const key = qid + '.' + sid;
    if (this.steps[key]) this.steps[key].call(this, r);
    else if (this.ch2.steps[key]) this.ch2.steps[key].call(this.ch2, r);
    else if (this.ch3.steps[key]) this.ch3.steps[key].call(this.ch3, r);
    else if (this.a2.steps[key]) this.a2.steps[key].call(this.a2, r);
    else if (this.open.steps[key]) this.open.steps[key].call(this.open, r);
  }
  onQuestDone(id) {
    if (id === 'q_alone') this.playEnding();
    if (id === 'q_ice') this.ch2.playEnding();
    if (id === 'q_wings') this.ch3.playEnding();
    if (id === 'q_axe') this.a2.playEnding();
    if (this.open.built) { this.open.sea.questDone(id); this.open.fleet.questDone(id); this.open.war.questDone(id); this.open.seven.questDone(id); }
  }
  steps = {
    'q_morning.ylva'() { this.hint('move'); this.g.after(9, () => { if (this.g.quests.at('q_morning', 'ylva')) this.hint('talk'); }); },
    'q_morning.ragnar'() { this.hint('talk'); },
    'q_wood.chop'(r) {
      const n = this.npc('ragnar'); n.setLoop(null); n.h.hold('R', null);
      if (r) n.teleport(POI.chop.x - 2.6, POI.chop.z - 0.4, 1.3); else n.goTo(POI.chop.x - 2.6, POI.chop.z - 0.4, { onArrive: (o) => o.face(POI.chop.x, POI.chop.z) });
      this.hint('chop');
    },
    'q_wood.talk'(r) { this.hint(null); const n = this.npc('ragnar'); if (r) n.teleport(POI.chop.x - 2.6, POI.chop.z - 0.4, 1.3); n.setLoop(null); n.faceEntity(this.g.player); },
    'q_hunt.follow'(r) {
      const n = this.npc('ragnar'), g = this.g;
      g.sky.time = Math.max(g.sky.time, 9.4);
      n.setLoop(null); n.h.hold('R', null); n.h.hold('L', 'bow_big');
      if (r) n.teleport(g.player.pos.x + 2, g.player.pos.z - 1.5);
      const from = n.pos, start = PATH_TO_MEADOW.findIndex((p) => Math.hypot(p[0] - from.x, p[1] - from.z) < 12);
      this.atMeadow = false;
      n.lead(PATH_TO_MEADOW.slice(Math.max(0, start)), { speed: 2.9, wait: 13, resume: 6, bark: ['Keep up, Eirik.', 'This way, little raven.', 'Legs, boy. Use them.'], onArrive: (o) => { this.atMeadow = true; o.face(POI.target.x, POI.target.z); } });
      this.hint('follow');
    },
    'q_hunt.target'(r) {
      const n = this.npc('ragnar'), g = this.g;
      if (r) { n.teleport(-59, -34, -1.2); this.fieldRagnar(n); if (!g.inventory.has('bow')) { g.inventory.add('bow', 1, true); g.inventory.add('arrow', 12, true); } }
      n.setLoop(null); n.stop();
      this.ensureHares(); this.hint('bow');
    },
    'q_hunt.hares'(r) {
      const n = this.npc('ragnar');
      if (r) { n.teleport(-59, -34, -1.2); this.fieldRagnar(n); }
      else n.say('Good. Now hares. Go low and slow.', 3);
      this.ensureHares(); this.hint('hares');
    },
    'q_hunt.talk'(r) { const n = this.npc('ragnar'); if (r) { n.teleport(-59, -34, -1.2); this.fieldRagnar(n); } n.follow(this.g.player, { dist: 2.4 }); this.hint(null); },
    'q_hunt.track'(r) {
      const n = this.npc('ragnar'), g = this.g;
      if (r) { n.teleport(g.player.pos.x + 2.5, g.player.pos.z + 2); this.fieldRagnar(n); }
      n.follow(g.player, { dist: 7, matchCrouch: true });
      this.tracks.visible = true; this.ensureDeer(); this.hint('sense');
    },
    'q_hunt.deer'(r) {
      const n = this.npc('ragnar'), g = this.g;
      if (r) { n.teleport(g.player.pos.x + 3, g.player.pos.z + 3); this.fieldRagnar(n); n.follow(g.player, { dist: 7, matchCrouch: true }); }
      else n.say('There. Do you see them? Go low. Take your time.', 3.5);
      this.tracks.visible = true; this.ensureDeer(); this.hint('deer');
    },
    'q_hunt.harvest'(r) {
      const n = this.npc('ragnar'), g = this.g;
      if (r) { // the carcass is not saved: put a fresh one beside the player
        n.teleport(g.player.pos.x + 3, g.player.pos.z + 3); this.fieldRagnar(n);
        const a = g.wildlife.spawn('deer', g.player.pos.x + 2.5, g.player.pos.z - 2.5, {}); a.dead = true; a.state = 'dead';
        this.st.quests.q_hunt.step--; this.onKill('deer', a, this.st.flags.cleanKill);
      }
      n.follow(g.player, { dist: 3.2 }); n.crouch = false;
      this.hint(null);
    },
    'q_hunt.talk2'(r) { const n = this.npc('ragnar'), g = this.g; if (r) { n.teleport(g.player.pos.x + 2, g.player.pos.z + 2); this.fieldRagnar(n); } n.follow(g.player, { dist: 2.4 }); n.crouch = false; this.tracks.visible = false; },
    'q_fire.camp'(r) {
      const n = this.npc('ragnar'), g = this.g;
      g.sky.time = Math.max(g.sky.time, 12.4);
      if (r) { n.teleport(g.player.pos.x + 2, g.player.pos.z + 2); this.fieldRagnar(n); }
      n.crouch = false; this.atCamp = false;
      const near = Math.hypot(n.pos.x - POI.camp.x, n.pos.z - POI.camp.z) < 30;
      n.lead(near ? [PATH_TO_CAMP[2]] : PATH_TO_CAMP, { speed: 2.9, wait: 13, resume: 6, bark: ['The camp is close. Come.', 'Not far now.'], onArrive: (o) => { this.atCamp = true; o.faceEntity(g.player); } });
      this.hint('follow');
    },
    'q_fire.gather'(r) {
      const n = this.npc('ragnar'), g = this.g;
      if (r) { this.fieldRagnar(n); n.teleport(...CAMP_SEAT, 1.9); if (!g.inventory.has('flint')) g.inventory.add('flint', 1, true); }
      else n.goTo(...CAMP_SEAT, { onArrive: (o) => o.faceEntity(g.player) });
      n.h.hold('L', null);
      this.spawnPickups(); this.hint('gather');
      g.after(0.2, () => this.checkTinder());
    },
    'q_fire.light'(r) { if (r) { const n = this.npc('ragnar'); this.fieldRagnar(n); n.h.hold('L', null); n.teleport(...CAMP_SEAT, 1.9); n.faceEntity(this.g.player); } this.g.ui.hint('Press {interact} at the ring of stones to strike a fire.'); },
    'q_fire.talk'(r) {
      const n = this.npc('ragnar');
      this.campFire.on = true; this.clearPickups(); this.hint(null);
      const seat = () => { n.teleport(...CAMP_SEAT, Math.atan2(POI.camp.x - CAMP_SEAT[0], POI.camp.z - CAMP_SEAT[1])); n.h.hold('L', null); n.h.hold('R', null); n.setLoop('warm'); };
      if (r) seat(); else n.goTo(...CAMP_SEAT, { onArrive: seat });
    },
    'q_sword.talk'(r) {
      const g = this.g, n = this.npc('ragnar');
      const place = () => {
        g.sky.time = Math.max(g.sky.time, 15.1);
        this.campFire.on = false; this.clearPickups();
        n.teleport(POI.yard.x, POI.yard.z - 1.6, 0); n.setLoop(null); n.h.hold('L', null); n.h.hold('R', 'woodsword_big'); n.faceEntity(g.player);
        g.player.teleport(POI.yard.x, POI.yard.z + 1.8, Math.PI); g.player.crouch = false; g.player.equip('none');
        g.wildlife.clear('hare'); g.wildlife.clear('deer');
      };
      this.hint(null);
      if (r) return place();
      g.player.frozen = true;
      g.ui.fade(true, 1.2).then(() => { place(); return g.ui.card('Later that day', 'The yard behind the longhouse', 2.6); }).then(() => g.ui.fade(false, 1.2)).then(() => { g.player.frozen = false; });
    },
    'q_sword.strike'(r) { this.ensureSpar('strike', r); this.hint('sword'); },
    'q_sword.block'(r) { this.ensureSpar('block', r); this.hint('block'); if (!r) this.npc('ragnar').say('Good. Now I strike. Raise your guard and hold.', 3.5); },
    'q_sword.parry'(r) { this.ensureSpar('parry', r); this.hint('parry'); if (!r) this.npc('ragnar').say('Blocking drinks your strength. Wait, and turn my blow aside at the last instant.', 4.5); },
    'q_sword.dodge'(r) { this.ensureSpar('dodge', r); this.hint('dodge'); if (!r) this.npc('ragnar').say("Ha! There. Now do not be there at all. Move!", 3.5); },
    'q_sword.talk2'(r) {
      const n = this.npc('ragnar');
      if (this.spar) { this.spar.stop(); this.spar = null; }
      if (r) { n.teleport(POI.yard.x, POI.yard.z - 1.6, 0); n.h.hold('R', 'woodsword_big'); }
      n.setLoop(null); n.faceEntity(this.g.player); this.hint(null);
    },
    'q_supper.ylva'(r) {
      const g = this.g, n = this.npc('ragnar');
      g.sky.time = Math.max(g.sky.time, 16.3); this.wTarget = { ...WEATHER.dusk };
      n.h.hold('R', null); n.setLoop(null);
      const seat = () => { n.teleport(-17.6, 69.0, -2.0); n.setLoop('warm'); };
      if (r) seat(); else n.goPath([[-14, 62], [-17.6, 69.0]], { onArrive: seat });
      g.player.equip('none');
      this.greenFire.on = true;
      this.hint('free');
    },
    'q_supper.sleep'(r) { if (r) { this.npc('ragnar').teleport(-17.6, 69.0, -2.0).setLoop('warm'); this.wTarget = { ...WEATHER.dusk }; this.g.sky.time = Math.max(this.g.sky.time, 16.5); } this.hint(null); },
    'q_ashes.wake'() { this.startNight(); },
    'q_ashes.flee'(r) { this.buildNight(); this.finalizeDuel(); if (r) this.g.player.teleport(-27.2, 72.0, 1.4); this.beginFlee(); },
    'q_ashes.escape'(r) { this.buildNight(); this.finalizeDuel(); this.beginEscape(r); },
    'q_alone.birch'(r) { this.buildNight(); this.finalizeDuel(); this.finalizeGate(); this.beginWilderness(r ? [POI.forestEdge.x - 1, POI.forestEdge.z - 1] : null); },
    'q_alone.gather'(r) {
      if (r) { this.buildNight(); this.finalizeDuel(); this.finalizeGate(); this.beginWilderness([POI.camp.x + 3, POI.camp.z + 5]); }
      this.spawnPickups();
      this.g.ui.subtitle('Eirik', 'The old birch. Father said... three sticks. Bark. Patience.', 4.5);
      this.g.ui.hint('Gather 3 dry sticks and peel bark from the old birch. Your warmth is running out.');
      this.g.after(0.3, () => this.checkTinder());
    },
    'q_alone.light'(r) {
      if (r) { this.buildNight(); this.finalizeDuel(); this.finalizeGate(); this.beginWilderness([POI.camp.x + 1.5, POI.camp.z + 2.5]); }
      this.g.ui.hint('Press {interact} at the ring of stones. In this wind a bad strike costs you an ember.');
    },
  };

  ensureSpar(phase, r) {
    const g = this.g, n = this.npc('ragnar');
    if (!this.spar) {
      if (r) { n.teleport(POI.yard.x, POI.yard.z - 1.6, 0); n.h.hold('R', 'woodsword_big'); if (!g.inventory.has('woodsword')) g.inventory.add('woodsword', 1, true); }
      this.spar = new Sparring(g, n, {
        centre: POI.yard,
        onResult: (res) => {
          if (res === 'hit' && Math.random() < 0.6) n.say(['Guard up!', 'Too slow. Again.', 'Watch my shoulder, not my blade.'][(Math.random() * 3) | 0], 2);
          if (res === 'parried') n.say(['Yes!', 'There it is.', 'Good!'][(Math.random() * 3) | 0], 1.4);
          g.quests.notify('spar', res);
        },
      });
      g.player.equip('woodsword');
    }
    this.spar.setPhase(phase);
  }

  goToBed() {
    const g = this.g;
    g.player.frozen = true; this.hint(null);
    g.ui.fade(true, 1.6).then(() => g.quests.notify('event', 'sleep'));
  }

  // =====================================================================================
  // The raid
  // =====================================================================================
  /** Create everything the night needs (idempotent). */
  buildNight() {
    if (this.nightBuilt) return;
    this.nightBuilt = true;
    const g = this.g, w = g.world, st = this.st;
    st.stage = st.stage === 'wilderness' ? 'wilderness' : 'night';
    g.sky.time = 2.6; this.wTarget = { ...WEATHER.raid }; Object.assign(g.sky.weather, WEATHER.raid);
    this.snowTarget = 0.72; shared.uSnow.value = 0.72; this.glowTarget = 0; g.sky.fireGlow = 0;
    g.audio.setMusic('raid');
    this.hint(null);
    if (this.spar) { this.spar.stop(); this.spar = null; }
    g.wildlife.clear('hare'); g.wildlife.clear('deer'); this.clearPickups(); this.tracks.visible = false;
    for (const id of ['hrolf', 'thyra', 'asa', 'farmer2', 'odd']) this.npc(id).visible = false;
    for (const id of ['ragnar', 'ylva', 'brokk', 'gunnar', 'farmer1']) { const n = this.npc(id); n.talk = null; n.setLoop(null); n.crouch = false; }
    this.cookFire.on = false; this.greenFire.on = false; this.forgeFire.on = false; this.campFire.on = false;
    this.chimneys.forEach((c) => (c.on = false));

    // longships on the beach
    [[-16, 169, 0.12], [5, 171, -0.05], [25, 169.5, -0.16]].forEach(([x, z, ry], i) => {
      const s = makeShip({ seed: 11 + i }); s.position.set(x, -0.3, z); s.rotation.set(0, Math.PI + ry, 0.05 * (i - 1));
      g.scene.add(s); this.ships.push({ m: s, x, z, fire: g.fx.addFire(x, 4.6, z - 10.2, 0.45, { smoke: false }) });
    });

    // raiders
    const mk = (i, x, z, yaw, weapon, torch = true) => {
      const n = g.addNPC('raider' + i, { name: 'Raider', look: RAIDER_LOOKS[i % RAIDER_LOOKS.length], runSpeed: 3.9, walkSpeed: 1.45 });
      n.teleport(x, z, yaw); n.h.hold('R', weapon);
      if (torch) { n.h.hold('L', 'torch'); n.loop = 'torch'; n.torch = g.fx.addFire(x, 1.5, z, 0.3, { smoke: false }); }
      else n.h.hold('L', 'shield');
      this.raiders.push(n);
      return n;
    };
    this.rd = {
      a: mk(0, 0, 77, -1.5, 'axe', false), b: mk(1, 1.5, 79.5, -1.5, 'spear', false),
      g1: mk(2, ...DUEL.g1, -1.6, 'sword'), g2: mk(3, ...DUEL.g2, -1.6, 'axe'),
      brokk: mk(4, 0.5, 39, 0, 'axe', false), gunnar: mk(5, 19, 27.5, 1.5, 'sword', false), farmer: mk(6, -9.5, 23.5, 3, 'spear', false),
      loot1: mk(7, 9, 61, 1, 'axe'), loot2: mk(8, 22, 51, -2, 'sword'),
      gate1: mk(9, -23, -31, 0, 'axe'), gate2: mk(10, -20.5, -33, 0, 'spear', false),
      s1: mk(11, -35, 3.5, -1.5, 'axe'), s2: mk(12, -55, 4, 0, 'sword'), s3: mk(13, -58, -15, 1.5, 'spear'), s4: mk(14, -30, -24, -1.5, 'axe'),
    };
    this.rd.s1.makeRaider([[-35, 3.5], [-43.5, 1.2], [-41, -6]], { pause: 2.8 });
    this.rd.s2.makeRaider([[-55, 4], [-57.5, 10.5]], { pause: 3 });
    this.rd.s3.makeRaider([[-58, -15], [-49, -18]], { pause: 3.6 });
    this.rd.s4.makeRaider([[-30, -24], [-44, -27]], { pause: 2.6 });
    this.rd.loot1.makeRaider([], { busy: true }); this.rd.loot2.makeRaider([], { busy: true });
    this.rd.gate1.visible = false; this.rd.gate2.visible = false;

    const hk = (this.hakon = g.addNPC('hakon', CAST.hakon));
    hk.teleport(3, 75, -1.5); hk.h.hold('R', 'sword'); hk.walkSpeed = 1.3;

    // villagers making their stand
    const pair = (vid, rk, x, z, weapon, lethal) => {
      const v = this.npc(vid), rr = this.rd[rk];
      v.visible = true; v.teleport(x, z, 0); v.h.hold('R', weapon); v.h.hold('L', null);
      v.fight(rr, { lethal: 0 }); rr.fight(v, { lethal });
    };
    pair('brokk', 'brokk', -1.2, 40.5, 'hammer', 0);
    pair('gunnar', 'gunnar', 20.5, 28.5, 'sword', 0.1);
    pair('farmer1', 'farmer', -9, 21.5, 'hoe', 0.07);
  }
  /** The raid proper: roofs alight, the sky glowing. */
  ignite() {
    for (const id of ['elder', 'skald', 'odd', 'houseF', 'boathouse', 'weaver']) this.burn(id);
    this.glowTarget = 0.85; this.g.sky.fireGlow = Math.max(this.g.sky.fireGlow, 0.6);
  }
  burn(id) {
    if (this.houseFires[id]) return;
    const h = this.g.world.houses[id];
    this.houseFires[id] = h.ridgePts.map((p, i) => this.g.fx.addFire(p.x, p.y, p.z, 2.0 + (i % 2) * 0.6));
  }

  startNight() {
    const g = this.g;
    this.buildNight();
    g.player.frozen = true;
    g.player.teleport(-27.2, 72.0, 1.4);
    const y = this.npc('ylva'), r = this.npc('ragnar');
    y.teleport(-25.9, 72.5, -1.9); y.h.hold('R', 'father_axe'); y.h.hold('L', 'spear');
    r.teleport(...DUEL.ragnar, 1.5); r.h.hold('R', 'sword'); r.h.hold('L', 'shield'); r.setLoop('guard');
    this.rd.g1.visible = this.rd.g2.visible = false; this.hakon.visible = false;
    this.rd.a.visible = this.rd.b.visible = false;
    // ships start out in the fog
    this.shipK = 0;
    Object.assign(g.sky.weather, { fog: 0.3 });
    const gy = (x, z, h) => heightAt(x, z) + h;
    const ship = () => { const s = this.ships[1].m.position; return [s.x, 3.2, s.z]; };

    g.ui.card('The Night of Ashes', 'That night, the first snow fell.', 4).then(() => g.ui.fade(false, 1.5));
    g.after(3.6, () => g.cine.play([
      { dur: 7.5, from: [38, 2.0, 232], to: [30, 1.7, 218], look: ship, fov: 40, onStart: () => { this.shipMove = true; g.after(3.2, () => g.audio.play('horn', { freq: 82 })); } },
      { dur: 5.2, from: [-44, gy(-44, 112, 20), 112], to: [-36, gy(-36, 104, 17), 104], look: [-8, 7, 58], fov: 44, sub: ['Lookout', 'Sails... SAILS ON THE FJORD!', 3.4], onStart: () => g.after(1.2, () => g.audio.play('horn', { freq: 131 })) },
      { dur: 5.0, from: [16, 1.5, 158], to: [13, 1.8, 154], look: () => [this.ships[1].m.position.x, 3.5, this.ships[1].m.position.z - 6], fov: 46, onStart: () => g.audio.setAmbience({ battle: 0.7 }) },
    ], { onEnd: () => this.playDuel() }));
  }

  playDuel() {
    const g = this.g, r = this.npc('ragnar'), y = this.npc('ylva'), hk = this.hakon, { a, b, g1, g2 } = this.rd;
    this.shipK = 1; this.shipMove = false; this.placeShips();
    this.wTarget = { ...WEATHER.raid }; this.ignite();
    const gy = (x, z, h) => g.world.groundAt(x, z) + h;
    const mid = () => [(r.pos.x + hk.pos.x) / 2, r.pos.y + 1.35, (r.pos.z + hk.pos.z) / 2];
    g.cine.play([
      { dur: 3.4, from: [-30.6, gy(-30.6, 70.2, 1.25), 70.2], to: [-30.0, gy(-30, 70.6, 1.2), 70.6], look: [-26.5, gy(-26.5, 72.3, 1.05), 72.3], fov: 42, sub: ['Ylva', 'Eirik! Up. Now. Not a sound.', 2.8] },
      { dur: 3.6, from: [-29.4, gy(-29.4, 73.3, 1.65), 73.3], look: [-15, gy(-15, 70, 1.4), 70], fov: 40, sub: ['Ragnar', 'Ylva. The north path. Take the boy and go!', 3.2],
        onStart: () => { a.visible = b.visible = true; a.goTo(-12.6, 69.4, { run: true }); b.goTo(-12.4, 71.4, { run: true }); } },
      { dur: 5.2, from: [-16, gy(-16, 62.5, 1.1), 62.5], to: [-12, gy(-12, 63, 1.2), 63], look: () => [r.pos.x + 1, r.pos.y + 1.2, r.pos.z], fov: 46,
        onStart: () => { r.fightT = 0.2; r.fight(a, { lethal: 1, onWin: (o) => { o.fight(b, { lethal: 1 }); o.fightT = 0.3; } }); a.fight(r, { lethal: 0 }); b.fight(r, { lethal: 0 }); r.fightT = 0.25; } },
      { dur: 4.6, from: [-11.5, gy(-11.5, 69, 0.7), 69], look: () => [hk.pos.x, hk.pos.y + 1.7, hk.pos.z], fov: 38, sub: ['Jarl Håkon', 'Ragnar. Ten winters I have looked for you.', 3.8],
        onStart: () => { a.die(true); b.die(true); r.stop(); r.setLoop('guard'); r.face(...DUEL.hakon); hk.visible = g1.visible = g2.visible = true; hk.teleport(3, 74.6, -1.5); hk.goTo(...DUEL.hakon, { onArrive: (o) => o.face(...DUEL.ragnar) }); } },
      { dur: 4.0, from: [-13.6, gy(-13.6, 66.6, 1.5), 66.6], to: [-13.0, gy(-13, 66.9, 1.5), 66.9], look: mid, fov: 40, sub: ['Ragnar', 'Håkon. So it is you they call Ironwolf.', 3.4] },
      { dur: 4.4, from: [-13.4, gy(-13.4, 70.9, 1.7), 70.9], look: () => [hk.pos.x, hk.pos.y + 1.78, hk.pos.z], fov: 30, sub: ['Jarl Håkon', 'The old king gave you something to keep. Where is it?', 3.8] },
      { dur: 3.2, from: [-12.0, gy(-12, 70.0, 1.6), 70.0], look: () => [r.pos.x, r.pos.y + 1.62, r.pos.z], fov: 30, sub: ['Ragnar', 'Somewhere you will never reach.', 2.6] },
      { dur: 7.4, from: [-16.5, gy(-16.5, 65, 1.3), 65], to: [-8.5, gy(-8.5, 65.5, 1.0), 65.5], look: mid, fov: 44, linear: true,
        onStart: () => { r.fight(hk, { lethal: 0 }); hk.fight(r, { lethal: 0 }); r.fightT = 0.3; hk.fightT = 0.9; this.fell = false; },
        onUpdate: (k) => { if (k > 0.7 && !this.staggered) { this.staggered = true; r.h.play('stagger', 0.7); g.audio.play('hurt'); } if (k > 0.86 && !this.fell) { this.fell = true; r.die(); hk.stop(); hk.setLoop('guard'); } } },
      { dur: 2.8, from: [-24.6, gy(-24.6, 70.5, 0.95), 70.5], look: [-27.2, gy(-27.2, 72, 0.82), 72.0], fov: 32, sub: ['Eirik', 'FATHER!', 2.2], onStart: () => { g.player.h.play('stagger', 0.8); y.face(-27.2, 72); } },
      { dur: 6.4, from: [-12.4, gy(-12.4, 71.2, 0.55), 71.2], to: [-12.9, gy(-12.9, 71.6, 0.6), 71.6], look: () => [hk.pos.x, hk.pos.y + 1.8, hk.pos.z], fov: 36,
        sub: ['Jarl Håkon', 'You should have sworn to me when I asked. Find the woman and the boy. Halfdan\'s line ends tonight.', 5.8], onStart: () => this.burn('home') },
    ], { onEnd: () => this.g.quests.notify('event', 'duelDone') });
  }
  placeShips() {
    const e = this.shipK * this.shipK * (3 - 2 * this.shipK);
    this.ships.forEach((s, i) => {
      s.m.position.z = lerp(s.z + 150 + i * 14, s.z, e); s.m.position.y = -0.3 + Math.sin(this.t * 0.9 + i) * 0.06 * (1 - e);
      s.fire.z = s.m.position.z - 10.2; s.fire.x = s.m.position.x;
    });
  }
  /** State of the yard after the duel. */
  finalizeDuel() {
    const g = this.g, r = this.npc('ragnar'), y = this.npc('ylva'), hk = this.hakon, { a, b, g1, g2 } = this.rd;
    this.shipK = 1; this.shipMove = false; this.placeShips();
    for (const n of [a, b]) { n.visible = true; n.teleport(n === a ? -12.6 : -12.4, n === a ? 68.6 : 72.2, 1); n.dead = true; n.mode = 'dead'; n.loop = 'dead'; n.h.action = null; n.h.setLoop('dead'); n.h.snap(); }
    r.visible = true; r.teleport(-13.6, 70.2, 1.5); r.h.hold('R', 'sword'); r.h.hold('L', 'shield'); r.dead = true; r.mode = 'dead'; r.loop = 'dead'; r.h.action = null; r.h.setLoop('dead'); r.h.snap();
    hk.visible = true; hk.teleport(...DUEL.hakon, -1.5); hk.stop(); hk.setLoop('guard');
    for (const n of [g1, g2]) { n.visible = true; n.teleport(...(n === g1 ? DUEL.g1 : DUEL.g2), -1.6); n.makeRaider([], { busy: true }); }
    this.ignite(); this.burn('home');
    y.visible = true; if (!y.dead && !this.gatePlayed) { y.h.hold('R', 'father_axe'); y.h.hold('L', 'spear'); }
    g.audio.setAmbience({ battle: 0.7 }); g.audio.setMusic('raid');
    g.player.frozen = false;
  }

  beginFlee() {
    const g = this.g, y = this.npc('ylva');
    this.st.stage = 'night';
    y.teleport(-25.9, 72.5, -1.9); y.runSpeed = 4.0;
    y.say("Don't look. Eirik, don't look. Run with me!", 3.5);
    this.gateReady = false;
    y.lead(FLEE_PATH, { speed: 4.0, wait: 10, resume: 4.5, bark: ['Eirik! With me!', 'Do not stop. Run!', 'Stay close, little raven!'], onArrive: () => { this.gateReady = true; } });
    g.ui.hint('Run! Hold {sprint} to sprint. Stay with your mother.');
    this.fleeBarks = { brokk: false, mid: false };
  }

  playGate() {
    const g = this.g, y = this.npc('ylva'), p = g.player, { gate1, gate2 } = this.rd;
    this.gatePlayed = true; g.ui.hint(null);
    y.stop(); y.teleport(-21.5, -13.5, 0); p.teleport(-21.0, -11.6, Math.PI); p.crouch = false;
    const gy = (x, z, h) => g.world.groundAt(x, z) + h;
    g.cine.play([
      { dur: 4.6, from: [-23.4, gy(-23.4, -12.3, 1.0), -12.3], to: [-23.1, gy(-23.1, -12.1, 1.0), -12.1], look: [-21.2, gy(-21.2, -12.6, 0.95), -12.6], fov: 34,
        sub: ['Ylva', "Take it. Your father's axe. Keep it hidden. Keep it sharp.", 4.0],
        onStart: () => { y.setLoop('kneel'); y.face(p.pos.x, p.pos.z); g.after(1.6, () => { y.h.hold('R', null); p.showBackAxe(true); if (!g.inventory.has('father_axe')) g.inventory.add('father_axe', 1); }); } },
      { dur: 4.4, from: [-19.3, gy(-19.3, -11.9, 1.05), -11.9], look: () => [y.pos.x, y.pos.y + 1.05, y.pos.z], fov: 30, sub: ['Ylva', 'Run to the old birch, where your father showed you. Do not look back.', 3.9] },
      { dur: 3.6, from: [-20, gy(-20, -9, 1.5), -9], look: [-22, gy(-22, -19, 1.4), -19], fov: 44, sub: ['Raider', 'There! The woman!', 2.0],
        onStart: () => { gate1.visible = gate2.visible = true; gate1.teleport(-23, -27, 0); gate2.teleport(-20.8, -28.5, 0); gate1.goTo(-22.6, -19.5, { run: true }); gate2.goTo(-21, -20.5, { run: true }); y.setLoop(null); y.h.hold('L', null); y.h.hold('R', 'spear'); y.face(-22, -19); g.audio.play('shout'); } },
      { dur: 2.6, from: [-22.6, gy(-22.6, -11.2, 0.9), -11.2], look: () => [y.pos.x, y.pos.y + 1.5, y.pos.z], fov: 34, sub: ['Ylva', 'I love you. GO!', 2.2] },
    ], { onEnd: () => this.g.quests.notify('reach', 'gate') });
  }
  /** State at the gate once Ylva has made her stand. */
  finalizeGate() {
    const y = this.npc('ylva'), { gate1, gate2 } = this.rd;
    this.gatePlayed = true;
    y.visible = true; y.teleport(-22, -16.6, 0.4); y.h.hold('L', null); y.h.hold('R', 'spear'); y.dead = true; y.mode = 'dead'; y.loop = 'dead'; y.h.action = null; y.h.setLoop('dead'); y.h.snap();
    for (const n of [gate1, gate2]) { n.visible = true; n.teleport(n === gate1 ? -13 : -9, n === gate1 ? -9 : 2, 2); }
    gate1.makeRaider(GATE_PATROL[0], { pause: 2.5 }); gate2.makeRaider(GATE_PATROL[1], { pause: 3 });
    this.g.player.showBackAxe(true);
    if (!this.g.inventory.has('father_axe')) this.g.inventory.add('father_axe', 1, true);
  }

  beginEscape(restoring) {
    const g = this.g, y = this.npc('ylva'), { gate1, gate2 } = this.rd;
    this.st.stage = 'night';
    if (restoring) { this.finalizeGate(); g.player.teleport(-26.5, -12.4, -1.5); }
    else {
      // her last stand buys the time to get away
      y.fight(gate1, { lethal: 0 }); gate1.fight(y, { lethal: 0 }); gate2.fight(y, { lethal: 0 });
      g.after(9, () => { if (!y.dead) { y.die(); g.audio.play('hurt', { vol: 0.7 }); } });
      g.after(11.5, () => { gate1.makeRaider(GATE_PATROL[0], { pause: 2.5 }); gate2.makeRaider(GATE_PATROL[1], { pause: 3 }); });
    }
    g.player.crouch = true;
    this.stealthActive = true;
    g.audio.setAmbience({ battle: 0.45 });
    this.hint('stealth');
  }

  onCaught(raider) {
    const g = this.g;
    if (this.failing || !this.stealthActive) return;
    this.failing = true; this.stealthActive = false; g.player.frozen = true;
    raider.h.play('shove', 0.5); g.player.h.play('stagger', 0.8); g.audio.play('hurt');
    g.ui.fade(true, 1.0).then(() => g.ui.card('Caught', 'The raiders drag you out of the dark.', 2.8)).then(() => g.reloadCheckpoint());
  }

  beginWilderness(place) {
    const g = this.g;
    this.st.stage = 'wilderness';
    this.stealthActive = false; this.cold = true;
    if (place) g.player.teleport(place[0], place[1], -2.4);
    this.wTarget = { ...WEATHER.storm }; this.snowTarget = 1; this.glowTarget = 0.3;
    if (place) { Object.assign(g.sky.weather, WEATHER.storm); shared.uSnow.value = 1; g.sky.fireGlow = 0.3; }
    g.sky.time = 4.2;
    g.audio.setMusic('sorrow'); g.audio.setAmbience({ battle: 0, wind: 1 });
    g.player.crouch = false; g.player.speedMul = 0.9;
    if (!place) g.ui.subtitle('Eirik', 'Do not look back. Do not look back.', 4);
    this.hint('cold');
    for (const n of this.raiders) if (n.raider && n.raider.state !== 'busy') { n.raider.state = 'busy'; n.speed = 0; }
  }

  playEnding() {
    const g = this.g, p = g.player;
    this.ending = true; this.cold = false; this.hint(null);
    this.campFire.on = true; this.campFire.size = 0.75;
    p.frozen = true; p.teleport(POI.camp.x + 0.3, POI.camp.z + 1.25, Math.PI); p.loopOverride = 'warm';
    this.wTarget = { snow: 0.6, fog: 0.12, overcast: 0.55, wind: 0.8 };
    const cy = heightAt(POI.camp.x, POI.camp.z), cx = POI.camp.x, cz = POI.camp.z;
    g.after(2.2, () => g.cine.play([
      { dur: 8, from: [cx + 2.4, cy + 0.85, cz + 3.4], to: [cx + 1.5, cy + 0.8, cz + 2.7], look: [cx + 0.2, cy + 0.62, cz + 1.0], fov: 34, sub: ['', 'He was nine winters old.', 5] },
      { dur: 9, from: [cx - 3.5, cy + 1.6, cz + 5.5], to: [cx - 5.5, cy + 2.6, cz + 8], look: [cx, cy + 0.7, cz + 0.6], fov: 40, sub: ['', "He had his father's axe, his mother's last words, and a fire he had made himself.", 7.5] },
      { dur: 11, from: [cx - 10, cy + 6, cz - 12], to: [cx - 20, cy + 22, cz - 26], look: [cx + 20, cy + 3, cz + 30], lookTo: [cx + 70, cy + 8, cz + 90], fov: 46, sub: ['', 'It was enough to see the dawn.', 7],
        onUpdate: (k) => { g.sky.time = lerp(4.2, 7.25, k); } },
    ], { skippable: false, onEnd: () => { g.ui.fade(true, 2.5).then(() => { this.st.stage = 'ch1done'; g.autosave(); this.showChapterEnd(); }); } }));
  }
  showChapterEnd() { this.g.setMode('ui'); this.g.ui.showChapterEnd(); }
  onSave() { if (this.st.stage === 'open') this.open.onSave(); }
  /** Start the open-world prototype the same way. */
  beginOpen() {
    const g = this.g, st = this.st;
    st.stage = 'open'; st.quests.q_open = { status: 'active', step: 0, count: 0 }; st.open = null; st.player = null;
    Object.assign(g.player, { health: 100, warmth: 100, hunger: 100 }); g.sky.time = 9.5; g.player.pos.set(152, 0, -137);
    g.saveGame('auto'); g.reloadCheckpoint();
  }
  /** Start Act II the same way: ten winters on. */
  beginAct2() {
    const g = this.g, st = this.st;
    st.stage = 'act2'; st.quests.q_ten = { status: 'active', step: 0, count: 0 }; st.flags.axeHidden = true;
    Object.assign(g.player, { health: 100, warmth: 100, hunger: 100 }); g.sky.time = 14.6;
    g.saveGame('auto'); g.reloadCheckpoint();
  }
  /** Start Chapter 3 the same way. */
  beginChapter3() {
    const g = this.g, st = this.st;
    st.stage = 'ch3'; st.quests.q_hearth = { status: 'active', step: 0, count: 0 };
    Object.assign(g.player, { health: 100, warmth: 100, hunger: 100 }); g.sky.time = 10;
    g.saveGame('auto'); g.reloadCheckpoint();
  }
  /** Start Chapter 2 from a clean world: write the opening checkpoint, then reload into it. */
  beginChapter2() {
    const g = this.g, st = this.st;
    for (const id of Object.keys(st.quests)) if (st.quests[id].status === 'active') delete st.quests[id]; // unfinished village errands burned with the village
    st.stage = 'ch2'; st.quests.q_white = { status: 'active', step: 0, count: 0 };
    Object.assign(g.player, { health: 100, warmth: 70, hunger: 38 }); g.sky.time = 7.5;
    g.saveGame('auto'); g.reloadCheckpoint();
  }

  // =====================================================================================
  // Per-frame
  // =====================================================================================
  update(dt) {
    const g = this.g, p = g.player, q = g.quests, st = this.st, sky = g.sky;
    this.t += dt;
    // weather and ground snow ease toward their targets
    for (const k in this.wTarget) sky.weather[k] = damp(sky.weather[k], this.wTarget[k], 0.35, dt);
    shared.uSnow.value = damp(shared.uSnow.value, this.snowTarget, 0.25, dt);
    shared.uWind.value = sky.weather.wind;
    sky.fireGlow = damp(sky.fireGlow, this.glowTarget, 0.3, dt);
    g.fx.wind.x = 0.5 + sky.weather.wind * 0.9;

    if (st.stage === 'day') {
      if (g.mode === 'play') sky.time = Math.min(16.95, sky.time + dt / 260);
      st.time = sky.time;
      if (sky.time > 16.2) this.snowTarget = 0.06;
      this.updateDay(dt);
    } else if (st.stage === 'night') this.updateNight(dt);
    else if (st.stage === 'wilderness') this.updateWilderness(dt);
    else if (st.stage === 'ch2') this.ch2.update(dt);
    else if (st.stage === 'ch3') this.ch3.update(dt);
    else if (st.stage === 'act2') this.a2.update(dt);
    else if (st.stage === 'open') this.open.update(dt);
    if (this.shipMove) { this.shipK = Math.min(1, this.shipK + dt / 15); this.placeShips(); }
    if (this.spar) this.spar.update(dt);

    // Hunter's Sense visuals
    const s = g.sense;
    if (this.tracks.visible) {
      const m = this.tracks.userData.mat;
      m.opacity = lerp(0.5, 1, s); m.color.setRGB(lerp(0.09, 1.0, s), lerp(0.07, 0.72, s), lerp(0.05, 0.25, s));
    }
    if (s > 0.3 && Math.random() < dt * 40) {
      for (const a of g.wildlife.animals) {
        if (a.kind === 'sheep' || Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) > 90 || Math.random() > 0.35) continue;
        g.fx.add.spawn(a.pos.x, a.pos.y + (a.kind === 'deer' ? 1.2 : 0.3) + Math.random() * 0.4, a.pos.z, 0, 0.5, 0, 0.7, a.kind === 'deer' ? 0.5 : 0.28, 1, 0.7, 0.25, 0.5 * s, 0.2, 0, 0);
      }
      for (const pk of this.pickups) if (Math.random() < 0.3) g.fx.add.spawn(pk.m.position.x, pk.m.position.y + 0.2, pk.m.position.z, 0, 0.4, 0, 0.6, 0.2, 0.6, 0.85, 1, 0.5 * s, 0.1, 0, 0);
    }

    // ambience
    const dRiver = Math.abs(p.pos.x - riverX(p.pos.z));
    g.audio.setAmbience({
      river: clamp(1 - dRiver / 34, 0, 1) * 0.5, fire: g.fx.fireLoud,
      birds: (st.stage === 'day' || (st.stage === 'ch3' && st.flags.spring) || ((st.stage === 'act2' || st.stage === 'open') && !g.combat.active)) && sky.time < 16.4 ? 0.7 : 0,
      wind: st.stage === 'wilderness' ? 1 : st.stage === 'ch2' ? 0.4 + g.sky.weather.wind * 0.2 : st.stage === 'night' ? 0.5 : 0.2 + clamp((p.pos.y - 6) / 30, 0, 0.5),
    });
    if (st.stage === 'day' && g.mode !== 'menu') g.audio.setMusic('day');
  }

  updateDay(dt) {
    const g = this.g, p = g.player, q = g.quests;
    const rg = this.npc('ragnar');
    if (q.at('q_hunt', 'follow') && this.atMeadow && rg.dist(p) < 7) {
      q.notify('reach', 'meadow');
      g.dialogue.start('ragnar_meadow', { npc: rg });
    }
    if (q.at('q_hunt', 'track') && Math.hypot(p.pos.x - POI.deer.x, p.pos.z - POI.deer.z) < 36) q.notify('reach', 'deer');
    if (q.at('q_fire', 'camp') && this.atCamp && rg.dist(p) < 7) {
      q.notify('reach', 'camp');
      g.dialogue.start('ragnar_camp', { npc: rg });
    }
    if (q.at('q_hunt', 'hares') && this.t % 4 < dt) this.ensureHares();
    if ((q.at('q_hunt', 'track') || q.at('q_hunt', 'deer')) && this.t % 5 < dt) this.ensureDeer();
    // a patient father: more arrows when the quiver runs dry
    if (q.isActive('q_hunt') && g.inventory.has('bow') && g.inventory.count('arrow') === 0 && !g.wildlife.arrows.some((a) => !a.stuck)) {
      this.arrowT += dt;
      if (this.arrowT > 3) { this.arrowT = 0; rg.say('Out of arrows? Here. Aim, do not hope.', 3); g.inventory.add('arrow', 6); }
    } else this.arrowT = 0;
    // side quest discovery + a little village life
    if (!this.st.quests.s_skald && this.st.quests.q_morning && this.npc('hrolf').dist(p) < 20 && g.mode === 'play') {
      q.start('s_skald'); this.npc('hrolf').say("Ragnar's boy! Over here. A word!", 3);
    }
    this.schedT -= dt;
    if (this.schedT <= 0) {
      this.schedT = 3;
      const t = g.sky.time, th = this.npc('thyra');
      if (th.mode === 'idle' && Math.random() < 0.35) { const spots = [[-2.2, 45.2], [5, 48], [-9, 50], [1, 38], [8, 55]]; const s = spots[(Math.random() * spots.length) | 0]; th.goTo(s[0], s[1], { speed: 2.4 }); }
      if (t > 16.0 && !this.eveningDone) {
        this.eveningDone = true;
        for (const [id, x, z] of [['farmer1', -40, 9.5], ['farmer2', -43, 10]]) { const n = this.npc(id); n.setLoop(null); n.h.hold('R', null); n.goPath([[14, -2], [-6, 10], [x, z]], { speed: 1.5 }); }
        const asa = this.npc('asa'); asa.setLoop(null); asa.goTo(-36.5, 33.5, {});
        const br = this.npc('brokk'); br.setLoop(null); br.h.hold('R', null); br.goPath([[30, 49], [7.2, 47.6]], { onArrive: (o) => { o.face(3, 50); o.setLoop('warm'); } });
        this.forgeFire.on = false;
      }
    }
  }

  updateNight(dt) {
    const g = this.g, p = g.player, q = g.quests;
    if (q.at('q_ashes', 'flee')) {
      const y = this.npc('ylva'), fb = this.fleeBarks || {};
      if (!fb.brokk && Math.hypot(p.pos.x + 6, p.pos.z - 42) < 12) { fb.brokk = true; g.ui.subtitle('Brokk', 'RUN, BOY! Do not stop!', 2.6); g.audio.play('shout'); }
      if (!fb.mid && p.pos.z < 16) { fb.mid = true; y.say('The gate. We are nearly there!', 3); }
      if (!this.gatePlayed && this.gateReady && y.dist(p) < 6.5) this.playGate();
    }
    if (q.at('q_ashes', 'escape')) {
      if (Math.hypot(p.pos.x - POI.forestEdge.x, p.pos.z - POI.forestEdge.z) < 9) q.notify('reach', 'forest');
      // the search closes in if he hides at the gate for too long
      let aware = 0; for (const n of this.raiders) if (n.raider && n.visible) aware = Math.max(aware, n.aware);
      g.ui.setDetection(this.stealthActive ? aware : -1);
      if (aware > 0.3 && this.t % 1.1 < dt) g.audio.play('heart', { vol: clamp(aware, 0.3, 1) });
    } else g.ui.setDetection(-1);
    const dv = Math.hypot(p.pos.x, p.pos.z - 40);
    g.audio.setAmbience({ battle: clamp(1.1 - dv / 110, 0, 0.75) });
  }

  updateWilderness(dt) {
    const g = this.g, p = g.player, q = g.quests;
    g.ui.setDetection(-1);
    if (q.at('q_alone', 'birch') && Math.hypot(p.pos.x - POI.camp.x, p.pos.z - POI.camp.z) < 10) q.notify('reach', 'camp2');
    if (this.cold) {
      const rate = (g.settings.difficulty === 'easy' ? 0.42 : g.settings.difficulty === 'hard' ? 0.8 : 0.58) * (g.mode === 'play' ? 1 : 0.15);
      p.warmth = Math.max(0, p.warmth - rate * dt);
      p.speedMul = lerp(0.72, 0.92, p.warmth / 100);
      if (this.t % 3.2 < dt) g.fx.burst('breath', p.pos.x + Math.sin(p.yaw) * 0.25, p.pos.y + p.h.headHeight() - 0.08, p.pos.z + Math.cos(p.yaw) * 0.25, 2);
      if (p.warmth <= 0) {
        p.health -= 7 * dt;
        if (p.health <= 2 && !this.failing) {
          this.failing = true; p.frozen = true;
          g.ui.fade(true, 1.6).then(() => g.ui.card('The cold took him', 'Find the old birch. Light the fire.', 3)).then(() => g.reloadCheckpoint());
        }
      }
    } else if (this.ending) p.warmth = Math.min(100, p.warmth + 14 * dt);
    // hide the raid once it is far behind
    const far = Math.hypot(p.pos.x + 40, p.pos.z + 5) > 55;
    for (const n of this.raiders) if (n.raider && n.visible && far) { n.visible = false; if (n.torch) n.torch.on = false; }
  }

  /** Where the HUD should point for a quest step. */
  markerFor(step) {
    const m = step && step.marker;
    if (!m) return null;
    if (m.npc) { const n = this.npc(m.npc); return n && n.visible ? { x: n.pos.x, z: n.pos.z, y: n.pos.y + n.h.headHeight() + 0.45 } : null; }
    if (m.dyn === 'deerBody') return this.deerBody && !this.deerBody.harvested ? { x: this.deerBody.pos.x, z: this.deerBody.pos.z, y: this.deerBody.pos.y + 1.2 } : null;
    if (m.dyn === 'horse' || m.dyn === 'boat' || m.dyn === 'ship' || m.dyn === 'hound' || m.dyn === 'tooth') return this.open.dyn(m.dyn);
    if (m.dyn === 'wolf') { const w = this.ch2.wolf; return w && !w.dead ? { x: w.pos.x, z: w.pos.z, y: w.pos.y + 1.3 } : null; }
    if (m.pos) {
      const pl = this.g.player.pos, k = m.pos.join();
      if (m.until && Math.hypot(pl.x - m.pos[0], pl.z - m.pos[1]) < m.until) this.markerSeen = k;
      if (m.until && this.markerSeen === k) return null;
      return { x: m.pos[0], z: m.pos[1], y: Math.max(0, this.g.world.groundAt(m.pos[0], m.pos[1])) + 1.6 };
    }
    if (m.poi) {
      const p = POI[m.poi], pl = this.g.player.pos;
      if (m.until && Math.hypot(pl.x - p.x, pl.z - p.z) < m.until) this.markerSeen = m.poi;
      if (m.until && this.markerSeen === m.poi) return null;
      return { x: p.x, z: p.z, y: heightAt(p.x, p.z) + 1.6 };
    }
    return null;
  }
}
