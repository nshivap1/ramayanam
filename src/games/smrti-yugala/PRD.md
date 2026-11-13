# स्मृतियुगलम् · Smṛti-yugalam — Memory pairs

| | |
|---|---|
| **Status** | stable · v1.0.0 |
| **Kind / inspired by** | puzzle · Memory / Concentration |
| **Skills / levels** | akshara · L0 |
| **Session** | ~2 min, 8 pairs |

## Learning objective
Fast, automatic recognition of Devanagari akṣaras and their sounds, strengthened by having to hold several in working memory at once.

## Why people come back
A two-minute board, a "fewest moves" personal best, a shared daily board with a share card, and a different mix of letters each time.

## Core loop
1. 16 face-down cards (8 akṣaras + their 8 romanised sounds), dealt from the seed.
2. Flip two. Akṣara + its own sound → the pair stays up (green). Otherwise both show for ~0.9 s and turn back; input is ignored meanwhile.
3. Clear the board → result: stars by moves (≤ 12 → ★★★, ≤ 18 → ★★, else ★), score `160 − 5 × mismatches` (min 10).

## Sanskrit rules
- Sound labels are computed with `devaToIast`; nothing is hand-typed.
- The akṣara face is always Devanagari (`script="deva"`), the sound face always IAST — the pair *is* the script mapping.
- Deck has unique romanisations, so a card can never have two valid partners.

## Content
`DECK` in `logic.ts`: 11 vowels, 33 consonants, 4 conjuncts (क्ष ज्ञ त्र श्र). No external pack. A later version should add vocabulary levels (word ↔ meaning) from the vocab pack.

## Modes, levels, scoring
`practice` (random board) and `daily` (same board for everyone that day; share card). Mastery: one event per matched akṣara, id `akshara:pair:<akṣara>`.

## Acceptance tests
- `logic.test.ts`: deck validity; deterministic deals with exactly two faces per key; flip/settle rules and guards; perfect bot wins every seed in 8 moves; random bot always terminates with invariants intact; star thresholds.
- `e2e.spec.ts`: perfect play → won, 3 stars, score 160, share text; mismatch shows then hides and blocks input; daily board identical across sessions; no overflow; no console errors.

## Out of scope / later
Vocabulary and vibhakti decks; timed mode; two-player pass-and-play.
