// Procedural Viking-age props: longhouses, fences, boats and village clutter.
// Static props are baked into the shared world Builder (ctx.b); ships are separate groups so they can move.
import * as THREE from 'three';
import { M, Builder, at, box, cyl, cone, sphere, tri, tint, shieldGeo, doorLeaf, rope, bannerGeo, merge } from './geo.js';
import { heightAt } from './terrain.js';
import { rng } from '../core/util.js';
import { floats } from './float.js';

/** Local (lx, lz) on an object at (x, z) rotated ry -> world [x, z]. */
export function toWorld(x, z, ry, lx, lz) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}
const placer = (ctx, x, z, ry, y = heightAt(x, z)) => (g, m) => ctx.b.add(at(g, x, y, z, 0, ry, 0), m);

/** A longhouse. One that is wide and long enough (or told `hall: true`) is built as a hall: higher walls, a wide door
 *  under a carved porch, shields along the wall beside it, a smoke louver on the ridge, a banner either side of the
 *  porch (`banner`: a colour, or 'raven' / 'wolf' for the two the story names) and bigger heads on the gables. */
export function longhouse(ctx, o) {
  const { x, z, ry, len, wid, ridge, roof, door, doorX = 0 } = o, hall = o.hall ?? (wid >= 6.8 && len >= 15);
  const add = placer(ctx, x, z, ry, heightAt(x, z) - 0.12);
  const wallH = hall ? 2.45 : 1.75, base = 0.38, hw = wid / 2, hl = len / 2, wy = base + wallH / 2;
  const eaveY = base + wallH - 0.45, run = hw + 0.8, rise = ridge - eaveY, sl = Math.hypot(run, rise), th = Math.atan2(rise, run);
  const roofMat = roof === 'turf' ? M.turf : M.thatch;
  add(at(box(len + 0.6, 0.6, wid + 0.6), 0, 0.12, 0), M.stone);
  for (const s of [-1, 1]) {
    if (s === door) {
      const dw = hall ? 2.3 : 1.25, l1 = doorX - dw / 2 + hl, l2 = hl - (doorX + dw / 2), pt = hall ? 0.3 : 0.22;
      add(at(box(l1, wallH, 0.3), -hl + l1 / 2, wy, s * hw), M.plank);
      add(at(box(l2, wallH, 0.3), hl - l2 / 2, wy, s * hw), M.plank);
      add(at(doorLeaf(dw, wallH), doorX, wy, s * (hw - 0.04), 0, s > 0 ? 0 : Math.PI, 0), M.door);
      for (const k of [-1, 1]) add(at(box(pt, wallH + 0.12, 0.4, 0.75), doorX + k * (dw / 2 + pt / 2 - 0.03), wy, s * hw), M.carved); // carved door posts and lintel
      add(at(box(dw + 0.7, 0.24, 0.44, 0.75), doorX, base + wallH + 0.06, s * hw), M.carved);
      add(at(box(dw + 0.5, 0.12, 0.9), doorX, base - 0.06, s * (hw + 0.45)), M.stone); // threshold slab
      const pick = (k, n) => (Math.abs(Math.round(x * 3 + z * 7)) + (k > 0 ? 1 : 0) + n) % 4;
      if (hall || len >= 13) for (const k of [-1, 1]) for (let n = 0; n < (hall ? 3 : 1); n++) { // shields hang by the door: one a side on a big house, a row on a hall
        const sx = doorX + k * (dw / 2 + (hall ? 2.3 : 1.25) + n * 1.15);
        if (Math.abs(sx) < hl - 0.7) add(at(shieldGeo(0.42, 0.05, pick(k, n)), sx, wy - 0.08 + (hall ? 0.25 : 0), s * (hw + 0.2), s * Math.PI / 2, 0, 0), M.shield);
      }
      if (hall) { // the porch: two carved posts out in front, a beam on them, and a little roof of its own running back into the big one
        const pd = 1.9, pw = dw / 2 + 0.75, ph = wallH + 0.55, pr = 1.0, half = pw + 0.4, psl = Math.hypot(half, pr), pth = Math.atan2(pr, half);
        const back = (base + ph + pr - eaveY) / (rise / run) - 0.8 + 0.25, deep = pd + 0.55 + back, mid = hw + (pd + 0.55 - back) / 2;
        for (const k of [-1, 1]) {
          add(at(box(0.3, ph, 0.3, 0.75), doorX + k * pw, base + ph / 2, s * (hw + pd)), M.carved);
          add(at(box(psl + 0.12, 0.22, deep, 2.4), doorX + (k * half) / 2, base + ph + pr / 2 + 0.12, s * mid, 0, 0, -k * pth), roofMat);
          add(at(box(psl + 0.7, 0.24, 0.1, 0.75), doorX + k * (half / 2 - 0.2), base + ph + pr / 2 + 0.3, s * (hw + pd + 0.56), 0, 0, -k * pth), M.carved); // carved boards across its front, crossing at the top
          const [bx, bz] = [doorX + k * (pw + 1.5), s * (hw + pd + 0.3)], bh = 4.4, cloth = o.banner ?? [0x7a2a22, 0x2f4a5c, 0x5a4a22, 0x3a5a3a][pick(0, 0)]; // a banner on a pole either side
          add(at(cyl(0.06, 0.08, bh, 5), bx, base + bh / 2 - 0.3, bz), M.timber); add(at(cyl(0.03, 0.03, 1.2, 4), bx, base + bh - 0.45, bz + s * 0.5, Math.PI / 2, 0, 0), M.timber);
          if (typeof cloth === 'string') add(at(bannerGeo(1.05, 1.6, cloth), bx, base + bh - 1.3, bz + s * 0.55, 0, Math.PI / 2, 0), M.banner);
          else add(tint(at(box(0.04, 1.6, 1.05), bx, base + bh - 1.3, bz + s * 0.55), cloth, 0.15, 4), M.vcPlain);
        }
        add(at(box(pw * 2 + 0.34, 0.26, 0.32, 0.75), doorX, base + ph - 0.02, s * (hw + pd)), M.carved);
        add(at(box(0.16, 0.2, deep + 0.1), doorX, base + ph + pr + 0.24, s * mid), M.timber);
        add(at(box(dw + 1.7, 0.14, pd + 0.7), doorX, base - 0.08, s * (hw + pd / 2 + 0.25)), M.stone); // the step up to it
      }
    } else add(at(box(len, wallH, 0.3), 0, wy, s * hw), M.plank);
  }
  for (const s of [-1, 1]) {
    add(at(box(0.3, wallH, wid), s * hl, wy, 0), M.plank);
    add(at(tri(wid, ridge - base - wallH, 0.28), s * hl, base + wallH, 0, 0, Math.PI / 2, 0), M.plank);
  }
  const bays = Math.max(2, Math.round(len / 2.6));
  for (let i = 0; i <= bays; i++) for (const s of [-1, 1]) add(at(box(0.24, wallH + 0.1, 0.24), -hl + (len * i) / bays, wy, s * (hw + 0.1)), M.timber);
  for (const s of [-1, 1]) add(at(box(len + 1.5, 0.36, sl + 0.12, 2.4), 0, eaveY + rise / 2 + 0.14, (s * run) / 2, s * th, 0, 0), roofMat);
  if (roof === 'turf') for (const s of [-1, 1]) add(at(cyl(0.13, 0.13, len + 1.6, 6), 0, eaveY + 0.16, s * (run + 0.12), 0, 0, Math.PI / 2), M.bark); // the log that keeps the turf from sliding off
  add(at(box(len + 1.8, 0.22, 0.3), 0, ridge + 0.24, 0), M.timber);
  const fl = sl + (hall ? 1.7 : 1.1), hs = hall ? 1.7 : 1;
  for (const e of [-1, 1]) for (const s of [-1, 1]) { // the gable boards, carved, crossing above the ridge
    add(at(box(0.12 * hs, 0.26 * hs, fl, 0.75), e * (hl + 0.78), eaveY + (Math.sin(th) * fl) / 2 + 0.24, s * (run - (Math.cos(th) * fl) / 2), s * th, 0, 0), M.carved);
    const top = [eaveY + Math.sin(th) * fl + 0.24, s * (run - Math.cos(th) * fl)]; // each ends in a beast's head looking out along the ridge
    add(at(box(0.14 * hs, 0.2 * hs, 0.42 * hs), e * (hl + 0.78), top[0] + 0.06, top[1] - s * 0.1, s * (th - 0.9), 0, 0), M.carved);
  }
  if (hall) { add(at(box(len * 0.3, 0.5, 0.9), 0, ridge + 0.45, 0), M.dark); add(at(box(len * 0.3 + 0.7, 0.16, 1.7, 2.4), 0, ridge + 0.78, 0), roofMat); } // the smoke louver along the ridge
  else add(at(box(1.0, 0.16, 0.6), 0.6, ridge + 0.36, 0), M.dark);
  const y0 = heightAt(x, z);
  const [sx, sz] = toWorld(x, z, ry, 0.6, 0);
  ctx.smoke.push({ x: sx, y: y0 + ridge + 0.5, z: sz, id: o.id });
  ctx.addBox(x, z, hl + 0.3, hw + 0.3, ry);
  const info = { id: o.id, x, z, ry, len, wid, ridge, y: y0, ridgePts: [] };
  for (const t of [-0.32, 0, 0.32]) { const [rx, rz] = toWorld(x, z, ry, t * len, 0); info.ridgePts.push({ x: rx, y: y0 + ridge - 0.4, z: rz }); }
  if (door) { const [dx, dz] = toWorld(x, z, ry, doorX, door * (hw + 1.3)); info.door = { x: dx, z: dz }; }
  return info;
}

