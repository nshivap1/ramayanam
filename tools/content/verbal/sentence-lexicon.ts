/**
 * Hand-curated lexicon and compatibility table for the sentence generator.
 *
 * What is hand-written here: prātipadikas (stems) with gender and English glosses, indeclinables,
 * and WHICH words may meaningfully combine. No inflected form is written here — every form is
 * looked up (dhātu pack, śabda oracle) by gen-sentences.ts, which also verifies each stem,
 * its gender and each indeclinable against a reference list before using it.
 */
import type { Gender } from '../../../src/content/types';

export interface NounSpec {
  stem: string;
  g: Gender;
  /** English singular; '' plural = mass noun (no article, no plural) */
  en: string;
  pl: string;
  /** proper name: no article */
  name?: boolean;
}

const n = (stem: string, g: Gender, en: string, pl: string, name = false): NounSpec => ({ stem, g, en, pl, ...(name ? { name } : {}) });

export const NOUNS: Record<string, NounSpec> = {
  // people
  balaka: n('बालक', 'm', 'boy', 'boys'),
  balika: n('बालिका', 'f', 'girl', 'girls'),
  chatra: n('छात्र', 'm', 'student', 'students'),
  kanya: n('कन्या', 'f', 'girl', 'girls'),
  shikshaka: n('शिक्षक', 'm', 'teacher', 'teachers'),
  janaka: n('जनक', 'm', 'father', 'fathers'),
  matr: n('मातृ', 'f', 'mother', 'mothers'),
  janani: n('जननी', 'f', 'mother', 'mothers'),
  bhagini: n('भगिनी', 'f', 'sister', 'sisters'),
  putra: n('पुत्र', 'm', 'son', 'sons'),
  krshaka: n('कृषक', 'm', 'farmer', 'farmers'),
  sevaka: n('सेवक', 'm', 'servant', 'servants'),
  nrpa: n('नृप', 'm', 'king', 'kings'),
  sainika: n('सैनिक', 'm', 'soldier', 'soldiers'),
  shishya: n('शिष्य', 'm', 'disciple', 'disciples'),
  cora: n('चोर', 'm', 'thief', 'thieves'),
  gayaka: n('गायक', 'm', 'singer', 'singers'),
  guru: n('गुरु', 'm', 'guru', 'gurus'),
  shishu: n('शिशु', 'm', 'baby', 'babies'),
  deva: n('देव', 'm', 'god', 'gods'),
  rama: n('राम', 'm', 'Rama', '', true),
  sita: n('सीता', 'f', 'Sita', '', true),
  mitra: n('मित्र', 'n', 'friend', 'friends'),
  // animals
  ashva: n('अश्व', 'm', 'horse', 'horses'),
  gaja: n('गज', 'm', 'elephant', 'elephants'),
  vanara: n('वानर', 'm', 'monkey', 'monkeys'),
  mrga: n('मृग', 'm', 'deer', 'deer'),
  simha: n('सिंह', 'm', 'lion', 'lions'),
  shuka: n('शुक', 'm', 'parrot', 'parrots'),
  kaka: n('काक', 'm', 'crow', 'crows'),
  khaga: n('खग', 'm', 'bird', 'birds'),
  kukkura: n('कुक्कुर', 'm', 'dog', 'dogs'),
  marjara: n('मार्जार', 'm', 'cat', 'cats'),
  mushaka: n('मूषक', 'm', 'mouse', 'mice'),
  matsya: n('मत्स्य', 'm', 'fish', 'fish'),
  dhenu: n('धेनु', 'f', 'cow', 'cows'),
  // places
  vidyalaya: n('विद्यालय', 'm', 'school', 'schools'),
  grha: n('गृह', 'n', 'house', 'houses'),
  vana: n('वन', 'n', 'forest', 'forests'),
  udyana: n('उद्यान', 'n', 'garden', 'gardens'),
  nagara: n('नगर', 'n', 'city', 'cities'),
  grama: n('ग्राम', 'm', 'village', 'villages'),
  apana: n('आपण', 'm', 'shop', 'shops'),
  mandira: n('मन्दिर', 'n', 'temple', 'temples'),
  kshetra: n('क्षेत्र', 'n', 'field', 'fields'),
  nadi: n('नदी', 'f', 'river', 'rivers'),
  tadaga: n('तडाग', 'm', 'pond', 'ponds'),
  marga: n('मार्ग', 'm', 'road', 'roads'),
  vrksha: n('वृक्ष', 'm', 'tree', 'trees'),
  parvata: n('पर्वत', 'm', 'mountain', 'mountains'),
  desha: n('देश', 'm', 'country', 'countries'),
  asana: n('आसन', 'n', 'seat', 'seats'),
  // things
  pustaka: n('पुस्तक', 'n', 'book', 'books'),
  patra: n('पत्र', 'n', 'letter', 'letters'),
  phala: n('फल', 'n', 'fruit', 'fruits'),
  jala: n('जल', 'n', 'water', ''),
  dugdha: n('दुग्ध', 'n', 'milk', ''),
  bhojana: n('भोजन', 'n', 'food', ''),
  anna: n('अन्न', 'n', 'food', ''),
  shaka: n('शाक', 'm', 'vegetable', 'vegetables'),
  modaka: n('मोदक', 'm', 'sweetmeat', 'sweetmeats'),
  trna: n('तृण', 'n', 'grass', ''),
  patha: n('पाठ', 'm', 'lesson', 'lessons'),
  lekha: n('लेख', 'm', 'essay', 'essays'),
  katha: n('कथा', 'f', 'story', 'stories'),
  shloka: n('श्लोक', 'm', 'verse', 'verses'),
  gita: n('गीत', 'n', 'song', 'songs'),
  citra: n('चित्र', 'n', 'picture', 'pictures'),
  karya: n('कार्य', 'n', 'work', ''),
  pushpa: n('पुष्प', 'n', 'flower', 'flowers'),
  vastra: n('वस्त्र', 'n', 'garment', 'garments'),
  dhana: n('धन', 'n', 'money', ''),
  prashna: n('प्रश्न', 'm', 'question', 'questions'),
  uttara: n('उत्तर', 'n', 'answer', 'answers'),
  upahara: n('उपहार', 'm', 'gift', 'gifts'),
  kanduka: n('कन्दुक', 'm', 'ball', 'balls'),
  hasta: n('हस्त', 'm', 'hand', 'hands'),
  mukha: n('मुख', 'n', 'face', 'faces'),
  lekhani: n('लेखनी', 'f', 'pen', 'pens'),
  camasa: n('चमस', 'm', 'spoon', 'spoons'),
  yana: n('यान', 'n', 'vehicle', 'vehicles'),
  ratha: n('रथ', 'm', 'chariot', 'chariots'),
  nauka: n('नौका', 'f', 'boat', 'boats'),
  dvara: n('द्वार', 'n', 'door', 'doors'),
  patra2: n('पात्र', 'n', 'vessel', 'vessels'),
  candra: n('चन्द्र', 'm', 'moon', '', true),
  satya: n('सत्य', 'n', 'truth', ''),
  jnana: n('ज्ञान', 'n', 'knowledge', ''),
  lata: n('लता', 'f', 'creeper', 'creepers'),
};
/** the moon / the truth take the article although they are not count nouns */
export const DEFINITE = new Set(['candra', 'satya']);

