// Sea battles (open-world PROTOTYPE, part four). Hostile ships patrol, sight the Sea-Raven, give chase and
// shoot. Eirik can answer with volleys, strike a hull amidships under sail to break it, or let the two ships
// be lashed together and fight for the other deck with his crew, which is how these fights were settled.
// Enemy ships only trouble the Sea-Raven with Eirik at her steering oar. Design: docs/OPEN_WORLD.md.
import * as THREE from 'three';
import { heightAt } from '../world/terrain.js';
import { makeShip } from '../world/props.js';
import { M } from '../world/geo.js';
import { RAIDER_LOOKS, QUESTS } from '../data/act1.js';
import { KINDS } from './open_proto.js';
import { dampAngle, angleDiff, clamp, lerp } from '../core/util.js';

Object.assign(QUESTS, {
  s_pirates: {
    title: 'Wolves on the Water', kind: 'side', xp: 150,
    desc: 'Sea-wolves in one ship, the Skerry-Hound, have taken two traders in the water between Skorpa and the Skerry of Horns. Hroar Gull-Feeder commands her.',
    steps: [
      { id: 'find', text: 'Hunt the Skerry-Hound in the water south of Skorpa', type: 'event', key: 'sighted_hound', marker: { pos: [-250, 1270] } },
      { id: 'win', text: 'Sink the Skerry-Hound, or board her and clear her deck', type: 'event', key: 'foe_hound', marker: { dyn: 'hound' } },
    ],
  },
  s_irontooth: {
    title: 'The Iron Tooth', kind: 'side', xp: 250,
    desc: "The Ironwolf has sent a longship to find the man with the white raven. Hrut Half-Hand has her. She will find the Sea-Raven wherever she sails; better to choose the water.",
    steps: [{ id: 'win', text: "Meet the Iron Tooth at sea: sink her, or take her deck", type: 'event', key: 'foe_tooth', marker: { dyn: 'tooth' } }],
  },
});

