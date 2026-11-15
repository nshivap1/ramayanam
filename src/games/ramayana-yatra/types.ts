/**
 * रामायणयात्रा · Rāmāyaṇa-yātrā — shared contracts for every module of this game.
 *
 * OWNER: orchestrator. All agents code against these types. Do NOT change an existing type;
 * if you truly need a change, add an OPTIONAL field and record it in notes/<area>.md.
 *
 * Platform rules that shape this file (see AGENTS.md, docs/GAME_CONTRACT.md, docs/SANSKRIT_ACCURACY.md):
 *  - Sanskrit is authored in Devanagari (NFC) only. IAST is ALWAYS derived (devaToIast / <SaText>).
 *  - Logic is pure + deterministic: no DOM, no Date, no Math.random. Randomness = createRng(seed ^ hash(label+tick)).
 *  - Imports inside the game folder must start with './' (no '../'), so modules live flat in this folder.
 */
import type { Level } from '@sdk';
import type { TileId, SpriteId, BattlerId, TrackId, BattleBgId } from './catalog';

/** Devanagari string (NFC). Never store IAST. */
export type Deva = string;

/** A named thing: Sanskrit (Devanagari) + English. */
export interface Named {
  sa: Deva;
  en: string;
}

// ───────────────────────── Audit metadata ─────────────────────────

export interface SourceRef {
  name: string; // e.g. "Vālmīki Rāmāyaṇa, valmikiramayan.net (Gita Press-based text)"
  url?: string;
  accessed?: string; // YYYY-MM-DD
  note?: string;
}

/** Mirrors the platform Provenance idea: machine checks + sources. Agents NEVER set humanReviewed. */
export interface Provenance {
  sources: SourceRef[];
  /** e.g. ["source:valmikiramayan.net", "source:sanskritdocuments.org", "engine:checkAnustubh", "engine:joinSandhiDeva"] */
  verifiedBy: string[];
  humanReviewed?: false;
  notes?: string;
}

// ───────────────────────── Rāmāyaṇa content (content/shlokas.json, content/lexicon.json) ─────────────────────────

export type KandaId = 1 | 2 | 3 | 4 | 5 | 6;

export type GrammarRole =
  | 'subject' // prathamā
  | 'object' // dvitīyā
  | 'instrument' // tṛtīyā
  | 'recipient' // caturthī
  | 'source' // pañcamī
  | 'possessor' // ṣaṣṭhī
  | 'location' // saptamī
  | 'address' // sambodhana
  | 'verb'
  | 'indeclinable'
  | 'modifier';

export interface ShlokaWord {
  /** Word with sandhi resolved (pada-ccheda form), e.g. त्वम्, अगमः. */
  form: Deva;
  /** LexEntry.id */
  lexId: string;
  /** e.g. "acc. sg. f.", "2nd sg. aorist", "indecl." */
  grammar: string;
  /** Meaning in this verse (English). */
  gloss: string;
  role?: GrammarRole;
  /** Index (0–3) of the pāda this word belongs to. */
  pada: number;
  /**
   * English note, set when this word has an open edition variant listed in REVIEW.md (another witness reads a
   * different word here). Such a word is never the gap of a pūraṇa challenge until a human reviewer decides (QA 11 Nov).
   */
  variant?: string;
}

export interface SandhiNote {
  joined: Deva; // as printed, e.g. त्वमगमः
  split: Deva[]; // e.g. ["त्वम्", "अगमः"]
  note: string; // English explanation
}

export interface Shloka {
  /** Stable semantic id, e.g. "s-ma-nishada". Never renumber. */
  id: string;
  kanda: KandaId;
  sarga: number;
  verse: number;
  /** Edition / numbering note, e.g. "Vulgate (Gita Press) numbering as on valmikiramayan.net". */
  edition: string;
  meter: 'anustubh' | 'other';
  /** Exactly 4 pādas for anuṣṭubh, letter-for-letter as printed in the cited source (no daṇḍas). */
  padas: Deva[];
  /** Set when a pāda does not scan as pathyā (e.g. "pāda 3: vipulā"). Never edit the text to make it scan. */
  meterNote?: string;
  words: ShlokaWord[];
  sandhiNotes: SandhiNote[];
  /** Original English rendering written for Samskuru (never copied from a copyrighted translation). */
  translation: string;
  /** Who speaks, to whom, situation (1–3 sentences). */
  context: string;
  speaker: string;
  teaches: string[];
  provenance: Provenance;
  /**
   * v0.6: a verse of the Kathā journey only (shlokas-3/4/5.json; plan §0.1): heard in Kathā (never a gate, never
   * restorable), never seen by the practice game (logic-journey `journeyContent` filters it out).
   */
  kathaOnly?: true;
  /**
   * v0.6 (optional): the verse it follows in its book's story order (verse book, book screens). Default: before the
   * first v0.5 verse of the book with a higher sarga.verse, else at the end (content.ts `bookOrder`).
   */
  storyAfter?: string;
}

export type PartOfSpeech = 'noun' | 'adjective' | 'pronoun' | 'verb' | 'indeclinable' | 'participle' | 'name' | 'numeral' | 'compound';

export interface LexEntry {
  /** ASCII slug of the IAST lemma (e.g. "dharma", "gam", "rama"); -2, -3 to disambiguate. */
  id: string;
  /** Citation form: nominal stem/nominative per SANSKRIT_ACCURACY conventions, or root (गम्). */
  lemma: Deva;
  pos: PartOfSpeech;
  gender?: 'm' | 'f' | 'n';
  /** Short quiz gloss (≤ 40 chars). */
  meaning: string;
  notes?: string;
  /** Inflected forms as they occur in the verses. v0.6: `kathaOnly` = a form only the v0.6 lexicon files add (set by content.ts). */
  forms: { form: Deva; grammar: string; shlokaIds: string[]; kathaOnly?: true }[];
  /** Distractor tags: person, nature, virtue, action, time, place, body, weapon, animal, family, emotion, number, grammar-word, speech. */
  tags: string[];
  provenance: Provenance;
  /** v0.6: an entry only the v0.6 lexicon files (lexicon-3/4/5) define — Kathā-only (set by content.ts, never in JSON). */
  kathaOnly?: true;
}

/** Other game-local Sanskrit (names of people, places, moves, items, chapters). content/names.json */
export interface NameEntry {
  id: string; // e.g. "move.agneyastra", "place.ayodhya", "person.rama", "kanda.1"
  sa: Deva;
  en: string;
  provenance: Provenance; // e.g. Monier-Williams entry, or the Rāmāyaṇa verse where it occurs
  /** v0.6: a name of names-3/4/5/6.json — Kathā-only (set by content.ts, never in JSON). */
  kathaOnly?: true;
}

// ───────────────────────── Learning ─────────────────────────

