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
| 0.9 | **Better battles** | Requested direction: improve fighting before any more story acts. Hit-stop, riposte after a parry, finishing blows on a broken guard, a wider fight camera; archers, shield-bearers and berserkers in the island camps and boarding crews; a shield for the player (blocks arrows, cheaper block, shove); crew who can be wounded and recover | Automated playtest: each new mechanic exercised directly, the Utvær raid and a boarding with the new kinds, crew going down and getting up, regression on every chapter and the Act II raid | **Done** |
| 0.10 | **More weapons** | Weapon classes with their own numbers (data/weapons.js): sword, ash spear, two-handed long axe beside Ragnar's axe; throwing axes; a weapon key that steps through what is carried; traders' war-gear and captains' weapons as loot | Automated playtest: damage, time, breath, reach and sweep measured for every weapon; stop-thrust, shield-breaking, riposte and parry windows; thrown axes hit, interrupt and are picked up; story chapters still use the baseline numbers | **Done** |
| 0.11 | **Skill trees** | Renown becomes skill points (one per 150); the five designed trees (Berserker, Shieldmaster, Hunter, Warlord, Wayfarer), five skills each, learned in order from adulthood; a Skills panel; renown for fallen enemies; Raven's Eye from the helm and the saddle | Automated playtest: all 25 skills measured with and without, order and cost enforced, closed for the child chapters, regression on every chapter and the Act II raid | **Done** |
| 0.12 | **Faces, motion and combat depth** | From the owner's brief. Animated faces (eyes, blinking, brows, speech-driven mouths, eight expressions, look-at), breathing, cloth and hair sway, foot planting, two-handed grip; Eirik's lightning scar; an Appearance screen. Directional strikes, combo heavy, lunges, sidestep and roll, block impacts, execution camera, bow arc and shoulder swap; the Storm-Ward; raven warnings; twin seaxes and a war maul; enemy move sets, strings, unblockable and area blows, phases, dodging and adapting; the seven elites | Automated playtest: every expression and speech captured in close-up, every new strike, dodge, block, ward and weapon measured, all seven elites fought through their phases by proxy, regression on every chapter and the Act II raid | **Done** |
| 0.13 | **The story arrives** | The owner's story stored as canon; the story bible and all 89 missions rebuilt from it; the sea widened to carry five great islands at story scale (Jarnøy, Solvik, Myrholm, Skalløy, Svartøy) with the places the story names; the lightning scene (Act I); Stormguard by the story's rules; five Stormborn skills (Thunder Smash first); the real seven champions, two hands and Håkon, each with named skills, fought where they fall; Raven-Feeder's reforgings; camera lock, input buffering and weightier movement; icons; island people with jobs and routes; a researched feature plan | Automated playtest: all ten fights in order, every storm skill measured, Stormguard's rules checked, the lightning scene played through, people counted on four islands, earlier chapters still start | **Done** |
| 0.14 | **Human playtest pass** | Tuning from real mouse, keyboard and gamepad play: combat difficulty above all, then riding, rowing and sailing feel, aim, stealth, camera | Three people finish everything built without help | Next |
| 0.15 | **Real assets in** | Working Higgsfield credentials; key art; GLB loader; first imported models | One placeholder replaced in-game by an imported GLB | Blocked on credentials |
| 0.16 | **Engine decision** | Either commit to UE5 (needs suitable hardware) or keep growing the web build, which now holds a 1.3 × 2 km world at 60 fps in the test window | A written decision | Planned |
| 0.17 | **The Farmer's Axe** | Act II as the story tells it: Bjornstead rebuilt as a coastal village, a farmer's life, Kettil and the barn, the peddlers, the walls, Kaupang and Leif | Act II plays through against the text | Planned |
| 0.18 | **The Wolves of Iron** | Brokk, Astrid, Torvald, Ingrid; the Battle of Iron Shore; Act III | Act III plays through | Planned |
| 0.19 | **Blood Across the Sea** | The treasure voyage, Wessex, six islands burning, Hedeby Sound; Act IV | — | Planned |
| 0.20 | **The Broken Raven** | Ravenhold rebuilt, the hunger winter, the tannery, the ring, Vængr; Act V | — | Planned |
| 0.21 | **The Nine Oaths and the Raven King** | Myrholm, Skalløy, the judgment, the wedding, the invasion of Svartøy; Acts VI and VII and the epilogue. One ending: the story's | — | Planned |
| 1.0 | **Polish** | Side missions, minigames, voiced dialogue, recorded music, performance targets (60 fps at 1440p on suitable hardware as an objective), accessibility pass | Full playthrough signed off | Planned |

