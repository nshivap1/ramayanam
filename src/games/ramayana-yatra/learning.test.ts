/**
 * Learning engine tests (battle agent). Runs on a small inline fixture (real words of Bāla 1.2.15 and
 * 1.1.2, written in SLP1 and converted with @sanskrit so no Devanagari/IAST literal appears in code)
 * AND on the real content in ./content (those parts skip while the content is still empty).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { devaToSlp1, normalizeDeva, sameSpelling, slp1ToDeva, spellingKey } from '@sanskrit';
import { readFileSync } from 'node:fs';
import { type Level, testMatrix } from '@sdk';
import type { Challenge, ChallengeKind, GameContent, GameState, GrammarRole, LexEntry, PartOfSpeech, SaveData, Shloka, ShlokaWord } from './types';
import { loadContent } from './content';
import { indexOf } from './logic-util';
import { allyForMove, newMember } from './logic-progress';
import { getOracle } from './sa-verify';
import { uiEn } from './sa-ui';
import {
  BLANK,
  KIND_ORDER,
  ROLE_LABELS,
  fold,
  grade,
  halfVerseLines,
  participleCase,
  pronounSensesClash,
  kramaOrders,
  learnIndex,
  makeChallenge,
  markHeard,
  markSeen,
  recitalAdvance,
  recitalAnswer,
  recordResult,
  ROLE_EXPLAIN,
  isTrivialNote,
  sharesContentWord,
  startRecital,
  syncreticRoles,
  tier,
  timeLimitFor,
  unlockedKinds,
} from './logic-learning';

const LEVELS: Level[] = [2, 3, 4];
const nd = (s: string): string => normalizeDeva(s);
const HAS_DEVA = /[ऀ-ॿ]/;

// ───────────────────────── fixture ─────────────────────────

const D = (s: string): string => slp1ToDeva(s);
const prov = { sources: [{ name: 'test fixture' }], verifiedBy: [] };
type W = [form: string, lexId: string, grammar: string, gloss: string, role: GrammarRole | undefined, pada: number];
const words = (ws: W[]): ShlokaWord[] => ws.map(([form, lexId, grammar, gloss, role, pada]) => ({ form: D(form), lexId, grammar, gloss, ...(role ? { role } : {}), pada }));

function fixtureShlokas(): Shloka[] {
  return [
    {
      id: 's-ma-nishada', kanda: 1, sarga: 2, verse: 15, edition: 'fixture', meter: 'anustubh',
      padas: ['mA nizAda pratizWAM tva', 'magamaH SASvatIH samAH', 'yatkrOYcamiTunAdekam', 'avaDIH kAmamohitam'].map(D),
      words: words([
        ['mA', 'ma', 'indecl.', 'not', 'indeclinable', 0], ['nizAda', 'nishada', 'voc. sg. m.', 'O hunter', 'address', 0], ['pratizWAm', 'pratishtha', 'acc. sg. f.', 'lasting fame', 'object', 0], ['tvam', 'tvad', 'nom. sg.', 'you', 'subject', 0],
        ['agamaH', 'gam', '2nd sg. aorist', 'may you attain', 'verb', 1], ['SASvatIH', 'shashvat', 'acc. pl. f.', 'everlasting', 'modifier', 1], ['samAH', 'sama', 'acc. pl. f.', 'years', 'object', 1],
        ['yat', 'yad', 'indecl.', 'since', 'indeclinable', 2], ['krOYcamiTunAt', 'kraunchamithuna', 'abl. sg. n.', 'from the pair of cranes', 'source', 2], ['ekam', 'eka', 'acc. sg. m.', 'one', 'modifier', 2],
        ['avaDIH', 'vadh', '2nd sg. aorist', 'you killed', 'verb', 3], ['kAmamohitam', 'kamamohita', 'acc. sg. m.', 'lost in love', 'modifier', 3],
      ]),
      sandhiNotes: [
        { joined: D('tvamagamaH'), split: [D('tvam'), D('agamaH')], note: 'Final m before a vowel stays m and joins the next word.' },
        { joined: D('yatkrOYcamiTunAdekam'), split: [D('yat'), D('krOYcamiTunAt'), D('ekam')], note: 'Final t before a vowel becomes d.' },
      ],
      translation: 'O hunter, may you never find rest for endless years, since you killed one of the pair of cranes lost in love.',
      context: 'fixture', speaker: 'fixture', teaches: [], provenance: prov,
    },
    {
      id: 's-ko-nvasmin', kanda: 1, sarga: 1, verse: 2, edition: 'fixture', meter: 'anustubh',
      padas: ['ko nvasmin sAmprataM loke', 'guRavAn kaSca vIryavAn', 'DarmajYaSca kftajYaSca', 'satyavAkyo dfQavrataH'].map(D),
      words: words([
        ['kaH', 'kim', 'nom. sg. m.', 'who', 'subject', 0], ['nu', 'nu', 'indecl.', 'now', 'indeclinable', 0], ['asmin', 'idam', 'loc. sg. m.', 'in this', 'modifier', 0], ['sAmpratam', 'sampratam', 'indecl.', 'at present', 'indeclinable', 0], ['loke', 'loka', 'loc. sg. m.', 'in the world', 'location', 0],
        ['guRavAn', 'gunavat', 'nom. sg. m.', 'virtuous', 'modifier', 1], ['kaH', 'kim', 'nom. sg. m.', 'who', 'subject', 1], ['ca', 'ca', 'indecl.', 'and', 'indeclinable', 1], ['vIryavAn', 'viryavat', 'nom. sg. m.', 'valiant', 'modifier', 1],
        ['DarmajYaH', 'dharmajna', 'nom. sg. m.', 'knowing dharma', 'modifier', 2], ['ca', 'ca', 'indecl.', 'and', 'indeclinable', 2], ['kftajYaH', 'krtajna', 'nom. sg. m.', 'grateful', 'modifier', 2], ['ca', 'ca', 'indecl.', 'and', 'indeclinable', 2],
        ['satyavAkyaH', 'satyavakya', 'nom. sg. m.', 'truthful in speech', 'modifier', 3], ['dfQavrataH', 'drdhavrata', 'nom. sg. m.', 'firm in vows', 'modifier', 3],
      ]),
      sandhiNotes: [
        { joined: D('nvasmin'), split: [D('nu'), D('asmin')], note: 'u before a dissimilar vowel becomes v.' },
        { joined: D('kaSca'), split: [D('kaH'), D('ca')], note: 'Visarga before c becomes S.' },
      ],
      translation: 'Who in this world today is virtuous, valiant, knows dharma, is grateful, truthful and firm in vows?',
      context: 'fixture', speaker: 'fixture', teaches: [], provenance: prov,
    },
  ];
}
type L = [id: string, lemma: string, pos: PartOfSpeech, meaning: string, forms: string[], tags: string[], gender?: 'm' | 'f' | 'n'];
function fixtureLexicon(): LexEntry[] {
  const rows: L[] = [
    ['ma', 'mA', 'indeclinable', 'not (prohibitive)', ['mA'], ['grammar-word']],
    ['nishada', 'nizAda', 'noun', 'hunter', ['nizAda'], ['person'], 'm'],
    ['pratishtha', 'pratizWA', 'noun', 'fame, standing', ['pratizWAm'], ['virtue'], 'f'],
    ['tvad', 'tvad', 'pronoun', 'you', ['tvam'], ['grammar-word']],
    ['gam', 'gam', 'verb', 'go, attain', ['agamaH'], ['action']],
    ['shashvat', 'SaSvat', 'adjective', 'everlasting', ['SASvatIH'], ['time']],
    ['sama', 'samA', 'noun', 'year', ['samAH'], ['time'], 'f'],
    ['yad', 'yad', 'indeclinable', 'since, because', ['yat'], ['grammar-word']],
    ['kraunchamithuna', 'krOYcamiTuna', 'noun', 'pair of cranes', ['krOYcamiTunAt'], ['animal'], 'n'],
    ['eka', 'eka', 'numeral', 'one', ['ekam'], ['number']],
    ['vadh', 'vaD', 'verb', 'kill, strike', ['avaDIH'], ['action']],
    ['kamamohita', 'kAmamohita', 'adjective', 'deluded by desire', ['kAmamohitam'], ['emotion']],
    ['kim', 'kim', 'pronoun', 'who, what', ['kaH'], ['grammar-word']],
    ['nu', 'nu', 'indeclinable', 'now, indeed', ['nu'], ['grammar-word']],
    ['idam', 'idam', 'pronoun', 'this', ['asmin'], ['grammar-word']],
    ['sampratam', 'sAmpratam', 'indeclinable', 'at present', ['sAmpratam'], ['time']],
    // homograph pair: two senses of one lemma (must never be offered against each other)
    ['loka', 'loka', 'noun', 'world', ['loke'], ['place'], 'm'],
    ['loka-2', 'loka', 'noun', 'people', ['lokaH'], ['person'], 'm'],
    ['gunavat', 'guRavat', 'adjective', 'virtuous', ['guRavAn'], ['virtue']],
    ['ca', 'ca', 'indeclinable', 'and', ['ca'], ['grammar-word']],
    ['viryavat', 'vIryavat', 'adjective', 'valiant', ['vIryavAn'], ['virtue']],
    ['dharmajna', 'DarmajYa', 'adjective', 'knower of dharma', ['DarmajYaH'], ['virtue']],
    ['krtajna', 'kftajYa', 'adjective', 'grateful', ['kftajYaH'], ['virtue']],
    ['satyavakya', 'satyavAkya', 'adjective', 'truthful in speech', ['satyavAkyaH'], ['virtue', 'speech']],
    ['drdhavrata', 'dfQavrata', 'adjective', 'firm in vows', ['dfQavrataH'], ['virtue']],
  ];
  return rows.map(([id, lemma, pos, meaning, forms, tags, gender]) => ({ id, lemma: D(lemma), pos, ...(gender ? { gender } : {}), meaning, forms: forms.map((f) => ({ form: D(f), grammar: 'fixture', shlokaIds: [] })), tags, provenance: prov }));
}

const REAL = loadContent();
const FIXTURE: GameContent = { ...REAL, shlokas: fixtureShlokas(), lexicon: fixtureLexicon() };
const realReady = REAL.shlokas.length > 0 && REAL.lexicon.length > 4;

function mkState(content: GameContent, seed: number, level: Level, chapter: number, heardAll = true): GameState {
  const pdef = indexOf(content).ally.get('player');
  const party = pdef ? [newMember(pdef, 5, content)] : [];
  const save: SaveData = {
    v: 1, playerName: 'Test', avatar: 'a', mapId: 'm', x: 1, y: 1, facing: 'down', respawn: { mapId: 'm', x: 1, y: 1 },
    chapter: chapter as SaveData['chapter'], objective: '', flags: {}, party, items: {}, niska: 0, words: {},
    shlokas: heardAll ? Object.fromEntries(content.shlokas.map((s) => [s.id, { heard: true, restored: false, best: 0 }])) : {},
    step: 0, npcPos: {}, playMs: 0, completedChapters: [],
  };
  return { v: 1, seed, tick: 0, level, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] }, fx: [] };
}

// ───────────────────────── independent oracle ─────────────────────────

/** Recomputes from the content which option ids are correct (independently of the builders). */
function oracle(content: GameContent, ch: Challenge): Set<string> {
  const ok = new Set<string>();
  const opts = ch.options ?? [];
  const sh = ch.shlokaId ? content.shlokas.find((s) => s.id === ch.shlokaId) : undefined;
  switch (ch.kind) {
    case 'artha': {
      const stim = nd(ch.stimulus ?? '');
      const meanings = new Set(content.lexicon.filter((e) => nd(e.lemma) === stim || e.forms.some((f) => nd(f.form) === stim)).map((e) => fold(e.meaning)));
      for (const o of opts) if (o.en !== undefined && meanings.has(fold(o.en))) ok.add(o.id);
      break;
    }
    case 'lipi':
      for (const o of opts) if (o.sa !== undefined && nd(o.sa) === nd(ch.stimulus ?? '')) ok.add(o.id);
      break;
    case 'purana': {
      const pw = (sh?.words ?? []).filter((w) => w.pada === ch.padaIndex);
      const toks = (ch.stimulus ?? '').split(' ');
      const gap = toks.indexOf(BLANK);
      const target = pw[gap];
      for (const o of opts) if (target && o.sa !== undefined && nd(o.sa) === nd(target.form)) ok.add(o.id);
      break;
    }
    case 'viccheda': {
      const splits = new Set(content.shlokas.flatMap((s) => s.sandhiNotes).filter((n) => nd(n.joined) === nd(ch.stimulus ?? '')).map((n) => n.split.map(nd).join(' ')));
      for (const o of opts) if (o.sa !== undefined && splits.has(o.sa.split(' ').map(nd).join(' '))) ok.add(o.id);
      break;
    }
    case 'vibhakti': {
      // QA 11 Nov: a predicative participle keyed "verb" is also correct under the case its grammar names
      const roles = new Set((sh?.words ?? []).filter((w) => nd(w.form) === nd(ch.stimulus ?? '')).flatMap((w) => (w.role ? [ROLE_LABELS[w.role], ...(w.role === 'verb' && /participle/.test(w.grammar) && ORACLE_CASE(w.grammar) ? [ROLE_LABELS[ORACLE_CASE(w.grammar) as GrammarRole]] : [])] : [])));
      for (const o of opts) if (o.en !== undefined && roles.has(o.en)) ok.add(o.id);
      break;
    }
    case 'krama':
      break;
  }
  return ok;
}

