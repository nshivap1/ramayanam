# प्रत्याहारक्रीडा · Pratyāhāra-krīḍā — The Māheśvara-sūtra puzzle

| | |
|---|---|
| **Id** | `pratyahara-krida` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | puzzle — after *span-selection / "name that set" puzzles* |
| **Skills / levels** | akshara, sandhi · L3–L5 |
| **Modes** | practice · timed |
| **Session** | ~3 min, 10 rounds |
| **Build size** | S |

## Learning objective
Read Pāṇini's shorthand. After 20 sessions the learner can expand अच्, हल्, इक्, यण्, जश् and the other pratyāhāras from the fourteen Māheśvara-sūtras and say whether a sound belongs to one — the vocabulary in which every sandhi rule from Paricaya onwards is stated (इको यणचि).

## Why people come back
The whole board is always visible, like a map being learnt. Three round types rotate, a 90-second mode gives a personal best, and levels open more of the 42 traditional pratyāhāras.

## Core loop
The board shows the 14 sūtras as rows: sound tiles, then the it-marker tile in a distinct style.
1. **Expand** — prompt: a pratyāhāra name (e.g. इक्). Tap the first sound, then the marker; the span lights up; press Check. Right if the start tile and marker row are the ones the rule selects.
2. **Name it** — a span is highlighted; choose its name among four real pratyāhāra names.
3. **Member?** — "Which of these is *not* in हश्?" (four sound tiles) or a yes/no "Is य in अच्?".
4. Right → green span and the full expansion is listed; wrong → the correct span is shown, one of 3 lives lost (practice). Ten rounds → `completed`; 0 lives → `lost`. Timed: 90 s, endless rounds.

## Sanskrit rules
- All data comes from `@sanskrit`: `SHIVA_SUTRAS` (sounds, `it`, `deva`), `PRATYAHARA_NAMES` (42 names in SLP1), `pratyahara(name, opts)`. The game types no Sanskrit.
- Rule applied: आदिरन्त्येन सहेता — first sound up to, not including, the marker; markers are never members.
- **The two ण्.** The marker ण् ends sūtras 1 and 6. By tradition अण् is read with the first and इण् / यण् with the second; `pratyahara()` already implements this. In *Expand*, the accepted marker tile is the one the engine's default reading uses; the feedback states which ण् and why. अण् is excluded from *Name it* distractor sets where both readings would be on the board.
- **The two ह.** ह occurs in sūtras 5 and 14. For ह-initial names (हश्, हल्) the accepted start tile is the ह of sūtra 5; tapping the other ह is wrong and the feedback explains it.
- **Sets, not names, decide.** In *Name it*, a distractor is any name whose `pratyahara()` expansion differs as a set from the highlighted span.
- Vowel tiles stand for their long counterparts too (अ covers आ). Questions about long vowels appear only at L5 and use `pratyahara(name, { expandSavarna: true })`.
- Names are displayed with `slp1ToDeva(name)` (ac → अच्, yaR → यण्). **Never render a sūtra as one IAST word**: अइउण् would become "aiuṇ" and lose the hiatus. Sūtras are always drawn as separate sound tiles; the row caption uses `SHIVA_SUTRAS[i].deva` locked to Devanagari.
- Sound tiles are locked to Devanagari (small IAST sub-label in IAST mode).

## Content
- Engine only. Level sets (SLP1 names, all asserted to be in `PRATYAHARA_NAMES`):
  - L3 (12): ac, hal, ak, ik, eN, ec, yaR, Jal, jaS, Kar, haS, Sar.
  - L4 (+14): aR, iR, aw, am, yam, Jaz, JaS, Jay, Kay, car, Sal, yay, val, Nam.
  - L5: all 42, plus savarṇa questions.
- Rounds available: 42 names × 3 round types, plus membership variants → no fixed list needed; a 10-round session never repeats a name.

## Modes, levels, scoring
- Practice: 3 lives; 10 points per round + 5 for a round answered without changing the selection; stars from accuracy.
- Timed: 90 s (`useCountdown`), no lives, wrong answer costs 3 s; `best: { label: 'Rounds in 90 s', value }`.
- Mastery: `akshara` · `pratyahara:<Devanagari name>:<expand|name|member>` (Devanagari avoids SLP1 case collisions such as jaS / JaS in stores that fold case).

## UX notes
Portrait: sūtra board as 14 compact rows (`Tile` size 30–34 px; the longest row, sūtra 11, has 8 sounds + marker = 9 tiles and fits 360 px); prompt card above; answer area below (Check button or `Choice` list). Keyboard: arrows move a cursor over tiles, Enter selects, digits pick options. Marker tiles use `state="soft"`; selected span `state="selected"`. `ctx.expose({ phase, type, name, startTile, markerRow, answer })`.

## Acceptance tests
- `logic.test.ts`: for all 42 names, the span the game keys (start tile, marker row) reproduces exactly `pratyahara(name)`.
- `logic.test.ts`: named cases — अच् = 9 vowels from sūtras 1–4; हल् spans sūtra 5 to 14 and has 33 members; इक् = इ उ ऋ ऌ; यण् = य व र ल; अण् uses the marker of sūtra 1; इण् uses the marker of sūtra 6.
- `logic.test.ts`: ह-initial names key the ह of sūtra 5 only.
- `logic.test.ts`: *Name it* — no distractor has the same expansion set as the answer; *Member?* — exactly one option is outside (or inside) the set.
- `logic.test.ts`: `testMatrix([3, 4, 5], 25)` → 10 rounds, names within the level set, no repeats; perfect bot `completed` 10/10; wrong bot `lost` after 3.
- `logic.test.ts`: every displayed name passes `validateDeva` and round-trips `devaToSlp1(slp1ToDeva(n)) === n`.
- `e2e.spec.ts`: perfect run at 390 px using tile taps; wrong marker shows the right span; timed run reaches the result screen; IAST app script shows no joined IAST sūtra strings; no console errors; no overflow.

## Out of scope / later
Linking each pratyāhāra to the sandhi rules that use it (needs a sūtra index); audio recitation of the sūtras.

## Open questions
- Sanskrit reviewer: confirm the L3 / L4 name sets against the Paricaya and Śikṣā books.
- Should the wider reading of अण् (1.1.69) be taught at L5 or left out entirely?
