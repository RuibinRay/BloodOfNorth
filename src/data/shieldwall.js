// The shield wall: every number of systems/shieldwall.js in one table. All of it is a first guess from scripted
// fights; none of it has been played by a person. A battle overrides what it needs (A3.wall, A7.wall).
export const WALL = {
  // ---- the formation ----
  spacing: 0.98,          // metres between files (shields locked)
  depth: 0.95,            // metres between ranks
  gap: 1.5,               // metres between the two front ranks
  ranks: [3, 3],          // how deep each side stands: [ours, theirs]
  reserve: [0, 30],       // men waiting behind to fill the rear rank: [ours, theirs]
  sector: 8,              // metres of line that gives or holds as one piece
  approach: 13,           // how far off their line forms before it comes on
  pace: 3.4,              // metres a second it comes on at
  lie: 16,                // seconds the fallen lie where they fell

  // ---- the rhythm: shove, their rush, and what follows ----
  grind: [6.5, 9],        // seconds of shoving between their rushes
  warn: 2.1,              // from their horn to the crash
  reel: 4.6,              // how long they stay off balance after a rush that was held
  attrition: 1.15,        // seconds between men falling somewhere along the line
  edge: 1,                // how well our men kill, against theirs (above 1 favours us)
  creep: 0.035,           // metres a second the stronger side gains while they shove
  tension: 0.4,           // how hard a sector is pulled back level with its neighbours

  // ---- bracing and pushing ----
  inLine: 4.2,            // how near the front counts as standing in the line
  braceR: 9,              // metres along the line that a man braced in it steadies
  braceCost: 10,          // breath a braced rush costs
  stand: 0.42,            // the chance a sector holds a rush with nobody to steady it, man for man (more men, more chance; a named anchor nearly always holds)
  give: 1.3,              // ground lost where a rush is not held
  gain: 1.6,              // ground won by a push when they are reeling
  cap: 99,                // the furthest forward the line will go (a wall that is there to hold stays behind its stakes)
  early: 2,               // men lost to a push called when their shields are set
  pushCd: 2.5,            // seconds before the horn can be sounded again
  hearR: 34,              // how far from the line the horn still carries
  rushDmg: 15,            // what the rush does to Eirik if he stands in the line with his guard down

  // ---- Eirik against their front rank, and theirs against him ----
  cut: { light: 0.45, heavy: 0.85, hp: 2 },                      // chance a blow gets past the shield; blows a man takes
  thrust: { every: [1.5, 2.6], warn: 0.55, reach: 2.25, dmg: 9 },

  // ---- where the line gives way ----
  breach: { at: 2.4, men: 2, rally: 0.9, sag: 0.05 },            // how far a sector sags behind its neighbours before men come through; ground won back when they are dead
  trickle: [12, 18],      // seconds between single men getting through for Eirik
  atOnce: 3,              // the most of them loose behind the line at one time

  // ---- how it ends ----
  goal: 8,                // mode 'push': metres of ground to win before they break
  surges: 5,              // mode 'hold': rushes to stand through
  lose: -5.5,             // metres of ground lost at which our line breaks
  loseMen: 0.28,          // … or when this share of our men is left
  breakMen: 0.3,          // their line breaks when this share of theirs is left
  autoFloor: [0.72, 0.45],// a wall that fights on by itself stops losing men at this share of what it began with: [ours, theirs]
};

/** What each side's rank and file wear: tunics, the top of the head (iron for a helmet, or hair), and which of the four
 *  painted shields they carry (0 red with a pale band, 1 blue with a ring, 2 black and yellow, 3 bare boards): ours in
 *  red and blue, Håkon's in black. */
export const PAINT = {
  ravenhold: { tunic: [0x6f6048, 0x5a4a44, 0x4a4a52, 0x5a2a24, 0x4a5a5a, 0x7a6a50], cap: [0x70747a, 0x6b4a2b, 0xa8845a, 0x3a2a1c, 0x70747a, 0x8a5a2a], design: [0, 0, 1, 0, 3] },
  alliance: { tunic: [0x6f6048, 0x4a4a52, 0x4a5a5a, 0x7a6a50, 0x5a2a24, 0x39503a, 0x6a5a7a], cap: [0x70747a, 0x70747a, 0x6b4a2b, 0xa8845a, 0x3a2a1c], design: [0, 1, 1, 3, 0, 1] },
  wolves: { tunic: [0x3a2e2a, 0x4a3a30, 0x2e3438, 0x54402e, 0x2a2a2e], cap: [0x4c4f54, 0x4c4f54, 0x4a3a2a, 0x2a2018, 0x4c4f54], design: [2, 2, 3, 2] },
};
