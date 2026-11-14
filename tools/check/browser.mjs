// A headless Chrome over the DevTools protocol, with no packages: just enough to open the game in a page, run an
// expression there and close it. Used by tools/check.mjs and tools/shot.mjs. It starts Chrome with a temporary profile.
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function findChrome() {
  const c = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
  const hit = c.find((x) => existsSync(x));
  if (!hit) throw new Error('No Chrome found. Install Google Chrome, or set CHROME_PATH to a Chromium-based browser.');
  return hit;
}
/** The DevTools protocol over one WebSocket: just enough to open a page, run an expression in it and close it. */
export class Browser {
  static async launch() {
    const dir = mkdtempSync(join(tmpdir(), 'botn-check-'));
    const proc = spawn(findChrome(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      '--mute-audio', `--window-size=${process.env.SHOT_SIZE || '1280,720'}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
      else if (m.method === 'Runtime.bindingCalled' && m.params.name === '__snap') this.snap(m.sessionId, m.params.payload);
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
      await this.send('Runtime.addBinding', { name: '__snap' }, sessionId); // window.__snap(name): a picture of the whole page, menus and all
      const ev = (e) => this.send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, sessionId);
      for (let i = 0; i < 200; i++) { const r = await ev(`document.readyState === 'complete' && location.href.startsWith(${JSON.stringify(base)})`); if (r.result.value) break; await new Promise((r2) => setTimeout(r2, 100)); }
      const r = await Promise.race([ev(expression), new Promise((_, rej) => setTimeout(() => rej(new Error('timed out after ' + timeout / 1000 + ' s')), timeout))]);
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).split('\n')[0]);
      return { value: r.result.value, thrown };
    } catch (e) { e.thrown = thrown; throw e; } finally { this.thrown.delete(sessionId); await this.send('Target.closeTarget', { targetId }).catch(() => {}); }
  }
  /** The page asked for a picture of itself (window.__snap): the whole page as the player sees it, saved to .playtest/ (or SHOT_DIR). */
  async snap(sessionId, name) {
    try {
      const { data } = await this.send('Page.captureScreenshot', { format: 'jpeg', quality: 86 }, sessionId);
      const dir = process.env.SHOT_DIR || join(process.cwd(), '.playtest'); mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, String(name).replace(/[^\w.-]/g, '') + '.jpg'), Buffer.from(data, 'base64'));
    } catch (e) { console.error('snap failed:', e.message); }
    await this.send('Runtime.evaluate', { expression: `window.__snapDone && window.__snapDone(${JSON.stringify(name)})` }, sessionId).catch(() => {});
  }
  close() { try { this.ws.close(); } catch { /* gone */ } this.proc.kill(); setTimeout(() => { try { rmSync(this.dir, { recursive: true, force: true }); } catch { /* leave it */ } }, 300); }
}
