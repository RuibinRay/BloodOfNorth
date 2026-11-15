# The open world (Act II onward)

**Status: design, with a sandbox built** (horse, boat with a sail, a ship with a crew of six, sea battles, fourteen islands, wolf-marks and standing in two law-districts, paid passage; see the README). Otherwise nothing in this document is built except where marked **[built]**. The data version
is `data/open_world.json`. It is written so each system can be built and tested on its own.

## When Eirik grows up

| Act | Age | World |
|---|---|---|
| I (three chapters, **[built]**) | 9 | One valley. His parents die, Bjorn's family adopts him, the ravens are found. Ends with the ten-year jump. |
| II | 19 | **The world opens.** Bjornstead and the Vestland coast are free to roam; the first islands by rowing boat. |
| III | 20–21 | First ship. The inner islands and the Belts. |
| IV | 22–24 | The Whale Road: open sea, the outer skerries, Svealand, Northumbria. |
| V–VII | 25–45 | Everything, with lands changing hands as jarls fall or swear. |

Childhood is Act I only. Everything the child learned or found comes back: the hunting and fire skills
become the Hunter tree, the five omens become weapons, the ravens become his eyes.

## The map: the Whale Road

A sea map, not a landmass. Coasts and island chains with open water between them; you can see the next
island from most shores. About forty islands in nine groups (full list in the data file).

| Group | Islands | Character |
|---|---|---|
| Vestland coast | 6 | Home waters. Farms, fjords, Kaupang market |
| Inner skerries | 7 | Fishing camps, smugglers, the first raid |
| The Belts | 5 | Danish toll straits, Hedeby, bog islands |
| Svear lakes | 4 | Lake islands, the sacred grove, burial mounds |
| Northumbrian shore | 4 | Lindisfarne tide island, river mouths, burhs |
| Outer skerries | 6 | Ruins, hoards, hermits, **Vængr** (the wing-shaped island on the Twin-Axe Stone) |
| Ice coast | 3 | Glacier tongues, walrus hunters, the frozen tarns |
| Whale grounds | 2 | Seasonal whaling stations |
| The Edge | 3 | Unmapped until Act VI: fog, drift ice, something old |

### Built so far (sandbox, 0.6)

Fourteen islands in one continuous world about 1.3 km wide and 2 km long. They carry sandbox content, not
the story hooks in the table above.

| Island | District | What is there |
|---|---|---|
| Gulen | Vestland | Law-rock, lawspeaker, merchant, ferryman |
| Bulandet | Vestland | Fishing camp; tithe-takers to drive off |
| Selja | Vestland | A shepherd and his flock |
| Fedje | Vestland | The pilot's station (passage) |
| Kinn | Skerries | Seat of the district: the reeve, a trader, a skipper (passage), a guard |
| Batalden | Skerries | Wreckers and their false fire; they attack whoever lands |
| Værøy | Skerries | A croft; hares and deer to hunt |
| Hovden | Skerries | A wrecked karve and its cargo |
| Skorpa | Skerries | The tallest island; a beacon to light |
| Gannet Rock | Skerries | A hermit who counts gannets |
| Vængr | Skerries | The wing-shaped island |
| Skerry of Horns | Skerries | Two outlaws and their hoard |
| Storm-Wife's Rock | Skerries | A seeress in a ring of stones |
| Utvær | Skerries | The last stone; the chart ends |

Islands are found by coming within sight of them, by boat or through the white raven's eyes; the map
screen's sea chart names them as they are found.

## Getting about

