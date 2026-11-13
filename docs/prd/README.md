# Game PRDs — backlog index and claiming protocol

This folder is the queue of games waiting to be built. Each file in [`backlog/`](backlog/) is a complete,
build-ready PRD that follows [`TEMPLATE.md`](TEMPLATE.md). Read [`AGENTS.md`](../../AGENTS.md) first, then pick
one PRD; you should not need anything else. Sequencing, estimates and risks are in [`PLAN.md`](PLAN.md).

Status values: `proposed` → `in-progress` → `built vX.Y.Z` (or `closed` with a reason).

## 1. Backlog (sorted by recommended build order)

Size: **S** ≈ 2 agent-hours · **M** ≈ 4 · **L** ≈ 8. Levels: 0 Akṣara · 1 Śibira · 2 Praveśa · 3 Paricaya · 4 Śikṣā · 5 Kovida.
"Prerequisites" names entries of section 5; **bold** = blocking, plain = optional improvement, "—" = build today.

| # | Id | Title | Kind | Primary skill | Levels | Size | Prerequisites | Status | Owner | Why here in the order |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | [`sah-sa-tat`](backlog/01-sah-sa-tat.md) | सः सा तत् — pronoun agreement | lesson | vibhakti | 1–2 | S | — | proposed | — | First grammar habit of every beginner; QuizRunner only. |
| 02 | [`vyasta-pada`](backlog/02-vyasta-pada.md) | व्यस्तपदम् — Jumble | daily | shabdakosha | 0–2 | S | — | proposed | — | Cheapest new daily; spelling for the largest audience. |
| 03 | [`varna-sthana`](backlog/03-varna-sthana.md) | वर्णस्थानम् — places of articulation | arcade | akshara | 0, 3 | S | R1 (5 labels) | proposed | — | Engine-only; serves L0 and is a sandhi prerequisite. |
| 04 | [`samyuktakshara`](backlog/04-samyuktakshara.md) | संयुक्ताक्षरम् — conjunct builder | lesson | akshara | 0 | S | — | proposed | — | Closes the script level; QuizRunner only. |
| 05 | [`krdanta-racana`](backlog/05-krdanta-racana.md) | कृदन्तरचना — root + suffix | lesson | krdanta | 1–4 | S | R1 (9 labels) | proposed | — | Only kṛdanta drill; data is ready in the dhātu pack. |
| 06 | [`kala-yantra`](backlog/06-kala-yantra.md) | कालयन्त्रम् — tense machine | quiz | kriyapada | 1–3 | S | C2 (optional) | proposed | — | Lakāras in sentence context; uses the sentence pack as is. |
| 07 | [`pratyahara-krida`](backlog/07-pratyahara-krida.md) | प्रत्याहारक्रीडा — Māheśvara-sūtra puzzle | puzzle | akshara | 3–5 | S | — | proposed | — | Engine-only upper-level game; no content risk. |
| 08 | [`kati`](backlog/08-kati.md) | कति? — numbers that agree | quiz | sankhya | 2–3 | S | — | proposed | — | Gendered numerals are a known Praveśa trap. |
| 09 | [`padanveshana`](backlog/09-padanveshana.md) | पदान्वेषणम् — word search | puzzle | shabdakosha | 0–2 | S | — | proposed | — | Relaxed, child-friendly; low learning value, so not earlier. |
| 10 | [`rupa-rahasya`](backlog/10-rupa-rahasya.md) | रूपरहस्यम् — the secret form (Mastermind) | daily | vibhakti | 2–3 | M | — | proposed | — | Highest learning value in the backlog; needs no new content. |
| 11 | [`varganumana`](backlog/11-varganumana.md) | वर्गानुमानम् — guess the class (Pinpoint) | daily | shabdakosha | 1–4 | S | R1 (confusable table); C5 later | proposed | — | Third daily flavour; derived entirely from pack metadata. |
| 12 | [`catushpadi`](backlog/12-catushpadi.md) | चतुष्पदी — four words at once (Quordle) | daily | shabdakosha | 1–3 | S | S2 (optional) | proposed | — | Nearly free once Pada-śodhaḥ is stable. |
| 13 | [`rupa-sudoku`](backlog/13-rupa-sudoku.md) | रूपसुडोकु — paradigm Sudoku | puzzle | kriyapada | 0–3 | M | — | proposed | — | Long calm session for adults; self-contained. |
| 14 | [`avyaya-purana`](backlog/14-avyaya-purana.md) | अव्ययपूरणम् — fill in the indeclinable | quiz | avyaya | 1–3 | S | **R1** (two tables); C3 (optional) | proposed | — | Only avyaya-primary game. |
| 15 | [`karaka-anveshana`](backlog/15-karaka-anveshana.md) | कारकान्वेषणम् — case detective | quiz | vibhakti | 2–4 | S | **R1** (labels, upapada table); C2 (optional) | proposed | — | "Which case and why" — the step from forms to syntax. |
| 16 | [`panchanga`](backlog/16-panchanga.md) | पञ्चाङ्गम् — days, months, seasons | quiz | sankhya | 1–3 | S | **R1** (46-item list) | proposed | — | Ordinals, tithi, vāra, māsa, ṛtu; classroom staple. |
| 17 | [`samasa-vigraha`](backlog/17-samasa-vigraha.md) | समासविग्रहः — unpack the compound | lesson | samasa | 4–5 | S | C4 (optional) | proposed | — | Analytic companion to Samāsa-setuḥ. |
| 18 | [`chandah-paricaya`](backlog/18-chandah-paricaya.md) | छन्दःपरिचयः — name the metre | quiz | chandas | 4–5 | S | — | proposed | — | Kovida-syllabus chandas on a fully verified engine. |
| 19 | [`samasya-purana`](backlog/19-samasya-purana.md) | समस्यापूरणम् — complete the verse | daily | subhashita | 3–5 | S | R2 (sample review) | proposed | — | Literary daily with deep cultural roots. |
| 20 | [`ekam`](backlog/20-ekam.md) | एकम्! — case-matching card game (Uno) | puzzle | vibhakti | 2–3 | M | — | proposed | — | Family / classroom card game; teaches syncretism. |
| 21 | [`dhatu-vistara`](backlog/21-dhatu-vistara.md) | धातुविस्तारः — root expansion (Text Twist) | arcade | krdanta | 2–4 | M | R1 (labels, shared with 05) | proposed | — | Upasargas and kṛdantas as a family; pack is rich enough. |
| 22 | [`nityabhyasa`](backlog/22-nityabhyasa.md) | नित्याभ्यासः — the daily seven | daily | vakya (mixed) | 0–5 | M | S3 (optional, halves the work) | proposed | — | Daily mixed challenge across every pack. |
| 23 | [`lekhana-vega`](backlog/23-lekhana-vega.md) | लेखनवेगः — typing speed | arcade | akshara | 0–3 | M | S1, S5 (optional) | claimed (external: engine-games build, see CLAIMS-*.md) | — | Input fluency unlocks every typing game. |
| 24 | [`shrnkhala`](backlog/24-shrnkhala.md) | शृङ्खला — the chain (Dominoes) | puzzle | shabdakosha / sandhi | 1–4 | M | — | proposed | — | Two decks on one board; sandhi by rule name. |
| 25 | [`moksha-pata`](backlog/25-moksha-pata.md) | मोक्षपटम् — snakes and ladders quiz | quiz | sankhya (mixed) | 0–3 | M | S3, S4 (optional); R1 (8 labels) | claimed (external: engine-games build, see CLAIMS-*.md) | — | Heritage board; the pass-and-play title. |
| 26 | [`phala-melana`](backlog/26-phala-melana.md) | फलमेलनम् — vowel-fruit merge (Suika-style) | arcade | sandhi | 3 | M | — | proposed | — | Svara-sandhi table as a drop-merge arcade. |
| 27 | [`ishtika-bheda`](backlog/27-ishtika-bheda.md) | इष्टिकाभेदः — verse breakout | arcade | subhashita | 2–4 | M | — | proposed | — | Memorisation arcade; modest learning value, so late. |
| 28 | [`katapayadi`](backlog/28-katapayadi.md) | कटपयादिः — the number code | puzzle | sankhya | 3–5 | S | **R1** (rules + examples); S6 (optional) | claimed (external: engine-games build, see CLAIMS-*.md) | — | Niche but distinctive; waits for a reviewer. |
| 29 | [`shruta-lekhana`](backlog/29-shruta-lekhana.md) | श्रुतलेखनम् — dictation (flash now, audio later) | lesson | akshara | 1–3 | M | S1 for audio mode; A1 later | proposed | — | Audio-ready design; text-only today. |
| 30 | [`katha`](backlog/30-katha.md) | कथा — stories | lesson | vakya | 1–4 | M + content | **C1** (`katha` pack, human authors) | claimed (external: course build, see CLAIMS-*.md) | — | The route to connected reading; gated by authoring. |
| 31 | [`jala-vinimaya`](backlog/31-jala-vinimaya.md) | जालविनिमयः — grid swap (Waffle-style) | daily | shabdakosha | 1–3 | M | — | proposed | — | Feasible only as a 3-word lattice (measured); product call. |
| 32 | [`laghu-pada-jala`](backlog/32-laghu-pada-jala.md) | लघुपदजालम् — mini crossword | daily (weekly) | shabdakosha | 2–4 | L | **C6** (constructor, validator, `padajala` pack, editor) | proposed | — | Prestige puzzle; hardest content pipeline. |

