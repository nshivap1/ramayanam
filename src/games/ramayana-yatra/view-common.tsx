/**
 * Shared view plumbing (view agent): the environment every panel reads (content index, art,
 * script, motion, callbacks), small lookups and formatting helpers. Interface text comes from
 * content/sa-ui-*.json through useUi() (view-ui.tsx); every Sanskrit string is shown with <SaText>.
 */
import { type KeyboardEvent, type ReactElement, type ReactNode, createContext, useContext, useEffect, useRef } from 'react';
import type { Script } from '@sdk';
import { SaText, cx } from '@ui';
import { toDevaDigits } from '@sanskrit';
import type { Art } from './art';
import { type ContentIndex, indexOf } from './logic-util';
import type { DialogueLang, Element, GameContent, GameState, NameEntry } from './types';
import { DEFAULT_NAME } from './logic-state';
import { useUi } from './view-ui';

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface ViewPrefs {
  music: boolean;
  textSpeed: TextSpeed;
  /** No challenge timers (swift = correct on the first try). */
  relaxed: boolean;
  /** Story text language: English, Sanskrit + English, or Sanskrit only (Sambhāṣaṇa-Saṃskṛtam). */
  dialogueLang: DialogueLang;
  /** Kathā: battle casts recite themselves (answer { auto: true }); never asks for a word. */
  autoRecite: boolean;
  /** Kathā: recitation casts that showed the "Recall the missing word" caption (sa-en / en show it for the first 3). */
  recallHints: number;
  /** "Show the way" (v0.4.2): a marker on the map points to the next goal (logic guideTarget). Both journeys; on by default. */
  showWay: boolean;
}
export const DEFAULT_PREFS: ViewPrefs = { music: true, textSpeed: 'normal', relaxed: false, dialogueLang: 'en', autoRecite: false, recallHints: 0, showWay: true };

const SPEED_IDS: readonly TextSpeed[] = ['slow', 'normal', 'fast', 'instant'];
export const DIALOGUE_LANGS: readonly DialogueLang[] = ['en', 'sa-en', 'sa'];

/** Prefs as stored in prefs-v1 (anything unknown or malformed falls back to the default). */
export function readPrefs(raw: unknown): ViewPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof ViewPrefs, unknown>>;
  return {
    music: typeof r.music === 'boolean' ? r.music : DEFAULT_PREFS.music,
    textSpeed: SPEED_IDS.includes(r.textSpeed as TextSpeed) ? (r.textSpeed as TextSpeed) : DEFAULT_PREFS.textSpeed,
    relaxed: typeof r.relaxed === 'boolean' ? r.relaxed : DEFAULT_PREFS.relaxed,
    dialogueLang: DIALOGUE_LANGS.includes(r.dialogueLang as DialogueLang) ? (r.dialogueLang as DialogueLang) : DEFAULT_PREFS.dialogueLang,
    autoRecite: typeof r.autoRecite === 'boolean' ? r.autoRecite : DEFAULT_PREFS.autoRecite,
    recallHints: typeof r.recallHints === 'number' && Number.isFinite(r.recallHints) && r.recallHints >= 0 ? Math.min(99, Math.floor(r.recallHints)) : DEFAULT_PREFS.recallHints,
    showWay: typeof r.showWay === 'boolean' ? r.showWay : DEFAULT_PREFS.showWay,
  };
}

/**
 * The Sambhāṣaṇa version of an English story string (exact-key lookup in content.dialogueSa), or null when the
 * player reads English or the line has no translation yet (then the English is shown, silently).
 */
export function storySa(content: GameContent, lang: DialogueLang, en: string | null | undefined, avatar: 'a' | 'b' = 'a', playerName?: string): string | null {
  if (!en || lang === 'en') return null;
  const sa = content.dialogueSa?.[en];
  if (!sa || !sa.trim()) return null;
  const g = resolveGender(sa.trim(), avatar);
  return playerName === undefined ? g : saPlayer(g, playerName, avatar);
}

