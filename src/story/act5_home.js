// Act V at Ravenhold: "Ashes Again" (the assembly, and what the rebuilding costs), "The Winter of Hunger" (the
// flux, the blot, the frog, the whale, the first law), the home ends of "The Raven Taken" and "The Ring of Halfdan",
// "The Letter That Was Never Written" (the cell) and "The Feast of Survivors". The hunting camp is in act5_camp.js;
// Gannet Rock and Vængr are in act5_wing.js. See act2.js for what the mainland acts share.
import * as THREE from 'three';
import { M, box, cyl, tint, at } from '../world/geo.js';
import { horseModel } from '../entities/wildlife.js';
import { CAST5, A5, COSTS, CONTEST_LINES, KISS_LINES } from '../data/act5.js';
import { Knack } from '../systems/activities2.js';
import { PHASES } from './act2.js';
import { A4Part, TEN } from './act4_home.js';

const NEW = ['frogman', 'farmer', 'creditor', 'debtor', 'debtgirl', 'sigmess', 'myrmess', 'svanhild'];
const BUILD = { tower: [-12.4, 203.6, 'Raise the new watchtower', 'hammer'], harbor: [47, 210.4, 'Rebuild the harbor', 'hammer'], ship: [-32.4, 212.4, 'Lay down a new ship', 'woodaxe'] };
const ARROW = "A message arrives two days later on an arrow fired into the gate. It is from Håkon. His falconer, Ottar, has caught the white raven in a net. If Eirik gives himself up at Håkon's hunting camp on the mainland by the next new moon, the bird will be freed. If not, she will be plucked and roasted at Håkon's table.";

