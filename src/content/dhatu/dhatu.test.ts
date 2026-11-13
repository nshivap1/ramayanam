import assert from 'node:assert/strict';
import { test } from 'node:test';
import { devaToSlp1, validateDeva } from '../../sanskrit/translit';
import type { Forms, Lakara, Pada, Purusha, Vacana } from '../types';
import { conj, dhatu, dhatusForLevel, DHATUS, LAKARAS, meta, padasOf, PREFIXED, prefixedForLevel, WITHHELD_KRDANTA, type DhatuEntry } from './index';
import { parseTable } from './types';
import { buildAll, loadOracles } from '../../../tools/content/verbal/dhatu-build';
import { oraclesAvailable } from '../../../tools/content/verbal/oracles';
import { buildPrefixed, joinPrefix } from '../../../tools/content/verbal/prefixed-build';
import { PREFIXED_SPECS } from '../../../tools/content/verbal/prefixed-list';

const PADAS: Pada[] = ['P', 'A'];

function must(id: string): DhatuEntry {
  const d = dhatu(id);
  assert.ok(d, `dhātu ${id} missing`);
  return d;
}

/** Every cell of every table: [entry, lakāra, pada, puruṣa, vacana, forms]. */
function* cells(): Generator<[DhatuEntry, Lakara, Pada, Purusha, Vacana, readonly string[]]> {
  for (const d of DHATUS) {
    for (const l of LAKARAS) {
      for (const p of PADAS) {
        const t = d.forms[l]?.[p];
        if (!t) continue;
        for (let pu = 1; pu <= 3; pu++) for (let va = 1; va <= 3; va++) yield [d, l, p, pu as Purusha, va as Vacana, t[pu - 1]?.[va - 1] ?? []];
      }
    }
  }
}

/** Cells withheld because no independent engine confirmed the primary oracle (see REVIEW.md §1). */
const WITHHELD = new Set(['bru-2u lrt.A.1.3', 'vid-2p lan.P.1.3', 'ghat-10u lan.P.2.3', 'ghat-10u lot.P.1.2', 'ghat-10u vidhilin.P.1.2', 'ghat-10u vidhilin.P.2.3']);

// ── shape ────────────────────────────────────────────────────────────────────

test('pack size, ids and gaṇa coverage', () => {
  assert.ok(DHATUS.length >= 90, `only ${DHATUS.length} dhātus`);
  assert.equal(new Set(DHATUS.map((d) => d.id)).size, DHATUS.length, 'duplicate ids');
  assert.equal(new Set(DHATUS.map((d) => d.dhatupatha)).size, DHATUS.length, 'the same dhātupāṭha entry is listed twice');
  for (let g = 1; g <= 10; g++) assert.ok(DHATUS.some((d) => d.gana === g), `gaṇa ${g} has no dhātu`);
  for (const d of DHATUS) {
    assert.match(d.id, /^[a-z]+-(10|[1-9])[pau]$/, `id ${d.id}`);
    assert.equal(d.id.endsWith(`-${d.gana}${d.pada.toLowerCase()}`), true, `${d.id}: id does not encode gaṇa/pada`);
    assert.ok(d.en.length > 0 && d.provenance.verifiedBy.length >= 2, `${d.id}: gloss / provenance`);
    assert.ok([0, 1, 2, 3, 4, 5].includes(d.level));
  }
  assert.equal(meta.count, DHATUS.length + PREFIXED.length);
});

test('every table is 3 × 3 and every lakāra is present in the taught pada(s)', () => {
  for (const d of DHATUS) {
    for (const l of LAKARAS) {
      const byPada = d.forms[l];
      assert.ok(byPada, `${d.id}: ${l} missing`);
      for (const p of PADAS) {
        const t: Forms[][] | undefined = byPada[p];
        if (!t) continue;
        assert.equal(t.length, 3, `${d.id} ${l} ${p}`);
        for (const row of t) {
          assert.equal(row.length, 3, `${d.id} ${l} ${p}`);
          for (const cell of row) assert.ok(Array.isArray(cell));
        }
      }
    }
    // pada bookkeeping
    const padas = padasOf(d);
    if (d.pada === 'U') assert.deepEqual(padas, ['P', 'A'], `${d.id}: ubhayapadī needs both padas`);
    else assert.equal(padas[0], d.pada, `${d.id}: primary pada`);
    if (d.pada !== 'U' && padas.length > 1) assert.equal(d.id, 'mr-6a', `${d.id}: unexpected second pada`);
    const primary: Pada = d.pada === 'A' ? 'A' : 'P';
    for (let pu = 1; pu <= 3; pu++) for (let va = 1; va <= 3; va++) assert.ok(conj(d, 'lat', primary, pu as Purusha, va as Vacana).length > 0, `${d.id}: laṭ ${primary} ${pu}.${va} empty`);
  }
});

