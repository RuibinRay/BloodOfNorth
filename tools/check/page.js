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

window.__check = { chapter, scene, party, lineup, scenes: Object.keys(SCENES) };
