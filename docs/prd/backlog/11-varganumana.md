# वर्गानुमानम् · Vargānumānam — Guess the class

| | |
|---|---|
| **Id** | `varganumana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | daily — after *LinkedIn Pinpoint* |
| **Skills / levels** | shabdakosha, vibhakti, kriyapada · L1–L4 |
| **Modes** | daily · practice |
| **Session** | ~2 min, 3 puzzles of up to 5 clues |
| **Build size** | S |

## Learning objective
See what a group of words has in common: a meaning class at L1 (all fruits), a grammatical class from L2 (all tṛtīyā forms, all laṅ forms, all ktvā forms at L4). After 20 sessions the learner classifies a form by its ending before reading the whole word.

## Why people come back
A third daily ritual that takes two minutes: "I got it on the first clue" is the brag. Tiny, spoiler-free share card.

## Core loop
1. A puzzle shows six answer options (class labels) and five clue cards, only the first face-up.
2. The player either taps an option or taps **Next clue**.
   - Right option → solved; remaining clues flip for review.
   - Wrong option → that option is struck out, a mistake is recorded, and the next clue opens automatically.
3. After the fifth clue one last guess is allowed; then the answer is revealed.
4. Three puzzles per session (L1: three semantic; L2+: one semantic, two grammatical). Then `ctx.finish` (`completed`).

## Sanskrit rules
- **One dimension per puzzle.** The six options always belong to a single dimension, so a clue can never fit two of them:
  - *semantic* — vocab `category` values;
  - *vibhakti* — the seven case names;
  - *lakāra* — the five lakāras of the pack;
  - *puruṣa-vacana* — six of the nine verb cells;
  - *kṛt suffix* (L4) — ktvā, tumun, kta, ktavatu, tavya, anīyar.
- **No syncretic clues.** A nominal clue for vibhakti *V* must be a display form that occurs in no other vibhakti row (1–7) of its own paradigm: रामेण qualifies for tṛtīyā; रामाभ्याम्, रामयोः and फलम् never appear. The same test applies to verb clues across the lakāra tables of their dhātu, and to kṛdanta fields.
- Each of the five clues comes from a different paradigm / dhātu, so the common feature is the only thing they share. Vacana (or puruṣa) varies across clues on purpose.
- **Semantic disjointness.** Vocab categories are single-valued in the pack, but real meanings overlap. `content.ts` holds `CONFUSABLE`: pairs of category ids that may not be offered together (`food` ↔ `fruits` ↔ `vegetables` ↔ `kitchen`, `animals` ↔ `birds`, `people` ↔ `family` ↔ `professions`, `time` ↔ `months` ↔ `days`, `house` ↔ `places`). Grammatical categories of the pack (`verbs`, `avyaya`, `pronouns`, `qualities`, `questions`, `greetings`) are not used as semantic classes. The option builder never picks both members of a pair. The table contains ids only, no Sanskrit.
- Clue order: least familiar first (highest `level`, then longest), so later clues are easier.
- Labels come from `VIBHAKTI_NAMES`, `LAKARA_NAMES`, `PURUSHA_NAMES` + `VACANA_NAMES`; semantic labels use `VOCAB_CATEGORIES[i].sa` with the English title as a sub-label. Kṛt labels as in `krdanta-racana`.
- Never generate a clue form; never use a clue whose class is debatable.

## Content
- `@content/vocab` (≈ 1,020 words, 29 categories with Sanskrit names): categories with ≥ 8 words at `level ≤ ctx.level`; at least 8 mutually non-confusable ones are required (asserted for L1).
- `@content/shabda`: `shabdaForLevel(level)`, nouns and adjectives; `@content/dhatu`: `dhatusForLevel(level)`.
- Levels — L1: semantic only. L2: + vibhakti, lakāra (laṭ, laṅ, lṛṭ, loṭ). L3: + vidhiliṅ, puruṣa-vacana. L4: + kṛt suffix.
- Variety: C(words, 5) per class makes repeats practically impossible; minimum 10 unambiguous clue forms per grammatical class per level (asserted).
- Later (not v1): authored cultural sets (ṛtus, Pāṇḍavas, synonyms of "water") need a reviewed `varga` category pack shared with Catuṣṭayam — see Platform prerequisites.

## Modes, levels, scoring
- Per puzzle: `6 − cluesOpened − wrongGuesses`, floor 0 (first clue, no mistakes = 5). Session score = sum × 10 (max 150).
- Stars: ≥ 120 → 3; ≥ 80 → 2; > 0 → 1. `correct` = puzzles solved, `total` = 3.
- Mastery: `shabdakosha` · `varga:<category>`; `vibhakti` · `recognise:<v>`; `kriyapada` · `recognise:<lakara>` or `cell:<p>.<v>`; `krdanta` · `recognise:<field>`. Correct = solved within two clues.
- Share card (daily), one row per puzzle — 🟩 at the clue where it was solved, 🟥 per wrong guess before it, ⬜ unused:
  ```
  🟩⬜⬜⬜⬜
  🟥🟩⬜⬜⬜
  🟨🟨🟨🟩⬜
  ```
  (🟨 = clue opened without guessing.)
- Daily progress stored under `ctx.store` by `ctx.dateKey`.

## UX notes
Portrait: five clue `Card`s in a column (face-down ones show their number), option grid 2 × 3 of `Choice` buttons below, "Next clue" as a secondary `Button`. Struck options use `state="muted"`. Hotkeys 1–6 and N. `ctx.expose({ phase, puzzle, answer, cluesOpen })`.

## Acceptance tests
- `logic.test.ts`: every grammatical clue is unambiguous — exhaustive check that the clue string occurs in exactly one class of its dimension within its own paradigm / dhātu.
- `logic.test.ts`: named exclusions — रामाभ्याम्, रामयोः, फलम् are never clues; रामेण can be a tṛtīyā clue.
- `logic.test.ts`: options are six distinct labels of one dimension containing the answer; no `CONFUSABLE` pair co-occurs; five clues come from five different sources.
- `logic.test.ts`: `testMatrix([1, 2, 3, 4], 25)` → three puzzles, dimensions allowed for the level, deterministic.
- `logic.test.ts`: scoring — first-clue solve = 5; solve on clue 3 after one wrong guess = 2; reveal = 0; perfect bot scores 150; random bot always terminates (≤ 6 guesses per puzzle).
- `e2e.spec.ts`: solve three puzzles at 390 px (one on the first clue, one after "Next clue", one after a wrong guess) → result with a three-row share card; reload restores state; IAST run; no console errors; no overflow.

## Out of scope / later
Free-text answers; authored cultural categories; a "reverse" mode (given the class, pick the intruder).

## Open questions
- Sanskrit reviewer: sign off the `CONFUSABLE` table and the category names shown as options.
- Product: should grammatical puzzles show English sub-labels ("instrumental") or Sanskrit only?
