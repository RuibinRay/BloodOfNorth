// The six companions of the owner's story as fighters at Eirik's side (docs/story; see STORY_BIBLE "The six
// companions"). Who they are and what they carry is the story's; how they fight, their one skill each, and the
// numbers are the game's. Lines a companion says in a fight are the game's and marked (game) here.
// Import this module only after the story (story/act1.js) has loaded: act2.js reads casts that Act I's chapters add.
import { CAST2 } from './act2.js';
import { CAST3 } from './act3.js';
import { CAST5 } from './act5.js';

/**
 * hp: how much harm before they go down (they are never killed: down until the fight ends, or until someone gets them up).
 * guard: the share of blows aimed at them that they turn. dmg / posture: one blow's harm and how hard it wears a guard.
 * rate: [seconds between blows, + up to this much]. double: each blow lands twice (two blades). anims: the strokes they use.
 * ranged / healer: they do not close with the enemy. skill: { name, cd seconds, desc }.
 */
export const COMPANIONS = {
  leif: { name: 'Leif', look: CAST2.leif.look, hold: ['seax', 'sword'], hp: 100, guard: 0.62, dmg: 5, posture: 6, rate: [0.6, 0.6], double: true, anims: ['atk1', 'twinL', 'atk2'],
    who: "Captain of the Sea-Raven. The Twins: a long seax, and the sword Ingrid gave him at their wedding.", style: 'Two blades, fast, and never where you expect him.',
    skill: { id: 'trick', name: "Dock-rat's Trick", cd: 12, desc: 'A boot to the knee and an elbow to the jaw: the man in front of him loses his feet and his guard. Strike while he is down.' },
    bark: 'Now, Eirik!' }, // (game)
  astrid: { name: 'Astrid', look: CAST3.astrid.look, hold: [null, 'bow'], hp: 80, guard: 0.3, ranged: true, dmg: 11, posture: 12, rate: [2.2, 0.8],
    who: 'Archer and hunter. Storm-Yew, cut from the young yew that grew through the lightning-split birch.', style: 'She stays back and shoots whoever is coming for you.',
    skill: { id: 'yew', name: 'Storm-Yew', cd: 15, desc: 'A full draw that hums like wind in rigging. It goes through a guard and staggers the man it hits.' },
    bark: 'Down!' }, // (game)
  torvald: { name: 'Torvald', look: CAST3.torvald.look, hold: ['maul', 'shield'], hp: 140, guard: 0.7, dmg: 13, posture: 22, rate: [1.5, 1.1], anims: ['chop', 'atk3', 'slam'],
    who: 'Veteran of King Halfdan\'s guard, who knew Ragnar. A war hammer and a shield.', style: 'Slow, heavy, and between you and whoever is pressing you.',
    skill: { id: 'hold', name: 'Hold the Line', cd: 18, desc: 'He calls the men pressing Eirik onto his own shield, and takes half their blows for a while.' },
    bark: 'Hold. HOLD!' }, // (game: his line on the Iron Shore)
  svanhild: { name: 'Svanhild', look: CAST5.svanhild.look, hold: ['sword', 'shield'], hp: 110, guard: 0.8, dmg: 10, posture: 9, rate: [0.9, 0.8], anims: ['atk1', 'thrust', 'atk2'],
    who: "Captain of Jarl Jorund's household guard, and the finest sword in the North. Still seasick.", style: 'Every cut perfect, every step placed. Very little gets past her guard.',
    skill: { id: 'cut', name: 'The Finest Sword', cd: 10, desc: 'When a man\'s guard breaks anywhere near her, she is there first, and once is enough.' },
    bark: '' },
  brokk: { name: 'Brokk', look: CAST3.brokk.look, hold: ['hammer', null], hp: 110, guard: 0.45, dmg: 11, posture: 30, rate: [1.6, 1.1], anims: ['chop', 'atk3'],
    who: 'The smith. Forty years at the anvil, and a left hand that was crushed. His forging hammer.', style: 'One-handed and slow, but every blow lands like a hammer on hot iron.',
    skill: { id: 'sunder', name: 'Sunder', cd: 14, desc: 'Forty years at the anvil in one blow: a shield splits, and the guard behind it.' },
    bark: 'Metal remembers.' }, // (game: from "metal remembers every blow")
  ingrid: { name: 'Ingrid', look: CAST3.ingrid.look, hold: [null, null], hp: 80, guard: 0.25, healer: true,
    who: "Princess of Jarnøy, King Hroald's daughter, and a healer.", style: 'She does not fight. She keeps Eirik standing, and gets the fallen back on their feet.',
    skill: { id: 'mend', name: 'Clean Water and a Bandage', cd: 22, desc: 'When Eirik is badly hurt she is at his side with her kit. Between times she gets fallen companions up.' },
    bark: 'Hold still.' }, // (game)
};
export const PARTY_MAX = 2;

/** Who the story has brought to Eirik's side by now, and who it has taken away (state = the save). */
export function available(id, st) {
  const q = st.quests, done = (k) => q[k] && q[k].status === 'done', began = (k) => !!q[k];
  switch (id) {
    case 'leif': return done('q_captain');
    case 'astrid': return done('q_fifty');
    case 'brokk': return done('q_fifty') && !began('q_anvil'); // he dies in the doorway on Skalløy
    case 'torvald': return done('q_fifty') && (!began('q_sound') || done('q_judge')); // taken at Hedeby Sound; at Eirik's side again once he has sworn on the ring
    case 'ingrid': return done('q_price');
    case 'svanhild': return done('q_wing');
    default: return false;
  }
}
/** Why someone is not there, for the Companions page. */
export function absent(id, st) {
  const q = st.quests, began = (k) => !!q[k], done = (k) => q[k] && q[k].status === 'done';
  if (id === 'brokk' && began('q_anvil')) return 'Brokk died in the doorway on Skalløy.';
  if (id === 'torvald' && began('q_sound') && !done('q_judge')) return 'Torvald is a prisoner until he swears on the ring.';
  return 'Not met yet in the story.';
}
/** How each is found in the open world: by the farm, unless the islands already hold them. */
export const HOME = { leif: [161.5, -129.5, -2.4], astrid: [148.4, -128.6, 2.0], torvald: [154.2, -124.6, 3.0], brokk: [163.6, -136.4, -1.8], ingrid: [150.2, -131.2, 2.4], svanhild: [158.2, -125.4, 2.6] };
/** How they greet Eirik when he comes to talk (game). */
export const GREET = {
  leif: 'Eirik. If you are going somewhere stupid, I am coming.',
  astrid: 'The wind is from the north. Good for arrows.',
  torvald: 'Ragnar\'s son. What do you need?',
  svanhild: 'On land, I am at your service. At sea, ask me tomorrow.',
  brokk: 'Let me see the axe. Hm. Still in one piece.',
  ingrid: 'Show me your hands. And your ribs. Then tell me where we are going.',
};
/** What they say when asked along, sent away, or asked what they can do (game). */
export const ASK = {
  leif: ['Somebody has to keep you alive.', 'I will be at the ship. Try not to drown.'],
  astrid: ['I know where they must pass.', 'I will be here.'],
  torvald: ['As long as I can lift it.', 'I will wait.'],
  svanhild: ['On foot, gladly. Not on a boat.', 'Discipline, footwork, patience. I will be here.'],
  brokk: ['Somebody has to fix your axe after.', 'The forge will not mind me back.'],
  ingrid: ['Hands. In clean water. Then we go.', 'Come back in one piece.'],
};
