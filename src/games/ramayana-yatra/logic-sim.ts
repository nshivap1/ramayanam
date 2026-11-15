/**
 * Simulation helpers for tests: BFS pathing over walkable tiles + warps, an auto-player for every
 * pending/battle state, and the story-bot that follows `content.walkthrough`. OWNER: core.
 * Pure and deterministic (no clock, randomness only via the logic modules). Other agents may import it from tests.
 *
 * Kathā (v0.4): `runWalkthrough(…, { style: 'katha', accuracy })` plays the story-first journey. The bot recites
 * smarana challenges (a line with no gap: `picks: []`; a gap: the right chunk with probability `accuracy`, else a wrong
 * chip, from its own seeded rng), never grinds (there are no random encounters: a failed step rests and retries), and
 * never loops in a Kathā-only conversation choice (a choice seen again in the same scene takes the next option).
 * `careless` (v0.4.1): with that probability a battle move is a random usable plain move instead of the best (a careless player).
 * v0.4.2: the BFS (`findPath`) lives in logic-guide (re-exported here); `runGuide` is a bot that only follows the map pointer.
 * v0.4.3: `reader` ('sa' / 'sa-en') starts the journey with that reader level (save.reader), as the view does for a
 * player whose story text is संस्कृतम् / संस्कृतम् + English; absent = English (no field, today's game).
 * v0.5b: the story bots follow the steps of their journey only (a walkthrough step with `style: 'katha'` is Kathā-only:
 * logic-katha stepInJourney); `botActions` solves Nala's bridge (pending 'setu', logic-setu setuBotActions), continues a
 * book review ('book'), recites a story pāda (challenge context 'scene', like any smarana) and answers a verse-chain pick
 * ('antya', options / answers) with the reciter's accuracy.
 * v0.5a: `policy` picks the battle moves — 'best' (default, the battle agent's perfect bot: set-ups, then the most
 * damaging move), 'spam' (the most damaging move every turn: no set-up, blind to warnings, fatigue and fits) or
 * 'strategic' (Kathā tactics, logic-tactics.ts: the decisive fitting astra, answers a readied blow — a counter, a support
 * move, else a guardian's cover —, and rotates so it never casts a tired astra when another move does as much).
 */
import { type Level, type Rng, createRng, hashString } from '@sdk';
import type { Action, Dir, EventCmd, GameContent, GameState, JourneyStyle, Reader, WalkStep } from './types';
import { indexOf, testFlag } from './logic-util';
import { TILE_PROPS } from './catalog';
import { lastCmd, maxHpOf } from './logic-events';
import { newGame } from './logic-state';
import { DELTA, DIRS, hasTile, isSolidTile, mapById, npcsOn, tileAt, triggerCovers, triggerFlag, warpAt } from './logic-world';
import { type GuideTarget, findPath, guideStep, guideTarget, spot, talkSpots, visibleTarget } from './logic-guide';
import { COVER_CMD, SHIELD_CMD, answerOf, battleMenu, canShield, coverOf, damage, fatigueMult, fighterFromMember, isDecisive, nextChain, reduce } from './logic';
import { stepInJourney } from './logic-katha';
import { setuBotActions } from './logic-setu';
import { cutsceneDue } from './logic-cutscene'; // v0.5b WP-E
import { toldHotspots, toldOf } from './logic-told'; // v0.6 WP0

export class SimError extends Error {}

/** Short description of a state for error messages. */
export function describe(s: GameState): string {
  const p = s.pending;
  const extra = p?.kind === 'say' ? ` "${p.text.slice(0, 50)}"` : p?.kind === 'challenge' ? ` ${p.context}/${p.challenge.kind}` : '';
  return `mode=${s.mode} pending=${p?.kind ?? 'none'}${extra} event=${s.script?.eventId ?? '-'} battle=${s.battle?.phase ?? '-'} at ${s.save.mapId}(${s.save.x},${s.save.y}) facing ${s.save.facing}`;
}

// ───────────────────────── pathing ─────────────────────────
// findPath (multi-map BFS), talkSpots and visibleTarget live in logic-guide (the view's map pointer uses them too).
export { findPath };

// ───────────────────────── auto-player ─────────────────────────

export interface AutoOptions {
  /** At a shrine: recite this verse (once). */
  recite?: string;
  /** Upper bound on actions for one autoplay call. */
  maxActions?: number;
  /** Prefer paths that avoid encounter tiles (falls back to any path). Default false (walk like a player). */
  avoidEncounters?: boolean;
  /** Called on every applied action (tests can count battles, defeats …). */
  onAction?: (before: GameState, action: Action, after: GameState) => void;
  /** Kathā reciter: picks the right chunk of a smarana gap with probability `accuracy` (rng: the bot's own). Default: always right. */
  reciter?: { accuracy: number; rng: Rng };
  /** A careless player (v0.4.1): with probability `chance` a battle move is a random usable PLAIN move, not the best (rng: the bot's own). */
  careless?: { chance: number; rng: Rng };
  /** v0.5a battle policy (default 'best'); see the file header */
  policy?: 'best' | 'spam' | 'strategic';
  /** v0.6: find every hidden moment (a hotspot: choose 0; a told cutscene: all its hotspots found). Default: pass them by. */
  hidden?: boolean;
}

