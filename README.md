# Blood of the North — Rise of the Raven King

A third-person Viking action RPG that follows the owner's story, *The Rise of the Raven King*
([docs/story](docs/story/THE_RISE_OF_THE_RAVEN_KING.md): seven acts and an epilogue). This repository holds
**slice 0.29**: Act I (Eirik's childhood), Act II (nineteen: Bjornstead, the raid, the walls, Kaupang and the
Sea-Raven), Act III (twenty: Jarnøy and the Battle of Iron Shore), Act IV (twenty-two: the treasure voyage,
Wessex, six islands burning, Hedeby Sound), Act V (twenty-four: the hunger winter, the tannery yard, the ring,
Vængr), Act VI (twenty-six: Myrholm, Skalløy, the judgment, the nine oaths, the wedding) and Act VII
(twenty-nine: the fleet off Svartøy, the Black Shore, the Hall of Wolves, the law-rock at Gulen) and the Epilogue
(forty-one: Ravenhold twelve years on, Leif's house, the old birch), each as the story tells it, and an open world that runs from the home valley across the home waters to five great islands of the
story built at full scale.

**Full screen, the mouse after a conversation, and the mountains.**
- **Full screen**: F10 (it can be rebound in Settings → Controls), a button beside the languages on the title screen, "Full screen" in the pause menu and a switch in Settings → Graphics. It is not saved: a browser fills the screen only when a click or a key asks it to.
- **The mouse comes back by itself**: when a conversation, a menu or a cutscene hands control back, the game takes the pointer again at once, with no click. (Tested in Chrome. Should a browser refuse, the next click takes it as before, and that click is not swung as a blow.)
- **The mountains have ridges**: sharp crests and gullies high up the valley's walls, where the story never walks, so the lower slopes are as they were. Snow lies above a line that wanders, thins on steep faces and leaves the steepest bare, so grey rock shows through.

**The graphics pass: water, ground and the map.**
- **The sea moves.** It is a grid that goes where the camera goes (3 m cells near it, wider farther out), lifted by five long swells summed as Gerstner waves, so crests come sharp and troughs broad. The swell is full out among the great islands, about a quarter of that in the home fjord, and nothing in the shallows.
- **The sea knows how deep it is.** A picture of the sea floor (1024 a side over the home waters and all ten islands, made at start-up in 0.12 s) makes it clear and green over sand, darker over the deeps, with lines of surf running up every beach and whitecaps on the crests of the swell.
- **Ripples that do not repeat.** Two normal maps are computed from a wind-wave spectrum (`tools/art/water.py`, free) and laid in the world at four sizes running different ways; the finest fade with distance. The river uses them too.
- **Five new pictures from Higgsfield** ($0.075): finer sea foam (the old one was big round holes, the polka dots on the river), snow, cliff, trodden earth and forest floor. The ground now picks trodden earth for paths, yards and fields and forest floor under the trees, both from its own painted colour, as well as snow on the white heights and cliff on the steepest faces, laid on the upright planes so its layers do not smear. Within ~60 m the grain gives the ground a little relief that the sun picks out.
- **The map is drawn as a chart** (`src/ui/chart.js`): land tinted by height and hill-shaded from the north-west, woodland as soft green with little tree marks, paths dashed, fields hatched, the coast inked, the sea pale over the shallows with a line at every 3 m of depth, all at the size the map is shown (it was the 1024-pixel ground picture shrunk to 512 and stretched to 840). Names are placed so that none lands on another; the big ones first.
- **What it costs:** about 40k more triangles for the sea (every scene stays inside its budget) and a few more texture reads on the ground. The heavy scenes still hold 60 frames a second on the M2; measured against `main` at the same moment, the drawing time was the same within noise.
- **Not done:** ships do not ride the swell (it is kept to about half a metre at its highest so that hulls and crews, which the story places at fixed heights, still look right); the mountains are still mostly plain snow.

**Faster to start.** The title now comes up in about 1.9 s instead of 6.2 s on an M2 (production build, fast
connection). Measured, three quarters of the old wait was painting the ten islands' ground picture by picture, and
measuring every pixel's distance to every road and path, near or not. Now a road too far away to matter is skipped,
and the islands, all out of sight behind the sea haze when the title comes up, are painted in the gaps between
frames over the next four seconds. One that comes into view before its turn is painted there and then, in 160 ms.
Every picture is the same to the pixel as before (checked by hashing all ten islands, the valley and all 1,142 sets
of trees, rocks and grass). The loading screen has a moving bar, which keeps moving while the world is built.
A first visit on a machine with no graphics card (software drawing) starts at Low quality. The frame rate was not
the problem: the five heavy scenes hold 60 frames a second at Medium and High on the M2, each frame taking 1.4–3.7 ms
to draw.

**Faces and hair** (built on the branch `faces-and-hair`, merged). Every head is now shaped, not a ball: a skull
with a jaw, a chin, cheekbones, the ridge of the brow and sockets for the eyes, in one of nine shapes; a nose (straight,
hooked, snub, broad, broken, button, long) and ears; eyes with an iris and pupil that turn to look and glance aside,
upper lids that blink and close, lower lids and lashes; brows shaped and thick or thin; lips on a jaw that drops when
they speak, so the chin and the beard move with the words and the teeth show; rosy cheeks, freckles, lines of age,
soot and mud. **Hair** in nineteen styles (cropped, short, tousled, swept back, to the shoulder, long, a mane, long with
braids at the temples, tied back, one braid down the back or over the shoulder, two braids, a bun high or low, a
topknot, balding, shaved, bald), lying in locks, hanging hair that swings with the body and not the head, and grey that
comes in streaks and at the temples first; **beards** as stubble, short, full, long, to the belt, forked, braided or on
the chin, with moustaches. Each person with a name and a part has a face of their own, from the story and from their
portrait: Eirik at nine, ten, twenty-two and forty-one; his families; the six companions; the kings, queens and jarls;
the ten champions and Håkon; the speakers of each act. Eirik's Appearance page offers the new hair, beards, faces and
noses.

**In 0.29.** An animation pass over everything that moves. **People**: a new walk and run (the swinging knee
folds and the foot is carried through, the hips turn with the stride and the shoulders against it, the arms bend as
they come forward, the head stays facing the way he goes; running, he leans into it and rises between footfalls), a
lean into a start and back into a stop, a bank into a turn with the head looking into it, and a way of standing in
which the weight goes from one leg to the other, different for each person · **animals**: knees for the deer, the
sheep (which used to slide), the goat, the pigs and the cow as well as the wolf and the horse; the wolf and the horse
nod their heads with their stride, look about when they stand, and swing their tails; a raven's wing bends at the
wrist as it beats · **the battle lines**: the rank and file step with their legs when the line goes forward, gives
ground, comes up from the rear or runs · **cloth**: banners wave from their poles and sails move in the wind ·
**fighting**: with a shield on his arm a man now guards with it (it comes up in front of him and he looks over its
rim, the weapon drawn back) instead of holding it out to one side; the guard stance breathes and shifts with one foot
forward; a roll turns him right over, forwards or backwards as he goes; the sidestep is a hop off the line; a man
struck down buckles and lands and settles, and one cut down in a fight may fall forward onto his knees and his face,
or half turned, and lies as he fell. **Merged**: the two branches other sessions had made from 0.22 (`act7-fight-tuning`,
`story-hints-stay`) are in, and `main` is level with all of it.

**In 0.28.** Animals and weapons. **Animals** are covered in something: a wolf has a shaggy pelt, a horse a
short coat and a mane and tail of hair, a sheep a curly fleece, deer and hares a coat, ravens feathers. Three were
rebuilt as well as covered: **the wolf** has a deep chest, lean haunches, a ruff, a jaw, a nose, a brush of a tail and
legs with thighs and paws that fold at the knee as they come forward; **the horse** has a chest and quarters, a neck with the mane lying along its crest, a
muzzle, eyes, a forelock, a hanging tail, legs with hooves, and a blanket under the saddle; **the ravens**, white and
black, have heads, eyes, heavy beaks, wedge tails and wings with spread fingers in place of a ball and two planks.
**Weapons and tools** are made of something: blades and axe-heads are hammered steel that takes the light, hafts and
bows are wood with a grain, sword and seax grips are wrapped. Seven more Higgsfield pictures (about 10 cents; $5.01 of
the approved $10 in all), worked into two new sheets, `beast.jpg` and `gear.jpg`, that work the way the figures'
sheet does. The goat, the pigs and the cow at Bjornstead are covered too, and a horse or a hound of another colour is
now built in that colour. **Fixed, three things that were never in the world** because a comment had been put in the
middle of a line and swallowed the code after it: Bjorn's grey horse in Act IV (Eirik rode on nothing, since 0.16),
Brokk's hammer at the smithy in the Epilogue, and the far downs of Wessex. **The shield walls were replayed** by a
script after the merge and all three end as they should; the replay is now part of `npm run check` (see the roadmap's
known gaps for what it found about how hard they are). **A raised shield in the wall now costs breath**: it found
that keeping the shield up the whole time cost nothing and won every wall, so holding it up now drains breath, none
comes back while it is up, and a brace needs breath to count; the player who does that now loses the harbor town.

**In 0.27.** The real shield walls are in. They were built in another session on a branch of their own
(`real-shield-walls`, from 0.22) and are now merged with everything since: the Battle of Iron Shore (Act III) and both
pushes on the Black Shore (Act VII) are two lines of about a hundred and fifty men a side, with the story's named
fighters in the front rank, instead of skirmishes in pairs (see "Real shield walls" in
[docs/ROADMAP.md](docs/ROADMAP.md) for how they work and what is not known about them). **The rank and file now wear
what everyone else wears**: the same weave, leather and hair as the jointed figures beside them, and the four painted
shields in place of flat quartered discs, ours in red and blue, Håkon's in black and yellow and bare boards, so the
two lines can be told apart at a glance.

**In 0.26.** Halls and towns. **A hall is now built as a hall**: any longhouse wide and long enough (the
kings' halls on Jarnøy, Solvik and Myrholm, the hall at Bjornstead and Ravenhold, the elder's hall in Hrafnvik, the
hall in Wessex) has higher walls, a wide door under a carved porch with its own little roof, a row of painted shields
along the wall, a smoke louver on the ridge, bigger beasts' heads on the gables and a banner on a pole either side of
the porch · **the Hall of Wolves** has a gable over its gate, a roof up to a louvered ridge with boards under it,
great doors standing open, wolves' heads on the gable, braziers by the steps, shields along both walls, Håkon's wolf
banner outside, and inside, as the story has it, old banners "some of them carrying the crowned raven of King
Halfdan" · **town gates**: the gaps in Ravenhold's and Svartøy's palisades are gates now, with carved posts, a beam
and a fighting walk across them, both leaves standing open, and a banner over the way in · **two painted banners**
(the crowned raven, the wolf) replace the black cloths on Svartøy. Two more Higgsfield pictures (3 cents; $4.90 of
the approved $10 in all).

**In 0.25.** Ships and buildings. **Ships** are clinker-built: each side is six strakes, the lower edge of
each standing out over the one below, with a board of tarred oak and a row of rivets on every strake; the deck is cut
to the shape of the hull; the stem and stern posts are carved, and the prow has a jaw; there are stays to stem and
stern, shrouds, and a steering oar on the right quarter; the sail is a painted striped wool sail · **shields** on
the rails, by the doors of halls and in the hands of fighters are four painted round shields (Eirik always carries
the red one with the pale band) · **buildings**: a real door with iron strap hinges and a ring in place of a black
rectangle, carved door posts and lintel, carved gable boards that end in beasts' heads, a log along each eave of a turf
roof, and two shields hung by the door of any house of thirteen metres or more. Eight more Higgsfield pictures (12
cents; $4.87 of the approved $10 in all), worked into `public/art/world/` by [tools/art/world.py](tools/art/world.py).
The shapes are still built in code.

**In 0.24.** The 3D world wears generated textures, and the people in it look like their portraits. Everything
here is still built in code; what changed is what it is covered with (Higgsfield pictures worked into textures by
[tools/art/world.py](tools/art/world.py)). **Ground**: grass, sand and rock have a grain underfoot · **the shore**: a
line of foam that runs up and down the sand with the swell, wet sand behind it, and clear shallows that darken with
depth · **trees**: pines with bark and hanging boughs, birches with white bark and golden leaves, in place of plain
cones and balls · **people**: wool has a weave, fur is fur, hair has strands, belts, boots and smiths' aprons are
creased leather, and those the story puts in mail wear ring mail (Håkon, Gorm, Rurik, Bersi, the heaviest of the
raiders); every tunic has a band of its trim colour at the hem and the cuffs, a belt buckle, and a brooch where there
is a cloak; a figure is still one draw · **each of the nine champions' figures was brought into line with their
portrait** (hair, beard, clothes, armour), and `tools/check/looks.js` lists where any figure and portrait disagree ·
**a painting for every chapter** (67) behind its title card and in the Acts menu, 22 more portraits (73 in all),
Raven-Feeder painted at each reforging, a compass rose on the map. **Fixed:** since 0.22 the grown Eirik's body was
not drawn at all (only what he held): the swap from child to man left the new body out of the scene. He is drawn
again, and `npm run check` now fails if he is not.

**In 0.23.** Painted art, made with the Higgsfield API (the first time the integration has worked: the key pair
is accepted, and 160 generations cost $2.55). **Portraits** of 51 of the cast, from the story's own descriptions and
the colours of the figures in the game, shown beside what each says in a conversation and on the Companions page;
Eirik has three, at nine, grown and at forty-one · **paintings of the things he carries** (32) in the Inventory ·
**a painting for each act and the Epilogue** behind its title cards and in the Acts menu, and a title painting behind
the loading screen · **painted textures** on plank walls, turf roofs, thatch and stone · **parchment** under every
panel and over the map. The 3D world itself, its figures, buildings, ships and weapons, is still built in code: the API
makes pictures, not models. How it is made, what it cost and what was learned is in
[docs/HIGGSFIELD.md](docs/HIGGSFIELD.md).

**In 0.22.** Performance and checks. The game now draws far less for the same picture: trees, rocks, bushes and
grass are laid out in map cells and only the cells in view are drawn (they were all drawn, everywhere, every frame, and
again for shadows); far trees use a simpler shape; grass and bushes stop where they can no longer be seen; the props of
each place are merged area by area instead of across the whole map; an island the haze has taken is not drawn; and
every person is one skinned figure and a face instead of some thirty separate pieces. Counted in the same scenes before
and after: the village 4.8 million triangles a frame to under 1 million; the Black Shore battle 4.5 million triangles and
713 draw calls to about 290 thousand and 320 · **resolution that follows the frame rate** (on by default): when frames
come slower than fifty a second the picture is drawn with fewer pixels, and sharpens again when there is room · **a frame
counter** (Settings, Show frame rate): frames a second, draws, triangles, resolution · **`npm run check`**: one command
that builds the game, opens it in a headless Chrome and starts every one of the 67 chapters, compares each with what was
recorded as known good, holds five heavy scenes to a drawing budget, and plays one fight beside two companions.
The frame rate itself has not been measured on this machine (the test browser runs hidden): turn the counter on to see it.

**In 0.21.** Any chapter of any act can be started from the main menu (Start at an Act lists each act's
chapters, 67 in all), with what came before taken as played; every one was started this way by script and checked,
and the two that left Eirik in the wrong place were fixed · **companions who fight**: Leif, Astrid, Torvald,
Svanhild, Brokk and Ingrid each fight their own way (Leif's two blades land twice, Torvald is slow and heavy behind a
shield, Svanhild rarely lets a blow through, Brokk's hammer wears a guard down, Astrid shoots from behind, Ingrid does
not fight but binds wounds and gets the fallen up) and each has one skill, called with Y and U: Dock-rat's Trick,
Storm-Yew, Hold the Line, The Finest Sword, Sunder, and Clean Water and a Bandage · in the open world two of them walk
with Eirik: ask them along at the farm (Ingrid on Jarnøy, Svanhild on Vængr), B tells them to wait or to come; they
go down rather than die, and get up when the fight is over, when Eirik helps them, or when Ingrid does · in the
story's battles, the companions the scene puts on the line (Leif at the side gate, Torvald on the wall, Svanhild on
the Black Shore) fight with their own kit, Eirik can call their skills there too, and Astrid on the field shoots for
him · who is there follows the story: Brokk is gone after Skalløy, Torvald is away from Hedeby Sound until he swears
on the ring · a Companions page in the pause menu, and their state and skills over the bottom right of the screen.

