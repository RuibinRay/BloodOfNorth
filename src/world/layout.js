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

// the home valley is 250 m either side; south of the fjord mouth the home waters are 628 m either side as far as
// homeZ; beyond that lies the open sea of the ten islands (GREAT, below), realmX either side down to maxZ
export const BOUNDS = { minX: -250, maxX: 250, minZ: -262, maxZ: 3560, seaX: 628, homeZ: 1590, realmX: 1960, realmZ: 640 };

/** Islands of the sea chart (open water south of the fjord mouth). r = radius, h = height of the flat
 *  ground, rough = bumpiness, k and a = stretch and turn of its outline, p = [dx, dz, height, radius] of its hill,
 *  bare = no trees.
 *  A nameless entry is a lobe of its neighbour. */
export const ISLES = [
  { id: 'selja', k: 1.35, a: 0.5, name: 'Selja', x: -250, z: 560, r: 70, h: 4.5, rough: 1.2, p: [-24, 14, 12, 30] },
  { id: 'fedje', k: 1.5, a: -0.4, name: 'Fedje', x: 210, z: 600, r: 80, h: 3.5, rough: 1.0, p: [26, 22, 7, 30] },
  { id: 'kinn', k: 1.25, a: 0.2, name: 'Kinn', x: -40, z: 760, r: 95, h: 5, rough: 1.2, p: [30, 28, 24, 40] },
  { id: 'batalden', k: 1.4, a: 1.2, name: 'Batalden', x: -420, z: 800, r: 75, h: 4, rough: 1.5, p: [-22, -16, 10, 28] },
  { id: 'vaeroy', k: 1.3, a: -0.9, name: 'Værøy', x: 340, z: 860, r: 90, h: 5, rough: 1.5, p: [-25, 30, 14, 38] },
  { id: 'hovden', k: 1.6, a: 0.1, name: 'Hovden', x: 120, z: 1010, r: 60, h: 3, rough: 0.8 },
  { id: 'skorpa', k: 1.15, a: 0.8, name: 'Skorpa', x: -230, z: 1040, r: 85, h: 5, rough: 1.6, p: [0, 0, 27, 62] },
  { id: 'gannet', k: 1.2, a: 2.0, name: 'Gannet Rock', x: 470, z: 1130, r: 44, h: 6, rough: 1.5, p: [12, -10, 20, 21], bare: true },
  { id: 'vaengr', k: 1.5, a: -0.51, name: 'Vængr', x: -60, z: 1260, r: 78, h: 4, rough: 1.2, p: [-26, -22, 8, 28] },
  { id: 'vaengr2', k: 1.7, a: -0.2, name: null, x: 22, z: 1214, r: 60, h: 3.5, rough: 1.0 },
  { id: 'horns', k: 1.3, a: 0.3, name: 'Skerry of Horns', x: -450, z: 1290, r: 55, h: 4, rough: 1.6, p: [14, -12, 16, 20], bare: true },
  { id: 'stormwife', k: 1.15, a: 1.0, name: "Storm-Wife's Rock", x: 330, z: 1380, r: 48, h: 5, rough: 1.4, p: [-13, -13, 18, 21], bare: true },
  { id: 'utvaer', k: 1.6, a: -0.3, name: 'Utvær', x: -120, z: 1480, r: 50, h: 3, rough: 0.9, bare: true },
];
/** Camps and landmarks on the islands: trees and boulders keep clear of these. [x, z, radius] */
export const SEA_CLEAR = [[-40, 752, 15], [206, 592, 13], [-242, 555, 10], [-415, 806, 13], [348, 852, 11], [124, 1023, 9], [-230, 1040, 7], [466, 1135, 9], [-60, 1260, 9], [-457, 1297, 9], [334, 1386, 9], [-120, 1484, 6], [-104, 1473, 12]];
/** Where one law ends and the next begins. */
export const DISTRICT_LINE = 660;

