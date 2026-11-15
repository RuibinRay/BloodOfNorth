// Strings in the source that read like words but are never shown to a player (key names on keycaps, shader code,
// debug lines, lookup keys), so tools/i18n.mjs does not ask for them to be translated. And EXTRA: short strings that
// are shown but do not look like words to the scan (the compass points).
export default [
  // keycaps: printed as they are on the keyboard
  'Tab', 'Alt', 'Alt Gr', 'Escape', 'Key', 'Digit', 'Shift', 'R-Shift', 'Ctrl', 'Esc', 'Pad', 'Pad ', 'Mouse', 'Enter',
  // code
  '(any-pointer: fine)', 'WEBGL_debug_renderer_info', 'grayscale(0.75) contrast(1.35) brightness(1.25)', '{0}px {1}px', 'translate({0}px, {1}px)',
  '(1.0 - uv.y) * (1.0 - uv.y)', 'sin(uv.x * 3.14159) * (0.45 + 0.55 * (1.0 - uv.y))',
  // debug and the frame counter
  '{0}:{1} after {2}s stuck:{3}', 'Failed to start: ', '{0} fps · {1} ms · {2} draws · {3}k triangles · {4}% resolution',
  // the playtest report file (src/ui/playtest.js): written for the developer, in English
  'Blood of the North {0}: playtest report, {1}', '{0} chapters, {1} steps, {2} in play, {3} falls, {4} notes',
  'Where it was hard (over 10 minutes, or 3 falls or more):', ', NOT PASSED', 'Every step:', '  (not passed)', '  {0} {1}  {2} falls{3}', 'botn-playtest-{0}.txt',
  // lookup keys for the paintings (src/ui/art.js)
  'the lawspeaker', 'the lawspeaker of kaupang', 'a drunk sailor', 'an ironmonger', 'a salt seller', 'a grain factor', 'a jarnoy smith',
  'the raven stone', 'the twin axe stone', 'the barrow', 'the split birch', 'the spear in the ice', 'the tarn', 'sky iron',
];
export const EXTRA = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
