// What art to make, and with which model (tools/art.mjs reads this). Who people are and what they carry is from the
// owner's story (docs/story); hair, beard and the colours of their clothes follow the figures already in the game
// (the casts in src/data), so a portrait and the figure it stands for agree.

// ---- the house style -----------------------------------------------------------------------------------------
// (A model paints what it reads: naming a thing in order to forbid it puts it in the picture. Say only what is wanted.)
const AGE = 'Viking Age western Norway, 9th century, historically grounded: wool, linen, leather and fur, plain iron';
const PLACE = 'Viking Age western Norway, 9th century: turf-roofed timber longhouses, clinker-built longships with one square sail, people bare-headed or in plain round iron caps, wool cloaks and tunics';
const PAINT = 'Hand-painted illustration in gouache and oil with visible brushwork, muted earth palette, soft overcast northern light';
const CLEAN = 'no text, no lettering, no watermark, no border, no frame';

// One model for everything: Z-Image Turbo. A pilot on 13 Nov 2026 tried the same portrait, axe, scene and planks on
// Z-Image Turbo, Qwen Image 3 and Recraft V4.1: Z-Image gave the most even period look and is the cheapest ($0.015 a
// picture at 1k or 2k). Qwen drew modern haircuts; Recraft painted heavier and less alike from one picture to the next.
const Z = 'z-image/turbo';
const z = (prompt, aspect_ratio = '1:1', resolution = '1k') => ({ model: Z, request: { prompt, resolution, aspect_ratio, prompt_extend: false } });

const portrait = (who) => `Bust portrait of ${who}. Head and shoulders, three-quarter view, looking a little past the viewer, plain dark warm-brown background. ${PAINT}. ${AGE}. ${CLEAN}.`;
const item = (what) => `${what}. A painted still life of this one thing alone, centred, lying on a plain dark brown ground with a soft shadow, nothing else in the picture. ${PAINT}. ${CLEAN}.`;
const scene = (what) => `${what} Wide cinematic composition. ${PAINT}. ${PLACE}. ${CLEAN}.`;
const texture = (what) => `Seamless tileable texture of ${what}, seen flat from straight on, evenly lit with no shadows and no perspective, filling the whole frame edge to edge. Hand-painted stylised game texture, muted earth palette. ${CLEAN}.`;

const LEIF = 'a lean young Norse ship captain of about twenty-two with short golden hair, a short gold beard, a small gold ring in one ear and a quick crooked grin, in a sea-blue wool tunic with a yellow-ochre trim';
const EIRIK = 'a quiet, broad-shouldered Norse farmer of about twenty-two with shoulder-length dark blond hair, a short beard, steady grey eyes, and a pale forked scar like lightning running through his left eyebrow and down to the cheekbone, in a plain green wool tunic';
const ASTRID = 'a silent, watchful Norse huntress of about twenty with black hair in a single braid, grey-green eyes and a weathered face, in a dark moss-green wool tunic, a yew bow over her shoulder';

