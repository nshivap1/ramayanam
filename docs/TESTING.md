# Testing

Tests are how this repository trusts a game it has never seen, written by someone (or something)
it has never met. This page explains the layers, shows how to write each with code taken from the
repository, and lists what a game must prove. The decision behind the tooling is
[ADR 0007](adr/0007-node-test-plus-playwright-no-test-framework-dependency.md).

Code blocks that start with a file path are quoted from that file and are checked against it by
`tests/contract/platform.test.ts`, so they cannot drift.

## The pyramid

| # | Layer | Where | Proves | Speed |
|---|---|---|---|---|
| 1 | **Unit and property tests** of engines, SDK and packs | `src/sanskrit/*.test.ts`, `src/sdk/*.test.ts`, `src/ui/keyboardLogic.test.ts`, `src/content/**/*.test.ts` | The shared building blocks are right for *all* inputs: round trips, invariants, tables, adversarial cases | ms |
| 2 | **Per-game logic tests** with seeded simulation bots and content checks | `src/games/<id>/logic.test.ts` | The rules: every level × ≥ 25 seeds is solvable, terminates, is deterministic and unambiguous | ms |
| 3 | **Contract tests** | `tests/contract/games.test.ts`, `tests/contract/platform.test.ts` | Every game has the required shape and obeys the import, purity and styling rules; the platform keeps its layering, PWA files, tokens and docs consistent | < 2 s |
| 4 | **Browser tests** through the real UI | `src/games/<id>/e2e.spec.ts`, `tests/e2e/shell.spec.ts` | A real browser can play to the result screen at phone size with no console errors; the shell, persistence and offline mode work | seconds |
| 5 | **The gate** | `npm run check` | All of the above plus type-check, content validation and a production build, in one command | ~1 min |

Most of the confidence comes from layers 1–3, which need no browser. Layer 4 is deliberately
thin: one or two paths per game that show the logic is wired to the screen.

## Commands

```bash
npm test                              # layers 1–3 for the whole repo (no browser)
npm run test:unit -- games/<id>/      # one game's unit tests (the argument is a path substring)
npm run test:unit -- sdk/quiz         # one platform module
npm run test:contract                 # layer 3 only
npm run validate                      # content report: counts, provenance and checks for every pack
npm run test:e2e -- <id>              # build that game alone and run its browser spec
npm run test:e2e                      # build everything, run every browser spec
npm run check -- --e2e --game=<id>    # the isolated gate for one game
npm run check -- --e2e                # the full gate (what CI runs)
```

Tests use `node:test` and `node:assert/strict`; files are named `*.test.ts` and sit beside the
module they test (browser specs are `e2e.spec.ts`).

## 1. Unit and property tests

For anything in `src/sanskrit`, `src/sdk`, `src/ui` (pure parts) and `src/content`. Prefer
properties over examples: state what must hold for every input, then let a loop or a seeded
generator look for a counter-example. Two patterns from the platform's own tests:

A statistical property with a deterministic seed, so it can never flake:

```ts
// src/sdk/rng.test.ts
test('next: always in [0, 1), mean ≈ 0.5, deciles uniform (chi-square) for several seeds', () => {
  for (const seed of SEEDS) {
    const rng = createRng(seed);
    const buckets = new Array<number>(10).fill(0);
    let sum = 0;
    for (let i = 0; i < 100_000; i++) {
      const x = rng.next();
      assert.ok(x >= 0 && x < 1, `next() out of range: ${x}`);
      buckets[Math.floor(x * 10)]!++;
      sum += x;
    }
```

Purity proved by freezing the input:

```ts
// src/sdk/progress.test.ts
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}
```

Rules of thumb (they apply to every layer):

- **An accepted case beside every rejected case**, so a check cannot pass by refusing everything.
- **No vacuous passes.** If a test loops over a list, assert the list is not empty; if it scans files, assert it found some.
- **Assert facts, not prose**: values and structures rather than message wording.
- **Pin what must never change silently** (seeds, hashes, storage keys) with literal expected values.
- **Real Sanskrit only** in fixtures, taken from packs or well-known forms. Tests are read by learners of the codebase too.

