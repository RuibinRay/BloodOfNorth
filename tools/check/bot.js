// A stand-in player for the story's champion fights (tools/fights.mjs runs it). It plays only through the game's inputs (keys and mouse
// buttons via input.simulate, and the camera yaw, which a person turns with the mouse). It never touches health.
// It sees a blow only once the swing has started, reacts after a human delay, and mistimes by a set spread.
(() => {
  const g = window.__game, d = g.debug, inp = g.input;
  const PROFILES = {
    // rt: seconds to notice a swing; jit: spread of timing; miss: chance a blow goes unseen; greed: chance per
    // half-second to swing at a man who is not open; parry: chance of trying a timed parry rather than holding the
    // guard early; red: chance of reading a red flash and stepping out rather than blocking; ward/arts: uses Z / 4.
    novice: { raven: 0.03, rt: 0.42, rtSd: 0.1, jit: 0.16, miss: 0.22, greed: 0.35, parry: 0.3, red: 0.55, ward: 0, arts: 0, stam: 6, hazard: 0.5 },
    average: { raven: 0.08, rt: 0.3, rtSd: 0.07, jit: 0.1, miss: 0.1, greed: 0.2, parry: 0.6, red: 0.85, ward: 0.4, arts: 0, stam: 16, hazard: 0.85 },
    good: { raven: 0.2, rt: 0.22, rtSd: 0.05, jit: 0.06, miss: 0.04, greed: 0.1, parry: 0.85, red: 0.95, ward: 0.9, arts: 1, stam: 22, hazard: 1 },
  };
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const held = new Set();
  const set = (code, on) => { if (on && !held.has(code)) { inp.simulate(code, true); held.add(code); } else if (!on && held.has(code)) { inp.simulate(code, false); held.delete(code); } };
  const releaseAll = () => { for (const c of [...held]) set(c, false); };
  const boss = () => g.combat.enemies.find((x) => x.cb && x.cb.boss && !x.dead && !x.cb.out);

  // champion: [chapter, step to jump to (null: the chapter's own start)], in story order
  const CH = { kettil2: ['q_axe', 'captain'], arne: ['q_long', 'arne'], ulf3: ['q_ulf', 'duel'], rurik: ['q_water', 'rurik'], skarde: ['q_wing', 'skarde'], eydis: ['q_marsh', 'eydis'], bersi: ['q_anvil', 'bersi'],
    ulf: ['q_blades', 'ulf'], kettil: ['q_redhand', null], vigdis: ['q_vigdis', 'vigdis'], gorm: ['q_gorm', 'gorm'], hakon: ['q_ironwolf', null] };
  /** As "Start at an Act" does: write the chapter's save and load it (the page reloads if a game is running). */
  function load(id) { d.manual(false); releaseAll(); g.startAt(CH[id][0]); return 'loading ' + id; }
  /** After the load: go to the step and wait (in real time) until the champion is up. */
  async function ready(id) {
    const [chapter, step] = CH[id];
    for (let i = 0; i < 300 && !(g.started && g.mode === 'play'); i++) await wait(100);
    if (!(g.started && g.mode === 'play')) return null;
    d.manual(true);
    const step30 = async (n) => { for (let i = 0; i < n; i++) { g.frame(1 / 30, false); if (g.cine.active && g.cine.skippable) g.cine.end(); if (g.mode === 'dialogue') { const dl = g.dialogue; if (dl.choices && dl.shown >= dl.text.length) dl.advance(0); else dl.advance(); } if (i % 15 === 14) await null; } };
    await step30(30);
    if (id === 'ulf') for (let i = 0; i < 60 && /"q_blades":"leif"/.test(d.q()); i++) await step30(15); // Leif's duel on the benches plays first
    if (step) d.jump(chapter, step);
    for (let i = 0; i < 120 && !boss(); i++) {
      if (id === 'kettil') { const k = [...g.npcs.values()].find((n) => /Kettil/.test(n.name || '')); if (k && k.visible && Math.hypot(k.pos.x - g.player.pos.x, k.pos.z - g.player.pos.z) > 10) g.player.teleport(k.pos.x - 6, k.pos.z - 6, 0); }
      await step30(5);
    }
    d.manual(false);
    return boss();
  }

  async function fight(prof, o = {}) {
    const P = PROFILES[prof], p = g.player, e = boss();
    if (!e) return { error: 'no champion' };
    const name = e.name, maxHp = e.cb.maxHp;
    const S = { prof, champion: name, outcome: null, sec: 0, minHp: p.health, hp0: p.health, res: { dodged: 0, parried: 0, blocked: 0, hit: 0, warded: 0 }, autoWard: 0, moves: {}, landed: 0, turned: 0, phases: [], swings: 0, deadAt: null };
    let dead = false; const onDie = () => { dead = true; }; g.events.on('playerDied', onDie);
    const rec = p.receive.bind(p);
    p.receive = (att, dmg, opts) => {
      const h0 = p.health, r = rec(att, dmg, opts), mv = att && att.cb && att.cb.move, k = (mv && (mv.name || mv.id)) || (att && att.cb ? 'blow' : 'other');
      const m = S.moves[k] || (S.moves[k] = { n: 0, dmg: 0, res: {} }); m.n++; m.dmg += Math.max(0, h0 - p.health); m.res[r] = (m.res[r] || 0) + 1;
      S.res[r] = (S.res[r] || 0) + 1; return r;
    };
    const onWard = (auto) => { if (auto) S.autoWard++; }; g.events.on('ward', onWard);
    let hp = e.cb.hp, lastAct = null, plan = null, atk = null, decideT = 0, phase = e.cb.phase, t = 0, lockT = 0, prevState = e.cb.state, windSeen = 1e9, preferHold = true, windCancel = true;
    d.manual(true);
    const dt = 1 / 60, LIMIT = o.limit || 420;
    for (let f = 0; f < LIMIT * 60; f++) {
      t += dt;
      const c = e.cb;
      if (dead) { S.outcome = 'died'; break; }
      if (!c || e.dead || c.out || !g.combat.enemies.includes(e)) { S.outcome = 'won'; break; }
      if (c.phase !== phase) { phase = c.phase; S.phases.push([+(t).toFixed(1), +(c.hp / maxHp).toFixed(2)]); }
      if (c.hp < hp) { S.landed++; hp = c.hp; }
      S.minHp = Math.min(S.minHp, p.health);
      if (g.mode === 'dialogue') { g.dialogue.advance(); }
      // the mouse: keep the camera on him
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
      p.cam.yaw = ang;
      if ((lockT -= dt) <= 0 && p.lock !== e) { inp.simulate('KeyL', true); g.frame(dt, false); inp.simulate('KeyL', false); lockT = 2; }
      // he steps in (the windup): a person reads this, not the swing itself
      if (c.state === 'windup' && prevState !== 'windup') { windSeen = t + Math.max(0.12, P.rt + gauss() * P.rtSd); preferHold = Math.random() > P.parry; windCancel = Math.random() > P.greed; }
      prevState = c.state;
      const anticip = (c.state === 'windup' || c.state === 'strike') && windSeen <= t;
      if (anticip && windCancel && atk) atk = null;
      // a new swing of his
      const a = e.h.action;
      if (c.state === 'strike' && a && a !== lastAct && a.name !== 'stagger' && a.name !== 'parry') {
        const chained = plan && t - (plan.onset || 0) < 2;
        lastAct = a; const mv = c.move || {};
        const red = !!(mv.unblockable || mv.aoe || (mv.needShield && !p.hasShield()));
        let kind;
        if (Math.random() < P.miss) kind = 'none';
        else if (mv.shots || mv.taunt) kind = 'hold';
        else if (mv.trap) kind = 'dodge';
        else if (red) kind = Math.random() < P.red ? (P.ward && p.canGuard && p.canGuard() && Math.random() < P.ward ? 'ward' : 'dodge') : 'hold';
        else kind = preferHold ? 'hold' : Math.random() < P.parry ? 'parry' : 'hold';
        // the red flash has to be seen; an ordinary blow he saw coming in the step, or in the rhythm of a string
        const seenAt = red ? t + Math.max(0.12, P.rt + gauss() * P.rtSd) : (anticip || chained) ? t : t + Math.max(0.1, 0.8 * (P.rt + gauss() * P.rtSd));
        plan = { a, kind, seenAt, onset: t, lead: (kind === 'dodge' ? 0.1 : kind === 'ward' ? 0.15 : 0.13) + gauss() * P.jit, done: false, side: Math.random() < 0.5 ? 'KeyA' : 'KeyD', shots: !!mv.shots, name: mv.name || mv.id };
        S.swings++;
      }
      // what the hands do this frame
      let block = false, dodge = false, ward = false, mvKeys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };
      if (plan && (e.h.action !== plan.a || c.state !== 'strike')) { if (plan.shots) { plan.linger = (plan.linger ?? 0.9) - dt; if (plan.linger <= 0) plan = null; } else plan = null; }
      if (!plan && anticip && c.state === 'windup' && preferHold && !atk) block = true; // guard up as he comes in
      if (plan && plan.kind === 'hold' && c.state === 'strike' && t < plan.seenAt && preferHold && anticip) block = true;
      if (plan && t >= plan.seenAt) {
        const rem = (plan.a.hitAt || 0.4) * plan.a.dur - plan.a.t;
        if (plan.kind === 'hold') block = true;
        else if (plan.kind === 'parry') block = rem <= Math.max(0.02, plan.lead) || plan.done;
        else if ((plan.kind === 'dodge' || plan.kind === 'ward') && !plan.done && rem <= Math.max(0, plan.lead)) { plan.done = true; if (plan.kind === 'dodge') dodge = true; else ward = true; }
        if (plan.kind === 'parry' && block) plan.done = true;
        if (block || dodge || ward) atk = null;
      }
      // offence
      const open = ['recover', 'stagger', 'harried'].includes(c.state) || c.openT > 0 || p.riposteT > 0;
      if (!block && !plan && (decideT -= dt) <= 0) {
        decideT = 0.25;
        if (!atk && p.stamina > P.stam) {
          const heavy = c.state === 'stagger' || (c.kind === 'shield' && !open && !(p.riposteT > 0));
          if (open || Math.random() < P.greed / 2) atk = { heavy, left: heavy ? 1 : (open ? 3 : 2), t: 0 };
        }
        if (P.raven && !c.training && g.ravens.mode === 'follow' && !(g.combat.harryCd > 0) && Math.random() < P.raven) { inp.simulate('KeyR', true); g.frame(dt, false); inp.simulate('KeyR', false); }
        if (P.arts && p.ward >= 70 && open && dist < 3 && g.skills.has('st_smash')) { inp.simulate('Digit4', true); g.frame(dt, false); inp.simulate('Digit4', false); }
      }
      let mouse0 = false;
      if (atk && !block) {
        if (dist > 2.25) mvKeys.KeyW = true;
        else {
          atk.t += dt;
          if (atk.heavy) { mouse0 = atk.t < 0.45; if (atk.t >= 0.5) { atk = null; } }
          else if (!p.h.busy || p.h.action.name.startsWith('atk')) { mouse0 = atk.t % 0.42 < 0.05; if (atk.t % 0.42 >= 0.4) { if (--atk.left <= 0) atk = null; } }
        }
        if (atk && p.stamina < 8) atk = null;
      } else if (!dodge) {
        if (dist < 1.9) mvKeys.KeyS = true; else if (dist > 3.3) mvKeys.KeyW = true; else mvKeys.KeyA = true;
      }
      // a fight the story ends some other way (Bersi on the quarry ledge): when the champion cannot be cut down and the
      // objective marks a spot, a player who reads the hint goes there, stops fighting and does what it says (crouch)
      if (c.training && P.reads !== false) {
        const tr0 = g.quests.tracked()[0], mk = tr0 ? g.story.markerFor(tr0.step) : null;
        if (mk) {
          const mx = mk.x - p.pos.x, mz = mk.z - p.pos.z, md = Math.hypot(mx, mz);
          S.trick = S.trick || { t: +t.toFixed(1), minD: 1e9, crouchT: 0, windups: 0, near: 1e9 }; S.trick.minD = Math.min(S.trick.minD, +md.toFixed(1)); if (p.crouch) S.trick.crouchT += dt; S.trick.near = Math.min(S.trick.near, +e.dist(p).toFixed(1)); if (c.state === 'windup' && prevState !== 'windup') S.trick.windups++; S.trick.st = S.trick.st || {}; const sk = c.state + (e.h.action ? ':' + e.h.action.name : ''); S.trick.st[sk] = (S.trick.st[sk] || 0) + 1;
          atk = null; block = false; plan = null;
          if (md > 2.2) { p.cam.yaw = Math.atan2(mx, mz); mvKeys = { KeyW: true, KeyS: false, KeyA: false, KeyD: false }; if (p.crouch) { inp.simulate('KeyC', true); g.frame(dt, false); inp.simulate('KeyC', false); } }
          else { mvKeys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false }; if (!p.crouch && e.dist(p) < 6) { inp.simulate('KeyC', true); g.frame(dt, false); inp.simulate('KeyC', false); } }
          mouse0 = false; dodge = false; ward = false;
        }
      }
      // fire and stakes on the ground
      if (Math.random() < P.hazard) for (const h of g.combat.hazards) { const hx = p.pos.x - h.x, hz = p.pos.z - h.z, hd = Math.hypot(hx, hz); if (h.t > 0 && hd < h.r + 0.7) { const rel = Math.atan2(hx, hz) - ang; mvKeys = { KeyW: Math.cos(rel) > 0.3, KeyS: Math.cos(rel) < -0.3, KeyD: Math.sin(rel) > 0.3, KeyA: Math.sin(rel) < -0.3 }; } }
      if (dodge) { mvKeys = { KeyW: false, KeyS: false, KeyA: plan.side === 'KeyA', KeyD: plan.side === 'KeyD' }; }
      for (const k in mvKeys) set(k, mvKeys[k]);
      set('Mouse2', block); set('Mouse0', mouse0 && !block);
      if (dodge) { inp.simulate('Space', true); g.frame(dt, false); inp.simulate('Space', false); }
      if (ward) { inp.simulate('KeyZ', true); g.frame(dt, false); inp.simulate('KeyZ', false); }
      g.frame(dt, false);
      if (f % 240 === 239) await null;
    }
    if (!S.outcome) S.outcome = 'timeout';
    S.sec = +t.toFixed(1); S.hpLeft = Math.round(p.health); S.minHp = Math.round(S.minHp); S.bossLeft = e.cb ? +(e.cb.hp / maxHp).toFixed(2) : 0;
    for (const k in S.moves) S.moves[k].dmg = Math.round(S.moves[k].dmg);
    p.receive = rec; g.events.off('playerDied', onDie); g.events.off('ward', onWard);
    releaseAll(); d.manual(false);
    return S;
  }

  window.__bot = { PROFILES, load, ready, fight, boss };
  return 'bot ready';
})();
