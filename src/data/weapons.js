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
