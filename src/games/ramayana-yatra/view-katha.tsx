/**
 * Kathā mode views (kc-view, v0.4; spec notes/katha.md, audited rules /home/claude/scratch/ux-audit/AUDIT.md).
 *
 *  - JourneyPicker / AutoReciteToggle: New journey and Settings (कथा / अभ्यासः; automatic recitation, prefs-v1).
 *  - VerseMoment: the `shloka` pending in a Kathā journey. The printed verse large; the words then glide from verse
 *    order into prose order (anvaya) and the सरलार्थः fades in; a tap completes it; one ▶ continues. Tabs revisit
 *    पदच्छेदः · अन्वयः · सरलार्थः (+ the English meaning in sa-en / en). Words open their word card.
 *  - RecitePanel: a smarana challenge (battle cast, duel turn, shrine recital). The pāda recites akṣara by akṣara on
 *    one auto-fitted row; at most one gap; three stacked chips (keys 1–3) armed 300 ms after they appear; a tap on the
 *    line or Enter / Space / Z only hurries; a miss shimmers the right word in and the line still completes; no timer;
 *    no English until the line is complete; one polite screen-reader announcement. Sends `answer { picks }`
 *    (`picks: []` without a gap, `auto: true` for automatic recitation) once the line has completed.
 *  - useAutoBeat: Kathā battle narration advances by itself at a learner's reading pace (1.5 s + 180 ms per akṣara;
 *    tap / A hurries); never in the tutorial duel (`spec.tutorial`), where every beat waits for a tap (v0.4.3).
 *  - ModelLine: the tutorial duel's model beat — the pāda the duelist says, printed in full (no gap, no input).
 *  - The tutorial duel's first recitation is coached (one line above it, the gap and chips pulse until the tap).
 * The practice game never renders any of this (isKatha(save) is false for saves without `style`).
 */
import { type ReactElement, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, SaText, cx, renderSa, useLatest, usePaused } from '@ui';
import { splitAksharas, weights as chandasWeights } from '@sanskrit';
import { halfVerseLines } from './logic';
import { VerseRef, useButtons, useEnv, warnOnce } from './view-common';
import { markupUnits, saMarkupUnits, useStory } from './view-markup';
import { useUi } from './view-ui';
import type { Action, Challenge, ChallengeOption, GameContent, GameState, JourneyStyle, Pending, SaveData, Shloka, SmaranaSpec } from './types';
import type { ReviewItem, SessionResult } from '@sdk';

// ───────────────────────── journey ─────────────────────────

/** A Kathā journey (saves without `style` are the practice game). */
export function isKatha(save: Pick<SaveData, 'style'> | null | undefined): boolean {
  return save?.style === 'katha';
}

/** New-journey default: कथा when the story text is Sanskrit (sa, sa-en), अभ्यासः for English. */
export function defaultJourney(lang: string): JourneyStyle {
  return lang === 'en' ? 'abhyasa' : 'katha';
}

/** The pāda an astra recites in Kathā (content/katha.json), or undefined for a plain move. */
export function astraBinding(content: GameContent, moveId: string | undefined): { shlokaId: string; pada: number } | undefined {
  if (!moveId) return undefined;
  return content.katha?.astras.find((a) => a.moveId === moveId);
}

/** Verse ids in story order: each chapter's verses in its own order, then any verse no chapter lists. */
export function storyOrder(content: GameContent): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const have = new Set(content.shlokas.map((s) => s.id));
  for (const ch of [...content.chapters].sort((a, b) => a.kanda - b.kanda))
    for (const id of ch.shlokaIds)
      if (have.has(id) && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
  for (const s of content.shlokas) if (!seen.has(s.id)) out.push(s.id);
  return out;
}

const STYLES: readonly JourneyStyle[] = ['katha', 'abhyasa'];

/**
 * कथा / अभ्यासः as a 2-way segmented radio group (≥ 44 px, arrows move), with a short line on what the chosen style
 * means. `testid` prefixes the buttons (`journey-katha`, `journey-abhyasa`).
 */
export function JourneyPicker({ value, onChange, disabled }: { value: JourneyStyle; onChange: (s: JourneyStyle) => void; disabled?: boolean }): ReactElement {
  const ui = useUi();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const label = (s: JourneyStyle): ReactNode => (s === 'katha' ? ui.t('katha.styleKatha', undefined, { gloss: false }) : ui.t('katha.styleAbhyasa', undefined, { gloss: false }));
  const gloss = (s: JourneyStyle): string => (s === 'katha' ? ui.en('katha.styleKatha') : ui.en('katha.styleAbhyasa'));
  return (
    <div className="g-ramayana-yatra__dlang">
      <div
        className="g-ramayana-yatra__seg"
        role="radiogroup"
        aria-label={ui.plain('common.journey')}
        data-testid="journey-style"
        onKeyDown={(e) => {
          const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
          if (!step || disabled) return;
          e.preventDefault();
          e.stopPropagation();
          const i = (STYLES.indexOf(value) + step + STYLES.length) % STYLES.length;
          onChange(STYLES[i] ?? 'katha');
          refs.current[i]?.focus();
        }}
      >
        {STYLES.map((s, i) => (
          <button
            key={s}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === s}
            tabIndex={value === s ? 0 : -1}
            disabled={disabled}
            className={cx('g-ramayana-yatra__seg-btn', value === s && 'is-on')}
            onClick={() => onChange(s)}
            data-testid={`journey-${s}`}
          >
            {label(s)}
            {ui.lang === 'sa-en' ? <span className="g-ramayana-yatra__ui-en is-block">{gloss(s)}</span> : null}
          </button>
        ))}
      </div>
      <p className="g-ramayana-yatra__dlang-note" data-testid="journey-note">
        {value === 'katha' ? ui.t('katha.noteKatha', undefined, { block: true }) : ui.t('katha.noteAbhyasa', undefined, { block: true })}
      </p>
    </div>
  );
}

