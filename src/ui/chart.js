// The map's ground, drawn the way a chart-maker would: land tinted by its height and shaded as if lit from the
// north-west, so hills and the valley's walls stand up off the page; forest as soft green and little tree marks; the
// sea pale over the shallows and darker in the deeps, with a fine line at each few metres of depth; and the coast
// inked. Everything is worked out from the heights of the world itself, at the size the map is shown, so it is sharp.
// Names are placed by placeLabel(), which moves a name off another rather than print the two on top of each other.
import { heightAt, riverX, riverSurfaceY, forestDensity, HALF } from '../world/terrain.js';
import { PATHS, FIELDS } from '../world/layout.js';
import { noise2 } from '../core/util.js';

/** The part of the world the sea chart shows: from the landing beach south to the edge of the chart. */
export const SEA_VIEW = { x0: -640, z0: 160, w: 1280, h: 1440 };
/** The whole open sea: the home waters in the north, the five great islands round and beyond them. */
export const REALM_VIEW = { x0: -1960, z0: 140, w: 3920, h: 3480 };

const LAND = [[0, [204, 198, 152]], [5, [196, 186, 140]], [18, [184, 168, 126]], [34, [170, 156, 128]], [48, [214, 210, 198]], [70, [238, 236, 230]]];
const tint = (h) => {
  for (let i = 1; i < LAND.length; i++) if (h < LAND[i][0]) { const [h0, a] = LAND[i - 1], [h1, b] = LAND[i], t = (h - h0) / (h1 - h0); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  return LAND[LAND.length - 1][1];
};
const LL = Math.hypot(0.6, 0.75, 0.6), FLAT = 0.75 / LL; // the light, (-0.6, 0.75, -0.6): from the north-west and high
const grain = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) & 255) / 255 - 0.5; };

/** Paint the ground of the view box V ({x0, z0, w, h} in metres) on a W x H canvas. valley: the home valley, which
 *  also has its forest, river, paths and fields. boxes: the world's solid footprints (world.boxes), drawn as buildings and walls. */