/** The great islands of the story (docs/story): each has its own heightfield, out in the open sea beyond the home
 *  waters. Offsets below are metres from the island's centre (+x east, +z south; north is toward home).
 *  r = radius of the outline, k and a = its stretch and turn, h = height of the common ground, rough = bumpiness;
 *  bays [dx, dz, r] bite a harbour or a cliff-foot out of the coast; hills [dx, dz, height, radius];
 *  flats [dx, dz, radius, height] level ground for a town, a hall or a fight; cuts { pts, w, y } carve a ravine or
 *  a channel down to y; marsh = a drowned island of reeds and pools; forest 0..1 = how wooded;
 *  ground = which colours the land is painted in (see realm.js). */
export const GREAT = [
  { id: 'jarnoy', name: 'Jarnøy', title: 'the Iron Isle', ruler: 'King Hroald Ironvein', x: -1350, z: 1450, r: 290, k: 1.2, a: 0.25, h: 9, rough: 3, forest: 0.55, ground: 'iron',
    bays: [[300, -20, 100], [268, 130, 90]],
    hills: [[-190, -10, 44, 130], [-40, 50, 26, 150], [150, -170, 18, 85], [20, 215, 8, 70]],
    flats: [[170, -22, 78, 4], [176, 96, 58, 1.7], [78, -14, 40, 8.5], [118, -62, 13, 6], [-10, 62, 34, 22], [40, 236, 26, 2.5]],
    roads: [[[226, -24], [170, -22], [118, -40], [78, -14], [30, 30], [-10, 62]], [[170, -22], [176, 60], [176, 96]], [[78, -14], [60, 110], [40, 236]]] },
  { id: 'solvik', name: 'Solvik', title: 'the Golden Quay', ruler: 'King Eystein Goldhand', x: 1350, z: 1450, r: 240, k: 1.3, a: -0.3, h: 6, rough: 2, forest: 0.3, ground: 'gold',
    bays: [[-268, 40, 95], [30, 228, 44]],
    hills: [[70, 10, 24, 120], [-40, -150, 12, 70]],
    flats: [[-150, 26, 82, 3.5], [-64, -34, 36, 9], [0, 188, 20, 2.2]],
    roads: [[[-200, 36], [-150, 26], [-100, -10], [-64, -34]], [[-150, 26], [-80, 110], [0, 188]]] },
  { id: 'svartoy', name: 'Svartøy', title: 'the Black Isle', ruler: 'Jarl Håkon Ironwolf', x: 0, z: 2420, r: 340, k: 1.1, a: 0, h: 9, rough: 3.5, forest: 0.12, ground: 'black',
    bays: [[0, -300, 85], [104, 285, 55]],
    hills: [[0, 40, 20, 270], [-215, 0, 30, 120], [220, 30, 26, 120]],
    flats: [[0, -205, 60, 3], [14, -150, 30, 13], [0, 4, 78, 26], [0, 112, 50, 38], [30, 222, 44, 9], [0, -106, 15, 22], [0, -54, 15, 22]], // the bridgeheads last: they keep their height
    cuts: [{ pts: [[-330, -98], [-90, -78], [0, -80], [90, -82], [330, -66]], w: 21, y: 2.5 }],
    roads: [[[0, -240], [0, -200], [14, -150], [0, -106]], [[0, -54], [0, 4], [0, 76], [0, 112]], [[0, 150], [20, 190], [30, 222], [104, 250]]] },
  { id: 'myrholm', name: 'Myrholm', title: 'the Marsh Isle', ruler: 'Queen Thora', x: -1150, z: 3000, r: 300, k: 1.3, a: 0.4, h: 0.3, rough: 0.5, forest: 0.1, ground: 'marsh', marsh: true,
    bays: [[30, -288, 70]],
    hills: [[10, -40, 2.4, 90]],
    flats: [[6, -36, 56, 2.6], [34, -210, 34, 1.6], [-70, 186, 24, -0.42], [-150, 30, 20, 0.15], [128, 96, 20, 0.15], [170, -70, 18, 0.5]],
    cuts: [{ pts: [[70, -250], [96, -150], [70, -60], [110, 20], [70, 120], [120, 230]], w: 9, y: -1.9 }, { pts: [[-250, -60], [-150, -20], [-100, 80], [-170, 160], [-110, 260]], w: 8, y: -1.9 }],
    roads: [[[34, -238], [34, -210], [20, -120], [6, -36]], [[6, -36], [50, 20], [94, 60], [128, 96]], [[6, -36], [-70, 0], [-125, 30], [-150, 30]]] },
  { id: 'skalloy', name: 'Skalløy', title: 'the Forge Isle', ruler: 'Jarl Gudmund', x: 1150, z: 3000, r: 250, k: 1.15, a: -0.2, h: 8, rough: 3, forest: 0.25, ground: 'stone',
    bays: [[-262, -34, 90], [252, 70, 90]],
    hills: [[120, 40, 30, 150], [-30, -170, 14, 80]],
    flats: [[-140, -26, 60, 3.5], [-40, -20, 60, 9], [-58, 86, 30, 10], [158, 62, 34, 30]],
    roads: [[[-196, -34], [-140, -26], [-40, -20], [40, 10], [110, 44], [158, 62]], [[-40, -20], [-58, 86]]] },
];
/** The mainland coast of the story: Bjornstead, the village that becomes Ravenhold, and the market town of Kaupang
 *  four days' sail down the coast. Each is a patch like a great island's, but only one shore of its land is in the
 *  world: o = where the centre of the outline lies from the centre of the patch, half = half the side of the patch,
 *  wob = how far the coast wanders, shore = where the beach starts and ends (fractions of r), lim = how far north a
 *  man may go. cuts marked late are rivers (carved after the level ground); a flat with a fifth value keeps its
 *  grass; fields [dx, dz, w, d, ry] are painted as barley; woods [dx, dz, r, share of birch]; isles [dx, dz, r, h]
 *  are skerries off the coast; pools [dx, dz, r, y] set the sea floor (a wreck a man can dive to). */
