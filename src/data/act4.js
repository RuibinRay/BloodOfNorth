// Act IV — "Blood Across the Sea": Eirik at twenty-two and twenty-three. Cast, numbers, quests and dialogue for the
// eight chapters. The words are the owner's (docs/story/THE_RISE_OF_THE_RAVEN_KING.md, Act IV). Where the story
// tells a thing without giving anyone a line, the line is the story's own sentence, spoken by nobody; the few lines
// the game needed that the story does not have are marked (game).
// Text tokens: {w} white raven, {b} black raven, {n} the name the family uses.
import { QUESTS, DIALOGUE, ITEMS, HINTS } from './act1.js';
import { place, AT_SEA } from '../world/layout.js';

const B = (n, dx = 0, dz = 0) => { const p = place('bjornstead', n, dx, dz); return [p.x, p.z]; };
const S = (dx, dz) => [AT_SEA.x + dx, AT_SEA.z + dz];                                   // on the Sea-Raven, out of sight of land
const X = (dx, dz) => { const p = place('wessex', 'quay', dx - 134, dz - 20); return [p.x, p.z]; }; // offsets from the centre of the Wessex shore
const H = (dx, dz) => { const p = place('hedeby', 'beach', dx + 80, dz - 150); return [p.x, p.z]; }; // offsets from the centre of Hedeby Sound
const SV = (n, dx = 0, dz = 0) => { const p = place('solvik', n, dx, dz); return [p.x, p.z]; };

/** Every number of Act IV that a designer would want to turn. */
export const A4 = {
  knack: { sun: [3, 2.2, 0.26], dice: [3, 2.4, 0.5], pull: [2, 3.0, 0.27], dig: [3, 2.8, 0.26], rope: [2, 3.2, 0.25] }, // [good strokes, speed, width of the mark]
  board: { hp: 56, dmg: 11, skill: 0.45, allyDmg: 8, n: 8, atOnce: 2, opt: { keepDry: true } },   // Rurik's men over the Sea-Raven's rail
  rurik: { hp: 320, dmg: 16, talkAt: 0.78, slipAt: 0.45 },                                   // when he knows the axe, and when Eirik slips on the wet oar
  looters: { n: 5, hp: 58, dmg: 11, skill: 0.45, astrid: [5, 26] },                           // Fedje: Astrid looses every [seconds] for [damage]
  skorpa: { hp: 56, dmg: 11, skill: 0.45, allyDmg: 8, n: 9, atOnce: 3 },                      // the last raid on the signal tower
  sound: { hp: 58, dmg: 12, skill: 0.5, allyDmg: 8, n: 6, atOnce: 2, opt: { keepDry: true } }, // boarders in the narrow channel
  ride: { walk: 6.5, gallop: 11.5 },
};

