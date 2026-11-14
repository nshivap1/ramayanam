/**
 * The book-complete screen (v0.5a, fx-end). Shown at the first calm moment after a book (kāṇḍa) is complete, before
 * anything from the shell: the book's name ("बालकाण्डं समाप्तम्"), one line of what happened, the three numbers with
 * what each one means and why it matters, the book's verses with their state, and two ways on:
 *   primary   "अयोध्याकाण्डं प्रति ▶" — the story goes on in this session, straight into the next book's opening
 *             (logic `next-book`); A / Z / Enter;
 *   secondary "अद्य अलम्" — then (and only then) ctx.finish: the shell's result screen; the save resumes in the next book.
 * Book 6 never shows it (its ending has its own finish), but without a next book only the second button is offered.
 * Covers the whole game frame (canvas and panel); body scrolls, the buttons stay in a footer. Text: notes/sa-ui.md.
 *
 * v0.5b P2 (`{ "book": n }`, logic-scene): `review` — the same screen as a read-only review of one book inside the
 * panel (the canvas stays visible), with one button, ▶ continue (`book-continue`, A / Z / Enter): the script goes on.
 * Test id `book-review` (never `panel-chapter-done`, which the e2e bots read as "a book is complete").
 *
 * v0.5b WP-D (plan §5.5): `KathaEnding` — the ending panel of the Kathā journey, after the Lava–Kuśa court recital: the
 * three numbers of the whole journey (verses heard / 21, lines recited this session, verses restored / 21) and ALL the
 * verses, book by book, each with its state (restored · heard · not heard) and the lines recited of it this session.
 * The same frame, button and test ids as the practice ending (`panel-ending`, `ending-finish`; rows `ending-verse-<id>`
 * with data-state), plus `data-katha`. view-panel's EndingPanel routes a Kathā save here (integration request).
 */
import { type ReactElement, useEffect, useState } from 'react';
import { Button, Pill, SaText } from '@ui';
import { type BookMark, astrasOf, bookName, bookStats } from './bookend';
import { manifest } from './manifest';
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
  /** v0.5b P2: a read-only review (the story's `{book}` command): one ▶ continue button, which calls `onStop` */
  review?: boolean;
}

export function BookEnd({ kanda, state, mark, recitedNow, onNext, onStop, review = false }: Props): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), BOOK_END_ARM_MS);
    return () => clearTimeout(t);
  }, []);
  const next = (): void => {
    if (armed) (review ? onStop : (onNext ?? onStop))();
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
    <div className={`g-ramayana-yatra__bookend${review ? ' is-review' : ''}`} role={review ? 'region' : 'dialog'} aria-modal={review ? undefined : true} aria-labelledby="ry-bookend-title" data-testid={review ? 'book-review' : 'panel-chapter-done'} data-kanda={kanda} data-armed={armed ? '' : undefined}>
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
      {review ? (
        <footer className="g-ramayana-yatra__bookend-foot">
          <Button full onClick={next} data-testid="book-continue" disabled={!armed}>
            {ui.t('common.continue', undefined, { block: true })}
          </Button>
        </footer>
      ) : (
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
      )}
    </div>
  );
}

/**
 * v0.5b (WP-D): the Kathā ending — every verse of the journey with its state, book by book, and the lines recited.
 * `recited`: this session's recitation lines per verse (view-panel's PanelProps.recited).
 */
export function KathaEnding({ state, recited, onFinish }: { state: GameState; recited?: ReadonlyMap<string, number>; onFinish: () => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  useButtons({ a: onFinish });
  const books = [...env.content.chapters].sort((a, b) => a.kanda - b.kanda);
  const all = books.flatMap((c) => c.shlokaIds).filter((id) => env.content.shlokas.some((x) => x.id === id));
  const sh = state.save.shlokas;
  const heard = all.filter((id) => sh[id]?.heard).length;
  const restored = all.filter((id) => sh[id]?.restored).length;
  const lines = [...(recited?.values() ?? [])].reduce((a, b) => a + b, 0);
  const rows = [
    { id: 'heard', n: heard, of: all.length, label: 'bookEnd.heard' },
    { id: 'recited', n: lines, of: null, label: 'bookEnd.recited' },
    { id: 'restored', n: restored, of: all.length, label: 'bookEnd.restored' },
  ];
  return (
    <div className="g-ramayana-yatra__card-panel" data-testid="panel-ending" data-katha="true">
      <div className="g-ramayana-yatra__card-scroll g-ramayana-yatra__credits">
        <p className="g-ramayana-yatra__eyebrow">{ui.t('end.title')}</p>
        <p>{ui.t('end.thanks', undefined, { block: true })}</p>
        <ul className="g-ramayana-yatra__bookend-stats g-ramayana-yatra__kend-stats">
          {rows.map((r) => (
            <li key={r.id} className="g-ramayana-yatra__bookend-stat" data-testid={`ending-${r.id}`} data-n={r.n} data-of={r.of ?? undefined}>
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
              </span>
            </li>
          ))}
        </ul>
        <p className="g-ramayana-yatra__eyebrow">{ui.t('setu.endAll')}</p>
        <div className="g-ramayana-yatra__kend-books" data-testid="ending-verses">
          {books.map((c) => (
            <section key={c.kanda} className="g-ramayana-yatra__kend-book" data-kanda={c.kanda}>
              <p className="g-ramayana-yatra__kend-book-name">
                <SaText>{bookName(env.content, c.kanda).sa}</SaText>
              </p>
              {c.shlokaIds.map((id) => {
                const s = env.content.shlokas.find((x) => x.id === id);
                if (!s) return null;
                const p = sh[id];
                const n = recited?.get(id) ?? 0;
                const st = p?.restored ? 'restored' : p?.heard ? 'heard' : 'new';
                return (
                  <div key={id} className={`g-ramayana-yatra__verse-btn g-ramayana-yatra__kend-verse${p?.restored ? ' is-restored' : ''}${p?.heard ? '' : ' is-locked'}`} data-testid={`ending-verse-${id}`} data-state={st} data-recited={n}>
                    <span className="g-ramayana-yatra__move-name">
                      {p?.heard ? (
                        <SaText shloka nowrap={false}>
                          {s.padas[0] ?? ''}
                        </SaText>
                      ) : (
                        <span>???</span>
                      )}
                      <span className="g-ramayana-yatra__move-meta">
                        <VerseRef kanda={s.kanda} sarga={s.sarga} verse={s.verse} />
                        {n ? <span className="g-ramayana-yatra__kend-lines">{ui.t('bookEnd.resultRecited', { n }, { gloss: false })}</span> : null}
                      </span>
                    </span>
                    {p?.restored ? <Pill tone="gold">{ui.t('verses.restored', undefined, { gloss: false })}</Pill> : p?.heard ? <Pill>{ui.t('common.heard', undefined, { gloss: false })}</Pill> : <Pill>{ui.t('bookEnd.notHeard', undefined, { gloss: false })}</Pill>}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        {(manifest.credits ?? []).map((c, i) => (
          <p key={c} className="g-ramayana-yatra__source">
            {!ui.isSa ? c : i === 0 ? ui.t('end.credit1', undefined, { block: true }) : i === 1 ? ui.t('end.credit2', undefined, { block: true }) : <span data-en-ok="">{c}</span>}
          </p>
        ))}
      </div>
      <Button full onClick={onFinish} data-testid="ending-finish">
        {ui.t('end.finish', undefined, { gloss: false })}
      </Button>
    </div>
  );
}
