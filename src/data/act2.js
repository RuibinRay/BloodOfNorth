// Act II — "The Farmer's Axe": Eirik at nineteen. Cast, numbers, quests, dialogue and hints for the nine chapters.
// The words spoken here are the owner's (docs/story/THE_RISE_OF_THE_RAVEN_KING.md, Act II). Where the story tells a
// thing without giving anyone a line, the line is made from the story's own sentence; the few lines the game needed
// that the story does not have are marked (game).
// Text tokens: {w} white raven, {b} black raven, {n} the name the family uses.
import { CAST, QUESTS, HINTS, DIALOGUE, ITEMS } from './act1.js';
import { place } from '../world/layout.js';

const B = (n, dx = 0, dz = 0) => { const p = place('bjornstead', n, dx, dz); return [p.x, p.z]; };
const K = (n, dx = 0, dz = 0) => { const p = place('kaupang', n, dx, dz); return [p.x, p.z]; };

/** Every number of Act II that a designer would want to turn. */
export const A2 = {
  split: 4,                                                     // logs in the first morning
  goat: { speed: 6.2, near: 1.6, catches: 3 },
  raid: { hp: 46, dmg: 9, skill: 0.38, waves: [6, 7, 6, 6], escort: 4, breath: 28, door: { r: 4.2, dmg: 70 }, mud: { secs: 4.2 }, strap: { secs: 6.5 },
    kettil: { hp: 250, dmg: 13, skill: 0.6, mudAt: 0.42 }, barn: { secs: 85, heat: 9 } },
  knack: { calm: [3, 2.6, 0.22], dig: [3, 2.8, 0.26], post: [2, 3.0, 0.26], latrine: [4, 2.8, 0.24], smoke: [3, 3.2, 0.24], fell: [3, 2.6, 0.25] }, // [good strikes needed, speed, width of the mark]
  bout: { window: 1.15, wrestle: 5, drill: 5 },
  dive: { breath: 26, swim: 3.4, sink: 2.6, rise: 3.6, need: 6, carry: 2, beam: 2.4, drag: 2.2, tide: 1.1 },
  silver: { purse: 40, iron: 12, salt: 8, grain: 10 },
};

