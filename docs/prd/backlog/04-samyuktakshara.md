# संयुक्ताक्षरम् · Saṃyuktākṣaram — Build the conjunct

| | |
|---|---|
| **Id** | `samyuktakshara` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | lesson — after *Duolingo character-building exercises* |
| **Skills / levels** | akshara · L0 |
| **Modes** | practice |
| **Session** | ~3 min, 10 questions, 3 hearts |
| **Build size** | S (QuizRunner only) |

## Learning objective
Read and take apart conjunct akṣaras. After 20 sessions the learner sees क्ष, त्र, र्म or स्त्र inside a real word and names its parts in order (क् + ष् + अ), and can assemble an akṣara from parts. This closes L0: the first-wave letter lesson teaches 40 conjuncts by sight; this game teaches how every conjunct works.

## Why people come back
Three stages (simple stacks → special ligatures and र-forms → three-consonant clusters) with stars per stage, and every question is anchored to a real picture word.

## Core loop
1. Pick an unlocked stage; `logic.ts` builds 10 questions; `<QuizRunner>` runs them.
2. **Assemble** (arrange, 4 per lesson): the prompt shows a word with one akṣara replaced by `＿`, its emoji and the word's IAST; the bank holds the missing akṣara's parts plus two decoys. Tap parts in spoken order.
3. **Take apart** (choice, 3 per lesson): an akṣara is shown large; choose its correct breakdown among four (`क् + ष् + ए`).
4. **Spot it** (choice, 2 per lesson): a breakdown is shown; choose the akṣara among four look-alikes.
5. **Pairs** (1 per lesson): four conjuncts ↔ their breakdowns.
6. Feedback always shows `parts = akṣara` and the full source word with meaning. ≥ 2 stars unlocks the next stage.

## Sanskrit rules
- Decomposition comes only from `aksharaParts(akshara)`: onset `consonants` in order, `vowel`, `finals`, `modifiers`. Part tokens are: each onset consonant written with virāma (क्), the vowel as an independent letter (अ for the inherent vowel, ए for े …), a final halanta consonant with virāma, and ं / ः as "◌ं" / "◌ः" labels.
- The spoken order is the only correct order: onset consonants left to right, then vowel, then modifiers / finals. `ArrangeQuestion.answers` lists that order; when two tokens have identical text (त् त् in त्त) every id-permutation of the identical tokens is also listed.
- Reassembly is checked with `composeAkshara(parts) === akshara` in tests, so the key can never drift from the engine.
- **Only attested akṣaras.** Targets are conjunct akṣaras (onset length ≥ 2) that occur in a vocab-pack word; the word is the prompt context. No cluster is ever composed that is not in a pack word.
- Decoy part tokens are consonants from the same varga or a visual look-alike list (ब/व, घ/ध, भ/म, ष/प, द/ढ) and are never a consonant of the target.
- Wrong breakdown options are permutations or one-consonant substitutions of the true parts; a test asserts none of them composes to the target.
- Prompts and options are locked to Devanagari (`script: 'deva'`), as in `akshara-paricaya`; IAST appears only as the sound hint.
- Repha and rakāra are ordinary cases of the rule (र्म = र् + म् + अ; प्र = प् + र् + अ) and are deliberately over-sampled in stage 2 because their shapes hide the order.

## Content
- Derived at module load: `splitAksharas` over every vocab word with `level ≤ 2`; keep akṣaras whose `aksharaParts().consonants.length ≥ 2`; remember one or more source words per akṣara (prefer words with emoji).
- Staging (computed, not typed): stage 3 = three or more onset consonants; stage 2 = contains र in the onset, or is one of the opaque ligatures identified by consonant pair — (क,ष) (ज,ञ) (द,ध) (द,व) (द,य) (द,म) (ह,म) (ह,य) (श,च) (श,व) (क,त) (त,त); stage 1 = everything else.
- Minimum pool: ≥ 60 distinct conjunct akṣaras overall and ≥ 12 per stage (asserted). If stage 3 has fewer than 12, it is merged into stage 2 and the manifest text says "two stages".

## Modes, levels, scoring
- Practice only, L0. QuizRunner defaults (3 hearts, 10 points, retry wrong once).
- Stars from first-pass accuracy; unlocked stage in `ctx.store` (`{ v: 1, stage }`).
- Mastery: `akshara` · `conjunct:<onset consonants joined with virāma>:<build|split|spot>` (e.g. `conjunct:क्ष:build`), so the same cluster with different vowels shares one record.

## UX notes
Stage picker as three `Card`s with stars, then `<QuizRunner>`. Part tokens are `Chip`s (QuizRunner renders them). The blank in the context word is the full-width low line so it is not mistaken for a letter. No custom layout beyond the stage picker.

## Acceptance tests
- `logic.test.ts`: every target akṣara round-trips `composeAkshara(aksharaParts(a)) === a` and occurs in its source word's `splitAksharas`.
- `logic.test.ts`: named cases — क्षे → [क्, ष्, ए]; र्म → [र्, म्, अ]; a word-final akṣara such as तम् yields a final-consonant token म् after the vowel.
- `logic.test.ts`: `testMatrix([0], 40)` × 3 stages → 10 valid questions (`assertValidQuestions`); every arrange answer composes to the target; no decoy token equals a target part; identical-token permutations accepted.
- `logic.test.ts`: no wrong breakdown option composes to the target; all options are distinct strings.
- `logic.test.ts`: pool-size assertions; perfect bot completes 10/10; failing bot loses; unlock rule.
- `e2e.spec.ts`: perfect stage-1 run → stage 2 unlocks; a wrong order shows `parts = akṣara` in feedback and the item is retried; IAST app script still shows Devanagari parts; 390 px and 1280 px without overflow; no console errors.

## Out of scope / later
Typing the conjunct on `AksharaKeyboard`; stroke order; Vedic and rare clusters not present in the vocab pack.

## Open questions
- Sanskrit reviewer: is showing the inherent vowel as an explicit अ token the right teaching choice, or should the last consonant simply appear without virāma (क् + ष)?
- Should ज्ञ be taught with its traditional pronunciation note? (No audio yet; this PRD shows only the spelling.)
