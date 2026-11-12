// Act VI at Ravenhold: "The Judgment of Torvald" (the Thing stones, the oath on Halfdan's ring), "The Death of
// the Iron Circle" (Sigurd's offer, and the Hall of Wolves), "The Nine Oaths" (a field under a sail-cloth roof),
// "A Wedding Before War" (the bride-price, the wedding, the harbor wall) and "Four Hundred" (Svartøy from the sky,
// the companions, the last night, the fleet). Myrholm is in act6_marsh.js; Skalløy is in act6_forge.js. See act2.js
// for what the mainland acts share.
import { place } from '../world/layout.js';
import { SIGURD_LINES, RING_LINES, WEDDING_LINES, MORNING_LINES, STUDY_LINES, FRIENDS } from '../data/act6.js';
import { PHASES } from './act2.js';
import { A4Part, TEN } from './act4_home.js';

const RULERS = ['hroald', 'eystein', 'ragnvald', 'hallvard', 'aslak', 'svein', 'jorund', 'thora', 'gudmund']; // six kings, two jarls and a queen
const BRING = { hroald: 'Jarnøy iron, and armored fighters.', eystein: 'Merchant ships, grain and silver.', ragnvald: "Kinn's sailors, the best in the North.", hallvard: 'The law, and lawspeakers to make the oaths binding.', aslak: "Fedje's shipwrights.",
  svein: "Skorpa's signal beacons, and grain.", jorund: "Vængr's swordsmen.", thora: 'Healers, marsh boats, and my secret channels.', gudmund: 'Siege ladders, rams and ship fittings.', bjorn: 'Stop wasting time.' }; // (game: each from the story's sentence)
const FRIEND_AT = { astrid: [9, 128, 2.6], svanhild: [13, 131.4, -2.2], leif: [-1.8, 229.6, Math.PI] };