const kid = (hair, tunic, f) => ({ scale: 0.62 + (hair % 7) * 0.012, child: true, female: !!f, hair, hairStyle: f ? 'braids' : 'short', tunic, trim: 0xd8c890 });
const folk = (o) => ({ build: 1, hair: 0x7a5a3a, tunic: 0x6a6a5a, ...o });
export const CAST2 = {
  bjorn: { name: 'Bjorn', role: 'Adoptive father', look: { ...CAST.bjorn.look, hair: 0x8f8a84, build: 1.3, hairStyle: 'mane', face: 'heavy', nose: 'broad', noseSize: 1.15, brows: 1.45, age: 0.55, rosy: 0.5, mood: 'smile', belly: 0.45, heft: 1.1, eyeShape: 'up', corners: 0.3 } },
  signe: { name: 'Signe', role: 'Adoptive mother', look: { ...CAST.signe.look, hair: 0xc2b89a, hairStyle: 'braidfront', braidSide: -1, face: 'lean', age: 0.35, eyes: 0x7a8a8a, brows: 0.8, lips: 'thin', eyeShape: 'up' } },
  freydis: { name: 'Freydis', role: 'Adoptive sister', look: { scale: 0.95, female: true, build: 0.94, hair: 0xb5562a, hairStyle: 'braidfront', tunic: 0x4f6a7a, trim: 0xe0c070, apron: 0xd8cfb8, sleeve: 0x4f6a7a, freckles: 0.9, face: 'heart', nose: 'snub', eyes: 0x7a6a3a, wry: true } },
  kettil: { name: 'Kettil Red-Hand', role: "Håkon's champion", look: { scale: 1.06, build: 1.12, hair: 0x5a2a1a, hairStyle: 'crop', beard: 'stubble', tunic: 0x3a2e2a, trim: 0x6a1a14, legs: 0x24201c, cloak: 0x16161a, sleeve: 0x3a2e2a, skin: 0xc89878, eyes: 0x5a4632, face: 'gaunt', squint: 0.35, mood: 'scowl', scar2: 'cheek', heft: 0.94, eyeShape: 'narrow', corners: -0.3 } },
  hauk: { name: 'Hauk', role: 'Farmer (the red cow)', look: folk({ hair: 0x8a6a3a, beard: 'short', tunic: 0x7a5a3a, build: 1.1, hairStyle: 'short', face: 'broad', nose: 'broad', age: 0.3 }) },
  grjotgard: { name: 'Grjotgard', role: 'Farmer (the barley)', look: folk({ hair: 0x3a2e24, beard: 'long', tunic: 0x4a5a4a, build: 1.2, hairStyle: 'bald', face: 'heavy', ridge: 0.9, brows: 1.4, nose: 'broad', age: 0.5, mood: 'scowl', belly: 0.4, heft: 1.1, eyeShape: 'hooded', corners: -0.5 }) },
  lawman: { name: 'The lawspeaker', role: 'Lawspeaker of the local Thing', look: folk({ hair: 0xc8c4bc, hairStyle: 'long', beard: 'belt', tunic: 0x5a4a6a, cloak: 0x3a3a4a, trim: 0xc9a24a, age: 0.85, face: 'long', recede: 0.4, part: 'center', brows: 1.3, stoop: 0.5, heft: 0.9 }) },
  girl1: { name: 'Asgerd', role: 'Village girl', look: { scale: 0.9, female: true, build: 0.9, hair: 0xd8b86a, hairStyle: 'braids', tunic: 0x8a5a4a, apron: 0xd8cfb8 } },
  girl2: { name: 'Thordis', role: 'Village girl', look: { scale: 0.88, female: true, build: 0.9, hair: 0x6a4a2a, hairStyle: 'braid', tunic: 0x5a6a4a, apron: 0xcfc6ae } },
  grim: { name: 'Grim', role: 'Peddler', look: folk({ hair: 0x4a3a2a, beard: 'short', tunic: 0x7a6a3a, cloak: 0x5a4a34, build: 1.1, hairStyle: 'shoulder', mood: 'smile', eyeShape: 'hooded', corners: 0.4 }) },
  grimolf: { name: 'Grimolf', role: 'Peddler', look: folk({ hair: 0x4a3a2a, beard: 'stubble', tunic: 0x6a5a3a, cloak: 0x4a4434, build: 1.15, hairStyle: 'tail', squint: 0.35, face: 'lean', eyeShape: 'narrow' }) },
  leif: { name: 'Leif', role: 'Captain without a ship', look: { build: 0.96, hair: 0xd8b05a, hairStyle: 'swept', beard: 'short', tunic: 0x3a5a6a, trim: 0xc9a24a, legs: 0x3a342c, sleeve: 0x3a5a6a, eyes: 0x6a9ab0, face: 'lean', earring: true, nose: 'snub', mood: 'smirk', heft: 0.92, mouthShape: 'crooked' } },
  orm: { name: 'Orm the reeve', role: 'Harbor reeve of Kaupang', look: folk({ build: 1.42, hair: 0x5a4a3a, hairStyle: 'bald', beard: 'short', tunic: 0x7a2a2a, trim: 0xc9a24a, cloak: 0x4a3a5a, face: 'round', full: 1, jaw: 1.1, eyeSize: 0.85, nose: 'broad', age: 0.45, rosy: 0.4, mood: 'smirk', belly: 1, heft: 1.18, eyeShape: 'narrow', mouthShape: 'pout' }) },
  gisli: { name: 'Gisli', role: "Leif's youngest sailor", look: { scale: 0.93, build: 0.92, hair: 0xb89a5a, hairStyle: 'short', tunic: 0x5a6a5a, sleeve: 0x5a6a5a, face: 'lean', rosy: 0.7, nose: 'snub', ears: 'out', heft: 0.86 } },
  sailor: { name: 'A drunk sailor', role: 'Witness', look: folk({ hair: 0x6a5a4a, beard: 'long', tunic: 0x4a5a6a, build: 1.05, hairStyle: 'mane', redNose: true, mood: 'grin', belly: 0.25, corners: 0.5 }) },
  klaw: { name: 'The lawspeaker of Kaupang', role: 'Lawspeaker', look: folk({ hair: 0xb0aca4, hairStyle: 'shoulder', beard: 'short', tunic: 0x3a4a5a, cloak: 0x5a3a2a, trim: 0xc9a24a, build: 1.1, age: 0.6, squint: 0.2, recede: 0.3, eyeShape: 'hooded' }) },
  smith: { name: 'An ironmonger', role: 'Merchant', look: folk({ build: 1.25, hairStyle: 'bald', beard: 'short', tunic: 0x5a4a3a, apron: 0x3a2e24, face: 'broad', heft: 1.08, belly: 0.2 }) },
  salter: { name: 'A salt-seller', role: 'Merchant', look: folk({ female: true, build: 0.95, hair: 0x9a968e, hairStyle: 'bun', tunic: 0x6a6a7a, apron: 0xd8d4c8, age: 0.5, face: 'lean' }) },
  factor: { name: 'A grain factor', role: 'Merchant', look: folk({ hair: 0xa8884a, beard: 'short', tunic: 0x8a7a4a, cloak: 0x6a5a3a, hairStyle: 'swept', part: 'side' }) },
  thrall: { name: 'A girl in the pen', role: 'Thrall', look: { scale: 0.92, female: true, build: 0.88, hair: 0x8a5a3a, hairStyle: 'braid', tunic: 0x6a6456, sleeve: 0x6a6456 } },
  sigurd: { name: 'Jarl Sigurd Stonehand', role: 'The Iron Circle', look: folk({ build: 1.1, hair: 0x9a9690, hairStyle: 'swept', beard: 'short', tunic: 0x4a4a52, trim: 0xc9c2b0, cloak: 0x2a2a34, fur: true, face: 'round', full: 0.35, mood: 'smirk', age: 0.45, belly: 0.3, corners: 0.3 }) },
};
export const KIDS = [kid(0xd8b86a, 0x8a5a4a, 1), kid(0x7a5a3a, 0x5a6a4a), kid(0xb5562a, 0x6a5a7a, 1), kid(0x4a3a2a, 0x7a6a4a), kid(0xc8a85a, 0x4f6a7a), kid(0x8a6a3a, 0x8a6a4a, 1)];
export const VILLAGERS = [
  ['Thorolf', folk({ hair: 0x7a5a3a, beard: 'short', tunic: 0x6a6a5a })], ['Gudrun', folk({ female: true, scale: 0.95, build: 0.92, hair: 0xb89a5a, hairStyle: 'braids', tunic: 0x8a6a4a, apron: 0xbfb49a })],
  ['Odd', folk({ hair: 0x5a4a3a, beard: 'long', tunic: 0x4a5a6a, build: 1.1 })], ['Helga', folk({ female: true, scale: 0.94, build: 0.9, hair: 0x4a3a2a, hairStyle: 'bun', tunic: 0x6a5a7a, apron: 0xcfc6ae })],
  ['Kol', folk({ hair: 0x2e2620, beard: 'stubble', tunic: 0x5a4a3a, build: 1.2, belly: 0.3, heft: 1.08, eyeShape: 'narrow' })], ['Thurid', folk({ female: true, scale: 0.96, build: 0.95, hair: 0xc8c0b0, hairStyle: 'bun', tunic: 0x5a6a5a, apron: 0xd8cfb8 })],
  ['Eyjolf', folk({ hair: 0x9a7a48, hairStyle: 'long', beard: 'short', tunic: 0x7a3a2e })], ['Ragnhild', folk({ female: true, scale: 0.97, hair: 0x8a4a2a, hairStyle: 'braid', tunic: 0x4f6272, apron: 0xd8cfb8 })],
  ['Steinar', folk({ hair: 0x6a6a64, hairStyle: 'bald', beard: 'long', tunic: 0x54402e, build: 1.15 })], ['Ingunn', folk({ female: true, scale: 0.93, hair: 0xd8c890, hairStyle: 'braids', tunic: 0x9a5a4a })],
];