const folk = (o) => ({ build: 1, hair: 0x7a5a3a, tunic: 0x6a6a5a, ...o });
const king = (o) => ({ build: 1.08, hairStyle: 'long', beard: 'short', trim: 0xc9a24a, ...o });
export const CAST4 = {
  envoy: { name: "King Eystein's envoy", role: 'From Solvik, the Golden Quay', look: folk({ hair: 0xb09a5a, hairStyle: 'short', beard: 'short', tunic: 0x7a5a2a, trim: 0xe0c060, cloak: 0x6a2a24 }) },
  solcap: { name: 'The Solvik captain', role: "Master of Fafnir's Bed", look: folk({ build: 1.15, hair: 0x4a3a2a, beard: 'long', tunic: 0x7a5a2a, trim: 0xe0c060, helmet: true }) },
  wulfstan: { name: 'Wulfstan', role: "King Alfred's reeve", look: folk({ build: 0.96, hair: 0x6a6258, hairStyle: 'crop', beard: 'stubble', tunic: 0x3a4a6a, trim: 0xd8d2c2, cloak: 0x5a2a3a, sleeve: 0x3a4a6a, face: 'lean', nose: 'long' }) },
  priest: { name: 'A priest', role: 'Of the stone church', look: folk({ hair: 0x4a4038, hairStyle: 'balding', tunic: 0x2a2826, legs: 0x2a2826, sleeve: 0x2a2826, cloak: 0x2a2826, face: 'long' }) },
  mother: { name: "The girl's mother", role: 'A farmer of Wessex', look: folk({ female: true, scale: 0.95, build: 0.92, hair: 0x8a6a3a, hairStyle: 'bun', tunic: 0x6a5a48, apron: 0xcfc6ae }) },
  father: { name: "The girl's father", role: 'A farmer of Wessex', look: folk({ hair: 0x5a4a3a, beard: 'short', tunic: 0x5a5a44 }) },
  eystein: { name: 'King Eystein Goldhand', role: 'King of Solvik, the Golden Quay', look: king({ build: 1.05, hair: 0xb8984a, hairStyle: 'short', tunic: 0x7a5a2a, trim: 0xe0c060, cloak: 0x6a2a24, sleeve: 0x7a5a2a, face: 'round', full: 0.3, age: 0.45 }) },
  ragnvald: { name: 'King Ragnvald Stormwake', role: 'King of Kinn, the Storm Coast', look: king({ build: 1.2, hair: 0xc8c4bc, beard: 'long', tunic: 0x2f4a5c, cloak: 0x26323c, sleeve: 0x2f4a5c, face: 'broad', skin: 0xc8946e, hairStyle: 'mane', age: 0.8, nose: 'hooked', rosy: 0.45, brows: 1.4, stoop: 0.15, eyeShape: 'round' }) },
  hallvard: { name: 'King Hallvard the Lawspeaker', role: 'King of Gulen, the Law Isle', look: king({ build: 0.98, hair: 0x9a968e, beard: 'long', tunic: 0x4a4a52, cloak: 0x34343c, sleeve: 0x4a4a52, face: 'gaunt', nose: 'long', recede: 0.5, part: 'center', age: 0.65, heft: 0.9 }) },
  aslak: { name: 'King Aslak', role: 'King of Fedje, the Wind Isle', look: king({ build: 1.15, hair: 0x8a3a1c, hairStyle: 'short', tunic: 0x4a5a3a, cloak: 0x3a4a2e, sleeve: 0x4a5a3a, beard: 'full', face: 'square', nose: 'broad', freckles: 0.3, belly: 0.2, heft: 1.06 }) },
  svein: { name: 'King Svein', role: 'King of Skorpa, the Beacon Isle', look: king({ build: 1.0, hair: 0x7a5a3a, hairStyle: 'crop', beard: 'stubble', tunic: 0x8a7a4a, cloak: 0x6a5a34, sleeve: 0x8a7a4a, face: 'even', rosy: 0.65 }) },
  peddler: { name: 'A ragged peddler', role: '', look: folk({ hair: 0x4a4038, hairStyle: 'long', beard: 'stubble', tunic: 0x5a5444, cloak: 0x4a4436, build: 0.92 }) },
  hrefna: { name: 'Old Hrefna', role: 'Herb-woman and seeress', look: folk({ female: true, scale: 0.9, build: 0.88, hair: 0xd8d4cc, hairStyle: 'bun', tunic: 0x4a4438, apron: 0x6a6252, cloak: 0x3a3a30, age: 1, face: 'gaunt', nose: 'hooked', eyes: 0x6a8a9a, brows: 0.7, lips: 'thin', rosy: 0.15, stoop: 0.9, heft: 0.88, eyeShape: 'deep', corners: 0.2 }) },
  boy: { name: 'The missing boy', role: '', look: { scale: 0.7, child: true, hair: 0xb89a5a, hairStyle: 'short', tunic: 0x7a5a2a } },
};
export const MONK = folk({ hair: 0x5a4a3a, hairStyle: 'bald', tunic: 0x5a4a38, legs: 0x5a4a38, sleeve: 0x5a4a38, build: 0.95 });

