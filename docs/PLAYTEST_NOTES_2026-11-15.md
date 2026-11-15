# Playtest notes: 15 November 2026

The online build (https://ruibinray.github.io/BloodOfNorth/, `main` at `bdd6f1e`) was played from New Game to THE END in
one save, in a narrow browser window (about 1180 × 810). Game clock at the end: 2 h 13 min.

**How it was played, and what that means for these notes.** The first chapter was played step by step with the
game's own inputs (walking, the woodpile, the bow, the wooden sword). After that a script did each step: it walked to
the marker, talked, pressed E, played the mini-games by their rules, and flew the ravens. A crude fighter handled the
mob fights, and Eirik was kept from dying in those. The project's own champion bot (`tools/check/bot.js`, the
"average" profile, "good" for Håkon) fought the champions honestly. So:

- Most steps were reached by **jumping to the marker, not walking there**. Paths, distances and stealth were not
  played, except where noted.
- Balance is **not judged** from the mob fights. The champion results are bot results, not a person's.
- Several pauses came from the script running faster than the game's real-time fades. Those are left out unless
  they could happen to a player.

No script errors were logged at any point.

---

## Bugs that stop the game (softlocks)

1. **Fixed.** **Wrestling Bjorn could leave a mini-game running forever (Act II, "A Farmer's Life").** The bout ends, and Bjorn's
   next line comes 1.6 s later. If you press E on Bjorn in that gap, a second wrestling bout starts. His line then
   puts the game back into play, but `g.activity` keeps that second bout. From then on the raven's eye refuses to
   open (`Ravens.enterEye` checks `g.activity`), so **"See what Mjöll saw" (Smoke on the Ridge) can't be done**
   until the page is reloaded. Anything else that checks for an activity is probably blocked too.
   *Fixed:* Bjorn starts the bout only once (`act2.js`). Also, when the next story step begins, a mini-game that is
   still registered but no longer on screen is closed (`systems.js`, `Quests.enter`). Reproduced headless before the
   fix, gone after.
2. **Safety net added.** **Gorm's death never comes (Act VII, "Gorm, the Right Hand"). Seen once in two tries.** In the middle of the duel
   the shore chapter's state was cleared: `clear()` set `gd = null`, hid Gorm and removed his fighter state.
   `gormFalls` then returns early because `gd` is null, so `a7gorm` never fires. Re-entering the step and fighting
   again worked. The trigger wasn't found. *Added:* if Eirik is at Gorm's step, in play, and neither Gorm's scene nor
   his duel is set up, the step is set up again after 1.5 s (`act7_shore.js`, `update`). Tested by wiping the duel by
   hand: Gorm stands up again at full health and the fight goes on.

## Bugs

3. **Fixed.** **The wooden-sword dodge lesson can't be finished by rolling clear (Act I, "Wooden Swords").** If Eirik rolls
   out of reach, Ragnar's blow is counted as `missed` (more than 2.5 m away), and the step only counts `dodged`.
   A roll only counts if Eirik is still within reach while invulnerable. About 100 s of sideways and plain rolls at
   four timings counted none. *Fix:* in `ensureSpar` / `Sparring`, count `missed` as `dodged` when Eirik rolled
   within the last ~0.8 s.
   *Fixed:* a blow he rolled clear of within the last 0.8 s counts as a dodge (`Sparring`). Tested: two backward rolls, two dodges; on the old code seven rolls gave one.
