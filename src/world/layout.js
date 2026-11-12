// World layout for the Hrafnvik valley (Act I). Units are metres.
// +X is east, +Z is south (toward the fjord). The village green is near the origin.

export const VILLAGE = { x: 0, z: 40, r: 66, h: 4.0 };

/** Named points of interest used by the story script, the map and the AI. */
export const POI = {
  home: { x: -30, z: 78, name: "Ragnar's longhouse" },
  homeDoor: { x: -28, z: 73.6 },
  spawn: { x: -26, z: 70 },
  cookfire: { x: -19, z: 68, name: 'Cooking fire' },
  ylvaSpot: { x: -20.6, z: 69.4 },
  bed: { x: -28, z: 73.9 },
  chop: { x: -46, z: 72, name: 'Chopping block' },
  yard: { x: -12, z: 58, name: 'Training yard' },
  well: { x: -5, z: 42, name: 'Village well' },
  elderHall: { x: 26, z: 26, name: "Elder's hall" },
  skald: { x: 8, z: 15, name: "Skald's hut" },
  smithy: { x: 44, z: 50, name: 'Smithy' },
  dock: { x: 6, z: 157, name: 'Landing beach' },
  northGate: { x: -22, z: -18, name: 'North gate' },
  barn: { x: -46, z: 6, name: 'Barn' },
  forestEdge: { x: -62, z: -30 },
  meadow: { x: -66, z: -38, name: 'Hare meadow' },
  target: { x: -74, z: -30 },
  trackStart: { x: -82, z: -50 },
  camp: { x: -118, z: -92, name: "Father's hunting camp" },
  oldBirch: { x: -122, z: -96, name: 'The old birch' },
  deer: { x: -150, z: -128, name: 'Deer clearing' },
  runestone: { x: -84, z: 30, name: 'The Raven Stone' },
  fishing: { x: 0, z: 0, name: 'Fishing rock' },
  // Bjornstead, the hidden dale east of the river (Chapter 3). Unnamed points are secrets: found, not labelled.
  farm: { x: 150, z: -140, name: 'Bjornstead' },
  farmFire: { x: 146, z: -137 }, farmChop: { x: 158, z: -139 }, farmDoor: { x: 152, z: -142.4 }, pen: { x: 148.5, z: -155.5 },
  nest: { x: 126, z: -151 }, barrow: { x: 178, z: -166 }, axeStone: { x: 139, z: -178 }, yew: { x: 187, z: -121 },
  gulen: { x: -55, z: 262, name: 'Gulen (law-island)' }, lawRock: { x: -52, z: 256 }, bulandet: { x: 62, z: 282, name: 'Bulandet' },
  tarn: { x: 197, z: -150 }, skyIron: { x: 165.3, z: -133.2 }, lamb: { x: 113, z: -171 }, hunters: { x: 57, z: -150 }, // filled in by terrain.js (depends on the river curve)
};

/** Flattened pads. `h` is absolute; `dh` is relative to the natural height at the centre. */
export const FLATS = [
  { x: VILLAGE.x, z: VILLAGE.z, r: VILLAGE.r, h: VILLAGE.h },
  { x: POI.meadow.x, z: POI.meadow.z, r: 24, dh: 0.2 },
  { x: POI.camp.x, z: POI.camp.z, r: 15, dh: 0.3 },
  { x: POI.deer.x, z: POI.deer.z, r: 22, dh: 0 },
  { x: POI.runestone.x, z: POI.runestone.z, r: 10, dh: 2.4 },
  { x: 118, z: -122, r: 16, dh: 0 }, // clearing east of the river where Chapter 2 ends
  { x: 150, z: -140, r: 34, dh: 0.6, name: 'farm' },
  { x: 178, z: -166, r: 7, dh: 2.4, name: 'barrow' },   // a small plateau reads as a grave mound
  { x: 197, z: -150, r: 12, dh: -0.8, name: 'tarn' },
  { x: -55, z: 262, r: 46, h: 3.4, name: 'gulen' },      // islands: absolute height, rising out of the fjord
  { x: 62, z: 282, r: 36, h: 2.8, name: 'bulandet' },
];

