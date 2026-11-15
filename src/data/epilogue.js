// The Epilogue — "The Old Birch": twelve years later, Eirik is forty-one. Places, cast, quests and lines for the
// story's three parts (Ravenhold; Leif's House; The Last Lesson). The words are the owner's
// (docs/story/THE_RISE_OF_THE_RAVEN_KING.md, Epilogue). Where the story tells a thing without giving anyone a line,
// the line is the story's own sentence, spoken by nobody; the few lines the game needed that the story does not
// have are marked (game). Text tokens: {w} white raven, {b} black raven, {n} the name the family uses.
import { QUESTS, DIALOGUE, HINTS } from './act1.js';
import { MAIN } from '../world/layout.js';

const S = MAIN.find((m) => m.id === 'bjornstead'), B = (dx, dz) => [S.x + dx, S.z + dz];

/** Where things are in Ravenhold twelve years on, by offset from Bjornstead's centre (+x east, +z south, the sea). */
export const E8 = {
  start: [0, 226],                                   // the pier
  market: [0, 192],
  stones: { first: [-17, 50], n: 18, gap: 2.3 },     // the row of carved stones at the edge of town, running west from the north gate
  kids: [-32, 74], torvald: [-48, 69],               // the children's hall, and Torvald's small house beside it
  house: { at: [-50, 216], hl: 7, hw: 4, y: 4.35 },  // Leif's house by the harbor: 14 by 8, the door at the east end, a window to the sea
  mound: [-23, 15.0], stone: [-21.6, 20.6], top: [-17.4, 22.6], // Bjorn's mound under the old birch, the stone at its foot, where they stand
  fence: [44, 40], stream: [110, 46], drill: [92, 40],
  gate: [-8, 66],                                    // inside the north gate, where the evening walk begins
};
export { B as E8B };

const folk = (o) => ({ build: 1, hair: 0x7a5a3a, tunic: 0x6a6a5a, ...o });
export const CAST8 = {
  liv: { name: 'Liv', role: 'Leif and Ingrid\'s daughter, ten', look: { scale: 0.76, child: true, female: true, hair: 0x6a4a2a, hairStyle: 'braids', tunic: 0x3a5a6a, trim: 0xc9a24a, eyes: 0x6a9ab0, face: 'heart', mood: 'smirk' } },
  lbrokk: { name: 'Little Brokk', role: "Freydis's son, nine", look: { scale: 0.72, child: true, hair: 0xb5562a, hairStyle: 'tousled', tunic: 0x5a5448, trim: 0xe0c070, build: 1.08, face: 'broad', freckles: 1 } },
  apprentice: { name: 'An apprentice', role: "Halvar's", look: folk({ female: true, scale: 0.9, build: 0.9, hair: 0x4a3a2a, hairStyle: 'tail', tunic: 0x5a4a3a, apron: 0x3a2e24, sleeve: null }) },
  karison: { name: "Kári's son", role: '', look: { scale: 0.62, child: true, hair: 0x1c1c20, hairStyle: 'short', tunic: 0x4a5a3a } },
  fishseller: { name: 'A Svartøy fish-seller', role: '', look: folk({ hair: 0x3a3a3e, beard: 'long', tunic: 0x26262a, apron: 0x8a8070, build: 1.12, belly: 0.35 }) },
  ironman: { name: 'A Jarnøy iron-merchant', role: '', look: folk({ hair: 0x8a8880, hairStyle: 'short', beard: 'short', tunic: 0x5a2a24, trim: 0xc9a24a, sleeve: 0x5a2a24, build: 1.05 }) },
  farmer1: { name: 'A farmer', role: '', look: folk({ hair: 0x8a6a3a, beard: 'short', tunic: 0x6a5a3a }) },
  farmer2: { name: 'His neighbor', role: '', look: folk({ hair: 0x4a3a2a, beard: 'stubble', tunic: 0x4a5a4a, build: 1.1 }) },
};
/** Eirik at forty-one: the same man, a little grey, in the High King's cloak. (The player's own choices still lie over it.) */
export const EIRIK_41 = { scale: 1.0, build: 1.1, skin: 0xd8aa8a, hair: 0x9a7a4e, hairStyle: 'long', beard: 'full', grey: 0.1, temples: 0.7, age: 0.4, face: 'even', jaw: 0.97, chin: 0.34, ridge: 0.5, brows: 1.1, eyes: 0x86aec6, scar: 'lightning', tunic: 0x55664a, trim: 0xc9a24a, legs: 0x4a3f33, boots: 0x33261a, sleeve: 0x55664a, cloak: 0x2a3446 };

