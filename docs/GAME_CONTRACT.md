# Game contract

Everything a game must do, may do, and must not do. The contract is enforced by
`tests/contract/games.test.ts` and by TypeScript (`src/sdk/types.ts` is the source of truth).

## 1. Shape of a game

```
src/games/<id>/
  manifest.ts      export const manifest: GameManifest
  logic.ts         pure rules (state, transitions, question building, scoring)
  logic.test.ts    unit + simulation tests
  Game.tsx         export default function Game({ ctx }: GameProps)
  style.css        optional, scoped to .g-<id>
  e2e.spec.ts      browser test
  PRD.md           the spec
  content.ts       optional: game-local data derived from packs (never hand-typed Sanskrit without tests)
```

`<id>` is kebab-case ASCII (IAST without diacritics, e.g. `pada-shodha`), equals `manifest.id`, and is
permanent (it keys saved progress). Folders starting with `_` are ignored.

Experiments go in `labs/<id>/` with `status: 'labs'`: same shape, only `manifest.ts`, `Game.tsx`,
`logic.ts`, `logic.test.ts` are required. Labs games appear only when the user enables Labs
(Profile → Settings, or `?labs=1`). Promote by moving the folder to `src/games/` and completing the files.

## 2. Manifest

See `GameManifest` in `src/sdk/types.ts`; `validateManifest` (from `@sdk`) lists every rule. Notes:

- `skills[0]` is the primary skill — it decides where the game sits on the learning path.
- `levels` lists only levels the game truly has content for (0 Akṣara · 1 Śibira · 2 Praveśa · 3 Paricaya · 4 Śikṣā · 5 Kovida). The shell passes the nearest supported level as `ctx.level`.
- `modes[0]` is the default. Include `'daily'` only if the game is fully determined by `ctx.seed` (same puzzle for everyone that day) and produces a `share` card.
- `howToPlay`: 2–6 short imperative steps; shown automatically on first launch.
- `content`: ids of the packs used (`'shabda'`, `'vocab'`, `'dhatu'`, `'sentences'`, `'sandhi'`, `'samasa'`, `'subhashita'`), for provenance display.

## 3. GameContext (`ctx`)

| Member | Use |
|---|---|
| `seed` | The only source of randomness: `const rng = createRng(ctx.seed)`. Daily mode gives everyone the same seed per date and game. |
| `mode`, `level`, `dateKey` | Session framing. |
| `settings` | `script`, `sound`, `haptics`, `reducedMotion`… (read-only). You rarely need it: `<SaText>` and `ctx.sfx` already respect it. |
| `store` | `get/set/remove` JSON under the game's own namespace (best level reached, tutorial seen, in-progress daily). Keep values small and versioned. |
| `hud(patch)` | Feed the shell top bar: `progress` (0–1), `score`, `lives`/`maxLives`, `timeLeftMs` (+ `timeWarnMs`, the threshold below which the timer turns red; default 10 s), `combo`, `label`. Do not render your own score/timer/hearts. |
| `isPaused()` | `true` while the shell covers the game (help / leave sheet) or the page is hidden. Real-time games must not advance while paused — the `@ui` hooks `useRafLoop`, `useCountdown`, `useInterval` already honour it. |
| `finish(result)` | End the session — **exactly once**. The shell records XP/streak/mastery and shows the result screen with Play again / Share. |
| `exit()` | Leave without a result (rare; the ✕ button already does this). |
| `sfx(name)`, `haptic(kind)` | Feedback. Names: `tap correct wrong win lose merge tick levelup`. |
| `announce(text)` | Screen-reader live region for events that are otherwise only visual. |
| `expose(snapshot)` | Publish a small JSON snapshot for browser tests (`window.__game`, only when the URL has `e2e=1`). Include what a bot needs to play right *and* wrong (e.g. the answer). |

The game component is re-mounted for every new session (new seed), so initialise state with
`useState(() => initialState(ctx.seed, ctx.level))`.

## 4. SessionResult

```ts
ctx.finish({
  outcome: 'won' | 'lost' | 'completed',
  score,                       // game-defined, higher is better
  correct, total,              // when there are discrete answers → accuracy → stars
  stars,                       // optional explicit 0–3 (else derived)
  best: { label: 'Longest chain', value: 12 },   // optional personal best
  summary: 'Solved in 4 of 6', // one line under the headline
  share: '🟩🟨⬛…',              // optional emoji card (daily games: required)
  review: [{ sa, en, note, correct }],            // "What you practised" list
  mastery: [{ skill, itemId, correct }],          // feeds spaced repetition + skill bars
});
```