| Means | From | Notes |
|---|---|---|
| On foot | Act I **[built]** | Sprint, crouch, climb scree |
| Skis and sledge | Act II | Winter only; skis are fast downhill, a sledge carries a kill or a wounded friend |
| Horse | Act II **[built: one horse]** | Fjord horses. Whistle to call, saddlebags for trade goods, mounted spear and bow. Horses refuse ice and steep scree |
| Rowing boat (færing) | Act II **[built, with a small sail]** | Two oars, any beach, one passenger. Reaches the inner skerries in calm weather. In the sandbox the sail is a speed toggle; wind is not modelled |
| Small ship (karve) | Act III **[built in the sandbox, ahead of its act]** | Crew of eight, sail and oars, carries a horse. The first vessel that is yours. Built: the *Sea-Raven*, bought from the reeve of Kinn; six benches; needs two hands to move and rows faster with each; carries the mare; a horn brings the crew ashore to fight. Since 0.8 she fights at sea: volleys, shields, ramming, and boarding across two lashed decks; she has a hull that can be holed and mended. Not built: crew who can be hurt or leave, wages, upgrades, fleets |
| Longship | Act IV | Crew of thirty, raids, sea battles, storms. Upgradable hull, sail, prow and crew |
| Passage on a trader (knarr) | Act II **[built as ferrymen]** | Pay to be carried between ports. This is the game's fast travel, and it can be boarded by pirates. Built: three harbours, six silver, harbours you have found only, your boat towed along. No pirates yet |
| Ferrymen | Act II | Short crossings for a coin or a favour; some are informers |
| The ravens | Act II | Not travel, but navigation: the white raven finds landfall in fog and marks hazards |

## Outlawry: the wolf-marks

The Norse word for an outlaw was *vargr*, wolf. Instead of stars, the HUD shows up to five **wolf-marks**.
Outlawry is **regional**: it belongs to a law-district and its Thing. Cross the water and you may be a
stranger again, unless word, or a ship, got there first.

| Marks | Name | What happens | Typical cause |
|---|---|---|---|
| 1 | **Fined** (*bót*) | People are cold; the next reeve demands payment | Theft, a brawl, trespass |
| 2 | **Hue and cry** | Locals raise the alarm and chase with farm tools; gates shut | Wounding, killing livestock, arson of an outbuilding |
| 3 | **Lesser outlawry** (*fjörbaugsgarðr*) | Bounty hunters track you; merchants refuse you; three safe houses only | Killing in a quarrel, raiding a farm |
| 4 | **Full outlawry** (*skóggangr*) | Anyone may kill you without penalty; the jarl's house-guard hunts you with dogs; companions may leave | Killing a free man in secret, breaking a sworn truce |
| 5 | **Wolf in hallowed places** (*vargr í véum*) | The jarl's ships and his champion come; every port in the district is closed | Killing at a Thing or in a temple, burning a hall with people inside |

Rules that make it a system and not a punishment:

- **[built in the sandbox]** marks 1 to 5 from assault and killing, witnesses, hue and cry at two marks, bounty-hunters at three, blood-price, hide-duel, and fading over time. Since 0.6 outlawry is regional across two districts: marks stay behind when you cross, unless you carried three or more, in which case one arrives before you. Theft, feuds and safe houses are not built.
- **Witnesses.** A crime nobody saw adds nothing. The white raven can show who is watching before you act.
- **Open versus secret.** Killing a man and declaring it at the next farm is manslaughter (payable). Hiding the body is murder (two marks worse).
- **Ways down.** Pay the blood-price at a Thing; win a holmgang against the accuser's champion; have a jarl who favours you speak for you; lie low until the season turns (one mark per season); or leave the district.
- **Ways it follows you.** Kin of the dead hold a feud independent of the law. A feud ends only by payment, marriage, or more blood.
- **It can be used.** At three marks or more in a rival jarl's district, his enemies start offering you work.

## Standing: from wolf to oath-friend

Each district also tracks how it regards Eirik. This decides who fights him, who trades, and what
people call him.

| Tier | They call you | Behaviour |
|---|---|---|
| Wolf | *vargr* | Attacked on sight by fighters; farmers flee and bar doors |
| Stranger | "traveller" | Wary; guards watch; prices are high |
| Guest | by name | Lodging, rumours, ordinary prices, side missions open |
| Kinsman | "friend", "Ravensson" | Gifts, discounts, men will join a raid, children follow the ravens |
| Hall-friend | "the king's friend" | The island's own king opens his hall; his folk will lend men when asked |
| Oath-friend | **"oath-friend"** | The island's king swears to come when Eirik calls: an oath of friends, not a crown. People turn to greet him; free lodging and remounts; men on a horn-call; bards sing his deeds, including the ones he regrets |