/** Independent case reader for the oracle (abbreviation → role). */
function ORACLE_CASE(grammar: string): GrammarRole | null {
  const m = /\b(nom|acc|instr|dat|abl|gen|loc|voc)\./.exec(grammar);
  const map: Record<string, GrammarRole> = { nom: 'subject', acc: 'object', instr: 'instrument', dat: 'recipient', abl: 'source', gen: 'possessor', loc: 'location', voc: 'address' };
  return m ? (map[m[1] as string] ?? null) : null;
}

function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

/** QA 11 Nov S1-02: spelling-equivalent options (kiṃcit / kiñcit) are never offered against each other. */
function checkSpelling(ch: Challenge): void {
  const opts = (ch.options ?? []).filter((o) => o.sa !== undefined);
  const keys = opts.map((o) => (o.sa ?? '').split(' ').map(spellingKey).join(' '));
  assert.equal(new Set(keys).size, keys.length, `two options share a spellingKey: ${ch.kind} ${opts.map((o) => o.sa).join(' | ')}`);
  const answers = new Set(ch.answers ?? []);
  for (const a of opts) for (const b of opts) if (answers.has(a.id) && sameSpelling(a.sa ?? '', b.sa ?? '')) assert.ok(answers.has(b.id), `accepted set not closed under sameSpelling: ${a.sa} / ${b.sa}`);
}