export function paintChart(V, W, H, { valley = false, boxes = null } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data, px = V.w / W, pz = V.h / H, K = Math.max(1, Math.round(2.5 / Math.min(px, pz))), GW = W + 2 * K; // K: the slope is measured over 2.5 m or more (the heights are on a 2.5 m grid; closer, its flat triangles show)
  const hs = new Float32Array(GW * (H + 2 * K));
  for (let j = -K; j < H + K; j++) for (let i = -K; i < W + K; i++) {
    const wx = V.x0 + (i + 0.5) * px, wz = V.z0 + (j + 0.5) * pz;
    let h = heightAt(wx, wz);
    if (valley && Math.abs(wx - riverX(wz)) < 7 && wz < 205 && h < riverSurfaceY(wz) + 0.2) h = Math.min(h, -0.6); // the river is water on the map
    hs[(j + K) * GW + i + K] = h;
  }
  // forest, on a coarser grid (it is slow to ask) and read back smoothly
  const F = 4, fw = Math.ceil(W / F) + 2, fh = Math.ceil(H / F) + 2, fd = valley ? new Float32Array(fw * fh) : null;
  if (fd) for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) { const wx = V.x0 + i * F * px, wz = V.z0 + j * F * pz; fd[j * fw + i] = Math.abs(wx) < HALF && Math.abs(wz) < HALF && heightAt(wx, wz) > 0.4 ? forestDensity(wx, wz) * (0.55 + 0.9 * (noise2(wx * 0.025, wz * 0.025) * 0.5 + 0.5)) * Math.min(1, Math.max(0, (132 - wz + noise2(wx * 0.04, 3.7) * 22) / 20)) : 0; } // the wood's edges wander (the game's own stops dead at z = 132)
  const forest = (i, j) => { if (!fd) return 0; const fx = i / F, fz = j / F, a = fx | 0, b = fz | 0, tx = fx - a, tz = fz - b, k = b * fw + a; return (fd[k] * (1 - tx) + fd[k + 1] * tx) * (1 - tz) + (fd[k + fw] * (1 - tx) + fd[k + fw + 1] * tx) * tz; };
  const H_ = (i, j) => hs[(j + K) * GW + i + K];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const h = H_(i, j), o = (j * W + i) * 4, n = grain(i, j) * 7;
    let r, g, b;
    if (h < 0.03) {
      const dep = -h, k = Math.min(1, dep / 14);
      r = 172 - k * 66; g = 194 - k * 60; b = 188 - k * 46;
      // a fine line at each 3 m of depth, and the edge of the shallows
      const band = (a) => Math.floor(-a / 3);
      if (band(h) !== band(H_(i + 1, j)) || band(h) !== band(H_(i, j + 1))) { r -= 16; g -= 14; b -= 10; }
      if ((h > -1.2) !== (H_(i + 1, j) > -1.2) || (h > -1.2) !== (H_(i, j + 1) > -1.2)) { r -= 10; g -= 8; b -= 4; }
    } else {
      [r, g, b] = tint(h);
      const fo = forest(i, j);
      // only real woodland: a thin scatter of trees is left as open ground
      if (fo > 0.32) { const t = Math.min(1, (fo - 0.32) * 1.8) * 0.7; r += (120 - r) * t; g += (138 - g) * t; b += (96 - b) * t; }
      // light from the north-west, the hills drawn a little steeper than they are
      // (north is up the page, which is toward -z; the slopes are drawn 2.2 times as steep as they are)
      const sx = ((H_(i + K, j) - H_(i - K, j)) / (2 * K * px)) * 2.2, sz = ((H_(i, j + K) - H_(i, j - K)) / (2 * K * pz)) * 2.2;
      const lit = (sx * 0.6 + 0.75 + sz * 0.6) / Math.sqrt(1 + sx * sx + sz * sz) / LL, shade = Math.max(0.6, Math.min(1.22, 1 + (lit - FLAT) * 1.4));
      r *= shade; g *= shade; b *= shade;
      // the coast, inked: land beside the sea
      if (H_(i + 1, j) < 0.03 || H_(i - 1, j) < 0.03 || H_(i, j + 1) < 0.03 || H_(i, j - 1) < 0.03) { r = 84; g = 64; b = 44; }
    }
    d[o] = r + n; d[o + 1] = g + n; d[o + 2] = b + n * 0.8; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  if (valley) {
    const X = (v) => ((v - V.x0) / V.w) * W, Z = (v) => ((v - V.z0) / V.h) * H, m = W / V.w;
    // tree marks, set on a loose grid where the forest is thick
    x.fillStyle = 'rgba(52,70,40,0.55)';
    for (let j = 6; j < H; j += 11) for (let i = 6 + ((j / 11) % 2) * 5; i < W; i += 10) {
      const jx = i + grain(i, j) * 6, jz = j + grain(j, i) * 6;
      if (forest(jx, jz) < 0.5 || H_(jx | 0, jz | 0) < 0.5 || grain(i * 3, j) > 0.3) continue;
      x.beginPath(); x.moveTo(jx, jz - 4.5); x.lineTo(jx + 3, jz + 2.5); x.lineTo(jx - 3, jz + 2.5); x.closePath(); x.fill();
    }
    // fields, hatched; paths, dashed
    x.save(); x.strokeStyle = 'rgba(110,84,50,0.55)'; x.lineWidth = 1;
    for (const f of FIELDS) {
      x.save(); x.translate(X(f.x), Z(f.z)); x.rotate(f.ry); x.strokeRect((-f.w / 2) * m, (-f.d / 2) * m, f.w * m, f.d * m);
      for (let k = -f.w / 2 + 1.6; k < f.w / 2; k += 1.6) { x.beginPath(); x.moveTo(k * m, (-f.d / 2) * m); x.lineTo(k * m, (f.d / 2) * m); x.stroke(); }
      x.restore();
    }
    x.setLineDash([5, 3]); x.strokeStyle = 'rgba(96,66,38,0.8)'; x.lineCap = 'round';
    for (const p of PATHS) { x.lineWidth = Math.max(1.2, p.w * m * 0.8); x.beginPath(); p.pts.forEach(([a, b], k) => x[k ? 'lineTo' : 'moveTo'](X(a), Z(b))); x.stroke(); }
    x.restore();
  }
  if (boxes) { // what stands on the land: buildings as dark footprints, long thin ones (walls, palisades, fences) as lines
    const X = (v) => ((v - V.x0) / V.w) * W, Z = (v) => ((v - V.z0) / V.h) * H, m = W / V.w;
    const corner = (b, lx, lz) => [X(b.x + lx * b.c + lz * b.s), Z(b.z - lx * b.s + lz * b.c)];
    x.save(); x.lineJoin = 'round';
    for (const b of boxes) {
      if (b.x + Math.max(b.hw, b.hd) < V.x0 || b.x - Math.max(b.hw, b.hd) > V.x0 + V.w || b.z + Math.max(b.hw, b.hd) < V.z0 || b.z - Math.max(b.hw, b.hd) > V.z0 + V.h) continue;
      const thin = Math.min(b.hw, b.hd) < 0.7;
      if (thin) {
        const long = b.hw > b.hd, [a0, a1] = long ? [corner(b, -b.hw, 0), corner(b, b.hw, 0)] : [corner(b, 0, -b.hd), corner(b, 0, b.hd)];
        x.strokeStyle = 'rgba(58,40,26,0.85)'; x.lineWidth = Math.max(1.2, Math.min(b.hw, b.hd) * 2 * m); x.beginPath(); x.moveTo(...a0); x.lineTo(...a1); x.stroke();
      } else {
        const q = [corner(b, -b.hw, -b.hd), corner(b, b.hw, -b.hd), corner(b, b.hw, b.hd), corner(b, -b.hw, b.hd)];
        x.beginPath(); x.moveTo(...q[0]); for (let i = 1; i < 4; i++) x.lineTo(...q[i]); x.closePath();
        x.fillStyle = 'rgba(92,64,42,0.92)'; x.fill(); x.strokeStyle = '#2a1c12'; x.lineWidth = Math.max(1, m * 0.25); x.stroke();
      }
    }
    x.restore();
  }
  return c;
}

/** Write names on the map without one landing on another. Each call tries above the spot, then below, right and left;
 *  a name that fits nowhere is left off unless `force` (the big names, placed first). */
export function labeller(x, W, H) {
  const boxes = [];
  const hit = (b) => b[0] < 2 || b[1] < 2 || b[2] > W - 2 || b[3] > H - 2 || boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  return (text, cx, cy, dy = -8, force = false) => {
    const w = x.measureText(text).width, fs = parseFloat(/(\d+(\.\d+)?)px/.exec(x.font)[1]), al = x.textAlign;
    const tries = [[0, dy], [0, -dy + fs * 0.8], [w / 2 + 8, fs * 0.35], [-w / 2 - 8, fs * 0.35]];
    for (const [ox, oy] of tries) {
      const tx = cx + ox, ty = cy + oy, b = [tx - w / 2 - 2, ty - fs, tx + w / 2 + 2, ty + fs * 0.3];
      if (hit(b) && !force) continue;
      boxes.push(b); x.textAlign = 'center';
      x.strokeStyle = 'rgba(236,224,196,0.85)'; x.lineWidth = 3; x.strokeText(text, tx, ty); x.fillText(text, tx, ty);
      x.textAlign = al; return true;
    }
    return false;
  };
}
