// Island life (first version). The people of the great islands are not placed by hand and are not all there at
// once: a small crew of them is brought in round Eirik as he moves, each at a JOB (a spot with something to do
// that repeats: hammering, hoeing, fishing off the pier, standing guard) or on a ROUTE (walking a road from one
// end to the other and back). They appear only on dry land or a deck, never in water, never closer than SPAWN.min
// in front of him (SPAWN.near behind his back) and never further than SPAWN.far; they are taken away again beyond SPAWN.gone. Design notes and what comes next:
// docs/FEATURE_PLAN.md. They are ordinary folk of the open world: they talk, they see crimes, they kneel to a king.
import { GREAT, PLACES } from '../world/layout.js';
import { greatAt } from '../world/realm.js';

/** How many, and how near. All in metres. */
export const SPAWN = { max: 9, near: 9, min: 24, far: 80, gone: 96, every: 0.6 };

/** Jobs: [place, dx, dz, loop, held item, what they face (dx, dz) or null]. A job is done on the spot, over and over. */
const JOBS = {
  jarnoy: [['landing', 26, -2, 'fish', 'rod', [8, 0]], ['landing', 18, -1, 'fish', 'rod', [8, 2]], ['hall', 8, 10, 'guard', 'spear', [0, 8]], ['town', 2, 8, 'talk', null, [3, 0]], ['town', 5, 8, 'talk', null, [-3, 0]],
    ['furnaces', -6, -2, 'hammer', 'hammer', [-2, -4]], ['furnaces', -16, -4, 'chopping', 'woodaxe', [-2, -4]], ['shore', 12, 6, 'hoe', 'hoe', null], ['town', -20, 20, 'weave', null, null], ['hamlet', 2, -8, 'mourn', null, null]],
  solvik: [['quay', -52, -20, 'fish', 'rod', [-8, 0]], ['quay', -52, 22, 'carry', 'firewood', null], ['quay', -6, 6, 'talk', null, [3, 0]], ['quay', -3, 6, 'talk', null, [-3, 0]], ['quay', 30, 12, 'sit', null, null],
    ['hall', 4, 10, 'guard', 'spear', [0, 8]], ['quay', -30, 30, 'weave', null, null], ['quay', 44, 34, 'mourn', null, null], ['quay', 20, -20, 'hoe', 'hoe', null]],
  myrholm: [['landing', 0, -34, 'fish', 'rod', [0, -8]], ['hall', 0, 12, 'guard', 'spear', [0, 8]], ['hall', -8, 14, 'cook', null, null], ['hall', 10, 26, 'talk', null, [-3, 2]], ['hall', 7, 28, 'talk', null, [3, -2]],
    ['stiltsW', 2, 2, 'weave', null, null], ['stiltsE', 2, 2, 'sit', null, null], ['peat', -3, 2, 'hoe', 'hoe', null]],
  skalloy: [['landing', -30, 0, 'fish', 'rod', [-8, 0]], ['forge', -24.6, -17.6, 'hammer', 'hammer', [0, 3]], ['forge', -6.6, -17.6, 'hammer', 'hammer', [0, 3]], ['forge', -9.4, 15.6, 'hammer', 'hammer', [0, -3]],
    ['forge', 2, 24, 'chopping', 'woodaxe', null], ['hall', 4, 9, 'guard', 'spear', [0, 8]], ['harbor', 4, 2, 'talk', null, [3, 0]], ['harbor', 7, 2, 'talk', null, [-3, 0]], ['quarry', -10, -10, 'hammer', 'hammer', [-2, -4]]],
};
/** What the people of each island say when spoken to (once they know him a little). */
const LINES = {
  jarnoy: ['A Jarnøy blade bends before it breaks. Ask anyone who has had the other kind.', 'The streams run red here. It is the ore, not us.', 'Twenty years the king has paid the wolf a little so he does not take everything.', 'The furnaces do not go out. Not for a wedding, not for a funeral.'],
  solvik: ['You can hear six languages on this quay before breakfast, and be cheated in all of them.', 'A fat ship is a slow ship. Everybody knows which way ours is going.', 'The king counts everything twice. So do I. It is why we are rich.', 'Amber from the east, ivory from the north, and nobody asks where the silver came from.'],
  myrholm: ['Burn a leech off with a hot knife. Pull it and the head stays in.', 'The bog keeps everyone it takes. Mind the black pools.', 'Seven families on the council, and they agree on the weather, some days.', 'There are channels through the reeds no longship will ever find.'],
  skalloy: ['Half the anchors in the North were made in this street.', 'Learn first what the thing you make is meant to do. Then hit it.', 'The jarl would like to be brave. He would like his smiths alive more.', 'Good stone, the quarry. Keep back from the edge: it is loose.'],
};
const NAMES = ['Asa', 'Bodvar', 'Dalla', 'Egil', 'Finna', 'Geir', 'Hild', 'Ingolf', 'Jorunn', 'Koll', 'Lofn', 'Mord', 'Nanna', 'Olvir', 'Runolf', 'Saeunn', 'Thorarin', 'Unn', 'Vali', 'Yngvild'];
const LOOKS = [
  { hair: 0x7a5a3a, tunic: 0x6a6a4a, beard: 'short', sleeve: 0x6a6a4a }, { female: true, hair: 0xa8823e, hairStyle: 'braid', tunic: 0x6a4a3a, apron: 0xc9c2b0, sleeve: 0x6a4a3a },
  { hair: 0x3a2e24, hairStyle: 'long', beard: 'long', tunic: 0x4a5a5a, sleeve: 0x4a5a5a, build: 1.12 }, { female: true, hair: 0x4a3a2a, hairStyle: 'bun', tunic: 0x4a5a3a, cloak: 0x3a3a30, sleeve: 0x4a5a3a },
  { hair: 0x9a968e, hairStyle: 'short', beard: 'stubble', tunic: 0x5a4a3a, sleeve: null, apron: 0x3a2e24, build: 1.15 }, { female: true, hair: 0x8a3a1c, hairStyle: 'braids', tunic: 0x7a6a4a, sleeve: 0x7a6a4a },
  { hair: 0xd0b070, hairStyle: 'tail', tunic: 0x3e4a5a, trim: 0x8a8a90, sleeve: 0x3e4a5a }, { hair: 0x2c241e, hairStyle: 'bald', beard: 'braided', tunic: 0x6a5a4a, sleeve: 0x6a5a4a, build: 1.2 },
  { female: true, hair: 0xd9d2c2, hairStyle: 'long', tunic: 0x5a5a6a, cloak: 0x4a4a52, sleeve: 0x5a5a6a },
];
const dist = (a, x, z) => Math.hypot(a.x - x, a.z - z);

