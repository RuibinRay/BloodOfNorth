// Act II, Chapter 1 — "The Farmer's Axe": Eirik at nineteen. Cast, quests, dialogue and hints.
// Text tokens: {w} white raven, {b} black raven, {n} the name the family uses.
import { CAST, QUESTS, HINTS, DIALOGUE } from './act1.js';

export const CAST2 = {
  bjorn: { name: 'Bjorn', role: 'Adoptive father', look: { ...CAST.bjorn.look, hair: 0x8f8a84 } },
  signe: { name: 'Signe', role: 'Adoptive mother', look: { ...CAST.signe.look, hair: 0xc2b89a } },
  freydis: { name: 'Freydis', role: 'Adoptive sister', look: { scale: 0.95, female: true, build: 0.94, hair: 0xb5562a, hairStyle: 'braid', tunic: 0x4f6a7a, trim: 0xe0c070, apron: 0xd8cfb8, sleeve: 0x4f6a7a } },
  kettil: { name: 'Kettil Red-Hand', role: "Håkon's tithe-taker", look: { scale: 1.1, build: 1.26, hair: 0x5a2a1a, hairStyle: 'long', beard: 'long', tunic: 0x2c2a2e, trim: 0x8a1a14, legs: 0x24201c, cloak: 0x3a1c18, fur: true, helmet: true, sleeve: 0x8a1a14, skin: 0xc89878 } },
};

