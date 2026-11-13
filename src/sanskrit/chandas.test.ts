import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METERS, checkAnustubh, ganas, identifyVerse, matchMeter, scanLine, weights } from './chandas';
import { countAksharas, splitAksharas } from './akshara';
import { devaToSlp1, validateDeva } from './translit';
import { WORDS } from './testdata';

// ---------------------------------------------------------------------------
// Verses (public-domain classical texts), one pāda per string.
// ---------------------------------------------------------------------------

const ANUSTUBH: Record<string, [string, string, string, string]> = {
  'Gītā 2.47': ['कर्मण्येवाधिकारस्ते', 'मा फलेषु कदाचन', 'मा कर्मफलहेतुर्भूः', 'मा ते सङ्गोऽस्त्वकर्मणि'],
  'Gītā 4.7': ['यदा यदा हि धर्मस्य', 'ग्लानिर्भवति भारत', 'अभ्युत्थानमधर्मस्य', 'तदात्मानं सृजाम्यहम्'],
  'Gītā 4.8': ['परित्राणाय साधूनां', 'विनाशाय च दुष्कृताम्', 'धर्मसंस्थापनार्थाय', 'सम्भवामि युगे युगे'],
  'Gītā 1.1': ['धर्मक्षेत्रे कुरुक्षेत्रे', 'समवेता युयुत्सवः', 'मामकाः पाण्डवाश्चैव', 'किमकुर्वत सञ्जय'],
  'Gītā 18.66': ['सर्वधर्मान्परित्यज्य', 'मामेकं शरणं व्रज', 'अहं त्वा सर्वपापेभ्यो', 'मोक्षयिष्यामि मा शुचः'],
  'Gītā 2.23': ['नैनं छिन्दन्ति शस्त्राणि', 'नैनं दहति पावकः', 'न चैनं क्लेदयन्त्यापो', 'न शोषयति मारुतः'],
  'Gītā 6.5': ['उद्धरेदात्मनात्मानं', 'नात्मानमवसादयेत्', 'आत्मैव ह्यात्मनो बन्धुः', 'आत्मैव रिपुरात्मनः'],
  'Gītā 9.22': ['अनन्याश्चिन्तयन्तो मां', 'ये जनाः पर्युपासते', 'तेषां नित्याभियुक्तानां', 'योगक्षेमं वहाम्यहम्'],
  'Gītā 18.78': ['यत्र योगेश्वरः कृष्णो', 'यत्र पार्थो धनुर्धरः', 'तत्र श्रीर्विजयो भूतिः', 'ध्रुवा नीतिर्मतिर्मम'],
  'Raghuvaṃśa 1.1': ['वागर्थाविव संपृक्तौ', 'वागर्थप्रतिपत्तये', 'जगतः पितरौ वन्दे', 'पार्वतीपरमेश्वरौ'],
  'Guru-stotra': ['गुरुर्ब्रह्मा गुरुर्विष्णुः', 'गुरुर्देवो महेश्वरः', 'गुरुः साक्षात् परं ब्रह्म', 'तस्मै श्रीगुरवे नमः'],
};

const ANUSTUBH_PATTERNS: Record<string, string[]> = {
  'Gītā 2.47': ['GGGGLGGG', 'GLGLLGLL', 'GGLLLGGG', 'GGGGLGLL'],
  'Gītā 4.7': ['LGLGLGGL', 'GGLLLGLL', 'GGGLLGGL', 'LGGGLGLG'],
  'Raghuvaṃśa 1.1': ['GGGLLGGG', 'GGGLLGLG', 'LLGLLGGG', 'GLGLLGLG'],
};

