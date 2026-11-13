import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateDeva } from '../../sanskrit/translit';
import type { Vacana, Vibhakti } from '../types';
import { SHABDA, form, meta, shabda, shabdaForLevel } from './index';

const allForms = (): { id: string; cell: string; f: string }[] => {
  const out: { id: string; cell: string; f: string }[] = [];
  for (const p of SHABDA) p.forms.forEach((row, v) => row.forEach((cell, n) => cell.forEach((f) => out.push({ id: p.id, cell: `${v + 1}.${n + 1}`, f }))));
  return out;
};

test('pack size and meta', () => {
  assert.ok(SHABDA.length >= 60, `expected at least 60 paradigms, got ${SHABDA.length}`);
  assert.equal(meta.count, SHABDA.length);
  assert.equal(meta.id, 'shabda');
});

test('ids are unique ascii slugs', () => {
  const seen = new Set<string>();
  for (const p of SHABDA) {
    assert.match(p.id, /^[a-z]+(-[mfn])?$/, p.id);
    assert.ok(!seen.has(p.id), `duplicate id ${p.id}`);
    seen.add(p.id);
    assert.equal(shabda(p.id), p);
  }
  assert.equal(shabda('no-such-paradigm'), undefined);
});

test('shape: 8 vibhaktis × 3 vacanas, each cell an array of distinct non-empty strings', () => {
  for (const p of SHABDA) {
    assert.equal(p.forms.length, 8, p.id);
    for (const row of p.forms) {
      assert.equal(row.length, 3, p.id);
      for (const cell of row) {
        assert.ok(Array.isArray(cell), p.id);
        assert.equal(new Set(cell).size, cell.length, `${p.id}: duplicate form in a cell`);
        for (const f of cell) assert.ok(typeof f === 'string' && f.length > 0, p.id);
      }
    }
    assert.ok(p.provenance.verifiedBy.length >= 2, `${p.id}: needs two verification sources`);
    assert.ok(p.provenance.source.length > 0);
    assert.notEqual(p.provenance.humanReviewed, true, `${p.id}: only a human reviewer may set humanReviewed`);
    assert.ok(p.en.length > 0 && p.anta.length > 0);
    assert.ok(p.level >= 1 && p.level <= 5, `${p.id}: level`);
  }
});

test('every Sanskrit string is valid NFC Devanagari', () => {
  for (const p of SHABDA) {
    for (const s of [p.stem, p.citation, p.anta]) {
      assert.equal(s, s.normalize('NFC'));
      const r = validateDeva(s);
      assert.ok(r.ok, `${p.id}: ${s}: ${r.errors.join('; ')}`);
    }
  }
  for (const { id, cell, f } of allForms()) {
    assert.equal(f, f.normalize('NFC'), `${id} ${cell}`);
    const r = validateDeva(f);
    assert.ok(r.ok, `${id} ${cell} ${f}: ${r.errors.join('; ')}`);
    assert.ok(!/[\s\-।॥०-९ऽ]/.test(f), `${id} ${cell} ${f}: a form is a single word`);
  }
});

test('spelling conventions: class nasal before stops, final म्, no voiced-final sandhi doublets, no हे', () => {
  for (const { id, cell, f } of allForms()) {
    assert.ok(!/ं[क-म]/.test(f), `${id} ${cell} ${f}: anusvāra before a stop (use the class nasal)`);
    assert.ok(!f.endsWith('ं'), `${id} ${cell} ${f}: word-final anusvāra (use म्)`);
    assert.ok(!/[गदबड]्$/.test(f), `${id} ${cell} ${f}: voiced-final sandhi variant must not be listed`);
    assert.ok(!f.startsWith('हे'), `${id} ${cell} ${f}`);
  }
});

test('citation is the first nominative form; stem carries no case ending', () => {
  for (const p of SHABDA) {
    const nom = p.forms[0]![0]![0] ?? p.forms[0]![1]![0] ?? p.forms[0]![2]![0];
    assert.equal(p.citation, nom, p.id);
  }
  assert.equal(shabda('rama-m')!.citation, 'रामः');
  assert.equal(shabda('dvi-m')!.citation, 'द्वौ');
  assert.equal(shabda('tri-f')!.citation, 'तिस्रः');
  assert.equal(shabda('ap-f')!.citation, 'आपः');
  assert.equal(shabda('asmad')!.citation, 'अहम्');
});