/** Open-sided smithy: four posts, a thatched roof, a stone forge and an anvil. */
export function smithy(ctx, x, z, ry) {
  const add = placer(ctx, x, z, ry);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(at(box(0.24, 2.5, 0.24), sx * 2.6, 1.25, sz * 1.9), M.timber);
  const run = 2.5, rise = 1.3, sl = Math.hypot(run, rise), th = Math.atan2(rise, run);
  for (const s of [-1, 1]) add(at(box(6.2, 0.26, sl + 0.1, 2.4), 0, 2.5 + rise / 2, (s * run) / 2, s * th, 0, 0), M.thatch);
  add(at(box(5.2, 2.2, 0.2), 0, 1.1, 1.9), M.plank);
  add(at(box(1.5, 0.9, 1.3), -1.4, 0.45, 0.6), M.stone);
  add(at(box(1.1, 0.12, 0.9), -1.4, 0.94, 0.6), M.ember);
  add(at(box(0.5, 0.55, 0.5), 0.6, 0.275, -0.2), M.timber);
  add(at(box(0.62, 0.2, 0.22), 0.6, 0.66, -0.2), M.iron);
  add(at(box(0.2, 0.14, 0.2), 0.94, 0.63, -0.2), M.iron);
  barrel(ctx, ...toWorld(x, z, ry, 2.0, 0.9));
  ctx.addBox(...toWorld(x, z, ry, 0, 1.9), 2.9, 0.3, ry);
  const [fx, fz] = toWorld(x, z, ry, -1.4, 0.6);
  const [ax, az] = toWorld(x, z, ry, 0.6, -0.2);
  ctx.addCircle(fx, fz, 0.9); ctx.addCircle(ax, az, 0.45);
  return { forge: { x: fx, y: heightAt(x, z) + 1.0, z: fz }, anvil: { x: ax, z: az } };
}

