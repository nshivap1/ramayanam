# पदान्वेषणम् · Padānveṣaṇam — Word search

| | |
|---|---|
| **Id** | `padanveshana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | puzzle — after *word search* |
| **Skills / levels** | shabdakosha, akshara · L0–L2 |
| **Modes** | practice · daily · timed |
| **Session** | ~3 min, one grid, 6–8 words |
| **Build size** | S |

## Learning objective
Recognise written words at a glance inside a field of akṣaras — sustained, low-stress reading practice for learners who have just finished the script (L0) and for Śibira vocabulary (L1–L2). Honest note: this is recognition only; its learning value is lower than the recall games, which is why it is a relaxing "cool-down" title.

## Why people come back
A calm puzzle with no way to lose, a daily grid with a time to beat, and picture clues that make it playable by children and families.

## Core loop
1. A square grid of akṣaras (6×6 at L0, 7×7 at L1–L2) and a clue list: emoji at L0–L1, emoji + word at L2 "easy", gloss only at L2.
2. Tap the first cell, then the last cell of a straight run (or drag). Keyboard: arrows move, Enter marks start and end.
3. If the run spells a listed word → it stays highlighted and the clue is struck. If it spells another vocab word → "bonus word!" (+5, shown with its meaning). Otherwise the selection fades — no penalty.
4. **Hint** flashes the first cell of an unfound word (−3 points).
5. All listed words found → `won`. Timed mode: 120 s, ends `completed` with what was found.

## Sanskrit rules
- One cell = one akṣara (`splitAksharas`); a word occupies as many cells as it has akṣaras, the final halanta staying in its akṣara (फलम् = फ · लम्).
- **Directions are reading directions only**: left→right, top→bottom, and diagonal down-right. Words are never placed or accepted backwards — a reversed akṣara string is not the word.
- Words may cross only on an identical akṣara.
- **Filler** cells are akṣaras taken from other vocab-pack words (never composed clusters), biased towards the consonants of the hidden words so the grid is not trivially sparse.
- **Validation after filling** (in `logic.ts`, and asserted in tests): scan every run of length 2–7 in the three directions against the whole vocab pack. Each listed word must occur exactly once. Unlisted pack words that appear by accident are recorded as bonus words. If a listed word occurs twice, regenerate with `rng.fork('retry' + k)` (≤ 50 attempts, then drop that word).
- A word set is rejected if one word's akṣara sequence is a contiguous part of another's.
- Comparison uses `normalizeDeva`; in IAST display each cell shows the romanised akṣara but geometry is unchanged.
- Never accept a string that is not a vocab-pack word.

## Content
- `@content/vocab`: `level ≤ ctx.level` (L0 falls back to level-1 words of 2–3 akṣaras if the pack has no level-0 words), 2–5 akṣaras, emoji required at L0–L1.
- Themed grids: when a vocab `category` has ≥ 8 eligible words, the daily grid uses one category (title shown, e.g. "Animals"); otherwise mixed.
- Minimum pool: ≥ 120 eligible words per level (asserted) → thousands of distinct grids.
- Daily mode: grid fully determined by `ctx.seed`; progress saved in `ctx.store` under `ctx.dateKey`.

## Modes, levels, scoring
- L0: 6×6, 5 words of 2–3 akṣaras, rows and columns only. L1: 7×7, 6 words, + diagonal. L2: 7×7, 8 words of 3–5 akṣaras.
- Score: 10 per listed word, +5 per bonus word, −3 per hint, time bonus `max(0, 60 − seconds/3)` in practice/daily.
- Stars: all found, no hints → 3; all found → 2; at least half (timed) → 1.
- `best: { label: 'Fastest grid (s)', value, lowerIsBetter: true }`.
- Mastery: `shabdakosha` · `vocab:<id>`, correct = found without a hint on that word; hinted words emit `correct: false`.
- Share card (daily): `8/8 · 1:42 · 💡0` plus one 🟩 per word found and ⬜ per word missed.

## UX notes
Grid of `Tile`s sized `min(48px, (width − 32px) / n)`; found runs get one of six token colours plus a rounded outline (not colour alone). Clue chips under the grid (`Chip`, state `done`). Drag selection uses pointer events with `touch-action: none` on the grid only. `ctx.announce` on every find. `ctx.expose({ phase, words: [{ id, cells }], found })`.

## Acceptance tests
- `logic.test.ts`: `testMatrix([0, 1, 2], 30)` → grid dimensions and word counts per level; every listed word is found by the validator exactly once, in an allowed direction; crossings share identical akṣaras.
- `logic.test.ts`: no listed word is a contiguous part of another; no run spells a listed word backwards-only (direction check).
- `logic.test.ts`: selecting a bonus word scores +5 and does not end the game; selecting a non-word changes nothing.
- `logic.test.ts`: perfect bot (uses the placements) wins every seed × level; random-selection bot never crashes and never ends the game early; timed simulation ends at exactly 120 000 ms.
- `logic.test.ts`: generation finishes in < 50 ms per grid on the test machine (retry cap respected); pool-size assertions.
- `e2e.spec.ts`: find every word through taps at 390 px → result screen with 3 stars; a wrong selection leaves the state unchanged; hint lowers the score; daily grid identical after reload with found words restored; IAST run; no console errors; no overflow at 360 px.

## Out of scope / later
Printable PDF for classrooms; free-find Boggle mode; inflected forms; reverse directions (deliberately never).

## Open questions
- Product: is an 8-direction grid ever wanted? This PRD says no on linguistic grounds.
- Sanskrit reviewer: should bonus words be limited to the learner's level, or is meeting a harder word by accident welcome?
