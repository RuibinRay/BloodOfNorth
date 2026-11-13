// A shield wall: two lines of men, shield to shield, that shove, give ground, win it back and break.
//
// The line is cut into sectors. Each has its own ground (how far it has been pushed forward or back) and its own
// men, and the men are drawn as rank and file (entities/ranks.js) with the story's named fighters standing among them.
// The battle has a rhythm. They shove; their horn sounds and they rush; where the rush is held they reel, and for a few
// breaths the line can be pushed forward with the horn. Where it is not held the line gives ground, and where a sector
// sags behind its neighbours men come through it. Those are real opponents, and they are Eirik's.
// What Eirik does: stand in the line and raise his guard when they rush (the men near him hold); sound the horn when
// they reel; cut at their front rank (which cuts back); and kill the ones who come through.
import * as THREE from 'three';
import { clamp, damp, dampAngle, angleDiff } from '../core/util.js';
import { Ranks } from '../entities/ranks.js';
import { STORM } from '../entities/player.js';
import { WALL, PAINT } from '../data/shieldwall.js';
import { WallHUD } from '../ui/wallhud.js';

const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
const toward = (v, to, step) => (Math.abs(to - v) <= step ? to : v + Math.sign(to - v) * step);

export class ShieldWall {
  /**
   * o.a, o.b     the ends of our front rank ([x, z]) before any ground is won or lost
   * o.face       the way our men face (yaw); their line stands on that side of ours
   * o.heroes     named fighters (NPCs) who stand in our front rank, in order from a to b
   * o.anchors    ids of heroes whose part of the line does not give
   * o.mode       'hold' (stand through cfg.surges rushes) | 'push' (win cfg.goal metres) | 'auto' (it goes on by itself: seen, not played)
   * o.wait       their line stands off where it formed until go() is called
   * o.rest       a line standing with nobody in front of it (between two pushes): the men, and nothing else
   * o.arrive     { from(file, files) → [x, z], speed }: our men walk to their places from there (wading ashore, or coming up from the last line)
   * o.cfg        numbers over data/shieldwall.js;  o.paint  [ours, theirs] from PAINT;  o.thin  [ours, theirs] share of the rear ranks already gone
   * o.from       where their reserves come up from ([x, z] points)
   * o.spawn(x, z) → a real opponent standing there, armed (or null);  o.mine(e) sets him on Eirik
   * o.done(how), o.fail()
   */
  constructor(game, o) {
    const g = (this.g = game), C = (this.cfg = { ...WALL, ...(o.cfg || {}) });
    this.o = o; this.mode = o.mode || 'hold';
    if (this.mode === 'push') C.cap = Math.min(C.cap, C.goal + 0.6); // a push ends where their line breaks
    const [ax, az] = o.a, [bx, bz] = o.b;
    this.ax = ax; this.az = az; this.L = Math.hypot(bx - ax, bz - az); this.ux = (bx - ax) / this.L; this.uz = (bz - az) / this.L;
    let nx = -this.uz, nz = this.ux; if (nx * Math.sin(o.face) + nz * Math.cos(o.face) < 0) { nx = -nx; nz = -nz; } // their side of the line
    this.nx = nx; this.nz = nz; this.yaw = [Math.atan2(nx, nz), Math.atan2(-nx, -nz)];
    this.N = Math.max(4, Math.round(this.L / C.spacing) + 1); this.sp = this.L / (this.N - 1); this.S = Math.max(3, Math.round(this.L / C.sector));
    this.flip = this.ux * -nz + this.uz * nx < 0; // b is on Eirik's left as he faces them: the strip on screen runs the other way
    const S = this.S, arr = (v) => new Array(S).fill(v);
    this.off = arr(0); this.open = arr(false); this.reeling = arr(false); this.anchor = arr(false); this.cnt = [arr(0), arr(0)];
    this.phase = o.wait ? 'wait' : this.mode === 'auto' ? 'grind' : 'advance'; this.approach = this.phase === 'grind' ? 0 : C.approach; this.draw = 0; this.drawTo = 0; this.heave = [0, 0];
    this.T = 0; this.t = rnd(2, 4); this.attT = 1; this.trT = rnd(...C.trickle); this.thrT = 1.2; this.pushCd = 0; this.cryAt = -9; this.cryT = -9; this.sfxT = -9; this.cheerT = 0;
    this.surges = 0; this.pushes = 0; this.dead = [0, 0]; this.brk = []; this.stk = null; this.over = null; this.final = false; this.autoFlip = false;
    this.drift = 0; this.driftTo = 0; this.pt = 0; this.pd = -99; this.ps = 0; this.inLine = false;
    // the men
    this.R = Ranks.get(g.scene); this.figs = []; this.paint = (o.paint || ['ravenhold', 'wolves']).map((k) => PAINT[k]);
    this.rows = [0, 1].map((s) => Array.from({ length: C.ranks[s] }, () => new Array(this.N).fill(null)));
    this.hero = new Array(this.N).fill(null);
    (o.heroes || []).forEach((n, k, all) => { this.hero[all.length > 1 ? Math.round((k / (all.length - 1)) * (this.N - 1)) : this.N >> 1] = n; n.wallT = rnd(1, 4); });
    if (this.mode !== 'auto') for (const n of o.heroes || []) if (n.talk) { n.wallTalk = n.talk; n.talk = null; } // nobody in the front rank stops to talk
    for (let s = 0; s < 2; s++) for (let r = 0; r < C.ranks[s]; r++) for (let f = 0; f < this.N; f++) {
      if ((s === 0 && r === 0 && this.hero[f]) || (r > 0 && o.thin && Math.random() < o.thin[s])) continue;
      const m = this.add(s, r, f, true);
      if (m && s === 0 && o.arrive) { m.st = 'walk'; [m.x, m.z] = o.arrive.from(f, this.N); m.v = o.arrive.speed * rnd(0.88, 1.12); }
    }
    this.reserve = [...C.reserve]; this.count(); this.start = [this.total(0), this.total(1)];
    this.hud = new WallHUD(g); if (this.mode !== 'auto' && !o.wait) this.hud.show(S);
    this.subs = [g.events.on('playerSwing', (n, heavy, mod) => this.onSwing(heavy, mod)), g.events.on('thunder', () => this.onThunder()), g.events.on('stormCry', () => this.onCry())];
  }

