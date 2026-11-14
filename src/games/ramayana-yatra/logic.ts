/**
 * Ramayana-yatra: public logic entry point. OWNER: core.
 * Pure, deterministic and immutable. The view imports everything it needs from here.
 *
 *   reduce(state, content, action)  THE entry point: clears fx, then dispatches by mode
 *     explore → step / face / interact / use-item / equip / set-style / next-book (v0.5a) / tick
 *     script  → advance / choose / answer / recite / buy (resume the event interpreter) / tick
 *     battle  → battleAction (logic-battle); when the battle is over → endBattle + resume
 *     ended   → tick only
 *   In every mode: tick, set-reader (v0.4.3: the story-text language mirrored into save.reader).
 *   v0.5b: new script pendings (story recitation 'scene', book review 'book', Nala's bridge 'setu') resume in
 *   logic-events resumeScript; their modules (logic-scene / -setu / -chain / -sundara) are re-exported here.
 *   Invalid actions return the SAME state object and never throw.
 */
import type { Action, Dir, GameContent, GameState, PartyMember } from './types';
import { indexOf } from './logic-util';
import { battleAction, battleOutcome } from './logic-battle';
import { statsAt } from './logic-progress';
import { afterBattle, resumeScript } from './logic-events';
import { beginNextBook, interact, isDir, stepPlayer } from './logic-world';
import { armKatha, saToast, uiAllySlot, uiItemSlot } from './logic-learning';
import { type UiSlot, uiSa } from './sa-ui';
import { applyKathaFloor, kathaSave } from './logic-katha';
import { setReader } from './logic-reader';
import { cutsceneDone } from './logic-cutscene';

export { newGame, loadGame, toSave, sessionResult, storyProgress, emptySession, INTRO_EVENT, START_LEVEL, START_NISKA } from './logic-state';
export {
  currentMap,
  visibleNpcs,
  tileAt,
  isWalkable,
  isWalkableOn,
  isSolidTile,
  hasTile,
  npcsOn,
  npcInFront,
  mapById,
  inBounds,
  warpAt,
  signAt,
  triggerCovers,
  triggerFlag,
  avoidActive,
  avoidTriggers,
  inSight,
  npcKey,
  DIRS,
  DELTA,
  OPPOSITE,
  VOID_MAP,
  isDir,
  beginNextBook,
  nextBookKanda,
  type PlacedNpc,
} from './logic-world';
export { nextBookObjective, MAX_CMDS_PER_RUN, SHRINE_EVENT_ID, SHRINE_REST, SHRINE_RECITE, SHRINE_SAVE, SHRINE_LEAVE, SHRINE_STUDY, MAX_PARTY, DEFEAT_TEXT, REST_TEXT, lastCmd, maxHpOf, heardFlag, restoredFlag } from './logic-events';
export { indexOf, testFlag } from './logic-util';
export { guideTarget, guideStep, type GuideTarget, type GuideKind } from './logic-guide';
export * from './logic-learning';
export * from './logic-battle';
export * from './logic-progress';
export * from './logic-katha';
export * from './logic-tactics';
export * from './logic-reader';
// v0.5b (notes/v05b-plan.md §1): one module per package — scene (A: P1/P2), sundara (B: P4), chain (C: P6), setu (D: P5)
export * from './logic-scene';
export * from './logic-sundara';
export * from './logic-chain';
export * from './logic-setu';
export * from './logic-cutscene'; // v0.5b WP-E: the Āditya-hṛdayam cutscene (cutsceneDue / cutsceneDone)
export * from './types';
export * from './catalog';

/** Max play time credited by one tick (guards against a sleeping tab adding hours). */
export const MAX_TICK_MS = 60_000;

type AnyAction = { type: string; [k: string]: unknown };

function isAction(a: unknown): a is AnyAction {
  return typeof a === 'object' && a !== null && typeof (a as { type?: unknown }).type === 'string';
}

