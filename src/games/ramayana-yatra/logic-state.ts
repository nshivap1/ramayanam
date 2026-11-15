/**
 * Game state lifecycle: new game, save validation/migration, session result, progress. OWNER: core.
 */
import type { Level, MasteryEvent, ReviewItem, SessionResult } from '@sdk';
import type { Dir, GameContent, GameState, JourneyStyle, KandaId, PartyMember, Reader, SaveData, SessionStats, ShlokaProgress, WordProgress } from './types';
import { indexOf } from './logic-util';
import { newMember } from './logic-progress';
import { startEvent } from './logic-events';
import { isDir, isSolidTile, mapById } from './logic-world';
import { ARMED_FLAG, KATHA_FLAG, MASTERED, applyKathaFloor, journeySteps, kathaSave } from './logic-katha';
import { armKatha } from './logic-learning';
import { toReader } from './logic-reader';
import { journeyContent } from './logic-journey';

export const INTRO_EVENT = 'common.intro';
export const START_LEVEL = 3;
export const START_NISKA = 50;
export const DEFAULT_OBJECTIVE = 'Explore the hermitage and talk to everyone you meet.';
export const MAX_NAME = 16;
export const DEFAULT_NAME = 'Shishya';

export function emptySession(): SessionStats {
  return { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] };
}

function cleanName(name: unknown): string {
  const n = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : '';
  return n || DEFAULT_NAME;
}

function startOf(content: GameContent): { mapId: string; x: number; y: number } {
  const ch = content.chapters.find((c) => c.kanda === 1) ?? content.chapters[0];
  if (ch) return { mapId: ch.startMap, x: ch.startX, y: ch.startY };
  const m = content.maps[0];
  return { mapId: m?.id ?? '', x: 0, y: 0 };
}

/** The player's party entry (fallback member when defs are not written yet). */
function playerMember(content: GameContent, level: number): PartyMember {
  const def = indexOf(content).ally.get('player');
  return def ? newMember(def, level, content) : { id: 'player', level, xp: 0, hp: 1, pp: {}, moves: [] };
}

function baseState(seed: number, level: Level, save: SaveData): GameState {
  return { v: 1, seed: seed >>> 0, tick: 0, level, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: emptySession(), fx: [] };
}

/**
 * A new journey. `opts.style` (v0.4): 'katha' = story first (notes/katha.md; also sets the flag `style.katha`, an empty
 * smṛti record and the chapter's level floor), 'abhyasa' = the practice game. Without it the save has no `style`
 * field at all (the practice game, exactly as v0.3). `opts.reader` (v0.4.3): the story-text language as a reader level
 * ('sa' / 'sa-en'; 'en' or absent = no `reader` field); the view also sends `set-reader` on every start and change.
 */
export function newGame(seed: number, level: Level, all: GameContent, opts: { name: string; avatar: 'a' | 'b'; style?: JourneyStyle; reader?: Reader | 'en' }): GameState {
  // v0.6: the practice game never sees Kathā-only content (logic-journey)
  const content = journeyContent(all, { style: opts?.style });
  const start = startOf(content);
  const save: SaveData = {
    v: 1,
    playerName: cleanName(opts?.name),
    avatar: opts?.avatar === 'b' ? 'b' : 'a',
    mapId: start.mapId,
    x: start.x,
    y: start.y,
    facing: 'down',
    respawn: { ...start },
    chapter: 1,
    objective: DEFAULT_OBJECTIVE,
    flags: {},
    party: [playerMember(content, START_LEVEL)],
    items: {},
    niska: START_NISKA,
    words: {},
    shlokas: {},
    step: 0,
    npcPos: {},
    playMs: 0,
    completedChapters: [],
    ...(toReader(opts?.reader) ? { reader: toReader(opts?.reader) } : {}),
  };
  const style = opts?.style === 'katha' || opts?.style === 'abhyasa' ? opts.style : undefined;
  const s = style ? applyKathaFloor(baseState(seed, level, kathaSave(save, style)), content) : baseState(seed, level, save);
  return indexOf(content).event.has(INTRO_EVENT) ? startEvent(s, content, INTRO_EVENT) : s;
}

export function toSave(state: GameState): SaveData {
  return structuredCloneSave(state.save);
}

function structuredCloneSave(s: SaveData): SaveData {
  return JSON.parse(JSON.stringify(s)) as SaveData;
}

