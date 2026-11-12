// Open-world PROTOTYPE (after Act II, Chapter 1). A sandbox to prove the systems, not story content:
// ride from Bjornstead to the shore, row to two islands, trade, break or keep the law, and earn standing
// until a district calls Eirik king. See docs/OPEN_WORLD.md for the full design this is a first slice of.
import { POI } from '../world/layout.js';
import { heightAt } from '../world/terrain.js';
import { shared } from '../world/geo.js';
import { CAST, RAIDER_LOOKS, QUESTS, ITEMS } from '../data/act1.js';
import { CAST2 } from '../data/act2.js';
import { EIRIK_ADULT } from '../entities/player.js';
import { Law, Mounts, MARK_NAMES } from '../systems/openworld.js';
import { SeaChart } from './sea_chart.js';
import { Fleet } from './fleet.js';
import { SeaWar } from './seawar.js';
import { Champions } from './champions.js';
import { Ambient } from '../systems/ambient.js';
import { angleDiff } from '../core/util.js';

Object.assign(ITEMS, {
  shield: { name: 'Linden shield', desc: 'Carried in the off hand beside the axe. Blocking costs less breath, arrows stop on it, and a shove with the boss breaks a man\'s rhythm.', cat: 'Weapon' },
  silver: { name: 'Hacksilver', desc: "Cut silver, weighed, not counted. It buys arrows, passage, and a dead man's blood-price.", cat: 'Coin' } });
Object.assign(QUESTS, {
  q_open: {
    title: 'The Whale Road', kind: 'main', xp: 0, next: null,
    desc: 'Prototype of the open world: a horse, a boat, two islands, the law, and what people call you.',
    steps: [
      { id: 'horse', text: "Mount the horse in Bjorn's yard", type: 'event', key: 'mounted_horse', marker: { dyn: 'horse' } },
      { id: 'shore', text: 'Ride to the landing beach at Hrafnvik', type: 'reach', key: 'shore', marker: { poi: 'dock' } },
      { id: 'boat', text: 'Board the rowing boat', type: 'event', key: 'mounted_boat', marker: { dyn: 'boat' } },
      { id: 'gulen', text: 'Row out to Gulen, the law-island', type: 'reach', key: 'gulen', marker: { poi: 'gulen' } },
      { id: 'law', text: 'Speak with the lawspeaker at the law-rock', type: 'talk', key: 'law', marker: { npc: 'law' } },
      { id: 'free', text: 'The Vestland is open: trade, help Bulandet, keep the law or break it', type: 'event', key: 'sandbox' },
    ],
  },
});
const PRICE = { hare: 4, fish: 3, venison: 6, hide: 10 };
/** What the traders sell. `once`: only while he does not own one. */
const WARES = {
  arrows: { t: 'Ten arrows', cost: 8, give: ['arrow', 10], line: 'Ash shafts, goose feather. They fly true.' },
  shield: { t: 'A linden shield', cost: 20, give: ['shield', 1], once: true, line: 'Linden boards, a rawhide rim and an iron boss. It will turn an arrow, and it hits harder than it looks.' },
  spear: { t: 'An ash spear', cost: 25, give: ['spear', 1], once: true, line: 'Eight feet of ash and a hand of iron. Nobody gets close who you do not want close.' },
  sword: { t: 'A sword', cost: 45, give: ['sword', 1], once: true, line: 'Frankish steel, or the man who sold it to me said so. It is quick, whatever it is.' },
  longaxe: { t: 'A long axe', cost: 60, give: ['longaxe', 1], once: true, line: 'Two hands and no shield. Men who carry these do not expect to need one.' },
  twin: { t: 'Twin seaxes', cost: 50, give: ['twin', 1], once: true, line: 'One for each hand. You will not block much, but you will not need to stand still either.' },
  maul: { t: 'A war maul', cost: 70, give: ['maul', 1], once: true, line: 'It was a smith\'s before it was a soldier\'s. It does not care which.' },
  throwaxe: { t: 'Four throwing axes', cost: 10, give: ['throwaxe', 4], line: 'They turn once in ten paces. Count your paces.' },
};
const STOCK = { merchant: ['arrows', 'shield', 'spear', 'maul', 'throwaxe'], trader: ['arrows', 'shield', 'sword', 'twin', 'longaxe', 'throwaxe'] };
/** The kinds of fighter beyond the ordinary: what they are called and how they are armed (see systems/combat.js). */
export const KINDS = {
  archer: { tag: ' archer', opts: { hp: 60, dmg: 9, skill: 0.2, kind: 'archer' } },
  shield: { tag: ' shield-bearer', opts: { hp: 120, skill: 0.6, kind: 'shield' } },
  berserk: { tag: ' berserker', opts: { hp: 70, dmg: 13, kind: 'berserk' } },
};
const dist = (p, x, z) => Math.hypot(p.x - x, p.z - z);

