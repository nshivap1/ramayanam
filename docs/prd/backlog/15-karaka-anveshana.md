# कारकान्वेषणम् · Kārakānveṣaṇam — Case detective

| | |
|---|---|
| **Id** | `karaka-anveshana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | quiz — after *"which case and why" parsing drills* |
| **Skills / levels** | vibhakti, vakya · L2–L4 |
| **Modes** | practice |
| **Session** | ~4 min, 6 sentences × 2 questions, 3 hearts |
| **Build size** | S (QuizRunner only) |

## Learning objective
Know not just *which* vibhakti a word is in but *why*. For a marked word in a real sentence the learner names the case, then the reason: a kāraka (कर्ता, कर्म, करणम्, सम्प्रदानम्, अपादानम्, अधिकरणम्), the ṣaṣṭhī relation, or — at Śikṣā level — an upapada-vibhakti triggered by a particular word (सह + tṛtīyā, नमः + caturthī). After 20 sessions the learner reads a sentence as roles: the foundation of anvaya.

## Why people come back
Each sentence is a small "case" closed by two deductions; levels add subtler reasons.

## Core loop
For each of six sentences, two linked QuizRunner questions:
1. **Which case?** The sentence is shown with one word marked; choose its vibhakti (seven options, names from `VIBHAKTI_NAMES`).
2. **Why?** The same sentence, the case now revealed; choose the reason among four.
Feedback for (2) gives one line such as "करणम् — the instrument of the action → तृतीया" and the translation. Wrong items return once. `completed` after 12 answers, `lost` at 0 hearts.

## Sanskrit rules
- **Only tagged tokens are asked.** The sentence pack gives each word a `role` (`karta`, `karma`, `karana`, `sampradana`, `apadana`, `sambandha`, `adhikarana`, `sambodhana`, `visheshana`) and a `tag` `<vibhakti>.<vacana>.<gender>`; the game never infers a role.
- **Context resolves homographs.** फलम् may be prathamā or dvitīyā as a form, but in the sentence it has exactly one tagged vibhakti — that is the single key for question 1. This is the "supply context" branch of the homograph rule, so alternates are *not* accepted here; the feedback says why ("as a form it could also be prathamā").
- **Reason options** are fixed technical labels in `content.ts` (source: Kāraka chapter terms as printed in Samskrita Bharati's *Kārakam* and the Paricaya textbook; all pass `validateDeva`): कर्ता · कर्म · करणम् · सम्प्रदानम् · अपादानम् · अधिकरणम् · सम्बन्धः · सम्बोधनम् · विशेषणम् (agrees with its noun) · उपपदविभक्तिः (shown with the trigger word).
- Role → default case is checked, not assumed: a test asserts every asked token satisfies kartā→1, karma→2, karaṇa→3, sampradāna→4, apādāna→5, sambandha→6, adhikaraṇa→7 in kartari sentences; tokens that break the pattern are excluded (the pack has no karmaṇi sentences yet).
- **Upapada-vibhakti (L4).** In the pack's `saha`, `vina`, `prati` and `namah` patterns the noun governed by the particle carries a simplified kāraka role (जनकेन in जनकेन सह is tagged `karana`). The game **overrides** that: in those patterns the nominal immediately before the particle is keyed उपपदविभक्तिः with the particle as trigger, and such sentences are excluded below L4. A game-local table validates trigger → case and nothing else: सह → 3 · विना → 2, 3, 5 · प्रति → 2 · नमः → 4.
- Distractor reasons are other labels from the list that are false for this token; विशेषणम् is offered only at L3+.
- The sentence is the pack's words joined by spaces; the marked word is identified by index (the instruction repeats it), never by string search.

## Content
- `@content/sentences`: `level ≤ ctx.level`; askable tokens = nominal tokens with `vibhakti` 1–8 and a `role` in the list above.
- Levels — L2: the six kārakas + sambandha + sambodhana. L3: + viśeṣaṇa tokens. L4: + upapada-vibhakti.
- Minimum pool: ≥ 80 askable (sentence, word) pairs per level, every vibhakti 2–7 represented ≥ 8 times (asserted, with a coverage table).
- The pack has dedicated patterns for each kāraka (`karana` 24, `sampradana` 22, `apadana` 26, `sambandha` 22, `adhikarana` 34 sentences) and 39 upapada sentences — thin for L4; if the L4 pool assertion fails, ship L2–L3 only.

## Modes, levels, scoring
- QuizRunner defaults (3 hearts, 10 points + streak, retry wrong once); stars from first-pass accuracy over the 12 answers.
- `summary`: `5 of 6 cases closed` (a case is closed when both answers were right first time).
- Mastery: question 1 → `vibhakti` · `sentence:<sentenceId>:<tokenIndex>`; question 2 → `vibhakti` · `karaka:<role>` (or `upapada:<trigger>`).

## UX notes
Pure `<QuizRunner>`; the two questions of a case are adjacent in the queue with ids `…:case` and `…:why`. The instruction carries the marked word ("Which case is फलम् here?"). Seven options must fit at 360 px (checked in e2e).

## Acceptance tests
- `logic.test.ts`: `testMatrix([2, 3, 4], 25)` → 12 valid questions in six adjacent pairs.
- `logic.test.ts`: question 1 key equals the pack tag; the marked form really occurs in that cell of its paradigm when the token links to a shabda paradigm.
- `logic.test.ts`: role ↔ case consistency for every askable token; in every `saha` / `vina` / `prati` / `namah` sentence the governed noun is keyed as upapada with a case the table allows, and no such sentence appears below L4.
- `logic.test.ts`: question 2 has exactly one true reason; labels are distinct; fixed labels pass `validateDeva`.
- `logic.test.ts`: coverage table and pool assertions; perfect bot → 12/12, "6 of 6 cases closed"; bot wrong on every "why" → `lost`.
- `e2e.spec.ts`: perfect run at 390 px; a wrong case answer still leads to the "why" question with the right case shown; IAST run; seven options without overflow at 360 px; no console errors.

## Out of scope / later
Verb-governed cases (रुच् + caturthī) until the pack tags them; karmaṇi; sati-saptamī; a reverse mode (tap the word with a given role).

## Open questions
- Platform / pack: add an explicit upapada role (with trigger) to the sentence pack instead of the game-side override; add karmaṇi sentences.
- Sanskrit reviewer: sign off the label list and the upapada table; should सम्बन्धः be presented as "not a kāraka" explicitly?