// ---- people: who speaks in the game -------------------------------------------------------------------------------
// id: [who they are in words]. The id is what the game looks a speaker up by (src/ui/art.js).
const PEOPLE = {
  // Eirik at three ages
  eirik_child: 'a serious nine-year-old Norse farm boy, a small child with a smooth beardless face, tousled dark blond hair and grey eyes, in a plain green wool tunic',
  eirik: EIRIK,
  eirik_king: 'a broad-shouldered Norse king of forty-one with long dark blond hair greying at the temples, a full greying beard, calm grey-blue eyes, and a pale forked scar like lightning through his left eyebrow down to the cheekbone, a dark slate-blue wool cloak pinned at the shoulder over a moss-green tunic with a gold-ochre trim',
  // family and home
  ragnar: 'a tall, strong Norse farmer of about thirty-five who was once a king\'s guardsman, with long dark-gold hair tied back, a short beard and kind tired eyes, in a slate-blue wool tunic with an ochre trim',
  ylva: 'a Norse farm wife of about thirty with auburn-red hair in one long braid, a calm proud face and green eyes, in a sage-green wool dress with a yellow trim',
  bjorn: 'a very big, broad, barrel-chested Norse farmer of about fifty, a giant of a man, with a thick mane of long grey hair, a long grey beard and laughing eyes, in a brown wool tunic with a dark fur collar',
  signe: 'a sharp-eyed, capable Norse housewife of about forty-five with pale ash-blonde hair in a braid, in a rust-red wool dress with a cream trim',
  freydis: 'a wry, quick Norse woman of about twenty-four with copper-red hair in a braid and freckles, one eyebrow raised, in a slate-blue wool dress with a yellow trim',
  hrefna: 'a very old Norse herb-woman and seeress with white hair in a bun, a deeply lined face and bright knowing eyes, a dark grey-brown shawl, small bones and dried herbs on a cord round her neck',
  hrolf: 'an old Norse skald with long grey-white hair and a long beard, a storyteller\'s lively eyes, in a faded purple-grey tunic and a dark cloak',
  gunnar: 'a dignified Norse village elder of about sixty with long grey hair and a short grey beard, in a dark red tunic and a blue-grey cloak with a gold brooch',
  thyra: 'a cheerful nine-year-old Norse girl with blonde braids and a gap-toothed smile, in a rust-red wool dress',
  hauk: 'a sturdy, plain-spoken Norse farmer of about forty with brown hair and a short beard, in a tan wool tunic',
  grjotgard: 'a bald, heavy Norse farmer of about fifty with a long dark beard and a scowl, in a grey-green wool tunic',
  halvar: 'a strong young Norse smith of about twenty-five with short brown hair and a short beard, soot on his cheek, in a grey-brown tunic and a leather apron',
  ari: 'an eager Norse boy of sixteen with short brown hair and a beardless face, in a tan wool tunic',
  gisli: 'a slight young Norse sailor of seventeen with short sandy hair and a beardless, sunburnt face, in a grey-green tunic',
  liv: 'a fierce seven-year-old Norse girl with brown braids and blue eyes, chin up, in a sea-blue wool dress with a yellow trim',
  lbrokk: 'a sturdy seven-year-old Norse boy with short copper-red hair and freckles, in a grey-brown wool tunic',
  kari: 'a thin young Norse man of twenty with short black hair and wary grey-green eyes, in a grey-brown tunic',
  // the six companions
  leif: LEIF,
  astrid: ASTRID,
  brokk: 'a gruff old Norse blacksmith of about sixty, bald with a long grey-white beard and burn-scarred forearms, in a brown tunic and a scorched leather apron',
  torvald: 'a calm, weathered Norse veteran commander of about fifty-five with short grey hair and a short grey beard, a grey wool cloak over a dark tunic',
  svanhild: 'a tall, proud Norse swordswoman of about thirty with pale blonde hair in a braid and a thin scar through one eyebrow, in a dark blue-grey tunic with a pale trim, the hilt of a sword at her shoulder',
  ingrid: 'a calm, clever Norse princess and healer of about twenty with brown hair in a braid and steady brown eyes, in a blue-grey wool dress with a pale linen trim, the strap of a healer\'s satchel across her chest',
  // rulers and friends
  hroald: 'a hard, fair, tired Norse king of about sixty with long grey hair and a long grey beard, a dark red cloak with a gold brooch over a dark tunic, a plain iron circlet on his brow',
  arvid: 'a reckless Norse prince of nineteen with short brown hair and a beardless face, in a dark red tunic with a gold trim',
  eystein: 'a shrewd Norse merchant king of about fifty with short golden hair and a short beard, gold rings on his fingers, an ochre-gold tunic and a dark red cloak',
  ragnvald: 'an old Norse sea king with long white hair and a long white beard blown by the wind, a weathered sailor\'s face, mouth open mid-shout, in a deep sea-blue tunic and cloak',
  hallvard: 'a lean, thoughtful Norse king and lawspeaker of about sixty with long grey hair and a long grey beard, in a dark grey tunic and cloak with a gold trim',
  aslak: 'a broad Norse shipbuilder king of about forty-five with short red hair and a short red beard, in a green tunic and cloak',
  svein: 'a plain, sunburnt Norse farmer king of about forty with short brown hair and stubble, in a wheat-yellow tunic',
  jorund: 'a wary, thin-faced Norse jarl of about fifty-five with short grey-brown hair and stubble, narrowed eyes, in a dark blue-grey tunic and cloak',
  thora: 'a watchful Norse queen of about fifty with grey hair in a bun, in a dark moss-green dress and cloak with a pale gold trim',
  eyvind: 'a small, clever Norse prince of eleven with short brown hair, in a green tunic with a pale gold trim',
  gudmund: 'a nervous, practical Norse jarl of about forty-five with short brown hair and a short beard, in a brown tunic with a bronze trim',
  thrand: 'a very old, nearly blind Norse warrior with long white hair and a long white beard, pale milky eyes, in a worn grey-brown tunic',
  wulfstan: 'a careful, polite Anglo-Saxon reeve of about forty with short grey-brown hair and stubble, in a blue tunic and a wine-red cloak with a pale trim',
  gest: 'a very old Norse councillor with long white hair and a long white beard, in a grey-green tunic',
  // the enemy
  hakon: 'a powerful, cold-eyed Norse jarl of about fifty-eight with long black hair streaked with grey and a short black beard, a plain iron helmet with a nose guard, black wool and a grey wolf-fur collar over mail',
  sigurd: 'a rich, soft-handed Norse jarl of about fifty with short grey hair and a neat short beard, a faint smile, a dark tunic with a pale silver trim and a fur collar',
  vigdis: 'a small, wiry Norse woman fighter of about thirty with grey eyes and cropped dark hair, a still expressionless face, in dark close-fitting wool and leather',
  gorm: 'a huge, thick-necked Norse warrior of about forty with a shaved head and a short beard, a blank patient face, in heavy layered mail',
  arne: 'a lean, patient Norse archer of about forty with a hunter\'s squint and dark hair tied back, in a hooded dark cloak, a war bow over his shoulder',
  rurik: 'an upright, honourable-looking Norse warrior of about forty with a trimmed brown beard, a plain iron helmet, a mail shirt and a red cloak',
  skarde: 'a wild-eyed, snarling Norse man of about thirty-five, a berserker with a long matted brown beard and a scarred human face; on top of his head sits a helm made of bleached bone, the upper jaw and cranium of a bear, his own face clearly seen beneath it; a brown bearskin over his shoulders',
  eydis: 'a sly Norse woman of about thirty-five with mud-streaked cheeks, lank dark-blonde hair and a thin smile, in marsh-green and brown wool',
  bersi: 'an enormous Norse champion with a thick black beard and a soot-blackened face, a black leather smith\'s apron over mail',
  ulf: 'an arrogant, handsome Norse swordsman of about thirty with long fair hair and a short beard, in fine dark blue wool with a silver trim',
  kettil: 'a cruel, thin-faced Norse raider of about forty-five with short dark red hair and stubble, in black wool with a dark red trim',
  // smaller parts (the ids of the lawspeakers and the traders are given to their names in src/ui/art.js)
  lawman: 'a Norse village lawspeaker of about seventy with a full head of long white-grey hair and a long beard, grave and patient, in a faded purple-grey tunic and a dark cloak with a gold-ochre trim',
  klaw: 'the lawspeaker of a Norse market town, about sixty, with a full head of long grey hair and a short grey beard, tired shrewd eyes, in a blue-grey tunic and a red-brown cloak with a gold-ochre trim',
  orm: 'a very fat, bald Norse harbour reeve of about fifty with a short brown beard, small greedy eyes and a heavy jaw, in a dark red tunic and a purple-grey cloak with a gold-ochre trim',
  sailor: 'a drunk Norse sailor of about forty-five with shaggy brown hair, a long tangled brown beard, a red nose and a wide foolish grin, in a salt-stained blue-grey tunic',
  grim: 'a ragged Norse peddler of about forty with thick dark brown hair to his collar, a short beard and a friendly smile that does not reach his eyes, in a yellow-brown tunic and a worn brown cloak',
  grimolf: 'a ragged, hard-faced Norse peddler of about thirty-five with long dark brown hair tied back in a tail, and stubble, watchful narrow eyes, in a brown tunic and a worn grey-brown cloak',
  kolbrand: 'a broad old Norse village blacksmith of about sixty, bald with a long grey beard and a kind sooty face, in a brown tunic and a leather apron',
  odd: 'a quiet Norse fisherman of about forty with thick brown hair and a short beard, a weathered face, in a grey-olive tunic with a blue trim',
  asa: 'a Norse weaver woman of about forty with dark brown hair in a bun and quick clever eyes, in a purple-grey wool dress',
  ironmonger: 'a burly bald Norse iron-seller of about fifty with a short brown beard, in a brown tunic',
  salter: 'a shrewd grey-haired Norse woman of about fifty-five who sells salt, her hair in a bun, in a blue-grey wool dress',
  factor: 'a neat Norse grain merchant of about forty-five with combed dark-gold hair and a short beard, in a wheat-yellow tunic and a brown cloak',
  jtrader: 'a strong Norse blacksmith of about forty with dark brown hair, a short dark beard and soot on his brow, in a brown tunic',
};
/** Not people, but they speak or are spoken of with a picture of their own: the two ravens, and what Act I hides in the valley. */
const OTHERS = {
  raven_white: 'A pure white raven perched on a mossy branch, bright dark eyes, head tilted with gentle curiosity',
  raven_black: 'A big glossy black raven perched on a weathered post, wings half raised, beak open in a bad-tempered croak',
  raven_stone: 'A tall weathered standing stone in a forest clearing, carved with a raven and a band of runes, moss at its foot',
  twin_axe_stone: 'A grey standing stone on a hillside carved with two bearded axes side by side, lichen on its face',
  barrow: 'An ancient grass-covered burial mound with a low dark stone doorway, under bare birch trees in mist',
  split_birch: 'A great old birch tree split down its trunk by lightning, one half scorched black, a young yew sapling growing up through the split',
  spear_ice: 'An old iron spear frozen upright in the ice of a small dark mountain lake, snow on the shore',
  tarn: 'A small still dark mountain lake among snowy rocks and pines, the sky reflected in black water',
  sky_iron: 'A fist-sized lump of black pitted meteorite iron with a dull metallic sheen lying on a bed of moss',
};
const others = Object.entries(OTHERS).map(([id, what]) => ({ id: 'portrait_' + id, group: 'cast', kind: 'portrait', ...z(`${what}. Close view, plain soft-focus natural background. ${PAINT}. ${CLEAN}.`, '3:4'), post: ['cover', 384, 480], out: `public/art/portraits/${id}.webp` }));
const people = Object.entries(PEOPLE).map(([id, who]) => ({ id: 'portrait_' + id, group: 'cast', kind: 'portrait', ...z(portrait(who), '3:4'), post: ['cover', 384, 480, 'top'], out: `public/art/portraits/${id}.webp` }));

