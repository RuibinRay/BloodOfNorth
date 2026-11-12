// Act II, Chapters 4 and 5: "The Farmer's Axe" (the raid on Bjornstead, Kettil in the mud, the children in the barn)
// and "The Wolf Remembers" (the Hall of Wolves on Svartøy). See act2.js for what the chapters share.
import * as THREE from 'three';
import { M, box, cyl, sphere, tint, at } from '../world/geo.js';
import { RAIDER_LOOKS, CAST } from '../data/act1.js';
import { A2, CAST2, HALL_LINES } from '../data/act2.js';
import { FOES } from './champions.js';
import { makeItem } from '../entities/humanoid.js';
import { Knack } from '../systems/activities2.js';

const WAVE_FROM = [null, [[74, 147], [78, 143]], [[0, 190], [6, 194]], [[70, 152], [74, 156]], [[-84, 146], [-80, 150]], [[40, 147], [44, 151]]];

export class A2Raid {
  constructor(game, core) { this.g = game; this.c = core; this.pool = []; this.wave = 0; this.fires = []; this.live = []; this.mudded = new Set(); this.seq = null; this.barnT = 0; }
  get st() { return this.g.state; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, W = c.W;
    for (let i = 0; i < 12; i++) { const n = g.addNPC('a2r' + i, { name: "Håkon's man", look: RAIDER_LOOKS[i % RAIDER_LOOKS.length] }); n.visible = false; this.pool.push(n); }
    const hd = W.hallDoor, bd = W.houses.barn.door;
    w.addInteractable({ id: 'a2stone', x: hd.x, z: hd.z, r: 2.8, priority: 3, label: 'Lift the flat stone by the hearth', enabled: () => q.at('q_axe', 'stone') && !this.taking, use: () => this.takeAxe() });
    w.addInteractable({ id: 'a2slam', x: bd.x - 0.6, z: bd.z, r: 3.4, priority: 4, label: 'Slam the barn door into them', enabled: () => q.at('q_axe', 'barn') && !this.slammed && this.atDoor().length > 0, use: () => this.slam() });
    w.addInteractable({ id: 'a2barn', x: bd.x - 0.4, z: bd.z, r: 3.2, priority: 4, label: 'Go in for the children', enabled: () => q.at('q_axe', 'children') && !this.rescuing, use: () => this.rescue() });
    w.addInteractable({ id: 'a2brooch', pos: () => this.broochPos(), x: 0, z: 0, r: 2.4, priority: 3, label: 'Pick up the wolf brooch', enabled: () => q.at('q_axe', 'brooch'), use: () => this.takeBrooch() });
    g.events.on('harried', (e) => { if (q.at('q_axe', 'lane') && !this.strap && e.cb) { this.strap = true; e.cb.t = A2.raid.strap.secs; g.ravens.harry(e, A2.raid.strap.secs); c.sub("{b} dives screaming at a raider's face and steals the man's helmet strap, so the helmet falls over his eyes.", 6); } });
    this.broochMesh = new THREE.Mesh(tint(at(sphere(0.09, 7, 5), 0, 0, 0, 0, 0, 0, 1, 0.35, 1.2), 0x15151a, 0.1, 2), M.vcPlain); this.broochMesh.visible = false; g.scene.add(this.broochMesh);
  }
  clear(phase) {
    const g = this.g;
    if (!['raid', 'after'].includes(phase)) { for (const f of this.fires) g.fx.removeFire(f); this.fires = []; this.c.act.glowTarget = 0; }
    if (phase !== 'raid') { for (const n of this.pool) n.visible = false; this.live = []; this.wave = 0; if (g.combat.active && phase !== 'dawn') g.combat.clear(); if (this.axeDrop) this.axeDrop.visible = false; }
    if (phase !== 'hall' && this.hallSet) this.hallSet.visible = false;
    this.broochMesh.visible = false;
  }
  talk(id, n) {
    const g = this.g, q = g.quests;
    if (id === 'freydis' && q.at('q_axe', 'well')) { this.c.say('a2_well', n, () => q.notify('talk', 'freydis')); return true; }
    if (q.isActive('q_axe') && id === 'bjorn') { n.say('Stay off my left, and I will stay off yours.', 3); return true; }
    return false;
  }
  dyn(name) { if (name === 'brooch') { const p = this.broochPos(); return { x: p.x, z: p.z, y: this.g.world.groundAt(p.x, p.z) + 1.2 }; } return undefined; }
  broochPos() { const [x, z] = this.c.B(9.5, 144.5); return { x, z }; }