/** All invariants every challenge must satisfy. Returns the kind actually produced. */
function checkChallenge(content: GameContent, ch: Challenge, level: Level): void {
  const li = learnIndex(content);
  const where = `${ch.kind} ${ch.id} ${JSON.stringify(ch).slice(0, 300)}`;
  assert.ok(ch.prompt.length > 0 && !HAS_DEVA.test(ch.prompt), `prompt is English: ${where}`);
  assert.ok(!HAS_DEVA.test(ch.explanation), `explanation has no raw Devanagari: ${where}`);
  checkMarkup(content, ch.explanation);
  checkGrammarNotes(content, ch);
  assert.equal(ch.timeLimitMs, timeLimitFor(ch.kind, level));
  const isReal = (s: string): boolean => li.strings.has(nd(s));
  if (ch.stimulus !== undefined) {
    for (const tok of ch.kind === 'purana' ? ch.stimulus.split(' ').filter((t) => t !== BLANK) : [ch.stimulus]) assert.ok(isReal(tok), `stimulus is real content: ${tok} in ${where}`);
  }
  if (ch.kind === 'krama') {
    assert.ok(ch.tiles && ch.orders && ch.tiles.length >= 2, where);
    const sh = content.shlokas.find((s) => s.id === ch.shlokaId);
    assert.ok(sh, where);
    const seq = sh.words.filter((w) => w.pada === ch.padaIndex).map((w) => w.form);
    for (const t of ch.tiles) assert.ok(isReal(t), `tile is real: ${t}`);
    assert.deepEqual([...ch.tiles].map(nd).sort(), seq.map(nd).sort(), 'tiles are exactly the words of the pāda');
    assert.notEqual(ch.tiles.map(nd).join(' '), seq.map(nd).join(' '), 'tiles are shuffled');
    // every accepted order spells the verse; every permutation that spells the verse is accepted
    const spells = (o: number[]): boolean => o.map((i) => nd(ch.tiles![i] ?? '')).join(' ') === seq.map(nd).join(' ');
    for (const o of ch.orders) assert.ok(spells(o), `order spells the verse: ${where}`);
    if (ch.tiles.length <= 7) assert.equal(ch.orders.length, permutations(ch.tiles.length).filter(spells).length, `all equivalent orders accepted: ${where}`);
    assert.ok(/order the verse has them/.test(ch.prompt));
    for (const o of ch.orders) assert.equal(grade(ch, { order: o, timeMs: 100 }, false).correct, true);
    const wrong = permutations(ch.tiles.length).find((p) => !spells(p));
    if (wrong) assert.equal(grade(ch, { order: wrong, timeMs: 100 }, false).correct, false);
    return;
  }
  const opts = ch.options ?? [];
  const answers = new Set(ch.answers ?? []);
  assert.ok(opts.length >= 2 && opts.length <= (level <= 2 ? 3 : 4), `option count ${opts.length} at L${level}: ${where}`);
  assert.equal(new Set(opts.map((o) => o.id)).size, opts.length, 'option ids unique');
  for (const o of opts) assert.ok((o.sa === undefined) !== (o.en === undefined), 'exactly one of sa/en');
  const labels = opts.map((o) => (o.sa !== undefined ? `sa:${o.sa.split(' ').map(nd).join(' ')}` : `en:${fold(o.en ?? '')}`));
  assert.equal(new Set(labels).size, labels.length, `options unique: ${where}`);
  assert.ok(answers.size >= 1 && [...answers].every((a) => opts.some((o) => o.id === a)), 'answers are option ids');
  // QA 11 Nov S1-02: no two options are the same word in anusvāra / class-nasal spelling; accepted set closed under sameSpelling
  checkSpelling(ch);
  // exactly the keyed answers are correct, judged by an independent oracle
  assert.deepEqual([...oracle(content, ch)].sort(), [...answers].sort(), `keyed answers = oracle: ${where}`);
  for (const o of opts) {
    if (o.sa !== undefined) for (const tok of o.sa.split(' ')) assert.ok(isReal(tok), `option is real content: ${tok}`);
    if (o.en !== undefined && ch.kind === 'artha') assert.ok(content.lexicon.some((e) => e.meaning === o.en), `meaning is a lexicon meaning: ${o.en}`);
    if (o.en !== undefined && ch.kind === 'vibhakti') assert.ok(Object.values(ROLE_LABELS).includes(o.en));
    assert.equal(grade(ch, { option: o.id, timeMs: 100 }, false).correct, answers.has(o.id));
  }
  if (ch.kind === 'artha') {
    const target = indexOf(content).lex.get(ch.lexIds[0] ?? '');
    if (target && target.pos !== 'name') for (const o of opts) assert.ok(content.lexicon.some((e) => e.meaning === o.en && e.pos !== 'name'), `no proper-name options for a common word: ${o.en}`);
    const acc = opts.filter((o) => answers.has(o.id)).map((o) => o.en ?? '');
    for (const o of opts.filter((x) => !answers.has(x.id))) for (const a of acc) assert.ok(!sharesContentWord(a, o.en ?? ''), `distractor "${o.en}" shares a word with "${a}"`);
  }
  if (ch.kind === 'vibhakti') {
    // no distractor is a role the same form could carry out of context (homographic paradigm cells)
    const sh = content.shlokas.find((x) => x.id === ch.shlokaId)!;
    const same = sh.words.filter((w) => nd(w.form) === nd(ch.stimulus ?? ''));
    const labelRole = new Map(Object.entries(ROLE_LABELS).map(([r, l]) => [l, r as GrammarRole]));
    for (const o of opts.filter((x) => !answers.has(x.id))) {
      const r = labelRole.get(o.en ?? '')!;
      for (const w of same) {
        if (w.role && w.role !== 'modifier') assert.ok(!syncreticRoles(w.role, w.grammar).includes(r), `${r} is syncretic with ${w.role} (${w.grammar})`);
        if (w.role && w.role !== 'modifier' && ['subject', 'object', 'instrument', 'recipient', 'source', 'possessor', 'location', 'address'].includes(w.role)) assert.notEqual(r, 'modifier');
      }
    }
  }
  if (ch.kind === 'lipi') {
    assert.equal(ch.stimulusScript, 'iast');
    for (const o of opts) assert.equal(o.script, 'deva');
  }
}

// ───────────────────────── tests ─────────────────────────

function runMatrix(content: GameContent, label: string): Record<string, number> {
  const produced: Record<string, number> = {};
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    let s = mkState(content, seed, level, 6);
    for (const kind of KIND_ORDER) {
      const r = makeChallenge(s, content, kind);
      assert.equal(r.state.tick, s.tick + 1, 'makeChallenge bumps tick');
      s = r.state;
      checkChallenge(content, r.challenge, level);
      produced[`${kind}->${r.challenge.kind}`] = (produced[`${kind}->${r.challenge.kind}`] ?? 0) + 1;
      // deterministic
      assert.deepEqual(makeChallenge({ ...s, tick: s.tick - 1 }, content, kind).challenge, r.challenge, `${label}: deterministic`);
    }
  }
  return produced;
}

test('fixture: all six kinds × levels [2,3,4] × 25 seeds satisfy the accuracy invariants', () => {
  const produced = runMatrix(FIXTURE, 'fixture');
  for (const k of KIND_ORDER) assert.equal(produced[`${k}->${k}`], 75, `${k} is produced as itself on every seed (${JSON.stringify(produced)})`);
});

test('real content: all six kinds × levels × 25 seeds satisfy the accuracy invariants', (t) => {
  if (!realReady) return t.skip('content not written yet');
  runMatrix(REAL, 'real');
});

test('real content: targeted challenges for every heard verse word and every verse', (t) => {
  if (!realReady) return t.skip('content not written yet');
  for (const level of LEVELS) {
    let s = mkState(REAL, 99, level, 6);
    for (const sh of REAL.shlokas) {
      for (const kind of KIND_ORDER) {
        const r = makeChallenge(s, REAL, kind, { shlokaId: sh.id });
        s = r.state;
        checkChallenge(REAL, r.challenge, level);
      }
    }
    const ids = [...new Set(REAL.shlokas.flatMap((sh) => sh.words.map((w) => w.lexId)))].filter((id) => indexOf(REAL).lex.has(id));
    for (const id of ids) {
      for (const kind of ['artha', 'lipi'] as ChallengeKind[]) {
        const r = makeChallenge(s, REAL, kind, { lexIds: [id] });
        s = r.state;
        checkChallenge(REAL, r.challenge, level);
      }
    }
  }
});

/** Every {n:id} / {w:lexId} in runtime text resolves (names.json once content-v has written it; the lexicon always). */
function checkMarkup(content: GameContent, text: string): void {
  for (const m of text.matchAll(/\{w:([^}]+)\}/g)) assert.ok(indexOf(content).lex.has(m[1] as string), `unknown lexId in markup: ${m[0]}`);
  for (const m of text.matchAll(/\{f:([^}]*)\}/g)) {
    const mm = /^([^:]+):(\d+)$/.exec(m[1] as string);
    assert.ok(mm, `malformed {f:} markup: ${m[0]}`);
    const sh = indexOf(content).shloka.get(mm[1] as string);
    assert.ok(sh, `{f:} verse exists: ${m[0]}`);
    const i = Number(mm[2]);
    assert.ok(i >= 0 && i < sh.words.length, `{f:} word index in range: ${m[0]}`);
  }
  if (content.names.length === 0) return;
  for (const m of text.matchAll(/\{n:([^}]+)\}/g)) assert.ok(indexOf(content).name.has(m[1] as string), `unknown name in markup: ${m[0]}`);
}

/** The forms an explanation may describe grammatically: the stimulus, the correct option(s) and the tiles. */
function shownForms(ch: Challenge): Set<string> {
  const out = new Set<string>();
  for (const tok of (ch.stimulus ?? '').split(' ')) if (tok && tok !== BLANK) out.add(nd(tok));
  for (const o of ch.options ?? []) if (o.sa && (ch.answers ?? []).includes(o.id)) for (const tok of o.sa.split(' ')) out.add(nd(tok));
  for (const t of ch.tiles ?? []) out.add(nd(t));
  return out;
}
/**
 * sa-review P0/P1: every grammar note in an explanation belongs to the exact form shown. A grammar string may appear
 * only when a {f:…} reference in the same explanation names a verse word that has that grammar AND whose form is shown.
 */
function checkGrammarNotes(content: GameContent, ch: Challenge): void {
  const fWords = [...ch.explanation.matchAll(/\{f:([^:}]+):(\d+)\}/g)].map((m) => indexOf(content).shloka.get(m[1] as string)?.words[Number(m[2])]).filter((w): w is ShlokaWord => !!w);
  const shown = shownForms(ch);
  const grammars = new Set(content.shlokas.flatMap((x) => x.words.map((w) => w.grammar)).filter((g) => g.length >= 5 && /[.\d]/.test(g) && !HAS_DEVA.test(g)));
  for (const g of grammars) {
    if (!ch.explanation.includes(g)) continue;
    assert.ok(
      fWords.some((w) => w.grammar.includes(g) && shown.has(nd(w.form))),
      `grammar "${g}" is described for a form that is not shown: ${ch.kind} stimulus=${ch.stimulus ?? ''} :: ${ch.explanation}`,
    );
  }
  // lipi / artha / purana / vibhakti: any {f:} word whose grammar is given is exactly the stimulus or the answer
  for (const w of fWords) if (ch.explanation.includes(w.grammar) && ['lipi', 'artha', 'purana', 'vibhakti'].includes(ch.kind)) assert.ok(shown.has(nd(w.form)), `${ch.kind}: grammar of ${w.form} given but the challenge shows ${[...shown].join(' ')}`);
}