// ---- things: what he carries (ids are the game's item ids) -----------------------------------------------------------
const THINGS = {
  father_axe: 'A Viking battle axe of the bearded kind found in Norse graves: a thin flat hand-forged iron blade with a narrow neck whose cutting edge sweeps far down below the socket into a long hooked beard, on a straight slender ash haft as long as a man\'s arm, worn smooth, a small raven scratched into the blade',
  bow: 'A short plain yew hunting bow, unstrung curve, with a linen bowstring',
  arrow: 'A small bundle of ash arrows with grey goose-feather fletching and iron heads, tied with a leather thong',
  woodsword: 'A child\'s practice sword carved from one piece of pale wood, nicked along its edge',
  shield: 'A round Norse shield of linden boards with a rawhide rim and a domed iron boss, painted plain dark red',
  flint: 'A small hand-sized iron fire-steel, a flat bar of iron bent into the shape of a letter C with curled ends, beside a flake of grey flint',
  mail: 'A folded shirt of riveted iron mail',
  wolf_brooch: 'A black iron cloak brooch in the shape of a snarling wolf\'s head',
  arm_ring: 'A plain twisted silver arm-ring',
  halfdan_ring: 'A heavy gold oath-ring the size of an arm-ring: a thick plain hoop of gold with a flat round boss stamped with a crowned raven over three waves',
  oath_ring: 'Two separate curved pieces of one broken gold arm-ring, like two letter C shapes facing each other with a clear gap between them, the broken ends rough',
  token: 'A small round silver token stamped with a cross and worn lettering',
  safe_letter: 'A folded parchment letter closed with a red wax seal',
  raven_cloth: 'A small square of undyed linen cloth embroidered with a black raven in thread',
  list: 'A strip of birch bark with a short list scratched on it in runes',
  net: 'A folded fishing net of tarred cord with cork floats',
  firewood: 'Three split logs of birch and pine',
  stick: 'A few dry sticks of kindling',
  bark: 'Curls of white birch bark',
  bough: 'A bundle of green spruce boughs',
  hide: 'A scraped deer hide, folded',
  hare: 'A brown hare lying on its side',
  venison: 'A haunch of venison wrapped in deer hide',
  fish: 'A silver-sided river trout',
  silver: 'A small heap of hack-silver: cut pieces of silver rings and a few coins',
  spear: 'A Norse spear with a long leaf-shaped iron head on an ash shaft',
  sword: 'A Viking sword with a broad straight double-edged blade, a short straight iron guard and a lobed pommel',
  seax: 'A long Norse seax: a single-edged knife with a straight edge and an angled broken back, a plain wooden grip',
  maul: 'A Norse war hammer with a square iron head on a long ash haft',
  longaxe: 'A long two-handed Dane axe with a broad thin crescent blade on a haft as tall as a man',
  throwaxe: 'A small light throwing axe with a short haft',
  // brother_axe (the Left Brother, the twin of Ragnar's axe) is his axe's painting turned the other way: see `mirrors` below
};
Object.assign(THINGS, {
  twin: 'Two long Norse seaxes laid crossed over each other: single-edged knives as long as a forearm with straight edges and angled backs, plain wooden grips',
  father_axe_1: 'A plain Norse axe with a wedge-shaped iron head on a pale ash haft, a small raven scratched into the cheek of the blade, and a bright new line of paler folded steel along its cutting edge',
  father_axe_2: 'A plain Norse axe with a wedge-shaped iron head on a pale ash haft, a small raven scratched into the cheek of the blade, the whole blade newly forged with a rippling watered pattern of folded steel and a keen pale edge',
  father_axe_3: 'A plain Norse axe with a wedge-shaped iron head on a pale ash haft, a small raven scratched into the cheek of the blade, the blade patterned with rippling folded steel and a dark blue-black strip of meteorite iron inlaid along its cutting edge, faintly glinting',
});
const things = Object.entries(THINGS).map(([id, what]) => ({ id: 'item_' + id, group: 'things', kind: 'item', ...z(item(what)), post: ['cover', 256, 256], out: `public/art/items/${id}.webp` }));

