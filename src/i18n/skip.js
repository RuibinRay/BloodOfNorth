// Strings in the source that read like words but are never shown to a player (key names on keycaps, shader code,
// debug lines, lookup keys), so tools/i18n.mjs does not ask for them to be translated. And EXTRA: short strings that
// are shown but do not look like words to the scan (the compass points).
export default [
  // keycaps: printed as they are on the keyboard
  'Tab', 'Alt', 'Alt Gr', 'Escape', 'Key', 'Digit', 'Shift', 'R-Shift', 'Ctrl', 'Esc', 'Pad', 'Pad ', 'Mouse', 'Enter',
  // code
  'WEBGL_debug_renderer_info', 'grayscale(0.75) contrast(1.35) brightness(1.25)', '{0}px {1}px', 'translate({0}px, {1}px)',
  '(1.0 - uv.y) * (1.0 - uv.y)', 'sin(uv.x * 3.14159) * (0.45 + 0.55 * (1.0 - uv.y))',
  // debug and the frame counter
  '{0}:{1} after {2}s stuck:{3}', 'Failed to start: ', '{0} fps · {1} ms · {2} draws · {3}k triangles · {4}% resolution',
  // lookup keys for the paintings (src/ui/art.js)
  'the lawspeaker', 'the lawspeaker of kaupang', 'a drunk sailor', 'an ironmonger', 'a salt seller', 'a grain factor', 'a jarnoy smith',
  'the raven stone', 'the twin axe stone', 'the barrow', 'the split birch', 'the spear in the ice', 'the tarn', 'sky iron',
];
export const EXTRA = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
