/**
 * v0.6 WP0: told cutscenes and verse echoes (plan §1; notes/v06-wp0.md). OWNER: WP0 / orchestrator. Pure.
 *
 * A told cutscene is a script of steps (content/cutscene-<id>.json, types.ts ToldCutscene / ToldStep), generalised from
 * the Āditya-hṛdayam engine (logic-cutscene.ts, which is unchanged): narration, a verse with its pādas lit, the
 * painter's / 3D scene's shots, the cast on a 2D stage, the effects kit, waits, a hidden hotspot and a one-tap question.
 *
 *   { "cutscene": "mithila" }        (event command, Kathā only) → pending { kind: 'cutscene', id } (`startTold`); the
 *                                    view (view-told.tsx) plays it and dispatches { type: 'cutscene-done', id, found,
 *                                    answers } (`toldDone`): the seen flag, the flags of the hotspots found and of the
 *                                    options picked, every verse on the path played is heard; the script goes on.
 *                                    `advance` also ends it (nothing found, the first option of each question).
 *                                    A stub / unknown cutscene, or the practice journey: skipped (same state).
 *   toldPath(c, answers)             the steps in play order: each `ask` followed by the chosen option's `then`
 *                                    (a hotspot's `then` is spliced in by the view where it is found)
 *   toldTimeline(content, steps)     beats with durations (a verse = one beat per pāda at the recitation pace)
 *   toldStageAt(…)                   the stage (cast, props, fallen, scale, tint) after n steps — for tests and the
 *                                    view's still (reduced motion)
 *   toldSeen(content, flags)         the cutscenes seen (replay from the verse book, in book order)
 *   { "echo": "counsellors" }        (event command, Kathā only) → flag echo.<id> + a toast with the echo's title
 *                                    (content/katha-echoes.json); the verse book shows the title under its verses
 */
import { splitAksharas } from '@sanskrit';
import type { Dir, Fx, GameContent, GameState, StageState, ToldCutscene, ToldStep, VerseEcho } from './types';
import { type KitCmd, type StageWorld, applyKit, isKitCmd, kitFx } from './logic-stage';
import { markHeard } from './logic-learning';
import { isKatha } from './logic-katha';
import { uiToast } from './sa-ui';

/** Recitation pace of a verse step (akṣaras per second; the Āditya engine's RECITE_RATE). */
export const TOLD_RATE = 3;
/** Reading time of a narration line: base + per akṣara of its Sanskrit (or per character of its English). */
export const TOLD_SAY = { base: 2200, perAkshara: 160, perChar: 45 } as const;
/** Pauses after a pāda of a verse step (ms): inside a half-verse, at the half-verse, after the verse. */
export const TOLD_PADA_GAP = { pada: 250, half: 500, verse: 900 } as const;
const PADA_MIN = 1500;
/** Default window of a hotspot (ms of scene time from its step). */
export const TOLD_HOTSPOT_MS = 6000;

// ───────────────────────── lookup ─────────────────────────

/** A playable told cutscene with this id (not a stub, at least one step), else null. */
export function toldOf(content: GameContent, id: unknown): ToldCutscene | null {
  if (typeof id !== 'string') return null;
  const c = content.cutscenes?.find((x) => x.id === id);
  return c && !c.stub && Array.isArray(c.steps) && c.steps.length > 0 ? c : null;
}

/** The save flag a told cutscene sets once played. */
export function toldFlag(c: Pick<ToldCutscene, 'id' | 'flag'>): string {
  return c.flag && c.flag.trim() ? c.flag : `seen.${c.id}`;
}

/** The flag a hotspot of a cutscene sets when found. */
export function toldHotspotFlag(c: Pick<ToldCutscene, 'id'>, step: { hotspot: string; flag?: string }): string {
  return step.flag && step.flag.trim() ? step.flag : `found.${c.id}.${step.hotspot}`;
}

/** The cutscenes this save has seen, in book order (the verse book's replay entries). */
export function toldSeen(content: GameContent, flags: Record<string, true>): ToldCutscene[] {
  return (content.cutscenes ?? []).filter((c) => toldOf(content, c.id) && flags[toldFlag(c)]).sort((a, b) => a.chapter - b.chapter);
}

// ───────────────────────── steps ─────────────────────────

type Ask = Extract<ToldStep, { ask: string }>;
type Hotspot = Extract<ToldStep, { hotspot: string }>;

export const isAsk = (s: ToldStep): s is Ask => 'ask' in s;
export const isHotspot = (s: ToldStep): s is Hotspot => 'hotspot' in s;