/** Adjectives whose feminine is in -ā (checked against MW "mf(ā)n." by the generator). */
export const ADJECTIVES: Record<string, { stem: string; en: string }> = {
  madhura: { stem: 'मधुर', en: 'sweet' },
  shitala: { stem: 'शीतल', en: 'cool' },
  nutana: { stem: 'नूतन', en: 'new' },
  dirgha: { stem: 'दीर्घ', en: 'long' },
  rakta: { stem: 'रक्त', en: 'red' },
  pakva: { stem: 'पक्व', en: 'ripe' },
  nirmala: { stem: 'निर्मल', en: 'clean' },
  kushala: { stem: 'कुशल', en: 'skilful' },
  alasa: { stem: 'अलस', en: 'lazy' },
  sthula: { stem: 'स्थूल', en: 'big' },
};

/** Indeclinables (verified against MW / learnsanskrit indeclinable lists or MW headwords). */
export const AVYAYA = {
  atra: { sa: 'अत्र', en: 'here' },
  tatra: { sa: 'तत्र', en: 'there' },
  adya: { sa: 'अद्य', en: 'today' },
  shvah: { sa: 'श्वः', en: 'tomorrow' },
  hyah: { sa: 'ह्यः', en: 'yesterday' },
  api: { sa: 'अपि', en: 'also' },
  na: { sa: 'न', en: 'not' },
  saha: { sa: 'सह', en: 'with' },
  vina: { sa: 'विना', en: 'without' },
  prati: { sa: 'प्रति', en: 'towards' },
  namah: { sa: 'नमः', en: 'salutation' },
  he: { sa: 'हे', en: 'O' },
  sarvada: { sa: 'सर्वदा', en: 'always' },
} as const;