**In 0.20.** The Epilogue, "The Old Birch", the last of the story, in its order and words · Ravenhold
twelve years on: the town spilled past the old palisade, houses, workshops and gardens, a market on the strand,
ships from Wessex, Frisia, Dublin and the eastern rivers · the row of carved stones, Torvald with a broom at Ari's,
Hauk with two cups of ale · Halvar at Brokk's old forge, the apprentice, and the Thing-Ring on the anvil · the
people the war left (Svanhild's young warriors, Astrid and Kári and his son, Hrefna and Ingrid, Signe and Freydis,
Leif and Hallvard and a goat that cannot be sued) · Leif's house, the one building you can walk into: Liv, the dice,
"He lost two", the Twins over the hearth · the evening walk up the hill with Little Brokk, Bjorn's mound under the
grown birch, the lesson, the young raven with one white feather · the view rising over Ravenhold and out to sea.
Eirik is forty-one, a little grey, in the High King's cloak; the ravens no longer follow him.

**In 0.19.** Act VII, "The Raven King", all eleven chapters in the story's order and words · fire arrows on
the fleet in the rain, the ship whose archers rake the decks, Leif's passage past the rocks, the ram · Leif and
Ulf on the benches, the boarders, Ulf Two-Blades across two burning decks, the black raven, the rail · the Black
Shore: two pushes up from the sand, and twice going back for men who are cut off · Kettil Red-Hand at the bend,
on his knees in the mud · the pens, played as Torvald with Star-Fall, and Astrid's brother · Vigdis Quickblood on
the burning bridge · Gorm Stone-Lung at the gate · the Hall of Wolves, and the Ironwolf in four parts, the last of
which is won by waiting · the steps of the burning hall, Hauk's stone, the law-rock.
Also new, in every act: every attack and skill animation redone on eased curves, with a wind-up, a strike and a
follow-through; blade trails, impact flashes, ground rings and screen pulses; a bow that bends, with a string that
draws and an arrow on it, a ring that tightens as you draw, a perfect-release window, hit marks, and arrows that
stay in what they hit; rain; a glow pass on fire and bright steel (Settings: "Glow on fire and steel"); and the
camera now follows the mouse even when the browser has not captured the pointer (Settings: "Camera follows the
mouse", on by default; turn it off to look only with the pointer captured or the arrow keys).

**In 0.18.** Act VI, "The Nine Oaths", all nine chapters in the story's order and words · Myrholm: Queen
Thora, an arrow with a blue thread, the white raven over the marshes, Astrid released on Eirik's surety, Prince
Eyvind and the leeches, the man the bog kept, and Eydis the Mire under the drowned watchtower with the black raven
in her face · Skalløy: Brokk and Halvar, the sky-iron, the true story of the hand; three lanes held at night;
Brokk in the doorway; Bersi Black-Anvil from the forge to the quarry's edge · the forge before dawn, the boat on
the beach, Star-Fall · Torvald's oath on Halfdan's ring · Sigurd Stonehand in the Hall of Wolves · nine rulers
and Bjorn under a sail-cloth roof · Leif and Ingrid's wedding, and the harbor wall · Svartøy from the sky, the
last night, and the fleet before dawn. Myrholm and Skalløy are the great islands already on the map; this act is
the first to play on them.

**In 0.17.** Act V, "The Broken Raven", all seven chapters in the story's order and words · Hauk at the
assembly, and "I'll carry it" · a tower, a harbor and a ship, and what each one cost · the winter of hunger:
the grain count, Ingrid's rules, Hrefna and the blot, a whale the size of a longship, the first law · the white
raven taken: the black raven's eyes over Håkon's hunting camp, the tannery pits, eleven prisoners, the cage ·
the ring inside the collar, and Old Thrand on Gannet Rock · Vængr: Svanhild, the fight in the forest
settlement, Skarde Bear-Maw and the lie · the ribbon, and Torvald's whole confession · one night when everyone
in Ravenhold is happy, and a boat from Myrholm. One new stretch of coast is on the map: the hunting camp.
Also fixed: an autosave made as the story moved between places (the end of a voyage, coming home from Hedeby)
could reload Eirik where the last chapter ended.
Earlier: [0.16](docs/ROADMAP.md) built Act IV; 0.15 built Act III; 0.14 built Act II, Bjornstead and Kaupang;
0.13 stored the story and drew the map.

> **What this is, plainly.** The whole of the owner's story, seven acts and the epilogue, and a large sandbox,
> running in a browser. Of the story's 89 missions, 82 are built, 4 partly (all in Act I), and 3 are still to build
> (all in Act I). It is not the 40-hour
> game, it is not Unreal Engine 5, and it is not photorealistic: every character, prop and sound is generated in
> code as a placeholder. Everything has been checked by scripted playtest only: no person has played Acts III
> to VII or the epilogue through. See [Status](#status) for exactly what exists.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5184. A production build is `npm run build` (output in `dist/`).

To check that nothing is broken (it needs Google Chrome installed; it uses a temporary profile, not yours):

```bash
npm run check
```

It builds the game, starts every chapter of every act the way the Acts menu does and compares each with
[tools/check/expected.json](tools/check/expected.json), holds five heavy scenes to a drawing budget, and plays one
fight beside two companions. About five minutes; `npm run check -- --quick` does each act's opening in about one.
After a change that is meant to move something, `npm run check -- --update` records the new state.

**Play it online:** https://ruibinray.github.io/BloodOfNorth/ (nothing to install). Every push to `main` rebuilds it
there ([.github/workflows/pages.yml](.github/workflows/pages.yml)); the new version is up a minute or two later.

The code is on GitHub at https://github.com/RuibinRay/BloodOfNorth. To have every commit go there on its own,
turn on the project's git hooks once:

```bash
git config core.hooksPath tools/hooks
```

After that, every commit (and every merge, rebase or amend) pushes its branch to GitHub. If `main` can fast-forward
to that branch, the quick check (`npm run check -- --quick`, about a minute) runs first on a copy of that exact commit,
and only if it passes does `main` move there and get pushed, which puts it on the website. A commit made on `main`
itself is checked the same way before it is pushed. A failing check is tried once more (a slow page should not block
a merge); if it fails again, `main` stays where it was, a notification says so, and the check's output is kept in
`.git/autosync-failed.log`. `main` also stays put when the folder that has it checked out has uncommitted changes.
Branches named `wip/…` or `wip-…` are pushed but never merged. If `main` has moved on since a branch began, rebase the
branch onto `main` and its next commit merges. `BOTN_NO_CHECK=1 git commit …` skips the check for one commit,
`BOTN_NO_SYNC=1 git commit …` skips all of it. The check is stopped if it runs past 6 minutes (it takes about one).
A Claude session's own `git commit` runs in a sandbox where Chrome crawls, so there the check cannot finish: the log
says so, and running `bash tools/hooks/autosync.sh` in that folder (outside `git`) checks the commit and merges it.
What it did is written to `.git/autosync.log`
([tools/hooks/autosync.sh](tools/hooks/autosync.sh)).

## Controls

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Move / look | `W A S D` / mouse (it turns the camera whether or not the pointer is captured; Settings can switch that off; arrow keys also turn it) | left stick / right stick |
| Sprint, crouch | `Shift`, `C` | L3, R3 |
| Interact | `E` | A |
| Dodge: a sidestep; a roll when going forward or sprinting | `Space` | B |
| Stormguard: turn any blow, even a red one. It also answers by itself when death is close. Only when calm; costs half the storm bar, more each time | `Z` | — |
| Thunder Smash, Storm-Step, Storm-Cry, Stormbreak (spend the storm bar) | `4`, `5`, `6`, `7` | — |
| Lock the camera to an opponent; again lets go; flick the mouse to change man | `L` or middle mouse | — |
| Walk | hold `Alt` | — |
| Bow: swap shoulder | `T` | — |
| Attack or loose arrow (hold and release for a heavy blow). Push sideways for a wide cut, back for an overhead blow, forward with a heavy for a lunging thrust | left mouse | X or RT |
| Block / parry, or aim bow | right mouse | LT |
| Hunter's Sense | hold `Q` | Y |
| Raven's Eye (from Chapter 3's spring) | `V` | d-pad up |
| Send the black raven at your target (Act II) | `R` | RB |
| Whistle for your horse (open world) | `H` | — |
| Set or lower the sail (in the boat or ship) | `Shift` | L3 |
| Sound the horn: crew ashore, or back aboard; in a shield wall, the line goes forward if they are reeling | `G` | — |
| First / second companion's skill | `Y` / `U` | — |
| Companions: wait here, or come with me | `B` | — |
| At the ship's helm: loose a volley; raise shields | left mouse; hold right mouse | X or RT; LT |
| Draw a melee weapon; again to step to the next you carry | `1` | d-pad |
| Bow, put away | `2`, `X` | d-pad |
| Throw an axe | `F` | — |
| Off hand: shield or second axe | `3` | — |
| Shove with the shield (while blocking) | left mouse | X or RT |
| Diving on the wreck (Act II): down, up, take silver | `C`, `Space`, `E` | — |
| Journal, inventory, map, skills, pause | `J`, `I`, `M`, `K`, `Esc` | Back, Start |

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

**Act II — "The Farmer's Axe."** Ten winters on; Eirik is nineteen. Nine chapters, in the story's order and words.

1. *Ten Winters* — split wood with Bjorn, head off Old Skeggi the goat, be insulted by Freydis.
2. *A Farmer's Life* — find a wounded elk through the white raven's eyes; hear Hauk and Grjotgard out over a
   red cow; the harvest feast, the kaestur, and the wrestling match Eirik lets Bjorn win.
3. *Smoke on the Ridge* — "Wolves." Seven armed men on the river road, and Kettil Red-Hand on a black horse.
4. *The Farmer's Axe* — the flat stone by the hearth; four waves through the yard (slam the barn door on
   three of them, draw them into the pigsty mud, hold the lane by the smithy); Kettil; the Stormguard; and a
   barn with six children in it. You can lose the fight, and you can be too slow to the barn.
