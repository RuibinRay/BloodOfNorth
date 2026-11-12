# Feature plan

Asked for on 2026-11-12: better movement, a camera lock, icons, living islands, and a plan for the rest informed by how the large games are made. This is that plan. "Built" means it runs in this build and passed a scripted check; nothing here has been played by a person yet.

## What the research found

I searched for how the named games were made. Honest summary of the quality of what turned up: two GDC session listings, several interviews, and a lot of second-hand reporting and fan investigation. Rockstar publishes almost nothing about its internals, so the Red Dead and GTA points below are observed behaviour, not engineering fact.

| Game | What is reported | What this project takes from it |
|---|---|---|
| Ghost of Tsushima | Sucker Punch's co-founder said combat was the hardest feature and took about six years of iteration. Their GDC talks cover keeping fights lethal and balancing from data ("Honoring the Blade: Lethality and Combat Balance"). | Combat is tuned last and longest, against real play, not designed once. Keep fights short and dangerous both ways. Record numbers from playtests and tune from them. |
| Red Dead Redemption 2 | People who followed single NPCs through a game day found they keep hours: work in the morning, the saloon after, asleep at the table at night. Reporting says NPCs greet the player differently the second time. Critics note the routines run only in a bubble round the player. | Routines by time of day; memory of the last meeting; and the "bubble" is the right way to do it on a small machine. |
| GTA V | Community documentation shows population set per area and time of day, with "scenario" people (seated, talking, working at a spot) kept separate from walkers, and counts capped near the player. | Two kinds of ambient people, jobs and walkers; density by place and hour; a hard cap; spawn out of sight. This is what the first version here does. |
| Black Myth: Wukong | About 30 people at the 2020 reveal and about 140 at launch; roughly six years; moved from Unreal 4 to Unreal 5. Figures are from secondary sources. | One polished slice shown early, then growth. Scope by boss, not by map. An engine move mid-project is survivable but costs years. |
| Phantom Blade Zero | Combat built round motion capture of working martial artists; designers and the capture floor in a tight loop; about a week from a boss's design to its implementation; flow valued over single moves. | A boss is a unit of work with a fixed recipe. This build's champions follow one (weapon, three or four named skills, phases, a line to open and a line to fall). Real animation needs capture or an animator; code cannot stand in for it. |
| Lock-on cameras | Write-ups distinguish hard lock, soft lock and camera lock; switch target toward the player's input; never fight the player's hand on the camera (a GDC camera talk makes that its first rule). | The lock here keeps the man centred, lets the mouse still nudge the view, and changes man on a flick. |

Sources are listed at the end.

## Movement and camera

| Feature | State | Notes |
|---|---|---|
| Camera lock (`L` or middle mouse) | **Built** | Locks to the man nearest the middle of the view. Camera and Eirik's front stay on him; `A`/`D` circle. A mouse flick changes man. When he falls it moves to the next, or lets go. Mark on the man's chest. |
| Input buffering | **Built** | A blow or a dodge asked for a moment early is remembered and done the instant it can be. |
| Speed that feels like weight | **Built** | He gathers speed over a stride, stops short, turns wider at a run, leans into turns; steep ground slows him, downhill helps; water and mud hold his legs; the view opens a little at a run. |
| Walk key (hold `Alt`) | **Built** | |
| Vault and climb | Planned | Low walls, fences, ledges to head height. Needs obstacle tags on props and two animations. |
| Jump | Not planned | Dodge has that button. A jump only earns its place with places to jump to. |
| Swimming | Partly built | A dive with breath and depth exists over the wreck off Kaupang (Act II). Everywhere else deep water is still a wall. To do: short swims anywhere, drowning in mail. |
| Auto-recentre and camera collision polish | Planned | Recentres behind him when moving with no mouse input; fade bodies that touch the lens. |
| Horse feel | Planned | Gallop stamina, jumping fences, fighting from the saddle. |
| Gamepad for the new keys | Planned | Lock on R3 is the convention. |