/** The automatic-recitation switch (view pref `autoRecite`, prefs-v1). */
export function AutoReciteToggle({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }): ReactElement {
  const ui = useUi();
  return (
    <div className="g-ramayana-yatra__setting g-ramayana-yatra__auto-recite">
      <span>
        {ui.t('katha.autoRecite', undefined, { block: true })}
        <span className="g-ramayana-yatra__move-meta"> {ui.t('katha.autoReciteSub', undefined, { block: true })}</span>
      </span>
      <Button size="sm" variant={value ? 'primary' : 'secondary'} onClick={() => onChange(!value)} aria-pressed={value} data-testid="toggle-auto-recite">
        {value ? ui.t('settings.on', undefined, { gloss: false }) : ui.t('settings.off', undefined, { gloss: false })}
      </Button>
    </div>
  );
}

// ───────────────────────── verse moment ─────────────────────────

type VmPhase = 'verse' | 'split' | 'prose' | 'done';
type VmTab = 'pada' | 'anvaya' | 'sarala' | 'en';
/** verse alone → words appear in verse order → glide to prose order → सरलार्थः (ms from the start) */
const VM_SPLIT_AT = 700;
const VM_PROSE_AT = 1700;
const VM_DONE_AT = 2650;
const GLIDE_MS = 760;

interface VmWord {
  key: string;
  text: string;
  lexId?: string;
  implied?: boolean;
}

/** The verse's words in verse order and in prose order (anvaya tokens matched to verse words; "[x]" = implied). */
function verseWords(sh: Shloka, anvaya: string[] | undefined): { verse: VmWord[]; prose: VmWord[] | null } {
  const verse: VmWord[] = sh.words.map((w, i) => ({ key: `w${i}`, text: w.form, lexId: w.lexId }));
  if (!anvaya?.length) return { verse, prose: null };
  const used = new Set<number>();
  const prose: VmWord[] = anvaya.map((tok, k) => {
    const m = /^\[(.+)\]$/.exec(tok.trim());
    if (m) return { key: `x${k}`, text: m[1] ?? '', implied: true };
    const i = sh.words.findIndex((w, j) => !used.has(j) && w.form === tok);
    if (i < 0) {
      warnOnce('anvaya word (content/katha.json)', `${sh.id}:${tok}`);
      return { key: `u${k}`, text: tok };
    }
    used.add(i);
    return verse[i] ?? { key: `u${k}`, text: tok };
  });
  return { verse, prose };
}

/**
 * Words that glide to their new places when the order changes (FLIP with the Web Animations API, positions taken
 * relative to the list so scrolling never counts as movement). New words fade in, staggered. Reduced motion: static.
 */
function GlideWords({ words, reduced, testid, onWord }: { words: VmWord[]; reduced: boolean; testid: string; onWord: (w: VmWord) => void }): ReactElement {
  const box = useRef<HTMLDivElement | null>(null);
  const refs = useRef(new Map<string, HTMLElement>());
  const last = useRef(new Map<string, { x: number; y: number }>());
  const sig = words.map((w) => w.key).join('|');
  useLayoutEffect(() => {
    const root = box.current?.getBoundingClientRect();
    if (!root) return;
    const next = new Map<string, { x: number; y: number }>();
    refs.current.forEach((el, k) => {
      const r = el.getBoundingClientRect();
      next.set(k, { x: r.left - root.left, y: r.top - root.top });
    });
    if (!reduced && typeof HTMLElement.prototype.animate === 'function') {
      let fresh = 0;
      refs.current.forEach((el, k) => {
        const a = last.current.get(k);
        const b = next.get(k);
        if (!b) return;
        if (!a) {
          el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: Math.min(fresh++ * 45, 500), easing: 'ease-out', fill: 'backwards' });
          return;
        }
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: GLIDE_MS, easing: 'cubic-bezier(.3,.7,.2,1)' });
      });
    }
    last.current = next;
  }, [sig, reduced]);
  return (
    <div className="g-ramayana-yatra__vm-words" ref={box} data-testid={testid} lang="sa">
      {words.map((w) => {
        const ref = (el: HTMLElement | null): void => {
          if (el) refs.current.set(w.key, el);
          else refs.current.delete(w.key);
        };
        if (w.implied || !w.lexId)
          return (
            <span key={w.key} ref={ref} className={cx('g-ramayana-yatra__vm-word', 'is-plain', w.implied && 'is-implied')} data-testid={`vm-word-${w.key}`}>
              {w.implied ? '[' : null}
              <SaText>{w.text}</SaText>
              {w.implied ? ']' : null}
            </span>
          );
        return (
          <button key={w.key} ref={ref} type="button" className="g-ramayana-yatra__vm-word" onClick={(e) => {
            e.stopPropagation();
            onWord(w);
          }} data-testid={`vm-word-${w.key}`}>
            <SaText>{w.text}</SaText>
          </button>
        );
      })}
    </div>
  );
}

/** Ignore "advance" for the first ~500 ms of a newly shown card, so rapid A presses cannot skip it unread. */
function useGuard(ms = 500): () => boolean {
  const t0 = useRef(performance.now());
  return () => performance.now() - t0.current >= ms;
}