export class Ambient {
  constructor(game, open) { this.g = game; this.open = open; this.pool = []; this.t = 0; this.isle = null; this.n = 0; this.sites = {}; }
  /** Every place a person could be on an island: its jobs, and both ends of each of its roads. */
  sitesOf(s) {
    if (this.sites[s.id]) return this.sites[s.id];
    const out = [];
    for (const [pl, dx, dz, loop, hold, face] of JOBS[s.id] || []) { const p = PLACES[s.id][pl]; out.push({ kind: 'job', x: s.x + p[0] + dx, z: s.z + p[1] + dz, loop, hold, face: face ? [s.x + p[0] + dx + face[0], s.z + p[1] + dz + face[1]] : null, by: null }); }
    for (const r of s.roads || []) { const pts = r.map(([x, z]) => [s.x + x, s.z + z]); out.push({ kind: 'route', x: pts[0][0], z: pts[0][1], pts, by: null }, { kind: 'route', x: pts[pts.length - 1][0], z: pts[pts.length - 1][1], pts: [...pts].reverse(), by: null }); }
    return (this.sites[s.id] = out);
  }
  /** Bring one person in at a site. */
  spawn(s, site) {
    const g = this.g, i = this.pool.findIndex((n) => !n.visible);
    let n = i >= 0 ? this.pool[i] : null;
    if (!n) { if (this.pool.length >= SPAWN.max) return; const k = this.pool.length; n = this.open.person('amb' + k, NAMES[k % NAMES.length], LOOKS[k % LOOKS.length], site.x, site.z, 0, {}); this.pool.push(n); }
    n.revive(); n.visible = true; n.amb = { isle: s.id, site }; site.by = n; n.hp = 3;
    n.name = NAMES[(this.n++ * 7 + this.pool.indexOf(n)) % NAMES.length]; n.line = LINES[s.id][(this.n + this.pool.indexOf(n)) % LINES[s.id].length];
    n.teleport(site.x, site.z, site.face ? Math.atan2(site.face[0] - site.x, site.face[1] - site.z) : Math.random() * 6.28);
    n.h.hold('R', null); n.h.hold('L', null); n.weapon = null;
    if (site.kind === 'job') { n.baseLoop = site.loop; n.setLoop(site.loop); if (site.hold) n.h.hold('R', site.hold); if (site.loop === 'guard') n.weapon = 'spear'; n.home = [site.x, site.z]; }
    else { n.baseLoop = null; n.setLoop(null); this.walk(n, site.pts); }
    return n;
  }
  /** A walker goes to the far end of his road, stands a moment, and comes back: for as long as he is in the world. */
  walk(n, pts) {
    const g = this.g, at = n.amb;
    n.goPath(pts.slice(1), { speed: 1.35, onArrive: (o) => { if (!o.visible || o.amb !== at || o.dead) return; g.after(3 + Math.random() * 5, () => { if (o.visible && o.amb === at && !o.dead && o.mode === 'idle') this.walk(o, [...pts].reverse()); }); } });
  }
  remove(n) { if (n.amb && n.amb.site.by === n) n.amb.site.by = null; n.amb = null; n.visible = false; n.stop(); }

