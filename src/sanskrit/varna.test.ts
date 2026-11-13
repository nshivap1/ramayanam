import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRATYAHARA_NAMES, SHIVA_SUTRAS, STHANA_NAMES, VARNAS, isConsonant, isSavarna, isVowel, pratyahara, varna } from './varna';
import type { Sthana } from './varna';
import { devaToIast, devaToSlp1, slp1ToDeva, slp1ToIast, validateDeva } from './translit';

test('VARNAS: the varṇamālā in traditional order', () => {
  assert.equal(VARNAS.map((v) => v.slp1).join(''), 'aAiIuUfFxeEoOMHkKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzsh');
  assert.equal(VARNAS.length, 48);
  assert.equal(VARNAS.filter((v) => v.kind === 'svara').length, 13);
  assert.equal(VARNAS.filter((v) => v.kind === 'ayogavaha').length, 2);
  assert.equal(VARNAS.filter((v) => v.kind === 'vyanjana').length, 33);
  assert.equal(VARNAS.filter((v) => v.cls === 'sparsha').length, 25);
  assert.equal(VARNAS.filter((v) => v.cls === 'antahstha').length, 4);
  assert.equal(VARNAS.filter((v) => v.cls === 'ushman').length, 4);
  assert.equal(VARNAS.filter((v) => v.nasal === true).length, 5);
  assert.equal(new Set(VARNAS.map((v) => v.slp1)).size, 48);
});

test('VARNAS: script forms agree with the transliterator', () => {
  for (const v of VARNAS) {
    assert.equal(v.slp1.length, 1);
    if (v.kind === 'ayogavaha') {
      assert.equal(devaToSlp1(`अ${v.deva}`), `a${v.slp1}`);
      assert.equal(slp1ToIast(`a${v.slp1}`), `a${v.iast}`);
    } else {
      assert.equal(devaToSlp1(v.deva), v.kind === 'svara' ? v.slp1 : `${v.slp1}a`, v.deva);
      assert.equal(devaToIast(v.deva), v.kind === 'svara' ? v.iast : `${v.iast}a`, v.deva);
      assert.equal(varna(v.slp1), v);
    }
    assert.ok(v.sthana.length >= 1);
    for (const s of v.sthana) assert.ok(s in STHANA_NAMES);
  }
});

test('sthāna: the śikṣā statements', () => {
  const place = (chars: string, expected: Sthana[]): void => {
    for (const c of chars) assert.deepEqual(varna(c)?.sthana, expected, c);
  };
  place('aAkKgGhH', ['kantha']); // अकुहविसर्जनीयानां कण्ठः
  place('iIcCjJyS', ['talu']); // इचुयशानां तालु
  place('fFwWqQrz', ['murdha']); // ऋटुरषाणां मूर्धा
  place('xtTdDls', ['danta']); // ऌतुलसानां दन्ताः
  place('uUpPbB', ['oshtha']); // उपूपध्मानीयानामोष्ठौ
  place('eE', ['kanthatalu']); // एदैतोः कण्ठतालु
  place('oO', ['kanthoshtha']); // ओदौतोः कण्ठोष्ठम्
  place('v', ['dantoshtha']); // वकारस्य दन्तोष्ठम्
  place('M', ['nasika']); // नासिकानुस्वारस्य
  // ञमङणनानां नासिका च
  assert.deepEqual(varna('N')?.sthana, ['kantha', 'nasika']);
  assert.deepEqual(varna('Y')?.sthana, ['talu', 'nasika']);
  assert.deepEqual(varna('R')?.sthana, ['murdha', 'nasika']);
  assert.deepEqual(varna('n')?.sthana, ['danta', 'nasika']);
  assert.deepEqual(varna('m')?.sthana, ['oshtha', 'nasika']);
});