  // ---- the village on fire ---------------------------------------------------------------
  burnRoof(info, size = 2.0) { for (const p of info.ridgePts) this.fires.push(this.g.fx.addFire(p.x, p.y, p.z, size + Math.random() * 0.5)); }
  ignite(barn) {
    const g = this.g, c = this.c, H = c.W.houses;
    if (!this.fires.length) {
      const f = c.W.s.fields[0];
      for (let i = 0; i < 6; i++) { const [x, z] = c.B(f[0] - 18 + i * 7.2, f[1] + (i % 2 ? 9 : -8)); this.fires.push(g.fx.addFire(x, g.world.groundAt(x, z) + 0.3, z, 2.4)); } // the barley goes up in a sheet of flame
      this.burnRoof(H.lost0); this.burnRoof(H.lost1);
    }
    if (barn && !this.barnFire) { this.barnFire = true; this.burnRoof(H.barn, 2.4); }
    c.act.glowTarget = 0.8; g.sky.fireGlow = Math.max(g.sky.fireGlow, 0.5);
  }
  /** Everyone into the longhouse; Bjorn and his big bearded axe in the yard. */
  stage(armed) {
    const g = this.g, c = this.c, p = g.player;
    this.ignite(false);
    for (const id of c.folk) c.npc(id).visible = false;
    for (const id of ['signe', 'freydis']) c.npc(id).visible = false;
    const b = c.npc('bjorn'); b.visible = true;
    if (b.mode !== 'fight') { c.post('bjorn', [3, 138, 1.4]); b.h.hold('R', 'daneaxe'); b.talk = () => c.talkTo('bjorn'); }
    if (armed) { c.ensureArmed(); p.mortal = true; if (p.equipped !== 'father_axe') p.equip('father_axe'); }
    c.goat.m.visible = false;
  }

  // ---- the stone by the hearth -------------------------------------------------------------
  takeAxe() {
    const g = this.g, c = this.c, p = g.player;
    this.taking = true; p.frozen = true; c.hint(null);
    g.ui.fade(true, 1.0)
      .then(() => g.ui.card('The Stone by the Hearth', 'The sheepskin has rotted, but the oil kept the axe clean. Raven-Feeder lies in the hollow, the ravens on its blade dark with age.', 6))
      .then(() => g.ui.card('', 'For a moment everything goes quiet. He is nine years old on a woodpile and his father is laughing. “A blade may save your life, but wisdom decides when to draw it.”', 7.5))
      .then(() => {
        this.stage(true);
        p.teleport(...c.B(-3.6, 123), 0.6); c.setColumn(14, 141, -2.0, true); c.riders.men.forEach((n) => { n.visible = false; });
        g.ui.toast("He takes the axe and Bjorn's spare shield and walks outside.");
        return g.ui.fade(false, 1.0);
      })
      .then(() => { p.frozen = false; this.taking = false; c.say('a2_boy', c.riders.k, () => { c.riders.k.mode = 'crew'; c.rideTo([[34, 150]], 4); g.quests.notify('event', 'tookAxe'); }); c.riders.k.mode = 'crew'; });
  }

