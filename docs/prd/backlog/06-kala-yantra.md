# कालयन्त्रम् · Kāla-yantram — The tense machine

| | |
|---|---|
| **Id** | `kala-yantra` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | quiz — after *sentence-transformation drills* |
| **Skills / levels** | kriyapada, vakya · L1–L3 |
| **Modes** | practice |
| **Session** | ~3 min, 10 sentences, 3 hearts |
| **Build size** | S (QuizRunner only) |

## Learning objective
Move a whole sentence through time. Given a present-tense sentence and a target lakāra, the learner supplies the verb in laṅ, lṛṭ, loṭ or vidhiliṅ while keeping puruṣa, vacana and pada. After 20 sessions the four Praveśa lakāras are felt as one family of the same verb, which is what Samskrita Bharati's "kāla-parivartanam" exercises train.

## Why people come back
A dial that "sends" the sentence to yesterday or tomorrow, a streak, and levels that add one lakāra at a time.

## Core loop
1. **Send it** — a present-tense pack sentence is shown with its English meaning and a target chip such as `लृट् · future`; supply the verb in the target lakāra.
2. **Time word decides** (L2+) — a pack sentence that begins with ह्यः or श्वः is shown with its verb blanked and the verb's laṭ form in brackets; supply the form the time word requires.
   L1–L2 answer by choice among four forms; at L3 half the answers are typed on the akṣara keyboard.
3. Check → feedback shows the transformed sentence in full, the cell labels (`प्रथमपुरुषः · बहुवचनम्`) and the new meaning hint ("future").
4. Wrong items return once; session ends `completed` or `lost` (0 hearts).

## Sanskrit rules
- Only the verb token changes. The pack tags a finite verb with `lemma` (the dhātu, e.g. पठ्) and `tag` (`lat.1.3` = lakāra.puruṣa.vacana). The game resolves it to a `DhatuEntry` and pada by **form match**: the unique (entry, pada) with `entry.dhatu === lemma` whose `conj(entry, lakara, pada, p, v)` contains the word. No unique match → the sentence is skipped. The answer is `conj(entry, targetLakara, pada, p, v)` — a `Forms` list, all accepted; an empty cell means no item.
- Subject agreement therefore stays intact by construction, including भवान् / भवती subjects with a prathama-puruṣa verb.
- **Distractors**: same root — (a) target lakāra with another puruṣa or vacana, (b) same cell in another lakāra, (c) the original laṭ form. None may be string-equal to any accepted answer (cross-cell homographs are filtered by string).
- **Spelling around the new verb.** The pack stores words in padaccheda form — no sandhi between words, final म् kept as म् — so the verb word can be replaced without touching its neighbours (पुस्तकम् पठति → पुस्तकम् अपठत्). Display strings are produced by the pack's `sentenceText(s)` applied to a copy of the sentence with the verb word replaced — never by editing rendered text; the game applies no sandhi and never converts म् to anusvāra itself.
- Prefixed verbs (`lemma` containing `+`, e.g. आ+गम्) cannot be transformed — the pack has only their laṭ 3sg — so such sentences are skipped.
- *Send it* uses only sentences without a time word (अद्य, ह्यः, श्वः), and inserts none; the cue is the lakāra name from `LAKARA_NAMES`. *Time word decides* uses pack sentences of pattern `hyah-lan` / `shvah-lrt` unchanged: the key is the pack's own verb; distractors are the same cell in other lakāras.
- Never generate a verb form by rule (augment, guṇa, iṭ): all forms are pack cells.

## Content
- `@content/sentences` (`sentencesForLevel`, `sentenceText`; 671 sentences): `level ≤ ctx.level`, exactly one finite verb (`role: 'kriya'`, tag starting with a lakāra), which is the last word.
- `@content/dhatu`: `conj`, `dhatu(id)`.
- Levels — L1: targets lṛṭ and loṭ, prathama-puruṣa only. L2: + laṅ, all puruṣas, both padas, *Time word decides*. L3: + vidhiliṅ and typed answers.
- Minimum pool: ≥ 40 eligible sentences at L1 and ≥ 80 at L2–L3 (asserted, with a count of sentences skipped by the form match).

## Modes, levels, scoring
- QuizRunner defaults: 3 hearts, 10 points + streak, retry wrong once. Stars from first-pass accuracy.
- Mastery: `kriyapada` · `<dhatuId>:<lakara>:<pada>:<purusha>.<vacana>` (e.g. `path-1p:lrt:P:1.3`).
- `summary`: `8 / 10 sentences moved in time`.

## UX notes
Pure `<QuizRunner>`: `prompt.sa` is the sentence, `context` the target chip, `explain.sa` the transformed sentence. The instruction names the verb ("Change पठति to future").

## Acceptance tests
- `logic.test.ts`: `testMatrix([1, 2, 3], 25)` → 10 valid questions; target lakāras restricted per level.
- `logic.test.ts`: for every question the keyed answer set equals `conj(...)` for the tagged cell; no distractor is in it; all distractors are forms of the same root.
- `logic.test.ts`: named cases from the pack — `path-1p` prathama-ekavacana to lṛṭ gives पठिष्यति; to laṅ gives अपठत्; a bahuvacana subject keeps bahuvacana (पठन्ति → पठिष्यन्ति).
- `logic.test.ts`: rendering — for a sentence whose pre-verbal word ends in म्, the laṅ display string keeps म् before the vowel-initial verb; no display string contains an anusvāra the pack did not have.
- `logic.test.ts`: form match — every eligible verb resolves to exactly one (entry, pada); no prefixed-verb sentence is used; *Time word decides* keys equal the pack verb; pool-size assertions.
- `logic.test.ts`: perfect bot 10/10 `completed`; always-wrong bot `lost`; type questions accept every vikalpa member (e.g. a loṭ cell with a तात् alternate).
- `e2e.spec.ts`: perfect run at 390 px to the result screen; wrong answer shows the full transformed sentence; one typed answer at L3; IAST run; no console errors; no overflow.

## Out of scope / later
The Śibira past with ktavatu (गतवान् / गतवती — needs subject gender); karmaṇi transformation; adding ह्यः / श्वः into the sentence; liṭ and luṅ recognition.

## Open questions
- Platform: a `dhatuId` + pada on verb tokens would remove the form-match step (nice to have, not blocking).
- Sanskrit reviewer: is loṭ prathama-puruṣa (गच्छतु) the right first imperative for L1, as in spoken-Sanskrit camps?
