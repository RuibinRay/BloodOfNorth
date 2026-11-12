// Act III — "The Wolves of Iron": Eirik at twenty and twenty-one. Cast, numbers, quests and dialogue for the eight
// chapters. The words are the owner's (docs/story/THE_RISE_OF_THE_RAVEN_KING.md, Act III). Where the story tells a
// thing without giving anyone a line, the line is built from the story's own sentence; the few lines the game
// needed that the story does not have are marked (game).
// Text tokens: {w} white raven, {b} black raven, {n} the name the family uses.
import { QUESTS, DIALOGUE, ITEMS, HINTS } from './act1.js';
import { place } from '../world/layout.js';

const B = (n, dx = 0, dz = 0) => { const p = place('bjornstead', n, dx, dz); return [p.x, p.z]; };
const J = (dx, dz) => { const p = place('jarnoy', 'town', dx - 170, dz + 22); return [p.x, p.z]; }; // offsets from Jarnøy's centre

/** Every number of Act III that a designer would want to turn. */
export const A3 = {
  camp: { n: 5, hp: 50, dmg: 10, skill: 0.4 },                          // the raiders' camp in the ravine
  rain: { volleys: 3, every: 4.4, dmg: 14, arrows: 28, warn: 1.1 },     // Arne's archers on the ridge
  battle: { hp: 52, dmg: 10, skill: 0.4, wall: { budget: 22, atOnce: 3 }, gate: { n: 8, atOnce: 3 }, allyDmg: 7 },
  arne: { hp: 200, dmg: 12 },
  ulf: { hp: 340, dmg: 17, secs: 55, wards: 2, hpAt: 0.55 },            // he cannot be beaten here: the fight ends on whichever of these comes first
  boats: { secs: 85, leif: 16 },
  knack: { trench: [3, 2.8, 0.26], ditch: [3, 2.6, 0.25], pull: [2, 3.0, 0.27], fire: [3, 3.2, 0.24], hammer: [3, 2.8, 0.24] }, // [good strokes, speed, width of the mark]
  bout: { drill: 5, window: 1.15 },
  mail: 0.85,                                                           // a mail shirt: what is left of a blow
};

const folk = (o) => ({ build: 1, hair: 0x7a5a3a, tunic: 0x6a6a5a, ...o });
export const CAST3 = {
  hroald: { name: 'King Hroald', role: 'King of Jarnøy, the Iron Isle', look: { build: 1.12, hair: 0x8a8880, hairStyle: 'long', beard: 'long', tunic: 0x4a3a3a, trim: 0xc9a24a, cloak: 0x5a2a24, sleeve: 0x4a3a3a, face: 'long' } },
  arvid: { name: 'Prince Arvid', role: "Hroald's son, seventeen", look: { build: 1.0, scale: 0.97, hair: 0x7a5a3a, hairStyle: 'short', tunic: 0x5a2a24, trim: 0xc9a24a, sleeve: 0x5a2a24 } },
  ingrid: { name: 'Princess Ingrid', role: "Hroald's daughter, a healer", look: { female: true, build: 0.95, hair: 0x6a4a2a, hairStyle: 'braid', tunic: 0x5a6a7a, trim: 0xd8d2c2, apron: 0xd8d2c2, sleeve: 0x5a6a7a, face: 'even' } },
  hallgerd: { name: 'Hallgerd', role: "A fisherman's daughter", look: { scale: 0.92, female: true, build: 0.9, hair: 0xc8a85a, hairStyle: 'braid', tunic: 0x6a7a5a, apron: 0xcfc6ae } },
  fisher: { name: "Hallgerd's father", role: 'A fisherman', look: folk({ hair: 0x8a8478, beard: 'short', tunic: 0x4a5a6a }) },
  jtrader: { name: 'A Jarnøy smith', role: 'Trader in iron', look: folk({ build: 1.15, hair: 0x4a3a2a, beard: 'short', tunic: 0x5a4a3a, apron: 0x3a2e24 }) },
  brokk: { name: 'Brokk', role: 'Master smith', look: { build: 1.22, scale: 0.98, hair: 0xb0aca4, hairStyle: 'bald', beard: 'long', tunic: 0x5a4a3a, apron: 0x3a2e24, skin: 0xc8946e, face: 'broad' } },
  astrid: { name: 'Astrid', role: 'Archer and hunter', look: { female: true, build: 0.92, scale: 0.97, hair: 0x2c241e, hairStyle: 'braid', tunic: 0x4a5a44, trim: 0x2a2a24, legs: 0x3a342c, sleeve: 0x4a5a44, eyes: 0x6a7a5a, face: 'lean' } },
  torvald: { name: 'Torvald', role: "Veteran; knew Ragnar", look: { build: 1.2, scale: 1.04, hair: 0x8a8478, hairStyle: 'short', beard: 'short', tunic: 0x4a4a4a, trim: 0x8a8a90, cloak: 0x7a7a7e, legs: 0x2e2a26, sleeve: 0x4a4a4a, face: 'long' } },
  ari: { name: 'Ari Hauksson', role: "Hauk's son, fourteen", look: { scale: 0.84, build: 0.9, hair: 0x8a6a3a, hairStyle: 'short', tunic: 0x7a5a3a } },
  bowyer: { name: 'A Jarnøy bowyer', role: 'Bowyer', look: folk({ hair: 0x5a4a3a, hairStyle: 'tail', tunic: 0x5a5a3a }) },
};
export const JARN_LOOKS = [folk({ tunic: 0x5a4a44, trim: 0x8a2a22, helmet: true, beard: 'short' }), folk({ tunic: 0x4a4a52, hair: 0x3a2a1c, beard: 'long', build: 1.1 }), folk({ tunic: 0x5a2a24, hair: 0xa8845a, helmet: true }), folk({ female: true, scale: 0.96, hair: 0x6a4a2a, hairStyle: 'braid', tunic: 0x4a5a5a, build: 1.0 })];

