/**
 * The verse-chain duel, śloka-antyakṣarī (v0.5b P6, OWNER: WP-C; notes/v05b-plan.md §4, notes/v05b-c.md). Pure and
 * deterministic: randomness only via rngFor(state, label) + bump (the shuffle of the chips and the distractors).
 *
 * Rule: the key is the last consonant of the other side's pāda (`splitAksharas` / `aksharaParts`: vowel signs, ं, ः and
 * ् are ignored, so नूनं व्याकरणं कृत्स्नम् ends on म); a valid answer is a pāda of a heard verse whose first consonant is
 * the key (a line that opens with a vowel opens with no consonant); no pāda is used twice in one duel (`AntyaState.used`).
 *
 * A turn: the opponent's line is on screen with its key akṣara highlighted; the player picks one of 3 chips (full heard
 * pādas, verbatim; exactly one opens with the key) — a Challenge of kind 'antya' with `options` / `answers`, so
 * `correctAnswer`, the e2e `Bot.answer` and the `opt-<id>` test ids work unchanged. The pick recites itself (one tap). A
 * miss: the right line is said all the same (it shimmers in) and the link lands at half power. The opponent then answers
 * with a line that opens with the sound the player's line ended on.
 *  - **Reset:** the player has no unused heard pāda that opens with the key → the chain resets: any line may follow
 *    (`key: null`; all three chips are valid, and the player's choice steers where the chain goes).
 *  - **Stumped:** the player's line ends on a sound no unused heard pāda opens with → the opponent is stumped, the link
 *    lands at × CHAIN_STUMPED, and the opponent begins a new chain with a fresh line.
 *  - **Steering:** the valid chip and the opponent's lines are chosen so the chain goes on where it can (one step of
 *    look-ahead); the opponent opens with a pāda of its own verse (duelVerse: Hanumān, the verse Rāma just praised).
 *  - **Wrong chips:** heard pādas that open with another sound — of another consonant group at L2–3, of the key's own
 *    group (varga; the semivowels and the sibilants as groups) at L4+, falling back to any other sound.
 *  - **Cannot be lost:** the opponent never strikes (logic-battle: its turn is its line). Its HP is `links` (content/
 *    katha-chain.json, default CHAIN_LINKS) × the lead's line at its lowest roll, so a player who never misses links
 *    exactly `links` times (fewer with a stumped bonus).
 *
 * Sanskrit accuracy: nothing here creates Sanskrit — every chip and every line is a printed pāda (`shloka.padas[p]`).
 * The practice game never reaches it (isChainDuel needs Kathā; the practice duel stays a debate).
 */
import { VARNAS, aksharaParts, spellingKey, splitAksharas } from '@sanskrit';
import type { AntyaSpec, AntyaState, BattleSpec, ChainDuel, Challenge, ChallengeOption, Deva, Fighter, GameContent, GameState, PadaRefT } from './types';
import { bump, rngFor } from './logic-util';
import { damage } from './logic-progress';
import { duelMove, duelVerse, isKatha, kathaIndex, padaKey } from './logic-katha';

/** The opponent's HP in links when katha-chain.json gives none. */
export const CHAIN_LINKS = 5;
/** A stumped opponent: the player's link lands at this power. */
export const CHAIN_STUMPED = 1.5;
/** A missed pick: the right line is said, at this power (the Kathā rule: a miss = half effect). */
export const CHAIN_MISS = 0.5;

/** The chain-duel entry for a foe (content/katha-chain.json), if it duels in verse chains. */
export function chainDuel(content: GameContent, foeId: string): ChainDuel | undefined {
  return content.chain?.duels.find((d) => d.foe === foeId);
}

/** A Kathā duel against a chain opponent (the practice game keeps its debate). */
export function isChainDuel(state: GameState, content: GameContent, spec: Pick<BattleSpec, 'kind' | 'enemies'>): boolean {
  return isKatha(state) && spec.kind === 'duel' && spec.enemies.some((e) => !!chainDuel(content, e.id));
}

// ───────────────────────── the sounds of a line ─────────────────────────

function parts(ak: string): ReturnType<typeof aksharaParts> | null {
  try {
    return aksharaParts(ak);
  } catch {
    return null;
  }
}

function aksharasOf(line: string): string[] {
  try {
    return splitAksharas(line);
  } catch {
    return [];
  }
}

/**
 * The key of a pāda and where it sits: its last consonant (a final halanta consonant, else the last consonant of the
 * akṣara's onset; ं ः and vowel signs ignored) and the index of the akṣara that holds it. null when it has none.
 */
