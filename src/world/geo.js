// Procedural textures, shared materials and geometry helpers.
// Everything visual in this build is generated in code — these are the placeholders that
// Higgsfield / Meshy GLB assets will replace slot by slot (see assets/registry.json).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../core/util.js';
import { ART } from '../data/art.js';

/** Uniforms shared by every patched material (wind sway + snow cover). */
export const shared = { uTime: { value: 0 }, uSnow: { value: 0 }, uWind: { value: 1 } };

// The ground. Its colour is painted once for a whole valley or island (about half a metre to a pixel); close to, that is
// a smear. So the grain comes from three small repeating pictures laid out in the world itself: grass, sand along
// every shore (all the sea lies at height 0), rock where it is steep. Each has had its own colour taken out
// (tools/art/world.py), so the painted colour still decides the hue. At the water's edge the sand is dark and wet,
// and a thin line of foam moves up and down it: both are measured in metres along the sand, not in height, so a
// flat beach and a steep one get the same narrow edge. Until the pictures load they are flat grey, which changes nothing.
const GROUND = `
        vec2 gw = vGround.xz;
        float gSand = 1.0 - smoothstep(0.9, 1.9, vGround.y);
        float gRock = smoothstep(0.24, 0.5, vSteep);
        vec3 gG = texture2D(uGrass, gw * 0.37).rgb * texture2D(uGrass, gw * 0.047).rgb * 4.0;
        vec3 gS = texture2D(uSand, gw * 0.29).rgb * texture2D(uSand, gw * 0.041).rgb * 4.0;
        vec3 gR = texture2D(uRock, gw * 0.21).rgb * texture2D(uRock, gw * 0.033).rgb * 4.0;
        diffuseColor.rgb *= mix(mix(gG, gS, gSand), gR, gRock) * (texture2D(uDetail, vMapUv * 17.3).r * 0.3 + 0.86);
        float gUp = 1.0 - vSteep, gSlope = max(sqrt(max(1.0 - gUp * gUp, 0.0)) / max(gUp, 0.2), 0.035);
        float shore = vGround.y / gSlope;                                   // metres up the beach from the waterline
        float tide = 0.45 * sin(uTime * 0.8 + gw.x * 0.11 + gw.y * 0.07) + 0.3 * sin(uTime * 1.37 + gw.y * 0.19 - gw.x * 0.05);
        float wet = (1.0 - smoothstep(0.6 + tide, 2.6 + tide, shore)) * step(-6.0, shore);
        diffuseColor.rgb *= mix(1.0, 0.66, wet);
        float lap = 1.0 - smoothstep(0.0, 0.42, abs(shore - (0.35 + tide)));
        float fm = texture2D(uFoam, gw * 0.83 + vec2(uTime * 0.03, uTime * 0.02)).r;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 0.97), lap * (0.25 + 0.75 * fm) * 0.9);`;

/** The sea and the river. Looking down through it the water is clear and green over the sand; toward the horizon it
 *  is the deep colour and mirrors the sky. Its ripples are the same small pattern at two sizes, so the repeat does
 *  not show, and patches of foam drift on it. */
