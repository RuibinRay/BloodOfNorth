// World assembly: terrain, the village of Hrafnvik, collision, platforms and interactables.
import * as THREE from 'three';
import { clamp } from '../core/util.js';
import { M, Builder, at, box, cyl, cone, sphere, tint } from './geo.js';
import { buildHeights, buildTerrain, heightAt, riverX, riverSurfaceY } from './terrain.js';
import { scatterVegetation } from './vegetation.js';
import * as P from './props.js';
import { HOUSES, POI, FIELDS, BOUNDS } from './layout.js';
import { buildRealmProps } from './realm_props.js';
import { buildMainland } from './mainland.js';
import { buildJarnoyTown } from './jarnoy_town.js';
import { buildAct4Places } from './act4_places.js';
import { buildAct5Places } from './act5_places.js';
import { buildAct6Places } from './act6_places.js';
import { buildAct7Places } from './act7_places.js';
import { mainAt } from './realm.js';

const CELL = 8;
const key = (ix, iz) => (ix + 512) * 2048 + (iz + 512); // cells of 8 m: good for 4 km either way

export class World {
  constructor() {
    this.boxes = []; this.grid = new Map(); this.platforms = []; this.decks = [];
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
  /** Put back a circle that removeCircle took out. */
  putCircle(c) { const k = key(Math.floor(c.x / CELL), Math.floor(c.z / CELL)); if (!this.grid.has(k)) this.grid.set(k, []); const a = this.grid.get(k); if (!a.includes(c)) a.push(c); }
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
    // the home valley, then the wider home waters, then (south of realmZ) the open sea of the ten islands
    const m = pos.z < BOUNDS.realmZ ? mainAt(pos.x, pos.z, 3) : null;
    if (m) { pos.x = clamp(pos.x, m.x - m.half + 6, m.x + m.half - 6); pos.z = Math.max(pos.z, m.lim.minZ || m.z - m.half + 6); return; } // a mainland shore north of the open sea
    if (Math.abs(pos.x) > BOUNDS.seaX && pos.z < BOUNDS.realmZ) pos.z = BOUNDS.realmZ; // no way back north except through the home waters
    const bx = pos.z >= BOUNDS.realmZ ? BOUNDS.realmX : pos.z > 322 ? BOUNDS.seaX : BOUNDS.maxX;
    pos.x = clamp(pos.x, -bx, bx); pos.z = clamp(pos.z, BOUNDS.minZ, BOUNDS.maxZ);
    const k = pos.z >= BOUNDS.realmZ ? mainAt(pos.x, pos.z) : null, L = k && k.lim; // a mainland shore in the open sea: the land runs on, out of the story
    if (L) { if (L.maxZ && pos.z > L.maxZ) pos.z = L.maxZ; if (L.minX && pos.x < L.minX) pos.x = L.minX; if (L.maxX && pos.x > L.maxX) pos.x = L.maxX; if (L.minZ && pos.z >= BOUNDS.realmZ && pos.z < L.minZ && k.z - k.half > BOUNDS.realmZ) pos.z = L.minZ; }
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
    for (const d of this.decks) { // a ship's deck: { x, z, yaw, hw, hl, y }
      const dx = x - d.x, dz = z - d.z, s = Math.sin(d.yaw), c = Math.cos(d.yaw);
      if (Math.abs(dx * c - dz * s) < d.hw && Math.abs(dx * s + dz * c) < d.hl && d.y > h) h = d.y;
    }
    if (this.ice && z < 170 && Math.abs(x - riverX(z)) < 9.5) { const s = riverSurfaceY(z) + 0.04; if (s > h) h = s; }
    return h;
  }
  /** The old birch behind Bjornstead: whole before the lightning, split after. */
  setBirch(split) { this.birchSplit.visible = split; this.birchWhole.visible = !split; }
  addDeck(d) { this.decks.push(d); return d; }
  removeDeck(d) { this.decks = this.decks.filter((x) => x !== d); }
  setIce(on) { this.ice = on; this.terrain.setIce(on); }
  /** True when (x, z) is over frozen river rather than ground. */
  onIce(x, z) { return !!this.ice && z < 170 && Math.abs(x - riverX(z)) < 9.5 && heightAt(x, z) < riverSurfaceY(z); }
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

