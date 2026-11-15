/**
 * Ramayana-yatra: the player-facing shell of the game (view agent).
 * Owns: content, the title flow (Continue / New journey), GameState + dispatch → reduce, fx
 * (sfx, music, toast, shake, flash, transitions), autosave, the shell HUD, the e2e snapshot and
 * the single ctx.finish. Rendering lives in view-screen (canvas) and view-panel (DOM).
 */
import { type ReactElement, type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '@sdk';
import { Button, SaText, cx, renderSa, useRafLoop } from '@ui';
import { type AudioEngine, createAudio } from './audio';
import { createArt } from './art';
import type { TrackId } from './catalog';
import { loadContent } from './content';
import { HeldDirs, isDir, useGameKeys } from './input';
import { type GuideTarget, currentMap, guideTarget, halfVerseLines, inSight, isWalkable, loadGame, maxHpOf, newGame, nextBookKanda, playerSprite, reduce, sessionResult, setReader, stepInJourney, storyProgress, testFlag, tileAt, toSave, visibleNpcs } from './logic';
import { indexOf } from './logic-util';
import { manifest } from './manifest';
import type { Action, EventCmd, Fx, GameState, JourneyStyle, ToldCutscene } from './types';
import { startScript } from './logic-events';
import { AutoReciteToggle, JourneyPicker, defaultJourney, isKatha, kathaResult, smaranaSummary } from './view-katha';
import { DEFAULT_NAME } from './logic-state';
import { type UiSlots, uiEn, uiSa } from './sa-ui';
import { WordCard, ShlokaCard } from './view-cards';
import { type Buttons, DialogueLangControl, EnvContext, KeysContext, MOVE_STEP_MS, STEP_MS, PlayerName, VerseRef, type ViewEnv, type ViewPrefs, isDefaultName, osReducedMotion, readPrefs, resolveGender, saPlayer, storySa, useEnv } from './view-common';
import { type Detail, Menu, type MenuTab } from './view-menu';
import { Kbd, Panel, type ShrineApi } from './view-panel';
import { BookEnd } from './view-bookend';
import { type BookMark, ZERO_MARK, bookName, saResult } from './bookend';
import { BattleTags, Screen, createAnim } from './view-screen';
import { UiText, useUi } from './view-ui';
import { Markup, StoryLine, markupPlain } from './view-markup';
import { Sheet } from '@ui';
import { cutsceneDue } from './logic-cutscene'; // v0.5b WP-E
import { Cutscene } from './view-cutscene'; // v0.5b WP-E
// v0.6 WP0: the content of the save's journey (Kathā-only parts hidden from the practice game), told cutscenes, the kit
import { journeyContent, restorableIds } from './logic-journey';
import { HotspotLook, ToldCutscene as ToldView } from './view-told';
import { addKitFx } from './view-stage';

const SAVE_KEY = 'save-v1';
/** The e2e snapshot is only built when the shell exposes it (URL has e2e=1); saves work in normal play. */
const E2E = typeof location !== 'undefined' && /[?&]e2e=1\b/.test(`${location.hash}${location.search}`);
const PREFS_KEY = 'prefs-v1';
const NAME_RE = /[^A-Za-z '-]/g;

/** Shrine menu → reducer actions (see notes/core.md for the contract). */
const SHRINE: ShrineApi = { rest: { type: 'choose', index: 0 }, save: { type: 'choose', index: 2 }, leave: { type: 'choose', index: 3 }, study: { type: 'choose', index: 4 } /* SHRINE_STUDY, Kathā only */ };

type Screenname = 'title' | 'new' | 'game';

interface Nav {
  key: string;
  grid: string[];
  shrines: { x: number; y: number }[];
}

/**
 * Map ids from `from` to `to` following warps (BFS; e2e / quest-log helper). Warps whose `requires` fails for the
 * current flags are avoided; if no open route exists, a route through locked warps is returned instead.
 */
function mapRoute(content: ReturnType<typeof loadContent>, from: string, to: string, flags: Record<string, true>): string[] {
  const search = (open: boolean): string[] => {
    if (from === to) return [from];
    const prev = new Map<string, string>([[from, '']]);
    const q = [from];
    while (q.length) {
      const m = q.shift() as string;
      const def = content.maps.find((x) => x.id === m);
      for (const w of def?.warps ?? []) {
        if (prev.has(w.to) || (open && !testFlag(flags, w.requires))) continue;
        prev.set(w.to, m);
        if (w.to === to) {
          const path = [to];
          let c = m;
          while (c) {
            path.unshift(c);
            c = prev.get(c) ?? '';
          }
          return path;
        }
        q.push(w.to);
      }
    }
    return [];
  };
  const r = search(true);
  return r.length ? r : search(false);
}

export default function Game({ ctx }: GameProps): ReactElement {
  const content = useMemo(() => loadContent(), []);
  const art = useMemo(() => createArt(), []);
  const reduced = ctx.settings.reducedMotion || osReducedMotion();
  // prefs-v1 (music, text speed, relaxed, dialogue language) is its own small key, never part of the save
  const [prefs, setPrefsState] = useState<ViewPrefs>(() => readPrefs(ctx.store.get<unknown>(PREFS_KEY, {})));
  const saved = useMemo<GameState | null>(() => {
    try {
      return loadGame(ctx.store.get<unknown>(SAVE_KEY, null), ctx.seed, ctx.level, content);
    } catch (err) {
      console.warn('[ramayana-yatra] could not load the save', err);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [screen, setScreen] = useState<Screenname>('title');
  const [state, setState] = useState<GameState | null>(null);
  // v0.6: what the views read is the content of the save's journey (the practice game never sees Kathā-only verses,
  // words or names; logic-journey). The reducer is given the whole content and applies the same rule itself.
  const style = state?.save.style ?? saved?.save.style;
  const shown = useMemo(() => journeyContent(content, { style }), [content, style]);
  const idx = useMemo(() => indexOf(shown), [shown]);
  const stateRef = useRef<GameState | null>(null);
  const anim = useRef(createAnim()).current;
  const held = useRef(new HeldDirs()).current;
  const keys = useRef<Buttons>({});
  const [menu, setMenu] = useState<{ open: boolean; tab: MenuTab }>({ open: false, tab: 'party' });
  const menuOpen = useRef(false);
  menuOpen.current = menu.open;
  const [detail, setDetail] = useState<Detail>(null);
  // toasts queue up (one reduce can raise several, e.g. a verse heard + an astra equipped in Kathā); each shows 2.4 s
  const [toasts, setToasts] = useState<{ text: string; textSa?: string; n: number }[]>([]);
  const toast = toasts[0] ?? null;
  const [banner, setBanner] = useState<{ mapId: string; n: number } | null>(null);
  const [chapterDone, setChapterDone] = useState<number | null>(null);
  const finished = useRef(false);
  const audio = useRef<AudioEngine | null>(null);
  const musicOverride = useRef<{ track: TrackId | null; mapId: string } | null>(null);
  const [musicTick, setMusicTick] = useState(0);
  const toastN = useRef(0);
  const navCache = useRef<Nav | null>(null);
  const seq = useRef(0);
  /** A save is owed: written at the next calm moment (explore with nothing pending). */
  const dirty = useRef(false);
  /** Kathā: recitation lines answered this session, per verse (the session result reports them). */
  const recited = useRef(new Map<string, number>());
  /** v0.5a: the session counters where the current book began (the book-complete screen shows one book's numbers). */
  const bookMark = useRef<BookMark>(ZERO_MARK);
  /** v0.5a: the book-complete screen is on (no walking, no menu behind it). */
  const bookEndOn = useRef(false);
  /** e2e: the last toasts shown (English), so a test can see one that came and went. */
  const toastLog = useRef<string[]>([]);
  /** v0.5b WP-E: a cutscene replayed from the verse book (its id), and whether any cutscene is on (input waits) */
  const [replay, setReplay] = useState<string | null>(null);
  const cutsceneOn = useRef(false);

  const setPrefs = (p: ViewPrefs): void => {
    setPrefsState(p);
    ctx.store.set(PREFS_KEY, p);
  };
  /** An interface string as plain text in the shown language (Game renders the env provider, so no useUi here). */
  const uiPlainText = (en: string, sa: string | undefined): string => (prefs.dialogueLang !== 'en' && sa ? renderSa(resolveGender(sa, stateRef.current?.save.avatar === 'b' ? 'b' : 'a'), ctx.settings.script) : en);
  const plainKey = (k: 'common.verse' | 'common.word', slots?: UiSlots): string => uiPlainText(uiEn(content, k, slots), uiSa(content, k, slots));

  // ───────── persistence / finish ─────────
  /**
   * Write save-v1. Autosaves only happen at calm moments (explore, nothing pending) or at the very end of
   * the story, so a save never captures a position in the middle of an event. `force` is used only for the
   * story's own {save} / shrine Save pendings (the reducer contract asks the view to write there).
   */
  const persist = useCallback(
    (s: GameState | null = stateRef.current, force = false) => {
      if (!s) return;
      const calmNow = (s.mode === 'explore' && !s.pending) || s.mode === 'ended';
      if (!calmNow && !force) {
        dirty.current = true;
        return;
      }
      dirty.current = false;
      try {
        ctx.store.set(SAVE_KEY, toSave(s));
      } catch (err) {
        console.warn('[ramayana-yatra] save failed', err);
      }
    },
    [ctx],
  );

  // Leaving the page (reload, tab closed, the phone app sent to the background) or the game (shell ✕): write the
  // save too, so steps walked since the last autosave are kept. Same calm-only rule (mid-event → nothing written).
  // Autosave alone reacts to events, battles and map changes, so a reload used to put the player back at the last of
  // those (fx-full, v0.4.3; e2e "a hard reload mid-chapter resumes the save").
  useEffect(() => {
    const keep = (): void => persist(stateRef.current);
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') keep();
    };
    window.addEventListener('pagehide', keep);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', keep);
      document.removeEventListener('visibilitychange', onHidden);
      keep();
    };
  }, [persist]);

  const finish = useCallback(() => {
    const s = stateRef.current;
    if (finished.current || !s) return;
    finished.current = true;
    persist(s);
    setMenu((m) => ({ ...m, open: false }));
    ctx.hud({ timeLeftMs: undefined });
    const base = sessionResult(s, content);
    // Kathā: verses heard / lines recited / verses restored instead of a correct/total line with ✗ (same contract)
    const result = isKatha(s.save) ? kathaResult(base, s, content, recited.current) : base;
    // v0.5a: a reader of संस्कृतम् gets the game-provided strings (summary, share, review rows) in Sanskrit, in the
    // player's script; the shell's own headings and buttons stay platform English
    ctx.finish(s.save.reader === 'sa' ? saResult(result, s, content, isKatha(s.save), recited.current, (t) => renderSa(t, ctx.settings.script)) : result);
  }, [ctx, content, persist]);

  /** `textSa`: the Sambhāṣaṇa version (a logic toast's textSa, or useUi().sa(key) for a view toast). */
  const showToast = useCallback((text: string, textSa?: string) => {
    toastN.current += 1;
    const n = toastN.current;
    if (E2E) toastLog.current = [...toastLog.current, text].slice(-12);
    // the same text twice in a row shows once; at most four wait (the oldest waiting one gives way)
    setToasts((q) => (q.length && q[q.length - 1]?.text === text ? q : [...q, { text, textSa, n }].slice(-5)));
  }, []);

  // ───────── fx ─────────
  const handleFx = useCallback(
    (fx: Fx[], s: GameState) => {
      const now = performance.now();
      for (const f of fx) {
        switch (f.kind) {
          case 'sfx':
            ctx.sfx(f.name);
            break;
          case 'music':
            musicOverride.current = { track: f.track, mapId: s.save.mapId };
            setMusicTick((n) => n + 1);
            break;
          case 'toast':
            showToast(f.text, f.textSa);
            break;
          case 'shake':
            anim.shakeAt = now;
            ctx.haptic('medium');
            break;
          case 'flash':
            anim.flashAt = now;
            break;
          case 'encounter':
            anim.encounterAt = now;
            ctx.haptic('light');
            break;
          case 'bump':
            anim.bumpAt = now;
            break;
          case 'warp':
            anim.warpAt = now;
            break;
          case 'kit':
            // v0.6: the effects kit's timed effects on the map (view-screen draws them; reduced-motion paths there)
            addKitFx(anim.kit, { name: f.name, ms: f.ms, ...(f.at ? { rect: f.at } : {}), ...(f.path ? { path: f.path } : {}) }, now);
            if (f.name === 'shake') ctx.haptic('medium');
            if (E2E) {
              const w = window as unknown as { __ryKitLog?: string[] };
              (w.__ryKitLog ??= []).push(f.name);
            }
            break;
        }
      }
    },
    [ctx, anim, showToast],
  );

  const commit = useCallback(
    (next: GameState, prev: GameState | null) => {
      stateRef.current = next;
      seq.current += 1;
      setState(next);
      handleFx(next.fx, next);
      // autosave policy: after any event, battle or map change, save once things are calm again
      if (!prev || prev.mode !== next.mode || prev.save.mapId !== next.save.mapId) dirty.current = true;
      if (prev && next.save.completedChapters.length > prev.save.completedChapters.length) {
        dirty.current = true; // written at the next calm moment, never mid-event
        const k = next.save.completedChapters[next.save.completedChapters.length - 1];
        if (k !== undefined) setChapterDone(k);
      }
      if (prev && prev.mode !== 'ended' && next.mode === 'ended') persist(next);
      else if (dirty.current && next.mode === 'explore' && !next.pending) persist(next);
      if (prev && prev.save.mapId !== next.save.mapId) setBanner({ mapId: next.save.mapId, n: performance.now() });
    },
    [handleFx, persist],
  );

  const dispatch = useCallback(
    (a: Action) => {
      const s = stateRef.current;
      if (!s || finished.current) return;
      let next: GameState;
      try {
        next = reduce(s, content, a);
      } catch (err) {
        console.warn('[ramayana-yatra] reduce failed', a, err);
        showToast(uiEn(content, 'hud.error'), uiSa(content, 'hud.error'));
        return;
      }
      if (next === s) return;
      // Kathā: a recitation line was answered (a cast, a duel turn or a shrine pāda)
      const sm = s.pending?.kind === 'challenge' && a.type === 'answer' ? s.pending.challenge.smarana : undefined;
      if (sm) recited.current.set(sm.shlokaId, (recited.current.get(sm.shlokaId) ?? 0) + 1);
      commit(next, s);
    },
    [content, commit, showToast],
  );

  // ───────── e2e only (v0.5b): run an ad-hoc script from a calm moment ─────────
  // `window.__ryScript(cmds)` (only with ?e2e=1): the packages' browser tests reach a set piece's panel (a story
  // recitation, a book review, Nala's bridge, …) before its story content exists. Ignored unless free exploration.
  useEffect(() => {
    if (!E2E) return;
    const w = window as unknown as { __ryScript?: (cmds: EventCmd[]) => boolean; __ryTold?: (c: ToldCutscene) => boolean };
    w.__ryScript = (cmds) => {
      const s = stateRef.current;
      if (!s || s.mode !== 'explore' || s.pending || !Array.isArray(cmds)) return false;
      commit(startScript(s, content, 'e2e.script', cmds), s);
      return true;
    };
    // v0.6 (e2e only): register a told cutscene at run time (a package's scene before its JSON is final; WP0's tests)
    w.__ryTold = (c) => {
      if (!c || typeof c.id !== 'string' || !Array.isArray(c.steps)) return false;
      const list = (content.cutscenes ??= []);
      const i = list.findIndex((x) => x.id === c.id);
      if (i >= 0) list[i] = c;
      else list.push(c);
      return true;
    };
    return () => {
      delete w.__ryScript;
      delete w.__ryTold;
    };
  }, [commit, content]);

  // ───────── start / continue ─────────
  const begin = (s: GameState): void => {
    audio.current?.unlock();
    stateRef.current = null;
    // v0.4.3: the logic knows how the player reads (save.reader ← the story-text language) from the first moment
    commit(setReader(s, prefs.dialogueLang), null);
    setBanner({ mapId: s.save.mapId, n: performance.now() });
    setScreen('game');
  };
  const startNew = (name: string, avatar: 'a' | 'b', style: JourneyStyle): void => {
    try {
      const opts = { name, avatar, style };
      begin(newGame(ctx.seed, ctx.level, content, opts));
    } catch (err) {
      console.warn('[ramayana-yatra] newGame failed', err);
      showToast(uiEn(content, 'newGame.notReady'), uiSa(content, 'newGame.notReady'));
    }
  };

  // the story-text language changed (Settings, or a save that was loaded): the reader level follows it (v0.4.3)
  const dialogueLang = prefs.dialogueLang;
  useEffect(() => {
    const s = stateRef.current;
    if (s && (s.save.reader ?? 'en') !== dialogueLang) dispatch({ type: 'set-reader', reader: dialogueLang });
  }, [dialogueLang, state, dispatch]);

  // ───────── movement loop ─────────
  const tryStep = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.mode !== 'explore' || s.pending || menuOpen.current || finished.current || bookEndOn.current || cutsceneOn.current) {
      // leaving free exploration forgets held directions (keys re-press through autorepeat; the pad is gone)
      held.clear();
      return;
    }
    const now = performance.now();
    if (now < anim.busyUntil) return;
    const d = held.current();
    if (!d) return;
    held.queued = null;
    anim.stepMs = held.running ? Math.round(STEP_MS * 0.6) : STEP_MS;
    anim.busyUntil = now + (reduced ? (held.running ? 80 : 120) : anim.stepMs);
    dispatch({ type: 'step', dir: d });
  }, [anim, held, reduced, dispatch]);
  useRafLoop(tryStep, screen === 'game');

  // a pointer lifted anywhere releases pad-held directions (the pad may have unmounted mid-press)
  useEffect(() => {
    const up = (): void => held.releasePointer();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [held]);

  // ───────── keyboard ─────────
  useGameKeys(
    (b, repeat) => {
      audio.current?.unlock();
      if (cutsceneOn.current) return; // v0.5b WP-E: the cutscene takes its own keys (pause, skip)
      if (menuOpen.current || detail) {
        if (repeat) return;
        if (b === 'menu') setMenu((m) => ({ ...m, open: false }));
        else if (b === 'b' && detail) setDetail(null); // back one level (Esc is handled by the sheet)
        return;
      }
      if (isDir(b)) {
        held.press(b);
        tryStep();
        return;
      }
      if (b === 'b') held.running = true;
      if (repeat) return;
      const s = stateRef.current;
      if (b === 'menu') {
        if (s && s.mode === 'explore' && !s.pending && !bookEndOn.current) setMenu((m) => ({ ...m, open: true }));
        return;
      }
      if (b === 'a') keys.current.a?.();
      else if (b === 'b') keys.current.b?.();
      else keys.current.num?.(Number(b));
    },
    (b) => {
      if (isDir(b)) held.release(b);
      if (b === 'b') held.running = false;
    },
    screen === 'game',
  );

  // ───────── auto pendings: wait / fade / move ─────────
  const pending = state?.pending ?? null;
  useEffect(() => {
    const p = pending;
    if (!p) return;
    let ms = -1;
    if (p.kind === 'wait') ms = reduced ? Math.min(p.ms, 150) : p.ms;
    else if (p.kind === 'fade') ms = reduced ? 60 : 380;
    else if (p.kind === 'move') ms = reduced ? 60 : p.path.length * MOVE_STEP_MS + 60;
    // v0.6: a hidden moment passes by itself after its window (the same with reduced motion: it is a chance to look)
    else if (p.kind === 'hotspot') ms = p.ms;
    if (ms < 0) return;
    const t = setTimeout(() => {
      if (stateRef.current?.pending === p) dispatch({ type: 'advance' });
    }, ms);
    return () => clearTimeout(t);
  }, [pending, reduced, dispatch]);

  // last dialogue line, echoed while wait / move / fade play (no flicker between lines)
  const echoRef = useRef<Extract<NonNullable<GameState['pending']>, { kind: 'say' }> | null>(null);
  if (pending?.kind === 'say') echoRef.current = pending;
  else if (!pending || !['wait', 'move', 'fade', 'hotspot', 'cutscene'].includes(pending.kind)) echoRef.current = null;

  // ───────── screen reader: dialogue and beats ─────────
  const sayText = pending?.kind === 'say' ? pending.text : pending?.kind === 'battle' ? (state?.battle?.beats[0]?.text ?? null) : null;
  const sayLang = prefs.dialogueLang;
  useEffect(() => {
    if (!sayText) return;
    const penv = { idx, script: ctx.settings.script, playerName: stateRef.current?.save.playerName ?? '' };
    const av = stateRef.current?.save.avatar === 'b' ? 'b' : 'a';
    const beatSa = pending?.kind === 'battle' ? stateRef.current?.battle?.beats[0]?.textSa : undefined;
    const sa = sayLang !== 'en' && beatSa ? saPlayer(resolveGender(beatSa, av), penv.playerName, av) : storySa(content, sayLang, sayText, av, penv.playerName);
    const en = markupPlain(sayText, penv);
    ctx.announce(!sa ? en : sayLang === 'sa-en' ? `${markupPlain(sa, penv, true)} (${en})` : markupPlain(sa, penv, true));
  }, [sayText, sayLang, ctx, idx, content, pending]);

  // ───────── play time ─────────
  useEffect(() => {
    if (screen !== 'game') return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s || document.hidden || finished.current) return;
      try {
        const next = reduce(s, content, { type: 'tick', ms: 5000 });
        if (next !== s) {
          stateRef.current = next;
          setState(next);
        }
      } catch {
        /* tick is optional */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [screen, content]);

  // ───────── toasts / banners ─────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToasts((q) => (q[0]?.n === toast.n ? q.slice(1) : q)), 2400);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 2400);
    return () => clearTimeout(t);
  }, [banner]);

  // ───────── v0.5b WP-E: a cutscene due in this battle (logic-cutscene), or a replay from the verse book ─────────
  const dueScene = useMemo(() => (state && screen === 'game' ? cutsceneDue(state, content) : null), [state, screen, content]);
  const scene = dueScene ?? replay;
  // v0.6: a told cutscene pending in the story (logic-told), or one replayed from the verse book
  const [toldReplay, setToldReplay] = useState<string | null>(null);
  const toldDue = screen === 'game' && state?.pending?.kind === 'cutscene' ? state.pending.id : null;
  const told = toldDue ?? toldReplay;
  cutsceneOn.current = !!scene || !!told;

  // ───────── audio ─────────
  useEffect(() => {
    if (!ctx.settings.sound) return;
    const a = createAudio();
    audio.current = a;
    a.setEnabled(prefs.music);
    return () => {
      a.dispose();
      audio.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    audio.current?.setEnabled(ctx.settings.sound && prefs.music);
  }, [prefs.music, ctx.settings.sound]);
  const track: TrackId | null = useMemo(() => {
    if (screen !== 'game' || !state) return 'title';
    if (scene) return 'shloka'; // v0.5b WP-E: the cutscene's quiet drone (the existing verse track; follows mute / music)
    if (state.mode === 'ended') return 'ending';
    if (state.mode === 'battle' && state.battle) return state.battle.spec.music;
    const o = musicOverride.current;
    if (o && o.mapId === state.save.mapId) return o.track;
    try {
      return currentMap(state, content).music;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, state?.mode, state?.battle?.spec, state?.save.mapId, musicTick, content, scene]);
  useEffect(() => {
    audio.current?.play(track);
  }, [track]);

  // ───────── HUD ─────────
  const onTimeLeft = useCallback((ms: number | undefined) => ctx.hud({ timeLeftMs: ms }), [ctx]);
  const hudLang = prefs.dialogueLang;
  useEffect(() => {
    if (!state) {
      // the shell already shows the Sanskrit title: संस्कृतम् adds no English subtitle
      ctx.hud({ label: hudLang === 'sa' ? '' : manifest.title.en });
      return;
    }
    const k = state.save.chapter;
    const n = idx.name.get(`kanda.${k}`);
    const restored = Object.values(state.save.shlokas).filter((x) => x.restored).length;
    let progress = 0;
    try {
      progress = storyProgress(state, content);
    } catch {
      progress = 0;
    }
    // v0.6: restored counts against the restorable verses (a v0.6 verse is heard only: logic-journey)
    const slots: UiSlots = { book: { en: n?.en ?? uiEn(content, 'hud.book', { k }), sa: n?.sa ?? uiSa(content, 'hud.book', { k }) ?? '' }, n: restored, total: restorableIds(shown).length };
    ctx.hud({ progress, label: uiPlainText(uiEn(content, 'hud.label', slots), uiSa(content, 'hud.label', slots)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ctx, idx, content, shown, hudLang]);

  // ───────── map pointer ("Show the way", v0.4.2) ─────────
  // View-only: derived from the save (memoized per save object in logic-guide), never stored. Shown only in free
  // exploration (no dialogue, verse moment, battle, menu, word/verse sheet or chapter card) and when the setting is on.
  const guide = useMemo<GuideTarget | null>(() => {
    if (screen !== 'game' || !state) return null;
    try {
      return guideTarget(state, content);
    } catch (err) {
      console.warn('[ramayana-yatra] guide', err);
      return null;
    }
    // it depends only on the save (and the ending): not on every state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, state?.save, state?.mode === 'ended', content]);
  const guideShown = !!guide && prefs.showWay && !!state && state.mode === 'explore' && !state.pending && !menu.open && !detail && chapterDone === null;
  const guideRef = useRef<GuideTarget | null>(null);
  guideRef.current = guideShown ? guide : null;

  // ───────── e2e snapshot ─────────
  const nav = (s: GameState): Nav | null => {
    try {
      const map = currentMap(s, content);
      const key = `${map.id}|${Object.keys(s.save.flags).sort().join(',')}|${JSON.stringify(s.save.npcPos)}`;
      if (navCache.current?.key === key) return navCache.current;
      const grid: string[] = [];
      const shrines: { x: number; y: number }[] = [];
      // without the player: the grid is cached across steps, so the tile they stood on must not stay '#'
      const away = { ...s, save: { ...s.save, x: -1, y: -1 } };
      for (let y = 0; y < map.height; y++) {
        let row = '';
        for (let x = 0; x < map.width; x++) {
          // v0.5b P3: a guard's line of sight (an active avoid-trigger) is '#' too: the bots keep out of it
          row += isWalkable(away, content, x, y) && !inSight(map, s.save.flags, x, y) ? '.' : '#';
          const t = tileAt(map, x, y);
          if (t.ground === 'shrine' || t.overlay === 'shrine') shrines.push({ x, y });
        }
        grid.push(row);
      }
      navCache.current = { key, grid, shrines };
      return navCache.current;
    } catch {
      return null;
    }
  };
  useEffect(() => {
    if (!E2E) return;
    const s = state;
    const p = s?.pending ?? null;
    const phase = screen !== 'game' || !s ? 'title' : s.mode === 'ended' ? 'ended' : s.mode === 'battle' ? 'battle' : s.mode === 'script' ? 'script' : 'explore';
    const ch = p?.kind === 'challenge' ? p.challenge : null;
    let map: ReturnType<typeof currentMap> | null = null;
    try {
      map = s ? currentMap(s, content) : null;
    } catch {
      map = null;
    }
    const n = s ? nav(s) : null;
    // v0.5b: the first step of the save's journey not done (a Kathā-only step is skipped in the practice game)
    const next = s ? content.walkthrough.find((w) => stepInJourney(w, s.save) && !s.save.flags[w.expectFlag]) ?? null : null;
    ctx.expose({
      seq: seq.current,
      phase,
      screen,
      canContinue: !!saved,
      pending: p?.kind ?? null,
      say: p?.kind === 'say' ? p.text : null,
      map: s?.save.mapId ?? null,
      x: s?.save.x ?? null,
      y: s?.save.y ?? null,
      facing: s?.save.facing ?? null,
      objective: s?.save.objective ?? null,
      chapter: s?.save.chapter ?? null,
      challenge: ch ? { id: ch.id, kind: ch.kind, lexIds: ch.lexIds, answers: ch.answers ?? [], orders: ch.orders ?? [], optionIds: (ch.options ?? []).map((o) => o.id), tiles: ch.tiles?.length ?? 0, context: p?.kind === 'challenge' ? p.context : null, step: p?.kind === 'challenge' ? (p.step ?? null) : null, steps: p?.kind === 'challenge' ? (p.steps ?? null) : null, smarana: smaranaSummary(ch) } : null,
      style: s?.save.style ?? null,
      reader: s?.save.reader ?? null,
      autoRecite: prefs.autoRecite,
      smrti: s?.save.smrti ?? null,
      feedback: p?.kind === 'feedback' ? { correct: p.result.correct } : null,
      choice: p?.kind === 'choice' ? { options: p.options.length, prompt: p.prompt ?? null } : null,
      shloka: p?.kind === 'shloka' ? p.shlokaId : null,
      battle: s?.battle ? { phase: s.battle.phase, allyHp: s.battle.ally.hp, allyMax: s.battle.ally.maxHp, foeHp: s.battle.foe.hp, foe: s.battle.foe.id, kind: s.battle.spec.kind, beats: s.battle.beats.length, canRun: s.battle.spec.canRun, moves: s.battle.ally.moves } : null,
      restored: s ? Object.keys(s.save.shlokas).filter((k) => s.save.shlokas[k]?.restored) : [],
      heard: s ? Object.keys(s.save.shlokas).filter((k) => s.save.shlokas[k]?.heard) : [],
      party: s ? s.save.party.map((m) => ({ id: m.id, hp: m.hp, maxHp: maxHpOf(m, content), level: m.level })) : [],
      items: s ? Object.values(s.save.items).reduce((a, b) => a + b, 0) : 0,
      flags: s ? Object.keys(s.save.flags) : [],
      menu: menu.open,
      dialogueLang: prefs.dialogueLang,
      chapterDone,
      // v0.5a: the book-complete screen (and the book "continue" would open), or null
      bookEnd: chapterDone !== null && s && s.mode === 'explore' && !s.pending ? { kanda: chapterDone, next: nextBookKanda(s) } : null,
      toasts: toastLog.current,
      recited: Object.fromEntries(recited.current),
      npcs: s && map ? visibleNpcs(s, content).map((np) => ({ id: np.id, x: np.x, y: np.y, event: np.event })) : [],
      warps: map ? map.warps.map((w) => ({ x: w.x, y: w.y, to: w.to, open: s ? testFlag(s.save.flags, w.requires) : true })) : [],
      grid: n?.grid ?? [],
      shrines: n?.shrines ?? [],
      next,
      route: s && next ? mapRoute(content, s.save.mapId, next.map, s.save.flags) : [],
      // v0.4.2: where the map pointer points (null after the ending), and whether it is on screen now
      guide: guide ? { kind: guide.kind, map: guide.map, x: guide.x, y: guide.y, to: guide.to ?? null, npc: guide.npc ?? null, recite: guide.recite ?? null, step: guide.step, goal: guide.goal, distance: guide.distance } : null,
      guideShown,
      showWay: prefs.showWay,
      // ── v0.5b (notes/v05b-plan.md §1) ──
      // P4: the sprite the player walks as ('hanuman' in Kathā book 5 with katha.hanuman, else the avatar's)
      playerSprite: s ? playerSprite(s.save) : null,
      // P2: the book under review (pending 'book'), else null
      book: p?.kind === 'book' ? p.kanda : null,
      // P5: Nala's bridge (pending 'setu'): the stones, the solution (the e2e bot taps toward it), taps, Nala's hint
      setu: p?.kind === 'setu' ? { tag: p.tag, cols: p.cols, turns: p.turns, cells: p.cells, solution: p.solution, taps: p.taps, hint: p.hint } : null,
      // WP-E: the cutscene on screen (due in this battle, or a replay from the verse book), else null
      cutscene: scene ? { id: scene, replay: !dueScene } : null,
      // ── v0.6 (notes/v06-wp0.md) ──
      // a told cutscene on screen (pending in the story, or a replay from the verse book), else null
      told: told ? { id: told, replay: !toldDue } : null,
      // the effects kit's stage while a script runs (who lies down, scales, props, tint), else null
      stage: s?.stage ? { down: s.stage.down, scale: s.stage.scale, props: s.stage.props, tint: s.stage.tint ?? null } : null,
      // a hidden moment waiting on the map (pending 'hotspot'), else null
      hotspot: p?.kind === 'hotspot' ? { x: p.x, y: p.y, ms: p.ms } : null,
      // the kit's timed effects fired so far (names, newest last)
      kitLog: ((window as unknown as { __ryKitLog?: string[] }).__ryKitLog ?? []).slice(-20),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, screen, menu.open, chapterDone, ctx, content, saved, prefs.dialogueLang, prefs.autoRecite, prefs.showWay, toast, guide, guideShown, scene, told]);

  // ───────── env ─────────
  const openWord = useCallback((id: string, form?: string) => setDetail({ kind: 'word', id, form }), []);
  const openShloka = useCallback((id: string) => setDetail({ kind: 'shloka', id }), []);
  const env: ViewEnv = useMemo(
    () => ({
      content: shown,
      idx,
      art,
      script: ctx.settings.script,
      level: ctx.level,
      reduced,
      prefs,
      playerName: state?.save.playerName ?? '',
      avatar: state?.save.avatar === 'b' ? 'b' : 'a',
      openWord,
      openShloka,
      setPrefs,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, idx, art, ctx.settings.script, ctx.level, reduced, prefs, state?.save.playerName, state?.save.avatar, openWord, openShloka],
  );

  const calm = !!state && state.mode === 'explore' && !state.pending;
  const showChapterDone = chapterDone !== null && calm && state?.mode !== 'ended';
  bookEndOn.current = showChapterDone;
  useEffect(() => {
    if (!showChapterDone || chapterDone === null) return;
    persist();
    // screen reader: the book-complete screen is a dialog; say what it is once
    const b = bookName(content, chapterDone);
    const slots: UiSlots = { book: { en: b.en, sa: b.saPada } };
    ctx.announce(uiPlainText(uiEn(content, 'bookEnd.title', slots), uiSa(content, 'bookEnd.title', slots)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChapterDone, chapterDone, persist]);
  const recitedNow = (): number => [...recited.current.values()].reduce((a, b) => a + b, 0);
  /**
   * v0.5a, the book-complete screen's "continue": the story goes on in this session, straight into the next book's
   * opening (logic `next-book`); the next book's numbers start from here. No ctx.finish.
   */
  const continueBook = useCallback(() => {
    const s = stateRef.current;
    if (!s || finished.current) return;
    bookMark.current = { recited: [...recited.current.values()].reduce((a, b) => a + b, 0), correct: s.session.correct, total: s.session.total };
    setChapterDone(null);
    bookEndOn.current = false;
    dispatch({ type: 'next-book' });
  }, [dispatch]);

  const openMenu = useCallback((tab?: string) => {
    audio.current?.unlock();
    setMenu((m) => ({ open: true, tab: (tab as MenuTab) ?? m.tab }));
  }, []);

  const bannerName = banner ? idx.name.get(idx.map.get(banner.mapId)?.nameId ?? '') : undefined;
  const overlay = (
    <>
      {banner && bannerName && state?.pending?.kind !== 'title' ? (
        <div key={banner.n} className="g-ramayana-yatra__banner" data-testid="place-banner">
          <SaText>{bannerName.sa}</SaText>
          {prefs.dialogueLang !== 'sa' ? <span className="g-ramayana-yatra__en">{bannerName.en}</span> : null}
        </div>
      ) : null}
      {state?.pending?.kind === 'title' && idx.name.get(state.pending.nameId) ? (
        <div className="g-ramayana-yatra__curtain" aria-hidden="true">
          <SaText as="div" shloka className="g-ramayana-yatra__curtain-sa">
            {idx.name.get(state.pending.nameId)?.sa ?? ''}
          </SaText>
          {prefs.dialogueLang !== 'sa' ? <div className="g-ramayana-yatra__curtain-en">{idx.name.get(state.pending.nameId)?.en ?? ''}</div> : null}
        </div>
      ) : null}
      {state?.mode === 'battle' && state.battle && prefs.dialogueLang !== 'en' ? <BattleTags state={state} /> : null}
      {state?.pending?.kind === 'hotspot' ? <HotspotLook onLook={() => dispatch({ type: 'choose', index: 0 })} /> : null}
      {toast ? (
        <div key={toast.n} className="g-ramayana-yatra__toast" role="status" data-testid="toast">
          <StoryLine en={toast.text} sa={toast.textSa} />
        </div>
      ) : null}
    </>
  );

  return (
    <div className={cx('sk-stage g-ramayana-yatra', reduced && 'is-reduced')} onPointerDown={() => audio.current?.unlock()} data-screen={screen}>
      <EnvContext.Provider value={env}>
        <KeysContext.Provider value={keys}>
          {screen === 'game' && state ? (
            <div className={cx('g-ramayana-yatra__frame', showChapterDone && 'is-bookend', (scene || told) && 'is-cutscene')}>
              <Screen stateRef={stateRef} env={env} anim={anim} overlay={overlay} guideRef={guideRef} onSwipe={(d) => {
                held.queued = d;
                tryStep();
              }} />
              <div className={cx('g-ramayana-yatra__panel', `is-${state.pending?.kind ?? state.mode}`)} data-testid="panel">
                {showChapterDone || scene || told ? null : <Panel state={state} dispatch={dispatch} held={held} kick={tryStep} openMenu={openMenu} onTimeLeft={onTimeLeft} onSave={() => {
                persist(stateRef.current, true);
                dirty.current = true; // and again once the event has finished
              }} onFinish={finish} shrine={SHRINE} echo={echoRef.current} recited={recited.current} />}
              </div>
              {scene ? (
                // v0.5b WP-E: the Āditya-hṛdayam cutscene over the battle (the panel waits); a replay returns to the verse book
                <Cutscene
                  key={`${scene}:${dueScene ? 'due' : 'replay'}`}
                  id={scene}
                  replay={!dueScene}
                  onDone={() => {
                    if (dueScene) dispatch({ type: 'cutscene-done', id: dueScene });
                    else {
                      setReplay(null);
                      setMenu({ open: true, tab: 'verses' });
                    }
                  }}
                />
              ) : null}
              {told && !scene ? (
                // v0.6 WP0: a told cutscene over the frame (the panel waits); a replay returns to the verse book
                <ToldView
                  key={`${told}:${toldDue ? 'due' : 'replay'}`}
                  id={told}
                  replay={!toldDue}
                  onDone={(r) => {
                    if (toldDue) dispatch({ type: 'cutscene-done', id: toldDue, found: r.found, answers: r.answers });
                    else {
                      setToldReplay(null);
                      setMenu({ open: true, tab: 'verses' });
                    }
                  }}
                />
              ) : null}
              {showChapterDone && chapterDone !== null ? (
                <BookEnd kanda={chapterDone} state={state} mark={bookMark.current} recitedNow={recitedNow()} onNext={nextBookKanda(state) === chapterDone + 1 ? continueBook : null} onStop={finish} />
              ) : null}
              <Menu
                open={menu.open}
                tab={menu.tab}
                setTab={(tab) => setMenu({ open: true, tab })}
                onClose={() => {
                  setMenu((m) => ({ ...m, open: false }));
                  setDetail(null);
                }}
                state={state}
                dispatch={dispatch}
                detail={menu.open ? detail : null}
                setDetail={setDetail}
                prefs={prefs}
                setPrefs={setPrefs}
                soundOn={ctx.settings.sound}
                onSave={() => {
                  persist();
                  showToast(uiEn(content, 'menu.saved'), uiSa(content, 'menu.saved'));
                  setMenu((m) => ({ ...m, open: false }));
                }}
                onRest={finish}
                canUseItems={calm}
                onCutscene={(id) => {
                  // v0.5b WP-E: replay from the verse book (the menu closes; it opens again on श्लोकाः when the scene ends)
                  setDetail(null);
                  setMenu((m) => ({ ...m, open: false }));
                  setReplay(id);
                }}
                onTold={(id) => {
                  // v0.6: a told cutscene seen before, replayed from the verse book (same way back)
                  setDetail(null);
                  setMenu((m) => ({ ...m, open: false }));
                  setToldReplay(id);
                }}
              />
              <Sheet title={detail?.kind === 'shloka' ? plainKey('common.verse') : plainKey('common.word')} open={!menu.open && detail !== null} onClose={() => setDetail(null)} data-testid="detail-sheet">
                {detail?.kind === 'word' ? <WordCard lexId={detail.id} save={state.save} highlight={detail.form} /> : detail?.kind === 'shloka' ? <ShlokaCard id={detail.id} save={state.save} /> : null}
              </Sheet>
            </div>
          ) : (
            <TitleFlow screen={screen} setScreen={setScreen} saved={saved} env={env} stateRef={stateRef} anim={anim} overlay={overlay} onContinue={() => saved && begin(saved)} onStart={startNew} prefs={prefs} setPrefs={setPrefs} />
          )}
        </KeysContext.Provider>
      </EnvContext.Provider>
    </div>
  );
}

// ───────────────────────── title flow ─────────────────────────

interface TitleProps {
  screen: Screenname;
  setScreen: (s: Screenname) => void;
  saved: GameState | null;
  env: ViewEnv;
  stateRef: RefObject<GameState | null>;
  anim: ReturnType<typeof createAnim>;
  overlay: ReactElement;
  onContinue: () => void;
  onStart: (name: string, avatar: 'a' | 'b', style: JourneyStyle) => void;
  prefs: ViewPrefs;
  setPrefs: (p: ViewPrefs) => void;
}

/**
 * The first verse (book 1, 1.2.15) as a quiet epigraph on the title screen, straight from the content. Each half-verse
 * is shown as printed (halfVerseLines: tvamagamaḥ, not the learner split tvam agamaḥ; QA 11 Nov).
 */
function FirstVerse(): ReactElement | null {
  const env = useEnv();
  const sh = env.idx.shloka.get('s-ma-nishada');
  if (!sh) return null;
  const [first = '', second = ''] = halfVerseLines(sh);
  return (
    <figure className="g-ramayana-yatra__epigraph" data-testid="title-verse">
      <SaText as="div" shloka nowrap={false}>
        {first}
      </SaText>
      <SaText as="div" shloka nowrap={false}>
        {second}
      </SaText>
      <figcaption>
        <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} /> · <UiText k="title.firstVerse" gloss={false} />
      </figcaption>
    </figure>
  );
}

/** Play time "1h 5m" / "5m" (Sanskrit: होराः १ · निमेषाः ५). */
function PlayTime({ ms }: { ms: number }): ReactElement {
  const ui = useUi();
  const m = Math.floor(ms / 60000);
  return <>{m >= 60 ? ui.t('title.playH', { h: Math.floor(m / 60), m: m % 60 }, { gloss: false }) : ui.t('title.playM', { m }, { gloss: false })}</>;
}

function TitleFlow({ screen, setScreen, saved, env, stateRef, anim, overlay, onContinue, onStart, prefs, setPrefs }: TitleProps): ReactElement {
  // the name state keeps the English default ('Shishya'); Sanskrit modes show it as शिष्यः / शिष्या (see NewJourney)
  const [name, setName] = useState(DEFAULT_NAME);
  const [avatar, setAvatar] = useState<'a' | 'b'>('a');
  const [confirm, setConfirm] = useState(false);
  // the journey style the player picked (null: follow the story-text language, defaultJourney)
  const [style, setStyle] = useState<JourneyStyle | null>(null);
  // the picker on the New-journey screen changes prefs at once, so this screen follows the chosen language immediately
  const titleEnv = useMemo(() => ({ ...env, avatar }), [env, avatar]);
  return (
    <EnvContext.Provider value={titleEnv}>
      <div className="g-ramayana-yatra__frame g-ramayana-yatra__frame--title">
        <Screen
          stateRef={stateRef}
          env={titleEnv}
          anim={anim}
          title
          overlay={
            <>
              <div className="g-ramayana-yatra__logo">
                <SaText as="div" shloka className="g-ramayana-yatra__logo-sa">
                  {manifest.title.sa}
                </SaText>
                {prefs.dialogueLang !== 'sa' ? <div className="g-ramayana-yatra__logo-en">{manifest.title.en}</div> : null}
              </div>
              {overlay}
            </>
          }
        />
        <div className="g-ramayana-yatra__panel is-title" data-testid="panel">
          {screen === 'title' ? (
            <TitleMenu saved={saved} confirm={confirm} setConfirm={setConfirm} setScreen={setScreen} onContinue={onContinue} />
          ) : (
            <NewJourney name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} style={style ?? defaultJourney(prefs.dialogueLang)} setStyle={setStyle} setScreen={setScreen} onStart={onStart} prefs={prefs} setPrefs={setPrefs} />
          )}
        </div>
      </div>
    </EnvContext.Provider>
  );
}

const HOWTO_KEYS = ['title.howto1', 'title.howto2', 'title.howto3', 'title.howto4'] as const;

/** The first `n` how-to-play lines (manifest.howToPlay in English; the same keys hold the Sanskrit). */
function HowTo({ n, testid }: { n: number; testid: string }): ReactElement {
  const ui = useUi();
  const t = (k: (typeof HOWTO_KEYS)[number]): ReactNode =>
    k === 'title.howto1' ? ui.t('title.howto1', undefined, { block: true }) : k === 'title.howto2' ? ui.t('title.howto2', undefined, { block: true }) : k === 'title.howto3' ? ui.t('title.howto3', undefined, { block: true }) : ui.t('title.howto4', undefined, { block: true });
  return (
    <ol className="g-ramayana-yatra__howto" data-testid={testid}>
      {manifest.howToPlay.slice(0, n).map((h, i) => {
        const k = HOWTO_KEYS[i];
        return <li key={h}>{ui.isSa && k ? t(k) : h}</li>;
      })}
    </ol>
  );
}

/** Keyboard hint: English as one line; in Sanskrit each action follows its key cap (the keys keep their Latin letters). */
function TitleKeys(): ReactElement {
  const ui = useUi();
  if (!ui.isSa) return <p className="g-ramayana-yatra__keys-hint">{ui.t('title.keys')}</p>;
  return (
    <p className="g-ramayana-yatra__keys-hint">
      <Kbd k="←↑→↓" /> {ui.t('hud.kMove', undefined, { gloss: false })} · <Kbd k="Z / Enter" /> {ui.t('hud.kOk', undefined, { gloss: false })} · <Kbd k="X" /> {ui.t('hud.kBack', undefined, { gloss: false })} · <Kbd k="M" /> {ui.t('hud.kMenu', undefined, { gloss: false })}
    </p>
  );
}

function TitleMenu({ saved, confirm, setConfirm, setScreen, onContinue }: { saved: GameState | null; confirm: boolean; setConfirm: (b: boolean) => void; setScreen: (s: Screenname) => void; onContinue: () => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const chapterName = saved ? env.idx.name.get(`kanda.${saved.save.chapter}`) : undefined;
  const savedAvatar = saved?.save.avatar === 'b' ? 'b' : 'a';
  const restored = saved ? Object.values(saved.save.shlokas).filter((x) => x.restored).length : 0;
  return (
    <div className="g-ramayana-yatra__title-menu" data-testid="title-menu">
      <FirstVerse />
      <p className="g-ramayana-yatra__tagline">{ui.isSa ? ui.t('title.tagline', undefined, { block: true }) : manifest.tagline}</p>
      <HowTo n={4} testid="title-howto" />
      {saved ? (
        <button type="button" className="g-ramayana-yatra__save-slot" onClick={onContinue} data-testid="title-continue" autoFocus>
          <span className="g-ramayana-yatra__save-slot-top">
            <strong>{ui.t('title.continue')}</strong>
            <span className="sk-muted sk-small">
              <PlayTime ms={saved.save.playMs} />
            </span>
          </span>
          <span className="g-ramayana-yatra__save-slot-sub">
            {/* the saved journey's own avatar decides शिष्यः / शिष्या */}
            <EnvContext.Provider value={{ ...env, avatar: savedAvatar, playerName: saved.save.playerName }}>
              <PlayerName name={saved.save.playerName} />
            </EnvContext.Provider>{' '}
            · {chapterName ? <SaText>{chapterName.sa}</SaText> : ui.t('hud.book', { k: saved.save.chapter }, { gloss: false })} · {ui.t('title.restored', { n: restored }, { gloss: false })}
          </span>
        </button>
      ) : null}
      {confirm ? (
        <div className="sk-stack">
          <p className="g-ramayana-yatra__hint">{ui.t('title.replaceWarn', undefined, { block: true })}</p>
          <div className="g-ramayana-yatra__row2">
            <Button variant="secondary" onClick={() => setConfirm(false)} data-testid="title-new-cancel">
              <UiText k="title.keep" block />
            </Button>
            <Button variant="bad" onClick={() => setScreen('new')} data-testid="title-new-confirm">
              <UiText k="title.restart" block />
            </Button>
          </div>
        </div>
      ) : (
        <Button full variant={saved ? 'secondary' : 'primary'} onClick={() => (saved ? setConfirm(true) : setScreen('new'))} data-testid="title-new" autoFocus={!saved}>
          <UiText k="title.newJourney" />
        </Button>
      )}
      <TitleKeys />
    </div>
  );
}

/** What the player typed into `before` to get `after` (the part between their common prefix and suffix). */
function typedInto(before: string, after: string): string {
  let p = 0;
  while (p < before.length && p < after.length && before[p] === after[p]) p++;
  let q = 0;
  while (q < before.length - p && q < after.length - p && before[before.length - 1 - q] === after[after.length - 1 - q]) q++;
  return after.slice(p, after.length - q);
}

interface NewJourneyProps {
  name: string;
  setName: (n: string) => void;
  avatar: 'a' | 'b';
  setAvatar: (a: 'a' | 'b') => void;
  style: JourneyStyle;
  setStyle: (s: JourneyStyle) => void;
  setScreen: (s: Screenname) => void;
  onStart: (name: string, avatar: 'a' | 'b', style: JourneyStyle) => void;
  prefs: ViewPrefs;
  setPrefs: (p: ViewPrefs) => void;
}

function NewJourney({ name, setName, avatar, setAvatar, style, setStyle, setScreen, onStart, prefs, setPrefs }: NewJourneyProps): ReactElement {
  const env = useEnv();
  const ui = useUi();
  // Sanskrit modes show the default name as शिष्यः (look 1) / शिष्या (look 2); what is stored stays DEFAULT_NAME
  const saDefault = ui.isSa && isDefaultName(name) && name !== '' ? ui.plain('newGame.defaultName') : null;
  const shown = saDefault ?? name;
  return (
    <form
      className="g-ramayana-yatra__newgame"
      data-testid="new-journey"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(isDefaultName(name) ? DEFAULT_NAME : name.trim(), avatar, style);
      }}
    >
      <div className="g-ramayana-yatra__newgame-body" data-testid="new-journey-body">
        <label className="g-ramayana-yatra__label" htmlFor="g-ry-name">
          {ui.t('newGame.name')}
        </label>
        <input
          id="g-ry-name"
          className={cx('g-ramayana-yatra__input', saDefault && 'is-sa')}
          lang={saDefault ? (env.script === 'iast' ? 'sa-Latn' : 'sa-Deva') : undefined}
          value={shown}
          maxLength={saDefault ? 24 : 12}
          autoComplete="off"
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const v = e.target.value;
            // editing the shown Sanskrit default: keep only what was typed into it (names are typed in Latin letters);
            // deleting from it clears the field
            setName((saDefault === null ? v : typedInto(saDefault, v)).replace(NAME_RE, '').slice(0, 12));
          }}
          data-testid="name-input"
        />
        <span className="g-ramayana-yatra__label">{ui.t('newGame.look')}</span>
        <div className="g-ramayana-yatra__avatars" role="radiogroup" aria-label={ui.plain('newGame.avatar')}>
          {(['a', 'b'] as const).map((a) => {
            const url = env.art.portraitUrl(a === 'a' ? 'player_a' : 'player_b');
            return (
              <button key={a} type="button" role="radio" aria-checked={avatar === a} className={cx('g-ramayana-yatra__avatar', avatar === a && 'is-on')} onClick={() => setAvatar(a)} data-testid={`avatar-${a}`} aria-label={ui.plain('newGame.lookN', { n: a === 'a' ? 1 : 2 })}>
                {url ? <img src={url} alt="" draggable={false} /> : <span aria-hidden="true">{a === 'a' ? ui.num(1) : ui.num(2)}</span>}
              </button>
            );
          })}
        </div>
        <span className="g-ramayana-yatra__label" id="g-ry-dlang">
          {ui.t('lang.storyText')}
        </span>
        <DialogueLangControl value={prefs.dialogueLang} onChange={(v) => setPrefs({ ...prefs, dialogueLang: v })} idx={env.idx} />
        <span className="g-ramayana-yatra__label">{ui.t('common.journey')}</span>
        <JourneyPicker value={style} onChange={setStyle} />
        {style === 'katha' ? <AutoReciteToggle value={prefs.autoRecite} onChange={(on) => setPrefs({ ...prefs, autoRecite: on })} /> : null}
        <p className="g-ramayana-yatra__hint">{ui.t('newGame.intro', undefined, { block: true })}</p>
        <HowTo n={3} testid="new-howto" />
      </div>
      {/* v0.4.1: Begin / Back in a footer that never scrolls away (360×640, every language, both journeys) */}
      <div className="g-ramayana-yatra__row2 g-ramayana-yatra__newgame-foot" data-testid="new-journey-foot">
        <Button variant="secondary" onClick={() => setScreen('title')} data-testid="new-back">
          <UiText k="newGame.back" />
        </Button>
        <Button type="submit" data-testid="start-journey">
          <UiText k="common.begin" />
        </Button>
      </div>
    </form>
  );
}