export const MAIN = [
  { id: 'bjornstead', name: 'Bjornstead', title: 'the village on the mainland coast', x: 1300, z: 560, half: 330, o: [0, -70], r: 330, k: 0.95, a: 0, wob: 0.07, shore: [0.9, 0.96], h: 5, rough: 2, ground: 'home',
    lim: { minZ: 336 },
    bays: [[8, 282, 78]],
    hills: [[-20, 10, 12, 60], [-180, -270, 80, 165], [150, -300, 95, 175], [-10, -345, 70, 170], [262, -40, 20, 100], [-262, -10, 24, 110]],
    flats: [[0, 135, 112, 3.4], [-92, 92, 15, 5.4], [100, 36, 26, 3.4, 1], [-20, 10, 9, 16.5, 1], [-150, 96, 42, 3.6, 1], [-150, 150, 12, 3.4, 1], [-60, -62, 16, 9.5, 1]],
    cuts: [{ late: true, pts: [[235, -290], [200, -170], [160, -70], [132, 30], [124, 120], [118, 200], [110, 300]], w: 7, y: -0.72 }],
    roads: [[[0, 214], [0, 150], [-4, 100], [-9, 58], [-16, 36], [-20, 26]], [[-230, 170], [-150, 158], [-110, 146], [-40, 146], [0, 150]],
      [[0, 150], [60, 146], [100, 132], [110, 134], [112, 140], [131, 140], [150, 152], [220, 170], [300, 160]], [[110, 134], [118, 60], [140, -40], [176, -150], [206, -260]], [[-40, 146], [-70, 112], [-92, 92]], [[-10, 50], [-40, 0], [-60, -62]]],
    fields: [[-150, 96, 50, 56, 0.1]],
    woods: [[-150, -70, 95, 0.75], [165, -150, 70, 0.7], [-40, -160, 80, 0.15], [230, 40, 60, 0.5], [-240, 60, 55, 0.5]] },
  { id: 'kaupang', name: 'Kaupang', title: 'the great market', x: 1790, z: 3260, half: 280, o: [110, 30], r: 300, k: 1, a: 0, wob: 0.07, shore: [0.9, 0.96], h: 5, rough: 2, ground: 'stone',
    lim: { maxZ: 3470 },
    bays: [[-190, 20, 70]],
    hills: [[60, 130, 40, 190], [190, -100, 50, 200], [140, 250, 60, 200], [-70, 290, 50, 120]],
    flats: [[-70, 20, 80, 3.2], [-30, -100, 16, 5, 1]],
    roads: [[[-126, -52], [-126, 92]], [[-126, 20], [-70, 20], [-8, 24]], [[-70, 20], [-52, -50], [-30, -100]], [[-70, 20], [-74, 80], [-60, 130]]],
    woods: [[90, -40, 90, 0.4], [40, 170, 80, 0.3]],
    isles: [[-225, -205, 36, 5.5], [-268, -158, 12, 2.4], [-176, -256, 13, 3], [-292, -232, 10, 2]],
    pools: [[-225, -247, 19, -6.6]] },
];
/** Places on the great islands and the mainland that the story names (offsets from the centre of the island or
 *  patch, as above). The world builder puts the buildings here, the story waits here, and the map labels these. */
