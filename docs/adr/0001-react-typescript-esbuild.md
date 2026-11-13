# ADR 0001: React, TypeScript and hand-rolled esbuild scripts

**Status:** Accepted

## Context

The platform must host dozens of small games written by different people and coding agents, run
as a static offline-capable site, and stay easy to install: contributors — and the sandboxes
agents run in — often have no network access after the first `npm install`. The prototypes this
project grew out of used four different stacks (Next.js, plain JavaScript, Vite + React, a single
HTML file), which made sharing a Sanskrit library or a look impossible.

## Decision

- **React 19** for all UI, **TypeScript** in strict mode (plus `noUncheckedIndexedAccess`) for everything.
- **esbuild** as the only build tool, driven by small scripts in `tools/` (`build.mjs`, `dev.mjs`, `serve.mjs`) rather than a framework or a dev-server product.
- Runtime dependencies are exactly `react` and `react-dom`. Dev dependencies are `esbuild`, `typescript`, `tsx`, `playwright` and type packages. The contract test `tests/contract/platform.test.ts` fails if a runtime dependency is added.
- Path aliases (`@sdk`, `@ui`, `@sanskrit`, `@content/<pack>`) are declared once in `tsconfig.json` and honoured by esbuild, `tsc` and `tsx`.

## Consequences

- A clean checkout is ready after one `npm install`; a production build takes well under a second, so the gate can build on every run.
- TypeScript is the first line of the game contract: `GameManifest`, `GameProps`, `SessionResult` and `Question` are checked at compile time, which catches a large share of agent mistakes before any test runs.
- React is most of the entry bundle (about 218 kB minified in total). For a learning app that is acceptable; it is the price of one component model for every contributor.
- We own a few hundred lines of build, dev and test scripts in `tools/`. They are simple, but they are ours: there is no hot module replacement (the dev server rebuilds and you refresh), no built-in image pipeline and no CSS modules (scoping is by convention and enforced by a test).
- Type-checking is a separate, slower step (`tools/typecheck.mjs`); esbuild does not type-check.

## Alternatives considered

- **Vite.** The obvious choice, and better at the dev experience (HMR, plugin ecosystem). Not chosen for v1 because it adds a large dependency tree and configuration surface for features we do not use yet, and because the generated-registry and single-game builds were a few lines against esbuild's API. **Vite could replace `tools/build.mjs` and `tools/dev.mjs` later without touching a single game**: games see only `@sdk`, `@ui`, `@sanskrit`, `@content/<pack>` and `react`, and the registry is a generated module either bundler can consume.
- **Next.js or another meta-framework.** Server rendering and routing conventions are of no use to an offline static app and would make "host anywhere, wrap with Capacitor" harder.
- **Preact or Solid** for a smaller bundle. Rejected because contributor and agent familiarity with React is worth more than the bytes saved.
- **No framework (vanilla DOM / canvas per game).** Two of the prototypes did this; each reinvented components, input handling and layout, and none was accessible.
- **Plain JavaScript.** Rejected: the contract would be documentation instead of types.