test('empty cells are exactly the documented withheld ones', () => {
  const empty: string[] = [];
  for (const [d, l, p, pu, va, forms] of cells()) if (forms.length === 0) empty.push(`${d.id} ${l}.${p}.${pu}.${va}`);
  assert.deepEqual(new Set(empty), WITHHELD);
});

test('every string is valid, normalised Devanagari', () => {
  const check = (s: string, where: string, isForm = true): void => {
    const v = validateDeva(s);
    assert.ok(v.ok, `${where}: ${s}: ${v.errors.join('; ')}`);
    assert.equal(s, s.normalize('NFC'), where);
    assert.doesNotMatch(s, /\s/, `${where}: whitespace in ${s}`);
    assert.doesNotMatch(s, /ं[क-म]/u, `${where}: anusvāra before a stop in ${s} (class nasal expected)`);
    assert.doesNotMatch(s, /ं$/u, `${where}: final anusvāra in ${s} (म् expected)`);
    if (isForm) assert.doesNotMatch(s, /[दगडब]्$/u, `${where}: pre-sandhi voiced final in ${s}`);
  };
  let n = 0;
  for (const [d, l, p, pu, va, forms] of cells()) {
    assert.equal(new Set(forms).size, forms.length, `${d.id} ${l}.${p}.${pu}.${va}: duplicate alternates`);
    for (const f of forms) {
      check(f, `${d.id} ${l}.${p}.${pu}.${va}`);
      n++;
    }
  }
  for (const d of DHATUS) {
    check(d.dhatu, `${d.id} dhatu`, false);
    assert.equal(n > 0, true);
    assert.equal(d.evidence.forms > 0, true);
    for (const [k, forms] of Object.entries(d.krdanta)) for (const f of forms) check(f, `${d.id} ${k}`);
    for (const l of d.lyap ?? []) check(l.form, `${d.id} lyap`);
    if (d.artha) assert.ok(validateDeva(d.artha).ok, `${d.id} artha`);
  }
  assert.equal(n, DHATUS.reduce((a, d) => a + d.evidence.forms, 0), 'evidence.forms must count the shipped finite forms');
});

// ── golden paradigms (typed by hand from the standard school tables; not generated) ──────────

function golden(id: string, lakara: Lakara, pada: Pada, table: string): void {
  const d = must(id);
  const want = parseTable(table);
  for (let pu = 1; pu <= 3; pu++) {
    for (let va = 1; va <= 3; va++) {
      const got = conj(d, lakara, pada, pu as Purusha, va as Vacana);
      const w = want[pu - 1]?.[va - 1] ?? [];
      assert.equal(got[0], w[0], `${id} ${lakara} ${pada} ${pu}.${va}: display form`);
      for (const alt of w) assert.ok(got.includes(alt), `${id} ${lakara} ${pada} ${pu}.${va}: ${alt} not accepted`);
    }
  }
}

test('golden: पठ् in all five lakāras', () => {
  golden('path-1p', 'lat', 'P', 'पठति पठतः पठन्ति | पठसि पठथः पठथ | पठामि पठावः पठामः');
  golden('path-1p', 'lan', 'P', 'अपठत् अपठताम् अपठन् | अपठः अपठतम् अपठत | अपठम् अपठाव अपठाम');
  golden('path-1p', 'lrt', 'P', 'पठिष्यति पठिष्यतः पठिष्यन्ति | पठिष्यसि पठिष्यथः पठिष्यथ | पठिष्यामि पठिष्यावः पठिष्यामः');
  golden('path-1p', 'lot', 'P', 'पठतु पठताम् पठन्तु | पठ पठतम् पठत | पठानि पठाव पठाम');
  golden('path-1p', 'vidhilin', 'P', 'पठेत् पठेताम् पठेयुः | पठेः पठेतम् पठेत | पठेयम् पठेव पठेम');
});

