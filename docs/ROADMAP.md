# Roadmap — platform features beyond v1

What the platform (not individual games) should grow next, in priority order. The source is the
product research in [research/games-research.md](research/games-research.md) — section 1 (what
makes Duolingo-style products habit-forming) and section 4 (cross-cutting platform features) —
re-read against what the code does today. Game ideas live in the PRD index, [prd/README.md](prd/README.md).

**Priorities.** MUST: needed for the v1 promise (daily habit, trustworthy Sanskrit, progress that
is not lost). SHOULD: clear value, soon after. LATER: needs a backend, recorded audio or a large
content effort. **Needs** says what the feature depends on: *local* (device storage only),
*content* (new verified packs or assets), *backend* (a server; see
[ADR 0006](adr/0006-local-first-progress-no-backend-in-v1.md)), *contract* (a change to the game
SDK — affects every game, so it needs an ADR).

## Where v1 stands

Already in the platform: one app-wide streak with freezes (one earned per 7-day run, two held at
most); bounded XP with a daily goal and weekly chart; per-game stats and personal bests; daily
puzzles with one scored attempt and a share card; per-item Leitner mastery and per-skill bars
(recorded for every game, but there is no review screen yet); achievements; a learning path
derived from game manifests per level; Devanagari / IAST switch; light and dark themes; reduced
motion; offline play; a first-run choice of level and script; Labs.

## MUST

| Feature | Why | Needs |
|---|---|---|
| **Keep progress safe: install prompt, persistent storage, export / import** | Safari can delete a browser tab's storage after a week away; an installed app is not affected. Prompt iOS users to install, request `navigator.storage.persist()`, and let anyone save and restore progress as a file. Without this a streak — the main habit mechanic — can vanish. | local |
| **Review hub (Abhyāsa): mistakes and due items from every game** | Mastery data is already collected per item with due dates (`dueItems`); nothing uses it yet. A "review what is due" session is the highest-value use of existing data and the core of spaced repetition. | local; contract (games must be able to serve an item by id) |
| **Daily quests** | Three small goals a day, seeded by the date and weighted to the learner's weakest skills. In a many-game app this is the main tool for spreading play across skills instead of one favourite game. | local |
| **Guidebook card per skill / unit** | A one-screen paradigm or rule with three examples, reachable from the "?" in any game: explanation at the moment of need, without lecturing. | content (human-reviewed); small shell change |
| **Streak calendar and gentle streak copy** | Make the commitment visible (a month view, the rest days used) and keep the tone warm, never guilt-laden. The data (`xpByDay`, streak, freezes) exists. | local |
| **Timed "tvarita" mode as a platform convention** | A 90-second variant of matching-type games gives arcade energy without paid retries. `timed` is already a `GameMode`; the shell needs a shared countdown presentation and result framing. | local; per-game opt-in |
| **Human Sanskrit review workflow visible in the app** | Show per game whether its content is machine-verified or human-reviewed, and a "report an error" link that pre-fills game, level and seed. Trust is the product. | local; process |
| **Accessibility baseline: text size, high-contrast and colour-blind-safe states** | Larger Devanagari on demand; tile and feedback states distinguishable without colour (shapes or marks as well as green / yellow / grey). | local (design system) |

## SHOULD