/** Moves a party member knows (equipped, learned by level, or unlocked by a restored verse). For the equip menu. */
export function knownMoves(state: GameState, content: GameContent, memberIndex: number): string[] {
  const m = state.save.party[memberIndex];
  if (!m) return [];
  const idx = indexOf(content);
  const out = new Set<string>([...m.moves, ...Object.keys(m.pp)]);
  const def = idx.ally.get(m.id);
  for (const lm of def?.moves ?? []) {
    const mv = idx.move.get(lm.moveId);
    if (!mv) continue;
    if (mv.unlockShloka ? state.save.shlokas[mv.unlockShloka]?.restored : lm.level <= m.level) out.add(lm.moveId);
  }
  return [...out].filter((id) => idx.move.has(id));
}

function tick(state: GameState, ms: unknown): GameState {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return state;
  return { ...state, save: { ...state.save, playMs: state.save.playMs + Math.min(MAX_TICK_MS, Math.round(ms)) } };
}

function setMember(state: GameState, i: number, m: PartyMember): GameState {
  const party = state.save.party.slice();
  party[i] = m;
  return { ...state, save: { ...state.save, party } };
}

/** A no-op item use: keep the item, explain why in a toast (`textSa`: its Sanskrit, see saToast). */
function refuse(state: GameState, text: string, textSa?: string, slots?: Record<string, UiSlot>): GameState {
  return { ...state, fx: [...state.fx, saToast(text, textSa, slots)] };
}

/** How a toast names a party member (markup the view renders). */
function memberName(m: PartyMember, content: GameContent): string {
  if (m.id === 'player') return '{player}';
  const def = indexOf(content).ally.get(m.id);
  return def ? `{n:${def.nameId}}` : 'This hero';
}

function useItem(state: GameState, content: GameContent, itemId: unknown, target: unknown): GameState {
  if (typeof itemId !== 'string' || typeof target !== 'number' || !Number.isInteger(target)) return state;
  const idx = indexOf(content);
  const item = idx.item.get(itemId);
  const m = state.save.party[target];
  const def = m ? idx.ally.get(m.id) : undefined;
  if (!item || !m || !def) return state; // not a real item / hero: ignore
  const have = state.save.items[itemId] ?? 0;
  // Sanskrit: the item in the accusative, the hero in the genitive (content/sa-ui-b.json toast.*)
  const it = { item: uiItemSlot(content, itemId, item.nameId) };
  if (have <= 0) return refuse(state, `You have no {n:${item.nameId}} left.`, uiSa(content, 'toast.noneLeft', it), it);
  const who = memberName(m, content);
  const whose = { who: uiAllySlot(m.id, 'gen', who, content) };
  const maxHp = statsAt(def, m.level).hp;
  let next: PartyMember;
  if (item.kind === 'heal') {
    if (m.hp <= 0) return refuse(state, `${who} is exhausted. A reviving herb is needed first.`, uiSa(content, 'toast.exhausted', whose), whose);
    if (m.hp >= maxHp) return refuse(state, `${who} is already at full strength.`, uiSa(content, 'toast.fullStrength', whose), whose);
    next = { ...m, hp: Math.min(maxHp, m.hp + Math.max(1, Math.ceil(maxHp * item.amount))) };
  } else if (item.kind === 'revive') {
    if (m.hp > 0) return refuse(state, `${who} is not exhausted.`, uiSa(content, 'toast.notExhausted', whose), whose);
    next = { ...m, hp: Math.min(maxHp, Math.max(1, Math.ceil(maxHp * item.amount))) };
  } else if (item.kind === 'pp') {
    const pp: Record<string, number> = { ...m.pp };
    let changed = false;
    for (const id of m.moves) {
      const mv = idx.move.get(id);
      if (!mv) continue;
      const cur = pp[id] ?? mv.pp;
      const nv = Math.min(mv.pp, cur + Math.max(1, Math.round(item.amount)));
      if (nv !== cur) changed = true;
      pp[id] = nv;
    }
    if (!changed) return refuse(state, `Every move of ${who} is already fully charged.`, uiSa(content, 'toast.ppFull', whose), whose);
    next = { ...m, pp };
  } else if (item.kind === 'buff') {
    return refuse(state, `{n:${item.nameId}} can only be used in battle.`, uiSa(content, 'toast.battleOnly', it), it);
  } else {
    return refuse(state, `{n:${item.nameId}} is kept safe for the journey.`, uiSa(content, 'toast.keepSafe', it), it);
  }
  const items = { ...state.save.items };
  if (have - 1 > 0) items[itemId] = have - 1;
  else delete items[itemId];
  const s = setMember(state, target, next);
  return { ...s, save: { ...s.save, items }, fx: [...s.fx, { kind: 'sfx', name: 'tap' }] };
}