The owner's ruling (2026-11-15): the islands keep their own kings, as in the story (King Hallvard on Gulen, King
Ragnvald on Kinn, whose reeve Ragnhild holds the Skerries for him), and Eirik is never king of an island. The top
of the ladder is an alliance, not a crown.

**[built in the sandbox]** all six tiers in each of two districts, greetings by tier, and the oath of friendship before King Hallvard or Ragnhild. Tribute, musters and enemy-held lands are not built.

Standing rises through quests, fair judgments, defending the district, gifts and feasts. It falls through
outlawry, broken oaths, heavy tribute and abandoning them in a raid. In lands sworn to an enemy jarl the
ceiling is Guest until that jarl is won over or removed. A man who calls you oath-friend in one harbour may
have a brother two islands away who is sworn to kill you.

Recognition: from Act III strangers know "the one with the white raven" before they know his name.
Hiding her (leaving her aloft) is how you travel unnoticed.

## The ravens

Found as chicks in Act I, Chapter 3 **[built]**; the player names them. The white one is rare enough
that people remember it. They are with Eirik for the whole game.

| Ability | Raven | From | State |
|---|---|---|---|
| **Raven's Eye**: fly her, look down, mark people, animals and places | White | Act I ch.3 | **[built]** |
| **Beacon**: he circles Eirik so she, and allies, can find him | Black | Act I ch.3 | **[built]** |
| **Witness sense**: marked onlookers glow before a crime | White | Act II | planned |
| **Harry**: he dives at a target's face; for three seconds the man cannot attack or guard | Black | Act II | **[built]** |
| **Thief**: he steals a key, a ring, a letter | Black | Act III | planned |
| **Landfall**: she finds the shore in fog and storm | White | Act III | partly **[built]**: islands she sees from the air go on the chart. No fog or storm yet |
| **Messenger**: carry a token to an ally or the settlement | Either | Act V | planned |
| **Omen**: she lands on things that matter; follow her to secrets | White | Act II | planned |
| **Battle-crows**: after a won fight the wild ravens gather; renown rises, and so does fear | Both | Act IV | planned |

Story: they are brother and sister from one nest. In Act V one of them is taken by Håkon's falconer and
Eirik must choose a rescue that costs him a day he cannot spare. In the endings, the High King's ravens
sit on the high-seat posts; the Iron King's are caged; the Peacekeeper lets them go.

## Secret weapons

Each omen found as a child (Act I ch.3, **[built]** as discoverable secrets) is the first half of a
weapon. A weapon whose omen was missed can still be found, with more work and no childhood memory.

| Omen (found at 9) | Weapon | Claimed | How |
|---|---|---|---|
| The Lightning Yew | **Storm-Yew**, war bow | Act II | Cut the stave in a thunderstorm; Bjorn refuses to help |
| The Sword in the Barrow | **Grave-Song**, sword | Act III | Sit out a night on the mound and answer the barrow-king's three questions; it must be given |
| The Spear in the Ice | **Winter's Tooth**, spear | Act IV | The white raven finds the one warm week; dive for it with a rope and a crew |
| The Twin-Axe Stone | *(none)* | — | The story leaves "two brothers" unexplained, and so does the game. (The Left Brother, a second axe once found under a cairn on Vængr, was taken out on the owner's ruling, 2026-11-15: it is not in the story.) |
| The Falling Star | **Star-Fall**, war hammer | Act VI | As the story has it: the boy sees a star fall far out over the islands; it comes down on Skalløy, and Halvar forges the hammer from it after Brokk's death. (Until 2026-11-15 the omen was a black stone propping Bjorn's barn door.) |
| *(not an omen)* Ragnar's axe | **Raven-Feeder** | Act II–VII | Never replaced. Reforged three times, each time with something from the story |
