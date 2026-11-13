# ADR 0007: `node:test` plus the Playwright library; no test-framework dependency

**Status:** Accepted

## Context

Tests are the main quality gate for agent-written games, so every contributor must be able to
run them immediately, in a sandbox, with nothing to configure. Each test framework brings its own
runner, configuration file, module transform, watch mode and assertion dialect — and its own
version skew with the bundler. The platform already needs Node 22 and, for browser tests, a
browser driver.

## Decision

- Unit, simulation and contract tests use Node's built-in runner and assertions: `node:test` and `node:assert/strict`. TypeScript is loaded through `tsx` (`node --import tsx --test …`).
- Browser tests use the **Playwright library** (`chromium.launch()`), not the Playwright Test runner, inside the same `node:test` files, through a small harness (`tests/e2e/harness.ts`) that starts a static server and one browser per spec file.
- One script, `tools/test.mjs`, finds test files by name (`*.test.ts` beside the module, `e2e.spec.ts` per game, `tests/contract/*.test.ts`, `tests/e2e/*.spec.ts`) and runs them; `tools/check.mjs` chains everything into the gate.
- Games expose a small JSON snapshot through `ctx.expose` (live only with `?e2e=1`), so browser tests read state instead of scraping pixels.

## Consequences

- No test framework to install, configure or upgrade; the only test-related packages are `tsx` and `playwright`.
- One vocabulary everywhere — `test()`, `assert.equal()`, `assert.deepEqual()` — which language models reproduce reliably.
- Pure-logic tests are fast (the SDK's several hundred tests run in a few seconds), so simulation over many seeds is cheap.
- We give up framework comforts: no snapshot testing, no built-in mocks beyond `node:test`'s, no watch-mode UI, no coverage thresholds, no per-test retries, traces or HTML report for browser tests, and no automatic parallelism across browser specs (they run serially to bound memory).
- The harness is ours to maintain: server, browser lifecycle, console-error collection, `playQuiz`. It is about 200 lines.
- Browser tests need a Chromium download once (`npx playwright install chromium`); only Chromium is exercised, so Safari- and Firefox-specific behaviour is covered by manual QA ([TESTING.md](../TESTING.md)).
- `node:test` output is plainer than a dedicated framework's; `SAMSKURU_REPORTER=dot` or `spec` selects the reporter.

## Alternatives considered

- **Vitest.** Excellent with Vite, fast, with watch mode, snapshots and coverage. It would be the natural choice if the build moves to Vite ([ADR 0001](0001-react-typescript-esbuild.md)); today it would add a second transform pipeline and configuration for little gain over `node:test`.
- **Jest.** Heavier, slower with ESM and TypeScript, more configuration.
- **Playwright Test** (the runner). Better reports, retries, tracing and projects for several browsers. Rejected to keep a single runner and one way to write a test; reconsider when cross-browser automation is wanted.
- **Component tests in jsdom (Testing Library).** Fast UI tests without a browser, but jsdom does not shape Devanagari, lay out a 360 px viewport or run a service worker — the things our browser tests exist to check. Logic is tested as pure functions instead.
- **Cypress.** A second runner and a heavier install for the same coverage.
