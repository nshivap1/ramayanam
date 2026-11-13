/**
 * Reader level (v0.4.3, fx-level): the logic knows how the player reads (save.reader ← the story-text language, action
 * `set-reader`) and draws the classic challenges to fit (PRD → Challenge mix per story-text language):
 *  - no reader (English): exactly the v0.4.2 draws (census hash below; the practice snapshot in logic.test.ts);
 *  - 'sa' (संस्कृतम्): never lipi, never artha for a basic word (or a name), the harder kinds first;
 *  - 'sa-en' (संस्कृतम् + English): never lipi; everything else as in English.
 * Checked over a census (25 seeds × levels × books: practice battle moves of every kind, a Kathā study-hall round, a
 * practice recital) and with the story bots (practice and Kathā) in every reader setting.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { type Level, createRng } from '@sdk';
import type { ChallengeKind, GameState, Reader } from './types';
import { loadContent } from './content';
import { indexOf } from './logic-util';
import { SHRINE_CMDS, SHRINE_EVENT_ID, SHRINE_STUDY, startScript } from './logic-events';
import { BASIC_POS, HARD_KINDS, KIND_ORDER, READER_BASIC, STUDY_ROUND, hardWord, isBasicWord, loadGame, makeChallenge, newGame, readerChain, reduce, setReader, startBattle, toSave, unlockedKinds } from './logic';
import { runWalkthrough } from './logic-sim';
import { deriveBasic } from './reader-basic';
import { type CensusDraw, census, censusState, kindCounts } from './reader-census';
import { manifest } from './manifest';

const REAL = loadContent();
const idx = indexOf(REAL);
const LEVELS = manifest.levels;
const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);
const BOOKS = [1, 2, 3, 4, 5, 6];
const byLemma = (lemma: string): string => {
  const e = REAL.lexicon.find((x) => x.lemma === lemma);
  assert.ok(e, `lexicon has ${lemma}`);
  return e.id;
};
const lex = (id: string) => idx.lex.get(id);

/**
 * Hash of the census drawn with NO reader, computed on the v0.4.2 logic before the reader level existed (commit 1203907,
 * reader-census.ts as it is now). Equal hash = the English player's challenges are untouched.
 */
const CENSUS_V042 = '97ac0440e70f1c6dbb122b62';
const hashOf = (draws: CensusDraw[]): string => {
  const h = createHash('sha256');
  for (const d of draws) h.update(JSON.stringify(d));
  return h.digest('hex').slice(0, 24);
};

const cache: Partial<Record<Reader | 'en', CensusDraw[]>> = {};
function drawsFor(reader: Reader | 'en'): CensusDraw[] {
  return (cache[reader] ??= census(REAL, SEEDS, LEVELS, BOOKS, reader === 'en' ? undefined : reader));
}

// ───────────────────────── the basic-word rule ─────────────────────────

test('basic words: content/reader.json is exactly the derivation from @content/vocab and @content/dhatu; the rule on its examples', () => {
  const derived = deriveBasic(REAL.lexicon);
  assert.deepEqual(READER_BASIC, derived, `content/reader.json "basic" is out of date: replace it with\n${JSON.stringify(derived, null, 1)}`);
  for (const [id, e] of Object.entries(READER_BASIC)) assert.equal(lex(id)?.lemma, e.lemma, `${id}: the lemma it was derived for`);
  // rule 1: closed classes
  for (const l of ['च', 'वा', 'अपि', 'एव', 'इति', 'न', 'हि', 'तु', 'त्वम्', 'किम्', 'तद्', 'एक']) assert.ok(isBasicWord(lex(byLemma(l))), `${l} is basic (closed class)`);
  assert.deepEqual([...BASIC_POS].sort(), ['indeclinable', 'numeral', 'pronoun']);
  // rule 2: everyday nouns / adjectives (vocab level ≤ 2) and common roots (dhātu level ≤ 2), in the same sense
  for (const l of ['गम्', 'भाष्', 'कृ', 'ज्ञा', 'देव', 'धर्म', 'राजन्', 'सर्व', 'पूर्व']) assert.ok(isBasicWord(lex(byLemma(l))), `${l} is basic (pack level ≤ 2)`);
  // harder verse words: compounds, rarer words, a root in a rarer sense (विद् "know" is dhātu level 3), level-3 roots
  for (const l of ['धर्मज्ञ', 'कृतज्ञ', 'अनिर्वेद', 'विद्', 'ब्रू', 'काङ्क्ष्', 'निषाद', 'प्रतिष्ठा', 'तपःस्वाध्यायनिरत']) {
    assert.ok(!isBasicWord(lex(byLemma(l))), `${l} is a harder word`);
    assert.ok(hardWord(lex(byLemma(l))), `${l} may be asked in संस्कृतम्`);
  }
  assert.ok(!hardWord(lex(byLemma('राम'))), 'a name is never asked for its meaning');
  const hard = REAL.lexicon.filter((e) => hardWord(e)).length;
  assert.ok(hard >= 60, `plenty of harder words to ask (${hard})`);
});