/**
 * v0.5b P6 (WP-C, notes/v05b-plan.md §4): 'antya' is the pick in a verse-chain duel (śloka-antyakṣarī) — three full
 * pādas, exactly one opening with the key sound. It uses `options` / `answers` like a classic challenge (so the
 * bots, `opt-<id>` test ids and grading work unchanged) and carries `Challenge.antya`. Never drawn at random.
 */
export type ChallengeKind = 'artha' | 'lipi' | 'purana' | 'krama' | 'viccheda' | 'vibhakti' | 'smarana' | 'antya';

/**
 * Journey style (Kathā mode, v0.4). 'abhyasa' = the practice game (every move a challenge, random encounters);
 * 'katha' = story first: astras are recited (smarana challenges), plain moves need no input, no random encounters,
 * story quizzes are skipped (their onCorrect runs), verse moments show anvaya + सरलार्थः. Spec: notes/katha.md.
 */
export type JourneyStyle = 'katha' | 'abhyasa';

/**
 * Reader level (v0.4.3): how the player reads the game, mirrored from the view preference `prefs.dialogueLang` by the
 * action `set-reader`. 'sa' = संस्कृतम् only, 'sa-en' = संस्कृतम् + English; absent = English (today's challenge mix).
 * A reader of Devanagari never gets `lipi` (script) challenges; 'sa' also never gets `artha` for a basic word and
 * prefers the harder kinds (logic-learning `readerChain`, logic-reader `isBasicWord`; PRD → Challenge mix).
 */
export type Reader = 'sa' | 'sa-en';

/** One printed chunk of a pāda in a smarana (recitation) challenge. */
export interface SmaranaChunk {
  /** the chunk exactly as printed in the pāda (split on spaces); Devanagari */
  text: Deva;
  /** how it is shown: whole, only its first akṣara (a memory hint), or a gap the player fills */
  show: 'full' | 'hint' | 'gap';
}

/** The recitation part of a smarana challenge. */
export interface SmaranaSpec {
  shlokaId: string;
  pada: number;
  /** the pāda's printed chunks, in order */
  chunks: SmaranaChunk[];
  /** chunk index that is the gap, as a one-element array, or [] (level 0, a mastered pāda's self-recital, automatic recitation). Never more than one. */
  gaps: number[];
  /** per gap (same order as `gaps`): three options (ids unique within the challenge) */
  gapOptions: ChallengeOption[][];
  /** per gap: the accepted option ids */
  gapAnswers: string[][];
  /** smṛti level the challenge was built at (0–4; 4 = mastered: recites itself unless this cast is a spot check) */
  level: number;
  /** true when a mastered pāda is spot-checked on this cast (an L3-style gap) */
  check?: boolean;
  /** laghu / guru per akṣara of the printed pāda (chandas engine), for the view's metre marks; may be absent */
  weights?: ('L' | 'G')[];
}

export interface ChallengeOption {
  id: string; // stable within the challenge ("o0".."o3")
  /** Sanskrit option (Devanagari; the view renders it with <SaText>) … */
  sa?: Deva;
  /** … or an English option. Exactly one of sa/en is set. */
  en?: string;
  /** lipi challenges force a script for options/stimulus. */
  script?: 'deva' | 'iast';
  /**
   * Sambhāṣaṇa version of an English INTERFACE option (a vibhakti case-role name, the placeholder's "Continue"),
   * from content/sa-ui-b.json; shown when the story-text language is Sanskrit. Meaning options (artha) have none:
   * their English gloss is the meaning being taught.
   */
  labelSa?: string;
}

export interface Challenge {
  id: string; // unique per game (e.g. "c-123")
  kind: ChallengeKind;
  prompt: string; // English instruction
  /** Sanskrit stimulus (word or pāda; a blank is written "＿＿"). */
  stimulus?: Deva;
  stimulusScript?: 'deva' | 'iast'; // forced script (lipi)
  shlokaId?: string;
  padaIndex?: number;
  options?: ChallengeOption[];
  /** ids of ALL accepted options (vikalpa / homographs => more than one). */
  answers?: string[];
  /** krama: tiles (Devanagari words) in shuffled order */
  tiles?: Deva[];
  /** krama: every accepted order (each = indexes into tiles). Verse order is the keyed one. */
  orders?: number[][];
  lexIds: string[];
  explanation: string; // teaching moment (English; may include {w:lexId} markup)
  timeLimitMs: number; // 0 = untimed
  /** Sambhāṣaṇa version of `prompt` (content/sa-ui-b.json learn.*Prompt, slots filled); unset without interface strings */
  promptSa?: string;
  /**
   * Sambhāṣaṇa version of `explanation` (learn.* keys; may use {w:} {f:} markup). It leaves out the English glosses,
   * grammar notes and verse translation (the meaning stays reachable on the word / verse card).
   */
  explanationSa?: string;
  /** smarana (recite the pāda) challenges only: chunks, gaps and per-gap options. `options`/`answers` stay unset. */
  smarana?: SmaranaSpec;
  /** v0.5b P6 (WP-C): 'antya' (verse-chain pick) challenges only; `options` / `answers` hold the three pādas */
  antya?: AntyaSpec;
}

/** A pāda of a verse (shlokaId + pāda index 0–3). */
export interface PadaRefT {
  shlokaId: string;
  pada: number;
}

/**
 * v0.5b P6 (WP-C, logic-chain.ts): what a verse-chain pick shows. The key is the last consonant of the other side's
 * pāda (`splitAksharas`; vowel signs, ं, ः and ् ignored); a valid answer is a heard pāda whose first consonant is the key.
 */
export interface AntyaSpec {
  /** the key consonant (Devanagari); null = any line opens (the chain was reset) */
  key: Deva | null;
  /** the other side's pāda that set the key (shown in full, the key akṣara highlighted) */
  prev?: PadaRefT;
  /** per option (same order as `Challenge.options`): the pāda that option is, verbatim */
  lines: PadaRefT[];
}

/** Kathā: one answered smarana challenge (GameState.lastSmarana). */
export interface SmaranaResult {
  challenge: Challenge;
  /** the option ids picked (one per gap; [] when the line had no gap or was recited automatically) */
  picks: string[];
  /** full effect (a correct pick, a line with no gap, or automatic recitation) */
  correct: boolean;
  /** automatic recitation (no input; mastery untouched) */
  auto: boolean;
  /** where it was answered ('scene': a story recitation `{smarana}`, v0.5b P1) */
  context: 'battle' | 'recite' | 'scene';
}

export interface ChallengeResult {
  correct: boolean;
  swift: boolean; // correct within 40% of the limit (or first try when untimed)
  timeMs: number;
}

export interface WordProgress {
  seen: number;
  correct: number;
  wrong: number;
  box: number; // Leitner 0..5
  lastStep: number;
}

export type MasteryTier = 'unseen' | 'seen' | 'known' | 'mastered';

export interface ShlokaProgress {
  heard: boolean;
  restored: boolean;
  best: number; // 0..1
}

// ───────────────────────── Battle definitions (content/defs.json) ─────────────────────────

