// Act II, Chapter 1 — "The Farmer's Axe". Eirik is nineteen. A drill with Bjorn teaches the adult
// combat; the white raven spots Håkon's tithe-takers; the axe comes out from under the hearthstone;
// and the farm is defended in three waves. Step handlers are idempotent (play, load, tests).
import { POI } from '../world/layout.js';
import { heightAt } from '../world/terrain.js';
import { shared } from '../world/geo.js';
import { RAIDER_LOOKS, HINTS } from '../data/act1.js';
import { CAST2 } from '../data/act2.js';
import { EIRIK_ADULT } from '../entities/player.js';

const FIRE = POI.farmFire;
const POST = { signe: [144.6, -137.9], freydis: [151.8, -141.0], bjorn: [157, -133.4], start: [149.5, -139.2], muster: [127, -128], column: [104, -123] };
const AUTUMN = { snow: 0, fog: 0.01, overcast: 0.15, wind: 1 }, DUSK = { snow: 0, fog: 0.03, overcast: 0.45, wind: 1.3 };

export class Act2Ch1 {
  constructor(game, act) { this.g = game; this.act = act; this.built = false; this.t = 0; this.raiders = []; this.ending = false; this.wave = 0; }
  get st() { return this.g.state; }
  npc(id) { return this.g.npcs.get(id); }
  hint(k) { this.g.ui.hint(k ? this.g.fmt(HINTS[k]) : null); }

  // =====================================================================================
  // Set dressing shared by every step (idempotent)
  // =====================================================================================
  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g, A = this.act, p = g.player, st = this.st;
    st.stage = 'act2';
    for (const n of g.npcs.values()) { n.visible = false; n.talk = null; }
    A.cookFire.on = A.greenFire.on = A.forgeFire.on = A.campFire.on = false;
    A.chimneys.forEach((c) => { c.on = false; });
    const home = g.world.smoke.findIndex((s) => s.id === 'bjornstead'); if (home >= 0) A.chimneys[home].on = true;
    A.glowTarget = 0; g.sky.fireGlow = 0; A.snowTarget = 0; shared.uSnow.value = 0; A.wTarget = { ...AUTUMN }; Object.assign(g.sky.weather, AUTUMN);
    A.tracks.visible = false; A.clearPickups(); g.wildlife.clear('hare'); g.wildlife.clear('deer');
    g.fx.addFire(FIRE.x, heightAt(FIRE.x, FIRE.z) + 0.15, FIRE.z, 0.55);
    g.audio.setMusic('day');

    // Eirik, grown
    p.setLook(EIRIK_ADULT, true);
    for (const [id, n] of [['father_axe', 1], ['woodsword', 1], ['bow', 1]]) if (!g.inventory.has(id)) g.inventory.add(id, n, true);
    if (g.inventory.count('arrow') < 14) g.inventory.add('arrow', 14 - g.inventory.count('arrow'), true);
    if (st.flags.axeHidden === undefined) st.flags.axeHidden = true;
    p.showBackAxe(!st.flags.axeHidden);
    g.ravens.setMode('follow');

    for (const id of ['signe', 'bjorn', 'freydis']) { const n = g.addNPC(id, CAST2[id]); n.talk = () => this.talkTo(id); }
    for (const [x, z] of [[147, -156], [150.5, -154.5], [149, -157.5], [146.5, -153.8]]) g.wildlife.spawn('sheep', x, z, { home: { x: POI.pen.x, z: POI.pen.z, r: 2.6 } });