## 2. Per-game logic tests

`logic.test.ts` is where a game earns trust. It imports the pure functions from `./logic` and
plays the game without a browser.

**Simulation bots.** A perfect bot must win every seed; a random or adversarial bot must always
terminate with the invariants intact:

```ts
// src/games/smrti-yugala/logic.test.ts
test('perfect bot finishes every seed in exactly PAIRS moves with 3 stars', () => {
  for (const seed of SEEDS) {
    const s = perfectBot(deal(seed));
    assert.equal(s.done, true);
    assert.equal(s.moves, PAIRS);
    assert.equal(s.mismatches, 0);
    assert.equal(starsFor(s.moves, PAIRS), 3);
    assert.equal(score(s), PAIRS * 20);
    assert.equal(flip(s, 0), s, 'no moves after the game is done');
  }
});
```

```ts
// src/games/smrti-yugala/logic.test.ts
test('random bot always terminates; invariants hold throughout', () => {
  for (const seed of SEEDS.slice(0, 20)) {
    const rng = createRng(seed);
    let s = deal(seed);
    let guard = 0;
    while (!s.done) {
      assert.ok(++guard < 5000, 'random play must terminate');
      if (s.pending) {
        s = settle(s);
        continue;
      }
      const down = s.cards.filter((c) => !isFaceUp(s, c.index));
      s = flip(s, rng.pick(down).index);
      assert.ok(s.open.length <= 2);
      assert.equal(s.pending, s.open.length === 2);
      assert.ok(s.mismatches <= s.moves);
    }
```

**Determinism and validity** for every stage and many seeds — for quiz games,
`assertValidQuestions` (from `@sdk`) checks every question's structure and that ids are unique:

```ts
// src/games/akshara-paricaya/logic.test.ts
test('lessons: valid, deterministic, right size, for every stage and many seeds', () => {
  for (let stage = 0; stage < STAGES.length; stage++) {
    for (const seed of SEEDS) {
      const qs = buildLesson(stage, seed);
      assert.equal(qs.length, QUESTIONS_PER_LESSON);
      assertValidQuestions(qs);
      assert.deepEqual(buildLesson(stage, seed), qs, 'same seed must give the same lesson');
    }
  }
  assert.notDeepEqual(buildLesson(0, 1), buildLesson(0, 2));
});
```

**Unambiguity.** The keyed answer is right, and no distractor is also right:

```ts
// src/games/akshara-paricaya/logic.test.ts
          const labels = q.options.map((o) => (reading ? (o.text ?? '') : devaToIast(o.sa ?? '')));
          assert.equal(new Set(labels).size, 4, `ambiguous options in ${q.id}: ${labels.join(', ')}`);
          assert.equal(labels.filter((l) => l === devaToIast(target)).length, 1);
```

**Content checks.** Whatever Sanskrit the game holds or derives is well-formed and unique:

```ts
// src/games/smrti-yugala/logic.test.ts
test('deck: unique, well-formed akṣaras with unique sounds', () => {
  assert.equal(new Set(DECK).size, DECK.length);
  for (const a of DECK) assert.equal(validateDeva(a).ok, true, a);
  assert.equal(new Set(DECK.map((a) => devaToIast(a))).size, DECK.length);
});
```

For games with levels, `testMatrix(manifest.levels)` from `@sdk` yields 25 seeds for every
supported level; loop over it instead of hand-picking seeds. A game built on the quiz engine can
drive the state machine directly:

```ts
// src/games/akshara-paricaya/logic.test.ts
  let s = createQuiz(buildLesson(1, 99));
  for (let q = currentQuestion(s); q; q = currentQuestion(s)) s = advance(submit(s, answerOf(q)));
  const r = quizResult(s);
  assert.equal(r.outcome, 'completed');
  assert.equal(r.correct, QUESTIONS_PER_LESSON);
```

## 3. Contract tests

You do not write these per game; they run *on* your game. `tests/contract/games.test.ts` checks
every folder under `src/games` and `labs`: required files, a valid manifest, pure `logic.ts`,
allowed imports, scoped CSS without hex colours, `PRD.md` sections, and that every Devanagari
string literal in the game's source is NFC and well-formed (`validateDeva`).
`tests/contract/platform.test.ts` guards the platform itself. Its import rule is plain data:

