// The Wolf's Table: Jarl Håkon's seven champions, his two hands, and the Ironwolf himself, as the owner's story
// names them (docs/story/THE_RISE_OF_THE_RAVEN_KING.md), each fought where the story has him fall, with the
// weapon the story gives him and skills of his own. Who they are, what they carry, where they fall and what they
// say are CANON. The skills' names and numbers are the game's.
// WHAT THIS IS NOT YET: the chapters round these fights (the Battle of Iron Shore, the treasure voyage, the marsh
// hunt, the burning forge, the landing on the Black Shore...) are not built. Here the ten wait in their places and
// are fought in the story's order: the fights without the missions. The skill engine is in systems/combat.js.
import { place, GREAT } from '../world/layout.js';
import { QUESTS } from '../data/act1.js';
import { REFORGE } from '../data/weapons.js';

// moves: id, anim, dur (seconds), hitAt (fraction), dmg; then everything listed at the top of systems/combat.js
const M = {
  cut: { id: 'cut', anim: 'atk1', dur: 0.95, hitAt: 0.4, dmg: 15 },
  back: { id: 'back', anim: 'atk2', dur: 0.75, hitAt: 0.4, dmg: 13 },
  over: { id: 'over', anim: 'atk3', dur: 1.2, hitAt: 0.42, dmg: 24, unblockable: true, rest: 1.0 },
  jab: { id: 'jab', anim: 'thrust', dur: 0.8, hitAt: 0.4, dmg: 14, reach: 3.3, arc: 0.5 },
  sweep: { id: 'sweep', anim: 'atk2', dur: 1.35, hitAt: 0.45, dmg: 20, reach: 3.3, arc: 2.3, unblockable: true, rest: 1.1 },
  slam: { id: 'slam', anim: 'slam', dur: 1.55, hitAt: 0.5, dmg: 30, aoe: 2.8, rest: 1.3 },
  pound: { id: 'pound', anim: 'slam', dur: 1.15, hitAt: 0.5, dmg: 24, aoe: 2.6, lunge: 3.2 },
  leap: { id: 'leap', anim: 'atk3', dur: 1.05, hitAt: 0.45, dmg: 22, unblockable: true, lunge: 7, min: 3.2, rest: 0.9 },
};
const mv = (base, id, o = {}) => ({ ...M[base], id, ...o });
/** A string of blows: each leads to the next. */
const str = (tag, list, chain = 0.9) => list.map((m, i) => ({ ...m, id: tag + i, then: i < list.length - 1 ? tag + (i + 1) : null, chain }));

const at = (isle, name, dx = 0, dz = 0) => { const p = place(isle, name, dx, dz); return [p.x, p.z]; };
const WOLF = 0x16161a;

