# व्यस्तपदम् · Vyasta-padam — Jumble

| | |
|---|---|
| **Id** | `vyasta-pada` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | daily — after *Jumble / anagram puzzles* |
| **Skills / levels** | shabdakosha, akshara · L0–L2 |
| **Modes** | daily · practice |
| **Session** | ~2 min, 5 words |
| **Build size** | S |

## Learning objective
Spell everyday words akṣara by akṣara. After 20 sessions a Śibira learner can rebuild ~100 picture words from their syllables, which is the reading-fluency step between knowing letters (L0) and reading sentences (L1).

## Why people come back
Five words a day, the same for everyone, with a three-colour share row. A round takes under two minutes and never punishes — the worst outcome is "revealed".

## Core loop
1. A word's emoji and English gloss appear with its akṣara tiles shuffled in a tray and empty slots above.
2. Tap a tray tile to place it in the next slot; tap a placed tile to return it. Keyboard: digits pick tiles, Backspace removes.
3. When all slots are full the word is checked automatically.
   - Right → slots turn green, the word is shown whole with its meaning, next word after "Continue".
   - Wrong → slots shake, tiles return, one mistake recorded. No limit on attempts.
4. **Hint** places the first akṣara (once per word). **Reveal** (after two mistakes) shows the answer and scores 0.
5. After five words: `ctx.finish` with `outcome: 'completed'`.

## Sanskrit rules
- A tile is one akṣara from `splitAksharas(word)`; a final halanta stays with its akṣara (पुस्तकम् → पु · स्त · कम्). Never split by code point; never shuffle code points.
- **Every valid anagram is correct.** Build an index from the *whole* vocab pack (all levels): key = sorted akṣara list, value = all words with that multiset. A submission is correct if it equals any word under the puzzle's key (नदी / दीन style pairs). If the player finds the "other" word, show both.
- Tiles with identical text are interchangeable: compare the joined string, not tile ids.
- The scramble shown must not itself be a word in the index, and must differ from the answer. A word whose every permutation is a pack word, or whose akṣaras are all identical, is excluded from the pool.
- Compare after `normalizeDeva`. In IAST display the tiles show the romanised akṣara but remain akṣara units.
- Never generate words; never accept a string that is not in the vocab pack.

## Content
- `@content/vocab` (fields used: `id`, citation form, `en`, `emoji`, `level`).
- Pool per level: L0 — 2–3 akṣaras, emoji required, `level ≤ 0` (if the pack has no level-0 words, `level ≤ 1` with exactly 2 akṣaras); L1 — 3–4 akṣaras, emoji required, `level ≤ 1`; L2 — 4–5 akṣaras, `level ≤ 2`, emoji optional.
- Minimum pool: ≥ 100 words per level (asserted). The pack has no level-0 words today, so L0 uses the fallback; measured pools are comfortably above 100 for all three bands.
- Daily selection: take the level pool sorted by id, shuffle it once with a fixed constant seed, and use items `5·d … 5·d+4` (mod pool size) where `d = puzzleNumber(ctx.dateKey)` — no word repeats until the pool is exhausted. Tile scrambling uses `createRng(ctx.seed)`. Practice mode samples five words with the seeded rng.

## Modes, levels, scoring
- Per word: 20 first try · 10 solved after mistakes · 5 solved with hint · 0 revealed. `correct` = words solved without reveal; `total` = 5.
- Stars: score ≥ 90 → 3, ≥ 60 → 2, > 0 → 1.
- `best`: `{ label: 'Best score', value: score }`.
- Mastery: `shabdakosha` · `vocab:<id>`, correct = solved first try without hint.
- Share card (daily), one square per word: 🟩 first try · 🟨 solved with mistakes or hint · 🟥 revealed, e.g. `🟩🟩🟨🟩🟥`. Summary: `4 of 5 solved`.
- Daily state (current word index, placements, marks) is saved under `ctx.store` keyed by `ctx.dateKey`.

## UX notes
Portrait: emoji (large) and gloss on top, slot row, tray row, Hint/Reveal buttons. Use `Tile` (states `idle`, `filled`, `correct`), `Button`, `FeedbackBar`. Tiles ≥ 52 px; five tiles fit at 360 px. `ctx.announce` reads the result of each check. `ctx.expose({ phase, answer, tiles, index })`.

## Acceptance tests
- `logic.test.ts`: `testMatrix(levels, 25)` → five distinct words, each within the akṣara range; scramble ≠ any accepted word; joining the tiles in answer order reproduces the word.
- `logic.test.ts`: anagram index — for every pool word, every pack word with the same akṣara multiset is accepted; a named fixture pair is accepted both ways if both words are in the pack.
- `logic.test.ts`: duplicate-akṣara word is solvable with the two identical tiles swapped.
- `logic.test.ts`: daily selection — 30 consecutive puzzle numbers give 150 distinct words (or cycle exactly at pool size); same dateKey → same five words regardless of seed.
- `logic.test.ts`: perfect bot → score 100, 3 stars; hint-only bot → 25; reveal bot → 0 and `outcome: 'completed'`; random bot terminates (reveal becomes available after two mistakes).
- `logic.test.ts`: pool-size assertions per level.
- `e2e.spec.ts`: solve five words through the UI to the result screen at 390 px; wrong order shows the shake and records a 🟨; reload mid-daily resumes the same word; share text has five squares; IAST run; no console errors; no overflow.

## Out of scope / later
Timed blitz; inflected forms (needs sentence context); a "bonus sixth word" made from circled akṣaras as in newspaper Jumble.

## Open questions
- Product: is an English gloss acceptable beside the emoji, or should L0–L1 be picture-only in the Samskrita Bharati spirit?
- Sanskrit reviewer: confirm the vocab pack's anusvāra / class-nasal convention so that tiles such as सं and स are never interchangeable by accident.
