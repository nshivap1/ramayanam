# नित्याभ्यासः · Nityābhyāsaḥ — The daily seven

| | |
|---|---|
| **Id** | `nityabhyasa` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | daily — after *daily mixed quizzes / Duolingo daily practice* |
| **Skills / levels** | vakya, shabdakosha, vibhakti, kriyapada, sandhi, sankhya, subhashita · L0–L5 |
| **Modes** | daily · practice |
| **Session** | ~3 min, 7 questions, one attempt each |
| **Build size** | M (S once shared question builders exist) |

## Learning objective
One short session a day that touches every skill at the learner's level, so nothing is left unpractised for long — the "if you only do one thing today" entry point, and where a learner notices a weak skill.

## Why people come back
Seven squares to turn green, the same for everyone at that level, a share card, and a result list naming a game to play for each miss.

## Core loop
1. `logic.ts` builds seven questions — one per **slot** in a fixed recipe for `ctx.level` — in rising difficulty.
2. `<QuizRunner>` runs them with `lives: 0`, `retryWrong: false`: every question is answered once, feedback is shown, the session always ends `completed`.
3. The result lists each item with a note naming a game that practises that skill.

## Sanskrit rules
- The game adds **no Sanskrit of its own**. Each slot is filled by a *builder*: a pure function `(rng, level) → Question` that reads one content pack and obeys that pack's rules.
- Standing invariants for every builder, tested slot by slot:
  - one keyed answer, or every valid alternative accepted (vikalpa `Forms`; for arrange slots **every permutation** — these use only pack sentences of ≤ 4 words whose roles are kartā, karma, kriyā or another kāraka, with no avyaya, viśeṣaṇa or second verb, so every order is grammatical);
  - no distractor is string-equal to an accepted answer; "which case?" is never asked about a form that fills two cases;
  - sandhi slots use only `SANDHI_EXAMPLES` (never `SANDHI_PENDING_ENGINE`) and accept an item's `alternatives`;
  - verses are shown verbatim.
- **Recipes** (slot → pack):
  - L0: akṣara → sound · sound → akṣara · conjunct breakdown (`aksharaParts`) · digit ↔ number word (`cardinal`) · picture → word · word → picture · akṣara pairs.
  - L1: picture → word · word gender (सः / सा / तत् agreement, as in `sah-sa-tat`) · subject + laṭ verb agreement (dhatu) · number word 1–20 · avyaya meaning (vocab) · arrange a pack sentence · word pairs.
  - L2: vibhakti form of a level-2 paradigm (unambiguous cell) · laṅ / lṛṭ form · ktvā / tumun (dhatu `krdanta`) · number 21–100 · vocab meaning · arrange a sentence · subhāṣita pāda order (choose the next pāda).
  - L3: svara-sandhi join (choose `result`) · sandhi split (choose `first + second`) · consonant-stem form · vidhiliṅ form · samāsa → vigraha · sentence · verse meaning.
  - L4–L5: vyañjana / visarga sandhi join · samāsa type · śatṛ / śānac or tavya form · metre name (`matchMeter`, as in `chandah-paricaya`) · missing pāda (as in `samasya-purana`) · rare-stem form · vocab.
- A slot that cannot be filled at a level falls back to the previous level's slot of the same skill; tests prove seven questions always result.

## Content
- Packs: `vocab`, `shabda` (`shabdaForLevel`, `form`), `dhatu` (`dhatusForLevel`, `conj`, `krdanta`), `sentences`, `sandhi` (`sandhiByFamily`), `samasa`, `subhashita`; engines `cardinal`, `aksharaParts`, `matchMeter`.
- **"Samples other games' content" means the shared packs**: a game may not import another game, so builders cannot be borrowed from `patha-mala`. Two routes:
  1. *(preferred, platform prerequisite)* a shared builder library exported from the platform (proposed: `@sdk` question builders extracted from `patha-mala`), used by both games;
  2. *(fallback)* implement the ~10 builders locally in `builders.ts` — this is what makes the build M.
- Minimum variety: ≥ 30 distinct questions per slot per level (asserted).

## Modes, levels, scoring
- Daily: questions derive from `ctx.seed`. Practice: same recipe, fresh seed.
- Score: QuizRunner default. Stars: 7 → 3; 5–6 → 2; 3–4 → 1; fewer → 0 (set `stars` explicitly in `buildResult`).
- Mastery ids follow the single-skill games so one Leitner record is shared: `vocab:<id>`, `shabda:<paradigmId>:<v>.<n>`, `dhatu:<dhatuId>:<lakara>:<p>.<v>`, `<dhatuId>:<field>` (krdanta), `sandhi:<ruleId>:<exampleId>`, `samasa:<id>:vigraha`, `subhashita:<verseId>:artha`, `meter:<meterId>`.
- Share card (daily): level and seven squares in question order, e.g. `L2 · 6/7` then `🟩🟩🟥🟩🟩🟩🟩`.
- `review[].note`: a static hint per skill ("Practise in Pada-pātaḥ" …) from a skill → title table in `logic.ts` (text only, no import).
- `best: { label: 'Perfect days', value }` — count kept in `ctx.store` (`{ v: 1, perfect: number, last: dateKey }`).

## UX notes
Pure `<QuizRunner>` plus `buildResult` for stars, share and notes. Each instruction line starts with the skill name from `SKILLS`.

## Acceptance tests
- `logic.test.ts`: `testMatrix([0, 1, 2, 3, 4, 5], 30)` → exactly seven valid questions (`assertValidQuestions`), slot skills in recipe order, deterministic per (seed, level).
- `logic.test.ts`: each builder, 200 seeds per level — the invariants above (single key or all alternatives; no distractor equals an accepted answer; options distinct).
- `logic.test.ts`: named checks — a vibhakti slot never asks about रामाभ्याम् without context; a sandhi slot's key equals `joinSandhiDeva(first, second, options).result` for its example; an arrange slot uses no sentence containing an avyaya or viśeṣaṇa and accepts all permutations of its words.
- `logic.test.ts`: fallback — with one slot's pool injected as empty, the recipe still returns seven questions.
- `logic.test.ts`: ≥ 30 distinct question ids per slot per level; 30 daily seeds give 30 different sets.
- `logic.test.ts`: perfect bot → 7/7, 3 stars, share has seven 🟩; all-wrong bot → `completed`, 0 stars.
- `e2e.spec.ts`: daily run at 390 px with one wrong answer → result shows six 🟩 and one 🟥 and a "practise in" note; the same seed shows the same questions; IAST run; no console errors; no overflow.

## Out of scope / later
Personalised sets from the learner's due items (the shell does not expose the review queue to games, and it conflicts with "same puzzle for everyone"); listening items; typed answers.

## Open questions
- Platform: will a shared builder library be provided?
- Product: one daily for all levels, or per level?
- Sanskrit reviewer: confirm the recipes against the six-level ladder.
