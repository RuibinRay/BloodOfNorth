// The Seven (open-world PROTOTYPE): seven elite warriors, each with a weapon, a way of fighting and a temper
// of their own, met one at a time on the hazel-ringed ground behind the law-rock on Gulen.
// NAMES, PLACE AND REASON ARE PLACEHOLDERS until the story says who the seven are; what is real here is how
// each one fights. The move engine is in systems/combat.js (moves, strings, phases).
import { POI } from '../world/layout.js';
import { QUESTS } from '../data/act1.js';

Object.assign(QUESTS, {
  s_seven: {
    title: 'The Seven', kind: 'side', xp: 300,
    desc: "The Ironwolf keeps seven champions who answer any challenge on the hazel-ringed ground at Gulen. Each fights in a way of their own. A red flash is a blow that cannot be blocked.",
    steps: [{ id: 'fight', text: 'Call out the Seven at the law-rock, one at a time', type: 'event', key: 'seven', count: 7, marker: { npc: 'law' } }],
  },
});

// moves: id, anim, dur (seconds), hitAt (fraction), dmg; reach / arc when not the usual; unblockable; aoe (a ring); lunge (speed while striking);
// then (the next blow of a string), chain (chance to go on), rest (seconds before he acts again), min (only from this far off)
const M = {
  cut: { id: 'cut', anim: 'atk1', dur: 0.95, hitAt: 0.4, dmg: 15 },
  back: { id: 'back', anim: 'atk2', dur: 0.75, hitAt: 0.4, dmg: 13 },
  over: { id: 'over', anim: 'atk3', dur: 1.2, hitAt: 0.42, dmg: 24, unblockable: true, rest: 1.0 },
  jab: { id: 'jab', anim: 'thrust', dur: 0.8, hitAt: 0.4, dmg: 14, reach: 3.3, arc: 0.5 },
  jab2: { id: 'jab2', anim: 'thrust', dur: 0.7, hitAt: 0.4, dmg: 14, reach: 3.3, arc: 0.5 },
  sweep: { id: 'sweep', anim: 'atk2', dur: 1.35, hitAt: 0.45, dmg: 20, reach: 3.3, arc: 2.3, unblockable: true, rest: 1.1 },
  slam: { id: 'slam', anim: 'slam', dur: 1.55, hitAt: 0.5, dmg: 30, aoe: 2.8, rest: 1.3 },
  pound: { id: 'pound', anim: 'slam', dur: 1.15, hitAt: 0.5, dmg: 24, aoe: 2.6, lunge: 3.2 },
  leap: { id: 'leap', anim: 'atk3', dur: 1.05, hitAt: 0.45, dmg: 22, unblockable: true, lunge: 7, min: 3.2, rest: 0.9 },
};
const str = (...ids) => ids.map((id, i) => ({ ...M[id.split(':')[0]], id: 'm' + i, then: i < ids.length - 1 ? 'm' + (i + 1) : null, chain: 0.9 })); // a string of blows

