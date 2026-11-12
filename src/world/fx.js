// Particle effects: fire, smoke, embers, sparks, splashes. One pooled Points object per blend mode.
import * as THREE from 'three';
import { TEX } from './geo.js';

class Pool {
  constructor(scene, max, additive) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.c = new Float32Array(max * 4); this.s = new Float32Array(max);
    this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grow = new Float32Array(max); this.a0 = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    const g = (this.geo = new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.c, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(this.s, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: TEX.dot }, scale: { value: 600 } },
      vertexShader: `attribute vec4 pcolor; attribute float psize; uniform float scale; varying vec4 vC;
        void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = psize * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC;
        void main(){ float a = texture2D(map, gl_PointCoord).a * vC.a; if (a < 0.004) discard; gl_FragColor = vec4(vC.rgb, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false; this.points.renderOrder = additive ? 6 : 5;
    scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, life, size, r, g, b, a, grow = 0, drag = 0, grav = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.c[i * 4] = r; this.c[i * 4 + 1] = g; this.c[i * 4 + 2] = b; this.c[i * 4 + 3] = a;
    this.life[i] = life; this.maxLife[i] = life; this.s[i] = size; this.grow[i] = grow; this.a0[i] = a; this.drag[i] = drag; this.grav[i] = grav;
  }
  update(dt, wx, wz) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { // swap-remove
        const l = --this.n;
        if (i !== l) {
          for (let k = 0; k < 3; k++) { this.p[i * 3 + k] = this.p[l * 3 + k]; this.v[i * 3 + k] = this.v[l * 3 + k]; }
          for (let k = 0; k < 4; k++) this.c[i * 4 + k] = this.c[l * 4 + k];
          this.life[i] = this.life[l]; this.maxLife[i] = this.maxLife[l]; this.s[i] = this.s[l]; this.grow[i] = this.grow[l];
          this.a0[i] = this.a0[l]; this.drag[i] = this.drag[l]; this.grav[i] = this.grav[l];
        }
        i--; continue;
      }
      const d = this.drag[i];
      this.v[i * 3] += (wx * d - this.v[i * 3] * d * 0.5) * dt; this.v[i * 3 + 2] += (wz * d - this.v[i * 3 + 2] * d * 0.5) * dt;
      this.v[i * 3 + 1] -= this.grav[i] * dt;
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      this.s[i] += this.grow[i] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.c[i * 4 + 3] = this.a0[i] * Math.min(1, t * 2.2) * Math.min(1, (1 - t) * 8);
    }
    this.geo.setDrawRange(0, this.n);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.pcolor.needsUpdate = true; this.geo.attributes.psize.needsUpdate = true;
  }
}

export class FX {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.add = new Pool(scene, 5200, true);
    this.norm = new Pool(scene, 2400, false);
    this.fires = [];   // {x,y,z,size,on,smoke,acc}
    this.smokes = [];  // chimney smoke
    this.lights = Array.from({ length: 5 }, () => {
      const l = new THREE.PointLight(0xff8a3c, 0, 34, 1.7); l.visible = false; scene.add(l); return l;
    });
    this.wind = { x: 0.6, z: 0.2 };
    this.fireLoud = 0; // 0..1 nearest-fire loudness, read by the audio system
  }
  resize(h) { const s = h * 0.9; this.add.points.material.uniforms.scale.value = s; this.norm.points.material.uniforms.scale.value = s; }

  addFire(x, y, z, size = 1, { smoke = true, on = true } = {}) { const f = { x, y, z, size, on, smoke, acc: 0, sacc: 0 }; this.fires.push(f); return f; }
  removeFire(f) { const i = this.fires.indexOf(f); if (i >= 0) this.fires.splice(i, 1); }
  addSmoke(x, y, z, rate = 1) { const s = { x, y, z, rate, on: true, acc: 0 }; this.smokes.push(s); return s; }

  burst(kind, x, y, z, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, u = Math.random();
      if (kind === 'spark') this.add.spawn(x, y, z, Math.cos(a) * (1 + u * 3), 1.5 + Math.random() * 3, Math.sin(a) * (1 + u * 3), 0.25 + u * 0.4, 0.05, 1, 0.75, 0.35, 1, 0, 0, 9);
      else if (kind === 'chips') this.norm.spawn(x, y, z, Math.cos(a) * (1 + u * 2), 1.5 + Math.random() * 2.5, Math.sin(a) * (1 + u * 2), 0.5 + u * 0.4, 0.06, 0.8, 0.66, 0.44, 1, 0, 0, 9);
      else if (kind === 'splash') this.norm.spawn(x, y, z, Math.cos(a) * u * 1.6, 1.5 + Math.random() * 2.2, Math.sin(a) * u * 1.6, 0.5 + u * 0.3, 0.07, 0.8, 0.88, 0.95, 0.8, 0.05, 0, 8);
      else if (kind === 'dust') this.norm.spawn(x, y, z, Math.cos(a) * u, 0.3 + Math.random() * 0.5, Math.sin(a) * u, 0.7 + u * 0.5, 0.25, 0.55, 0.5, 0.42, 0.35, 0.5, 0.5, 0);
      else if (kind === 'snowpuff') this.norm.spawn(x, y, z, Math.cos(a) * u * 0.8, 0.4 + Math.random() * 0.6, Math.sin(a) * u * 0.8, 0.5 + u * 0.4, 0.14, 0.92, 0.95, 1, 0.5, 0.3, 0.5, 2);
      else if (kind === 'blood') this.norm.spawn(x, y, z, Math.cos(a) * u * 1.2, 0.6 + Math.random() * 1.4, Math.sin(a) * u * 1.2, 0.35 + u * 0.3, 0.05, 0.45, 0.04, 0.03, 0.9, 0, 0, 9);
      else if (kind === 'breath') this.norm.spawn(x, y, z, Math.cos(a) * 0.1, 0.12, Math.sin(a) * 0.1, 0.9, 0.1, 0.9, 0.93, 1, 0.16, 0.35, 0.3, 0);
    }
  }

  update(dt, focus, night) {
    const w = this.wind;
    let loud = 0;
    for (const f of this.fires) {
      if (!f.on) continue;
      const d = Math.hypot(f.x - focus.x, f.z - focus.z);
      if (d > 150) continue;
      loud = Math.max(loud, Math.min(1, f.size * 0.6) * Math.max(0, 1 - d / (10 + f.size * 14)));
      const lod = d > 70 ? 0.35 : 1, s = f.size;
      f.acc += dt * (26 * s + 8) * lod;
      while (f.acc >= 1) {
        f.acc -= 1;
        const a = Math.random() * 6.28, r = Math.random() * 0.32 * s;
        const hot = Math.random();
        this.add.spawn(f.x + Math.cos(a) * r, f.y + Math.random() * 0.15 * s, f.z + Math.sin(a) * r,
          (Math.random() - 0.5) * 0.4 * s, (1.1 + Math.random() * 1.5) * Math.sqrt(s), (Math.random() - 0.5) * 0.4 * s,
          0.45 + Math.random() * 0.5, (0.34 + Math.random() * 0.4) * s, 1, 0.38 + hot * 0.4, 0.06 + hot * 0.18, 0.5, -0.25 * s, 0.6, 0);
        if (Math.random() < 0.12) this.add.spawn(f.x + Math.cos(a) * r, f.y + 0.3 * s, f.z + Math.sin(a) * r,
          (Math.random() - 0.5) * 1.6, 1.8 + Math.random() * 2.8 * s, (Math.random() - 0.5) * 1.6, 1.2 + Math.random() * 1.6, 0.045, 1, 0.6, 0.2, 1, 0, 1.2, -0.3);
      }
      if (f.smoke) {
        f.sacc += dt * (3.5 * s + 1) * lod;
        while (f.sacc >= 1) {
          f.sacc -= 1;
          const g = night ? 0.1 + Math.random() * 0.06 : 0.22 + Math.random() * 0.1;
          this.norm.spawn(f.x + (Math.random() - 0.5) * 0.4 * s, f.y + 0.9 * s, f.z + (Math.random() - 0.5) * 0.4 * s,
            (Math.random() - 0.5) * 0.4, 1.3 + Math.random() * 0.9 * s, (Math.random() - 0.5) * 0.4, 3.5 + Math.random() * 3 * s, 0.7 * s, g, g, g * 1.05, 0.32, 0.75 * s, 0.5, 0);
        }
      }
    }
    for (const s of this.smokes) {
      if (!s.on) continue;
      if (Math.hypot(s.x - focus.x, s.z - focus.z) > 160) continue;
      s.acc += dt * 2.2 * s.rate;
      while (s.acc >= 1) {
        s.acc -= 1;
        this.norm.spawn(s.x, s.y, s.z, (Math.random() - 0.5) * 0.2, 0.7 + Math.random() * 0.5, (Math.random() - 0.5) * 0.2, 5 + Math.random() * 3, 0.5, 0.62, 0.62, 0.64, 0.2, 0.42, 0.45, 0);
      }
    }
    this.fireLoud = loud;
    this.add.update(dt, w.x, w.z); this.norm.update(dt, w.x, w.z);

    // assign the few real lights to the nearest burning fires
    const near = this.fires.filter((f) => f.on).map((f) => ({ f, d: Math.hypot(f.x - focus.x, f.z - focus.z) })).sort((a, b) => a.d - b.d);
    this.lights.forEach((l, i) => {
      const n = near[i];
      if (!n || n.d > 90) { l.visible = false; l.intensity = 0; return; }
      l.visible = true;
      l.position.set(n.f.x, n.f.y + 0.9 * n.f.size, n.f.z);
      const base = (night ? 46 : 12) * Math.min(3.2, n.f.size) ** 1.3;
      l.intensity = base * (0.82 + Math.random() * 0.3);
      l.distance = 16 + n.f.size * 16;
    });
  }
}