Object.assign(ITEMS, {
  mail: { name: 'Mail shirt', desc: "Thousands of tiny iron rings riveted together, each shirt a month's work at Ravenhold's second forge. It takes the edge off every blow.", cat: 'Keepsake' },
});

const Q = (title, desc, next, xp, steps) => ({ title, kind: 'main', xp, next, desc, steps });
const ev = (id, text, key, o = {}) => ({ id, text, type: 'event', key, ...o });
const talk = (id, text, key, o = {}) => ({ id, text, type: 'talk', key, marker: { npc: key }, ...o });
const reach = (id, text, key, pos, o = {}) => ({ id, text, type: 'reach', key, marker: { pos }, ...o });
Object.assign(QUESTS, {
  q_isle: Q('The Island Prince', 'The smoke {w} saw was a burned fishing hamlet on Jarnøy, the Iron Isle. In spring, the Sea-Raven sails there to trade wool and salted fish for iron.', 'q_fifty', 120, [
    ev('sail', 'Board the Sea-Raven for Jarnøy', 'a3sailed', { marker: { pos: B('pier', -2.2, 4) } }),
    reach('town', 'Go up into the harbor town', 'a3town', J(196, -22)),
    talk('trade', 'Trade the wool and salted fish for iron', 'jtrader'),
    ev('quay', 'The second day: the collectors at the pier', 'a3quay', { marker: { pos: J(221, -23) } }),
    ev('let', 'The other three run for their boat', 'a3let'),
    talk('hroald', 'King Hroald is white with fury', 'hroald'),
    talk('demand', "Nine days later: Håkon's demand", 'hroald'),
  ]),
  q_fifty: Q('Fifty from Ravenhold', 'Sailors along the coast have started calling Bjornstead something else: the ravens\' hold.', 'q_healer', 240, [
    ev('thing', 'Call the people to the Thing stones', 'a3thing', { marker: { pos: B('thing') } }),
    talk('brokk', 'A stranger has taken over the forge', 'brokk'),
    ev('eye', 'See what {w} keeps showing you in the hills', 'ravenEye'),
    ev('woman', 'Mark the woman in the hills', 'a3woman'),
    reach('astrid', 'Catch up with her', 'a3astrid', B('timber', 6, 8), { r: 9 }),
    reach('ravine', "Follow the raiders' trail to the ravine", 'a3ravine', B('ravine', -16, 38), { r: 13 }),
    ev('guards', 'Send {w} over the camp and mark the two guards', 'a3guard', { count: 2 }),
    ev('camp', 'Take the rest', 'a3camp', { marker: { pos: B('ravine') } }),
    ev('free', 'Cut the farmers loose', 'a3free', { marker: { pos: B('ravine', 5, -6) } }),
    talk('guide', 'The next morning: a woman with a bow at the gate', 'astrid'),
    talk('torvald', 'A rider is asking for you by name', 'torvald'),
    ev('drill', "Stand in Torvald's shield wall", 'a3drill', { marker: { npc: 'torvald' } }),
  ]),
  q_healer: Q("The Healer's Hands", 'The fifty sail to Jarnøy in the Sea-Raven and two fishing boats.', 'q_shore', 80, [
    ev('sail', 'Sail for Jarnøy with the fifty', 'a3sailed2', { marker: { pos: B('pier', -2.2, 4) } }),
    reach('hall', "Go up to King Hroald's hall", 'a3hall', J(84, 2), { r: 9 }),
    talk('ingrid', 'Princess Ingrid', 'ingrid'),
  ]),
  q_shore: Q('The Battle of Iron Shore', 'One hundred and fifty defenders: fifty from Ravenhold and a hundred from Jarnøy. Håkon is sending about two hundred, led by two champions.', 'q_long', 360, [
    ev('trench', 'Dig the trench across the beach and set the stakes', 'a3trench', { count: 2, marker: { dyn: 'a3work' } }),
    talk('leif', 'Leif has an idea', 'leif'),
    ev('ditch', 'Fill the Stinking Ditch', 'a3ditch', { marker: { pos: J(190.4, 116) } }),
    ev('dawn', 'Rest in the town until dawn', 'a3dawn', { marker: { pos: J(168, -17) } }),
    ev('shields', 'Shields up', 'a3volley', { count: 3 }),
    ev('eye', 'Send {w} over the ridge', 'ravenEye'),
    ev('archers', "Call the archers' positions to Astrid", 'a3archer', { count: 5 }),
    reach('beach', 'To the trench on the beach', 'a3beach', J(177, 100), { r: 10 }),
    ev('wall', 'Hold the shield wall', 'a3wall'),
    reach('gate', 'The side gate: take ten men', 'a3gate', J(150, 31), { r: 9 }),
    ev('hold', 'Hold the gate', 'a3held'),
    ev('families', 'Get the families out of the outer houses', 'a3family', { count: 3, marker: { dyn: 'a3work' } }),
  ]),
  q_long: Q('The Longshot', "Arne Longshot has climbed into the town's stone watchtower. From there he can see and shoot anywhere in the battle.", 'q_ulf', 260, [
    ev('eye', 'Send {w} round the tower', 'ravenEye'),
    ev('way', 'Find a way up', 'a3way'),
    ev('fire', 'Through the burning granary', 'a3fire', { marker: { pos: J(127.6, -44.6) } }),
    ev('arne', 'Arne Longshot', 'a3arne'),
  ]),
  q_ulf: Q('The Enemy Who Escaped', 'Ulf Two-Blades fights with a sword in each hand and has never been beaten in a duel.', 'q_iron', 260, [
    reach('harbor', 'The harbor: Ulf Two-Blades is cutting his way toward the iron stores', 'a3harbor', J(206, -24), { r: 12 }),
    ev('duel', 'Ulf Two-Blades', 'a3choose'),
    ev('boats', 'The boats: cut the mooring lines and pull them out', 'a3boat', { count: 3, marker: { dyn: 'a3work' } }),
    ev('pyres', 'That night: the pyres on the beach', 'a3pyres', { marker: { pos: J(168, 100) } }),
  ]),
  q_iron: Q('The Gift of Iron', 'King Hroald holds a feast for the defenders.', 'q_price', 220, [
    talk('gold', 'King Hroald has a chest of gold', 'hroald'),
    talk('ingrid', 'Princess Ingrid has something to ask her father', 'ingrid'),
    ev('home', 'Sail home with the iron', 'a3home', { marker: { pos: J(246, -23) } }),
    ev('reforge', 'Brokk, at the second forge', 'a3reforge', { marker: { npc: 'brokk' } }),
    reach('yew', 'The old birch on the hill', 'a3yew', B('birch', 3, 6), { r: 9 }),
    talk('bait', 'Astrid has something to tell Leif', 'astrid'),
  ]),
  q_price: Q('The Price of Victory', 'Ulf Two-Blades returns to Svartøy with five ships out of eleven.', null, 40, [ev('hall', 'The Hall of Wolves', 'a3price')]),
});