export const PLACES = {
  jarnoy: { town: [170, -22], shore: [176, 96], hall: [78, -14], tower: [118, -62], furnaces: [-10, 62], hamlet: [40, 236], landing: [236, -22] },
  solvik: { quay: [-150, 26], hall: [-64, -34], cave: [0, 188], landing: [-206, 38], ship: [-226, 44] },
  svartoy: { harbor: [0, -205], bend: [14, -150], bridgeN: [0, -106], bridgeS: [0, -54], town: [0, 4], gate: [0, 76], hall: [0, 116], pens: [30, 222], cove: [104, 250], landing: [0, -246], flagship: [30, -304] },
  myrholm: { hall: [6, -36], landing: [34, -210], tower: [-70, 186], stiltsW: [-150, 30], stiltsE: [128, 96], peat: [170, -70] },
  skalloy: { harbor: [-140, -26], forge: [-40, -20], hall: [-58, 86], quarry: [158, 62], landing: [-202, -34] },
  bjornstead: { yard: [0, 140], hall: [-6, 114], well: [9, 139], chop: [-23, 130], barn: [36, 118], sty: [50, 150], smithy: [-52, 158], smoke: [-40.6, 158], lane: [-46.6, 158], thing: [-92, 92], birch: [-20, 10],
    pier: [0, 232], strand: [0, 212], field: [-150, 96], pasture: [100, 36], bridge: [121, 140], camp: [-150, 150], timber: [-60, -62], elk: [146, -52], latrine: [70, 100], trench: [58, 30], drill: [98, 38], gateE: [106, 131], gateW: [-108, 146], gateN: [-9, 58], gateS: [0, 208], road: [150, -60] },
  kaupang: { quay: [-134, 20], market: [-80, 20], pen: [-104, 74], tavern: [-62, 56], thing: [-30, -100], pier: [-156, 0], ship: [-158, -5], barrel: [-130, -6], pier2: [-156, 42], boat: [-152, 46.5], skerry: [-225, -228], wreck: [-225, -247] },
};
/** World position of a named place: place('svartoy', 'bridgeN') -> { x, z }. */
export function place(isle, name, dx = 0, dz = 0) {
  const s = GREAT.find((g) => g.id === isle) || MAIN.find((g) => g.id === isle), p = PLACES[isle][name];
  return { x: s.x + p[0] + dx, z: s.z + p[1] + dz };
}