// ---- paintings: one for each act, and one for the title -----------------------------------------------------------------
const SCENES = {
  title: 'A broad-shouldered young Norse farmer with a bearded axe and a round shield stands on a cliff above a wide fjord at dawn, seen from behind, a white raven and a black raven wheeling over him, a single longship on the water far below, a great birch tree at the cliff\'s edge.',
  act1: 'Night, first snow falling. A very small nine-year-old boy, a little child with a smooth beardless face, stands at the edge of a dark pine forest clutching a bearded axe far too big for him, looking down at a small fjord village of turf-roofed longhouses in flames, three longships with striped sails on the shore below.',
  act2: 'Sunset over a coastal farming village of turf-roofed houses. A young farmer of nineteen stands in the yard before a longhouse holding a bearded axe he has just dug up, a barley field burning behind the houses, seven riders with wolf heads painted on their shields coming down the river road.',
  act3: 'Grey dawn on the beach of an iron-mining island. A line of farmers and fishermen crouch behind a trench and a row of sharpened stakes, round wooden shields raised over their heads as a rain of arrows falls on them, longships grounding in the surf beyond.',
  act4: 'Thick sea fog. Three lean longships with wolf-head prows come out of the fog toward a broad merchant ship low in the water with treasure chests lashed on her deck, her crew standing to the rail with shields.',
  act5: 'Deep winter on a frozen shore under a heavy grey sky. A great stranded whale lies on the ice, hungry villagers in wool cloaks small beside it with knives and sledges, behind them a village of low turf-roofed longhouses inside a log palisade, one white raven in the air.',
  act6: 'A windy headland above the sea. Nine rulers of nine islands, bare-headed kings, a queen and jarls in wool cloaks, stand close together in a tight circle, every one reaching in to lay a hand on one single gold arm-ring held at the centre of the circle, banners snapping behind them.',
  act7: 'Rain on dark water in early spring. A fleet of sixty longships rows toward a black volcanic shore, fire arrows arcing through the rain from the beach, and on the cliff above a huge low timber longhouse, a jarl\'s hall with a turf roof and carved gable beams, burning.',
  epilogue: 'A calm summer evening. A bare-headed man of forty in a slate-blue cloak and a small red-haired boy walk up a green hill toward a great old birch tree with two crowns, far below them a harbour town of turf-roofed timber longhouses with longships drawn up on the strand, a young raven with one white feather on a low branch.',
};
const scenes = Object.entries(SCENES).map(([id, what]) => ({ id: 'card_' + id, group: 'scenes', kind: 'card', ...z(scene(what), '16:9', '2k'), post: ['cover', 1600, 900], out: `public/art/cards/${id}.webp` }));