  // ---- the shape of the line -------------------------------------------------------------------------
  /** How far the front has moved at a file: sectors are joined smoothly, so the line bows and does not step. */
  offAt(f) { const x = clamp(((f + 0.5) / this.N) * this.S - 0.5, 0, this.S - 1), i = Math.floor(x); return this.off[i] + (this.off[Math.min(this.S - 1, i + 1)] - this.off[i]) * (x - i); }
  sectorOf(f) { return clamp(Math.floor((f / this.N) * this.S), 0, this.S - 1); }
  /** Where a man of a side, rank and file stands (written to out.tx, out.tz). */
  slot(side, rank, f, out) {
    const C = this.cfg, along = (f + (rank % 2 && f < this.N - 1 ? 0.5 : 0)) * this.sp + (out.jx || 0), push = this.heave[side] * (rank ? 0.1 : 0.24);
    const d = this.offAt(f) + (out.jz || 0) + (side ? C.gap / 2 + rank * C.depth + this.approach + this.draw - push : -C.gap / 2 - rank * C.depth + push);
    out.tx = this.ax + this.ux * along + this.nx * d; out.tz = this.az + this.uz * along + this.nz * d;
    return out;
  }
  /** Where a side's reserves come up from. */
  rear(side, f) {
    if (side && this.o.from && this.o.from.length) { const p = pick(this.o.from); return [p[0] + rnd(-2, 2), p[1] + rnd(-2, 2)]; }
    const m = this.slot(side, this.rows[side].length - 1, f, {}), k = side ? 18 : -12;
    return [m.tx + this.nx * k + this.ux * rnd(-2, 2), m.tz + this.nz * k + this.uz * rnd(-2, 2)];
  }
  add(side, rank, file, placed) {
    const P = this.paint[side], i = this.R.take(pick(P.tunic), pick(P.cap), pick(P.design));
    if (i < 0) return null;
    const m = { i, side, rank, file, st: 'in', t: 0, hp: this.cfg.cut.hp, kind: Math.random() < (side ? 0.4 : 0.2) ? 1 : 0, ph: Math.random() * 6.28, jx: rnd(-0.12, 0.12), jz: rnd(-0.1, 0.1),
      armT: -1, armD: 0.6, next: rnd(0.5, 5.5), hit: 0, aim: 0, aimT: 0, yaw: this.yaw[side], sc: rnd(0.95, 1.06), x: 0, y: 0, z: 0, gy: null };
    this.rows[side][rank][file] = m; this.figs.push(m); this.slot(side, rank, file, m);
    if (placed) { m.x = m.tx; m.z = m.tz; }
    return m;
  }
  count() {
    this.cnt[0].fill(0); this.cnt[1].fill(0); this.anchor.fill(false);
    for (const m of this.figs) if (m.st === 'in' || m.st === 'walk') this.cnt[m.side][this.sectorOf(m.file)]++;
    for (let f = 0; f < this.N; f++) { const n = this.hero[f]; if (!n || !n.visible || n.dead) continue; const s = this.sectorOf(f); this.cnt[0][s] += 2; if (this.o.anchors && this.o.anchors.includes(n.id)) this.anchor[s] = true; }
  }
  total(side) { return this.cnt[side].reduce((a, b) => a + b, 0) + this.reserve[side]; }
  /** Heads, for the screen: a named fighter weighs two in the shoving and is one man. */
  men(side) { return this.total(side) - (side ? 0 : this.hero.filter((n) => n && n.visible && !n.dead).length); }
  mean() { return this.off.reduce((a, b) => a + b, 0) / this.S; }
  /** The men who have come through and are still up. */
  live() { return this.brk.map((b) => b.e); }
  /** How well our men in a sector kill, against theirs. */
  edge(s) { let k = this.cfg.edge; if (this.anchor[s]) k *= 1.3; if (this.inLine && Math.abs(this.ps - s) <= 1) k *= 1.3; if (this.open[s]) k *= 0.65; return k; }
  /** Where Eirik is, in the line's own terms: along it (pt), ahead of the middle of the gap (pd), his sector, and whether he stands in it. */
  locate() {
    const p = this.g.player.pos, dx = p.x - this.ax, dz = p.z - this.az;
    this.pt = dx * this.ux + dz * this.uz; const f = clamp(this.pt / this.sp, 0, this.N - 1);
    this.pd = dx * this.nx + dz * this.nz - this.offAt(f); this.ps = this.sectorOf(f);
    this.inLine = this.pt > -3 && this.pt < this.L + 3 && this.pd > -this.cfg.inLine && this.pd < 1.4;
  }
  /** Left or right of where he stands, as he faces them. */
  where(s) {
    if (Math.abs(this.pd) > 14 || this.pt < -6 || this.pt > this.L + 6) { const k = this.flip ? this.S - 1 - s : s; return k < this.S / 3 ? 'on the left' : k >= (this.S * 2) / 3 ? 'on the right' : 'in the centre'; }
    return s === this.ps ? 'where you stand' : (s - this.ps) * (this.flip ? -1 : 1) > 0 ? 'on the right' : 'on the left';
  }

