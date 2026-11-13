/**
 * Curated list of dhātus for the dhatu pack. This is the ONLY hand-written input of the
 * generator, and it contains no conjugated forms: every form comes from the oracles.
 *
 * Columns: id · dhātupāṭha index (ashtadhyayi.com / SanskritVerb numbering) · root as taught ·
 * gaṇa · pada taught to learners · level · English gloss · options.
 *
 * `pada` is the pada learners are taught (it may be narrower than the dhātupāṭha: धाव् is
 * ubhayapadī in the dhātupāṭha but taught as धावति). 'U' = both padas are generated.
 */
import type { Lakara, Level, Pada } from '../../../src/content/types';

export interface DhatuSpec {
  id: string;
  baseindex: string;
  dhatu: string;
  gana: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  pada: 'P' | 'A' | 'U';
  level: Level;
  en: string;
  /** Heritage root keys when the automatic match (by laṭ 3sg form) is ambiguous or incomplete. */
  heritage?: string[];
  /** SanskritVerb root key (`gaṇa|upadeśa`, see svKey) when its dhātupāṭha reads the root differently. */
  sv?: string;
  /** Extra Heritage roots to consult for participles only. */
  heritageKrt?: string[];
  /** Extra DCS lemmas under which this root's forms are filed. */
  dcs?: string[];
  /** Accept Heritage "passive" rows as ātmanepada (roots whose -ya- present Heritage files under the passive: म्रियते). */
  heritagePassive?: boolean;
  /** Per-lakāra pada override (e.g. मृ: laṭ Ā but lṛṭ P). */
  padaByLakara?: Partial<Record<Lakara, Pada[]>>;
  /** Forms (Devanagari) to put first in their cell when the cell has several accepted forms. */
  prefer?: string[];
  /** Oracle alternates that must not be shipped even if cross-confirmed (with the reason in README). */
  exclude?: string[];
  note?: string;
}

type Row = [id: string, baseindex: string, dhatu: string, gana: DhatuSpec['gana'], pada: DhatuSpec['pada'], level: Level, en: string, opts?: Partial<DhatuSpec>];

