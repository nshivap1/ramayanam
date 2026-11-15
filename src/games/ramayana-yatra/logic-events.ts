/**
 * Event interpreter. OWNER: core. Pure and deterministic.
 *
 * The script is a call stack of frames ({cmds, pc}); `if`, quiz and battle outcome blocks push frames;
 * `goto` jumps to a `{label}` in the innermost frame that has it (popping inner frames). The interpreter
 * runs until a command needs the player, then sets `state.pending`. When the pc has already advanced past
 * the command that set `pending`, that command is `cmds[pc - 1]` of the top frame (used on resume).
 *
 * Kathā (v0.4, notes/katha.md): story `{quiz}` commands are skipped (their onCorrect runs); the party is raised to the
 * chapter's level floor at the chapter card, on `{join}` and before every story battle; a shrine recital is four
 * smarana challenges with no feedback pending in between; the shrine has a study hall (SHRINE_STUDY).
 * v0.5a: a story flag that a Kathā grant names (katha.json tactics.grants: Viśvāmitra's astras after Tāṭakā) gives the
 * hero those moves at once, with a toast; story battles re-check every grant (an older save past the flag).
 * v0.5b (WP0 hooks, notes/v05b-plan.md §1): `{smarana}` (P1) and `{book}` (P2) → logic-scene, `{setu}` (P5) →
 * logic-setu; their pendings resume here (challenge context 'scene', 'book', 'setu'). All three are Kathā-only.
 * v0.6 (WP0, notes/v06-wp0.md): the effects kit → logic-stage (`execKit`: GameState.stage + 'kit' fx; the stage is
 * cleared when the script ends), `{hotspot}` → pending 'hotspot' (choose 0 = found: its `then` + flag; advance =
 * passes), `{cutscene}` → logic-told (pending 'cutscene', ended by cutscene-done / advance), `{echo}` → logic-told. All
 * Kathā-only. A v0.6 verse (`kathaOnly`) is heard only: the shrine never recites it (logic-journey isRestorable).
 */
import type { BattleSpec, Challenge, ChallengeResult, Dir, EventCmd, GameContent, GameState, KandaId, PartyMember, Pending } from './types';
import { clamp, indexOf, testFlag } from './logic-util';
import { battleOutcome, endBattle, startBattle } from './logic-battle';
import { grade, makeChallenge, markHeard, markSeen, movesToasts, recitalAdvance, recitalAnswer, recordResult, saToast, startRecital, startStudy, studyAdvance, uiItemSlot } from './logic-learning';
import { applyKathaFloor, armMember, isKatha } from './logic-katha';
import { applyGrants } from './logic-tactics';
import { uiSa } from './sa-ui';
import { joinLevel, newMember, statsAt, withUnlockedMoves } from './logic-progress';
import { DELTA, isDir, isSolidTile, mapById, npcKey, triggerFlag } from './logic-world';
import { sceneAnswer, startBookReview, startSceneRecital } from './logic-scene';
import { setuAction, startSetu } from './logic-setu';
import { clearStage, execKit, hotspotFlag, hotspotPending, isKitCmd } from './logic-stage';
import { noteEcho, startTold, toldDone } from './logic-told';
import { isRestorable } from './logic-journey';

/** Hard cap on commands executed by one interpreter run (catches goto loops in content). */
export const MAX_CMDS_PER_RUN = 500;
export const SHRINE_EVENT_ID = 'core.shrine';
export const SHRINE_CMDS: EventCmd[] = [{ shrine: true }];
export const SHRINE_REST = 0;
export const SHRINE_RECITE = 1;
export const SHRINE_SAVE = 2;
export const SHRINE_LEAVE = 3;
/** Kathā only: the study hall (अभ्यासशाला), a round of classic challenges (context 'quiz', STUDY_ROUND in logic-learning). */
export const SHRINE_STUDY = 4;
export const MAX_PARTY = 6;
export const DEFEAT_TEXT = 'The heroes rest at the hermitage and recover.';
export const REST_TEXT = 'You rest by the shrine. Everyone is fully restored.';

type Frame = { cmds: EventCmd[]; pc: number };

// ───────────────────────── flags & party helpers (shared with world/state) ─────────────────────────

