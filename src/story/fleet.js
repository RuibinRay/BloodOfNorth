// Ship and crew (open-world PROTOTYPE, part three). A karve lies off Kinn: buy her from the reeve, fill her
// benches with hands from the islands, carry the horse, and land a crew that fights beside Eirik.
// Also here: two trader ships that work the sea lanes, and the first job that needs a ship (the tithe-ship
// off Utvær). The vessel itself is Mounts.spawnShip in systems/openworld.js. Design: docs/OPEN_WORLD.md.
import { heightAt } from '../world/terrain.js';
import { makeShip } from '../world/props.js';
import { RAIDER_LOOKS, QUESTS } from '../data/act1.js';
import { dampAngle, angleDiff } from '../core/util.js';

Object.assign(QUESTS, {
  s_ship: {
    title: 'A Keel of Your Own', kind: 'side', xp: 150,
    desc: 'A karve lies at anchor off the north beach of Kinn with nobody to sail her. A ship needs silver first, and then hands.',
    steps: [
      { id: 'buy', text: 'Ask the reeve of Kinn about the karve off her beach', type: 'event', key: 'shipBought', marker: { npc: 'reeve' } },
      { id: 'crew', text: 'Find hands for the oars', type: 'event', key: 'crew', count: 3 },
      { id: 'sail', text: 'Board the Sea-Raven and put to sea', type: 'event', key: 'mounted_ship', marker: { dyn: 'ship' } },
    ],
  },
  s_tithe: {
    title: 'The Tithe-Ship', kind: 'side', xp: 200,
    desc: "The Ironwolf's tithe-ship lies off Utvær, the last island south, taking a tenth of every catch that comes in from deep water. Five men and a reeve of his own. This is work for a ship's crew, not for one man.",
    steps: [
      { id: 'go', text: 'Sail the Sea-Raven to Utvær, the last island south', type: 'reach', key: 'utvaer', marker: { pos: [-104, 1473] } },
      { id: 'fight', text: 'Land with your crew and break the tithe-takers', type: 'event', key: 'tither', count: 6, marker: { pos: [-104, 1473] } },
      { id: 'chest', text: 'Open the tithe-chest', type: 'event', key: 'titheChest', marker: { pos: [-100.5, 1470.5] } },
    ],
  },
});