## Immediate next steps

1. Play the ten champion fights and the storm skills by hand and say which feel unfair, unclear or too easy.
2. Rule on the items under "Under review" in the story bible.
3. Supply the Higgsfield key ID and secret, run `npm run hf -- auth`, then generate the key art and reference sheets.
4. Decide where the project lives: a PC that can run UE5, or continue in the browser for another chapter.

## Known gaps in 0.13

- **The champion fights are fights only.** The battles, voyages and scenes round them (Iron Shore, the treasure ship, the marsh hunt, the burning forge, the landing on Svartøy) are not built, and the companions who are in those scenes are not in the game.
- **Five of the ten islands are still small.** Kinn, Gulen, Fedje, Skorpa and Vængr are the old sandbox islets (about 150 to 250 m). Bjornstead is still one farm in a dale, not the story's coastal village. Kaupang, Hedeby Sound and Wessex are not on the map.
- **Parts of what was built earlier contradict the story** (player choices the story has already made, the Act II ending with Kettil, who rules which island). They are listed under "Under review" in the story bible and are not fixed.
- The great islands' buildings are plain placeholder longhouses, and the same few props repeat. Houses cannot be entered; the Hall of Wolves is the one interior, with an open roof.
- Island people have no hours of the day, no memory and no reactions yet, and there are none on Svartøy or the home islands. They walk straight lines along roads.
- Stormguard's "calm" is a simple anger meter. The storm skills reuse existing animations (Thunder Smash is the maul's slam with lightning).
- Champion difficulty, skill costs and the storm bar's fill rate are guesses: every fight was run by script with stand-in blows, never by hand.
- A save made part-way through the old "First Flight" quest will land two steps off, because the lightning scene was inserted into it.
- The lock-on has no gamepad button, and the new keys are keyboard only.
- Icons are line drawings made in code.

## Known gaps carried over from 0.12

- This is still a procedural, low-polygon build in a browser. There are no skin textures, hair strands, motion capture or recorded voices, and it does not look like the games the brief names. Faces are built from simple shapes; mouths follow the letters of a line, not a voice.
- Cloth and hair swing as single stiff pieces. Foot planting bends the legs on slopes; it does not stop feet sliding at every speed.
- Blocking is still a facing check with an impact reaction, not weapon-against-weapon collision.
- Mud, rain, destructible objects and breakable shields from the brief are not built. Lighting and materials are unchanged.
- None of it has been played by hand; elite difficulty is unknown.


- Skills are rules and numbers, not new moves: none adds an animation or a new button except Rally. There is no way to unlearn one.
- The point rate (one per 150 renown) is a guess: a full run of what is built gives roughly twenty points against forty-five to buy everything.


- Crew can be wounded but cannot die and never leave: no wages, no morale. How fast they go down (about half a minute unaided) is a guess.
- All melee weapons share the same three swing animations (the spear has a thrust, the long axe a two-handed chop). No weapon upgrades, no bows beyond the boy's, and the story chapters use neither the new weapons nor the new enemy kinds.
- Weapon numbers were set by measurement against a held target, not by fighting with them. Which weapon is best, and whether any is useless, is unknown.
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