/** Default quest-log line right after Book N ends (the story's own `{objective}` afterwards replaces it). */
export function nextBookObjective(n: KandaId): string {
  return n >= 6 ? 'The journey is complete. Rest well, student.' : `Book ${n + 1} begins. Look around and talk to the people here.`;
}

/**
 * Set a flag. `ch<N>.complete` also records the chapter in save.completedChapters and session.chaptersCompleted
 * (once) and, when `content` is given, fully heals the party and sets a "next book" objective.
 */
export function setFlag(state: GameState, flag: string, content?: GameContent): GameState {
  if (!flag || state.save.flags[flag]) return state;
  const save = { ...state.save, flags: { ...state.save.flags, [flag]: true as const } };
  let session = state.session;
  const m = /^ch([1-6])\.complete$/.exec(flag);
  if (m) {
    const n = Number(m[1]) as KandaId;
    if (!save.completedChapters.includes(n)) save.completedChapters = [...save.completedChapters, n];
    if (!session.chaptersCompleted.includes(n)) session = { ...session, chaptersCompleted: [...session.chaptersCompleted, n] };
    save.objective = nextBookObjective(n);
    const done: GameState = { ...state, save, session };
    return content ? healParty(done, content) : done;
  }
  return { ...state, save, session };
}

export function unsetFlag(state: GameState, flag: string): GameState {
  if (!state.save.flags[flag]) return state;
  const flags = { ...state.save.flags };
  delete flags[flag];
  return { ...state, save: { ...state.save, flags } };
}

/** Max HP of a party member (falls back to current hp when the ally def is unknown). */
export function maxHpOf(m: PartyMember, content: GameContent): number {
  const def = indexOf(content).ally.get(m.id);
  return def ? statsAt(def, m.level).hp : m.hp;
}

/** Full HP and PP for every member. */
export function healParty(state: GameState, content: GameContent): GameState {
  const idx = indexOf(content);
  const party = state.save.party.map((m) => {
    const pp: Record<string, number> = { ...m.pp };
    for (const id of new Set([...m.moves, ...Object.keys(m.pp)])) {
      const mv = idx.move.get(id);
      if (mv) pp[id] = mv.pp;
    }
    return { ...m, hp: maxHpOf(m, content), pp };
  });
  return { ...state, save: { ...state.save, party } };
}

function addFx(state: GameState, ...fx: GameState['fx']): GameState {
  return { ...state, fx: [...state.fx, ...fx] };
}

/** "Bought X (xN)" with its Sanskrit (the item in the accusative; content/sa-ui-b.json toast.bought / boughtN). */
function boughtToast(content: GameContent, itemId: string, nameId: string, qty: number): Extract<GameState['fx'][number], { kind: 'toast' }> {
  const slots = { item: uiItemSlot(content, itemId, nameId), n: qty };
  const sa = qty > 1 ? uiSa(content, 'toast.boughtN', slots) : uiSa(content, 'toast.bought', slots);
  return saToast(`Bought {n:${nameId}}${qty > 1 ? ` x${qty}` : ''}`, sa, slots);
}

// ───────────────────────── frames ─────────────────────────

function topFrame(state: GameState): Frame | undefined {
  const f = state.script?.frames;
  return f ? f[f.length - 1] : undefined;
}

/** The command that set the current pending (the one just before the top frame's pc). */
export function lastCmd(state: GameState): EventCmd | undefined {
  const top = topFrame(state);
  return top ? top.cmds[top.pc - 1] : undefined;
}

function pushFrame(state: GameState, cmds: EventCmd[] | undefined): GameState {
  if (!state.script || !cmds || cmds.length === 0) return state;
  return { ...state, script: { ...state.script, frames: [...state.script.frames, { cmds, pc: 0 }] } };
}

/** Step the top frame's pc back by one so the command that set `pending` runs again (shrine menu loop). */
function rewind(state: GameState): GameState {
  const s = state.script;
  const top = topFrame(state);
  if (!s || !top || top.pc <= 0) return state;
  return { ...state, script: { ...s, frames: [...s.frames.slice(0, -1), { cmds: top.cmds, pc: top.pc - 1 }] } };
}