/** The player kept the default name (English 'Shishya', or blank): in Sanskrit they are simply शिष्य / शिष्या. */
export function isDefaultName(name: string | null | undefined): boolean {
  const n = (name ?? '').trim();
  return !n || n === DEFAULT_NAME || n === 'शिष्यः' || n === 'शिष्या' || n === 'शिष्य';
}

/**
 * `{player}` in a Sanskrit line (after {g:…} is resolved). A name the player typed stays as typed. The default
 * name has no Sanskrit "name", so the player is addressed as the student: शिष्य / शिष्ये (vocative, the usual
 * use), शिष्यः / शिष्या after नाम ("your name is …"), and nothing after an explicit शिष्य-form
 * (sa-battle's "{g:शिष्यः|शिष्या} {player}" → just शिष्यः). These forms are verified in sa-battle.json.
 */
export function saPlayer(sa: string, playerName: string, avatar: 'a' | 'b'): string {
  if (!sa.includes('{player}') || !isDefaultName(playerName)) return sa;
  const voc = avatar === 'b' ? 'शिष्ये' : 'शिष्य';
  const nom = avatar === 'b' ? 'शिष्या' : 'शिष्यः';
  return sa
    .replace(/(शिष्यः|शिष्या|शिष्यस्य|शिष्यायाः)\s*\{player\}/gu, '$1')
    .replace(/नाम\s*\{player\}/gu, `नाम ${nom}`)
    // "I am {player}" / "{player} am I": a predicate nominative, not an address (kc-qa P0: "अहं शिष्य।")
    .replace(/(अहं|अहम्)\s*\{player\}/gu, `$1 ${nom}`)
    .replace(/\{player\}(\s*(?:अस्मि|अहम्|अहं))/gu, `${nom}$1`)
    .replace(/\{player\}/g, voc);
}

/**
 * Gendered words that address or describe the player are written `{g:masculine|feminine}` in the Sanskrit
 * (e.g. `{g:वत्स|वत्से}`); avatar 'b' is the female student (शिष्या), 'a' the male one (शिष्य).
 */
export function resolveGender(sa: string, avatar: 'a' | 'b'): string {
  return sa.replace(/\{g:([^{}|]*)\|([^{}]*)\}/g, (_m, m: string, f: string) => (avatar === 'b' ? f : m));
}

export interface ViewEnv {
  content: GameContent;
  idx: ContentIndex;
  art: Art;
  script: Script;
  level: number;
  reduced: boolean;
  prefs: ViewPrefs;
  playerName: string;
  avatar: 'a' | 'b';
  /** Open a word card; `form` highlights that inflected form (from {f:…} markup). */
  openWord(lexId: string, form?: string): void;
  openShloka(id: string): void;
  /** Change a view preference (prefs-v1); panels use it for the Kathā recitation toggle and caption count. */
  setPrefs?(p: ViewPrefs): void;
}

export const EnvContext = createContext<ViewEnv | null>(null);

export function useEnv(): ViewEnv {
  const env = useContext(EnvContext);
  if (!env) throw new Error('ramayana-yatra: EnvContext missing');
  return env;
}

export function makeIndex(content: GameContent): ContentIndex {
  return indexOf(content);
}

const warned = new Set<string>();
/** Log a missing content id once (never an error: unknown ids simply render nothing). */
export function warnOnce(what: string, id: string): void {
  const k = `${what}:${id}`;
  if (warned.has(k)) return;
  warned.add(k);
  console.warn(`[ramayana-yatra] unknown ${what} id "${id}"`);
}

export function nameOf(idx: ContentIndex, id: string | undefined): NameEntry | undefined {
  if (!id) return undefined;
  const n = idx.name.get(id);
  if (!n) warnOnce('name', id);
  return n;
}

/**
 * Sanskrit name (SaText) with an optional muted English gloss; renders the fallback when missing.
 * The gloss is dropped when the player reads संस्कृतम् only (dialogueLang 'sa'); English and sa-en keep it.
 */