Object.assign(ITEMS, {
  arm_ring: { name: 'Silver arm-ring', desc: 'Plain silver, from Bjorn. "Not because you are my son. You already are. Because today, people chose to follow you."', cat: 'Keepsake' },
  net: { name: 'Fishing net', desc: 'Tarred cord and cork floats. Strung low across a path at night, it catches more than herring.', cat: 'Tool' },
  list: { name: "Freydis's list", desc: 'Iron. Salt. Grain. Underlined twice: "and do not let them see you counting".', cat: 'Keepsake' },
});

const Q = (title, desc, next, xp, steps) => ({ title, kind: 'main', xp, next, desc, steps });
const ev = (id, text, key, o = {}) => ({ id, text, type: 'event', key, ...o });
const talk = (id, text, key, o = {}) => ({ id, text, type: 'talk', key, marker: { npc: Array.isArray(key) ? key[0] : key }, ...o });
const reach = (id, text, key, pos, o = {}) => ({ id, text, type: 'reach', key, marker: { pos }, ...o });
Object.assign(QUESTS, {
  q_ten: Q('Ten Winters', 'A summer morning so beautiful it almost hurts. Sheep by the stream, smoke straight up from twenty roofs, gulls arguing over the fishing boats.', 'q_farm', 60, [
    ev('wake', 'Ten winters later', 'woke5'),
    ev('split', 'Split the firewood', 'a2split', { marker: { pos: B('chop') } }),
    ev('goat', "Head off Old Skeggi before he finishes Bjorn's boot", 'a2goat', { count: A2.goat.catches, marker: { dyn: 'goat' } }),
    talk('freydis', 'Speak with Freydis', 'freydis'),
  ]),
  q_farm: Q("A Farmer's Life", 'Hard work and small joys: the hunt, the Thing, the harvest feast.', 'q_smoke', 120, [
    talk('bjorn', 'Speak with Bjorn', 'bjorn'),
    reach('forest', 'Go up to the birch forest by the stream', 'a2forest', B('elk', -40, 6)),
    ev('eye', 'Send {w} up through the trees', 'ravenEye'),
    ev('signs', 'Mark what she sees: water, blood, a broken branch', 'a2sign', { count: 3 }),
    ev('elk', 'Follow the pictures to the stream', 'a2elk', { marker: { pos: B('elk') } }),
    reach('thing', 'Go to the Thing stones', 'a2thing', B('thing', 6, 4)),
    talk('sides', 'Hear Hauk and Grjotgard', ['hauk', 'grjotgard'], { count: 2 }),
    talk('judge', 'Hear the judgment', 'bjorn'),
    ev('feast', 'Come to the harvest feast at dusk', 'a2feast', { marker: { pos: B('hall', 2, 12) } }),
    ev('kaestur', 'Freydis has a dare', 'a2kaestur', { marker: { npc: 'freydis' } }),
    ev('wrestle', 'Bjorn wants his wrestling match', 'a2wrestle', { marker: { npc: 'bjorn' } }),
    ev('birch', 'Look up at the old birch', 'a2birch', { marker: { pos: B('gateN', 0, 8) } }),
  ]),
  q_smoke: Q('Smoke on the Ridge', 'At dawn {w} comes back from the river road with one word.', 'q_axe', 60, [
    ev('dawn', 'Dawn', 'a2dawn'),
    ev('eye', 'See what {w} saw', 'ravenEye'),
    ev('spot', 'Look north-east along the river road and mark what she sees', 'ridersSpotted'),
    ev('yard', 'Stand with Bjorn in the yard', 'a2tribute', { marker: { npc: 'bjorn' } }),
  ]),
  q_axe: Q("The Farmer's Axe", 'They come back at sunset with thirty men.', 'q_wolf', 300, [
    reach('home', 'Run home', 'a2home', B('hall', 2, 7)),
    ev('stone', 'Lift the flat stone by the hearth', 'tookAxe', { marker: { pos: B('hall', 2, 5) } }),
    ev('yard', 'Hold the yard beside Bjorn', 'a2wave1'),
    ev('barn', 'The barn: slam the door on them', 'a2wave2', { marker: { pos: B('barn', -4.5, 0) } }),
    ev('sty', 'Draw them into the pigsty mud', 'a2wave3', { marker: { pos: B('sty') } }),
    ev('lane', 'Hold the lane between the smithy and the smokehouse', 'a2wave4', { marker: { pos: B('lane') } }),
    ev('captain', 'Kettil Red-Hand', 'a2kettil'),
    ev('children', 'The barn: get the children out', 'a2children', { marker: { pos: B('barn', -4.5, 0) } }),
    ev('brooch', 'Where Kettil lay', 'a2brooch', { marker: { dyn: 'brooch' } }),
    talk('well', 'Sit down on the well', 'freydis'),
  ]),
  q_wolf: Q('The Wolf Remembers', 'On Svartøy, Kettil limps into Håkon\'s hall.', 'q_peddlers', 40, [ev('hall', 'The Hall of Wolves', 'a2hall')]),
  q_peddlers: Q('The Peddlers', 'Two weeks later, two brothers arrive with a cart of combs, needles, glass beads and cheap knives.', 'q_walls', 140, [
    talk('meet', 'See what the peddlers are selling', 'grim'),
    ev('dusk', 'Wait for dark at the house', 'a2dusk', { marker: { pos: B('hall', 2, 5) } }),
    ev('watch', 'Send {w} to watch their camp and mark what she sees', 'a2camp', { count: 3 }),
    ev('net', 'Take a fishing net from the racks on the strand', 'a2net', { marker: { pos: B('strand', -26, -9) } }),
    ev('string', 'String the net across the street', 'a2strung', { marker: { pos: B('yard', 0, 20) } }),
    ev('wait', 'Wait in the house for midnight', 'a2midnight', { marker: { pos: B('hall', 2, 5) } }),
    reach('chase', 'After the other one', 'a2tangled', B('yard', 0, 20)),
    talk('thing', 'The Thing, next morning: hear the judgment', 'lawman'),
    ev('boat', 'See them off at the pier', 'a2rowed', { marker: { pos: B('pier', 0, 7) } }), // on the pier, beside their boat: the boat leaves when Eirik comes near (act2_winter.js)
    talk('bjorn', 'Sit up with Bjorn', 'bjorn'),
  ]),
  q_walls: Q('Walls Before Winter', 'Eirik calls the whole village to the Thing stones.', 'q_captain', 260, [
    ev('call', 'Call the village to the Thing stones', 'a2called', { marker: { pos: B('thing') } }),
    talk('listen', 'Listen to every one of them', ['hauk', 'grjotgard', 'v4'], { count: 3 }),
    ev('speak', 'Speak', 'a2spoke', { marker: { pos: B('thing') } }),
    ev('timber', 'Cut timber in the hills', 'a2timber', { count: 3, marker: { dyn: 'work' } }),
    reach('haul', 'Lead the horse and its load down to the north gate', 'a2hauled', B('gateN', 0, -6)),
    ev('ditch', 'Dig the ditch', 'a2dig', { count: 4, marker: { dyn: 'work' } }),
    ev('latrine', 'Dig the new latrine trench', 'a2latrine', { marker: { pos: B('trench') } }),
    ev('wall', 'Raise the palisade', 'a2post', { count: 4, marker: { dyn: 'work' } }),
    ev('tower', 'Raise the watchtower by the old birch', 'a2tower', { marker: { pos: B('birch', 8, 9) } }),
    ev('drill', "Stand in Bjorn's shield wall in the pasture", 'a2drill', { marker: { npc: 'bjorn' } }),
  ]),
  q_captain: Q('The Captain Without a Ship', 'They need iron, salt and grain for winter, and the nearest great market is Kaupang, four days\' sail down the coast.', 'q_oath', 320, [
    talk('freydis', 'Get the list and the silver from Freydis', 'freydis'),
    ev('sail', "Board the fisherman's boat at the pier", 'a2sailed', { marker: { pos: B('pier', 0, 14) } }),
    talk('market', "Buy what is on Freydis's list", ['smith', 'salter', 'factor'], { count: 3 }),
    reach('pen', 'The pen by the harbor', 'a2pen', K('pen', 0, -7.5)),
    ev('quay', 'The shouting on the quay', 'a2quay', { marker: { npc: 'leif' } }),
    talk('tavern', 'That evening: the tavern', 'sailor'),
    talk('leif', 'Go back to the quay', 'leif'),
    ev('skiff', 'Take the borrowed boat out to the Skerries', 'a2skiff', { marker: { pos: K('boat', 4, -3) } }),
    ev('tide', 'Send {w} up to read the tide line', 'a2tide'),
    ev('dive', 'Dive the wreck and bring up the silver', 'a2silver', { count: A2.dive.need, marker: { pos: K('wreck', 0, 16) } }),
    ev('gisli', 'The last dive', 'a2gisli', { marker: { pos: K('wreck', 0, 16) } }),
    talk('thing', 'Go before the Kaupang Thing', 'klaw'),
    talk('home', 'Find Leif on the quay', 'leif'),
  ]),
  q_oath: Q('The First Oath', "Bjornstead celebrates the Sea-Raven's arrival with a feast.", null, 200, [
    talk('feast', "Hear Leif's story of the sea cave", 'leif'),
    talk('goat', 'Leif wants the goat put on trial', 'bjorn'),
    talk('ring', 'Bjorn is calling you forward', 'bjorn'),
    ev('eye', '{w} is back from a long flight over the sea', 'ravenEye'),
    ev('smoke', 'Look west, over the water', 'a2westsmoke'),
  ]),
});