test('universal syncretisms hold for the display forms', () => {
  for (const p of SHABDA) {
    const d = (v: number, n: number): string | undefined => p.forms[v - 1]![n - 1]![0];
    // dual: 3 = 4 = 5 and 6 = 7
    assert.equal(d(3, 2), d(4, 2), `${p.id}: 3.2 vs 4.2`);
    assert.equal(d(4, 2), d(5, 2), `${p.id}: 4.2 vs 5.2`);
    assert.equal(d(6, 2), d(7, 2), `${p.id}: 6.2 vs 7.2`);
    // dual: 1 = 2 (not the personal pronouns: आवाम् / युवाम् happen to agree as well)
    assert.equal(d(1, 2), d(2, 2), `${p.id}: 1.2 vs 2.2`);
    if (!(p.kind === 'pronoun' && p.genderless)) {
      // plural: 4 = 5 ; singular 5 = 6 except a-stems and pronouns
      assert.equal(d(4, 3), d(5, 3), `${p.id}: 4.3 vs 5.3`);
    }
    if (p.gender === 'n' && !p.genderless) {
      assert.equal(d(1, 1), d(2, 1), `${p.id}: neuter 1.1 vs 2.1`);
      assert.equal(d(1, 3), d(2, 3), `${p.id}: neuter 1.3 vs 2.3`);
    }
    if (p.kind === 'noun' || p.kind === 'adjective') {
      // vocative dual / plural = nominative dual / plural
      assert.deepEqual(p.forms[7]![1], p.forms[0]![1], `${p.id}: 8.2 vs 1.2`);
      assert.deepEqual(p.forms[7]![2], p.forms[0]![2], `${p.id}: 8.3 vs 1.3`);
    }
  }
});

test('cells that do not exist are empty: pronoun / numeral vocatives, dual-only and plural-only words', () => {
  for (const p of SHABDA) {
    if (p.kind === 'pronoun' || p.kind === 'numeral') for (const cell of p.forms[7]!) assert.deepEqual(cell, [], `${p.id}: vocative`);
    else for (const [n, cell] of p.forms[7]!.entries()) if (p.id !== 'ap-f' || n === 2) assert.ok(cell.length > 0, `${p.id}: vocative ${n + 1} missing`);
  }
  for (const id of ['dvi-m', 'dvi-f', 'dvi-n']) {
    const p = shabda(id)!;
    for (let v = 0; v < 7; v++) {
      assert.deepEqual(p.forms[v]![0], [], `${id} sg`);
      assert.equal(p.forms[v]![1]!.length, 1, `${id} du`);
      assert.deepEqual(p.forms[v]![2], [], `${id} pl`);
    }
  }
  for (const id of ['tri-m', 'tri-f', 'tri-n', 'chatur-m', 'chatur-f', 'chatur-n', 'panchan', 'shash', 'saptan', 'ashtan', 'navan', 'dashan', 'kati', 'ap-f']) {
    const p = shabda(id)!;
    for (let v = 0; v < 7; v++) {
      assert.deepEqual(p.forms[v]![0], [], `${id} sg`);
      assert.deepEqual(p.forms[v]![1], [], `${id} du`);
      assert.ok(p.forms[v]![2]!.length >= 1, `${id} pl`);
    }
  }
  for (const id of ['eka-m', 'eka-f', 'eka-n']) for (let v = 0; v < 7; v++) assert.ok(shabda(id)!.forms[v]![0]!.length === 1, `${id} sg`);
  // every other paradigm is complete in vibhaktis 1–7
  const defective = new Set(['dvi-m', 'dvi-f', 'dvi-n', 'tri-m', 'tri-f', 'tri-n', 'chatur-m', 'chatur-f', 'chatur-n', 'panchan', 'shash', 'saptan', 'ashtan', 'navan', 'dashan', 'kati', 'ap-f']);
  for (const p of SHABDA) {
    if (defective.has(p.id)) continue;
    for (let v = 0; v < 7; v++) for (let n = 0; n < 3; n++) assert.ok(p.forms[v]![n]!.length >= 1, `${p.id}: ${v + 1}.${n + 1} is empty`);
  }
});

