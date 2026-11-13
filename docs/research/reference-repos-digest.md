# Reference repositories digest for Samskuru

Read-only code reading of the prototypes under `/home/claude/refs/`. Nothing in those repos was executed, installed or built. Where a claim rests on my own re-implementation or on reasoning rather than on running their code, it says so.

Access notes:

- **Deployed prototypes.** Direct HTTP fetches of the three `vercel.app` hosts were refused by the session's egress policy (403). They were read only through the page-fetch tool, which returns extracted text and no script URLs, so the JS bundles and game screens were not seen. Section 5 says what was.
- **sarpaksara.** The brief said this repo was unavailable. A source snapshot (`/home/claude/refs/sarpaksara/sarpaksara-main/`, no git metadata) appeared during this run, so section 6 digests it.
- Line references are `file:line` against the checked-out heads: samskuru `72f3321`, sanskrit-wordle `master` `3ca44f0`, Padaani `a8905b8`, rea `2885347cd`.

---

## 1. samskuru — "संस्कुरु · Sandhi 2048"

### Purpose

A 4×4 swipe puzzle in which tiles are Sanskrit word chunks and a merge is a sandhi rewrite at the boundary. Three visible target words drive spawning; forming a target scores, clears the tile and refills the slot. A second merge family (anuṣṭubh metre assembly) exists in the engine but is not reachable in the shipped game.

### Stack

React 19, TypeScript 5.8, Vite 7, Vitest 3 with jsdom and Testing Library, `lucide-react` icons, hand-written CSS (no Tailwind or Framer, though the PRD names them). Node 22. Static deploy on Vercel with `noindex`. `localStorage` persistence. A web manifest exists, but there is **no service worker**, so it is not offline-capable. Optional Plausible script behind `VITE_PLAUSIBLE_DOMAIN`.

Scripts: `test`, `lint` (just `tsc -b`), `build`, `deploy:check` (test + lint + build), `validate:targets:draft` (vite-node).

### Architecture map

| File | Lines | Responsibility |
|---|---:|---|
| `sandhi_2048_mobile_prd_v3.md` | 2031 | PRD. Titled "v5" inside; the README calls it "v4". |
| `src/game/types.ts` | 296 | All domain types |
| `src/game/phonemes.ts` | 256 | Phoneme inventory, IAST parser, Devanagari renderer, tile factory |
| `src/game/rules.ts` | 128 | Boundary rule resolver, `mergeTiles`, scoring |
| `src/game/ruleAudit.ts` | 269 | Versioned rule registry and per-merge audit builder |
| `src/game/board.ts` | 358 | 2048 move reducer, liveness, hint pairs |
| `src/game/rng.ts` | 36 | Seeded RNG (mulberry32-style) with FNV-1a string hash |
| `src/game/persistence.ts` | 72 | Versioned `localStorage` envelope |
| `src/game/meter/anustubh.ts` | 52 | Pathyā pāda template and prefix validation |
| `src/game/meter/meterMerge.ts` | 122 | Segment → pāda → hemistich → śloka → stack merges |
| `src/game/meter/targetPadas.ts` | 86 | Eight hand-weighted word seeds and fixture tiles |
| `src/targets/targetEngine.ts` | 777 | Run creation, opening board, target-aware spawn, completion, cleanup, hints |
| `src/app/App.tsx` | 898 | Entire UI: input, animation phases, HUD, bottom sheet |
| `src/styles/globals.css` | 915 | Design tokens and all styling |
| `scripts/validate-target-pack-draft.ts` | 139 | Replays build paths through the production merge engine |
| `content/target-packs/starter_word_targets.draft.json` | 574 | 50 word targets |
| `level_reference.json` | 342 | Three deprecated fixed-layout levels |
| `src/tests/*` | 962 | Nine test files (56 tests) plus `setup.ts` |

### PRD structure and non-negotiables

Sections: 0 what changed; 1 instruction block; 2 anuṣṭubh model; 3 tile model; 4 merge families; 5 anuṣṭubh validation; 6 visual style; 7 target-aware spawn; 8 scoring; 9 target-pack schema, validator, sufficiency gates, simulation, liveness; 10–11 deprecated levels; 12 phoneme inventory; 13 acceptance criteria; 14 tests; 15 file map; 16 product principle; 17 sources.

The twelve non-negotiables (PRD §1), condensed:

- **Feel (1–2):** swipe-first, no default d-pad, `100dvh` shell, input queue depth 3, slide → collide → pop. Devanagari by default; one Script setting applied everywhere; minimum tile font 16px; no hyphenation or wrapping of Sanskrit.
- **Mode (3–4, 8–10):** one target-driven endless mode with unlimited undo, action log and a persisted run; no levels and no vague chandas sandbox; spawns are chunks from verified paths, never pure random; scoring rewards sandhi, targets, streaks and the metre hierarchy.
- **Engine (5–7):** two merge families; curated packs are the content source; every target has a build path that the validator recomputes with the production engine.
- **Auditability (11–12):** a versioned rule registry separate from the UI (id, family, names, reference, patterns, constraints, explanation, examples, counter-examples); every merge event carries an audit trace; tests fail when metadata is missing; packs carry source trace and review metadata; validator errors are specific enough to repair.

Also normative: failure only when the board is full and no swipe changes it (§9.6); no repeat of a completed target within a pack cycle (§7.9); no pseudo-Sanskrit as a success state (§13.3).

### Core algorithms

**Phoneme model** (`types.ts:22-70`). `Phoneme` is a union of 13 vowels (`a ā i ī u ū ṛ ṝ ḷ e o ai au`), 33 consonants, `ṃ` and `ḥ`. There is no `ḹ`, avagraha, candrabindu or `ḻ`.

**IAST parsing** (`phonemes.ts:115-129`). Greedy longest-first over `PHONEME_TOKENS` (`phonemes.ts:91-98`): `ai au`, then the ten aspirates, then long vowels, then single characters. It throws on any unknown character and does no Unicode normalisation.

**Devanagari rendering** (`phonemes.ts:131-172`), one pass:

- consonant followed by a vowel → consonant plus mātrā (inherent `a` is empty), consuming both;
- consonant followed by a consonant, or at the end → consonant plus virāma;
- bare vowel → independent vowel letter; `ṃ` → `ं`; `ḥ` → `ः`.

**Tile** (`types.ts:163-181`):

```ts
type Tile = { id; kind: TileKind; phonemes: Phoneme[]; surfaceIAST; surfaceDeva; compactLabel?;
  leftBoundary: Phoneme; rightBoundary: Phoneme; mass: number; depth: number;
  originRule: MergeRuleId | null; parents: string[]; classSignature;
  meter?: MetricalSpan; targetUses?: TargetTileUse[]; sourceTargetUses?: TargetTileUse[]; accessibleLabel };
```

**Boundary resolver** (`rules.ts:37-70`). Inputs are the left tile's last phoneme and the right tile's first. The first match wins and is then filtered by `activeRules`:

| Order | Left | Right | Replacement | Right's first phoneme | Rule |
|---|---|---|---|---|---|
| 1 | a/ā, i/ī, u/ū, ṛ/ṝ | same class | ā, ī, ū, ṝ | consumed | `SAVARNA_DIRGHA` |
| 2 | a/ā | e, ai | ai | consumed | `VRDDHI` |
| 2 | a/ā | o, au | au | consumed | `VRDDHI` |
| 3 | a/ā | i/ī, u/ū, ṛ/ṝ | e, o, `a r` | consumed | `GUNA` |
| 4 | i/ī, u/ū, ṛ/ṝ | any unlike vowel | y, v, r | kept | `YAN` |
| 5 | e, o, ai, au | any vowel | `a y`, `a v`, `ā y`, `ā v` | kept | `AYAVA` |
| 6 | m | any consonant | ṃ | kept | `ANUSVARA_M` |