const E = 'Eirik', F = 'Freydis', Bj = 'Bjorn', Kt = 'Kettil Red-Hand', L = 'Leif', O = 'Orm the reeve', G = 'Gisli', LW = 'The lawspeaker', KL = 'The lawspeaker of Kaupang';
const N = (t, o = {}) => ({ s: '', t, ...o });
Object.assign(DIALOGUE, {
  // ---- Chapter 1: Ten Winters ----------------------------------------------------------
  a2_wood1: [{ s: Bj, t: 'You swing that axe as though the tree insulted your mother.' }, { s: E, t: 'Maybe it did.' }],
  a2_wood2: [N('Bjorn takes the axe from him, sets a log and splits it with a lazy flick.'), { s: Bj, t: 'Strength is useful. Knowing where to put it is better.' },
    N("Behind them the village goat, Old Skeggi, is eating Bjorn's left boot, which Bjorn had taken off to shake out a stone.")],
  a2_freydis1: [{ s: F, t: 'You have frightened every wolf in the forest, but you still cannot speak to a girl at the harvest feast.' }, { s: E, t: 'I speak to you.' }, { s: F, t: 'That explains your problem.' }],
  // ---- Chapter 2: A Farmer's Life ------------------------------------------------------
  a2_hunt: [{ s: Bj, t: 'The feast is three days off and the smokehouse is half empty. Take the bow up into the birches by the stream. There was elk sign there.' }, // (game)
    { s: Bj, t: 'And take that white bird. She finds more than you do.' }],
  a2_hauk: [{ s: 'Hauk', t: 'The red cow was born in my barn. Every man here saw her born. She is mine.' }],
  a2_grjot: [{ s: 'Grjotgard', t: 'She wandered onto my land and ate my barley. By right of damages, she is mine now.' }],
  a2_cow: [N('The lawspeaker recites old laws for an hour.'), { s: Bj, t: "Grjotgard gets the cow's next calf, as payment for the barley. Hauk keeps the cow." }, N('Both men leave unhappy.'), { s: Bj, t: 'Which means it was a fair judgment.' }],
  a2_kaestur: [N('Kaestur: a shark that was buried in gravel for three months until it rotted enough to be safe to eat. It smells like a latrine pit that has died. Grown warriors pretend to love it.'),
    { s: F, t: 'One piece. I dare you.' }, N('He does.')],
  a2_kaestur2: [N('He keeps a perfectly calm face, walks behind the longhouse and throws up into the pig trough.'), N('The pigs eat that too.')],
  a2_wrestle: [N('Bjorn challenges Eirik to a wrestling match, as he does every year.')],
  a2_wrestle2: [N('This year Eirik could win. Everyone can see it. At the last moment he lets Bjorn throw him.'), { s: Bj, t: 'Next time you show mercy to an old man, make it less obvious.' }, N('The villagers roar.')],
  a2_idle_bjorn: [{ s: Bj, t: 'Hm.' }],
  // ---- Chapter 3: Smoke on the Ridge ---------------------------------------------------
  a2_tribute: [
    { s: Kt, t: 'Kettil Red-Hand, champion of Jarl Håkon Ironwolf. Bjornstead has not paid its tribute: a share of its harvest, its silver and its livestock. The jarl claims it now from every village on this coast.' },
    { s: Bj, t: 'Bjornstead has never paid Håkon anything, because it has never belonged to Håkon. Take a gift of dried fish, to keep the peace.' },
    N('Kettil laughs.'),
    { s: Kt, t: 'Twenty sheep. Half the grain store. And two of your young ones, to come with me as bonded thralls until the debt is paid.' },
    N('He points at two girls by the well.'),
    { s: Bj, t: 'No.' },
    N('Kettil hits him across the face with the back of his ruined hand. Eirik steps between them before he has decided to.', { fx: { do: 'slap' } }),
    N("Kettil looks at him, bored, and then his eyes stop on the scar over Eirik's left eye. Something moves in his face."),
    { s: Kt, t: 'You look like a boy I once saw running through the snow.' },
    N('Eirik goes cold to his fingertips.'),
    { s: Kt, t: 'That boy was supposed to die.' },
  ],
  // ---- Chapter 4: The Farmer's Axe -----------------------------------------------------
  a2_boy: [{ s: Kt, t: 'Who are you supposed to be?' }, { s: E, t: 'The boy who survived.' }],
  a2_wait: [{ s: Kt, t: 'Wait. Wait! I can tell you who—' }, N('Eirik raises the axe.'),
    N('Behind him, the barn roof cracks. Children are screaming inside. Six of them had hidden in the hayloft, and the fire has reached it.'),
    N('Eirik looks down at the man who killed his mother. Then he turns his back on him and runs into the burning barn.')],
  a2_well: [{ s: F, t: 'You had him.' }, { s: E, t: 'I had him.' }, { s: F, t: "Why didn't you—" }, { s: E, t: 'There were children in the barn.' },
    N('She sits down beside him and puts her head on his shoulder. Neither of them says anything else.')],
  // ---- Chapter 6: The Peddlers ---------------------------------------------------------
  a2_grim: [{ s: 'Grim', t: 'Combs, needles, glass beads! Knives, nearly sharp! And honey cakes for the little ones, no charge.' }, // (game: the story says only that they are friendly and ask a lot of questions)
    { s: 'Grimolf', t: 'A fine village. We heard a tall young man lives here. With a scar. A fighter, they say. Where would a man find him, of an evening?' },
    { s: E, t: 'People say a lot of things.' },
    { s: '{w}', t: 'Smell wrong. Iron under cloth.' }],
  a2_confess: [N('The second brother runs, gets tangled in the fishing net that Eirik strung across the path, and is sat on by Bjorn until he confesses everything.'),
    { s: 'Grimolf', t: "Hacksilver! The boy's weight in hacksilver, for his head! The Ironwolf pays it. Every market on the coast knows!" }],
  a2_outlaw: [N('The brothers are tried at the Thing the next morning.'), { s: LW, t: 'Grim and Grimolf: outlaws. Anyone may kill them, and no one may help them.' },
    N('Bjorn puts them on a leaky boat with two oars and a loaf of bread.')],
  a2_price: [{ s: Bj, t: "There's a price on you." }, { s: E, t: 'I know.' }, { s: Bj, t: 'And you know why?' }, { s: E, t: "I've never known why. My father was a farmer." },
    N('Bjorn looks at the fire for a long time.'), { s: Bj, t: 'A farmer who fought like a king\'s guard. Who owned an axe like that.' }, { s: Bj, t: "I don't know either, son. But I know Håkon doesn't spend silver on farmers." }],
  // ---- Chapter 7: Walls Before Winter --------------------------------------------------
  a2_leave: [{ s: 'Hauk', t: 'We should leave Bjornstead. Scatter to our kin inland. I have a cousin with good pasture and no wolves on his road.' }],
  a2_silver: [{ s: 'Grjotgard', t: 'Send the Ironwolf a gift of silver and beg for peace. It costs less than a wall, and it does not need digging.' }],
  a2_hand: [N('Two voices, low, that stop when he comes near.'), { s: 'Kol', t: '...easiest thing would be to hand him over. He is not even from here.' }, N('Eirik listens to every one of them.')],
  a2_speech: [N('It is the first time he has ever spoken in front of everyone, and his voice shakes.'),
    { s: E, t: "I won't ask anyone to fight for me. If you want me to leave, I'll leave tonight." },
    { s: E, t: "But if I go, Håkon's men will still come. He wants tribute from every village on this coast." },
    { s: E, t: 'We cannot promise that no enemy will ever come. But we can promise they will not find us sleeping.' },
    { s: Bj, t: "And we'll need food as much as walls. A village that starves behind a wall is just a grave with a fence." },
    N('The vote is close. Bjornstead votes to stay and build.')],
  a2_tally: [{ s: F, t: 'Work rotas, food, tool repairs. And a tally of who works and who hides. You are on the right side of it. So far.' }],
  a2_salt: [{ s: 'Signe', t: 'Dry it, salt it, hang it. Ask me again when my hands have stopped cracking.' }],
  // ---- Chapter 8: The Captain Without a Ship -------------------------------------------
  a2_list: [{ s: F, t: 'Iron, salt and grain. That is the list. That is the silver. Kaupang is four days down the coast, and old Odd is taking his boat.' }, // (game)
    { s: F, t: 'Do not let them see you counting.' }],
  a2_iron: [{ s: 'An ironmonger', t: 'Bar iron, Frankish. It is not cheap, and it is not getting cheaper while the Ironwolf buys every blade on the coast.' }],
  a2_saltbuy: [{ s: 'A salt-seller', t: 'Sea salt, clean, by the sack. A village that salts its fish in autumn eats in spring.' }],
  a2_grain: [{ s: 'A grain factor', t: 'Barley and rye, from Denmark. You look like a man whose own field burned.' }],
  a2_pen: [N('In a pen by the harbor, thralls with iron collars wait to be sold. Eirik has heard of slavery all his life. Seeing it is different.'), N('A girl his sister\'s age looks at him through the fence and does not look away.')],
  a2_quay: [{ s: L, t: 'That ship is mine! I built half of her myself!' },
    { s: O, t: "That ship belongs to the harbor until you pay your debts, Leif. Mooring fees. Gambling debts. The silver you borrowed from Thorkel's widow—" },
    { s: L, t: 'Borrowed is a strong word.' }, N('The man sees Eirik watching and instantly brightens.'),
    { s: L, t: 'You! You look like a man of taste. Would you like to buy a ship?' }, { s: E, t: 'Does it float?' }, { s: L, t: 'Of course.' }, { s: E, t: 'Does it sail?' }, { s: L, t: 'Usually.' },
    { s: E, t: 'Does it belong to you?' }, { s: L, t: 'That depends on how strictly you define belonging.' }, N('Eirik walks away. He does not expect to see Leif again.')],
  a2_sailor: [{ s: 'A drunk sailor', t: "Leif? Lost the crew's wages gambling, and borrowed to cover it. But the dice were Orm's. The reeve rigs his games. He wants that ship for himself." },
    { s: 'A drunk sailor', t: 'And the three youngest hands, the ones who cannot pay their share: he sells them at the thrall market in four days.' }],
  a2_barrel: [{ s: E, t: 'Your crew is going to be sold.' }, { s: L, t: 'I know.' }, { s: E, t: 'Then why are you drinking?' }, { s: L, t: 'Because I have no idea what else to do.' },
    N('They make a plan. A merchant knarr sank last spring on the rocks off the Skerries with a cargo of Frankish silver. Nobody dares dive it: the wreck lies in a sea cave the tide floods twice a day.'),
    N('Leif knows the waters. Eirik has a raven who can see the tide line from above.')],
  a2_left: [N('Gisli lives, coughing up seawater and seaweed. The basket of silver is gone forever into the cave.'),
    { s: L, t: 'You left the silver.' }, { s: E, t: 'The man was drowning.' }, { s: L, t: 'Yes, but there was a great deal of silver.' },
    N('Eirik just looks at him. Leif opens his mouth, closes it, and then starts laughing.'), { s: L, t: 'I suppose this is why people keep following you.' }],
  a2_kthing: [
    N("Eirik goes to the Kaupang Thing with Leif, the ship's builder's marks, and the drunk sailor as a witness."),
    { id: 'a', s: O, t: 'The ship belongs to the harbor. It was pledged, and the pledge fell due.' },
    { s: E, t: '', choices: [{ t: "Show the builder's marks cut in her keel", to: 'a2' }, { t: 'Call the sailor', to: 'no_a' }, { t: 'Lay the wreck silver on the stone', to: 'no_a' }] },
    { id: 'no_a', s: KL, t: 'That does not answer what was said.', to: 'a' },
    { id: 'a2', s: KL, t: 'The marks are his. She was his to pledge, and she is his to redeem.' },
    { id: 'b', s: O, t: 'He lost at dice like any fool. The debt stands.' },
    { s: E, t: '', choices: [{ t: "Show the builder's marks again", to: 'no_b' }, { t: 'Call the sailor who saw the games', to: 'b2' }, { t: 'Lay the wreck silver on the stone', to: 'no_b' }] },
    { id: 'no_b', s: KL, t: 'That does not answer what was said.', to: 'b' },
    { id: 'b2', s: 'A drunk sailor', t: 'The dice are his own. I have watched him change them under the table. Split one and see.' },
    { s: KL, t: 'The dice were weighted.' },
    { id: 'c', s: O, t: 'He still owes his mooring. And the widow.' },
    { s: E, t: '', choices: [{ t: 'Call the sailor again', to: 'no_c' }, { t: 'Lay the wreck silver on the stone', to: 'c2' }] },
    { id: 'no_c', s: KL, t: 'That does not answer what was said.', to: 'c' },
    { id: 'c2', s: KL, t: 'Orm will cancel the gambling debts, pay a fine, and free the sailors.' },
    N("Leif pays his real debts with the wreck silver, including every coin he took from Thorkel's widow, though it makes him visibly ill."),
  ],
  a2_come: [N('The ship is his again. But Leif has no money for a crew, no cargo and no home port.'),
    { s: E, t: 'Come to Bjornstead. We have a harbor. We need a ship. You need a place nobody is trying to sell you.' }, { s: L, t: "I'll stay until my debt to you is paid. Then we'll see." },
    { s: E, t: "You don't owe me anything." }, { s: L, t: "That is exactly why I'm worried." }],
  // ---- Chapter 9: The First Oath -------------------------------------------------------
  a2_tale: [{ s: L, t: 'And the cave, friends, was full of sea serpents. Three of them. No: four.' }, { s: G, t: 'There were no serpents.' }, // (game: the story says he makes himself the hero, the silver three times bigger and the cave full of serpents, and that Gisli corrects him at every sentence)
    { s: L, t: 'And the silver! Three baskets, each one the weight of a man.' }, { s: G, t: 'It was one basket. It is still down there.' },
    { s: L, t: 'And who went down alone into the dark for this boy?' }, { s: G, t: 'Eirik did. For me. You were putting coins in your shirt.' },
    N('The whole village loves him by the end of the night.')],
  a2_goat: [N("Old Skeggi the goat eats part of the Sea-Raven's spare sail. Leif tries to have the goat put on trial at the Thing for theft."),
    { s: Bj, t: 'The goat is not a free man, and therefore cannot be sued.' }],
  a2_ring: [N("Late in the evening, Bjorn stands up and calls Eirik forward. He slides a plain silver arm-ring onto Eirik's arm."),
    { s: Bj, t: 'Not because you are my son. You already are. Because today, people chose to follow you.', fx: { give: { arm_ring: 1 } } },
    N('The villagers cheer. Leif cheers loudest, then quietly checks how much the ring weighs.')],
});