test('real content: every markup id in explanations and recital toasts resolves', (t) => {
  if (!realReady) return t.skip('content not written yet');
  for (const level of LEVELS) {
    let s = mkState(REAL, 7, level, 6);
    for (const sh of REAL.shlokas) {
      for (const kind of KIND_ORDER) {
        const r = makeChallenge(s, REAL, kind, { shlokaId: sh.id });
        s = r.state;
        checkMarkup(REAL, r.challenge.explanation);
      }
      const done = answerAll(startRecital(mkState(REAL, 7, level, 6), REAL, sh.id), REAL, () => true);
      for (const f of done.fx) if (f.kind === 'toast') checkMarkup(REAL, f.text);
      assert.equal(done.save.shlokas[sh.id]?.restored, true, `perfect recital restores ${sh.id}`);
    }
  }
});

test('vibhakti: syncretic case roles are never distractors (neuter nom/acc, dual, plural, abl/gen)', () => {
  const has = (role: GrammarRole, g: string, r: GrammarRole): boolean => syncreticRoles(role, g).includes(r);
  assert.ok(has('subject', 'nom. sg. n.', 'object'));
  assert.ok(!has('subject', 'nom. sg. m.', 'object'));
  assert.ok(has('subject', 'nom. sg.', 'object'), 'unknown gender is treated like neuter');
  assert.ok(has('subject', 'nom. du. m.', 'object') && has('subject', 'nom. du. m.', 'address'));
  assert.ok(has('instrument', 'instr. du. m.', 'recipient') && has('instrument', 'instr. du. m.', 'source'));
  assert.ok(has('recipient', 'dat. pl. m.', 'source'));
  assert.ok(has('source', 'abl. sg. m.', 'possessor'));
  assert.ok(has('location', 'loc. sg. f.', 'subject'));
  assert.ok(!has('location', 'loc. sg. m.', 'subject'));
  assert.deepEqual(syncreticRoles('subject', 'nominative').sort(), ['address', 'instrument', 'location', 'object', 'possessor', 'recipient', 'source'], 'unknown number bans every case');
  assert.deepEqual(syncreticRoles('verb', '3rd sg.'), []);
  // a neuter subject in a verse is never asked against Object
  const neut: GameContent = { ...FIXTURE, shlokas: FIXTURE.shlokas.map((s) => ({ ...s, words: s.words.map((w) => (w.lexId === 'tvad' ? { ...w, grammar: 'nom. sg. n.' } : w)) })) };
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    const r = makeChallenge(mkState(neut, seed, level, 6), neut, 'vibhakti', { lexIds: ['tvad'] });
    assert.equal(r.challenge.kind, 'vibhakti');
    assert.ok(!(r.challenge.options ?? []).some((o) => o.en === ROLE_LABELS.object));
    checkChallenge(neut, r.challenge, level);
  }
});

test('sa-review P0: lipi/artha grammar notes describe exactly the form shown (all kinds × levels × 25 seeds, both contents)', (t) => {
  // a lexeme with two forms in the fixture verses: grammar must follow the shown form
  const two: GameContent = { ...FIXTURE, lexicon: FIXTURE.lexicon.map((e) => (e.id === 'kim' ? { ...e, forms: [...e.forms, { form: D('kim'), grammar: 'fixture', shlokaIds: [] }] } : e)) };
  let mismatchAvoided = 0;
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    const r = makeChallenge(mkState(two, seed, level, 6), two, 'lipi', { lexIds: ['kim'] });
    checkChallenge(two, r.challenge, level);
    if (nd(r.challenge.stimulus ?? '') === nd(D('kim'))) {
      mismatchAvoided++;
      assert.ok(!r.challenge.explanation.includes('nom. sg. m.'), `the grammar of kaH is not given for kim: ${r.challenge.explanation}`);
    } else assert.ok(r.challenge.explanation.includes('nom. sg. m.'), 'the exact form gets its grammar');
  }
  assert.ok(mismatchAvoided > 0, 'the other form was exercised');
  // the full matrices run checkGrammarNotes on every challenge (see checkChallenge)
  if (!realReady) return t.skip('content not written yet');
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    let s = mkState(REAL, seed, level, 6);
    for (const kind of KIND_ORDER) for (let k = 0; k < 2; k++) {
      const r = makeChallenge(s, REAL, kind);
      s = r.state;
      checkGrammarNotes(REAL, r.challenge);
    }
  }
});

test('sa-review P1: inflected forms are cited with {f:verse:index}; role explanations are case-centred', () => {
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    let s = mkState(FIXTURE, seed, level, 6);
    for (const kind of ['purana', 'krama', 'viccheda', 'vibhakti'] as ChallengeKind[]) {
      const r = makeChallenge(s, FIXTURE, kind);
      s = r.state;
      assert.ok(/\{f:[^:}]+:\d+\}/.test(r.challenge.explanation), `${kind} cites the verse form: ${r.challenge.explanation}`);
      if (kind === 'vibhakti') {
        const sh = FIXTURE.shlokas.find((x) => x.id === r.challenge.shlokaId)!;
        const m = /^\{f:([^:}]+):(\d+)\}/.exec(r.challenge.explanation);
        assert.ok(m, 'vibhakti explanation starts with the exact form');
        const w = sh.words[Number(m[2])]!;
        assert.equal(nd(w.form), nd(r.challenge.stimulus ?? ''));
        assert.ok(r.challenge.explanation.includes(ROLE_EXPLAIN[w.role!]));
      }
      if (kind === 'purana') {
        const m = /\{f:([^:}]+):(\d+)\}/.exec(r.challenge.explanation)!;
        const w = FIXTURE.shlokas.find((x) => x.id === m[1])!.words[Number(m[2])]!;
        const right = r.challenge.options!.find((o) => r.challenge.answers!.includes(o.id))!;
        assert.equal(nd(w.form), nd(right.sa!), 'purana explains the missing form itself, not the lemma');
      }
    }
  }
  for (const [role, text] of Object.entries(ROLE_EXPLAIN)) {
    assert.ok(text.includes(`{n:role.${role}}`), `${role} names its case via names.json`);
    assert.ok(!HAS_DEVA.test(text));
  }
  for (const old of ['it shows where or when', 'it shows whose', 'it names who or what the sentence is about', 'the point the action starts from']) assert.ok(!Object.values(ROLE_EXPLAIN).some((t) => t.includes(old)), `old wording gone: ${old}`);
  assert.ok(ROLE_EXPLAIN.location.includes('in respect of') && ROLE_EXPLAIN.possessor.includes('for, to') && ROLE_EXPLAIN.source.includes('because of') && ROLE_EXPLAIN.instrument.includes('respect'));
});

test('sa-review P2: trivial sandhi notes are never asked; stop-word and "to be" glosses clash', () => {
  assert.equal(isTrivialNote({ joined: D('SASvatIH samAH'), split: [D('SASvatIH'), D('samAH')] }), true);
  assert.equal(isTrivialNote({ joined: D('rAmaM daSaraTaM'), split: [D('rAmam'), D('daSaraTam')] }), true, 'anusvāra for final m only');
  assert.equal(isTrivialNote({ joined: D('tvamagamaH'), split: [D('tvam'), D('agamaH')] }), false, 'a hidden boundary is a real question');
  assert.equal(isTrivialNote({ joined: D('nUnaM vyAkaraRaM'), split: [D('nUnam'), D('vyAkaraRam')] }), true);
  assert.equal(isTrivialNote({ joined: D('kaSca'), split: [D('kaH'), D('ca')] }), false);
  const triv: GameContent = { ...FIXTURE, shlokas: FIXTURE.shlokas.map((x) => ({ ...x, sandhiNotes: [...x.sandhiNotes, { joined: D('SASvatIH samAH'), split: [D('SASvatIH'), D('samAH')], note: 'no change' }] })) };
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    const r = makeChallenge(mkState(triv, seed, level, 6), triv, 'viccheda');
    assert.notEqual(nd(r.challenge.stimulus ?? ''), nd(D('SASvatIH samAH')), 'trivial note not asked');
    checkChallenge(triv, r.challenge, level);
  }
  if (realReady) for (const n of REAL.shlokas.flatMap((x) => x.sandhiNotes)) if (isTrivialNote(n)) for (const { level, seed } of testMatrix([3], 10)) assert.notEqual(makeChallenge(mkState(REAL, seed, level, 6), REAL, 'viccheda').challenge.stimulus, n.joined);
  assert.equal(sharesContentWord('to be', 'to be, become'), true);
  assert.equal(sharesContentWord('to be, exist', 'to turn; to be, exist'), true);
  assert.equal(sharesContentWord('to be', 'to become'), true, 'the "to be" family');
  assert.equal(sharesContentWord('as, in which way', 'like, as'), true, 'a shared sense, even a stop word');
  assert.equal(sharesContentWord('as', 'as if'), true);
  assert.equal(sharesContentWord('to be', 'to go'), false);
  assert.equal(sharesContentWord('of the', 'hunter'), false);
  // neuter/fem dual -e = loc. sg.
  assert.ok(syncreticRoles('object', 'acc. du. n.').includes('location'));
  assert.ok(!syncreticRoles('object', 'acc. du. m.').includes('location'));
});

