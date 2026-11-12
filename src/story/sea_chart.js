// The sea chart (open-world PROTOTYPE, part two). South of Gulen the fjord opens into the Skerries:
// twelve named islands in 1.3 km of open water, under a second law. This file is who lives there and
// what can be done: discovery, passage between harbours, two camps that fight, the reeve's work,
// a seeress, a hermit, and the first of the childhood omens paid off (the Twin-Axe Stone -> Vængr).
// The islands themselves are ISLES in world/layout.js. Design reference: docs/OPEN_WORLD.md.
import { ISLES, DISTRICT_LINE, POI } from '../world/layout.js';
import { heightAt } from '../world/terrain.js';
import { RAIDER_LOOKS, QUESTS, ITEMS } from '../data/act1.js';

Object.assign(ITEMS, {
  brother_axe: { name: 'The Left Brother', desc: 'One of two axes forged from a single bloom and buried apart. Carried in the off hand beside Ragnar\'s axe. Its twin is in somebody else\'s fist.', cat: 'Weapon' },
});
Object.assign(QUESTS, {
  q_sea: {
    title: 'Beyond the Fjord', kind: 'main', xp: 200, next: null,
    desc: 'South of Gulen the fjord opens into the Skerries: a dozen islands under another law. Sail out, find Kinn, and put every island on the chart.',
    steps: [
      { id: 'sail', text: 'Take the boat south, out of the fjord mouth', type: 'reach', key: 'sea', marker: { pos: [0, 470] } },
      { id: 'kinn', text: 'Make landfall on Kinn, seat of the Skerries', type: 'reach', key: 'kinn', marker: { pos: [-40, 752] } },
      { id: 'reeve', text: 'Speak with the reeve of Kinn', type: 'talk', key: 'reeve', marker: { npc: 'reeve' } },
      { id: 'chart', text: 'Find every island on the chart', type: 'event', key: 'isle', count: 12 },
    ],
  },
  s_wreckers: {
    title: 'False Fires', kind: 'side', xp: 80,
    desc: 'Wreckers on Batalden light a fire on the north point so that ships steer for it. The reeve of Kinn wants the fire out, and them with it.',
    steps: [
      { id: 'go', text: 'Sail west from Kinn to Batalden', type: 'reach', key: 'batalden', marker: { pos: [-415, 806] } },
      { id: 'kill', text: 'Put out the wreckers', type: 'event', key: 'wrecker', count: 3, marker: { pos: [-415, 806] } },
      { id: 'back', text: 'Tell the reeve of Kinn', type: 'talk', key: 'reeve', marker: { npc: 'reeve' } },
    ],
  },
  s_beacon: {
    title: 'The Cold Beacon', kind: 'side', xp: 60,
    desc: 'The beacon on Skorpa has not burned since its keeper drowned. Light it, and every steersman in the Skerries will ask who did.',
    steps: [{ id: 'light', text: 'Climb Skorpa and light the beacon', type: 'event', key: 'beacon', marker: { pos: [-230, 1040] } }],
  },
  s_brothers: {
    title: 'The Brothers', kind: 'side', xp: 150,
    desc: 'Two axes made as a pair and buried apart. One lies under a cairn on Vængr, an island shaped like a wing laid on the water.',
    steps: [
      { id: 'find', text: 'Find the wing-shaped island, far to the south', type: 'reach', key: 'vaengr' },
      { id: 'cairn', text: 'Open the cairn on Vængr', type: 'event', key: 'cairn', marker: { pos: [-60, 1260] } },
    ],
  },
});

