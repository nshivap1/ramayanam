/**
 * v0.6 WP0: told cutscenes (logic-told.ts) — the view. OWNER: WP0 / orchestrator. Generalised from the Āditya-hṛdayam
 * view (view-cutscene.tsx, unchanged): the same overlay over the game frame (a stage on top, a reader below), the same
 * phases (flat → rotate-out → scene → rotate-in → done), pause / resume, skip with a confirmation, e2e fast mode.
 *
 *   stage    2D: the painter of the cutscene (cutscene-paint.ts; 'plain' until a package registers its own) draws the
 *            backdrop of the current shot; the cast, the props and the kit effects (view-stage.ts) are drawn on top.
 *            3D: a registered scene (cutscene3d-scenes.ts) when the cutscene names one, WebGL works and motion is not
 *            reduced; otherwise the 2D still. Reduced motion: the painter's still, no movement, effects' still paths.
 *   reader   the narration line (story text in the player's language: StoryLine, its Sanskrit from the dialogue TM),
 *            a verse with its pādas lit one by one at the recitation pace (with its English, or in संस्कृतम् its
 *            सरलार्थः), a question with its options (one tap; keys 1–3; the clock waits).
 *   hotspot  while a hotspot step is armed, its stage region can be tapped (a shimmering, focusable button; key H):
 *            found → its `then` steps play next. Not found → the scene simply goes on.
 *   end      onDone({ found, answers, how }) — Game dispatches cutscene-done { id, found, answers } (a replay from the
 *            verse book dispatches nothing). A skip ends it too (counts as seen; unanswered questions = their first option).
 *
 * e2e (?e2e=1): the scene runs fast (window.__ryCutsceneSpeed overrides; default ×60) and logs to window.__ryCutsceneLog:
 * `told|start|<id>`, `told|step|<i>|<kind>`, `told|hotspot|<id>`, `told|found|<id>`, `told|ask|<k>`, `told|answer|<k>|<i>`,
 * `told|done|played|skipped`. The root carries data-id, data-phase, data-step, data-ask, data-hotspot, data-mode.
 */
import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SaText, cx } from '@ui';
import type { SpriteId } from './catalog';
import type { SaveData, ToldStep } from './types';
import { type CastFigure, EMPTY_TOLD_STAGE, type ToldBeat, type ToldStage, applyToldStep, isAsk, isHotspot, toldEffect, toldOf, toldSeen, toldTimeline, TOLD_HOTSPOT_MS } from './logic-told';
import { type PaintCue, painterOf } from './cutscene-paint';
import { SCENES_3D, type Scene3DTold, type ToldPhase3D } from './cutscene3d-scenes';
import { type KitView, addKitFx, createKitView, drawGlowRect, drawKitFigure, drawKitFx, drawKitProp, fallK, kitActive, kitShake, propAt, scaleK, syncKitView } from './view-stage';
import { VerseRef, useButtons as useButtonsLocal, useEnv } from './view-common';
import { useUi } from './view-ui';
import { StoryLine } from './view-markup';
import { Speaker } from './view-panel';

const E2E = typeof location !== 'undefined' && /[?&]e2e=1\b/.test(`${location.hash}${location.search}`);
/** e2e: a minute of scene in ≈ 1 s (window.__ryCutsceneSpeed overrides, e.g. 1 for screenshots). */
const E2E_SPEED = 60;
const PHASE_MS = { '3d': { flat: 700, out: 3600, in: 3000 }, '2d': { flat: 350, out: 500, in: 500 } } as const;
const PHASES: readonly ToldPhase3D[] = ['flat', 'rotate-out', 'scene', 'rotate-in', 'done'];
/** Stage size in tiles (320 × 180 px at 16 px a tile). */
const STAGE_W = 20;
const STAGE_H = 11.25;

export interface ToldResult {
  found: string[];
  answers: number[];
  how: 'played' | 'skipped';
}

