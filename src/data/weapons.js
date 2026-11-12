// Melee weapon classes. The numbers scale the base blows in systems/combat.js and entities/player.js.
// The practice sword and Ragnar's axe are the baseline the story fights were tuned on: do not change theirs.
//   dmg      damage multiplier            reach   how far a blow lands (enemies strike at about 2.1)
//   arc      half-angle of the swing      speed   swing speed (higher is quicker)
//   stam     breath cost multiplier       posture how hard it wears a guard down
//   sweep    [light, heavy] men one blow can hit
//   parry    seconds after raising a guard in which a block is a parry
//   block    breath a blocked blow costs without a shield
//   riposte  damage multiplier on the blow after a parry
//   off      what the off hand may hold: 'any' (shield or the Left Brother), 'shield', or null (two hands)
//   stop     a light blow stops an attack that is winding up        breaker  a heavy blow breaks a shield-bearer's guard outright
//   anim / animHeavy   attack animation instead of the three-blow combo
import { ITEMS } from './act1.js';

export const WEAPONS = {
  woodsword: { real: false, dmg: 0.5, reach: 2.45, arc: 1.05, speed: 1, stam: 1, posture: 1, sweep: [1, 2], parry: 0.26, block: 14, riposte: 1.6, off: null },
  father_axe: { real: true, dmg: 1, reach: 2.45, arc: 1.05, speed: 1, stam: 1, posture: 1, sweep: [1, 2], parry: 0.26, block: 14, riposte: 1.6, off: 'any' },
  sword: { real: true, dmg: 0.85, reach: 2.5, arc: 1.05, speed: 1.3, stam: 0.8, posture: 0.7, sweep: [1, 2], parry: 0.36, block: 12, riposte: 2.1, off: 'shield' },
  spear: { real: true, dmg: 0.9, reach: 3.5, arc: 0.55, speed: 0.95, stam: 0.9, posture: 0.85, sweep: [1, 1], parry: 0.22, block: 16, riposte: 1.6, off: 'shield', stop: true, anim: 'thrust' },
  longaxe: { real: true, dmg: 1.5, reach: 2.95, arc: 1.45, speed: 0.72, stam: 1.5, posture: 1.6, sweep: [3, 4], parry: 0.2, block: 18, riposte: 1.6, off: null, breaker: true, animHeavy: 'chop' },
  // twin seaxes: the quickest; each light blow lands twice (the second at `double` of the first). No shield.
  twin: { real: true, dmg: 0.62, reach: 2.35, arc: 1.2, speed: 1.5, stam: 0.7, posture: 0.6, sweep: [1, 2], parry: 0.3, block: 15, riposte: 1.9, off: null, hold: 'seax', offHold: 'seax', double: 0.6 },
  // war maul: the slowest; nearly twice the harm, ruins a guard, and a heavy blow is a ground slam that catches everyone within `slam` metres.
  maul: { real: true, dmg: 1.8, reach: 2.9, arc: 1.1, speed: 0.6, stam: 1.8, posture: 2.2, sweep: [2, 4], parry: 0.18, block: 20, riposte: 1.5, off: null, breaker: true, anim: 'chop', animHeavy: 'slam', slam: 2.7 },
};
/** The order the weapon key steps through. */
export const MELEE_ORDER = ['father_axe', 'sword', 'twin', 'spear', 'longaxe', 'maul'];

Object.assign(ITEMS, {
  sword: { name: 'Sword', desc: 'The quickest blade: fast blows that cost little breath, the widest moment to parry in, and the hardest riposte. It wears a guard down slowly. Takes a shield.', cat: 'Weapon' },
  spear: { name: 'Ash spear', desc: 'Reach. It lands before a man can step into his own swing, and a quick thrust stops an attack that has started. A narrow point: one man at a time. Takes a shield.', cat: 'Weapon' },
  longaxe: { name: 'Long axe', desc: 'Two hands, no shield. Slow and hungry for breath, but each blow hits half again as hard, sweeps three or four men, and a heavy one breaks a shield-bearer\'s guard outright.', cat: 'Weapon' },
  twin: { name: 'Twin seaxes', desc: 'A long knife in each hand. The quickest weapon there is: every light blow lands twice and costs little breath. Each cut is small and wears a guard slowly. No shield.', cat: 'Weapon' },
  maul: { name: 'War maul', desc: 'A hammer for two hands. The slowest weapon and the hungriest for breath, but it hits nearly twice as hard, ruins a guard, breaks a shield wall, and a heavy blow slams the ground and catches every man near it.', cat: 'Weapon' },
  throwaxe: { name: 'Throwing axe', desc: 'A small axe balanced to turn once in ten paces. It hits hard, shakes a guard and stops a swing. One that misses can be picked up again.', cat: 'Weapon' },
});