/** The ten, in the order they fall. `spot` is where the fight is; `skills` is what the player is told of each. */
export const FOES = [
  { id: 'arne', n: 1, name: 'Arne Longshot', title: 'first of the seven', act: 'III', where: 'the watchtower, Jarnøy', spot: at('jarnoy', 'tower'), near: 0,
    task: 'Jarnøy: climb the watchtower to Arne Longshot', says: 'The wolf said you could see what birds see.', won: '"Then he should have told you I could see you." The archer goes back through the window.',
    hold: ['seax', 'bow_big'], trophy: null,
    look: { build: 0.95, hairStyle: 'tail', hair: 0x2c241e, beard: 'stubble', tunic: 0x3e4a3a, trim: 0x1c1c1c, legs: 0x2a2620, cloak: 0x2e3a2e, sleeve: 0x3e4a3a, eyes: 0x8e979c, face: 'lean' },
    skills: [['Black-Feather Volley', 'Every third draw is three arrows, one after another.'], ['Pinning Shot', 'An aimed arrow that slows whoever it hits.'], ['Cornered Cat', 'Up close: seax cuts, then away with a pair of thrown knives.']],
    cb: { hp: 220, dmg: 14, skill: 0.3, kind: 'archer', keepAway: true, keepDry: true, aimEvery: 1.7, dodge: 0.5,
      volley: { every: 3, n: 3, name: 'Black-Feather Volley', dmg: 12 }, pin: { every: 4, n: 1, name: 'Pinning Shot', dmg: 18, fx: { slow: 2.6 } },
      moves: [...str('cat', [mv('back', 'a', { name: 'Cornered Cat', dur: 0.6 }), mv('cut', 'b', { dur: 0.6 }), mv('back', 'c', { dur: 0.6 })]), mv('cut', 'knives', { name: 'Throwing Knives', dur: 0.7, dash: 'back', shots: { n: 2, kind: 'knife', gap: 0.16, dmg: 9 } })],
      phases: [{ at: 0.5, line: 'You came through the fire for this?', set: { aimEvery: 1.15 } }] } },
  { id: 'rurik', n: 2, name: 'Rurik Shieldsplitter', title: 'second of the seven', act: 'IV', where: 'his longship, off Solvik', spot: at('solvik', 'ship'), near: 15,
    task: "Solvik: board Rurik Shieldsplitter's ship at the jetty", says: 'Your father once carried that weapon.', won: '"Good. You fight for something more than revenge." He sits down against the mast. "Ask the grey-cloak where he was the night before the first snow."',
    hold: ['sword', 'halfshield'], trophy: ['sword', "Rurik's sword"],
    look: { mail: true, build: 1.1, scale: 1.04, hairStyle: 'short', hair: 0x8a7a5a, beard: 'short', tunic: 0x2e3a4e, trim: 0xd8d2c2, legs: 0x26262a, cloak: 0xd0cabc, sleeve: 0x2e3a4e, helmet: true, eyes: 0x86aec6, face: 'long' },
    skills: [['Shield-Split', 'An overhead that splits a shield that catches it and empties the guard.'], ['The Even Hand', 'He turns a blow on his own shield and answers at once.'], ['His rule', 'He will not strike a man who is down, disarmed or out of breath. He waits.']],
    cb: { hp: 300, dmg: 16, skill: 0.8, kind: 'shield', counter: true, honor: true, honorLine: 'Stand up. I will wait.', keepDry: true, dodge: 0.15,
      moves: [...str('ev', [mv('cut', 'a', { name: 'The Even Hand' }), mv('back', 'b')]), mv('jab', 'thrust'), mv('over', 'split', { name: 'Shield-Split', unblockable: false, dmg: 26, smash: 7, guardDrain: 40 })],
      phases: [{ at: 0.5, line: 'I know there are orders a warrior should refuse.', set: { dodge: 0.3, skill: 0.65 } }] } },
  { id: 'skarde', n: 3, name: 'Skarde Bear-Maw', title: 'third of the seven', act: 'V', where: 'the holmgang ground, Vængr', spot: [-92, 1286], near: 26,
    task: 'Vængr: step into the hazel square with Skarde Bear-Maw', says: 'RRRAAAGH! Which of you is the farmer?', won: 'One huge, desperate overhead. Eirik steps inside it, and the axe goes up under the bear-skull helm.',
    hold: ['daneaxe', null], trophy: ['longaxe', "Skarde's Dane axe"],
    look: { build: 1.36, scale: 1.14, hairStyle: 'long', hair: 0x8a3a1c, beard: 'long', tunic: 0x4a3626, trim: 0x1e1e1e, legs: 0x2a2420, sleeve: null, fur: true, skull: true, skin: 0xcf9a78, eyes: 0x6f8f5a, face: 'broad', scar2: 'cheek' },
    skills: [['The Lie', 'He says he was at the farm in the snow. Words: they make Eirik too angry for the Stormguard, unless his guard is up.'], ["Bear's Maw", 'A leaping overhead that no guard stops and that splits a shield.'], ['Shield-Biter', 'A sweep the whole way round.'], ['He tires', 'Every blow costs him wind. Give ground, let him swing at air, and he slows.']],
    cb: { hp: 380, dmg: 20, skill: 0, kind: 'berserk', armor: 0.75, reach: 2.9, wind: 100, spentLine: '(His breath rasps. The swings are slower.)',
      moves: [...str('bm', [mv('cut', 'a', { dmg: 18, tire: 6 }), mv('back', 'b', { dmg: 16, tire: 6 }), mv('cut', 'c', { dmg: 18, tire: 6 })]), mv('leap', 'maw', { name: "Bear's Maw", dmg: 30, smash: 9, tire: 15, whiff: 1.7 }), mv('sweep', 'biter', { name: 'Shield-Biter', tire: 12, whiff: 1.2 }),
        { id: 'lie', anim: 'cheer', dur: 1.5, hitAt: 0.45, dmg: 0, taunt: true, name: 'The Lie', say: 'I was there, you know. At the farm in the snow. I held the torches. Your father begged at the end.', fury: 65, min: 3, uses: 2, tire: 0, rest: 0.3 }],
      phases: [{ at: 0.5, line: 'Squealed like a pig!', set: { rage: true } }] } },
  { id: 'eydis', n: 4, name: 'Eydis the Mire', title: 'fourth of the seven', act: 'VI', where: 'the drowned watchtower, Myrholm', spot: at('myrholm', 'tower', 1, 9), near: 24,
    task: 'Myrholm: wade to the old watchtower and Eydis the Mire', says: 'The bog keeps everyone it takes.', won: 'One heartbeat with her arm over her eyes was enough. The spear shaft breaks, and then her guard.',
    hold: ['spear', 'javelins'], trophy: ['spear', "Eydis's spear"],
    look: { female: true, build: 0.96, hairStyle: 'long', hair: 0x8a7448, tunic: 0x4a4a32, trim: 0x2a2418, legs: 0x2e2a20, cloak: 0x3a3a26, sleeve: 0x4a4a32, eyes: 0x6f8f5a, face: 'lean' },
    skills: [['Mire-Lance', 'She keeps him at the end of a long spear and backs away when he closes.'], ['Poisoned Point', 'A thrust that leaves poison in the wound.'], ['Javelin Rain', 'Three javelins from the bundle on her back.'], ['Sucking Ground', 'Stake pits wait under the water, and she fouls the mud under his feet.']],
    cb: { hp: 260, dmg: 15, skill: 0.55, reach: 3.7, range: 3.5, dodge: 0.6,
      moves: [mv('jab', 'lance', { name: 'Mire-Lance', reach: 3.7 }), mv('jab', 'poison', { name: 'Poisoned Point', reach: 3.7, dmg: 12, fx: { poison: 6 } }), mv('cut', 'rain', { name: 'Javelin Rain', dur: 0.9, dash: 'back', shots: { n: 3, kind: 'javelin', gap: 0.24, dmg: 13 } }),
        { id: 'mud', anim: 'shove', dur: 0.8, hitAt: 0.5, dmg: 0, name: 'Sucking Ground', trap: { kind: 'mire', r: 2.7, sec: 9 }, rest: 0.4 }, mv('sweep', 'sw', { reach: 3.6 })],
      phases: [{ at: 0.5, line: 'Come and get me, then. Mind your feet.', set: { dodge: 0.7 } }] } },
  { id: 'bersi', n: 5, name: 'Bersi Black-Anvil', title: 'fifth of the seven', act: 'VI', where: 'the forge street, Skalløy', spot: at('skalloy', 'forge', -30, 0), near: 28,
    task: 'Skalløy: meet Bersi Black-Anvil at the forge gate', says: 'Another old man dying for a boy who wants a crown.', won: 'The hammer hits rock with all his weight behind it. Raven-Feeder hooks his ankle, and the Black Anvil goes over.',
    hold: ['anvilhammer', null], trophy: ['maul', "Black-Anvil's hammer"],
    look: { build: 1.42, scale: 1.2, hairStyle: 'bald', beard: 'long', hair: 0x141210, tunic: 0x2a2a2e, trim: 0x70747a, legs: 0x1e1c1a, sleeve: 0x2a2a2e, mail: true, apron: 0x1c1a18, eyes: 0x5a4632, face: 'broad', skin: 0xc8946e },
    skills: [['Anvil-Drop', 'The hammer into the ground: everyone near it, and no guard helps.'], ['Shield-Breaker', 'An overhead that splits a shield and empties the guard behind it.'], ['Horse-Killer', 'A charge from across the street.'], ['He does not tire', 'But all his weight is in every blow. Make one land on nothing and he is open.']],
    cb: { hp: 480, dmg: 26, skill: 0.25, armor: 0.55, reach: 2.8,
      moves: [mv('slam', 'drop', { name: 'Anvil-Drop', aoe: 3.0, whiff: 2.2 }), mv('over', 'breaker', { name: 'Shield-Breaker', unblockable: false, dmg: 30, smash: 9, guardDrain: 60, whiff: 1.6 }), mv('leap', 'horse', { name: 'Horse-Killer', dmg: 34, lunge: 8, min: 4, whiff: 1.9 })],
      phases: [{ at: 0.5, line: 'I have killed horses that stood up longer.', set: { moves: [...str('pp', [mv('pound', 'a'), mv('pound', 'b'), mv('slam', 'c', { name: 'Anvil-Drop', aoe: 3.0, whiff: 2.4 })], 1), mv('leap', 'horse', { name: 'Horse-Killer', dmg: 34, lunge: 8, min: 4, whiff: 1.9 }), mv('over', 'breaker', { name: 'Shield-Breaker', unblockable: false, dmg: 30, smash: 9, guardDrain: 60, whiff: 1.6 })] } }] } },
  { id: 'ulf', n: 6, name: 'Ulf Two-Blades', title: 'sixth of the seven', act: 'VII', where: 'the lashed ships, Svartøy harbour', spot: at('svartoy', 'harbor', 36, -63), near: 13,
    task: "Svartøy: cross the pier to Ulf Two-Blades' flagship", says: 'All these years, I wondered whether the farmer had learned to fight.', won: '"I didn\'t run," he says. "No. You didn\'t." Ulf Two-Blades falls backward into the sea.',
    hold: ['sword', 'sword'], trophy: ['twin', "Ulf's two swords"],
    look: { build: 1.04, hairStyle: 'long', hair: 0xd0b070, beard: 'short', tunic: 0x26324a, trim: 0xb8bcc4, legs: 0x2a2620, sleeve: 0x26324a, eyes: 0x86aec6, face: 'even' },
    skills: [['The Scissor', 'Both swords at once, from both sides. Only a shield stops it.'], ['Whirl', 'Four cuts without a breath between them.'], ['Change-Step', 'He changes direction in the middle of a swing and is at your side.']],
    cb: { hp: 340, dmg: 15, skill: 0.7, dodge: 0.55, counter: true, keepDry: true, slow: 0.86,
      moves: [mv('sweep', 'scissor', { name: 'The Scissor', dmg: 26, unblockable: false, needShield: true, dur: 1.05, reach: 2.6, arc: 1.2 }), ...str('wh', [mv('cut', 'a', { name: 'Whirl', dur: 0.7 }), mv('back', 'b', { dur: 0.6 }), mv('cut', 'c', { dur: 0.6 }), mv('back', 'd', { dur: 0.6 })], 0.95), mv('cut', 'step', { name: 'Change-Step', dash: 'flank', dur: 0.72, dmg: 16 })],
      phases: [{ at: 0.6, line: 'Getting tired, farmer?', set: { dodge: 0.65 } }, { at: 0.3, line: 'This time I will not run.', set: { rage: true } }] } },
  { id: 'kettil', n: 7, name: 'Kettil Red-Hand', title: 'last of the seven', act: 'VII', where: "the bend in the road, Svartøy", spot: at('svartoy', 'bend'), near: 24,
    task: 'Svartøy: take the road up to the bend, and Kettil Red-Hand', says: 'I should have killed you when you were a child.', won: '"Will killing me bring them back?" "No. But you will kill no one else for him."',
    hold: ['smallaxe', 'buckler'], trophy: null,
    look: { build: 1.02, hairStyle: 'short', hair: 0x5a2a1a, beard: 'stubble', tunic: 0x3a2e2a, trim: 0x6a1a14, legs: 0x2a2420, cloak: WOLF, sleeve: 0x3a2e2a, eyes: 0x5a4632, face: 'lean', scar2: 'cheek' },
    skills: [['Buckler-Hook', 'A twist of the buckler takes the weapon out of Eirik\'s hand for a few breaths, even through a guard.'], ['Mud in the Eyes', 'Thrown from three paces. A raised guard keeps it out.'], ['Boot-Knife', 'A feint with the axe, then the knife from his boot, which no guard stops.']],
    cb: { hp: 280, dmg: 15, skill: 0.6, dodge: 0.35,
      moves: [{ id: 'hook', anim: 'shove', dur: 0.85, hitAt: 0.45, dmg: 6, name: 'Buckler-Hook', hook: 3 }, { id: 'mud', anim: 'atk1', dur: 0.7, hitAt: 0.5, dmg: 1, reach: 3.4, name: 'Mud in the Eyes', fx: { blind: 3.5 }, min: 2.2 },
        ...str('bk', [mv('cut', 'a', { dmg: 8, dur: 0.7 }), { id: 'x', anim: 'thrust', dur: 0.9, hitAt: 0.45, dmg: 20, unblockable: true, name: 'Boot-Knife' }], 1), ...str('kc', [mv('cut', 'a'), mv('back', 'b')])],
      phases: [{ at: 0.4, line: 'Wait. Wait! I can tell you who paid for it!', set: { dodge: 0.5 } }] } },
  { id: 'vigdis', n: 8, name: 'Vigdis Quickblood', title: 'the Left Hand', act: 'VII', where: 'the long bridge, Svartøy', spot: at('svartoy', 'bridgeN', 0, 26), near: 15,
    task: 'Svartøy: step onto the long bridge, where Vigdis Quickblood waits', says: '', won: 'On the next left-left he does not block. He steps in. She dies with both blades still in her hands.',
    hold: ['seax', 'seax'], trophy: ['twin', "Vigdis's seaxes"],
    look: { female: true, build: 0.9, scale: 0.94, hairStyle: 'short', hair: 0x2a2622, tunic: 0x26262a, trim: 0x4a4a50, legs: 0x1e1e20, sleeve: 0x26262a, eyes: 0x8e979c, face: 'lean' },
    skills: [['Left-Left, Right-Right', 'She steps twice and strikes, always from the side: two blows from the left, then two from the right. Listen for her feet; raise the guard on the beat.'], ['Quickblood', 'Now and then she is behind him instead.'], ['Too fast to chase', 'She is gone the moment her blow is thrown. Two blows turned on the beat break her guard.']],
    cb: { hp: 300, dmg: 13, skill: 0.9, dodge: 0.75, flit: true, keepDry: true, slow: 0.82, parryBreak: 50,
      moves: [mv('cut', 'll', { name: 'Left-Left, Right-Right', dash: 'flank', beat: true, dur: 0.78, hitAt: 0.5 }), mv('cut', 'll2', { name: 'Left-Left, Right-Right', dash: 'flank', beat: true, dur: 0.78, hitAt: 0.5 }), mv('cut', 'll3', { name: 'Left-Left, Right-Right', dash: 'flank', beat: true, dur: 0.78, hitAt: 0.5 }), mv('back', 'qb', { name: 'Quickblood', dash: 'behind', dur: 0.62, dmg: 15 })],
      phases: [{ at: 0.55, line: 'So the stories are true.', fire: true, set: {} }, { at: 0.25, line: 'Then let us see what remains when you bleed.', set: { slow: 0.72 } }] } },
  { id: 'gorm', n: 9, name: 'Gorm Stone-Lung', title: 'the Right Hand', act: 'VII', where: "the gate of Håkon's hall, Svartøy", spot: at('svartoy', 'hall', 0, -27), near: 20,
    task: 'Svartøy: climb to the hall gate, and Gorm Stone-Lung', says: '', won: '"Håkon is waiting." "Then I should not keep him."',
    hold: ['club', 'ironshield'], trophy: null,
    look: { mail: true, build: 1.46, scale: 1.3, hairStyle: 'short', hair: 0x4a4038, beard: 'short', tunic: 0x4a4e54, trim: 0x2a2c30, legs: 0x26262a, sleeve: 0x4a4e54, helmet: true, eyes: 0x5a4632, face: 'broad' },
    skills: [['Wall of Iron', 'Three layers of mail and an iron-bound shield: nothing gets through from the front until the rim is broken.'], ['Shield-Swat', 'A swing of the shield that no guard stops and that takes the breath out of him.'], ['Stone-Lung Crush', 'The club into the ground, hard enough to turn a stone step to gravel.'], ['He tires, slowly', 'Make him swing. When the shield is gone he is faster, and open.']],
    cb: { hp: 560, dmg: 28, skill: 0.5, kind: 'shield', armor: 0.4, reach: 2.9, wind: 130, spentLine: "(The big man's breath has started to rasp.)",
      moves: [{ id: 'swat', anim: 'shove', dur: 0.95, hitAt: 0.45, dmg: 14, unblockable: true, name: 'Shield-Swat', fx: { drain: 40 }, tire: 8 }, mv('slam', 'crush', { name: 'Stone-Lung Crush', dmg: 34, aoe: 3.0, whiff: 2.0, tire: 16 }), mv('cut', 'c', { dmg: 22, dur: 1.2, tire: 8 })],
      phases: [{ at: 0.5, line: '(He throws away the split shield and takes the club in both hands.)', drop: 'L', set: { kind: null, armor: 0.7, slow: 0.84, moves: [mv('slam', 'crush', { name: 'Stone-Lung Crush', dmg: 36, aoe: 3.1, whiff: 2.2, tire: 16 }), ...str('gp', [mv('pound', 'a', { tire: 9 }), mv('pound', 'b', { tire: 9 })], 1), mv('sweep', 'sw', { dmg: 26, tire: 12, whiff: 1.3 })] } }] } },
  { id: 'hakon', n: 10, name: 'Jarl Håkon Ironwolf', title: 'the Ironwolf', act: 'VII', where: 'the Hall of Wolves, Svartøy', spot: at('svartoy', 'hall', 0, 9), near: 19,
    task: 'Svartøy: go into the Hall of Wolves alone', says: 'You have your grandfather\'s eyes.', won: '"Will they remember me as a monster?" "They will remember what you did."',
    hold: ['sword', 'shield'], trophy: null,
    look: { mail: true, build: 1.24, scale: 1.08, hairStyle: 'long', hair: 0x9a968e, beard: 'long', tunic: 0x34363c, trim: 0x70747a, legs: 0x242426, cloak: 0x5a5852, sleeve: 0x34363c, fur: true, eyes: 0x8e979c, face: 'long', scar2: 'brow' },
    skills: [['The sword of the guardsman', 'Sword and shield, every block clean, every counter punishing. He reads a blow before it begins.'], ['The weapons of war', 'Spear, then axe, then sword again from the racks, changing whenever Eirik gets used to one; a bench at his legs, the hearth\'s coals in his face.'], ["Wolf's Judgment", 'The spiked hammer. It breaks a shield to pieces and no guard stops it.'], ['The last oath', 'The scar goes cold: no Stormguard, no storm skills. Stop attacking. Wait. Answer.']],
    cb: { hp: 760, dmg: 20, skill: 0.85, kind: 'shield', counter: true, dodge: 0.3, reach: 2.5,
      moves: [...str('gs', [mv('cut', 'a', { name: 'The Sword of the Guardsman' }), mv('back', 'b'), mv('cut', 'c')]), mv('jab', 'th', { reach: 2.9 }), { id: 'bash', anim: 'shove', dur: 0.8, hitAt: 0.45, dmg: 10, unblockable: true, fx: { drain: 30 }, name: 'Shield-Rim' }],
      phases: [
        { at: 0.75, line: 'Your father always struck from the left.', arms: 'war', set: { kind: null, skill: 0.6, counter: false } },
        { at: 0.48, line: "(He takes down Wolf's Judgment, the hammer that killed Ragnar.)", arms: 'hammer', set: { skill: 0.35, armor: 0.8, reach: 2.9, moves: [mv('over', 'judge', { name: "Wolf's Judgment", dmg: 36, smash: 600, whiff: 1.6 }), mv('slam', 'ring', { name: 'The Wolf Circle', dmg: 30, aoe: 3.1, whiff: 1.9 }), ...str('hp', [mv('pound', 'a'), mv('pound', 'b')], 1)] } },
        { at: 0.2, line: 'Then let us see whether his lessons can save you.', arms: 'oath', set: { slow: 1.3, dodge: 0, moves: [mv('over', 'last', { name: 'The Last Blow', dmg: 40, dur: 1.7, whiff: 2.6 }), mv('slam', 'ring', { name: 'The Wolf Circle', dmg: 30, aoe: 3.1, whiff: 2.4 })] } },
      ] } },
];
/** What Håkon fights with in the second part: he changes whenever Eirik gets used to one. */
export const WAR = [
  { hold: 'spear', reach: 3.5, moves: [mv('jab', 'a', { name: 'The Weapons of War: spear', reach: 3.5 }), mv('jab', 'b', { reach: 3.5, dur: 0.7 }), mv('sweep', 'c', { reach: 3.5 }), mv('cut', 'bench', { name: 'The Bench', dur: 0.9, min: 3.5, shots: { n: 1, kind: 'javelin', dmg: 16, fx: { slow: 1.5 } } })] },
  { hold: 'axe', reach: 2.4, moves: [...str('ax', [mv('cut', 'a', { name: 'The Weapons of War: axe', dmg: 18 }), mv('back', 'b', { dmg: 16 })]), mv('over', 'c'), { id: 'coals', anim: 'atk1', dur: 0.7, hitAt: 0.5, dmg: 6, reach: 3.4, name: 'Hearth-Coals', fx: { blind: 2.6 }, min: 2 }] },
  { hold: 'sword', reach: 2.5, moves: [...str('sw', [mv('cut', 'a', { name: 'The Weapons of War: sword' }), mv('back', 'b'), mv('cut', 'c')]), mv('leap', 'd')] },
];

