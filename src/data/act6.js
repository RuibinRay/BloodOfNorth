// Act VI — "The Nine Oaths": Eirik at twenty-six to twenty-eight. Cast, numbers, quests and dialogue for the nine
// chapters. The words are the owner's (docs/story/THE_RISE_OF_THE_RAVEN_KING.md, Act VI). Where the story tells a
// thing without giving anyone a line, the line is the story's own sentence, spoken by nobody; the few lines the
// game needed that the story does not have are marked (game).
// Text tokens: {w} white raven, {b} black raven, {n} the name the family uses.
import { QUESTS, DIALOGUE, ITEMS, HINTS } from './act1.js';
import { place, GREAT } from '../world/layout.js';

const B = (n, dx = 0, dz = 0) => { const p = place('bjornstead', n, dx, dz); return [p.x, p.z]; };
const Y = (dx, dz) => B('yard', dx, dz - 140);                                          // offsets from the centre of Bjornstead's patch
const isle = (id) => { const s = GREAT.find((g) => g.id === id); return (dx, dz) => [s.x + dx, s.z + dz]; };
const My = isle('myrholm'), Sk = isle('skalloy');                                       // offsets from the centre of each island

/** Every number of Act VI that a designer would want to turn. */
export const A6 = {
  knack: { leech: [3, 2.8, 0.27] },                                                     // [good strokes, speed, width of the mark]
  eydis: { hp: 260, dmg: 15, floor: 0.55, after: 0.25, hintAfter: 26, again: 18 },                 // she cannot be worn below `floor` until the black raven is in her face; then she is left `after`. While she is held there, the hint stands again every `again` s
  lane: { hp: 62, dmg: 11, skill: 0.4, allyDmg: 9, n: 4, atOnce: 2, name: "One of Håkon's toughest" }, // eighty warriors, as four to a lane
  bersi: { hp: 480, dmg: 26, beamAt: 0.72, quarryAt: 0.45, window: 1.3 },               // when the beam comes down; when the fight reaches the quarry
};

const folk = (o) => ({ build: 1, hair: 0x7a5a3a, tunic: 0x6a6a5a, ...o });
export const CAST6 = {
  thora: { name: 'Queen Thora', role: 'Queen of Myrholm, the Marsh Isle', look: { female: true, build: 0.98, hair: 0x8a8478, hairStyle: 'bun', tunic: 0x3e4a3a, trim: 0xc9b27a, cloak: 0x2e3a30, sleeve: 0x3e4a3a, face: 'lean', age: 0.5, squint: 0.2, lips: 'thin' } },
  eyvind: { name: 'Prince Eyvind', role: "Thora's son, twelve", look: { scale: 0.8, build: 0.86, hair: 0x8a6a3a, hairStyle: 'short', tunic: 0x4a5a3a, trim: 0xc9b27a, sleeve: 0x4a5a3a, fringe: 0.4, face: 'round' } },
  gest: { name: 'Gest', role: "The queen's oldest advisor", look: folk({ hair: 0xd8d4cc, hairStyle: 'long', beard: 'belt', tunic: 0x4a5244, cloak: 0x34382e, build: 0.92, recede: 0.8, age: 1, face: 'gaunt' }) },
  gudmund: { name: 'Jarl Gudmund', role: 'Ruler of Skalløy, the Forge Isle', look: { build: 0.94, hair: 0x5a4a3a, hairStyle: 'short', beard: 'short', tunic: 0x5a4a3a, trim: 0xb08a4a, cloak: 0x3a3430, sleeve: 0x5a4a3a, face: 'lean', recede: 0.3, mood: 'worried' } },
  halvar: { name: 'Halvar', role: "Brokk's nephew, a smith of Skalløy", look: { build: 1.2, hair: 0x6a4a2a, hairStyle: 'short', beard: 'short', tunic: 0x5a5448, apron: 0x4a3626, sleeve: null, face: 'broad', soot: 0.35 } },
};

