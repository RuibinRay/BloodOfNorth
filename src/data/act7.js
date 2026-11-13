// Act VII — "The Raven King": Eirik at twenty-nine. Cast, numbers, quests and dialogue for the eleven chapters.
// The words are the owner's (docs/story/THE_RISE_OF_THE_RAVEN_KING.md, Act VII). Where the story tells a thing
// without giving anyone a line, the line is the story's own sentence, spoken by nobody; the few lines the game
// needed that the story does not have are marked (game).
// Text tokens: {w} white raven, {b} black raven, {n} the name the family uses.
import { QUESTS, DIALOGUE, ITEMS, HINTS } from './act1.js';
import { place, GREAT, AT_SEA, POI } from '../world/layout.js';

const isle = (id) => { const s = GREAT.find((g) => g.id === id); return (dx, dz) => [s.x + dx, s.z + dz]; };
const Sv = isle('svartoy'), Sea = (dx, dz) => [AT_SEA.x + dx, AT_SEA.z + dz];
const P = (n, dx = 0, dz = 0) => { const p = place('svartoy', n, dx, dz); return [p.x, p.z]; };

/** Every number of Act VII that a designer would want to turn. */
export const A7 = {
  knack: { rocks: [3, 2.8, 0.26], lock: [2, 2.6, 0.3] },                                 // [good strokes, speed, width of the mark]
  volley: { every: 5.5, n: 7, dmg: 9 },                                                  // fire arrows on the fleet: how often, how many, what one costs a man with no shield up
  board: { hp: 64, dmg: 12, skill: 0.5, allyDmg: 9, n: 6, atOnce: 2, name: "One of Ulf's best", opt: { keepDry: true } }, // twenty of his best men, as six
  // Ulf and Kettil: at hp 340 and 280, with a boss's guard (two or three parries broke it, and the finisher on a broken
  // guard does triple), both were over in 11-24 s at every skill (bot playtest, 0.22). parryBreak: see champion().
  ulf: { hp: 700, dmg: 15, endAt: 0.2, parryBreak: 12 },                               // endAt: when he goes for the kill, and the black raven comes down
  shore: { hp: 58, dmg: 11, skill: 0.42, allyDmg: 10, n: 15, atOnce: 3, name: "One of Håkon's warriors" }, // five hundred hold the slopes: fifteen to a push
  rescue: { hp: 58, dmg: 11, skill: 0.42, allyDmg: 10, n: 4, atOnce: 3, name: "One of Håkon's warriors" },
  wall: [{ goal: 7, approach: 7.5, reserve: [10, 50] }, { goal: 6, approach: 8, reserve: [10, 40] }], // the two pushes up from the sand, as shield walls: paces of ground to win before they break (the rest is data/shieldwall.js)
  kettil: { hp: 420, dmg: 15, kneelAt: 0.14, parryBreak: 14 },
  pens: { hp: 60, dmg: 11, skill: 0.4, allyDmg: 10, n: 8, atOnce: 3, name: 'A guard of the pens' }, // "many more than twenty"
  // Vigdis: guard a parry wears (the Wolf's Table's 50 broke her guard in two, and the finisher on a broken guard took 40%
  // of her life at once); seconds between the bridge's beats; how long the Stormguard waits to turn her blow at 62%;
  // seconds her words take once it has (the next beat waits for them).
  vigdis: { hp: 400, dmg: 13, parryBreak: 30, beat: 7, wardFor: 15, talk: 17 }, gorm: { hp: 560, dmg: 28 },
  hakon: { hp: 760, dmg: 20, lastAt: 0.1 },                                              // from here he cannot be cut down: only the answer will do it
};

const folk = (o) => ({ build: 1, hair: 0x7a5a3a, tunic: 0x6a6a5a, ...o });
export const CAST7 = {
  kari: { name: 'Kári', role: "Astrid's brother, seventeen", look: { build: 0.86, scale: 0.96, hair: 0x1c1c20, hairStyle: 'short', tunic: 0x5a5448, legs: 0x3a342c, sleeve: null, face: 'lean', scar2: 'cheek' } },
  guide: { name: 'A guide of Myrholm', role: "One of Queen Thora's", look: folk({ hair: 0x8a8070, hairStyle: 'long', tunic: 0x4a5a3a, trim: 0xc9b27a, sleeve: 0x4a5a3a, build: 0.94 }) },
};

Object.assign(ITEMS, {
  oath_ring: { name: 'The broken oath-ring', desc: "Both halves of a gold oath-ring, snapped in two: the ring Ragnar, Håkon and Torvald swore on as young men when they became Halfdan's guards.", cat: 'Keepsake' },
});