Object.assign(ITEMS, {
  token: { name: "King Alfred's token", desc: "A silver token with Alfred's name on it, recognizing that his men brought the cargo safely. He does not think much of it. Later, it will open doors with every king who trades with England.", cat: 'Keepsake' },
  safe_letter: { name: 'Letter of safe passage', desc: "Sealed by Wulfstan, King Alfred's reeve, who counted every arm-ring twice.", cat: 'Keepsake' },
});

const Q = (title, desc, next, xp, steps) => ({ title, kind: 'main', xp, next, desc, steps });
const ev = (id, text, key, o = {}) => ({ id, text, type: 'event', key, ...o });
const talk = (id, text, key, o = {}) => ({ id, text, type: 'talk', key, marker: { npc: key }, ...o });
const reach = (id, text, key, pos, o = {}) => ({ id, text, type: 'reach', key, marker: { pos }, ...o });
Object.assign(QUESTS, {
  q_gold: Q('The Golden Voyage', 'Two quiet years pass. Ravenhold grows. Then a ship arrives from Solvik, the Golden Quay, the richest of the islands.', 'q_water', 120, [
    talk('torvald', 'Torvald drills the village warriors every morning', 'torvald'),
    ev('envoy', 'A ship has come in from Solvik', 'a4envoy', { marker: { pos: B('pier', 0, -15) } }),
    talk('ari', 'Ari Hauksson, sixteen now, has something to beg', 'ari'),
    ev('sail', 'Board the Sea-Raven: the escort sails', 'a4sailed', { marker: { pos: B('pier', -2.2, 4) } }),
    talk('sun', 'The first days: Leif is teaching Ari the sunstone', 'leif'),
    talk('belt', 'Gisli needs a friend to hold his belt', 'gisli'),
    talk('wash', 'Ingrid: hands, in seawater, before eating', 'ingrid'),
    ev('dice', "Every evening: Leif's dice", 'a4dice', { marker: { npc: 'leif' } }),
  ]),
  q_water: Q('Wolves on the Water', 'On the sixth day, {w} sees movement behind a fog bank.', 'q_court', 320, [
    ev('eye', 'See what {w} has seen behind the fog bank', 'ravenEye'),
    ev('ships', 'Mark the three longships', 'a4longship', { count: 3 }),
    ev('offer', 'Rurik Shieldsplitter calls across the water', 'a4offer'),
    ev('board', "Hold the Sea-Raven's side", 'a4held'),
    ev('rurik', 'Rurik Shieldsplitter', 'a4rurik'),
    talk('torvald', 'That night: ask Torvald what Rurik meant', 'torvald'),
  ]),
  q_court: Q('The English Court', "Fafnir's Bed arrives in Wessex nine days later, at a busy trading port where the River Itchen meets the sea.", 'q_circle', 160, [
    reach('port', 'Go up from the quay into the port', 'a4port', X(100, 20), { r: 9 }),
    talk('wulfstan', "Deliver the cargo to King Alfred's reeve", 'wulfstan'),
    ev('farm', "A farming family's little girl is burning with fever", 'a4fever', { marker: { pos: X(-60, 43) } }),
    ev('herbs', 'Go from market to market with Leif for the herbs she needs', 'a4herb', { count: 3, marker: { dyn: 'a4work' } }),
    ev('watch', 'Take the herbs to Ingrid, and keep watch', 'a4watch', { marker: { pos: X(-60, 43) } }),
    ev('wall', 'That evening: the harbor wall', 'a4wall', { marker: { pos: X(148, 72) } }),
  ]),
  q_circle: Q('The Iron Circle', "On the voyage home, Torvald and Eirik go through the sealed chest taken from Rurik's ship.", 'q_six', 80, [
    ev('chest', 'Open the sealed chest with Torvald', 'a4chest', { marker: { pos: S(-0.9, 5.4) } }),
    ev('sleep', 'Sleep', 'a4sleep', { marker: { pos: S(0.4, -4.4) } }),
  ]),
  q_six: Q('Six Islands Burning', 'On the last day of the voyage, Astrid climbs the mast and goes very still.', 'q_council', 360, [
    talk('smoke', 'Astrid has gone very still at the masthead', 'astrid'),
    ev('kinn', 'Kinn: pull the survivors out of the burning harbor', 'a4kinn', { count: 3, marker: { dyn: 'a4work' } }),
    reach('trail', 'Fedje: hunt the raiders who stayed behind to loot', 'a4trail', [196, 594], { r: 15 }),
    ev('looters', 'Take them', 'a4looters', { marker: { pos: [207, 594] } }),
    talk('refugees', 'Escort the boatloads of refugees to Ravenhold', 'freydis'),
    ev('skorpa', 'Skorpa: defend the signal tower against a last raid', 'a4skorpa', { marker: { pos: [-230, 1040] } }),
    ev('gulen', "Gulen: carry the wounded to Ingrid on Bjorn's grey horse", 'a4gulen', { count: 3, marker: { dyn: 'a4work' } }),
    ev('dig', 'Solvik: dig with them', 'a4dig', { count: 2, marker: { pos: SV('quay', 44, 44.6) } }),
    ev('eye', 'That night: {w}', 'ravenEye'),
    ev('boy', 'Fly south along the shore and mark what she has found', 'a4boy'),
    reach('cave', 'The sea cave on the south shore', 'a4cave', SV('cave', 0, -6), { r: 11 }),
    talk('wise', 'Ingrid has worked until she fell asleep standing up', 'ingrid'),
  ]),
  q_council: Q('The Council of Six', 'In the first frost, the six kings come to Ravenhold.', 'q_sound', 200, [
    reach('hall', "The kings meet in Bjorn's longhouse", 'a4hall', B('hall', 2, 17), { r: 9 }),
    ev('kings', 'Listen to the six kings', 'a4king', { count: 6 }),
    talk('speak', 'Then he speaks', 'bjorn'),
    talk('token', 'Show King Eystein the silver token from King Alfred', 'eystein'),
  ]),
  q_sound: Q('The Betrayal at Hedeby Sound', 'A week later, a letter reaches Torvald.', 'q_drift', 420, [
    ev('letter', 'A week later', 'a4ribbon'),
    ev('convoy', 'Board the Sea-Raven: the convoy sails south', 'a4convoy', { marker: { pos: B('pier', -2.2, 4) } }),
    ev('eye', 'Send {w} ahead to read the signal fires', 'ravenEye'),
    ev('fire', 'Mark the headland where the fire burns', 'a4third'),
    ev('ropes', 'Cut the burning ropes', 'a4rope', { count: 2, marker: { dyn: 'a4work' } }),
    ev('rocks', 'Steer by {w}: mark the rocks ahead', 'a4rock', { count: 3 }),
    ev('haul', 'Haul them out of the water', 'a4haul', { count: 3, marker: { dyn: 'a4work' } }),
    ev('deck', 'They are coming over the side', 'a4deck'),
    ev('ari', 'Ari', 'a4ari', { marker: { npc: 'ari' } }),
    reach('beach', 'Nightfall: walk the beach looking for survivors', 'a4beach', H(-83, 139), { r: 8 }),
    ev('swing', 'Torvald', 'a4swing'),
    ev('alone', 'That night, alone', 'a4alone', { marker: { pos: H(-74, 166) } }),
  ]),
  q_drift: Q('Driftwood', 'The survivors limp back to Ravenhold. It is worse there.', null, 60, [
    talk('freydis', 'Freydis meets him at the gate', 'freydis'),
    ev('hauk', 'Hauk is waiting on the pier', 'a4hauk', { marker: { npc: 'hauk' } }),
    reach('birch', 'Later: the old birch on the hill', 'a4birch', B('birch', 3, 6), { r: 9 }),
    ev('home', 'Home?', 'a4home'),
  ]),
});

