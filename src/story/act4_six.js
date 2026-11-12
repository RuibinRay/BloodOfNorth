// Act IV, Chapter 5: "Six Islands Burning". The weeks of desperate work after Håkon strikes all six islands: the
// burning harbor on Kinn, the looters in Fedje's forest, the signal tower on Skorpa, Bjorn's grey horse on Gulen,
// the ashes and the sea cave on Solvik, and Leif asleep on the floor. (The boats of refugees are in act4_home.js.)
// Kinn, Fedje, Skorpa and Gulen are still the small islands of the sandbox, so each of these is a short scene.
import * as THREE from 'three';
import { M, box, cyl, tint, at } from '../world/geo.js';
import { place } from '../world/layout.js';
import { damp, dampAngle } from '../core/util.js';
import { horseModel } from '../entities/wildlife.js';
import { A4, CAST4 } from '../data/act4.js';
import { Knack } from '../systems/activities2.js';
import { A4Part } from './act4_home.js';

const SIX = ['kinn', 'fedje', 'skorpa', 'gulen', 'solvik', 'solviknight', 'solvikmorn'];
const HILL = ['v0', 'v2', 'v3', 'v5'];
const _v = new THREE.Vector3();

export class A4Six extends A4Part {
  constructor(game, core) { super(game, core); this.fires = []; this.looters = []; }
  get IS() { return this.g.world.main.isles.stages; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, IS = this.IS;
    this.boy = g.addNPC('boy', CAST4.boy); this.boy.visible = false; this.boy.talk = () => this.boy.say('...', 2);
    const cat = new THREE.Group(), fur = (geo) => new THREE.Mesh(tint(geo, 0x8a8478, 0.2, 3), M.vcPlain);
    cat.add(fur(at(box(0.34, 0.15, 0.13), 0, 0.17, 0)), fur(at(box(0.12, 0.12, 0.12), 0.2, 0.25, 0)), fur(at(cyl(0.015, 0.02, 0.3, 4), -0.24, 0.26, 0, 0, 0, 0.8)));
    cat.visible = false; g.scene.add(cat); this.cat = cat;
    const hm = horseModel(), grey = new THREE.MeshLambertMaterial({ color: 0xa4a4a8 }), dark = new THREE.MeshLambertMaterial({ color: 0x5a5a60 }); let k = 0; hm.traverse((o) => { if (o.isMesh) o.material = k++ % 3 === 2 ? dark : grey; }); // Bjorn's grey hm.visible = false; g.scene.add(hm);
    this.ride = { model: hm, pos: hm.position, yaw: 1, speed: 0, hop: 0, on: false, load: null };
    this.tracks = w.makeTracks(IS.fedje.trail); this.tracks.visible = false;
    this.ruin = [place('solvik', 'quay', 44, 40).x, place('solvik', 'quay', 44, 40).z]; this.cave = [place('solvik', 'cave').x, place('solvik', 'cave').z]; this.rest = [place('solvik', 'quay', 30, 14.4).x, place('solvik', 'quay', 30, 14.4).z];
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, ...(typeof pos === 'function' ? { pos, x: 0, z: 0 } : { x: pos[0], z: pos[1] }), r: 3, priority: 3, label, enabled, use, ...o });
    I('a4pull', () => { const [x, z] = this.spot(); return { x, z }; }, 'Pull them out of the water', () => q.at('q_six', 'kinn') && !g.activity, () => this.pull(), { r: 2.6 });
    I('a4mount', () => this.ride.pos, "Mount Bjorn's grey horse", () => q.at('q_six', 'gulen') && !this.ride.on && c.phase === 'gulen' && !this.never, () => this.mount(), { r: 2.8 });
    I('a4dig', [this.ruin[0] + 3.4, this.ruin[1] + 4.6], 'Dig with them', () => q.at('q_six', 'dig') && !g.activity, () => this.dig(), { r: 3.4 });
    I('a4wake', [this.rest[0] - 1.2, this.rest[1] + 1.2], 'Wait by her until she wakes', () => q.at('q_six', 'wise') && c.phase === 'solvikmorn' && !this.waking, () => { this.waking = true; c.say('a4_wise', null, () => { this.waking = false; q.notify('talk', 'ingrid'); }); }, { r: 3.4 });
    g.ravens.addMarkable({ id: 'a4boy', pos: () => ({ x: this.cave[0], z: this.cave[1] }), r: 70, label: 'something small, moving in a sea cave', enabled: () => q.at('q_six', 'boy'),
      onMark: () => { c.sub("That night {w} finds him, alive, hiding in a sea cave with his grandmother's cat.", 7); q.notify('event', 'a4boy'); } });
  }
  clear(phase) {
    const g = this.g, IS = this.IS;
    for (const k of ['kinn', 'fedje', 'skorpa', 'gulen']) IS[k].set(phase === k);
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    this.boy.visible = false; this.cat.visible = false; this.tracks.visible = phase === 'fedje';
    if (this.ride.on) this.dismount(); this.ride.model.visible = false; this.ride.load = null;
    this.looters = []; this.fighting = false; this.never = false; this.hintKey = '';
    if (SIX.includes(phase) && phase !== 'fedje' && phase !== 'skorpa' && g.combat.active) g.combat.clear();
  }
  /** Where Eirik stands on Kinn's pier to reach the next one in the water. */
  spot() { const [x, z] = this.IS.kinn.water[Math.min(2, this.count('q_six'))]; return [x > -20 ? -19.0 : -21.0, z]; }
  dress(name) {
    const g = this.g, c = this.c, w = g.world, T = c.sea.town, IS = this.IS, n6 = this.count('q_six'), sx = this.at('q_six');
    const fire = (x, z, up, s) => this.fires.push(g.fx.addFire(x, Math.max(0.4, w.groundAt(x, z)) + up, z, s));
    if (name === 'kinn') {
      for (const [x, z, up, s] of IS.kinn.fires) fire(x, z, up, s);
      IS.kinn.water.forEach(([x, z], i) => { const n = T[i]; n.name = 'One of the people of Kinn'; if (i < n6 || sx > 1) this.put(n, x > -20 ? -19.4 : -20.6, z + 8 + i, 0, 'cower'); else this.fix(n, x, -1.0, z, x > -20 ? -Math.PI / 2 : Math.PI / 2, 'tread'); n.talk = () => n.say('...', 2); });
      [[-30, 706, 0.4], [-12, 707, -0.3], [-25, 710, 0.2]].forEach(([x, z, yaw], i) => { const n = this.put(T[3 + i], x, z, yaw, i % 2 ? 'mourn' : 'cower'); n.name = 'One of the people of Kinn'; });
      this.put('leif', -20.6, 697.5, Math.PI); this.put('ingrid', -18.4, 705, Math.PI, 'kneel'); this.put('astrid', -23, 705.4, Math.PI).h.hold('L', 'bow');
    }
    if (name === 'fedje') {
      const [cx, cz] = IS.fedje.camp, P = c.raid.pool;
      this.fires.push(g.fx.addFire(cx, w.groundAt(cx, cz) + 0.15, cz, 0.6));
      this.looters = [0, 1, 2, 3, 4].slice(0, A4.looters.n).map((i) => { const a = i * 1.257 + 0.4, e = this.put(P[i], cx + Math.cos(a) * 3, cz + Math.sin(a) * 3, [cx, cz], 'sit', ['axe', 'sword', 'axe', 'spear', 'sword'][i]); e.name = 'A raider'; e.talk = null; if (sx > 3) e.die(true); return e; });
      const a = this.put('astrid', IS.fedje.land[0] + 1.6, IS.fedje.land[1] + 1.2, 1.5); a.h.hold('L', 'bow'); a.follow(g.player, { dist: 3 });
    }
    if (name === 'skorpa') {
      const tw = IS.skorpa.tower; this.fires.push(g.fx.addFire(tw.x, tw.y - 0.3, tw.z, 1.5));
      [[-226, 1045], [-235, 1041], [-232, 1034], [-222, 1041]].forEach(([x, z], i) => { const n = this.put(HILL[i], x, z, Math.atan2(x + 230, z - 1040), 'guard', 'spear'); n.h.hold('L', 'shield'); });
      this.put('astrid', -227, 1037.4, 1.2).h.hold('L', 'bow'); this.put('leif', -233, 1044.4, -0.8).h.hold('R', 'seax');
    }
    if (name === 'gulen') {
      const G = IS.gulen, h = this.ride;
      h.model.visible = true; h.pos.set(G.horse[0], w.groundAt(...G.horse), G.horse[1]); h.yaw = 1; h.speed = 0;
      this.put('ingrid', G.ingrid[0], G.ingrid[1], [G.beds[1][0], G.beds[1][1]], 'kneel'); this.put('leif', G.ingrid[0] + 2.6, G.ingrid[1] + 0.6, [G.beds[1][0], G.beds[1][1]]);
      this.wounded = [0, 1, 2].map((i) => { const n = T[i], [fx, fz, ry] = G.farms[i], home = i < n6 || sx > 6, [x, z] = home ? G.beds[i] : [fx - Math.cos(ry) * 1.8, fz - Math.sin(ry) * 1.8]; n.name = 'A wounded farmer of Gulen'; this.fix(n, x, w.groundAt(x, z) + (home ? 0.3 : 0.1), z, ry, 'lie'); n.home = home; n.talk = null; return n; });
    }
    if (name.startsWith('solvik')) {
      const [rx, rz] = this.ruin, [cx, cz] = this.cave, [qx, qz] = this.rest, night = name === 'solviknight', morn = name === 'solvikmorn';
      const q0 = place('solvik', 'quay'); for (const [dx, dz, up, s] of [[-24, -38, 3.6, night ? 1 : 2], [-24, 12, 3.6, night ? 0.9 : 1.8], [12, -30, 3.6, night ? 0.8 : 1.6]]) if (!morn) fire(q0.x + dx, q0.z + dz, up, s);
      const fa = this.put(T[0], rx - 2.4, rz + 3.6, [rx, rz], morn ? 'kneel' : night ? 'mourn' : 'hoe', morn || night ? null : 'hoe'), mo = this.put(T[1], rx + 1.2, rz + 4.2, [rx, rz], morn ? 'kneel' : night ? 'mourn' : 'hoe', morn || night ? null : 'hoe');
      fa.name = 'The father'; mo.name = 'The mother'; fa.talk = mo.talk = () => fa.say('...', 2);
      if (night || morn) { const [bx, bz] = morn ? [rx - 0.6, rz + 4.6] : [cx + 0.4, cz + 1.6]; this.put(this.boy, bx, bz, morn ? [rx, rz + 9] : 3.14, morn ? null : 'sit'); this.cat.visible = true; this.cat.position.set(bx + 0.5, w.groundAt(bx + 0.5, bz + 0.3), bz + 0.3); this.cat.rotation.y = 1; }
      if (morn) { this.fix(c.npc('ingrid'), qx, w.groundAt(qx, qz) + 0.42, qz, 0.3 + Math.PI / 2, 'lie'); this.fix(c.npc('leif'), qx + 0.4, w.groundAt(qx, qz + 1.5) + 0.06, qz + 1.5, 0.3 + Math.PI / 2, 'lie'); }
      else { this.put('ingrid', qx - 1.2, qz + 1.4, [qx, qz], 'kneel'); this.put('leif', qx + 1.8, qz + 2.0, [qx, qz], 'carry'); [2, 3].forEach((i) => { const n = T[i]; n.name = 'One of the wounded'; this.fix(n, qx - 2.6 + (i - 2) * 5, w.groundAt(qx, qz) + 0.1, qz + 2.4, 1.2, 'lie'); n.talk = null; }); }
    }
  }
  dyn(name) {
    const g = this.g, q = g.quests, w = g.world;
    if (name !== 'a4work') return undefined;
    if (q.at('q_six', 'kinn')) { const [x, z] = this.spot(); return { x, z, y: 3.2 }; }
    if (q.at('q_six', 'gulen') && this.wounded) {
      const h = this.ride, n = h.load ? this.c.npc('ingrid') : this.wounded.find((x) => !x.home) || this.c.npc('ingrid');
      return { x: n.pos.x, z: n.pos.z, y: w.groundAt(n.pos.x, n.pos.z) + 2.2 };
    }
    return undefined;
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!SIX.includes(c.phase)) return false;
    if (id === 'ingrid' && q.at('q_six', 'wise')) { c.say('a4_wise', n, () => q.notify('talk', 'ingrid')); return true; }
    if (/^kp/.test(id)) { n.say('...', 2); return true; }
    if (id === 'ingrid') { n.say('Clean water. Clean hands. Hold him down.', 3); return true; } // (game)
    if (id === 'leif' || id === 'astrid') { n.say('...', 2); return true; }
    return false;
  }
  cues = { wake() { const i = this.c.npc('ingrid'), l = this.c.npc('leif'); i.pose = 'sit'; l.pose = 'sit'; l.pos.y -= 0.0; } };

  // ---- Kinn, Fedje, Skorpa ---------------------------------------------------------------------
  pull() {
    const g = this.g, c = this.c, i = this.count('q_six'), [x, z] = this.IS.kinn.water[i], [px, pz] = this.spot(), n = c.sea.town[i];
    new Knack(g, { label: 'Pull them out of the water', verb: 'pull', cfg: A4.knack.pull, anim: 'pickup', animDur: 0.7, sound: 'splash', bad: 'The smoke drives him back', at: [px, pz, x > -20 ? Math.PI / 2 : -Math.PI / 2], seed: i + 2,
      onBad: () => { g.player.health = Math.max(15, g.player.health - 5); },
      onDone: () => { this.put(n, x > -20 ? -19.4 : -20.6, z + 8 + i, 0, 'cower'); n.talk = () => n.say('...', 2); g.fx.burst('splash', x, 0, z, 10); g.quests.notify('event', 'a4kinn'); } }).start();
  }
  landFedje() { const p = this.g.player, [x, z] = this.IS.fedje.land; p.teleport(x, z, Math.PI / 2); this.c.ensureArmed(); }
  fight() {
    const g = this.g, c = this.c, p = g.player, R = A4.looters;
    if (this.fighting) return;
    this.fighting = true; this.shotT = 1.5; p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    for (const e of this.looters) { if (e.dead) continue; g.combat.enemies = g.combat.enemies.filter((x) => x !== e); e.setLoop(null); g.combat.add(e, { hp: R.hp, dmg: R.dmg, skill: R.skill }); }
    g.audio.setMusic('raid');
  }
  raid() {
    const g = this.g, c = this.c, p = g.player, R = A4.skorpa;
    p.mortal = true; c.ensureArmed(); if (p.equipped !== 'father_axe') p.equip('father_axe');
    c.battle.startSkirmish(HILL, this.IS.skorpa.from, R.n, R.atOnce, () => g.after(1.5, () => g.quests.notify('event', 'a4skorpa')), R);
    g.ui.questBanner('Skorpa', 'the signal tower'); c.hint('deckHold');
  }

  // ---- Gulen: Bjorn's grey horse -----------------------------------------------------------------
  mount() {
    const g = this.g, p = g.player, h = this.ride;
    h.on = true; h.fresh = true; h.yaw = p.yaw; p.frozen = true; p.riding = true; p.crouch = false; if (p.equipped !== 'none') p.equip('none'); p.loopOverride = 'sit'; p.h.lift = 1.0; p.cam.maxDist = 6.6;
    g.audio.play('page'); this.hintKey = '';
  }
  dismount() {
    const g = this.g, p = g.player, h = this.ride;
    if (!h.on) return;
    h.on = false; h.speed = 0; p.frozen = false; p.riding = false; p.loopOverride = null; p.h.lift = 0; p.cam.maxDist = 4.9;
    const x = h.pos.x + Math.cos(h.yaw) * 1.3, z = h.pos.z - Math.sin(h.yaw) * 1.3; p.pos.set(x, g.world.groundAt(x, z), z); p.speed = 0; g.ui.hint(null);
  }
  /** What {interact} does from the saddle: lift a wounded man, set him down by Ingrid, or get down. */
  rideAct() {
    const g = this.g, c = this.c, w = g.world, h = this.ride, G = this.IS.gulen, ing = c.npc('ingrid'), near = this.wounded.find((n) => !n.home && n !== h.load && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 4.2);
    if (!h.load && near) { h.load = near; g.audio.play('pickup'); return; }
    if (h.load && Math.hypot(ing.pos.x - h.pos.x, ing.pos.z - h.pos.z) < 6.5) {
      const n = h.load, i = this.wounded.indexOf(n), [bx, bz] = G.beds[i];
      h.load = null; n.home = true; this.fix(n, bx, w.groundAt(bx, bz) + 0.3, bz, 0, 'lie'); g.audio.play('thud', { vol: 0.4 });
      if (this.wounded.every((x) => x.home)) { this.never = true; this.dismount(); c.say('a4_never', ing, () => g.quests.notify('event', 'a4gulen')); }
      else g.quests.notify('event', 'a4gulen');
      return;
    }
    if (!h.load) this.dismount();
  }
  dig() {
    const g = this.g, c = this.c, i = this.count('q_six'), [rx, rz] = this.ruin;
    new Knack(g, { label: 'Dig through the ashes of the house', verb: 'dig', cfg: A4.knack.dig, hold: 'hoe', sound: 'thud', at: [rx + 3.4, rz + 4.6, Math.atan2(-3.4, -4.6)], seed: i + 4,
      onDone: () => { if (i === 0) c.sub('They dig for two days. Eirik stays and digs with them.', 6); g.quests.notify('event', 'a4dig'); } }).start();
  }

  // =====================================================================================
  steps = {
    'q_six.kinn'(r) {
      const g = this.g, c = this.c, p = g.player;
      if (r) { c.setPhase('kinn', r); return p.teleport(-20, 702.6, Math.PI); }
      c.fade(() => { c.setPhase('kinn', true); p.teleport(-20, 702.6, Math.PI); return g.ui.card('Kinn', 'The next weeks are a blur of desperate work.', 5); }, 1.2, 1.2).then(() => c.sub('The Sea-Raven pulls survivors from a burning harbor on Kinn.', 6));
    },
    'q_six.trail'(r) {
      const g = this.g, c = this.c;
      if (r) { c.setPhase('fedje', r); return this.landFedje(); }
      c.fade(() => { c.setPhase('fedje', true); this.landFedje(); return g.ui.card('Fedje', "Eirik and Astrid hunt a band of raiders through Fedje's forests, the ones who stayed behind to loot.", 7); }, 1.2, 1.2).then(() => c.hint('Follow their tracks east through the trees. Hold {sense} to see them.'));
    },
    'q_six.looters'(r) { const g = this.g, c = this.c; c.setPhase('fedje', r); if (r) g.player.teleport(190, 594, Math.PI / 2); c.hint(null); this.fight(); },
    'q_six.skorpa'(r) {
      const g = this.g, c = this.c, p = g.player;
      if (r) { c.setPhase('skorpa', r); p.teleport(-229, 1040, Math.PI / 2); return this.raid(); }
      g.combat.clear(); g.audio.setMusic('sorrow');
      c.fade(() => { c.setPhase('skorpa', true); p.teleport(-229, 1040, Math.PI / 2); return g.ui.card('Skorpa', 'They defend a signal tower on Skorpa against a last raid.', 5); }, 1.2, 1.2).then(() => this.raid());
    },
    'q_six.gulen'(r) {
      const g = this.g, c = this.c, p = g.player, at = () => p.teleport(-52.4, 264.6, 0.6);
      if (r) { c.setPhase('gulen', r); return at(); }
      g.combat.clear(); c.hint(null);
      c.fade(() => { c.setPhase('gulen', true); at(); if (p.equipped !== 'none') p.equip('none'); return g.ui.card('Gulen', "Eirik rides Bjorn's grey horse from farm to farm across Gulen carrying wounded people to Ingrid.", 7); }, 1.2, 1.2);
    },
    'q_six.dig'(r) {
      const g = this.g, c = this.c, p = g.player, at = () => p.teleport(this.ruin[0] + 6, this.ruin[1] + 9, Math.PI + 0.5);
      if (r) { c.setPhase('solvik', r); return at(); }
      c.fade(() => { c.setPhase('solvik', true); at(); return g.ui.card('Solvik', 'On Solvik, a mother and father dig through the ashes of their house for their missing son.', 7); }, 1.2, 1.2);
    },
    'q_six.eye'(r) {
      const g = this.g, c = this.c, p = g.player, at = () => p.teleport(this.ruin[0] + 6, this.ruin[1] + 9, 0);
      if (r) { c.setPhase('solviknight', r); at(); return c.hint('eyeUp'); }
      c.fade(() => { c.setPhase('solviknight', true); at(); return g.ui.card('', 'They do not find him.', 4.5); }, 1.2, 1.2).then(() => c.hint('eyeUp'));
    },
    'q_six.boy'(r) { const c = this.c; c.setPhase('solviknight', r); c.hint('Fly south along the shore to the sea cave, and press {interact} when she sees something.'); },
    'q_six.cave'(r) { const c = this.c; c.setPhase('solviknight', r); c.hint(null); },
    'q_six.wise'(r) {
      const g = this.g, c = this.c, p = g.player, at = () => p.teleport(this.rest[0] - 3.4, this.rest[1] + 4.4, 2.4);
      if (r) { c.setPhase('solvikmorn', r); return at(); }
      c.sub('It is the only good news in a month.', 5);
      g.after(5.4, () => c.fade(() => { c.setPhase('solvikmorn', true); at(); }, 1.4, 1.4));
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase;
    if (!SIX.includes(ph)) return;
    this.crew([...c.sea.town, c.npc('ingrid'), c.npc('leif')], dt);
    if (c.battle.sk && ph === 'skorpa' && g.mode !== 'cutscene') c.battle.updateSkirmish(dt);
    if (ph === 'fedje' && this.fighting && g.mode === 'play') { // Astrid's bow, from behind him
      const alive = this.looters.filter((e) => !e.dead && e.cb && !e.cb.out), a = c.npc('astrid'), R = A4.looters;
      if (!alive.length) { this.fighting = false; g.audio.setMusic('sorrow'); g.after(1.2, () => q.notify('event', 'a4looters')); return; }
      if ((this.shotT -= dt) <= 0) { this.shotT = R.astrid[0]; const e = alive[(Math.random() * alive.length) | 0]; a.face(e.pos.x, e.pos.z); a.h.play('shoot', 0.8); g.audio.play('bow', { vol: 0.6 }); g.after(0.45, () => { if (!e.dead && e.cb) g.combat.hurt(e, R.astrid[1], 30); }); }
    }
    if (ph !== 'gulen') return;
    const h = this.ride, lg = h.model.userData.legs, s = Math.sin((h.hop += dt * (3 + h.speed * 1.5))) * Math.min(0.8, h.speed / 9);
    lg[0].rotation.x = s; lg[1].rotation.x = -s; lg[2].rotation.x = -s; lg[3].rotation.x = s; h.model.rotation.y = h.yaw;
    if (h.load) { const n = h.load, a = h.yaw + Math.PI / 2; n.pos.set(h.pos.x - Math.sin(h.yaw) * 0.6 + Math.sin(a) * 0.8, h.pos.y + 1.12, h.pos.z - Math.cos(h.yaw) * 0.6 + Math.cos(a) * 0.8); n.yaw = a; n.root.rotation.y = a; } // across her back, behind the saddle
    if (!h.on) return;
    const live = g.mode === 'play' && !g.ravens.eye, inp = g.input, mv = live ? inp.move() : { x: 0, y: 0, mag: 0 }, cy = p.cam.yaw, dx = Math.sin(cy) * mv.y - Math.cos(cy) * mv.x, dz = Math.cos(cy) * mv.y + Math.sin(cy) * mv.x;
    const top = mv.mag > 0.1 ? (live && inp.held('sprint') ? A4.ride.gallop : A4.ride.walk) * mv.mag : 0;
    h.speed = damp(h.speed, top, top > h.speed ? 1.5 : 3.5, dt); if (mv.mag > 0.1) h.yaw = dampAngle(h.yaw, Math.atan2(dx, dz), 2.8, dt);
    _v.set(h.pos.x + Math.sin(h.yaw) * h.speed * dt, 0, h.pos.z + Math.cos(h.yaw) * h.speed * dt); w_resolve(g, _v);
    if (g.world.walkable(_v.x, _v.z)) { h.pos.x = _v.x; h.pos.z = _v.z; } else h.speed *= 0.4;
    h.pos.y = damp(h.pos.y, g.world.groundAt(h.pos.x, h.pos.z), 14, dt);
    p.pos.copy(h.pos); p.yaw = h.yaw; p.root.rotation.y = h.yaw;
    if (h.speed > 2 && Math.sin(h.hop) * Math.sin(h.hop - dt * (3 + h.speed * 1.5)) < 0) g.audio.play('step', { vol: 0.9 });
    const ing = c.npc('ingrid'), nearW = this.wounded.some((n) => !n.home && n !== h.load && Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) < 4.2), nearI = h.load && Math.hypot(ing.pos.x - h.pos.x, ing.pos.z - h.pos.z) < 6.5;
    const key = !h.load && nearW ? 'Press {interact} to lift him onto the horse.' : nearI ? 'Press {interact} to set him down by Ingrid.' : h.load ? 'Carry him to Ingrid, by the hall.' : 'ride';
    if (key !== this.hintKey) { this.hintKey = key; c.hint(key); }
    if (live && !h.fresh && inp.hit('interact')) this.rideAct();
    h.fresh = false;
  }
}
const w_resolve = (g, v) => g.world.resolve(v, 0.55);