export interface VerbSpec {
  /** dhātu pack id */
  dhatu: string;
  /** PREFIXED id when the verb is a prefixed one (its prefixes come from prefixed-list.ts) */
  prefixed?: string;
  pada: 'P' | 'A';
  /** English: base, 3sg, past, past participle */
  en: [string, string, string, string];
  /** preposition inserted before the English object ("goes TO the school") */
  prep?: string;
}
const v = (dhatu: string, pada: 'P' | 'A', en: string, prep?: string, prefixed?: string): VerbSpec => {
  const parts = en.split(' ') as [string, string, string, string];
  return { dhatu, pada, en: parts.map((p) => p.replace(/_/g, ' ')) as [string, string, string, string], ...(prep ? { prep } : {}), ...(prefixed ? { prefixed } : {}) };
};

export const VERBS: Record<string, VerbSpec> = {
  path: v('path-1p', 'P', 'read reads read read'),
  likh: v('likh-6p', 'P', 'write writes wrote written'),
  khad: v('khad-1p', 'P', 'eat eats ate eaten'),
  pa: v('pa-1p', 'P', 'drink drinks drank drunk'),
  gam: v('gam-1p', 'P', 'go goes went gone', 'to'),
  drs: v('drs-1p', 'P', 'see sees saw seen'),
  smr: v('smr-1p', 'P', 'remember remembers remembered remembered'),
  dhav: v('dhav-1p', 'P', 'run runs ran run'),
  krid: v('krid-1p', 'P', 'play plays played played'),
  has: v('has-1p', 'P', 'laugh laughs laughed laughed'),
  pat: v('pat-1p', 'P', 'fall falls fell fallen'),
  raks: v('raks-1p', 'P', 'protect protects protected protected'),
  nam: v('nam-1p', 'P', 'bow bows bowed bowed', 'to'),
  vas: v('vas-1p', 'P', 'live lives lived lived'),
  pac: v('pac-1u', 'P', 'cook cooks cooked cooked'),
  labh: v('labh-1a', 'A', 'get gets got got'),
  sev: v('sev-1a', 'A', 'serve serves served served'),
  vand: v('vand-1a', 'A', 'salute salutes saluted saluted'),
  mud: v('mud-1a', 'A', 'rejoice rejoices rejoiced rejoiced'),
  as: v('as-2p', 'P', 'be is was been'),
  da: v('da-3u', 'P', 'give gives gave given'),
  sru: v('sru-1p', 'P', 'hear hears heard heard'),
  jna: v('jna-9p', 'P', 'know knows knew known'),
  kr: v('kr-8u', 'P', 'do does did done'),
  kri: v('kri-9u', 'P', 'buy buys bought bought'),
  is: v('is-6p', 'P', 'want wants wanted wanted'),
  sak: v('sak-5p', 'P', 'can can could been_able'),
  prach: v('prach-6p', 'P', 'ask asks asked asked'),
  sprs: v('sprs-6p', 'P', 'touch touches touched touched'),
  kath: v('kath-10u', 'P', 'tell tells told told'),
  gan: v('gan-10u', 'P', 'count counts counted counted'),
  puj: v('puj-10u', 'P', 'worship worships worshipped worshipped'),
  gai: v('gai-1p', 'P', 'sing sings sang sung'),
  nrt: v('nrt-4p', 'P', 'dance dances danced danced'),
  sna: v('sna-2p', 'P', 'bathe bathes bathed bathed'),
  rud: v('rud-2p', 'P', 'cry cries cried cried'),
  svap: v('svap-2p', 'P', 'sleep sleeps slept slept'),
  cur: v('cur-10u', 'P', 'steal steals stole stolen'),
  sic: v('sic-6u', 'P', 'water waters watered watered'),
  jiv: v('jiv-1p', 'P', 'live lives lived lived'),
  bhi: v('bhi-3p', 'P', 'fear fears feared feared'),
  mil: v('mil-6p', 'P', 'meet meets met met'),
  agam: v('gam-1p', 'P', 'come comes came come', undefined, 'a-gam'),
  upavis: v('vis-6p', 'P', 'sit_down sits_down sat_down sat_down', undefined, 'upa-vis'),
  utstha: v('stha-1p', 'P', 'get_up gets_up got_up got_up', undefined, 'ut-stha'),
  ani: v('ni-1u', 'P', 'bring brings brought brought', undefined, 'a-ni'),
  pravis: v('vis-6p', 'P', 'enter enters entered entered', undefined, 'pra-vis'),
  avagam: v('gam-1p', 'P', 'understand understands understood understood', undefined, 'ava-gam'),
  vismr: v('smr-1p', 'P', 'forget forgets forgot forgotten', undefined, 'vi-smr'),
  praksal: v('ksal-10u', 'P', 'wash washes washed washed', undefined, 'pra-ksal'),
  udghat: v('ghat-10u', 'P', 'open opens opened opened', undefined, 'ud-ghat'),
};