const HOUND_WATER = [[-330, 1150], [-300, 1330], [-180, 1400], [-150, 1160]];
const FOES = {
  hound: { name: 'the Skerry-Hound', L: 13.5, B: 3.4, D: 1.15, rise: 1.7, mast: 7.2, seed: 31, hull: 90, men: 7, minMen: 4, fast: 12.2, sight: 140, who: 'Sea-wolf', loot: 70, pts: HOUND_WATER, kinds: [null, 'archer', 'berserk'],
    captain: { name: 'Hroar Gull-Feeder', opts: { hp: 200, dmg: 16, skill: 0.6, boss: true, rageLine: 'I have fed the gulls better men than you!' } }, hail: 'A striped sail, and fat with silver. Out oars! Run her down!' },
  tooth: { name: 'the Iron Tooth', L: 19, B: 4.0, D: 1.4, rise: 2.3, mast: 9, seed: 41, hull: 170, men: 9, minMen: 6, fast: 13.4, sight: 260, who: "Ironwolf's man", loot: 160, kinds: [null, 'shield', 'archer', 'shield', 'archer'], pts: [[60, 640], [150, 900], [40, 1120], [-140, 930], [-120, 700]],
    captain: { name: 'Hrut Half-Hand', opts: { hp: 300, dmg: 19, skill: 0.7, boss: true, reach: 2.3, rageLine: 'The jarl wants the bird alive. He said nothing about you!' } }, hail: 'There. The white raven, as the jarl said. Lay us alongside!' },
  wolf: { name: 'a sea-wolf', L: 12.5, B: 3.1, D: 1.05, rise: 1.5, mast: 6.8, seed: 51, hull: 70, men: 5, minMen: 3, fast: 11.8, sight: 130, who: 'Sea-wolf', loot: 35, pts: HOUND_WATER, kinds: ['archer'], hail: 'A sail! Ours now. Pull!' },
};
const WOLF_NAMES = ['the Grey Gull', 'the Bone-Comb', 'the Wet Hen', 'the Crab-Mother'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const _v = new THREE.Vector3();

export class SeaWar {
  constructor(game, open) { this.g = game; this.open = open; this.foes = []; this.arrows = []; this.lash = null; this.t = 0; this.volleyCd = 0; this.ramCd = 0; this.wolfT = 0; this.patchT = 0; this.built = false; this.bar = false; }
  get st() { return this.g.state; }
  get ship() { return this.open.mounts.ship; }
  /** A named foe that is still afloat and fighting. */
  foe(kind) { return this.foes.find((f) => f.kind === kind && f.state !== 'gone' && f.state !== 'sinking') || null; }

  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g, s = this.ship, rec = this.open.fleet.rec;
    if (rec && rec.hull != null) s.hull = rec.hull;
    this.darkSail = M.sail.clone(); this.darkSail.color.set(0x565a66); this.darkSail.onBeforeCompile = M.sail.onBeforeCompile; this.darkSail.customProgramCacheKey = M.sail.customProgramCacheKey; // a copy does not carry the wind with it
    const ag = new THREE.CylinderGeometry(0.016, 0.016, 0.8, 4); ag.rotateX(Math.PI / 2);
    const am = new THREE.MeshBasicMaterial({ color: 0x2a2018 });
    for (let i = 0; i < 28; i++) { const mesh = new THREE.Mesh(ag, am); mesh.visible = false; g.scene.add(mesh); this.arrows.push({ mesh, on: false, a: new THREE.Vector3(), b: new THREE.Vector3(), t: 0, T: 1, land: null }); }
    if (!this.st.flags.foe_hound) this.spawn('hound');
    // the Sea-Raven cannot be steered through another hull
    this.open.mounts.blocked = (nx, nz, v) => v === s && this.foes.some((f) => f.state !== 'gone' && f.state !== 'sinking' && this.gap(s, f, nx, nz).d < s.hw + f.hw + 0.2 && this.gap(s, f, nx, nz).d < this.gap(s, f).d);
  }
  spawn(kind, name) {
    const d = FOES[kind], g = this.g;
    const model = makeShip({ L: d.L, B: d.B, D: d.D, rise: d.rise, sail: false, shields: true, mast: d.mast, seed: d.seed });
    const k = d.mast / 9.5, sg = new THREE.PlaneGeometry(6.8 * k, 5.6 * k, 6, 4), sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.cos((sp.getX(i) / (3.4 * k)) * 1.4) * 0.7 * k * (0.4 + 0.6 * (0.5 - sp.getY(i) / (5.6 * k))));
    sg.computeVertexNormals();
    const sail = new THREE.Mesh(sg, this.darkSail); sail.position.set(0, model.userData.yardY - 2.85 * k, 0.22); model.add(sail);
    const y0 = -d.D * 0.34, p0 = d.pts[0];
    model.position.set(p0[0], y0, p0[1]); g.scene.add(model);
    const f = { kind, def: d, name: name || d.name, model, pos: model.position, yaw: 0, speed: 0, hull: d.hull, maxHull: d.hull, men: d.men, state: 'patrol', k: 1,
      volleyT: 3, lostT: 0, cool: 0, stun: 0, stuck: 0, hl: d.L * 0.42, hw: d.B / 2, y0, sail };
    this.foes.push(f);
    return f;
  }

  // ---- geometry ---------------------------------------------------------------------------------
  /** Five points along a hull's keel. */
  pts(v, x = v.pos.x, z = v.pos.z) { const sy = Math.sin(v.yaw), cy = Math.cos(v.yaw); return [-1, -0.5, 0, 0.5, 1].map((k) => [x + sy * v.hl * k, z + cy * v.hl * k]); }
  /** Least distance between two keels, and which part of the first is nearest (4 = her bow). */
  gap(a, b, ax, az) {
    const A = this.pts(a, ax, az), B = this.pts(b); let d = Infinity, ia = 0;
    for (let i = 0; i < 5; i++) for (const q of B) { const e = Math.hypot(A[i][0] - q[0], A[i][1] - q[1]); if (e < d) { d = e; ia = i; } }
    return { d, ia };
  }
  onHull(v, b) { return this.pts(v).some((q) => Math.hypot(q[0] - b.x, q[1] - b.z) < v.hw + 1.0); }
  steer(f, tx, tz, top, dt) {
    let want = Math.atan2(tx - f.pos.x, tz - f.pos.z);
    const probe = (a) => heightAt(f.pos.x + Math.sin(f.yaw + a) * 30, f.pos.z + Math.cos(f.yaw + a) * 30);
    if (probe(0) > -3) want = f.yaw + (probe(0.7) < probe(-0.7) ? 1.1 : -1.1); // land ahead: turn toward deeper water
    f.yaw = dampAngle(f.yaw, want, 1.1, dt);
    const turning = Math.abs(angleDiff(f.yaw, want));
    f.speed += ((turning > 1.2 ? Math.min(top, 4) : top) - f.speed) * Math.min(1, dt * 0.7);
    const nx = f.pos.x + Math.sin(f.yaw) * f.speed * dt, nz = f.pos.z + Math.cos(f.yaw) * f.speed * dt;
    if (heightAt(nx, nz) < -1.5) { f.pos.x = nx; f.pos.z = nz; f.stuck = 0; } else { f.speed *= 0.5; f.stuck += dt; }
  }

  // ---- arrows -----------------------------------------------------------------------------------
  loose(ax, ay, az, bx, by, bz, land) {
    const a = this.arrows.find((x) => !x.on);
    if (!a) return;
    a.on = true; a.a.set(ax, ay, az); a.b.set(bx, by, bz); a.t = 0; a.T = a.a.distanceTo(a.b) / 30 + 0.35; a.land = land; a.mesh.visible = true;
  }
  /** The Sea-Raven's answer: every hand aboard, and Eirik if he has an arrow. */
  volley() {
    const g = this.g, s = this.ship, inv = g.inventory;
    if (this.volleyCd > 0) return;
    const near = this.foes.filter((x) => x.state === 'chase' || x.state === 'patrol').map((x) => ({ x, d: this.gap(s, x).d })).filter((o) => o.d < 48).sort((a, b) => a.d - b.d)[0];
    if (!near) { if (this.t - (this.noT || -9) > 4) { this.noT = this.t; g.ui.toast('No hostile sail within bowshot.'); } return; }
    const own = inv.count('arrow') > 0, n = s.hands + (own ? 1 : 0), f = near.x, T = near.d / 30 + 0.35;
    if (!n) { g.ui.toast('Nobody aboard has a bow to string.'); return; }
    if (own) inv.remove('arrow', 1, true);
    this.volleyCd = 3.4; g.audio.play('bow');
    const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw), fy = Math.sin(f.yaw), fc = Math.cos(f.yaw);
    let hits = 0;
    for (let i = 0; i < n; i++) {
      const k = (Math.random() * 2 - 1) * f.hl * 0.9, w = (Math.random() * 2 - 1) * f.hw * 2, o = (Math.random() * 2 - 1) * s.hl * 0.6;
      this.loose(s.pos.x + sy * o, 1.5, s.pos.z + cy * o, f.pos.x + fy * (k + f.speed * T) + fc * w, 0.6, f.pos.z + fc * (k + f.speed * T) - fy * w, (b) => {
        if (f.state === 'gone' || f.state === 'sinking' || !this.onHull(f, b)) { g.fx.burst('splash', b.x, 0.05, b.z, 3); return; }
        g.fx.burst('chips', b.x, 0.9, b.z, 3);
        if (hits < 2 && Math.random() < 0.45 && f.men > f.def.minMen) { hits++; f.men--; g.audio.play('arrowHit', { vol: 0.6 }); } // the last of them keep behind the shield-rail
        else f.hull -= 0.3; // arrows thin a crew; they do not sink ships
      });
    }
    if (f.state === 'patrol') this.sight(f);
  }
  foeVolley(f) {
    const g = this.g, p = g.player, s = this.ship, n = clamp(Math.round(f.men / 2), 1, 5), shields = g.input.held('block');
    f.volleyT = 4.4 + Math.random() * 1.6; g.audio.play('bow', { vol: 0.5 });
    const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw), fy = Math.sin(f.yaw), fc = Math.cos(f.yaw), T = this.gap(s, f).d / 30 + 0.35;
    let hurt = false;
    for (let i = 0; i < n; i++) {
      const k = (Math.random() * 2 - 1) * s.hl + s.speed * T * (0.7 + Math.random() * 0.5), w = (Math.random() * 2 - 1) * s.hw * 2.4, o = (Math.random() * 2 - 1) * f.hl * 0.7;
      this.loose(f.pos.x + fy * o, 1.6, f.pos.z + fc * o, s.pos.x + sy * k + cy * w, 0.6, s.pos.z + cy * k - sy * w, (b) => {
        if (!this.onHull(s, b)) { g.fx.burst('splash', b.x, 0.05, b.z, 3); return; }
        s.hull -= (shields ? 0.8 : 2) * (g.skills.has('y_rail') ? 0.6 : 1); g.audio.play('clack', { vol: 0.5 }); g.fx.burst('chips', b.x, 0.9, b.z, 4);
        if (!shields && !hurt && this.open.mounts.on === s && Math.random() < 0.3) { hurt = true; p.health = Math.max(0, p.health - 6); g.audio.play('hurt'); p.cam.shake = 0.2; if (p.health <= 0) g.events.emit('playerDied'); }
      });
    }
  }

  // ---- what a foe does ----------------------------------------------------------------------------
  sight(f) {
    const g = this.g, fl = this.st.flags;
    f.state = 'chase'; f.lostT = 0; f.volleyT = 2.5;
    g.ui.subtitle(f.def.captain ? f.def.captain.name : 'Sea-wolf steersman', f.def.hail, 4.5); g.audio.play('horn', { freq: 98, vol: 0.5 }); g.audio.setMusic('raid');
    if (!fl.seaHint) { fl.seaHint = true; g.ui.tip('A hostile sail. {attack} looses a volley within bowshot; hold {block} for shields. Strike her side under sail to break her hull, or let her come alongside and fight for her deck.'); }
    g.quests.notify('event', 'sighted_' + f.kind);
  }
  lose(f) {
    f.state = 'patrol'; f.cool = 50; f.lostT = 0;
    if (!this.foes.some((x) => x.state === 'chase')) this.g.audio.setMusic('day');
    this.g.ui.toast(`${cap(f.name)} gives up the chase.`);
  }
  contact(f) {
    const s = this.ship;
    if (s.speed >= 8.5 && this.gap(s, f).ia === 4) { if (this.ramCd <= 0) this.ram(f); else s.speed = -1; return; } // stem first, at speed
    if (this.ramCd < 2.5) this.grapple(f); // slow, hull to hull: they throw hooks
  }
  ram(f) {
    const g = this.g, s = this.ship, sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
    const stem = g.skills.has('y_stem'); // Iron Stem
    this.ramCd = 5; f.hull -= stem ? 65 : 45; s.hull -= stem ? 5 : 10; f.stun = 3; f.speed = 0; s.speed = -1.5;
    if (f.men > f.def.minMen) f.men--;
    if (heightAt(f.pos.x + sy * 2.2, f.pos.z + cy * 2.2) < -1.5) { f.pos.x += sy * 2.2; f.pos.z += cy * 2.2; }
    g.audio.play('thud'); g.audio.play('split'); g.player.cam.shake = 0.5;
    for (let i = 0; i < 4; i++) g.fx.burst('splash', s.pos.x + sy * s.hl + (Math.random() - 0.5) * 3, 0.1, s.pos.z + cy * s.hl + (Math.random() - 0.5) * 3, 8);
    g.ui.toast(f.hull > 0 ? 'Your stem bites into her side. Timber breaks.' : 'Your stem goes through her side.');
  }
  sink(f, burnt) {
    const g = this.g;
    f.state = 'sinking'; f.sinkT = 0; f.speed = 0; f.burnt = !!burnt;
    if (burnt) f.fire = g.fx.addFire(f.pos.x, 1.0, f.pos.z, 1.8);
    else { g.ui.toast(`${cap(f.name)} goes down. Nothing of hers will be weighed in silver.`); this.defeat(f); }
    if (!this.foes.some((x) => x.state === 'chase')) g.audio.setMusic('day');
  }
  defeat(f) {
    const g = this.g;
    if (f.kind !== 'wolf') this.st.flags['foe_' + f.kind] = true;
    this.st.xp += 40; g.quests.notify('event', 'foe_' + f.kind);
    if (f.kind === 'wolf') this.open.law.addStanding(6, 'One sea-wolf fewer');
  }

  // ---- lashed together ------------------------------------------------------------------------------
  grapple(f) {
    const g = this.g, s = this.ship, cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    const side = (f.pos.x - s.pos.x) * cy - (f.pos.z - s.pos.z) * sy >= 0 ? 1 : -1; // is she to starboard or to port
    const w = s.hw + f.hw + 0.05, same = Math.abs(angleDiff(f.yaw, s.yaw)) < Math.PI / 2;
    f.state = 'lashed'; f.speed = 0; s.speed = 0; s.sailUp = false; this.ramCd = 0;
    if (g.ravens.eye) g.ravens.exitEye(); // no time for birds
    this.lash = { f, phase: 'closing', t: 0, men: [], decks: [], from: [f.pos.x, f.pos.z, f.yaw], to: [s.pos.x + cy * side * w, s.pos.z - sy * side * w, same ? s.yaw : s.yaw + Math.PI] };
    g.audio.play('thud'); g.audio.setMusic('raid');
    g.ui.subtitle(f.def.captain ? f.def.captain.name : 'Sea-wolf steersman', 'Hooks! Make fast! Over the rail!', 3.5);
  }
  startFight() {
    const g = this.g, p = g.player, o = this.open, s = this.ship, L = this.lash, f = L.f, w = g.world;
    f.pos.set(L.to[0], f.y0, L.to[1]); f.yaw = L.to[2]; f.model.rotation.set(0, f.yaw, 0);
    s.pos.y = s.y0; s.model.rotation.set(0, s.yaw, 0);
    L.decks = [w.addDeck({ x: s.pos.x, z: s.pos.z, yaw: s.yaw, hw: s.hw + 0.3, hl: s.hl - 1.0, y: s.y0 + s.model.userData.deckY }),
      w.addDeck({ x: f.pos.x, z: f.pos.z, yaw: f.yaw, hw: f.hw + 0.3, hl: f.hl - 1.0, y: f.y0 + f.model.userData.deckY })];
    const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw), back = -(s.hl - 3.4);
    o.mounts.leaveHelm(); p.teleport(s.pos.x + sy * back, s.pos.z + cy * back, s.yaw); p.mortal = true;
    o.fleet.standTo();
    // her crew along her deck, the captain amidships
    const fy = Math.sin(f.yaw), fc = Math.cos(f.yaw), n = f.men, order = [...Array(n).keys()].sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2));
    order.forEach((slot, i) => {
      const c = i === 0 && f.def.captain, v = n > 1 ? (-1 + (2 * slot) / (n - 1)) * (f.hl - 2.4) : 0, u = (slot % 2 ? 0.5 : -0.5) * f.hw;
      const k = !c && f.def.kinds && KINDS[f.def.kinds[i]];
      const e = o.fighter(`${f.kind}_${i}`, c ? c.name : f.def.who + (k ? k.tag : ''), RAIDER_LOOKS[(i + (f.kind === 'tooth' ? 0 : 1)) % 4], f.pos.x + fy * v + fc * u, f.pos.z + fc * v - fy * u, ['axe', 'sword', 'spear'][i % 3], c ? { ...c.opts } : k ? { ...k.opts } : { hp: 95 });
      e.cb.keepDry = true; L.men.push(e);
    });
    L.phase = 'fight';
    g.ui.hint('Lashed hull to hull. Clear her deck: each of your crew takes a man. The steering oar is no use until it is done.');
  }
  take() {
    const g = this.g, L = this.lash, f = L.f;
    L.phase = 'won';
    if (!g.combat.alive().length) { g.combat.clear(); g.audio.setMusic('day'); }
    g.inventory.add('silver', f.def.loot); g.ui.questBanner('Taken at sea', cap(f.name));
    g.ui.toast(`${f.def.loot} in silver from her sea-chests.`);
    const prize = { hound: ['sword', "Hroar's sword"], tooth: ['longaxe', "Hrut's long axe"] }[f.kind]; // a captain's weapon goes to whoever took his deck
    if (prize && !g.inventory.has(prize[0])) { g.inventory.add(prize[0], 1); g.ui.toast(`${prize[1]} is yours. {weapon1} steps through your weapons.`.replace('{weapon1}', g.input.label('weapon1'))); }
    this.defeat(f);
    g.ui.hint('Her deck is yours. Go back to your own steering oar with {interact} to cut her loose.');
  }
  cutLoose() {
    const g = this.g, L = this.lash, f = L.f;
    for (const d of L.decks) g.world.removeDeck(d);
    for (const e of L.men) e.visible = false;
    this.lash = null; this.sink(f, true);
    g.ui.toast(`You cut ${f.name} loose and fire her. She burns to the waterline.`);
  }

  // ---- talk ---------------------------------------------------------------------------------------
  /** What the reeve says once the tithe is broken: the sea-wolves, then the longship. */
  reeveOffer() {
    const q = this.g.quests, R = 'Ragnhild Reeve', none = { choices: [], nodes: [] };
    if (!q.isDone('s_tithe')) return none;
    if (!q.st.s_pirates) return { choices: [{ t: '"The tithe is broken. What else troubles the Skerries?"', to: 'ship' }], nodes: [
      { id: 'ship', s: R, t: 'Sea-wolves. One ship, the Skerry-Hound, working the water south of Skorpa. Two traders gone since midsummer, and Hroar Gull-Feeder laughing about it in every harbour that will have him.' },
      { s: R, t: 'She will come for a sail like yours. Loose arrows as she closes. Strike her side under sail and you may break her. Or let her lay alongside, and take her deck: that way you keep what she carries.', to: 'end', fx: { quest: 's_pirates' } },
    ] };
    if (q.isDone('s_pirates') && !q.st.s_irontooth) return { choices: [{ t: '"The Skerry-Hound will take no more traders."', to: 'ship' }], nodes: [
      { id: 'ship', s: R, t: 'Then hear the rest of it. A longship with a dark sail came through the Fedje sound at dawn, asking every boat for a man with a white raven. The Iron Tooth. Hrut Half-Hand has her.' },
      { s: R, t: 'The Ironwolf does not send Hrut to collect tithes. She will find you whatever you do, {n}. Fill your benches, mend your hull, and choose your own water to meet her in.', to: 'end', fx: { quest: 's_irontooth' } },
    ] };
    return none;
  }
  /** Any ferryman will mend the Sea-Raven if she lies near his harbour. */
  mendOffer(n) {
    const g = this.g, s = this.ship, silver = g.inventory.count('silver');
    if (!this.open.fleet.owned || s.hull >= 100 || n.dist(s) > 260) return { choices: [], nodes: [] };
    const cost = Math.ceil((100 - s.hull) / 4);
    return { choices: [{ t: `Mend the Sea-Raven's hull (${cost} silver, you carry ${silver})`, to: silver >= cost ? 'mended' : 'mpoor', fx: silver >= cost ? { do: () => { g.inventory.remove('silver', cost, true); s.hull = 100; g.audio.play('chop'); } } : null }],
      nodes: [{ id: 'mended', s: n.name, t: 'Tar, wool, and a day I will not charge you for. She is sound.', to: 'end' }, { id: 'mpoor', s: n.name, t: 'Planks cost what planks cost.', to: 'end' }] };
  }

  steps = {
    's_pirates.find'() { this.open.build(); const f = this.foe('hound'); if (this.st.flags.foe_hound || (f && f.state !== 'patrol')) this.g.after(0.2, () => this.g.quests.notify('event', 'sighted_hound')); },
    's_pirates.win'() { this.open.build(); if (this.st.flags.foe_hound) this.g.after(0.2, () => this.g.quests.notify('event', 'foe_hound')); },
    's_irontooth.win'(r) { this.open.build(); if (!r) this.g.ui.hint('The Iron Tooth is hunting. She is bigger than the Sea-Raven and nearly as fast; ferrymen will mend your hull before you meet her.'); },
  };
  questDone(id) {
    const g = this.g, o = this.open.st.open;
    if (id === 's_pirates') { g.inventory.add('silver', 40); this.open.law.addStanding(20, 'The sea lanes are safer'); }
    if (id === 's_irontooth') { o.sk.standing = Math.min(100, o.sk.standing + 30); o.standing = Math.min(100, o.standing + 15); g.ui.toast('Both districts will hear of this (+30 the Skerries, +15 the Vestland). What the Ironwolf does next is not built yet.'); }
  }

  update(dt) {
    if (!this.built) return;
    const g = this.g, p = g.player, o = this.open, m = o.mounts, s = this.ship, fleet = o.fleet, q = g.quests, fl = this.st.flags, play = g.mode === 'play';
    this.t += dt; this.volleyCd -= dt; this.ramCd -= dt;
    const helm = m.on === s; // Eirik at the steering oar
    if (q.isActive('s_irontooth') && !fl.foe_tooth && !this.foes.some((f) => f.kind === 'tooth')) this.spawn('tooth');
    if (play && fl.foe_hound && !q.isActive('s_irontooth') && !this.foes.some((f) => f.state !== 'gone')) { // afterwards the odd sea-wolf still turns up
      this.wolfT += dt;
      if (this.wolfT > 420) { this.wolfT = 0; this.spawn('wolf', WOLF_NAMES[(Math.random() * WOLF_NAMES.length) | 0]); }
    }
    // the crew patch what they can when nothing is after her; a ferryman does the rest
    const hunted = this.foes.some((f) => f.state === 'chase' || f.state === 'lashed');
    const patch = g.skills.has('y_wright') ? 80 : 50; // Shipwright's Eye
    if (fleet.owned && !hunted && s.hull < patch && Math.abs(s.speed) < 0.3 && (this.patchT += dt) > 4) { this.patchT = 0; s.hull = Math.min(patch, s.hull + 1); }
    o.law.extra = [fleet.owned && (helm || s.hull < 100 || this.lash) ? `Sea-Raven · hull ${Math.max(0, Math.ceil(s.hull))}` : '', fleet.status || ''].filter(Boolean).join(' · ');
    if (fleet.owned && s.hull <= 0 && !this.lost) { this.lost = true; g.ui.subtitle('Eirik', 'She is opening up. She is going down!', 3); o.fail(); }
    if (play && helm && g.input.hit('attack')) this.volley();

    let shown = null;
    for (const f of this.foes) {
      if (f.state === 'gone' || f.state === 'lashed') continue;
      if (f.state === 'sinking') {
        f.sinkT += dt; f.pos.y -= dt * (f.burnt ? 0.2 : 0.34); f.model.rotation.z += dt * 0.07; f.model.rotation.x += dt * 0.025;
        if (f.fire) f.fire.y = Math.max(0.2, f.fire.y - dt * 0.05);
        if (this.t % 0.7 < dt) g.fx.burst('splash', f.pos.x + (Math.random() - 0.5) * f.hl, 0.1, f.pos.z + (Math.random() - 0.5) * f.hl, 5);
        if (f.sinkT > (f.burnt ? 13 : 9)) { g.scene.remove(f.model); f.state = 'gone'; if (f.fire) f.fire.on = false; }
        continue;
      }
      if (f.hull <= 0) { this.sink(f); continue; }
      const d = this.gap(s, f).d;
      f.stun -= dt; f.cool -= dt;
      if (f.state === 'patrol') {
        const t = f.def.pts[f.k];
        if (Math.hypot(t[0] - f.pos.x, t[1] - f.pos.z) < 28) f.k = (f.k + 1) % f.def.pts.length;
        else if (f.stuck > 14 && Math.hypot(p.pos.x - f.pos.x, p.pos.z - f.pos.z) > 220) { f.pos.x = t[0]; f.pos.z = t[1]; f.stuck = 0; } // aground and unseen
        this.steer(f, t[0], t[1], 5, dt);
        if (helm && play && f.cool <= 0 && d < f.def.sight) this.sight(f);
      } else { // chase
        shown = f;
        if (!helm) { f.speed *= 0.97; if ((f.lostT += dt) > 40) this.lose(f); } // he has gone ashore: lie off, then lose interest
        else {
          f.lostT = d > f.def.sight * 1.7 ? f.lostT + dt : 0;
          if (f.lostT > 8) { this.lose(f); continue; }
          const lead = clamp(d / 22, 0, 2.5), top = f.stun > 0 ? 0 : d < 14 ? Math.max(4, Math.abs(s.speed) + 2) : f.def.fast;
          this.steer(f, s.pos.x + Math.sin(s.yaw) * s.speed * lead, s.pos.z + Math.cos(s.yaw) * s.speed * lead, top, dt);
          f.volleyT -= dt;
          if (play && d < 44 && d > 7 && f.volleyT <= 0 && f.men >= 2) this.foeVolley(f);
          if (play && d < s.hw + f.hw + 0.5) this.contact(f);
        }
      }
      f.pos.y = f.y0 + Math.sin(this.t * 1.2 + f.hl) * 0.05;
      f.model.rotation.set(Math.sin(this.t * 0.85) * 0.025, f.yaw, Math.sin(this.t) * 0.03 + (f.speed > 6 ? 0.05 : 0));
    }

    const L = this.lash;
    if (L) {
      const f = L.f;
      if (L.phase === 'closing') { // hauled together
        L.t += dt; const k = Math.min(1, L.t / 0.7), e = k * k * (3 - 2 * k), dy = Math.atan2(Math.sin(L.to[2] - L.from[2]), Math.cos(L.to[2] - L.from[2]));
        f.pos.x = lerp(L.from[0], L.to[0], e); f.pos.z = lerp(L.from[1], L.to[1], e); f.yaw = L.from[2] + dy * e; f.model.rotation.set(0, f.yaw, 0);
        if (k >= 1) this.startFight();
      } else if (L.phase === 'fight') { if (L.men.every((e) => e.dead)) this.take(); }
      else if (m.on === s) this.cutLoose();
    }

    for (const a of this.arrows) {
      if (!a.on) continue;
      a.t += dt;
      const at = (u) => _v.set(lerp(a.a.x, a.b.x, u), lerp(a.a.y, a.b.y, u) + a.T * 12 * u * (1 - u), lerp(a.a.z, a.b.z, u)), u = Math.min(1, a.t / a.T);
      a.mesh.position.copy(at(u)); a.mesh.lookAt(at(Math.min(1.02, u + 0.03)));
      if (u >= 1) { a.on = false; a.mesh.visible = false; if (a.land) a.land(a.b); }
    }
    if (!g.combat.active) {
      if (shown) { g.ui.setTarget({ name: `${cap(shown.name)} · ${shown.men} men`, hp: shown.hull / shown.maxHull, posture: 0, broken: false }); this.bar = true; }
      else if (this.bar) { g.ui.setTarget(null); this.bar = false; }
    }
  }
}