  // ---- men falling, and the ranks closing up ---------------------------------------------------------------
  /** A man of that side falls in that sector: the front rank first. */
  fell(side, s, by = false) {
    const f0 = Math.floor((s * this.N) / this.S), n = Math.max(1, Math.floor(((s + 1) * this.N) / this.S) - f0), k0 = (Math.random() * n) | 0;
    for (const row of this.rows[side]) for (let k = 0; k < n; k++) { const m = row[f0 + ((k + k0) % n)]; if (m && m.st === 'in') { this.kill(m, by); return m; } }
    return null;
  }
  kill(m, by = false) {
    const g = this.g, p = g.player;
    if (m.st !== 'in' && m.st !== 'walk') return;
    if (this.rows[m.side][m.rank][m.file] === m) this.rows[m.side][m.rank][m.file] = null;
    m.st = 'fall'; m.t = 0; m.dir = Math.random() < 0.8 ? -1 : 1; m.armT = -1; this.dead[m.side]++;
    const d = Math.hypot(m.x - p.pos.x, m.z - p.pos.z);
    if (d < 26) g.fx.burst('blood', m.x, m.y + 1.2, m.z, by ? 9 : 4);
    if (d < 16 && this.T - this.cryT > 0.4) { this.cryT = this.T; g.audio.play('hurt', { vol: clamp(0.5 - d / 40, 0.08, 0.45) }); }
    if (by) { g.state.xp += 2; p.ward = Math.min(100, p.ward + 5); }
    this.fill(m.side, m.file);
  }
  /** The man behind steps up; a reserve comes to the rear; and if a file is empty a man crosses from a deeper one beside it. */
  fill(side, f) {
    const rows = this.rows[side], R = rows.length, hero = side === 0 && !!this.hero[f];
    for (let r = hero ? 1 : 0; r < R - 1; r++) { const m = rows[r + 1][f]; if (!rows[r][f] && m) { rows[r + 1][f] = null; rows[r][f] = m; m.rank = r; } }
    if (!rows[R - 1][f] && this.reserve[side] > 0 && !(hero && R === 1)) { const m = this.add(side, R - 1, f, false); if (m) { this.reserve[side]--; m.st = 'walk'; [m.x, m.z] = this.rear(side, f); } }
    if (hero || rows[0][f]) return;
    for (const d of [1, -1, 2, -2, 3, -3]) { const f2 = f + d; if (f2 < 0 || f2 >= this.N) continue; for (let r = R - 1; r >= 1; r--) { const m = rows[r][f2]; if (m && m.st === 'in') { rows[r][f2] = null; rows[0][f] = m; m.rank = 0; m.file = f; return; } } }
  }
  wound(m, dmg, by) { if (m.st !== 'in') return; m.hp -= dmg; if (m.hp <= 0) this.kill(m, by); else { m.hit = 0.35; this.g.fx.burst('blood', m.x, m.y + 1.25, m.z, 3); } }
  /** Everything of theirs inside a ring: a maul's slam, or the Thunder Smash. */
  blast(x, z, r, dmg) { let n = 0; for (const m of [...this.figs]) if (m.side === 1 && (m.st === 'in' || m.st === 'walk') && Math.hypot(m.x - x, m.z - z) < r) { m.st = 'in'; this.wound(m, dmg, true); n++; } return n; }
  rout(side) {
    const back = this.yaw[side] + Math.PI;
    for (const m of this.figs) if (m.side === side && (m.st === 'in' || m.st === 'walk')) { m.st = 'rout'; m.t = 0; m.yaw = back + rnd(-0.5, 0.5); m.v = rnd(4.2, 5.6); m.life = rnd(5, 8); }
    this.rows[side].forEach((r) => r.fill(null)); this.reserve[side] = 0;
  }