function gotoLabel(state: GameState, label: string): GameState {
  const s = state.script;
  if (!s) return state;
  for (let i = s.frames.length - 1; i >= 0; i--) {
    const f = s.frames[i]!;
    const at = f.cmds.findIndex((c) => 'label' in c && c.label === label);
    if (at >= 0) return { ...state, script: { ...s, frames: [...s.frames.slice(0, i), { cmds: f.cmds, pc: at + 1 }] } };
  }
  throw new Error(`Event "${s.eventId}": goto "${label}" has no matching {label} in this event`);
}

// ───────────────────────── run loop ─────────────────────────

/** Start an event by id (no-op when the event does not exist). */
export function startEvent(state: GameState, content: GameContent, eventId: string): GameState {
  const ev = indexOf(content).event.get(eventId);
  if (!ev) return state;
  return startScript(state, content, ev.id, ev.cmds);
}

/** Start an ad-hoc script (signs, shrine, respawn) and run it until it needs the player. */
export function startScript(state: GameState, content: GameContent, eventId: string, cmds: EventCmd[]): GameState {
  return run(clearStage({ ...state, mode: 'script', script: { eventId, frames: [{ cmds, pc: 0 }] }, pending: null }), content);
}

/** After arriving on a map: run (or, inside a script, push) the map's onEnter event. */
export function enterMapEffects(state: GameState, content: GameContent, mapId: string): GameState {
  const map = mapById(content, mapId);
  const ev = map?.onEnter ? indexOf(content).event.get(map.onEnter) : undefined;
  if (!ev) return state;
  if (state.mode === 'script' && state.script) return pushFrame(state, ev.cmds);
  return startEvent(state, content, ev.id);
}

/** Run commands until one needs the player (pending), the script ends (explore), or the mode changes. */
export function run(state: GameState, content: GameContent): GameState {
  let s = state;
  let n = 0;
  while (s.mode === 'script' && s.script && s.pending === null) {
    const frames = s.script.frames;
    const top = frames[frames.length - 1];
    if (!top) {
      s = clearStage({ ...s, script: null, mode: 'explore' });
      break;
    }
    if (top.pc >= top.cmds.length) {
      const rest = frames.slice(0, -1);
      // v0.6: the effects kit's stage lives as long as the script
      s = rest.length > 0 ? { ...s, script: { ...s.script, frames: rest } } : clearStage({ ...s, script: null, mode: 'explore' });
      continue;
    }
    if (++n > MAX_CMDS_PER_RUN) throw new Error(`Event "${s.script.eventId}" ran more than ${MAX_CMDS_PER_RUN} commands without waiting for the player (a goto loop?)`);
    const cmd = top.cmds[top.pc]!;
    s = { ...s, script: { ...s.script, frames: [...frames.slice(0, -1), { cmds: top.cmds, pc: top.pc + 1 }] } };
    s = exec(s, content, cmd);
  }
  return s;
}

function pend(state: GameState, pending: Pending): GameState {
  return { ...state, pending };
}

function knownShloka(content: GameContent, id: string): boolean {
  return indexOf(content).shloka.has(id);
}

/** Flag set when a verse has been heard (`heard.<shlokaId>`) / restored (`restored.<shlokaId>`). Use them in requires/showIf/if. */
export function heardFlag(shlokaId: string): string {
  return `heard.${shlokaId}`;
}
export function restoredFlag(shlokaId: string): string {
  return `restored.${shlokaId}`;
}

function noteHeard(state: GameState, id: string): GameState {
  const s = setFlag(state, heardFlag(id));
  if (s.session.shlokasHeard.includes(id)) return s;
  return { ...s, session: { ...s.session, shlokasHeard: [...s.session.shlokasHeard, id] } };
}

/** After a recital: set `restored.<id>` if the verse is restored; record it in the session if it became restored now. */
function noteRestored(state: GameState, id: string, before: boolean): GameState {
  if (!state.save.shlokas[id]?.restored) return state;
  const s = setFlag(state, restoredFlag(id));
  if (before || s.session.shlokasRestored.includes(id)) return s;
  return { ...s, session: { ...s.session, shlokasRestored: [...s.session.shlokasRestored, id] } };
}

function beginRecital(state: GameState, content: GameContent, id: string): GameState {
  const before = !!state.save.shlokas[id]?.restored;
  const s = startRecital({ ...state, pending: null }, content, id);
  return s.pending === null ? noteRestored({ ...s, recital: null }, id, before) : s;
}

function challengeUsable(ch: Challenge): boolean {
  return (ch.options?.length ?? 0) > 0 || (ch.tiles?.length ?? 0) > 0;
}