export class A5Home extends A4Part {
  constructor(game, core) { super(game, core); this.fires = []; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world, S = c.W.stages;
    for (const id of NEW) { const n = g.addNPC(id, CAST5[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    const hm = horseModel(); hm.visible = false; g.scene.add(hm); this.horse = hm;
    const mesh = (geo, col) => { const m = new THREE.Mesh(tint(geo, col, 0.1, 2), M.vcPlain); m.visible = false; g.scene.add(m); return m; };
    this.gateArrow = mesh(at(cyl(0.015, 0.015, 0.8, 4), 0, 0, 0, 0.3, 0, 0), 0x2a2420); { const [x, z] = c.B(-5.4, 58.3); this.gateArrow.position.set(x, w.groundAt(x, z) + 1.7, z); }
    this.goatArrow = mesh(at(cyl(0.012, 0.012, 0.7, 4), 0, 0, 0, 0.9, 0, 0), 0xd8d2c2);
    this.sword = mesh(at(box(0.05, 0.9, 0.015), 0, 0, 0, 0, 0, Math.PI / 2 - 0.15), 0xb8bcc4);
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, ...(typeof pos === 'function' ? { pos, x: 0, z: 0 } : { x: pos[0], z: pos[1] }), r: 3, priority: 3, label, enabled, use, ...o });
    for (const [qid, sid, label] of [['q_carry', 'assembly', 'Stand before the assembly'], ['q_hunger', 'blot', 'Hold the midwinter blot'], ['q_hunger', 'first', 'Ask the Thing for a new rule']])
      I('a5stones_' + sid, c.B(-92, 92), label, () => q.at(qid, sid) && !this.busy, () => this.stones(), { r: 3.6 });
    for (const k in BUILD) I('a5build_' + k, c.B(BUILD[k][0], BUILD[k][1]), BUILD[k][2], () => this.job() === k && !g.activity && !this.busy, () => this.work());
    I('a5grain', c.B(63, 208), 'Look into the last grain store', () => q.at('q_hunger', 'grain') && !this.busy, () => { this.busy = true; c.say('a5_grain', null, () => { this.busy = false; q.notify('event', 'a5grain'); }); });
    I('a5latrine', c.B(17, 148.4), 'Move the latrine away from the well', () => q.at('q_hunger', 'latrine') && !g.activity, () => this.latrine());
    I('a5bedding', c.B(111.6, 150), 'Burn the soiled bedding', () => q.at('q_hunger', 'bedding') && !this.busy, () => this.burn());
    I('a5cut', () => { const [x, z] = S.whale.flank[Math.min(2, this.count('q_hunger'))]; return { x, z }; }, 'Cut into the whale', () => q.at('q_hunger', 'cut') && !g.activity && !this.busy, () => this.cut(), { r: 3.4 });
    I('a5arrow', c.B(-6, 60), 'Pull the arrow out of the gate', () => q.at('q_taken', 'arrow') && !this.busy, () => this.arrow());
    I('a5sail', c.B(-2.2, 236), 'Board the Sea-Raven', () => (q.at('q_ring', 'sail') || q.at('q_wing', 'sail')) && !this.busy, () => (q.at('q_ring', 'sail') ? c.wing.toGannet() : c.wing.toVaengr()), { r: 3.6 });
    I('a5wash', c.B(7, 225), 'Jump in the sea', () => q.at('q_taken', 'sea') && !this.busy, () => this.wash(), { r: 4 });
    I('a5cell', S.cell.front, 'Go down to the cell', () => q.at('q_ribbon', 'cell') && !this.busy, () => this.cell(), { r: 3.2 });
    g.ravens.addMarkable({ id: 'a5whale', pos: () => ({ x: S.whale.x, z: S.whale.z }), r: 80, label: 'something big on the shore', enabled: () => q.at('q_hunger', 'whale'),
      onMark: () => { c.sub('A whale has beached itself on the shore an hour north. It is the size of a longship.', 7); g.after(3.5, () => q.notify('event', 'a5whale')); } });
    g.events.on('ravenReach', () => { if (q.at('q_taken', 'reach') && !this.reached) { this.reached = true; c.sub("When Eirik reaches for {w}'s mind there is only fear and darkness and the smell of leather.", 8); g.after(5, () => q.notify('event', 'a5reach')); } });
  }
  /** Which piece of the rebuilding is in hand. */
  job() { const q = this.g.quests; return q.at('q_carry', 'tower') ? 'tower' : q.at('q_carry', 'harbor') ? 'harbor' : q.at('q_carry', 'ship') ? 'ship' : null; }
  clear(phase) {
    const g = this.g, c = this.c, home = phase.startsWith('a5') && !PHASES[phase].at;
    for (const id of NEW) c.npc(id).visible = false;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    this.horse.visible = false; this.gateArrow.visible = false; this.goatArrow.visible = false; this.sword.visible = false;
    this.busy = false; this.quarrelOn = false; this.hugOn = false; this.contestOn = false; this.kissOn = false; this.boatOn = false; this.reached = false;
    if (home || ['hunt', 'isle5', 'sea5'].includes(PHASES[phase] && PHASES[phase].at)) c.act.glowTarget = 0;
    if (['hunt', 'isle5', 'sea5'].includes(PHASES[phase] && PHASES[phase].at)) c.W.stages.searaven.set(false);
  }
  /** Ravenhold, where Act V has brought it. */
  dressed(name) {
    if (!name.startsWith('a5') || PHASES[name].at) return;
    const c = this.c, g = this.g, w = g.world, put = (id, s) => c.post(id, s), T = c.sea.town, S = c.W.stages, hg = this.at('q_hunger'), tk = this.at('q_taken'), wg = this.at('q_wing'), all = [...c.folk.filter((id) => !id.startsWith('kid') && id !== 'hauk' && id !== 'grjotgard'), 'signe', 'freydis'];
    c.npc('grjotgard').visible = false;
    const cell = S.cell; this.fix(c.npc('torvald'), cell.x, w.groundAt(cell.x, cell.z) + 0.08, cell.z - 0.5, 0, 'sit'); c.npc('torvald').h.hold('R', null); // held for judgment
    const folk = (spots, nm, loop) => T.forEach((n, i) => { if (!spots[i]) return; n.name = nm; put(n.id, [...spots[i], loop && i % 2 ? loop : null]); });
    const camp = [[-132, 157, 1.2], [-136, 155, -1.6], [-147, 161.6, 1.4], [-134, 173, 0.2], [-126, 162, -2], [-150, 152, 0.8], [30, 110, 2], [34, 124, -1.4]];
    if (PHASES[name].day) { // an ordinary day of this year
      put('v6', [-0.9, 244, 0.2, 'fish', 'rod']); put('bjorn', [0.5, 119.7, 0, 'sit']); put('v8', [3.4, 119.7, 0, 'sit']);
      put('brokk', [-65.3, 149.4, [-64.2, 149.4], 'hammer', 'hammer']); put('freydis', [1.6, 191.6, 2.6]); put('leif', [-1.8, 229.6, Math.PI]); put('gisli', [4.4, 224.6, 3.4]);
      put('astrid', [9, 128, 2.6]).h.hold('L', 'bow'); put('ingrid', [-32.6, 118.8, 2.8]); put('hrefna', [-37, 122, 1.2]);
      if (wg === 99) put('svanhild', [13, 131.4, -2.2]).h.hold('R', 'sword');
      folk(camp, 'A refugee', 'sit');
    }
    if (name === 'a5thing' || name === 'a5vote') { // the whole town at the stones
      c.ring([...all, 'leif', 'gisli', 'brokk', 'astrid', 'ingrid', 'hrefna'], -92, 92, 5.6, null, 0.3, 4.6); put('bjorn', [-88.4, 88.6, [-92, 92], 'sit']); put('hauk', [-98.6, 96.4, [-92, 92], 'sit']);
      folk([[-84, 100, 0], [-100, 88, 0], [-97, 101, 0], [-83, 86, 0]].map(([x, z]) => [x, z, [-92, 92]]), 'A refugee');
      if (name === 'a5vote') { put('creditor', [-86, 98.6, [-92, 92]]); put('debtor', [-96.6, 86.6, [-92, 92]]); put('debtgirl', [-98, 87.8, [-92, 92]]); }
    }
    if (name === 'a5fall') { const d = c.W.houses.barn.door; if (this.at('q_carry') >= 2 || this.at('q_carry') === 99) [0, 1, 2].forEach((i) => { T[i].name = 'A refugee family'; put(T[i].id, [d.x - c.W.s.x - 3 - i * 1.4, d.z - c.W.s.z + (i - 1) * 2.4, 1.6, 'sit']); }); }
    if (name === 'a5winter' || name === 'a5whale' || name === 'a5blot') {
      const d = c.W.houses.barn.door, bx = d.x - c.W.s.x, bz = d.z - c.W.s.z;
      [4, 5].forEach((i, k) => { const x = d.x - 2.6 - k * 1.5, z = d.z - 3.4 + k * 2.2; T[i].name = 'One of the sick'; this.fix(T[i], x, w.groundAt(x, z) + 0.2, z, 1.6, 'lie'); T[i].talk = null; });
      if (name === 'a5winter') {
        put('ingrid', [bx - 4.4, bz + 1, [bx - 2.6, bz - 3]]); put('hallvard', [-6, 124.4, 2.4]);
        if (hg === 4) { put('ingrid', [-1.6, 191, [1.6, 192.4], 'talk']); put('hrefna', [1.6, 192.4, [-1.6, 191], 'talk']); ['v1', 'v3', 'v5', 'v7'].forEach((id, i) => put(id, [-5 + i * 3.4, 196.6, [0, 192]])); }
        if (hg === 5) { const [hx, hz] = c.B(-86, 98); this.horse.visible = true; this.horse.position.set(hx, w.groundAt(hx, hz), hz); this.horse.rotation.y = 0.8; put('hrefna', [-89, 95, [-86, 98]]); }
        if (hg === 6) { put('frogman', [3.6, 189.4, [1.4, 190.6], 'talk']); put('leif', [1.4, 190.6, [3.6, 189.4]]); put('ingrid', [-0.6, 188.6, [1.4, 190.6]]); }
        if (hg === 11) { put('creditor', [-4.4, 186.4, [-6.6, 188.4], 'talk']); put('debtor', [-6.6, 188.4, [-4.4, 186.4]]); put('debtgirl', [-8, 189.6, [-4.4, 186.4]]); }
        if (this.burned && hg <= 4) { const [x, z] = c.B(113, 150); this.fires.push(g.fx.addFire(x, w.groundAt(x, z) + 0.5, z, 1.3)); }
      }
      if (name === 'a5blot') { const seats = []; for (const tz of [128, 133.5]) for (const side of [-1, 1]) for (let i = 0; i < 5; i++) seats.push([-6.6 + i * 1.5, tz + side * 0.95, side > 0 ? Math.PI : 0, 'sit']);
        [...all, 'leif', 'gisli', 'brokk', 'astrid', 'ingrid'].forEach((id, i) => { if (seats[i]) put(id, seats[i]); }); put('bjorn', [3.4, 130.8, [-4, 130.8], 'sit']); put('hrefna', [-12, 131, [-4, 131]]); put('hallvard', [5.6, 133, [-4, 131]]); }
      if (name === 'a5whale') { // the whole town, with axes, knives and sledges
        const at2 = (id, lx, lz, loop, hold) => { const [x, z] = S.whale.at(lx, lz); return this.put(id, x, z, [S.whale.x, S.whale.z], loop, hold); }; // along and out from her flank
        ['v0', 'v2', 'v3', 'v5', 'v7', 'v9', 'hauk', 'v1'].forEach((id, i) => at2(id, -7.4 + i * 2.1 + (i > 3 ? 0.6 : 0), 6.4 + (i % 2) * 0.5, 'chopping', 'woodaxe'));
        at2('leif', 1.6, 5.2, null, 'seax'); at2('ingrid', 10, 8.4); at2('astrid', -10, 8).h.hold('L', 'bow'); at2('freydis', 11.6, 9.8); at2('hallvard', -12, 9.4); at2('farmer', -13.6, 10.6);
        put('bjorn', [0.5, 119.7, 0, 'sit']); put('signe', [-2.5, 122.6, 0, 'cook']);
      }
    }
    if (name === 'a5spring') { put('astrid', [-6.4, 64.4, 0.4]).h.hold('L', 'bow'); put('leif', [-3.6, 66, 0.2]); put('hallvard', [-6, 124.4, 2.4]); put('eystein', [-3.4, 125.6, -2.6]); this.gateArrow.visible = tk === 1; }
    if (name === 'a5stink') {
      ['v3', 'v7'].forEach((id, i) => { const n = put(id, [-1.6 + i * 3.2, 209.4, 0, 'guard', 'spear']); n.h.hold('L', 'shield'); });
      put('leif', [-2.6, 216.6, Math.PI]); put('astrid', [3.4, 217.4, Math.PI]).h.hold('L', 'bow'); put('ingrid', [0.4, 204, 0]);
      folk([[-6, 216, 2.4], [5.6, 214.6, -2.6], [-9, 219, 2.2], [8, 218, -2.4]], 'One of the eleven'); [0, 1, 2].forEach((i) => { const n = c.sea.pen[i]; n.name = 'One of the eleven'; put(n.id, [-3 + i * 3, 220.6, Math.PI]); });
    }
    if (name === 'a5forge') { put('brokk', [-65.3, 149.4, [-64.2, 149.4]]).h.hold('R', null); put('bjorn', [-61.4, 152.4, [-64.2, 149.4], 'sit']); }
    if (name === 'a5summer' && this.at('q_ribbon') === 0) { put('astrid', [-9.6, 63.4, [-8, 62]]).h.hold('L', 'bow'); put('sigmess', [-8, 62, 0.4, 'kneel']); }
    if (name === 'a5cellnight') { put('signe', [-2.5, 122.6, 0.2]); put('bjorn', [0.5, 119.7, 0, 'sit']); }
    if (name === 'a5feast' || name === 'a5mid') { // one night of happiness
      const seats = []; for (const tz of [128, 133.5]) for (const side of [-1, 1]) for (let i = 0; i < 5; i++) seats.push([-6.6 + i * 1.5, tz + side * 0.95, side > 0 ? Math.PI : 0, 'sit']);
      [...all, 'gisli', 'hallvard', 'hrefna'].forEach((id, i) => { if (seats[i]) put(id, seats[i]); });
      put('bjorn', [3.4, 130.8, [-4, 130.8], 'sit']); put('hauk', [-13, 126, [-4, 130], 'sit']); put('brokk', [6, 127.4, [2, 129], 'talk']); put('freydis', [4.6, 135.6, [0, 135]]);
      const L = S.butts.line, lx = L[0] - c.W.s.x, lz = L[1] - c.W.s.z; put('astrid', [lx, lz - 1.3, [34, 141]]).h.hold('L', 'bow'); put('svanhild', [lx, lz + 1.1, [34, 146]]).h.hold('L', 'bow');
      const kiss = this.at('q_feast') >= 2, hw = S.hwall; if (kiss) { this.put('leif', hw.x - 0.6, hw.z - 0.9, [hw.x + 0.5, hw.z - 0.9]); this.put('ingrid', hw.x + 0.5, hw.z - 0.9, [hw.x - 0.6, hw.z - 0.9]); } else { put('leif', [8.6, 136.4, [0, 134]]); put('ingrid', [9.6, 134.6, [0, 134]]); }
      c.npc('kid0').visible = c.npc('kid1').visible = true; KIDS5.forEach(([id, dx, dz]) => put(id, [dx, dz, [-10.4, 148.4], 'kneel']));
      folk(camp.slice(0, 4).map(([x, z, y], i) => [16 + i * 2.2, 150 + (i % 2) * 2, y]), 'A refugee');
      const [fx, fz] = c.B(12, 130.5); this.fires.push(g.fx.addFire(fx, w.groundAt(fx, fz) + 0.3, fz, 1.6));
      if (name === 'a5mid') { const b = S.mboat; this.fix(c.npc('myrmess'), b.x, 0.35, b.z + 0.4, 0.2, 'lie'); }
      if (this.at('q_feast') >= 2) { this.goatArrow.visible = true; this.sword.visible = true; const t = S.butts.targets[0]; this.sword.position.set(t.x - 0.5, t.y, t.z); }
    }
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests, ph = c.phase;
    if (!ph || !ph.startsWith('a5') || PHASES[ph].at) return false;
    if (id === 'ingrid' && q.at('q_hunger', 'ingrid')) { c.say('a5_command', n, () => q.notify('talk', 'ingrid')); return true; }
    if ((id === 'leif' || id === 'frogman') && q.at('q_hunger', 'frog')) { c.say('a5_frog', c.npc('leif'), () => q.notify('talk', 'leif')); return true; }
    if ((id === 'hallvard' || id === 'farmer') && q.at('q_hunger', 'law')) { c.say('a5_law', c.npc('hallvard'), () => q.notify('talk', 'hallvard')); return true; }
    if ((id === 'creditor' || id === 'debtor' || id === 'debtgirl') && q.at('q_hunger', 'debt')) { c.say('a5_debt', c.npc('creditor'), () => q.notify('talk', 'creditor')); return true; }
    if (id === 'astrid' && q.at('q_taken', 'astrid')) { c.say('a5_mad', n, () => c.cmp.toCamp()); return true; }
    if (id === 'brokk' && q.at('q_ring', 'brokk')) { c.say('a5_collar', n, () => q.notify('talk', 'brokk')); return true; }
    if ((id === 'astrid' || id === 'sigmess') && q.at('q_ribbon', 'astrid')) { c.say('a5_messenger', c.npc('astrid'), () => q.notify('talk', 'astrid')); return true; }
    if (id === 'brokk' && q.at('q_feast', 'brokk')) { c.say('a5_serpent', n, () => { n.say('A sea serpent. I wrestled it for three days.', 4); q.notify('talk', 'brokk'); }); return true; } // (game: the line is built from the story's sentence)
    if (id === 'brokk' && (ph === 'a5feast' || ph === 'a5mid')) { n.say('A sea serpent. Three days.', 3); return true; }
    const quiet = { hauk: '...', sigmess: '...', debtor: '...', debtgirl: '...', myrmess: '...', creditor: 'I have every right.', farmer: 'It beached on my shore.', frogman: 'Guaranteed by the gods of three countries.', hallvard: 'In a famine winter, the hungry come first.', svanhild: 'I would rather know whether you keep your promises.', hrefna: 'The gods prefer their pots boiled clean. They told me so.' }; // (game: built from the story's sentences)
    if (quiet[id]) { n.say(quiet[id], 3.2); return true; }
    if (/^kp|^pen/.test(id)) { n.say('...', 2); return true; }
    if (ph === 'a5winter' || ph === 'a5blot' || ph === 'a5thing' || ph === 'a5vote' || ph === 'a5cellnight' || ph === 'a5spring') { n.say('...', 2); return true; }
    return false;
  }
  cues = {
    haukUp() { const h = this.c.npc('hauk'); h.setLoop(null); },
    haukDown() { this.c.npc('hauk').setLoop('sit'); },
    boiled() { const c = this.c; c.npc('hrefna').h.play('cheer', 1.2); for (const id of c.folk) { const v = c.npc(id); if (v.visible && !v.kid) v.h.play('cheer', 1.0); } },
    frog() { const c = this.c, g = this.g, m = c.npc('frogman'), go = c.goat; m.setLoop(null); m.goPath([c.B(0, 200), c.B(0, 214)], { run: true, onArrive: (o) => { o.visible = false; } }); go.m.visible = true; const [x, z] = c.B(3.2, 190.6); go.pos.set(x, g.world.groundAt(x, z), z); go.roof = false; g.audio.play('bird', { vol: 0.4 }); },
    pay() { const g = this.g, n = Math.min(40, g.inventory.count('silver')); if (n > 0) g.inventory.remove('silver', n); g.ui.toast('He pays the debt himself.'); },
    vote() { const c = this.c; c.folk.forEach((id, i) => { const v = c.npc(id); if (v.visible && !v.kid && i % 2) v.h.play('cheer', 1.0); }); this.g.audio.play('questDone'); },
    bend() { this.c.npc('torvald').pose = 'mourn'; },
  };

  // ---- the stones: the assembly, the blot, the first law ------------------------------------------
  stones() {
    const g = this.g, c = this.c, q = g.quests, p = g.player;
    this.busy = true;
    if (q.at('q_carry', 'assembly')) return c.say('a5_assembly', c.npc('hauk'), () => { this.busy = false; q.notify('event', 'a5assembly'); });
    if (q.at('q_hunger', 'blot')) return c.fade(() => { c.setPhase('a5blot', true); p.teleport(...c.B(-2, 138), Math.PI); }, 1.4, 1.4).then(() => c.say('a5_blot', c.npc('hrefna'), () => q.notify('event', 'a5blot')));
    c.fade(() => { c.setPhase('a5vote', true); p.teleport(...c.B(-90.6, 95.4), 2.4); }, 1.2, 1.2).then(() => c.say('a5_first', null, () => q.notify('event', 'a5first')));
  }
  // ---- the rebuilding: every choice costs something -------------------------------------------------
  work() {
    const g = this.g, c = this.c, k = this.job(), [dx, dz, label, hold] = BUILD[k], [x, z] = c.B(dx, dz);
    new Knack(g, { label, verb: 'strike', cfg: A5.knack.build, hold, sound: 'chop', at: [x, z, g.player.yaw], seed: dx | 0,
      onDone: () => {
        this.busy = true; c.sub(COSTS[k], 8);
        if (k !== 'ship') return g.after(0.1, () => { this.busy = false; g.quests.notify('event', 'a5' + k); });
        g.after(0.1, () => c.W.stages.slip.set(true)); g.after(8.5, () => c.sub(COSTS.end, 7.5)); g.after(16.5, () => { this.busy = false; g.quests.notify('event', 'a5ship'); });
      } }).start();
  }
  // ---- the winter ---------------------------------------------------------------------------------
  latrine() {
    const g = this.g, c = this.c, [x, z] = c.B(17, 148.4);
    new Knack(g, { label: 'Move the latrine away from the well, again', verb: 'dig', cfg: A5.knack.dig, hold: 'hoe', sound: 'thud', bad: 'The ground is frozen', at: [x, z, Math.PI], seed: 4, onDone: () => g.quests.notify('event', 'a5latrine') }).start();
  }
  burn() {
    const g = this.g, c = this.c, [x, z] = c.B(113, 150);
    this.busy = true; this.burned = true; g.player.h.play('pickup', 0.9); g.audio.play('ignite');
    this.fires.push(g.fx.addFire(x, g.world.groundAt(x, z) + 0.5, z, 1.3));
    c.sub('Soiled bedding must be burned, not washed in the stream that people drink from.', 6); g.after(3, () => { this.busy = false; g.quests.notify('event', 'a5bedding'); });
  }
  cut() {
    const g = this.g, c = this.c, i = this.count('q_hunger'), S = c.W.stages, [x, z] = S.whale.flank[i], l = c.npc('leif');
    new Knack(g, { label: 'Butcher the whale', verb: 'cut', cfg: A5.knack.cut, anim: 'chop', hold: 'woodaxe', sound: 'chop', bad: 'His boots slide on the blubber', at: [x, z, Math.atan2(S.whale.x - x, S.whale.z - z)], seed: i + 5,
      onGood: () => g.fx.burst('blood', x + (S.whale.x - x) * 0.4, 1.4, z + (S.whale.z - z) * 0.4, 8),
      onDone: () => {
        if (i === 0) { S.whale.set(false); S.whaleCut.set(true); c.sub('Butchering a whale is the most disgusting work any of them have ever done. They climb inside it. They are soaked in blood and oil to the shoulder. The smell is so bad that birds will not land nearby.', 10); }
        if (i === 1) { l.h.play('fall', 1.0); g.audio.play('splash'); c.sub('Leif slips on the blubber and slides into the open belly, and comes out covered head to foot in something no one can identify.', 9); }
        if (i === 2) c.sub('It also saves them. There is meat for two months and oil for every lamp.', 7);
        g.quests.notify('event', 'a5cut');
      } }).start();
  }
  // ---- the raven taken: the arrow, and the sea -----------------------------------------------------------
  arrow() {
    const g = this.g;
    this.busy = true; g.player.h.play('pickup', 0.9); this.gateArrow.visible = false; g.player.frozen = true;
    g.ui.card('An arrow in the gate', ARROW, 15).then(() => { g.player.frozen = false; this.busy = false; g.quests.notify('event', 'a5arrow'); });
  }
  wash() {
    const g = this.g, c = this.c, p = g.player, i = c.npc('ingrid'), l = c.npc('leif');
    this.busy = true; p.frozen = true; p.h.play('dodge', 0.7); g.audio.play('splash'); g.fx.burst('splash', p.pos.x, 0.1, p.pos.z + 1.5, 16);
    for (const id of ['leif', 'astrid']) { const n = c.npc(id); n.goTo(...c.B(id === 'leif' ? 4 : 10, 224), { run: true, onArrive: (o) => { g.audio.play('splash', { vol: 0.6 }); g.fx.burst('splash', o.pos.x, 0.1, o.pos.z + 1, 10); } }); }
    g.after(2.6, () => { for (const id of ['v3', 'v7']) c.npc(id).goTo(c.npc(id).pos.x + (id === 'v3' ? -3 : 3), c.npc(id).pos.z, {}); i.goTo(...c.B(1, 213), {}); l.goTo(...c.B(-1, 216.4), {}); });
    g.after(6, () => { i.h.play('cheer', 1.6); c.sub('Ingrid looks at Leif and laughs until she cries. It is the first time anyone in Ravenhold has laughed in weeks.', 8.5); });
    g.after(15, () => { p.frozen = false; this.busy = false; g.quests.notify('event', 'a5wash'); });
  }
  // ---- the cell, and that night ---------------------------------------------------------------------------
  cell() {
    const g = this.g, c = this.c, p = g.player, f = c.W.stages.cell.front;
    this.busy = true; p.teleport(f[0], f[1] - 0.4, Math.PI);
    c.say('a5_cell', null, () => { this.busy = false; g.quests.notify('event', 'a5cell'); });
  }
  hug() {
    const g = this.g, c = this.c, p = g.player, s = c.npc('signe');
    this.hugOn = true; p.frozen = true; s.teleport(p.pos.x + Math.sin(p.yaw) * 0.55, p.pos.z + Math.cos(p.yaw) * 0.55, p.yaw + Math.PI);
    c.sub('That night he goes to Bjorn and Signe. He does not say anything. Signe holds him the way she did when he was ten and did not speak for forty days.', 11);
    g.after(11.5, () => { p.frozen = false; g.quests.notify('event', 'a5signe'); });
  }
  // ---- the feast ----------------------------------------------------------------------------------------------
  playContest() {
    const g = this.g, c = this.c, p = g.player, S = c.W.stages.butts, a = c.npc('astrid'), s = c.npc('svanhild'), go = c.goat, [t0, t1] = S.targets, L = S.line;
    this.contestOn = true; p.frozen = true; g.ravens.exitEye();
    { const [x, z] = [t1.x - 3, t1.z + 3.4]; go.m.visible = true; go.roof = false; go.to = null; go.pos.set(x, g.world.groundAt(x, z), z); go.m.rotation.y = 0.4; }
    const eye = (n) => () => [n.pos.x, n.pos.y + 1.5, n.pos.z];
    const cam = { both: { from: [L[0] - 5, t0.y + 1.4, L[1] + 5.5], to: [L[0] - 3.6, t0.y + 1.2, L[1] + 4.2], look: [L[0] + 6, t0.y, L[1]], fov: 44 }, goat: { from: [go.pos.x - 2.6, go.pos.y + 1, go.pos.z + 2.4], look: () => [go.pos.x, go.pos.y + 0.6, go.pos.z], fov: 34 },
      astrid: { from: [L[0] + 2.4, t0.y + 0.4, L[1] - 0.4], look: eye(a), fov: 30 }, svanhild: { from: [L[0] + 2.4, t0.y + 0.4, L[1] + 0.4], look: eye(s), fov: 30 }, target: { from: [t0.x - 4.4, t0.y + 0.3, t0.z + 2.2], look: [t0.x, t0.y, t0.z], fov: 32 } };
    const act = { draw: () => { s.h.play('shoot', 0.9); g.audio.play('bow'); }, over: () => { s.h.play('shoot', 0.9); g.audio.play('bow'); g.after(0.5, () => g.audio.play('whoosh')); },
      goat: () => { this.goatArrow.visible = true; g.audio.play('arrowHit', { vol: 0.5 }); go.to = c.B(22, 150); go.runT = 0; go.loose = true; }, laugh: () => a.h.play('cheer', 1.2),
      sword: () => { s.h.hold('L', null); s.h.hold('R', 'sword'); }, throw: () => { s.h.play('atk3', 0.8, { hitAt: 0.45, onHit: () => { s.h.hold('R', null); this.sword.visible = true; this.sword.position.set(t0.x - 0.5, t0.y, t0.z); g.audio.play('thud'); g.audio.play('steel', { vol: 0.5 }); } }); },
      cheer: () => { for (const id of c.folk) { const v = c.npc(id); if (v.visible && !v.kid) v.h.play('cheer', 1.2); } a.h.play('cheer', 1.0); g.audio.play('questDone'); } };
    const shots = CONTEST_LINES.map(([who, sp, text, k]) => { const v = cam[who], dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.2, v.from[1], v.from[2] + 0.2], look: v.look, fov: v.fov, sub: [sp, text, dur - 0.3], onStart: k ? act[k] : null }; });
    g.cine.play(shots, { onEnd: () => { p.frozen = false; g.quests.notify('event', 'a5contest'); } });
  }
  playKiss() {
    const g = this.g, c = this.c, p = g.player, hw = c.W.stages.hwall, l = c.npc('leif'), i = c.npc('ingrid'), [yx, yz] = c.B(-2, 132), [gx, gz] = c.B(0, 209);
    this.kissOn = true; p.frozen = true; g.ravens.exitEye(); p.teleport(gx, gz + 0.6, -0.3);
    this.put('leif', hw.x - 0.6, hw.z - 0.9, [hw.x + 0.5, hw.z - 0.9]); this.put('ingrid', hw.x + 0.5, hw.z - 0.9, [hw.x - 0.6, hw.z - 0.9]);
    const cam = { wide: { from: [hw.x - 7, hw.y + 2.6, hw.z - 8], to: [hw.x - 5.6, hw.y + 2.2, hw.z - 6.6], look: [hw.x, hw.y + 0.4, hw.z - 0.9], fov: 36 }, two: { from: [hw.x - 0.4, hw.y + 0.7, hw.z - 4.6], to: [hw.x - 0.1, hw.y + 0.7, hw.z - 4.0], look: [hw.x, hw.y + 0.7, hw.z - 0.9], fov: 30 },
      eirik: { from: [gx - 1.6, hw.y + 1.6, gz + 4.2], look: () => [p.pos.x, p.pos.y + 1.5, p.pos.z], fov: 30 }, town: { from: [yx + 14, hw.y + 9, yz + 26], to: [yx + 10, hw.y + 8, yz + 22], look: [yx, hw.y + 1, yz], fov: 46 } };
    const shots = KISS_LINES.map(([who, sp, text], k) => { const v = cam[who], dur = 2.8 + text.length * 0.058; return { dur, from: v.from, to: v.to || [v.from[0] + 0.15, v.from[1], v.from[2] + 0.2], look: v.look, fov: v.fov, sub: [sp, text, dur - 0.3],
      onStart: k === 4 ? () => { l.teleport(hw.x - 0.22, hw.z - 0.9, Math.PI / 2); i.teleport(hw.x + 0.22, hw.z - 0.9, -Math.PI / 2); } : null }; });
    g.cine.play(shots, { onEnd: () => { p.frozen = false; g.quests.notify('event', 'a5kiss'); } });
  }

  // =====================================================================================
  steps = {
    'q_carry.assembly'(r) {
      const g = this.g, c = this.c;
      c.setPhase('a5thing', r);
      if (this.st.flags.a5begun) return; // the act opens once, however it is entered
      this.st.flags.a5begun = true;
      g.player.frozen = true; g.player.teleport(...c.B(-70, 112), -0.9);
      g.ui.card('Act Five', 'The Broken Raven', 4.2).then(() => { g.player.frozen = false; });
    },
    'q_carry.tower'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('a5fall', r); c.fade(() => { c.setPhase('a5fall', true); g.player.teleport(...c.B(-6, 198), 2.6); }, 1.2, 1.2); },
    'q_carry.harbor'(r) { this.c.setPhase('a5fall', r); if (!r) this.dressed('a5fall'); },
    'q_carry.ship'(r) { this.c.setPhase('a5fall', r); },
    'q_hunger.grain'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a5winter', r);
      c.fade(() => { c.setPhase('a5winter', true); g.player.teleport(...c.B(52, 204), 1.4); return g.ui.card('The Winter of Hunger', 'The winter is the worst in living memory.', 5); }, 1.4, 1.4);
    },
    'q_hunger.ingrid'(r) { this.c.setPhase('a5winter', r); },
    'q_hunger.latrine'(r) { this.c.setPhase('a5winter', r); },
    'q_hunger.bedding'(r) { this.c.setPhase('a5winter', r); this.burned = false; },
    'q_hunger.quarrel'(r) { const c = this.c; c.setPhase('a5winter', r); this.dressed('a5winter'); if (!r) c.sub('Many people refuse.', 4); },
    'q_hunger.blot'(r) { const c = this.c; c.setPhase('a5winter', r); this.dressed('a5winter'); },
    'q_hunger.frog'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('a5winter', r); c.fade(() => { c.setPhase('a5winter', true); g.player.teleport(...c.B(-3, 182), 0.3); }, 1.2, 1.2); },
    'q_hunger.eye'(r) { const c = this.c; c.setPhase('a5winter', r); c.hint('eyeUp'); if (!r) { c.sub('The hunger gets worse. Then, in the coldest week of the year, {w} comes back from the coast screaming one word over and over.', 8); this.g.after(8.2, () => c.sub('Big! Big! Big!', 4, '{w}')); } },
    'q_hunger.whale'(r) { const c = this.c; c.setPhase('a5winter', r); c.hint('Fly west along the shore, and press {interact} when she sees it.'); },
    'q_hunger.cut'(r) {
      const g = this.g, c = this.c, at = () => { const W = c.W.stages.whale, [x, z] = W.at(1.5, 10); g.player.teleport(x, z, Math.atan2(W.x - x, W.z - z)); };
      if (r) { c.setPhase('a5whale', r); return at(); }
      c.hint(null); g.ravens.exitEye();
      c.fade(() => { c.setPhase('a5whale', true); at(); }, 1.2, 1.2).then(() => c.sub('The whole town goes out with axes, knives and sledges.', 5));
    },
    'q_hunger.law'(r) { const c = this.c; c.setPhase('a5whale', r); },
    'q_hunger.debt'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('a5winter', r); c.fade(() => { c.setPhase('a5winter', true); g.player.teleport(...c.B(-2, 180), 0.2); }, 1.2, 1.2); },
    'q_hunger.first'(r) { this.c.setPhase('a5winter', r); },
    'q_taken.reach'(r) {
      const g = this.g, c = this.c;
      if (r) { c.setPhase('a5spring', r); return c.hint('reachHer'); }
      c.fade(() => { c.setPhase('a5spring', true); g.player.teleport(...c.B(-1, 142), Math.PI); return g.ui.card('The Raven Taken', g.fmt('In early spring, {w} does not come home.'), 5); }, 1.4, 1.4)
        .then(() => { c.sub('{b} circles above Ravenhold all day, screaming.', 6); c.hint('reachHer'); });
    },
    'q_taken.arrow'(r) { const g = this.g, c = this.c; c.hint(null); if (r) return c.setPhase('a5spring', r); c.fade(() => { c.setPhase('a5spring', true); g.player.teleport(...c.B(-8, 72), Math.PI); return g.ui.card('', 'Two days later', 3); }, 1.2, 1.2); },
    'q_taken.astrid'(r) { this.c.setPhase('a5spring', r); },
    'q_taken.sea'(r) { const g = this.g, c = this.c; c.setPhase('a5stink', r); g.player.teleport(...c.B(1, 217), Math.PI); if (!r) c.sub('When they get back to Ravenhold, smelling so horrible that the gate guards will not let them in until they have jumped in the sea...', 8); },
    'q_ring.brokk'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('a5forge', r); c.fade(() => { c.setPhase('a5forge', true); g.player.teleport(...c.B(-60, 146), -1.2); if (g.player.equipped !== 'none') g.player.equip('none'); }, 1.2, 1.2); },
    'q_ring.sail'(r) { this.c.setPhase('a5forge', r); },
    'q_wing.sail'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a5summer', r);
      g.player.frozen = true;
      g.ui.fade(true, 0.8).then(() => g.ui.card('', 'Old Thrand dies that summer, peacefully, in his sleep. The puffin stays on his roof for a week, then flies away.', 7))
        .then(() => g.ui.card('The Wing Isle', 'To beat Håkon, the alliance needs the three neutral islands. The first is Vængr, the Wing Isle.', 6))
        .then(() => { c.setPhase('a5summer', true); g.player.teleport(...c.B(-1, 216), 0); return g.ui.fade(false, 1.2); }).then(() => { g.player.frozen = false; });
    },
    'q_ribbon.astrid'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a5summer', r);
      c.fade(() => { c.setPhase('a5summer', true); g.player.teleport(...c.B(-8, 74), Math.PI); return g.ui.card('The Letter That Was Never Written', 'In early summer', 4.5); }, 1.2, 1.2);
    },
    'q_ribbon.cell'(r) { this.c.setPhase('a5summer', r); },
    'q_ribbon.signe'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('a5cellnight', r); c.fade(() => { c.setPhase('a5cellnight', true); g.player.teleport(...c.B(-2, 132), Math.PI); }, 1.6, 1.6); },
    'q_feast.brokk'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a5feast', r);
      c.fade(() => { c.setPhase('a5feast', true); g.player.teleport(...c.B(-1, 140), Math.PI); return g.ui.card('The Feast of Survivors', 'By midsummer, Ravenhold has rebuilt. The harbor is full again. The barley is green. Vængr has joined the alliance. The town decides it has earned one night of happiness, and holds a feast.', 9); }, 1.4, 1.4)
        .then(() => c.sub('It is a good night. There is roast pig and fresh bread, the first in a year. There is music from bone flutes and a drum. Children play hnefatafl, the Viking board game of king and attackers, on boards scratched in the dirt.', 11));
    },
    'q_feast.contest'(r) { this.c.setPhase('a5feast', r); },
    'q_feast.wall'(r) { this.c.setPhase('a5feast', r); if (!r) this.dressed('a5feast'); },
    'q_feast.boat'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a5mid', r);
      c.fade(() => { c.setPhase('a5mid', true); g.player.teleport(...c.B(0, 210), 0); }, 1.4, 1.4).then(() => c.sub('Then, near midnight, a small boat rows into the harbor.', 6));
    },
  };

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, ph = c.phase, near = (dx, dz, d) => Math.hypot(p.pos.x - c.B(dx, dz)[0], p.pos.z - c.B(dx, dz)[1]) < d;
    if (!ph || !ph.startsWith('a5') || PHASES[ph].at) return;
    this.crew([c.npc('torvald'), c.npc('myrmess'), ...c.sea.town], dt);
    if (this.goatArrow.visible) { const go = c.goat; this.goatArrow.position.set(go.pos.x - Math.sin(go.m.rotation.y) * 0.34, go.pos.y + 0.62, go.pos.z - Math.cos(go.m.rotation.y) * 0.34); this.goatArrow.rotation.y = go.m.rotation.y; }
    if (g.mode !== 'play') return;
    if (q.at('q_hunger', 'quarrel') && !this.quarrelOn && near(0, 192, 9)) { this.quarrelOn = true; c.say('a5_quarrel', c.npc('hrefna'), () => q.notify('event', 'a5quarrel')); }
    if (q.at('q_ribbon', 'signe') && ph === 'a5cellnight' && !this.hugOn && c.npc('signe').dist(p) < 3.2) this.hug();
    if (q.at('q_feast', 'contest') && !this.contestOn && near(17, 143.5, 8)) this.playContest();
    if (q.at('q_feast', 'wall') && !this.kissOn && near(0, 209.5, 5)) this.playKiss();
    if (q.at('q_feast', 'boat') && ph === 'a5mid' && !this.boatOn && near(-1, 244, 6.5)) {
      this.boatOn = true; p.frozen = true;
      c.tell(['In it is a wounded messenger from Myrholm, the marsh island.', "Myrholm's queen has been accused of murder, her council is tearing itself apart, and another of Håkon's champions is on the island."], 7.5).then(() => q.notify('event', 'a5boat'));
    }
  }
}
const KIDS5 = [['kid0', -11.2, 148.2], ['kid1', -9.4, 149.4], ['kid2', -8, 151.2], ['kid3', -12.4, 146.4]];
