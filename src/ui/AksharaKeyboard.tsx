import type { ReactElement } from 'react';
import { devaToIast } from '@sanskrit';
import { useSettings } from './context';
import { BACKSPACE, CONSONANT_ROWS, ENTER, MARK_KEYS, RARE_VOWEL_KEYS, VOWEL_KEYS, applyKey } from './keyboardLogic';
import { cx } from './primitives';

export type KeyState = 'correct' | 'present' | 'absent';

export interface AksharaKeyboardProps {
  /** Current text (Devanagari). */
  value: string;
  onChange: (next: string) => void;
  onEnter?: () => void;
  /** Colour hints per key (Wordle-style). Keys are the Devanagari key labels. */
  keyState?: Record<string, KeyState>;
  /** Show ॠ and ऌ too. */
  rareVowels?: boolean;
  /** Disable all keys (e.g. while animating). */
  disabled?: boolean;
  /** Hide the enter key when the game has its own submit button. */
  noEnter?: boolean;
  /** Disable only the enter key (e.g. until the row holds the right number of akṣaras). */
  enterDisabled?: boolean;
  /** Key labels to leave out entirely (e.g. ['ऽ'] when no answer can contain an avagraha). */
  hiddenKeys?: readonly string[];
}

const MARK_LABEL: Record<string, string> = { 'ं': 'ं', 'ः': 'ः', '्': '्', 'ऽ': 'ऽ' };
const MARK_NAME: Record<string, string> = { 'ं': 'anusvāra', 'ः': 'visarga', '्': 'virāma (halant) — joins consonants', 'ऽ': 'avagraha' };

/**
 * On-screen Devanagari keyboard. Tap a consonant then a vowel to get the vowel sign
 * (क + इ → कि); tap ् between consonants for conjuncts (क ् ष → क्ष). Always shows
 * Devanagari keys; in IAST mode a romanised sub-label helps readers of either script.
 * Physical keyboards are handled by the game via `useKeydown` if desired.
 */
export function AksharaKeyboard({ value, onChange, onEnter, keyState, rareVowels, disabled, noEnter, enterDisabled, hiddenKeys }: AksharaKeyboardProps): ReactElement {
  const { script } = useSettings();
  const press = (k: string): void => {
    if (disabled) return;
    if (k === ENTER) onEnter?.();
    else onChange(applyKey(value, k));
  };
  const key = (k: string, extra?: string): ReactElement | null =>
    hiddenKeys?.includes(k) ? null : (
    <button key={k} type="button" className={cx('sk-key', extra, keyState?.[k] && `is-${keyState[k]}`)} onClick={() => press(k)} disabled={disabled} data-testid={`key-${k}`} aria-label={MARK_NAME[k] ?? k} title={script === 'iast' ? devaToIast(k) : undefined}>
      {k === '्' || k === 'ं' || k === 'ः' ? `◌${MARK_LABEL[k]}` : k}
    </button>
  );
  const vowels = rareVowels ? [...VOWEL_KEYS, ...RARE_VOWEL_KEYS] : [...VOWEL_KEYS];
  return (
    <div className="sk-kbd" role="group" aria-label="Devanagari keyboard" data-testid="akshara-keyboard">
      <div className="sk-kbd__row">{vowels.map((k) => key(k, 'sk-key--mark'))}</div>
      {CONSONANT_ROWS.slice(0, 3).map((row, i) => (
        <div className="sk-kbd__row" key={i}>
          {row.map((k) => key(k))}
        </div>
      ))}
      <div className="sk-kbd__row">
        {(CONSONANT_ROWS[3] ?? []).map((k) => key(k))}
        {MARK_KEYS.map((k) => key(k, 'sk-key--mark'))}
        <button type="button" className="sk-key sk-key--wide" onClick={() => press(BACKSPACE)} disabled={disabled} aria-label="Backspace" data-testid="key-backspace">
          ⌫
        </button>
        {noEnter ? null : (
          <button type="button" className="sk-key sk-key--wide sk-key--enter" onClick={() => press(ENTER)} disabled={disabled || enterDisabled} aria-label="Enter" data-testid="key-enter">
            ⏎
          </button>
        )}
      </div>
    </div>
  );
}