  // ---- the rhythm: shove, rush, reel -------------------------------------------------------------------------
  /** The noise of two walls meeting, louder the nearer he is. */
  din(k) {
    const g = this.g, p = g.player, near = clamp(1 - (Math.abs(this.pd) - 4) / 40, 0.15, 1) * k;
    g.audio.play('thud', { vol: 0.9 * near }); g.audio.play('clack', { vol: 0.8 * near }); g.after(0.08, () => g.audio.play('clack', { vol: 0.6 * near })); g.after(0.17, () => g.audio.play('steel', { vol: 0.4 * near })); g.audio.play('shout', { vol: 0.8 * near });
    if (Math.abs(this.pd) < 12) p.cam.shake = Math.max(p.cam.shake, 0.38 * k * near);
    const f = clamp(Math.round(this.pt / this.sp), 0, this.N - 1), m = {};
    for (const d of [-6, -3, 0, 3, 6]) { const ff = clamp(f + d, 0, this.N - 1); this.slot(0, 0, ff, m); g.fx.burst('dust', m.tx + this.nx * 0.7, g.world.groundAt(m.tx, m.tz) + 0.3, m.tz + this.nz * 0.7, 5); }
  }
  /** Their line, which has been standing off, comes on. Anything given here replaces what the wall was made with (mode, done, fail). */
  go(o = {}) {
    if (this.phase !== 'wait') return;
    Object.assign(this.o, o); this.mode = this.o.mode || this.mode; this.phase = 'advance';
    if (this.mode === 'push') this.cfg.cap = Math.min(this.cfg.cap, this.cfg.goal + 0.6);
    if (this.mode !== 'auto') for (const n of this.o.heroes || []) if (n.talk) { n.wallTalk = n.talk; n.talk = null; }
    if (this.mode !== 'auto') this.hud.show(this.S);
    this.g.audio.play('horn', { freq: 74, vol: 0.6 }); this.g.audio.play('shout');
  }
  /** Named fighters leave the line (Eirik has taken them somewhere else): the rank closes over their places. */
  leave(npcs) { this.talkAgain(npcs); for (let f = 0; f < this.N; f++) if (this.hero[f] && npcs.includes(this.hero[f])) { this.hero[f] = null; this.fill(0, f); } }
  talkAgain(npcs = this.o.heroes || []) { for (const n of npcs) if (n.wallTalk) { n.talk = n.wallTalk; n.wallTalk = null; } }
  /** The two lines meet for the first time. */
  crash() {
    const g = this.g, C = this.cfg;
    this.phase = 'grind'; this.t = rnd(...C.grind); this.approach = 0; this.heave[0] = this.heave[1] = 1; this.din(1);
    for (let s = 0; s < this.S; s += 2) { this.fell(0, s); this.fell(1, s + 1 < this.S ? s + 1 : s); }
    for (const n of this.hero) if (n && n.visible && !n.dead && !n.h.busy) n.h.play('blockhit', 0.4);
    if (this.inLine && !(g.player.blocking || g.input.held('block'))) g.player.h.play('stagger', 0.4);
    g.ui.toast('The shield walls crash together');
  }
  /** Their horn: they draw back half a step, and then they come. */
  sound() {
    const g = this.g;
    this.phase = 'warn'; this.t = this.cfg.warn; this.drawTo = 0.7;
    g.audio.play('horn', { freq: 74, vol: 0.6 }); g.ui.alert(true);
  }
  rush() {
    const g = this.g, C = this.cfg, p = g.player, W = this.L / this.S;
    this.surges++; this.drawTo = 0; this.draw = -0.25; this.heave[1] = 1; this.heave[0] = 0.5;
    const braced = this.inLine && (p.blocking || g.input.held('block') || this.T - this.cryAt < 2.5), gave = [];
    let held = 0;
    for (let s = 0; s < this.S; s++) {
      const o = this.cnt[0][s], e = Math.max(1, this.cnt[1][s]), near = braced && Math.abs(this.pt - (s + 0.5) * W) <= C.braceR + W / 2;
      const chance = this.open[s] ? 0 : near ? 1 : this.anchor[s] ? 0.92 : clamp(C.stand + 0.5 * ((o * C.edge) / e - 1) + (braced ? 0.12 : 0), 0.1, 0.85);
      if (Math.random() < chance) { held++; this.reeling[s] = true; this.fell(1, s); }
      else { this.reeling[s] = false; this.off[s] -= C.give * rnd(0.8, 1.2); this.fell(0, s); if (Math.random() < 0.5) this.fell(0, s); gave.push(s); }
    }
    for (const n of this.hero) if (n && n.visible && !n.dead && !n.h.busy) n.h.play('blockhit', 0.4);
    if (this.inLine) {
      const m = this.slot(1, 0, clamp(Math.round(this.pt / this.sp), 0, this.N - 1), {}), from = new THREE.Vector3(m.tx, p.pos.y, m.tz);
      if (braced) { p.stamina = Math.max(0, p.stamina - C.braceCost); p.ward = Math.min(100, p.ward + 8); p.h.play('blockhit', 0.3); g.fx.burst('spark', p.pos.x + this.nx * 0.6, p.pos.y + 1.2, p.pos.z + this.nz * 0.6, 9); }
      else p.receive({ pos: from }, C.rushDmg, { unblockable: true });
    }
    this.din(1);
    if (held * 2 >= this.S) { this.phase = 'reel'; this.t = C.reel; g.ui.toast(gave.length ? `The line gives ${this.where(gave[0])}, but they reel` : 'The line holds. They reel'); }
    else { this.phase = 'grind'; this.t = rnd(...C.grind); this.reeling.fill(false); g.ui.toast(`The line gives ground ${this.where(gave[(Math.random() * gave.length) | 0])}`); }
    if (this.mode === 'hold' && this.surges >= C.surges) { this.final = true; if (this.phase === 'grind') this.rest(); }
  }
  /** Mode 'hold': the last rush has been stood through. */
  rest() { if (!this.final || this.over) return; this.final = false; this.g.after(1.4, () => { if (!this.over && !this.gone) this.win('held'); }); }
  rhythm(dt) {
    const C = this.cfg;
    if (this.mode === 'auto') { // it goes on by itself: a heave now and then, and ground won or lost if it was told to
      if ((this.t -= dt) <= 0) { this.t = rnd(3, 6); this.heave[Math.random() < 0.5 ? 0 : 1] = 0.8; if (Math.abs(this.pd) < 40) this.din(0.35); }
      if (this.drift) for (let s = 0; s < this.S; s++) this.off[s] = toward(this.off[s], this.driftTo, this.drift * dt);
      return;
    }
    this.t -= dt; this.pushCd -= dt;
    if (this.t > 0) return;
    if (this.phase === 'grind') this.sound();
    else if (this.phase === 'warn') this.rush();
    else if (this.phase === 'reel') { this.phase = 'grind'; this.t = rnd(...C.grind); this.reeling.fill(false); this.rest(); }
  }
  /** Men fall along the line all the time; the stronger side creeps forward; a sector is pulled level with its neighbours. */
  wear(dt) {
    const C = this.cfg, auto = this.mode === 'auto';
    if ((this.attT -= dt) <= 0) {
      this.attT = C.attrition * rnd(0.7, 1.3) * (auto ? 2.6 : 1) * (this.phase === 'warn' ? 2 : 1);
      const s = (Math.random() * this.S) | 0, o = this.cnt[0][s], e = this.cnt[1][s];
      const ours = auto ? (this.autoFlip = !this.autoFlip) : Math.random() < e / (e + o * this.edge(s) + 1e-3);
      if (!auto || this.total(ours ? 0 : 1) > this.start[ours ? 0 : 1] * C.autoFloor[ours ? 0 : 1]) this.fell(ours ? 0 : 1, s);
    }
    for (let s = 0; s < this.S; s++) {
      const o = this.cnt[0][s] * this.edge(s), e = this.cnt[1][s];
      if (!auto) this.off[s] += clamp(((o - e) / (o + e + 1e-3)) * 2, -1, 1) * C.creep * dt - (this.open[s] ? C.breach.sag * dt : 0);
      this.off[s] += ((this.off[Math.max(0, s - 1)] + this.off[Math.min(this.S - 1, s + 1)]) / 2 - this.off[s]) * C.tension * dt;
    }
  }
  /** Where the line gives way: men come through a sector that sags, and one gets through now and then anyway. */
  gaps(dt) {
    const g = this.g, C = this.cfg;
    this.brk = this.brk.filter((b) => !b.e.dead && b.e.visible && b.e.cb);
    for (let s = 0; s < this.S; s++) if (this.open[s] && !this.brk.some((b) => b.s === s)) { this.open[s] = false; this.off[s] += C.breach.rally; this.heave[0] = 0.7; g.ui.toast('The gap is closed'); }
    if (this.mode === 'auto' || !this.o.spawn) return;
    for (let s = 0; s < this.S && this.brk.length < C.atOnce; s++) {
      if (this.open[s]) continue;
      if (Math.max(this.off[Math.max(0, s - 1)], this.off[Math.min(this.S - 1, s + 1)]) - this.off[s] > C.breach.at) this.through(s, C.breach.men, true);
    }
    if ((this.trT -= dt) <= 0) { this.trT = rnd(...C.trickle); if (this.brk.length < Math.min(2, C.atOnce)) this.through(clamp(this.ps + ((Math.random() * 3) | 0) - 1, 0, this.S - 1), 1, false); }
  }
  /** Men of theirs step out of their front rank and through ours. */
  through(s, n, breach) {
    const g = this.g; let got = 0;
    for (let k = 0; k < n && this.brk.length < this.cfg.atOnce; k++) {
      const f = clamp(Math.round(((s + 0.5) * this.N) / this.S + rnd(-2, 2)), 0, this.N - 1), m = this.slot(1, 0, f, {}), e = this.o.spawn(m.tx - this.nx * 0.3, m.tz - this.nz * 0.3);
      if (!e) break;
      e.yaw = this.yaw[1]; e.root.rotation.y = e.yaw; this.o.mine(e); this.brk.push({ e, s }); got++;
      const was = this.rows[1][0][f]; if (was && was.st === 'in') { this.rows[1][0][f] = null; was.st = 'gone'; this.fill(1, f); } // he was a man of their rank: one fewer in it
    }
    if (got && breach) { this.open[s] = true; g.ui.toast(`They are through ${this.where(s)}!`); g.audio.play('shout'); if (s !== this.ps) g.ui.warn((s - this.ps) * (this.flip ? -1 : 1) > 0 ? 'r' : 'l'); }
    return got;
  }
  /** Their front rank against Eirik: whoever of them he stands within reach of thrusts at him, one at a time, with a moment's warning. */
  threat(dt) {
    const g = this.g, p = g.player, C = this.cfg.thrust;
    if (this.stk) {
      const m = this.stk.m;
      if (m.st !== 'in') { this.stk = null; return; }
      if ((this.stk.t -= dt) > 0) return;
      this.stk = null; this.thrT = rnd(...C.every); g.audio.play('whoosh', { vol: 0.5 });
      if (Math.hypot(p.pos.x - m.x, p.pos.z - m.z) > C.reach + 0.5 || p.frozen) return;
      const res = p.receive({ pos: new THREE.Vector3(m.x, m.y, m.z) }, C.dmg);
      if (res === 'parried') this.wound(m, 1, true); else if (res === 'warded') this.wound(m, 9, true);
      return;
    }
    if (p.frozen || g.ravens.eye) return;
    let best = null, bd = C.reach; const f0 = Math.round(this.pt / this.sp);
    for (const row of this.rows[1]) for (let f = Math.max(0, f0 - 3); f <= Math.min(this.N - 1, f0 + 3); f++) { const m = row[f]; if (!m || m.st !== 'in') continue; const d = Math.hypot(p.pos.x - m.x, p.pos.z - m.z); if (d < bd) { bd = d; best = m; } }
    if (!best) { this.thrT = Math.max(this.thrT, 0.5); return; }
    if ((this.thrT -= dt) > 0) return;
    this.stk = { m: best, t: C.warn }; best.armT = 0; best.armD = C.warn / 0.6; best.aim = Math.atan2(p.pos.x - best.x, p.pos.z - best.z); best.aimT = C.warn + 0.3;
    g.ui.alert(false);
  }
  /** Their formation is a solid thing: he cannot walk into it. */
  keepOut() {
    const p = this.g.player.pos, C = this.cfg, e0 = this.approach + this.draw + C.gap / 2 - 0.7, e1 = this.approach + C.gap / 2 + (this.rows[1].length - 1) * C.depth + 0.7;
    if (this.pt < -1 || this.pt > this.L + 1 || this.pd <= e0 || this.pd >= e1) return;
    const d0 = this.pd - e0, d1 = e1 - this.pd, dl = this.pt + 1, dr = this.L + 1 - this.pt, m = Math.min(d0, d1, dl, dr);
    if (m === d0) { p.x -= this.nx * d0; p.z -= this.nz * d0; } else if (m === d1) { p.x += this.nx * d1; p.z += this.nz * d1; }
    else if (m === dl) { p.x -= this.ux * dl; p.z -= this.uz * dl; } else { p.x += this.ux * dr; p.z += this.uz * dr; }
  }

