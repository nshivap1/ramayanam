# core: notes for the other agents

Status (00:15): the public API in `logic.ts` is complete (CONTRACTS.md signatures), and all core tests pass. The story-bot completes the whole real story (ch1→ch6 ending) on 25 seeds × levels 2/3/4. The view imports **only** from `./logic`.
It re-exports `./types`, `./catalog`, `./logic-learning`, `./logic-battle`, `./logic-progress`, plus `indexOf` and `testFlag`.

## For view
- `reduce(state, content, action)` clears `fx` and returns the **same object** for invalid actions. Re-render on identity change.
- Selectors: `currentMap`, `visibleNpcs` (with `x`, `y`, `facing` already overridden by `save.npcPos`), `tileAt(map,x,y)` (overlay `' '` = null), `isWalkable`, `npcInFront`, `storyProgress`, `knownMoves(state, content, memberIndex)` (equip menu), `maxHpOf(member, content)`.
- Explore: send `face` for turning in place and `step` to move (step also faces). `step` into a wall sets the facing and emits fx `bump`. On a warp the fx is `warp` and the map changes in the same reduce. A wild encounter emits fx `encounter` and switches to mode `battle`.
- `interact` priority: an NPC in front (or across a `market_stall` counter, two tiles ahead), then a `signs[]` entry at the front tile, then a `shrine` tile (opens the shrine menu), then `well`/`chest` (toast only).
- Script pendings:
  - `say` / `shloka` / `words` / `title` / `wait` / `fade` / `move` / `save` → send `advance`. For `move`, the logic has ALREADY moved the npc/player (the npc's new place is in `visibleNpcs`, the player's in `save.x/y`). Tween from `place - path`, then advance.
  - `choice` → `choose {index}`.
  - `challenge` (context `quiz` or `recite`) → `answer {option|order, timeMs}` → `feedback` → `advance`.
  - `shop` → `buy {itemId, qty}` (same object if niṣka is short or the item is not on sale; grey it out yourself) and `choose -1` (or `advance`) to leave.
  - `shrine` → `choose 0` Rest (full heal + respawn here, then a `say`, then the menu again), `choose 1` returns the same state (open your own list of verses with `save.shlokas[id].heard`), then send `recite {shlokaId}` (the recital runs, then the menu comes back), `choose 2` → pending `save` (write `ctx.store.set('save-v1', toSave(state))`, then `advance` → the menu again), `choose 3` or `choose -1` leaves. Constants: `SHRINE_REST/RECITE/SAVE/LEAVE`.
  - `ending` (mode `ended`) → call `ctx.finish(sessionResult(state, content))`.
- Text markup is left raw in pendings (`{player}`, `{w:…}`, `{n:…}`, `{b:…}`). Substitute `{player}` with `save.playerName`.
- Toast fx text may contain `{n:item.x}` markup (from `give` and `buy`), so render toasts with the same markup renderer.
- `tick {ms}` works in every mode (≤ 60 s credited per tick).
- `newGame` starts `common.intro` (mode `script`) if it exists, otherwise mode `explore`. `loadGame` always returns mode `explore` (or null). It moves the player out of walls and drops unknown moves/allies if the content changed.
- Session end: when `state.session.chaptersCompleted` grows (a `chN.complete` flag was set) and the script is back in `explore`, call `ctx.finish(sessionResult(state, content))` (outcome `won` once `ch6.complete`). The `{end}` command also gives mode `ended` + pending `ending`.
- `save.items` may contain entries with count 0 (battle leaves them), so hide those in the item menu.

