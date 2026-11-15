// Act I, Chapter 2 — "The Long White": items, cast, quests and hints. Extends the Act I tables.
import { ITEMS, CAST, QUESTS, HINTS } from './act1.js';
import { POI } from '../world/layout.js';

export const CAMP = POI.camp;
export const LEANTO = [CAMP.x + 2.3, CAMP.z - 0.9];
export const BANK_W = [56, -122], BANK_E = [89, -124], COLLAPSE = [118, -122];

Object.assign(ITEMS, {
  bough: { name: 'Spruce Boughs', desc: 'Green and springy. Layered thick, they keep out wind and snow.', cat: 'Resource' },
});
Object.assign(CAST, {
  bjorn: { name: 'Bjorn', role: 'Farmer', look: { scale: 1.06, build: 1.22, hair: 0x5a4028, hairStyle: 'long', beard: 'long', tunic: 0x6a5238, trim: 0x3a3a2a, legs: 0x3e342a, cloak: 0x4a4034, fur: true, sleeve: 0x6a5238, belly: 0.45, heft: 1.1, eyeShape: 'up', corners: 0.3 } },
});
Object.assign(QUESTS, {
  q_white: {
    title: 'The Long White', kind: 'main', xp: 120, next: 'q_ice',
    desc: 'The fire is embers. The smoke over the fjord is still rising. Nobody is coming.',
    steps: [
      { id: 'wake', text: 'Wake', type: 'event', key: 'woke' },
      { id: 'boughs', text: "Cut spruce boughs with your father's axe", type: 'event', key: 'bough', count: 4, marker: { poi: 'camp', until: 16 } },
      { id: 'shelter', text: 'Mend the lean-to', type: 'event', key: 'shelterDone', marker: { pos: LEANTO } },
      { id: 'food', text: 'Find food. Fresh deer tracks lead away from the old birch', type: 'kill', key: 'deer', marker: { pos: [-126, -100], until: 9 } },
      { id: 'harvest', text: 'Harvest the deer', type: 'event', key: 'harvestDeer', marker: { dyn: 'deerBody' } },
      { id: 'wolf', text: 'A thin she-wolf circles the fire. Throw her a share of the meat', type: 'event', key: 'wolfDone', marker: { dyn: 'wolf' } },
      { id: 'return', text: 'Carry the meat back to the fire', type: 'reach', key: 'camp3', marker: { poi: 'camp' } },
      { id: 'cook', text: 'Cook the venison and eat', type: 'event', key: 'ate', marker: { poi: 'camp' } },
      { id: 'sleep', text: 'Sleep in the shelter', type: 'event', key: 'slept', marker: { pos: LEANTO } },
    ],
  },
  q_ice: {
    title: 'Thin Ice', kind: 'main', xp: 150, next: null,
    desc: "Torches between the trees. Håkon's trackers have followed the smoke.",
    steps: [
      { id: 'wake', text: 'Wake', type: 'event', key: 'woke2' },
      { id: 'flee', text: 'Slip away east to the river. Stay low and out of the torchlight', type: 'reach', key: 'riverbank', marker: { pos: BANK_W } },
      { id: 'cross', text: 'Cross the ice. Go gently', type: 'reach', key: 'eastbank', marker: { pos: BANK_E } },
      { id: 'climb', text: 'Keep moving', type: 'reach', key: 'collapse', marker: { pos: COLLAPSE } },
    ],
  },
});
Object.assign(HINTS, {
  boughs: 'Press {interact} at a young spruce to cut boughs. Stay near the fire to warm up; hunger and cold both wear you down.',
  tracks2: "Hold {sense} to follow the prints in the snow. Deer spook easily: crouch with {crouch}, and aim for the head or neck.",
  wolf: 'She circles just outside the firelight. Get close and press {interact} to throw her meat.',
  cook: 'Press {interact} at the fire to cook and eat.',
  trackers: 'Trackers. Crouch with {crouch}: among the trees they must be almost on top of you to see you. Running is loud.',
  ice: 'The ice is thin. Crouch with {crouch} and creep across. Running will break it, and so will standing still.',
});
