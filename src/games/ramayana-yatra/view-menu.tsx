/**
 * Start menu (view agent): an @ui Sheet with Party · Words · Verses ·
 * Items · Settings, plus Save and "Rest & end session". Word and verse cards open inside it.
 */
import { type KeyboardEvent, type ReactElement, type ReactNode, useState } from 'react';
import { Button, Pill, SaText, Sheet, cx } from '@ui';
import { knownMoves, maxHpOf, tier, xpToNext } from './logic';
import { HpBar, moveDescription } from './view-battle';
import { ShlokaCard, WordCard } from './view-cards';
import { DialogueLangControl, ELEMENT_EN, Name, PlayerName, TIER_EN, Term, type TextSpeed, type ViewPrefs, VerseRef, isDefaultName, termSlot, useEnv } from './view-common';
import { UiText, useUi } from './view-ui';
import { uiItemSlot } from './logic-learning';
import { AutoReciteToggle, JourneyPicker, astraBinding, isKatha, storyOrder } from './view-katha';
import type { Action, GameState, MasteryTier } from './types';
import { CutsceneEntry } from './view-cutscene'; // v0.5b WP-E
import { ToldEntries } from './view-told'; // v0.6 WP0
import { echoesOf } from './logic-told'; // v0.6 WP0

export type MenuTab = 'party' | 'words' | 'verses' | 'items' | 'settings';
export type Detail = { kind: 'word'; id: string; form?: string } | { kind: 'shloka'; id: string } | null;

export interface MenuProps {
  open: boolean;
  tab: MenuTab;
  setTab: (t: MenuTab) => void;
  onClose: () => void;
  state: GameState;
  dispatch: (a: Action) => void;
  detail: Detail;
  setDetail: (d: Detail) => void;
  prefs: ViewPrefs;
  setPrefs: (p: ViewPrefs) => void;
  soundOn: boolean;
  onSave: () => void;
  onRest: () => void;
  canUseItems: boolean;
  /** v0.5b WP-E: replay a cutscene that has been seen (the verse book's "आदित्यहृदयम् ▶") */
  onCutscene?: (id: string) => void;
  /** v0.6 WP0: replay a told cutscene that has been seen ("<title> ▶") */
  onTold?: (id: string) => void;
}

