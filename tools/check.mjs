// `npm run check` — the checks that guard the game, in one command.
//
// It builds the game, serves it, opens it in a headless Chrome (the one installed on this machine; no extra packages),
// and through the game's own test hooks:
//   1. starts every chapter of every act the way the Acts menu does, and compares where it stands with what was
//      recorded when it was last known good (the step in hand, the stage, where Eirik is, that the objective points
//      somewhere, that Eirik's body is in the scene to be drawn, that nothing threw);
//   2. counts what five heavy scenes ask the machine to draw (draw calls and triangles: exact numbers, the same on any
//      machine) against a budget, so a change that makes the game heavier is noticed;
//   3. plays one fight with two companions and calls both their skills;
//   4. plays the shield walls through (Iron Shore, and both pushes on the Black Shore): once each by a scripted
//      player who fights with his own health (an average player: he braces, cuts at their rank, fights the men who
//      come through and shields himself from arrows; he must not die), once each by one kept alive who only braces,
//      and once by one who does nothing; each must end as it was recorded and the story must go on from it.
//   5. the languages: every string has its 中文 and Español (tools/i18n.mjs), and Act I, the opening of every other
//      act and the open world, played in both, show nothing in English that should not be (strings with no entry,
//      and, in Chinese, Latin words left on the screen).
//
//   npm run check                 everything (a few minutes)
//   npm run check -- --quick      each act's opening chapter, the scenes and the fight (under a minute)
//   npm run check -- --walls      only the shield walls (about five minutes)
//   npm run check -- --only=q_shore,q_iron
//   npm run check -- --update     record what is found as the new known-good (tools/check/expected.json)
//   npm run check -- --jobs=3     pages at once (default 2)
//   npm run check -- --langs      only the languages (5 below); --langs=all plays every chapter in both, not only Act I
//   CHROME_PATH=/path/to/chrome npm run check
//
// It is a scripted check: it shows that things start, stand and end as recorded. It cannot say whether they are fun.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createRequire } from 'node:module';
// vite wherever Node finds it: in this folder, or a folder above it (a worktree, or the copy the git hook checks)
const viteBin = join(dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin/vite.js');
import { Browser } from './check/browser.mjs';
import { ACTS, ORDER } from '../src/data/chapters.js';
import { sweep, chaptersOf } from './check/langs.mjs';
import { collect as i18nStrings, COMPLETE } from './i18n.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), expectedPath = join(root, 'tools/check/expected.json');
const args = process.argv.slice(2), flag = (n) => args.includes('--' + n), opt = (n, d) => { const a = args.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const langsOnly = args.some((a) => a === '--langs' || a.startsWith('--langs=')), langSpec = opt('langs', '');
const update = flag('update'), quick = flag('quick'), wallsOnly = flag('walls') || langsOnly, only = opt('only', ''), jobs = Math.max(1, +opt('jobs', 2));
// how: brace / idle play the wall with Eirik kept alive (wall()); fight:<level> plays it with his real health, fighting (wallFight())
const WALLS = [['q_shore', 'wall', 'fight:average', 'Iron Shore, fought by an average player'], ['q_blackshore', 'town', 'fight:average', 'the Black Shore, the harbor town, fought'], ['q_blackshore', 'road', 'fight:average', 'the Black Shore, the road, fought'], ['q_shore', 'wall', 'brace', 'Iron Shore, braced'], ['q_blackshore', 'town', 'brace', 'the Black Shore, the harbor town, braced'], ['q_blackshore', 'road', 'brace', 'the Black Shore, the road, braced'], ['q_blackshore', 'town', 'idle', 'the Black Shore, the harbor town, doing nothing']];
const SCENES = ['hrafnvik', 'open world farm', 'iron shore gate', 'black shore battle', 'fleet at sea'];
const title = (id) => { for (const a of ACTS) { const i = a.quests.indexOf(id); if (i >= 0) return `${a.title.split(' · ')[0]} · ${i + 1}`; } return id; };

const inPage = (call) => `(async () => { await import('/tools/check/page.js'); return JSON.stringify(await window.__check.${call}); })()`;

// ---- what counts as wrong --------------------------------------------------------------------------------------
function judgeChapter(r, want) {
  const bad = [];
  if (r.crash) return ['crashed on start: ' + r.crash];
  if (r.errs.length) bad.push('threw: ' + r.errs.join(' ; '));
  if (r.reloads) bad.push('asked for a checkpoint reload (he died or was caught) ' + r.reloads + '×');
  if (r.marker === 'lost') bad.push('the objective points at nothing');
  if (Math.abs(r.off) > 1.5) bad.push(`Eirik is ${r.off} m off the ground`);
  if (r.body === false) bad.push('Eirik has no body in the scene: he would not be drawn');
  if (!want) return bad;
  if (r.at !== want.at) bad.push(`step is ${r.at}, was ${want.at}`);
  if (r.stage !== want.stage) bad.push(`stage is ${r.stage}, was ${want.stage}`);
  if (r.mode !== want.mode) bad.push(`mode is ${r.mode}, was ${want.mode}`);
  const d = Math.hypot(r.pos[0] - want.pos[0], r.pos[1] - want.pos[1]);
  if (d > 30) bad.push(`Eirik is at (${r.pos}), ${Math.round(d)} m from where he was (${want.pos})`);
  if (want.marker !== 'none' && r.marker === 'none') bad.push('the objective has no marker now');
  return bad;
}

// ---- run ------------------------------------------------------------------------------------------------------------
const t0 = Date.now(), expected = existsSync(expectedPath) ? JSON.parse(readFileSync(expectedPath, 'utf8')) : { chapters: {}, scenes: {} };
let failed = 0; const fail = (line) => { failed++; console.log('  FAIL  ' + line); }, ok = (line) => console.log('  ok    ' + line);

console.log('Building…');
try { execFileSync(process.execPath, [viteBin, 'build', '--logLevel', 'error'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }); ok('the game builds'); }
catch (e) { fail('the game does not build:\n' + String(e.stderr || e.stdout || e.message).trim().split('\n').slice(0, 12).join('\n')); process.exit(1); }

{ // the paintings the game lists (src/data/art.js) are files that exist
  const { ART } = await import('../src/data/art.js'), all = Object.values(ART).flatMap((k) => Object.values(k)), gone = all.filter((f) => !existsSync(join(root, 'public', f)));
  gone.length ? fail(`${gone.length} of ${all.length} paintings listed in src/data/art.js are missing from public/: ${gone.slice(0, 4).join(', ')}`) : ok(`all ${all.length} paintings the game lists are in public/art`);
}

{ // the translations: every string in all three languages, holes and names kept (tools/i18n.mjs)
  try { const out = execFileSync(process.execPath, [join(root, 'tools/i18n.mjs')], { cwd: root, encoding: 'utf8' }); ok('the translations: ' + out.trim().split('\n').filter((l) => /must be complete/.test(l)).length + ' areas complete in 中文 and Español (npm run i18n for the table)'); }
  catch (e) { fail('the translations (npm run i18n):\n' + String(e.stdout || e.message).trim().split('\n').filter((l) => !/^\w+\s+\d+\s+\d/.test(l)).slice(0, 14).join('\n')); }
}

const server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 5190, strictPort: false, hmr: false, watch: null } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await Browser.launch();
const pool = async (items, fn) => { const q = [...items]; await Promise.all(Array.from({ length: Math.min(jobs, q.length) }, async () => { while (q.length) await fn(q.shift()); })); };

try {
  // 1. every chapter, started cold
  const ids = wallsOnly || langsOnly ? [] : only ? only.split(',').filter((x) => ORDER.includes(x)) : quick ? ACTS.map((a) => a.quests[0]) : ORDER;
  if (ids.length) console.log(`\nChapters started from the Acts menu (${ids.length} of ${ORDER.length}):`);
  const found = {};
  await pool(ids, async (id) => {
    const name = `${title(id)} ${id}`;
    try {
      const { value, thrown } = await browser.run(base, inPage(`chapter(${JSON.stringify(id)})`)), r = JSON.parse(value);
      const bad = judgeChapter(r, update ? null : expected.chapters[id]);
      if (thrown.length && !bad.some((b) => b.startsWith('threw'))) bad.push('threw: ' + thrown.slice(0, 2).join(' ; '));
      if (!update && !expected.chapters[id] && !bad.length) bad.push('nothing recorded for it yet: run with --update once it is known good');
      found[id] = { at: r.at, stage: r.stage, mode: r.mode, pos: r.pos, marker: typeof r.marker === 'number' ? 'yes' : r.marker };
      bad.length ? fail(`${name}: ${bad.join(' · ')}`) : ok(`${name}  ${r.at}  (${r.pos})`);
    } catch (e) { fail(`${name}: ${e.message}${e.thrown && e.thrown.length ? ' · ' + e.thrown.slice(0, 2).join(' ; ') : ''}`); }
  });

  // 2. what heavy scenes ask the machine to draw
  const sceneFound = {};
  if (!only && !wallsOnly) {
    console.log('\nWhat heavy scenes ask the machine to draw (draw calls, thousand triangles):');
    await pool(SCENES, async (name) => {
      try {
        const { value } = await browser.run(base, inPage(`scene(${JSON.stringify(name)})`)), r = JSON.parse(value), b = expected.scenes[name];
        sceneFound[name] = { calls: Math.ceil((r.calls * 1.3) / 10) * 10, ktris: Math.ceil((r.ktris * 1.3) / 50) * 50 }; // the budget: a third above what it is today
        const bad = [...(r.errs.length ? ['threw: ' + r.errs.join(' ; ')] : []), ...(!update && b && r.calls > b.calls ? [`${r.calls} draw calls, budget ${b.calls}`] : []), ...(!update && b && r.ktris > b.ktris ? [`${r.ktris}k triangles, budget ${b.ktris}k`] : []),
          ...(!update && !b ? ['no budget recorded yet: run with --update'] : [])];
        bad.length ? fail(`${name}: ${bad.join(' · ')}`) : ok(`${name}: ${r.calls} draws, ${r.ktris}k triangles, ${r.people} people${b && !update ? `  (budget ${b.calls} / ${b.ktris}k)` : ''}`);
      } catch (e) { fail(`${name}: ${e.message}`); }
    });

    // 3. a fight beside two companions
    console.log('\nA fight beside two companions:');
    try {
      const { value } = await browser.run(base, inPage('party()')), r = JSON.parse(value);
      const bad = [...(r.errs.length ? ['threw: ' + r.errs.join(' ; ')] : []), ...(r.joined.join() !== 'leif,astrid' ? ['asked Leif and Astrid along, the party is [' + r.joined + ']'] : []),
        ...(r.called.some((c) => !c) ? ['a skill did not go off: ' + JSON.stringify(r.called)] : []), ...(r.standing ? [`${r.standing} of 3 raiders still standing after ${r.seconds} s`] : []), ...(r.strip.length !== 2 ? ['the party strip shows ' + r.strip.length] : [])];
      bad.length ? fail(bad.join(' · ')) : ok(`Leif and Astrid joined by talking, both skills went off, three raiders down in ${r.seconds} s`);
    } catch (e) { fail(e.message); }
  }

  // 4. the shield walls, played through
  const wallFound = {};
  if (flag('walls') || (!quick && !only && !langsOnly)) {
    console.log('\nThe shield walls, played through by a script (seeded dice; he does not fight, and is kept alive):');
    await pool(WALLS, async ([q, st, how, name]) => {
      const key = `${q}.${st}.${how}`;
      try {
        const fight = how.startsWith('fight:'), call = fight ? `wallFight(${JSON.stringify(q)}, ${JSON.stringify(st)}, ${JSON.stringify(how.slice(6))})` : `wall(${JSON.stringify(q)}, ${JSON.stringify(st)}, ${JSON.stringify(how)})`;
        const { value } = await browser.run(base, inPage(call), 600000), r = JSON.parse(value), want = expected.walls && expected.walls[key], L = r.last || r.info || {};
        wallFound[key] = { over: r.over, to: r.to };
        const bad = [...(r.crash ? ['crashed: ' + r.crash] : []), ...(r.errs && r.errs.length ? ['threw: ' + r.errs.join(' ; ')] : []), ...(r.over === 'no wall' ? ['no wall ever formed'] : []),
          ...(how !== 'idle' && r.reloads ? ['asked for a checkpoint reload'] : []), ...(fight && r.over === 'died' ? ['he died'] : []), ...(!update && want && r.over !== want.over ? [`ended "${r.over}", was "${want.over}"`] : []), ...(!update && want && r.to !== want.to ? [`the story stands at ${r.to}, was ${want.to}`] : []),
          ...(!update && !want ? ['nothing recorded for it yet: run with --update'] : [])];
        const line = `${name}: ${r.over} in ${r.seconds} s after ${L.surges} rushes and ${L.pushes} pushes, ${L.mean} m of ground, ${L.ours} of ${L.start && L.start[0]} left against ${L.theirs} of ${L.start && L.start[1]}; ${fight ? `he ended on ${r.left} health and cut down ${r.felled} of their men` : `he lost ${r.hurt} health`}; the story stands at ${r.to}`;
        bad.length ? fail(`${name}: ${bad.join(' · ')}`) : ok(line);
      } catch (e) { fail(`${name}: ${e.message}`); }
    });
  }

  // 5. the languages, played (last: it leaves the test browser's language set)
  if (langsOnly || (!only && !flag('walls'))) {
    const { seen } = await i18nStrings(), mine = (s) => { const e = seen.get(s); return !e || COMPLETE.includes(e.area); }; // strings of acts not yet translated are not counted
    const doneActs = ACTS.filter((a, i) => COMPLETE.includes(i === ACTS.length - 1 ? 'epilogue' : 'act' + (i + 1)));
    // Act I in full and the opening of every other act (and the open world); --langs=all plays every chapter
    const pick = langSpec === 'all' ? [...chaptersOf('all'), 'q_open'] : langSpec ? chaptersOf(langSpec) : quick ? ['q_morning', 'q_wings'] : [...ACTS[0].quests, ...doneActs.slice(1).map((a) => a.quests[0]), 'q_open'];
    for (const lang of ['zh', 'es']) {
      const ids = lang === 'es' && langSpec !== 'all' && !quick ? pick.filter((_, i) => i % 2 === 0) : pick; // Spanish: every other one (its words cannot be told from English on screen, so only strings with no entry are caught)
      console.log(`\nPlayed in ${lang === 'zh' ? '中文' : 'Español'} (${ids.length} chapters, every conversation clicked through):`);
      const r = await sweep(lang, ids, { server, browser, jobs, secs: 12 });
      const inDone = (id) => id === 'q_open' ? COMPLETE.includes('open') : doneActs.some((a) => a.quests.includes(id));
      for (const row of r.rows.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))) {
        const miss = (row.missing || []).filter(mine), latin = inDone(row.id) ? row.latin || [] : [];
        row.crash ? fail(`${row.id}: ${row.crash}`) : miss.length || latin.length ? fail(`${row.id}: ${[...miss.map((m) => JSON.stringify(m)), ...latin.map((w) => '«' + w + '» on screen')].slice(0, 6).join(' · ')}`) : ok(`${row.id}: nothing left in English`);
      }
      if (r.panels) {
        const miss = r.panels.missing.filter(mine), latin = Object.entries(r.panels.latin).filter(([t]) => t !== 'acts' || doneActs.length === ACTS.length);
        miss.length || latin.length ? fail(`the panels: ${[...miss.map((m) => JSON.stringify(m)), ...latin.map(([t, w]) => `${t}: «${w.slice(0, 5).join(' ')}»`)].slice(0, 6).join(' · ')}`) : ok('the panels (journal, inventory, map, saga, skills, companions, appearance, settings, saves, status)');
      }
    }
  }

  if (update) {
    const next = { note: 'Recorded by `npm run check -- --update`: where each chapter stands a few seconds after it is started from the Acts menu, and the drawing budget of five heavy scenes (a third above what they drew when recorded).',
      chapters: { ...expected.chapters, ...found }, scenes: { ...expected.scenes, ...sceneFound }, walls: { ...(expected.walls || {}), ...wallFound } };
    next.chapters = Object.fromEntries(ORDER.filter((id) => next.chapters[id]).map((id) => [id, next.chapters[id]]));
    writeFileSync(expectedPath, JSON.stringify(next, null, 1).replace(/\[\n\s+(-?\d+),\n\s+(-?\d+)\n\s+\]/g, '[$1, $2]') + '\n');
    console.log(`\nRecorded ${Object.keys(found).length} chapters, ${Object.keys(sceneFound).length} scenes and ${Object.keys(wallFound).length} shield walls in tools/check/expected.json`);
  }
} finally { browser.close(); await server.close(); }

console.log(`\n${failed ? failed + ' failed' : 'All passed'} in ${Math.round((Date.now() - t0) / 1000)} s.`);
process.exit(failed ? 1 : 0);
