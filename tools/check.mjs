// `npm run check` — the checks that guard the game, in one command.
//
// It builds the game, serves it, opens it in a headless Chrome (the one installed on this machine; no extra packages),
// and through the game's own test hooks:
//   1. starts every chapter of every act the way the Acts menu does, and compares where it stands with what was
//      recorded when it was last known good (the step in hand, the stage, where Eirik is, that the objective points
//      somewhere, that nothing threw);
//   2. counts what five heavy scenes ask the machine to draw (draw calls and triangles: exact numbers, the same on any
//      machine) against a budget, so a change that makes the game heavier is noticed;
//   3. plays one fight with two companions and calls both their skills.
//
//   npm run check                 everything (a few minutes)
//   npm run check -- --quick      each act's opening chapter, the scenes and the fight (under a minute)
//   npm run check -- --only=q_shore,q_iron
//   npm run check -- --update     record what is found as the new known-good (tools/check/expected.json)
//   npm run check -- --jobs=3     pages at once (default 2)
//   CHROME_PATH=/path/to/chrome npm run check
//
// It is a scripted check: it shows that things start, stand and end as recorded. It cannot say whether they are fun.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { ACTS, ORDER } from '../src/data/chapters.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), expectedPath = join(root, 'tools/check/expected.json');
const args = process.argv.slice(2), flag = (n) => args.includes('--' + n), opt = (n, d) => { const a = args.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const update = flag('update'), quick = flag('quick'), only = opt('only', ''), jobs = Math.max(1, +opt('jobs', 2));
const SCENES = ['hrafnvik', 'open world farm', 'iron shore gate', 'black shore battle', 'fleet at sea'];
const title = (id) => { for (const a of ACTS) { const i = a.quests.indexOf(id); if (i >= 0) return `${a.title.split(' · ')[0]} · ${i + 1}`; } return id; };

// ---- a browser ---------------------------------------------------------------------------------------------
function findChrome() {
  const c = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
  const hit = c.find((x) => existsSync(x));
  if (!hit) throw new Error('No Chrome found. Install Google Chrome, or set CHROME_PATH to a Chromium-based browser.');
  return hit;
}
/** The DevTools protocol over one WebSocket: just enough to open a page, run an expression in it and close it. */
class Browser {
  static async launch() {
    const dir = mkdtempSync(join(tmpdir(), 'botn-check-'));
    const proc = spawn(findChrome(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      '--mute-audio', '--window-size=1280,720', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    const url = await new Promise((res, rej) => {
      let buf = ''; const t = setTimeout(() => rej(new Error('Chrome did not start: ' + buf.slice(-300))), 20000);
      proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } });
      proc.on('exit', (c) => rej(new Error('Chrome exited (' + c + '): ' + buf.slice(-300))));
    });
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('could not reach Chrome')); });
    return new Browser(proc, ws, dir);
  }
  constructor(proc, ws, dir) {
    this.proc = proc; this.ws = ws; this.dir = dir; this.id = 0; this.waiting = new Map(); this.thrown = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.waiting.has(m.id)) { const { res, rej } = this.waiting.get(m.id); this.waiting.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method === 'Runtime.exceptionThrown' && this.thrown.has(m.sessionId)) { const d = m.params.exceptionDetails; this.thrown.get(m.sessionId).push((d.exception && d.exception.description ? d.exception.description.split('\n')[0] : d.text) + (d.url ? ' @' + d.url.split('/').pop() + ':' + d.lineNumber : '')); }
    };
  }
  send(method, params = {}, sessionId) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params, sessionId })); return new Promise((res, rej) => this.waiting.set(id, { res, rej })); }
  /** Open the game in a new page, run `expression` there (it may await), close the page, and give back its value. */
  async run(base, expression, timeout = 150000) {
    const { targetId } = await this.send('Target.createTarget', { url: base });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    const thrown = []; this.thrown.set(sessionId, thrown);
    try {
      await this.send('Runtime.enable', {}, sessionId);
      const ev = (e) => this.send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, sessionId);
      for (let i = 0; i < 200; i++) { const r = await ev(`document.readyState === 'complete' && location.href.startsWith(${JSON.stringify(base)})`); if (r.result.value) break; await new Promise((r2) => setTimeout(r2, 100)); }
      const r = await Promise.race([ev(expression), new Promise((_, rej) => setTimeout(() => rej(new Error('timed out after ' + timeout / 1000 + ' s')), timeout))]);
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).split('\n')[0]);
      return { value: r.result.value, thrown };
    } catch (e) { e.thrown = thrown; throw e; } finally { this.thrown.delete(sessionId); await this.send('Target.closeTarget', { targetId }).catch(() => {}); }
  }
  close() { try { this.ws.close(); } catch { /* gone */ } this.proc.kill(); setTimeout(() => { try { rmSync(this.dir, { recursive: true, force: true }); } catch { /* leave it */ } }, 300); }
}
const inPage = (call) => `(async () => { await import('/tools/check/page.js'); return JSON.stringify(await window.__check.${call}); })()`;