const SAMAVRTTA: Record<string, { meter: string; padas: string[] }> = {
  'Meghadūta 1': {
    meter: 'mandakranta',
    padas: [
      'कश्चित्कान्ताविरहगुरुणा स्वाधिकारात्प्रमत्तः',
      'शापेनास्तङ्गमितमहिमा वर्षभोग्येण भर्तुः',
      'यक्षश्चक्रे जनकतनयास्नानपुण्योदकेषु',
      'स्निग्धच्छायातरुषु वसतिं रामगिर्याश्रमेषु',
    ],
  },
  'Sarasvatī-stuti': {
    meter: 'shardulavikridita',
    padas: [
      'या कुन्देन्दुतुषारहारधवला या शुभ्रवस्त्रावृता',
      'या वीणावरदण्डमण्डितकरा या श्वेतपद्मासना',
      'या ब्रह्माच्युतशङ्करप्रभृतिभिर्देवैः सदा वन्दिता',
      'सा मां पातु सरस्वती भगवती निःशेषजाड्यापहा',
    ],
  },
  'Bhartṛhari, yāṃ cintayāmi': {
    meter: 'vasantatilaka',
    padas: ['यां चिन्तयामि सततं मयि सा विरक्ता', 'साप्यन्यमिच्छति जनं स जनोऽन्यसक्तः', 'अस्मत्कृते च परितुष्यति काचिदन्या', 'धिक्तां च तं च मदनं च इमां च मां च'],
  },
  'Śākuntala 1.20': {
    meter: 'malini',
    padas: ['सरसिजमनुविद्धं शैवलेनापि रम्यं', 'मलिनमपि हिमांशोर्लक्ष्म लक्ष्मीं तनोति', 'इयमधिकमनोज्ञा वल्कलेनापि तन्वी', 'किमिव हि मधुराणां मण्डनं नाकृतीनाम्'],
  },
  'Śākuntala 4, artho hi kanyā': {
    meter: 'indravajra',
    padas: ['अर्थो हि कन्या परकीय एव', 'तामद्य सम्प्रेष्य परिग्रहीतुः', 'जातो ममायं विशदः प्रकामं', 'प्रत्यर्पितन्यास इवान्तरात्मा'],
  },
  'tvameva mātā': {
    meter: 'upendravajra',
    padas: ['त्वमेव माता च पिता त्वमेव', 'त्वमेव बन्धुश्च सखा त्वमेव', 'त्वमेव विद्या द्रविणं त्वमेव', 'त्वमेव सर्वं मम देवदेव'],
  },
  'Kirātārjunīya 1.1': {
    meter: 'vamshastha',
    padas: ['श्रियः कुरूणामधिपस्य पालनीं', 'प्रजासु वृत्तिं यमयुङ्क्त वेदितुम्', 'स वर्णिलिङ्गी विदितः समाययौ', 'युधिष्ठिरं द्वैतवने वनेचरः'],
  },
  'Śivamahimnaḥ 1': {
    meter: 'shikharini',
    padas: [
      'महिम्नः पारं ते परमविदुषो यद्यसदृशी',
      'स्तुतिर्ब्रह्मादीनामपि तदवसन्नास्त्वयि गिरः',
      'अथावाच्यः सर्वः स्वमतिपरिणामावधि गृणन्',
      'ममाप्येष स्तोत्रे हर निरपवादः परिकरः',
    ],
  },
  'Śākuntala 1.1': {
    meter: 'sragdhara',
    padas: [
      'या सृष्टिः स्रष्टुराद्या वहति विधिहुतं या हविर्या च होत्री',
      'ये द्वे कालं विधत्तः श्रुतिविषयगुणा या स्थिता व्याप्य विश्वम्',
      'यामाहुः सर्वबीजप्रकृतिरिति यया प्राणिनः प्राणवन्तः',
      'प्रत्यक्षाभिः प्रपन्नस्तनुभिरवतु वस्ताभिरष्टाभिरीशः',
    ],
  },
  'Bhavānyaṣṭaka 1': {
    meter: 'bhujangaprayata',
    padas: ['न तातो न माता न बन्धुर्न दाता', 'न पुत्रो न पुत्री न भृत्यो न भर्ता', 'न जाया न विद्या न वृत्तिर्ममैव', 'गतिस्त्वं गतिस्त्वं त्वमेका भवानि'],
  },
  'Toṭakāṣṭaka 1': {
    meter: 'totaka',
    padas: ['विदिताखिलशास्त्रसुधाजलधे', 'महितोपनिषत्कथितार्थनिधे', 'हृदये कलये विमलं चरणं', 'भव शङ्कर देशिक मे शरणम्'],
  },
  'Bhartṛhari, vipadi dhairyam': {
    meter: 'drutavilambita',
    padas: ['विपदि धैर्यमथाभ्युदये क्षमा', 'सदसि वाक्पटुता युधि विक्रमः', 'यशसि चाभिरुचिर्व्यसनं श्रुतौ', 'प्रकृतिसिद्धमिदं हि महात्मनाम्'],
  },
  'Śivatāṇḍava 1': {
    meter: 'pancacamara',
    padas: [
      'जटाटवीगलज्जलप्रवाहपावितस्थले',
      'गलेऽवलम्ब्य लम्बितां भुजङ्गतुङ्गमालिकाम्',
      'डमड्डमड्डमड्डमन्निनादवड्डमर्वयं',
      'चकार चण्डताण्डवं तनोतु नः शिवः शिवम्',
    ],
  },
  'Rāmarakṣā, mātā rāmo': {
    meter: 'shalini',
    padas: ['माता रामो मत्पिता रामचन्द्रः', 'स्वामी रामो मत्सखा रामचन्द्रः', 'सर्वस्वं मे रामचन्द्रो दयालुः', 'नान्यं जाने नैव जाने न जाने'],
  },
  'Bhartṛhari, labheta sikatāsu': {
    meter: 'prthvi',
    padas: [
      'लभेत सिकतासु तैलमपि यत्नतः पीडयन्',
      'पिबेच्च मृगतृष्णिकासु सलिलं पिपासार्दितः',
      'कदाचिदपि पर्यटञ्छशविषाणमासादयेत्',
      'न तु प्रतिनिविष्टमूर्खजनचित्तमाराधयेत्',
    ],
  },
  'Raghuvaṃśa 1.95': {
    meter: 'praharshini',
    padas: ['निर्दिष्टां कुलपतिना स पर्णशालाम्', 'अध्यास्य प्रयतपरिग्रहद्वितीयः', 'तच्छिष्याध्ययननिवेदितावसानां', 'संविष्टः कुशशयने निशां निनाय'],
  },
};

