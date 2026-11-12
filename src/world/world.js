// World assembly: terrain, the village of Hrafnvik, collision, platforms and interactables.
import * as THREE from 'three';
import { clamp } from '../core/util.js';
import { M, Builder, at, box, cyl, sphere, tint } from './geo.js';
import { buildHeights, buildTerrain, heightAt, riverX } from './terrain.js';
import { scatterVegetation } from './vegetation.js';
import * as P from './props.js';
import { HOUSES, POI, FIELDS, BOUNDS } from './layout.js';

const CELL = 8;
const key = (ix, iz) => (ix + 64) * 256 + (iz + 64);

export class World {
  constructor() {
    this.boxes = []; this.grid = new Map(); this.platforms = [];
    this.interactables = []; this.smoke = []; this.houses = {};
  }

  // ---- collision --------------------------------------------------------------------
  addBox(x, z, hw, hd, ry = 0, h = 6) {
    const b = { x, z, hw, hd, c: Math.cos(ry), s: Math.sin(ry), h };
    this.boxes.push(b);
    return b;
  }
  addCircle(x, z, r, h = 2) {
    const c = { x, z, r, h }, k = key(Math.floor(x / CELL), Math.floor(z / CELL));
    if (!this.grid.has(k)) this.grid.set(k, []);
    this.grid.get(k).push(c);
    if (r >= 1.0 && h < 7) (this.cover ||= []).push(c); // hay stacks, boulders: things you can hide behind
    return c;
  }
  removeCircle(c) {
    const a = this.grid.get(key(Math.floor(c.x / CELL), Math.floor(c.z / CELL)));
    if (a) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); }
  }
  /** Push a circle of radius r at pos (Vector3, XZ used) out of all static colliders. */
  resolve(pos, r) {
    for (let iter = 0; iter < 2; iter++) {
      for (const b of this.boxes) {
        const dx = pos.x - b.x, dz = pos.z - b.z;
        if (Math.abs(dx) > b.hw + b.hd + r + 1 || Math.abs(dz) > b.hw + b.hd + r + 1) continue;
        let lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
        if (Math.abs(lx) >= b.hw + r || Math.abs(lz) >= b.hd + r) continue;
        const cx = clamp(lx, -b.hw, b.hw), cz = clamp(lz, -b.hd, b.hd), ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez);
        if (d >= r) continue;
        if (d > 1e-5) { lx += (ex / d) * (r - d); lz += (ez / d) * (r - d); }
        else if (b.hw - Math.abs(lx) < b.hd - Math.abs(lz)) lx = Math.sign(lx || 1) * (b.hw + r);
        else lz = Math.sign(lz || 1) * (b.hd + r);
        pos.x = b.x + lx * b.c + lz * b.s; pos.z = b.z - lx * b.s + lz * b.c;
      }
      const ix = Math.floor(pos.x / CELL), iz = Math.floor(pos.z / CELL);
      for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) {
        const list = this.grid.get(key(ix + a, iz + c));
        if (!list) continue;
        for (const o of list) {
          const dx = pos.x - o.x, dz = pos.z - o.z, d = Math.hypot(dx, dz), min = o.r + r;
          if (d < min && d > 1e-5) { pos.x = o.x + (dx / d) * min; pos.z = o.z + (dz / d) * min; }
        }
      }
    }
    pos.x = clamp(pos.x, BOUNDS.minX, BOUNDS.maxX); pos.z = clamp(pos.z, BOUNDS.minZ, BOUNDS.maxZ);
  }
  pointInBox(x, z, margin = 0) {
    for (const b of this.boxes) {
      const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      if (Math.abs(lx) < b.hw + margin && Math.abs(lz) < b.hd + margin) return b;
    }
    return null;
  }
  /** True if a tall wall (building) blocks the straight line between two points. */
  losBlocked(ax, az, bx, bz, minH = 1.5) {
    for (const b of this.boxes) {
      if (b.h < minH) continue;
      const adx = ax - b.x, adz = az - b.z, bdx = bx - b.x, bdz = bz - b.z;
      const x0 = adx * b.c - adz * b.s, z0 = adx * b.s + adz * b.c, x1 = bdx * b.c - bdz * b.s, z1 = bdx * b.s + bdz * b.c;
      let t0 = 0, t1 = 1; const dx = x1 - x0, dz = z1 - z0; let hit = true;
      for (const [p, d, h] of [[x0, dx, b.hw], [z0, dz, b.hd]]) {
        if (Math.abs(d) < 1e-6) { if (Math.abs(p) > h) { hit = false; break; } continue; }
        let ta = (-h - p) / d, tb = (h - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) { hit = false; break; }
      }
      if (hit) return true;
    }
    const sx = bx - ax, sz = bz - az, sl = sx * sx + sz * sz || 1;
    for (const c of this.cover || []) {
      if (c.h < minH) continue;
      const t = clamp(((c.x - ax) * sx + (c.z - az) * sz) / sl, 0, 1);
      if (Math.hypot(ax + sx * t - c.x, az + sz * t - c.z) < c.r * 0.85) return true;
    }
    return false;
  }
  groundAt(x, z) {
    let h = heightAt(x, z);
    for (const p of this.platforms) if (Math.abs(x - p.x) < p.hw && z > p.z0 && z < p.z1 && p.y > h) h = p.y;
    return h;
  }
  /** Can something stand here? (not in deep water unless on a platform) */
  walkable(x, z) { return this.groundAt(x, z) > -0.75; }

  // ---- interactables ----------------------------------------------------------------
  addInteractable(it) { this.removeInteractable(it.id); this.interactables.push(Object.assign({ r: 2, priority: 0 }, it)); return it; }
  removeInteractable(id) { const i = this.interactables.findIndex((o) => o.id === id); if (i >= 0) this.interactables.splice(i, 1); }
  nearestInteractable(pos) {
    let best = null, bd = Infinity;
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const p = it.pos ? it.pos() : it;
      const d = Math.hypot(pos.x - p.x, pos.z - p.z) - it.priority * 0.5;
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    return best;
  }

  // ---- construction -----------------------------------------------------------------
  build(scene, quality) {
    this.scene = scene;
    buildHeights();
    this.terrain = buildTerrain(scene);
    const ctx = { b: new Builder(), addBox: this.addBox.bind(this), addCircle: this.addCircle.bind(this), smoke: this.smoke };

    for (const h of HOUSES) this.houses[h.id] = P.longhouse(ctx, h);
    this.smithy = P.smithy(ctx, POI.smithy.x, POI.smithy.z, -0.5);
    P.well(ctx, POI.well.x, POI.well.z);

    // Ragnar's steading
    P.choppingBlock(ctx, POI.chop.x, POI.chop.z);
    P.woodpile(ctx, -49.5, 75.5, 0.25, 5, 9);
    P.woodpile(ctx, -41, 80, 1.5, 3, 6);
    P.fireRing(ctx, POI.cookfire.x, POI.cookfire.z, 0.6);
    P.bench(ctx, -17, 70.2, 0.7); P.bench(ctx, -21.3, 65.6, -0.4);
    P.loom(ctx, -22.5, 73.2, 0);
    P.dryingRack(ctx, -37, 68, 0.2);
    P.barrel(ctx, -24.6, 73.6); P.barrel(ctx, -35.6, 73.5); P.crate(ctx, -34.4, 73.6, 0.2);
    P.pell(ctx, POI.yard.x + 3.2, POI.yard.z - 1.5);
    P.fence(ctx, [[-52, 64], [-53, 86], [-20, 88]]);
    P.fence(ctx, [[-20, 53], [-6, 54]]);

    // village green and neighbours
    P.bench(ctx, 6, 46.5, 0.3); P.bench(ctx, 11.5, 53, -1.1);
    P.hayStack(ctx, 36, 62, 0.9); P.cart(ctx, 20, 60, 0.5);
    P.dryingRack(ctx, 24, 82, 0.4); P.dryingRack(ctx, 20, 96, -0.2);
    P.barrel(ctx, 34.5, 70); P.barrel(ctx, 16.6, 22.6); P.crate(ctx, 17.8, 23.4, 0.5); P.barrel(ctx, 12.6, 12.2);
    P.loom(ctx, -36.6, 39, Math.PI / 2 + 0.2);
    P.woodpile(ctx, 34, 34, Math.PI / 2, 4, 8);
    P.bench(ctx, 5.4, 13.6, -0.4);
    P.fireRing(ctx, 3, 50, 0.7);

    // barn, pen and the north fence line (cover for the night escape)
    P.hayStack(ctx, -38, -4, 1.1); P.hayStack(ctx, -57, 1, 1.0); P.hayStack(ctx, -31, 2, 0.85); P.hayStack(ctx, -49, -9, 0.9);
    P.cart(ctx, -33, -9, -0.3); P.cart(ctx, -52, 14, 1.2);
    P.woodpile(ctx, -43, -3.5, 0.1, 4, 8);
    P.barrel(ctx, -39.5, 10); P.crate(ctx, -40.6, 11, 0.3, 0.9);
    P.fence(ctx, [[-38, 14], [-30, 15], [-29, 22], [-37, 21.4], [-38, 14]]);
    P.fence(ctx, [[-25.4, -18.4], [-40, -13], [-56, -9]]);
    P.fence(ctx, [[-18.8, -17.6], [-4, -22], [12, -21], [22, -18]]);
    for (const s of [-1, 1]) { // carved gate posts
      const gx = POI.northGate.x + s * 2.6, gz = POI.northGate.z - s * 0.3;
      ctx.b.add(at(box(0.34, 3.6, 0.34), gx, heightAt(gx, gz) + 1.8, gz), M.timber);
      this.addCircle(gx, gz, 0.3, 3);
    }
    ctx.b.add(at(box(6.2, 0.3, 0.3), POI.northGate.x, heightAt(POI.northGate.x, POI.northGate.z) + 3.5, POI.northGate.z, 0, 0.12, 0), M.timber);

    // fields
    for (const f of FIELDS) {
      const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => P.toWorld(f.x, f.z, f.ry, (sx * f.w) / 2 + sx, (sz * f.d) / 2 + sz));
      P.fence(ctx, [c[0], c[1], c[2], c[3]]);
    }
    P.hayStack(ctx, 22, 2, 0.8);

    // shore: dock and beached boats
    this.platforms.push(P.dock(ctx, POI.dock.x, 150, 22));
    for (const [bx, bz, ry, seed] of [[-7, 153.5, 0.5, 3], [17, 155, -0.7, 4]]) {
      const boat = P.makeShip({ L: 6.4, B: 1.7, D: 0.62, rise: 0.75, seed });
      boat.position.set(bx, heightAt(bx, bz) + 0.02, bz); boat.rotation.set(0.05, ry, 0.12);
      scene.add(boat); this.addCircle(bx, bz, 1.3, 1);
    }
    P.dryingRack(ctx, -2, 142, 1.2);

    // forest: father's camp, the target stump, the Raven Stone, the fishing rock
    P.fireRing(ctx, POI.camp.x, POI.camp.z, 0.6);
    P.leanTo(ctx, POI.camp.x + 3.4, POI.camp.z - 2.2, -1.0);
    ctx.b.add(at(cyl(0.2, 0.24, 2.2, 7), POI.camp.x - 2.6, heightAt(POI.camp.x - 2.6, POI.camp.z + 1.4) + 0.2, POI.camp.z + 1.4, Math.PI / 2, 0.6, 0), M.bark); // log seat
    this.addBox(POI.camp.x - 2.6, POI.camp.z + 1.4, 1.1, 0.3, 0.6 + Math.PI / 2, 0.5);
    ctx.b.add(at(cyl(0.34, 0.4, 1.25, 8), POI.target.x, heightAt(POI.target.x, POI.target.z) + 0.6, POI.target.z), M.bark);
    ctx.b.add(tint(at(cyl(0.3, 0.3, 0.05, 12), POI.target.x + 0.36, heightAt(POI.target.x, POI.target.z) + 0.95, POI.target.z, 0, 0, Math.PI / 2), 0xb04030), M.vc);
    this.addCircle(POI.target.x, POI.target.z, 0.42, 1.3);
    P.runestone(ctx, POI.runestone.x, POI.runestone.z, 1.2);
    const fr = POI.fishing;
    ctx.b.add(at(sphere(1.7, 9, 6), fr.x + 1.2, heightAt(fr.x + 1.2, fr.z) - 0.1, fr.z, 0, 0.4, 0, 1.5, 0.42, 1.2), M.stone);

    const stat = ctx.b.build();
    scene.add(stat);
    this.staticGroup = stat;

    this.veg = scatterVegetation(scene, this, quality);
    return this;
  }

  /** A trail of prints on the ground; brightens while Hunter's Sense is held. */
  makeTracks(pts, spacing = 1.5) {
    const geos = [];
    let side = 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(len / spacing));
      const ry = Math.atan2(bx - ax, bz - az);
      for (let k = 0; k < n; k++) {
        const t = k / n, ox = Math.cos(ry) * 0.16 * side, oz = -Math.sin(ry) * 0.16 * side; side = -side;
        const x = ax + (bx - ax) * t + ox, z = az + (bz - az) * t + oz;
        const g = new THREE.CircleGeometry(0.085, 6);
        geos.push(at(g, x, heightAt(x, z) + 0.05, z, -Math.PI / 2, ry, 0, 0.8, 1.5, 1));
      }
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0x1c1410, transparent: true, opacity: 0.55, depthWrite: false, fog: true });
    const merged = geos.length ? geos.reduce((acc, g) => acc.concat([g]), []) : [];
    const b = new Builder(); merged.forEach((g) => b.add(g, mat));
    const grp = b.build({ cast: false, receive: false });
    grp.userData.mat = mat;
    grp.renderOrder = 2;
    this.scene.add(grp);
    return grp;
  }
}
export { heightAt, riverX };