test('consonant features', () => {
  const rows: [string, 'ka' | 'ca' | 'wa' | 'ta' | 'pa'][] = [
    ['kKgGN', 'ka'],
    ['cCjJY', 'ca'],
    ['wWqQR', 'wa'],
    ['tTdDn', 'ta'],
    ['pPbBm', 'pa'],
  ];
  for (const [row, varga] of rows) {
    [...row].forEach((c, col) => {
      const v = varna(c);
      assert.ok(v !== undefined);
      assert.equal(v.varga, varga, c);
      assert.equal(v.cls, 'sparsha');
      assert.equal(v.ghosha, col >= 2, `ghoṣa ${c}`);
      assert.equal(v.mahaprana, col === 1 || col === 3, `mahāprāṇa ${c}`);
      assert.equal(v.nasal, col === 4, `nasal ${c}`);
    });
  }
  for (const c of 'yrlv') {
    const v = varna(c);
    assert.equal(v?.cls, 'antahstha');
    assert.equal(v?.ghosha, true);
    assert.equal(v?.mahaprana, false);
    assert.equal(v?.varga, undefined);
  }
  for (const c of 'Szs') {
    assert.equal(varna(c)?.cls, 'ushman');
    assert.equal(varna(c)?.ghosha, false);
    assert.equal(varna(c)?.mahaprana, true);
  }
  assert.equal(varna('h')?.cls, 'ushman');
  assert.equal(varna('h')?.ghosha, true);
  assert.equal(varna('h')?.mahaprana, true);
  // voiced consonants are exactly the haś pratyāhāra; voiceless exactly khar
  const voiced = VARNAS.filter((v) => v.ghosha === true).map((v) => v.slp1).sort();
  const voiceless = VARNAS.filter((v) => v.ghosha === false).map((v) => v.slp1).sort();
  assert.deepEqual(voiced, pratyahara('haS').sort());
  assert.deepEqual(voiceless, pratyahara('Kar').sort());
});

test('vowel features', () => {
  for (const c of 'aiufx') assert.equal(varna(c)?.length, 'hrasva', c);
  for (const c of 'AIUFeEoO') assert.equal(varna(c)?.length, 'dirgha', c);
  for (const v of VARNAS) if (v.kind !== 'svara') assert.equal(v.length, undefined);
});

test('varna / isVowel / isConsonant', () => {
  assert.equal(varna('k')?.deva, 'क');
  assert.equal(varna('S')?.iast, 'ś');
  assert.equal(varna('z')?.deva, 'ष');
  assert.equal(varna('B')?.mahaprana, true);
  for (const c of ['', 'ka', 'X', '~', "'", 'L', 'Z', '1', ' ', 'क']) assert.equal(varna(c), undefined, c);
  for (const c of 'aAiIuUfFxXeEoO') {
    assert.equal(isVowel(c), true, c);
    assert.equal(isConsonant(c), false, c);
  }
  for (const c of 'kKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzshL') {
    assert.equal(isConsonant(c), true, c);
    assert.equal(isVowel(c), false, c);
  }
  for (const c of ['M', 'H', '~', "'", '', ' ', 'ai', 'Z', 'V', '1', 'अ']) {
    assert.equal(isVowel(c), false, c);
    assert.equal(isConsonant(c), false, c);
  }
});

test('STHANA_NAMES', () => {
  const keys: Sthana[] = ['kantha', 'talu', 'murdha', 'danta', 'oshtha', 'nasika', 'kanthatalu', 'kanthoshtha', 'dantoshtha'];
  assert.deepEqual(Object.keys(STHANA_NAMES).sort(), [...keys].sort());
  for (const k of keys) {
    const n = STHANA_NAMES[k];
    assert.ok(validateDeva(n.sa).ok, n.sa);
    assert.equal(devaToIast(n.sa), n.iast, k);
    assert.ok(n.en.length > 0);
  }
  assert.equal(STHANA_NAMES.kantha.sa, 'कण्ठः');
  assert.equal(STHANA_NAMES.murdha.iast, 'mūrdhā');
});

