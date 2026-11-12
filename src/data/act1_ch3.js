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
  freydis: { name: 'Freydis', role: 'Adoptive sister', look: { scale: 0.66, child: true, female: true, hair: 0xb5562a, hairStyle: 'braids', tunic: 0x4f6a7a, trim: 0xe0c070 } },
});

Object.assign(QUESTS, {
  q_hearth: {
    title: "A Stranger's Hearth", kind: 'main', xp: 120, next: 'q_wings',
    desc: 'A farm in a hidden dale, east of the river. Three days of fever. Strangers who did not have to carry you home.',
    steps: [
      { id: 'wake', text: 'Wake', type: 'event', key: 'woke3' },
      { id: 'signe', text: 'Speak with the woman at the fire', type: 'talk', key: 'signe', marker: { npc: 'signe' } },
      { id: 'freydis', text: 'Let the girl get a look at you', type: 'talk', key: 'freydis', marker: { npc: 'freydis' } },
      { id: 'nest', text: 'Follow Freydis to the fallen pine', type: 'reach', key: 'nest', marker: { npc: 'freydis' } },
      { id: 'name', text: 'Decide what to do about the ravens', type: 'event', key: 'namedRavens' },
      { id: 'grubs', text: 'Turn over rotten logs for grubs', type: 'event', key: 'grub', count: 3, marker: { poi: 'nest' } },
      { id: 'feed', text: 'Feed the chicks', type: 'event', key: 'fedChicks', marker: { poi: 'nest' } },
      { id: 'bjorn', text: 'Speak with Bjorn', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
      { id: 'chop', text: "Split logs at Bjorn's block", type: 'activity', key: 'chop', count: 4, marker: { poi: 'farmChop' } },
      { id: 'bjorn2', text: 'Speak with Bjorn', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
      { id: 'hide', text: "Hide your father's axe under the hearthstone", type: 'event', key: 'hidAxe', marker: { poi: 'farmDoor' } },
    ],
  },
  q_wings: {
    title: 'First Flight', kind: 'main', xp: 150, next: null,
    desc: 'Spring. The ravens grew faster than he did.',
    steps: [
      { id: 'wake', text: 'Spring', type: 'event', key: 'woke4' },
      { id: 'storm', text: 'A storm off the sea: get to the old birch on the hill', type: 'reach', key: 'birch', marker: { poi: 'yew' } },
      { id: 'climb', text: 'Climb to the ravens', type: 'event', key: 'lightning', marker: { poi: 'yew' } },
      { id: 'freydis', text: 'Find out what Freydis is shouting about', type: 'talk', key: 'freydis', marker: { npc: 'freydis' } },
      { id: 'eye', text: 'Send the white raven up', type: 'event', key: 'ravenEye' },
      { id: 'spot', text: 'Find the lost lamb from the air and mark it', type: 'event', key: 'lambSpotted' },
      { id: 'fetch', text: 'Go and fetch the lamb', type: 'event', key: 'lambFound', marker: { poi: 'lamb' } },
      { id: 'home', text: 'Bring the lamb back to Freydis', type: 'talk', key: 'freydis', marker: { npc: 'freydis' } },
      { id: 'dusk', text: 'Join Bjorn and Signe at the fire', type: 'talk', key: 'bjorn', marker: { npc: 'bjorn' } },
    ],
  },
  s_omens: {
    title: 'Things That Wait', kind: 'side', xp: 60,
    desc: 'There are old things around Bjornstead that nobody will explain. A boy cannot move them. A man might.',
    steps: [{ id: 'find', text: 'Find the old things around Bjornstead', type: 'event', key: 'omen', count: 5 }],
  },
});

const E = 'Eirik', S = 'Signe', F = 'Freydis', B = 'Bjorn';
Object.assign(DIALOGUE, {
  signe_wake: [
    { s: S, t: 'Easy. Three days you have had the fever. Drink.' },
    { s: S, t: 'Bjorn carried you over the ridge on his back. You would not let go of that axe, even asleep.' },
    { s: S, t: 'I am Signe. The loud one hiding behind the woodpile is Freydis. Now. Who are you, and whose boy?' },
    { s: E, t: '', choices: [
      { t: '"Eirik. Ragnar\'s son, of Hrafnvik."', to: 'a', fx: { flag: 'toldName', rel: { signe: 2 }, trait: { compassion: 1 } } },
      { t: '"Eirik. That is all there is."', to: 'b', fx: { flag: 'halfName', trait: { wisdom: 1 } } },
      { t: '"Orm. I am nobody\'s."', to: 'c', fx: { flag: 'liedName', trait: { pride: 1 }, state: { alias: 'Orm' } } },
    ] },
    { id: 'a', s: S, t: 'Hrafnvik. We saw the smoke. Then you are the only one who walked out of it. That name stays inside this fence, Eirik. Do you understand me?', to: 'z' },
    { id: 'b', s: S, t: 'A careful boy. Good. Careful boys live. Eirik it is.', to: 'z' },
    { id: 'c', s: S, t: 'Orm. Hm. You say it like a word you just found on the ground. Keep it, if it keeps you safe.', to: 'z' },
    { id: 'z', s: S, t: 'Eat. Then, if your legs will hold you, go and let Freydis look at you before she bursts.' },
  ],
  signe_idle: [{ s: S, t: 'You have colour in your face again, {n}. Go on. Nobody ever got strong sitting by my fire.' }],
  freydis_meet: [
    { s: F, t: 'You are the snow boy! Father says you were dead and then you were not.' },
    { s: F, t: 'Can you walk? Come ON. The storm brought down the raven pine and there is a nest and they are ALIVE and one of them is the wrong colour.' },
  ],
  freydis_idle: [{ s: F, t: 'I am not allowed to ask where you came from. So I am not asking. But I am thinking it very loudly.' }],
  nest: [
    { s: F, t: 'See? Two. The black one bites. The white one just looks at you.' },
    { s: F, t: "Father says a white raven is Odin's own, or else it is a curse, and either way not to touch it." },
    { s: E, t: 'They will die out here. I am taking them.' },
    { s: F, t: 'Then they need names. You are carrying them. You name them.' },
    { s: E, t: '', choices: [
      { t: '"Mjöll for the white. Sót for the black. Snow and soot."', to: 'a', fx: { state: { ravenNames: ['Mjöll', 'Sót'] }, trait: { compassion: 1 } } },
      { t: '"Muninn and Huginn."', to: 'b', fx: { state: { ravenNames: ['Muninn', 'Huginn'] }, trait: { pride: 1 } } },
      { t: '"Dag and Nótt. Day and night."', to: 'c', fx: { state: { ravenNames: ['Dag', 'Nótt'] }, trait: { wisdom: 1 } } },
    ] },
    { id: 'a', s: F, t: 'Snow and soot. That is exactly what they look like.', to: 'z' },
    { id: 'b', s: F, t: "You cannot name them after ODIN'S. ...Can you? Oh. You did.", to: 'z' },
    { id: 'c', s: F, t: 'Day and night. They are brother and sister, you know. Same nest, same egg-day.', to: 'z' },
    { id: 'z', s: F, t: '{w} and {b}. They are hungry. Ravens eat grubs, and there are rotten logs all round here. Turn them over.' },
  ],
  bjorn_wood: [
    { s: B, t: 'On your feet, then. Good. In this house everyone who eats, works.' },
    { s: B, t: 'There is the block. Four logs. Show me what a fever leaves of a boy.' },
  ],
  bjorn_axe: [
    { s: B, t: 'Hm. You have split wood before. Somebody taught you to let the weight do it.' },
    { s: B, t: 'And I have seen that axe. Not one like it. That one.' },
    { s: E, t: '', choices: [
      { t: '"It was my father\'s."', to: 'a', fx: { flag: 'axeTruth', rel: { bjorn: 2 }, trait: { compassion: 1 } } },
      { t: '"I found it."', to: 'b', fx: { flag: 'axeLie', trait: { pride: 1 } } },
      { t: 'Say nothing.', to: 'c', fx: { flag: 'axeSilence', trait: { wisdom: 1 } } },
    ] },
    { id: 'a', s: B, t: 'I know whose it was. I stood in a shield-wall beside him once, before either of us had sense. He was the better man.', to: 'z' },
    { id: 'b', s: B, t: "Then you found a dead man's whole life. Be worthy of the finding.", to: 'z' },
    { id: 'c', s: B, t: 'Good. Say nothing. Say it to everyone.', to: 'z' },
    { id: 'z', s: B, t: 'Men came up the valley asking after a boy with an axe. They will come again.' },
    { s: B, t: 'The hearthstone is loose. Put it under, and do not take it out until you are tall enough to deserve it.' },
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
    { s: S, t: 'He is telling you that you may stay, {n}. He does not have the words for it.' },
    { s: B, t: 'Stay. Learn the farm. Let the rest go, if you can.' },
    { s: E, t: '', choices: [
      { t: '"I will stay. This is home now."', to: 'a', fx: { flag: 'vowHome', trait: { compassion: 1 } } },
      { t: '"I will stay. But I will not forget."', to: 'b', fx: { flag: 'vowRemember', trait: { ferocity: 1 } } },
      { t: '"Teach me everything. All of it."', to: 'c', fx: { flag: 'vowLearn', trait: { wisdom: 1 } } },
    ] },
    { id: 'a', s: S, t: 'Then it is. It has been since Bjorn came over the ridge with you.', to: 'z' },
    { id: 'b', s: B, t: 'No. I did not think you would. Just do not let it be the only thing you are.', to: 'z' },
    { id: 'c', s: B, t: 'All of it is mostly dung and weather. But yes. All of it.', to: 'z' },
    { id: 'z', s: S, t: 'Come in, then. Both of you. All of you. Yes, {w}, the birds as well.' },
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
    { s: 'Old Hrefna', t: 'Gifts from the sky draw eyes from the earth. Tell no one.' },
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
  hideaxe: 'Press {interact} at the door of the longhouse.',
  explore: 'There are old things around Bjornstead. Wander: the mound to the north-east, the split tree, the barn door, the stone in the north meadow.',
  raven: "Press {raven} to see through the white raven's eyes. {forward} faster, {back} slower, {left}{right} or the mouse to turn, {dodge} to climb, {crouch} to dive. Press {interact} to mark what she sees, {raven} to come back.",
  ravenfree: 'Press {raven} at any time to send the white raven up. From the air she can find things you would never see from the ground.',
});
