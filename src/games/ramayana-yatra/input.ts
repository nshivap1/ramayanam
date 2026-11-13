/**
 * Input layer for Ramayana-yatra (view agent). Pure DOM listeners, no game rules.
 *  - keyboard: arrows/WASD move (hold to walk), Z/Enter/Space = A, X/Escape/Backspace = B,
 *    M = menu, 1–9 = options (1–4 in most panels; Kathā battle: 5–7 switch / items / run; shrine / recital lists)
 *  - touch: on-screen D-pad with press-and-hold (see view-panel), swipe on the canvas
 * Movement is throttled by the caller: `HeldDirs` only remembers what is held / queued.
 */
import { type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, useEffect } from 'react';
import { useLatest } from '@ui';
import type { Dir } from './types';

export type Btn = Dir | 'a' | 'b' | 'menu' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

const KEYMAP: Record<string, Btn> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
  z: 'a',
  Z: 'a',
  Enter: 'a',
  ' ': 'a',
  x: 'b',
  X: 'b',
  Escape: 'b',
  Backspace: 'b',
  m: 'menu',
  M: 'menu',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
};

export const isDir = (b: Btn): b is Dir => b === 'up' || b === 'down' || b === 'left' || b === 'right';

/** Directions currently held (last pressed wins) plus one queued tap for when the player is busy. */
export class HeldDirs {
  private stack: Dir[] = [];
  /** Directions held by a pointer (on-screen pad), so a lost pointerup can be repaired globally. */
  private byPointer = new Set<Dir>();
  queued: Dir | null = null;
  /** B held: run (shorter steps). */
  running = false;
  press(d: Dir, pointer = false): void {
    this.stack = [...this.stack.filter((x) => x !== d), d];
    if (pointer) this.byPointer.add(d);
    this.queued = d;
  }
  release(d: Dir): void {
    this.stack = this.stack.filter((x) => x !== d);
    this.byPointer.delete(d);
  }
  /**
   * Any pointer lifted anywhere: drop pad-held directions. (If a step starts an event, the pad unmounts before its
   * own pointerup arrives; without this the direction would stay "held" and the player would walk on by itself.)
   */
  releasePointer(): void {
    if (!this.byPointer.size) return;
    this.stack = this.stack.filter((x) => !this.byPointer.has(x));
    this.byPointer.clear();
    this.running = false;
  }
  clear(): void {
    this.stack = [];
    this.byPointer.clear();
    this.queued = null;
  }
  /** The direction to walk now (held, else the queued tap). */
  current(): Dir | null {
    return this.stack[this.stack.length - 1] ?? this.queued;
  }
  held(): boolean {
    return this.stack.length > 0;
  }
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function isActivatable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute?.('role') === 'button');
}

/**
 * Global keyboard → game buttons. Enter/Space on a focused button are left to the browser
 * (the button's own click fires) so one key press never triggers two actions.
 */
export function useGameKeys(onDown: (b: Btn, repeat: boolean) => void, onUp: (b: Btn) => void, enabled: boolean): void {
  const down = useLatest(onDown);
  const up = useLatest(onUp);
  useEffect(() => {
    if (!enabled) return;
    const kd = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      const b = KEYMAP[e.key];
      if (!b) return;
      if ((e.key === 'Enter' || e.key === ' ') && isActivatable(e.target)) return;
      e.preventDefault();
      down.current(b, e.repeat);
    };
    const ku = (e: KeyboardEvent): void => {
      const b = KEYMAP[e.key];
      if (b) up.current(b);
    };
    const blur = (): void => {
      for (const d of ['up', 'down', 'left', 'right'] as const) up.current(d);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
    };
  }, [enabled, down, up]);
}

/** Props for a press-and-hold D-pad button (pointer) that also works with keyboard activation. */
export function holdProps(dir: Dir, held: HeldDirs, kick: () => void): {
  onPointerDown: (e: RPointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onClick: (e: RMouseEvent) => void;
  onContextMenu: (e: RMouseEvent) => void;
  onMouseDown: (e: RMouseEvent) => void;
} {
  const release = (): void => held.release(dir);
  return {
    onPointerDown: (e) => {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      held.press(dir, true);
      kick();
    },
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
    // keyboard activation (Enter/Space on the focused button) has detail 0: one step
    onClick: (e) => {
      if (e.detail === 0) {
        held.queued = dir;
        kick();
      }
    },
    onContextMenu: (e) => e.preventDefault(),
    // a pointer press must not leave focus on the pad (Enter would then click it instead of meaning A)
    onMouseDown: (e) => e.preventDefault(),
  };
}

export const DELTA: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
