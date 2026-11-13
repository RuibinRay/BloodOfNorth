// HUD, dialogue box, menus and panels (DOM overlay on top of the WebGL canvas).
import * as THREE from 'three';
import { codeLabel, ACTION_LABELS, DEFAULT_BINDINGS } from '../core/input.js';
import { listSaves, saveSettings, deleteSave, latestSave, DEFAULT_SETTINGS } from '../core/save.js';
import { ITEMS, QUESTS } from '../data/act1.js';
import { ACTS } from '../data/chapters.js';
import { COMPANIONS, available, absent } from '../data/companions.js';
import { portraitFor, portraitOf, itemArt, actArt, actArtAt, titleArt, parchment, compass, chapterArt } from './art.js';
import { SECRETS } from '../data/act1_ch3.js';
import { TREES, POINT_EVERY } from '../systems/skills.js';
import { POI, ISLES, DISTRICT_LINE, GREAT, MAIN, PLACES } from '../world/layout.js';
import { mainAt } from '../world/realm.js';
import { icon, itemIcon, questIcon, ARTS } from './icons.js';
import { heightAt, riverX, riverSurfaceY, SIZE, HALF } from '../world/terrain.js';
/** The part of the world the sea chart shows: from the landing beach south to the edge of the chart. */
const SEA_VIEW = { x0: -640, z0: 160, w: 1280, h: 1440 };
/** The whole open sea: the home waters in the north, the five great islands round and beyond them. */
const REALM_VIEW = { x0: -1960, z0: 140, w: 3920, h: 3480 };
const TOWN_LABELS = { hunt: { camp: 'The camp', tannery: 'Tannery yard', harbor: 'Harbor', mews: 'Mews' }, wessex: { quay: 'Quay', market: 'Market', church: 'Church', hall: "The reeve's hall", farm: 'Farm', wall: 'Harbor wall' }, hedeby: { h1: 'First headland', h2: 'Second headland', h3: 'Third headland', beach: 'Beach' }, bjornstead: { hall: "Bjorn's hall", thing: 'Thing stones', birch: 'The old birch', pier: 'Harbour', smithy: 'Smithy', field: 'Barley', pasture: 'Pasture', bridge: 'Bridge', timber: 'Timber' }, kaupang: { quay: 'Quay', market: 'Market', pen: 'Thrall pen', tavern: 'Tavern', thing: 'Thing', skerry: 'The Skerries' } };

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
    this.bars = { health: $('#bar-health i'), stamina: $('#bar-stamina i'), warmth: $('#bar-warmth i'), warmthWrap: $('#bar-warmth'), hunger: $('#bar-hunger i'), hungerWrap: $('#bar-hunger'), ice: $('#bar-ice i'), iceWrap: $('#bar-ice'), ward: $('#bar-ward i'), wardWrap: $('#bar-ward') };
    this.subT = 0; this.fadeS = null; this.fadeV = 0; this.cardS = null; this.tab = 'journal'; this.returnTo = null; this.sel = {};
    this.compass = CARD.map(([t, b]) => { const s = document.createElement('span'); s.textContent = t; if (t.length > 1) s.className = 'minor'; this.e.compass.appendChild(s); return { s, b }; });
    this.objSpan = document.createElement('span'); this.objSpan.className = 'obj'; this.objSpan.textContent = '◆'; this.e.compass.appendChild(this.objSpan);
    this.waySpan = document.createElement('span'); this.waySpan.className = 'way'; this.waySpan.textContent = '▾'; this.e.compass.appendChild(this.waySpan);
    $('#panel-close').onclick = () => this.closePanel();
    this.applySettings(); this.applyArt();

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
  /** The paintings that are part of the page itself: behind the loading screen, and vellum under every panel and the map. */
  applyArt() {
    const t = titleArt(), pm = parchment(), ld = document.getElementById('loading');
    if (t && ld) ld.style.backgroundImage = `linear-gradient(rgba(8,7,6,0.55), rgba(8,7,6,0.8)), url("${t}")`;
    if (pm) { document.documentElement.style.setProperty('--vellum', `url("${pm}")`); this.parch = new Image(); this.parch.src = pm; }
    if (compass()) { this.rose = new Image(); this.rose.src = compass(); }
  }

  // ---- small HUD pieces ---------------------------------------------------------------
  keys(text) { return esc(text).replace(/\{(\w+)\}/g, (_, a) => `<kbd>${esc(this.g.input.label(a))}</kbd>`); }
  /** A flash round the edge of the screen: red when he is hurt, blue-white when the Stormguard answers. */
  pulse(kind, k = 1) { const e = this.e.pulse || (this.e.pulse = document.getElementById('pulse')); if (!e) return; e.className = ''; void e.offsetWidth; e.style.setProperty('--k', k.toFixed(2)); e.className = kind + ' on'; }
  /** The arrow struck: a mark on the crosshair (heavier for a kill or a head). */
  hitMark(kind = '') { const e = this.e.crosshair; e.classList.remove('hit', 'kill', 'head'); void e.offsetWidth; e.classList.add('hit'); if (kind) e.classList.add(kind); clearTimeout(this._hm); this._hm = setTimeout(() => e.classList.remove('hit', 'kill', 'head'), 380); }
  /** What the story asks of the player now. It stays until the story changes or clears it. */
  hint(text) { this.storyHint = text || null; this.drawHint(); }
  /** A one-time lesson (lock-on, a red flash, the Stormguard...): it sits under the story's hint for a while instead of
   *  replacing it, so a lesson that fires mid-fight can never wipe out what the fight needs (Eydis's raven, the ledge). */
  tip(text, sec = Math.max(10, 4 + text.length * 0.05)) { this.tipText = text; this.tipT = sec; this.drawHint(); } // long enough to read
  drawHint() {
    const h = this.e.hint, s = this.storyHint, t = this.tipT > 0 ? this.tipText : null;
    if (!s && !t) { h.classList.remove('on'); return; }
    h.innerHTML = (s ? this.keys(s) : '') + (t ? `<div class="tip${s ? '' : ' alone'}">${this.keys(t)}</div>` : ''); h.classList.add('on');
  }
  toast(text) {
    const d = document.createElement('div'); d.textContent = text; this.e.toasts.appendChild(d);
    while (this.e.toasts.children.length > 5) this.e.toasts.firstChild.remove();
    setTimeout(() => d.remove(), 3500);
  }
  /** Find the speaker by name and have their mouth follow the words. */
  mouth(speaker, text) {
    const g = this.g;
    if (!speaker || !g.player) return;
    const who = speaker === 'Eirik' ? g.player : [...g.npcs.values()].find((n) => n.visible && !n.dead && n.name === speaker);
    if (who && who.h) who.h.say(text);
  }
  subtitle(speaker, text, dur = 3) {
    this.mouth(speaker, text); // whoever says it, says it with their mouth
    if (!this.g.settings.subtitles) return;
    const s = this.e.subtitle;
    s.innerHTML = speaker ? `<b>${esc(speaker)}:</b> ${esc(text)}` : esc(text);
    s.classList.toggle('narr', !speaker); s.classList.add('on'); this.subT = dur;
  }
  questBanner(small, title) {
    const b = this.e.banner; b.querySelector('small').textContent = small; b.querySelector('b').textContent = title;
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  }
  /** A blow is coming. red: it cannot be blocked (dodge it, or turn it with the ward). */
  alert(red = false) { const a = this.e.alert; a.classList.remove('on'); a.classList.toggle('red', red); void a.offsetWidth; a.classList.add('on'); this.g.audio.play('ui', { vol: 0.8 }); }
  /** The white raven calls: something is coming from where he is not looking. side: 'l' | 'r' | 'b' */
  warn(side) { const w = document.getElementById('warn'); w.className = side; void w.offsetWidth; w.classList.add('on'); }
  setDetection(v) {
    const d = this.e.detect;
    if (v < 0) { d.classList.remove('on'); return; }
    d.classList.add('on'); d.classList.toggle('hot', v >= 1);
    d.style.setProperty('--aware', Math.min(100, v * 100) + '%');
    d.querySelector('span').textContent = v >= 1 ? 'Spotted!' : v > 0.45 ? 'Suspicious' : 'Hidden';
  }
  /** Hold the screen partly dark (exhaustion). Ignored while a real fade is running. */
  dim(k) { if (!this.fadeS) { this.fadeV = k; this.e.fade.style.opacity = k; } }
  /** Banner and key help while flying the white raven. */
  ravenHUD(on, name = '') {
    const h = document.getElementById('ravenhud');
    h.classList.toggle('on', on); this.e.sense.style.boxShadow = on ? 'inset 0 0 220px rgba(20,30,40,0.55)' : '';
    if (on) h.innerHTML = `<b>Raven's Eye · ${esc(name)}</b><span>${this.keys('{forward} faster · {back} slower · {left}{right} / mouse turn · {dodge} climb · {crouch} dive · {raven} return')}</span><em></em>`;
  }
  ravenPrompt(label) {
    const e = document.querySelector('#ravenhud em'); if (!e) return;
    const html = label ? `<kbd>${esc(this.g.input.label('interact'))}</kbd> Mark ${esc(label)}` : '';
    if (this._rp !== html) { this._rp = html; e.innerHTML = html; }
  }
  /** District, standing and wolf-marks (open world). */
  setLaw(l) {
    const e = document.getElementById('law'), key = l ? `${l.district}|${l.tier}|${l.marks}|${l.extra || ''}` : '';
    if (this._law === key) return;
    this._law = key; e.classList.toggle('on', !!l);
    if (l) e.innerHTML = `<span>${esc(l.district)} · <b>${esc(l.tier)}</b></span><div class="wm">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= l.marks ? 'on' : ''}"></i>`).join('')}</div>${l.marks ? `<em>${esc(l.name)}</em>` : ''}${l.extra ? `<small>${esc(l.extra)}</small>` : ''}`;
  }
  /** The opponent Eirik is facing: name, health, and guard. */
  setTarget(t) {
    const e = document.getElementById('target');
    e.classList.toggle('on', !!t);
    if (!t) return;
    if (this._tn !== t.name) { this._tn = t.name; e.querySelector('b').textContent = t.name; }
    e.querySelector('.hp i').style.width = Math.max(0, t.hp) * 100 + '%';
    e.querySelector('.gd i').style.width = Math.min(1, t.posture) * 100 + '%';
    e.classList.toggle('broken', !!t.broken);
    if (this._ts !== (t.skill || '')) { this._ts = t.skill || ''; const k = e.querySelector('em'); k.textContent = this._ts; k.classList.toggle('on', !!this._ts); } // the skill a champion is using, by name
  }
  letterbox(on) { this.e.lb.forEach((l) => l.classList.toggle('on', on)); this.e.hud.classList.toggle('hidden', on); }
  skipHint(k) { this.e.skip.classList.toggle('on', k > 0.02); this.e.skip.style.setProperty('--k', Math.min(1, k)); }
  setHUD(on) { this.e.hud.classList.toggle('hidden', !on); }

  refreshTracker() {
    const list = this.g.quests.tracked();
    this.e.tracker.innerHTML = list.map(({ def, q, step }) => {
      const n = step.count > 1 ? ` <em>${Math.min(q.count, step.count)} / ${step.count}</em>` : '';
      const id = Object.keys(QUESTS).find((k) => QUESTS[k] === def);
      return `<div class="q ${def.kind}"><b>${icon(questIcon(id, def.kind))}${esc(def.title)}</b><span>${esc(this.g.fmt(step.text))}${n}</span></div>`;
    }).join('');
  }

  // ---- dialogue -----------------------------------------------------------------------
  showDialogue(speaker, text, choices, sel = 0) {
    const who = speaker || ''; speaker = this.g.fmt(who); // a raven can speak now: {w} and {b} are their names
    const d = this.e.dialogue; d.classList.add('on');
    d.querySelector('.speaker').textContent = speaker;
    const face = portraitFor(who, this.g), pe = d.querySelector('.portrait'); // the speaker's painted face, when there is one
    if (face !== this._face) { this._face = face; d.classList.toggle('faced', !!face); pe.style.backgroundImage = face ? `url("${face}")` : ''; }
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
      const art = title ? actArt(this.g) : null; // a title stands over the painting of its act; a card of plain words stays on black
      c.classList.toggle('painted', !!art); c.style.backgroundImage = art ? `linear-gradient(rgba(8,7,6,0.5), rgba(8,7,6,0.72)), url("${art}")` : '';
      this.cardS = { t: 0, dur, res, out: false };
    });
  }

  // ---- per-frame ------------------------------------------------------------------------
  update(dt) {
    const g = this.g, p = g.player;
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.e.subtitle.classList.remove('on'); }
    if (this.tipT > 0 && (this.tipT -= dt) <= 0) this.drawHint(); // the lesson has been on long enough: the story's hint stays
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
    // the frame counter (Settings): what the machine is managing, and what it is being asked to draw
    const fe = this.fpsEl || (this.fpsEl = document.getElementById('fps')), showF = !!g.settings.showFps;
    if (showF !== this._showF) { this._showF = showF; fe.classList.toggle('on', showF); }
    if (showF && (this.fpsT = (this.fpsT || 0) + dt) > 0.5) { this.fpsT = 0; fe.textContent = `${Math.round(g.fps)} fps · ${(1000 / Math.max(1, g.fps)).toFixed(1)} ms · ${g.drawn.calls} draws · ${(g.drawn.tris / 1000).toFixed(0)}k triangles · ${Math.round(g.res.scale * 100)}% resolution`; }
    if (g.mode === 'menu' || !p) return;
    this.bars.health.style.width = p.health + '%';
    this.bars.stamina.style.width = p.stamina + '%';
    const ch2 = g.state.stage === 'ch2', cold = g.state.stage === 'wilderness' || ch2, ice = ch2 && g.story.ch2.iceShown;
    this.bars.warmthWrap.classList.toggle('on', cold);
    if (cold) { this.bars.warmth.style.width = p.warmth + '%'; this.bars.warmthWrap.classList.toggle('low', p.warmth < 30); }
    this.bars.hungerWrap.classList.toggle('on', ch2);
    if (ch2) { this.bars.hunger.style.width = p.hunger + '%'; this.bars.hungerWrap.classList.toggle('low', p.hunger < 20); }
    this.bars.iceWrap.classList.toggle('on', ice);
    if (ice) { const k = Math.min(1, g.story.ch2.strain); this.bars.ice.style.width = k * 100 + '%'; this.bars.iceWrap.classList.toggle('low', k > 0.6); }
    const wardOn = !!p.adult && (p.ward > 0 || g.combat.active);
    this.bars.wardWrap.classList.toggle('on', wardOn);
    if (wardOn) { this.bars.ward.style.width = p.ward + '%'; this.bars.wardWrap.classList.toggle('ready', p.canGuard()); this.bars.wardWrap.classList.toggle('angry', !p.calm()); this.bars.wardWrap.classList.toggle('lit', p.breakT > 0); }
    const lk = p.lock, le = this.lockEl || (this.lockEl = document.getElementById('lock')); // the lock mark rides on the man's chest
    if (lk && !lk.dead) { const cv = g.renderer.domElement; _v.set(lk.pos.x, lk.pos.y + lk.h.headHeight() * 0.72, lk.pos.z).project(g.camera); le.classList.toggle('on', _v.z < 1); le.style.translate = `${((_v.x * 0.5 + 0.5) * cv.clientWidth).toFixed(1)}px ${((-_v.y * 0.5 + 0.5) * cv.clientHeight).toFixed(1)}px`; } else le.classList.remove('on');
    // the storm skills along the bottom: lit when they can be used now
    const ae = this.artsEl || (this.artsEl = document.getElementById('arts')), showArts = !!p.adult && p.isMelee() && g.mode === 'play';
    const ak = showArts ? ARTS.map(([id, , act]) => (id === 'guard' ? (p.canGuard() ? 'r' : p.calm() ? 'd' : 'a') : !g.skills.has(id) ? 'x' : p.stormDead || p.ward < g.skills.def(id).storm || (p.cd[{ st_smash: 'smash', st_step: 'step', st_cry: 'cry' }[id]] || 0) > 0 || (id === 'st_break' && p.breakT > 0) ? 'd' : 'r') + g.input.label(act)).join('|') : '';
    if (ak !== this._ak) {
      this._ak = ak; ae.classList.toggle('on', showArts);
      if (showArts) ae.innerHTML = ARTS.map(([id, ic, act], i) => { const st = ak.split('|')[i][0]; return st === 'x' ? '' : `<div class="art ${st === 'r' ? 'ready' : st === 'a' ? 'angry' : ''}" title="${id === 'guard' ? 'Stormguard' : esc(g.skills.def(id).name)}">${icon(ic)}<kbd>${esc(g.input.label(act))}</kbd></div>`; }).join('');
    }
    // the companions with him: their state, and their skills on his keys
    const pl = g.companions ? g.companions.hud() : [], pk = JSON.stringify(pl);
    if (pk !== this._pk) {
      this._pk = pk; const pe = this.partyEl || (this.partyEl = document.getElementById('party'));
      pe.innerHTML = pl.map((m) => `<div class="pm${m.down ? ' down' : m.ready ? ' ready' : ''}${m.armed ? ' armed' : ''}"><div class="top"><b>${esc(m.name)}</b><span class="hp"><i style="width:${m.hp * 100}%"></i></span></div><div class="sk"><kbd>${esc(m.key)}</kbd>${esc(m.skill)}<em>${m.down ? 'down' : m.armed ? 'waiting' : m.cd ? m.cd + ' s' : 'ready'}</em></div></div>`).join('');
    }
    const bl = p.fx.blind > 0; if (bl !== this._bl) { this._bl = bl; g.renderer.domElement.style.filter = bl ? 'brightness(0.3) blur(3px)' : ''; } // mud in his eyes
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
    this.e.crosshair.style.setProperty('--draw', p.draw.toFixed(2)); this.e.crosshair.classList.toggle('full', p.draw >= 1); this.e.crosshair.classList.toggle('empty', g.inventory.count('arrow') <= 0);

    // equipment line
    const inv = g.inventory, parts = [];
    const ml = p.melee(), mn = ml === 'father_axe' ? "Ragnar's axe" : p.adult ? 'Practice blade' : 'Wooden sword';
    if (ml) parts.push(`<kbd>${esc(g.input.label('weapon1'))}</kbd> ${p.equipped === ml ? `<b>${mn}</b>` : mn}`);
    if (g.combat.active && g.ravens.mode === 'follow') parts.push(`<kbd>${esc(g.input.label('harry'))}</kbd> ${esc(g.ravens.names()[1])}${g.combat.harryCd > 0 ? ' ' + Math.ceil(g.combat.harryCd) + 's' : ''}`);
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
      { label: 'Start at an Act', sub: 'All seven acts and the epilogue, or any chapter of them', act: () => this.openPanel('acts', ['acts', 'saves', 'settings', 'status']) },
      { label: 'Load Game', act: () => this.openPanel('saves', ['saves', 'settings', 'status']) },
      { label: 'Settings', act: () => this.openPanel('settings', ['saves', 'settings', 'status']) },
      { label: 'Build Status', sub: 'What is playable, prototype and planned', act: () => this.openPanel('status', ['saves', 'settings', 'status']) },
    ]);
  }
  hideMain() { this.e.menu.classList.remove('on'); this.e.hud.classList.remove('hidden'); }
  showPause() {
    const g = this.g, all = ['journal', 'inventory', 'map', 'saga', 'skills', 'companions', 'looks', 'settings', 'saves', 'status'];
    this.e.pause.classList.add('on');
    this.buttons($('#pause-buttons'), [
      { label: 'Resume', act: () => g.resume() },
      { label: 'Journal', act: () => this.openPanel('journal', all) },
      { label: 'Inventory', act: () => this.openPanel('inventory', all) },
      { label: 'Map', act: () => this.openPanel('map', all) },
      { label: 'Saga', act: () => this.openPanel('saga', all) },
      { label: 'Skills', act: () => this.openPanel('skills', all) },
      { label: 'Companions', act: () => this.openPanel('companions', all) },
      { label: 'Appearance', act: () => this.openPanel('looks', all) },
      { label: 'Settings', act: () => this.openPanel('settings', all) },
      { label: 'Save / Load', act: () => this.openPanel('saves', all) },
      { label: 'Quit to Main Menu', act: () => g.quitToMenu() },
    ]);
  }
  hidePause() { this.e.pause.classList.remove('on'); }

  openPanel(tab, tabs = ['journal', 'inventory', 'map', 'saga', 'skills', 'looks', 'settings', 'saves', 'status']) {
    const names = { journal: 'Journal', inventory: 'Inventory', map: 'Map', saga: 'Saga', skills: 'Skills', companions: 'Companions', looks: 'Appearance', settings: 'Settings', saves: 'Saves', status: 'Build Status', acts: 'Acts' };
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
    if (this.locked) return;
    this.e.panel.classList.remove('on'); this.g.input.captureNext = null;
    this.g.panelClosed();
  }

  render_journal(body) {
    const g = this.g, st = g.state.quests, ids = Object.keys(st).sort((a, b) => (st[a].status === 'active' ? 0 : 1) - (st[b].status === 'active' ? 0 : 1));
    if (!ids.length) { body.innerHTML = '<h3>Journal</h3><p class="muted">Nothing written yet.</p>'; return; }
    if (!ids.includes(this.sel.quest)) this.sel.quest = ids[0];
    const cur = this.sel.quest, def = QUESTS[cur], q = st[cur];
    body.innerHTML = `<div class="cols"><div class="list">${ids.map((id) => `<button data-id="${id}" class="${id === cur ? 'on' : ''}"><small>${QUESTS[id].kind === 'main' ? 'Main quest' : 'Side quest'} · ${st[id].status === 'done' ? 'complete' : 'active'}</small>${icon(questIcon(id, QUESTS[id].kind))}${esc(QUESTS[id].title)}</button>`).join('')}</div>
      <div><h3>${esc(def.title)}</h3><p>${esc(g.fmt(def.desc))}</p><h4>Objectives</h4><ul class="steps">${def.steps.map((s, i) => {
        const done = q.status === 'done' || i < q.step, here = q.status === 'active' && i === q.step;
        if (!done && !here) return '';
        return `<li class="${done ? 'done' : 'cur'}">${esc(g.fmt(s.text))}${here && s.count > 1 ? ` (${q.count} / ${s.count})` : ''}</li>`;
      }).join('')}</ul></div></div>`;
    body.querySelectorAll('.list button').forEach((b) => (b.onclick = () => { this.sel.quest = b.dataset.id; this.openPanel('journal', this.tabs); }));
  }
  render_inventory(body) {
    const g = this.g, inv = g.state.inventory, ids = Object.keys(inv).filter((k) => inv[k] > 0);
    if (!ids.length) { body.innerHTML = '<h3>Inventory</h3><p class="muted">Your hands are empty.</p>'; return; }
    if (!ids.includes(this.sel.item)) this.sel.item = ids[0];
    const cur = this.sel.item, it = ITEMS[cur] || { name: cur, desc: '', cat: '' };
    const weapon = cur === 'bow' || g.player.meleeOwned().includes(cur);
    const pic = (id) => (itemArt(id, g) ? `<img class="pic" src="${itemArt(id, g)}" alt="">` : icon(itemIcon(id, ITEMS[id]?.cat))); // its painting, or the drawn sign
    body.innerHTML = `<div class="cols"><div class="list">${ids.map((id) => `<button data-id="${id}" class="${id === cur ? 'on' : ''}"><span class="n">${inv[id]}</span><small>${esc(ITEMS[id]?.cat || '')}</small>${pic(id)}${esc(ITEMS[id]?.name || id)}</button>`).join('')}</div>
      <div>${itemArt(cur, g) ? `<img class="itemart" src="${itemArt(cur, g)}" alt="">` : ''}<h3>${itemArt(cur, g) ? '' : icon(itemIcon(cur, it.cat), 'big')}${esc(it.name)}</h3><p class="muted">${esc(it.cat)} · carried: ${inv[cur]}</p><p>${esc(it.desc)}</p>${weapon ? `<button class="btn" id="eq">${g.player.equipped === cur ? 'Put away' : 'Equip'}</button>` : ''}</div></div>`;
    body.querySelectorAll('.list button').forEach((b) => (b.onclick = () => { this.sel.item = b.dataset.id; this.openPanel('inventory', this.tabs); }));
    const eq = body.querySelector('#eq'); if (eq) eq.onclick = () => { g.player.equip(g.player.equipped === cur ? 'none' : cur); if (cur !== 'bow' && g.player.equipped === cur) g.state.flags.melee = cur; this.openPanel('inventory', this.tabs); };
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
  /** The sea chart's base: coasts, shallows and depth. Names are drawn on top as islands are found. */
  buildSeaMap(V = SEA_VIEW) {
    const W = V === SEA_VIEW ? 512 : 640, H = Math.round((W * V.h) / V.w), c = document.createElement('canvas'); c.width = W; c.height = H;
    const x2 = c.getContext('2d'), img = x2.createImageData(W, H), d = img.data;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = V.x0 + ((i + 0.5) / W) * V.w, z = V.z0 + ((j + 0.5) / H) * V.h, h = heightAt(x, z), o = (j * W + i) * 4;
      let r, g, b;
      if (h < 0.05) { const k = Math.min(1, -h / 12); r = 164 - k * 58; g = 186 - k * 52; b = 186 - k * 44; if (h > -2.6) { r += 20; g += 16; b += 6; } }
      else if (h < 0.7) { r = 92; g = 74; b = 50; } // the coast, inked
      else { const lit = Math.max(-0.2, Math.min(0.22, (heightAt(x + 6, z + 6) - h) * 0.035)), k = Math.min(1, h / 45); r = (204 - k * 26) * (1 + lit); g = (188 - k * 22) * (1 + lit); b = (146 + k * 8) * (1 + lit); }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    x2.putImageData(img, 0, 0);
    return c;
  }
  render_map(body) {
    const g = this.g, open = g.state.stage === 'open' && g.story.open.built ? g.story.open : null;
    const pp = g.player.pos, town = mainAt(pp.x, pp.z), away = pp.z > 1600 || Math.abs(pp.x) > 640, tname = town && town.id === 'bjornstead' && g.state.quests.q_fifty ? 'Ravenhold' : town ? town.name : '';
    const pick = this.mapPick && (open || town) ? this.mapPick : town ? 'town' : !open ? (away ? 'realm' : 'valley') : away ? 'realm' : pp.z > 300 ? 'sea' : 'valley', local = pick === 'town' && town, realm = pick === 'realm' || (pick === 'town' && !town), sea = pick !== 'valley';
    const V = local ? { x0: town.x - town.half, z0: town.z - town.half, w: town.half * 2, h: town.half * 2 } : realm ? REALM_VIEW : sea ? SEA_VIEW : { x0: -HALF, z0: -HALF, w: SIZE, h: SIZE }, H = 840, W = Math.round((H * V.w) / V.h);
    if (local) { this.townBase ||= {}; this.townBase[town.id] ||= this.buildSeaMap(V); }
    else if (realm) { if (!this.realmBase) this.realmBase = this.buildSeaMap(REALM_VIEW); } else if (sea ? !this.seaBase : !this.mapBase) { if (sea) this.seaBase = this.buildSeaMap(); else this.mapBase = this.buildMap(); }
    const greatSeen = GREAT.filter((s) => open && g.state.open.seen[s.id]).length;
    const named = ISLES.filter((s) => s.name), seen = open ? g.state.open.seen : {}, found = named.filter((s) => seen[s.id]).length;
    body.innerHTML = `${open || town ? `<div class="maptabs">${town ? `<button data-v="town" class="${local ? 'on' : ''}">${tname}</button>` : ''}<button data-v="valley" class="${sea ? '' : 'on'}">Hrafnvik valley</button>${open ? `<button data-v="sea" class="${sea && !realm && !local ? 'on' : ''}">Home waters</button>` : ''}<button data-v="realm" class="${realm ? 'on' : ''}">The ten islands</button></div>` : ''}
      <div id="map-wrap" style="aspect-ratio:${W}/${H};width:min(${Math.round((560 * W) / H)}px,100%)"><canvas width="${W}" height="${H}"></canvas></div>
      <p class="muted" style="text-align:center">${local ? `${tname}, ${town.title}` : realm ? `The ten islands · ${greatSeen} of ${GREAT.length} great islands found · the home waters are the box in the north` : sea ? `The Whale Road · ${found} of ${named.length} islands found` : 'The Hrafnvik valley'} · click to set or clear a waypoint · north is up</p>`;
    body.querySelectorAll('.maptabs button').forEach((b) => { b.onclick = () => { this.mapPick = b.dataset.v; g.audio.play('ui'); this.render_map(body); }; });
    const cv = body.querySelector('canvas'), x = cv.getContext('2d'), X = (v) => ((v - V.x0) / V.w) * W, Z = (v) => ((v - V.z0) / V.h) * H;
    const label = (t, px, pz, dy = -8) => { x.strokeStyle = 'rgba(236,224,196,0.85)'; x.lineWidth = 3; x.strokeText(t, X(px), Z(pz) + dy); x.fillText(t, X(px), Z(pz) + dy); };
    const draw = () => {
      x.drawImage(local ? this.townBase[town.id] : realm ? this.realmBase : sea ? this.seaBase : this.mapBase, 0, 0, W, H);
      x.fillStyle = 'rgba(46,34,20,0.16)'; x.fillRect(0, 0, W, H);
      if (this.parch && this.parch.complete && this.parch.naturalWidth) { x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.7; x.drawImage(this.parch, 0, 0, W, H); x.restore(); } // the chart is drawn on vellum
      if (this.rose && this.rose.complete && this.rose.naturalWidth) { const r = Math.round(W * 0.2); x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.85; x.drawImage(this.rose, W - r - 10, 10, r, r); x.restore(); } // and a rose in its corner
      x.textAlign = 'center'; x.font = 'italic 15px Georgia'; x.lineWidth = 3;
      if (local) {
        x.strokeStyle = 'rgba(96,70,44,0.55)'; x.lineWidth = 2.2; for (const r of town.roads || []) { x.beginPath(); r.forEach(([dx, dz], i) => x[i ? 'lineTo' : 'moveTo'](X(town.x + dx), Z(town.z + dz))); x.stroke(); }
        x.font = 'italic 14px Georgia';
        for (const [k, n] of Object.entries(TOWN_LABELS[town.id])) { const pt = PLACES[town.id][k]; x.fillStyle = '#2a1c12'; x.beginPath(); x.arc(X(town.x + pt[0]), Z(town.z + pt[1]), 3, 0, 6.3); x.fill(); label(n, town.x + pt[0], town.z + pt[1]); }
        x.font = '600 22px Georgia'; x.fillStyle = '#3a1c14'; { const mid = PLACES[town.id].yard || PLACES[town.id].market || PLACES[town.id].h2 || PLACES[town.id].camp; label(tname.toUpperCase(), town.x + mid[0], town.z + mid[1] + 34, 0); }
      } else if (!sea) {
        for (const k in POI) {
          const p = POI[k]; if (!p.name) continue;
          x.fillStyle = '#2a1c12'; x.beginPath(); x.arc(X(p.x), Z(p.z), 3.2, 0, 6.3); x.fill(); label(p.name, p.x, p.z);
        }
        x.font = '600 24px Georgia'; x.fillStyle = '#3a1c14'; label('HRAFNVIK', 8, 36, 0);
        x.font = 'italic 17px Georgia'; x.fillStyle = '#1e3a4c'; label('Hrafnfjord', 0, 240, 0);
      } else if (realm) {
        x.save(); x.setLineDash([6, 6]); x.strokeStyle = 'rgba(42,28,18,0.5)'; x.lineWidth = 1.4; x.strokeRect(X(-640), Z(160), X(640) - X(-640), Z(1600) - Z(160)); x.restore(); // the home waters
        x.font = 'italic 13px Georgia'; x.fillStyle = '#2a1c12';
        for (const [n, px, pz] of [['Gulen', -55, 262], ['Fedje', 210, 600], ['Kinn', -40, 760], ['Skorpa', -230, 1040], ['Vængr', -60, 1260], ['Gannet Rock', 470, 1130]]) label(n, px, pz, 22);
        x.font = '600 15px Georgia'; x.fillStyle = '#3a1c14'; for (const m of MAIN) label(m.name.toUpperCase(), m.x, m.z + (m.id === 'kaupang' ? 0 : 200), m.id === 'kaupang' ? -150 : 46);
        for (const s of GREAT) {
          const k = seen[s.id];
          x.font = k ? '600 17px Georgia' : '600 20px Georgia'; x.fillStyle = k ? '#3a1c14' : 'rgba(42,28,18,0.45)'; label(k ? s.name.toUpperCase() : '?', s.x, s.z + s.half * 0.82, 0);
          if (k) { x.font = 'italic 13px Georgia'; x.fillStyle = '#2a1c12'; label(`${s.title} · ${s.ruler}`, s.x, s.z + s.half * 0.82, 17); }
        }
        const cx = W - 44, cy = 52; x.fillStyle = '#3a1c14'; x.beginPath(); x.moveTo(cx, cy - 26); x.lineTo(cx + 7, cy); x.lineTo(cx, cy + 26); x.lineTo(cx - 7, cy); x.closePath(); x.globalAlpha = 0.55; x.fill(); x.globalAlpha = 1;
        x.font = '600 14px Georgia'; x.fillText('N', cx, cy - 31);
      } else {
        // where one law ends and the next begins
        x.save(); x.setLineDash([9, 7]); x.strokeStyle = 'rgba(96,34,26,0.55)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, Z(DISTRICT_LINE)); x.lineTo(W, Z(DISTRICT_LINE)); x.stroke(); x.restore();
        x.font = '600 13px Georgia'; x.fillStyle = 'rgba(96,34,26,0.8)'; x.textAlign = 'left';
        x.fillText('V E S T L A N D', 12, Z(DISTRICT_LINE) - 8); x.fillText('T H E   S K E R R I E S', 12, Z(DISTRICT_LINE) + 19); x.textAlign = 'center';
        x.font = 'italic 15px Georgia'; x.fillStyle = '#1e3a4c'; label('Hrafnfjord', 0, 372, 0); label('to Hrafnvik', 4, 196, 0);
        x.fillStyle = '#2a1c12'; label('Gulen', POI.gulen.x - 8, POI.gulen.z, 30); label('Bulandet', POI.bulandet.x + 14, POI.bulandet.z, 28);
        for (const s of named) {
          const k = seen[s.id];
          x.font = k ? 'italic 15px Georgia' : '600 17px Georgia'; x.fillStyle = k ? '#2a1c12' : 'rgba(42,28,18,0.45)';
          label(k ? s.name : '?', s.x, s.z + s.r, k ? 12 : 4);
        }
        x.strokeStyle = '#2a1c12'; x.lineWidth = 1.6;
        for (const k in open.sea.ports) { const pt = open.sea.ports[k]; if (k !== 'gulen' && !seen[k]) continue; x.beginPath(); x.arc(X(pt.moor[0]), Z(pt.moor[1]), 4.5, 0, 6.3); x.stroke(); x.beginPath(); x.moveTo(X(pt.moor[0]), Z(pt.moor[1]) - 4.5); x.lineTo(X(pt.moor[0]), Z(pt.moor[1]) + 8); x.stroke(); }
        const cx = W - 44, cy = 52; // compass
        x.fillStyle = '#3a1c14'; x.beginPath(); x.moveTo(cx, cy - 26); x.lineTo(cx + 7, cy); x.lineTo(cx, cy + 26); x.lineTo(cx - 7, cy); x.closePath(); x.globalAlpha = 0.55; x.fill(); x.globalAlpha = 1;
        x.font = '600 14px Georgia'; x.fillText('N', cx, cy - 31);
      }
      if (open && sea) for (const f of open.war.foes) { // a hostile sail, once it is after him or close enough to make out
        if (f.state === 'gone' || f.state === 'sinking' || (f.state === 'patrol' && Math.hypot(f.pos.x - g.player.pos.x, f.pos.z - g.player.pos.z) > 320)) continue;
        x.fillStyle = '#8f2f24'; x.strokeStyle = '#2a1c12'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(X(f.pos.x), Z(f.pos.z), 9, 4.5, 0, 0, 6.3); x.fill(); x.stroke();
      }
      if (open && sea) for (const t of open.fleet.traders) { x.fillStyle = 'rgba(42,28,18,0.6)'; x.beginPath(); x.ellipse(X(t.pos.x), Z(t.pos.z), 6, 3, 0, 0, 6.3); x.fill(); } // traders on the sea lanes
      if (open) for (const [m, col] of [[open.mounts.horse, '#6a4426'], [open.mounts.boat, '#f4efe2'], [open.fleet.owned ? open.mounts.ship : null, '#c9a24a']]) {
        if (!m || open.mounts.on === m || m.aboard) continue;
        x.fillStyle = col; x.strokeStyle = '#2a1c12'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(X(m.pos.x), Z(m.pos.z), m.type === 'ship' ? 10 : m.type === 'boat' ? 7 : 4, m.type === 'ship' ? 5 : 4, 0, 0, 6.3); x.fill(); x.stroke();
      }
      const tr = g.quests.tracked()[0], mk = tr ? g.story.markerFor(tr.step) : null;
      if (mk) { x.save(); x.translate(X(mk.x), Z(mk.z)); x.rotate(Math.PI / 4); x.fillStyle = '#e9c668'; x.strokeStyle = '#2a1c12'; x.lineWidth = 2; x.fillRect(-7, -7, 14, 14); x.strokeRect(-7, -7, 14, 14); x.restore(); }
      for (const k in g.state.marks) { const mk = g.state.marks[k]; x.fillStyle = '#f4efe2'; x.strokeStyle = '#2a1c12'; x.lineWidth = 2; x.beginPath(); x.arc(X(mk.x), Z(mk.z), 5, 0, 6.3); x.fill(); x.stroke(); x.font = 'italic 13px Georgia'; x.fillStyle = '#2a1c12'; label(mk.label, mk.x, mk.z, 18); }
      const wp = g.state.waypoint;
      if (wp) { x.fillStyle = '#b9d2e2'; x.strokeStyle = '#16242e'; x.lineWidth = 2; x.beginPath(); x.moveTo(X(wp.x), Z(wp.z)); x.lineTo(X(wp.x) - 8, Z(wp.z) - 18); x.lineTo(X(wp.x) + 8, Z(wp.z) - 18); x.closePath(); x.fill(); x.stroke(); }
      const p = g.player; x.save(); x.translate(X(p.pos.x), Z(p.pos.z)); x.rotate(-p.yaw + Math.PI);
      x.fillStyle = '#8f2f24'; x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -12); x.lineTo(8, 9); x.lineTo(0, 4); x.lineTo(-8, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
    };
    draw();
    cv.onclick = (ev) => {
      const r = cv.getBoundingClientRect(), mx = V.x0 + ((ev.clientX - r.left) / r.width) * V.w, mz = V.z0 + ((ev.clientY - r.top) / r.height) * V.h;
      const wp = g.state.waypoint;
      g.state.waypoint = wp && Math.hypot(wp.x - mx, wp.z - mz) < V.w / 36 ? null : { x: mx, z: mz };
      g.audio.play('ui'); draw();
    };
  }
  /** Appearance: how the grown Eirik looks. Choices live in state.look and lie over the look the story gives him. */
  render_looks(body) {
    const g = this.g, p = g.player;
    if (!p.adult) { body.innerHTML = '<h3>Appearance</h3><p class="muted">The boy looks as his mother made him. You choose how Eirik looks as a man when he is grown; the lightning scar over his left eye comes the spring he is ten, and is his from then on, from the start.</p>'; return; }
    const own = g.state.look || (g.state.look = {}), base = p.baseLook || {};
    const cur = (k) => (own[k] !== undefined ? own[k] : base[k] !== undefined ? base[k] : null);
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    const chips = (k, opts) => opts.map(([v, t]) => `<button class="chip ${cur(k) === v ? 'on' : ''}" data-k="${k}" data-v="${v === null ? '' : v}" data-t="${typeof v}">${esc(t)}</button>`).join('');
    const dots = (k, cols) => cols.map((c) => `<button class="dot ${cur(k) === c ? 'on' : ''}" data-k="${k}" data-v="${c}" data-t="number" style="background:${hex(c)}" aria-label="${hex(c)}"></button>`).join('');
    const row = (name, html) => `<div class="lrow"><span>${name}</span><div>${html}</div></div>`;
    body.innerHTML = `<h3>Appearance</h3><p class="muted">How Eirik looks as a man. The lightning scar over his left eye stays in every version.</p>
      <div class="looks"><canvas id="mirror" width="340" height="430"></canvas><div class="opts">
      ${row('Hair', chips('hairStyle', [['crop', 'Cropped'], ['short', 'Short'], ['swept', 'Swept back'], ['shoulder', 'To the shoulder'], ['long', 'Long'], ['mane', 'Mane'], ['warrior', 'Long, braided at the temples'], ['tail', 'Tied back'], ['braid', 'One braid'], ['braids', 'Two braids'], ['topknot', 'Topknot'], ['shaved', 'Shaved'], ['bald', 'Bald']]))}
      ${row('Hair colour', dots('hair', [0xd9c27a, 0xa87e45, 0x8a5a2e, 0x5c4028, 0x2c241e, 0x9a4420, 0x9a968e, 0xe6e2da]))}
      ${row('Beard', chips('beard', [[null, 'None'], ['stubble', 'Stubble'], ['short', 'Short'], ['full', 'Full'], ['long', 'Long'], ['forked', 'Forked'], ['braided', 'Braided'], ['goatee', 'Chin']]))}
      ${row('Eyes', dots('eyes', [0x86aec6, 0x8e979c, 0x6f8f5a, 0x8a6a3a, 0x5a4632, 0xb07a2e]))}
      ${row('Face', chips('face', [['even', 'Even'], ['lean', 'Lean'], ['broad', 'Broad'], ['long', 'Long'], ['square', 'Square'], ['heavy', 'Heavy']]))}
      ${row('Nose', chips('nose', [['straight', 'Straight'], ['hooked', 'Hooked'], ['broken', 'Broken'], ['snub', 'Snub'], ['broad', 'Broad']]))}
      ${row('Skin', dots('skin', [0xe8c0a2, 0xdcae8e, 0xc8946e, 0xa87550, 0x7a5236]))}
      ${row('Build', chips('build', [[0.96, 'Lean'], [1.08, 'Strong'], [1.2, 'Heavy']]))}
      ${row('Height', chips('scale', [[0.96, 'Short'], [1.0, 'Middling'], [1.05, 'Tall']]))}
      ${row('Another scar', chips('scar2', [[null, 'None'], ['cheek', 'Cheek'], ['brow', 'Brow'], ['lip', 'Lip']]))}
      ${row('Tunic', dots('tunic', [0x55664a, 0x6a3a2e, 0x2f4a5c, 0x6a5a40, 0x4a4a52, 0x8a7a5a]))}
      ${row('Cloak', chips('cloak', [[null, 'None'], [0x3a3e44, 'Grey'], [0x4a2e22, 'Brown'], [0x2e3e52, 'Blue'], [0x5a2a24, 'Red']]))}
      <div class="lrow"><span></span><div><button class="btn" id="look-reset">As the story has him</button></div></div></div></div>`;
    const apply = () => {
      const eq = p.equipped; p.setLook(p.baseLook, true); p.showBackAxe(g.inventory.has('father_axe') && !g.state.flags.axeHidden && eq !== 'father_axe');
      if (eq && eq !== 'none') { p.equipped = 'none'; p.equip(eq); }
      p.h.snap(); this.render_looks(body);
    };
    body.querySelectorAll('.chip, .dot').forEach((b) => (b.onclick = () => { const k = b.dataset.k, v = b.dataset.v; own[k] = v === '' ? null : b.dataset.t === 'number' ? Number(v) : v; g.audio.play('ui'); apply(); }));
    body.querySelector('#look-reset').onclick = () => { for (const k in own) delete own[k]; g.audio.play('uiBack'); apply(); };
    this.drawMirror(body.querySelector('#mirror'));
  }
  /** A portrait of Eirik as he stands: one frame rendered from in front of him and copied into the panel. */
  drawMirror(cv) {
    const g = this.g, p = g.player, c = g.camera, pos = c.position.clone(), q = c.quaternion.clone(), fov = c.fov, fog = g.scene.fog.density;
    const y = p.pos.y + p.h.headHeight() - 0.16, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    p.h.lookAt(null); p.h.update(0.2); p.h.update(0.2);
    c.position.set(p.pos.x + fx * 1.5 + fz * 0.32, y + 0.08, p.pos.z + fz * 1.5 - fx * 0.32); c.lookAt(p.pos.x, y, p.pos.z); c.fov = 30; c.updateProjectionMatrix(); c.updateMatrixWorld();
    g.scene.fog.density = 0.0004; g.sky.dome.position.copy(c.position); g.renderer.render(g.scene, c);
    const src = g.renderer.domElement, sw = Math.min(src.width, (src.height * cv.width) / cv.height), sh = (sw * cv.height) / cv.width;
    cv.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, cv.width, cv.height);
    c.position.copy(pos); c.quaternion.copy(q); c.fov = fov; c.updateProjectionMatrix(); g.scene.fog.density = fog;
  }
  render_skills(body) {
    const g = this.g, sk = g.skills, xp = g.state.xp, pts = sk.points();
    if (!sk.open()) { body.innerHTML = `<h3>Skills</h3><p class="muted">A boy learns by doing. The five paths open when Eirik is grown, and the renown he earns now (${xp} so far) will count then.</p>`; return; }
    const label = { has: 'learned', locked: 'learn the one above first' };
    body.innerHTML = `<h3>Skills</h3><p class="muted">Renown ${xp} · <b>${pts}</b> skill point${pts === 1 ? '' : 's'} to spend · the next in ${POINT_EVERY - (xp % POINT_EVERY)} renown. Renown comes from quests, islands found, ships taken and enemies felled.</p>
      <div class="trees">${TREES.map((t) => `<div class="tree"><h4>${esc(t.name)}</h4><p class="muted">${esc(t.blurb)}</p>${t.skills.map((k) => {
        const st = sk.state(k.id);
        return `<button class="skill ${st}" data-id="${k.id}" ${st === 'can' ? '' : 'disabled'}><b>${esc(k.name)}</b><span>${k.free && st === 'has' ? 'yours from the lightning' : label[st] || `${k.cost} point${k.cost > 1 ? 's' : ''}`}</span><small>${k.key ? `<i class="key">${esc(g.input.label(k.key))}</i> · ${k.storm} of the storm bar · ` : ''}${esc(k.desc)}</small></button>`;
      }).join('')}</div>`).join('')}</div>`;
    body.querySelectorAll('.skill.can').forEach((b) => (b.onclick = () => { if (sk.learn(b.dataset.id)) this.openPanel('skills', this.tabs); }));
  }
  render_saga(body) {
    const st = this.g.state, max = Math.max(4, ...Object.values(st.traits));
    const relName = { ragnar: 'Ragnar, your father', ylva: 'Ylva, your mother', bjorn: 'Bjorn', signe: 'Signe' };
    body.innerHTML = `<h3>Eirik Ravensson</h3><p class="muted">Nine winters old · son of Ragnar and Ylva of Hrafnvik · ${fmtTime(st.playtime)} played · ${st.xp} renown</p>
      <h4>Who he is becoming</h4>${Object.keys(TRAITS).map((k) => `<div class="trait"><span>${TRAITS[k]}</span><div class="tb"><i style="width:${(st.traits[k] / max) * 100}%"></i></div><span>${st.traits[k]}</span></div>`).join('')}
      <p class="muted">Traits grow from the choices you make. In later acts they shape how companions, jarls and your own family see you, and which endings stay open.</p>
      <h4>Bonds</h4>${Object.keys(relName).map((k) => `<div class="trait"><span style="grid-column:1/3">${relName[k]}</span><span>${(st.rel[k] || 0) > 0 ? '+' + st.rel[k] : st.rel[k] || 0}</span></div>`).join('')}
      <h4>Words spoken</h4>${st.choices.length ? `<ul class="steps">${st.choices.map((c) => `<li class="done" style="text-decoration:none">${esc(c.pick)}</li>`).join('')}</ul>` : '<p class="muted">No choices made yet.</p>'}
      ${st.ravenNames ? `<h4>The ravens</h4><p><b>${esc(st.ravenNames[0])}</b>, white, sees. <b>${esc(st.ravenNames[1])}</b>, black, guards. ${st.flags.spring ? "Press the Raven's Eye key to fly her." : 'Still chicks, in a basket by the fire.'}</p>` : ''}
      ${this.omensHTML()}
      <h4>Skill trees <span class="tag plan">planned · unlock in Act II</span></h4>
      <div class="trees"><div><b>Berserker</b>Aggression, rage, raw damage.</div><div><b>Shieldmaster</b>Blocking, parries, counters.</div><div><b>Hunter</b>Archery, stealth, tracking.</div><div><b>Warlord</b>Leadership and battlefield orders.</div><div><b>Wayfarer</b>Endurance, sailing, exploration.</div></div>`;
  }
  omensHTML() {
    const st = this.g.state, ids = Object.keys(SECRETS), n = ids.filter((k) => st.secrets[k]).length;
    if (!n && !st.quests.q_hearth) return '';
    return `<h4>Omens · ${n} / ${ids.length}</h4><ul class="steps">${ids.map((k) => (st.secrets[k]
      ? `<li class="done" style="text-decoration:none"><b>${esc(SECRETS[k].name)}</b> — waits for you in ${SECRETS[k].returns}: ${esc(SECRETS[k].weapon)}</li>`
      : '<li>An old thing, not yet found</li>')).join('')}</ul>`;
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
      <h4>Camera</h4><div class="set">${row('Camera follows the mouse', check('mouseLook'))}${row('Look sensitivity', range('sensitivity', 0.3, 2.5, 0.1))}${row('Invert vertical look', check('invertY'))}<span></span><span class="muted">With this off the mouse does not turn the view: use the arrow keys or a gamepad stick.</span></div>
      <h4>Graphics</h4><div class="set">${row('Quality', select('quality', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]))}${row('Glow on fire and steel', check('bloom'))}${row('Resolution follows the frame rate', check('autoRes'))}${row('Show frame rate', check('showFps'))}<span></span><span class="muted">Grass density and how far trees keep their full shape apply after reloading the game. With "Resolution follows the frame rate" on, the picture is drawn with fewer pixels whenever frames come slower than fifty a second, and sharpens again when there is room.</span></div>
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
  /** Begin at the opening of any act that is built, with what came before taken as played. */
  render_companions(body) {
    const g = this.g, st = g.state, party = st.party || [], open = st.stage === 'open', key = (a) => esc(g.input.label(a));
    body.innerHTML = `<h3>Companions</h3><p class="muted">${open ? `In the open world two of them can walk with you. Find them by the farm (Ingrid on Jarnøy, Svanhild on Vængr) and ask them along. ${key('call1')} and ${key('call2')} call on the first and second one's skill; ${key('order')} tells them to wait where they stand, or to come with you. If one goes down, help them up, or let Ingrid do it; they are never killed.` : `In the story's battles, the companions the scene puts on the line fight with their own way of fighting, and ${key('call1')} / ${key('call2')} call on their skills (shown over the bottom right while they stand with you). In the open world, two of them can walk with you.`}</p>` +
      Object.entries(COMPANIONS).map(([id, k]) => { const here = available(id, st), mine = party.includes(id);
        return `<div class="slot">${portraitOf(id) ? `<img class="face${here ? '' : ' away'}" src="${portraitOf(id)}" alt="">` : ''}<div class="info"><b>${esc(k.name)}${mine ? ' · with you' : ''}</b><span>${esc(k.who)}</span><span>${esc(k.style)}</span><span><b style="font-size:14px">${esc(k.skill.name)}</b> (every ${k.skill.cd} s): ${esc(k.skill.desc)}</span>${here ? '' : `<span><i>${esc(absent(id, st))}</i></span>`}</div></div>`; }).join('') +
      '<p class="muted">Who they are, what they carry and when they join or leave are the owner\'s story. How they fight, their skills and the numbers are the game\'s.</p>';
  }
  render_acts(body) {
    const g = this.g;
    body.innerHTML = `<h3>Start at an act or a chapter</h3><p class="muted">An act starts at its opening. Open its chapters to start at any one of them. Everything before is taken as played: the quests done, and what Eirik carries and has learned by then. From there the game autosaves as usual, so the autosave will follow what you start. Saves in the three slots are not touched.</p>` +
      ACTS.map((a, ai) => `<div class="slot">${actArtAt(ai) ? `<img class="scene" src="${actArtAt(ai)}" alt="">` : ''}<div class="info"><b>${esc(a.title)}</b><span>${esc(a.text)}</span></div><button class="btn" data-act="${a.quests[0]}">Start</button></div>` +
        `<details class="chapters" data-ai="${ai}"${this.actsOpen === ai ? ' open' : ''}><summary>The ${a.quests.length} chapters</summary><ol>` +
        a.quests.map((id) => `<li>${chapterArt(id) ? `<img class="thumb" loading="lazy" src="${chapterArt(id)}" alt="">` : ''}<span>${esc(QUESTS[id] ? QUESTS[id].title : id)}</span><button class="btn small" data-act="${id}">Play</button></li>`).join('') + '</ol></details>').join('');
    body.querySelectorAll('details.chapters').forEach((d) => d.addEventListener('toggle', () => { if (d.open) { this.actsOpen = +d.dataset.ai; body.querySelectorAll('details.chapters').forEach((o) => { if (o !== d) o.open = false; }); } }));
    body.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => g.startAt(b.dataset.act)));
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
    body.innerHTML = `<h3>Build status — slice 0.29 (the whole story, Acts I to VII and the epilogue; companions; painted portraits, items and scenes; textured world; open-world sandbox)</h3>
      <p>This is the whole of the owner's story, seven acts and the epilogue, not the finished game. It has been checked by scripted playtest, not yet by people playing it through. The world, its figures and the sound are generated in code; the portraits, item pictures, scene paintings and parchment are painted with Higgsfield, and its pictures are worked into the textures of the buildings, the ships, the ground, the shore, the trees, the animals and what people wear and carry; characters, props and sound are placeholders awaiting real assets.</p>
      <div class="status-grid">
      <div><h4><span class="tag ok">playable</span></h4><ul><li>Act I, Chapter 1: a full day in Hrafnvik and the night raid</li><li>Act I, Chapter 2: winter survival, a wolf, trackers and the river ice</li><li>Act I, Chapter 3: Bjornstead, the raven chicks, the axe under the hearthstone, first flight</li><li>The lightning: the storm, the old birch, the scar, the white raven's first words</li><li>Raven's Eye: fly the white raven, mark what she sees</li><li>Five hidden omens that seed later secret weapons</li><li>Act II, all nine chapters as the story tells them: Bjornstead the coastal village, the hunt, the Thing and the feast, Kettil's visit, the raid and the barn, the Hall of Wolves, the peddlers, the walls, Kaupang and the wreck, the arm-ring</li><li>Act III, all eight chapters: Arvid and the collectors, the Thing, Brokk, Astrid and Torvald, Ingrid's hospital, the Battle of Iron Shore, Arne Longshot in the tower, Ulf Two-Blades and the boats, the gift of iron, Storm-Yew</li><li>Act IV, all eight chapters: the treasure voyage, Rurik Shieldsplitter on the deck, Wessex, the Iron Circle, six islands burning, the council of six kings, Hedeby Sound, Driftwood</li><li>Act V, all seven chapters: the assembly and the rebuilding, the winter of hunger and the whale, the tannery yard at Håkon's hunting camp, the ring and Old Thrand, Vængr and Skarde Bear-Maw, Torvald's confession, the feast</li><li>Act VI, all nine chapters: Myrholm and Eydis the Mire, Skalløy and the last forge, Bersi Black-Anvil at the quarry's edge, Brokk's funeral, the judgment of Torvald, the Hall of Wolves, the nine oaths, the wedding, the fleet</li><li>Act VII, all eleven chapters: fire on the water and the ship of archers, Ulf Two-Blades across two burning decks, the Black Shore and the men he goes back for, Kettil at the bend, the pens (played as Torvald, with Star-Fall), Vigdis on the burning bridge, Gorm at the gate, the Hall of Wolves, the Ironwolf in four parts, Hauk's stone, the law-rock at Gulen</li><li>The Epilogue, all three parts: Ravenhold twelve years on, the row of stones, the Thing-Ring, the people the war left, Leif's house (the one building you can walk into), the walk up the hill with Little Brokk, the young raven, the view out to sea</li><li>Rain, a glow on fire and steel, blade trails and impact flashes; a bow that bends and draws, with a perfect-release window; the camera follows the mouse (Settings can switch it off)</li><li>Melee combat: light and heavy blows, block, parry and riposte, dodge, guard-breaking and finishing blows, enemies that take turns and flank, a two-phase captain</li><li>The black raven harries your target; arrows work on men</li><li>Hunger and warmth, shelter, cooking, thin-ice crossing</li><li>Third-person movement, camera, stamina, crouch, dodge</li><li>Dialogue with choices, traits and bonds</li><li>Quests, journal, objective tracker, map with waypoint</li><li>Woodcutting, bow hunting, tracking, fishing, fire-making</li><li>Sparring tutorial: strike, block, parry, dodge</li><li>Stealth escape with raider sight and hearing</li><li>Cold and warmth survival</li><li>Day/night sky, snow, fire, in-engine cutscenes</li><li>Save / load, autosave, settings, key rebinding, gamepad</li></ul></div>
      <div><h4><span class="tag proto">prototype</span></h4><ul><li>Procedural characters and animation (to be replaced by rigged models), now with animated faces, expressions, speech mouths, breathing, cloth and hair sway, foot planting</li><li>Appearance screen for the grown Eirik; the lightning scar</li><li>Directional strikes, sidestep and roll, raven warnings, camera lock, twin blades and war maul</li><li>Stormguard by the story's rules (only when calm; it costs more each time), Thunder Smash and four more storm skills</li><li>The Wolf's Table: the story's seven champions, the two hands and Håkon, each with named skills, fought where the story has them fall. The fights only: the chapters round them are not built</li><li>Five great islands of the story at full scale (Jarnøy, Solvik, Myrholm, Skalløy, Svartøy), with people who work at a task or walk a road and appear round you on dry land</li><li>Raven-Feeder's three reforgings; icons for items, weapons and missions</li><li>Procedural audio and score</li><li>Villager routines (posts and an evening change, not full schedules)</li><li>Wildlife AI: hares, deer, sheep, ravens</li><li>Adult Eirik is the same placeholder rig, scaled up</li><li>Open world sandbox: horse, boat with a sail, a ship to buy and six crew to recruit, a horn that brings them ashore to fight, sea battles (volleys, shields, ramming, boarding across two decks), archers, shield-bearers and berserkers, a shield with a shove, four melee weapons and throwing axes, five skill trees bought with renown, crew who can be wounded, fourteen islands on a sea chart, two law-districts, wolf-mark outlawry (witnesses, hue and cry, bounty-hunters, blood-price, hide-duel), standing up to “my king”, trade, paid passage between harbours, the first secret weapon</li><li>Higgsfield asset client (built, waiting on a valid key ID and secret)</li></ul></div>
      <div><h4><span class="tag plan">planned</span></h4><ul><li>Act I's three missing scenes (Old Hrefna's bones, the stick and the little shield, the seven seats): 3 of the story's 89 missions (data/missions.json)</li><li>Companions who travel and fight at Eirik's side (all six are in their scenes)</li><li>Act I's last chapters moved to the new Bjornstead; the five small home islands enlarged; ships that sail in the story's sea fights</li><li>A longship of your own, fleets, battles of dozens</li><li>The rest of nine weapon classes (four are built)</li><li>Enemy combat AI, bosses, mounted and naval combat</li><li>Sailing, settlement, factions, trading, crafting</li><li>50 side missions and tavern games</li><li>Building interiors, voiced dialogue, real music</li><li>Unreal Engine 5 port for photoreal fidelity</li></ul></div></div>`;
  }
  showChapterEnd() {
    const g = this.g, st = g.state, q = g.quests, body = $('#panel-body');
    const ch = q.isDone('q_lesson') ? 10 : q.isDone('q_crown') ? 9 : q.isDone('q_four') ? 8 : q.isDone('q_feast') ? 7 : q.isDone('q_drift') ? 6 : q.isDone('q_price') ? 5 : q.isDone('q_oath') ? 4 : q.isDone('q_wings') ? 3 : q.isDone('q_ice') ? 2 : 1, i = ch - 1;
    this.locked = true;
    this.e.hud.classList.add('hidden'); this.e.panel.classList.add('on');
    this.e.tabs.innerHTML = `<button class="on">${['Chapter One Complete', 'Chapter Two Complete', 'Act One Complete', 'Act Two Complete', 'Act Three Complete', 'Act Four Complete', 'Act Five Complete', 'Act Six Complete', 'Act Seven Complete', 'The End'][i]}</button>`;
    $('#panel-close').style.display = 'none';
    const top = Object.keys(TRAITS).sort((a, b) => st.traits[b] - st.traits[a])[0], max = Math.max(4, ...Object.values(st.traits));
    const wolf = st.flags.wolfFed ? 'He shared his kill with the wolf.' : st.flags.wolfKilled ? 'He killed the wolf that came for his kill.' : '';
    const named = st.flags.toldName ? 'He told them his true name.' : st.flags.liedName ? 'They know him as Orm.' : 'He gave them only half his name.';
    const vow = st.flags.vowHome ? 'He called the farm home.' : st.flags.vowRemember ? 'He stayed, and swore not to forget.' : st.flags.vowLearn ? 'He asked to be taught everything.' : '';
    const rn = (st.ravenNames || ['Mjöll', 'Sót']).map(esc);
    const summary = [
      "Eirik Ravensson, nine winters old, is alone in the frozen forest with his father's axe.",
      `A farmer named Bjorn found a boy in the snow beyond the river, half frozen, his hand locked around an axe. ${wolf}`,
      `Bjorn and Signe took him in. ${named} ${vow} The axe lies under the hearthstone. ${rn[0]}, white, and ${rn[1]}, black, came out of a fallen nest and never left him.`,
      `At nineteen he lifted the flat stone by the hearth and took up Raven-Feeder against thirty of Håkon's men. He had Kettil Red-Hand on his back in the mud, and turned away from him to bring six children out of a burning barn. Bjornstead voted to stay, and built its walls before the first frost. From Kaupang he brought home a captain, a crew and a ship called the Sea-Raven. Bjorn put a silver ring on his arm. And far to the west, on an island he has only heard of, smoke is rising.`,
      `At twenty he saw a prince of Jarnøy kill one of Håkon's collectors over a fisherman's daughter, and went home to ask his people for help. Fifty came from Ravenhold, and three strangers with them: Brokk, Astrid and Torvald. On the Iron Shore they held a trench, a ditch full of fish guts and a side gate against two hundred. Grjotgard died in the street with Hauk holding him. Arne Longshot fell from the watchtower; Ulf Two-Blades burned three boats full of people and got away while Eirik pulled them out. He turned down gold and asked for iron. Raven-Feeder has Jarnøy iron in her edge, Astrid's bow is called Storm-Yew, and Princess Ingrid has come to Ravenhold. On Svartøy, the Ironwolf has decided to cut the roots.`,
      `At twenty-two he took the Sea-Raven out beside a treasure ship called Fafnir's Bed, and Ari Hauksson with her as ship's boy. Rurik Shieldsplitter boarded her out of the fog, knew the axe, waited for him to stand when he slipped, and died against the mast telling him to ask the grey-cloak where he was the night before the first snow. In Wessex a reeve gave him a silver token and Ingrid sat two nights with a stranger's child. A chest of letters named the Iron Circle. Then smoke, everywhere: six islands burned in a week. Six kings came to Ravenhold and chose a farmer to command them. At Hedeby Sound the third fire burned instead of the second. Ari died on the deck. Torvald was standing on the beach with the torch in his hand, and the axe stopped a finger's width from Ingrid's face. At home the harbor was ash and Bjorn may never walk without a stick. ${rn[0]} asked him if this was home. Not yet.`,
      `At twenty-four he stood in front of Hauk and said he would carry it. He built a tower and a harbor and a ship, and each one cost somebody a winter. He held a blot so that people would boil their water, cut up a whale the size of a longship, and paid a stranger's debt and made it a law that nobody who comes to Ravenhold for shelter can be made a thrall. When ${rn[0]} was taken he went into Håkon's hunting camp through the tannery pits, brought out the raven and eleven prisoners, and let the supply ships sail. Inside the collar of Raven-Feeder was a ring with a crowned raven over three waves, and on Gannet Rock an old man told him whose grandson he is. On Vængr he listened to a lie, lost his temper, got up out of the mud, and waited: Skarde Bear-Maw is dead, the Wing Isle has joined, and Svanhild has come to stay close until he has fixed it. Torvald told him the rest through the bars. There was one night when everyone in Ravenhold was happy. Then a boat rowed in from Myrholm.`,
      `At twenty-six he offered himself as surety for Astrid on Myrholm, waded after a boy who knew the channels, and called ${rn[1]} down into the face of Eydis the Mire. Queen Thora gave him healers, marsh boats and the hidden channels to the back of Svartøy. On Skalløy Brokk told him the truth about his hand, and that night stood in a doorway against Bersi Black-Anvil with a forging hammer. Bersi went over the quarry edge into the sea. Brokk died a little before dawn. Raven-Feeder has sky-iron in her now, and Halvar is master smith of Ravenhold. Torvald knelt and swore on Halfdan's ring. Håkon killed Sigurd Stonehand in his own hall and took everything the Iron Circle owned. Six kings, two jarls and a queen put their hands on the ring, and Bjorn put his on top. Leif married Ingrid and promised to try. Before dawn, the fleet of the nine oaths sailed for Svartøy.`,
      `At twenty-nine he stood at the bow of the Sea-Raven with sixty-two ships round him, having given Star-Fall to the man who lit the wrong fire. Ulf Two-Blades did not run this time: he sat down on the rail, and fell backward into the sea. On the black sand he went back twice for men who were cut off. Kettil Red-Hand knelt in the mud and asked whether killing him would bring them back. No. Torvald broke every lock in the pens, and Astrid held her little brother in the middle of a battlefield. Vigdis Quickblood died on the burning bridge with both blades in her hands; Gorm Stone-Lung fell back against the gate. He went into the hall alone. When the scar went cold and the handle snapped, he stopped attacking, and waited, and turned the way Bjorn taught him to split a log. Eighty-three of four hundred did not come home, and Hauk carved Ari's name on a stone by the shore. Six weeks later, on the law-rock at Gulen, he would not ask anyone to kneel. ${rn[0]} and ${rn[1]} sat on his shoulders, and the whole North called him the Raven King.`,
      `Twelve years later, Ravenhold is the busiest harbor in the North. Torvald sweeps the leaves off Ari's stone every morning, and this spring Hauk brought two cups of ale. Halvar melted the broken oath-ring and King Halfdan's into one ring that lives at Gulen, and the High King swears on it with everyone else. Bjorn is under the old birch with his axe, a ham and a barrel of ale; Signe runs the town. Leif lost two ships at dice, and the Twins hang side by side over his hearth. On the hill, Little Brokk asked what made a great king, and was told: helping people build a life where they don't have to fight for every little thing. ${rn[0]} is gone. A young raven with one white feather said, very faintly, home. Let our children inherit something better than our wars.`,
    ][i];
    const cont = (label) => `<p><button class="btn" id="next">${label}</button> <button class="btn" id="tomenu">Return to main menu</button></p>`;
    const next = [
      `<h4>Next</h4><p>Chapter Two, “The Long White”: keep the fire, find food, and stay ahead of the men who are still looking for you.</p>${cont('Continue to Chapter Two')}`,
      `<h4>Next</h4><p>Chapter Three, “A Stranger's Hearth”: fever, a farm in a hidden dale, and a girl who has found something in a fallen tree.</p>${cont('Continue to Chapter Three')}`,
      `${this.omensHTML()}<h4>Next</h4><p>Act II, “The Farmer's Axe”. Ten winters pass. Eirik is nineteen, the ravens are grown, and somebody is coming along the river road.</p>${cont('Continue to Act II')}`,
      `<h4>Next</h4><p>Act III, “The Wolves of Iron”. In spring the Sea-Raven sails for Jarnøy, the Iron Isle, to trade wool and salted fish for iron.</p><p><button class="btn" id="next">Continue to Act III</button> <button class="btn" id="sandbox">Try the open world (prototype)</button> <button class="btn" id="tomenu">Return to main menu</button></p>`,
      `<h4>Next</h4><p>Act IV, “Blood Across the Sea”. Two quiet years pass. Then a ship arrives from Solvik, the Golden Quay.</p><p><button class="btn" id="next">Continue to Act IV</button> <button class="btn" id="sandbox">Try the open world (prototype)</button> <button class="btn" id="tomenu">Return to main menu</button></p>`,
      `<h4>Next</h4><p>Act V, “The Broken Raven”. Ravenhold calls an assembly. Half the town blames Eirik; the other half says he is the only reason they are alive.</p><p><button class="btn" id="next">Continue to Act V</button> <button class="btn" id="sandbox">Try the open world (prototype)</button> <button class="btn" id="tomenu">Return to main menu</button></p>`,
      `<h4>Next</h4><p>Act VI, “The Nine Oaths”. Myrholm's queen has been accused of murder, her council is tearing itself apart, and another of Håkon's champions is on the island.</p><p><button class="btn" id="next">Continue to Act VI</button> <button class="btn" id="sandbox">Try the open world (prototype)</button> <button class="btn" id="tomenu">Return to main menu</button></p>`,
      `<h4>Next</h4><p>Act VII, “The Raven King”. A grey morning in early spring. Rain falls on dark water. There are sixty-two ships.</p><p><button class="btn" id="next">Continue to Act VII</button> <button class="btn" id="sandbox">Try the open world (prototype)</button> <button class="btn" id="tomenu">Return to main menu</button></p>`,
      `<h4>Next</h4><p>The Epilogue, “The Old Birch”. Twelve years later. Eirik is forty-one.</p><p><button class="btn" id="next">Continue to the Epilogue</button> <button class="btn" id="sandbox">Try the open world (prototype)</button> <button class="btn" id="tomenu">Return to main menu</button></p>`,
      `<h4>The End</h4><p>That is the whole of the owner's story: seven acts and the epilogue, each as the story tells it. What is left is the open world below, which is a sandbox, not a story chapter.</p><p><button class="btn" id="sandbox">Try the open world (prototype)</button> <button class="btn" id="tomenu">Return to main menu</button></p>`,
    ][i];
    body.innerHTML = `<h3>${['The Night of Ashes', 'The Long White', "A Stranger's Hearth", "The Farmer's Axe", 'The Wolves of Iron', 'Blood Across the Sea', 'The Broken Raven', 'The Nine Oaths', 'The Raven King', 'The Old Birch'][i]}</h3><p>${summary}</p>
      <h4>Your Eirik</h4><p>Time played: ${fmtTime(st.playtime)} · Renown: ${st.xp}${i < 3 ? ` · Strongest trait: <b>${TRAITS[top]}</b>` : ''}</p>
      ${i >= 3 ? '' : Object.keys(TRAITS).map((k) => `<div class="trait"><span>${TRAITS[k]}</span><div class="tb"><i style="width:${(st.traits[k] / max) * 100}%"></i></div><span>${st.traits[k]}</span></div>`).join('')}
      ${i >= 3 ? '' : `<ul class="steps">${st.choices.map((c) => `<li class="done" style="text-decoration:none">${esc(c.pick)}</li>`).join('')}</ul>`}${next}`;
    body.querySelector('#tomenu').onclick = () => g.quitToMenu();
    const nx = body.querySelector('#next'); if (nx) nx.onclick = () => [() => g.story.beginChapter2(), () => g.story.beginChapter3(), () => g.story.beginAct2(), () => g.story.beginAct3(), () => g.story.beginAct4(), () => g.story.beginAct5(), () => g.story.beginAct6(), () => g.story.beginAct7(), () => g.story.beginEpilogue()][i]();
    const sb = body.querySelector('#sandbox'); if (sb) sb.onclick = () => g.story.beginOpen();
  }
}
