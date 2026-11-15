// Act I, Chapter 3 — "A Stranger's Hearth". Bjornstead, half a day's walk south along the coast (the owner's story,
// Chapters 4 to 6): a new family, two raven chicks, an axe under the hearthstone, then spring, the white raven's first
// flight and the lightning on the old birch. Ends Act I with the ten-year jump. It plays in the same village as Act II,
// ten years younger: no wall, no watchtower, the birch whole until the lightning (world/mainland.js, ACT1_SPOTS).
import * as THREE from 'three';
import { EIRIK_SCARRED } from '../entities/player.js';
import { ACT1_SPOTS } from '../world/mainland.js';
import { PLACES } from '../world/layout.js';
import { shared, M, at, cone, sphere, tint, merge } from '../world/geo.js';
import { CAST, RAIDER_LOOKS, HINTS } from '../data/act1.js';
import { SECRETS } from '../data/act1_ch3.js';
import { VILLAGERS } from '../data/act2.js'; // after Act I's chapter casts: Act II's are built from them
import { Woodcutting } from '../systems/activities.js';
import { damp, dampAngle } from '../core/util.js';

const WINTER = { snow: 0.2, fog: 0.04, overcast: 0.5, wind: 1 }, SPRING = { snow: 0, fog: 0, overcast: 0.1, wind: 1 };
const dist = (p, x, z) => Math.hypot(p.x - x, p.z - z);
const pt = ([x, z]) => ({ x, z });
/** A few of the twenty houses at their work (game): silent, so the village is not empty. */
const FOLK = [['v0', 'smithy', 2.4, 1.2, 'hammer'], ['v1', 'well', -1.6, 1.4, 'talk'], ['v3', 'well', 1.4, 2.2, 'talk'], ['v2', 'strand', -6, -4, 'sit']];

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
  /** The village and where things happen in it (world/mainland.js). */
  get V() { return this.g.world.main.bjornstead; }
  get S() { if (!this._S) { const V = this.V; this._S = ACT1_SPOTS((dx, dz) => [V.s.x + dx, V.s.z + dz], V.houses.barn.door); this._S.door = [V.hallDoor.x, V.hallDoor.z]; } return this._S; }
  /** Objective markers: the places of this chapter. */
  dyn(name) {
    const S = this.S, k = { ch3nest: S.nest, ch3chop: S.chop, ch3door: S.door, ch3birch: S.birch, ch3lamb: this.lamb ? [this.lamb.pos.x, this.lamb.pos.z] : S.lamb }[name];
    return k ? { x: k[0], z: k[1], y: this.g.world.groundAt(k[0], k[1]) + 1.6 } : null;
  }
  /** The birch on the hill: whole until the lightning, split after; the yew grows up through it only years later. */
  birch(split) { const st = this.V.stages; st.birchWhole.set(!split); st.birchSplit.set(split); st.yew.set(false); }
  get st() { return this.g.state; }
  npc(id) { return this.g.npcs.get(id); }
  hint(k) { this.g.ui.hint(k ? this.g.fmt(HINTS[k]) : null); }

  // =====================================================================================
  // Set dressing shared by every step (idempotent)
  // =====================================================================================
  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g, A = this.act, w = g.world, st = this.st, S = this.S, V = this.V;
    st.stage = 'ch3';
    V.stages.act1.set(true); // the raven pines, the nest and the omens; no wall, no tower: those come in Act II
    for (const n of g.npcs.values()) { n.visible = false; n.talk = null; }
    A.cookFire.on = A.greenFire.on = A.forgeFire.on = A.campFire.on = false;
    A.chimneys.forEach((c) => { c.on = false; });
    A.glowTarget = 0; g.sky.fireGlow = 0; A.tracks.visible = false; A.clearPickups(); g.wildlife.clear('hare'); g.wildlife.clear('deer');
    this.fire = g.fx.addFire(S.fire[0], w.groundAt(...S.fire) + 0.15, S.fire[1], 0.55);
    this.forge = g.fx.addFire(V.forge.x, V.forge.y, V.forge.z, 0.35, { smoke: true });
    g.player.equip('none');

    for (const id of ['signe', 'bjorn', 'freydis']) {
      const n = g.addNPC(id, CAST[id]);
      n.talk = () => this.talkTo(id);
    }
    this.posts();
    for (const [dx, dz] of [[-3, 2], [2, -1], [0, 3], [4, 3]]) g.wildlife.spawn('sheep', S.pen[0] + dx, S.pen[1] + dz, { home: { x: S.pen[0], z: S.pen[1], r: 9 } });
    FOLK.forEach(([id, at0, dx, dz, loop], i) => { // a few of the village at their work (game)
      const [name, look] = VILLAGERS[+id.slice(1)], [px, pz] = [V.s.x + PLACES.bjornstead[at0][0] + dx, V.s.z + PLACES.bjornstead[at0][1] + dz];
      const n = g.addNPC('a1' + id, { name, look }); n.teleport(px, pz, i * 1.7).setLoop(loop); if (loop === 'hammer') n.h.hold('R', 'hammer');
    });

    // the chicks: in the fallen nest until they are fed, then in a basket by the fire
    this.chicks = new THREE.Group(); this.chicks.add(chick(0xe9e6df, 0xcaa79c), chick(0x17171c, 0x2a2a30));
    this.chicks.children[0].position.set(-0.09, 0, 0); this.chicks.children[1].position.set(0.1, 0, 0.03); this.chicks.children[1].rotation.y = 0.8;
    g.scene.add(this.chicks);

    // interactables
    S.logs.forEach(([x, z], i) => w.addInteractable({ id: 'grub' + i, x, z, r: 2, priority: 1, label: 'Turn over the log', enabled: () => g.quests.at('q_hearth', 'grubs') && !this['log' + i],
      use: () => { this['log' + i] = true; g.player.h.play('pickup', 0.6); g.audio.play('thud', { vol: 0.4 }); g.ui.toast('A fat white grub'); g.quests.notify('event', 'grub'); } }));
    w.addInteractable({ id: 'nestfeed', x: S.nest[0], z: S.nest[1], r: 2.4, priority: 1, label: 'Feed the chicks', enabled: () => g.quests.at('q_hearth', 'feed'), use: () => this.feedChicks() });
    w.addInteractable({ id: 'farmchop', x: S.chop[0], z: S.chop[1], r: 2.3, label: 'Split logs', enabled: () => g.quests.at('q_hearth', 'chop'), use: () => this.chop() });
    w.addInteractable({ id: 'hearth', x: S.door[0], z: S.door[1], r: 2.6, priority: 3, label: 'Hide the axe under the hearthstone', enabled: () => g.quests.at('q_hearth', 'hide'), use: () => this.hideAxe() });
    const secret = (id, poi, r, tree) => w.addInteractable({ id: 'sec_' + id, x: S[poi][0], z: S[poi][1], r, label: 'Look closer', enabled: () => st.stage === 'ch3' && !st.secrets[id] && g.mode === 'play',
      use: () => g.dialogue.start(tree, { onEnd: () => this.foundSecret(id) }) });
    secret('barrow', 'barrow', 2.8, 'sec_barrow'); secret('skyiron', 'skyIron', 2.2, 'sec_skyiron');
    secret('twinaxe', 'axeStone', 3, 'sec_twinaxe'); secret('yew', 'birch', 3.2, 'sec_yew');
    { const it = w.interactables.find((o) => o.id === 'sec_yew'), en = it.enabled; it.enabled = () => !!st.flags.lightning && en(); } // the birch is only split once the lightning has found it
    w.addInteractable({ id: 'birchclimb', x: S.birch[0], z: S.birch[1], r: 3.4, priority: 3, label: 'Climb to the ravens', enabled: () => g.quests.at('q_wings', 'climb') && g.mode === 'play', use: () => this.lightning() });
    w.addInteractable({ id: 'tarn', x: S.tarn[0], z: S.tarn[1], r: 6.5, label: 'Look into the ice', enabled: () => st.stage === 'ch3' && !st.secrets.icespear, use: () => g.dialogue.start('tarn_ground') });

    // what the white raven can find from the air
    const R = g.ravens, at2 = (poi) => () => pt(S[poi]);
    R.addMarkable({ id: 'icespear', pos: at2('tarn'), r: 30, label: 'something under the ice', enabled: () => !st.secrets.icespear, onMark: () => g.dialogue.start('sec_icespear', { onEnd: () => this.foundSecret('icespear') }) });
    for (const [id, poi, label, what] of [['barrow', 'barrow', 'a mound ringed with stones', 'Stone-ringed mound'], ['twinaxe', 'axeStone', 'a standing stone', 'Standing stone'], ['yew', 'birch', 'a split tree, still green', 'Split yew']])
      R.addMarkable({ id: 'm_' + id, pos: at2(poi), r: 34, label, enabled: () => !st.secrets[id] && !st.marks[id] && (id !== 'yew' || !!st.flags.lightning), onMark: () => { st.marks[id] = { x: S[poi][0], z: S[poi][1], label: what }; g.ui.toast(`Marked on your map: ${what}`); } });
    R.addMarkable({ id: 'hunters', pos: at2('hunters'), r: 75, label: 'smoke on the west bank', enabled: () => !!st.flags.spring && !st.flags.sawHunters,
      onMark: () => { st.flags.sawHunters = true; g.ui.subtitle('Eirik', 'Men with the wolf on their shields. Still looking. But on the wrong side of the river.', 6); } });
    R.addMarkable({ id: 'lamb', pos: () => (this.lamb ? this.lamb.pos : pt(S.lamb)), r: 42, label: 'the lost lamb', enabled: () => g.quests.at('q_wings', 'spot'),
      onMark: () => { st.marks.lamb = { x: S.lamb[0], z: S.lamb[1], label: 'Lost lamb' }; g.ui.subtitle('Eirik', 'There. Past the barley, in the long grass.', 4); g.quests.notify('event', 'lambSpotted'); } });
    g.events.on('ravenEye', (on) => { if (on) g.quests.notify('event', 'ravenEye'); });
  }

  /** Winter while he recovers; spring once the ravens have fledged. */
  season(spring) {
    const g = this.g, A = this.act;
    this.build();
    A.snowTarget = spring ? 0 : 1; shared.uSnow.value = A.snowTarget;
    this.birch(!!this.st.flags.lightning);
    if (this.st.flags.lightning && !g.player.adult && !(g.player.look && g.player.look.scar)) g.player.setLook(EIRIK_SCARRED, false); // the scar is his from the lightning on
    A.wTarget = { ...(spring ? SPRING : WINTER) }; Object.assign(g.sky.weather, A.wTarget);
    g.audio.setMusic('day');
    this.chicks.visible = !spring;
    if (spring) {
      this.st.flags.spring = true; g.ravens.setMode('follow'); g.player.showBackAxe(false);
      if (!this.hunters) { // a tracker camp across the river: seen only from the air
        this.hunters = true;
        const [hx, hz] = this.S.hunters;
        [[hx - 1.4, hz + 0.6, 1.2], [hx + 1.5, hz - 0.4, -1.7]].forEach(([x, z, yaw], i) => {
          const n = g.addNPC('hunter' + i, { name: 'Tracker', look: RAIDER_LOOKS[i] }); n.teleport(x, z, yaw).setLoop('warm'); n.h.hold('L', 'shield');
        });
        g.fx.addFire(hx, g.world.groundAt(hx, hz) + 0.15, hz, 0.7);
      }
    } else g.player.showBackAxe(!this.st.flags.axeHidden && g.inventory.has('father_axe'));
  }
  placeChicks(atFire) {
    const [x, z] = atFire ? this.S.basket : this.S.nest;
    this.chicks.position.set(x, this.g.world.groundAt(x, z) + (atFire ? 0.5 : 0.16), z);
  }
  /** Everyone at their winter posts. */
  posts() {
    const S = this.S, F = S.fire;
    this.npc('signe').teleport(...S.signe, Math.atan2(F[0] - S.signe[0], F[1] - S.signe[1])).setLoop('cook');
    const b = this.npc('bjorn'); b.teleport(...S.bjorn, Math.atan2(S.chop[0] - S.bjorn[0], S.chop[1] - S.bjorn[1])).setLoop('hammer'); b.h.hold('R', 'hammer');
    this.npc('freydis').teleport(...S.freydis, -2.6);
  }
  /** Freydis waits by the pasture while the lamb is missing. */
  lambPost() { this.npc('freydis').teleport(...this.S.lambPost, -1.2); }
  /** Eirik on the bench by the fire. */
  seat() { const S = this.S, p = this.g.player; p.teleport(...S.seat, Math.atan2(S.fire[0] - S.seat[0], S.fire[1] - S.seat[1])); }

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
  /** The lightning (the owner's story, Act I, Chapter 6): he climbs the old birch in the storm to save his ravens. */
  lightning() {
    const g = this.g, p = g.player, [bx, bz] = this.S.birch, y = g.world.groundAt(bx, bz);
    p.frozen = true; this.hint(null); p.h.play('pickup', 0.9);
    g.ui.subtitle('', g.fmt('The bark was slick with rain. He reached the branch, and called, and {w} hopped toward his hand.'), 3.4);
    g.after(3.5, () => {
      for (let i = 0; i < 3; i++) g.after(i * 0.09, () => g.fx.bolt(bx, y + (i === 0 ? 7 : 0), bz, 46));
      g.audio.play('thunder'); p.cam.shake = 1.2; g.hitStop = 0.25;
      g.after(0.2, () => g.ui.fade(true, 0.35)
        .then(() => g.ui.card('The world turned white.', 'There was no sound at first. Then a sound bigger than the sea. Then nothing.', 5.5))
        .then(() => {
          this.st.flags.lightning = true; this.season(true); this.posts(); g.sky.time = 8.6; g.ravens.setMode('follow');
          this.seat(); p.loopOverride = 'warm';
          return g.ui.card('Three days of fever', 'Across his left eye, from brow to cheekbone, ran a deep forked burn. Signe prayed to Thor, then to Frigg, then to every god she could name, then shouted at all of them.', 7);
        })
        .then(() => g.ui.fade(false, 1.8))
        .then(() => { p.loopOverride = null; g.dialogue.start('lightning_wake', { npc: this.npc('signe'), onEnd: () => { p.frozen = false; g.quests.notify('event', 'lightning'); g.ui.hint('The lightning left him three things besides the scar: he hears his ravens, he can see through the white one\'s eyes ({raven}), and, grown, the Stormguard.'); } }); }));
    });
  }
  feedChicks() {
    const g = this.g, p = g.player;
    p.h.play('pickup', 0.7); g.audio.play('bird'); g.after(0.3, () => g.audio.play('bird'));
    g.ui.subtitle('Freydis', g.fmt('{w} ate from your HAND. {b} tried to eat your hand.'), 4.5);
    g.after(1.2, () => { this.placeChicks(true); g.quests.notify('event', 'fedChicks'); });
  }
  chop() {
    const g = this.g, q = this.st.quests.q_hearth;
    new Woodcutting(g, { x: this.S.chop[0], z: this.S.chop[1], count: 4 - (q?.count || 0), onSplit: () => g.quests.notify('activity', 'chop') }).start();
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
    const a = g.wildlife.spawn('sheep', ...this.S.lamb, {}); a.model.scale.setScalar(0.55);
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
  penLamb() { const [px, pz] = this.S.pen; if (this.lamb) { this.lamb.ai = null; this.lamb.home = { x: px, z: pz, r: 9 }; this.lamb.pos.set(px + 1, this.g.world.groundAt(px, pz), pz + 1); this.lamb = null; } }

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
      g.sky.time = 10; p.frozen = true; this.seat(); p.loopOverride = 'warm';
      g.ui.card("A Stranger's Hearth", 'Chapter Three', 3.6).then(() => { p.frozen = false; p.loopOverride = null; g.quests.notify('event', 'woke3'); });
    },
    'q_hearth.signe'(r) { this.season(false); if (r) { this.posts(); this.placeChicks(false); } this.g.ui.hint('Walk up to someone and press {interact} to talk.'); },
    'q_hearth.freydis'(r) { this.season(false); if (r) { this.posts(); this.placeChicks(false); } this.hint(null); },
    'q_hearth.nest'(r) {
      const g = this.g, f = this.npc('freydis');
      this.season(false); this.placeChicks(false); if (r) this.posts();
      this.atNest = false;
      f.lead(this.S.nestPath, { speed: 3.6, wait: 11, resume: 5, bark: ['Come ON, snow boy!', 'This way! Hurry, they are cold!'], onArrive: (o) => { this.atNest = true; o.face(...this.S.nest); } });
      g.ui.hint('Follow Freydis. She will wait if you fall behind.');
    },
    'q_hearth.name'(r) { // loaded between arriving and naming: replay the moment
      this.season(false); this.placeChicks(false);
      if (r) { this.posts(); this.npc('freydis').teleport(...this.S.nestPath[this.S.nestPath.length - 1], 2); this.g.player.teleport(this.S.nest[0] + 3, this.S.nest[1] + 2, -2); this.atNest = true; this.st.quests.q_hearth.step--; }
    },
    'q_hearth.grubs'(r) { this.season(false); this.placeChicks(false); if (r) { this.posts(); this.npc('freydis').teleport(...this.S.nestPath[this.S.nestPath.length - 1], 2); } this.npc('freydis').stop().face(...this.S.nest); this.hint('grubs'); },
    'q_hearth.feed'(r) { this.season(false); this.placeChicks(false); if (r) { this.posts(); this.npc('freydis').teleport(...this.S.nestPath[this.S.nestPath.length - 1], 2); } this.g.ui.hint('Press {interact} at the nest.'); },
    'q_hearth.bjorn'(r) {
      const f = this.npc('freydis');
      this.season(false); this.placeChicks(true); this.hint('explore');
      if (r) this.posts(); else f.goPath([...this.S.nestPath].reverse().slice(1).concat([this.S.freydis]), { speed: 2.6 }); // home the way she came
    },
    'q_hearth.chop'(r) { this.season(false); this.placeChicks(true); if (r) this.posts(); const b = this.npc('bjorn'); b.setLoop(null); b.h.hold('R', null); b.face(...this.S.chop); this.hint('farmchop'); },
    'q_hearth.bjorn2'(r) { this.season(false); this.placeChicks(true); if (r) this.posts(); const b = this.npc('bjorn'); b.setLoop(null); b.h.hold('R', null); b.faceEntity(this.g.player); this.hint(null); },
    'q_hearth.hide'(r) { this.season(false); this.placeChicks(true); if (r) this.posts(); this.hint('hideaxe'); },
    'q_wings.wake'() {
      const g = this.g, p = g.player;
      this.season(true); this.posts(); this.st.flags.axeHidden = true;
      g.sky.time = 9.6; p.frozen = true; p.teleport(...this.S.wake, 1.9);
      this.lambPost();
      g.ui.card('Spring', g.fmt('{w} and {b} grew faster than he did.'), 4.2).then(() => g.ui.fade(false, 1.6)).then(() => { p.frozen = false; g.quests.notify('event', 'woke4'); });
    },
    'q_wings.storm'(r) { // the spring after his tenth birthday, a storm comes off the sea
      const g = this.g; this.season(true); if (r) this.posts();
      this.act.wTarget = { snow: 0, fog: 0.03, overcast: 1, wind: 3.4 }; Object.assign(g.sky.weather, this.act.wTarget); g.sky.time = 15.2; g.ravens.setMode('hidden');
      g.audio.play('thunder', { vol: 0.5 });
      g.ui.subtitle('', g.fmt('The sky went green-black. In the crown of the old birch, {w} and {b} were clinging to a branch that was cracking at the trunk.'), 6);
      g.ui.hint('He should have run home. Run up to the old birch on the hill behind the village.');
    },
    'q_wings.climb'(r) { const g = this.g; this.season(true); if (r) this.posts(); this.act.wTarget = { snow: 0, fog: 0.03, overcast: 1, wind: 3.4 }; Object.assign(g.sky.weather, this.act.wTarget); g.sky.time = 15.2; g.ravens.setMode('hidden'); g.ui.hint('Press {interact} at the birch to climb.'); },
    'q_wings.freydis'(r) { this.season(true); if (r) { this.posts(); this.lambPost(); } this.npc('freydis').say(this.g.fmt('{n}! {n}, come quick!'), 3); this.hint(null); },
    'q_wings.eye'(r) { this.season(true); if (r) { this.posts(); this.lambPost(); } this.spawnLamb(false); this.hint('raven'); },
    'q_wings.spot'(r) { this.season(true); if (r) { this.posts(); this.lambPost(); } this.spawnLamb(false); this.g.ui.hint('The lamb went west, out past the barley. Fly over the field and press {interact} when the prompt appears.'); },
    'q_wings.fetch'(r) { this.season(true); if (r) { this.posts(); this.lambPost(); this.st.marks.lamb = { x: this.S.lamb[0], z: this.S.lamb[1], label: 'Lost lamb' }; } this.spawnLamb(false); this.hint('ravenfree'); },
    'q_wings.home'(r) { this.season(true); if (r) { this.posts(); this.lambPost(); } this.spawnLamb(true); this.lamb.follow = true; this.hint(null); },
    'q_wings.dusk'(r) {
      const g = this.g, b = this.npc('bjorn');
      this.season(true); if (r) { this.posts(); this.lambPost(); }
      g.sky.time = Math.max(g.sky.time, 16.35); this.act.wTarget = { snow: 0, fog: 0.01, overcast: 0.25, wind: 0.8 };
      const F = this.S.fire, bp = [F[0] + 1.8, F[1] - 1.4];
      b.h.hold('R', null); b.teleport(...bp, Math.atan2(F[0] - bp[0], F[1] - bp[1])).setLoop('warm');
      this.npc('freydis').goTo(F[0] - 1.9, F[1] - 1.2, { speed: 2.6, onArrive: (o) => o.face(...F) });
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
    const [bx, bz] = this.S.birch;
    if (q.at('q_wings', 'storm') && dist(p.pos, bx, bz) < 9) q.notify('reach', 'birch');
    if ((q.at('q_wings', 'storm') || q.at('q_wings', 'climb')) && g.mode === 'play' && this.t % 5.5 < dt) { g.fx.bolt(bx + (Math.random() - 0.5) * 120, g.world.groundAt(bx, bz) + 10, bz + (Math.random() - 0.5) * 120, 60); g.after(0.5 + Math.random(), () => g.audio.play('thunder', { vol: 0.4 })); }
    if (this.lamb && !this.lamb.follow && this.t % 5 < dt && dist(p.pos, this.lamb.pos.x, this.lamb.pos.z) < 70) g.audio.play('bird', { vol: 0.8 });
    if (this.chicks.visible && this.t % 4 < dt && dist(p.pos, this.chicks.position.x, this.chicks.position.z) < 12) g.audio.play('bird', { vol: 0.5 });
  }
}
