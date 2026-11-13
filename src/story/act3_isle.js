// Act III on Jarnøy, outside the battle: "The Island Prince" (the collectors, Arvid, Håkon's demand), "The Healer's
// Hands" (Ingrid's hospital), the feast of "The Gift of Iron", and "The Price of Victory" in the Hall of Wolves.
// The battle itself (Chapters 4 to 6) is in act3_battle.js. See act2.js for what the mainland acts share.
import * as THREE from 'three';
import { M, cyl, sphere, tint, at } from '../world/geo.js';
import { makeShip } from '../world/props.js';
import { place } from '../world/layout.js';
import { CAST3, PRICE_LINES } from '../data/act3.js';
import { PHASES } from './act2.js';

const TOWN = [[160, -24, 1.6], [178, -30, -1.2], [186, -10, 2.4], [150, -8, 0.8], [200, -30, -2], [166, 2, 0.2], [142, -30, 1.4], [192, 0, -0.6]];

export class A3Isle {
  constructor(game, core) { this.g = game; this.c = core; this.scene = null; }
  get st() { return this.g.state; }
  get JT() { return this.g.world.main.jarnoy; }
  /** A point on Jarnøy, by offset from the island's centre. */
  J(dx, dz) { const s = this.JT.s; return [s.x + dx, s.z + dz]; }
  /** Eirik is nowhere near Jarnøy (a chapter started from the Acts menu has no place saved yet). */
  away() { const s = this.JT.s, p = this.g.player.pos; return Math.hypot(p.x - s.x - 120, p.z - s.z - 40) > 600; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world;
    for (const id of ['hroald', 'arvid', 'ingrid', 'hallgerd', 'fisher', 'jtrader']) { const n = g.addNPC(id, CAST3[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    this.taxBoat = makeShip({ L: 8.5, B: 2.4, D: 0.8, rise: 1.0, seed: 53, sail: false, shields: false }); this.taxBoat.visible = false; g.scene.add(this.taxBoat);
    w.addInteractable({ id: 'a3home', x: this.J(246, -23)[0], z: this.J(246, -23)[1], r: 3.6, priority: 3, label: 'Sail home with the iron', enabled: () => q.at('q_iron', 'home'), use: () => this.sailHome() });
    // a straw man on Svartøy's harbour, for the last scene
    const [sx, sz] = [place('svartoy', 'harbor').x + 8, place('svartoy', 'harbor').z + 12], sy = w.groundAt(sx, sz), sm = new THREE.Group();
    sm.add(new THREE.Mesh(at(cyl(0.07, 0.09, 2.0, 6), 0, 1.0, 0), M.bark), new THREE.Mesh(tint(at(cyl(0.3, 0.24, 0.9, 8), 0, 1.25, 0), 0xc9b060, 0.25, 3), M.vcPlain), new THREE.Mesh(tint(at(sphere(0.2, 7, 6), 0, 1.95, 0), 0xc9b060, 0.2, 4), M.vcPlain), new THREE.Mesh(at(cyl(0.04, 0.04, 1.3, 5), 0, 1.5, 0, 0, 0, Math.PI / 2), M.bark));
    sm.position.set(sx, sy, sz); sm.visible = false; g.scene.add(sm); this.straw = sm;
  }
  post(id, [dx, dz, face, loop, hold]) {
    const n = this.c.npc(id), [x, z] = this.J(dx, dz);
    if (n.dead) n.revive();
    n.visible = true; n.mode = 'idle'; n.cb = null; n.crouch = false; n.held = false;
    n.teleport(x, z, typeof face === 'number' ? face : face ? Math.atan2(this.J(face[0], face[1])[0] - x, this.J(face[0], face[1])[1] - z) : n.yaw);
    n.setLoop(loop || null); n.h.hold('R', hold || null); n.h.hold('L', null); n.faceT = null; n.talk = () => this.c.talkTo(id);
    return n;
  }
  clear(phase) {
    const c = this.c, S = this.JT.stages, on = PHASES[phase] && PHASES[phase].at === 'jarnoy';
    for (const id of ['hroald', 'arvid', 'ingrid', 'hallgerd', 'fisher', 'jtrader']) c.npc(id).visible = false;
    S.ship.set(on); S.hospital.set(['jprep', 'jdawn', 'jbattle'].includes(phase)); S.jfeast.set(phase === 'jfeast'); S.pyres.set(phase === 'jnight');
    this.taxBoat.visible = false; this.scene = null; this.straw.visible = false;
    if (on) c.W.stages.searaven.set(false);
  }
  dyn() { return undefined; }
  /** Who is where on Jarnøy at this time. */
  dress(name) {
    const c = this.c, g = this.g, q = g.quests, T = c.sea.town;
    const town = () => T.forEach((n, i) => { const [dx, dz, yaw] = TOWN[i]; n.name = i % 2 ? 'A woman of Jarnøy' : 'A man of Jarnøy'; this.post(n.id, [dx, dz, yaw, i % 3 === 2 ? 'talk' : null]); });
    if (['jday', 'jtax', 'jnine', 'jprep', 'jfeast'].includes(name)) town();
    if (name === 'jday') { this.post('leif', [228, -26, -1.4]); this.post('gisli', [240, -24.6, -1.5]); this.post('jtrader', [171.6, -14.6, 2.6]); this.post('arvid', [188, -18, -1.2]).h.hold('R', 'sword'); }
    if (name === 'jtax') {
      const P = c.raid.pool, C = [[221.4, -25.4, -1.3], [224.6, -21.6, -1.8], [226, -26.8, -1.2], [228.4, -23, -1.5]];
      this.tax = C.map(([dx, dz, yaw], i) => { const n = P[i], [x, z] = this.J(dx, dz); if (n.dead) n.revive(); n.visible = true; n.cb = null; n.name = "Håkon's collector"; n.teleport(x, z, yaw); n.setLoop(i ? 'carry' : null); n.h.hold('R', i ? null : 'axe'); n.h.hold('L', null); n.talk = () => n.say('Tribute. Stand back.', 2.5); return n; });
      const [bx, bz] = this.J(240, -28.9); this.taxBoat.visible = true; this.taxBoat.position.set(bx, -0.12, bz); this.taxBoat.rotation.y = Math.PI / 2;
      this.post('hallgerd', [217.6, -27.4, [221.4, -25.4]]); this.post('fisher', [216.2, -29, [221.4, -25.4]]); this.post('arvid', [213, -19.4, [221.4, -25.4]]).h.hold('R', 'sword');
      this.post('leif', [210.6, -27.6, [221.4, -25.4]]); this.post('jtrader', [171.6, -14.6, 2.6]);
      [[214, -31], [211, -22], [216.6, -17.4], [209, -30]].forEach(([dx, dz], i) => this.post(T[i].id, [dx, dz, [221.4, -25.4]])); // the crowd
      if (this.at('q_isle') >= 5) { this.tax[0].die(true); this.tax.slice(1).forEach((n) => { n.visible = false; }); this.taxBoat.visible = false; this.post('hroald', [217, -22.4, [213, -19.4]]); this.post('hallgerd', [215, -30.2, [216.2, -29]]); }
    }
    if (name === 'jnine') { this.post('hroald', [84.6, -1.6, 0.3]); this.post('arvid', [90.6, -3.4, -0.4]).h.hold('R', 'sword'); this.post('ingrid', [79.4, -2.6, 0.8]); this.post('leif', [88, 5.4, 3.3]); }
    if (name === 'jprep') {
      this.post('ingrid', [...this.h(-3, 10.6), [...this.h(-5, 11.5)], 'kneel']); this.post('hroald', [...this.h(8, 6.4), 0.3]); this.post('arvid', [...this.h(11, 7.6), 0.1]).h.hold('R', 'sword');
      this.post('leif', [...this.h(0.5, 13.4), [...this.h(-3, 10.6)]]); this.post('astrid', [...this.h(3.6, 5.6), [...this.h(-3, 10.6)]]).h.hold('L', 'bow'); this.post('gisli', [...this.h(-4.6, 11.6), 0, 'sit']);
    }
    if (name === 'jfeast') {
      const seats = []; for (const lz of [12, 17]) for (const side of [-1, 1]) for (let i = 0; i < 5; i++) seats.push([...this.h(-4.6 + i * 1.8, lz + side * 0.95), 0.2 + (side > 0 ? Math.PI : 0), 'sit']);
      ['arvid', 'ingrid', 'leif', 'astrid', 'torvald', 'brokk', 'gisli', 'hauk', 'v0', 'v2', 'v3', 'v5', 'v7', 'v9', 'jtrader', 'hallgerd', 'fisher'].forEach((id, i) => { if (seats[i]) this.post(id, seats[i]); });
      this.post('hroald', [...this.h(6.4, 11.4), [...this.h(2, 13)]]);
    }
    c.battle.dress(name);
  }
  /** A point before King Hroald's hall, by offset along and out from its front. */
  h(lx, lz) { const [x, z] = this.JT.H(lx, lz), s = this.JT.s; return [x - s.x, z - s.z]; }
  at(id) { const q = this.st.quests[id]; return !q ? -1 : q.status === 'done' ? 99 : q.step; }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (id === 'jtrader') { if (q.at('q_isle', 'trade')) c.say('a3_trade', n, () => q.notify('talk', 'jtrader')); else n.say('A Jarnøy blade bends before it breaks.', 3.5); return true; }
    if (id === 'hroald') {
      if (q.at('q_isle', 'hroald')) c.say('a3_hroald', n, () => q.notify('talk', 'hroald'));
      else if (q.at('q_isle', 'demand')) c.say('a3_demand', n, () => q.notify('talk', 'hroald'));
      else if (q.at('q_iron', 'gold')) c.say('a3_gold', n, () => { g.ui.toast('Weregild for the families of the nine Ravenhold dead'); q.notify('talk', 'hroald'); });
      else n.say('I have kept Jarnøy safe for twenty years by paying a wolf a little, so that he does not take everything.', 5);
      return true;
    }
    if (id === 'ingrid') {
      if (q.at('q_healer', 'ingrid')) c.say('a3_ingrid', n, () => q.notify('talk', 'ingrid'));
      else if (q.at('q_iron', 'ingrid')) c.say('a3_ingrid2', n, () => q.notify('talk', 'ingrid'));
      else n.say('Clean water. The well, not the harbor.', 3);
      return true;
    }
    if (id === 'arvid') { n.say('Should I have watched him take her?', 3); return true; }
    if (id === 'hallgerd' || id === 'fisher') { n.say('...', 2); return true; }
    if (PHASES[c.phase] && PHASES[c.phase].at === 'jarnoy' && /^kp/.test(id)) { n.say(['Black cliffs, red streams, and the best iron in the North.', 'The furnaces smoke day and night.', 'He pays the wolf a little every year. A little is a lot, on an island.'][(Math.random() * 3) | 0], 4); return true; } // (game: town talk)
    return false;
  }
  cues = {
    grab() { const t = this.tax, hg = this.c.npc('hallgerd'), [x, z] = this.J(232, -25.6); t[0].setLoop(null); hg.follow(t[0], { dist: 0.9 }); t[0].goTo(x, z, { speed: 0.5 }); this.c.npc('fisher').setLoop('mourn'); },
    three() {
      const g = this.g, a = this.c.npc('arvid'), col = this.tax[0];
      col.stop(); this.c.npc('hallgerd').stop(); a.teleport(col.pos.x - 1.7, col.pos.z + 0.5, Math.atan2(1.7, -0.5)); col.yaw = Math.atan2(-1.7, 0.5);
      ['atk1', 'atk2', 'atk3'].forEach((k, i) => g.after(0.5 + i * 0.75, () => { a.h.play(k, 0.55); g.audio.play(i < 2 ? 'steel' : 'hurt'); if (i < 2) col.h.play('parry', 0.4); else { col.die(); const h = this.c.npc('hallgerd'), f = this.c.npc('fisher'); f.setLoop(null); h.goTo(f.pos.x + 0.9, f.pos.z + 0.4, { run: true }); } }));
    },
    water() { const l = this.c.npc('leif'), [x, z] = this.J(...this.h(9, 20)), [bx, bz] = [l.pos.x, l.pos.z]; l.goTo(x, z, { run: true, onArrive: (o) => o.goTo(bx, bz, {}) }); },
    kneel() { const a = this.c.npc('arvid'), h = this.c.npc('hroald'); a.setLoop('kneel'); a.face(h.pos.x, h.pos.z); },
  };

  sailHome() {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true;
    g.ui.fade(true, 1.2).then(() => g.ui.card('Ravenhold', 'Back home, Brokk is like a child at midwinter.', 4.5)).then(() => { g.quests.notify('event', 'a3home'); p.teleport(...c.B(-52, 150), -1.2); return g.ui.fade(false, 1.2); }).then(() => { p.frozen = false; });
  }
  /** Chapter 8: Ulf's report, and the straw man. */
  playPrice() {
    const g = this.g, c = this.c, R = c.raid;
    if (R.hallOn) return;
    const { h, y0, zs, C, set } = R.hallOpen(), hk = C.hakon, ulf = C.ulf;
    C.kettil.visible = false; C.arne.visible = false;
    set(ulf, h.x, zs - 9.4, 0, null, 0, 'sword'); ulf.h.hold('L', 'sword'); set(C.sigurd, h.x + 2.6, zs - 4.6, -2.4, null);
    const eye = (n, up = 1.5) => [n.pos.x, n.pos.y + up, n.pos.z], cam = {
      ulf: () => ({ from: [h.x - 1.4, y0 + 1.7, zs - 5.2], look: eye(ulf), fov: 36 }), hakon: () => ({ from: [h.x + 1.3, y0 + 1.5, zs - 8.2], look: eye(hk, 1.0), fov: 32 }),
      table: () => ({ from: [h.x + 0.4, y0 + 3.1, zs - 20], to: [h.x - 0.4, y0 + 2.5, zs - 17.5], look: [h.x, y0 + 1.0, zs - 6], fov: 46 }), sigurd: () => ({ from: [h.x + 0.4, y0 + 1.5, zs - 7], look: eye(C.sigurd), fov: 30 }),
    };
    const shots = PRICE_LINES.map(([who, sp, text]) => { const v = cam[who](), dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.25, v.from[1], v.from[2] + 0.2], look: () => cam[who]().look, fov: v.fov, sub: [sp, text, dur - 0.3] }; });
    const sp = this.straw.position;
    const last = { dur: 9, from: [sp.x - 4.5, sp.y + 1.6, sp.z + 3.2], to: [sp.x - 3.2, sp.y + 1.5, sp.z + 4.4], look: [sp.x - 0.4, sp.y + 1.3, sp.z], fov: 40, sub: ['', 'Ulf goes to the harbor and practices with his swords until dark, cutting a straw man to pieces again and again.', 8.4],
      onStart: () => { this.straw.visible = true; g.player.pos.set(sp.x, sp.y, sp.z + 6); g.sky.time = 17.2; ulf.pos.set(sp.x - 1.5, sp.y, sp.z + 0.2); ulf.yaw = Math.PI / 2; ulf.root.rotation.y = ulf.yaw; this.cutting = { t: 0, ulf }; } };
    g.ui.fade(false, 1.2);
    g.cine.play([{ dur: 5.5, from: [h.x, y0 + 5.5, h.z - h.hl - 16], to: [h.x, y0 + 2.4, h.z - h.hl - 4], look: [h.x, y0 + 2, h.z], fov: 44, sub: ['', 'Ulf Two-Blades returns to Svartøy with five ships out of eleven.', 5] }, ...shots, last],
      { onEnd: () => { this.cutting = null; R.hallClose(() => { this.straw.visible = false; g.player.teleport(...c.B(-3, 123), 0.4); }).then(() => g.quests.notify('event', 'a3price')); } }); // the act ends once the hall has faded out
  }