export function Menu(props: MenuProps): ReactElement | null {
  const { open, tab, setTab, onClose, detail, setDetail, state } = props;
  const env = useEnv();
  const ui = useUi();
  const [confirmRest, setConfirmRest] = useState(false);
  const words = env.idx.name.get('ui.words');
  const verses = env.idx.name.get('ui.verses');
  // each tab: its label, and the small English line under it (English mode: only under the Sanskrit-named tabs;
  // संस्कृतम् + English: under every tab; संस्कृतम्: none)
  const tabs: { id: MenuTab; label: ReactNode; en: ReactNode }[] = [
    { id: 'party', label: ui.t('menu.party', undefined, { gloss: false }), en: ui.lang === 'sa-en' ? ui.en('menu.party') : null },
    { id: 'words', label: words ? <SaText>{words.sa}</SaText> : ui.t('common.words', undefined, { gloss: false }), en: ui.lang !== 'sa' ? ui.en('common.words') : null },
    { id: 'verses', label: verses ? <SaText>{verses.sa}</SaText> : ui.t('common.verses', undefined, { gloss: false }), en: ui.lang !== 'sa' ? ui.en('common.verses') : null },
    { id: 'items', label: ui.t('menu.items', undefined, { gloss: false }), en: ui.lang === 'sa-en' ? ui.en('menu.items') : null },
    { id: 'settings', label: ui.t('menu.settings', undefined, { gloss: false }), en: ui.lang === 'sa-en' ? ui.en('menu.settings') : null },
  ];
  return (
    <Sheet title={ui.plain('menu.title')} open={open} onClose={() => (detail ? setDetail(null) : onClose())} data-testid="menu">
      <div className="g-ramayana-yatra__trap" onKeyDown={trapTab}>
      {detail ? (
        <div className="sk-stack">
          <Button variant="ghost" size="sm" className="g-ramayana-yatra__detail-back" onClick={() => setDetail(null)} data-testid="detail-back">
            <UiText k="common.back" />
          </Button>
          {detail.kind === 'word' ? <WordCard lexId={detail.id} save={state.save} highlight={detail.form} /> : <ShlokaCard id={detail.id} save={state.save} />}
        </div>
      ) : (
        <div className="g-ramayana-yatra__menu">
          <div className="g-ramayana-yatra__tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={cx('g-ramayana-yatra__tab', tab === t.id && 'is-on')} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}>
                {t.label}
                {t.en ? <span className="g-ramayana-yatra__tab-en">{t.en}</span> : null}
              </button>
            ))}
          </div>
          <div className="g-ramayana-yatra__tabpanel" role="tabpanel">
            {tab === 'party' ? <PartyTab state={state} dispatch={props.dispatch} canEdit={props.canUseItems} /> : null}
            {tab === 'words' ? <WordsTab state={state} open={(id) => setDetail({ kind: 'word', id })} /> : null}
            {tab === 'verses' ? <CutsceneEntry save={state.save} onPlay={props.onCutscene} /> : null /* v0.5b WP-E: the replay, once seen */}
            {tab === 'verses' ? <ToldEntries save={state.save} onPlay={props.onTold} /> : null /* v0.6 WP0: told cutscenes seen */}
            {tab === 'verses' ? <VersesTab state={state} open={(id) => setDetail({ kind: 'shloka', id })} /> : null}
            {tab === 'items' ? <ItemsTab {...props} /> : null}
            {tab === 'settings' ? <SettingsTab {...props} /> : null}
          </div>
          <div className="g-ramayana-yatra__menu-foot">
            <Button variant="secondary" onClick={props.onSave} data-testid="menu-save">
              <UiText k="common.save" />
            </Button>
            {confirmRest ? (
              <Button variant="ok" onClick={props.onRest} data-testid="menu-rest-confirm">
                <UiText k="menu.restConfirm" block />
              </Button>
            ) : (
              <Button onClick={() => setConfirmRest(true)} data-testid="menu-rest">
                <UiText k="menu.rest" block />
              </Button>
            )}
          </div>
          {confirmRest ? <p className="g-ramayana-yatra__hint">{ui.t('menu.restNote', undefined, { block: true })}</p> : null}
        </div>
      )}
      </div>
    </Sheet>
  );
}

