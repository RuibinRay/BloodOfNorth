# Languages: English, 中文, 日本語, Español

The game can be played in English, Simplified Chinese (中文), Japanese (日本語) and neutral Spanish (Español). The choice is on the main
menu (top right corner) and in Settings → Language. It is a setting, not part of a save: switching never touches a
saved game, and a first visit takes the browser's language.

## How it works

- **The English is the key.** Every piece of text goes through `tr()` (`src/i18n/i18n.js`) on its way to the
  screen: the dialogue box, subtitles, hints, toasts, title cards, quest tracker, journal, inventory, map labels,
  every panel. The data files and story code keep their English exactly as written; no look object or line was
  edited to make the translation work. That also means a branch that changes casts or looks (`faces-and-hair`)
  merges without touching the translation.
- **Tables** live in `src/i18n/zh/*.js`, `src/i18n/ja/*.js` and `src/i18n/es/*.js`, one per area (ui, chapters, items, companions,
  act1 … act7, epilogue, open). Each maps the English, as written in the game, to its translation. They are loaded
  only when the language is chosen, so English loads nothing extra.
- **Built text.** A line made in code (`${name} walks with you.`) is looked up by its pattern (`{0} walks with
  you.`), and the name caught in `{0}` is translated on its own. Lines joined with ` · ` are translated part by part.
  `{interact}`, `{sprint}`… are key names and `{w}`, `{b}`, `{n}` the ravens' and Eirik's names: they stay in the
  translation as they are.
- **Missing** text falls back to English, and is listed in `window.__i18n.missing` while a translated language is on.
- **Chinese type.** A serif with the characters: Noto Serif SC from Google Fonts (fetched in small pieces by
  unicode range, only when Chinese is chosen), with the system's Song/Ming faces behind it for offline play. Strict
  line breaking (no 。，」 at the start of a line), no faked italics, letter-spacing meant for Latin capitals taken out.
  The map's canvas labels use the same stack.
- **Japanese type.** The same treatment with Japanese fonts: Noto Serif JP from Google Fonts (only when Japanese is
  chosen), with the system's Mincho faces behind it (Hiragino Mincho, Yu Mincho, MS PMincho) and `lang="ja"` on the
  page. The two CJK stacks are kept apart on purpose: the same kanji are drawn differently in Chinese and Japanese
  faces (直, 骨, 戸, 言...), so a Japanese page never falls back to a Chinese font. Kinsoku line breaking (no 。、」ー or
  small kana at the start of a line) comes from `line-break: strict`.

## Checking it

- `npm run i18n` reads every source file for strings a player can see and checks that each has its zh, ja and es entry,
  that `{0}` and `{key}` holes are kept, that every name in the glossary is written the glossary's way (in Chinese and Japanese, and the bynames in Spanish), and that no
  UI template writes English into the page without `tr()`. Strings that look like words but are never shown are in
  `src/i18n/skip.js`.
- `npm run check` runs that, then plays Act I, the opening of every other act and the open world in both languages
  (every conversation clicked through) and fails on any string that reached the screen with no entry, or, in Chinese
  and Japanese, any Latin word left on screen. `npm run check -- --langs=all` plays every chapter; `--langs` alone runs only this.
- `node tools/check/langs.mjs ja act3` plays one act (or `all`, or a list of chapter ids) and prints what it finds.

## Adding or changing text

Change the English in the game as usual, then `npm run i18n -- todo act3` lists what lacks a translation, one line
per string with an id; write `id<TAB>中文<TAB>Español` lines into a file and `npm run i18n -- merge thatfile.tsv`
puts them in the right tables. Japanese goes in its own file of `id<TAB>日本語` lines: `npm run i18n -- merge
thatfile.tsv --lang=ja` (any one language can be merged this way). A string whose English changes falls back to English until its entry is redone (the
check says so).

## Choices made

- **Chinese is Simplified, Spanish is neutral**: `ustedes` for plural "you" (never Spain's `vosotros`), `tú` between
  people, no regional slang. Spain's usage would read more naturally to some players in a few rough battle-cries;
  switching would be a pass over about forty lines.
- **Names** (see `src/i18n/glossary.js`): Chinese transliterates the Norse names once (埃里克, 拉格纳, 比约恩, 哈康 …)
  and translates the bynames for their meaning (哈康·铁狼, 乌尔夫·双刃, 红手凯蒂尔); Spanish keeps the Norse names and
  translates the bynames (Håkon Lobo de Hierro, Ulf Dos Espadas). Places made of English words are translated in
  Chinese (渡鸦堡 Ravenhold, 铁岸 Iron Shore); Norse place names are transliterated, with -øy as 岛 (雅恩岛 Jarnøy).
- **Japanese** writes the Norse names in katakana from the Norse sound (エイリーク, ラグナル, ビョルン, ホーコン …) and
  the bynames in kanji for their meaning, before the name with の, the way Japanese renders epithets (鉄狼のホーコン,
  双剣のウルフ, 赤手のケッティル). Like the Chinese, places made of English words are translated (鴉の砦 Ravenhold,
  鉄の浜 Iron Shore) and -øy is 島 (ヤルン島 Jarnøy). The title is translated too (北方の血 — 鴉の王、起つ), as in Chinese
  and Spanish. Speech keeps the people apart: young Eirik says 僕 and the grown man 俺, Old Hrefna and the old kings
  speak in an old person's じゃ, narration is plain だ/である in the present tense as the English is.
- **Halfdan's grandson** is 外孙 in Chinese: the canon makes Eirik Halfdan's grandson through his mother Ylva.
- **The Old English** heard in Wessex ("Hwæt wilt þu?") stays Old English in every language, as it is foreign to the
  English player too.
- **Words of the North** kept: jarl (雅尔 / ヤール), the Thing (庭会 / 民会 / el Thing), skald (吟游诗人 / スカルド /
  escaldo), reeve (总管 / 代官 / reeve), holmgang (ホルムガング), weregild (贖罪金), blót (ブロット), seax (サクス), karve
  (カルヴ船), knarr (クナール船).
