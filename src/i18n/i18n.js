// The game's languages: English, 中文 (Simplified Chinese) and Español (neutral Spanish).
//
// Every piece of text the player reads goes through tr() on its way to the screen. The English text itself is the key:
// the data files and story code keep their English exactly as written, and the zh and es tables (src/i18n/zh/*.js,
// src/i18n/es/*.js) map each English string to its translation. Anything missing falls back to the English.
//
//   tr('Speak with your mother')              → '去和母亲说话'
//   tr('{0} of {1} islands found', 3, 14)     → a table entry with numbered holes, filled in after it is looked up
//   tr(`${name} walks with you.`)             → no exact entry: the pattern '{0} walks with you.' is tried, and the
//                                                 part it caught ('Ingrid') is looked up on its own ('英格丽')
//
// {interact}, {sprint} and the like are key names and {w}, {b}, {n} are the ravens' and Eirik's names: they stay in the
// translation as they are and are filled in later (ui.keys, game.fmt).
//
// The tables are loaded only when their language is chosen, so English costs nothing. The choice is a setting
// (settings.lang), not part of a save: switching it never touches a saved game.
// `npm run i18n` (tools/i18n.mjs) checks that every string in the game has a zh and an es entry; see that file.

export const LANGS = [
  { id: 'en', name: 'English', html: 'en' },
  { id: 'zh', name: '中文', html: 'zh-Hans' },
  { id: 'es', name: 'Español', html: 'es' },
];
const LOADERS = { zh: () => import('./zh/index.js'), es: () => import('./es/index.js') };

let lang = 'en', table = null, patterns = [], cache = new Map();
const listeners = new Set();
/** English strings that were asked for and had no entry (only while a translated language is on), for the checks. */
export const missing = new Set();

const HOLE = /\{(\d)\}/g;
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function compile(t) {
  const out = [];
  for (const k in t) {
    if (!/\{\d\}/.test(k)) continue;
    // a pattern must say something besides its holes, or it would catch everything
    if (k.replace(HOLE, '').replace(/[^A-Za-z]/g, '').length < 3) continue;
    const order = [];
    const src = k.split(HOLE).map((part, i) => (i % 2 ? (order.push(+part), '(.+?)') : escRe(part))).join('');
    out.push({ re: new RegExp('^' + src + '$', 's'), order, to: t[k] });
  }
  return out.sort((a, b) => b.re.source.length - a.re.source.length); // the most specific first
}
const fill = (s, args) => (args.length ? s.replace(HOLE, (m, i) => (args[+i] !== undefined ? String(args[+i]) : m)) : s);

/** The language in use: 'en', 'zh' or 'es'. */
export const getLang = () => lang;
export const isCJK = () => lang === 'zh';

/** Text already translated and filled in (by game.fmt): passed through as it is if it comes round again. */
const done = new Set();
export function translated(s) { if (table) { if (done.size > 400) done.clear(); done.add(s); } return s; }

/** Translate a piece of English for the screen. Extra arguments fill {0}, {1}... (numbers, names, already-built text). */
export function tr(s, ...args) {
  if (s == null || s === '') return s;
  s = String(s);
  if (!table || done.has(s)) return fill(s, args);
  let out = cache.get(s);
  if (out === undefined) {
    out = table[s];
    if (out === undefined) {
      const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], core = s.trim(); // text built with a space at an end
      if (core !== s && core) out = lead + tr(core) + tail;
      else {
        for (const p of patterns) {
          const m = p.re.exec(s);
          if (!m) continue;
          const caught = [];
          p.order.forEach((n, i) => (caught[n] = tr(m[i + 1])));
          out = fill(p.to, caught);
          break;
        }
      }
      if (out === undefined) { out = null; if (/[A-Za-z]{2}/.test(s)) missing.add(s); }
    }
    cache.set(s, out);
  }
  return fill(out === null ? s : out, args);
}
/** tr() for a value that may be a list of lines (dialogue choices, barks) or an object with text in t/text. */
export const trAll = (list) => (Array.isArray(list) ? list.map((x) => tr(x)) : tr(list));

/** Switch language. Loads its tables first; resolves once everything on screen can be redrawn in it. */
export async function setLang(id) {
  if (!LANGS.some((l) => l.id === id)) id = 'en';
  let t = null;
  if (id !== 'en') {
    try { t = (await LOADERS[id]()).default; } catch (e) { console.warn('[i18n] could not load', id, e); id = 'en'; }
  }
  lang = id; table = t; patterns = t ? compile(t) : []; cache = new Map(); missing.clear(); done.clear();
  const L = LANGS.find((l) => l.id === id), root = document.documentElement;
  root.lang = L.html; root.dataset.lang = id;
  if (id === 'zh') loadCJKFont();
  localizeStatic();
  for (const f of listeners) { try { f(id); } catch (e) { console.error(e); } }
  return id;
}
/** Be told when the language changes (to redraw what is on screen). */
export const onLang = (f) => listeners.add(f);

/** The text written into index.html: elements marked data-t keep their English in that attribute. */
export function localizeStatic(root = document) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = tr(el.dataset.t);
  for (const el of root.querySelectorAll('[data-t-html]')) el.innerHTML = tr(el.dataset.tHtml);
  for (const el of root.querySelectorAll('[data-t-title]')) el.title = tr(el.dataset.tTitle);
  for (const el of root.querySelectorAll('[data-t-label]')) el.setAttribute('aria-label', tr(el.dataset.tLabel));
  document.title = tr('Blood of the North — Rise of the Raven King');
}

/** A serif with Chinese characters (Noto Serif SC, from Google Fonts, cut into small pieces by unicode range so only the
 *  characters on screen are fetched). Until it arrives, or with no network, the system's own Chinese fonts are used. */
let fontAsked = false;
function loadCJKFont() {
  if (fontAsked || typeof document === 'undefined') return;
  fontAsked = true;
  if (/HeadlessChrome/.test(navigator.userAgent) && !/[?&]webfont/.test(location.search)) return; // the checks use the system fonts
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap';
  document.head.appendChild(l);
}

/** Canvas text (the map) needs its font named: the same family with the Chinese fonts behind it. */
export function canvasFont(spec) {
  if (lang !== 'zh') return spec;
  return spec.replace(/\bitalic\s+/, '').replace(/Georgia$/, 'Georgia, "Noto Serif SC", "Songti SC", "STSong", "PingFang SC", "Microsoft YaHei", serif');
}

if (typeof window !== 'undefined') window.__i18n = { tr, setLang, getLang, missing, LANGS };