Object.assign(QUESTS, {
  s_table: {
    title: "The Wolf's Table", kind: 'side', xp: 600,
    desc: "Håkon Ironwolf gave seven champions a seat at his table and a wolf brooch of black iron, and keeps two more behind his chair: his left hand and his right. They are named here as the story names them, and each waits where the story has him fall. (The battles and voyages round these fights are not built yet: these are the fights alone.) A name over a champion's guard is the skill he is using.",
    steps: FOES.map((f) => ({ id: f.id, text: f.task, type: 'event', key: 'fell_' + f.id, marker: { pos: f.spot } })),
  },
  s_seven: { title: 'The Seven (replaced)', kind: 'side', xp: 0, desc: "The placeholder champions on Gulen have been replaced by the story's own: see The Wolf's Table.", steps: [{ id: 'fight', text: "Ask the lawspeaker on Gulen about the Wolf's table", type: 'event', key: 'seven_retired' }] },
});

export class Champions {
  constructor(game, open) { this.g = game; this.open = open; this.now = null; this.t = 0; this.fires = []; }
  get st() { return this.g.state; }
  get done() { return this.st.flags.table || 0; }
  /** The champion the quest has reached, or null. */
  next() { const q = this.st.quests.s_table; return q && q.status === 'active' ? FOES[q.step] : null; }

