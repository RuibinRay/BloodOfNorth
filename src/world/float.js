// Ships ride the swell. Every ship makeShip() builds is listed here; just before a frame is drawn, each one that is
// afloat is lifted, pitched and rolled the way the water under its bow, stern and sides is moving (the same waves the
// sea is drawn with: swellAt in geo.js), and so is everyone standing on its deck. Straight after the frame everything
// is put back, so nothing the game itself does (walking a deck, a fight, the story sailing a ship from A to B) knows
// about it: the motion is in the picture only.
import * as THREE from 'three';
import { swellAt, shared } from './geo.js';
import { heightAt } from './terrain.js';

const SHIPS = new Set();
/** makeShip() calls this for every ship it builds. */
export function floats(ship, L, B) { ship.userData.float = { L, B, h: 0, p: 0, r: 0 }; SHIPS.add(ship); return ship; }

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// in the scene and shown, and every group it sits in leaves it where it is (so its position is where it is in the world)
const inScene = (o, scene) => {
  if (!o.visible) return false;
  for (let p = o.parent; p; p = p.parent) {
    if (p === scene) return true;
    if (!p.visible || p.position.lengthSq() > 1e-6 || p.quaternion.w < 0.999999 || p.scale.x !== 1 || p.scale.y !== 1 || p.scale.z !== 1) return false;
  }
  return false;
};
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _yaw = new THREE.Quaternion();

/** How strongly the swell lifts the sea at (x, z): as the sea's shader works it out (terrain.js, geo.js seaPatch). */
function ampAt(x, z, sea) {
  const depth = Math.min(40, Math.max(0, -heightAt(x, z)));
  return sea.swell.value * smooth(0.6, 14, depth) * (0.28 + 0.72 * smooth(sea.calm.z * 0.5, sea.calm.z * 1.6, Math.hypot(x - sea.calm.x, z - sea.calm.y)));
}

const moved = []; // [object, saved position, saved quaternion]
/** What the last frame did (for tests): ships afloat and people carried. */
export const lastRide = { ships: 0, riders: 0 };
/** Lift the ships and their crews for this frame. dt: seconds since the last frame (for smoothing). */
export function rideSwell(g, dt) {
  const sea = g.world.terrain.seaInfo; if (!sea) return;
  const t = shared.uTime.value, dr = shared.uSeaDrift.value, k = 1 - Math.exp(-dt * 6);
  let riders = null; lastRide.ships = 0; lastRide.riders = 0;
  for (const s of SHIPS) {
    if (!s.parent || !inScene(s, g.scene)) continue;
    const f = s.userData.float, P = s.position;
    // afloat: at the waterline, sitting level (a beached, wrecked or sunk hull is tilted, low or on land)
    if (P.y < -0.35 || P.y > 0.1 || Math.abs(s.rotation.x) > 0.02 || Math.abs(s.rotation.z) > 0.02) continue;
    const amp = ampAt(P.x, P.z, sea);
    if (amp < 0.01) { f.h = f.p = f.r = 0; continue; }
    const yaw = s.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), hl = f.L * 0.4, hb = f.B * 0.5; // the hull runs along its local z
    const at = (a, b) => swellAt(P.x + fx * a + fz * b + dr.x, P.z + fz * a - fx * b + dr.y, t, amp);
    const bow = at(hl, 0), stern = at(-hl, 0), port = at(0, hb), stbd = at(0, -hb), mid = at(0, 0);
    const h = (bow + stern + port + stbd + mid * 2) / 6 * 0.9, p = Math.atan2(bow - stern, 2 * hl), r = Math.atan2(port - stbd, 2 * hb) * 0.8;
    f.h += (h - f.h) * k; f.p += (p - f.p) * k; f.r += (r - f.r) * k;
    // the turn of the deck about the ship's own middle, in the world's frame
    _yaw.setFromAxisAngle(_w.set(0, 1, 0), yaw);
    _q.setFromEuler(_e.set(-f.p, 0, f.r)); _q.premultiply(_yaw).multiply(_yaw.invert()); // yaw * tilt * yaw⁻¹
    const shift = (o) => {
      moved.push([o, o.position.clone(), o.quaternion.clone()]);
      _v.copy(o.position).sub(P).applyQuaternion(_q); o.position.copy(P).add(_v); o.position.y += f.h;
      o.quaternion.premultiply(_q); o.updateMatrixWorld(true);
    };
    // whoever stands on her deck goes with her
    riders ||= [g.player && g.player.root, ...[...g.npcs.values()].map((n) => n.root), ...(g.combat ? g.combat.enemies.map((e) => e.root) : [])].filter((o, i, a) => o && o.visible && a.indexOf(o) === i);
    for (const o of riders) {
      if (moved.some((m) => m[0] === o)) continue;
      const dx = o.position.x - P.x, dz = o.position.z - P.z, lz = dx * fx + dz * fz, lx = dx * fz - dz * fx, dy = o.position.y - P.y;
      if (Math.abs(lz) < f.L / 2 + 0.3 && Math.abs(lx) < f.B / 2 + 0.3 && dy > -1 && dy < 3.5) { shift(o); lastRide.riders++; }
    }
    shift(s); lastRide.ships++;
  }
}
/** Put back everything rideSwell moved. */
export function settle() {
  for (const [o, p, q] of moved) { o.position.copy(p); o.quaternion.copy(q); o.updateMatrixWorld(true); }
  moved.length = 0;
}