const E = 'Eirik', L = 'Leif', In = 'Princess Ingrid', As = 'Astrid', Tv = 'Torvald', Ru = 'Rurik Shieldsplitter', Ey = 'King Eystein';
const N = (t, o = {}) => ({ s: '', t, ...o });
Object.assign(DIALOGUE, {
  // ---- Chapter 1: The Golden Voyage -------------------------------------------------------
  a4_years: [N('Two quiet years pass. Ravenhold grows. The Jarnøy smiths teach a dozen apprentices. The Sea-Raven carries trade up and down the coast.'),
    N('Freydis builds a proper market by the harbor and charges every merchant a small fee, which Leif calls robbery and Freydis calls taxes.'),
    N('Ingrid sets up a healing house and fights a long, bitter war with Old Hrefna over the use of goat urine.'),
    N('Torvald drills the village warriors every morning, and Eirik learns hammer-work, formations and battlefield command from him. He comes to love the old man like an uncle.')],
  a4_envoy: [N('Then a ship arrives from Solvik, the Golden Quay, the richest of the islands.'),
    N('King Eystein Goldhand is sending a great cargo ship to the court of King Alfred of Wessex in England: silver, worked Jarnøy iron, amber from the eastern sea, walrus ivory, furs, fine cloth and a gift of gold arm-rings for the English king.'),
    N("It is the most valuable cargo Solvik has ever sent. The ship is a huge, fat-bellied knarr called Fafnir's Bed, named after the dragon who slept on gold."),
    N('Eystein is afraid Håkon will take it. He offers Ravenhold a fortune to help guard it.'),
    N("Eirik agrees. Ten of Ravenhold's best go with him, along with forty of Solvik's own guards, fifty armed escorts in all. Leif commands the Sea-Raven as the escort ship. Astrid, Ingrid and Torvald come along."),
    N('Brokk stays home.'), { s: 'Brokk', t: 'The sea is for fish and fools.' }],
  a4_ari: [N("Ari Hauksson, sixteen now and taller than his father, begs to come as a ship's boy."), N('Eirik says yes. Hauk is not happy.', { fx: { do: 'ariyes' } }), N('Ari is so excited he cannot sleep for two nights.')],
  a4_sun: [N('The first days at sea are wonderful. Sailors sing rowing songs. Merchants argue about prices.'),
    N('Leif teaches Ari to read the swell and to use a sunstone, a clear crystal that shows where the sun is through cloud.')],
  a4_belt: [N('The days are also disgusting. There are no private places on a ship. Everyone relieves themselves over the side while a friend holds their belt.', { fx: { do: 'belt' } }),
    N('The bilge stinks of old fish, vomit and wet wool. By the fourth day everyone has lice. The salted herring is green at the edges.')],
  a4_wash: [N('Ingrid makes everyone wash their hands in seawater before eating, and the sailors think she has gone mad.')],
  a4_dice: [N('Leif plays dice every evening and wins every game.')],
  a4_dice2: [N('Ingrid watches him for three nights, then picks up his dice and drops them in a cup of water. They both roll the same way, every time, because they are weighted.', { fx: { do: 'cup' } }),
    N('She confiscates his winnings and returns them to the sailors.'), { s: L, t: 'That is theft.' }, { s: In, t: 'Then you have finally learned what it feels like.' }],
  // ---- Chapter 2: Wolves on the Water --------------------------------------------------------
  a4_offer: [N('On the prow of the lead ship stands a tall warrior with a long sword and a plain round shield painted half black, half white.'),
    N("He is Rurik Shieldsplitter, the champion with a code. He has never killed a man who surrendered, never burned a house with people in it, never broken an oath. Men say he is the only one of Håkon's seven who could look his own mother in the eye."),
    N("Rurik's ships surround Fafnir's Bed. He calls across the water: give up the cargo, and every man aboard goes home alive."),
    N("The Solvik captain shouts back an insult about Rurik's mother. Rurik sighs and gives the order.", { fx: { do: 'order' } })],
  a4_shield: [N('Rurik catches Raven-Feeder on his shield and freezes.'), { s: Ru, t: 'Your father once carried that weapon.' }, { s: E, t: 'You knew him?' }, { s: Ru, t: 'I fought beside men who knew him.' },
    N('Rurik glances past Eirik, at Torvald on the deck of the knarr, and something passes over his face.'), { s: Ru, t: 'Torvald Grey-Cloak. So this is where you went.' }, N('Torvald says nothing.'),
    { s: E, t: 'Then you know what happened to my father.' }, N('Rurik lowers his sword a little.'), { s: Ru, t: 'I know there are orders a warrior should refuse.' }, { s: E, t: 'Yet here you are.' }, N("Rurik's jaw tightens. He attacks again.")],
  a4_rurik: [N('Rurik sits down against the mast. He is dying and he knows it.'), { s: Ru, t: 'Good. You fight for something more than revenge. I could see it.' }, N('He coughs blood.'),
    { s: Ru, t: 'Ask the grey-cloak where he was the night before the first snow.' }, N('Then he dies.')],
  a4_night: [N('That night Eirik asks Torvald what Rurik meant.'), N('Torvald looks at the sea for a long moment.'),
    { s: Tv, t: 'Rurik and I served the same king once, long ago. So did your father. So did Håkon. We all went different ways when the king died.' }, N('He shrugs.'), { s: Tv, t: 'Dying men say strange things.' },
    N('Eirik accepts it. He loves Torvald. He does not want to doubt him.')],
  // ---- Chapter 3: The English Court --------------------------------------------------------------
  a4_wulfstan: [N("The cargo is delivered to King Alfred's reeve, a careful, polite man named Wulfstan who counts every arm-ring twice. The gifts are received."),
    N("In return, Eirik is given a sealed letter of safe passage and a silver token with Alfred's name on it, recognizing that his men brought the cargo safely.", { fx: { give: { token: 1, safe_letter: 1 } } }),
    N('Eirik does not think much of it. Later, it will open doors with every king who trades with England.')],
  a4_fever: [N("In the town, a farming family's little girl is burning with fever. The local healer has given up. Ingrid goes to help."),
    N('Some of the townspeople do not want a Norse woman touching a Christian child. A priest shouts at her.', { fx: { do: 'priest' } }), N('Ingrid does not leave.'),
    { s: In, t: 'A fever does not care which god you pray to.' }, N('She cools the child with wet cloths, makes willow-bark tea and stays awake with her for two nights.')],
  // ---- Chapter 4: The Iron Circle ------------------------------------------------------------------
  a4_letters: [N('Inside are letters written in runes on thin wooden slips and on parchment.'),
    N('The letters reveal something none of them suspected. Håkon is not alone. A secret alliance of wealthy jarls, calling themselves the Iron Circle, is paying for his ships, weapons and mercenaries.'),
    N('They arrange marriages, buy hostages and bribe island lawspeakers. Their plan is to put every island under Håkon and then rule through him. One name appears again and again: Sigurd Stonehand.'),
    N('There is also something stranger. Several letters mention old King Halfdan the Grey, dead for thirty years. One contains a single line Eirik reads three times.'),
    N('Confirm the bloodline is ended before the North is crowned.'), N('Eirik does not understand it.'), N('Torvald does. His face goes grey.')],
  // ---- Chapter 5: Six Islands Burning -----------------------------------------------------------------
  a4_smoke: [{ s: As, t: 'Smoke. Everywhere.' },
    N('Håkon has struck all six islands around his own: Jarnøy, Solvik, Kinn, Gulen, Fedje and Skorpa, all in the same week. He did not try to conquer them. He did something worse.'),
    N('He burned their harbors, sank their fishing boats, stole their grain right before winter and carried off hostages: sons and daughters of chieftains, held on Svartøy to guarantee obedience.'),
    N('The message is simple: Anyone who helps Ravenhold will starve.')],
  a4_refugees: [N('They escort boatloads of refugees to Ravenhold.')],
  a4_never: [N('What they see never leaves them. Homes full of smoke and rotting food. Cows wandering with no one to milk them, bellowing in pain. Dead dogs in the streets.'),
    N('Wounded men whose cuts have gone green and stinking because no one cleaned them; Ingrid has to cut away rotting flesh while Leif holds them down, and Leif throws up afterward every single time.')],
  a4_wise: [N('Ingrid works until she falls asleep standing up. Leif catches her and carries her to a bed. When she wakes, he is asleep on the floor beside it.', { fx: { do: 'wake' } }),
    { s: L, t: "I was wrong. About what I said in England. You're not giving it away because you never had nothing. You're giving it away because you know what nothing is like for other people." },
    N('Ingrid looks at him for a long time.'), { s: In, t: "That's the first wise thing you've ever said." }, { s: L, t: "Don't get used to it." }],
  // ---- Chapter 6: The Council of Six -----------------------------------------------------------------------
  a4_speak: [N('Eirik listens for a long time. Then he speaks.'),
    { s: E, t: "Håkon didn't attack you to conquer you. He attacked you to make you afraid of each other, and afraid of helping me. If each of us fights alone, he will destroy us one by one. If we stand together, he has to fight all of us at once." },
    N('He proposes an alliance for defense. They share ships, food, iron and warriors. An attack on one is an attack on all.'), N('Bjorn backs him.')],
  a4_token: [N('So, surprisingly, does Eystein, after Eirik shows him the silver token from King Alfred.'),
    { s: Ey, t: 'If my merchants are known in Wessex as friends of the man who beat Rurik Shieldsplitter, perhaps trade will survive after all.' },
    N("The kings agree. They choose Eirik to command the alliance's defense. He is not a king. His only power is the trust of six kings and the oaths they swear.", { fx: { do: 'agree' } }),
    N("But there is a problem. Håkon's harbor on Svartøy is the strongest in the North. Three other islands, Vængr, Myrholm and Skalløy, refuse to join either side. Without them, the alliance cannot win.")],
  // ---- Chapter 7: The Betrayal at Hedeby Sound -------------------------------------------------------------------
  a4_ari2: [N('Ari Hauksson, the boy who wanted so badly to be a warrior, is on the deck of the Sea-Raven passing arrows to Astrid when a spear from an enemy ship takes him in the chest.'),
    N('Eirik holds him as he dies. Ari is trying to say something about his father. He never finishes.')],
  a4_torch: [N("In Torvald's hand is a blackened signal torch. On the headland above them, the wrong fire is still burning."), N('Eirik understands everything at once.'),
    { s: E, t: 'You led them here.' }, N('Torvald says nothing.'), N('Eirik raises Raven-Feeder. His hands are shaking.', { fx: { do: 'raise' } }), { s: E, t: 'How many of them called you brother?' }, N('Torvald answers quietly.'), { s: Tv, t: 'All of them.' }],
  a4_between: [{ s: In, t: "If you kill him now, you'll never know why. And you'll become what he is." }, N('Eirik stands there for a long time, breathing hard.')],
  // ---- Chapter 8: Driftwood ----------------------------------------------------------------------------------------
  a4_gate: [N('While the fleet was away, Kettil Red-Hand attacked with three ships to earn back his wolf emblem. He knew the warriors were gone. He thought Ravenhold would be easy.'),
    N("It was not. The walls held. Freydis organized the defense. Bjorn fought at the gate with his big axe and held it for an hour against Kettil's best."),
    N('Old Hrefna threw pots of boiling fish oil from the wall. Even Old Skeggi the goat butted a raider off the walkway into the ditch.'),
    N('But Kettil burned the harbor, three warehouses and the food stored for winter. And Bjorn took an axe blow across his left leg. He will live. He may never walk without a stick again.'),
    N('Freydis meets Eirik at the gate. She is filthy with soot. Her hands are bandaged.'), { s: 'Freydis', t: 'You promised we would be safe.' }, N('Eirik has no answer.')],
});

