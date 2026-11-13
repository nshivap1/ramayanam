import { type ButtonHTMLAttributes, type CSSProperties, type ReactElement, type ReactNode, useEffect, useRef } from 'react';
import type { Script } from '@sdk';
import { useFitText } from './hooks';
import { SaText } from './SaText';

const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');
export { cx };

// ── Button ────────────────────────────────────────────────────
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'ok' | 'bad';
  size?: 'md' | 'sm';
  full?: boolean;
}
export function Button({ variant = 'primary', size = 'md', full, className, type, ...rest }: ButtonProps): ReactElement {
  return <button type={type ?? 'button'} className={cx('sk-btn', variant !== 'primary' && `sk-btn--${variant}`, size === 'sm' && 'sk-btn--sm', full && 'sk-btn--full', className)} {...rest} />;
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}
export function IconButton({ label, className, children, ...rest }: IconButtonProps): ReactElement {
  return (
    <button type="button" className={cx('sk-iconbtn', className)} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

// ── Choice ────────────────────────────────────────────────────
export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'muted';
export interface ChoiceProps {
  /** Sanskrit (Devanagari) label. */
  sa?: string;
  /** Plain-text label. */
  text?: string;
  state?: ChoiceState;
  /** Small keyboard-shortcut badge, e.g. "1". */
  hotkey?: string;
  disabled?: boolean;
  onClick?: () => void;
  script?: Script;
  'data-testid'?: string;
  children?: ReactNode;
}
export function Choice({ sa, text, state = 'idle', hotkey, disabled, onClick, script, children, ...rest }: ChoiceProps): ReactElement {
  return (
    <button type="button" className={cx('sk-choice', state !== 'idle' && `is-${state}`)} disabled={disabled} onClick={onClick} aria-pressed={state === 'selected'} data-testid={rest['data-testid']}>
      {hotkey ? <span className="sk-choice__key" aria-hidden="true">{hotkey}</span> : null}
      <span>
        {sa ? <SaText script={script}>{sa}</SaText> : null}
        {sa && text ? ' ' : null}
        {text ? <span className={sa ? 'sk-muted sk-small' : undefined}>{text}</span> : null}
        {children}
      </span>
    </button>
  );
}

// ── Tile ──────────────────────────────────────────────────────
export type TileState = 'idle' | 'filled' | 'correct' | 'present' | 'absent' | 'selected' | 'accent' | 'soft';
export interface TileProps {
  /** Sanskrit (Devanagari) content — usually one akṣara. */
  sa?: string;
  children?: ReactNode;
  state?: TileState;
  /** Edge length in px (default 52). */
  size?: number;
  onClick?: () => void;
  disabled?: boolean;
  script?: Script;
  label?: string;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}
export function Tile({ sa, children, state = 'idle', size, onClick, disabled, script, label, className, style, ...rest }: TileProps): ReactElement {
  const s: CSSProperties = { ...(size ? ({ '--tile': `${size}px` } as CSSProperties) : {}), ...style };
  const cls = cx('sk-tile', state !== 'idle' && `is-${state}`, className);
  const content = sa !== undefined ? <SaText script={script}>{sa}</SaText> : children;
  if (onClick) {
    return (
      <button type="button" className={cls} style={s} onClick={onClick} disabled={disabled} aria-label={label} data-testid={rest['data-testid']}>
        {content}
      </button>
    );
  }
  return (
    <span className={cls} style={s} aria-label={label} data-testid={rest['data-testid']}>
      {content}
    </span>
  );
}

// ── Chip (word-bank token) ────────────────────────────────────
export type ChipState = 'idle' | 'used' | 'selected' | 'correct' | 'wrong' | 'done';
export interface ChipProps {
  sa?: string;
  text?: string;
  state?: ChipState;
  onClick?: () => void;
  disabled?: boolean;
  script?: Script;
  'data-testid'?: string;
}
export function Chip({ sa, text, state = 'idle', onClick, disabled, script, ...rest }: ChipProps): ReactElement {
  return (
    <button type="button" className={cx('sk-chip', state !== 'idle' && `is-${state}`)} onClick={onClick} disabled={disabled || state === 'used' || state === 'done'} data-testid={rest['data-testid']}>
      {sa ? <SaText script={script}>{sa}</SaText> : <span>{text}</span>}
    </button>
  );
}

// ── Progress / Hearts / Pill / Card ───────────────────────────
export function ProgressBar({ value, label }: { value: number; label?: string }): ReactElement {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="sk-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label ?? 'Progress'}>
      <div className="sk-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Hearts({ lives, max }: { lives: number; max?: number }): ReactElement {
  return (
    <span className="sk-hearts" aria-label={`${lives} lives left${max ? ` of ${max}` : ''}`} data-testid="hud-lives">
      <span aria-hidden="true">♥</span>
      {lives}
    </span>
  );
}

export function Pill({ children, tone, ...rest }: { children: ReactNode; tone?: 'accent' | 'ok' | 'bad' | 'gold'; 'data-testid'?: string }): ReactElement {
  return (
    <span className={cx('sk-pill', tone && `sk-pill--${tone}`)} data-testid={rest['data-testid']}>
      {children}
    </span>
  );
}

export function Card({ children, flat, className, style }: { children: ReactNode; flat?: boolean; className?: string; style?: CSSProperties }): ReactElement {
  return (
    <div className={cx('sk-card', flat && 'sk-card--flat', className)} style={style}>
      {children}
    </div>
  );
}

// ── Sheet ─────────────────────────────────────────────────────
export interface SheetProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  'data-testid'?: string;
}
/** Modal bottom sheet (centred dialog on wide screens). Closes on backdrop click and Escape. */
export function Sheet({ title, open, onClose, children, ...rest }: SheetProps): ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sk-sheet-backdrop" onClick={onClose} data-testid={rest['data-testid']}>
      <div className="sk-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sk-sheet__head">
          <h2 className="sk-sheet__title">{title}</h2>
          <IconButton label="Close" onClick={onClose} data-testid="sheet-close">
            ✕
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Feedback bar ──────────────────────────────────────────────
export interface FeedbackBarProps {
  correct: boolean;
  /** Headline; defaults to साधु! / पुनः प्रयतस्व. */
  title?: string;
  children?: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
}
/** Sticky bottom bar shown after an answer — the same in every lesson-style game. */
export function FeedbackBar({ correct, title, children, onContinue, continueLabel = 'Continue' }: FeedbackBarProps): ReactElement {
  return (
    <div className={cx('sk-feedback', correct ? 'is-correct' : 'is-wrong')} role="status" data-testid="feedback" data-correct={correct ? 'true' : 'false'}>
      <div className="sk-feedback__title">
        <span aria-hidden="true">{correct ? '✓' : '✕'}</span>
        {title ?? (correct ? (
          <>
            <SaText>साधु!</SaText> Correct
          </>
        ) : (
          'Not quite'
        ))}
      </div>
      {children ? <div className="sk-feedback__body">{children}</div> : null}
      <Button variant={correct ? 'ok' : 'bad'} full onClick={onContinue} data-testid="continue" autoFocus>
        {continueLabel}
      </Button>
    </div>
  );
}

// ── FitText ───────────────────────────────────────────────────
/**
 * One line of Sanskrit that shrinks to fit its box instead of overflowing or wrapping.
 * The box needs a width from its parent (block or flex item); text never goes below `minPx`.
 */
export function FitText({ sa, script, minPx, className, style }: { sa: string; script?: Script; minPx?: number; className?: string; style?: CSSProperties }): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  useFitText(ref, [sa, script], minPx);
  return (
    <span ref={ref} className={cx('sk-fit', className)} style={style}>
      <SaText script={script}>{sa}</SaText>
    </span>
  );
}
