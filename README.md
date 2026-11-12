# Blood of the North — Rise of the Raven King

A third-person Viking action RPG. This repository holds **vertical slice 0.3**: all three chapters of
Act I (Eirik's childhood), plus the design foundation for the full campaign.

> **What this is, plainly.** Three real, playable 3D chapters (well over an hour; untimed) that run in a browser.
> It is not the 40-hour game, it is not Unreal Engine 5, and it is not photorealistic: every character,
> prop and sound is generated in code as a placeholder. See [Status](#status) for exactly what exists.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5184. A production build is `npm run build` (output in `dist/`).

## Controls

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Move / look | `W A S D` / mouse (arrow keys also turn the camera) | left stick / right stick |
| Sprint, crouch | `Shift`, `C` | L3, R3 |
| Interact, dodge | `E`, `Space` | A, B |
| Attack or loose arrow | left mouse | X or RT |
| Block / parry, or aim bow | right mouse | LT |
| Hunter's Sense | hold `Q` | Y |
| Raven's Eye (from Chapter 3's spring) | `V` | d-pad up |
| Wooden sword, bow, put away | `1`, `2`, `X` | d-pad |
| Journal, inventory, map, pause | `J`, `I`, `M`, `Esc` | Back, Start |

All keyboard and mouse bindings can be changed in Settings.

## What you can play

**Act I, Chapter 1 — "The Night of Ashes."** Eirik is nine. One day in the village of Hrafnvik, then the night it burns.

1. *The Last Good Day* — talk with your mother, find your father.
2. *Wood for Winter* — split logs (timing).
3. *The Quiet Foot* — follow your father, learn the bow, hunt hares, track and stalk a deer.
4. *Fire Before Dark* — gather tinder at the hunting camp and strike a fire.
5. *Wooden Swords* — sparring: strike, block, parry, dodge.
6. *Supper* — free time in the village (fishing, neighbours, the Raven Stone), then bed.
7. *The Night of Ashes* — the raid, the duel, the flight to the north gate, a stealth escape.
8. *Alone* — a blizzard, a draining warmth meter, and the fire your father taught you to make.

**Act I, Chapter 2 — "The Long White."** Alone in the winter forest, with warmth and hunger to manage.

1. *The Long White* — cut spruce boughs with your father's axe, mend the lean-to, follow deer tracks
   in the snow, face the wolf that wants your kill (shoot it or share the meat), cook, sleep.
2. *Thin Ice* — Håkon's trackers find the smoke. Slip east through the trees, creep across river ice
   that breaks if you run, and keep walking until a farmer finds you.

**Act I, Chapter 3 — "A Stranger's Hearth."** Bjorn's farm. This chapter ends Act I.

1. *A Stranger's Hearth* — tell Signe your name (truth, half, or a lie), follow Freydis to a storm-felled
   pine, rescue and name two raven chicks (one white, one black), split wood for Bjorn, and hide your
   father's axe under the hearthstone.
2. *First Flight* — spring. Press `V` to fly the white raven and find a lost lamb from the air.
3. *Things That Wait* (optional) — five old things around the farm that a boy cannot move. Each is the
   seed of a secret weapon in a later act. One can only be seen from the air.

Then ten winters pass. Dialogue and actions raise four traits (Wisdom, Compassion, Ferocity, Pride); they,
the ravens' names and the omens found are saved for later acts.

## Status

| | |
|---|---|
| **Playable and tested** | All of Act I (chapters 1–3) start to finish; raven companions and Raven's Eye; five hidden omens; hunger and warmth, shelter, cooking, a wolf encounter with two outcomes, thin-ice crossing; movement, camera, stamina; dialogue with choices; quests, journal, tracker, map with waypoint; woodcutting, archery, tracking, fishing, fire-making; sparring; stealth with raider sight and hearing; cold survival; day/night, snow, fire; in-engine cutscenes; save/load with autosave; settings, key rebinding, gamepad |
| **Prototype** | Procedural characters and animation; procedural audio and score; villager routines; wildlife AI; melee core (sparring only) |
| **Blocked** | Higgsfield asset generation — the API needs a key ID *and* a secret; only one value was supplied. See [docs/HIGGSFIELD.md](docs/HIGGSFIELD.md) |
| **Planned** | Everything else in the brief: Acts II through VII; the open world (about forty islands, horse and ship travel, wolf-mark outlawry, standing up to "my king" — designed in [docs/OPEN_WORLD.md](docs/OPEN_WORLD.md)); adult combat and nine weapons, skill trees, companions, sailing, settlement, factions, 50 side missions, UE5 port. See [docs/ROADMAP.md](docs/ROADMAP.md) |

How it was tested: an automated playtest drives the real game loop through every quest step (see
`debug` in [src/main.js](src/main.js)). It was verified on an Apple M2 at 60 fps. It has **not** been
played end to end by a person with mouse and keyboard, so feel and difficulty tuning are unverified.

## Layout

```
src/core/      input, audio, save, math
src/world/     terrain, sky and weather, village props, vegetation, effects, collision
src/entities/  character rig and animation, player, NPCs and raiders, wildlife and arrows
src/systems/   quests, dialogue, inventory, cutscene camera, activities
src/data/      Act I items, cast, quests, dialogue (pure data)
src/story/     Act I director scripts (one per chapter)
src/ui/        HUD, menus, panels
data/          campaign-wide design data (missions, world, combat) — engine-agnostic JSON
assets/        asset registry and generated assets
tools/         Higgsfield API client
docs/          design document, story bible, architecture, roadmap
```