  // ---- the waves -----------------------------------------------------------------------------
  /** Take a man from the pool (the longest dead first) and send him in. */
  send(i, n, opts = {}) {
    const g = this.g, c = this.c, R = A2.raid, from = WAVE_FROM[n][i % 2], e = this.pool.find((x) => !this.live.includes(x) && (!x.visible || x.dead)) || this.pool[(this.wave * 5 + i) % this.pool.length];
    const [x, z] = c.B(from[0] + (i >> 1) * 1.7, from[1] + (i >> 1) * 1.3);
    g.combat.enemies = g.combat.enemies.filter((x) => x !== e); // a man from an earlier wave, come again
    e.revive(); e.visible = true; e.name = "Håkon's man"; e.teleport(x, z, 0); e.h.hold('R', ['axe', 'sword', 'spear', 'axe'][i % 4]); e.h.hold('L', i % 3 === 2 ? null : 'shield');
    this.live.push(e);
    return g.combat.add(e, { hp: R.hp, dmg: R.dmg, skill: R.skill, ...opts });
  }
  startWave(n) {
    const g = this.g, c = this.c, b = c.npc('bjorn'), R = A2.raid, bd = c.W.houses.barn.door;
    if (this.wave >= n) return;
    this.wave = n; this.live = []; this.mudded.clear();
    const duel = (e) => { e.cb.duel = b; b.fight(e, { lethal: 0, dmg: 12 }); };
    const count = n <= 4 ? R.waves[n - 1] : R.escort, list = [];
    for (let i = 0; i < count; i++) list.push(this.send(i, n, n === 2 && i < 3 ? { job: { x: bd.x - 2.6, z: bd.z + (i - 1) * 1.3, fx: bd.x + 2, fz: bd.z, time: 30, onDone: () => {} } } : {}));
    duel(list[list.length - 1]);
    if (n === 1) { b.say('Here they come!', 3); g.after(2.5, () => this.bucket()); }
    if (n === 2) { this.slammed = false; c.sub('Three of them are making for the barn.', 4.5); }
    if (n === 3) c.sub('The pigsty. A man who goes into that mud does not come out of it quickly.', 5);
    if (n === 4) c.sub('The lane between the smithy and the smokehouse: there, only one of them can reach him at a time.', 6);
    if (n === 5) this.kettil(list);
    g.ui.questBanner(n <= 4 ? `The fight for Bjornstead · ${['first', 'second', 'third', 'fourth'][n - 1]} wave` : 'Kettil Red-Hand', n <= 4 ? `${count} of Håkon's men` : "champion of Jarl Håkon Ironwolf");
  }
  /** Freydis knocks a raider off the longhouse steps with a well bucket. */
  bucket() {
    const g = this.g, c = this.c, f = c.npc('freydis'), hd = c.W.hallDoor, e = this.pool.find((x) => !this.live.includes(x));
    if (!e || this.bucketed) return;
    this.bucketed = true;
    e.revive(); e.visible = true; e.cb = null; e.teleport(hd.x + 6, hd.z + 5, -2.4); e.h.hold('R', 'axe'); e.h.hold('L', null); e.goTo(hd.x + 0.6, hd.z + 0.4, { run: true, onArrive: (o) => {
      f.visible = true; f.teleport(hd.x - 0.4, hd.z - 0.6, 0.7); f.h.play('atk3', 0.6); g.audio.play('clack'); g.audio.play('thud');
      o.die(); c.sub('Freydis knocks a raider off the longhouse steps with a well bucket.', 5); g.after(2.2, () => { f.visible = false; });
    } });
  }
  atDoor() { const bd = this.c.W.houses.barn.door, r = A2.raid.door.r; return this.g.combat.alive().filter((e) => Math.hypot(e.pos.x - (bd.x - 1.5), e.pos.z - bd.z) < r); }
  slam() {
    const g = this.g, c = this.c, hit = this.atDoor();
    this.slammed = true; this.doorT = 0.0001; g.player.h.play('shove', 0.6); g.audio.play('thud'); g.audio.play('clack'); g.player.cam.shake = 0.3;
    for (const e of hit) g.combat.hurt(e, A2.raid.door.dmg, 100);
    c.sub(`He slams the barn door into ${hit.length >= 3 ? 'three men at once' : hit.length === 2 ? 'two of them' : 'the nearest man'}.`, 4.5);
  }
  down() { return this.live.length > 0 && this.live.every((e) => e.dead || (e.cb && e.cb.out) || !e.cb); }

