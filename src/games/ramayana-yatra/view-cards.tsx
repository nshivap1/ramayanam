/**
 * Verse card and word card (view agent). Used by the dialogue panel (pending shloka / words),
 * the start menu (verse book / word book) and the inline {w:…} word popups.
 *
 * The chrome (toggles, hints, chips) follows the story-text language via useUi() (content/sa-ui-b.json card.*).
 * Grammar labels (the word row, the word-by-word table, the word card's part of speech, gender and forms) are
 * Sanskrit in the Sanskrit modes: content/sa-grammar.json maps each exact English label to traditional terms
 * (प्रथमा, एकवचनम्, पुंलिङ्गम्, लट्, क्त …; rules in notes/sa-grammar.md, gate grammar-sa.test.ts). sa-en adds the
 * English label as a small gloss. The meaning being taught stays English in every mode and is marked `data-en-ok`:
 * glosses, the verse translation and context (in संस्कृतम् mode behind the अर्थः toggle, closed at first), sandhi
 * notes, the source.
 */
import { type ReactElement, useState } from 'react';
import { Pill, SaText, cx } from '@ui';
import { tier } from './logic';
import { TIER_EN, VerseRef, useEnv, warnOnce } from './view-common';
import { useUi } from './view-ui';
import { SaMarkup } from './view-markup';
import saGrammarJson from './content/sa-grammar.json';
import type { SaveData } from './types';

interface SaGrammarFile {
  grammar: Record<string, string>;
  pos: Record<string, string>;
  gender: Record<string, string>;
}
const SA_GRAMMAR = saGrammarJson as unknown as SaGrammarFile;

/** The Sanskrit of a grammar label (exact English of words[].grammar / forms[].grammar), or undefined. */
function grammarSa(en: string): string | undefined {
  const sa = SA_GRAMMAR.grammar[en];
  if (!sa) warnOnce('grammar (content/sa-grammar.json)', en);
  return sa;
}

/** The Sanskrit of a lexicon part of speech (noun, verb …) or gender (m f n), or undefined. */
function posSa(pos: string): string | undefined {
  const sa = SA_GRAMMAR.pos[pos];
  if (!sa) warnOnce('part of speech (content/sa-grammar.json)', pos);
  return sa;
}
function genderSa(g: string): string | undefined {
  const sa = SA_GRAMMAR.gender[g];
  if (!sa) warnOnce('gender (content/sa-grammar.json)', g);
  return sa;
}

/**
 * A grammar label in the shown language: English (exactly as before, `data-en-ok`) in English mode or when no
 * Sanskrit exists; the Sanskrit terms (the script setting applies) in संस्कृतम्; plus the English as a small gloss in
 * संस्कृतम् + English (`block`: on its own line, for the narrow table column).
 */
function Gram({ en, as: Tag = 'span', className, block, testid }: { en: string; as?: 'span' | 'td' | 'div'; className?: string; block?: boolean; testid?: string }): ReactElement {
  const ui = useUi();
  const sa = ui.isSa ? grammarSa(en) : undefined;
  if (!sa) {
    return (
      <Tag className={className} data-en-ok="" data-testid={testid}>
        {en}
      </Tag>
    );
  }
  return (
    <Tag className={className} data-testid={testid}>
      <SaText nowrap={false}>{sa}</SaText>
      {ui.lang === 'sa-en' ? (
        <span className={cx('g-ramayana-yatra__ui-en', block && 'is-block')} data-testid="ui-en">
          {block ? null : ' '}
          {en}
        </span>
      ) : null}
    </Tag>
  );
}