const Q = (title, desc, next, xp, steps) => ({ title, kind: 'main', xp, next, desc, steps });
const ev = (id, text, key, o = {}) => ({ id, text, type: 'event', key, ...o });
const talk = (id, text, key, o = {}) => ({ id, text, type: 'talk', key, marker: { npc: key }, ...o });
const reach = (id, text, key, pos, o = {}) => ({ id, text, type: 'reach', key, marker: { pos }, ...o });
const H = E8.house;
Object.assign(QUESTS, {
  q_ravenhold: Q('Ravenhold', 'Twelve years later. Eirik is forty-one. Ravenhold has become the busiest harbor in the North.', 'q_leifhouse', 200, [
    reach('market', 'Up from the pier to the market', 'e8market', B(...E8.market), { r: 8 }),
    ev('stones', 'The row of carved stones at the edge of town', 'e8stones', { marker: { pos: B(E8.stones.first[0], E8.stones.first[1] + 3) } }),
    talk('forge', "Brokk's old workshop: Halvar is master smith", 'halvar'),
    ev('folk', 'The people of Ravenhold', 'e8folk', { count: 5, marker: { dyn: 'e8folk' } }),
  ]),
  q_leifhouse: Q("Leif's House", 'Leif and Ingrid live in a big house near the harbor, with a view of the ships.', 'q_lesson', 150, [
    reach('door', "Leif's house by the harbor", 'e8door', B(H.at[0] + H.hl - 2.2, H.at[1]), { r: 2.4 }),
    ev('liv', 'Liv', 'e8liv'),
  ]),
  q_lesson: Q('The Last Lesson', 'That evening, the High King of the North walks up the hill behind Ravenhold to the old birch.', null, 300, [
    reach('hill', 'Up the hill to the old birch, with Little Brokk', 'e8hill', B(...E8.top), { r: 3.6 }),
    talk('lesson', 'Little Brokk', 'lbrokk'),
    ev('home', "The stone at the foot of Bjorn's mound", 'e8home', { marker: { pos: B(E8.stone[0] + 0.9, E8.stone[1] + 0.9) } }),
  ]),
});

const E = 'Eirik', L = 'Leif', I = 'Ingrid', LB = 'Little Brokk';
const N = (t, o = {}) => ({ s: '', t, ...o });
Object.assign(DIALOGUE, {
  e8_forge: [N("In Brokk's old workshop, Halvar is master smith. His forge makes fewer swords these days and more plough-blades, nails, pots and ship fittings. Above the door hangs Brokk's old forging hammer."),
    N('A young apprentice is hammering too hard and bending everything. Halvar stops her.', { fx: { do: 'stopHer' } }),
    { s: 'Halvar', t: 'Anyone can learn to strike iron. Learn first what the thing you make is meant to do.' },
    N("On the anvil sits Halvar's proudest work: the Thing-Ring.", { fx: { do: 'thingRing' } }),
    N("He melted down the two halves of the broken oath-ring from Håkon's hall, the ring Ragnar, Håkon and Torvald once swore on, together with King Halfdan's old ring. From them he made one great new ring."),
    N("It does not belong to the High King. It lives at Gulen's law-rock, and every ruler, the High King included, swears on it each summer before the Thing. Eirik insisted on that.")],
  e8_svanhild: [N("Svanhild trains the alliance's young warriors in the fields above town. Discipline, footwork, patience."),
    N('She is still the finest sword in the North. She is still seasick. Every time she sails to the summer Thing, Leif waits at the dock to watch her board.')],
  e8_astrid: [N("Astrid runs the hunters' and scouts' training on the mainland. Her brother Kári is her best student, though she will never tell him so; he married a girl from Myrholm and has a son who already tries to steal his aunt's arrows.", { fx: { do: 'steal' } }),
    N('Astrid has never married. She says she has not yet met a man who can outshoot her, and she is not in a hurry.')],
  e8_heal: [N('Old Hrefna is ninety and claims to be a hundred. She and Ingrid still argue about goat urine. They run the healing house together.')],
  e8_hall: [N('Bjorn died two winters ago, in his sleep, after a big supper and a long argument with Freydis about the price of salt.'),
    N("He is buried in a mound under the old birch on the hill, with his big bearded axe, a ham and a barrel of ale, because he said he was not going to walk into Odin's hall hungry. Half the North came to his funeral. Three kings carried his coffin."),
    N('Signe lives with Freydis now and still runs the household, and also, quietly, the town.')],
  e8_goat: [N('And Old Skeggi the goat is long gone. His great-grandson, also called Skeggi, eats rope, shoes and sails, and last month ate a letter from the King of the Danes.'),
    N('Leif tried to have him put on trial. Hallvard the Lawspeaker ruled, again, that a goat cannot be sued.')],
});