Object.assign(ITEMS, {
  raven_cloth: { name: 'A square of cloth', desc: 'A small square of cloth embroidered with a raven. "For luck." Freydis did not make it. She stole it from your room.', cat: 'Keepsake' },
});

const Q = (title, desc, next, xp, steps) => ({ title, kind: 'main', xp, next, desc, steps });
const ev = (id, text, key, o = {}) => ({ id, text, type: 'event', key, ...o });
const talk = (id, text, key, o = {}) => ({ id, text, type: 'talk', key, marker: { npc: key }, ...o });
const reach = (id, text, key, pos, o = {}) => ({ id, text, type: 'reach', key, marker: { pos }, ...o });
Object.assign(QUESTS, {
  q_marsh: Q('The Marsh Queen', 'Myrholm is a world of water. Queen Thora rules it through a council of seven old families who have been feuding since before anyone can remember.', 'q_lastforge', 460, [
    talk('thora', 'Ask Queen Thora for Myrholm', 'thora'),
    ev('gest', "The next morning: the queen's oldest advisor, in a channel", 'a6gest', { marker: { pos: My(62, -58) } }),
    ev('eye', 'Send {w} over the marshes', 'ravenEye'),
    ev('signs', 'Find what nobody on the ground could see', 'a6sign', { count: 3 }),
    talk('surety', 'He needs a tracker: go to Thora', 'thora'),
    ev('eyvind', 'Set out on the trail, with Astrid', 'a6eyvind', { marker: { pos: My(-8, 14) } }),
    ev('leech', 'The leeches are everywhere', 'a6leech', { marker: { pos: My(150, -58) } }),
    ev('peat', 'A peat cutting', 'a6peat', { marker: { pos: My(170, -70) } }),
    ev('wire', 'Astrid finds the tripwires', 'a6wire', { marker: { pos: My(-52, 158) } }),
    reach('ground', 'Eyvind knows where the solid ground is', 'a6ground', My(-58, 172), { r: 3.5 }),
    ev('archers', '{w} spots the archers', 'a6archer', { count: 2 }),
    ev('eydis', 'Eirik goes in', 'a6eydis', { marker: { pos: My(-69, 195) } }),
    ev('camp', "Eydis's camp", 'a6proof', { marker: { pos: My(-97.4, 197.6) } }),
    talk('council', 'Before the whole council', 'thora'),
  ]),
  q_lastforge: Q('The Last Forge', 'The last neutral island is Skalløy, the Forge Isle, a place of quarries and furnaces where half the anchors, nails and ship fittings in the North are made.', 'q_anvil', 200, [
    ev('harbor', 'Brokk has not seen his nephew in twelve years', 'a6halvar', { marker: { pos: Sk(-156, -27) } }),
    talk('forge', "Halvar's workshop", 'halvar'),
    talk('gudmund', 'Negotiate with Jarl Gudmund', 'gudmund'),
    ev('axe', 'They work on Raven-Feeder too', 'a6reforge', { marker: { pos: Sk(-6.6, -20.4) } }),
    talk('night', 'The last night, by the dying forge', 'brokk'),
    talk('word', "Jarl Gudmund's answer", 'gudmund'),
  ]),
  q_anvil: Q('The Black Anvil', "That same night, Håkon's answer arrives.", 'q_smith', 520, [
    ev('lanes', 'Hold a narrow lane, then another, then another', 'a6lane', { count: 3, marker: { dyn: 'a6work' } }),
    ev('door', 'The forge: Halvar and his apprentices are still inside', 'a6door', { marker: { pos: Sk(-4.8, -22) } }),
    ev('bersi', 'Bersi Black-Anvil', 'a6bersi', { marker: { dyn: 'a6ledge' } }),
  ]),
  q_smith: Q("The Smith's Last Words", 'Eirik runs back down to the forge.', 'q_judge', 160, [
    ev('brokk', 'Back down to the forge', 'a6last', { marker: { pos: Sk(-4.8, -22) } }),
    ev('speak', 'Nine days: speak before they light the fire', 'a6speak', { marker: { pos: Sk(-200.6, 3.4) } }),
    ev('light', 'Light the boat', 'a6light', { marker: { pos: Sk(-200.6, 3.4) } }),
    talk('halvar', "Halvar finishes Brokk's last work", 'halvar'),
  ]),
  q_judge: Q('The Judgment of Torvald', "The alliance gathers at Ravenhold's Thing stones to judge Torvald. King Hallvard the Lawspeaker presides.", 'q_sigurd', 200, [
    ev('thing', 'The Thing stones: Torvald confesses everything', 'a6thing', { marker: { pos: B('thing') } }),
    ev('oath', 'The decision belongs to the person Torvald wronged most', 'a6oath', { marker: { pos: B('thing') } }),
  ]),
  q_sigurd: Q('The Death of the Iron Circle', 'Sigurd Stonehand can see which way the wind is blowing.', 'q_nine', 120, [
    talk('offer', 'A secret offer from Sigurd Stonehand', 'sigmess'),
    ev('hall', 'So Sigurd tries the other side', 'a6hall'),
  ]),
  q_nine: Q('The Nine Oaths', 'In autumn, every ruler in the alliance gathers at Ravenhold for a great war council.', 'q_wedding', 300, [
    ev('field', 'A field under a sail-cloth roof', 'a6field', { marker: { pos: Y(76, 132) } }),
    ev('ring', 'The kings argue over who should command', 'a6ring', { marker: { pos: Y(76, 131) } }),
  ]),
  q_wedding: Q('A Wedding Before War', 'Leif and Ingrid decide to marry before the fleet sails.', 'q_four', 120, [
    talk('price', 'Leif has to agree the bride-price with King Hroald', 'leif'),
    ev('vows', 'The end of autumn: stand beside Leif', 'a6vows', { marker: { pos: Y(-1, 137) } }),
    ev('morning', 'The next morning', 'a6morning'),
  ]),
  q_four: Q('Four Hundred', 'The alliance prepares the invasion.', null, 200, [
    ev('svartoy', "Study Svartøy from the sky through {w}'s eyes", 'a6study', { marker: { pos: Y(76, 131) } }),
    ev('friends', 'Talk with every one of his companions', 'a6friend', { count: 3, marker: { dyn: 'a6work' } }),
    ev('home', 'The last night: Bjorn and Signe', 'a6home', { marker: { npc: 'signe' } }),
    ev('sail', 'Before dawn: the harbor', 'a6sail', { marker: { pos: B('pier', -2.2, 2) } }),
  ]),
});

