// Fully procedural audio (WebAudio): ambience beds, sound effects and a small generative score.
// Nothing here is sampled — it is placeholder-quality sound design, not final audio.
import { clamp } from './util.js';

const SCALE_DAY = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0]; // D dorian-ish
const SCALE_DARK = [73.42, 87.31, 98.0, 110.0, 116.54, 146.83];

export class AudioSys {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.amb = {};
    this.ambTarget = { wind: 0.25, river: 0, fire: 0, birds: 0, battle: 0 };
    this.musicMode = null;
    this.nextNote = 0;
    this.beat = 0;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.connect(this.master);
    this.ambG = ctx.createGain(); this.ambG.connect(this.master);
    this.applyVolumes();
    // shared noise buffer
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // ambience beds: looping filtered noise
    const bed = (name, type, freq, q) => {
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.ambG); src.start();
      this.amb[name] = { g, f };
    };
    bed('wind', 'bandpass', 420, 0.6);
    bed('river', 'highpass', 1400, 0.3);
    bed('fire', 'bandpass', 900, 0.4);
    bed('battle', 'lowpass', 300, 0.5);
    // drone
    this.drone = ctx.createGain(); this.drone.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    this.drone.connect(lp); lp.connect(this.music);
    this.droneOsc = [73.42, 110.0, 73.9].map((f) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(this.drone); o.start(); return o;
    });
  }
  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    this.master.gain.value = s.volMaster;
    this.sfx.gain.value = s.volSfx;
    this.music.gain.value = s.volMusic * 0.8;
    this.ambG.gain.value = s.volSfx * 0.7;
  }
  setAmbience(t) { Object.assign(this.ambTarget, t); }
  setMusic(mode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode; this.beat = 0;
    if (this.ctx) this.nextNote = this.ctx.currentTime + 0.5;
  }

  // --- primitive voices -------------------------------------------------
  tone({ freq = 440, type = 'sine', dur = 0.3, gain = 0.2, attack = 0.005, slide = 0, out = null, delay = 0, lp = 0 }) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(out || this.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }
  burst({ dur = 0.15, freq = 1000, q = 1, type = 'bandpass', gain = 0.3, attack = 0.002, out = null, delay = 0, sweep = 0 }) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out || this.sfx);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }
  pluck(freq, gain = 0.12, delay = 0) {
    this.tone({ freq, type: 'triangle', dur: 1.6, gain, attack: 0.004, out: this.music, delay, lp: 2400 });
    this.tone({ freq: freq * 2.001, type: 'sine', dur: 0.7, gain: gain * 0.35, out: this.music, delay });
  }

  // --- named effects ------------------------------------------------------
  play(name, o = {}) {
    if (!this.ctx) return;
    const v = o.vol ?? 1;
    switch (name) {
      case 'step': this.burst({ dur: 0.09, freq: o.snow ? 1800 : 520, q: 0.7, gain: 0.07 * v, type: o.snow ? 'highpass' : 'lowpass' }); break;
      case 'chop': this.burst({ dur: 0.12, freq: 1700, q: 0.8, gain: 0.45 * v }); this.tone({ freq: 140, dur: 0.18, gain: 0.4 * v, slide: 0.5 }); break;
      case 'split': this.burst({ dur: 0.2, freq: 900, q: 0.5, gain: 0.5 * v, sweep: 0.4 }); this.tone({ freq: 190, type: 'triangle', dur: 0.25, gain: 0.35 * v, slide: 0.45 }); break;
      case 'miss': this.burst({ dur: 0.1, freq: 400, q: 1, gain: 0.2 * v }); break;
      case 'whoosh': this.burst({ dur: 0.22, freq: 500, q: 1.2, gain: 0.16 * v, sweep: 3.5, attack: 0.05 }); break;
      case 'bow': this.tone({ freq: 260, type: 'triangle', dur: 0.2, gain: 0.3 * v, slide: 0.5 }); this.burst({ dur: 0.18, freq: 2600, q: 1, gain: 0.1 * v, sweep: 0.5 }); break;
      case 'arrowHit': this.burst({ dur: 0.08, freq: 1200, q: 1, gain: 0.3 * v }); this.tone({ freq: 110, dur: 0.12, gain: 0.25 * v, slide: 0.6 }); break;
      case 'clack': this.burst({ dur: 0.07, freq: 2200, q: 1.5, gain: 0.4 * v }); this.tone({ freq: 330, type: 'square', dur: 0.06, gain: 0.12 * v, lp: 1500 }); break;
      case 'parry': this.tone({ freq: 880, type: 'triangle', dur: 0.35, gain: 0.3 * v }); this.burst({ dur: 0.06, freq: 3200, q: 2, gain: 0.35 * v }); break;
      case 'steel': this.tone({ freq: 1320, type: 'triangle', dur: 0.4, gain: 0.2 * v }); this.tone({ freq: 1975, type: 'sine', dur: 0.3, gain: 0.12 * v }); this.burst({ dur: 0.07, freq: 4200, q: 2, gain: 0.3 * v }); break;
      case 'hurt': this.tone({ freq: 180, type: 'sawtooth', dur: 0.22, gain: 0.22 * v, slide: 0.6, lp: 700 }); break;
      case 'thud': this.tone({ freq: 90, dur: 0.3, gain: 0.5 * v, slide: 0.4 }); this.burst({ dur: 0.15, freq: 200, type: 'lowpass', gain: 0.3 * v }); break;
      case 'ui': this.tone({ freq: 520, type: 'triangle', dur: 0.08, gain: 0.1 * v }); break;
      case 'uiBack': this.tone({ freq: 340, type: 'triangle', dur: 0.08, gain: 0.1 * v }); break;
      case 'page': this.burst({ dur: 0.14, freq: 3000, q: 0.4, gain: 0.07 * v, sweep: 0.5 }); break;
      case 'pickup': this.tone({ freq: 660, type: 'triangle', dur: 0.12, gain: 0.14 * v }); this.tone({ freq: 880, type: 'triangle', dur: 0.16, gain: 0.12 * v, delay: 0.07 }); break;
      case 'chime': [293.66, 392.0, 440.0, 587.33].forEach((f, i) => this.pluck(f, 0.16 * v, i * 0.13)); break;
      case 'questDone': [293.66, 349.23, 440.0, 587.33, 698.46].forEach((f, i) => this.pluck(f, 0.18 * v, i * 0.11)); break;
      case 'splash': this.burst({ dur: 0.35, freq: 1500, q: 0.4, gain: 0.3 * v, sweep: 0.3 }); break;
      case 'bite': this.tone({ freq: 700, dur: 0.1, gain: 0.2 * v, slide: 1.6 }); break;
      case 'reel': this.burst({ dur: 0.05, freq: 2400, q: 3, gain: 0.08 * v }); break;
      case 'flint': this.burst({ dur: 0.05, freq: 5200, q: 2, gain: 0.3 * v }); this.tone({ freq: 2400, type: 'square', dur: 0.03, gain: 0.08 * v }); break;
      case 'ignite': this.burst({ dur: 0.9, freq: 700, q: 0.4, gain: 0.3 * v, sweep: 2.5, attack: 0.3 }); break;
      case 'horn': {
        const f = o.freq || 98;
        this.tone({ freq: f, type: 'sawtooth', dur: 3.2, gain: 0.3 * v, attack: 0.5, lp: 600 });
        this.tone({ freq: f * 1.498, type: 'sawtooth', dur: 3.0, gain: 0.14 * v, attack: 0.7, lp: 500 });
        break;
      }
      case 'drum': this.tone({ freq: o.freq || 70, dur: 0.5, gain: 0.55 * v, slide: 0.45, out: this.music }); this.burst({ dur: 0.1, freq: 160, type: 'lowpass', gain: 0.25 * v, out: this.music }); break;
      case 'raven': [0, 0.22].forEach((d) => this.tone({ freq: 520, type: 'sawtooth', dur: 0.16, gain: 0.07 * v, slide: 0.7, delay: d, lp: 1800 })); break;
      case 'bird': { const f = 2200 + Math.random() * 1800; [0, 0.09, 0.18].forEach((d) => this.tone({ freq: f, dur: 0.07, gain: 0.025 * v, slide: 1.25, delay: d })); break; }
      case 'shout': this.tone({ freq: 190 + Math.random() * 60, type: 'sawtooth', dur: 0.4, gain: 0.1 * v, slide: 0.75, lp: 900, attack: 0.04 }); break;
      case 'crackle': this.burst({ dur: 0.03, freq: 3000 + Math.random() * 3000, q: 3, gain: 0.12 * v }); break;
      case 'heart': this.tone({ freq: 55, dur: 0.16, gain: 0.5 * v, slide: 0.7 }); this.tone({ freq: 50, dur: 0.18, gain: 0.4 * v, slide: 0.7, delay: 0.22 }); break;
      default: break;
    }
  }

  update(dt) {
    const ctx = this.ctx; if (!ctx) return;
    for (const k in this.amb) {
      const g = this.amb[k].g.gain;
      g.value += (clamp(this.ambTarget[k] || 0, 0, 1) - g.value) * Math.min(1, dt * 1.5);
    }
    // wind gusting
    this.amb.wind.f.frequency.value = 380 + Math.sin(ctx.currentTime * 0.31) * 140 + (this.ambTarget.wind || 0) * 500;
    if ((this.ambTarget.fire || 0) > 0.05 && Math.random() < dt * 14 * this.ambTarget.fire) this.play('crackle', { vol: this.ambTarget.fire });
    if ((this.ambTarget.birds || 0) > 0.05 && Math.random() < dt * 0.5 * this.ambTarget.birds) this.play('bird');
    if ((this.ambTarget.battle || 0) > 0.05 && Math.random() < dt * 1.6 * this.ambTarget.battle) this.play(Math.random() < 0.55 ? 'steel' : 'shout', { vol: 0.35 * this.ambTarget.battle });
    // score
    const mode = this.musicMode;
    const droneTarget = mode === 'raid' ? 0.05 : mode === 'sorrow' ? 0.035 : mode === 'day' ? 0.016 : mode === 'menu' ? 0.03 : 0;
    this.drone.gain.value += (droneTarget - this.drone.gain.value) * Math.min(1, dt);
    if (!mode || ctx.currentTime < this.nextNote) return;
    if (mode === 'day' || mode === 'menu') {
      const sc = SCALE_DAY;
      const n = sc[(Math.random() * sc.length) | 0];
      this.pluck(n, 0.09);
      if (Math.random() < 0.35) this.pluck(sc[(Math.random() * sc.length) | 0] * 0.5, 0.07, 0.18);
      this.nextNote = ctx.currentTime + (mode === 'menu' ? 1.4 : 0.9) + Math.random() * 2.2;
    } else if (mode === 'raid') {
      const pat = [1, 0, 0, 1, 0, 1, 0, 0];
      if (pat[this.beat % 8]) this.play('drum', { freq: this.beat % 8 === 0 ? 62 : 78, vol: 0.9 });
      if (this.beat % 32 === 16) this.play('horn', { freq: 82, vol: 0.45 });
      this.beat++;
      this.nextNote = ctx.currentTime + 0.3;
    } else if (mode === 'sorrow') {
      const n = SCALE_DARK[(Math.random() * SCALE_DARK.length) | 0];
      this.pluck(n * 2, 0.1);
      this.nextNote = ctx.currentTime + 2.2 + Math.random() * 2.6;
    }
  }
}