const Q = (title, desc, next, xp, steps) => ({ title, kind: 'main', xp, next, desc, steps });
const ev = (id, text, key, o = {}) => ({ id, text, type: 'event', key, ...o });
const talk = (id, text, key, o = {}) => ({ id, text, type: 'talk', key, marker: { npc: key }, ...o });
const reach = (id, text, key, pos, o = {}) => ({ id, text, type: 'reach', key, marker: { pos }, ...o });
Object.assign(QUESTS, {
  q_firewater: Q('Fire on the Water', 'The fleet of the nine oaths approaches Svartøy on a grey morning in early spring. Rain falls on dark water. There are sixty-two ships.', 'q_blades', 400, [
    ev('torvald', 'The night before they sailed', 'a7starfall'),
    ev('fire', 'Fire! Smother what burns on the deck', 'a7fire', { count: 3, marker: { dyn: 'a7work' } }),
    ev('archers', 'Take the bow: their archers are raking the fleet', 'a7archer', { count: 4, marker: { pos: Sea(-3, 28) } }),
    ev('rocks', 'Leif takes eight ships round the end of the line', 'a7rocks', { marker: { pos: Sea(1.2, -6.4) } }),
    ev('ram', 'The floating wall breaks', 'a7ram'),
  ]),
  q_blades: Q('Two Blades, One Sea', 'Ulf leaps across onto the Sea-Raven with twenty of his best men.', 'q_blackshore', 520, [
    ev('leif', 'Leif meets him first', 'a7leif'),
    ev('board', 'Hold the Sea-Raven', 'a7held'),
    ev('ulf', 'Ulf Two-Blades', 'a7ulf'),
    talk('kit', 'Leif is sitting against the mast', 'leif'),
  ]),
  q_blackshore: Q('The Black Shore', 'About four hundred alliance warriors wade ashore through cold surf onto the black volcanic sand of Svartøy.', 'q_redhand', 560, [
    reach('wade', 'Wade ashore', 'a7wade', Sv(0, -226), { r: 7 }),
    ev('town', 'The harbor town: push the line off the sand', 'a7town'),
    ev('back1', 'A group of Vængr men is cut off: go back for them', 'a7back', { marker: { pos: Sv(-44, -196) } }),
    ev('road', 'The road: shove them up the slope', 'a7road'),
    ev('back2', 'Jarnøy men are cut off on the right: go back for them', 'a7back', { marker: { pos: Sv(34, -196) } }),
    reach('bend', 'On toward the bridge', 'a7bend', P('bend', -4, -14), { r: 8 }),
  ]),
  q_redhand: Q('The Red-Hand Returns', "At the bend in the road below the bridge, Håkon's reserve is waiting. Its commander sits on a black horse.", 'q_pens', 480, [
    ev('kettil', 'Kettil Red-Hand', 'a7kettil'),
  ]),
  q_pens: Q('The Pens', "On the far side of the island, Torvald's twenty land from the marsh boat in a hidden cove and climb up a goat path to Håkon's thrall pens.", 'q_vigdis', 420, [
    reach('gate', 'Torvald: the goat path, and the gate', 'a7gate', P('pens', 31, 4), { r: 4.5 }),
    ev('guards', 'Go through the gate with Star-Fall', 'a7guards'),
    ev('locks', 'Break every lock', 'a7lock', { count: 3, marker: { dyn: 'a7work' } }),
    ev('kari', 'Down the hill, into the rear of the army holding the bridge', 'a7kari'),
  ]),
  q_vigdis: Q('Vigdis, the Left Hand', "Håkon's army holds two last positions: the long bridge across the ravine, and the gate of the great hall.", 'q_gorm', 520, [
    reach('bridge', 'She waits for him alone on the bridge', 'a7bridge', P('bridgeN', 0, 10), { r: 5 }),
    ev('vigdis', 'Vigdis Quickblood', 'a7vigdis'),
  ]),
  q_gorm: Q('Gorm, the Right Hand', "Beyond the bridge, in front of the great hall's gate, stands Gorm Stone-Lung, the Right Hand.", 'q_wolfhall', 560, [
    reach('gate', 'The gate of the great hall', 'a7hallgate', P('hall', 0, -36), { r: 9 }),
    ev('gorm', 'Gorm Stone-Lung', 'a7gorm'),
  ]),
  q_wolfhall: Q('The Hall of Wolves', 'Eirik goes in alone. He tells the others to stay outside.', 'q_ironwolf', 200, [
    reach('enter', 'Go in alone', 'a7enter', P('hall', 0, -13), { r: 4 }),
    ev('speak', 'Håkon speaks first', 'a7speak'),
  ]),
  q_ironwolf: Q('The Ironwolf', 'The last fight of the war happens in four parts.', 'q_dead', 900, [
    ev('hakon', 'Jarl Håkon Ironwolf', 'a7hakon'),
    ev('ring', 'The broken oath-ring on the table', 'a7ring', { marker: { pos: P('hall', 0, 13.4) } }),
    reach('out', 'Walk out before the roof comes down', 'a7out', P('hall', 0, -24), { r: 5 }),
  ]),
  q_dead: Q('What the Dead Leave Behind', 'When Eirik walks out of the hall, the battle is over.', 'q_crown', 200, [
    talk('leif', 'Leif finds him on the steps of the burning hall', 'leif'),
    ev('hauk', 'Three days on Svartøy: Hauk is by the shore', 'a7hauk', { marker: { npc: 'hauk' } }),
  ]),
  q_crown: Q('The Crown of the North', "Six weeks later, every ruler of the ten islands gathers at Gulen's law-rock for the greatest Thing anyone has ever seen.", null, 1000, [
    ev('rock', 'Stand on the law-rock', 'a7crown', { marker: { pos: [POI.lawRock.x, POI.lawRock.z + 2] } }),
  ]),
});

