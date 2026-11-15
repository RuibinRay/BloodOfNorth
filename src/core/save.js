// Settings + save slots, stored in localStorage (wrapped so the game still runs without storage).
const PREFIX = 'botn.';
export const SAVE_VERSION = 1;
export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];

export const DEFAULT_SETTINGS = {
  sensitivity: 1, invertY: false, subtitles: true, subtitleSize: 1, difficulty: 'normal',
  quality: 'medium', volMaster: 0.8, volMusic: 0.6, volSfx: 0.9, objectiveMarkers: true,
  cameraShake: true, holdToSprint: true, bindings: null, mouseLook: true, closeTalk: true, bloom: true,
  autoRes: true, showFps: false, lang: '', // '' until chosen: the first visit takes the browser's language
};

function get(key) {
  try { const v = localStorage.getItem(PREFIX + key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function set(key, val) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; } catch { return false; }
}
export function loadSettings() { return Object.assign({}, DEFAULT_SETTINGS, get('settings') || {}); }
export function saveSettings(s) { set('settings', s); }
/** Whether this browser has settings of its own yet (false on a first visit). */
export const hasSettings = () => get('settings') !== null;

export function writeSave(slot, state, meta) {
  return set('save.' + slot, { v: SAVE_VERSION, at: Date.now(), meta, state });
}
export function readSave(slot) {
  const s = get('save.' + slot);
  return s && s.v === SAVE_VERSION ? s : null;
}
export function deleteSave(slot) { try { localStorage.removeItem(PREFIX + 'save.' + slot); } catch { /* ignore */ } }
export function listSaves() { return SLOTS.map((slot) => ({ slot, save: readSave(slot) })); }
export function latestSave() {
  let best = null;
  for (const { slot, save } of listSaves()) if (save && (!best || save.at > best.save.at)) best = { slot, save };
  return best;
}