const UPAJATI: Record<string, { padas: string[]; perPada: string[] }> = {
  'Gītā 2.22': {
    padas: ['वासांसि जीर्णानि यथा विहाय', 'नवानि गृह्णाति नरोऽपराणि', 'तथा शरीराणि विहाय जीर्णा', 'न्यन्यानि संयाति नवानि देही'],
    perPada: ['indravajra', 'upendravajra', 'upendravajra', 'indravajra'],
  },
  'Kumārasambhava 1.1': {
    padas: ['अस्त्युत्तरस्यां दिशि देवतात्मा', 'हिमालयो नाम नगाधिराजः', 'पूर्वापरौ तोयनिधी वगाह्य', 'स्थितः पृथिव्या इव मानदण्डः'],
    perPada: ['indravajra', 'upendravajra', 'indravajra', 'upendravajra'],
  },
};

// ---------------------------------------------------------------------------

test('scanLine: weights by vowel length, anusvāra / visarga, and following conjunct', () => {
  assert.equal(weights('क'), 'L');
  assert.equal(weights('का'), 'G');
  assert.equal(weights('कि'), 'L');
  assert.equal(weights('की'), 'G');
  assert.equal(weights('कृ'), 'L');
  assert.equal(weights('कॄ'), 'G');
  assert.equal(weights('के'), 'G');
  assert.equal(weights('कै'), 'G');
  assert.equal(weights('को'), 'G');
  assert.equal(weights('कौ'), 'G');
  assert.equal(weights('कं'), 'G');
  assert.equal(weights('कः'), 'G');
  assert.equal(weights('कँ'), 'L');
  assert.equal(weights('ॐ'), 'G');
  assert.equal(weights('अ'), 'L');
  assert.equal(weights('आ'), 'G');
  assert.equal(weights('कुरु'), 'LL');
  assert.equal(weights('रामः'), 'GG');
  assert.equal(weights('संस्कृतम्'), 'GLG');
  assert.equal(weights('धर्मः'), 'GG');
  assert.equal(weights('सत्य'), 'GL');
  assert.equal(weights('पुत्र'), 'GL');
  assert.equal(weights('अग्नि'), 'GL');
  assert.equal(weights('गुरु'), 'LL');
  assert.equal(weights('हरि'), 'LL');
  assert.equal(weights('नदी'), 'LG');
  assert.equal(weights('दुःखम्'), 'GG');
  assert.equal(weights('धर्मक्षेत्रे कुरुक्षेत्रे'), 'GGGGLGGG');
  assert.equal(weights('न त्वेवाहं जातु नासं'), 'GGGGGLGG');
  assert.equal(weights('मा ते सङ्गोऽस्त्वकर्मणि'), 'GGGGLGLL');
});