test('homographs are never offered against each other; distractors never share content words', () => {
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    const s = mkState(FIXTURE, seed, level, 6);
    const r = makeChallenge(s, FIXTURE, 'artha', { lexIds: ['loka'] });
    assert.equal(r.challenge.kind, 'artha');
    const texts = (r.challenge.options ?? []).map((o) => o.en);
    assert.ok(texts.includes('world'));
    assert.ok(!texts.includes('people'), 'the other sense of the same lemma is never a distractor');
    assert.deepEqual(r.challenge.answers?.length, 1);
  }
  assert.equal(sharesContentWord('go, attain', 'going away'), true);
  assert.equal(sharesContentWord('year', 'years'), true);
  assert.equal(sharesContentWord('hunter', 'world'), false);
  assert.equal(sharesContentWord('the one', 'one'), true);
});

test('krama: duplicate words are interchangeable (every equivalent order accepted)', () => {
  const [a, b, c] = [D('ca'), D('kaH'), D('nu')];
  assert.deepEqual(kramaOrders([a, b], [b, a]), [[1, 0]]);
  assert.equal(kramaOrders([a, b, a], [a, a, b]).length, 2);
  assert.equal(kramaOrders([a, a, a, c], [a, c, a, a]).length, 6);
  assert.deepEqual(kramaOrders([a, b], [a, c]), []);
  // the fixture pāda with two च: every krama on it accepts both orders
  let hits = 0;
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    const s = mkState(FIXTURE, seed, level, 6);
    const r = makeChallenge(s, FIXTURE, 'krama', { shlokaId: 's-ko-nvasmin' });
    if (r.challenge.padaIndex === 2) {
      hits++;
      assert.equal(r.challenge.orders?.length, 2);
    }
  }
  assert.ok(hits > 0, 'the duplicate pāda was exercised');
});

test('fallbacks: unlocks, missing data, empty pool, empty content', () => {
  // chapter 1: only artha/lipi unlocked → verse kinds fall back to artha
  const s1 = mkState(FIXTURE, 5, 3, 1);
  assert.deepEqual(unlockedKinds(s1.save), ['artha', 'lipi']);
  for (const k of ['purana', 'krama', 'viccheda', 'vibhakti'] as ChallengeKind[]) assert.equal(makeChallenge(s1, FIXTURE, k).challenge.kind, 'artha');
  // chapter 2: krama → purana; chapter 3: krama itself
  assert.equal(makeChallenge(mkState(FIXTURE, 5, 3, 2), FIXTURE, 'krama').challenge.kind, 'purana');
  assert.equal(makeChallenge(mkState(FIXTURE, 5, 3, 3), FIXTURE, 'krama').challenge.kind, 'krama');
  // no sandhi notes / no roles → artha
  const noNotes: GameContent = { ...FIXTURE, shlokas: FIXTURE.shlokas.map((s) => ({ ...s, sandhiNotes: [], words: s.words.map(({ role: _r, ...w }) => w) })) };
  const s6 = mkState(noNotes, 5, 3, 6);
  assert.equal(makeChallenge(s6, noNotes, 'viccheda').challenge.kind, 'artha');
  assert.equal(makeChallenge(s6, noNotes, 'vibhakti').challenge.kind, 'artha');
  // single-word pādas → krama falls to purana falls to artha
  const oneWord: GameContent = { ...FIXTURE, shlokas: FIXTURE.shlokas.map((s) => ({ ...s, words: s.words.map((w, i) => ({ ...w, pada: i })) })) };
  assert.equal(makeChallenge(mkState(oneWord, 5, 3, 6), oneWord, 'krama').challenge.kind, 'artha');
  // nothing heard → verse kinds fall back; word kinds use the chapter's verses
  const unheard = mkState(FIXTURE, 5, 3, 6, false);
  const r = makeChallenge(unheard, FIXTURE, 'purana');
  assert.equal(r.challenge.kind, 'artha');
  checkChallenge(FIXTURE, r.challenge, 3);
  // empty content → a harmless English placeholder, never invented Sanskrit
  const empty: GameContent = { ...FIXTURE, shlokas: [], lexicon: [] };
  const p = makeChallenge(mkState(empty, 5, 3, 6), empty, 'krama').challenge;
  assert.equal(p.options?.length, 1);
  assert.equal(p.options?.[0]?.sa, undefined);
  assert.equal(grade(p, { option: 'o0', timeMs: 1 }, false).correct, true);
});

test('unlocks by chapter; level 4 unlocks viccheda/vibhakti one chapter earlier; timers by level', () => {
  const save = (ch: number): SaveData => mkState(FIXTURE, 1, 3, ch).save;
  assert.deepEqual(unlockedKinds(save(2)), ['artha', 'lipi', 'purana']);
  assert.deepEqual(unlockedKinds(save(3)), ['artha', 'lipi', 'purana', 'krama']);
  assert.deepEqual(unlockedKinds(save(3), 4), ['artha', 'lipi', 'purana', 'krama', 'viccheda']);
  assert.deepEqual(unlockedKinds(save(4), 3), ['artha', 'lipi', 'purana', 'krama', 'viccheda']);
  assert.deepEqual(unlockedKinds(save(4), 4), KIND_ORDER);
  assert.deepEqual(unlockedKinds(save(5)), KIND_ORDER);
  assert.equal(makeChallenge(mkState(FIXTURE, 3, 4, 3), FIXTURE, 'viccheda').challenge.kind, 'viccheda');
  assert.equal(makeChallenge(mkState(FIXTURE, 3, 3, 3), FIXTURE, 'viccheda').challenge.kind, 'artha');
  assert.equal(timeLimitFor('artha', 3), 15000);
  assert.equal(timeLimitFor('krama', 3), 25000);
  assert.equal(timeLimitFor('artha', 2), 22500);
  assert.equal(timeLimitFor('krama', 4), 20000);
});

test('grade: swift within 40% of the limit; relaxed makes every correct answer swift; timeouts are wrong', () => {
  const ch = makeChallenge(mkState(FIXTURE, 8, 3, 6), FIXTURE, 'artha').challenge;
  const right = ch.answers![0]!;
  assert.deepEqual(grade(ch, { option: right, timeMs: 6000 }, false), { correct: true, swift: true, timeMs: 6000 });
  assert.deepEqual(grade(ch, { option: right, timeMs: 6001 }, false), { correct: true, swift: false, timeMs: 6001 });
  assert.equal(grade(ch, { option: right, timeMs: 14000 }, true).swift, true);
  assert.equal(grade(ch, { option: right, timeMs: 0 }, false).swift, true, 'relaxed view sends timeMs 0');
  assert.equal(grade(ch, { timeMs: 15000 }, false).correct, false);
  assert.equal(grade(ch, { option: 'nope', timeMs: 10 }, false).swift, false);
});

test('SRS: Leitner transitions, tiers, session stats and the practised list', () => {
  let s = mkState(FIXTURE, 1, 3, 6, false);
  const ch: Challenge = { id: 'x', kind: 'artha', prompt: 'p', lexIds: ['eka', 'eka'], explanation: '', timeLimitMs: 15000 };
  assert.equal(tier(s.save, 'eka'), 'unseen');
  s = markSeen(s, ['eka']);
  assert.equal(tier(s.save, 'eka'), 'seen');
  const ok = { correct: true, swift: true, timeMs: 1 };
  const bad = { correct: false, swift: false, timeMs: 1 };
  const boxes: number[] = [];
  for (const r of [ok, ok, ok, ok, ok, ok, bad, bad, bad, ok]) {
    s = recordResult(s, ch, r);
    boxes.push(s.save.words['eka']!.box);
  }
  assert.deepEqual(boxes, [1, 2, 3, 4, 5, 5, 3, 1, 0, 1]);
  const w = s.save.words['eka']!;
  assert.equal(w.correct, 7);
  assert.equal(w.wrong, 3);
  assert.equal(w.lastStep, s.save.step);
  assert.equal(s.save.step, 10);
  assert.equal(s.session.total, 10);
  assert.equal(s.session.correct, 7);
  assert.equal(s.session.swift, 7);
  assert.equal(s.session.practised.length, 10, 'duplicate lexIds count once per answer');
  // tier boundaries
  const at = (box: number, seen = 1): string => tier({ ...s.save, words: { q: { seen, correct: 0, wrong: 0, box, lastStep: 0 } } }, 'q');
  assert.deepEqual([at(0), at(1), at(2), at(3), at(4), at(5), at(0, 0)], ['seen', 'seen', 'known', 'known', 'mastered', 'mastered', 'unseen']);
});

