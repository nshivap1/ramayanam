/**
 * v0.5b WP-E: the Āditya-hṛdayam cutscene view (OWNER: WP-E) — the owner's homage to Rāma learning the hymn from Agastya
 * in the middle of the battle (Yuddha 6.105.1–31). Non-interactive: it plays by itself; the player can pause / resume
 * and skip (after a confirm; a skip still counts as seen).
 *
 *   phases (data-phase): flat → rotate-out → scene → rotate-in → done
 *     flat        the stage over the game screen shows the live battle frame (the 3D camera faces the frame plane)
 *     rotate-out  the camera pulls back, lifts and rolls out of the flat view; the frame folds back and dissolves; the
 *                 stage grows (cutscene3d.ts)
 *     scene       the follow-along: the narration (Sanskrit + English), then all 31 verses — the current pāda lit with a
 *                 sweep at ≈ 3 akṣaras / s and auto-scrolled, the verse counter (१ / ३१) and the current verse's English
 *     rotate-in   the camera flies back to the frame plane; the stage shrinks; the last frame IS the live battle frame
 *     done        onDone → Game dispatches `{ type: 'cutscene-done', id }` (or, for a replay, back to the verse book)
 *   data-mode: '3d' (WebGL) or 'fallback' — reduced motion, no WebGL or a lost context: a still painting of the scene
 *   with crossfades (paintScene2D).
 *
 * English in संस्कृतम् mode: the narration's and the verses' English are shown in every language version, as the owner
 * asked ("showing Sanskrit text and English translation … the same across the language versions"): marked data-en-ok.
 * The controls follow the story-text language. Sanskrit goes through <SaText> (Devanagari or IAST by the script setting).
 * e2e (?e2e=1): the scene runs fast (window.__ryCutsceneSpeed overrides) and logs `phase|step` to window.__ryCutsceneLog.
 */
import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SaText, cx, renderSa } from '@ui';
import { toDevaDigits } from '@sanskrit';
import type { CutsceneText, SaveData } from './types';
import { CUTSCENE_PHASES, type CutscenePhase, type CutsceneStep, cutsceneOf, cutsceneSeen, cutsceneSteps, stepAt, stepKey, stepsMs } from './logic-cutscene';
import { type Scene3D, type SceneCue, createScene3D, paintScene2D } from './cutscene3d';
import { VerseRef, useEnv } from './view-common';
import { useUi } from './view-ui';

const E2E = typeof location !== 'undefined' && /[?&]e2e=1\b/.test(`${location.hash}${location.search}`);
/** e2e: the whole scene in ≈ 1.6 s (a test may set window.__ryCutsceneSpeed, e.g. 1 for screenshots). */
const E2E_SPEED = 280;

/** Phase lengths (ms at speed 1): the 3D moves, and the crossfades of the still. */
const PHASE_MS = { '3d': { flat: 700, out: 3600, in: 3000 }, fallback: { flat: 400, out: 900, in: 900 } } as const;

type Mode = '3d' | 'fallback';
interface Timeline {
  flat: number;
  out: number;
  scene: number;
  in: number;
}
const total = (t: Timeline): number => t.flat + t.out + t.scene + t.in;

/** Where the clock stands: the phase, its progress k, the step of the follow-along and its fraction. */
function locate(t: Timeline, steps: readonly CutsceneStep[], ms: number): { phase: CutscenePhase; k: number; step: number; frac: number } {
  if (ms < t.flat) return { phase: 'flat', k: ms / t.flat, step: -1, frac: 0 };
  let m = ms - t.flat;
  if (m < t.out) return { phase: 'rotate-out', k: m / t.out, step: -1, frac: 0 };
  m -= t.out;
  if (m < t.scene) {
    const a = stepAt(steps, m);
    return { phase: 'scene', k: a.frac, step: a.index, frac: a.frac };
  }
  m -= t.scene;
  if (m < t.in) return { phase: 'rotate-in', k: m / t.in, step: steps.length, frac: 1 };
  return { phase: 'done', k: 1, step: steps.length, frac: 1 };
}