const E = 'Eirik', L = 'Leif', In = 'Princess Ingrid', As = 'Astrid', Tv = 'Torvald', Br = 'Brokk', Bj = 'Bjorn', Sv = 'Svanhild', Fr = 'Freydis', Th = 'Queen Thora', Ey = 'Prince Eyvind', Ha = 'Halvar', Be = 'Bersi Black-Anvil', Hk = 'Håkon', Si = 'Sigurd Stonehand';
const N = (t, o = {}) => ({ s: '', t, ...o });
Object.assign(DIALOGUE, {
  // ---- Chapter 1: The Marsh Queen ---------------------------------------------------------
  a6_thora: [N('Queen Thora rules it through a council of seven old families who have been feuding since before anyone can remember. She is about fifty, sharp-eyed and tired, with a twelve-year-old son, Prince Eyvind, who is far too curious for his own good.'),
    N('Thora refuses Eirik before he finishes asking.'), { s: Th, t: "My people have survived by staying out of other men's wars." }],
  a6_gest: [N('The next morning, her oldest advisor, a man named Gest, is found dead in a channel with an arrow in his back.'),
    N("The arrow has grey goose fletching with a blue thread wound under it. It is Astrid's."),
    N('Astrid, Leif and Ingrid are arrested. Eirik is allowed to stay free only because Thora wants to watch him.', { fx: { do: 'arrest' } }),
    N('Astrid is furious.'), { s: As, t: 'Someone stole from my quiver. I count my arrows every night. Two went missing the night we arrived.' },
    N("Eirik believes her. Nobody else does. The seven families are blaming each other, Thora's council is falling apart, and Myrholm is a breath away from civil war.")],
  a6_surety: [N("He goes to Thora and asks for Astrid's release, just for three days, with himself as surety: if Astrid runs or is guilty, Eirik will take her punishment."),
    N('Thora is so surprised that anyone would offer this that she agrees.')],
  a6_eyvind: [N('Prince Eyvind sneaks out after them. When they find him, he refuses to go home.'), { s: Ey, t: "You don't know the channels. I do." }, N('He is right. They take him.')],
  a6_bog: [N('In a peat cutting they find a body, black and leathery and perfectly preserved, a man who drowned in the bog hundreds of years ago with a rope still around his neck.'),
    N('Eyvind says the bog keeps everyone it takes.'),
    N('Leif, who has come along because he was bored in prison and Thora let him out too, says he has never wanted to be anywhere less.')],
  a6_proof: [N("In Eydis's camp they find Astrid's second stolen arrow, letters from Håkon, and a purse of silver marked with the Iron Circle's sign. It is all the proof anyone needs.")],
  a6_trust: [N('Thora releases the prisoners and apologizes to Astrid in front of the whole council. Then she asks Eirik why he risked his own freedom for someone who might have been guilty.'),
    { s: E, t: "Because she isn't. And if I don't trust my own people, why would you?" },
    N("Myrholm joins the alliance. Thora gives them healers who know the marsh herbs, flat-bottomed boats that can slip through shallow water where no longship could go, and her island's greatest secret: the hidden channels along the coasts, including two that lead to the back of Svartøy."),
    N('Prince Eyvind asks to come with Eirik. Thora says absolutely not. Eyvind sulks magnificently, exactly as Ari once did. Eirik notices, and has to walk away for a minute.', { fx: { do: 'sulk' } })],
  // ---- Chapter 2: The Last Forge ------------------------------------------------------------
  a6_workshop: [N('Halvar has become a fine smith, with his own forge, three apprentices and a reputation. Brokk walks around his workshop with his hands behind his back, inspecting everything.'),
    { s: Br, t: "You've made a good forge." }, N('Halvar grins.'), { s: Ha, t: 'Better than yours.' }, { s: Br, t: 'Then stop talking and prove it.' },
    N('Halvar has something special: a lump of black, heavy iron that fell from the sky in a fireball on a winter night two years ago. Sky-iron. It is harder than any iron from the ground, and almost impossible to work. They decide to make a hammer from it.')],
  a6_gudmund: [N('Its ruler, Jarl Gudmund, is a nervous, practical man who would like to join the alliance very much.'),
    N('But Håkon has sent him a message: if Skalløy sends one warrior to Eirik, Håkon will burn every workshop on the island and kill every smith.'),
    N('For three days the two smiths work together while Eirik negotiates with Gudmund.')],
  a6_metal: [N('While they hammer, Brokk talks.'), { s: Br, t: 'Metal remembers every blow. So do men. The trick is learning what deserves to stay.' }],
  a6_hand: [N('On the last night, sitting by the dying forge, Brokk finally tells Eirik the true story of his crushed hand.'),
    { s: Br, t: 'I was twenty and drunk. I wanted to show off to a girl. I tried to lift the big anvil with one hand. It fell on me.' }, N('He shrugs.'),
    { s: Br, t: "The truth is never as good as the stories. That's why I tell the stories." }, N('Eirik laughs so hard he cries.')],
  a6_word: [N('Gudmund agrees to join, if the alliance will defend Skalløy. Eirik gives his word.')],
  // ---- Chapter 4: The Smith's Last Words ----------------------------------------------------
  a6_last: [N('Eirik runs back down to the forge. Ingrid is already kneeling beside Brokk. She looks up at Eirik and shakes her head very slightly.'),
    N('Brokk knows. He asks for Halvar.'),
    N("Halvar kneels on his other side. Brokk puts his forging hammer, the one he has carried for forty years, into his nephew's hands.", { fx: { do: 'hammer' } }),
    { s: Br, t: 'Build things that last longer than anger.' }, N('Then he turns his head toward Eirik.'), { s: Br, t: 'Your father gave you that axe. I only helped you carry it.' },
    N('Eirik is crying. He cannot stop.'), N('Brokk smiles weakly.'), { s: Br, t: "Don't make that face. I've spent sixty winters looking at ugly iron. I don't need to finish by looking at you." },
    N('He dies a little before dawn, with the forge fire still burning.', { fx: { do: 'dies' } })],
  a6_funeral: [N("Brokk is given a smith's funeral in the old way. A small boat is dragged up onto the beach and filled with dry wood. Brokk is laid in it in his leather apron, with his favorite tongs, a file and a little anvil at his feet, and a cup of ale in his good hand for the journey."),
    N('His other tools are divided up as he asked: most to Halvar, some to the apprentices, his old leather apron to the Jarnøy smith he fought with for two years in Ravenhold.'),
    N('Leif, who has never been quiet for a day in his life, says almost nothing all nine days.'),
    N('Astrid leaves a bundle of arrows beside the boat.', { fx: { do: 'arrows' } }),
    N("Ingrid places a small folded cloth in Brokk's hand. Later she tells Leif what is in it: a little piece of iron, the first nail Brokk ever let her make, terribly bent.", { fx: { do: 'cloth' } }),
    N('Eirik speaks before they light the fire.'),
    { s: E, t: 'He taught me that a weapon is not made strong by its sharpness. It is made strong by the hand that chooses when not to use it.' }],
  a6_starfall: [N("Afterward, Halvar finishes Brokk's last work. Raven-Feeder gets its final reforging: iron from Jarnøy, a strip of sky-iron, and the iron of Brokk's craft.", { fx: { do: 'reforge3' } }),
    N('Halvar finishes the sky-iron hammer as well. It is black and heavy and rings like a bell. He names it Star-Fall.', { fx: { do: 'starfall' } }),
    N('When Eirik tells Old Hrefna about it later, she only says: A star that falls and is beaten into a hammer.'),
    N('Halvar comes back to Ravenhold with Eirik and becomes its master smith. Freydis, who is in charge of everything, is in charge of showing him where everything is. She takes a remarkably long time about it.')],
  // ---- Chapter 5: The Judgment of Torvald -----------------------------------------------------
  a6_confess: [N("The alliance gathers at Ravenhold's Thing stones to judge Torvald. King Hallvard the Lawspeaker presides."),
    N("Torvald confesses everything, in front of all of them. That he told Håkon where Ragnar was hiding, nearly twenty years ago. That he rode away instead of standing beside his friend. That he lit the false signal at Hedeby Sound. That he believed in Håkon's peace: one strong ruler, no more succession wars."),
    { s: Tv, t: "I thought obedience would save my daughter. It saved no one. I stopped asking what Håkon's peace would cost, and other people paid for it." },
    N('The rulers are divided. Aslak and Ragnvald want him put to death. Eystein wants him traded to Håkon for hostages. Hroald, whose son Arvid is still a hostage on Svartøy, says nothing at all.'),
    N("Hauk stands up at the back and says Torvald should be made to look at Ari's grave every day for the rest of his life.", { fx: { do: 'haukUp6' } }),
    N('In the end Hallvard says the decision belongs to the person Torvald wronged most: Eirik.')],
  a6_oath: [N('Eirik could kill him. Many people would cheer.'),
    N("Instead, Eirik makes him swear a binding oath, on Halfdan's ring, in front of the whole Thing."),
    N('Torvald will live. He loses his rank, his place on the council, his home in Ravenhold. He will give evidence against Sigurd and the Iron Circle.'),
    N("And he will do one thing more: when the alliance attacks Svartøy, he will lead a small team into the island's thrall pens, where Håkon keeps the hostages and the captives, and get them out. If he fails, or betrays them again, any man may kill him without penalty."),
    N('Torvald kneels and swears.', { fx: { do: 'kneel6' } }),
    { s: E, t: 'Understanding why you betrayed us is not the same as forgiving you.' }, { s: Tv, t: "I know. I'm not asking you to." }],
  // ---- Chapter 6: The Death of the Iron Circle --------------------------------------------------
  a6_offer: [N('Sigurd Stonehand can see which way the wind is blowing. He sends Eirik a secret offer.'),
    N("The Iron Circle will abandon Håkon. It will give Eirik silver, ships and its support for his claim as Halfdan's grandson. All Eirik has to do is rule as the Circle advises."),
    N('Eirik sends back one line.'), { s: E, t: 'I have seen what your advice costs.' }],
  // ---- Chapter 7: The Nine Oaths ------------------------------------------------------------------
  a6_bring: [N("In autumn, every ruler in the alliance gathers at Ravenhold for a great war council. Ravenhold's longhouse is too small, so they meet in a field under a sail-cloth roof, with three hundred people listening at the edges."),
    N("Each island brings what it has. King Hroald brings Jarnøy iron and armored fighters. King Eystein brings merchant ships, grain and silver. King Ragnvald brings Kinn's sailors, the best in the North."),
    N("King Hallvard brings the law, and lawspeakers to make the oaths binding. King Aslak brings Fedje's shipwrights. King Svein brings Skorpa's signal beacons and grain."),
    N("Jarl Jorund brings Vængr's swordsmen. Queen Thora brings healers, marsh boats and her secret channels. Jarl Gudmund brings siege ladders, rams and ship fittings."),
    N("Bjorn brings Ravenhold's warriors and leans on his stick and tells them all to stop wasting time."),
    N('The kings argue over who should command. None of them wants to give his warriors to another king.')],
  // ---- Chapter 8: A Wedding Before War ----------------------------------------------------------------
  a6_price: [N('Leif and Ingrid decide to marry before the fleet sails. They both know the war might part them forever, and they do not want to wait for a peace that might not come.'),
    N("First Leif has to agree the bride-price with King Hroald, as the old custom demands. Leif, who has bargained with merchants on three seas, is sure he can talk the price down. He walks into Hroald's tent confident.", { fx: { do: 'tentIn' } }),
    N('He comes out an hour later having agreed to pay twice what he planned, plus his best cloak, plus twenty years of free passage for Jarnøy cargo on the Sea-Raven. He is not entirely sure how it happened.', { fx: { do: 'tentOut' } }),
    N('Ingrid pats his cheek.'), { s: In, /* (game: the story has "Ingrid tells him, patting his cheek") */ t: "He's a king. You're a sailor. Did you really think you'd win?" }],
  // ---- Chapter 9: Four Hundred ---------------------------------------------------------------------------
  a6_lastnight: [N('On the last night, Eirik visits Bjorn and Signe.'), N('Signe holds him for a long time and says nothing.', { fx: { do: 'hold6' } }),
    { s: Bj, t: 'I knew a frightened boy who could barely lift an axe.' }, N('Eirik smiles.'), { s: E, t: 'You taught him.' }, N('Bjorn shakes his head.'),
    { s: Bj, t: 'I taught him to split wood. The rest he learned from the people who trusted him.' },
    N('Freydis gives Eirik a small square of cloth embroidered with a raven.', { fx: { give: { raven_cloth: 1 } } }),
    { s: Fr, t: 'For luck.' }, { s: E, t: 'Did you make it?' }, { s: Fr, t: 'No. I stole it from your room.' },
    N('They laugh, both of them, until Signe tells them to be quiet because the neighbors are sleeping.')],
});