  // =====================================================================================
  steps = {
    'q_isle.town'(r) { const c = this.c; c.setPhase('jday', r); if (!r) c.sub('Jarnøy is a hard, beautiful place: black cliffs, red streams stained by iron ore, smelting furnaces smoking day and night on the hillsides.', 8); },
    'q_isle.trade'(r) { const c = this.c; c.setPhase('jday', r); if (!r) c.sub('Its people are tough and proud. Its iron is the best in the North; a Jarnøy blade bends before it breaks.', 7); },
    'q_isle.quay'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('jtax', r);
      c.fade(() => { c.setPhase('jtax', true); g.player.teleport(...this.J(196, -24), 1.5); return g.ui.card('', 'On their second day in the harbor town', 3.4); }, 1.2, 1.2);
    },
    'q_isle.let'(r) {
      const g = this.g, c = this.c, [bx, bz] = this.J(240, -28.9);
      c.setPhase('jtax', r);
      if (r) { this.tax[0].die(true); }
      this.tax.slice(1).forEach((n, i) => { n.setLoop(null); n.goPath([this.J(232 + i * 2, -25), [bx - 1 + i * 1.2, bz + 2.2]], { run: true, onArrive: (o) => { o.visible = false; } }); });
      this.scene = { t: 0, bx, bz };
      c.sub('The other three collectors run for their boat. Eirik could stop them. He does not; killing them would only make things worse.', 8);
    },
    'q_isle.hroald'(r) { const c = this.c; c.setPhase('jtax', r); this.taxBoat.visible = false; this.post('hroald', [217, -22.4, [213, -19.4]]); if (!r) c.sub('King Hroald is white with fury.', 4); },
    'q_isle.demand'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('jnine', r); c.fade(() => { c.setPhase('jnine', true); g.player.teleport(...this.J(86, 6), 3.2); return g.ui.card('', 'Nine days later', 3); }, 1.2, 1.2); },
    'q_healer.hall'(r) { const c = this.c; c.setPhase('jprep', r); if (!r) c.sub("On Jarnøy they meet King Hroald's daughter, Princess Ingrid.", 5); },
    'q_healer.ingrid'(r) { this.c.setPhase('jprep', r); },
    'q_iron.gold'(r) { const g = this.g, c = this.c; if (r) { c.setPhase('jfeast', r); if (this.away()) g.player.teleport(...this.J(...this.h(4, 20)), 3.3); return; } c.fade(() => { c.setPhase('jfeast', true); g.player.teleport(...this.J(...this.h(4, 20)), 3.3); if (g.player.equipped !== 'none') g.player.equip('none'); }, 1.4, 1.4); },
    'q_iron.ingrid'(r) { this.c.setPhase('jfeast', r); this.post('ingrid', [...this.h(8.4, 13.4), [...this.h(6.4, 11.4)]]); },
    'q_iron.home'(r) { const c = this.c; c.setPhase('jfeast', r); if (!r) c.sub('She joins Eirik\'s companions. Leif is delighted.', 4); },
    'q_price.hall'(r) { const g = this.g, c = this.c; c.setPhase('a3yew', r); if (r) return this.playPrice(); g.player.frozen = true; g.ui.fade(true, 1.4).then(() => this.playPrice()); },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player;
    if (q.at('q_isle', 'quay') && c.phase === 'jtax' && !this.collecting && g.mode === 'play' && Math.hypot(p.pos.x - this.J(221, -23)[0], p.pos.z - this.J(221, -23)[1]) < 13) {
      this.collecting = true; c.say('a3_collect', c.npc('fisher'), () => { this.collecting = false; q.notify('event', 'a3quay'); });
    }
    const s = this.scene;
    if (s && q.at('q_isle', 'let')) { // they row away fast
      s.t += dt;
      if (s.t > 3.5) { this.taxBoat.position.x = s.bx + (s.t - 3.5) * (s.t - 3.5) * 0.35 + (s.t - 3.5) * 1.2; this.taxBoat.position.z = s.bz - (s.t - 3.5) * 0.5; }
      if (s.t > 9.5) { this.scene = null; this.taxBoat.visible = false; c.sub('They row away fast.', 3); q.notify('event', 'a3let'); }
    }
    const k = this.cutting;
    if (k) { k.t += dt; if (k.t > 0.8) { k.t = 0; k.n = (k.n || 0) + 1; k.ulf.h.play(k.n % 2 ? 'atk1' : 'twinL', 0.6); g.audio.play('chop', { vol: 0.4 }); this.straw.rotation.z = (k.n % 2 ? 1 : -1) * 0.12; } }
  }
}
