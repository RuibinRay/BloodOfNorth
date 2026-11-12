#!/usr/bin/env node
// Higgsfield API client for the asset pipeline. Reads credentials from .env (never from the command line).
//
//   npm run hf -- auth                      check that the stored credentials are accepted (free)
//   npm run hf -- estimate <slot>           price a registry slot before generating (free)
//   npm run hf -- generate <slot> [--yes]   submit, poll, download into assets/generated/, update the registry
//   npm run hf -- status <request_id>
//   npm run hf -- list                      show registry slots and their state
//
// API shape (docs.higgsfield.ai): POST https://api.higgsfield.ai/<model path> with
// "Authorization: Key <key id>:<key secret>", then poll /requests/<id>/status until a terminal state.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.higgsfield.ai';
const REG = path.join(ROOT, 'assets', 'registry.json');
const OUT = path.join(ROOT, 'assets', 'generated');

function env() {
  const file = path.join(ROOT, '.env'), out = {};
  if (fs.existsSync(file)) for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return { id: process.env.HF_API_KEY_ID || out.HF_API_KEY_ID || '', secret: process.env.HF_API_KEY_SECRET || out.HF_API_KEY_SECRET || '' };
}
function headers() {
  const { id, secret } = env();
  if (!id || !secret) {
    throw new Error('Higgsfield needs both HF_API_KEY_ID and HF_API_KEY_SECRET in .env. Create a key at https://console.higgsfield.ai — it shows a key ID and a secret; the secret is only shown once.');
  }
  return { Authorization: `Key ${id}:${secret}`, 'Content-Type': 'application/json' };
}
async function call(method, url, body, extra = {}) {
  const res = await fetch(url, { method, headers: { ...headers(), ...extra }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}
const registry = () => JSON.parse(fs.readFileSync(REG, 'utf8'));
const slotOf = (name) => {
  const s = registry().slots.find((x) => x.id === name);
  if (!s) throw new Error(`No registry slot "${name}". Run "npm run hf -- list".`);
  return s;
};

const cmds = {
  async auth() {
    const r = await call('GET', `${API}/requests/00000000-0000-4000-8000-000000000000/status`);
    if (r.status === 401) { console.log('REJECTED (401 Invalid credentials). Check the key ID and secret in .env.'); process.exitCode = 1; }
    else console.log(`Credentials accepted (HTTP ${r.status} for a request id that does not exist, as expected).`);
  },
  async list() {
    for (const s of registry().slots) console.log(`${s.status.padEnd(11)} ${s.id.padEnd(26)} ${s.kind.padEnd(8)} ${s.use}`);
  },
  async estimate(name) {
    const s = slotOf(name);
    const r = await call('POST', `${API}/estimate/${s.model}`, s.request);
    console.log(r.status === 200 ? `Estimated cost for ${name}: $${r.json.usd}` : `Estimate failed (HTTP ${r.status}): ${JSON.stringify(r.json)}`);
  },
  async status(id) { console.log(JSON.stringify((await call('GET', `${API}/requests/${id}/status`)).json, null, 2)); },
  async generate(name, flag) {
    const s = slotOf(name);
    const est = await call('POST', `${API}/estimate/${s.model}`, s.request);
    if (est.status !== 200) throw new Error(`Estimate failed (HTTP ${est.status}): ${JSON.stringify(est.json)}`);
    console.log(`${name}: estimated $${est.json.usd} on ${s.model}`);
    if (flag !== '--yes') { console.log('Nothing was charged. Re-run with --yes to generate.'); return; }
    const sub = await call('POST', `${API}/${s.model}`, s.request, { 'Idempotency-Key': crypto.randomUUID() });
    if (sub.status >= 300) throw new Error(`Submit failed (HTTP ${sub.status}): ${JSON.stringify(sub.json)}`);
    let delay = 2000, result = sub.json;
    while (!['completed', 'failed', 'nsfw', 'canceled'].includes(result.status)) {
      await new Promise((r) => setTimeout(r, delay + Math.random() * 500));
      delay = Math.min(delay * 1.5, 10000);
      result = (await call('GET', result.status_url || `${API}/requests/${sub.json.request_id}/status`)).json;
      process.stdout.write(`  ${result.status}\r`);
    }
    if (result.status !== 'completed') throw new Error(`Generation ended as "${result.status}" (not charged).`);
    const urls = [...(result.images || []), ...(result.videos || []), ...(result.video ? [result.video] : [])].map((x) => x.url).filter(Boolean);
    fs.mkdirSync(OUT, { recursive: true });
    const files = [];
    for (const [i, url] of urls.entries()) {
      const ext = path.extname(new URL(url).pathname) || '.bin', file = `${name}${urls.length > 1 ? '_' + i : ''}${ext}`;
      fs.writeFileSync(path.join(OUT, file), Buffer.from(await (await fetch(url)).arrayBuffer()));
      files.push('assets/generated/' + file);
    }
    const reg = registry(), slot = reg.slots.find((x) => x.id === name);
    Object.assign(slot, { status: 'generated', files, request_id: result.request_id, generated_at: new Date().toISOString() });
    fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
    console.log(`Saved ${files.join(', ')} and updated the registry.`);
  },
};

const [cmd = 'list', ...args] = process.argv.slice(2);
if (!cmds[cmd]) { console.error(`Unknown command "${cmd}". Commands: ${Object.keys(cmds).join(', ')}`); process.exit(1); }
cmds[cmd](...args).catch((e) => { console.error(e.message); process.exit(1); });