// ---------------------------------------------------------------------------------------------------------------
// The weapons of the story (docs/story). What a thing IS and whose it is comes from the owner's text; the numbers
// and the skills are the game's. status: 'yours' (Eirik can carry it now) | 'enemy' (a champion fights with it,
// see story/champions.js) | 'story' (named in the story; not in play yet).
// ---------------------------------------------------------------------------------------------------------------
/** Raven-Feeder is reforged three times in the story: Jarnøy iron folded into the edge (Act III), Brokk and his
 *  nephew at the Skalløy forge (Act VI), and the strip of sky-iron Halvar adds last. state.flags.reforge = 0..3. */
export const REFORGE = [
  { name: 'Raven-Feeder', dmg: 1, posture: 1 },
  { name: 'Raven-Feeder, Jarnøy-edged', dmg: 1.1, posture: 1.08, cost: 30, note: 'Jarnøy iron is folded into her edge. A Jarnøy blade bends before it breaks.' },
  { name: 'Raven-Feeder, twice reforged', dmg: 1.2, posture: 1.16, cost: 45, note: 'Heated, folded and quenched in seawater, with a hiss and a cloud of steam.' },
  { name: 'Raven-Feeder, star-edged', dmg: 1.32, posture: 1.26, cost: 60, note: 'Iron from Jarnøy, a strip of sky-iron, and the iron of an old smith\'s craft.' },
];
const reforged = [WEAPONS.father_axe];
/** Raven-Feeder's numbers at a reforging level. */
export function ravenFeeder(level) {
  const lv = Math.max(0, Math.min(REFORGE.length - 1, level | 0));
  return reforged[lv] || (reforged[lv] = { ...WEAPONS.father_axe, dmg: REFORGE[lv].dmg, posture: REFORGE[lv].posture });
}
export const ARSENAL = [
  { id: 'father_axe', name: 'Raven-Feeder', bearer: 'Ragnar, then Eirik', status: 'yours', look: 'A bearded iron head, ravens scratched into the steel, and a collar of darker iron wrapped round the top of the haft.',
    text: "\"When I carried her, ravens never went hungry. Now she splits wood. That is a better job.\" The collar hides King Halfdan's oath-ring. Her haft cracks in the tannery fight and is snapped a hand short by Wolf's Judgment in the last one; the collar holds, and the head stays on.",
    play: 'The baseline every fight is tuned on. Takes a shield or the Left Brother. Reforged three times, each a little harder-hitting. Thunder Smash and the Turning Blow are hers.' },
  { id: 'shield', name: 'Round shield', bearer: 'Ragnar, Bjorn (the spare), Eirik', status: 'yours', look: 'Linden boards, a painted face, an iron boss.',
    text: "Ragnar takes one down the night the wolves come. Eirik walks out to meet Kettil with Bjorn's spare. Champions split them: Skarde on the first blow, Bersi twice, Håkon to pieces.", play: 'Stops arrows; blocking costs less; the boss shoves. A champion with a shield-splitting skill leaves Eirik without one for a while.' },
  { id: 'twin', name: 'The Twins', bearer: 'Leif', status: 'yours', look: 'A long seax on one hip and a short sword on the other.',
    text: "Leif gives the short sword to Ingrid at their wedding and fights with one blade, and the sword she gave him, until Liv is born.", play: 'The dual-blade class: every light blow lands twice. In play now as twin seaxes; Leif himself is not built yet.' },
  { id: 'storm_yew', name: 'Storm-Yew', bearer: 'Astrid', status: 'story', look: 'A bow cut from the young yew that grew through the scorched stump of the lightning-split birch. It hums when the string is drawn, like wind in rigging.',
    text: 'Made by Brokk and a Jarnøy bowyer. Her first arrow goes clean through a fence post at a hundred paces. "A yew that sings in a storm."', play: 'Planned as Astrid\'s weapon (Act III). The split tree stands by Bjornstead now.' },
  { id: 'brokk_hammer', name: "Brokk's forging hammer", bearer: 'Brokk, then Halvar', status: 'story', look: 'A smith\'s hammer, forty years in one hand.', text: 'He holds a doorway with it against Bersi Black-Anvil. It hangs over the workshop door in the epilogue.', play: 'Planned (Act VI).' },
  { id: 'starfall', name: 'Star-Fall', bearer: 'Halvar makes it; Eirik gives it to Torvald', status: 'story', look: 'A war hammer of sky-iron: black, heavy, and it rings like a bell.',
    text: '"Metal remembers every blow. Give it a good one to remember." It breaks shields, doors and chains at the thrall pens, and is never used again.', play: 'Modelled; planned for Act VII.' },
  { id: 'torvald_hammer', name: "Torvald's war hammer", bearer: 'Torvald Grey-Cloak', status: 'story', look: 'A war hammer slung across the back of a grey cloak.', text: 'The first thing the boy sees of the stranger at the door.', play: 'Planned (Act III). The war maul is its class.' },
  { id: 'svanhild_sword', name: "Svanhild's sword", bearer: 'Svanhild', status: 'story', look: "A guard-captain's sword, kept perfect.", text: 'Every cut is perfect, every step is placed. Thrown, it hits a target dead centre.', play: 'Planned (Act V). The sword is its class.' },
  { id: 'bjorn_axe', name: "Bjorn's bearded axe", bearer: 'Bjorn', status: 'story', look: 'A big bearded axe.', text: 'He holds the gate of Ravenhold with it for an hour. It is buried with him, with a ham and a barrel of ale.', play: 'Bjorn fights beside Eirik in the raid with an axe now.' },
  { id: 'skull_ringer', name: 'Skull-Ringer', bearer: 'Freydis', status: 'story', look: "Signe's iron frying pan, on a peg by the door.", text: 'It makes a sound like a hammer on an anvil.', play: 'Planned (Act II, the peddlers).' },
  { id: 'warbow', name: "Arne's war bow", bearer: 'Arne Longshot', status: 'enemy', look: 'A long war bow and black-feathered arrows; a seax and throwing knives for when he is cornered.', text: 'He has killed more people from a hundred paces than most warriors have at arm\'s length.', play: 'Black-Feather Volley, Pinning Shot, Cornered Cat.' },
  { id: 'halfshield', name: "Rurik's sword and shield", bearer: 'Rurik Shieldsplitter', status: 'enemy', look: 'A long sword and a plain round shield painted half black, half white.', text: 'The best pure swordsman Eirik has faced: calm, precise, never wasting a move.', play: 'Shield-Split, The Even Hand; he will not strike a man who cannot answer.' },
  { id: 'daneaxe', name: "Skarde's Dane axe", bearer: 'Skarde Bear-Maw', status: 'enemy', look: 'A two-handed axe as tall as a man; he wears a bear\'s skull.', text: 'It splits Eirik\'s shield on the first blow.', play: "Bear's Maw, Shield-Biter, and the lie about Ragnar. He tires." },
  { id: 'eydis_spear', name: "Eydis's spear and javelins", bearer: 'Eydis the Mire', status: 'enemy', look: 'A long spear, and a bundle of javelins on her back.', text: 'She keeps him at the end of it and lets the mud do the rest.', play: 'Mire-Lance, Javelin Rain, Poisoned Point, Sucking Ground.' },
  { id: 'anvilhammer', name: "Bersi's hammer", bearer: 'Bersi Black-Anvil', status: 'enemy', look: 'A war hammer whose head is as big as an anvil.', text: 'It crushes an anvil and brings down a burning beam. It is said he once killed a horse with one blow.', play: 'Anvil-Drop, Shield-Breaker, Horse-Killer. He never tires; his own weight is the way through.' },
  { id: 'ulf_swords', name: "Ulf's two swords", bearer: 'Ulf Two-Blades', status: 'enemy', look: 'A sword in each hand.', text: 'Both at once, changing direction mid-swing, laughing the whole time.', play: 'The Scissor, Whirl, Change-Step.' },
  { id: 'kettil_axe', name: "Kettil's hand axe and buckler", bearer: 'Kettil Red-Hand', status: 'enemy', look: 'A hand axe in the left hand; a small iron buckler strapped to the ruined right forearm, with a knife hidden in it and another in his boot.', text: 'He does not care about honor or glory. He wants to live.', play: 'Buckler-Hook, Mud in the Eyes, Boot-Knife.' },
  { id: 'vigdis_seaxes', name: "Vigdis's seaxes", bearer: 'Vigdis Quickblood', status: 'enemy', look: 'A seax in each hand and no shield.', text: 'She darts in, cuts, and is gone. Left-left, right-right.', play: 'Left-Left, Right-Right; Quickblood. Watch her feet, not her blades.' },
  { id: 'gorm_club', name: "Gorm's club and shield", bearer: 'Gorm Stone-Lung', status: 'enemy', look: 'A huge round shield bound in iron, a club with an iron head the size of a child, three layers of mail.', text: 'He has never been beaten.', play: 'Wall of Iron, Shield-Swat, Stone-Lung Crush. Make him swing; break the rim; then he is open.' },
  { id: 'wolfsjudgment', name: "Wolf's Judgment", bearer: 'Jarl Håkon Ironwolf', status: 'enemy', look: 'A great war hammer with a head of black iron ringed with short, cruel spikes.', text: 'The hammer that killed Ragnar.', play: "Håkon fights in four parts: the sword of the guardsman, the weapons of war, Wolf's Judgment, the last oath." },
];

Object.assign(ITEMS, {
  wolf_brooch: { name: 'Wolf brooch', desc: "Black iron, a wolf's head. The Ironwolf gave one to each of his seven champions with a seat at his table.", cat: 'Keepsake' },
});
ITEMS.father_axe.name = 'Raven-Feeder';
ITEMS.father_axe.desc = "Your father's axe: a bearded head with ravens scratched into the steel, and a collar of darker iron at the top of the haft. \"A blade may save your life, but wisdom decides when to draw it.\"";
