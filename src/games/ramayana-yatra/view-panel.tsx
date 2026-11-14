/**
 * Bottom screen (view agent): the DS-style context panel. Switches on state.pending / state.mode:
 * explore controls, dialogue, choices, verse and word cards, challenges, feedback, chapter cards,
 * shop, shrine, save, battle and the ending credits.
 */
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { Button, Choice, Pill, SaText, cx } from '@ui';
import { SPRITE_IDS, type SpriteId } from './catalog';
import { manifest } from './manifest';
import { type HeldDirs, holdProps } from './input';
import { BattlePanel, HpBar } from './view-battle';
import { maxHpOf } from './logic';
import { ShlokaCard, WordCard } from './view-cards';
import { ChallengePanel, FeedbackPanel } from './view-challenge';
import { Name, PlayerName, VerseRef, useButtons, useEnv } from './view-common';
import { Markup, StoryLine, useStoryTypewriter } from './view-markup';
import { UiText, useUi } from './view-ui';
import { RecitePanel, VerseMoment, isKatha } from './view-katha';
import type { Action, Dir, GameState, Pending } from './types';

export interface PanelProps {
  state: GameState;
  dispatch: (a: Action) => void;
  held: HeldDirs;
  kick: () => void;
  openMenu: (tab?: string) => void;
  onTimeLeft: (ms: number | undefined) => void;
  onSave: () => void;
  onFinish: () => void;
  shrine: ShrineApi;
  /** The last dialogue line, kept on screen (dimmed) while wait / move / fade play. */
  echo?: Extract<Pending, { kind: 'say' }> | null;
}

/** How the shrine menu maps onto reducer actions (kept in one place; see notes/core.md). */
export interface ShrineApi {
  rest: Action;
  save: Action;
  leave: Action;
  /** Kathā only: the study hall (अभ्यासशाला), a round of classic challenges */
  study?: Action;
}

export function Panel(props: PanelProps): ReactElement {
  const { state } = props;
  const p = state.pending;
  if (state.mode === 'ended' || p?.kind === 'ending') return <EndingPanel {...props} />;
  if (!p) return state.mode === 'explore' ? <ExplorePanel {...props} /> : <AutoPanel echo={props.echo} />;
  switch (p.kind) {
    case 'say':
      return <SayPanel key={`${p.who ?? ''}|${p.text}`} p={p} dispatch={props.dispatch} />;
    case 'choice':
      return <ChoicePanel p={p} dispatch={props.dispatch} katha={isKatha(state.save)} />;
    case 'shloka':
      // Kathā: the verse moment (anvaya + सरलार्थः); the practice game keeps the verse card
      return isKatha(state.save) ? <VerseMoment key={p.shlokaId} id={p.shlokaId} dispatch={props.dispatch} /> : <ShlokaPanel id={p.shlokaId} {...props} />;
    case 'words':
      return <WordsPanel ids={p.lexIds} {...props} />;
    case 'challenge':
      if (p.challenge.kind === 'smarana' && p.challenge.smarana) return <RecitePanel pending={p} state={state} dispatch={props.dispatch} />;
      return <ChallengePanel pending={p} dispatch={props.dispatch} onTimeLeft={props.onTimeLeft} />;
    case 'feedback':
      return <FeedbackPanel pending={p} dispatch={props.dispatch} />;
    case 'title':
      return <TitlePanel p={p} dispatch={props.dispatch} />;
    case 'shop':
      return <ShopPanel items={p.items} {...props} />;
    case 'shrine':
      return <ShrinePanel {...props} />;
    case 'save':
      return <SavePanel {...props} />;
    case 'battle':
      return <BattlePanel state={state} dispatch={props.dispatch} />;
    default:
      return <AutoPanel echo={props.echo} />;
  }
}

function NextButton({ onClick, label }: { onClick: () => void; label?: string }): ReactElement {
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
      aria-label={label ?? ui.plain('common.next')}
    >
      <span aria-hidden="true">▶</span>
    </button>
  );
}

