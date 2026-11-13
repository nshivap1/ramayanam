/**
 * Progression and combat math (DESIGN §5–6). OWNER: battle. Pure; no randomness of its own
 * (callers pass `variance`).
 *
 * Move-learning rules:
 *  - A move in an ally's `moves` list whose MoveDef has NO `unlockShloka` is learned at that level.
 *  - A move whose MoveDef HAS `unlockShloka` is learned only when that śloka is restored
 *    (logic-learning → recital); the `level` written next to it in defs.json is ignored.
 *  - Newly learned moves are equipped automatically while fewer than 4 are equipped; otherwise
 *    they are "learnable" (see `learnableMoves`) and the player equips them from the Party menu.
 */
import type { AllyDef, CombatantDef, Fighter, GameContent, GameState, MoveDef, PartyMember, SaveData, Stats } from './types';
import { ELEMENT_CHART } from './catalog';
import { clamp, indexOf, must } from './logic-util';

export const MAX_LEVEL = 50;
export const MAX_EQUIPPED = 4;
export const MAX_STAGE = 3;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(12 * Math.pow(level, 1.8));
}

/** Total XP needed to reach `level` from level 1 (handy for tests / balance tables). */
export function xpToReach(level: number): number {
  let t = 0;
  for (let l = 1; l < level; l++) t += xpToNext(l);
  return t;
}

export function statsAt(def: CombatantDef, level: number): Stats {
  const l = Math.max(0, level - 1);
  const f = (b: number, g: number): number => Math.max(1, Math.floor(b + g * l));
  return { hp: f(def.base.hp, def.growth.hp), atk: f(def.base.atk, def.growth.atk), def: f(def.base.def, def.growth.def), spd: f(def.base.spd, def.growth.spd) };
}

/** Moves an ally knows from levels alone (in list order, which is level order in defs.json). */
export function levelMoves(def: CombatantDef, level: number, content: GameContent): string[] {
  const idx = indexOf(content);
  return def.moves.filter((m) => m.level <= level && !idx.move.get(m.moveId)?.unlockShloka).map((m) => m.moveId);
}

/** Every move a member may equip: level moves + moves unlocked by restored ślokas. */
export function learnableMoves(member: PartyMember, save: Pick<SaveData, 'shlokas'>, content: GameContent): string[] {
  const idx = indexOf(content);
  const def = idx.ally.get(member.id);
  if (!def) return member.moves.slice();
  const out: string[] = [];
  for (const m of def.moves) {
    const mv = idx.move.get(m.moveId);
    if (!mv) continue;
    const ok = mv.unlockShloka ? !!save.shlokas[mv.unlockShloka]?.restored : m.level <= member.level;
    if (ok && !out.includes(m.moveId)) out.push(m.moveId);
  }
  for (const m of member.moves) if (!out.includes(m)) out.push(m);
  return out;
}

/** The ally (AllyDef id) whose move list contains this move, or null. */
export function allyForMove(moveId: string, content: GameContent): string | null {
  for (const a of content.allies) if (a.moves.some((m) => m.moveId === moveId)) return a.id;
  return null;
}

/**
 * Give a member every śloka-unlocked move whose verse is already restored (call when an ally joins
 * after the verse was restored). Equips while < 4 equipped; always sets PP for them.
 */
export function withUnlockedMoves(member: PartyMember, save: Pick<SaveData, 'shlokas'>, content: GameContent): PartyMember {
  const idx = indexOf(content);
  const def = idx.ally.get(member.id);
  if (!def) return member;
  let moves = member.moves.slice();
  const pp = { ...member.pp };
  for (const m of def.moves) {
    const mv = idx.move.get(m.moveId);
    if (!mv?.unlockShloka || !save.shlokas[mv.unlockShloka]?.restored) continue;
    if (pp[mv.id] === undefined) pp[mv.id] = mv.pp;
    if (!moves.includes(mv.id) && moves.length < MAX_EQUIPPED) moves = [...moves, mv.id];
  }
  return { ...member, moves, pp };
}

/** Optional defs.json field on an ally: the lowest level they ever join at (the story's chapter floor for them). */
export function minJoinLevel(def: AllyDef): number {
  const v = (def as AllyDef & { minLevel?: number }).minLevel;
  return typeof v === 'number' && Number.isFinite(v) ? v : 1;
}

/** A new party member at `level`, raised to the ally's `minLevel` (so heroes never join far below the story's level). */
export function newMember(def: AllyDef, level: number, content: GameContent): PartyMember {
  const lv = clamp(Math.max(Math.round(level), minJoinLevel(def)), 1, MAX_LEVEL);
  const s = statsAt(def, lv);
  const learned = levelMoves(def, lv, content);
  const idx = indexOf(content);
  const moves = learned.slice(0, MAX_EQUIPPED);
  const pp: Record<string, number> = {};
  for (const m of learned) pp[m] = must(idx.move, m, 'move').pp;
  return { id: def.id, level: lv, xp: 0, hp: s.hp, pp, moves };
}

export function maxHpOf(m: PartyMember, content: GameContent): number {
  return statsAt(must(indexOf(content).ally, m.id, 'ally'), m.level).hp;
}

export function fighterFromMember(m: PartyMember, content: GameContent): Fighter {
  const def = must(indexOf(content).ally, m.id, 'ally');
  const s = statsAt(def, m.level);
  return { id: m.id, level: m.level, hp: clamp(m.hp, 0, s.hp), maxHp: s.hp, atk: s.atk, def: s.def, spd: s.spd, element: def.element, moves: m.moves.slice(), stages: { atk: 0, def: 0 }, stunned: false };
}

