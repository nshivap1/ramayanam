/**
 * Original chiptune music via WebAudio (pulse lead, triangle bass, noise percussion, drone).
 * Melodies are written in scale degrees over rāga-flavoured scales and scheduled with a
 * look-ahead clock so playback never drifts. OWNER: art.
 */
import type { TrackId } from './catalog';

export interface AudioEngine {
  /** Call from a user gesture (autoplay policy). Safe to call repeatedly. */
  unlock(): void;
  /** Switch music (null = silence). No-op while disabled. */
  play(track: TrackId | null): void;
  /** Mirror ctx.settings.sound && the in-game music toggle. */
  setEnabled(on: boolean): void;
  /** Stop everything and release the AudioContext (call on unmount). */
  dispose(): void;
}

// ───────────────────────── scales (semitones from Sa) ─────────────────────────
export const SCALES = {
  bhupali: [0, 2, 4, 7, 9], // Bhūpālī / Mohanam pentatonic
  durga: [0, 2, 5, 7, 9],
  yaman: [0, 2, 4, 6, 7, 9, 11], // tīvra Ma
  kafi: [0, 2, 3, 5, 7, 9, 10],
  bhairavi: [0, 1, 3, 5, 7, 8, 10],
  bhairav: [0, 1, 4, 5, 7, 8, 11], // komal Re and Dha
} as const;
type ScaleName = keyof typeof SCALES;

type Wave = 'pulse12' | 'pulse25' | 'square' | 'triangle' | 'saw';

export interface TrackDef {
  bpm: number; // quarter notes per minute; one step = an eighth note
  scale: ScaleName;
  root: number; // MIDI note of Sa for the lead
  lead: string; // bars separated by '|', 8 tokens per bar: degree (1..), ' = up an octave, , = down, . = hold, - = rest
  leadWave: Wave;
  leadVol?: number;
  counter?: string; // optional second voice, same notation (an octave below the lead by default)
  counterWave?: Wave;
  bass?: string; // degrees, two octaves below the lead root
  drums?: string; // per-bar patterns separated by '|' (cycled): k kick, s snare, h hat, o open hat, t tom, . none
  drone?: boolean; // tanpura-style Pa-Sa plucks
  loopFrom?: number; // bar index the loop returns to (intro bars play once)
  swing?: number;
}