export function VerseMoment({ id, dispatch }: { id: string; dispatch: (a: Action) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const sh = env.idx.shloka.get(id);
  const kv = env.content.katha?.verses.find((v) => v.shlokaId === id);
  const words = useMemo(() => (sh ? verseWords(sh, kv?.anvaya) : { verse: [], prose: null }), [sh, kv]);
  const hasProse = !!words.prose && !!kv;
  const [phase, setPhase] = useState<VmPhase>(env.reduced || !hasProse ? 'done' : 'verse');
  const [userTab, setUserTab] = useState<VmTab | null>(null);
  const paused = usePaused();
  const t0 = useRef(performance.now());
  const ready = useGuard();

  useEffect(() => {
    if (phase === 'done' || paused) return;
    const at = phase === 'verse' ? VM_SPLIT_AT : phase === 'split' ? VM_PROSE_AT : VM_DONE_AT;
    const next: VmPhase = phase === 'verse' ? 'split' : phase === 'split' ? 'prose' : 'done';
    const t = setTimeout(() => setPhase(next), Math.max(0, t0.current + at - performance.now()));
    return () => clearTimeout(t);
  }, [phase, paused]);

  const complete = (): void => setPhase('done');
  const advance = (): void => {
    if (ready()) dispatch({ type: 'advance' });
  };
  const aKey = (): void => (phase === 'done' ? advance() : complete());
  useButtons({ a: aKey, b: aKey });

  if (!sh) {
    warnOnce('shloka', id);
    return (
      <div className="g-ramayana-yatra__vm" data-testid="panel-verse-moment">
        <p className="sk-muted">{ui.t('card.verseMissing')}</p>
        <div className="g-ramayana-yatra__vm-foot">
          <VmNext onClick={advance} />
        </div>
      </div>
    );
  }
  const showEn = ui.lang !== 'sa';
  const tabs: { id: VmTab; label: ReactNode; en?: string }[] = [
    { id: 'pada', label: ui.t('katha.tabPada', undefined, { gloss: false }), en: ui.en('katha.tabPada') },
    ...(hasProse
      ? [
          { id: 'anvaya' as const, label: ui.t('katha.tabAnvaya', undefined, { gloss: false }), en: ui.en('katha.tabAnvaya') },
          { id: 'sarala' as const, label: ui.t('katha.tabSarala', undefined, { gloss: false }), en: ui.en('katha.tabSarala') },
        ]
      : []),
    ...(showEn ? [{ id: 'en' as const, label: ui.t('katha.tabEn', undefined, { gloss: false }), en: ui.en('katha.tabEn') }] : []),
  ];
  const auto: VmTab = phase === 'verse' || phase === 'split' || !hasProse ? 'pada' : 'anvaya';
  const tab = userTab ?? auto;
  const unfolding = phase !== 'done';
  const lines = halfVerseLines(sh);
  return (
    <div className={cx('g-ramayana-yatra__vm', ui.lang === 'en' && 'is-en')} data-testid="panel-verse-moment" data-phase={phase} data-tab={tab}>
      <figure className="g-ramayana-yatra__vm-verse" data-testid="vm-verse" onClick={unfolding ? complete : undefined}>
        {lines.map((l, i) => (
          <SaText key={i} as="div" shloka nowrap={false}>
            {l}
          </SaText>
        ))}
        <figcaption className="g-ramayana-yatra__vm-ref">
          <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} />
        </figcaption>
      </figure>
      <div className="g-ramayana-yatra__vm-bar">
        <div className={cx('g-ramayana-yatra__vm-tabs', phase === 'verse' && 'is-waiting')} role="tablist" aria-label={ui.plain('common.verse')}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={cx('g-ramayana-yatra__vm-tab', tab === t.id && 'is-on')}
              onClick={(e) => {
                e.stopPropagation();
                complete();
                setUserTab(t.id);
              }}
              data-testid={`vm-tab-${t.id}`}
            >
              {t.label}
              {ui.lang === 'sa-en' && t.id !== 'en' ? <span className="g-ramayana-yatra__vm-tab-en">{t.en}</span> : null}
            </button>
          ))}
        </div>
        <VmNext onClick={advance} />
      </div>
      <div className="g-ramayana-yatra__vm-scroll g-ramayana-yatra__card-scroll" onClick={unfolding ? complete : undefined}>
        <div className="g-ramayana-yatra__vm-body" role="tabpanel" aria-live="off">
          {(tab === 'pada' || tab === 'anvaya') && phase !== 'verse' ? (
            <GlideWords words={tab === 'anvaya' && words.prose ? words.prose : words.verse} reduced={env.reduced} testid={tab === 'anvaya' ? 'vm-anvaya' : 'vm-pada'} onWord={(w) => w.lexId && env.openWord(w.lexId, w.text)} />
          ) : null}
          {kv && ((tab === 'anvaya' && phase === 'done') || tab === 'sarala') ? (
            <p className={cx('g-ramayana-yatra__vm-sarala', tab === 'sarala' && 'is-large')} data-testid="vm-sarala">
              <SaText nowrap={false}>{kv.saralarthah}</SaText>
            </p>
          ) : null}
          {tab === 'en' ? (
            <p className="g-ramayana-yatra__translation" data-testid="vm-translation" data-en-ok="">
              {sh.translation}
            </p>
          ) : null}
          {unfolding ? <p className="g-ramayana-yatra__hint g-ramayana-yatra__vm-hint">{ui.t('katha.tapToSee')}</p> : tab === 'pada' || tab === 'anvaya' ? <p className="g-ramayana-yatra__hint g-ramayana-yatra__vm-hint">{ui.t('card.tapWord')}</p> : null}
        </div>
      </div>
    </div>
  );
}

