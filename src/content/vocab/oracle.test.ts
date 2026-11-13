/**
 * Dictionary re-verification: when the reference datasets are available (env SAMSKURU_ORACLES, default
 * /home/claude/refs/data) the whole pack is rebuilt from tools/content/nominal/vocab-list.ts and must be
 * byte-identical to the committed data.ts; a few direct dictionary lookups are asserted as well. Skipped otherwise.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build, render } from '../../../tools/content/nominal/gen-vocab';
import { dictsAvailable, key, loadAmara, loadApte, loadMw, loadVerbForms } from '../../../tools/content/nominal/lib/dict';
import { oraclesAvailable } from '../../../tools/content/nominal/lib/oracles';
import { canon } from '../../../tools/content/nominal/lib/slp';
import { devaToSlp1 } from '../../sanskrit/translit';
import { VOCAB } from './index';

const skip = oraclesAvailable() && dictsAvailable() ? false : 'reference datasets not present (set SAMSKURU_ORACLES)';

test('oracle: regenerated vocabulary is identical to the committed data.ts', { skip }, () => {
  const b = build();
  assert.equal(b.entries.length, VOCAB.length);
  const committed = readFileSync(fileURLToPath(new URL('./data.ts', import.meta.url)), 'utf8');
  assert.equal(render(b.entries), committed, 'data.ts is stale — run tools/content/nominal/gen-vocab.ts');
  assert.ok(b.dropped.length <= 10, `unexpectedly many dropped candidates: ${b.dropped.map((d) => d.word).join(', ')}`);
  assert.deepEqual(b.categoryNotes, [], 'every word of every category name must be a verified form');
});

test('oracle: every dictionary-tagged noun is found again with its gender', { skip }, () => {
  const mw = loadMw();
  const apte = loadApte();
  const amara = loadAmara();
  let mwChecked = 0;
  let apteChecked = 0;
  let amaraChecked = 0;
  for (const e of VOCAB) {
    if (e.pos !== 'noun') continue;
    for (const tag of e.provenance.verifiedBy) {
      const m = /^oracle:mw#([A-Za-z]+)$/.exec(tag);
      if (m) {
        const entry = mw.entries.get(m[1]!);
        assert.ok(entry, `${e.id}: MW headword ${m[1]} not found`);
        assert.ok(entry.records.some((r) => r.lex.has(e.gender!)), `${e.id}: MW ${m[1]} is not ${e.gender}.`);
        mwChecked++;
      }
      const a = /^oracle:apte#([A-Za-z]+)$/.exec(tag);
      if (a) {
        assert.ok(apte.has(a[1]!), `${e.id}: Apte headword ${a[1]} not found`);
        apteChecked++;
      }
    }
    if (e.provenance.verifiedBy.includes('oracle:amarakosha')) {
      const k = key(devaToSlp1(e.stem!));
      const hit = [k, k.replace(/([aAiIuUfeo])tr/, '$1ttr'), k.replace(/rt(?!t)/, 'rtt')].some((x) => amara.get(x)?.has(e.gender!));
      assert.ok(hit, `${e.id}: Amarakośa does not list ${e.stem} as ${e.gender}.`);
      amaraChecked++;
    }
  }
  assert.ok(mwChecked > 500, `MW checks: ${mwChecked}`);
  assert.ok(apteChecked > 300, `Apte checks: ${apteChecked}`);
  assert.ok(amaraChecked > 300, `Amarakośa checks: ${amaraChecked}`);
});

test('oracle: every unprefixed verb is a laṭ 3rd singular in both conjugation datasets', { skip }, () => {
  const vf = loadVerbForms();
  let n = 0;
  for (const e of VOCAB) {
    if (e.pos !== 'verb' || !e.provenance.verifiedBy.includes('oracle:heritage-roots')) continue;
    const f = key(canon(devaToSlp1(e.sa)));
    assert.ok(vf.lat3s.has(f), `${e.id}: ${e.sa} not in the ashtadhyayi.com tables`);
    assert.ok(vf.heritageLat3s.has(f) || vf.heritageFinite.has(f), `${e.id}: ${e.sa} not in Sanskrit Heritage`);
    n++;
  }
  assert.ok(n >= 70, `checked ${n} verbs`);
});

test('oracle: spot checks of dictionary facts the pack relies on', { skip }, () => {
  const mw = loadMw();
  const genders = (k: string): string => [...new Set((mw.entries.get(k)?.records ?? []).flatMap((r) => [...r.lex]))].sort().join('');
  assert.ok(genders('vfkza').includes('m'));
  assert.ok(genders('Pala').includes('n'));
  assert.ok(genders('latA').includes('f'));
  assert.ok(genders('mitra').includes('n'));
  assert.ok(mw.derivedFeminines.has('bAlikA'), 'MW gives bālikā as the feminine of bālaka');
  assert.ok((mw.entries.get('atra')?.records ?? []).some((r) => r.lex.has('ind')));
  assert.ok(loadApte().has('vfkzaH') && loadApte().has('Palam') && loadApte().has('latA'));
});
