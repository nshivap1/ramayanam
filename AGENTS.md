# AGENTS.md — start here (coding agents and humans)

Samskuru is one PWA that hosts many Sanskrit learning games. You contribute by adding or improving
**one self-contained game folder**. The platform (shell, design system, Sanskrit library, verified
content, test harness) is shared and already built.

**Two rules outrank everything else:**

1. **Sanskrit must be correct.** Every Sanskrit string a game shows or accepts comes from a verified
   content pack (`@content`) or a deterministic engine (`@sanskrit`). Never invent, generate or
   "fix" Sanskrit in a game. Unsure → leave it out. Details: [docs/SANSKRIT_ACCURACY.md](docs/SANSKRIT_ACCURACY.md).
2. **No partial builds.** A game merges only when `npm run check -- --e2e --game=<id>` passes and
   every item in its PRD's acceptance list is covered by a test. Unfinished ideas live in `labs/`.

## 10-minute path to a new game

```bash
npm install                      # once
npm run new-game -- my-game      # scaffolds src/games/my-game/ from a working template
npm run dev                      # http://127.0.0.1:5173/#/play/my-game  (rebuilds on save)
npm run check -- --e2e --game=my-game   # the gate: types · content · unit · contract · build · browser
```

1. **Claim a PRD** from [docs/prd/README.md](docs/prd/README.md) (set its status to `in-progress` with your name), or write one from [docs/prd/TEMPLATE.md](docs/prd/TEMPLATE.md). The PRD is copied into your game folder as `PRD.md` and stays the source of truth.
2. **Read two reference games** — copy the closer one:
   - lesson / quiz style → [`src/games/akshara-paricaya`](src/games/akshara-paricaya) (builds `Question[]`, `<QuizRunner>` does the rest)
   - custom mechanic → [`src/games/smrti-yugala`](src/games/smrti-yugala) (pure reducer in `logic.ts`, thin `Game.tsx`)
3. **Write `logic.ts` first, with tests**, then `Game.tsx`, then `e2e.spec.ts`. Look at it: `node tools/screenshot.mjs "#/play/my-game?e2e=1&seed=3"`.
4. Run the gate. Fix everything. Update `PRD.md` if behaviour changed.

## What a game folder contains (all required)

| File | Purpose |
|---|---|
| `manifest.ts` | `export const manifest: GameManifest` — id (= folder name), titles, skills, levels, modes, how-to-play |
| `logic.ts` | Pure rules. No React/DOM/clock/`Math.random`. Deterministic from a seed (`createRng`). |
| `logic.test.ts` | Unit + simulation tests (bots play many seeds × levels) + content checks |
| `Game.tsx` | `export default function Game({ ctx }: GameProps)` — renders state, forwards input |
| `style.css` | Optional. Every selector under `.g-<id>`; colours only via design tokens |
| `e2e.spec.ts` | Browser test: plays to the result screen through the real UI |
| `PRD.md` | The spec, with `## Learning objective · Core loop · Sanskrit rules · Content · Acceptance tests` |

Nothing else needs editing: the registry, catalogue, learning path and stylesheet are generated from
game folders (`tools/gen-registry.mjs`). **Never edit a central list. Never import another game.**

## Allowed imports inside a game

`./…` · `@sdk` (contract, rng, quiz engine, progress types) · `@ui` (components, hooks) ·
`@sanskrit` (transliteration, akṣara, sandhi, chandas, numbers) · `@content/<pack>` (verified packs: `shabda`, `vocab`, `dhatu`, `sentences`, `sandhi`, `samasa`, `subhashita`; shared types in `@content/types`) · `react`.

## The contract in one screen

```tsx
export default function Game({ ctx }: GameProps) {
  // ctx.seed, ctx.mode ('daily'|'practice'|'endless'|'timed'), ctx.level (0–5), ctx.settings, ctx.store
  // ctx.hud({ progress, score, lives, timeLeftMs })   → shell top bar (do not draw your own)
  // ctx.expose({ phase, answer… })                    → what a test bot needs (only live in e2e)
  // ctx.finish({ outcome, score, correct, total, share, review, mastery })   → exactly once
}
```

- Sanskrit on screen: only `<SaText>` (or `renderSa` for canvas/aria). It applies the user's script (Devanagari/IAST) and fonts.
- The play unit is the **akṣara**, not the code point: use `splitAksharas`, never `str.split('')` or `.length`.
- Sanskrit word order is free: when checking a sentence, accept every valid order (`ArrangeQuestion.answers`).
- Optional forms (vikalpa) are all correct: content gives `Forms` arrays — accept any member.
- The shell owns help, pause/exit, results, XP, streak, share and persistence.

Full contract and recipes: [docs/GAME_CONTRACT.md](docs/GAME_CONTRACT.md) · UI kit: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) · Tests: [docs/TESTING.md](docs/TESTING.md) · Why it is built this way: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Definition of done (the reviewer's checklist)

- [ ] `npm run check -- --e2e --game=<id>` passes; no console errors in the browser test
- [ ] `logic.test.ts` simulates full sessions for every supported level over ≥ 25 seeds (win path, lose path, edge cases)
- [ ] Every Sanskrit string traces to `@content`/`@sanskrit`; any game-local Sanskrit is listed in `PRD.md → Content` with its source and is checked in tests
- [ ] Works at 360 px wide, with keyboard only, in both scripts, light and dark, reduced motion
- [ ] `PRD.md` matches what was built; version bumped if rules/content changed
- [ ] You did **not** tick the "Sanskrit reviewed by a human" box — only a human reviewer does

## Changing shared code

`src/sdk`, `src/ui`, `src/sanskrit`, `src/content`, `src/app`, `tools`, `tests` are **platform**. A game
PR should not need to touch them. If you need a new component, hook, content pack or engine rule:
propose it in the PR description, add it with tests in a separate commit, and keep it general
(two games must be able to use it). Sanskrit engine or content changes always need a human
Sanskrit reviewer. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server with rebuild on save |
| `npm run new-game -- <id> [--custom] [--labs]` | scaffold a game from the quiz template (`--custom`: reducer-style mechanic; `--labs`: experiment in `labs/`) |
| `npm test` | unit + contract tests (fast, no browser) |
| `npm run test:unit -- games/<id>/` | one game's unit tests |
| `npm run test:e2e -- <id>` | build + browser tests for one game (omit id for all) |
| `npm run validate` | content report: counts, provenance, checks |
| `npm run check [-- --e2e] [-- --game=<id>]` | the full gate |
| `node tools/screenshot.mjs "#/play/<id>?e2e=1" out.png` | see your game (add `--desktop`, `--dark`, `--click=testid`) |
