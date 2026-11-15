# Higgsfield integration

**State (13 Nov 2026): working for images, and in the game.** The key pair in `.env` is accepted by the official API,
326 generations have been charged ($5.04 of an approved $10), and 208 files made from them are in the game.
**Not possible through this API: 3D models.** Its catalogue is image and video models only.

## What is in the game

| Art | Count | Where it shows |
|---|---|---|
| Portraits of the cast | 75 | Beside a speaker's words in a conversation; on the Companions page. Eirik has three (nine, grown and scarred, forty-one) and the game picks by where the story is. Everyone who speaks in a conversation has one; about thirty people who only appear or say a line in a caption do not |
| Paintings of things he carries | 36 | The Inventory list and the selected item. Raven-Feeder has one for each reforging |
| Chapter paintings | 67 | One for every chapter, behind its title card and beside it in the Acts menu |
| Act paintings | 9 | One for each act and the Epilogue (used where a chapter has none), and the title painting behind the loading screen |
| Building textures | 4 | Plank walls, turf roofs, thatch, stone: drawn into the materials the buildings already use |
| Parchment and compass | 2 | Under every panel and over the map; the compass rose on the map |
| **Textures of the 3D world** | 15 files from 32 pictures | See below |

Everything falls back to what the game drew before if a file is missing (`src/ui/art.js`, `src/world/geo.js`,
`src/world/vegetation.js`).

### The 3D world (0.24 to 0.28)

The API makes no models, so the shapes of the world are still built in code. What its pictures can do is cover them.
Thirty-two pictures (`group:world3d` in the plan) are worked into fifteen texture files in `public/art/world/` by
[tools/art/world.py](../tools/art/world.py), which runs on every `make`, `post` and `manifest`:

| File | Made from | What the game does with it |
|---|---|---|
| `ground_grass`, `ground_sand`, `ground_rock` | Grass, sand with pebbles, granite, each made to repeat and with its average colour taken out | The ground keeps the colour the game paints it; these add light and dark at two scales by where you stand (grass on the flat, sand low by the water, rock where it is steep) |
| `foam` | White foam on black | The line of foam where the sea meets the sand, which moves up and down the beach with the swell, and drifting foam on the sea |
| `pine` | Pine bark, a mass of needles, and one bough on white, cut out | Bark up the trunk; skirts of needles whose lower edges are cut-out hanging boughs |
| `birch` | Birch bark, a mass of leaves, and a spray of twigs on white, cut out | White bark; a crown of leaf sprays |
| `figure` | Wool, fur, ring mail, leather, hair | A sheet of six squares. Every piece of a figure says which square it is made of and how many repeats its real size takes, so one material and one draw still cover a whole person (`STUFF` and `figureMat` in `src/world/geo.js`, `dress` in `src/entities/humanoid.js`) |
| `beast` | Fur, a short coat, feathers, hair, fleece | The same kind of sheet as `figure`, for animals (`M.beast`): a wolf's pelt, a horse's coat and mane, a sheep's fleece, a raven's feathers |
| `gear` | Ash wood, a wrapped grip, forged steel | The same again for weapons and tools (`M.gear`): hafts, grips, blades; the steel square is the one that shines |
| `hull` | Tarred oak ship planking | One board of it, with the shadow of the strake above along its top and a row of rivets along its bottom (both drawn by world.py), laid once on every strake of every hull (`hullGeo` in `src/world/props.js`) |
| `sail` | A striped wool sail | Every sail |
| `shields` | Four round shields on white | Two by two on one sheet: the shields on ships' rails, by halls' doors and in fighters' hands (`shieldGeo`) |
| `door` | A longhouse door | The door of every longhouse, and three other doors |
| `carved` | Carved knotwork oak | Door posts and lintels, gable boards, the stem and stern posts of ships and the dragon's head |
| `banners` | Two war banners | Side by side on one sheet: the crowned raven of King Halfdan (inside the Hall of Wolves, where the story hangs it) and Håkon's wolf (on Svartøy's poles, gates and hall) (`bannerGeo`) |

Also in 0.24, drawn by the game and not generated: clear water over the shallows that darkens with depth, wet sand
behind the foam, a band of trim at every hem and cuff, belt buckles, cloak brooches, and ring mail on those the story
puts in it.

## How it is made

```bash
node tools/art.mjs list all
```

```bash
node tools/art.mjs price all
```

