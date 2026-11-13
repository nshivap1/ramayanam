# छन्दःपरिचयः · Chandaḥ-paricayaḥ — Name the metre

| | |
|---|---|
| **Id** | `chandah-paricaya` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | quiz — after *"name that tune" identification quizzes* |
| **Skills / levels** | chandas, subhashita · L4–L5 |
| **Modes** | practice · timed |
| **Session** | ~4 min, 10 questions, 3 hearts |
| **Build size** | S (QuizRunner only) |

## Learning objective
Go from syllable weights to a named metre: count the akṣaras of a pāda, mark laghu and guru, group them into gaṇas with the यमाताराजभानसलगम् key, and recognise इन्द्रवज्रा, वसन्ततिलका, मालिनी and the other common vṛttas. The first-wave Chando-layaḥ trains the ear for laghu / guru; this game is the Kovida-syllabus skill built on top of it.

## Why people come back
Real verses as puzzles, a collection of metres "recognised", and a 2-minute timed mode.

## Core loop
`logic.ts` builds 10 questions in rising difficulty; `<QuizRunner>` runs them.
1. **Count** (choice): how many akṣaras in this pāda? (four numbers)
2. **Weigh** (choice): which laghu–guru pattern fits this pāda? (four patterns drawn as । and ऽ)
3. **Gaṇa key** (choice): which gaṇa is ऽ । । ? → भ. And the reverse.
4. **Split** (choice): this pattern in gaṇas is … (त त ज ग ग).
5. **Name** (choice): which metre is this pāda in? (four metre names)
Feedback shows the pāda scanned akṣara by akṣara, its gaṇas and the metre's traditional definition line.

## Sanskrit rules
- Everything is computed by `@sanskrit`: `countAksharas`, `scanLine` / `weights`, `ganas`, `METERS` (20 sama-vṛttas with `pattern`, `ganaFormula`, `lakshana`), `matchMeter`, `checkAnustubh`.
- **Eligible pādas.** (a) Each `METERS[i].lakshana` line — the definition, itself composed in its metre; (b) pādas of pack verses whose `meter` is not `anustubh`. A pāda is used for *Split* and *Name* only if `matchMeter(weights(pada))` finds a metre — and, when `meter` is itself a `METERS` id, the same one (an `upajati` verse yields इन्द्रवज्रा and उपेन्द्रवज्रा pādas). Pādas that begin mid-word (the pack splits on akṣara boundaries) are excluded: both edges must fall on whitespace in the verse's `text`. Anuṣṭubh pādas are used for *Count* and *Weigh* only, and only if `checkAnustubh(pada, index).ok`.
- **Pāda-final syllable is free.** The correct option in *Weigh* is the natural scan from `weights()`. No distractor may equal the correct pattern or differ from it only in the last syllable (that reading is also legitimate).
- *Weigh* distractors flip one or two non-final positions, preferring positions where the true weight depends on a following conjunct, anusvāra or visarga — the rules learners get wrong.
- *Name* distractors are other `METERS` entries, preferring the same syllable count (इन्द्रवज्रा vs उपेन्द्रवज्रा, वंशस्थम् vs इन्द्रवंशा); because distinct metres have distinct patterns, exactly one option matches. Upajāti verses are fine: the question is about one pāda.
- Gaṇa letters are shown in Devanagari, derived from the engine's names (`ya ma ta ra ja bha na sa la ga` → य म त र ज भ न स ल ग via `iastToDeva`), never typed. The mnemonic यमाताराजभानसलगम् is one fixed string in `content.ts`, verified in tests: scanning it and reading windows of three gives every gaṇa's pattern (य = । ऽ ऽ … स = । । ऽ).
- The marks । (laghu) and ऽ (guru) are notation glyphs, not language content; they render in a plain span with an aria-label ("light" / "heavy").
- Verses are shown verbatim through `<SaText shloka>`; nothing is "fixed" to make it scan.

## Content
- Engine: 20 lakṣaṇa pādas (always available) and 8 + 2 gaṇa items.
- `@content/subhashita`: 30 non-anuṣṭubh verses (12 upajāti, 5 vasantatilakā, 3 śārdūlavikrīḍita, singles of eight more) and 105 anuṣṭubh verses for types 1–2.
- Levels — L4: types 1–3, plus *Name* restricted to four metres (indravajrā, upendravajrā, vasantatilakā, mālinī). L5: all types, all 20 metres.
- Minimum pool: ≥ 60 eligible non-anuṣṭubh pādas (20 guaranteed by the engine; the rest from the pack) and ≥ 100 anuṣṭubh pādas. The test prints the count per metre; a metre with fewer than 2 eligible pādas is asked only through its lakṣaṇa line.

## Modes, levels, scoring
- Practice: QuizRunner defaults (3 hearts, 10 points + streak). Timed: 120 s, no hearts, endless *Weigh* / *Name* questions; `best: { label: 'Metres named in 2 min', value }`.
- Mastery: `chandas` · `meter:<meterId>` (Name, Split) · `gana:<name>` (Gaṇa key) · `scan:<pādaId>` (Count, Weigh), where `pādaId` is `<verseId>:<1-4>` or `lakshana:<meterId>`.
- Collection of recognised metres in `ctx.store` (`{ v: 1, seen: string[] }`), shown on the start card.

## UX notes
Start card with the collection, then `<QuizRunner>`. Patterns are grouped in threes so gaṇas are visible; long metres (19–21 syllables) wrap between groups.

## Acceptance tests
- `logic.test.ts`: every `METERS[i].lakshana` satisfies `matchMeter(weights(l))?.id === METERS[i].id` (precondition; report any failure to platform rather than patching).
- `logic.test.ts`: mnemonic — windows of three over its scan yield the eight gaṇa patterns in the order य म त र ज भ न स.
- `logic.test.ts`: named case — वासांसि जीर्णानि यथा विहाय (if present in the pack) has 11 akṣaras and is keyed इन्द्रवज्रा although its last syllable is light.
- `logic.test.ts`: *Weigh* — no distractor equals the key or differs only in the final position; *Name* — exactly one option's pattern matches under `matchMeter`.
- `logic.test.ts`: `testMatrix([4, 5], 25)` → 10 valid questions; L4 names only the four listed metres; pool report and assertions.
- `logic.test.ts`: perfect bot 10/10; failing bot `lost`; timed simulation ends at 120 000 ms.
- `e2e.spec.ts`: perfect run at 390 px; wrong answer shows the scanned pāda; collection persists after reload; IAST run (pādas romanised, marks unchanged); no overflow for the longest metre; no console errors.

## Out of scope / later
Mātrā metres (āryā); ardha-sama and viṣama vṛttas; yati (caesura) questions; audio chanting.

## Open questions
- Sanskrit reviewer: which four metres should L4 start with?
- Should anuṣṭubh get its own *Name* option once vipulā handling is reviewed?
