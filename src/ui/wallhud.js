// The shield wall on screen: the line as a strip of sectors, left to right as Eirik sees it facing them. In each,
// our ground rises from the bottom and theirs presses down from the top; gold when they reel, red where it gives.
// Kept in its own file (and its own style block) so the wall can be added without touching the rest of the interface.
import { tr } from '../i18n/i18n.js';

const CSS = `
#wallhud { position: absolute; left: 50%; top: 50px; width: min(380px, 44vw); transform: translateX(-50%); display: none; text-align: center; text-shadow: 0 1px 3px #000; }
#wallhud.on { display: block; }
#wallhud.on ~ #target { top: 140px; }
#hud:has(#wallhud.on) #hint { max-width: min(380px, 24vw); }
#wallhud .row { display: flex; align-items: center; gap: 8px; }
#wallhud .wn { width: 34px; font: 600 14px/1 system-ui, sans-serif; font-variant-numeric: tabular-nums; }
#wallhud .wn.ours { text-align: right; color: #cfe0ee; } #wallhud .wn.theirs { text-align: left; color: #e58a78; }
#wallhud .cells { flex: 1; display: flex; gap: 2px; height: 26px; }
#wallhud .cell { position: relative; flex: 1; background: linear-gradient(#7d251d, #5a1b15); border: 1px solid rgba(231, 217, 187, 0.3); overflow: hidden; }
#wallhud .cell b { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(#7f9db4, #4d6a80); border-top: 2px solid #e7d9bb; transition: height 0.25s; }
#wallhud .cell.me { border-color: #ecd28a; box-shadow: 0 0 0 1px #ecd28a; }
#wallhud .cell.reel b { background: linear-gradient(#ecd28a, #b08a3a); }
#wallhud .cell.sag { animation: wallsag 0.7s infinite; }
#wallhud .cell.open { animation: wallsag 0.35s infinite; border-color: #ff6a55; }
@keyframes wallsag { 50% { background: #c8452a; } }
#wallhud .goal { position: relative; height: 4px; margin: 5px 42px 0; background: rgba(10, 8, 6, 0.72); border: 1px solid rgba(231, 217, 187, 0.3); }
#wallhud .goal i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(#e8d08a, #b08a3a); transition: width 0.25s; }
#wallhud .cap { margin-top: 5px; font-size: 14px; letter-spacing: 0.06em; min-height: 18px; }
#wallhud .cap.hot { color: #ecd28a; font-weight: 600; } #wallhud .cap.red { color: #ff9a80; font-weight: 600; }
`;

export class WallHUD {
  constructor(game) {
    this.g = game;
    if (!document.getElementById('wallhud-css')) { const s = document.createElement('style'); s.id = 'wallhud-css'; s.textContent = CSS; document.head.appendChild(s); }
    let e = document.getElementById('wallhud');
    if (!e) {
      e = document.createElement('div'); e.id = 'wallhud';
      e.innerHTML = '<div class="row"><span class="wn ours"></span><div class="cells"></div><span class="wn theirs"></span></div><div class="goal"><i></i></div><div class="cap"></div>';
      const hud = document.getElementById('hud'), target = document.getElementById('target');
      if (hud) hud.insertBefore(e, target); else document.body.appendChild(e);
    }
    this.e = e; this.cells = e.querySelector('.cells'); this.ours = e.querySelector('.ours'); this.theirs = e.querySelector('.theirs'); this.goal = e.querySelector('.goal i'); this.cap = e.querySelector('.cap');
    this.last = '';
  }
  show(n) { this.cells.innerHTML = '<i class="cell"><b></b></i>'.repeat(n); this.list = [...this.cells.children]; this.e.classList.add('on'); this.last = ''; }
  hide() { this.e.classList.remove('on'); }
  /** s: { off: [m per sector, left to right], lo, hi (the range drawn), state: ['', 'reel', 'sag', 'open'], me: index, ours, theirs, progress: 0..1, text, tone: '' | 'hot' | 'red' } */
  update(s) {
    const key = JSON.stringify(s);
    if (key === this.last) return;
    this.last = key;
    s.off.forEach((v, i) => { const c = this.list[i]; if (!c) return; c.firstChild.style.height = Math.round(Math.min(0.94, Math.max(0.06, (v - s.lo) / (s.hi - s.lo))) * 100) + '%'; c.className = 'cell ' + (s.state[i] || '') + (i === s.me ? ' me' : ''); });
    this.ours.textContent = tr(s.ours); this.theirs.textContent = tr(s.theirs);
    this.goal.style.width = Math.round(Math.min(1, Math.max(0, s.progress)) * 100) + '%';
    this.cap.innerHTML = this.g.ui.keys(this.g.fmt(s.text || '')); this.cap.className = 'cap ' + (s.tone || '');
  }
}