/** What the white raven finds over the marshes (the story's words). */
export const SIGNS = [['trail', 'a trail of trampled reeds', 'A trail of trampled reeds leading to an old ruined watchtower.'], ['boat', 'a boat under cut branches', 'A boat hidden under cut branches.'], ['camp', 'a camp', "A camp where someone has been watching the queen's hall."]];
/** The doorway (Chapter 3, word for word): who the camera is on, who speaks, what is said, and what happens. */
export const DOOR_LINES = [
  ['door', '', 'Brokk stands in the doorway with a forging hammer in his good hand.'],
  ['door', '', 'He is old. He has one working hand. He should not last a breath against a man like Bersi. He lasts much longer.', 'fight'],
  ['side', '', 'He fights with forty years of knowing exactly where to put a hammer blow. He breaks the knee of one warrior and the jaw of another. He holds the doorway while Halvar drags the apprentices out the back.', 'knee'],
  ['bersi', '', "Eirik comes running around the corner just in time to see Bersi's great hammer come down.", 'down'],
  ['brokk', '', 'Brokk falls.'],
  ['brokk', '', 'Eirik runs to him. Brokk grabs his arm with his crushed hand.', 'run'], ['brokk', Br, "Don't stop for me."],
  ['bersi', '', 'Bersi laughs.', 'laugh'], ['bersi', Be, 'Another old man dying for a boy who wants a crown.'],
  ['eirik', '', 'Eirik stands up. The scar on his face burns like a hot coal. Stormguard comes, stronger than it has ever come.', 'ward'],
  ['eirik', '', 'And it is useless. It can show him every blow before it lands. It cannot reach back three heartbeats and put him in front of Brokk. It cannot undo what is done.'],
  ['eirik', '', "Old Hrefna's words come back to him: It will not guard anyone else."],
  ['brokk', '', 'No power can prevent every death.'],
];
/** The Hall of Wolves (Chapter 6, word for word). */
export const SIGURD_LINES = [
  ['table', '', 'So Sigurd tries the other side. He goes to Svartøy and tells Håkon the Circle has lost faith in him.'],
  ['sigurd', '', 'They want a new war leader, someone younger, someone who will win. Perhaps Håkon should step aside, for a generous price.'],
  ['hakon', '', "Håkon listens politely. Then he puts a bundle on the table: Sigurd's letter to Eirik, intercepted by Håkon's spies.", 'bundle'],
  ['sigurd', '', 'Sigurd stops smiling.'],
  ['sigurd', '', 'With nothing left to lose, he tells Håkon the truth. The Circle never wanted a king. They wanted a weapon.'],
  ['sigurd', '', "They paid for the raid on Ragnar's farm. They forged the letter that broke Torvald. They have been feeding both sides of this war so both would bleed, and the Circle could pick up the pieces."],
  ['sigurd', Si, 'You were our sword.'],
  ['hakon', '', 'Håkon stands up.', 'stand'], ['hakon', Hk, 'Then you should have learned which end cuts.'],
  ['table', '', "He kills Sigurd in his own hall, in front of the Circle's other envoys.", 'kill'],
  ['table', '', 'By the end of the month, Håkon has seized everything the Iron Circle owned: its silver, its ships, its hired warriors.'],
  ['hakon', '', "Håkon is not anyone's sword anymore. He is stronger than he has ever been. And he has nothing left to bargain with but war."],
];
/** The ring (Chapter 7, word for word). */
export const RING_LINES = [
  ['eirik', '', "Eirik does not ask for a crown. He holds up Halfdan's ring, and the whole field goes quiet, because by now everyone knows what it is.", 'hold'],
  ['eirik', E, "I won't ask you to swear to me because of my grandfather. Swear to each other. Your people remain yours. Your laws remain yours. But while Håkon threatens any one of us, we stand together."],
  ['ring', '', 'One by one, nine rulers put their hands on the ring and swear: six kings, two jarls and a queen.', 'swear'],
  ['bjorn', '', 'Then Bjorn puts his big scarred hand on top of theirs, for the mainland.', 'bjorn'],
  ['wide', '', 'The alliance now holds nine of the ten islands. Only Svartøy remains.', 'cheer'],
];
/** The wedding, and the harbor wall the next morning (Chapter 8, word for word). */
export const WEDDING_LINES = [
  ['wide', '', 'The wedding is held in Ravenhold at the end of autumn. The bride wears a crown of straw and late flowers.'],
  ['two', '', 'In the old way, the groom gives the bride a sword to keep for their future sons. Leif has no family sword, so he gives her one of his Twins, his short sword, which means from now on he will fight with one blade until she gives it back.', 'sword'],
  ['two', '', 'Ingrid gives him a sword in return, as the custom asks, and a gift of her own.', 'sword2'],
  ['two', '', 'Leif gives her a silver pendant shaped like a ship, beautifully made. Ingrid gives him a small leather medical kit.'],
  ['two', '', 'Leif is confused.'], ['two', L, 'A medical kit?'], ['two', In, 'You are going to war. You are also an idiot.'], ['two', L, 'So this is a practical gift.'], ['two', In, 'Extremely.'],
  ['eirik', '', 'Eirik stands beside Leif as his closest friend.'],
  ['toast', '', 'Astrid and Svanhild give the toast together. It is a long, cruel and hilarious list of every terrible financial decision Leif has ever made, including the dice, the frog potion and the time he tried to sell a goat to a monk. Leif laughs harder than anyone.', 'toast'],
  ['wide', '', "There is a month's worth of mead, as tradition requires, and they try to drink it in one night. Freydis dances with Halvar four times, which does not go unnoticed. Old Skeggi eats the bride's crown.", 'dance'],
];
export const MORNING_LINES = [
  ['wall', '', 'The next morning Leif and Ingrid sit on the harbor wall watching the sun come up.'],
  ['two', L, "I promise I'll come back."], ['two', '', 'Ingrid shakes her head.'], ['two', In, 'Do not promise what the sea cannot guarantee. Promise that you will try.'],
  ['two', L, "I promise I'll try."], ['two', In, "Good. And bring back my husband's sword."],
];
/** Svartøy from the sky (Chapter 9, word for word): which part of the island the white raven is over. */
export const STUDY_LINES = [
  ['far', "The last weeks are busy. Eirik chooses commanders. He picks the ships. He studies Svartøy from the sky through {w}'s eyes until his head pounds:"],
  ['harbor', 'the harbor,'], ['cliffs', 'the cliffs,'], ['bridge', 'the bridge to the upper town,'], ['hall', 'the great hall at the top.'],
];
/** What each companion asks of him (Chapter 9, word for word). */
export const FRIENDS = {
  astrid: 'Astrid asks him to look for a boy named Kári among the prisoners, if they get that far.',
  svanhild: 'Svanhild asks him to keep his temper.',
  leif: "Leif asks him to stand far away from him in the battle so the arrows aimed at Eirik don't hit him by mistake. Eirik knows that means stay alive.",
};

Object.assign(HINTS, {
  marshEye: 'Press {raven} to send {w} over the marshes. Fly south and west of the hall, and press {interact} on what she finds.',
  archerEye: 'Press {raven}. There are archers in the reeds round the old watchtower: press {interact} on each one she sees.',
  callSot: 'She keeps him at the end of her spear. Lock on to her ({lock}) and call {b} down: {harry}.',
  ledge: 'Stop blocking. Step back onto the ledge of loose stone at the edge. When he raises the hammer, drop flat: {crouch}.',
});
