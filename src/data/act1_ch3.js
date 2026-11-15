// Act I, Chapter 3 — "A Stranger's Hearth": the family that takes him in, two ravens, and five old
// things around the farm that wait for a grown man. Extends the Act I tables.
// Text tokens: {w} white raven's name, {b} black raven's name, {n} the name the family knows him by.
import { CAST, QUESTS, HINTS, DIALOGUE } from './act1.js';

/** Omens found as a child. Each is the seed of a weapon that can only be claimed in a later act. */
export const SECRETS = {
  yew: { name: 'The Split Birch', returns: 'Act III', weapon: "Storm-Yew — a bow cut from the young yew that grows up through the scorched stump (Astrid's, in the story)" },
  barrow: { name: 'The Sword in the Barrow', returns: 'Act III', weapon: "Grave-Song — a barrow-king's sword, given, not taken" },
  icespear: { name: 'The Spear in the Ice', returns: 'Act IV', weapon: "Winter's Tooth — a spear from the tarn that never thaws" },
  twinaxe: { name: 'The Twin-Axe Stone', returns: 'Act IV', weapon: 'The Brothers — paired axes on an island shaped like a wing' },
  skyiron: { name: 'Sky-Iron', returns: 'Act V', weapon: 'Star-Fall — a war hammer forged from a fallen star' },
};

Object.assign(CAST, {
  signe: { name: 'Signe', role: 'Adoptive mother', look: { scale: 0.97, female: true, build: 0.95, hair: 0xc9a25a, hairStyle: 'braid', tunic: 0x7a4a3a, trim: 0xd8c08a, apron: 0xcfc4a8, sleeve: 0xcfc4a8 } },
  hrefna: { name: 'Old Hrefna', role: "Bjornstead's herb-woman; some say a seeress", look: { female: true, scale: 0.9, build: 0.88, hair: 0xc8c2b8, hairStyle: 'bun', tunic: 0x4a4438, apron: 0x6a6252, cloak: 0x3a3a30, age: 0.9, face: 'gaunt', nose: 'hooked', eyes: 0x6a8a9a, brows: 0.7, lips: 'thin', rosy: 0.15 } },
  freydis: { name: 'Freydis', role: 'Adoptive sister', look: { scale: 0.66, child: true, female: true, hair: 0xb5562a, hairStyle: 'braids', tunic: 0x4f6a7a, trim: 0xe0c070 } },
});

