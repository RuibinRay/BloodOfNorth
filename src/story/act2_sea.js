// Act II, Chapters 8 and 9: "The Captain Without a Ship" (Kaupang, Leif and Orm the reeve, the wreck in the sea
// cave, the Kaupang Thing, the Sea-Raven) and "The First Oath" (the feast, the goat's trial, Bjorn's arm-ring, smoke
// in the west). See act2.js.
import * as THREE from 'three';
import { M, box, cyl, cone, sphere, tint, at } from '../world/geo.js';
import { A2, CAST2, VILLAGERS } from '../data/act2.js';
import { Dive } from '../systems/activities2.js';

export class A2Sea {
  constructor(game, core) { this.g = game; this.c = core; this.said = {}; }
  get st() { return this.g.state; }
  get KW() { return this.g.world.main.kaupang; }
  /** A point in Kaupang, by offset from its centre. */
  K(dx, dz) { const s = this.KW.s; return [s.x + dx, s.z + dz]; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, wr = this.KW.wreck;
    const mk = (id, def) => { const n = g.addNPC(id, def); n.visible = false; n.talk = () => c.talkTo(id); return n; };
    for (const id of ['leif', 'orm', 'gisli', 'sailor', 'klaw', 'smith', 'salter', 'factor', 'thrall']) mk(id, CAST2[id]);
    this.town = VILLAGERS.slice(0, 8).map(([, look], i) => mk('kp' + i, { name: i % 2 ? 'A townswoman' : 'A townsman', look: { ...look, tunic: [0x6a4a3a, 0x3a5a6a, 0x7a6a3a, 0x5a3a5a][i % 4] } }));
    this.hands = [0, 1].map((i) => mk('hand' + i, { name: "One of Leif's crew", look: { ...VILLAGERS[i * 2 + 2][1], scale: 0.95 } }));
    this.pen = [0, 1, 2].map((i) => mk('pen' + i, { name: 'A thrall', look: { ...VILLAGERS[i + 3][1], tunic: 0x6a6456, apron: null } }));
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 2.8, priority: 2, label, enabled, use, ...o });
    I('a2sail', c.B(0, 247), "Board the fisherman's boat", () => q.at('q_captain', 'sail'), () => this.sail(), { r: 3.4 });
    I('a2skiff', this.K(-148.5, 44.4), 'Take the borrowed boat out to the Skerries', () => q.at('q_captain', 'skiff'), () => c.fade(() => { c.setPhase('skerry', true); g.player.teleport(...this.K(-225, -226), Math.PI); }).then(() => q.notify('event', 'a2skiff')), { r: 3.4 });
    I('a2dive', this.K(-225, -227.5), 'Dive', () => (q.at('q_captain', 'dive') || q.at('q_captain', 'gisli')) && !this.diving, () => (q.at('q_captain', 'gisli') ? this.lastDive() : this.dive()), { r: 4.5, priority: 3 });
    g.ravens.addMarkable({ id: 'a2tideline', pos: () => ({ x: wr.x, z: wr.z + 8 }), r: 60, label: 'the tide line on the cave rock', enabled: () => q.at('q_captain', 'tide'), onMark: () => { c.sub('Slack water. Turning.', 4, '{w}'); q.notify('event', 'a2tide'); } });
    g.ravens.addMarkable({ id: 'a2west', pos: () => ({ x: c.B(-300, 150)[0], z: c.B(-300, 150)[1] }), r: 420, label: 'smoke, far to the west', enabled: () => q.at('q_oath', 'smoke'), onMark: () => { c.sub('Far to the west, on an island he has only heard of, smoke is rising.', 7); g.after(4, () => q.notify('event', 'a2westsmoke')); } });
    // the beam and the basket of the last dive; the smoke over Jarnøy
    this.beam = new THREE.Mesh(at(cyl(0.2, 0.24, 5.4, 7), 0, 0, 0, 0, 0, Math.PI / 2), M.bark); this.beam.visible = false; g.scene.add(this.beam);
    this.basket = new THREE.Mesh(tint(at(cyl(0.34, 0.26, 0.42, 9), 0, 0, 0), 0x8a6a40, 0.2, 3), M.vcPlain); this.basket.visible = false; g.scene.add(this.basket);
    const [sx, sz] = c.B(-600, 190), sm = new THREE.Group();
    sm.add(new THREE.Mesh(at(cone(26, 170, 9, 1, true), 0, 85, 0, Math.PI, 0, 0), new THREE.MeshBasicMaterial({ color: 0x4a4644, transparent: true, opacity: 0.55, fog: false, depthWrite: false, side: THREE.DoubleSide })));
    sm.add(new THREE.Mesh(sphere(9, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.7, fog: false })));
    sm.position.set(sx, 0, sz); sm.visible = false; g.scene.add(sm); this.smoke = sm;
  }
  post(id, [dx, dz, face, loop, hold]) {
    const n = this.c.npc(id), [x, z] = this.K(dx, dz);
    if (n.dead) n.revive();
    n.visible = true; n.mode = 'idle'; n.cb = null;
    n.teleport(x, z, typeof face === 'number' ? face : face ? Math.atan2(this.K(face[0], face[1])[0] - x, this.K(face[0], face[1])[1] - z) : n.yaw);
    n.setLoop(loop || null); n.h.hold('R', hold || null); n.h.hold('L', null); n.faceT = null; n.talk = () => this.c.talkTo(id);
    return n;
  }
  clear(phase) {
    const g = this.g, at = phase === 'market' || phase === 'tavern' || phase === 'skerry' || phase === 'kthing';
    for (const id of ['leif', 'orm', 'gisli', 'sailor', 'klaw', 'smith', 'salter', 'factor', 'thrall']) this.c.npc(id).visible = false;
    for (const n of [...this.town, ...this.hands, ...this.pen]) n.visible = false;
    this.KW.stages.skiff.set(phase !== 'skerry'); this.KW.stages.skiffOut.set(phase === 'skerry');
    this.beam.visible = false; this.basket.visible = false; this.smoke.visible = phase === 'oathnight';
    if (!at) this.diving = false;
    this.c.goat.m.visible = !at && phase !== 'raid';
  }
  /** Who is where in Kaupang. */
  dress(name) {
    const g = this.g, q = g.quests;
    if (name === 'market' || name === 'tavern' || name === 'kthing') {
      this.post('smith', [-106, 12.6, [-106, 16]]); this.post('salter', [-82, 12.6, [-82, 16]]); this.post('factor', [-58, 12.6, [-58, 16]]);
      this.post('thrall', [-104, 70.2, [-104, 60]]); [[-108, 76, 'sit'], [-100, 77, 'mourn'], [-99, 72, 'sit']].forEach(([dx, dz, loop], i) => this.post('pen' + i, [dx, dz, 3.1, loop]));
      [[-94, 21, 1.6], [-70, 19, -1.5], [-46, 21, 1.5], [-120, 30, 0], [-124, -24, 3], [-30, 18, -1.6], [-66, 40, 0.4], [-128, 52, 3]].forEach(([dx, dz, yaw], i) => this.post('kp' + i, [dx, dz, yaw, i % 3 === 2 ? 'talk' : null]));
    }
    if (name === 'market') { this.post('leif', [-131.6, -3.4, [-131.4, -0.6], 'talk']); this.post('orm', [-131.2, -0.4, [-131.6, -3.4], 'talk']); }
    if (name === 'tavern') { this.post('sailor', [-65, 50.6, 0, 'sit']); this.post('leif', [-129.6, -4.8, 2.2, 'sit']); this.post('orm', [-124, -12, 1.2]); }
    if (name === 'skerry') { this.post('leif', [-222.6, -227, 3.3]); this.post('gisli', [-227.6, -226.6, 2.9]); this.hands.forEach((n, i) => this.post('hand' + i, [-221 + i * 7.4, -223.4, 3.1])); }
    if (name === 'kthing') {
      const done = q.at('q_captain', 'home');
      this.post('klaw', [-30, -97.4, [-30, -104]]); this.post('orm', [-33.4, -103.4, [-30, -97.4]]); this.post('sailor', [-26.4, -103, [-30, -97.4]]);
      this.post('leif', done ? [-136, -2.6, [-150, -5]] : [-29.4, -104.4, [-30, -97.4]]); this.post('gisli', done ? [-137.6, -0.6, [-136, -2.6]] : [-27.6, -106.4, [-30, -97.4]]);
      this.hands.forEach((n, i) => this.post('hand' + i, done ? [-139 - i * 1.6, 1.6, 2.2] : [-31.6 - i * 1.5, -107, [-30, -97.4]]));
    }
  }
  /** Leif and his crew at home in Bjornstead (Chapter 9). */
  dressed(name) {
    const c = this.c;
    if (name !== 'oath' && name !== 'oathnight') return;
    if (name === 'oath') { c.post('leif', [-7.4, 136, [-3, 131]]).talk = () => c.talkTo('leif'); c.post('gisli', [-8.6, 134, [-3, 131]]).talk = () => c.talkTo('gisli'); this.hands.forEach((n, i) => { c.post('hand' + i, [5.6, 126.4 + i * 9, [0, 131], 'sit']); }); c.goatHome(); c.goat.pos.x += 4; }
    else for (const id of ['signe', 'v8', 'v1']) c.post(id, [id === 'signe' ? -2.5 : id === 'v8' ? 0.5 : -9.4, id === 'signe' ? 122.6 : 119.7, 0, id === 'v8' ? 'sit' : null]);
  }
  dyn() { return undefined; }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests, S = A2.silver, pay = (k) => { if (g.inventory.count('silver') >= S[k]) g.inventory.remove('silver', S[k]); };
    const once = (key, tree, fn) => { c.say(tree, n, () => { if (!this.said[key]) { this.said[key] = true; if (fn) fn(); q.notify('talk', id); } }); return true; };
    if (id === 'freydis' && q.at('q_captain', 'freydis')) { c.say('a2_list', n, () => { if (!g.inventory.has('list')) { g.inventory.add('list', 1); g.inventory.add('silver', S.purse); } q.notify('talk', 'freydis'); }); return true; }
    if (q.at('q_captain', 'market')) { if (id === 'smith') return once('iron', 'a2_iron', () => pay('iron')); if (id === 'salter') return once('salt', 'a2_saltbuy', () => pay('salt')); if (id === 'factor') return once('grain', 'a2_grain', () => pay('grain')); }
    if ((id === 'leif' || id === 'orm') && q.at('q_captain', 'quay')) { c.say('a2_quay', c.npc('leif'), () => q.notify('event', 'a2quay')); return true; }
    if (id === 'sailor' && q.at('q_captain', 'tavern')) { c.say('a2_sailor', n, () => q.notify('talk', 'sailor')); return true; }
    if (id === 'leif' && q.at('q_captain', 'leif')) { c.say('a2_barrel', n, () => q.notify('talk', 'leif')); return true; }
    if (id === 'klaw' && q.at('q_captain', 'thing')) { c.say('a2_kthing', n, () => q.notify('talk', 'klaw')); return true; }
    if (id === 'leif' && q.at('q_captain', 'home')) { c.say('a2_come', n, () => this.voyageHome()); return true; }
    if (id === 'leif' && q.at('q_oath', 'feast')) { c.say('a2_tale', n, () => q.notify('talk', 'leif')); return true; }
    if (id === 'bjorn' && q.at('q_oath', 'goat')) { c.say('a2_goat', n, () => q.notify('talk', 'bjorn')); return true; }
    if (id === 'bjorn' && q.at('q_oath', 'ring')) { c.say('a2_ring', n, () => { for (const fid of c.folk) { const v = c.npc(fid); if (v.visible && !v.kid) v.h.play('cheer', 1.2); } g.audio.play('questDone'); q.notify('talk', 'bjorn'); }); return true; }
    const lines = { leif: 'Sea serpents. Four of them. Ask anyone.', gisli: 'There were no serpents.', orm: 'Mooring is paid in advance. Everything is paid in advance.', smith: 'Iron is iron.', salter: 'Salt keeps.', factor: 'Barley, rye, and no credit.', sailor: 'Hic.', klaw: 'The Thing sits at noon.', thrall: '...' };
    if (lines[id]) { n.say(lines[id], 3); return true; }
    if (/^(kp|hand|pen)/.test(id)) { n.say(id.startsWith('pen') ? '...' : id.startsWith('hand') ? 'Leif says you are worth following. Leif says a lot of things.' : ['Glass from the Rhine! Wine from the Franks!', 'Mind your purse in Kaupang.', 'Ships from Denmark, from Frisia, from the far east. Look at them.'][(Math.random() * 3) | 0], 3.5); return true; }
    return false;
  }

  // ---- the voyage out and the voyage home -------------------------------------------------------
  sail() {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true;
    g.ui.fade(true, 1.2).then(() => g.ui.card('Kaupang', "Four days' sail down the coast", 4.5)).then(() => { c.setPhase('market', true); p.teleport(...this.K(-134, 40), Math.PI); return g.ui.fade(false, 1.2); })
      .then(() => { p.frozen = false; c.sub('Kaupang is the biggest place he has ever seen: hundreds of houses, ships from Denmark and Frisia and the far east, merchants selling glass, wine, swords and people.', 9); g.quests.notify('event', 'a2sailed'); });
  }
  voyageHome() {
    const g = this.g, c = this.c, p = g.player;
    p.frozen = true;
    g.ui.fade(true, 1.4).then(() => g.ui.card('The Sea-Raven', g.fmt('He names the ship Sea-Raven, after {w}. On the voyage home {w} lands on his shoulder and pulls his earring. Leif swears she is trying to steal it. {b} steals it.'), 8.5))
      .then(() => { g.quests.notify('talk', 'leif'); p.teleport(...c.B(-1, 138), Math.PI); return g.ui.fade(false, 1.4); }).then(() => { p.frozen = false; });
  }

  // ---- the wreck -----------------------------------------------------------------------------------
  diveOpts() { const wr = this.KW.wreck, c = this.c; return { x: wr.x, z: wr.z, floorY: wr.y, radius: 10.5, rope: { x: wr.x + 1.5, z: wr.z + 9.2 }, cfg: A2.dive, back: [...this.K(-225, -226), Math.PI], mates: [c.npc('leif'), c.npc('gisli')] }; }
  dive() {
    const g = this.g, c = this.c, q = g.quests, have = this.st.quests.q_captain.count;
    this.diving = true; for (const id of ['leif', 'gisli']) c.npc(id).mode = 'crew';
    c.hint('dive');
    const d = new Dive(g, { ...this.diveOpts(), cfg: { ...A2.dive, need: A2.dive.need - have },
      onSilver: (n, total) => { if (total + have === 2 || total + have === 4) c.sub('Leif is a wonderful diver and a terrible thief: he keeps stuffing coins into his own shirt instead of the basket.', 6.5); q.notify('event', 'a2silver', n); } });
    const fin = d.finish.bind(d); d.finish = (ok) => { fin(ok); this.diving = false; c.hint(null); for (const id of ['leif', 'gisli']) { const n = c.npc(id); n.mode = 'idle'; } this.dress('skerry'); };
    d.start();
  }
  lastDive() {
    const g = this.g, c = this.c, wr = this.KW.wreck, gi = c.npc('gisli'), o = this.diveOpts(), gx = wr.x - 2.4, gz = wr.z + 4.6;
    if (this.diving) return;
    this.diving = true; c.hint(null);
    gi.visible = true; gi.mode = 'crew'; gi.pos.set(gx, wr.y + 0.25, gz); gi.root.rotation.y = 1.2;
    this.beam.visible = true; this.beamY = wr.y + 0.75; this.beam.position.set(gx + 0.3, this.beamY, gz + 0.2); this.beam.rotation.set(0, 0.5, -0.15);
    this.basket.visible = true; this.basket.rotation.set(0, 0, 0);
    c.npc('leif').mode = 'crew';
    c.tell(["On the last dive the tide turns early. Gisli, Leif's youngest sailor, sixteen and the strongest swimmer, is caught by the rushing water and pinned under a beam inside the cave.", 'The basket of silver is on a ledge beside him, the richest haul of the day.'], 7.5);
    const d = new Dive(g, { ...o, mates: [c.npc('leif')], rescue: { gisli: gi, beam: this.beam, beamY: this.beamY, basket: this.basket, ledge: { x: gx + 3.4, z: gz + 1.2 }, tide: [0.25, 0.8], onDrop: () => c.sub('Eirik lets go of the basket and swims for Gisli.', 5) },
      onDone: () => { g.quests.notify('event', 'a2gisli'); } });
    const fin = d.finish.bind(d); d.finish = (ok) => { fin(ok); this.diving = false; c.npc('leif').mode = 'idle'; gi.mode = 'idle'; if (!ok) this.dress('skerry'); };
    d.start();
  }

  // =====================================================================================
  steps = {
    'q_captain.freydis'(r) { const c = this.c; c.setPhase('frost', r); c.post('freydis', [-1, 141, 2.6]); if (!r) c.sub('They need iron, salt and grain for winter, and the nearest great market is Kaupang.', 6); },
    'q_captain.sail'(r) { const c = this.c; c.setPhase('frost', r); c.post('v2', [0.6, 245, [0, 250]]); },
    'q_captain.market'(r) { this.c.setPhase('market', r); },
    'q_captain.pen'(r) { this.c.setPhase('market', r); },
    'q_captain.quay'(r) { const c = this.c; c.setPhase('market', r); if (!r) c.say('a2_pen', c.npc('thrall'), () => c.sub('On the quay, a man is shouting at the harbor reeve.', 5)); },
    'q_captain.tavern'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('tavern', r); c.sub('Eirik walks away.', 3); g.after(1.5, () => c.fade(() => { c.setPhase('tavern', true); g.player.teleport(...this.K(-60, 44), 0.4); }).then(() => c.sub('That evening he finds out the truth from a drunk sailor in a tavern.', 6))); },
    'q_captain.leif'(r) { const c = this.c; c.setPhase('tavern', r); if (!r) c.sub('Eirik goes back to the quay. Leif is sitting on a barrel, drinking alone.', 6); },
    'q_captain.skiff'(r) { const c = this.c; c.setPhase('tavern', r); if (!r) c.sub('They borrow a small boat.', 4); },
    'q_captain.tide'(r) { const c = this.c; c.setPhase('skerry', r); c.hint('eyeUp'); },
    'q_captain.dive'(r) { const c = this.c; c.setPhase('skerry', r); c.hint(null); if (!r) c.sub('They dive the wreck in the freezing green dark, hauling up silver in a basket.', 6); },
    'q_captain.gisli'(r) { const g = this.g, c = this.c; c.setPhase('skerry', r); if (!r) g.after(2.2, () => { if (g.mode === 'play' && !g.activity) this.lastDive(); }); else g.ui.hint('{interact} at the edge of the rock to dive'); },
    'q_captain.thing'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('kthing', r);
      g.after(0.6, () => c.fade(() => { c.setPhase('kthing', true); g.player.teleport(...this.K(-32, -108), 0.2); }, 1.2, 1.2).then(() => c.say('a2_left', c.npc('leif'), () => c.sub('What they did recover is enough.', 4))));
    },
    'q_captain.home'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('kthing', r); c.fade(() => { c.setPhase('kthing', true); g.player.teleport(...this.K(-133, 2), 3); }, 1, 1); },
    'q_oath.feast'(r) { const c = this.c; c.setPhase('oath', r); if (!r) c.sub("Bjornstead celebrates the Sea-Raven's arrival with a feast.", 6); },
    'q_oath.goat'(r) { this.c.setPhase('oath', r); },
    'q_oath.ring'(r) { const c = this.c; c.setPhase('oath', r); c.post('bjorn', [3.4, 130.8, [-4, 130.8]]).h.play('cheer', 1.4); },
    'q_oath.eye'(r) { const g = this.g, c = this.c; if (r) { c.setPhase('oathnight', r); return c.hint('eyeUp'); } c.fade(() => { c.setPhase('oathnight', true); g.player.teleport(...c.B(-6, 150), 2); }, 1.4, 1.4).then(() => { c.sub('That night {w} comes back from a long flight over the sea.', 6); c.hint('eyeUp'); }); },
    'q_oath.smoke'(r) { const c = this.c; c.setPhase('oathnight', r); c.hint('Fly west over the water, and press {interact} when she sees it.'); },
  };
  update() {}
}