Portfolio check — primary skills: akshara 5 · shabdakosha 7 · vibhakti 4 · kriyapada 2 (+4 secondary) · sandhi 1 (+3 secondary) ·
samasa 1 · vakya 2 (+5 secondary) · chandas 1 (+1) · subhashita 2 (+1) · sankhya 4 · avyaya 1 · krdanta 2.
Kinds: daily 8 · puzzle 6 · arcade 5 · lesson 6 · quiz 7. Sizes: S 18 · M 13 · L 1.

## 2. First wave — built (all 23 pass the gate; do not write backlog PRDs for these)

> Other builds have also added or claimed games since this index was written: see `CLAIMS-*.md` at the repo root and
> the generated table in the top-level `README.md` for everything that is in `src/games/` today.

The as-built spec lives with the code. If a file below still says TODO, the game is mid-build.

| Id | Title | PRD |
|---|---|---|
| `akshara-paricaya` | अक्षरपरिचयः — letters lesson | [src/games/akshara-paricaya/PRD.md](../../src/games/akshara-paricaya/PRD.md) |
| `smrti-yugala` | स्मृतियुगलम् — memory pairs | [src/games/smrti-yugala/PRD.md](../../src/games/smrti-yugala/PRD.md) |
| `pada-shodha` | पदशोधः — Wordle | [src/games/pada-shodha/PRD.md](../../src/games/pada-shodha/PRD.md) |
| `sandhi-melana` | सन्धिमेलनम् — Sandhi 2048 | [src/games/sandhi-melana/PRD.md](../../src/games/sandhi-melana/PRD.md) |
| `sarpakshara` | सर्पाक्षरम् — snake | [src/games/sarpakshara/PRD.md](../../src/games/sarpakshara/PRD.md) |
| `akshara-tadana` | अक्षरताडनम् — whac-a-mole | [src/games/akshara-tadana/PRD.md](../../src/games/akshara-tadana/PRD.md) |
| `sankhya-pattika` | सङ्ख्यापट्टिका — number bingo | [src/games/sankhya-pattika/PRD.md](../../src/games/sankhya-pattika/PRD.md) |
| `kah-samayah` | कः समयः? — clock and time | [src/games/kah-samayah/PRD.md](../../src/games/kah-samayah/PRD.md) |
| `dipa-raksha` | दीपरक्षा — hangman | [src/games/dipa-raksha/PRD.md](../../src/games/dipa-raksha/PRD.md) |
| `pada-pata` | पदपातः — falling-word vibhakti sorter | [src/games/pada-pata/PRD.md](../../src/games/pada-pata/PRD.md) |
| `rupa-trika` | रूपत्रिकम् — Set with verb forms | [src/games/rupa-trika/PRD.md](../../src/games/rupa-trika/PRD.md) |
| `shuka-uddayana` | शुकोड्डयनम् — Flappy, verb agreement | [src/games/shuka-uddayana/PRD.md](../../src/games/shuka-uddayana/PRD.md) |
| `varna-gola` | वर्णगोलः — Crillion, gender | [src/games/varna-gola/PRD.md](../../src/games/varna-gola/PRD.md) |
| `vakya-racana` | वाक्यरचना — sentence builder | [src/games/vakya-racana/PRD.md](../../src/games/vakya-racana/PRD.md) |
| `patha-mala` | पाठमाला — mixed lesson | [src/games/patha-mala/PRD.md](../../src/games/patha-mala/PRD.md) |
| `padani` | पदानि — flashcards + spaced repetition | [src/games/padani/PRD.md](../../src/games/padani/PRD.md) |
| `catushtaya` | चतुष्टयम् — Connections | [src/games/catushtaya/PRD.md](../../src/games/catushtaya/PRD.md) |
| `koti-pati` | कोटिपतिः — Millionaire quiz | [src/games/koti-pati/PRD.md](../../src/games/koti-pati/PRD.md) |
| `sandhi-cheda` | सन्धिच्छेदः — sandhi splitting | [src/games/sandhi-cheda/PRD.md](../../src/games/sandhi-cheda/PRD.md) |
| `samasa-setu` | समाससेतुः — compound match | [src/games/samasa-setu/PRD.md](../../src/games/samasa-setu/PRD.md) |
| `shloka-yojana` | श्लोकयोजनम् — verse ordering | [src/games/shloka-yojana/PRD.md](../../src/games/shloka-yojana/PRD.md) |
| `chando-laya` | छन्दोलयः — metre tapping | [src/games/chando-laya/PRD.md](../../src/games/chando-laya/PRD.md) |
| `antyakshari` | अन्त्याक्षरी — verse / word chain | [src/games/antyakshari/PRD.md](../../src/games/antyakshari/PRD.md) |