## Island life (people)

| Feature | State | Notes |
|---|---|---|
| People appear round the player, on land only | **Built** | `src/systems/ambient.js`. Up to nine at a time on a great island. Never in water, never inside a wall; not within 24 m in front of him (9 m behind his back); gone beyond 96 m. |
| Jobs: a task repeated at a spot | **Built** | Fishing off the pier, hammering at a forge, chopping, hoeing, weaving, cooking, standing guard, two people talking, sitting, mourning at a burned house. 36 job spots across Jarnøy, Solvik, Myrholm and Skalløy. |
| Routes: walking a guided path | **Built** | They walk the island's roads end to end, wait, and walk back. |
| They are real people of the world | **Built** | They talk (lines per island), see crimes, can be hurt, kneel to a king. |
| Hours of the day | Planned | Each person gets a day: work, eat, sleep. Needs the clock to run past evening and houses that can be entered. |
| Memory | Planned | Greeting changes with what he did last time and with standing. |
| Reactions | Planned | Flee a drawn weapon, gather at a fight, shelter from rain, look at the white raven. |
| Svartøy | Planned | Håkon's men patrol; thralls work. Hostile, so it needs the wanted rules to cover it. |
| Home waters and Bjornstead | Planned | The same system on Kinn, Gulen, Fedje, Skorpa and Vængr. Bjornstead (built in 0.14) has its own people in Act II, placed by time of day; it and Kaupang are empty in the sandbox. |
| Animals and trades | Planned | Sheep driven on roads, carts, boats working the bays. |
| Path-finding | Planned | People walk straight lines along roads now. A navigation grid per island lets them go round things. |

## Icons and interface

| Feature | State | Notes |
|---|---|---|
| Icons for inventory items | **Built** | `src/ui/icons.js`: 30 line drawings; every item has one by id or by kind. |
| Icons for weapons | **Built** | Each weapon class has its own. |
| Icons for missions | **Built** | In the journal and the tracker; a mission can have its own (the Wolf's Table is a wolf's head). |
| Storm-skill bar | **Built** | Bottom of the screen: Stormguard and the four skills with their keys; lit when usable, red when he is too angry. |
| The ten-islands map | **Built** | Third map tab; great islands show as "?" until seen. |
| Painted icons | Planned | Replace the line drawings with real art when the asset pipeline has credentials. |
| Weapon wheel | Planned | Hold a key, pick by direction; today key `1` steps through. |
| Map: roads, fast travel, filters | Planned | |

## Combat

Built in 0.13: Stormguard by the story's rules, five Stormborn skills, ten champions with named skills and phases, Raven-Feeder's reforgings. See [WEAPONS.md](WEAPONS.md).

Built in 0.17: a night infiltration (Håkon's hunting camp: guards who walk and guards who sit, a detection meter, dogs on a round, and pits to hide in until they pass); the skirmish again with companions in it (Leif at the tannery door, ten men and Svanhild on Vængr, Astrid's arrows in both); and a duel with a scripted fall and recovery (Skarde: the lie, the mud, the wait). Stealth is still one meter and a restart; there are no distractions, takedowns or bodies to hide.

Built in 0.16: the same skirmish on a ship's deck (the rail is the edge of the world), and a duel with scripted turns (Rurik: he knows the axe, he waits when Eirik is down). The ships themselves do not move in story fights yet.

Built in 0.15: a first battle with allies (the Iron Shore). Defenders stand in a line and each holds one attacker, striking him when he closes; attackers who find no one free come for the player, who can also strike the ones being held. It is a stand-in for a shield wall, not one.

Planned, in order: a person plays every champion and the numbers are retuned (the Ghost of Tsushima lesson); companions who fight beside him everywhere, not only in set battles (Leif first); real shield walls and battles of dozens; weapon-against-weapon contact; mounted and thrown-spear combat; per-weapon animation sets.