export type Element = 'agni' | 'jala' | 'vayu' | 'bhumi' | 'divya' | 'maya' | 'none';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export type MoveEffectKind = 'heal' | 'buff-atk' | 'buff-def' | 'debuff-atk' | 'debuff-def' | 'stun' | 'drain';

export interface MoveEffect {
  kind: MoveEffectKind;
  /** heal/drain: fraction of max HP. buffs: stages (±1..3). stun: chance 0..1. */
  amount: number;
  target: 'self' | 'party' | 'enemy';
}

export interface MoveDef {
  id: string;
  nameId: string; // NameEntry id, e.g. "move.agneyastra"
  element: Element;
  power: number; // 0 = status move
  pp: number;
  challenge: ChallengeKind;
  effect?: MoveEffect;
  description: string;
  origin: string;
  unlockShloka?: string;
}

export interface CombatantDef {
  id: string;
  nameId: string; // NameEntry id
  battler: BattlerId;
  element: Element;
  base: Stats;
  growth: Stats;
  moves: { moveId: string; level: number }[];
  description: string;
}

export interface AllyDef extends CombatantDef {
  overworld: SpriteId;
}

export interface EnemyDef extends CombatantDef {
  xp: number;
  niska: number;
  kind: 'wild' | 'boss' | 'duelist';
  restoresWords?: string[]; // lexIds
  intro?: string;
  defeatLine?: string;
  drops?: { itemId: string; chance: number }[];
}

export interface ItemDef {
  id: string;
  nameId: string;
  kind: 'heal' | 'pp' | 'revive' | 'buff' | 'key';
  amount: number;
  price: number;
  description: string;
}

export interface BattleSpec {
  enemies: { id: string; level: number }[];
  kind: 'wild' | 'boss' | 'duel';
  canRun: boolean;
  canLose: boolean;
  bg: BattleBgId;
  music: TrackId;
  intro?: string;
  /**
   * Kathā only (v0.4.1): the hero (AllyDef id) who steps forward first in a wild or boss fight, when conscious — e.g.
   * "rama" for Rāvaṇa, so the hero who holds the verse-bound astras fights. The practice game ignores it.
   */
  lead?: string;
  /**
   * Kathā only (v0.4.3): the first story fight of the game, Bharadvāja's duel by the Tamasā, played as call and
   * response — the duelist says a pāda in full (a model beat), the player says it back with one gap; every beat waits
   * for a tap and the first recitation is coached (notes/katha.md → "Tutorial duel"). The practice game ignores it.
   */
  tutorial?: boolean;
}

// ───────────────────────── World (content/story-*.json) ─────────────────────────

export type Dir = 'up' | 'down' | 'left' | 'right';
/** "flag", "!flag", "a&b&!c". Empty/undefined = true. */
export type FlagCond = string;

export interface NpcDef {
  id: string; // unique within the map
  sprite: SpriteId;
  x: number;
  y: number;
  facing: Dir;
  event: string;
  showIf?: FlagCond;
  solid?: boolean;
}

export interface WarpDef {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  facing?: Dir;
  requires?: FlagCond;
  lockedEvent?: string;
}

export interface TriggerDef {
  x: number;
  y: number;
  w: number;
  h: number;
  event: string;
  once?: boolean; // default true
  requires?: FlagCond;
  /**
   * v0.5b P3 (WP-B): a guard's line of sight. While active (`requires` holds and, for a once-trigger, its flag is not set)
   * `findPath` treats it as a wall (so the map pointer, `runGuide` and the RY_FULL bot keep out of sight) and the e2e
   * snapshot grid marks it '#'. Stepping on it still runs its event (a guard turns). Kathā only: world.test requires
   * `requires` to include style.katha.
   */
  avoid?: boolean;
}

export interface SignDef {
  x: number;
  y: number;
  text: string;
}

export interface EncounterTable {
  rate: number;
  table: { enemyId: string; weight: number; minLevel: number; maxLevel: number }[];
}

export interface MapDef {
  id: string;
  nameId: string; // NameEntry id (place.*)
  kanda: KandaId;
  width: number;
  height: number;
  legend: Record<string, TileId>;
  ground: string[];
  overlay?: string[];
  music: TrackId;
  battleBg: BattleBgId;
  /** Ambient tint for retro-modern lighting: 'day' | 'dusk' | 'night' | 'dawn' | 'interior'. */
  light?: 'day' | 'dusk' | 'night' | 'dawn' | 'interior';
  encounters?: EncounterTable;
  npcs: NpcDef[];
  warps: WarpDef[];
  triggers: TriggerDef[];
  signs?: SignDef[];
  onEnter?: string;
  /** v0.6 WP0: hidden spots (Kathā only) — see SpotDef */
  spots?: SpotDef[];
}

/**
 * v0.6 WP0: a hidden spot on a map (a tree that remembers, a grove where the vānaras dance): facing tile (x, y) and
 * pressing A runs `event` while `requires` holds (Kathā only: world.test requires style.katha in it). With `glow` the
 * tile shimmers softly while the spot is active. Never a walkthrough step: the pointer and the bots never go there.
 */
export interface SpotDef {
  x: number;
  y: number;
  event: string;
  requires: FlagCond;
  glow?: boolean;
}

/**
 * Event script commands. Text is ENGLISH with optional inline markup:
 *   {w:lexId}  a lexicon word (rendered in the player's script, tappable for its meaning)
 *   {n:nameId} a game-local Sanskrit name from names.json
 *   {f:shlokaId:wordIndex} the exact inflected form shloka.words[wordIndex].form (used by challenge explanations)
 *   {player}   the player's name        {b:text} emphasis
 * Never put Devanagari or IAST directly in text — reference content instead.
 */
