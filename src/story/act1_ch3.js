// Act I, Chapter 3 — "A Stranger's Hearth". Bjorn's farm: a new family, two raven chicks, an axe under
// the hearthstone, then spring and the white raven's first flight. Ends Act I with the ten-year jump.
import * as THREE from 'three';
import { POI } from '../world/layout.js';
import { heightAt } from '../world/terrain.js';
import { shared, M, at, cone, sphere, tint, merge } from '../world/geo.js';
import { CAST, RAIDER_LOOKS, HINTS } from '../data/act1.js';
import { SECRETS } from '../data/act1_ch3.js';
import { Woodcutting } from '../systems/activities.js';
import { damp, dampAngle } from '../core/util.js';

const FIRE = POI.farmFire;
const LOGS = [[121.5, -155], [129.5, -157.5], [123, -146.5]];
const NEST_PATH = [[158, -137.5], [148, -139.5], [137, -146], [129.5, -149.6], [129.6, -148.4]];
const WINTER = { snow: 0.2, fog: 0.04, overcast: 0.5, wind: 1 }, SPRING = { snow: 0, fog: 0, overcast: 0.1, wind: 1 };
const POST = { signe: [144.6, -137.9], bjorn: [159.2, -139.6], freydis: [162.6, -143.4], seat: [147.0, -136.4], basket: [144.9, -135.7] };
const dist = (p, x, z) => Math.hypot(p.x - x, p.z - z);

function chick(col, beak) {
  const m = new THREE.Mesh(merge([
    tint(at(sphere(0.075, 7, 6), 0, 0.08, 0, 0, 0, 0, 1, 0.9, 1.15), col, 0.12, 1), tint(at(sphere(0.05, 6, 5), 0, 0.16, 0.06), col, 0.1, 2),
    tint(at(cone(0.02, 0.06, 4), 0, 0.16, 0.12, Math.PI / 2, 0, 0), beak, 0, 3),
  ]), M.vcPlain);
  m.castShadow = true;
  return m;
}

export class Chapter3 {
  constructor(game, act) { this.g = game; this.act = act; this.built = false; this.t = 0; this.lamb = null; this.ending = false; this.grubs = 0; }
  get st() { return this.g.state; }
  npc(id) { return this.g.npcs.get(id); }
  hint(k) { this.g.ui.hint(k ? this.g.fmt(HINTS[k]) : null); }

  // =====================================================================================
  // Set dressing shared by every step (idempotent)
  // =====================================================================================
  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g, A = this.act, w = g.world, st = this.st;
    st.stage = 'ch3';
    for (const n of g.npcs.values()) { n.visible = false; n.talk = null; }
    A.cookFire.on = A.greenFire.on = A.forgeFire.on = A.campFire.on = false;
    A.chimneys.forEach((c) => { c.on = false; });
    const home = w.smoke.findIndex((s) => s.id === 'bjornstead'); if (home >= 0) A.chimneys[home].on = true;
    A.glowTarget = 0; g.sky.fireGlow = 0; A.tracks.visible = false; A.clearPickups(); g.wildlife.clear('hare'); g.wildlife.clear('deer');
    this.fire = g.fx.addFire(FIRE.x, heightAt(FIRE.x, FIRE.z) + 0.15, FIRE.z, 0.55);
    g.player.equip('none');

    for (const id of ['signe', 'bjorn', 'freydis']) {
      const n = g.addNPC(id, CAST[id]);
      n.talk = () => this.talkTo(id);
    }
    this.npc('signe').teleport(...POST.signe, Math.atan2(FIRE.x - POST.signe[0], FIRE.z - POST.signe[1])).setLoop('cook');
    const b = this.npc('bjorn'); b.teleport(...POST.bjorn, -1.2).setLoop('hammer'); b.h.hold('R', 'hammer');
    this.npc('freydis').teleport(...POST.freydis, -1.0);
    for (const [x, z] of [[147, -156], [150.5, -154.5], [149, -157.5]]) g.wildlife.spawn('sheep', x, z, { home: { x: POI.pen.x, z: POI.pen.z, r: 2.6 } });

