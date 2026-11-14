/**
 * The book-complete screen (v0.5a, fx-end). Shown at the first calm moment after a book (kāṇḍa) is complete, before
 * anything from the shell: the book's name ("बालकाण्डं समाप्तम्"), one line of what happened, the three numbers with
 * what each one means and why it matters, the book's verses with their state, and two ways on:
 *   primary   "अयोध्याकाण्डं प्रति ▶" — the story goes on in this session, straight into the next book's opening
 *             (logic `next-book`); A / Z / Enter;
 *   secondary "अद्य अलम्" — then (and only then) ctx.finish: the shell's result screen; the save resumes in the next book.
 * Book 6 never shows it (its ending has its own finish), but without a next book only the second button is offered.
 * Covers the whole game frame (canvas and panel); body scrolls, the buttons stay in a footer. Text: notes/sa-ui.md.
 */
import { type ReactElement, useEffect, useState } from 'react';
import { Button, Pill, SaText } from '@ui';
import { type BookMark, astrasOf, bookName, bookStats } from './bookend';
import { isKatha } from './view-katha';
import { VerseRef, useButtons, useEnv } from './view-common';
import { useUi } from './view-ui';
import type { GameState } from './types';

/** A keypress or tap this soon after the screen appears is ignored (the player may still be pressing ▶ on the last line). */
export const BOOK_END_ARM_MS = 700;

const STORY: Record<number, string> = { 1: 'bookEnd.story1', 2: 'bookEnd.story2', 3: 'bookEnd.story3', 4: 'bookEnd.story4', 5: 'bookEnd.story5' };

interface Props {
  kanda: number;
  state: GameState;
  mark: BookMark;
  recitedNow: number;
  /** null when there is no next book (then only "stop" is offered) */
  onNext: (() => void) | null;
  onStop: () => void;
}