export type EventCmd =
  | { say: string; who?: string; portrait?: SpriteId }
  | { shloka: string; mode?: 'hear' | 'restore' }
  | { choice: string; options: { label: string; goto?: string; set?: string }[] }
  | { label: string }
  | { goto: string }
  | { if: FlagCond; then: EventCmd[]; else?: EventCmd[] }
  | { set: string }
  | { unset: string }
  | { give: string; qty?: number }
  | { take: string; qty?: number }
  | { niska: number }
  | { learn: string[] }
  | { quiz: ChallengeKind; lexIds?: string[]; shlokaId?: string; onCorrect?: EventCmd[]; onWrong?: EventCmd[] }
  | { battle: BattleSpec; onWin?: EventCmd[]; onLose?: EventCmd[] }
  | { join: string; level?: number }
  | { leave: string }
  | { heal: true }
  | { rest: true } // full heal + respawn point here
  | { shrine: true } // āśrama shrine menu: rest · recite a heard verse · save
  | { warp: string; x: number; y: number; facing?: Dir }
  | { move: string; path: Dir[] } // npc id (current map) or "player"
  | { face: string; dir: Dir }
  | { wait: number }
  | { fade: 'out' | 'in' }
  | { music: TrackId }
  | { sfx: 'tap' | 'correct' | 'wrong' | 'win' | 'lose' | 'merge' | 'tick' | 'levelup' }
  | { shop: string[] }
  | { save: true }
  | { chapter: KandaId }
  | { objective: string } // sets the quest-log line shown in the HUD ("Find Vālmīki by the river")
  | { end: true }
  // ── v0.5b (notes/v05b-plan.md §1): Kathā only — world.test refuses them outside a `{ "if": "style.katha", "then": [...] }` block ──
  /** P1 (WP-A, logic-scene.ts): the player says one pāda as the story's action (a smarana challenge, context 'scene'); "least" = the verse's least-practised pāda */
  | { smarana: string; pada: number | 'least' }
  /** P2 (WP-A, logic-scene.ts): a read-only review of one book (the book-complete screen in review mode); ▶ continues */
  | { book: KandaId }
  /** P5 (WP-D, logic-setu.ts): Nala's bridge puzzle, seeded by its tag; the script continues once it is solved */
  | { setu: string }
  // ── v0.6 WP0 (notes/v06-wp0.md): the effects kit (logic-stage.ts), hotspots, told cutscenes, verse echoes. Kathā only:
  //    world.test refuses them outside a Kathā block. Kit commands never wait (compose them with {wait}); each has a
  //    reduced-motion path in the view and is exposed to e2e (expose.stage, window.__ryKitLog). ──
  /** a screen effect: shake / flash (one-shot, `ms`), petals / rain (fall for `ms`), tint (a colour wash until another tint or the script ends) */
  | { fx: KitFxName; ms?: number; color?: TintColor }
  /** these figures fall (lie down) — npc ids of this map, "player", prop ids; or everyone on the map but these */
  | { topple: StageTarget }
  /** these figures stand up again ("all": everyone lying down) */
  | { rise: StageTarget | 'all' }
  /** a figure's sprite scale (1 = normal; 0.5–4), anchored at its feet, animated */
  | { grow: string; scale: number }
  /** a tile shimmer for `ms` (one-shot; w × h tiles); color "fire": flames instead of the gold shimmer (v0.6.1) */
  | { glow: { x: number; y: number; w?: number; h?: number }; ms?: number; color?: GlowColor }
  /** a small object: placed `at` a tile / a figure, moved `to`, carried by a figure (drawn over its head), or removed */
  | { prop: string; sprite?: PropSprite; at?: StagePos; to?: StagePos; carry?: string | null; remove?: true; ms?: number }
  /** a projectile across tiles: from → through… → to, in `ms` (one-shot) */
  | { arrow: { from: StagePos; to: StagePos; through?: StagePos[] }; ms?: number }
  /** v0.6.1: a small picture bubble over a figure for `ms` (one-shot): music, a heart, tears, !, ?, anger, …, sleep, a sparkle */
  | { emote: string; icon: EmoteIcon; ms?: number }
  /** v0.6.1: these figures hop `n` times (1–3; one-shot) — joy, a start of surprise */
  | { hop: StageTarget | string; n?: number }
  /** v0.6.1: the camera glides to a tile / a figure and stays there until another focus, `null` (back to the player) or the script ends */
  | { focus: StagePos | null }
  /** a hidden moment: tile (x, y) shimmers for `ms`; tap it / A → `then` runs (and `flag` is set); ▶ / B / the timer → passes */
  | { hotspot: { x: number; y: number }; then: EventCmd[]; flag?: string; ms?: number }
  /** a told cutscene (content/cutscene-<id>.json, logic-told.ts); the script waits until it has played */
  | { cutscene: string }
  /** a verse echo noticed (content/katha-echoes.json): sets echo.<id>, a toast with its title; the verse book shows the title */
  | { echo: string };

// ───────────────────────── v0.6 WP0: effects kit, hotspots, told cutscenes, echoes ─────────────────────────

/** One-shot / timed screen effects of the kit (v0.6.1 adds wind, smoke, birds, embers, dust, rays, lamps). */
export type KitFxName = 'shake' | 'flash' | 'petals' | 'rain' | 'tint' | 'wind' | 'smoke' | 'birds' | 'embers' | 'dust' | 'rays' | 'lamps';
/** v0.6.1: the timed screen effects drawn over the whole stage (no state). */
export type KitScreenFx = Exclude<KitFxName, 'tint'>;
/** v0.6.1: the pictures an `{ "emote" }` bubble can hold. */
export type EmoteIcon = 'music' | 'heart' | 'tears' | 'exclaim' | 'question' | 'anger' | 'dots' | 'sleep' | 'sparkle';
/** v0.6.1: a glow's look. */
export type GlowColor = 'gold' | 'fire';
/** A colour wash (`{ "fx": "tint", "color": … }`); 'none' clears it. */
export type TintColor = 'gold' | 'red' | 'night' | 'dawn' | 'sea' | 'none';
/** A place on the stage: a tile (x, y; fractions allowed in a cutscene) or a figure id (npc / "player" / prop / cast id). */
export type StagePos = { x: number; y: number } | string;
/** Who a topple / rise means: a list of ids, or everyone on the stage except these. */
export type StageTarget = string[] | { allBut: string[] };
/**
 * What a prop looks like: a PROP_ID (16×16 object, art-v06-*.ts), any TileId drawn as an object (e.g. "log", "tree"),
 * or a SpriteId (a 16×24 figure). The catalog's three id lists are checked by world.test.
 */
export type PropSprite = string;

/** A prop on the stage (map scripts: GameState.stage; cutscenes: the view's stage). */
export interface StageProp {
  sprite: PropSprite;
  x: number;
  y: number;
  /** carried by this figure (drawn over its head, follows it) */
  carry?: string;
  /** v0.6.1: how long its last move glides (the command's `ms`; absent = the view's default) */
  ms?: number;
}

/**
 * v0.6: what the effects kit changed on the map while a script runs (GameState.stage). Never saved; cleared when the
 * script ends. Absent = nothing changed. The practice journey never sets it (Kathā-only commands).
 */
export interface StageState {
  /** ids lying down (toppled), in the order they fell */
  down: string[];
  /** sprite scale per id (absent = 1) */
  scale: Record<string, number>;
  /** props by id */
  props: Record<string, StageProp>;
  /** a colour wash over the map */
  tint?: Exclude<TintColor, 'none'>;
  /** v0.6.1: where the camera looks (tile; absent = it follows the player) */
  focus?: { x: number; y: number };
}

/** v0.6: a hidden moment in a map script (`{ "hotspot" }`): choose 0 (tap / A) → found; advance (▶ / B / timer) → passes. */
export interface HotspotPending {
  kind: 'hotspot';
  x: number;
  y: number;
  /** how long the view waits before it passes by itself (ms) */
  ms: number;
}

/**
 * v0.6: one step of a told cutscene (content/cutscene-<id>.json). Text is ENGLISH story text (its Sanskrit comes from
 * the dialogue TM, sa-dialogue-10…13, like every story line); positions are stage tiles (20 × 11.25 on a 320 × 180
 * stage; fractions allowed). Kit steps never wait: compose them with `{ "wait": ms }`.
 */
