// Act V — "The Broken Raven": Eirik at twenty-four and twenty-five. Cast, numbers, quests and dialogue for the seven
// chapters. The words are the owner's (docs/story/THE_RISE_OF_THE_RAVEN_KING.md, Act V). Where the story tells a
// thing without giving anyone a line, the line is the story's own sentence, spoken by nobody; the few lines the
// game needed that the story does not have are marked (game).
// Text tokens: {w} white raven, {b} black raven, {n} the name the family uses.
import { QUESTS, DIALOGUE, ITEMS, HINTS } from './act1.js';
import { place } from '../world/layout.js';

const B = (n, dx = 0, dz = 0) => { const p = place('bjornstead', n, dx, dz); return [p.x, p.z]; };
const Y = (dx, dz) => B('yard', dx, dz - 140);                                          // offsets from the centre of Bjornstead's patch
const C = (dx, dz) => { const p = place('hunt', 'camp', dx + 52, dz); return [p.x, p.z]; }; // offsets from the centre of the hunting camp's patch

/** Every number of Act V that a designer would want to turn. */
export const A5 = {
  knack: { build: [3, 2.8, 0.26], dig: [3, 2.8, 0.26], cut: [3, 3.0, 0.25], free: [2, 3.0, 0.27] }, // [good strokes, speed, width of the mark]
  camp: { pit: 15, sniff: 10, fight: { hp: 58, dmg: 11, skill: 0.45, allyDmg: 9, n: 5, atOnce: 2 }, astrid: [5, 26] }, // seconds to get into a pit; how long the dogs sniff
  zerk: { hp: 74, dmg: 13, skill: 0, allyDmg: 9, n: 12, atOnce: 3, opt: { kind: 'berserk' }, name: 'A berserker', astrid: [4.5, 20], guardsAt: 5 }, // sixty berserkers, as a dozen
  skarde: { hp: 380, dmg: 20, lieAt: 0.8, down: 9 },                                    // when he tells the lie, and how long Eirik is on his back
};

const folk = (o) => ({ build: 1, hair: 0x7a5a3a, tunic: 0x6a6a5a, ...o });
export const CAST5 = {
  svanhild: { name: 'Svanhild', role: "Captain of Jarl Jorund's household guard", look: { female: true, build: 1.05, scale: 1.03, hair: 0xd8c890, hairStyle: 'braid', tunic: 0x3a4a5a, trim: 0xc9c2b0, sleeve: 0x3a4a5a, face: 'long', scar2: 'brow' } },
  jorund: { name: 'Jarl Jorund', role: 'Ruler of Vængr, the Wing Isle', look: { build: 0.95, hair: 0x6a6258, hairStyle: 'short', beard: 'stubble', tunic: 0x3a3a4a, trim: 0x8a8a90, cloak: 0x2a2a34, sleeve: 0x3a3a4a, face: 'lean' } },
  thrand: { name: 'Old Thrand', role: "Once of King Halfdan's guard", look: { build: 0.9, scale: 0.94, hair: 0xe0dcd4, hairStyle: 'long', beard: 'long', tunic: 0x5a5448, cloak: 0x4a463c, sleeve: 0x5a5448, eyes: 0xb8bcc0, face: 'long' } },
  ottar: { name: 'Ottar', role: "Håkon's falconer", look: folk({ hair: 0x3a2e24, hairStyle: 'tail', beard: 'stubble', tunic: 0x4a3e2e, trim: 0x16161a, sleeve: 0x4a3e2e, build: 0.98 }) },
  frogman: { name: 'A traveling merchant', role: 'Seller of cures', look: folk({ hair: 0x2e2620, hairStyle: 'long', beard: 'short', tunic: 0x7a3a5a, trim: 0xc9a24a, cloak: 0x3a5a4a, build: 0.92 }) },
  farmer: { name: 'A neighboring farmer', role: 'It beached on his shore', look: folk({ build: 1.15, hair: 0x8a3a1c, beard: 'long', tunic: 0x5a5a3a }) },
  creditor: { name: 'A Ravenhold merchant', role: 'He has every right', look: folk({ build: 1.1, hair: 0x5a4a3a, hairStyle: 'short', beard: 'short', tunic: 0x6a2a24, trim: 0xc9a24a, sleeve: 0x6a2a24 }) },
  debtor: { name: 'A father from Kinn', role: 'A refugee', look: folk({ hair: 0x6a6258, beard: 'stubble', tunic: 0x5a5444, build: 0.95 }) },
  debtgirl: { name: 'His oldest daughter', role: 'A refugee', look: { scale: 0.92, female: true, build: 0.9, hair: 0x8a6a3a, hairStyle: 'braid', tunic: 0x6a6456 } },
  sigmess: { name: "One of Sigurd's messengers", role: '', look: folk({ hair: 0x4a4038, hairStyle: 'short', tunic: 0x4a4a52, cloak: 0x2a2a34, build: 0.92, face: 'lean' }) },
  myrmess: { name: 'A messenger from Myrholm', role: 'Wounded', look: folk({ hair: 0x8a8070, hairStyle: 'long', tunic: 0x4a5a3a, trim: 0xc9b27a, sleeve: 0x4a5a3a }) },
};
export const ZERK = [0, 1, 2, 3].map((i) => ({ build: 1.2 + (i % 2) * 0.1, scale: 1.04, hairStyle: ['long', 'bald', 'long', 'short'][i], hair: [0x8a3a1c, 0x3a2a1c, 0x2e2620, 0xb0844a][i], beard: 'long', tunic: [0x4a3626, 0x3a3230, 0x54402e, 0x3e3a34][i], legs: 0x2a2420, sleeve: null, fur: true, skin: 0xcf9a78, face: 'broad' }));