  /** What the lawspeaker on Gulen has to say about them. */
  offer() {
    const L = 'Hallvard the Lawspeaker', n = this.done, f = FOES[n];
    if (this.st.quests.s_table) return f ? { choices: [{ t: `"Who is next at the Wolf's table?" (${n} of ${FOES.length} fallen)`, to: 'next' }], nodes: [{ id: 'next', s: L, t: `${f.name}, ${f.title}. ${f.where[0].toUpperCase() + f.where.slice(1)}. ${f.skills.map((k) => k[0]).join(', ')}: that is what men say of how ${f.look.female ? 'she' : 'he'} fights.`, to: 'end' }] } : { choices: [], nodes: [] };
    return { choices: [{ t: '"Who sits at the Wolf\'s table?"', to: 'table' }], nodes: [
      { id: 'table', s: L, t: 'Seven champions, each with a seat and a wolf brooch of black iron: Arne Longshot, Rurik Shieldsplitter, Skarde Bear-Maw, Eydis the Mire, Bersi Black-Anvil, Ulf Two-Blades, and Kettil Red-Hand in the lowest seat.' },
      { s: L, t: 'Two more stand behind his chair. Vigdis Quickblood is his left hand: the fastest blade anyone has seen. Gorm Stone-Lung is his right: he once walked home from a battle with three arrows in his back.' },
      { s: L, t: 'They are out among the islands now, {n}, each where the Ironwolf has work. I have marked the first on your chart. The law will not call it murder.', to: 'end', fx: { quest: 's_table' } }] };
  }