/** Post-and-rail fence along a polyline. */
export function fence(ctx, pts, { collide = true } = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2.2));
    const ry = Math.atan2(-(bz - az), bx - ax);
    for (let k = 0; k <= n; k++) {
      const t = k / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t, py = heightAt(px, pz);
      ctx.b.add(at(cyl(0.06, 0.075, 1.25, 5), px, py + 0.55, pz, 0, k * 1.7, 0), M.timber);
      if (k < n) {
        const t2 = (k + 1) / n, qx = ax + (bx - ax) * t2, qz = az + (bz - az) * t2, qy = heightAt(qx, qz);
        const sl = Math.hypot(qx - px, qz - pz), pitch = Math.atan2(qy - py, sl);
        for (const h of [0.42, 0.82, 1.08])
          ctx.b.add(at(box(sl + 0.2, 0.07, 0.05), (px + qx) / 2, (py + qy) / 2 + h, (pz + qz) / 2, 0, ry, pitch), M.timber);
      }
    }
    if (collide) ctx.addBox((ax + bx) / 2, (az + bz) / 2, len / 2, 0.16, ry, 1.1);
  }
}

export function woodpile(ctx, x, z, ry, rows = 4, cols = 7) {
  const add = placer(ctx, x, z, ry), r = rng(((x * 31 + z * 17) | 0) + 7);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols - (j % 2); i++) {
    const g = cyl(0.13, 0.13, 1.05 + r() * 0.1, 6);
    add(at(g, (i - cols / 2 + 0.5 + (j % 2) * 0.5) * 0.27, 0.14 + j * 0.235, (r() - 0.5) * 0.06, Math.PI / 2, 0, r() * 3), M.bark);
  }
  for (const s of [-1, 1]) add(at(box(0.1, rows * 0.26 + 0.3, 0.1), s * (cols * 0.135 + 0.1), rows * 0.13, 0), M.timber);
  ctx.addBox(x, z, cols * 0.14 + 0.15, 0.6, ry, 1);
}
export function choppingBlock(ctx, x, z) {
  ctx.b.add(at(cyl(0.36, 0.42, 0.55, 9), x, heightAt(x, z) + 0.26, z), M.bark);
  ctx.addCircle(x, z, 0.45);
}
export function barrel(ctx, x, z) {
  const y = heightAt(x, z);
  ctx.b.add(at(cyl(0.3, 0.3, 0.9, 10), x, y + 0.45, z, 0, 0, 0, 1.12, 1, 1.12), M.plank);
  for (const h of [0.14, 0.76]) ctx.b.add(at(cyl(0.345, 0.345, 0.05, 10), x, y + h, z), M.iron);
  ctx.addCircle(x, z, 0.42);
}
export function crate(ctx, x, z, ry, s = 0.7) {
  ctx.b.add(at(box(s, s * 0.8, s), x, heightAt(x, z) + s * 0.4, z, 0, ry, 0), M.plank);
  ctx.addCircle(x, z, s * 0.6);
}
export function hayStack(ctx, x, z, s = 1) {
  const y = heightAt(x, z);
  ctx.b.add(at(sphere(1.4, 10, 7), x, y + 0.8 * s, z, 0, 0, 0, s, s * 0.95, s), M.hay);
  ctx.b.add(at(cone(1.1, 1.3, 9), x, y + 2.05 * s, z, 0, 0, 0, s), M.hay);
  ctx.addCircle(x, z, 1.35 * s, 2.4);
}
export function cart(ctx, x, z, ry) {
  const add = placer(ctx, x, z, ry);
  add(at(box(2.4, 0.14, 1.3), 0, 0.72, 0), M.plank);
  for (const s of [-1, 1]) add(at(box(2.4, 0.5, 0.08), 0, 1.0, s * 0.65), M.plank);
  add(at(box(0.08, 0.5, 1.3), -1.2, 1.0, 0), M.plank);
  for (const s of [-1, 1]) {
    add(at(cyl(0.55, 0.55, 0.1, 12), 0.1, 0.55, s * 0.78, Math.PI / 2, 0, 0), M.timber);
    add(at(box(1.9, 0.09, 0.09), 2.05, 0.56, s * 0.5, 0, 0, -0.16), M.timber);
  }
  add(at(sphere(0.8, 8, 6), -0.2, 1.15, 0, 0, 0, 0, 1.3, 0.6, 0.75), M.hay);
  ctx.addBox(x, z, 1.4, 0.9, ry, 1.4);
}
export function well(ctx, x, z) {
  const y = heightAt(x, z);
  ctx.b.add(at(cyl(0.95, 1.05, 0.85, 12), x, y + 0.42, z), M.stone);
  ctx.b.add(at(cyl(0.72, 0.72, 0.06, 12), x, y + 0.84, z), M.dark);
  for (const s of [-1, 1]) ctx.b.add(at(box(0.16, 2.3, 0.16), x + s * 1.05, y + 1.15, z), M.timber);
  ctx.b.add(at(box(2.5, 0.16, 0.16), x, y + 2.3, z), M.timber);
  ctx.b.add(at(cyl(0.1, 0.1, 1.7, 6), x, y + 1.9, z, 0, 0, Math.PI / 2), M.timber);
  ctx.b.add(at(cyl(0.16, 0.13, 0.26, 8), x + 0.2, y + 1.25, z), M.plank);
  ctx.addCircle(x, z, 1.25);
}
export function dryingRack(ctx, x, z, ry) {
  const add = placer(ctx, x, z, ry), r = rng(((x + z) | 0) + 3);
  for (const s of [-1, 1]) for (const k of [-1, 1]) add(at(cyl(0.045, 0.05, 2.3, 5), s * 1.5, 1.1, k * 0.32, k * 0.28, 0, 0), M.timber);
  add(at(cyl(0.04, 0.04, 3.3, 5), 0, 2.1, 0, 0, 0, Math.PI / 2), M.timber);
  for (let i = 0; i < 9; i++)
    add(tint(at(sphere(0.1, 6, 5), -1.25 + i * 0.31, 1.78 + r() * 0.05, 0, 0, 0, r() * 0.2 - 0.1, 0.5, 2.6, 1), 0xb7ad96, 0.2, i), M.vc);
  ctx.addBox(x, z, 1.7, 0.4, ry, 1);
}
/** Warp-weighted loom leaning against two posts. */
export function loom(ctx, x, z, ry) {
  const add = placer(ctx, x, z, ry);
  for (const s of [-1, 1]) add(at(box(0.09, 2.1, 0.09), s * 0.8, 1.0, 0, 0.16, 0, 0), M.timber);
  add(at(cyl(0.06, 0.06, 1.9, 6), 0, 1.95, -0.15, 0, 0, Math.PI / 2), M.timber);
  add(at(box(1.45, 1.1, 0.02), 0, 1.35, -0.06, 0.16, 0, 0), M.cloth(0x7d8a5c));
  for (let i = 0; i < 8; i++) add(at(sphere(0.055, 6, 5), -0.63 + i * 0.18, 0.42, 0.07), M.stone);
  ctx.addBox(x, z, 0.95, 0.3, ry, 1.5);
}
/** Training post (pell) with a battered shield. */
export function pell(ctx, x, z) {
  const y = heightAt(x, z);
  ctx.b.add(at(cyl(0.13, 0.15, 2.0, 7), x, y + 1.0, z), M.bark);
  ctx.b.add(at(box(1.1, 0.1, 0.1), x, y + 1.35, z), M.timber);
  ctx.b.add(at(cyl(0.22, 0.22, 0.5, 8), x, y + 1.72, z), M.hay);
  ctx.addCircle(x, z, 0.3);
}
export function fireRing(ctx, x, z, r = 0.55) {
  const y = heightAt(x, z), rr = rng(((x * 7 + z) | 0) + 9);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.283;
    ctx.b.add(at(sphere(0.17 + rr() * 0.07, 6, 5), x + Math.cos(a) * r, y + 0.06, z + Math.sin(a) * r, 0, rr() * 3, 0, 1, 0.7, 1), M.stone);
  }
  for (let i = 0; i < 3; i++) ctx.b.add(at(cyl(0.06, 0.07, 0.8, 5), x, y + 0.1, z, Math.PI / 2 - 0.25, i * 2.1, 0), M.dark);
  ctx.addCircle(x, z, r + 0.15, 0.5);
}
export function leanTo(ctx, x, z, ry) {
  const add = placer(ctx, x, z, ry);
  for (const s of [-1, 1]) add(at(cyl(0.06, 0.07, 1.9, 5), s * 1.3, 0.9, 0.5, -0.1, 0, 0), M.bark);
  add(at(cyl(0.055, 0.055, 2.9, 5), 0, 1.78, 0.42, 0, 0, Math.PI / 2), M.bark);
  add(at(box(2.7, 0.07, 2.3, 2), 0, 0.9, -0.52, -0.86, 0, 0), M.turf);
  for (let i = 0; i < 6; i++) add(at(cyl(0.035, 0.04, 2.4, 4), -1.2 + i * 0.48, 0.9, -0.5, 0.71, 0, 0), M.bark);
  add(at(box(1.9, 0.12, 0.85, 2), 0, 0.1, -0.35), M.hay);
  ctx.addBox(...toWorld(x, z, ry, 0, -0.9), 1.4, 0.5, ry, 1);
}
export function runestone(ctx, x, z, ry) {
  const y = heightAt(x, z);
  const g = box(1.35, 2.7, 0.42, 1.35);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.72); p.setZ(i, p.getZ(i) * 0.8); }
  g.computeVertexNormals();
  const uv = g.attributes.uv; // front and back faces show the whole carving once
  for (const f of [4, 5]) { const q = [[0, 1], [1, 1], [0, 0], [1, 0]]; for (let i = 0; i < 4; i++) uv.setXY(f * 4 + i, q[i][0], q[i][1]); }
  ctx.b.add(at(g, x, y + 1.2, z, 0.05, ry, 0.03), M.rune);
  ctx.addBox(x, z, 0.75, 0.32, ry, 2.6);
}
export function bench(ctx, x, z, ry) {
  const add = placer(ctx, x, z, ry);
  add(at(box(1.8, 0.09, 0.4), 0, 0.46, 0), M.plank);
  for (const s of [-1, 1]) add(at(box(0.1, 0.46, 0.36), s * 0.7, 0.23, 0), M.timber);
  ctx.addBox(x, z, 0.95, 0.25, ry, 0.5);
}
export function dock(ctx, x, z, len = 22) {
  for (let i = 0; i < len / 2; i++) {
    const pz = z + i * 2;
    for (const s of [-1, 1]) ctx.b.add(at(cyl(0.11, 0.13, 3.4, 6), x + s * 1.25, -0.6, pz), M.bark);
  }
  ctx.b.add(at(box(2.9, 0.14, len), x, 1.02, z + len / 2 - 1), M.plank);
  return { x, z0: z - 1, z1: z + len - 1, y: 1.09, hw: 1.45 };
}

