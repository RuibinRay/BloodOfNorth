// Act I, Chapter 2 — "The Long White". Alone in the winter forest: shelter, hunger, a deer and a wolf;
// then Håkon's trackers, the river ice, and a farmer who finds a boy in the snow.
// Like Chapter 1, every step handler rebuilds its scene from scratch so it serves play, loading and tests.
import * as THREE from 'three';
import { heightAt, riverX, forestDensity } from '../world/terrain.js';
import { shared, M, at, box, cyl, cone, tint, merge } from '../world/geo.js';
import { CAST, RAIDER_LOOKS, HINTS } from '../data/act1.js';
import { CAMP, LEANTO, BANK_W, BANK_E, COLLAPSE } from '../data/act1_ch2.js';
import { clamp, damp, dampAngle, lerp } from '../core/util.js';

const SAPLINGS = [[-9, -7], [-12, 2.5], [7.5, -9], [10.5, 5], [-4, -13.5]];
const TRACKS2 = [[-125, -99], [-134, -110], [-144, -121]];
const W_DAY = { snow: 0.25, fog: 0.05, overcast: 0.55, wind: 1.2 };
const W_HUNT = { snow: 0.6, fog: 0.13, overcast: 0.85, wind: 1.8 };
const PATROLS = [
  { at: [-88, -56], route: [[-100, -72], [-113, -88], [-122, -97], [-104, -112], [-84, -122]], pause: 2.5 },
  { at: [-66, -98], route: [[-66, -98], [-30, -118], [-46, -146], [-18, -150]], pause: 3 },
  { at: [22, -104], route: [[22, -104], [47, -117], [34, -144]], pause: 3.2 },
];
const dist = (p, x, z) => Math.hypot(p.x - x, p.z - z);

export class Chapter2 {
  constructor(game, act) {
    this.g = game; this.act = act; this.built = false; this.saplings = []; this.wolf = null; this.trackers = [];
    this.strain = 0; this.iceShown = false; this.t = 0; this.ending = false; this.dimK = 0;
  }
  get st() { return this.g.state; }
  hint(k) { this.g.ui.hint(k ? HINTS[k] : null); }
  /** Crouching among trees, a boy is very hard to see. */
  hideFactor(p) { return p.crouch && forestDensity(p.pos.x, p.pos.z) > 0.22 ? 0.55 : 1; }

  // =====================================================================================
  // Set dressing shared by every step (idempotent)
  // =====================================================================================
  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g, A = this.act, w = g.world;
    this.st.stage = 'ch2';
    for (const n of g.npcs.values()) { n.visible = false; n.talk = null; }
    A.cookFire.on = A.greenFire.on = A.forgeFire.on = false;
    A.chimneys.forEach((c, i) => { c.on = i < 3; c.rate = 3; }); // the village still smoulders
    A.snowTarget = 1; shared.uSnow.value = 1; A.glowTarget = 0; g.sky.fireGlow = 0;
    A.wTarget = { ...W_DAY }; Object.assign(g.sky.weather, W_DAY);
    A.tracks.visible = false; A.clearPickups(); g.wildlife.clear('hare'); g.wildlife.clear('deer');
    A.campFire.on = true; A.campFire.size = 0.45;
    g.player.showBackAxe(true);
    if (!g.inventory.has('father_axe')) g.inventory.add('father_axe', 1, true);
    if (!g.inventory.has('bow')) g.inventory.add('bow', 1, true);
    if (g.inventory.count('arrow') < 8) g.inventory.add('arrow', 8 - g.inventory.count('arrow'), true);
    g.audio.setMusic('sorrow');

