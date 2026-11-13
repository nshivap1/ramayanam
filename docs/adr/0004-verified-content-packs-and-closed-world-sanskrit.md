# ADR 0004: Verified content packs and closed-world Sanskrit

**Status:** Accepted

## Context

The product's promise is that a learner can trust every akṣara. The games are written largely by
language models, which produce fluent, plausible and sometimes wrong Sanskrit: invented forms,
misapplied sandhi, false glosses, mis-scanned verses. A review of the earlier prototypes
(`docs/research/reference-repos-digest.md`) found model-drafted content carrying an unverified
"expert approved" label, with errors in it. Reviewers who read
Sanskrit are the scarcest resource the project has.

## Decision

- **Closed world.** A game may show or accept only Sanskrit that comes from a content pack in `src/content` (`@content/<pack>`) or a deterministic engine in `src/sanskrit` (`@sanskrit`). No Sanskrit is generated, completed or "corrected" at run time or typed ad hoc into a game.
- **Packs carry provenance.** Each item records its source and how it was verified (`npm run validate` fails the gate on an item without it); each pack has a `README.md` naming its sources and a `REVIEW.md` with a human sign-off table. An item ships when two independent confirmations agree (rule engine, reference dataset, printed source).
- **Engines are deterministic and conservative.** They implement only what is certain and are tested exhaustively (round trips, rule registries with executed examples and counter-examples).
- **Humans have the last word.** Only a named human sets `humanReviewed`; agents never do. Unreviewed content is labelled as such.
- **When unsure, leave it out.** Coverage is never a reason to include a doubtful form.

The full policy is [SANSKRIT_ACCURACY.md](../SANSKRIT_ACCURACY.md).

## Consequences

- An error is fixed once, in a pack or an engine, for every game that uses it; a reviewer's hour covers many games.
- Game authors need no Sanskrit to build a correct game, provided they obey the traps list (akṣara units, vikalpa, free word order, homographic cells). Much of that list is checked mechanically — for example `validateQuestion` refuses look-alike options, and `isCorrect` accepts every keyed word order.
- Content is the bottleneck. A game idea may wait for its pack, and early games cluster around the packs that exist.
- "Verified" currently means machine-checked against independent sources, not scholar-reviewed; the documentation says so plainly, and `stable` status requires the human step.
- The closed world excludes otherwise attractive features: free-text answers judged for correctness, model-generated dialogue, user-submitted sentences.
- Small closed sets inside a game (the varṇamālā in the two reference games) are allowed only when listed in the game's `PRD.md` with a source and checked by tests; this exception needs watching.

## Alternatives considered

- **Per-game content, reviewed per game.** No shared bottleneck, but every game would need its own Sanskrit review and the same word would be spelt three ways.
- **Generate forms with a morphological engine at run time.** Unlimited coverage; but engine errors would reach learners unreviewed, and exceptions (ṇatva, irregular stems, optional forms) are precisely where engines fail.
- **Language-model generation with automatic checking.** There is no checker we trust for arbitrary Sanskrit; the checkers we have are the engines above.
- **Crowd-sourced content with voting.** Scales contribution, not correctness; revisit when there is a reviewer community.
