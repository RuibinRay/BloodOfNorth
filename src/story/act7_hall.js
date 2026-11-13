// Act VII, the end of the war: "The Hall of Wolves" (he goes in alone; why Håkon did it), "The Ironwolf" (the last
// fight, in four parts: the sword of the guardsman, the weapons of war, Wolf's Judgment in a burning hall, and the
// last oath, which is not won by striking), "What the Dead Leave Behind" (the steps of the burning hall; three days
// on Svartøy; Hauk's stone) and "The Crown of the North" (the law-rock at Gulen). See act7_sea.js.
import * as THREE from 'three';
import { POI } from '../world/layout.js';
import { dampAngle } from '../core/util.js';
import { QUESTS } from '../data/act1.js';
import { A7, TOLD, SAID, CROWN_LINES } from '../data/act7.js';
import { FOES, WAR } from './champions.js';
import { TEN } from './act4_home.js';
import { A7Part, HALL7 } from './act7_sea.js';

const RULERS = ['hroald', 'eystein', 'ragnvald', 'hallvard', 'aslak', 'svein', 'jorund', 'thora', 'gudmund'];
const FRIENDS = ['leif', 'ingrid', 'astrid', 'svanhild', 'torvald', 'halvar', 'kari', 'arvid', 'hauk', 'freydis', 'eyvind'];
const _p = new THREE.Vector3();