function correctAnswer(s: GameState, reciter?: AutoOptions['reciter']): Action | null {
  const p = s.pending;
  if (p?.kind !== 'challenge') return null;
  const ch = p.challenge;
  const sp = ch.smarana;
  if (sp) {
    if (sp.gaps.length === 0) return { type: 'answer', picks: [], timeMs: 500 };
    const picks = sp.gaps.map((_g, i) => {
      const right = sp.gapAnswers[i]?.[0] ?? sp.gapOptions[i]?.[0]?.id ?? 'o0';
      if (!reciter || reciter.rng.next() < reciter.accuracy) return right;
      return sp.gapOptions[i]?.find((o) => !(sp.gapAnswers[i] ?? []).includes(o.id))?.id ?? right;
    });
    return { type: 'answer', picks, timeMs: 1500 };
  }
  if (ch.orders && ch.orders.length > 0) return { type: 'answer', order: [...ch.orders[0]!], timeMs: 500 };
  // v0.5b P6 (a verse-chain pick, WP-C): the reciter's accuracy applies — a miss picks a chip that does not chain
  if (ch.kind === 'antya' && ch.answers && ch.answers.length > 0 && reciter && reciter.rng.next() >= reciter.accuracy) {
    const wrong = (ch.options ?? []).find((o) => !ch.answers!.includes(o.id));
    if (wrong) return { type: 'answer', option: wrong.id, timeMs: 1500 };
  }
  if (ch.answers && ch.answers.length > 0) return { type: 'answer', option: ch.answers[0]!, timeMs: 500 };
  return null;
}

/**
 * Choice: option 0, unless some option has no goto while others do (then the first goto-less one). `seen` = how many
 * times this same choice was already answered in this scene: a conversation that turns back to the question (a Kathā
 * reply that misreads it) then gets the next option, so the bot never loops.
 */
export function pickChoice(s: GameState, seen = 0): number {
  const cmd = lastCmd(s) as EventCmd | undefined;
  let first = 0;
  let n = 1;
  if (cmd && 'choice' in cmd) {
    const opts = cmd.options;
    n = Math.max(1, opts.length);
    const free = opts.findIndex((o) => !o.goto);
    if (free >= 0 && opts.some((o) => o.goto)) first = free;
  }
  return (first + seen) % n;
}

/** Identity of the choice on screen (event, frame depth, pc) for loop detection. */
function choiceKey(s: GameState): string {
  const f = s.script?.frames;
  const top = f?.[f.length - 1];
  return `${s.script?.eventId ?? ''}:${f?.length ?? 0}:${top?.pc ?? 0}:${hashString(JSON.stringify(top?.cmds[(top?.pc ?? 1) - 1] ?? null))}`;
}

/**
 * Index (in the battle menu) of the move to use: the same policy as the battle agent's perfect bot
 * (heal below 40%, set up debuffs/buffs while the foe is healthy, else the most damaging usable move).
 */
