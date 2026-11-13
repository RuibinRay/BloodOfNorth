// The painted art (files in public/art, listed in src/data/art.js) and where the game uses it: a portrait beside
// what someone says, a painting behind a title, a picture of a thing he carries, parchment under the panels and
// the map. Everything here answers null when there is no painting, and the game then shows what it drew before.
import { ART } from '../data/art.js';
import { ACTS } from '../data/chapters.js';

const P = ART.portraits || {}, I = ART.items || {}, C = ART.cards || {}, CH = ART.chapters || {}, U = ART.ui || {};
const TITLES = new Set(['king', 'queen', 'jarl', 'prince', 'princess', 'old', 'the']);
const KIN = new Set(['son', 'father', 'mother', 'daughter', 'brother', 'wife', 's']); // "Kári's son" is not Kári
const plain = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/[^a-z ]/g, ' ').split(' ').filter(Boolean);

// Speakers whose picture is not under the first word of their name: the two lawspeakers, the nameless traders,
// and the things in the valley that "speak" when Eirik looks at them.
const NAMED = { 'the lawspeaker': 'lawman', 'the lawspeaker of kaupang': 'klaw', 'a drunk sailor': 'sailor', 'an ironmonger': 'ironmonger', 'a salt seller': 'salter', 'a grain factor': 'factor',
  'a jarnoy smith': 'jtrader', 'the raven stone': 'raven_stone', 'the twin axe stone': 'twin_axe_stone', 'the barrow': 'barrow', 'the split birch': 'split_birch', 'the spear in the ice': 'spear_ice', 'the tarn': 'tarn', 'sky iron': 'sky_iron' };

/** Whose face goes beside this speaker's words, as a file, or null. Eirik's follows his age in the story.
 *  `name` is the speaker as the story data has it, so a raven is still {w} or {b} here whatever she has been named. */
export function portraitFor(name, g) {
  if (/\{w\}/.test(name)) return P.raven_white || null;
  if (/\{b\}/.test(name)) return P.raven_black || null;
  const w = plain(name);
  if (NAMED[w.join(' ')]) return P[NAMED[w.join(' ')]] || null;
  if (!w.length || w.some((x) => KIN.has(x))) return null;
  if (w[0] === 'eirik') return P[!g.player.adult ? 'eirik_child' : g.state.quests.q_ravenhold ? 'eirik_king' : 'eirik'] || null;
  if (w[0] === 'little' && w[1] === 'brokk') return P.lbrokk || null;
  const first = w.find((x) => !TITLES.has(x));
  return (first && P[first]) || null;
}
/** A companion's or a cast member's portrait by id. */
export const portraitOf = (id) => P[id] || null;
/** The painting of a thing he carries, by the game's item id. Raven-Feeder is shown as she is after each reforging. */
export const itemArt = (id, g) => (id === 'father_axe' && g && I['father_axe_' + (g.state.flags.reforge || 0)]) || I[id] || null;
/** The painting for the part of the story in hand: the active chapter's own, else its act's; the title painting when there is none. */
export function actArt(g) {
  const q = g.state ? g.state.quests : {}, id = Object.keys(q).find((k) => q[k].status === 'active' && ACTS.some((a) => a.quests.includes(k)));
  if (id && CH[id]) return CH[id];
  const i = id ? ACTS.findIndex((a) => a.quests.includes(id)) : -1;
  if (i < 0) return (g.state && g.state.stage === 'open' ? C.title : C.act1) || null; // nothing begun yet: a new game opens Act I
  return C[i === 7 ? 'epilogue' : 'act' + (i + 1)] || null;
}
/** The painting of an act, by its place in the Acts menu (0 to 7). */
export const actArtAt = (i) => C[i === 7 ? 'epilogue' : 'act' + (i + 1)] || null;
export const titleArt = () => C.title || null;
export const parchment = () => U.parchment || null;
export const compass = () => U.compass || null;
/** A chapter's own painting, by quest id. */
export const chapterArt = (id) => CH[id] || null;
