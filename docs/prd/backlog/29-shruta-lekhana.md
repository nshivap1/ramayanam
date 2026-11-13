# श्रुतलेखनम् · Śruta-lekhanam — Dictation

| | |
|---|---|
| **Id** | `shruta-lekhana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | lesson — after *Duolingo "type what you hear"* (text-only now, audio-ready) |
| **Skills / levels** | akshara, shabdakosha, vakya · L1–L3 |
| **Modes** | practice |
| **Session** | ~3 min, 8 items |
| **Build size** | M |

## Learning objective
Hold a word or sentence in mind and write it exactly — what classroom dictation trains. Until recorded audio exists the stimulus is a brief **flash** of the text; when audio arrives the same items are heard instead. Either way the learner must attend to vowel length, aspiration, the three sibilants, anusvāra and visarga.

## Why people come back
A different challenge (memory + spelling) and a visible ladder: choose → build → type → sentences.

## Core loop
1. **Stimulus**: "Ready?" → the item is presented once — flashed for a set time, then masked (or, later, played as audio).
2. **Response**, by level:
   - L1 *choose*: four look-alike words; pick the one shown.
   - L1–L2 *build*: arrange akṣara tiles (the word's akṣaras + two confusable decoys).
   - L2–L3 *type*: write the word on the akṣara keyboard.
   - L3 *sentence*: arrange the word tiles of a short sentence **in the order presented**.
3. **Replay** is allowed twice per item; each replay halves that item's points.
4. Check → feedback shows the item, with the differing akṣara highlighted on a miss. Eight items → `completed` (no hearts).

## Sanskrit rules
- Items come from `@content/vocab` (`sa`) and `@content/sentences` (words joined by spaces, padaccheda form as stored).
- **Look-alike distractors are real words**: vocab entries with the same akṣara count that differ from the target in exactly one akṣara, where that akṣara differs by one feature computed with `aksharaParts` and `VARNAS` — vowel length (दिन / दीन type), aspiration, voicing, sibilant (श / ष / स), dental vs retroflex, or presence of anusvāra / visarga. With fewer than three such neighbours, fill with same-length words sharing the first akṣara. Never fabricate a near-miss spelling.
- *Build* decoy tiles are akṣaras from those neighbour words.
- **Reproduction, not composition.** In the sentence task the only accepted order is the order presented — free word order does not apply to reproducing what was shown or heard, and the instruction says so.
- Typed answers are compared after `normalizeDeva`. In flash mode the pack spelling was visible, so it is required; anusvāra typed for a class nasal is marked "nearly" (wrong, with the pack spelling shown).
- **Audio mode (later) changes the rules**: spellings that sound identical (anusvāra vs class nasal before a stop) must both be accepted, which needs the shared comparison key proposed for `@sanskrit`.
- Only typeable targets are used for *type* (same filter as `lekhana-vega`: every key of `keysFor(target)` on the visible keyboard and an exact `applyKey` round trip).

## Content
- Words: vocab with `level ≤ ctx.level`, 2–4 akṣaras. *Choose* needs ≥ 80 words with three look-alike neighbours (asserted; the test prints the count per feature).
- Sentences: `level ≤ 3`, 3–5 words, no repeated word (so the order is unambiguous by text). ≥ 60 required.
- **Stimulus abstraction (the audio-readiness requirement).** `logic.ts` describes each item's stimulus as data: `{ kind: 'flash', sa, ms }` today; `{ kind: 'audio', clipId, fallback }` later. All presentation lives in one component (`Stimulus.tsx`); state, scoring and tests never depend on the kind. Clip ids are the content ids (`vocab:<id>`, `sentence:<id>`), so an audio pack keyed the same way plugs in without touching logic.
- Flash duration: `600 ms + 350 ms × akṣaras` at L1, × 0.8 at L2, × 0.65 at L3; sentences `900 ms × words`. A "more time" setting on the start card doubles it (stored in `ctx.store`).

## Modes, levels, scoring
- Points: 20 per item, halved per replay; *nearly* = 0 but shown differently from a miss.
- Stars from accuracy (≥ 90 % → 3, ≥ 70 % → 2, > 0 → 1). `best: { label: 'Items without replay', value }`.
- Mastery: `shabdakosha` · `vocab:<id>` (word items); `akshara` · `contrast:<feature>` (e.g. `contrast:sibilant`) for *choose*; `vakya` · `sentence:<id>:order`.

## UX notes
Custom shell around `@ui` parts (flash-then-respond does not fit `<QuizRunner>`): stimulus card (large `<SaText>`, then a neutral mask — no flicker), response area (`Choice`, `Chip` bank or `AksharaKeyboard`), `FeedbackBar`. Timers enter logic as numbers; `ctx.expose({ phase, answer, stimulus })` lets a bot answer. Screen-reader users get the item once via `ctx.announce` instead of the flash.

## Acceptance tests
- `logic.test.ts`: neighbours — every look-alike differs from its target in exactly one akṣara and one listed feature; all are vocab words; named feature fixtures taken from the pack (one pair per feature that exists).
- `logic.test.ts`: `testMatrix([1, 2, 3], 25)` → eight items, response types allowed for the level, deterministic; *choose* has exactly one correct option; *build* tiles include every target akṣara.
- `logic.test.ts`: sentence items have no repeated word and accept only the presented order.
- `logic.test.ts`: scoring — replay halves points (20 → 10 → 5); a third replay is refused; *nearly* detection for anusvāra vs class nasal.
- `logic.test.ts`: stimulus data is `kind: 'flash'` with the duration formula; a stubbed `audio` kind passes through the same state machine (proves audio-readiness).
- `logic.test.ts`: perfect bot → 160 points, 3 stars; always-wrong bot → `completed`, 0 stars.
- `e2e.spec.ts`: full session at 390 px answering from `window.__game` across all four response types; one replay; one wrong answer with the differing akṣara highlighted; "more time" persists; IAST run; no console errors; no overflow.

## Out of scope / later
Recorded audio (platform prerequisite: an audio capability with human recordings — no synthetic speech); speaking; verse dictation.

## Open questions
- Product: is flash-and-recall an acceptable stand-in for dictation in the meantime, and should the game be labelled "labs" until audio exists?
- Sanskrit reviewer: which confusions matter most for the first audio recordings?