4. **Fixed.** **The pier marker is 22 m from the spot that sends the boat off (Act II, "The Peddlers", "See them off at the
   pier").** The boat leaves only when Eirik is within 9 m of `B(0, 240)`, but the marker sits about 22 m short of
   that. Stand on the marker and nothing happens (`act2_winter.js`, `row()` trigger).
   *Fixed:* the marker is on the pier beside the boat, and the boat leaves within 12 m of it. Tested: standing on the marker sends them off.
5. **Fixed.** **Hints from earlier steps stay on screen.** *Correction:* the hint box hides itself by dropping a CSS
   class but keeps its old text, and my playtest script read that text, so not every case below was really on
   screen. Confirmed on screen: the barn countdown at the peddlers (a countdown that is redrawn every frame, stops
   when its step ends, and is never cleared). The hall's "Walk out. 45" countdown works the same way. *Fixed:* the
   hint box is cleared whenever a main story step begins; each step sets its own hint. The cases as the script read
   them:
   - The barn countdown ("The barn roof is going. The children are in the hayloft. 85") is still showing two
     weeks later at the peddlers.
   - "The roof is coming down. Walk out. 45" is still showing on Svartøy's shore three days after the hall.
   - Raven-eye instructions show at the tithe riders, Torvald's arrival and the Council of Six.
   - Dive instructions show at the Sea-Raven feast.
   - "The horse follows where he is led" shows at the shield-wall drill.
   - The deck-fight hint shows at Gulen.
   - Bersi's quarry instructions show at "Four Hundred".
   - "Go back for them" shows at Kettil's bend.

   Clearing the hint box whenever a step begins would fix all of these at once.
6. **Fixed.** **Freydis takes the lamb that isn't with you (Act I ch. 3).** "Bring the lamb back to Freydis" counted while the
   lamb was 148 m behind Eirik. The talk should check that the lamb is close.
   *Fixed:* with the lamb more than 8 m from her, Freydis says "Where is she? Bring her here!" (zh and es added). Tested both ways.
7. **The Iron Shore shield wall has no marker (Act III).** After the beach volleys, Eirik stood alone in an empty
   field 38 m from the line. "Hold the shield wall" shows no marker, and the wall waits for him to stand in it.
8. **The closing panel uses developer wording.** THE END reads "That is the whole of the owner's story…" on the
   player's screen.
9. **The wrong person gets the talk prompt in crowded scenes.** Standing right in front of Ingrid in her hall, the
   prompt said "Talk to Gisli". The ever-present "Skull-Ringer" (the frying pan on its peg in Ravenhold) also
   competes with real prompts for the rest of the game.

## Possible bugs (seen once, need a check by hand)

10. **The Iron Shore wall stayed in "wait".** Their line never advanced, although the ditch charge that should call
    `wall.go()` had ended. Calling `go()` by hand released it. This may have come from the script's
    frame-stepping. Check by playing `q_shore.beach` → `wall` by hand.
11. **The Fedje looters didn't start.** Five raiders stood idle 2 to 4 m away, not set up as fighters, and "Take them"
    never began. The fight's flag was already off. Calling `fight()` again worked. Check by playing
    `q_six.trail` → `looters` by hand.
12. **Arrows may stop at the ship's rail or sail (Act VII archers).** One archer took three dead-on shots without
    falling; shots from another side killed him.

## Where to improve

**Getting lost:** several steps have no marker, or the marker isn't where the trigger is:

- the raid waves in Act II (six raiders stand about 50 m away and don't come)
- the Iron Shore line
- the six kings
- "Talk with every one of his companions" (they are spread 6 to 99 m apart, and only three are needed though it
  says "every one")
- the Hall of Wolves "speak" step
- Kettil's bend (the duel starts at 12.5 m, and the chapter drops Eirik at 13 m)

A marker on the next person or the next spot would fix all of these.

**Night doesn't look like night:**

- The Act I raid (02:36) looks like a sunset, with an orange sun-like glow low on the horizon and bright snow.
- The hunting-camp sneak (23:42) looks like an overcast afternoon.
- The stranger "that evening" (16:10) is in full daylight.

Stealth at night would read better with real darkness and torchlight.

**Camera framing in scenes:**

- "Are you a troll?": Bjorn's back fills the frame.
- Kettil's hand at the gate: Eirik's head hides the cut.
- Kettil's tithe close-up: his forehead is cut off and the dialogue box covers his chin.
- The tannery: the talk prompt sits on the narration subtitle.
- Long narration lines cover the lower half of the screen.

**Faces and props:**

- Kettil's 3D face is clean-shaven and plain, while his portrait has a short red beard.
- Fur shoulder pads look like grey lumps.
- The long hearth in the Hall of Wolves is a flat orange slab with no flames.
- "Håkon keeps eating" at a bare table, without moving.
- The Twins over Leif's hearth are two flat blue planks.
- In the final rising shot the sea reads as grey-brown corrugated sand, with blue specks in a corner.

**The crowning is small:** "the greatest Thing anyone has ever seen" is about twenty people standing in a field, and
the law-rock isn't in frame.

**Champions felt short for an average player (bot results).** All won by the average bot unless noted:

| Champion | Time | Eirik's health |
|---|---|---|
| Arne | 9 s | lost 9 |
| Ulf (Act III, ends at 55%) | 10 s | unhurt |
| Ulf (Act VII) | 27 s | 80 left |
| Eydis | 17 s | 68 left |
| Bersi ("the hardest fight of Eirik's life") | — | never below 75 |
| Vigdis | — | 65 left |
| Kettil | — | 50 left |

Rurik, Skarde, Gorm and Håkon held up better: the average bot died against Håkon with him at 22%, and the good bot
won.

**Repetition:** the walls chapter is the same gold-mark mini-game 14 times in a row (ditch, latrine, posts, tower).

**Restarting after a failure:** each "Caught" or "Fallen" reloads the whole page and stops at "press any key"
(about 10 s per retry). In Act I's escape, the restore point sits on a patrol's path, so standing still for 15 to 20 s
gets you caught again.

**Smaller things:**

- Act I chapter 1 still has five made-up dialogue choices; only chapter 3's were removed.
- The title painting shows the raid before the warm day.
- The fishing and skald side quests stay on the tracker during the night escape.
- The she-wolf narration says "outside the firelight" while she appears at the deer kill in daylight.
- The Stormguard lesson says "everything slowed" but nothing slows.
- On a narrow window the controls hint overlaps the "New Quest" banner.

## What worked

The whole story plays from the first morning to THE END in one save, and every act's end screen continues into the
next. These all worked:

- Act I's new scenes: the stranger, the raid lines, Kettil's hand, the she-wolf's snare, Kettil's lie, Old Hrefna,
  the stick and the little shield, the Seven Seats.
- Every raven-eye search and marking.
- Every mini-game by its rules: the woodpile, fire, wrestling, shouted calls, knacks, the dive, the horse haul, Gulen
  on horseback.
- The shield walls, the Black Shore pushes and the deck fights.
- Every champion's special ending: Rurik's slip, Bersi's ledge, Vigdis's rhythm, Håkon's last blow.
- The epilogue.

## Not tested

- Stealth through Act I's escape and Act II's trackers, and the river ice.
- Walking the paths between markers.
- Real mouse-and-keyboard feel, gamepad, audio.
- Chinese and Spanish.
- The open world after THE END.