Object.assign(QUESTS, {
  q_ten: {
    title: 'Ten Winters', kind: 'main', xp: 80, next: 'q_smoke',
    desc: 'Bjornstead, ten winters on. The fence is mended. The ravens are grown. Nobody has said the name Hrafnvik aloud in years.',
    steps: [
      { id: 'wake', text: 'Ten winters later', type: 'event', key: 'woke5' },
      { id: 'freydis', text: 'Speak with Freydis', type: 'talk', key: 'freydis', marker: { npc: 'freydis' } },
      { id: 'bjorn', text: 'Find Bjorn in the yard', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
      { id: 'spar1', text: 'Land blows on Bjorn', type: 'event', key: 'sparHit', count: 3 },
      { id: 'spar2', text: "Break Bjorn's guard", type: 'event', key: 'postureBroken' },
      { id: 'bjorn2', text: 'Speak with Bjorn', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
    ],
  },
  q_smoke: {
    title: 'Smoke on the Ridge', kind: 'main', xp: 60, next: 'q_axe',
    desc: 'The white raven will not settle. She keeps turning west, toward the river road.',
    steps: [
      { id: 'eye', text: 'Send the white raven up', type: 'event', key: 'ravenEye' },
      { id: 'spot', text: 'Look west along the river road and mark what she sees', type: 'event', key: 'ridersSpotted' },
      { id: 'warn', text: 'Warn Bjorn', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
      { id: 'axe', text: 'Lift the hearthstone', type: 'event', key: 'tookAxe', marker: { poi: 'farmDoor' } },
    ],
  },
  q_axe: {
    title: "The Farmer's Axe", kind: 'main', xp: 250, next: null,
    desc: "Seven men with the wolf on their shields, come for a tithe nobody owes.",
    steps: [
      { id: 'yard', text: 'Hold the yard', type: 'event', key: 'wave1' },
      { id: 'barn', text: 'Stop them firing the barn', type: 'event', key: 'wave2', marker: { poi: 'skyIron' } },
      { id: 'captain', text: 'Bring down Kettil Red-Hand', type: 'event', key: 'captainDown' },
      { id: 'dying', text: 'Stand over Kettil', type: 'talk', key: 'kettil', marker: { npc: 'kettil' } },
    ],
  },
});

const E = 'Eirik', F = 'Freydis', B = 'Bjorn', K = 'Kettil Red-Hand';
Object.assign(DIALOGUE, {
  freydis2_meet: [
    { s: F, t: '{w} has been shouting at the barn roof since noon, and {b} stole my bread. Your birds, {n}. Your bread.' },
    { s: F, t: 'Father wants you in the yard. He has the practice blades out. He says a farmer who cannot hold a shield-wall is only a man with a field.' },
    { s: E, t: '', choices: [
      { t: '"He says that every autumn."', to: 'a' },
      { t: '"Something has him worried."', to: 'b', fx: { trait: { wisdom: 1 } } },
    ] },
    { id: 'a', s: F, t: 'And every autumn you go. Go on. I will keep {b} off the cheese.', to: 'end' },
    { id: 'b', s: F, t: 'A trader came by with news from the coast. Father would not let me hear it. So it is bad.' },
  ],
  freydis2_idle: [{ s: F, t: 'If you two are going to hit each other, do it away from the washing.' }],
  bjorn_drill: [
    { s: B, t: 'Ten winters, and you still drop your left shoulder. Take a blade.' },
    { s: B, t: 'Hit me. Three times. I will not make it easy.' },
  ],
  bjorn_drill_done: [
    { s: B, t: 'Hm. Good. Better than good.' },
    { s: B, t: 'You fight like your father. All weight, no waste. I never told you that I knew him.' },
    { s: E, t: '', choices: [
      { t: '"No. You never did."', to: 'a', fx: { trait: { wisdom: 1 } } },
      { t: '"I fight like a farmer."', to: 'b', fx: { trait: { compassion: 1 } } },
      { t: '"Then tell me now."', to: 'c', fx: { trait: { ferocity: 1 } } },
    ] },
    { id: 'a', s: B, t: 'And I will not today. But soon, I think. Sooner than I would like.', to: 'end' },
    { id: 'b', s: B, t: 'Then you will live longer than he did. That is all I ever wanted from it.', to: 'end' },
    { id: 'c', s: B, t: 'When the birds stop looking west. Not before.' },
  ],
  bjorn2_idle: [{ s: B, t: 'Go and see what has those ravens so sour. I do not like it when she watches the road.' }],
  bjorn_warn: [
    { s: E, t: 'Riders on the river road. Wolf shields. Seven of them, and they are not lost.' },
    { s: B, t: 'Signe! Freydis! Inside, and bar it. Now.' },
    { s: B, t: 'The hearthstone, {n}. You are tall enough.' },
  ],
  kettil_dying: [
    { s: K, t: 'A farm boy. With that axe. Ha. He said you were ten winters dead in a ditch.' },
    { s: E, t: '', choices: [
      { t: '"Who sent you?"', to: 'who', fx: { trait: { wisdom: 1 } } },
      { t: 'Say nothing. Let him talk.', to: 'who' },
    ] },
    { id: 'who', s: K, t: 'Håkon. Jarl of four valleys now, and hungry for a fifth. He pays men like me to ask one question at every farm.' },
    { s: K, t: "'Where is what the old king hid?' Nobody ever knows. But you know. Don't you, boy." },
    { s: E, t: '', choices: [
      { t: '"Go back. Tell him Ragnar\'s son is alive."', to: 'spare', fx: { flag: 'sparedKettil', trait: { compassion: 1, pride: 1 } } },
      { t: 'Finish it.', to: 'kill', fx: { flag: 'killedKettil', trait: { ferocity: 1 } } },
    ] },
    { id: 'spare', s: K, t: 'He will not send tithe-takers next time. He will come himself. With ships.', to: 'end' },
    { id: 'kill', s: '', t: 'It was quick. It was the first man he had killed with his own hand, looking at his face. It did not feel like nothing.' },
  ],
});

Object.assign(HINTS, {
  melee: '{weapon1} draws your blade. Tap {attack} to strike; hold it, then release, for a heavy blow. {block} guards; press it just as a blow lands to parry. {dodge} rolls clear.',
  guard: 'The lower bar on an opponent is his guard. Heavy blows and parries fill it. When it breaks he is open: hit him hard.',
  ravenwest: 'Press {raven} and fly west, toward the river. Press {interact} when she sees something.',
  raid: '{harry} sends {b} at the face of the man you are fighting. Arrows work on men as well as deer ({weapon2}).',
});