test('SHIVA_SUTRAS', () => {
  assert.equal(SHIVA_SUTRAS.length, 14);
  assert.deepEqual(
    SHIVA_SUTRAS.map((s) => s.deva),
    ['अइउण्', 'ऋऌक्', 'एओङ्', 'ऐऔच्', 'हयवरट्', 'लण्', 'ञमङणनम्', 'झभञ्', 'घढधष्', 'जबगडदश्', 'खफछठथचटतव्', 'कपय्', 'शषसर्', 'हल्'],
  );
  SHIVA_SUTRAS.forEach((s, i) => {
    assert.equal(s.n, i + 1);
    // the Devanagari text is exactly the sounds followed by the marker
    const sounds = s.sounds.map((x) => slp1ToDeva(isVowel(x) ? x : `${x}a`)).join('');
    assert.equal(sounds + slp1ToDeva(s.it), s.deva, s.deva);
  });
  assert.equal(SHIVA_SUTRAS.map((s) => s.it).join(''), 'RkNcwRmYzSvyrl');
  // every vowel class and every consonant occurs; only h occurs twice
  const all = SHIVA_SUTRAS.flatMap((s) => s.sounds);
  assert.equal(all.length, 43);
  assert.equal(new Set(all).size, 42);
  assert.equal(all.filter((x) => x === 'h').length, 2);
  for (const c of 'kKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzsh') assert.ok(all.includes(c), c);
});

/** Hand-written expansions of all the traditional pratyāhāras. */
const PRATYAHARAS: Record<string, string> = {
  aR: 'a i u',
  ak: 'a i u f x',
  ac: 'a i u f x e o E O',
  aw: 'a i u f x e o E O h y v r',
  am: 'a i u f x e o E O h y v r l Y m N R n',
  aS: 'a i u f x e o E O h y v r l Y m N R n J B G Q D j b g q d',
  al: 'a i u f x e o E O h y v r l Y m N R n J B G Q D j b g q d K P C W T c w t k p S z s',
  ik: 'i u f x',
  ic: 'i u f x e o E O',
  iR: 'i u f x e o E O h y v r l',
  uk: 'u f x',
  eN: 'e o',
  ec: 'e o E O',
  Ec: 'E O',
  haS: 'h y v r l Y m N R n J B G Q D j b g q d',
  hal: 'h y v r l Y m N R n J B G Q D j b g q d K P C W T c w t k p S z s',
  yaR: 'y v r l',
  yam: 'y v r l Y m N R n',
  yaY: 'y v r l Y m N R n J B',
  yay: 'y v r l Y m N R n J B G Q D j b g q d K P C W T c w t k p',
  yar: 'y v r l Y m N R n J B G Q D j b g q d K P C W T c w t k p S z s',
  vaS: 'v r l Y m N R n J B G Q D j b g q d',
  val: 'v r l Y m N R n J B G Q D j b g q d K P C W T c w t k p S z s h',
  ral: 'r l Y m N R n J B G Q D j b g q d K P C W T c w t k p S z s h',
  may: 'm N R n J B G Q D j b g q d K P C W T c w t k p',
  Nam: 'N R n',
  Jaz: 'J B G Q D',
  JaS: 'J B G Q D j b g q d',
  Jay: 'J B G Q D j b g q d K P C W T c w t k p',
  Jar: 'J B G Q D j b g q d K P C W T c w t k p S z s',
  Jal: 'J B G Q D j b g q d K P C W T c w t k p S z s h',
  Baz: 'B G Q D',
  jaS: 'j b g q d',
  baS: 'b g q d',
  Kay: 'K P C W T c w t k p',
  Kar: 'K P C W T c w t k p S z s',
  Cav: 'C W T c w t',
  cay: 'c w t k p',
  car: 'c w t k p S z s',
  Sar: 'S z s',
  Sal: 'S z s h',
  Yam: 'Y m N R n',
};

test('pratyahara: all the traditional pratyāhāras', () => {
  assert.deepEqual([...PRATYAHARA_NAMES].sort(), Object.keys(PRATYAHARAS).sort());
  assert.equal(PRATYAHARA_NAMES.length, 42);
  for (const [name, sounds] of Object.entries(PRATYAHARAS)) {
    assert.deepEqual(pratyahara(name), sounds.split(' '), name);
  }
});