// ---- a painting for every chapter (keyed by the game's quest ids; what happens in each is the owner's story) ----------
// One line of setting shared by every scene put a longship and a village into all of them, halls and forests included,
// and "night" in the sentence was painted as day. So a chapter can say where it is and what light it is in:
// [what happens, where, light]. A plain string is a chapter whose first painting (shared setting) was kept.
const WHERE = {
  village: 'Viking Age Norway, 9th century: turf-roofed timber longhouses, people in wool tunics and cloaks',
  coast: 'Viking Age Norway, 9th century: turf-roofed timber longhouses by a fjord, clinker-built longships with one square sail, people in wool tunics and cloaks',
  sea: 'Viking Age, 9th century, far out on the open sea with water to the horizon on every side: clinker-built longships with one square sail, sailors in wool tunics and cloaks',
  wild: 'Viking Age Norway, 9th century: wild empty country of pine, birch, rock and water, far from any house',
  hall: 'Viking Age Norway, 9th century, indoors: the inside of a great timber hall with carved wooden posts, a long fire trench down the middle, smoke under dark rafters, benches and furs',
  room: 'Viking Age, 9th century, indoors: a small room with rough timber walls',
};
const LIGHT = { day: 'soft overcast northern daylight', dusk: 'dusk, a low red sun and long shadows', night: 'deep night, a black sky, darkness all round, lit only by flames', fog: 'thick grey sea fog', rain: 'heavy rain under dark clouds', fire: 'lit only by firelight, deep shadows', lamp: 'lit only by one small lamp, deep shadows' };
const sceneAt = (what, where, light) => `${what} Wide cinematic composition. Hand-painted illustration in gouache and oil with visible brushwork, muted earth palette, ${LIGHT[light]}. ${WHERE[where]}. ${CLEAN}.`;
const BOY = 'a small nine-year-old boy with tousled dark blond hair in a plain green tunic';
const MAN = 'a broad-shouldered young Norse farmer with shoulder-length dark blond hair, a short beard and a pale forked scar through his left eyebrow, in a green tunic';
const BJORN = 'a very big, broad grey-bearded farmer';
const JARL = 'a powerful black-haired jarl with a short black beard and a grey wolf-fur collar';
const CHAPTERS = {
  // Act I
  q_morning: `A late autumn morning in a small fjord village: frost on the turf roofs, smoke rising straight up, ${BOY} stepping out of a longhouse toward his mother, a woman with an auburn braid tending a cooking fire in the yard.`,
  q_wood: `${BOY} swings a wood axe down onto a chopping block beside a stack of split birch logs, his tall father with long dark-gold hair watching with folded arms, a turf-roofed longhouse behind them.`,
  q_hunt: [`${BOY} crouches in tall autumn grass at the edge of a birch wood drawing a small hunting bow, his father, a tall man with long dark-gold hair, kneeling close behind him and pointing at a red deer stag among the trees.`, 'wild', 'day'],
  q_fire: [`A hunting camp under a great old birch in the forest: a tall man with long dark-gold hair and ${BOY} kneel by a ring of stones, the boy striking sparks from a fire-steel into curls of birch bark, the first small flames rising.`, 'wild', 'dusk'],
  q_sword: [`In a yard behind a longhouse, ${BOY} holds a wooden practice sword in a guard stance facing his father, a tall man with long dark-gold hair in a slate-blue tunic, who holds another wooden sword lowered and smiles.`, 'village', 'day'],
  q_supper: `Evening, the first snowflakes in the air. A woman with an auburn braid stirs an iron pot over a cooking fire outside a turf-roofed longhouse while ${BOY} brings her two hares, warm light spilling from the door.`,
  q_ashes: [`Snow falling. Longships with striped sails on a fjord beach, raiders with torches and wolf-painted shields running among burning turf-roofed longhouses, a woman with an auburn braid pulling ${BOY} by the hand toward a gate in a log palisade.`, 'coast', 'night'],
  q_alone: [`A snowy pine forest. ${BOY}, alone, kneels by a tiny fire under a great old birch with a bearded axe far too big for him across his knees; far away between the trunks the sky glows orange.`, 'wild', 'night'],
  q_white: [`Deep winter. ${BOY} drags a bundle of spruce boughs through knee-deep snow toward a rough lean-to of branches built against a great birch, a grey wolf watching from between the pines.`, 'wild', 'day'],
  q_ice: [`${BOY} crawls flat on his belly across the cracking ice of a frozen river in a pine forest; behind him on the far bank, men with torches and a tracking dog come out of the trees.`, 'wild', 'night'],
  q_hearth: [`${BOY} sits wrapped in blankets on a bench by the fire, a very big grey-bearded farmer and a woman with an ash-blonde braid watching him kindly, a red-haired girl of eleven peering from behind a post.`, 'hall', 'fire'],
  q_wings: `A spring storm. ${BOY} climbs high in a great old birch on a hilltop toward a nest holding two young ravens, one white and one black, as a fork of lightning splits the dark sky just above the tree.`,
  // Act II
  q_ten: `A bright summer morning in a coastal village of twenty turf roofs: ${MAN} splits firewood in a yard, sheep by a stream, fishing boats drawn up on the strand, a white raven and a black raven on the woodpile, a goat chewing a boot.`,
  q_farm: `A harvest feast at dusk before a longhouse: long tables, a whole village eating and laughing round a great fire, ${BJORN} standing to raise a drinking horn.`,
  q_smoke: `A misty dawn. ${MAN} and ${BJORN} stand in a farmyard looking up at a road on the ridge where seven riders with wolf heads painted on their shields look down at the village, a white raven landing on the young man's arm.`,
  q_axe: `Sunset, a village yard in battle: ${MAN} with a bearded axe and a round shield fights raiders with wolf heads painted on their shields beside ${BJORN} swinging a great axe, a barn burning behind them.`,
  q_wolf: [`${JARL} sits in a high seat at the head of a long table with seven hard-faced champions, wolf pelts on the walls, a wounded red-haired raider kneeling on the floor before him.`, 'hall', 'fire'],
  q_peddlers: [`A village lane between two turf-roofed houses: a fishing net strung low across it has caught and tripped a running man with a knife, ${MAN} stepping out of a doorway with a torch, a white raven watching from the roof.`, 'village', 'night'],
  q_walls: `Late autumn. Villagers raise a palisade of sharpened logs round their village: men hauling timber with a horse, women digging a ditch, a half-built watchtower beside a great birch.`,
  q_captain: `A busy Norse market harbour. On the quay a lean grinning young captain with short golden hair and two blades at his belt argues with a very fat bald reeve in a dark red tunic; behind them lies a sleek longship with a carved raven on her prow.`,
  q_oath: `A night feast by firelight. ${BJORN} clasps a silver arm-ring onto the arm of ${MAN} before a whole cheering village, a longship with a raven prow drawn up on the strand behind them.`,
  // Act III
  q_isle: `A longship with a carved raven on her prow sails toward a rocky island of iron mines: smoke rising from smelting furnaces on the hills, a harbour town under a tall stone watchtower.`,
  q_fifty: `At a ring of standing stones under a great birch, ${MAN} speaks to a crowd of farmers and fishermen; some are stepping forward holding spears, wood axes and round shields.`,
  q_healer: [`A king's hall turned into a hospital: a calm young princess with a brown braid in a blue-grey dress washes her hands in a basin among wounded men lying on straw, ${MAN} standing in the doorway.`, 'hall', 'day'],
  q_shore: `Dawn battle on a grey beach: a shield wall of farmers and fishermen behind a trench and sharpened stakes meets mailed warriors leaping from longships in the surf, arrows in the air.`,
  q_long: `A granary burning beside a tall stone watchtower in a harbour town; at the top of the tower a lean archer in a dark hood draws a war bow, while ${MAN} climbs a fallen roof beam toward him through the smoke.`,
  q_ulf: [`On a harbour quay among burning boats, an arrogant fair-haired swordsman in dark blue holds a sword in each hand, facing ${MAN} who raises a bearded axe and a round shield.`, 'coast', 'day'],
  q_iron: `A feast in a king's hall: an old grey-bearded king in a dark red cloak opens a chest of gold before ${MAN}, who shakes his head and points instead to bars of iron stacked by the wall; warriors watch from the long tables.`,
  q_price: [`${JARL} rises in cold fury from his high seat above a fair-haired swordsman kneeling with his head bowed, wolf pelts on the walls, six silent champions standing in the shadows.`, 'hall', 'fire'],
  // Act IV
  q_gold: `Two ships at sea in fair weather: a broad merchant ship heavy with iron-bound chests, and beside her a lean longship with a carved raven on her prow, a boy of sixteen laughing in the spray at her bow.`,
  q_water: [`On the deck of a longship, ${MAN} with a bearded axe and a round shield duels a tall honourable warrior in a mail shirt and a red cloak with sword and shield, both crews fighting round the mast, a second ship lashed alongside.`, 'sea', 'fog'],
  q_court: `A busy Anglo-Saxon trading port at a river mouth: timber halls and a small stone church, Norse sailors unloading iron-bound chests onto the quay under the eye of a careful reeve in a blue tunic and a wine-red cloak.`,
  q_circle: [`Below the deck of a ship, ${MAN} and a calm grey-haired veteran lean over an open iron-bound chest full of sealed letters and silver.`, 'room', 'lamp'],
  q_six: [`Seen from behind, a huntress with a black braid clings to the top of a longship's mast high above the deck, staring out at six columns of smoke rising from six distant islands along the horizon.`, 'sea', 'day'],
  q_council: [`Six kings in fine cloaks argue across a long table, ${MAN} standing at its end and holding up a small silver token.`, 'hall', 'fire'],
  q_sound: `A night battle in a narrow sound between dark cliffs: longships burning and sinking, men in the water clinging to oars, a signal fire blazing on a headland.`,
  q_drift: `A grey dawn. A battered longship with a torn sail limps into a harbour where part of the palisade and several turf-roofed houses are burnt black, people waiting in silence on the pier.`,
  // Act V
  q_carry: `At a ring of standing stones, a divided, angry crowd of villagers; ${MAN} stands alone before them with his head bowed, a burnt watchtower behind.`,
  q_hunger: `Midwinter in a palisaded village deep in snow: thin villagers wait in a line at the door of a grain store while a young woman healer with a brown braid in a blue-grey dress hands out small bowls.`,
  q_taken: `Night. ${MAN} crawls through the mud of a tannery yard toward a camp of tents, torches and tethered dogs; a black raven perches on a post above him, and by a far fire a white raven sits in a wicker cage.`,
  q_ring: `A turf hut near the top of a sea cliff white with nesting gannets: a very old blind man with long white hair and beard turns a heavy gold ring in his fingers, ${MAN} kneeling before him.`,
  q_wing: [`A duelling ground marked out with hazel poles on a shore: ${MAN} with a bearded axe and a round shield faces a huge snarling man with a long matted beard, a helm of bleached bone on his head and a brown fur cloak, who swings a great two-handed axe; islanders watch.`, 'coast', 'day'],
  q_ribbon: `A log cell lit by one lamp: a grey-haired veteran sits chained on a bench with his head down, ${MAN} standing in the doorway holding an unsealed letter.`,
  q_feast: `A midsummer night feast in a rebuilt village: lanterns, dancing and long tables, an archery contest between a huntress with a black braid and a tall swordswoman with a blonde braid, the harbour beyond.`,
  // Act VI
  q_marsh: `A marsh island at dawn: houses on stilts over black water among tall reeds, a flat boat poled through the mist, a white raven flying low over the channels.`,
  q_lastforge: `A forge island of quarries and smoking furnaces: in a great smithy a bald old smith with a long white beard and a strong young smith work a glowing axe head together on an anvil.`,
  q_anvil: `Night in a burning quarry town: an enormous black-bearded man in a black leather apron hefts a giant war hammer before the doorway of a forge, and a bald old smith with a long white beard stands in the doorway with a forging hammer, barring his way.`,
  q_smith: `A funeral at dusk on a stony shore: a small boat laden with a smith's tools is pushed out onto the water and set alight, a silent crowd on the beach, ${MAN} holding the torch.`,
  q_judge: `At a ring of standing stones before a great crowd, a grey-haired veteran kneels and lays both hands on a gold arm-ring held out to him by ${MAN}, an old lawspeaker king with a long grey beard looking on.`,
  q_sigurd: [`A rich man's hall: ${JARL} stands holding a war hammer with a spiked iron head over an overturned table and spilled silver coins; a rich grey-haired jarl stares up at him in terror from his chair.`, 'hall', 'fire'],
  q_nine: `A great war council in a field under a roof of sail-cloth: nine rulers round a long table spread with carved wooden ship markers, ${MAN} standing to speak.`,
  q_wedding: [`A wedding at the end of autumn before a longhouse: a grinning captain with short golden hair hands a short sword to his bride, a young woman with a brown braid in a blue-grey wool dress wearing a crown of straw and late flowers, guests in wool cloaks cheering.`, 'village', 'day'],
  q_four: `Before dawn in a harbour crowded with dozens of longships, hundreds of warriors boarding by torchlight, families watching from the shore.`,
  // Act VII
  q_firewater: [`Burning arrows rain down on a fleet of longships, crews beating out flames on deck with wet cloaks, and ahead a line of enemy ships chained side by side across the water.`, 'sea', 'rain'],
  q_blades: [`On the wet deck of a longship, a captain with short golden hair wielding a long knife and a sword fights an arrogant long-haired swordsman with two swords, men locked in battle round the mast.`, 'sea', 'rain'],
  q_blackshore: `Hundreds of warriors wade ashore through cold grey surf onto a beach of black volcanic sand, round shields raised against arrows, longships behind them.`,
  q_redhand: `At a bend in a road on a black hillside, a thin-faced red-haired raider on a black horse waits before a line of warriors, as ${MAN} walks up the road toward him with a bearded axe and a round shield.`,
  q_pens: `A calm grey-haired veteran swings a black war hammer down onto the lock of a log slave pen, ragged captives pressing at the gate from inside, twenty warriors at his back.`,
  q_vigdis: [`A long timber bridge across a deep rocky ravine, its far end in flames: a small wiry woman with cropped dark hair waits alone in the middle with a long knife in each hand, ${MAN} stepping onto the planks with axe and shield.`, 'wild', 'dusk'],
  q_gorm: [`Before the great carved timber doors of a jarl's turf-roofed hall stands a huge shaven-headed warrior in heavy layered mail with an iron-bound shield and an iron-headed club; ${MAN} faces him with a bearded axe and a round shield.`, 'village', 'day'],
  q_wolfhall: [`${JARL} sits alone in a high seat at the far end of the hall, wolf pelts on the walls; a young Norse farmer with dark blond hair walks in through the great doors, daylight behind him.`, 'hall', 'fire'],
  q_ironwolf: [`The hall is burning. A young Norse farmer with dark blond hair, an axe and a round shield fights ${JARL} who swings a war hammer with a spiked iron head, burning rafters falling round them in sparks.`, 'hall', 'fire'],
  q_dead: `Dusk on a black shore: rows of fresh burial mounds, warriors standing bare-headed, ${MAN} sitting on the steps of a burnt hall with his axe across his knees, a captain with short golden hair sitting beside him.`,
  q_crown: `A great assembly at a flat law-rock beside the sea: thousands of people and the rulers of ten islands gathered round, ${MAN} standing on the rock while an old lawspeaker king with a long grey beard raises his hands, a black raven overhead.`,
  // Epilogue
  q_ravenhold: `A busy Norse harbour town twelve years on, spilled far beyond its old log palisade: a market on the strand, ships from many lands at the piers, and a row of carved memorial stones at the edge of town.`,
  q_leifhouse: [`A big warm house: a captain with golden hair and grey in his beard plays dice at a table with a fierce little girl with brown braids, a brown-haired woman laughing beside them, a long knife and a short sword hung crossed on the wall above the hearth.`, 'room', 'fire'],
  q_lesson: `Evening on a green hill. A man of forty with long dark blond hair in a slate-blue cloak kneels beside a small red-haired boy at a grassy burial mound under a great old birch with two crowns, a young raven with one white feather on a branch, a harbour town far below.`,
};
const chapters = Object.entries(CHAPTERS).map(([id, what]) => ({ id: 'chapter_' + id, group: 'chapters', kind: 'chapter', ...z(Array.isArray(what) ? sceneAt(...what) : scene(what), '16:9', '2k'), post: ['cover', 1280, 720], out: `public/art/chapters/${id}.webp` }));

