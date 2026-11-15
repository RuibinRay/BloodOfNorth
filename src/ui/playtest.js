// The playtest recorder: what a person's play through the story looked like, for the 0.30 playtest pass.
//
// While someone plays, it keeps, for every step of every chapter: how long they spent on it, how often Eirik fell or
// was caught (and by whom), and whether they got past it. F8 opens a box for a note: what they type is kept with the
// step, the place, the language and a small picture of the screen. The Playtest page (pause menu, and the main menu's
// panels) shows the steps where people struggled and downloads the whole record as a file to send back.
//
// It lives in this browser's storage (localStorage 'botn.playtest'), apart from the saves, so it survives the page
// reloading after a death and is never part of a saved game. Nothing leaves the machine unless the player downloads
// the report and sends it.
import { tr } from '../i18n/i18n.js';
import { ORDER, ACTS } from '../data/chapters.js';

const KEY = 'botn.playtest', NOTE_PICS = 24, VERSION = '0.30';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** A step where people get stuck: longer than this in play, or this many falls. */
export const SLOW = 600, FALLS = 3;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } }
function fresh() { return { v: 1, build: VERSION, started: Date.now(), sessions: [], steps: {}, order: [], notes: [] }; }

export class Playtest {
  constructor(game) {
    this.g = game;
    this.data = load() || fresh();
    this.data.sessions.push({ at: Date.now(), ua: navigator.userAgent.slice(0, 160), w: innerWidth, h: innerHeight }); // the language is added on the first frame, once it is set
    this.cur = null; this.flushT = 0; this.lastDeath = 0; this.dirty = true;
    game.events.on('playerDied', () => this.died());
    const reload = game.reloadCheckpoint.bind(game);
    game.reloadCheckpoint = () => { this.step(); if (this.cur) this.cur.reloads = (this.cur.reloads || 0) + 1; this.flush(); reload(); }; // a fall or a capture: the page reloads
    addEventListener('beforeunload', () => this.flush());
    addEventListener('keydown', (e) => { if (e.code === 'F8' && !this.box) { e.preventDefault(); this.openNote(); } });
  }
  /** The step in hand: the tracked main quest's current step. */
  where() {
    const g = this.g, st = g.state.quests;
    const id = Object.keys(st).find((k) => st[k].status === 'active' && g.quests.defs[k] && g.quests.defs[k].kind === 'main') || Object.keys(st).find((k) => st[k].status === 'active');
    if (!id) return null;
    const def = g.quests.defs[id], s = def.steps[Math.min(st[id].step, def.steps.length - 1)];
    return { key: id + '.' + s.id, quest: id, step: s.id, title: def.title, text: s.text };
  }
  step() {
    const w = this.where();
    if (!w) return (this.cur = null);
    let e = this.data.steps[w.key];
    if (!e) { e = this.data.steps[w.key] = { quest: w.quest, step: w.step, title: w.title, text: w.text, secs: 0, falls: 0, reloads: 0, by: {}, first: Date.now() }; this.data.order.push(w.key); this.dirty = true; }
    if (this.cur && this.cur !== e) { this.cur.passed = true; this.dirty = true; } // moved on from the last one
    return (this.cur = e);
  }
  died() {
    const now = Date.now();
    if (now - this.lastDeath < 4000) return; // one fall, however many times it is announced
    this.lastDeath = now;
    const e = this.step(); if (!e) return;
    e.falls++;
    const foes = this.g.combat.alive().map((n) => n.name).filter(Boolean);
    for (const n of new Set(foes.length ? foes.slice(0, 2) : ['the cold, the water or the fall'])) e.by[n] = (e.by[n] || 0) + 1;
    this.flush();
  }
  /** Every frame: time on the step in hand, while the story is being played (not paused, not on a menu). */
  update(dt) {
    const g = this.g;
    if (!g.started || g.mode === 'menu' || g.mode === 'paused') return;
    const s = this.data.sessions[this.data.sessions.length - 1];
    if (s && !s.lang) s.lang = document.documentElement.dataset.lang || 'en';
    const e = this.step(); if (!e) return;
    e.secs += dt; this.flushT += dt;
    if (this.flushT > 5) this.flush();
  }
  flush() {
    this.flushT = 0;
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch {
      // full: the oldest pictures go first
      for (const n of this.data.notes) if (n.pic) { delete n.pic; try { localStorage.setItem(KEY, JSON.stringify(this.data)); return; } catch { /* still full */ } }
    }
  }
  clear() { this.data = fresh(); this.cur = null; this.flush(); }

