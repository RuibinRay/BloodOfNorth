// Procedural textures, shared materials and geometry helpers.
// Everything visual in this build is generated in code — these are the placeholders that
// Higgsfield / Meshy GLB assets will replace slot by slot (see assets/registry.json).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../core/util.js';

/** Uniforms shared by every patched material (wind sway + snow cover). */
export const shared = { uTime: { value: 0 }, uSnow: { value: 0 }, uWind: { value: 1 } };

/** Adds wind sway and snow accumulation to a built-in material. */
export function patch(mat, { sway = 0, snow = 1, detail = null, upNormal = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.uniforms.uSnow = shared.uSnow;
    sh.uniforms.uWind = shared.uWind;
    if (detail) sh.uniforms.uDetail = { value: detail };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nvarying float vSnowF;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 nW = normal;
        float ph = 0.0;
        #ifdef USE_INSTANCING
          nW = mat3(instanceMatrix) * nW;
          vec4 iw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          ph = iw.x * 0.31 + iw.z * 0.27;
        #endif
        vSnowF = smoothstep(0.2, 0.85, normalize(mat3(modelMatrix) * nW).y);
        ${sway > 0 ? `float sw = (sin(uTime * 1.6 + ph) + 0.5 * sin(uTime * 3.3 + ph * 1.7)) * uWind * ${sway.toFixed(5)} * position.y * position.y;
        transformed.x += sw; transformed.z += sw * 0.6;` : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uSnow;\nvarying float vSnowF;\n${detail ? 'uniform sampler2D uDetail;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${detail ? 'diffuseColor.rgb *= (texture2D(uDetail, vMapUv * 120.0).r * 0.7 + 0.66) * (texture2D(uDetail, vMapUv * 17.3).r * 0.3 + 0.86);' : ''}
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.96), clamp(uSnow * ${snow.toFixed(2)} * vSnowF, 0.0, 1.0));`);
    if (upNormal) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
  };
  mat.customProgramCacheKey = () => `p${sway}_${snow}_${detail ? 1 : 0}_${upNormal ? 1 : 0}`;
  return mat;
}

// ---------------------------------------------------------------------------------------
// Canvas textures
// ---------------------------------------------------------------------------------------
function canvasTex(size, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

function speckle(g, s, r, n, colors, minR, maxR, alpha = 0.5) {
  for (let i = 0; i < n; i++) {
    const c = colors[(r() * colors.length) | 0];
    g.fillStyle = rgb(c[0], c[1], c[2], alpha * (0.4 + r() * 0.6));
    const rad = minR + r() * (maxR - minR);
    g.beginPath(); g.arc(r() * s, r() * s, rad, 0, 6.3); g.fill();
  }
}

export const TEX = {};
export function initTextures() {
  TEX.planks = canvasTex(256, (g, s) => {
    const r = rng(11);
    for (let p = 0; p < 8; p++) {
      const v = 0.82 + r() * 0.3;
      g.fillStyle = rgb(112 * v, 82 * v, 54 * v);
      g.fillRect(p * 32, 0, 32, s);
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = rgb(60, 40, 24, 0.12 + r() * 0.2);
        g.lineWidth = 0.6 + r();
        const x = p * 32 + 2 + r() * 28;
        g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + r() * 4 - 2, s * 0.3, x + r() * 4 - 2, s * 0.6, x + r() * 3 - 1.5, s); g.stroke();
      }
      g.fillStyle = rgb(30, 20, 12, 0.75); g.fillRect(p * 32, 0, 1.6, s);
      if (r() < 0.6) { g.fillStyle = rgb(50, 32, 18, 0.6); g.beginPath(); g.ellipse(p * 32 + 8 + r() * 16, r() * s, 3, 5, 0, 0, 6.3); g.fill(); }
    }
  });
  TEX.bark = canvasTex(128, (g, s) => {
    const r = rng(5);
    g.fillStyle = rgb(78, 60, 44); g.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      g.strokeStyle = rgb(30 + r() * 40, 22 + r() * 26, 14 + r() * 16, 0.35);
      g.lineWidth = 1 + r() * 2.5; const x = r() * s, y = r() * s;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 4 - 2, y + 10 + r() * 30); g.stroke();
    }
  });
  TEX.thatch = canvasTex(256, (g, s) => {
    const r = rng(21);
    g.fillStyle = rgb(150, 126, 76); g.fillRect(0, 0, s, s);
    for (let i = 0; i < 5200; i++) {
      const v = 0.55 + r() * 0.75;
      g.strokeStyle = rgb(170 * v, 142 * v, 84 * v, 0.55);
      g.lineWidth = 0.8 + r() * 0.8; const x = r() * s, y = r() * s;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 3 - 1.5, y + 8 + r() * 22); g.stroke();
    }
    for (let y = 0; y < s; y += 64) { const gr = g.createLinearGradient(0, y, 0, y + 14); gr.addColorStop(0, rgb(40, 28, 12, 0.55)); gr.addColorStop(1, rgb(40, 28, 12, 0)); g.fillStyle = gr; g.fillRect(0, y, s, 14); }
  });
  TEX.turf = canvasTex(256, (g, s) => {
    const r = rng(31);
    g.fillStyle = rgb(86, 96, 50); g.fillRect(0, 0, s, s);
    speckle(g, s, r, 900, [[70, 86, 38], [104, 108, 54], [120, 104, 60], [58, 70, 34], [136, 120, 70]], 2, 9, 0.5);
    for (let i = 0; i < 2600; i++) {
      const v = 0.6 + r() * 0.7; g.strokeStyle = rgb(96 * v, 110 * v, 52 * v, 0.6); g.lineWidth = 1;
      const x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 4 - 2, y - 3 - r() * 6); g.stroke();
    }
  });
  TEX.stone = canvasTex(256, (g, s) => {
    const r = rng(41);
    g.fillStyle = rgb(128, 124, 118); g.fillRect(0, 0, s, s);
    speckle(g, s, r, 700, [[100, 98, 94], [150, 146, 138], [116, 110, 100], [88, 90, 92]], 3, 16, 0.4);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = rgb(50, 48, 46, 0.4); g.lineWidth = 0.8 + r();
      let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += r() * 30 - 15; y += r() * 30 - 15; g.lineTo(x, y); } g.stroke();
    }
  });
  TEX.cloth = canvasTex(128, (g, s) => {
    const r = rng(51);
    g.fillStyle = rgb(226, 222, 214); g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 3) { g.fillStyle = rgb(170, 166, 158, 0.25 + r() * 0.2); g.fillRect(i, 0, 1, s); g.fillRect(0, i, s, 1); }
  });
  TEX.hay = canvasTex(128, (g, s) => {
    const r = rng(61);
    g.fillStyle = rgb(176, 150, 84); g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1500; i++) {
      const v = 0.6 + r() * 0.7; g.strokeStyle = rgb(196 * v, 168 * v, 92 * v, 0.6); g.lineWidth = 1;
      const x = r() * s, y = r() * s, a = r() * 6.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); g.stroke();
    }
  });
  TEX.detail = canvasTex(256, (g, s) => {
    const r = rng(71);
    g.fillStyle = rgb(128, 128, 128); g.fillRect(0, 0, s, s);
    speckle(g, s, r, 2600, [[70, 70, 70], [190, 190, 190], [100, 100, 100], [160, 160, 160], [220, 220, 220], [40, 40, 40]], 0.6, 3.2, 0.5);
  }, { srgb: false });
  TEX.sail = canvasTex(256, (g, s) => {
    const r = rng(81);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? rgb(196, 186, 164) : rgb(124, 34, 28); g.fillRect(i * 32, 0, 32, s); }
    for (let i = 0; i < s; i += 4) { g.fillStyle = rgb(0, 0, 0, 0.06 + r() * 0.06); g.fillRect(0, i, s, 1); }
  });
  TEX.rune = canvasTex(256, (g, s) => {
    const r = rng(91);
    g.fillStyle = rgb(122, 120, 116); g.fillRect(0, 0, s, s);
    speckle(g, s, r, 500, [[100, 98, 94], [146, 142, 134], [90, 92, 96]], 3, 14, 0.4);
    // a serpent band of angular, rune-like strokes in red ochre
    g.strokeStyle = rgb(140, 44, 30, 0.9); g.lineWidth = 3;
    g.beginPath(); g.moveTo(40, 250); g.bezierCurveTo(10, 150, 60, 60, 128, 30); g.bezierCurveTo(200, 60, 246, 150, 216, 250); g.stroke();
    g.beginPath(); g.moveTo(70, 250); g.bezierCurveTo(46, 160, 84, 96, 128, 70); g.bezierCurveTo(176, 96, 210, 160, 186, 250); g.stroke();
    g.lineWidth = 2.4;
    for (let i = 0; i < 26; i++) {
      const t = i / 25, a = Math.PI * (1 - t);
      const cx = 128 + Math.cos(a) * 88, cy = 240 - Math.sin(a) * 180 * 0.95;
      g.save(); g.translate(cx, cy); g.rotate(-a + Math.PI / 2);
      g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 8);
      const k = (r() * 4) | 0;
      if (k === 0) { g.moveTo(0, -8); g.lineTo(6, -3); g.lineTo(0, 2); }
      else if (k === 1) { g.moveTo(0, -4); g.lineTo(6, -8); g.moveTo(0, 2); g.lineTo(6, -2); }
      else if (k === 2) { g.moveTo(-5, -8); g.lineTo(5, 8); }
      else { g.moveTo(0, 0); g.lineTo(6, 6); g.moveTo(0, 0); g.lineTo(-6, 6); }
      g.stroke(); g.restore();
    }
  });
  // soft round sprite for particles
  TEX.dot = canvasTex(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  // tileable water normal map from summed integer-frequency waves
  TEX.waterN = (() => {
    const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d'), img = g.createImageData(s, s), r = rng(101);
    const waves = Array.from({ length: 14 }, () => ({ fx: ((r() * 9) | 0) - 4, fy: ((r() * 9) | 0) - 4, ph: r() * 6.3, a: 0.4 + r() }));
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      let dx = 0, dy = 0;
      for (const w of waves) {
        const f = Math.hypot(w.fx, w.fy) || 1;
        const cph = Math.cos((x / s) * 6.2832 * w.fx + (y / s) * 6.2832 * w.fy + w.ph) * w.a / f;
        dx += cph * w.fx; dy += cph * w.fy;
      }
      const nx = -dx * 0.16, ny = -dy * 0.16, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * s + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
}

// ---------------------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------------------
export const M = {};
const clothCache = new Map();
export function initMaterials() {
  initTextures();
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
  M.plank = patch(std({ map: TEX.planks }));
  M.timber = patch(std({ map: TEX.planks, color: 0x8a7663 }));
  M.bark = patch(std({ map: TEX.bark }));
  M.thatch = patch(std({ map: TEX.thatch, roughness: 1 }));
  M.turf = patch(std({ map: TEX.turf, roughness: 1 }));
  M.stone = patch(std({ map: TEX.stone, roughness: 0.95 }));
  M.hay = patch(std({ map: TEX.hay, roughness: 1 }));
  M.iron = std({ color: 0x565a60, roughness: 0.42, metalness: 0.85 });
  M.dark = std({ color: 0x0c0a08, roughness: 1 });
  M.rune = patch(std({ map: TEX.rune, roughness: 0.95 }), { snow: 0.6 });
  M.sail = std({ map: TEX.sail, roughness: 1, side: THREE.DoubleSide });
  M.ember = std({ color: 0x331008, emissive: 0xff5a14, emissiveIntensity: 1.6, roughness: 1 });
  // vertex-coloured: one material for all characters, one for props/animals/items
  M.char = std({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide });
  M.vc = patch(std({ vertexColors: true, roughness: 0.9 }));
  M.vcPlain = std({ vertexColors: true, roughness: 0.85 });
  M.cloth = (hex) => {
    if (!clothCache.has(hex)) clothCache.set(hex, std({ map: TEX.cloth, color: hex, roughness: 1, side: THREE.DoubleSide }));
    return clothCache.get(hex);
  };
}

// ---------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

/** Transform a geometry in place and return it. */
export function at(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  g.applyMatrix4(_m.compose(_p, _q, _s));
  return g;
}
/** Give a geometry a flat vertex colour (linear), with optional brightness jitter per vertex. */
export function tint(g, hex, jitter = 0, seed = 1) {
  const c = new THREE.Color(hex), n = g.attributes.position.count, arr = new Float32Array(n * 3), r = rng(seed);
  for (let i = 0; i < n; i++) {
    const k = 1 + (r() - 0.5) * jitter;
    arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
export function merge(geos) {
  const list = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  if (list.some((g) => g.attributes.color)) for (const g of list) if (!g.attributes.color) tint(g, 0xffffff);
  return mergeGeometries(list, false);
}

/** Box with UVs scaled to real size so plank/stone textures keep a constant texel density. */
export function box(w, h, d, tile = 1.6) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const su = (f < 2 ? d : w) / tile, sv = (f === 2 || f === 3 ? d : h) / tile;
    for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv); }
  }
  return g;
}
export function cyl(rt, rb, h, seg = 8, tile = 1.6, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), uv = g.attributes.uv;
  const su = (Math.PI * (rt + rb)) / tile, sv = h / tile;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}
export const cone = (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg);
export const sphere = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const capsule = (r, len, seg = 6) => new THREE.CapsuleGeometry(r, len, 3, seg);
/** Triangular prism: base width w (along X), height h, thickness t (along Z). */
export function tri(w, h, t, tile = 1.6) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  g.translate(0, 0, -t / 2);
  return g;
}

/** Collects geometry per material and bakes it into a handful of merged meshes. */
export class Builder {
  constructor() { this.parts = new Map(); }
  add(geo, mat) {
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(geo);
    return geo;
  }
  build({ cast = true, receive = true } = {}) {
    const group = new THREE.Group();
    for (const [mat, geos] of this.parts) {
      if (!geos.length) continue;
      const mesh = new THREE.Mesh(merge(geos), mat);
      mesh.castShadow = cast; mesh.receiveShadow = receive;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}