/** v0.5a (Kathā): the moves a grant gives when its story flag is set (logic-tactics applyGrants), with toasts. */
function grantOn(state: GameState, content: GameContent, flag: string): GameState {
  if (!isKatha(state)) return state;
  const r = applyGrants(state, content, flag);
  return r.granted.length ? { ...r.state, fx: [...r.state.fx, ...movesToasts(content, r.granted)] } : state;
}

function beginBattle(state: GameState, content: GameContent, spec: BattleSpec, onWin: EventCmd[] | undefined): GameState {
  const enemies = indexOf(content).enemy;
  if (spec.enemies.length === 0 || spec.enemies.some((e) => !enemies.has(e.id))) return pushFrame(state, onWin); // defs not written yet: let the story continue
  const b = startBattle(addFx(applyGrants(applyKathaFloor(state, content), content).state, { kind: 'encounter' }), content, spec);
  return b.battle && battleOutcome(b) !== null ? afterBattle(b, content) : b;
}

function placeOf(state: GameState, content: GameContent, who: string): { x: number; y: number; facing: Dir } | null {
  if (who === 'player') return { x: state.save.x, y: state.save.y, facing: state.save.facing };
  const map = mapById(content, state.save.mapId);
  const npc = map?.npcs.find((n) => n.id === who);
  if (!map || !npc) return null;
  return state.save.npcPos[npcKey(map.id, npc.id)] ?? { x: npc.x, y: npc.y, facing: npc.facing };
}

function place(state: GameState, who: string, p: { x: number; y: number; facing: Dir }): GameState {
  if (who === 'player') return { ...state, save: { ...state.save, x: p.x, y: p.y, facing: p.facing } };
  return { ...state, save: { ...state.save, npcPos: { ...state.save.npcPos, [npcKey(state.save.mapId, who)]: p } } };
}

