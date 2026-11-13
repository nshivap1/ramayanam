# Plan of attack — second wave (32 backlog PRDs)

Companion to [`README.md`](README.md) (index, claiming protocol, prerequisite codes R/S/C/A). This plan says in what
order to build, what can run in parallel, what it costs, what humans must do, what can go wrong, and how we will
know whether learners benefit.

## 1. Principles behind the sequencing

1. **Serve the largest audience first.** The first wave leaned on sandhi, samāsa and metre; most learners are at
   Akṣara → Praveśa. Sprint 1 is therefore weighted to levels 0–2 and to the core Praveśa skills (agreement,
   lakāras, kṛdantas, numbers).
2. **Zero shared-code changes per game.** A game PR touches only `src/games/<id>/` and its row in the index. Anything
   else is a platform task on its own track, and no game waits for an *optional* platform task — every PRD says what
   to do without it.
3. **Content-gated games go last**, and their content work starts on day one in parallel (stories, crossword bank,
   reviewer sign-offs), because human time, not agent time, is the bottleneck.
4. **Each sprint ships at least one daily, one arcade and one lesson/quiz**, so the catalogue stays balanced however
   far we get.

## 2. Sprints

Estimates: S ≈ 2 agent-hours, M ≈ 4, L ≈ 8 (build + tests + e2e, on the existing SDK). "Parallel" means independent
agents can build these simultaneously with no shared-code change and no ordering between them.

### Sprint 1 — build-today set (10 games, 22 h) · all parallel
| PRD | Size | h | Notes |
|---|---|---|---|
| 01 `sah-sa-tat` | S | 2 | QuizRunner only |
| 02 `vyasta-pada` | S | 2 | daily |
| 03 `varna-sthana` | S | 2 | engine only; ship `beta` until R1 labels signed |
| 04 `samyuktakshara` | S | 2 | QuizRunner only |
| 05 `krdanta-racana` | S | 2 | `beta` until R1 labels signed |
| 06 `kala-yantra` | S | 2 | uses the sentence pack as is |
| 07 `pratyahara-krida` | S | 2 | engine only |
| 08 `kati` | S | 2 | |
| 09 `padanveshana` | S | 2 | |
| 10 `rupa-rahasya` | M | 4 | the flagship of this wave — assign a strong agent |

**Platform track during sprint 1** (does not block sprint 1): S2 feedback helper (2 h) · S1 comparison key (3 h, needs
a Sanskrit reviewer) · S4 single-question view (3 h) · S3 builder library (6 h) · C6 constructor spike → tool (8 h) ·
C1 `katha` schema + validator (4 h). **Human track**: R1 sign-offs for 14, 15, 16, 28; story authors recruited and
briefed; crossword editor named.

### Sprint 2 — dailies and analytic quizzes (9 games, 20 h) · all parallel
| PRD | Size | h | Depends on |
|---|---|---|---|
| 11 `varganumana` | S | 2 | — (R1 confusable table reviewed before `stable`) |
| 12 `catushpadi` | S | 2 | better after S2; otherwise local feedback + shared fixtures |
| 13 `rupa-sudoku` | M | 4 | — |
| 14 `avyaya-purana` | S | 2 | **R1** tables for `stable` |
| 15 `karaka-anveshana` | S | 2 | **R1** labels; L4 thin until C2 |
| 16 `panchanga` | S | 2 | **R1** list (blocking for `stable`) |
| 17 `samasa-vigraha` | S | 2 | — |
| 18 `chandah-paricaya` | S | 2 | — |
| 19 `samasya-purana` | S | 2 | R2 sample review before launch |

### Sprint 3 — bigger mechanics (8 games, 32 h) · parallel, two soft dependencies
| PRD | Size | h | Depends on |
|---|---|---|---|
| 20 `ekam` | M | 4 | — |
| 21 `dhatu-vistara` | M | 4 | — (labels shared with 05) |
| 22 `nityabhyasa` | M | 4 | S3 preferred (falls to ~2 h with it) |
| 23 `lekhana-vega` | M | 4 | S1, S5 optional |
| 24 `shrnkhala` | M | 4 | — |
| 25 `moksha-pata` | M | 4 | S3, S4 optional |
| 26 `phala-melana` | M | 4 | — |
| 27 `ishtika-bheda` | M | 4 | — |

If S3 is late, build 22 and 25 last in the sprint; they are the only two that duplicate builder code without it.