test('form() and shabdaForLevel()', () => {
  const rama = shabda('rama-m')!;
  assert.deepEqual(form(rama, 3, 1), ['रामेण']);
  assert.deepEqual(form(rama, 6, 3), ['रामाणाम्']);
  assert.deepEqual(form(shabda('tad-m')!, 8, 1), []);
  assert.deepEqual(form(shabda('mati-f')!, 4, 1), ['मत्यै', 'मतये']);
  for (const p of SHABDA) for (let v = 1; v <= 8; v++) for (let n = 1; n <= 3; n++) assert.equal(form(p, v as Vibhakti, n as Vacana), p.forms[v - 1]![n - 1]);
  let prev = 0;
  for (const level of [0, 1, 2, 3, 4, 5] as const) {
    const xs = shabdaForLevel(level);
    assert.ok(xs.length >= prev, 'cumulative');
    assert.ok(xs.every((p) => p.level <= level));
    prev = xs.length;
  }
  assert.equal(shabdaForLevel(0).length, 0);
  assert.equal(shabdaForLevel(5).length, SHABDA.length);
  const l1 = new Set(shabdaForLevel(1).map((p) => p.id));
  for (const id of ['rama-m', 'balaka-m', 'phala-n', 'lata-f', 'nadi-f', 'tad-m', 'tad-f', 'tad-n', 'etad-m', 'kim-m', 'asmad', 'bhavat-m', 'bhavati-f']) assert.ok(l1.has(id), `${id} should be met at level 1`);
});

test('coverage: the paradigm families the curriculum needs are present', () => {
  const required = [
    'rama-m', 'balaka-m', 'deva-m', 'vriksha-m', 'phala-n', 'vana-n', 'pustaka-n', 'mitra-n',
    'rama-f', 'lata-f', 'balika-f', 'mala-f',
    'hari-m', 'muni-m', 'kavi-m', 'mati-f', 'buddhi-f', 'bhumi-f', 'vari-n',
    'nadi-f', 'devi-f', 'janani-f', 'stri-f', 'shri-f', 'lakshmi-f',
    'guru-m', 'sadhu-m', 'shishu-m', 'dhenu-f', 'madhu-n', 'vastu-n', 'vadhu-f', 'bhu-f',
    'pitri-m', 'bhratri-m', 'matri-f', 'svasri-f', 'kartri-m', 'datri-m', 'netri-m', 'go-m', 'go-f', 'nau-f',
    'rajan-m', 'atman-m', 'naman-n', 'karman-n', 'manas-n', 'chandramas-m', 'vac-f', 'marut-m', 'jagat-n', 'bhagavat-m',
    'gacchat-m', 'mahat-m', 'mahat-n', 'vidvas-m', 'gunin-m', 'svamin-m', 'yogin-m', 'dish-f', 'pathin-m', 'suhrid-m', 'ashis-f',
    'tad-m', 'tad-f', 'tad-n', 'etad-m', 'etad-f', 'etad-n', 'yad-m', 'yad-f', 'yad-n', 'kim-m', 'kim-f', 'kim-n',
    'idam-m', 'idam-f', 'idam-n', 'adas-m', 'adas-f', 'adas-n', 'sarva-m', 'sarva-f', 'sarva-n', 'anya-m', 'anya-f', 'anya-n',
    'bhavat-m', 'bhavati-f', 'asmad', 'yushmad',
    'eka-m', 'eka-f', 'eka-n', 'dvi-m', 'dvi-f', 'dvi-n', 'tri-m', 'tri-f', 'tri-n', 'chatur-m', 'chatur-f', 'chatur-n',
    'panchan', 'shash', 'saptan', 'ashtan', 'navan', 'dashan',
  ];
  for (const id of required) assert.ok(shabda(id), `missing paradigm ${id}`);
  const g = (id: string): string => shabda(id)!.gender + (shabda(id)!.genderless ? '*' : '');
  assert.equal(g('asmad'), 'm*');
  assert.equal(g('yushmad'), 'm*');
  assert.equal(g('nadi-f'), 'f');
});

