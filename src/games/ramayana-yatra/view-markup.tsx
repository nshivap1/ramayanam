/**
 * Inline markup renderer for story text (view agent).
 *   {w:lexId}  → tappable <SaText> of the lexicon lemma (opens its word card)
 *   {n:nameId} → <SaText> of a names.json entry
 *   {player}   → the player's display name (English)
 *   {b:text}   → emphasis
 *   {f:shlokaId:wordIndex} → the exact inflected form `shloka.words[wordIndex].form` (tappable: opens the
 *                word card of its lexId with that form highlighted)
 * Unknown ids render nothing (logged once). `limit` reveals only the first N "units" (typewriter):
 * one unit per English character, one per Sanskrit token.
 *
 * `<SaMarkup>` is the variant for Sambhāṣaṇa story lines (content.dialogueSa): every plain-text run goes
 * through <SaText> (so it follows the player's script), and the typewriter unit is the akṣara
 * (`splitAksharas`), never the code point, so a conjunct is never half drawn. The unrevealed rest is laid
 * out invisibly, so lines never re-wrap while typing. `<StoryLine>` picks English / Sanskrit / both from
 * the player's dialogue-language setting.
 */
import { Fragment, type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { SaText, renderSa } from '@ui';
import { splitAksharas } from '@sanskrit';
import { type ViewEnv, nameOf, resolveGender, saPlayer, storySa, useEnv, warnOnce } from './view-common';
import type { ShlokaWord } from './types';
import saGrammar from './content/sa-grammar.json'; // grammar labels in Sanskrit (ui-g: aria of {f:…} only)

export type Tok = { t: 'text'; s: string } | { t: 'w'; id: string } | { t: 'n'; id: string } | { t: 'player' } | { t: 'b'; s: string } | { t: 'f'; shloka: string; index: number };

const RE = /\{(w|n|b|f):([^}]*)\}|\{player\}/g;

const cache = new Map<string, Tok[]>();
export function parseMarkup(src: string): Tok[] {
  const hit = cache.get(src);
  if (hit) return hit;
  const out: Tok[] = [];
  let last = 0;
  for (const m of src.matchAll(RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: 'text', s: src.slice(last, i) });
    if (m[0] === '{player}') out.push({ t: 'player' });
    else if (m[1] === 'w') out.push({ t: 'w', id: (m[2] ?? '').trim() });
    else if (m[1] === 'n') out.push({ t: 'n', id: (m[2] ?? '').trim() });
    else if (m[1] === 'f') {
      const v = (m[2] ?? '').trim();
      const cut = v.lastIndexOf(':');
      out.push({ t: 'f', shloka: cut > 0 ? v.slice(0, cut) : v, index: cut > 0 ? Number(v.slice(cut + 1)) : Number.NaN });
    }
    else out.push({ t: 'b', s: m[2] ?? '' });
    last = i + m[0].length;
  }
  if (last < src.length) out.push({ t: 'text', s: src.slice(last) });
  if (cache.size > 500) cache.clear();
  cache.set(src, out);
  return out;
}

function tokUnits(t: Tok, player: string): number {
  if (t.t === 'text' || t.t === 'b') return [...t.s].length;
  if (t.t === 'player') return [...player].length;
  return 1;
}

export function markupUnits(src: string, player: string): number {
  return parseMarkup(src).reduce((n, t) => n + tokUnits(t, player), 0);
}

const akCache = new Map<string, string[]>();
/** Akṣaras of a Sanskrit text run, separators (spaces, punctuation) kept as their own items. */
export function aksharaRun(s: string): string[] {
  const hit = akCache.get(s);
  if (hit) return hit;
  let out: string[];
  try {
    out = splitAksharas(s, { keepSeparators: true });
    if (out.join('') !== s.normalize('NFC')) out = [...s]; // never drop characters
  } catch {
    out = [...s];
  }
  if (akCache.size > 500) akCache.clear();
  akCache.set(s, out);
  return out;
}