test('markHeard marks the verse heard and its words seen; feeds the word pool', () => {
  let s = mkState(FIXTURE, 1, 3, 1, false);
  s = markHeard(s, FIXTURE, 's-ma-nishada');
  assert.equal(s.save.shlokas['s-ma-nishada']?.heard, true);
  assert.deepEqual(s.session.shlokasHeard, ['s-ma-nishada']);
  for (const w of FIXTURE.shlokas[0]!.words) assert.equal(tier(s.save, w.lexId), 'seen');
  assert.equal(tier(s.save, 'kim'), 'unseen');
  // artha targets now come from the heard verse
  for (let i = 0; i < 20; i++) {
    const r = makeChallenge({ ...s, tick: i }, FIXTURE, 'artha');
    assert.ok(FIXTURE.shlokas[0]!.words.some((w) => w.lexId === r.challenge.lexIds[0]), 'pool = heard words');
  }
});

function answerAll(s0: GameState, content: GameContent, correctMask: (i: number) => boolean): GameState {
  let s = s0;
  let i = 0;
  while (s.recital && s.pending?.kind === 'challenge') {
    const ch = s.pending.challenge;
    const good = correctMask(i++);
    s = ch.tiles ? recitalAnswer(s, content, { order: good ? ch.orders![0]! : [], timeMs: 1000 }) : recitalAnswer(s, content, { option: good ? ch.answers![0]! : 'wrong', timeMs: 1000 });
    assert.equal(s.pending?.kind, 'feedback');
    s = recitalAdvance(s, content);
  }
  return s;
}

test('recital: one krama per pāda (purana before ch3) + 2 word questions; restores at ≥ 75% and unlocks moves', () => {
  for (const level of LEVELS) {
    const s3 = startRecital(mkState(FIXTURE, 3, level, 3), FIXTURE, 's-ma-nishada');
    const q = s3.recital!.queue;
    assert.equal(q.length, 6);
    assert.deepEqual(q.slice(0, 4).map((c) => c.kind), ['krama', 'krama', 'krama', 'krama']);
    assert.deepEqual(q.slice(0, 4).map((c) => c.padaIndex), [0, 1, 2, 3]);
    for (const c of q) checkChallenge(FIXTURE, c, level);
    assert.equal(new Set(q.map((c) => c.id)).size, q.length, 'challenge ids unique');
    assert.equal(s3.pending?.kind === 'challenge' && s3.pending.context, 'recite');
    const s2 = startRecital(mkState(FIXTURE, 3, level, 2), FIXTURE, 's-ma-nishada');
    assert.deepEqual(s2.recital!.queue.slice(0, 4).map((c) => c.kind), ['purana', 'purana', 'purana', 'purana']);
  }
  // perfect → restored, move unlocked and equipped (player has 2 moves), toast fx
  const done = answerAll(startRecital(mkState(FIXTURE, 3, 3, 1), FIXTURE, 's-ma-nishada'), FIXTURE, () => true);
  assert.equal(done.recital, null);
  assert.equal(done.pending, null);
  assert.equal(done.save.shlokas['s-ma-nishada']?.restored, true);
  assert.equal(done.save.shlokas['s-ma-nishada']?.best, 1);
  assert.deepEqual(done.session.shlokasRestored, ['s-ma-nishada']);
  const player = done.save.party.find((m) => m.id === 'player')!;
  assert.ok(player.moves.includes('shoka_shloka'));
  assert.equal(player.pp['shoka_shloka'], indexOf(FIXTURE).move.get('shoka_shloka')!.pp);
  assert.ok(done.fx.some((f) => f.kind === 'toast' && f.text.includes('{n:move.shoka_shloka}')));
  assert.ok(done.fx.some((f) => f.kind === 'sfx' && f.name === 'win'));
  // threshold: 5/6 (0.83) restores, 4/6 (0.67) does not
  const five = answerAll(startRecital(mkState(FIXTURE, 4, 3, 3), FIXTURE, 's-ma-nishada'), FIXTURE, (i) => i !== 0);
  assert.equal(five.save.shlokas['s-ma-nishada']?.restored, true);
  const four = answerAll(startRecital(mkState(FIXTURE, 4, 3, 3), FIXTURE, 's-ma-nishada'), FIXTURE, (i) => i >= 2);
  assert.equal(four.save.shlokas['s-ma-nishada']?.restored, false);
  assert.ok(Math.abs((four.save.shlokas['s-ma-nishada']?.best ?? 0) - 4 / 6) < 1e-9);
  assert.ok(!four.save.party[0]!.moves.includes('shoka_shloka'));
  assert.equal(four.session.total, 6);
});

test('recital unlock: a hero with 4 moves only gains the move as learnable (PP set), not equipped', () => {
  const s0 = mkState(FIXTURE, 3, 3, 1);
  const p = s0.save.party[0]!;
  const full = { ...p, moves: ['pada_bana', 'lipi_raksha', 'suprabhata', 'shuddha_vak'] };
  const s = { ...s0, save: { ...s0.save, party: [full] } };
  const done = answerAll(startRecital(s, FIXTURE, 's-ma-nishada'), FIXTURE, () => true);
  const m = done.save.party[0]!;
  assert.equal(m.moves.length, 4);
  assert.ok(!m.moves.includes('shoka_shloka'));
  assert.ok(m.pp['shoka_shloka']! > 0);
  assert.ok(done.fx.some((f) => f.kind === 'toast' && f.text.includes('equip it')));
});

// ───────────────────────── Sambhāṣaṇa (ui-b): prompts, explanations, role labels, recital toasts ─────────────────────────

/** The English of a prompt key with its line slot: must equal the prompt the builder wrote (English unchanged). */
const PROMPT_KEY: Record<ChallengeKind, string> = { artha: 'learn.arthaPrompt', lipi: 'learn.lipiPrompt', purana: 'learn.puranaPrompt', krama: 'learn.kramaPrompt', viccheda: 'learn.vicchedaPrompt', vibhakti: 'learn.vibhaktiPrompt', smarana: 'learn.smaranaPrompt', antya: '' /* v0.5b: built by logic-chain only, never by makeChallenge */ };

function saProblems(content: GameContent, ch: Challenge, o: ReturnType<typeof getOracle>): string[] {
  const out: string[] = [];
  const where = `${ch.kind} ${ch.shlokaId ?? ch.lexIds.join(',')}`;
  if (!ch.promptSa) out.push(`${where}: no promptSa`);
  else {
    const r = o.verifyLine(ch.promptSa, { en: ch.prompt, ui: true });
    if (!r.ok) out.push(`${where} prompt "${ch.promptSa}": ${r.errors.join('; ')}`);
    assert.equal(uiEn(content, PROMPT_KEY[ch.kind], { n: (ch.padaIndex ?? 0) + 1 }), ch.prompt, `${where}: the prompt key's English is the prompt`);
  }
  if (!ch.explanationSa) out.push(`${where}: no explanationSa`);
  else {
    const r = o.verifyLine(ch.explanationSa, { en: ch.explanation, ui: true });
    if (!r.ok) out.push(`${where} explanation "${ch.explanationSa}": ${r.errors.join('; ')}`);
    assert.ok(!/[A-Za-z]/.test(ch.explanationSa.replace(/\{[^{}]*\}/g, '')), `${where}: no English inside the Sanskrit explanation (glosses and the verse translation are left out)`);
  }
  for (const opt of ch.options ?? []) {
    if (opt.sa) continue;
    if (ch.kind === 'artha') assert.equal(opt.labelSa, undefined, 'meaning options stay English (the meaning being taught)');
    else if (!opt.labelSa) out.push(`${where}: English option "${opt.en}" has no labelSa`);
    else {
      const r = o.verifyLine(opt.labelSa, { en: opt.en ?? '', ui: true, label: true });
      if (!r.ok) out.push(`${where} option "${opt.labelSa}": ${r.errors.join('; ')}`);
    }
  }
  return out;
}

test('sa-ui: every generated challenge has a Sanskrit prompt, explanation and role labels that verify (every verse × kind, every verse word, levels)', (t) => {
  if (!realReady) return t.skip('content not written yet');
  const o = getOracle();
  const problems: string[] = [];
  const kinds = new Map<ChallengeKind, number>();
  let n = 0;
  const check = (ch: Challenge): void => {
    n++;
    kinds.set(ch.kind, (kinds.get(ch.kind) ?? 0) + 1);
    problems.push(...saProblems(REAL, ch, o));
  };
  for (const level of LEVELS) {
    let s = mkState(REAL, 31 + level, level, 6);
    for (const sh of REAL.shlokas)
      for (const kind of KIND_ORDER) {
        const r = makeChallenge(s, REAL, kind, { shlokaId: sh.id });
        s = r.state;
        check(r.challenge);
      }
    const ids = [...new Set(REAL.shlokas.flatMap((sh) => sh.words.map((w) => w.lexId)))].filter((id) => indexOf(REAL).lex.has(id));
    for (const id of ids)
      for (const kind of ['artha', 'lipi', 'vibhakti'] as ChallengeKind[]) {
        const r = makeChallenge(s, REAL, kind, { lexIds: [id] });
        s = r.state;
        check(r.challenge);
      }
    // the untargeted matrix too (SRS pool, fallbacks)
    for (let seed = 0; seed < 25; seed++)
      for (const kind of KIND_ORDER) check(makeChallenge(mkState(REAL, seed, level, 6), REAL, kind).challenge);
  }
  console.log(`# ${n} challenges, Sanskrit checked: ${[...kinds].map(([k, c]) => `${k} ${c}`).join(' · ')}`);
  for (const k of KIND_ORDER) assert.ok((kinds.get(k) ?? 0) > 0, `${k} was produced`);
  assert.deepEqual(problems, [], `${problems.length} problem(s):\n  ${problems.slice(0, 40).join('\n  ')}`);
});

