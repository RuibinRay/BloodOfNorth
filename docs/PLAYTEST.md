# The 0.30 playtest pass

0.30 is done when three people have played everything built, without help, and their play has been used to tune it.
The game now records that play, and a stand-in player checks the champion fights before people meet them.

## For a tester

1. Open the game (https://ruibinray.github.io/BloodOfNorth/) in Chrome, Edge or Safari, with a mouse or a gamepad.
   Choose English, 中文, 日本語 or Español in the top right corner of the main menu.
2. **New Game**, and play. If you run out of time, any chapter can be started from **Start at an Act**.
3. Whenever something is unclear, unfair, too easy, too slow, broken or just good: press **F8**, type a line, press
   Enter. The note is kept with the step you were on, where you stood and a small picture of the screen.
4. When you stop: **Esc → Playtest → Download the report**, and send the file back. It holds how long each step took,
   how often Eirik fell there and to whom, and your notes. Nothing is sent anywhere by the game itself.

The record lives in that browser only, apart from the saves; **Start a new record** clears it.

## For whoever reads the reports

The top of each file lists the steps that took more than ten minutes or three falls, then the notes, then every
step. The data under `--- data ---` is the full record (JSON). Steps marked "not passed" are where someone stopped.

## The champion fights, played by the stand-in

`node tools/fights.mjs [ids|all] [fights per level] [levels]` fights every champion with a stand-in player at three
levels of skill. It plays through the game's own inputs, notices a swing with a human delay and mistimes by a set
spread; a novice misses more and rarely calls the black raven, a good player parries and uses the Stormguard. It
also follows an objective the hint gives it when a champion cannot be cut down (Bersi's quarry ledge). It says
whether a fight can be won and what hurts; it cannot say whether it is fun.

Measured 2026-11-14 (3 fights per level unless noted; wins):

| Champion | Novice | Average | Good | Notes |
|---|---|---|---|---|
| Kettil (the raid) | 2/3 | 3/3 | 3/3 | |
| Arne Longshot | 3/3 | 3/3 | 3/3 | |
| Ulf (Iron Shore) | 3/3 | 3/3 | 3/3 | he breaks off, as the story has it |
| Rurik Shieldsplitter | 2/3 | 3/3 | 3/3 | |
| Skarde Bear-Maw | 0/3 | 3/3 | 3/3 | the lie: anger shuts out the Stormguard |
| Eydis the Mire | 5/6 | 6/6 | 3/3 | was over in 7 s if the raven came first: fixed |
| Bersi Black-Anvil | 1/2 | 2/2 | 2/2 | only on the quarry ledge, as the hint says |
| Ulf Two-Blades | 3/3 | 3/3 | 3/3 | |
| Kettil (the bend) | 2/3 | 3/3 | 3/3 | |
| Vigdis Quickblood | 2/3 | 3/3 | 3/3 | |
| Gorm Stone-Lung | 0/6 | 3/6 | 3/3 | the hardest with Håkon, by design |
| Håkon Ironwolf | 0/6 | 6/6 | 3/3 | the last one; varies from run to run |
