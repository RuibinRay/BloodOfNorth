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

Performance on the test machine: 60 fps at 1536×1152 with about 1.5 million triangles and under 60
draw calls by day. This is one measurement on one machine, not a guarantee.

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
