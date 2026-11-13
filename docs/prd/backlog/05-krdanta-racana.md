# कृदन्तरचना · Kṛdanta-racanā — Root + suffix builder

| | |
|---|---|
| **Id** | `krdanta-racana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | lesson — after *Duolingo lessons / conjugation trainers* |
| **Skills / levels** | krdanta, kriyapada · L1–L4 |
| **Modes** | practice · timed |
| **Session** | ~3 min, 10 questions, 3 hearts (timed: 90 s) |
| **Build size** | S (QuizRunner only) |

## Learning objective
Produce and recognise the everyday kṛdantas of common roots: ktvā and tumun at Śibira level (गत्वा, गन्तुम्), kta and ktavatu at Praveśa (गतः, गतवान्), tavya / anīyar and lyap at Paricaya, śatṛ / śānac at Śikṣā. After 20 sessions the learner no longer says "gam-tvā": the irregular stems are memorised as whole words.

## Why people come back
A visible ladder of suffixes that unlock one by one, a 90-second "tvarita" mode with a personal best, and the satisfaction of irregular forms finally sticking.

## Core loop
1. `logic.ts` builds 10 questions for `ctx.level`; `<QuizRunner>` runs them.
2. **Build** (choice): prompt `गम् + क्त्वा`, with the root's English gloss; four real forms as options.
3. **Name the suffix** (choice): a form is shown with its root (`गन्तुम् ← गम्`); choose the pratyaya label.
4. **Pairs**: four roots ↔ their forms for one suffix.
5. **Type it** (type, L3+ only, 2 per lesson): same prompt as *Build*, answered on the akṣara keyboard with `keys` limited to the akṣaras of the answer plus six decoy akṣaras.
6. Feedback shows root, suffix, form and gloss ("having gone"); wrong items return once at the end.

## Sanskrit rules
- Every form is read from `@content/dhatu`: `DhatuEntry.krdanta.{ktva, tumun, kta, ktavatu, shatr, shanac, tavya, aniyar}` (each a `Forms` list) and `DhatuEntry.lyap[]` (`{ upasarga, form }`). Nothing is derived by gluing a suffix to a root — the whole point is that गम् + क्त्वा is गत्वा.
- **Vikalpa**: every member of a `Forms` list is accepted in *Type it*; options show `Forms[0]`; no alternate may be used as a distractor.
- **Distractors are real forms that are wrong here**: (a) the same root with other suffixes, (b) other roots with the same suffix. A non-word such as "आगत्वा" must never be displayed.
- **ktvā vs lyap**: unprefixed roots are asked only for ktvā; lyap is asked only as `upasarga + root + ल्यप्` using a pack `lyap` entry (आ + गम् → आगम्य / आगत्य when both are in the pack as separate entries — accept every pack form with that upasarga).
- Declinable kṛdantas are stored as masculine nominative singular (गतः, गतवान्, गच्छन्, गन्तव्यः). The instruction line says "पुंलिङ्गे प्रथमा-एकवचनम्"; feminine and neuter forms are never asked or shown.
- A root lacking a field (no `shanac` for a parasmaipadī root) simply yields no question for it.
- *Name the suffix* is asked only when the form string is unique among that root's kṛdanta fields.
- Suffix labels are fixed technical names kept in `content.ts`: क्त्वा, तुमुन्, क्त, क्तवतु, तव्यत्, अनीयर्, ल्यप्, शतृ, शानच् (source: Aṣṭādhyāyī pratyaya names as printed in Samskrita Bharati's Praveśa and Paricaya books); tests run `validateDeva` on each.
- English glosses are templated from the root's `en` ("to go" → "having gone" is **not** attempted): the feedback shows the root gloss plus a fixed suffix gloss ("after doing · to go"), never a generated English participle.

## Content
- `dhatusForLevel(level)` from `@content/dhatu` (199 roots; ~55 items at L1 including prefixed verbs).
- Suffixes per level — L1: ktva, tumun. L2: + kta, ktavatu. L3: + tavya, aniyar, lyap. L4: + shatr, shanac.
- Minimum pool: ≥ 40 (root, suffix) items per level, asserted. Expected: L1 ≈ 30 roots × 2; L4 ≈ 190 roots × 8.

## Modes, levels, scoring
- Practice: QuizRunner defaults (3 hearts, 10 points, retry wrong).
- Timed: a 90 s countdown wraps an endless queue of *Build* questions; hearts off; score = correct × 10; `best: { label: 'Forms in 90 s', value }`. Implemented by generating 60 questions and finishing when the timer expires.
- Mastery: `krdanta` · `<dhatuId>:<field>` (e.g. `gam-1p:ktva`); lyap · `<dhatuId>:lyap:<upasarga>`.

## UX notes
Pure `<QuizRunner>`; the timed mode adds only `useCountdown` and `ctx.hud({ timeLeftMs })`. The prompt renders root and suffix as two `<SaText>` tokens joined by "+".

## Acceptance tests
- `logic.test.ts`: `testMatrix([1, 2, 3, 4], 25)` → 10 valid questions; only suffixes allowed at that level appear.
- `logic.test.ts`: for every choice question the correct option is in the pack `Forms` for (root, suffix) and no other option is; all options are pack forms (membership test against the set of all kṛdanta and lyap forms).
- `logic.test.ts`: named cases read from the pack — `gam-1p` ktva is गत्वा, tumun is गन्तुम्; `bhu-1p` ktva is भूत्वा; a lyap question for `bhu-1p` with अनु accepts अनुभूय.
- `logic.test.ts`: type questions accept every vikalpa member; `keys` contain all akṣaras of every accepted answer.
- `logic.test.ts`: no *Name the suffix* question for a form shared by two fields of the same root; pool-size assertions; perfect bot 10/10; failing bot `lost`.
- `e2e.spec.ts`: perfect practice run at 390 px; wrong answer path; an L3 run that types one answer through the on-screen keyboard; timed run ends at the result screen; IAST run; no console errors; no overflow.

## Out of scope / later
Feminine / neuter and oblique-case participles (needs pack support); ṇijanta kṛdantas; sentence-level use ("गत्वा … करोति") — that belongs to `katha` and `kala-yantra`.

## Open questions
- Sanskrit reviewer: the label तव्यत् vs तव्य — which does the target syllabus print?
- Should ktavatu at L1 (गतवान्, the Śibira past tense) move down a level even though it needs gender agreement?