5. *The Wolf Remembers* — the Hall of Wolves on Svartøy (a scene).
6. *The Peddlers* — watch their camp from the air, string a net across the street, wait for midnight.
7. *Walls Before Winter* — speak at the Thing stones; then fell timber, lead the horse down, dig the ditch
   and the latrine trench, raise the palisade and the watchtower, and stand in Bjorn's shield wall. The
   village changes as each is done.
8. *The Captain Without a Ship* — Kaupang: the market, the thrall pen, Leif and Orm the reeve; a dive on a
   wreck with one breath at a time; a man under a beam; the Kaupang Thing; the Sea-Raven.
9. *The First Oath* — the feast, the goat's trial, Bjorn's arm-ring, and smoke in the west.

**Act III — "The Wolves of Iron."** Eirik is twenty. Eight chapters, in the story's order and words.

1. *The Island Prince* — sail to Jarnøy, trade for iron, and watch Prince Arvid kill a collector over a
   fisherman's daughter. Let the other three go. Nine days later, Håkon's demand.
2. *Fifty from Ravenhold* — the Thing; Brokk at the forge; Astrid, found through the white raven's eyes, and the
   raiders' camp in the ravine; Torvald, and his shield wall.
3. *The Healer's Hands* — the voyage with the fifty; Princess Ingrid's hospital; Leif and the water.
4. *The Battle of Iron Shore* — dig the trench, fill the Stinking Ditch; shields up under the arrows; call the
   archers' places to Astrid from the air; stand in the shield wall beside Torvald, a hundred and fifty against two
   hundred (raise your guard when they rush, sound the horn when they reel, kill the ones who come through); take
   ten men to the side gate; get the families out. Grjotgard.
