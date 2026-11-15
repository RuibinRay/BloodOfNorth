// The minimap: a round piece of the chart in the bottom right corner while he plays, turned so that the way the
// camera looks is up. It is cut from the same charts the map screen draws (chart.js), whichever covers where he is:
// the valley or a town (about 60 m round him), the home waters (160 m), the open sea (320 m). On it: Eirik, where the
// quest leads (on the rim, pointing, when it is farther than the map shows), his waypoint, his companions, anyone
// fighting him, his horse and his boat. Settings: Minimap.
import { HALF } from '../world/terrain.js';
import { mainAt } from '../world/realm.js';
import { SEA_VIEW, REALM_VIEW } from './chart.js';
import { tr, canvasFont } from '../i18n/i18n.js';

const SIZE = 172; // css pixels across

export class Minimap {
  constructor(ui) {
    this.ui = ui; this.g = ui.g; this.t = 0; this.building = false;
    const el = (this.el = document.createElement('div')); el.id = 'minimap';
    el.innerHTML = '<canvas></canvas>';
    document.getElementById('hud').appendChild(el);
    this.cv = el.querySelector('canvas'); this.x = this.cv.getContext('2d');
    this.dpr = 0;
  }
  /** Which chart covers (x, z), with its box and how far round him to show. */
  source(x, z) {
    const ui = this.ui, town = mainAt(x, z);
    if (town) { const V = { x0: town.x - town.half, z0: town.z - town.half, w: town.half * 2, h: town.half * 2 }; return { key: 'town:' + town.id, V, get: () => (ui.townBase || {})[town.id], build: () => { (ui.townBase ||= {})[town.id] = ui.buildSeaMap(V); }, r: 60 }; }
    if (Math.abs(x) < HALF && Math.abs(z) < HALF) return { key: 'valley', V: { x0: -HALF, z0: -HALF, w: HALF * 2, h: HALF * 2 }, get: () => ui.mapBase, build: () => { ui.mapBase = ui.buildMap(); }, r: 60 };
    const inBox = (V) => x >= V.x0 && x <= V.x0 + V.w && z >= V.z0 && z <= V.z0 + V.h;
    if (inBox(SEA_VIEW)) return { key: 'sea', V: SEA_VIEW, get: () => ui.seaBase, build: () => { ui.seaBase = ui.buildSeaMap(); }, r: 160 };
    return { key: 'realm', V: REALM_VIEW, get: () => ui.realmBase, build: () => { ui.realmBase = ui.buildSeaMap(REALM_VIEW); }, r: 320 };
  }
  update(dt) {
    const g = this.g, on = g.settings.minimap !== false && (g.mode === 'play' || g.mode === 'activity') && g.started && !(g.ravens && g.ravens.eye);
    if (on !== this.on) { this.on = on; this.el.classList.toggle('on', on); document.getElementById('hud').classList.toggle('mm', on); }
    if (!on || (this.t += dt) < 1 / 30) return;
    this.t = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (dpr !== this.dpr) { this.dpr = dpr; this.cv.width = this.cv.height = Math.round(SIZE * dpr); }
    const x = this.x, N = this.cv.width, R = N / 2, p = g.player, src = this.source(p.pos.x, p.pos.z), base = src.get();
    // a chart not drawn yet is drawn when the game has a moment (it takes a tenth of a second or so)
    if (!base && !this.building) {
      this.building = true;
      const go = () => { try { src.build(); } finally { this.building = false; } };
      if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 200);
    }
    // turned so that the way the camera looks is up
    const cam = g.camera, d = cam.getWorldDirection(this._d || (this._d = cam.position.clone())), turn = -Math.PI / 2 - Math.atan2(d.z, d.x);
    const s = R / src.r; // pixels a metre
    x.save(); x.clearRect(0, 0, N, N);
    x.beginPath(); x.arc(R, R, R - 1, 0, 6.2832); x.clip();
    x.fillStyle = '#d8c9a0'; x.fillRect(0, 0, N, N);
    x.translate(R, R); x.rotate(turn);
    if (base) {
      const V = src.V, k = base.width / V.w, span = src.r * 1.5; // a square a little larger than the circle, so its corners are never seen turning
      x.drawImage(base, (p.pos.x - span - V.x0) * k, (p.pos.z - span - V.z0) * k, span * 2 * k, span * 2 * k, -span * s, -span * s, span * 2 * s, span * 2 * s);
    }
    const at = (wx, wz) => [(wx - p.pos.x) * s, (wz - p.pos.z) * s];
    const dot = (wx, wz, r, fill, line = '#2a1c12') => { const [a, b] = at(wx, wz); if (a * a + b * b > (R - 4) * (R - 4)) return; x.fillStyle = fill; x.strokeStyle = line; x.lineWidth = 1.5 * dpr; x.beginPath(); x.arc(a, b, r * dpr, 0, 6.2832); x.fill(); x.stroke(); };
    const open = g.state.stage === 'open' && g.story.open && g.story.open.built ? g.story.open : null;
    if (open) for (const m of [open.mounts.horse, open.mounts.boat]) if (m && open.mounts.on !== m) dot(m.pos.x, m.pos.z, m.type === 'boat' ? 4 : 3.5, m.type === 'boat' ? '#f4efe2' : '#6a4426');
    if (g.companions && g.companions.present) for (const n of g.companions.present()) dot(n.pos.x, n.pos.z, 3.5, '#6fae6a');
    if (g.combat) for (const e of g.combat.alive()) dot(e.pos.x, e.pos.z, 3.5, '#c0392b');
    const wp = g.state.waypoint; if (wp) { const [a, b] = at(wp.x, wp.z); const l = Math.hypot(a, b), m = Math.min(1, (R - 9) / Math.max(l, 1e-6)); x.save(); x.translate(a * m, b * m); x.rotate(-turn); x.fillStyle = '#b9d2e2'; x.strokeStyle = '#16242e'; x.lineWidth = 1.5 * dpr; x.beginPath(); x.moveTo(0, 0); x.lineTo(-5 * dpr, -11 * dpr); x.lineTo(5 * dpr, -11 * dpr); x.closePath(); x.fill(); x.stroke(); x.restore(); }
    const trk = g.quests.tracked()[0], mk = trk ? g.story.markerFor(trk.step) : null;
    if (mk) { // where the quest leads: on the map if it is near, else on the rim, the way to go
      const [a, b] = at(mk.x, mk.z), l = Math.hypot(a, b), far = l > R - 10, m = far ? (R - 10) / l : 1;
      x.save(); x.translate(a * m, b * m); x.rotate(Math.PI / 4 - turn * 0); x.fillStyle = '#e9c668'; x.strokeStyle = '#2a1c12'; x.lineWidth = 1.8 * dpr; const q = (far ? 4.5 : 5.5) * dpr; x.fillRect(-q, -q, q * 2, q * 2); x.strokeRect(-q, -q, q * 2, q * 2); x.restore();
    }
    // Eirik, in the middle, facing the way he faces
    x.save(); x.rotate(Math.PI - p.yaw); x.scale(dpr, dpr);
    x.fillStyle = '#8f2f24'; x.strokeStyle = '#fff'; x.lineWidth = 1.8; x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 7); x.lineTo(0, 3); x.lineTo(-6, 7); x.closePath(); x.fill(); x.stroke(); x.restore();
    // north, on the rim
    const nx = Math.sin(-turn) * 0, ny = -1, ca = Math.cos(turn), sa = Math.sin(turn), rx = -ny * sa + nx * ca, ry = ny * ca + nx * sa;
    x.restore();
    x.save(); x.font = canvasFont(`600 ${Math.round(13 * dpr)}px Georgia`); x.textAlign = 'center'; x.textBaseline = 'middle';
    const tx = R + rx * (R - 11 * dpr), ty = R + ry * (R - 11 * dpr);
    x.fillStyle = 'rgba(42,28,18,0.85)'; x.beginPath(); x.arc(tx, ty, 9 * dpr, 0, 6.2832); x.fill(); x.fillStyle = '#f4efe2'; x.fillText(tr('N'), tx, ty + dpr * 0.5);
    x.restore();
  }
}