export function fighterFromEnemy(id: string, level: number, content: GameContent): Fighter {
  const def = must(indexOf(content).enemy, id, 'enemy');
  const s = statsAt(def, level);
  const moves = def.moves.filter((m) => m.level <= level).map((m) => m.moveId);
  return { id, level, hp: s.hp, maxHp: s.hp, atk: s.atk, def: s.def, spd: s.spd, element: def.element, moves: moves.length ? moves : def.moves.slice(0, 1).map((m) => m.moveId), stages: { atk: 0, def: 0 }, stunned: false };
}

/** ×1.25 per positive stage, ×0.8 per negative stage, clamped to ±3. */
export function stageMult(stage: number): number {
  const s = clamp(Math.round(stage), -MAX_STAGE, MAX_STAGE);
  return s >= 0 ? Math.pow(1.25, s) : Math.pow(0.8, -s);
}

export function elementMult(moveElement: string, defender: string): number {
  return ELEMENT_CHART[moveElement]?.[defender] ?? 1;
}

/**
 * DESIGN §5: base = floor(((2L/5 + 2) · power · atk/def) / 50) + 2, then × element × STAB(1.25) × quality × variance.
 * Stages modify atk (attacker) and def (defender). Status moves (power 0) deal 0.
 */
export function damage(attacker: Fighter, defender: Fighter, move: MoveDef, quality: number, variance: number): { amount: number; effective?: 'super' | 'weak' } {
  if (move.power <= 0) return { amount: 0 };
  const atk = attacker.atk * stageMult(attacker.stages.atk);
  const def = Math.max(1, defender.def * stageMult(defender.stages.def));
  const base = Math.floor((((2 * attacker.level) / 5 + 2) * move.power * (atk / def)) / 50) + 2;
  const mult = elementMult(move.element, defender.element);
  const stab = move.element === attacker.element ? 1.25 : 1;
  const amount = Math.max(1, Math.round(base * mult * stab * quality * variance));
  const effective = mult > 1 ? 'super' : mult < 1 ? 'weak' : undefined;
  return effective ? { amount, effective } : { amount };
}

/**
 * XP one member earns for one defeated foe. DESIGN §5 base `enemy.xp · L / 5`, then
 *  × max(1, (L/5)^0.95) so the yield keeps pace with the L^1.8 curve (≈ 2–3 battles per level all game),
 *  × share: 1 for heroes who fought, 0.75 for the rest of the party, 0.5 for exhausted heroes (nobody falls far behind),
 *  × catch-up clamp(1 + 0.15·(foeLevel − memberLevel), 0.4, 3) so natural play converges on the encounter levels.
 */
export function battleXp(enemyXp: number, foeLevel: number, memberLevel: number, fought: boolean, exhausted = false): number {
  const base = (enemyXp * foeLevel) / 5;
  const scale = Math.max(1, Math.pow(foeLevel / 5, 0.95));
  const share = exhausted ? 0.5 : fought ? 1 : 0.75;
  const catchUp = clamp(1 + 0.15 * (foeLevel - memberLevel), 0.4, 3);
  return Math.max(1, Math.round(base * scale * share * catchUp));
}

/** Expected party level at the start of each chapter (the floor for heroes who join; see joinLevel). */
export const CHAPTER_FLOOR: Record<number, number> = { 1: 5, 2: 7, 3: 11, 4: 15, 5: 18, 6: 24 };

/** Level for a hero joining now: max(rounded party average, the chapter's floor). For core's `{join}`. */
export function joinLevel(save: Pick<SaveData, 'party' | 'chapter'>): number {
  const avg = save.party.length ? Math.round(save.party.reduce((a, m) => a + m.level, 0) / save.party.length) : 1;
  return clamp(Math.max(avg, CHAPTER_FLOOR[save.chapter] ?? 1), 1, MAX_LEVEL);
}

/** Level up one member by `xp`; returns the new member and what changed. */
export function addXp(m: PartyMember, xp: number, content: GameContent): { member: PartyMember; levels: number[]; learned: string[] } {
  const idx = indexOf(content);
  const def = must(idx.ally, m.id, 'ally');
  let { level, xp: cur, hp } = m;
  let moves = m.moves.slice();
  const pp = { ...m.pp };
  const levels: number[] = [];
  const learned: string[] = [];
  cur += Math.max(0, Math.round(xp));
  while (level < MAX_LEVEL && cur >= xpToNext(level)) {
    cur -= xpToNext(level);
    const before = statsAt(def, level).hp;
    level += 1;
    const after = statsAt(def, level).hp;
    if (hp > 0) hp += after - before;
    levels.push(level);
    for (const lm of def.moves) {
      const mv = idx.move.get(lm.moveId);
      if (!mv || mv.unlockShloka || lm.level !== level) continue;
      if (pp[mv.id] === undefined) pp[mv.id] = mv.pp;
      if (!moves.includes(mv.id)) {
        learned.push(mv.id);
        if (moves.length < MAX_EQUIPPED) moves = [...moves, mv.id];
      }
    }
  }
  if (level >= MAX_LEVEL) cur = 0;
  return { member: { ...m, level, xp: cur, hp, moves, pp }, levels, learned };
}

export function grantXp(state: GameState, content: GameContent, members: number[], xp: number): { state: GameState; levelUps: { member: number; level: number; learned: string[] }[] } {
  const party = state.save.party.slice();
  const levelUps: { member: number; level: number; learned: string[] }[] = [];
  for (const i of new Set(members)) {
    const m = party[i];
    if (!m) continue;
    const r = addXp(m, xp, content);
    party[i] = r.member;
    if (r.levels.length) levelUps.push({ member: i, level: r.member.level, learned: r.learned });
  }
  return { state: { ...state, save: { ...state.save, party } }, levelUps };
}