  build() {
    const g = this.g, o = this.open, w = g.world, R = w.realm;
    if (this.st.quests.s_seven) { delete this.st.quests.s_seven; delete this.st.flags.seven; } // the placeholder Seven are gone
    // the watchtower on Jarnøy: the only way up is to climb, and the only way down is the same
    const tw = R.jarnoy.tower;
    w.addInteractable({ id: 'tower_up', x: tw.foot.x, z: tw.foot.z, r: 3, priority: 2, label: 'Climb the fallen beam to the top of the tower', enabled: () => g.mode === 'play' && g.player.pos.y < tw.y - 3,
      use: () => { g.player.teleport(tw.x, tw.z + tw.half - 0.6, Math.PI); g.audio.play('whoosh'); } });
    w.addInteractable({ id: 'tower_down', x: tw.x, z: tw.z + tw.half - 0.4, r: 1.6, priority: 2, label: 'Climb down', enabled: () => g.mode === 'play' && !this.now && g.player.pos.y > tw.y - 1,
      use: () => { g.player.teleport(tw.foot.x, tw.foot.z + 1.5, 0); g.audio.play('whoosh'); } });
    // the people the story puts on these islands. Rulers say where they stand before the alliance; smiths can work on Raven-Feeder.
    const say = (id, name, look, xz, yaw, line, o2) => { const n = o.person(id, name, look, xz[0], xz[1], yaw, { law: false, ...o2 }); n.talk = () => n.say(g.fmt(typeof line === 'function' ? line() : line), 6); return n; };
    say('hroald', 'King Hroald Ironvein', { build: 1.12, hair: 0x8a8880, hairStyle: 'long', beard: 'long', tunic: 0x4a3a3a, trim: 0xc9a24a, cloak: 0x5a2a24, sleeve: 0x4a3a3a, face: 'long' }, at('jarnoy', 'hall', 3, 8), 0.3,
      () => (this.done >= 1 ? 'The archer is out of my tower. You turn down gold and ask for work, {n}. Your father raised you strangely.' : 'I have kept Jarnøy safe for twenty years by paying a wolf a little so he does not take everything. Now his archer sits in my own watchtower.'));
    say('arvid', 'Prince Arvid', { build: 1.0, hair: 0x7a5a3a, hairStyle: 'short', tunic: 0x5a2a24, trim: 0xc9a24a, sleeve: 0x5a2a24 }, at('jarnoy', 'town', 4, -6), 2.0, 'Should I have watched him take her? I would do it again.', { weapon: 'sword', hold: 'sword' });
    say('ingrid', 'Princess Ingrid', { female: true, build: 0.95, hair: 0x6a4a2a, hairStyle: 'braid', tunic: 0x5a6a7a, trim: 0xd8d2c2, apron: 0xd8d2c2, sleeve: 0x5a6a7a, face: 'even' }, at('jarnoy', 'hall', -4, 9), 0.6, 'Clean water. The well, not the harbour. A fever does not care which god you pray to.');
    const smith = (id, name, look, xz, yaw, levels, need, wait) => { const n = o.person(id, name, look, xz[0], xz[1], yaw, { law: false, loop: 'hammer', hold: 'hammer' }); n.talk = () => this.smithTalk(n, levels, need, wait); return n; };
    smith('jsmith', 'Jarnøy smith', { build: 1.15, hair: 0x4a3a2a, beard: 'short', tunic: 0x5a4a3a, apron: 0x3a2e24, sleeve: null }, at('jarnoy', 'furnaces', 14.5, 7), 2.4, [1], 1, 'When the archer is out of the tower there will be iron to spare for it.');
    say('eystein', 'King Eystein Goldhand', { build: 1.05, hair: 0xb09a5a, hairStyle: 'short', beard: 'short', tunic: 0x7a5a2a, trim: 0xe0c060, cloak: 0x6a2a24, sleeve: 0x7a5a2a }, at('solvik', 'hall', 2, 8), -0.3,
      () => (this.done >= 2 ? 'Rurik Shieldsplitter, dead on his own deck. If my merchants are known as friends of the man who did that, perhaps trade will survive after all.' : 'War destroys trade. That ship at my own jetty is waiting for the richest cargo Solvik ever sent. I would pay a fortune to see it gone.'));
    say('thora', 'Queen Thora', { female: true, build: 1.0, hair: 0x8a8070, hairStyle: 'bun', tunic: 0x4a5a3a, trim: 0xc9b27a, cloak: 0x3a4a3a, sleeve: 0x4a5a3a, face: 'lean' }, at('myrholm', 'hall', 4, 9), 0.4,
      () => (this.done >= 4 ? 'You risked your own freedom for someone who might have been guilty. Myrholm remembers that.' : 'My people have survived by staying out of other men\'s wars. And something in my marsh is killing my council.'));
    say('eyvind', 'Prince Eyvind', { scale: 0.74, child: true, hair: 0x9a7a4a, hairStyle: 'short', tunic: 0x5a6a4a, trim: 0xc9b27a, sleeve: 0x5a6a4a }, at('myrholm', 'hall', -6, 12), 1.2, "You don't know the channels. I do. Burn a leech off with a hot knife or the head stays in.");
    say('gudmund', 'Jarl Gudmund', { build: 1.0, hair: 0x5a4a3a, hairStyle: 'short', beard: 'stubble', tunic: 0x4a4a52, trim: 0x8a8a90, sleeve: 0x4a4a52, face: 'lean' }, at('skalloy', 'hall', 2, 8), 0.5,
      () => (this.done >= 5 ? 'He came to break every forge on the island. They are still standing. Skalløy keeps its word.' : 'If Skalløy sends one warrior to you, he burns every workshop and kills every smith. I would like to join you very much. I would like my smiths alive more.'));
    smith('halvar', 'Halvar', { build: 1.2, hair: 0x6a4a2a, hairStyle: 'short', beard: 'short', tunic: 0x5a4a3a, apron: 0x3a2e24, sleeve: null }, at('skalloy', 'forge', 28.4, -1.4), -1.6, [2, 3], 5, "I'd work on her gladly. Not while that hammer is loose in my street.");
    say('jorund', 'Jarl Jorund', { build: 0.95, hair: 0x6a6258, hairStyle: 'short', beard: 'stubble', tunic: 0x3a3a4a, trim: 0x8a8a90, cloak: 0x2a2a34, sleeve: 0x3a3a4a, face: 'lean' }, [-70, 1268], 2.2,
      () => (this.done >= 3 ? 'You defended my people without asking for tribute. I have never known anyone do that.' : 'I have kept Vængr free for thirty years by trusting no one. I see no reason to stop today.'));
    say('svanhild', 'Svanhild', { female: true, build: 1.05, scale: 1.03, hair: 0xd8c890, hairStyle: 'braid', tunic: 0x3a4a5a, trim: 0xc9c2b0, sleeve: 0x3a4a5a, helmet: false, face: 'long', scar2: 'brow' }, [-74, 1272], 2.0,
      'Men say you defeat wolves with an axe and speak to ravens. I would rather know whether you keep your promises.', { weapon: 'sword', hold: 'sword' });
  }
  /** A smith works on Raven-Feeder: the reforgings the story gives her, once the champion on his island is down. */
  smithTalk(n, levels, need, wait) {
    const g = this.g, inv = g.inventory, lv = this.st.flags.reforge || 0, to = levels.find((l) => l === lv + 1), S = n.name, silver = inv.count('silver');
    if (this.done < need) return n.say(wait, 5);
    if (!to) return n.say(lv >= levels[levels.length - 1] ? 'She is as good as I can make her. Whoever made that axe knew his iron.' : 'There is work to be done on her first that is not mine to do. Jarnøy iron, before anything else.', 5);
    const r = REFORGE[to];
    this.open.say([
      { s: S, t: `${to === 1 ? 'Whoever made this axe knew his iron.' : to === 2 ? "Metal remembers every blow. So do men. The trick is learning what deserves to stay." : 'One thing more. A strip of the black iron that fell out of the sky.'} I can make her bite deeper. ${r.cost} silver for the iron and the charcoal.` },
      { s: 'Eirik', t: '', choices: [
        { t: `Reforge Raven-Feeder (${r.cost} silver; you carry ${silver})`, to: silver >= r.cost ? 'done' : 'poor', fx: silver >= r.cost ? { do: () => { inv.remove('silver', r.cost, true); this.st.flags.reforge = to; g.audio.play('steel'); g.audio.play('chop'); g.ui.questBanner('Reforged', r.name); } } : null },
        { t: '"Leave the collar alone."', to: 'collar' }, { t: '"Not today."', to: 'end' }] },
      { id: 'done', s: S, t: r.note, to: 'end' },
      { id: 'poor', s: S, t: 'Iron costs what it costs. Come back with the silver.', to: 'end' },
      { id: 'collar', s: S, t: 'I was not going to touch it. Some things you leave alone until they are ready to talk.', to: 'end' },
    ], n);
  }