5. *The Longshot* — through the burning granary and up the tower to Arne Longshot.
6. *The Enemy Who Escaped* — Ulf Two-Blades, who cannot be beaten today; three burning boats; the pyres.
7. *The Gift of Iron* — gold refused, iron asked for; Ingrid; the second forge and the first reforging;
   Storm-Yew.
8. *The Price of Victory* — the Hall of Wolves (a scene).

**Act IV — "Blood Across the Sea."** Eirik is twenty-two. Eight chapters, in the story's order and words.

1. *The Golden Voyage* — two quiet years; the ship from Solvik; Ari Hauksson, ship's boy; the sunstone, the
   belt, the seawater and Leif's dice.
2. *Wolves on the Water* — three longships in the fog; hold the Sea-Raven's side; Rurik Shieldsplitter, who
   knows the axe and will not strike a man who is down.
3. *The English Court* — Wessex: the monks, the reeve who counts twice, a token; a little girl's fever; Leif
   going from market to market; the harbor wall.
4. *The Iron Circle* — the sealed chest; what only the white raven sees.
5. *Six Islands Burning* — pull survivors out of Kinn's harbor; hunt the looters on Fedje; bring the refugees
   home; hold Skorpa's signal tower; carry Gulen's wounded on Bjorn's grey horse; dig in the ashes on Solvik.