function exec(s: GameState, content: GameContent, cmd: EventCmd): GameState {
  const idx = indexOf(content);
  if ('say' in cmd) return pend(s, { kind: 'say', text: cmd.say, ...(cmd.who !== undefined ? { who: cmd.who } : {}), ...(cmd.portrait !== undefined ? { portrait: cmd.portrait } : {}) });
  if ('shloka' in cmd) {
    if (!knownShloka(content, cmd.shloka)) return s; // verse not written yet
    if (cmd.mode === 'restore') return beginRecital(s, content, cmd.shloka);
    return pend(noteHeard(markHeard(s, content, cmd.shloka), cmd.shloka), { kind: 'shloka', shlokaId: cmd.shloka });
  }
  if ('choice' in cmd) {
    if (!Array.isArray(cmd.options) || cmd.options.length === 0) return s;
    return pend(s, { kind: 'choice', prompt: cmd.choice ? cmd.choice : null, options: cmd.options.map((o) => o.label) });
  }
  if ('label' in cmd) return s;
  if ('goto' in cmd) return gotoLabel(s, cmd.goto);
  if ('if' in cmd) return pushFrame(s, testFlag(s.save.flags, cmd.if) ? cmd.then : cmd.else);
  if ('set' in cmd) return grantOn(setFlag(s, cmd.set, content), content, cmd.set);
  if ('unset' in cmd) return unsetFlag(s, cmd.unset);
  if ('give' in cmd) {
    const qty = Math.max(1, Math.floor(cmd.qty ?? 1));
    const item = idx.item.get(cmd.give);
    const nameId = item?.nameId ?? `item.${cmd.give}`;
    const slots = { item: uiItemSlot(content, cmd.give, nameId), n: qty };
    const sa = qty > 1 ? uiSa(content, 'toast.receivedN', slots) : uiSa(content, 'toast.received', slots);
    const t = addFx(s, saToast(`Received {n:${nameId}}${qty > 1 ? ` x${qty}` : ''}`, sa, slots));
    return { ...t, save: { ...t.save, items: { ...t.save.items, [cmd.give]: (t.save.items[cmd.give] ?? 0) + qty } } };
  }
  if ('take' in cmd) {
    const qty = Math.max(1, Math.floor(cmd.qty ?? 1));
    const items = { ...s.save.items };
    const left = (items[cmd.take] ?? 0) - qty;
    if (left > 0) items[cmd.take] = left;
    else delete items[cmd.take];
    return { ...s, save: { ...s.save, items } };
  }
  if ('niska' in cmd) return { ...s, save: { ...s.save, niska: Math.max(0, Math.round(s.save.niska + (Number.isFinite(cmd.niska) ? cmd.niska : 0))) } };
  if ('learn' in cmd) {
    const ids = idx.lex.size > 0 ? cmd.learn.filter((id) => idx.lex.has(id)) : [];
    if (ids.length === 0) return s;
    return pend(markSeen(s, ids), { kind: 'words', lexIds: ids });
  }
  if ('quiz' in cmd) {
    const opts: { lexIds?: string[]; shlokaId?: string } = {};
    if (cmd.lexIds) opts.lexIds = cmd.lexIds;
    if (cmd.shlokaId) opts.shlokaId = cmd.shlokaId;
    if (idx.lex.size === 0) return pushFrame(s, cmd.onCorrect); // lexicon not written yet
    // Kathā: word / grammar quizzes leave the story path, silently: the praise lines (`say`) of onCorrect are left out (v0.4.1)
    if (isKatha(s)) return pushFrame(s, cmd.onCorrect?.filter((c) => !('say' in c)));
    const r = makeChallenge(s, content, cmd.quiz, opts);
    if (!challengeUsable(r.challenge)) return pushFrame(r.state, cmd.onCorrect);
    // story quizzes are untimed (battle and recital challenges keep their timers)
    return pend(r.state, { kind: 'challenge', challenge: { ...r.challenge, timeLimitMs: 0 }, context: 'quiz' });
  }
  if ('battle' in cmd) return beginBattle(s, content, cmd.battle, cmd.onWin);
  if ('join' in cmd) {
    const def = idx.ally.get(cmd.join);
    if (!def || s.save.party.some((m) => m.id === cmd.join) || s.save.party.length >= MAX_PARTY) return s;
    const level = clamp(Math.round(cmd.level ?? joinLevel(s.save)), 1, 100);
    const joined = withUnlockedMoves(newMember(def, level, content), s.save, content);
    // Kathā: the newcomer's unlocked astras are equipped, in place of plain moves when four are equipped (v0.4.1)
    const member = isKatha(s) ? armMember(joined, s.save, content).member : joined;
    return applyKathaFloor({ ...s, save: { ...s.save, party: [...s.save.party, member] } }, content);
  }
  if ('leave' in cmd) {
    if (s.save.party.length <= 1 || !s.save.party.some((m) => m.id === cmd.leave)) return s;
    return { ...s, save: { ...s.save, party: s.save.party.filter((m) => m.id !== cmd.leave) } };
  }
  if ('heal' in cmd) return healParty(s, content);
  if ('rest' in cmd) {
    const h = healParty(s, content);
    return { ...h, save: { ...h.save, respawn: { mapId: h.save.mapId, x: h.save.x, y: h.save.y } } };
  }
  if ('shrine' in cmd) return pend(s, { kind: 'shrine' });
  if ('warp' in cmd) {
    const map = mapById(content, cmd.warp);
    if (!map || isSolidTile(map, cmd.x, cmd.y)) return s;
    // v0.6: the kit's stage belongs to a map (its figures, its tiles): a warp starts the new map with none
    const w: GameState = clearStage({ ...s, save: { ...s.save, mapId: map.id, x: cmd.x, y: cmd.y, facing: isDir(cmd.facing) ? cmd.facing : s.save.facing }, fx: [...s.fx, { kind: 'warp' }] });
    return enterMapEffects(w, content, map.id);
  }
  if ('move' in cmd) {
    const path = (Array.isArray(cmd.path) ? cmd.path : []).filter(isDir);
    const from = placeOf(s, content, cmd.move);
    if (!from || path.length === 0) return s;
    let { x, y } = from;
    for (const d of path) {
      x += DELTA[d][0];
      y += DELTA[d][1];
    }
    return pend(place(s, cmd.move, { x, y, facing: path[path.length - 1]! }), { kind: 'move', who: cmd.move, path });
  }
  if ('face' in cmd) {
    const from = placeOf(s, content, cmd.face);
    if (!from || !isDir(cmd.dir)) return s;
    return place(s, cmd.face, { ...from, facing: cmd.dir });
  }
  if ('wait' in cmd) return pend(s, { kind: 'wait', ms: Math.max(0, Number.isFinite(cmd.wait) ? cmd.wait : 0) });
  if ('fade' in cmd) return pend(s, { kind: 'fade', to: cmd.fade === 'out' ? 'out' : 'in' });
  if ('music' in cmd) return addFx(s, { kind: 'music', track: cmd.music });
  if ('sfx' in cmd) return addFx(s, { kind: 'sfx', name: cmd.sfx });
  if ('shop' in cmd) {
    const items = idx.item.size > 0 ? cmd.shop.filter((id) => idx.item.has(id)) : [];
    if (items.length === 0) return s;
    return pend(s, { kind: 'shop', items });
  }
  if ('save' in cmd) return pend(s, { kind: 'save' });
  if ('chapter' in cmd) {
    const n = cmd.chapter;
    if (![1, 2, 3, 4, 5, 6].includes(n)) return s;
    return pend(applyKathaFloor({ ...s, save: { ...s.save, chapter: n } }, content), { kind: 'title', nameId: `kanda.${n}` });
  }
  if ('objective' in cmd) return { ...s, save: { ...s.save, objective: String(cmd.objective) } };
  if ('end' in cmd) return { ...s, mode: 'ended', script: null, pending: { kind: 'ending' } };
  // ── v0.5b (notes/v05b-plan.md §1): Kathā-only commands; each module skips (same state) in the practice game ──
  if ('smarana' in cmd) return startSceneRecital(s, content, cmd); // P1, logic-scene (WP-A)
  if ('book' in cmd) return startBookReview(s, content, cmd.book); // P2, logic-scene (WP-A)
  if ('setu' in cmd) return isKatha(s) ? startSetu(s, content, cmd.setu) : s; // P5, logic-setu (WP-D)
  // ── v0.6 (notes/v06-wp0.md): Kathā-only; each skips (same state) in the practice game ──
  if (isKitCmd(cmd)) return execKit(s, content, cmd, isKatha(s)); // the effects kit, logic-stage
  if ('hotspot' in cmd) {
    const p = isKatha(s) ? hotspotPending(cmd) : null;
    return p ? pend(s, p) : s;
  }
  if ('cutscene' in cmd) return startTold(s, content, cmd.cutscene); // logic-told
  if ('echo' in cmd) return noteEcho(s, content, cmd.echo); // logic-told
  return s; // unknown command: skipped (world.test reports it)
}

