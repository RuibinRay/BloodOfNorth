// `npm run i18n` — the translations: what the game says in English, and whether 中文, 日本語 and Español say all of it.
//
// It reads every source file for the strings a player can see (string literals that read as words; anything shown
// that is not words, and words that are never shown, are listed in src/i18n/skip.js), groups them by area (the UI,
// each act, the open world...), and checks them against the tables in src/i18n/zh, src/i18n/ja and src/i18n/es:
//   - every string of an area marked complete (COMPLETE below) has an entry in every table;
//   - no entry anywhere has lost or gained a hole: {0}, {interact}, {w}... must be the same in every language;
//   - every name in the glossary (src/i18n/glossary.js) is written the glossary's way in the Chinese, Japanese and Spanish;
//   - no string in a UI file is written into the page without going through tr() (template literals with words in
//     them, or words set as textContent/innerHTML directly).
// It fails (exit 1) if any of those is wrong, and prints how much of each area is translated.
//
//   npm run i18n                       the check (also run by npm run check)
//   npm run i18n -- todo act2          what act2 still lacks: one line per string, "id<TAB>English"
//   npm run i18n -- todo act2 --json   the same as JSON
//   npm run i18n -- merge file.tsv     take translations in: lines "id<TAB>中文<TAB>Español" (blank lines and # ignored)
//   npm run i18n -- merge file.tsv --lang=ja   lines "id<TAB>日本語": one language only
//   npm run i18n -- list ui            every string the area has, with its id
//   npm run i18n -- where "Some text"  which file and area a string is in
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['zh', 'ja', 'es'];

/** The areas, in order: a string found in more than one area belongs to the first. */
export const AREAS = [
  ['ui', ['index.html', 'src/ui/', 'src/core/', 'src/main.js', 'src/systems/systems.js', 'src/systems/combat.js', 'src/systems/skills.js', 'src/systems/activities.js', 'src/systems/activities2.js', 'src/systems/shieldwall.js', 'src/systems/ambient.js', 'src/entities/', 'src/world/']],
  ['chapters', ['src/data/chapters.js']],
  ['items', ['src/data/weapons.js', 'src/data/shieldwall.js']],
  ['companions', ['src/data/companions.js', 'src/systems/companions.js']],
  ['act1', ['src/data/act1.js', 'src/data/act1_ch2.js', 'src/data/act1_ch3.js', 'src/story/act1.js', 'src/story/act1_ch2.js', 'src/story/act1_ch3.js']],
  ['act2', ['src/data/act2.js', 'src/story/act2.js', 'src/story/act2_raid.js', 'src/story/act2_sea.js', 'src/story/act2_winter.js']],
  ['act3', ['src/data/act3.js', 'src/story/act3_']],
  ['act4', ['src/data/act4.js', 'src/story/act4_']],
  ['act5', ['src/data/act5.js', 'src/story/act5_']],
  ['act6', ['src/data/act6.js', 'src/story/act6_']],
  ['act7', ['src/data/act7.js', 'src/story/act7_']],
  ['epilogue', ['src/data/epilogue.js', 'src/story/epilogue.js']],
  ['open', ['src/story/open_proto.js', 'src/story/sea_chart.js', 'src/story/fleet.js', 'src/story/seawar.js', 'src/story/champions.js', 'src/systems/openworld.js']],
];
/** Areas that must be translated in full: the check fails if one of their strings has no zh, ja or es entry. */
export const COMPLETE = ['ui', 'chapters', 'items', 'companions', 'act1', 'act2', 'act3', 'act4', 'act5', 'act6', 'act7', 'epilogue', 'open'];
/** UI files: here a string with words in it must go through tr() (or be data that is translated where it is shown). */
const UI_FILES = ['src/ui/ui.js', 'src/ui/wallhud.js'];