/** Transitive frames: verb · who may do it · what it may take as karma · topic. */
export const TRANSITIVE: [verb: string, subjects: string, objects: string, topic: string][] = [
  ['path', 'balaka balika chatra kanya shikshaka putra rama sita', 'pustaka patha patra katha shloka lekha', 'school'],
  ['likh', 'balaka balika chatra kanya shikshaka', 'patra lekha patha uttara katha shloka', 'school'],
  ['khad', 'balaka balika putra chatra janaka rama kanya', 'phala bhojana anna modaka', 'food'],
  ['khad', 'vanara shuka', 'phala', 'animals'],
  ['khad', 'ashva gaja mrga dhenu', 'trna', 'animals'],
  ['pa', 'balaka balika shishu chatra matr janaka', 'jala dugdha', 'food'],
  ['pa', 'ashva gaja dhenu kukkura', 'jala', 'animals'],
  ['pa', 'marjara', 'dugdha', 'animals'],
  ['drs', 'balaka balika chatra janaka matr rama sita', 'citra khaga vrksha candra pushpa nadi parvata mandira gaja', 'nature'],
  ['smr', 'chatra kanya balaka', 'patha katha shloka uttara', 'school'],
  ['smr', 'putra', 'matr janaka', 'family'],
  ['raks', 'nrpa sainika', 'desha nagara grama', 'society'],
  ['raks', 'kukkura', 'grha', 'animals'],
  ['raks', 'janaka matr', 'putra shishu', 'family'],
  ['nam', 'chatra kanya balaka shishya putra', 'guru shikshaka deva matr janaka', 'devotion'],
  ['pac', 'matr janani bhagini', 'bhojana anna shaka', 'food'],
  ['labh', 'chatra', 'pustaka jnana', 'school'],
  ['labh', 'krshaka sevaka', 'dhana', 'society'],
  ['labh', 'balaka balika', 'phala upahara', 'home'],
  ['sev', 'sevaka', 'nrpa', 'society'],
  ['sev', 'putra', 'janaka matr', 'family'],
  ['sev', 'shishya', 'guru', 'devotion'],
  ['vand', 'chatra shishya balaka kanya', 'shikshaka guru deva matr', 'devotion'],
  ['sru', 'balaka balika chatra shishu', 'gita katha', 'home'],
  ['jna', 'chatra kanya shikshaka balaka', 'uttara patha satya marga', 'school'],
  ['kr', 'chatra sevaka krshaka matr balaka', 'karya', 'daily'],
  ['kri', 'janaka matr balaka sevaka', 'phala pustaka vastra dugdha shaka pushpa', 'market'],
  ['is', 'balaka balika shishu chatra', 'jala phala dugdha bhojana pustaka modaka', 'home'],
  ['prach', 'chatra kanya balaka shikshaka', 'prashna', 'school'],
  ['sprs', 'balaka balika shishu', 'pushpa pustaka phala jala', 'home'],
  ['kath', 'matr shikshaka janaka', 'katha', 'home'],
  ['puj', 'matr janaka krshaka balika', 'deva', 'devotion'],
  ['puj', 'shishya', 'guru', 'devotion'],
  ['gai', 'balika gayaka balaka matr', 'gita', 'home'],
  ['cur', 'cora', 'dhana vastra', 'society'],
  ['sic', 'balika krshaka matr', 'vrksha lata', 'nature'],
  ['ani', 'sevaka balaka putra chatra', 'jala phala pustaka bhojana pushpa dugdha', 'home'],
  ['pravis', 'chatra kanya shikshaka', 'vidyalaya', 'school'],
  ['pravis', 'balaka janaka matr', 'grha mandira', 'home'],
  ['pravis', 'simha mrga', 'vana', 'animals'],
  ['avagam', 'chatra kanya balaka', 'patha prashna uttara', 'school'],
  ['vismr', 'chatra balaka', 'patha uttara pustaka', 'school'],
  ['praksal', 'matr', 'vastra patra2', 'home'],
  ['praksal', 'balaka balika', 'hasta mukha', 'daily'],
  ['udghat', 'balaka sevaka matr', 'dvara', 'home'],
  ['udghat', 'chatra', 'pustaka', 'school'],
];