  // ---- what Eirik does to them -----------------------------------------------------------------------------------
  /** His blade against their front rank: some blows get past the shield, and two of those put a man down. */
  onSwing(heavy, mod = {}) {
    const g = this.g, p = g.player, C = this.cfg.cut;
    if (this.over || this.gone || !p.isMelee()) return;
    const W = p.weaponDef();
    if (heavy && W.slam && !mod.noSlam) { this.blast(p.pos.x + Math.sin(p.yaw) * 1.7, p.pos.z + Math.cos(p.yaw) * 1.7, W.slam, 2); return; }
    const reach = W.reach + (mod.reach || 0) + 0.25, near = [], f0 = Math.round(this.pt / this.sp);
    for (const row of this.rows[1]) for (let f = Math.max(0, f0 - 4); f <= Math.min(this.N - 1, f0 + 4); f++) {
      const m = row[f]; if (!m || m.st !== 'in') continue;
      const d = Math.hypot(m.x - p.pos.x, m.z - p.pos.z);
      if (d < reach && Math.abs(angleDiff(p.yaw, Math.atan2(m.x - p.pos.x, m.z - p.pos.z))) < W.arc * (mod.arc || 1)) near.push({ m, d });
    }
    near.sort((a, b) => a.d - b.d);
    let hits = 0; const max = W.sweep[heavy ? 1 : 0] + (mod.sweep || 0);
    for (const { m } of near) {
      if (mod.pierce || Math.random() < (heavy ? C.heavy : C.light)) { this.wound(m, heavy ? 2 : 1, true); g.hitStop = Math.max(g.hitStop || 0, heavy ? 0.07 : 0.04); g.audio.play('arrowHit'); p.cam.shake = Math.max(p.cam.shake, heavy ? 0.2 : 0.1); }
      else { m.hit = 0.16; g.audio.play(W.real ? 'steel' : 'clack', { vol: 0.7 }); g.fx.burst(W.real ? 'spark' : 'chips', m.x + Math.sin(m.yaw) * 0.5, m.y + 1.15, m.z + Math.cos(m.yaw) * 0.5, 6); }
      if (++hits >= max) break;
    }
  }
  onThunder() { const p = this.g.player; if (this.over || this.gone) return; if (this.blast(p.pos.x + Math.sin(p.yaw) * 1.5, p.pos.z + Math.cos(p.yaw) * 1.5, STORM.smashR, 3)) this.heave[1] = 0.6; }
  /** The Storm-Cry breaks a rush as well as a raised shield does. */
  onCry() { const p = this.g.player.pos; if (this.over || this.gone) return; this.cryAt = this.T; for (const m of this.figs) if (m.side === 1 && m.st === 'in' && Math.hypot(m.x - p.x, m.z - p.z) < STORM.cryR) m.hit = 0.5; }
  /** The horn: forward, if they are reeling. Sounded when their shields are set, it costs men. */
  horn() {
    const g = this.g, C = this.cfg, p = g.player;
    if (this.pushCd > 0 || this.phase === 'advance' || this.phase === 'wait' || this.pd < -C.hearR) return;
    this.pushCd = C.pushCd; g.audio.play('horn', { freq: 147, vol: 0.6 });
    if (this.phase !== 'reel') { for (let k = 0; k < C.early; k++) this.fell(0, (Math.random() * this.S) | 0); this.heave[0] = 0.6; g.ui.toast('Too soon. Their shields were set'); return; }
    for (let s = 0; s < this.S; s++) { this.off[s] = Math.max(this.off[s], Math.min(C.cap, this.off[s] + C.gain * (this.open[s] ? 0.3 : this.reeling[s] ? 1 : 0.8))); this.fell(1, s); }
    this.fell(1, this.ps); this.heave[0] = 1; this.pushes++; this.phase = 'grind'; this.t = rnd(...C.grind); this.reeling.fill(false);
    g.audio.play('shout'); g.after(0.15, () => g.audio.play('shout', { vol: 0.7 })); this.din(0.8); g.ui.toast('The line goes forward');
    for (const n of this.hero) if (n && n.visible && !n.dead && !n.h.busy) n.h.play('shove', 0.5);
    this.rest();
  }