/** Keep Tab focus inside the open sheet (the platform Sheet does not trap focus). */
function trapTab(e: KeyboardEvent<HTMLDivElement>): void {
  if (e.key !== 'Tab') return;
  const sheet = (e.currentTarget as HTMLElement).closest('.sk-sheet');
  if (!sheet) return;
  const items = [...sheet.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function EquipEditor({ state, index, dispatch, onDone }: { state: GameState; index: number; dispatch: (a: Action) => void; onDone: () => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const m = state.save.party[index];
  const [sel, setSel] = useState<string[]>(m?.moves ?? []);
  const [full, setFull] = useState(false);
  const all = knownMoves(state, env.content, index);
  // Kathā: a move's challenge kind is a practice mechanic; a verse-bound astra is tagged श्लोकः instead
  const katha = isKatha(state.save);
  const toggle = (id: string): void => {
    if (sel.includes(id)) {
      setSel(sel.filter((x) => x !== id));
      setFull(false);
    } else if (sel.length < 4) setSel([...sel, id]);
    else setFull(true);
  };
  return (
    <div className="sk-stack" data-testid={`equip-${m?.id ?? index}`}>
      <p className={cx('g-ramayana-yatra__hint', full && 'is-warn')} data-testid="equip-hint" aria-live="polite">
        {full ? ui.t('party.full', undefined, { block: true }) : ui.t('party.choose', { n: sel.length, max: 4 }, { block: true })}
      </p>
      <div className="g-ramayana-yatra__filters">
        {all.map((id) => {
          const mv = env.idx.move.get(id);
          return (
            <button key={id} type="button" className={cx('g-ramayana-yatra__filter g-ramayana-yatra__equip', sel.includes(id) && 'is-on')} aria-pressed={sel.includes(id)} onClick={() => toggle(id)} data-testid={`equip-move-${id}`}>
              <Name id={mv?.nameId} fallback={id} />{' '}
              <span className="g-ramayana-yatra__move-meta">{katha ? (astraBinding(env.content, id) ? ui.t('common.verse', undefined, { gloss: false }) : '') : mv ? <Term group="kind" id={mv.challenge} gloss={false} /> : ''}</span>
            </button>
          );
        })}
      </div>
      <div className="g-ramayana-yatra__row2">
        <Button size="sm" variant="secondary" onClick={onDone} data-testid="equip-cancel">
          <UiText k="common.cancel" />
        </Button>
        <Button
          size="sm"
          disabled={sel.length === 0}
          onClick={() => {
            dispatch({ type: 'equip', member: index, moves: sel });
            onDone();
          }}
          data-testid="equip-save"
        >
          <UiText k="party.equip" />
        </Button>
      </div>
    </div>
  );
}

function PartyTab({ state, dispatch, canEdit }: { state: GameState; dispatch: (a: Action) => void; canEdit: boolean }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const [editing, setEditing] = useState<number | null>(null);
  const katha = isKatha(state.save);
  return (
    <div className="sk-stack" data-testid="party">
      {state.save.party.map((m, i) => {
        const def = env.idx.ally.get(m.id);
        const max = maxHpOf(m, env.content);
        const need = xpToNext(m.level);
        return (
          <div key={`${m.id}-${i}`} className="g-ramayana-yatra__member-card" data-testid={`member-${m.id}`}>
            <div className="g-ramayana-yatra__member-head">
              <span className="g-ramayana-yatra__member-name">
                {m.id === 'player' ? (
                  <strong>
                    <PlayerName name={state.save.playerName} />
                  </strong>
                ) : null}
                {/* Sanskrit shown and the default name: शिष्यः / शिष्या already says it */}
                {m.id === 'player' && ui.isSa && isDefaultName(state.save.playerName) ? null : <Name id={def?.nameId} en={m.id !== 'player'} fallback={m.id === 'player' ? '' : m.id} />}
              </span>
              <span className="sk-muted">
                {ui.t('common.lv', undefined, { gloss: false })} {ui.num(m.level)}
              </span>
              {def ? (
                <span className={`g-ramayana-yatra__el el-${def.element}`} title={ui.isSa ? ELEMENT_EN[def.element] : undefined}>
                  <Term group="element" id={def.element} gloss={false} />
                </span>
              ) : null}
            </div>
            <div className="g-ramayana-yatra__member-hp">
              <HpBar hp={m.hp} max={max} />
              <span className="sk-small sk-muted">{ui.t('party.hpXp', { hp: m.hp, max, xp: m.xp, need }, { gloss: false })}</span>
            </div>
            {editing === i ? <EquipEditor state={state} index={i} dispatch={dispatch} onDone={() => setEditing(null)} /> : null}
            {editing !== i && canEdit && knownMoves(state, env.content, i).length > m.moves.length ? (
              <button type="button" className="g-ramayana-yatra__link" onClick={() => setEditing(i)} data-testid={`edit-moves-${m.id}`}>
                {ui.t('party.change', { n: knownMoves(state, env.content, i).length })}
              </button>
            ) : null}
            {editing === i ? null : (
            <ul className="g-ramayana-yatra__movelist">
              {m.moves.map((id) => {
                const mv = env.idx.move.get(id);
                if (katha) {
                  // Kathā: element · PP, the श्लोकः tag for an astra, and the Kathā wording of what the move does
                  const desc = moveDescription(env.content, id, true);
                  return (
                    <li key={id} className="g-ramayana-yatra__kmove-li" data-testid={`party-move-${id}`}>
                      <span className="g-ramayana-yatra__kmove-li-top">
                        <Name id={mv?.nameId} fallback={id} />
                        {astraBinding(env.content, id) ? <span className="g-ramayana-yatra__move-kind g-ramayana-yatra__astra-tag">{ui.t('common.verse', undefined, { gloss: false })}</span> : null}
                        <span className="sk-small sk-muted">{mv ? ui.t('party.moveMetaKatha', { el: termSlot('element', mv.element), pp: m.pp[id] ?? mv.pp, max: mv.pp }, { gloss: false }) : ''}</span>
                      </span>
                      {desc ? <span className="g-ramayana-yatra__move-desc">{ui.c(desc, { gloss: false })}</span> : null}
                    </li>
                  );
                }
                return (
                  <li key={id}>
                    <Name id={mv?.nameId} fallback={id} />
                    <span className="sk-small sk-muted">{mv ? ui.t('party.moveMeta', { el: termSlot('element', mv.element), kind: termSlot('kind', mv.challenge), pp: m.pp[id] ?? mv.pp, max: mv.pp }, { gloss: false }) : ''}</span>
                  </li>
                );
              })}
            </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TIERS: MasteryTier[] = ['unseen', 'seen', 'known', 'mastered'];

function WordsTab({ state, open }: { state: GameState; open: (id: string) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const [tf, setTf] = useState<MasteryTier | 'all'>('all');
  const [kf, setKf] = useState<number>(0);
  const kandaOf = (lexId: string): Set<number> => {
    const out = new Set<number>();
    for (const f of env.idx.lex.get(lexId)?.forms ?? []) for (const sid of f.shlokaIds) {
      const k = env.idx.shloka.get(sid)?.kanda;
      if (k) out.add(k);
    }
    return out;
  };
  const rank: Record<MasteryTier, number> = { mastered: 0, known: 1, seen: 2, unseen: 3 };
  const rows = env.content.lexicon
    .map((e, i) => ({ e, i, t: tier(state.save, e.id) }))
    .filter((r) => (tf === 'all' || r.t === tf) && (kf === 0 || kandaOf(r.e.id).has(kf)))
    .sort((a, b) => rank[a.t] - rank[b.t] || a.i - b.i);
  const counts = Object.fromEntries(TIERS.map((t) => [t, env.content.lexicon.filter((e) => tier(state.save, e.id) === t).length])) as Record<MasteryTier, number>;
  return (
    <div className="sk-stack" data-testid="padakosha">
      <div className="g-ramayana-yatra__filters" role="group" aria-label={ui.plain('words.filterTier')}>
        <button type="button" className={cx('g-ramayana-yatra__filter', tf === 'all' && 'is-on')} onClick={() => setTf('all')} data-testid="filter-all">
          {ui.t('words.all', { n: env.content.lexicon.length }, { gloss: false })}
        </button>
        {TIERS.map((t) => (
          <button key={t} type="button" className={cx('g-ramayana-yatra__filter', `tier-${t}`, tf === t && 'is-on')} onClick={() => setTf(t)} data-testid={`filter-${t}`} title={ui.isSa ? TIER_EN[t] : undefined}>
            <Term group="tier" id={t} gloss={false} /> {ui.num(counts[t])}
          </button>
        ))}
      </div>
      <div className="g-ramayana-yatra__filters" role="group" aria-label={ui.plain('words.filterBook')}>
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <button key={k} type="button" className={cx('g-ramayana-yatra__filter', kf === k && 'is-on')} onClick={() => setKf(k)} data-testid={`book-${k}`}>
            {k === 0 ? ui.t('words.allBooks', undefined, { gloss: false }) : ui.t('verses.book', { k }, { gloss: false })}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <p className="g-ramayana-yatra__hint">{ui.t('words.none', undefined, { block: true })}</p> : null}
      <div className="g-ramayana-yatra__wordgrid">
        {rows.map(({ e, t }) =>
          t === 'unseen' ? (
            <span key={e.id} className="g-ramayana-yatra__wordcell is-unseen" aria-label={ui.plain('words.unseen')}>
              ???
            </span>
          ) : (
            <button key={e.id} type="button" className={cx('g-ramayana-yatra__wordcell', `is-${t}`, [...e.lemma].length > 7 && 'is-long')} onClick={() => open(e.id)} data-testid={`lex-${e.id}`}>
              <SaText>{e.lemma}</SaText>
              <span className="g-ramayana-yatra__wordcell-en" data-en-ok="">
                {e.meaning}
              </span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function VersesTab({ state, open }: { state: GameState; open: (id: string) => void }): ReactElement {
  if (isKatha(state.save)) return <StoryBook state={state} open={open} />;
  return <VersesByBook state={state} open={open} />;
}

/**
 * Kathā: the verse book (पुस्तकम्) in story order, with "n / total heard" progress — v0.6: book by book (each with its own
 * "n / m heard"), so ~13 verses a book read as progress, not as gaps; books not reached yet show only their count. A
 * verse whose echo has been noticed (content/katha-echoes.json, `{ "echo" }`) carries the echo's title line.
 */
function StoryBook({ state, open }: { state: GameState; open: (id: string) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const ids = storyOrder(env.content);
  const heardOf = (xs: string[]): number => xs.filter((id) => state.save.shlokas[id]?.heard).length;
  const heard = heardOf(ids);
  const books = [...env.content.chapters].sort((a, b) => a.kanda - b.kanda).map((c) => ({ k: c.kanda, list: ids.filter((id) => env.idx.shloka.get(id)?.kanda === c.kanda) })).filter((b) => b.list.length);
  const reached = Math.max(state.save.chapter, ...books.filter((b) => heardOf(b.list) > 0).map((b) => b.k));
  return (
    <div className="sk-stack" data-testid="shlokakosha" data-order="story">
      <div className="g-ramayana-yatra__book-progress" data-testid="book-progress" data-n={heard} data-of={ids.length}>
        <span className="g-ramayana-yatra__eyebrow">{ui.t('katha.bookProgress', { n: heard, total: ids.length }, { gloss: false })}</span>
        <span className="g-ramayana-yatra__book-bar" aria-hidden="true">
          <i style={{ width: `${ids.length ? (heard / ids.length) * 100 : 0}%` }} />
        </span>
      </div>
      {books.map((b) => {
        const n = heardOf(b.list);
        const later = b.k > reached;
        return (
          <section key={b.k} className={cx('sk-stack g-ramayana-yatra__vbook', later && 'is-later')} data-testid={`verse-book-${b.k}`} data-n={n} data-of={b.list.length}>
            <div className="g-ramayana-yatra__vbook-head">
              <span className="g-ramayana-yatra__eyebrow">
                <Name id={`kanda.${b.k}`} en fallback={ui.plain('verses.book', { k: b.k })} />
              </span>
              <span className="g-ramayana-yatra__vbook-n">{ui.t('katha.bookProgress', { n, total: b.list.length }, { gloss: false })}</span>
            </div>
            {later
              ? null
              : b.list.map((id) => {
                  const s = env.idx.shloka.get(id);
                  if (!s) return null;
                  const p = state.save.shlokas[id];
                  if (!p?.heard)
                    return (
                      <div key={id} className="g-ramayana-yatra__verse-btn is-locked">
                        <span className="g-ramayana-yatra__move-name">???</span>
                        <span className="g-ramayana-yatra__move-meta">
                          <VerseRef kanda={s.kanda} sarga={s.sarga} verse={s.verse} />
                        </span>
                      </div>
                    );
                  const echoes = echoesOf(env.content, state.save.flags, id);
                  return (
                    <button key={id} type="button" className={cx('g-ramayana-yatra__verse-btn', p.restored && 'is-restored')} onClick={() => open(id)} data-testid={`verse-${id}`}>
                      <span className="g-ramayana-yatra__move-name">
                        <SaText shloka>{s.padas[0] ?? ''}</SaText>
                        <span className="g-ramayana-yatra__move-meta">
                          <VerseRef kanda={s.kanda} sarga={s.sarga} verse={s.verse} />
                        </span>
                        {echoes.map((e) => (
                          <span key={e.id} className="g-ramayana-yatra__echo" data-testid={`echo-${e.id}`}>
                            <span aria-hidden="true">↺ </span>
                            {ui.t(e.title, undefined, { gloss: false })}
                          </span>
                        ))}
                      </span>
                      {p.restored ? <Pill tone="gold">{ui.t('verses.restored', undefined, { gloss: false })}</Pill> : <Pill>{ui.t('common.heard', undefined, { gloss: false })}</Pill>}
                    </button>
                  );
                })}
          </section>
        );
      })}
    </div>
  );
}

function VersesByBook({ state, open }: { state: GameState; open: (id: string) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const byKanda = [1, 2, 3, 4, 5, 6].map((k) => ({ k, list: env.content.shlokas.filter((s) => s.kanda === k) })).filter((g) => g.list.length);
  return (
    <div className="sk-stack" data-testid="shlokakosha">
      {byKanda.length === 0 ? <p className="g-ramayana-yatra__hint">{ui.t('verses.none', undefined, { block: true })}</p> : null}
      {byKanda.map((g) => (
        <div key={g.k} className="sk-stack">
          <div className="g-ramayana-yatra__eyebrow">
            <Name id={`kanda.${g.k}`} en fallback={ui.plain('verses.book', { k: g.k })} />
          </div>
          {g.list.map((s) => {
            const p = state.save.shlokas[s.id];
            if (!p?.heard)
              return (
                <div key={s.id} className="g-ramayana-yatra__verse-btn is-locked">
                  <span className="g-ramayana-yatra__move-name">???</span>
                  <span className="g-ramayana-yatra__move-meta">
                    <VerseRef kanda={s.kanda} sarga={s.sarga} verse={s.verse} />
                  </span>
                </div>
              );
            return (
              <button key={s.id} type="button" className={cx('g-ramayana-yatra__verse-btn', p.restored && 'is-restored')} onClick={() => open(s.id)} data-testid={`verse-${s.id}`}>
                <span className="g-ramayana-yatra__move-name">
                  <SaText shloka>{s.padas[0] ?? ''}</SaText>
                  <span className="g-ramayana-yatra__move-meta">
                    <VerseRef kanda={s.kanda} sarga={s.sarga} verse={s.verse} />
                  </span>
                </span>
                {p.restored ? <Pill tone="gold">{ui.t('verses.restored', undefined, { gloss: false })}</Pill> : <Pill>{ui.t('common.heard', undefined, { gloss: false })}</Pill>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ItemsTab({ state, dispatch, canUseItems }: MenuProps): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const [using, setUsing] = useState<string | null>(null);
  const ids = Object.keys(state.save.items).filter((id) => (state.save.items[id] ?? 0) > 0);
  if (using) {
    const def = env.idx.item.get(using);
    return (
      <div className="sk-stack" data-testid="item-target">
        <p className="g-ramayana-yatra__hint">{ui.t('items.useOn', { item: uiItemSlot(env.content, using, def?.nameId ?? '') }, { block: true })}</p>
        {state.save.party.map((m, i) => {
          const ad = env.idx.ally.get(m.id);
          const max = maxHpOf(m, env.content);
          return (
            <button
              key={`${m.id}-${i}`}
              type="button"
              className="g-ramayana-yatra__member"
              onClick={() => {
                dispatch({ type: 'use-item', itemId: using, target: i });
                setUsing(null);
              }}
              data-testid={`use-on-${m.id}`}
            >
              <span className="g-ramayana-yatra__move-name">
                {m.id === 'player' ? (
                  <strong>
                    <PlayerName name={state.save.playerName} />
                  </strong>
                ) : (
                  <Name id={ad?.nameId} fallback={m.id} />
                )}
              </span>
              <span className="g-ramayana-yatra__move-side">
                <HpBar hp={m.hp} max={max} />
              </span>
            </button>
          );
        })}
        <Button variant="ghost" onClick={() => setUsing(null)} data-testid="use-cancel">
          <UiText k="common.cancel" />
        </Button>
      </div>
    );
  }
  return (
    <div className="sk-stack" data-testid="items">
      <p className="sk-small sk-muted">{ui.t('items.purse', { n: state.save.niska })}</p>
      {ids.length === 0 ? <p className="g-ramayana-yatra__hint">{ui.t('items.none', undefined, { block: true })}</p> : null}
      {ids.map((id) => {
        const def = env.idx.item.get(id);
        const usable = canUseItems && !!def && def.kind !== 'key' && def.kind !== 'buff';
        return (
          <div key={id} className="g-ramayana-yatra__shop-row">
            <span className="g-ramayana-yatra__move-name">
              <Name id={def?.nameId} en fallback={id} />
              <span className="g-ramayana-yatra__move-meta">{ui.c(def?.description, { block: true })}</span>
            </span>
            <span className="sk-muted">×{ui.num(state.save.items[id] ?? 0)}</span>
            {usable ? (
              <Button size="sm" onClick={() => setUsing(id)} data-testid={`use-${id}`}>
                <UiText k="items.use" gloss={false} />
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const SPEEDS: TextSpeed[] = ['slow', 'normal', 'fast', 'instant'];

function SettingsTab({ prefs, setPrefs, soundOn, state, dispatch, canUseItems }: MenuProps): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const speedLabel: Record<TextSpeed, ReactNode> = {
    slow: ui.t('settings.slow', undefined, { gloss: false }),
    normal: ui.t('settings.normal', undefined, { gloss: false }),
    fast: ui.t('settings.fast', undefined, { gloss: false }),
    instant: ui.t('settings.instant', undefined, { gloss: false }),
  };
  const onOff = (on: boolean): ReactNode => (on ? ui.t('settings.on', undefined, { gloss: false }) : ui.t('settings.off', undefined, { gloss: false }));
  return (
    <div className="sk-stack" data-testid="settings">
      <div className="g-ramayana-yatra__setting g-ramayana-yatra__setting--col">
        <span>{ui.t('lang.storyText')}</span>
        <DialogueLangControl value={prefs.dialogueLang} onChange={(v) => setPrefs({ ...prefs, dialogueLang: v })} idx={env.idx} />
      </div>
      <div className="g-ramayana-yatra__setting g-ramayana-yatra__setting--col" data-testid="setting-journey">
        <span>{ui.t('common.journey')}</span>
        {/* the journey can be switched only while exploring (the reducer accepts set-style in explore mode) */}
        <JourneyPicker value={state.save.style ?? 'abhyasa'} onChange={(style) => dispatch({ type: 'set-style', style })} disabled={!canUseItems} />
      </div>
      {isKatha(state.save) ? <AutoReciteToggle value={prefs.autoRecite} onChange={(on) => setPrefs({ ...prefs, autoRecite: on })} /> : null}
      {/* v0.4.2: the map pointer (both journeys; prefs-v1, never the save) */}
      <div className="g-ramayana-yatra__setting" data-testid="setting-show-way">
        <span>
          {ui.t('settings.showWay', undefined, { block: true })}
          <span className="g-ramayana-yatra__move-meta">
            {' '}
            {ui.t('settings.showWaySub', undefined, { block: true })}
          </span>
        </span>
        <Button size="sm" variant={prefs.showWay ? 'primary' : 'secondary'} onClick={() => setPrefs({ ...prefs, showWay: !prefs.showWay })} data-testid="toggle-show-way" aria-pressed={prefs.showWay}>
          {onOff(prefs.showWay)}
        </Button>
      </div>
      <div className="g-ramayana-yatra__setting">
        <span>{ui.t('settings.music')}</span>
        {soundOn ? (
          <Button size="sm" variant={prefs.music ? 'primary' : 'secondary'} onClick={() => setPrefs({ ...prefs, music: !prefs.music })} data-testid="toggle-music" aria-pressed={prefs.music}>
            {onOff(prefs.music)}
          </Button>
        ) : (
          <span className="sk-small sk-muted">{ui.t('settings.soundOff', undefined, { block: true })}</span>
        )}
      </div>
      <div className="g-ramayana-yatra__setting">
        <span>{ui.t('settings.speed', undefined, { block: true })}</span>
        <div className="g-ramayana-yatra__filters">
          {SPEEDS.map((id) => (
            <button key={id} type="button" className={cx('g-ramayana-yatra__filter', prefs.textSpeed === id && 'is-on')} onClick={() => setPrefs({ ...prefs, textSpeed: id })} data-testid={`speed-${id}`}>
              {speedLabel[id]}
            </button>
          ))}
        </div>
      </div>
      <div className="g-ramayana-yatra__setting">
        <span>
          {ui.t('settings.relaxed', undefined, { block: true })}
          <span className="g-ramayana-yatra__move-meta">
            {' '}
            {ui.t('settings.relaxedSub', undefined, { block: true })}
          </span>
        </span>
        <Button size="sm" variant={prefs.relaxed ? 'primary' : 'secondary'} onClick={() => setPrefs({ ...prefs, relaxed: !prefs.relaxed })} data-testid="toggle-relaxed" aria-pressed={prefs.relaxed}>
          {onOff(prefs.relaxed)}
        </Button>
      </div>
      <p className="sk-small sk-muted">{ui.t('settings.note', undefined, { block: true })}</p>
    </div>
  );
}