// ---------------------------------------------------------------------------------------
// Boats
// ---------------------------------------------------------------------------------------
function hullGeo(L, B, D, rise) {
  // Clinker-built: each side is a run of strakes from the keel up to the rail, and the lower edge of each stands out
  // over the one below it. Every strake carries one board of the hull picture (TEX.hull: the shadow of the lap along
  // its top, a row of rivets along its bottom), set off along its length so that the knots do not line up.
  const nu = 26, strakes = L > 10 ? 6 : 4, lap = Math.min(0.05, B * 0.013), pos = [], uv = [], idx = [];
  const pt = (u, phi, out) => {
    const au = Math.abs(u), taper = Math.pow(Math.max(0, 1 - Math.pow(au, 2.4)), 0.7), sp = Math.sin(phi), o = out * Math.sqrt(taper);
    pos.push(Math.sign(sp) * Math.pow(Math.abs(sp), 0.8) * (B / 2) * taper + sp * o, Math.pow(au, 3.4) * rise + D * (1 - Math.cos(phi)) * (0.55 + 0.45 * taper) - Math.cos(phi) * o, (u * L) / 2);
  };
  for (const side of [-1, 1]) for (let k = 0; k < strakes; k++) {
    const p0 = side * (k / strakes) * (Math.PI / 2), p1 = side * ((k + 1) / strakes) * (Math.PI / 2), base = pos.length / 3;
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1, along = (i / nu) * (L / 3.2) + k * 0.37 + (side > 0 ? 0.5 : 0);
      pt(u, p0, lap); pt(u, p1, 0); uv.push(along, 0, along, 1);
    }
    for (let i = 0; i < nu; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** The deck boards, cut to the shape of the hull at their height, so that they do not come out through her sides. */
function deckGeo(L, B, D, rise, y) {
  const n = 18, pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const u = ((i / n) * 2 - 1) * 0.66, au = Math.abs(u), taper = Math.pow(Math.max(0, 1 - Math.pow(au, 2.4)), 0.7);
    const c = 1 - Math.max(0, y - Math.pow(au, 3.4) * rise) / (D * (0.55 + 0.45 * taper)), hw = Math.pow(Math.sqrt(Math.max(0, 1 - c * c)), 0.8) * (B / 2) * taper * 0.97;
    pos.push(-hw, y, (u * L) / 2, hw, y, (u * L) / 2); uv.push(-hw / 1.6, (u * L) / 3.2, hw / 1.6, (u * L) / 3.2);
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
export function makeShip({ L = 21, B = 4.4, D = 1.55, rise = 2.5, sail = true, shields = true, seed = 1, mast = 9.5 } = {}) {
  const b = new Builder(), r = rng(seed);
  let helm = null;
  b.add(hullGeo(L, B, D, rise), M.hull);
  b.add(deckGeo(L, B, D, rise, D * 0.42 + 0.05), M.plank);
  for (let i = -3; i <= 3; i++) b.add(at(box(B * 0.8, 0.09, 0.3), 0, D * 0.7, (i * L) / 11), M.timber); // rowing benches
  // stem and stern posts
  for (const s of [-1, 1]) {
    const z0 = (s * L) / 2 * 0.985, y0 = rise * 0.96 + D * 0.5;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, y0 - 0.9, z0 - s * 0.5), new THREE.Vector3(0, y0, z0), new THREE.Vector3(0, y0 + 1.25, z0 + s * 0.42),
      new THREE.Vector3(0, y0 + 2.1, z0 + s * 0.3), new THREE.Vector3(0, y0 + 2.45, z0 - s * 0.12),
    ]);
    const post = new THREE.TubeGeometry(curve, 14, L > 10 ? 0.15 : 0.07, 6), pu = post.attributes.uv;
    for (let i = 0; i < pu.count; i++) pu.setXY(i, pu.getX(i) * 5, pu.getY(i)); // the carving runs up the post
    b.add(post, L > 10 ? M.carved : M.timber);
    if (L > 10 && s === 1) { // the dragon's head on the prow: skull, snout, an open lower jaw, two horns
      b.add(at(box(0.3, 0.34, 0.75, 0.75), 0, y0 + 2.5, z0 + 0.22, -0.25, 0, 0), M.carved);
      b.add(at(box(0.22, 0.2, 0.42, 0.75), 0, y0 + 2.48, z0 + 0.74, -0.12, 0, 0), M.carved);
      b.add(at(box(0.18, 0.08, 0.5, 0.75), 0, y0 + 2.22, z0 + 0.62, 0.32, 0, 0), M.carved);
      b.add(at(cone(0.09, 0.4, 5), 0.1, y0 + 2.78, z0 - 0.02, -0.5, 0, 0), M.timber);
      b.add(at(cone(0.09, 0.4, 5), -0.1, y0 + 2.78, z0 - 0.02, -0.5, 0, 0), M.timber);
    }
  }
  if (L > 10) {
    const k = mast / 9.5; // everything aloft scales with the mast
    b.add(at(cyl(0.13 * Math.sqrt(k), 0.17 * Math.sqrt(k), mast, 7), 0, D * 0.42 + mast / 2, 0), M.timber);
    b.add(at(cyl(0.08, 0.08, 7.4 * k, 6), 0, D * 0.42 + mast - 0.9, 0.15, 0, 0, Math.PI / 2), M.timber);
    if (sail) {
      const sg = new THREE.PlaneGeometry(6.8 * k, 5.6 * k, 8, 6), p = sg.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.cos((p.getX(i) / (3.4 * k)) * 1.4) * 0.7 * k * (0.4 + 0.6 * (0.5 - p.getY(i) / (5.6 * k))));
      sg.computeVertexNormals();
      b.add(at(sg, 0, D * 0.42 + mast - 0.9 - 2.9 * k, 0.2), M.sail);
    }
    { // standing rigging: a stay to the stem and one to the stern, two shrouds a side; and the steering oar on her right quarter
      const top = [0, D * 0.42 + mast - 0.25, 0], yp = rise * 0.96 + D * 0.5 + 1.9, zs = (L / 2) * 0.985 + 0.3;
      b.add(rope(top, [0, yp, zs]), M.timber); b.add(rope(top, [0, yp, -zs]), M.timber);
      for (const s of [-1, 1]) for (const dz of [-0.9, 0.9]) b.add(rope(top, [s * (B / 2) * 0.97, D * 0.98, dz]), M.timber);
      const zq = -L * 0.39, tq = Math.pow(1 - Math.pow(0.78, 2.4), 0.7), xq = -((B / 2) * tq + 0.14), yq = Math.pow(0.78, 3.4) * rise + D * (0.55 + 0.45 * tq);
      // the steering oar is a piece of its own, turning about its own length at the rail (float.js turns it with her course)
      helm = new THREE.Mesh(merge([at(box(0.07, yq + 0.3, 0.36), 0, -yq / 2 + 0.15 - 0.42, 0, 0.12, 0, 0), at(box(0.9, 0.06, 0.07), 0.45, 0, 0.06)]), M.timber); // blade from the rail to under the water; the tiller, inboard
      helm.position.set(xq, yq + 0.42, zq); helm.castShadow = true;
    }
    if (shields) {
      for (let i = -7; i <= 7; i++) for (const s of [-1, 1]) {
        const u = i / 10.5, taper = Math.pow(1 - Math.pow(Math.abs(u), 2.4), 0.7);
        b.add(at(shieldGeo(0.42, 0.07, (r() * 4) | 0, 12), s * ((B / 2) * taper + 0.1), Math.pow(Math.abs(u), 3.4) * rise + D * (0.55 + 0.45 * taper) - 0.2, (u * L) / 2, 0, 0, Math.PI / 2), M.shield);
      }
    }
  }
  const grp = b.build();
  if (helm) { grp.add(helm); grp.userData.helm = helm; }
  grp.userData.deckY = D * 0.42 + 0.06; grp.userData.yardY = D * 0.42 + mast - 0.9; grp.userData.hull = { L, B, D, rise };
  grp.userData.makeOars = () => makeOars(grp.userData.hull); // float.js, the first time she is under way
  return floats(grp, L, B); // she rides the swell (float.js)
}

