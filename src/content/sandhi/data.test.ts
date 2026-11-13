import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SANDHI_RULES, joinSandhiDeva } from '../../sanskrit/sandhi';
import { normalizeDeva, validateDeva } from '../../sanskrit/translit';
import { SANDHI_EXAMPLES, SANDHI_PENDING_ENGINE, meta, sandhiByFamily, sandhiByRule } from './index';

const RULES = new Map(SANDHI_RULES.map((r) => [r.id, r]));
/** Rules that have few natural examples; every other rule must have at least 12. */
const SMALL_RULES = new Set(['shtutva', 'udah-stha']);

test('sandhi pack: size, unique ids, unique pairs', () => {
  assert.ok(SANDHI_EXAMPLES.length >= 300, `expected ≥ 300 examples, got ${SANDHI_EXAMPLES.length}`);
  assert.equal(meta.count, SANDHI_EXAMPLES.length);
  const ids = new Set(SANDHI_EXAMPLES.map((e) => e.id));
  assert.equal(ids.size, SANDHI_EXAMPLES.length, 'duplicate id');
  const pairs = new Set(SANDHI_EXAMPLES.map((e) => `${e.first}+${e.second}`));
  assert.equal(pairs.size, SANDHI_EXAMPLES.length, 'duplicate first+second pair');
  for (const e of SANDHI_EXAMPLES) assert.match(e.id, /^sandhi-[a-z-]+-\d{2}$/);
});

test('sandhi pack: all strings are valid, normalised Devanagari', () => {
  for (const e of SANDHI_EXAMPLES) {
    for (const s of [e.first, e.second, e.result, ...(e.alternatives ?? [])]) {
      const v = validateDeva(s);
      assert.ok(v.ok, `${e.id}: ${s}: ${v.errors.join('; ')}`);
      assert.equal(s, normalizeDeva(s), `${e.id}: ${s} is not normalised`);
      assert.ok(!/[।॥०-९-]/.test(s), `${e.id}: ${s} contains punctuation or digits`);
    }
    assert.ok(!e.first.includes(' ') && !e.second.includes(' '), `${e.id}: parts must be single words`);
    assert.ok(e.en !== undefined && e.en.trim() !== '' && /^[\x20-\x7EÀ-ɏḀ-ỿ’]+$/.test(e.en), `${e.id}: gloss missing or not Latin: ${e.en}`);
  }
});

test('sandhi pack: every example is reproduced by the engine under its rule', () => {
  for (const e of SANDHI_EXAMPLES) {
    const rule = RULES.get(e.ruleId);
    assert.ok(rule !== undefined, `${e.id}: unknown rule ${e.ruleId}`);
    assert.equal(e.family, rule.family, `${e.id}: family`);
    const r = joinSandhiDeva(e.first, e.second, e.options);
    const outcomes = [{ result: r.result, ruleId: r.ruleId, spaced: r.spaced }, ...r.alternatives];
    const hit = outcomes.find((o) => o.result === e.result);
    assert.ok(hit !== undefined, `${e.id}: ${e.first} + ${e.second}: engine gives ${outcomes.map((o) => o.result).join(' / ')}, pack has ${e.result}`);
    assert.equal(hit.ruleId, e.ruleId, `${e.id}: engine attributes ${e.result} to ${hit.ruleId}`);
    assert.equal(e.result.includes(' '), hit.spaced, `${e.id}: spacing`);
    assert.deepEqual(
      [...(e.alternatives ?? [])].sort(),
      outcomes.filter((o) => o.result !== e.result).map((o) => o.result).sort(),
      `${e.id}: alternatives differ from the engine's`,
    );
    assert.ok(e.provenance.verifiedBy.includes('engine:joinSandhiDeva'), `${e.id}: provenance`);
    assert.equal(e.compound === true, e.options?.compound === true || e.options?.internal === true, `${e.id}: compound flag and engine options disagree`);
  }
});

test('sandhi pack: every engine rule is covered; balanced across rules', () => {
  for (const rule of SANDHI_RULES) {
    const n = sandhiByRule(rule.id).length;
    const min = SMALL_RULES.has(rule.id) ? 5 : 12;
    assert.ok(n >= min, `rule ${rule.id}: ${n} examples, expected ≥ ${min}`);
  }
});

test('sandhi pack: levels follow the curriculum bands', () => {
  for (const e of SANDHI_EXAMPLES) {
    assert.ok(Number.isInteger(e.level) && e.level >= 2 && e.level <= 5, `${e.id}: level ${e.level}`);
    if (e.family !== 'svara') assert.ok(e.level >= 3, `${e.id}: visarga / vyañjana sandhi starts at level 3`);
  }
  assert.ok(sandhiByFamily('svara', 2).length >= 100);
  assert.ok(sandhiByFamily('svara', 2).every((e) => e.level <= 2 && e.family === 'svara'));
  assert.equal(sandhiByFamily('svara').length + sandhiByFamily('visarga').length + sandhiByFamily('vyanjana').length, SANDHI_EXAMPLES.length);
});

test('sandhi pack: pending-engine items are separate and still not produced by the engine', (t) => {
  const main = new Set(SANDHI_EXAMPLES.map((e) => `${e.first}+${e.second}`));
  const ids = new Set<string>();
  for (const p of SANDHI_PENDING_ENGINE) {
    assert.equal(p.pendingEngine, true);
    assert.ok(!main.has(`${p.first}+${p.second}`), `${p.id} is also in SANDHI_EXAMPLES`);
    assert.ok(!ids.has(p.id), `${p.id}: duplicate id`);
    ids.add(p.id);
    for (const s of [p.first, p.second, p.result, p.sutra.text]) assert.ok(validateDeva(s).ok, `${p.id}: ${s}`);
    const r = joinSandhiDeva(p.first, p.second, { compound: true });
    if (r.result === p.result || r.alternatives.some((a) => a.result === p.result)) {
      t.diagnostic(`${p.id}: the engine now produces ${p.result} — it can be promoted to sandhi.txt`);
    }
  }
});

test('sandhi pack: generator output and oracle provenance are reproducible (needs SAMSKURU_ORACLES)', async (t) => {
  const oracles = process.env.SAMSKURU_ORACLES ?? '/home/claude/refs/data';
  if (!existsSync(`${oracles}/sanskrit-lexicon_csl-orig/v02/mw/mw.txt`)) {
    t.skip('corpora not present: cross-check skipped');
    return;
  }
  const gen = await import('../../../tools/content/sahitya/gen-sandhi');
  const g = gen.generateSandhi();
  if (!g.complete) {
    t.skip('some corpora missing: cross-check skipped');
    return;
  }
  assert.equal(readFileSync(gen.SANDHI_DATA_FILE, 'utf8'), g.body, 'data.ts is out of date: run node --import tsx tools/content/sahitya/gen-sandhi.ts');
  const lib = await import('../../../tools/content/sahitya/lib');
  const stems: Record<string, string[]> = { संस्कृतम्: ['संस्कृत'], मातृष्वसा: ['मातृष्वसृ'] };
  for (const p of SANDHI_PENDING_ENGINE) {
    if (!p.provenance.verifiedBy.includes('oracle:mw-headword')) continue;
    assert.ok(lib.mwAttests(p.result, stems[p.result] ?? []) !== undefined, `${p.id}: ${p.result} is not a MW headword`);
  }
});