/** The steps in play order for these answers (answers[k] = the option picked at the k-th question; default 0). */
export function toldPath(c: Pick<ToldCutscene, 'steps'>, answers: readonly number[] = []): ToldStep[] {
  const out: ToldStep[] = [];
  let k = 0;
  for (const s of c.steps) {
    out.push(s);
    if (isAsk(s)) {
      const i = clampOption(s, answers[k++]);
      out.push(...(s.options[i]?.then ?? []));
    }
  }
  return out;
}

function clampOption(s: Ask, i: unknown): number {
  return typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < s.options.length ? i : 0;
}

/** Every hotspot step of a cutscene (top level and inside options), by id. */
export function toldHotspots(c: Pick<ToldCutscene, 'steps'>): Hotspot[] {
  const out: Hotspot[] = [];
  const walk = (steps: readonly ToldStep[] | undefined): void => {
    for (const s of steps ?? []) {
      if (isHotspot(s)) {
        out.push(s);
        walk(s.then);
      }
      if (isAsk(s)) for (const o of s.options) walk(o.then);
    }
  };
  walk(c.steps);
  return out;
}

/** The questions of a cutscene in play order (top level only: a question never sits in an option or a hotspot). */
export function toldAsks(c: Pick<ToldCutscene, 'steps'>): Ask[] {
  return c.steps.filter(isAsk);
}

/** Verse ids of these steps (and of the hotspots' `then` when `found` has them), in order, once each. */
export function toldVerses(steps: readonly ToldStep[], found: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = [];
  const walk = (xs: readonly ToldStep[]): void => {
    for (const s of xs) {
      if ('verse' in s && typeof s.verse === 'string' && !out.includes(s.verse)) out.push(s.verse);
      if (isHotspot(s) && found.has(s.hotspot)) walk(s.then);
    }
  };
  walk(steps);
  return out;
}

// ───────────────────────── logic: start / done ─────────────────────────

/** `{ "cutscene": id }` → its pending (Kathā, a playable cutscene); otherwise the same state (the script goes on). */
export function startTold(state: GameState, content: GameContent, id: unknown): GameState {
  if (!isKatha(state)) return state;
  const c = toldOf(content, id);
  if (!c) return state;
  return { ...state, pending: { kind: 'cutscene', id: c.id } };
}

/**
 * The end of a told cutscene: `cutscene-done` with its id (or `advance`) while it is pending → flags (seen, hotspots
 * found, options picked), the verses on the path heard, pending cleared. The caller resumes the script. Anything else
 * (another id, a found id that is not one of its hotspots) → the same state.
 */
export function toldDone(state: GameState, content: GameContent, action: { type: string; [k: string]: unknown }): GameState {
  const p = state.pending;
  if (p?.kind !== 'cutscene') return state;
  if (action.type === 'cutscene-done' && action['id'] !== p.id) return state;
  if (action.type !== 'cutscene-done' && action.type !== 'advance') return state;
  const c = toldOf(content, p.id);
  if (!c) return { ...state, pending: null };
  const spots = toldHotspots(c);
  const rawFound = action.type === 'cutscene-done' && Array.isArray(action['found']) ? (action['found'] as unknown[]) : [];
  if (!rawFound.every((f) => typeof f === 'string' && spots.some((h) => h.hotspot === f))) return state;
  const found = new Set(rawFound as string[]);
  const rawAnswers = action.type === 'cutscene-done' && Array.isArray(action['answers']) ? (action['answers'] as unknown[]) : [];
  const asks = toldAsks(c);
  if (rawAnswers.length > asks.length || !rawAnswers.every((a, k) => typeof a === 'number' && Number.isInteger(a) && a >= 0 && a < (asks[k]?.options.length ?? 0))) return state;
  const answers = rawAnswers as number[];
  const flags: Record<string, true> = { ...state.save.flags, [toldFlag(c)]: true };
  for (const h of spots) if (found.has(h.hotspot)) flags[toldHotspotFlag(c, h)] = true;
  asks.forEach((a, k) => {
    const o = a.options[clampOption(a, answers[k])];
    if (o?.set) flags[o.set] = true;
  });
  let s: GameState = { ...state, pending: null, save: { ...state.save, flags } };
  const known = new Set(content.shlokas.map((x) => x.id));
  for (const id of toldVerses(toldPath(c, answers), found)) {
    if (!known.has(id)) continue;
    s = markHeard(s, content, id);
    s = { ...s, save: { ...s.save, flags: { ...s.save.flags, [`heard.${id}`]: true } } };
    if (!s.session.shlokasHeard.includes(id)) s = { ...s, session: { ...s.session, shlokasHeard: [...s.session.shlokasHeard, id] } };
  }
  return s;
}