export class OpenProto {
  constructor(game, act) {
    this.g = game; this.act = act; this.built = false; this.folk = []; this.t = 0; this.saveT = 0; this.huntT = 0; this.hunters = null; this.task = null; this.traded = {};
    this.sea = new SeaChart(game, this);
    for (const k in this.sea.steps) this.steps[k] = (r) => this.sea.steps[k].call(this.sea, r);
    this.fleet = new Fleet(game, this);
    for (const k in this.fleet.steps) this.steps[k] = (r) => this.fleet.steps[k].call(this.fleet, r);
    this.life = new Ambient(game, this);    // the people of the great islands, brought in round him as he moves
    this.table = new Champions(game, this); // the Wolf's table: the story's seven champions, the two hands, and Håkon
    for (const k in this.table.steps) this.steps[k] = (r) => this.table.steps[k].call(this.table, r);
    this.war = new SeaWar(game, this);
    for (const k in this.war.steps) this.steps[k] = (r) => this.war.steps[k].call(this.war, r);
  }
  get st() { return this.g.state; }
  npc(id) { return this.g.npcs.get(id); }

  build() {
    if (this.built) return;
    this.built = true;
    const g = this.g, A = this.act, p = g.player, st = this.st, inv = g.inventory;
    st.stage = 'open';
    for (const n of g.npcs.values()) { n.visible = false; n.talk = null; }
    A.cookFire.on = A.greenFire.on = A.forgeFire.on = A.campFire.on = false;
    A.chimneys.forEach((c) => { c.on = false; });
    for (const id of ['bjornstead', 'gulenhall']) { const i = g.world.smoke.findIndex((s) => s.id === id); if (i >= 0) A.chimneys[i].on = true; }
    A.glowTarget = 0; g.sky.fireGlow = 0; A.snowTarget = 0; shared.uSnow.value = 0;
    A.wTarget = { snow: 0, fog: 0.005, overcast: 0.12, wind: 1 }; Object.assign(g.sky.weather, A.wTarget);
    A.tracks.visible = false; g.audio.setMusic('day');
    for (const [x, z] of [[POI.farmFire.x, POI.farmFire.z], [-58, 258], [62, 281]]) g.fx.addFire(x, heightAt(x, z) + 0.15, z, 0.5);

    p.setLook(EIRIK_ADULT, true); p.mortal = true; st.flags.axeHidden = false;
    for (const id of ['father_axe', 'bow']) if (!inv.has(id)) inv.add(id, 1, true);
    if (inv.count('arrow') < 12) inv.add('arrow', 12 - inv.count('arrow'), true);
    if (!st.open) { st.open = { marks: 0, standing: 30, cool: 0, horse: [155.5, -131], boat: null, on: null }; if (inv.count('silver') < 40) inv.add('silver', 40 - inv.count('silver'), true); }
    if (!st.open.sk) st.open.sk = { marks: 0, standing: 15, cool: 0 }; // the Skerries: a second law-district
    if (!st.open.seen) st.open.seen = {};
    p.showBackAxe(true); g.ravens.setMode('follow');

    this.law = new Law(g); this.law.onChange = (now, before) => this.marksChanged(now, before);
    this.mounts = new Mounts(g);
    const o = st.open, h = this.mounts.spawnHorse(...o.horse);
    const b = o.boat ? this.mounts.spawnBoat(...o.boat) : this.mounts.spawnBoat(POI.dock.x, Mounts.deepWater(POI.dock.x, 172, 240) + 1.5, 0);
    if (o.on === 'boat') this.mounts.mount(b); else if (o.on === 'horse') this.mounts.mount(h);

    // people: the family at home, the folk of the two islands
    const mk = (...a) => this.person(...a);
    mk('bjorn', 'Bjorn', CAST2.bjorn.look, 157, -133.4, -2.4, { law: false, role: 'kin' });
    mk('signe', 'Signe', CAST2.signe.look, 144.6, -137.9, 0.8, { law: false, role: 'kin', loop: 'cook' });
    mk('freydis', 'Freydis', CAST2.freydis.look, 151.8, -141, -2.2, { law: false, role: 'kin' });
    mk('law', 'Hallvard the Lawspeaker', CAST.gunnar.look, POI.lawRock.x - 1.6, POI.lawRock.z + 1.7, 2.6, { role: 'law' });
    mk('merchant', 'Asgerd', CAST.asa.look, -56.6, 260.2, 2.4, { role: 'merchant' });
    mk('folk0', 'Ivar Ferryman', CAST.odd.look, -45, 263.5, 1.2, { loop: 'fish', hold: 'rod' });
    mk('folk1', 'Havard', CAST.farmer1.look, -62, 271, 0.4, { weapon: 'spear', loop: 'guard', hold: 'spear' });
    mk('fisher0', 'Gudrun', CAST.farmer2.look, 60.4, 279.4, -1.0, { role: 'task' });
    mk('fisher1', 'Kol', CAST.farmer1.look, 65.5, 284.6, 1.8, { loop: 'fish', hold: 'rod' });
    mk('fisher2', 'Old Njal', CAST.hrolf.look, 57.6, 284.6, 0.9, { loop: 'sit' });

    g.events.on('playerSwing', (n, heavy) => this.swingAtFolk(heavy));
    g.events.on('playerDied', () => this.fail());
    g.events.on('mounted', (type) => g.quests.notify('event', 'mounted_' + type));
    this.sea.build(); this.fleet.build(); this.war.build(); this.table.build();
  }
  /** One of the people of the open world. o2: role, loop, hold, weapon, line, port; law:false keeps them out of the law. */
  person(id, name, look, x, z, yaw, o2 = {}) {
    const n = this.g.addNPC(id, { name, look }); n.teleport(x, z, yaw);
    n.baseLoop = o2.loop || null; n.setLoop(n.baseLoop); n.weapon = o2.weapon || null; n.hp = 3; n.role = o2.role || 'folk'; n.home = [x, z];
    n.line = o2.line || null; n.port = o2.port || null;
    if (o2.hold) n.h.hold('R', o2.hold);
    n.talk = () => this.talk(n);
    if (o2.law !== false) this.folk.push(n);
    return n;
  }
  onSave() {
    const m = this.mounts, o = this.st.open;
    if (!this.built || !o) return;
    o.horse = [m.horse.pos.x, m.horse.pos.z]; o.boat = [m.boat.pos.x, m.boat.pos.z, m.boat.yaw]; o.on = m.on ? m.on.type : null;
    this.fleet.onSave();
  }
  dyn(k) {
    if (k === 'hound' || k === 'tooth') { const f = this.war.foe(k); return f ? { x: f.pos.x, z: f.pos.z, y: 5 } : null; } // a hostile ship
    const m = this.mounts && this.mounts[k]; return m ? { x: m.pos.x, z: m.pos.z, y: m.pos.y + 2.4 } : null;
  }
  /** Start a dialogue built at runtime. */
  say(tree, npc, onEnd) { this.g.dialogue.trees.__open = tree; this.g.dialogue.start('__open', { npc, onEnd }); }

