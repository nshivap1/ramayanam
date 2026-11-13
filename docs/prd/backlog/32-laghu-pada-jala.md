# लघुपदजालम् · Laghu-pada-jālam — Mini crossword

| | |
|---|---|
| **Id** | `laghu-pada-jala` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | daily — after *NYT Mini Crossword* (weekly at launch) |
| **Skills / levels** | shabdakosha, vibhakti, kriyapada · L2–L4 |
| **Modes** | daily · practice |
| **Session** | 3–6 min, one grid of 4–7 entries |
| **Build size** | L (game M + constructor tool, validator and editorial pipeline) |

## Learning objective
Recall words *and forms* from clues. Entries are vocabulary words and inflected forms, so a clue may be a picture, a meaning, or a grammatical request ("नदी · सप्तमी · बहुवचनम्"); crossings confirm or correct each akṣara. The highest-effort recall in the catalogue.

## Why people come back
The prestige puzzle: a new grid each week (daily once the bank allows) and a solve time to share.

## Core loop
1. A small grid with numbered entries and a clue bar. Tap a cell to select its entry (tap again to switch direction).
2. Type with the akṣara keyboard; the cursor advances along the entry.
3. **Check** marks wrong cells (costs a star); **Reveal cell** fills one cell.
4. Grid complete and correct → `won`. No lose state; the player may leave and resume.

## Sanskrit rules
- **A cell is an akṣara.** Typing happens in *entry space*: the text of the active entry's cells up to the cursor is edited with `applyKey`, re-split with `splitAksharas` and written back cell by cell (so the म् of फलम् rejoins its akṣara). Input beyond the entry length is refused. Crossing cells are shared.
- **Honest difficulty.** Akṣara crossings are far scarcer than letter crossings. Measured on 2026-11-10: the combined lexicon of vocab words and shabda / dhātu / kṛdanta forms has about 16,400 distinct forms (8,170 of 3 akṣaras), yet a fully checked 3 × 3 block has only **114** fills, most using obscure verb forms. Dense grids are not a goal. Target: 4 × 4 or 5 × 5 with blocks, 4–7 entries of 2–4 akṣaras, every entry crossing another, ≥ 40 % of cells checked.
- **Entries are pack forms by reference**: `vocab:<id>` · `shabda:<paradigmId>:<v>.<n>` · `dhatu:<dhatuId>:<lakara>:<pada>:<p>.<v>` · `krdanta:<dhatuId>:<field>`. The text is resolved from the pack, never typed into the puzzle file.
- **Clue kinds — none requires writing Sanskrit**: `emoji` · `gloss` (the pack's `en`) · `form` (citation form + analysis labels; analysis → form is a function, so homographs are harmless) · `cloze` (a sentence-pack sentence with one word blanked, by id and word index).
- **Accepted answers.** `form` / `cloze` clues accept every member of the cell's `Forms` with the entry's length (vikalpa); `gloss` / `emoji` clues accept every vocab word with the same `en` and length. The validator must prove that, with the crossings, exactly one grid satisfies all clues — or the puzzle lists its alternate solutions and the game accepts them.
- Comparison after `normalizeDeva`; an anusvāra / class-nasal variant is marked wrong with a hint naming the pack spelling.

## Content — prerequisites
1. **Constructor** `tools/content/lattice/construct.ts` (platform): builds the lexicon (form, akṣaras, refs, level) and runs a backtracking fill over hand-drawn templates — every run of ≥ 2 cells is an entry, no repeated entry, at most two entries per paradigm, entry levels ≤ puzzle level — and outputs ranked candidate fills with clue options.
2. **Editorial pass (human)**: an editor picks fills and one clue per entry; a Sanskrit reviewer checks fairness (no obscure forms for the level, unambiguous clues). About 15–20 min per puzzle.
3. **Pack** `src/content/padajala/`: `Puzzle { id, level, rows, cols, blocks: [r, c][], entries: [{ id, dir, row, col, len, ref, clue: { kind, sentenceId?, wordIndex? } }], altSolutions?, provenance { tool commit, editor, reviewer, humanReviewed } }`.
4. **Validator** (in `npm run validate`): geometry (entries match runs; connected); every `ref` resolves with akṣara count `len`; crossing cells identical; clues resolvable; **uniqueness** by exhaustive search over accepted sets; level policy.
- **Size**: launch needs ≥ 26 reviewed puzzles (≥ 8 per level) — half a year of weeklies. A daily cadence is a later decision.

## Modes, levels, scoring
- Schedule: puzzle index = `floor(puzzleNumber(ctx.dateKey) / 7)` mod bank size — "daily" mode serves one grid per week; practice opens the archive.
- Stars: no Check, no Reveal → 3; ≤ 2 Checks → 2; otherwise 1. Score: `600 − seconds − 60 × checks − 100 × reveals` (floor 50); `best: { label: 'Fastest solve (s)', value, lowerIsBetter: true }`.
- Mastery: one event per entry under its ref's id (`vocab:<id>`, `shabda:<id>:<v>.<n>`, `dhatu:<id>:<lakara>:<p>.<v>`); correct = no Reveal and never flagged by Check.
- Share card: `week 12 · 2:41 · ✓0` plus the grid outline in ⬜ / ⬛. Progress saved in `ctx.store` by puzzle id.

## UX notes
Portrait: grid (cells ≥ 56 px, so ≤ 5 columns at 360 px), clue bar with previous / next, `AksharaKeyboard` (`noEnter`), Check and Reveal in a `Sheet`. Arrow keys move the cursor; Backspace edits in entry space. `ctx.expose({ phase, entries: [{ id, cells, answer }], grid })`.

## Acceptance tests
- `logic.test.ts`: entry-space typing — फलम् into 2 cells gives फ · लम्; पुस्तकम् into 3 gives पु · स्त · कम्; a fourth akṣara is refused; Backspace across a cell boundary.
- `logic.test.ts`: writing an across entry updates the shared cell of the down entry.
- `logic.test.ts`: every pack puzzle passes the validator rules and is solved by a bot typing each `answer`; `altSolutions` are accepted.
- `logic.test.ts`: Check marks exactly the wrong cells; Reveal flags the entry; stars, score, weekly index.
- `logic.test.ts`: bank gate — fewer than 26 `humanReviewed` puzzles fails clearly.
- `e2e.spec.ts`: solve a puzzle at 390 px with the on-screen keyboard → result and share text; one wrong akṣara + Check; reload restores cells; IAST run; no overflow with 5 columns; no console errors.

## Out of scope / later
Themed weeklies; Sanskrit definition clues (authored Sanskrit needs review); larger grids; print.

## Open questions
- Product owner: is weekly acceptable? Who edits and reviews?
- Sanskrit reviewer: which inflected forms are fair at each level (duals, vidhiliṅ at L3)?