function VmNext({ onClick }: { onClick: () => void }): ReactElement {
  const ui = useUi();
  return (
    <button
      type="button"
      className="g-ramayana-yatra__next g-ramayana-yatra__next--inline"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      data-testid="advance"
      aria-label={ui.plain('common.next')}
    >
      <span aria-hidden="true">▶</span>
    </button>
  );
}

// ───────────────────────── recitation (smarana) ─────────────────────────

/** ms per akṣara: learning recital, mastered self-recital / automatic recitation, and a hurried line */
const STEP_MS = 250;
const SELF_MS = 120;
const HURRY_MS = 70;
/** the line recites at least this long before any gap opens (input safety) */
const LEAD_MS = 400;
/** the tutorial duel's coached first turn: the coach line is read before the line starts (a tap starts it at once) */
const COACH_LEAD_MS = 1200;
/** chips ignore input for this long after they appear */
const ARM_MS = 300;
/** after a pick: resume the line (right word / shimmered-in right word) */
const RESUME_OK_MS = 260;
const RESUME_MISS_MS = 700;
/** the completed pāda stays this long before the cast fires */
const HOLD_MS = 350;
const HOLD_MISS_MS = 550;
const FIT_MAX = 34;
const FIT_MIN = 20;

type CastPhase = 'reciting' | 'asking' | 'resolving' | 'complete';
type Unit = { chunk: number; kind: 'ak' | 'hint' | 'gap' };

type ChallengePending = Extract<Pending, { kind: 'challenge' }>;

/** A smarana challenge: the recitation panel (battle cast, duel turn, shrine recital). */
export function RecitePanel({ pending, state, dispatch }: { pending: ChallengePending; state: GameState; dispatch: (a: Action) => void }): ReactElement | null {
  const env = useEnv();
  const ch = pending.challenge;
  const spec = ch.smarana;
  // automatic recitation applies to casts (battle and duel), never to a shrine recital
  const auto = env.prefs.autoRecite && pending.context === 'battle';
  if (!spec) return null;
  return <Cast key={`${ch.id}:${auto ? 'auto' : 'ask'}`} ch={ch} spec={spec} pending={pending} state={state} dispatch={dispatch} auto={auto} />;
}

