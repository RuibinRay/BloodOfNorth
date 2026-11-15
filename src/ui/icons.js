// Icons: one small line drawing for every item, weapon, skill and kind of mission. Drawn here as SVG paths on a
// 24 x 24 grid (stand-ins until there is real icon art); they take the colour of the text round them.
const P = {
  axe: 'M6 21 L15 6 M13 4 l6 1 c2 3 1 6 -1 8 l-6 -6 z',
  sword: 'M5 19 L18 6 l2 -2 M9 13 l2 2 M4 20 l2 -2 M7 15 l-2 -2 M9 17 l2 2',
  twin: 'M4 20 L16 5 l2 -1 l-1 2 z M20 20 L8 5 l-2 -1 l1 2 z',
  spear: 'M3 21 L16 8 M16 8 l5 -5 l-1 6 z',
  longaxe: 'M4 22 L16 4 M14 3 c5 0 7 3 7 7 c-3 0 -5 -1 -7 -3 z',
  maul: 'M4 21 L13 11 M11 7 l6 6 l4 -4 l-6 -6 z',
  bow: 'M8 3 C18 7 18 17 8 21 M8 3 V21 M3 12 H16 M16 12 l-3 -2 M16 12 l-3 2',
  arrow: 'M4 20 L19 5 M19 5 h-5 M19 5 v5 M4 20 l4 -1 M4 20 l1 -4',
  shield: 'M12 3 a9 9 0 1 0 .01 0 M12 10 a2 2 0 1 0 .01 0',
  knife: 'M4 20 l4 -4 M8 16 L19 5 l-1 6 l-7 6 z',
  coins: 'M12 6 c4 0 7 1 7 2.5 S16 11 12 11 S5 10 5 8.5 S8 6 12 6 M5 8.5 v4 c0 1.5 3 2.5 7 2.5 s7 -1 7 -2.5 v-4 M5 12.5 v4 c0 1.5 3 2.5 7 2.5 s7 -1 7 -2.5 v-4',
  wolf: 'M4 4 l4 5 h8 l4 -5 l-1 9 l-5 7 h-4 l-5 -7 z M9 13 h.01 M15 13 h.01 M11 17 h2',
  meat: 'M6 14 c0 -6 6 -9 10 -6 c3 3 0 9 -5 9 l-3 3 l-2 -2 z M13 10 a1.5 1.5 0 1 0 .01 0',
  fish: 'M3 12 c4 -6 11 -6 14 0 c-3 6 -10 6 -14 0 z M17 12 l4 -4 v8 z M7 11 h.01',
  hide: 'M6 4 l3 2 h6 l3 -2 l-1 5 l2 3 l-3 2 l1 6 l-5 -2 l-5 2 l1 -6 l-3 -2 l2 -3 z',
  wood: 'M4 8 h13 a2.5 2.5 0 0 1 0 5 h-13 a2.5 2.5 0 0 1 0 -5 z M7 13 v0 M7 15 h13 a2.5 2.5 0 0 1 0 5 h-13 a2.5 2.5 0 0 1 0 -5 z',
  flint: 'M5 17 l5 -9 l6 3 l-4 9 z M17 6 l2 -2 M19 10 h2 M14 5 v-2',
  ring: 'M12 6 a6.5 6.5 0 1 0 .01 0 M12 9 a3.5 3.5 0 1 0 .01 0',
  raven: 'M3 14 c3 -6 8 -8 13 -6 l5 -3 l-2 5 c0 5 -4 8 -9 8 l-2 3 l-1 -4 c-2 0 -3 -1 -4 -3 z M15 9 h.01',
  ship: 'M3 15 h18 l-3 5 h-12 z M12 15 V4 M12 5 l6 8 h-6',
  compass: 'M12 3 a9 9 0 1 0 .01 0 M15 9 l-2 5 l-4 1 l2 -5 z',
  star: 'M12 3 l2.6 6 l6.4 .6 l-4.9 4.2 l1.5 6.2 l-5.6 -3.4 l-5.6 3.4 l1.5 -6.2 l-4.9 -4.2 l6.4 -.6 z',
  bolt: 'M13 2 L5 13 h6 l-1 9 l9 -12 h-6 z',
  step: 'M3 12 h9 M8 7 l5 5 l-5 5 M15 5 l6 7 l-6 7',
  horn: 'M4 10 v4 l9 4 V6 z M16 9 c2 1 2 5 0 6 M19 7 c3 2 3 8 0 10',
  turn: 'M19 12 a7 7 0 1 1 -3 -5.7 M17 3 v4 h-4',
  guard: 'M12 3 l7 3 v5 c0 5 -3 8 -7 10 c-4 -2 -7 -5 -7 -10 V6 z M13 7 l-3 5 h4 l-3 5',
  scroll: 'M7 4 h10 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 H7 z M10 9 h6 M10 13 h6 M7 4 a2 2 0 0 0 -2 2 v2 h2',
  hand: 'M8 13 V6 a1.5 1.5 0 0 1 3 0 v5 M11 11 V4.5 a1.5 1.5 0 0 1 3 0 V11 M14 11 V6 a1.5 1.5 0 0 1 3 0 v8 c0 4 -2 7 -6 7 c-3 0 -5 -2 -6 -5 l-1 -3 c1 -1 2 -1 3 0 z',
  house: 'M4 11 l8 -7 l8 7 M6 10 v10 h12 V10 M10 20 v-6 h4 v6',
};
/** An icon as an inline SVG string. */
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || P.ring}"/></svg>`;
}
const ITEM = {
  firewood: 'wood', stick: 'wood', bark: 'wood', arrow: 'arrow', bow: 'bow', woodsword: 'sword', hare: 'meat', venison: 'meat', hide: 'hide', fish: 'fish', flint: 'flint',
  father_axe: 'axe', sword: 'sword', spear: 'spear', longaxe: 'longaxe', twin: 'twin', maul: 'maul', throwaxe: 'axe', shield: 'shield', silver: 'coins', wolf_brooch: 'wolf',
};
const CAT = { Weapon: 'sword', Ammunition: 'arrow', Game: 'meat', Resource: 'wood', Tool: 'flint', Keepsake: 'ring' };
/** The icon for an inventory item (by its id, else by its category). */
export const itemIcon = (id, cat) => ITEM[id] || CAT[cat] || 'ring';
const QUEST = { s_table: 'wolf', q_sea: 'compass', s_ship: 'ship', s_tithe: 'ship', s_pirates: 'ship', s_irontooth: 'ship', s_wreckers: 'bolt', s_beacon: 'star', s_brothers: 'axe', s_omens: 'star', q_axe: 'axe', q_open: 'compass', q_wings: 'raven', q_hearth: 'house' };
/** The icon for a mission: its own if it has one, else a raven for the main story and a hand for a favour. */
export const questIcon = (id, kind) => QUEST[id] || (kind === 'main' ? 'raven' : 'hand');
/** The storm skills and the Stormguard, for the bar at the bottom of the screen: [skill id, icon, input action]. */
export const ARTS = [['guard', 'guard', 'ward'], ['st_smash', 'bolt', 'art1'], ['st_step', 'step', 'art2'], ['st_cry', 'horn', 'art3'], ['st_break', 'star', 'art4']];