function bestMoveIndex(s: GameState, content: GameContent, tactics = false): number {
  const b = s.battle;
  if (!b) return 0;
  const idx = indexOf(content);
  const menu = battleMenu(s, content);
  let best = -1;
  let bestScore = -Infinity;
  menu.moves.forEach((m, i) => {
    if (!m.usable) return;
    const mv = idx.move.get(m.id);
    if (!mv) return;
    const e = mv.effect;
    const foeHealthy = b.foe.hp > b.foe.maxHp * 0.5;
    let score = -1;
    if (mv.power > 0) score = damage(b.ally, b.foe, mv, 1, 1).amount * (tactics ? fatigueMult(b.chain, content, mv.id) : 1);
    else if (e?.kind === 'heal') score = b.ally.hp / b.ally.maxHp < 0.4 ? 1e6 : -1;
    else if (e?.kind === 'debuff-def') score = b.foe.stages.def > -2 && foeHealthy ? 5e5 : -1;
    else if (e?.kind === 'buff-atk') score = b.ally.stages.atk < 2 && foeHealthy ? 4e5 : -1;
    else if (e?.kind === 'debuff-atk') score = b.foe.stages.atk > -2 && foeHealthy ? 3e5 : -1;
    // (the strategic bot keeps its guard for a readied blow)
    else if (e?.kind === 'buff-def') score = !tactics && b.ally.stages.def < 2 && b.foe.hp > b.foe.maxHp * 0.6 ? 2e5 : -1;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return Math.max(0, best);
}

/** v0.5a 'spam': the most damaging usable move every turn (no set-up; blind to warnings, fatigue and fits). */
function spamMoveIndex(s: GameState, content: GameContent): number {
  const b = s.battle;
  if (!b) return 0;
  const idx = indexOf(content);
  let best = -1;
  let bestD = 0;
  battleMenu(s, content).moves.forEach((m, i) => {
    const mv = idx.move.get(m.id);
    if (!m.usable || !mv || mv.power <= 0) return;
    const d = damage(b.ally, b.foe, mv, 1, 1).amount;
    if (d > bestD) {
      bestD = d;
      best = i;
    }
  });
  return best >= 0 ? best : bestMoveIndex(s, content);
}

/**
 * v0.5a 'strategic' (Kathā): a decisive fitting astra first; with a blow readied, a counter (the most damaging), else a
 * recited answer (a verse-bound support mantra, else the verse shield), else a guardian's cover, else a plain support move; otherwise the perfect bot's choice with
 * tired astras scored at their tired damage (so it rotates).
 */
export function strategicChoice(s: GameState, content: GameContent): { cover: true } | { shield: true } | { index: number } {
  const b = s.battle;
  if (!b) return { index: 0 };
  const idx = indexOf(content);
  const moves = battleMenu(s, content).moves.map((m, i) => ({ ...m, i, def: idx.move.get(m.id) })).filter((m) => m.usable && m.def);
  const decisive = moves.find((m) => isDecisive(content, s.save.chapter, b.foe, m.id));
  if (decisive) return { index: decisive.i };
  if (b.warn) {
    const hit = (m: (typeof moves)[number]): number => damage(b.ally, b.foe, m.def!, 1, 1).amount * fatigueMult(b.chain, content, m.id);
    const counters = moves.filter((m) => answerOf(content, b.warn, m.id) === 'counter').sort((x, y) => hit(y) - hit(x));
    if (counters[0]) return { index: counters[0].i };
    // a support move answers: a recited one (a verse-bound mantra) first, then a guard (defence up / foe's attack down)
    const rank = (m: (typeof moves)[number]): number => (m.def!.unlockShloka ? 2 : 0) + (['buff-def', 'debuff-atk'].includes(m.def!.effect?.kind ?? '') ? 1 : 0);
    const support = moves.filter((m) => answerOf(content, b.warn, m.id) === 'guard').sort((x, y) => rank(y) - rank(x));
    // a recited answer first: a verse-bound support mantra, else the verse shield; then a guardian's cover, a plain support move
    if (support[0]?.def!.unlockShloka) return { index: support[0].i };
    if (canShield(s, content)) return { shield: true };
    if (coverOf(s, content)) return { cover: true };
    if (support[0]) return { index: support[0].i };
  }
  // the perfect bot's set-up moves, else the damaging move that is best over two turns (this cast, then the best cast
  // after it): a tired astra gives way to another move when that pays off
  const base = bestMoveIndex(s, content, true);
  if ((idx.move.get(battleMenu(s, content).moves[base]?.id ?? '')?.power ?? 0) <= 0) return { index: base };
  // the best astra is tired: a verse-bound mantra that still builds (attack up, the foe's defence down, a heal when hurt)
  // rests it, and is recited
  if (b.chain && fatigueMult(b.chain, content, b.chain.moveId) < 1 && b.foe.hp > b.foe.maxHp * 0.25) {
    const builds = moves.find((m) => {
      const e = m.def!.effect;
      if (m.def!.power > 0 || !m.def!.unlockShloka || !e) return false;
      if (e.kind === 'buff-atk') return b.ally.stages.atk < 2;
      if (e.kind === 'debuff-def') return b.foe.stages.def > -2;
      if (e.kind === 'heal') return b.ally.hp < b.ally.maxHp * 0.6;
      return false;
    });
    if (builds) return { index: builds.i };
  }
  // a recited astra lands × 1.1 when its gap is recalled (KATHA_QUALITY.recalled): counted, so a verse wins a near tie
  const dmg = (id: string, chain: typeof b.chain): number => {
    const mv = idx.move.get(id);
    return mv && mv.power > 0 ? damage(b.ally, b.foe, mv, 1, 1).amount * fatigueMult(chain, content, id) * (mv.unlockShloka ? 1.1 : 1) : 0;
  };
  let best = base;
  let bestScore = -1;
  for (const m of moves) {
    if (m.def!.power <= 0) continue;
    const after = nextChain(b.chain, m.id);
    const score = dmg(m.id, b.chain) + Math.max(0, ...moves.map((x) => dmg(x.id, after)));
    if (score > bestScore) {
      bestScore = score;
      best = m.i;
    }
  }
  return { index: best };
}

function healItemIndex(s: GameState, content: GameContent): number {
  const idx = indexOf(content);
  return battleMenu(s, content).items.findIndex((x) => idx.item.get(x)?.kind === 'heal');
}

function lowHp(s: GameState): boolean {
  const b = s.battle;
  return !!b && b.ally.hp / Math.max(1, b.ally.maxHp) < 0.3;
}

interface AutoCtx {
  recite?: string;
  recited: boolean;
  rested: boolean;
  reciter?: AutoOptions['reciter'];
  careless?: AutoOptions['careless'];
  policy?: AutoOptions['policy'];
  /** choices answered in this scene (choiceKey → times) */
  choices?: Map<string, number>;
  /** v0.5b WP-E: the due cutscene is already offered (its candidates are being listed after it) */
  sceneSeen?: boolean;
  /** v0.6: find hidden moments (AutoOptions.hidden) */
  hidden?: boolean;
}

/** Candidate actions for the current state, best first (the first one the reducer accepts is used). */
export function botActions(s: GameState, content: GameContent, ctx: AutoCtx): Action[] {
  const p = s.pending;
  const ans = correctAnswer(s, ctx.reciter);
  if (s.mode === 'battle') {
    // v0.5b WP-E: the Kathā bot watches a due cutscene first (the view would play it); the battle's own candidates
    // follow, for callers that step with battleAction alone. The practice bot never does, so the practice journey's
    // actions and hashes stay as they were
    const scene = s.save.style === 'katha' && !ctx.sceneSeen ? cutsceneDue(s, content) : null;
    if (scene) return [{ type: 'cutscene-done', id: scene }, ...botActions(s, content, { ...ctx, sceneSeen: true })];
    const b = s.battle;
    const generic: Action[] = [{ type: 'advance' }, { type: 'choose', index: 0 }, { type: 'choose', index: -1 }, { type: 'choose', index: 1 }, { type: 'choose', index: 2 }];
    if (ans) return [ans, ...generic];
    if (p?.kind === 'feedback') return [{ type: 'advance' }, ...generic];
    switch (b?.phase) {
      case 'command':
        if (lowHp(s) && healItemIndex(s, content) >= 0) return [{ type: 'choose', index: 2 }, { type: 'choose', index: 0 }, ...generic];
        if (ctx.policy === 'strategic') {
          const c = strategicChoice(s, content);
          if ('cover' in c) return [{ type: 'choose', index: COVER_CMD }, { type: 'choose', index: 0 }, ...generic];
          if ('shield' in c) return [{ type: 'choose', index: SHIELD_CMD }, { type: 'choose', index: 0 }, ...generic];
        }
        return [{ type: 'choose', index: 0 }, ...generic];
      case 'pick-move': {
        // a careless player: now and then a plain move picked at random (astras still cast with sense)
        const plain = battleMenu(s, content).moves.flatMap((m, i) => (m.usable && !indexOf(content).move.get(m.id)?.unlockShloka ? [i] : []));
        const careless = ctx.careless && plain.length > 0 && ctx.careless.rng.next() < ctx.careless.chance;
        const pick = (): number => {
          if (ctx.policy === 'spam') return spamMoveIndex(s, content);
          if (ctx.policy === 'strategic') {
            const c = strategicChoice(s, content);
            return 'index' in c ? c.index : bestMoveIndex(s, content, true);
          }
          return bestMoveIndex(s, content);
        };
        const first = careless ? (plain[ctx.careless!.rng.int(plain.length)] as number) : pick();
        return [{ type: 'choose', index: first }, ...[0, 1, 2, 3].map((i) => ({ type: 'choose', index: i }) as Action), { type: 'choose', index: -1 }];
      }
      case 'pick-switch': {
        const sw = battleMenu(s, content).switchable.slice().sort((a, c) => fighterFromMember(s.save.party[c]!, content).atk - fighterFromMember(s.save.party[a]!, content).atk);
        return [...sw.map((i) => ({ type: 'choose', index: i }) as Action), ...[0, 1, 2, 3, 4, 5].map((i) => ({ type: 'choose', index: i }) as Action), { type: 'choose', index: -1 }, { type: 'advance' }];
      }
      case 'pick-item': {
        const hi = healItemIndex(s, content);
        return [...(lowHp(s) && hi >= 0 ? [{ type: 'choose', index: hi } as Action] : []), { type: 'choose', index: -1 }, ...generic];
      }
      default:
        return generic;
    }
  }
  if (!p) return [];
  switch (p.kind) {
    case 'challenge':
      return ans ? [ans] : [];
    case 'choice':
      return [{ type: 'choose', index: pickChoice(s, ctx.choices?.get(choiceKey(s)) ?? 0) }, ...p.options.map((_, i) => ({ type: 'choose', index: i }) as Action)];
    case 'shop': {
      const idx = indexOf(content);
      const heal = p.items
        .map((id) => idx.item.get(id))
        .filter((i): i is NonNullable<typeof i> => !!i && i.kind === 'heal')
        .sort((a, b) => a.price - b.price)[0];
      if (heal && (s.save.items[heal.id] ?? 0) < 5 && s.save.niska >= heal.price) return [{ type: 'buy', itemId: heal.id, qty: 1 }, { type: 'choose', index: -1 }];
      return [{ type: 'choose', index: -1 }];
    }
    case 'shrine':
      if (ctx.recite && !ctx.recited) return [{ type: 'recite', shlokaId: ctx.recite }];
      if (!ctx.rested) return [{ type: 'choose', index: 0 }];
      return [{ type: 'choose', index: 3 }];
    case 'ending':
      return [];
    case 'setu': // v0.5b P5 (WP-D): solve Nala's bridge (logic-setu), then continue
      return setuBotActions(p);
    case 'hotspot': // v0.6: a hidden moment — passed by (advance), or found with `hidden`
      return ctx.hidden ? [{ type: 'choose', index: 0 }, { type: 'advance' }] : [{ type: 'advance' }];
    case 'cutscene': {
      // v0.6: a told cutscene — the view would play it, then report what was found and picked (the first options)
      const c = toldOf(content, p.id);
      const found = ctx.hidden && c ? toldHotspots(c).map((h) => h.hotspot) : [];
      return [{ type: 'cutscene-done', id: p.id, found, answers: [] }, { type: 'advance' }];
    }
    default:
      // (v0.5b P2: a book review 'book' continues with advance too)
      return [{ type: 'advance' }];
  }
}

/** Play every pending/battle state until the game is back in explore (or ended). Throws SimError when stuck. */
export function autoplay(state: GameState, content: GameContent, opts: AutoOptions = {}): GameState {
  const ctx: AutoCtx = { recited: false, rested: false, choices: new Map(), ...(opts.recite ? { recite: opts.recite } : {}), ...(opts.reciter ? { reciter: opts.reciter } : {}), ...(opts.careless ? { careless: opts.careless } : {}), ...(opts.policy ? { policy: opts.policy } : {}), ...(opts.hidden ? { hidden: true } : {}) };
  const max = opts.maxActions ?? 20000;
  let losses = 0;
  let s = state;
  for (let n = 0; s.mode === 'script' || s.mode === 'battle'; n++) {
    if (n > max) throw new SimError(`autoplay did not finish in ${max} actions: ${describe(s)}`);
    const cands = botActions(s, content, ctx);
    let next = s;
    let used: Action | undefined;
    for (const a of cands) {
      next = reduce(s, content, a);
      if (next !== s) {
        used = a;
        break;
      }
    }
    if (!used) {
      if (s.pending?.kind === 'shrine' && ctx.recite && !ctx.recited) throw new SimError(`cannot recite "${ctx.recite}" (not heard yet, or unknown): ${describe(s)}`);
      throw new SimError(`autoplay: no accepted action: ${describe(s)}`);
    }
    if (s.mode === 'battle' && next.mode !== 'battle' && s.battle?.phase === 'lost' && ++losses > 4) {
      throw new SimError(`lost ${losses} battles in one scene (a retry loop?): ${describe(next)}`);
    }
    if (used.type === 'recite') ctx.recited = true;
    if (s.pending?.kind === 'choice' && used.type === 'choose' && s.save.style === 'katha') {
      const k = choiceKey(s);
      ctx.choices!.set(k, (ctx.choices!.get(k) ?? 0) + 1);
    }
    if (s.pending?.kind === 'shrine' && used.type === 'choose' && used.index === 0) ctx.rested = true;
    opts.onAction?.(s, used, next);
    s = next;
  }
  return s;
}

// ───────────────────────── walking ─────────────────────────

/** True when this transition is the respawn after a lost battle. */
export function isDefeat(before: GameState, after: GameState): boolean {
  return after.script?.eventId === 'core.respawn' && before.script?.eventId !== 'core.respawn';
}

/** Use heal/revive items from the bag on members below half HP (like a sensible player before a fight). */
export function patchUp(state: GameState, content: GameContent): GameState {
  const idx = indexOf(content);
  let s = state;
  for (let i = 0; i < s.save.party.length; i++) {
    for (let guard = 0; guard < 6; guard++) {
      const m = s.save.party[i]!;
      const def = idx.ally.get(m.id);
      if (!def) break;
      const max = maxHpOf(m, content);
      if (m.hp >= max * 0.5) break;
      const kind = m.hp <= 0 ? 'revive' : 'heal';
      const item = Object.keys(s.save.items).map((id) => idx.item.get(id)).find((it) => it && it.kind === kind && (s.save.items[it.id] ?? 0) > 0);
      if (!item) break;
      const next = reduce(s, content, { type: 'use-item', itemId: item.id, target: i });
      if (next === s) break;
      s = next;
    }
  }
  return s;
}

/** Average HP fraction of the party. */
export function partyHealth(state: GameState, content: GameContent): number {
  const p = state.save.party;
  if (p.length === 0) return 1;
  return p.reduce((a, m) => a + Math.min(1, m.hp / Math.max(1, maxHpOf(m, content))), 0) / p.length;
}

/** Walk to the first tile satisfying `goal`, autoplaying interruptions (triggers, encounters) and replanning. */
export function walkTo(state: GameState, content: GameContent, goal: (map: string, x: number, y: number) => boolean, what: string, opts: AutoOptions = {}): GameState {
  let s = state;
  let defeated = false;
  const watch: AutoOptions = {
    ...opts,
    onAction: (b, a, n) => {
      if (isDefeat(b, n)) defeated = true;
      opts.onAction?.(b, a, n);
    },
  };
  for (let replans = 0; replans < 60; replans++) {
    if (s.mode !== 'explore') s = autoplay(s, content, watch);
    if (defeated) throw new SimError(`defeated in battle on the way to ${what}: ${describe(s)}`);
    if (s.mode !== 'explore') return s;
    if (goal(s.save.mapId, s.save.x, s.save.y)) return s;
    const path = (opts.avoidEncounters ? findPath(s, content, goal, true) : null) ?? findPath(s, content, goal, false);
    if (!path) throw new SimError(`no path to ${what} from ${describe(s)}`);
    for (const dir of path) {
      const before = s;
      s = reduce(s, content, { type: 'step', dir });
      if (s.mode !== 'explore') break; // trigger / encounter / locked warp: autoplay, then replan
      if (s.save.x === before.save.x && s.save.y === before.save.y && s.save.mapId === before.save.mapId) break; // bumped: replan
    }
  }
  throw new SimError(`gave up walking to ${what}: ${describe(s)}`);
}

function dirTowards(fx: number, fy: number, tx: number, ty: number): Dir | null {
  const dx = Math.sign(tx - fx);
  const dy = Math.sign(ty - fy);
  if (dx !== 0 && dy !== 0) return null;
  if (dx === 0 && dy === 0) return null;
  return dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
}

export function talkTo(state: GameState, content: GameContent, mapId: string, npcId: string, opts: AutoOptions = {}): GameState {
  let s = state;
  for (let attempt = 0; attempt < 5; attempt++) {
    const npc = visibleTarget(s, content, mapId, npcId);
    if (!npc) throw new SimError(`npc ${npcId} is not visible on ${mapId} (showIf?): ${describe(s)}`);
    const spots = talkSpots(content, mapId, npc.x, npc.y);
    s = walkTo(s, content, (m, x, y) => m === mapId && spots.has(spot(x, y)), `npc ${npcId} on ${mapId}`, opts);
    if (s.mode !== 'explore') continue;
    const now = npcsOn(s, content, mapId).find((n) => n.id === npc.id);
    if (!now || s.save.mapId !== mapId) continue;
    const dir = dirTowards(s.save.x, s.save.y, now.x, now.y);
    if (!dir) continue;
    s = reduce(s, content, { type: 'face', dir });
    const talked = reduce(s, content, { type: 'interact' });
    if (talked === s) continue;
    return autoplay(talked, content, opts);
  }
  throw new SimError(`could not talk to ${npcId} on ${mapId}: ${describe(s)}`);
}

export function reach(state: GameState, content: GameContent, mapId: string, x: number, y: number, opts: AutoOptions = {}): GameState {
  let s = state;
  if (s.save.mapId === mapId && s.save.x === x && s.save.y === y) {
    // step off and back on so the trigger fires
    const off = DIRS.find((d) => {
      const map = mapById(content, mapId);
      return !!map && !isSolidTile(map, x + DELTA[d][0], y + DELTA[d][1]) && !warpAt(map, x + DELTA[d][0], y + DELTA[d][1]);
    });
    if (off) s = autoplay(reduce(s, content, { type: 'step', dir: off }), content, opts);
  }
  s = walkTo(s, content, (m, tx, ty) => m === mapId && tx === x && ty === y, `(${x},${y}) on ${mapId}`, opts);
  return autoplay(s, content, opts);
}

export function reciteAt(state: GameState, content: GameContent, mapId: string, shlokaId: string, opts: AutoOptions = {}): GameState {
  const map = mapById(content, mapId);
  if (!map) throw new SimError(`map ${mapId} does not exist`);
  const shrines: { x: number; y: number }[] = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (hasTile(map, x, y, 'shrine')) shrines.push({ x, y });
  if (shrines.length === 0) throw new SimError(`map ${mapId} has no shrine`);
  const spots = new Set<number>();
  for (const sh of shrines) for (const d of DIRS) spots.add(spot(sh.x + DELTA[d][0], sh.y + DELTA[d][1]));
  let s = state;
  for (let attempt = 0; attempt < 5; attempt++) {
    s = walkTo(s, content, (m, x, y) => m === mapId && spots.has(spot(x, y)), `a shrine on ${mapId}`, opts);
    if (s.mode !== 'explore' || s.save.mapId !== mapId) continue;
    const here = s.save;
    const sh = shrines.find((p) => Math.abs(p.x - here.x) + Math.abs(p.y - here.y) === 1);
    if (!sh) continue;
    s = reduce(s, content, { type: 'face', dir: dirTowards(here.x, here.y, sh.x, sh.y)! });
    const opened = reduce(s, content, { type: 'interact' });
    if (opened === s) continue;
    return autoplay(opened, content, { ...opts, recite: shlokaId });
  }
  throw new SimError(`could not reach a shrine on ${mapId}: ${describe(s)}`);
}

/** Fight wild encounters on the nearest reachable encounter tiles, then rest at the nearest shrine. */
export function grind(state: GameState, content: GameContent, battles: number, opts: AutoOptions = {}): GameState {
  let s = state;
  let fought = 0;
  const count: AutoOptions = {
    ...opts,
    onAction: (b, a, n) => {
      if (b.mode === 'battle' && n.mode !== 'battle') fought++;
      opts.onAction?.(b, a, n);
    },
  };
  const isEnc = (m: string, x: number, y: number): boolean => {
    const map = mapById(content, m);
    if (!map?.encounters || map.encounters.table.length === 0) return false;
    const t = tileAt(map, x, y);
    return !!((t.ground && TILE_PROPS[t.ground].encounter) || (t.overlay && TILE_PROPS[t.overlay].encounter));
  };
  try {
    s = walkTo(s, content, isEnc, 'an encounter tile', count);
  } catch (e) {
    if (e instanceof SimError) return s; // nowhere to grind
    throw e;
  }
  for (let steps = 0; fought < battles && steps < 600; steps++) {
    if (s.mode !== 'explore') {
      s = autoplay(s, content, count);
      continue;
    }
    const map = mapById(content, s.save.mapId);
    if (!map) break;
    const dir = DIRS.find((d) => {
      const nx = s.save.x + DELTA[d][0];
      const ny = s.save.y + DELTA[d][1];
      return isEnc(map.id, nx, ny) && !isSolidTile(map, nx, ny) && !warpAt(map, nx, ny) && !map.triggers.some((t) => triggerCovers(t, nx, ny));
    });
    if (!dir) break;
    s = reduce(s, content, { type: 'step', dir });
  }
  if (s.mode !== 'explore') s = autoplay(s, content, count);
  return restAtShrine(s, content, opts);
}

/** Walk to the nearest reachable shrine (any map) and rest there. */
export function restAtShrine(state: GameState, content: GameContent, opts: AutoOptions = {}): GameState {
  const near = (m: string, x: number, y: number): boolean => {
    const map = mapById(content, m);
    return !!map && DIRS.some((d) => hasTile(map, x + DELTA[d][0], y + DELTA[d][1], 'shrine'));
  };
  let s: GameState;
  try {
    s = walkTo(state, content, near, 'a shrine', opts);
  } catch (e) {
    if (e instanceof SimError) return state;
    throw e;
  }
  if (s.mode !== 'explore') return s;
  const map = mapById(content, s.save.mapId)!;
  const dir = DIRS.find((d) => hasTile(map, s.save.x + DELTA[d][0], s.save.y + DELTA[d][1], 'shrine'));
  if (!dir) return s;
  s = reduce(s, content, { type: 'face', dir });
  const opened = reduce(s, content, { type: 'interact' });
  return opened === s ? s : autoplay(opened, content, opts);
}

// ───────────────────────── story-bot ─────────────────────────

export function doStep(state: GameState, content: GameContent, step: WalkStep, opts: AutoOptions = {}): GameState {
  const a = step.action as Record<string, unknown>;
  if ('talk' in a) return talkTo(state, content, step.map, String(a['talk']), opts);
  if ('reach' in a) {
    const r = a['reach'] as { x: number; y: number };
    return reach(state, content, step.map, r.x, r.y, opts);
  }
  if ('recite' in a) return reciteAt(state, content, step.map, String(a['recite']), opts);
  throw new SimError(`unknown walkthrough action ${JSON.stringify(step.action)}`);
}

export interface WalkResult {
  state: GameState;
  /** Index of the failed step, or -1 when every step passed. */
  failedAt: number;
  error: string | null;
  actions: number;
  battles: number;
  defeats: number;
  /** battles lost (canLose battles too) */
  losses: number;
  /** smarana challenges answered (Kathā), how many had a gap to fill (a tap), and how many of them were misses */
  recitations: number;
  gapped: number;
  misses: number;
  /** step retries after a failed walkthrough step */
  retries: number;
}

/**
 * Start a new game and follow the walkthrough (or opts.steps); retries a failed step after grinding (default 5 tries).
 * `style: 'katha'` plays the Kathā journey (no grinding: a failed step rests at a shrine and retries); `accuracy` is the
 * reciter's chance of picking the right chunk of a smarana gap (default 1).
 */
export function runWalkthrough(content: GameContent, seed: number, level: Level, opts: { maxGrind?: number; attempts?: number; avoidEncounters?: boolean; trace?: (msg: string) => void; steps?: WalkStep[]; onStep?: (index: number, state: GameState) => void; style?: JourneyStyle; accuracy?: number; careless?: number; onAction?: AutoOptions['onAction']; reader?: Reader; policy?: AutoOptions['policy']; /** v0.6: find every hidden moment */ hidden?: boolean } = {}): WalkResult {
  let actions = 0;
  let battles = 0;
  let defeats = 0;
  let losses = 0;
  let recitations = 0;
  let gapped = 0;
  let misses = 0;
  let retries = 0;
  const auto: AutoOptions = {
    ...(opts.avoidEncounters !== undefined ? { avoidEncounters: opts.avoidEncounters } : {}),
    ...(opts.accuracy !== undefined ? { reciter: { accuracy: opts.accuracy, rng: createRng((seed ^ hashString(`reciter:${level}`)) >>> 0) } } : {}),
    ...(opts.careless ? { careless: { chance: opts.careless, rng: createRng((seed ^ hashString(`careless:${level}`)) >>> 0) } } : {}),
    ...(opts.policy ? { policy: opts.policy } : {}),
    ...(opts.hidden ? { hidden: true } : {}),
    onAction: (b, a, n) => {
      actions++;
      if (b.mode === 'battle' && n.mode !== 'battle') {
        battles++;
        if (b.battle?.phase === 'lost') losses++;
      }
      if (n.script?.eventId === 'core.respawn' && b.script?.eventId !== 'core.respawn') defeats++;
      if (a.type === 'answer' && b.pending?.kind === 'challenge' && b.pending.challenge.smarana && n !== b) {
        recitations++;
        if (b.pending.challenge.smarana.gaps.length > 0) gapped++;
        if (n.lastSmarana && !n.lastSmarana.correct) misses++;
      }
      opts.onAction?.(b, a, n);
    },
  };
  const katha = opts.style === 'katha';
  let s = newGame(seed, level, content, { name: 'Bot', avatar: 'a', ...(opts.style ? { style: opts.style } : {}), ...(opts.reader ? { reader: opts.reader } : {}) });
  const result = (failedAt: number, error: string | null): WalkResult => ({ state: s, failedAt, error, actions, battles, defeats, losses, recitations, gapped, misses, retries });
  try {
    s = autoplay(s, content, auto);
  } catch (e) {
    return result(0, `intro: ${(e as Error).message}`);
  }
  // v0.5b: only the steps of this journey (a Kathā-only step, `style: 'katha'`, is skipped in the practice game);
  // `onStep` and `failedAt` keep the step's index in opts.steps / content.walkthrough
  const all = opts.steps ?? content.walkthrough;
  const order = all.flatMap((w, i) => (stepInJourney(w, s.save) ? [i] : []));
  const trace = opts.trace;
  for (const i of order) {
    const step = all[i]!;
    let lastErr = '';
    const tries = opts.attempts ?? 5;
    for (let attempt = 0; attempt < tries && !s.save.flags[step.expectFlag]; attempt++) {
      try {
        if (s.mode === 'explore') {
          s = patchUp(s, content);
          if (partyHealth(s, content) < 0.5) s = restAtShrine(s, content, auto);
        }
        s = doStep(s, content, step, auto);
        if (s.mode === 'ended') break;
      } catch (e) {
        if (!(e instanceof SimError)) throw e;
        lastErr = e.message;
      }
      trace?.(`step ${i} ${JSON.stringify(step.action)} attempt ${attempt}: ${s.save.flags[step.expectFlag] ? 'ok' : `FAILED ${lastErr}`} · ${describe(s)} · party ${s.save.party.map((m) => `${m.id}:L${m.level}:${m.hp}hp`).join(' ')} · battles ${battles} defeats ${defeats}`);
      if (!s.save.flags[step.expectFlag] && attempt < tries - 1) {
        retries++;
        s = katha ? restAtShrine(s, content, auto) : grind(s, content, opts.maxGrind ?? 8, auto);
      }
    }
    opts.onStep?.(i, s);
    if (!s.save.flags[step.expectFlag]) {
      const label = `walkthrough[${i}] ch${step.chapter} ${JSON.stringify(step.action)} on ${step.map}`;
      return result(i, `${label}: flag "${step.expectFlag}" not set${lastErr ? ` (${lastErr})` : ''}; now ${describe(s)}`);
    }
  }
  return result(-1, null);
}

/** Flag set by a once-trigger (re-exported for tests). */
export { triggerFlag };

// ───────────────────────── pointer-following bot (v0.4.2 "Show the way") ─────────────────────────

export interface GuideRun {
  state: GameState;
  error: string | null;
  /** guide targets acted on (people, tiles, shrines, exits) */
  targets: number;
  exits: number;
  actions: number;
  battles: number;
  defeats: number;
  /** recovery rounds after no progress (grind in the practice game, rest in Kathā) */
  recoveries: number;
  /** the walkthrough step the guide pointed at last (content.walkthrough.length when every step is done) */
  step: number;
}

/**
 * A player who only follows the map pointer: from a new journey it repeatedly asks `guideTarget`, walks there and acts
 * (talk to the person, step on the tile, recite at the shrine, step through the exit), with no scripted route. When a
 * target brings no progress (a lost boss fight) it recovers like the story bot (practice: grind ~8 wild battles and rest;
 * Kathā: rest at a shrine) and tries again (`attempts` rounds per walkthrough step, default 6). Stops at the ending, when `until(state)` is true,
 * or with an error.
 */
export function runGuide(
  content: GameContent,
  seed: number,
  level: Level,
  opts: { style?: JourneyStyle; accuracy?: number; attempts?: number; until?: (s: GameState) => boolean; maxTargets?: number; trace?: (msg: string) => void; onTarget?: (s: GameState, g: GuideTarget) => void; reader?: Reader } = {},
): GuideRun {
  let actions = 0;
  let battles = 0;
  let defeats = 0;
  let targets = 0;
  let exits = 0;
  let recoveries = 0;
  let defeated = false;
  const auto: AutoOptions = {
    ...(opts.accuracy !== undefined ? { reciter: { accuracy: opts.accuracy, rng: createRng((seed ^ hashString(`reciter:${level}`)) >>> 0) } } : {}),
    onAction: (b, _a, n) => {
      actions++;
      if (b.mode === 'battle' && n.mode !== 'battle') battles++;
      if (isDefeat(b, n)) {
        defeats++;
        defeated = true;
      }
    },
  };
  const katha = opts.style === 'katha';
  let s = newGame(seed, level, content, { name: 'Bot', avatar: 'a', ...(opts.style ? { style: opts.style } : {}), ...(opts.reader ? { reader: opts.reader } : {}) });
  let step = 0;
  const done = (error: string | null): GuideRun => ({ state: s, error, targets, exits, actions, battles, defeats, recoveries, step });
  /** Walk the shortest path to a tile of the CURRENT map satisfying `goal`; returns early on any interruption. */
  const walk = (goal: (x: number, y: number) => boolean, what: string): boolean => {
    const mapId = s.save.mapId;
    if (goal(s.save.x, s.save.y)) return true;
    const path = findPath(s, content, (m, x, y) => m === mapId && goal(x, y));
    if (!path) throw new SimError(`no path to ${what} on ${mapId} from ${describe(s)}`);
    for (const dir of path) {
      const before = s;
      s = reduce(s, content, { type: 'step', dir });
      actions++;
      if (s.mode !== 'explore') {
        s = autoplay(s, content, auto);
        return false; // an event or a battle on the way: ask the pointer again
      }
      if (s.save.mapId !== mapId) return false;
      if (s.save.x === before.save.x && s.save.y === before.save.y) return false; // bumped
    }
    return goal(s.save.x, s.save.y);
  };
  const face = (x: number, y: number): boolean => {
    const dir = dirTowards(s.save.x, s.save.y, x, y);
    if (!dir) return false;
    s = reduce(s, content, { type: 'face', dir });
    return true;
  };
  const press = (recite?: string): void => {
    const opened = reduce(s, content, { type: 'interact' });
    if (opened !== s) s = autoplay(opened, content, { ...auto, ...(recite ? { recite } : {}) });
  };
  try {
    s = autoplay(s, content, auto);
  } catch (e) {
    return done(`intro: ${(e as Error).message}`);
  }
  let lastKey = '';
  let stuck = 0;
  let lastStep = -1;
  const max = opts.maxTargets ?? 4000;
  for (let n = 0; n < max; n++) {
    if (s.mode === 'ended') return done(null);
    if (opts.until?.(s)) return done(null);
    if (s.mode !== 'explore') {
      try {
        s = autoplay(s, content, auto);
      } catch (e) {
        if (!(e instanceof SimError)) throw e;
        return done(e.message);
      }
      continue;
    }
    const g = guideTarget(s, content);
    if (!g) {
      step = content.walkthrough.length;
      return done(guideStep(s.save, content) < 0 ? null : `the pointer is gone before the end: ${describe(s)}`);
    }
    step = g.step;
    opts.onTarget?.(s, g);
    if (g.map !== s.save.mapId) return done(`the pointer is on ${g.map}, the player on ${s.save.mapId}`);
    // no progress since the last target (same target, same place, same flags): recover, then try again
    const key = `${g.step}|${g.kind}|${g.x},${g.y}|${s.save.mapId}|${s.save.x},${s.save.y}|${Object.keys(s.save.flags).length}`;
    if (key === lastKey || defeated) {
      if (++stuck >= (opts.attempts ?? 6)) return done(`no progress at walkthrough[${g.step}] ${JSON.stringify(content.walkthrough[g.step]?.action)}: pointer ${g.kind} (${g.x},${g.y}) on ${g.map}; ${describe(s)}`);
      recoveries++;
      defeated = false;
      try {
        s = katha ? restAtShrine(s, content, auto) : grind(s, content, 8, auto);
      } catch (e) {
        if (!(e instanceof SimError)) throw e;
      }
      lastKey = '';
      continue;
    }
    if (g.step !== lastStep) {
      stuck = 0;
      lastStep = g.step;
      s = patchUp(s, content);
      if (partyHealth(s, content) < 0.5) s = restAtShrine(s, content, auto);
      if (s.mode !== 'explore') continue;
      const again = guideTarget(s, content);
      if (!again || again.x !== g.x || again.y !== g.y || again.map !== s.save.mapId) continue; // rested elsewhere: ask again
    }
    lastKey = key;
    targets++;
    opts.trace?.(`target ${g.kind} (${g.x},${g.y}) on ${g.map}${g.to ? ` → ${g.to}` : ''}${g.npc ? ` npc ${g.npc}` : ''} for step ${g.step} · at (${s.save.x},${s.save.y}) · party ${s.save.party.map((m) => `${m.id}:L${m.level}:${m.hp}`).join(' ')}`);
    try {
      if (g.kind === 'exit') {
        exits++;
        const map = mapById(content, s.save.mapId)!;
        const beside = new Set<number>();
        for (const d of DIRS) {
          const x = g.x - DELTA[d][0];
          const y = g.y - DELTA[d][1];
          if (!isSolidTile(map, x, y) && !warpAt(map, x, y)) beside.add(spot(x, y));
        }
        if (walk((x, y) => beside.has(spot(x, y)), `the exit (${g.x},${g.y})`)) {
          const dir = dirTowards(s.save.x, s.save.y, g.x, g.y);
          if (dir) {
            s = reduce(s, content, { type: 'step', dir });
            actions++;
            if (s.mode !== 'explore') s = autoplay(s, content, auto);
          }
        }
      } else if (g.kind === 'tile') {
        if (s.save.x === g.x && s.save.y === g.y) {
          // standing on it: step off and back on, so its trigger fires
          const map = mapById(content, s.save.mapId)!;
          const off = DIRS.find((d) => !isSolidTile(map, g.x + DELTA[d][0], g.y + DELTA[d][1]) && !warpAt(map, g.x + DELTA[d][0], g.y + DELTA[d][1]));
          if (off) {
            s = reduce(s, content, { type: 'step', dir: off });
            if (s.mode !== 'explore') s = autoplay(s, content, auto);
          }
          if (s.mode === 'explore') walk((x, y) => x === g.x && y === g.y, `the tile (${g.x},${g.y})`);
        } else walk((x, y) => x === g.x && y === g.y, `the tile (${g.x},${g.y})`);
        if (s.mode !== 'explore') s = autoplay(s, content, auto);
      } else if (g.kind === 'npc') {
        const spots = talkSpots(content, s.save.mapId, g.x, g.y);
        if (walk((x, y) => spots.has(spot(x, y)), `${g.npc ?? 'a person'} (${g.x},${g.y})`) && face(g.x, g.y)) press();
      } else {
        const spots = new Set(DIRS.map((d) => spot(g.x + DELTA[d][0], g.y + DELTA[d][1])));
        if (walk((x, y) => spots.has(spot(x, y)), `the shrine (${g.x},${g.y})`) && face(g.x, g.y)) press(g.recite);
      }
    } catch (e) {
      if (!(e instanceof SimError)) throw e;
      opts.trace?.(`  ${e.message}`);
    }
  }
  return done(`gave up after ${max} targets: ${describe(s)}`);
}