function Cast({ ch, spec, pending, state, dispatch, auto }: { ch: Challenge; spec: SmaranaSpec; pending: ChallengePending; state: GameState; dispatch: (a: Action) => void; auto: boolean }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const sh = env.idx.shloka.get(spec.shlokaId);
  const iast = env.script === 'iast';
  const gapAt = !auto ? spec.gaps[0] : undefined;
  const options: ChallengeOption[] = gapAt !== undefined ? (spec.gapOptions[0] ?? []) : [];
  const answers = gapAt !== undefined ? (spec.gapAnswers[0] ?? []) : [];
  const hasGap = gapAt !== undefined && options.length > 0;
  const shows = spec.chunks.map((c, i) => (auto ? 'full' : hasGap && i === gapAt ? 'gap' : c.show === 'gap' ? 'full' : c.show));
  const aks = useMemo(() => spec.chunks.map((c) => splitAksharas(c.text)), [spec]);
  // laghu / guru marks: the content's, else the chandas engine's, only when they line up with the akṣaras
  const marks = useMemo(() => {
    const total = aks.reduce((n, a) => n + a.length, 0);
    const w = spec.weights?.length ? spec.weights.join('') : chandasWeights(spec.chunks.map((c) => c.text).join(' '));
    return w.length === total ? w : '';
  }, [aks, spec]);
  const offset = useMemo(() => aks.reduce<number[]>((acc, a, i) => [...acc, (acc[i] ?? 0) + a.length], [0]), [aks]);
  const units = useMemo(() => {
    const out: Unit[] = [];
    shows.forEach((s, i) => {
      if (s === 'gap' || s === 'hint') out.push({ chunk: i, kind: s });
      else for (let j = 0; j < (aks[i]?.length ?? 0); j++) out.push({ chunk: i, kind: 'ak' });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aks, shows.join()]);
  const gapUnit = units.findIndex((u) => u.kind === 'gap');
  const selfFast = auto || (!hasGap && spec.level >= 4);
  const reduced = env.reduced;

  const [phase, setPhase] = useState<CastPhase>('reciting');
  const [pos, setPos] = useState(0);
  const [fast, setFast] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [help, setHelp] = useState(false);
  const [live, setLive] = useState('');
  const shellPaused = usePaused();
  const paused = shellPaused || help;
  const t0 = useRef(performance.now());
  const askedAt = useRef(0);
  const armedAt = useRef(Number.POSITIVE_INFINITY);
  const downAt = useRef(0);
  const sent = useRef(false);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const ok = picked !== null && answers.includes(picked);
  const missed = picked !== null && !ok;
  const right = hasGap ? options.find((o) => answers.includes(o.id)) : undefined;
  const rightText = hasGap && gapAt !== undefined ? (spec.chunks[gapAt]?.text ?? right?.sa ?? '') : '';
  const complete = phase === 'complete';
  // the first-akṣara cue mark (the abbreviation sign) comes from content (sa-ui-katha `katha.hint`); IAST shows °
  const cue = ui.sa('katha.hint', { a: '' }) ?? '';

  // the caption "Recall the missing word" / अत्र किं पदम्? (first three casts with a gap, every story language: a
  // संस्कृतम् reader needs the prompt most of all — v0.4.3)
  const [caption] = useState(() => hasGap && env.prefs.recallHints < 3);
  const counted = useRef(false);
  useEffect(() => {
    if (!caption || counted.current) return;
    counted.current = true;
    env.setPrefs?.({ ...env.prefs, recallHints: env.prefs.recallHints + 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption]);

  // a Kathā duel turn (v0.4.1) recites straight away: the line is the answer, not a move, so no astra is named
  const duel = pending.context === 'battle' && state.battle?.spec.kind === 'duel';
  // the tutorial duel's first turn (v0.4.3): one coach line, read before the line plays; the gap and the chips pulse
  // until the first tap (static with reduced motion)
  const coach = duel && hasGap && !!state.battle?.spec.tutorial && (state.battle?.casts ?? 0) <= 1;
  const astraName = useMemo(() => {
    const mv = pending.context === 'battle' && !duel ? env.idx.move.get(state.battle?.pendingMove ?? '') : undefined;
    return mv ? env.idx.name.get(mv.nameId) : undefined;
  }, [pending.context, state.battle?.pendingMove, env.idx, duel]);
  const plainSa = (s: string): string => renderSa(s, env.script);
  const astraPlain = astraName ? plainSa(astraName.sa) : duel ? ui.plain('battle.recite') : ui.plain('common.verse');
  const fullPada = spec.chunks.map((c) => c.text).join(' ');

  const send = (): void => {
    if (sent.current) return;
    sent.current = true;
    const timeMs = Math.round(performance.now() - (askedAt.current || t0.current));
    if (auto) dispatch({ type: 'answer', auto: true, timeMs });
    else dispatch({ type: 'answer', picks: hasGap && picked ? [picked] : [], timeMs });
  };
  const sendRef = useLatest(send);

  // the recital clock
  useEffect(() => {
    if (paused) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (phase === 'reciting') {
      if (pos >= units.length) {
        t = setTimeout(() => setPhase('complete'), reduced ? 0 : fast ? HURRY_MS : selfFast ? SELF_MS : STEP_MS);
      } else if (units[pos]?.kind === 'gap') {
        t = setTimeout(() => setPhase('asking'), Math.max(0, t0.current + LEAD_MS - performance.now()));
      } else if (reduced) {
        // reduced motion: the line appears at once and stops at the gap
        setPos(gapUnit >= 0 && pos < gapUnit ? gapUnit : units.length);
      } else {
        t = setTimeout(() => setPos(pos + 1), pos === 0 ? (coach && !fast ? COACH_LEAD_MS : 0) : fast ? HURRY_MS : selfFast ? SELF_MS : STEP_MS);
      }
    } else if (phase === 'complete') {
      t = setTimeout(() => sendRef.current?.(), reduced && !hasGap ? 700 : missed ? HOLD_MISS_MS : HOLD_MS);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pos, fast, paused]);

  // chips: armed 300 ms after they are on screen (this effect runs after the paint that shows them, so a slow frame
  // never shortens the guard); focus moves to the group (never onto a chip); one announcement
  useEffect(() => {
    if (phase !== 'asking') return;
    askedAt.current = performance.now();
    armedAt.current = askedAt.current + ARM_MS;
    const t = setTimeout(() => setArmed(true), ARM_MS);
    chipsRef.current?.focus({ preventScroll: true });
    const spoken = spec.chunks
      .map((c, i) => (i === gapAt ? ui.plain('katha.srBlank') : shows[i] === 'hint' && (aks[i]?.length ?? 0) > 1 ? `${plainSa(aks[i]?.[0] ?? '')}…` : plainSa(c.text)))
      .join(' ');
    // the coached turn says the coach line first (it is on screen above the line)
    setLive(`${coach ? `${ui.plain('katha.coach')} ` : ''}${ui.plain('katha.srCast', { astra: { en: astraPlain, sa: astraPlain }, line: { en: spoken, sa: spoken } })}`);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // a cast with no gap is announced once as it starts
  useEffect(() => {
    // (a key, so संस्कृतम् ends the sentences with । and never a Latin full stop)
    if (!hasGap) setLive(ui.plain('katha.srLine', { astra: { en: astraPlain, sa: astraPlain }, line: { en: plainSa(fullPada), sa: plainSa(fullPada) } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (id: string): void => {
    if (phase !== 'asking' || performance.now() < armedAt.current) return;
    const good = answers.includes(id);
    setPicked(id);
    setPhase('resolving');
    setLive(good ? plainSa(fullPada) : `${ui.plain('katha.srMissed', { word: { en: plainSa(rightText), sa: plainSa(rightText) } })} ${plainSa(fullPada)}`);
    setTimeout(
      () => {
        setPhase('reciting');
        setPos(gapUnit + 1);
      },
      reduced ? (good ? 120 : 450) : good ? RESUME_OK_MS : RESUME_MISS_MS,
    );
  };
  const hurry = (): void => {
    if (phase === 'reciting' && !help) setFast(true);
  };
  useButtons({
    a: hurry,
    b: () => undefined, // B does nothing during a cast
    num: (n) => {
      const o = options[n - 1];
      if (o) pick(o.id);
    },
  });

  // auto-fit: one row, 34 → 20 px, sized for the completed line (so it never jumps); wraps between words only as a last resort
  const stageRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<{ fs: number; wrap: boolean }>({ fs: FIT_MAX, wrap: false });
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const m = measureRef.current;
    if (!stage || !m) return;
    const run = (): void => {
      const avail = stage.clientWidth - 4;
      let fs = FIT_MAX;
      m.style.fontSize = `${fs}px`;
      while (fs > FIT_MIN && m.scrollWidth > avail) {
        fs -= 1;
        m.style.fontSize = `${fs}px`;
      }
      const wrap = m.scrollWidth > avail;
      setFit((f) => (f.fs === fs && f.wrap === wrap ? f : { fs, wrap }));
    };
    run();
    // refit when the panel resizes, and when the line itself changes size (the verse font loads lazily, on first use)
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => run()) : null;
    ro?.observe(stage);
    ro?.observe(m);
    const fonts = document.fonts;
    fonts?.addEventListener?.('loadingdone', run);
    void fonts?.ready.then(run);
    return () => {
      ro?.disconnect();
      fonts?.removeEventListener?.('loadingdone', run);
    };
  }, [spec, iast]);

  const lit = (u: number): boolean => complete || u < pos;
  const now = (u: number): boolean => !complete && phase === 'reciting' && u === pos - 1;
  let unitIx = 0;
  const lineChunks = spec.chunks.map((c, i) => {
    const s = shows[i];
    const a = aks[i] ?? [];
    if (s === 'gap') {
      const u = unitIx++;
      const st = picked === null ? (phase === 'asking' ? 'open' : 'idle') : ok ? 'filled' : 'given';
      const filled = st === 'filled' || st === 'given';
      return (
        <span key={i} className={cx('g-ramayana-yatra__cast-gap', `is-${st}`)} data-testid="recite-gap" data-state={st} data-unit={u}>
          <span className="g-ramayana-yatra__cast-box">{filled ? <SaText>{c.text}</SaText> : null}</span>
          {marks ? (
            <span className="g-ramayana-yatra__cast-marks" aria-hidden="true">
              {filled ? a.map((_, j) => <i key={j}>{marks[(offset[i] ?? 0) + j] === 'G' ? '—' : '˘'}</i>) : null}
            </span>
          ) : null}
        </span>
      );
    }
    if (s === 'hint' && !complete) {
      const u = unitIx++;
      // a one-akṣara word is already whole: no first-akṣara cue mark after it (only the space before the next word)
      return (
        <span key={i} className="g-ramayana-yatra__cast-w" data-testid={a.length > 1 ? 'recite-hint' : 'recite-hint-whole'}>
          <Ak text={a[0] ?? ''} mark={marks ? marks[offset[i] ?? 0] : undefined} lit={lit(u)} now={now(u)} />
          {a.length > 1 ? <span className={cx('g-ramayana-yatra__cast-cue', iast && 'is-iast')}>{iast ? '°' : cue}</span> : null}
        </span>
      );
    }
    const start = unitIx;
    if (s !== 'hint') unitIx += a.length;
    else unitIx += 1;
    return (
      <span key={i} className="g-ramayana-yatra__cast-w">
        {a.map((t, j) => (
          <Ak key={j} text={t} mark={marks ? marks[(offset[i] ?? 0) + j] : undefined} lit={s === 'hint' ? true : lit(start + j)} now={s === 'hint' ? false : now(start + j)} />
        ))}
      </span>
    );
  });

  const recital = pending.context === 'recite';
  const steps = pending.steps ?? (recital ? (sh?.padas.length ?? 4) : 0);
  const step = pending.step ?? spec.pada + 1;
  const chipsVisible = phase === 'asking' || phase === 'resolving';
  const lineFont = { fontSize: `${fit.fs}px` };
  const lineEl = (
    <div className={cx('g-ramayana-yatra__cast-stage', recital && 'is-inshrine')} ref={stageRef} onClick={hurry} title={phase === 'reciting' ? ui.plain('katha.hurry') : undefined} data-testid="recite-stage">
      <div className={cx('g-ramayana-yatra__cast-line', fit.wrap && 'is-wrap', iast && 'is-iast', marks && 'has-marks')} style={lineFont} aria-hidden="true" data-testid="recite-line" data-fs={fit.fs}>
        {lineChunks}
      </div>
      {/* the completed line, built exactly like the live one (akṣara boxes, marks, the filled gap): the fit is measured on it */}
      <div className={cx('g-ramayana-yatra__cast-line g-ramayana-yatra__cast-measure', iast && 'is-iast', marks && 'has-marks')} ref={measureRef} aria-hidden="true">
        {spec.chunks.map((c, i) => {
          const a = aks[i] ?? [];
          if (shows[i] === 'gap')
            return (
              <span key={i} className="g-ramayana-yatra__cast-gap is-filled">
                <span className="g-ramayana-yatra__cast-box">
                  <SaText>{c.text}</SaText>
                </span>
                {marks ? (
                  <span className="g-ramayana-yatra__cast-marks">
                    {a.map((_, j) => (
                      <i key={j}>{marks[(offset[i] ?? 0) + j] === 'G' ? '—' : '˘'}</i>
                    ))}
                  </span>
                ) : null}
              </span>
            );
          return (
            <span key={i} className="g-ramayana-yatra__cast-w">
              {a.map((t, j) => (
                <Ak key={j} text={t} mark={marks ? marks[(offset[i] ?? 0) + j] : undefined} lit now={false} />
              ))}
            </span>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className={cx('g-ramayana-yatra__cast', recital && 'is-recital', coach && picked === null && 'is-coach')} data-testid="recite-cast" data-coach={coach ? 'true' : undefined} data-phase={phase} data-level={spec.level} data-auto={auto ? 'true' : 'false'} data-gap={hasGap ? 'true' : 'false'} data-picked={picked ?? ''} data-correct={picked === null ? '' : ok ? 'true' : 'false'}>
      <div className="g-ramayana-yatra__cast-head">
        {astraName ? (
          <span className="g-ramayana-yatra__astra" data-testid="recite-astra">
            <SaText>{astraName.sa}</SaText>
          </span>
        ) : recital ? (
          <span className="g-ramayana-yatra__astra is-recital">{ui.t('shrine.recite', undefined, { gloss: false })}</span>
        ) : duel ? (
          <span className="g-ramayana-yatra__astra is-recital" data-testid="recite-duel">
            {ui.t('battle.recite', undefined, { gloss: false })}
          </span>
        ) : null}
        {sh ? (
          <span className="g-ramayana-yatra__cast-ref">
            <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} /> · {ui.t('challenge.line', { n: spec.pada + 1 }, { gloss: false })}
          </span>
        ) : null}
        <button type="button" className="g-ramayana-yatra__cast-help" onClick={() => setHelp(!help)} aria-expanded={help} aria-label={ui.plain('katha.help')} data-testid="recite-help">
          <span aria-hidden="true">?</span>
        </button>
      </div>
      {coach && !complete ? <p className="g-ramayana-yatra__cast-coach" data-testid="recite-coach">{ui.t('katha.coach')}</p> : null}
      {caption && !complete ? <p className="g-ramayana-yatra__cast-cap" data-testid="recite-caption">{ui.t('katha.recallCap')}</p> : null}
      {recital && sh ? (
        <div className="g-ramayana-yatra__cast-verse" data-testid="recite-verse">
          <div className="g-ramayana-yatra__cast-dots" role="img" aria-label={ui.plain('challenge.recitalStep', { i: step, n: steps })} data-testid="recite-dots">
            {Array.from({ length: steps }, (_, i) => (
              <i key={i} className={cx(i < step - 1 && 'is-done', i === step - 1 && 'is-cur')} />
            ))}
          </div>
          {sh.padas.slice(0, spec.pada).map((p, i) => (
            <SaText key={i} as="div" shloka nowrap={false} className="g-ramayana-yatra__cast-done">
              {p}
            </SaText>
          ))}
          {lineEl}
        </div>
      ) : (
        lineEl
      )}
      <p className="sk-sr" aria-live="polite" data-testid="recite-live">
        {live}
      </p>
      <div
        className={cx('g-ramayana-yatra__cast-chips', !chipsVisible && 'is-hidden', chipsVisible && !armed && 'is-arming')}
        role="group"
        aria-label={ui.plain('katha.chips')}
        tabIndex={-1}
        ref={chipsRef}
        data-testid="recite-chips"
        data-armed={armed && phase === 'asking' ? 'true' : 'false'}
        aria-hidden={chipsVisible ? undefined : true}
      >
        {hasGap
          ? options.map((o, n) => (
              <button
                key={o.id}
                type="button"
                className={cx('g-ramayana-yatra__cast-chip', picked === o.id && (ok ? 'is-picked' : 'is-dim'), missed && answers.includes(o.id) && 'is-right')}
                disabled={!chipsVisible || picked !== null}
                tabIndex={chipsVisible ? 0 : -1}
                onPointerDown={() => {
                  downAt.current = performance.now();
                }}
                onClick={(e) => {
                  // a pointer press that began before the chips were armed is ignored (keyboard clicks have detail 0)
                  if (e.detail !== 0 && downAt.current < armedAt.current) return;
                  pick(o.id);
                }}
                data-testid={`recite-opt-${o.id}`}
              >
                <span className="g-ramayana-yatra__cast-key" aria-hidden="true">
                  {n + 1}
                </span>
                <SaText className="g-ramayana-yatra__cast-chip-t">{o.sa ?? ''}</SaText>
                {missed && picked === o.id ? (
                  <span className="g-ramayana-yatra__cast-x" aria-hidden="true" data-testid="recite-miss-mark">
                    ✗
                  </span>
                ) : null}
              </button>
            ))
          : null}
      </div>
      {help ? (
        <div className="g-ramayana-yatra__cast-helpbox" data-testid="recite-help-panel" role="dialog" aria-label={ui.plain('katha.help')}>
          <p className="g-ramayana-yatra__eyebrow">{ui.t('katha.help')}</p>
          <ul className="g-ramayana-yatra__cast-helplist">
            <li>{ui.t('katha.help1', undefined, { block: true })}</li>
            <li>{ui.t('katha.help2', undefined, { block: true })}</li>
            <li>{ui.t('katha.help3', undefined, { block: true })}</li>
          </ul>
          {pending.context === 'battle' ? <AutoReciteToggle value={env.prefs.autoRecite} onChange={(on) => env.setPrefs?.({ ...env.prefs, autoRecite: on })} /> : null}
          <Button full variant="secondary" onClick={() => setHelp(false)} data-testid="recite-help-close">
            {ui.t('common.back', undefined, { gloss: false })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Ak({ text, mark, lit, now }: { text: string; mark?: string; lit: boolean; now: boolean }): ReactElement {
  return (
    <span className={cx('g-ramayana-yatra__cast-ak', lit && 'is-lit', now && 'is-now')}>
      <SaText className="g-ramayana-yatra__cast-g">{text}</SaText>
      {mark ? <i className="g-ramayana-yatra__cast-m">{mark === 'G' ? '—' : '˘'}</i> : null}
    </span>
  );
}

// ───────────────────────── battle narration ─────────────────────────

/**
 * Kathā beats stay at a learner's reading pace (v0.4.3; was 1.4 s + 30 ms per akṣara, which the owner could not
 * follow): 1.5 s for the eye to land and the hit to play, plus 180 ms per akṣara — about 5½ akṣaras a second, a
 * careful pace for a Level-3 (Paricaya) reader who still decodes conjuncts and parses endings as they read. A 16-akṣara line
 * ("भरद्वाजस्य विश्वासः न्यूनः भवति — दश।") holds 4.4 s. English counts 2.5 letters per akṣara (72 ms a letter, about
 * 170 words a minute: unhurried). At least 0.6 s after the typewriter finished; tap / A always hurries.
 */
export const BEAT_BASE_MS = 1500;
export const BEAT_PER_AKSHARA_MS = 180;

/**
 * Advances a battle beat by itself in a Kathā journey (`active`). `done`: the typewriter has finished. English lines
 * count about 2.5 letters per akṣara. Paused while the shell covers the game.
 */
export function useAutoBeat(active: boolean, text: string, textSa: string | undefined, done: boolean, onNext: () => void): void {
  const env = useEnv();
  const st = useStory(text, textSa);
  const units = st.sa ? saMarkupUnits(st.primary) : Math.ceil(markupUnits(st.primary, env.playerName) / 2.5);
  const hold = BEAT_BASE_MS + BEAT_PER_AKSHARA_MS * units;
  const t0 = useRef(performance.now());
  const doneAt = useRef<number | null>(null);
  if (done && doneAt.current === null) doneAt.current = performance.now();
  const next = useLatest(onNext);
  const paused = usePaused();
  useEffect(() => {
    if (!active || !done || paused) return;
    const nowMs = performance.now();
    const wait = Math.max(t0.current + hold - nowMs, (doneAt.current ?? nowMs) + 600 - nowMs, 0);
    const t = setTimeout(() => next.current?.(), wait);
    return () => clearTimeout(t);
  }, [active, done, paused, hold, next]);
}

/**
 * The tutorial duel's model beat (BattleBeat.model, v0.4.3): the pāda the duelist says, printed in full exactly as in
 * the verse (no gap, no input), with its place in the verse; the player says it back in the next turn.
 */
export function ModelLine({ shlokaId, pada }: { shlokaId: string; pada: number }): ReactElement | null {
  const env = useEnv();
  const ui = useUi();
  const sh = env.idx.shloka.get(shlokaId);
  const line = sh?.padas[pada];
  if (!sh || !line) {
    warnOnce('model pāda', `${shlokaId}:${pada}`);
    return null;
  }
  return (
    <figure className="g-ramayana-yatra__model" data-testid="beat-model" data-pada={pada}>
      <SaText as="div" shloka nowrap={false} className="g-ramayana-yatra__model-line" data-testid="beat-model-line">
        {line}
      </SaText>
      <figcaption className="g-ramayana-yatra__model-ref">
        <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} /> · {ui.t('challenge.line', { n: pada + 1 }, { gloss: false })}
      </figcaption>
    </figure>
  );
}

/** Used by tests / the e2e snapshot: what a smarana challenge asks (no Sanskrit leaves the content). */
export function smaranaSummary(ch: Challenge | null | undefined): { gaps: number[]; options: string[]; answers: string[]; level: number; check: boolean; pada: number; shlokaId: string } | null {
  const s = ch?.smarana;
  if (!s) return null;
  return { gaps: s.gaps, options: (s.gapOptions[0] ?? []).map((o) => o.id), answers: s.gapAnswers[0] ?? [], level: s.level, check: !!s.check, pada: s.pada, shlokaId: s.shlokaId };
}


// ───────────────────────── session result ─────────────────────────

/**
 * The session result of a Kathā journey (v0.4.1): the shell's result screen reports verses heard / lines recited /
 * verses restored, never a quiz score with ✗ (a missed word in a recitation is half power, not a wrong answer). The
 * contract is unchanged: same outcome, score, correct / total (stars), best and mastery as sessionResult; only the
 * summary, share and review change. `recited`: shlokaId → recitation lines answered this session (counted by the view).
 * The shell (outside the game) shows these in English, as it does for every game.
 */
export function kathaResult(base: SessionResult, state: GameState, content: GameContent, recited: ReadonlyMap<string, number>): SessionResult {
  const ss = state.session;
  const heard = new Set(ss.shlokasHeard);
  const restored = new Set(ss.shlokasRestored);
  const lines = [...recited.values()].reduce((a, b) => a + b, 0);
  const books = [...ss.chaptersCompleted].sort((a, b) => a - b);
  const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
  const parts = [
    books.length === 1 ? `Book ${books[0]} complete` : books.length > 1 ? `Books ${books.join(', ')} complete` : `Book ${state.save.chapter} in progress`,
    `${plural(heard.size, 'verse', 'verses')} heard`,
    `${plural(lines, 'line', 'lines')} recited`,
    `${plural(restored.size, 'verse', 'verses')} restored`,
  ];
  const summary = parts.join(' · ');
  const touched = storyOrder(content).filter((id) => heard.has(id) || restored.has(id) || recited.has(id));
  const review: ReviewItem[] = touched.flatMap((id) => {
    const sh = content.shlokas.find((x) => x.id === id);
    if (!sh) return [];
    const n = recited.get(id) ?? 0;
    const note = [heard.has(id) ? 'heard' : '', n ? `${plural(n, 'line', 'lines')} recited` : '', restored.has(id) ? 'restored' : ''].filter(Boolean).join(' · ');
    // every row is a verse the player met: nothing here is "wrong"
    return [{ sa: sh.padas[0] ?? '', en: `Vālmīki ${sh.kanda}.${sh.sarga}.${sh.verse}`, note, correct: true }];
  });
  return { ...base, summary, share: summary, review };
}
