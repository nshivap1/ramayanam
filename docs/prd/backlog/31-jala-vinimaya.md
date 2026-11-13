# जालविनिमयः · Jāla-vinimayaḥ — Grid swap

| | |
|---|---|
| **Id** | `jala-vinimaya` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | daily — after *Waffle* (a much smaller lattice — see Sanskrit rules) |
| **Skills / levels** | shabdakosha, akshara · L1–L3 |
| **Modes** | daily · practice |
| **Session** | ~2 min, one lattice of 8 tiles |
| **Build size** | M |

## Learning objective
Spelling by constraint: three crossing words have all their akṣaras present but scrambled; the learner restores them by swapping tiles within a budget, which rehearses the exact spelling of known vocabulary.

## Why people come back
A compact daily with a stars-for-swaps-left score and a clean share grid.

## Core loop
1. A π-shaped lattice: one across word of 4 akṣaras with two 3-akṣara down words hanging from its 1st and 3rd akṣaras (8 cells). Every tile is coloured: 🟩 right cell; 🟨 belongs elsewhere in a word through this cell; ⬜ neither.
2. Tap two tiles to swap them (green tiles are locked); each swap costs one.
3. All green → `won`; stars from swaps left. Budget exhausted → `lost`; the solution is shown with meanings.

## Sanskrit rules
- One cell = one akṣara (`splitAksharas`). Crossing cells hold the **identical** akṣara.
- **Why the lattice is small — measured, not guessed.** Citation forms end in akṣaras such as कः, नम्, ति, which never begin a word, so a word's last akṣara can cross almost nothing. A feasibility run over the vocab pack (≈ 1,080 single-word entries) on 2026-11-10 found:
  - a Waffle-like ring of four 3-akṣara words: **52 fills, 26 distinct word sets, 7 distinct top words** — not viable;
  - the π lattice: **3,605 fills, 3,099 with a unique solution; 2,006 at `level ≤ 2` over 67 distinct across words; 117 of those with an emoji for all three words** (35 at `level ≤ 1`).
  The game therefore uses the π lattice only — honestly closer to "three crossing jumbles" than to Waffle's six words.
- Words are vocab-pack `sa` forms (`pos` ≠ `phrase`, no spaces; duplicates by `sa` collapsed), verbs in citation form (laṭ 3sg) included.
- **Uniqueness**: a puzzle is valid iff no other π fill built from the whole vocab pack has the same multiset of 8 akṣara tiles, and the across word's 1st and 3rd akṣaras differ (otherwise the two down words could trade places). Then exactly one arrangement makes all three slots pack words, up to swapping identical tiles.
- Puzzles are enumerated in `logic.ts` at first use (a few thousand combinations; cache the list) — no hand-typed Sanskrit, no offline tool.
- Colouring uses Wordle-style duplicate accounting per word; a crossing cell is 🟨 if its tile is needed elsewhere in either word through it.
- Scramble: a seeded permutation whose minimum swap distance (cells − cycles, treating identical tiles optimally) is 4–6; budget = that distance + 3.
- Clues: each word's emoji beside its row / column where it exists (L1 uses only all-emoji puzzles); at L3 no clues.

## Content
- `@content/vocab` only.
- Levels — L1: puzzles with all words `level ≤ 1` and emoji (35 measured, so the L1 daily repeats after about five weeks). L2: `level ≤ 2` (2,006). L3: all levels, no clues.
- Daily: valid puzzles sorted by a stable key and shuffled once with a fixed seed; index = `puzzleNumber(ctx.dateKey)`, skipping forward so that, at L2+, the across word differs from the previous 30 days (67 distinct across words make this possible). Scramble from `createRng(ctx.seed)`.
- Asserted minimums: ≥ 1,000 valid puzzles at `level ≤ 2`, ≥ 50 distinct across words, ≥ 25 all-emoji puzzles at `level ≤ 1`.

## Modes, levels, scoring
- Stars: swaps left ≥ 3 → 3; 1–2 → 2; 0 → 1; lost → 0.
- Score: 100 + 20 × swaps left on a win; 10 × green tiles on a loss. `summary`: `Solved with 3 swaps left`.
- `best: { label: 'Most swaps left', value }`; daily state in `ctx.store` by `ctx.dateKey`.
- Mastery: `shabdakosha` · `vocab:<id>` for each of the three words, correct = won.
- Share card (daily): the lattice as solved or failed, drawn with 🟩 / 🟨 / ⬜ and ⬛ for empty cells, plus stars — no akṣaras:
  ```
  🟩🟩🟩🟩
  🟩⬛🟩⬛
  🟩⬛🟩⬛
  ```

## UX notes
Portrait: 4 × 3 grid area with 8 `Tile`s (≥ 64 px), states `correct` / `present` / `idle` with a corner glyph each (not colour alone); swaps left in the HUD. Tap-tap swapping; keyboard arrows + Enter. `ctx.announce` reports both swapped tiles' new colours. `ctx.expose({ phase, cells, solution, swapsLeft })`.

## Acceptance tests
- `logic.test.ts`: enumeration — every puzzle's crossings are identical akṣaras; slot lengths 4 / 3 / 3; three distinct words; the measured counts above hold within the asserted minimums (print the actual numbers).
- `logic.test.ts`: uniqueness — for 200 seeded puzzles, brute-force all 8! arrangements: exactly one (up to identical tiles) makes the three slots pack words.
- `logic.test.ts`: no across word with equal 1st and 3rd akṣaras; no `phrase` entries.
- `logic.test.ts`: scramble — swap distance within 4–6; no initial all-green; deterministic per seed.
- `logic.test.ts`: colouring fixtures — duplicate akṣara within one word; duplicate shared between the across word and a down word.
- `logic.test.ts`: solver bot (cycle-following) wins every seed in `testMatrix([1, 2, 3], 25)` with exactly 3 swaps left; random bot always terminates; swapping a locked tile is refused.
- `logic.test.ts`: daily order at L2 — 60 consecutive days never repeat an across word within 30 days; enumeration + selection take < 50 ms.
- `e2e.spec.ts`: solve the daily at 390 px from `window.__game.solution` → share card of three rows; a wasteful run → loss with the solution shown; reload restores the arrangement; IAST run; no console errors; no overflow.

## Out of scope / later
Larger lattices using inflected forms (the combined shabda + dhātu lexicon has about 16,400 forms — see `laghu-pada-jala`); 5-akṣara across words; a weekly bigger lattice.

## Open questions
- Product: is a three-word lattice a worthwhile daily beside `vyasta-pada`?
- Sanskrit reviewer: are verb citation forms (पिबति) acceptable as lattice words beside nouns?