const LOOK = {
  reeve: { female: true, build: 0.98, hair: 0x8a3a22, hairStyle: 'braids', tunic: 0x2f4a5c, trim: 0xc9a24a, cloak: 0x3a2e2a, sleeve: 0x2f4a5c },
  trader: { female: true, scale: 0.96, build: 0.94, hair: 0xd0c8b8, hairStyle: 'bun', tunic: 0x7a5a2e, apron: 0xbfae8a },
  skipper: { build: 1.12, hair: 0x2a2420, hairStyle: 'long', beard: 'long', tunic: 0x4a5a4a, trim: 0x2a2a2a, sleeve: 0x4a5a4a },
  guard: { build: 1.14, helmet: true, beard: 'short', hair: 0x6a4a2a, tunic: 0x5a2e28, trim: 0x8a8a90, legs: 0x2a2620, sleeve: 0x5a2e28 },
  pilot: { build: 0.96, hair: 0xa8a49c, hairStyle: 'bald', beard: 'short', tunic: 0x3a5a6a, trim: 0xc8c0a8, sleeve: 0x3a5a6a },
  shepherd: { scale: 0.96, hair: 0xb89a5a, beard: 'short', tunic: 0x8a7a5a, cloak: 0x6a5a40, sleeve: 0x8a7a5a },
  widow: { female: true, scale: 0.93, build: 0.9, hair: 0x6a6660, hairStyle: 'bun', tunic: 0x4a4a52, apron: 0x9a927e },
  hermit: { scale: 0.94, build: 0.88, hair: 0xd8d4cc, hairStyle: 'long', beard: 'long', tunic: 0x5a5448, cloak: 0x46423a, sleeve: 0x5a5448 },
  seer: { female: true, scale: 0.98, build: 0.9, hair: 0xe4e0d8, hairStyle: 'long', tunic: 0x2a2a34, trim: 0x8a8a90, cloak: 0x1e1e26, fur: true, sleeve: 0x2a2a34 },
};
const NAMED = ISLES.filter((s) => s.name);
const dist = (p, x, z) => Math.hypot(p.x - x, p.z - z);

export class SeaChart {
  constructor(game, open) { this.g = game; this.open = open; this.t = 0; this.ports = {}; this.camps = []; this.pending = null; }
  get st() { return this.g.state; }
  get seen() { return this.st.open.seen; }
  seenCount() { return NAMED.filter((s) => this.seen[s.id]).length; }

  /** A harbour: walk from an island's middle toward `ang` until the beach, moor the boat just past it. */
  port(id, name, cx, cz, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    let d = 0;
    while (d < 140 && heightAt(cx + c * d, cz + s * d) > 1.0) d += 1;
    const land = [cx + c * (d - 2.5), cz + s * (d - 2.5)];
    while (d < 160 && heightAt(cx + c * d, cz + s * d) > -0.7) d += 0.5;
    this.ports[id] = { id, name, land, moor: [cx + c * (d + 1.5), cz + s * (d + 1.5)], yaw: Math.atan2(-s, c), face: Math.atan2(-c, -s) };
  }