function equip(state: GameState, content: GameContent, member: unknown, moves: unknown): GameState {
  if (typeof member !== 'number' || !Number.isInteger(member) || !Array.isArray(moves)) return state;
  const m = state.save.party[member];
  if (!m || moves.length < 1 || moves.length > 4 || !moves.every((x) => typeof x === 'string')) return state;
  const list = moves as string[];
  if (new Set(list).size !== list.length) return state;
  const known = new Set(knownMoves(state, content, member));
  if (!list.every((id) => known.has(id))) return state;
  const idx = indexOf(content);
  const pp: Record<string, number> = { ...m.pp };
  for (const id of list) if (pp[id] === undefined) pp[id] = idx.move.get(id)?.pp ?? 0;
  return setMember(state, member, { ...m, moves: [...list], pp });
}

/**
 * Settings → journey style (explore only). Kathā sets the flag `style.katha`, keeps (or starts) the smṛti record,
 * raises the party to the chapter's level floor and equips the unlocked astras (v0.4.1, armKatha: toasts name the move
 * each one replaced); the practice game unsets the flags (levels, moves and smṛti are kept).
 */
function setStyle(state: GameState, content: GameContent, style: unknown): GameState {
  if ((style !== 'katha' && style !== 'abhyasa') || state.save.style === style) return state;
  const s: GameState = { ...state, save: kathaSave(state.save, style) };
  return armKatha(applyKathaFloor(s, content), content);
}

function face(state: GameState, dir: Dir): GameState {
  return state.save.facing === dir ? state : { ...state, save: { ...state.save, facing: dir } };
}

function reduceExplore(s: GameState, content: GameContent, a: AnyAction): GameState {
  switch (a.type) {
    case 'step':
      return isDir(a['dir']) ? stepPlayer(s, content, a['dir']) : s;
    case 'face':
      return isDir(a['dir']) ? face(s, a['dir']) : s;
    case 'interact':
      return interact(s, content);
    case 'use-item':
      return useItem(s, content, a['itemId'], a['target']);
    case 'equip':
      return equip(s, content, a['member'], a['moves']);
    case 'set-style':
      return setStyle(s, content, a['style']);
    case 'next-book':
      return beginNextBook(s, content);
    default:
      return s;
  }
}

function reduceBattle(s: GameState, content: GameContent, a: AnyAction): GameState {
  if (!s.battle) return s.script ? { ...s, mode: 'script' } : { ...s, mode: 'explore', pending: null };
  if (!['advance', 'choose', 'answer'].includes(a.type)) return s;
  const next = battleAction(s, content, a as Action);
  if (next.battle && battleOutcome(next) !== null) return afterBattle(next, content);
  return next;
}

/** THE entry point. Clears fx, dispatches by mode. Invalid actions return the same object. */
export function reduce(state: GameState, content: GameContent, action: Action): GameState {
  if (!isAction(action)) return state;
  const base: GameState = state.fx.length > 0 ? { ...state, fx: [] } : state;
  let next: GameState;
  if (action.type === 'tick') next = tick(base, action['ms']);
  else if (action.type === 'set-reader') next = setReader(base, action['reader']);
  // v0.5b WP-E: a due cutscene was played → its save flag (only while due; otherwise the same state)
  else if (action.type === 'cutscene-done') next = cutsceneDone(base, content, action['id']);
  else if (base.mode === 'explore') next = reduceExplore(base, content, action);
  else if (base.mode === 'script') next = resumeScript(base, content, action);
  else if (base.mode === 'battle') next = reduceBattle(base, content, action);
  else next = base; // ended
  return next === base ? state : next;
}