export function ShlokaCard({ id, save, testid = 'shloka-card' }: { id: string; save?: SaveData; testid?: string }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const sh = env.idx.shloka.get(id);
  const [sel, setSel] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const [sandhi, setSandhi] = useState(false);
  const [line, setLine] = useState<number | null>(null);
  // संस्कृतम् only: the English translation sits behind its toggle (closed at first)
  const [showTr, setShowTr] = useState(ui.lang !== 'sa');
  if (!sh) {
    warnOnce('shloka', id);
    return (
      <div className="g-ramayana-yatra__verse" data-testid={testid} data-shloka={id}>
        <p className="sk-muted">{ui.t('card.verseMissing')}</p>
      </div>
    );
  }
  const prog = save?.shlokas[id];
  const selected = sel !== null ? sh.words[sel] : undefined;
  return (
    <div className={cx('g-ramayana-yatra__verse', prog?.restored && 'is-restored')} data-testid={testid} data-shloka={id}>
      <div className="g-ramayana-yatra__verse-head">
        <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} />
        <span className="g-ramayana-yatra__verse-head-side">
          {prog?.restored ? <Pill tone="gold">{ui.t('card.restored', undefined, { gloss: false })}</Pill> : prog?.heard ? <Pill>{ui.t('common.heard', undefined, { gloss: false })}</Pill> : null}
          <button type="button" className="g-ramayana-yatra__link" onClick={() => setShowTr(!showTr)} aria-expanded={showTr} data-testid="verse-translation-toggle">
            {showTr ? ui.t('card.hideTranslation', undefined, { gloss: false }) : ui.t('card.translation', undefined, { gloss: false })}
          </button>
        </span>
      </div>
      <div className="g-ramayana-yatra__padas">
        {sh.padas.map((p, i) => (
          <div key={i} className={cx('g-ramayana-yatra__pada-block', line === i && 'is-open')}>
            <button type="button" className="g-ramayana-yatra__pada-btn" onClick={() => setLine(line === i ? null : i)} aria-expanded={line === i} data-testid={`pada-btn-${i}`}>
              <SaText as="span" shloka nowrap={false} className="g-ramayana-yatra__pada" data-testid={`pada-${i}`}>
                {p}
              </SaText>
            </button>
            {line === i ? (
              <div className="g-ramayana-yatra__pada-words">
                {sh.words.map((w, wi) =>
                  w.pada === i ? (
                    <button key={wi} type="button" className={cx('g-ramayana-yatra__vw', sel === wi && 'is-on')} onClick={() => setSel(sel === wi ? null : wi)} data-testid={`vw-${wi}`} aria-pressed={sel === wi}>
                      <SaText>{w.form}</SaText>
                    </button>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {showTr ? (
        <p className="g-ramayana-yatra__translation" data-testid="verse-translation" data-en-ok="">
          {sh.translation}
        </p>
      ) : null}
      {selected ? (
        <div className="g-ramayana-yatra__wordrow" data-testid="verse-word">
          <SaText className="g-ramayana-yatra__wordrow-form">{selected.form}</SaText>
          <Gram en={selected.grammar} className="g-ramayana-yatra__wordrow-gram" testid="verse-word-gram" />
          <span className="g-ramayana-yatra__wordrow-gloss" data-en-ok="">
            “{selected.gloss}”
          </span>
          <button type="button" className="g-ramayana-yatra__link" onClick={() => env.openWord(selected.lexId, selected.form)} data-testid="verse-word-more">
            {ui.t('card.wordCard', undefined, { gloss: false })}
          </button>
        </div>
      ) : (
        <p className="g-ramayana-yatra__hint">{line === null ? ui.t('card.tapLine') : ui.t('card.tapWord')}</p>
      )}
      <div className="g-ramayana-yatra__verse-links">
        <button type="button" className="g-ramayana-yatra__link" onClick={() => setTable(!table)} aria-expanded={table} data-testid="verse-table-toggle">
          {table ? ui.t('card.hideWordByWord', undefined, { gloss: false }) : ui.t('card.wordByWord', undefined, { gloss: false })}
        </button>
        {sh.sandhiNotes.length ? (
          <button type="button" className="g-ramayana-yatra__link" onClick={() => setSandhi(!sandhi)} aria-expanded={sandhi} data-testid="verse-sandhi-toggle">
            {sandhi ? ui.t('card.hideSandhi', undefined, { gloss: false }) : ui.t('card.sandhi', { n: sh.sandhiNotes.length }, { gloss: false })}
          </button>
        ) : null}
      </div>
      {table ? (
        <table className="g-ramayana-yatra__wtable" data-testid="verse-table">
          <tbody>
            {sh.words.map((w, i) =>
              ui.isSa ? (
                // Sanskrit terms are longer than "acc. sg. m.": they sit under the form, so two columns fit at 360 px
                <tr key={i}>
                  <td>
                    <SaText>{w.form}</SaText>
                    <Gram en={w.grammar} as="div" className="sk-muted" block testid={`verse-table-gram-${i}`} />
                  </td>
                  <td data-en-ok="">{w.gloss}</td>
                </tr>
              ) : (
                <tr key={i}>
                  <td>
                    <SaText>{w.form}</SaText>
                  </td>
                  <Gram en={w.grammar} as="td" className="sk-muted" block />
                  <td data-en-ok="">{w.gloss}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      ) : null}
      {sandhi ? (
        <ul className="g-ramayana-yatra__sandhi" data-testid="verse-sandhi">
          {sh.sandhiNotes.map((n, i) => (
            <li key={i}>
              <span className="g-ramayana-yatra__sandhi-eq">
                <SaText>{n.joined}</SaText>
                <span aria-hidden="true"> = </span>
                {n.split.map((w, k) => (
                  <span key={k}>
                    {k ? <span aria-hidden="true"> + </span> : null}
                    <SaText>{w}</SaText>
                  </span>
                ))}
              </span>
              <span className="g-ramayana-yatra__context" data-en-ok="">
                {n.note}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {showTr || ui.lang !== 'sa' ? (
        <p className="g-ramayana-yatra__context" data-en-ok="">
          {sh.context}
        </p>
      ) : null}
      {sh.provenance.sources[0] ? (
        <p className="g-ramayana-yatra__source">
          {ui.isSa ? (
            // the edition's name is a citation and stays as written (data-en-ok)
            (ui.sa('card.source', { name: '\u0001' }) ?? '').split('\u0001').map((part, i) =>
              i ? (
                <span key={i}>
                  <span data-en-ok="">{sh.provenance.sources[0]?.name}</span>
                  {part ? <SaMarkup text={part} /> : null}
                </span>
              ) : part ? (
                <SaMarkup key={i} text={part} />
              ) : null,
            )
          ) : (
            ui.en('card.source', { name: sh.provenance.sources[0].name })
          )}
        </p>
      ) : null}
    </div>
  );
}

export function WordCard({ lexId, save, testid = 'word-card', highlight }: { lexId: string; save?: SaveData; testid?: string; highlight?: string }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const e = env.idx.lex.get(lexId);
  if (!e) {
    warnOnce('lexicon', lexId);
    return (
      <div className="g-ramayana-yatra__word" data-testid={testid}>
        <p className="sk-muted">{ui.t('card.unknownWord')}</p>
      </div>
    );
  }
  const t = save ? tier(save, lexId) : undefined;
  const tierName = t ? env.idx.name.get(`tier.${t}`) : undefined;
  // Sanskrit part of speech and gender (only when both are known, so the line is never half English)
  const posSaText = ui.isSa ? posSa(e.pos) : undefined;
  const genderSaText = ui.isSa && e.gender ? genderSa(e.gender) : undefined;
  const pos = posSaText && (!e.gender || genderSaText) ? posSaText : undefined;
  const gender = pos ? genderSaText : undefined;
  return (
    <div className="g-ramayana-yatra__word" data-testid={testid} data-lex={lexId}>
      <div className="g-ramayana-yatra__word-head">
        <SaText className="g-ramayana-yatra__word-lemma">{e.lemma}</SaText>
        {t ? (
          <span className={cx('g-ramayana-yatra__tier', `is-${t}`)}>
            {tierName ? <SaText>{tierName.sa}</SaText> : null} {tierName && ui.lang === 'sa' ? null : TIER_EN[t]}
          </span>
        ) : null}
      </div>
      {pos ? (
        <div className="g-ramayana-yatra__word-meaning">
          <span data-en-ok="">{e.meaning}</span>
          <span className="sk-muted" data-testid="word-pos">
            {' '}
            · <SaText>{pos}</SaText>
            {gender ? (
              <>
                {' ('}
                <SaText>{gender}</SaText>)
              </>
            ) : null}
            {ui.lang === 'sa-en' ? (
              <span className="g-ramayana-yatra__ui-en" data-testid="ui-en">
                {' '}
                {e.pos}
                {e.gender ? ` (${e.gender})` : ''}
              </span>
            ) : null}
          </span>
        </div>
      ) : (
        <div className="g-ramayana-yatra__word-meaning" data-en-ok="">
          {e.meaning}
          <span className="sk-muted">
            {' '}
            · {e.pos}
            {e.gender ? ` (${e.gender})` : ''}
          </span>
        </div>
      )}
      {e.notes ? (
        <p className="g-ramayana-yatra__context" data-en-ok="">
          {e.notes}
        </p>
      ) : null}
      {e.forms.length ? (
        <ul className="g-ramayana-yatra__forms">
          {e.forms.map((f, i) => (
            <li key={i} className={cx(highlight && f.form === highlight && 'is-on')} data-testid={highlight && f.form === highlight ? 'word-form-highlight' : undefined}>
              <SaText>{f.form}</SaText>{' '}
              <Gram en={f.grammar} className="sk-muted" />
              {f.shlokaIds.map((sid) => {
                const sh = env.idx.shloka.get(sid);
                return sh ? (
                  <button key={sid} type="button" className="g-ramayana-yatra__link" onClick={() => env.openShloka(sid)} data-testid={`form-ref-${sid}`}>
                    <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} />
                  </button>
                ) : null;
              })}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
