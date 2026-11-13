import type { Sfx } from '@sdk';

/** Tiny WebAudio synth: no audio assets to ship, works offline. */
let ac: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    if (!ac) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function tone(freq: number, startMs: number, durMs: number, type: OscillatorType = 'sine', gain = 0.08): void {
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + startMs / 1000;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

const PATTERNS: Record<Sfx, () => void> = {
  tap: () => tone(520, 0, 50, 'triangle', 0.04),
  tick: () => tone(880, 0, 30, 'square', 0.02),
  merge: () => {
    tone(440, 0, 80, 'triangle');
    tone(660, 60, 110, 'triangle');
  },
  correct: () => {
    tone(660, 0, 90);
    tone(880, 80, 140);
  },
  wrong: () => {
    tone(220, 0, 120, 'sawtooth', 0.05);
    tone(180, 100, 160, 'sawtooth', 0.05);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 110, 180)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 150, 220, 'triangle')),
  levelup: () => [523, 784, 1047, 1319].forEach((f, i) => tone(f, i * 90, 200, 'triangle')),
};

export function playSfx(name: Sfx, enabled: boolean): void {
  if (!enabled) return;
  PATTERNS[name]?.();
}

export function vibrate(kind: 'light' | 'medium' | 'success' | 'error', enabled: boolean): void {
  if (!enabled) return;
  try {
    const pattern = kind === 'light' ? 8 : kind === 'medium' ? 18 : kind === 'success' ? [10, 40, 20] : [30, 40, 30];
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
