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
  /** Inflected forms as they occur in the verses. */
  forms: { form: Deva; grammar: string; shlokaIds: string[] }[];
  /** Distractor tags: person, nature, virtue, action, time, place, body, weapon, animal, family, emotion, number, grammar-word, speech. */
  tags: string[];
  provenance: Provenance;
}

/** Other game-local Sanskrit (names of people, places, moves, items, chapters). content/names.json */
export interface NameEntry {
  id: string; // e.g. "move.agneyastra", "place.ayodhya", "person.rama", "kanda.1"
  sa: Deva;
  en: string;
  provenance: Provenance; // e.g. Monier-Williams entry, or the Rāmāyaṇa verse where it occurs
}

// ───────────────────────── Learning ─────────────────────────

export type ChallengeKind = 'artha' | 'lipi' | 'purana' | 'krama' | 'viccheda' | 'vibhakti' | 'smarana';

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
  /** where it was answered */
  context: 'battle' | 'recite';
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
  | { end: true };

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
}

/** What the view must present and wait on. Exactly one at a time. */
export type Pending =
  | { kind: 'say'; text: string; who?: string; portrait?: SpriteId }
  | { kind: 'choice'; prompt: string | null; options: string[] }
  | { kind: 'shloka'; shlokaId: string } // verse card
  | { kind: 'words'; lexIds: string[] } // word cards
  | { kind: 'challenge'; challenge: Challenge; context: 'quiz' | 'battle' | 'recite'; step?: number; steps?: number }
  | { kind: 'feedback'; challenge: Challenge; result: ChallengeResult; picked?: string; order?: number[] }
  | { kind: 'title'; nameId: string; subtitle?: string } // chapter card
  | { kind: 'shop'; items: string[] }
  | { kind: 'shrine' } // view shows Rest / Recite / Save / Leave → sends choose/recite actions
  | { kind: 'save' } // view persists toSave(state) then sends advance
  | { kind: 'wait'; ms: number }
  | { kind: 'fade'; to: 'in' | 'out' }
  | { kind: 'move'; who: string; path: Dir[] }
  | { kind: 'battle' } // battle UI reads state.battle
  | { kind: 'ending' };

/** One-shot cosmetic effects for the view; reduce() clears and refills this every call. */
export type Fx =
  | { kind: 'sfx'; name: 'tap' | 'correct' | 'wrong' | 'win' | 'lose' | 'merge' | 'tick' | 'levelup' }
  | { kind: 'music'; track: TrackId | null }
  | { kind: 'toast'; text: string; /** Sambhāṣaṇa version (sa-ui toast.* entry, slots filled; may use {g:…}) */ textSa?: string }
  | { kind: 'shake' }
  | { kind: 'flash' }
  | { kind: 'encounter' }
  | { kind: 'bump' }
  | { kind: 'warp' };

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
  | { type: 'tick'; ms: number }; // play-time accounting (no randomness)

export const VIEW_W = 320;
export const VIEW_H = 180;
export const TILE = 16;
