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
};
/** The order the weapon key steps through. */
export const MELEE_ORDER = ['father_axe', 'sword', 'spear', 'longaxe'];

Object.assign(ITEMS, {
  sword: { name: 'Sword', desc: 'The quickest blade: fast blows that cost little breath, the widest moment to parry in, and the hardest riposte. It wears a guard down slowly. Takes a shield.', cat: 'Weapon' },
  spear: { name: 'Ash spear', desc: 'Reach. It lands before a man can step into his own swing, and a quick thrust stops an attack that has started. A narrow point: one man at a time. Takes a shield.', cat: 'Weapon' },
  longaxe: { name: 'Long axe', desc: 'Two hands, no shield. Slow and hungry for breath, but each blow hits half again as hard, sweeps three or four men, and a heavy one breaks a shield-bearer\'s guard outright.', cat: 'Weapon' },
  throwaxe: { name: 'Throwing axe', desc: 'A small axe balanced to turn once in ten paces. It hits hard, shakes a guard and stops a swing. One that misses can be picked up again.', cat: 'Weapon' },
});