export class A6Home extends A4Part {
  constructor(game, core) { super(game, core); this.fires = []; }
  get H() { return this.g.world.main.home6; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, H = this.H;
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 3, priority: 3, label, enabled, use, ...o });
    I('a6oath', c.B(-92, 93.4), "Hold out Halfdan's ring", () => q.at('q_judge', 'oath') && !this.busy, () => this.oath(), { r: 4.2 });
    I('a6ring', H.roof.table, "Hold up Halfdan's ring", () => q.at('q_nine', 'ring') && !this.busy, () => this.playRing(), { r: 3.4 });
    I('a6study', H.roof.table, "Close his eyes: Svartøy, through the white raven's eyes", () => q.at('q_four', 'svartoy') && !this.busy, () => this.playStudy(), { r: 3.4 });
  }
  clear(phase) {
    const g = this.g, c = this.c, home = phase.startsWith('a6') && !PHASES[phase].at;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    this.busy = false; this.thingOn = false; this.fieldOn = false; this.wedOn = false; this.nightOn = false; this.sailOn = false; this.sig = null;
    if (home) { c.act.glowTarget = 0; for (const id of ['thora', 'eyvind', 'gest', 'gudmund', 'halvar']) c.npc(id).visible = false; }
  }
  /** Ravenhold, where Act VI has brought it. */
  dressed(name) {
    if (!name.startsWith('a6') || PHASES[name].at) return;
    const c = this.c, g = this.g, w = g.world, put = (id, s) => c.post(id, s), H = this.H, S = c.W.stages, jd = this.at('q_judge'), wd = this.at('q_wedding'), fr = this.at('q_four');
    const all = [...c.folk.filter((id) => !id.startsWith('kid') && id !== 'hauk' && id !== 'grjotgard'), 'signe', 'freydis'];
    for (const id of ['grjotgard', 'brokk', 'lawman']) c.npc(id).visible = false;
    const tv = c.npc('torvald'), bow = (n) => { n.h.hold('L', 'bow'); return n; }, sword = (n) => { n.h.hold('R', 'sword'); return n; };
    const seats = []; for (const tz of [128, 133.5]) for (const side of [-1, 1]) for (let i = 0; i < 5; i++) seats.push([-6.6 + i * 1.5, tz + side * 0.95, side > 0 ? Math.PI : 0, 'sit']);
    if (PHASES[name].day) { // an ordinary day of these years: Halvar is master smith, and Freydis is showing him where everything is
      put('v6', [-0.9, 244, 0.2, 'fish', 'rod']); put('bjorn', [0.5, 119.7, 0, 'sit']); put('v8', [3.4, 119.7, 0, 'sit']);
      put('halvar', [-65.3, 149.4, [-64.2, 149.4], 'hammer', 'hammer']); put('freydis', [-62.4, 152.4, [-65.3, 149.4]]); put('leif', [-1.8, 229.6, Math.PI]); put('gisli', [4.4, 224.6, 3.4]);
      bow(put('astrid', [9, 128, 2.6])); put('ingrid', [-32.6, 118.8, 2.8]); put('hrefna', [-37, 122, 1.2]); sword(put('svanhild', [13, 131.4, -2.2]));
      tv.visible = false; // he has lost his home in Ravenhold
    }
    if (name === 'a6thing') { // the alliance, at the stones
      c.ring([...all, 'leif', 'gisli', 'astrid', 'ingrid', 'hrefna', 'svanhild', 'halvar'], -92, 92, 7.4, null, 0.3, 4.6);
      put('hallvard', [-93.6, 95.6, [-92, 91]]); put('bjorn', [-88.2, 87.6, [-92, 92], 'sit']); put('hauk', [-101.6, 98.4, [-92, 92], 'sit']);
      [['aslak', -96.6, 93.6], ['ragnvald', -96.4, 90.4], ['eystein', -88, 94.4], ['hroald', -87.6, 91], ['svein', -90.4, 96.4], ['jorund', -94.4, 87.6], ['thora', -90.6, 87], ['gudmund', -97.6, 96.4]].forEach(([id, x, z]) => put(id, [x, z, [-92, 91]]));
      const t = put('torvald', [-92, 91, [-93.6, 95.6], jd === 99 || jd > 1 ? 'kneel' : null]); t.h.hold('R', null);
    }
    if (name === 'a6offer') { put('sigmess', [-7.6, 63.6, 0.6]); ['v3', 'v7'].forEach((id, i) => { const n = put(id, [-10 + i * 5.4, 62, 0.4, 'guard', 'spear']); n.h.hold('L', 'shield'); }); }
    if (name === 'a6autumn' || name === 'a6tent' || name === 'a6weeks') { // the kings are at Ravenhold
      const R = H.roof, rx = R.x - c.W.s.x, rz = R.z - c.W.s.z, council = name === 'a6autumn';
      RULERS.forEach((id, i) => { const a = -2.2 + i * 0.55, r = council ? 4.3 : 4.6 + (i % 2); put(id, [rx + Math.sin(a) * r, rz - 2.4 + Math.cos(a) * r * 0.8 + (council ? 0 : 1), [rx, rz - 2.4], !council && i % 3 === 0 ? 'talk' : null]); });
      if (council) {
        put('bjorn', [rx + 3.4, rz + 2.6, [rx, rz - 2.4]]); bow(put('astrid', [rx - 6.4, rz + 3.4, [rx, rz]])); sword(put('svanhild', [rx - 5, rz + 4.6, [rx, rz]])); put('leif', [rx + 6.2, rz + 3.6, [rx, rz]]); put('ingrid', [rx + 5, rz + 4.8, [rx, rz]]); put('halvar', [rx - 7.6, rz + 1, [rx, rz]]);
        all.forEach((id, i) => { const a = 0.5 + (i / all.length) * 2.2, r = 9.6 + (i % 3) * 1.2; put(id, [rx + Math.sin(a - 1.6) * r, rz + 2 + Math.cos(a - 1.6) * r * 0.75, [rx, rz - 2.4]]); }); // three hundred people listening at the edges
        ['hauk', 'gisli', 'hrefna'].forEach((id, i) => put(id, [rx - 3 + i * 3, rz + 9.6, [rx, rz]]));
      }
      if (name === 'a6tent') { const T = H.tent, tx = T.door[0] - c.W.s.x, tz = T.door[1] - c.W.s.z; put('leif', [tx - 1.2, tz + 0.4, [tx + 3, tz]]); put('ingrid', [tx - 2.8, tz + 2.6, [tx, tz]]); c.npc('hroald').visible = false; }
    }
    if (name === 'a6wed') { // the end of autumn
      [...all.filter((id) => id !== 'freydis'), 'gisli', 'hrefna', 'hauk'].forEach((id, i) => { if (seats[i]) put(id, seats[i]); });
      put('leif', [-1.7, 139.6, [-0.3, 139.6]]); put('ingrid', [-0.3, 139.6, [-1.7, 139.6]]); put('hroald', [1.6, 141.2, [-1, 139.6]]); put('bjorn', [3.4, 130.8, [-1, 139.6], 'sit']);
      bow(put('astrid', [2.8, 137.4, [-1, 139.6]])).h.hold('L', null); put('svanhild', [4, 138.2, [-1, 139.6]]); put('freydis', [-6.4, 142.6, [-5.2, 142.9]]); put('halvar', [-5.2, 142.9, [-6.4, 142.6]]);
      RULERS.slice(1).forEach((id, i) => put(id, [-9 + i * 2.4, 145.6 + (i % 2) * 1.2, [-1, 139.6]]));
      const [fx, fz] = c.B(12, 130.5); this.fires.push(g.fx.addFire(fx, w.groundAt(fx, fz) + 0.3, fz, 1.6));
    }
    if (name === 'a6morn') { const hw = S.hwall; for (const [id, k] of [['leif', -0.42], ['ingrid', 0.42]]) { const n = this.fix(c.npc(id), hw.x + k, hw.y - 0.44, hw.z + 0.3, 0, 'sit'); n.h.hold('R', null); n.h.hold('L', null); } } // on the wall, their feet over the water
    if (name === 'a6weeks') { put('halvar', [-65.3, 149.4, [-64.2, 149.4], 'hammer', 'hammer']); put('ingrid', [-32.6, 118.8, 2.8, 'kneel']); TEN.slice(0, 4).forEach((id, i) => put(id, [-36 + i * 1.6, 121.6 + (i % 2), [-32.6, 118.8], 'kneel'])); void fr; }
    if (name === 'a6last') { put('signe', [-2.5, 122.6, 0.2]); put('bjorn', [0.5, 119.7, 0, 'sit']); put('freydis', [-4.6, 121, 0.6]); }
    if (name === 'a6dawn') { // the fleet of the nine oaths
      put('leif', [-1.8, 229.6, Math.PI]); put('gisli', [4.4, 224.6, 3.4]); bow(put('astrid', [2.4, 221, Math.PI])); sword(put('svanhild', [-3.6, 220.4, Math.PI])); put('ingrid', [0.6, 218.6, Math.PI]); put('halvar', [-6, 222, 2.6]);
      TEN.forEach((id, i) => { const n = put(id, [-7 + i * 2.8, 214.6 + (i % 2) * 1.4, Math.PI, null, 'spear']); n.h.hold('L', 'shield'); });
      put('bjorn', [3.4, 210.4, Math.PI]); put('signe', [5, 210.8, Math.PI]); put('freydis', [6.6, 211.4, Math.PI]); RULERS.slice(0, 5).forEach((id, i) => put(id, [-14 + i * 2.2, 218 + (i % 2), 2.4]));
    }
    void wd;
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests, ph = c.phase;
    if (!ph || !ph.startsWith('a6') || PHASES[ph].at) return false;
    if (id === 'sigmess') { if (q.at('q_sigurd', 'offer')) c.say('a6_offer', n, () => q.notify('talk', 'sigmess')); else n.say('...', 2); return true; }
    if ((id === 'torvald' || id === 'hallvard') && q.at('q_judge', 'oath')) { if (!this.busy) this.oath(); return true; }
    if (id === 'leif' && q.at('q_wedding', 'price')) { c.say('a6_price', n, () => q.notify('talk', 'leif')); return true; }
    if (FRIENDS[id] && q.at('q_four', 'friends')) { const fl = this.st.flags, was = fl.a6asked || (fl.a6asked = {}); c.sub(FRIENDS[id], 7); if (!was[id]) { was[id] = true; q.notify('event', 'a6friend'); } return true; }
    if (BRING[id] && (ph === 'a6autumn' || ph === 'a6weeks' || ph === 'a6tent')) { n.say(BRING[id], 3.6); return true; }
    if (id === 'halvar') { n.say('Build things that last longer than anger. He said that.', 4); return true; } // (game: from the story's line)
    if (id === 'torvald' || RULERS.includes(id) || ph === 'a6thing' || ph === 'a6last' || ph === 'a6dawn' || ph === 'a6wed') { n.say('...', 2); return true; }
    return false;
  }
  cues = {
    haukUp6() { const h = this.c.npc('hauk'); h.setLoop(null); this.g.after(7, () => h.setLoop('sit')); },
    kneel6() { this.c.npc('torvald').setLoop('kneel'); },
    tentIn() { const c = this.c, l = c.npc('leif'), T = this.H.tent; l.goTo(T.door[0] + 0.9, T.door[1], { onArrive: (o) => { o.visible = false; } }); },
    tentOut() { const c = this.c, l = c.npc('leif'), i = c.npc('ingrid'), T = this.H.tent; l.visible = true; l.teleport(T.door[0] - 0.6, T.door[1] + 0.3, -Math.PI / 2); i.goTo(l.pos.x - 0.8, l.pos.z + 0.5, { onArrive: (o) => o.face(l.pos.x, l.pos.z) }); },
    hold6() { const c = this.c, p = this.g.player, s = c.npc('signe'); s.teleport(p.pos.x + Math.sin(p.yaw) * 0.55, p.pos.z + Math.cos(p.yaw) * 0.55, p.yaw + Math.PI); },
  };
  oath() { const c = this.c; this.busy = true; c.say('a6_oath', c.npc('torvald'), () => { this.busy = false; this.g.quests.notify('event', 'a6oath'); }); }
  dyn(name) {
    const q = this.g.quests, c = this.c;
    if (name !== 'a6work' || !q.at('q_four', 'friends')) return undefined;
    const was = this.st.flags.a6asked || {}, id = Object.keys(FRIEND_AT).find((k) => !was[k]); if (!id) return null;
    const n = c.npc(id); return { x: n.pos.x, z: n.pos.z, y: n.pos.y + 2.2 };
  }

  // ---- the Hall of Wolves: the death of the Iron Circle -----------------------------------------------------
  playSigurd() {
    const g = this.g, c = this.c, R = c.raid;
    if (R.hallOn) return;
    const { h, y0, zs, C, set } = R.hallOpen(), hk = C.hakon, si = C.sigurd, T = c.sea.town;
    for (const id of ['arne', 'rurik', 'skarde', 'eydis', 'bersi']) C[id].visible = false; // five of the seven are dead
    set(C.ulf, h.x - 3.2, zs - 7.6, Math.PI / 2, 'sit'); set(C.kettil, h.x + 3.2, zs - 7.6, -Math.PI / 2, 'sit');
    set(si, h.x, zs - 7.6, 0, null);
    const env = [c.npc('sigmess'), T[0], T[1]]; env.forEach((n, i) => { n.name = "One of the Circle's envoys"; set(n, h.x - 1.6 + i * 1.6, zs - 12.4 - (i % 2) * 0.8, 0, null); }); // the Circle's other envoys
    this.sig = { env, hk, si, t: 0 };
    const eye = (n, up = 1.5) => [n.pos.x, n.pos.y + up, n.pos.z], cam = {
      table: () => ({ from: [h.x + 0.6, y0 + 3.1, zs - 20], to: [h.x - 0.4, y0 + 2.5, zs - 17.5], look: [h.x, y0 + 1.0, zs - 6], fov: 46 }),
      sigurd: () => ({ from: [h.x + 1.5, y0 + 1.5, zs - 5.2], look: eye(si, si.pose === 'dead' ? 0.3 : 1.5), fov: 32 }), hakon: () => ({ from: [h.x - 1.3, y0 + 1.5, zs - 8.4], look: eye(hk, hk.pose === 'sit' ? 1.0 : 1.55), fov: 32 }) };
    const act = {
      bundle: () => g.audio.play('clack'),
      stand: () => { hk.pose = null; hk.pos.set(h.x, y0, zs - 4.6); },
      kill: () => { hk.pos.set(h.x - 0.2, y0, zs - 6.4); hk.h.hold('R', 'sword'); hk.h.play('atk1', 0.6); g.after(0.4, () => { g.audio.play('hurt'); g.audio.play('steel', { vol: 0.5 }); si.h.play('fall', 0.9, { onEnd: () => { si.pose = 'dead'; } }); for (const n of env) n.pose = 'cower'; }); },
    };
    const shots = SIGURD_LINES.map(([who, sp, text, k]) => { const v = cam[who](), dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.25, v.from[1], v.from[2] + 0.2], look: () => cam[who]().look, fov: v.fov, sub: [sp, text, dur - 0.3], onStart: k ? act[k] : null }; });
    g.ui.fade(false, 1.2);
    g.cine.play(shots, { onEnd: () => { R.hallClose(() => { for (const n of env) { n.visible = false; n.pose = null; n.mode = 'idle'; } si.pose = null; hk.h.hold('R', null); this.sig = null; g.player.teleport(...c.B(-2, 150), 0); }).then(() => g.quests.notify('event', 'a6hall')); } });
  }
  // ---- the nine oaths ---------------------------------------------------------------------------------------------
  playRing() {
    const g = this.g, c = this.c, p = g.player, [tx, tz] = this.H.roof.table, y = g.world.groundAt(tx, tz), b = c.npc('bjorn');
    this.busy = true; p.frozen = true; g.ravens.exitEye(); p.teleport(tx, tz + 0.6, 0);
    const eye = (n) => () => [n.pos.x, n.pos.y + 1.5, n.pos.z];
    const cam = { eirik: { from: [tx + 2.4, y + 1.6, tz + 4.6], to: [tx + 1.8, y + 1.6, tz + 4.0], look: eye(p), fov: 32 }, ring: { from: [tx - 4.6, y + 3.4, tz + 6.4], to: [tx - 3.4, y + 2.8, tz + 5.2], look: [tx, y + 1.2, tz + 0.6], fov: 40 },
      bjorn: { from: [tx + 5.4, y + 3.0, tz + 6.2], look: eye(b), fov: 30 }, wide: { from: [tx - 3, y + 6.5, tz + 17], to: [tx, y + 5, tz + 13], look: [tx, y + 1.4, tz], fov: 48 } };
    const act = {
      hold: () => { p.h.play('cheer', 2.4); g.audio.play('chime'); },
      swear: () => RULERS.forEach((id, i) => g.after(0.4 + i * 1.0, () => { const n = c.npc(id), a = -2.4 + i * 0.6; n.setLoop(null); n.goTo(tx + Math.sin(a) * 1.5, tz + 0.6 + Math.cos(a) * 1.5, { onArrive: (o) => { o.face(tx, tz + 0.6); o.h.play('pickup', 0.9); g.audio.play('clack', { vol: 0.4 }); } }); })),
      bjorn: () => { b.setLoop(null); b.goTo(tx + 1.2, tz + 1.9, { onArrive: (o) => { o.face(tx, tz + 0.6); o.h.play('pickup', 1.0); g.audio.play('thud', { vol: 0.5 }); } }); },
      cheer: () => { for (const id of c.folk) { const v = c.npc(id); if (v.visible && !v.kid) v.h.play('cheer', 1.4); } g.audio.play('questDone'); },
    };
    const shots = RING_LINES.map(([who, sp, text, k]) => { const v = cam[who], dur = (k === 'swear' ? 5 : 2.8) + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.2, v.from[1], v.from[2] + 0.2], look: v.look, fov: v.fov, sub: [sp, text, dur - 0.3], onStart: k ? act[k] : null }; });
    g.cine.play(shots, { onEnd: () => { p.frozen = false; this.busy = false; g.quests.notify('event', 'a6ring'); } });
  }
  // ---- the wedding, and the harbor wall -------------------------------------------------------------------------------
  playWedding() {
    const g = this.g, c = this.c, p = g.player, l = c.npc('leif'), i = c.npc('ingrid'), a = c.npc('astrid'), s = c.npc('svanhild'), go = c.goat, [cx, cz] = c.B(-1, 139.6), y = g.world.groundAt(cx, cz);
    this.wedOn = true; p.frozen = true; g.ravens.exitEye(); p.teleport(cx - 2.1, cz + 0.9, Math.PI / 2 + 0.5);
    const eye = (n) => () => [n.pos.x, n.pos.y + 1.5, n.pos.z];
    const cam = { wide: { from: [cx + 5, y + 3.2, cz + 9], to: [cx + 3.4, y + 2.6, cz + 7.4], look: [cx, y + 1.3, cz], fov: 44 }, two: { from: [cx + 0.3, y + 1.5, cz + 3.6], to: [cx, y + 1.5, cz + 3.2], look: [cx, y + 1.45, cz], fov: 30 },
      eirik: { from: [cx - 0.6, y + 1.6, cz + 3.6], look: eye(p), fov: 30 }, toast: { from: [cx + 1.4, y + 1.6, cz + 1.4], look: () => [(a.pos.x + s.pos.x) / 2, a.pos.y + 1.5, (a.pos.z + s.pos.z) / 2], fov: 34 } };
    const act = {
      sword: () => { l.h.play('pickup', 0.9); g.after(0.6, () => { l.h.hold('L', null); i.h.hold('R', 'sword'); g.audio.play('steel', { vol: 0.4 }); }); },
      sword2: () => { i.h.play('pickup', 0.9); g.after(0.6, () => { l.h.hold('L', 'sword'); g.audio.play('steel', { vol: 0.4 }); }); },
      toast: () => { a.h.play('cheer', 1.6); g.after(0.8, () => s.h.play('cheer', 1.6)); g.after(4, () => l.h.play('cheer', 2)); },
      dance: () => { const f = c.npc('freydis'), h = c.npc('halvar'); f.h.play('cheer', 2); h.h.play('cheer', 2); for (const id of c.folk) { const v = c.npc(id); if (v.visible && !v.kid) v.h.play('cheer', 1.2); }
        go.m.visible = true; go.roof = false; go.to = null; go.pos.set(cx + 1.2, y, cz + 1.4); go.m.rotation.y = -2.2; g.audio.play('questDone'); },
    };
    l.h.hold('R', 'seax'); l.h.hold('L', 'sword');
    const shots = WEDDING_LINES.map(([who, sp, text, k]) => { const v = cam[who], dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.2, v.from[1], v.from[2] + 0.2], look: v.look, fov: v.fov, sub: [sp, text, dur - 0.3], onStart: k ? act[k] : null }; });
    g.cine.play(shots, { onEnd: () => { p.frozen = false; g.quests.notify('event', 'a6vows'); } });
  }
  playMorning() {
    const g = this.g, c = this.c, p = g.player, hw = c.W.stages.hwall;
    p.frozen = true; g.ravens.exitEye(); p.teleport(...c.B(0, 209), 0);
    const cam = { wall: { from: [hw.x - 3.4, hw.y + 1.7, hw.z - 5.4], to: [hw.x - 2.4, hw.y + 1.5, hw.z - 4.4], look: [hw.x, hw.y + 0.5, hw.z], fov: 40 }, two: { from: [hw.x + 0.6, hw.y + 0.8, hw.z + 3.6], to: [hw.x + 0.2, hw.y + 0.8, hw.z + 3.3], look: [hw.x, hw.y + 0.6, hw.z + 0.3], fov: 30 } };
    const shots = MORNING_LINES.map(([who, sp, text]) => { const v = cam[who], dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to, look: v.look, fov: v.fov, sub: [sp, text, dur - 0.3] }; });
    g.cine.play(shots, { onEnd: () => { p.frozen = false; g.quests.notify('event', 'a6morning'); } });
  }
  // ---- Svartøy, from the sky -----------------------------------------------------------------------------------------
  playStudy() {
    const g = this.g, c = this.c, p = g.player, RS = g.world.realm.svartoy, hb = place('svartoy', 'harbor'), tn = place('svartoy', 'town'), br = RS.bridge, hl = RS.hall, back = [p.pos.x, p.pos.z, p.yaw];
    this.busy = true; p.frozen = true; g.ravens.exitEye();
    const views = { far: { from: [hb.x - 80, 170, hb.z - 300], to: [hb.x - 40, 150, hb.z - 240], look: [tn.x, 20, tn.z] }, harbor: { from: [hb.x + 70, 52, hb.z - 120], to: [hb.x + 40, 46, hb.z - 100], look: [hb.x, 2, hb.z - 20] },
      cliffs: { from: [br.x + 150, 70, br.z - 60], to: [br.x + 130, 62, br.z - 30], look: [br.x + 30, br.y - 10, br.z] }, bridge: { from: [br.x - 60, br.y + 40, br.z - 70], to: [br.x - 44, br.y + 32, br.z - 54], look: [br.x, br.y, br.z] },
      hall: { from: [hl.x + 50, hl.y + 44, hl.z - 80], to: [hl.x + 36, hl.y + 36, hl.z - 62], look: [hl.x, hl.y + 3, hl.z] } };
    const shots = STUDY_LINES.map(([who, text], k) => { const v = views[who], dur = k ? 4.6 : 3 + text.length * 0.058; return { dur, from: v.from, to: v.to, look: v.look, fov: 50, sub: ['', g.fmt(text), dur - 0.3] }; });
    g.ui.fade(true, 0.8).then(() => {
      g.ravens.setMode('hidden'); p.root.visible = false; p.teleport(tn.x, tn.z, 0); g.audio.play('raven'); g.ui.fade(false, 0.8);
      g.cine.play(shots, { onEnd: () => g.ui.fade(true, 0.8).then(() => {
        p.root.visible = true; p.teleport(back[0], back[1], back[2]); g.ravens.setMode('follow'); p.frozen = false; this.busy = false;
        c.sub("Halvar's forges ring day and night. Ingrid trains forty helpers to stop bleeding and splint bones. Thora's guides draw the secret channels in charcoal on sail-cloth.", 10);
        g.quests.notify('event', 'a6study'); return g.ui.fade(false, 0.8);
      }) });
    });
  }

  // =====================================================================================
  steps = {
    'q_judge.thing'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a6thing', r);
      c.fade(() => { c.setPhase('a6thing', true); g.player.teleport(...c.B(-78, 104), -2.4); if (g.player.equipped !== 'none') g.player.equip('none'); return g.ui.card('The Judgment of Torvald', "The alliance gathers at Ravenhold's Thing stones.", 5.5); }, 1.6, 1.6);
    },
    'q_judge.oath'(r) { this.c.setPhase('a6thing', r); },
    'q_sigurd.offer'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a6offer', r);
      c.fade(() => { c.setPhase('a6offer', true); g.player.teleport(...c.B(-6, 76), Math.PI); return g.ui.card('The Death of the Iron Circle', '', 4); }, 1.4, 1.4);
    },
    'q_sigurd.hall'(r) { const g = this.g, c = this.c; c.setPhase('a6offer', r); if (r) return this.playSigurd(); g.player.frozen = true; g.ui.fade(true, 1.4).then(() => this.playSigurd()); },
    'q_nine.field'(r) {
      const g = this.g, c = this.c;
      c.setPhase('a6autumn', r);
      if (!r) { g.player.teleport(...c.B(52, 140), 1.3); g.ui.card('The Nine Oaths', 'In autumn', 4); }
    },
    'q_nine.ring'(r) { this.c.setPhase('a6autumn', r); },
    'q_wedding.price'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a6tent', r);
      c.fade(() => { c.setPhase('a6tent', true); g.player.teleport(...c.B(86, 146), 1.4); return g.ui.card('A Wedding Before War', '', 4); }, 1.4, 1.4);
    },
    'q_wedding.vows'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a6wed', r);
      c.fade(() => { c.setPhase('a6wed', true); g.player.teleport(...c.B(8, 152), -0.6); return g.ui.card('', 'The end of autumn', 3); }, 1.4, 1.4);
    },
    'q_wedding.morning'(r) { const g = this.g, c = this.c; if (r) { c.setPhase('a6morn', r); return this.playMorning(); } g.player.frozen = true; g.ui.fade(true, 1.4).then(() => { c.setPhase('a6morn', true); this.playMorning(); return g.ui.fade(false, 1.2); }); },
    'q_four.svartoy'(r) {
      const g = this.g, c = this.c, lines = ["About four hundred warriors will land on Svartøy, once the fleet has broken Håkon's blockade. Hundreds more sailors will stay with the ships, and garrisons stay home to guard the islands.",
        'Håkon has about five hundred warriors in his fortress, with more ships guarding the approaches. Kettil Red-Hand commands the land defenses. Ulf Two-Blades commands the fleet. Vigdis and Gorm, the left and right hands, guard Håkon himself.'];
      if (r) return c.setPhase('a6weeks', r);
      c.fade(() => { c.setPhase('a6weeks', true); g.player.teleport(...c.B(60, 138), 1.3); return g.ui.card('Four Hundred', 'The alliance prepares the invasion.', 5); }, 1.4, 1.4).then(() => c.tell(lines, 9.5));
    },
    'q_four.friends'(r) { const c = this.c; c.setPhase('a6weeks', r); if (!r) this.g.after(10.5, () => c.sub('Eirik talks with every one of his companions.', 4)); },
    'q_four.home'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a6last', r);
      c.fade(() => { c.setPhase('a6last', true); g.player.teleport(...c.B(-2, 134), Math.PI); return g.ui.card('', 'On the last night', 3); }, 1.6, 1.6);
    },
    'q_four.sail'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a6dawn', r);
      c.fade(() => { c.setPhase('a6dawn', true); g.player.teleport(...c.B(0, 204), 0); }, 1.6, 1.6);
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase, near = (dx, dz, d) => Math.hypot(p.pos.x - c.B(dx, dz)[0], p.pos.z - c.B(dx, dz)[1]) < d;
    if (this.sig) this.crew(this.sig.env, dt);
    if (!ph || !ph.startsWith('a6') || PHASES[ph].at) return;
    if (ph === 'a6morn') this.crew([c.npc('leif'), c.npc('ingrid')], dt);
    if (g.mode !== 'play') return;
    if (q.at('q_judge', 'thing') && !this.thingOn && near(-92, 92, 10)) { this.thingOn = true; c.say('a6_confess', c.npc('torvald'), () => q.notify('event', 'a6thing')); }
    if (q.at('q_nine', 'field') && !this.fieldOn && near(76, 132, 13)) { this.fieldOn = true; c.say('a6_bring', null, () => q.notify('event', 'a6field')); }
    if (q.at('q_wedding', 'vows') && ph === 'a6wed' && !this.wedOn && near(-1, 139.6, 7)) this.playWedding();
    if (q.at('q_four', 'home') && ph === 'a6last' && !this.nightOn && c.npc('signe').dist(p) < 3.4) { this.nightOn = true; c.say('a6_lastnight', c.npc('bjorn'), () => q.notify('event', 'a6home')); }
    if (q.at('q_four', 'sail') && ph === 'a6dawn' && !this.sailOn && near(-2, 232, 7)) { this.sailOn = true; p.frozen = true; g.audio.play('horn', { freq: 98, vol: 0.5 }); c.tell(['Before dawn, the fleet of the nine oaths sails for Svartøy.'], 7).then(() => q.notify('event', 'a6sail')); }
  }
}