/** Up from the pier (said as he walks). */
export const HARBOR = ['Ravenhold has become the busiest harbor in the North. The old palisade still stands, but the town has spilled far beyond it: houses, workshops, gardens, a market where you can hear six languages before breakfast.',
  'Ships come in from Wessex, Frisia, Dublin and the far eastern rivers. Former enemies trade side by side.',
  'A Svartøy fish-seller and a Jarnøy iron-merchant argue over prices every morning and drink together every evening.'];
/** The stones (a scene): [who the camera is on, speaker, text, what happens]. */
export const STONE_LINES = [
  ['row', '', "At the edge of town stands a row of carved stones: one for every person from Ravenhold who died in the war. Ari Hauksson's is the first."],
  ['torvald', '', 'Every morning an old grey-bearded man walks there, sweeps the leaves off it, and stands for a while. It is Torvald. Nobody makes him do it anymore.', 'sweep'],
  ['wide', '', 'For years, Hauk refused to look at him. Last spring, Hauk came and stood beside him without a word.', 'hauk'],
  ['two', '', 'This spring, he brought two cups of ale.', 'cups'],
  ['hall', '', "Torvald lives in a small house by the children's hall, where the orphans of the war are raised. He teaches them to swim, to read the weather and to carry a shield. He never teaches them to fight angry."],
  ['house', '', 'Star-Fall hangs on his wall. He has never used it again.'],
];
/** Leif's house (a scene). */
export const LIV_LINES = [
  ['room', '', 'Leif and Ingrid live in a big house near the harbor, with a view of the ships. Leif owns four of them now. He is a respected merchant and the best captain in the North. He tells everyone he is fantastically rich.'],
  ['leif', '', 'Ingrid manages all his accounts, because he is still terrible at counting.'],
  ['liv', '', "Their daughter Liv is ten, with her mother's eyes and her father's grin. She is sitting on the table eating an apple and looking at her father with deep suspicion."],
  ['liv', 'Liv', 'Father. Is it true you once lost an entire ship in a game of dice?'],
  ['leif', L, 'That is an exaggerated story.', 'wave'],
  ['door', '', 'Ingrid walks in with a basket of herbs.', 'ingrid'],
  ['ingrid', I, 'He lost two.'],
  ['two', '', 'Liv laughs so hard she falls off the table. Leif catches her before she hits the floor, the way he once caught her mother in a hospital on Solvik.', 'fall'],
  ['twins', '', 'On the wall above the hearth hang the Twins, both of them, side by side. Ingrid gave back the short sword the day Liv was born. "For our daughter," she said. "Since we did not have sons, and since she is going to be much more frightening than any son."'],
  ['window', '', 'Leif, who grew up a starving dock-rat in Hedeby stealing fish heads, stands in his own warm kitchen with his wife and daughter laughing at him. For a moment he has to turn and look out the window, so nobody sees his face.', 'window'],
];
/** The walk up the hill (said as he walks). */
export const WALK = ["With Eirik is Freydis's son, Little Brokk. He is nine, the age Eirik was when the wolves came over the ridge. He has his mother's sharp tongue and his father's big hands, and he is carrying a wooden axe Halvar carved for him.",
  'He has been asking questions all the way up the hill.'];
