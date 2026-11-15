// The story in the order it is played: each act, and the chapters (main quests) in it. The Acts menu lists these,
// and any chapter can be started from there with everything before it taken as played (Game.startAt).
// From Act II on, each quest is one chapter of the owner's story and carries its title. Act I was built before the
// story was written down in chapters, so its quests are smaller pieces of the story's first chapters.
export const ACTS = [
  { title: 'Act I · The Burning Snow', text: 'Eirik is nine. Hrafnvik, the night it burns, the winter alone, the Bear\'s house, two ravens, the lightning.',
    quests: ['q_morning', 'q_wood', 'q_hunt', 'q_fire', 'q_sword', 'q_supper', 'q_ashes', 'q_ice', 'q_alone', 'q_white', 'q_hearth', 'q_wings'] },
  { title: "Act II · The Farmer's Axe", text: 'Eirik is nineteen. Bjornstead: the raid, Kettil Red-Hand, the walls, Kaupang and the Sea-Raven.',
    quests: ['q_ten', 'q_farm', 'q_smoke', 'q_axe', 'q_wolf', 'q_peddlers', 'q_walls', 'q_captain', 'q_oath'] },
  { title: 'Act III · The Wolves of Iron', text: 'Eirik is twenty. Jarnøy: fifty from Ravenhold, the Battle of Iron Shore, Arne Longshot, Ulf Two-Blades.',
    quests: ['q_isle', 'q_fifty', 'q_healer', 'q_shore', 'q_long', 'q_ulf', 'q_iron', 'q_price'] },
  { title: 'Act IV · Blood Across the Sea', text: 'Eirik is twenty-two. The treasure ship, Rurik Shieldsplitter, Wessex, six islands burning, the council, Hedeby Sound.',
    quests: ['q_gold', 'q_water', 'q_court', 'q_circle', 'q_six', 'q_council', 'q_sound', 'q_drift'] },
  { title: 'Act V · The Broken Raven', text: 'Eirik is twenty-four. The hunger winter and the whale, the raven taken, the ring of Halfdan, Skarde Bear-Maw on Vængr, the cell, the feast.',
    quests: ['q_carry', 'q_hunger', 'q_taken', 'q_ring', 'q_wing', 'q_ribbon', 'q_feast'] },
  { title: 'Act VI · The Nine Oaths', text: 'Eirik is twenty-six. The marsh queen and Eydis the Mire, the last forge, Bersi Black-Anvil, the judgment of Torvald, nine oaths on one ring, a wedding before war.',
    quests: ['q_marsh', 'q_lastforge', 'q_anvil', 'q_smith', 'q_judge', 'q_sigurd', 'q_nine', 'q_wedding', 'q_four'] },
  { title: 'Act VII · The Raven King', text: 'Eirik is twenty-nine. Fire on the water and Ulf Two-Blades, the Black Shore, Kettil at the bend, Torvald at the pens, Vigdis on the burning bridge, Gorm at the gate, the Ironwolf in his hall, the law-rock at Gulen.',
    quests: ['q_firewater', 'q_blades', 'q_blackshore', 'q_redhand', 'q_pens', 'q_vigdis', 'q_gorm', 'q_wolfhall', 'q_ironwolf', 'q_dead', 'q_crown'] },
  { title: 'Epilogue · The Old Birch', text: 'Twelve years later. Eirik is forty-one. Ravenhold, the row of stones and the Thing-Ring; Leif\'s house; the walk up the hill with Little Brokk.',
    quests: ['q_ravenhold', 'q_leifhouse', 'q_lesson'] },
];
/** Every chapter of the story, in order. */
export const ORDER = ACTS.flatMap((a) => a.quests);