const ROWS: Row[] = [
  // ── gaṇa 1 (bhvādi) ─────────────────────────────────────────────────────────
  ['bhu-1p', '01.0001', 'भू', 1, 'P', 1, 'to be, to become'],
  ['path-1p', '01.0381', 'पठ्', 1, 'P', 1, 'to read, to study'],
  ['gam-1p', '01.1137', 'गम्', 1, 'P', 1, 'to go'],
  ['vad-1p', '01.1164', 'वद्', 1, 'P', 1, 'to speak, to say'],
  ['khad-1p', '01.0051', 'खाद्', 1, 'P', 1, 'to eat'],
  ['pa-1p', '01.1074', 'पा', 1, 'P', 1, 'to drink'],
  ['drs-1p', '01.1143', 'दृश्', 1, 'P', 1, 'to see', { heritageKrt: ['dfS#1'] }],
  ['stha-1p', '01.1077', 'स्था', 1, 'P', 1, 'to stand, to stay'],
  ['ni-1u', '01.1049', 'नी', 1, 'U', 1, 'to lead, to take along'],
  ['hr-1u', '01.1046', 'हृ', 1, 'U', 2, 'to take away, to carry off'],
  ['smr-1p', '01.1082', 'स्मृ', 1, 'P', 1, 'to remember'],
  ['ji-1p', '01.0642', 'जि', 1, 'P', 2, 'to conquer, to win'],
  ['cal-1p', '01.0966', 'चल्', 1, 'P', 1, 'to move, to walk'],
  ['dhav-1p', '01.0685', 'धाव्', 1, 'P', 1, 'to run', { note: 'ubhayapadī in the dhātupāṭha; taught in parasmaipada (धावति).' }],
  ['krid-1p', '01.0405', 'क्रीड्', 1, 'P', 1, 'to play'],
  ['has-1p', '01.0822', 'हस्', 1, 'P', 1, 'to laugh'],
  ['khel-1p', '01.0617', 'खेल्', 1, 'P', 1, 'to play'],
  ['pat-1p', '01.0979', 'पत्', 1, 'P', 1, 'to fall'],
  ['raks-1p', '01.0746', 'रक्ष्', 1, 'P', 1, 'to protect'],
  ['nam-1p', '01.1136', 'नम्', 1, 'P', 1, 'to bow, to salute'],
  ['tyaj-1p', '01.1141', 'त्यज्', 1, 'P', 1, 'to abandon, to give up'],
  ['vas-1p', '01.1160', 'वस्', 1, 'P', 1, 'to dwell, to live'],
  ['pac-1u', '01.1151', 'पच्', 1, 'U', 1, 'to cook'],
  ['yaj-1u', '01.1157', 'यज्', 1, 'U', 3, 'to sacrifice, to worship'],
  ['sev-1a', '01.0574', 'सेव्', 1, 'A', 2, 'to serve'],
  ['labh-1a', '01.1130', 'लभ्', 1, 'A', 2, 'to get, to obtain'],
  ['vrt-1a', '01.0862', 'वृत्', 1, 'A', 2, 'to be, to exist, to happen'],
  ['vrdh-1a', '01.0863', 'वृध्', 1, 'A', 2, 'to grow, to increase', { prefer: ['वर्धित्वा'] }],
  ['bhas-1a', '01.0696', 'भाष्', 1, 'A', 2, 'to speak'],
  ['iks-1a', '01.0694', 'ईक्ष्', 1, 'A', 2, 'to see, to look at'],
  ['mud-1a', '01.0016', 'मुद्', 1, 'A', 2, 'to rejoice, to be glad'],
  ['subh-1a', '01.0853', 'शुभ्', 1, 'A', 2, 'to shine, to look beautiful'],
  ['ram-1a', '01.0989', 'रम्', 1, 'A', 2, 'to delight, to enjoy'],
  ['yat-1a', '01.0030', 'यत्', 1, 'A', 2, 'to strive, to try'],
  ['kamp-1a', '01.0435', 'कम्प्', 1, 'A', 2, 'to tremble, to shake'],
  ['sah-1a', '01.0988', 'सह्', 1, 'A', 2, 'to bear, to endure'],
  ['vand-1a', '01.0011', 'वन्द्', 1, 'A', 2, 'to salute, to praise'],
  ['yac-1u', '01.1001', 'याच्', 1, 'U', 2, 'to ask for, to beg'],
  ['siks-1a', '01.0689', 'शिक्ष्', 1, 'A', 2, 'to learn'],
  ['jiv-1p', '01.0643', 'जीव्', 1, 'P', 1, 'to live'],
  ['gai-1p', '01.1065', 'गै', 1, 'P', 1, 'to sing'],
  ['dhyai-1p', '01.1056', 'ध्यै', 1, 'P', 2, 'to meditate, to think of'],
  ['ghra-1p', '01.1075', 'घ्रा', 1, 'P', 2, 'to smell'],
  ['dah-1p', '01.1146', 'दह्', 1, 'P', 2, 'to burn'],
  ['arh-1p', '01.0841', 'अर्ह्', 1, 'P', 3, 'to deserve, to be worthy'],
  ['ruh-1p', '01.0995', 'रुह्', 1, 'P', 2, 'to grow, to climb'],
  ['tr-1p', '01.1124', 'तॄ', 1, 'P', 2, 'to cross, to swim'],
  ['nand-1p', '01.0070', 'नन्द्', 1, 'P', 2, 'to rejoice'],
  ['nind-1p', '01.0069', 'निन्द्', 1, 'P', 2, 'to blame'],
  ['krand-1p', '01.0074', 'क्रन्द्', 1, 'P', 2, 'to cry out'],
  ['garj-1p', '01.0258', 'गर्ज्', 1, 'P', 2, 'to roar'],
  ['at-1p', '01.0332', 'अट्', 1, 'P', 2, 'to wander'],
  ['arc-1p', '01.0232', 'अर्च्', 1, 'P', 2, 'to worship'],
  ['vah-1u', '01.1159', 'वह्', 1, 'U', 2, 'to carry, to flow'],
  ['bhaj-1u', '01.1153', 'भज्', 1, 'U', 3, 'to worship, to share'],
  ['sri-1u', '01.1044', 'श्रि', 1, 'U', 3, 'to resort to'],
  ['dhr-1u', '01.1047', 'धृ', 1, 'U', 3, 'to hold, to bear'],
  ['hve-1u', '01.1163', 'ह्वे', 1, 'U', 2, 'to call'],
  ['sad-1p', '01.0990', 'सद्', 1, 'P', 3, 'to sit; to sink, to despair'],
  ['ruc-1a', '01.0847', 'रुच्', 1, 'A', 2, 'to please, to be liked'],
  ['ksam-1a', '01.0510', 'क्षम्', 1, 'A', 2, 'to forgive, to endure'],
  ['sank-1a', '01.0091', 'शङ्क्', 1, 'A', 2, 'to doubt, to suspect'],
  ['kurd-1a', '01.0021', 'कूर्द्', 1, 'A', 2, 'to jump'],
  ['tvar-1a', '01.0884', 'त्वर्', 1, 'A', 2, 'to hurry'],
  ['dams-1p', '01.1144', 'दंश्', 1, 'P', 2, 'to bite'],
  ['suc-1p', '01.0210', 'शुच्', 1, 'P', 3, 'to grieve'],
  ['vap-1u', '01.1158', 'वप्', 1, 'U', 3, 'to sow'],
  ['bhram-1p', '01.0985', 'भ्रम्', 1, 'P', 2, 'to wander, to roam'],
  ['phal-1p', '01.0608', 'फल्', 1, 'P', 2, 'to bear fruit'],
  ['car-1p', '01.0640', 'चर्', 1, 'P', 2, 'to move about; to graze'],
  ['tap-1p', '01.1140', 'तप्', 1, 'P', 3, 'to heat; to practise austerity'],
  ['jap-1p', '01.0463', 'जप्', 1, 'P', 2, 'to mutter, to repeat (a mantra)'],
  ['jval-1p', '01.0916', 'ज्वल्', 1, 'P', 2, 'to burn, to blaze'],
  ['vanch-1p', '01.0236', 'वाञ्छ्', 1, 'P', 3, 'to wish'],
  ['kanks-1p', '01.0760', 'काङ्क्ष्', 1, 'P', 3, 'to desire'],
  ['budh-1p', '01.0994', 'बुध्', 1, 'P', 3, 'to know, to understand'],
  ['sru-1p', '01.1092', 'श्रु', 1, 'P', 1, 'to hear, to listen', {
    note: 'भ्वादि in the Pāṇinian dhātupāṭha (श्रुवः शृ च 3.1.74 gives the श्नु vikaraṇa); many school grammars list it under class 5 because it conjugates like सु.',
  }],
  ['krs-1p', '01.1145', 'कृष्', 1, 'P', 2, 'to pull, to drag'],
  ['kuj-1p', '01.0254', 'कूज्', 1, 'P', 2, 'to coo, to warble'],
  ['yam-1p', '01.1139', 'यम्', 1, 'P', 3, 'to restrain; (with प्र) to give'],
  ['lamb-1a', '01.0439', 'लम्ब्', 1, 'A', 3, 'to hang down'],
  ['cest-1a', '01.0289', 'चेष्ट्', 1, 'A', 3, 'to act, to make an effort'],
  ['rabh-1a', '01.1129', 'रभ्', 1, 'A', 3, 'to begin (with आ: आरभते)'],
  ['kas-1a', '01.0734', 'काश्', 1, 'A', 3, 'to shine (with प्र: प्रकाशते)'],
  ['sams-1p', '01.0829', 'शंस्', 1, 'P', 3, 'to praise (with प्र: प्रशंसति)'],
  ['kram-1p', '01.0545', 'क्रम्', 1, 'P', 3, 'to step, to stride'],
  ['edh-1a', '01.0002', 'एध्', 1, 'A', 4, 'to grow, to prosper'],
  // ── gaṇa 2 (adādi) ──────────────────────────────────────────────────────────
  ['as-2p', '02.0060', 'अस्', 2, 'P', 1, 'to be'],
  ['ad-2p', '02.0001', 'अद्', 2, 'P', 3, 'to eat'],
  ['han-2p', '02.0002', 'हन्', 2, 'P', 3, 'to kill, to strike'],
  ['ya-2p', '02.0044', 'या', 2, 'P', 2, 'to go', { prefer: ['अयान्'] }],
  ['sna-2p', '02.0047', 'स्ना', 2, 'P', 2, 'to bathe', { prefer: ['अस्नान्'] }],
  ['bru-2u', '02.0039', 'ब्रू', 2, 'U', 3, 'to speak, to say', { heritageKrt: ['vac'], dcs: ['vac'], note: 'ब्रुवो वचिः (2.4.53): the ārdhadhātuka forms (lṛṭ वक्ष्यति, उक्त्वा, वक्तुम्, उक्तः) are supplied by वच्.' }],
  ['aas-2a', '02.0011', 'आस्', 2, 'A', 3, 'to sit'],
  ['si-2a', '02.0026', 'शी', 2, 'A', 3, 'to lie down, to sleep'],
  ['i-2p', '02.0040', 'इ', 2, 'P', 3, 'to go'],
  ['vid-2p', '02.0059', 'विद्', 2, 'P', 3, 'to know', { heritage: ['vid#1', 'csl:vid:2'] }],
  ['rud-2p', '02.0062', 'रुद्', 2, 'P', 3, 'to weep', { prefer: ['अरोदीत्', 'अरोदीः'] }],
  ['svap-2p', '02.0063', 'स्वप्', 2, 'P', 3, 'to sleep', { prefer: ['अस्वपीत्', 'अस्वपीः'] }],
  ['jagr-2p', '02.0067', 'जागृ', 2, 'P', 3, 'to be awake'],
  ['sas-2p', '02.0070', 'शास्', 2, 'P', 4, 'to rule, to instruct'],
  ['stu-2u', '02.0038', 'स्तु', 2, 'U', 4, 'to praise'],
  ['duh-2u', '02.0004', 'दुह्', 2, 'U', 4, 'to milk'],
  ['dvis-2u', '02.0003', 'द्विष्', 2, 'U', 4, 'to hate'],
  // ── gaṇa 3 (juhotyādi) ──────────────────────────────────────────────────────
  ['da-3u', '03.0010', 'दा', 3, 'U', 1, 'to give'],
  ['dha-3u', '03.0011', 'धा', 3, 'U', 3, 'to put, to hold'],
  ['hu-3p', '03.0001', 'हु', 3, 'P', 4, 'to offer (into the fire)'],
  ['bhi-3p', '03.0002', 'भी', 3, 'P', 3, 'to fear'],
  ['ha-3p', '03.0009', 'हा', 3, 'P', 4, 'to abandon'],
  ['bhr-3u', '03.0006', 'भृ', 3, 'U', 4, 'to bear, to support'],
  ['ma-3a', '03.0007', 'मा', 3, 'A', 4, 'to measure'],
  // ── gaṇa 4 (divādi) ─────────────────────────────────────────────────────────
  ['div-4p', '04.0001', 'दिव्', 4, 'P', 3, 'to play (dice); to shine'],
  ['nrt-4p', '04.0010', 'नृत्', 4, 'P', 1, 'to dance'],
  ['nas-4p', '04.0091', 'नश्', 4, 'P', 2, 'to perish, to be lost'],
  ['tus-4p', '04.0081', 'तुष्', 4, 'P', 2, 'to be pleased'],
  ['kup-4p', '04.0146', 'कुप्', 4, 'P', 2, 'to be angry'],
  ['jan-4a', '04.0044', 'जन्', 4, 'A', 2, 'to be born, to arise'],
  ['man-4a', '04.0073', 'मन्', 4, 'A', 2, 'to think, to consider'],
  ['yudh-4a', '04.0069', 'युध्', 4, 'A', 2, 'to fight'],
  ['vid-4a', '04.0067', 'विद्', 4, 'A', 2, 'to exist, to be found'],
  ['krudh-4p', '04.0086', 'क्रुध्', 4, 'P', 2, 'to be angry'],
  ['sidh-4p', '04.0089', 'सिध्', 4, 'P', 3, 'to succeed, to be accomplished'],
  ['sus-4p', '04.0080', 'शुष्', 4, 'P', 3, 'to dry up'],
  ['trp-4p', '04.0092', 'तृप्', 4, 'P', 3, 'to be satisfied'],
  ['hrs-4p', '04.0142', 'हृष्', 4, 'P', 3, 'to rejoice, to be thrilled'],
  ['muh-4p', '04.0095', 'मुह्', 4, 'P', 3, 'to be confused, to be deluded'],
  ['snih-4p', '04.0097', 'स्निह्', 4, 'P', 3, 'to feel affection, to love'],
  ['sam-4p', '04.0098', 'शम्', 4, 'P', 3, 'to become calm'],
  ['sram-4p', '04.0101', 'श्रम्', 4, 'P', 3, 'to be tired, to toil'],
  ['pus-4p', '04.0079', 'पुष्', 4, 'P', 3, 'to nourish, to thrive'],
  ['lubh-4p', '04.0153', 'लुभ्', 4, 'P', 3, 'to covet, to be greedy'],
  ['sudh-4p', '04.0088', 'शुध्', 4, 'P', 3, 'to become pure'],
  ['budh-4a', '04.0068', 'बुध्', 4, 'A', 3, 'to know, to awaken'],
  ['dip-4a', '04.0045', 'दीप्', 4, 'A', 3, 'to shine, to blaze'],
  ['pad-4a', '04.0065', 'पद्', 4, 'A', 3, 'to go, to attain'],
  ['khid-4a', '04.0066', 'खिद्', 4, 'A', 3, 'to be sad, to be distressed'],
  ['as-4p', '04.0106', 'अस्', 4, 'P', 4, 'to throw'],
  // ── gaṇa 5 (svādi) ──────────────────────────────────────────────────────────
  ['su-5u', '05.0001', 'सु', 5, 'U', 4, 'to press out (soma)'],
  ['ap-5p', '05.0016', 'आप्', 5, 'P', 3, 'to obtain, to reach'],
  ['sak-5p', '05.0017', 'शक्', 5, 'P', 1, 'to be able'],
  ['ci-5u', '05.0005', 'चि', 5, 'U', 3, 'to gather, to collect'],
  ['vr-5u', '05.0008', 'वृ', 5, 'U', 4, 'to choose; to cover'],
  // ── gaṇa 6 (tudādi) ─────────────────────────────────────────────────────────
  ['tud-6u', '06.0001', 'तुद्', 6, 'U', 3, 'to strike, to hurt'],
  ['likh-6p', '06.0092', 'लिख्', 6, 'P', 1, 'to write'],
  ['sprs-6p', '06.0158', 'स्पृश्', 6, 'P', 1, 'to touch'],
  ['prach-6p', '06.0149', 'प्रच्छ्', 6, 'P', 1, 'to ask'],
  ['is-6p', '06.0078', 'इष्', 6, 'P', 1, 'to wish, to want'],
  ['mil-6p', '06.0091', 'मिल्', 6, 'P', 1, 'to meet, to join'],
  ['muc-6u', '06.0166', 'मुच्', 6, 'U', 2, 'to release, to free'],
  ['ksip-6u', '06.0005', 'क्षिप्', 6, 'U', 2, 'to throw'],
  ['vis-6p', '06.0160', 'विश्', 6, 'P', 2, 'to enter'],
  ['sic-6u', '06.0170', 'सिच्', 6, 'U', 2, 'to sprinkle, to water'],
  ['mr-6a', '06.0139', 'मृ', 6, 'A', 2, 'to die', {
    padaByLakara: { lrt: ['P'] },
    heritagePassive: true,
    note: 'म्रियतेर्लुङ्लिङोश्च (1.3.61): ātmanepada in laṭ, laṅ, loṭ, vidhiliṅ (म्रियते) but parasmaipada in lṛṭ (मरिष्यति).',
  }],
  ['krs-6u', '06.0006', 'कृष्', 6, 'U', 3, 'to plough'],
  ['srj-6p', '06.0150', 'सृज्', 6, 'P', 3, 'to create, to let go'],
  ['dis-6u', '06.0003', 'दिश्', 6, 'U', 3, 'to point out, to show'],
  ['lip-6u', '06.0169', 'लिप्', 6, 'U', 3, 'to smear, to anoint'],
  ['krt-6p', '06.0171', 'कृत्', 6, 'P', 3, 'to cut'],
  ['lajj-6a', '06.0011', 'लज्ज्', 6, 'A', 2, 'to be ashamed, to be shy'],
  ['vid-6u', '06.0168', 'विद्', 6, 'U', 3, 'to find, to obtain', { prefer: ['वेत्स्यति', 'वेत्स्यतः', 'वेत्स्यन्ति', 'वेत्स्यसि', 'वेत्स्यथः', 'वेत्स्यथ', 'वेत्स्यामि', 'वेत्स्यावः', 'वेत्स्यामः', 'वेत्स्यते', 'वेत्स्येते', 'वेत्स्यन्ते', 'वेत्स्यसे', 'वेत्स्येथे', 'वेत्स्यध्वे', 'वेत्स्ये', 'वेत्स्यावहे', 'वेत्स्यामहे'] }],
  ['kr-6p', '06.0145', 'कॄ', 6, 'P', 4, 'to scatter'],
  // ── gaṇa 7 (rudhādi) ────────────────────────────────────────────────────────
  ['rudh-7u', '07.0001', 'रुध्', 7, 'U', 4, 'to obstruct, to stop'],
  ['bhuj-7u', '07.0017', 'भुज्', 7, 'U', 3, 'to eat, to enjoy (ātmanepada); to protect (parasmaipada)', {
    note: 'भुजोऽनवने (1.3.66): ātmanepada (भुङ्क्ते) in the sense "eat, enjoy"; parasmaipada (भुनक्ति) only in the sense "protect".',
  }],
  ['yuj-7u', '07.0007', 'युज्', 7, 'U', 4, 'to join, to yoke'],
  ['bhid-7u', '07.0002', 'भिद्', 7, 'U', 4, 'to split, to break'],
  ['chid-7u', '07.0003', 'छिद्', 7, 'U', 4, 'to cut'],
  ['pis-7p', '07.0015', 'पिष्', 7, 'P', 4, 'to grind'],
  ['hims-7p', '07.0019', 'हिंस्', 7, 'P', 4, 'to injure'],
  // ── gaṇa 8 (tanādi) ─────────────────────────────────────────────────────────
  ['tan-8u', '08.0001', 'तन्', 8, 'U', 4, 'to stretch, to spread'],
  ['kr-8u', '08.0010', 'कृ', 8, 'U', 1, 'to do, to make'],
  // ── gaṇa 9 (kryādi) ─────────────────────────────────────────────────────────
  ['kri-9u', '09.0001', 'क्री', 9, 'U', 1, 'to buy'],
  ['grah-9u', '09.0071', 'ग्रह्', 9, 'U', 2, 'to take, to grasp'],
  ['jna-9p', '09.0043', 'ज्ञा', 9, 'P', 1, 'to know', { note: 'Parasmaipada in the dhātupāṭha; ātmanepada (जानीते) arises only by special rules (1.3.44–46, 1.3.76) and is not listed here.' }],
  ['bandh-9p', '09.0044', 'बन्ध्', 9, 'P', 2, 'to bind, to tie'],
  ['pu-9u', '09.0014', 'पू', 9, 'U', 4, 'to purify'],
  ['as-9p', '09.0059', 'अश्', 9, 'P', 3, 'to eat'],
  // ── gaṇa 10 (curādi) ────────────────────────────────────────────────────────
  ['cur-10u', '10.0001', 'चुर्', 10, 'U', 2, 'to steal'],
  ['cint-10u', '10.0002', 'चिन्त्', 10, 'U', 1, 'to think'],
  ['kath-10u', '10.0389', 'कथ्', 10, 'U', 1, 'to tell, to narrate'],
  ['gan-10u', '10.0391', 'गण्', 10, 'U', 1, 'to count'],
  ['puj-10u', '10.0144', 'पूज्', 10, 'U', 1, 'to worship, to honour'],
  ['rac-10u', '10.0403', 'रच्', 10, 'U', 2, 'to compose, to arrange'],
  ['bhaks-10u', '10.0033', 'भक्ष्', 10, 'U', 1, 'to eat'],
  ['tad-10u', '10.0064', 'तड्', 10, 'U', 2, 'to beat, to strike'],
  ['pal-10u', '10.0098', 'पाल्', 10, 'U', 2, 'to protect, to look after', { sv: '10|pala!', note: 'SanskritVerb reads this root as पल रक्षणे; its forms (पालयति …) are the same verb.' }],
  ['ksal-10u', '10.0086', 'क्षल्', 10, 'U', 1, 'to wash'],
  ['sprh-10u', '10.0410', 'स्पृह्', 10, 'U', 3, 'to long for'],
  ['dand-10u', '10.0472', 'दण्ड्', 10, 'U', 2, 'to punish'],
  ['ghus-10u', '10.0251', 'घुष्', 10, 'U', 3, 'to proclaim, to announce'],
  ['pid-10u', '10.0017', 'पीड्', 10, 'U', 2, 'to oppress, to hurt'],
  ['varn-10u', '10.0025', 'वर्ण्', 10, 'U', 3, 'to describe'],
  ['bhus-10u', '10.0255', 'भूष्', 10, 'U', 2, 'to adorn, to decorate'],
  ['tul-10u', '10.0088', 'तुल्', 10, 'U', 3, 'to weigh'],
  ['santv-10u', '10.0051', 'सान्त्व्', 10, 'U', 3, 'to console'],
  ['suc-10u', '10.0412', 'सूच्', 10, 'U', 3, 'to indicate'],
  ['lok-10u', '10.0307', 'लोक्', 10, 'U', 3, 'to look, to see'],
  ['marg-10u', '10.0384', 'मार्ग्', 10, 'U', 3, 'to seek, to search'],
  ['ghat-10u', '10.0248', 'घट्', 10, 'U', 3, 'to put together; (with उद्) to open'],
  ['arj-10u', '10.0250', 'अर्ज्', 10, 'U', 3, 'to earn, to acquire'],
];

export const DHATU_SPECS: DhatuSpec[] = ROWS.map(([id, baseindex, dhatu, gana, pada, level, en, opts]) => ({ id, baseindex, dhatu, gana, pada, level, en, ...opts }));