test('sa-ui: the placeholder challenge and its option are Sanskrit too; content without interface strings keeps English only', () => {
  const o = getOracle();
  const empty: GameContent = { ...REAL, shlokas: [], lexicon: [] };
  const ch = makeChallenge(mkState(empty, 1, 3, 1), empty, 'lipi').challenge;
  assert.equal(ch.prompt, 'The verses are still being gathered. Tap to continue.');
  assert.ok(ch.promptSa && o.verifyLine(ch.promptSa, { ui: true }).ok, String(ch.promptSa));
  assert.ok(ch.explanationSa && o.verifyLine(ch.explanationSa, { ui: true }).ok, String(ch.explanationSa));
  assert.ok(ch.options?.[0]?.labelSa && o.verifyLine(ch.options[0].labelSa, { ui: true, label: true }).ok);
  const bare: GameContent = { ...FIXTURE, ui: undefined };
  for (const kind of KIND_ORDER) {
    const c = makeChallenge(mkState(bare, 2, 3, 6), bare, kind).challenge;
    assert.equal(c.promptSa, undefined, 'no interface table → no Sanskrit fields');
    assert.equal(c.explanationSa, undefined);
    assert.ok((c.options ?? []).every((x) => x.labelSa === undefined));
  }
});

test('sa-ui: recital toasts carry Sanskrit that verifies (restored, new move for every hero, recited again, failed, cannot recite); English unchanged', (t) => {
  if (!realReady) return t.skip('content not written yet');
  const o = getOracle();
  const problems: string[] = [];
  const seen = new Set<string>();
  const checkToasts = (s: GameState): void => {
    for (const f of s.fx) {
      if (f.kind !== 'toast') continue;
      const kind = f.text.replace(/[0-9]+/g, '#').replace(/\{n:[^}]*\}|\{player\}/g, '@');
      seen.add(kind.startsWith('New move') ? 'New move' : kind);
      if (!f.textSa) problems.push(`no textSa: ${f.text}`);
      else {
        const r = o.verifyLine(f.textSa, { en: f.text, ui: true });
        if (!r.ok) problems.push(`"${f.textSa}" (${f.text}): ${r.errors.join('; ')}`);
      }
    }
  };
  // every hero who owns a verse-unlocked move is in the party, so each new-move toast names a hero
  const heroes = [...new Set(REAL.moves.filter((m) => m.unlockShloka).map((m) => allyForMove(m.id, REAL)).filter((id): id is string => !!id))];
  for (const avatar of ['a', 'b'] as const) {
    for (const sh of REAL.shlokas) {
      const base = mkState(REAL, 5, 3, 6);
      const party = heroes.map((id) => newMember(indexOf(REAL).ally.get(id)!, 20, REAL)).map((m) => (m.id === 'rama' ? { ...m, moves: m.moves.slice(0, 4) } : m));
      const s0: GameState = { ...base, save: { ...base.save, avatar, party, shlokas: { ...base.save.shlokas, [sh.id]: { heard: true, restored: false, best: 0 } } } };
      const done = answerAll(startRecital(s0, REAL, sh.id), REAL, () => true);
      checkToasts(done);
      const again = answerAll(startRecital({ ...done, fx: [] }, REAL, sh.id), REAL, () => true);
      checkToasts(again);
      const failed = answerAll(startRecital({ ...s0, fx: [] }, REAL, sh.id), REAL, () => false);
      checkToasts(failed);
    }
  }
  checkToasts(startRecital(mkState(REAL, 1, 3, 6), REAL, 'no-such-verse'));
  for (const k of ['Verse restored! # of # correct.', 'Recited again: # of # correct.', '# of # correct. Three in four (#%) restores the verse. Try again!', 'This verse cannot be recited yet.', 'New move']) assert.ok(seen.has(k), `toast kind exercised: ${k} (${[...seen].join(' | ')})`);
  assert.deepEqual(problems, [], `${problems.length} problem(s):\n  ${problems.slice(0, 30).join('\n  ')}`);
  // the keys' English is exactly what the logic writes
  assert.equal(uiEn(REAL, 'recital.restored', { c: 5, t: 6 }), 'Verse restored! 5 of 6 correct.');
  assert.equal(uiEn(REAL, 'recital.again', { c: 6, t: 6 }), 'Recited again: 6 of 6 correct.');
  assert.equal(uiEn(REAL, 'recital.fail', { c: 2, t: 6 }), '2 of 6 correct. Three in four (75%) restores the verse. Try again!');
  assert.equal(uiEn(REAL, 'recital.cannot'), 'This verse cannot be recited yet.');
  assert.equal(uiEn(REAL, 'recital.newMove', { who: '{player}', move: '{n:move.bana}' }), 'New move for {player}: {n:move.bana}');
  assert.equal(uiEn(REAL, 'recital.newMoveEquip', { who: '{n:ally.rama}', move: '{n:move.bana}' }), 'New move for {n:ally.rama}: {n:move.bana} (equip it from the Party menu)');
  assert.equal(uiEn(REAL, 'learn.placeholderPrompt'), 'The verses are still being gathered. Tap to continue.');
  assert.equal(uiEn(REAL, 'learn.placeholderExpl'), 'No verse words are available yet.');
  for (const r of Object.keys(ROLE_LABELS) as GrammarRole[]) assert.ok(Object.values(REAL.ui ?? {}).some((e) => e.en === ROLE_LABELS[r] && e.label), `role label "${ROLE_LABELS[r]}" has an interface key`);
});

// ───────────────────────── QA 11 Nov (findings QA-ramayana-yatra-01 … 08) ─────────────────────────

const ROLE_OF_LABEL = new Map(Object.entries(ROLE_LABELS).map(([r, l]) => [l, r as GrammarRole]));

/** Every challenge the game can generate for the real content: all kinds × levels 2–4 × seeds (3 per kind) + every recital. */
function sweepReal(seeds: number, visit: (ch: Challenge, level: Level) => void): number {
  let n = 0;
  for (const level of LEVELS) {
    for (let seed = 1; seed <= seeds; seed++) {
      for (const kind of KIND_ORDER) {
        let s = mkState(REAL, seed, level, 6);
        for (let t = 0; t < 3; t++) {
          const r = makeChallenge(s, REAL, kind);
          s = r.state;
          visit(r.challenge, level);
          n++;
        }
      }
      if (seed <= 12) for (const sh of REAL.shlokas) for (const ch of startRecital(mkState(REAL, seed, level, 6), REAL, sh.id).recital?.queue ?? []) {
        visit(ch, level);
        n++;
      }
    }
  }
  return n;
}

test('QA 11 Nov S1-01: a predicative participle (role verb, case in its grammar) accepts its case; never explained as a finite verb', (t) => {
  if (!realReady) return t.skip('content not written yet');
  const parts = REAL.shlokas.flatMap((sh) => sh.words.map((w) => ({ sh, w })).filter(({ w }) => participleCase(w.role, w.grammar) !== null));
  assert.ok(parts.length >= 3, `the three participles of 4.3.29 / 6.109.25 are found (${parts.length})`);
  for (const { sh, w } of parts) {
    for (const { level, seed } of testMatrix(LEVELS, 25)) {
      const ch = makeChallenge(mkState(REAL, seed, level, 6), REAL, 'vibhakti', { shlokaId: sh.id, lexIds: [w.lexId] }).challenge;
      if (ch.kind !== 'vibhakti' || nd(ch.stimulus ?? '') !== nd(w.form)) continue;
      checkChallenge(REAL, ch, level);
      const c = participleCase(w.role, w.grammar) as GrammarRole;
      const caseOpt = (ch.options ?? []).find((o) => o.en === ROLE_LABELS[c]);
      if (caseOpt) assert.ok(ch.answers?.includes(caseOpt.id), `${w.form}: "${ROLE_LABELS[c]}" is accepted`);
      for (const o of ch.options ?? []) if (!ch.answers?.includes(o.id)) assert.ok(!syncreticRoles(c, w.grammar).includes(ROLE_OF_LABEL.get(o.en ?? '') as GrammarRole), `${w.form}: no syncretic case as a distractor`);
      assert.ok(!/person, number and tense/.test(ch.explanation), `${w.form}: not explained as a finite verb: ${ch.explanation}`);
      assert.ok(/participle/.test(ch.explanation) && /no person ending/.test(ch.explanation), ch.explanation);
    }
  }
  // finite verbs keep the verb explanation
  assert.equal(participleCase('verb', '3rd sg. present'), null);
  assert.equal(participleCase('modifier', 'present active participle, instr. sg. m.'), null);
  assert.equal(participleCase('verb', 'past passive participle, nom. sg. n.'), 'subject');
  // and over everything the game generates
  let seen = 0;
  sweepReal(40, (ch) => {
    if (ch.kind !== 'vibhakti') return;
    const sh = REAL.shlokas.find((x) => x.id === ch.shlokaId)!;
    for (const w of sh.words.filter((x) => nd(x.form) === nd(ch.stimulus ?? ''))) {
      const c = participleCase(w.role, w.grammar);
      if (!c) continue;
      seen++;
      for (const o of ch.options ?? []) if (o.en === ROLE_LABELS[c]) assert.ok(ch.answers?.includes(o.id), `${w.form}: case marked wrong`);
      assert.ok(!/person, number and tense/.test(ch.explanation));
    }
  });
  assert.ok(seen > 0, 'the sweep met participle challenges');
});