    // the chicks: in the fallen nest until they are fed, then in a basket by the fire
    this.chicks = new THREE.Group(); this.chicks.add(chick(0xe9e6df, 0xcaa79c), chick(0x17171c, 0x2a2a30));
    this.chicks.children[0].position.set(-0.09, 0, 0); this.chicks.children[1].position.set(0.1, 0, 0.03); this.chicks.children[1].rotation.y = 0.8;
    g.scene.add(this.chicks);

    // interactables
    LOGS.forEach(([x, z], i) => w.addInteractable({ id: 'grub' + i, x, z, r: 2, priority: 1, label: 'Turn over the log', enabled: () => g.quests.at('q_hearth', 'grubs') && !this['log' + i],
      use: () => { this['log' + i] = true; g.player.h.play('pickup', 0.6); g.audio.play('thud', { vol: 0.4 }); g.ui.toast('A fat white grub'); g.quests.notify('event', 'grub'); } }));
    w.addInteractable({ id: 'nestfeed', x: POI.nest.x, z: POI.nest.z, r: 2.4, priority: 1, label: 'Feed the chicks', enabled: () => g.quests.at('q_hearth', 'feed'), use: () => this.feedChicks() });
    w.addInteractable({ id: 'farmchop', x: POI.farmChop.x, z: POI.farmChop.z, r: 2.3, label: 'Split logs', enabled: () => g.quests.at('q_hearth', 'chop'), use: () => this.chop() });
    w.addInteractable({ id: 'hearth', x: POI.farmDoor.x, z: POI.farmDoor.z, r: 2.6, priority: 3, label: 'Hide the axe under the hearthstone', enabled: () => g.quests.at('q_hearth', 'hide'), use: () => this.hideAxe() });
    const secret = (id, poi, r, tree) => w.addInteractable({ id: 'sec_' + id, x: POI[poi].x, z: POI[poi].z, r, label: 'Look closer', enabled: () => st.stage === 'ch3' && !st.secrets[id] && g.mode === 'play',
      use: () => g.dialogue.start(tree, { onEnd: () => this.foundSecret(id) }) });
    secret('barrow', 'barrow', 2.8, 'sec_barrow'); secret('skyiron', 'skyIron', 2.2, 'sec_skyiron');
    secret('twinaxe', 'axeStone', 3, 'sec_twinaxe'); secret('yew', 'yew', 3.2, 'sec_yew');
    w.addInteractable({ id: 'tarn', x: POI.tarn.x, z: POI.tarn.z, r: 6.5, label: 'Look into the ice', enabled: () => st.stage === 'ch3' && !st.secrets.icespear, use: () => g.dialogue.start('tarn_ground') });