  // ---- how it ends ---------------------------------------------------------------------------------------------
  judge() {
    const C = this.cfg;
    if (this.mode === 'auto') return;
    const mean = this.mean();
    if (mean <= C.lose || this.total(0) <= this.start[0] * C.loseMen) return this.lose();
    if (this.total(1) <= this.start[1] * C.breakMen || (this.mode === 'push' && mean >= C.goal)) this.win('broke');
  }
  /** 'broke': their line breaks and runs. 'held': it has been stood through, and the fight goes on without him. */
  win(how) {
    const g = this.g;
    if (this.over) return;
    this.hud.hide(); this.stk = null; this.cheerT = 3.2; this.talkAgain();
    if (how === 'broke') {
      this.over = how; this.rout(1); g.audio.play('horn', { freq: 147, vol: 0.5 }); g.audio.play('shout'); g.after(0.3, () => g.audio.play('shout'));
      for (const e of this.live()) { g.combat.enemies = g.combat.enemies.filter((x) => x !== e); e.cb = null; e.mode = 'idle'; e.setLoop(null); const [x, z] = this.rear(1, 0); e.goTo(x, z, { run: true, onArrive: (o) => { o.visible = false; } }); } // the ones who came through run with the rest
      if (!g.combat.alive().length) g.combat.clear();
    } else { // the line closes over the ones who came through
      this.mode = 'auto'; this.phase = 'grind'; this.t = 3; this.drawTo = 0; this.reeling.fill(false); this.open.fill(false);
      for (const e of this.live()) if (e.cb && !e.dead) g.combat.kill(e);
      if (!g.combat.alive().length) g.combat.clear();
    }
    this.brk = [];
    g.after(2.2, () => { if (!this.gone && this.o.done) this.o.done(how); });
  }
  lose() { if (this.over) return; this.over = 'lost'; this.hud.hide(); this.rout(0); this.g.audio.play('horn', { freq: 74, vol: 0.6 }); if (this.o.fail) this.o.fail(); }
  /** Take every man off the field. */
  dispose() { this.talkAgain(); for (const m of this.figs) this.R.free(m.i); this.figs = []; this.R.commit(); this.hud.hide(); for (const off of this.subs) off(); this.gone = true; }
  /** For tests. */
  info() { return { mode: this.mode, phase: this.phase, over: this.over, t: +this.t.toFixed(1), off: this.off.map((v) => +v.toFixed(2)), mean: +this.mean().toFixed(2), ours: this.total(0), theirs: this.total(1), men: [this.men(0), this.men(1)], start: this.start, surges: this.surges, pushes: this.pushes, through: this.brk.length, open: this.open.map(Number), inLine: this.inLine, pd: +this.pd.toFixed(1), figs: this.figs.length, drawn: this.R.n }; }

