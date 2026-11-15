// The languages, played: each chapter is started in its own page in Chinese (or Spanish), run for a few seconds with
// every conversation clicked through, and what reached the screen untranslated is listed. Used by `npm run check`
// (Act I in both languages; --langs=all for every chapter) and on its own:
//   node tools/check/langs.mjs zh q_morning,q_wood      node tools/check/langs.mjs es act1      node tools/check/langs.mjs zh all
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { Browser } from './browser.mjs';
import { ACTS, ORDER } from '../../src/data/chapters.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
/** ids: 'all', 'act1'...'act7', 'epilogue', or a comma list of chapter ids. */
export function chaptersOf(spec) {
  if (spec === 'all') return ORDER.filter((id) => ACTS.some((a) => a.quests.includes(id)));
  const m = /^act(\d)$/.exec(spec); if (m) return ACTS[+m[1] - 1].quests;
  if (spec === 'epilogue') return ACTS[ACTS.length - 1].quests;
  return spec.split(',');
}
export async function sweep(lang, ids, { jobs = 2, secs = 12, server, browser, log = () => {} } = {}) {
  const own = !server;
  if (own) { server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 5192, strictPort: false, hmr: false, watch: null } }); await server.listen(); browser = await Browser.launch(); }
  const base = server.resolvedUrls.local[0], out = { rows: [], panels: null };
  const call = (c) => `(async () => { await import('/tools/check/page.js'); return JSON.stringify(await window.__check.${c}); })()`;
  try {
    const queue = ids.map((id, i) => ({ id, panels: i === 0 }));
    await Promise.all(Array.from({ length: jobs }, async () => {
      for (let job; (job = queue.shift());) {
        try {
          const { value } = await browser.run(base, call(`i18n(${JSON.stringify(lang)}, [${JSON.stringify(job.id)}], ${secs}, ${job.panels})`), 120000);
          const r = JSON.parse(value); out.rows.push(...r.rows); if (job.panels) out.panels = { missing: r.panelMissing, latin: r.panelLatin };
          log(job.id, r.rows[0]);
        } catch (e) { out.rows.push({ id: job.id, crash: e.message }); log(job.id, { crash: e.message }); }
      }
    }));
  } finally { if (own) { browser.close(); await server.close().catch(() => {}); } }
  return out;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [lang = 'zh', spec = 'act1'] = process.argv.slice(2);
  const r = await sweep(lang, chaptersOf(spec), { log: (id, row) => console.log(id.padEnd(16), row.crash ? 'CRASH ' + row.crash : `${row.missing.length} missing, ${row.latin.length} latin` + (row.missing.length || row.latin.length ? ': ' + JSON.stringify([...row.missing, ...row.latin.map((w) => '«' + w + '»')]).slice(0, 600) : '')) });
  if (r.panels) console.log('panels', JSON.stringify(r.panels).slice(0, 1500));
  process.exit(0);
}