/** A cutscene string in the story-text language: English · Sanskrit · Sanskrit with a small English gloss. */
function useCsText(): { t: (e: CutsceneText | undefined, gloss?: boolean) => ReactNode; plain: (e: CutsceneText | undefined) => string } {
  const ui = useUi();
  const env = useEnv();
  return {
    t: (e, gloss = true) => {
      if (!e) return null;
      if (!ui.isSa) return e.en;
      if (ui.lang === 'sa' || !gloss) return <SaText>{e.sa}</SaText>;
      return (
        <>
          <SaText>{e.sa}</SaText>
          <span className="g-ramayana-yatra__ui-en"> {e.en}</span>
        </>
      );
    },
    plain: (e) => (!e ? '' : ui.isSa ? renderSa(e.sa, env.script) : e.en),
  };
}

export interface CutsceneProps {
  id: string;
  /** a replay from the verse book (no battle under it) */
  replay?: boolean;
  /** the scene has finished (played or skipped) */
  onDone: (how: 'played' | 'skipped') => void;
}

export function Cutscene({ id, replay, onDone }: CutsceneProps): ReactElement | null {
  const env = useEnv();
  const ui = useUi();
  const cs = useCsText();
  const content = cutsceneOf(env.content, id);
  const steps = useMemo(() => cutsceneSteps(env.content, { id }), [env.content, id]);
  const [mode, setMode] = useState<Mode>(() => (env.reduced ? 'fallback' : '3d'));
  /** the WebGL canvas stays mounted while a scene exists (a lost context is restored on it); gone without WebGL */
  const [glOk, setGlOk] = useState(!env.reduced);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const timeline = useMemo<Timeline>(() => {
    const p = PHASE_MS[env.reduced ? 'fallback' : '3d'];
    return { flat: p.flat, out: p.out, scene: stepsMs(steps), in: p.in };
  }, [steps, env.reduced]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const [asking, setAsking] = useState(false);
  const askingRef = useRef(false);
  askingRef.current = asking;
  const [where, setWhere] = useState<{ phase: CutscenePhase; step: number }>({ phase: 'flat', step: -1 });
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const stillRef = useRef<HTMLCanvasElement>(null);
  const frameCopyRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const clock = useRef(0);
  const finished = useRef(false);
  const skipped = useRef(false);
  /** the clock has just jumped (a skip): the next log entry does not list what lies between */
  const skipJump = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  /** e2e only: the clock runs fast; a test may change window.__ryCutsceneSpeed at any time (1 = real time, for screenshots) */
  const speedNow = useCallback((): number => {
    if (!E2E) return 1;
    const w = (window as unknown as { __ryCutsceneSpeed?: unknown }).__ryCutsceneSpeed;
    return typeof w === 'number' && w > 0 ? w : E2E_SPEED;
  }, []);
  const speed = speedNow();

  // ── e2e log ──
  const log = useCallback((entry: string) => {
    if (!E2E) return;
    const w = window as unknown as { __ryCutsceneLog?: string[] };
    (w.__ryCutsceneLog ??= []).push(entry);
  }, []);

  // ── the 3D scene (or the still) ──
  const sceneRef = useRef<Scene3D | null>(null);
  useEffect(() => {
    const still = stillRef.current?.getContext('2d');
    if (still) paintScene2D(still, env.art);
    if (mode !== '3d' || !glRef.current) return;
    const s = createScene3D(glRef.current, env.art, (lost) => {
      log(lost ? 'context-lost' : 'context-restored');
      setMode(lost ? 'fallback' : '3d');
    });
    if (!s) {
      setMode('fallback');
      setGlOk(false);
      return;
    }
    sceneRef.current = s;
    return () => {
      s.dispose();
      sceneRef.current = null;
    };
    // a restored context keeps its scene (createScene3D rebuilds it); a lost one only switches the mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env.art]);

  /** The game's live canvas (the battle frame) and its size on screen. */
  const gameCanvas = useCallback((): HTMLCanvasElement | null => rootRef.current?.parentElement?.querySelector<HTMLCanvasElement>('canvas[data-testid="screen"]') ?? null, []);
  // the fallback crossfades from a copy of the battle frame (taken now, and again for the return)
  const copyFrame = useCallback(() => {
    const src = gameCanvas();
    const dst = frameCopyRef.current?.getContext('2d');
    if (src && dst) {
      dst.imageSmoothingEnabled = false;
      try {
        dst.drawImage(src, 0, 0, 320, 180);
      } catch {
        /* nothing to copy */
      }
    }
  }, [gameCanvas]);
  useEffect(copyFrame, [copyFrame]);

  // ── the clock: one rAF loop drives the phases, the reader and the camera ──
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let seconds = 0;
    let lastKey = '';
    let lastPhase: CutscenePhase | '' = '';
    const h0 = { v: 0 };
    log(`start|${modeRef.current}${replay ? '|replay' : ''}`);
    const frame = (now: number): void => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, Math.max(0, now - last));
      last = now;
      const speed = speedNow();
      if (!pausedRef.current && !askingRef.current) {
        clock.current += dt * speed;
        seconds += dt / 1000;
      }
      const at = locate(timeline, steps, clock.current);
      const step = at.step >= 0 && at.step < steps.length ? steps[at.step] : undefined;
      const key = at.phase === 'scene' ? stepKey(step) : '';
      if (at.phase !== lastPhase || key !== lastKey) {
        // the log names every phase and step crossed since the last frame, in order (a fast e2e clock skips frames);
        // a skip jumps: what it jumped over is not logged
        const fromI = lastPhase === '' ? -1 : CUTSCENE_PHASES.indexOf(lastPhase);
        const toI = CUTSCENE_PHASES.indexOf(at.phase);
        const sceneI = CUTSCENE_PHASES.indexOf('scene');
        const jumped = skipJump.current;
        skipJump.current = false;
        const stepsTo = (end: number, from: number): void => {
          if (!jumped) for (let i = from; i < end; i++) log(`scene|${stepKey(steps[i])}`);
        };
        const lastIdx = lastPhase === 'scene' ? steps.findIndex((x) => stepKey(x) === lastKey) : -1;
        if (fromI === toI) stepsTo(at.step, lastIdx + 1);
        else {
          if (lastPhase === 'scene') stepsTo(steps.length, lastIdx + 1);
          for (let i = fromI + 1; i < toI; i++) {
            if (jumped) continue;
            if (i === sceneI) stepsTo(steps.length, 0);
            else log(`${CUTSCENE_PHASES[i]}|`);
          }
          if (at.phase === 'scene') stepsTo(at.step, 0);
        }
        log(`${at.phase}|${key}`);
        if (at.phase === 'rotate-in' && modeRef.current === 'fallback') copyFrame();
        lastPhase = at.phase;
        lastKey = key;
        setWhere({ phase: at.phase, step: at.step });
      }
      const root = rootRef.current;
      if (root) {
        root.dataset['phase'] = at.phase;
        root.dataset['step'] = key || at.phase;
        root.style.setProperty('--cs-sweep', String(at.phase === 'scene' ? Math.min(1, at.frac * 1.08) : 0));
      }
      // the stage over the game screen grows for the 3D view and shrinks back for the return (3D mode only)
      const stage = stageRef.current;
      if (stage && root) {
        const w = stage.clientWidth;
        // the stage starts exactly over the game screen (same width, 16:9); short landscape screens never grow it
        if (!h0.v) h0.v = Math.round(gameCanvas()?.getBoundingClientRect().height || (w * 9) / 16);
        const tall = root.clientHeight < 560 ? h0.v : Math.min(Math.round(root.clientHeight * 0.44), Math.round(w * 0.78));
        const grow = modeRef.current !== '3d' ? 0 : at.phase === 'rotate-out' ? smoothK(0.12, 0.62, at.k) : at.phase === 'scene' ? 1 : at.phase === 'rotate-in' ? 1 - smoothK(0.1, 0.72, at.k) : 0;
        const h = Math.round(h0.v + (Math.max(h0.v, tall) - h0.v) * grow);
        if (stage.style.height !== `${h}px`) stage.style.height = `${h}px`;
      }
      // the picture
      if (modeRef.current === '3d' && sceneRef.current && !sceneRef.current.lost) {
        const c = glRef.current;
        if (c && stage) {
          const px = Math.max(1.25, stage.clientWidth / 420);
          const w = Math.max(160, Math.round(stage.clientWidth / px));
          const hh = Math.max(90, Math.round(stage.clientHeight / px));
          if (c.width !== w || c.height !== hh) {
            c.width = w;
            c.height = hh;
          }
        }
        const cue: SceneCue = { phase: at.phase, k: at.k, step, progress: at.phase === 'scene' ? (at.step + at.frac) / Math.max(1, steps.length) : at.phase === 'rotate-in' || at.phase === 'done' ? 1 : 0, time: seconds, dt: pausedRef.current ? 0 : dt * Math.min(speed, 40) };
        sceneRef.current.render(cue, gameCanvas());
      } else {
        const still = stillRef.current;
        if (still) still.style.opacity = String(at.phase === 'flat' ? 0 : at.phase === 'rotate-out' ? at.k : at.phase === 'scene' ? 1 : at.phase === 'rotate-in' ? 1 - at.k : 0);
      }
      if (at.phase === 'done' && !finished.current) {
        finished.current = true;
        cancelAnimationFrame(raf);
        doneRef.current(skipped.current ? 'skipped' : 'played');
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // the loop reads everything through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, steps]);

  // ── the reader follows the step on screen (auto-scroll, calm) ──
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || where.phase !== 'scene') return;
    const el = box.querySelector<HTMLElement>('[data-now="true"]');
    if (!el) return;
    const top = el.offsetTop - box.clientHeight * 0.38 + el.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: env.reduced || speed > 1 ? 'auto' : 'smooth' });
  }, [where, env.reduced, speed]);

  // ── controls ──
  const pauseBtn = useRef<HTMLButtonElement>(null);
  const noBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => pauseBtn.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (asking) noBtn.current?.focus({ preventScroll: true });
    else pauseBtn.current?.focus({ preventScroll: true });
  }, [asking]);
  const skip = useCallback(() => {
    setAsking(false);
    if (finished.current) return;
    skipped.current = true;
    skipJump.current = true;
    log('skip');
    const at = locate(timeline, steps, clock.current);
    if (at.phase !== 'rotate-in' && at.phase !== 'done') clock.current = timeline.flat + timeline.out + timeline.scene;
    setPaused(false);
  }, [timeline, steps, log]);
  useEffect(() => {
    const kd = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const onButton = e.target instanceof HTMLElement && !!e.target.closest('button');
      if (askingRef.current) {
        if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') setAsking(false);
        return;
      }
      if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') setAsking(true);
      else if (!onButton && (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === 'p' || e.key === 'P')) setPaused((p) => !p);
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, []);

  if (!content) return null;
  const cur = where.step >= 0 && where.step < steps.length ? steps[where.step] : undefined;
  const verseNow = cur?.kind === 'pada' ? cur.verse : where.phase === 'rotate-in' || where.phase === 'done' ? content.verses.length : 0;
  const n = (x: number): ReactNode => (ui.isSa ? <SaText>{toDevaDigits(String(x))}</SaText> : String(x));
  const total31 = content.verses.length;
  const live = cur?.kind === 'pada' && cur.pada === 0 ? content.verses[cur.verse - 1] : null;
  return (
    <div
      ref={rootRef}
      className={cx('g-ramayana-yatra__cs', `is-${mode}`, paused && 'is-paused')}
      role="dialog"
      aria-modal="true"
      aria-label={cs.plain(content.ui['title'])}
      data-testid="cutscene"
      data-mode={mode}
      data-phase={where.phase}
      data-replay={replay ? 'true' : 'false'}
    >
      <div ref={stageRef} className="g-ramayana-yatra__cs-stage" aria-hidden="true">
        <canvas ref={frameCopyRef} className="g-ramayana-yatra__cs-copy" width={320} height={180} />
        <canvas ref={stillRef} className="g-ramayana-yatra__cs-still" width={320} height={180} style={{ opacity: 0 }} />
        {glOk ? <canvas ref={glRef} className="g-ramayana-yatra__cs-gl" data-testid="cutscene-gl" /> : null}
      </div>
      <div className="g-ramayana-yatra__cs-reader">
        <div className="g-ramayana-yatra__cs-head">
          <div className="g-ramayana-yatra__cs-title">
            <SaText className="g-ramayana-yatra__cs-name">{content.ui['title']?.sa ?? ''}</SaText>
            <span className="g-ramayana-yatra__cs-count" data-testid="cutscene-count" data-verse={verseNow}>
              {verseNow > 0 ? (
                <>
                  {cs.t(content.ui['verse'], false)} {n(verseNow)} / {n(total31)}
                </>
              ) : (
                <VerseRef kanda={content.reference.kanda} sarga={content.reference.sarga} verse={1} />
              )}
            </span>
          </div>
          <div className="g-ramayana-yatra__cs-ctrl">
            <button ref={pauseBtn} type="button" className="g-ramayana-yatra__cs-btn" onClick={() => setPaused((p) => !p)} aria-pressed={paused} data-testid="cutscene-pause">
              {paused ? cs.t(content.ui['resume'], false) : cs.t(content.ui['pause'], false)}
            </button>
            <button type="button" className="g-ramayana-yatra__cs-btn" onClick={() => setAsking(true)} data-testid="cutscene-skip">
              {cs.t(content.ui['skip'], false)}
            </button>
          </div>
        </div>
        {asking ? (
          <div className="g-ramayana-yatra__cs-ask" role="alertdialog" aria-label={cs.plain(content.ui['skipAsk'])} data-testid="cutscene-ask">
            <span>{cs.t(content.ui['skipAsk'])}</span>
            <button type="button" className="g-ramayana-yatra__cs-btn is-yes" onClick={skip} data-testid="cutscene-skip-yes">
              {cs.t(content.ui['yes'], false)}
            </button>
            <button ref={noBtn} type="button" className="g-ramayana-yatra__cs-btn" onClick={() => setAsking(false)} data-testid="cutscene-skip-no">
              {cs.t(content.ui['no'], false)}
            </button>
          </div>
        ) : null}
        <div ref={scrollRef} className="g-ramayana-yatra__cs-scroll" data-testid="cutscene-text">
          {content.narration.map((line, i) => {
            const now = cur?.kind === 'narration' && cur.index === i;
            const done = (cur?.kind === 'narration' && cur.index > i) || cur?.kind === 'pada' || where.phase === 'rotate-in' || where.phase === 'done';
            return (
              <p key={`n${i}`} className={cx('g-ramayana-yatra__cs-nar', now && 'is-now', done && 'is-done')} data-now={now ? 'true' : undefined} data-step={`narration:${i}`}>
                <SaText nowrap={false}>{line.sa}</SaText>
                <span className="g-ramayana-yatra__cs-en" data-en-ok>
                  {line.en}
                </span>
              </p>
            );
          })}
          {content.verses.map((v) => {
            const isCur = cur?.kind === 'pada' && cur.verse === v.n;
            const past = (cur?.kind === 'pada' && cur.verse > v.n) || where.phase === 'rotate-in' || where.phase === 'done';
            return (
              <section key={v.n} className={cx('g-ramayana-yatra__cs-verse', isCur && 'is-now', past && 'is-done')} data-verse={v.n}>
                <div className="g-ramayana-yatra__cs-vhead">
                  <span className="g-ramayana-yatra__cs-vnum">{n(v.n)}</span>
                  {v.speaker === 'agastya' ? <span className="g-ramayana-yatra__cs-who">{cs.t(content.ui['speaker'], false)}</span> : null}
                </div>
                {v.padas.map((p, i) => {
                  const now = isCur && cur?.kind === 'pada' && cur.pada === i;
                  const done = past || (isCur && cur?.kind === 'pada' && cur.pada > i);
                  return (
                    <div key={i} className={cx('g-ramayana-yatra__cs-pada', now && 'is-now', done && 'is-done')} data-now={now ? 'true' : undefined} data-step={`verse:${v.n}:${i}`}>
                      <SaText shloka nowrap={false}>{p}</SaText>
                    </div>
                  );
                })}
                {isCur ? (
                  <p className="g-ramayana-yatra__cs-en g-ramayana-yatra__cs-tr" data-en-ok data-testid="cutscene-en">
                    {v.en}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
        <p className="g-ramayana-yatra__cs-live" aria-live="polite" data-en-ok>
          {live ? `${live.padas.map((p) => renderSa(p, env.script)).join(' ')} — ${live.en}` : ''}
        </p>
      </div>
    </div>
  );
}

function smoothK(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * The easter egg's door: in the verse book (Menu → श्लोकाः), once the scene has been seen, "आदित्यहृदयम् ▶" plays it again.
 */
export function CutsceneEntry({ save, onPlay, id = 'aditya-hridayam' }: { save: SaveData; onPlay?: ((id: string) => void) | undefined; id?: string }): ReactElement | null {
  const env = useEnv();
  const cs = useCsText();
  const content = cutsceneOf(env.content, id);
  if (!content || !onPlay || !cutsceneSeen(env.content, save.flags, id)) return null;
  return (
    <button type="button" className="g-ramayana-yatra__verse-btn g-ramayana-yatra__cs-entry" onClick={() => onPlay(id)} data-testid="cutscene-replay">
      <span className="g-ramayana-yatra__move-name">
        {cs.t(content.ui['replay'], false)}
        <span className="g-ramayana-yatra__move-meta">
          <VerseRef kanda={content.reference.kanda} sarga={content.reference.sarga} verse={1} />
          {' – '}
          {cs.t({ sa: toDevaDigits(String(content.verses.length)), en: String(content.verses.length) }, false)}
        </span>
      </span>
    </button>
  );
}
