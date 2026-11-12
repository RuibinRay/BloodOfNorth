# Game design document

Status key: **[built]** in the playable slice · **[proto]** partly working · **[planned]** design only.
Numbers for unbuilt systems are starting points for tuning, not measured values.

## Pillars

1. **Earned, not given.** Every skill Eirik has, the player learned by doing it first as a child.
2. **A blade and its wisdom.** Violence is fast, costly and remembered. Restraint is always an option and sometimes the harder one.
3. **A living North.** People have work, weather has consequences, the land feeds you or kills you.
4. **The crown weighs.** Power arrives with people to protect and choices nobody thanks you for.

## Player experience by act

| Act | Fantasy | New systems |
|---|---|---|
| I | A child who survives | Movement, dialogue, hunting, fire, stealth, cold, hunger, shelter, thin ice **[built]**; snares, fever **[planned]** |
| II | A farmer who fights | Melee combat, weapons, crafting, trading, farming |
| III | An outlaw who gathers friends | Companions, bounties, horse, first ship |
| IV | A captain abroad | Sailing, naval combat, sieges, ports, diplomacy |
| V | A leader who rebuilds | Settlement, recruiting, supply, territory |
| VI | A jarl among jarls | Faction politics, duels, large battles |
| VII | A king, of some kind | Army command alongside personal combat |

## Combat **[built: core loop, one weapon]**

Stamina gates everything; posture decides who opens up.

- **Light** attacks chain three hits. **Heavy** (hold, then release) cannot be guarded and costs more. **[built]**
- **Block** (hold) drains stamina per hit. **Parry** (guard raised within 0.26 s of impact) costs nothing and opens a counter. **[built]**
- **Dodge** roll with 0.32 s of invulnerability, 16 stamina. **[built]**
- **Guard (posture)**: guarded blows, heavy blows and parries fill the opponent's guard bar; a full bar staggers him and he takes far more damage. **[built]** Executions. **[planned]**
- **Soft lock**: attacks and guard turn Eirik toward the nearest opponent. **[built]** Hard lock and target switching. **[planned]**
- Enemies telegraph, guard, circle while one or two attack, and can be tied up by an ally; a captain enrages at half health. **[built]** Feints, retreats, ranged enemies. **[planned]**
- Arrows hurt enemies (more to the head); the black raven can be sent at a target to open him up. **[built]**
- Contextual and environmental finishers, stealth takedowns, mounted combat. **[planned]**

### Weapons **[planned]**; data in `data/combat.json`

| Weapon | Role | Strength | Weakness |
|---|---|---|---|
| One-handed axe | Versatile | Fast chains, hooks shields | Short reach |
| Dual axes | High-risk offence | Highest damage per second | No block, only parry |
| Viking sword | Balanced | Best parry window, thrusts | Poor against mail |
| Axe and shield | Control | Shield bash, widest block | Stamina-hungry |
| Spear | Reach | Keeps groups off, mounted use | Weak inside its point |
| Dane axe | Heavy | Cleaves guards and shields | Slow, long recovery |
| Seax | Stealth | Takedowns, grapples | Negligible in open fights |
| Bow | Ranged | Hunting, opening shots **[built: child's bow]** | Useless when crowded |
| War hammer | Armour-breaker | Posture damage through mail | Slow, short |

Two melee sets and one ranged slot are carried; switching takes a short animation.

### Skill trees **[built: 25 skills, see `src/systems/skills.js`]**

Berserker, Shieldmaster, Hunter, Warlord, Wayfarer. Skills unlock abilities, not flat damage (examples:
*Hooking Beard* pulls a shield down; *Raven's Eye* marks tracks without holding the button; *Shield Wall*
orders nearby allies to lock shields). Experience comes from quests and from doing the related activity.

## Systems in the slice **[built]**

| System | How it plays |
|---|---|
| Woodcutting | Stop a swinging marker in a shrinking gold zone; five logs |
| Archery | Hold to aim and draw (0.75 s to full), release; arrows drop and can be collected |
| Wildlife | Hares and deer graze, notice and flee; fear radius depends on stance and speed; deer need two body hits or one to the head or neck |
| Tracking | Hunter's Sense lights a trail of prints and marks animals |
| Fishing | Cast, wait, strike on the bite, then reel while managing line strain |
| Fire-making | Three timed flint strikes; in a storm a bad strike costs an ember |
| Sparring | Four drills taught by doing: strike, block, parry, dodge |
| Stealth | Raiders have a vision cone, hearing radius and awareness meter; low cover blocks sight when crouched; being caught reloads the checkpoint |
| Cold | Warmth drains in the blizzard, slowing Eirik; at zero, health drains |
| Hunger | Drains through Chapter 2; an empty belly slows Eirik and then hurts him; cooked venison restores it |
| Shelter | Cut boughs with the axe and thatch the lean-to; the camp fire restores warmth |
| The wolf | Circles and lunges (dodge to avoid); resolved by an arrow or by throwing it meat |
| Thin ice | Strain rises when running or standing still, falls when creeping; at full strain the ice breaks and costs warmth |
| Raven's Eye | From spring in Chapter 3: fly the white raven within about 170 m of Eirik, climb and dive, and mark what she sees; the black raven circles Eirik as a beacon |
| Omens | Five hidden things around Bjornstead, one visible only from the air; each is recorded and returns as a weapon |
| Traits | Wisdom, Compassion, Ferocity, Pride, raised by choices and actions, and saved |

## World

From Act II the game is an open sea map of about forty islands with horse, boat and ship travel, a
Viking wanted system (wolf-marks) and regional standing that runs from outlaw to "my king": see
`docs/OPEN_WORLD.md`. Only the Hrafnvik valley, with Bjornstead on its east side, exists **[built: 640 m square]**.

Living-world rules: day and night **[built]**; weather **[built: clear, snow, blizzard]**; seasons
**[planned]**; NPC work posts with an evening change **[proto]**; village economy, crime and reputation
response, travelling merchants, random encounters **[planned]**.

## Activities and side content **[planned unless marked]**

Hunting, fishing, tracking, woodcutting **[built]**; farming, smithing, crafting, trading, horse riding,
sailing and ship upgrades, tavern games (dice, arm wrestling, drinking), archery and axe-throwing
contests, treasure maps, settlement building, recruiting, outpost raids, champion duels, ruin mysteries.
Fifty side missions are outlined in `data/missions.json`; three small ones are playable.

## Interface **[built unless marked]**

Main menu, new / continue / load, three manual slots and an autosave, pause, journal, inventory, map
with waypoint, Saga screen (traits, bonds, choices), settings. Planned: crafting and merchant screens,
settlement management, faction and reputation screen, character customisation.

Accessibility **[built]**: three difficulty levels, subtitle toggle and size, objective-marker toggle,
camera-shake toggle, invertible look, sensitivity, full keyboard remapping, arrow-key camera for play
without a mouse. Planned: colour-blind palettes, hold-versus-toggle options, screen-reader menu labels.

## Scope honesty

Forty hours of authored content with fifty side missions is the output of a large studio over years.
The plan in `ROADMAP.md` is built so that each milestone is a complete, playable thing on its own.
