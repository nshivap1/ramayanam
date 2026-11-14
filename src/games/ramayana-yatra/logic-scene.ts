/**
 * Story set pieces in Kathā (v0.5b, OWNER: WP-A; notes/v05b-plan.md §1 P1–P2). Pure and deterministic.
 *
 *   P1 `{ "smarana": shlokaId, "pada": n | "least" }` — the player says one pāda as the story's action (Hanumān sings
 *      Rāma's story in the Aśoka grove, the vow at Vibhīṣaṇa's council, the twins' finale). A smarana challenge built
 *      with `buildSmarana` (mode 'recital', `story: true`) and pended with context 'scene'; the answer is graded and
 *      recorded like a shrine pāda (`recordSmarana`, `state.lastSmarana` with context 'scene'), there is no feedback
 *      pending, and the script carries on — a miss is shown by the recitation panel (the right word shimmers in) and
 *      changes nothing in the story. "least" = the verse's least-practised pāda; a mastered pāda recites itself.
 *   P2 `{ "book": n }` — a read-only review of one book: pending `{ kind: 'book', kanda }` (the view shows the
 *      book-complete screen in review mode, `bookStats`); ▶ (`advance`) continues.
 *
 * Both run in a Kathā journey only: world.test refuses them outside a `{ "if": "style.katha", "then": [...] }` block,
 * and here a practice save skips them (same state), so the practice game never sees them. Unknown verse / pāda /
 * book → skipped, like `{shloka}` with an unknown id.
 *
 * Hooks (WP0): logic-events `exec` calls startSceneRecital / startBookReview; `resumeScript` calls sceneAnswer
 * ('challenge' pending with context 'scene') and continues the script on `advance` from a 'book' pending.
 */
import { splitAksharas } from '@sanskrit';
import type { GameContent, GameState, KandaId, SaveData, SmaranaSpec } from './types';
import { buildSmarana, isKatha, kathaIndex, padaKey, smrtiOf, gradeSmarana, recordSmarana } from './logic-katha';
import { recordResult } from './logic-learning';

/** `{smarana, pada: "least"}`: the verse's least-practised pāda. */
export const LEAST = 'least';

/**
 * The least-practised pāda of a verse: the lowest smṛti level, then streak, then casts since mastery; a tie goes to the
 * earlier pāda. null for an unknown verse.
 */
export function leastPada(state: GameState, content: GameContent, shlokaId: string): number | null {
  const list = kathaIndex(content).byShloka.get(shlokaId) ?? [];
  const less = (a: number[], b: number[]): boolean => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return (a[i] as number) < (b[i] as number);
    return false;
  };
  let best: number | null = null;
  let bestKey: number[] = [];
  for (const p of list) {
    const e = smrtiOf(state.save, padaKey(shlokaId, p.pada));
    const key = [e.level, e.streak, e.casts ?? 0];
    if (best === null || less(key, bestKey)) {
      best = p.pada;
      bestKey = key;
    }
  }
  return best;
}

/** The pāda a `{smarana}` command recites: `pada` itself when the verse has it, the least-practised for "least"; else null. */
export function scenePada(state: GameState, content: GameContent, shlokaId: string, pada: number | 'least'): number | null {
  if (pada === LEAST) return leastPada(state, content, shlokaId);
  if (typeof pada !== 'number' || !Number.isInteger(pada)) return null;
  return (kathaIndex(content).byShloka.get(shlokaId) ?? []).some((p) => p.pada === pada) ? pada : null;
}

/** P1 exec hook: pend the story recitation (context 'scene'). Same state outside Kathā or for an unknown verse / pāda. */
export function startSceneRecital(state: GameState, content: GameContent, cmd: { smarana: string; pada: number | 'least' }): GameState {
  if (!isKatha(state)) return state;
  const pada = scenePada(state, content, cmd.smarana, cmd.pada);
  if (pada === null) return state;
  const r = buildSmarana(state, content, { shlokaId: cmd.smarana, pada, mode: 'recital', story: true });
  return { ...r.state, pending: { kind: 'challenge', challenge: r.challenge, context: 'scene' } };
}

/**
 * P1 resume hook: the answer to a story recitation (`answer { picks }`, `picks: []` for a line with no gap, or
 * `auto: true`). Graded and recorded like a shrine pāda (a mastered pāda's self-recital and an automatic one leave
 * mastery untouched); `lastSmarana` (context 'scene') lets the view finish the line; pending → null (the caller runs
 * the script on). The same object for anything else (wrong pending, an answer that does not fit).
 */
export function sceneAnswer(state: GameState, content: GameContent, action: { type: string; [k: string]: unknown }): GameState {
  void content;
  const p = state.pending;
  if (action.type !== 'answer' || p?.kind !== 'challenge' || p.context !== 'scene') return state;
  const ch = p.challenge;
  const spec = ch.smarana;
  const t = action['timeMs'];
  if (!spec || (t !== undefined && (typeof t !== 'number' || !Number.isFinite(t) || t < 0))) return state;
  const g = gradeSmarana(ch, { picks: action['picks'], auto: action['auto'] });
  if (!g) return state;
  const asked = spec.gaps.length > 0 && !g.auto;
  let s = asked ? recordSmarana(state, spec, g.correct, false) : state;
  if (asked) s = recordResult(s, ch, { correct: g.correct, swift: false, timeMs: typeof t === 'number' ? t : 0 });
  return {
    ...s,
    pending: null,
    lastSmarana: { challenge: ch, picks: g.picks, correct: g.correct, auto: g.auto, context: 'scene' },
    fx: [...s.fx, ...(asked ? [{ kind: 'sfx' as const, name: g.correct ? ('correct' as const) : ('wrong' as const) }] : [])],
  };
}

/** P2 exec hook: pend the review of book `kanda` (1–6). Same state outside Kathā or for a book the content lacks. */
export function startBookReview(state: GameState, content: GameContent, kanda: unknown): GameState {
  if (!isKatha(state) || typeof kanda !== 'number' || ![1, 2, 3, 4, 5, 6].includes(kanda) || !content.chapters.some((c) => c.kanda === kanda)) return state;
  return { ...state, pending: { kind: 'book', kanda: kanda as KandaId } };
}

// ───────────────────────── the story recitation panel (view-scene) ─────────────────────────

/**
 * The metre of a story recitation's pāda, shown beside the line (Vālmīki's "four quarters, eight syllables in each",
 * Bāla 1.2): its syllables (akṣaras of the printed pāda) and their laghu / guru weights ('L' / 'G', from the content's
 * chandas scan) when the scan lines up with the akṣaras, else ''.
 */
export function sceneMeter(spec: Pick<SmaranaSpec, 'chunks' | 'weights'>): { syllables: number; weights: string } {
  const syllables = spec.chunks.reduce((n, c) => n + splitAksharas(c.text).length, 0);
  const w = (spec.weights ?? []).join('');
  return { syllables, weights: w.length === syllables ? w : '' };
}

/**
 * The player's first recitation: no pāda has been learnt yet (every smṛti entry at level 0 with no streak). The story
 * recitation panel then shows the coach line (how to fill the gap), as the tutorial duel does — in Kathā the Krauñca
 * scene's line is the first one a player says.
 */
export function firstRecitation(save: Pick<SaveData, 'smrti'>): boolean {
  return Object.values(save.smrti ?? {}).every((e) => (e.level ?? 0) <= 0 && (e.streak ?? 0) <= 0);
}

