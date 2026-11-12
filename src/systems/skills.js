// Skill trees. Renown (state.xp) is earned by quests, discoveries, taken ships and fallen enemies; every
// POINT_EVERY renown is one skill point. Five trees, as the design names them, five skills each, learned in
// order. A skill is a rule the other systems ask about with game.skills.has(id): this file holds no effects,
// only what exists and what has been learned. Skills open when Eirik is grown; a boy's renown counts later.
// The sixth tree, Stormborn, is what the lightning left in him: skills he USES (a key each, paid for from the
// storm bar) rather than rules that are always on. `free` skills are his from the day he is grown; `key` names
// the input action that uses one. (The written story names four gifts; these are the game's extension of them.)
export const POINT_EVERY = 150;

export const TREES = [
  { id: 'berserker', name: 'Berserker', blurb: 'Aggression. Keep hitting.', skills: [
    { id: 'b_warm', name: 'Blood-Warm', cost: 1, desc: 'Every blow that lands gives back a little breath.' },
    { id: 'b_arc', name: 'Wide Arc', cost: 1, desc: 'A heavy blow reaches one more man.' },
    { id: 'b_cleave', name: 'Cleave', cost: 2, desc: "A heavy blow turned by a shield-bearer's guard still does half its harm." },
    { id: 'b_harvest', name: 'Red Harvest', cost: 2, desc: 'A finishing blow gives back breath and a little health.' },
    { id: 'b_mist', name: 'Red Mist', cost: 3, desc: 'Badly hurt, Eirik hits a third harder and a blow no longer staggers him.' },
  ] },
  { id: 'shieldmaster', name: 'Shieldmaster', blurb: 'Defence. Let them come to you.', skills: [
    { id: 's_turn', name: 'Turn Aside', cost: 1, desc: 'A longer moment in which a block is a parry.' },
    { id: 's_boss', name: 'Boss Strike', cost: 1, desc: 'The shield shove wears a guard much faster and is ready again sooner.' },
    { id: 's_answer', name: 'Answering Blow', cost: 2, desc: 'The riposte after a parry stays open longer and hits harder.' },
    { id: 's_wall', name: 'Wall', cost: 2, desc: 'Advance at a jog with the shield raised; arrows on it cost no breath.' },
    { id: 's_iron', name: 'Iron Guard', cost: 3, desc: 'Blocking with a shield costs half the breath, and running out of breath no longer opens the guard.' },
  ] },
  { id: 'hunter', name: 'Hunter', blurb: 'Bow, thrown axe, and the white raven.', skills: [
    { id: 'h_still', name: 'Still Hands', cost: 1, desc: 'The bow comes to full draw a third faster.' },
    { id: 'h_broad', name: 'Broadheads', cost: 1, desc: 'Arrows do far more harm to men.' },
    { id: 'h_axe', name: 'Axe-Hand', cost: 2, desc: 'Thrown axes hit harder and the next is in the hand sooner.' },
    { id: 'h_skin', name: "Skinner's Price", cost: 2, desc: 'Game and hides sell for half again as much.' },
    { id: 'h_far', name: 'Far Sight', cost: 3, desc: 'The white raven flies much further from Eirik and sights land from further off.' },
  ] },
  { id: 'warlord', name: 'Warlord', blurb: 'Leadership. The crew and the people.', skills: [
    { id: 'w_hand', name: 'Open Hand', cost: 1, desc: 'Everything that earns standing earns a quarter more.' },
    { id: 'w_brothers', name: 'Shield-Brothers', cost: 1, desc: 'The crew can take half again as much before they go down.' },
    { id: 'w_hands', name: 'Hard Hands', cost: 2, desc: 'The crew hit half again as hard.' },
    { id: 'w_rally', name: 'Rally', cost: 2, desc: 'Help a wounded crewman to his feet in the middle of a fight.' },
    { id: 'w_raven', name: 'Raven-Lord', cost: 3, desc: 'The black raven harries a man for longer and is ready again much sooner.' },
  ] },
  { id: 'wayfarer', name: 'Wayfarer', blurb: 'Endurance, travel and the ship.', skills: [
    { id: 'y_road', name: 'Long Road', cost: 1, desc: 'Sprinting drains breath far more slowly.' },
    { id: 'y_legs', name: 'Sea Legs', cost: 1, desc: 'Both boats sail faster and row faster.' },
    { id: 'y_rail', name: 'Shield-Rail', cost: 2, desc: "Arrows do much less harm to the Sea-Raven's hull." },
    { id: 'y_stem', name: 'Iron Stem', cost: 2, desc: 'A ramming blow breaks more of her and costs the Sea-Raven half as much.' },
    { id: 'y_wright', name: "Shipwright's Eye", cost: 3, desc: 'The crew can patch the hull most of the way without a ferryman.' },
  ] },
];
TREES.push({ id: 'stormborn', name: 'Stormborn', blurb: 'What the lightning left. Each is used with its own key and spends the storm bar.', skills: [
  { id: 'st_smash', name: 'Thunder Smash', cost: 0, free: true, key: 'art1', storm: 40, desc: 'Leap and bring the axe down. Lightning follows it: everyone within five paces is hurt, guards break, shield walls open, and a swing that has started is stopped.' },
  { id: 'st_step', name: 'Storm-Step', cost: 1, key: 'art2', storm: 25, desc: 'Go through the man in front of you between one heartbeat and the next, cutting as you pass, and come out behind him. Nothing can touch you on the way.' },
  { id: 'st_turn', name: 'The Turning Blow', cost: 2, desc: "Bjorn's log-splitting turn. A heavy blow thrown straight after the Stormguard or a parry becomes a full circle that no guard stops and that reaches every man around you." },
  { id: 'st_cry', name: 'Storm-Cry', cost: 2, key: 'art3', storm: 35, desc: 'A shout with thunder under it. Enemies within nine paces lose the blow they were about to throw, the crew take heart and mend, and Eirik\'s own anger goes out of him.' },
  { id: 'st_break', name: 'Stormbreak', cost: 3, key: 'art4', storm: 100, desc: 'Spend the whole bar. For eight breaths every blow hits a third harder and throws a spark of lightning into a second man.' },
] });
const INDEX = new Map();
for (const t of TREES) t.skills.forEach((s, i) => INDEX.set(s.id, { skill: s, tree: t, i }));