// ───────────────────────── timeline (the view's clock) ─────────────────────────

export type ToldBeat =
  | { kind: 'say'; step: number; ms: number }
  | { kind: 'pada'; step: number; ms: number; verse: string; pada: number; aksharas: number }
  | { kind: 'ask'; step: number; ms: 0 }
  | { kind: 'cue'; step: number; ms: number };

/** Akṣaras of a Sanskrit line (spaces and punctuation are not akṣaras). */
export function toldAksharas(sa: string): number {
  return splitAksharas(sa.replace(/[।॥?!,.]/g, ' ')).filter((a) => a.trim() !== '').length;
}

/**
 * The beats of these steps in order: a narration line for its reading time, a verse one beat per lit pāda at `rate`
 * akṣaras / s (≥ 1.5 s, with the pause after it), a question as a 0-ms beat the clock stops on, `wait` / `scene`
 * (with ms) for their ms, every other step a 0-ms cue (kit effects and cast moves run alongside the next beats).
 */
export function toldTimeline(content: GameContent, steps: readonly ToldStep[], opts: { rate?: number } = {}): ToldBeat[] {
  const rate = opts.rate && opts.rate > 0 ? opts.rate : TOLD_RATE;
  const byId = new Map(content.shlokas.map((s) => [s.id, s]));
  const out: ToldBeat[] = [];
  steps.forEach((s, i) => {
    const own = typeof (s as { ms?: unknown }).ms === 'number' && Number.isFinite((s as { ms: number }).ms) && (s as { ms: number }).ms >= 0 ? (s as { ms: number }).ms : null;
    if ('say' in s) {
      const sa = content.dialogueSa?.[s.say];
      const ms = own ?? (sa ? TOLD_SAY.base + TOLD_SAY.perAkshara * toldAksharas(sa) : TOLD_SAY.base + TOLD_SAY.perChar * s.say.length);
      out.push({ kind: 'say', step: i, ms });
    } else if ('verse' in s) {
      const sh = byId.get(s.verse);
      const padas = (s.padas ?? [0, 1, 2, 3]).filter((p) => Number.isInteger(p) && p >= 0 && p < (sh?.padas.length ?? 0));
      padas.forEach((p, j) => {
        const aksharas = toldAksharas(sh?.padas[p] ?? '');
        const gap = j === padas.length - 1 ? TOLD_PADA_GAP.verse : p === 1 ? TOLD_PADA_GAP.half : TOLD_PADA_GAP.pada;
        out.push({ kind: 'pada', step: i, verse: s.verse, pada: p, aksharas, ms: Math.max(PADA_MIN, Math.round((aksharas / rate) * 1000)) + gap });
      });
      if (!padas.length) out.push({ kind: 'cue', step: i, ms: 0 });
    } else if (isAsk(s)) out.push({ kind: 'ask', step: i, ms: 0 });
    else if ('wait' in s) out.push({ kind: 'cue', step: i, ms: Math.max(0, Number.isFinite(s.wait) ? s.wait : 0) });
    else if ('scene' in s) out.push({ kind: 'cue', step: i, ms: own ?? 0 });
    else out.push({ kind: 'cue', step: i, ms: 0 });
  });
  return out;
}

/** Total ms of beats (questions count 0: the clock waits on them). */
export function toldMs(beats: readonly ToldBeat[]): number {
  return beats.reduce((a, b) => a + b.ms, 0);
}

/** Where the clock stands after `ms`: the beat index (beats.length = finished) and its fraction. Stops at a question. */
export function toldBeatAt(beats: readonly ToldBeat[], ms: number): { index: number; frac: number; start: number } {
  let t = Math.max(0, ms);
  let start = 0;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i] as ToldBeat;
    if (b.kind === 'ask') return { index: i, frac: 0, start };
    if (t < b.ms) return { index: i, frac: b.ms > 0 ? t / b.ms : 1, start };
    t -= b.ms;
    start += b.ms;
  }
  return { index: beats.length, frac: 1, start };
}

// ───────────────────────── the cutscene stage (cast + kit) ─────────────────────────

export interface CastFigure {
  sprite: string;
  x: number;
  y: number;
  facing: Dir;
}
export interface ToldStage extends StageState {
  cast: Record<string, CastFigure>;
  /** the painter's / 3D scene's current shot */
  scene: string;
}
export const EMPTY_TOLD_STAGE: ToldStage = { down: [], scale: {}, props: {}, cast: {}, scene: '' };