test('QA 11 Nov S1-02: no generated challenge (levels 2–4, all verses) offers two spellings of one word; accepted set closed under sameSpelling', (t) => {
  // fixture: add the anusvāra spelling of a pāda word to the form pool; it must never be offered against the class-nasal/m form
  const eq: GameContent = { ...FIXTURE, lexicon: FIXTURE.lexicon.map((e) => (e.id === 'pratishtha' ? { ...e, forms: [...e.forms, { form: D('pratizWAM'), grammar: 'fixture', shlokaIds: [] }] } : e)) };
  for (const { level, seed } of testMatrix(LEVELS, 25)) {
    let s = mkState(eq, seed, level, 6);
    for (const kind of ['lipi', 'purana', 'viccheda'] as ChallengeKind[]) for (let k = 0; k < 3; k++) {
      const r = makeChallenge(s, eq, kind, k === 0 ? { lexIds: ['pratishtha'] } : undefined);
      s = r.state;
      checkChallenge(eq, r.challenge, level);
    }
  }
  if (!realReady) return t.skip('content not written yet');
  // the real content holds one such pair (two verses spell the same pronoun differently)
  let checked = 0;
  for (const sh of REAL.shlokas) for (const level of LEVELS) for (let seed = 1; seed <= 30; seed++) {
    const r = makeChallenge(mkState(REAL, seed, level, 6), REAL, 'purana', { shlokaId: sh.id });
    checkSpelling(r.challenge);
    checked++;
  }
  for (const level of LEVELS) for (let seed = 1; seed <= 60; seed++) checkSpelling(makeChallenge(mkState(REAL, seed, level, 6), REAL, 'lipi', { lexIds: ['kincit'] }).challenge);
  const n = sweepReal(40, (ch) => checkSpelling(ch));
  assert.ok(checked > 0 && n > 2000, `swept ${n} challenges`);
});

test('QA 11 Nov S2-03: a word with an open edition variant is never the gap of a pūraṇa challenge', (t) => {
  if (!realReady) return t.skip('content not written yet');
  const flagged = REAL.shlokas.flatMap((sh) => sh.words.filter((w) => w.variant).map((w) => ({ sh, w })));
  // the three edition variants REVIEW.md flags (5.34.6, 6.109.25, 3.37.13) carry the flag on the word that differs
  for (const id of ['s-kalyani-bata', 's-maranantani', 's-ramo-vigrahavan']) assert.ok(flagged.some((f) => f.sh.id === id), `${id} has a flagged variant word`);
  const review = readFileSync(new URL('./REVIEW.md', import.meta.url), 'utf8');
  for (const { sh, w } of flagged) {
    assert.ok(review.includes(`**${sh.id}**`), `${sh.id} is on REVIEW.md's human-review list`);
    assert.ok(w.variant && !HAS_DEVA.test(w.variant), 'variant note is English');
  }
  const isGap = (ch: Challenge, sh: Shloka, w: ShlokaWord): boolean => {
    if (ch.kind !== 'purana' || ch.shlokaId !== sh.id || ch.padaIndex !== w.pada) return false;
    const pw = sh.words.filter((x) => x.pada === w.pada);
    return pw[(ch.stimulus ?? '').split(' ').indexOf(BLANK)] === w;
  };
  for (const { sh, w } of flagged) {
    for (const level of LEVELS) for (let seed = 1; seed <= 60; seed++) {
      const r = makeChallenge(mkState(REAL, seed, level, 2), REAL, 'purana', { shlokaId: sh.id, lexIds: [w.lexId] });
      assert.ok(!isGap(r.challenge, sh, w), `${sh.id}: ${w.form} asked as a gap`);
      for (const ch of startRecital(mkState(REAL, seed, level, 2), REAL, sh.id).recital?.queue ?? []) assert.ok(!isGap(ch, sh, w), `recital ${sh.id}: ${w.form} asked as a gap`);
    }
  }
  sweepReal(25, (ch) => {
    for (const { sh, w } of flagged) assert.ok(!isGap(ch, sh, w), `${sh.id}: ${w.form} asked as a gap`);
  });
});

test('QA 11 Nov S3: -am adverbs never mark "Accusative" wrong; demonstratives never offered against each other; title half-verses as printed', (t) => {
  if (!realReady) return t.skip('content not written yet');
  const DEMO = /\b(this|that|he|she|it)\b/;
  sweepReal(25, (ch) => {
    if (ch.kind === 'vibhakti') {
      const sh = REAL.shlokas.find((x) => x.id === ch.shlokaId)!;
      const w = sh.words.find((x) => nd(x.form) === nd(ch.stimulus ?? ''))!;
      if (w.role === 'indeclinable' && /m$/.test(devaToSlp1(nd(w.form)))) for (const o of ch.options ?? []) assert.ok(o.en !== ROLE_LABELS.object || ch.answers?.includes(o.id), `${w.form}: Accusative offered as wrong`);
    }
    if (ch.kind === 'artha') {
      const target = indexOf(REAL).lex.get(ch.lexIds[0] ?? '');
      if (target?.pos !== 'pronoun' || !DEMO.test(fold(target.meaning))) return;
      for (const o of ch.options ?? []) {
        if (ch.answers?.includes(o.id)) continue;
        const e = REAL.lexicon.find((x) => x.meaning === o.en && x.pos === 'pronoun');
        assert.ok(!pronounSensesClash(target, e), `${target.lemma}: "${o.en}" offered as wrong`);
      }
    }
  });
  // the "this" pronoun is never asked against "that; he, she, it" (forced artha over many seeds)
  const idam = indexOf(REAL).lex.get('idam');
  if (idam) for (const level of LEVELS) for (let seed = 1; seed <= 80; seed++) {
    const ch = makeChallenge(mkState(REAL, seed, level, 6), REAL, 'artha', { lexIds: ['idam'] }).challenge;
    for (const o of ch.options ?? []) if (!ch.answers?.includes(o.id)) assert.ok(!/\b(he|she|it)\b/.test(fold(o.en ?? '')) || !REAL.lexicon.some((e) => e.meaning === o.en && e.pos === 'pronoun'), `idam: "${o.en}" offered as wrong`);
  }
  // half-verses: only the space at a pāda break may go, never a letter; junctions printed across a break appear as printed
  for (const sh of REAL.shlokas) {
    const lines = halfVerseLines(sh);
    assert.equal(lines.length, Math.ceil(sh.padas.length / 2));
    const sounds = (x: string[]): string => x.map((l) => devaToSlp1(nd(l))).join('').replace(/\s+/g, '');
    assert.equal(sounds(lines), sounds(sh.padas), `${sh.id}: letters unchanged`);
    // compared in SLP1: a printed junction may start inside a word of the line (a vowel sign there, an initial vowel in the note)
    const slp = (x: string): string => devaToSlp1(nd(x)).replace(/\s+/g, ' ');
    for (const n of sh.sandhiNotes) if (/spans the break between pādas/.test(n.note)) assert.ok(lines.some((l) => slp(l).includes(slp(n.joined))), `${sh.id}: "${n.joined}" shown as printed in ${lines.join(' / ')}`);
  }
  const mn = REAL.shlokas.find((x) => x.id === 's-ma-nishada');
  if (mn) {
    const [first = ''] = halfVerseLines(mn);
    const brk = mn.sandhiNotes.find((n) => /break between pādas 1 and 2/.test(n.note));
    assert.ok(brk && first.includes(brk.joined) && !first.includes(brk.split.join(' ')), `title epigraph line 1 keeps the printed sandhi: ${first}`);
  }
});