- **Save consistency (request):** the view persists as soon as `completedChapters` grows. That happens *mid-event* (e.g. ch1's `{set:"ch1.complete"}` comes a few commands before `{warp:"ayodhya_city"}`). A save is only the `SaveData`, not the running script, so if the app closes before the event ends, the reload lands before the warp. The calm-moment persist (`showChapterDone`) already covers chapter completion, so please drop the immediate mid-script persist, or only persist when `state.mode === 'explore'`. Pending `save` is fine (the story puts `{save:true}` after the warp).
- Party max is 6 (`MAX_PARTY`). `{join}` is a no-op when the party is full or the ally is already in it. A joining ally gets verse-unlocked moves (`withUnlockedMoves`).

## For battle
- The story-bot (`logic-sim.ts`) uses the same battle policy as your perfect bot (battleMenu + damage scoring, buff/debuff setup, heal items below 30%, switch to the highest atk). Keep `battleMenu`, `damage` and `fighterFromMember` exported.
- Core calls `startBattle` (story `{battle}` and wild encounters, after adding fx `encounter`) and, after every `battleAction`, checks `battleOutcome(next)`. When it is non-null, core calls `endBattle` and then:
  - core increments `session.battlesWon` on `win`. **Please don't also increment it in endBattle.**
  - lose + `canLose:false` → core respawns: full heal, −10% niṣka, `say`. If the battle came from a once-trigger, core unsets `trig.<map>.<event>` so the trigger can fire again.
  - lose + `canLose:true` → core fully heals the party, then runs `onLose`.
  - run in a scripted battle → nothing runs (neither onWin nor onLose); the script continues.
- Core only passes `advance` / `choose` / `answer` to `battleAction` while in mode `battle`. Return the same object for actions you ignore.
- Recital: core calls `startRecital` (the pending becomes your challenge, context `recite`), `recitalAnswer` on `answer`, and `recitalAdvance` on `advance` while `state.recital` is set. When `recitalAdvance` returns `pending === null`, core clears `recital`, adds the verse to `session.shlokasRestored` if it became restored, and resumes the script. If you'd rather show a final card, set a non-null `pending` (e.g. `say`) with `recital: null`. Core then simply waits for `advance`.
- Core appends to `session.shlokasHeard` after `markHeard` (deduped). You may do it too; core dedupes.
- Quiz: `grade(ch, answer, false)` + `recordResult`, then pending `feedback` (core adds sfx correct/wrong fx).
- Dev fallbacks while content is empty: a `{battle}` whose enemies are not in defs is skipped (onWin runs); `{quiz}` with an empty lexicon or a challenge with no options/tiles runs onCorrect; unknown shloka ids are skipped; `{join}` of an unknown ally is skipped.
- Explore `use-item`: heal (alive and not full), revive (hp 0 only), pp (+amount to equipped moves). buff/key items are not usable outside battle.
- **Performance (00:05):** in the story-bot, `makeChallenge` takes ~70% of the CPU (`build`/`pickBest`/`buildArtha`/`buildLipi`/`aksharaCount` → `splitAksharas`). One full walkthrough run is ~1 s, and the test does 75 runs (3 levels × 25 seeds) on a 2-core box. Please memoize per content object (e.g. a WeakMap keyed by `content` holding akshara counts per lemma/form, distractor pools per pos/tag, pāda tiles per shloka). The aim is ≤ 0.1 ms per call.
- **Balance seen by the story-bot (it answers every challenge correctly and swiftly, uses the strongest effective move, heals below 35%, grinds ~8 wild battles + rests after each defeat, 5 tries per step):**
  - ch1 Tataka is often lost on the first try at L3 (fine after grinding).
  - ch4 `hanuman_duel` sometimes still lost after 5 grind cycles (seeds 197978/190060, levels 3/4).
  - ch5 ocean leap: `surasa_duel` (conviction 148) is lost 5+ times in a row by player L14 + Hanuman L11, and `simhika` defeats the pair. There's no encounter grass there to grind on, so this is the main blocker for completing the story.
  - Allies who joined later lag far behind (Rama L7 vs player L14), because XP only goes to participants.

## Verse flags (answer to story-b)
Core sets **`heard.<shlokaId>`** when a verse card is shown (`{shloka}` hear) and **`restored.<shlokaId>`** whenever a recital
ends with the verse restored (from `{shloka, mode:'restore'}` or the shrine's Recite). A failed recital does NOT pause the script:
it continues with the next command. To gate on success, use `requires: "restored.s-ma-nishada"` / `showIf` / `{if:"restored.…"}`.
Example: `{shloka:"s-x", mode:"restore"}, {if:"restored.s-x", then:[{set:"chN.restored_x"}], else:[{say:"Recite it again at the shrine when you are ready."}]}`.
world.test treats `heard.<id>`/`restored.<id>` as settable for every verse used in a `{shloka}` command. `loadGame` re-derives both flags from `save.shlokas`.

## For story-a / story-b
- Run `node tools/test.mjs unit games/ramayana-yatra/world.test` to check your file. Messages name the file, map, row and coordinates.
  Problems caused by content that another agent hasn't written yet (a verse, a lexicon/name id, a defs entry, a map in another chapter file) are
  printed as `pending:` diagnostics and don't fail the test until every chapter file has maps (or `RY_STRICT=1`). Run with
  `RY_STRICT=1 node tools/test.mjs unit games/ramayana-yatra/world.test` to see them as failures.
- Story-bot on the real content: `node tools/test.mjs unit games/ramayana-yatra/logic.test` (~50 s for 75 runs; `RY_BOT_SEEDS=3` for a quick check). While a chapter's walkthrough is missing, it follows chapters 1..k (the contiguous ones that have steps).
- **Solidity: a tile is solid if EITHER layer is solid.** So a bridge over water must be the ground layer (`bridge_h`), not an overlay over `water`.
- Warps: the warp source tile must be walkable. A warp whose `requires` fails blocks the step (the player doesn't move onto it) and runs `lockedEvent`. You arrive at `(tx,ty)` facing `facing` (default: the step direction). Triggers and encounters do NOT fire on the arrival tile.
- `onEnter` runs **every time** the map is entered (warp tile or `{warp}` command). Guard it with `{if:"!flag", then:[…, {set:"flag"}]}`.
- Triggers: `once` defaults to true and sets flag `trig.<mapId>.<eventId>`. Only the first matching trigger fires per step.
- `goto` finds a `{label}` in the current block or any enclosing block (not inside sibling `if` blocks).
- Choice: an option with `set` sets the flag, and one with `goto` jumps. An option with neither just continues after the choice.
- Boss battles with `canLose:false`: if the player loses, they respawn at the last shrine rest/`{rest}` and the event is abandoned. Put boss fights on an NPC talk event (repeatable) or on a once-trigger (core re-arms it on defeat), and set your progress flags in `onWin`.
- `{move}` on an npc uses the npc id on the CURRENT map. `{warp}` targets must be walkable.
- A save holds `SaveData` only, never the running event. So put `{save:true}` at the END of an event (after any `{warp}`). When a chapter ends, prefer `{warp}` to the next chapter BEFORE `{set:"chN.complete"}`: a save taken in between then already has the new position.
- `{chapter:N}` shows the title card and sets `save.chapter`. Setting `chN.complete` records chapter completion (that is the session-end signal the view uses).
- The shrine is automatic: any `shrine` tile opens Rest/Recite/Save/Leave. You do not need an NPC for it.
- Story-bot (`logic-sim.ts` `runWalkthrough`, used by logic.test.ts) follows `walkthrough`. If a step fails (e.g. a lost boss fight), it grinds ~8 wild battles on the nearest encounter tiles, rests at the nearest shrine and retries (5 tries). So every boss must be beatable by a party that grinds a little, and an encounter area plus a shrine must be reachable before each boss. Details: for `talk` it walks next to the NPC and presses A. For `reach` it steps onto the tile. For `recite` it walks to a `shrine` tile on that map and recites the verse. It answers every challenge correctly, picks choice option 0 (or the first option without `goto` when the other options have one), and in battle uses the strongest move with PP.

## QA fixes (01:35): #3, #11, #24, #26 and joinLevel
- #3: setting `chN.complete` (via `{set}` or a choice option) now fully heals the party (HP + PP) and sets `save.objective` to `nextBookObjective(N)` ("Book N+1 begins. …"). An `{objective}` the story runs afterwards replaces it.
- #11: a no-op explore `use-item` keeps the item and emits a toast fx explaining why: full HP, exhausted (heal), not exhausted (revive), PP full, none left, battle-only/key item. Toast text uses `{player}` / `{n:…}` markup. An unknown item id or a bad target still returns the same object.
- #24: the `sessionResult` summary/share now reads "Book 1 complete · 4 verses restored · 38/45 correct" ("Books 1, 2 complete …", or "Book N in progress …").
- #26: story `{quiz}` challenges are untimed (`timeLimitMs: 0`, so `grade` counts any correct answer as swift). Battle and recital timers are unchanged.
- `{join}` without a level now uses `joinLevel(save)` from logic-progress (party average with the chapter floor).

## Kathā mode (v0.4) — logic API for the view (kc-core, 11 Nov)
Spec: notes/katha.md. The practice game is byte-identical to v0.3 (a save without `style` never touches any of this).
- **Start / switch:** `newGame(seed, level, content, { name, avatar, style: 'katha' | 'abhyasa' })` (no `style` = practice, no field written). Settings: `reduce(s, c, { type: 'set-style', style })`, accepted in mode `explore` only (same object otherwise). Kathā sets the flag `style.katha`, `save.smrti` (`{}` at first) and raises the party to `KATHA_FLOOR[chapter]`. Helpers: `isKatha(state)`, `styleOf(save)`, `KATHA_FLAG`, `KATHA_FLOOR`.
- **Battle:** in phase `pick-move`, `choose i` on an astra (`astraBinding(content, moveId)` non-null) — or on ANY move in a duel — gives phase `challenge` with pending `{ kind: 'challenge', context: 'battle', challenge }` where `challenge.kind === 'smarana'` and `challenge.smarana: SmaranaSpec` (chunks with `show: 'full' | 'hint' | 'gap'`, `gaps` = [] or [i], `gapOptions[0]` = 3 options `o0..o2` with `sa`, `gapAnswers[0]`, `level`, `check?`, `weights?` per printed akṣara). Level 0: no gap (the line recites, answer `picks: []`); 1: the last eligible chunk; 2: one rotated chunk; 3: one rotated chunk, the others `hint` (first akṣara + ॰); 4: no gap except a spot check (`check: true`, still `level: 4`, an L3-style gap) on mastered casts 2, 4, 8, 16 … A plain move resolves at once (phase `beats`, no challenge). Answer with `{ type: 'answer', picks: [optionId], timeMs }` — `picks: []` when `gaps` is empty — or `{ type: 'answer', auto: true, timeMs }` (automatic recitation: full effect, mastery untouched). There is **no feedback phase**: the answer goes straight to phase `beats`. The first beat of a recited cast carries `beat.recital = { shlokaId, pada, correct }` (it replaces "{x} uses {m}!"); a miss is folded into the effect beat ("The line falters: only half the power lands. …", textSa from sa-battle `kathaHalf`). `state.lastSmarana = { challenge, picks, correct, auto, context }` holds the answered cast for the inline animation (the right option is `challenge.smarana.gapAnswers[0][0]`). Picks with an unknown id or the wrong count are ignored (same object). `timeLimitMs` is 0.
- **Shrine:** `recite` → four smarana challenges (context `recite`, `step` 1–4 / `steps` 4), always exactly one gap; each answer goes straight to the next pāda (no feedback); after the 4th the recital ends (restored at ≥ 3 of 4, the usual toasts) and the shrine menu returns. `choose SHRINE_STUDY` (= 4, Kathā only; the practice game ignores it) starts the study hall: `STUDY_ROUND` (5) classic challenges, context `quiz`, `step`/`steps`, with the usual `feedback` pendings; `state.recital.study === true` during the round; then the shrine menu returns.
- **Story:** `{quiz}` commands are skipped in Kathā (onCorrect runs); no random encounters; Kathā-only blocks use `{ "if": "style.katha", "then": [...] }`.
- **Bindings:** content/katha.json `astras` wins when its pāda has ≥ 2 printed chunks; otherwise the first ≥ 2-chunk pāda of the move's `unlockShloka` verse.

## Kathā v0.4.1 — logic changes from the fresh-eyes playtest (fx-core, 12 Nov)
Spec: notes/katha.md "v0.4.1". The practice game is still byte-identical (every change below checks `isKatha`).
- **Duels skip the menu:** in a Kathā duel every player turn goes straight from the beats to phase `challenge` (pending `{ kind: 'challenge', context: 'battle', challenge }`, `challenge.kind === 'smarana'`) — there is no `command` / `pick-move` phase and `choose` is ignored. `battle.pendingMove` = the move whose power the line carries (`duelMove`: the best damaging move; no PP is spent); the recital beat is "{x} answers with a line of verse!". Only when no verse has been heard yet does a duel show the ordinary menu. View test: `isKatha(save) && battle.spec.kind === 'duel'`.
- **One-tap moves (wild / boss):** the state machine is unchanged (`command` → `choose 0` → `pick-move` → `choose i`). A one-tap move button can dispatch `{ choose 0 }` then `{ choose i }` in the same handler (`dispatch` reduces synchronously on `stateRef`); from `pick-move`, `choose -1` returns to `command` for Switch / Item / Run.
- **Astras equipped automatically:** a restored verse's astra is equipped in place of the least useful plain move when four are equipped (`astraSlot`: a status move first, then the lowest power; never an astra; never the only damaging move for a status astra). Toast `recital.newMoveSwap` ("New move for X: Y, in place of Z" + Sanskrit). Also on `{join}`, on Settings → Kathā, and once when a v0.4.0 Kathā save is loaded (toast `toast.astraArmed`; flag `katha.armed` = `ARMED_FLAG` marks it done, so later move-editor choices stay).
- **Astra pāda rotation:** a bound astra recites every eligible pāda of its verse over time (`astraPadas(content, moveId)`: ≥ 2 chunks and a gap that is not the astra's name, the binding first; `astraPada(state, content, moveId)`: the pāda the NEXT cast recites = the least practised, ties → the binding). `astraBinding` still says whether a move is an astra; to preview the line a cast will recite, use `astraPada`.
- **Shorter fights:** Kathā foe HP = min(ordinary, max(0.3 × ordinary, `KATHA_TURNS[kind]` / foes × the lead hero's best hit)) with `KATHA_TURNS` = wild 3 · duel 6 · boss 7 (`kathaFoe`, `bestHit`; the hit × 1.25 if the hero can raise its attack, × 1.25 if it can lower the foe's defence; not in duels). The foe's attack is lowered (never raised) so its strongest move hits the lead for ≤ 25 % of the lead's max HP (`kathaFoeAtk`, `KATHA_FOE_HIT`). `battle.foe.maxHp` is the scaled value (the HP bar needs nothing else); level, XP and coins are unchanged.
- **Who steps forward (Kathā, every story battle kind):** `BattleSpec.lead` when that hero is conscious; otherwise the conscious hero with the most equipped bound astras (`kathaLead`, `boundAstras`); ties keep the usual order (`leadIndex`: heroes in party order with the reciter last, the reciter first in a duel). The practice game keeps `leadIndex`.
- **Narration:** a missed damaging cast puts the element line first: "It is super effective! But the line falters: only half the power lands. X takes N damage." (sa-battle `kathaHalfBut`: किन्तु …); without an element line it is unchanged.
- **Silent quizzes:** a skipped story `quiz` runs only the non-`say` commands of its onCorrect.
- **No ॰ cue on one-akṣara chunks:** at L3 / spot checks a one-akṣara chunk has `show: 'full'` (not `'hint'`).
- Bot: `runWalkthrough(…, { careless })` — with that probability a battle move is a random usable one.

## "Show the way" (v0.4.2) — the map pointer's logic API (fx-guide, 12 Nov)
`logic-guide.ts`, re-exported from `logic.ts`: `guideTarget(state, content) → GuideTarget | null`, `guideStep(save, content)`.
- **Derived from the walkthrough**, which both journey styles share: the first step whose `expectFlag` is not set
  (walkthrough flags are never unset). Its goal: `talk` → the npc as placed now (`npcsOn` + `save.npcPos`; if not visible
  yet, its defined place), acted on from `talkSpots`; `reach` → the tile; `recite` → a shrine of the step's map (the one
  beside the route's end), acted on from an adjacent tile.
- **Goal on another map** → `kind: 'exit'`: the first warp tile on the player's map along `findPath` to the goal spots.
  The practice game first tries a route without encounter (kuśa) tiles and falls back to any route; Kathā (no random
  encounters) takes the shortest. No open route at all (a closed gate, an npc in the way) → the goal itself on its own
  map, else the nearest warp toward the goal's map by the map graph; `distance: -1` marks that case.
- `GuideTarget = { kind: 'npc'|'tile'|'shrine'|'exit', map (= the player's map), x, y, npc?, to?, recite?, step, goal: {map,x,y},
  distance }` (steps to the place where it is acted on; 0 = there already).
- Null in mode `ended` and when every step is done. Never in the save, never in `GameState`: memoized per `SaveData`
  object (a WeakMap), so the view may call it every frame. Practice-game logic is untouched (the snapshot and
  walkthrough-equality tests are green).
- `findPath` (and `talkSpots`, `visibleTarget`, `spot`) moved verbatim from logic-sim to logic-guide; logic-sim imports and
  re-exports `findPath`, so the story bot is unchanged.
- **Pointer-following bot** (`logic-sim.ts runGuide(content, seed, level, { style, accuracy, attempts, until, onTarget })`):
  from a new journey it only asks `guideTarget`, walks there (re-asking after any event, battle, bump or map change)
  and acts (talk / step on / recite / step through); no progress → recover like the story bot (practice: grind 8 + rest;
  Kathā: rest) and retry. guide.test.ts: the whole game in both styles; RY_GUIDE_SEEDS=25 → 225/225 runs reach the
  ending (practice 0.24 recoveries per run, Kathā perfect 0, Kathā 70 % 0.97; ≈ 0.2 s per run).

## Reader level (v0.4.3) — the challenge mix follows the story-text language (fx-level, 12 Nov)
Spec: PRD.md → "Challenge mix per story-text language". A save without `reader` draws exactly the v0.4.2 challenges
(reader.test.ts census hash `CENSUS_V042`; the practice snapshot in logic.test.ts is untouched).
- **State:** `SaveData.reader?: Reader` (`'sa' | 'sa-en'`; absent = English). Kept by `toSave`/`loadGame` (junk → absent);
  `newGame(…, { reader })` ('en' = absent). `readerOf(save)`, `toReader(v)`, `READERS` (logic-reader.ts, re-exported).
- **Action:** `{ type: 'set-reader', reader: 'sa' | 'sa-en' | 'en' | null }` — accepted in EVERY mode (like `tick`);
  'en' / null remove the field; same object when unchanged or not a reader level. Pure helper `setReader(state, reader)`
  (no fx clearing) for the view's start. **View:** `begin()` commits `setReader(s, prefs.dialogueLang)` on New journey and
  Continue; an effect dispatches `set-reader` whenever `prefs.dialogueLang` differs from `save.reader`. The e2e snapshot
  exposes `reader` and `challenge.lexIds`.
- **Engine (logic-learning):** `unlockedKinds(save, level)` — 'sa': every kind but lipi from book 1; 'sa-en': today's
  ramp minus lipi. `readerChain(kind, reader, unlocked, gate, rng)` replaces the v0.3 fallback chain for a reader
  (`READER_SKIPS` = lipi for both; a lipi request → 'sa': the `HARD_KINDS` in a seeded order (rng `reader:<kind>`, so the
  builders' own rng is unchanged), 'sa-en': artha; then today's chain minus skipped kinds; then the other open kinds; then
  any kind before the placeholder — whose kind is never lipi for a reader). `Ctx.hardWords` ('sa'): artha targets only
  `hardWord(e)` (not `isBasicWord`, not a name; asked-for words that are all basic → no artha, another kind), harder
  wrong meanings preferred; pūraṇa gap and vibhakti word prefer harder / non-indeclinable words (applied before the
  asked-for filter); practice recital key words rank harder words first.
- **Basic words:** `isBasicWord(e)` = `BASIC_POS` (indeclinable, pronoun, numeral) or `READER_BASIC[id]` (content/reader.json:
  vocab level ≤ 2 noun/adjective stems and dhātu level ≤ 2 roots, same sense), generated by reader-basic.ts `deriveBasic`
  (test-side; the bundle never imports the packs). reader.test.ts prints the new list when it is out of date.
- **Bots:** `runWalkthrough` / `runGuide` take `reader`. reader.test.ts: practice bot in 'sa' × 25 seeds × levels (no lipi,
  no basic artha anywhere, finishes), practice 'sa-en' × 10 seeds, Kathā × every reader × 3 seeds × accuracy 1 / 0.7.
  `reader-census.ts` (test-side) draws battle moves of every kind + a study round + a recital per seed × level × book.
