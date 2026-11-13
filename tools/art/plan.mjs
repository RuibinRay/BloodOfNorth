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

const bare = (who) => (/helmet|skull|circlet|hood/.test(who) ? '' : ' Bare-headed.');
const portrait = (who) => `Bust portrait of ${who}.${bare(who)} Head and shoulders, three-quarter view, looking a little past the viewer, plain dark warm-brown background. ${PAINT}. ${AGE}. ${CLEAN}.`;
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
  bjorn: 'a very big, broad, barrel-chested Norse farmer of about fifty, a giant of a man, with long grey hair, a long grey beard and laughing eyes, in a brown wool tunic with a dark fur collar',
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
};
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

// ---- the page and the world ---------------------------------------------------------------------------------------------
const surfaces = [
  { id: 'ui_parchment', kind: 'ui', ...z(`A flat sheet of old parchment filling the entire picture from edge to edge, with no border, no torn edges, no curled corners and nothing behind it: warm tan vellum with faint stains, fibres and soft creases, a little darker toward the corners, completely blank with nothing drawn or written on it, evenly lit, seen from straight above. ${CLEAN}.`, '4:3'), post: ['inner', 1200, 900, 0.8], out: 'public/art/ui/parchment.webp' }, // the middle of the sheet: its edges curl
  { id: 'tex_planks', kind: 'texture', ...z(texture('a wall of weathered vertical pine planks, tarred dark brown, with knots and fine grain')), post: ['tile', 512], out: 'public/art/textures/planks.jpg' },
  { id: 'tex_thatch', kind: 'texture', ...z(texture('a thatched roof: layers of dry golden-brown straw combed straight downward, with faint horizontal bands where the layers overlap')), post: ['tile', 512], out: 'public/art/textures/thatch.jpg' },
  { id: 'tex_turf', kind: 'texture', ...z(texture('a turf roof: short rough olive-green grass and moss growing on sod, a few dry yellow tufts')), post: ['tile', 512], out: 'public/art/textures/turf.jpg' },
  { id: 'tex_stone', kind: 'texture', ...z(texture('a drystone wall of fitted grey fieldstones of mixed sizes with dark narrow gaps and a little lichen')), post: ['tile', 512], out: 'public/art/textures/stone.jpg' },
].map((x) => ({ group: 'world', ...x }));

/** Pictures made from another picture at no cost: [made file, from file, how]. tools/art.mjs makes them after every run. */
export const MIRRORS = [['public/art/items/brother_axe.webp', 'public/art/items/father_axe.webp', 'flip']];

export const ITEMS = [...people, ...things, ...scenes, ...surfaces];