Kind, skills, levels and modes of each built game are in its `manifest.ts`.

## 3. How to claim a PRD

1. Pick the first `proposed` row whose **bold** prerequisites are marked ✅ in section 5 (rows with only plain prerequisites, or "—", can start now).
2. In **one commit**: edit that row here (Status → `in-progress`, Owner → your name or agent id), run
   `npm run new-game -- <id>` and copy `backlog/NN-<id>.md` to `src/games/<id>/PRD.md` (replacing the scaffolded stub).
   Set the PRD's own Status line to `in-progress (@you)`.
3. Build `logic.ts` + tests first, then `Game.tsx`, then `e2e.spec.ts`. Every line of the PRD's *Acceptance tests* must
   become a test. The pool-size assertions are part of the spec: if one fails, fix the level list in the manifest
   (as the PRD says) or stop and report — never pad content.
4. Keep `src/games/<id>/PRD.md` true to what you built (it is the as-built spec). If you had to depart from the
   backlog PRD, say so in its *Open questions* and in the PR description.
5. When `npm run check -- --e2e --game=<id>` passes: set Status → `built v1.0.0` here and in the game's PRD, and
   delete nothing — the backlog file stays as the record of the proposal.
6. Stuck for more than a session, or the feasibility gate in the PRD fails? Set the row back to `proposed`
   (or `closed` with one line of why) so someone else can decide.