/** Typewriter units of a Sanskrit line: one per akṣara / separator run; a name, word or {player} is one unit. */
function saTokUnits(t: Tok): number {
  if (t.t === 'text' || t.t === 'b') return aksharaRun(t.s).length;
  return 1;
}

export function saMarkupUnits(src: string): number {
  return parseMarkup(src).reduce((n, t) => n + saTokUnits(t), 0);
}

/**
 * Plain string for aria labels / announcements (Sanskrit converted to the user's script). `sa`: the text runs are
 * Sanskrit too (a Sambhāṣaṇa line), so they are converted as well.
 */
export function markupPlain(src: string, env: Pick<ViewEnv, 'idx' | 'script' | 'playerName'>, sa = false): string {
  return parseMarkup(src)
    .map((t) => {
      if (t.t === 'text' || t.t === 'b') return sa ? renderSa(t.s, env.script) : t.s;
      if (t.t === 'player') return env.playerName;
      if (t.t === 'w') {
        const e = env.idx.lex.get(t.id);
        return e ? renderSa(e.lemma, env.script) : '';
      }
      if (t.t === 'f') {
        const w = verseWord(env.idx, t.shloka, t.index);
        return w ? renderSa(w.form, env.script) : '';
      }
      const n = env.idx.name.get(t.id);
      return n ? renderSa(n.sa, env.script) : '';
    })
    .join('');
}

/** The word at `index` of a verse, or undefined (unknown verse / out of range → render nothing). */
export function verseWord(idx: ViewEnv['idx'], shlokaId: string, index: number): ShlokaWord | undefined {
  const sh = idx.shloka.get(shlokaId);
  if (!sh) {
    warnOnce('shloka', shlokaId);
    return undefined;
  }
  if (!Number.isInteger(index) || index < 0 || index >= sh.words.length) {
    warnOnce('verse word', `${shlokaId}:${index}`);
    return undefined;
  }
  return sh.words[index];
}

export function Markup({ text, limit, testid, bare }: { text: string; limit?: number; testid?: string; bare?: boolean }): ReactElement {
  const env = useEnv();
  const toks = parseMarkup(text);
  let budget = limit ?? Number.POSITIVE_INFINITY;
  const parts: ReactElement[] = [];
  toks.forEach((t, i) => {
    if (budget <= 0) return;
    const units = tokUnits(t, env.playerName);
    const take = Math.min(units, budget);
    budget -= units;
    if (t.t === 'text') parts.push(<Fragment key={i}>{[...t.s].slice(0, take).join('')}</Fragment>);
    else if (t.t === 'b') parts.push(<strong key={i}>{[...t.s].slice(0, take).join('')}</strong>);
    else if (t.t === 'player') parts.push(<strong key={i} className="g-ramayana-yatra__player">{[...env.playerName].slice(0, take).join('')}</strong>);
    else if (t.t === 'w') {
      const e = env.idx.lex.get(t.id);
      if (!e) {
        warnOnce('lexicon', t.id);
        return;
      }
      parts.push(
        <button
          key={i}
          type="button"
          className="g-ramayana-yatra__w"
          onClick={(ev) => {
            ev.stopPropagation();
            env.openWord(t.id);
          }}
          data-testid={`w-${t.id}`}
          aria-label={`${renderSa(e.lemma, env.script)}: ${e.meaning}`}
        >
          <SaText>{e.lemma}</SaText>
        </button>,
      );
    } else if (t.t === 'f') {
      const w = verseWord(env.idx, t.shloka, t.index);
      if (!w) return;
      const e = env.idx.lex.get(w.lexId);
      parts.push(
        <button
          key={i}
          type="button"
          className="g-ramayana-yatra__w g-ramayana-yatra__w--form"
          onClick={(ev) => {
            ev.stopPropagation();
            env.openWord(w.lexId, w.form);
          }}
          data-testid={`f-${t.shloka}-${t.index}`}
          aria-label={`${renderSa(w.form, env.script)}: ${(() => {
            const g = env.prefs.dialogueLang !== 'en' ? (saGrammar.grammar as Record<string, string | undefined>)[w.grammar] : undefined;
            return g ? renderSa(g, env.script) : w.grammar;
          })()}${e ? `, ${e.meaning}` : ''}`}
        >
          <SaText>{w.form}</SaText>
        </button>,
      );
    } else {
      const n = nameOf(env.idx, t.id);
      if (!n) return;
      parts.push(<SaText key={i} className="g-ramayana-yatra__name">{n.sa}</SaText>);
    }
  });
  if (bare) return <>{parts}</>;
  return <span data-testid={testid}>{parts}</span>;
}