/** The kit's view of a cutscene stage: the cast are the figures. */
export function castWorld(stage: ToldStage): StageWorld {
  return {
    actors: () => Object.keys(stage.cast),
    at: (id) => {
      const f = stage.cast[id];
      return f ? { x: f.x, y: f.y } : null;
    },
  };
}

const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

/** The stage after one step (pure; the same object when the step changes nothing on the stage). */
export function applyToldStep(stage: ToldStage, s: ToldStep): ToldStage {
  if ('scene' in s) return typeof s.scene === 'string' && s.scene !== stage.scene ? { ...stage, scene: s.scene } : stage;
  if ('cast' in s) {
    const id = s.cast;
    if (typeof id !== 'string' || !id) return stage;
    const prev = stage.cast[id];
    if (s.remove) {
      if (!prev) return stage;
      const cast = { ...stage.cast };
      delete cast[id];
      return { ...stage, cast, down: stage.down.filter((d) => d !== id) };
    }
    let f: CastFigure | null = prev ? { ...prev } : null;
    if (s.at) f = { sprite: s.sprite ?? prev?.sprite ?? id, x: s.at.x, y: s.at.y, facing: s.face && DIRS.includes(s.face) ? s.face : (prev?.facing ?? 'down') };
    if (!f) return stage;
    if (s.sprite) f.sprite = s.sprite;
    if (s.to) {
      f.facing = Math.abs(s.to.x - f.x) >= Math.abs(s.to.y - f.y) ? (s.to.x < f.x ? 'left' : 'right') : s.to.y < f.y ? 'up' : 'down';
      f.x = s.to.x;
      f.y = s.to.y;
    }
    if (s.face && DIRS.includes(s.face)) f.facing = s.face;
    return { ...stage, cast: { ...stage.cast, [id]: f } };
  }
  if (isKitCmd(s)) {
    const next = applyKit(stage, s as unknown as KitCmd, castWorld(stage));
    return next === stage ? stage : { ...stage, ...next, cast: stage.cast, scene: stage.scene };
  }
  return stage;
}

/** The stage after the first `n` steps (all of them by default). */
export function toldStageAt(steps: readonly ToldStep[], n = steps.length): ToldStage {
  let st = EMPTY_TOLD_STAGE;
  for (let i = 0; i < Math.min(n, steps.length); i++) st = applyToldStep(st, steps[i] as ToldStep);
  return st;
}

/** A kit step's one-shot effect in a cutscene (the same as on the map: logic-stage `kitFx`, with the cast as the figures). */
export function toldEffect(stage: ToldStage, s: ToldStep): Omit<Extract<Fx, { kind: 'kit' }>, 'kind'> | null {
  if (!isKitCmd(s) || 'focus' in s) return null;
  const fx = kitFx(s as unknown as KitCmd, stage, castWorld(stage));
  if (!fx) return null;
  const { kind: _k, ...rest } = fx;
  return rest;
}

// ───────────────────────── checks (tests and packages) ─────────────────────────