export type ToldStep =
  /** a narration line (who: a names id / free English title); `ms` overrides the reading time */
  | { say: string; who?: string; ms?: number }
  /** a verse by id, its pādas lit one by one at the recitation pace (default all four); heard when the scene ends */
  | { verse: string; padas?: number[]; ms?: number }
  /** the painter's / 3D scene's shot (its own key, e.g. "road", "sabha", "lift"); `ms` holds before the next step */
  | { scene: string; ms?: number }
  /** a figure on the stage: placed `at`, moved `to` (in `ms`), turned `face`, or removed */
  | { cast: string; sprite?: string; at?: { x: number; y: number }; to?: { x: number; y: number }; face?: Dir; remove?: true; ms?: number }
  | { fx: KitFxName; ms?: number; color?: TintColor }
  | { topple: StageTarget }
  | { rise: StageTarget | 'all' }
  | { grow: string; scale: number; ms?: number }
  | { glow: { x: number; y: number; w?: number; h?: number }; ms?: number; color?: GlowColor }
  | { prop: string; sprite?: PropSprite; at?: StagePos; to?: StagePos; carry?: string | null; remove?: true; ms?: number }
  | { arrow: { from: StagePos; to: StagePos; through?: StagePos[] }; ms?: number }
  | { emote: string; icon: EmoteIcon; ms?: number }
  | { hop: StageTarget | string; n?: number }
  | { wait: number }
  /**
   * a hidden moment: the stage region `at` [x, y, w, h] (tiles) can be tapped (or found with the look key, H) for `ms`
   * from now (the steps after it keep playing); found → `then` plays next and `flag` (default found.<cutscene>.<id>) is
   * set when the scene ends
   */
  | { hotspot: string; at: [number, number, number, number]; ms?: number; flag?: string; then: ToldStep[] }
  /** a question with one tap (cannot fail): the scene waits; each option may set a flag and play its own steps */
  | { ask: string; options: { label: string; set?: string; then?: ToldStep[] }[] };

/** v0.6: a told cutscene (content/cutscene-<id>.json; logic-told.ts, view-told.tsx). */
export interface ToldCutscene {
  version: 1;
  id: string;
  /** the book it belongs to (verse-book replay order) */
  chapter: KandaId;
  /** English story string (Sanskrit in the dialogue TM): the replay entry and the scene's label */
  title: string;
  /** save flag set once the scene has played (default `seen.<id>`) */
  flag?: string;
  /** the 2D painter (cutscene-paint-<x>.ts registry id) */
  painter?: string;
  /** a 3D scene of the cutscene3d-scenes registry (falls back to the painter for reduced motion / no WebGL) */
  scene3d?: string;
  /** the Vālmīki reference the scene follows */
  source: string;
  /** a placeholder not written yet: `{ "cutscene": id }` skips it */
  stub?: true;
  about?: string;
  steps: ToldStep[];
}

/** v0.6: a verse echo (content/katha-echoes.json, OWNER: WP-C). */
export interface VerseEcho {
  id: string;
  /** a sa-ui key (sa-ui-v06-c.json): the title line shown under each verse of the echo once found */
  title: string;
  /** the verses that echo each other (verse book rows that show the title) */
  shlokaIds: string[];
  /** why (the text) */
  source: string;
}

export interface EventDef {
  id: string; // "ch1.valmiki_intro"
  cmds: EventCmd[];
}

export interface ChapterDef {
  kanda: KandaId;
  nameId: string; // "kanda.1"
  summary: string;
  startMap: string;
  startX: number;
  startY: number;
  shlokaIds: string[];
  keyShloka: string;
}

/**
 * Walkthrough step used by (a) the in-game quest log and (b) the story-bot simulation test that
 * proves the whole game is completable. Steps are in story order.
 */
export interface WalkStep {
  chapter: KandaId;
  map: string;
  /** What the bot does: go to a tile and interact with an npc, or step on a trigger tile, or recite a verse at a shrine. */
  action: { talk: string } | { reach: { x: number; y: number } } | { recite: string };
  /** Flag that must be true after this step (proves progress). */
  expectFlag: string;
  /**
   * v0.5b: a step of one journey only. 'katha' = a Kathā-only step (a set piece's extra goal): the practice game's
   * pointer (`guideStep` / `guideTarget`), story bots (`runWalkthrough`, `runGuide`), quest progress and the e2e `next`
   * skip it, so a practice save never needs its flag. Absent = both journeys (logic-katha `stepInJourney`).
   * v0.6.1: 'abhyasa' = a practice-only step (Agastya before the gate: in Kathā he teaches the hymn in the battle).
   */
  style?: 'katha' | 'abhyasa';
}

export interface GameContent {
  shlokas: Shloka[];
  lexicon: LexEntry[];
  names: NameEntry[];
  moves: MoveDef[];
  allies: AllyDef[];
  enemies: EnemyDef[];
  items: ItemDef[];
  chapters: ChapterDef[];
  maps: MapDef[];
  events: EventDef[];
  walkthrough: WalkStep[];
  /**
   * Sambhāṣaṇa-Saṃskṛtam versions of English story text (say lines, choices, objectives, signs,
   * battle intros, enemy intro/defeat lines), keyed by the exact English string. Devanagari only;
   * every word is verified against the platform packs by sambhashana.test.ts. Missing key = no translation.
   */
  dialogueSa?: Record<string, string>;
  /**
   * Interface text (buttons, labels, hints, toasts) in English and Sambhāṣaṇa-Saṃskṛtam, keyed by a stable id
   * (content/sa-ui-*.json, merged). Slots are written {$name} in both languages. See notes/sa-ui.md.
   */
  ui?: Record<string, UiEntry>;
  /** Kathā mode content (content/katha.json): astra → pāda bindings and per-verse anvaya + सरलार्थः. */
  katha?: KathaContent;
  /** v0.5b P6 (WP-C): verse-chain duel opponents (content/katha-chain.json) */
  chain?: ChainContent;
  /** v0.5b WP-E: the Āditya-hṛdayam cutscene in the Rāvaṇa battle (content/aditya-hridayam.json; logic-cutscene.ts) */
  aditya?: CutsceneContent;
  /** v0.6 WP0: told cutscenes (content/cutscene-*.json; logic-told.ts) */
  cutscenes?: ToldCutscene[];
  /** v0.6 WP0: verse echoes (content/katha-echoes.json) */
  echoes?: VerseEcho[];
}