test('scanLine: conjuncts count across word boundaries; a single consonant does not', () => {
  assert.equal(weights('न'), 'L');
  assert.equal(weights('न च'), 'LL');
  assert.equal(weights('न त्वम्'), 'GG');
  assert.equal(weights('न श्रेयः'), 'GGG');
  assert.equal(weights('तत् एव'), 'LGL'); // t goes with the following vowel
  assert.equal(weights('तत् च'), 'GL'); // t + c = conjunct
  assert.equal(weights('तत्'), 'G'); // line-final closed syllable
  assert.equal(weights('अहम् अस्मि'), 'LLGL');
  assert.equal(weights('अहं गच्छामि'), 'LGGGL');
  // separators are ignored
  assert.equal(weights('धर्मक्षेत्रे कुरुक्षेत्रे ।'), 'GGGGLGGG');
  assert.equal(weights('धर्म-क्षेत्रे ॥ १ ॥'), 'GGGG');
  assert.equal(weights(''), '');
  assert.equal(weights('। ॥ १२'), '');
});

test('scanLine: syllable records are akṣara-aligned', () => {
  assert.deepEqual(scanLine('कुरु'), [
    { text: 'कु', slp1: 'ku', weight: 'L' },
    { text: 'रु', slp1: 'ru', weight: 'L' },
  ]);
  assert.deepEqual(
    scanLine('धर्मक्षेत्रे').map((s) => s.text),
    ['ध', 'र्म', 'क्षे', 'त्रे'],
  );
  assert.deepEqual(
    scanLine('रामोऽपि तत्').map((s) => [s.text, s.slp1, s.weight]),
    [
      ['रा', 'rA', 'G'],
      ['मोऽ', "mo'", 'G'],
      ['पि', 'pi', 'L'],
      ['तत्', 'tat', 'G'],
    ],
  );
  for (const w of WORDS) {
    const syl = scanLine(w);
    assert.equal(syl.length, countAksharas(w), w);
    assert.deepEqual(
      syl.map((s) => s.text),
      splitAksharas(w).filter((a) => /[अ-औॠॡॐक-हळ]/.test(a) && !/^([क-हळ]्)+$/.test(a)),
      w,
    );
    for (const s of syl) assert.equal(s.slp1, devaToSlp1(s.text));
  }
});

test('ganas', () => {
  assert.deepEqual(ganas('LGG'), ['ya']);
  assert.deepEqual(ganas('GGG'), ['ma']);
  assert.deepEqual(ganas('GGL'), ['ta']);
  assert.deepEqual(ganas('GLG'), ['ra']);
  assert.deepEqual(ganas('LGL'), ['ja']);
  assert.deepEqual(ganas('GLL'), ['bha']);
  assert.deepEqual(ganas('LLL'), ['na']);
  assert.deepEqual(ganas('LLG'), ['sa']);
  assert.deepEqual(ganas('L'), ['la']);
  assert.deepEqual(ganas('G'), ['ga']);
  assert.deepEqual(ganas('GL'), ['ga', 'la']);
  assert.deepEqual(ganas(''), []);
  assert.deepEqual(ganas('GGLGGLLGLGG'), ['ta', 'ta', 'ja', 'ga', 'ga']);
  assert.deepEqual(ganas('GGGG|LLLLLG|GLGGLGG'), ['ma', 'bha', 'na', 'ta', 'ta', 'ga', 'ga']);
  // the mnemonic यमाताराजभानसलगम् spells the eight gaṇas in order
  const mnemonic = weights('यमाताराजभानसलगम्');
  assert.equal(mnemonic, 'LGGGLGLLLG');
  const names = ['ya', 'ma', 'ta', 'ra', 'ja', 'bha', 'na', 'sa'];
  for (let i = 0; i < 8; i++) assert.deepEqual(ganas(mnemonic.slice(i, i + 3)), [names[i]]);
});

