// Blood of the North — game bootstrap, main loop, modes, save/load.
import * as THREE from 'three';
import { Emitter, damp } from './core/util.js';
import { Input } from './core/input.js';
import { AudioSys } from './core/audio.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { loadSettings, saveSettings, hasSettings, writeSave, readSave } from './core/save.js';
import { initMaterials, shared, cullHazed } from './world/geo.js';
import { World } from './world/world.js';
import { Sky } from './world/sky.js';
import { FX } from './world/fx.js';
import { Player } from './entities/player.js';
import { Humanoid } from './entities/humanoid.js';
import { NPC } from './entities/npc.js';
import { Wildlife } from './entities/wildlife.js';
import { Ravens } from './entities/ravens.js';
import { Quests, Inventory, Dialogue, Cine } from './systems/systems.js';
import { Combat } from './systems/combat.js';
import { Skills } from './systems/skills.js';
import { ITEMS, QUESTS, DIALOGUE } from './data/act1.js';
import { ORDER } from './data/chapters.js';
import { POI } from './world/layout.js';
import { Act1 } from './story/act1.js';
import { Companions } from './systems/companions.js'; // after the story: the companions' looks come from the acts' casts, which need Act I's chapters loaded first
import { UI } from './ui/ui.js';
import { Playtest } from './ui/playtest.js';
import * as I18N from './i18n/i18n.js';

const RUNNING = new Set(['play', 'dialogue', 'cutscene', 'activity']);
const freshState = () => ({
  stage: 'day', time: 8.7, flags: {}, traits: { wisdom: 0, compassion: 0, ferocity: 0, pride: 0 }, rel: { ragnar: 0, ylva: 0 },
  inventory: {}, quests: {}, xp: 0, choices: [], playtime: 0, player: null, waypoint: null,
  secrets: {}, marks: {}, ravenNames: null, alias: null, open: null, skills: {}, look: {},
});
const TRAIT_NAMES = { wisdom: 'Wisdom', compassion: 'Compassion', ferocity: 'Ferocity', pride: 'Pride' };

class Game {
  constructor() {
    this.settings = loadSettings();
    this.events = new Emitter();
    this.state = freshState();
    this.mode = 'menu'; this.started = false; this.timers = []; this.npcs = new Map();
    this.sense = 0; this.interaction = null; this.activity = null; this.baseFov = 58; this.panelFrom = null; this.menuT = 0;
    this.frames = 0; this.fps = 0; this.fpsT = 0;
    this.res = { scale: 1, base: 1, avg: 1 / 60, t: 0, wait: 0, hold: 6, skip: 0 }; // resolution that follows the frame rate
    this.drawn = { calls: 0, tris: 0 };
  }

