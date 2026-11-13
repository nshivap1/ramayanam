import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePaused } from './context';

/** Always-current ref to a value (avoids stale closures in listeners and loops). */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export type SwipeDir = 'up' | 'down' | 'left' | 'right';

/**
 * Swipe detection on an element (touch + mouse + pen via pointer events). Also maps arrow
 * keys / WASD to the same callback when `keys` is true (default) so desktop works for free.
 */
export function useSwipe(ref: RefObject<HTMLElement | null>, onSwipe: (dir: SwipeDir) => void, opts: { threshold?: number; keys?: boolean } = {}): void {
  const cb = useLatest(onSwipe);
  const threshold = opts.threshold ?? 24;
  const keys = opts.keys ?? true;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let active = false;
    const down = (e: PointerEvent): void => {
      active = true;
      sx = e.clientX;
      sy = e.clientY;
    };
    const up = (e: PointerEvent): void => {
      if (!active) return;
      active = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
      cb.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    };
    const cancel = (): void => {
      active = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    el.style.touchAction = 'none';
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [ref, threshold, cb]);
  useEffect(() => {
    if (!keys) return;
    const map: Record<string, SwipeDir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        cb.current(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, cb]);
}

/** Window keydown listener; ignored while typing in inputs. */
export function useKeydown(handler: (e: KeyboardEvent) => void, enabled = true): void {
  const cb = useLatest(handler);
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      cb.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, cb]);
}

/** setInterval that always calls the latest callback. Pass null to pause. */
export function useInterval(fn: () => void, ms: number | null): void {
  const cb = useLatest(fn);
  const paused = useLatest(usePaused());
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => {
      if (!paused.current) cb.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms, cb, paused]);
}

/**
 * Countdown timer. Returns remaining ms and controls. Uses wall-clock deltas so it stays
 * accurate when the tab is throttled; pauses automatically while the page is hidden.
 */
export function useCountdown(totalMs: number, onExpire: () => void, running = true): { leftMs: number; reset: (ms?: number) => void; add: (ms: number) => void } {
  const [leftMs, setLeftMs] = useState(totalMs);
  const left = useRef(totalMs);
  const expired = useRef(false);
  const cb = useLatest(onExpire);
  const paused = useLatest(usePaused());
  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(1000, now - last); // clamp: hidden tabs don't burn the clock
      last = now;
      if (paused.current || (typeof document !== 'undefined' && document.hidden)) return;
      left.current = Math.max(0, left.current - dt);
      setLeftMs(left.current);
      if (left.current <= 0 && !expired.current) {
        expired.current = true;
        cb.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, cb]);
  const reset = useCallback(
    (ms?: number) => {
      left.current = ms ?? totalMs;
      expired.current = false;
      setLeftMs(left.current);
    },
    [totalMs],
  );
  const add = useCallback((ms: number) => {
    left.current = Math.max(0, left.current + ms);
    setLeftMs(left.current);
  }, []);
  return { leftMs, reset, add };
}

/**
 * requestAnimationFrame loop for arcade games. `step(dtMs)` is called with a clamped delta
 * (≤ 50 ms). Pauses when `running` is false or the page is hidden.
 */
export function useRafLoop(step: (dtMs: number) => void, running: boolean): void {
  const cb = useLatest(step);
  const paused = useLatest(usePaused());
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const dt = Math.min(50, now - last);
      last = now;
      if (!document.hidden && !paused.current) cb.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, cb]);
}

/** Run an effect exactly once on mount (StrictMode-safe via ref guard). */
export function useOnce(fn: () => void): void {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Shrinks the font size of `ref`'s element until its content fits the element's own box width
 * (never below `minPx`, never above the size it has from CSS). For one-line Sanskrit that must
 * not wrap: long tiles, number words, compound answers. Re-fits when `deps` change and on resize.
 * Transitions are disabled on the element so measuring is synchronous (also under reduced motion).
 */
export function useFitText(ref: RefObject<HTMLElement | null>, deps: readonly unknown[], minPx = 12): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = (): void => {
      el.style.setProperty('transition', 'none', 'important');
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize) || 16;
      const avail = el.clientWidth;
      const need = el.scrollWidth;
      if (avail > 0 && need > avail) el.style.fontSize = `${Math.max(minPx, Math.floor(((base * avail) / need) * 100) / 100)}px`;
    };
    fit();
    void document.fonts?.ready.then(fit);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (ro && el.parentElement) ro.observe(el.parentElement);
    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