Object.assign(ITEMS, {
  halfdan_ring: { name: 'The ring of Halfdan', desc: 'A heavy gold oath-ring, the kind that chieftains and kings swear on. Stamped into it is a seal: a crowned raven over three waves. It was inside the dark iron collar of Raven-Feeder, wrapped in oiled cloth.', cat: 'Keepsake' },
});

const Q = (title, desc, next, xp, steps) => ({ title, kind: 'main', xp, next, desc, steps });
const ev = (id, text, key, o = {}) => ({ id, text, type: 'event', key, ...o });
const talk = (id, text, key, o = {}) => ({ id, text, type: 'talk', key, marker: { npc: key }, ...o });
const reach = (id, text, key, pos, o = {}) => ({ id, text, type: 'reach', key, marker: { pos }, ...o });
Object.assign(QUESTS, {
  q_carry: Q('Ashes Again', 'Ravenhold calls an assembly. Half the town blames Eirik for bringing Håkon down on them. The other half says he is the only reason they are alive.', 'q_hunger', 120, [
    ev('assembly', 'Stand before the assembly at the Thing stones', 'a5assembly', { marker: { pos: B('thing') } }),
    ev('tower', 'The rebuilding: raise a new watchtower by the harbor gate', 'a5tower', { marker: { pos: Y(-12.4, 203.6) } }),
    ev('harbor', 'Rebuild the harbor', 'a5harbor', { marker: { pos: Y(47, 210.4) } }),
    ev('ship', 'Lay down a new ship on the strand', 'a5ship', { marker: { pos: Y(-32.4, 212.4) } }),
  ]),
  q_hunger: Q('The Winter of Hunger', 'The winter is the worst in living memory.', 'q_taken', 300, [
    ev('grain', 'Midwinter: the last grain store', 'a5grain', { marker: { pos: Y(63, 208) } }),
    talk('ingrid', 'Ingrid takes command', 'ingrid'),
    ev('latrine', 'Move the latrine away from the well, again', 'a5latrine', { marker: { pos: Y(17, 148.4) } }),
    ev('bedding', 'Burn the soiled bedding, away from the stream', 'a5bedding', { marker: { pos: Y(111.6, 150) } }),
    ev('quarrel', 'The two healers are screaming at each other in the market', 'a5quarrel', { marker: { pos: Y(0, 192) } }),
    ev('blot', 'Hold the midwinter blot', 'a5blot', { marker: { pos: B('thing') } }),
    talk('frog', 'A traveling merchant is selling a cure', 'leif'),
    ev('eye', '{w} is back from the coast, screaming one word over and over', 'ravenEye'),
    ev('whale', 'Fly west along the shore and mark what she has found', 'a5whale'),
    ev('cut', 'Butcher the whale', 'a5cut', { count: 3, marker: { dyn: 'a5work' } }),
    talk('law', 'A neighboring farmer claims the whale', 'hallvard'),
    talk('debt', 'One more case comes to Eirik that winter', 'creditor'),
    ev('first', 'Ask the Thing for a new rule', 'a5first', { marker: { pos: B('thing') } }),
  ]),
  q_taken: Q('The Raven Taken', 'In early spring, {w} does not come home.', 'q_ring', 380, [
    ev('reach', 'Reach for {w}', 'a5reach'),
    ev('arrow', 'Two days later: an arrow in the gate', 'a5arrow', { marker: { pos: B('gateN', 0, 1.6) } }),
    talk('astrid', 'He does not tell the kings', 'astrid'),
    ev('eye', "He cannot use {w}'s eyes: use {b} instead", 'ravenEye'),
    ev('sot', 'Read what {b} sees: the dogs, the mews, the way in', 'a5sot', { count: 3 }),
    reach('yard', "In, through the camp's tannery yard", 'a5yard', C(-53, 46), { r: 5 }),
    ev('pits', 'The dogs are coming: into the pits', 'a5pits', { marker: { dyn: 'a5work' } }),
    reach('pen', 'Inside: there is more here than the raven', 'a5pen', C(-63.6, 20.6), { r: 4 }),
    ev('free', 'Cut the eleven prisoners loose', 'a5free', { marker: { pos: C(-64.4, 18.6) } }),
    ev('cage', 'The mews: a small wooden cage', 'a5cage', { marker: { pos: C(-56.6, -20.4) } }),
    ev('fight', 'Out through the tannery', 'a5tan', { marker: { pos: C(-53, 44) } }),
    ev('sea', 'Ravenhold: the gate guards will not let them in', 'a5wash', { marker: { pos: Y(7, 225) } }),
  ]),
  q_ring: Q('The Ring of Halfdan', "Raven-Feeder's handle cracked in the tannery fight. Brokk takes the axe apart to fit a new one.", 'q_wing', 200, [
    talk('brokk', 'Brokk has the axe apart at the forge', 'brokk'),
    ev('sail', "Sail for Gannet Rock with Leif, two days' sail north", 'a5gannet', { marker: { pos: B('pier', -2.2, 4) } }),
    reach('hut', 'Climb to the turf hut near the top', 'a5hut', [471.6, 1128.6], { r: 4.5 }),
    talk('thrand', 'Show the old man the ring', 'thrand'),
  ]),
  q_wing: Q('The Wing Isle', 'To beat Håkon, the alliance needs the three neutral islands. The first is Vængr, the Wing Isle.', 'q_ribbon', 420, [
    ev('sail', 'Sail for Vængr', 'a5vaengr', { marker: { pos: B('pier', -2.2, 4) } }),
    talk('svanhild', 'The captain of the guard is waiting at the harbor', 'svanhild'),
    talk('jorund', 'Jarl Jorund', 'jorund'),
    reach('village', 'March to defend the third village', 'a5village', [8, 1213], { r: 9 }),
    ev('hold', 'Hold the forest settlement', 'a5held'),
    reach('holm', 'The holmgang ground, by the shore', 'a5holm', [-86, 1282], { r: 9 }),
    ev('skarde', 'Skarde Bear-Maw', 'a5skarde'),
    talk('join', 'Jarl Jorund has come to the holmgang ground', 'jorund'),
    talk('sick', 'The voyage home', 'svanhild'),
  ]),
  q_ribbon: Q('The Letter That Was Never Written', "In early summer, Astrid catches one of Sigurd's messengers sneaking through the hills.", 'q_feast', 160, [
    talk('astrid', "Astrid has caught one of Sigurd's messengers", 'astrid'),
    ev('cell', 'Go down to the cell where Torvald has been held for half a year', 'a5cell', { marker: { pos: Y(-88, 163.2) } }),
    ev('signe', 'That night: Bjorn and Signe', 'a5signe', { marker: { npc: 'signe' } }),
  ]),
  q_feast: Q('The Feast of Survivors', 'By midsummer, Ravenhold has rebuilt. The town decides it has earned one night of happiness, and holds a feast.', null, 80, [
    talk('brokk', 'Brokk is telling the story of his crushed hand again', 'brokk'),
    ev('contest', 'Astrid has challenged Svanhild to an archery contest', 'a5contest', { marker: { pos: Y(17, 143.5) } }),
    ev('wall', 'Away from the fires: look down from the harbor gate', 'a5kiss', { marker: { pos: Y(0, 209.5) } }),
    ev('boat', 'Near midnight: a small boat rows into the harbor', 'a5boat', { marker: { pos: Y(-1, 244) } }),
  ]),
});

