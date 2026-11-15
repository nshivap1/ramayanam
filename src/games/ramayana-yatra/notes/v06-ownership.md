# v0.6: who edits what (WP0 groundwork, 14 Nov)

Plan: [v06-plan.md](v06-plan.md) (§0 rules, §1 WP0, §2 packages). WP0's APIs, commands and examples:
[v06-wp0.md](v06-wp0.md). Same model as v0.5b ([v05b-ownership.md](v05b-ownership.md)): **edit only your own files**
(below). If you need a change in a file you do not own, write it in your `notes/v06-<a|b|c|d>.md` under "Requests" and
tell the orchestrator; do not edit it yourself.

## 1. Rules for every package (plan §0, enforced by tests)
- **Kathā only.** A set piece is `{ "if": "style.katha", "then": [new commands], "else": [today's commands] }`. The
  practice journey must not change: `logic.test.ts` → "v0.5b guard" (`V05A_PRACTICE`) and `V03_SNAPSHOT` stay green.
  Quick check: `node --import tsx --test --test-name-pattern="v0.5b guard" src/games/ramayana-yatra/logic.test.ts`.
- **v0.6 verses are Kathā-only content.** Every verse in `shlokas-3/4/5.json` has `"kathaOnly": true`; entries and
  forms of `lexicon-3/4/5.json` and names of `names-3/4/5/6.json` are Kathā-only too. The practice game never sees
  them (logic-journey `journeyContent`; `v06-hooks.test` proves the practice hashes are unchanged with v0.6 content).
- **Pacing (§0.2).** New verses are **heard** (`{ "shloka": id }` = mode hear, or a verse step of a told cutscene).
  They are **not restorable** (no shrine recital; the verse book and book screens count "restored" against the v0.5
  verses only). No new gates, astras or required recitations; at most one optional `{ "smarana" }` per book on a new
  verse. Kit commands, hotspots and cutscenes never block progress and cannot fail.
- **Kathā-only commands** — world.test refuses them outside a Kathā block: `smarana`, `book`, `setu` (v0.5b) and the
  v0.6 `fx`, `topple`, `rise`, `grow`, `glow`, `prop`, `arrow`, `hotspot`, `cutscene`, `echo`.
- **Sanskrit:** never invent; Level 1–3, ≤ ~10 words a sentence, glossary of notes/sa-ui.md; every line passes the
  oracle (`sambhashana.test`, `sa-ui.test`). Numbers as Devanagari digits. Two model reviews go into REVIEW.md at
  integration.
- **Tests:** your own unit test file(s) and your `e2e-v06-<x>.spec.ts`; the whole unit suite stays green on your files.

## 2. Package files (only this package edits them)
Every package also owns: `notes/v06-<x>.md`, `e2e-v06-<x>.spec.ts` (`V06_<X>`, registered in e2e.spec.ts), its own new
unit test file(s) (e.g. `v06-<x>.test.ts`), `cutscene-paint-<x>.ts` (2D painters), `art-v06-<x>.ts` (new sprites and
props, registered in the catalog), and its own section of `style.css` (between `v0.6 WP-<X> — begin / end`).

| WP | Content | Sanskrit | UI strings | Code |
|---|---|---|---|---|
| **A** (Bāla, Ayodhyā) | `shlokas-3`, `lexicon-3`, `katha-verses-3`, `names-3`, `REVIEW-v06-a.md`, `story-ch1.json`, `story-ch2.json` (and `story-common.json`), `cutscene-mithila.json` | `sa-dialogue-10.json` | `sa-ui-v06-a.json` (keys `v06a.*`) | `cutscene-paint-a.ts`, `art-v06-a.ts` |
| **B** (Araṇya, Kiṣkindhā) | `shlokas-4`, `lexicon-4`, `katha-verses-4`, `names-4`, `REVIEW-v06-b.md`, `story-ch3.json`, `story-ch4.json` | `sa-dialogue-11.json` | `sa-ui-v06-b.json` (`v06b.*`) | `cutscene-paint-b.ts`, `art-v06-b.ts` |
| **C** (Sundara, Yuddha) | `shlokas-5`, `lexicon-5`, `katha-verses-5`, `names-5`, `REVIEW-v06-c.md`, `story-ch5.json`, `story-ch6.json`, `katha-echoes.json`, `cutscene-kumbhakarna.json` (optional) | `sa-dialogue-12.json` | `sa-ui-v06-c.json` (`v06c.*`) | `cutscene-paint-c.ts`, `art-v06-c.ts` |
| **D** (the herbs mountain) | `cutscene-herbs.json`, `names-6` | `sa-dialogue-13.json` | `sa-ui-v06-d.json` (`v06d.*`) | `cutscene3d-herbs.ts` (3D scene), `cutscene-paint-d.ts` (its 2D still), `art-v06-d.ts` |