test('ṇatva spot checks (रामेण but देवेन …)', () => {
  const f1 = (id: string, v: Vibhakti, n: Vacana): string => form(shabda(id)!, v, n)[0]!;
  const cases: [string, Vibhakti, Vacana, string][] = [
    ['rama-m', 3, 1, 'रामेण'], ['rama-m', 6, 3, 'रामाणाम्'], ['rama-m', 2, 3, 'रामान्'],
    ['deva-m', 3, 1, 'देवेन'], ['deva-m', 6, 3, 'देवानाम्'],
    ['balaka-m', 3, 1, 'बालकेन'], ['balaka-m', 6, 3, 'बालकानाम्'],
    ['vriksha-m', 3, 1, 'वृक्षेण'], ['vriksha-m', 6, 3, 'वृक्षाणाम्'],
    ['nara-m', 3, 1, 'नरेण'], ['jana-m', 3, 1, 'जनेन'],
    ['phala-n', 1, 3, 'फलानि'], ['vana-n', 3, 1, 'वनेन'], ['vana-n', 1, 3, 'वनानि'],
    ['mitra-n', 1, 3, 'मित्राणि'], ['mitra-n', 3, 1, 'मित्रेण'], ['mitra-n', 6, 3, 'मित्राणाम्'],
    ['pushpa-n', 3, 1, 'पुष्पेण'], ['pushpa-n', 1, 3, 'पुष्पाणि'], ['pushpa-n', 6, 3, 'पुष्पाणाम्'],
    ['pustaka-n', 1, 3, 'पुस्तकानि'], ['pustaka-n', 3, 1, 'पुस्तकेन'],
    ['rama-f', 6, 3, 'रमाणाम्'], ['lata-f', 6, 3, 'लतानाम्'], ['balika-f', 6, 3, 'बालिकानाम्'],
    ['hari-m', 3, 1, 'हरिणा'], ['hari-m', 6, 3, 'हरीणाम्'], ['muni-m', 3, 1, 'मुनिना'], ['kavi-m', 6, 3, 'कवीनाम्'],
    ['ratri-f', 6, 3, 'रात्रीणाम्'], ['mati-f', 6, 3, 'मतीनाम्'],
    ['vari-n', 3, 1, 'वारिणा'], ['vari-n', 1, 2, 'वारिणी'], ['vari-n', 1, 3, 'वारीणि'], ['vari-n', 6, 3, 'वारीणाम्'],
    ['nadi-f', 6, 3, 'नदीनाम्'], ['nari-f', 6, 3, 'नारीणाम्'], ['stri-f', 6, 3, 'स्त्रीणाम्'], ['lakshmi-f', 6, 3, 'लक्ष्मीणाम्'],
    ['guru-m', 3, 1, 'गुरुणा'], ['guru-m', 6, 3, 'गुरूणाम्'], ['sadhu-m', 3, 1, 'साधुना'], ['shishu-m', 6, 3, 'शिशूनाम्'],
    ['madhu-n', 3, 1, 'मधुना'], ['ashru-n', 3, 1, 'अश्रुणा'], ['ashru-n', 1, 3, 'अश्रूणि'],
    ['pitri-m', 6, 3, 'पितॄणाम्'], ['matri-f', 6, 3, 'मातॄणाम्'], ['kartri-m', 6, 3, 'कर्तॄणाम्'], ['netri-m', 6, 3, 'नेतॄणाम्'],
    ['karman-n', 3, 1, 'कर्मणा'], ['karman-n', 1, 3, 'कर्माणि'], ['naman-n', 3, 1, 'नाम्ना'], ['janman-n', 3, 1, 'जन्मना'],
    ['brahman-n', 7, 1, 'ब्रह्मणि'], ['brahman-m', 1, 2, 'ब्रह्माणौ'], ['atman-m', 3, 1, 'आत्मना'], ['rajan-m', 3, 1, 'राज्ञा'],
    ['pakshin-m', 1, 3, 'पक्षिणः'], ['mantrin-m', 3, 1, 'मन्त्रिणा'], ['gunin-m', 3, 1, 'गुणिना'], ['yogin-m', 1, 3, 'योगिनः'],
    ['sarva-m', 3, 1, 'सर्वेण'], ['sarva-n', 1, 3, 'सर्वाणि'], ['anya-m', 3, 1, 'अन्येन'],
    ['tri-m', 6, 3, 'त्रयाणाम्'], ['tri-n', 1, 3, 'त्रीणि'], ['chatur-m', 6, 3, 'चतुर्णाम्'], ['shash', 6, 3, 'षण्णाम्'],
  ];
  for (const [id, v, n, expected] of cases) assert.equal(f1(id, v, n), expected, `${id} ${v}.${n}`);
});