const E = 'Eirik', Bj = 'Bjorn', L = 'Leif', Hr = 'King Hroald', Av = 'Prince Arvid', In = 'Princess Ingrid', Br = 'Brokk', As = 'Astrid', Tv = 'Torvald';
const N = (t, o = {}) => ({ s: '', t, ...o });
Object.assign(DIALOGUE, {
  // ---- Chapter 1: The Island Prince ------------------------------------------------------
  a3_trade: [{ s: 'A Jarnøy smith', t: 'Wool and salted fish, for bar iron. Done. It is the best in the North: a Jarnøy blade bends before it breaks.' }, // (game: built from the story's description)
    N('Its ruler, King Hroald Ironvein, is fifty, grey and tired. He has kept Jarnøy safe for twenty years by paying Håkon a little every year so that Håkon does not take everything.'),
    N('His son, Prince Arvid, is seventeen and hates every coin of it.')],
  a3_collect: [N("On their second day in the harbor town, Eirik and Leif watch it happen. Four of Håkon's collectors are taking the season's tribute.", { fx: { do: 'grab' } }),
    N("One of them grabs a girl named Hallgerd, a fisherman's daughter, and says her father's debt will be paid by her service on Svartøy. Everyone knows what that means."),
    N('Her father begs. The collector laughs and pulls her toward the boat.', { fx: { do: 'three' } }),
    N('Arvid steps out of the crowd with a sword. The collector draws his axe. It is over in three strokes.'),
    N('The collector is dead on the stones, and the wolf seal of Håkon Ironwolf hangs from his belt.')],
  a3_hroald: [{ s: Hr, t: 'You have given a wolf an excuse to enter our house.' }, { s: Av, t: 'Should I have watched him take her?' }, N('Hroald has no answer.')],
  a3_demand: [N("Nine days later a messenger arrives from Svartøy with Håkon's demand. Jarnøy will hand over Prince Arvid for judgment, and a hundred bars of iron as blood-price. If it refuses, Jarnøy will burn."),
    N('Hroald will not give up his son. But he has only a hundred trained fighters, and his scouts say Håkon is gathering two hundred.'),
    N("Eirik has seen how Håkon's men treat villages. He makes a promise he is not sure he can keep."), { s: E, t: "I'll go home and ask my people for help." }],
  // ---- Chapter 2: Fifty from Ravenhold -----------------------------------------------------
  a3_thing: [N("Eirik tells them what he saw on Jarnøy. The argument is fierce. They survived Kettil's raid only a year ago. Their walls are new. Their harvest is thin."),
    { s: 'Hauk', t: 'My son is not going to die for some island king who never helped anyone on the mainland!' },
    N('Then Bjorn stands up, and when Bjorn stands up, people go quiet.'),
    { s: Bj, t: "If we wait until every island is burning, there will be no one left to help us when our own fires begin. Håkon eats one village at a time. He's counting on each of us thinking we're not next." },
    N('He proposes sending fifty of their best. Volunteers only. Eirik will lead them.', { fx: { do: 'ari' } }),
    N("Hauk's son Ari, fourteen and mad with excitement, volunteers first. Bjorn tells him he is too young and sends him home to his mother. Ari sulks for a week."),
    N('The village throws itself into preparation. There are not enough weapons for fifty. There is not enough of anything.')],
  a3_brokk: [N('He came up the coast road on a mule with a cart of tools, an anvil chained to it and a crushed left hand that he can barely close. He heard there was a village building walls and needing iron work, and he wants paying.'),
    N("Within a day he has taken over Ravenhold's forge and insulted the village smith so badly the man goes fishing instead. Within a week he has made forty spearheads and repaired thirty shields."),
    N('When he sees Raven-Feeder he goes completely silent and turns it over in his good hand for a long time.'),
    { s: Br, t: 'Whoever made this axe knew his iron.' }, { s: E, t: 'My father.' },
    N('Brokk taps the dark iron collar at the top of the handle and frowns at it.'), { s: Br, t: 'Then your father knew more than farming.' }],
  a3_astrid: [N('She has an arrow on the string pointed at his throat before he hears her move.'),
    N("She is about his age, lean, with a braid of dark hair and a face that does not smile easily. Håkon's men burned her family's farm three years ago. Her parents died. Her little brother, Kári, was taken. She has been hunting Håkon's raiders ever since, one at a time."),
    N('Eirik asks her to join the fifty. She laughs at him.'), { s: As, t: 'I have seen men promise justice before. Usually they mean killing the people they dislike.' },
    N('He does not argue. Instead he helps her.')],
  a3_freed: [N('They free the farmers. Astrid looks for her brother among them. He is not there.'), N('Then she waits for Eirik to ask for something in return: silver, thanks, her bow.'), N('He just helps the farmers home.')],
  a3_guide: [N('The next morning Astrid walks into Ravenhold with her bow on her back.'), { s: As, t: "I know Jarnøy's forests. You'll need a guide." }],
  a3_torvald: [N('He arrives on a big brown horse with a war hammer slung across his back and a grey cloak, his beard going white at the edges. He asks for Eirik by name.'),
    { s: Tv, t: "I fought beside your father when we were young. I heard Ragnar's son was alive and fighting Håkon. I'd like to help." },
    N('Eirik stares at him. Something about the hammer and the cloak tugs at an old memory, a voice through wall planks, but it slips away before he can catch it.')],
  a3_torvald2: [N('Torvald is everything a young commander needs. He knows formations, supply, how to keep fifty frightened farmers in a shield wall. He tells Eirik stories about Ragnar as a young warrior, and Eirik drinks them in like water.'),
    N("Only once does something seem strange. Torvald asks, casually, whether Eirik's mother left him anything. A ring, a brooch, a letter?"), { s: E, t: 'No. Only the axe.' },
    N('Torvald nods and changes the subject. He never looks at Raven-Feeder for long.')],
  // ---- Chapter 3: The Healer's Hands ---------------------------------------------------------
  a3_ingrid: [N("She is nothing like her brother. Where Arvid is fire, she is cold water: calm, quick and impossible to rattle. She is turning her father's feasting hall into a hospital for the coming battle. Straw is laid out for beds. Linen is being boiled. Honey, moss, yarrow and wine are lined up for wounds."),
    N('Leif comes in carrying a sailor who has cut his foot on a rock. He sees Ingrid and stands up a little straighter.'),
    { s: L, t: 'I have survived seventeen sea battles.' }, N("Ingrid examines the sailor's foot without looking at Leif."), { s: In, t: 'And how many of those were caused by you?' },
    { s: L, t: 'That is an unfair question.' }, { s: In, t: 'Fetch clean water. The well, not the harbor. If you bring me harbor water I will pour it on you.', fx: { do: 'water' } },
    N('Leif fetches the water. He brings it from the well. Then he hangs around the hospital for the rest of the day, getting in the way, until she gives him a job rolling bandages just to keep his hands busy.'),
    N('Astrid watches all this from the doorway with the closest thing to a smile anyone has seen on her face.')],
  // ---- Chapter 4: The Battle of Iron Shore ------------------------------------------------------
  a3_ditch: [N("Leif has the most disgusting idea of the campaign. Jarnøy's harbor town has a huge midden pit full of fish guts, rotten kelp and the town's latrine waste."),
    N("Leif suggests they dig a second, shallow trench at the far end of the beach, fill it with the midden's contents and cover it with a thin layer of sand and seaweed."),
    { s: In, t: 'Why?' }, { s: L, t: 'Because when two hundred angry men charge across a beach, the ones in front should get a surprise.' },
    N('Torvald thinks about it and laughs. They call it the Stinking Ditch.')],
  a3_grjot: [N("Grjotgard, the Ravenhold farmer who once argued over a red cow, takes a spear through the side covering the families' escape. He dies in the street with Hauk holding him."),
    { s: 'Grjotgard', t: 'The calf. You keep the calf.' }, { s: 'Hauk', t: "I'll give it to your wife. You stubborn fool. I'll give her the cow too." }],
  // ---- Chapter 6: The Enemy Who Escaped -----------------------------------------------------------
  a3_pyres: [N('That night, the dead are laid on pyres on the beach with their weapons and a little food for the road to the next world. The fires burn until morning.', { fx: { do: 'kneel' } }),
    N('In front of everyone, Arvid kneels before his father and apologizes.'),
    { s: Hr, t: 'You were right to protect the girl. But being right does not make the dead return.' },
    N('Eirik hears it and never forgets it: even the right decision can have a price, and someone else often pays it.')],
  // ---- Chapter 7: The Gift of Iron ------------------------------------------------------------------
  a3_gold: [N('King Hroald holds a feast for the defenders. He offers Eirik a chest of gold.'),
    N("Eirik takes a little, enough to pay the families of the nine Ravenhold dead their full weregild, the blood-price owed for a life. Then he asks for something more useful: iron. Tools. And a few of Jarnøy's best smiths to come to Ravenhold for a year and teach."),
    N('Hroald stares at him. Then he laughs, for the first time in weeks.'), { s: Hr, t: 'You turn down gold and ask for work. Your father raised you strangely.' },
    N("Twelve carts of Jarnøy's finest iron bars and ore go aboard the ships to Ravenhold.")],
  a3_ingrid2: [N("Ingrid asks her father for permission to go with Eirik's people. Ravenhold has no proper healer except Old Hrefna, and Hrefna's cures mostly involve goat urine."),
    N('Hroald does not want to let her go. But he has seen her work through the night after the battle, and he understands that she can save more lives out there than in his hall.'),
    N("She joins Eirik's companions. Leif is delighted.")],
  a3_reforge: [N('Back home, Brokk is like a child at midwinter. He and the Jarnøy smiths build a second forge and work through the autumn.')],
  a3_reforge2: [N('Brokk reforges Raven-Feeder for the first time, folding Jarnøy iron into its edge. He does not touch the dark iron collar at the top of the handle.'),
    { s: Br, t: "Some things you leave alone until they're ready to talk." },
    N('Every Ravenhold warrior gets a proper helmet, a better shield and a spear with a Jarnøy head. The best fighters get mail shirts, thousands of tiny iron rings riveted together, each shirt a month\'s work.', { fx: { give: { mail: 1 } } })],
  a3_yew: [N('On the hill by the old birch, the tree the lightning split, a young yew had grown up through the scorched stump. The storm had cracked it too.'),
    N('Brokk and a Jarnøy bowyer cut a stave from it and make a bow that hums when the string is drawn, like wind in rigging.', { fx: { do: 'loose' } }),
    N('Astrid fires one arrow from it, clean through a fence post at a hundred paces, and does not speak for a long moment.'),
    N('She names it Storm-Yew. Old Hrefna, when she hears, just nods. A yew that sings in a storm.')],
  a3_bait: [{ s: As, t: 'She likes you about as much as a fisherman likes rotten bait.' }, { s: L, t: 'Then I have somewhere to begin.' }],
});