export interface ToldProps {
  id: string;
  /** a replay from the verse book: nothing is dispatched */
  replay?: boolean;
  onDone: (r: ToldResult) => void;
}

/** Where the scene clock stands: the beat on screen (answered questions pass at once; an open one stops the clock). */
function locate(beats: readonly ToldBeat[], ms: number, answered: number): { index: number; frac: number; start: number; waiting: boolean } {
  let t = Math.max(0, ms);
  let start = 0;
  let asks = 0;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i] as ToldBeat;
    if (b.kind === 'ask') {
      if (asks++ >= answered) return { index: i, frac: 0, start, waiting: true };
      continue;
    }
    if (t < b.ms) return { index: i, frac: b.ms > 0 ? t / b.ms : 1, start, waiting: false };
    t -= b.ms;
    start += b.ms;
  }
  return { index: beats.length, frac: 1, start, waiting: false };
}

const total = (beats: readonly ToldBeat[]): number => beats.reduce((a, b) => a + b.ms, 0);

export function ToldCutscene({ id, replay, onDone }: ToldProps): ReactElement | null {
  const env = useEnv();
  const ui = useUi();
  const c = toldOf(env.content, id);
  const [steps, setSteps] = useState<ToldStep[]>(() => (c ? [...c.steps] : []));
  const [found, setFound] = useState<string[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const beats = useMemo(() => toldTimeline(env.content, steps), [env.content, steps]);
  const beatsRef = useRef(beats);
  beatsRef.current = beats;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const foundRef = useRef(found);
  foundRef.current = found;
  const scene3d = c?.scene3d ? SCENES_3D[c.scene3d] : undefined;
  const [mode, setMode] = useState<'2d' | '3d'>(() => (scene3d && !env.reduced ? '3d' : '2d'));
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const phases = PHASE_MS[mode];
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const [asking, setAsking] = useState(false);
  const askingRef = useRef(false);
  askingRef.current = asking;
  const [view, setView] = useState<{ phase: ToldPhase3D; beat: number; waiting: boolean; hotspot: string | null; say: number; verse: number; pada: number }>({ phase: 'flat', beat: -1, waiting: false, hotspot: null, say: -1, verse: -1, pada: -1 });
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const clock = useRef(0);
  const finished = useRef(false);
  const skipped = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  // the stage as the clock has crossed the steps
  const stage = useRef<ToldStage>(EMPTY_TOLD_STAGE);
  const applied = useRef(0);
  const kit = useRef<KitView>(createKitView());
  const castGlide = useRef(new Map<string, { at: number; fromX: number; fromY: number; ms: number }>());
  const shotAt = useRef(0);
  const armed = useRef<{ id: string; at: [number, number, number, number]; until: number; step: number } | null>(null);
  const textRef = useRef<{ say: number; verse: number; pada: number }>({ say: -1, verse: -1, pada: -1 });
  const speedNow = useCallback((): number => {
    if (!E2E) return 1;
    const w = (window as unknown as { __ryCutsceneSpeed?: unknown }).__ryCutsceneSpeed;
    return typeof w === 'number' && w > 0 ? w : E2E_SPEED;
  }, []);
  const log = useCallback((entry: string) => {
    if (!E2E) return;
    const w = window as unknown as { __ryCutsceneLog?: string[] };
    (w.__ryCutsceneLog ??= []).push(entry);
  }, []);

  /** Apply every step up to and including `upTo` (the clock crossed it). */
  const applyUpTo = useCallback(
    (upTo: number, sceneMs: number): void => {
      const list = stepsRef.current;
      while (applied.current <= upTo && applied.current < list.length) {
        const i = applied.current++;
        const s = list[i] as ToldStep;
        const before = stage.current;
        if ('cast' in s && s.to && before.cast[s.cast]) {
          const f = before.cast[s.cast] as CastFigure;
          castGlide.current.set(s.cast, { at: sceneMs, fromX: f.x, fromY: f.y, ms: typeof s.ms === 'number' ? s.ms : 600 });
        }
        if ('scene' in s && s.scene !== before.scene) shotAt.current = sceneMs;
        const fx = toldEffect(before, s);
        stage.current = applyToldStep(before, s);
        if (fx) addKitFx(kit.current, { name: fx.name, ms: fx.ms, ...(fx.at ? { rect: fx.at } : {}), ...(fx.path ? { path: fx.path } : {}) }, sceneMs);
        if (isHotspot(s)) {
          armed.current = { id: s.hotspot, at: s.at, until: sceneMs + (typeof s.ms === 'number' && s.ms > 0 ? s.ms : TOLD_HOTSPOT_MS), step: i };
          log(`told|hotspot|${s.hotspot}`);
        }
        if ('say' in s) textRef.current = { say: i, verse: -1, pada: -1 };
        log(`told|step|${i}|${Object.keys(s).find((k) => ['say', 'verse', 'scene', 'cast', 'fx', 'topple', 'rise', 'grow', 'glow', 'prop', 'arrow', 'wait', 'hotspot', 'ask'].includes(k)) ?? '?'}`);
      }
    },
    [log],
  );

  // ── the 3D scene (when registered and allowed) ──
  const scene3dRef = useRef<Scene3DTold | null>(null);
  useEffect(() => {
    if (mode !== '3d' || !scene3d || !glRef.current) return;
    let s: Scene3DTold | null = null;
    try {
      s = scene3d(glRef.current, env.art, (lost) => {
        log(lost ? 'told|context-lost' : 'told|context-restored');
        if (lost) setMode('2d');
      });
    } catch {
      s = null;
    }
    if (!s) {
      setMode('2d');
      return;
    }
    scene3dRef.current = s;
    return () => {
      s?.dispose();
      scene3dRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const gameCanvas = useCallback((): HTMLCanvasElement | null => rootRef.current?.parentElement?.querySelector<HTMLCanvasElement>('canvas[data-testid="screen"]') ?? null, []);

  // ── the clock: one rAF loop drives the phases, the steps, the stage and the reader ──
  useEffect(() => {
    if (!c) return;
    let raf = 0;
    let last = performance.now();
    let seconds = 0;
    let lastKey = '';
    log(`told|start|${c.id}${replay ? '|replay' : ''}`);
    const frame = (now: number): void => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, Math.max(0, now - last));
      last = now;
      const speed = speedNow();
      const p = PHASE_MS[modeRef.current];
      const bs = beatsRef.current;
      const sceneLen = total(bs);
      // where are we?
      const sceneMs = Math.max(0, Math.min(clock.current - p.flat - p.out, sceneLen));
      // after a skip no question stops the clock
      const answered = skipped.current ? Number.POSITIVE_INFINITY : answersRef.current.length;
      const at = locate(bs, sceneMs, answered);
      const waiting = clock.current >= p.flat + p.out && at.waiting;
      if (!pausedRef.current && !askingRef.current && !waiting) {
        clock.current += dt * speed;
        seconds += dt / 1000;
      }
      const ms = clock.current;
      const phase: ToldPhase3D = ms < p.flat ? 'flat' : ms < p.flat + p.out ? 'rotate-out' : ms < p.flat + p.out + sceneLen || at.waiting ? 'scene' : ms < p.flat + p.out + sceneLen + p.in ? 'rotate-in' : 'done';
      const k = phase === 'flat' ? ms / p.flat : phase === 'rotate-out' ? (ms - p.flat) / p.out : phase === 'rotate-in' ? (ms - p.flat - p.out - sceneLen) / p.in : phase === 'done' ? 1 : at.frac;
      const sMs = Math.max(0, Math.min(ms - p.flat - p.out, sceneLen));
      const cur = locate(bs, sMs, answered);
      // the steps the clock crossed (every beat up to the one on screen)
      if (phase === 'scene' || phase === 'rotate-in' || phase === 'done') {
        const upTo = cur.index < bs.length ? (bs[cur.index] as ToldBeat).step : stepsRef.current.length - 1;
        if (!skipped.current) applyUpTo(upTo, sMs);
      }
      const beat = cur.index < bs.length ? bs[cur.index] : undefined;
      if (beat?.kind === 'pada') textRef.current = { say: -1, verse: beat.step, pada: beat.pada };
      if (armed.current && sMs > armed.current.until) armed.current = null;
      // stage animations run on the scene clock (pause freezes them; the e2e clock speeds them)
      syncKitView(kit.current, stage.current, sMs);
      // draw
      const g = canvasRef.current?.getContext('2d');
      if (g && (modeRef.current === '2d' || !scene3dRef.current || scene3dRef.current.lost)) drawStage2D(g, sMs, phase, cur.index);
      if (modeRef.current === '3d' && scene3dRef.current && !scene3dRef.current.lost) {
        const cs = glRef.current;
        if (cs) {
          const rect = cs.parentElement?.getBoundingClientRect();
          const px = Math.max(1.25, (rect?.width ?? 320) / 420);
          const w = Math.max(160, Math.round((rect?.width ?? 320) / px));
          const hh = Math.max(90, Math.round((rect?.height ?? 180) / px));
          if (cs.width !== w || cs.height !== hh) {
            cs.width = w;
            cs.height = hh;
          }
        }
        scene3dRef.current.render(
          { phase, k: Math.max(0, Math.min(1, k)), scene: stage.current.scene, t: sMs - shotAt.current, progress: sceneLen > 0 ? sMs / sceneLen : 1, time: seconds, dt: pausedRef.current ? 0 : dt * Math.min(speed, 40), stage: stage.current, step: beat ? stepsRef.current[beat.step] : undefined, found: foundRef.current, answers: answersRef.current },
          gameCanvas(),
        );
      }
      // the stage fades in over the game frame (2D) / the 3D camera does its own moves
      const root = rootRef.current;
      if (root) {
        root.dataset['phase'] = phase;
        root.dataset['step'] = String(beat ? beat.step : stepsRef.current.length);
        root.style.setProperty('--told-sweep', String(beat?.kind === 'pada' ? Math.min(1, cur.frac * 1.08) : 0));
        const fade = modeRef.current === '2d' ? (phase === 'flat' ? Math.min(1, k) : phase === 'rotate-in' ? 1 - Math.min(1, k) : phase === 'done' ? 0 : 1) : 1;
        root.style.setProperty('--told-fade', String(fade));
        const kitNow = kitActive(kit.current, sMs).join(',');
        if ((root.dataset['kit'] ?? '') !== kitNow) root.dataset['kit'] = kitNow;
        const sh = kitShake(kit.current, sMs, env.reduced);
        const cnv = canvasRef.current;
        if (cnv) cnv.style.transform = sh.x || sh.y ? `translate(${sh.x}px, ${sh.y}px)` : '';
      }
      const key = `${phase}|${cur.index}|${cur.waiting ? 'w' : ''}|${armed.current?.id ?? ''}|${textRef.current.say}|${textRef.current.verse}|${textRef.current.pada}`;
      if (key !== lastKey) {
        lastKey = key;
        if (cur.waiting && phase === 'scene') log(`told|ask|${answersRef.current.length}`);
        setView({ phase, beat: cur.index, waiting: phase === 'scene' && cur.waiting, hotspot: armed.current?.id ?? null, ...textRef.current });
      }
      if (phase === 'done' && !finished.current) {
        finished.current = true;
        cancelAnimationFrame(raf);
        log(`told|done|${skipped.current ? 'skipped' : 'played'}`);
        doneRef.current({ found: [...foundRef.current], answers: [...answersRef.current], how: skipped.current ? 'skipped' : 'played' });
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // the loop reads everything through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id]);

  /** The 2D stage: the painter's backdrop, then the cast, the props, an armed hotspot's shimmer and the kit effects. */
  const drawStage2D = (g: CanvasRenderingContext2D, sMs: number, phase: ToldPhase3D, beatIndex: number): void => {
    g.imageSmoothingEnabled = false;
    const st = stage.current;
    const reduced = env.reduced;
    const beat = beatIndex >= 0 ? beatsRef.current[beatIndex] : undefined;
    const cue: PaintCue = { scene: st.scene, t: sMs - shotAt.current, time: sMs, stage: st, step: beat ? stepsRef.current[beat.step] : undefined, reduced, found: foundRef.current, answers: answersRef.current };
    try {
      painterOf(c?.painter)(g, cue, env.art);
    } catch (err) {
      g.fillStyle = 'rgb(20,14,24)';
      g.fillRect(0, 0, 320, 180);
      if (E2E) console.warn('[ramayana-yatra] painter', err);
    }
    const list: { y: number; draw: () => void }[] = [];
    for (const [cid, f] of Object.entries(st.cast)) {
      const gl = castGlide.current.get(cid);
      const kk = gl && !reduced ? Math.min(1, Math.max(0, (sMs - gl.at) / Math.max(1, gl.ms))) : 1;
      const x = gl ? gl.fromX + (f.x - gl.fromX) * kk : f.x;
      const y = gl ? gl.fromY + (f.y - gl.fromY) * kk : f.y;
      const moving = kk < 1;
      const frame: 0 | 1 | 2 = moving ? ((Math.floor(sMs / 160) % 2) + 1) as 1 | 2 : 0;
      list.push({ y, draw: () => drawKitFigure(g, env.art, f.sprite as SpriteId, Math.round(x * 16), Math.round(y * 16), f.facing, frame, fallK(kit.current, cid, sMs, reduced), scaleK(kit.current, cid, sMs, reduced)) });
    }
    for (const [pid, pr] of Object.entries(st.props)) {
      const carrier = pr.carry ? st.cast[pr.carry] : undefined;
      const at = carrier ? { x: carrier.x, y: carrier.y } : propAt(kit.current, pid, pr.x, pr.y, sMs, reduced);
      const py = Math.round(at.y * 16) - (carrier ? 18 : 0);
      list.push({ y: at.y + (carrier ? 0.002 : -0.001), draw: () => drawKitProp(g, env.art, pr.sprite, Math.round(at.x * 16), py, sMs / 1000, fallK(kit.current, pid, sMs, reduced), scaleK(kit.current, pid, sMs, reduced)) });
    }
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.draw();
    const a = armed.current;
    if (a && phase === 'scene') drawGlowRect(g, { x: a.at[0] * 16, y: a.at[1] * 16 }, a.at[2] * 16, a.at[3] * 16, sMs, reduced, 0.5);
    drawKitFx(g, kit.current, sMs, reduced, (x, y) => ({ x: x * 16, y: y * 16 }));
  };

  // ── input ──
  const look = useCallback(() => {
    const a = armed.current;
    if (!a || finished.current) return;
    const s = stepsRef.current[a.step];
    armed.current = null;
    if (!s || !isHotspot(s) || foundRef.current.includes(a.id)) return;
    log(`told|found|${a.id}`);
    setFound((f) => [...f, a.id]);
    // its steps play right after the step on screen now
    const bs = beatsRef.current;
    const p = PHASE_MS[modeRef.current];
    const cur = locate(bs, Math.max(0, clock.current - p.flat - p.out), answersRef.current.length);
    const after = cur.index < bs.length ? (bs[cur.index] as ToldBeat).step : stepsRef.current.length - 1;
    setSteps((list) => [...list.slice(0, after + 1), ...s.then, ...list.slice(after + 1)]);
  }, [log]);
  const answer = useCallback(
    (i: number) => {
      if (finished.current) return;
      const bs = beatsRef.current;
      const p = PHASE_MS[modeRef.current];
      const cur = locate(bs, Math.max(0, clock.current - p.flat - p.out), answersRef.current.length);
      const beat = cur.waiting ? bs[cur.index] : undefined;
      const s = beat ? stepsRef.current[beat.step] : undefined;
      if (!beat || !s || !isAsk(s) || i < 0 || i >= s.options.length) return;
      log(`told|answer|${answersRef.current.length}|${i}`);
      setAnswers((as) => [...as, i]);
      const then = s.options[i]?.then ?? [];
      if (then.length) setSteps((list) => [...list.slice(0, beat.step + 1), ...then, ...list.slice(beat.step + 1)]);
    },
    [log],
  );
  const skip = useCallback(() => {
    setAsking(false);
    if (finished.current) return;
    // a skip still counts as seen: the clock jumps to the end of the scene (open questions pass with no answer) and the
    // stage fades / flies back as usual
    skipped.current = true;
    armed.current = null;
    log('told|skip');
    const p = PHASE_MS[modeRef.current];
    clock.current = Math.max(clock.current, p.flat + p.out + total(beatsRef.current));
    setPaused(false);
  }, [log]);

  const pauseBtn = useRef<HTMLButtonElement>(null);
  const noBtn = useRef<HTMLButtonElement>(null);
  const optRef = useRef<HTMLButtonElement>(null);
  useEffect(() => pauseBtn.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (asking) noBtn.current?.focus({ preventScroll: true });
    else if (view.waiting) optRef.current?.focus({ preventScroll: true });
  }, [asking, view.waiting]);
  useEffect(() => {
    const kd = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const onButton = e.target instanceof HTMLElement && !!e.target.closest('button');
      if (askingRef.current) {
        if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') setAsking(false);
        return;
      }
      if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') setAsking(true);
      else if (e.key === 'h' || e.key === 'H') look();
      else if (/^[1-3]$/.test(e.key)) answer(Number(e.key) - 1);
      else if (!onButton && (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === 'p' || e.key === 'P')) setPaused((p) => !p);
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [look, answer]);

  if (!c) return null;
  const sayStep = view.say >= 0 ? steps[view.say] : undefined;
  const verseStep = view.verse >= 0 ? steps[view.verse] : undefined;
  const sh = verseStep && 'verse' in verseStep ? env.idx.shloka.get(verseStep.verse) : undefined;
  const lit = verseStep && 'verse' in verseStep ? (verseStep.padas ?? [0, 1, 2, 3]) : [];
  const askBeat = view.waiting && view.beat >= 0 ? beats[view.beat] : undefined;
  const askStep = askBeat ? steps[askBeat.step] : undefined;
  const a = armed.current;
  const kv = sh ? env.content.katha?.verses.find((v) => v.shlokaId === sh.id) : undefined;
  const titleSa = env.content.dialogueSa?.[c.title];
  const title: ReactNode = <StoryLine en={c.title} {...(titleSa ? { sa: titleSa } : {})} noGloss />;
  return (
    <div
      ref={rootRef}
      className={cx('g-ramayana-yatra__cs g-ramayana-yatra__told', `is-${mode === '3d' ? '3d' : 'fallback'}`, paused && 'is-paused')}
      role="dialog"
      aria-modal="true"
      aria-label={ui.cPlain(c.title)}
      data-testid="told"
      data-id={c.id}
      data-mode={mode}
      data-phase={view.phase}
      data-ask={view.waiting ? 'true' : 'false'}
      data-hotspot={view.hotspot ?? ''}
      data-replay={replay ? 'true' : 'false'}
    >
      <div className="g-ramayana-yatra__cs-stage g-ramayana-yatra__told-stage" aria-hidden={a ? undefined : 'true'}>
        <canvas ref={canvasRef} className="g-ramayana-yatra__told-canvas" width={320} height={180} data-testid="told-canvas" aria-hidden="true" />
        {mode === '3d' ? <canvas ref={glRef} className="g-ramayana-yatra__cs-gl" data-testid="told-gl" aria-hidden="true" /> : null}
        {a && view.phase === 'scene' ? (
          <button
            type="button"
            className="g-ramayana-yatra__told-spot"
            style={{ left: `${(a.at[0] / STAGE_W) * 100}%`, top: `${(a.at[1] / STAGE_H) * 100}%`, width: `${(a.at[2] / STAGE_W) * 100}%`, height: `${(a.at[3] / STAGE_H) * 100}%` }}
            onClick={look}
            aria-label={ui.plain('v06.look')}
            data-testid="told-hotspot"
            data-hotspot={a.id}
          />
        ) : null}
      </div>
      <div className="g-ramayana-yatra__cs-reader">
        <div className="g-ramayana-yatra__cs-head">
          <div className="g-ramayana-yatra__cs-title">
            <span className="g-ramayana-yatra__cs-name" data-testid="told-title">
              {title}
            </span>
            {sh ? (
              <span className="g-ramayana-yatra__cs-count">
                <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} />
              </span>
            ) : null}
          </div>
          <div className="g-ramayana-yatra__cs-ctrl">
            <button ref={pauseBtn} type="button" className="g-ramayana-yatra__cs-btn" onClick={() => setPaused((p) => !p)} aria-pressed={paused} data-testid="told-pause">
              {paused ? ui.t('v06.resume', undefined, { gloss: false }) : ui.t('v06.pause', undefined, { gloss: false })}
            </button>
            <button type="button" className="g-ramayana-yatra__cs-btn" onClick={() => setAsking(true)} data-testid="told-skip">
              {ui.t('v06.skip', undefined, { gloss: false })}
            </button>
          </div>
        </div>
        {asking ? (
          <div className="g-ramayana-yatra__cs-ask" role="alertdialog" aria-label={ui.plain('v06.skipAsk')} data-testid="told-skip-ask">
            <span>{ui.t('v06.skipAsk')}</span>
            <button type="button" className="g-ramayana-yatra__cs-btn is-yes" onClick={skip} data-testid="told-skip-yes">
              {ui.t('common.yes', undefined, { gloss: false })}
            </button>
            <button ref={noBtn} type="button" className="g-ramayana-yatra__cs-btn" onClick={() => setAsking(false)} data-testid="told-skip-no">
              {ui.t('common.no', undefined, { gloss: false })}
            </button>
          </div>
        ) : null}
        <div className="g-ramayana-yatra__cs-scroll g-ramayana-yatra__told-text" data-testid="told-text" aria-live="polite">
          {sayStep && 'say' in sayStep ? (
            <p className="g-ramayana-yatra__cs-nar is-now" data-testid="told-say">
              {sayStep.who ? <Speaker who={sayStep.who} /> : null}
              <StoryLine en={sayStep.say} />
            </p>
          ) : null}
          {sh ? (
            <section className="g-ramayana-yatra__cs-verse is-now" data-testid="told-verse" data-verse={sh.id}>
              {sh.padas.map((pd, i) =>
                lit.includes(i) ? (
                  <div key={i} className={cx('g-ramayana-yatra__cs-pada', i === view.pada && 'is-now', i < view.pada && 'is-done')} data-now={i === view.pada ? 'true' : undefined} data-testid={`told-pada-${i}`}>
                    <SaText shloka nowrap={false}>
                      {pd}
                    </SaText>
                  </div>
                ) : null,
              )}
              {ui.lang !== 'sa' ? (
                <p className="g-ramayana-yatra__cs-en g-ramayana-yatra__cs-tr" data-testid="told-verse-en">
                  {sh.translation}
                </p>
              ) : kv ? (
                <p className="g-ramayana-yatra__cs-tr" data-testid="told-verse-sa">
                  <SaText nowrap={false}>{kv.saralarthah}</SaText>
                </p>
              ) : null}
            </section>
          ) : null}
          {askStep && isAsk(askStep) ? (
            <div className="g-ramayana-yatra__told-q" role="group" data-testid="told-ask">
              <p className="g-ramayana-yatra__say-text">
                <StoryLine en={askStep.ask} />
              </p>
              {askStep.options.map((o, i) => (
                <button key={i} ref={i === 0 ? optRef : undefined} type="button" className="g-ramayana-yatra__cs-btn g-ramayana-yatra__told-opt" onClick={() => answer(i)} data-testid={`told-opt-${i}`}>
                  <span className="g-ramayana-yatra__kbd" aria-hidden="true">
                    {i + 1}
                  </span>{' '}
                  <StoryLine en={o.label} noGloss />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The verse book's replay entries: every told cutscene this save has seen, "<title> ▶" (book order). */
export function ToldEntries({ save, onPlay }: { save: SaveData; onPlay?: ((id: string) => void) | undefined }): ReactElement | null {
  const env = useEnv();
  if (!onPlay) return null;
  const seen = toldSeen(env.content, save.flags);
  if (!seen.length) return null;
  return (
    <>
      {seen.map((c) => (
        <button key={c.id} type="button" className="g-ramayana-yatra__verse-btn g-ramayana-yatra__cs-entry" onClick={() => onPlay(c.id)} data-testid={`told-replay-${c.id}`}>
          <span className="g-ramayana-yatra__move-name">
            <StoryLine en={c.title} noGloss /> ▶
          </span>
        </button>
      ))}
    </>
  );
}

/** Used by the phase list in tests and docs. */
export const TOLD_PHASES = PHASES;

/**
 * v0.6: a hidden moment on the map (pending 'hotspot', logic-events): the last line stays on screen, the tile shimmers
 * (view-screen). A (Z / Enter) or a tap on the scene looks closer (choose 0: found); ▶ (B / X) passes (advance); after
 * `ms` it passes by itself (Game). A press that began before the panel armed (300 ms) is ignored.
 */
export function HotspotPanel({ echo, dispatch }: { echo?: { text: string; who?: string } | null; dispatch: (a: { type: 'choose'; index: number } | { type: 'advance' }) => void }): ReactElement {
  const ui = useUi();
  const [armedNow, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 300);
    return () => clearTimeout(t);
  }, []);
  const lookNow = (): void => {
    if (armedNow) dispatch({ type: 'choose', index: 0 });
  };
  const pass = (): void => dispatch({ type: 'advance' });
  useButtonsLocal({ a: lookNow, b: pass });
  return (
    <div className="g-ramayana-yatra__say is-echo g-ramayana-yatra__hotspot" data-testid="panel-hotspot" data-armed={armedNow ? 'true' : 'false'}>
      <div className="g-ramayana-yatra__say-box">
        <div className="g-ramayana-yatra__say-body">
          {echo?.who ? <Speaker who={echo.who} /> : null}
          {echo ? (
            <p className="g-ramayana-yatra__say-text">
              <StoryLine en={echo.text} />
            </p>
          ) : null}
        </div>
        <button type="button" className="g-ramayana-yatra__hotspot-pass" onClick={pass} data-testid="hotspot-pass" aria-label={ui.plain('common.continue')}>
          ▶
        </button>
      </div>
      <button type="button" className="sk-sr" onClick={lookNow} data-testid="hotspot-look-sr">
        {ui.t('v06.look', undefined, { gloss: false })}
      </button>
    </div>
  );
}

/** The invisible "look closer" button over the game screen while a hotspot waits (a tap anywhere on the scene). */
export function HotspotLook({ onLook }: { onLook: () => void }): ReactElement {
  const ui = useUi();
  return <button type="button" className="g-ramayana-yatra__hotspot-look" onClick={onLook} aria-label={ui.plain('v06.look')} data-testid="hotspot-look" />;
}