export function Name({ id, en, fallback, className }: { id: string | undefined; en?: boolean; fallback?: string; className?: string }): ReactElement | null {
  const env = useEnv();
  const n = nameOf(env.idx, id);
  if (!n) return fallback ? <span className={className}>{fallback}</span> : null;
  return (
    <span className={className}>
      <SaText>{n.sa}</SaText>
      {en && env.prefs.dialogueLang !== 'sa' ? <span className="g-ramayana-yatra__en"> {n.en}</span> : null}
    </span>
  );
}

/**
 * The player's name as shown in the interface: what they typed, or — when they kept the default (isDefaultName)
 * and Sanskrit is shown — शिष्यः / शिष्या (sa-ui `newGame.defaultName`, by avatar). The save always keeps
 * DEFAULT_NAME ('Shishya'), so Sanskrit lines can still address the player as शिष्य / शिष्ये (saPlayer).
 */
export function PlayerName({ name }: { name?: string }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const n = name ?? env.playerName;
  if (ui.isSa && isDefaultName(n)) return <>{ui.t('newGame.defaultName', undefined, { gloss: false })}</>;
  return <>{n}</>;
}

/** English (diacritics stripped, ASCII) label for the pixel font in the canvas. */
export function asciiLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '')
    .trim();
}

/** English name of a name id (content `en`), or a prettified id. */
export function englishName(idx: ContentIndex, id: string | undefined, fallbackId: string): string {
  const n = id ? idx.name.get(id) : undefined;
  if (n) return n.en.replace(/\s*\(.*\)\s*$/, '');
  return fallbackId.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ELEMENT_COLOR: Record<Element, string> = {
  agni: 'rgb(255 122 48)',
  jala: 'rgb(72 152 255)',
  vayu: 'rgb(170 236 240)',
  bhumi: 'rgb(170 130 70)',
  divya: 'rgb(255 214 90)',
  maya: 'rgb(178 96 230)',
  none: 'rgb(240 240 240)',
};

export const KIND_EN: Record<string, string> = {
  artha: 'Meaning',
  lipi: 'Script',
  purana: 'Fill in',
  krama: 'Word order',
  viccheda: 'Split',
  vibhakti: 'Role',
};

export const TIER_EN: Record<string, string> = { unseen: 'Unseen', seen: 'Seen', known: 'Known', mastered: 'Mastered' };

export const ELEMENT_EN: Record<Element, string> = { agni: 'Fire', jala: 'Water', vayu: 'Wind', bhumi: 'Earth', divya: 'Divine', maya: 'Illusion', none: 'Neutral' };

/** Term groups with a Sanskrit name in names.json (`element.agni`, `kind.artha`, `tier.known`). */
export type TermGroup = 'element' | 'kind' | 'tier';
const TERM_EN: Record<TermGroup, Record<string, string>> = { element: ELEMENT_EN, kind: KIND_EN, tier: TIER_EN };

/** English label of a term (ELEMENT_EN / KIND_EN / TIER_EN; the id itself when unknown). */
export function termEn(group: TermGroup, id: string): string {
  return TERM_EN[group][id] ?? id;
}

/**
 * A term as a sa-ui slot value: `{ en: 'Fire', sa: '{n:element.agni}' }` (the Sanskrit is the names.json stem, so use it
 * only in `label` entries). E.g. ui.t('party.moveMeta', { el: termSlot('element', mv.element), … }).
 */
export function termSlot(group: TermGroup, id: string): { en: string; sa: string } {
  return { en: termEn(group, id), sa: `{n:${group}.${id}}` };
}

/**
 * A term in the player's language: English (en), the Sanskrit name (sa), or the Sanskrit with a small English gloss
 * (sa-en; `gloss={false}` drops it, e.g. in tight chips).
 */
export function Term({ group, id, gloss = true }: { group: TermGroup; id: string; gloss?: boolean }): ReactElement {
  const env = useEnv();
  const en = termEn(group, id);
  const lang = env.prefs.dialogueLang;
  const n = env.idx.name.get(`${group}.${id}`);
  if (lang === 'en' || !n) return <>{en}</>;
  return (
    <>
      <SaText>{n.sa}</SaText>
      {lang === 'sa-en' && gloss ? <span className="g-ramayana-yatra__ui-en"> {en}</span> : null}
    </>
  );
}

/** "1.2.15" reference with the kanda's Sanskrit name (from names.json); Devanagari digits when Sanskrit is shown. */
export function VerseRef({ kanda, sarga, verse }: { kanda: number; sarga: number; verse: number }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const n = env.idx.name.get(`kanda.${kanda}`);
  return (
    <span className="g-ramayana-yatra__ref">
      {n ? <SaText>{n.sa}</SaText> : <span>{ui.t('hud.book', { k: kanda }, { gloss: false })}</span>} {ui.isSa ? <SaText>{toDevaDigits(`${kanda}.${sarga}.${verse}`)}</SaText> : <>{kanda}.{sarga}.{verse}</>}
    </span>
  );
}

/**
 * Dialogue-language picker (Settings and the New-journey screen): a 3-way segmented radio group,
 * ≥ 44 px targets, Tab to reach, arrows to move. The Sanskrit label is names.json `ui.samskritam`.
 */
export function DialogueLangControl({ value, onChange, idx }: { value: DialogueLang; onChange: (v: DialogueLang) => void; idx: ContentIndex }): ReactElement {
  const ui = useUi();
  const sa = idx.name.get('ui.samskritam')?.sa;
  const word = (): ReactNode => (sa ? <SaText>{sa}</SaText> : 'Sanskrit');
  // "English" names the language in its own script (so a reader can always find the way back): data-en-ok
  const label: Record<DialogueLang, ReactNode> = {
    en: <span data-en-ok="">English</span>,
    'sa-en': (
      <>
        {word()}
        <span className="g-ramayana-yatra__seg-plus" data-en-ok="">
          {' '}+ English
        </span>
      </>
    ),
    sa: word(),
  };
  const aria: Record<DialogueLang, string> = { en: 'English', 'sa-en': ui.plain('lang.withEn', { lang: 'English' }), sa: ui.plain('lang.saOnly') };
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    const i = (DIALOGUE_LANGS.indexOf(value) + step + DIALOGUE_LANGS.length) % DIALOGUE_LANGS.length;
    const next = DIALOGUE_LANGS[i] ?? 'en';
    onChange(next);
    refs.current[i]?.focus();
  };
  return (
    <div className="g-ramayana-yatra__dlang">
      <div className="g-ramayana-yatra__seg" role="radiogroup" aria-label={ui.plain('lang.group')} onKeyDown={onKey} data-testid="dialogue-lang">
        {DIALOGUE_LANGS.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === id}
            aria-label={aria[id]}
            tabIndex={value === id ? 0 : -1}
            className={cx('g-ramayana-yatra__seg-btn', value === id && 'is-on')}
            onClick={() => onChange(id)}
            data-testid={`dlang-${id}`}
          >
            {label[id]}
          </button>
        ))}
      </div>
      <p className="g-ramayana-yatra__dlang-note">{ui.t('lang.note', undefined, { block: true })}</p>
    </div>
  );
}

export function avatarOf(state: GameState | null): 'a' | 'b' {
  return state?.save.avatar === 'b' ? 'b' : 'a';
}

export function Pixel({ children, className }: { children: ReactNode; className?: string }): ReactElement {
  return <div className={`g-ramayana-yatra__pixel ${className ?? ''}`}>{children}</div>;
}

/** Prefers-reduced-motion from the OS, in addition to the platform setting. */
export function osReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const STEP_MS = 140;
export const MOVE_STEP_MS = 180;

/** Keyboard routing: the active leaf panel registers what A / B / 1–4 do. */
export interface Buttons {
  a?: () => void;
  b?: () => void;
  num?: (n: number) => void;
}
export const KeysContext = createContext<{ current: Buttons }>({ current: {} });

export function useButtons(b: Buttons): void {
  const ref = useContext(KeysContext);
  const latest = useRef(b);
  latest.current = b;
  useEffect(() => {
    const h: Buttons = { a: () => latest.current.a?.(), b: () => latest.current.b?.(), num: (n) => latest.current.num?.(n) };
    ref.current = h;
    return () => {
      if (ref.current === h) ref.current = {};
    };
  }, [ref]);
}