```ts
// tests/contract/platform.test.ts
const MAY_IMPORT: Record<Layer, readonly Layer[]> = {
  sanskrit: [],
  content: ['sanskrit'],
  sdk: ['sanskrit', 'content'],
  ui: ['sanskrit', 'content', 'sdk'],
  games: ['sanskrit', 'content', 'sdk', 'ui'],
  app: ['sanskrit', 'content', 'sdk', 'ui', 'games'],
};
```

Add a contract test when a rule should hold for *every* game or for the platform as a whole and
can be decided by reading files. Give each scanner a self-test (a known-bad and a known-good
input), as the layering and link checks do.

## 4. Browser tests

Browser specs drive the built app with the Playwright library through `tests/e2e/harness.ts`. They
never guess what is on screen: the game publishes a small JSON snapshot with `ctx.expose`, and the
test reads it.

**In the game** — publish what a bot needs to play right *and* wrong:

```tsx
// src/games/smrti-yugala/Game.tsx
  useEffect(() => {
    ctx.hud({ progress: state.matched.length / pairs, label: `${state.moves} moves` });
    ctx.expose({ phase: state.done ? 'done' : state.pending ? 'pending' : 'playing', cards: state.cards.map((c) => ({ index: c.index, key: c.key })), matched: state.matched, moves: state.moves });
  }, [state, ctx, pairs]);
```

`ctx.expose` is a no-op unless the URL has `e2e=1` (the harness adds it), so nothing leaks into
normal play. Keep the snapshot small and serialisable.

**In the spec** — open the game with a fixed seed, read the snapshot, press real buttons by
`data-testid`, and finish on the shared result screen:

```ts
// src/games/smrti-yugala/e2e.spec.ts
gameSuite('smrti-yugala', ({ open }) => {
  test('a perfect memory clears the board in 8 moves for 3 stars', async () => {
    const g = await open({ mode: 'practice', seed: 21 });
    await g.waitForState("s => s.phase === 'playing'");
    const { cards } = await g.state<Snap>();
    assert.equal(cards.length, 16);
    const done = new Set<string>();
    for (const c of cards) {
      if (done.has(c.key)) continue;
      done.add(c.key);
      const partner = cards.find((x) => x.key === c.key && x.index !== c.index)!;
      await g.tap(`card-${c.index}`);
      await g.tap(`card-${partner.index}`);
    }
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'won');
    assert.equal(rec.stars, 3);
    assert.equal(rec.result.score, 160);
    assert.match(rec.result.share ?? '', /8 moves/);
    await expectNoOverflow(g);
    g.expectClean();
    await g.close();
  });
```

A `<QuizRunner>` game needs even less — `playQuiz` plays any quiz from its snapshot, optionally
answering every n-th question wrongly:

```ts
// src/games/akshara-paricaya/e2e.spec.ts
  test('mistakes show corrective feedback, cost hearts, and wrong items are retried', async () => {
    const g = await open({ seed: 5 });
    await g.tap('stage-0');
    const answered = await playQuiz(g, { wrongEvery: 6 });
    assert.ok(answered > 12, 'wrong answers are re-asked at the end');
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'completed');
    assert.ok((rec.result.correct ?? 0) < 12);
    g.expectClean();
    await g.close();
  });
```

### Harness API

`import { … } from '../../../tests/e2e/harness'` (from a game folder).

| Export | What it does |
|---|---|
| `gameSuite(id, ({ open, openRoute, url }) => { … })` | A `describe` block with one static server and one browser for the file. Declare `test(…)`s inside. |
| `suite(name, (h) => { … })` | The same without a game (used by the shell spec). |
| `playQuiz(g, { wrongEvery?, maxSteps? })` | Plays a `<QuizRunner>` game to the end; asserts the feedback shown matches what it answered; returns the number of questions answered. |
| `expectNoOverflow(g)` | Fails if the page is wider than the viewport. |

`open(options)` starts the game with test hooks on and waits until it has loaded:

| Option | Default | |
|---|---|---|
| `mode` | the manifest's first mode | `'daily' \| 'practice' \| 'endless' \| 'timed'` |
| `level` | player setting | `0`–`5` |
| `seed` | random, or the daily seed | fixes the session |
| `script` | `'deva'` | `'iast'` switches the app's script |
| `viewport` | `{ width: 390, height: 844 }` | under 600 px wide the context is touch + mobile |
| `labs` | `false` | needed to open a `labs/` game |

`openRoute(hash, viewport?, fresh?)` opens any route (for example `'#/games'`); `fresh: true`
starts as a first-time visitor and waits for the welcome screen instead of the app.

Both return a `GameSession`:

| Member | |
|---|---|
| `page` | the Playwright `Page`, for anything the helpers do not cover |
| `state<T>()` | the latest `ctx.expose` snapshot |
| `waitForState(predicate, timeoutMs = 10000)` | waits until the snapshot satisfies a predicate, given as source text: `"s => s.phase === 'playing'"` |
| `tap(testId)` | clicks the first element with that `data-testid` |
| `expectResult(timeoutMs = 20000)` | waits for the result screen; returns `{ result, xp, stars }` as recorded by the shell |
| `errors`, `expectClean()` | console errors, page errors and failed requests collected so far; `expectClean` fails if there are any |
| `close()` | closes the page |

The browser context uses reduced motion and a device scale factor of 2. Set
`SAMSKURU_BROWSER_CHANNEL=chrome` to use an installed Chrome instead of the downloaded Chromium.

## 5. The gate

`npm run check` runs, in order and stopping at the first failure: registry generation →
type-check → content validation (`npm run validate`) → unit tests → contract tests → production
build → (with `-- --e2e`) browser tests. A change merges only when it is green.

### How `--game=<id>` isolation works

With `npm run check -- --e2e --game=<id>` every step is narrowed to your folder:

- **type-check** runs over the repo but reports only errors under `src/games/<id>/` (or `labs/<id>/`) and tells you how many it ignored elsewhere;
- **unit** runs only `games/<id>/` tests; **contract** runs the game rules for your folder only and skips the platform-wide guards;
- **content validation** and the full **build** are skipped;
- **browser tests** build *only your game* (plus the platform) into a private folder `.e2e/<id>-<pid>/` without a service worker, serve it on a free port, run your `e2e.spec.ts`, and delete the folder.

So a neighbour's half-finished game cannot fail your gate, and many gates can run at once on one
machine. The full gate still runs in CI before merge.

## Per-game test checklist

`logic.test.ts`:

- [ ] **Win path** — a perfect bot wins or completes on every level × seed
- [ ] **Lose path** — a failing bot loses (if the game can be lost), and nothing happens after the end
- [ ] **Every level** in `manifest.levels`, over **≥ 25 seeds** each (`testMatrix`)
- [ ] **Determinism** — the same seed and level give deeply equal sessions; different seeds differ
- [ ] **Termination** — a random bot always finishes, with a step guard
- [ ] **Unambiguous answers** — exactly the keyed answer(s) are accepted; no distractor is also correct; alternates (vikalpa), free word order and homographic forms are all accepted
- [ ] **Content** — every Sanskrit string is well-formed (`validateDeva`), comes from a pack (`@content/<pack>`) or engine, and has enough variety (no repeats within a session)
- [ ] **Scoring** — stars and score thresholds; the `mastery` item ids are stable

`e2e.spec.ts`:

- [ ] **Full session to the result screen** with the expected outcome, stars and score
- [ ] **Wrong-answer feedback** — a mistake shows the correction and costs what it should
- [ ] **360 px and desktop** — `expectNoOverflow` at a phone viewport and at 1280 × 800
- [ ] **IAST script** — `open({ script: 'iast' })` shows romanised Sanskrit (or, for a script-teaching game, still shows Devanagari where it must)
- [ ] **Keyboard only** — one path played with `g.page.keyboard` and no taps, if the game has key controls
- [ ] **No console errors** — `g.expectClean()` at the end of every test
- [ ] **Daily determinism and share card** (daily games) — two sessions get the same puzzle; the result has a `share` string with no spoilers
- [ ] **Resume after reload** (when the game saves progress in `ctx.store`) — `g.page.reload()` mid-session continues where it stopped