export class A7Hall extends A7Part {
  constructor(game, core) { super(game, core); this.fires = []; }
  get RS() { return this.g.world.realm.svartoy; }
  get G7() { return this.g.world.main.gulen7; }
  X(dx, dz) { return this.V7.X(dx, dz); }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, h = this.RS.hall, R = POI.lawRock;
    this.hakon = g.addNPC('a7hakon', { name: 'Jarl Håkon Ironwolf', look: FOES.find((f) => f.id === 'hakon').look }); this.hakon.visible = false;
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 2.6, priority: 3, label, enabled, use, ...o });
    I('a7ring', [h.x, h.z + 12.9], 'Pick up both halves of the oath-ring', () => q.at('q_ironwolf', 'ring') && !this.busy, () => this.ring());
    I('a7crown', [R.x, R.z + 2], 'Stand on the law-rock', () => q.at('q_crown', 'rock') && !this.busy, () => this.playCrown(), { r: 3.4 });
    g.events.on('swingStart', () => { const f = this.fin, e = this.hakon; if (f && f.state === 'wait' && e.dist(g.player) < 3.4) { e.h.play('parry', 0.35); g.audio.play('steel', { vol: 0.6 }); g.ui.toast('He turns it aside. Stop attacking. Wait.'); } });
  }
  clear(phase) {
    const g = this.g, c = this.c, p = g.player, on = HALL7.includes(phase);
    this.hakon.visible = false; this.hakon.cb = null; this.G7.thing.set(phase === 'w7crown');
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    this.blazed = 0; this.busy = false; this.hd = null; this.fin = null; this.spin = null; this.spoke = false; this.rafter = null; this.roof = null; this.met = false;
    if (this.cold) { this.cold = false; p.stormDead = false; }
    if (this.smashed) { this.smashed = false; p.fx.noShield = 0; if (p.isMelee()) p.h.hold('L', p.offItem()); }
    if (!on) return;
    c.W.stages.searaven.set(false); c.act.glowTarget = { w7hall: 0.2, w7duel: 0.3, w7after: 0.85 }[phase] || 0;
    if (g.combat.active) g.combat.clear(); c.battle.sk = null;
  }
  fire(x, y, z, s) { const f = this.g.fx.addFire(x, y, z, s); this.fires.push(f); return f; }
  /** The hall alight: a brazier goes over, the banners catch, the rafters crack. k: how far it has gone. */
  blaze(k) {
    const g = this.g, c = this.c, h = this.RS.hall, y = h.y, was = this.blazed || 0;
    if (k <= was) return;
    this.blazed = k;
    if (was < 1) for (const [dx, dz] of [[-4.6, -9], [4.6, 1.5], [-4.6, 10]]) { this.fire(h.x + dx, y + 0.2, h.z + dz, 1.5); if (this.hd && !this.hd.done) g.combat.trap(h.x + dx, h.z + dz, { kind: 'fire', r: 2.0, sec: 9999, dmg: 8, arm: 1.5 }); }
    if (was < 1) for (const s of [-1, 1]) for (const zz of [-6.6, 1.4, 9.4]) this.fire(h.x + s * 3.5, y + 5.2, h.z + zz, 1.3); // the old banners
    if (k > 1) for (const [dx, dz, s] of [[0, -12, 2.4], [-5, 0, 2.2], [5, 12, 2.2], [0, 6, 1.6]]) this.fire(h.x + dx, y + (dx ? 3 : 6.6), h.z + dz, s);
    c.act.glowTarget = k > 1 ? 0.9 : 0.6; g.audio.play('ignite');
  }
  /** Who is where: in the hall, in its yard, by the shore three days on, and round the law-rock. */
  dress(name) {
    const g = this.g, c = this.c, p = g.player, w = g.world, h = this.RS.hall, y = h.y, zs = h.z + h.hl + 1, hk = this.hakon, iw = this.at('q_ironwolf'), T = c.sea.town, J = c.battle.jarn;
    const at = (id, dx, dz, face, loop, hold) => this.put(id, ...this.X(dx, dz), face, loop, hold);
    for (const f of this.fires) g.fx.removeFire(f); this.fires = []; this.blazed = 0;
    if (name === 'w7hall' || name === 'w7duel') {
      this.fire(h.x, y + 0.3, h.z - 4, 1.1); this.fire(h.x, y + 0.3, h.z + 3, 1.1); // the long fire
      hk.revive(); hk.talk = null;
      if (name === 'w7hall') { this.fix(hk, h.x, y + 0.62, zs - 3.3, Math.PI, 'sit'); hk.h.hold('R', null); hk.h.hold('L', null); }
      else if (iw === 0) this.put(hk, h.x - 1.9, h.z + 12.4, Math.PI, 'guard', 'sword').h.hold('L', 'shield');
      else { this.fix(hk, h.x - 0.8, y + 0.1, h.z + 8, 0.7, 'dead'); hk.h.hold('R', null); hk.h.hold('L', null); this.blaze(2); }
      at('svanhild', -2.4, 87, this.X(0, 98), null, 'sword'); at('leif', 2.6, 87.6, this.X(0, 98)); at('astrid', 5.4, 85, this.X(0, 98)).h.hold('L', 'bow');
      return;
    }
    if (name === 'w7after') { // the battle is over
      for (const [dx, dz, s] of [[0, 104, 4.2], [-3, 116, 4.6], [3, 128, 4.2]]) { const [x, z] = this.X(dx, dz); this.fire(x, y + 6.4, z, s); }
      at('leif', 3.4, 84, this.X(0, 95)); at('svanhild', -6, 83, this.X(-12, 70), null, 'sword');
      at('astrid', 8, 80, this.X(9, 60), 'carry'); at('kari', 9.4, 80.6, this.X(9, 60), 'carry');
      J.slice(0, 1).forEach((n) => { n.revive(); n.name = "One of Håkon's warriors, wounded"; const [x, z] = this.X(8.7, 81.6); this.fix(n, x, w.groundAt(x, z) + 0.9, z, 1.6, 'dead'); n.talk = null; });
      at('torvald', -10, 79, this.X(-12, 81), 'sit'); T.slice(0, 4).forEach((n, i) => { n.revive(); n.name = 'A freed thrall'; this.put(n, ...this.X(-13 + (i % 2) * 2.2, 80 + Math.floor(i / 2) * 2), this.X(-10, 79), 'sit'); n.talk = null; });
      at('hroald', -3, 75.6, this.X(-2.2, 75.6)); at('arvid', -2.2, 75.6, this.X(-3, 75.6));
      J.slice(2, 6).forEach((n, i) => { n.revive(); n.name = "One of Håkon's last warriors"; this.put(n, ...this.X(12 + i * 1.6, 88 + (i % 2)), this.X(0, 86), 'kneel'); n.talk = null; });
      return;
    }
    if (name === 'w7graves') {
      const st = this.V7.graves.stone;
      this.put('hauk', st[0] + 1.1, st[1] + 0.5, st, 'kneel', 'hammer');
      at('leif', -14, -230, st); at('ingrid', -13, -231.2, st); at('astrid', -57, -196, this.X(-60, -203), 'mourn'); at('kari', -58.2, -195.4, this.X(-60, -203)); at('svanhild', -40, -193, this.X(-45, -203), null, 'sword'); at('torvald', -16, -214, this.X(-30, -203), 'sit');
      TEN.slice(0, 4).forEach((id, i) => at(id, -70 + i * 10.8, -195.6 + (i % 2) * 1.2, this.X(-70 + i * 10.8, -203), i % 2 ? 'mourn' : null));
      return;
    }
    if (name === 'w7crown') { // every ruler of the ten islands, and everyone who came with them
      const R = POI.lawRock, spot = (i, n, r) => { const a = -1.15 + (i / Math.max(1, n - 1)) * 2.3; return [R.x + Math.sin(a) * r, R.z + 2 + Math.cos(a) * r]; };
      RULERS.forEach((id, i) => this.put(id, ...spot(i, RULERS.length, 6.4), [R.x, R.z + 1.4]));
      this.put('bjorn', ...spot(0.7, 3, 4.6), [R.x, R.z + 1.4]); this.put('signe', ...spot(0.92, 3, 4.7), [R.x, R.z + 1.4]);
      FRIENDS.forEach((id, i) => { const n = this.put(id, ...spot(i, FRIENDS.length, 9), [R.x, R.z + 1.4]); if (id === 'astrid') n.h.hold('L', 'bow'); });
      [...TEN, ...T].forEach((x, i, all) => { const n = this.put(x, ...spot(i, all.length, 11.6 + (i % 2) * 1.5), [R.x, R.z + 1.4]); if (typeof x !== 'string') { n.name = i % 2 ? 'A man of Svartøy' : 'A freeholder of the islands'; n.talk = () => n.say('...', 2); } });
    }
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (!HALL7.includes(c.phase)) return false;
    if (id === 'leif' && q.at('q_dead', 'leif')) { c.say('a7_steps', n, () => { q.notify('talk', 'leif'); c.tell(TOLD.over, 12); }); return true; }
    if (id === 'hauk' && q.at('q_dead', 'hauk') && c.phase === 'w7graves') { c.say('a7_hauk', n, () => { g.player.loopOverride = null; q.notify('event', 'a7hauk'); }); return true; }
    if (c.phase === 'w7hall' && (id === 'svanhild' || id === 'leif')) { n.say(id === 'leif' ? 'You are not going in there alone.' : 'I do not like it.', 3); return true; } // (game: "Svanhild argues. Leif argues.")
    n.say('...', 2); return true;
  }
  cues = {
    hakonUp() { const h = this.RS.hall; this.fix(this.hakon, h.x - 1.9, h.y, h.z + 12.6, Math.PI, null); },
    hakonArm() { const hk = this.hakon; hk.h.hold('R', 'sword'); hk.h.hold('L', 'shield'); hk.pose = 'guard'; this.g.audio.play('steel'); },
    kneelBy() { const p = this.g.player, e = this.hakon; p.teleport(e.pos.x + 1.0, e.pos.z - 0.5, Math.atan2(-1, 0.5)); p.loopOverride = 'kneel'; },
    hakonDies() { this.g.audio.setMusic('sorrow'); },
    sitHauk() { const p = this.g.player, n = this.c.npc('hauk'); p.teleport(n.pos.x + 1.1, n.pos.z + 0.9, n.yaw); p.loopOverride = 'sit'; n.h.play('pickup', 1.2); this.g.audio.play('chop', { vol: 0.4 }); },
  };

  // ---- the Ironwolf: four parts ----------------------------------------------------------------------
  duelStart() {
    const g = this.g, c = this.c, p = g.player, hk = this.hakon, R = A7.hakon, h = this.RS.hall;
    if (this.hd) return;
    this.arm(); this.hd = { part: 0, war: -1, warT: 0, done: false };
    this.put(hk, h.x - 1.9, h.z + 12.4, [p.pos.x, p.pos.z], 'guard'); hk.talk = null;
    this.champion(hk, 'hakon', R, { where: 'the Hall of Wolves', onDown: (e) => this.last(e), phases: [
      { at: 0.75, use: 0, do: (e) => this.partWar(e) }, { at: 0.48, use: 1, do: (e) => this.partHammer(e) }, { at: 0.2, use: 2, do: (e) => this.partCold(e) }, { at: R.lastAt, do: (e) => this.last(e) }] });
    c.hint(null); c.sub(TOLD.guard, 14);
  }
  /** The weapons of war: he changes whenever Eirik gets used to one. */
  partWar(e) {
    const g = this.g, c = this.c, d = this.hd;
    d.part = 1; d.war = -1;
    this.said(SAID.hakon).then(() => { if (this.hd === d && d.part === 1) c.sub(TOLD.war, 15); });
    g.after(11, () => { if (this.hd !== d || !e.cb || d.part !== 1) return; e.h.hold('L', null); g.audio.play('split'); g.fx.burst('chips', e.pos.x, e.pos.y + 1.3, e.pos.z, 26); this.rearm(e); g.ui.questBanner('the second part', 'The weapons of war'); });
  }
  rearm(e) { const d = this.hd, w = WAR[(d.war = (d.war + 1) % WAR.length)]; d.warT = 10; e.h.hold('R', w.hold); e.cb.moves = w.moves; e.cb.reach = w.reach; this.g.audio.play('steel', { vol: 0.5 }); }
  /** Wolf's Judgment: the hammer that killed Ragnar. */
  partHammer(e) {
    const g = this.g, c = this.c, p = g.player, d = this.hd;
    d.part = 2; e.h.hold('R', 'wolfsjudgment'); e.h.hold('L', null); g.ui.questBanner('the third part', "Wolf's Judgment");
    c.sub(TOLD.hammer[0], 11);
    g.after(3.5, () => { if (this.hd !== d) return; this.smashed = true; p.afflict('noShield', 900, 'Your shield is smashed to pieces'); g.audio.play('split'); p.cam.shake = 0.6; g.fx.burst('chips', p.pos.x, p.pos.y + 1.2, p.pos.z, 30); });
    g.after(11.4, () => { if (this.hd !== d) return; c.sub(TOLD.hammer[1], 13); this.blaze(1); this.rafter = { t: 5 }; });
  }
  /** Stormguard flares one last time. Then the scar goes cold. */
  partCold(e) {
    const g = this.g, c = this.c, p = g.player, d = this.hd;
    d.part = 3; this.blaze(2); e.h.play('slam', 1.3); g.ui.questBanner('the last part', 'The last oath');
    g.after(0.7, () => { p.wardFlash(e.pos); c.sub(TOLD.cold[0], 13); });
    g.after(2.4, () => { this.cold = true; p.stormDead = true; p.ward = 0; p.breakT = 0; });
    g.after(13.4, () => { if (this.hd === d && !d.done) { c.sub(TOLD.cold[1], 6); c.hint('noMagic'); } });
  }
  /** Both men are badly wounded. He stops attacking. He waits. */
  last(e) {
    const g = this.g, c = this.c, p = g.player, d = this.hd;
    if (!d || d.done) return;
    d.done = true; d.part = 4; g.combat.clear(); e.cb = null; e.mode = 'crew'; e.pose = 'guard'; e.h.hold('R', 'wolfsjudgment'); e.h.hold('L', null); p.mortal = false; c.hint(null); this.rafter = null;
    if (!this.cold) { this.cold = true; p.stormDead = true; p.ward = 0; }
    this.fin = { state: 'tell', t: 0, tries: 0 };
    g.after(8.2, () => { g.audio.play('split'); g.fx.burst('chips', p.pos.x, p.pos.y + 1.2, p.pos.z, 18); p.h.play('stagger', 0.6); p.cam.shake = 0.4; }); // the handle snaps just below the head; the collar holds
    c.tell(TOLD.last, 8).then(() => { if (!this.fin) return; c.sub(TOLD.wait, 5); c.hint('meetIt'); this.fin.state = 'wait'; this.fin.t = 3; });
  }
  /** The hammer comes down. */
  finalBlow() {
    const g = this.g, p = g.player, e = this.hakon, f = this.fin, dd = e.dist(p), ix = e.pos.x + Math.sin(e.yaw) * 1.7, iz = e.pos.z + Math.cos(e.yaw) * 1.7, iy = g.world.groundAt(ix, iz);
    if (!f || f.state !== 'raise') return;
    if (p.blocking && dd < 4.4) return this.answer();
    f.tries++; f.state = 'wait'; f.t = 3.4;
    g.audio.play('thud'); g.audio.play('drum'); p.cam.shake = 0.6; g.fx.burst('chips', ix, iy + 0.2, iz, 24); g.fx.burst('dirt', ix, iy + 0.1, iz, 16); g.fx.ring(ix, iy, iz, { r0: 0.4, r1: 3.4, dur: 0.45, color: 0xff8a50, a: 0.85 });
    if (dd < 3.3 && p.iframes <= 0) { p.health = Math.max(8, p.health - 32); p.h.play('stagger', 0.7); g.audio.play('hurt'); g.ui.pulse('hurt', 0.9); g.ui.toast('Do not strike, and do not step away. Meet it.'); }
    else g.ui.toast('He does not dodge. He meets the blow.');
  }
  /** He meets it with the iron collar, turns a full circle with the force of it, and strikes from the right. */
  answer() {
    const g = this.g, c = this.c, p = g.player, e = this.hakon;
    this.fin.state = 'done'; p.frozen = true; c.hint(null); g.slowT = 1.8; g.hitStop = 0.14;
    g.audio.play('parry'); g.audio.play('steel'); g.audio.play('drum'); p.cam.shake = 0.5; p.cam.kick = -8; g.ui.pulse('white', 0.35);
    p.h.handWorld('R', _p); g.fx.burst('spark', _p.x, _p.y + 0.2, _p.z, 30); g.fx.flare(_p.x, _p.y + 0.2, _p.z, 3.4, 1, 0.9, 0.7, 0.16); g.fx.ring(p.pos.x, p.pos.y, p.pos.z, { r0: 0.4, r1: 4.6, dur: 0.6, color: 0xffe0b0, a: 0.8 });
    c.sub(TOLD.answer[1], 13); this.spin = { t: 0, yaw: p.yaw };
  }
  struck() {
    const g = this.g, c = this.c, p = g.player, e = this.hakon, h = this.RS.hall;
    g.slowT = 1.4; g.hitStop = 0.12; g.audio.play('split'); g.audio.play('arrowHit'); g.audio.play('thud'); p.cam.shake = 0.7; p.cam.kick = -9;
    g.fx.burst('blood', e.pos.x, e.pos.y + 1.4, e.pos.z, 30); g.fx.flare(e.pos.x, e.pos.y + 1.4, e.pos.z, 3, 1, 0.9, 0.8, 0.14); g.fx.ring(e.pos.x, e.pos.y, e.pos.z, { r0: 0.3, r1: 5, dur: 0.7, color: 0xffd9a0, a: 0.7 });
    e.h.hold('R', null); e.h.play('fall', 1.4, { onEnd: () => { e.pose = 'dead'; } });
    this.fin = null; g.audio.setMusic('sorrow');
    g.after(5.5, () => { this.fix(e, e.pos.x, h.y + 0.1, e.pos.z, e.yaw, 'dead'); c.say('a7_death', e, () => { p.loopOverride = null; p.frozen = false; g.quests.notify('event', 'a7hakon'); }); });
  }
  ring() {
    const g = this.g, c = this.c, p = g.player;
    this.busy = true; p.h.play('pickup', 1.0); g.audio.play('pickup');
    if (!g.inventory.has('oath_ring')) g.inventory.add('oath_ring', 1);
    c.sub(TOLD.halves, 9); g.after(1.4, () => { this.busy = false; g.quests.notify('event', 'a7ring'); });
  }

  // ---- the law-rock ---------------------------------------------------------------------------------------
  playCrown() {
    const g = this.g, c = this.c, p = g.player, R = POI.lawRock, y = g.world.groundAt(R.x, R.z + 2), b = c.npc('bjorn'), all = [...g.npcs.values()].filter((n) => n.visible && !n.dead && n.dist({ x: R.x, z: R.z }) < 20);
    this.busy = true; p.frozen = true; g.ravens.exitEye(); c.hint(null);
    p.teleport(R.x, R.z + 1.5, 0); this.arm(); p.mortal = false; p.h.hold('L', null); // the axe, and no shield: he has not come to fight
    const cheer = (k) => { all.forEach((n, i) => { if (i % k === 0) g.after(Math.random() * 0.8, () => n.h.play('cheer', 1.6)); }); g.audio.play('shout'); };
    const cam = { wide: { from: [R.x + 9, y + 6.5, R.z + 22], to: [R.x + 6, y + 5, R.z + 18], look: [R.x, y + 1.2, R.z + 3], fov: 46 }, crowd: { from: [R.x - 2.5, y + 2.2, R.z + 1], to: [R.x + 2.5, y + 2.2, R.z + 1], look: [R.x, y + 1.3, R.z + 9], fov: 50 },
      eirik: { from: [R.x + 1.5, y + 1.5, R.z + 4.8], to: [R.x + 0.9, y + 1.6, R.z + 4.2], look: () => [p.pos.x, p.pos.y + 1.5, p.pos.z], fov: 32 }, bjorn: { from: () => [b.pos.x + 0.9, b.pos.y + 1.5, b.pos.z - 2.6], look: () => [b.pos.x - 0.3, b.pos.y + 1.4, b.pos.z], fov: 30 },
      birds: { from: [R.x - 1.6, y + 1.9, R.z + 4.4], to: [R.x - 1.0, y + 2.0, R.z + 3.8], look: () => [p.pos.x, p.pos.y + 1.9, p.pos.z], fov: 28 } };
    const act = {
      raise: () => { p.h.play('cheer', 4.4); g.audio.play('steel', { vol: 0.5 }); }, lower: () => { p.h.action = null; },
      vote: () => cheer(2), chant: () => { cheer(3); g.audio.play('raven'); }, chant2: () => { cheer(1); g.audio.play('horn', { freq: 110, vol: 0.5 }); g.after(1.6, () => cheer(1)); g.after(3.2, () => cheer(1)); },
    };
    this.scene(CROWN_LINES, cam, act, () => { this.busy = false; g.quests.notify('event', 'a7crown'); });
  }

  // =====================================================================================
  steps = {
    'q_wolfhall.enter'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.X(0, 89.5);
      c.setPhase('w7hall', r); this.here(r, at, 0); this.arm(); p.mortal = false; c.hint(null);
      if (!r) { g.ui.questBanner('The Hall of Wolves', 'alone'); c.sub(TOLD.alone, 8); }
    },
    'q_wolfhall.speak'(r) { const c = this.c, h = this.RS.hall; c.setPhase('w7hall', r); this.here(r, [h.x + 1, h.z - 13], 0); },
    'q_ironwolf.hakon'(r) { const c = this.c, h = this.RS.hall; c.setPhase('w7duel', r); this.here(r, [h.x + 1.4, h.z + 5.4], 0); this.duelStart(); },
    'q_ironwolf.ring'(r) { const c = this.c, h = this.RS.hall; c.setPhase('w7duel', r); this.here(r, [h.x + 0.6, h.z + 7], 0); if (r) this.arm(); else this.blaze(2); this.g.player.mortal = false; },
    'q_ironwolf.out'(r) { const c = this.c, h = this.RS.hall; c.setPhase('w7duel', r); this.here(r, [h.x, h.z + 11.6], Math.PI); this.roof = { t: 45, shown: 0 }; },
    'q_dead.leif'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.X(0.6, 94.2);
      const go = () => { c.setPhase('w7after', true); p.teleport(at[0], at[1], Math.PI); if (p.equipped !== 'none') p.equip('none'); p.mortal = false; };
      if (r) return go();
      c.fade(() => { go(); return g.ui.card('What the Dead Leave Behind', QUESTS.q_dead.desc, 6); }, 1.6, 1.6).then(() => { const l = c.npc('leif'); l.goTo(...this.X(2.2, 92.4), { onArrive: (o) => o.face(p.pos.x, p.pos.z) }); });
    },
    'q_dead.hauk'(r) {
      const g = this.g, c = this.c, p = g.player, at = this.X(-10, -226);
      const go = () => { c.setPhase('w7graves', true); p.teleport(at[0], at[1], -2.3); if (p.equipped !== 'none') p.equip('none'); };
      if (r) return go();
      g.after(25.5, () => c.fade(() => { go(); return g.ui.card('', 'They spend three days on Svartøy.', 4.5); }, 1.6, 1.6)); // after what is told of the hill
    },
    'q_crown.rock'(r) {
      const g = this.g, c = this.c, p = g.player, R = POI.lawRock;
      const go = () => { c.setPhase('w7crown', true); p.teleport(R.x + 3.5, R.z + 15, Math.PI + 0.2); if (p.equipped !== 'none') p.equip('none'); g.audio.setMusic('day'); };
      if (r) return go();
      c.fade(() => { go(); return g.ui.card('The Crown of the North', 'Six weeks later', 5); }, 1.8, 1.8);
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase, h = this.RS.hall, e = this.hakon;
    if (!HALL7.includes(ph)) return;
    const f = this.fin;
    if (f) { // he keeps his face to Eirik, and comes on slowly
      const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, dd = Math.hypot(dx, dz) || 1; let sp = 0;
      e.yaw = dampAngle(e.yaw, Math.atan2(dx, dz), 5, dt); e.root.rotation.y = e.yaw;
      if (f.state !== 'tell' && f.state !== 'done' && dd > 2.4 && !e.h.busy && g.mode === 'play') { sp = 1.6; e.pos.x += (dx / dd) * sp * dt; e.pos.z += (dz / dd) * sp * dt; g.world.resolve(e.pos, 0.34); }
      e.h.setLoop('guard'); e.h.setLocomotion(sp, false); e.h.update(dt);
      if (f.state === 'wait' && g.mode === 'play' && (f.t -= dt) <= 0 && dd < 4) { f.state = 'raise'; c.sub(TOLD.answer[0], 5); g.ui.alert(true); g.audio.play('shout'); e.h.play('slam', 2.2, { hitAt: 0.62, onHit: () => this.finalBlow() }); }
    } else this.crew([e, ...c.battle.jarn, ...c.sea.town], dt);
    const s = this.spin; // the hammer's own force carries him round
    if (s) { s.t += dt; const k = Math.min(1, s.t / 0.75); p.yaw = s.yaw + Math.PI * 2 * (k * k * (3 - 2 * k)); p.root.rotation.y = p.yaw;
      if (k >= 1) { this.spin = null; p.yaw = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z); p.h.play('atk2', 0.6, { hitAt: 0.4, onHit: () => this.struck() }); } }
    if (g.mode !== 'play') return;
    const d = this.hd;
    if (d && d.part === 1 && e.cb && d.war >= 0 && (d.warT -= dt) <= 0 && e.cb.state !== 'strike') this.rearm(e);
    if (q.at('q_wolfhall', 'speak') && !this.spoke && p.pos.z > h.z + 4.5 && Math.abs(p.pos.x - h.x) < 7) { this.spoke = true; c.say('a7_hall', e, () => q.notify('event', 'a7speak')); }
    const rf = this.rafter; // burning rafters crack overhead, and come down
    if (rf && (rf.t -= dt) <= 0) {
      if (!rf.at) { const a = Math.random() * 6.28, r = Math.random() * 2.6; rf.at = [Math.max(h.x - 5.5, Math.min(h.x + 5.5, p.pos.x + Math.cos(a) * r)), p.pos.z + Math.sin(a) * r]; rf.t = 1.5; g.audio.play('split', { vol: 0.5 }); g.fx.ring(rf.at[0], h.y, rf.at[1], { r0: 2.4, r1: 0.5, dur: 1.5, color: 0xff5030, a: 0.8 }); g.fx.burst('ember', rf.at[0], h.y + 7, rf.at[1], 14); }
      else { const [x, z] = rf.at; rf.at = null; rf.t = 7 + Math.random() * 4; g.audio.play('thud'); g.audio.play('split'); p.cam.shake = Math.max(p.cam.shake, 0.45); g.fx.burst('ember', x, h.y + 0.3, z, 30); g.fx.burst('chips', x, h.y + 0.3, z, 16); g.fx.burst('dirt', x, h.y + 0.2, z, 10); this.war.burn(x, h.y + 0.2, z, 0.9, 6);
        if (Math.hypot(p.pos.x - x, p.pos.z - z) < 2.1 && p.iframes <= 0) { p.health = Math.max(5, p.health - 16); p.h.play('stagger', 0.5); g.audio.play('hurt'); g.ui.pulse('hurt', 0.6); } }
    }
    const ro = this.roof; // the roof will not wait for him
    if (ro && q.at('q_ironwolf', 'out')) {
      ro.t -= dt; const n = Math.ceil(ro.t);
      if (n !== ro.shown) { ro.shown = n; g.ui.hint(`The roof is coming down. Walk out.  ${Math.max(0, n)}`); if (n % 5 === 0) { p.cam.shake = Math.max(p.cam.shake, 0.3); g.audio.play('split', { vol: 0.5 }); g.fx.burst('ember', p.pos.x + (Math.random() - 0.5) * 6, h.y + 7, p.pos.z + (Math.random() - 0.5) * 6, 20); } }
      if (ro.t <= 0) { this.roof = null; c.fail('The Hall of Wolves', 'The roof came down.'); }
    }
  }
}