test('METERS: definitions are internally consistent', () => {
  const expected: Record<string, [number, string]> = {
    indravajra: [11, 'GGLGGLLGLGG'],
    upendravajra: [11, 'LGLGGLLGLGG'],
    vamshastha: [12, 'LGLGGLLGLGLG'],
    indravamsha: [12, 'GGLGGLLGLGLG'],
    vasantatilaka: [14, 'GGLGLLLGLLGLGG'],
    malini: [15, 'LLLLLLGGGLGGLGG'],
    mandakranta: [17, 'GGGGLLLLLGGLGGLGG'],
    shikharini: [17, 'LGGGGGLLLLLGGLLLG'],
    shardulavikridita: [19, 'GGGLLGLGLLLGGGLGGLG'],
    sragdhara: [21, 'GGGGLGGLLLLLLGGLGGLGG'],
    bhujangaprayata: [12, 'LGGLGGLGGLGG'],
    totaka: [12, 'LLGLLGLLGLLG'],
    drutavilambita: [12, 'LLLGLLGLLGLG'],
    rathoddhata: [11, 'GLGLLLGLGLG'],
    svagata: [11, 'GLGLLLGLLGG'],
    shalini: [11, 'GGGGGLGGLGG'],
    harini: [17, 'LLLLLGGGGGLGLLGLG'],
    prthvi: [17, 'LGLLLGLGLLLGLGGLG'],
    praharshini: [13, 'GGGLLLLGLGLGG'],
    pancacamara: [16, 'LGLGLGLGLGLGLGLG'],
  };
  assert.equal(METERS.length, 20);
  assert.deepEqual(METERS.map((m) => m.id).sort(), Object.keys(expected).sort());
  const patterns = new Set<string>();
  for (const m of METERS) {
    const [syllables, pattern] = expected[m.id] as [number, string];
    assert.equal(m.syllables, syllables, m.id);
    assert.equal(m.pattern, pattern, m.id);
    assert.equal(m.pattern.length, m.syllables, m.id);
    assert.match(m.pattern, /^[LG]+$/);
    // pattern ⇄ gaṇa formula
    assert.equal(ganas(m.pattern).join(' '), m.ganaFormula, m.id);
    // names
    assert.ok(validateDeva(m.name.sa).ok, m.name.sa);
    assert.ok(m.name.iast.length > 0);
    // yati sections sum to the pāda length
    if (m.yati !== undefined) assert.equal(m.yati.reduce((a, b) => a + b, 0), m.syllables, `${m.id} yati`);
    // the final-anceps key is unique, so matchMeter is unambiguous
    const key = `${m.syllables}:${m.pattern.slice(0, -1)}`;
    assert.ok(!patterns.has(key), `${m.id} collides`);
    patterns.add(key);
    assert.equal(matchMeter(m.pattern)?.id, m.id);
    assert.equal(matchMeter(`${m.pattern.slice(0, -1)}L`)?.id, m.id, `${m.id} final anceps`);
    assert.equal(matchMeter(`${m.pattern}G`), undefined);
    assert.equal(matchMeter(m.pattern.slice(1)), undefined);
  }
});

test('METERS: every lakṣaṇa line is itself in the metre it defines', () => {
  let n = 0;
  for (const m of METERS) {
    if (m.lakshana === undefined) continue;
    assert.ok(validateDeva(m.lakshana).ok, m.lakshana);
    assert.equal(matchMeter(weights(m.lakshana))?.id, m.id, `${m.id}: ${m.lakshana} scans ${weights(m.lakshana)}`);
    n += 1;
  }
  assert.equal(n, METERS.length);
});