  build() {
    const g = this.g, o = this.open, fl = this.st.flags, w = g.world, y = (x, z) => heightAt(x, z);
    this.port('gulen', 'Gulen', POI.gulen.x, POI.gulen.z, 0.1);
    this.port('fedje', 'Fedje', 210, 600, -2.0);
    this.port('kinn', 'Kinn', -40, 760, -Math.PI / 2);

    // ---- people ------------------------------------------------------------------------
    o.npc('folk0').role = 'ferry'; o.npc('folk0').port = 'gulen';
    o.person('shepherd', 'Aslak', LOOK.shepherd, -244, 556, 1.2, { line: 'Selja feeds forty sheep and one fool. The fjord is behind you; everything else is in front.' });
    o.person('pilot', 'Kari Pilot', LOOK.pilot, 204.5, 591.5, -0.6, { role: 'ferry', port: 'fedje' });
    o.person('fedje1', 'Tosti', { hair: 0x7a5a3a, tunic: 0x6a6a5a, beard: 'short' }, 209.6, 594.6, -1.9, { loop: 'sit', line: 'Kinn is the big one, south and a little west. You will know it by the cleft hill.' });
    o.person('reeve', 'Ragnhild Reeve', LOOK.reeve, -41.6, 753.6, 2.5, { role: 'law' });
    o.person('trader', 'Thora', LOOK.trader, -35.2, 757.6, -2.6, { role: 'merchant' });
    o.person('skipper', 'Bard Skipper', LOOK.skipper, -47.5, 741.5, 0.3, { role: 'ferry', port: 'kinn' });
    o.person('kguard', 'Ulf', LOOK.guard, -31, 749.5, -1.2, { weapon: 'spear', loop: 'guard', hold: 'spear' });
    o.person('widow', 'Ragna', LOOK.widow, 348.5, 851.5, -2.2, { line: 'Hunt what you like on Værøy. The hares eat my kale and the deer eat what the hares leave.' });
    o.person('hermit', 'Old Thrand', LOOK.hermit, 464.8, 1134.2, 0.9, { role: 'hermit', loop: 'sit', law: false });
    o.person('seer', 'The Storm-Wife', LOOK.seer, 335.3, 1387.1, -2.3, { role: 'seer', law: false });

    // ---- animals -----------------------------------------------------------------------
    for (let i = 0; i < 5; i++) g.wildlife.spawn('sheep', -256 + Math.cos(i * 1.3) * 6, 566 + Math.sin(i * 1.3) * 6, { home: { x: -256, z: 566, r: 9 } });
    for (let i = 0; i < 5; i++) g.wildlife.spawn('hare', 330 + Math.cos(i * 1.4) * 14, 846 + Math.sin(i * 1.4) * 14, { home: { x: 330, z: 846, r: 22 } });
    g.wildlife.spawn('deer', 352, 876, { stag: true, home: { x: 352, z: 876, r: 18 } }); g.wildlife.spawn('deer', 357, 880, { home: { x: 352, z: 876, r: 18 } });

    // ---- fires -------------------------------------------------------------------------
    for (const [x, z, s] of [[-40, 752, 0.6], [207, 594, 0.5], [347, 853.5, 0.45], [469.5, 1133, 0.4], [334, 1386, 0.45]]) g.fx.addFire(x, y(x, z) + 0.15, z, s);
    this.falseFire = g.fx.addFire(-415, y(-415, 806) + 0.2, 806, 0.9, { on: !fl.cleared_batalden });
    this.hornFire = g.fx.addFire(-456, y(-456, 1296) + 0.15, 1296, 0.5, { on: !fl.cleared_horns });
    this.beaconFire = g.fx.addFire(-230, y(-230, 1040) + 1.3, 1040, 1.5, { on: !!fl.beaconLit });

    // ---- things to find ------------------------------------------------------------------
    const play = () => g.mode === 'play' && !o.mounts.on;
    w.addInteractable({ id: 'beacon', x: -230, z: 1040, r: 3.4, priority: 1, label: 'Light the beacon', enabled: () => play() && !fl.beaconLit, use: () => this.lightBeacon() });
    w.addInteractable({ id: 'cairn', x: -60, z: 1260, r: 2.8, priority: 1, label: 'Search the cairn', enabled: () => play() && !fl.brotherTaken && !this.busy, use: () => this.cairn() });
    w.addInteractable({ id: 'wreck', x: 121, z: 1022, r: 2.4, priority: 1, label: "Search the wreck's cargo", enabled: () => play() && !fl.hovdenLoot,
      use: () => { fl.hovdenLoot = true; g.player.h.play('pickup', 0.8); g.inventory.add('silver', 35); g.inventory.add('arrow', 10); g.ui.toast('Hacksilver sewn into a sailcloth roll, and a sheaf of arrows.'); } });
    w.addInteractable({ id: 'hoard', x: -459, z: 1298.5, r: 2.4, priority: 1, label: 'Open the hoard-chest', enabled: () => play() && fl.cleared_horns && !fl.hornsHoard,
      use: () => { fl.hornsHoard = true; g.player.h.play('pickup', 0.8); g.inventory.add('silver', 60); g.ui.toast("What two wolf's-heads took from men who could not ask for it back."); } });
    w.addInteractable({ id: 'laststone', x: -120, z: 1484, r: 3, priority: 1, label: 'Read the last stone', enabled: play,
      use: () => { g.ui.subtitle('Runes', '"Past here I named nothing. Ottar cut this, and turned back."', 5); g.after(5.2, () => g.ui.toast('The Edge lies beyond the chart. It is not built yet.')); } });

    this.camps = [
      { id: 'batalden', x: -415, z: 806, n: 3, name: 'Wrecker', key: 'wrecker', cry: 'A boat! One man. Take him, and take the boat.', loot: 0, fire: this.falseFire },
      { id: 'horns', x: -456, z: 1296, n: 2, name: "Wolf's-head", key: 'outlaw', cry: 'No law comes out this far. Only us.', loot: 0, fire: this.hornFire },
    ];
    g.events.on('dismounted', (type) => { if (type !== 'horse' && !g.combat.active && this.st.stage === 'open') g.after(0.3, () => g.autosave()); });
  }