XP is computed by the shell (5–20 per session, +10 for the first daily) — games cannot award XP.
`itemId`s must be stable across versions (`shabda:rama-m:3.1`, `vocab:vrksha`, `sandhi:guna:deva+indra`).

## 5. Logic rules (`logic.ts`)

- Pure and deterministic: no React, DOM, storage, timers, `Date`, `Math.random`. Time is passed in as numbers.
- State is a plain serialisable object; transitions are functions `(state, input) → state`.
- Export what tests need: `init(seed, level)`, transition functions, `isOver`, `toResult`.
- All Sanskrit comes in through `@content` / `@sanskrit`. Filtering by level uses the pack helpers (`vocabForLevel(level)` etc.).
- Every generated puzzle must be **solvable and unambiguous**: exactly one keyed answer unless the type supports alternatives, in which case *all* valid alternatives are accepted (vikalpa forms, free word order, homographic case forms such as रामाभ्याम् for 3/4/5 dual). When two cells of a paradigm share a form, either avoid asking that cell or accept every matching label.

## 6. UI rules (`Game.tsx`, `style.css`)

- Root element: `<div className="sk-stage g-<id>">` (or return `<QuizRunner …/>`).
- Sanskrit only via `<SaText>` / `renderSa(text, script)`. Never put Devanagari in a plain text node except fixed decorative glyphs that are not language content.
- Use `@ui` components before writing new ones: `Button`, `Choice`, `Tile`, `Chip`, `ProgressBar`, `Sheet`, `FeedbackBar`, `AksharaKeyboard`, `QuizRunner`; hooks `useSwipe`, `useKeydown`, `useCountdown`, `useInterval`, `useRafLoop`.
- CSS: every selector contains `.g-<id>`; `@keyframes` are named `g-<id>-*`; no hex colours — use tokens (`var(--accent)`, `var(--ok)`, `var(--s-3)`…). The shell sets `--accent*` from `manifest.hue`.
- Mobile first: must work at 360×640 with touch targets ≥ 44 px, no horizontal scroll, `100dvh`-safe (the stage is a flex column that scrolls if needed).
- Keyboard: every action reachable without a pointer (arrows/Enter/digits as appropriate).
- Motion: honour reduced motion (CSS handles `animation`/`transition`; for JS/canvas loops check `ctx.settings.reducedMotion`).
- Interactive elements get stable `data-testid`s.
- Canvas games: draw text with `renderSa`, use `'Samskuru Deva'` font after `document.fonts.ready`, scale for `devicePixelRatio`, and still expose state via `ctx.expose`.

## 7. Recipes

### Lesson / quiz game
Build `Question[]` in `logic.ts` (kinds: `choice`, `arrange`, `pairs`, `type` — see `src/sdk/quiz.ts`) and render
`<QuizRunner ctx={ctx} questions={questions} options={{ lives: 3 }} buildResult={…} />`.
Distractors must be *wrong*: test that no distractor equals an accepted answer.

### Daily puzzle
Derive the whole puzzle from `ctx.seed`. Save in-progress state under `ctx.store` keyed by `ctx.dateKey` so a reload resumes. Provide `share` (emoji grid, no spoilers) and `summary`.

### Arcade (real time)
Keep the simulation in `logic.ts` as `step(state, dtMs, input)`; drive it with `useRafLoop`; render DOM or canvas. Difficulty ramps with time/score, not randomness alone. Provide lives or a timer via `ctx.hud`. Tests step the simulation with fixed `dt` and scripted input.

### Typing answers
`<AksharaKeyboard value onChange onEnter keyState />` builds well-formed Devanagari; compare with `sameSpelling` from `@sanskrit` (फलं = फलम्, गंगा = गङ्गा); split with `splitAksharas`.

## 8. Things the contract forbids

- Importing another game, the app shell (`src/app`), or internal files of `@sdk`/`@ui`/`@sanskrit`/`@content` (import from the package root).
- Network requests, third-party scripts, analytics, storage outside `ctx.store`.
- New dependencies. (The runtime is React only.)
- Sanskrit that is not traceable to a pack or engine. English UI strings are fine.
- Timers that keep running after unmount; calling `ctx.finish` twice; blocking the main thread > 50 ms.