/** Problems in a told cutscene (empty = fine). `known`: verse ids; `painters` / `scenes3d`: registered ids (optional). */
export function checkTold(c: ToldCutscene, known: { shlokas: ReadonlySet<string>; painters?: ReadonlySet<string>; scenes3d?: ReadonlySet<string> }): string[] {
  const out: string[] = [];
  const at = `cutscene ${c.id}`;
  if (c.version !== 1) out.push(`${at}: version must be 1`);
  if (!/^[a-z][a-z0-9_-]*$/.test(c.id ?? '')) out.push(`${at}: id must be lower-case letters, digits, - or _`);
  if (![1, 2, 3, 4, 5, 6].includes(c.chapter)) out.push(`${at}: chapter must be 1..6`);
  if (!Array.isArray(c.steps)) return [...out, `${at}: steps must be an array`];
  if (c.stub) return c.steps.length ? [...out, `${at}: a stub has no steps`] : out;
  if (!c.title?.trim()) out.push(`${at}: title (English story text) is required`);
  if (!c.source?.trim()) out.push(`${at}: source (the Vālmīki reference) is required`);
  if (c.steps.length === 0) out.push(`${at}: no steps (mark it "stub": true while it is not written)`);
  if (c.painter && known.painters && !known.painters.has(c.painter)) out.push(`${at}: painter "${c.painter}" is not registered (cutscene-paint.ts)`);
  if (c.scene3d && known.scenes3d && !known.scenes3d.has(c.scene3d)) out.push(`${at}: 3D scene "${c.scene3d}" is not registered (cutscene3d-scenes.ts)`);
  const ids = new Set<string>();
  const walk = (steps: readonly ToldStep[] | undefined, where: string, top: boolean): void => {
    (steps ?? []).forEach((s, i) => {
      const w = `${at} ${where}[${i}]`;
      if (!s || typeof s !== 'object') return void out.push(`${w}: not a step`);
      const keys = ['say', 'verse', 'scene', 'cast', 'fx', 'topple', 'rise', 'grow', 'glow', 'prop', 'arrow', 'wait', 'hotspot', 'ask'].filter((k) => k in s);
      if (keys.length !== 1) return void out.push(`${w}: a step has exactly one kind (found ${keys.join(', ') || 'none'})`);
      if ('say' in s && (typeof s.say !== 'string' || !s.say.trim())) out.push(`${w}: say must be English text`);
      if ('verse' in s) {
        if (!known.shlokas.has(s.verse)) out.push(`${w}: verse "${s.verse}" is not in shlokas-*.json`);
        if (s.padas && !(Array.isArray(s.padas) && s.padas.every((p) => Number.isInteger(p) && p >= 0 && p <= 3))) out.push(`${w}: padas must be pāda indexes 0..3`);
      }
      if ('wait' in s && !(typeof s.wait === 'number' && s.wait >= 0 && s.wait <= 10000)) out.push(`${w}: wait must be 0..10000 ms`);
      if ('fx' in s && !['shake', 'flash', 'petals', 'rain', 'tint'].includes(s.fx)) out.push(`${w}: fx must be shake/flash/petals/rain/tint`);
      if ('grow' in s && !(typeof s.scale === 'number' && s.scale >= 0.5 && s.scale <= 4)) out.push(`${w}: grow scale must be 0.5..4`);
      if ('hotspot' in s) {
        if (ids.has(s.hotspot)) out.push(`${w}: hotspot id "${s.hotspot}" is used twice`);
        ids.add(s.hotspot);
        if (!Array.isArray(s.at) || s.at.length !== 4 || !s.at.every((n) => typeof n === 'number')) out.push(`${w}: hotspot at must be [x, y, w, h] in stage tiles`);
        if (!Array.isArray(s.then) || s.then.length === 0) out.push(`${w}: a hotspot needs its "then" steps`);
        if ((s.then ?? []).some(isAsk)) out.push(`${w}: no question inside a hotspot`);
        walk(s.then, `${where}[${i}].then`, false);
      }
      if ('ask' in s) {
        if (!top) out.push(`${w}: a question sits at the top level only`);
        if (typeof s.ask !== 'string' || !s.ask.trim()) out.push(`${w}: ask must be English text`);
        if (!Array.isArray(s.options) || s.options.length === 0 || s.options.length > 3) out.push(`${w}: a question has 1–3 options`);
        (s.options ?? []).forEach((o, k) => {
          if (typeof o.label !== 'string' || !o.label.trim()) out.push(`${w}.options[${k}]: label must be English text`);
          if ((o.then ?? []).some(isAsk)) out.push(`${w}.options[${k}]: no question inside an option`);
          walk(o.then, `${where}[${i}].options[${k}].then`, false);
        });
      }
    });
  };
  walk(c.steps, 'steps', true);
  return out;
}

// ───────────────────────── verse echoes ─────────────────────────

/** The flag of a verse echo. */
export function echoFlag(id: string): string {
  return `echo.${id}`;
}

/** The echoes found (their flag set) that include this verse. */
export function echoesOf(content: GameContent, flags: Record<string, true>, shlokaId: string): VerseEcho[] {
  return (content.echoes ?? []).filter((e) => e.shlokaIds.includes(shlokaId) && flags[echoFlag(e.id)]);
}

/** `{ "echo": id }` (Kathā, a known echo, not yet found) → its flag and a toast with its title; otherwise the same state. */
export function noteEcho(state: GameState, content: GameContent, id: unknown): GameState {
  if (!isKatha(state) || typeof id !== 'string') return state;
  const e = content.echoes?.find((x) => x.id === id);
  if (!e || state.save.flags[echoFlag(id)]) return state;
  return { ...state, save: { ...state.save, flags: { ...state.save.flags, [echoFlag(id)]: true } }, fx: [...state.fx, uiToast(content, e.title)] };
}
