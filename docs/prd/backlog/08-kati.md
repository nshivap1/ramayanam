# कति? · Kati? — How many? (numbers that agree)

| | |
|---|---|
| **Id** | `kati` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | quiz — after *picture counting quizzes* |
| **Skills / levels** | sankhya, vibhakti · L2–L3 |
| **Modes** | practice |
| **Session** | ~3 min, 10 questions, 3 hearts |
| **Build size** | S (QuizRunner only) |

## Learning objective
Count things correctly in Sanskrit. The number words for one to four change with gender (त्रयः बालकाः, तिस्रः बालिकाः, त्रीणि फलानि) and the noun's vacana follows the count (one → ekavacana, two → dvivacana, three or more → bahuvacana). After 20 sessions the learner makes both choices automatically — the classic Praveśa stumbling block that number-bingo games do not touch.

## Why people come back
Emoji counting is instantly understandable, rounds are short, and the two "traps" (gender of the number, dual of the noun) give a clear feeling of progress as they stop catching you.

## Core loop
1. `logic.ts` builds 10 questions; `<QuizRunner>` runs them.
2. **Pick the number** (choice, 5 per lesson): the prompt shows *n* copies of an emoji (n = 1–10, also as a Devanagari digit) and the phrase `___ फलानि`; options are number forms (त्रीणि / त्रयः / तिस्रः / द्वे).
3. **Pick the noun** (choice, 3 per lesson): prompt `द्वे ___` with the emoji row; options are three number-forms of the same noun (फलम् / फले / फलानि).
4. **Pairs** (2 per lesson): four counts (digit + emoji) ↔ four number words of one gender.
5. Feedback shows the full correct phrase and the rule in one line ("2 → द्विवचनम्; फलम् is neuter → द्वे").

## Sanskrit rules
- All forms come from `@content/shabda`: numerals `eka-m/f/n` (singular cells), `dvi-m/f/n` (dual cells only), `tri-*`, `chatur-*` (plural cells only), `panchan`, `shash`, `saptan`, `ashtan`, `navan`, `dashan` (genderless, plural cells), and noun paradigms. Nothing is composed by rule.
- **Vacana by count**: 1 → vacana 1, 2 → vacana 2, ≥ 3 → vacana 3. The noun cell and the numeral cell use the same vibhakti.
- **Gender**: for 1–4 the numeral paradigm of the noun's gender is used; 5–10 use the single genderless paradigm.
- **Homographs**: द्वे is both feminine and neuter; अष्ट / अष्टौ are vikalpa. Options are de-duplicated by string, and an option is correct iff the string is in the accepted `Forms` of the right cell. A distractor must not be in that set (so अष्टौ is never a distractor for 8).
- **Distractors** are real numeral forms: the same number in another gender (when the string differs), the neighbouring number in the right gender, and the same gender in another vacana-number (द्वे for three).
- The phrase order "number, then noun" is fixed for display; no order is checked.
- कति as a question word is not rendered into the prompt in v1 (it would need the noun in the plural even for one object); the prompt is the emoji row and the blank phrase.
- Display through `<SaText>`; digits through `toDevaDigits`.

## Content
- Countable nouns: an allow-list of paradigm **ids** (not strings) in `content.ts`, each asserted to exist with `kind === 'noun'`: `balaka-m`, `vriksha-m`, `nara-m`, `phala-n`, `pustaka-n`, `pushpa-n`, `balika-f`, `lata-f`, `mala-f`, `nadi-f`, `nari-f`, `dhenu-f`, `guru-m`, `shishu-m`.
- Emoji: from the vocab entry whose `sa` equals the paradigm `citation`; if none, the prompt shows only the Devanagari digit and the English gloss ("3 × tree"). A test reports how many allow-listed nouns have emoji and requires ≥ 2 per gender.
- Levels — L2: prathamā only, numbers 1–10. L3: vibhakti 2–7 as well (`त्रिभिः बालकैः`), instruction shows the case name.
- Minimum pool: 14 nouns × 10 numbers × 2 question types = 280 at L2 (asserted ≥ 200).

## Modes, levels, scoring
- QuizRunner defaults (3 hearts, 10 points + streak, retry wrong once); stars from first-pass accuracy.
- Mastery: `sankhya` · `agree:<n>:<gender>` for number questions (gender `x` for 5–10); `vibhakti` · `vacana:<paradigmId>:<vacana>` for noun questions.

## UX notes
Pure `<QuizRunner>`. The emoji row is plain text in `prompt.text` (emoji repeated *n* times, wrapped after five); the phrase with the blank is `prompt.sa`. Hotkeys 1–4.

## Acceptance tests
- `logic.test.ts`: `testMatrix([2, 3], 25)` → 10 valid questions (`assertValidQuestions`); L2 uses vibhakti 1 only.
- `logic.test.ts`: for every question exactly one option string is in the accepted set; numeral and noun in the keyed phrase share vibhakti and vacana; gender matches for 1–4.
- `logic.test.ts`: named cases from the pack — 3 × `balaka-m` → त्रयः with बालकाः; 3 × `balika-f` → तिस्रः; 3 × `phala-n` → त्रीणि with फलानि; 2 × `phala-n` → द्वे with फले; 2 × `balaka-m` → द्वौ; for 8 the keyed option is अष्ट and अष्टौ never appears as a distractor.
- `logic.test.ts`: when the noun is feminine or neuter and the count is 2, no option list contains द्वे twice and द्वौ is the only gender distractor.
- `logic.test.ts`: every allow-listed id resolves; emoji coverage report; pool-size assertion; perfect bot 10/10; failing bot `lost`.
- `e2e.spec.ts`: perfect run at 390 px; wrong-gender answer shows the rule line; IAST run; emoji rows do not overflow at 360 px for n = 10; no console errors.

## Out of scope / later
Numbers above ten with nouns (विंशतिः बालकाः — the number noun is singular; a separate lesson); ordinals (see `panchanga`); typing answers.

## Open questions
- Sanskrit reviewer: confirm that the pack's `eka-*` paradigms are used only in the singular here, and that showing "एकम् फलम्" (word-separated, final म् kept) follows the house convention.
- Product: should L1 get a simplified version (numbers 5–10 only, no gender), since कति is taught in the first camp?