// ───────────────────────── the action ─────────────────────────

test('set-reader: in every mode; sa / sa-en set save.reader, en / null remove it; same object when unchanged or invalid; kept by the save', () => {
  const g = newGame(5, 3, REAL, { name: 'R', avatar: 'a' });
  assert.equal(g.mode, 'script', 'the intro runs');
  assert.equal('reader' in g.save, false, 'a new journey without a reader has no field');
  const sa = reduce(g, REAL, { type: 'set-reader', reader: 'sa' });
  assert.equal(sa.save.reader, 'sa');
  assert.equal(sa.mode, g.mode);
  assert.deepEqual(sa.pending, g.pending, 'nothing else changes');
  assert.equal(reduce(sa, REAL, { type: 'set-reader', reader: 'sa' }), sa, 'unchanged → same object');
  assert.equal(reduce(sa, REAL, { type: 'set-reader', reader: 'fr' as never }), sa, 'not a reader level → same object');
  const en = reduce(sa, REAL, { type: 'set-reader', reader: 'en' });
  assert.equal('reader' in en.save, false, "'en' removes the field");
  assert.deepEqual(en.save, g.save, 'back to the English save exactly');
  assert.equal(reduce(g, REAL, { type: 'set-reader', reader: null }), g, 'null on an English save → same object');
  assert.equal(reduce(sa, REAL, { type: 'set-reader', reader: null }).save.reader, undefined);
  // explore and battle
  const ex = censusState(REAL, 3, 3, 1);
  assert.equal(ex.mode, 'explore');
  assert.equal(reduce(ex, REAL, { type: 'set-reader', reader: 'sa-en' }).save.reader, 'sa-en');
  const enemy = REAL.enemies[0];
  assert.ok(enemy);
  const b = startBattle(ex, REAL, { enemies: [{ id: enemy.id, level: 3 }], kind: 'wild', canRun: true, canLose: true, bg: 'forest', music: 'boss' });
  assert.equal(b.mode, 'battle');
  const b2 = reduce(b, REAL, { type: 'set-reader', reader: 'sa' });
  assert.equal(b2.save.reader, 'sa');
  assert.deepEqual(b2.battle, b.battle, 'the battle is untouched');
  // newGame / save round trip
  assert.equal(newGame(5, 3, REAL, { name: 'R', avatar: 'a', reader: 'sa' }).save.reader, 'sa');
  assert.equal('reader' in newGame(5, 3, REAL, { name: 'R', avatar: 'a', reader: 'en' }).save, false);
  assert.equal(loadGame(toSave(sa), 1, 3, REAL)?.save.reader, 'sa', 'kept by the save');
  assert.equal('reader' in (loadGame({ ...toSave(sa), reader: 'xx' }, 1, 3, REAL)?.save ?? {}), false, 'junk → English');
  assert.equal('reader' in (loadGame(toSave(g), 1, 3, REAL)?.save ?? {}), false, 'an English save stays without the field');
  assert.equal(setReader(ex, 'en'), ex);
});