/** Who will pull an oar, and what it takes. `ok` is tested against the fleet; `cost` is silver. */
const HANDS = {
  kguard: { ok: (f) => f.standing('skerries') >= 40, yes: 'Ragnhild can spare one spear for a guest of the Skerries. And I pull a better oar than I keep a watch.', no: 'I am the reeve\'s man. Be a guest in the Skerries first, not a stranger, and ask me again.' },
  folk1: { ok: (f) => f.standing('vestland') >= 40, yes: 'Gulen has stood a long time without me leaning on a spear beside it. I will come.', no: 'The Vestland barely knows you. Be more than a traveller here, and I will think on it.' },
  fisher1: { ok: (f) => !!f.st.flags.bulandetDone, yes: 'You cleared our shingle when nobody else would. Gudrun can mind the nets.', no: "Not while the Ironwolf's men sit on our north shingle eating our catch." },
  fedje1: { cost: 15, yes: 'Fifteen in silver, and I am yours until the leaves turn.', no: 'Fifteen in silver. I have a mother, and she has opinions.' },
};
const HIRED = {
  hand0: { name: 'Eyvind', look: { build: 1.1, hair: 0xb8904a, hairStyle: 'long', beard: 'short', tunic: 0x5a6a4a, trim: 0x2a2a2a, sleeve: 0x5a6a4a } },
  hand1: { name: 'Grim', look: { build: 1.18, hairStyle: 'bald', beard: 'long', hair: 0x3a2a1c, tunic: 0x4a3e52, trim: 0x8a7a4a, sleeve: 0x4a3e52 } },
};
/** Bench places, in the ship's own frame: [to starboard, forward of the mast]. */
const SEATS = [[-0.72, 3.4], [0.72, 3.4], [-0.78, 2.27], [0.78, 2.27], [-0.8, 1.14], [0.8, 1.14]];
const CREW_LINES = ['Where to, {n}?', 'She is a dry ship. I have rowed worse for richer men.', 'That white bird of yours watches the water better than I do.', 'Say the word and we are over the side.'];
const ROUTES = [
  { name: 'the Otter', pts: [[-5, 312], [0, 470], [90, 528], [50, 640], [0, 648], [-90, 632], [-30, 500]] },
  { name: "the Gull's Road", pts: [[130, 720], [200, 900], [40, 905], [-110, 920], [-195, 800], [-190, 690], [-60, 640], [40, 640]] },
];
const HAILS = { Wolf: 'Keep off! We know that bird, and we know what follows it.', Stranger: 'Fair wind, stranger. Mind the skerries.', Guest: 'Fair wind, {n}!', Kinsman: 'Ravensson! Good sailing to you!', Jarl: 'Way for the jarl! Good sailing, lord!', King: "The king's sail! Dip the yard, lads. Hail, my king!" };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class Fleet {
  constructor(game, open) { this.g = game; this.open = open; this.crew = []; this.ashore = false; this.traders = []; this.hailT = 8; this.t = 0; this.built = false; }
  get st() { return this.g.state; }
  /** The saved record of the ship: null until she is bought. */
  get rec() { return this.st.open.ship || null; }
  get owned() { return !!this.rec; }
  get ship() { return this.open.mounts.ship; }
  standing(id) { const o = this.st.open; return (id === 'vestland' ? o : o.sk).standing; }

  /** A place to lie at anchor: out from an island's middle until the water is deep enough, lying along the shore. */
  anchorage(cx, cz, ang, depth = -1.4) {
    const c = Math.cos(ang), s = Math.sin(ang);
    let d = 10;
    while (d < 220 && heightAt(cx + c * d, cz + s * d) > depth) d += 1;
    return [cx + c * (d + 4), cz + s * (d + 4), Math.atan2(-s, c)];
  }

  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g, o = this.open, m = o.mounts, rec = this.rec, w = g.world, fl = this.st.flags;
    const s = m.spawnShip(...(rec ? rec.pos : this.anchorage(-40, 760, -Math.PI / 2 + 0.42)));
    s.owned = !!rec;
    if (rec) {
      for (const id of rec.crew) this.enlist(id, true);
      if (rec.horse) m.horse.aboard = s;
      if (this.st.open.on === 'ship') m.mount(s);
    }
    // the Ironwolf's tithe-ship off Utvær: seen once the reeve has spoken of her
    this.tithe = makeShip({ L: 17, B: 3.8, D: 1.3, rise: 2.1, sail: false, shields: true, mast: 8, seed: 5 });
    const ta = this.anchorage(-120, 1480, -1.25, -1.6);
    this.tithe.position.set(ta[0], -0.36, ta[1]); this.tithe.rotation.y = ta[2]; this.tithe.visible = false; g.scene.add(this.tithe);
    w.addInteractable({ id: 'tithechest', x: -100.5, z: 1470.5, r: 2.4, priority: 1, label: 'Open the tithe-chest', enabled: () => g.mode === 'play' && !m.on && fl.cleared_utvaer && !fl.titheChest,
      use: () => { fl.titheChest = true; g.player.h.play('pickup', 0.8); g.inventory.add('silver', 120); g.ui.toast('A tenth of every catch in the Skerries, in hacksilver.'); g.quests.notify('event', 'titheChest'); } });
    o.sea.camps.push({
      id: 'utvaer', x: -104, z: 1473, n: 6, name: 'Tithe-taker', key: 'tither', kinds: [null, 'shield', 'archer', null, 'shield', null], cry: "Ravensson. The jarl said you would come by sea one day. He did not say you would bring fishermen.", fire: g.fx.addFire(-104, heightAt(-104, 1473) + 0.15, 1473, 0.6, { on: false }),
      when: () => g.quests.isActive('s_tithe') && !g.quests.at('s_tithe', 'chest'), who: (i) => (i ? null : { name: 'Styr the Tithe-Reeve', opts: { hp: 230, dmg: 17, skill: 0.65, boss: true, rageLine: 'A tenth! I will have ten tenths of you!' } }),
    });
    // traders working the sea lanes
    ROUTES.forEach((r, i) => {
      const model = makeShip({ L: 14, B: 4.0, D: 1.35, rise: 1.5, sail: true, shields: false, mast: 7.5, seed: 21 + i });
      const k = i ? 3 : 1; model.position.set(r.pts[k][0], -0.4, r.pts[k][1]); g.scene.add(model);
      const man = o.person('steer' + i, 'Steersman', { build: 1.05, hair: 0x5a4a3a, beard: 'short', tunic: i ? 0x6a4a3a : 0x3a5a5a, cloak: 0x3a3a3a, sleeve: i ? 0x6a4a3a : 0x3a5a5a }, r.pts[k][0], r.pts[k][1], 0, { law: false });
      man.mode = 'crew'; man.talk = null;
      this.traders.push({ name: r.name, model, pos: model.position, pts: r.pts, k: (k + 1) % r.pts.length, yaw: 0, speed: 0, stuck: 0, man });
    });
    g.events.on('mounted', (type) => { if (type !== 'horse' && this.ashore) this.recall(true); });
    g.events.on('allyDown', (n, by) => this.wound(n, by));
    g.events.on('dismounted', (type) => { if (type === 'ship' && this.crew.length && !this.hornTold) { this.hornTold = true; g.ui.hint('{horn} sounds the horn: the crew come ashore and fight beside you. Sound it again to send them back.'); } });
  }
  onSave() {
    const rec = this.rec, s = this.ship;
    if (!rec || !s) return;
    rec.pos = [s.pos.x, s.pos.z, s.yaw]; rec.horse = this.open.mounts.horse.aboard === s; rec.hull = s.hull;
  }

  // ---- the ship --------------------------------------------------------------------------------
  /** What the reeve of Kinn has to say about ships: the sale, then the work a ship makes possible. */
  reeveOffer() {
    const g = this.g, q = g.quests, inv = g.inventory, R = 'Ragnhild Reeve', silver = inv.count('silver');
    if (!this.owned) {
      const guest = this.standing('skerries') >= 40, price = guest ? 60 : 100;
      return { choices: [{ t: '"The karve off your north beach. Whose is she?"', to: 'ship' }], nodes: [
        { id: 'ship', s: R, t: "She was Orm Keeper's, who kept the Skorpa beacon and drowned under it. No heir. So she is the district's, which is to say mine, and she is rotting for want of use." },
        { s: R, t: guest ? 'For a guest of the Skerries, sixty in silver. She seats six and will move with two.' : 'A hundred in silver, stranger. Sixty, when the Skerries know you better. She seats six and will move with two.' },
        { s: 'Eirik', t: '', choices: [
          { t: `Pay ${price} silver (you carry ${silver})`, to: silver >= price ? 'shipyes' : 'shippoor', fx: silver >= price ? { do: () => this.buy(price) } : null },
          { t: '"Not yet."', to: 'end' },
        ] },
        { id: 'shipyes', s: R, t: 'Then she is yours, and well rid of. Find hands before you find weather. Ulf would go, for a guest. Bard sells rowers like he sells passage.', to: 'end' },
        { id: 'shippoor', s: R, t: 'Come back heavier.', to: 'end' },
      ] };
    }
    if (q.st.s_tithe) return this.open.war.reeveOffer(); // after the tithe: what a ship can do at sea
    const ask = '"I have a keel now. What would you have me do with her?"';
    if (this.crew.length < 3) return { choices: [{ t: ask, to: 'ship' }], nodes: [{ id: 'ship', s: R, t: 'Fill her benches. Three hands at the least. Then come and ask me that again, because I have something that wants a crew.', to: 'end' }] };
    return { choices: [{ t: ask, to: 'ship' }], nodes: [
      { id: 'ship', s: R, t: "Then hear what I could not ask of a man in a rowing boat. The Ironwolf's tithe-ship lies off Utvær, the last island south. Five men and a reeve of his own, taking a tenth of every catch that comes in from the deep water." },
      { s: R, t: 'Land with your crew and break them. What is in their chest came out of our nets. Bring that back and the Skerries will not forget whose sail did it.', to: 'end', fx: { quest: 's_tithe' } },
    ] };
  }
  buy(price) {
    const g = this.g, s = this.ship;
    g.inventory.remove('silver', price, true);
    this.st.open.ship = { pos: [s.pos.x, s.pos.z, s.yaw], crew: [], horse: false };
    s.owned = true;
    g.ui.questBanner('A keel of your own', 'The Sea-Raven'); g.audio.play('questDone');
    g.quests.notify('event', 'shipBought');
  }

  // ---- the crew --------------------------------------------------------------------------------
  recruitable(n) { return this.owned && !!HANDS[n.id] && !this.crew.includes(n) && this.crew.length < SEATS.length; }
  recruitTalk(n) {
    const g = this.g, d = HANDS[n.id], silver = g.inventory.count('silver'), ok = d.cost ? silver >= d.cost : d.ok(this);
    this.open.say([
      { s: n.name, t: 'That is your sail off Kinn now, they say. The Sea-Raven.' },
      { s: 'Eirik', t: '', choices: [
        { t: d.cost ? `"Sail with me." (${d.cost} silver, you carry ${silver})` : '"Sail with me. I need hands for the oars."', to: ok ? 'yes' : 'no', fx: ok ? { do: () => { this.joining = n; } } : null },
        { t: '"Another time."', to: 'end' },
      ] },
      { id: 'yes', s: n.name, t: d.yes, to: 'end' },
      { id: 'no', s: n.name, t: d.no, to: 'end' },
    ], n, () => { if (this.joining) { const x = this.joining; this.joining = null; if (d.cost) g.inventory.remove('silver', d.cost, true); this.enlist(x.id); } });
  }
  /** Bard Skipper on Kinn sells rowers. */
  hireOffer(n) {
    const g = this.g, silver = g.inventory.count('silver'), next = ['hand0', 'hand1'].find((id) => !this.rec || !this.rec.crew.includes(id));
    if (n.id !== 'skipper' || !this.owned || !next || this.crew.length >= SEATS.length) return { choices: [], nodes: [] };
    return { choices: [{ t: `Hire one of your rowers (20 silver, you carry ${silver})`, to: silver >= 20 ? 'hired' : 'hpoor', fx: silver >= 20 ? { do: () => { this.hiring = next; } } : null }],
      nodes: [{ id: 'hired', s: n.name, t: `${HIRED[next].name}! You pull for the Ravensson now. Try not to drown him.`, to: 'end' }, { id: 'hpoor', s: n.name, t: 'Twenty. My rowers eat.', to: 'end' }],
      after: () => { if (this.hiring) { const id = this.hiring; this.hiring = null; g.inventory.remove('silver', 20, true); this.enlist(id); } } };
  }
  /** Put someone on the crew list. `restoring` = from a save: no fanfare, straight to the bench. */
  enlist(id, restoring = false) {
    const g = this.g, o = this.open, s = this.ship;
    let n = g.npcs.get(id);
    if (!n) { const d = HIRED[id]; n = o.person(id, d.name, d.look, s.pos.x, s.pos.z, 0, { law: false }); }
    o.folk = o.folk.filter((f) => f !== n); // crew stand outside the law of the islands
    n.role = 'crew'; n.keepDry = true; n.hpMax = 60; n.hp = 60; n.wounded = false; n.baseLoop = null; n.setLoop(null); n.weapon = n.weapon || (this.crew.length % 2 ? 'spear' : 'axe'); n.h.hold('R', null);
    n.chat = () => n.say(g.fmt(CREW_LINES[(Math.random() * CREW_LINES.length) | 0]), 3.5); n.talk = n.chat;
    this.crew.push(n);
    if (restoring) { this.board(n); return; }
    this.rec.crew.push(id);
    g.ui.toast(`${n.name} joins the crew of the Sea-Raven (${this.crew.length} of ${SEATS.length}).`); g.audio.play('chime');
    g.quests.notify('event', 'crew');
    const land = o.mounts.shore(s);
    if (this.ashore) { n.talk = null; n.h.hold('R', n.weapon); n.follow(g.player, { dist: 2.8 + this.crew.length * 0.9 }); }
    else if (!HIRED[id] && land && n.dist(land) < 170 && n.dist(land) > 3) n.goTo(land.x, land.z, { run: true, onArrive: () => this.board(n) }); // he walks down to her
    else this.board(n);
  }
  board(n) { n.aboard = true; n.mode = 'crew'; n.path = []; n.h.hold('R', null); n.talk = n.chat; n.talkLabel = null; n.wounded = false; n.setLoop(null); }
  /** A crewman goes down: out of this fight, on his feet again once it is over. */
  wound(n, by) {
    const g = this.g;
    if (!this.crew.includes(n) || n.wounded) return;
    n.wounded = true; n.recT = 0; n.mode = 'idle'; n.setLoop('kneel');
    if (by && by.cb && by.cb.duel === n) by.cb.duel = null; // the man who put him down turns on someone else
    g.ui.toast(`${n.name} is down.`); g.audio.play('hurt', { vol: 0.7 });
    if (g.skills.has('w_rally')) { n.talkLabel = `Help ${n.name} up`; n.talk = () => this.rally(n); } // Rally: he can be got to his feet now
  }
  rally(n) {
    const g = this.g, p = g.player;
    if (!n.wounded) return;
    n.wounded = false; n.hp = Math.round(n.hpMax / 2); n.talk = null; n.talkLabel = null; n.setLoop(null); n.h.hold('R', n.weapon);
    n.follow(p, { dist: 3 + this.crew.indexOf(n) * 0.9 }); p.h.play('pickup', 0.6); g.audio.play('chime');
    g.ui.toast(`${n.name} is on his feet again.`);
  }
  /** The horn: crew ashore to follow and fight, or back aboard. */
  horn() {
    const g = this.g, p = g.player, s = this.ship;
    if (!this.owned || !this.crew.length || this.open.mounts.on || g.mode !== 'play' || this.open.war.lash) return;
    g.audio.play('horn', { freq: 196, vol: 0.5 });
    if (this.ashore) { this.recall(false); g.ui.toast('The horn: back to the ship.'); return; }
    const land = this.open.mounts.shore(s);
    if (dist(p.pos, s.pos) > 170) { g.ui.toast('The crew are too far off to hear the horn.'); return; }
    if (!land) { g.ui.toast('The Sea-Raven lies too far out for the crew to wade ashore.'); return; }
    this.ashore = true;
    this.crew.forEach((n, i) => {
      n.aboard = false; n.talk = null; n.teleport(land.x + Math.cos(i * 1.1) * 1.3, land.z + Math.sin(i * 1.1) * 1.3, 0); // at his heels they do not offer talk: it would steal the prompt for a chest or the helm
      n.h.hold('R', n.weapon); n.follow(p, { dist: 2.8 + i * 0.9 });
    });
    g.ui.toast('The horn: the crew come ashore.');
  }
  /** Up from the benches, weapons out, onto the deck (the ships are lashed together). */
  standTo() {
    const p = this.g.player;
    this.ashore = true;
    this.crew.forEach((n, i) => { if (!n.aboard) return; n.aboard = false; n.talk = null; n.mode = 'idle'; n.h.hold('R', n.weapon); n.follow(p, { dist: 2.2 + i * 0.5 }); });
  }
  recall(now) {
    const s = this.ship, land = this.open.mounts.shore(s);
    this.ashore = false;
    for (const n of this.crew) {
      if (n.aboard) continue;
      if (!now && land && n.dist(land) < 140) n.goTo(land.x, land.z, { run: true, onArrive: () => this.board(n) });
      else this.board(n);
    }
  }

  steps = {
    's_ship.buy'() { this.open.build(); if (this.owned) this.g.after(0.2, () => this.g.quests.notify('event', 'shipBought')); },
    's_ship.crew'(r) {
      this.open.build();
      const q = this.g.state.quests.s_ship; q.count = this.rec ? this.rec.crew.length : 0; this.g.ui.refreshTracker();
      if (!r) this.g.ui.hint('Hands for the oars: Ulf on Kinn, Hauk on Gulen, Ketil on Bulandet, Tosti on Fedje, and Bard Skipper hires out rowers. Each wants something first.');
      this.g.after(0.2, () => this.g.quests.notify('event', 'crew', 0));
    },
    's_ship.sail'() { this.open.build(); },
    's_tithe.go'() { this.open.build(); },
    's_tithe.fight'(r) { this.open.build(); if (r) this.g.state.quests.s_tithe.count = 0; else this.g.ui.hint('Step ashore and sound the horn with {horn}. Your crew each take a man; the rest are yours.'); },
    's_tithe.chest'() { this.open.build(); },
  };
  questDone(id) {
    if (id === 's_tithe') { this.open.law.addStanding(30, "The Ironwolf's tithe is broken"); this.g.ui.toast('What a longship and thirty men could do is not built yet.'); }
  }

  update(dt) {
    const g = this.g, p = g.player, q = g.quests, o = this.open, m = o.mounts, s = this.ship;
    this.t += dt;
    if (g.mode === 'play' && !q.st.s_ship && !this.owned && (q.isDone('q_sea') || q.at('q_sea', 'chart'))) q.start('s_ship');
    if (g.mode === 'play' && g.input.hit('horn')) this.horn();
    this.tithe.visible = !!q.st.s_tithe;
    const tc = o.sea.camps.find((c) => c.id === 'utvaer'); tc.fire.on = q.isActive('s_tithe') && !this.st.flags.cleared_utvaer;
    if (q.at('s_tithe', 'go') && dist(p.pos, { x: -120, z: 1480 }) < 125) q.notify('reach', 'utvaer');

    // on the benches: facing aft to row, forward under sail
    s.hands = this.crew.filter((n) => n.aboard).length;
    const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw), rowing = !s.sailUp && Math.abs(s.speed) > 0.4;
    this.crew.forEach((n, i) => {
      if (!n.aboard) return;
      const seat = SEATS[i];
      n.pos.set(s.pos.x + cy * seat[0] + sy * seat[1], s.pos.y + 0.44, s.pos.z - sy * seat[0] + cy * seat[1]);
      n.yaw = dampAngle(n.yaw, s.yaw + (rowing ? Math.PI : 0), 6, dt); n.root.rotation.y = n.yaw; n.speed = 0;
      n.h.setLocomotion(0, false); n.h.setLoop('sit'); n.h.update(dt);
      n.hpMax = g.skills.has('w_brothers') ? 90 : 60; // Shield-Brothers
      n.hp = Math.min(n.hpMax, n.hp + 1.5 * dt); // rest mends them
    });
    const out = this.crew.filter((n) => !n.aboard);
    this.status = out.length ? `crew ${out.filter((n) => !n.wounded).length} of ${out.length} standing` : '';
    // ashore: each free hand takes a man off Eirik's back
    if (this.ashore) for (const n of this.crew) {
      if (n.aboard) continue;
      if (n.wounded) { // down until the fighting stops, then up again, weak
        if (!g.combat.active && (n.recT += dt) > 4) { n.wounded = false; n.talk = null; n.talkLabel = null; n.hp = 30; n.setLoop(null); n.follow(p, { dist: 3 + this.crew.indexOf(n) * 0.9 }); g.ui.toast(`${n.name} is on his feet again.`); }
        continue;
      }
      const busy = n.mode === 'fight' && n.partner && !n.partner.dead && n.partner.cb && !n.partner.cb.out;
      if ((n.mode === 'fight' && !busy) || n.mode === 'idle') n.follow(p, { dist: 3 + this.crew.indexOf(n) * 0.9 }); // his man is down: back to Eirik's side
      if (busy || !g.combat.active || n.mode === 'goto') continue;
      // nearest man nobody else has taken; a captain is left for Eirik unless he is all that is left
      const free = g.combat.alive().filter((e) => !e.cb.duel || e.cb.duel.dead || e.cb.duel.partner !== e || e.cb.duel.mode !== 'fight').sort((a, b) => (a.cb.boss ? 1000 : 0) + n.dist(a) - (b.cb.boss ? 1000 : 0) - n.dist(b))[0];
      if (free && n.dist(free) < 45 && (!free.cb.boss || g.combat.alive().length === 1)) { free.cb.duel = n; n.fight(free, { lethal: 0, dmg: g.skills.has('w_hands') ? 9 : 6 }); }
    }
    // traders: steer for the next mark, keep off the shallows, hail whoever passes
    this.hailT -= dt;
    const afloat = m.on && m.on.type !== 'horse' ? m.on : null;
    for (const t of this.traders) {
      const tgt = t.pts[t.k], dx = tgt[0] - t.pos.x, dz = tgt[1] - t.pos.z;
      if (Math.hypot(dx, dz) < 26) { t.k = (t.k + 1) % t.pts.length; continue; }
      let want = Math.atan2(dx, dz);
      const probe = (a) => heightAt(t.pos.x + Math.sin(t.yaw + a) * 34, t.pos.z + Math.cos(t.yaw + a) * 34);
      if (probe(0) > -3.5) want = t.yaw + (probe(0.7) < probe(-0.7) ? 1.1 : -1.1); // land ahead: turn toward the deeper side
      t.yaw = dampAngle(t.yaw, want, 0.7, dt);
      const near = afloat && dist(afloat.pos, t.pos) < 20, turning = Math.abs(angleDiff(t.yaw, want));
      const sp = near ? 0 : turning > 1 ? 2 : 5.5; t.speed += (sp - t.speed) * Math.min(1, dt * 0.8);
      const nx = t.pos.x + Math.sin(t.yaw) * t.speed * dt, nz = t.pos.z + Math.cos(t.yaw) * t.speed * dt;
      if (heightAt(nx, nz) < -1.6) { t.pos.x = nx; t.pos.z = nz; t.stuck = 0; }
      else if ((t.stuck += dt) > 12 && dist(p.pos, t.pos) > 160) { const np = t.pts[t.k]; t.pos.x = np[0]; t.pos.z = np[1]; t.k = (t.k + 1) % t.pts.length; t.stuck = 0; } // aground and unseen: pick her up and carry on
      t.pos.y = -0.4 + Math.sin(this.t * 1.1 + t.k) * 0.05;
      t.model.rotation.set(Math.sin(this.t * 0.8) * 0.02, t.yaw, 0.05 + Math.sin(this.t) * 0.03);
      const tm = t.man; tm.pos.set(t.pos.x - Math.sin(t.yaw) * 5.2, t.pos.y + 0.62, t.pos.z - Math.cos(t.yaw) * 5.2); tm.yaw = t.yaw; tm.root.rotation.y = t.yaw; tm.h.setLocomotion(0, false); tm.h.setLoop(null); tm.h.update(dt);
      if (afloat && this.hailT <= 0 && dist(afloat.pos, t.pos) < 48) { this.hailT = 55; g.ui.subtitle(`Steersman of ${t.name}`, g.fmt(HAILS[o.law.tier().name]), 4); g.audio.play('shout', { vol: 0.35 }); }
    }
  }
}