function AutoPanel({ echo }: { echo?: Extract<Pending, { kind: 'say' }> | null }): ReactElement {
  const env = useEnv();
  if (echo)
    return (
      <div className="g-ramayana-yatra__say is-echo" data-testid="panel-auto" aria-hidden="true">
        <div className="g-ramayana-yatra__say-box">
          <Portrait sprite={speakerSprite(echo.who, echo.portrait, env.avatar)} />
          <div className="g-ramayana-yatra__say-body">
            {echo.who ? <Speaker who={echo.who} /> : null}
            <p className="g-ramayana-yatra__say-text">
              <StoryLine en={echo.text} />
            </p>
          </div>
        </div>
      </div>
    );
  return (
    <div className="g-ramayana-yatra__auto" data-testid="panel-auto" aria-hidden="true">
      <span className="g-ramayana-yatra__dots">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

// ───────────────────────── explore ─────────────────────────

const PAD: { dir: Dir; glyph: string }[] = [
  { dir: 'up', glyph: '▲' },
  { dir: 'left', glyph: '◀' },
  { dir: 'right', glyph: '▶' },
  { dir: 'down', glyph: '▼' },
];

/** A keyboard key cap in a Sanskrit hint: the key's own (Latin) letters, marked as allowed English. */
export function Kbd({ k }: { k: string }): ReactElement {
  return (
    <kbd className="g-ramayana-yatra__kbd" data-en-ok="">
      {k}
    </kbd>
  );
}

function ExplorePanel({ state, dispatch, held, kick, openMenu }: PanelProps): ReactElement {
  const interact = (): void => dispatch({ type: 'interact' });
  useButtons({ a: interact });
  const env = useEnv();
  const ui = useUi();
  const padLabel: Record<Dir, string> = { up: ui.plain('hud.up'), left: ui.plain('hud.left'), right: ui.plain('hud.right'), down: ui.plain('hud.down') };
  const save = state.save;
  const heard = Object.values(save.shlokas).filter((x) => x.heard).length;
  const restored = Object.values(save.shlokas).filter((x) => x.restored).length;
  return (
    <div className="g-ramayana-yatra__explore" data-testid="panel-explore">
      <div className="g-ramayana-yatra__objective" data-testid="objective">
        <span className="g-ramayana-yatra__objective-mark" aria-hidden="true">
          ◆
        </span>
        <span className="g-ramayana-yatra__objective-text">{save.objective ? <StoryLine en={save.objective} /> : ui.t('hud.explore')}</span>
      </div>
      <ExploreStatus state={state} />
      <div className="g-ramayana-yatra__pad-row">
        <div className="g-ramayana-yatra__dpad" role="group" aria-label={ui.plain('hud.move')}>
          {PAD.map((b) => (
            <button key={b.dir} type="button" className={`g-ramayana-yatra__pad g-ramayana-yatra__pad--${b.dir}`} aria-label={padLabel[b.dir]} data-testid={`pad-${b.dir}`} {...holdProps(b.dir, held, kick)}>
              <span aria-hidden="true">{b.glyph}</span>
            </button>
          ))}
          <span className="g-ramayana-yatra__pad-hub" aria-hidden="true" />
        </div>
        <div className="g-ramayana-yatra__mid">
          <button type="button" className={cx('g-ramayana-yatra__pill-btn', ui.lang === 'sa-en' && 'g-ramayana-yatra__pill-btn--stack')} onClick={() => openMenu()} data-testid="btn-menu">
            {ui.t('menu.title', undefined, { block: true })}
          </button>
          <button type="button" className="g-ramayana-yatra__pill-btn g-ramayana-yatra__pill-btn--stack" onClick={() => openMenu('verses')} data-testid="btn-book" aria-label={ui.plain('hud.versesAria', { r: restored, h: heard })}>
            {env.idx.name.get('ui.verses') ? <SaText>{env.idx.name.get('ui.verses')?.sa ?? ''}</SaText> : ui.t('common.verses')}
            <span className="g-ramayana-yatra__count">
              {ui.num(restored)}/{ui.num(heard)}
            </span>
          </button>
        </div>
        <div className="g-ramayana-yatra__ab">
          <button
            type="button"
            className="g-ramayana-yatra__btn-b"
            aria-label={ui.plain('hud.bAria')}
            data-testid="btn-b"
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={() => {
              held.running = true;
            }}
            onPointerUp={() => {
              held.running = false;
            }}
            onPointerLeave={() => {
              held.running = false;
            }}
            onPointerCancel={() => {
              held.running = false;
            }}
          >
            <span data-en-ok="">B</span>
          </button>
          <button type="button" className="g-ramayana-yatra__btn-a" aria-label={ui.plain('hud.aAria')} data-testid="btn-a" onMouseDown={(e) => e.preventDefault()} onClick={interact}>
            <span data-en-ok="">A</span>
          </button>
        </div>
      </div>
      {ui.isSa ? (
        <p className="g-ramayana-yatra__keys-hint">
          <Kbd k="←↑→↓ / WASD" /> {ui.t('hud.kMove', undefined, { gloss: false })} · <Kbd k="X" /> {ui.t('hud.kRun', undefined, { gloss: false })} · <Kbd k="Z / Enter" /> {ui.t('hud.kTalk', undefined, { gloss: false })} · <Kbd k="M" /> {ui.t('hud.kMenu', undefined, { gloss: false })}
        </p>
      ) : (
        <p className="g-ramayana-yatra__keys-hint">{ui.t('hud.keys')}</p>
      )}
    </div>
  );
}

function ExploreStatus({ state }: { state: GameState }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const map = env.idx.map.get(state.save.mapId);
  const place = map ? env.idx.name.get(map.nameId) : undefined;
  return (
    <div className="g-ramayana-yatra__status" data-testid="explore-status">
      <div className="g-ramayana-yatra__status-place">
        {place ? <SaText>{place.sa}</SaText> : null}
        {place && ui.lang !== 'sa' ? <span className="g-ramayana-yatra__en">{place.en}</span> : null}
        <span className="g-ramayana-yatra__purse" title={ui.plain('hud.purse')}>
          ◈ {ui.num(state.save.niska)}
        </span>
      </div>
      <div className="g-ramayana-yatra__status-party">
        {state.save.party.map((m, i) => {
          const def = env.idx.ally.get(m.id);
          return (
            <div key={`${m.id}-${i}`} className="g-ramayana-yatra__mini">
              <Portrait sprite={m.id === 'player' ? (env.avatar === 'b' ? 'player_b' : 'player_a') : ((def?.overworld ?? null) as SpriteId | null)} />
              <span className="g-ramayana-yatra__mini-body">
                <span className="g-ramayana-yatra__mini-name">{m.id === 'player' ? <PlayerName name={state.save.playerName} /> : <Name id={def?.nameId} fallback={m.id} />}</span>
                <HpBar hp={m.hp} max={maxHpOf(m, env.content)} />
                <span className="g-ramayana-yatra__mini-lv">
                  {ui.t('common.lv', undefined, { gloss: false })} {ui.num(m.level)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── dialogue ─────────────────────────

const SPRITES = new Set<string>(SPRITE_IDS);

function speakerSprite(who: string | undefined, portrait: SpriteId | undefined, avatar: 'a' | 'b'): SpriteId | null {
  if (portrait) return portrait;
  if (!who) return null;
  if (who === 'player' || who === '{player}') return avatar === 'b' ? 'player_b' : 'player_a';
  const id = who.replace(/^person\./, '');
  return SPRITES.has(id) ? (id as SpriteId) : null;
}

function Speaker({ who }: { who: string }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  if (who === 'player' || who === '{player}')
    return (
      <span className="g-ramayana-yatra__speaker">
        <PlayerName />
      </span>
    );
  const n = env.idx.name.get(who);
  if (n)
    return (
      <span className="g-ramayana-yatra__speaker">
        <SaText>{n.sa}</SaText>
        {ui.lang !== 'sa' ? <span className="g-ramayana-yatra__en"> {n.en}</span> : null}
      </span>
    );
  // a free-English speaker title ("Village trader"): its Sanskrit comes from content (sa-dialogue-4)
  return <span className="g-ramayana-yatra__speaker">{ui.isSa ? ui.c(who) : <Markup text={who} />}</span>;
}

export function Portrait({ sprite }: { sprite: SpriteId | null }): ReactElement | null {
  const env = useEnv();
  if (!sprite) return null;
  const url = env.art.portraitUrl(sprite);
  return <div className="g-ramayana-yatra__portrait">{url ? <img src={url} alt="" draggable={false} /> : <span aria-hidden="true">{sprite.slice(0, 1).toUpperCase()}</span>}</div>;
}

function SayPanel({ p, dispatch }: { p: Extract<Pending, { kind: 'say' }>; dispatch: (a: Action) => void }): ReactElement {
  const env = useEnv();
  const tw = useStoryTypewriter(p.text);
  const go = (): void => (tw.done ? dispatch({ type: 'advance' }) : tw.skip());
  useButtons({ a: go, b: go });
  const sprite = speakerSprite(p.who, p.portrait, env.avatar);
  return (
    <div className="g-ramayana-yatra__say" onClick={go} data-testid="panel-say" data-done={tw.done ? 'true' : 'false'}>
      <div className="g-ramayana-yatra__say-box">
        <Portrait sprite={sprite} />
        <div className="g-ramayana-yatra__say-body">
          {p.who ? <Speaker who={p.who} /> : null}
          <p className="g-ramayana-yatra__say-text" data-testid="say-text">
            <StoryLine en={p.text} typed={tw} />
            {!tw.done ? <span className="g-ramayana-yatra__caret" aria-hidden="true" /> : null}
          </p>
          <div className="g-ramayana-yatra__say-next">
            <NextButton onClick={go} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoicePanel({ p, dispatch, katha }: { p: Extract<Pending, { kind: 'choice' }>; dispatch: (a: Action) => void; katha: boolean }): ReactElement {
  const choose = (index: number): void => dispatch({ type: 'choose', index });
  useButtons({
    num: (n) => {
      if (n <= p.options.length) choose(n - 1);
    },
  });
  return (
    <div className="g-ramayana-yatra__choice" data-testid="panel-choice">
      {p.prompt ? (
        <p className="g-ramayana-yatra__say-text" data-testid="choice-prompt">
          <StoryLine en={p.prompt} />
        </p>
      ) : null}
      <div className="sk-choices">
        {p.options.map((o, i) => (
          <Choice key={i} hotkey={String(i + 1)} onClick={() => choose(i)} data-testid={`choice-${i}`}>
            {/* Kathā (sa-en): the replies are Sanskrit only, so the English does not give the answer away (the prompt keeps its gloss) */}
            <StoryLine en={o} noGloss={katha} />
          </Choice>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── cards ─────────────────────────

/** Ignore "advance" for the first ~500 ms of a newly shown card, so rapid A presses cannot skip it unread. */
function useGuard(ms = 500): () => boolean {
  const t0 = useRef(performance.now());
  return () => performance.now() - t0.current >= ms;
}

function ShlokaPanel({ id, state, dispatch }: { id: string } & PanelProps): ReactElement {
  const ready = useGuard();
  const advance = (): void => {
    if (ready()) dispatch({ type: 'advance' });
  };
  useButtons({ a: advance, b: advance });
  return (
    <div className="g-ramayana-yatra__card-panel" data-testid="panel-shloka">
      <div className="g-ramayana-yatra__card-scroll">
        <ShlokaCard id={id} save={state.save} />
      </div>
      <Button full onClick={advance} data-testid="advance">
        <UiText k="common.continue" />
      </Button>
    </div>
  );
}

function WordsPanel({ ids, state, dispatch }: { ids: string[] } & PanelProps): ReactElement {
  const ready = useGuard();
  const advance = (): void => {
    if (ready()) dispatch({ type: 'advance' });
  };
  useButtons({ a: advance, b: advance });
  return (
    <div className="g-ramayana-yatra__card-panel" data-testid="panel-words">
      <div className="g-ramayana-yatra__card-scroll">
        <p className="g-ramayana-yatra__eyebrow">{ids.length === 1 ? <UiText k="say.newWord" /> : <UiText k="say.newWords" />}</p>
        <div className="sk-stack">
          {ids.map((id) => (
            <WordCard key={id} lexId={id} save={state.save} />
          ))}
        </div>
      </div>
      <Button full onClick={advance} data-testid="advance">
        <UiText k="common.continue" />
      </Button>
    </div>
  );
}

function TitlePanel({ p, dispatch }: { p: Extract<Pending, { kind: 'title' }>; dispatch: (a: Action) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const advance = (): void => dispatch({ type: 'advance' });
  useButtons({ a: advance, b: advance });
  const n = env.idx.name.get(p.nameId);
  const num = /\.(\d+)$/.exec(p.nameId)?.[1];
  const chapter = num ? env.content.chapters.find((c) => c.kanda === Number(num)) : undefined;
  return (
    <div className="g-ramayana-yatra__titlecard" data-testid="panel-title">
      {num ? (
        <p className="g-ramayana-yatra__eyebrow" data-testid="titlecard-book">
          {ui.t('chapter.bookOf', { n: Number(num), total: 6 })}
        </p>
      ) : null}
      {n && ui.isSa ? (
        <SaText as="div" shloka className="g-ramayana-yatra__titlecard-sa" data-testid="titlecard-sa">
          {n.sa}
        </SaText>
      ) : null}
      {n && ui.lang !== 'sa' ? <div className={cx('g-ramayana-yatra__titlecard-en', ui.isSa && 'is-gloss')}>{n.en}</div> : null}
      {chapter?.summary ? (
        <p className="g-ramayana-yatra__titlecard-summary" data-testid="titlecard-summary">
          {ui.c(chapter.summary, { block: true })}
        </p>
      ) : null}
      {p.subtitle ? <p className="g-ramayana-yatra__context">{ui.isSa ? ui.c(p.subtitle, { block: true }) : <Markup text={p.subtitle} />}</p> : null}
      <Button onClick={advance} data-testid="advance">
        <UiText k="common.begin" />
      </Button>
    </div>
  );
}

// ───────────────────────── shop / shrine / save ─────────────────────────

function ShopPanel({ items, state, dispatch }: { items: string[] } & PanelProps): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const leave = (): void => dispatch({ type: 'advance' });
  const lastBuy = useRef(0);
  const buy = (itemId: string): void => {
    const now = performance.now();
    if (now - lastBuy.current < 350) return; // debounce: one purchase per deliberate tap
    lastBuy.current = now;
    dispatch({ type: 'buy', itemId, qty: 1 });
  };
  useButtons({
    b: leave,
    num: (n) => {
      const id = items[n - 1];
      const def = id ? env.idx.item.get(id) : undefined;
      if (id && def && state.save.niska >= def.price) buy(id);
    },
  });
  return (
    <div className="g-ramayana-yatra__card-panel" data-testid="panel-shop">
      <div className="g-ramayana-yatra__shop-head">
        <span className="g-ramayana-yatra__eyebrow">{ui.t('shop.title')}</span>
        <Pill tone="gold" data-testid="purse">
          ◈ {ui.num(state.save.niska)}
        </Pill>
      </div>
      <div className="g-ramayana-yatra__card-scroll g-ramayana-yatra__list">
        {items.map((id, i) => {
          const def = env.idx.item.get(id);
          const afford = !!def && state.save.niska >= def.price;
          return (
            <div key={id} className="g-ramayana-yatra__shop-row">
              <span className="g-ramayana-yatra__key" aria-hidden="true">
                {ui.num(i + 1)}
              </span>
              <span className="g-ramayana-yatra__move-name">
                <Name id={def?.nameId} en fallback={id} />
                <span className="g-ramayana-yatra__move-meta">
                  {ui.c(def?.description, { gloss: false })} · {ui.t('shop.owned', { n: state.save.items[id] ?? 0 }, { gloss: false })}
                </span>
                {ui.lang === 'sa-en' && def?.description ? (
                  <span className="g-ramayana-yatra__move-meta g-ramayana-yatra__ui-en is-block">
                    {def.description} · {ui.en('shop.owned', { n: state.save.items[id] ?? 0 })}
                  </span>
                ) : null}
              </span>
              <Button size="sm" variant={afford ? 'primary' : 'secondary'} disabled={!afford} onClick={() => buy(id)} data-testid={`buy-${id}`}>
                ◈ {def ? ui.num(def.price) : '?'}
              </Button>
            </div>
          );
        })}
      </div>
      <Button full variant="secondary" onClick={leave} data-testid="shop-leave">
        <UiText k="common.leave" />
      </Button>
    </div>
  );
}

function ShrinePanel({ state, dispatch, shrine }: PanelProps): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const [reciting, setReciting] = useState(false);
  const heard = Object.entries(state.save.shlokas)
    .filter(([id, p]) => p.heard && env.idx.shloka.has(id))
    .map(([id, p]) => ({ id, p, sh: env.idx.shloka.get(id) }))
    .sort((a, b) => (a.sh && b.sh ? a.sh.kanda - b.sh.kanda || a.sh.sarga - b.sh.sarga || a.sh.verse - b.sh.verse : 0));
  const recite = (shlokaId: string): void => dispatch({ type: 'recite', shlokaId });
  // Kathā: the study hall is an extra option (never on the story path); the practice game's menu is unchanged
  const study = isKatha(state.save) ? shrine.study : undefined;
  useButtons({
    b: () => (reciting ? setReciting(false) : dispatch(shrine.leave)),
    num: (n) => {
      if (reciting) {
        const h = heard[n - 1];
        if (h) recite(h.id);
      } else if (n === 1) dispatch(shrine.rest);
      else if (n === 2) setReciting(true);
      else if (n === 3) dispatch(shrine.save);
      else if (study && n === 4) dispatch(study);
      else if (n === (study ? 5 : 4)) dispatch(shrine.leave);
    },
  });
  if (reciting)
    return (
      <div className="g-ramayana-yatra__card-panel" data-testid="panel-recite">
        <p className="g-ramayana-yatra__eyebrow">{ui.t('shrine.reciteHead')}</p>
        <div className="g-ramayana-yatra__card-scroll g-ramayana-yatra__list">
          {heard.length === 0 ? <p className="g-ramayana-yatra__hint">{ui.t('shrine.noneHeard', undefined, { block: true })}</p> : null}
          {heard.map(({ id, p, sh }, i) => (
            <button key={id} type="button" className={cx('g-ramayana-yatra__verse-btn', p.restored && 'is-restored')} onClick={() => recite(id)} data-testid={`recite-${id}`}>
              <span className="g-ramayana-yatra__key" aria-hidden="true">
                {ui.num(i + 1)}
              </span>
              <span className="g-ramayana-yatra__move-name">
                {sh ? <SaText shloka>{sh.padas[0] ?? ''}</SaText> : id}
                <span className="g-ramayana-yatra__move-meta">{sh ? <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} /> : null}</span>
              </span>
              <span className="g-ramayana-yatra__move-side">{p.restored ? <Pill tone="gold">{ui.t('verses.restored', undefined, { gloss: false })}</Pill> : <Pill>{ui.num(Math.round(p.best * 100))}%</Pill>}</span>
            </button>
          ))}
        </div>
        <Button full variant="secondary" onClick={() => setReciting(false)} data-testid="recite-back">
          <UiText k="common.back" />
        </Button>
      </div>
    );
  const opts: { label: ReactNode; sub: ReactNode; testid: string; on: () => void }[] = [
    { label: ui.t('shrine.rest'), sub: ui.t('shrine.restSub', undefined, { block: true }), testid: 'shrine-rest', on: () => dispatch(shrine.rest) },
    { label: ui.t('shrine.recite'), sub: ui.t('shrine.reciteSub', undefined, { block: true }), testid: 'shrine-recite', on: () => setReciting(true) },
    { label: ui.t('common.save'), sub: ui.t('shrine.saveSub', undefined, { block: true }), testid: 'shrine-save', on: () => dispatch(shrine.save) },
    ...(study ? [{ label: ui.t('katha.studyHall'), sub: ui.t('katha.studyHallSub', undefined, { block: true }), testid: 'shrine-study', on: () => dispatch(study) }] : []),
    { label: ui.t('common.leave'), sub: '', testid: 'shrine-leave', on: () => dispatch(shrine.leave) },
  ];
  return (
    <div className="g-ramayana-yatra__shrine" data-testid="panel-shrine">
      <p className="g-ramayana-yatra__eyebrow">{ui.t('shrine.title')}</p>
      <div className="g-ramayana-yatra__shrine-grid">
        {opts.map((o, i) => (
          <button key={o.testid} type="button" className="g-ramayana-yatra__cmd-btn" onClick={o.on} data-testid={o.testid}>
            <span className="g-ramayana-yatra__key" aria-hidden="true">
              {ui.num(i + 1)}
            </span>
            <span className="g-ramayana-yatra__shrine-label">
              {o.label}
              {o.sub ? <span className="g-ramayana-yatra__move-meta">{o.sub}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SavePanel({ onSave, dispatch }: PanelProps): ReactElement {
  const ui = useUi();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    onSave();
    const t = setTimeout(() => dispatch({ type: 'advance' }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="g-ramayana-yatra__auto" data-testid="panel-save">
      <span className="g-ramayana-yatra__saving">{ui.t('menu.saved')}</span>
    </div>
  );
}

// ───────────────────────── ending ─────────────────────────

function EndingPanel({ state, onFinish }: PanelProps): ReactElement {
  const env = useEnv();
  const ui = useUi();
  useButtons({ a: onFinish });
  const restored = env.content.shlokas.filter((s) => state.save.shlokas[s.id]?.restored);
  return (
    <div className="g-ramayana-yatra__card-panel" data-testid="panel-ending">
      <div className="g-ramayana-yatra__card-scroll g-ramayana-yatra__credits">
        <p className="g-ramayana-yatra__eyebrow">{ui.t('end.title')}</p>
        <p>{ui.t('end.thanks', undefined, { block: true })}</p>
        <p className="g-ramayana-yatra__eyebrow">{ui.t('end.restored', { n: restored.length })}</p>
        <ul className="g-ramayana-yatra__credit-list" data-testid="credits">
          {restored.map((s) => (
            <li key={s.id}>
              <SaText shloka nowrap={false}>
                {s.padas[0] ?? ''}
              </SaText>
              <span className="g-ramayana-yatra__move-meta">
                <VerseRef kanda={s.kanda} sarga={s.sarga} verse={s.verse} />
              </span>
            </li>
          ))}
        </ul>
        {(manifest.credits ?? []).map((c, i) => (
          <p key={c} className="g-ramayana-yatra__source">
            {!ui.isSa ? c : i === 0 ? ui.t('end.credit1', undefined, { block: true }) : i === 1 ? ui.t('end.credit2', undefined, { block: true }) : <span data-en-ok="">{c}</span>}
          </p>
        ))}
      </div>
      <Button full onClick={onFinish} data-testid="ending-finish">
        <UiText k="end.finish" />
      </Button>
    </div>
  );
}

// The book-complete screen (v0.5a) lives in view-bookend.tsx.