/** Sanskrit run split at an akṣara boundary: the revealed part, then the rest laid out invisibly (stable wrapping). */
function SaRun({ s, take }: { s: string; take: number }): ReactElement {
  const ak = aksharaRun(s);
  if (take >= ak.length) return <SaText nowrap={false}>{s}</SaText>;
  const shown = ak.slice(0, Math.max(0, take)).join('');
  const rest = ak.slice(Math.max(0, take)).join('');
  return (
    <>
      {shown ? <SaText nowrap={false}>{shown}</SaText> : null}
      <span className="g-ramayana-yatra__ghost" aria-hidden="true">
        <SaText nowrap={false}>{rest}</SaText>
      </span>
    </>
  );
}

/**
 * Markup for a Sanskrit (Sambhāṣaṇa) line: plain-text and {b:} runs render through <SaText>; {player}, {w:},
 * {n:} and {f:} work as in <Markup>. `limit` counts akṣaras (see saMarkupUnits).
 */
export function SaMarkup({ text, limit, testid }: { text: string; limit?: number; testid?: string }): ReactElement {
  const env = useEnv();
  const toks = parseMarkup(text);
  let budget = limit ?? Number.POSITIVE_INFINITY;
  const parts: ReactElement[] = [];
  toks.forEach((t, i) => {
    const units = saTokUnits(t);
    const take = Math.max(0, Math.min(units, budget));
    budget -= units;
    let el: ReactNode = null;
    if (t.t === 'text') el = <SaRun s={t.s} take={take} />;
    else if (t.t === 'b')
      el = (
        <strong>
          <SaRun s={t.s} take={take} />
        </strong>
      );
    else {
      el = <Markup text={tokSource(t)} bare />;
      if (take < units) el = <span className="g-ramayana-yatra__ghost" aria-hidden="true">{el}</span>;
    }
    parts.push(<Fragment key={i}>{el}</Fragment>);
  });
  return (
    <span className={`g-ramayana-yatra__sa-line ${env.script === 'iast' ? 'is-iast' : 'is-deva'}`} data-testid={testid}>
      {parts}
    </span>
  );
}

/** Markup source of one non-text token (re-rendered by <Markup>, so {w:}/{f:}/{n:}/{player} behave the same). */
function tokSource(t: Tok): string {
  if (t.t === 'player') return '{player}';
  if (t.t === 'w') return `{w:${t.id}}`;
  if (t.t === 'n') return `{n:${t.id}}`;
  if (t.t === 'f') return `{f:${t.shloka}:${t.index}}`;
  return t.t === 'b' ? `{b:${t.s}}` : t.s;
}

/** What a story line shows for the player's dialogue-language setting. */
export interface StoryRender {
  /** The text the typewriter runs over (Sanskrit when shown, else English). */
  primary: string;
  /** The Sanskrit line, or null (English mode, or not translated yet → English, silently). */
  sa: string | null;
  /** Show the English under the Sanskrit (sa-en). */
  both: boolean;
}

/**
 * `saText`: a Sanskrit line that comes with the English (a battle beat's `textSa`) instead of a dialogueSa lookup;
 * its `{g:masc|fem}` words follow the avatar like a story line's.
 */