  // ---- conversations ---------------------------------------------------------------------
  ferryTalk(n) {
    const g = this.g, inv = g.inventory, silver = inv.count('silver'), N = n.name;
    const dests = Object.keys(this.ports).filter((k) => k !== n.port && (k === 'gulen' || this.seen[k]));
    if (!dests.length) { n.say('I carry folk to harbours they have seen with their own eyes. Sail out past the mouth: Fedje is the first smoke, on the left hand.', 5); return; }
    this.pending = null;
    const hire = this.open.fleet.hireOffer(n), own = this.open.fleet.owned;
    this.open.say([
      { s: N, t: own ? 'Passage? Six silver, and I tow your rowing boat for nothing. Your karve stays where she lies; I am not that soft.' : 'Passage? Six silver, and I tow your boat for nothing, because I am soft.' },
      { s: 'Eirik', t: '', choices: [
        ...dests.map((k) => ({ t: `To ${this.ports[k].name} (6 silver, you carry ${silver})`, to: silver >= 6 ? 'go' : 'poor', fx: silver >= 6 ? { do: () => { this.pending = k; } } : null })),
        ...hire.choices,
        { t: '"Not today."', to: 'end' },
      ] },
      { id: 'go', s: N, t: 'Sit amidships and keep those birds off my catch.', to: 'end' },
      { id: 'poor', s: N, t: 'Six. Not five and a story.', to: 'end' },
      ...hire.nodes,
    ], n, () => { if (hire.after) hire.after(); if (this.pending) { const k = this.pending; this.pending = null; this.passage(k); } });
  }
  /** Paid passage: the game's first fast travel. The player's own boat is towed along. */
  passage(k) {
    const g = this.g, p = g.player, port = this.ports[k], b = this.open.mounts.boat;
    g.inventory.remove('silver', 6, true); p.frozen = true; this.busy = true;
    if (this.open.fleet.ashore) this.open.fleet.recall(true);
    g.ui.fade(true, 0.9).then(() => {
      b.pos.set(port.moor[0], -0.14, port.moor[1]); b.yaw = port.yaw; b.speed = 0; b.sailUp = false; b.model.rotation.y = b.yaw;
      p.teleport(port.land[0], port.land[1], port.face);
      g.sky.time = Math.min(16.4, g.sky.time + 0.5);
      return g.ui.card('Passage', `To ${port.name}`, 2.2);
    }).then(() => g.ui.fade(false, 0.9)).then(() => { p.frozen = false; this.busy = false; g.autosave(); });
  }
  /** Extra choices and lines the reeve of Kinn adds to the ordinary law-talk. */
  /** Everything the reeve can offer beyond the law itself: her own tasks, then whatever a ship makes possible. */
  reeveWork() {
    const w = this.reeveTasks(), f = this.open.fleet.reeveOffer();
    return { intro: w.intro, choices: [...(w.choice ? [w.choice] : []), ...f.choices], nodes: [...(w.nodes || []), ...f.nodes] };
  }
  reeveTasks() {
    const g = this.g, q = g.quests, fl = this.st.flags, o = this.open, R = 'Ragnhild Reeve';
    const pay = (silver, standing, why) => ({ do: () => { g.inventory.add('silver', silver); o.law.addStanding(standing, why); } });
    if (q.at('s_wreckers', 'back')) return { intro: 'The fire on Batalden is out. I watched it go from here. Thirty in silver, and the thanks of every keel that passes that point.' };
    const ask = '"What needs doing in the Skerries?"';
    if (!q.st.s_wreckers && fl.cleared_batalden && !fl.wreckersPaid) return { choice: { t: ask, to: 'work' }, nodes: [{ id: 'work', s: R, t: 'It was wreckers on Batalden. Was. A man with a white raven went ashore there, the boats say. That was owed before it was asked: thirty in silver.', to: 'end', fx: { do: () => { fl.wreckersPaid = true; pay(30, 25, 'The Skerries are safer').do(); } } }] };
    if (!q.st.s_wreckers && !fl.cleared_batalden) return { choice: { t: ask, to: 'work' }, nodes: [
      { id: 'work', s: R, t: 'Wreckers. Three of them on Batalden, the island to the west. They light a fire on the north point and ships steer for it thinking it is ours.' },
      { s: R, t: 'Put the fire out. Them too. I cannot spare Ulf, and the fishermen will not go.', to: 'end', fx: { quest: 's_wreckers' } }] };
    if (!q.st.s_beacon && !fl.beaconLit && !q.isActive('s_wreckers')) return { choice: { t: ask, to: 'work' }, nodes: [
      { id: 'work', s: R, t: 'The beacon on Skorpa, south-west, the tall one. Its keeper drowned at midwinter and nobody since has had the legs for the climb.' },
      { s: R, t: 'Light it, and every steersman from here to Utvær will ask who did. That is worth more to you than my silver.', to: 'end', fx: { quest: 's_beacon' } }] };
    return { choice: { t: ask, to: 'work' }, nodes: [{ id: 'work', s: R, t: q.isActive('s_wreckers') ? 'Batalden first. West of here. Then we will talk about beacons.' : 'Nothing I would ask of a guest. Chart the islands, {n}. A man who knows the water is worth ten who own it.', to: 'end' }] };
  }
  hermitTalk(n) {
    const g = this.g, fl = this.st.flags, T = n.name, omen = !!this.st.secrets.twinaxe;
    if (fl.brotherTaken) { this.open.say([{ s: T, t: 'You have the left one. I can smell old iron on you. Then the right is walking about in somebody\'s fist, and I would want to know whose.' }], n); return; }
    this.open.say([
      { s: T, t: 'Thrand. I count gannets. It is honest work: they do not lie about their number.' },
      { s: 'Eirik', t: '', choices: [
        { t: omen ? '"As a boy I found a stone. Two axes, a wing, a star."' : '"What lies further out than this?"', to: 'tale' },
        { t: '"Keep counting, old man."', to: 'end' },
      ] },
      { id: 'tale', s: T, t: omen ? 'Then you have seen more than most who came asking. The Brothers. Two axes from one bloom of iron, made for twins who would not share a hall.' : 'Rock, then water, then a story. The Brothers: two axes from one bloom of iron, made for twins who would not share a hall.' },
      { s: T, t: 'They were buried apart so that they could not find each other. One lies under a cairn on Vængr: low, and shaped like a wing laid on the water.' },
      { s: T, t: 'Sail for the star that does not move, then turn your back on it and keep going. Vængr is the last land but one.', to: 'end', fx: { do: () => { if (!g.quests.st.s_brothers) g.quests.start('s_brothers'); } } },
    ], n);
  }
  seerTalk(n) {
    const S = n.name;
    this.open.say([
      { s: S, t: this.st.flags.stormwife ? 'Back again, king that will be. The smoke has not changed its mind.' : 'I heard white wings before I saw the boat. Sit, king that will be. Or stand. The rock does not care, and neither do I.', fx: { flag: 'stormwife' } },
      { id: 'ask', s: 'Eirik', t: '', choices: [
        { t: '"I am no king."', to: 'king' },
        { t: '"Tell me what you see."', to: 'see' },
        { t: '"The man who killed my father. Where is he?"', to: 'father' },
        { t: 'Leave her to her rock.', to: 'end' },
      ] },
      { id: 'king', s: S, t: "No. You are a farmer's foster-son with a dead man's axe. But three high seats stand empty in my smoke, and you are walking toward all of them.", to: 'ask' },
      { id: 'see', s: S, t: '{w} on a carved post, in a hall that sings. {w} in an iron cage, in a hall where nobody dares to. {w} on the wind, and no hall at all. Which one, I cannot see. That part is yours.', to: 'ask' },
      { id: 'father', s: S, t: "The Ironwolf eats well, sleeps well, and has forgotten your father's name. That is the wound in it, is it not? Go and remind him. Not yet. You would only die tired.", to: 'ask' },
    ], n);
  }

