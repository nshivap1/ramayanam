# ADR 0003: Pure game logic and seeded randomness

**Status:** Accepted

## Context

Three requirements point the same way. Daily puzzles must be identical for every player on a
given date. Agent-written games must be verifiable by tests that play thousands of sessions in
milliseconds. And a Sanskrit error reported by a learner must be reproducible exactly. All three
fail if rules read the clock, call `Math.random`, or live inside React components.

## Decision

- Each game keeps its rules in `logic.ts`: plain serialisable state and functions `(state, input) → state`. No React, DOM, storage, timers, `Date` or `Math.random`; time enters as numbers.
- All randomness comes from `createRng(ctx.seed)` in `src/sdk/rng.ts` (mulberry32). Sub-streams use `rng.fork(label)`. Daily seeds are `dailySeed(dateKey, gameId)`, an FNV-1a hash.
- The shell chooses the seed (daily, explicit `?seed=`, or fresh) and passes it in `ctx`; `Game.tsx` only renders state and forwards input.
- The platform's own state follows the same rule: the quiz engine (`src/sdk/quiz.ts`) and progress (`src/sdk/progress.ts`) are pure reducers.
- `tests/contract/games.test.ts` rejects `Math.random`, clock access, DOM access and UI imports in `logic.ts`; `tests/contract/platform.test.ts` rejects `Math.random`, DOM access and runtime React imports in `src/sdk`.

## Consequences

- `logic.test.ts` can run a perfect bot, a failing bot and a random bot over every level and 25+ seeds without a browser; a failure prints the seed, and `#/play/<id>?seed=N` replays the session.
- Daily puzzles need no server: date + game id determine everything.
- States are values, so undo, resume-after-reload (`ctx.store`) and future multiplayer or sync are natural.
- The generator and hash are part of the product: changing `createRng`, `fork`, `hashString` or `dailySeed` changes every seeded puzzle. Their outputs are pinned by tests in `src/sdk/rng.test.ts`.
- mulberry32 has 32 bits of state. That is ample for shuffling a board, and useless for anything needing unpredictability — a determined player can compute tomorrow's daily. We accept that.
- Real-time games need more discipline: the simulation is `step(state, dtMs, input)` driven by a hook, which is less familiar than mutating objects in an animation loop.
- Purity is enforced by regular-expression scans, which a determined author can evade; code review remains the backstop.

## Alternatives considered

- **Logic inside components with hooks.** Fastest to write, and what most prototypes did; it made their rules testable only through a browser and their daily modes impossible.
- **`Math.random` with a global seed patch.** Fragile (any library call consumes numbers) and invisible in code review.
- **Server-generated daily puzzles.** Guarantees sameness and secrecy, but needs a backend ([ADR 0006](0006-local-first-progress-no-backend-in-v1.md)) and breaks offline play.
- **A state-machine library (XState, Redux).** More structure than a 100-line reducer needs, and another dependency for every contributor to learn.
- **A stronger generator (xoshiro, PCG).** Better statistics we cannot perceive in a word game, with 64-bit arithmetic that is slower and more error-prone in JavaScript.