  // ---- conversations -------------------------------------------------------------------
  talk(n) {
    const g = this.g, tier = this.law.tier();
    if (n.role === 'law') return this.lawTalk(n);
    if (n.role === 'seer') return this.sea.seerTalk(n);
    if (n.role === 'hermit') return this.sea.hermitTalk(n);
    if (tier.name === 'Wolf') { n.say(tier.hail, 3); return; }
    if (n.role === 'ferry') return this.sea.ferryTalk(n);
    if (n.role === 'merchant') return this.merchantTalk(n);
    if (n.role === 'task' && !this.st.flags.bulandetDone && !this.task) return this.taskTalk(n);
    if (this.fleet.recruitable(n)) return this.fleet.recruitTalk(n);
    if (n.role === 'kin') { n.say(g.fmt({ bjorn: 'Take the bay mare. And come back with all your fingers, {n}.', signe: 'Eat before you go. The sea is hungry enough for both of you.', freydis: 'If {b} steals from the islanders, you are paying for it.' }[n.id]), 4); return; }
    n.say(g.fmt(n.line && tier.min >= 15 && Math.random() < 0.6 ? n.line : tier.hail), n.line ? 5 : 3.5);
  }
  /** The keeper of the law in whichever district this is: Hallvard on Gulen, Ragnhild on Kinn. */
  lawTalk(n) {
    const g = this.g, s = this.law.s, D = this.law.def, inv = g.inventory, L = n.name, E = 'Eirik', silver = inv.count('silver'), cost = s.marks * 25;
    const kin = n.id === 'reeve', work = kin ? this.sea.reeveWork() : this.table.offer(), flag = kin ? 'metReeve' : 'metLaw', king = kin ? 'kingOfSkerries' : 'kingOfGulen';
    let tree;
    if (s.marks > 0) tree = [
      { s: L, t: `You carry ${s.marks} wolf-mark${s.marks > 1 ? 's' : ''} in ${D.local}, {n}: ${MARK_NAMES[s.marks].toLowerCase()}. The law offers two roads. Silver, or the hide.` },
      { s: E, t: '', choices: [
        { t: `Pay the blood-price: ${cost} silver (you carry ${silver})`, to: silver >= cost ? 'paid' : 'poor', fx: silver >= cost ? { do: () => { inv.remove('silver', cost, true); this.law.clear(`The blood-price is paid. No man in ${D.local} may name you wolf.`); } } : null },
        { t: "Demand the hide-duel against the accuser's champion", to: 'holm', fx: { do: () => { this.pendingHolm = n; } } },
        { t: '"Not today."', to: 'end' },
      ] },
      { id: 'paid', s: L, t: 'Weighed and witnessed. Go in peace, and try to stay in it.', to: 'end' },
      { id: 'poor', s: L, t: 'That is not enough silver. Sell what you carry, or choose the hide.', to: 'end' },
      { id: 'holm', s: L, t: `Then it is the hide. ${D.champion.split(' ')[0]}! Fetch your axe. First blood does not end it.` },
    ];
    else tree = [
      { s: L, t: work.intro || (this.st.flags[flag] ? 'No man here names you wolf, {n}.' : kin
        ? 'A white raven, and a Vestland boat. I am Ragnhild; I hold the Skerries for whoever is strong enough to ask me to. So far nobody has asked well.'
        : 'So you are the one with the white raven. I am Hallvard. I keep the law on Gulen: what is sworn, what is owed, and who is a wolf.'), fx: { flag } },
      { s: E, t: '', choices: [
        { t: '"What is the law here?"', to: 'law' },
        ...(work.choices || []),
        { t: `"Would the folk of ${D.seat} swear to me?" (standing ${Math.round(s.standing)} of 80)`, to: s.standing >= 100 ? 'king' : s.standing >= 80 ? 'swear' : 'notyet', fx: s.standing >= 80 && s.standing < 100 ? { do: () => { this.st.flags[king] = true; this.law.addStanding(100, `The folk of ${D.seat} swear to you`); } } : null },
        { t: '"Nothing. Keep well."', to: 'end' },
      ] },
      { id: 'law', s: L, t: kin
        ? 'The same as any law, with more water in it. Harm a man where others see, and you carry a wolf-mark. But the marks you earned in the Vestland are the Vestland\'s business, unless you earned enough of them that the boats talk.'
        : 'Harm a man where others can see and you earn a wolf-mark. One is a fine. Two, and the islands raise the hue and cry. Three, and men come hunting the price on you. Pay the blood-price here, win the hide-duel, or keep out of sight until talk dies.', to: 'end' },
      { id: 'notyet', s: L, t: kin
        ? 'Not yet. Out here a name is worth what it has done. Put out the fire on Batalden. Light the one on Skorpa. Trade fair with Gyda.'
        : 'Not yet. They know your name, not your worth. Help the fishers on Bulandet. Trade fair. Be seen to be generous.', to: 'end' },
      { id: 'king', s: L, t: 'They have sworn already, my king. A second oath is worth less than the first.', to: 'end' },
      { id: 'swear', s: L, t: `Then hear it, ${D.seat}! This is Eirik Ravensson. By rock and by ring, he is our king, and we are his folk.`, to: 'end' },
      ...(work.nodes || []),
    ];
    this.say(tree, n, () => { g.quests.notify('talk', n.id); if (work.after) work.after(); if (this.pendingHolm) { const at = this.pendingHolm; this.pendingHolm = null; this.holmgang(at); } });
  }
  merchantTalk(n) {
    const g = this.g, inv = g.inventory, M = n.name, silver = inv.count('silver');
    const worth = Math.ceil(Object.keys(PRICE).reduce((a, k) => a + inv.count(k) * PRICE[k], 0) * (g.skills.has('h_skin') ? 1.5 : 1)); // Skinner's Price
    const gear = (STOCK[n.id] || STOCK.merchant).filter((k) => !WARES[k].once || !inv.has(k)); // what this trader keeps, less what he already owns
    this.say([
      { s: M, t: `${M}. I buy what the land gives and sell what it cannot. What have you?` },
      { s: 'Eirik', t: '', choices: [
        { t: `Sell game and hides (${worth} silver)`, to: worth > 0 ? 'sold' : 'none', fx: worth > 0 ? { do: () => { for (const k in PRICE) if (inv.count(k)) inv.remove(k, 999, true); inv.add('silver', worth); if (!this.traded[this.law.id]) { this.traded[this.law.id] = true; this.law.addStanding(5, 'Fair trade'); } } } : null },
        { t: 'Arrows and war-gear', to: 'gear' },
        { t: "Give 20 silver to the hall's winter stores", to: silver >= 20 ? 'gift' : 'poor', fx: silver >= 20 ? { do: () => { inv.remove('silver', 20, true); this.law.addStanding(12, 'A gift to the hall'); } } : null },
        { t: '"Nothing today."', to: 'end' },
      ] },
      { id: 'sold', s: M, t: 'Fair weight. Come again.', to: 'end' },
      { id: 'none', s: M, t: 'You carry nothing I can sell. Hunt, fish, come back.', to: 'end' },
      { id: 'gear', s: 'Eirik', t: '', choices: [...gear.map((k) => ({ t: `${WARES[k].t} (${WARES[k].cost} silver)`, to: silver >= WARES[k].cost ? 'w_' + k : 'poor', fx: silver >= WARES[k].cost ? { do: () => this.buyWare(k) } : null })), { t: '"Nothing from that pile."', to: 'end' }] },
      ...gear.map((k) => ({ id: 'w_' + k, s: M, t: WARES[k].line, to: 'end' })),
      { id: 'gift', s: M, t: 'That will be remembered, {n}. People here remember.', to: 'end' },
      { id: 'poor', s: M, t: 'Your purse says otherwise.' },
    ], n);
  }
  buyWare(k) {
    const g = this.g, inv = g.inventory, w = WARES[k];
    inv.remove('silver', w.cost, true); inv.add(w.give[0], w.give[1]);
    if (k === 'shield') g.after(0.5, () => g.ui.hint('With a weapon drawn, hold {block} to raise the shield: it stops arrows and blocking costs less. {attack} while blocking shoves with the boss. {weapon3} swaps shield and second axe.'));
    else if (k === 'throwaxe') g.after(0.5, () => g.ui.hint('{throw} throws an axe at the man you are facing. It stops a swing and shakes a guard. One that misses can be picked up.'));
    else if (k !== 'arrows') g.after(0.5, () => g.ui.hint('{weapon1} draws your weapon; press it again to step through the ones you carry. Each fights differently: the inventory says how.'));
  }
  taskTalk(n) {
    this.say([
      { s: n.name, t: "You are the Ravensson. Then hear this. Two of the Ironwolf's tithe-takers sit on our north shingle, eating our catch and calling it tax." },
      { s: 'Eirik', t: '', choices: [
        { t: '"I will speak to them. With this."', to: 'go', fx: { do: () => this.startTask() } },
        { t: '"That is not my quarrel."', to: 'end' },
      ] },
      { id: 'go', s: n.name, t: 'Past the racks, on the stones. And {n}: nobody on this island will have seen a thing.' },
    ], n);
  }

