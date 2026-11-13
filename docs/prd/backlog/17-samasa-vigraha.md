# समासविग्रहः · Samāsa-vigrahaḥ — Unpack the compound

| | |
|---|---|
| **Id** | `samasa-vigraha` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | lesson — after *Duolingo lessons* (analysis drills) |
| **Skills / levels** | samasa · L4–L5 |
| **Modes** | practice |
| **Session** | ~3 min, 10 questions, 3 hearts |
| **Build size** | S (QuizRunner only) |

## Learning objective
Dissolve a compound into its vigraha-vākya and name its type. After 20 sessions a Kovida student sees राजपुरुषः and says "राज्ञः पुरुषः — ṣaṣṭhī-tatpuruṣa"; a Śikṣā student at least recognises which vigraha belongs to which compound. The first-wave Samāsa-setuḥ trains fast matching; this is its slow, analytic companion: the *type* and the *case relation* are the point.

## Why people come back
The "aha" of a long word falling apart into a plain sentence; stars per compound family (tatpuruṣa, dvandva, bahuvrīhi …) that fill in as families are mastered.

## Core loop
`logic.ts` builds 10 questions; `<QuizRunner>` runs them.
1. **Choose the vigraha** (choice): a compound and its meaning; four vigrahas from the pack.
2. **Choose the compound** (choice): a vigraha is shown; four compounds.
3. **Name the type** (choice): compound + vigraha shown; choose the samāsa type (L5 also: the finer `subtype`).
4. **Build the vigraha** (arrange, L5): the vigraha's words as tokens plus two decoy tokens.
5. **Pairs** (one per lesson): four compounds ↔ four vigrahas.
Feedback shows compound, vigraha, type and English meaning together.

## Sanskrit rules
- Compounds, vigrahas and types are taken verbatim from `@content/samasa`. The game never forms a compound and never writes a vigraha.
- **Type options are the pack's `SamasaType` values** (`tatpurusha`, `karmadharaya`, `dvigu`, `nan-tatpurusha`, `upapada`, `dvandva`, `bahuvrihi`, `avyayibhava`), labelled from `SAMASA_TYPES`. The middle four are kinds of tatpuruṣa, so a sub-kind and `tatpurusha` are never offered together (for a karmadhāraya answer, "tatpuruṣa" is not a distractor, and vice versa); the map is an id table in `logic.ts`. At L4 the sub-kinds are folded into tatpuruṣa (four options: tatpuruṣa, dvandva, bahuvrīhi, avyayībhāva).
- **Ambiguous compounds.** Many compounds allow two analyses (karmadhāraya in one sense, bahuvrīhi in another). The pack records one type per entry and the question always shows the vigraha, which fixes the analysis; if the same compound string occurs in two entries, neither is used for *Name the type*.
- **Distractor vigrahas / compounds** are other pack entries, preferably sharing one member word with the answer, and must not be string-equal to it after `normalizeDeva`. Two pack entries with the same vigraha are never opposed.
- **Build the vigraha**: tokens are the vigraha split on spaces exactly as stored. Accepted orders: the stored order, plus any alternates the pack lists. Vigraha wording is conventional, so free-word-order permutations are *not* auto-accepted; to keep that fair, v1 uses this type only for vigrahas of ≤ 3 tokens that include च or a fixed formula (dvandva "X च Y च", nañ "न X"), where the conventional order is the natural one. Decoy tokens are other case-forms that appear in other vigrahas, never forms present in the answer.
- Sandhi inside the compound is not undone on screen; the vigraha is the explanation.
- Type names come from `SAMASA_TYPES[t].sa`; `subtype` strings (e.g. षष्ठी-तत्पुरुषः) are shown as stored.

## Content
- `@content/samasa` (`SAMASAS`, `samasasByType`, `SAMASA_TYPES`): 244 entries — 64 at level 4, 180 at level 5, none below — with `compound`, `vigraha`, `type`, `subtype?`, `members`, `en`.
- Levels — L4: types 1, 2, 5 and *Name the type* over the four main groups, entries with `level ≤ 4`. L5: all entries, sub-kinds, `subtype` questions, *Build the vigraha*.
- Minimum pool: ≥ 60 entries at L4, ≥ 200 at L5; each type offered as an answer needs ≥ 6 entries (asserted with a printed table).
- 244 entries × 3–4 question types gives ≈ 800 distinct questions.

## Modes, levels, scoring
- QuizRunner defaults (3 hearts, 10 points + streak, retry wrong once); stars from first-pass accuracy.
- Mastery: `samasa` · `<id>:vigraha` (types 1, 2, 4, 5) and `samasa` · `<id>:type` (type 3).
- `review` lists each compound with its vigraha as the note.

## UX notes
Pure `<QuizRunner>`. Long compounds must wrap between akṣaras only — `<SaText nowrap={false}>` in prompts; verify the longest pack compound at 360 px. Type options show Sanskrit name with a small English gloss.

## Acceptance tests
- `logic.test.ts`: `testMatrix([4, 5], 25)` → 10 valid questions (`assertValidQuestions`), type mix per level.
- `logic.test.ts`: every choice question has exactly one correct option; no distractor equals the answer after normalisation; no two options are identical.
- `logic.test.ts`: *Name the type* — never offers `tatpurusha` beside one of its sub-kinds; never asked for a compound string that occurs in two entries; named case: राजपुरुषः keys `tatpurusha` and the vigraha राज्ञः पुरुषः.
- `logic.test.ts`: *Build the vigraha* — joining the answer tokens with spaces reproduces the stored vigraha; decoys are not among the answer tokens; only ≤ 3-token vigrahas used.
- `logic.test.ts`: pack sanity used by the game — ids unique; every compound and vigraha passes `validateDeva` (spaces allowed); coverage table per type and level; pool assertions.
- `logic.test.ts`: perfect bot 10/10 `completed`; always-wrong bot `lost`.
- `e2e.spec.ts`: perfect run at 390 px; wrong answer shows compound + vigraha + type in feedback; an L5 run that builds one vigraha by tapping tokens; IAST run; longest compound does not overflow at 360 px; no console errors.

## Out of scope / later
Forming the compound from a vigraha by typing; nested compounds (multi-step vigraha); samāsānta suffixes; svara rules.

## Open questions
- Platform / pack: record alternate vigraha wordings and alternate analyses where they exist; tag a transparent subset at level 3 for recognition-only play.
- Sanskrit reviewer: is folding karmadhāraya, dvigu, nañ and upapada into tatpuruṣa at L4 the right simplification?