export function chainKeyAt(line: Deva): { key: Deva; at: number } | null {
  const ak = aksharasOf(line);
  for (let i = ak.length - 1; i >= 0; i--) {
    const p = parts(ak[i] as string);
    const c = p ? (p.finals[p.finals.length - 1] ?? p.consonants[p.consonants.length - 1]) : undefined;
    if (c) return { key: c, at: i };
  }
  return null;
}

/** The key of a pāda: its last consonant (Devanagari), or null when it has none. */
export function chainKey(line: Deva): Deva | null {
  return chainKeyAt(line)?.key ?? null;
}

/** The first consonant a pāda opens with (null: it opens with a vowel). */
export function chainHead(line: Deva): Deva | null {
  const first = aksharasOf(line)[0];
  const p = first ? parts(first) : null;
  return p?.consonants[0] ?? null;
}

const GROUP = new Map<string, string>(VARNAS.filter((v) => v.kind === 'vyanjana').map((v) => [v.deva, v.varga ?? v.cls ?? v.deva]));

/** The consonant's group: its varga (ka ca ṭa ta pa), else the semivowels / the sibilants and h. */
export function soundGroup(c: Deva | null): string | null {
  return c === null ? null : (GROUP.get(c) ?? c);
}

// ───────────────────────── the heard lines ─────────────────────────

/** One pāda as a link of the chain. */
export interface ChainLine {
  ref: PadaRefT;
  /** `${shlokaId}:${pada}` */
  id: string;
  /** the printed pāda (chunks joined by one space) */
  text: Deva;
  /** spellingKey of the text (two pādas that read the same are one chip) */
  same: string;
  head: Deva | null;
  tail: Deva | null;
}

const lineCache = new WeakMap<GameContent, ChainLine[]>();

/** Every pāda of the content as a chain line, in story order. */
export function chainLines(content: GameContent): ChainLine[] {
  const hit = lineCache.get(content);
  if (hit) return hit;
  const out = kathaIndex(content).all.map((p) => {
    const text = p.chunks.join(' ');
    return { ref: { shlokaId: p.shlokaId, pada: p.pada }, id: padaKey(p.shlokaId, p.pada), text, same: spellingKey(text), head: chainHead(text), tail: chainKey(text) };
  });
  lineCache.set(content, out);
  return out;
}

/** The pādas of the verses the player has heard (story order; a pāda that reads like an earlier one is left out): the only lines either side may say. */
export function heardLines(state: Pick<GameState, 'save'>, content: GameContent): ChainLine[] {
  const seen = new Set<string>();
  return chainLines(content).filter((l) => {
    if (!state.save.shlokas[l.ref.shlokaId]?.heard || seen.has(l.same)) return false;
    seen.add(l.same);
    return true;
  });
}

const byRef = (lines: ChainLine[], ref: PadaRefT | undefined): ChainLine | undefined => (ref ? lines.find((l) => l.id === padaKey(ref.shlokaId, ref.pada)) : undefined);

/** Look-ahead: chains longer than this many lines count as "long enough" (a duel says ≤ 2 × links + 1 lines). */
export const CHAIN_LOOK = 16;
/** Look-ahead budget (search nodes per question), so a bigger verse book stays fast. */
const CHAIN_BUDGET = 3000;

/**
 * How far the chain can go from `start` (counted in lines, `start` included) with the unused lines: the longest chain
 * of unused heard pādas, each opening with the sound the one before it ended on (depth-first, capped at `cap`).
 */
export function chainReach(lines: ChainLine[], used: ReadonlySet<string>, start: ChainLine, cap = CHAIN_LOOK): number {
  const byHead = new Map<string, ChainLine[]>();
  for (const l of lines) if (l.head !== null) byHead.set(l.head, [...(byHead.get(l.head) ?? []), l]);
  const taken = new Set(used);
  let best = 0;
  let nodes = 0;
  const go = (l: ChainLine, depth: number): void => {
    nodes++;
    if (depth > best) best = depth;
    if (best >= cap || nodes > CHAIN_BUDGET || l.tail === null) return;
    for (const n of byHead.get(l.tail) ?? []) {
      if (taken.has(n.id)) continue;
      taken.add(n.id);
      go(n, depth + 1);
      taken.delete(n.id);
      if (best >= cap || nodes > CHAIN_BUDGET) return;
    }
  };
  taken.add(start.id);
  go(start, 1);
  return best;
}

/**
 * The candidate that lets the chain go on longest (chainReach); ties: `prefer`, then story order rotating with `n` (the
 * number of lines said, so the picks vary along a duel). Deterministic.
 */
