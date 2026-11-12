# Roadmap

Each milestone ends in something a person can play. Content hours are targets to be confirmed by
playtests; none are claimed until then.

| # | Milestone | Delivers | Done when | State |
|---|---|---|---|---|
| 0.1 | **The Night of Ashes** | Act I ch.1; core loop; saves; interface | Automated playtest passes every quest step | **Done** |
| 0.2 | **Human playtest pass** | Tuning from real mouse, keyboard and gamepad play; aim feel; stealth difficulty; camera in tight spaces | Three people finish ch.1 without help | Next |
| 0.3 | **Real assets in** | Working Higgsfield credentials; key art; GLB loader; first imported models (longhouse, longship, axe, Eirik) | One placeholder replaced in-game by an imported GLB | Blocked on credentials |
| 0.4 | **The Long White** | Act I ch.2 and 3: hunger, snares, shelter, wolf, river ice, trackers | Act I plays start to finish (target 4 h) | Planned |
| 0.5 | **Combat and adulthood** | Time jump, the farm, melee against real enemies, posture, weapon switching, enemy AI, the second raid | Act II's raid is winnable and losable | Planned |
| 0.6 | **Engine decision** | Either commit to UE5 (needs suitable hardware) or harden the web build for a larger world | A written decision with a prototype of the first region in the chosen engine | Planned |
| 0.7 | **The Hunted Wolf** | Companions, bounties, horse, first ship, Act III | Act III plays through | Planned |
| 0.8 | **Across the Sea** | Sailing, naval combat, ports, sieges, three new regions, Act IV | — | Planned |
| 0.9 | **The Broken Raven** | Settlement, recruiting, supply, territory, Act V | — | Planned |
| 0.10 | **War of the Jarls** | Faction politics, duels, large battles, Acts VI and VII, four endings | — | Planned |
| 1.0 | **Polish** | Side missions, minigames, voiced dialogue, recorded music, performance targets (60 fps at 1440p on suitable hardware as an objective), accessibility pass | Full playthrough signed off | Planned |

## Immediate next steps

1. Supply the Higgsfield key ID and secret, run `npm run hf -- auth`, then generate the key art and reference sheets.
2. Play chapter 1 by hand and note every moment that feels unfair, unclear or slow.
3. Decide where the project lives: a PC that can run UE5, or continue in the browser for another act.

## Known gaps in 0.1

- Houses cannot be entered.
- No voice acting; music and effects are synthesised.
- Villagers hold a post and change once in the evening; they do not react to weapons or theft.
- The camera can clip through roofs at steep angles near buildings.
- NPC steering has no path-finding; scripted routes are hand-placed to avoid obstacles.
- Stealth and aiming were validated by scripted input, not by hand.
- The manual save during the night restores to the last checkpoint, not the exact position.
