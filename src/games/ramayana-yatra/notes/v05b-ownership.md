# v0.5b: who edits what (WP0 groundwork, 14 Nov)

Plan: [v05b-plan.md](v05b-plan.md). (The plan's `e2e-kit.ts` / `e2e-v05b-{a,b,c,d}.ts` are named `*.spec.ts`: the layering
contract lets only test / spec files import node:, playwright and the e2e harness. Only `e2e.spec.ts` is run; it
imports the others.) WP0 has landed: the rules of §0, the engine stubs P1–P7 of §1, the file split of
§6 and the WP0 acceptance tests of §7. Packages A–D now build in parallel. **Edit only your own files** (below). If you
need a change in a file you do not own, write it in your `notes/v05b-<a|b|c|d>.md` under "Requests" and tell the
orchestrator; do not edit it yourself.

## 1. Rules for every package (plan §0, enforced by tests)
- **Kathā only.** A set piece is `{ "if": "style.katha", "then": [new commands], "else": [today's commands] }`.
  The practice journey must not change: `logic.test.ts` → "v0.5b guard" hashes the practice story bot on the real
  content (seeds 1–3 × levels 2–4) and must stay `V05A_PRACTICE = '9c766bd8c21a0c909c7c0070'` (computed on v0.5a).
  Quick check: `node --import tsx --test --test-name-pattern="v0.5b guard" src/games/ramayana-yatra/logic.test.ts`.
- **Kathā-only walkthrough steps:** add `"style": "katha"` to a step that only the Kathā journey has. The pointer
  (`guideStep` / `guideTarget`), `runWalkthrough`, `runGuide`, quest progress and the e2e `next` skip it in the
  practice game (logic-katha `stepInJourney`). A practice save never needs its flag.
- `{smarana}`, `{book}`, `{setu}` must sit inside a Kathā block (world.test fails otherwise); an avoid-trigger's
  `requires` must include `style.katha`.
- **Sanskrit:** no new declension models (Kuśa, Lava: regular -a stems); numbers as Devanagari digits; every line
  passes the oracle (`sambhashana.test`, `sa-ui.test`, `sa-battle.test`). Never invent Sanskrit; reuse vocabulary
  that already verifies. Two model reviews go into `REVIEW.md` at integration.