test('ṣatva and internal sandhi spot checks', () => {
  const f = (id: string, v: Vibhakti, n: Vacana): readonly string[] => form(shabda(id)!, v, n);
  assert.deepEqual(f('rama-m', 7, 3), ['रामेषु']);
  assert.deepEqual(f('hari-m', 7, 3), ['हरिषु']);
  assert.deepEqual(f('guru-m', 7, 3), ['गुरुषु']);
  assert.deepEqual(f('netri-m', 7, 3), ['नेतृषु']);
  assert.deepEqual(f('stri-f', 7, 3), ['स्त्रीषु']);
  assert.deepEqual(f('rama-f', 7, 3), ['रमासु']);
  assert.deepEqual(f('rajan-m', 7, 3), ['राजसु']);
  assert.deepEqual(f('karman-n', 7, 3), ['कर्मसु']);
  assert.deepEqual(f('manas-n', 7, 3), ['मनःसु', 'मनस्सु']);
  assert.deepEqual(f('dhanus-n', 7, 3), ['धनुःषु', 'धनुष्षु']);
  assert.deepEqual(f('vac-f', 7, 3), ['वाक्षु']);
  assert.deepEqual(f('vac-f', 3, 2), ['वाग्भ्याम्']);
  assert.deepEqual(f('dish-f', 1, 1), ['दिक्']);
  assert.deepEqual(f('marut-m', 3, 3), ['मरुद्भिः']);
  assert.deepEqual(f('manas-n', 3, 2), ['मनोभ्याम्']);
  assert.deepEqual(f('manas-n', 1, 3), ['मनांसि']);
  assert.deepEqual(f('vidvas-m', 3, 1), ['विदुषा']);
  assert.deepEqual(f('vidvas-m', 1, 1), ['विद्वान्']);
  assert.deepEqual(f('gacchat-m', 1, 1), ['गच्छन्']);
  assert.deepEqual(f('gacchat-m', 2, 1), ['गच्छन्तम्']);
  assert.deepEqual(f('gacchat-m', 2, 3), ['गच्छतः']);
  assert.deepEqual(f('bhagavat-m', 1, 1), ['भगवान्']);
  assert.deepEqual(f('mahat-m', 1, 2), ['महान्तौ']);
  assert.deepEqual(f('pathin-m', 1, 1), ['पन्थाः']);
  assert.deepEqual(f('pathin-m', 2, 3), ['पथः']);
  assert.deepEqual(f('ashis-f', 1, 1), ['आशीः']);
  assert.deepEqual(f('ashis-f', 3, 2), ['आशीर्भ्याम्']);
  assert.deepEqual(f('go-f', 2, 1), ['गाम्']);
  assert.deepEqual(f('nau-f', 3, 1), ['नावा']);
});

