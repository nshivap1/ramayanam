# लेखनवेगः · Lekhana-vegaḥ — Typing speed

| | |
|---|---|
| **Id** | `lekhana-vega` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | arcade — after *ZType / TypeRacer* |
| **Skills / levels** | akshara, shabdakosha · L0–L3 |
| **Modes** | timed · endless · practice |
| **Session** | 60 s (timed) or until 3 misses (endless) |
| **Build size** | M |

## Learning objective
Write Sanskrit fluently on the akṣara keyboard: vowel signs, virāma conjuncts, anusvāra and visarga without hunting for keys. After 20 sessions a learner types a three-akṣara word in under four seconds, which makes every typing game (and real writing) pleasant.

## Why people come back
One honest number — akṣaras per minute — with a personal best, and a verse race at L3.

## Core loop
1. One target word at a time descends a short lane, shown large with its emoji.
2. The player types on `AksharaKeyboard`. After each key the typed text is checked against the target:
   - still a prefix of the target → accepted, completed akṣaras light up;
   - not a prefix → the key is **rejected** (text unchanged), error +1, light haptic; no backspacing needed.
3. Typed text equals the target → the word pops and the next spawns, slightly faster.
4. A word reaching the bottom line costs a life (endless: 3 lives) or 3 seconds (timed).
5. Timed: 60 s → `completed`. Endless: 0 lives → `lost`. Practice: no descent, 15 words → `completed`.
6. **Verse race (L3)**: a subhāṣita is typed pāda by pāda; spaces and daṇḍas are skipped automatically.

## Sanskrit rules
- Text is built only by `applyKey` (from `@ui`), so it is always well-formed. The prefix test compares code points of `normalizeDeva(typed)` and `normalizeDeva(target)` — states such as क् on the way to क्ष are legitimate prefixes, so the check cannot be per akṣara.
- Progress and speed are counted in **akṣaras** (`splitAksharas` of the accepted text; a trailing halanta fragment counts when its akṣara completes).
- **Typeability filter.** A target is eligible only if every key of `keysFor(target)` is on the visible keyboard (`VOWEL_KEYS`, `RARE_VOWEL_KEYS`, `CONSONANT_ROWS`, `MARK_KEYS`) and replaying them through `applyKey` reproduces it. This excludes ॐ, candrabindu and ळ (note: `applyKey` accepts candrabindu, but there is no key for it). `rareVowels` is on only when the target needs ॠ or ऌ.
- **Spelling variants.** The pack writes class nasals inside words (सङ्ख्या); typing anusvāra instead (संख्या) is common practice. v1: that key is rejected but not counted as an error, and the expected key is highlighted (`keyState`). Accepting variants needs a shared comparison key in `@sanskrit` (Open questions).
- Targets come from packs only; verses are typed exactly as stored (avagraha included). The IAST setting changes the shown target, not the keyboard.

## Content
- `@content/vocab`, filtered by level and akṣara shape (computed with `aksharaParts`):
  - L0: 2-akṣara words, no conjuncts, no final halanta where possible — vowel-sign practice.
  - L1: 2–3 akṣaras, at most one two-consonant conjunct.
  - L2: 3–5 akṣaras, any conjuncts, anusvāra / visarga.
  - L3: L2 words + verse race on `@content/subhashita` verses with `level ≤ 3` in anuṣṭubh.
- Minimum pool: ≥ 150 typeable words per level (asserted; L0 may fall back to 2-akṣara L1 words); ≥ 20 fully typeable verses.
- Spawn order: seeded shuffle without repeats.

## Modes, levels, scoring
- Speed: 9 s per word, shrinking 3 % per word to a floor of 3.5 s (L0: 12 s → 5 s).
- Score: 10 per akṣara typed, × 1.5 for a word with no rejected keys.
- Metrics in `summary`: `42 akṣaras/min · 93 % accuracy` (accuracy = accepted keys / all keys).
- `best: { label: 'Akṣaras per minute', value }`. Stars (timed): ≥ 40 APM and ≥ 90 % → 3; ≥ 25 APM → 2; any word → 1. Level-0 thresholds are halved.
- HUD: `timeLeftMs` or `lives`, `score`, `combo`.
- Mastery: `shabdakosha` · `vocab:<id>`, correct = typed with no rejected keys (variant keys excepted); verse race: `subhashita` · `<verseId>:type`.

## UX notes
Portrait: the keyboard takes the lower ~45 % of the stage, so the lane is ~150 px tall: a short slide plus a shrinking bar (bar only under reduced motion). Target at ≥ 28 px with typed akṣaras tinted; next target previewed small. Simulation in `logic.ts` as `step(state, dtMs)` and `key(state, k)`; `useRafLoop` drives it. Hardware keys that emit Devanagari go through `applyKey` (`useKeydown`); Roman typing is not supported in v1. `ctx.expose({ phase, target, typed, nextKeys: keysFor(rest) })`.

## Acceptance tests
- `logic.test.ts`: every pool word passes the typeability filter and the level's shape limits; a candrabindu word is excluded.
- `logic.test.ts`: prefix logic — typing पुस्तकम् key by key is accepted at every step (including the states ending in virāma); a wrong consonant is rejected and leaves the text unchanged; anusvāra typed where the pack has a class nasal is rejected without adding an error and sets the hint key.
- `logic.test.ts`: पुस्तकम् scores 3 akṣaras; APM and accuracy on a scripted run.
- `logic.test.ts`: simulation with fixed `dt` — perfect bot (types `keysFor(target)` instantly) never loses a life and reaches the speed floor; idle bot loses in endless after exactly three words reach the line; timed mode ends at 60 000 ms; practice ends after 15 words.
- `logic.test.ts`: verse race skips spaces and daṇḍas and completes on the last akṣara; `testMatrix([0, 1, 2, 3], 25)` determinism; pool assertions.
- `e2e.spec.ts`: type three words through the on-screen keys at 390 × 640 (keyboard and target both visible without scrolling); a wrong key is rejected; a shortened timed run reaches the result with APM in the summary; reduced-motion and IAST runs; no console errors.

## Out of scope / later
Roman input; a "ghost" of your previous run; sentences; races.

## Open questions
- Platform: a shared comparison key in `@sanskrit` (anusvāra ↔ class nasal, final म् ↔ ं)? A space key and Roman input for `AksharaKeyboard`?
- Sanskrit reviewer: should संख्या for सङ्ख्या be accepted, hinted (as specified) or wrong?
