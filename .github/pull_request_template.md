<!-- Title: use a prefix —  game(<id>): …  |  content(<pack>): …  |  platform: …  |  docs: …
     One game per pull request. See CONTRIBUTING.md. -->

## What and why

<!-- Two or three sentences. For a game: what the player does and what they learn. -->

- **PRD:** <!-- link: docs/prd/backlog/NN-<id>.md and/or src/games/<id>/PRD.md -->
- **Kind of change:** <!-- new game · game change · content · platform · docs -->
- **Author:** <!-- human, or "agent (<tool>) on behalf of @handle" -->

## Gate

Command run (paste the final summary block; list only commands that actually ran):

```text
npm run check -- --e2e --game=<id>      # game PRs
npm run check -- --e2e                  # platform / content PRs
```

## Author (agent or human)

- [ ] The gate above passes on this branch; the browser test reports no console errors
- [ ] Every line of the PRD's *Acceptance tests* is covered by a test, and `PRD.md` matches what was built
- [ ] `logic.test.ts` simulates full sessions for every supported level over ≥ 25 seeds (win path, lose path, edge cases)
- [ ] Every Sanskrit string comes from `@content` / `@sanskrit`; any game-local Sanskrit is listed in `PRD.md → Content` with its source and checked by a test
- [ ] Looked at it: 360 px wide, keyboard only, both scripts, light and dark, reduced motion
- [ ] The diff touches only `src/games/<id>/` (or `labs/<id>/`) and my row in `docs/prd/README.md` — or the platform change is described below, general, and tested
- [ ] No new dependencies, network requests, or storage outside `ctx.store`
- [ ] The boxes under "Human reviewers only" were left for humans

### Platform or content changes in this PR (if any)

<!-- What changed outside the game folder, why two games need it, and which tests cover it. Otherwise: "none". -->

### Sanskrit that needs a human eye

<!-- List new or changed forms, glosses, rules, accepted alternates — or "none (no Sanskrit added or changed)". -->

## Human reviewers only

<!-- Agents: do not tick, edit or remove anything in this section. -->

- [ ] **Code review** — reviewer: @
- [ ] **Sanskrit review** (required if any Sanskrit was added or changed) — reviewer name:
- [ ] Played on a real phone (needed for `beta` → `stable`) — device / browser:
