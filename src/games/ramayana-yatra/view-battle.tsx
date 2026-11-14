/**
 * Battle panel (view agent): beat narration with ▶, the command menu (Fight / Switch / Item / Run; in Kathā the moves
 * themselves, one tap each, with Switch / Item / Run as secondary buttons),
 * move list (element · PP · challenge kind), switch list and item list. Challenge and feedback
 * phases are rendered by view-challenge (state.pending is challenge / feedback then).
 *
 * Interface text comes from content/sa-ui-b.json (battle.*, common.*) through useUi(), so the menus follow the
 * story-text language: English exactly as before, Sanskrit (संस्कृतम्), or Sanskrit with a small English gloss.
 * Names in a Sanskrit sentence are inflected (sa-battle.json forms.ally); content descriptions go through ui.c().
 */
import { Fragment, type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { SaText, cx } from '@ui';
import { SaMarkup, StoryLine, useStoryTypewriter } from './view-markup';
import { ELEMENT_EN, KIND_EN, Name, englishName, useButtons, useEnv } from './view-common';
import { useUi } from './view-ui';
import { ModelLine, astraBinding, isKatha, useAutoBeat } from './view-katha';
import { COVER_CMD, ELEMENT_CHART, SA_BATTLE, SHIELD_CMD, answerOf, battleMenu, canShield, coverOf, indexOf, isTired, maxHpOf, saText } from './logic';
import type { Action, BattleBeat, BattleState, Element, GameContent, GameState } from './types';

/** A rich-slot placeholder: the template is filled with it, then split so a React node can stand there. */
const SLOT = (k: string): string => `\u0001${k}\u0001`;
function richSplit(text: string, nodes: Record<string, ReactNode>, run: (s: string) => ReactNode): ReactNode[] {
  return text.split(/\u0001([a-z]+)\u0001/).map((part, i) => (i % 2 ? <Fragment key={i}>{nodes[part]}</Fragment> : part ? <Fragment key={i}>{run(part)}</Fragment> : null));
}

/** The active hero / a party member as a name label (the player: शिष्यः / शिष्या in Sanskrit, or the typed name). */
function HeroName({ id, playerName }: { id: string; playerName: string }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  if (id === 'player') return <strong>{ui.isSa ? ui.t('battle.player', undefined, { gloss: false }) : playerName}</strong>;
  return <Name id={env.idx.ally.get(id)?.nameId} fallback={id} />;
}

/** An element's name: English as before, the names.json Sanskrit in the Sanskrit modes. */
function ElementName({ el }: { el: Element }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const n = env.idx.name.get(`element.${el}`);
  if (!ui.isSa || !n) return <>{ELEMENT_EN[el]}</>;
  return <SaText>{n.sa}</SaText>;
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

function Versus({ b, state }: { b: BattleState; state: GameState }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const foeDef = env.idx.enemy.get(b.foe.id);
  return (
    <div className="g-ramayana-yatra__versus" data-testid="battle-names">
      <span className="g-ramayana-yatra__versus-ally">
        <HeroName id={b.ally.id} playerName={state.save.playerName} />
      </span>
      <span className="g-ramayana-yatra__versus-vs">
        {b.spec.kind === 'duel' && b.spec.tutorial && isKatha(state.save) ? ui.t('katha.echoBar', undefined, { gloss: false }) : b.spec.kind === 'duel' ? ui.t('battle.debates', undefined, { gloss: false }) : ui.t('battle.vs', undefined, { gloss: false })}
      </span>
      <span className="g-ramayana-yatra__versus-foe">
        <Name id={foeDef?.nameId} fallback={b.foe.id} />
        {ui.lang === 'sa' ? null : <span className="g-ramayana-yatra__en"> {englishName(env.idx, foeDef?.nameId, b.foe.id)}</span>}
      </span>
    </div>
  );
}

function BeatView({ text, textSa, onNext, auto = false, model, tactic }: { text: string; textSa?: string; onNext: () => void; auto?: boolean; model?: BattleBeat['model']; tactic?: BattleBeat['tactic'] }): ReactElement {
  // battle intros and enemy intro/defeat lines are story text (content.dialogueSa); the other narration carries its
  // own Sambhāṣaṇa line (beat.textSa, from content/sa-battle.json)
  const tw = useStoryTypewriter(text, textSa);
  // Kathā: the narration advances by itself (tap / A only hurries); the practice game keeps tap-to-advance
  useAutoBeat(auto, text, textSa, tw.done, onNext);
  const go = (): void => (tw.done ? onNext() : tw.skip());
  useButtons({ a: go, b: go });
  return (
    <div className={cx('g-ramayana-yatra__beat', auto && 'is-auto', tactic && `is-${tactic}`)} onClick={go} data-testid="battle-beat" data-auto={auto ? 'true' : undefined} data-tactic={tactic}>
      <div className="g-ramayana-yatra__say-box">
        <div className="g-ramayana-yatra__say-body">
          <p className="g-ramayana-yatra__beat-text" aria-live="polite">
            <StoryLine en={text} sa={textSa} typed={tw} testid="beat-text" />
          </p>
          {model ? <ModelLine shlokaId={model.shlokaId} pada={model.pada} /> : null}
          <div className="g-ramayana-yatra__say-next">
            <NextButton onClick={go} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BattlePanel({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }): ReactElement | null {
  const b = state.battle;
  if (!b) return null;
  const choose = (index: number): void => dispatch({ type: 'choose', index });
  const beat = b.beats[0];
  const katha = isKatha(state.save);
  // Kathā narration advances by itself, except in the tutorial duel (the first story fight): there every beat waits
  // for a tap, with the usual ▶ (v0.4.3)
  const tutorial = katha && !!b.spec.tutorial;
  const auto = katha && !tutorial;
  let body: ReactElement;
  if (beat) body = <BeatView key={`${b.turn}:${b.beats.length}:${beat.text}`} text={beat.text} textSa={beat.textSa} onNext={() => dispatch({ type: 'advance' })} auto={auto} model={beat.model} tactic={beat.tactic} />;
  // Kathā: one-tap moves (the command panel IS the move list); the practice game keeps Fight → move list
  else if (b.phase === 'command') body = katha ? <KathaCommand key={`kc:${b.turn}:${b.active}`} b={b} state={state} choose={choose} /> : <CommandMenu b={b} state={state} choose={choose} />;
  else if (b.phase === 'pick-move') body = <MoveList b={b} state={state} choose={choose} />;
  else if (b.phase === 'pick-switch') body = <SwitchList b={b} state={state} choose={choose} />;
  else if (b.phase === 'pick-item') body = <ItemList state={state} choose={choose} />;
  else {
    // end-of-battle fallback lines (no beats left): their Sanskrit is the sa-battle win / allDown / fled template
    const end = b.phase === 'won' ? { en: 'Victory!', key: 'win' } : b.phase === 'lost' ? { en: 'The heroes are exhausted…', key: 'allDown' } : b.phase === 'fled' ? { en: 'You got away safely.', key: 'fled' } : null;
    body = <BeatView key={`end:${b.phase}`} text={end?.en ?? '…'} textSa={end ? saText(end.key) : undefined} onNext={() => dispatch({ type: 'advance' })} auto={auto} />;
  }
  return (
    <div className="g-ramayana-yatra__battle" data-testid="battle-panel" data-phase={b.phase} data-tutorial={tutorial ? 'true' : undefined}>
      <Versus b={b} state={state} />
      {body}
      <Matchup b={b} />
    </div>
  );
}

/** Element matchup hint (tall screens only): what the active hero's element does against the foe's. */
function Matchup({ b }: { b: BattleState }): ReactElement | null {
  const ui = useUi();
  const a = b.ally.element;
  const f = b.foe.element;
  const out = ELEMENT_CHART[a]?.[f] ?? 1;
  const inc = ELEMENT_CHART[f]?.[a] ?? 1;
  if (out === 1 && inc === 1) return null;
  const word = (m: number): { en: string; sa: string } =>
    m > 1 ? { en: ui.en('battle.strong'), sa: ui.sa('battle.strong') ?? '' } : m < 1 ? { en: ui.en('battle.weak'), sa: ui.sa('battle.weak') ?? '' } : { en: ui.en('battle.even'), sa: ui.sa('battle.even') ?? '' };
  const slots = { a: SLOT('a'), f: SLOT('f'), out: word(out), in: word(inc) };
  const both = inc !== 1;
  const chip = (el: Element): ReactNode => (
    <span className={`g-ramayana-yatra__el el-${el}`}>
      <ElementName el={el} />
    </span>
  );
  const nodes = { a: chip(a), f: chip(f) };
  const sa = !ui.isSa ? undefined : both ? ui.sa('battle.matchBoth', slots) : ui.sa('battle.matchOne', slots);
  const en = (sl: typeof slots | Record<string, string | { en: string; sa: string }>): string => (both ? ui.en('battle.matchBoth', sl) : ui.en('battle.matchOne', sl));
  return (
    <p className="g-ramayana-yatra__matchup" aria-hidden="true" data-testid="battle-matchup">
      {sa ? (
        <>
          <span className="g-ramayana-yatra__matchup-sa">{richSplit(sa, nodes, (s) => <SaMarkup text={s} />)}</span>
          {ui.lang === 'sa-en' ? (
            <span className="g-ramayana-yatra__ui-en is-block" data-testid="ui-en">
              {en({ ...slots, a: ELEMENT_EN[a], f: ELEMENT_EN[f] })}
            </span>
          ) : null}
        </>
      ) : (
        richSplit(en(slots), nodes, (s) => s)
      )}
    </p>
  );
}

/**
 * The description a move shows: in Kathā, content/katha.json `moveText[moveId]` when present (practice mechanics such
 * as "answer swiftly" do not apply there), else defs.json `description`. Shown through ui.c() (its Sanskrit is in the
 * dialogue TM).
 */
export function moveDescription(content: GameContent, moveId: string, katha: boolean): string | undefined {
  const k = katha ? content.katha?.moveText?.[moveId] : undefined;
  return k?.trim() ? k : indexOf(content).move.get(moveId)?.description;
}

/** "What will {who} do?" with the active hero's nominative in Sanskrit. */
function WhatWillDo({ b, state }: { b: BattleState; state: GameState }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const id = b.ally.id;
  const nom = SA_BATTLE.forms.ally[id]?.nom;
  const whoEn = id === 'player' ? '{player}' : `{n:${env.idx.ally.get(id)?.nameId ?? `ally.${id}`}}`;
  return (
    <p className="g-ramayana-yatra__cmd-q" data-testid="cmd-q">
      {ui.isSa && nom
        ? ui.t('battle.whatWillDo', { who: { en: whoEn, sa: nom } })
        : richSplit(ui.en('battle.whatWillDo', { who: SLOT('who') }), { who: id === 'player' ? state.save.playerName : <Name id={env.idx.ally.get(id)?.nameId} fallback={id} /> }, (s) => s)}
    </p>
  );
}

/** A panel's input guard: false for the first `ms` after it appeared (a tap that hurried the last beat, or a held key, must not land on it). */
function useArmed(ms = 300): { armed: boolean; ready: () => boolean; down: () => void; click: (e: { detail: number }) => boolean } {
  const at = useRef(performance.now() + ms);
  const downAt = useRef(0);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), Math.max(0, at.current - performance.now()));
    return () => clearTimeout(t);
  }, []);
  return {
    armed,
    ready: () => performance.now() >= at.current,
    down: () => {
      downAt.current = performance.now();
    },
    // a pointer press that began before arming is ignored; keyboard clicks (detail 0) only need the panel armed
    click: (e) => performance.now() >= at.current && (e.detail === 0 || downAt.current >= at.current),
  };
}

/**
 * Kathā command panel (v0.4.1, notes/katha.md): the active hero's moves ARE the menu — one tap (or key 1–4) casts.
 * A verse-bound astra is tagged श्लोकः (it opens the recitation); a plain move resolves with no input. Switch / items /
 * run are smaller secondary buttons (keys 5 / 6 / 7). The reducer is driven exactly as the practice menu does it
 * (choose 0 → the move list, choose i → the move), so the rules are untouched. Armed 300 ms after it appears.
 */
function KathaCommand({ b, state, choose }: { b: BattleState; state: GameState; choose: (i: number) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const menu = battleMenu(state, env.content);
  const moves = menu.moves.map((m) => ({ ...m, def: env.idx.move.get(m.id) }));
  const arm = useArmed();
  const cast = (i: number): void => {
    const m = moves[i];
    if (!m || !m.usable) return;
    choose(0);
    choose(i);
  };
  // v0.5a: a foe has readied a great blow — the answers (the verse shield; a benched guardian's cover) sit above the moves
  const shield = b.warn ? canShield(state, env.content) : false;
  const cover = b.warn ? coverOf(state, env.content) : null;
  const answers: { label: ReactNode; testid: string; index: number; key: number }[] = [
    ...(shield ? [{ label: ui.t('katha.shield', undefined, { gloss: false }), testid: 'cmd-shield', index: SHIELD_CMD, key: 8 }] : []),
    ...(cover
      ? [
          {
            // the player is शिष्यः / शिष्या on a label (battle.player), never the typed name, as in HeroName
            label: ui.t('katha.cover', { who: cover.allyId === 'player' ? { en: '{player}', sa: ui.sa('battle.player') ?? '' } : { en: `{n:ally.${cover.allyId}}`, sa: SA_BATTLE.forms.ally[cover.allyId]?.nom ?? '' }, move: { en: `{n:move.${cover.moveId}}`, sa: env.idx.name.get(`move.${cover.moveId}`)?.sa ?? '' } }, { gloss: false }),
            testid: 'cmd-cover',
            index: COVER_CMD,
            key: 9,
          },
        ]
      : []),
  ];
  const secondary: { label: ReactNode; testid: string; index: number; disabled: boolean }[] = [
    { label: ui.t('battle.switch', undefined, { gloss: false }), testid: 'cmd-switch', index: 1, disabled: menu.switchable.length === 0 },
    { label: ui.t('battle.item', undefined, { gloss: false }), testid: 'cmd-item', index: 2, disabled: menu.items.length === 0 },
    { label: ui.t('battle.run', undefined, { gloss: false }), testid: 'cmd-run', index: 3, disabled: !menu.canRun },
  ];
  useButtons({
    num: (n) => {
      if (!arm.ready()) return;
      if (n >= 1 && n <= 4) cast(n - 1);
      const s = secondary[n - 5];
      if (s && !s.disabled) choose(s.index);
      const a = answers.find((x) => x.key === n);
      if (a) choose(a.index);
    },
  });
  return (
    <div className={cx('g-ramayana-yatra__cmd g-ramayana-yatra__kcmd', answers.length > 0 && 'has-answers')} data-testid="katha-cmd" data-armed={arm.armed ? 'true' : 'false'}>
      <WhatWillDo b={b} state={state} />
      {answers.length ? (
        <div className="g-ramayana-yatra__kcmd-answers" data-testid="katha-answers">
          {answers.map((a) => (
            <button key={a.testid} type="button" className="g-ramayana-yatra__kcmd-btn g-ramayana-yatra__answer" onPointerDown={arm.down} onClick={(e) => {
              if (arm.click(e)) choose(a.index);
            }} data-testid={a.testid}>
              <span className="g-ramayana-yatra__key" aria-hidden="true">
                {a.key}
              </span>
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="g-ramayana-yatra__kcmd-moves" role="group" aria-label={ui.plain('battle.fight')}>
        {moves.map((m, i) => {
          const astra = !!astraBinding(env.content, m.id);
          const desc = moveDescription(env.content, m.id, true);
          // v0.5a: cast again, this astra lands weaker; a move that would answer a readied blow is marked too
          const tired = isTired(b, env.content, m.id);
          const answering = b.warn ? answerOf(env.content, b.warn, m.id) !== null : false;
          return (
            <button
              key={m.id}
              type="button"
              className={cx('g-ramayana-yatra__move g-ramayana-yatra__kmove', m.def && `el-${m.def.element}`, astra && 'is-astra', tired && 'is-tired', answering && 'is-answer')}
              disabled={!m.usable}
              onPointerDown={arm.down}
              onClick={(e) => {
                if (arm.click(e)) cast(i);
              }}
              data-testid={`move-${m.id}`}
            >
              <span className="g-ramayana-yatra__key" aria-hidden="true">
                {i + 1}
              </span>
              <span className="g-ramayana-yatra__move-name">
                <span className="g-ramayana-yatra__kmove-top">
                  <Name id={m.def?.nameId} fallback={m.id} />
                  {astra ? (
                    <span className="g-ramayana-yatra__move-kind g-ramayana-yatra__astra-tag" data-testid={`astra-${m.id}`}>
                      {ui.t('common.verse', undefined, { gloss: false })}
                    </span>
                  ) : null}
                  {tired ? (
                    <span className="g-ramayana-yatra__move-kind g-ramayana-yatra__tired-tag" data-testid={`tired-${m.id}`}>
                      {ui.t('katha.tired', undefined, { gloss: false })}
                    </span>
                  ) : null}
                </span>
                <span className="g-ramayana-yatra__move-meta">
                  {m.def ? <ElementName el={m.def.element} /> : ''}
                  {m.def && m.def.power > 0 ? (
                    <>
                      {' · '}
                      {ui.t('battle.power', { n: m.def.power }, { gloss: false })}
                    </>
                  ) : null}
                  {' · '}
                  <span className="g-ramayana-yatra__pp">
                    {ui.t('common.pp', undefined, { gloss: false })} {ui.num(m.pp)}/{ui.num(m.maxPp)}
                  </span>
                </span>
                {desc ? <span className="g-ramayana-yatra__move-desc">{ui.c(desc, { gloss: false })}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="g-ramayana-yatra__kcmd-more">
        {secondary.map((s, i) => (
          <button key={s.testid} type="button" className="g-ramayana-yatra__kcmd-btn" disabled={s.disabled} onPointerDown={arm.down} onClick={(e) => {
            if (arm.click(e)) choose(s.index);
          }} data-testid={s.testid}>
            <span className="g-ramayana-yatra__key" aria-hidden="true">
              {i + 5}
            </span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CommandMenu({ b, state, choose }: { b: BattleState; state: GameState; choose: (i: number) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const menu = battleMenu(state, env.content);
  const canSwitch = menu.switchable.length > 0;
  const hasItems = menu.items.length > 0;
  // 2×2 grid: no English gloss in sa-en (the space is tight)
  const items: { label: ReactNode; testid: string; disabled?: boolean }[] = [
    { label: b.spec.kind === 'duel' ? ui.t('battle.recite', undefined, { gloss: false }) : ui.t('battle.fight', undefined, { gloss: false }), testid: 'cmd-fight' },
    { label: ui.t('battle.switch', undefined, { gloss: false }), testid: 'cmd-switch', disabled: !canSwitch },
    { label: ui.t('battle.item', undefined, { gloss: false }), testid: 'cmd-item', disabled: !hasItems },
    { label: ui.t('battle.run', undefined, { gloss: false }), testid: 'cmd-run', disabled: !menu.canRun },
  ];
  // a duel (verse-debate) never allows switching, items or running: show only पठ rather than three greyed-out buttons
  const shown = items.map((it, i) => ({ ...it, i })).filter((it) => !(b.spec.kind === 'duel' && it.disabled));
  useButtons({
    num: (n) => {
      const it = shown[n - 1];
      if (it && !it.disabled) choose(it.i);
    },
    a: () => choose(0),
  });
  return (
    <div className="g-ramayana-yatra__cmd">
      <WhatWillDo b={b} state={state} />
      <div className={cx('g-ramayana-yatra__cmd-grid', shown.length === 1 && 'is-solo')}>
        {shown.map((it, n) => (
          <button key={it.testid} type="button" className={cx('g-ramayana-yatra__cmd-btn', it.i === 0 && 'is-primary')} disabled={it.disabled} onClick={() => choose(it.i)} data-testid={it.testid}>
            <span className="g-ramayana-yatra__key" aria-hidden="true">
              {n + 1}
            </span>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MoveList({ b, state, choose }: { b: BattleState; state: GameState; choose: (i: number) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const moves = battleMenu(state, env.content).moves.map((m) => ({ ...m, def: env.idx.move.get(m.id) }));
  const katha = isKatha(state.save);
  useButtons({
    num: (n) => {
      const m = moves[n - 1];
      if (m && m.usable) choose(n - 1);
    },
    b: () => choose(-1),
  });
  return (
    <div className="g-ramayana-yatra__list">
      {moves.map((m, i) => {
        const kindName = m.def ? env.idx.name.get(`kind.${m.def.challenge}`) : undefined;
        return (
          <button key={m.id} type="button" className={cx('g-ramayana-yatra__move', m.def && `el-${m.def.element}`)} disabled={!m.usable} onClick={() => choose(i)} data-testid={`move-${m.id}`}>
            <span className="g-ramayana-yatra__key" aria-hidden="true">
              {i + 1}
            </span>
            <span className="g-ramayana-yatra__move-name">
              <Name id={m.def?.nameId} fallback={m.id} />
              <span className="g-ramayana-yatra__move-meta">
                {m.def ? <ElementName el={m.def.element} /> : ''}
                {m.def && m.def.power > 0 ? (
                  <>
                    {' · '}
                    {ui.t('battle.power', { n: m.def.power }, { gloss: false })}
                  </>
                ) : (
                  ''
                )}
              </span>
              {moveDescription(env.content, m.id, katha) ? <span className="g-ramayana-yatra__move-desc">{ui.c(moveDescription(env.content, m.id, katha), { gloss: false })}</span> : null}
            </span>
            <span className="g-ramayana-yatra__move-side">
              {katha ? (
                // Kathā: a verse-bound astra is recited (its tag says श्लोकः); a plain move needs no input, so no tag
                astraBinding(env.content, m.id) ? (
                  <span className="g-ramayana-yatra__move-kind g-ramayana-yatra__astra-tag" data-testid={`astra-${m.id}`}>
                    {ui.t('common.verse', undefined, { gloss: false })}
                  </span>
                ) : null
              ) : (
                <span className="g-ramayana-yatra__move-kind">
                  {kindName ? <SaText>{kindName.sa}</SaText> : null} {m.def && !(ui.lang === 'sa' && kindName) ? KIND_EN[m.def.challenge] : ''}
                </span>
              )}
              <span className="g-ramayana-yatra__pp">
                {ui.t('common.pp', undefined, { gloss: false })} {ui.num(m.pp)}/{ui.num(m.maxPp)}
              </span>
            </span>
          </button>
        );
      })}
      <button type="button" className="g-ramayana-yatra__back" onClick={() => choose(-1)} data-testid="battle-back">
        {ui.t('common.back', undefined, { gloss: false })}
      </button>
    </div>
  );
}

function SwitchList({ b, state, choose }: { b: BattleState; state: GameState; choose: (i: number) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const menu = battleMenu(state, env.content);
  const rows = state.save.party.map((m, i) => {
    const def = env.idx.ally.get(m.id);
    const max = maxHpOf(m, env.content);
    return { m, i, def, max, disabled: !menu.switchable.includes(i) };
  });
  const forced = menu.forcedSwitch;
  useButtons({
    num: (n) => {
      const r = rows[n - 1];
      if (r && !r.disabled) choose(r.i);
    },
    b: () => (forced ? undefined : choose(-1)),
  });
  return (
    <div className="g-ramayana-yatra__list">
      {forced ? <p className="g-ramayana-yatra__cmd-q">{ui.t('battle.whoForward')}</p> : null}
      {rows.map((r) => (
        <button key={r.m.id} type="button" className={cx('g-ramayana-yatra__member', r.m.hp <= 0 && 'is-out')} disabled={r.disabled} onClick={() => choose(r.i)} data-testid={`switch-${r.m.id}`}>
          <span className="g-ramayana-yatra__key" aria-hidden="true">
            {r.i + 1}
          </span>
          <span className="g-ramayana-yatra__move-name">
            <HeroName id={r.m.id} playerName={state.save.playerName} />
          </span>
          <span className="g-ramayana-yatra__move-side">
            <span>
              {ui.t('common.lv', undefined, { gloss: false })} {ui.num(r.m.level)}
            </span>
            <HpBar hp={r.m.hp} max={r.max} />
          </span>
        </button>
      ))}
      {forced ? null : (
        <button type="button" className="g-ramayana-yatra__back" onClick={() => choose(-1)} data-testid="battle-back">
          {ui.t('common.back', undefined, { gloss: false })}
        </button>
      )}
    </div>
  );
}

function ItemList({ state, choose }: { state: GameState; choose: (i: number) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const ids = battleMenu(state, env.content).items;
  useButtons({
    num: (n) => {
      if (ids[n - 1]) choose(n - 1);
    },
    b: () => choose(-1),
  });
  return (
    <div className="g-ramayana-yatra__list">
      {ids.length === 0 ? <p className="g-ramayana-yatra__hint">{ui.t('battle.noItems')}</p> : null}
      {ids.map((id, i) => {
        const def = env.idx.item.get(id);
        return (
          <button key={id} type="button" className="g-ramayana-yatra__member" onClick={() => choose(i)} data-testid={`item-${id}`}>
            <span className="g-ramayana-yatra__key" aria-hidden="true">
              {i + 1}
            </span>
            <span className="g-ramayana-yatra__move-name">
              <Name id={def?.nameId} en={ui.lang !== 'sa'} fallback={id} />
              <span className="g-ramayana-yatra__move-meta">{ui.c(def?.description, { gloss: false })}</span>
            </span>
            <span className="g-ramayana-yatra__move-side">
              <span className="g-ramayana-yatra__qty">×{ui.num(state.save.items[id] ?? 0)}</span>
            </span>
          </button>
        );
      })}
      <button type="button" className="g-ramayana-yatra__back" onClick={() => choose(-1)} data-testid="battle-back">
        {ui.t('common.back', undefined, { gloss: false })}
      </button>
    </div>
  );
}

export function HpBar({ hp, max }: { hp: number; max: number }): ReactElement {
  const ui = useUi();
  const f = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  return (
    <span className="g-ramayana-yatra__hp" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp} aria-label={ui.plain('battle.hpOf', { hp, max })}>
      <span className={cx('g-ramayana-yatra__hp-fill', f <= 0.2 ? 'is-low' : f <= 0.5 ? 'is-mid' : '')} style={{ width: `${f * 100}%` }} />
    </span>
  );
}