    SAPLINGS.forEach(([dx, dz], i) => {
      const x = CAMP.x + dx, z = CAMP.z + dz;
      const m = new THREE.Mesh(merge([
        tint(at(cyl(0.04, 0.07, 1.0, 5), 0, 0.5, 0), 0x4a382a, 0.2, 1), tint(at(cone(0.78, 1.3, 7), 0, 1.25, 0), 0x1f3a27, 0.3, 2),
        tint(at(cone(0.56, 1.1, 7), 0, 1.95, 0, 0, 0.6, 0), 0x27432c, 0.3, 3), tint(at(cone(0.32, 0.9, 7), 0, 2.55, 0), 0x1f3a27, 0.3, 4),
      ]), M.vc);
      m.position.set(x, heightAt(x, z) - 0.05, z); m.castShadow = true; g.scene.add(m);
      this.saplings.push({ m, cut: false });
      w.addInteractable({ id: 'sap' + i, x, z, r: 2.1, priority: 1, label: 'Cut spruce boughs', enabled: () => g.quests.at('q_white', 'boughs'), use: () => this.cutBough(i) });
    });
    w.addInteractable({ id: 'shelter', x: LEANTO[0], z: LEANTO[1], r: 2.8, priority: 1, label: 'Mend the lean-to', enabled: () => g.quests.at('q_white', 'shelter'), use: () => this.mendShelter() });
    w.addInteractable({ id: 'bedroll', x: LEANTO[0], z: LEANTO[1], r: 2.8, priority: 1, label: 'Sleep', enabled: () => g.quests.at('q_white', 'sleep'), use: () => this.sleep() });
    w.addInteractable({ id: 'cook', x: CAMP.x, z: CAMP.z, r: 2.6, label: 'Cook venison and eat', enabled: () => g.quests.at('q_white', 'cook'), use: () => this.cook() });
    w.addInteractable({ id: 'feedwolf', pos: () => this.wolf.pos, r: 8, label: 'Throw the wolf a share of the meat',
      enabled: () => g.quests.at('q_white', 'wolf') && this.wolf && !this.wolf.dead && !this.wolfResolved && g.inventory.has('venison', 2), use: () => this.feedWolf() });
    this.tracks = w.makeTracks(TRACKS2, 1.2);
    this.tracks.visible = false;
    g.events.on('wound', (kind, a) => { if (kind === 'wolf') a.w.state = 'flee'; });
  }
  enter(thatch = true) { this.build(); if (thatch) this.addThatch(); }

  addThatch() {
    if (this.thatch) return;
    const lx = CAMP.x + 3.4, lz = CAMP.z - 2.2;
    const geo = at(at(tint(box(2.95, 0.24, 2.55), 0x2c4a31, 0.4, 7), 0, 1.0, -0.52, -0.86, 0, 0), lx, heightAt(lx, lz), lz, 0, -1.0, 0);
    this.thatch = new THREE.Mesh(geo, M.vc); this.thatch.castShadow = true;
    this.g.scene.add(this.thatch);
  }

  // =====================================================================================
  // Camp tasks
  // =====================================================================================
  cutBough(i) {
    const g = this.g, p = g.player, s = this.saplings[i];
    if (!s || s.cut || p.frozen) return;
    p.frozen = true; p.faceTarget = s.m.position; p.equip('none'); p.showBackAxe(false); p.h.hold('R', 'father_axe');
    if (!this.st.flags.usedAxe) { this.st.flags.usedAxe = true; g.ui.subtitle('Eirik', 'It is so heavy. Father made it look like nothing.', 4); }
    const swing = (n) => p.h.play(n % 2 ? 'atk1' : 'atk2', 0.72, {
      hitAt: 0.4,
      onHit: () => { g.audio.play('chop'); g.fx.burst('chips', s.m.position.x, s.m.position.y + 0.9, s.m.position.z, 7); g.fx.burst('snowpuff', s.m.position.x, s.m.position.y + 1.8, s.m.position.z, 8); },
      onEnd: () => {
        if (n < 2) return swing(n + 1);
        s.cut = true; g.scene.remove(s.m); g.world.removeInteractable('sap' + i);
        p.h.hold('R', null); p.showBackAxe(true); p.faceTarget = null; p.frozen = false;
        g.inventory.add('bough', 1); g.quests.notify('event', 'bough');
      },
    });
    swing(1);
  }
  mendShelter() {
    const g = this.g, p = g.player;
    p.frozen = true;
    g.ui.fade(true, 0.9).then(() => {
      this.addThatch(); g.inventory.remove('bough', 99, true); g.sky.time = Math.min(16, g.sky.time + 0.8);
      p.teleport(LEANTO[0] - 0.8, LEANTO[1] + 1.8, 0.7);
      return g.ui.fade(false, 0.9);
    }).then(() => { p.frozen = false; g.ui.subtitle('Eirik', 'It will keep the wind off. Now food.', 3.5); g.quests.notify('event', 'shelterDone'); });
  }
  cook() {
    const g = this.g, p = g.player;
    p.frozen = true; p.loopOverride = 'kneel'; p.equip('none');
    g.ui.fade(true, 1.1).then(() => {
      g.inventory.remove('venison', 1, true); p.hunger = 100; p.health = 100; g.sky.time = Math.min(16.4, g.sky.time + 0.7);
      g.audio.play('ignite', { vol: 0.5 });
      return g.ui.fade(false, 1.1);
    }).then(() => {
      p.frozen = false; p.loopOverride = null;
      g.ui.subtitle('', 'Burnt outside, raw in the middle. The best thing he had ever eaten.', 5);
      g.quests.notify('event', 'ate');
    });
  }
  sleep() {
    const g = this.g;
    g.player.frozen = true; this.hint(null);
    g.ui.fade(true, 1.8).then(() => g.quests.notify('event', 'slept'));
  }

  // =====================================================================================
  // The wolf
  // =====================================================================================
  spawnWolf() {
    const g = this.g, p = g.player.pos;
    if (this.wolf && !this.wolf.dead) return;
    const a = g.wildlife.spawn('wolf', p.x + 14, p.z - 9, {});
    a.w = { state: 'approach', t: 0, ang: Math.random() * 6.28, dir: Math.random() < 0.5 ? 1 : -1 };
    a.ai = (an, dt) => this.wolfAI(an, dt);
    this.wolf = a; this.wolfResolved = false;
    g.audio.play('shout', { vol: 0.8 });
    g.ui.subtitle('', 'Something grey moves between the trees.', 3.5);
    this.hint('wolf');
  }
  wolfAI(a, dt) {
    const g = this.g, p = g.player, w = a.w, dx = p.pos.x - a.pos.x, dz = p.pos.z - a.pos.z, d = Math.hypot(dx, dz) || 1;
    let tx = p.pos.x, tz = p.pos.z, want = 0;
    w.t -= dt;
    if (w.state === 'approach') { want = 3.4; if (d < 7.5) { w.state = 'circle'; w.t = 2.5 + Math.random() * 2; } }
    else if (w.state === 'circle') {
      w.ang += dt * 0.55 * w.dir; tx = p.pos.x + Math.cos(w.ang) * 6.5; tz = p.pos.z + Math.sin(w.ang) * 6.5; want = 2.7;
      if (w.t <= 0 && g.mode === 'play') { w.state = 'lunge'; w.t = 1.7; g.ui.alert(); g.audio.play('shout', { vol: 0.9 }); }
    } else if (w.state === 'lunge') {
      want = 8.6;
      if (d < 1.25) {
        w.state = 'retreat'; w.t = 1.6;
        if (p.iframes > 0) g.ui.toast('You roll clear of its jaws');
        else {
          p.health -= 24; p.h.play('stagger', 0.5); p.cam.shake = 0.3; g.audio.play('hurt'); g.fx.burst('blood', p.pos.x, p.pos.y + 0.7, p.pos.z, 5);
          if (p.health <= 4) this.fail('The wolf', 'It wanted the meat. It did not stop at the meat.');
        }
      } else if (w.t <= 0) { w.state = 'circle'; w.t = 3 + Math.random() * 2; w.dir = -w.dir; }
    } else if (w.state === 'retreat') { tx = a.pos.x - dx; tz = a.pos.z - dz; want = 5; if (w.t <= 0) { w.state = 'circle'; w.t = 3 + Math.random() * 3; w.ang = Math.atan2(-dz, -dx); } }
    else if (w.state === 'eat') { want = 0; if (w.t <= 0) { w.state = 'leave'; w.t = 30; } }
    else if (w.state === 'flee' || w.state === 'leave') {
      tx = a.pos.x - dx; tz = a.pos.z - dz; want = w.state === 'flee' ? 9 : 3.6;
      if (w.state === 'flee' && !this.wolfResolved) this.wolfDone('drove');
      if (d > 55 || w.t <= 0) { g.wildlife.remove(a); if (this.wolf === a) this.wolf = null; return; }
    }
    a.speed = damp(a.speed, want, 6, dt);
    if (want > 0) {
      a.yaw = dampAngle(a.yaw, Math.atan2(tx - a.pos.x, tz - a.pos.z), 7, dt);
      a.pos.x += Math.sin(a.yaw) * a.speed * dt; a.pos.z += Math.cos(a.yaw) * a.speed * dt;
      g.world.resolve(a.pos, 0.3);
    } else a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 4, dt);
  }
  feedWolf() {
    const g = this.g, p = g.player, a = this.wolf;
    if (!a || a.dead || this.wolfResolved) return;
    p.faceTarget = a.pos; p.h.play('cast', 0.7, { onEnd: () => { p.faceTarget = null; } });
    g.inventory.remove('venison', 1); g.audio.play('thud', { vol: 0.4 });
    a.w.state = 'eat'; a.w.t = 4;
    this.wolfDone('fed');
  }
  onWolfKilled() { this.wolfDone('killed'); }
  wolfDone(how) {
    const g = this.g;
    if (this.wolfResolved) return;
    this.wolfResolved = true; this.hint(null);
    if (how === 'fed') { g.applyFx({ trait: { compassion: 1, wisdom: 1 }, flag: 'wolfFed' }); g.ui.subtitle('', 'It takes the haunch and looks at him for a long moment. Then it is gone.', 5); }
    else if (how === 'killed') { g.applyFx({ trait: { ferocity: 1 }, flag: 'wolfKilled' }); g.ui.subtitle('Eirik', 'I am sorry. It was you or me.', 4); }
    else { g.applyFx({ trait: { pride: 1 }, flag: 'wolfDriven' }); g.ui.subtitle('', 'It runs, bleeding. It will remember him.', 4); }
    g.after(2.2, () => g.quests.notify('event', 'wolfDone'));
  }

  fail(title, sub) {
    const g = this.g, A = this.act;
    if (A.failing) return;
    A.failing = true; g.player.frozen = true;
    g.ui.fade(true, 1.4).then(() => g.ui.card(title, sub, 3)).then(() => g.reloadCheckpoint());
  }

  // =====================================================================================
  // Trackers and the ice
  // =====================================================================================
  spawnTrackers() {
    if (this.trackers.length) return;
    const g = this.g;
    PATROLS.forEach((d, i) => {
      const n = g.addNPC('tracker' + i, { name: 'Tracker', look: RAIDER_LOOKS[(i + 1) % RAIDER_LOOKS.length], runSpeed: 3.9, walkSpeed: 1.4 });
      n.teleport(d.at[0], d.at[1], 0); n.h.hold('R', i === 1 ? 'spear' : 'axe'); n.h.hold('L', 'torch'); n.loop = 'torch';
      n.torch = g.fx.addFire(d.at[0], 1.5, d.at[1], 0.3, { smoke: false });
      n.makeRaider(d.route, { pause: d.pause });
      this.trackers.push(n); this.act.raiders.push(n);
    });
  }
  breakIce() {
    const g = this.g, p = g.player;
    if (this.breaking) return;
    this.breaking = true; p.frozen = true; p.cam.shake = 0.5;
    g.audio.play('split'); g.audio.play('splash'); g.fx.burst('splash', p.pos.x, p.pos.y + 0.1, p.pos.z, 26);
    g.ui.fade(true, 0.5).then(() => g.ui.card('The ice gives way', 'Black water. Then the bank, somehow.', 2.6)).then(() => {
      p.warmth = Math.max(0, p.warmth - 45); p.teleport(BANK_W[0] + 3, BANK_W[1], Math.PI / 2); p.crouch = true; this.strain = 0;
      return g.ui.fade(false, 0.8);
    }).then(() => { p.frozen = false; this.breaking = false; this.hint('ice'); });
  }

  playEnding() {
    const g = this.g, p = g.player, A = this.act;
    if (this.ending) return;
    this.ending = true; this.hint(null); A.stealthActive = false; g.ui.setDetection(-1); this.iceShown = false;
    p.frozen = true; p.crouch = false; p.equip('none');
    p.h.play('fall', 1.2, { onEnd: () => { p.loopOverride = 'dead'; } });
    g.audio.play('thud', { vol: 0.5 });
    // frame everything around where the body actually lies (he falls backward from where he stood)
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), sx = fz, sz = -fx;
    const bx = p.pos.x - fx * 0.65, bz = p.pos.z - fz * 0.65, by = () => p.pos.y;
    const P = (a, side, h) => { const x = bx + fx * a + sx * side, z = bz + fz * a + sz * side; return [x, g.world.groundAt(x, z) + h, z]; };
    const kneel = P(0.1, 1.25, 0), far = P(5, 22, 0);
    const b = g.addNPC('bjorn', CAST.bjorn);
    b.teleport(far[0], far[2], 0); b.walkSpeed = 1.9; b.h.hold('R', 'woodaxe');
    const settle = (o) => { o.teleport(kneel[0], kneel[2], Math.atan2(bx - kneel[0], bz - kneel[2])); o.setLoop('kneel'); };
    g.ui.fade(true, 2.2).then(() => g.ui.card('', 'He did not remember falling.', 3.2)).then(() => {
      g.ui.dim(0); g.sky.time = 7.9; A.wTarget = { snow: 0.3, fog: 0.05, overcast: 0.4, wind: 0.8 };
      g.ui.fade(false, 2);
      g.cine.play([
        { dur: 8, from: P(-1.5, -8, 3.2), to: P(-1, -6.5, 2.6), look: () => [bx, by() + 0.3, bz], fov: 42, onStart: () => b.goTo(kneel[0], kneel[2], { onArrive: settle }) },
        { dur: 6, from: P(-0.9, -2.7, 0.95), to: P(-0.6, -2.4, 1.0), look: () => [b.pos.x, b.pos.y + 1.0, b.pos.z], fov: 38,
          sub: ['Bjorn', 'Signe! Signe, over here. A boy. He is breathing.', 5], onStart: () => settle(b) },
        { dur: 5.5, from: P(0.3, 3.2, 2.0), to: P(0.2, 2.9, 1.9), look: () => [bx, by() + 0.3, bz], fov: 34,
          sub: ['Signe', 'Then carry him, you great ox, before the cold finishes its work.', 4.8] },
        { dur: 6.5, from: P(1.6, -3.4, 1.7), to: P(2.6, -5, 2.7), look: () => [bx, by() + 0.5, bz], fov: 40,
          sub: ['Bjorn', '...And look what he is holding on to.', 4.5] },
      ], { skippable: false, onEnd: () => { g.ui.fade(true, 2.4).then(() => { this.st.stage = 'complete'; g.autosave(); A.showChapterEnd(); }); } });
    });
  }

  // =====================================================================================
  // Quest step handlers
  // =====================================================================================
  steps = {
    'q_white.wake'() {
      const g = this.g, p = g.player;
      this.enter(false);
      g.sky.time = 7.5; p.frozen = true; p.teleport(CAMP.x + 0.3, CAMP.z + 1.25, Math.PI); p.loopOverride = 'warm';
      g.ui.card('The Long White', 'Chapter Two', 3.6).then(() => {
        g.ui.subtitle('', 'The fire was embers. The smoke over the fjord was still rising.', 5);
        p.frozen = false; p.loopOverride = null;
        g.quests.notify('event', 'woke');
      });
    },
    'q_white.boughs'(r) { this.enter(false); this.hint('boughs'); if (!r) this.g.after(5.5, () => this.g.ui.subtitle('Eirik', 'Shelter first. Then food. That is what Father would say.', 4)); },
    'q_white.shelter'() { this.enter(false); this.g.ui.hint('Press {interact} at the lean-to to lay the boughs over it.'); },
    'q_white.food'() { this.enter(); this.tracks.visible = true; this.act.ensureDeer(); this.hint('tracks2'); },
    'q_white.harvest'(r) {
      const g = this.g;
      this.enter(); this.hint(null);
      if (r) { // the carcass is not saved: put one beside the player
        const a = g.wildlife.spawn('deer', g.player.pos.x + 2.5, g.player.pos.z - 2.5, {}); a.dead = true; a.state = 'dead';
        this.st.quests.q_white.step--; this.act.onKill('deer', a, true);
      }
    },
    'q_white.wolf'(r) { this.enter(); this.tracks.visible = false; if (r && !this.g.inventory.has('venison', 2)) this.g.inventory.add('venison', 3, true); this.spawnWolf(); },
    'q_white.return'(r) { this.enter(); this.hint(null); if (!r) this.g.ui.subtitle('Eirik', 'Back to the fire. Before anything else smells it.', 4); },
    'q_white.cook'() { this.enter(); this.hint('cook'); },
    'q_white.sleep'() { this.enter(); this.g.ui.hint('Press {interact} at the lean-to to sleep.'); },
    'q_ice.wake'() {
      const g = this.g, p = g.player, A = this.act;
      this.enter(); this.spawnTrackers();
      g.sky.time = 5.7; A.wTarget = { ...W_HUNT }; Object.assign(g.sky.weather, W_HUNT);
      A.campFire.on = true; A.campFire.size = 0.3; A.stealthActive = false;
      p.frozen = true; p.crouch = false; p.equip('none'); p.teleport(LEANTO[0] + 0.4, LEANTO[1] - 0.2, 2.3); p.loopOverride = 'sit';
      const T = this.trackers[0], gy = (x, z, h) => g.world.groundAt(x, z) + h, ex = p.pos.x, ez = p.pos.z;
      g.ui.card('Thin Ice', 'Two nights later', 3.4).then(() => g.ui.fade(false, 1.5));
      g.after(3.0, () => g.cine.play([
        { dur: 5.5, from: [ex - 3.4, gy(ex - 3.4, ez + 2.8, 1.0), ez + 2.8], to: [ex - 2.4, gy(ex - 2.4, ez + 2.0, 0.9), ez + 2.0], look: [ex, p.pos.y + 0.55, ez], fov: 36,
          sub: ['', 'On the third morning the forest was not empty.', 4.2], onStart: () => g.after(1.6, () => g.audio.play('horn', { freq: 98, vol: 0.5 })) },
        { dur: 6.5, from: [-97, gy(-97, -62, 1.5), -62], to: [-100, gy(-100, -66, 1.5), -66], look: () => [T.pos.x, T.pos.y + 1.5, T.pos.z], fov: 40,
          sub: ['Tracker', 'Smoke. There, by the big birch. Spread out.', 4.6], onStart: () => T.goPath([[-98, -70], [-107, -81]]) },
        { dur: 3.6, from: [ex - 1.8, gy(ex - 1.8, ez + 1.5, 0.8), ez + 1.5], look: [ex, p.pos.y + 0.7, ez], fov: 30, sub: ['Eirik', 'They followed the smoke.', 3], onStart: () => { p.loopOverride = null; } },
      ], { onEnd: () => g.quests.notify('event', 'woke2') }));
    },
    'q_ice.flee'(r) {
      const g = this.g, p = g.player, A = this.act;
      this.enter(); this.spawnTrackers(); g.world.setIce(true);
      if (r) { g.sky.time = 5.9; A.wTarget = { ...W_HUNT }; Object.assign(g.sky.weather, W_HUNT); p.teleport(LEANTO[0] + 0.4, LEANTO[1] - 0.2, 2.3); }
      A.campFire.on = false; p.frozen = false; p.loopOverride = null; p.crouch = true;
      A.stealthActive = true; this.hint('trackers');
    },
    'q_ice.cross'(r) {
      const g = this.g, p = g.player, A = this.act;
      this.enter(); this.spawnTrackers(); g.world.setIce(true); A.campFire.on = false;
      if (r) { g.sky.time = 6.4; A.wTarget = { ...W_HUNT }; Object.assign(g.sky.weather, W_HUNT); p.teleport(BANK_W[0], BANK_W[1], Math.PI / 2); p.crouch = true; }
      A.stealthActive = true; this.hint('ice');
      if (!r) g.ui.subtitle('Eirik', 'Father said never to trust river ice before midwinter.', 4.5);
    },
    'q_ice.climb'(r) {
      const g = this.g, p = g.player, A = this.act;
      this.enter(); this.spawnTrackers(); g.world.setIce(true); A.campFire.on = false;
      if (r) { g.sky.time = 6.9; A.wTarget = { ...W_HUNT }; Object.assign(g.sky.weather, W_HUNT); p.teleport(BANK_E[0] + 2, BANK_E[1], Math.PI / 2); }
      A.stealthActive = false; this.iceShown = false; g.ui.setDetection(-1); this.hint(null);
      for (const n of this.trackers) { n.raider.state = 'busy'; n.speed = 0; }
      g.ui.subtitle('', 'His legs had stopped belonging to him.', 4.5);
    },
  };

  // =====================================================================================
  // Per-frame
  // =====================================================================================
  update(dt) {
    if (!this.built) return;
    const g = this.g, p = g.player, q = g.quests, A = this.act, play = g.mode === 'play';
    this.t += dt;
    if (play && q.isActive('q_white')) g.sky.time = Math.min(16.4, g.sky.time + dt / 75);
    if (play && q.isActive('q_ice')) g.sky.time = Math.min(7.7, g.sky.time + dt / 150);
    this.st.time = g.sky.time;

    // warmth, hunger
    const climbing = q.at('q_ice', 'climb');
    if (!this.ending) {
      const nearFire = A.campFire.on && dist(p.pos, CAMP.x, CAMP.z) < 5.5;
      const rate = climbing ? 2.4 : q.isActive('q_ice') ? 0.34 : 0.22;
      if (nearFire) p.warmth = Math.min(100, p.warmth + 9 * dt);
      else if (play) p.warmth = Math.max(climbing ? 6 : 0, p.warmth - rate * (g.settings.difficulty === 'easy' ? 0.7 : g.settings.difficulty === 'hard' ? 1.3 : 1) * dt);
      if (play) p.hunger = Math.max(0, p.hunger - 0.11 * dt);
      p.speedMul = lerp(0.72, 0.95, Math.min(p.warmth, 60) / 60) * (p.hunger < 15 ? 0.9 : 1) * (climbing ? lerp(0.55, 1, clamp(p.warmth / 60, 0, 1)) : 1);
      if (this.t % 3.2 < dt) g.fx.burst('breath', p.pos.x + Math.sin(p.yaw) * 0.25, p.pos.y + p.h.headHeight() - 0.08, p.pos.z + Math.cos(p.yaw) * 0.25, 2);
      if (p.hunger < 20 && !this.hungerWarned) { this.hungerWarned = true; g.ui.toast('You are weak with hunger'); }
      if (p.hunger > 40) this.hungerWarned = false;
      if (play && (p.warmth <= 0 || p.hunger <= 0)) p.health -= (p.warmth <= 0 ? 5 : 1) * dt;
      if (p.health <= 2 && !climbing) this.fail('The cold took him', 'Keep the fire close. Eat when you can.');
    }

    if (q.at('q_white', 'return') && dist(p.pos, CAMP.x, CAMP.z) < 7) q.notify('reach', 'camp3');
    if (q.at('q_white', 'food') && this.t % 5 < dt) A.ensureDeer();
    if (this.tracks.visible) {
      const m = this.tracks.userData.mat, s = g.sense;
      m.opacity = lerp(0.6, 1, s); m.color.setRGB(lerp(0.12, 1.0, s), lerp(0.13, 0.72, s), lerp(0.16, 0.25, s));
    }

    // the hunt across the forest and the ice
    const fleeing = q.at('q_ice', 'flee'), crossing = q.at('q_ice', 'cross');
    if (fleeing || crossing) {
      let aware = 0; for (const n of this.trackers) aware = Math.max(aware, n.aware);
      g.ui.setDetection(A.stealthActive ? aware : -1);
      if (aware > 0.3 && this.t % 1.1 < dt) g.audio.play('heart', { vol: clamp(aware, 0.3, 1) });
    }
    if (fleeing && dist(p.pos, BANK_W[0], BANK_W[1]) < 9) q.notify('reach', 'riverbank');
    if (crossing) {
      const on = g.world.onIce(p.pos.x, p.pos.z);
      if (on && play && !this.breaking) {
        this.strain = clamp(this.strain + dt * (p.sprinting ? 0.6 : !p.moving ? 0.1 : p.crouch ? -0.06 : 0.24), 0, 1.2);
        if (this.strain > 0.4 && Math.random() < dt * 5 * this.strain) { g.audio.play('crackle', { vol: 1.5 }); g.audio.play('miss', { vol: 0.4 * this.strain }); p.cam.shake = Math.max(p.cam.shake, 0.08 * this.strain); }
        if (this.strain >= 1) this.breakIce();
        // grown men will not follow onto ice that barely holds a child
        for (const n of this.trackers) if (n.raider.state === 'chase' && Math.abs(n.pos.x - riverX(n.pos.z)) < 13) {
          n.raider.state = 'busy'; n.speed = 0; A.stealthActive = false;
          if (!this.iceBark) { this.iceBark = true; n.say('He is on the ice! Leave him. It will not hold us, and the cold will do the rest.', 5.5); }
        }
      } else if (!on) this.strain = Math.max(0, this.strain - dt * 0.3);
      this.iceShown = on || this.strain > 0.03;
      if (p.pos.x > riverX(p.pos.z) + 10.5) q.notify('reach', 'eastbank');
    }
    if (climbing && !this.ending) {
      this.dimK = damp(this.dimK, 0.5, 0.12, dt); g.ui.dim(this.dimK);
      if (dist(p.pos, COLLAPSE[0], COLLAPSE[1]) < 5.5) q.notify('reach', 'collapse');
    }
  }
}