  // ---- fights -----------------------------------------------------------------------------
  fighter(id, name, look, x, z, weapon, opts) {
    const g = this.g, n = g.npcs.get(id) || g.addNPC(id, { name, look });
    const kind = opts && opts.kind;
    n.revive(); n.visible = true; n.teleport(x, z, 0);
    n.h.hold('R', kind === 'archer' ? 'smallaxe' : weapon); n.h.hold('L', kind === 'archer' ? 'bow' : kind === 'berserk' ? null : 'shield');
    g.player.mortal = true;
    return g.combat.add(n, { smart: true, ...opts }); // everyone out here has fought before: they adapt
  }
  startTask() {
    const c = POI.bulandet;
    this.task = [0, 1].map((i) => this.fighter('tithe' + i, 'Tithe-taker', RAIDER_LOOKS[i], c.x - 3 + i * 5, c.z - 15, i ? 'spear' : 'axe', { hp: 110 }));
    this.g.audio.setMusic('raid');
  }
  holmgang(by) {
    const g = this.g, x = by.pos.x + 7.5, z = by.pos.z + 3.3, who = this.law.def.champion, first = who.split(' ')[0];
    this.fighter('champ_' + this.law.id, who === first ? who + ' the Champion' : who, RAIDER_LOOKS[2], x, z, 'axe', { hp: 240, dmg: 17, skill: 0.65, boss: true, rageLine: 'You fight like a king. Kings bleed too!',
      onDown: (e) => { e.die(); g.combat.clear(); g.audio.setMusic('day'); this.law.clear(`${first} yields the hide. Your marks are struck out.`); this.law.addStanding(15, 'You won the hide-duel'); } });
    g.audio.setMusic('raid');
  }
  spawnHunters() {
    const g = this.g, p = g.player.pos;
    let spot = null;
    for (let a = 0; a < 6.28 && !spot; a += 0.5) { const x = p.x + Math.cos(a) * 20, z = p.z + Math.sin(a) * 20; if (heightAt(x, z) > 0.4) spot = [x, z]; }
    if (!spot) return false;
    this.hunters = [0, 1].map((i) => this.fighter('hunter' + i, i ? 'Bounty-hunter archer' : 'Bounty-hunter', RAIDER_LOOKS[(i + 2) % 4], spot[0] + i * 1.5, spot[1], i ? 'sword' : 'axe', i ? { ...KINDS.archer.opts } : { hp: 120, dmg: 15 }));
    g.ui.subtitle('Bounty-hunter', "There. The white raven. That's the one worth silver.", 4); g.audio.play('shout'); g.audio.setMusic('raid');
    return true;
  }
  /** Eirik's blade lands on someone who was not fighting him. */
  swingAtFolk(heavy) {
    const g = this.g, p = g.player;
    if (this.st.stage !== 'open' || !this.built) return;
    for (const f of this.folk) {
      if (f.dead || !f.visible || f.cb || f.dist(p) > 2.3) continue;
      if (Math.abs(angleDiff(p.yaw, Math.atan2(f.pos.x - p.pos.x, f.pos.z - p.pos.z))) > 1.05) continue;
      f.hp -= heavy ? 2 : 1; f.h.play('stagger', 0.4); g.audio.play('arrowHit'); g.fx.burst('blood', f.pos.x, f.pos.y + 1.2, f.pos.z, 5);
      const killed = f.hp <= 0;
      if (killed) f.die();
      this.law.crime(killed ? 'killing' : 'assault', f.pos, this.folk);
      if (!killed) { if (f.weapon) this.makeHostile(f); else { f.talk = null; f.setLoop(null); f.goTo(f.pos.x + (f.pos.x - p.pos.x) * 4, f.pos.z + (f.pos.z - p.pos.z) * 4, { run: true }); g.audio.play('shout'); } }
      return;
    }
  }
  makeHostile(f) {
    if (f.cb || f.dead) return;
    f.h.hold('R', f.weapon || 'axe'); f.say("Wolf's-head! To me! Take him!", 3); this.g.audio.play('shout');
    this.g.player.mortal = true; this.g.combat.add(f, { hp: 80 }); f.wasFolk = true;
  }
  marksChanged(now) {
    if (now === 0) { // the law is satisfied: those still standing put up their weapons
      for (const f of this.folk) if (f.cb && !f.dead && f.wasFolk) { const i = this.g.combat.enemies.indexOf(f); if (i >= 0) this.g.combat.enemies.splice(i, 1); f.cb = null; f.mode = 'idle'; f.setLoop(f.baseLoop); f.h.setLoop(f.baseLoop); f.talk = () => this.talk(f); f.hp = 3; }
      if (!this.g.combat.alive().length) this.g.combat.clear();
      this.hunters = null; this.huntT = 0;
    }
  }
  fail() {
    const g = this.g, A = this.act;
    if (A.failing) return;
    A.failing = true; g.player.frozen = true; g.player.h.play('fall', 1.2, { onEnd: () => { g.player.loopOverride = 'dead'; } });
    g.ui.fade(true, 1.8).then(() => g.ui.card('Fallen', 'The sea keeps what it is given.', 3)).then(() => g.reloadCheckpoint());
  }

