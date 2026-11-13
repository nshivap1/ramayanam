/**
 * Sandhi forms that are correct but that the engine (`joinSandhiDeva`) does not produce: lexical exceptions, gati /
 * upasarga specials and word-internal ṇatva / ṣatva. They are deliberately kept OUT of `SANDHI_EXAMPLES` (every
 * item there is engine-confirmed) and are not re-exported from the pack index as playable content.
 * Each case is logged in the engine issue list (sanskrit-engine-issues.md). Hand-authored; where `provenance` says
 * `oracle:mw-headword`, data.test.ts re-checks that the resulting word is a Monier-Williams headword.
 */
import type { PendingSandhiExample } from './types';

const SRC = 'Aṣṭādhyāyī / Siddhāntakaumudī standard examples (hand-authored)';
const P = { source: SRC, verifiedBy: ['oracle:mw-headword'] };
const PV = { source: SRC, verifiedBy: [] as string[] };

export const SANDHI_PENDING_ENGINE: readonly PendingSandhiExample[] = [
  { id: 'sandhi-pending-01', first: 'नमः', second: 'कारः', result: 'नमस्कारः', sutra: { ref: '8.3.40', text: 'नमस्पुरसोर्गत्योः' }, family: 'visarga', level: 4, en: 'salutation', engineGave: 'नमःकारः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-02', first: 'पुरः', second: 'कारः', result: 'पुरस्कारः', sutra: { ref: '8.3.40', text: 'नमस्पुरसोर्गत्योः' }, family: 'visarga', level: 4, en: 'honour, reward (placing in front)', engineGave: 'पुरःकारः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-03', first: 'तिरः', second: 'कारः', result: 'तिरस्कारः', sutra: { ref: '8.3.42', text: 'तिरसोऽन्यतरस्याम्' }, family: 'visarga', level: 4, en: 'contempt, reproach', engineGave: 'तिरःकारः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-04', first: 'भाः', second: 'करः', result: 'भास्करः', sutra: { ref: '8.3.48', text: 'कस्कादिषु च' }, family: 'visarga', level: 4, en: 'the sun (light-maker)', engineGave: 'भाःकरः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-05', first: 'श्रेयः', second: 'करः', result: 'श्रेयस्करः', sutra: { ref: '8.3.46', text: 'अतः कृकमिकंसकुम्भपात्रकुशाकर्णीष्वनव्ययस्य' }, family: 'visarga', level: 4, en: 'conducive to welfare', engineGave: 'श्रेयःकरः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-06', first: 'यशः', second: 'करः', result: 'यशस्करः', sutra: { ref: '8.3.46', text: 'अतः कृकमिकंसकुम्भपात्रकुशाकर्णीष्वनव्ययस्य' }, family: 'visarga', level: 4, en: 'bringing fame', engineGave: 'यशःकरः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-07', first: 'अयः', second: 'कारः', result: 'अयस्कारः', sutra: { ref: '8.3.46', text: 'अतः कृकमिकंसकुम्भपात्रकुशाकर्णीष्वनव्ययस्य' }, family: 'visarga', level: 4, en: 'blacksmith (iron-worker)', engineGave: 'अयःकारः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-08', first: 'सम्', second: 'कृतम्', result: 'संस्कृतम्', sutra: { ref: '6.1.137', text: 'सम्परिभ्यां करोतौ भूषणे' }, family: 'vyanjana', level: 4, en: 'refined, perfected; Sanskrit', engineGave: 'संकृतम्', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-09', first: 'सम्', second: 'कारः', result: 'संस्कारः', sutra: { ref: '6.1.137', text: 'सम्परिभ्यां करोतौ भूषणे' }, family: 'vyanjana', level: 4, en: 'refinement, a rite of passage', engineGave: 'संकारः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-10', first: 'प्र', second: 'नामः', result: 'प्रणामः', sutra: { ref: '8.4.14', text: 'उपसर्गादसमासेऽपि णोपदेशस्य' }, family: 'vyanjana', level: 4, en: 'bowing, salutation', engineGave: 'प्रनामः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-11', first: 'परि', second: 'नामः', result: 'परिणामः', sutra: { ref: '8.4.14', text: 'उपसर्गादसमासेऽपि णोपदेशस्य' }, family: 'vyanjana', level: 4, en: 'transformation, result', engineGave: 'परिनामः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-12', first: 'राम', second: 'अयनम्', result: 'रामायणम्', sutra: { ref: '8.4.3', text: 'पूर्वपदात्संज्ञायामगः' }, family: 'vyanjana', level: 4, en: 'the Rāmāyaṇa (the course of Rāma)', engineGave: 'रामायनम्', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-13', first: 'नि', second: 'सिद्धः', result: 'निषिद्धः', sutra: { ref: '8.3.65', text: 'उपसर्गात्सुनोतिसुवतिस्यतिस्तौतिस्तोभतिस्थासेनयसेधसिचसञ्जस्वञ्जाम्' }, family: 'vyanjana', level: 4, en: 'forbidden', engineGave: 'निसिद्धः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-14', first: 'अभि', second: 'सेकः', result: 'अभिषेकः', sutra: { ref: '8.3.65', text: 'उपसर्गात्सुनोतिसुवतिस्यतिस्तौतिस्तोभतिस्थासेनयसेधसिचसञ्जस्वञ्जाम्' }, family: 'vyanjana', level: 4, en: 'consecration by sprinkling', engineGave: 'अभिसेकः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-15', first: 'वि', second: 'समः', result: 'विषमः', sutra: { ref: '8.3.88', text: 'सुविनिर्दुर्भ्यः सुपिसूतिसमाः' }, family: 'vyanjana', level: 4, en: 'uneven, difficult', engineGave: 'विसमः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-16', first: 'युधि', second: 'स्थिरः', result: 'युधिष्ठिरः', sutra: { ref: '8.3.95', text: 'गवियुधिभ्यां स्थिरः' }, family: 'vyanjana', level: 4, en: 'Yudhiṣṭhira (firm in battle)', engineGave: 'युधिस्थिरः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-17', first: 'मातृ', second: 'स्वसा', result: 'मातृष्वसा', sutra: { ref: '8.3.84', text: 'मातृपितृभ्यां स्वसा' }, family: 'vyanjana', level: 5, en: "mother's sister", engineGave: 'मातृस्वसा', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-18', first: 'स्व', second: 'ईरम्', result: 'स्वैरम्', sutra: { ref: '6.1.89 वा.', text: 'स्वादीरेरिणोः' }, family: 'svara', level: 5, en: 'at will, freely', engineGave: 'स्वेरम्', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-19', first: 'प्र', second: 'ऊढः', result: 'प्रौढः', sutra: { ref: '6.1.89 वा.', text: 'प्रादूहोढोढ्येषैष्येषु' }, family: 'svara', level: 5, en: 'full-grown, mature', engineGave: 'प्रोढः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-20', first: 'मनस्', second: 'ईषा', result: 'मनीषा', sutra: { ref: '6.1.94 वा.', text: 'शकन्ध्वादिषु पररूपं वाच्यम्' }, family: 'svara', level: 5, en: 'thought, wisdom', engineGave: 'मन ईषा', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-21', first: 'कुल', second: 'अटा', result: 'कुलटा', sutra: { ref: '6.1.94 वा.', text: 'शकन्ध्वादिषु पररूपं वाच्यम्' }, family: 'svara', level: 5, en: 'an unchaste woman (wandering from family to family)', engineGave: 'कुलाटा', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-22', first: 'पतत्', second: 'अञ्जलिः', result: 'पतञ्जलिः', sutra: { ref: '6.1.94 वा.', text: 'शकन्ध्वादिषु पररूपं वाच्यम्' }, family: 'svara', level: 5, en: 'Patañjali', engineGave: 'पतदञ्जलिः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-23', first: 'गो', second: 'अक्षः', result: 'गवाक्षः', sutra: { ref: '6.1.123', text: 'अवङ् स्फोटायनस्य' }, family: 'svara', level: 5, en: 'a round window (bull’s eye)', engineGave: 'गोऽक्षः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-24', first: 'गो', second: 'इन्द्रः', result: 'गवेन्द्रः', sutra: { ref: '6.1.124', text: 'इन्द्रे च' }, family: 'svara', level: 5, en: 'lord of cattle; an excellent bull', engineGave: 'गविन्द्रः', pendingEngine: true, provenance: P },
  { id: 'sandhi-pending-25', first: 'प्र', second: 'एजते', result: 'प्रेजते', sutra: { ref: '6.1.94', text: 'एङि पररूपम्' }, family: 'svara', level: 5, en: '(it) trembles greatly', engineGave: 'प्रैजते', pendingEngine: true, provenance: PV },
  { id: 'sandhi-pending-26', first: 'प्र', second: 'ऋच्छति', result: 'प्रार्च्छति', sutra: { ref: '6.1.91', text: 'उपसर्गादृति धातौ' }, family: 'svara', level: 5, en: '(he) goes forth', engineGave: 'प्रर्च्छति', pendingEngine: true, provenance: PV },
];