// ── v0.5b WP-E (hook granted by the orchestrator): the Āditya-hṛdayam cutscene, Yuddha 6.105.1–31 ──
/** A string shown in the cutscene: Sanskrit (oracle-verified, cutscene.test) and English. `label`: no final । needed. */
export interface CutsceneText {
  sa: string;
  en: string;
  label?: boolean;
  ctx?: string;
}
/** One śloka of the hymn: pādas as printed (project convention for a sandhi at the pāda break), sources and variants. */
export interface CutsceneVerse {
  n: number;
  ref: string;
  speaker: 'narrator' | 'agastya';
  meter: 'anustubh' | 'puspitagra';
  padas: string[];
  /** padaccheda per pāda (pausal forms, compounds whole) for the sandhi-engine rebuild; or `wordsFrom` a game verse */
  words?: string[][];
  wordsFrom?: string;
  /** original English (one or two plain lines), awaiting human review */
  en: string;
  meterNote?: string;
  /** no sandhi at this pāda break (index of the pāda before it), as printed in every source */
  pausa?: { after: number; note: string };
  /** each witness's text of the verse, as fetched (source id → text) */
  readings: Record<string, string>;
  /** spots checked in the sanskritdocuments.org stotra (short quotes) */
  sd?: string[];
  /** every difference between a witness and the chosen text: `in` = witness id → its reading */
  variants: { chosen: string; kind: 'reading' | 'orthography' | 'typo'; note: string; in: Record<string, string> }[];
}
export interface CutsceneContent {
  version: 1;
  id: string;
  /** the save flag set once the scene has been seen (`cutscene-done`) */
  flag: string;
  /** the scene is due the first time this foe (in this book) is shown at or below `below` × its HP */
  trigger: { foe: string; chapter?: number; below: number; source: string };
  reference: { kanda: number; sarga: number; verses: number[]; edition: string; criticalEdition: string; review: string };
  sources: { id: string; name: string; url: string; accessed: string; numbering: string; coverage: string }[];
  choice: string;
  narration: CutsceneText[];
  ui: Record<string, CutsceneText>;
  verses: CutsceneVerse[];
}

/**
 * content/katha-chain.json (v0.5b, OWNER: WP-C): who duels in verse chains (śloka-antyakṣarī, notes/v05b-plan.md §4).
 * A Kathā duel against a foe listed here is a chain duel; v0.6 adds opponents here without code.
 */
export interface ChainContent {
  version: number;
  about?: string;
  duels: ChainDuel[];
}

export interface ChainDuel {
  /** EnemyDef id of the opponent (a duelist) */
  foe: string;
  /** the opponent's HP in links: HP = links × the lead's best hit (default 5) */
  links?: number;
  /** where the text puts this exchange (e.g. Kiṣkindhā 4.3) */
  source: string;
}

/** v0.5b P6 (WP-C): a verse-chain duel in progress (BattleState.antya; Kathā only). */
export interface AntyaState {
  /** the key the player's next line must open with (null = any line) */
  key: Deva | null;
  /** pādas used in this duel (`${shlokaId}:${pada}`): none is used twice */
  used: string[];
  /** the opponent's last line (shown in full with the key akṣara highlighted) */
  prev?: PadaRefT;
  /** the player's line ended on a sound no remaining heard pāda opens with: the opponent is stumped */
  stumped?: boolean;
}

/**
 * v0.5b P7 (WP-C): a boss phase (content/katha.json → tactics.phases), e.g. Rāvaṇa's heads (Yuddha 6.107–108).
 * Read by logic-tactics / logic-battle (WP-C); every entry carries its `source`.
 */
export interface KathaPhase {
  /** stable id (BattleState.bossPhases records the ones begun) */
  id: string;
  foe: string;
  chapter?: number;
  /** the phase begins once the foe is at or below this share of its HP (0–1) */
  below: number;
  /** while the phase holds, hits that do not fit cannot take the foe below this share of its HP */
  floor?: number;
  /** the move that fits (ends the floor), e.g. the brahmāstra */
  fit?: string;
  /** content/sa-battle.json template of the beat the phase shows when it begins */
  beat?: string;
  /** the beat plays only once per battle (default: each time the phase begins) */
  once?: boolean;
  /** v0.5b WP-C: the phase's fitting move only finishes the foe once these flags hold (e.g. seen.aditya: the Āditya-hṛdayam first) */
  requires?: FlagCond;
  /**
   * v0.6.1: while the phase holds and the hero in front holds its `fit`, the fit is the ONLY move the hero can use (the
   * others are greyed out) until it has been cast once (BattleState.bossPhases then records `<id>:spent`).
   */
  only?: true;
  source: string;
}

/** content/katha.json (OWNER: kc-content). Sanskrit verified by katha-content.test.ts; see notes/katha.md. */
export interface KathaContent {
  /** which pāda each astra recites; a move without a binding is a plain move (no input) in Kathā */
  astras: { moveId: string; shlokaId: string; pada: number }[];
  verses: KathaVerse[];
  /**
   * v0.4.1: Kathā wording for move descriptions that talk about practice mechanics ("answer swiftly"): moveId → English
   * (its Sanskrit is in the dialogue TM, file 5). The view shows it instead of defs.json `description` in Kathā.
   */
  moveText?: Record<string, string>;
  /** v0.5a (fx-strat): battle tactics — matchups from Vālmīki, warned blows, astra fatigue, guardians (logic-tactics.ts) */
  tactics?: KathaTactics;
}

/**
 * Kathā battle tactics (v0.5a, notes/katha.md "v0.5a"; content/katha.json `tactics`). Every textual claim carries its
 * `source`; where the text says nothing the game uses plain element logic (catalog ELEMENT_CHART).
 */
export interface KathaTactics {
  about?: string;
  /** Viśvāmitra's weapons: astras not bound to a verse that tire like the verse-bound ones (and a grant never takes their slot) */
  divine: string[];
  /** moves a hero receives in Kathā when a story flag is set (e.g. Viśvāmitra's astras after Tāṭakā) */
  grants: { flag: string; ally: string; moves: string[]; source: string }[];
  /** guardians: a benched hero who can step in front of a warned blow with this move, in one tap (a cover) */
  guards: { ally: string; move: string; source: string }[];
  /**
   * the astra that fits a foe in Vālmīki: decisive (the foe falls or is driven off, with the story beat `beat`, a
   * content/sa-battle.json template) — at once, or once the foe is down to `below` × its HP; `chapter` limits it to a book
   */
  fits: { foe: string; chapter?: number; move: string; below?: number; beat: string; source: string }[];
  /**
   * a boss's warned blow (every Kathā boss warns; an entry gives it its own words): `ready` / `strike` are
   * content/sa-battle.json templates ({x} = the foe; default: kathaWarn "X is about to use M!" / the usual "uses" line);
   * `counter`: moves that answer it besides any support move, a switch or a cover; `first`: the foe's action that readies
   * it first (0 = in the battle's opening, before the first turn)
   */
  warnings: { foe: string; chapter?: number; ready?: string; strike?: string; counter?: string[]; first?: number; /** v0.5b WP-C: the strike's damage scale (default 1) */ strikeScale?: number; source: string }[];
  /** v0.5b P7 (WP-C): boss phases as data (Rāvaṇa's heads, Mātali's line) */
  phases?: KathaPhase[];
}