Notes:
- **C removes Nala's "Rāma's name on every stone" line** (both journeys) and its Sanskrit entry: C may delete that one
  entry from whichever frozen file holds it (sa-dialogue-3/5/9); nothing else in files 1–9.
- **C places `{ "cutscene": "herbs" }`** in story-ch6 (D's scene). D tests its scene through `window.__ryScript`.
- **D and cutscene3d.ts:** D may add *exports* to cutscene3d.ts (helpers it wants to reuse: the shader kit, sprite
  billboards) without changing what the Āditya scene draws; cutscene.test and the V05B_E browser tests must stay green.
  Everything else of D's 3D scene lives in `cutscene3d-herbs.ts`.
- The phase-1 content files (`shlokas-*`, `lexicon-*`, `katha-verses-*`, `names-*`) may be written before WP0 lands:
  WP0 created empty stubs; overwrite them.
- **Review items of your verses** go in your `REVIEW-v06-<x>.md` (content.test / learning.test read it with REVIEW.md):
  a sign-off row per verse, `- **<id>**: …` for a `variant` word, and `- \`id\`: reason` under "## Single-source items" /
  "## Sandhi-engine exceptions" — those entries also join content.test's allowlists for your (v0.6) verses, so you never
  edit content.test.ts. The integration folds the files into REVIEW.md.
- **content/reader.json** is derived from every lexicon file: after a lexicon change any package may regenerate it
  (`RY_WRITE_READER=1 node --import tsx --test --test-name-pattern="basic words" src/games/ramayana-yatra/reader.test.ts`).

## 3. Shared files (WP0 / orchestrator; packages request changes)
`types.ts`, `content.ts`, `sa-verify.ts`, `logic*.ts` (except none), `Game.tsx`, `view-panel.tsx`, `view-screen.tsx`,
`view-menu.tsx`, `view-bookend.tsx`, `view-katha.tsx`, `view-told.tsx`, `view-stage.ts`, `view-cutscene.tsx`,
`cutscene3d.ts` (D: exports only, above), `cutscene3d-scenes.ts`, `cutscene-paint.ts`, `catalog.ts`, `art.ts`,
`art-sprites.ts`, `e2e.spec.ts`, `e2e-kit.spec.ts`, `e2e-v06-wp0.spec.ts`, every existing `*.test.ts`,
`v06-hooks.test.ts`, `sa-dialogue-1…9.json` (frozen, see §4), `sa-ui-common/-a/-b/-katha/-scene/-setu/-chain.json`,
`sa-ui-v06.json`, `defs.json`, `katha.json`, `katha-chain.json`, `aditya-hridayam.json`, `names.json`, `shlokas-1/2`,
`lexicon-1/2`, `PRD.md`, `REVIEW.md`, `notes/katha.md`. (Integration updates PRD, katha.md and REVIEW from your notes.)

## 4. Adding strings
- **Story lines** (English in your story / cutscene file, inside Kathā blocks): run
  `RY_SA_LENIENT=1 node tools/test.mjs unit games/ramayana-yatra/sambhashana` — "no entry for story string" names the
  file. Rule (`collectStoryStrings`): a line that a file 5–9 held at v0.5.1 stays there (files 5–9 are frozen:
  `FILE5_V05A`, `FILES69_V051`; they may only lose entries); every new Kathā line goes to **10** (story-common, ch1–2,
  cutscene-mithila), **11** (ch3–4), **12** (ch5–6, cutscene-kumbhakarna, new moveText), **13** (cutscene-herbs). A
  told cutscene's `title`, `say`, `who` (free English), `ask` and option labels are story strings of its file. Add
  `{ "en": <exact English>, "sa": "…", "ctx": <the ctx printed> }` to your file only. New speaker titles used only in
  Kathā go to your file with `"label": true`.
- **Interface strings:** your `sa-ui-v06-<x>.json`, keys `v06<x>.…` (sa-ui.test enforces the prefix). Echo titles
  (C) are keys of sa-ui-v06-c.json.
- **Names:** your `names-<n>.json` (new ids only; a new sprite id `<id>` needs `person.<id>`).

## 5. Adding tests
- Unit: your own `*.test.ts` (node:test). Bots: `runWalkthrough(REAL, seed, level, { style: 'katha', accuracy, policy,
  hidden })` (`hidden: true` also finds every hotspot), `runGuide(…)`.
- Browser: append `E2eCase`s to your `e2e-v06-<x>.spec.ts` (prefix names `v0.6 <X>:`); use `./e2e-kit.spec` and
  `window.__ryScript(cmds)` to open a set piece early. Run only yours:
  `node tools/build.mjs --outdir=.e2e/<x> --only=ramayana-yatra --no-sw` then
  `SAMSKURU_E2E=1 SAMSKURU_DIST=.e2e/<x> node --import tsx --test --test-concurrency=1 --test-name-pattern="v0.6 <X>" src/games/ramayana-yatra/e2e.spec.ts`.
- The gate: `node tools/check.mjs --e2e --game=ramayana-yatra`.