  async boot() {
    // the language first, so the first words drawn are in it (English loads nothing). A first visit takes the browser's.
    if (!this.settings.lang && !/HeadlessChrome/.test(navigator.userAgent)) { const nl = (navigator.language || '').toLowerCase(); this.settings.lang = nl.startsWith('zh') ? 'zh' : nl.startsWith('es') ? 'es' : 'en'; }
    await I18N.setLang(this.settings.lang || 'en');
    const canvas = document.getElementById('c');
    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = false; // counted per frame in draw(), across every pass
    // A first visit on a machine that draws without a graphics card (software rendering) starts at Low quality.
    // A test browser keeps the defaults, so the checks measure the same game everywhere.
    if (!hasSettings() && !/HeadlessChrome/.test(navigator.userAgent)) {
      const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'), name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)) { this.settings.quality = 'low'; saveSettings(this.settings); }
    }
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.baseFov, innerWidth / innerHeight, 0.15, 2600);
    // Glow: what is brighter than daylight (fire, sparks, lightning, the stroke of a blade) bleeds a little light round itself.
    // It is a second pass over the frame, so it can be switched off in Settings, and is off at Low quality.
    this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.5, 0.55, 1.4); this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.input = new Input(canvas, this.settings);
    this.audio = new AudioSys(this.settings);
    this.ui = new UI(this);
    // let the loading screen paint (with a timer fallback so a background tab still boots)
    await new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 250); });

    initMaterials();
    this.world = new World().build(this.scene, this.settings.quality);
    this.sky = new Sky(this.scene, renderer);
    this.fx = new FX(this.scene, renderer);
    this.wildlife = new Wildlife(this);
    this.player = new Player(this);
    Humanoid.cam = this.camera.position;                       // faces are only drawn near the camera
    Humanoid.ground = (x, z) => this.world.groundAt(x, z);     // feet find the ground
    this.scene.add(this.player.root);
    this.ravens = new Ravens(this);
    this.combat = new Combat(this);
    this.skills = new Skills(this);
    this.companions = new Companions(this);
    this.quests = new Quests(this, QUESTS);
    this.inventory = new Inventory(this, ITEMS);
    this.dialogue = new Dialogue(this, DIALOGUE);
    this.cine = new Cine(this);
    this.story = new Act1(this);
    this.story.init();
    this.playtest = new Playtest(this); // the playtest recorder (0.30): time and falls per step, F8 notes
    this.player.teleport(-26, 70, 1.2);
    this.applySettings();
    this.resize();
    addEventListener('resize', () => this.resize());
    this.input.onLockLost = () => { if (this.mode === 'play' || this.mode === 'activity') this.pause(); };
    this.installDebug();

    // what to do after a deliberate reload (new game / load / checkpoint)
    let boot = null;
    try { boot = sessionStorage.getItem('botn.boot'); sessionStorage.removeItem('botn.boot'); } catch { /* no storage */ }
    this.last = performance.now();
    requestAnimationFrame((t) => this.tick(t));
    if (boot) {
      document.getElementById('loading-text').textContent = I18N.tr('Click or press any key to continue');
      document.getElementById('loading').classList.add('ready');
      const go = () => {
        removeEventListener('pointerdown', go); removeEventListener('keydown', go);
        this.audio.init(); this.ui.hideLoading();
        if (boot === 'new') this.startNewGame(); else this.loadGame(boot.slice(5));
      };
      addEventListener('pointerdown', go); addEventListener('keydown', go);
    } else {
      this.ui.hideLoading(); this.ui.showMain(); this.audio.setMusic('menu');
      const wake = () => { this.audio.init(); removeEventListener('pointerdown', wake); };
      addEventListener('pointerdown', wake);
    }
  }

  // ---- helpers used across systems -----------------------------------------------------
  addNPC(id, def) { const n = new NPC(this, id, def); this.npcs.set(id, n); return n; }
  after(sec, fn) { this.timers.push({ t: sec, fn }); }
  applyFx(fx) {
    if (!fx) return;
    const st = this.state;
    if (fx.trait) for (const k in fx.trait) { st.traits[k] = (st.traits[k] || 0) + fx.trait[k]; this.ui.toast(`${TRAIT_NAMES[k]} grows`); }
    if (fx.rel) for (const k in fx.rel) st.rel[k] = (st.rel[k] || 0) + fx.rel[k];
    if (fx.flag) [].concat(fx.flag).forEach((f) => (st.flags[f] = true));
    if (fx.give) for (const k in fx.give) this.inventory.add(k, fx.give[k]);
    if (fx.quest && !st.quests[fx.quest]) this.quests.start(fx.quest);
    if (fx.state) Object.assign(st, fx.state);
    if (typeof fx.do === 'function') fx.do(); // runtime-built dialogue (open world)
  }
  /** Fill story tokens: {w} white raven, {b} black raven, {n} the name the family uses. */
  fmt(text) {
    if (text == null) return '';
    const [w, b] = this.ravens ? this.ravens.names() : ['Mjöll', 'Sót'], t = I18N.tr;
    return I18N.translated(t(String(text)).replace(/\{w\}/g, t(w)).replace(/\{b\}/g, t(b)).replace(/\{n\}/g, t(this.state.alias || 'Eirik')));
  }
  /** Switch the language (Settings, main menu). Only the setting changes: a saved game is the same in any language. */
  async setLanguage(id) {
    this.settings.lang = id; saveSettings(this.settings);
    await I18N.setLang(id);
  }
  applySettings() {
    const q = this.settings.quality, dpr = window.devicePixelRatio || 1;
    this.res.base = q === 'low' ? 1 : q === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.5);
    if (this.settings.autoRes === false) this.res.scale = 1;
    this.renderer.setPixelRatio(this.res.base * this.res.scale);
    if (this.sky) this.sky.setQuality(q);
    this.audio.applyVolumes(); this.ui.applySettings(); this.resize();
  }
  /** Resolution that follows the frame rate. When frames come slower than fifty a second the picture is drawn with
   *  fewer pixels (down to 55% each way) and stretched to the window; when there is room again it creeps back up.
   *  It falls fast and climbs slowly, and a climb that had to be undone waits longer before it is tried again. */
  adaptRes(dt) {
    const r = this.res;
    if (this.settings.autoRes === false || this.manual || document.hidden || dt > 0.25) return; // a hitch (loading, a hidden tab) is not a slow frame
    if (r.skip > 0) { r.skip--; return; }                                                        // nor are the frames right after a change
    r.avg += (dt - r.avg) * 0.1; r.t += dt; r.wait -= dt;
    if (r.t < 0.6) return;
    r.t = 0;
    const slow = r.avg > 1 / 50, set = (s) => { r.scale = Math.min(1, Math.max(0.55, s)); this.renderer.setPixelRatio(r.base * r.scale); this.resize(); r.skip = 4; };
    if (slow && r.scale > 0.55) { if (r.rose) r.hold = Math.min(60, r.hold * 2); r.rose = false; r.wait = r.hold; set(r.scale - (r.avg > 1 / 35 ? 0.15 : 0.08)); }
    else if (!slow && r.avg < 1 / 57 && r.scale < 1 && r.wait <= 0) { r.rose = true; r.wait = 2.5; set(r.scale + 0.05); }
    else if (!slow && r.wait < -20) { r.rose = false; r.hold = 6; }                              // it has held for a while: forget the last failed climb
  }
  /** Put the frame on the screen: through the glow pass when it is on. */
  draw() {
    this.renderer.info.reset();
    this.world.veg.update(this.camera, this.scene.fog.density); // only the trees, rocks and grass worth drawing from here
    cullHazed(this.camera, this.scene.fog.density);             // and no far island or far town the haze has taken
    if (this.settings.bloom !== false && this.settings.quality !== 'low' && this.composer) {
      const dark = this.sky ? this.sky.isNight : false; // by day only the very brightest things glow; at night a fire lights the air round it
      this.bloom.threshold = dark ? 0.9 : 1.6; this.bloom.strength = dark ? 0.7 : 0.4;
      this.composer.render();
    } else this.renderer.render(this.scene, this.camera);
    this.drawn.calls = this.renderer.info.render.calls; this.drawn.tris = this.renderer.info.render.triangles;
  }
  resize() {
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(innerWidth, innerHeight); }
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    if (this.fx) this.fx.resize(this.renderer.domElement.height);
  }
  setMode(m) {
    this.mode = m;
    const lock = m === 'play' || m === 'activity' || m === 'cutscene';
    this.input.wantLock = lock;
    if (!lock) this.input.unlock();
  }
  findInteraction() {
    const p = this.player.pos;
    let best = null, bd = Infinity;
    for (const n of this.npcs.values()) {
      if (!n.visible || n.dead || !n.talk || n.mode === 'spar' || n.mode === 'crew') continue;
      const d = n.dist(this.player);
      if (d < 2.5 && d < bd) { bd = d; best = { label: n.talkLabel || `Talk to ${n.name}`, use: n.talk }; }
    }
    const it = this.world.nearestInteractable(p);
    if (it) { const q = it.pos ? it.pos() : it, d = Math.hypot(p.x - q.x, p.z - q.z) - it.priority * 0.5; if (d < bd) best = it; }
    return best;
  }
  tryInteract() { if (this.interaction && this.mode === 'play') { const it = this.interaction; this.interaction = null; it.use(); } }

  // ---- game flow -------------------------------------------------------------------------
  startNewGame() {
    if (this.started) { try { sessionStorage.setItem('botn.boot', 'new'); } catch { /* ignore */ } location.reload(); return; }
    this.started = true; this.state = freshState();
    this.ui.hideMain(); this.setMode('play'); this.input.lock();
    this.story.newGame();
  }
  loadGame(slot) {
    const save = readSave(slot);
    if (!save) { this.ui.toast('That save could not be read'); if (!this.started) { this.ui.showMain(); } return; }
    if (this.started) { try { sessionStorage.setItem('botn.boot', 'load:' + slot); } catch { /* ignore */ } location.reload(); return; }
    this.started = true; this.state = Object.assign(freshState(), structuredClone(save.state));
    this.ui.hideMain(); this.ui.e.panel.classList.remove('on');
    this.setMode('play'); this.input.lock();
    this.story.restore();
    this.ui.refreshTracker();
  }
  /** Start at the opening of any chapter, with everything before it taken as played: the quests done, and what Eirik
   *  carries and has learned by then. It is written to a slot of its own and loaded from there, like any save. */
  startAt(first) {
    if (first === 'q_morning') return this.startNewGame();
    const i = ORDER.indexOf(first), at = (id) => ORDER.indexOf(id), past = (id) => i > at(id);
    if (i < 0 || !QUESTS[first]) return;
    const st = freshState(), inv = {}, fl = st.flags;
    for (const id of ORDER.slice(0, i)) st.quests[id] = { status: 'done', step: QUESTS[id].steps.length, count: 0 };
    st.quests[first] = { status: 'active', step: 0, count: 0 };
    let stage = 'act2', time = 9.2;
    if (i < at('q_ten')) { // Act I: Eirik is nine
      stage = i >= at('q_hearth') ? 'ch3' : i >= at('q_white') ? 'ch2' : 'day';
      time = { q_wood: 8.9, q_hunt: 9.4, q_fire: 12.4, q_sword: 15.1, q_supper: 16.3, q_ashes: 16.6, q_white: 7.5, q_ice: 8, q_hearth: 10, q_wings: 10 }[first] ?? 9;
      if (past('q_hunt')) Object.assign(inv, { bow: 1, arrow: 12 });
      if (past('q_fire')) inv.flint = 1;
      if (past('q_sword')) inv.woodsword = 1;
      if (past('q_ashes')) inv.father_axe = 1;
      if (stage === 'day') { const s = POI.spawn; st.player = { x: s.x, z: s.z, yaw: 1.2 }; }
      if (first === 'q_white') Object.assign(st, { vitals: { health: 100, warmth: 70, hunger: 38 } });
      if (past('q_hearth')) fl.spring = true;
    } else {
      time = { q_ten: 14.6, q_isle: 9.2, q_gold: 9.4, q_carry: 13.4, q_marsh: 15.5, q_firewater: 7.3, q_ravenhold: 8.4 }[first] ?? 9.2;
      Object.assign(inv, { bow: 1, arrow: 14, flint: 1 });
      Object.assign(fl, { a2v: 2, lightning: true, spring: true, axeHidden: !past('q_axe') });
      if (past('q_axe')) Object.assign(inv, { father_axe: 1, shield: 1, wolf_brooch: 1 });
      if (past('q_oath')) inv.arm_ring = 1;
      if (past('q_iron')) { inv.mail = 1; fl.reforge = past('q_smith') ? 3 : past('q_lastforge') ? 2 : 1; }
      if (past('q_court')) Object.assign(inv, { token: 1, safe_letter: 1 });
      if (past('q_ring') && i <= at('q_ravenhold')) inv.halfdan_ring = 1;
      if (past('q_four')) inv.raven_cloth = 1;
      if (past('q_ironwolf') && i <= at('q_ravenhold')) inv.oath_ring = 1;
      // each act opens once (its card and first scene); a later chapter of it has had its opening
      for (const [f, q] of [['a3begun', 'q_isle'], ['a4begun', 'q_gold'], ['a5begun', 'q_carry'], ['a6begun', 'q_marsh'], ['a7begun', 'q_firewater'], ['e8begun', 'q_ravenhold']]) if (i >= at(q)) fl[f] = past(q);
      if (i >= at('q_ravenhold')) fl.e8seen = [];
    }
    Object.assign(st, { stage, time, inventory: inv });
    writeSave('act', st, { quest: QUESTS[first].title, step: QUESTS[first].steps[0].text, playtime: 0 });
    this.loadGame('act');
  }
  saveGame(slot) {
    if (!this.started) return false;
    const st = this.state, p = this.player, tr = this.quests.tracked()[0];
    st.player = { x: p.pos.x, z: p.pos.z, yaw: p.yaw };
    if (['day', 'ch2', 'ch3', 'act2', 'open'].includes(st.stage)) st.time = this.sky.time;
    if (this.activity && this.activity.back) st.player = { x: this.activity.back[0], z: this.activity.back[1], yaw: this.activity.back[2] || 0 }; // never save a man in the water: he is on the rock he dived from
    if (this.story.onSave) this.story.onSave();
    st.vitals = { health: p.health, warmth: p.warmth, hunger: p.hunger };
    return writeSave(slot, st, { quest: tr ? tr.def.title : this.quests.isDone('q_price') ? 'Act Three complete' : this.quests.isDone('q_oath') ? 'Act Two complete' : this.quests.isDone('q_wings') ? 'Act One complete' : this.quests.isDone('q_ice') ? 'Chapter Two complete' : 'Chapter One complete', step: tr ? tr.step.text : 'Between chapters', playtime: st.playtime });
  }
  autosave() { this.saveGame('auto'); }
  reloadCheckpoint() { try { sessionStorage.setItem('botn.boot', 'load:auto'); } catch { /* ignore */ } location.reload(); }
  quitToMenu() { if (this.started && this.state.stage === 'day' && !this.activity) this.autosave(); location.reload(); }
  pause() {
    if (!RUNNING.has(this.mode) || this.mode === 'cutscene') return;
    this.prevMode = this.mode; this.setMode('paused'); this.ui.showPause(); this.audio.play('uiBack');
  }
  resume() { this.ui.hidePause(); this.ui.e.panel.classList.remove('on'); this.setMode(this.prevMode || 'play'); this.input.lock(); }
  openPanelFromPlay(tab) { this.prevMode = this.mode; this.setMode('paused'); this.panelFrom = 'play'; this.ui.openPanel(tab); this.audio.play('page'); }
  panelClosed() {
    if (this.mode === 'menu') return;
    if (this.panelFrom === 'play') { this.panelFrom = null; this.resume(); } else this.ui.showPause();
  }

  // ---- main loop ---------------------------------------------------------------------------
  tick(now) {
    requestAnimationFrame((t) => this.tick(t));
    const real = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.frames++; this.fpsT += real; if (this.fpsT >= 1) { this.fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0; }
    this.adaptRes((now - this.rawLast) / 1000 || 0); this.rawLast = now;
    if (!this.manual) this.frame(real, true);
  }
  /** Advance the whole game by `real` seconds. Also driven directly by the test harness. */
  frame(real, render = true) {
    const inp = this.input, m = this.mode, run = RUNNING.has(m);
    let scale = 1; // a landed blow holds the world for an instant; a finishing blow slows it
    if (this.hitStop > 0) { this.hitStop -= real; scale = 0.04; } else if (this.slowT > 0) { this.slowT -= real; scale = 0.3; }
    const dt = run ? real * scale : 0;
    inp.pollPad();

    if (run) {
      this.state.playtime += dt;
      for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
      if (m === 'play') {
        if (this.ravens.eye) { if (inp.hit('pause') || inp.hit('raven')) this.ravens.exitEye(); }
        else if (inp.hit('raven')) this.ravens.enterEye();
        else if (inp.hit('pause')) this.pause();
        else if (inp.hit('journal')) this.openPanelFromPlay('journal');
        else if (inp.hit('inventory')) this.openPanelFromPlay('inventory');
        else if (inp.hit('map')) this.openPanelFromPlay('map');
        else if (inp.hit('skills')) this.openPanelFromPlay('skills');
      } else if (m === 'dialogue') this.dialogue.update(dt);
      else if (m === 'activity' && this.activity) this.activity.update(dt);
      if (this.mode !== 'paused') {
        this.player.update(dt, this.mode === 'play');
        for (const n of this.npcs.values()) n.update(dt);
        this.combat.update(dt);
        this.companions.update(dt);
        this.wildlife.update(dt);
        this.ravens.update(dt);
        this.story.update(dt);
        this.skills.update();
        this.cine.update(dt);
        this.playtest.update(dt);
        this.interaction = this.mode === 'play' && !this.ravens.eye ? this.findInteraction() : null;
        this.sense = damp(this.sense, this.mode === 'play' && inp.held('sense') ? 1 : 0, 6, dt);
      }
    } else if (m === 'menu') {
      // a slow orbit over the village behind the main menu
      this.menuT += real;
      const a = this.menuT * 0.035 + 2.2;
      this.camera.position.set(Math.cos(a) * 78 - 6, 30 + Math.sin(this.menuT * 0.1) * 3, 52 + Math.sin(a) * 78);
      this.camera.lookAt(-4, 6, 48);
      this.player.h.update(real);
      for (const n of this.npcs.values()) n.update(real);
      this.wildlife.update(real);
      this.story.update(real);
      if (inp.hit('pause') && this.ui.panelOpen) this.ui.closePanel();
    } else if (m === 'paused') {
      if (inp.hit('pause')) { if (this.ui.panelOpen) this.ui.closePanel(); else this.resume(); }
    }

    const anim = m === 'paused' ? 0 : real;
    shared.uTime.value += anim;
    this.world.terrain.update(shared.uTime.value);
    const focus = m === 'menu' ? this.focusMenu || (this.focusMenu = new THREE.Vector3(-4, 5, 48)) : this.ravens.eye ? this.ravens.flier.position : this.player.pos;
    this.sky.update(anim, this.camera, focus);
    this.fx.update(anim, focus, this.sky.isNight);
    this.audio.update(real);
    this.ui.update(anim);
    if (render) this.draw();
    inp.endFrame();
  }

  // ---- debug / test hooks (window.__game.debug) -----------------------------------------
  installDebug() {
    const g = this;
    this.debug = {
      tp: (x, z, yaw) => g.player.teleport(x, z, yaw),
      hold: (code, ms = 500) => { g.input.simulate(code, true); setTimeout(() => g.input.simulate(code, false), ms); },
      tap: (code) => { g.input.simulate(code, true); setTimeout(() => g.input.simulate(code, false), 60); },
      give: (id, n = 1) => g.inventory.add(id, n, true),
      /** Deterministic stepping for automated playtests: take over from requestAnimationFrame. */
      manual: (on = true) => { g.manual = on; },
      run: async (sec, fps = 60) => { const n = Math.round(sec * fps); for (let i = 0; i < n; i++) { g.frame(1 / fps, false); if (i % 6 === 5) await null; } },
      /** Render one frame and return the canvas as a PNG data URL (for saving test screenshots). */
      shot: () => { g.frame(0, true); return g.renderer.domElement.toDataURL('image/jpeg', 0.8); },
      time: (h) => { g.sky.time = h; },
      /** Render from a free camera (overview shots of the world) and save it as a test screenshot. */
      view: async (name, c, t, fog) => {
        g.frame(0, false); const f = g.scene.fog.density; if (fog) g.scene.fog.density = fog;
        g.camera.position.set(...c); g.camera.lookAt(...t); g.camera.updateMatrixWorld(); g.sky.dome.position.copy(g.camera.position);
        g.draw(); g.scene.fog.density = f;
        return (await fetch('/__shot?name=' + name, { method: 'POST', body: g.renderer.domElement.toDataURL('image/jpeg', 0.8) })).status;
      },
      /** Jump straight to a quest step (marks earlier main quests done). */
      jump: (qid, sid) => {
        const order = [...ORDER, 'q_open', 'q_sea'];
        if (!g.started) { g.started = true; g.ui.hideMain(); g.setMode('play'); }
        for (const id of order) {
          if (id === qid) break;
          g.state.quests[id] = { status: 'done', step: QUESTS[id].steps.length, count: 0 };
        }
        const i = QUESTS[qid].steps.findIndex((s) => s.id === sid);
        g.state.quests[qid] = { status: 'active', step: Math.max(0, i), count: 0 };
        const oi = order.indexOf(qid);
        if (oi >= 2) for (const [k, n] of [['bow', 1], ['arrow', 12], ['flint', 1]]) if (!g.inventory.has(k)) g.inventory.add(k, n, true);
        if (oi >= 4) if (!g.inventory.has('woodsword')) g.inventory.add('woodsword', 1, true);
        if (oi >= 8) { const op = order.indexOf('q_open'); g.state.stage = oi >= op ? 'open' : oi >= 12 ? 'act2' : oi >= 10 ? 'ch3' : 'ch2'; if (oi >= 12 && oi < op) g.state.flags.a2v = 2; if (oi >= order.indexOf('q_gold') && oi < op) { g.state.flags.reforge = Math.max(1, g.state.flags.reforge || 0); if (!g.inventory.has('mail')) g.inventory.add('mail', 1, true); if (oi > order.indexOf('q_court') && !g.inventory.has('token')) g.inventory.add('token', 1, true); if (oi > order.indexOf('q_ring') && !g.inventory.has('halfdan_ring')) g.inventory.add('halfdan_ring', 1, true); if (oi > order.indexOf('q_lastforge')) g.state.flags.reforge = Math.max(oi > order.indexOf('q_smith') ? 3 : 2, g.state.flags.reforge || 0); if (oi >= order.indexOf('q_marsh')) g.state.flags.a6begun = oi > order.indexOf('q_marsh') || i > 0; if (oi >= order.indexOf('q_firewater')) g.state.flags.a7begun = oi > order.indexOf('q_firewater') || i > 0; if (oi >= order.indexOf('q_ravenhold')) g.state.flags.e8begun = oi > order.indexOf('q_ravenhold') || i > 0; } if (!g.inventory.has('father_axe')) g.inventory.add('father_axe', 1, true); if (qid === 'q_ice' || i >= 6) if (!g.inventory.has('venison')) g.inventory.add('venison', 3, true); }
        g.quests.enter(qid, true); g.ui.refreshTracker();
      },
      info: () => ({
        mode: g.mode, fps: Math.round(g.fps), stage: g.state.stage, time: +g.sky.time.toFixed(2),
        pos: [+g.player.pos.x.toFixed(1), +g.player.pos.y.toFixed(1), +g.player.pos.z.toFixed(1)],
        quests: Object.fromEntries(Object.entries(g.state.quests).map(([k, v]) => [k, v.status === 'done' ? 'done' : QUESTS[k].steps[v.step].id + (v.count ? ':' + v.count : '')])),
        inv: g.state.inventory, traits: g.state.traits, interaction: g.interaction ? g.interaction.label : null,
        draws: g.drawn.calls, tris: g.drawn.tris, res: g.res.scale, veg: g.world.veg.counts,
      }),
    };
    // ---- scripted playtest helpers (used with debug.manual(true)) ----
    const d = this.debug, run = d.run, p = () => g.player;
    Object.assign(d, {
      begin: () => { d.manual(true); if (!g.started) { g.started = true; g.ui.hideMain(); g.setMode('play'); } },
      tap: async (code) => { g.input.simulate(code, true); g.frame(1 / 60, false); g.input.simulate(code, false); await run(0.15); },
      talkThrough: async (choice = 0) => {
        for (let i = 0; i < 300 && g.mode === 'dialogue'; i++) { const dl = g.dialogue; if (dl.choices && dl.shown >= dl.text.length) dl.advance(choice); else dl.advance(); await run(0.05); }
      },
      near: async (id, dist = 1.5) => { const n = g.npcs.get(id); p().teleport(n.pos.x + dist, n.pos.z + 0.2, 0); await run(0.3); },
      use: async (x, z) => { if (x !== undefined) { p().teleport(x, z); await run(0.25); } const l = g.interaction ? g.interaction.label : null; await d.tap('KeyE'); return l; },
      follow: async (id, flag, maxSec = 90) => {
        const n = g.npcs.get(id); let t = 0; const stuck = []; let last = [n.pos.x, n.pos.z];
        while (!g.story[flag] && t < maxSec && g.mode === 'play') {
          p().teleport(n.pos.x - Math.sin(n.yaw) * 3, n.pos.z - Math.cos(n.yaw) * 3, n.yaw); await run(0.5); t += 0.5;
          if (Math.hypot(n.pos.x - last[0], n.pos.z - last[1]) < 0.25) stuck.push([Math.round(n.pos.x), Math.round(n.pos.z)]);
          last = [n.pos.x, n.pos.z];
        }
        return `${flag}:${g.story[flag]} after ${t}s stuck:${JSON.stringify(stuck.slice(0, 5))}`;
      },
      /** Hold aim and solve camera yaw/pitch so the crosshair sits on a world point. Returns the miss distance. */
      aimAt: async (tx, ty, tz) => {
        const pl = p(), c = g.camera, dir = new THREE.Vector3(), v = new THREE.Vector3();
        pl.cam.yaw = Math.atan2(tx - pl.pos.x, tz - pl.pos.z); pl.cam.pitch = 0.1;
        g.input.simulate('Mouse2', true); await run(1.0);
        const miss = () => { g.frame(1 / 240, false); c.getWorldDirection(dir); v.set(tx, ty, tz).sub(c.position); return v.addScaledVector(dir, -v.dot(dir)).length(); };
        let best = 99;
        for (let pass = 0; pass < 3; pass++) for (const key of ['yaw', 'pitch']) {
          const span = key === 'yaw' ? 0.3 / (pass * 4 + 1) : 0.5 / (pass * 4 + 1), c0 = pl.cam[key]; let bv = c0;
          for (let i = -20; i <= 20; i++) { pl.cam[key] = c0 + (span * i) / 20; const m = miss(); if (m < best) { best = m; bv = pl.cam[key]; } }
          pl.cam[key] = bv;
        }
        await run(0.1);
        return best;
      },
      loose: async () => { g.input.simulate('Mouse0', true); g.frame(1 / 60, false); g.input.simulate('Mouse0', false); g.input.simulate('Mouse2', false); await run(1.2); },
      save: async (name) => (await fetch('/__shot?name=' + name, { method: 'POST', body: d.shot() })).status,
      q: () => JSON.stringify(d.info().quests),
    });
    window.__game = this;
  }
}

new Game().boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('loading-text');
  if (t) t.textContent = I18N.tr('Failed to start: {0}', e.message);
});