test('golden: भू laṭ, अस् laṭ + laṅ, गम् lṛṭ', () => {
  golden('bhu-1p', 'lat', 'P', 'भवति भवतः भवन्ति | भवसि भवथः भवथ | भवामि भवावः भवामः');
  golden('as-2p', 'lat', 'P', 'अस्ति स्तः सन्ति | असि स्थः स्थ | अस्मि स्वः स्मः');
  golden('as-2p', 'lan', 'P', 'आसीत् आस्ताम् आसन् | आसीः आस्तम् आस्त | आसम् आस्व आस्म');
  golden('gam-1p', 'lrt', 'P', 'गमिष्यति गमिष्यतः गमिष्यन्ति | गमिष्यसि गमिष्यथः गमिष्यथ | गमिष्यामि गमिष्यावः गमिष्यामः');
});

test('golden: कृ laṭ P + Ā, लभ् laṭ, दा laṭ', () => {
  golden('kr-8u', 'lat', 'P', 'करोति कुरुतः कुर्वन्ति | करोषि कुरुथः कुरुथ | करोमि कुर्वः कुर्मः');
  golden('kr-8u', 'lat', 'A', 'कुरुते कुर्वाते कुर्वते | कुरुषे कुर्वाथे कुरुध्वे | कुर्वे कुर्वहे कुर्महे');
  golden('labh-1a', 'lat', 'A', 'लभते लभेते लभन्ते | लभसे लभेथे लभध्वे | लभे लभावहे लभामहे');
  golden('da-3u', 'lat', 'P', 'ददाति दत्तः ददति | ददासि दत्थः दत्थ | ददामि दद्वः दद्मः');
});

test('golden: श्रु, ज्ञा, चुर् laṭ', () => {
  golden('sru-1p', 'lat', 'P', 'शृणोति शृणुतः शृण्वन्ति | शृणोषि शृणुथः शृणुथ | शृणोमि शृणुवः/शृण्वः शृणुमः/शृण्मः');
  golden('jna-9p', 'lat', 'P', 'जानाति जानीतः जानन्ति | जानासि जानीथः जानीथ | जानामि जानीवः जानीमः');
  golden('cur-10u', 'lat', 'P', 'चोरयति चोरयतः चोरयन्ति | चोरयसि चोरयथः चोरयथ | चोरयामि चोरयावः चोरयामः');
});

test('golden: a few more school paradigms (गम्, लिख्, सेव्, नी Ā, क्री, रुध् display forms)', () => {
  golden('gam-1p', 'lat', 'P', 'गच्छति गच्छतः गच्छन्ति | गच्छसि गच्छथः गच्छथ | गच्छामि गच्छावः गच्छामः');
  golden('likh-6p', 'lan', 'P', 'अलिखत् अलिखताम् अलिखन् | अलिखः अलिखतम् अलिखत | अलिखम् अलिखाव अलिखाम');
  golden('sev-1a', 'lot', 'A', 'सेवताम् सेवेताम् सेवन्ताम् | सेवस्व सेवेथाम् सेवध्वम् | सेवै सेवावहै सेवामहै');
  golden('labh-1a', 'vidhilin', 'A', 'लभेत लभेयाताम् लभेरन् | लभेथाः लभेयाथाम् लभेध्वम् | लभेय लभेवहि लभेमहि');
  golden('labh-1a', 'lan', 'A', 'अलभत अलभेताम् अलभन्त | अलभथाः अलभेथाम् अलभध्वम् | अलभे अलभावहि अलभामहि');
  golden('labh-1a', 'lrt', 'A', 'लप्स्यते लप्स्येते लप्स्यन्ते | लप्स्यसे लप्स्येथे लप्स्यध्वे | लप्स्ये लप्स्यावहे लप्स्यामहे');
  golden('kri-9u', 'lat', 'P', 'क्रीणाति क्रीणीतः क्रीणन्ति | क्रीणासि क्रीणीथः क्रीणीथ | क्रीणामि क्रीणीवः क्रीणीमः');
  golden('kr-8u', 'vidhilin', 'P', 'कुर्यात् कुर्याताम् कुर्युः | कुर्याः कुर्यातम् कुर्यात | कुर्याम् कुर्याव कुर्याम');
  golden('as-2p', 'vidhilin', 'P', 'स्यात् स्याताम् स्युः | स्याः स्यातम् स्यात | स्याम् स्याव स्याम');
  golden('as-2p', 'lot', 'P', 'अस्तु स्ताम् सन्तु | एधि स्तम् स्त | असानि असाव असाम');
  golden('da-3u', 'lat', 'A', 'दत्ते ददाते ददते | दत्से ददाथे दद्ध्वे | ददे दद्वहे दद्महे');
  golden('si-2a', 'lat', 'A', 'शेते शयाते शेरते | शेषे शयाथे शेध्वे | शये शेवहे शेमहे');
  golden('i-2p', 'lat', 'P', 'एति इतः यन्ति | एषि इथः इथ | एमि इवः इमः');
  golden('han-2p', 'lat', 'P', 'हन्ति हतः घ्नन्ति | हंसि हथः हथ | हन्मि हन्वः हन्मः');
  golden('bru-2u', 'lat', 'P', 'ब्रवीति ब्रूतः ब्रुवन्ति | ब्रवीषि ब्रूथः ब्रूथ | ब्रवीमि ब्रूवः ब्रूमः');
  golden('yuj-7u', 'lat', 'P', 'युनक्ति युङ्क्तः युञ्जन्ति | युनक्षि युङ्क्थः युङ्क्थ | युनज्मि युञ्ज्वः युञ्ज्मः');
  golden('grah-9u', 'lat', 'P', 'गृह्णाति गृह्णीतः गृह्णन्ति | गृह्णासि गृह्णीथः गृह्णीथ | गृह्णामि गृह्णीवः गृह्णीमः');
  golden('mr-6a', 'lat', 'A', 'म्रियते म्रियेते म्रियन्ते | म्रियसे म्रियेथे म्रियध्वे | म्रिये म्रियावहे म्रियामहे');
});