export interface KathaVerse {
  shlokaId: string;
  /**
   * prose order (anvaya): the verse's own pada-ccheda forms (`shloka.words[].form`), each exactly once, reordered;
   * an implied word that is not in the verse is written in square brackets, e.g. "[अस्ति]" (verified by the oracle)
   */
  anvaya: Deva[];
  /** सरलार्थः: the meaning in simple Level-1–3 Sambhāṣaṇa Sanskrit (1–4 short sentences, oracle-verified) */
  saralarthah: string;
}

/** One interface string (content/sa-ui-*.json `entries[key]`). */
export interface UiEntry {
  en: string;
  sa: string; // '' = not yet translated (falls back to English; the gate fails)
  ctx?: string; // where it is shown
  /** a label / button / heading, not a sentence: no final । needed */
  label?: boolean;
}

/** content/sa-ui-*.json */
export interface UiFile {
  version: number;
  about?: string;
  models?: { stem: string; gender: string; paradigm: string; en: string; source: string }[];
  entries: Record<string, UiEntry>;
}

/** Player preference for story text: English, Sanskrit with English below, or Sanskrit only. */
export type DialogueLang = 'en' | 'sa-en' | 'sa';

/** One entry of content/sa-dialogue-*.json. */
export interface DialogueEntry {
  en: string;
  sa: string; // '' = not yet translated
  ctx?: string; // where it is used / who speaks (for translators and reviewers)
  /** a label (NPC speaker title), not a sentence: no final । needed, `{n:…}` allowed (sa-dialogue-4.json) */
  label?: boolean;
}

// ───────────────────────── Runtime state (pure reducer) ─────────────────────────

export interface PartyMember {
  id: string; // AllyDef id
  level: number;
  xp: number;
  hp: number;
  pp: Record<string, number>;
  moves: string[]; // ≤ 4 equipped
}

/** Everything persisted to ctx.store (key "save-v1"). Keep it small. */
export interface SaveData {
  v: 1;
  playerName: string;
  avatar: 'a' | 'b';
  mapId: string;
  x: number;
  y: number;
  facing: Dir;
  respawn: { mapId: string; x: number; y: number };
  chapter: KandaId;
  objective: string;
  flags: Record<string, true>;
  party: PartyMember[];
  items: Record<string, number>;
  niska: number;
  words: Record<string, WordProgress>;
  shlokas: Record<string, ShlokaProgress>;
  step: number; // learning interaction counter (SRS spacing)
  npcPos: Record<string, { x: number; y: number; facing: Dir }>; // key "<map>/<npc>" after scripted moves
  playMs: number;
  completedChapters: KandaId[];
  /** journey style (absent in saves before v0.4 = 'abhyasa'); 'katha' also sets the flag `style.katha` */
  style?: JourneyStyle;
  /** reader level (v0.4.3; absent = English): set by the view from the story-text language (`set-reader`) */
  reader?: Reader;
  /**
   * recitation mastery per pāda, key `${shlokaId}:${pada}`: level 0–4, the current flawless streak, and for a mastered
   * pāda (level 4) how many casts since mastery and the cast number of the next spot check (2, 4, 8, 16, …)
   */
  smrti?: Record<string, { level: number; streak: number; casts?: number; nextCheck?: number; /** chunk index of the last gap (the gap rotates; Kathā, kc-core) */ last?: number }>;
}

/** Per-session stats (not persisted) used for ctx.finish. */
export interface SessionStats {
  correct: number;
  total: number;
  swift: number;
  practised: { lexId: string; correct: boolean }[];
  shlokasHeard: string[];
  shlokasRestored: string[];
  battlesWon: number;
  chaptersCompleted: KandaId[];
}

export interface Fighter {
  id: string; // AllyDef or EnemyDef id
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  element: Element;
  moves: string[];
  stages: { atk: number; def: number };
  stunned: boolean;
}

/** One line of battle narration, with HP snapshots so the view can animate in sync. */
export interface BattleBeat {
  text: string; // English (may use {n:nameId} markup)
  /** Sambhāṣaṇa version (content/sa-battle.json; may use {player} {w:…} {g:masc|fem}); unset for story text (see dialogueSa) */
  textSa?: string;
  fx?: { kind: 'hit' | 'heal' | 'buff' | 'debuff' | 'miss' | 'faint' | 'swift' | 'switch' | 'flee'; target: 'ally' | 'foe'; amount?: number; effective?: 'super' | 'weak' };
  allyHp: number;
  foeHp: number;
  sfx?: 'tap' | 'correct' | 'wrong' | 'win' | 'lose' | 'merge' | 'tick' | 'levelup';
  /**
   * Kathā only: set on the beat that REPLACES "{x} uses {m}!" after a recited cast (the pāda just recited). The view may
   * skip or hurry this beat (it has just animated the recital). Never set in the practice game.
   */
  recital?: { shlokaId: string; pada: number; correct: boolean };
  /**
   * Kathā tutorial duel only (`BattleSpec.tutorial`): the duelist's model recitation — this pāda said in full (printed
   * verbatim from the content; no gap, no input) right before the player says it back. Never set in the practice game.
   */
  model?: { shlokaId: string; pada: number };
  /**
   * Kathā tactics only (v0.5a): what this beat shows — `warn` a foe readies a great blow (its short Sanskrit line),
   * `blunt` an answered blow lands softly, `fit` the astra that fits the foe (a story beat), `tired` a repeated astra
   * lands weaker. Never set in the practice game.
   */
  tactic?: 'warn' | 'blunt' | 'fit' | 'tired';
}

export interface BattleState {
  spec: BattleSpec;
  foeIndex: number;
  foe: Fighter;
  ally: Fighter; // mirror of party[active] during battle (written back on exit)
  active: number; // party index
  phase: 'intro' | 'command' | 'pick-move' | 'challenge' | 'feedback' | 'beats' | 'pick-switch' | 'pick-item' | 'won' | 'lost' | 'fled';
  beats: BattleBeat[]; // queued narration; 'advance' pops beats[0]
  pendingMove?: string; // move chosen, awaiting challenge answer
  participants: number[];
  /** Kathā: smarana casts so far in this battle (duels rotate their pādas with it); absent in the practice game */
  casts?: number;
  turn: number;
  /** Kathā (v0.5a): the move the active hero used last and how many times in a row (astra fatigue); absent in the practice game */
  chain?: { moveId: string; n: number };
  /** Kathā (v0.5a): a great blow the foe has readied (it lands on the foe's next action); absent in the practice game */
  warn?: { foeId: string; moveId: string; strike?: string; counter: string[] };
  /** Kathā (v0.5a): actions the current foe has taken (the warning cadence); absent in the practice game */
  foeActs?: number;
  /** Kathā (v0.5a): the recitation pending is a verse shield (no move): its answer resolves the turn as a shield */
  pendingShield?: true;
  /** Kathā (v0.5b P6, WP-C): a verse-chain duel in progress; absent in the practice game */
  antya?: AntyaState;
  /** Kathā (v0.5b P7, WP-C): ids of the boss phases begun in this battle; absent in the practice game */
  bossPhases?: string[];
}