export class Skills {
  constructor(game) { this.g = game; this.seen = null; }
  get st() { const s = this.g.state; return s.skills || (s.skills = {}); }
  has(id) { return !!this.st[id] || (INDEX.has(id) && !!INDEX.get(id).skill.free && this.open()); }
  /** The skill's own data (cost in storm, key). */
  def(id) { return INDEX.get(id).skill; }
  /** Skills open with adulthood: a boy learns by doing. */
  open() { return !!this.g.player.adult; }
  earned() { return Math.floor(this.g.state.xp / POINT_EVERY); }
  spent() { let n = 0; for (const id in this.st) if (this.st[id] && INDEX.has(id)) n += INDEX.get(id).skill.cost; return n; }
  points() { return this.earned() - this.spent(); }
  /** 'has' | 'can' | 'locked' (the one before it is not learned) | 'poor' (not enough points) */
  state(id) {
    const d = INDEX.get(id);
    if (this.has(id)) return 'has';
    if (d.i > 0 && !this.has(d.tree.skills[d.i - 1].id)) return 'locked';
    return this.open() && this.points() >= d.skill.cost ? 'can' : 'poor';
  }
  learn(id) {
    if (!INDEX.has(id) || this.state(id) !== 'can') return false;
    this.st[id] = true;
    this.g.audio.play('questDone'); this.g.ui.questBanner('Skill learned', INDEX.get(id).skill.name);
    return true;
  }
  /** Say so once when a new point arrives. */
  update() {
    const g = this.g, e = this.earned();
    if (this.seen !== null && e > this.seen && this.open() && g.mode === 'play') g.ui.toast(`Renown ${g.state.xp}: a skill point to spend. ${g.input.label('skills')} opens your skills.`);
    this.seen = e;
  }
}