/** Objects that are naturally counted in the plural with गणयति. */
export const COUNTABLES = 'phala pustaka pushpa modaka';

/** Intransitive frames: verb · subjects · topic. */
export const INTRANSITIVE: [verb: string, subjects: string, topic: string][] = [
  ['path', 'balaka balika chatra kanya', 'school'],
  ['likh', 'balaka balika chatra', 'school'],
  ['has', 'balaka balika shishu chatra janaka matr shikshaka', 'home'],
  ['dhav', 'balaka balika chatra ashva mrga kukkura', 'play'],
  ['krid', 'balaka balika putra chatra shishu', 'play'],
  ['mud', 'balaka balika shishu chatra matr janaka', 'home'],
  ['nrt', 'balika balaka kanya', 'play'],
  ['gai', 'balika gayaka', 'play'],
  ['rud', 'shishu balaka balika', 'home'],
  ['svap', 'shishu balaka kukkura marjara', 'home'],
  ['utstha', 'balaka balika chatra shikshaka janaka', 'daily'],
  ['upavis', 'balaka balika chatra shikshaka matr', 'daily'],
  ['agam', 'balaka balika chatra shikshaka janaka matr', 'travel'],
  ['gam', 'balaka balika chatra janaka', 'travel'],
  ['khad', 'balaka balika shishu', 'food'],
  ['pat', 'phala pushpa', 'nature'],
];

/** Motion: who goes where (dvitīyā destination with गच्छति; pañcamī source with आगच्छति). */
export const MOTION: [subjects: string, places: string, topic: string][] = [
  ['chatra kanya shikshaka balaka balika', 'vidyalaya', 'school'],
  ['balaka balika janaka matr putra', 'grha udyana mandira', 'home'],
  ['janaka matr sevaka', 'apana nagara', 'market'],
  ['krshaka', 'kshetra grama', 'society'],
  ['nrpa sainika', 'nagara', 'society'],
];

/** Location (saptamī): verb · subjects · places. */
export const LOCATION: [verb: string, subjects: string, places: string, topic: string][] = [
  ['path', 'balaka balika chatra kanya', 'grha vidyalaya udyana', 'school'],
  ['krid', 'balaka balika putra shishu', 'udyana grha kshetra', 'play'],
  ['dhav', 'balaka ashva mrga kukkura', 'kshetra udyana marga', 'play'],
  ['vas', 'krshaka', 'grama', 'society'],
  ['vas', 'nrpa janaka', 'nagara', 'society'],
  ['vas', 'simha mrga gaja vanara', 'vana', 'animals'],
  ['vas', 'khaga shuka kaka', 'vrksha', 'animals'],
  ['vas', 'matsya', 'jala nadi tadaga', 'animals'],
  ['sna', 'balaka janaka krshaka gaja', 'nadi tadaga', 'daily'],
  ['upavis', 'balaka balika shikshaka matr', 'asana', 'daily'],
  ['upavis', 'khaga shuka kaka', 'vrksha', 'animals'],
  ['as', 'balaka balika chatra janaka matr', 'grha vidyalaya udyana', 'home'],
  ['as', 'matsya', 'jala nadi', 'animals'],
  ['svap', 'shishu balaka', 'grha', 'home'],
];