// ---- what counts as wrong --------------------------------------------------------------------------------------
function judgeChapter(r, want) {
  const bad = [];
  if (r.crash) return ['crashed on start: ' + r.crash];
  if (r.errs.length) bad.push('threw: ' + r.errs.join(' ; '));
  if (r.reloads) bad.push('asked for a checkpoint reload (he died or was caught) ' + r.reloads + '×');
  if (r.marker === 'lost') bad.push('the objective points at nothing');
  if (Math.abs(r.off) > 1.5) bad.push(`Eirik is ${r.off} m off the ground`);
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
try { execFileSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'error'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }); ok('the game builds'); }
catch (e) { fail('the game does not build:\n' + String(e.stderr || e.stdout || e.message).trim().split('\n').slice(0, 12).join('\n')); process.exit(1); }

{ // the paintings the game lists (src/data/art.js) are files that exist
  const { ART } = await import('../src/data/art.js'), all = Object.values(ART).flatMap((k) => Object.values(k)), gone = all.filter((f) => !existsSync(join(root, 'public', f)));
  gone.length ? fail(`${gone.length} of ${all.length} paintings listed in src/data/art.js are missing from public/: ${gone.slice(0, 4).join(', ')}`) : ok(`all ${all.length} paintings the game lists are in public/art`);
}

const server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 5190, strictPort: false, hmr: false, watch: null } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await Browser.launch();
const pool = async (items, fn) => { const q = [...items]; await Promise.all(Array.from({ length: Math.min(jobs, q.length) }, async () => { while (q.length) await fn(q.shift()); })); };

try {
  // 1. every chapter, started cold
  const ids = only ? only.split(',').filter((x) => ORDER.includes(x)) : quick ? ACTS.map((a) => a.quests[0]) : ORDER;
  console.log(`\nChapters started from the Acts menu (${ids.length} of ${ORDER.length}):`);
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
  if (!only) {
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

  if (update) {
    const next = { note: 'Recorded by `npm run check -- --update`: where each chapter stands a few seconds after it is started from the Acts menu, and the drawing budget of five heavy scenes (a third above what they drew when recorded).',
      chapters: { ...expected.chapters, ...found }, scenes: { ...expected.scenes, ...sceneFound } };
    next.chapters = Object.fromEntries(ORDER.filter((id) => next.chapters[id]).map((id) => [id, next.chapters[id]]));
    writeFileSync(expectedPath, JSON.stringify(next, null, 1).replace(/\[\n\s+(-?\d+),\n\s+(-?\d+)\n\s+\]/g, '[$1, $2]') + '\n');
    console.log(`\nRecorded ${Object.keys(found).length} chapters and ${Object.keys(sceneFound).length} scenes in tools/check/expected.json`);
  }
} finally { browser.close(); await server.close(); }

console.log(`\n${failed ? failed + ' failed' : 'All passed'} in ${Math.round((Date.now() - t0) / 1000)} s.`);
process.exit(failed ? 1 : 0);