/** Brokk's hand: a different story every night. */
export const BROKK_HAND = ['The hand? A troll bit it.', 'The hand? I caught a falling anvil to save a princess.', 'The hand? A jealous husband slammed a door on it.'];

/** The Price of Victory (Chapter 8, word for word): who the camera is on, who speaks, what is said. */
export const PRICE_LINES = [
  ['ulf', '', 'Håkon listens to his report without moving. Arne Longshot is dead. Jarnøy is not punished. And Ragnar\'s son led the defense.'],
  ['table', '', "Worse, much worse: people are talking. In Solvik's markets, on Kinn's fishing boats, at Gulen's law-rock, men are saying that a farmer from the mainland beat two of Håkon's champions with fifty villagers. That Håkon can bleed."],
  ['sigurd', '', 'Sigurd Stonehand advises sending the whole fleet to burn Ravenhold to the ground.'],
  ['hakon', 'Håkon', "Kill the boy and another hero will grow from his grave. They'll make a saga of him."],
  ['hakon', '', 'He looks at the map of the islands carved into his table.'], ['hakon', 'Håkon', 'Destroy the roots, and the tree falls.'],
  ['sigurd', 'Sigurd Stonehand', 'The roots?'],
  ['hakon', 'Håkon', "Every king who might help him. Every island that might feed him. When he has no friends left, he'll come to me himself."],
  ['ulf', '', 'Ulf asks to be sent back after Eirik. Håkon refuses.'], ['hakon', 'Håkon', 'You ran.'], ['ulf', 'Ulf Two-Blades', 'I chose to retreat.'], ['hakon', 'Håkon', 'Then choose to wait.'],
];

Object.assign(HINTS, {
  shieldsUp: 'Arrows from the ridge. Draw your axe ({weapon1}) and hold {block} to get under the shield when the volley comes.',
  ravenRidge: 'Press {raven}. Fly north over the ridge behind the town and press {interact} on each archer she sees.',
  wallHold: 'Fight beside the wall. The men of Ravenhold and Jarnøy hold their own: take the ones who come for you.',
  ulf: 'He is faster than anyone Eirik has faced. Guard, give ground, and stay alive.',
});