// ── grammatical spot checks ──────────────────────────────────────────────────

const first = (id: string, l: Lakara, p: Pada, pu: Purusha, va: Vacana): string | undefined => conj(must(id), l, p, pu, va)[0];

test('laṅ: augment अ before consonants, vṛddhi (आ ऐ औ आर्) on vowel-initial roots', () => {
  for (const [d, l, p, pu, va, forms] of cells()) {
    if (l !== 'lan') continue;
    const vowelInitial = /^[अ-औ]/u.test(d.dhatu);
    for (const f of forms) {
      if (vowelInitial) assert.match(f, /^[आऐऔ]/u, `${d.id} laṅ ${p} ${pu}.${va}: ${f}`);
      else assert.match(f, /^अ/u, `${d.id} laṅ ${p} ${pu}.${va}: ${f}`);
    }
  }
  assert.equal(first('path-1p', 'lan', 'P', 1, 1), 'अपठत्');
  assert.equal(first('gam-1p', 'lan', 'P', 1, 1), 'अगच्छत्');
  assert.equal(first('as-2p', 'lan', 'P', 1, 1), 'आसीत्');
  assert.equal(first('is-6p', 'lan', 'P', 1, 1), 'ऐच्छत्');
  assert.equal(first('iks-1a', 'lan', 'A', 1, 1), 'ऐक्षत');
  assert.equal(first('ap-5p', 'lan', 'P', 1, 1), 'आप्नोत्');
  assert.equal(first('kr-8u', 'lan', 'P', 1, 1), 'अकरोत्');
  assert.equal(first('drs-1p', 'lan', 'P', 1, 1), 'अपश्यत्');
});

test('loṭ madhyama ekavacana spot checks; तातङ् never displayed', () => {
  assert.equal(first('path-1p', 'lot', 'P', 2, 1), 'पठ');
  assert.equal(first('gam-1p', 'lot', 'P', 2, 1), 'गच्छ');
  assert.equal(first('kr-8u', 'lot', 'P', 2, 1), 'कुरु');
  assert.equal(first('da-3u', 'lot', 'P', 2, 1), 'देहि');
  assert.equal(first('sru-1p', 'lot', 'P', 2, 1), 'शृणु');
  assert.equal(first('jna-9p', 'lot', 'P', 2, 1), 'जानीहि');
  assert.equal(first('as-2p', 'lot', 'P', 2, 1), 'एधि');
  assert.equal(first('labh-1a', 'lot', 'A', 2, 1), 'लभस्व');
  assert.equal(first('bhu-1p', 'lot', 'P', 1, 1), 'भवतु');
  assert.equal(first('han-2p', 'lot', 'P', 2, 1), 'जहि');
  for (const [d, l, p, pu, va, forms] of cells()) {
    if (l !== 'lot' || forms.length === 0) continue;
    if (p === 'P' && va === 1 && pu <= 2) assert.doesNotMatch(forms[0] ?? '', /ात्$/u, `${d.id}: तातङ् form displayed in loṭ ${pu}.1`);
    if (p === 'P' && pu === 1 && va === 1) assert.match(forms[0] ?? '', /[तटधढ]ु$/u, `${d.id}: loṭ 3sg ${forms[0]}`);
  }
});

