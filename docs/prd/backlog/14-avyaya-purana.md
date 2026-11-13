# अव्ययपूरणम् · Avyaya-pūraṇam — Fill in the indeclinable

| | |
|---|---|
| **Id** | `avyaya-purana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | quiz — after *Duolingo "complete the sentence"* |
| **Skills / levels** | avyaya, vakya · L1–L3 |
| **Modes** | practice |
| **Session** | ~3 min, 10 questions, 3 hearts |
| **Build size** | S (QuizRunner only) |

## Learning objective
Own the small words that hold spoken Sanskrit together: कुत्र / अत्र / तत्र, कदा / अद्य / श्वः / ह्यः, च / अपि / एव / न, and the correlative pairs यदा–तदा, यत्र–तत्र, यदि–तर्हि. After 20 sessions a Śibira learner answers "कुत्र?" questions and joins two clauses without hesitating. This is the only game whose primary skill is `avyaya`.

## Why people come back
Short, forgiving lessons with a strong pattern-spotting element (the क- / त- / य- / सर्व- families), and a level ladder from single words to paired clauses.

## Core loop
`logic.ts` builds 10 questions; `<QuizRunner>` runs them. Four question types:
1. **Meaning pairs** (pairs): four avyayas ↔ four English glosses.
2. **Family grid** (choice): a row of a family with one gap — `कुत्र · तत्र · ___ · सर्वत्र` — choose the missing member (यत्र).
3. **Correlative** (choice): `यदा … ___` → तदा, or the reverse.
4. **Sentence gap** (choice): a pack sentence with its avyaya blanked and the English translation shown; choose the avyaya.
Feedback shows the completed item and gloss. Wrong items return once.

## Sanskrit rules
- **Sentence gaps** use only sentence-pack tokens tagged as avyaya. The keyed answer is the pack's token. Because the English translation is shown, distractors must differ in *meaning class* from the key (place, time, manner, connective, negation, question) — two words of the same class could both make a good sentence. The vocab pack does not sub-classify its 73 indeclinables, so classes come from a game-local map of vocab ids → class (ids only; words in the `questions`, `directions` and `time` categories take their class from the category).
- **Tense-cue gaps** (L2): when the blank is ह्यः or श्वः and the verb tag is `lan` or `lrt`, the only time-class distractor allowed is the opposite one; अद्य is never a distractor there because it fits either tense.
- Position-sensitive particles (च, एव, अपि, न, इति) are never moved: the blank sits where the pack has the word. No pack sentence is ever reordered.
- **Closed tables** (game-local `content.ts`; source: standard correlative and pronominal-adverb series as taught in Samskrita Bharati's Abhyāsa-pustakam and listed in Apte, *The Student's Guide to Sanskrit Composition*; every item is asserted to pass `validateDeva`, and to exist in the vocab pack where the pack has it):
  - Correlatives: यदा–तदा · यत्र–तत्र · यथा–तथा · यदि–तर्हि · यावत्–तावत् · यतः–ततः · यद्यपि–तथापि.
  - Families (question · near · that · relative · all): place कुत्र · अत्र · तत्र · यत्र · सर्वत्र; time कदा · — · तदा · यदा · सर्वदा; manner कथम् · एवम् · तथा · यथा · सर्वथा; source कुतः · इतः · ततः · यतः · सर्वतः. The empty slot is never asked.
- A family-grid distractor is a member of another family or another column — never a word that also fits the gap.
- Sanskrit only through `<SaText>`; no sandhi is applied to any phrase built here (items are shown as separate words with a middle dot or ellipsis).
- Never write a new sentence in the game.

## Content
- `@content/vocab`: entries in the indeclinable category with `level ≤ ctx.level` (need ≥ 30 at L1, ≥ 50 at L2; asserted).
- `@content/sentences`: sentences with `level ≤ ctx.level` and ≥ 1 word of `role: 'avyaya'` — the patterns `hyah-lan`, `shvah-lrt`, `adya-lat`, `karta-avyaya-kriya`, `na-kriya`, `api`, `saha`, `vina`, `prati` supply about 170. Need ≥ 60 per level (asserted).
- Levels — L1: types 1, 2, 4 with place / time / yes-no words. L2: + correlatives, connectives, tense cues. L3: the full tables.
- Distinct questions available at L1 without sentences: 30 words (pairs) + 4 families × 4 gaps = enough for the first lessons, but sentence gaps are what prevent repetition.

## Modes, levels, scoring
- QuizRunner defaults (3 hearts, 10 points + streak, retry wrong once). Stars from first-pass accuracy.
- Mastery: `avyaya` · `vocab:<id>` (meaning and sentence gaps); `avyaya` · `pair:<relative>` (correlatives, e.g. `pair:यदा`); `avyaya` · `family:<row>:<column>`.

## UX notes
Pure `<QuizRunner>`. The family row is one `prompt.sa` string with middle dots; the gap is a full-width low line. Sentence gaps put the translation in `context.text`.

## Acceptance tests
- `logic.test.ts`: `testMatrix([1, 2, 3], 25)` → 10 valid questions; type mix per level.
- `logic.test.ts`: closed tables — every string passes `validateDeva`; every correlative pair is unique in both directions; no family has duplicate members.
- `logic.test.ts`: sentence gaps — the key equals the pack token; no distractor shares the key's meaning class; in tense-cue items the distractor set contains the opposite time adverb and no अद्य.
- `logic.test.ts`: family grid — exactly one option completes the row; correlative — exactly one option is the partner.
- `logic.test.ts`: pool assertions with a printed coverage report (avyaya sentences per level); perfect bot 10/10; failing bot `lost`.
- `e2e.spec.ts`: perfect run at 390 px; wrong answer path with the completed sentence in feedback; IAST run; no console errors; no overflow.

## Out of scope / later
Upasargas (covered by `dhatu-vistara`); avyayībhāva compounds; particles of emphasis in verse (हि, तु, वै, खलु).

## Open questions
- Platform: a `subcategory` on vocab indeclinables would replace the game-local class map.
- Sanskrit reviewer: sign off the two closed tables; decide whether इदानीम् / अधुना should fill the empty "near · time" slot.
