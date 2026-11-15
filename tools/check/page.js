// The in-page half of `npm run check` (tools/check.mjs opens the game in a headless browser and calls these).
// Not part of the game: it drives the game's own test hooks (window.__game.debug) with the clock stepped by hand.
for (let i = 0; i < 400 && !(window.__game && window.__game.debug); i++) await new Promise((r) => setTimeout(r, 100));
if (!(window.__game && window.__game.debug)) throw new Error('the game did not start');
const g = window.__game, d = g.debug, errs = [];
addEventListener('error', (e) => errs.push(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
addEventListener('unhandledrejection', (e) => errs.push('rejection: ' + (e.reason && e.reason.message)));
let reloads = 0;
g.reloadCheckpoint = () => { reloads++; }; g.autosave = () => {}; g.saveGame = () => true; // a check never writes over a save or reloads the page
d.manual(true);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const p = () => g.player;
/** The main quest step in hand, as "quest.step". */
const at = () => { const q = g.state.quests, k = Object.keys(q).find((x) => q[x].status === 'active'); return k ? k + '.' + g.quests.defs[k].steps[q[k].step].id : 'none'; };
const cine = async (max = 90) => { let t = 0; while (g.mode === 'cutscene' && t < max) { await d.run(1); t++; } return t; };
const talk = async (id) => { await d.near(id, 1.4); await d.use(); await d.run(0.4); await d.talkThrough(); await d.run(0.6); };
/** A seeded generator (mulberry32). */
const seeded = (seed) => { let sd = seed >>> 0; return () => { sd = (sd + 0x6d2b79f5) >>> 0; let t = Math.imul(sd ^ (sd >>> 15), 1 | sd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const { ShieldWall: Wall } = await import('/src/systems/shieldwall.js'); // the same module the game runs
const drawn = () => { for (let i = 0; i < 3; i++) g.draw(); return { calls: g.drawn.calls, ktris: Math.round(g.drawn.tris / 1000) }; };

/** Start one chapter the way the Acts menu does, let it run a little, and say how it stands. */
async function chapter(id, secs = 14) {
  try { g.startAt(id); } catch (e) { return { id, crash: e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ') }; }
  d.manual(true);
  for (let t = 0; t < secs; t += 0.5) { await d.run(0.5); await wait(40); }
  const tr = g.quests.tracked()[0], mk = tr ? g.story.markerFor(tr.step) : null, pl = p().pos;
  return {
    id, at: at(), mode: g.mode, stage: g.state.stage, pos: [Math.round(pl.x), Math.round(pl.z)],
    off: +(pl.y - g.world.groundAt(pl.x, pl.z)).toFixed(1),                                   // how far he is off the ground
    marker: mk ? Math.round(Math.hypot(mk.x - pl.x, mk.z - pl.z)) : tr && tr.step.marker ? (tr.step.marker.until ? 'reached' : 'lost') : 'none',
    people: [...g.npcs.values()].filter((n) => n.visible && Math.hypot(n.pos.x - pl.x, n.pos.z - pl.z) < 60).length,
    body: (() => { let o = p().h.bodyMesh; while (o && o !== g.scene) o = o.parent; return !!o; })(),  // his body is in the world to be drawn (after he grows up it is a new one)
    errs: errs.slice(0, 3), reloads,
  };
}

/** What a scene asks the machine to draw: draw calls and triangles in one frame (exact, and the same on any machine). */
const SCENES = {
  hrafnvik: async () => { d.jump('q_wood'); await d.run(2); },
  'open world farm': async () => { d.jump('q_open'); await d.run(1); p().teleport(160, -122, 0.5); await d.run(1); },
  'iron shore gate': async () => { d.jump('q_shore', 'hold'); await d.run(1); await cine(); for (let t = 0; t < 8; t++) { p().health = 100; await d.run(1); } },
  'black shore battle': async () => { d.jump('q_blackshore', 'town'); await d.run(1); await cine(); for (let t = 0; t < 8; t++) { p().health = 100; await d.run(1); } },
  'fleet at sea': async () => { d.jump('q_firewater', 'fire'); await d.run(1); await cine(); await d.run(2); },
};
async function scene(name) {
  await SCENES[name]();
  return { name, ...drawn(), people: [...g.npcs.values()].filter((n) => n.visible).length, errs: errs.slice(0, 3) };
}

/** Companions in the open world: two are asked along by talking to them, three raiders come, both skills are called. */
async function party() {
  const C = g.companions, o = g.story.open;
  d.jump('q_open'); await d.run(1);
  await talk('leif'); await talk('astrid'); await d.run(1);
  const joined = [...(g.state.party || [])], look = g.npcs.get('folk1').def.look, pl = p();
  const foes = [0, 1, 2].map((i) => o.fighter('check' + i, 'Raider', look, pl.pos.x + 9 + i * 2, pl.pos.z + 6 - i * 3, 'axe', { hp: 110, dmg: 12, skill: 0.5 }));
  const called = []; let t = 0;
  for (; t < 70 && foes.some((e) => !e.dead); t++) {
    pl.health = 100;
    if (t === 3) { C.call(0); called.push(C.cd.leif > 0); }
    if (t === 4) { C.call(1); called.push(C.cd.astrid > 0); }
    await d.run(1);
  }
  return { joined, called, seconds: t, standing: foes.filter((e) => !e.dead).length, strip: C.hud().map((h) => h.name), errs: errs.slice(0, 3) };
}

/** Play one shield-wall step of a battle the way someone who has understood it would, and say how it went.
 *  how 'brace': stand in the middle of the line, raise the shield when their horn sounds, sound his own when they reel.
 *  how 'guard': the same, with his shield kept up between rushes as well.
 *  how 'parry': as 'brace', and the shield also goes up whenever one of them draws back to thrust at him.
 *  how 'idle':  stand in the line and do nothing at all.
 *  It does not fight: a man who breaks through is taken out after six seconds, and Eirik's health is put back every
 *  second (what he lost is counted). So it shows that the wall runs to its end and the story goes on from it, and what
 *  the two ways of playing do to the line; it does not show that the fight is fair. The dice are seeded, so a run
 *  gives the same answer every time. */
async function wall(quest, step, how = 'brace', maxSec = 300, seed = 7, linger = 6) { // linger: seconds a man who has broken through is left to fight him
  const real = Math.random; Math.random = seeded(seed); Wall.seed = seed; Wall.built = 0; // the game's dice, and the wall's own (see systems/shieldwall.js)
  try {
    try { d.jump(quest, step); } catch (e) { return { quest, step, how, crash: e.message }; }
    d.manual(true); await d.run(1); await cine();
    const W = () => g.story.a2.battle.wall, pl = p(), seen = new Map(), start = at();
    let t = 0, hurt = 0, w = null, began = -1, first = null, last = null, low = 100, breath = 100;
    const press = (code, on) => g.input.simulate(code, on);
    for (; t < maxSec; t += 0.25) {
      w = W();
      if (w && !w.gone && !w.o.rest && w.mode !== 'auto' && w.phase !== 'wait') {
        if (began < 0) { if (!(w instanceof Wall)) throw new Error('the wall is not from /src/systems/shieldwall.js: its dice are not seeded'); began = t; first = w.info(); }
        last = w.info();
        if (w.over) break;
        if (!w.inLine || Math.abs(w.pt - w.L / 2) > 5) { // back to the middle of the line, a pace and a half behind the front rank
          const o = w.offAt(w.N / 2) - 1.4; pl.teleport(w.ax + w.ux * (w.L / 2) + w.nx * o, w.az + w.uz * (w.L / 2) + w.nz * o, Math.atan2(w.nx, w.nz));
        }
        if (how !== 'idle') { // 'guard': the shield up all the time; 'parry': up at their horn and whenever one of them draws back to thrust at him
          press('Mouse2', how === 'guard' || w.phase === 'warn' || (how === 'parry' && !!w.stk));
          if (w.phase === 'reel' && w.pushCd <= 0) { press('KeyG', true); g.frame(1 / 60, false); press('KeyG', false); }
        }
        for (const e of w.live()) { if (!seen.has(e)) { seen.set(e, t); if (!linger && !e.dead) g.combat.kill(e); } else if (t - seen.get(e) >= linger && !e.dead) g.combat.kill(e); }
      } else if (began >= 0 && (!w || w.gone || w.over || w.mode === 'auto')) break; // it is over, or goes on without him
      low = Math.min(low, pl.health); hurt += Math.max(0, 100 - pl.health); pl.health = 100; breath = Math.min(breath, pl.stamina);
      await d.run(0.25); if (Math.round(t * 4) % 8 === 0) await wait(10);
    }
    press('Mouse2', false);
    for (let i = 0; i < 16; i++) { pl.health = 100; await d.run(0.5); if (g.mode === 'cutscene') await cine(); } // what the story does next
    return { quest, step, how, began, seconds: +(t - began).toFixed(1), over: last ? last.over || (w && w.mode === 'auto' ? 'held' : false) : 'no wall', from: start, to: at(), first, last, through: seen.size, hurt: Math.round(hurt), low: Math.round(low), breath: Math.round(breath), reloads, mode: g.mode, errs: errs.slice(0, 3) };
  } finally { Math.random = real; Wall.seed = null; }
}

/** Play one shield-wall step as a person would, fighting: his health is real and nothing is done for him.
 *  He stands in the middle of the line, raises his shield when their horn sounds (if he has the breath), sounds his own
 *  horn when they reel (and at their horn he faces their line and braces even with a man of theirs loose behind him),
 *  and between rushes cuts at their front rank and keeps his shield down to get his breath back;
 *  when one of their men draws back to thrust at him he guards. A man who breaks through he turns on and fights:
 *  guarding when the man winds up, cutting when he is open, and he walks back to his place in the line afterwards.
 *  prof sets how quickly he sees things and how often he misses them, as in tools/check/bot.js. Only the game's own
 *  inputs are used (keys and mouse buttons, and the camera's yaw, which a person turns with the mouse). Seeded dice. */
const FIGHTER = {
  novice: { rt: 0.42, rtSd: 0.1, miss: 0.22, cut: 0.35, stam: 30, horn: 0.8 },
  average: { rt: 0.3, rtSd: 0.07, miss: 0.1, cut: 0.55, stam: 24, horn: 0.6 },
  good: { rt: 0.22, rtSd: 0.05, miss: 0.04, cut: 0.7, stam: 20, horn: 0.4 },
};
async function wallFight(quest, step, prof = 'average', maxSec = 360, seed = 11) {
  const real = Math.random; Math.random = seeded(seed); Wall.seed = seed; Wall.built = 0; // the game's dice, and the wall's own (see systems/shieldwall.js)
  const P = FIGHTER[prof], me = seeded(seed ^ 0x5bd1e995), inp = g.input, held = new Set();
  const set = (code, on) => { if (on && !held.has(code)) { inp.simulate(code, true); held.add(code); } else if (!on && held.has(code)) { inp.simulate(code, false); held.delete(code); } };
  const tap = (code) => { inp.simulate(code, true); g.frame(1 / 60, false); inp.simulate(code, false); };
  const gauss = () => { let u = 0, v = 0; while (!u) u = me(); while (!v) v = me(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const late = () => Math.max(0.1, P.rt + gauss() * P.rtSd);
  const pl = p(), rec = pl.receive.bind(pl); let died = 0; const onDie = () => { died++; };
  try {
    try { d.jump(quest, step); } catch (e) { return { quest, step, prof, crash: e.message }; }
    d.manual(true); await d.run(1); await cine();
    const W = () => g.story.a2.battle.wall, start = at();
    g.events.on('playerDied', onDie);
    for (let i = 0; i < 240 && !(W() && !W().gone && W().phase !== 'wait'); i++) { await d.run(0.25); if (g.mode === 'cutscene') await cine(); }
    const w = W(); if (!w) return { quest, step, prof, over: 'no wall' };
    if (!(w instanceof Wall)) throw new Error('the wall is not from /src/systems/shieldwall.js: its dice are not seeded');
    const S = { quest, step, prof, from: start, cuts: 0, felled: 0, breakers: 0, blocked: 0, hit: 0, low: 100, braced: 0, unbraced: 0, horns: 0 };
    const kill = w.kill.bind(w); w.kill = (m, by) => { if (by) S.felled++; return kill(m, by); };
    const seen = new Set(); let volleyAt = 0, lastHp = pl.health, t = 0, seeWarn = -1, seeReel = -1, seeStk = -1, stkOf = null, guardFor = null, guardSeen = 0, nextCut = 0;
    const src = (S.dmg = {}), add = (k, h0) => { const n = Math.max(0, h0 - pl.health); if (n) src[k] = (src[k] || 0) + n; };
    pl.receive = (a, dmg, o) => { const h0 = pl.health, r = rec(a, dmg, o); if (r === 'hit') S.hit++; else if (r === 'blocked' || r === 'parried') S.blocked++;
      add(a && a.cb ? 'a man through the line' : o && o.unblockable ? 'their rush' : 'a thrust over the rim', h0); return r; };
    const recA = pl.receiveArrow.bind(pl); pl.receiveArrow = (from, dmg) => { const h0 = pl.health, r = recA(from, dmg); add('arrows', h0); return r; };
    const why = (S.why = {}); // when a rush came and he was not braced: where he was and what he had
    S.log = []; const rush0 = w.rush.bind(w); w.rush = () => { S.log.push({ t: +t.toFixed(1), inLine: w.inLine, blocking: pl.blocking, m2: held.has('Mouse2'), st: Math.round(pl.stamina), busy: pl.h.busy && pl.h.action.name, dodge: +pl.dodgeT.toFixed(2), seeWarn: +(seeWarn - t).toFixed(2), foe: w.live().filter((e) => e && !e.dead && e.cb).length, pd: +w.pd.toFixed(1) }); const k = !w.inLine ? 'out of the line' : !pl.blocking ? (pl.stamina < w.cfg.braceNeed + 2 ? 'no breath to raise it' : 'shield down') : pl.stamina < w.cfg.braceNeed ? 'shield up, no breath' : null; if (k) why[k] = (why[k] || 0) + 1; return rush0(); };
    const rush = w.rush.bind(w); w.rush = () => { if (w.inLine) { if (pl.blocking && pl.stamina >= w.cfg.braceNeed) S.braced++; else S.unbraced++; } return rush(); };
    const dt = 1 / 60;
    for (let f = 0; f < maxSec * 60; f++) {
      t += dt;
      if (died || pl.health <= 0) { S.over = 'died'; break; }
      if (w.over || w.gone || w.mode === 'auto') { S.over = w.over || 'held'; break; }
      S.low = Math.min(S.low, pl.health);
      if (g.mode === 'dialogue') g.dialogue.advance();
      let block = false, cut = false; const keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };
      const live = w.live().filter((e) => e && !e.dead && e.cb);
      for (const e of live) if (!seen.has(e)) { seen.add(e); S.breakers++; }
      const foe = live.map((e) => [e, Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z)]).filter(([, dd]) => dd < 10).sort((a, b) => a[1] - b[1])[0];
      const B = g.story.a2.battle, rains = g.story.a2.parts.flatMap((q) => (q && q.war && q.war.arrows) || []); // a volley in the air: a person sees it coming
      const flying = (B.arrows || []).some((a) => a.m.visible && a.t > -0.05 && a.t < 0.6) || rains.some((a) => a.on && a.hurt && a.t >= 0 && a.T - a.t < 0.75 && Math.hypot(a.b[0] - pl.pos.x, a.b[2] - pl.pos.z) < 2.2);
      if (flying && !volleyAt) volleyAt = me() < P.miss ? 1e9 : t + late(); if (!flying) volleyAt = 0;
      const horn = w.phase === 'warn' && w.inLine; // their horn has gone: whatever else is happening, the shield goes up and he faces their line
      if (horn) { if (seeWarn < 0) seeWarn = me() < P.miss ? 1e9 : t + late(); } else seeWarn = -1;
      if (horn && t >= seeWarn && pl.stamina >= w.cfg.braceNeed + 2 && !(foe && foe[1] < 2.6 && foe[0].cb.state === 'strike')) { pl.cam.yaw = Math.atan2(w.nx, w.nz); block = true; }
      else if (volleyAt && t >= volleyAt && pl.stamina > 4) block = true; // shield up over his head until it has passed
      else if (foe) { // one of them is through: turn on him
        const [e, dist] = foe, c = e.cb; pl.cam.yaw = Math.atan2(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
        if ((c.state === 'windup' || c.state === 'strike') && guardFor !== e.h.action) { guardFor = e.h.action; guardSeen = me() < P.miss ? 1e9 : t + late(); }
        if ((c.state === 'windup' || c.state === 'strike') && t >= guardSeen) block = true;
        const open = ['recover', 'stagger', 'harried'].includes(c.state) || c.openT > 0;
        if (!block) { if (dist > 2.1) keys.KeyW = true; else if ((open || me() < P.cut * dt * 4) && pl.stamina > P.stam * 0.6 && t >= nextCut) { cut = true; nextCut = t + 0.45; } }
      } else { // in the line
        const o = w.offAt(w.N / 2) - 1.4, tx = w.ax + w.ux * (w.L / 2) + w.nx * o, tz = w.az + w.uz * (w.L / 2) + w.nz * o, dd = Math.hypot(tx - pl.pos.x, tz - pl.pos.z);
        if (!w.inLine || dd > 3) { pl.cam.yaw = Math.atan2(tx - pl.pos.x, tz - pl.pos.z); keys.KeyW = dd > 0.8; }
        else {
          pl.cam.yaw = Math.atan2(w.nx, w.nz);
          if (w.phase === 'reel') { if (seeReel < 0) seeReel = me() < P.miss ? 1e9 : t + late() + P.horn; if (t >= seeReel && w.pushCd <= 0) { tap('KeyG'); S.horns++; seeReel = 1e9; } } else seeReel = -1;
          if (w.stk && stkOf !== w.stk) { stkOf = w.stk; seeStk = me() < P.miss ? 1e9 : t + late(); } if (!w.stk) stkOf = null;
          if (w.stk && t >= seeStk && pl.stamina > 6) block = true;
          if (!block && w.phase === 'grind' && pl.stamina > P.stam && t >= nextCut && me() < P.cut * dt * 3) { cut = true; nextCut = t + 0.5; }
        }
      }
      for (const k in keys) set(k, keys[k]);
      set('Mouse2', block);
      if (cut && !block && !pl.h.busy) { tap('Mouse0'); S.cuts++; }
      const h0 = pl.health, counted = Object.values(src).reduce((x, y) => x + y, 0);
      g.frame(dt, false);
      const lost = Math.max(0, h0 - pl.health), after = Object.values(src).reduce((x, y) => x + y, 0) - counted; if (lost - after > 0.01) src['arrows from the cliffs, or fire'] = Math.round(((src['arrows from the cliffs, or fire'] || 0) + lost - after) * 10) / 10;
      if (f % 240 === 239) { await null; if (f % 1200 === 1199) await wait(5); }
    }
    for (const c of [...held]) set(c, false);
    if (!S.over) S.over = 'timeout';
    for (const k in src) src[k] = Math.round(src[k]);
    S.seconds = +t.toFixed(1); S.low = Math.round(S.low); S.left = Math.round(pl.health); S.info = (({ mean, ours, theirs, start, surges, pushes }) => ({ mean, ours, theirs, start, surges, pushes }))(w.info());
    pl.receive = rec;
    for (let i = 0; i < 12 && S.over !== 'died'; i++) { await d.run(0.5); if (g.mode === 'cutscene') await cine(); }
    S.to = at(); S.reloads = reloads; S.errs = errs.slice(0, 3);
    return S;
  } finally { Math.random = real; Wall.seed = null; pl.receive = rec; delete pl.receiveArrow; g.events.off('playerDied', onDie); for (const c of [...held]) g.input.simulate(c, false); }
}

/** Stand people in a row three metres in front of Eirik, facing back at him, to look at what they wear
 *  (node tools/shot.mjs "... await __check.lineup(['ylva', 'hakon', 'gorm'])"). Names: anyone in the cast lists, a
 *  champion by id, eirik, raider0 to raider3. Gives back where the middle of the row stands. */
async function lineup(names, gap = 0.95) {
  const [{ Humanoid }, { CAST, RAIDER_LOOKS }, { CAST2 }, { COMPANIONS }, { FOES }, { EIRIK_ADULT, EIRIK_CHILD }] = await Promise.all(['/src/entities/humanoid.js', '/src/data/act1.js', '/src/data/act2.js', '/src/data/companions.js', '/src/story/champions.js', '/src/entities/player.js'].map((f) => import(f)));
  const looks = { ...Object.fromEntries([...Object.entries(CAST), ...Object.entries(CAST2), ...Object.entries(COMPANIONS)].map(([k, v]) => [k, v.look])), ...Object.fromEntries(FOES.map((f) => [f.id, f.look])),
    ...Object.fromEntries(RAIDER_LOOKS.map((l, i) => ['raider' + i, l])), hakon_young: CAST.hakon.look, eirik: EIRIK_ADULT, eirik_child: EIRIK_CHILD };
  const pl = p().pos, z = pl.z + 3;
  names.forEach((n, i) => {
    if (!looks[n]) throw new Error('no look for "' + n + '"');
    const h = new Humanoid(looks[n]), x = pl.x + (i - (names.length - 1) / 2) * gap;
    h.root.position.set(x, g.world.groundAt(x, z), z); g.scene.add(h.root); h.update(0.05); h.faceMesh.visible = true;
  });
  return [pl.x, g.world.groundAt(pl.x, z), z];
}

/** The languages: play a chapter in Chinese (or Spanish) and say what reached the screen in English.
 *  missing: strings that went through tr() with no entry; latin: English words left in the page itself (in Chinese
 *  only: keycaps and the frame counter aside, nothing on a Chinese screen should be in Latin letters). */
const LATIN_OK = /^(fps|ms|Space|Esc|Tab|Shift|Ctrl|Mouse\d|Pad\w*|Key\w|[A-Z]|[A-Z]\d|R-Shift|Enter|English|Español|Higgsfield|Unreal|Engine|AI|IA|Alt|Gr|data|missions|json|Hwæt|wilt|þu|Twa|penegas|God|þe|mid|sie|Norþmenn)$/; // keycaps, names of tools, a file name, the Old English heard in Wessex (kept foreign on purpose)
function latinOnScreen() {
  const out = new Set(), ui = document.getElementById('ui');
  const walk = (el) => {
    if (el.nodeType === 3) { for (const w of el.textContent.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]{2,}/g) || []) if (!LATIN_OK.test(w)) out.add(w); return; }
    if (el.nodeType !== 1 || el.tagName === 'KBD' || el.id === 'fps' || el.classList.contains('runes') || el.lang === 'en' || el.lang === 'es') return;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
    for (const c of el.childNodes) walk(c);
  };
  walk(ui); return [...out];
}
async function i18n(lang, ids, secs = 10, withPanels = true) {
  await g.setLanguage(lang); const I = window.__i18n, rows = [];
  const panels = ['journal', 'inventory', 'map', 'saga', 'skills', 'companions', 'looks', 'settings', 'saves', 'status', 'acts'];
  for (const id of ids) {
    I.missing.clear();
    try { if (id === 'q_open') d.jump('q_open'); else g.startAt(id); } catch (e) { rows.push({ id, crash: e.message }); continue; } // the open world is not an act's chapter
    d.manual(true); const latin = new Set();
    for (let t = 0; t < secs; t += 0.5) {
      await d.run(0.5);
      if (g.mode === 'dialogue') { for (const w of latinOnScreen()) latin.add(w); await d.tap('KeyE'); }
      if (t % 3 === 0) for (const w of latinOnScreen()) latin.add(w);
    }
    for (const w of latinOnScreen()) latin.add(w);
    rows.push({ id, missing: [...I.missing], latin: lang === 'zh' ? [...latin] : [] });
  }
  I.missing.clear(); const panelLatin = {};
  if (withPanels) for (const t of panels) { g.ui.openPanel(t, panels); await wait(30); const l = latinOnScreen(); if (l.length) panelLatin[t] = l; }
  g.ui.closePanel();
  return { rows, panelMissing: [...I.missing], panelLatin: lang === 'zh' ? panelLatin : {} };
}
window.__check = { chapter, scene, party, lineup, wall, wallFight, i18n, scenes: Object.keys(SCENES) };