## Debugging

- **Look at it.** `node tools/screenshot.mjs "#/play/<id>?e2e=1&seed=3" --game=<id>` builds just your game into a private folder and saves a phone-sized screenshot under `.shots/` (it prints browser errors too). Add an output path as the second argument, and `--desktop`, `--dark`, `--full`, `--click=testid,testid` (press things first), `--wait=ms`. Without `--game` it uses `dist/` — run `npm run build` first, and add `e2e=1` to shell routes (`"#/learn?e2e=1"`) to skip the first-run welcome screen.
- **Replay a session.** A failing simulation prints its seed; open `#/play/<id>?seed=<n>&level=<l>` in `npm run dev` to see the same session.
- **Run one file.** `node --import tsx --test src/sdk/quiz.test.ts` runs a single unit-test file; add `--test-name-pattern="lives"` to run matching tests only.
- **Change the reporter.** `SAMSKURU_REPORTER=dot npm test` for a compact run, `SAMSKURU_REPORTER=spec` (the default) for one line per test.
- **Inspect a browser test.** `g.state()` and `g.errors` are plain values — log them. `await g.page.screenshot({ path: 'debug.png' })` works anywhere in a spec. `await g.page.pause()` is useless in a headless run; take screenshots instead.
- **A browser spec cannot find `dist/`.** Specs are meant to be run through `npm run test:e2e`, which builds first and tells the harness where the build is.
- **Type errors from another game.** Use `node tools/typecheck.mjs --game=<id>` (the isolated gate does this for you).

## What is not tested automatically

Passing the gate does not mean these are fine. They need a person:

- **Whether the Sanskrit is right.** Tests prove content is well-formed, consistent with its sources and unambiguous in the game — not that a scholar agrees. Human Sanskrit review is a separate, mandatory step for `stable` ([SANSKRIT_ACCURACY.md](SANSKRIT_ACCURACY.md)).
- **Real-device feel.** Touch accuracy, scroll and keyboard behaviour on iOS Safari and Android Chrome, performance on a low-end phone, haptics, sound. Automated runs use desktop Chromium with a phone-sized viewport.
- **Other browsers.** Only Chromium is automated.
- **Fonts and shaping by eye.** A test can say a font loaded, not that a conjunct looks right.
- **Screen readers.** Labels and roles exist; nobody has automated listening to them.
- **Whether it is fun, and whether it teaches.**
- **Installed-PWA behaviour**: install prompt, home-screen icon, update after a new deployment, storage surviving a week.

### Manual QA script for a release

On one iPhone (Safari) and one Android phone (Chrome), from a fresh install of the release build:

1. Open the site. The welcome screen appears; choose a level and a script; the Learn screen shows.
2. Install to the Home Screen. Launch from the icon: standalone, correct icon and name, no browser bars.
3. Play one lesson-style game and one custom game to the result screen. Check stars, XP and the streak; tap Share and paste the text somewhere.
4. Answer wrongly on purpose: feedback is clear, the right answer is shown in correct Sanskrit.
5. Play today's daily twice: the second attempt earns only +2 XP, and the daily card still shows the first attempt as done.
6. Switch to IAST in Me → Settings; return to a game: all Sanskrit is romanised, with diacritics.
7. Switch the theme to dark, turn on Reduce motion: everything is readable, nothing flashes.
8. Rotate the phone and come back; background the app for a minute and return mid-game.
9. Turn on aeroplane mode, kill and relaunch the app: it opens and a game is playable.
10. Close and reopen: XP, streak, settings and unlocked stages are still there.
11. With a hardware keyboard or on a laptop: play one game without the pointer.
12. Turn on VoiceOver / TalkBack for one question: the prompt, options and feedback are announced, Sanskrit in the Sanskrit voice or at least not skipped.
13. Read every Sanskrit string you met in new or changed games against the PRD's sources. Anything doubtful is a P0 ([CONTRIBUTING.md](../CONTRIBUTING.md#reporting-a-sanskrit-error-p0)).