// ---- reading the source ------------------------------------------------------------------------------------------
/** Every string literal in a piece of JavaScript: { q: quote, raw, at, holes: expressions inside a template }. */
export function scan(src) {
  const out = []; let i = 0, last = '';
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '/' && (/[(,=:[!&|?{};+\-*%<>~^]/.test(last) || last === '' || /\b(return|typeof|case|in|of)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd()))) {
      i++; let cls = false;
      while (i < n) { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if ((d === '/' && !cls) || d === '\n') break; i++; }
      i++; last = 'r'; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { s += src[j] + src[j + 1]; j += 2; continue; } s += src[j++]; }
      out.push({ q: c, raw: s, at: i, holes: [] }); i = j + 1; last = 's'; continue;
    }
    if (c === '`') {
      let j = i + 1, s = ''; const holes = [];
      while (j < n && src[j] !== '`') {
        if (src[j] === '\\') { s += src[j] + src[j + 1]; j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '{') { // an expression: find its end (it may hold strings and templates of its own)
          let d = 1, k = j + 2;
          while (k < n && d) { const ch = src[k]; if (ch === '{') d++; else if (ch === '}') { if (!--d) break; } else if (ch === '`' || ch === '"' || ch === "'") { k += skipLiteral(src, k); continue; } k++; }
          const expr = src.slice(j + 2, k);
          for (const sub of scan(expr)) out.push({ ...sub, at: sub.at + j + 2, inner: true });
          holes.push(expr); s += '{' + (holes.length - 1) + '}'; j = k + 1; continue;
        }
        s += src[j++];
      }
      out.push({ q: '`', raw: s, at: i, holes }); i = j + 1; last = 's'; continue;
    }
    if (!/\s/.test(c)) last = /[A-Za-z0-9_$)\]]/.test(c) ? (/[A-Za-z]/.test(c) ? src.slice(Math.max(0, i - 6), i + 1).match(/[A-Za-z]+$/)[0] : c) : c;
    i++;
  }
  return out;
}
/** Length of the string literal or template starting at k (templates may nest). */
function skipLiteral(src, k) {
  const q = src[k]; let j = k + 1;
  while (j < src.length && src[j] !== q) {
    if (src[j] === '\\') { j += 2; continue; }
    if (q === '`' && src[j] === '$' && src[j + 1] === '{') {
      let d = 1; j += 2;
      while (j < src.length && d) { if (src[j] === '{') d++; else if (src[j] === '}') d--; else if (src[j] === '`' || src[j] === '"' || src[j] === "'") { j += skipLiteral(src, j); continue; } j++; }
      continue;
    }
    if (q !== '`' && src[j] === '\n') break;
    j++;
  }
  return j - k + 1;
}
const unescape = (raw) => raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, e) => {
  if (e[0] === 'u') return String.fromCodePoint(parseInt(e[1] === '{' ? e.slice(2, -1) : e.slice(1), 16));
  if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
  return { n: '\n', t: '\t', r: '\r', b: '\b', '0': '\0' }[e] ?? e;
});