| Feature | Why | Needs |
|---|---|---|
| **Placement test** | A short quiz at first launch (or later) that sets the level, so learners past the basics are not bored by script drills. Today the level is self-declared. | content; local |
| **Streak earn-back** | Restore a broken streak by finishing two sessions within 48 hours — a second safety net against "I've blown it, why bother". | local |
| **Streak society: milestones at 7, 30, 108, 365 with share cards** | Status tiers and a shareable moment at each milestone drive organic sharing; a "perfect week" marker rewards consistency. | local |
| **Roman-input IME for typing answers** | Many learners type IAST or an ASCII scheme faster than they can use the akṣara keyboard. An input method that turns Roman keystrokes into well-formed Devanagari unlocks "translate by typing" exercises on desktop. | local (shared with `src/sanskrit` transliteration) |
| **Stories (Kathā)** | Short dialogues and Pañcatantra-style micro-stories with inline tasks: reading in context, the step between drills and real texts. | content (heavy; human-reviewed); new shell format |
| **Legendary / Suvarṇa runs** | A harder replay of mastered material (no hints, fewer mistakes allowed) gives completionists a mastery goal and a gilded path node. | local; contract (a difficulty flag in `ctx`) |
| **Monthly badge and seasonal events** | A medium-term goal between the day and the year, named for the season or a festival (for example Saṃskṛta-dinam). | local |
| **Weekly self-comparison** | "Beat your own last week" replaces leagues until there is a backend; per-game personal bests already exist. | local |
| **Per-skill mastery wheel and exam readiness** | One picture of all skills, and an estimate of readiness for a Samskrita Bharati level — a reason to practise the weak ones. | local |
| **A small cast and Sanskrit praise lines** | Static illustrations (a parrot, an elephant calf, a teacher) and short phrases (*sādhu!*, *uttamam!*) give feedback a voice. | content (art) |
| **Printable daily puzzles and a projector view** | Lets a teacher use the daily in class with no accounts: the first step towards class mode. | local |
| **Lazy-loaded content packs** | Keeps downloads small as the lexicon and verse banks grow ([ARCHITECTURE.md](ARCHITECTURE.md#scaling-to-100-games)). | contract; build |
| **FSRS scheduling** | A better scheduler than five Leitner boxes once enough answer data exists; the per-item records are already keyed for it. | local |

## LATER

| Feature | Why | Needs |
|---|---|---|
| **Accounts and sync** | The same progress on phone and laptop; recovery after a lost device. The profile is one serialisable value changed by pure functions, so this is a merge design, not a rewrite. | backend |
| **Leagues and class-code leaderboards** | A weekly reason to do more than the minimum. For this audience a board for one teacher's batch suits better than strangers. | backend |
| **Friend and class quests, shared streaks** | Social accountability; the natural form here is a class streak for a weekly study group. | backend |
| **Teacher / live class mode** | A teacher hosts a quiz or a Tambola caller and students join with a code; assignments for the week's unit. | backend |
| **Notifications** | Reminders are the main channel for bringing people back, but web push needs a push service and, on iOS, an installed PWA. Until then: a calendar-reminder file and the install prompt. | backend |
| **Audio: recorded pronunciation, chanted verses, listening exercises** | Trains the ear and makes the metre games real. Must be recorded human audio keyed by content id — no synthetic Sanskrit of doubtful quality. | content (recordings); contract (`ctx` audio API); bundle strategy |
| **Text-to-speech and speech input** | Listen-and-type and speak-the-sentence exercises. No dependable Sanskrit speech recognition exists today; revisit when it does. | external service or on-device model |
| **Cosmetic unlocks** | Tile skins and themes as variable rewards, instead of a currency or a shop. | local; art |
| **Generated conversation / role-play** | Conflicts with the closed-world Sanskrit rule ([ADR 0004](adr/0004-verified-content-packs-and-closed-world-sanskrit.md)); only with a validation path we trust. | research |
| **Native app wrapper** | Store presence, reliable storage and haptics on iOS ([ARCHITECTURE.md](ARCHITECTURE.md#path-to-a-standalone-app)). | build; store accounts |
| **Privacy-respecting analytics** | Which games teach and which are abandoned. Opt-in, aggregate, no personal data — and only once there is someone to read them. | backend; policy |

## Deliberately not planned

- **Hearts or energy that cap free play.** A monetisation gate with nothing to sell here. Lives exist only inside a game whose format needs them, and reset every run.
- **Gems, shops and paid retries.** No currency.
- **Manufactured urgency** (happy hours, expiring chests). The daily puzzle is deadline enough.
- **Shaming streak messages.** Never.

## How an item leaves this page

Platform features follow the same route as games: a short spec (a PRD from
[prd/TEMPLATE.md](prd/TEMPLATE.md), or an ADR when it changes the contract or adds a dependency),
tests first, the full gate, human review. See [CONTRIBUTING.md](../CONTRIBUTING.md).
