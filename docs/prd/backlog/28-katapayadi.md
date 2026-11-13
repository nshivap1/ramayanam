# कटपयादिः · Kaṭapayādiḥ — The number code

| | |
|---|---|
| **Id** | `katapayadi` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | puzzle — after *cryptogram / cipher puzzles* |
| **Skills / levels** | sankhya, akshara · L3–L5 |
| **Modes** | daily · practice |
| **Session** | ~3 min, 10 questions (daily: 5) |
| **Build size** | S |

## Learning objective
Read numbers in the Kaṭapayādi system, the traditional cipher that hides numbers in meaningful words (the epic's old name जय encodes 18; the rāga name धीरशङ्कराभरणम् carries its number, 29). After 20 sessions the learner decodes any word mentally — and has a sharp sense of how an akṣara is built, since only one consonant of a conjunct "counts".

## Why people come back
A secret code, a daily "word for today's number", famous examples unlocked as trophies.

## Core loop
`logic.ts` builds questions; `<QuizRunner>` runs them.
1. **Key** (choice): which digit is भ? / which letters are 3? (learns the four rows).
2. **Decode** (choice): a word → its number, among four to six numbers that include the unreversed reading and one-digit-off decoys.
3. **Encode** (choice): a number → which of four words encodes it.
4. **Which consonant counts?** (choice): in the akṣara ङ्क, which consonant gives the digit?
Feedback shows the word akṣara by akṣara with its digits, then the reversed reading.

## Sanskrit rules
The decoder is a pure function `katapayadi(deva) → { digits, value }` with exactly these rules (the formulation cited from Śaṅkaravarman's *Sadratnamālā*: *nañāv acaś ca śūnyāni saṅkhyāḥ kaṭapayādayaḥ / miśre tūpāntyahal saṅkhyā na ca cintyo halasvaraḥ*):
- Consonant values: क ख ग घ ङ च छ ज झ ञ = 1 2 3 4 5 6 7 8 9 0 · ट ठ ड ढ ण त थ द ध न = 1 … 9 0 · प फ ब भ म = 1 … 5 · य र ल व श ष स ह = 1 … 8.
- One digit per vowel-bearing akṣara (`splitAksharas` + `aksharaParts`):
  - onset has consonants → the value of the **last** onset consonant (the one the vowel attaches to);
  - no onset (an independent vowel) → 0;
  - final halanta consonants, anusvāra and visarga are ignored.
- The number is read **right to left** (अङ्कानां वामतो गतिः): digits in akṣara order are reversed; leading zeros of the reversed string are dropped for the integer `value`.
- The value table is built from `VARNAS` order (five rows of the varṇamālā), not typed letter by letter; the consonants of each akṣara come from `aksharaParts`, never from code points.
- Words containing a letter outside the table (ळ) are ineligible.
- The game **never invents a word for a number**. *Encode* options are vocab-pack words; the key is the one whose computed value equals the prompt; a test guarantees the other three differ.
- Numbers display with `toDevaDigits` (Latin digits in IAST mode).
- Trophy examples (displayed after the first perfect session at each level; game-local strings, each checked by `validateDeva` and by the decoder in tests): जय → 18 · धीरशङ्कराभरणम् → first two akṣaras 9, 2 → 29 · हरिकाम्भोजी → 28 · खरहरप्रिया → 22 · मेचकल्याणी → 65 (melakarta names use only their first two akṣaras) · आयुरारोग्यसौख्यम् → 1712210 (the day-count that closes the Nārāyaṇīyam). Source: standard accounts of the system; reviewer to confirm.

## Content
- `@content/vocab` words of 2–4 akṣaras with `level ≤ 2` (the learner should know the words; the code is the new part), excluding ineligible letters — several hundred words, values 0–9999.
- *Encode* distractors are words with different values, preferably sharing one digit with the key.
- Daily: five *Decode* / *Encode* questions from `ctx.seed`; the first is always "today's number": the day of the month from `ctx.dateKey` (1–31) with four words of which exactly one encodes it. Days with no matching vocab word fall back to a seeded number that has one.
- Minimum pool: ≥ 300 eligible words; ≥ 25 of the 31 day-numbers covered (asserted; report the rest).

## Modes, levels, scoring
- L3: types 1, 2, 4, two-akṣara words. L4: + three-akṣara words, *Encode*, six options. L5: four-akṣara and conjunct-heavy words.
- Practice: QuizRunner defaults (3 hearts). Daily: `lives: 0`, `retryWrong: false`.
- Mastery: `sankhya` · `katapayadi:key:<consonant>` (type 1, 4) and `sankhya` · `katapayadi:word:<vocabId>` (types 2, 3).
- Share card (daily): five squares 🟩 / 🟥 and the day's number in Devanagari digits. Trophies seen are kept in `ctx.store`.

## UX notes
Pure `<QuizRunner>`, choice questions only (`AksharaKeyboard` has no digit keys, so numbers are never typed in v1). A reference card with the four rows is rendered on the start card.

## Acceptance tests
- `logic.test.ts`: table — 33 consonants mapped; क = 1, ञ = 0, न = 0, म = 5, ह = 8.
- `logic.test.ts`: golden vectors — जय → 18; रामः → digits [2, 5] → 52; दानम् → [8, 0] → 8; the six trophy examples above (melakarta names tested on their first two akṣaras; आयुरारोग्यसौख्यम् → 1712210).
- `logic.test.ts`: conjuncts — ङ्क counts क; ग्य counts य; a word-final म् adds no digit; an initial independent vowel gives 0.
- `logic.test.ts`: `testMatrix([3, 4, 5], 25)` → valid questions; every option value distinct; the keyed option's value equals the prompt; unreversed-reading decoy differs from the key (palindromic digit strings are not used with that decoy).
- `logic.test.ts`: daily — day-of-month question has exactly one correct word, or the documented fallback; coverage report.
- `logic.test.ts`: perfect bot 10/10; failing bot `lost` (practice) / `completed` 0/5 (daily).
- `e2e.spec.ts`: perfect practice run at 390 px; daily run with one miss → share card; wrong answer shows the per-akṣara digits; IAST run; no console errors; no overflow.

## Out of scope / later
A substitution-cipher cryptogram on a subhāṣita (the other half of the catalogue idea *Gūḍha-lekhaḥ*); Āryabhaṭa's numeration; bhūta-saṅkhyā; typing digits.

## Open questions
- Platform: should `katapayadi()` live in `@sanskrit` (reviewed once, reusable) rather than in this game?
- Sanskrit reviewer: confirm the rule statement, the treatment of anusvāra / visarga, and the trophy list.