const E = 'Eirik', L = 'Leif', In = 'Princess Ingrid', As = 'Astrid', Tv = 'Torvald', Br = 'Brokk', Bj = 'Bjorn', Sv = 'Svanhild', Jo = 'Jarl Jorund', Th = 'Old Thrand';
const N = (t, o = {}) => ({ s: '', t, ...o });
Object.assign(DIALOGUE, {
  // ---- Chapter 1: Ashes Again -------------------------------------------------------------
  a5_assembly: [N('Ravenhold calls an assembly. Half the town blames Eirik for bringing Håkon down on them. The other half says he is the only reason they are alive.'),
    N('Hauk stands up. He has aged ten years in a month.', { fx: { do: 'haukUp' } }), { s: 'Hauk', t: 'My son followed you across the sea. He came home in a sailcloth.' },
    N('Nobody breathes. Eirik does not defend himself. He does not explain about the trap, or Torvald, or the narrow channel. He stands and listens until Hauk has said everything he needs to say.'),
    { s: E, t: "I'm sorry. I'll carry it." }, N('Hauk sits down. He does not forgive him. But he does not leave Ravenhold either.', { fx: { do: 'haukDown' } }),
    N('The rebuilding begins, and it is nothing like the glorious wall-building of five years ago. There is not enough of anything. Every choice costs something.')],
  // ---- Chapter 2: The Winter of Hunger --------------------------------------------------------
  a5_grain: [N('The winter is the worst in living memory.'), N('Flood water got into the last grain store, and by midwinter the barley is grey with mould. Several families eat it anyway. They get sick.'),
    N("Then a sailor arrives from the south with the bloody flux, a disease of the gut that turns people's insides to water. It spreads through the crowded refugee houses like fire through thatch.")],
  a5_command: [N('Ingrid takes command. The sick go into a separate hall. Everyone must wash their hands. Water must be boiled.'),
    N('The latrine must be moved away from the well, again. Soiled bedding must be burned, not washed in the stream that people drink from.')],
  a5_quarrel: [N('Many people refuse. They say sickness is a punishment from the gods.'),
    N('Old Hrefna says the gods want a blood sacrifice at the midwinter blot, and that a horse should be killed and its blood sprinkled on the sick.'),
    N('The two healers have a screaming argument in the middle of the market.'), N('It is Eirik who finds the compromise.')],
  a5_blot: [N('They hold the blot. A horse is sacrificed, as the old ways demand, its meat shared out at a feast for the whole town, which is the best thing that has happened to the hungry in weeks.'),
    N('Hrefna blesses the sick hall.'), N("And then, in front of everyone, Hrefna announces that the gods have told her they prefer their worshippers' pots to be boiled clean.", { fx: { do: 'boiled' } }),
    N('After that, people boil their water.')],
  a5_frog: [N("A traveling merchant arrives selling a magical cure: a bottle of brown liquid with a dried frog in it, guaranteed by the gods of three countries. Leif is about to buy two bottles for Ingrid's hospital when she catches him."),
    { s: L, t: 'It was guaranteed.' }, { s: In, t: 'By whom?' }, { s: L, t: 'The merchant.' }, { s: In, t: 'The man selling it?' }, { s: L, t: 'Yes.' }, { s: In, t: 'Leif.' }, { s: L, t: 'I am beginning to understand your objection.' },
    N('The merchant is thrown out of Ravenhold. Old Skeggi the goat eats his frog.', { fx: { do: 'frog' } })],
  a5_law: [N('Of course, there is a legal fight. A neighboring farmer claims the whale because it beached on his shore.'),
    N('King Hallvard of Gulen, who is staying in Ravenhold, recites the ancient whale law from memory: a whale belongs to the landowner, but anyone who helps cut it is owed a share, and in a famine winter, the hungry come first.'),
    N('The farmer gets a third. He is not happy. Everyone else eats.')],
  a5_debt: [N('One more case comes to Eirik that winter. A refugee family from Kinn cannot pay their debt to a Ravenhold merchant. By law, the father and his oldest daughter can be taken as thralls until it is paid. The merchant has every right.'),
    N('Eirik remembers the girl in the slave pen at Kaupang. He pays the debt himself.', { fx: { do: 'pay' } })],
  a5_first: [N('Then he goes to the Thing and asks Ravenhold to agree to a new rule: no one who comes to Ravenhold for shelter can be made a thrall for debt.'),
    N('The vote is close and bitter. It passes.', { fx: { do: 'vote' } }), N('It is the first law Eirik ever makes.')],
  // ---- Chapter 3: The Raven Taken -----------------------------------------------------------------
  a5_mad: [N('The kings think Eirik is mad to care. They are planning a war, and he is worried about a bird.'),
    N('But {w} was with him when he had nothing. She was the first voice he heard after the lightning.'), N('Eirik goes himself, with Astrid and Leif. He does not tell the kings.')],
  a5_cage: [N('He finds {w} in a small wooden cage in the mews, with a hood over her head. She is thin and her feathers are falling out. When he takes off the hood, she does not recognize him for a moment.'),
    { s: E, t: 'I am here.' }, N('Then her thought comes, very small.'), { s: '{w}', t: 'Home.' }],
  // ---- Chapter 4: The Ring of Halfdan --------------------------------------------------------------
  a5_collar: [N("Raven-Feeder's handle cracked in the tannery fight. Brokk takes the axe apart to fit a new one. This time he takes off the dark iron collar at the top of the handle, the one he has never touched."),
    N('Inside it, packed into a hollow in the wood, wrapped in oiled cloth, is a ring.'),
    N('It is a heavy gold oath-ring, the kind that chieftains and kings swear on. Stamped into it is a seal: a crowned raven over three waves.', { fx: { give: { halfdan_ring: 1 } } }),
    N('Brokk holds it up to the fire.'), { s: Br, t: "I've seen that seal. On old coins. That's the seal of King Halfdan the Grey." }, N('Bjorn, leaning on his stick by the hearth, closes his eyes.'),
    { s: Bj, t: "I wondered. When I found you with that axe. The way your father must have fought. I wondered if Ragnar had been one of the old king's men. I never asked, because I was afraid of what you'd do if you knew." },
    N("Only one person alive might know the truth. Brokk remembers an old warrior named Thrand who served in Halfdan's guard and now lives as a hermit on Gannet Rock, a lonely island of seabirds two days' sail north.")],
  a5_thrand: [N('When Eirik shows him the ring, the old man begins to weep.'), { s: Th, t: "Your mother had her father's eyes." }, N('Eirik does not understand.'), N('Then Thrand tells him everything.'),
    N('King Halfdan the Grey ruled the whole North, mainland and islands, for thirty years. He had no sons. He had one daughter, born late in his life: Ylva.'),
    N('When Halfdan died, the great jarls fought over his kingdom. Ylva was the last of his blood. Any jarl who married her could claim the throne, and any jarl who wanted the throne for himself had to kill her.'),
    N("One of Halfdan's most trusted guards smuggled her out of the burning royal hall. He hid her in a lonely farm on the coast. He fell in love with her. They married and lived as poor farmers for fifteen years, and nobody knew."),
    N('That guard was Ragnar. Their son was Eirik.'), N('And Ragnar had a shield-brother, the man he trusted most in the world, who knew the secret: Håkon.'),
    N("Håkon believed the North had bled for twenty years because of fights over Halfdan's crown. He believed that as long as one drop of Halfdan's blood lived, there would always be someone to fight over. So he decided to end the bloodline and make himself the only power left. Sigurd's Iron Circle paid for it."),
    N("Eirik's parents were not killed for tribute or by bad luck. They were murdered because of who his mother was."), N('Eirik sits on the cold stone floor of the hut for a long time.', { fx: { do: 'floor' } }),
    { s: E, t: 'If I am the last of his blood, does that make me king?' }, N('Thrand shakes his head slowly.'),
    { s: Th, t: 'Blood may give a man a claim. It does not give him the right to be followed. Your grandfather knew that. He was a great king because people chose to follow him, not because his father was a king before him.' },
    N("Now Eirik understands the line in the Iron Circle's letter. Confirm the bloodline is ended before the North is crowned. They were checking that he was dead."),
    N('His war is not just revenge anymore. It is a question that will matter long after Håkon is gone: what gives anyone the right to rule?')],
  // ---- Chapter 5: The Wing Isle ------------------------------------------------------------------------
  a5_svanhild: [N("Vængr's ruler, Jarl Jorund, is a thin, suspicious man who has kept his island free for thirty years by never trusting anyone. His household guard is the finest in the islands: two hundred swordsmen trained since childhood. Their captain is Svanhild."),
    N('Svanhild meets Eirik at the harbor with her hand on her sword hilt. She is tall, fair-haired, scarred across the knuckles, and looks at him as if measuring him for a coffin.'),
    { s: Sv, t: 'Men say you defeat wolves with an axe and speak to ravens. I would rather know whether you keep your promises.' }],
  a5_jorund: [N('Jorund will not even hear Eirik out. But Håkon makes the decision for him.'),
    N("While Eirik is on the island, Skarde Bear-Maw, the berserker champion, lands on Vængr's north coast with sixty berserkers.", { fx: { do: 'landed' } }),
    N("Berserkers are warriors who work themselves into a killing madness before battle. Skarde's men wear bear and wolf skins, howl like animals and bite the rims of their own shields until their mouths bleed. Some say they drink a potion made from red mushrooms. They feel no pain and never retreat."),
    N("The berserkers burn two fishing villages. Jorund's guard is scattered along the coast. Eirik does not wait for an invitation. He, Astrid, Leif and twenty Ravenhold warriors march to defend the third village.")],
  a5_join: [N('Jarl Jorund comes to the holmgang ground and looks at the dead champion for a long time. Then he looks at the village that is still standing, and at Eirik, who has asked him for nothing.'),
    { s: Jo, t: "You defended my people without asking for tribute. I've never known anyone do that. Vængr will join your alliance." }, N("Svanhild asks Jorund's permission to go with Eirik. Jorund gives it."),
    { s: Sv, t: "You fight well when you're calm. But your temper will kill you before your enemies do." }, { s: E, t: 'I know.' }, { s: Sv, t: "Good. Then I'll stay close until you've fixed it." }],
  a5_sick: [N('On the voyage back to Ravenhold, the greatest sword-fighter in the islands spends two days with her head over the side of the Sea-Raven, being horribly sick. Leif is so delighted he cannot stop smiling.'),
    { s: Sv, t: 'Not a word.' }, { s: L, t: 'I said nothing.' }, { s: Sv, t: "You're saying it with your face." }],
  // ---- Chapter 6: The Letter That Was Never Written ---------------------------------------------------------
  a5_messenger: [N("In early summer, Astrid catches one of Sigurd's messengers sneaking through the hills with letters for Håkon's spies. Under questioning, the frightened man tells everything he knows."),
    N('The letter that broke Torvald was a forgery. Sigurd wrote it himself.'),
    N("Torvald's daughter Runa did not survive her captivity. She died of fever on a farm on Svartøy eight years ago. Her owner kept her hair ribbon. Sigurd's men bought it from him for a single silver coin, because they needed something to break a loyal man.")],
  a5_cell: [N('Eirik goes down to the cell where Torvald has been held for half a year. He tells him.'),
    N('Torvald does not move for a long time. Then he bends over and makes a sound Eirik has never heard a man make.', { fx: { do: 'bend' } }),
    N('When he can speak again, he tells Eirik the rest. There is more, and it is worse.'),
    N("Torvald knew about Ylva. He was one of the guards who helped Ragnar smuggle her out of Halfdan's hall. He was Ragnar's friend too, as close as Håkon."),
    N("Years later, when Håkon started gathering power, Håkon asked Torvald where Ragnar was hiding. Torvald told him. He told himself Håkon only wanted to talk. He told himself that if Halfdan's line was ended, the North would finally stop fighting over the crown. He told himself a great many things."),
    N('Then he lost his nerve. He rode to Hrafnvik and warned Ragnar to run. He was the grey-cloaked man at the door, the night before the first snow.'),
    { s: Tv, t: 'And then I rode away. I could have stayed and stood beside him. He would have had one more shield. I chose to live.' }, N('He looks up at Eirik.'),
    { s: Tv, t: 'I told myself one family might die so a thousand families could live.' }, N("Eirik's voice is very quiet."), { s: E, t: 'One of those families was mine.' }, { s: Tv, t: 'I know.' },
    N('Eirik walks out of the cell without another word. He orders Torvald held until all the rulers of the alliance can judge him together.')],
  // ---- Chapter 7: The Feast of Survivors ------------------------------------------------------------------------
  a5_serpent: [N('Brokk tells the story of his crushed hand again; tonight it was a sea serpent, which he wrestled for three days.')],
});

