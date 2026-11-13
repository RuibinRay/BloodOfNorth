# Technical architecture

## Why this is a web build and not Unreal Engine 5

The brief prefers UE5 with Lumen, Nanite and World Partition. On the machine this was built on:

- Unreal Engine, Blender and Godot are not installed.
- It is an Apple M2 with 8 GB of memory. The UE5 editor is impractical below about 32 GB, and Lumen
  and Nanite at target quality need a discrete GPU class this machine does not have.

So the slice is built with **three.js (WebGL) and Vite**, which could be run, tested and screenshotted
here. That choice buys a real playable chapter now. It does not reach photorealism, and it will not
scale to a seamless open world; those need the engine port below.

## Runtime

| Layer | Files | Notes |
|---|---|---|
| Boot, loop, modes, save/load | `src/main.js` | Modes: menu, play, dialogue, cutscene, activity, paused, ui. `frame(dt)` advances everything and can be stepped by tests |
| Input | `src/core/input.js` | Action map over keyboard, mouse and gamepad; rebinding; pointer lock |
| Audio | `src/core/audio.js` | WebAudio synthesis only: ambience beds, effects, generative score |
| World | `src/world/*` | Analytic heightfield baked to a 257² grid for the valley (2.5 m cells), plus a coarser 257 × 417 chart (5 m cells) round and south of it for the mainland coast and the islands; painted 1024² albedo; instanced vegetation; merged static village mesh; circle and box colliders with a spatial grid |
| Sky and weather | `src/world/sky.js` | Shader dome, sun and moon light with shadows, exponential fog, snow particles, PMREM environment map |
| Effects | `src/world/fx.js` | Two pooled particle systems; five real lights assigned to the nearest fires |
| Characters | `src/entities/humanoid.js` | Jointed rig with pose blending: locomotion, looping overlays, one-shot actions with hit events |
| Player, NPCs, wildlife | `src/entities/*` | Controller and camera; behaviours (go, lead, follow, fight, patrol, chase, search); perception |
| RPG systems | `src/systems/systems.js` | Quests, inventory, dialogue, cinematic camera |
| Activities | `src/systems/activities.js` | Woodcutting, fire-making, fishing, sparring |
| Content | `src/data/act1*.js`, `src/story/act1*.js` | Data, and one director per chapter that reacts to quest steps |
| Interface | `src/ui/*` | DOM overlay |

### Drawing less (0.22)

The frame rate has not been measured since the first slices; what follows is counted, not timed.

- **Vegetation is in map cells** (`src/world/vegetation.js`): trees and rocks 128 m, bushes 64 m, grass 40 m. Each cell is
  one instanced batch with its own bounds, so the camera and the sun's shadow box each skip what they cannot see. A tree
  cell beyond 200 m (120 at Low, 300 at High) is drawn with a simpler shape that shares the same instances; grass stops
  at 90 m and bushes at 260 m.
- **Still props are merged area by area** (`Builder.build({ still })` in `src/world/geo.js`), not across the whole map,
  and those areas and each island's ground are not drawn once the haze has taken them (`hazeCull`, `cullHazed`).
- **A person is one skinned mesh and a face** (`fuse` in `src/entities/humanoid.js`): each piece is bound with full
  weight to the joint it hangs from, so the joints are the bones and the animation code is unchanged.
  A figure's joints (`h.body`) and its two meshes (`h.bodyMesh`, `h.faceMesh`) are three separate children of its
  root: anything that swaps one figure for another must move all three (`Player.setLook`).
- **What a figure wears is one sheet of six squares** (`TEX.figure`: wool, fur, mail, plain, hair, leather). Each
  piece is told apart by the colour it was given (`stuffOf`), says which square it is made of in a `cell` attribute,
  and has its uv turned into repeats of that stuff by its real size (`dress`); the material picks the square in the
  shader (`figureMat` in `src/world/geo.js`), so it is still one material and one draw. The ground, the shore and the
  water are patched the same way (`GROUND`, `waterPatch`), and the trees draw bark and boughs from one picture each.
- **A ship is built strake by strake** (`hullGeo` in `src/world/props.js`): each strake is its own strip with one
  board of `TEX.hull` across it, its lower edge pushed out over the strake below. Round shields are `shieldGeo(r,
  thickness, design)` on `M.shield` (four designs on one sheet), doors are `doorLeaf` on `M.door`, carved timber is
  `M.carved`. Each of these textures starts as something plain drawn in code and is painted over when its picture loads.
- **A hall is a longhouse that is big enough** (`longhouse()` in `src/world/props.js`: `hall`, by default 6.8 m wide
  and 15 m long or more): the same function then builds the porch, the louver, the shields and the banners. Gates are
  `gate()` and banners on poles `pole()` in `src/world/realm_props.js`; both take a colour or 'raven' / 'wolf'.