6. *The Council of Six* — six kings before Bjorn's longhouse, and a farmer chosen to command them.
7. *The Betrayal at Hedeby Sound* — the letter and the ribbon; the third fire; the trap; Ari; the beach.
8. *Driftwood* — home.

**Act V — "The Broken Raven."** Eirik is twenty-four. Seven chapters, in the story's order and words.

1. *Ashes Again* — the assembly at the Thing stones; then build the watchtower, the harbor and a ship, and hear
   what each one cost.
2. *The Winter of Hunger* — count the grain, back Ingrid's rules, dig a latrine away from the well, burn the
   straw; Hrefna and the blot; Leif's emergency frog; a whale found from the air and cut up on the shore; the
   whale law; a stranger's debt, and the first law of Ravenhold.
3. *The Raven Taken* — an arrow in the gate; the black raven's eyes, which are hard to read; in through the
   tannery yard; up to the chin in the pits while the dogs go by; eleven prisoners and a cage; out by dawn.
4. *The Ring of Halfdan* — what Brokk finds inside Raven-Feeder's collar; Old Thrand on Gannet Rock.
5. *The Wing Isle* — Svanhild and Jarl Jorund; the fight in the forest settlement; Skarde Bear-Maw on the
   holmgang ground, the lie, the mud, and waiting; the voyage home.