## World

Built in 0.13: five great islands at story scale, the open sea to carry them, a common sea floor.

Built in 0.14: the mainland coast as two pieces of terrain. Bjornstead, the story's coastal village, whose burned houses, ditch, palisade, watchtower and ship are switched on as Act II reaches them; and Kaupang with the Skerries and the wreck.

Built in 0.16 and 0.17: three more pieces of mainland coast (Wessex, Hedeby Sound, Håkon's hunting camp), each walled off from the open world by its own limits; the Sea-Raven's deck as a place at sea; Gannet Rock and Vængr dressed for Act V.

Planned, in order: Act I's last chapters moved to the new Bjornstead; the five small home islands, Gannet Rock and Vængr enlarged to hold their chapters; ships that sail in the story; weather and wind at sea; interiors.

## How the work is ordered

The owner's story is 59 chapters and a three-part epilogue. By this plan's own targets they come to roughly 17 hours of main missions; side work, travel and battles are what would carry it toward 40. It is being built one chapter at a time in story order, each one checked against the text before it is called done: Act II was done this way in 0.14, Act III in 0.15, Act IV in 0.16 and Act V in 0.17; Act VI is next. Two standards from the game-studio kit the owner pointed to are adopted: gameplay numbers live in data files, and every story fact carries a canon level.

## Sources

- [Honoring the Blade: Lethality and Combat Balance in Ghost of Tsushima (GDC Vault)](https://gdcvault.com/play/1027184/Honoring-the-Blade-Lethality-and)
- [Ghost of Tsushima devs worked "nonstop for six years" on combat (GamesRadar)](https://www.gamesradar.com/ghost-of-tsushima-devs-worked-nonstop-for-six-years-to-perfect-combat-system)
- [Honing the Blade: Evolving Combat for Ghost of Yōtei (GDC schedule)](https://schedule.gdconf.com/session/honing-the-blade-evolving-combat-for-ghost-of-ytei/913736)
- [Red Dead Redemption 2: what the NPCs do when you are not around (MeinMMO)](https://mein-mmo.de/en/3-npcs-red-dead-redemption-2-einen-tag,286499)
- [The Reality of Red Dead Redemption 2's AI (Medium)](https://medium.com/the-sound-of-ai/the-reality-of-red-dead-redemption-2s-ai-part-1-c276e9da2763)
- [Rockstar on RDR2's NPC interaction system (Wccftech)](https://wccftech.com/rockstar-explains-npc-interaction-rdr2/)
- [The popcycle.dat file (community documentation)](https://red-ita.gitbook.io/learn-more/popcycle.dat)
- [Breaking down GTA V's pedestrian dialogue system (Game Developer)](https://gamedeveloper.com/design/breaking-down-gta-v-s-pedestrian-dialogue-system-an-analysis-with-speculative-examples)
- [How Black Myth: Wukong rose to the top of Steam's wishlist (PC Gamer)](https://pcgamer.com/games/action/how-black-myth-wukong-rose-to-the-top-of-steams-wishlist)
- [Developing Black Myth: Wukong (Animost)](https://animost.com/industry-updates/developing-black-myth-wukong/)
- [Phantom Blade Zero uses authentic kung fu motion capture (80 Level)](https://80.lv/articles/phantom-blade-zero-uses-authentic-kung-fu-motion-capture)
- [Phantom Blade Zero interview: kung fu combat (Epic Games Store)](https://store.epicgames.com/news/phantom-blade-zero-interview-kung-fu-combat-approachability-authentic-wuxia-homage)
- [Lock-On Styles in Action Games (Critpoints)](https://critpoints.net/2015/05/24/what-is-your-ideal-form-of-lock-on-in-action-games/)
- [50 Game Camera Mistakes (GDC Vault)](https://gdcvault.com/play/1020460/50-Camera)
