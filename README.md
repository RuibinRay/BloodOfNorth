# Blood of the North — Rise of the Raven King

A third-person Viking action RPG. This repository holds **vertical slice 0.8**: all three chapters of
Act I (Eirik's childhood), the opening chapter of Act II (Eirik at nineteen, with real combat), and an
open-world sandbox that runs from the home valley out to a sea chart of islands, with a ship of your own, a
crew to row her and enemies to fight at sea, plus the design foundation for the full campaign.

> **What this is, plainly.** Four real, playable 3D chapters (well over an hour; untimed) that run in a browser.
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
| Attack or loose arrow (hold and release for a heavy blow) | left mouse | X or RT |
| Block / parry, or aim bow | right mouse | LT |
| Hunter's Sense | hold `Q` | Y |
| Raven's Eye (from Chapter 3's spring) | `V` | d-pad up |
| Send the black raven at your target (Act II) | `R` | RB |
| Whistle for your horse (open world) | `H` | — |
| Set or lower the sail (in the boat or ship) | `Shift` | L3 |
| Sound the horn: crew ashore, or back aboard | `G` | — |
| At the ship's helm: loose a volley; raise shields | left mouse; hold right mouse | X or RT; LT |
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

**Act II, Chapter 1 — "The Farmer's Axe."** Ten winters on; Eirik is nineteen.

1. *Ten Winters* — a drill with Bjorn teaches the adult fighting: light and heavy blows, guard, parry, and breaking an opponent's guard.
2. *Smoke on the Ridge* — the white raven will not settle. Fly her west and mark the riders on the river road; lift the hearthstone.
3. *The Farmer's Axe* — hold the yard, stop them firing the barn, and bring down Kettil Red-Hand. Bjorn fights beside you. You can lose.
   Then decide what to do with a dying man who knows your father's name.

**Open-world sandbox — "The Whale Road" (prototype).** Not a story chapter: a place to try the systems.

- **Horse:** mount the bay mare at Bjornstead, gallop on stamina, whistle to call her.
- **Boat:** board at the Hrafnvik landing, row and steer, step ashore where the hull grounds. `Shift` sets a sail
  for open water (about two and a half times rowing speed).
- **The fjord:** Gulen (the law-rock, a lawspeaker, a merchant, a ferryman) and Bulandet (a fishing camp with a problem).
- **The sea chart:** south of Gulen the fjord opens into 1.3 km of open water with twelve more islands, found by
  sailing to them or by sending the white raven ahead. The map screen has a chart that fills in as you find them.
  Among them: Kinn (the reeve of a second law-district, a trader, a skipper), Fedje (a pilot), Batalden (wreckers
  who attack whoever lands), Skorpa (a beacon to climb to and light), Gannet Rock (a hermit with a story), the
  Storm-Wife's Rock (a seeress), Hovden (a wreck), the Skerry of Horns (outlaws and their hoard), and Utvær, where
  the chart ends.
- **Passage:** ferrymen at Gulen, Fedje and Kinn carry you between harbours you have already found, for six
  silver, towing your boat. This is the first fast travel.
- **The Brothers:** the Twin-Axe Stone a nine-year-old could find in Chapter 3 pays off on Vængr, the wing-shaped
  island. If you missed the stone, the hermit can still send you there.
- **Wolf-marks (the wanted level):** hurt or kill someone where a living witness can see and you earn up to five
  marks. Two brings the hue and cry; three brings bounty-hunters. Clear them by paying the blood-price, winning
  the hide-duel, or lying low until talk dies.
- **A ship of your own:** a karve lies at anchor off Kinn. The reeve sells her (100 silver; 60 to a guest of the
  Skerries). She is faster under sail than the rowing boat, but will not move without two hands at the oars, and
  rows faster with each one up to six.
- **Crew:** four islanders will join, each for a reason (standing in their district, a favour done, or silver), and
  Bard Skipper hires out two rowers. They sit the benches, face aft to row, and wait with the ship.
- **The horn:** ashore, `G` calls the crew after you. In a fight each takes one man off your back; a captain is
  left for you. `G` again sends them back aboard.
- **The mare sails too:** board the ship with the horse beside you and she is led aboard; she comes ashore when you do.
- **The Tithe-Ship:** with three hands or more the reeve gives the first job that needs a crew: six of the
  Ironwolf's men on Utvær.
- **Sea battles:** hostile ships patrol, sight the Sea-Raven and give chase, shooting as they close. At the helm,
  left mouse looses a volley from every hand aboard (it thins their crew) and holding right mouse raises shields.
  Strike a hull stem-first under sail and it breaks (two blows sink a sea-wolf, but nothing is salvaged). Meet her
  slowly and the ships are lashed together: you and your crew fight across both decks, and a taken ship pays in silver.
- **Hull:** arrows and ramming wear the Sea-Raven down; at nothing she founders. The crew patch her to half when
  nothing is chasing her, and any ferryman mends the rest for silver.
- **Two sea quests from the reeve:** the Skerry-Hound (sea-wolves south of Skorpa), then the Iron Tooth, a
  longship the Ironwolf sends to find the man with the white raven.
- **Traders:** two merchant ships work the sea lanes and hail you by what the district thinks of you.
- **Two laws:** marks and standing are kept separately in the Vestland and the Skerries. Cross the water and you
  are a stranger again, unless you carried three marks or more, in which case word arrives before you do.
- **Standing:** each district rates Eirik from Wolf through Stranger, Guest, Kinsman and Jarl to King. Help
  Bulandet, trade fairly and give to the hall, then ask the lawspeaker to have the folk swear. After that
  they kneel as you pass and say "My king."

Dialogue and actions raise four traits (Wisdom, Compassion, Ferocity, Pride); they,
the ravens' names and the omens found are saved for later acts.

## Status

| | |
|---|---|
| **Playable and tested** | All of Act I (chapters 1–3) and Act II chapter 1 start to finish; melee combat against enemies that guard, take turns and flank, with a two-phase captain; an ally who fights; the black raven harrying a target; raven companions and Raven's Eye; five hidden omens; hunger and warmth, shelter, cooking, a wolf encounter with two outcomes, thin-ice crossing; movement, camera, stamina; dialogue with choices; quests, journal, tracker, map with waypoint; woodcutting, archery, tracking, fishing, fire-making; sparring; stealth with raider sight and hearing; cold survival; day/night, snow, fire; in-engine cutscenes; save/load with autosave; settings, key rebinding, gamepad |
| **Prototype** | The open-world sandbox (two law-districts, fourteen islands, one horse, a rowing boat and a crewed ship, sea battles with volleys, ramming and boarding, paid passage, one secret weapon, one crew raid); procedural characters and animation; procedural audio and score; villager routines; wildlife AI; combat balance (tuned against scripted players only) |
| **Blocked** | Higgsfield asset generation — the API needs a key ID *and* a secret; only one value was supplied. See [docs/HIGGSFIELD.md](docs/HIGGSFIELD.md) |
| **Planned** | Everything else in the brief: the rest of Act II and Acts III through VII; the rest of the sea map (about forty islands of which fourteen exist as a sandbox; a longship of your own, fleets and crew who can be hurt; wind and weather at sea; more districts — designed in [docs/OPEN_WORLD.md](docs/OPEN_WORLD.md)); adult combat and nine weapons, skill trees, companions, sailing, settlement, factions, 50 side missions, UE5 port. See [docs/ROADMAP.md](docs/ROADMAP.md) |

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