  // ---- Kettil ----------------------------------------------------------------------------------
  kettil(escort) {
    const g = this.g, c = this.c, r = c.column(), k = r.k, K = A2.raid.kettil, [x, z] = c.B(16, 144);
    r.mounted = false; r.on = true; r.horse.visible = true; r.pos.set(...((q) => [q[0], g.world.groundAt(q[0], q[1]), q[1]])(c.B(30, 150))); r.path = [];
    k.revive(); k.visible = true; k.teleport(x, z, -1.6); k.h.hold('R', 'smallaxe'); k.h.hold('L', 'buckler');
    const moves = structuredClone(FOES.find((f) => f.id === 'kettil').cb.moves.filter((m) => m.id === 'hook' || m.id.startsWith('kc')));
    g.combat.add(k, { hp: K.hp, dmg: K.dmg, skill: K.skill, boss: true, smart: true, dodge: 0.25, reach: 2.2, moves, phases: [{ at: K.mudAt, do: (e) => this.mud(e) }], onDown: (e) => this.mud(e) });
    this.live.push(k);
    k.say('A farmer with an axe.', 3);
    g.after(4, () => c.hint('Kettil is fast and nasty: a hand axe in his left hand and an iron buckler strapped to his ruined right forearm, hooking and smashing.'));
  }
  /** He knocks Raven-Feeder out of Eirik's hands, kicks him down into the mud and lifts his axe. The scar burns. */
  mud(e) {
    const g = this.g, c = this.c, p = g.player;
    if (this.seq) return;
    for (const x of g.combat.alive()) if (x !== e) { x.cb.out = true; x.mode = 'idle'; x.h.setLoop(null); x.goTo(...c.B(100, 132), { run: true, onArrive: (o) => { o.visible = false; } }); } // the rest have had enough
    const b = c.npc('bjorn'); b.stop(); b.h.setLoop(null);
    e.cb.out = false; e.cb.hp = Math.max(e.cb.hp, 30); e.cb.state = 'recover'; e.cb.t = 999; e.cb.phases = []; e.cb.onDown = null;
    p.mortal = false; p.frozen = true; p.lock = null;
    this.seq = { step: 'hook', t: 0, e };
    e.h.action = null; e.h.play('shove', 0.6); p.afflict('disarm', 600); g.audio.play('steel');
    if (!this.axeDrop) { this.axeDrop = makeItem('father_axe'); g.scene.add(this.axeDrop); }
    this.axeDrop.visible = true; this.axeDrop.position.set(p.pos.x + 1.6, g.world.groundAt(p.pos.x + 1.6, p.pos.z + 0.8) + 0.06, p.pos.z + 0.8); this.axeDrop.rotation.set(1.5, 0.6, 0);
    c.sub("He knocks Raven-Feeder out of Eirik's hands with a twist of the buckler.", 3.5);
  }
  updateSeq(dt) {
    const g = this.g, c = this.c, p = g.player, s = this.seq, e = s.e, inp = g.input;
    s.t += dt;
    e.yaw = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    if (s.step === 'hook' && s.t > 1.0) { s.step = 'kick'; s.t = 0; e.h.play('atk2', 0.6); g.audio.play('thud'); p.h.play('fall', 0.9, { onEnd: () => { p.loopOverride = 'dead'; } }); c.sub('He kicks Eirik down into the mud and lifts his axe.', 3.2); }
    else if (s.step === 'kick' && s.t > 1.8) { s.step = 'ward'; s.t = 0; e.h.action = null; e.h.play('atk3', 30); g.slowT = 9; g.audio.play('heart'); c.sub('The scar burns. The world slows to a crawl.', 6); g.ui.hint('Stormguard: {ward}'); }
    else if (s.step === 'ward' && s.t > 0.12 && (inp.hit('ward') || inp.hit('block') || s.t > 1.0)) { // the world is slowed: a second here is three for the player
      s.step = 'rim'; s.t = 0; p.loopOverride = null; p.h.play('dodge', 0.5); p.ward = Math.max(0, p.ward - 50); p.wardFlash(e.pos); g.slowT = 5;
      c.sub('Stormguard. He sees the axe coming down as clearly as a falling leaf. He rolls, brings the shield up, and catches the blow.', 6); g.ui.hint('{attack}: the shield rim into his knee');
    } else if (s.step === 'rim' && s.t > 0.08 && (inp.hit('attack') || s.t > 0.8)) {
      s.step = 'over'; s.t = 0; g.slowT = 0; g.ui.hint(null); p.h.play('shove', 0.5); g.audio.play('thud'); g.audio.play('hurt', { vol: 0.5 }); p.cam.shake = 0.3;
      g.combat.clear(); e.cb = null; e.mode = 'idle'; e.h.action = null; e.h.play('fall', 0.9); e.setLoop('lie'); e.h.hold('R', null);
    } else if (s.step === 'over' && s.t > 1.4) {
      this.seq = null; this.axeDrop.visible = false; p.fx.disarm = 0.01; p.frozen = false; this.ignite(true);
      c.sub('Eirik snatches Raven-Feeder from the mud and stands over him. Kettil is on his back, blood in his mouth, hands up.', 5);
      g.after(1.2, () => c.say('a2_wait', e, () => { g.quests.notify('event', 'a2kettil'); }));
    }
  }