/** Whether a string reads as words a player could be shown. */
export function isProse(s) {
  if (!/[A-Za-zÀ-ÿ]{2}/.test(s)) return false;
  if (/^\s*</.test(s) || /<\/?[a-z][^>]*>/i.test(s)) return false; // markup is built, not shown as it is (checked separately)
  if (/^[#.[]|^[a-z-]+:|^(https?:|data:|\.\/|\/)|^[\w./-]+\.(js|png|jpe?g|css|webp|json|svg|mjs)$/.test(s)) return false; // selectors, styles, paths
  if (/\b\d+(px|em|vh|vw|%)\b|rgba?\(|linear-gradient|\bGeorgia\b|^[\w#.-]+( [\w#.-]+)*\s*\{\s*[a-z-]+\s*:/.test(s)) return false;
  if (/\b(vec[234]|uniform|varying|gl_\w+|texture2D|smoothstep)\b|;\s*$|;\n/.test(s)) return false; // shader code
  if (/^[a-z][a-zA-Z0-9]*$/.test(s)) return false; // an identifier
  if (/^[a-z0-9_]+(\.[a-z0-9_]+)+$/i.test(s)) return false; // a dotted key
  if (/^[A-Z][A-Za-z]*[A-Z0-9][A-Za-z0-9]*$/.test(s)) return false; // KeyG, Mouse2, ShiftLeft
  const words = s.replace(/\{\d\}/g, ' ').trim();
  if (!/[A-Za-zÀ-ÿ]{2}/.test(words)) return false; // only holes and punctuation: a joiner
  if (/\{\d\}/.test(s) && /^[{}\d\s\w,.:;!?'’()·—–-]+$/.test(s) && /[a-z]{3,}/.test(words)) return true; // '{0} grows': words round a name
  return /[A-Za-z]{2}.*\s.*[A-Za-z]|^[A-Z] [a-z]{2,}|^[A-ZÅÆØÁÉÍÓÚÖÄ][a-zåæøöäáéíóúðþ'’-]+[.!?…]*$|^[A-ZÅÆØ][\wåæøöäáéíóúðþ'’-]+$/u.test(words);
}
export const idOf = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);

function filesOf(prefixes) {
  const all = [];
  const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(js|html)$/.test(e.name)) all.push(p.replace(/^\.\//, '')); } };
  walk('src'); all.push('index.html');
  return all.filter((f) => prefixes.some((p) => f === p || (p.endsWith('/') ? f.startsWith(p) : f.startsWith(p))) && !f.startsWith('src/i18n/'));
}
function htmlStrings(src) { // text and titles in index.html
  const out = [];
  for (const m of src.matchAll(/data-t(?:-title|-label|-html)?="([^"]+)"/g)) out.push({ raw: m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'), at: m.index, html: true });
  return out;
}

/** All strings, by area: Map area → Map English → { id, files:Set } */
export async function collect() {
  const SK = await import(pathToFileURL(join(root, 'src/i18n/skip.js')).href + '?' + Date.now()), skip = new Set(SK.default);
  const areas = new Map(), seen = new Map(), raw = [];
  for (const [area, prefixes] of AREAS) {
    const m = new Map(); areas.set(area, m);
    for (const f of filesOf(prefixes)) {
      if (filesOf(AREAS.slice(0, AREAS.findIndex((a) => a[0] === area)).flatMap((a) => a[1])).includes(f)) continue; // claimed by an earlier area
      const src = readFileSync(join(root, f), 'utf8');
      const lits = f.endsWith('.html') ? htmlStrings(src) : scan(src);
      for (const L of lits) {
        let s;
        try { s = L.html ? L.raw : unescape(L.raw); } catch { continue; }
        raw.push({ f, s, L });
        const forced = L.html || /\b(tr|E|T)\(\s*$/.test(src.slice(Math.max(0, L.at - 8), L.at)); // tr('N'): shown, however short
        if ((!isProse(s) && !forced) || skip.has(s)) continue;
        if (seen.has(s)) { seen.get(s).files.add(f); continue; }
        const e = { id: idOf(s), files: new Set([f]), area };
        seen.set(s, e); m.set(s, e);
      }
    }
  }
  for (const s of SK.EXTRA || []) if (!seen.has(s)) { const e = { id: idOf(s), files: new Set(['src/i18n/skip.js']), area: 'ui' }; seen.set(s, e); areas.get('ui').set(s, e); }
  return { areas, seen, raw, skip };
}
export async function tables() {
  const T = {};
  for (const l of LANGS) {
    T[l] = {}; T[l + 'Files'] = {};
    const dir = join(root, 'src/i18n', l);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.js') || f === 'index.js') continue;
      const t = (await import(pathToFileURL(join(dir, f)).href + '?' + Date.now())).default;
      T[l + 'Files'][f.replace(/\.js$/, '')] = t;
      Object.assign(T[l], t);
    }
  }
  return T;
}

// ---- writing tables ----------------------------------------------------------------------------------------------
const HEAD = { zh: '中文 (简体)', ja: '日本語', es: 'Español' };
function writeTable(l, area, entries) {
  const dir = join(root, 'src/i18n', l);
  const lines = entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  writeFileSync(join(dir, area + '.js'), `// ${area} in ${HEAD[l]}. Keys are the English as the game writes it; see src/i18n/i18n.js.\nexport default {\n${lines.join('\n')}\n};\n`);
  // the language's index: every area's table, merged
  const files = readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'index.js').map((f) => f.replace(/\.js$/, '')).sort((a, b) => order(a) - order(b));
  writeFileSync(join(dir, 'index.js'), `// All of ${HEAD[l]}, merged (loaded only when the language is chosen).\n${files.map((f) => `import ${safe(f)} from './${f}.js';`).join('\n')}\n\nexport default Object.assign({}, ${files.map(safe).join(', ')});\n`);
}
/** Which table file an English key already sits in (in any language): for keys the scan does not see. */
const areaOfTable = (T, en) => { for (const l of LANGS) for (const [a, t] of Object.entries(T[l + 'Files'] || {})) if (t[en] !== undefined) return a; return null; };
const order = (a) => { const i = AREAS.findIndex((x) => x[0] === a); return i < 0 ? (a === 'names' ? -1 : 99) : i; };
const safe = (f) => '_' + f.replace(/\W/g, '_');

async function merge(file, only) {
  const { seen } = await collect(), T = await tables();
  const byId = new Map([...seen].map(([s, e]) => [e.id, s]));
  const add = { zh: {}, ja: {}, es: {} }; let n = 0; const bad = [];
  // a key the scan cannot see (built at run time, or a pattern) is found by its id in the tables already written
  for (const l of LANGS) for (const en of Object.keys(T[l])) if (!byId.has(idOf(en))) byId.set(idOf(en), en);
  const cols = only ? [only] : ['zh', 'es'];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [id, ...vals] = line.split('\t');
    let en = byId.get(id.trim());
    if (!en && id.startsWith('=')) en = id.slice(1); // "=English" for a string the scan cannot see (built at run time)
    if (!en) { bad.push(id); continue; }
    const area = seen.get(en)?.area || areaOfTable(T, en) || 'extra';
    const lead = en.match(/^\s*/)[0], tail = en.match(/\s*$/)[0]; // the English's own spaces at the ends are kept
    cols.forEach((l, i) => { const v = vals[i]; if (v && v.trim()) (add[l][area] ||= {})[en] = lead + v.trim().replace(/\\n/g, '\n') + tail; });
    n++;
  }
  for (const l of LANGS) for (const area in add[l]) {
    const cur = Object.assign({}, T[l + 'Files'][area] || {}, add[l][area]);
    const src = [...seen].filter(([, e]) => e.area === area).map(([s]) => s), pos = new Map(src.map((s, i) => [s, i]));
    const entries = Object.entries(cur).sort((a, b) => (pos.get(a[0]) ?? 1e9) - (pos.get(b[0]) ?? 1e9));
    writeTable(l, area, entries);
  }
  console.log(`merged ${n} lines` + (bad.length ? `; ${bad.length} ids not found: ${bad.slice(0, 20).join(' ')}` : ''));
  if (bad.length) process.exitCode = 1;
}

// ---- the check ---------------------------------------------------------------------------------------------------
const holesOf = (s) => (s.match(/\{[\w]+\}/g) || []).sort().join(' ');
async function check() {
  const { areas, seen, raw } = await collect(), T = await tables();
  const { GLOSSARY } = await import(pathToFileURL(join(root, 'src/i18n/glossary.js')).href + '?' + Date.now());
  const fail = [], warn = [];
  console.log('area          strings   中文      日本語    Español');
  for (const [area, m] of areas) {
    const tot = m.size, have = (l) => [...m.keys()].filter((s) => T[l][s] !== undefined).length;
    const z = have('zh'), j = have('ja'), e = have('es'), pc = (k) => (tot ? Math.floor((100 * k) / tot) : 100) + '%';
    console.log(`${area.padEnd(12)} ${String(tot).padStart(7)}   ${(z + ' ' + pc(z)).padEnd(9)} ${(j + ' ' + pc(j)).padEnd(9)} ${e} ${pc(e)}${COMPLETE.includes(area) ? '   (must be complete)' : ''}`);
    if (COMPLETE.includes(area)) for (const s of m.keys()) for (const l of LANGS) if (T[l][s] === undefined) fail.push(`${area}: no ${l} for ${JSON.stringify(s)} (${[...m.get(s).files][0]}, id ${m.get(s).id})`);
  }
  // holes kept
  for (const l of LANGS) for (const [en, to] of Object.entries(T[l])) {
    if (typeof to !== 'string' || !to.trim()) { fail.push(`${l}: empty entry for ${JSON.stringify(en)}`); continue; }
    const a = holesOf(en).split(' ').filter((h) => !/^\{\d\}$/.test(h)).join(' '), b = holesOf(to).split(' ').filter((h) => !/^\{\d\}$/.test(h)).join(' ');
    if (a !== b) fail.push(`${l}: the key names in ${JSON.stringify(en)} (${a || 'none'}) are not those of its translation ${JSON.stringify(to)} (${b || 'none'})`);
    const na = (en.match(/\{\d\}/g) || []), nb = new Set(to.match(/\{\d\}/g) || []);
    for (const h of nb) if (!na.includes(h)) fail.push(`${l}: ${JSON.stringify(to)} has a hole ${h} its English does not`);
  }
  // glossary: the names written one way in Chinese and in Japanese
  for (const [l, altKey] of [['zh', 'alt'], ['ja', 'jaAlt']]) for (const g of GLOSSARY) {
    if (!g[l] || g.loose) continue;
    const re = new RegExp(`(^|[^A-Za-zÀ-ÿ])${g.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-zÀ-ÿ])`);
    for (const [en, to] of Object.entries(T[l])) {
      if (!re.test(en) || to.includes(g[l])) continue;
      if ((g[altKey] || []).some((a) => to.includes(a))) continue;
      if (GLOSSARY.some((o) => o !== g && o.en.length > g.en.length && o.en.includes(g.en) && en.includes(o.en))) continue; // a longer name holds it
      fail.push(`glossary: "${g.en}" should be "${g[l]}" in ${JSON.stringify(to)} (for ${JSON.stringify(en)})`);
    }
  }
  // and the Spanish bynames (the Norse names themselves are the same in Spanish): Lobo de Hierro, not Ironwolf
  for (const g of GLOSSARY) {
    if (!g.es || g.loose || g.es === g.en) continue;
    const core = g.es.replace(/^(el|la|los|las) /i, '').toLowerCase(), re = new RegExp(`(^|[^A-Za-zÀ-ÿ])${g.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-zÀ-ÿ])`);
    for (const [en, es] of Object.entries(T.es)) {
      if (!re.test(en) || es.toLowerCase().includes(core) || (g.esAlt || []).some((a) => es.toLowerCase().includes(a.toLowerCase()))) continue;
      if (GLOSSARY.some((o) => o !== g && o.en.length > g.en.length && o.en.includes(g.en) && en.includes(o.en))) continue;
      fail.push(`glossary: "${g.en}" should be "${g.es}" in ${JSON.stringify(es)} (for ${JSON.stringify(en)})`);
    }
  }
  // the UI: no English written into the page without tr()
  for (const f of UI_FILES) {
    const src = readFileSync(join(root, f), 'utf8');
    for (const L of scan(src)) {
      if (L.q !== '`') continue;
      if (/[{;]\s*\n|^\s*[#.@][\w-]/.test(L.raw)) continue; // a style sheet
      const text = L.raw.replace(/<[^>]*>/g, ' ').replace(/\{\d\}/g, ' ').replace(/&\w+;/g, ' ');
      if (!/[A-Za-z]{3,}\s+[A-Za-z]{2,}|(^|\s)[A-Z][a-z]{2,}/.test(text)) continue;
      const line = src.slice(0, L.at).split('\n').length;
      fail.push(`${f}:${line}: English written straight into the page: ${JSON.stringify(text.trim().replace(/\s+/g, ' ').slice(0, 80))}`);
    }
  }
  if (warn.length) console.log('\n' + warn.join('\n'));
  if (fail.length) {
    console.log(`\n${fail.length} problem${fail.length > 1 ? 's' : ''}:`);
    for (const f of (process.env.ALL ? fail : fail.slice(0, 80))) console.log('  ' + f);
    if (fail.length > 80) console.log(`  ... and ${fail.length - 80} more`);
    process.exitCode = 1;
  } else console.log('\ntranslations: all good');
}

// ---- entry -------------------------------------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, a, ...rest] = process.argv.slice(2);
  if (cmd === 'todo' || cmd === 'list') {
    const { areas } = await collect(), T = await tables(), m = areas.get(a);
    if (!m) { console.error('no area ' + a + '; areas: ' + AREAS.map((x) => x[0]).join(' ')); process.exit(1); }
    const want = [...m].filter(([s]) => cmd === 'list' || LANGS.some((l) => T[l][s] === undefined));
    if (rest.includes('--json')) console.log(JSON.stringify(want.map(([s, e]) => ({ id: e.id, en: s, file: [...e.files][0] })), null, 1));
    else for (const [s, e] of want) console.log(`${e.id}\t${s.replace(/\n/g, '\\n')}` + (rest.includes('--files') ? `\t${[...e.files].join(',')}` : ''));
  } else if (cmd === 'merge') await merge(a, (rest.find((x) => x.startsWith('--lang=')) || '').slice(7) || null);
  else if (cmd === 'where') { const { seen } = await collect(); const e = seen.get(a); console.log(e ? `${e.area} ${e.id} ${[...e.files].join(', ')}` : 'not found'); }
  else await check();
}