Rules that outrank any PRD: [`AGENTS.md`](../../AGENTS.md), [`GAME_CONTRACT.md`](../GAME_CONTRACT.md),
[`SANSKRIT_ACCURACY.md`](../SANSKRIT_ACCURACY.md). A PRD marked **R1** contains a short list of game-local Sanskrit
(labels or closed lists): you may build against it, but the game must not be marked `stable` until a human
reviewer has signed that list in the PR — set `status: 'beta'` in the manifest until then.

## 4. How to propose a new game

1. Copy [`TEMPLATE.md`](TEMPLATE.md) to `backlog/NN-<id>.md` (next free number; id = kebab-case ASCII, permanent).
2. Fill **every** section — no TODOs. Check feasibility against the real packs (`npm run validate` prints counts) and
   state minimum pool sizes; if the idea needs content that does not exist, specify the pack schema, size,
   verification method and reviewer as a prerequisite.
3. Add a row to the table in section 1 and any new prerequisite to section 5.
4. Open a PR that contains **only the PRD and this index** — no code. Code follows once the PRD is accepted.
5. Ideas not yet worth a PRD belong in `labs/` as an experiment, or in `docs/research/games-research.md`.

## 5. Platform prerequisites (for platform maintainers to schedule)

Nothing here blocks the first thirteen backlog games. Bold items block the PRDs listed. Maintainers: when a prerequisite lands, append ✅ and the PR link to its row.