- **Animals and hand-held things use the figures' arrangement with sheets of their own**: `M.beast` over `TEX.beast`
  (`src/entities/wildlife.js` says what each piece is covered in) and `M.gear` over `TEX.gear` (`gearStuff()` in
  `src/entities/humanoid.js` tells what each piece of an item is made of from its colour). All three sheets are six
  squares in the same places, so `STUFF`, `dress()` and `figureMat()` serve all of them.
- **A shield wall's rank and file are instanced copies of one braced figure** (`src/entities/ranks.js`, driven by
  `src/systems/shieldwall.js`): the cloth, the fixed parts, the cap, the two weapon arms and one mesh for each of the
  four painted shields, so about three hundred men are nine draws. Their pieces are dressed with the same `dress()` as
  the jointed figures, so both wear `TEX.figure`.
- **Resolution follows the frame rate** (`Game.adaptRes`), and Settings has a frame counter.

Counted in one frame, before and after: Hrafnvik 4.8 million triangles to 0.96 million; the open-world farm 4.9 to
1.1 million; the Iron Shore gate 4.7 to 0.6 million; the Black Shore battle 4.5 million triangles in 713 draws to
0.29 million in 321. `npm run check` holds five scenes to a budget a third above these.

## Design rules that carry over to any engine

1. **Content is data.** Quests are lists of steps `{ id, text, type, key, count, marker }`. A step
   completes when a system emits a matching `notify(type, key)`. Dialogue is a list of nodes with
   optional choices, conditions and effects. Neither knows about the renderer.
2. **Step handlers are idempotent.** `story.onStep(quest, step, restoring)` places the cast for that
   step from scratch. The same code serves normal play, loading a save and the test harness.
3. **Saves are small.** A save is the quest table, inventory, traits, flags, choices and a position.
   The world is rebuilt from that by running the step handlers. Night checkpoints ignore the saved
   position and restart the step.
4. **Loading resets by reloading the page**, so no stale timers or entities can leak between sessions.
5. **Placeholders have interfaces.** Gameplay calls `humanoid.play('atk1')`, `hold('R', 'axe')`,
   `setLoop('warm')`. Rigged models can replace the primitives behind that interface.

## Testing

`window.__game.debug` exposes a playtest harness: `manual()` takes the loop off the display's frame
callback, `run(seconds)` steps deterministically, and helpers press keys, talk through dialogue, aim
and shoot. Chapter 1 was driven through every quest step this way. `debug.jump(quest, step)` starts
anywhere. In development, `debug.save(name)` writes a canvas capture to `.playtest/`. Chapter 2 was
tested the same way, including loading every step cold and the chapter-to-chapter hand-off.

`npm run check` (`tools/check.mjs`, with its in-page half in `tools/check/page.js`) runs the saved checks in a
headless Chrome over the DevTools protocol, with no extra packages: every chapter started from the Acts menu and
compared with `tools/check/expected.json` (and failed if Eirik has no body in the scene), five scenes held to a
drawing budget, one fight beside two companions, and the three shield walls played through by a scripted player
(`wall()` in `tools/check/page.js`; `npm run check -- --walls` runs only those).

To look at the game without a window: `node tools/shot.mjs "<lines of JavaScript>"` runs lines in the game's page in a
headless Chrome and saves pictures to `.playtest/`. `window.__check.lineup([...names])` stands any of the cast in a
row to be looked at, and `(await import('/tools/check/looks.js')).report()` lists where a figure and its portrait's
description disagree.

Not covered: human play feel, real pointer-lock mouse aiming, gamepad on hardware, browsers other
than the embedded Chromium, and long-session memory.

## Path to Unreal Engine 5

| Web slice | UE5 equivalent |
|---|---|
| `data/*.json`, quest and dialogue lists | Data Assets / Data Tables loaded by a quest subsystem; the same JSON imports directly |
| `story/act1.js` step handlers | Level sequence triggers plus a Blueprint or C++ director per chapter |
| `humanoid.js` action names | Animation Blueprint states and montages (Motion Matching for locomotion) |
| NPC behaviours and perception | Behavior Trees, AIPerception, StateTree, Mass for crowds |
| Heightfield and scatter | Landscape with World Partition, PCG for foliage, Nanite meshes |
| Sky, fog, snow | Sky Atmosphere, Volumetric Clouds, Niagara, Lumen |
| DOM interface | UMG / Common UI |
| Save table | SaveGame object with the same fields |

Needed first: a Windows PC with a recent discrete GPU and 32 GB or more of memory, Unreal Engine 5,
and Blender for asset clean-up. The port is a rebuild using this slice as the specification, not a
conversion.