test('endings: laṭ / lṛṭ 3sg in -ति / -ते, lṛṭ has स्य / ष्य, vidhiliṅ shapes', () => {
  for (const d of DHATUS) {
    for (const p of padasOf(d)) {
      const end = p === 'P' ? /[तटधढ]ि$/u : /[तटधढ]े$/u;
      // display forms only: accepted alternates include the perfect-like आह / वेद sets
      const shown = (l: Lakara, pu: Purusha): string[] => conj(d, l, p, pu, 1).slice(0, 1);
      for (const l of ['lat', 'lrt'] as const) for (const f of shown(l, 1)) assert.match(f, end, `${d.id} ${l} ${p} 3sg ${f}`);
      for (const f of conj(d, 'lrt', p, 1, 1)) assert.match(f, /(स्य|ष्य)(ति|ते)$/u, `${d.id} lṛṭ ${f}`);
      for (const f of conj(d, 'vidhilin', p, 1, 1)) assert.match(f, p === 'P' ? /(ेत्|यात्)$/u : /(ेत|ीत)$/u, `${d.id} vidhiliṅ ${f}`);
      for (const f of shown('lat', 3)) assert.match(f, p === 'P' ? /मि$/u : /[ेै]$/u, `${d.id} laṭ 1sg ${f}`);
    }
  }
  assert.equal(first('gam-1p', 'lrt', 'P', 1, 1), 'गमिष्यति');
  assert.equal(first('drs-1p', 'lrt', 'P', 1, 1), 'द्रक्ष्यति');
  assert.equal(first('likh-6p', 'lrt', 'P', 1, 1), 'लेखिष्यति');
  assert.equal(first('stha-1p', 'lat', 'P', 1, 1), 'तिष्ठति');
  assert.equal(first('pa-1p', 'lat', 'P', 1, 1), 'पिबति');
  assert.equal(first('mr-6a', 'lrt', 'P', 1, 1), 'मरिष्यति');
  assert.deepEqual(conj(must('mr-6a'), 'lrt', 'A', 1, 1), []);
  assert.deepEqual(conj(must('stha-1p'), 'lat', 'A', 1, 1), [], 'तिष्ठते must not be offered for स्था');
  assert.deepEqual(conj(must('labh-1a'), 'lat', 'P', 1, 1), [], 'लभति must not exist');
});