const E = 'Eirik', L = 'Leif', Tv = 'Torvald', U = 'Ulf Two-Blades', K = 'Kettil Red-Hand', V = 'Vigdis Quickblood', G = 'Gorm Stone-Lung', H = 'Håkon', As = 'Astrid';
const N = (t, o = {}) => ({ s: '', t, ...o });
Object.assign(DIALOGUE, {
  // ---- Chapter 1: Fire on the Water ---------------------------------------------------------
  a7_starfall: [N('Eirik stands at the bow of the Sea-Raven. Leif is at the steering oar. Astrid is checking the string of Storm-Yew. Svanhild is checking her sword, and trying very hard not to be sick. {w} circles high above.'),
    N('The night before they sailed, Eirik went to find Torvald. The old man was sitting alone at the edge of the camp, sharpening a hammer he no longer had the right to carry in the shield wall. Eirik held out Star-Fall, the sky-iron hammer, black and heavy.'),
    { s: E, t: "Halvar didn't want me to give you this. I'm not sure I want to either. But Brokk said metal remembers every blow. Give it a good one to remember." },
    N('Torvald took it and could not speak.'),
    N("Now Torvald is on one of Queen Thora's flat-bottomed marsh boats with twenty volunteers and a Myrholm guide, slipping away from the fleet into the mist. They are heading for a hidden channel that leads to the back of Svartøy, where Håkon's thrall pens are."),
    N('{w} cries out, sharp and loud, in Eirik\'s mind.'), { s: '{w}', t: 'Fire!', fx: { do: 'fireCry' } }],
  // ---- Chapter 2: Two Blades, One Sea ----------------------------------------------------------
  a7_kit: [N("Leif is sitting against the mast, holding his shoulder, very pale. He opens Ingrid's little leather medical kit with his teeth and starts bandaging himself."),
    { s: L, t: 'A practical gift. She was right. Never tell her.' },
    N("Eirik helps him up. Ulf's ship is sinking. Without their commander, Håkon's remaining ships scatter. The fleet of the nine oaths breaks through into Svartøy's harbor.")],
  // ---- Chapter 4: The Red-Hand Returns -----------------------------------------------------------
  a7_kettil: [N("At the bend in the road below the bridge, Håkon's reserve is waiting. Its commander sits on a black horse."), N('Kettil Red-Hand.'),
    N('He is twenty years older than the young raider who chased a boy through the snow. His face is lined. His ruined right hand still wears its iron buckler. He has a new scar on his face from Bjornstead, and his wolf emblem is back on his cloak, earned by burning Ravenhold\'s harbor.'),
    N('He has spent twenty years living with the shame of losing to a boy, and then to a farmer. It has made him harder, more careful and more dangerous.'),
    { s: K, t: 'I should have killed you when you were a child.' }, { s: E, t: 'You tried. Twice.' },
    N('Kettil gets off his horse. They fight on the muddy road while the battle roars around them.', { fx: { do: 'dismount' } })],
  a7_knees: [N('Kettil falls to his knees in the mud. He looks up at Eirik, and for a moment he is just a frightened, ageing man.'),
    { s: K, t: 'Will killing me bring them back?' }, N('Eirik is quiet for a long time.'), { s: E, t: 'No.' }, N('The noise of the battle seems far away.'), { s: E, t: 'But you will kill no one else for him.' }],
  // ---- Chapter 8: The Hall of Wolves ---------------------------------------------------------------
  a7_hall: [N('The great hall is quiet. The sound of the battle outside becomes a distant roar. A long fire burns down the middle of the floor. Weapons line the walls on racks: swords, spears, axes, bows, shields. Old faded banners hang from the beams, some of them carrying the crowned raven of King Halfdan.'),
    N('Håkon sits alone in a carved high seat at the end of the hall. He is grey, broad, sixty years old and still powerful. In front of him on the table lies a broken gold oath-ring, snapped in two. It is the ring Ragnar, Håkon and Torvald swore on as young men when they became Halfdan\'s guards.'),
    N('Håkon speaks first.'), { s: H, t: "You have your grandfather's eyes." }, { s: E, t: 'You killed his daughter.' }, N('Håkon looks down.'), { s: H, t: 'Your mother was a good woman.' },
    { s: E, t: 'Do not speak of her.' }, { s: H, t: 'I knew her before you were born.' }, N('Eirik raises his axe.'), { s: E, t: 'Then you knew exactly what you were doing.' },
    N('Håkon stands. For the first time, he tells Eirik why.', { fx: { do: 'hakonUp' } }),
    N('After Halfdan died, the North tore itself apart. Jarls fought jarls for the crown. Farms burned. Trade stopped. Men were hanged for backing the wrong claimant. Children starved in winters that should have been easy. Håkon saw all of it.'),
    N("He came to believe that as long as anyone of Halfdan's blood lived, some ambitious jarl would always use them to start a new war. So he decided to end the bloodline, take the power himself, and rule the North with an iron hand until it learned to stop fighting."),
    N('He killed Ragnar and Ylva to prevent a greater war. He failed to kill their son.'), N('And now the boy has united the very rulers Håkon wanted to control.'),
    { s: H, t: 'You think you are different from me. Look outside. Hundreds of men have died because you came here.' },
    { s: E, t: 'They came because they chose to. Your men came because they feared what you would do if they refused.' },
    N('Håkon laughs, bitter and tired.'), { s: H, t: 'And when your allies disagree with you? When they refuse your laws? When they turn their swords on each other?' },
    N('Eirik does not pretend to have every answer.'), { s: E, t: 'Then I will have to earn their trust again.' },
    N('Håkon shakes his head slowly.'), { s: H, t: 'You sound like your father.' }, { s: E, t: 'He was a better man than either of us.' },
    N('Håkon reaches for his sword and shield.', { fx: { do: 'hakonArm' } }), { s: H, t: 'Then let us see whether his lessons can save you.' }],
  // ---- Chapter 9: The Ironwolf -------------------------------------------------------------------------
  a7_death: [N('Håkon falls.'), N('The great hall is silent except for the crackle of burning wood.'), N("Eirik kneels beside him. Håkon's eyes go to the broken oath-ring on the table.", { fx: { do: 'kneelBy' } }),
    { s: H, t: 'Will they remember me as a monster?' }, { s: E, t: 'They will remember what you did.' }, N('Håkon breathes in, slow and wet.'), { s: H, t: 'And what will they remember of you?' },
    N('Eirik looks toward the open doorway. Beyond it, in the smoke and grey light, are the warriors of nine islands and the thralls Torvald freed.'), { s: E, t: 'That is still mine to decide.' },
    N('Håkon Ironwolf dies.', { fx: { do: 'hakonDies' } })],
  // ---- Chapter 10: What the Dead Leave Behind --------------------------------------------------------------
  a7_steps: [N('Leif finds Eirik sitting on the steps of the burning hall. For once, he has no joke.'), { s: L, t: 'Is it finished?' },
    N('Eirik looks across the battlefield. Smoke. Dead men. Living men looking for their friends among the dead.'), { s: E, t: 'No.' }, N('Leif looks at the bodies.'), { s: E, t: 'The killing is.' }],
  a7_hauk: [N("They spend three days on Svartøy. They bury the dead of both sides. They count the living. Eighty-three of the alliance's four hundred have died. More than two hundred of Håkon's."),
    N('Eirik walks through all of it. He talks to the wounded. He helps search for the missing.'),
    N("He sits with Hauk, who came on this voyage for Ari's sake, while Hauk carves Ari's name on a stone by the shore.", { fx: { do: 'sitHauk' } }),
    N('Victory does not erase what war costs. It only means it stops.')],
});