/** Trodden paths: used for ground colour and to keep trees off the trail. */
export const PATHS = [
  { w: 2.4, pts: [[6, 160], [3, 112], [0, 74], [0, 46], [-8, 12], [-22, -18], [-44, -28], [-66, -38]] },
  { w: 1.8, pts: [[0, 58], [-16, 64], [-28, 72.5]] },
  { w: 1.5, pts: [[-28, 72.5], [-38, 72], [-46, 72]] },
  { w: 1.8, pts: [[0, 46], [22, 44], [44, 48], [66, 54], [82, 58]] },
  { w: 1.6, pts: [[0, 46], [14, 30], [22, 27]] },
  { w: 1.4, pts: [[-8, 12], [4, 13], [8, 14]] },
  { w: 1.5, pts: [[-8, 12], [-30, 10], [-44, 9]] },
  { w: 1.3, pts: [[-66, -38], [-82, -50], [-98, -70], [-118, -92]] },
  { w: 1.0, pts: [[-118, -92], [-134, -110], [-150, -128]] },
  { w: 1.2, pts: [[-16, 64], [-44, 46], [-70, 36], [-84, 30]] },
  { w: 1.6, pts: [[152, -142], [158, -139], [164.5, -135]] },
  { w: 1.3, pts: [[146, -138], [136, -146], [127, -150.5]] },
  { w: 1.2, pts: [[118, -122], [134, -131], [146, -137]] },
];

/** Ploughed fields (centre, size, rotation). */
export const FIELDS = [
  { x: 36, z: -4, w: 26, d: 22, ry: 0.12 },
  { x: 52, z: 86, w: 20, d: 16, ry: -0.2 },
];

/** Buildings. Local X is the long axis; `door` is the side (+1 = local +Z, -1 = local -Z). */
export const HOUSES = [
  { id: 'home', x: -30, z: 78, ry: 0, len: 15, wid: 6.4, ridge: 4.6, roof: 'turf', door: -1, doorX: 2 },
  { id: 'elder', x: 26, z: 26, ry: Math.PI / 2, len: 18, wid: 7.2, ridge: 5.2, roof: 'turf', door: -1, doorX: 0 },
  { id: 'odd', x: 30, z: 74, ry: 0.3, len: 11, wid: 5.4, ridge: 4.0, roof: 'thatch', door: -1, doorX: -1 },
  { id: 'weaver', x: -40, z: 34, ry: Math.PI / 2 + 0.2, len: 11, wid: 5.4, ridge: 4.0, roof: 'turf', door: 1, doorX: 0 },
  { id: 'skald', x: 10, z: 8, ry: -0.4, len: 8, wid: 4.6, ridge: 3.6, roof: 'thatch', door: 1, doorX: 0 },
  { id: 'barn', x: -46, z: 6, ry: 0.1, len: 12, wid: 6, ridge: 4.4, roof: 'thatch', door: 1, doorX: 0 },
  { id: 'boathouse', x: -14, z: 104, ry: Math.PI / 2, len: 10, wid: 5, ridge: 3.8, roof: 'thatch', door: 0 },
  { id: 'houseF', x: 12, z: 88, ry: -0.2, len: 10, wid: 5.2, ridge: 3.9, roof: 'turf', door: -1, doorX: 1 },
  { id: 'bjornstead', x: 150, z: -147, ry: 0, len: 13, wid: 6, ridge: 4.4, roof: 'turf', door: 1, doorX: 2 },
  { id: 'gulenhall', x: -66, z: 266, ry: 0.5, len: 10, wid: 5.2, ridge: 3.9, roof: 'turf', door: 1, doorX: 0 },
  { id: 'bjornbarn', x: 169, z: -135, ry: Math.PI / 2, len: 9, wid: 5.2, ridge: 3.9, roof: 'thatch', door: -1, doorX: 0 },
];

export const BOUNDS = { minX: -250, maxX: 250, minZ: -262, maxZ: 314 };
