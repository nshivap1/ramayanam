# ADR 0002: A game is a self-contained folder; the registry is generated

**Status:** Accepted

## Context

The aim is 40+ games contributed in parallel, largely by coding agents working without knowledge
of each other. Any file that every contributor must edit — a list of games, a route table, a
shared stylesheet, a barrel export — becomes a merge-conflict magnet and a place where one
contributor's mistake breaks everyone. A neighbour's half-finished game must not be able to turn
somebody else's checks red.

## Decision

- A game is exactly one folder, `src/games/<id>/` (experiments: `labs/<id>/`), with a fixed set of files: `manifest.ts`, `logic.ts`, `logic.test.ts`, `Game.tsx`, `e2e.spec.ts`, `PRD.md`, optional `style.css`.
- Games import only `./…`, `@sdk`, `@ui`, `@sanskrit`, `@content/<pack>` and `react`. They never import another game or the shell.
- `tools/gen-registry.mjs` scans the folders and generates `src/app/registry.gen.ts` (manifests plus lazy `import()` of each `Game.tsx`) and `src/app/styles.gen.css`. The files are git-ignored; the bundler receives them through a plugin and can be restricted to chosen games (`--only=<id>`).
- The catalogue, the learning path and the daily list are computed from manifests.
- `npm run check -- --game=<id>` type-checks, tests and builds that folder alone, in a private output directory.

## Consequences

- Adding a game is "create a folder and pass the gate". A game PR's diff is confined to that folder, which makes review and revert trivial.
- No central file exists to conflict on; dozens of branches merge in any order.
- Each game is its own lazy chunk, so the cost of game N+1 to the first page load is one manifest.
- Folder names are permanent ids (they key saved progress), so renaming a game needs a migration.
- Sharing code between two games is deliberately awkward: it must be promoted to `@ui` or `@sdk` with tests. This slows the second game that wants a helper and prevents a web of cross-game imports.
- The generated files must exist before `tsc` or an editor can resolve them; every tool regenerates them, and a fresh clone needs one `npm run gen` (or any other command) before the editor is happy.
- Structure is enforced by tests (`tests/contract/games.test.ts`), not by the type system; the rules are only as good as those tests.

## Alternatives considered

- **A hand-maintained registry file.** Simple and explicit, but it is the conflict point this decision exists to remove, and it lets a game exist without being registered (or the reverse).
- **One npm workspace package per game.** Stronger isolation and per-game dependencies, but far more ceremony per game (package manifest, build config, versioning) and it invites dependency sprawl, against [ADR 0001](0001-react-typescript-esbuild.md).
- **`import.meta.glob`-style discovery** (a bundler feature). Equivalent in effect, but it ties discovery to one bundler and cannot easily build a single game in isolation.
- **Runtime-loaded plugins / micro-frontends / iframes.** Real isolation at run time, at the cost of duplicated React copies, harder offline caching and a much larger contract. Not needed while all games are built from one repository.
