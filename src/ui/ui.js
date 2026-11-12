// HUD, dialogue box, menus and panels (DOM overlay on top of the WebGL canvas).
import * as THREE from 'three';
import { codeLabel, ACTION_LABELS, DEFAULT_BINDINGS } from '../core/input.js';
import { listSaves, saveSettings, deleteSave, latestSave, DEFAULT_SETTINGS } from '../core/save.js';
import { ITEMS, QUESTS } from '../data/act1.js';
import { POI } from '../world/layout.js';
import { heightAt, riverX, riverSurfaceY, SIZE, HALF } from '../world/terrain.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const _v = new THREE.Vector3();
const CARD = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
const TRAITS = { wisdom: 'Wisdom', compassion: 'Compassion', ferocity: 'Ferocity', pride: 'Pride' };
const fmtTime = (s) => { s = Math.floor(s); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`; };

export class UI {
  constructor(game) {
    this.g = game;
    this.e = {};
    for (const id of ['hud', 'compass', 'tracker', 'hint', 'toasts', 'prompt', 'crosshair', 'marker', 'detect', 'alert', 'meter', 'banner', 'sense', 'subtitle', 'skip', 'dialogue', 'fade', 'card', 'menu', 'pause', 'panel', 'tabs', 'loading', 'equip'])
      this.e[id] = document.getElementById(id);
    this.e.lb = [document.getElementById('lb-top'), document.getElementById('lb-bot')];
    this.bars = { health: $('#bar-health i'), stamina: $('#bar-stamina i'), warmth: $('#bar-warmth i'), warmthWrap: $('#bar-warmth') };
    this.subT = 0; this.fadeS = null; this.fadeV = 0; this.cardS = null; this.tab = 'journal'; this.returnTo = null; this.sel = {};
    this.compass = CARD.map(([t, b]) => { const s = document.createElement('span'); s.textContent = t; if (t.length > 1) s.className = 'minor'; this.e.compass.appendChild(s); return { s, b }; });
    this.objSpan = document.createElement('span'); this.objSpan.className = 'obj'; this.objSpan.textContent = '◆'; this.e.compass.appendChild(this.objSpan);
    this.waySpan = document.createElement('span'); this.waySpan.className = 'way'; this.waySpan.textContent = '▾'; this.e.compass.appendChild(this.waySpan);
    $('#panel-close').onclick = () => this.closePanel();
    this.applySettings();

    const m = this.e.meter;
    this.meter = {
      show: ({ label, hint = '', zone = null, mode = 'timing', alert = false }) => {
        m.className = 'on' + (mode === 'reel' ? ' m-reel' : mode === 'text' ? ' m-text' : '') + (alert ? ' alert' : '');
        m.querySelector('.label').textContent = label; m.querySelector('.hint').textContent = hint;
        if (zone) { const z = m.querySelector('.zone'); z.style.left = zone[0] * 100 + '%'; z.style.width = (zone[1] - zone[0]) * 100 + '%'; }
      },
      set: (p) => { m.querySelector('.mark').style.left = p * 100 + '%'; },
      reel: (p, t) => { $('#reel-p').style.width = p * 100 + '%'; $('#reel-t').style.width = t * 100 + '%'; },
      hide: () => { m.className = ''; },
    };
  }
  applySettings() { document.documentElement.style.setProperty('--sub-scale', this.g.settings.subtitleSize); }

  // ---- small HUD pieces ---------------------------------------------------------------
  keys(text) { return esc(text).replace(/\{(\w+)\}/g, (_, a) => `<kbd>${esc(this.g.input.label(a))}</kbd>`); }
  hint(text) { const h = this.e.hint; if (!text) { h.classList.remove('on'); return; } h.innerHTML = this.keys(text); h.classList.add('on'); }
  toast(text) {
    const d = document.createElement('div'); d.textContent = text; this.e.toasts.appendChild(d);
    while (this.e.toasts.children.length > 5) this.e.toasts.firstChild.remove();
    setTimeout(() => d.remove(), 3500);
  }
  subtitle(speaker, text, dur = 3) {
    if (!this.g.settings.subtitles) return;
    const s = this.e.subtitle;
    s.innerHTML = speaker ? `<b>${esc(speaker)}:</b> ${esc(text)}` : esc(text);
    s.classList.toggle('narr', !speaker); s.classList.add('on'); this.subT = dur;
  }
  questBanner(small, title) {
    const b = this.e.banner; b.querySelector('small').textContent = small; b.querySelector('b').textContent = title;
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  }
  alert() { const a = this.e.alert; a.classList.remove('on'); void a.offsetWidth; a.classList.add('on'); this.g.audio.play('ui', { vol: 0.8 }); }
  setDetection(v) {
    const d = this.e.detect;
    if (v < 0) { d.classList.remove('on'); return; }
    d.classList.add('on'); d.classList.toggle('hot', v >= 1);
    d.style.setProperty('--aware', Math.min(100, v * 100) + '%');
    d.querySelector('span').textContent = v >= 1 ? 'Spotted!' : v > 0.45 ? 'Suspicious' : 'Hidden';
  }
  letterbox(on) { this.e.lb.forEach((l) => l.classList.toggle('on', on)); this.e.hud.classList.toggle('hidden', on); }
  skipHint(k) { this.e.skip.classList.toggle('on', k > 0.02); this.e.skip.style.setProperty('--k', Math.min(1, k)); }
  setHUD(on) { this.e.hud.classList.toggle('hidden', !on); }

  refreshTracker() {
    const list = this.g.quests.tracked();
    this.e.tracker.innerHTML = list.map(({ def, q, step }) => {
      const n = step.count > 1 ? ` <em>${Math.min(q.count, step.count)} / ${step.count}</em>` : '';
      return `<div class="q ${def.kind}"><b>${esc(def.title)}</b><span>${esc(step.text)}${n}</span></div>`;
    }).join('');
  }

  // ---- dialogue -----------------------------------------------------------------------
  showDialogue(speaker, text, choices, sel = 0) {
    const d = this.e.dialogue; d.classList.add('on');
    d.querySelector('.speaker').textContent = speaker;
    const t = d.querySelector('.text'); t.textContent = text; t.style.display = text || !choices ? '' : 'none';
    const c = d.querySelector('.choices'); c.innerHTML = '';
    if (choices) choices.forEach((ch, i) => {
      const b = document.createElement('button'); b.innerHTML = `<i>${i + 1}</i>${esc(ch.t)}`; if (i === sel) b.className = 'sel';
      b.onclick = () => this.g.dialogue.advance(i); c.appendChild(b);
    });
    d.querySelector('.next').innerHTML = choices ? `<kbd>1</kbd>–<kbd>${choices.length}</kbd> choose` : `<kbd>${esc(this.g.input.label('interact'))}</kbd> continue`;
    this.e.hud.classList.add('hidden');
  }
  hideDialogue() { this.e.dialogue.classList.remove('on'); if (!this.g.cine.shots) this.e.hud.classList.remove('hidden'); }

  // ---- fades and title cards (driven by game time so they respect pause) --------------
  fade(toBlack, dur = 1) {
    return new Promise((res) => { this.fadeS = { from: this.fadeV, to: toBlack ? 1 : 0, t: 0, dur: Math.max(0.01, dur), res }; });
  }
  card(title, sub = '', dur = 3) {
    return new Promise((res) => {
      const c = this.e.card; c.querySelector('h1').textContent = title; c.querySelector('p').textContent = sub; c.classList.add('on');
      this.cardS = { t: 0, dur, res, out: false };
    });
  }

  // ---- per-frame ------------------------------------------------------------------------
  update(dt) {
    const g = this.g, p = g.player;
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.e.subtitle.classList.remove('on'); }
    if (this.fadeS) {
      const f = this.fadeS; f.t += dt; const k = Math.min(1, f.t / f.dur);
      this.fadeV = f.from + (f.to - f.from) * k; this.e.fade.style.opacity = this.fadeV;
      if (k >= 1) { this.fadeS = null; f.res(); }
    }
    if (this.cardS) {
      const c = this.cardS; c.t += dt;
      if (!c.out && c.t >= c.dur) { c.out = true; this.e.card.classList.remove('on'); }
      if (c.t >= c.dur + 1.0) { this.cardS = null; c.res(); }
    }
    if (g.mode === 'menu' || !p) return;
    this.bars.health.style.width = p.health + '%';
    this.bars.stamina.style.width = p.stamina + '%';
    const cold = g.state.stage === 'wilderness';
    this.bars.warmthWrap.classList.toggle('on', cold);
    if (cold) { this.bars.warmth.style.width = p.warmth + '%'; this.bars.warmthWrap.classList.toggle('low', p.warmth < 30); }
    this.e.sense.style.opacity = g.sense * 0.9;

    // compass
    g.camera.getWorldDirection(_v);
    const bearing = (Math.atan2(_v.x, -_v.z) * 180) / Math.PI, W = this.e.compass.clientWidth || 400, ppd = W / 160;
    const place = (span, b, clampEdge) => {
      let d = ((b - bearing + 540) % 360) - 180;
      if (clampEdge) d = Math.max(-76, Math.min(76, d));
      const vis = Math.abs(d) <= 78; span.style.display = vis ? '' : 'none';
      if (vis) span.style.left = W / 2 + d * ppd + 'px';
    };
    for (const c of this.compass) place(c.s, c.b, false);
    const tr = g.quests.tracked()[0];
    const mk = g.settings.objectiveMarkers && tr ? g.story.markerFor(tr.step) : null;
    if (mk) place(this.objSpan, (Math.atan2(mk.x - p.pos.x, -(mk.z - p.pos.z)) * 180) / Math.PI, true); else this.objSpan.style.display = 'none';
    const wp = g.state.waypoint;
    if (wp) place(this.waySpan, (Math.atan2(wp.x - p.pos.x, -(wp.z - p.pos.z)) * 180) / Math.PI, true); else this.waySpan.style.display = 'none';

    // world-space objective diamond
    let shown = false;
    if (mk && g.mode === 'play') {
      const dist = Math.hypot(mk.x - p.pos.x, mk.z - p.pos.z);
      _v.set(mk.x, mk.y, mk.z).project(g.camera);
      if (_v.z < 1 && Math.abs(_v.x) < 0.96 && Math.abs(_v.y) < 0.92 && dist > 3.5) {
        shown = true;
        this.e.marker.style.transform = `translate(${((_v.x + 1) / 2) * innerWidth}px, ${((1 - _v.y) / 2) * innerHeight}px)`;
        this.e.marker.querySelector('span').textContent = Math.round(dist) + ' m';
      }
    }
    this.e.marker.classList.toggle('on', shown);

    // interaction prompt
    const it = g.mode === 'play' && !p.frozen ? g.interaction : null;
    if (it) { const html = `<kbd>${esc(g.input.label('interact'))}</kbd> ${esc(it.label)}`; if (this._prompt !== html) { this._prompt = html; this.e.prompt.innerHTML = html; } }
    this.e.prompt.classList.toggle('on', !!it);
    this.e.crosshair.classList.toggle('on', p.aiming && g.mode === 'play');
    this.e.crosshair.style.setProperty('--draw', p.draw.toFixed(2));

    // equipment line
    const inv = g.inventory, parts = [];
    if (inv.has('woodsword')) parts.push(`<kbd>${esc(g.input.label('weapon1'))}</kbd> ${p.equipped === 'woodsword' ? '<b>Wooden sword</b>' : 'Wooden sword'}`);
    if (inv.has('bow')) parts.push(`<kbd>${esc(g.input.label('weapon2'))}</kbd> ${p.equipped === 'bow' ? '<b>Bow</b>' : 'Bow'} · ${inv.count('arrow')} arrows`);
    if (p.crouch) parts.push('<b>Crouched</b>');
    const eq = parts.join(' &nbsp; ');
    if (eq !== this._eq) { this._eq = eq; this.e.equip.innerHTML = eq; }
  }

  // ---- screens --------------------------------------------------------------------------
  hideLoading() { this.e.loading.classList.add('gone'); }
  buttons(nav, defs) {
    nav.innerHTML = '';
    for (const d of defs) {
      const b = document.createElement('button');
      b.innerHTML = esc(d.label) + (d.sub ? `<small>${esc(d.sub)}</small>` : '');
      b.disabled = !!d.disabled;
      b.onclick = () => { this.g.audio.init(); this.g.audio.play('ui'); d.act(); };
      nav.appendChild(b);
    }
  }
  showMain() {
    const g = this.g, last = latestSave();
    this.e.menu.classList.add('on'); this.e.hud.classList.add('hidden');
    this.buttons($('#menu-buttons'), [
      { label: 'Continue', sub: last ? `${last.save.meta.quest} · ${fmtTime(last.save.meta.playtime)}` : 'No saved game yet', disabled: !last, act: () => g.loadGame(last.slot) },
      { label: 'New Game', act: () => g.startNewGame() },
      { label: 'Load Game', act: () => this.openPanel('saves', ['saves', 'settings', 'status']) },
      { label: 'Settings', act: () => this.openPanel('settings', ['saves', 'settings', 'status']) },
      { label: 'Build Status', sub: 'What is playable, prototype and planned', act: () => this.openPanel('status', ['saves', 'settings', 'status']) },
    ]);
  }
  hideMain() { this.e.menu.classList.remove('on'); this.e.hud.classList.remove('hidden'); }
  showPause() {
    const g = this.g, all = ['journal', 'inventory', 'map', 'saga', 'settings', 'saves', 'status'];
    this.e.pause.classList.add('on');
    this.buttons($('#pause-buttons'), [
      { label: 'Resume', act: () => g.resume() },
      { label: 'Journal', act: () => this.openPanel('journal', all) },
      { label: 'Inventory', act: () => this.openPanel('inventory', all) },
      { label: 'Map', act: () => this.openPanel('map', all) },
      { label: 'Saga', act: () => this.openPanel('saga', all) },
      { label: 'Settings', act: () => this.openPanel('settings', all) },
      { label: 'Save / Load', act: () => this.openPanel('saves', all) },
      { label: 'Quit to Main Menu', act: () => g.quitToMenu() },
    ]);
  }
  hidePause() { this.e.pause.classList.remove('on'); }

  openPanel(tab, tabs = ['journal', 'inventory', 'map', 'saga', 'settings', 'saves', 'status']) {
    const names = { journal: 'Journal', inventory: 'Inventory', map: 'Map', saga: 'Saga', settings: 'Settings', saves: 'Saves', status: 'Build Status' };
    this.tabs = tabs; this.tab = tab;
    this.e.panel.classList.add('on'); this.e.pause.classList.remove('on');
    this.e.tabs.innerHTML = '';
    for (const t of tabs) {
      const b = document.createElement('button'); b.textContent = names[t]; if (t === tab) b.className = 'on';
      b.onclick = () => { this.g.audio.play('page'); this.openPanel(t, tabs); };
      this.e.tabs.appendChild(b);
    }
    $('#panel-close').style.display = '';
    const body = $('#panel-body'); body.innerHTML = ''; body.scrollTop = 0;
    this['render_' + tab](body);
  }
  get panelOpen() { return this.e.panel.classList.contains('on'); }
  closePanel() {
    if (this.g.state.stage === 'complete' && this.g.mode === 'ui') return;
    this.e.panel.classList.remove('on'); this.g.input.captureNext = null;
    this.g.panelClosed();
  }

  render_journal(body) {
    const g = this.g, st = g.state.quests, ids = Object.keys(st).sort((a, b) => (st[a].status === 'active' ? 0 : 1) - (st[b].status === 'active' ? 0 : 1));
    if (!ids.length) { body.innerHTML = '<h3>Journal</h3><p class="muted">Nothing written yet.</p>'; return; }
    if (!ids.includes(this.sel.quest)) this.sel.quest = ids[0];
    const cur = this.sel.quest, def = QUESTS[cur], q = st[cur];
    body.innerHTML = `<div class="cols"><div class="list">${ids.map((id) => `<button data-id="${id}" class="${id === cur ? 'on' : ''}"><small>${QUESTS[id].kind === 'main' ? 'Main quest' : 'Side quest'} · ${st[id].status === 'done' ? 'complete' : 'active'}</small>${esc(QUESTS[id].title)}</button>`).join('')}</div>
      <div><h3>${esc(def.title)}</h3><p>${esc(def.desc)}</p><h4>Objectives</h4><ul class="steps">${def.steps.map((s, i) => {
        const done = q.status === 'done' || i < q.step, here = q.status === 'active' && i === q.step;
        if (!done && !here) return '';
        return `<li class="${done ? 'done' : 'cur'}">${esc(s.text)}${here && s.count > 1 ? ` (${q.count} / ${s.count})` : ''}</li>`;
      }).join('')}</ul></div></div>`;
    body.querySelectorAll('.list button').forEach((b) => (b.onclick = () => { this.sel.quest = b.dataset.id; this.openPanel('journal', this.tabs); }));
  }
  render_inventory(body) {
    const g = this.g, inv = g.state.inventory, ids = Object.keys(inv).filter((k) => inv[k] > 0);
    if (!ids.length) { body.innerHTML = '<h3>Inventory</h3><p class="muted">Your hands are empty.</p>'; return; }
    if (!ids.includes(this.sel.item)) this.sel.item = ids[0];
    const cur = this.sel.item, it = ITEMS[cur] || { name: cur, desc: '', cat: '' };
    const weapon = cur === 'bow' || cur === 'woodsword';
    body.innerHTML = `<div class="cols"><div class="list">${ids.map((id) => `<button data-id="${id}" class="${id === cur ? 'on' : ''}"><span class="n">${inv[id]}</span><small>${esc(ITEMS[id]?.cat || '')}</small>${esc(ITEMS[id]?.name || id)}</button>`).join('')}</div>
      <div><h3>${esc(it.name)}</h3><p class="muted">${esc(it.cat)} · carried: ${inv[cur]}</p><p>${esc(it.desc)}</p>${weapon ? `<button class="btn" id="eq">${g.player.equipped === cur ? 'Put away' : 'Equip'}</button>` : ''}</div></div>`;
    body.querySelectorAll('.list button').forEach((b) => (b.onclick = () => { this.sel.item = b.dataset.id; this.openPanel('inventory', this.tabs); }));
    const eq = body.querySelector('#eq'); if (eq) eq.onclick = () => { g.player.equip(g.player.equipped === cur ? 'none' : cur); this.openPanel('inventory', this.tabs); };
  }
  buildMap() {
    const T = 512, c = document.createElement('canvas'); c.width = c.height = T;
    const x2 = c.getContext('2d'); x2.drawImage(this.g.world.terrain.albedoCanvas, 0, 0, T, T);
    const img = x2.getImageData(0, 0, T, T), d = img.data;
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const x = -HALF + ((i + 0.5) / T) * SIZE, z = -HALF + ((j + 0.5) / T) * SIZE, h = heightAt(x, z), o = (j * T + i) * 4;
      const river = Math.abs(x - riverX(z)) < 8 && z < 205 && h < riverSurfaceY(z);
      if (h < 0.03 || river) { const k = Math.max(0, Math.min(1, -h / 8)); d[o] = 62 - k * 30; d[o + 1] = 98 - k * 40; d[o + 2] = 118 - k * 36; }
      else { const s = 0.82 + Math.min(0.3, h / 160); d[o] = d[o] * s + 30; d[o + 1] = d[o + 1] * s + 24; d[o + 2] = d[o + 2] * s + 12; }
    }
    x2.putImageData(img, 0, 0);
    return c;
  }
  render_map(body) {
    const g = this.g;
    if (!this.mapBase) this.mapBase = this.buildMap();
    body.innerHTML = `<div id="map-wrap"><canvas width="840" height="840"></canvas></div><p class="muted" style="text-align:center">The Hrafnvik valley · click to set or clear a waypoint · north is up</p>`;
    const cv = body.querySelector('canvas'), x = cv.getContext('2d'), S = 840, wx = (v) => ((v + HALF) / SIZE) * S;
    const draw = () => {
      x.drawImage(this.mapBase, 0, 0, S, S);
      x.fillStyle = 'rgba(46,34,20,0.16)'; x.fillRect(0, 0, S, S);
      x.textAlign = 'center'; x.font = 'italic 15px Georgia'; x.lineWidth = 3;
      for (const k in POI) {
        const p = POI[k]; if (!p.name) continue;
        x.fillStyle = '#2a1c12'; x.beginPath(); x.arc(wx(p.x), wx(p.z), 3.2, 0, 6.3); x.fill();
        x.strokeStyle = 'rgba(236,224,196,0.85)'; x.strokeText(p.name, wx(p.x), wx(p.z) - 8); x.fillText(p.name, wx(p.x), wx(p.z) - 8);
      }
      x.font = '600 24px Georgia'; x.fillStyle = '#3a1c14'; x.strokeText('HRAFNVIK', wx(8), wx(36)); x.fillText('HRAFNVIK', wx(8), wx(36));
      x.font = 'italic 17px Georgia'; x.fillStyle = '#1e3a4c'; x.strokeText('Hrafnfjord', wx(0), wx(240)); x.fillText('Hrafnfjord', wx(0), wx(240));
      const tr = g.quests.tracked()[0], mk = tr ? g.story.markerFor(tr.step) : null;
      if (mk) { x.save(); x.translate(wx(mk.x), wx(mk.z)); x.rotate(Math.PI / 4); x.fillStyle = '#e9c668'; x.strokeStyle = '#2a1c12'; x.lineWidth = 2; x.fillRect(-7, -7, 14, 14); x.strokeRect(-7, -7, 14, 14); x.restore(); }
      const wp = g.state.waypoint;
      if (wp) { x.fillStyle = '#b9d2e2'; x.strokeStyle = '#16242e'; x.lineWidth = 2; x.beginPath(); x.moveTo(wx(wp.x), wx(wp.z)); x.lineTo(wx(wp.x) - 8, wx(wp.z) - 18); x.lineTo(wx(wp.x) + 8, wx(wp.z) - 18); x.closePath(); x.fill(); x.stroke(); }
      const p = g.player; x.save(); x.translate(wx(p.pos.x), wx(p.pos.z)); x.rotate(-p.yaw + Math.PI);
      x.fillStyle = '#8f2f24'; x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -12); x.lineTo(8, 9); x.lineTo(0, 4); x.lineTo(-8, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
    };
    draw();
    cv.onclick = (ev) => {
      const r = cv.getBoundingClientRect(), mx = ((ev.clientX - r.left) / r.width) * SIZE - HALF, mz = ((ev.clientY - r.top) / r.height) * SIZE - HALF;
      const wp = g.state.waypoint;
      g.state.waypoint = wp && Math.hypot(wp.x - mx, wp.z - mz) < 18 ? null : { x: mx, z: mz };
      g.audio.play('ui'); draw();
    };
  }
  render_saga(body) {
    const st = this.g.state, max = Math.max(4, ...Object.values(st.traits));
    const relName = { ragnar: 'Ragnar, your father', ylva: 'Ylva, your mother' };
    body.innerHTML = `<h3>Eirik Ravensson</h3><p class="muted">Nine winters old · son of Ragnar and Ylva of Hrafnvik · ${fmtTime(st.playtime)} played · ${st.xp} renown</p>
      <h4>Who he is becoming</h4>${Object.keys(TRAITS).map((k) => `<div class="trait"><span>${TRAITS[k]}</span><div class="tb"><i style="width:${(st.traits[k] / max) * 100}%"></i></div><span>${st.traits[k]}</span></div>`).join('')}
      <p class="muted">Traits grow from the choices you make. In later acts they shape how companions, jarls and your own family see you, and which endings stay open.</p>
      <h4>Bonds</h4>${Object.keys(relName).map((k) => `<div class="trait"><span style="grid-column:1/3">${relName[k]}</span><span>${st.rel[k] > 0 ? '+' + st.rel[k] : st.rel[k]}</span></div>`).join('')}
      <h4>Words spoken</h4>${st.choices.length ? `<ul class="steps">${st.choices.map((c) => `<li class="done" style="text-decoration:none">${esc(c.pick)}</li>`).join('')}</ul>` : '<p class="muted">No choices made yet.</p>'}
      <h4>Skill trees <span class="tag plan">planned · unlock in Act II</span></h4>
      <div class="trees"><div><b>Berserker</b>Aggression, rage, raw damage.</div><div><b>Shieldmaster</b>Blocking, parries, counters.</div><div><b>Hunter</b>Archery, stealth, tracking.</div><div><b>Warlord</b>Leadership and battlefield orders.</div><div><b>Wayfarer</b>Endurance, sailing, exploration.</div></div>`;
  }
  render_settings(body) {
    const g = this.g, s = g.settings;
    const row = (label, html) => `<label>${label}</label><div>${html}</div>`;
    const range = (k, min, max, step) => `<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}">`;
    const check = (k) => `<input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}>`;
    const select = (k, opts) => `<select data-k="${k}">${opts.map(([v, t]) => `<option value="${v}" ${s[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    body.innerHTML = `<h3>Settings</h3><h4>Game</h4><div class="set">
      ${row('Difficulty', select('difficulty', [['easy', 'Skald (forgiving)'], ['normal', 'Warrior (standard)'], ['hard', 'Jarl (demanding)']]))}
      ${row('Objective markers', check('objectiveMarkers'))}${row('Subtitles', check('subtitles'))}${row('Subtitle size', range('subtitleSize', 0.8, 1.6, 0.1))}${row('Camera shake', check('cameraShake'))}</div>
      <h4>Camera</h4><div class="set">${row('Look sensitivity', range('sensitivity', 0.3, 2.5, 0.1))}${row('Invert vertical look', check('invertY'))}</div>
      <h4>Graphics</h4><div class="set">${row('Quality', select('quality', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]))}<span></span><span class="muted">Grass density applies after reloading the game.</span></div>
      <h4>Audio</h4><div class="set">${row('Master volume', range('volMaster', 0, 1, 0.05))}${row('Music', range('volMusic', 0, 1, 0.05))}${row('Effects', range('volSfx', 0, 1, 0.05))}</div>
      <h4>Controls <span class="muted">· click a key to rebind · gamepad is supported with a fixed layout</span></h4><div class="keys">${Object.keys(ACTION_LABELS).map((a) => `<div><span>${ACTION_LABELS[a]}</span><button data-a="${a}">${esc(codeLabel(g.input.bindings[a][0]))}</button></div>`).join('')}</div>
      <p><button class="btn" id="reset">Restore defaults</button></p>`;
    body.querySelectorAll('[data-k]').forEach((inp) => (inp.oninput = inp.onchange = () => {
      const k = inp.dataset.k; s[k] = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' ? parseFloat(inp.value) : inp.value;
      saveSettings(s); g.applySettings();
    }));
    body.querySelectorAll('.keys button').forEach((b) => (b.onclick = () => {
      b.textContent = 'press…'; b.classList.add('wait');
      g.input.captureNext = (code) => {
        if (code !== 'Escape') { g.input.bindings[b.dataset.a] = [code, ...g.input.bindings[b.dataset.a].filter((c) => c.startsWith('Pad'))]; s.bindings = g.input.bindings; saveSettings(s); }
        this.openPanel('settings', this.tabs);
      };
    }));
    body.querySelector('#reset').onclick = () => { Object.assign(s, DEFAULT_SETTINGS, { bindings: null }); g.input.bindings = structuredClone(DEFAULT_BINDINGS); saveSettings(s); g.applySettings(); this.openPanel('settings', this.tabs); };
  }
  render_saves(body) {
    const g = this.g, inGame = g.started && g.state.stage !== 'complete';
    const names = { auto: 'Autosave', slot1: 'Slot I', slot2: 'Slot II', slot3: 'Slot III' };
    body.innerHTML = `<h3>Saves</h3><p class="muted">The game autosaves at every new objective. Manual saves record your position during the day; at night they resume from the last checkpoint.</p>` +
      listSaves().map(({ slot, save }) => `<div class="slot"><div class="info"><b>${names[slot]}</b><span>${save ? `${esc(save.meta.quest)} — ${esc(save.meta.step)} · ${fmtTime(save.meta.playtime)} played · ${new Date(save.at).toLocaleString()}` : 'Empty'}</span></div>
        ${slot !== 'auto' ? `<button class="btn" data-save="${slot}" ${inGame ? '' : 'disabled'}>Save</button>` : ''}<button class="btn" data-load="${slot}" ${save ? '' : 'disabled'}>Load</button><button class="btn danger" data-del="${slot}" ${save ? '' : 'disabled'}>Delete</button></div>`).join('');
    body.querySelectorAll('[data-save]').forEach((b) => (b.onclick = () => { g.saveGame(b.dataset.save); this.toast('Game saved'); this.openPanel('saves', this.tabs); }));
    body.querySelectorAll('[data-load]').forEach((b) => (b.onclick = () => g.loadGame(b.dataset.load)));
    body.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { deleteSave(b.dataset.del); this.openPanel('saves', this.tabs); }));
  }
  render_status(body) {
    body.innerHTML = `<h3>Build status — vertical slice 0.1</h3>
      <p>This is the first playable chapter of a long project, not the finished game. Everything on screen is generated in code; characters, props and sound are placeholders awaiting real assets.</p>
      <div class="status-grid">
      <div><h4><span class="tag ok">playable</span></h4><ul><li>Act I, Chapter 1: a full day in Hrafnvik and the night raid (about 30–45 minutes)</li><li>Third-person movement, camera, stamina, crouch, dodge</li><li>Dialogue with choices, traits and bonds</li><li>Quests, journal, objective tracker, map with waypoint</li><li>Woodcutting, bow hunting, tracking, fishing, fire-making</li><li>Sparring tutorial: strike, block, parry, dodge</li><li>Stealth escape with raider sight and hearing</li><li>Cold and warmth survival</li><li>Day/night sky, snow, fire, in-engine cutscenes</li><li>Save / load, autosave, settings, key rebinding, gamepad</li></ul></div>
      <div><h4><span class="tag proto">prototype</span></h4><ul><li>Procedural characters and animation (to be replaced by rigged models)</li><li>Procedural audio and score</li><li>Villager routines (posts and an evening change, not full schedules)</li><li>Wildlife AI: hares, deer, sheep, ravens</li><li>Melee combat core (used only for sparring so far)</li><li>Higgsfield asset client (built, waiting on a valid key ID and secret)</li></ul></div>
      <div><h4><span class="tag plan">planned</span></h4><ul><li>Acts I ch.2 – VII (see docs/ROADMAP.md and data/missions.json)</li><li>Adult Eirik, nine weapon classes, five skill trees</li><li>Enemy combat AI, bosses, mounted and naval combat</li><li>Sailing, settlement, factions, trading, crafting</li><li>50 side missions and tavern games</li><li>Building interiors, voiced dialogue, real music</li><li>Unreal Engine 5 port for photoreal fidelity</li></ul></div></div>`;
  }
  showChapterEnd() {
    const st = this.g.state, body = $('#panel-body');
    this.e.hud.classList.add('hidden'); this.e.panel.classList.add('on'); this.e.tabs.innerHTML = '<button class="on">Chapter One Complete</button>';
    $('#panel-close').style.display = 'none';
    const top = Object.keys(TRAITS).sort((a, b) => st.traits[b] - st.traits[a])[0];
    body.innerHTML = `<h3>The Night of Ashes</h3><p>Eirik Ravensson, nine winters old, is alone in the frozen forest with his father's axe.</p>
      <h4>Your Eirik</h4><p>Time played: ${fmtTime(st.playtime)} · Renown: ${st.xp} · Strongest trait: <b>${TRAITS[top]}</b></p>
      ${Object.keys(TRAITS).map((k) => `<div class="trait"><span>${TRAITS[k]}</span><div class="tb"><i style="width:${(st.traits[k] / Math.max(4, ...Object.values(st.traits))) * 100}%"></i></div><span>${st.traits[k]}</span></div>`).join('')}
      <ul class="steps">${st.choices.map((c) => `<li class="done" style="text-decoration:none">${esc(c.pick)}</li>`).join('')}</ul>
      <h4>Next <span class="tag plan">planned</span></h4><p>Chapter Two, “The Long White”: survive the wilderness alone with what your father taught you, until a farming family finds you near death. Then ten years pass.</p>
      <p class="muted">These choices are saved. They are designed to carry into Act II, where Eirik's traits begin to shape how others treat him.</p>
      <p><button class="btn" id="tomenu">Return to main menu</button></p>`;
    body.querySelector('#tomenu').onclick = () => this.g.quitToMenu();
  }
}