  // ---- the children in the barn ----------------------------------------------------------------
  rescue() {
    const g = this.g, c = this.c, p = g.player, bd = c.W.houses.barn.door, R = A2.raid.barn;
    this.rescuing = true; c.hint(null);
    new Knack(g, { label: 'Six children in the hayloft: find them in the smoke', verb: 'reach', cfg: A2.knack.smoke, anim: 'pickup', animDur: 0.7, sound: 'pickup', bad: 'The heat drives him back', at: [bd.x - 0.9, bd.z, Math.PI / 2], seed: 5, onStop: () => { this.rescuing = false; },
      onGood: (i) => { for (const k of [i * 2 - 2, i * 2 - 1]) { const n = c.npc('kid' + k); n.visible = true; n.held = true; n.teleport(bd.x - 1.2, bd.z + (k % 2 ? 0.8 : -0.8), -1.6); n.setLoop(null); n.goTo(...c.B(-2 + k * 1.1, 123.4), { run: true, onArrive: (o) => o.setLoop('cower') }); } g.audio.play('shout', { vol: 0.4 }); },
      onBad: () => { p.health = Math.max(12, p.health - R.heat); g.audio.play('hurt', { vol: 0.5 }); },
      onDone: () => { p.health = Math.min(p.health, 60); c.sub('He gets all six out. His hair is singed and his hands are blistered.', 5.5); g.after(5.6, () => g.quests.notify('event', 'a2children')); } }).start();
  }
  takeBrooch() {
    const g = this.g, c = this.c;
    g.player.h.play('pickup', 0.9); this.broochMesh.visible = false; g.inventory.add('wolf_brooch', 1);
    c.sub("Kettil is gone. He has left a trail of blood to the river, and in the mud where he lay is the black iron wolf brooch of Håkon's champions.", 8);
    g.after(1.5, () => g.quests.notify('event', 'a2brooch'));
  }

