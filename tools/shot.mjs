// Look at the game without a browser window: open it in a headless Chrome, run a few lines there, save pictures.
//
//   node tools/shot.mjs "<lines of JavaScript>"
//
// The lines run in the page with the game's test hooks in reach: g (the game), d (g.debug), p (the player),
// run(seconds), and shot(name, [camera x, y, z], [look-at x, y, z]) which writes .playtest/<name>.jpg.
// What the last line evaluates to is printed. Example:
//   node tools/shot.mjs "d.jump('q_morning'); await run(2); await shot('yard', [-30, 6, 62], [-20, 5, 78]); g.drawn"
// SHOT_SIZE=1600,900 sets the picture size (default 1280,720).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { Browser } from './check/browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), code = process.argv[2];
if (!code) { console.error('usage: node tools/shot.mjs "<lines of JavaScript>"'); process.exit(1); }
const server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 5191, strictPort: false, hmr: false, watch: null } });
await server.listen();
const browser = await Browser.launch();
try {
  const lines = code.trim().split(/;\s*(?![^()]*\))/).filter(Boolean), last = lines.pop();
  const expr = `(async () => { await import('/tools/check/page.js'); const g = window.__game, d = g.debug, p = g.player, run = d.run, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const shot = async (name, cam, at) => { await wait(60); return d.view(name, cam, at); };
    ${lines.join(';\n')}; const out = await (${last}); return JSON.stringify(out === undefined ? null : out); })()`;
  const { value, thrown } = await browser.run(server.resolvedUrls.local[0], expr, 240000);
  console.log(value); if (thrown.length) console.log('thrown:', thrown.slice(0, 3).join(' ; '));
} catch (e) { console.error('failed:', e.message, e.thrown && e.thrown.length ? e.thrown.slice(0, 3).join(' ; ') : ''); process.exitCode = 1; } finally { browser.close(); await server.close().catch(() => {}); }
process.exit(process.exitCode || 0); // the dev server keeps handles open: do not wait for them