test('matchMeter', () => {
  assert.equal(matchMeter('GGLGGLLGLGG')?.id, 'indravajra');
  assert.equal(matchMeter('GGLGGLLGLGL')?.id, 'indravajra');
  assert.equal(matchMeter('LGLGGLLGLGG')?.id, 'upendravajra');
  assert.equal(matchMeter('GGGG|LLLLLG|GLGGLGG')?.id, 'mandakranta');
  assert.equal(matchMeter(''), undefined);
  assert.equal(matchMeter('LLLL'), undefined);
  assert.equal(matchMeter('GGGGLGGG'), undefined);
  assert.equal(matchMeter('LGLGGLLGLGG')?.name.sa, 'उपेन्द्रवज्रा');
});

test('checkAnustubh: well-known ślokas, pāda by pāda', () => {
  for (const [name, padas] of Object.entries(ANUSTUBH)) {
    padas.forEach((pada, i) => {
      assert.ok(validateDeva(pada).ok, pada);
      const r = checkAnustubh(pada, i as 0 | 1 | 2 | 3);
      assert.deepEqual({ ok: r.ok, syllables: r.syllables, issues: r.issues }, { ok: true, syllables: 8, issues: [] }, `${name} pāda ${i + 1}: ${pada} ${r.pattern}`);
      assert.equal(r.pattern, weights(pada));
    });
  }
  for (const [name, patterns] of Object.entries(ANUSTUBH_PATTERNS)) {
    const padas = ANUSTUBH[name] as string[];
    patterns.forEach((p, i) => assert.equal(weights(padas[i] as string), p, `${name} pāda ${i + 1}`));
  }
});

test('checkAnustubh: reports what is wrong', () => {
  assert.deepEqual(checkAnustubh('कर्मण्येवाधिकारस्ते', 0), { ok: true, syllables: 8, pattern: 'GGGGLGGG', issues: [] });
  // an odd-pāda cadence in an even position, and vice versa
  const a = checkAnustubh('कर्मण्येवाधिकारस्ते', 1);
  assert.equal(a.ok, false);
  assert.match(a.issues.join(' '), /7th syllable must be laghu/);
  const b = checkAnustubh('मा फलेषु कदाचन', 0);
  assert.equal(b.ok, false);
  assert.match(b.issues.join(' '), /7th syllable must be guru/);
  // wrong length
  const c = checkAnustubh('रामो गच्छति', 0);
  assert.equal(c.ok, false);
  assert.equal(c.syllables, 5);
  assert.match(c.issues.join(' '), /8 syllables, found 5/);
  // 5th heavy / 6th light
  const d = checkAnustubh('रामो रामो रामो रामः', 0);
  assert.equal(d.ok, false);
  assert.match(d.issues.join(' '), /5th syllable must be laghu/);
  const e = checkAnustubh('कमलकमलकमल', 1);
  assert.equal(e.syllables, 9);
  assert.equal(e.ok, false);
  const f = checkAnustubh('न च न च न च न च', 1);
  assert.equal(f.pattern, 'LLLLLLLL');
  assert.match(f.issues.join(' '), /6th syllable must be guru/);
  // vipulā odd pādas of real verses are not pathyā
  assert.equal(checkAnustubh('स यत्प्रमाणं कुरुते', 2).ok, false); // Gītā 3.21c
  assert.equal(checkAnustubh('स्मृतिभ्रंशाद् बुद्धिनाशो', 2).ok, false); // Gītā 2.63c
  assert.equal(checkAnustubh('लोकस्तदनुवर्तते', 3).ok, true); // Gītā 3.21d
});