test('optional forms (vikalpa) are present, conventional form first', () => {
  const f = (id: string, v: Vibhakti, n: Vacana): readonly string[] => form(shabda(id)!, v, n);
  assert.deepEqual(f('mati-f', 4, 1), ['मत्यै', 'मतये']);
  assert.deepEqual(f('mati-f', 5, 1), ['मत्याः', 'मतेः']);
  assert.deepEqual(f('mati-f', 6, 1), ['मत्याः', 'मतेः']);
  assert.deepEqual(f('mati-f', 7, 1), ['मत्याम्', 'मतौ']);
  assert.deepEqual(f('dhenu-f', 4, 1), ['धेन्वै', 'धेनवे']);
  assert.deepEqual(f('dhenu-f', 7, 1), ['धेन्वाम्', 'धेनौ']);
  assert.deepEqual(f('naman-n', 7, 1), ['नाम्नि', 'नामनि']);
  assert.deepEqual(f('naman-n', 1, 2), ['नाम्नी', 'नामनी']);
  assert.deepEqual(f('naman-n', 8, 1), ['नाम', 'नामन्']);
  assert.deepEqual(f('rajan-m', 7, 1), ['राज्ञि', 'राजनि']);
  assert.deepEqual(f('stri-f', 2, 1), ['स्त्रियम्', 'स्त्रीम्']);
  assert.deepEqual(f('stri-f', 2, 3), ['स्त्रियः', 'स्त्रीः']);
  assert.deepEqual(f('shri-f', 6, 3), ['श्रीणाम्', 'श्रियाम्']);
  assert.deepEqual(f('shri-f', 4, 1), ['श्रियै', 'श्रिये']);
  assert.deepEqual(f('bhu-f', 7, 1), ['भुवाम्', 'भुवि']);
  assert.deepEqual(f('etad-m', 2, 1), ['एतम्', 'एनम्']);
  assert.deepEqual(f('idam-m', 3, 1), ['अनेन', 'एनेन']);
  assert.deepEqual(f('ashtan', 1, 3), ['अष्ट', 'अष्टौ']);
  assert.deepEqual(f('ashtan', 3, 3), ['अष्टभिः', 'अष्टाभिः']);
  assert.deepEqual(f('ashtan', 6, 3), ['अष्टानाम्']);
  assert.deepEqual(f('asmad', 2, 1), ['माम्', 'मा']);
  assert.deepEqual(f('asmad', 4, 1), ['मह्यम्', 'मे']);
  assert.deepEqual(f('asmad', 6, 3), ['अस्माकम्', 'नः']);
  assert.deepEqual(f('yushmad', 2, 1), ['त्वाम्', 'त्वा']);
  assert.deepEqual(f('yushmad', 6, 1), ['तव', 'ते']);
  assert.deepEqual(f('yushmad', 6, 2), ['युवयोः', 'वाम्']);
  assert.deepEqual(f('yushmad', 4, 3), ['युष्मभ्यम्', 'वः']);
});

test('numerals agree in gender as taught (द्वौ / द्वे, त्रयः / तिस्रः / त्रीणि, चत्वारः / चतस्रः / चत्वारि)', () => {
  const f1 = (id: string, v: Vibhakti, n: Vacana): string | undefined => form(shabda(id)!, v, n)[0];
  assert.equal(f1('eka-m', 1, 1), 'एकः');
  assert.equal(f1('eka-f', 1, 1), 'एका');
  assert.equal(f1('eka-n', 1, 1), 'एकम्');
  assert.equal(f1('eka-m', 4, 1), 'एकस्मै');
  assert.equal(f1('dvi-m', 1, 2), 'द्वौ');
  assert.equal(f1('dvi-f', 1, 2), 'द्वे');
  assert.equal(f1('dvi-n', 1, 2), 'द्वे');
  assert.equal(f1('dvi-m', 6, 2), 'द्वयोः');
  assert.equal(f1('tri-m', 1, 3), 'त्रयः');
  assert.equal(f1('tri-f', 1, 3), 'तिस्रः');
  assert.equal(f1('tri-n', 1, 3), 'त्रीणि');
  assert.equal(f1('tri-m', 2, 3), 'त्रीन्');
  assert.equal(f1('tri-f', 6, 3), 'तिसृणाम्');
  assert.equal(f1('chatur-m', 1, 3), 'चत्वारः');
  assert.equal(f1('chatur-m', 2, 3), 'चतुरः');
  assert.equal(f1('chatur-f', 1, 3), 'चतस्रः');
  assert.equal(f1('chatur-n', 1, 3), 'चत्वारि');
  assert.equal(f1('panchan', 1, 3), 'पञ्च');
  assert.equal(f1('panchan', 6, 3), 'पञ्चानाम्');
  assert.equal(f1('shash', 1, 3), 'षट्');
  assert.equal(f1('shash', 3, 3), 'षड्भिः');
  assert.equal(f1('saptan', 7, 3), 'सप्तसु');
  assert.equal(f1('navan', 3, 3), 'नवभिः');
  assert.equal(f1('dashan', 4, 3), 'दशभ्यः');
});