/** The night camp is told; these are shown: the duel on the benches (Chapter 2, word for word). */
export const LEIF_LINES = [
  ['both', '', 'Ulf leaps across onto the Sea-Raven with twenty of his best men.', 'leap'],
  ['leif', '', 'Leif meets him first. Leif still has only one of his Twins, his long seax. In his other hand he carries the sword Ingrid gave him at their wedding.'],
  ['leif', L, 'A matched pair. Husband and wife. Want to meet them?'],
  ['both', '', 'The two of them fight up and down the rowing benches, both with two blades, both fast, both showing off. For a little while it is almost beautiful.', 'spar'],
  ['ulf', '', 'But Ulf is better. He is faster than anyone alive except Vigdis Quickblood. He opens a long cut across Leif\'s shoulder and kicks him back over a bench.', 'cut'],
  ['both', '', 'That is long enough for Eirik to get there.'],
];
/** How the duel with Ulf ends (Chapter 2, word for word). */
export const ULF_END = [
  ['ulf', '', 'Ulf goes for the kill: a scissor strike with both swords. {b} comes screaming down out of the smoke and hits him in the face. For one heartbeat Ulf turns his head.', 'sot'],
  ['both', '', "Eirik catches both swords on his shield, twists, and Raven-Feeder finds the gap under Ulf's arm.", 'gap'],
  ['ulf', '', 'Ulf staggers back to the rail and sits down on it. He looks almost surprised.', 'rail'],
  ['ulf', U, "I didn't run."], ['eirik', E, "No. You didn't."],
  ['ulf', '', 'Ulf Two-Blades falls backward into the sea.', 'fall'],
];
/** The pens: what Astrid sees (Chapter 5, word for word). */
export const KARI_LINES = [
  ['hill', '', 'They break every lock. Arvid takes a dead guard\'s sword and starts arming the others. The freed thralls pick up whatever they can find: axes from the woodpile, spears from the guards, stones.'],
  ['hill', '', "More than a hundred angry people who have nothing left to lose follow Torvald down the hill, straight into the rear of Håkon's army holding the bridge.", 'pour'],
  ['astrid', '', 'At the edge of the field, Astrid sees the thralls pouring down the slope. Her eyes go to a skinny young man near the front with a brand on his cheek and a fishing gaff in his hands. He is seventeen now. He was eight when she last saw him. She knows him anyway.'],
  ['astrid', As, 'Kári!'],
  ['kari', '', 'He turns. He stares. Then he drops the gaff and runs.', 'run'],
  ['two', '', 'Astrid, who has not cried in front of anyone since her family died, holds her little brother in the middle of a battlefield and sobs.', 'hold'],
  ['torvald', '', 'Torvald sits down against a rock, holding his side, and watches them. He thinks about his own daughter, who did not come home. He finds he can bear it a little better.', 'sit'],
];
/** Gorm, before Eirik faces him (Chapter 7, word for word). */
export const GORM_LINES = [
  ['gorm', '', 'He is almost twice the size of an ordinary man. He wears three layers of mail over thick leather. He carries a huge round shield bound in iron and a club with an iron head the size of a child. He has fought for Håkon for thirty years and has never been beaten.'],
  ['wide', '', "The alliance's best warriors try him first. Gorm sends them flying. A Jarnøy champion's axe bounces off his shield. A Vængr swordsman is knocked down so hard he does not get up.", 'try'],
  ['svan', '', 'Svanhild attacks him with every skill she has, and Gorm simply takes her cuts on his mail and shield and knocks her off her feet with one swing of his shield.', 'svan'],
  ['wide', '', 'Eirik tells her to pull the wounded back and hold the bridge end. Then he faces Gorm himself.', 'back'],
];
/** The law-rock (Chapter 11, word for word): who the camera is on, who speaks, what is said, and what happens. */
export const CROWN_LINES = [
  ['wide', '', "Six weeks later, every ruler of the ten islands gathers at Gulen's law-rock for the greatest Thing anyone has ever seen. Svartøy sends men too, chosen by its own people, frightened of what will happen to them."],
  ['crowd', '', 'They argue for four days. Some want Eirik to be an all-powerful king like Halfdan was. Some want each island to go its own way now Håkon is gone. A few say quietly what they all fear: that Eirik will simply become another Håkon.'],
  ['crowd', '', "Halfdan's ring proves Eirik's bloodline. Old Thrand's sworn testimony, written down by Hallvard's lawspeakers before he died, proves it. Torvald, standing before the whole Thing in disgrace, proves it again."],
  ['eirik', '', 'But Eirik stands on the law-rock and refuses to say that his blood makes him worthy.'],
  ['eirik', E, 'My mother was born to a king. My father died a farmer. The people who raised me owned no throne.'],
  ['bjorn', '', 'He looks across the crowd at Bjorn, leaning on his stick, and Signe beside him.'],
  ['eirik', E, 'They taught me that a home is not what a man takes. It is what he protects.'],
  ['eirik', '', 'He raises Raven-Feeder, its broken handle replaced with fresh ash wood by Halvar.', 'raise'], ['eirik', E, 'I will not ask you to kneel because of my blood.'],
  ['eirik', '', 'He lowers the axe.', 'lower'], ['eirik', E, 'I ask you to stand beside me because of what we can build.'],
  ['crowd', '', 'The rulers vote. Eirik becomes High King of the North, the first in thirty years. But it is a different kind of kingdom from Halfdan\'s. Every island keeps its own ruler and its own laws. The great Thing meets at Gulen every summer, and even the High King must answer to it. Disputes between islands go to the law, not to the sword.', 'vote'],
  ['eirik', '', 'His first laws as High King are short. No one may be made a thrall for debt anywhere in the North. Every captive taken by Håkon is free. Svartøy will not be plundered; its people will choose their own jarl at their own Thing, under the same law as everyone else.'],
  ['wide', '', 'It does not solve everything. There will be feuds. Some jarls will grumble. Some will plot. The North has not become a peaceful paradise in a day. But it has a beginning.'],
  ['birds', '', "The crowd at the law-rock begins to chant. Somebody started it as a joke, because of the two birds sitting on the High King's shoulders. By the end of the day, the whole North is saying it.", 'chant'],
  ['wide', 'The whole North', 'EIRIK RAVENSSON. THE RAVEN KING.', 'chant2'],
];
/** What is said over each fight, in the story's order (the champions' own lines are spoken by them). */
export const TOLD = {
  sea: ['From the cliffs of Svartøy, hundreds of fire arrows rise into the rain. They are wrapped in rags soaked in burning pitch, and the rain does not put them out. They fall on the fleet. Sails catch. Barrels of supplies catch.',
    'On the Kinn ship next to the Sea-Raven, a sail goes up in a sheet of flame and men leap into the freezing sea.'],
  wall: ["Out of the mist ahead come Håkon's warships: thirty of them, chained together bow to stern in a line across the harbor mouth. A floating wall.", 'On the prow of the biggest ship, a sword in each hand, stands Ulf Two-Blades. He has waited eight years for this.'],
  battle: ["The sea battle is a nightmare of fire, smoke and splintering wood. Ships ram each other. Oars snap. Men fight on burning decks and fall into the water between grinding hulls.", "Ragnvald's Kinn sailors steer as if they can feel the water. Astrid's archers rake the enemy decks. Fedje's ships carry big iron hooks that tear away the chains between Håkon's ships."],
  rocks: ['Leif knows these waters from his smuggling days. He takes eight ships around the end of the enemy line, through a passage so close to the rocks that the Sea-Raven scrapes paint off her side.',
    "Thora's marsh boats slip through a shallow channel too narrow for Håkon's big warships to follow, and attack the chained line from behind.", 'The floating wall breaks.'],
  ram: "But Ulf's flagship swings around and rams the Sea-Raven amidships.",
  duel: ['The final duel goes across the decks of both ships, locked together by the ram, both of them burning. Ulf has changed in eight years. Every trick he used on Jarnøy, he still has, and now he has counters for Eirik\'s counters. He talks the whole time.',
    "Ulf laughs, but his eyes are cold. They fight over the ram itself, a narrow beam above the black water. Then back onto the Sea-Raven. Stormguard flares three times. Eirik is bleeding from four places."],
  shore: ['Ahead of them, the island rises in terraces. A harbor town of burned-out warehouses. A road climbing through rocky slopes. A ravine crossed by a long wooden bridge. Above it, the upper town behind a palisade. At the very top, Håkon\'s great hall, its roof carved with wolves.',
    "About five hundred of Håkon's warriors hold the slopes, the bridge and the hall.",
    'Eirik divides his army. Astrid commands the archers. Svanhild leads the main shield wall. Leif, bandaged and swearing, brings reinforcements up from the ships. Ingrid sets up a field hospital in a fisherman\'s boathouse by the landing.',
    "The kings and jarls each hold part of the line: Hroald's armored Jarnøy men in the center, Jorund's Vængr swordsmen on the right, Ragnvald's sailors on the left."],
  slopes: ['The fighting on the slopes is not like a song. Nobody fights in heroic single combats while the armies wait. It is shoving, stabbing, falling, getting up again. Shield walls crash together and grind. Men slip in mud and blood.',
    'A Vængr captain falls and his men panic until Svanhild bellows at them to hold. Wounded men call for their mothers. Some enemy warriors fight to the death. Others throw down their weapons and run.'],
  back: ['Eirik can be in only one place at a time. Twice he has to choose between rescuing a cut-off group of allies and pushing on toward the bridge. Both times he goes back for the trapped men.',
    'It costs time. It also means that when the men of the nine islands look at him, they know he will come for them.'],
  kettil: ['Kettil fights dirty. He throws mud. He has a knife hidden in his buckler and another in his boot. He feints with the axe and stabs with the knife. He does not care about honor or glory. He wants to live, and he wants Eirik dead.',
    'But Eirik is not nineteen anymore. He has fought Arne and Rurik, Skarde and Eydis, Bersi and Ulf. He knows every trick Kettil has, because he has seen worse. He turns the knife, breaks the buckler strap, and knocks the axe from Kettil\'s left hand.'],
  seven: ['The seventh and last of Håkon\'s champions is dead. All seven have fallen.', "Word spreads along the enemy line like a crack through ice. The champions are gone. Many of Håkon's hired warriors, the ones paid with the Iron Circle's silver, decide they have not been paid enough to die. They start drifting back toward the upper town. Some throw down their weapons."],
  pens: ['The pens are long, low stone buildings that stink of unwashed people, rotten straw and despair. More than a hundred thralls are held there, along with the hostages Håkon took from the six islands: the sons and daughters of chieftains, among them Prince Arvid of Jarnøy, thin and filthy but alive.',
    'The guards are many more than twenty. Torvald does not care. He goes through the gate with Star-Fall and fights like a man who has finally found something worth dying for.'],
  locks: 'The sky-iron hammer breaks shields, doors and chains. His volunteers fight beside him. Seven of them die. Torvald takes a spear in the side and keeps going.',
  bridge: ["Håkon sends his two bodyguards to stop Eirik. The first is Vigdis Quickblood, the Left Hand.", 'She waits for him alone on the bridge. She is small, wiry, grey-eyed, with a twin seax in each hand and no shield. She does not shout or boast. She simply waits.'],
  vigdis: ['The moment Eirik steps onto the bridge, she is on him. She is faster than Ulf. Faster than anything. She does not stand and trade blows. She darts in, cuts, and is gone before he can swing. She comes from the left, then the right, then low, then from behind. In ten heartbeats she has cut him in three places.'],
  alight: "Then fire arrows from Håkon's last archers set the bridge alight. Smoke rolls across it. Planks start to fall away into the ravine. A railing collapses. The safe ground shrinks.",
  rhythm: ['She is too fast to chase and too fast to react to. Every time he answers her last attack, she is already making the next one. Eirik starts to understand that he will never catch her by being quicker.',
    'So he stops trying. He stops reacting to every movement. He breathes, the way he learned at the holmgang ground on Vængr. He watches the rhythm of her feet instead of her blades. She always steps twice before she strikes. Always the same rhythm, left-left, right-right.'],
  vigdisDown: ['Left-left. He raises the shield before the blade comes, and it lands right on it. Right-right. He turns, and her seax hisses past his ear. She frowns. For the first time, she hesitates. On the next left-left, he does not block. He steps in.',
    'Vigdis Quickblood dies on the burning bridge with both blades still in her hands. She was loyal to Håkon to the last, the only cause she had ever known.',
    'Eirik limps across. Behind him, a section of the bridge falls into the ravine in a shower of sparks. Svanhild and his warriors cross on the beams that remain.'],
  gorm: ["This is not a fight of speed. It is a fight of endurance. Gorm's attacks are slow, but each one could crush a horse. Eirik's attacks barely dent that shield. Every time he hits the mail, it is like hitting a wall.",
    "So Eirik does what Brokk would do: he looks for the weak points. He makes Gorm swing, and swing again, and swing again, until the big man's breath starts to rasp. He hits the shield's edge until the iron rim cracks. He cuts at Gorm's exposed fingers, his knees, the back of his ankle. He leads Gorm onto the slippery steps of the hall, where the giant's weight works against him."],
  gormShield: 'At last Gorm throws away his split shield and takes the club in both hands. Now he is faster and more dangerous than ever, but he is also open.',
  gormDown: ['He swings a crushing overhead blow. Stormguard flares, almost too weak now to answer. Eirik throws himself sideways. The club smashes the stone step where he was standing into gravel.',
    "Raven-Feeder comes around from the right and finds the gap at the side of Gorm's neck, between helmet and mail. Gorm sinks to his knees, then falls back against the great wooden gate of the hall."],
  alone: 'Eirik goes in alone. He tells the others to stay outside. Svanhild argues. Leif argues. Eirik just shakes his head.',
  guard: 'The sword of the guardsman. Håkon begins with sword and shield, the weapons of Halfdan\'s guard. He fights like the perfect warrior of the old songs: every block clean, every counter punishing. He reads Eirik\'s attacks before they begin. He is better than any of his champions.',
  war: 'The weapons of war. Håkon throws away the broken shield and moves to the weapon racks along the walls. He fights with a spear, then an axe, then a sword again, switching whenever Eirik gets used to one. He throws a bench into Eirik\'s legs. He kicks the hearth fire and sends coals into his face. He uses every trick of forty years of war, and the hall itself, against him.',
  hammer: ["Wolf's Judgment. At the end of the hall, Håkon takes down his own weapon: a great war hammer with a head of black iron ringed with short, cruel spikes. It is the hammer that killed Ragnar.",
    'The first blow smashes Eirik\'s shield to pieces. The second takes a chunk out of the wooden pillar beside his head. In the fighting, an iron brazier is knocked over. Burning oil spreads across the floor. The banners catch fire. Smoke fills the roof. Burning rafters crack overhead.'],
  cold: ['Håkon brings the hammer down in a blow that would kill anyone. Stormguard flares one last time. Eirik sees it coming, slips aside, and the spikes tear his cloak instead of his chest. Then the scar goes cold. The power is empty. He has used it all.', 'From here on, there is no magic. There is only what he has learned.'],
  last: ['The last oath. Both men are badly wounded. Both are slowing down. Every move costs them. The hall is burning around them.',
    "Håkon's hammer catches Raven-Feeder's handle and snaps the wood just below the head. But Brokk's iron collar holds, and the axe head stays on. Eirik is left with an axe a hand shorter than it should be.",
    'He remembers a summer day on a woodpile, his father laughing.'],
  wait: 'He stops attacking. He waits.',
  answer: ["Håkon raises Wolf's Judgment for the final blow, putting everything he has left into it.",
    "Eirik does not dodge. He meets the blow with the iron collar of the axe, turns his whole body with the force of it the way Bjorn taught him to split a log, letting the hammer's power carry him around in a full circle, and strikes from the right."],
  halves: 'Eirik picks up both halves of the broken oath-ring and puts them in his pouch. Then he walks out of the burning hall before the roof comes down.',
  over: ["Håkon's last warriors throw down their weapons. Svanhild orders the fighting stopped, and is obeyed. In the field hospital, Ingrid and Thora's healers work on wounded men from both armies. Astrid and Kári carry a wounded enemy warrior down the hill to them.",
    'Torvald, bandaged and grey-faced, sits among the freed thralls and gives them water. Prince Arvid finds his father, and King Hroald, who has not wept in front of anyone in twenty years, holds his son and does not let go.'],
};