// ───────────────────────── battle outcome ─────────────────────────

/** Called once battleOutcome(state) is non-null: end the battle and resume the script / explore. */
export function afterBattle(state: GameState, content: GameContent): GameState {
  const spec = state.battle?.spec;
  const { state: ended, outcome } = endBattle(state, content);
  let s: GameState = { ...ended, battle: null, pending: null, mode: 'explore' };
  if (outcome === 'win') s = { ...s, session: { ...s.session, battlesWon: s.session.battlesWon + 1 } };
  if (outcome === 'lose' && spec && !spec.canLose) return respawnAfterDefeat(s, content);
  if (outcome === 'lose') s = healParty(s, content);
  if (!s.script) return s;
  s = { ...s, mode: 'script' };
  const cmd = lastCmd(s);
  if (cmd && 'battle' in cmd) s = pushFrame(s, outcome === 'win' ? cmd.onWin : cmd.onLose);
  return run(s, content);
}

/** Lost a battle that cannot be lost: back to the last shrine, full heal, -10% niska, a short message. */
export function respawnAfterDefeat(state: GameState, content: GameContent): GameState {
  const eventId = state.script?.eventId;
  let s = state;
  if (eventId) s = unsetFlag(s, triggerFlag(s.save.mapId, eventId)); // let a once-trigger fire again
  const r = s.save.respawn;
  const map = mapById(content, r.mapId);
  const ok = !!map && !isSolidTile(map, r.x, r.y);
  const ch = content.chapters.find((c) => c.kanda === s.save.chapter) ?? content.chapters[0];
  const to = ok ? r : ch ? { mapId: ch.startMap, x: ch.startX, y: ch.startY } : { mapId: s.save.mapId, x: s.save.x, y: s.save.y };
  s = healParty(s, content);
  s = { ...s, script: null, save: { ...s.save, mapId: to.mapId, x: to.x, y: to.y, facing: 'down', niska: s.save.niska - Math.floor(s.save.niska * 0.1) }, fx: [...s.fx, { kind: 'warp' }] };
  return startScript(s, content, 'core.respawn', [{ say: DEFEAT_TEXT }]);
}

