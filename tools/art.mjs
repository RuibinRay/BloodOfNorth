#!/usr/bin/env node
// Game art from the Higgsfield API: portraits, item paintings, title paintings, the map's parchment, world textures.
// What to make is in tools/art/plan.mjs. Credentials are read from .env (never from the command line, never printed).
// Every charge is written to assets/art/ledger.json, and nothing is submitted that would take the total past the cap.
//
//   node tools/art.mjs list [filter]            what is planned and what exists
//   node tools/art.mjs price [filter]           what it would cost (free)
//   node tools/art.mjs make <filter> [--cap=10] [--force] [--jobs=3]
//   node tools/art.mjs post [filter]            redo the cropping and resizing from the kept originals (free)
//   node tools/art.mjs manifest                 rewrite src/data/art.js from what is in public/art
//   node tools/art.mjs spent
//
// filter: an id, several ids with commas between, "group:cast" (cast, things, scenes, world), "kind:portrait", or "all".
// Originals go to assets/generated/ (git-ignored: they are large); the game-ready files go to public/art/.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ITEMS, MIRRORS } from './art/plan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), API = 'https://api.higgsfield.ai';
const SRC = path.join(ROOT, 'assets/generated'), LEDGER = path.join(ROOT, 'assets/art/ledger.json'), MANIFEST = path.join(ROOT, 'src/data/art.js');
const args = process.argv.slice(2), cmd = args[0] || 'list', filter = args.find((a, i) => i > 0 && !a.startsWith('--')) || (cmd === 'make' ? '' : 'all');
const opt = (n, d) => { const a = args.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; }, flag = (n) => args.includes('--' + n);
const cap = +opt('cap', 10), jobs = Math.max(1, +opt('jobs', 3));

function headers() {
  const env = {}, file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) for (const line of fs.readFileSync(file, 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2]; }
  const id = process.env.HF_API_KEY_ID || env.HF_API_KEY_ID, secret = process.env.HF_API_KEY_SECRET || env.HF_API_KEY_SECRET;
  if (!id || !secret) throw new Error('Higgsfield needs both HF_API_KEY_ID and HF_API_KEY_SECRET in .env (see docs/HIGGSFIELD.md).');
  return { Authorization: `Key ${id}:${secret}`, 'Content-Type': 'application/json' };
}
async function call(method, url, body, extra = {}) {
  const res = await fetch(url, { method, headers: { ...headers(), ...extra }, body: body ? JSON.stringify(body) : undefined }), text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: res.status, json };
}
const ledger = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { note: 'Every Higgsfield generation this project was charged for (the estimate given at submission, in US dollars).', charges: [] });
const spent = () => ledger().charges.reduce((a, c) => a + c.usd, 0);
const pick = (f) => ITEMS.filter((it) => f === 'all' || f.split(',').includes(it.id) || (f.startsWith('group:') && it.group === f.slice(6)) || (f.startsWith('kind:') && it.kind === f.slice(5)));
const outPath = (it) => path.join(ROOT, it.out), srcPath = (it) => { const hit = ['.png', '.jpg', '.jpeg', '.webp'].map((e) => path.join(SRC, it.id + e)).find((p) => fs.existsSync(p)); return hit || null; };
const estimate = async (it) => { const r = await call('POST', `${API}/estimate/${it.model}`, it.request); if (r.status !== 200) throw new Error(`estimate failed (HTTP ${r.status}): ${JSON.stringify(r.json).slice(0, 200)}`); return +r.json.usd; };

function post(it) {
  const src = srcPath(it);
  if (!src) throw new Error('no original kept for ' + it.id);
  fs.mkdirSync(path.dirname(outPath(it)), { recursive: true });
  execFileSync('python3', [path.join(ROOT, 'tools/art/post.py'), src, outPath(it), ...it.post.map(String)], { stdio: ['ignore', 'pipe', 'pipe'] });
}
function manifest() {
  for (const [to, from, how] of MIRRORS) if (fs.existsSync(path.join(ROOT, from))) execFileSync('python3', [path.join(ROOT, 'tools/art/post.py'), path.join(ROOT, from), path.join(ROOT, to), how]);
  const base = path.join(ROOT, 'public/art'), out = {};
  if (fs.existsSync(base)) for (const kind of fs.readdirSync(base).sort()) {
    const dir = path.join(base, kind); if (!fs.statSync(dir).isDirectory()) continue;
    out[kind] = Object.fromEntries(fs.readdirSync(dir).filter((f) => /\.(webp|jpg|png)$/.test(f)).sort().map((f) => [f.replace(/\.\w+$/, ''), `art/${kind}/${f}`]));
  }
  const text = '// The painted art the game has (written by `node tools/art.mjs manifest`; do not edit by hand).\n// Each entry is a file in public/art. Where the game has no painting for something it falls back to what it drew before.\n'
    + 'export const ART = ' + JSON.stringify(out, null, 2) + ';\n';
  if (!fs.existsSync(MANIFEST) || fs.readFileSync(MANIFEST, 'utf8') !== text) fs.writeFileSync(MANIFEST, text); // only when it changes: a running dev server reloads on every write
  return Object.values(out).reduce((a, k) => a + Object.keys(k).length, 0);
}

