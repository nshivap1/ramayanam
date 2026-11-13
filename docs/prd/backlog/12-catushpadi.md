# चतुष्पदी · Catuṣpadī — Four words at once

| | |
|---|---|
| **Id** | `catushpadi` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | daily — after *Quordle* |
| **Skills / levels** | shabdakosha, akshara · L1–L3 |
| **Modes** | daily · practice |
| **Session** | ~6 min, 4 boards, 9 guesses |
| **Build size** | S (if the feedback helper is shared — see Content) |

## Learning objective
Recall and spell vocabulary under constraint: every guess must be a real word, and four boards force attention to every akṣara. For keen players who already solve Pada-śodhaḥ daily.

## Why people come back
The harder sibling of the daily word puzzle, with its own 2 × 2 share card.

## Core loop
1. Four boards, each hiding a different 3-akṣara word. One input row serves all boards.
2. Type a word on the akṣara keyboard and press Enter.
   - Not exactly three akṣaras → inline message, no row used.
   - Not in the vocab pack → "कोशे नास्ति · not in our word list", no row used, no penalty.
   - Otherwise the guess is added to every unsolved board with per-tile feedback.
3. A board is solved when a guess equals its word (it then freezes).
4. All four solved → `won`. Nine guesses used with a board unsolved → `lost`; the missing words are shown with meanings.

## Sanskrit rules
- The unit is the akṣara: a guess is `splitAksharas(normalizeDeva(text))` and must have length 3. Final halanta consonants stay inside their akṣara (फलम् = फ · लम्).
- **Tile feedback must be identical to Pada-śodhaḥ.** Normative definition (follow `src/games/pada-shodha/PRD.md` if it differs, and keep the two in step):
  - `correct` — same akṣara in the same position;
  - `present` — the akṣara occurs elsewhere in the answer (standard duplicate accounting: correct tiles claim first, then left to right);
  - `absent` — otherwise;
  - on non-correct tiles, two hint flags computed with `aksharaParts`: `consonant` (same onset consonants as the answer's akṣara in this position) and `vowel` (same vowel as the answer's akṣara in this position).
- Answers and accepted guesses are citation forms from the vocab pack only. An unknown string is never "wrong", only "not in our list".
- Anusvāra / class-nasal spelling follows the pack; typed input is normalised with `normalizeDeva` before lookup.
- The four answers are distinct and no two share the same akṣara in the same position (so one guess cannot solve two boards by accident and feedback stays informative).
- Never generate words; never accept inflected forms.

## Content
- **Guess list**: every vocab word (any level) with exactly 3 akṣaras that can be typed on `AksharaKeyboard`: every key of `keysFor(word)` is in the exported key lists and replaying them through `applyKey` reproduces the word.
- **Answer list**: the subset with `level ≤ ctx.level`.
- Minimum pool: answer list ≥ 120 at the level (30 days without repeats), guess list ≥ 200 (asserted). Measured on 2026-11-10: 188 / 367 / 403 three-akṣara vocab words at `level ≤` 1 / 2 / 3, so all three levels pass before the typeability filter.
- Daily selection: answer list sorted by id, shuffled once with a fixed seed; day `d = puzzleNumber(ctx.dateKey)` takes items `4d … 4d+3` (mod length), re-drawing with `createRng(ctx.seed)` if the positional-distinctness rule fails.
- **Shared helper (platform prerequisite, small):** export the tile-feedback function from the platform (`@sanskrit` or `@sdk`) so both word games use one implementation. Until then, implement it locally to the definition above and share a fixture file of (guess, answer, expected) vectors with Pada-śodhaḥ's tests.

## Modes, levels, scoring
- Score: 100 per solved board + 10 per unused guess (only if all four are solved).
- Stars: all four in ≤ 7 guesses → 3; all four → 2; two or three boards → 1; fewer → 0.
- `summary`: `4/4 in 8 guesses`. `best: { label: 'Fewest guesses', value, lowerIsBetter: true }` (wins only).
- Mastery: `shabdakosha` · `vocab:<id>` per answer, correct = that board solved.
- Share card (daily): the guess number at which each board fell, 🟥 if unsolved, in board layout:
  ```
  4️⃣6️⃣
  🟥8️⃣
  ```
- Daily state (guess list) stored under `ctx.store` by `ctx.dateKey`; reload replays it.

## UX notes
Portrait: 2 × 2 boards, each 3 columns × 9 rows of small `Tile`s (≈ 26 px at 360 px wide; the current row is echoed large above the keyboard so the typed word is always readable); `AksharaKeyboard` at the bottom. Hint flags are a dot (consonant) or a ring (vowel) on the tile — shape, not colour. Key states: a key turns `absent` only when it is absent from all unsolved boards. `ctx.expose({ phase, answers, guesses })`.

## Acceptance tests
- `logic.test.ts`: feedback vectors — the shared fixture; duplicate-akṣara cases; `consonant` / `vowel` flags for a pair differing only in vowel length.
- `logic.test.ts`: `testMatrix(levels, 25)` → four distinct answers, positional-distinctness rule holds, all in the answer list.
- `logic.test.ts`: input guards — 2- and 4-akṣara strings and unknown words consume no row; a guess equal to an answer freezes exactly that board.
- `logic.test.ts`: perfect bot (guesses the four answers) wins in 4 → score 450, 3 stars; filter bot (always guesses a list word consistent with all feedback) wins ≥ 95 % of seeds — records the rate; random-word bot always terminates at 9 rows.
- `logic.test.ts`: every guess-list word is typeable (`keysFor` round trip); pool-size assertions; daily selection gives 30 days without repeats.
- `e2e.spec.ts`: win via the on-screen keyboard at 390 px → share card with four cells; unknown word shows the message and keeps the row; loss path reveals answers; reload restores guesses; IAST run; no console errors; no overflow.

## Out of scope / later
4- and 5-akṣara variants; an eight-board version; hard mode.

## Open questions
- Product: nine guesses is the Quordle convention for five letters; is it right for three akṣaras? Tune from the filter-bot win rate.
- Platform: where should the shared feedback helper live?