// ───────────────────────── resume (script mode) ─────────────────────────

type Answer = { option?: string; order?: number[]; timeMs: number };

/** A smarana answer: picks (option ids, one per gap; [] for a line with no gap) and / or auto (automatic recitation). */
function validSmaranaAnswer(a: { [k: string]: unknown }): boolean {
  if (a.timeMs !== undefined && (typeof a.timeMs !== 'number' || !Number.isFinite(a.timeMs) || a.timeMs < 0)) return false;
  return a.auto === true || a.picks === undefined || (Array.isArray(a.picks) && a.picks.every((x) => typeof x === 'string'));
}

function validAnswer(a: { [k: string]: unknown }): boolean {
  if (typeof a.timeMs !== 'number' || !Number.isFinite(a.timeMs) || a.timeMs < 0) return false;
  const hasOpt = typeof a.option === 'string';
  const hasOrder = Array.isArray(a.order) && a.order.every((i) => Number.isInteger(i));
  return hasOpt || hasOrder;
}

function cleanAnswer(a: Answer): Answer {
  const out: Answer = { timeMs: a.timeMs };
  if (typeof a.option === 'string') out.option = a.option;
  if (Array.isArray(a.order)) out.order = [...a.order];
  return out;
}

function feedbackFor(ch: Challenge, result: ChallengeResult, a: Answer): Pending {
  return { kind: 'feedback', challenge: ch, result, ...(a.option !== undefined ? { picked: a.option } : {}), ...(a.order !== undefined ? { order: a.order } : {}) };
}