/** The Wolf Remembers: who speaks, what is said, and who the camera is on (Chapter 5, word for word). */
export const HALL_LINES = [
  ['kettil', Kt, 'My lord. The farming village was stronger than expected.'], ['hakon', '', 'Håkon keeps eating.'],
  ['kettil', Kt, "There was a boy. A man now. A scar over his left eye. He carries Ragnar's axe."], ['hakon', '', 'Håkon stops chewing. The hall goes silent.'],
  ['hakon', 'Håkon', 'Ragnar had no living son.'], ['kettil', Kt, 'I thought the same, my lord.'],
  ['hakon', 'Håkon', 'Ten years ago you told me the boy was under the river. Did you see him die?'], ['kettil', Kt, 'No, my lord.'], ['hakon', 'Håkon', 'Then why are you still speaking?'],
  ['kettil', '', "Håkon takes the eating knife from his belt and cuts the wolf emblem from Kettil's cloak."], ['hakon', 'Håkon', 'You will earn this back.'],
  ['table', '', 'At the end of the table, Ulf Two-Blades snorts into his ale. Arne Longshot does not look up from fletching an arrow. Bersi Black-Anvil, huge and bald, keeps tearing at a lamb leg.'],
  ['rurik', '', 'Rurik Shieldsplitter is the only one who looks troubled.'],
  ['sigurd', 'Sigurd Stonehand', "Ragnar's son would be Halfdan's grandson. That is a problem for all of us."], ['hakon', 'Håkon', 'I know whose grandson he would be.'],
  ['table', '', "That night Håkon gives his orders. A bounty: the boy's weight in hacksilver for his head. Spies to every market on the coast. He does not send his army. Not yet."],
  ['hakon', 'Håkon', 'I want to know what he is. A lucky farmer with a sharp axe, or something worse.'], ['vigdis', 'Vigdis', 'And if he is something worse?'], ['hakon', 'Håkon', 'Then we cut the roots before the tree grows.'],
];

Object.assign(HINTS, {
  melee: '{weapon1} draws your blade. Tap {attack} to strike; hold it, then release, for a heavy blow. {block} guards; press it just as a blow lands to parry. {dodge} rolls clear. {lock} keeps one man in front of you.',
  guard: 'The lower bar on an opponent is his guard. Heavy blows and parries fill it. When it breaks he is open: hit him hard.',
  raid: '{harry} sends {b} at the face of the man you are fighting.',
  goat: 'Run him down. He will not be caught, but he can be turned.',
  eyeUp: 'Press {raven} to see through {w}. Fly with the movement keys; {dodge} climbs, {crouch} drops. Press {interact} when she sees something.',
  dive: 'Move with the movement keys. {crouch} dives, {dodge} rises. {interact} takes silver from the wreck. Come up beside the basket rope to empty your hands, and to breathe.',
});