test('identifyVerse: anuṣṭubh in three layouts', () => {
  for (const [name, padas] of Object.entries(ANUSTUBH)) {
    assert.deepEqual(identifyVerse(padas), { meter: 'anustubh', kind: 'anustubh', perPada: ['anustubh', 'anustubh', 'anustubh', 'anustubh'] }, name);
    const halves = [`${padas[0]} ${padas[1]} ।`, `${padas[2]} ${padas[3]} ॥`];
    assert.deepEqual(identifyVerse(halves), { meter: 'anustubh', kind: 'anustubh', perPada: ['anustubh', 'anustubh'] }, name);
    assert.equal(identifyVerse([padas.join(' ')]).kind, 'anustubh', name);
  }
  // with sandhi across the pāda boundary, as printed
  assert.equal(identifyVerse(['कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।', 'मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥ ४७ ॥']).meter, 'anustubh');
  assert.equal(identifyVerse(['वागर्थाविव सम्पृक्तौ वागर्थप्रतिपत्तये । जगतः पितरौ वन्दे पार्वतीपरमेश्वरौ ॥']).meter, 'anustubh');
});

test('identifyVerse: sama-vṛtta verses', () => {
  const seen = new Set<string>();
  for (const [name, { meter, padas }] of Object.entries(SAMAVRTTA)) {
    const def = METERS.find((m) => m.id === meter);
    assert.ok(def !== undefined, meter);
    for (const pada of padas) {
      assert.ok(validateDeva(pada).ok, pada);
      const w = weights(pada);
      assert.equal(w.length, def.syllables, `${name}: ${pada}`);
      assert.equal(w.slice(0, -1), def.pattern.slice(0, -1), `${name}: ${pada}`);
      assert.equal(matchMeter(w)?.id, meter);
    }
    assert.deepEqual(identifyVerse(padas), { meter, kind: 'samavrtta', perPada: [meter, meter, meter, meter] }, name);
    seen.add(meter);
  }
  assert.ok(seen.size >= 15, `verses cover ${seen.size} metres`);
});

test('identifyVerse: upajāti', () => {
  for (const [name, { padas, perPada }] of Object.entries(UPAJATI)) {
    assert.deepEqual(identifyVerse(padas), { meter: 'upajati', kind: 'upajati', perPada }, name);
  }
  assert.equal(matchMeter(weights('वासांसि जीर्णानि यथा विहाय'))?.id, 'indravajra');
  assert.equal(weights('वासांसि जीर्णानि यथा विहाय'), 'GGLGGLLGLGL');
  // vaṃśastha + indravaṃśā also mix as upajāti
  const v = (SAMAVRTTA['Kirātārjunīya 1.1'] as { padas: string[] }).padas;
  const indravamsha = METERS.find((m) => m.id === 'indravamsha')?.lakshana as string;
  assert.deepEqual(identifyVerse([v[0] as string, indravamsha, v[2] as string, v[3] as string]), {
    meter: 'upajati',
    kind: 'upajati',
    perPada: ['vamshastha', 'indravamsha', 'vamshastha', 'vamshastha'],
  });
});

test('identifyVerse: unknown rather than a guess', () => {
  assert.deepEqual(identifyVerse([]), { meter: null, kind: 'unknown', perPada: [] });
  assert.deepEqual(identifyVerse(['रामो गच्छति']), { meter: null, kind: 'unknown', perPada: ['unknown'] });
  // an 11-syllable and a 12-syllable metre do not make upajāti
  const mixed = identifyVerse(['अर्थो हि कन्या परकीय एव', 'श्रियः कुरूणामधिपस्य पालनीं']);
  assert.equal(mixed.kind, 'unknown');
  assert.deepEqual(mixed.perPada, ['indravajra', 'vamshastha']);
  // a vipulā śloka (Gītā 3.21) is not claimed as regular anuṣṭubh
  const vipula = identifyVerse(['यद्यदाचरति श्रेष्ठः', 'तत्तदेवेतरो जनः', 'स यत्प्रमाणं कुरुते', 'लोकस्तदनुवर्तते']);
  assert.equal(vipula.kind, 'unknown');
  assert.equal(vipula.meter, null);
  // pādas in the wrong order break the odd / even cadence
  const p = ANUSTUBH['Gītā 2.47'] as string[];
  assert.equal(identifyVerse([p[1] as string, p[0] as string, p[3] as string, p[2] as string]).kind, 'unknown');
  // an odd number of anuṣṭubh pādas is not a verse
  assert.equal(identifyVerse([p[0] as string, p[1] as string, p[2] as string]).kind, 'unknown');
});