  // ---- the Hall of Wolves (Chapter 5) --------------------------------------------------------------
  playHall() {
    const g = this.g, c = this.c, p = g.player, h = g.world.realm.svartoy.hall, y0 = h.y, zs = h.z + h.hl + 1; // zs: the south wall
    if (this.hallOn) return;
    this.hallOn = true; c.setPhase('hall', true);
    g.ravens.setMode('hidden'); p.frozen = true; p.root.visible = false; p.teleport(h.x, h.z + 2, 0);
    if (!this.hallSet) { // tables for the meal: two down the hall, one across before the high seat
      const b = new THREE.Group(), add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; b.add(m); };
      for (const s of [-1, 1]) { add(box(1.0, 0.1, 6.2), M.plank, h.x + s * 2.3, y0 + 0.82, zs - 9.6); add(box(0.4, 0.08, 6), M.plank, h.x + s * 3.2, y0 + 0.46, zs - 9.6); for (const k of [-1, 1]) add(box(0.9, 0.8, 0.12), M.timber, h.x + s * 2.3, y0 + 0.4, zs - 9.6 + k * 2.6); }
      for (let i = 0; i < 10; i++) add(i % 3 ? cyl(0.08, 0.06, 0.14, 7) : sphere(0.15, 7, 5), M.timber, h.x + (i % 2 ? 2.3 : -2.3) + (i % 3) * 0.12, y0 + 0.94, zs - 12 + i * 0.55);
      g.scene.add(b); this.hallSet = b;
      const mk = (id, name, look, x, z, yaw, loop, y = 0, hold = null) => { const n = g.npcs.get('hw_' + id) || g.addNPC('hw_' + id, { name, look }); n.mode = 'crew'; n.pos.set(x, y0 + y, z); n.yaw = yaw; n.root.rotation.y = yaw; n.h.hold('R', hold); n.pose = loop; return n; };
      const F = (id) => FOES.find((f) => f.id === id);
      this.hallCast = { hakon: mk('hakon', 'Håkon', { ...CAST.hakon.look, helmet: false }, h.x, zs - 3.3, Math.PI, 'sit', 0.62),
        vigdis: mk('vigdis', 'Vigdis', F('vigdis').look, h.x - 1.5, zs - 1.9, Math.PI, null), gorm: mk('gorm', 'Gorm', F('gorm').look, h.x + 1.6, zs - 1.9, Math.PI, null),
        sigurd: mk('sigurd', 'Sigurd Stonehand', CAST2.sigurd.look, h.x - 3.2, zs - 5.4, 1.2, 'sit', 0) };
      ['arne', 'rurik', 'skarde', 'eydis', 'bersi', 'ulf'].forEach((id, i) => { const s = i % 2 ? 1 : -1; this.hallCast[id] = mk(id, F(id).name, F(id).look, h.x + s * 3.2, zs - 7.6 - (i >> 1) * 1.9, -s * Math.PI / 2, 'sit', 0, id === 'arne' ? 'seax' : null); });
    }
    this.hallSet.visible = true; for (const n of Object.values(this.hallCast)) n.visible = true;
    const C = this.hallCast, hk = C.hakon; hk.pos.set(h.x, y0 + 0.62, zs - 3.3); hk.pose = 'sit'; this.hakonWalk = null;
    const k = c.column().k; c.riders.on = false; c.riders.horse.visible = false; k.visible = true; k.mode = 'crew'; k.pos.set(h.x, y0, zs - 15.5); k.yaw = 0; k.root.rotation.y = 0; k.h.hold('R', null); k.h.hold('L', null); k.pose = 'kneel'; C.kettil = k;
    this.hallFires = [g.fx.addFire(h.x, y0 + 0.3, h.z - 4, 1.1), g.fx.addFire(h.x, y0 + 0.3, h.z + 3, 1.1)];
    const eye = (n, up = 1.45) => [n.pos.x, n.pos.y + up, n.pos.z], cam = {
      kettil: () => ({ from: [h.x + 1.6, y0 + 1.1, zs - 13.2], look: eye(k, 0.95), fov: 36 }), hakon: () => ({ from: [h.x - 1.2, y0 + 1.5, zs - 12.6], look: eye(hk, hk.pose === 'sit' ? 1.0 : 1.55), fov: 34 }),
      table: () => ({ from: [h.x + 0.4, y0 + 3.1, zs - 20], to: [h.x - 0.4, y0 + 2.5, zs - 17.5], look: [h.x, y0 + 1.0, zs - 6], fov: 46 }),
      rurik: () => ({ from: [h.x + 0.6, y0 + 1.3, zs - 8.2], look: eye(C.rurik, 0.95), fov: 30 }), sigurd: () => ({ from: [h.x - 0.4, y0 + 1.3, zs - 7.4], look: eye(C.sigurd, 0.95), fov: 30 }),
      vigdis: () => ({ from: [h.x + 0.6, y0 + 1.6, zs - 5.6], look: eye(C.vigdis, 1.5), fov: 30 }),
    };
    const shots = HALL_LINES.map(([who, sp, text], i) => { const v = cam[who](), dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.25, v.from[1], v.from[2] + 0.2], look: () => cam[who]().look, fov: v.fov, sub: [sp, text, dur - 0.3],
      onStart: () => { if (i === 6) { hk.pose = null; this.hakonWalk = { t: 0 }; } if (i === 9) { g.audio.play('steel', { vol: 0.5 }); } if (i === 3) g.audio.setMusic('raid'); } }; });
    g.ui.fade(false, 1.2);
    g.cine.play([{ dur: 5, from: [h.x, y0 + 5.5, h.z - h.hl - 16], to: [h.x, y0 + 2.4, h.z - h.hl - 4], look: [h.x, y0 + 2, h.z], fov: 44, sub: ['', "On Svartøy, Kettil limps into Håkon's hall. Håkon is eating with his seven champions.", 4.6] }, ...shots], { onEnd: () => this.endHall() });
  }
  endHall() {
    const g = this.g, c = this.c, p = g.player;
    g.ui.fade(true, 1.2).then(() => {
      for (const n of Object.values(this.hallCast)) n.visible = false; this.hallSet.visible = false; for (const f of this.hallFires) g.fx.removeFire(f); this.hallFires = [];
      p.root.visible = true; p.frozen = false; this.hallOn = false; g.ravens.setMode('follow');
      p.teleport(...c.B(-3, 123), 0.4); g.quests.notify('event', 'a2hall');
      return g.ui.fade(false, 1.2);
    });
  }

  // =====================================================================================
  steps = {
    'q_axe.home'(r) {
      const g = this.g, c = this.c, p = g.player;
      c.setPhase('raid', r); this.stage(false); p.mortal = false;
      c.npc('bjorn').visible = false;
      for (const [i, id] of ['v1', 'v3', 'v5', 'v7', 'girl1', 'girl2', 'signe'].entries()) { const n = c.post(id, [20 + i * 6, 130 + (i % 3) * 7, 0]); n.goTo(c.W.hallDoor.x + (i % 3) - 1, c.W.hallDoor.z + 0.6, { run: true, onArrive: (o) => { o.visible = false; } }); } // running for the longhouse
      if (!r) { p.frozen = true; p.teleport(...c.B(92, 60), -2.6); g.ui.card("The Farmer's Axe", 'They come back at sunset with thirty men.', 4.5).then(() => { p.frozen = false; c.sub('Fire arrows hit the thatch. The barley field goes up in a sheet of flame. Villagers run toward the longhouse.', 7); g.audio.play('horn', { freq: 90, vol: 0.5 }); }); }
    },
    'q_axe.stone'(r) { this.c.setPhase('raid', r); this.stage(false); this.g.player.mortal = false; this.c.npc('bjorn').visible = false; this.g.ui.hint('{interact} at the door of the longhouse'); },
    'q_axe.yard'(r) { const c = this.c; c.setPhase('raid', r); this.stage(true); if (r) { this.g.player.teleport(...c.B(-3.6, 124), 0.6); c.setColumn(34, 150, -1.6, true); c.riders.men.forEach((n) => { n.visible = false; }); } this.startWave(1); c.hint('melee'); },
    'q_axe.barn'(r) { const c = this.c; c.setPhase('raid', r); this.stage(true); if (r) this.g.player.teleport(...c.B(20, 124), 1.2); this.startWave(2); this.g.ui.hint('Stand by the barn door. When they are in front of it: {interact}'); },
    'q_axe.sty'(r) { const c = this.c; c.setPhase('raid', r); this.stage(true); if (r) this.g.player.teleport(...c.B(38, 150), 1.5); this.startWave(3); c.hint('raid'); },
    'q_axe.lane'(r) { const c = this.c; c.setPhase('raid', r); this.stage(true); if (r) this.g.player.teleport(...c.B(-40, 150), -1.5); this.strap = false; this.startWave(4); c.hint('raid'); },
    'q_axe.captain'(r) { const c = this.c; c.setPhase('raid', r); this.stage(true); if (r) this.g.player.teleport(...c.B(-6, 146), 1.5); this.seq = null; this.startWave(5); },
    'q_axe.children'(r) {
      const g = this.g, c = this.c;
      c.setPhase('raid', r); this.stage(true); this.ignite(true); g.combat.clear(); g.player.mortal = false; this.barnT = A2.raid.barn.secs; this.rescuing = false;
      const k = c.column().k; k.visible = true; k.mode = 'idle'; k.cb = null; if (r) { k.teleport(...c.B(9.5, 144.5), 2); g.player.teleport(...c.B(8, 143), 1.2); } k.setLoop('lie'); k.h.hold('R', null); k.talk = null;
      for (let i = 0; i < 6; i++) c.npc('kid' + i).visible = false;
    },
    'q_axe.brooch'(r) {
      const g = this.g, c = this.c, bp = this.broochPos();
      c.setPhase('raid', r); this.stage(true); g.combat.clear(); g.player.mortal = false; c.hint(null); g.audio.setMusic('sorrow');
      c.column().k.visible = false; c.riders.horse.visible = false; c.riders.on = false; for (const n of this.pool) if (!n.dead) n.visible = false;
      for (let i = 0; i < 6; i++) { const n = c.npc('kid' + i); n.visible = true; n.held = true; if (r) n.teleport(...c.B(-2 + i * 1.1, 123.4), 0); n.setLoop('cower'); }
      this.broochMesh.visible = true; this.broochMesh.position.set(bp.x, g.world.groundAt(bp.x, bp.z) + 0.05, bp.z);
      if (!this.blood) { this.blood = g.world.makeTracks([[bp.x, bp.z], c.B(40, 147), c.B(100, 133), c.B(118, 128)], 1.1); this.blood.userData.mat.color.set(0x5a0c0a); this.blood.userData.mat.opacity = 0.8; }
      this.blood.visible = true;
      for (const f of this.fires.slice(-3)) f.size = 1.0; // the barn roof is beaten out
    },
    'q_axe.well'(r) {
      const g = this.g, c = this.c;
      c.setPhase('after', r); g.player.mortal = false; c.ensureArmed(); if (g.player.equipped !== 'none') g.player.equip('none');
      for (const f of this.fires) f.size = Math.min(f.size, 0.8); c.act.glowTarget = 0.25;
      c.post('freydis', [9.9, 140.3, 1.2, 'sit']); c.post('bjorn', [-6, 124, 0.3]); c.post('signe', [-1, 123.4, 0.2, 'kneel']);
      for (let i = 0; i < 6; i++) c.post('kid' + i, [-2 + i * 1.1, 124.6, 0, 'cower']).held = true;
      for (const [i, id] of ['v1', 'v3', 'v5', 'v7', 'v8'].entries()) c.post(id, [-66 + i * 5, 172 + (i % 2) * 5, 2, i % 2 ? 'mourn' : null]);
      if (this.blood) this.blood.visible = true;
    },
    'q_wolf.hall'(r) {
      const g = this.g, c = this.c;
      this.st.flags.raided = true; c.setPhase('after', r); g.player.mortal = false;
      if (r) return this.playHall();
      g.player.frozen = true;
      g.ui.fade(true, 1.6).then(() => g.ui.card('', 'The raiders are fleeing. Bjornstead has lost four people, a third of its harvest and two houses. It has kept its children.', 7)).then(() => this.playHall());
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, D = c.W.barnDoor;
    if (this.doorT > 0) { this.doorT += dt; D.rotation.y = -Math.min(1.9, this.doorT * 9) * (this.doorT < 0.45 ? 1 : Math.max(0, 1 - (this.doorT - 0.45) * 0.8)); if (this.doorT > 1.8) { this.doorT = 0; D.rotation.y = 0; } }
    if (this.hallOn && this.hallCast) { // the hall's company are posed by hand: they sit on benches and a high seat
      const w = this.hakonWalk, hk = this.hallCast.hakon;
      if (w) { w.t = Math.min(1, w.t + dt / 7); const h = g.world.realm.svartoy.hall, zs = h.z + h.hl + 1; hk.pos.set(h.x + 0.9 * Math.sin(w.t * 3.14), h.y + 0.62 * Math.max(0, 1 - w.t * 6), zs - 3.3 - w.t * 10.4); hk.h.setLocomotion(w.t < 1 ? 1.2 : 0, false); }
      for (const n of Object.values(this.hallCast)) { n.h.setLoop(n.pose || null); if (n !== hk || !w) n.h.setLocomotion(0, false); n.h.update(dt); }
    }
    if (!q.isActive('q_axe')) return;
    if (this.seq) return this.updateSeq(dt);
    // a breath between waves
    const lull = (key, line) => { this.lullT = (this.lullT || 0) + dt; if (!this.lullSaid) { this.lullSaid = true; c.npc('bjorn').say(line, 3); p.health = Math.min(100, p.health + A2.raid.breath); } if (this.lullT > 3.4) { this.lullT = 0; this.lullSaid = false; q.notify('event', key); } };
    if (q.at('q_axe', 'yard') && this.wave === 1 && this.down()) lull('a2wave1', 'More coming. Breathe while you can.');
    else if (q.at('q_axe', 'barn') && this.wave === 2 && this.down()) lull('a2wave2', 'Good. Good! They are in the sty road now.');
    else if (q.at('q_axe', 'sty') && this.wave === 3 && this.down()) lull('a2wave3', 'The west road. Get your back to something.');
    else if (q.at('q_axe', 'lane') && this.wave === 4 && this.down()) lull('a2wave4', 'Where is the one on the black horse?');
    if (q.at('q_axe', 'sty')) { // the pigsty mud: a man who goes in slips, and cannot get up
      const [sx, sz] = c.B(50, 150);
      for (const e of g.combat.alive()) if (!this.mudded.has(e) && Math.abs(e.pos.x - sx) < 5.2 && Math.abs(e.pos.z - sz) < 4.2) { this.mudded.add(e); e.cb.state = 'stagger'; e.cb.t = A2.raid.mud.secs; e.cb.posture = 0; e.h.action = null; e.h.play('fall', A2.raid.mud.secs); g.audio.play('splash', { vol: 0.5 }); g.ui.toast('He slips in the pig-muck and cannot get up'); }
    }
    if (q.at('q_axe', 'children') && !this.rescuing && g.mode === 'play') {
      this.barnT -= dt; const n = Math.ceil(this.barnT);
      if (n !== this.barnShown) { this.barnShown = n; g.ui.hint(`The barn roof is going. The children are in the hayloft.  ${Math.max(0, n)}`); }
      if (this.t0 === undefined || (this.t0 += dt) > 2.2) { this.t0 = 0; g.audio.play('shout', { vol: 0.3 }); }
      if (this.barnT <= 0) c.fail('The Barn', 'The roof came down. Six children had hidden in the hayloft.');
    }
  }
}
