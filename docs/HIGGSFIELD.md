# Higgsfield integration

**State (13 Nov 2026): working for images, and in the game.** The key pair in `.env` is accepted by the official API,
160 generations have been charged ($2.55 of an approved $10), and 97 of the resulting pictures are in the game.
**Not possible through this API: 3D models.** Its catalogue is image and video models only.

## What is in the game

| Art | Count | Where it shows |
|---|---|---|
| Portraits of the cast | 51 | Beside a speaker's words in a conversation; on the Companions page. Eirik has three (nine, grown and scarred, forty-one) and the game picks by where the story is |
| Paintings of things he carries | 32 | The Inventory list and the selected item |
| Scene paintings | 9 | One for each act and the Epilogue behind every title card of that act and beside the act in the Acts menu; the title painting behind the loading screen |
| World textures | 4 | Plank walls, turf roofs, thatch, stone: drawn into the materials the buildings already use |
| Parchment | 1 | Under every panel, and laid over the map |

Everything falls back to what the game drew before if a file is missing (`src/ui/art.js`, `src/world/geo.js`).

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
  resizes them into `public/art/` (2.3 MB in all), makes textures repeat without a seam, and `tools/art.mjs manifest`
  lists what exists in `src/data/art.js`, which is how the game knows what it has. `npm run check` fails if a listed
  file is missing.
- The API keeps a finished request's files for seven days. The originals here are the only copies after that.

## What was learned

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

- **3D.** The figures, buildings, ships and weapons in the world are still built in code. The API has no image-to-3D
  model; the Higgsfield app lists some (Meshy, Tripo, Hunyuan3D) but they are not reachable with an API key.
  `assets/registry.json` still holds the four GLB slots that plan described, and `tools/higgsfield.mjs` the older
  one-slot-at-a-time client; nothing has been generated through either.
- **The same face twice.** Each portrait is one generation from words. Eirik at nine, grown and at forty-one are three
  separate pictures that agree on hair, scar and clothes but are not the same painted face.
- **Accuracy to the story in every detail.** Ragnar's axe is a plain axe with a raven on it, not a true bearded axe;
  the whale painting's raven is black, not white. These were left as they are.

Because the key pair was pasted into a chat, consider making a new one in the Console and putting it in `.env`.
