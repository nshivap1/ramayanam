# <Devanagari title> · <IAST title> — <English title>

<!-- Copy this file to docs/prd/backlog/NN-<id>.md (proposal) and later to src/games/<id>/PRD.md (as built). -->

| | |
|---|---|
| **Id** | `<kebab-case-id>` (permanent; folder name) |
| **Status** | proposed · in-progress (@who) · built vX.Y.Z |
| **Kind / inspired by** | arcade · puzzle · daily · lesson · quiz — after *<popular game>* |
| **Skills / levels** | primary skill first (akshara, shabdakosha, vibhakti, kriyapada, sandhi, samasa, vakya, chandas, subhashita, sankhya, avyaya, krdanta) · L0–L5 |
| **Modes** | daily · practice · endless · timed |
| **Session** | minutes, number of rounds |
| **Build size** | S (≤ 300 lines logic+UI) · M · L |

## Learning objective
One or two sentences: after 20 sessions, what can the learner do that they could not before? Tie it to the Samskrita Bharati level.

## Why people come back
The engagement hook: daily seed + share card, personal best, unlocks, streak, variable reward, "one more round" pacing.

## Core loop
Numbered steps of exactly what the player sees and does in one round, including what happens on a right and a wrong action, and how a session ends (win, lose, complete).

## Sanskrit rules
The linguistic rules the game depends on and how each is guaranteed:
- playable unit (akṣara / pada / pāda …) and how it is segmented
- what counts as a correct answer; alternates (vikalpa), homographs, free word order
- what the game must never do (e.g. generate words, split by code point)
- which engine functions are used (`@sanskrit`: …)

## Content
- Packs and helpers used (`@content`: `vocabForLevel`, `SHABDA`, `conj` …), filters per level
- Any game-local data (must be derived from packs or listed here item by item with a source)
- Minimum content needed for the game not to feel repetitive (e.g. ≥ 60 distinct rounds per level)

## Modes, levels, scoring
- What changes per level and per mode
- Score formula, stars, lives/timer, personal-best statistic
- `mastery` item ids emitted (`<skill>:<stable-id>`)
- Share card format (daily games)

## UX notes
Layout sketch (portrait phone first), components from `@ui` to use, input methods (tap / swipe / keys), feedback moments, accessibility notes.

## Acceptance tests
A checklist that becomes tests. Each line starts with the file it lives in.
- `logic.test.ts`: …
- `logic.test.ts`: simulation — a perfect bot wins every seed × level; a random/adversarial bot always terminates; invariants …
- `logic.test.ts`: content — every puzzle has exactly the keyed answer(s); no distractor is also correct …
- `e2e.spec.ts`: full session to the result screen at 390 px; wrong-answer path; no console errors; no overflow; IAST script …

## Out of scope / later
What is deliberately not in v1.

## Open questions
Anything a product owner or Sanskrit reviewer must decide before building.