test('readerChain: never lipi; sa replaces lipi by a harder kind, sa-en by artha; unlockedKinds per reader', () => {
  const rng = createRng(9);
  for (const reader of ['sa', 'sa-en'] as Reader[])
    for (const kind of KIND_ORDER)
      for (const gate of [true, false]) {
        const chain = readerChain(kind, reader, KIND_ORDER.filter((k) => k !== 'lipi'), gate, rng);
        assert.ok(!chain.includes('lipi') && !chain.includes('smarana'), `${reader} ${kind}: ${chain.join(' ')}`);
        assert.equal(new Set(chain).size, chain.length, 'no kind twice');
        if (kind === 'lipi') assert.ok(reader === 'sa' ? HARD_KINDS.includes(chain[0] as ChallengeKind) : chain[0] === 'artha', `${reader}: lipi → ${chain[0]}`);
        else assert.equal(chain[0], kind, 'any other kind is tried first as asked');
      }
  const save = (chapter: number, reader?: Reader): GameState['save'] => ({ ...censusState(REAL, 1, 3, chapter).save, ...(reader ? { reader } : {}) });
  assert.deepEqual(unlockedKinds(save(1)), ['artha', 'lipi'], 'English: unchanged');
  assert.deepEqual(unlockedKinds(save(1, 'sa-en')), ['artha']);
  assert.deepEqual(unlockedKinds(save(3, 'sa-en')), ['artha', 'purana', 'krama']);
  assert.deepEqual(unlockedKinds(save(1, 'sa')), ['artha', 'purana', 'krama', 'viccheda', 'vibhakti'], 'a संस्कृतम् reader needs no ramp');
});

// ───────────────────────── census ─────────────────────────

test('no reader (English): the challenges drawn are exactly those of v0.4.2 (census hash), and set-reader back to English draws the same', () => {
  const en = drawsFor('en');
  assert.equal(en.length, SEEDS.length * LEVELS.length * BOOKS.length * (KIND_ORDER.length + STUDY_ROUND) + en.filter((d) => d.where === 'recital').length);
  assert.equal(hashOf(en), CENSUS_V042, `census hash ${hashOf(en)}`);
  // explicit equality: a save that was संस्कृतम् and went back to English draws what an English save draws
  for (const seed of SEEDS.slice(0, 5))
    for (const level of LEVELS) {
      let a = censusState(REAL, seed, level, 4);
      let b = setReader(setReader(a, 'sa'), 'en');
      assert.deepEqual(b.save, a.save);
      for (const kind of KIND_ORDER) {
        const ra = makeChallenge(a, REAL, kind);
        const rb = makeChallenge(b, REAL, kind);
        assert.deepEqual(rb.challenge, ra.challenge, `seed ${seed} L${level} ${kind}`);
        a = ra.state;
        b = rb.state;
      }
    }
});

function noBasicArtha(d: CensusDraw): boolean {
  return d.challenge.kind !== 'artha' || d.challenge.lexIds.every((id) => hardWord(lex(id)));
}

