# Contributing to Samskuru

For people and for coding agents. If you are about to write code for a game, read
[AGENTS.md](AGENTS.md) first — it is the short version of everything here.

## Ways to contribute

| You want to … | Start here | You will touch |
|---|---|---|
| **Build a game** from the backlog | Pick a PRD from the index, [docs/prd/README.md](docs/prd/README.md), claim it (below), follow [AGENTS.md](AGENTS.md) | `src/games/<id>/` and your row of the index |
| **Propose a game** | Copy [docs/prd/TEMPLATE.md](docs/prd/TEMPLATE.md) to `docs/prd/backlog/NN-<id>.md` and add a row to the index ([how](docs/prd/README.md)) | one PRD file and the index — no code |
| **Add or fix content** (words, paradigms, verses) | [docs/SANSKRIT_ACCURACY.md](docs/SANSKRIT_ACCURACY.md#adding-or-changing-sanskrit-content) and the pack's own `README.md`; `npm run validate` must pass | one pack under `src/content/` |
| **Review Sanskrit** (humans only) | The pack's `REVIEW.md`, or a game PR that asks for it | sign-off tables, review comments |
| **Report a bug or a Sanskrit error** | [Reporting](#reporting-a-sanskrit-error-p0) | an issue |
| **Improve the platform** (SDK, UI kit, shell, tools, docs) | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), then [Changing shared code](AGENTS.md#changing-shared-code) | `src/sdk`, `src/ui`, `src/app`, `tools`, `tests`, `docs` |

## The PRD-first workflow

Every game goes through the same seven steps (they mirror the founding deck). Nothing is built
before step 4 is written down.

1. **Draft a PRD.** One page from [docs/prd/TEMPLATE.md](docs/prd/TEMPLATE.md): learning objective, core loop, Sanskrit rules, content, acceptance tests.
2. **Refine it.** Answer the open questions with a product owner and — for anything linguistic — a Sanskrit reviewer. Cut scope until it is one mechanic.
3. **Add it to the repo.** Merge the PRD as `docs/prd/backlog/NN-<id>.md` with status `proposed`, plus its row in [docs/prd/README.md](docs/prd/README.md) — a PR with no code. A PRD in the repo is an invitation: anyone may claim it.
4. **Plan: tests and MVP scope.** Turn *Acceptance tests* into a checklist where each line names the file it will live in (`logic.test.ts`, `e2e.spec.ts`). Decide the smallest version worth playing; everything else goes under *Out of scope / later*.
5. **Build.** `npm run new-game -- <id>` gives you a folder that already passes the gate. Write `logic.ts` with its tests first, then `Game.tsx`, then `e2e.spec.ts`. Copy the PRD into the folder as `PRD.md`.
6. **Iterate.** Play it on a phone-sized viewport (`node tools/screenshot.mjs "#/play/<id>?e2e=1" --game=<id>`), fix what feels wrong, update `PRD.md` when behaviour changes, keep the gate green.
7. **Deploy.** Open a pull request. When the gate, the code review and (if Sanskrit changed) the Sanskrit review pass, the game merges as `beta` and ships with the next build of `dist/`.

## Claiming a PRD

The index [docs/prd/README.md](docs/prd/README.md) lists every backlog PRD with its status, owner
and prerequisites, and holds the full protocol; sequencing and estimates are in [docs/prd/PLAN.md](docs/prd/PLAN.md). In short:

1. Choose a row whose **Status** is `proposed` and whose blocking prerequisites are met.
2. In one commit: set that row to `in-progress` with your name as **Owner** (agents: the handle of the person you work for, and say so in the PR), set the PRD's own Status line to `in-progress (@you)`, run `npm run new-game -- <id>`, and copy the backlog PRD to `src/games/<id>/PRD.md`. Push that commit before anything else — the row is the lock, and the first push wins.
3. Build. Keep `src/games/<id>/PRD.md` true to what you built; note departures from the backlog PRD under *Open questions*.
4. When the isolated gate passes, set the status to `built vX.Y.Z` in the index and in the game's PRD. The backlog file stays as the record of the proposal.
5. If you stop, set the row back to `proposed` (or `closed`, with one line of why) so someone else can decide.

A claim with no pushed work for two weeks may be taken over; leave a comment first.

## Branches, commits, pull requests

- **One game per pull request.** A game PR changes `src/games/<id>/` (or `labs/<id>/`) and its status row in the PRD index — nothing else. If you need something new from the platform, that is a separate `platform:` commit — ideally a separate PR — with its own tests, and it must be useful to at least two games.
- **Branches:** `game/<id>`, `content/<pack>`, `platform/<topic>`, `docs/<topic>`.
- **Commit and PR titles** use these prefixes:

  | Prefix | For |
  |---|---|
  | `game(<id>):` | anything inside one game folder — `game(smrti-yugala): add vocabulary deck` |
  | `content(<pack>):` | a content pack and its tests — `content(shabda): add ī-stem feminines` |
  | `platform:` | `src/sdk`, `src/ui`, `src/app`, `src/sanskrit`, `tools`, `tests` |
  | `docs:` | documentation only |

- **The gate** must pass before you ask for review, and you report only what you actually ran:

  ```bash
  npm run check -- --e2e --game=<id>   # game PRs (isolated from other people's work in progress)
  npm run check -- --e2e               # platform and content PRs, and CI
  ```

- Fill in the [pull request template](.github/pull_request_template.md). It links the PRD and has two checklists: one for the author, one that only human reviewers tick.
- Generated files (`src/app/registry.gen.ts`, `src/app/styles.gen.css`), `dist/` and screenshots are not committed.

## Review roles

| Role | Who | What they confirm |
|---|---|---|
| **Author** | human or agent | The gate passes; every acceptance line of the PRD has a test; the definition of done in [AGENTS.md](AGENTS.md#definition-of-done-the-reviewers-checklist) holds. |
| **Code reviewer** | a human maintainer | The diff stays inside the game folder (or the platform change is general and tested); logic is pure and seeded; tests would fail if the rules broke; the game feels right on a phone. |
| **Sanskrit reviewer** | a human who reads Sanskrit — named in the PR | Every form, gloss, rule and accepted answer is correct; alternates and free word order are handled; sources are cited. Required whenever a PR adds or changes Sanskrit: a content pack, the engine in `src/sanskrit`, or game-local Sanskrit listed in a PRD. |

**Agents must not tick human-review boxes** — not in the PR template, not `humanReviewed: true` in
content, not a `REVIEW.md` sign-off row. An agent may *request* a review and summarise what needs
checking. A PR whose human boxes were ticked by an agent is closed.

## Labs, beta, stable

A game's `status` in `manifest.ts` says how far it has come.

| Status | Where | Visible to players | To get here |
|---|---|---|---|
| `labs` | `labs/<id>/` | only with Labs switched on (Profile → Settings, or `?labs=1`) | `manifest.ts`, `Game.tsx`, `logic.ts`, `logic.test.ts`; the isolated gate passes. For trying a mechanic quickly. |
| `beta` | `src/games/<id>/` | yes, with a "beta" badge | Folder moved to `src/games/`; all required files including `e2e.spec.ts` and `PRD.md`; `npm run check -- --e2e --game=<id>` passes; human code review. Sanskrit is machine-verified (packs / engine) but may still await human sign-off. |
| `stable` | `src/games/<id>/` | yes | Everything for `beta`, **plus**: a named human Sanskrit reviewer has signed off the game and the packs it uses; played end to end on a real phone (iOS Safari and Android Chrome) by a human; no open P0/P1 issue; `PRD.md` matches what was built; at least two weeks as `beta` without a Sanskrit correction. Only a maintainer changes `beta` → `stable`. |

Demotion is always allowed: a stable game with a confirmed Sanskrit error goes back to `beta` (or
the item is removed) until fixed.

## Reporting a Sanskrit error (P0)

A wrong form shown to a learner is the most serious bug this project can have.

1. Open an issue titled `P0 Sanskrit: <what is wrong>`.
2. Include: the game and level (or the content pack), a screenshot or the exact text shown, what it should be, and a reference (textbook page, sūtra, dictionary entry).
3. Maintainers **remove the item first and investigate second** (see [docs/SANSKRIT_ACCURACY.md](docs/SANSKRIT_ACCURACY.md#reporting-an-error)).
4. The fix adds a test that would have caught it and is approved by a human Sanskrit reviewer.

Other bugs: open an issue with the route (`#/play/<id>?seed=…` reproduces a session exactly), the
device and browser, and what you expected.

## Working in parallel without collisions

Dozens of contributors — many of them agents — work at the same time. The repository is arranged
so that they do not meet:

- **One folder each.** Everything for a game is in `src/games/<id>/`. Games never import each other, and a game PR edits no shared file.
- **A generated registry.** The catalogue, learning path and stylesheet are produced from the game folders by `tools/gen-registry.mjs` at build, dev and test time. There is no central list to edit, so there is nothing to conflict on.
- **Isolated checks.** `npm run check -- --e2e --game=<id>` type-checks only your folder, runs only your tests, and builds only your game into a private `.e2e/<id>-<pid>/` directory. A neighbour's half-written game cannot turn your gate red, and two gates can run side by side.
- **Claims are one row.** The PRD's row in the index is the lock (see above); it is the only shared file a game contributor edits.
- **Shared code changes are small and separate.** Platform files are owned by maintainers; propose first, keep the change general, give it tests.

## Prompt to give your coding agent

Paste this, replacing the two placeholders:

```text
You are contributing one game to the Samskuru repository.
Read AGENTS.md completely before doing anything, then docs/GAME_CONTRACT.md, docs/prd/README.md (how to claim)
and the PRD at docs/prd/backlog/<NN-id>.md. Claim it, then build exactly that PRD as src/games/<id>/ by running
`npm run new-game -- <id>` and replacing the template.
Rules that outrank everything: (1) every Sanskrit string comes from a pack (@content/<pack>) or @sanskrit — never invent,
generate or "fix" Sanskrit; if you are unsure, leave it out and list it under "Open questions" in PRD.md;
(2) do not edit files outside src/games/<id>/ (except your row in docs/prd/README.md); (3) write logic.ts and logic.test.ts before Game.tsx.
You are done only when `npm run check -- --e2e --game=<id>` passes and every line of the PRD's
"Acceptance tests" is covered by a test. Report the exact commands you ran and their results.
Do not tick any "human reviewer" checkbox.
```