  /** The champion is where the story put him, and Eirik has come. */
  rise(def) {
    const g = this.g, o = this.open, R = g.world.realm, p = g.player;
    for (const n of g.npcs.values()) if (n.id.startsWith('wolf_') && n.dead) n.visible = false; // the last one has been carried off
    let [x, z] = def.spot;
    if (def.id === 'arne') { const tw = R.jarnoy.tower; x = tw.x; z = tw.z - tw.half + 0.8; }
    const e = o.fighter('wolf_' + def.id, def.name, def.look, x, z, def.hold[0], { boss: true, smart: true, ...structuredClone(def.cb), onDown: (en) => this.fell(def, en) });
    e.h.hold('R', def.hold[0]); e.h.hold('L', def.hold[1]);
    def.cb.phases.forEach((ph, i) => { if (ph.fire || ph.arms || ph.drop) e.cb.phases[i].do = (en) => this.turn(def, en, ph); });
    this.now = { def, e, warT: 0, war: 0 };
    g.audio.setMusic('raid'); g.audio.play('horn', { freq: def.n > 7 ? 82 : 110, vol: 0.5 });
    g.ui.questBanner(`${def.title} · ${def.where}`, def.name);
    if (def.says) g.after(0.7, () => e.say(def.says, 5));
    if (def.id === 'eydis') for (let i = 0; i < 5; i++) { const a = 0.4 + i * 1.257; g.combat.trap(x + Math.cos(a) * 7.5, z + Math.sin(a) * 7.5, { kind: 'stakes', r: 2.1, sec: 9999, dmg: 5, arm: 0 }); } // her stake pits, under the water
    if (def.id === 'gorm' || def.id === 'rurik') g.after(2.4, () => g.ui.toast(def.id === 'gorm' ? 'Wall of Iron: nothing gets through from the front. Make him swing.' : 'A shield wall of one: break his guard, or catch him in his own swing.'));
    if (def.id === 'vigdis') g.after(1.5, () => g.ui.hint('She steps twice before she strikes, always from the side: left, left, right, right. Watch the arrow at the edge of the screen, listen for her feet, and raise your guard ({block}) on the beat.'));
    if (def.id === 'skarde') g.after(6, () => g.ui.hint('He tires. Give ground, keep your guard up when he talks, and let him swing at air.'));
    if (!this.st.flags.artHint) { this.st.flags.artHint = true; g.after(9, () => g.ui.hint('{art1} is Thunder Smash: a leap and a stroke of lightning that stops a swing and breaks a guard. It spends the storm bar, which the Stormguard also needs.')); }
    p.mortal = true;
  }
  /** A fight changes: the bridge burns, Gorm throws his shield away, Håkon changes weapons. */
  turn(def, e, ph) {
    const g = this.g, R = g.world.realm, p = g.player;
    if (ph.drop) e.h.hold(ph.drop, null);
    if (ph.fire) { // fire arrows set the bridge alight: the safe ground shrinks
      const b = R.svartoy.bridge;
      for (const dz of [-11, 10]) { this.fires.push(g.fx.addFire(b.x + (dz < 0 ? 1 : -1), b.y + 0.2, b.z + dz, 1.3)); g.combat.trap(b.x, b.z + dz, { kind: 'fire', r: 2.6, sec: 9999, dmg: 9, arm: 1.2 }); }
      g.ui.toast('Fire arrows. The bridge is alight.'); g.audio.play('ignite');
    }
    if (ph.arms === 'war') { e.h.hold('L', null); this.now.warT = 0; this.now.war = -1; this.arm(e); }
    if (ph.arms === 'hammer') {
      e.h.hold('R', 'wolfsjudgment'); const h = R.svartoy.hall;
      for (const [dx, dz] of [[-5, -9], [5, 2], [-5, 11]]) this.fires.push(g.fx.addFire(h.x + dx, h.y + 0.2, h.z + dz, 1.5)); // a brazier goes over: the banners catch
      g.audio.play('ignite');
    }
    if (ph.arms === 'oath') { // the Stormguard has saved him for the last time
      p.stormDead = true; p.ward = 0; p.breakT = 0;
      g.ui.card('', 'The scar goes cold. The power is empty. From here on there is no magic. There is only what he has learned.', 5);
      g.after(5.5, () => g.ui.hint('Stop attacking. Wait for the hammer to land on nothing, and answer.'));
    }
  }
  /** Håkon takes the next weapon from the racks. */
  arm(e) {
    const n = this.now; n.war = (n.war + 1) % WAR.length; n.warT = 10;
    const w = WAR[n.war]; e.h.hold('R', w.hold); e.cb.moves = w.moves; e.cb.reach = w.reach;
  }
  fell(def, e) {
    const g = this.g, fl = this.st.flags, inv = g.inventory, p = g.player;
    e.die(); this.now = null; fl.table = this.done + 1;
    for (const x of [...g.combat.alive()]) g.combat.kill(x);
    g.combat.clear(); g.audio.setMusic('day'); p.stormDead = false;
    for (const f of this.fires) g.fx.removeFire(f); this.fires = [];
    g.ui.questBanner(`The Wolf's Table · ${fl.table} of ${FOES.length}`, `${def.name} has fallen`); g.ui.subtitle('', def.won, 7);
    inv.add('silver', 30);
    if (def.n <= 7) { inv.add('wolf_brooch', 1); }
    if (def.trophy && !inv.has(def.trophy[0])) { inv.add(def.trophy[0], 1); g.ui.toast(`${def.trophy[1]}: yours now. ${g.input.label('weapon1')} steps through your weapons.`); }
    if (def.id === 'kettil') g.after(7.5, () => g.ui.subtitle('', 'The seventh and last of the champions is dead. All seven have fallen. The hired men on the slopes begin to drift away.', 7));
    if (def.id === 'hakon') g.after(8, () => g.ui.card('The Ironwolf is dead', 'What comes after is the story\'s: the dead of both sides, the Thing at Gulen, and a crown he does not ask for. It is told in Act VII (main menu, Start at an Act).', 8));
    this.open.law.addStanding(8, `${def.name} has fallen`);
    g.quests.notify('event', 'fell_' + def.id);
    g.autosave();
  }
  steps = Object.fromEntries(FOES.map((f) => ['s_table.' + f.id, function () { this.open.build(); }]));
  questDone() {}