    g.world.addInteractable({ id: 'hearth2', x: POI.farmDoor.x, z: POI.farmDoor.z, r: 2.6, priority: 3, label: 'Lift the hearthstone', enabled: () => g.quests.at('q_smoke', 'axe'), use: () => this.takeAxe() });
    g.ravens.addMarkable({ id: 'riders', pos: () => ({ x: POST.column[0], z: POST.column[1] }), r: 85, label: 'riders on the river road', enabled: () => g.quests.at('q_smoke', 'spot'),
      onMark: () => { g.ui.subtitle('Eirik', 'Wolf shields. Seven of them, and one in red. Coming here.', 5); g.quests.notify('event', 'ridersSpotted'); } });
    g.events.on('ravenEye', (on) => { if (on) g.quests.notify('event', 'ravenEye'); });
    g.events.on('enemyHit', (e) => { if (e.id === 'bjorn') g.quests.notify('event', 'sparHit'); });
    g.events.on('postureBroken', (e) => { if (e.id === 'bjorn' && g.quests.at('q_ten', 'spar2')) g.quests.notify('event', 'postureBroken'); });
    g.events.on('playerDied', () => this.fail());
  }
  /** The family at their autumn-afternoon posts. */
  posts() {
    this.npc('signe').teleport(...POST.signe, Math.atan2(FIRE.x - POST.signe[0], FIRE.z - POST.signe[1])).setLoop('cook');
    this.npc('freydis').teleport(...POST.freydis, -2.2);
    const b = this.npc('bjorn'); b.teleport(...POST.bjorn, -2.4).setLoop(null); b.h.hold('R', 'woodsword_big'); b.h.hold('L', null);
  }
  enter(r) { this.build(); if (r) this.posts(); }

  // ---- the drill ---------------------------------------------------------------------
  startDrill() {
    const g = this.g, p = g.player, b = this.npc('bjorn');
    if (b.cb) return;
    b.h.hold('R', 'woodsword_big'); p.mortal = false;
    g.combat.add(b, { hp: 400, dmg: 6, skill: 0.6, training: true });
    p.equip('woodsword');
  }
  endDrill() {
    const g = this.g, b = this.npc('bjorn');
    if (!b.cb) return;
    g.combat.clear(); b.cb = null; b.mode = 'idle'; b.loop = null; b.h.setLoop(null); b.faceEntity(g.player);
    b.talk = () => this.talkTo('bjorn'); // combat cleared his conversation hook
    g.player.health = 100; g.player.equip('none');
  }

  // ---- the raid ----------------------------------------------------------------------
  /** Kettil's column, waiting on the river road until the fight starts. */
  column() {
    if (this.raiders.length) return;
    const g = this.g, weapons = ['axe', 'spear', 'sword', 'axe', 'sword', 'axe', 'spear'];
    for (let i = 0; i < 7; i++) {
      const n = g.addNPC('raider' + i, { name: 'Tithe-taker', look: RAIDER_LOOKS[i % RAIDER_LOOKS.length] });
      n.teleport(POST.column[0] - (i % 2) * 1.8 - Math.floor(i / 2) * 2.2, POST.column[1] + (i % 2 ? 1.4 : -1.2), 1.4);
      n.h.hold('R', weapons[i]); n.h.hold('L', i === 5 ? 'torch' : 'shield'); n.setLoop('guard');
      this.raiders.push(n);
    }
    const k = (this.kettil = g.addNPC('kettil', CAST2.kettil));
    k.teleport(POST.column[0] + 3, POST.column[1], 1.4); k.h.hold('R', 'sword'); k.h.hold('L', 'shield'); k.setLoop('guard');
  }
  /** Out comes the axe: from here the fight is real. */
  arm() {
    const g = this.g, p = g.player, A = this.act;
    this.st.flags.axeHidden = false; p.mortal = true; p.health = Math.max(p.health, 60);
    p.equip('father_axe');
    for (const id of ['signe', 'freydis']) this.npc(id).visible = false;
    const b = this.npc('bjorn'); b.visible = true; b.setLoop(null); b.h.hold('R', 'woodaxe'); b.h.hold('L', 'shield');
    if (b.mode !== 'fight') b.teleport(154.5, -137.2, -1.9);
    g.sky.time = Math.max(g.sky.time, 16.75); A.wTarget = { ...DUSK };
    g.audio.setMusic('raid'); this.column();
  }
  startWave(n) {
    const g = this.g, b = this.npc('bjorn'), R = this.raiders;
    if (this.wave >= n) return;
    this.wave = n;
    const send = (e, i, opts) => { e.visible = true; e.teleport(POST.muster[0] - i * 1.6, POST.muster[1] + (i % 2 ? 1.5 : -1.5), 1.2); return g.combat.add(e, opts); };
    const duel = (e) => { e.cb.duel = b; b.fight(e, { lethal: 0, dmg: 11 }); };
    if (n === 1) { this.w1 = [send(R[0], 0), send(R[1], 1), send(R[2], 2)]; duel(R[2]); g.ui.subtitle('Bjorn', 'Here they come. Stay off my left, and I will stay off yours.', 4); }
    if (n === 2) {
      this.w2 = [send(R[3], 0), send(R[4], 1), send(R[5], 2, { hp: 40, job: { x: 164.3, z: -135.3, fx: 169, fz: -135, time: 9, onDone: () => this.fireBarn() } })]; duel(R[4]);
      this.torch = { n: R[5], f: g.fx.addFire(R[5].pos.x, R[5].pos.y + 1.6, R[5].pos.z, 0.3, { smoke: false }) };
      g.ui.subtitle('Bjorn', 'The one with the torch! He is going for the barn!', 4);
    }
    if (n === 3) {
      const k = this.kettil;
      this.w3 = [send(k, 0, { hp: 450, dmg: 22, skill: 0.7, boss: true, reach: 2.3, rageLine: 'Enough! I will carry your head down the valley myself!', onDown: (e) => this.kettilDown(e) }), send(R[6], 1)]; duel(R[6]);
      k.say('A farm boy and an old man. Where is the tithe, Bjorn? Håkon wants his due.', 5);
    }
  }
  fireBarn() {
    if (this.st.flags.barnBurned) return;
    this.st.flags.barnBurned = true; this.act.burn('bjornbarn');
    this.g.ui.subtitle('Bjorn', 'The barn! No, leave it, {n}. Wood can be cut again. Stay alive!'.replace('{n}', this.st.alias || 'Eirik'), 5);
  }
  kettilDown(e) {
    const g = this.g;
    for (const o of g.combat.alive()) { o.cb.out = true; o.mode = 'idle'; o.h.setLoop(null); o.h.hold('R', null); o.goTo(96, -124, { run: true, onArrive: (x) => { x.visible = false; } }); } // the last man runs
    const b = this.npc('bjorn'); b.stop(); b.h.setLoop(null);
    e.mode = 'idle'; e.loop = 'mourn'; e.h.action = null; e.h.hold('R', null); e.talk = () => this.talkTo('kettil');
    g.audio.play('thud'); g.audio.setMusic('sorrow');
    g.after(0.6, () => g.quests.notify('event', 'captainDown'));
  }
  takeAxe() {
    const g = this.g, p = g.player;
    p.frozen = true; this.hint(null);
    g.ui.fade(true, 1.0)
      .then(() => g.ui.card('The Farmer\'s Axe', 'Ten winters of dust. The haft fitted his hand as if it had been waiting.', 5))
      .then(() => { this.arm(); p.teleport(POI.farmDoor.x, POI.farmDoor.z + 1.2, -1.9); return g.ui.fade(false, 1.0); })
      .then(() => { p.frozen = false; g.quests.notify('event', 'tookAxe'); });
  }
  fail() {
    const g = this.g, A = this.act;
    if (A.failing) return;
    A.failing = true; g.player.frozen = true; g.player.h.play('fall', 1.2, { onEnd: () => { g.player.loopOverride = 'dead'; } });
    g.ui.fade(true, 1.8).then(() => g.ui.card('Fallen', 'Guard. Wait for the opening. Break his guard, then strike.', 3.2)).then(() => g.reloadCheckpoint());
  }
  playEnding() {
    const g = this.g, A = this.act, st = this.st;
    if (this.ending) return;
    this.ending = true; g.player.frozen = true; g.ravens.exitEye();
    g.ui.fade(true, 2.6)
      .then(() => g.ui.card('', st.flags.sparedKettil ? 'Kettil Red-Hand walked back down the valley, and told what he had seen.' : 'One of the seven had run. He did not stop running until the coast.', 5))
      .then(() => g.ui.card('', "When the word reached Jarl Håkon Ironwolf he was at table. He put down his cup. “Ragnar's boy,” he said. “Find him.”", 7))
      .then(() => g.ui.card('The Farmer\'s Axe', 'End of Act Two, Chapter One', 4.5))
      .then(() => { st.stage = 'complete'; g.autosave(); A.showChapterEnd(); });
  }

  talkTo(id) {
    const g = this.g, q = g.quests, d = (tree, onEnd) => g.dialogue.start(tree, { npc: this.npc(id), onEnd }), done = () => q.notify('talk', id);
    if (id === 'freydis') return q.at('q_ten', 'freydis') ? d('freydis2_meet', done) : d('freydis2_idle');
    if (id === 'signe') return d('signe_idle');
    if (id === 'kettil') return d('kettil_dying', done);
    if (q.at('q_ten', 'bjorn')) return d('bjorn_drill', done);
    if (q.at('q_ten', 'bjorn2')) return d('bjorn_drill_done', done);
    if (q.at('q_smoke', 'warn')) return d('bjorn_warn', done);
    return d('bjorn2_idle');
  }

  // =====================================================================================
  // Quest step handlers
  // =====================================================================================
  steps = {
    'q_ten.wake'() {
      const g = this.g, p = g.player;
      this.enter(true); g.sky.time = 14.6;
      p.frozen = true; p.teleport(...POST.start, 1.9);
      g.ui.card('Act Two', 'The Farmer\'s Axe  ·  ten winters later', 4.2).then(() => { p.frozen = false; g.quests.notify('event', 'woke5'); });
    },
    'q_ten.freydis'(r) { this.enter(r); this.g.ui.hint('Ten years on, the controls are the same. You are faster, and you hit harder.'); },
    'q_ten.bjorn'(r) { this.enter(r); this.hint(null); },
    'q_ten.spar1'(r) { this.enter(r); this.startDrill(); this.hint('melee'); },
    'q_ten.spar2'(r) { this.enter(r); this.startDrill(); this.hint('guard'); if (!r) this.npc('bjorn').say('Now break my guard. Hit hard when I am braced, or turn my blade and come back fast.', 5); },
    'q_ten.bjorn2'(r) { this.enter(r); this.endDrill(); this.hint(null); },
    'q_smoke.eye'(r) { this.enter(r); this.endDrill(); this.column(); this.hint('ravenwest'); if (!r) this.g.ui.subtitle('', this.g.fmt('{w} wheels over the yard, crying, and will not come down.'), 5); },
    'q_smoke.spot'(r) { this.enter(r); this.column(); this.hint('ravenwest'); },
    'q_smoke.warn'(r) { this.enter(r); this.column(); this.hint(null); },
    'q_smoke.axe'(r) {
      this.enter(r); this.column(); this.g.ui.hint('Press {interact} at the door of the longhouse.');
      for (const id of ['signe', 'freydis']) { const n = this.npc(id); n.setLoop(null); n.goTo(POI.farmDoor.x - 0.6, POI.farmDoor.z - 0.3, { speed: 3, onArrive: (o) => { o.visible = false; } }); }
    },
    'q_axe.yard'(r) { this.build(); this.arm(); if (r) this.g.player.teleport(POI.farmDoor.x, POI.farmDoor.z + 1.2, -1.9); this.startWave(1); this.hint('raid'); },
    'q_axe.barn'(r) { this.build(); this.arm(); if (r) this.g.player.teleport(152, -138, -1.9); this.startWave(2); this.hint(null); },
    'q_axe.captain'(r) { this.build(); this.arm(); if (r) this.g.player.teleport(152, -138, -1.9); this.startWave(3); this.hint('guard'); },
    'q_axe.dying'(r) {
      const g = this.g;
      this.build(); this.arm(); g.audio.setMusic('sorrow'); this.hint(null);
      if (r) { // loaded after the fight: Kettil is already down in the yard
        const k = this.kettil; k.visible = true; k.teleport(150, -136.5, 0.4); g.player.teleport(151.4, -138.4, -0.6);
        k.mode = 'idle'; k.loop = 'mourn'; k.h.hold('R', null); k.talk = () => this.talkTo('kettil');
      }
      g.combat.clear(); g.player.mortal = false; g.player.equip('none');
    },
  };

  update(dt) {
    if (!this.built) return;
    const g = this.g, q = g.quests, p = g.player;
    this.t += dt;
    if (g.mode === 'play') g.sky.time = Math.min(q.isActive('q_axe') ? 17.15 : 16.2, g.sky.time + dt / 240);
    this.st.time = g.sky.time; p.warmth = 100; p.hunger = 100;
    const down = (arr) => !!arr && arr.every((e) => e.dead || (e.cb && e.cb.out));
    // a breath between waves
    const lull = (key, line) => { this.lullT = (this.lullT || 0) + dt; if (this.lullT > 0.05 && !this.lullSaid) { this.lullSaid = true; this.npc('bjorn').say(line, 3); } if (this.lullT > 3.2) { this.lullT = 0; this.lullSaid = false; q.notify('event', key); } };
    if (q.at('q_axe', 'yard') && down(this.w1)) lull('wave1', 'More coming. Breathe while you can.');
    else if (q.at('q_axe', 'barn') && down(this.w2)) lull('wave2', 'That is not all of them. Where is the one in red?');
    if (this.torch) { const { n, f } = this.torch; f.x = n.pos.x + Math.sin(n.yaw) * 0.3; f.y = n.pos.y + 1.7; f.z = n.pos.z + Math.cos(n.yaw) * 0.3; f.on = !n.dead; }
  }
}
