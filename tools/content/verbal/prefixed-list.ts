/**
 * Curated list of common prefixed verbs (upasarga / gati + dhātu). No Sanskrit verb form is typed
 * here: the laṭ 3sg is computed from the verified base paradigm by `joinPrefix` and must then be
 * attested (see prefixed-build.ts). Prefixes are given in SLP1, outermost first.
 *
 * Columns: id · prefixes · base dhātu id · pada · level · English infinitive · English past participle
 * (for the gloss of the lyap form: "having …").
 */
import type { Level, Pada } from '../../../src/content/types';

export interface PrefixedSpec {
  id: string;
  prefixes: string[];
  base: string;
  pada: Pada;
  level: Level;
  en: string;
  pp: string;
}

type Row = [id: string, prefixes: string, base: string, pada: Pada, level: Level, en: string, pp: string];

const ROWS: Row[] = [
  // गम्
  ['a-gam', 'A', 'gam-1p', 'P', 1, 'to come', 'come'],
  ['nir-gam', 'nir', 'gam-1p', 'P', 2, 'to go out', 'gone out'],
  ['ava-gam', 'ava', 'gam-1p', 'P', 1, 'to understand', 'understood'],
  ['anu-gam', 'anu', 'gam-1p', 'P', 2, 'to follow', 'followed'],
  ['upa-gam', 'upa', 'gam-1p', 'P', 2, 'to approach', 'approached'],
  ['adhi-gam', 'aDi', 'gam-1p', 'P', 3, 'to attain, to learn', 'attained'],
  ['ud-gam', 'ud', 'gam-1p', 'P', 3, 'to rise, to go up', 'risen'],
  ['praty-a-gam', 'prati A', 'gam-1p', 'P', 2, 'to come back, to return', 'returned'],
  ['sam-a-gam', 'sam A', 'gam-1p', 'P', 2, 'to come together, to assemble', 'assembled'],
  ['upa-a-gam', 'upa A', 'gam-1p', 'P', 3, 'to come near', 'come near'],
  // विश्
  ['upa-vis', 'upa', 'vis-6p', 'P', 1, 'to sit down', 'sat down'],
  ['pra-vis', 'pra', 'vis-6p', 'P', 1, 'to enter', 'entered'],
  ['a-vis', 'A', 'vis-6p', 'P', 3, 'to enter into, to take possession of', 'entered into'],
  // स्था
  ['ut-stha', 'ud', 'stha-1p', 'P', 1, 'to stand up, to get up', 'stood up'],
  ['anu-stha', 'anu', 'stha-1p', 'P', 3, 'to carry out, to perform', 'performed'],
  ['adhi-stha', 'aDi', 'stha-1p', 'P', 4, 'to stand upon, to preside over', 'presided over'],
  // भू
  ['anu-bhu', 'anu', 'bhu-1p', 'P', 2, 'to experience', 'experienced'],
  ['sam-bhu', 'sam', 'bhu-1p', 'P', 2, 'to be possible, to arise', 'arisen'],
  ['pra-bhu', 'pra', 'bhu-1p', 'P', 3, 'to arise; to be able, to prevail', 'arisen'],
  ['ud-bhu', 'ud', 'bhu-1p', 'P', 3, 'to arise, to spring up', 'arisen'],
  ['abhi-bhu', 'aBi', 'bhu-1p', 'P', 4, 'to overpower', 'overpowered'],
  ['para-bhu', 'parA', 'bhu-1p', 'P', 4, 'to defeat', 'defeated'],
  ['pari-bhu', 'pari', 'bhu-1p', 'P', 4, 'to insult, to despise', 'insulted'],
  // नी
  ['a-ni', 'A', 'ni-1u', 'P', 1, 'to bring', 'brought'],
  ['pari-ni', 'pari', 'ni-1u', 'P', 3, 'to marry; to lead round', 'married'],
  ['apa-ni', 'apa', 'ni-1u', 'P', 3, 'to lead away, to remove', 'removed'],
  ['ut-ni', 'ud', 'ni-1u', 'P', 4, 'to lift up, to raise', 'raised'],
  // हृ
  ['vi-hr', 'vi', 'hr-1u', 'P', 2, 'to roam, to enjoy oneself', 'roamed'],
  ['sam-hr', 'sam', 'hr-1u', 'P', 3, 'to withdraw, to destroy', 'withdrawn'],
  ['a-hr', 'A', 'hr-1u', 'P', 2, 'to fetch, to bring', 'fetched'],
  ['pra-hr', 'pra', 'hr-1u', 'P', 3, 'to strike, to attack', 'struck'],
  ['apa-hr', 'apa', 'hr-1u', 'P', 2, 'to take away, to steal', 'taken away'],
  ['pari-hr', 'pari', 'hr-1u', 'P', 3, 'to avoid', 'avoided'],
  ['ud-hr', 'ud', 'hr-1u', 'P', 3, 'to lift out, to rescue', 'rescued'],
  ['vy-a-hr', 'vi A', 'hr-1u', 'P', 3, 'to utter, to speak', 'uttered'],
  ['upa-hr', 'upa', 'hr-1u', 'P', 4, 'to offer, to present', 'offered'],
  // कृ (with upasargas and gati words)
  ['svi-kr', 'svI', 'kr-8u', 'P', 1, 'to accept', 'accepted'],
  ['angi-kr', 'aNgI', 'kr-8u', 'P', 2, 'to agree to, to accept', 'agreed to'],
  ['upa-kr', 'upa', 'kr-8u', 'P', 2, 'to help', 'helped'],
  ['apa-kr', 'apa', 'kr-8u', 'P', 3, 'to harm', 'harmed'],
  ['anu-kr', 'anu', 'kr-8u', 'P', 2, 'to imitate', 'imitated'],
  ['alam-kr', 'alam', 'kr-8u', 'P', 2, 'to decorate', 'decorated'],
  ['namas-kr', 'namas', 'kr-8u', 'P', 1, 'to salute, to bow to', 'saluted'],
  ['tiras-kr', 'tiras', 'kr-8u', 'P', 3, 'to scorn, to disregard', 'scorned'],
  ['puras-kr', 'puras', 'kr-8u', 'P', 3, 'to honour, to place in front', 'honoured'],
  ['avis-kr', 'Avis', 'kr-8u', 'P', 3, 'to reveal, to invent', 'revealed'],
  ['sat-kr', 'sat', 'kr-8u', 'P', 3, 'to honour, to treat well', 'honoured'],
  ['prati-kr', 'prati', 'kr-8u', 'P', 4, 'to counteract, to requite', 'counteracted'],
  ['vi-kr', 'vi', 'kr-8u', 'P', 4, 'to alter, to change', 'altered'],
  // वद्, दिश्, क्षिप्, लोक्
  ['prati-vad', 'prati', 'vad-1p', 'P', 2, 'to reply', 'replied'],
  ['anu-vad', 'anu', 'vad-1p', 'P', 2, 'to repeat; to translate', 'repeated'],
  ['upa-dis', 'upa', 'dis-6u', 'P', 2, 'to teach, to instruct', 'taught'],
  ['a-dis', 'A', 'dis-6u', 'P', 2, 'to order, to command', 'ordered'],
  ['nir-dis', 'nir', 'dis-6u', 'P', 3, 'to point out, to specify', 'pointed out'],
  ['sam-dis', 'sam', 'dis-6u', 'P', 3, 'to send word, to instruct', 'instructed'],
  ['ni-ksip', 'ni', 'ksip-6u', 'P', 2, 'to put down, to deposit', 'put down'],
  ['pra-ksip', 'pra', 'ksip-6u', 'P', 3, 'to throw in', 'thrown in'],
  ['vi-ksip', 'vi', 'ksip-6u', 'P', 3, 'to scatter', 'scattered'],
  ['a-ksip', 'A', 'ksip-6u', 'P', 3, 'to object to; to draw away', 'objected to'],
  ['sam-ksip', 'sam', 'ksip-6u', 'P', 3, 'to abridge, to shorten', 'abridged'],
  ['ava-lok', 'ava', 'lok-10u', 'P', 2, 'to look at', 'looked at'],
  ['a-lok', 'A', 'lok-10u', 'P', 3, 'to behold', 'beheld'],
  ['vi-lok', 'vi', 'lok-10u', 'P', 3, 'to look at, to observe', 'observed'],
  // curādi
  ['pra-ksal', 'pra', 'ksal-10u', 'P', 1, 'to wash', 'washed'],
  ['ud-ghat', 'ud', 'ghat-10u', 'P', 1, 'to open', 'opened'],
  ['vi-cint', 'vi', 'cint-10u', 'P', 3, 'to consider, to reflect on', 'considered'],
  ['pari-pal', 'pari', 'pal-10u', 'P', 3, 'to protect, to maintain', 'protected'],
  ['prati-pal', 'prati', 'pal-10u', 'P', 3, 'to wait for; to protect', 'waited for'],
  ['vi-rac', 'vi', 'rac-10u', 'P', 3, 'to compose', 'composed'],
  ['sam-puj', 'sam', 'puj-10u', 'P', 3, 'to honour greatly', 'honoured'],
  ['pari-gan', 'pari', 'gan-10u', 'P', 3, 'to count up, to reckon', 'counted up'],
  // ह्वे, रुह्, नम्, आप्, स्मृ, यम्
  ['a-hve', 'A', 'hve-1u', 'P', 2, 'to call, to invite', 'called'],
  ['a-ruh', 'A', 'ruh-1p', 'P', 2, 'to climb, to mount', 'climbed'],
  ['ava-ruh', 'ava', 'ruh-1p', 'P', 2, 'to climb down, to descend', 'descended'],
  ['pra-nam', 'pra', 'nam-1p', 'P', 2, 'to bow down, to salute', 'bowed down'],
  ['pra-ap', 'pra', 'ap-5p', 'P', 2, 'to obtain, to reach', 'obtained'],
  ['sam-ap', 'sam', 'ap-5p', 'P', 4, 'to obtain fully; to complete', 'completed'],
  ['vi-smr', 'vi', 'smr-1p', 'P', 1, 'to forget', 'forgotten'],
  ['pra-yam', 'pra', 'yam-1p', 'P', 2, 'to give, to offer', 'given'],
  // क्री, ईक्ष्
  ['vi-kri', 'vi', 'kri-9u', 'A', 1, 'to sell', 'sold'],
  ['pari-iks', 'pari', 'iks-1a', 'A', 2, 'to examine, to test', 'examined'],
  ['prati-iks', 'prati', 'iks-1a', 'A', 1, 'to wait for', 'waited for'],
  ['nir-iks', 'nir', 'iks-1a', 'A', 2, 'to observe, to look at closely', 'observed'],
  ['apa-iks', 'apa', 'iks-1a', 'A', 2, 'to expect, to need', 'expected'],
  ['upa-iks', 'upa', 'iks-1a', 'A', 3, 'to neglect, to overlook', 'neglected'],
  ['sam-iks', 'sam', 'iks-1a', 'A', 3, 'to consider, to look at closely', 'considered'],
  ['ava-iks', 'ava', 'iks-1a', 'A', 3, 'to look at, to look after', 'looked at'],
  // चर्, पत्, पद्
  ['a-car', 'A', 'car-1p', 'P', 2, 'to practise, to behave', 'practised'],
  ['vi-car', 'vi', 'car-1p', 'P', 3, 'to wander about', 'wandered'],
  ['sam-car', 'sam', 'car-1p', 'P', 3, 'to move about', 'moved about'],
  ['sam-a-car', 'sam A', 'car-1p', 'P', 3, 'to practise, to do', 'practised'],
  ['ut-pat', 'ud', 'pat-1p', 'P', 2, 'to fly up, to jump up', 'flown up'],
  ['ni-pat', 'ni', 'pat-1p', 'P', 2, 'to fall down', 'fallen down'],
  ['a-pat', 'A', 'pat-1p', 'P', 3, 'to rush at; to befall', 'befallen'],
  ['ut-pad', 'ud', 'pad-4a', 'A', 3, 'to arise, to be produced', 'arisen'],
  ['prati-pad', 'prati', 'pad-4a', 'A', 4, 'to reach; to accept, to understand', 'accepted'],
  // रभ्, वृत्, काश्, शंस्, क्रम्
  ['a-rabh', 'A', 'rabh-1a', 'A', 2, 'to begin', 'begun'],
  ['pra-rabh', 'pra', 'rabh-1a', 'A', 3, 'to begin, to undertake', 'begun'],
  ['pra-vrt', 'pra', 'vrt-1a', 'A', 3, 'to proceed, to set about', 'proceeded'],
  ['ni-vrt', 'ni', 'vrt-1a', 'A', 3, 'to turn back, to cease', 'turned back'],
  ['pari-vrt', 'pari', 'vrt-1a', 'A', 3, 'to turn round, to change', 'changed'],
  ['pra-kas', 'pra', 'kas-1a', 'A', 2, 'to shine, to become visible', 'shone'],
  ['pra-sams', 'pra', 'sams-1p', 'P', 2, 'to praise', 'praised'],
  ['a-kram', 'A', 'kram-1p', 'P', 3, 'to attack, to step upon', 'attacked'],
  ['ati-kram', 'ati', 'kram-1p', 'P', 3, 'to cross, to transgress', 'crossed'],
  // कृष्, मिल्, त्यज्, तुष्, सद्
  ['a-krs', 'A', 'krs-1p', 'P', 2, 'to attract, to pull towards', 'attracted'],
  ['sam-mil', 'sam', 'mil-6p', 'P', 2, 'to meet, to come together', 'met'],
  ['pari-tyaj', 'pari', 'tyaj-1p', 'P', 2, 'to abandon, to give up', 'abandoned'],
  ['sam-tus', 'sam', 'tus-4p', 'P', 2, 'to be content', 'been content'],
  ['pra-sad', 'pra', 'sad-1p', 'P', 2, 'to be pleased, to become clear', 'been pleased'],
  ['ni-sad', 'ni', 'sad-1p', 'P', 3, 'to sit down', 'sat down'],
  ['vi-sad', 'vi', 'sad-1p', 'P', 3, 'to despair, to be dejected', 'despaired'],
  ['ava-sad', 'ava', 'sad-1p', 'P', 3, 'to sink down, to lose heart', 'sunk down'],
  // दा, धा
  ['a-da', 'A', 'da-3u', 'A', 3, 'to take, to receive', 'taken'],
  ['pra-da', 'pra', 'da-3u', 'P', 3, 'to give, to bestow', 'given'],
  ['vi-dha', 'vi', 'dha-3u', 'P', 3, 'to arrange, to do, to prescribe', 'arranged'],
  ['ni-dha', 'ni', 'dha-3u', 'P', 3, 'to put down, to deposit', 'put down'],
  ['pari-dha', 'pari', 'dha-3u', 'P', 2, 'to put on (clothes), to wear', 'put on'],
  ['abhi-dha', 'aBi', 'dha-3u', 'P', 4, 'to say, to name', 'said'],
  ['sam-dha', 'sam', 'dha-3u', 'P', 4, 'to join, to put together', 'joined'],
  // या, वस्, धाव्, तॄ
  ['a-ya', 'A', 'ya-2p', 'P', 2, 'to come', 'come'],
  ['nir-ya', 'nir', 'ya-2p', 'P', 3, 'to go out', 'gone out'],
  ['pra-ya', 'pra', 'ya-2p', 'P', 3, 'to set out', 'set out'],
  ['ni-vas', 'ni', 'vas-1p', 'P', 2, 'to dwell, to live (in)', 'dwelt'],
  ['pra-vas', 'pra', 'vas-1p', 'P', 3, 'to live abroad, to go on a journey', 'gone abroad'],
  ['upa-vas', 'upa', 'vas-1p', 'P', 3, 'to fast', 'fasted'],
  ['anu-dhav', 'anu', 'dhav-1p', 'P', 2, 'to run after', 'run after'],
  ['pra-dhav', 'pra', 'dhav-1p', 'P', 3, 'to run forth', 'run forth'],
  ['ava-tr', 'ava', 'tr-1p', 'P', 2, 'to descend, to come down', 'descended'],
  ['ut-tr', 'ud', 'tr-1p', 'P', 2, 'to cross over; to come out of the water', 'crossed over'],
  ['sam-tr', 'sam', 'tr-1p', 'P', 3, 'to cross over', 'crossed over'],
  ['vi-tr', 'vi', 'tr-1p', 'P', 3, 'to distribute, to bestow', 'distributed'],
  // ज्ञा, बुध्, नश्, मन्, यत्, युज्, चि, श्रम्, नन्द्, रक्ष्, वह्, लिख्, सृज्
  ['vi-jna', 'vi', 'jna-9p', 'P', 3, 'to know well, to discern', 'discerned'],
  ['anu-jna', 'anu', 'jna-9p', 'P', 3, 'to permit', 'permitted'],
  ['ava-jna', 'ava', 'jna-9p', 'P', 4, 'to despise', 'despised'],
  ['pra-budh', 'pra', 'budh-4a', 'A', 2, 'to wake up', 'woken up'],
  ['ava-budh', 'ava', 'budh-4a', 'A', 3, 'to understand, to become aware', 'understood'],
  ['vi-nas', 'vi', 'nas-4p', 'P', 2, 'to perish, to be destroyed', 'perished'],
  ['pra-nas', 'pra', 'nas-4p', 'P', 3, 'to be lost, to disappear', 'disappeared'],
  ['anu-man', 'anu', 'man-4a', 'A', 3, 'to approve, to consent', 'approved'],
  ['ava-man', 'ava', 'man-4a', 'A', 3, 'to despise, to disrespect', 'despised'],
  ['pra-yat', 'pra', 'yat-1a', 'A', 2, 'to endeavour, to try hard', 'endeavoured'],
  ['upa-yuj', 'upa', 'yuj-7u', 'A', 3, 'to use', 'used'],
  ['ni-yuj', 'ni', 'yuj-7u', 'A', 3, 'to appoint, to employ', 'appointed'],
  ['pra-yuj', 'pra', 'yuj-7u', 'A', 3, 'to employ, to use', 'employed'],
  ['sam-ci', 'sam', 'ci-5u', 'P', 3, 'to accumulate', 'accumulated'],
  ['nis-ci', 'nir', 'ci-5u', 'P', 3, 'to ascertain, to decide', 'decided'],
  ['vi-sram', 'vi', 'sram-4p', 'P', 2, 'to rest', 'rested'],
  ['pari-sram', 'pari', 'sram-4p', 'P', 3, 'to toil, to exert oneself', 'toiled'],
  ['abhi-nand', 'aBi', 'nand-1p', 'P', 2, 'to welcome, to congratulate', 'welcomed'],
  ['sam-raks', 'sam', 'raks-1p', 'P', 3, 'to protect, to preserve', 'protected'],
  ['pra-vah', 'pra', 'vah-1u', 'P', 3, 'to flow forth', 'flowed'],
  ['ud-vah', 'ud', 'vah-1u', 'P', 4, 'to carry up; to marry', 'married'],
  ['ut-likh', 'ud', 'likh-6p', 'P', 3, 'to mention; to scratch', 'mentioned'],
  ['vi-likh', 'vi', 'likh-6p', 'P', 4, 'to scratch, to draw', 'scratched'],
  ['vi-srj', 'vi', 'srj-6p', 'P', 3, 'to send away, to let go', 'sent away'],
  ['ut-srj', 'ud', 'srj-6p', 'P', 4, 'to give up, to let loose', 'given up'],
  ['abhi-sic', 'aBi', 'sic-6u', 'P', 4, 'to anoint, to consecrate', 'anointed'],
  ['pra-cal', 'pra', 'cal-1p', 'P', 3, 'to set out; to be in motion', 'set out'],
  ['vi-cal', 'vi', 'cal-1p', 'P', 3, 'to waver, to move away', 'wavered'],
];

export const PREFIXED_SPECS: PrefixedSpec[] = ROWS.map(([id, prefixes, base, pada, level, en, pp]) => ({ id, prefixes: prefixes.split(' '), base, pada, level, en, pp }));