  update(dt) {
    const g = this.g, p = g.player, n = this.now;
    this.t += dt;
    if (this.t % 0.5 < dt) { // a great island comes over the horizon: his own eyes, or the white raven's
      const seen = this.st.open.seen, eye = g.ravens.eye ? g.ravens.white.position : null;
      for (const s of GREAT) {
        if (seen[s.id] || !(Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < s.half + 60 || (eye && Math.hypot(eye.x - s.x, eye.z - s.z) < s.half + 120))) continue;
        seen[s.id] = true; this.st.xp += 15; g.audio.play('questDone', { vol: 0.6 });
        g.ui.questBanner(`${s.title[0].toUpperCase() + s.title.slice(1)} · ${s.ruler}`, s.name);
      }
    }
    if (n) {
      if (n.def.id === 'hakon' && n.e.cb.phase === 1 && (n.warT -= dt) <= 0 && n.e.cb.state !== 'strike') this.arm(n.e);
      return;
    }
    const f = this.next();
    if (!f || g.mode !== 'play' || this.open.mounts.on || g.combat.active) return;
    if (f.id === 'arne') { const tw = g.world.realm.jarnoy.tower; if (p.pos.y > tw.y - 1 && Math.hypot(p.pos.x - tw.x, p.pos.z - tw.z) < tw.half + 1) this.rise(f); return; }
    if (Math.hypot(p.pos.x - f.spot[0], p.pos.z - f.spot[1]) < f.near) this.rise(f);
  }
}