// ---- the page and the world ---------------------------------------------------------------------------------------------
const surfaces = [
  { id: 'ui_parchment', kind: 'ui', ...z(`A flat sheet of old parchment filling the entire picture from edge to edge, with no border, no torn edges, no curled corners and nothing behind it: warm tan vellum with faint stains, fibres and soft creases, a little darker toward the corners, completely blank with nothing drawn or written on it, evenly lit, seen from straight above. ${CLEAN}.`, '4:3'), post: ['inner', 1200, 900, 0.8], out: 'public/art/ui/parchment.webp' }, // the middle of the sheet: its edges curl
  { id: 'tex_planks', kind: 'texture', ...z(texture('a wall of weathered vertical pine planks, tarred dark brown, with knots and fine grain')), post: ['tile', 512], out: 'public/art/textures/planks.jpg' },
  { id: 'tex_thatch', kind: 'texture', ...z(texture('a thatched roof: layers of dry golden-brown straw combed straight downward, with faint horizontal bands where the layers overlap')), post: ['tile', 512], out: 'public/art/textures/thatch.jpg' },
  { id: 'tex_turf', kind: 'texture', ...z(texture('a turf roof: short rough olive-green grass and moss growing on sod, a few dry yellow tufts')), post: ['tile', 512], out: 'public/art/textures/turf.jpg' },
  { id: 'tex_stone', kind: 'texture', ...z(texture('a drystone wall of fitted grey fieldstones of mixed sizes with dark narrow gaps and a little lichen')), post: ['tile', 512], out: 'public/art/textures/stone.jpg' },
  { id: 'ui_compass', kind: 'ui', ...z(`A compass rose drawn in dark brown ink on old tan parchment: a ring with eight long points, the north point longest and ending in a small raven's head, fine hatching, drawn by hand with a quill. Centred, filling most of the picture, flat even light. ${CLEAN}.`), post: ['cover', 384, 384], out: 'public/art/ui/compass.webp' },
].map((x) => ({ group: 'world', ...x }));