/** The six kings in Bjorn's longhouse (Chapter 6): where each stands, in the story's words. */
export const KINGS = {
  eystein: 'King Eystein of Solvik says war will destroy trade forever and they should pay Håkon whatever he asks.',
  ragnvald: 'King Ragnvald of Kinn shouts that he will not kneel to a wolf.',
  hallvard: 'King Hallvard of Gulen recites three laws about the duties of neighbors.',
  aslak: 'King Aslak of Fedje wants revenge, now, tonight.',
  svein: 'King Svein of Skorpa just wants his grain back before his people starve.',
  hroald: 'King Hroald of Jarnøy is silent, because Håkon took his son Arvid as a hostage.',
};
/** The harbor wall (Chapter 3, word for word): who the camera is on, who speaks, what is said. */
export const WALL_LINES = [
  ['both', '', 'That evening Ingrid and Leif sit on the harbor wall. She has seen him do something with no hope of profit, and she does not know what to do with it.'],
  ['leif', '', 'Leif tells her, haltingly, about growing up hungry in the slums of Hedeby, a dock-rat stealing fish heads. How he swore he would never be poor again. How he still dreams about being hungry.'],
  ['ingrid', In, 'You count silver because you are afraid of having nothing.'],
  ['leif', L, 'And you give it away because you have never had nothing.'],
  ['ingrid', '', 'She flinches as if he has slapped her. She gets up and leaves without a word.'],
  ['leif', '', 'Leif sits alone on the wall and calls himself every insult he knows.'],
];
/** The letter and the ribbon (Chapter 7, word for word). */
export const RIBBON_LINES = [
  'A week later, a letter reaches Torvald. It is brought by a ragged peddler and handed over in secret. It is wrapped around a faded blue hair ribbon.',
  'Torvald knows the ribbon. It belonged to his daughter, Runa, who vanished in a raid nine years ago.',
  "The letter is from Sigurd Stonehand. Runa is alive, it says, a thrall on one of Håkon's farms. She will be freed, safe and unharmed, if Torvald does one thing.",
  'When the alliance sends its refugee convoy south through the narrow channel called Hedeby Sound, he will light the signal fire on the third headland instead of the second.',
  'Torvald does not sleep for three nights. He loves Eirik. He loved Ragnar. But he also believes, deep down, what Håkon believes: that the North has bled for thirty years because there was no strong king, and maybe a cruel strong king is better than endless war.',
  'And his daughter, his only child, might be alive.',
];

Object.assign(HINTS, {
  fog: 'Press {raven}. Three ships are out there in the fog: fly to each and press {interact} when she sees it.',
  deckHold: 'They come over the rail. The men of Ravenhold hold their own: take the ones who come for you.',
  rurik: 'A shield wall of one. Break his guard, or catch him in his own swing. He will not strike a man who is down.',
  sunstone: 'Turn the crystal: press {interact} when the mark is in the gold.',
  ride: 'Ride with {forward}{left}{back}{right}. Hold {sprint} to gallop. {interact} lifts a wounded man, sets him down by Ingrid, or dismounts.',
  fires: 'Press {raven}. Fly south along the coast, past the second headland, and press {interact} when she sees a fire.',
  rocks: 'Press {raven}. The rocks are south of the ship, under the water: press {interact} on each.',
});
