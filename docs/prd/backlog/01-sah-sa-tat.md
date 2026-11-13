# सः सा तत् · Saḥ sā tat — He, she, it: pronoun agreement

| | |
|---|---|
| **Id** | `sah-sa-tat` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | lesson — after *Duolingo "complete the phrase"* |
| **Skills / levels** | vibhakti, shabdakosha · L1–L2 |
| **Modes** | practice |
| **Session** | ~3 min, 10 questions, 3 hearts |
| **Build size** | S (QuizRunner only) |

## Learning objective
The first grammar habit of a Śibira learner: a pronoun must agree with its noun. After 20 sessions the learner picks सः / सा / तत्, एषः / एषा / एतत्, कः / का / किम् by the noun's gender without thinking (L1), and at Praveśa level makes the pair agree in vibhakti and vacana too (तस्मै बालकाय, ते बालिके).

## Why people come back
Ten quick questions, a streak counter, emoji pictures, and a visible unlock from "this/that" (L1) to full case agreement (L2). It is the easiest grammar game in the catalogue, so it is the natural second session after the script games.

## Core loop
1. `logic.ts` builds 10 questions from the seed; `<QuizRunner>` runs them (Check → feedback → Continue; wrong items re-asked once).
2. **Pick the pronoun** (choice, 6 per lesson): prompt `___ बालकः` with the noun's emoji; three or four pronoun forms as options.
3. **Pick the noun** (choice, 2 per lesson): prompt `एषा ___`; options are nouns of different genders (L1) or different case/number forms (L2).
4. **Tap the pairs** (pairs, 2 per lesson, positions 5 and 10): four pronoun forms ↔ four noun forms.
5. Feedback shows the agreeing pair and the labels (`स्त्रीलिङ्गम् · प्रथमा · एकवचनम्` from `GENDER_NAMES`, `VIBHAKTI_NAMES`, `VACANA_NAMES`).
6. Session ends `completed` after the queue, or `lost` when hearts reach 0.

## Sanskrit rules
- **Agreement** means same liṅga, vibhakti and vacana. All forms come from `@content/shabda` cells via `form(p, v, n)`; nothing is suffixed by rule.
- **Homographic noun cells.** A noun form may fill several cells (फलम् = 1.1 and 2.1; बालकौ = 1.2, 2.2, 8.2; रामाभ्याम् = 3.2, 4.2, 5.2). Let `C(w)` be every cell of the noun's paradigm (vibhakti 1–7) whose `Forms` contain `w`. The **accepted pronoun set** is the union of the same-gender pronoun's forms over `C(w)`. A distractor is any pronoun form (any gender, any cell) **not** in that set. Example: for फलम् the accepted set is {तत्}; तम् and सः are legal distractors.
- **Vikalpa.** Pronoun cells with alternates (एतम् / एनम्) show `Forms[0]`; no alternate may appear as a distractor.
- **Identical options.** Options are de-duplicated by string (ते is m. 1.3 and f./n. 1.2 — it can appear once, and is correct iff it is in the accepted set).
- **Pairs questions** must be a bijection: the four noun forms are chosen so that the four accepted pronoun sets are pairwise disjoint.
- Vocative (row 8) is never used: pronouns have no vocative. भवान् / भवती are out of scope (they need verb agreement).
- Never generate a form; never show a pronoun + noun pair the pack cannot justify cell by cell.
- Engine functions: `splitAksharas` is not needed; display only through `<SaText>`.

## Content
- Pronouns: `shabda('tad-m'|'tad-f'|'tad-n')`, `etad-*`, `kim-*` (all level 1, present in the pack).
- Nouns L1: `shabdaForLevel(1)` with `kind === 'noun'` (बालक, फल, पुस्तक, लता, बालिका, नदी, राम …), nominative singular only; **plus** vocab entries with `pos === 'noun'` and `level ≤ 1` (`sa` is the nominative singular; `gender` is always set for nouns), so the game is not limited to the seven level-1 paradigm nouns.
- Nouns L2: `shabdaForLevel(2)` with `kind === 'noun'`, vibhakti 1–7, all three vacanas; cells with `[]` skipped.
- Emoji: the vocab entry's `emoji` (optional).
- Minimum pool: L1 ≥ 60 gendered nouns × 3 pronoun stems; L2 ≥ 40 noun paradigms × 21 cells. `logic.test.ts` asserts both.

## Modes, levels, scoring
- L1: nominative singular only, three options. L2: any cell, four options (same pronoun stem: one other gender, one other vibhakti, one other vacana).
- Score, hearts, retry: QuizRunner defaults (`lives: 3`, `points: 10`). Stars from first-pass accuracy (shell default).
- Mastery: `vibhakti` · `agree:<pronounId>:<v>.<n>` for pronoun questions; `shabdakosha` · `linga:<nounId>` for noun-gender questions (L1).

## UX notes
Pure `<QuizRunner>`; prompt shows the blank as `___` inside the Sanskrit string. Hotkeys 1–4. No custom CSS expected.

## Acceptance tests
- `logic.test.ts`: `testMatrix([1, 2], 25)` → 10 valid questions each (`assertValidQuestions`), deterministic per seed.
- `logic.test.ts`: for every choice question, exactly one option is in the accepted pronoun set; brute-force check against the paradigms.
- `logic.test.ts`: named cases — noun फलम् accepts तत् and rejects तम्; noun बालकौ accepts तौ; noun रामाभ्याम् (L2) accepts ताभ्याम् only; no question uses vibhakti 8.
- `logic.test.ts`: every pairs question is a bijection with pairwise-disjoint accepted sets.
- `logic.test.ts`: perfect bot → `completed`, 10/10; always-wrong bot → `lost` after 3 mistakes; pool-size assertions above.
- `e2e.spec.ts`: perfect run to the result screen at 390 px; one wrong answer shows corrective feedback and the item returns; IAST script run; no console errors; no horizontal overflow.

## Out of scope / later
इदम् / अदस् / यद् / सर्व sets (L3 lesson pack); adjective agreement (needs more adjective paradigms in three genders); भवान् + verb.

## Open questions
- Sanskrit reviewer: should L1 include the dual at all? (Śibira practice avoids it; this PRD keeps L1 singular-only.)
- Is every L1 vocab gender dictionary-checked? Common-gender and variable-gender words (e.g. मित्रम् n. "friend") must be confirmed before they are asked.