    // Bjornstead: yard, pen, chopping block
    P.fireRing(ctx, POI.farmFire.x, POI.farmFire.z, 0.6); P.bench(ctx, 147.4, -135.6, 0.5);
    P.choppingBlock(ctx, POI.farmChop.x, POI.farmChop.z); P.woodpile(ctx, 160.8, -141.8, 0.3, 4, 8);
    P.fence(ctx, [[144, -159], [153, -159], [153, -152], [144, -152], [144, -159]]);
    P.hayStack(ctx, 163, -147, 0.9); P.barrel(ctx, 154.6, -143.2); P.dryingRack(ctx, 142, -133, 0.4);
    // the storm-felled raven pine and its nest
    const ny = heightAt(POI.nest.x, POI.nest.z);
    ctx.b.add(at(cyl(0.2, 0.34, 9.5, 7), POI.nest.x - 3.6, ny + 0.32, POI.nest.z - 1.6, Math.PI / 2 - 0.05, 1.15, 0), M.bark);
    this.addBox(POI.nest.x - 3.6, POI.nest.z - 1.6, 4.6, 0.35, 1.15 - Math.PI / 2, 0.7);
    ctx.b.add(tint(at(new THREE.TorusGeometry(0.34, 0.13, 5, 10), POI.nest.x, ny + 0.14, POI.nest.z, Math.PI / 2, 0, 0), 0x4a3a28, 0.35, 3), M.vc);
    for (const [x, z, r] of [[121.5, -155, 0.4], [129.5, -157.5, 1.9], [123, -146.5, 2.7]])
      ctx.b.add(at(cyl(0.17, 0.2, 1.5, 6), x, heightAt(x, z) + 0.16, z, Math.PI / 2, r, 0), M.bark);
    // -- old things that wait for a grown man (Chapter 3 secrets) --
    const by = heightAt(POI.barrow.x, POI.barrow.z);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283; ctx.b.add(at(sphere(0.34 + (i % 3) * 0.08, 6, 5), POI.barrow.x + Math.cos(a) * 2.7, by + 0.1, POI.barrow.z + Math.sin(a) * 2.7, 0, i, 0, 1, 0.75, 1), M.stone); }
    ctx.b.add(at(box(0.05, 0.36, 0.03), POI.barrow.x, by + 0.42, POI.barrow.z, 0.12, 0.4, 0.06), M.dark);
    ctx.b.add(at(box(0.3, 0.045, 0.06), POI.barrow.x, by + 0.26, POI.barrow.z, 0.12, 0.4, 0.06), M.iron);
    ctx.b.add(at(sphere(0.045, 6, 5), POI.barrow.x + 0.01, by + 0.62, POI.barrow.z + 0.02), M.iron);
    ctx.b.add(tint(at(new THREE.IcosahedronGeometry(0.42, 1), POI.skyIron.x, heightAt(POI.skyIron.x, POI.skyIron.z) + 0.24, POI.skyIron.z, 0, 0.7, 0, 1.15, 0.8, 1), 0x1b1a1e, 0.25, 5), M.vcPlain);
    this.addCircle(POI.skyIron.x, POI.skyIron.z, 0.5, 0.6);
    P.runestone(ctx, POI.axeStone.x, POI.axeStone.z, 0.5);
    // the old birch on the hill behind Bjornstead: whole until the lightning finds it (Act I), split and still green ever after
    const yy = heightAt(POI.yew.x, POI.yew.z), sb = new Builder(), wb = new Builder();
    for (const s of [-1, 1]) sb.add(tint(at(cyl(0.13, 0.3, 3.6, 6), POI.yew.x + s * 0.28, yy + 1.7, POI.yew.z, 0, 0, -s * 0.16), 0x241c17, 0.2, 6), M.vcPlain);
    for (const [dx, dy, dz, sc] of [[-0.9, 3.5, 0.2, 1.3], [1.0, 3.8, -0.3, 1.4], [0.1, 4.7, 0.5, 1.1], [-0.3, 2.7, -0.9, 0.9]])
      sb.add(tint(at(new THREE.IcosahedronGeometry(1, 1), POI.yew.x + dx, yy + dy, POI.yew.z + dz, 0, dx, 0, sc, sc * 0.8, sc), 0x2c4a2a, 0.3, 7), M.vcPlain);
    wb.add(tint(at(cyl(0.16, 0.34, 8.4, 7), POI.yew.x, yy + 4.1, POI.yew.z), 0xd9d5c8, 0.18, 8), M.vcPlain);
    for (const [dx, dy, dz, sc] of [[0, 8.6, 0, 2.3], [-1.6, 7.2, 0.6, 1.7], [1.5, 7.4, -0.5, 1.8], [0.3, 6.2, 1.5, 1.4], [-0.4, 6.4, -1.5, 1.4]])
      wb.add(tint(at(new THREE.IcosahedronGeometry(1, 1), POI.yew.x + dx, yy + dy, POI.yew.z + dz, 0, dx, 0, sc, sc * 0.85, sc), 0x6a8a3a, 0.3, 9), M.vcPlain);
    wb.add(tint(at(cyl(0.05, 0.09, 3.2, 5), POI.yew.x + 1.3, yy + 6.6, POI.yew.z + 0.2, 0, 0, -1.1), 0xd9d5c8, 0.18, 10), M.vcPlain); // the branch the ravens cling to
    this.birchSplit = sb.build(); this.birchWhole = wb.build(); this.birchWhole.visible = false; scene.add(this.birchSplit, this.birchWhole);
    this.addCircle(POI.yew.x, POI.yew.z, 0.6, 4);
    const ty = heightAt(POI.tarn.x, POI.tarn.z);
    const ice = new THREE.Mesh(new THREE.CircleGeometry(6.4, 28), new THREE.MeshStandardMaterial({ color: 0xd3e5f0, roughness: 0.22, metalness: 0.1 }));
    ice.rotation.x = -Math.PI / 2; ice.position.set(POI.tarn.x, ty + 0.06, POI.tarn.z); ice.receiveShadow = true; scene.add(ice);
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 3.3), new THREE.MeshBasicMaterial({ color: 0x1c2a36, transparent: true, opacity: 0.6, depthWrite: false }));
    shade.rotation.set(-Math.PI / 2, 0, 0.5); shade.position.set(POI.tarn.x + 0.6, ty + 0.085, POI.tarn.z - 0.4); scene.add(shade);

    // sea chart landmarks (the islands are ISLES in layout.js; who lives there is in story/sea_chart.js)
    for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.25 + (i % 3) * 0.22; ctx.b.add(at(sphere(0.34 - i * 0.025, 6, 5), -60 + Math.cos(a) * r, heightAt(-60, 1260) + 0.2 + i * 0.2, 1260 + Math.sin(a) * r, 0, a, 0, 1, 0.7, 1), M.stone); }
    this.addCircle(-60, 1260, 0.7, 1.4);                                                   // Vængr: the cairn
    P.fireRing(ctx, -40, 752, 0.7); P.leanTo(ctx, -46, 747, 0.6); P.leanTo(ctx, -34, 746.5, -0.5); P.barrel(ctx, -43.5, 755); P.crate(ctx, -36, 756, 0.3); P.runestone(ctx, -45.5, 758.5, 0.4); P.bench(ctx, -38, 748.6, 0.2); // Kinn: the reeve's camp
    P.fireRing(ctx, 207, 594, 0.55); P.dryingRack(ctx, 212, 589, 0.5); P.leanTo(ctx, 201, 588, 0.9); P.barrel(ctx, 209.5, 597); // Fedje: the pilot's station
    P.leanTo(ctx, -241, 553, -0.6); P.hayStack(ctx, -237, 557, 0.8);                         // Selja: a shepherd's shelter
    P.fireRing(ctx, -415, 806, 0.9); P.leanTo(ctx, -410, 801, -0.8); P.crate(ctx, -418, 809, 0.5); P.crate(ctx, -419.3, 807.8, 1.1, 0.55); P.barrel(ctx, -412, 809.5); // Batalden: the wreckers' fire
    P.leanTo(ctx, 351, 849, 2.6); P.fireRing(ctx, 347, 853.5, 0.5); P.dryingRack(ctx, 343, 849, 0.3); // Værøy: a croft
    const wreck = P.makeShip({ L: 9, B: 2.5, D: 0.95, rise: 1.2, sail: false, shields: false, seed: 4 }); // Hovden: a wrecked karve
    wreck.position.set(127, heightAt(127, 1027) - 0.2, 1027); wreck.rotation.set(0.04, 1.1, 0.3); scene.add(wreck); this.addCircle(127, 1027, 2.4, 2);
    P.crate(ctx, 121, 1022, 0.8);
    P.woodpile(ctx, -230, 1040, 0.4, 5, 5);                                                  // Skorpa: the beacon pile
    P.leanTo(ctx, 466, 1136, 2.2); P.fireRing(ctx, 469.5, 1133, 0.5);                        // Gannet Rock: a hermit
    P.fireRing(ctx, -456, 1296, 0.6); P.crate(ctx, -459, 1298.5, 0.2);                       // Skerry of Horns: a hoard
    for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.3; P.runestone(ctx, 334 + Math.cos(a) * 4.4, 1386 + Math.sin(a) * 4.4, -a + 1.57); } // Storm-Wife's Rock
    P.fireRing(ctx, 334, 1386, 0.5);
    P.runestone(ctx, -120, 1484, 0.2);                                                       // Utvær: the last stone
    P.fireRing(ctx, -104, 1473, 0.7); P.leanTo(ctx, -108.5, 1468.5, 0.5); P.leanTo(ctx, -99, 1476.5, -2.3); P.crate(ctx, -100.5, 1470.5, 0.6, 0.8); P.barrel(ctx, -106.5, 1476); P.dryingRack(ctx, -111, 1474, 1.3); // and an old fishing station
    // the islands (open-world prototype): Gulen's law-rock and hall, Bulandet's fishing camp
    P.runestone(ctx, POI.lawRock.x, POI.lawRock.z, -0.3);
    P.fireRing(ctx, -58, 258, 0.6); P.bench(ctx, -60.2, 256.6, 1.1); P.dryingRack(ctx, -46, 268, 0.8); P.barrel(ctx, -61, 262.4); P.crate(ctx, -49.5, 252.5, 0.4);
    P.fireRing(ctx, 62, 281, 0.55); P.dryingRack(ctx, 66, 277, -0.4); P.dryingRack(ctx, 57, 284, 1.2); P.leanTo(ctx, 67.5, 284.5, -2.4); P.barrel(ctx, 59.4, 278.6);

    // the great islands of the open sea (see realm_props.js); the places champions are fought are kept in this.realm
    this.realm = buildRealmProps(ctx, this, scene);
    // the mainland coast: Bjornstead and Kaupang (see mainland.js); what the story changes there is kept in this.main
    this.main = buildMainland(ctx, this, scene);
    this.main.jarnoy = buildJarnoyTown(ctx, this, scene);
    Object.assign(this.main, buildAct4Places(ctx, this, scene));
    Object.assign(this.main, buildAct5Places(ctx, this, scene)); // Håkon's hunting camp, Gannet Rock's hut, Vængr's settlement // Wessex, Hedeby Sound, the ships at sea, the burned islands
    Object.assign(this.main, buildAct6Places(ctx, this, scene)); // what Act VI adds on Myrholm, on Skalløy and at Ravenhold
    Object.assign(this.main, buildAct7Places(ctx, this, scene)); // the war: the chained line at sea, Svartøy's shore, the pens, the hall gate, the Thing at Gulen

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
