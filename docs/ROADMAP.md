# Roadmap

Each milestone ends in something a person can play. Content hours are targets to be confirmed by
playtests; none are claimed until then.

| # | Milestone | Delivers | Done when | State |
|---|---|---|---|---|
| 0.1 | **The Night of Ashes** | Act I ch.1; core loop; saves; interface | Automated playtest passes every quest step | **Done** |
| 0.2 | **The Long White** | Act I ch.2: hunger, shelter, the wolf, trackers, thin ice; chapter-to-chapter hand-off | Automated playtest passes every step and loads each one cold | **Done** |
| 0.3 | **A Stranger's Hearth** | Act I ch.3: the adoptive family, the two ravens and Raven's Eye, five omens, the axe under the hearthstone, the ten-year jump. **Act I is complete.** | Automated playtest passes every step and loads each one cold | **Done** |
| 0.4 | **Grown** | Act II ch.1: Eirik at nineteen, melee combat (light, heavy, guard, parry, guard-breaking), enemy AI that takes turns and flanks, an ally, a two-phase captain, the raid on Bjornstead | Automated playtest: drill, raid won by a scripted average player, raid lost by standing still, every step loaded cold | **Done** |
| 0.5 | **The world opens (sandbox)** | Horse, rowing boat, two islands, wolf-mark outlawry, district standing up to "my king", trade | Automated playtest: ride to the shore, row to an island, reach King, earn four wolf-marks and clear them, save and load in the boat | **Done** |
| 0.6 | **The sea chart (sandbox)** | The world grows from one valley to 1.3 km of open water: twelve more islands, a sail, a second law-district, discovery by boat or raven, paid passage between harbours, two hostile camps, the reeve's work, and the first omen paid off (the Left Brother on Vængr) | Automated playtest: sail out of the fjord, land on Kinn, every island found, both side quests, the cairn, passage, outlawry carried and not carried across the district line, save and load under sail, regression on all earlier chapters | **Done** |
| 0.7 | **Ship and crew (sandbox)** | A karve to buy from the reeve of Kinn; six crew to recruit (standing, favours or silver); rowing speed by hands aboard; crew on the benches; a horn to bring them ashore, where each takes on one enemy; the horse carried by ship; the first crew job (the tithe-ship off Utvær); two trader ships on the sea lanes | Automated playtest: buy, refuse and accept recruits, hire rowers, row and sail, horn out and back, the raid won with crew, chest and reward, horse aboard and ashore, save and load aboard, regression on all earlier content | **Done** |
| 0.8 | **Sea battles (sandbox)** | Hostile ships that patrol, sight, chase and shoot; volleys and shields from the helm; ramming; grappling and deck-to-deck boarding with the crew; hull damage, foundering and repair; two sea quests (the Skerry-Hound, the Iron Tooth); roaming sea-wolves afterwards | Automated playtest: sighting and chase, volleys both ways, shields, two rams to sink, boarding won and cut loose, loot, repair, foundering, save and load with hull damage, regression on all earlier content | **Done** |
| 0.9 | **Better battles** | Requested direction: improve fighting on land and at sea before any more story acts | — | Next |
| 0.10 | **Human playtest pass** | Tuning from real mouse, keyboard and gamepad play: combat difficulty above all, then riding, rowing and sailing feel, aim, stealth, camera | Three people finish everything built without help | Next |
| 0.11 | **Real assets in** | Working Higgsfield credentials; key art; GLB loader; first imported models | One placeholder replaced in-game by an imported GLB | Blocked on credentials |
| 0.12 | **Engine decision** | Either commit to UE5 (needs suitable hardware) or keep growing the web build, which now holds a 1.3 × 2 km world at 60 fps in the test window | A written decision | Planned |
| 0.13 | **The Hunted Wolf** | Companions, bounties, the ship in the story, Grave-Song, Act III | Act III plays through | Planned |
| 0.14 | **Across the Sea** | Longship, naval combat, ports, sieges, the outer skerries, Act IV | — | Planned |
| 0.15 | **The Broken Raven** | Settlement, recruiting, supply, territory, Act V | — | Planned |
| 0.16 | **War of the Jarls** | Faction politics, duels, large battles, "my king", Acts VI and VII, four endings | — | Planned |
| 1.0 | **Polish** | Side missions, minigames, voiced dialogue, recorded music, performance targets (60 fps at 1440p on suitable hardware as an objective), accessibility pass | Full playthrough signed off | Planned |

## Immediate next steps

1. Supply the Higgsfield key ID and secret, run `npm run hf -- auth`, then generate the key art and reference sheets.
2. Play everything by hand, the raid especially, and note every moment that feels unfair, unclear or slow.
3. Decide where the project lives: a PC that can run UE5, or continue in the browser for another chapter.

## Known gaps in 0.8

- Crew cannot be hurt, cannot die and never leave. They are help in a fight, not yet people: no wages, no morale, no names of their own beyond the six.
- Sea battles are one ship against one. No fleets, no wind, no fire arrows, no enemy ramming; hostile ships ignore the rowing boat and do not land.
- Hostile ships only block the Sea-Raven; traders can still be sailed through.
- In a boarding fight both decks are flat rectangles: benches and the mast do not block anyone.
- Sea battles were validated by script, with stand-in blows for the player. How hard they are for a person is unknown.
- Crew ashore have no path-finding and can snag on rocks; boarding the ship brings them back at once.
- The ship, the horn and the raid were validated by script, not by hand. Crew strength in particular is a guess.

- The sea is calm and the wind always fair: no weather, no currents, no swimming, no capsizing. The sail is a speed toggle.
- The islands are sandbox content, not story: a handful of people, no buildings, no routines. Three are landmarks only.
- The Left Brother is handed out ahead of its act (the design places it in Act IV) to prove the omen-to-weapon chain. It adds damage; it has no moves of its own.
- Sailing, landing and the island fights were validated by script, not by hand.
- The horse cannot be carried by boat, so it stays in the home valley.

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
- The open-world sandbox is one district with two small islands inside the existing fjord. It has no story, no ships, no second district, no theft, and no feuds.
- In the sandbox, people Eirik killed are alive again after loading a save; only marks, standing, silver and the horse and boat positions are stored.
- Riding and rowing were driven by script. The horse has no path-finding and stops at obstacles; you cannot fight from the saddle.
- A manual save during the night or a hunt restores to the last checkpoint, not the exact position.
