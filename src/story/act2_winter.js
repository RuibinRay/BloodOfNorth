// Act II, Chapters 6 and 7: "The Peddlers" (Grim and Grimolf, the net across the path, Skull-Ringer, outlawry) and
// "Walls Before Winter" (the first speech, and the hardest summer anyone can remember). See act2.js.
import * as THREE from 'three';
import { M, box, cyl, cone, tint, at } from '../world/geo.js';
import { makeShip } from '../world/props.js';
import { A2, CAST2 } from '../data/act2.js';
import { horseModel } from '../entities/wildlife.js';
import { Knack, Bout } from '../systems/activities2.js';
import { dampAngle } from '../core/util.js';

const TREES = [[-66, -58], [-55, -66], [-62, -73]], DIGS = [[20, 52], [46, 55], [73, 63], [93, 81]], POSTS = [[-5, 58.6], [40, 60.6], [80, 72.6], [105, 126]];
const CAMP = [-150, 150];

export class A2Winter {
  constructor(game, core) { this.g = game; this.c = core; this.said = {}; }
  get st() { return this.g.state; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world;
    for (const id of ['grim', 'grimolf']) { const n = g.addNPC(id, CAST2[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, ...(typeof pos === 'function' ? { pos, x: 0, z: 0 } : { x: pos[0], z: pos[1] }), r: 2.6, priority: 2, label, enabled, use, ...o });
    const door = [c.W.hallDoor.x, c.W.hallDoor.z];
    I('a2dusk', door, 'Wait for dark', () => q.at('q_peddlers', 'dusk'), () => c.fade(() => { c.setPhase('pednight', true); g.player.teleport(door[0], door[1] + 1.2, 0); }).then(() => q.notify('event', 'a2dusk')), { priority: 3 });
    I('a2net', c.B(-26, 203), 'Take a fishing net', () => q.at('q_peddlers', 'net'), () => { g.player.h.play('pickup', 0.8); g.inventory.add('net', 1); q.notify('event', 'a2net'); });
    I('a2string', c.B(0, 160), 'String the net across the street', () => q.at('q_peddlers', 'string'), () => { g.player.h.play('pickup', 0.8); g.inventory.remove('net', 1, true); g.audio.play('page'); q.notify('event', 'a2strung'); }, { r: 3.2 });
    I('a2midnight', door, 'Wait in the house for midnight', () => q.at('q_peddlers', 'wait') && !this.night, () => this.midnight(), { priority: 3 });
    I('a2law', c.B(-92, 92), 'Call the village to the Thing', () => q.at('q_walls', 'call'), () => c.fade(() => c.setPhase('stones', true)).then(() => q.notify('event', 'a2called')), { r: 3.4 });
    I('a2speak', c.B(-92, 92), 'Speak', () => q.at('q_walls', 'speak'), () => c.say('a2_speech', c.npc('bjorn'), () => q.notify('event', 'a2spoke')), { r: 3.4 });
    const spot = (list) => () => { const i = Math.min(list.length - 1, this.count()), [x, z] = c.B(list[i][0], list[i][1]); return { x, z }; };
    I('a2fell', spot(TREES), 'Fell the tree', () => q.at('q_walls', 'timber'), () => this.work('fell'), { r: 3 });
    I('a2dig', spot(DIGS), 'Dig the ditch', () => q.at('q_walls', 'ditch'), () => this.work('dig'), { r: 3 });
    I('a2trench', c.B(58, 30), 'Dig the new latrine trench', () => q.at('q_walls', 'latrine'), () => this.work('latrine'), { r: 3.2 });
    I('a2post', spot(POSTS), 'Set the posts', () => q.at('q_walls', 'wall'), () => this.work('post'), { r: 3 });
    I('a2tower', c.B(-12, 19), 'Raise the watchtower', () => q.at('q_walls', 'tower'), () => this.work('tower'), { r: 3.4 });
    const mark = (id, dx, dz, label, text) => g.ravens.addMarkable({ id, pos: () => { const [x, z] = c.B(dx, dz); return { x, z }; }, r: 30, label, enabled: () => q.at('q_peddlers', 'watch'), onMark: () => { c.sub(text, 6.5); q.notify('event', 'a2camp'); } });
    mark('a2knives', CAMP[0] + 0.4, CAMP[1] + 1.6, 'two men by a fire, working at something', 'They are sharpening long knives.');
    mark('a2wine', CAMP[0] - 2.2, CAMP[1] - 0.6, 'a skin going from hand to hand', 'They pass a skin of wine, laughing about how much silver a head weighs.');
    mark('a2sack', CAMP[0] + 5.2, CAMP[1] + 1, 'something under the tarpaulin', 'Under their tarpaulin is a coil of rope and a sack big enough for a man.');
    // three trees marked for felling, a horse to drag them, the leaky boat
    this.trunks = TREES.map(([dx, dz], i) => { const [x, z] = c.B(dx, dz), grp = new THREE.Group(), m = new THREE.Mesh(at(cyl(0.16, 0.3, 9, 7), 0, 4.5, 0), M.bark), top = new THREE.Mesh(tint(at(cone(1.9, 5, 7), 0, 8.6, 0), 0x24402a, 0.3, i + 2), M.vcPlain); m.castShadow = top.castShadow = true; grp.add(m, top); grp.position.set(x, w.groundAt(x, z) - 0.1, z); g.scene.add(grp); w.addCircle(x, z, 0.4, 4); return grp; });
    this.horse = { m: horseModel(), pos: null, yaw: 0, hop: 0, on: false }; this.horse.pos = this.horse.m.position; this.horse.m.visible = false; g.scene.add(this.horse.m);
    this.log = new THREE.Mesh(at(cyl(0.22, 0.28, 7, 7), 0, 0.25, -3.6, Math.PI / 2, 0, 0), M.bark); this.log.castShadow = true; this.horse.m.add(this.log);
    this.boat = makeShip({ L: 5.4, B: 1.7, D: 0.55, rise: 0.5, seed: 17 }); this.boat.visible = false; g.scene.add(this.boat);
    this.campFire = g.fx.addFire(...((p) => [p[0], w.groundAt(p[0], p[1]) + 0.15, p[1]])(c.B(...CAMP)), 0.5, { on: false });
    c.reachOk = { ...(c.reachOk || {}), a2tangled: () => !!this.tangled, a2hauled: () => Math.hypot(this.horse.pos.x - c.B(-9, 52)[0], this.horse.pos.z - c.B(-9, 52)[1]) < 12 };
  }
  count() { return this.st.quests.q_walls ? this.st.quests.q_walls.count : 0; }
  clear(phase) {
    for (const id of ['grim', 'grimolf']) this.c.npc(id).visible = false;
    this.campFire.on = phase === 'pednight' && this.g.quests.isActive('q_peddlers'); this.boat.visible = false; this.horse.on = false; this.horse.m.visible = false; this.night = false;
  }
  dyn(name) {
    const q = this.g.quests, c = this.c;
    if (name !== 'work') return undefined;
    const list = q.at('q_walls', 'timber') ? TREES : q.at('q_walls', 'ditch') ? DIGS : q.at('q_walls', 'wall') ? POSTS : null;
    if (!list) return null;
    const [x, z] = c.B(...list[Math.min(list.length - 1, this.count())]); return { x, z, y: this.g.world.groundAt(x, z) + 2 };
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests, once = (key, tree, nid = id) => { c.say(tree, n, () => { if (!this.said[key]) { this.said[key] = true; q.notify('talk', nid); } }); return true; };
    if ((id === 'grim' || id === 'grimolf') && q.at('q_peddlers', 'meet')) { c.say('a2_grim', c.npc('grim'), () => q.notify('talk', 'grim')); return true; }
    if (id === 'grim' || id === 'grimolf') { n.say(this.tangled ? 'Mmf.' : 'Combs! Needles! Glass beads!', 3); return true; }
    if (id === 'lawman' && q.at('q_peddlers', 'thing')) { c.say('a2_outlaw', n, () => q.notify('talk', 'lawman')); return true; }
    if (id === 'bjorn' && q.at('q_peddlers', 'bjorn')) { c.say('a2_price', n, () => q.notify('talk', 'bjorn')); return true; }
    if (q.at('q_walls', 'listen')) { if (id === 'hauk') return once('leave', 'a2_leave'); if (id === 'grjotgard') return once('silver', 'a2_silver'); if (id === 'v4' || id === 'v2') return once('hand', 'a2_hand', 'v4'); }
    if (id === 'bjorn' && q.at('q_walls', 'drill')) { this.drill(); return true; }
    if (q.isActive('q_walls') && id === 'freydis') { c.say('a2_tally', n); return true; }
    if (q.isActive('q_walls') && id === 'signe') { c.say('a2_salt', n); return true; }
    return false;
  }

  // ---- midnight ------------------------------------------------------------------------------
  midnight() {
    const g = this.g, c = this.c, p = g.player, hd = c.W.hallDoor, grim = c.npc('grim'), go = c.npc('grimolf'), f = c.npc('freydis'), b = c.npc('bjorn');
    this.night = true; p.frozen = true;
    g.ui.fade(true, 1.0).then(() => g.ui.card('', 'They come for him at midnight. Eirik is waiting. So is Freydis, who refused to stay in bed.', 5.5)).then(() => {
      p.teleport(hd.x + 3.2, hd.z + 2.6, -2.2); f.visible = false; b.visible = false;
      grim.visible = true; grim.teleport(hd.x - 5, hd.z + 7, 2.5); grim.crouch = true; grim.h.hold('R', 'seax'); grim.setLoop(null);
      go.visible = true; go.teleport(hd.x + 1, hd.z + 11, 3.1); go.h.hold('R', 'seax'); go.setLoop('guard');
      return g.ui.fade(false, 1.0);
    }).then(() => {
      grim.goTo(hd.x - 0.3, hd.z + 0.5, { speed: 1.3, onArrive: (o) => {
        f.visible = true; f.teleport(hd.x - 0.2, hd.z - 0.7, 0.3); f.h.play('atk3', 0.5); g.audio.play('parry'); g.audio.play('steel'); g.audio.play('thud'); g.player.cam.shake = 0.2;
        o.crouch = false; o.die(true);
        c.sub("The first brother creeps into the house, and Freydis hits him in the face with Signe's iron frying pan. It makes a sound like a hammer on an anvil.", 7);
        g.after(1.6, () => { // the second brother runs
          p.frozen = false; c.sub('The second brother runs.', 3); go.setLoop(null);
          go.goPath([c.B(1, 140), c.B(0.4, 159.2)], { run: true, onArrive: (x) => this.tangle(x) });
          g.quests.notify('event', 'a2midnight');
        });
      } });
    });
  }
  tangle(go) {
    const g = this.g, c = this.c, b = c.npc('bjorn'), hd = c.W.hallDoor;
    this.tangled = true; go.h.hold('R', null); go.h.play('fall', 0.8); go.setLoop('lie'); g.audio.play('thud');
    b.visible = true; b.teleport(hd.x + 0.5, hd.z + 0.8, 0); b.setLoop(null); b.goTo(go.pos.x + 0.5, go.pos.z - 0.6, { run: true, onArrive: (o) => { o.setLoop('sit'); o.teleport(go.pos.x + 0.1, go.pos.z + 0.3, 0); } });
  }
  row() {
    const g = this.g, c = this.c, [x, z] = c.B(-3, 247);
    this.rowing = { t: 0, x, z }; c.npc('bjorn').say('Two oars and a loaf of bread. Row.', 4); // (game: the story has Bjorn tell them to row)
    for (const id of ['grim', 'grimolf']) { const n = c.npc(id); n.mode = 'crew'; n.setLoop('sit'); }
  }

  // ---- the hardest summer ----------------------------------------------------------------------
  work(kind) {
    const g = this.g, c = this.c, q = g.quests, p = g.player, K = A2.knack, i = this.count();
    const at3 = (x, z, tx, tz) => [x, z, Math.atan2(tx - x, tz - z)];
    const done = (key, n = 1) => q.notify('event', key, n);
    if (kind === 'fell') { const [x, z] = c.B(...TREES[i]); new Knack(g, { label: 'Fell the tree', cfg: K.fell, hold: 'woodaxe', at: at3(x + 1.0, z + 0.5, x, z), sound: 'chop', seed: i, onGood: () => g.fx.burst('chips', x, p.pos.y + 0.6, z, 8), onDone: () => { this.fall = { m: this.trunks[i], t: 0 }; g.audio.play('split'); done('a2timber'); } }).start(); }
    if (kind === 'dig') { const [x, z] = c.B(...DIGS[i]); new Knack(g, { label: 'Dig the ditch', verb: 'dig', cfg: K.dig, hold: 'hoe', at: at3(x - 0.8, z - 0.4, x, z), sound: 'thud', seed: i + 3, onDone: () => done('a2dig') }).start(); }
    if (kind === 'post') { const [x, z] = c.B(...POSTS[i]); new Knack(g, { label: 'Raise the palisade: drive the post', verb: 'drive', cfg: K.post, hold: 'maul', at: at3(x - 0.6, z + 1.6, x, z), sound: 'chop', seed: i + 7, onDone: () => done('a2post') }).start(); }
    if (kind === 'tower') { const [x, z] = c.B(-12, 19); new Knack(g, { label: 'Raise the watchtower', verb: 'drive', cfg: K.latrine, hold: 'maul', at: at3(x, z + 1.2, x, z - 1), sound: 'chop', seed: 4, onDone: () => { done('a2tower'); c.sub('They build a watchtower on the hill by the old birch, where {w} and {b} roost.', 6); } }).start(); }
    if (kind === 'latrine') {
      const [x, z] = c.B(58, 30), h = c.npc('hauk');
      new Knack(g, { label: 'Dig the new latrine trench', verb: 'dig', cfg: K.latrine, hold: 'hoe', at: at3(x - 0.8, z + 1.2, x, z), sound: 'thud', bad: 'Ten years of it', seed: 9,
        onGood: (n) => { if (n === 2) { h.h.play('fall', 0.9); h.setLoop('dead'); g.audio.play('thud'); c.sub('Hauk the cow-owner faints from the smell.', 4.5); g.after(9, () => { h.setLoop(null); }); } },
        onDone: () => { c.sub('Eirik spends three days digging a new latrine trench, because the old one is inside the planned wall line. Moving the old one involves shoveling ten years of village waste into barrows.', 9); done('a2latrine'); } }).start();
    }
  }
  drill() {
    const g = this.g, c = this.c, p = g.player, b = c.npc('bjorn'), [x, z] = c.B(98, 40), line = ['v0', 'v2', 'v3', 'v5', 'hauk', 'grjotgard', 'v7', 'v9'];
    p.teleport(x, z, Math.PI); if (g.inventory.has('father_axe')) p.equip('father_axe');
    new Bout(g, { title: "Bjorn's shield wall", need: A2.bout.drill, window: A2.bout.window, loop: 'guard', cam: [[x + 7.5, g.world.groundAt(x, z) + 2.6, z - 5.5], [x, g.world.groundAt(x, z) + 1.1, z + 0.5]],
      calls: [{ say: 'SHIELDS!', key: 'block', label: 'lock shields' }, { say: 'PUSH!', key: 'attack', label: 'push' }],
      onCall: (k) => { b.h.play('cheer', 0.7); for (const id of line) { const n = c.npc(id); if (k.key === 'attack') n.h.play('shove', 0.7); else n.h.play('blockhit', 0.5); } },
      onAnswer: (k, ok) => { p.h.play(ok ? (k.key === 'attack' ? 'shove' : 'blockhit') : 'stagger', 0.5); if (!ok) b.say('Again!', 1.6); },
      onDone: () => { c.sub('Bjorn trains every man and woman who can hold a spear, making them form a shield wall in the pasture until they can do it in their sleep.', 7);
        g.after(7.2, () => c.fade(() => { c.setPhase('frost', true); p.equip('none'); p.teleport(...c.B(-9, 66), Math.PI); return g.ui.card('', 'By the first frost, Bjornstead has walls.', 5.5); }, 1.4, 1.4).then(() => g.quests.notify('event', 'a2drill'))); } }).start();
  }

  // =====================================================================================
  steps = {
    'q_peddlers.meet'(r) {
      const g = this.g, c = this.c;
      c.setPhase('ped', r); c.post('grim', [15, 146.4, -1.6]); c.post('grimolf', [16.4, 149, -1.9]);
      for (let i = 0; i < 4; i++) c.post('kid' + i, [11.5 + (i % 2) * 1.4, 145 + i * 1.3, [15, 146.4]]).held = true; // honey cakes
      if (!r) { g.player.frozen = true; g.ui.card('The Peddlers', 'Two weeks later', 3.8).then(() => { g.player.frozen = false; }); }
    },
    'q_peddlers.dusk'(r) { const c = this.c; c.setPhase('ped', r); c.post('grim', [15, 146.4, -1.6]); c.post('grimolf', [16.4, 149, -1.9]); if (!r) c.sub('{w} does not like them.', 4); },
    'q_peddlers.watch'(r) { const c = this.c; c.setPhase('pednight', r); this.camp(); c.hint('eyeUp'); if (!r) c.sub('That night Eirik sends {w} to watch their camp, out on the west road.', 5.5); },
    'q_peddlers.net'(r) { const c = this.c; c.setPhase('pednight', r); this.camp(); c.hint(null); },
    'q_peddlers.string'(r) { this.c.setPhase('pednight', r); this.camp(); },
    'q_peddlers.wait'(r) { this.c.setPhase('pednight', r); this.camp(); this.tangled = false; },
    'q_peddlers.chase'(r) {
      const c = this.c;
      c.setPhase('pednight', r);
      if (r) { const go = c.npc('grimolf'), [x, z] = c.B(0.4, 159.2); go.visible = true; go.teleport(x, z, 0); this.tangle(go); const gr = c.post('grim', [-4.2, 119.6, 0]); gr.die(true); c.post('freydis', [-4.2, 118, 0.3]); }
    },
    'q_peddlers.thing'(r) {
      const g = this.g, c = this.c, set = () => { c.setPhase('pedmorn', true); this.tangled = false;
        const all = c.folk.filter((id) => !id.startsWith('kid') && id !== 'lawman'); c.ring(all, -92, 92, 6, null, 0.4, 4.4); c.post('lawman', [-90.6, 90.4, [-93, 94]]); c.post('bjorn', [-95.6, 91, [-93, 94]]);
        c.post('grim', [-93.6, 94.6, [-90.6, 90.4], 'kneel']); c.post('grimolf', [-92, 95.4, [-90.6, 90.4], 'kneel']); c.post('freydis', [-88, 95, [-93, 94]]); };
      if (r) return set();
      c.say('a2_confess', c.npc('grimolf'), () => c.fade(() => { set(); g.player.teleport(...c.B(-86, 99), -2.4); }, 1.2, 1.2));
    },
    'q_peddlers.boat'(r) {
      const g = this.g, c = this.c, [x, z] = c.B(-3, 247);
      c.setPhase('pedmorn', r); this.rowing = null;
      this.boat.visible = true; this.boat.position.set(x, -0.12, z); this.boat.rotation.y = 0;
      c.post('bjorn', [0.8, 244, [-3, 247]]); for (const [i, id] of ['grim', 'grimolf'].entries()) { const n = c.post(id, [-3, 246.2 + i * 1.5, 3.14, 'sit']); n.mode = 'crew'; n.pos.y = 0.05; }
    },
    'q_peddlers.bjorn'(r) {
      const g = this.g, c = this.c;
      c.setPhase('pedeve', r); c.cook.on = true; this.boat.visible = false;
      c.post('bjorn', [-0.9, 126.2, [-2.5, 126.4], 'warm']);
      if (!r) { g.player.frozen = true; g.ui.fade(true, 1).then(() => { g.player.teleport(...c.B(-4.4, 127.4), 1.6); return g.ui.card('', 'The village laughs about the frying pan for years. Freydis keeps it on a peg by the door and calls it Skull-Ringer.', 6.5); }).then(() => g.ui.fade(false, 1)).then(() => { g.player.frozen = false; c.sub('But that night Bjorn sits up with Eirik.', 4); }); }
    },
    'q_walls.call'(r) { const c = this.c; c.setPhase('pedmorn', r); if (!r) c.sub('Eirik calls the whole village to the Thing stones.', 5); },
    'q_walls.listen'(r) { const c = this.c; c.setPhase('stones', r); if (!r) c.sub('Some people want to leave Bjornstead and scatter to relatives inland. Some want to send a gift of silver to Håkon and beg for peace. A few, quietly, think it would be easiest to hand Eirik over.', 10); },
    'q_walls.speak'(r) { this.c.setPhase('stones', r); },
    'q_walls.timber'(r) {
      const c = this.c; c.setPhase('work', r); this.crew();
      this.trunks.forEach((m, i) => { m.rotation.z = i < this.count() ? 1.5 : 0; });
      if (!r) c.sub('What follows is the hardest summer anyone can remember. They cut timber in the hills.', 7);
    },
    'q_walls.haul'(r) {
      const g = this.g, c = this.c, h = this.horse, [x, z] = c.B(-58, -54);
      c.setPhase('work', r); this.crew(); this.trunks.forEach((m) => { m.rotation.z = 1.5; });
      h.on = true; h.m.visible = true; h.pos.set(x, g.world.groundAt(x, z), z);
      if (!r) c.sub('...and drag it down with horses and oxen.', 5);
      g.ui.hint('The horse follows where he is led. Keep close.');
    },
    'q_walls.ditch'(r) { const c = this.c; c.setPhase('work', r); this.crew(); c.hint(null); if (!r) c.sub('They dig a ditch around the whole village and sharpen stakes for its bottom.', 6); },
    'q_walls.latrine'(r) { const c = this.c; c.setPhase('work', r); this.crew(); c.post('hauk', [60.6, 32.4, [58, 30], 'hoe', 'hoe']); },
    'q_walls.wall'(r) { const c = this.c; c.setPhase('work', r); this.crew(); if (!r) c.g.after(9.5, () => c.sub("They raise a palisade twice a man's height with a fighting walk inside.", 6)); },
    'q_walls.tower'(r) { const c = this.c; c.setPhase('work', r); this.crew(); },
    'q_walls.drill'(r) {
      const c = this.c; c.setPhase('work', r); this.crew();
      c.post('bjorn', [98, 46, [98, 38]]);
      ['v0', 'v2', 'v3', 'v5', 'hauk', 'grjotgard', 'v7', 'v9'].forEach((id, i) => { const n = c.post(id, [98 + (i - 3.5) * 1.15 + (i > 3 ? 1.2 : 0), 38.4, 0, 'guard']); n.h.hold('L', 'shield'); n.h.hold('R', 'spear'); });
    },
  };
  /** The brothers at their camp on the west road, at night. */
  camp() { const c = this.c; this.campFire.on = true; c.post('grim', [CAMP[0] + 0.6, CAMP[1] + 1.5, [CAMP[0], CAMP[1]], 'hammer', 'seax']); c.post('grimolf', [CAMP[0] - 1.6, CAMP[1] - 0.4, [CAMP[0], CAMP[1]], 'sit']); for (const id of ['bjorn', 'freydis', 'signe']) c.npc(id).visible = false; for (const id of c.folk) c.npc(id).visible = false; }
  /** The village at work on its walls. */
  crew() {
    const c = this.c;
    c.post('v0', [-60, -60, [-62, -66], 'chopping', 'woodaxe']); c.post('v4', [-52, -58, [-55, -66], 'chopping', 'woodaxe']); c.post('v3', [30, 53.4, [30, 51], 'hoe', 'hoe']); c.post('v5', [60, 58, [60, 55], 'hoe', 'hoe']);
    c.post('v7', [84, 70.6, [86, 68], 'hoe', 'hoe']); c.post('v9', [-28, 56, [-28, 54], 'hammer', 'hammer']); c.post('grjotgard', [-66, 62.6, [-66, 60], 'hammer', 'hammer']);
    c.post('freydis', [-2, 140, 2.4]); c.post('signe', [24, 206.4, [26, 202], 'cook']); c.post('bjorn', [96, 44, 3.1]);
  }

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, p = g.player;
    if (this.fall) { const f = this.fall; f.t += dt; f.m.rotation.z = Math.min(1.5, f.t * f.t * 1.6); if (f.m.rotation.z >= 1.5) { g.audio.play('thud'); p.cam.shake = 0.2; this.fall = null; } }
    const h = this.horse;
    if (h.on) { // the horse and its load come where he goes
      const dx = p.pos.x - h.pos.x, dz = p.pos.z - h.pos.z, d = Math.hypot(dx, dz), go = d > 3.4 && d < 16 ? Math.min(3.4, d - 2.4) : 0;
      if (go) { h.yaw = dampAngle(h.yaw, Math.atan2(dx, dz), 3, dt); h.pos.x += Math.sin(h.yaw) * go * dt; h.pos.z += Math.cos(h.yaw) * go * dt; g.world.resolve(h.pos, 0.7); h.hop += dt * (3 + go * 2); }
      h.pos.y = g.world.groundAt(h.pos.x, h.pos.z); h.m.rotation.y = h.yaw;
      const s = Math.sin(h.hop) * (go ? 0.6 : 0), lg = h.m.userData.legs; lg[0].rotation.x = s; lg[1].rotation.x = -s; lg[2].rotation.x = -s; lg[3].rotation.x = s;
    }
    if (q.at('q_peddlers', 'boat') && !this.rowing && g.mode === 'play' && Math.hypot(p.pos.x - c.B(0, 240)[0], p.pos.z - c.B(0, 240)[1]) < 9) this.row();
    if (this.rowing) { // away they go, baling
      const r = this.rowing; r.t += dt; this.boat.position.z = r.z + r.t * r.t * 0.12 + r.t * 0.6; this.boat.rotation.z = Math.sin(r.t * 2) * 0.06;
      for (const [i, id] of ['grim', 'grimolf'].entries()) { const n = c.npc(id); n.pos.set(this.boat.position.x, 0.05, this.boat.position.z - 0.8 + i * 1.5); n.root.rotation.y = Math.PI; n.h.setLoop('hoe'); n.h.update(dt); }
      if (r.t > 11 && !r.done) { r.done = true; this.boat.visible = false; for (const id of ['grim', 'grimolf']) c.npc(id).visible = false; this.rowing = null; q.notify('event', 'a2rowed'); }
    } else if (q.at('q_peddlers', 'boat')) for (const id of ['grim', 'grimolf']) { const n = c.npc(id); if (n.visible) { n.h.setLoop('sit'); n.h.update(dt); } }
  }
}
