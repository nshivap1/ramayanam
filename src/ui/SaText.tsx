import { type CSSProperties, Fragment, type ReactElement } from 'react';
import { devaToIast } from '@sanskrit';
import type { Script } from '@sdk';
import { useSettings } from './context';

export interface SaTextProps {
  /** Sanskrit in Devanagari (the authored form). */
  children: string;
  /** Force a script regardless of the user setting (e.g. a script-learning game that must show Devanagari). */
  script?: Script;
  /** Use the verse (śloka) typeface. */
  shloka?: boolean;
  /** Keep on one line (default true for short strings; pass false for verses/sentences). */
  nowrap?: boolean;
  as?: 'span' | 'div' | 'p';
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}

/** Convert Devanagari to the given display script. Pure helper for non-JSX uses (aria labels, canvas text). */
export function renderSa(deva: string, script: Script): string {
  return script === 'iast' ? devaToIast(deva) : deva;
}

/**
 * The ONLY way to put Sanskrit on screen. Renders Devanagari or IAST according to the user's
 * script setting, with the right font, `lang`, and no hyphenation or mid-akṣara wrapping.
 */
export function SaText({ children, script, shloka, nowrap, as = 'span', className, style, ...rest }: SaTextProps): ReactElement {
  const settings = useSettings();
  const s = script ?? settings.script;
  const text = renderSa(children, s);
  const oneLine = nowrap ?? !/\s/.test(children);
  const cls = ['sk-sa', s === 'iast' ? 'sk-sa--iast' : 'sk-sa--deva', shloka ? 'sk-sa--shloka' : '', oneLine ? 'sk-sa--nowrap' : '', className ?? ''].filter(Boolean).join(' ');
  const Tag = as;
  return (
    <Tag className={cls} lang={s === 'iast' ? 'sa-Latn' : 'sa-Deva'} style={style} data-testid={rest['data-testid']}>
      {text}
    </Tag>
  );
}

/**
 * Renders a string that mixes English prose with Devanagari (e.g. a sandhi rule summary):
 * every Devanagari run goes through <SaText>, so it follows the script setting and fonts.
 */
export function SaMixed({ text, script }: { text: string; script?: Script }): ReactElement {
  const parts = text.split(/([\u0900-\u097F\u1CD0-\u1CFF\u200c\u200d]+(?:[ \u00a0-][\u0900-\u097F\u1CD0-\u1CFF\u200c\u200d]+)*)/);
  return (
    <>
      {parts.map((part, i) =>
        /[\u0900-\u097F]/.test(part) ? (
          <SaText key={i} script={script} nowrap={false}>
            {part}
          </SaText>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
