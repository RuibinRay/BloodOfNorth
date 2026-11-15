// The champion fights, played by a stand-in player (tools/check/bot.js) at three levels of skill, each in its own page.
//   node tools/fights.mjs                      every champion, 3 fights per level
//   node tools/fights.mjs kettil2,rurik 5      some, 5 each
// It prints wins, seconds, Eirik's health left (or the champion's when he lost) and what did the damage. The bot plays
// through the game's own inputs and reacts with a human delay; it says whether a fight can be won, not whether it is fun.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { Browser } from './check/browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL = ['kettil2', 'arne', 'ulf3', 'rurik', 'skarde', 'eydis', 'bersi', 'ulf', 'kettil', 'vigdis', 'gorm', 'hakon'];
const ids = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : ALL, n = +(process.argv[3] || 3);
const profs = (process.argv[4] || 'novice,average,good').split(','), jobs = +(process.env.JOBS || 3);
const bot = readFileSync(join(root, 'tools/check/bot.js'), 'utf8');
const server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 5193, strictPort: false, hmr: false, watch: null } });
await server.listen();
const browser = await Browser.launch(), base = server.resolvedUrls.local[0], rows = [];
const queue = ids.flatMap((id) => profs.flatMap((prof) => Array.from({ length: n }, () => ({ id, prof }))));
const expr = (id, prof) => `(async () => { for (let i = 0; i < 300 && !(window.__game && window.__game.debug); i++) await new Promise((r) => setTimeout(r, 100));
  const g = window.__game; g.autosave = () => {}; g.saveGame = () => true; let reloads = 0; g.reloadCheckpoint = () => { reloads++; };
  ${bot}; __bot.load(${JSON.stringify(id)}); const e = await __bot.ready(${JSON.stringify(id)}); if (!e) return JSON.stringify({ error: 'no champion came' });
  const r = await __bot.fight(${JSON.stringify(prof)}); return JSON.stringify(r); })()`;
await Promise.all(Array.from({ length: jobs }, async () => {
  for (let job; (job = queue.shift());) {
    try { const { value } = await browser.run(base, expr(job.id, job.prof), 600000); const r = { ...job, ...JSON.parse(value) }; rows.push(r); console.log(`${job.id.padEnd(8)} ${job.prof.padEnd(8)} ${r.error || r.outcome} ${r.sec ?? ''}s hp ${r.hpLeft ?? ''} boss ${r.bossLeft ?? ''}`); }
    catch (e) { rows.push({ ...job, error: e.message }); console.log(`${job.id} ${job.prof} ERROR ${e.message}`); }
  }
}));
browser.close(); await server.close().catch(() => {});
console.log('\nchampion  skill     wins  seconds              health left (won) / champion left (lost)');
for (const id of ids) for (const prof of profs) {
  const rs = rows.filter((r) => r.id === id && r.prof === prof), w = rs.filter((r) => r.outcome === 'won');
  console.log(id.padEnd(9), prof.padEnd(9), `${w.length}/${rs.length}`.padEnd(5), rs.map((r) => r.sec ?? '-').join(', ').padEnd(20), rs.map((r) => (r.outcome === 'won' ? r.hpLeft : r.error ? 'err' : `(${r.bossLeft})`)).join(', '));
}
console.log('\nWhat did the damage (all levels):');
for (const id of ids) {
  const tot = {};
  for (const r of rows.filter((x) => x.id === id)) for (const [m, v] of Object.entries(r.moves || {})) { const t = (tot[m] ||= { n: 0, dmg: 0 }); t.n += v.n; t.dmg += v.dmg; }
  console.log(id.padEnd(9), Object.entries(tot).sort((a, b) => b[1].dmg - a[1].dmg).slice(0, 5).map(([m, v]) => `${m} ${v.dmg} (${v.n}x)`).join(' | '));
}
process.exit(0);