export function BookEnd({ kanda, state, mark, recitedNow, onNext, onStop }: Props): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), BOOK_END_ARM_MS);
    return () => clearTimeout(t);
  }, []);
  const next = (): void => {
    if (armed) (onNext ?? onStop)();
  };
  const stop = (): void => {
    if (armed) onStop();
  };
  useButtons({ a: next });
  const katha = isKatha(state.save);
  const st = bookStats(state, env.content, kanda, mark, recitedNow);
  const name = bookName(env.content, kanda);
  const nextName = onNext ? bookName(env.content, kanda + 1) : null;
  const total = st.verses.length;
  const story = STORY[kanda];
  const rows = [
    { id: 'heard', n: st.heard, of: total, label: 'bookEnd.heard', why: 'bookEnd.heardWhy' },
    katha ? { id: 'recited', n: st.recited, of: null, label: 'bookEnd.recited', why: 'bookEnd.recitedWhy' } : { id: 'answers', n: st.correct, of: st.answered, label: 'bookEnd.answers', why: 'bookEnd.answersWhy' },
    { id: 'restored', n: st.restored, of: total, label: 'bookEnd.restored', why: 'bookEnd.restoredWhy' },
  ];
  return (
    <div className="g-ramayana-yatra__bookend" role="dialog" aria-modal="true" aria-labelledby="ry-bookend-title" data-testid="panel-chapter-done" data-kanda={kanda} data-armed={armed ? '' : undefined}>
      <div className="g-ramayana-yatra__bookend-scroll g-ramayana-yatra__card-scroll">
        <header className="g-ramayana-yatra__bookend-head">
          <p className="g-ramayana-yatra__eyebrow">{ui.t('chapter.bookOf', { n: kanda, total: 6 }, { gloss: false })}</p>
          <h2 id="ry-bookend-title" className="g-ramayana-yatra__bookend-title" data-testid="book-end-title">
            {ui.t('bookEnd.title', { book: { en: name.en, sa: name.saPada } }, { block: true })}
          </h2>
          {story ? (
            <p className="g-ramayana-yatra__bookend-story" data-testid="book-end-story">
              {ui.t(story, undefined, { block: true })}
            </p>
          ) : null}
        </header>
        <section className="g-ramayana-yatra__bookend-sec" aria-labelledby="ry-bookend-nums">
          <p id="ry-bookend-nums" className="g-ramayana-yatra__eyebrow">
            {ui.t('bookEnd.inBook')}
          </p>
          <ul className="g-ramayana-yatra__bookend-stats">
            {rows.map((r) => (
              <li key={r.id} className="g-ramayana-yatra__bookend-stat" data-testid={`book-end-${r.id}`} data-n={r.n} data-of={r.of ?? undefined}>
                <span className="g-ramayana-yatra__bookend-num" aria-hidden="true">
                  {ui.num(r.n)}
                  {r.of !== null ? (
                    <span className="g-ramayana-yatra__bookend-of">
                      {' / '}
                      {ui.num(r.of)}
                    </span>
                  ) : null}
                </span>
                <span className="g-ramayana-yatra__bookend-text">
                  <strong className="g-ramayana-yatra__bookend-label">{ui.t(r.label, undefined, { block: true })}</strong>
                  <span className="g-ramayana-yatra__bookend-why">{ui.t(r.why, undefined, { block: true })}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="g-ramayana-yatra__bookend-sec" aria-labelledby="ry-bookend-verses">
          <p id="ry-bookend-verses" className="g-ramayana-yatra__eyebrow">
            {ui.t('bookEnd.verses')}
          </p>
          <div className="g-ramayana-yatra__bookend-verses" data-testid="book-end-verses">
            {st.verses.map((id) => {
              const s = env.content.shlokas.find((x) => x.id === id);
              if (!s) return null;
              const p = state.save.shlokas[id];
              const astras = astrasOf(env.content, id);
              const astra = astras.length ? <span className="g-ramayana-yatra__bookend-astra">{ui.t('bookEnd.astra', { move: astras.map((m) => `{n:move.${m}}`).join(' · ') }, { gloss: false })}</span> : null;
              const ref = <VerseRef kanda={s.kanda} sarga={s.sarga} verse={s.verse} />;
              if (!p?.heard)
                return (
                  <div key={id} className="g-ramayana-yatra__verse-btn is-locked" data-testid={`book-end-verse-${id}`} data-state="new">
                    <span className="g-ramayana-yatra__move-name">
                      <span>???</span>
                      <span className="g-ramayana-yatra__move-meta">
                        {ref}
                        {astra}
                      </span>
                    </span>
                    <Pill>{ui.t('bookEnd.notHeard', undefined, { gloss: false })}</Pill>
                  </div>
                );
              return (
                <button key={id} type="button" className={`g-ramayana-yatra__verse-btn${p.restored ? ' is-restored' : ''}`} onClick={() => env.openShloka(id)} data-testid={`book-end-verse-${id}`} data-state={p.restored ? 'restored' : 'heard'}>
                  <span className="g-ramayana-yatra__move-name">
                    <SaText shloka nowrap={false}>
                      {s.padas[0] ?? ''}
                    </SaText>
                    <span className="g-ramayana-yatra__move-meta">
                      {ref}
                      {astra}
                    </span>
                  </span>
                  {p.restored ? <Pill tone="gold">{ui.t('verses.restored', undefined, { gloss: false })}</Pill> : <Pill>{ui.t('common.heard', undefined, { gloss: false })}</Pill>}
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <footer className="g-ramayana-yatra__bookend-foot">
        {onNext && nextName ? (
          <Button full onClick={next} data-testid="chapter-next" disabled={!armed}>
            {ui.t('bookEnd.next', { book: { en: nextName.en, sa: nextName.saPada } }, { block: true })}
          </Button>
        ) : null}
        <Button full variant={onNext ? 'ghost' : 'primary'} onClick={stop} data-testid="chapter-finish" disabled={!armed}>
          {onNext ? ui.t('bookEnd.stop', undefined, { block: true }) : ui.t('chapter.results', undefined, { block: true })}
        </Button>
        <p className="g-ramayana-yatra__bookend-note">{ui.t('menu.restNote', undefined, { block: true })}</p>
      </footer>
    </div>
  );
}