test('kṛdanta shapes and spot checks', () => {
  for (const d of DHATUS) {
    for (const f of d.krdanta.ktva ?? []) assert.match(f, /्वा$/u, `${d.id} ktvā ${f}`);
    for (const f of d.krdanta.tumun ?? []) assert.match(f, /ुम्$/u, `${d.id} tumun ${f}`);
    for (const k of ['kta', 'ktavatu', 'shanac', 'tavya', 'aniyar'] as const) for (const f of d.krdanta[k] ?? []) assert.match(f, k === 'ktavatu' ? /वान्$/u : /ः$/u, `${d.id} ${k} ${f}`);
    for (const f of d.krdanta.tavya ?? []) assert.match(f, /व्यः$/u, `${d.id} tavya ${f}`);
    for (const f of d.krdanta.aniyar ?? []) assert.match(f, /[नण]ीयः$/u, `${d.id} anīyar ${f}`);
    for (const f of d.krdanta.shanac ?? []) assert.match(f, /[नण]ः$/u, `${d.id} śānac ${f}`);
    for (const f of d.krdanta.shatr ?? []) assert.match(f, /(न्|त्)$/u, `${d.id} śatṛ ${f}`);
    if (d.krdanta.shatr) assert.ok(d.forms.lat?.P, `${d.id}: śatṛ without parasmaipada`);
    if (d.krdanta.shanac) assert.ok(d.forms.lat?.A, `${d.id}: śānac without ātmanepada`);
    for (const l of d.lyap ?? []) assert.match(l.form, /य$/u, `${d.id} lyap ${l.form}`);
  }
  const k = must('gam-1p').krdanta;
  assert.deepEqual([k.ktva?.[0], k.tumun?.[0], k.kta?.[0], k.ktavatu?.[0], k.shatr?.[0], k.tavya?.[0], k.aniyar?.[0]], ['गत्वा', 'गन्तुम्', 'गतः', 'गतवान्', 'गच्छन्', 'गन्तव्यः', 'गमनीयः']);
  assert.equal(must('labh-1a').krdanta.shanac?.[0], 'लभमानः');
  assert.equal(must('kr-8u').krdanta.ktva?.[0], 'कृत्वा');
  assert.equal(must('drs-1p').krdanta.ktva?.[0], 'दृष्ट्वा');
  assert.equal(must('da-3u').krdanta.shatr?.[0], 'ददत्', 'no num after an abhyasta stem');
  const lyapOfGam = (must('gam-1p').lyap ?? []).filter((l) => l.upasarga === 'आ').map((l) => l.form);
  assert.deepEqual(new Set(lyapOfGam), new Set(['आगम्य', 'आगत्य']));
  assert.ok((must('stha-1p').lyap ?? []).some((l) => l.form === 'उत्थाय'));
});

test('levels are cumulative', () => {
  const l1 = dhatusForLevel(1);
  assert.ok(l1.length >= 30, `only ${l1.length} dhātus at L1`);
  assert.ok(l1.every((d) => d.level <= 1));
  assert.equal(dhatusForLevel(5).length, DHATUS.length);
  for (const id of ['bhu-1p', 'path-1p', 'gam-1p', 'as-2p', 'kr-8u', 'da-3u', 'sru-1p', 'jna-9p']) assert.ok(l1.some((d) => d.id === id), `${id} should be L1`);
});

// ── prefixed verbs ───────────────────────────────────────────────────────────

test('PREFIXED: shape, bases, and the forms the brief asks for', () => {
  assert.ok(PREFIXED.length >= 40, `only ${PREFIXED.length}`);
  assert.equal(new Set(PREFIXED.map((p) => p.id)).size, PREFIXED.length);
  assert.equal(new Set(PREFIXED.map((p) => p.lat3s)).size, PREFIXED.length);
  for (const p of PREFIXED) {
    assert.ok(dhatu(p.base), `${p.id}: base ${p.base}`);
    assert.ok(validateDeva(p.lat3s).ok && validateDeva(p.upasarga, { allowPunctuation: '+' }).ok, p.id);
    assert.match(p.lat3s, /(ति|ते)$/u, p.id);
    assert.ok(p.en.startsWith('to '), p.id);
    assert.ok(p.provenance.verifiedBy.some((t) => t.startsWith('attest:') || t.startsWith('oracle:')), `${p.id}: no attestation`);
  }
  const have = new Set(PREFIXED.map((p) => p.lat3s));
  for (const f of ['आगच्छति', 'उपविशति', 'उत्तिष्ठति', 'निर्गच्छति', 'प्रविशति', 'अनुभवति', 'आनयति', 'प्रक्षालयति', 'उद्घाटयति', 'स्वीकरोति', 'अवगच्छति', 'प्रतिवदति', 'विहरति', 'संहरति', 'आह्वयति', 'प्रणमति', 'निषीदति', 'प्राप्नोति', 'प्रतीक्षते', 'विक्रीणीते']) {
    assert.ok(have.has(f), `${f} missing from PREFIXED`);
  }
  assert.ok(prefixedForLevel(1).length >= 10);
});

test('PREFIXED: every laṭ 3sg is the deterministic join of its prefix with the pack’s own base form', () => {
  const specs = new Map(PREFIXED_SPECS.map((s) => [s.id, s]));
  for (const p of PREFIXED) {
    const spec = specs.get(p.id);
    assert.ok(spec, `${p.id}: not in the curated list`);
    const base = must(p.base);
    const baseForm = conj(base, 'lat', spec.pada, 1, 1)[0];
    assert.ok(baseForm, p.id);
    const joined = joinPrefix(spec.prefixes, devaToSlp1(baseForm), { baseId: p.base, nopadesha: (base.upadesha ?? '').startsWith('ण') });
    assert.equal(joined.form, devaToSlp1(p.lat3s), p.id);
  }
});

