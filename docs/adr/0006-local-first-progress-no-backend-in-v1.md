# ADR 0006: Local-first progress; no backend in v1

**Status:** Accepted

## Context

The habit loop (streak, XP, daily puzzle, share card, per-skill mastery) is what brings learners
back, and research on comparable products suggests most of it works from device storage alone.
The project has no operations budget, no one on call, and an audience that includes minors in
classes, for whom collecting accounts raises consent and privacy questions. Agent contributors
cannot test against a server they do not have.

## Decision

- Version 1 is a static site. There are no accounts, no server, no analytics and no network requests at run time.
- All progress is one `Profile` object plus per-game values, stored through the `KV` interface (`src/sdk/storage.ts`); the browser implementation is `localStorage` with an in-memory fallback.
- Every change to progress is a pure function over the profile (`src/sdk/progress.ts`), and stored data is versioned (`samskuru:v1:` prefix, `PROFILE_VERSION`) with a forward-compatible loader.
- Sharing is the only "social" feature: plain text through the Web Share API or the clipboard.

## Consequences

- The app works offline, costs nothing to run, can be hosted anywhere, and has no personal data to protect or lose.
- A contributor can run and test the complete product on a laptop with no credentials.
- **Progress lives on one device and can be lost**: clearing site data, switching phone or browser, and — most importantly — Safari's deletion of script-writable storage after seven days of browser use without a visit, which does not apply to an app installed on the Home Screen (see [ARCHITECTURE.md](../ARCHITECTURE.md#state-and-persistence)). Until export/import and an install prompt exist, a long streak on iOS Safari is at real risk. This is the weakest point of the decision.
- No leagues, friend streaks, class leaderboards, push reminders or live classroom play; these are the features with the strongest retention evidence, and they are deferred ([ROADMAP.md](../ROADMAP.md)).
- Streaks and daily puzzles trust the device clock. A learner can cheat; only they are affected.
- `localStorage` is synchronous and small (a few megabytes). The profile is kept small on purpose (60 days of history, compact mastery records); an event log or large content would need IndexedDB behind the same seam.
- Sync later is a merge problem, not a rewrite: the profile is serialisable and all writes pass through one function, but per-field merge rules still have to be designed.

## Alternatives considered

- **Accounts and a hosted database from day one** (Supabase, Firebase). Solves loss and enables social features, but adds cost, privacy obligations, an online dependency and a login wall before the first game.
- **Anonymous cloud backup keyed by a device code.** Lighter than accounts; still a server to run and secure. A good candidate for the first backend step.
- **IndexedDB instead of `localStorage`.** Larger and asynchronous, but subject to the same eviction rules, and an async API would have complicated every game's `ctx.store` for no present benefit.
- **File export/import only.** Not an alternative but a missing complement; it is on the roadmap as a MUST.