/** What is said in the fights themselves (word for word): [speaker, line]. */
export const SAID = {
  ulf: [[U, 'All these years, I wondered whether the farmer had learned to fight.'], [E, 'All these years, I wondered whether you would stop running.']],
  vigdis: [['', 'Vigdis sees the flash in his scar when Stormguard saves him.'], [V, 'So the stories are true.'], [E, 'Most stories grow with every telling.'], [V, 'Then let us see what remains when you bleed.']],
  gorm: [['', 'With his last breath he says:'], [G, 'Håkon is waiting.'], ['', 'Eirik pulls Raven-Feeder free.'], [E, 'Then I should not keep him.'], ['', 'The gate is pushed open.']],
  hakon: [['', "He catches Eirik's axe on his shield and smiles."], [H, 'Your father always struck from the left.'], [E, 'He taught me to change.'], ['', "The next blow comes from the right and splits Håkon's shield."]],
};

Object.assign(HINTS, {
  fireDeck: 'Fire arrows. Hold {block} with a shield when they come down, and smother what burns on the deck ({interact}).',
  fireShore: 'Fire arrows from the slopes. Hold {block} with a shield when they come down, or keep moving.',
  rake: 'Draw the bow ({weapon2}), hold {block} to aim and draw, {attack} to loose. A full draw flies flat. Their archers are on the ship ahead, off the bow.',
  goBack: 'Go back for them. The line can wait.',
  wallPush: 'Stand in the line. When their horn sounds, hold {block}: the men near you hold with you. When they reel, sound your horn ({horn}) and the line goes forward. Kill the ones who come through.',
  asTorvald: 'Torvald carries Star-Fall in both hands: slow, and it breaks whatever it lands on. Hold {attack} for a blow into the ground.',
  endIt: 'Eirik ends it: {attack}.',
  feet: 'She steps twice before she strikes, always from the side: left, left, right, right. Stop chasing her. Watch the arrow at the edge of the screen, and raise your guard ({block}) on the beat.',
  weak: 'Nothing gets through that shield from the front. Make him swing, step out of it ({dodge}), and strike while he is still bent over the blow.',
  noMagic: 'The scar is cold: no Stormguard, no storm skills. Guard, step out, and strike when the hammer has landed on nothing.',
  meetIt: 'Stop attacking. Wait. When he raises the hammer for the last blow, do not dodge: meet it with {block}.',
});