    // what the white raven can find from the air
    const R = g.ravens, at2 = (poi) => () => POI[poi];
    R.addMarkable({ id: 'icespear', pos: at2('tarn'), r: 30, label: 'something under the ice', enabled: () => !st.secrets.icespear, onMark: () => g.dialogue.start('sec_icespear', { onEnd: () => this.foundSecret('icespear') }) });
    for (const [id, poi, label, what] of [['barrow', 'barrow', 'a mound ringed with stones', 'Stone-ringed mound'], ['twinaxe', 'axeStone', 'a standing stone', 'Standing stone'], ['yew', 'yew', 'a split tree, still green', 'Split yew']])
      R.addMarkable({ id: 'm_' + id, pos: at2(poi), r: 34, label, enabled: () => !st.secrets[id] && !st.marks[id], onMark: () => { st.marks[id] = { x: POI[poi].x, z: POI[poi].z, label: what }; g.ui.toast(`Marked on your map: ${what}`); } });
    R.addMarkable({ id: 'hunters', pos: at2('hunters'), r: 75, label: 'smoke on the west bank', enabled: () => !!st.flags.spring && !st.flags.sawHunters,
      onMark: () => { st.flags.sawHunters = true; g.ui.subtitle('Eirik', 'Men with the wolf on their shields. Still looking. But on the wrong side of the river.', 6); } });
    R.addMarkable({ id: 'lamb', pos: () => (this.lamb ? this.lamb.pos : POI.lamb), r: 42, label: 'the lost lamb', enabled: () => g.quests.at('q_wings', 'spot'),
      onMark: () => { st.marks.lamb = { x: POI.lamb.x, z: POI.lamb.z, label: 'Lost lamb' }; g.ui.subtitle('Eirik', 'There. In the gully past the fallen pine.', 4); g.quests.notify('event', 'lambSpotted'); } });
    g.events.on('ravenEye', (on) => { if (on) g.quests.notify('event', 'ravenEye'); });
  }

  /** Winter while he recovers; spring once the ravens have fledged. */
  season(spring) {
    const g = this.g, A = this.act;
    this.build();
    A.snowTarget = spring ? 0 : 1; shared.uSnow.value = A.snowTarget;
    A.wTarget = { ...(spring ? SPRING : WINTER) }; Object.assign(g.sky.weather, A.wTarget);
    g.audio.setMusic('day');
    this.chicks.visible = !spring;
    if (spring) {
      this.st.flags.spring = true; g.ravens.setMode('follow'); g.player.showBackAxe(false);
      if (!this.hunters) { // a tracker camp across the river: seen only from the air
        this.hunters = true;
        [[POI.hunters.x - 1.4, POI.hunters.z + 0.6, 1.2], [POI.hunters.x + 1.5, POI.hunters.z - 0.4, -1.7]].forEach(([x, z, yaw], i) => {
          const n = g.addNPC('hunter' + i, { name: 'Tracker', look: RAIDER_LOOKS[i] }); n.teleport(x, z, yaw).setLoop('warm'); n.h.hold('L', 'shield');
        });
        g.fx.addFire(POI.hunters.x, heightAt(POI.hunters.x, POI.hunters.z) + 0.15, POI.hunters.z, 0.7);
      }
    } else g.player.showBackAxe(!this.st.flags.axeHidden && g.inventory.has('father_axe'));
  }
  placeChicks(atFire) {
    const [x, z] = atFire ? POST.basket : [POI.nest.x, POI.nest.z];
    this.chicks.position.set(x, heightAt(x, z) + (atFire ? 0.5 : 0.16), z);
  }
  /** Everyone at their winter posts. */
  posts() {
    this.npc('signe').teleport(...POST.signe, Math.atan2(FIRE.x - POST.signe[0], FIRE.z - POST.signe[1])).setLoop('cook');
    const b = this.npc('bjorn'); b.teleport(...POST.bjorn, -1.2).setLoop('hammer'); b.h.hold('R', 'hammer');
    this.npc('freydis').teleport(...POST.freydis, -1.0);
  }

  // =====================================================================================
  // Conversations and small scenes
  // =====================================================================================
  talkTo(id) {
    const g = this.g, q = g.quests, d = (tree, onEnd) => g.dialogue.start(tree, { npc: this.npc(id), onEnd }), done = () => q.notify('talk', id);
    if (id === 'signe') return q.at('q_hearth', 'signe') ? d('signe_wake', done) : d('signe_idle');
    if (id === 'freydis') {
      if (q.at('q_hearth', 'freydis')) return d('freydis_meet', done);
      if (q.at('q_wings', 'freydis')) return d('freydis_lamb', done);
      if (q.at('q_wings', 'home')) return d('freydis_thanks', () => { this.penLamb(); done(); });
      return d('freydis_idle');
    }
    if (q.at('q_hearth', 'bjorn')) return d('bjorn_wood', done);
    if (q.at('q_hearth', 'bjorn2')) return d('bjorn_axe', done);
    if (q.at('q_wings', 'dusk')) return d('bjorn_dusk', done);
    return d('bjorn_idle');
  }
  feedChicks() {
    const g = this.g, p = g.player;
    p.h.play('pickup', 0.7); g.audio.play('bird'); g.after(0.3, () => g.audio.play('bird'));
    g.ui.subtitle('Freydis', g.fmt('{w} ate from your HAND. {b} tried to eat your hand.'), 4.5);
    g.after(1.2, () => { this.placeChicks(true); g.quests.notify('event', 'fedChicks'); });
  }
  chop() {
    const g = this.g, q = this.st.quests.q_hearth;
    new Woodcutting(g, { x: POI.farmChop.x, z: POI.farmChop.z, count: 4 - (q?.count || 0), onSplit: () => g.quests.notify('activity', 'chop') }).start();
  }
  hideAxe() {
    const g = this.g, p = g.player;
    p.frozen = true; this.hint(null);
    g.ui.fade(true, 1.2).then(() => {
      this.st.flags.axeHidden = true; p.showBackAxe(false);
      return g.ui.card('The Axe Under the Floor', 'Scratched on the underside of the hearthstone: a raven. Beside it, an older mark, worn almost flat. Someone had hidden something here before.', 6);
    }).then(() => g.quests.notify('event', 'hidAxe'));
  }
  foundSecret(id) {
    const g = this.g, st = this.st;
    if (st.secrets[id]) return;
    st.secrets[id] = true; delete st.marks[id];
    const n = Object.keys(st.secrets).length;
    g.ui.toast(`Omen found (${n} / ${Object.keys(SECRETS).length}): ${SECRETS[id].name}`); g.audio.play('questDone', { vol: 0.6 });
    if (!st.quests.s_omens) g.quests.start('s_omens');
    g.quests.notify('event', 'omen');
  }
  spawnLamb(follow) {
    const g = this.g;
    if (this.lamb) return;
    const a = g.wildlife.spawn('sheep', POI.lamb.x, POI.lamb.z, {}); a.model.scale.setScalar(0.55);
    a.follow = follow;
    a.ai = (an, dt) => {
      const p = g.player.pos, d = dist(an.pos, p.x, p.z);
      let want = 0;
      if (an.follow && d > 1.9) { want = Math.min(4.6, 1 + d * 1.3); an.yaw = dampAngle(an.yaw, Math.atan2(p.x - an.pos.x, p.z - an.pos.z), 7, dt); }
      an.speed = damp(an.speed, want, 6, dt);
      if (an.speed > 0.05) { an.pos.x += Math.sin(an.yaw) * an.speed * dt; an.pos.z += Math.cos(an.yaw) * an.speed * dt; g.world.resolve(an.pos, 0.25); }
    };
    this.lamb = a;
    g.world.addInteractable({ id: 'lamb', pos: () => a.pos, r: 2.4, priority: 2, label: 'Coax the lamb out', enabled: () => g.quests.at('q_wings', 'fetch'),
      use: () => { a.follow = true; g.player.h.play('pickup', 0.6); g.audio.play('bird'); delete this.st.marks.lamb; g.quests.notify('event', 'lambFound'); } });
    if (follow) a.pos.set(g.player.pos.x + 1.2, a.pos.y, g.player.pos.z + 1);
  }
  penLamb() { if (this.lamb) { this.lamb.ai = null; this.lamb.home = { x: POI.pen.x, z: POI.pen.z, r: 2.4 }; this.lamb.pos.set(POI.pen.x + 1, heightAt(POI.pen.x, POI.pen.z), POI.pen.z + 1); this.lamb = null; } }

  playEnding() {
    const g = this.g, A = this.act;
    if (this.ending) return;
    this.ending = true; this.hint(null); g.player.frozen = true; g.ravens.exitEye();
    g.ui.fade(true, 2.6)
      .then(() => g.ui.card('', 'Ten winters passed.', 3.6))
      .then(() => g.ui.card('', g.fmt('The boy who came out of the snow grew tall. {w} and {b} grew with him, and were never far from his shoulder.'), 6))
      .then(() => g.ui.card('End of Act One', 'Blood of the North', 4.5))
      .then(() => { this.st.stage = 'act1done'; g.autosave(); A.showChapterEnd(); });
  }

  // =====================================================================================
  // Quest step handlers
  // =====================================================================================
  steps = {
    'q_hearth.wake'() {
      const g = this.g, p = g.player;
      this.season(false); this.posts(); this.placeChicks(false);
      g.sky.time = 10; p.frozen = true; p.teleport(...POST.seat, Math.atan2(FIRE.x - POST.seat[0], FIRE.z - POST.seat[1])); p.loopOverride = 'warm';
      g.ui.card("A Stranger's Hearth", 'Chapter Three', 3.6).then(() => { p.frozen = false; p.loopOverride = null; g.quests.notify('event', 'woke3'); });
    },
    'q_hearth.signe'(r) { this.season(false); if (r) { this.posts(); this.placeChicks(false); } this.g.ui.hint('Walk up to someone and press {interact} to talk.'); },
    'q_hearth.freydis'(r) { this.season(false); if (r) { this.posts(); this.placeChicks(false); } this.hint(null); },
    'q_hearth.nest'(r) {
      const g = this.g, f = this.npc('freydis');
      this.season(false); this.placeChicks(false); if (r) this.posts();
      this.atNest = false;
      f.lead(NEST_PATH, { speed: 3.1, wait: 11, resume: 5, bark: ['Come ON, snow boy!', 'This way! Hurry, they are cold!'], onArrive: (o) => { this.atNest = true; o.face(POI.nest.x, POI.nest.z); } });
      g.ui.hint('Follow Freydis. She will wait if you fall behind.');
    },
    'q_hearth.name'(r) { // loaded between arriving and naming: replay the moment
      this.season(false); this.placeChicks(false);
      if (r) { this.posts(); this.npc('freydis').teleport(129.6, -148.4, 2); this.g.player.teleport(131.2, -147.2, -2); this.atNest = true; this.st.quests.q_hearth.step--; }
    },
    'q_hearth.grubs'(r) { this.season(false); this.placeChicks(false); if (r) { this.posts(); this.npc('freydis').teleport(129.6, -148.4, 2); } this.npc('freydis').stop().face(POI.nest.x, POI.nest.z); this.hint('grubs'); },
    'q_hearth.feed'(r) { this.season(false); this.placeChicks(false); if (r) { this.posts(); this.npc('freydis').teleport(129.6, -148.4, 2); } this.g.ui.hint('Press {interact} at the nest.'); },
    'q_hearth.bjorn'(r) {
      const f = this.npc('freydis');
      this.season(false); this.placeChicks(true); this.hint('explore');
      if (r) this.posts(); else f.goPath([[137, -146], [147, -139], [157, -136.5], [164.2, -139], POST.freydis], { speed: 2.6 }); // round the east end of the woodpile
    },
    'q_hearth.chop'(r) { this.season(false); this.placeChicks(true); if (r) this.posts(); const b = this.npc('bjorn'); b.setLoop(null); b.h.hold('R', null); b.face(POI.farmChop.x, POI.farmChop.z); this.hint('farmchop'); },
    'q_hearth.bjorn2'(r) { this.season(false); this.placeChicks(true); if (r) this.posts(); const b = this.npc('bjorn'); b.setLoop(null); b.h.hold('R', null); b.faceEntity(this.g.player); this.hint(null); },
    'q_hearth.hide'(r) { this.season(false); this.placeChicks(true); if (r) this.posts(); this.hint('hideaxe'); },
    'q_wings.wake'() {
      const g = this.g, p = g.player;
      this.season(true); this.posts(); this.st.flags.axeHidden = true;
      g.sky.time = 9.6; p.frozen = true; p.teleport(149.5, -139.2, 1.9);
      this.npc('freydis').teleport(153.5, -150.6, 0.4);
      g.ui.card('Spring', g.fmt('{w} and {b} grew faster than he did.'), 4.2).then(() => g.ui.fade(false, 1.6)).then(() => { p.frozen = false; g.quests.notify('event', 'woke4'); });
    },
    'q_wings.freydis'(r) { this.season(true); if (r) { this.posts(); this.npc('freydis').teleport(153.5, -150.6, 0.4); } this.npc('freydis').say(this.g.fmt('{n}! {n}, come quick!'), 3); this.hint(null); },
    'q_wings.eye'(r) { this.season(true); if (r) { this.posts(); this.npc('freydis').teleport(153.5, -150.6, 0.4); } this.spawnLamb(false); this.hint('raven'); },
    'q_wings.spot'(r) { this.season(true); if (r) { this.posts(); this.npc('freydis').teleport(153.5, -150.6, 0.4); } this.spawnLamb(false); this.g.ui.hint('The lamb went north-west, past the fallen pine. Fly over the trees and press {interact} when the prompt appears.'); },
    'q_wings.fetch'(r) { this.season(true); if (r) { this.posts(); this.npc('freydis').teleport(153.5, -150.6, 0.4); this.st.marks.lamb = { x: POI.lamb.x, z: POI.lamb.z, label: 'Lost lamb' }; } this.spawnLamb(false); this.hint('ravenfree'); },
    'q_wings.home'(r) { this.season(true); if (r) { this.posts(); this.npc('freydis').teleport(153.5, -150.6, 0.4); } this.spawnLamb(true); this.lamb.follow = true; this.hint(null); },
    'q_wings.dusk'(r) {
      const g = this.g, b = this.npc('bjorn');
      this.season(true); if (r) { this.posts(); this.npc('freydis').teleport(153.5, -150.6, 0.4); }
      g.sky.time = Math.max(g.sky.time, 16.35); this.act.wTarget = { snow: 0, fog: 0.01, overcast: 0.25, wind: 0.8 };
      b.h.hold('R', null); b.teleport(147.8, -138.7, Math.atan2(FIRE.x - 147.8, FIRE.z + 138.7)).setLoop('warm');
      this.npc('freydis').goTo(145.6, -139.4, { speed: 2.6, onArrive: (o) => o.face(FIRE.x, FIRE.z) });
      this.hint(null);
    },
  };

  // =====================================================================================
  // Per-frame
  // =====================================================================================
  update(dt) {
    if (!this.built) return;
    const g = this.g, p = g.player, q = g.quests;
    this.t += dt;
    if (g.mode === 'play') g.sky.time = Math.min(q.at('q_wings', 'dusk') ? 16.9 : 15.6, g.sky.time + dt / 220);
    this.st.time = g.sky.time;
    p.speedMul = 1; p.warmth = 100; p.hunger = 100;
    const f = this.npc('freydis');
    if (q.at('q_hearth', 'nest') && this.atNest && f.dist(p) < 6 && g.mode === 'play') {
      q.notify('reach', 'nest');
      g.dialogue.start('nest', { npc: f, onEnd: () => q.notify('event', 'namedRavens') });
    } else if (q.at('q_hearth', 'name') && g.mode === 'play' && !g.dialogue.active) { // safety net after a load
      this.st.quests.q_hearth.step--; this.atNest = true;
    }
    if (this.lamb && !this.lamb.follow && this.t % 5 < dt && dist(p.pos, this.lamb.pos.x, this.lamb.pos.z) < 70) g.audio.play('bird', { vol: 0.8 });
    if (this.chicks.visible && this.t % 4 < dt && dist(p.pos, this.chicks.position.x, this.chicks.position.z) < 12) g.audio.play('bird', { vol: 0.5 });
  }
}
