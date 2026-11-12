// Keyboard / mouse / gamepad input with remappable action bindings.
export const DEFAULT_BINDINGS = {
  forward: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'],
  crouch: ['KeyC', 'ControlLeft', 'Pad11'],
  dodge: ['Space', 'Pad1'],
  interact: ['KeyE', 'Pad0'],
  attack: ['Mouse0', 'Pad2', 'Pad7'],
  block: ['Mouse2', 'Pad6', 'Pad4'],
  sense: ['KeyQ', 'Pad3'],
  raven: ['KeyV', 'Pad12'],
  harry: ['KeyR', 'Pad5'],
  whistle: ['KeyH'],
  horn: ['KeyG'],
  weapon1: ['Digit1', 'Pad14'], weapon2: ['Digit2', 'Pad15'], weapon3: ['Digit3'], holster: ['KeyX', 'Pad13'],
  inventory: ['KeyI', 'Tab'], journal: ['KeyJ', 'Pad8'], map: ['KeyM'],
  pause: ['Escape', 'KeyP', 'Pad9'],
  camLeft: ['ArrowLeft'], camRight: ['ArrowRight'], camUp: ['ArrowUp'], camDown: ['ArrowDown'],
};
export const ACTION_LABELS = {
  forward: 'Move forward', back: 'Move back', left: 'Move left', right: 'Move right',
  sprint: 'Sprint', crouch: 'Crouch / sneak', dodge: 'Dodge', interact: 'Interact',
  attack: 'Attack / loose arrow', block: 'Block / aim', sense: "Hunter's sense", raven: "Raven's Eye", harry: 'Send the black raven', whistle: 'Whistle for your horse', horn: 'Sound the horn (crew ashore / back aboard)',
  weapon1: 'Equip axe or practice sword', weapon2: 'Equip bow', weapon3: 'Off hand: shield or second axe', holster: 'Put weapon away',
  inventory: 'Inventory', journal: 'Journal', map: 'Map', pause: 'Pause',
  camLeft: 'Camera left', camRight: 'Camera right', camUp: 'Camera up', camDown: 'Camera down',
};

export function codeLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map = {
    Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift',
    ControlLeft: 'Ctrl', Escape: 'Esc', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Tab: 'Tab',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Pad')) return 'Pad ' + code.slice(3);
  return code;
}

export class Input {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    if (settings.bindings) for (const k in settings.bindings) if (this.bindings[k]) this.bindings[k] = settings.bindings[k];
    this.down = new Set();
    this.pressed = new Set();
    this.releasedSet = new Set();
    this.mdx = 0; this.mdy = 0;
    this.locked = false;
    this.wantLock = false;      // game wants pointer lock (play mode)
    this.expectUnlock = false;
    this.onLockLost = null;
    this.captureNext = null;    // rebinding callback
    this.padAxes = [0, 0, 0, 0];
    this.usingPad = false;

    window.addEventListener('keydown', (e) => {
      if (this.captureNext) { e.preventDefault(); const f = this.captureNext; this.captureNext = null; f(e.code); return; }
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.usingPad = false;
      this.down.add(e.code); this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); this.releasedSet.add(e.code); });
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousedown', (e) => {
      if (this.captureNext) { const f = this.captureNext; this.captureNext = null; f('Mouse' + e.button); return; }
      if (this.wantLock && !this.locked) { this.lock(); if (e.button === 0) return; }
      const c = 'Mouse' + e.button;
      this.down.add(c); this.pressed.add(c);
    });
    window.addEventListener('mouseup', (e) => { const c = 'Mouse' + e.button; this.down.delete(c); this.releasedSet.add(c); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (this.locked) { this.mdx += e.movementX; this.mdy += e.movementY; }
    });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked && !this.expectUnlock && this.onLockLost) this.onLockLost();
      this.expectUnlock = false;
    });
  }
  lock() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* unsupported */ } }
  unlock() { if (this.locked) { this.expectUnlock = true; document.exitPointerLock(); } }

  held(action) { const b = this.bindings[action]; return !!b && b.some((c) => this.down.has(c)); }
  hit(action) { const b = this.bindings[action]; return !!b && b.some((c) => this.pressed.has(c)); }
  released(action) { const b = this.bindings[action]; return !!b && b.some((c) => this.releasedSet.has(c)); }
  anyHit() { return this.pressed.size > 0; }
  label(action) { return codeLabel((this.bindings[action] || [])[0]); }

  /** Movement intent in camera space: x = strafe right, y = forward. */
  move() {
    let x = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    let y = (this.held('forward') ? 1 : 0) - (this.held('back') ? 1 : 0);
    const ax = this.padAxes[0], ay = this.padAxes[1];
    if (Math.hypot(ax, ay) > 0.2) { x += ax; y -= ay; }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y, mag: Math.min(1, m) };
  }
  /** Camera look delta in radians-ish units for this frame. */
  look(dt) {
    const s = this.settings.sensitivity ?? 1;
    let dx = this.mdx * 0.0023 * s, dy = this.mdy * 0.0023 * s;
    const k = 2.2 * s * dt;
    dx += ((this.held('camRight') ? 1 : 0) - (this.held('camLeft') ? 1 : 0)) * k;
    dy += ((this.held('camDown') ? 1 : 0) - (this.held('camUp') ? 1 : 0)) * k * 0.7;
    const rx = this.padAxes[2], ry = this.padAxes[3];
    if (Math.abs(rx) > 0.15) dx += rx * 2.6 * s * dt;
    if (Math.abs(ry) > 0.15) dy += ry * 1.8 * s * dt;
    if (this.settings.invertY) dy = -dy;
    return { dx, dy };
  }
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && Array.from(pads).find((g) => g && g.connected);
    if (!p) { this.padAxes = [0, 0, 0, 0]; return; }
    this.padAxes = [p.axes[0] || 0, p.axes[1] || 0, p.axes[2] || 0, p.axes[3] || 0];
    p.buttons.forEach((b, i) => {
      const c = 'Pad' + i, on = b.pressed || b.value > 0.5;
      if (on && !this.down.has(c)) { this.down.add(c); this.pressed.add(c); this.usingPad = true; }
      else if (!on && this.down.has(c)) { this.down.delete(c); this.releasedSet.add(c); }
    });
  }
  /** Test / accessibility hook: press or release a code programmatically. */
  simulate(code, isDown) {
    if (isDown) { if (!this.down.has(code)) { this.down.add(code); this.pressed.add(code); } }
    else { this.down.delete(code); this.releasedSet.add(code); }
  }
  endFrame() { this.pressed.clear(); this.releasedSet.clear(); this.mdx = 0; this.mdy = 0; }
}