// ---- stuff for the 3D world itself: not shown as pictures, but worked into textures by tools/art/world.py -----------
// Ground (grass, sand, rock) and sea foam; bark, needles and leaves for the trees, with a bough and a spray of twigs
// on white to be cut out; cloth, fur, mail, leather and hair for the figures. Each keeps only a thumbnail here:
// what the game loads is what world.py builds from the originals (public/art/world).
const onWhite = (what) => `${what}, isolated on a pure white background with nothing else in the picture, flat even light, no shadow. ${CLEAN}.`;
const RAW = {
  w_grass: texture('short rough meadow grass with a little moss and clover, seen from straight above'),
  w_sand: texture('pale grey-tan beach sand with scattered small pebbles and bits of broken shell, seen from straight above'),
  w_rock: texture('weathered grey granite with fine cracks and patches of pale lichen'),
  w_foam: `Seamless tileable texture of sea foam seen from straight above: a lacy net of bright white foam bubbles and streaks on a pure black background, evenly lit, filling the whole frame edge to edge. ${CLEAN}.`,
  w_bark_pine: texture('the bark of an old pine trunk: reddish grey-brown furrowed plates running vertically'),
  w_bark_birch: texture('the bark of a birch trunk: chalk-white papery bark with scattered thin black horizontal marks'),
  w_needles: texture('a dense mass of dark green spruce boughs and needles overlapping and hanging downward'),
  w_leaves: texture('a dense mass of small golden-yellow autumn birch leaves overlapping'),
  w_bough: [onWhite('A single spruce bough with dense dark green needles hanging straight down, its woody stem at the top of the picture and its drooping tips at the bottom'), '3:4'],
  w_twig: [onWhite('A spray of thin birch twigs covered in many small golden-yellow autumn leaves, spreading outward from the centre and filling the picture')],
  c_wool: texture('very coarse homespun wool cloth seen extremely close: thick uneven hand-spun yarns in a plain basket weave, every yarn clearly separate with dark gaps between them and a few loose fibres, in undyed light grey'),
  c_fur: texture('thick shaggy animal fur in light grey, the hairs lying downward'),
  c_mail: texture('riveted iron chain mail: rows of small interlinked iron rings, close up'),
  c_leather: texture('old cracked leather hide seen very close: deep wrinkles, creases and a pebbled grain like a worn boot, lit from the side so that every crease casts a shadow, in pale grey-tan'),
  c_hair: texture('straight combed human hair in pale ash blonde, the strands running vertically'),
  // animals and weapons (0.28): what a beast is covered in, and what a weapon is made of (the wolf's pelt is c_fur, a mane is c_hair)
  a_coat: texture('the short sleek coat of a horse seen extremely close: fine short hairs all lying in one direction with a soft sheen, in plain light grey'),
  a_fleece: texture('the thick curly fleece of a sheep seen extremely close: tight woolly curls and locks, every curl clearly separate with shadow between them, in off-white'),
  a_feather: texture('overlapping bird feathers seen extremely close, laid in rows like roof tiles, every feather with a clear central shaft and fine barbs, in plain light grey'),
  g_steel: texture('a hand-forged steel blade seen extremely close: bright grey metal with fine hammer marks, faint wavy pattern-welding lines running lengthwise and a few small nicks'),
  g_wood: texture('a smooth ash wood tool handle seen extremely close: pale wood with long straight grain lines running vertically, worn smooth by hands'),
  g_wrap: texture('a sword grip wrapped tightly in narrow leather cord seen extremely close: even bands of dark leather cord lying side by side, every turn clearly separate with a shadow between'),
  g_bone: texture('polished antler and bone seen extremely close: pale ivory with fine dark cracks and small pores'),
  // ships and buildings (0.25): a hull's planking, a sail, four shields to hang on a rail or carry, a door, carved timber
  s_hull: texture('the side of an old wooden ship: long tarred oak boards running horizontally, dark brown-black, with weathered grain, adze marks and a few knots'),
  s_sail: [`A square sail of heavy woven wool seen flat from straight on, filling the whole frame edge to edge: broad vertical stripes of weathered dull red and undyed cream, with a lattice of thin leather strips sewn diagonally across it, a little stained and sun-faded. Hand-painted stylised game texture, muted earth palette. ${CLEAN}.`, '1:1'],
  s_shield_1: [onWhite('A round wooden shield seen exactly from the front, a perfect circle filling the picture: flat boards painted in four quarters, two of dull red and two of cream, a domed iron boss in the centre and a stitched rawhide rim, the paint worn and scratched')],
  s_shield_2: [onWhite('A round wooden shield seen exactly from the front, a perfect circle filling the picture: flat boards painted dark slate blue with one broad pale ring around a domed iron boss in the centre, a stitched rawhide rim, the paint worn and scratched')],
  s_shield_3: [onWhite('A round wooden shield seen exactly from the front, a perfect circle filling the picture: flat boards painted black with curved yellow-ochre arms spiralling out from a domed iron boss in the centre like a pinwheel, a stitched rawhide rim, the paint worn and scratched')],
  s_shield_4: [onWhite('A round wooden shield seen exactly from the front, a perfect circle filling the picture: bare weathered grey-brown boards with iron nails, a domed iron boss in the centre and a stitched rawhide rim, scarred by old cuts')],
  b_door: [`A low, heavy door of a Viking Age longhouse seen flat from straight on, filling the whole frame edge to edge: thick upright oak boards, dark with age, held by two long forged iron strap hinges and rows of iron nail heads, an iron ring handle on the right. Hand-painted stylised game texture, muted earth palette, evenly lit with no shadows and no perspective. ${CLEAN}.`, '3:4'],
  b_carved: texture('a dark weathered oak board carved in low relief with interlaced Norse knotwork of twisting serpents and bands, the carving covering the whole board'),
  // halls and towns (0.26): the two banners the story names. "Old faded banners hang from the beams, some of them carrying the crowned raven of King Halfdan"; Håkon is the Ironwolf and his hall the Hall of Wolves
  b_banner_raven: [`An old faded war banner of heavy woven wool seen flat from straight on, filling the whole frame edge to edge: dull dark red cloth with a black raven embroidered in the middle, its wings spread, a small golden crown above its head, the cloth frayed along the bottom edge and a little smoke-stained. Hand-painted stylised game texture, muted earth palette, evenly lit with no shadows and no perspective. ${CLEAN}.`, '3:4'],
  b_banner_wolf: [`A war banner of heavy woven wool seen flat from straight on, filling the whole frame edge to edge: black cloth with the head of a snarling wolf embroidered in the middle in iron-grey thread, seen from the side, the cloth frayed along the bottom edge. Hand-painted stylised game texture, muted earth palette, evenly lit with no shadows and no perspective. ${CLEAN}.`, '3:4'],
};
const raw = Object.entries(RAW).map(([id, v]) => ({ id, group: 'world3d', kind: 'raw', ...z(Array.isArray(v) ? v[0] : v, Array.isArray(v) && v[1] ? v[1] : '1:1'), post: ['fit', 256, 256], out: `assets/art/raw/${id}.jpg` }));

/** Pictures made from another picture at no cost: [made file, from file, how]. tools/art.mjs makes them after every run. */
export const MIRRORS = [['public/art/items/brother_axe.webp', 'public/art/items/father_axe.webp', 'flip']];

export const ITEMS = [...people, ...others, ...things, ...scenes, ...chapters, ...surfaces, ...raw];