  // ---- notes (F8) -------------------------------------------------------------------------------------------------
  openNote() {
    const g = this.g;
    if (!g.started) return;
    let pic = null;
    try { // a small picture of the screen as it was when F8 was pressed
      g.draw(); const src = g.renderer.domElement, w = 360, c = document.createElement('canvas'); c.width = w; c.height = Math.round((w * src.height) / src.width);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); pic = c.toDataURL('image/jpeg', 0.6);
    } catch { /* no picture */ }
    const prev = g.mode; if (prev !== 'paused' && prev !== 'menu') { this.prevMode = prev; g.setMode('paused'); }
    const w = this.where(), d = document.createElement('div'); this.box = d;
    d.id = 'ptnote';
    d.innerHTML = `<div class="box"><b>${esc(tr('A note for the playtest'))}</b><span>${esc(w ? tr(w.title) + ' · ' + g.fmt(w.text) : '')}</span>
      <textarea rows="4" placeholder="${esc(tr('What happened? What was unclear, unfair, too easy or too slow?'))}"></textarea>
      <div class="row"><small>${esc(tr('Enter keeps it · Esc throws it away · the Playtest page has them all'))}</small><button class="btn">${esc(tr('Keep'))}</button></div></div>`;
    document.getElementById('ui').appendChild(d);
    const ta = d.querySelector('textarea'), done = (keep) => {
      if (keep && ta.value.trim()) {
        const p = g.player.pos, e = this.step();
        this.data.notes.push({ at: Date.now(), where: w ? w.key : null, title: w ? w.title : null, text: ta.value.trim().slice(0, 2000), pos: [Math.round(p.x), Math.round(p.z)], lang: document.documentElement.dataset.lang || 'en', health: Math.round(g.player.health), pic });
        if (e) e.notes = (e.notes || 0) + 1;
        let n = 0; for (let i = this.data.notes.length - 1; i >= 0; i--) if (this.data.notes[i].pic && ++n > NOTE_PICS) delete this.data.notes[i].pic; // keep the pictures of the latest only
        this.flush(); g.ui.toast(tr('Note kept'));
      }
      d.remove(); this.box = null;
      if (this.prevMode) { g.setMode(this.prevMode); this.prevMode = null; g.input.lock(); }
    };
    ta.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') done(false); else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); done(true); } });
    ta.addEventListener('keyup', (e) => e.stopPropagation());
    d.querySelector('button').onclick = () => done(true);
    setTimeout(() => ta.focus(), 30);
  }

  // ---- the report -------------------------------------------------------------------------------------------------
  /** The steps in story order, each with its chapter, and the ones to look at first. */
  summary() {
    const D = this.data, chapterOf = (q) => { for (const [ai, a] of ACTS.entries()) if (a.quests.includes(q)) return ai; return -1; };
    const rows = D.order.map((k) => ({ key: k, ...D.steps[k], act: chapterOf(D.steps[k].quest) })).sort((a, b) => (ORDER.indexOf(a.quest) - ORDER.indexOf(b.quest)) || (a.first - b.first));
    const hard = rows.filter((r) => r.secs > SLOW || r.falls >= FALLS || r.reloads >= FALLS);
    const total = rows.reduce((s, r) => s + r.secs, 0), falls = rows.reduce((s, r) => s + r.falls, 0);
    const chapters = new Set(rows.map((r) => r.quest)).size;
    return { rows, hard, total, falls, chapters, notes: D.notes };
  }
  /** The file a tester sends back: everything recorded, and a readable summary at the top. */
  download() {
    const S = this.summary(), m = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;
    const lines = [`Blood of the North ${VERSION}: playtest report, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      `${S.chapters} chapters, ${S.rows.length} steps, ${m(S.total)} in play, ${S.falls} falls, ${S.notes.length} notes`, '',
      'Where it was hard (over 10 minutes, or 3 falls or more):', ...(S.hard.length ? S.hard.map((r) => `  ${r.key}  "${r.title}: ${r.text}"  ${m(r.secs)}, ${r.falls} falls${Object.keys(r.by).length ? ' (' + Object.entries(r.by).map(([n, c]) => `${n} ${c}`).join(', ') + ')' : ''}${r.passed ? '' : ', NOT PASSED'}`) : ['  nowhere']), '',
      'Notes:', ...(S.notes.length ? S.notes.map((n) => `  [${n.where || '-'}] ${n.text}`) : ['  none']), '',
      'Every step:', ...S.rows.map((r) => `  ${r.key.padEnd(24)} ${m(r.secs).padStart(8)}  ${String(r.falls).padStart(2)} falls${r.passed ? '' : '  (not passed)'}`)];
    const blob = new Blob([lines.join('\n') + '\n\n--- data ---\n' + JSON.stringify(this.data)], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `botn-playtest-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
}
