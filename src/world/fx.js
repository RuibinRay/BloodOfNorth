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

/** The stroke a blade leaves in the air: a ribbon between where its edge was a moment ago and where it is now. */
class Trail {
  constructor(scene, n = 18) {
    this.n = n; this.s = []; this.owner = null; this.idle = 0;
    this.pos = new Float32Array(n * 2 * 3); this.col = new Float32Array(n * 2 * 4);
    const g = new THREE.BufferGeometry(), idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('tcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      vertexShader: 'attribute vec4 tcolor; varying vec4 vC; void main(){ vC = tcolor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec4 vC; void main(){ gl_FragColor = vC;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 7; this.mesh.visible = false; scene.add(this.mesh);
  }
  /** One more sample of the edge: its root and its tip, and the colour of the stroke (r, g, b, strength). */
  add(base, tip, r = 0.9, g = 0.95, b = 1, a = 0.5) { this.s.unshift({ bx: base.x, by: base.y, bz: base.z, tx: tip.x, ty: tip.y, tz: tip.z, r, g, b, a, t: 0 }); if (this.s.length > this.n) this.s.length = this.n; this.idle = 0; }
  update(dt) {
    const S = this.s, life = 0.17;
    for (const q of S) q.t += dt;
    while (S.length && S[S.length - 1].t > life) S.pop();
    this.idle += dt;
    if (S.length < 2) { this.mesh.visible = false; if (this.idle > 0.6) { this.owner = null; S.length = 0; } return; }
    const P = this.pos, C = this.col;
    for (let i = 0; i < this.n; i++) {
      const q = S[Math.min(i, S.length - 1)], k = i < S.length ? (1 - q.t / life) : 0, o = i * 6, c = i * 8;
      P[o] = q.bx; P[o + 1] = q.by; P[o + 2] = q.bz; P[o + 3] = q.tx; P[o + 4] = q.ty; P[o + 5] = q.tz;
      C[c] = q.r; C[c + 1] = q.g; C[c + 2] = q.b; C[c + 3] = 0; C[c + 4] = q.r; C[c + 5] = q.g; C[c + 6] = q.b; C[c + 7] = q.a * k * k; // bright at the tip, nothing at the root
    }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.tcolor.needsUpdate = true; this.mesh.visible = true;
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
    this.trails = Array.from({ length: 12 }, () => new Trail(scene));
    this.rings = Array.from({ length: 8 }, () => { // a ring that runs out along the ground from where something heavy landed
      const m = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 44), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 6; scene.add(m); return { m, t: 0, dur: 1, r0: 0, r1: 1, a: 1 };
    });
    // rain: a few hundred short strokes that fall round the camera
    const RN = 900, rp = new Float32Array(RN * 6); this.rainN = RN; this.rainP = rp; this.rainSeed = new Float32Array(RN * 3); this.rainK = 0; this.rainWant = 0;
    for (let i = 0; i < RN * 3; i++) this.rainSeed[i] = Math.random();
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0, depthWrite: false }));
    this.rain.frustumCulled = false; this.rain.visible = false; this.rain.renderOrder = 4; scene.add(this.rain); this.rainT = 0;
  }
  /** The stroke of a blade belonging to `owner` (a character): the same one for as long as he keeps swinging. */
  trailFor(owner) {
    let t = this.trails.find((q) => q.owner === owner);
    if (!t) { t = this.trails.find((q) => !q.owner); if (!t) return null; t.owner = owner; t.s.length = 0; }
    return t;
  }
  /** A ring across the ground: from radius r0 out to r1 in `dur` seconds. */
  ring(x, y, z, { r0 = 0.3, r1 = 4, dur = 0.45, color = 0xffe6b0, a = 0.7 } = {}) {
    const q = this.rings.find((k) => k.t <= 0) || this.rings[0];
    q.m.position.set(x, y + 0.06, z); q.m.material.color.setHex(color); q.t = dur; q.dur = dur; q.r0 = r0; q.r1 = r1; q.a = a; q.m.visible = true;
  }
  /** One bright instant at a point (where steel met steel, where an arrow struck). */
  flare(x, y, z, size = 1, r = 1, g = 0.92, b = 0.75, life = 0.1) { this.add.spawn(x, y, z, 0, 0, 0, life, size * 0.4, r, g, b, 0.6, size * 3, 0, 0); }
  /** How hard it is raining, 0 to 1. */
  setRain(k) { this.rainWant = k; }
  resize(h) { const s = h * 0.9; this.add.points.material.uniforms.scale.value = s; this.norm.points.material.uniforms.scale.value = s; }

  addFire(x, y, z, size = 1, { smoke = true, on = true } = {}) { const f = { x, y, z, size, on, smoke, acc: 0, sacc: 0 }; this.fires.push(f); return f; }
  removeFire(f) { const i = this.fires.indexOf(f); if (i >= 0) this.fires.splice(i, 1); }
  addSmoke(x, y, z, rate = 1) { const s = { x, y, z, rate, on: true, acc: 0 }; this.smokes.push(s); return s; }

  /** A stroke of lightning down to (x, y, z): a forked white line that lives a few frames, a flash, and sparks. */
  bolt(x, y, z, height = 26) {
    if (!this.bolts) {
      this.bolts = Array.from({ length: 4 }, () => {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
        const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xdff0ff, transparent: true, opacity: 0, fog: false, depthWrite: false }));
        l.frustumCulled = false; l.visible = false; this.scene.add(l); return { l, t: 0 };
      });
      this.flash = new THREE.PointLight(0xbfdcff, 0, 60, 1.4); this.scene.add(this.flash);
    }
    const b = this.bolts.find((q) => q.t <= 0) || this.bolts[0], a = b.l.geometry.attributes.position;
    let px = x + (Math.random() - 0.5) * 5, py = y + height, pz = z + (Math.random() - 0.5) * 5, i = 0;
    const seg = (ax, ay, az, bx, by, bz) => { if (i < 40) { a.setXYZ(i++, ax, ay, az); a.setXYZ(i++, bx, by, bz); } };
    for (let k = 0; k < 13; k++) { // the stroke itself, jagged, homing on the ground point; now and then a fork
      const u = (k + 1) / 13, nx = x + (px - x) * (1 - u) * 0.7 + (Math.random() - 0.5) * 1.7 * (1 - u), ny = y + height * (1 - u), nz = z + (pz - z) * (1 - u) * 0.7 + (Math.random() - 0.5) * 1.7 * (1 - u);
      seg(px, py, pz, nx, ny, nz);
      if (k % 3 === 1) seg(nx, ny, nz, nx + (Math.random() - 0.5) * 5, ny - 2 - Math.random() * 3, nz + (Math.random() - 0.5) * 5);
      px = nx; py = ny; pz = nz;
    }
    for (; i < 40; i++) a.setXYZ(i, x, y, z);
    a.needsUpdate = true; b.l.visible = true; b.l.material.opacity = 1; b.t = 0.22;
    this.flash.position.set(x, y + 3, z); this.flash.intensity = 240; this.flashT = 0.3;
    this.burst('spark', x, y + 0.2, z, 34);
    for (let k = 0; k < 10; k++) { const an = Math.random() * 6.28, r = 1 + Math.random() * 3.4; this.burst('spark', x + Math.cos(an) * r, y + 0.15, z + Math.sin(an) * r, 2); }
  }
  burst(kind, x, y, z, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, u = Math.random();
      if (kind === 'spark') this.add.spawn(x, y, z, Math.cos(a) * (1 + u * 3), 1.5 + Math.random() * 3, Math.sin(a) * (1 + u * 3), 0.25 + u * 0.4, 0.05, 1, 0.75, 0.35, 1, 0, 0, 9);
      else if (kind === 'chips') this.norm.spawn(x, y, z, Math.cos(a) * (1 + u * 2), 1.5 + Math.random() * 2.5, Math.sin(a) * (1 + u * 2), 0.5 + u * 0.4, 0.06, 0.8, 0.66, 0.44, 1, 0, 0, 9);
      else if (kind === 'splash') this.norm.spawn(x, y, z, Math.cos(a) * u * 1.6, 1.5 + Math.random() * 2.2, Math.sin(a) * u * 1.6, 0.5 + u * 0.3, 0.07, 0.8, 0.88, 0.95, 0.8, 0.05, 0, 8);
      else if (kind === 'dust') this.norm.spawn(x, y, z, Math.cos(a) * u, 0.3 + Math.random() * 0.5, Math.sin(a) * u, 0.7 + u * 0.5, 0.25, 0.55, 0.5, 0.42, 0.35, 0.5, 0.5, 0);
      else if (kind === 'snowpuff') this.norm.spawn(x, y, z, Math.cos(a) * u * 0.8, 0.4 + Math.random() * 0.6, Math.sin(a) * u * 0.8, 0.5 + u * 0.4, 0.14, 0.92, 0.95, 1, 0.5, 0.3, 0.5, 2);
      else if (kind === 'blood') this.norm.spawn(x, y, z, Math.cos(a) * u * 1.2, 0.6 + Math.random() * 1.4, Math.sin(a) * u * 1.2, 0.35 + u * 0.3, 0.05, 0.45, 0.04, 0.03, 0.9, 0, 0, 9);
      else if (kind === 'ember') this.add.spawn(x + Math.cos(a) * u * 0.6, y, z + Math.sin(a) * u * 0.6, Math.cos(a) * (0.4 + u * 1.6), 1.2 + Math.random() * 3.2, Math.sin(a) * (0.4 + u * 1.6), 0.8 + u * 1.2, 0.05, 1, 0.55, 0.16, 1, 0, 1.0, -0.6);
      else if (kind === 'dirt') this.norm.spawn(x, y, z, Math.cos(a) * (1 + u * 3.2), 2 + Math.random() * 3.4, Math.sin(a) * (1 + u * 3.2), 0.55 + u * 0.5, 0.09, 0.24, 0.2, 0.16, 1, 0.05, 0, 11);
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
    if (this.bolts) { // lightning fades in a handful of frames
      for (const b of this.bolts) if (b.t > 0) { b.t -= dt; b.l.material.opacity = Math.max(0, b.t / 0.22) * (Math.random() < 0.3 ? 0.4 : 1); if (b.t <= 0) b.l.visible = false; }
      if (this.flashT > 0) { this.flashT -= dt; this.flash.intensity = 240 * Math.max(0, this.flashT / 0.3); }
    }
    this.fireLoud = loud;
    this.add.update(dt, w.x, w.z); this.norm.update(dt, w.x, w.z);
    for (const t of this.trails) if (t.owner || t.s.length) t.update(dt);
    for (const q of this.rings) if (q.t > 0) { q.t -= dt; const k = 1 - Math.max(0, q.t) / q.dur, r = q.r0 + (q.r1 - q.r0) * (1 - (1 - k) * (1 - k)); q.m.scale.set(r, r, 1); q.m.material.opacity = q.a * (1 - k) * (1 - k); if (q.t <= 0) q.m.visible = false; }
    this.rainK += (this.rainWant - this.rainK) * Math.min(1, dt * 0.8);
    if (this.rainK > 0.02) { // the strokes fall through a box that moves with whoever is being watched
      this.rainT += dt; const P = this.rainP, Sd = this.rainSeed, n = Math.round(this.rainN * Math.min(1, this.rainK)), box = 26, h = 16, fall = 19, sl = 0.5;
      for (let i = 0; i < n; i++) {
        const x = focus.x + ((Sd[i * 3] * box + w.x * this.rainT * 2.2) % box + box) % box - box / 2, z = focus.z + ((Sd[i * 3 + 2] * box + w.z * this.rainT * 2.2) % box + box) % box - box / 2;
        const y = focus.y - 2 + h - ((Sd[i * 3 + 1] * h + this.rainT * fall) % h), o = i * 6;
        P[o] = x; P[o + 1] = y; P[o + 2] = z; P[o + 3] = x - w.x * 0.07; P[o + 4] = y - sl; P[o + 5] = z - w.z * 0.07;
      }
      this.rain.geometry.setDrawRange(0, n * 2); this.rain.geometry.attributes.position.needsUpdate = true; this.rain.material.opacity = 0.34 * Math.min(1, this.rainK * 1.5); this.rain.visible = true;
    } else this.rain.visible = false;

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