/** The old birch (a scene). */
export const LESSON_LINES = [
  ['tree', '', "The lightning-split trunk has grown into two great crowns, leaning together. Bjorn's burial mound sits beneath it, green with grass. Below lie the fields, the town, the harbor, and beyond them the sea and the dark shapes of the ten islands."],
  ['boy', LB, 'Uncle, how many enemies have you killed?'],
  ['eirik', '', 'Eirik looks out over the fields.', 'look'],
  ['eirik', E, 'More than I ever wanted.'],
  ['boy', LB, 'Did that make you a great king?'],
  ['eirik', '', 'Eirik smiles, a little sadly.'],
  ['eirik', E, 'No.'],
  ['boy', LB, 'Then what did?'],
  ['fence', '', 'Eirik looks down the hill. A farmer is helping his neighbor mend a broken fence, both of them laughing about something.'],
  ['stream', '', 'By the stream, a group of children, some from Svartøy, some from Jarnøy, some from Ravenhold, are sharing a loaf of bread.'],
  ['two', '', 'He kneels down beside the boy.', 'kneel'],
  ['two', E, "Helping people build a life where they don't have to fight for every little thing."],
  ['boy', '', 'Little Brokk thinks about this for a long time.'],
  ['boy', LB, 'Then why do we learn to use an axe?'],
  ['axe', '', 'Eirik takes the wooden axe from him and turns it over in his hands, the way his father once did by a woodpile on the last warm day of autumn.', 'take'],
  ['eirik', E, 'Because sometimes the world forgets how to be kind.'],
  ['two', '', "He puts it back in the boy's hands.", 'give'],
  ['two', E, "But remember what your hands are for when you're not fighting."],
];
/** After the lesson (told), and what the young raven does. */
export const RAVENS = ['{w} died last winter, very old, with her feathers gone grey and her head on Eirik\'s hand. {b}, older still and as rude as ever, refuses to leave the birch and screams at anyone who walks under it.',
  "Now a young raven drops out of the branches and lands on the stone at the foot of Bjorn's mound. It is black, except for one single white feather on its wing. It is {w}'s granddaughter, hatched this spring in the old birch."];
export const HOME = ['It cocks its head and looks at Eirik.', 'And very faintly, so faint he is not sure he has not imagined it, a small voice like wind in feathers speaks in his mind for the first time.'];
/** The last of it: [where the camera is on its rise, speaker, text, what happens]. */
export const FINALE = [
  ['eirik', '', 'Eirik looks up. For a moment he is nine years old and his father is laughing on a woodpile. The same tree. The same sound of leaves in the wind. The same lesson, passed on.'],
  ['rise', '', 'The view rises above the hill, above the farms, above the town and the harbor, out over the sea and the ten islands, as a raven would see it.'],
  ['high', E, 'My father gave me an axe. My mother gave me a life. Bjorn and Signe gave me a home. My friends gave me something worth defending.'],
  ['high', E, 'I thought I wanted the men who took everything from me to die.'],
  ['high', E, 'Now I know what I wanted.'],
  ['high', E, 'I wanted no child to wake beneath a burning roof and find himself alone.'],
  ['sea', '', 'The young raven spreads its wings and flies out toward the sea.', 'fly'],
  ['sea', E, 'Let them remember our battles if they must. But let our children inherit something better than our wars.'],
];

Object.assign(HINTS, {
  folk: 'Walk through Ravenhold. Svanhild in the fields above town, Astrid at the butts, the healing house, the hall, and the Thing stones: {interact} to talk.',
  kneel: 'The young raven is on the stone. {interact} to kneel beside it.',
});