export const TRACKS: Record<TrackId, TrackDef> = {
  title: {
    bpm: 100,
    scale: 'bhupali',
    root: 62,
    leadWave: 'pulse25',
    lead: '1 . 2 3 4 . 5 . | 6 . 5 4 3 . . . | 4 . 3 2 1 . 2 3 | 2 . . . - . . . | 4 . 5 6 7 . 6 5 | 6 . 5 4 5 . . . | 3 . 4 5 4 3 2 1 | 1 . . . - . . .',
    counter: '- . . . 3 . . . | 4 . . . 1 . . . | 2 . . . 5, . . . | 4, . . . 5, . . . | 2 . . . 4 . . . | 3 . . . 2 . . . | 1 . . . 5, . . . | 1 . . . . . . .',
    counterWave: 'triangle',
    bass: '1 . . 1 4 . . . | 1 . . 1 4 . 5 . | 4 . . 4 1 . . . | 5, . . 5, 2 . . . | 4 . . 4 1 . . . | 1 . . 1 5, . . . | 4 . . 4 5, . . . | 1 . 5, . 1 . . .',
    drums: 'k . h . s . h . | k . h k s . h h',
  },
  ashrama: {
    bpm: 84,
    scale: 'bhupali',
    root: 67,
    leadWave: 'triangle',
    leadVol: 1.2,
    lead: '3 . 2 . 1 . 2 3 | 4 . . . 3 . . . | 5 . 4 . 3 . 2 . | 3 . . . - . . . | 2 . 3 . 4 . 5 . | 6 . 5 . 4 . . . | 3 . 2 . 1 . 2 . | 1 . . . - . . .',
    counter: '1 . . . 5, . . . | 1 . . . 2 . . . | 3 . . . 1 . . . | 2 . . . 5, . . . | 4, . . . 1 . . . | 3 . . . 2 . . . | 1 . . . 5, . . . | 1 . . . . . . .',
    counterWave: 'pulse12',
    bass: '1 . . . 4 . . . | 1 . . . 5, . . . | 4, . . . 1 . . . | 5, . . . 5, . . . | 4, . . . 1 . . . | 4 . . . 2 . . . | 1 . . . 5, . . . | 1 . . . 1 . . .',
    drums: '. . h . . . h h | . . h . . . h .',
  },
  ayodhya: {
    bpm: 108,
    scale: 'yaman',
    root: 62,
    leadWave: 'pulse25',
    lead: '5 . 5 6 7 . 8 . | 7 6 5 . 4 . 3 . | 2 3 4 . 3 2 1 . | 2 . . . 5, . . . | 3 . 4 5 6 . 7 . | 8 . 7 6 5 . 4 . | 3 . 2 . 7, . 2 . | 1 . . . - . . .',
    counter: '3 . . . 5 . . . | 5 . . . 2 . . . | 7, . . . 6, . . . | 7, . . . 5, . . . | 1 . . . 4 . . . | 5 . . . 2 . . . | 1 . . . 5, . . . | 3, . . . . . . .',
    counterWave: 'pulse12',
    bass: '1 . 5, . 1 . 5, . | 4 . 1 . 5, . 5, . | 6, . 3 . 4, . 1 . | 5, . 2 . 5, . 2 . | 1 . 5, . 4 . 1 . | 5 . 2 . 5, . 2 . | 6, . 2 . 5, . 5, . | 1 . 5, . 1 . . .',
    drums: 'k . s s k . s . | k . s . k s s s',
  },
  forest: {
    bpm: 92,
    scale: 'kafi',
    root: 62,
    leadWave: 'pulse12',
    lead: '1 . 3 . 4 . 5 . | 7 . 6 5 4 . . . | 3 . 4 3 2 . 1 . | 2 . . . - . . . | 5 . 6 7 8 . 7 . | 6 . 5 . 4 . 3 . | 4 . 3 . 2 . 7, . | 1 . . . - . . .',
    counter: '- . . . 1 . . . | 3 . . . 2 . . . | 1 . . . 6, . . . | 7, . . . 5, . . . | 3 . . . 5 . . . | 4 . . . 2 . . . | 2 . . . 5, . . . | 3, . . . . . . .',
    counterWave: 'triangle',
    bass: '1 . . 5, 1 . . . | 4, . . 1 4, . . . | 6, . . 3 7, . . . | 5, . . 2 5, . . . | 1 . . 5, 3 . . . | 4, . . 1 6, . . . | 7, . . 2 5, . . . | 1 . . 5, 1 . . .',
    drums: 't . . h . . h . | . . t h . h . .',
  },
  kishkindha: {
    bpm: 120,
    scale: 'durga',
    root: 64,
    leadWave: 'square',
    leadVol: 0.8,
    lead: '1 2 3 . 5 . 3 . | 4 . 3 2 1 . . . | 3 4 5 . 6 . 5 . | 4 3 2 . 3 . . . | 5 . 6 5 4 . 3 . | 2 . 3 4 5 . . . | 6 . 5 4 3 2 1 . | 1 . . . - . . .',
    counter: '- . 1 . - . 1 . | - . 5, . - . 5, . | - . 1 . - . 2 . | - . 5, . - . 1 . | - . 3 . - . 1 . | - . 5, . - . 2 . | - . 1 . - . 5, . | 1 . . . . . . .',
    counterWave: 'pulse12',
    bass: '1 . 1 . 3, . 4, . | 1 . 1 . 4, . 5, . | 1 . 1 . 3, . 4, . | 4, . 4, . 5, . 5, . | 1 . 1 . 3, . 4, . | 2 . 2 . 4, . 5, . | 4, . 4, . 5, . 5, . | 1 . 5, . 1 . . .',
    drums: 'k h s h k k s h | k h s h k h s s',
  },
  ocean: {
    bpm: 100,
    scale: 'yaman',
    root: 64,
    leadWave: 'pulse25',
    lead: '1 . 3 . 5 . 8 . | 7 . . . 5 . . . | 6 . 5 . 3 . 4 . | 5 . . . . . - . | 4 . 6 . 8 . 9 . | 8 . . . 7 . 6 . | 5 . 4 . 3 . 2 . | 1 . . . . . - .',
    counter: '1, 3, 5, 3, 1, 3, 5, 3, | 2, 4, 6, 4, 2, 4, 6, 4, | 4, 6, 1 6, 4, 6, 1 6, | 5, 7, 2 7, 5, 7, 2 7, | 4, 6, 1 6, 4, 6, 1 6, | 3, 5, 7, 5, 3, 5, 7, 5, | 2, 4, 6, 4, 5, 7, 2 7, | 1, 3, 5, 3, 1, . . .',
    counterWave: 'pulse12',
    bass: '1 . . . . . . . | 2 . . . . . . . | 4, . . . . . . . | 5, . . . . . . . | 4, . . . . . . . | 3, . . . . . . . | 2, . . . 5, . . . | 1 . . . . . . .',
    drums: '. . . . . . o . | . . . . . . o .',
  },
  lanka: {
    bpm: 88,
    scale: 'bhairav',
    root: 62,
    leadWave: 'pulse12',
    lead: '- . 2 1 7, . 1 . | 2 . 3 . 2 . 1 . | 4 . 5 6 5 . 4 . | 3 . 2 . 1 . . . | 5 . 6 . 7 . 8 . | 9 . 8 . 7 6 5 . | 6 . 5 4 3 . 2 . | 1 . . . - . . .',
    counter: '1 . . . 1 . . . | 2 . . . 7, . . . | 1 . . . 2 . . . | 7, . . . 1 . . . | 3 . . . 5 . . . | 6 . . . 5 . . . | 4 . . . 2 . . . | 1 . . . . . . .',
    counterWave: 'triangle',
    bass: '1 1 . 1 2 . 1 . | 1 1 . 1 7, . 1 . | 4, 4, . 4, 5, . 4, . | 5, 5, . 5, 6, . 7, . | 1 1 . 1 2 . 1 . | 6, 6, . 6, 5, . 6, . | 4, 4, . 2 5, . 5, . | 1 1 . 1 1 . . .',
    drums: 'k . . t . . t . | k . . t . t t .',
  },
  battle: {
    bpm: 150,
    scale: 'kafi',
    root: 62,
    leadWave: 'square',
    leadVol: 0.8,
    lead: '1 . 1 3 5 . 4 3 | 4 . 3 2 1 . 7, . | 1 . 1 3 5 . 6 7 | 8 . 7 6 5 . . . | 6 . 5 4 5 . 4 3 | 4 . 3 2 3 . 2 1 | 2 . 1 7, 1 . 2 3 | 1 . . . 5, . 7, .',
    counter: '5, . . . 1 . . . | 6, . . . 5, . . . | 5, . . . 3 . . . | 5 . . . 3 . . . | 4 . . . 3 . . . | 2 . . . 1 . . . | 7, . . . 6, . . . | 5, . . . 7, . . .',
    counterWave: 'pulse12',
    bass: '1 1 8 1 1 1 8 1 | 4, 4, 4 4, 5, 5, 5 5, | 1 1 8 1 1 1 8 1 | 3 3 3, 3 5, 5, 5 5, | 4, 4, 4 4, 3, 3, 3 3, | 2 2 2, 2 1 1 1, 1 | 7, 7, 7 7, 6, 6, 6 6, | 5, 5, 5 5, 7, 7, 7 7,',
    drums: 'k h s h k k s h | k h s h k h s s',
  },
  boss: {
    bpm: 160,
    scale: 'bhairav',
    root: 62,
    leadWave: 'square',
    leadVol: 0.8,
    lead: '1 . 2 . 1 . 7, . | 1 2 3 4 5 . . . | 6 . 5 . 6 . 7 . | 8 . . . 7 6 5 . | 2 . 1 . 2 . 3 . | 4 3 2 1 2 . . . | 6, . 7, . 1 . 2 . | 1 . . . . . . .',
    counter: '5, . . . 4, . . . | 5, . . . 1 . . . | 4 . . . 4 . . . | 5 . . . 3 . . . | 7, . . . 7, . . . | 6, . . . 7, . . . | 4, . . . 5, . . . | 1 . . . 5, . . .',
    counterWave: 'pulse25',
    bass: '1 1 1 1 2 2 1 1 | 1 1 1 1 7, 7, 7, 7, | 6, 6, 6, 6, 6, 6, 7, 7, | 1 1 1 1 5, 5, 5, 5, | 2 2 2 2 2 2 3 3 | 4, 4, 4, 4, 5, 5, 5, 5, | 6, 6, 7, 7, 1 1 2 2 | 1 1 1 1 5, 5, 7, 7,',
    drums: 'k s k s k s k s | k h s h k k s s',
  },
  duel: {
    bpm: 132,
    scale: 'yaman',
    root: 64,
    leadWave: 'pulse25',
    lead: '5 . 3 . 5 6 5 . | 3 . 2 . 1 . . . | 2 . 3 . 4 5 6 . | 5 . . . - . . . | 8 . 7 . 6 5 4 . | 5 . 6 . 7 . . . | 8 7 6 5 4 3 2 . | 1 . . . - . . .',
    counter: '- . 1 . - . 3 . | - . 5, . - . 1 . | - . 7, . - . 2 . | - . 2 . - . 5, . | - . 3 . - . 1 . | - . 2 . - . 5, . | - . 4, . - . 5, . | 1 . . . . . . .',
    counterWave: 'pulse12',
    bass: '1 . 5, . 1 . 5, . | 6, . 3, . 4, . 5, . | 5, . 2 . 4, . 1 . | 5, . 5, . 5, . 5, . | 6, . 3, . 4, . 1 . | 5, . 2 . 5, . 5, . | 4, . 1 . 5, . 5, . | 1 . 5, . 1 . . .',
    drums: 'k . h s . k h s | k . h s k . s s',
  },
  victory: {
    bpm: 120,
    scale: 'bhupali',
    root: 67,
    leadWave: 'square',
    leadVol: 0.85,
    loopFrom: 2,
    lead: '1 1 1 . 3 . 5 . | 6 . . . . . - . | 4 . 3 . 4 . 5 . | 6 . 5 . 3 . . . | 4 . 5 . 6 . 7 . | 6 . . . 5 . . . | 4 . 3 . 2 . 3 . | 1 . . . - . . .',
    counter: '5, 5, 5, . 1 . 3 . | 4 . . . . . - . | 2 . . . 1 . . . | 3 . . . 1 . . . | 2 . . . 3 . . . | 4 . . . 2 . . . | 1 . . . 5, . . . | 1 . . . . . . .',
    counterWave: 'pulse12',
    bass: '1 1 1 . 3, . 4, . | 1 . . . . . - . | 4, . . . 1 . . . | 4, . . . 1 . . . | 4, . . . 4, . . . | 1 . . . 5, . . . | 4, . . . 5, . . . | 1 . 5, . 1 . . .',
    drums: 'k k k . s . s . | k . . . s . s s | k . h . s . h . | k . h . s . h h',
  },
  shloka: {
    bpm: 70,
    scale: 'bhupali',
    root: 62,
    leadWave: 'triangle',
    leadVol: 1,
    drone: true,
    lead: '1 . . . 2 . 3 . | 3 . . . . . . . | 3 . 4 . 5 . 4 . | 3 . . . 2 . . . | 2 . 3 . 2 . 1 . | 5, . . . 1 . . . | 1 . . . . . . . | - . . . . . . .',
  },
  sorrow: {
    bpm: 66,
    scale: 'bhairavi',
    root: 62,
    leadWave: 'triangle',
    leadVol: 1.25,
    lead: '5 . . 4 3 . 2 . | 3 . . . 2 . 1 . | 2 . 3 . 4 . 3 2 | 1 . . . - . . . | 4 . 5 . 6 . 5 . | 4 . 3 . 2 . . . | 3 . 2 . 1 . 7, . | 1 . . . - . . .',
    counter: '1 . . . 6, . . . | 7, . . . 5, . . . | 6, . . . 7, . . . | 5, . . . . . . . | 6, . . . 1 . . . | 2 . . . 7, . . . | 6, . . . 5, . . . | 1 . . . . . . .',
    counterWave: 'pulse12',
    bass: '1 . . . 6, . . . | 7, . . . 5, . . . | 6, . . . 7, . . . | 1 . . . 5, . . . | 4, . . . 6, . . . | 7, . . . 5, . . . | 6, . . . 5, . . . | 1 . . . . . . .',
  },
  ending: {
    bpm: 104,
    scale: 'yaman',
    root: 62,
    leadWave: 'pulse25',
    lead: '1 . 3 . 5 . 8 . | 7 . 6 . 5 . . . | 6 . 7 . 8 . 9 . | 8 . . . 5 . . . | 6 . 5 . 4 . 3 . | 4 . 5 . 6 . 7 . | 8 . 7 . 6 . 7 . | 8 . . . . . - .',
    counter: '3 . 5 . 1 . 3 . | 5 . 4 . 3 . . . | 4 . 5 . 6 . 7 . | 5 . . . 3 . . . | 4 . 3 . 2 . 1 . | 2 . 3 . 4 . 5 . | 6 . 5 . 4 . 5 . | 5 . . . . . - .',
    counterWave: 'pulse12',
    bass: '1 . 5, . 1 . 5, . | 3, . 4, . 5, . 5, . | 4, . 1 . 4, . 1 . | 5, . 2 . 5, . 2 . | 4, . 1 . 2, . 6, . | 2, . 6, . 5, . 2 . | 4, . 1 . 5, . 5, . | 1 . 5, . 1 . . .',
    drums: 'k . h s k . h s | k h h s k s s s',
  },
};

