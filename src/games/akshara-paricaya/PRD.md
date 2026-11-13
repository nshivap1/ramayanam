# अक्षरपरिचयः · Akṣara-paricayaḥ — Meet the letters

| | |
|---|---|
| **Status** | stable · v1.0.0 |
| **Kind / inspired by** | lesson · Duolingo character lessons |
| **Skills / levels** | akshara · L0 |
| **Session** | ~3 min, 12 questions, 3 hearts |

## Learning objective
Read every Devanagari akṣara used in Sanskrit — independent vowels, the 33 consonants, consonant + vowel-sign syllables and 40 common conjuncts — and connect each to its sound (IAST).

## Why people come back
Four short stages that unlock in order, stars per stage, and distractors drawn from look-alike letters (ब/व, घ/ध, भ/म …) so it stays challenging without being unfair.

## Core loop
1. Pick the unlocked stage.
2. Ten choice questions alternate "see akṣara → pick sound" and "see sound → pick akṣara"; two "tap the pairs" rounds (4 pairs each) sit at positions 6 and 12.
3. Check → feedback (shows `akṣara = sound`) → Continue. Wrong items are asked again at the end.
4. Result: stars from first-pass accuracy; ≥ 2 stars unlocks the next stage.

## Sanskrit rules
- The answer key is never typed by hand: romanisation is computed with `devaToIast` from `@sanskrit`.
- Prompts/options that show an akṣara are locked to Devanagari (`script: 'deva'`) even if the user's display script is IAST — this game teaches the script.
- Within a stage no two akṣaras share a romanisation, so no distractor can also be correct.
- Scope decisions: अं and अः are taught with the vowels (as in the traditional varṇamālā chart); ॡ is omitted (not used in practice); ळ is omitted (Vedic).

## Content
Closed sets defined in `logic.ts` (`VOWELS`, `CONSONANTS`, `SYLLABLES`, `CONJUNCTS`). Source: the standard varṇamālā as printed in Samskrita Bharati primers. No external pack.

## Modes, levels, scoring
Practice only. Score: 10 per correct + streak bonus (QuizRunner default). Mastery events: one per first-pass question, id `akshara:<stage>:<akṣara>:<read|find>`.

## Acceptance tests
- `logic.test.ts`: pools well-formed and unique; romanisation unique per stage and round-trips; 40 seeds × 4 stages produce valid deterministic lessons with exactly one correct option; perfect bot → completed 12/12; failing bot → lost; unlock rule.
- `e2e.spec.ts`: perfect run → 3 stars and stage 2 unlocks; mistakes → corrective feedback and retries; 3 mistakes → lost; IAST app script still shows Devanagari prompts; no horizontal overflow at 390 px and 1280 px; no console errors.

## Out of scope / later
Audio for each akṣara; stroke-order tracing; Vedic accents.