  // ---- things that happen -------------------------------------------------------------------
  lightBeacon() {
    const g = this.g, fl = this.st.flags;
    fl.beaconLit = true; this.beaconFire.on = true; g.player.h.play('strike', 0.9);
    g.audio.play('ignite'); g.ui.questBanner('The Skerries', 'The Skorpa beacon burns');
    this.open.law.addStanding(20, 'Every boat can see who lit it'); g.quests.notify('event', 'beacon');
  }
  cairn() {
    const g = this.g, q = g.quests, fl = this.st.flags, omen = !!this.st.secrets.twinaxe;
    if (!q.at('s_brothers', 'cairn')) { g.ui.toast('A cairn of sea-stones, older than any path to it. Nothing tells you to disturb it.'); return; }
    this.busy = true; g.player.frozen = true; g.player.h.play('pickup', 1.2); g.audio.play('thud');
    g.ui.subtitle('Eirik', omen ? 'The wing, and the star over it. Just as the stone showed me, ten winters ago.' : "Thrand's wing on the water. And his cairn.", 4);
    g.after(4.2, () => { g.inventory.add('brother_axe', 1); fl.brotherTaken = true; g.audio.play('steel'); g.ui.questBanner('Secret weapon', 'The Left Brother'); g.player.h.play('pickup', 1.0); });
    g.after(7.4, () => g.ui.subtitle('Eirik', 'One axe. The bed beside it is empty, and the moss on the lip is torn. Someone lifted the other. Not long ago.', 5.5));
    g.after(13.2, () => { g.player.frozen = false; this.busy = false; if (g.player.equipped === 'father_axe') { g.player.equip('none'); g.player.equip('father_axe'); } q.notify('event', 'cairn'); g.ui.hint('Draw the axe with {weapon1}: the Left Brother rides in the off hand and every blow lands harder.'); });
  }
  discover(s, by) {
    const g = this.g;
    this.seen[s.id] = true; this.st.xp += 15;
    g.ui.questBanner(by === 'raven' ? `${g.ravens.names()[0]} sights land` : 'Island found', s.name); g.audio.play('chime');
    g.quests.notify('event', 'isle');
    if (s.id === 'vaengr') {
      if (!g.quests.st.s_brothers && this.st.secrets.twinaxe) { g.after(2.5, () => { g.ui.subtitle('Eirik', "A wing laid on the water. The stone. Father's stone had this cut into it.", 5); g.quests.start('s_brothers'); }); }
      else g.after(0.5, () => g.quests.notify('reach', 'vaengr'));
    }
  }
  crossLaw(id) {
    const g = this.g, law = this.open.law, old = law.s;
    law.id = id;
    const nw = law.s, first = !this.st.flags['crossed_' + id];
    this.st.flags['crossed_' + id] = true;
    g.ui.questBanner(first && id === 'skerries' ? 'New waters' : 'Law-district', law.district); g.audio.play('horn', { freq: 147, vol: 0.25 });
    if (old.marks >= 3 && nw.marks < 1) { nw.marks = 1; nw.cool = 0; g.ui.toast('Word of you crossed the water first. One wolf-mark here already.'); }
    else if (old.marks > 0 && nw.marks === 0) g.ui.toast(`Your wolf-marks stay behind. In ${law.def.local} you are a ${law.tier().name.toLowerCase()}.`);
    else if (first && id === 'skerries') g.ui.toast('Another law holds here. Nobody in the Skerries knows your name.');
  }

