// Sky dome, sun/moon lighting, fog, weather (snow) and image-based ambient light.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../core/util.js';
import { shared, TEX } from './geo.js';
import { ART } from '../data/art.js';

const C = (r, g, b) => new THREE.Color(r, g, b);
const NIGHT_TOP = C(0.012, 0.018, 0.045), NIGHT_HOR = C(0.045, 0.065, 0.11);
const DAY_TOP = C(0.19, 0.42, 0.8), DAY_HOR = C(0.7, 0.81, 0.92);
const DUSK_HOR = C(0.98, 0.5, 0.24), DUSK_TOP = C(0.22, 0.26, 0.5);
const GREY = C(0.5, 0.53, 0.58);
const MOON_DIR = new THREE.Vector3(-0.42, 0.62, 0.55).normalize();

export class Sky {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.time = 8.7;               // hours, 0..24
    this.weather = { snow: 0, fog: 0, overcast: 0, wind: 1 };
    this.farSight = 0;             // 0..1: clear sea air, so the next island shows
    this.fogMul = 1;               // a scene may thin the haze (the Epilogue's last view)
    this.fireGlow = 0;             // raid: orange haze over the village
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.lightDir = new THREE.Vector3(0, 1, 0);
    this.isNight = false;

    this.u = {
      top: { value: C(0, 0, 0) }, horizon: { value: C(0, 0, 0) }, ground: { value: C(0, 0, 0) },
      sunDir: { value: this.sunDir }, sunCol: { value: C(1, 1, 1) }, sunVis: { value: 1 },
      moonDir: { value: MOON_DIR }, moonVis: { value: 0 }, stars: { value: 0 }, uTime: shared.uTime,
      glow: { value: C(1.0, 0.32, 0.08) }, glowAmt: { value: 0 },
      // clouds (clouds.jpg, tools/art/world.py clouds(): heaped clouds in red, high wisps in green); off until it has loaded
      uClouds: { value: null }, cloudOn: { value: 0 }, cloudCover: { value: 0.35 }, cloudDrift: { value: new THREE.Vector2() },
    };
    const cu = (ART.world || {}).clouds;
    if (cu) this.u.uClouds.value = new THREE.TextureLoader().load(cu, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; this.u.cloudOn.value = 1; });
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.u,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 top, horizon, ground, sunDir, sunCol, moonDir, glow;
        uniform float sunVis, moonVis, stars, uTime, glowAmt, cloudOn, cloudCover;
        uniform sampler2D uClouds; uniform vec2 cloudDrift;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.42));
          col = mix(col, ground, smoothstep(0.0, -0.3, h));
          float sd = max(dot(d, sunDir), 0.0);
          col += sunCol * (pow(sd, 1400.0) * 7.0 + pow(sd, 40.0) * 0.4 + pow(sd, 5.0) * 0.16) * sunVis;
          float md = max(dot(d, moonDir), 0.0);
          col += vec3(0.82, 0.88, 1.0) * (smoothstep(0.99955, 0.9997, md) * 1.6 + pow(md, 90.0) * 0.1) * moonVis;
          vec3 p = d * 190.0; vec3 ip = floor(p);
          float r = fract(sin(dot(ip, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          float star = step(0.9972, r) * smoothstep(0.42, 0.05, length(fract(p) - 0.5)) * smoothstep(0.0, 0.25, h);
          col += vec3(star * (0.65 + 0.35 * sin(uTime * 2.3 + r * 120.0))) * stars;
          if (cloudOn > 0.5 && h > 0.0) {
            // the clouds lie on a high flat ceiling: the lower toward the horizon one looks, the farther off and smaller
            vec2 cp = d.xz / (h + 0.11);
            float big = texture2D(uClouds, cp * 0.045 + cloudDrift * 0.9 + vec2(0.31, 0.17)).r;                 // where the heaped clouds gather
            float heap = texture2D(uClouds, cp * 0.16 + cloudDrift).r * smoothstep(0.25 - cloudCover * 0.4, 0.75 - cloudCover * 0.3, big + cloudCover * 0.35);
            float wisp = texture2D(uClouds, cp * 0.07 + cloudDrift * 1.7 + vec2(0.6, 0.2)).g * 0.6;
            float cl = clamp(max(heap, wisp) + cloudCover * 0.25 * big, 0.0, 1.0) * smoothstep(0.015, 0.16, h);
            // their colour is the sky's own light: white at noon, warm at dusk, dark at night; thick parts a little grey,
            // and a bright rim toward the sun
            vec3 lit = mix(horizon, vec3(1.04), 0.8) * (1.0 - heap * 0.24) + sunCol * pow(sd, 6.0) * 0.35 * sunVis;
            col = mix(col, lit, cl);
          }
          col += glow * glowAmt * exp(-abs(h) * 5.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 18), mat);
    this.dome.renderOrder = -10; this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -58; sc.right = 58; sc.top = 58; sc.bottom = -58; sc.near = 1; sc.far = 320;
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.5;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(this.hemi);
    scene.fog = new THREE.FogExp2(0x9ab0c4, 0.003);

    // falling snow: a box of points that follows the camera
    const n = 4200, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 70; pos[i * 3 + 1] = Math.random() * 34; pos[i * 3 + 2] = (Math.random() - 0.5) * 70; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ map: TEX.dot, size: 0.16, transparent: true, opacity: 0, depthWrite: false, color: 0xffffff, fog: true }));
    this.snow.frustumCulled = false; this.snow.visible = false;
    scene.add(this.snow);

    // environment map for reflections / ambient
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), mat);
    this.envScene.add(this.envDome);
    this.envKey = '';
    this.envTarget = null;
    this._col = { top: C(0, 0, 0), hor: C(0, 0, 0) };
  }

  setQuality(q) {
    const size = q === 'high' ? 4096 : q === 'low' ? 1024 : 2048;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    this.snow.geometry.setDrawRange(0, q === 'low' ? 1800 : 4200);
  }

  update(dt, camera, focus) {
    const t = this.time, w = this.weather;
    const a = ((t - 7) / 10) * Math.PI;                 // sun above the horizon between 07:00 and 17:00
    const up = Math.sin(a) * 0.52;                       // low northern sun
    this.sunDir.set(Math.cos(a), up, Math.sin(a) * 0.72 + 0.1).normalize();
    const e = this.sunDir.y;
    const dayF = smoothstep(-0.06, 0.2, e), duskF = Math.exp(-((e / 0.13) ** 2)) * (t > 3 && t < 21 ? 1 : 0);
    const top = this._col.top.copy(NIGHT_TOP).lerp(DAY_TOP, dayF).lerp(DUSK_TOP, duskF * 0.55);
    const hor = this._col.hor.copy(NIGHT_HOR).lerp(DAY_HOR, dayF).lerp(DUSK_HOR, duskF * 0.75);
    const oc = clamp(w.overcast, 0, 1);
    const greyLum = lerp(0.05, 1, dayF);
    top.lerp(GREY.clone().multiplyScalar(greyLum * 0.75), oc * 0.9);
    hor.lerp(GREY.clone().multiplyScalar(greyLum), oc * 0.9);
    this.u.top.value.copy(top); this.u.horizon.value.copy(hor);
    this.u.ground.value.copy(hor).multiplyScalar(0.55);
    this.u.sunVis.value = (1 - oc * 0.92) * smoothstep(-0.08, 0.02, e);
    this.u.sunCol.value.setRGB(1, lerp(0.5, 0.93, smoothstep(0.0, 0.3, e)), lerp(0.22, 0.8, smoothstep(0.0, 0.3, e)));
    this.u.moonVis.value = (1 - dayF) * (1 - oc * 0.85);
    this.u.stars.value = (1 - dayF) * (1 - oc);
    this.u.glowAmt.value = this.fireGlow * 0.5;
    this.u.cloudCover.value = 0.45 + oc * 0.5;
    this.u.cloudDrift.value.x += dt * 0.0016 * (w.wind || 1); this.u.cloudDrift.value.y += dt * 0.0007 * (w.wind || 1); // the wind carries them
    this.isNight = dayF < 0.35;

    // lighting
    const night = 1 - dayF;
    this.lightDir.copy(dayF > 0.12 ? this.sunDir : MOON_DIR);
    const sunI = 3.7 * smoothstep(-0.02, 0.18, e) * (1 - oc * 0.75);
    const moonI = 0.42 * (1 - oc * 0.5);
    this.sun.intensity = dayF > 0.12 ? sunI + 0.15 : moonI;
    if (dayF > 0.12) this.sun.color.setRGB(1, lerp(0.56, 0.95, smoothstep(0.02, 0.3, e)), lerp(0.3, 0.86, smoothstep(0.02, 0.3, e)));
    else this.sun.color.setRGB(0.55, 0.68, 1.0);
    this.sun.position.copy(focus).addScaledVector(this.lightDir, 150);
    this.sun.target.position.copy(focus);
    this.hemi.color.copy(top).lerp(hor, 0.5).multiplyScalar(1.4);
    this.hemi.groundColor.setRGB(0.2, 0.17, 0.13).multiplyScalar(lerp(0.25, 1, dayF));
    this.hemi.intensity = lerp(0.5, 1.05, dayF) + oc * 0.25 + this.fireGlow * 0.25;
    if (this.fireGlow > 0) this.hemi.color.lerp(C(0.9, 0.42, 0.18), this.fireGlow * 0.35);

    // fog
    const fog = this.scene.fog;
    fog.color.copy(hor).multiplyScalar(lerp(1, 0.9, dayF));
    if (this.fireGlow > 0) fog.color.lerp(C(0.3, 0.13, 0.06), this.fireGlow * 0.4);
    fog.density = (lerp(0.0062, 0.0019, dayF) * (1 - 0.5 * this.farSight) + clamp(w.fog, 0, 1) * 0.03) * this.fogMul;
    this.renderer.toneMappingExposure = lerp(1.25, 1.1, dayF);

    // snow
    const sm = this.snow.material;
    sm.opacity += (clamp(w.snow, 0, 1) * 0.9 - sm.opacity) * Math.min(1, dt * 0.8);
    this.snow.visible = sm.opacity > 0.01;
    if (this.snow.visible) {
      const p = this.snow.geometry.attributes.position, arr = p.array, n = this.snow.geometry.drawRange.count === Infinity ? p.count : Math.min(p.count, this.snow.geometry.drawRange.count);
      const fall = (1.6 + w.wind * 0.9) * dt, wx = (0.8 + w.wind * 3.4) * dt, wz = w.wind * 1.2 * dt;
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      for (let i = 0; i < n; i++) {
        let x = arr[i * 3] + wx, y = arr[i * 3 + 1] - fall * (0.6 + (i % 7) * 0.1), z = arr[i * 3 + 2] + wz;
        if (y < cy - 8) y += 34; else if (y > cy + 26) y -= 34;
        if (x > cx + 35) x -= 70; else if (x < cx - 35) x += 70;
        if (z > cz + 35) z -= 70; else if (z < cz - 35) z += 70;
        arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
      }
      p.needsUpdate = true;
    }
    this.dome.position.copy(camera.position);

    // refresh the environment map when the sky has visibly changed
    const key = `${Math.round(t * 3)}|${Math.round(oc * 5)}|${Math.round(this.fireGlow * 4)}`;
    if (key !== this.envKey) {
      this.envKey = key;
      const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 100);
      if (this.envTarget) this.envTarget.dispose();
      this.envTarget = rt;
      this.scene.environment = rt.texture;
      this.scene.environmentIntensity = 0.8;
    }
  }
}