/** What each piece of the rebuilding costs (Chapter 1, the story's own sentences). */
export const COSTS = {
  tower: 'Timber for a new watchtower means three refugee families sleep in a barn for the winter.',
  harbor: 'Rebuilding the harbor means the healing house waits.',
  ship: 'A new ship means less firewood in the coldest month.',
  end: 'Eirik learns that leading people is mostly choosing which of them will be disappointed.',
};
/** What the black raven makes of the camp: a list of things to steal and people to hate. (game: the labels; the story says only that his pictures are hard to read) */
export const SOT = [['dogs', 'Dogs. Hate.', 'kennel'], ['mews', 'Birds on sticks. Her. Dark.', 'mews'], ['way', 'Stink. No men. Stink.', 'yard']];
/** The archery contest (Chapter 7, word for word): who the camera is on, who speaks, what is said, and what happens. */
export const CONTEST_LINES = [
  ['both', '', 'Astrid challenges Svanhild to an archery contest. Svanhild, who has never lost at anything, accepts.', 'draw'],
  ['goat', '', 'Her first arrow hits a goat. Fortunately it is Old Skeggi, who does not notice, and walks around for the rest of the night with an arrow stuck in his woolly backside like a feather in a hat.', 'goat'],
  ['both', '', 'Her second arrow goes over the wall entirely.', 'over'],
  ['astrid', '', 'Astrid laughs out loud, a sound almost nobody has heard.', 'laugh'], ['astrid', As, 'Your sword cannot solve everything.'],
  ['svanhild', '', 'Svanhild draws her sword and points it at the target.', 'sword'], ['svanhild', Sv, 'Give me a sword and I will prove otherwise.'],
  ['target', '', 'She throws the sword. It hits the target dead center.', 'throw'],
  ['both', '', 'The crowd goes wild. Astrid concedes the point. They have been friends ever since.', 'cheer'],
];
/** The harbor wall (Chapter 7, word for word). */
export const KISS_LINES = [
  ['wide', '', 'Leif finds Ingrid away from the fires, by the harbor wall where the noise is quieter. For once he does not make a joke.'],
  ['two', L, 'I used to believe the world belonged to whoever could take the most.'], ['two', In, 'And now?'], ['two', L, 'Now I think I would rather have someone waiting when I come home.'],
  ['two', '', 'Ingrid takes his hand. Their first kiss is quiet, away from everyone, with the sound of the sea and the music in the distance.'],
  ['eirik', '', 'Eirik sees them from the wall and smiles, and does not tell anyone. Freydis sees them too, and tells everyone within the hour.'],
  ['town', '', 'For one night, everyone in Ravenhold is happy.'],
];

Object.assign(HINTS, {
  reachHer: 'Press {raven} to reach for {w}.',
  sotEye: 'Press {raven} to see through {b}. Fly over the camp and press {interact} on what he shows you. His pictures are hard to read.',
  sneak: 'Stay low ({crouch}) and out of the torchlight. The guards by the fire are not looking; the ones who walk are.',
  pit: 'The dogs are coming. Get to a pit and press {interact}.',
  waitHim: 'Stop attacking. Guard ({block}), give ground, slip aside ({dodge}). Let him tire himself out on air.',
});