6. *The Letter That Was Never Written* — Astrid's prisoner; the cell; Signe.
7. *The Feast of Survivors* — Brokk's sea serpent, the archery contest, the harbor wall, and a boat near midnight.

**Act VI — "The Nine Oaths."** Eirik is twenty-six to twenty-eight. Nine chapters, in the story's order and words.

1. *The Marsh Queen* — Myrholm: Thora's refusal; Gest in the channel; Astrid, Leif and Ingrid in a cage; the
   white raven over the marshes; three days on Eirik's surety; Eyvind, who knows the channels; leeches and a bog
   body; a tripwire, solid ground, archers in the reeds; Eydis the Mire, and the black raven.
2. *The Last Forge* — Skalløy: Brokk and his nephew; the sky-iron; Jarl Gudmund; Raven-Feeder quenched in
   seawater; the truth about the hand.
3. *The Black Anvil* — hold a lane, then another, then another; the doorway; Bersi through the forge to the
   quarry, where blocking stops working.
4. *The Smith's Last Words* — the forge before dawn; nine days; the boat on the beach; the last reforging and
   Star-Fall.
5. *The Judgment of Torvald* — the Thing stones, and an oath on Halfdan's ring.
6. *The Death of the Iron Circle* — Sigurd's offer, and the Hall of Wolves (a scene).
7. *The Nine Oaths* — a field under a sail-cloth roof; six kings, two jarls, a queen, and Bjorn.
8. *A Wedding Before War* — the bride-price; the wedding; the harbor wall at sunrise.
9. *Four Hundred* — Svartøy from the sky; the companions; the last night; the fleet.

**Act VII — "The Raven King."** Eirik is twenty-nine. Eleven chapters, in the story's order and words.

1. *Fire on the Water* — the Sea-Raven's deck in the rain: Star-Fall and the marsh boat; fire arrows (shield up,
   and smother what burns); the ship ahead whose archers rake the fleet (the bow); the steering oar with Leif; the
   ram.
2. *Two Blades, One Sea* — Leif and Ulf on the benches (a scene); hold the Sea-Raven; Ulf Two-Blades across two
   decks, until the black raven comes down; Leif against the mast.
3. *The Black Shore* — wade ashore under fire arrows with the line; push their shield wall off the sand; go back
   for the men of Vængr; push again to the foot of the road; go back for the men of Jarnøy.
4. *The Red-Hand Returns* — Kettil on a black horse at the bend; mud, the buckler, the boot knife; his knees.
5. *The Pens* — as Torvald: the goat path, the gate, Star-Fall, three locks; what Astrid sees (a scene).
6. *Vigdis, the Left Hand* — the long bridge; left-left, right-right; the bridge alight.
7. *Gorm, the Right Hand* — the gate of the hall: make him swing; the shield goes; the steps.
8. *The Hall of Wolves* — alone; why he did it.
9. *The Ironwolf* — the sword of the guardsman; the weapons of war; Wolf's Judgment in a burning hall; the scar
   goes cold; stop, wait, and meet the blow. The ring. Walk out.