  /** Rewards that must not depend on which conversation finished the quest. */
  questDone(id) {
    const g = this.g, law = this.open.law;
    if (id === 's_wreckers') { g.inventory.add('silver', 30); law.addStanding(25, 'The Skerries are safer'); }
    if (id === 'q_sea') { law.addStanding(10, 'You know these waters'); g.ui.toast('Every island on the chart has a name now. The rest of the Whale Road is not built yet.'); }
  }

  steps = {
    'q_sea.sail'() { this.open.build(); },
    'q_sea.kinn'(r) { this.open.build(); if (!r) this.g.ui.hint('Open water. Kinn is the large island due south, with the cleft hill. {raven} lets the white raven look ahead; {map} shows the chart.'); },
    'q_sea.reeve'() { this.open.build(); },
    'q_sea.chart'(r) {
      this.open.build();
      const q = this.g.state.quests.q_sea; q.count = this.seenCount(); this.g.ui.refreshTracker();
      if (!r) this.g.ui.hint('The Skerries are open. Passage between harbours costs six silver; the far islands you must find under your own sail.');
      this.g.after(0.2, () => this.g.quests.notify('event', 'isle', 0));
    },
    's_wreckers.go'() { this.open.build(); },
    's_wreckers.kill'(r) { this.open.build(); if (r) this.g.state.quests.s_wreckers.count = 0; },
    's_wreckers.back'() { this.open.build(); },
    's_beacon.light'() { this.open.build(); if (this.st.flags.beaconLit) this.g.after(0.2, () => this.g.quests.notify('event', 'beacon')); },
    's_brothers.find'() { this.open.build(); if (this.seen.vaengr) this.g.after(0.3, () => this.g.quests.notify('reach', 'vaengr')); },
    's_brothers.cairn'(r) { this.open.build(); if (!r) this.g.ui.hint('The cairn stands in the middle of Vængr, the western lobe of the wing.'); },
  };