export function useStory(en: string, saText?: string): StoryRender {
  const env = useEnv();
  const own = saText?.trim();
  const sa = own ? (env.prefs.dialogueLang === 'en' ? null : saPlayer(resolveGender(own, env.avatar), env.playerName, env.avatar)) : storySa(env.content, env.prefs.dialogueLang, en, env.avatar, env.playerName);
  return { primary: sa ?? en, sa, both: !!sa && env.prefs.dialogueLang === 'sa-en' };
}

/**
 * One story string (say line, choice prompt/option, objective, sign, battle intro, enemy line) in the player's
 * dialogue language. With `typed` (from useStoryTypewriter) the primary line types out; in sa-en the English
 * appears under the Sanskrit once it is complete (its space is reserved, so nothing jumps).
 */
export function StoryLine({ en, sa, typed, testid, noGloss }: { en: string; sa?: string; typed?: { limit: number; done: boolean }; testid?: string; /** sa-en: show the Sanskrit only (Kathā choice options: the English would give the answer away) */ noGloss?: boolean }): ReactElement {
  const st = useStory(en, sa);
  if (!st.sa) return <Markup text={en} limit={typed?.limit} testid={testid} />;
  const saEl = <SaMarkup text={st.sa} limit={typed?.limit} testid="story-sa" />;
  if (!st.both || noGloss)
    return (
      <span className="g-ramayana-yatra__story is-sa" data-testid={testid} data-lang="sa">
        {saEl}
      </span>
    );
  return (
    <span className="g-ramayana-yatra__story is-sa-en" data-testid={testid} data-lang="sa-en">
      {saEl}
      <span className={`g-ramayana-yatra__story-en${typed && !typed.done ? ' is-pending' : ''}`} data-testid="story-en">
        <Markup text={en} />
      </span>
    </span>
  );
}

const SPEED_MS: Record<string, number> = { slow: 45, normal: 24, fast: 10, instant: 0 };
/** Akṣaras carry more than letters: type them a little slower than English characters. */
const SA_FACTOR = 2.2;

/**
 * Typewriter over markup units. Returns the current limit, whether it is complete, and `skip()`.
 * Restarts whenever `text` changes. Reduced motion / instant speed → complete immediately.
 * `sa`: the text is a Sanskrit line (units are akṣaras, see saMarkupUnits).
 */
export function useTypewriter(text: string, sa = false): { limit: number; done: boolean; skip: () => void } {
  const env = useEnv();
  const total = useMemo(() => (sa ? saMarkupUnits(text) : markupUnits(text, env.playerName)), [text, sa, env.playerName]);
  const base = env.reduced ? 0 : (SPEED_MS[env.prefs.textSpeed] ?? 24);
  const ms = sa ? Math.round(base * SA_FACTOR) : base;
  const key = `${sa ? 'sa' : 'en'}|${text}`;
  const [st, setSt] = useState<{ key: string; n: number }>({ key, n: ms === 0 ? total : 0 });
  const n = useRef(0);
  useEffect(() => {
    n.current = ms === 0 ? total : 0;
    setSt({ key, n: n.current });
    if (ms === 0) return;
    const id = setInterval(() => {
      if (n.current >= total) {
        clearInterval(id);
        return;
      }
      n.current += 1;
      setSt({ key, n: n.current });
    }, ms);
    return () => clearInterval(id);
  }, [key, total, ms]);
  const shown = st.key === key ? st.n : ms === 0 ? total : 0;
  return {
    limit: shown,
    done: shown >= total,
    skip: () => {
      n.current = total;
      setSt({ key, n: total });
    },
  };
}

/** Typewriter for a story line in the player's dialogue language (akṣara units when the Sanskrit is shown). */
export function useStoryTypewriter(en: string, sa?: string): { limit: number; done: boolean; skip: () => void } {
  const st = useStory(en, sa);
  return useTypewriter(st.primary, !!st.sa);
}
