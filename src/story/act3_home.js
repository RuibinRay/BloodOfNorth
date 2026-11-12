// Act III at home: "Fifty from Ravenhold" (the Thing, and the three strangers: Brokk, Astrid and the camp in the
// ravine, Torvald), the two sailings for Jarnøy, and the homecoming of "The Gift of Iron" (the second forge, the
// first reforging, Storm-Yew). See act2.js for what the mainland acts share.
import { A3, CAST3, BROKK_HAND } from '../data/act3.js';
import { REFORGE } from '../data/weapons.js';
import { horseModel } from '../entities/wildlife.js';
import { Knack, Bout } from '../systems/activities2.js';

const CAMP = [178, -148], GUARDS = [[160, -122], [171, -117]], HILL = [-54, -54];

export class A3Home {
  constructor(game, core) { this.g = game; this.c = core; this.tale = 0; this.camp = null; }
  get st() { return this.g.state; }
  /** How far a quest has come: -1 not begun, its step while active, 99 when done. */
  at(id) { const q = this.st.quests[id]; return !q ? -1 : q.status === 'done' ? 99 : q.step; }
  build() {
    const g = this.g, c = this.c, q = g.quests, w = g.world;
    for (const id of ['brokk', 'astrid', 'torvald', 'ari', 'bowyer']) { const n = g.addNPC(id, CAST3[id]); n.visible = false; n.talk = () => c.talkTo(id); }
    const beast = (col, sc) => { const m = horseModel(); m.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.color.set(col); } }); m.scale.setScalar(sc); m.visible = false; g.scene.add(m); return m; };
    this.mule = beast(0xb8b0a4, 0.8); this.horse = beast(0xc8a888, 1.1);
    const I = (id, pos, label, enabled, use, o = {}) => w.addInteractable({ id, x: pos[0], z: pos[1], r: 3, priority: 3, label, enabled, use, ...o });
    I('a3sail', c.B(-2.2, 236), 'Board the Sea-Raven', () => q.at('q_isle', 'sail') || q.at('q_healer', 'sail'), () => this.sail(), { r: 3.6 });
    I('a3thing', c.B(-92, 92), 'Call the people to the Thing stones', () => q.at('q_fifty', 'thing') && !this.called, () => this.thing(), { r: 3.4 });
    I('a3cut', c.B(CAMP[0] + 5, CAMP[1] - 6), 'Cut the farmers loose', () => q.at('q_fifty', 'free'), () => this.free());
    g.ravens.addMarkable({ id: 'a3woman', pos: () => ({ x: c.B(...HILL)[0], z: c.B(...HILL)[1] }), r: 110, label: 'a woman in the hills, alone', enabled: () => q.at('q_fifty', 'woman'),
      onMark: () => { c.sub('{w} keeps showing him a woman in the hills, alone, following the trail of a band of raiders who have been snatching people from outlying farms.', 8); q.notify('event', 'a3woman'); } });
    GUARDS.forEach(([dx, dz], i) => g.ravens.addMarkable({ id: 'a3g' + i, pos: () => ({ x: c.B(dx, dz)[0], z: c.B(dx, dz)[1] }), r: 36, label: 'a guard on the road below the camp', enabled: () => q.at('q_fifty', 'guards') && this.camp && !this.camp.guards[i].dead,
      onMark: () => this.shootGuard(i) }));
  }
  clear(phase) {
    const c = this.c;
    for (const id of ['brokk', 'astrid', 'torvald', 'ari', 'bowyer']) c.npc(id).visible = false;
    this.mule.visible = this.horse.visible = false; this.called = false;
    if (phase !== 'a3hills' && this.camp) { this.camp.fire.on = false; this.camp = null; }
  }
  dyn() { return undefined; }
  /** The companions, where the year has brought them. */
  dressed(name) {
    const c = this.c, g = this.g, f = this.at('q_fifty'), ir = this.at('q_iron');
    if (!name.startsWith('a3')) return;
    const put = (id, spec) => c.post(id, spec);
    put('leif', [2.6, 222, 2.4]); put('gisli', [4.4, 224.6, 3.4]);
    if (f >= 1) { // Brokk has the forge; the village smith has gone fishing instead
      if (ir >= 3) put('brokk', [-65.3, 149.4, [-64.2, 149.4], 'hammer', 'hammer']); else put('brokk', [-51.4, 157.4, [-51.4, 158.6], 'hammer', 'hammer']);
      put('v6', [-0.9, 244, 0.2, 'fish', 'rod']);
      const [mx, mz] = c.B(-57, 162); this.mule.visible = true; this.mule.position.set(mx, g.world.groundAt(mx, mz), mz); this.mule.rotation.y = 1.2;
    }
    if (f >= 10 && name !== 'a3hills') put('astrid', f === 9 ? [-8, 62, 3.1] : [9, 128, 2.6]).h.hold('L', 'bow');
    if (f >= 11) { put('torvald', [14, 132, -2]).h.hold('R', 'maul'); const [hx, hz] = c.B(20, 136); this.horse.visible = true; this.horse.position.set(hx, g.world.groundAt(hx, hz), hz); this.horse.rotation.y = 0.6; }
    if (ir >= 3) put('ingrid', [-7.4, 122.4, 0.4]);
    if (this.at('q_shore') === 99) c.npc('grjotgard').visible = false; // he did not come home from Jarnøy
    if (name === 'a3stones') {
      const all = [...c.folk.filter((id) => !id.startsWith('kid') && id !== 'hauk'), 'signe', 'freydis', 'leif', 'gisli'];
      c.ring(all, -92, 92, 5.6, null, 0.3, 4.6); put('bjorn', [-88.4, 89, [-92, 92]]); put('hauk', [-98.6, 96.4, [-92, 92]]); put('ari', [-100.4, 98.6, [-92, 92]]);
    }
    if (name === 'a3drill') {
      put('torvald', [98, 46, [98, 38]]).h.hold('R', 'maul');
      ['v0', 'v2', 'v3', 'v5', 'hauk', 'grjotgard', 'v7', 'v9'].forEach((id, i) => { const n = put(id, [98 + (i - 3.5) * 1.15 + (i > 3 ? 1.2 : 0), 38.4, 0, 'guard']); n.h.hold('L', 'shield'); n.h.hold('R', 'spear'); });
      put('bjorn', [106, 46, [98, 38]]);
    }
    if (name === 'a3yew') { put('astrid', [-17.6, 14.4, [-20, 10]]).h.hold('L', 'bow'); put('brokk', [-23.4, 13.6, [-20, 10]]); put('bowyer', [-21.4, 15.2, [-20, 10]]); put('leif', [-15.4, 17.4, [-17.6, 14.4]]); put('ingrid', [-13.6, 18.6, [-17.6, 14.4]]); }
  }
  talk(id, n) {
    const g = this.g, c = this.c, q = g.quests;
    if (id === 'brokk') {
      if (q.at('q_fifty', 'brokk')) c.say('a3_brokk', n, () => q.notify('talk', 'brokk'));
      else if (q.at('q_iron', 'reforge')) this.reforge(n);
      else n.say(BROKK_HAND[this.tale++ % BROKK_HAND.length], 4);
      return true;
    }
    if (id === 'astrid') {
      if (q.at('q_fifty', 'guide')) c.say('a3_guide', n, () => q.notify('talk', 'astrid'));
      else if (q.at('q_iron', 'bait')) c.say('a3_bait', n, () => q.notify('talk', 'astrid'));
      else n.say(q.isActive('q_fifty') && this.at('q_fifty') < 9 ? 'Quietly.' : "I know Jarnøy's forests.", 3);
      return true;
    }
    if (id === 'torvald') {
      if (q.at('q_fifty', 'torvald')) c.say('a3_torvald', n, () => q.notify('talk', 'torvald'));
      else if (q.at('q_fifty', 'drill')) this.drill(n);
      else n.say('Your father locked shields the same way. Left foot forward.', 4); // (game)
      return true;
    }
    if (id === 'ari') { n.say('I am fourteen. That is nearly fifteen.', 3); return true; } // (game)
    if (id === 'bowyer') { n.say('Yew that the lightning cracked and did not kill. I have never cut a stave like it.', 4); return true; } // (game)
    return false;
  }

  // ---- sailing for Jarnøy -------------------------------------------------------------------
  sail() {
    const g = this.g, c = this.c, p = g.player, second = g.quests.at('q_healer', 'sail');
    p.frozen = true;
    g.ui.fade(true, 1.2).then(() => g.ui.card('Jarnøy', second ? 'Leif discovers that half of Ravenhold\'s warriors get seasick. He spends the whole voyage stepping around them and complaining about the smell.' : 'The Iron Isle', second ? 7 : 4))
      .then(() => { c.setPhase(second ? 'jprep' : 'jday', true); p.teleport(...c.isle.J(236, -24), -Math.PI / 2); return g.ui.fade(false, 1.2); })
      .then(() => { p.frozen = false; g.quests.notify('event', second ? 'a3sailed2' : 'a3sailed'); });
  }
  // ---- the Thing -------------------------------------------------------------------------------
  thing() {
    const g = this.g, c = this.c;
    this.called = true;
    c.fade(() => { c.setPhase('a3stones', true); g.player.teleport(...c.B(-90.6, 95.4), 2.4); }).then(() => c.say('a3_thing', c.npc('bjorn'), () => g.quests.notify('event', 'a3thing')));
  }
  cues = {
    ari() { const c = this.c, a = c.npc('ari'); a.h.play('cheer', 1.0); this.g.after(2.2, () => a.goTo(...c.B(-70, 112), { run: false, onArrive: (o) => { o.visible = false; } })); },
    loose() { const g = this.g, a = this.c.npc('astrid'); a.h.play('shoot', 0.9); g.audio.play('bow'); g.after(0.5, () => g.audio.play('arrowHit')); },
  };

  // ---- Astrid and the camp in the ravine ---------------------------------------------------------
  campSet() {
    const g = this.g, c = this.c, P = c.raid.pool, T = c.sea.town, [cx, cz] = c.B(...CAMP);
    if (this.camp) return this.camp;
    const fire = g.fx.addFire(cx, g.world.groundAt(cx, cz) + 0.15, cz, 0.7);
    const man = (n, dx, dz, yaw, loop, hold) => { const [x, z] = c.B(dx, dz); if (n.dead) n.revive(); n.visible = true; n.cb = null; n.name = 'A raider'; n.teleport(x, z, yaw); n.setLoop(loop); n.h.hold('R', hold); n.h.hold('L', null); n.talk = null; return n; };
    const guards = GUARDS.map(([dx, dz], i) => man(P[i], dx, dz, 3.0 + i * 0.4, 'guard', 'spear'));
    const men = [0, 1, 2, 3, 4].slice(0, A3.camp.n).map((i) => { const a = i * 1.257; return man(P[2 + i], CAMP[0] + Math.cos(a) * 3.2, CAMP[1] + Math.sin(a) * 3.2, Math.atan2(-Math.cos(a), -Math.sin(a)), 'sit', ['axe', 'sword', 'axe', 'spear', 'sword'][i]); });
    const farmers = T.slice(0, 6).map((n, i) => { const [x, z] = c.B(CAMP[0] + 4 + (i % 3) * 1.3, CAMP[1] - 7 + (i > 2 ? 1.4 : 0)); if (n.dead) n.revive(); n.visible = true; n.name = 'A farmer'; n.teleport(x, z, 2.6); n.setLoop('kneel'); n.talk = () => n.say('...', 2); return n; });
    return (this.camp = { fire, guards, men, farmers, t: 0, fighting: false });
  }
  shootGuard(i) {
    const g = this.g, c = this.c, a = c.npc('astrid'), e = this.camp.guards[i];
    a.face(e.pos.x, e.pos.z); a.h.play('shoot', 0.8); g.audio.play('bow');
    g.after(0.45, () => { e.die(); g.audio.play('arrowHit'); if (i === 1 || this.camp.guards.every((x) => x.dead)) c.sub('Astrid shoots two before they can shout.', 4); g.quests.notify('event', 'a3guard'); });
  }
  campFight() {
    const g = this.g, K = this.camp, R = A3.camp;
    if (K.fighting) return;
    K.fighting = true; g.player.mortal = true;
    for (const e of K.men) { g.combat.enemies = g.combat.enemies.filter((x) => x !== e); e.setLoop(null); g.combat.add(e, { hp: R.hp, dmg: R.dmg, skill: R.skill }); }
    g.audio.setMusic('raid');
  }
  free() {
    const g = this.g, c = this.c;
    g.player.h.play('pickup', 0.9); g.audio.play('chop', { vol: 0.5 });
    for (const n of this.camp.farmers) n.setLoop(null);
    c.say('a3_freed', c.npc('astrid'), () => g.quests.notify('event', 'a3free'));
  }
  // ---- Torvald's wall, and Brokk's forge -------------------------------------------------------------
  drill(t) {
    const g = this.g, c = this.c, p = g.player, [x, z] = c.B(98, 40), line = ['v0', 'v2', 'v3', 'v5', 'hauk', 'grjotgard', 'v7', 'v9'];
    p.teleport(x, z, Math.PI); if (g.inventory.has('father_axe')) p.equip('father_axe');
    new Bout(g, { title: "Torvald's shield wall", need: A3.bout.drill, window: A3.bout.window, loop: 'guard', cam: [[x + 7.5, g.world.groundAt(x, z) + 2.6, z - 5.5], [x, g.world.groundAt(x, z) + 1.1, z + 0.5]],
      calls: [{ say: 'LOCK!', key: 'block', label: 'lock shields' }, { say: 'STEP!', key: 'attack', label: 'push' }],
      onCall: (k) => { t.h.play('cheer', 0.7); for (const id of line) c.npc(id).h.play(k.key === 'attack' ? 'shove' : 'blockhit', 0.6); },
      onAnswer: (k, ok) => { p.h.play(ok ? (k.key === 'attack' ? 'shove' : 'blockhit') : 'stagger', 0.5); if (!ok) t.say('Again.', 1.6); },
      onDone: () => { p.equip('none'); c.sub('He trains them every morning until they can lock shields in the dark.', 5); g.after(5.2, () => c.say('a3_torvald2', t, () => g.quests.notify('event', 'a3drill'))); } }).start();
  }
  reforge(b) {
    const g = this.g, c = this.c, st = this.st, an = c.W.stages.forge2.anvil;
    c.say('a3_reforge', b, () => new Knack(g, { label: 'Fold the Jarnøy iron into her edge', verb: 'strike', cfg: A3.knack.hammer, hold: 'hammer', sound: 'steel', at: [an.x + 0.9, an.z + 0.5, Math.atan2(-0.9, -0.5)], seed: 6,
      onGood: () => g.fx.burst('spark', an.x, g.world.groundAt(an.x, an.z) + 0.8, an.z, 10),
      onDone: () => { st.flags.reforge = Math.max(1, st.flags.reforge || 0); g.ui.questBanner('Reforged', REFORGE[1].name); c.say('a3_reforge2', b, () => g.quests.notify('event', 'a3reforge')); } }).start());
  }

  // =====================================================================================
  steps = {
    'q_isle.sail'(r) {
      const g = this.g, c = this.c;
      c.setPhase('a3spring', r);
      if (this.st.flags.a3begun) return; // the act opens once, however it is entered (from Act II's end, or from the Acts menu)
      this.st.flags.a3begun = true;
      g.player.frozen = true; g.player.teleport(...c.B(-1, 142), Math.PI);
      g.ui.card('Act Three', 'The Wolves of Iron', 4.2).then(() => { g.player.frozen = false; c.sub('The smoke {w} saw was a burned fishing hamlet on Jarnøy, the Iron Isle, hit by Håkon\'s tribute collectors. In spring, the Sea-Raven sails there to trade Bjornstead\'s wool and salted fish for iron.', 10); });
    },
    'q_fifty.thing'(r) {
      const g = this.g, c = this.c;
      if (r) return c.setPhase('a3spring', r);
      c.fade(() => { c.setPhase('a3spring', true); g.player.teleport(...c.B(-1, 214), Math.PI); return g.ui.card('Ravenhold', "Sailors along the coast have started calling Bjornstead something else. Two ravens circle above its walls every day, and a white one is something nobody forgets. They call it the ravens' hold.", 8); }, 1.2, 1.2)
        .then(() => c.sub('Bjorn complains about this for a month, then gives up and carves a raven on the gate.', 6));
    },
    'q_fifty.brokk'(r) { const c = this.c; c.setPhase('a3month', r); if (!r) this.g.after(1, () => c.sub('That is when three strangers arrive in Ravenhold, one after another, in the same month. The first is Brokk.', 7)); },
    'q_fifty.eye'(r) { const c = this.c; c.setPhase('a3month', r); this.hills(); c.hint('eyeUp'); if (!r) c.sub('The second stranger is Astrid. Eirik finds her rather than the other way round.', 6); },
    'q_fifty.woman'(r) { const c = this.c; c.setPhase('a3month', r); this.hills(); c.hint('Fly north, over the timber road into the hills, and press {interact} when she sees someone.'); },
    'q_fifty.astrid'(r) { const c = this.c; c.setPhase('a3hills', r); this.hills(); c.hint(null); },
    'q_fifty.ravine'(r) {
      const g = this.g, c = this.c, a = c.npc('astrid');
      c.setPhase('a3hills', r); this.hills(); this.campSet();
      const go = () => { a.setLoop(null); a.crouch = false; a.follow(g.player, { dist: 3.2 }); c.sub('Together they track the raiders to a camp in a ravine, where nine captured farmers are tied up to be sold.', 7); };
      if (r) return go();
      a.h.hold('L', 'bow'); c.say('a3_astrid', a, go);
    },
    'q_fifty.guards'(r) { const g = this.g, c = this.c, a = c.npc('astrid'); c.setPhase('a3hills', r); this.hills(); this.campSet(); if (r) g.player.teleport(...c.B(160, -106), 0.3); a.teleport(g.player.pos.x + 1.6, g.player.pos.z + 1, 0); a.setLoop('aim'); a.crouch = true; c.hint('eyeUp'); if (!r) c.sub('{w} shows them where the guards are.', 5); },
    'q_fifty.camp'(r) { const g = this.g, c = this.c; c.setPhase('a3hills', r); this.hills(); this.campSet(); for (const e of this.camp.guards) if (!e.dead) e.die(true); if (r) g.player.teleport(...c.B(164, -124), 0.4); c.ensureArmed(); if (g.player.equipped !== 'father_axe') g.player.equip('father_axe'); this.campFight(); c.hint(null); if (!r) c.sub('Eirik takes the rest.', 3.5); },
    'q_fifty.free'(r) { const g = this.g, c = this.c; c.setPhase('a3hills', r); this.hills(); this.campSet(); for (const e of [...this.camp.guards, ...this.camp.men]) if (!e.dead) e.die(true); g.combat.clear(); g.audio.setMusic('day'); if (r) g.player.teleport(...c.B(CAMP[0], CAMP[1] + 3), 2.6); },
    'q_fifty.guide'(r) {
      const g = this.g, c = this.c;
      if (r) { c.setPhase('a3month', r); return c.post('astrid', [-8, 62, 3.1]).h.hold('L', 'bow'); }
      c.fade(() => { c.setPhase('a3month', true); c.post('astrid', [-8, 62, 3.1]).h.hold('L', 'bow'); if (g.player.equipped !== 'none') g.player.equip('none'); g.player.teleport(...c.B(-8.6, 70), 0); }, 1.4, 1.4);
    },
    'q_fifty.torvald'(r) {
      const g = this.g, c = this.c, [hx, hz] = c.B(-5, 60);
      c.setPhase('a3month', r); c.post('torvald', [-8.4, 63.4, 3.1]).h.hold('R', 'maul');
      this.horse.visible = true; this.horse.position.set(hx, g.world.groundAt(hx, hz), hz); this.horse.rotation.y = 2.6;
      if (!r) c.sub('The third stranger is Torvald.', 4);
    },
    'q_fifty.drill'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('a3drill', r); c.fade(() => { c.setPhase('a3drill', true); g.player.teleport(...c.B(100, 50), Math.PI); }, 1.2, 1.2); },
    'q_healer.sail'(r) {
      const c = this.c;
      c.setPhase('a3spring', r);
      ['v0', 'v2', 'v3', 'v5', 'hauk', 'grjotgard', 'v7', 'v9', 'v4'].forEach((id, i) => { const n = c.post(id, [-9 + (i % 5) * 2.2, 214 + (i > 4 ? 2.4 : 0), 3.14]); n.h.hold('L', 'shield'); n.h.hold('R', 'spear'); });
      c.post('torvald', [3.4, 216, 3.1]).h.hold('R', 'maul'); c.post('astrid', [5.4, 218, 3.3]).h.hold('L', 'bow'); c.post('bjorn', [-12, 211, 2.2]); c.post('freydis', [-13.6, 212.6, 2.0]);
      if (!r) this.g.after(0.5, () => c.sub('The fifty sail to Jarnøy in the Sea-Raven and two fishing boats.', 6));
    },
    'q_iron.reforge'(r) { this.c.setPhase('a3autumn', r); },
    'q_iron.yew'(r) { const g = this.g, c = this.c; if (r) return c.setPhase('a3yew', r); c.fade(() => { c.setPhase('a3yew', true); g.player.teleport(...c.B(-9, 52), 0); }, 1.2, 1.2).then(() => c.sub('And he makes something for Astrid.', 4)); },
    'q_iron.bait'(r) { const c = this.c; c.setPhase('a3yew', r); if (!r) c.say('a3_yew', c.npc('astrid')); },
  };
  /** Astrid alone in the hills, on the raiders' trail. */
  hills() { const c = this.c, a = c.npc('astrid'); if (a.mode === 'follow') return; c.post('astrid', [HILL[0], HILL[1], 1.4, 'aim']); a.h.hold('L', 'bow'); a.crouch = true; }

  update(dt) {
    const g = this.g, c = this.c, q = g.quests, K = this.camp;
    if (!K) return;
    if (q.at('q_fifty', 'camp') && K.fighting) { // Astrid's bow, from the edge of the firelight
      K.t += dt; const alive = K.men.filter((e) => !e.dead && e.cb && !e.cb.out);
      if (!alive.length) { K.fighting = false; g.audio.setMusic('day'); g.after(1.2, () => q.notify('event', 'a3camp')); return; }
      if (K.t > 5) { K.t = 0; const a = c.npc('astrid'), e = alive[(Math.random() * alive.length) | 0]; a.face(e.pos.x, e.pos.z); a.h.play('shoot', 0.8); g.audio.play('bow', { vol: 0.6 }); g.after(0.45, () => { if (!e.dead && e.cb) g.combat.hurt(e, 26, 30); }); }
    }
  }
}