// ───────────────────────── loadGame: strict validation, defaults for missing optional fields ─────────────────────────

class Bad extends Error {}
const bad = (what: string): never => {
  throw new Bad(what);
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);

function opt<T>(o: Obj, key: string, fallback: T, check: (v: unknown) => T): T {
  return o[key] === undefined ? fallback : check(o[key]);
}
function num(v: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER): number {
  return isNum(v) && v >= lo && v <= hi ? v : bad('number');
}
function int(v: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER): number {
  return isInt(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : bad('integer');
}
function str(v: unknown, max = 500): string {
  return typeof v === 'string' && v.length <= max ? v : bad('string');
}
function bool(v: unknown): boolean {
  return typeof v === 'boolean' ? v : bad('boolean');
}
function dir(v: unknown): Dir {
  return isDir(v) ? v : bad('dir');
}
function kanda(v: unknown): KandaId {
  return isInt(v) && (v as number) >= 1 && (v as number) <= 6 ? (v as KandaId) : bad('kanda');
}
function record<T>(v: unknown, each: (x: unknown) => T, maxKeys = 5000): Record<string, T> {
  if (!isObj(v)) return bad('record');
  const keys = Object.keys(v);
  if (keys.length > maxKeys) bad('too many keys');
  const out: Record<string, T> = {};
  for (const k of keys) out[k] = each(v[k]);
  return out;
}
function member(v: unknown): PartyMember {
  if (!isObj(v)) return bad('member');
  const moves = v['moves'];
  if (!Array.isArray(moves) || moves.length > 4 || !moves.every((m) => typeof m === 'string')) bad('moves');
  return {
    id: str(v['id'], 64),
    level: int(v['level'], 1, 100),
    xp: num(v['xp']),
    hp: num(v['hp']),
    pp: record(v['pp'], (x) => num(x), 64),
    moves: [...(moves as string[])],
  };
}
function word(v: unknown): WordProgress {
  if (!isObj(v)) return bad('word');
  return { seen: num(v['seen']), correct: num(v['correct']), wrong: num(v['wrong']), box: int(v['box'], 0, 5), lastStep: num(v['lastStep'], -1e15) };
}
function shlokaProg(v: unknown): ShlokaProgress {
  if (!isObj(v)) return bad('shloka');
  return { heard: bool(v['heard']), restored: bool(v['restored']), best: num(v['best'], 0, 1) };
}
/** smṛti record (Kathā): lenient, an entry that does not parse is dropped (a bad entry never costs the whole save). */
function smrtiRecord(v: unknown): NonNullable<SaveData['smrti']> {
  const out: NonNullable<SaveData['smrti']> = {};
  if (!isObj(v)) return out;
  const keys = Object.keys(v);
  for (const k of keys.slice(0, 500)) {
    const e = v[k];
    if (!isObj(e) || k.length > 80) continue;
    const level = e['level'];
    const streak = e['streak'];
    if (!isInt(level) || (level as number) < 0 || (level as number) > MASTERED || !isInt(streak) || (streak as number) < 0 || (streak as number) > 1000) continue;
    const entry: NonNullable<SaveData['smrti']>[string] = { level: level as number, streak: streak as number };
    if (isInt(e['casts']) && (e['casts'] as number) >= 0) entry.casts = e['casts'] as number;
    if (isInt(e['nextCheck']) && (e['nextCheck'] as number) >= 1 && (e['nextCheck'] as number) <= 2 ** 30) entry.nextCheck = e['nextCheck'] as number;
    if (isInt(e['last']) && (e['last'] as number) >= 0 && (e['last'] as number) < 64) entry.last = e['last'] as number;
    out[k] = entry;
  }
  return out;
}

function place(v: unknown): { mapId: string; x: number; y: number } {
  if (!isObj(v)) return bad('place');
  return { mapId: str(v['mapId'], 64), x: int(v['x'], 0, 10000), y: int(v['y'], 0, 10000) };
}

/** Fit a stored member to the current content: known moves only (defaults if none left), hp ≤ max hp. */
function fitMember(m: PartyMember, content: GameContent): PartyMember {
  const idx = indexOf(content);
  const def = idx.ally.get(m.id);
  if (!def || idx.move.size === 0) return m;
  const fresh = newMember(def, m.level, content);
  const moves = m.moves.filter((id) => idx.move.has(id));
  const pp: Record<string, number> = {};
  for (const [id, n] of Object.entries(m.pp)) {
    const mv = idx.move.get(id);
    if (mv) pp[id] = Math.min(mv.pp, Math.max(0, Math.round(n)));
  }
  const use = moves.length > 0 ? moves : fresh.moves;
  for (const id of use) if (pp[id] === undefined) pp[id] = fresh.pp[id] ?? idx.move.get(id)?.pp ?? 0;
  return { ...m, moves: use, pp, hp: Math.min(m.hp, fresh.hp) };
}

function parseSave(raw: unknown, content: GameContent): SaveData {
  if (!isObj(raw)) return bad('not an object');
  if (raw['v'] !== 1) bad('version');
  const mapId = str(raw['mapId'], 64);
  const x = int(raw['x'], 0, 10000);
  const y = int(raw['y'], 0, 10000);
  const flags = opt(raw, 'flags', {} as Record<string, true>, (v) => record(v, (f) => (f === true ? (true as const) : bad('flag'))));
  const allies = indexOf(content).ally;
  let party = opt(raw, 'party', [] as PartyMember[], (v) => (Array.isArray(v) && v.length <= 12 ? v.map(member) : bad('party')));
  if (allies.size > 0) party = party.filter((m) => allies.has(m.id));
  party = party.filter((m, i) => party.findIndex((o) => o.id === m.id) === i).slice(0, 6);
  if (party.length === 0) party = [playerMember(content, START_LEVEL)];
  party = party.map((m) => fitMember(m, content));
  const completed = opt(raw, 'completedChapters', [] as KandaId[], (v) => (Array.isArray(v) && v.length <= 6 ? [...new Set(v.map(kanda))] : bad('completedChapters')));
  return {
    v: 1,
    playerName: cleanName(str(raw['playerName'], 200)),
    avatar: opt(raw, 'avatar', 'a' as 'a' | 'b', (v) => (v === 'a' || v === 'b' ? v : bad('avatar'))),
    mapId,
    x,
    y,
    facing: opt(raw, 'facing', 'down' as Dir, dir),
    respawn: opt(raw, 'respawn', { mapId, x, y }, place),
    chapter: opt(raw, 'chapter', 1 as KandaId, kanda),
    objective: opt(raw, 'objective', '', (v) => str(v, 500)),
    flags,
    party,
    items: opt(raw, 'items', {} as Record<string, number>, (v) => record(v, (n) => int(n, 0, 9999), 500)),
    niska: Math.floor(opt(raw, 'niska', 0, (v) => num(v, 0, 1e9))),
    words: opt(raw, 'words', {} as Record<string, WordProgress>, (v) => record(v, word)),
    shlokas: opt(raw, 'shlokas', {} as Record<string, ShlokaProgress>, (v) => record(v, shlokaProg, 500)),
    step: opt(raw, 'step', 0, (v) => num(v, 0)),
    npcPos: opt(raw, 'npcPos', {} as SaveData['npcPos'], (v) =>
      record(v, (p) => (isObj(p) ? { x: int(p['x'], -100, 10000), y: int(p['y'], -100, 10000), facing: dir(p['facing']) } : bad('npcPos'))),
    ),
    playMs: opt(raw, 'playMs', 0, (v) => num(v, 0)),
    completedChapters: completed,
    // v0.4 journey style: present only when the stored save has it (absent = the practice game, as before)
    ...(raw['style'] === 'katha' || raw['style'] === 'abhyasa' ? { style: raw['style'] } : {}),
    ...(raw['smrti'] !== undefined ? { smrti: smrtiRecord(raw['smrti']) } : {}),
    // v0.4.3 reader level: kept when valid (anything else = English, no field)
    ...(toReader(raw['reader']) ? { reader: toReader(raw['reader']) } : {}),
  };
}

function standable(content: GameContent, p: { mapId: string; x: number; y: number }): boolean {
  const map = mapById(content, p.mapId);
  return !!map && !isSolidTile(map, p.x, p.y);
}

/** Validate/migrate a stored save. Returns null for anything unusable; never throws. */
export function loadGame(raw: unknown, seed: number, level: Level, all: GameContent): GameState | null {
  let save: SaveData;
  // v0.6: the practice game never sees Kathā-only content (logic-journey)
  const content = journeyContent(all, isObj(raw) && raw['style'] === 'katha' ? { style: 'katha' } : null);
  try {
    save = parseSave(raw, content);
  } catch (e) {
    if (e instanceof Bad || e instanceof TypeError || e instanceof RangeError) return null;
    return null;
  }
  // Verse flags are derived data: make sure they agree with save.shlokas (older saves, hand-edited saves).
  const derived: Record<string, true> = { ...save.flags };
  for (const [id, p] of Object.entries(save.shlokas)) {
    if (p.heard) derived[`heard.${id}`] = true;
    if (p.restored) derived[`restored.${id}`] = true;
  }
  // the journey-style flag follows save.style (a missing style is the practice game)
  if (save.style === 'katha') derived[KATHA_FLAG] = true;
  else {
    delete derived[KATHA_FLAG];
    delete derived[ARMED_FLAG];
  }
  save = { ...save, flags: derived, ...(save.style === 'katha' ? { smrti: save.smrti ?? {} } : {}) };
  // Content may have changed since the save was written: never leave the player inside a wall.
  if (content.maps.length > 0) {
    const start = startOf(content);
    if (!standable(content, save.respawn)) save = { ...save, respawn: standable(content, start) ? start : save.respawn };
    if (!standable(content, save)) save = { ...save, ...(standable(content, save.respawn) ? save.respawn : start) };
  }
  // v0.4.1: a Kathā save written before astras were equipped automatically gets its unlocked astras now (once)
  const s = baseState(seed, level, save);
  return save.style === 'katha' && !save.flags[ARMED_FLAG] ? armKatha(s, content) : s;
}

// ───────────────────────── session result & progress ─────────────────────────

export const REVIEW_MAX = 12;

export function sessionResult(state: GameState, all: GameContent): SessionResult {
  const content = journeyContent(all, state.save);
  const idx = indexOf(content);
  const ss = state.session;
  const won = !!state.save.flags['ch6.complete'];
  const score = 10 * ss.correct + 25 * ss.shlokasRestored.length + 100 * ss.chaptersCompleted.length;
  // last result per word, in first-practised order
  const last = new Map<string, boolean>();
  for (const p of ss.practised) {
    if (last.has(p.lexId)) last.delete(p.lexId);
    last.set(p.lexId, p.correct);
  }
  const ordered = [...last.entries()].filter(([id]) => idx.lex.has(id));
  const review: ReviewItem[] = [...ordered.filter(([, c]) => !c), ...ordered.filter(([, c]) => c)]
    .slice(0, REVIEW_MAX)
    .map(([id, correct]) => {
      const e = idx.lex.get(id)!;
      return { sa: e.lemma, en: e.meaning, correct };
    });
  const mastery: MasteryEvent[] = [
    ...ordered.map(([id, correct]) => ({ skill: 'shabdakosha' as const, itemId: `shabdakosha:ramayana:${id}`, correct })),
    ...ss.shlokasRestored.map((id) => ({ skill: 'subhashita' as const, itemId: `subhashita:ramayana:${id}`, correct: true })),
  ];
  const restoredTotal = Object.values(state.save.shlokas).filter((p) => p.restored).length;
  const books = [...ss.chaptersCompleted].sort((a, b) => a - b);
  const chapters = books.length === 1 ? `Book ${books[0]} complete` : books.length > 1 ? `Books ${books.join(', ')} complete` : `Book ${state.save.chapter} in progress`;
  const verses = `${ss.shlokasRestored.length} verse${ss.shlokasRestored.length === 1 ? '' : 's'} restored`;
  const summary = `${chapters} · ${verses} · ${ss.correct}/${ss.total} correct`;
  return {
    outcome: won ? 'won' : 'completed',
    score,
    correct: ss.correct,
    total: ss.total,
    best: { label: 'Verses restored', value: restoredTotal },
    share: summary,
    summary,
    review,
    mastery,
  };
}

/** 0..1 story progress for ctx.hud: share of walkthrough flags set (or completed chapters / 6). v0.5b: the steps of the save's journey (Kathā-only steps count in Kathā only). */
export function storyProgress(state: GameState, content: GameContent): number {
  if (state.save.flags['ch6.complete']) return 1;
  const steps = journeySteps(content, state.save);
  if (steps.length > 0) return Math.min(1, steps.filter((w) => state.save.flags[w.expectFlag]).length / steps.length);
  return Math.min(1, state.save.completedChapters.length / 6);
}