  steps = {
    'q_open.horse'(r) {
      const g = this.g;
      this.build();
      if (!r || !this.st.flags.openIntro) { this.st.flags.openIntro = true; g.ui.card('The Whale Road', 'Open-world prototype  ·  the Vestland', 4); }
      g.ui.hint('This is a sandbox to try the open-world systems. Start with the bay mare by the barn.');
    },
    'q_open.shore'() { this.build(); },
    'q_open.boat'() { this.build(); this.g.ui.hint('Dismount with {interact}. The boat is moored off the end of the landing; wade out and board it.'); },
    'q_open.gulen'() { this.build(); },
    'q_open.law'() { this.build(); this.g.ui.hint('The law-rock is the carved stone. Hallvard the Lawspeaker stands beside it.'); },
    'q_open.free'(r) {
      this.build();
      if (!this.g.quests.st.q_sea) this.g.quests.start('q_sea'); // the fjord is only the doorstep
      if (!r) this.g.ui.hint('Sell to Asgerd, help Gudrun on Bulandet (the island to the east), or see what the law does when you break it. South of Gulen the fjord opens to the sea: {sprint} in the boat sets the sail.');
    },
  };

  update(dt) {
    if (!this.built) return;
    const g = this.g, p = g.player, q = g.quests;
    this.t += dt;
    if (g.mode === 'play') g.sky.time = Math.min(16.4, g.sky.time + dt / 420);
    this.st.time = g.sky.time; p.warmth = 100; p.hunger = 100;
    this.law.update(dt); this.mounts.update(dt); this.sea.update(dt); this.fleet.update(dt); this.war.update(dt); this.table.update(dt); this.life.update(dt);
    const s = this.law.s; // the law of whichever district he is standing in
    if (q.at('q_open', 'shore') && dist(p.pos, POI.dock.x, POI.dock.z) < 28) q.notify('reach', 'shore');
    if (q.at('q_open', 'gulen') && dist(p.pos, POI.gulen.x, POI.gulen.z) < 44) q.notify('reach', 'gulen');

    const king = this.law.tier().name === 'King';
    for (const f of this.folk) {
      if (f.dead || f.cb || !f.visible) continue;
      const d = f.dist(p);
      if (s.marks >= 2 && f.weapon && d < 20 && !this.mounts.on) this.makeHostile(f); // hue and cry
      else if (king && f.mode === 'idle') f.setLoop(d < 6 ? 'kneel' : f.baseLoop);    // they kneel as he passes
    }
    if (s.marks >= 3 && !this.hunters && !this.mounts.on && g.mode === 'play') { this.huntT += dt; if (this.huntT > 22 && this.spawnHunters()) this.huntT = 0; }
    if (this.hunters && this.hunters.every((e) => e.dead)) { this.hunters = null; this.huntT = -40; if (!g.combat.alive().length) { g.combat.clear(); g.audio.setMusic('day'); } }
    if (this.task && this.task.every((e) => e.dead)) {
      this.task = null; this.st.flags.bulandetDone = true; if (!g.combat.alive().length) { g.combat.clear(); g.audio.setMusic('day'); }
      this.law.addStanding(25, 'Bulandet will remember'); g.inventory.add('silver', 20); this.npc('fisher0').say('Gone. Both of them. Eat with us tonight, Ravensson.', 4);
    }
    this.saveT += dt;
    if (this.saveT > 120 && !g.combat.active && !this.mounts.on && g.mode === 'play') { this.saveT = 0; g.autosave(); }
  }
}
