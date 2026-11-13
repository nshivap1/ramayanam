/**
 * Interface text in the player's language (OWNER: orchestrator). Keys and both languages live in
 * content/sa-ui-*.json (see sa-ui.ts and notes/sa-ui.md); NEVER write an English UI string in a view.
 *
 *   const ui = useUi();
 *   <button>{ui.t('common.back')}</button>                       // ◀ Back · ◀ पृष्ठतः · both
 *   <p>{ui.t('shop.owned', { n: 3 })}</p>                         // slots: numbers, markup strings, {en, sa}
 *   <button aria-label={ui.plain('battle.run')}>…                 // plain string in the shown language
 *   {ui.num(owned)}                                               // a bare number: 12 / १२
 *   showToast(ui.en('toast.saved'), ui.sa('toast.saved'))         // a view-made toast
 *
 * Languages follow prefs.dialogueLang:
 *   'en'    → English only (exactly the old text)
 *   'sa'    → Sanskrit only (via <SaMarkup>, so it follows the Devanagari / Roman script setting)
 *   'sa-en' → Sanskrit, then the English in a small muted gloss. `{ gloss: false }` drops the gloss where space is
 *             tight (d-pad, small chips); the English then goes into a `title` tooltip only if you add one.
 * A key with no Sanskrit (sa: '') shows the English in every mode; sa-ui.test.ts fails on it.
 */
import { Fragment, type ReactElement, type ReactNode } from 'react';
import { SaText } from '@ui';
import { toDevaDigits } from '@sanskrit';
import { resolveGender, saPlayer, storySa, useEnv, warnOnce } from './view-common';
import { Markup, SaMarkup, markupPlain } from './view-markup';
import { fillSlots, type UiSlots } from './sa-ui';
import type { DialogueLang } from './types';

export interface UiOpts {
  /** sa-en only: show the English gloss after the Sanskrit (default true). */
  gloss?: boolean;
  /** sa-en only: put the gloss on its own line (headings, paragraphs). Default: inline. */
  block?: boolean;
}

export interface Ui {
  lang: DialogueLang;
  /** true when Sanskrit is shown (sa or sa-en) */
  isSa: boolean;
  /** The interface string as React nodes in the player's language. */
  t(key: string, slots?: UiSlots, opts?: UiOpts): ReactNode;
  /** Plain text in the shown language (aria-label, title, alt, announcements). sa-en → Sanskrit only. */
  plain(key: string, slots?: UiSlots): string;
  /** English, always (for logic/tests/toasts). */
  en(key: string, slots?: UiSlots): string;
  /** Sanskrit markup with {g:}/{player} resolved, or undefined (toasts: showToast(ui.en(k), ui.sa(k))). */
  sa(key: string, slots?: UiSlots): string | undefined;
  /** A bare number: Devanagari digits when Sanskrit is shown (Roman script turns them back to 0–9). */
  num(n: number): ReactNode;
  /**
   * A CONTENT string (chapter title/summary, NPC title `who`, move / item / ally / enemy description, move origin…)
   * in the player's language, looked up in content.dialogueSa by its exact English (content/sa-dialogue-4.json).
   */
  c(en: string | undefined, opts?: UiOpts): ReactNode;
  /** Plain-text form of c() (aria, title). */
  cPlain(en: string | undefined): string;
}

export function useUi(): Ui {
  const env = useEnv();
  const lang = env.prefs.dialogueLang;
  const isSa = lang !== 'en';
  const entry = (key: string) => {
    const e = env.content.ui?.[key];
    if (!e) warnOnce('ui string', key);
    return e;
  };
  const enText = (key: string, slots?: UiSlots): string => {
    const e = entry(key);
    return e ? fillSlots(e.en, slots, 'en') : key;
  };
  const saText = (key: string, slots?: UiSlots): string | undefined => {
    const e = entry(key);
    const raw = e?.sa?.trim();
    if (!raw) return undefined;
    return saPlayer(resolveGender(fillSlots(raw, slots, 'sa'), env.avatar), env.playerName, env.avatar);
  };
  return {
    lang,
    isSa,
    t(key, slots, opts) {
      const en = enText(key, slots);
      const sa = isSa ? saText(key, slots) : undefined;
      if (!sa) return <Markup text={en} bare />;
      const saEl = <SaMarkup text={sa} />;
      if (lang === 'sa' || opts?.gloss === false) return saEl;
      return (
        <Fragment>
          {saEl}
          <span className={`g-ramayana-yatra__ui-en${opts?.block ? ' is-block' : ''}`} data-testid="ui-en">
            {opts?.block ? null : ' '}
            <Markup text={en} bare />
          </span>
        </Fragment>
      );
    },
    plain(key, slots) {
      const sa = isSa ? saText(key, slots) : undefined;
      return sa ? markupPlain(sa, env, true) : markupPlain(enText(key, slots), env);
    },
    en: enText,
    sa: (key, slots) => saText(key, slots),
    num(n) {
      return isSa ? <SaText>{toDevaDigits(String(n))}</SaText> : String(n);
    },
    c(en, opts) {
      if (!en) return null;
      const sa = storySa(env.content, lang, en, env.avatar, env.playerName);
      if (!sa) return <Markup text={en} bare />;
      const saEl = <SaMarkup text={sa} />;
      if (lang === 'sa' || opts?.gloss === false) return saEl;
      return (
        <Fragment>
          {saEl}
          <span className={`g-ramayana-yatra__ui-en${opts?.block ? ' is-block' : ''}`} data-testid="ui-en">
            {opts?.block ? null : ' '}
            <Markup text={en} bare />
          </span>
        </Fragment>
      );
    },
    cPlain(en) {
      if (!en) return '';
      const sa = storySa(env.content, lang, en, env.avatar, env.playerName);
      return sa ? markupPlain(sa, env, true) : markupPlain(en, env);
    },
  };
}

/** `<Ui k="shop.title" />` — the component form of useUi().t(). */
export function UiText({ k, slots, gloss, block }: { k: string; slots?: UiSlots } & UiOpts): ReactElement {
  const ui = useUi();
  return <>{ui.t(k, slots, { gloss, block })}</>;
}
