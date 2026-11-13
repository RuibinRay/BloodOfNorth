// Does each figure in the world agree with its own portrait? (node tools/shot.mjs "(await import('/tools/check/looks.js')).report()")
// The portraits were painted from one line of description each (tools/art/plan.mjs); the figures are built from a
// `look` in the cast lists. This reads both and lists where they disagree: hair, beard, cloak, fur, helmet, mail, apron.
// Runs in the game's page, after the game has loaded (the cast lists fill each other in as the story modules load).
export async function report() {
const imp = (f) => import(/* @vite-ignore */ f);
const [{ ITEMS }, a1, a2, a3, a4, a5, a6, a7, a8, ch, pl] = await Promise.all(['/tools/art/plan.mjs', '/src/data/act1.js', '/src/data/act2.js', '/src/data/act3.js', '/src/data/act4.js', '/src/data/act5.js', '/src/data/act6.js', '/src/data/act7.js', '/src/data/epilogue.js', '/src/story/champions.js', '/src/entities/player.js'].map(imp));
const out = [], console = { log: (...a) => out.push(a.join(' ')) };
const looks = {};
for (const C of [a1.CAST, a2.CAST2, a3.CAST3, a4.CAST4, a5.CAST5, a6.CAST6, a7.CAST7, a8.CAST8]) for (const [k, v] of Object.entries(C)) if (v.look) looks[k] = v.look;
for (const f of ch.FOES) looks[f.id] = f.look;
if (pl.EIRIK_ADULT) { looks.eirik = pl.EIRIK_ADULT; looks.eirik_child = pl.EIRIK_CHILD; }
const D = { hairStyle: 'short', beard: null, hair: 0x6b4a2b, tunic: 0x6f6048, trim: 0x8a2f25, cloak: null };
const name = (hex) => {
  if (hex == null) return '-';
  const r = hex >> 16, g = (hex >> 8) & 255, b = hex & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, s = mx === mn ? 0 : (mx - mn) / (l > 0.5 ? 510 - mx - mn : mx + mn);
  let h = 0; if (mx !== mn) { h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; h = (h * 60 + 360) % 360; }
  const tone = l < 0.14 ? 'black' : l < 0.3 ? 'dark' : l < 0.55 ? 'mid' : l < 0.78 ? 'light' : 'pale';
  if (s < 0.13) return tone === 'black' ? 'black' : tone + '-grey';
  return tone + '-' + (h < 18 ? 'red' : h < 45 ? (l < 0.42 ? 'brown' : 'orange/gold') : h < 68 ? (l < 0.45 ? 'olive' : 'yellow') : h < 165 ? 'green' : h < 200 ? 'teal' : h < 260 ? 'blue' : h < 300 ? 'purple' : 'pink');
};
let n = 0, none = [];
for (const it of ITEMS.filter((i) => i.kind === 'portrait')) {
  const id = it.id.replace(/^portrait_/, ''), L = looks[id]; if (!L) { none.push(id); continue; }
  const d = it.request.prompt.replace(/^Bust portrait of /, '').split('. Head and shoulders')[0].toLowerCase(), l = { ...D, ...L }, f = []; // the description alone, without the house style
  const has = (re) => re.test(d);
  if (has(/\bbraid/) && !/braid/.test(l.hairStyle)) f.push('braid in portrait, hair ' + l.hairStyle);
  if (has(/\bbald\b|shaved head/) && l.hairStyle !== 'bald' && !l.helmet) f.push('bald in portrait, hair ' + l.hairStyle);
  if (has(/\bbun\b/) && l.hairStyle !== 'bun') f.push('bun in portrait, hair ' + l.hairStyle);
  if (has(/long [a-z -]*hair|mane/) && !/long|braid|tail/.test(l.hairStyle)) f.push('long hair in portrait, hair ' + l.hairStyle);
  if (has(/tied back/) && !/tail|bun|braid|long/.test(l.hairStyle)) f.push('tied back in portrait, hair ' + l.hairStyle);
  if (has(/short [a-z -]*hair|cropped/) && !/short/.test(l.hairStyle) && !l.helmet) f.push('short hair in portrait, hair ' + l.hairStyle);
  if (has(/long [a-z -]*beard/) && l.beard !== 'long' && l.beard !== 'braided') f.push('long beard in portrait, beard ' + l.beard);
  if (has(/(short|trimmed|full) [a-z -]*beard/) && !l.beard) f.push('beard in portrait, none on figure');
  if (has(/beardless|clean-shaven/) && l.beard) f.push('no beard in portrait, beard ' + l.beard);
  if (!has(/beard|stubble/) && l.beard && !l.female) f.push('no beard said in portrait, beard ' + l.beard);
  if (has(/\bcloak|shawl|mantle/) && !l.cloak) f.push('cloak in portrait, none on figure');
  if (!has(/\bcloak|shawl|mantle|bearskin/) && l.cloak) f.push('cloak on figure (' + name(l.cloak) + '), none in portrait');
  if (has(/\bfur\b|bearskin|pelt/) && !l.fur) f.push('fur in portrait, none on figure');
  if (!has(/\bfur\b|bearskin|pelt/) && l.fur) f.push('fur on figure, none in portrait');
  if (has(/helmet/) && !l.helmet) f.push('helmet in portrait, none on figure');
  if (!has(/helmet|helm\b/) && l.helmet) f.push('helmet on figure, none in portrait');
  if (has(/\bmail\b/) && !l.mail) f.push('mail in portrait, none on figure');
  if (has(/apron/) && !l.apron) f.push('apron in portrait, none on figure');
  n++;
  console.log(`${f.length ? '!!' : 'ok'} ${id.padEnd(12)} hair ${name(l.hair)}/${l.hairStyle}${l.beard ? '/' + l.beard : ''} tunic ${name(l.tunic)} trim ${name(l.trim)}${l.cloak ? ' cloak ' + name(l.cloak) : ''}${l.fur ? ' fur' : ''}${l.helmet ? ' helmet' : ''}${l.mail ? ' mail' : ''}${l.apron ? ' apron' : ''}`);
  console.log('   ' + d.slice(0, 260));
  for (const x of f) console.log('   -> ' + x);
}
console.log(n, 'compared; no figure look found for:', none.join(' '));
return out.join('\n');
}