// ───────────────────────── parsing ─────────────────────────

export interface NoteEv {
  step: number;
  len: number;
  midi: number;
}

/** Parse a degree string into note events (step = eighth-note index in the loop). */
export function parseLine(line: string, scale: readonly number[], root: number): { events: NoteEv[]; steps: number; bars: number } {
  const bars = line.split('|').map((b) => b.trim().split(/\s+/).filter(Boolean));
  const toks: string[] = [];
  for (const b of bars) for (let i = 0; i < 8; i++) toks.push(b[i] ?? '.');
  const events: NoteEv[] = [];
  let cur: NoteEv | null = null;
  toks.forEach((tk, i) => {
    if (tk === '.') {
      if (cur) cur.len++;
      return;
    }
    cur = null;
    if (tk === '-') return;
    const m = /^(\d+)([',]*)$/.exec(tk);
    if (!m) return;
    const deg = Number(m[1]) - 1;
    const marks = m[2] ?? '';
    let oct = Math.floor(deg / scale.length);
    for (const ch of marks) oct += ch === "'" ? 1 : -1;
    const midi = root + 12 * oct + (scale[deg % scale.length] as number);
    cur = { step: i, len: 1, midi };
    events.push(cur);
  });
  return { events, steps: toks.length, bars: bars.length };
}

// ───────────────────────── engine ─────────────────────────

type ACtor = new () => AudioContext;

export function createAudio(): AudioEngine {
  let ac: AudioContext | null = null;
  let master: GainNode | null = null;
  let out: GainNode | null = null;
  let enabled = true;
  let disposed = false;
  let wanted: TrackId | null = null;
  let playing: TrackId | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let bus: GainNode | null = null;
  let nextTime = 0;
  let step = 0;
  let loopSteps = 0;
  let loopStart = 0;
  let schedule: Map<number, { voice: 'lead' | 'counter' | 'bass'; ev: NoteEv }[]> = new Map();
  let drumBars: string[][] = [];
  let def: TrackDef | null = null;
  const live = new Set<AudioScheduledSourceNode>();
  const waves = new Map<string, PeriodicWave>();
  let noise: AudioBuffer | null = null;

  const LOOKAHEAD = 0.15;
  const TICK_MS = 25;

  const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

  function pulse(duty: number): PeriodicWave | null {
    if (!ac) return null;
    const key = String(duty);
    const hit = waves.get(key);
    if (hit) return hit;
    const n = 32;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    const w = ac.createPeriodicWave(re, im);
    waves.set(key, w);
    return w;
  }

  function noiseBuf(): AudioBuffer | null {
    if (!ac) return null;
    if (noise) return noise;
    const len = Math.floor(ac.sampleRate * 0.5);
    const b = ac.createBuffer(1, len, ac.sampleRate);
    const d = b.getChannelData(0);
    let s = 0x1234567;
    for (let i = 0; i < len; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0; // LCG: deterministic noise, no global RNG
      d[i] = (s / 4294967296) * 2 - 1;
    }
    noise = b;
    return b;
  }

  function track(src: AudioScheduledSourceNode): void {
    live.add(src);
    src.onended = () => live.delete(src);
  }

  function tone(out: GainNode, wave: Wave, midi: number, t: number, dur: number, vol: number, pluck = false): void {
    if (!ac) return;
    const o = ac.createOscillator();
    if (wave === 'triangle') o.type = 'triangle';
    else if (wave === 'saw') o.type = 'sawtooth';
    else if (wave === 'square') o.type = 'square';
    else {
      const w = pulse(wave === 'pulse12' ? 0.125 : 0.25);
      if (w) o.setPeriodicWave(w);
      else o.type = 'square';
    }
    o.frequency.setValueAtTime(mtof(midi), t);
    const g = ac.createGain();
    const a = 0.006;
    const rel = pluck ? Math.min(dur, 0.9) : Math.min(0.08, dur * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (pluck) g.gain.exponentialRampToValueAtTime(0.0008, t + dur + rel);
    else {
      g.gain.setValueAtTime(vol * 0.75, t + Math.min(0.06, dur * 0.4));
      g.gain.setValueAtTime(vol * 0.7, t + Math.max(a, dur - rel));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    }
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + (pluck ? rel : 0) + 0.02);
    track(o);
  }

  function drum(out: GainNode, kind: string, t: number): void {
    if (!ac) return;
    if (kind === 'k') {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.55, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.18);
      track(o);
      return;
    }
    if (kind === 't') {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.15);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.22);
      track(o);
      return;
    }
    const buf = noiseBuf();
    if (!buf) return;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    const g = ac.createGain();
    const len = kind === 's' ? 0.14 : kind === 'o' ? 0.22 : 0.04;
    f.type = kind === 's' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 's' ? 1800 : 7000;
    g.gain.setValueAtTime(kind === 's' ? 0.3 : 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t, (t * 7.31) % 0.25);
    src.stop(t + len + 0.02);
    track(src);
  }

  function stopScheduler(fade: boolean): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    if (ac && bus) {
      const now = ac.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + (fade ? 0.12 : 0.01));
      for (const n of live) {
        try {
          n.stop(now + (fade ? 0.13 : 0.02));
        } catch {
          /* already stopped */
        }
      }
    }
    bus = null;
    playing = null;
  }

  function startTrack(id: TrackId): void {
    if (!ac || !master || disposed) return;
    stopScheduler(true);
    if (!TRACKS[id]) return; // unknown id from content: stay silent rather than throw
    def = TRACKS[id];
    const sc = SCALES[def.scale];
    schedule = new Map();
    const add = (line: string | undefined, voice: 'lead' | 'counter' | 'bass', root: number): number => {
      if (!line) return 0;
      const p = parseLine(line, sc, root);
      for (const ev of p.events) {
        const arr = schedule.get(ev.step) ?? [];
        arr.push({ voice, ev });
        schedule.set(ev.step, arr);
      }
      return p.steps;
    };
    loopSteps = Math.max(add(def.lead, 'lead', def.root), add(def.counter, 'counter', def.root - 12), add(def.bass, 'bass', def.root - 24), 8);
    loopStart = (def.loopFrom ?? 0) * 8;
    drumBars = def.drums ? def.drums.split('|').map((b) => b.trim().split(/\s+/)) : [];
    bus = ac.createGain();
    bus.gain.value = 1;
    bus.connect(master);
    step = 0;
    nextTime = ac.currentTime + 0.08;
    playing = id;
    timer = setInterval(tick, TICK_MS);
    tick();
  }

  function tick(): void {
    if (!ac || !bus || !def) return;
    const spb = 60 / def.bpm / 2; // seconds per eighth
    if (nextTime < ac.currentTime - 0.25) nextTime = ac.currentTime + 0.05; // resync after a stall
    while (nextTime < ac.currentTime + LOOKAHEAD) {
      const s = step;
      const evs = schedule.get(s);
      if (evs) {
        for (const { voice, ev } of evs) {
          const dur = ev.len * spb * 0.96;
          if (voice === 'lead') tone(bus, def.leadWave, ev.midi, nextTime, dur, 0.11 * (def.leadVol ?? 1));
          else if (voice === 'counter') tone(bus, def.counterWave ?? 'triangle', ev.midi, nextTime, dur, 0.07);
          else tone(bus, 'triangle', ev.midi, nextTime, dur, 0.16);
        }
      }
      if (drumBars.length) {
        const bar = drumBars[Math.floor(s / 8) % drumBars.length] ?? [];
        const k = bar[s % 8] ?? '.';
        if (k !== '.') drum(bus, k, nextTime);
      }
      if (def.drone && s % 2 === 0) {
        // tanpura cycle: Pa (low) – Sa – Sa – Sa (low), one pluck per quarter
        const pat = [-5, 0, 0, -12];
        const off = pat[(s / 2) % 4] as number;
        tone(bus, 'saw', def.root - 12 + off, nextTime, spb * 3.6, 0.035, true);
      }
      step = s + 1 >= loopSteps ? loopStart : s + 1;
      nextTime += spb;
    }
  }

  function ensureContext(): void {
    if (ac || disposed || typeof window === 'undefined') return;
    const w = window as unknown as { AudioContext?: ACtor; webkitAudioContext?: ACtor };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    try {
      ac = new Ctor();
    } catch {
      ac = null;
      return;
    }
    master = ac.createGain();
    master.gain.value = enabled ? 0.5 : 0;
    out = ac.createGain();
    out.gain.value = enabled ? 1 : 0;
    master.connect(out);
    out.connect(ac.destination);
    // a little space: one feedback echo send (a few nodes, no timers); its return is muted with `out`
    const send = ac.createGain();
    const delay = ac.createDelay(1);
    const fb = ac.createGain();
    const damp = ac.createBiquadFilter();
    send.gain.value = 0.16;
    delay.delayTime.value = 0.27;
    fb.gain.value = 0.28;
    damp.type = 'lowpass';
    damp.frequency.value = 2400;
    master.connect(send);
    send.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(out);
  }

  return {
    unlock() {
      if (disposed) return;
      ensureContext();
      if (!ac) return;
      if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
      if (enabled && wanted && playing !== wanted) startTrack(wanted);
    },
    play(trackId) {
      if (disposed) return;
      wanted = trackId;
      if (!enabled || !ac) return;
      if (trackId === playing) return;
      if (trackId === null) stopScheduler(true);
      else startTrack(trackId);
    },
    setEnabled(on) {
      if (disposed) return;
      enabled = on;
      if (!ac || !master) return;
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      out?.gain.cancelScheduledValues(now);
      out?.gain.setValueAtTime(on ? 1 : 0, now);
      if (!on) {
        master.gain.setValueAtTime(0, now);
        stopScheduler(false);
      } else {
        master.gain.setValueAtTime(0.5, now);
        if (wanted && playing !== wanted) startTrack(wanted);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (timer !== null) clearInterval(timer);
      timer = null;
      for (const n of live) {
        try {
          n.stop();
        } catch {
          /* ignore */
        }
      }
      live.clear();
      bus = null;
      playing = null;
      wanted = null;
      if (ac) {
        const c = ac;
        ac = null;
        master = null;
        out = null;
        void c.close().catch(() => undefined);
      }
    },
  };
}