test('joinPrefix refuses what it does not know', () => {
  const ctx = { baseId: 'x', nopadesha: false };
  assert.throws(() => joinPrefix(['pra'], 'fcCati', ctx));
  assert.throws(() => joinPrefix(['upa'], 'eti', ctx));
  assert.throws(() => joinPrefix(['pari'], 'sevate', ctx));
  assert.throws(() => joinPrefix(['sam'], 'karoti', { baseId: 'kr-8u', nopadesha: false }));
  assert.deepEqual(joinPrefix(['ud'], 'tizWati', ctx), { form: 'uttizWati', plain: false });
  assert.deepEqual(joinPrefix(['ud'], 'sTAya', ctx), { form: 'utTAya', plain: false });
  assert.deepEqual(joinPrefix(['prati', 'A'], 'gacCati', ctx), { form: 'pratyAgacCati', plain: false });
  assert.deepEqual(joinPrefix(['pra'], 'namati', { baseId: 'nam-1p', nopadesha: true }), { form: 'praRamati', plain: false });
  assert.deepEqual(joinPrefix(['ni'], 'sIdati', { baseId: 'sad-1p', nopadesha: false }), { form: 'nizIdati', plain: false });
  assert.deepEqual(joinPrefix(['prati'], 'sIdati', { baseId: 'sad-1p', nopadesha: false }), { form: 'pratisIdati', plain: true });
});

// ── oracle re-verification (skipped when the reference datasets are not checked out) ───────

test('oracle: the shipped pack equals a fresh build from the reference datasets', { skip: oraclesAvailable() ? false : 'reference datasets not present (set SAMSKURU_ORACLES)' }, () => {
  const o = loadOracles();
  const built = buildAll(o);
  const byId = new Map(built.map((b) => [b.spec.id, b]));
  let forms = 0;
  for (const d of DHATUS) {
    const b = byId.get(d.id);
    assert.ok(b, `${d.id}: not in the curated list any more`);
    for (const l of LAKARAS) {
      for (const p of PADAS) {
        const shipped = d.forms[l]?.[p];
        const flat: string[][] | undefined = b.forms[l]?.[p];
        const fresh: string[][][] | undefined = flat ? [flat.slice(0, 3), flat.slice(3, 6), flat.slice(6, 9)] : undefined;
        assert.deepEqual(shipped, fresh, `${d.id} ${l} ${p}: pack differs from the oracles`);
        if (!shipped) continue;
        shipped.forEach((row, i) =>
          row.forEach((cell, j) => {
            const ev = b.evidence.get(`${l}.${p}.${i + 1}.${j + 1}`) ?? [];
            for (const f of cell) {
              forms++;
              const e = ev.find((x) => x.form === f);
              assert.ok(e && (e.b || e.c), `${d.id} ${l}.${p}.${i + 1}.${j + 1} ${f}: no independent confirmation`);
            }
          }),
        );
      }
    }
    // kṛdanta forms withheld after the independent audit (index.ts → WITHHELD_KRDANTA) are expected to be absent
    const expectedKrdanta: Record<string, unknown> = { ...b.krdanta };
    for (const k of WITHHELD_KRDANTA[d.id] ?? []) delete expectedKrdanta[k];
    assert.deepEqual(d.krdanta, expectedKrdanta, `${d.id}: kṛdanta differs from the oracles`);
    assert.deepEqual(d.evidence, { forms: b.stats.forms, sanskritverb: b.stats.byB, heritage: b.stats.byC }, `${d.id}: evidence counts`);
  }
  assert.ok(forms > 10000);
  const shippedBuilt = built.filter((b) => dhatu(b.spec.id));
  const pre = buildPrefixed(o, shippedBuilt);
  assert.deepEqual(
    PREFIXED.map((p) => [p.id, p.lat3s]),
    pre.accepted.map((p) => [p.id, p.lat3s]),
  );
  for (const d of DHATUS) assert.deepEqual(d.lyap ?? [], byId.get(d.id)?.lyap ?? [], `${d.id}: lyap`);
});