test('reader sa (संस्कृतम्): 25 seeds × levels × books — no lipi, no artha on a basic word or a name, no placeholder; the harder kinds first', () => {
  const sa = drawsFor('sa');
  const en = drawsFor('en');
  const bad = sa.filter((d) => d.challenge.kind === 'lipi' || !noBasicArtha(d));
  assert.deepEqual(bad.map((d) => `${d.where} s${d.seed} L${d.level} b${d.chapter} ${d.challenge.kind} ${d.challenge.lexIds.join(',')}`).slice(0, 5), []);
  assert.ok(sa.every((d) => (d.challenge.options?.length ?? 2) > 1 || d.challenge.tiles), 'never the "verses are still being gathered" placeholder');
  // battle moves: lipi → a harder kind; artha → artha (on a harder word); the others as asked
  for (const d of sa.filter((x) => x.where === 'battle')) {
    if (d.asked === 'lipi') assert.ok(HARD_KINDS.includes(d.challenge.kind), `lipi move → ${d.challenge.kind}`);
    if (d.asked === 'artha') assert.equal(d.challenge.kind, 'artha', 'an artha move still asks a meaning (of a harder word)');
  }
  // study hall: every round of five has at least four of the harder kinds (and at most one artha)
  const rounds = new Map<string, ChallengeKind[]>();
  for (const d of sa.filter((x) => x.where === 'study')) rounds.set(`${d.seed}:${d.level}:${d.chapter}`, [...(rounds.get(`${d.seed}:${d.level}:${d.chapter}`) ?? []), d.challenge.kind]);
  for (const [k, kinds] of rounds) {
    assert.equal(kinds.length, STUDY_ROUND);
    assert.ok(kinds.filter((x) => HARD_KINDS.includes(x)).length >= 4 && kinds.filter((x) => x === 'artha').length <= 1, `round ${k}: ${kinds.join(' ')}`);
  }
  // pūraṇa gap / vibhakti word: a harder word when the line (verse) has one
  for (const d of sa) {
    const c = d.challenge;
    const sh = c.shlokaId ? idx.shloka.get(c.shlokaId) : undefined;
    if (!sh) continue;
    if (c.kind === 'purana') {
      const line = sh.words.filter((w) => w.pada === c.padaIndex && idx.lex.has(w.lexId) && !w.variant);
      if (line.some((w) => !isBasicWord(lex(w.lexId)))) assert.ok(c.lexIds.every((id) => !isBasicWord(lex(id))), `pūraṇa gap on a basic word: ${c.lexIds.join(',')}`);
    }
    if (c.kind === 'vibhakti') {
      const w = sh.words.find((x) => x.form === c.stimulus && c.lexIds.includes(x.lexId));
      if (sh.words.some((x) => x.role && x.role !== 'indeclinable' && idx.lex.has(x.lexId))) assert.notEqual(w?.role, 'indeclinable', `vibhakti on an indeclinable: ${c.stimulus}`);
    }
  }
  // the mix moved to the harder kinds (before → after, battle + study)
  const before = { ...kindCounts(en, 'battle') };
  const after = kindCounts(sa, 'battle');
  for (const k of HARD_KINDS) assert.ok(after[k]! >= before[k]!, `${k}: ${before[k]} → ${after[k]}`);
  const basicBefore = en.filter((d) => !noBasicArtha(d)).length;
  assert.ok(basicBefore > 500, `English still asks basic meanings (${basicBefore})`);
});

test('reader sa-en (संस्कृतम् + English): no lipi; basic-word artha stays; only the draws that were lipi change', () => {
  const se = drawsFor('sa-en');
  const en = drawsFor('en');
  assert.equal(se.filter((d) => d.challenge.kind === 'lipi').length, 0);
  assert.ok(se.some((d) => !noBasicArtha(d)), 'basic-word meanings may stay for sa-en');
  assert.equal(se.length, en.length);
  for (let i = 0; i < en.length; i++) {
    const a = en[i] as CensusDraw;
    const b = se[i] as CensusDraw;
    if (a.where !== 'battle') continue;
    if (a.challenge.kind !== 'lipi') assert.deepEqual(b.challenge, a.challenge, `s${a.seed} L${a.level} b${a.chapter} ${a.asked}: unchanged`);
    else assert.notEqual(b.challenge.kind, 'lipi');
  }
});

test('study hall through the reducer (Kathā shrine, SHRINE_STUDY) in संस्कृतम्: a round of five without lipi or a basic-word meaning', () => {
  for (const seed of SEEDS.slice(0, 10))
    for (const level of LEVELS) {
      const k = setReader(censusState(REAL, seed, level, 1, { katha: true }), 'sa');
      let s = reduce(startScript(k, REAL, SHRINE_EVENT_ID, SHRINE_CMDS), REAL, { type: 'choose', index: SHRINE_STUDY });
      assert.equal(s.recital?.study, true);
      const kinds: ChallengeKind[] = [];
      for (let i = 0; i < 40 && s.pending?.kind !== 'shrine'; i++) {
        const p = s.pending;
        if (p?.kind === 'challenge') {
          const ch = p.challenge;
          kinds.push(ch.kind);
          assert.ok(ch.kind !== 'lipi' && (ch.kind !== 'artha' || ch.lexIds.every((id) => hardWord(lex(id)))), `${ch.kind} ${ch.lexIds.join(',')}`);
          s = reduce(s, REAL, ch.orders ? { type: 'answer', order: ch.orders[0]!, timeMs: 100 } : { type: 'answer', option: ch.answers![0]!, timeMs: 100 });
        } else s = reduce(s, REAL, { type: 'advance' });
      }
      assert.equal(kinds.length, STUDY_ROUND, `seed ${seed} L${level}: ${kinds.join(' ')}`);
      assert.equal(s.session.correct, STUDY_ROUND, 'every right answer is graded right');
    }
});

