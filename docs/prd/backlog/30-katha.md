# कथा · Kathā — Stories

| | |
|---|---|
| **Id** | `katha` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | lesson — after *Duolingo Stories* |
| **Skills / levels** | vakya, shabdakosha, vibhakti, kriyapada · L1–L4 |
| **Modes** | practice |
| **Session** | ~4 min, one story: 8–14 lines, 4–6 checks |
| **Build size** | M (reader) + **L content prerequisite** (new `katha` pack) |

## Learning objective
Read connected Sanskrit. Every other game works with words or single sentences; here the learner follows a short dialogue or fable line by line and proves comprehension on the way. After 20 stories a Praveśa learner reads a simple paragraph without translating word by word.

## Why people come back
A story has an ending. Stories unlock in sequence and can be re-read for a "golden" run without glosses.

## Core loop
1. Lines appear one at a time (tap / Space). Speaker lines show the speaker's name and emoji.
2. Tapping a word opens its gloss (counted, no penalty).
3. At marked points a **check** interrupts: answer → feedback → continue. One answer per check; no hearts.
4. After the last line: a closing pairs check, then `ctx.finish` (`completed`).

## Sanskrit rules
- All text comes from the `katha` pack; the game writes no Sanskrit.
- **Arrange checks honour free word order**: the game accepts exactly the orders stored in the pack item (authoring rule below).
- **Cloze checks**: options are the key plus real pack forms (other cells of the same paradigm / dhātu), none string-equal to an accepted form for that slot.
- Glosses are the pack's; the game never analyses a word itself.
- L1–L2 stories are written word by word (no sandhi between words, final म् kept), like the sentence pack. L3–L4 lines may use sandhi and then carry their padaccheda, shown on demand.

## Content — the new `katha` pack (prerequisite)
**Schema** (`src/content/katha/types.ts`):
- `Story`: `id`; `title { sa, en }`; `level`; `kind` ('dialogue' | 'fable' | 'anecdote'); `speakers?` [{ `id`, `sa`, `emoji` }]; `lines` Line[]; `checks` Check[]; `source` (e.g. "retold from Hitopadeśa 1.x" or "original"); `author`; `provenance` (with `humanReviewed`).
- `Line`: `id`; `speaker?`; `words` [{ `sa`, `en`, `ref` }] in display order, where `ref` is one of `shabda:<paradigmId>:<v>.<n>` · `dhatu:<dhatuId>:<lakara>:<pada>:<p>.<v>` · `krdanta:<dhatuId>:<field>` · `prefixed:<id>` · `vocab:<id>` (indeclinables and citation forms); `en` (line translation); `padaccheda?` string[] (L3+ lines with sandhi; then `words` describe the padaccheda and `text` holds the joined line).
- `Check`: `id`; `afterLine`; one of
  - `choice` — `prompt { sa?, text? }`, `options` [{ id, sa?, text? }], `answer`;
  - `arrange` — `line` (id), `orders` string[][] (word indexes; ≥ 1), optional distractor words;
  - `cloze` — `line`, `wordIndex`, `distractorRefs` (refs to real forms);
  - `whoSaid` — `line` (answer = its speaker);
  - `next` — choose which later line comes next;
  - `pairs` — four `vocab` / word–gloss pairs from the story.
- **Size for launch**: 12 stories (3 per level L1–L4), ≈ 130 lines, ≈ 60 checks. Fewer than 8 reviewed stories → do not ship.
- **Verification** (script `tools/content/katha/validate.ts`, run by `npm run validate`):
  1. *Closed vocabulary* — every word's `sa` must equal a form the `ref` resolves to in the packs; unresolved words fail the build.
  2. *Agreement* — a finite verb's puruṣa / vacana matches the nominative subject when both are present.
  3. *Sandhi* — for lines with `padaccheda`, joining it pairwise with `joinSandhiDeva` must reproduce `text`, or the line is listed in `REVIEW.md` as hand-verified.
  4. *Checks* — `choice` has one answer; `arrange` orders are permutations of the line; `cloze` distractors differ from every accepted form.
  5. Level policy — L1–L2 lines contain no cross-word sandhi.
- **Authoring rule for `arrange`**: only lines of ≤ 5 words; the validator proposes all permutations that keep pinned particles (च, एव, अपि, न, इति after their host; vocative first) and the reviewer prunes them.
- **Who writes and reviews**: a competent human author (agents may draft, but nothing ships on an agent's word), with two human sign-offs per story — a Samskrita Bharati teacher (level, idiom) and a grammar reviewer. There is no oracle for prose, so `humanReviewed: true` is a **hard gate**: unreviewed stories are excluded from the build.

## Modes, levels, scoring
- Story list by level; a story unlocks when the previous one at that level was completed with ≥ 2 stars (state in `ctx.store`).
- Score: 20 per correct check; stars from accuracy (≥ 90 % → 3, ≥ 70 % → 2). Lookups cost nothing; `summary` reports them ("5 / 6 · 3 words looked up").
- Golden run: glosses disabled; 3 stars earn the gold mark.
- Mastery: `vakya` · `katha:<storyId>:<checkId>`; cloze checks also emit the form's own id (`shabda:…` / `dhatu:…`).

## UX notes
Chat-like column: lines accumulate, newest at the bottom; a persistent "Continue" `Button`. Word gloss in a `Sheet`. Checks render inline with `Choice` / `Chip` and a `FeedbackBar`, reusing `isCorrect` from `@sdk`. Text via `<SaText nowrap={false}>`. `ctx.hud({ progress })` by lines read. `ctx.expose({ phase, line, check: { kind, answer } })`.

## Acceptance tests
- `logic.test.ts`: reader — lines advance one at a time; a check blocks progress until answered; finish happens exactly once.
- `logic.test.ts`: every story in the pack converts to valid `Question`s (`assertValidQuestions`); arrange accepts every listed order and rejects a non-listed one; cloze has one correct option.
- `logic.test.ts`: unlock rule; golden-run rule; lookup counting; score and stars for perfect and all-wrong bots (both `completed`).
- `logic.test.ts`: pack gate — stories without `humanReviewed` are not listed; fewer than 8 listed fails with a clear message.
- `e2e.spec.ts`: read one story to the result at 390 px answering from `window.__game`, with one wrong check and one gloss lookup; next story unlocks; IAST run (names and glosses included); long lines wrap without overflow; no console errors.

## Out of scope / later
Audio narration; branching stories; stories with verses.

## Open questions
- Product owner: who authors and reviews (named people)? Retold Pañcatantra / Hitopadeśa fables, or original classroom dialogues only? Published textbooks must not be copied.
- Sanskrit reviewer: sandhi policy per level; how liberal should arrange orders be?
