# पञ्चाङ्गम् · Pañcāṅgam — Days, months and seasons

| | |
|---|---|
| **Id** | `panchanga` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | quiz — after *calendar and sequence quizzes* |
| **Skills / levels** | sankhya · L1–L3 |
| **Modes** | practice · daily |
| **Session** | ~3 min, 10 questions |
| **Build size** | S (QuizRunner only) — after the content sign-off below |

## Learning objective
Talk about dates the Sanskrit way: the seven vāras (L1), the twelve māsas, six ṛtus, two pakṣas and the tithi names (L2), and ordinals that agree in gender — प्रथमः मासः, प्रथमा तिथिः (L3). After 20 sessions the learner can say what day it is, what comes next, and which season a month belongs to.

## Why people come back
A daily "what day is it today?" opener, cyclic-sequence puzzles, and content that classes actually use every morning.

## Core loop
`logic.ts` builds 10 questions; `<QuizRunner>` runs them.
1. **Next / previous** (choice): "After सोमवासरः comes …" — sequences are cyclic.
2. **Position** (choice): "चैत्रः is which month?" → an ordinal; or digit ↔ tithi name.
3. **Belongs to** (choice / pairs): month → season; season → its two months.
4. **Order** (arrange): put four consecutive items in order, starting from a stated first item.
5. **Today** (first question of every session): the weekday of `ctx.dateKey`.
6. **Day arithmetic** (L3, choice): "three days after गुरुवासरः".
Daily mode: one attempt, no retry, share card.

## Sanskrit rules
- **Closed lists** live in `content.ts`, itemised here; every string must pass `validateDeva`; the lists need a human reviewer's sign-off before the game ships (prerequisite):
  - Vāra (from Sunday): रविवासरः · सोमवासरः · मङ्गलवासरः · बुधवासरः · गुरुवासरः · शुक्रवासरः · शनिवासरः.
  - Māsa: चैत्रः · वैशाखः · ज्येष्ठः · आषाढः · श्रावणः · भाद्रपदः · आश्विनः · कार्त्तिकः · मार्गशीर्षः · पौषः · माघः · फाल्गुनः.
  - Ṛtu, two months each from चैत्रः: वसन्तः · ग्रीष्मः · वर्षाः · शरत् · हेमन्तः · शिशिरः.
  - Pakṣa: शुक्लपक्षः · कृष्णपक्षः.
  - Tithi 1–14: प्रतिपदा, then द्वितीया … चतुर्दशी; 15th: पूर्णिमा (śukla) / अमावास्या (kṛṣṇa).
  - Day adverbs: ह्यः · अद्य · श्वः · परश्वः.
  Source: standard pañcāṅga terminology as printed in Samskrita Bharati's Abhyāsa-pustakam and Apte's dictionary.
- **Pack cross-check:** the vocab pack already has all seven weekdays, eleven months and five seasons (categories `days`, `months`). Every list item that exists in the pack must be string-equal to the pack's `sa` (asserted). Known gaps today: ज्येष्ठः as a month, the pakṣa and tithi names, and the rainy season, for which the pack has the synonym प्रावृट् rather than वर्षाः.
- **Engine cross-check:** tithi names 2–14 must equal `ordinal(n, 'f')` from `@sanskrit` (द्वितीया … चतुर्दशी) — asserted in tests, so those thirteen strings are engine-verified.
- **Ordinals** for "which month / tithi / day" come from `ordinal(n, g)` with the gender of the counted noun fixed in a three-entry map: month `m`, tithi `f`, day (दिनम्) `n`; n ≤ 12 for months, ≤ 15 for tithis (the engine supports 1–20).
- **Cyclic sequences:** after शनिवासरः comes रविवासरः; after फाल्गुनः, चैत्रः; after शिशिरः, वसन्तः. Order questions always state the first item, so exactly one order is accepted.
- **No astronomy.** The game never states today's real tithi, pakṣa, month or season. The only fact taken from the real date is the weekday, computed from `ctx.dateKey` (passed into `logic.ts` as a string) by pure calendar arithmetic.
- Month ↔ season uses the two-months-per-ṛtu scheme beginning with वसन्तः = चैत्रः + वैशाखः; the feedback text notes that regional reckonings differ.
- Synonyms (भानुवासरः, इन्दुवासरः, आश्वयुजः, कार्तिकः …) are not accepted or shown in v1.

## Content
- Game-local lists above (46 items) + `ordinal`, `toDevaDigits` from `@sanskrit`. No pack required for v1; recommended later home: a shared `kala` pack also usable by `kah-samayah`.
- Levels — L1: vāra, day adverbs, "today". L2: + māsa, ṛtu, pakṣa, tithi, digits. L3: + gendered ordinals, day arithmetic, mixed pairs.
- Distinct questions: ≈ 40 at L1, ≈ 160 at L2, > 300 at L3 (asserted ≥ 30 / 120 / 200).

## Modes, levels, scoring
- Practice: QuizRunner defaults, 3 hearts. Daily: `lives: 0`, `retryWrong: false`, 10 questions.
- Stars from first-pass accuracy.
- Mastery: `sankhya` · `vara:<1-7>` · `masa:<1-12>` · `rtu:<1-6>` · `tithi:<1-15>` · `ordinal:<n>:<g>`.
- Share card (daily): ten squares 🟩 / 🟥 in question order; summary `9 / 10`.

## UX notes
Pure `<QuizRunner>`. "Today" shows the Gregorian date in plain text as the prompt. Arrange questions use four tokens. No custom CSS.

## Acceptance tests
- `logic.test.ts`: lists — lengths 7 / 12 / 6 / 2 / 16 / 4; all strings valid and unique; tithi 2–14 equal `ordinal(n, 'f')`.
- `logic.test.ts`: weekday — 2026-11-10 is a Tuesday → मङ्गलवासरः; 2026-01-01 → गुरुवासरः; leap-day 2028-02-29 → मङ्गलवासरः.
- `logic.test.ts`: cyclic next / previous for the last and first item of every list; month → season mapping for all 12 months (चैत्रः → वसन्तः, श्रावणः → वर्षाः, माघः → शिशिरः).
- `logic.test.ts`: ordinal gender — month 1 → प्रथमः, tithi 4 → चतुर्थी, day 6 → षष्ठम् (all from `ordinal`).
- `logic.test.ts`: `testMatrix([1, 2, 3], 25)` → 10 valid questions, first is "today"; exactly one correct option; arrange has a single accepted order; day arithmetic wraps modulo 7.
- `logic.test.ts`: perfect bot 10/10; failing bot `lost` in practice and `completed` 0/10 in daily; daily identical for the same dateKey.
- `e2e.spec.ts`: perfect practice run at 390 px; daily run produces a ten-square share card; IAST run; no console errors; no overflow.

## Out of scope / later
Real pañcāṅga computation (tithi, nakṣatra, yoga, karaṇa); saṃvatsara names; Gregorian dates read out in Sanskrit; nakṣatra lists.

## Open questions
- Sanskrit reviewer (blocking): sign off the lists — in particular प्रतिपदा vs प्रतिपत्, वर्षाः vs प्रावृट्, and whether synonyms should be accepted. Preferably the missing items are added to the vocab pack so the game-local list disappears.
- Reviewer: which season scheme does the target syllabus teach?