// ───────────────────────── story bots ─────────────────────────

const BOT_SEEDS = Math.max(1, Math.min(25, Number(process.env['RY_BOT_SEEDS'] ?? 25) || 25));

/** Every classic challenge the bot meets (battle, story quiz, recital), as it appears. */
function botRun(seed: number, level: Level, opts: Parameters<typeof runWalkthrough>[3]): { r: ReturnType<typeof runWalkthrough>; seen: { context: string; kind: ChallengeKind; lexIds: string[] }[] } {
  const seen: { context: string; kind: ChallengeKind; lexIds: string[] }[] = [];
  const r = runWalkthrough(REAL, seed, level, {
    ...opts,
    onAction: (b, _a, n) => {
      const p = n.pending;
      if (p?.kind === 'challenge' && p !== b.pending && p.challenge.kind !== 'smarana') seen.push({ context: p.context, kind: p.challenge.kind, lexIds: p.challenge.lexIds });
    },
  });
  return { r, seen };
}
function finished(r: ReturnType<typeof runWalkthrough>, what: string): void {
  assert.equal(r.error, null, `${what}: ${r.error ?? ''}`);
  assert.equal(r.state.mode, 'ended', what);
  assert.equal(r.state.save.flags['ch6.complete'], true, what);
}

test(`practice journey in संस्कृतम् (reader sa), story bot × ${BOT_SEEDS} seeds × levels: no lipi and no basic-word meaning in battle, quiz or recital; the story finishes`, () => {
  const kinds: Record<string, number> = {};
  for (const level of LEVELS)
    for (let seed = 1; seed <= BOT_SEEDS; seed++) {
      const { r, seen } = botRun(seed, level, { reader: 'sa' });
      finished(r, `sa seed ${seed} L${level}`);
      assert.equal(r.state.save.reader, 'sa');
      assert.ok(seen.filter((x) => x.context === 'battle').length > 20, 'battles drew challenges');
      for (const x of seen) {
        kinds[`${x.context}:${x.kind}`] = (kinds[`${x.context}:${x.kind}`] ?? 0) + 1;
        assert.notEqual(x.kind, 'lipi', `seed ${seed} L${level} ${x.context}`);
        if (x.kind === 'artha') assert.ok(x.lexIds.every((id) => hardWord(lex(id))), `seed ${seed} L${level} ${x.context}: artha on ${x.lexIds.map((id) => lex(id)?.lemma).join(',')}`);
      }
    }
  for (const k of HARD_KINDS) assert.ok((kinds[`battle:${k}`] ?? 0) > 0, `battle draws ${k}: ${JSON.stringify(kinds)}`);
});

test('story bots finish in both journeys with every reader setting (practice sa-en: no lipi; Kathā: sa, sa-en, English)', () => {
  const n = Math.min(BOT_SEEDS, 10);
  for (const level of LEVELS)
    for (let seed = 1; seed <= n; seed++) {
      const { r, seen } = botRun(seed, level, { reader: 'sa-en' });
      finished(r, `practice sa-en seed ${seed} L${level}`);
      assert.equal(seen.filter((x) => x.kind === 'lipi').length, 0, `practice sa-en seed ${seed} L${level}: no lipi`);
    }
  for (const reader of ['sa', 'sa-en', undefined] as (Reader | undefined)[])
    for (const level of LEVELS)
      for (let seed = 1; seed <= Math.min(BOT_SEEDS, 3); seed++)
        for (const accuracy of [1, 0.7]) {
          const { r } = botRun(seed, level, { style: 'katha', accuracy, attempts: 12, ...(reader ? { reader } : {}) });
          finished(r, `Kathā ${reader ?? 'en'} seed ${seed} L${level} accuracy ${accuracy}`);
          assert.equal(r.state.save.reader, reader);
        }
});