**Merge** (`rules.ts:72-92`): `phonemes = left[0..-1] ++ replacement ++ (consumeRight ? right[1..] : right)`. Rejected if longer than 12 phonemes. `mass = l.mass + r.mass`; `depth = max(l.depth, r.depth) + 1`. If no sandhi rule matches, it falls through to `tryMeterMerge`.

**Scoring** (`rules.ts:14-29, 94-97`): `base + 5·mass + 3·depth`, with base SAVARNA 10, GUNA 15, VRDDHI 20, YAN 12, AYAVA 15, ANUSVARA 8; meter segment 18, pāda 120, hemistich 280, śloka 700, stack 1200.

**Move reducer** (`board.ts:133-242`). Per line, compact toward the wall. Each tile merges at most once per move: after a merge the cursor skips two. The survivor keeps the wall-side tile's id.

- *Horizontal:* reading order is always left-to-right regardless of swipe direction (`board.ts:156, 193`), so `utsava | mahā` never merges.
- *Vertical:* both orders are tried (`board.ts:249-268`); the higher `rankMergeSurface` wins, and ties go to push order (up: lower + upper; down: upper + lower).
- `hasLegalMove` is true if any direction changes the board. A run fails only when the board is full and nothing changes (`targetEngine.ts:106-110`).

**Audit registry** (`ruleAudit.ts:5-215`). `Record<MergeRuleId, RuleAuditSpec>` (`types.ts:121-134`: id, family, `sourceVersion`, name, `sanskritName`, `sutraRef`, input and output patterns, constraints, explanation, examples, counter-examples). `buildMergeAudit` copies the spec into every `MergeEvent` together with the applied surfaces, boundary and replacement. Sūtra references: 6.1.101, 6.1.87, 6.1.88, 6.1.77, 6.1.78; anusvāra is labelled "v1 game rule".

**Anuṣṭubh** (`anustubh.ts`). Templates `ODD = X X X X L G G X` and `EVEN = X X X X L G L X`. Two universal rejections: `L L` at positions 2–3, and `G L G` at 2–4 in even pādas. `validatePrefix` checks only the filled positions; `validateCompletePada` additionally requires exactly eight syllables.

**Meter merge** (`meterMerge.ts`). Two metre-bearing non-pāda tiles concatenate their weights. If the result is at most eight syllables and a valid prefix for some pāda, it becomes a `PADA_SEGMENT`, or a `PADA` when it has exactly eight and validates. Then `PADA` 1+2 or 3+4 → `HEMISTICH`; hemistich 1+2 → `SHLOKA`; equal śloka counts → `SHLOKA_STACK`.

**Target run** (`targetEngine.ts`):