### Sprint 4 — content- and decision-gated (5 games, 22 h + human content)
| PRD | Size | h | Gate |
|---|---|---|---|
| 28 `katapayadi` | S | 2 | **R1** (rule statement, examples) |
| 29 `shruta-lekhana` | M | 4 | product decision: ship text-only as `beta` / labs until A1 audio? |
| 31 `jala-vinimaya` | M | 4 | product decision: is a three-word lattice worth a daily slot? |
| 30 `katha` | M | 4 | **C1**: ≥ 8 human-reviewed stories merged (12 for launch) |
| 32 `laghu-pada-jala` | L | 8 | **C6**: tool + validator + ≥ 26 reviewed puzzles |

28, 29 and 31 are parallel and can move earlier if their gates clear. 30 and 32 can be *built* against two or three
fixture stories / puzzles but must not be released before the content gates pass (their tests enforce the minimum).

**Totals:** 96 agent-hours of game work (S 18 × 2 + M 13 × 4 + L 1 × 8) plus ≈ 30 agent-hours of platform tasks.
With four agents in parallel each sprint is roughly one working day of agent time; calendar time is set by reviews.

## 3. What can be built simultaneously, and what cannot

- **Fully independent (26 games):** 01–13, 17, 18, 20, 21, 23, 24, 26, 27, plus 19, 22, 25, 29, 31 (the last five have
  only review or product gates, not code gates). Any subset can be assigned at once.
- **Need a human sign-off before `stable`, not before coding (4):** 14, 15, 16, 28.
- **Need new content first (2):** 30 (stories), 32 (crossword bank).
- **Shared-code pairs — coordinate, do not block:** 12 ↔ `pada-shodha` (S2); 22 ↔ 25 ↔ `patha-mala` (S3);
  23 ↔ 29 ↔ 32 (S1, S5). Whoever lands first keeps a local copy with the shared fixture; the platform task later
  replaces both.

## 4. Human workload implied

| Work | Who | Size | When |
|---|---|---|---|
| R1 list sign-offs (≈ 130 strings across 9 games) | Sanskrit reviewer | ≈ 3 h | before sprint 2 ends |
| R2 sample reviews (verse puzzles, recipes, lattice word sets) | Sanskrit reviewer | ≈ 3 h | sprints 2–4 |
| Open-question decisions (each PRD ends with 2–3) | product owner + reviewer | ≈ 4 h in two sittings | start of sprints 2 and 3 |
| Stories: 12 × (write ≈ 2 h + two reviews ≈ 30 min each) | author + SB teacher + grammar reviewer | ≈ 36 h | from day one; gates sprint 4 |
| Crossword bank: 26 × (edit ≈ 20 min + review ≈ 10 min) | editor + reviewer | ≈ 13 h | after C6 tool; gates sprint 4 |
| Pack `REVIEW.md` sign-offs the first wave still owes (shabda, dhātu, vocab, sentences, sandhi, samāsa, subhāṣita) | Sanskrit reviewers | large; tracked per pack | ongoing — every backlog game inherits this debt |
| Audio recordings (A1), if dictation is to become real listening | speaker + reviewer | ≈ 1,000 words + 200 sentences | not scheduled |

No game in this plan asks an agent to author Sanskrit. Where a PRD lists strings (labels, calendar terms, correlative
pairs), they are closed lists for a human to confirm.

## 5. Top risks and mitigations

