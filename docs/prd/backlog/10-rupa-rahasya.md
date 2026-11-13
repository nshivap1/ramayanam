# रूपरहस्यम् · Rūpa-rahasyam — The secret form

| | |
|---|---|
| **Id** | `rupa-rahasya` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | daily — after *Mastermind* (with Wordle-style rows) |
| **Skills / levels** | vibhakti (L2), kriyapada (L3) · L2–L3 |
| **Modes** | daily · practice |
| **Session** | ~3 min, one secret, 6 guesses |
| **Build size** | M |

## Learning objective
Analyse a form at sight. Every guess is a real inflected form; every row of feedback is stated in grammatical features. After 20 sessions a Praveśa learner can look at देवेभ्यः and say "caturthī or pañcamī, bahuvacana", and reads a paradigm as a system rather than a list.

## Why people come back
One shared secret a day, six tries, a spoiler-free share grid — and the full paradigm table revealed at the end as a reward and study card.

## Core loop
1. The day's word is announced: a noun paradigm at L2 (e.g. देव, m.), a dhātu at L3 (e.g. पठ्, laṭ · laṅ · lṛṭ). The secret is one **cell** of it.
2. The tray shows every distinct display form of that paradigm as unlabelled chips, shuffled (nouns: vibhakti 1–7 × 3 vacanas → about 14–17 chips; verbs: 3 lakāras × 9 → up to 27 chips).
3. Tap a chip to guess. The row shows the form, its analysis label(s), and feedback per feature:
   - **Noun**: vibhakti → 🟩 right · 🔼 the secret is *later* in the vibhakti order · 🔽 *earlier*; vacana → 🟩 / ⬛.
   - **Verb**: lakāra 🟩 / ⬛ · puruṣa 🟩 / ⬛ · vacana 🟩 / ⬛.
4. All features 🟩 → `won`. Six rows without it → `lost`; the secret is shown.
5. End screen: the whole table with the secret cell and the guessed cells marked.

## Sanskrit rules
- Cells and forms come from `@content/shabda` (`form(p, v, n)`) and `@content/dhatu` (`conj`). A chip shows `Forms[0]`; vikalpa alternates are listed in the row label and the final table.
- **Syncretism is the heart of the design.** One chip stands for every cell whose display form equals its text (रामाभ्याम् = tṛtīyā, caturthī and pañcamī dvivacana). Define `A(chip)` = that set of cells.
  - **Win** when the secret cell ∈ `A(guess)` — the learner is never asked to tell apart two analyses that the form itself does not distinguish.
  - **Feedback** is computed against the member of `A(guess)` closest to the secret: most matching features first, then smallest vibhakti distance, then lowest vibhakti. The row label lists all analyses of the chip, so the feedback is always true of at least one of them.
- Vocative is excluded (pronouns lack it; it mostly repeats the nominative).
- Eligible noun paradigms: `kind` noun or adjective, all 21 cells non-empty. Eligible dhātus: complete laṭ, laṅ, lṛṭ tables in one pada (the pada the learner is taught: P, else A).
- Never generate a form; never label a chip with an analysis the pack does not contain.
- Labels use `VIBHAKTI_NAMES`, `VACANA_NAMES`, `LAKARA_NAMES`, `PURUSHA_NAMES`.

## Content
- L2: `shabdaForLevel(2)` filtered as above (92 paradigms at `level ≤ 2`, of which roughly 55 are complete nouns / adjectives × 21 cells). L3: `dhatusForLevel(3)` filtered (≥ 100 roots × 27 cells).
- Daily: paradigm and cell derived from `createRng(ctx.seed)`; with > 1,000 (paradigm, cell) pairs per level no pre-authored list is needed.
- Minimum pool: ≥ 40 paradigms (L2) and ≥ 60 dhātus (L3), asserted.

## Modes, levels, scoring
- Score: `(7 − guesses used) × 20` on a win, 0 on a loss. Stars: ≤ 3 guesses → 3; 4–5 → 2; 6 → 1; lost → 0.
- `summary`: `Solved in 4 of 6`. `best: { label: 'Fewest guesses', value, lowerIsBetter: true }`.
- Mastery: one event for the secret — `vibhakti` · `shabda:<paradigmId>:<v>.<n>` or `kriyapada` · `dhatu:<dhatuId>:<lakara>:<p>.<v>`; `correct` = won.
- Share card (daily), one line per guess, no forms shown:
  ```
  🔽⬛
  🔼🟩
  🟩🟩
  ```
- Daily progress (guessed chips) is stored under `ctx.store` keyed by `ctx.dateKey`.

## UX notes
Portrait: header with the stem / root and gender; guess rows (form, small analysis label, feedback icons with `aria-label`s such as "vibhakti: later"); scrollable chip tray (`Chip`, `used` after guessing). Arrows carry meaning by shape, not colour. Keyboard: arrows move in the tray, Enter guesses. A "?" sheet shows the vibhakti order 1–7. `ctx.expose({ phase, secret: { cell }, chips: [{ text, cells }] })`.

## Acceptance tests
- `logic.test.ts`: chips — every display form of the eligible cells appears exactly once; `A(chip)` partitions the cells.
- `logic.test.ts`: named syncretism cases on `rama-m` — the chip रामाभ्याम् wins for secrets 3.2, 4.2 and 5.2; the chip रामयोः wins for 6.2 and 7.2; with secret 3.1 the chip रामाभ्याम् yields vibhakti 🟩, vacana ⬛.
- `logic.test.ts`: feedback is all-🟩 iff the secret ∈ `A(guess)`; arrow direction is consistent with the chosen closest analysis for every (secret, guess) pair of three sample paradigms (exhaustive).
- `logic.test.ts`: solver bot (keeps a candidate set, guesses the median vibhakti) wins within 6 guesses for every cell of every eligible paradigm; random bot terminates in ≤ 6 rows.
- `logic.test.ts`: `testMatrix([2, 3], 25)` determinism; ineligible paradigms (dual-only द्वि, plural-only अप्) never selected; pool-size assertions.
- `e2e.spec.ts`: daily win in three guesses using `window.__game` → result with share text of three lines; loss path shows the secret and table; reload mid-game restores rows; IAST run; 390 px without overflow; no console errors.

## Out of scope / later
A third noun feature (gender, with three stems on the board); count-only "kaṭhina" feedback; pronoun paradigms; typing the guess.

## Open questions
- Sanskrit reviewer: is the "closest analysis" rule the clearest way to give feedback on syncretic guesses, or should all analyses be scored and shown?
- Product: six guesses for 21 cells is generous — should L2 drop to five?