test('pratyahara: aṇ / iṇ readings and savarṇa expansion', () => {
  assert.deepEqual(pratyahara('aR'), ['a', 'i', 'u']);
  assert.deepEqual(pratyahara('aR', { marker: 1 }), ['a', 'i', 'u']);
  assert.deepEqual(pratyahara('aR', { marker: 2 }), 'a i u f x e o E O h y v r l'.split(' '));
  assert.deepEqual(pratyahara('iR'), 'i u f x e o E O h y v r l'.split(' '));
  assert.deepEqual(pratyahara('iR', { marker: 1 }), ['i', 'u']);
  assert.deepEqual(pratyahara('yaR', { marker: 2 }), ['y', 'v', 'r', 'l']);
  assert.deepEqual(pratyahara('ac', { expandSavarna: true }), 'a A i I u U f F x e o E O'.split(' '));
  assert.deepEqual(pratyahara('ak', { expandSavarna: true }), 'a A i I u U f F x'.split(' '));
  assert.deepEqual(pratyahara('ik', { expandSavarna: true }), 'i I u U f F x'.split(' '));
  assert.deepEqual(pratyahara('eN', { expandSavarna: true }), ['e', 'o']);
  assert.deepEqual(pratyahara('hal', { expandSavarna: true }), pratyahara('hal'));
  // al = ac + hal, with nothing repeated
  assert.deepEqual(pratyahara('al'), [...pratyahara('ac'), ...pratyahara('hal')]);
  assert.equal(new Set(pratyahara('al')).size, pratyahara('al').length);
  assert.equal(pratyahara('hal').length, 33);
  assert.equal(pratyahara('al').length, 42);
});

test('pratyahara: names that cannot be formed give []', () => {
  for (const bad of ['', 'a', 'ka', 'xyz', 'aa', 'ca', 'Ra', 'ack', 'kac', 'lak', 'hak', 'ya', 'yiR', 'k', 'aX', 'ic1', 'ac ', 'AC', 'अच्']) {
    assert.deepEqual(pratyahara(bad), [], JSON.stringify(bad));
  }
});

test('isSavarna', () => {
  const yes: [string, string][] = [
    ['a', 'a'], ['a', 'A'], ['A', 'a'], ['i', 'I'], ['u', 'U'], ['f', 'F'], ['f', 'x'], ['x', 'F'], ['e', 'e'], ['E', 'E'],
    ['o', 'o'], ['O', 'O'], ['k', 'K'], ['k', 'g'], ['k', 'G'], ['k', 'N'], ['c', 'Y'], ['w', 'R'], ['t', 'n'], ['p', 'm'],
    ['d', 'D'], ['b', 'B'], ['y', 'y'], ['r', 'r'], ['l', 'l'], ['v', 'v'], ['S', 'S'], ['z', 'z'], ['s', 's'], ['h', 'h'],
  ];
  const no: [string, string][] = [
    ['a', 'i'], ['a', 'e'], ['e', 'E'], ['o', 'O'], ['e', 'i'], ['o', 'u'], ['i', 'u'], ['f', 'r'], ['x', 'l'], ['i', 'y'],
    ['u', 'v'], ['a', 'h'], ['i', 'S'], ['i', 'c'], ['u', 'p'], ['k', 'c'], ['t', 'w'], ['n', 'R'], ['n', 'm'], ['S', 'z'],
    ['z', 's'], ['S', 'c'], ['s', 't'], ['h', 'k'], ['y', 'c'], ['l', 't'], ['r', 'w'], ['v', 'p'], ['M', 'M'], ['H', 'H'],
    ['M', 'm'], ['H', 'h'], ['', ''], ['a', ''], ['ka', 'k'], ['Z', 'Z'],
  ];
  for (const [a, b] of yes) {
    assert.equal(isSavarna(a, b), true, `${a} ~ ${b}`);
    assert.equal(isSavarna(b, a), true, `${b} ~ ${a}`);
  }
  for (const [a, b] of no) {
    assert.equal(isSavarna(a, b), false, `${a} !~ ${b}`);
    assert.equal(isSavarna(b, a), false, `${b} !~ ${a}`);
  }
  // savarṇa is an equivalence relation on the varṇamālā (reflexive on sounds, symmetric, transitive)
  const sounds = VARNAS.filter((v) => v.kind !== 'ayogavaha').map((v) => v.slp1);
  for (const a of sounds) {
    assert.equal(isSavarna(a, a), true, a);
    for (const b of sounds) {
      if (!isSavarna(a, b)) continue;
      for (const c of sounds) if (isSavarna(b, c)) assert.equal(isSavarna(a, c), true, `${a} ${b} ${c}`);
    }
  }
});