| # | Risk | Likelihood · impact | Mitigation |
|---|---|---|---|
| 1 | **Human review does not keep up**; games sit in `beta`, stories never ship. | high · high | Start the human track on day one; keep R1 lists tiny and itemised; games that need no new strings (24 of 32) come first; release gates are tests, so nothing unreviewed leaks. |
| 2 | **Ambiguity bugs** — a "wrong" answer that is actually right (homographic cells, vikalpa, free word order, two fitting distractors). This is the classic way Sanskrit games lose trust. | medium · high | Every PRD defines accepted sets explicitly and demands exhaustive "exactly one keyed answer" tests; errors in Sanskrit are P0 (remove first); watch error reports per game (section 6). |
| 3 | **Pack drift** — a pack update changes counts, levels or tags and silently starves or breaks a game. | medium · medium | Pool-size assertions and named fixtures in every game's tests; README §6 records the numbers the backlog was checked against. |
| 4 | **Sentence-pack role tags are simplifications** in upapada patterns (जनकेन सह tagged `karana`). | certain · medium for 15 | PRD 15 overrides in-game and excludes those sentences below L4; C2 fixes the pack. |
| 5 | **Akṣara lattices are scarce** (measured: 52 ring fills; only 114 dense 3 × 3 fills even with 16,400 inflected forms). | certain · high for 31, 32 | 31 redesigned to a three-word lattice with 2,006 valid puzzles; 32 targets sparse grids, weekly cadence, constructor + human editor; both PRDs carry numeric gates. |
| 6 | **Phone legibility** of dense Devanagari (9 × 9 Sudoku, four Wordle boards, long compounds, 24-tile racks). | medium · medium | Size fallbacks are specified (6 × 6 on phones; board echo row; wrap rules); e2e at 360–390 px is mandatory for each. |
| 7 | **Arcade titles teach little** (27, 26, 09 are honest about this). | medium · low | Each has an explicit recall or prediction beat that produces mastery events; they are sequenced late and can be cut without harming coverage. |
| 8 | **Typing friction** on the akṣara keyboard makes typed-answer games feel punishing. | medium · medium | Typing appears only at upper levels or in dedicated games (23 trains it); S1 and S5 reduce friction; choice / tile alternatives exist everywhere else. |
| 9 | **Duplicate implementations diverge** (Wordle feedback, question builders). | medium · medium | Shared fixture files now; platform extraction (S2, S3) scheduled in sprint 1's platform track. |
| 10 | **Dictation without audio is a weak proxy**, and synthetic audio would break the accuracy promise. | high · low | Ship as `beta`, design is audio-ready by contract, no TTS; revisit when A1 is funded. |
| 11 | **Daily fatigue** — eight more dailies on top of the first wave's. | medium · medium | The shell's quests should rotate dailies by level; `nityabhyasa` is the single "do one thing" entry; measure dailies per user before adding more. |

## 6. Success metrics once real learners play

Games may not make network requests, so everything below is computed from the local profile (XP by day, streak,
per-game plays / wins / stars, daily records, mastery boxes). Until an opt-in, privacy-respecting sync exists, collect
these through a voluntary "export my stats" file from pilot classes and a weekly review of pilot devices.

| Metric | Definition | First target | Read it as |
|---|---|---|---|
| D1 retention | share of new profiles with a finished session on the day after first play | ≥ 40 % | onboarding and first-session fit |
| D7 retention | share with a finished session on day 7 (± 1) | ≥ 20 % | whether the habit formed |
| Sessions per active day | finished sessions per user per day played | median ≥ 2 | "one more game" pull; > 6 may mean grinding an easy game |
| Streak length distribution | share of actives with streak ≥ 3, ≥ 7, ≥ 30 | 50 % / 25 % / 5 % | the day-7 cliff is the one to watch |
| Completion rate per game | finished ÷ started sessions (by level and mode) | ≥ 80 % lessons and quizzes; ≥ 60 % arcade and dailies | below target = too hard, too long or confusing |
| Error reports per 1,000 sessions | Sanskrit-error issues attributed to a game or pack | < 1; any confirmed error is P0 | the trust metric; trend must fall as packs are reviewed |

Per-game health checks to add to the same review:
- **First-pass accuracy** by level: aim for 70–85 %. Above 95 % → too easy; below 55 % → level tagging or distractors are off.
- **Daily solve rate and median guesses / clues** (02, 10, 11, 12, 19, 22, 31): target 60–85 % solved.
- **Mastery movement**: share of items a learner saw in week 1 that reached Leitner box ≥ 3 by week 4, per skill — the
  closest thing we have to a learning outcome.
- **Skill coverage per learner**: number of the 12 skills touched per week at the learner's level; `nityabhyasa` should
  raise it.
- **Replays after a loss** (arcade and dailies): a healthy game is retried at least once in 40 % of losses.
- **Share-card use** per daily completion, as the organic-growth signal.

Decision rules: a game below its completion target for two weeks gets a difficulty patch before any new feature; a
game with a confirmed Sanskrit error is hidden (set to labs) until fixed; a game with < 2 % of sessions after a month
is a candidate for retirement or redesign, not for more content.

## 7. Definition of done for this wave

- 26 or more backlog games at `built`, each passing `npm run check -- --e2e --game=<id>`.
- Every R1 list signed or its game still `beta`; no unreviewed story or crossword in a release build.
- Prerequisites S1–S4 landed, with the duplicated code removed from the games that carried local copies.
- The six metrics above reported for at least one pilot class over four weeks, with a go / no-go note per game.
