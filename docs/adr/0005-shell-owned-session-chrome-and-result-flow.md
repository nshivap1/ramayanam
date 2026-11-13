# ADR 0005: The shell owns session chrome and the result flow

**Status:** Accepted

## Context

Left alone, each game invents its own header, pause and exit, help screen, hearts, score display,
end screen, share text and idea of "XP". Players then relearn the interface forty times,
accessibility is solved forty times (or not at all), and any game can award itself unlimited
points. Agents in particular produce a new variation of all of this for every game.

## Decision

A game renders only its play area. The shell (`src/app/GameHost.tsx`) owns everything around it:

- the top bar — close with confirmation, progress, timer, score, combo, hearts, help — fed by the game through `ctx.hud(patch)`;
- the how-to-play sheet, generated from the manifest and shown automatically on first launch;
- the end of a session: the game calls `ctx.finish(result)` exactly once, and the shell computes stars and XP, updates streak, mastery and achievements (`recordSession`), persists the profile, and shows one shared result screen with replay, share and review;
- sound and haptics (`ctx.sfx`, `ctx.haptic`), screen-reader announcements (`ctx.announce`), settings, storage (`ctx.store`), and the error boundary around the game.

Lesson-style games go one step further and hand the whole loop to `<QuizRunner>`.

## Consequences

- Every game has the same exit, help and result behaviour, and gets shell improvements (a new share format, a streak animation, an accessibility fix) without being touched.
- XP is bounded by the platform: 5–20 per session, +10 for the first daily of the day, 2 for a daily replay. No game can inflate it, so XP can later feed quests or leagues.
- A typical game is 100–300 lines, most of them rules. That is what makes agent-built games reviewable.
- The browser-test harness can drive any game the same way (`data-testid="result"`, `window.__result`), so a generic "plays to the result screen" test exists for every game.
- Games give up control. A game that wants a custom end sequence, a mid-session shop or its own header cannot have one; the available levers are `summary`, `share`, `review`, `best` and `hud.label`. Unusual needs go through a platform change.
- The contract is a bottleneck by design: a new HUD element (say, a second timer) means changing `Hud` and the host for everyone.
- The host is the largest and most intricate file in the shell and deserves the most careful review.

## Alternatives considered

- **Games own their full screen; the shell is a launcher.** Maximum freedom, and exactly the inconsistency described above.
- **Optional shared components** (a `<ResultScreen>` games may use). Voluntary consistency does not survive forty contributors, and XP could not be trusted.
- **A slot / render-prop API** letting games inject content into the shell chrome. More flexible; rejected for v1 because every slot is a new way to look different. It can be added for a specific, demonstrated need.
- **A declarative game description** (JSON instead of a component). Enough for quizzes — that is what `Question[]` plus `<QuizRunner>` is — but too limiting for arcade and puzzle mechanics.
