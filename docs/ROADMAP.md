# Roadmap

Each milestone ends in something a person can play. Content hours are targets to be confirmed by
playtests; none are claimed until then.

| # | Milestone | Delivers | Done when | State |
|---|---|---|---|---|
| 0.1 | **The Night of Ashes** | Act I ch.1; core loop; saves; interface | Automated playtest passes every quest step | **Done** |
| 0.2 | **The Long White** | Act I ch.2: hunger, shelter, the wolf, trackers, thin ice; chapter-to-chapter hand-off | Automated playtest passes every step and loads each one cold | **Done** |
| 0.3 | **A Stranger's Hearth** | Act I ch.3: the adoptive family, the two ravens and Raven's Eye, five omens, the axe under the hearthstone, the ten-year jump. **Act I is complete.** | Automated playtest passes every step and loads each one cold | **Done** |
| 0.4 | **Grown** | Act II ch.1: Eirik at nineteen, melee combat (light, heavy, guard, parry, guard-breaking), enemy AI that takes turns and flanks, an ally, a two-phase captain, the raid on Bjornstead | Automated playtest: drill, raid won by a scripted average player, raid lost by standing still, every step loaded cold | **Done** |
| 0.5 | **Human playtest pass** | Tuning from real mouse, keyboard and gamepad play: combat difficulty above all, then aim, stealth, wolf timing, raven flight, camera | Three people finish everything built without help | Next |
| 0.6 | **Real assets in** | Working Higgsfield credentials; key art; GLB loader; first imported models (longhouse, longship, axe, Eirik, ravens) | One placeholder replaced in-game by an imported GLB | Blocked on credentials |
| 0.7 | **The world opens** | First open region beyond the dale: horse, rowing boat, two islands, wolf-mark outlawry, regional standing, Storm-Yew (see OPEN_WORLD.md) | Ride and row between three places; earn and clear two wolf-marks | Planned |
| 0.8 | **Engine decision** | Either commit to UE5 (needs suitable hardware) or harden the web build for a sea map | A written decision with a prototype of the first island group in the chosen engine | Planned |
| 0.9 | **The Hunted Wolf** | Companions, bounties, first ship, Grave-Song, Act III | Act III plays through | Planned |
| 0.10 | **Across the Sea** | Longship, naval combat, ports, sieges, the outer skerries, Act IV | — | Planned |
| 0.11 | **The Broken Raven** | Settlement, recruiting, supply, territory, Act V | — | Planned |
| 0.12 | **War of the Jarls** | Faction politics, duels, large battles, "my king", Acts VI and VII, four endings | — | Planned |
| 1.0 | **Polish** | Side missions, minigames, voiced dialogue, recorded music, performance targets (60 fps at 1440p on suitable hardware as an objective), accessibility pass | Full playthrough signed off | Planned |

## Immediate next steps

1. Supply the Higgsfield key ID and secret, run `npm run hf -- auth`, then generate the key art and reference sheets.
2. Play everything by hand, the raid especially, and note every moment that feels unfair, unclear or slow.
3. Decide where the project lives: a PC that can run UE5, or continue in the browser for another chapter.

## Known gaps in 0.4

- Houses cannot be entered.
- No voice acting; music and effects are synthesised.
- Villagers hold a post and change once in the evening; they do not react to weapons or theft.
- The camera can clip through roofs at steep angles near buildings.
- NPC steering has no path-finding; scripted routes are hand-placed to avoid obstacles.
- Stealth, aiming, the wolf and the ice were validated by scripted input, not by hand. The Chapter 2
  tracker section is probably too forgiving: a cautious scripted player was never noticed.
- Chapter 2 reuses the Hrafnvik valley; the wolf can only be shot or fed (no scaring it off with fire yet).
- Snares and fever from the chapter outline are not built.
- Chapter 3: the ravens are simple shapes; trees keep their autumn colour in spring; Raven's Eye was flown by script, not by hand.
- Act II combat has one melee weapon (Ragnar's axe) and the bow; no shield for the player, no executions, no weapon classes yet. Balance was set against scripted players, not people.
- Adult Eirik and the raiders are the same placeholder rig; attacks reuse three swing animations.
- The open world, outlawry, standing, horse and boats are design only (docs/OPEN_WORLD.md). None of it is in the build.
- A manual save during the night or a hunt restores to the last checkpoint, not the exact position.