- *Opening* (`329-456`): pick one target per rule in `[SAVARNA_DIRGHA, GUNA, VRDDHI]` with difficulty ≤ 3, preferring distinct first chunks. Seed four tiles (one random chunk from each target's first path plus one duplicate) on random cells. Accept only if there are exactly four tiles, no target is already complete, no single swipe completes a target, every tile serves an active target, and every target has at least one chunk present with the missing chunks fitting in the empty cells. Up to 80 × 80 attempts, then a deterministic fallback.
- *Spawn* (`513-601`): one tile per move, two after a completion. Candidates are tried in four tiers: active targets; the first 12 queued targets (priority 0.45); active with duplicates allowed (role `repair`); queued with duplicates. A chunk is skipped when board copies ≥ the number of targets using it, or when its path's missing distinct chunks exceed the empty cells left after the spawn. Weight is `round((4 + max(0, 5 − difficulty) + 22 per step whose partner is already on the board + 5 per step using the chunk − 4·sameCount) × priority)`, floor 1. Weighted choice, random empty cell.
- *Completion* (`126-178`): any tile whose `surfaceIAST` equals an active target's. Score `80 + 20·difficulty + 20·max(0, streak − 1)`. Clear the tile, refill to three from the queue, retag the board.
- *Cleanup* (`672-718`): remove seed tiles (depth 0, no parents) that serve no active target. Remove merged tiles with no active or queued use once every target in their `sourceTargetUses` has been completed this cycle.
- *Deck cycle:* `completedTargetIds` blocks repeats until all 50 are done.
- *Hints* (`236-320`): priority 500 completes an active target, 400 builds an intermediate, 300 is a chunk; queued equivalents are 180/140/100; 0 is a generic legal merge. The first tap highlights the top-priority pairs; the second suggests a direction.

**UI loop** (`App.tsx:292-380`). Guard against re-entrancy with an input queue of depth 3 (`App.tsx:267-271`). Compute the move, render the movement list at "from", wait a frame, render at "to", wait 110 ms, show completion pops for 90 ms, commit and persist, show spawn pops for 90 ms. A transition token cancels in-flight animation on restart. Swipe: at least 24px with a 1.25 axis-dominance ratio (`App.tsx:90-98`). Keys: arrows, `u`, `h`, `l`, `r`.

**Persistence** (`persistence.ts`). Key `sandhi2048:v5`, `{schemaVersion: 1, runSetVersion, highScore, runSnapshot?, preferences}`. A `runSetVersion` mismatch drops the snapshot but keeps the high score and preferences; corrupt JSON returns defaults.

### Content and data

**Target pack.** `packId: starter_word_targets_v0_1`, `createdBy: codex-ai-assisted-draft`, `contentStatus: draft_for_human_review`, a pack-level `sourceTraceDefault` (`sourceType: synthetic`) and `reviewDefault` (`status: draft`, `reviewer: null`).

- 50 targets, each with exactly one single-step build path.
- By rule: GUNA 12, SAVARNA_DIRGHA 10, YAN 10, VRDDHI 8, AYAVA 5, ANUSVARA_M 5.
- By difficulty: 1 ×10, 2 ×31, 3 ×9.
- 67 distinct chunks; most shared are `eva` ×7, `īśa` ×5, `atra` ×5, `sam` ×5, `mahā` ×4.

Entry schema: `{id, kind: "WORD", targetIAST, targetDeva, gloss, difficulty, conceptTags[], allowedRules[], buildPaths: [{pathId, chunks[], steps: [{left, right, result, ruleId}]}]}`. Chunks are plain IAST strings, simpler than the PRD §9 schema. Samples: `devālaya = deva + ālaya`; `maharṣi = mahā + ṛṣi`; `tathaiva = tathā + eva`; `pitrājñā = pitṛ + ājñā`; `saṃskṛta = sam + skṛta`.

**`level_reference.json`.** Three deprecated levels (ids 013–015) with tiles, `moveBudget`, `expectedSolution`, `sourceTrace` and `review`. Words: devarṣi, ityuktam, kavīndra, tathaiva, pratyeka, mahauṣadhi, pavana (`po + ana`), gaṅgodaka.

**Meter seeds** (`targetPadas.ts:14-23`): ahiṃsā LGG, paramo LLG, dharmaḥ GG, satyaṃ GG, vada LL, nityam GG, śuddhaṃ GG, manaḥ LG. Weights are typed by hand.

### Tests

56 tests in nine files.

| File | Tests | Covers |
|---|---:|---|
| `rules.test.ts` | 4 | guṇa, rule filtering, vṛddhi before guṇa, yaṇ keeps the right vowel |
| `reducer.test.ts` | 9 | one merge per tile per move, horizontal reading order, vertical order and tie-break, duplicate-id repair, liveness |
| `ruleAudit.test.ts` | 3 | every rule has complete metadata; merge events carry audits |
| `targetEngine.test.ts` | 19 | 120-seed opening sweep, spawn provenance, last-cell completability, duplicate suppression, cleanup, deck cycle |
| `anustubhValidation`, `meterMerge` | 4 + 3 | the PRD §14.2 and §14.3 cases |
| `phonemes`, `persistence` | 2 + 3 | final virāma, `saṃskṛta`; corrupt and stale data, round-trip |
| `app.test.tsx` | 9 | title, script toggle on tiles, hint feedback, stuck-state restart |

Not covered: the shipped pack is never replayed in a test (PRD §14.4); no seeded simulation (§9.3); no metre scanner tests (§14.1, the scanner does not exist); no property tests; the validator script is not part of `deploy:check`.

### Strengths to preserve

- PRD-first process with numbered acceptance criteria that tests are written against.
- One rule engine shared by play, hints, spawn and the content validator, so content cannot claim a derivation the engine does not produce.
- Rule registry as data, a meta-test that fails on missing audit fields, and a per-merge audit trace with a `sourceVersion`.
- Content envelope with provenance and review status, honest `draft` defaults, and validator messages with JSONPath-style locations.
- Seeded RNG with its state persisted in the run; tests sweep seeds.
- A pure game core (`game/`, `targets/`) with no React or DOM imports.
- Devanagari-first with one script switch; grapheme-aware label sizing.
- Reduced-motion handling, optional d-pad, `aria-live` feedback, accessible tile labels.
- Versioned persistence that discards stale runs but keeps the best score.

### Bugs, gaps and Sanskrit-accuracy issues

Sanskrit:

1. **All five `AYAVA` targets are incorrect outputs.** `te + atra → tayatra`, `te + api → tayapi`, `hare + atra → harayatra`, `viṣṇo + atra → viṣṇavatra`, `bho + atra → bhavatra`. Word-final e/o before a short `a` takes pūrvarūpa (6.1.109): `te'tra`, `te'pi`, `hare'tra`, `viṣṇo'tra`; `bho` stays `bho atra`. Ayādi applies inside a word (`ne + ana → nayana`, `po + ana → pavana`, `nai + aka → nāyaka`, `pau + aka → pāvaka`). The root cause is that the engine has no pada-final versus word-internal context.
2. **Rule name.** "Ayāva / अयाव" is not the traditional term; use ayādi (अयादि).
3. **`ityuktam`** has `targetDeva` `इत्युक्तम` without virāma (pack index 30). My re-implementation of the validator logic flags this one entry and no others; the repo's own validator compares against `surfaceDeva` and should reject the pack.
4. **`ANUSVARA_M`** fires for m before any consonant in any context. The cited basis should be 8.3.23 (pada-final m). Parasavarṇa (8.4.58–59: saṅkalpa, sambandha) is not modelled, so targets are fixed to `saṃkalpa`, `saṃbandha`.
5. **`kṛṣṇaiva = kṛṣṇa + eva`** is true only for the vocative or stem; the nominative gives `kṛṣṇa eva`. Targets mix bare stems (`devālaya`), inflected words (`ityuktam`, `mamaiva`) and phrases with no marking.
6. **`mahā + auṣadhi`**: the usual analysis is `mahā + oṣadhi`; the output is the same. Needs a reviewer.
7. **Missing phonology:** `a + ḷ → al`; ṛ/ḷ as savarṇa; `ḹ`; avagraha; pragṛhya exceptions; the upasarga + ṛ vṛddhi (6.1.91); all visarga and consonant sandhi.
8. **UI label "Vyākarana"** (`App.tsx:594, 726`) should be `Vyākaraṇa`.
9. **`level_reference.json`** says `review.status: "expert approved"` with reviewer "Sanskrit Grammarian & Game Systems Designer", a persona and not a named person. Treat it as unreviewed.

Engine and product:

10. **Pādas 3 and 4 are unreachable.** `firstValidPadaIndex` (`anustubh.ts:36-41`) returns the first of 1..4 that validates, and 3 and 4 share templates with 1 and 2. Aggregated pādas are therefore only ever 1 or 2, hemistich B cannot form, and neither can a śloka. Only fixture tiles reach those states.
11. **Metre is not wired into the game.** `initialAnustubhBoard` is unused and target tiles carry no `meter`. The README's "Anuṣṭubh Endless foundation" is engine-only.
12. **Meter merge accepts any weight-valid order** and concatenates without sandhi or spaces, which contradicts "no pseudo-Sanskrit". A sandhi merge drops `meter`, and sandhi is tried first, so `paramo + ahiṃsā` would become `paramavahiṃsā`.
13. **No syllable-weight scanner**, although PRD §2.2 requires one.
14. **Streak is effectively dead.** `applyTargetCompletions` sets `streak: 0` on every move without a completion (`targetEngine.ts:128-134`).
15. **Chunk/target collision.** `abhyāsa` is both a target and a chunk of `yogābhyāsa`; a spawned chunk can complete the target for free.
16. PRD items not implemented: target repair or replacement (`hasReachableActiveTarget` is used only in tests), seeded pack simulation, sufficiency gates (the pack fails "≥ 20 per rule family" and "30% with alternative paths"), combo bonuses.
17. The validator ignores source trace, review, difficulty and the gates, and is not in CI.
18. No service worker. Fonts are named but not shipped (no `@font-face`), so Devanagari rendering depends on the device; with `font-synthesis: none` the 850–900 weights may not appear.
19. The viewport sets `user-scalable=no`, which blocks zoom.
20. Undo history is in memory only and unbounded, one full state clone per move.
21. `App.tsx` is an 898-line monolith with English strings inline; dead CSS remains for the removed level UI.
22. Version naming drift: file `…_prd_v3.md`, title v5, README v4.

### Porting notes

Lift into the shared library:

- `Phoneme` and the class sets; `parseSurfaceToPhonemes` and `surfaceDeva`, backed by a transliteration layer with NFC normalisation and round-trip tests; `graphemeClusters`.
- The boundary resolver, reshaped as a rule table with an explicit context argument (word-internal or pada-final).
- `RuleAuditSpec`, the registry and its meta-test, as the platform's rule-card format.
- `SeededRng`; the persistence envelope (schema version plus content version), namespaced per game.
- The pack envelope and the validator, as a shared CLI that runs in CI.
- `anustubh.ts`, after fixing pāda-index assignment and adding a scanner.

Shared UI kit: tokens, tile with length-based font steps, bottom sheet, stat chips, tray buttons, swipe resolver, input queue, reduced-motion hook, haptics, script setting.

Game-specific: `board.ts`, `targetEngine.ts`, the meter-merge tile kinds, scoring tables, hint bridge and edge pulse.

---

## 2. sanskrit-wordle — "शब्द"

### Purpose

Wordle with akṣaras as the letters. Six guesses; word length of 3, 4, 5 or 6 akṣaras chosen by buttons. Input is Roman typing through an IME, or an on-screen Devanagari keyboard.

### Stack

Express 4 serving `public/` (`src/server.js`, 20 lines, `Cache-Control: no-cache`). Vanilla ES modules, no build step, no tests, no linter, no licence file. `node_modules` is committed (616 of 629 tracked files). The `main` branch holds only an initial commit; all work is on `master` (three commits). Fonts from Google Fonts: Noto Serif Devanagari and Cinzel.

### Architecture map

| File | Lines | Responsibility |
|---|---:|---|
| `public/js/transliteration.js` | 173 | Akṣara model, Roman → Devanagari tables, lookup helpers |
| `public/js/ime.js` | 252 | Three-phase IME state machine |
| `public/js/game.js` | 84 | `scoreGuess`, game state factory |
| `public/js/words.js` | 129 | Word list, `wordsOfLength`, `availableLengths` |
| `public/js/keyboard-layout.js` | 70 | On-screen keyboard rows |
| `public/js/ui.js` | 206 | Board, reveal animation, keyboard hints, toast, modals |
| `public/js/main.js` | 152 | Wiring, length selector, physical keyboard |
| `public/css/style.css` | 303 | Dark "manuscript" theme |
| `public/index.html` | 121 | Shell and help modal |
| `sylsplit.py` | 10 | Scratch regex splitter, not used by the app |

### Core algorithms

**Akṣara model** (`transliteration.js:8-10`):

```js
export function syl(base, matra = "") { return { base, matra }; }
export function sylEqual(a, b) { return a.base === b.base && a.matra === b.matra; }
```

`base` is a Devanagari consonant, a conjunct string containing virāma (`"क्ष"`), or an independent vowel. `matra` is one vowel sign, or `""` for inherent a. There is no slot for anusvāra, visarga or a final consonant, apart from the special base `"म्"`.

**How akṣaras are split.** They are not split from text. Words are authored by hand as `syl()` arrays (`words.js:19-97`), and guesses are built akṣara by akṣara by the IME. `sylsplit.py` is the only splitter: a regex for IAST of the form `(consonants*)(vowel)(ṃ|ḥ)?`, which attaches the onset cluster to the following vowel. It is broken (see below).

**Scoring** (`game.js:9-36`). Whole-akṣara, standard two-pass Wordle: pass 1 marks exact `{base, matra}` matches as `correct` and removes them from both sides; pass 2 marks each remaining guess akṣara `present` if an unconsumed equal akṣara exists in the answer. There is no partial credit: `म` against `मा` is `absent`.

**Keyboard hints** (`ui.js:169-193`). These are per component, unlike the tiles: each guessed akṣara's `base` key and its vowel key are coloured `correct` if that component occurs at a correctly placed position, `present` if it occurs anywhere in the answer, else `absent`. Key state only upgrades (`ui.js:157-163`). Inherent a is skipped.

**IME** (`ime.js`). Phases `idle | cons | vowel` with buffers `_consBuf`, `_vowelBuf`, `_pendingBase`.

- A Roman key extends `_consBuf` while `CONSONANT_MAP` has an entry that matches or could still extend. When it cannot extend, the longest match becomes `_pendingBase` and the phase becomes `vowel`.
- Vowel keys extend `_vowelBuf` (`a → aa/ai/au`), committing when no longer extension exists.
- A non-vowel key in the vowel phase commits `{pendingBase, current matra or ""}` and restarts with that key (`ime.js:223-251`).
- `M` pushes a standalone `म्` tile.
- Backspace first unwinds pending state (`deletePending`), then pops a committed akṣara.
- `getPendingDisplay()` feeds a gold "pending" tile.

Roman scheme: `T Th D Dh N` retroflex; `sh → श`, `Sh → ष`, `S → श`; `c` and `ch` → `च`, `Ch`/`chh` → `छ`; `ng → ङ`, `ny`/`nj → ञ`; `aa/A`, `ii/I/ee`, `uu/U/oo`; `f → फ`, `w → व`. 69 hard-coded two- and three-letter conjuncts (`transliteration.js:18-94`).

**On-screen keyboard** (`keyboard-layout.js`). Four consonant rows (33 consonants plus `म्`), one row of 15 conjuncts (क्ष त्र ज्ञ श्र द्व द्र प्र ब्र ग्र स्त स्व व्य त्व न्त न्द), one row of ten vowels (अ आ इ ई उ ऊ ए ऐ ओ औ), then Enter and Del. Tap a consonant, then a vowel, to commit.

**Lengths.** `availableLengths()` derives the selector from the data; `createGame(len)` picks with `Math.random()`.

### Content: the word list

67 entries, `{letters: syl[], translit, meaning}`: 8 three-akṣara, 9 four, 43 five (13 with a conjunct first akṣara), 7 six. Authored by hand or by a model, with no cited source. I checked all 67.

**Acceptable (about 23):** kamala, gagana, nayana, vacana, racana, sadana, karaṇa, pavana; vyomatala, himālaya, nārāyaṇa, kamalaja, jaladhara, rāmāyaṇa; gaganatala, nayanajala, bhavanatala, jīvanamaya, and marginally kamalāvana; kamalanayana, pavanatanaya, madhuravacana, kamalalocana.

**Wrong or invented (about 44).** Most are real words with conjuncts or long vowels flattened to fit the tile model, or with a spurious final `-ma`:

| Entry | Intended | Entry | Intended |
|---|---|---|---|
| daraśana दरशन | darśana | kalapataru | kalpataru |
| amarata | amaratā / amṛta | amaratava | amaratva |
| vanamala | vanamālā | ratanakara | ratnākara |
| tapasavana | tapovana | nabhasatala | nabhastala |
| savaralaya | svarālaya | namasakara | namaskāra |
| bharatakhaṇa | bhāratakhaṇḍa | sarasavata | sārasvata |
| karuṇalaya | karuṇālaya | nīlakaṇaṭha | nīlakaṇṭha |
| vanadavata | vanadevatā | sudharamana | sudharman |
| tārāgaṇama | tārāgaṇam | mahāvanama | mahāvanam |
| dharatalama | dharātalam | surabhivanama | surabhivanam |
| nayanajalama | nayanajalam | jagatavandana | jagadvandana |
| svaragamana | svargagamana | jñānayogama | jñānayogam |

Also invented or meaningless: vanamālaka, ramaṇivana, madhurasara, vadanakaja, jagatamana, kamalajana, pavanatala, savitaraṇa, dīpakalama, kṣatarayama, kṣamavarata, trayanamava, trāṇamayana, jñatavarana, śradadhavana, prakāśamana, prāṇamayana, dvāramagana, stavanamaya, tvamaragana.

Verdict: do not reuse the list. Only the 3-akṣara set and about a dozen others survive.

### Strengths to preserve

- Small pure modules: scoring, IME and layout data are separable from the DOM.
- `{base, matra}` as the guess unit is the right granularity for players.
- Component-wise key hints sitting on top of whole-akṣara tile scoring.
- A live pending-akṣara preview, and backspace that unwinds inside the akṣara first.
- Word length as a data-derived setting.
- Defensive list validation that excludes bad entries without crashing (`words.js:100-129`).

### Bugs and gaps

1. Word list quality, as above.
2. **The tile model cannot express Sanskrit.** No ṛ/ṝ/ḷ vowel anywhere (`VOWEL_MAP`, keyboard), no anusvāra, no visarga, no final consonant except `म्`, and only table-listed conjuncts.
3. **The IME inserts an inherent `a` between consonants it cannot join.** Typing `dharma`: `rm` is not in the table, so `र` is committed with inherent a and `म` starts anew, giving ध र म. This is the mechanism behind the corrupted list.
4. `म्` as its own tile is not an akṣara.
5. No dictionary check on guesses; any sequence is accepted.
6. No daily or seeded word, persistence, statistics or share string.
7. No partial feedback for right consonant with wrong vowel, which makes 5–6 akṣara words very hard.
8. Player-facing strings are Hindi, not Sanskrit: "अक्षर चाहिए", "बहुत अच्छा", "वाह", "न जाने".
9. `sylsplit.py`: the consonant class omits `h`, so aspirates and `h` break the match (`dharma → ['a', 'rma']`); its sample ends in ASCII `H`, which `[ṃḥ]` does not match; final consonants are silently dropped.
10. Tile size is fixed per breakpoint (58px, or 48px under 400px) and is not derived from word length. The dark gold theme diverges from samskuru's parchment language.
11. Non-Sanskrit mappings: `ks → क्स`, `f`, `w`.
12. No tests, no licence, committed `node_modules`, a server that is unnecessary for a static app.

### Porting notes

Shared library:

- An akṣara segmenter for Devanagari and IAST that emits `{onset[], vowel, coda?}` with a canonical NFC string per akṣara. It replaces both `syl()` and `sylsplit.py`.
- A generalised IME: the same three-phase machine driven by shared transliteration tables, with arbitrary conjuncts, ṛ, ṃ and ḥ.
- The on-screen keyboard layout as data, with per-key state.
- A vetted lexicon with akṣara counts, so any game can ask for words of N akṣaras.

Game-specific: two-pass `scoreGuess` (extend it to return per-component feedback), the reveal, shake and bounce animations, the end modal.

---

## 3. Padaani — "पदानि"

### Purpose

Picture-first vocabulary flashcards in 12 themed lists. Marking cards known reveals a painting tile by tile, and paintings collect in a gallery. Vocabulary is from Samskrita Bharati's *Chitramayaḥ Padakośaḥ*.

### Stack

Next.js 16 App Router (in practice a single client-side screen switcher), React 19, TypeScript 5.7, Tailwind v4, shadcn with `@base-ui/react`, Framer Motion, `lucide-react`, Vercel Analytics. IndexedDB persistence. Fonts via `next/font/google`: Nunito Sans (UI), Gentium Plus (IAST), Noto Serif Devanagari. Scaffolded with v0. No tests. `next.config.mjs` sets `typescript.ignoreBuildErrors: true`. There is no manifest or service worker, despite the PWA goal.

### Architecture map

| File | Lines | Responsibility |
|---|---:|---|
| `docs/requirements.md` | 261 | Original spec (spaced repetition, Indra Sharma paintings) |
| `docs/CLAUDE.md` | 32 | Build rules for agents; overrides the spec to a three-state model |
| `docs/vocab.json` / `vocab.with-images.json` | 269 / 1188 | Vocabulary; the second adds `image` paths and is the wired source |
| `docs/card_images.py` | 165 | Gemini image generation and JSON wiring script |
| `docs/coded_card_fronts.md` | 67 | Spec for code-drawn colour, number and shape cards |
| `lib/vocab.ts` | 61 | JSON plus progress → `VocabList[]` |
| `lib/progress.ts` | 40 | Card state machine and validator |
| `lib/queue.ts` | 11 | Study queue |
| `lib/reveal.ts` | 23 | Tile grid chooser |
| `lib/db.ts` | 103 | IndexedDB store and upgrade resets |
| `lib/vocab-context.tsx` | 154 | Provider: grading, sessions, export/import, reset |
| `lib/mock-data.ts` | 159 | Types and painting metadata |
| `lib/nav.tsx`, `lib/motion.ts` | 25 / 35 | View union; easing presets |
| `components/screens/*` | 699 | home, lists, review, summary, reveal, gallery, detail |
| `components/reveal-grid.tsx` | 93 | Painting with a tile mask |
| `components/coded-card-front.tsx` | 127 | Colour swatches, numerals, SVG shapes |
| `components/app-shell.tsx`, `bottom-nav.tsx` | 84 / 57 | Screen switcher; three-tab nav |

### Core algorithms

**Progress model** (`progress.ts:4-26`). There is **no spaced repetition**. `requirements.md` specified SM-2-lite or FSRS, but commit `d2a4527` replaced it and `CLAUDE.md` forbids schedulers.

```ts
type CardState = 'unseen' | 'still-learning' | 'known'
type WordProgress = { wordId: string; listId: string; state: CardState; revealed: boolean }
// 'knew'     -> { state: 'known', revealed: true }
// 'learning' -> { state: 'still-learning' }   (revealed unchanged: sticky)
```

**Queue** (`queue.ts:9-11`). `mode: 'all'` gives every word in JSON order; `'still-learning'` gives the filtered subset. No shuffle and no in-session requeue. The session `{queue, index}` lives in the provider, keyed by list id, so leaving and returning resumes.

**Review flow** (`review-screen.tsx`). The front is an image or a coded front. A tap cross-fades (0.32 s) to the back: large Devanagari, IAST in italic Gentium, then the gloss. "I know it" and "Still learning" are always enabled, even before the flip. After grading: reveal screen if the list has just become fully revealed, summary if it was the last card, otherwise the next card.

**Reveal** (`reveal.ts`, `reveal-grid.tsx`). `computeTileGrid(total)` picks the factor pair with sides ≤ 8 closest to square, or `null`: 12 → 3×4, 15 → 3×5, 24 → 4×6, 17 → null. With a grid, the painting sits under frosted tiles and tile `i` is clear when `i < revealedCount`, in row-major order; the reveal is by count, not tied to a particular word. Without a grid, one overlay has opacity `1 − revealed/total`. `revealed` is sticky, so re-marking a card never re-hides a tile. The completion screen starts three tiles short and uncovers one every 900 ms. Gallery states: locked at 0 ("Hidden painting"), in progress, unlocked.

**Persistence** (`db.ts`). Database `padaani`, version 4, one store `wordProgress` keyed by `wordId`. **`wordId` is positional** (`${categoryId}-${index}`, `vocab.ts:30`), so any edit to a list invalidates stored progress. `LIST_RESETS = {3: 'clothing', 4: 'body'}` deletes those lists' records on upgrade. Export and import use `{app: 'padaani', version: 1, exportedAt, progress[]}`, validated per record.

### Content and data

Schema (`vocab.with-images.json`):

```json
{ "meta": { "source", "note", "categoryCount": 12, "wordCount": 180 },
  "categories": [ { "id", "nameEnglish", "nameSanskrit": { "devanagari", "iast" }, "sourcePages": [6],
    "words": [ { "devanagari", "iast", "english", "image": "/cards/people/devah.jpg" | null,
                 "numeral"?, "review"?: true, "reviewNote"? } ] } ] }
```

`meta.wordCount` says 180, but the file holds **164** (seven clothing and nine body words were removed later).

| id | English | Sanskrit | Words | Images |
|---|---|---|---:|---:|
| people | People & Beings | जनाः | 12 | 12 |
| occupations | Occupations | वृत्तयः | 12 | 12 |
| body | Body Parts | शरीरावयवाः | 15 | 15 |
| places | Places & Buildings | स्थानानि | 12 | 12 |
| plants | Plants & Trees | वृक्षाः | 12 | 12 |
| flowers | Flowers | पुष्पाणि | 12 | 12 |
| nature | Nature & Landscape | प्रकृतिः | 12 | 12 |
| clothing | Clothing | वस्त्राणि | 17 | 17 |
| devices | Devices & Electronics | उपकरणानि | 12 | 12 |
| shapes | Shapes & Geometry | आकृतयः | 12 | coded |
| colours | Colours | वर्णाः | 12 | coded |
| numbers | Numbers | सङ्ख्याः | 24 | coded |

Samples: `देवः devaḥ God`; `अहितुण्डिकः ahituṇḍikaḥ Snake-charmer`; `अस्थिपञ्जरम् asthipañjaram Skeleton`; `जङ्गमदूरवाणी jaṅgamadūravāṇī Mobile phone`; `एकोनविंशतिः / नवदश … Nineteen` with `numeral: १९`. Words are in the nominative singular with their visarga or `-m`, which is good for learners.

**Card images.** 116 JPEGs, 512×512, 4.5 MB, line-art style. `card_images.py` generates one image per word with a Gemini image model. The script describes PNG watercolour output while the committed files are JPG line drawings, so the committed set did not come from that script as written. The README says the book's "original illustrations … inspired this project". Whether the images are purely generated or derived from the book's pictures cannot be told from the repo.

**Paintings.** 12 files in `public/paintings/`, 25 MB. Metadata says `artist: 'Painting placeholder'`, but commit `39dbaf9` is titled "replace placeholder real paintings with real paintings". The one file I opened (`devices.png`, actually JPEG data) is a devotional calendar-art painting of Kṛṣṇa and Arjuna, not placeholder art. `CLAUDE.md` forbids fetching real Indra Sharma artwork, and `requirements.md` §6.3 says his work is in copyright into the 2070s. I did not open the other eleven.

**Licence.** No LICENSE file. The README offers the code "for learning and non-commercial use", which is not an open-source licence. The vocabulary is transcribed from a copyrighted book, with glosses that "follow the book exactly".

### Tests

None.

### Strengths to preserve

- Vocabulary as data with a single reader module; "never hardcode vocabulary" as a rule.
- Per-entry `review` and `reviewNote` uncertainty flags, and `sourcePages`.
- Typography discipline: Noto Serif Devanagari with Gentium Plus for IAST, and smoke-test strings for every diacritic and for conjuncts (`mock-data.ts:158-159`).
- Calm motion presets and `MotionConfig reducedMotion="user"`.
- Sticky, non-punitive reward; one tile per card.
- Coded card fronts for colours, numerals and shapes.
- Export and import of progress.

### Bugs, gaps and accuracy issues

1. No spaced repetition, no shuffle, no requeue. A comment in `vocab-context.tsx:15-19` mentions requeued cards that the code does not produce.
2. Grading is allowed without flipping the card.
3. Positional `wordId`; `meta.wordCount` is stale.
4. Glosses flagged by the transcriber: `मल्लिका` "Parijata flower" (conventionally jasmine); `धूसरः` Brown and `कपिशः` Grey (conventionally the reverse, and the swatch colours follow the book); `अष्ट` for eight (the note prefers अष्टौ); `पिञ्जः` and `कोणः` were uncertain reads.
5. Additional: `त्रिज्यम्` for radius (the standard word is त्रिज्या, feminine); `वक्ररेखा` glossed "Oblique line" (it means a curved line, and it is drawn curved).
6. Metadata spells "Saṃskṛitam" (should be Saṃskṛtam). `<html lang="en">` with no `lang="sa"` on Sanskrit text, although the spec asks for it.
7. Paintings and licence, as above. One 25 MB asset folder; an unused 1.3 MB `public/words/water.png`.
8. Type errors ignored at build; lint script with no ESLint dependency; both `package-lock.json` and `pnpm-lock.yaml`.
9. The 17-word list falls back to the gradient reveal, so the reward mechanic is inconsistent.

### Porting notes

Shared library: the vocabulary schema (give each word a stable id; rename `english` to `gloss`; add gender, `source` and `licence`); a progress store interface over IndexedDB with export and import; `computeTileGrid`; the motion presets; the font stack and smoke-test strings as a design-system test.

Shared UI kit: the flip card, `RevealGrid`, list progress bar, three-tab bottom nav, coded-front components.

Game-specific: the review, summary and gallery screens. If scheduling is wanted, write a Leitner or FSRS module from the original spec; there is none to port.

---

## 4. rea — agent-friendly repository practice

### Purpose and scale

A local reverse-engineering toolkit exposed as a CLI and an MCP server. TypeScript, MIT, about 4,100 source files under `src/` and about 3,360 test files. Relevant here only as a model of how a large repo is made safe for coding agents. Its domain rules do not transfer.

### Stack and tooling

Node pinned by `.nvmrc`; npm with a lockfile; Turborepo for cached task graphs; oxlint and oxfmt; knip; jscpd; Vitest with named projects; Stryker mutation testing; husky with lint-staged; release-please with Conventional Commits; VitePress docs; CodeQL; dependabot; CODEOWNERS on workflows and package manifests.

### `AGENTS.md` structure (150 lines)

1. **Product and Authority** — what the product is, hard boundaries, when a maintainer decision is needed before building.
2. **Architecture and Cleanup** — dependency direction; one owner per interpretation; fix at the producing boundary; remove superseded code in the same change; search sibling code for the same bug; no speculative complexity without the user's agreement.
3. **Performance** — a priority order and when to measure.
4. **Development** — where specs and ADRs live, pinned toolchain, six commands, which outputs are generated and must not be committed.
5. **Tool and Test Changes** — pointers to the owning guides; the preferred order of test evidence.
6. **Issue Reports** — separate observed, derived and hypothesised; never claim an unrun reproduction; write `NOT_ENOUGH_INFO` for gaps.
7. **Pull Request Readiness** — a human owns the diff; agents leave the readiness boxes unchecked; report only checks that ran.

It is short, links to one owning document per topic, and states prohibitions concretely.

### Required checks

| Stage | Command | Contents |
|---|---|---|
| pre-commit | lint-staged | `oxlint --fix` and `oxfmt` on staged files |
| pre-push | `check:fast` | cached typecheck and lint |
| inner loop | `test:focused -- PATH`, `test:local -- PATH`, `test:changed` | exact tests; tests affected since the merge base |
| before review | `check` | typecheck, lint, format check, knip, metadata check, architecture guards |
| CI fast | `check:ci:fast` | typecheck, lint, format |
| CI deep | `check:ci:deep` | knip, metadata, **jscpd**, **scan:todos**, architecture guards, **test discovery** |
| PR gates | `pr-title.yml`, `pr-readiness.yml` | Conventional title regex; filled human-readiness declaration |
| Nightly | `mutation.yml` | Stryker sweep, reports uploaded |

Guard-rail configuration:

- **knip** (`knip.json`): explicit entry list; every category is an error (unused files, dependencies, unlisted dependencies, exports, types, enum members, duplicates). A second `knip.production.json` checks reachability from production entries only.
- **jscpd** (`.jscpd.json`): threshold 4% duplication, minimum 5 lines and 50 tokens, over `src/` and `tests/`, fixtures ignored.
- **oxlint** (`.oxlintrc.json`): complexity 20, max depth 4, max 500 lines per file, max 100 lines per function (150 in tests), max 4 parameters; `no-floating-promises` and `switch-exhaustiveness-check` as errors; `reportUnusedDisableDirectives: error`; `no-focused-tests` as an error; **`no-restricted-imports` overrides that encode layer rules per test folder**; six **repo-specific lint rules** loaded from `scripts/lint/`.
- **scan-todos**: any `TODO`, `FIXME` or `HACK` in source fails the check.
- **verify-module-boundaries** and **architecture-guards**: scripts that fail on forbidden import directions and patterns.
- **verify-test-discovery**: compares Vitest's discovered files with git-tracked test files, so no test is silently orphaned.
- **Coverage thresholds** (`vitest.config.ts`): global 65/60/60/68, raised to 80/75/75/80 for `src/domain/**` and 85/80/80/85 for `src/contracts/**`.

### Test taxonomy

`scripts/lib/test-projects.mjs` is the single owner of which Vitest project a test file belongs to; `projectForTest` throws if a path has zero or more than one owner.

| Depth | Location | Proves |
|---|---|---|
| Module (domain, services, adapters) | `src/**/*.test.ts` | One unit through its narrow public surface; no I/O |
| Composition | `tests/composition/**` | Wiring without crossing process or network boundaries |
| Boundary | `tests/boundary/**` | Exactly one real boundary |
| Acceptance | `tests/acceptance/**` | A compiled product journey |
| Conformance | `tests/conformance/**` | A shared contract across all providers |
| Evaluation | `tests/evaluation/**` | Deterministic scoring logic |

Each project has an explicit pool and isolation policy with a comment giving the reason. Fixtures shared by one family sit beside their owner as `*.fixture.ts`.

Test-design rules (`docs/development/testing.md`): prefer real workflows over mirrors of the implementation; assert structured facts, not prose; keep an accepted case beside each rejected case, so a stricter parser cannot pass by refusing both; guard against vacuous passes such as `every` on an empty list.

### How tasks are specified

`docs/specs/<domain>/<feature-slug>/` holds `spec.md` (outcome, requirements, acceptance, non-goals), `plan.md` (the one implementation plan) and `tasks.md` (a checklist of small testable steps), often with `verification.md` (dated evidence). Slugs, not global numbers, so branches do not race. Decisions go in `docs/adr/<domain>/<slug>.md` with Status, Context, Decision, Consequences. The spec is written before implementation. `docs/README.md` is a directory, and a table maps each document type to one destination.

### Mutation testing

Not repo-wide. Two Stryker configs mutate **named ranges** (a method, a guard expression, a declaration) selected by a helper, `mutationRanges(file, [{kind, owner, name}])`. It uses the Vitest runner with per-test coverage and a TypeScript checker, `thresholds.break: null` (report, do not fail), concurrency 2, HTML and JSON reports, on a nightly schedule and on demand.

### Other conventions

- A PR template with sections for problem, scope, contract impact, evidence, validation performed ("list only commands that actually ran, with observed results"), author readiness and a before-merge checklist. Issue forms for bug, feature, design discussion and documentation.
- Generated files are either git-ignored and rebuilt in CI, or tracked and checked for freshness with `--check`.
- Repo-local agent skills under `.agents/skills/<name>/SKILL.md` for recurring procedures.

### Worth adapting for Samskuru

The adoption list is in section 7 (3). How the main items map onto a multi-game platform:

- **Authority section of `AGENTS.md`:** name what an agent must never invent: Sanskrit forms, sūtra numbers, glosses, reviewer approvals, licences.
- **Ownership:** only the shared library parses, transliterates, segments or applies sandhi. Games may import the SDK; the SDK never imports a game; games never import each other. Enforce with `no-restricted-imports` and a boundary script.
- **Test taxonomy:** library unit and property tests; per-game engine tests; per-game UI smoke tests; a *content conformance* project (every pack validated by the production engine); a *game-contract conformance* project (every game module satisfies the SDK manifest).
- **Mutation testing:** target the sandhi resolver, akṣara segmenter, transliteration and metre scanner. They are small pure functions where a surviving mutant means a missing linguistic test.
- **Lint limits:** file and function size caps would have prevented an 898-line `App.tsx`.

Skip or scale down: Turborepo and command locks until build times demand them; the real-provider lanes; release-please until there is something to release; everything specific to rea's product scope.

---

## 5. Deployed prototypes

Only extracted page text and metadata were retrievable. No gameplay screen or bundle was seen, so nothing below describes interaction detail or content accuracy.

### sandhi-ninja.vercel.app

- **Concept.** "Sandhi Ninja | Sanskrit Sandhi Practice Game". The metadata names three modes (splitting, joining, "Ninja Slice") and a "sandhi analyzer".
- **Content claims.** Svara, vyañjana and visarga sandhi with Pāṇinian sūtras, and explanations in English, Sanskrit and Telugu. That is broader than samskuru's six rules.
- **Technical.** Without JavaScript the page shows a heading, one paragraph and an "enable JavaScript" notice. Indexable, with Open Graph tags and a one-URL sitemap. Theme colour `#081522` (dark navy).
- **Visible problems.** The dark theme diverges from the parchment language. The description speaks of splitting and joining "compounds", which conflates sandhi with samāsa. Nothing about sources or review is visible. Rule coverage, sūtra data and the analyzer could not be assessed; if the source can be obtained, it is probably the most valuable input for the shared sandhi module.

### samskrita-sandhanam.vercel.app

- **Concept.** "Saṃskṛta Sandhānam (संस्कृतसन्धानम्) — Daily Word Connections": a daily five-minute puzzle of grouping related words, in the manner of NYT Connections.
- **Structure.** Hub (`/`), Play (`/sandhanam`), Leaderboard (`/leaderboard`), and a global Devanagari/IAST toggle.
- **Content.** The teaser shows गन्तव्यम् gantavyam, गतम् gatam, सूर्यः sūryaḥ, रविः raviḥ with "connect related words", implying groupings by root and by synonymy. Stated themes: vocabulary, literature, culture, dhātus, sandhi, samāsa. Aimed at near-beginners.
- **Leaderboard.** Streak rankings (a missed day resets) and total solved. Anonymous statistics stay local until the player upgrades to a Google-linked profile. It claims real-time updates, which implies a hosted backend.
- **Technical.** Next.js. The play and leaderboard routes serve only loading placeholders, so puzzle data is fetched on the client.
- **Visible problems.** No offline play and nothing to audit statically. A backend and Google identity are a privacy and operations cost that a static PWA would have to redesign (local streaks first, optional sync). No Open Graph tags. English copy uses "Saṃskṛtaṃ" with a final anusvāra mid-sentence. "Google Scholar profile" as the name for a signed-in player is confusing. Grid size, group count, mistake allowance and content quality could not be seen.

### samskuru.vercel.app

The served head matches `refs/samskuru/index.html` exactly (title "संस्कुरु · Sandhi 2048", `noindex`, same Open Graph tags), so this is the deployed alpha of section 1. The body is client-rendered and nothing further was retrievable.

---

## 6. sarpaksara — "सर्पाक्षर" (arrived mid-run)

### Purpose and stack

A single-player snake in a bounded arena. Food pellets are akṣara chunks; the player must eat the chunks of the current word in order, word by word through the four pādas of Bhagavad Gītā 2.47. Plain HTML, CSS and one canvas script, with no build, tests or dependencies. The PRD asks for React and TypeScript; the prototype is vanilla JS.

| File | Lines | Responsibility |
|---|---:|---|
| `samskritam_slither_io_mvp_prd.md` | 684 | PRD v2 "Śloka Builder", modelled on the samskuru PRD |
| `game.js` | 736 | Content, state, loop, spawn, collisions, HUD, canvas drawing, input |
| `index.html` | 118 | HUD: verse strip, target card, chips, pāda meter, dialog |
| `styles.css` | 625 | The same token set as samskuru |

### Mechanics (`game.js`)

- **Content model** (`3-34, 109-148`): `shloka(id, source, meaning, padas[][])`; `verseWord(id, deva, iast, gloss, difficulty, chunks[[deva, iast]])`. Each word carries `sourceTrace` and `review: {status: "draft"}`.
- **Food** (`253-290`): at least two "needed" pellets for the expected chunk, topped up to 11 with random distractors from the verse's other chunks, placed by rejection sampling.
- **Movement** (`314-323`): heading follows the pointer or arrow/WASD keys. Speed 124 px/s, +2 per completed word to a cap of 196; 182 boosting; 102 during a penalty.
- **Collection** (`325-365`): swept-segment hit test between the previous and current head positions. Correct: `+10·difficulty`, advance, grow by 5. Wrong with a shield: consume it. Wrong otherwise: −5, streak reset, 900 ms slow, **roll back one chunk**.
- **Word complete** (`367-405`): `+50·difficulty + 20·streak`. At a pāda end: +150, a one-mistake shield, a shorter tail and a **durable checkpoint**. At the śloka end: +500, then loop.
- **Death**: wall or self-collision. Restart resumes from the checkpoint pāda (`177-181`).
- **Persistence and access**: `samskritam-slither:v2` holds high score, script mode, checkpoint and lifetime ślokas; an `aria-live` status announces target and next chunk; script toggle and pause.

### Accuracy and gaps

- The padapāṭha is correct: karmaṇi eva adhikāraḥ te / mā phaleṣu kadācana / mā karmaphalahetuḥ bhūḥ / mā te saṅgaḥ astu akarmaṇi. The source note honestly says the continuous verse applies sandhi.
- **Chunking is inconsistent.** `karmaṇi → क · र्म · णि` is orthographic akṣaras, but `akarmaṇi → अ · कर्म · णि` and `karmaphalahetuḥ → कर्म · फल · हे · तुः` use multi-akṣara chunks, and `saṅgaḥ → सङ् · गः` is a phonetic syllable split where the orthographic one is `स · ङ्गः`. These are typed by hand; a shared segmenter would fix them.
- Distractors come only from the same verse (25 distinct chunks), so difficulty is shallow.
- Only one verse, `Math.random()` throughout, canvas text depends on unshipped fonts, no tests.

### Porting notes

Shared: the śloka / pāda / word / chunk schema with source trace and review, which aligns with the samskuru pack envelope; the checkpoint idea. Chunks should come from the shared akṣara segmenter and be checked by a content validator. Game-specific: the canvas loop, steering, swept collision, food spawner.

---

## 7. Consolidated lists

### (1) Reusable Sanskrit-library pieces

| Piece | Source | State |
|---|---|---|
| Phoneme inventory and vowel classes | samskuru `phonemes.ts` | Usable; add ḹ, avagraha, NFC |
| IAST → phonemes; phonemes → Devanagari | samskuru `phonemes.ts:115-172` | Usable for clean IAST; needs the reverse direction and round-trip tests |
| Vowel sandhi resolver (dīrgha, guṇa, vṛddhi, yaṇ, ayādi) | samskuru `rules.ts:37-70` | Correct word-internally; needs a pada-final context, pūrvarūpa, pragṛhya, ḷ |
| m → anusvāra | samskuru | Needs correct scope and parasavarṇa |
| Rule registry with audit metadata, plus meta-test | samskuru `ruleAudit.ts` | Lift as is; rename AYAVA |
| Pathyā anuṣṭubh templates and prefix validation | samskuru `anustubh.ts` | Usable after the pāda-index fix; a scanner must be written |
| Akṣara guess unit `{base, matra}` | wordle | Concept only; redesign with coda and conjunct support |
| Roman IME state machine | wordle `ime.js` | Reuse the design; drive it from shared tables |
| Akṣara segmentation | wordle `sylsplit.py`, sarpaksara hand chunks | Neither is usable; write new |
| Content schemas | samskuru pack, Padaani vocab, sarpaksara verse | Merge into one envelope: ids, IAST and Devanagari, gloss, provenance, review status, licence |
| Build-path validator | samskuru `scripts/` | Lift; generalise to "content validated by the production engine" |
| Seeded RNG | samskuru `rng.ts` | Lift as is |

Not available in any repo: visarga and consonant sandhi, a metre scanner, a lexicon, morphology, sandhi splitting. Sandhi Ninja's source may contain some of this.

### (2) Reusable UI patterns and visual language

- **Tokens** (samskuru `globals.css:1-27`; identical in sarpaksara): saffron `#F57C00 / #E86F00 / #D35400`; turmeric `#FFC857 / #F9B233`; parchment `#FFF9EC / #FFF3D6`; ivory `#FFFCF5`; brown `#2B1A0E / #4A2E1A / #6F4E37`; tulsi `#2E7D32`; vermilion `#C62828`; sand `#E8D8B8 / #D7BE8C`. Tile depth ramp `#fff4d7 → #f6c06d`.
- **Type**: Noto Serif Devanagari for Sanskrit; Inter or Noto Sans for UI; Gentium Plus for IAST (Padaani). Ship the fonts; only Padaani and wordle load them. Devanagari line-height about 1.32 with slight vertical padding to avoid clipping.
- **Shape and spacing**: radii 14–22px; soft brown shadows; a `100dvh` grid shell with safe-area padding; 520px column on desktop; board size `min(92vw, 47dvh, 400px)`.
- **Components**: two-script title lockup; target chips; stat chips; four-button tray; tabbed bottom sheet (Log, Mechanics, Vyākaraṇa, Settings); `aria-live` feedback strip; rule cards; flip card; tile-reveal reward; progress bar; three-tab nav; milestone banner; Wordle tile and key states.
- **Motion**: 110 ms slide and 90 ms pop for arcade games; 0.32–0.55 s easing `[0.22, 0.61, 0.36, 1]` for study games; reduced motion honoured.
- **Settings shared by all games**: script, haptics, on-screen direction controls.
- **To decide**: one theme. samskuru and sarpaksara are light parchment, wordle and Sandhi Ninja are dark, Padaani is sage and clay. Parchment with a per-game accent is the natural default.

### (3) Agent-contribution practices to adopt from rea

1. A short `AGENTS.md` that links to one owning document per topic and states hard prohibitions.
2. `docs/specs/<domain>/<slug>/{spec,plan,tasks}.md` before code; ADRs for platform decisions.
3. A single owner for each interpretation, enforced by restricted-import lint rules and a boundary script.
4. A fast inner loop (`test:focused`, `check:fast`) and a full gate (`check`), with husky pre-commit and pre-push.
5. knip, jscpd, TODO scanner, test-discovery check, unused-disable-directive errors, complexity and file-size limits.
6. A path-owned test taxonomy including content conformance and game-contract conformance projects.
7. Tiered coverage thresholds, highest on the Sanskrit library.
8. Nightly targeted mutation testing on the linguistic core.
9. Conventional Commit PR titles; a PR template with "validation performed" and a human readiness declaration that agents leave blank.
10. Evidence language: separate observed from derived from assumed; never report an unrun check; mark unknowns as unknown.
11. Test-design rules: an accepted case beside each rejected case; no vacuous assertions; assert structured facts.
12. Generated artefacts are either ignored and rebuilt, or tracked with a freshness check.

Add one rule rea does not need: review status on Sanskrit content may only be set by a named human reviewer, and CI rejects `expert_approved` without one.

### (4) Content assets, provenance and licence

| Asset | Size | Provenance | Licence status | Recommendation |
|---|---|---|---|---|
| samskuru starter pack | 50 targets | Model-drafted (`codex-ai-assisted-draft`), `synthetic`, unreviewed | Owner's own | Reuse 45 after review; drop or rewrite the 5 AYAVA entries; fix `ityuktam` |
| samskuru level reference | 3 levels | Model-drafted; "expert approved" is unverified | Owner's own | Mine the words (kavīndra, gaṅgodaka, pavana); ignore the review field |
| samskuru meter seeds | 8 words | Hand-weighted | Owner's own | Reuse as scanner test fixtures |
| wordle word list | 67 words | Uncited, mostly malformed | Owner's own | Discard; rebuild from a vetted lexicon |
| Padaani vocabulary | 164 words, 12 lists | Transcribed from *Chitramayaḥ Padakośaḥ* (Samskrita Bharati), glosses verbatim | Third-party copyright; code "non-commercial" with no licence file | Seek permission from Samskrita Bharati before shipping; re-proof flagged entries |
| Padaani card images | 116 JPEGs | Model-generated per script; possible derivation from book art unresolved | Unclear | Do not reuse until provenance is confirmed; regenerate or commission |
| Padaani paintings | 12 files, 25 MB | Real devotional artwork labelled "placeholder" (one file inspected) | Very likely in copyright | Do not reuse |
| sarpaksara verse pack | 1 verse, 15 word slots | Bhagavad Gītā 2.47 (public-domain text); glosses and chunking by the author, `draft` | Text public domain | Reuse after regenerating chunks with the shared segmenter |
| Sandhi Ninja sūtra data and explanations | Unknown | Not retrievable | Unknown | Obtain the source |
| Saṃskṛta Sandhānam puzzles | Unknown | Served from a backend | Unknown | Obtain an export |