let total = spent(); // kept in step here, so parallel jobs cannot overrun the cap between them
async function make(it) {
  if (fs.existsSync(outPath(it)) && !flag('force')) return console.log(`  have    ${it.id}`);
  const usd = await estimate(it);
  if (total + usd > cap + 1e-9) return console.log(`  CAP     ${it.id}: $${usd} would take the total past $${cap} (spent $${total.toFixed(3)})`);
  total += usd;
  const sub = await call('POST', `${API}/${it.model}`, it.request, { 'Idempotency-Key': crypto.randomUUID() });
  if (sub.status >= 300) { total -= usd; return console.log(`  FAIL    ${it.id}: submit HTTP ${sub.status} ${JSON.stringify(sub.json).slice(0, 240)}`); }
  let r = sub.json, delay = 1500;
  for (let t = 0; !['completed', 'failed', 'nsfw', 'canceled'].includes(r.status) && t < 120; t++) {
    await new Promise((res) => setTimeout(res, delay + Math.random() * 400)); delay = Math.min(delay * 1.4, 8000);
    r = (await call('GET', r.status_url || `${API}/requests/${sub.json.request_id}/status`)).json;
  }
  if (r.status !== 'completed') { total -= usd; return console.log(`  FAIL    ${it.id}: ended as "${r.status}" (not charged)`); }
  const url = (r.images && r.images[0] && r.images[0].url) || null;
  if (!url) { return console.log(`  FAIL    ${it.id}: completed without an image: ${JSON.stringify(r).slice(0, 200)}`); }
  fs.mkdirSync(SRC, { recursive: true });
  for (const e of ['.png', '.jpg', '.jpeg', '.webp']) { const old = path.join(SRC, it.id + e); if (fs.existsSync(old)) fs.rmSync(old); }
  const ext = (path.extname(new URL(url).pathname) || '.png').toLowerCase();
  fs.writeFileSync(path.join(SRC, it.id + ext), Buffer.from(await (await fetch(url)).arrayBuffer()));
  const L = ledger(); L.charges.push({ id: it.id, model: it.model, usd, request_id: r.request_id || sub.json.request_id, at: new Date().toISOString() });
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true }); fs.writeFileSync(LEDGER, JSON.stringify(L, null, 1) + '\n');
  try { post(it); console.log(`  made    ${it.id}  $${usd}  -> ${it.out}`); } catch (e) { console.log(`  made    ${it.id}  $${usd}  but post-processing failed: ${String(e.stderr || e.message).slice(0, 200)}`); }
}
const pool = async (items, fn) => { const q = [...items]; await Promise.all(Array.from({ length: Math.min(jobs, q.length) }, async () => { while (q.length) { const it = q.shift(); try { await fn(it); } catch (e) { console.log(`  FAIL    ${it.id}: ${e.message}`); } } })); };

const cmds = {
  async list() { for (const it of pick(filter)) console.log(`${fs.existsSync(outPath(it)) ? 'have   ' : srcPath(it) ? 'raw    ' : 'planned'} ${it.group.padEnd(8)} ${it.kind.padEnd(9)} ${it.id.padEnd(30)} ${it.model}`); console.log(`${pick(filter).length} items; spent so far $${spent().toFixed(3)}`); },
  async price() { let sum = 0; await pool(pick(filter).filter((it) => !fs.existsSync(outPath(it)) || flag('force')), async (it) => { const usd = await estimate(it); sum += usd; console.log(`  $${usd.toFixed(3)}  ${it.id}`); }); console.log(`To make: $${sum.toFixed(3)}. Spent so far: $${spent().toFixed(3)}. Cap: $${cap}.`); },
  async make() {
    if (!filter) throw new Error('say what to make: an id, group:<name>, kind:<name> or all');
    const items = pick(filter); if (!items.length) throw new Error('nothing matches "' + filter + '"');
    console.log(`Making ${items.length} (cap $${cap}, spent $${spent().toFixed(3)}):`);
    await pool(items, make);
    console.log(`${manifest()} files in the manifest. Spent in all: $${spent().toFixed(3)} of $${cap}.`);
  },
  async post() { for (const it of pick(filter)) if (srcPath(it)) { post(it); console.log('  post    ' + it.id); } console.log(`${manifest()} files in the manifest.`); },
  async manifest() { console.log(`${manifest()} files in the manifest.`); },
  async spent() { const L = ledger(); console.log(`$${spent().toFixed(3)} in ${L.charges.length} generations.`); },
};
if (!cmds[cmd]) { console.error(`Unknown command "${cmd}". Commands: ${Object.keys(cmds).join(', ')}`); process.exit(1); }
cmds[cmd]().catch((e) => { console.error(e.message); process.exit(1); });