// ---- oars ------------------------------------------------------------------------------------------------------------
// One oar a side for each metre or so of her waist, through a port just under the rail, as one mesh per ship that the
// vertex shader rows: each oar turns about its port, sweeping aft through the water and lifted clear coming forward.
// float.js builds them the first time a ship is under way (a moored ship never needs them) and sets uRow (0 shipped,
// 1 rowing) and uPhase. Every oar carries its port (aPort) and its side (aSide), so one draw rows them all.
/** The oars' shader, shared by every ship's oars (one program); each ship's material brings its own uRow and uPhase. */
function oarCompile(sh) {
  sh.uniforms.uRow = this.userData.row; sh.uniforms.uPhase = this.userData.phase;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 aPort; attribute float aSide; uniform float uRow; uniform float uPhase;
      vec3 oarTurn(vec3 v) {
        // sweep: the blade travels aft in the water and forward in the air; lift: up in the air, down to pull;
        // shipped (uRow 0): drawn up steeply, out of the water
        float sweep = uRow * 0.42 * sin(uPhase), lift = uRow * 0.16 * cos(uPhase) + (1.0 - uRow) * 0.55;
        float cs = cos(sweep), ss = sin(sweep), cl = cos(lift * aSide), sl = sin(lift * aSide);
        v = vec3(v.x * cl - v.y * sl, v.x * sl + v.y * cl, v.z);                       // lift about the fore-aft line
        return vec3(v.x * cs + v.z * ss * aSide, v.y, -v.x * ss * aSide + v.z * cs);   // sweep about the upright through the port
      }`)
    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n      objectNormal = oarTurn(objectNormal);')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n      transformed = aPort + oarTurn(transformed - aPort);');
}
/** The oars for a hull of this size, as a mesh to add to the ship, with its own rowing uniforms. */
export function makeOars({ L, B, D, rise }) {
  const n = L > 10 ? Math.max(5, Math.round((L * 0.62) / 1.0)) : 2, span = L > 10 ? 0.62 : 0.4, len = B * 0.4 + (L > 10 ? 2.9 : 1.6);
  const geos = [];
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const u = n === 1 ? 0 : -span + (2 * span * i) / (n - 1), z = (u * L) / 2, taper = Math.pow(1 - Math.pow(Math.abs(u), 2.4), 0.7);
    const px = s * ((B / 2) * taper + 0.04), py = Math.pow(Math.abs(u), 3.4) * rise + D * (0.55 + 0.45 * taper) - 0.18, inboard = len * 0.28;
    // laid along +x (outward), then dropped 22 degrees, then set at the port
    const shaft = at(cyl(0.04, 0.05, len, 5), 0, 0, 0, 0, 0, Math.PI / 2); shaft.translate(len / 2 - inboard, 0, 0);
    const blade = at(box(0.95, 0.03, 0.16), len - inboard - 0.45, 0, 0);
    const oar = merge([shaft, blade]);
    if (s < 0) oar.scale(-1, 1, 1);
    oar.rotateZ(-0.38 * s); oar.translate(px, py, z);
    const c = oar.attributes.position.count;
    oar.setAttribute('aPort', new THREE.BufferAttribute(new Float32Array(c * 3).map((_, k) => [px, py, z][k % 3]), 3));
    oar.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(c).fill(s), 1));
    geos.push(oar);
  }
  const mat = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });
  mat.userData.row = { value: 0 }; mat.userData.phase = { value: 0 }; mat.onBeforeCompile = oarCompile; mat.customProgramCacheKey = () => 'oars1';
  const mesh = new THREE.Mesh(merge(geos), mat); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.row = mat.userData.row; mesh.userData.phase = mat.userData.phase;
  return mesh;
}