10. *What the Dead Leave Behind* — Leif on the steps; three days; Hauk's stone.
11. *The Crown of the North* — the law-rock at Gulen (a scene).

**Epilogue — "The Old Birch."** Twelve years later. Eirik is forty-one. Three parts, in the story's order and words.

1. *Ravenhold* — up from the pier to the market; the row of stones (a scene); Halvar, the apprentice and the
   Thing-Ring; five people to see.
2. *Leif's House* — walk in; Liv and the dice (a scene).
3. *The Last Lesson* — the evening walk up the hill with Little Brokk; the lesson (a scene); the young raven on the
   stone; the view rising out to sea; the end.

The main menu has **Start at an Act**, which begins Act I, II, III, IV, V, VI, VII or the Epilogue at its opening,
or, under each act, any one of its chapters (67 in all), with what came before taken as played: the quests done, and
the weapons, keepsakes and reforgings Eirik has by then. Every chapter has been started this way by script and checked
for errors, the right place, the right people and a working objective; none has been played through by hand from there.

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
- **Better battles (0.9):** a landed blow holds the world for an instant; a parry opens a one-second riposte that
  cannot be guarded; a heavy blow on a broken guard is a finishing blow. Three new kinds of enemy stand in the
  island camps and boarding crews: archers who stand off and shoot, shield-bearers who cannot be cut from the front
  until their guard breaks, and berserkers who do not wait their turn. The traders sell a linden shield (20 silver):
  it stops arrows, halves the cost of blocking, and shoves. Crew can now be wounded: they go down in a fight they
  are losing and get up, weak, when it is over.
- **More weapons (0.10):** four melee weapons that fight differently, and throwing axes. Traders sell them
  (Asgerd on Gulen: spear, throwing axes; Thora on Kinn: sword, long axe, throwing axes), and a taken ship
  gives up her captain's weapon. Ragnar's axe stays on his back whatever is in his hand.

  | Weapon | Light blow | Heavy blow | What it is for |
  |---|---|---|---|
  | Ragnar's axe | 14 in 0.5 s | 32, two men | The baseline. Off hand takes a shield or the Left Brother |
  | Sword | 12 in 0.4 s | 27, two men | Speed and little breath; the widest parry and the hardest riposte; wears a guard slowly |
  | Ash spear | 13 in 0.5 s, at 3.5 m | 29, one man | Reach; a light thrust stops an attack that is winding up |
  | Long axe | 21 in 0.7 s, three men | 48, four men | Two hands, no shield, half again the breath; a heavy blow breaks a shield-bearer's guard outright |
  | Twin seaxes | 9 then 5, in 0.3 s | 20, two men | The fastest; little breath; small cuts that wear a guard slowly; no shield |
  | War maul | 25 in 0.8 s, two men | 58 to everyone within 2.7 m | The slowest and hungriest; ruins guards and shield walls |
  | Throwing axe | 30 at range | | Stops a swing and shakes a guard; a miss can be picked up |
- **Skill trees (0.11):** renown (from quests, islands found, ships taken and enemies felled) earns a skill point
  every 150. Five trees of five skills each, learned in order, from when Eirik is grown. `K` opens them.

  | Tree | What it does |
  |---|---|
  | Berserker | Breath back on every landed blow, a wider heavy blow, half damage through a shield wall, health and breath from a finishing blow, and hitting harder and unstaggered when badly hurt |
  | Shieldmaster | A longer parry, a stronger shove, a longer and harder riposte, jogging with the shield up, and half-cost blocking that never breaks |
  | Hunter | Faster draw, deadlier arrows, better thrown axes, better prices for game, and a white raven that ranges much further |
  | Warlord | More standing from every deed, tougher crew, harder-hitting crew, helping a wounded crewman up mid-fight, and a black raven that harries longer and more often |
  | Wayfarer | Cheaper sprinting, faster boats, a hull that shrugs off arrows, a harder ram, and crew who can patch the hull most of the way |
- **The raven from the helm:** `V` now works at the steering oar and in the saddle; the ship holds her course under sail while you look ahead.
- **Faces and bodies (0.12):** every character has eyes that look at who they are talking to or fighting, lids that
  blink, brows, and a mouth that follows the words of a line as it is spoken. Expressions change with what is
  happening: anger in a fight, pain when hurt, fear, grief, laughter, exhaustion. Chests breathe, cloaks and long hair
  swing, feet find sloping ground, and the second hand finds the haft of a two-handed weapon. Eirik has the lightning
  scar over his left eye, as a boy and as a man.
- **Appearance:** in the pause menu, choose the grown Eirik's hair and its colour, beard, eye colour, face shape, skin,
  build, height, a second scar, tunic and cloak, with a portrait that updates. The lightning scar cannot be removed.
- **Deeper combat:** the direction you push chooses the blow; two light blows then a heavy one is faster and harder;
  blocked blows ring on the guard and push you back; a finishing blow pulls the camera in. Dodge is a sidestep or a
  roll. The bow shows the arrow's path and can be aimed over either shoulder. Enemies in the open world step out of
  heavy blows, shove through the guard of someone who only blocks, and hold their swing against someone who only rolls.
- **The Storm-Ward:** Eirik's supernatural guard (a placeholder name). Landed blows and parries fill a bar; at half,
  `Z` turns whatever lands in the next half-second, including blows that cannot be blocked, and throws it back.