/** Instrument (tṛtīyā): verb · subjects · karma · instruments. */
export const INSTRUMENT: [verb: string, subjects: string, objects: string, instruments: string, topic: string][] = [
  ['likh', 'balaka balika chatra shikshaka', 'patra lekha patha', 'lekhani hasta', 'school'],
  ['khad', 'balaka balika putra', 'bhojana anna phala', 'hasta camasa', 'food'],
  ['gam', 'janaka matr nrpa', 'nagara grama', 'yana ratha', 'travel'],
  ['krid', 'balaka balika putra', '', 'kanduka', 'play'],
  ['sic', 'balika krshaka', 'vrksha', 'jala', 'nature'],
  ['praksal', 'balaka balika', 'hasta mukha', 'jala', 'daily'],
];

/** Company (saha + tṛtīyā): verb · subjects · companions. */
export const COMPANY: [verb: string, subjects: string, companions: string, topic: string][] = [
  ['krid', 'balaka balika putra', 'mitra balaka bhagini', 'play'],
  ['gam', 'balaka putra chatra', 'janaka matr mitra', 'travel'],
  ['path', 'chatra balaka', 'mitra', 'school'],
  ['mil', 'balaka janaka chatra', 'mitra shikshaka', 'society'],
  ['agam', 'balaka balika', 'matr janaka', 'travel'],
  ['khad', 'putra balaka', 'janaka mitra', 'food'],
];

/** Giving (caturthī): giver · recipients · gifts. */
export const GIVING: [subjects: string, recipients: string, gifts: string, topic: string][] = [
  ['matr janani', 'balaka putra shishu balika', 'phala bhojana dugdha modaka', 'family'],
  ['shikshaka guru', 'chatra shishya', 'pustaka jnana', 'school'],
  ['janaka', 'putra balika', 'dhana pustaka phala upahara', 'family'],
  ['nrpa', 'sevaka sainika', 'dhana', 'society'],
  ['balaka balika', 'mitra', 'pushpa phala upahara', 'home'],
];

/** Source (pañcamī): verb · subjects · karma · sources. */
export const SOURCE: [verb: string, subjects: string, objects: string, sources: string, topic: string][] = [
  ['agam', 'chatra kanya shikshaka balaka', '', 'vidyalaya', 'school'],
  ['agam', 'janaka matr sevaka', '', 'apana nagara grama', 'travel'],
  ['agam', 'krshaka', '', 'kshetra grama', 'society'],
  ['pat', 'phala pushpa', '', 'vrksha', 'nature'],
  ['kri', 'janaka matr balaka', 'phala pustaka vastra shaka', 'apana', 'market'],
  ['ani', 'sevaka balaka', 'jala', 'nadi tadaga', 'home'],
  ['bhi', 'balaka balika mrga', '', 'simha', 'animals'],
  ['bhi', 'mushaka', '', 'marjara', 'animals'],
  ['bhi', 'cora', '', 'sainika kukkura', 'society'],
];

/** vinā: subject cannot live without X. */
export const WITHOUT: [subjects: string, things: string][] = [
  ['matsya', 'jala'],
  ['balaka shishu', 'matr'],
  ['vrksha', 'jala'],
  ['chatra', 'pustaka'],
];

/** namaḥ + caturthī */
export const REVERED = 'guru deva matr janaka shikshaka rama sita';

/** Possession (ṣaṣṭhī): owner · things that can be here / there. */
export const POSSESSION: [owners: string, things: string][] = [
  ['balaka balika chatra shikshaka', 'pustaka lekhani kanduka'],
  ['janaka matr krshaka', 'grha dhenu'],
  ['nrpa', 'ratha ashva gaja'],
];

/** Adjective + noun pairs that make sense (viśeṣaṇa agreement patterns). */
export const QUALITIES: [adjective: string, nouns: string][] = [
  ['madhura', 'phala modaka dugdha gita'],
  ['shitala', 'jala dugdha'],
  ['nutana', 'pustaka vastra grha yana kanduka lekhani'],
  ['dirgha', 'marga nadi katha lekha'],
  ['rakta', 'pushpa vastra phala'],
  ['pakva', 'phala'],
  ['nirmala', 'jala vastra'],
  ['kushala', 'chatra shikshaka sevaka krshaka gayaka balika'],
  ['alasa', 'balaka chatra sevaka'],
  ['sthula', 'gaja vrksha'],
];