  update(dt) {
    const g = this.g, p = g.player, q = g.quests, o = this.open, fl = this.st.flags, afloat = o.mounts.on && o.mounts.on.type !== 'horse';
    this.t += dt;
    g.sky.farSight = Math.min(1, Math.max(0, (p.pos.z - 200) / 200));
    const id = p.pos.z > DISTRICT_LINE ? 'skerries' : 'vestland';
    if (id !== o.law.id) this.crossLaw(id);

    if (q.at('q_sea', 'sail') && afloat && p.pos.z > 440) q.notify('reach', 'sea');
    if (q.at('q_sea', 'kinn') && !o.mounts.on && dist(p.pos, -40, 760) < 130 && p.pos.y > 0.2) q.notify('reach', 'kinn');
    if (q.at('s_wreckers', 'go') && dist(p.pos, -420, 800) < 100) q.notify('reach', 'batalden');

    if (this.t % 0.5 < dt) { // what he, or the white raven, can see
      const eye = g.ravens.eye ? g.ravens.white.position : null;
      for (const s of NAMED) {
        if (this.seen[s.id]) continue;
        if (dist(p.pos, s.x, s.z) < s.r + 35) this.discover(s, 'self');
        else if (eye && dist(eye, s.x, s.z) < s.r + 70) this.discover(s, 'raven');
      }
    }
    for (const c of this.camps) { // men who fight whoever lands
      if (fl['cleared_' + c.id] || (c.when && !c.when())) continue;
      if (!c.men) {
        if (g.mode !== 'play' || o.mounts.on || dist(p.pos, c.x, c.z) > 40) continue;
        c.men = []; c.counted = 0;
        for (let i = 0; i < c.n; i++) {
          const w = c.who && c.who(i), r = 3.2 + ((i / 3) | 0) * 2.3; // a named man, if the camp has one; a second ring for a big camp
          c.men.push(o.fighter(c.id + i, w ? w.name : c.name, RAIDER_LOOKS[(i + 1) % 4], c.x + Math.cos(i * 2.1 + 0.4) * r, c.z + Math.sin(i * 2.1 + 0.4) * r, ['axe', 'spear', 'sword'][i % 3], w ? w.opts : { hp: 100 }));
        }
        g.ui.subtitle(c.name, c.cry, 4); g.audio.play('shout'); g.audio.setMusic('raid');
        continue;
      }
      const dead = c.men.filter((e) => e.dead).length;
      if (dead > c.counted) { q.notify('event', c.key, dead - c.counted); c.counted = dead; }
      if (dead === c.n) {
        c.men = null; fl['cleared_' + c.id] = true; c.fire.on = false;
        if (!g.combat.alive().length) { g.combat.clear(); g.audio.setMusic('day'); }
        g.ui.toast(c.id === 'batalden' ? 'The false fire is out.' : 'The skerry is quiet. Their chest is by the fire.');
      }
    }
  }
}