function longest(lines: ChainLine[], used: ReadonlySet<string>, cands: ChainLine[], n: number, prefer?: (l: ChainLine) => boolean): ChainLine | null {
  if (cands.length === 0) return null;
  const score = cands.map((l) => chainReach(lines, used, l));
  const top = Math.max(...score);
  const best = cands.filter((_l, i) => score[i] === top);
  const pref = prefer ? best.filter(prefer) : [];
  return (pref[0] ?? best[n % best.length]) as ChainLine;
}

/**
 * The line the player's turn says for `key`: an unused heard pāda that opens with it — the one after which the chain
 * can go on longest. null when none opens with the key (the chain resets). Deterministic: the chips and chainTurn
 * agree on it without storing it.
 */
export function answerLine(lines: ChainLine[], antya: Pick<AntyaState, 'key' | 'used'>): ChainLine | null {
  if (antya.key === null) return null;
  const used = new Set(antya.used);
  return longest(lines, used, lines.filter((l) => l.head === antya.key && !used.has(l.id)), antya.used.length);
}

/** The opponent's answer to a line ending on `sound`: an unused pāda that opens with it, the one that goes on longest. */
function replyLine(lines: ChainLine[], used: ReadonlySet<string>, sound: Deva | null, n: number): ChainLine | null {
  if (sound === null) return null;
  return longest(lines, used, lines.filter((l) => l.head === sound && !used.has(l.id)), n);
}

/**
 * The opponent's fresh line (the opening, or a new chain after it was stumped): the unused pāda the longest chain
 * starts from — a pāda of the opponent's own verse (duelVerse) on a tie. null when every heard pāda is used.
 */
function freshLine(lines: ChainLine[], used: ReadonlySet<string>, own: string | null, n: number): ChainLine | null {
  return longest(lines, used, lines.filter((l) => !used.has(l.id)), n, (l) => l.ref.shlokaId === own);
}

// ───────────────────────── the duel ─────────────────────────

/**
 * The chain-duel opponent: HP = links × the lead's line at its lowest roll (variance 0.85, full power) — the best
 * damaging move's power (duelMove), as every Kathā duel line — so a player who never misses wins in exactly `links`
 * turns, fewer with a stumped bonus. Every other stat is unchanged (the opponent never strikes).
 */
export function chainFoe(foe: Fighter, ally: Fighter, content: GameContent, duel: ChainDuel | undefined): Fighter {
  const mv = duelMove(ally, foe, content);
  if (!mv || mv.power <= 0) return foe;
  const hit = damage(ally, foe, mv, 1, 0.85).amount;
  const hp = Math.max(1, (duel?.links ?? CHAIN_LINKS) * hit);
  return { ...foe, hp, maxHp: hp };
}

/**
 * The opening of a chain duel: the opponent's first line (a pāda of its own verse when heard and answerable) and the
 * chain state after it. null when no verse has been heard (the ordinary Kathā duel then).
 */
export function chainOpen(state: GameState, content: GameContent, foeId: string): { antya: AntyaState; line: PadaRefT } | null {
  const lines = heardLines(state, content);
  const first = freshLine(lines, new Set(), duelVerse(state, content, foeId), 0);
  if (!first) return null;
  return { antya: { key: first.tail, used: [first.id], prev: first.ref }, line: first.ref };
}

/** The chain state ready for the player's pick: the key reset to "any line" when no unused pāda opens with it, and the used lines released when every heard pāda has been said. */
export function chainReady(state: GameState, content: GameContent, antya: AntyaState): AntyaState {
  const lines = heardLines(state, content);
  let a = antya;
  const free = (x: AntyaState): number => new Set(lines.filter((l) => !x.used.includes(l.id)).map((l) => l.same)).size;
  // every heard pāda said: the chain starts its round again (only the line on screen stays used)
  if (free(a) === 0) a = { ...a, used: a.prev ? [padaKey(a.prev.shlokaId, a.prev.pada)] : [] };
  if (a.key !== null && !answerLine(lines, a)) a = { ...a, key: null };
  return a;
}

/**
 * The player's pick for this turn: an 'antya' challenge with 3 full heard pādas, exactly one opening with `antya.key`
 * and none used in this duel (wrong options: other sounds at L2–3, the same varga at L4); bumps tick. null when the
 * player has no valid pāda left (the caller resets the chain to "any line": chainReady). With `key: null` every chip
 * is valid (up to 3 unused lines, preferably ones the opponent can answer).
 */