/** Resume a waiting script with a player action. Returns the same object when the action does not apply. */
export function resumeScript(state: GameState, content: GameContent, action: { type: string; [k: string]: unknown }): GameState {
  const p = state.pending;
  if (!p) return state.script ? run(state, content) : state;
  switch (p.kind) {
    case 'say':
    case 'shloka':
    case 'words':
    case 'title':
    case 'wait':
    case 'fade':
    case 'move':
    case 'save':
      return action.type === 'advance' ? run({ ...state, pending: null }, content) : state;
    case 'choice': {
      const i = action['index'];
      if (action.type !== 'choose' || typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= p.options.length) return state;
      const cmd = lastCmd(state);
      const opt = cmd && 'choice' in cmd ? cmd.options[i] : undefined;
      let s: GameState = { ...state, pending: null };
      if (opt?.set) s = grantOn(setFlag(s, opt.set, content), content, opt.set);
      if (opt?.goto) s = gotoLabel(s, opt.goto);
      return run(s, content);
    }
    case 'challenge': {
      if (action.type !== 'answer') return state;
      // v0.5b P1: a story recitation (logic-scene): no feedback pending, the script carries on after the answer
      if (p.context === 'scene') {
        const s = sceneAnswer(state, content, action);
        return s === state ? state : run(s, content);
      }
      if (p.challenge.kind === 'smarana') {
        // Kathā shrine recital: no feedback pending; the next pāda (or the end of the recital) follows directly
        if (p.context !== 'recite' || !state.recital || !validSmaranaAnswer(action)) return state;
        const id = state.recital.shlokaId;
        const before = !!state.save.shlokas[id]?.restored;
        const s = recitalAnswer(state, content, { timeMs: typeof action['timeMs'] === 'number' ? action['timeMs'] : 0, picks: action['picks'], auto: action['auto'] });
        if (s === state || s.recital) return s;
        return s.pending === null ? run(noteRestored(s, id, before), content) : s;
      }
      if (!validAnswer(action)) return state;
      const a = cleanAnswer(action as unknown as Answer);
      if (p.context === 'recite') {
        if (!state.recital) return state;
        return recitalAnswer(state, content, a);
      }
      if (p.context !== 'quiz') return state;
      const result = grade(p.challenge, a, false);
      const s = recordResult(state, p.challenge, result);
      const r = state.recital?.study ? { recital: { ...state.recital, correct: state.recital.correct + (result.correct ? 1 : 0) } } : {};
      return { ...s, ...r, pending: feedbackFor(p.challenge, result, a), fx: [...s.fx, { kind: 'sfx', name: result.correct ? 'correct' : 'wrong' }] };
    }
    case 'feedback': {
      if (action.type !== 'advance') return state;
      if (state.recital?.study) {
        const s = studyAdvance(state, content);
        return s.pending === null ? run(s, content) : s;
      }
      if (state.recital) {
        const id = state.recital.shlokaId;
        const before = !!state.save.shlokas[id]?.restored;
        const s = recitalAdvance(state, content);
        if (s.pending !== null) return s;
        return run(noteRestored({ ...s, recital: null }, id, before), content);
      }
      const cmd = lastCmd(state);
      let s: GameState = { ...state, pending: null };
      if (cmd && 'quiz' in cmd) s = pushFrame(s, p.result.correct ? cmd.onCorrect : cmd.onWrong);
      return run(s, content);
    }
    case 'shop': {
      if (action.type === 'advance' || (action.type === 'choose' && action['index'] === -1)) return run({ ...state, pending: null }, content);
      if (action.type !== 'buy') return state;
      const itemId = action['itemId'];
      const qty = action['qty'];
      if (typeof itemId !== 'string' || !p.items.includes(itemId) || typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 99) return state;
      const item = indexOf(content).item.get(itemId);
      if (!item) return state;
      const cost = Math.max(0, item.price) * qty;
      if (cost > state.save.niska) return state;
      return {
        ...state,
        save: { ...state.save, niska: state.save.niska - cost, items: { ...state.save.items, [itemId]: (state.save.items[itemId] ?? 0) + qty } },
        fx: [...state.fx, { kind: 'sfx', name: 'tap' }, boughtToast(content, itemId, item.nameId, qty)],
      };
    }
    case 'shrine': {
      if (action.type === 'recite') {
        const id = action['shlokaId'];
        // v0.6: a v0.6 verse is heard only (plan §0.2): never recited at a shrine
        if (typeof id !== 'string' || !knownShloka(content, id) || !state.save.shlokas[id]?.heard || !isRestorable(content, id)) return state;
        const s = beginRecital(rewind(state), content, id);
        return s.pending === null ? run(s, content) : s;
      }
      if (action.type !== 'choose') return state;
      const i = action['index'];
      if (i === SHRINE_REST) {
        const h = healParty(rewind(state), content);
        return { ...h, save: { ...h.save, respawn: { mapId: h.save.mapId, x: h.save.x, y: h.save.y } }, pending: { kind: 'say', text: REST_TEXT }, fx: [...h.fx, { kind: 'sfx', name: 'levelup' }] };
      }
      if (i === SHRINE_RECITE) return state; // the view lists heard verses and sends {type:'recite'}
      if (i === SHRINE_SAVE) return { ...rewind(state), pending: { kind: 'save' } };
      if (i === SHRINE_STUDY && isKatha(state)) return startStudy(rewind(state), content);
      if (i === SHRINE_LEAVE || i === -1) return run({ ...state, pending: null }, content);
      return state;
    }
    case 'book': // v0.5b P2: the book review, read-only → ▶ continues
      return action.type === 'advance' ? run({ ...state, pending: null }, content) : state;
    case 'setu': {
      // v0.5b P5 (logic-setu, WP-D): choose i turns a stone; advance gives a hint, or continues once solved
      const s = setuAction(state, content, action);
      return s !== state && s.pending === null ? run(s, content) : s;
    }
    case 'hotspot': {
      // v0.6: a hidden moment — choose 0 (tap the shimmer / A) finds it: its flag, then its `then`; advance passes
      if (action.type === 'advance') return run({ ...state, pending: null }, content);
      if (action.type !== 'choose' || action['index'] !== 0) return state;
      const cmd = lastCmd(state);
      if (!cmd || !('hotspot' in cmd)) return run({ ...state, pending: null }, content);
      const s = setFlag({ ...state, pending: null }, hotspotFlag(cmd, state.script?.eventId ?? 'script'), content);
      return run(pushFrame(s, cmd.then), content);
    }
    case 'cutscene': {
      // v0.6: a told cutscene has played (view-told) → logic-told toldDone (flags, verses heard), then the script goes on
      const s = toldDone(state, content, action);
      return s === state ? state : run(s, content);
    }
    default:
      return state; // 'ending', 'battle'
  }
}