/**
 * v0.5b P5 (WP-D, logic-setu.ts): Nala's bridge (Yuddha 6.22) as a pending. `cells` are the stones' current turns, read
 * row by row (`cols` columns = the five days); the bridge is whole when `cells` equals `solution`. `choose i` turns
 * stone i; `advance` asks Nala for a hint (`hint` = the stone he points at) or, once solved, continues the script.
 */
export interface SetuPending {
  kind: 'setu';
  /** the `{setu}` command's tag (seeds the puzzle) */
  tag: string;
  cols: number;
  /** how many turns a stone has (a turn is +1 mod `turns`) */
  turns: number;
  cells: number[];
  solution: number[];
  /** stones turned so far */
  taps: number;
  /** the stone Nala points at (after a hint), else null */
  hint: number | null;
}

/** What the view must present and wait on. Exactly one at a time. */
export type Pending =
  | { kind: 'say'; text: string; who?: string; portrait?: SpriteId }
  | { kind: 'choice'; prompt: string | null; options: string[] }
  | { kind: 'shloka'; shlokaId: string } // verse card
  | { kind: 'words'; lexIds: string[] } // word cards
  // context 'scene' (v0.5b P1): a story recitation `{smarana}` — no feedback pending; the script carries on after the answer
  | { kind: 'challenge'; challenge: Challenge; context: 'quiz' | 'battle' | 'recite' | 'scene'; step?: number; steps?: number }
  | { kind: 'feedback'; challenge: Challenge; result: ChallengeResult; picked?: string; order?: number[] }
  | { kind: 'title'; nameId: string; subtitle?: string } // chapter card
  | { kind: 'shop'; items: string[] }
  | { kind: 'shrine' } // view shows Rest / Recite / Save / Leave → sends choose/recite actions
  | { kind: 'save' } // view persists toSave(state) then sends advance
  | { kind: 'wait'; ms: number }
  | { kind: 'fade'; to: 'in' | 'out' }
  | { kind: 'move'; who: string; path: Dir[] }
  | { kind: 'battle' } // battle UI reads state.battle
  | { kind: 'ending' }
  | { kind: 'book'; kanda: KandaId } // v0.5b P2: a read-only review of one book → advance
  | SetuPending // v0.5b P5: Nala's bridge → choose i / advance
  | HotspotPending // v0.6: a hidden moment on the map → choose 0 (found) / advance (passes)
  | { kind: 'cutscene'; id: string }; // v0.6: a told cutscene plays (view-told) → cutscene-done { id, found, answers } / advance

/** One-shot cosmetic effects for the view; reduce() clears and refills this every call. */
export type Fx =
  | { kind: 'sfx'; name: 'tap' | 'correct' | 'wrong' | 'win' | 'lose' | 'merge' | 'tick' | 'levelup' }
  | { kind: 'music'; track: TrackId | null }
  | { kind: 'toast'; text: string; /** Sambhāṣaṇa version (sa-ui toast.* entry, slots filled; may use {g:…}) */ textSa?: string }
  | { kind: 'shake' }
  | { kind: 'flash' }
  | { kind: 'encounter' }
  | { kind: 'bump' }
  | { kind: 'warp' }
  /**
   * v0.6 effects kit (map scripts): a one-shot / timed effect for the view — shake / flash / petals / rain for `ms`, a
   * tile glow (`at`, tiles), an arrow along `path` (tile centres). Topple, rise, grow, props and tint are state
   * (GameState.stage), not fx.
   */
  | { kind: 'kit'; name: KitScreenFx | 'glow' | 'arrow' | 'emote' | 'hop'; ms: number; at?: { x: number; y: number; w: number; h: number }; path?: { x: number; y: number }[]; color?: GlowColor; id?: string; ids?: string[]; icon?: EmoteIcon; n?: number };

export interface GameState {
  v: 1;
  seed: number;
  tick: number; // increments whenever randomness is consumed
  level: Level;
  save: SaveData;
  mode: 'explore' | 'script' | 'battle' | 'ended';
  /** Event interpreter call stack (innermost last). */
  script: { eventId: string; frames: { cmds: EventCmd[]; pc: number }[] } | null;
  pending: Pending | null;
  battle: BattleState | null;
  /** Recitation in progress (shrine). */
  recital: {
    shlokaId: string;
    queue: Challenge[];
    done: number;
    correct: number;
    /** Kathā study hall (अभ्यासशाला): a round of classic challenges at a shrine (context 'quiz'); shlokaId is '' */
    study?: true;
  } | null;
  /**
   * Kathā: the last smarana (recitation) answer, so the view can animate the result inline (there is no feedback
   * pending after a smarana answer: the battle beats / next recital step follow directly). Never set in the practice game.
   */
  lastSmarana?: SmaranaResult;
  /** v0.6: what the effects kit changed on the map while this script runs (never saved; cleared when the script ends) */
  stage?: StageState;
  session: SessionStats;
  fx: Fx[];
}

export type Action =
  | { type: 'step'; dir: Dir } // explore: try to move one tile (the view sends it after the previous tween)
  | { type: 'face'; dir: Dir }
  | { type: 'interact' } // A button in explore mode (talk / read sign / use shrine)
  | { type: 'advance' } // dismiss say/shloka/words/feedback/title/wait/fade/move/save, or pop a battle beat
  | { type: 'choose'; index: number } // choice, battle command (0 fight,1 switch,2 item,3 run), move/switch/item index, shrine menu; -1 = back
  | { type: 'answer'; option?: string; order?: number[]; timeMs: number; /** smarana: option id per gap, in order */ picks?: string[]; /** smarana: automatic recitation (no input; counts as correct, never swift, mastery unchanged) */ auto?: boolean }
  | { type: 'set-style'; style: JourneyStyle } // Settings: switch journey style (sets/unsets flag style.katha)
  | { type: 'set-reader'; reader: Reader | 'en' | null } // the view mirrors prefs.dialogueLang (any mode; 'en' / null = absent)
  | { type: 'recite'; shlokaId: string } // from the shrine panel
  | { type: 'use-item'; itemId: string; target: number } // from the start menu (explore) — battle items go through choose
  | { type: 'buy'; itemId: string; qty: number }
  | { type: 'equip'; member: number; moves: string[] }
  | { type: 'next-book' } // v0.5a book-complete screen, "continue": explore → the next book's opening plays at once (logic-world beginNextBook)
  /**
   * v0.5b WP-E: the view played a due cutscene (logic-cutscene cutsceneDue) → its save flag. v0.6: also the end of a told
   * cutscene (pending 'cutscene'): `found` = the hotspot ids found, `answers` = the option index picked per ask step (in
   * play order) → their flags, the verses heard, the seen flag; the script goes on.
   */
  | { type: 'cutscene-done'; id: string; found?: string[]; answers?: number[] }
  | { type: 'tick'; ms: number }; // play-time accounting (no randomness)

export const VIEW_W = 320;
export const VIEW_H = 180;
export const TILE = 16;
