# Build contracts — who owns what, and how modules talk

Game folder: `src/games/ramayana-yatra/`. Read first: `/AGENTS.md`, `/docs/GAME_CONTRACT.md`, `/docs/SANSKRIT_ACCURACY.md`, then `DESIGN.md`, `types.ts` and `catalog.ts` in this folder.

## Hard platform rules (enforced by tests/contract/games.test.ts)
- Imports inside the folder must start with `./`. **No `../`.** So every module lives flat in this folder (prefix names: `logic-*.ts`, `view-*.tsx`, `art-*.ts`). JSON lives in `./content/` (JSON imports nothing, so subfolders are fine for it).
- Allowed imports: `./…`, `@sdk`, `@ui`, `@sanskrit`, `react`. (No `@content` until 8 am; we don't need it.)
- `logic.ts` and every `logic-*.ts` must be pure. No React, DOM, `window`, `document`, `localStorage`, `Date`, `Math.random`. Randomness comes from `rngFor(state, label)` + `bump(state)` in `logic-util.ts`.
- No `Math.random` anywhere in the game (views included). Cosmetic randomness can use `createRng(seed)` from `@sdk`.
- `style.css`: every selector contains `.g-ramayana-yatra`, keyframes are named `g-ramayana-yatra-*`, **no hex colours** (use `var(--…)` tokens from `src/ui/tokens.css`). Canvas pixel-art palettes in TS are fine.
- Sanskrit on screen only through `<SaText>` (DOM) or `renderSa(deva, script)` (canvas/aria). Content stores **Devanagari only**, and IAST is derived. Never type Devanagari or IAST string literals in `.ts`/`.tsx` code. Sanskrit comes from `./content/*.json` (validated) or `@sanskrit`.
- Exactly one `ctx.finish` per session. `ctx.hud` feeds the shell top bar. `ctx.expose` publishes the e2e snapshot.
- Sounds: `ctx.sfx('tap'|'correct'|'wrong'|'win'|'lose'|'merge'|'tick'|'levelup')`. Optional game music (`audio.ts`) must respect `ctx.settings.sound` and stop on unmount.

## Ownership (one owner per file; never edit another owner's file, leave a note in `notes/<you>.md` instead)

| Owner (agent) | Files |
|---|---|
| orchestrator | `types.ts`, `catalog.ts`, `content.ts`, `logic-util.ts`, `CONTRACTS.md`, `DESIGN.md`, `manifest.ts`, `PRD.md` |
| **content-a** (verses, kāṇḍas 1–3) | `content/shlokas-1.json`, `content/lexicon-1.json`, `notes/content-a.md` |
| **content-b** (verses, kāṇḍas 4–6) | `content/shlokas-2.json`, `content/lexicon-2.json`, `notes/content-b.md` |
| **content-v** (names + verifier) | `content/names.json`, `content.test.ts`, `REVIEW.md` |
| **core** (engine logic) | `logic.ts`, `logic-state.ts`, `logic-world.ts`, `logic-events.ts`, `logic.test.ts`, `world.test.ts` |
| **battle** (battle + learning logic, balance) | `logic-battle.ts`, `logic-learning.ts`, `logic-progress.ts`, `battle.test.ts`, `learning.test.ts`, `content/defs.json` (moves, allies, enemies, items) |
| **art** (pixel art + audio) | `art.ts`, `art-*.ts`, `audio.ts`, `art.test.ts` |
| **story-a** | `content/story-common.json`, `content/story-ch1.json`, `content/story-ch2.json`, `content/story-ch3.json` |
| **story-b** | `content/story-ch4.json`, `content/story-ch5.json`, `content/story-ch6.json` |
| **view** (React UI) | `Game.tsx`, `view-*.tsx`, `input.ts`, `style.css`, `e2e.spec.ts` |

## Logic API (signatures are binding)

Every function takes `content: GameContent` explicitly (tests inject fixtures). State is immutable: always return new objects.

### core: `logic.ts` (public entry, re-exports what the view and tests need)
```ts
export function newGame(seed: number, level: Level, content: GameContent, opts: { name: string; avatar: 'a' | 'b' }): GameState; // starts ch1 intro event (mode 'script')
export function loadGame(raw: unknown, seed: number, level: Level, content: GameContent): GameState | null; // validates/migrates SaveData; null if unusable
export function toSave(state: GameState): SaveData;
export function reduce(state: GameState, content: GameContent, action: Action): GameState; // THE entry point; clears state.fx first
export function sessionResult(state: GameState, content: GameContent): SessionResult; // from @sdk, for ctx.finish
// selectors for the view
export function currentMap(state: GameState, content: GameContent): MapDef;
export function visibleNpcs(state: GameState, content: GameContent): (NpcDef & { x: number; y: number; facing: Dir })[];
export function tileAt(map: MapDef, x: number, y: number): { ground: TileId | null; overlay: TileId | null };
export function isWalkable(state: GameState, content: GameContent, x: number, y: number): boolean;
export function storyProgress(state: GameState, content: GameContent): number; // 0..1 for ctx.hud
export * from './logic-learning'; export * from './logic-battle'; export * from './logic-progress'; // re-exports
```
Reducer semantics:
- `mode: 'explore'`: `step` (move 1 tile if walkable; otherwise face + fx bump; after the move: warp → trigger → encounter roll on `encounter` tiles), `face`, `interact` (NPC in front → its event; sign → say; shrine tile with no NPC → `{shrine:true}`), `use-item`, `equip`, `tick`.
- `mode: 'script'`: the interpreter runs commands until one needs the player, then sets `pending`. `advance` / `choose` / `answer` / `recite` / `buy` resume it. Cosmetic commands (`wait`, `fade`, `move`, `music`, `sfx`) set `pending` or `fx`, and the view plays them, then sends `advance` (for `move` the logic has ALREADY moved the npc/player).
- `{battle}` → `startBattle` (mode `'battle'`). When `battleOutcome(state)` becomes non-null and the last beat is consumed, core calls `endBattle`, then resumes the script with `onWin`/`onLose` (or returns to explore for wild encounters). Losing with `canLose:false` → respawn at `save.respawn`, full heal, −10% niṣka, short `say`.
- `{quiz}` → `makeChallenge` → pending `challenge` (context 'quiz') → `answer` → `recordResult` → pending `feedback` → `advance` → `onCorrect`/`onWrong`.
- `{shloka, mode:'hear'}` → pending `shloka` + `markHeard`. `{shloka, mode:'restore'}` / shrine "recite" → `startRecital` → a sequence of challenge+feedback pendings → `finishRecital`.
- `{chapter: n}` → pending `title` with nameId `kanda.n`. Completing a chapter (flag `chN.complete`) appends to `save.completedChapters` and `session.chaptersCompleted`.
- `{end:true}` → mode `'ended'`, pending `ending`.
- After a `{save:true}` or shrine save, pending `save`: the view writes `ctx.store.set('save-v1', toSave(state))` then sends `advance`.

### battle: `logic-learning.ts`
```ts
export function makeChallenge(state: GameState, content: GameContent, kind: ChallengeKind, opts?: { lexIds?: string[]; shlokaId?: string }): { state: GameState; challenge: Challenge }; // falls back per DESIGN §4.1; bumps tick
export function grade(ch: Challenge, answer: { option?: string; order?: number[]; timeMs: number }, relaxed: boolean): ChallengeResult;
export function recordResult(state: GameState, ch: Challenge, result: ChallengeResult): GameState; // SRS + session stats
export function markSeen(state: GameState, lexIds: string[]): GameState;
export function markHeard(state: GameState, content: GameContent, shlokaId: string): GameState; // also marks its words seen
export function tier(save: SaveData, lexId: string): MasteryTier;
export function unlockedKinds(save: SaveData): ChallengeKind[];
export function startRecital(state: GameState, content: GameContent, shlokaId: string): GameState; // sets state.recital + pending challenge (context 'recite')
export function recitalAnswer(state: GameState, content: GameContent, answer: { option?: string; order?: number[]; timeMs: number }): GameState; // → feedback
export function recitalAdvance(state: GameState, content: GameContent): GameState; // next challenge, or finish (restored if ≥ 0.75; unlock moves; pending null when done)
export function timeLimitFor(kind: ChallengeKind, level: Level): number;
```
### battle: `logic-battle.ts`
```ts
export function startBattle(state: GameState, content: GameContent, spec: BattleSpec): GameState; // mode 'battle', pending {kind:'battle'}
export function battleAction(state: GameState, content: GameContent, action: Action): GameState; // advance / choose / answer during battle
export function battleOutcome(state: GameState): 'win' | 'lose' | 'run' | null; // non-null once finished AND no beats remain
export function endBattle(state: GameState, content: GameContent): { state: GameState; outcome: 'win' | 'lose' | 'run' }; // writes back party hp/xp/levels/items, battle=null, mode 'explore'
export function rollEncounter(state: GameState, content: GameContent, map: MapDef): { state: GameState; spec: BattleSpec | null };
```
Battle commands with `choose`: in phase `command`, 0 Fight → `pick-move`; 1 Switch → `pick-switch`; 2 Item → `pick-item`; 3 Run. Index −1 goes back. Picking a move → `makeChallenge(kind = move.challenge)` → phase `challenge` and `state.pending = {kind:'challenge', context:'battle', …}`. On `answer` → phase `feedback` (pending feedback) → `advance` resolves the turn into `beats` (phase `beats`). Each `advance` pops one beat. When beats are empty: next `command`, or next foe, or `won`/`lost`/`fled`.

### battle: `logic-progress.ts`
```ts
export function xpToNext(level: number): number;          // round(12 * L^1.8)
export function statsAt(def: CombatantDef, level: number): Stats;
export function newMember(def: AllyDef, level: number, content: GameContent): PartyMember;
export function fighterFromMember(m: PartyMember, content: GameContent): Fighter;
export function fighterFromEnemy(id: string, level: number, content: GameContent): Fighter;
export function damage(attacker: Fighter, defender: Fighter, move: MoveDef, quality: number, variance: number): { amount: number; effective?: 'super' | 'weak' };
export function grantXp(state: GameState, content: GameContent, members: number[], xp: number): { state: GameState; levelUps: { member: number; level: number; learned: string[] }[] };
```

## Name ids (content/names.json, written by content-v; everyone may reference these ids before they exist)
`place.<mapId>` for every map id in DESIGN §9 (interior/extra maps reuse their parent's place id) · `person.<spriteId>` for every character sprite · `ally.<allyId>` · `enemy.<enemyId>` · `move.<moveId>` · `item.<itemId>` · `element.<element>` · `kanda.1`…`kanda.6` · `kind.<challengeKind>` · `tier.<unseen|seen|known|mastered>` · `role.<GrammarRole>` · `ui.words` (पदानि), `ui.verses` (श्लोकाः).

## Content conventions
- Chapters (`ChapterDef`) live in the story files (`chapters` array): story-a writes kāṇḍas 1–3, story-b writes 4–6.
- Event ids: `ch<N>.<snake>` (`common.<snake>` for shared). Flag names: `ch<N>.<snake>`. Chapter completion flag: `ch<N>.complete`.
- Maps: rows are exactly `width` characters; every char is in `legend`; the border must be solid or have warps. NPCs stand on walkable tiles. Warp targets are walkable and in bounds.
- Each chapter needs ≥ 1 shrine (`{shrine:true}` event on a `shrine` tile NPC/interaction) and ≥ 1 shop.
- Text is English. Sanskrit appears only via `{w:lexId}` / `{n:nameId}` markup, `shloka` cards, `learn` cards and challenges.
- `walkthrough` steps (in each story file) are what the story-bot test follows. Every story-critical interaction must be reachable by walking (BFS over walkable tiles + warps).

## Commands
```bash
cd /home/claude/fw
node tools/typecheck.mjs --game=ramayana-yatra            # filter the output to your own files while others are mid-edit
node tools/test.mjs unit games/ramayana-yatra/battle.test   # run one test file (path substring)
node tools/test.mjs contract ramayana-yatra
node tools/screenshot.mjs "#/play/ramayana-yatra?e2e=1&seed=3" /tmp/shot.png --game=ramayana-yatra   # builds just this game
node tools/test.mjs e2e ramayana-yatra
```
Never run `git` commands. Never edit files outside this game folder. Write scratch files under `/home/claude/scratch/<you>/`.