  update(dt) {
    const g = this.g, p = g.player, w = g.world;
    if ((this.t += dt) < SPAWN.every) return;
    this.t = 0;
    const s = greatAt(p.pos.x, p.pos.z, 30), jobs = s && JOBS[s.id] ? this.sitesOf(s) : null;
    for (const n of this.pool) { // gone when he is far away, on another island, or dead and out of sight
      if (!n.visible || n.cb) continue;
      const d = n.dist(p);
      if (d > SPAWN.gone || !s || n.amb.isle !== s.id || (n.dead && d > 40)) this.remove(n);
      else if (n.amb.site.kind === 'route' && n.mode === 'idle' && !n.talking && !n.dead && (n.idleT = (n.idleT || 0) + SPAWN.every) > 12) { n.idleT = 0; this.walk(n, n.amb.site.pts); } // a walker who was stopped (talked to) sets off again
    }
    if (!jobs || g.mode !== 'play' || g.combat.active) return;
    if (this.pool.filter((n) => n.visible).length >= SPAWN.max) return;
    // the nearest free site that is far enough to appear at unseen and near enough to matter, on dry ground or a deck
    let best = null, bd = Infinity;
    for (const site of jobs) {
      if (site.by) continue;
      const d = dist(p.pos, site.x, site.z);
      if (d > SPAWN.far || d >= bd || d < SPAWN.near) continue;
      if (d < SPAWN.min) { // nearer than that only where he is not looking: nobody appears in front of his eyes
        const cam = p.cam.yaw, rel = Math.atan2(site.x - p.pos.x, site.z - p.pos.z) - cam, off = Math.abs(Math.atan2(Math.sin(rel), Math.cos(rel)));
        if (off < 1.25) continue;
      }
      if (w.groundAt(site.x, site.z) < 0.25 || w.pointInBox(site.x, site.z, 0.2)) continue; // never in water, never inside a wall
      best = site; bd = d;
    }
    if (best) this.spawn(s, best);
  }
}
