// The painted art (files in public/art, listed in src/data/art.js) and where the game uses it: a portrait beside
// what someone says, a painting behind a title, a picture of a thing he carries, parchment under the panels and
// the map. Everything here answers null when there is no painting, and the game then shows what it drew before.
import { ART } from '../data/art.js';
import { ACTS } from '../data/chapters.js';

const P = ART.portraits || {}, I = ART.items || {}, C = ART.cards || {}, U = ART.ui || {};
const TITLES = new Set(['king', 'queen', 'jarl', 'prince', 'princess', 'old', 'the']);
const KIN = new Set(['son', 'father', 'mother', 'daughter', 'brother', 'wife', 's']); // "Kári's son" is not Kári
const plain = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/[^a-z ]/g, ' ').split(' ').filter(Boolean);

/** Whose face goes beside this speaker's words, as a file, or null. Eirik's follows his age in the story. */
export function portraitFor(name, g) {
  const w = plain(name);
  if (!w.length || w.some((x) => KIN.has(x))) return null;
  if (w[0] === 'eirik') return P[!g.player.adult ? 'eirik_child' : g.state.quests.q_ravenhold ? 'eirik_king' : 'eirik'] || null;
  if (w[0] === 'little' && w[1] === 'brokk') return P.lbrokk || null;
  const first = w.find((x) => !TITLES.has(x));
  return (first && P[first]) || null;
}
/** A companion's or a cast member's portrait by id. */
export const portraitOf = (id) => P[id] || null;
/** The painting of a thing he carries, by the game's item id. */
export const itemArt = (id) => I[id] || null;
/** The painting for the part of the story in hand (the act of the active chapter); the title painting when there is none. */
export function actArt(g) {
  const q = g.state ? g.state.quests : {}, id = Object.keys(q).find((k) => q[k].status === 'active' && ACTS.some((a) => a.quests.includes(k)));
  const i = id ? ACTS.findIndex((a) => a.quests.includes(id)) : -1;
  if (i < 0) return (g.state && g.state.stage === 'open' ? C.title : C.act1) || null; // nothing begun yet: a new game opens Act I
  return C[i === 7 ? 'epilogue' : 'act' + (i + 1)] || null;
}
/** The painting of an act, by its place in the Acts menu (0 to 7). */
export const actArtAt = (i) => C[i === 7 ? 'epilogue' : 'act' + (i + 1)] || null;
export const titleArt = () => C.title || null;
export const parchment = () => U.parchment || null;