export const SEVEN = [
  { id: 'still', name: 'Sigrid the Still', says: 'I do not swing first. Come and learn why.', won: 'She nods once, and lays the sword down.', weapon: 'sword', off: 'shield', gift: null,
    look: { female: true, build: 1.0, hair: 0xd9d2c2, hairStyle: 'braid', tunic: 0x3a4652, trim: 0xc9c2b0, cloak: 0x2a2e36, sleeve: 0x3a4652, eyes: 0x8e979c, face: 'lean', scar2: 'brow' },
    cb: { hp: 260, dmg: 15, skill: 0.92, counter: true, dodge: 0.2, moves: [...str('cut', 'back'), M.jab], rageLine: null,
      phases: [{ at: 0.5, line: 'Enough of walls.', set: { skill: 0.45, dodge: 0.55, counter: false, moves: [...str('cut', 'back', 'cut'), M.over] } }] } },
  { id: 'twoaxes', name: 'Bolli Two-Axes', says: 'Two axes. One of you. I like the count.', won: 'Bolli laughs with a mouth full of blood, and stays down.', weapon: 'axe', off: 'smallaxe', gift: ['twin', 'Twin seaxes, from the champions\' rack'],
    look: { build: 1.2, hairStyle: 'topknot', hair: 0x9a4420, beard: 'braided', tunic: 0x5a2a22, trim: 0x1e1e1e, legs: 0x2a2420, sleeve: null, skin: 0xd09a78, eyes: 0x6f8f5a, face: 'broad', scar2: 'cheek' },
    cb: { hp: 240, dmg: 14, skill: 0, kind: 'berserk', dodge: 0.1, moves: [...str('cut', 'back', 'cut')],
      phases: [{ at: 0.5, line: 'Now I am awake!', set: { rage: true, moves: [...str('cut', 'back', 'cut', 'back'), M.leap] } }] } },
  { id: 'reach', name: 'Thorkel Long-Reach', says: 'Eight feet of ash says you never touch me.', won: 'The spear is in two pieces. Thorkel looks at them a long time.', weapon: 'spear', off: null, gift: null,
    look: { build: 0.98, scale: 1.06, hairStyle: 'tail', hair: 0x2c241e, beard: 'stubble', tunic: 0x4a5a4a, trim: 0x8a7a4a, sleeve: 0x4a5a4a, eyes: 0x5a4632, face: 'long' },
    cb: { hp: 250, dmg: 14, skill: 0.5, reach: 3.3, dodge: 0.45, moves: [...str('jab', 'jab2'), M.jab, M.sweep],
      phases: [{ at: 0.45, line: 'Closer, then. If you can.', set: { dodge: 0.65, moves: [...str('jab', 'jab2', 'jab'), M.sweep, M.sweep] } }] } },
  { id: 'anvil', name: 'Grettir the Anvil', says: 'Hit me. Go on. Everyone gets one.', won: 'The Anvil sits down, slowly, like a wall deciding to.', weapon: 'maul', off: null, gift: ['maul', "Grettir's war maul"],
    look: { build: 1.32, scale: 1.1, hairStyle: 'bald', beard: 'long', hair: 0x5c4028, tunic: 0x3a3a40, trim: 0x70747a, legs: 0x26221e, sleeve: 0x3a3a40, fur: true, eyes: 0x5a4632, face: 'broad', skin: 0xc8946e },
    cb: { hp: 380, dmg: 26, skill: 0.3, armor: 0.5, reach: 2.6, dodge: 0, moves: [M.slam, M.over, M.slam],
      phases: [{ at: 0.5, line: 'My turn. My turn. My turn.', set: { moves: [...['pound', 'pound', 'slam'].map((id, i, a) => ({ ...M[id], id: 'p' + i, then: i < a.length - 1 ? 'p' + (i + 1) : null, chain: 1 })), M.over] } }] } },
  { id: 'gulleye', name: 'Yrsa Gull-Eye', says: 'You will not get near enough to be rude.', won: 'Her last arrow is in the turf at her feet. She opens her hands.', weapon: 'smallaxe', off: 'bow', gift: null,
    look: { female: true, build: 0.92, scale: 0.97, hairStyle: 'braids', hair: 0x8a5a2e, tunic: 0x5a6a4a, trim: 0x2a2a2a, cloak: 0x3a4a3a, sleeve: 0x5a6a4a, eyes: 0xb07a2e, face: 'lean' },
    cb: { hp: 190, dmg: 13, skill: 0.25, kind: 'archer', keepAway: true, aimEvery: 2.0, dodge: 0.5,
      phases: [{ at: 0.5, line: 'Faster, then.', set: { aimEvery: 1.35, dmg: 15 } }] } },
  { id: 'hound', name: 'Kolbein Hound-Master', says: 'I never fight alone. Why would I?', won: 'Kolbein whistles for men who are not coming.', weapon: 'axe', off: 'shield', gift: null,
    look: { build: 1.12, hairStyle: 'long', hair: 0x9a968e, beard: 'short', tunic: 0x4a3a2a, trim: 0x6a1a14, cloak: 0x2a2620, sleeve: 0x4a3a2a, helmet: true, eyes: 0x8e979c, face: 'even', scar2: 'lip' },
    cb: { hp: 270, dmg: 16, skill: 0.6, kind: 'shield', dodge: 0.15, moves: [...str('cut', 'back'), M.over],
      phases: [{ at: 0.6, line: 'To me! Shields!', summon: 2, set: {} }] } },
  { id: 'blade', name: "Hrafnkel the Jarl's Blade", says: "Six of us you have put down. The jarl said to let you. He wanted to know what you were.", won: 'Hrafnkel kneels. "Tell him yourself, then," he says. "He will ask."', weapon: 'longaxe', off: null, gift: null,
    look: { build: 1.18, scale: 1.05, hairStyle: 'long', hair: 0x2c241e, beard: 'braided', tunic: 0x2e2e34, trim: 0xc9a24a, legs: 0x24221f, cloak: 0x5a2a24, sleeve: 0x2e2e34, fur: true, eyes: 0x86aec6, face: 'long', scar2: 'cheek' },
    cb: { hp: 420, dmg: 19, skill: 0.72, reach: 2.6, dodge: 0.35, counter: true, moves: [...str('cut', 'back'), M.over, M.sweep],
      phases: [{ at: 0.66, line: 'Good. Again.', set: { moves: [...str('cut', 'back', 'cut'), M.over, M.sweep, M.leap], dodge: 0.45 } },
        { at: 0.33, line: 'Now show me the thing with the lightning.', set: { rage: true, counter: false, moves: [...str('cut', 'back', 'cut'), M.leap, M.sweep, M.slam] } }] } },
];