export function chainOptions(state: GameState, content: GameContent, antya: AntyaState): { state: GameState; challenge: Challenge } | null {
  const lines = heardLines(state, content);
  if (lines.length === 0) return null;
  const used = new Set(antya.used);
  const rng = rngFor(state, `chain:${antya.used.length}`);
  const prev = byRef(lines, antya.prev);
  let picks: ChainLine[];
  let right: ChainLine[];
  if (antya.key === null) {
    // any line may follow: three unused lines, the ones the chain goes on longest from first
    const free = rng.shuffle(lines.filter((l) => !used.has(l.id)));
    const reach = new Map(free.map((l) => [l.id, chainReach(lines, used, l)]));
    picks = free.sort((a, b) => (reach.get(b.id) ?? 0) - (reach.get(a.id) ?? 0)).slice(0, 3);
    if (picks.length === 0) return null;
    right = picks;
  } else {
    const ans = answerLine(lines, antya);
    if (!ans) return null;
    const key = antya.key;
    const g = soundGroup(key);
    const level = state.level;
    // wrong chips open with another sound: another group at L2–3, the key's own group at L4+ (then any other sound)
    const others = lines.filter((l) => l.head !== key && l.same !== ans.same && l.id !== prev?.id);
    const near = (l: ChainLine): boolean => l.head !== null && soundGroup(l.head) === g;
    const tier = (l: ChainLine): number => (level >= 4 ? (near(l) ? 0 : 1) : near(l) ? 1 : 0) * 2 + (used.has(l.id) ? 1 : 0);
    const ranked = rng.shuffle(others).sort((a, b) => tier(a) - tier(b));
    const wrong: ChainLine[] = [];
    for (const l of ranked) if (wrong.length < 2 && !wrong.some((w) => w.same === l.same)) wrong.push(l);
    picks = [ans, ...wrong];
    right = [ans];
  }
  const shown = rng.shuffle(picks);
  const options: ChallengeOption[] = shown.map((l, i) => ({ id: `o${i}`, sa: l.text }));
  const answers = shown.flatMap((l, i) => (right.includes(l) ? [`o${i}`] : []));
  const spec: AntyaSpec = { key: antya.key, ...(antya.prev ? { prev: antya.prev } : {}), lines: shown.map((l) => l.ref) };
  const one = right.length === 1 ? right[0] : undefined;
  const challenge: Challenge = {
    id: `c-${state.tick}`,
    kind: 'antya',
    prompt: antya.key === null ? 'Say any line.' : 'Which line begins with the last sound?',
    ...(prev ? { stimulus: prev.text } : {}),
    ...(one ? { shlokaId: one.ref.shlokaId, padaIndex: one.ref.pada } : {}),
    options,
    answers,
    lexIds: [],
    explanation: '',
    timeLimitMs: 0,
    antya: spec,
  };
  return { state: bump(state), challenge };
}

/**
 * One link: the player's line (`pick`, right or wrong — a miss says the right line all the same, at half power) and the
 * opponent's answer from the sound it ended on. Returns the next chain state, the opponent's reply (null when stumped:
 * × CHAIN_STUMPED, and the next state holds the opponent's fresh line in `prev` with `stumped: true`), whether the pick
 * was valid and the line said.
 */
export function chainTurn(state: GameState, content: GameContent, antya: AntyaState, pick: PadaRefT): { antya: AntyaState; reply: PadaRefT | null; valid: boolean; spoken: PadaRefT } {
  const lines = heardLines(state, content);
  const picked = byRef(lines, pick);
  const valid = !!picked && (antya.key === null || picked.head === antya.key);
  const said = (valid ? picked : answerLine(lines, antya)) ?? picked;
  if (!said) throw new Error(`chainTurn: ${pick.shlokaId}:${pick.pada} is not a heard pāda`);
  const used = [...antya.used, said.id];
  const reply = replyLine(lines, new Set(used), said.tail, used.length);
  if (reply) return { antya: { key: reply.tail, used: [...used, reply.id], prev: reply.ref }, reply: reply.ref, valid, spoken: said.ref };
  // stumped: the opponent begins a new chain with a fresh line (every heard pāda said: the round starts again)
  let base = used;
  let fresh = freshLine(lines, new Set(base), null, used.length);
  if (!fresh) {
    base = [said.id];
    fresh = freshLine(lines, new Set(base), null, used.length);
  }
  const next: AntyaState = fresh ? { key: fresh.tail, used: [...base, fresh.id], prev: fresh.ref, stumped: true } : { key: null, used: base, stumped: true };
  return { antya: next, reply: null, valid, spoken: said.ref };
}