### Human Sanskrit review
| Code | What | Needed by |
|---|---|---|
| **R1** | Sign-off of small game-local lists: sthāna stage-4 labels (03); pratyaya labels (05, 21); correlative and pronominal-adverb tables (14); kāraka labels and the four-row upapada table (15); the 46 calendar terms (16); `CONFUSABLE` categories (11); ladder / snake words (25); Kaṭapayādi rule statement and six examples (28). About 3 reviewer-hours in total. | blocking for `stable`: 14, 15, 16, 28 · light: 03, 05, 11, 21, 25 |
| R2 | Sample review of generated puzzles before launch: 30 verse-completion puzzles (19); the per-level recipes (22); a skim of lattice word sets (31). | 19, 22, 31 |

### Shared code (each must serve at least two games)
| Code | What | Needed by |
|---|---|---|
| S1 | Answer-comparison key in `@sanskrit` (anusvāra ↔ class nasal inside a word; final म् ↔ anusvāra) so typed answers can accept spelling variants uniformly. Required before any audio-based dictation. | 23, 29 (audio mode), 12, 21, 32 |
| S2 | The akṣara tile-feedback function of Pada-śodhaḥ exported from the platform (plus a shared fixture file). | 12 (and `pada-shodha`) |
| S3 | Shared question-builder library (pure `(rng, level) → Question` functions per pack), extracted from Pāṭha-mālā. | 22, 25 |
| S4 | An embeddable single-question view (QuizRunner's renderer without its session shell) for games that ask one question inside another mechanic. | 25, 26, 27, 29, 30 |
| S5 | `AksharaKeyboard` additions: space key, optional digit row, Roman (IAST / ASCII) input, hardware-keyboard mapping. | 23, 28, 32, 12 |
| S6 | `katapayadi()` in `@sanskrit` (reviewed once, reusable in quizzes). | 28 |
| S7 | Game access to the learner's due review items (e.g. `ctx.due(skill)`), for personalised practice modes. | 22 (later mode) |

### Content packs and pack extensions
| Code | What | Needed by |
|---|---|---|
| **C1** | New pack `katha` (stories): schema, validator and review gate are specified in PRD 30. Launch size 12 stories / ≈ 130 lines / ≈ 60 checks, human-authored, two human sign-offs per story. | **30** |
| C2 | Sentence pack: an explicit upapada role with its trigger word (today the noun in जनकेन सह is tagged `karana`); `dhatuId` + pada on verb words; karmaṇi-prayoga sentences. | 15 (L4), 06 |
| C3 | Vocab pack: sub-class for the 73 indeclinables (place / time / manner / connective …); the missing calendar words (ज्येष्ठः as a month, pakṣa and tithi names, a decision on वर्षाः vs प्रावृट्) — or a small shared `kala` pack. | 14, 16 (and `kah-samayah`) |
| C4 | Samāsa pack: a transparent level-3 subset; alternate analyses and alternate vigraha wordings where they exist. | 17 |
| C5 | A reviewed category pack (`varga`) for authored cultural and synonym sets, shared with Catuṣṭayam. | 11 (v2) |
| **C6** | Lattice constructor (`tools/content/lattice/`), validator and the `padajala` pack with an editor + reviewer pass; 26 puzzles for a weekly launch. Specified in PRD 32. | **32** (31 no longer needs it) |
| C7 | Subhāṣita pack: flags for clean pāda boundaries and repeated pādas; prose order (anvaya). | 19, 27, 18 (convenience) |
| C8 | Dhātu pack: feminine / neuter kṛdanta forms; full paradigms for prefixed verbs. | 05, 21, 06 (later scope) |

### New capabilities
| Code | What | Needed by |
|---|---|---|
| A1 | Audio: human recordings keyed by content id (`vocab:<id>`, `sentence:<id>`), an availability lookup, a player component, offline caching. No synthetic speech. | 29 (listening mode); later 03, 04, 18 |

## 6. Facts the backlog was checked against (2026-11-10)

`shabda` 173 paradigms (19 / 73 / 47 / 34 at levels 1–4) · `dhatu` 199 roots × 5 lakāras with 8 kṛdanta fields, 41 lyap
lists, 155 prefixed verbs · `vocab` ≈ 1,080 single-word entries in 29 categories (no level-0 entries; 484 with emoji) ·
`sentences` 671 role-tagged sentences in 28 patterns (levels 1–3) · `sandhi` 848 examples over 35 rules (levels 2–4) ·
`samasa` 244 compounds (levels 4–5) · `subhashita` 135 verses (105 anuṣṭubh). If these change, re-run the pool
assertions in the affected games — the PRDs say which numbers matter.