## 2. The hooks WP0 laid down (call these; do not edit their files)
| Piece | What exists now | Owner fills in |
|---|---|---|
| **P1** `{ "smarana": id, "pada": n \| "least" }` | **Working.** logic-scene `startSceneRecital(state, content, cmd)`, `sceneAnswer(state, content, action)`, `leastPada(state, content, id)`, `scenePada`, `LEAST`. Pending `{ kind: 'challenge', context: 'scene', challenge }` (smarana, built by `buildSmarana` mode 'recital' + `story: true`: one gap below mastery, a mastered pāda recites itself). Graded and recorded like a shrine pāda; `state.lastSmarana.context === 'scene'`; no feedback pending; a hit or a miss continues the script. Practice / unknown verse → skipped. View: view-scene `SceneRecite` (RecitePanel; `data-testid="scene-recite"`). | A (may restyle / extend) |
| **P2** `{ "book": n }` | **Working.** logic-scene `startBookReview(state, content, n)`; pending `{ kind: 'book', kanda }`; `advance` continues (logic-events). View: view-scene `BookReview` → view-bookend `BookEnd` with `review` (inside the panel, canvas visible; `data-testid="book-review"`, button `book-continue`, A/Z/Enter; lines recited = this session's recitations of the book's verses). Expose `book`. | A (D may restyle BookEnd) |
| **P3** `TriggerDef.avoid` | **Working.** logic-world `avoidActive(t, mapId, flags)`, `inSight(map, flags, x, y)`, `avoidTriggers(map)`; `findPath` (logic-guide) never crosses an active one (not even as the goal); the e2e snapshot grid marks it `#`. Stepping on it runs its event as usual. | B (content, `world.test`-style lane checks in B's own test) |
| **P4** `playerSprite(save)` | **Working** (logic-sundara): 'hanuman' only in Kathā, book 5, flag `HANUMAN_FLAG` = `katha.hanuman`; else `player_a` / `player_b`. Expose `playerSprite`. **Not yet drawn**: view-screen.tsx still draws the avatar. | B (draw it in view-screen) |
| **P5** `{ "setu": tag }` | **Hooks + stub.** Types `SetuPending { kind: 'setu', tag, cols, turns, cells, solution, taps, hint }`. logic-setu `startSetu(state, content, tag)` (stub: skips, the script continues), `setuAction(state, content, action)` (stub: `advance` on a solved bridge continues), `setuSolved(p)`, `setuBotActions(p)` (bot: turn the first wrong stone, else advance). exec / resume hooks in logic-events; bot hook in logic-sim; expose `setu`; view-panel → view-setu `SetuPanel` (placeholder: `setu-cell-<i>`, `setu-advance`, keys 1–9, A). The e2e Bot solves a `setu` pending from `expose.setu.solution`. | D |
| **P6** `Challenge.kind 'antya'` | **Hooks + stubs.** Types `AntyaSpec` (`Challenge.antya`: key, prev, lines), `AntyaState` (`BattleState.antya`), `ChainContent` / `ChainDuel` (`content.chain` from content/katha-chain.json, empty). 'antya' is never drawn at random (logic-learning). logic-chain `chainDuel(content, foe)`, `isChainDuel(state, content, spec)` (working), `chainKey(line)`, `chainOptions(state, content, antya)`, `chainTurn(state, content, antya, pick)` (throw "not implemented" until C). The bot answers through `options`/`answers` (its reciter misses at `accuracy`); the e2e Bot through `opt-<id>`. view-panel → view-chain `ChainPanel` (placeholder: ChallengePanel). The battle hook (kathaDuelTurn / resolveTurn) is C's. | C |
| **P7** `tactics.phases` | **Types only.** `KathaTactics.phases?: KathaPhase[]` (`id, foe, chapter?, below, floor?, fit?, beat?, once?, source`), `BattleState.bossPhases?: string[]`. | C |
| e2e | `window.__ryScript(cmds)` (only with `?e2e=1`): runs an ad-hoc script from a calm moment, so a browser test reaches a panel before its story content exists. Snapshot adds `playerSprite`, `book`, `setu`; the grid marks avoid-triggers. | — |
| catalog | Tile `roof_fire` (walkable; placeholder art = lanka_roof). | B draws it |

Other WP0 changes packages may rely on: `stepInJourney(step, save)` / `journeySteps(content, save)` (logic-katha);
`guideStep(save: {flags, style})`; `runWalkthrough`'s `onStep(i)` / `failedAt` keep the index in the full walkthrough;
`storyProgress` counts the journey's steps; `SmaranaRequest.story`. WP0's tests: `v05b-hooks.test.ts` (unit: Kathā-only
steps in all four consumers, P1–P6 hooks), the "v0.5b guard" in `logic.test.ts`, the v0.5b validators in `world.test.ts`,
the file rule in `sambhashana.test.ts` / `sa-ui.test.ts`, and the browser test "v0.5b hooks (WP0)" in `e2e.spec.ts`
(a story recitation with a miss, then a book review, in संस्कृतम्, via `__ryScript`).

## 3. Package files (only this package edits them)
Every package also owns: its `notes/v05b-<x>.md`, its browser tests file `e2e-v05b-<x>.spec.ts`, its own new unit test
file(s), and its own section of `style.css` (between the `v0.5b WP-<X> — begin / end` markers at the end of the file).

### WP-A: scenes 1–4 (Krauñca, Guha's ferry, the golden deer, Jaṭāyu); P1, P2
- Content: `story-ch1.json`, `story-ch2.json`, `story-ch3.json` · Sanskrit: `sa-dialogue-6.json` · UI: `sa-ui-scene.json` (keys `scene.*`)
- Code: `logic-scene.ts`, `view-scene.tsx`
- Tests: `scene.test.ts` (new) · browser: `e2e-v05b-a.spec.ts` (`V05B_A`)
- Hooks: `buildSmarana`, `recordSmarana`, `RecitePanel`, `BookEnd` (`review`), `bookStats`, `stepInJourney`.

### WP-B: §3 playing as Hanumān; scenes 7–10 (the leap, Laṅkā by night, the Aśoka grove, Laṅkā ablaze); P3, P4
- Content: `story-ch5.json` · Sanskrit: `sa-dialogue-8.json`
- Code: `logic-guide.ts`, `logic-sundara.ts`, `view-screen.tsx`, `art-tiles.ts`
- Tests: `guide.test.ts`, `sundara.test.ts` (new) · browser: `e2e-v05b-b.spec.ts` (`V05B_B`)
- Hooks: `avoidActive` / `inSight` (logic-world), `findPath`, `playerSprite`, `HANUMAN_FLAG`, `BattleSpec.lead: 'hanuman'`
  (data only), `{ "smarana": … }` for the grove (P1, working). Battle templates and katha.json belong to C: ask C.

### WP-C: §4 the verse-chain duel; scenes 5, 6, 13 (Hanumān in disguise, Jāmbavān, Rāvaṇa); P6, P7
- Content: `story-ch4.json`, `katha.json`, `katha-chain.json`, `sa-battle.json` · Sanskrit: `sa-dialogue-7.json` (also
  every new `katha.json → moveText`) · UI: `sa-ui-chain.json` (keys `chain.*`)
- Code: `logic-chain.ts`, `logic-battle.ts`, `logic-tactics.ts`, `view-chain.tsx`
- Tests: `chain.test.ts` (new), `battle.test.ts`, `tactics.test.ts`, `sa-battle.test.ts`, `katha-content.test.ts` ·
  browser: `e2e-v05b-c.spec.ts` (`V05B_C`)
- Hooks: `content.chain`, `BattleState.antya` / `bossPhases`, `Challenge.antya`, `KathaTactics.phases`, `echoModel`-style
  model beats, `isChainDuel`.

### WP-D: scenes 11, 12, 14, 15 (Vibhīṣaṇa's council, Nala's bridge, the return, the Lava–Kuśa finale); P5
- Content: `story-ch6.json`, `names.json` (`person.kusha`, `person.lava`) · Sanskrit: `sa-dialogue-9.json` · UI:
  `sa-ui-setu.json` (keys `setu.*`)
- Code: `logic-setu.ts`, `view-setu.tsx`, `view-bookend.tsx`, `art-sprites.ts`; in `catalog.ts` only appending sprite
  ids to `SPRITE_IDS` (content.test then requires `person.<id>` in names.json)
- Tests: `setu.test.ts` (new), `bookend.test.ts` · browser: `e2e-v05b-d.spec.ts` (`V05B_D`)
- Hooks: P1 with `"least"` and P2 for the finale (working now), `SetuPending`, `setuBotActions`, `expose.setu`.

### Nobody edits during v0.5b (WP0 / orchestrator)
`types.ts`, `content.ts`, `sa-verify.ts`, `logic.ts`, `logic-events.ts`, `logic-sim.ts`, `logic-katha.ts`,
`logic-world.ts`, `logic-learning.ts`, `logic-state.ts`, `Game.tsx`, `view-panel.tsx`, `view-katha.tsx`, `catalog.ts`
(except D's sprite ids), `world.test.ts`, `logic.test.ts`, `sambhashana.test.ts`, `sa-ui.test.ts`, `v05b-hooks.test.ts`,
`e2e.spec.ts`, `e2e-kit.spec.ts`, `sa-dialogue-1…5.json`, `sa-ui-common/-a/-b/-katha.json`, `defs.json`, `story-common.json`,
`PRD.md`, `REVIEW.md`, `notes/katha.md`. (Integration updates PRD, katha.md and REVIEW from your notes.)

## 4. Adding strings
- **Story lines** (English in your story file, inside Kathā blocks): run
  `RY_SA_LENIENT=1 node tools/test.mjs unit games/ramayana-yatra/sambhashana` — "no entry for story string" names the
  file. Rule (`collectStoryStrings`): a line `sa-dialogue-5.json` held at v0.5a stays there (file 5 is frozen: it may only
  lose entries, `FILE5_V05A`); every new Kathā line goes to **6** (story-common, ch1–3), **7** (ch4, and new
  `katha.json` moveText), **8** (ch5), **9** (ch6). Add `{ "en": <exact English>, "sa": "…", "ctx": <the ctx printed> }`
  to your file only. A new speaker title (`who` in free English) used only inside Kathā blocks also goes to your file,
  with `"label": true`; titles file 4 already has stay there. Rules: notes/sambhashana.md. If you rewrite a Kathā line
  that file 5 holds, its old entry becomes stale: list it in your notes for the orchestrator to drop.
- **Interface strings**: your `sa-ui-<x>.json`, keys with your prefix (`scene.` / `setu.` / `chain.`; sa-ui.test enforces
  it), used with `ui.t('scene.…')`. Rules: notes/sa-ui.md.
- **Battle templates** (C only): `sa-battle.json`. **Names** (D only): `names.json`.

## 5. Adding tests
- Unit: your own `*.test.ts` (node:test; run `node tools/test.mjs unit games/ramayana-yatra/<name>`). Bots:
  `runWalkthrough(REAL, seed, level, { style: 'katha', accuracy, policy })`, `runGuide(…)`.
- Browser: append `E2eCase` entries (`{ name, skip?, timeout?, run: async ({ open }) => … }`) to your `e2e-v05b-<x>.spec.ts`;
  `e2e.spec.ts` registers them inside the game suite. Use `./e2e-kit.spec` (Bot, Snap, planAt, kathaFrom, `openWithSave(open,
  save, seed)`, reloadWith, continueToExplore, expectNoLatin, followPointer, guidePlaythrough …) and
  `window.__ryScript(cmds)` to open your panel early. Prefix test names with `v0.5b <X>:`.
  Run only the browser tests: `node tools/build.mjs --outdir=.e2e/mine --only=ramayana-yatra --no-sw` then
  `SAMSKURU_E2E=1 SAMSKURU_DIST=.e2e/mine node --import tsx --test --test-concurrency=1 --test-name-pattern="v0.5b <X>" src/games/ramayana-yatra/e2e.spec.ts`.
- The gate: `node tools/check.mjs --e2e --game=ramayana-yatra` (all of it must stay green).