- **The white raven warns** with a call and an arrow at the edge of the screen when a blow is coming from behind.
- **Two more weapons:** twin seaxes (the fastest; every light blow lands twice) and a war maul (the slowest; its
  heavy blow slams the ground and catches everyone near it).
- **The Seven:** seven elite warriors on Gulen, called out one at a time through the lawspeaker. Each has a weapon,
  a set of moves and at least one change of phase: a shield duelist who answers every guarded blow, a two-axe
  berserker, a spearman who will not be reached, a hammer-man whose slams cannot be blocked, an archer who rolls
  away, a captain who calls shield-bearers, and a champion with three phases. Their names are placeholders.
- **Traders:** two merchant ships work the sea lanes and hail you by what the district thinks of you.
- **Two laws:** marks and standing are kept separately in the Vestland and the Skerries. Cross the water and you
  are a stranger again, unless you carried three marks or more, in which case word arrives before you do.
- **Standing:** each district rates Eirik from Wolf through Stranger, Guest, Kinsman and Jarl to King. Help
  Bulandet, trade fairly and give to the hall, then ask the lawspeaker to have the folk swear. After that
  they kneel as you pass and say "My king."

In Act I, dialogue and actions raise four traits (Wisdom, Compassion, Ferocity, Pride). Act II does not use
them: the story makes Eirik's choices. Whether the traits stay is one of the questions under "Under review" in
the [story bible](docs/STORY_BIBLE.md).

## Status

| | |
|---|---|
| **Playable and tested** | All of Act I (chapters 1–3), Act II (nine chapters), Act III (eight chapters), Act IV (eight chapters), Act V (seven chapters), Act VI (nine chapters), Act VII (eleven chapters) and the Epilogue (three parts) start to finish, by scripted playtest; a building that can be walked into; a sea battle played from one deck (fire arrows, a ship of archers to shoot, a ram); a landing with two pushes and two rescues; a chapter played as another character; a final fight in four parts whose last is won by waiting and guarding; a hunt across a marsh with the white raven; two champion fights that are won by something other than damage (the black raven; a ledge); a night infiltration with patrols, dogs and hiding places; seeing through the black raven; a duel with a scripted fall and recovery; fights on a ship's deck; a duel with scripted turns; a horse to ride in the story; a battle with allies who hold attackers along a line; four companions who join in their scenes; start-at-an-act; a village that burns, is walled and gains a ship as the story goes; timed work, a wrestling and shield-wall game, a dive with breath; melee combat against enemies that guard, take turns and flank, with a two-phase captain; an ally who fights; the black raven harrying a target; raven companions and Raven's Eye; five hidden omens; hunger and warmth, shelter, cooking, a wolf encounter with two outcomes, thin-ice crossing; movement, camera, stamina; dialogue with choices; quests, journal, tracker, map with waypoint; woodcutting, archery, tracking, fishing, fire-making; sparring; stealth with raider sight and hearing; cold survival; day/night, snow, fire; in-engine cutscenes; save/load with autosave; settings, key rebinding, gamepad |
| **Prototype** | Companions who fight (six kits and six skills; two at Eirik's side in the open world, and on the line in the story's battles; tested by script, not by a person, and the numbers are first guesses); the open-world sandbox (two law-districts, fourteen islands, one horse, a rowing boat and a crewed ship, sea battles with volleys, ramming and boarding, paid passage, one secret weapon, one crew raid); procedural characters and animation; procedural audio and score; villager routines; wildlife AI; combat balance and the new enemy kinds (tuned against scripted players only) |
| **Blocked** | 3D models from Higgsfield: its API makes images and video only, so the figures, buildings and ships stay procedural (since 0.24 they wear textures made from its pictures). Images work since 0.23. See [docs/HIGGSFIELD.md](docs/HIGGSFIELD.md) |
| **Planned** | Everything else in the brief: Act I's last missing scenes (Old Hrefna's bones, the stick and the little shield, the seven seats); the rest of the sea map (about forty islands of which fourteen exist as a sandbox; a longship of your own, fleets and crew who can be hurt; wind and weather at sea; more districts — designed in [docs/OPEN_WORLD.md](docs/OPEN_WORLD.md)); adult combat and nine weapons, skill trees, companions' own side missions and loyalty, sailing, settlement, factions, 50 side missions, UE5 port. See [docs/ROADMAP.md](docs/ROADMAP.md) |

How it was tested: an automated playtest drives the real game loop through every quest step (see
`debug` in [src/main.js](src/main.js)), and `npm run check` starts every chapter and compares it with a recorded
known-good state, and plays the three shield walls through with a scripted player (and once with one who does nothing). What each scene asks the machine to draw is counted exactly; the frame rate on an Apple M2 has not
been measured since the early slices (Settings has a frame counter). It has **not** been
played end to end by a person with mouse and keyboard, so feel and difficulty tuning are unverified.

## Layout

```
src/core/      input, audio, save, math
src/world/     terrain, sky and weather, village props, vegetation, effects, collision
src/entities/  character rig and animation, player, NPCs and raiders, wildlife and arrows
src/systems/   quests, dialogue, inventory, cutscene camera, activities
src/data/      Act I items, cast, quests, dialogue (pure data)
src/story/     director scripts: Act I (one per chapter), Acts II to VI (act2*.js to act6*.js), the sandbox, the champions
src/ui/        HUD, menus, panels
data/          campaign-wide design data (missions, world, combat) — engine-agnostic JSON
assets/        asset registry and generated assets
tools/         the checks (`npm run check`), the art pipeline (`npm run art`: art.mjs and art/), the older Higgsfield client
public/art/    the painted art the game shows (portraits, items, scene paintings, textures, parchment)
docs/          design document, story bible, architecture, roadmap
```