  // ---- every frame -----------------------------------------------------------------------------------------------
  /** live: the game is being played (not a scene or a conversation); the men still breathe and shove when it is not. */
  update(dt, live = true) {
    const g = this.g;
    if (this.gone) return;
    this.T += dt; this.count();
    if (live && !this.over && !this.o.rest) {
      this.locate();
      if (this.phase === 'wait') this.threat(dt);
      else if (this.phase === 'advance') { this.approach = Math.max(0, this.approach - this.cfg.pace * dt); this.threat(dt); if (this.approach <= 0) this.crash(); }
      else {
        this.rhythm(dt); this.wear(dt); this.gaps(dt); this.threat(dt);
        if (this.mode !== 'auto' && g.input.hit('horn')) this.horn();
        this.judge();
      }
      if (!this.over) this.keepOut();
    }
    for (const s of [0, 1]) this.heave[s] = damp(this.heave[s], 0, 5, dt);
    this.draw = damp(this.draw, this.drawTo, 4, dt); this.cheerT -= dt;
    this.heroes(dt, live); this.figures(dt); this.R.commit();
    if (this.mode !== 'auto' && !this.over && this.phase !== 'wait') this.show();
  }
  /** The named fighters keep their places in the front rank as it moves, and strike over the rim. */
  heroes(dt, live) {
    const m = {};
    for (let f = 0; f < this.N; f++) {
      const n = this.hero[f];
      if (!n || !n.visible || n.dead || n.wounded || n.mode !== 'idle') continue; // walking to his place, or fighting a man of his own
      this.slot(0, 0, f, m); const dx = m.tx - n.pos.x, dz = m.tz - n.pos.z, d = Math.hypot(dx, dz);
      if (d > 7) continue; // he is somewhere else in the scene
      if (d > 0.1) { const st = Math.min(d, 1.9 * dt); n.pos.x += (dx / d) * st; n.pos.z += (dz / d) * st; if (d > 0.45) n.speed = 1.3; }
      n.yaw = dampAngle(n.yaw, this.yaw[0], 6, dt); n.loop = 'guard';
      if (!live || n.h.busy) continue;
      if (this.cheerT > 0) n.h.play('cheer', 1.0);
      else if (this.phase !== 'advance' && this.phase !== 'wait' && !this.over && !this.o.rest && (n.wallT = (n.wallT ?? 2) - dt) <= 0) { n.wallT = rnd(2.2, 5.5); n.h.play(n.h.held('R') === 'spear' ? 'thrust' : 'atk' + (1 + ((Math.random() * 3) | 0)), 0.62); }
    }
  }
  /** Rank and file: each man to his place, shoving, striking, recoiling, falling, lying, running. */
  figures(dt) {
    const g = this.g, R = this.R, T = this.T, lie = this.cfg.lie, keep = [], p = g.player.pos, cam = g.camera.position;
    for (const m of this.figs) {
      let pitch = 0, arm = 0, y = 0, fwd = 0, sc = m.sc;
      if (m.st === 'gone') { R.free(m.i); continue; }
      if (m.st === 'walk') { // coming up from the rear
        this.slot(m.side, m.rank, m.file, m); const dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz), st = Math.min(d, (m.v || 3.6) * dt);
        if (d > 1e-3) { m.x += (dx / d) * st; m.z += (dz / d) * st; m.yaw = dampAngle(m.yaw, Math.atan2(dx, dz), 8, dt); }
        if (d < 0.5) m.st = 'in';
        y = Math.abs(Math.sin(T * 9 + m.ph)) * 0.05; pitch = 0.06; m.gy = null;
      } else if (m.st === 'in') {
        this.slot(m.side, m.rank, m.file, m); const dx = m.tx - m.x, dz = m.tz - m.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.004) { const k = 1 - Math.exp(-7 * dt); m.x += dx * k; m.z += dz * k; m.gy = null; }
        m.yaw = dampAngle(m.yaw, m.aimT > 0 ? m.aim : this.yaw[m.side], 6, dt); m.aimT -= dt;
        const front = m.rank === 0;
        pitch = Math.sin(T * 1.7 + m.ph) * 0.03 + this.heave[m.side] * (front ? 0.2 : 0.1); y = Math.sin(T * 2.3 + m.ph) * 0.012;
        if (this.cheerT > 0 && m.side === 0) { arm = -0.5 - Math.sin(T * 9 + m.ph) * 0.3; y += Math.abs(Math.sin(T * 6 + m.ph)) * 0.08; pitch = -0.05; }
        else if (m.armT >= 0) { // a spear over the rim: drawn back, out, and home again
          m.armT += dt; const k = m.armT / m.armD;
          arm = k < 0.45 ? -0.55 * (k / 0.45) : k < 0.6 ? -0.55 + 1.55 * ((k - 0.45) / 0.15) : Math.max(0, 1 - (k - 0.6) / 0.4);
          if (k > 0.45 && k < 0.8) pitch += 0.12; if (k >= 1) m.armT = -1;
        } else if (front && this.phase !== 'advance' && this.phase !== 'wait' && !this.over && !this.o.rest && (m.next -= dt) <= 0) {
          m.next = rnd(1.6, 5.5); m.armT = 0; m.armD = rnd(0.5, 0.75);
          const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < 18 && T - this.sfxT > 0.3) { this.sfxT = T; g.audio.play(Math.random() < 0.6 ? 'clack' : 'steel', { vol: clamp(0.4 - d / 50, 0.05, 0.35) }); }
        }
        if (m.hit > 0) { m.hit -= dt; const k = Math.min(1, m.hit / 0.3); pitch -= 0.3 * k; fwd = -0.18 * k; }
      } else if (m.st === 'fall') {
        m.t += dt; const k = Math.min(1, m.t / 0.7), e = k * k; pitch = m.dir * 1.5 * e; y = 0.13 * e; arm = 0.3 * e;
        if (k >= 1) { m.st = 'down'; m.t = 0; }
      } else if (m.st === 'down') { // the fallen lie where they fell for a while, and then the ground has them
        m.t += dt; pitch = m.dir * 1.5; y = 0.13 - Math.max(0, m.t - lie) * 0.4; arm = 0.3;
        if (m.t > lie + 1.6) { R.free(m.i); continue; }
      } else if (m.st === 'rout') {
        m.t += dt; m.x += Math.sin(m.yaw) * m.v * dt; m.z += Math.cos(m.yaw) * m.v * dt; m.gy = null;
        y = Math.abs(Math.sin(T * 11 + m.ph)) * 0.07; pitch = 0.22; arm = -0.2; sc *= clamp((m.life - m.t) / 0.6, 0, 1);
        if (m.t > m.life) { R.free(m.i); continue; }
      }
      if (m.gy === null) m.gy = g.world.groundAt(m.x, m.z);
      m.y = m.gy;
      let ox = Math.sin(m.yaw) * fwd, oz = Math.cos(m.yaw) * fwd;
      if (m.side === 0 && (m.st === 'in' || m.st === 'walk')) { // our men make room for Eirik, and the one the camera is standing in is not drawn
        const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
        if (d < 1.05 && d > 1e-3) { ox += (dx / d) * (1.05 - d); oz += (dz / d) * (1.05 - d); }
        if (Math.hypot(m.x - cam.x, m.z - cam.z) < 1.5) sc = 0;
      }
      R.set(m.i, m.x + ox, m.gy + y, m.z + oz, m.yaw, pitch, arm, m.kind, sc);
      keep.push(m);
    }
    this.figs = keep;
  }
  /** The strip at the top of the screen. */
  show() {
    const C = this.cfg, S = this.S, mean = this.mean(), push = this.mode === 'push';
    const order = [...Array(S).keys()]; if (this.flip) order.reverse();
    const state = order.map((s) => (this.open[s] ? 'open' : this.phase === 'reel' && this.reeling[s] ? 'reel' : this.off[s] < mean - 0.9 || this.cnt[0][s] < this.cnt[1][s] * 0.55 ? 'sag' : ''));
    let text, tone = '';
    if (this.phase === 'advance') text = 'They are coming on';
    else if (this.phase === 'warn') { text = this.inLine ? 'Their horn. Brace: hold {block}' : 'Their horn. Get into the line and hold {block}'; tone = 'red'; }
    else if (this.phase === 'reel') { text = 'They reel. Sound the horn: {horn}'; tone = 'hot'; }
    else if (!this.inLine && this.pd < -C.inLine) text = 'Stand in the line: the men near you hold';
    else text = push ? `Ground won: ${Math.max(0, Math.round(mean))} of ${C.goal} paces` : `Rushes stood: ${this.surges} of ${C.surges}`;
    this.hud.update({ off: order.map((s) => Math.round(this.off[s] * 5) / 5), lo: C.lose, hi: push ? C.goal : -C.lose, state, me: Math.abs(this.pd) < 14 ? order.indexOf(this.ps) : -1,
      ours: this.men(0), theirs: this.men(1), progress: push ? mean / C.goal : this.surges / C.surges, text, tone });
  }
}