export function waterPatch(mat) {
  mat.userData.ice = { value: 0 }; // 1: frozen over (the river in winter): no clear shallows, no foam
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime; sh.uniforms.uFoam = { value: TEX.foam }; sh.uniforms.uIce = mat.userData.ice;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSeaXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeaXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uIce;\nuniform sampler2D uFoam;\nvarying vec2 vSeaXZ;')
      .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;', 'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz + texture2D( normalMap, vNormalMapUv * 0.23 + vec2( 0.37, 0.11 ) ).xyz * 1.4 - 1.7;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        float seaF = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.2);
        diffuseColor.rgb = mix(vec3(0.07, 0.3, 0.32), diffuseColor.rgb, max(0.3 + 0.7 * seaF, uIce));
        diffuseColor.a = mix(mix(0.58, 0.97, seaF), 0.96, uIce);
        float seaFm = texture2D(uFoam, vSeaXZ * 0.045 + vec2(uTime * 0.006, uTime * 0.004)).r * texture2D(uFoam, vSeaXZ * 0.013 - vec2(uTime * 0.003, 0.0)).r;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.92, 0.94), smoothstep(0.32, 0.75, seaFm) * 0.55 * (1.0 - uIce));`);
  };
  mat.customProgramCacheKey = () => 'sea1';
  return mat;
}

/** Adds wind sway and snow accumulation to a built-in material. */
export function patch(mat, { sway = 0, snow = 1, detail = null, upNormal = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.uniforms.uSnow = shared.uSnow;
    sh.uniforms.uWind = shared.uWind;
    if (detail) { sh.uniforms.uDetail = { value: detail }; sh.uniforms.uGrass = { value: TEX.gGrass }; sh.uniforms.uSand = { value: TEX.gSand }; sh.uniforms.uRock = { value: TEX.gRock }; sh.uniforms.uFoam = { value: TEX.foam }; }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nvarying float vSnowF;\nvarying vec3 vGround;\nvarying float vSteep;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 nW = normal;
        float ph = 0.0;
        #ifdef USE_INSTANCING
          nW = mat3(instanceMatrix) * nW;
          vec4 iw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          ph = iw.x * 0.31 + iw.z * 0.27;
        #endif
        float upN = normalize(mat3(modelMatrix) * nW).y;
        vSnowF = smoothstep(0.2, 0.85, upN);
        vSteep = 1.0 - upN;
        ${sway > 0 ? `float sw = (sin(uTime * 1.6 + ph) + 0.5 * sin(uTime * 3.3 + ph * 1.7)) * uWind * ${sway.toFixed(5)} * position.y * position.y;
        transformed.x += sw; transformed.z += sw * 0.6;` : ''}
        vGround = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uSnow;\nvarying float vSnowF;\nvarying vec3 vGround;\nvarying float vSteep;\n${detail ? 'uniform sampler2D uDetail;\nuniform sampler2D uGrass;\nuniform sampler2D uSand;\nuniform sampler2D uRock;\nuniform sampler2D uFoam;\nuniform float uTime;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${detail ? GROUND : ''}
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.96), clamp(uSnow * ${snow.toFixed(2)} * vSnowF, 0.0, 1.0));`);
    if (upNormal) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
  };
  mat.customProgramCacheKey = () => `p${sway}_${snow}_${detail ? 2 : 0}_${upNormal ? 1 : 0}`;
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
  TEX.sail = canvasTex(512, (g, s) => {
    const r = rng(81);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? rgb(196, 186, 164) : rgb(124, 34, 28); g.fillRect(i * 64, 0, 64, s); }
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

// ---- what the figures wear ---------------------------------------------------------------------------------
// One material and one draw for a whole figure, yet wool, fur, mail, leather and hair on it: TEX.figure is a sheet of
// six squares, every vertex says which square its piece is made of (`cell`: the square's corner on the sheet) and its
// uv counts repeats of that stuff, so a cloak can carry three repeats of the weave and a belt half of one. Each square
// holds one repeat with a border of itself round it (tools/art/world.py), so nothing shows where a repeat ends.
/** Where each stuff is on the sheet, as [column, row from the bottom], and how many metres one repeat of it covers. */
export const STUFF = { wool: [0, 1, 0.16], fur: [1, 1, 0.4], mail: [2, 1, 0.22], plain: [0, 0, 1], hair: [1, 0, 0.2], leather: [2, 0, 0.4],
  // TEX.beast, the same kind of sheet for animals (M.beast): a wolf's pelt, a horse's short coat, feathers / plain, a mane, a fleece
  pelt: [0, 1, 0.34], coat: [1, 1, 0.3], feather: [2, 1, 0.2], mane: [1, 0, 0.22], fleece: [2, 0, 0.3],
  // TEX.gear, for weapons and tools (M.gear): a haft's wood, a wrapped grip, steel (the one square that shines) / plain
  wood: [0, 1, 0.3], wrap: [1, 1, 0.1], steel: [2, 1, 0.22] };
/** Cloth that moves in the wind. hung: it hangs from its top edge (a banner), which stays still; otherwise it is held
 *  at both sides and bellies in the middle (a sail). It needs a few rows and columns of vertices to bend at. */
function flutter(mat, amp, hung) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime; sh.uniforms.uWind = shared.uWind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float fPh = position.x * 1.7 + position.z * 1.3;
        float fK = ${hung ? '(1.0 - uv.y) * (1.0 - uv.y)' : 'sin(uv.x * 3.14159) * (0.45 + 0.55 * (1.0 - uv.y))'};
        float fW = sin(uTime * 2.3 + fPh + uv.y * ${hung ? '5.0' : '2.0'}) + 0.45 * sin(uTime * 4.1 + fPh * 1.7 + uv.x * 9.0);
        transformed += normal * fW * fK * ${amp.toFixed(4)} * (0.35 + uWind);`);
  };
  mat.customProgramCacheKey = () => 'flutter' + (hung ? 1 : 0) + amp;
  return mat;
}
/** metal: whether the top right square of this material's sheet is metal (mail on TEX.figure, steel on TEX.gear). */
function figureMat(mat, metal = true) {
  mat.color.setScalar(1 / 0.6105); // the sheet is a light grey (205) so that it can lighten as well as darken: this gives the colours back their strength
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 cell;\nvarying vec2 vCell;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCell = cell;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCell;')
      .replace('#include <map_fragment>', `
        vec2 fSize = vec2(0.875 / 3.0, 0.875 / 2.0);
        vec2 fAt = vCell + vec2(0.0625 / 3.0, 0.0625 / 2.0) + fract(vMapUv) * fSize;
        diffuseColor *= textureGrad(map, fAt, dFdx(vMapUv) * fSize, dFdy(vMapUv) * fSize);
        float fMail = step(0.6, vCell.x) * step(0.4, vCell.y);`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.62, fMail);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, fMail);');
    if (!metal) sh.fragmentShader = sh.fragmentShader.replace('float fMail = step(0.6, vCell.x) * step(0.4, vCell.y);', 'float fMail = 0.0;');
  };
  mat.customProgramCacheKey = () => 'sheet' + (metal ? 1 : 0); // the two kinds must not share one compiled program
  return mat;
}

// ---------------------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------------------
export const M = {};
const clothCache = new Map();
export function initMaterials() {
  initTextures();
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
  // Painted surfaces, when the game has them (public/art/textures): each is drawn into the texture above once it has
  // loaded, so until then, and wherever a file is missing, the world wears what is drawn in code.
  const paint = (tex, url) => { if (!url) return; const img = new Image(); img.onload = () => { const c = tex.image; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); tex.needsUpdate = true; }; img.src = url; };
  for (const k of ['planks', 'thatch', 'turf', 'stone']) paint(TEX[k], (ART.textures || {})[k]);
  // Grain for the ground, foam for the water's edge, and cloth, fur, mail, leather and hair for the figures
  // (public/art/world, built by tools/art/world.py). Flat grey until they load: flat grey changes nothing.
  const W3 = ART.world || {};
  for (const [k, file, flat] of [['gGrass', 'ground_grass', 128], ['gSand', 'ground_sand', 128], ['gRock', 'ground_rock', 128], ['foam', 'foam', 0]]) {
    TEX[k] = canvasTex(512, (g, sz) => { g.fillStyle = rgb(flat, flat, flat); g.fillRect(0, 0, sz, sz); }, { srgb: false });
    paint(TEX[k], W3[file]);
  }
  TEX.figure = (() => { // six squares: wool fur mail / plain hair leather
    const c = document.createElement('canvas'); c.width = 768; c.height = 512;
    const g = c.getContext('2d'); g.fillStyle = rgb(205, 205, 205); g.fillRect(0, 0, 768, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    paint(t, W3.figure);
    return t;
  })();
  // Ships and buildings: a strake of a hull, a door, carved timber, four painted shields, and the painted sail.
  // Each starts as something plain drawn here and is painted over when its picture has loaded.
  const sheet = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  TEX.hull = sheet(512, 128, (g) => { g.fillStyle = rgb(58, 48, 41); g.fillRect(0, 0, 512, 128); g.fillStyle = rgb(0, 0, 0, 0.5); g.fillRect(0, 0, 512, 14); });
  TEX.door = sheet(384, 512, (g) => { g.fillStyle = rgb(42, 32, 25); g.fillRect(0, 0, 384, 512); g.fillStyle = rgb(0, 0, 0, 0.45); for (let x = 0; x < 384; x += 64) g.fillRect(x, 0, 4, 512); });
  TEX.carved = sheet(512, 512, (g) => g.drawImage(TEX.planks.image, 0, 0, 512, 512));
  TEX.shields = sheet(512, 512, (g) => [0x8a2a22, 0x2f4a5c, 0x1e1e1e, 0x8a7a66].forEach((hex, i) => {
    const x = (i % 2) * 256, y = (i >> 1) * 256; g.fillStyle = '#' + hex.toString(16).padStart(6, '0'); g.fillRect(x, y, 256, 256);
    g.fillStyle = rgb(120, 122, 126); g.beginPath(); g.arc(x + 128, y + 128, 26, 0, 6.3); g.fill();
  }));
  TEX.banners = sheet(512, 384, (g) => { g.fillStyle = rgb(110, 36, 30); g.fillRect(0, 0, 256, 384); g.fillStyle = rgb(22, 22, 26); g.fillRect(256, 0, 256, 384); });
  for (const k of ['hull', 'door', 'carved', 'shields', 'sail', 'banners']) paint(TEX[k], W3[k]);
  M.banner = flutter(std({ map: TEX.banners, roughness: 1, side: THREE.DoubleSide }), 0.11, true);
  M.hull = std({ map: TEX.hull, roughness: 0.85, side: THREE.DoubleSide });
  M.door = std({ map: TEX.door, roughness: 0.9 });
  M.carved = patch(std({ map: TEX.carved, color: 0xc4a07c, roughness: 0.9 })); // the picture is grey with age: warmed toward the timber beside it
  M.shield = std({ map: TEX.shields, roughness: 0.75 });
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
  M.sail = flutter(std({ map: TEX.sail, roughness: 1, side: THREE.DoubleSide }), 0.16, false);
  M.ember = std({ color: 0x331008, emissive: 0xff5a14, emissiveIntensity: 1.6, roughness: 1 });
  // vertex-coloured: one material for all characters, one for props/animals/items
  M.char = figureMat(std({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide, map: TEX.figure }));
  // animals, and weapons and tools: the same arrangement as the figures (a sheet of six squares, a `cell` on every vertex)
  for (const k of ['beast', 'gear']) { TEX[k] = sheet(768, 512, (g) => { g.fillStyle = rgb(205, 205, 205); g.fillRect(0, 0, 768, 512); }); TEX[k].wrapS = TEX[k].wrapT = THREE.ClampToEdgeWrapping; paint(TEX[k], W3[k]); }
  M.beast = figureMat(std({ vertexColors: true, roughness: 0.92, map: TEX.beast }), false);
  M.gear = figureMat(std({ vertexColors: true, roughness: 0.85, map: TEX.gear }));
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
  g.userData.hex = hex; // what it was asked to be: a figure's pieces are told apart by it (cloth, skin, hair, leather)
  return g;
}
export function merge(geos) {
  const list = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'color', 'cell'].includes(k)) n.deleteAttribute(k); // cell: a figure's pieces (see STUFF)
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
/** A round shield lying flat, its face up the Y axis, painted with one of the four on the sheet (TEX.shields, 0 to 3). */
export function shieldGeo(r, th, design = 0, seg = 16) {
  const g = new THREE.CylinderGeometry(r, r, th, seg), p = g.attributes.position, uv = g.attributes.uv, cx = design & 1, cy = 1 - ((design >> 1) & 1);
  for (let i = 0; i < p.count; i++) uv.setXY(i, (cx + 0.5 + (p.getX(i) / r) * 0.485) / 2, (cy + 0.5 - (p.getZ(i) / r) * 0.485) / 2); // the rim takes the picture's own edge
  return g;
}
/** A hanging banner (M.banner): 'raven', the crowned raven of King Halfdan, or 'wolf', Håkon's. Stands in the XY plane about its middle. */
export function bannerGeo(w, h, which) {
  const g = new THREE.PlaneGeometry(w, h, 4, 6), uv = g.attributes.uv, u0 = which === 'wolf' ? 0.5 : 0; // rows and columns to wave with
  for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5);
  return g;
}
/** A door leaf with the whole of the door picture on its face (M.door). */
export const doorLeaf = (w, h, d = 0.1) => new THREE.BoxGeometry(w, h, d);
/** A thin rope or stay from one point to another. */
export function rope(a, b, r = 0.016) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...d);
  return at(new THREE.CylinderGeometry(r, r, len, 4, 1, true), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.acos(d[1] / len), Math.atan2(d[0], d[2]), 0);
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
  /** One mesh per material. still: the pieces stay where they are built (a place, not a ship or a cart), so they are
   *  merged area by area (cells `still` metres across) instead of across the whole map: each area then has its own bounds,
   *  and is skipped when it is out of view, outside the sun's shadow box, or lost in the haze. */
  build({ cast = true, receive = true, still = 0 } = {}) {
    const group = new THREE.Group();
    for (const [mat, geos] of this.parts) {
      if (!geos.length) continue;
      let sets = [geos];
      if (still) {
        const m = new Map();
        for (const g of geos) { if (!g.boundingSphere) g.computeBoundingSphere(); const c = g.boundingSphere.center, k = Math.floor(c.x / still) + ',' + Math.floor(c.z / still); let a = m.get(k); if (!a) m.set(k, (a = [])); a.push(g); }
        sets = [...m.values()];
      }
      for (const set of sets) {
        const mesh = new THREE.Mesh(merge(set), mat);
        mesh.castShadow = cast; mesh.receiveShadow = receive;
        if (still) hazeCull(mesh);
        group.add(mesh);
      }
    }
    this.parts.clear();
    return group;
  }
}

// ---- things the haze hides --------------------------------------------------------------------------------
// Big still things (the props of one area, an island's ground) are not drawn once the haze has taken them:
// FogExp2 leaves exp(-(density * d)^2) of a thing, and past where a sixtieth is left it cannot be told from the air.
const hazed = [];
/** Register a mesh that never moves. Its place is read the first time it is tested, when the world is built. */
export function hazeCull(mesh) { hazed.push({ o: mesh, c: null, r: 0 }); return mesh; }
export const hazeRange = (cam, density) => Math.min(cam.far, 2.02 / Math.max(density, 1e-5));
export function cullHazed(cam, density) {
  const range = hazeRange(cam, density);
  for (const f of hazed) {
    if (!f.c) { const g = f.o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); f.o.updateWorldMatrix(true, false); f.c = g.boundingSphere.center.clone().applyMatrix4(f.o.matrixWorld); f.r = g.boundingSphere.radius; }
    f.o.visible = f.c.distanceTo(cam.position) - f.r < range;
  }
}