export class Seven {
  constructor(game, open) { this.g = game; this.open = open; this.now = null; }
  get st() { return this.g.state; }
  get done() { return this.st.flags.seven || 0; }

  /** What the lawspeaker on Gulen has to say about them. */
  offer() {
    const g = this.g, q = g.quests, L = 'Thorgeir Lawspeaker', n = this.done, next = SEVEN[n];
    if (this.now) return { choices: [], nodes: [] };
    if (!q.st.s_seven) return { choices: [{ t: '"Who are the Ironwolf\'s Seven?"', to: 'seven' }], nodes: [
      { id: 'seven', s: L, t: "His champions. They keep the hazel-ringed ground behind this rock by old right, and they answer any challenge on it, one man at a time. It is how the Ironwolf shows the Vestland what he has." },
      { s: L, t: 'No law is broken there and no wolf-mark earned. Each of them fights in a way of their own. Call them out when you are ready, {n}. I will witness.', to: 'end', fx: { quest: 's_seven' } }] };
    if (!next) return { choices: [], nodes: [] };
    return { choices: [{ t: `Call out ${next.name} (${n + 1} of 7)`, to: 'call', fx: { do: () => { this.calling = next; } } }], nodes: [{ id: 'call', s: L, t: `${next.name}! You are called to the ring. I witness it.`, to: 'end' }],
      after: () => { if (this.calling) { const e = this.calling; this.calling = null; this.call(e); } } };
  }
  call(def) {
    const g = this.g, o = this.open, x = POI.lawRock.x + 9, z = POI.lawRock.z + 6;
    for (const n of g.npcs.values()) if (n.id.startsWith('seven_') && n.dead) n.visible = false; // the last one has been carried off
    const e = o.fighter('seven_' + def.id, def.name, def.look, x, z, def.weapon, { boss: true, smart: true, ...structuredClone(def.cb), onDown: (en) => this.fell(def, en) });
    e.h.hold('R', def.weapon); e.h.hold('L', def.off);
    for (const ph of e.cb.phases || []) if (ph.summon) ph.do = (en) => { for (let i = 0; i < ph.summon; i++) o.fighter('seven_guard' + i, 'Shield-bearer', { build: 1.15, helmet: true, beard: 'short', hair: 0x4a3a2a, tunic: 0x3a2e2a, trim: 0x6a1a14, sleeve: 0x3a2e2a }, en.pos.x + (i ? 2.2 : -2.2), en.pos.z - 1.5, 'axe', { hp: 110, skill: 0.6, kind: 'shield', smart: true }); };
    this.now = { def, e };
    g.audio.setMusic('raid'); g.audio.play('horn', { freq: 110, vol: 0.5 });
    g.after(0.6, () => e.say(def.says, 5));
  }
  fell(def, e) {
    const g = this.g, fl = this.st.flags;
    e.die(); this.now = null; fl.seven = this.done + 1;
    for (const x of [...g.combat.alive()]) g.combat.kill(x); // anyone he called goes with him
    g.combat.clear(); g.audio.setMusic('day');
    g.ui.questBanner(`The Seven · ${fl.seven} of 7`, def.name); g.ui.subtitle('', def.won, 5);
    g.inventory.add('silver', 25);
    if (def.gift && !g.inventory.has(def.gift[0])) { g.inventory.add(def.gift[0], 1); g.ui.toast(`${def.gift[1]} is yours.`); }
    g.quests.notify('event', 'seven');
  }
  steps = { 's_seven.fight'() { this.open.build(); const q = this.st.quests.s_seven; q.count = this.done; this.g.ui.refreshTracker(); } };
  questDone(id) { if (id === 's_seven') { this.open.law.addStanding(25, 'The Seven are beaten'); this.g.ui.toast('What the Ironwolf does when he hears is not built yet.'); } }
}