```bash
node tools/art.mjs make group:cast --cap=10
```

- **What to make** is in [tools/art/plan.mjs](../tools/art/plan.mjs): one line of description for each person, thing
  and scene, and the house style they share. People follow the owner's story for who they are and the game's own
  figures for hair, beard and the colours of their clothes.
- **Credentials** are read from `.env` (`HF_API_KEY_ID`, `HF_API_KEY_SECRET`; git-ignored). They are never printed and
  never taken from the command line. The auth header is `Authorization: Key <id>:<secret>`.
- **Money.** `price` is free (the API's estimate endpoint). `make` writes every charge to
  [assets/art/ledger.json](../assets/art/ledger.json) and submits nothing that would take the total past `--cap`
  (default 10 dollars). A failed or refused generation is not charged. `make` skips what already exists unless `--force`.
- **Files.** Originals (1 to 4 MB each) go to `assets/generated/`, which git ignores. `tools/art/post.py` crops and
  resizes them into `public/art/`, makes textures repeat without a seam, and `tools/art.mjs manifest`
  lists what exists in `src/data/art.js`, which is how the game knows what it has. `npm run check` fails if a listed
  file is missing.
- The API keeps a finished request's files for seven days. The originals here are the only copies after that.

## What was learned

- **A texture wants a second look.** The first wool and the first leather came back as flat colour with nothing to
  see; asking for "very coarse homespun wool seen extremely close, every yarn clearly separate" and "old cracked
  leather lit from the side so that every crease casts a shadow" gave something a figure can wear.
- **Cut a weave on its own repeat.** Fading a picture into a shifted copy of itself is enough to make grass repeat,
  but it smears a weave and cuts across strands of hair. `repeatable()` in world.py finds how far along a picture best
  matches its own start and cuts there.
- **Some things do not come as a texture.** Asked for bone, it tiled a floor with ivory squares; asked for a blade, it
  stacked seven blades. The steel in the game is one bar cut out of that stack (`band()` in world.py); the bone was
  not used.
- **One model: Z-Image Turbo** (`z-image/turbo`), $0.015 a picture at 1k or 2k. A pilot tried the same portrait, axe,
  scene and planks on it, on Qwen Image 3 ($0.04 to $0.075) and on Recraft V4.1 ($0.035). Z-Image gave the most even
  period look; Qwen drew modern haircuts; Recraft painted heavier and less alike from picture to picture.
- **Never name what is not wanted.** "No horned helmets" put horned helmets into nine portraits, eight item pictures
  and three scenes. Saying only what is wanted ("bare-headed", "plain round iron caps") fixed all of them.
- **A figure of speech is painted as it reads.** "A bear of a man" came back as a bear; "wearing a bear's skull as a
  helm" came back as a bear in a helmet.
- **Things from the Viking Age need describing, not naming.** "Bearded axe" gives a hatchet; a church appeared for
  "a great hall"; a modern harbour for "a harbour town". The scene prompts now say turf-roofed timber longhouses and
  clinker-built longships every time.
- Prices seen through the estimate endpoint on this account: SOUL V2 and SOUL Cinema $0.004 (photographic, not tried
  here), Z-Image Turbo $0.015, Recraft V4.1 $0.035 (Pro 2k $0.21), Qwen Image 3 $0.04 / $0.075, Grok Image 2 and
  Ideogram 4 $0.06 to $0.08. The balance itself cannot be read through the API; the Console shows it.

## What it does not do

- **3D.** The figures, buildings, ships and weapons in the world are still built in code; since 0.24 they are covered
  with textures made from its pictures, which changes their surface and not their shape. The API has no image-to-3D
  model; the Higgsfield app lists some (Meshy, Tripo, Hunyuan3D) but they are not reachable with an API key.
  `assets/registry.json` still holds the four GLB slots that plan described, and `tools/higgsfield.mjs` the older
  one-slot-at-a-time client; nothing has been generated through either.
- **The same face twice.** Each portrait is one generation from words. Eirik at nine, grown and at forty-one are three
  separate pictures that agree on hair, scar and clothes but are not the same painted face.
- **Accuracy to the story in every detail.** Ragnar's axe is a plain axe with a raven on it, not a true bearded axe;
  the whale painting's raven is black, not white. These were left as they are.

Because the key pair was pasted into a chat, consider making a new one in the Console and putting it in `.env`.