Object.assign(QUESTS, {
  q_hearth: {
    title: "A Stranger's Hearth", kind: 'main', xp: 120, next: 'q_wings',
    desc: 'Bjornstead, half a day\'s walk south along the coast: twenty houses, a harbour, fields down to the sea. Three days of fever. Strangers who did not have to carry you home.',
    steps: [
      { id: 'wake', text: 'Wake', type: 'event', key: 'woke3' },
      { id: 'signe', text: 'Speak with the woman at the fire', type: 'talk', key: 'signe', marker: { npc: 'signe' } },
      { id: 'freydis', text: 'Forty days later: Freydis is at you again', type: 'talk', key: 'freydis', marker: { npc: 'freydis' } },
      { id: 'hide', text: "That night: bury your father's axe under the hearthstone", type: 'event', key: 'hidAxe', marker: { dyn: 'ch3door' } },
      { id: 'nest', text: 'Spring: follow Freydis to the fallen pine', type: 'reach', key: 'nest', marker: { npc: 'freydis' } },
      { id: 'name', text: 'The ravens', type: 'event', key: 'namedRavens' },
      { id: 'grubs', text: 'Turn over rotten logs for grubs', type: 'event', key: 'grub', count: 3, marker: { dyn: 'ch3nest' } },
      { id: 'feed', text: 'Feed the chicks', type: 'event', key: 'fedChicks', marker: { dyn: 'ch3nest' } },
      { id: 'hrefna', text: 'Show the white chick to Old Hrefna', type: 'talk', key: 'hrefna', marker: { npc: 'hrefna' } },
      { id: 'bjorn', text: 'Speak with Bjorn', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
      { id: 'chop', text: "Split logs at Bjorn's block", type: 'activity', key: 'chop', count: 4, marker: { dyn: 'ch3chop' } },
      { id: 'bjorn2', text: 'Speak with Bjorn', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
    ],
  },
  q_wings: {
    title: 'First Flight', kind: 'main', xp: 150, next: null,
    desc: 'Spring. The ravens grew faster than he did.',
    steps: [
      { id: 'bones', text: 'Autumn: Old Hrefna will cast her rune-bones for the children', type: 'talk', key: 'hrefna', marker: { npc: 'hrefna' } },
      { id: 'wake', text: 'Spring', type: 'event', key: 'woke4' },
      { id: 'storm', text: 'A storm off the sea: get to the old birch on the hill', type: 'reach', key: 'birch', marker: { dyn: 'ch3birch' } },
      { id: 'climb', text: 'Climb to the ravens', type: 'event', key: 'lightning', marker: { dyn: 'ch3birch' } },
      { id: 'freydis', text: 'Find out what Freydis is shouting about', type: 'talk', key: 'freydis', marker: { npc: 'freydis' } },
      { id: 'eye', text: 'Send the white raven up', type: 'event', key: 'ravenEye' },
      { id: 'spot', text: 'Find the lost lamb from the air and mark it', type: 'event', key: 'lambSpotted' },
      { id: 'fetch', text: 'Go and fetch the lamb', type: 'event', key: 'lambFound', marker: { dyn: 'ch3lamb' } },
      { id: 'home', text: 'Bring the lamb back to Freydis', type: 'talk', key: 'freydis', marker: { npc: 'freydis' } },
      { id: 'dusk', text: 'Join Bjorn and Signe at the fire', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
      { id: 'spar', text: 'Early summer: the stick and the little shield with Bjorn', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
      { id: 'guard', text: 'Raise the little shield', type: 'event', key: 'stormguard' },
      { id: 'named', text: 'Hear what Old Hrefna calls it', type: 'talk', key: 'hrefna', marker: { npc: 'hrefna' } },
    ],
  },
  s_omens: {
    title: 'Things That Wait', kind: 'side', xp: 60,
    desc: 'There are old things around Bjornstead that nobody will explain. A boy cannot move them. A man might.',
    steps: [{ id: 'find', text: 'Find the old things around Bjornstead', type: 'event', key: 'omen', count: 5 }],
  },
});

const E = 'Eirik', S = 'Signe', F = 'Freydis', B = 'Bjorn', H = 'Old Hrefna', N = (t) => ({ s: '', t });
Object.assign(DIALOGUE, {
  signe_wake: [
    { s: S, t: 'Easy. You are in Bjornstead. Bjorn found you under a spruce on the ridge and carried you home in his cloak, axe and all.' },
    N('She had scrubbed him in a tub three times. The water was black after the first scrub, brown after the second, and only grey after the third. She had burned his clothes and combed the lice out of his hair, humming.'),
    { s: S, t: 'I am Signe. Who are you, and whose boy?' },
    N('Eirik said nothing.'),
    { s: F, t: 'Is he staying?' },
    { s: S, t: 'He is staying.' },
    { s: F, t: 'Does he talk?' },
    { s: S, t: 'Not yet.' },
    { s: F, t: 'Good. Then I will talk for both of us.' },
  ],
  signe_idle: [{ s: S, t: 'You have colour in your face again. Go on. Nobody ever got strong sitting by my fire.' }],
  freydis_meet: [
    N('Eirik did not speak for forty days.'),
    { s: F, t: 'You look like a drowned owl. I have told you a hundred times. A drowned owl.' },
    { s: E, t: 'You look like a goat.' },
    { s: F, t: 'He talks! He insulted me! MOTHER! He TALKS!' },
  ],
  freydis_idle: [{ s: F, t: 'I am not allowed to ask where you came from. So I am not asking. But I am thinking it very loudly.' }],
  nest: [
    { s: F, t: 'See? One dead. Two alive. One is black. And the other one...' },
    N('The other was white as frost, with pale grey eyes.'),
    { s: F, t: 'A white raven. We have to show Old Hrefna.' },
    { s: E, t: 'They will die out here. I am taking them home.' },
    { s: E, t: 'The white one is Mjöll. Fresh snow. The black one is Sót.' },
    { s: F, t: 'Snow and soot. They are hungry. Ravens eat grubs, and there are rotten logs all round here. Turn them over.' },
  ],
  hrefna_ravens: [
    N('Old Hrefna lived in a hut that smelled of goat, smoke and something dead in a pot. She looked at the white chick for a long time.'),
    { s: H, t: 'Odin had two ravens. Thought and Memory. They flew over the world every day and told him all they saw.' },
    { s: H, t: 'This one will see a great deal. Feed her well.' },
    N('Feeding baby ravens turned out to be disgusting. Freydis refused after the first day. Eirik did it for two months. Sót bit him every single day. Mjöll sat on his shoulder and pulled gently at his hair.'),
  ],
  hrefna_idle: [{ s: H, t: 'Goat, smoke and something in a pot. Do not ask what. Sit, or go.' }],
  hrefna_bones: [
    N('By late summer the ravens could fly. Everyone expected them to leave. They did not. They roosted in the old birch on the hill, and came down when he whistled.'),
    N('That autumn Old Hrefna cast her rune-bones on a calfskin for the children, as a game. She was quiet for a long time. Then she said strange things, half to herself.'),
    { s: H, t: 'A yew that sings in a storm. A sword that sings over graves. A winter tooth. Two brothers. A star that falls and is beaten into a hammer.' },
    { s: F, t: 'What does it mean?' },
    N('She swept up the bones and would not say.'),
    { s: F, t: 'She is making it up.' },
    N('Eirik was not so sure.'),
  ],
  bjorn_stick: [
    { s: B, t: 'Every boy in Bjornstead learns the stick and the little shield. Today it is your turn. Shield up.' },
    { s: B, t: 'Watch my stick, not my face. And keep your feet.' },
  ],
  hrefna_storm: [
    N('Bjorn stared at him for a long time. Then he went and fetched Old Hrefna. She listened, nodded and named it.'),
    { s: H, t: 'Stormguard. The sky put a little of itself in you. It will guard you when death comes close, and only then, and only if you keep your head.' },
    { s: H, t: 'It will cost you every time.' },
    { s: H, t: 'And it will not guard anyone else. Remember that. Gifts from the sky draw eyes from the earth. Tell no one.' },
    N('They told no one. In Bjornstead, people said the Bjornsson boy had been touched by Thor and had a funny eye, and that his pet ravens were a bit odd, and left it at that.'),
  ],
  bjorn_wood: [
    { s: B, t: 'On your feet, then. Good. In this house everyone who eats, works.' },
    { s: B, t: 'There is the block. Four logs. Show me what a fever leaves of a boy.' },
  ],
  bjorn_axe: [
    { s: B, t: 'Hm. You have split wood before. Somebody taught you to let the weight do it.' },
    { s: B, t: 'Good. Stack it. In this house everyone who eats, works.' },
  ],
  bjorn_idle: [{ s: B, t: 'Fence wants mending. Fence always wants mending. That is what a farm is, {n}: a fence that wants mending.' }],
  freydis_lamb: [
    { s: F, t: "{n}! Flekka's lamb is gone. The gate was open. I did NOT leave the gate open." },
    { s: F, t: 'Send {w} up. She sees everything, and you always know what she sees. You get that look.' },
  ],
  freydis_thanks: [
    { s: F, t: 'You found her! {b} did not help at all. He just sat on your head.' },
    { s: E, t: 'He was guarding me. That is his work. Hers is the looking.' },
    { s: F, t: 'Father wants you at the fire. He has his serious face on. It is the same as his other face, but longer.' },
  ],
  bjorn_dusk: [
    { s: B, t: 'The lamb. The wood. The fence. You have earned your winter, and the next.' },
    { s: S, t: 'He is telling you that you may stay. He does not have the words for it.' },
    { s: B, t: 'Stay. Learn the farm. Let the rest go, if you can.' },
    { s: E, t: 'I will stay. This is home now.' },
    { s: S, t: 'Then it is. It has been since Bjorn came over the ridge with you. Come in, then. Both of you. All of you. Yes, {w}, the birds as well.' },
  ],
  sec_barrow: [
    { s: 'The Barrow', t: 'A hilt, black with age, stands out of the stones on top of the mound. You pull until your arms shake. It does not move. Not for a boy.' },
    { s: E, t: 'Somebody is buried with a sword in his hand. One day I will be strong enough to ask him for it.' },
  ],
  sec_skyiron: [
    { s: 'Sky-Iron', t: 'The stone Bjorn props the barn door with is black, pitted, and far too heavy for its size. Snow will not settle on it.' },
    { s: 'Sky-Iron', t: 'It fell burning the year Freydis was born, he says. No smith in the dale could make it take a shape. "Not yet," he says, and laughs.' },
  ],
  sec_twinaxe: [
    { s: 'The Twin-Axe Stone', t: "Two axes, crossed, cut deep into the stone. Beneath them an island shaped like a raven's wing, and a single star." },
    { s: E, t: 'It is a map. To somewhere across the sea. Two axes. Two brothers?' },
  ],
  sec_yew: [
    { s: 'The Split Birch', t: 'The lightning cut the old birch down the middle like a log under an axe. It should be dead. Both halves are in bud.' },
    { s: 'Old Hrefna', t: 'The sky put a little of itself in the boy. It put more in the tree. Something will grow up through that stump one day. A yew that sings in a storm.' },
  ],
  lightning_wake: [
    { s: '{w}', t: 'Warm. Boy. Wake.' },
    { s: 'Eirik', t: 'It was not a voice exactly. A feeling of feathers and wind, and a thought that was not mine.' },
    { s: 'Signe', t: 'Three days of fever. Old Hrefna packed that eye with honey and moss. It will see. The mark will stay.' },
  ],
  sec_icespear: [
    { s: 'The Spear in the Ice', t: "From above, {w} shows you what no one on the ground could see: a long straight shadow under the tarn's ice. A spear, standing upright, as if thrown down from the sky." },
    { s: E, t: 'Bjorn says that ice has never melted. Not in living memory.' },
  ],
  tarn_ground: [{ s: 'The Tarn', t: 'Old ice, grey and deep. Something dark lies under it, but from here it is only a smear. You would need to see it from above.' }],
});

Object.assign(HINTS, {
  grubs: 'Press {interact} at the rotten logs around the fallen pine.',
  farmchop: "Press {interact} at Bjorn's chopping block.",
  hideaxe: 'When the house is asleep, press {interact} at the door of the longhouse.',
  stick: 'Bjorn feints high. Raise the little shield with {block} when the blow comes.',
  explore: 'There are old things around Bjornstead. Wander: the mound to the north-east, the barn door, the stone in the north meadow, the tarn in the woods to the north-west.',
  raven: "Press {raven} to see through the white raven's eyes. {forward} faster, {back} slower, {left}{right} or the mouse to turn, {dodge} to climb, {crouch} to dive. Press {interact} to mark what she sees, {raven} to come back.",
  ravenfree: 'Press {raven} at any time to send the white raven up. From the air she can find things you would never see from the ground.',
});
