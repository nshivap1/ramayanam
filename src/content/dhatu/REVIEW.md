# dhatu pack — review sheet for a Sanskrit scholar

Status: **machine-verified, not yet human-reviewed.** No entry has `humanReviewed: true`.
Please review in the order below (least certain first), tick, and sign at the end.
Raw lists (every dropped form, every multi-form cell): `verification-report.json`.
Readable paradigms: `data.ts` — one line per lakāra × pada: `prathama | madhyama | uttama`,
each `eka dvi bahu`; `/` separates accepted alternates (first = displayed); `—` = withheld.

## 1. Dhātus confirmed by only ONE independent engine (single second source)

Every form is in the primary oracle (ashtadhyayi.com / vidyut) and in one other engine; the
third engine does not have the root (or files it differently). Please read these paradigms in full.

| id | root | second source | why the other is missing |
|---|---|---|---|
| `siks-1a` | शिक्ष् | SanskritVerb | Heritage treats शिक्षते as the desiderative of शक्; no kṛdantas shipped |
| `kurd-1a` | कूर्द् | SanskritVerb | root absent from Heritage; no kṛdantas shipped |
| `vid-2p` | विद् (वेत्ति) | Heritage | absent from SanskritVerb's output |
| `man-4a` | मन् (मन्यते) | Heritage | absent from SanskritVerb's output |
| `trp-4p` | तृप् | Heritage | absent from SanskritVerb's output |
| `vid-6u` | विद् (विन्दति) | Heritage | absent from SanskritVerb's output |
| `ghat-10u` | घट् (घाटयति) | Heritage (as causative of घट्) | SanskritVerb derives घटयति for its reading of the root |

- [ ] the seven paradigms above are correct

## 2. Withheld cells (the engines disagree or only the primary oracle has the form)

| cell | primary oracle | others | question for the reviewer |
|---|---|---|---|
| `vid-2p` laṅ P prathama bahu | अविदुः | Heritage: अविदन् ; SanskritVerb: — | अविदुः (सिजभ्यस्तविदिभ्यश्च 3.4.109) is expected; confirm and it can be added by hand-review |
| `bru-2u` lṛṭ Ā prathama bahu | वक्ष्यन्ते | SanskritVerb prints वक्ष्यते (evidently its slip); Heritage files it under वच् | confirm वक्ष्यन्ते |
| `ghat-10u` laṅ P madhyama bahu, loṭ P prathama dvi, vidhiliṅ P prathama dvi, vidhiliṅ P madhyama bahu | अघाटयत, घाटयताम्, घाटयेताम्, घाटयेत | only Heritage covers this root and its export lost these four homographic cells | confirm the four forms |

- [ ] decisions recorded for the 6 cells

## 3. Choice of the DISPLAYED form where a cell has several accepted forms (373 cells)

All members are accepted as answers; only `Forms[0]` is shown. Rules: confirmed by both engines
first → curated preference → seṭ future before aniṭ → laṅ 2sg in visarga / 3sg in the stop → shorter.
Please check that the first form is the one Samskrita Bharati books print:

- श्नु / उ roots, optional loss of उ before व / म: शृणुवः / शृण्वः, सुनुवः / सुन्वः, चिनुमः / चिन्मः, तनुवः / तन्वः, वृणुवः / वृण्वः (first shown: the full form)
- seṭ / aniṭ futures: क्षमिष्यते / क्षंस्यते, नर्तिष्यति / नर्त्स्यति, कर्तिष्यति / कर्त्स्यति, नशिष्यति / नङ्क्ष्यति, मोहिष्यति / मोक्ष्यति, स्नेहिष्यति / स्नेक्ष्यति, तरिष्यति / तरीष्यति, वरिष्यति / वरीष्यति, करिष्यति / करीष्यति (कॄ)
- **curated**: वेत्स्यति shown before वेदिष्यति for विद् (विन्दति); अयान् before अयुः, अस्नान् before अस्नुः; अरोदीत् / अरोदत्, अस्वपीत् / अस्वपत्; वर्धित्वा before वृद्ध्वा
- aniṭ pairs: कर्क्ष्यति / क्रक्ष्यति, स्पर्क्ष्यति / स्प्रक्ष्यति (the र्-first variant is shown)
- rudhādi: रुन्द्धः / रुन्धः, भिन्त्तः / भिन्तः, छिन्त्तः / छिन्तः, पिण्ड्ढि / पिण्ढि (the fuller spelling is shown)
- juhotyādi: बिभीतः / बिभितः, जहितः / जहीतः, जहिहि / जहाहि / जहीहि
- क्रम्: क्रामति / क्राम्यति in every present-system cell
- ब्रू: ब्रवीति shown; आह, आहतुः, आहुः, आत्थ, आहथुः accepted (ब्रुवः पञ्चानाम्…)
- तातङ् forms (पठतात् …) accepted in loṭ P 3sg and 2sg, never shown

- [ ] display forms acceptable (list any to swap)

## 4. Editorial decisions that are not "forms"

- [ ] **gaṇa of श्रु** is given as 1 (dhātupāṭha) with a note; school grammars say 5
- [ ] **pada taught**: धाव् P only (dhātupāṭha: U); ज्ञा P only; भुज् U with the sense restriction in `note`;
      मृ Ā but lṛṭ P (मरिष्यति); all curādi roots U; याच्, वह्, भज्, श्रि, धृ, ह्वे, वप्, नी, हृ, पच्, यज् U
- [ ] **अस्**: lṛṭ = भविष्यति (suppletion); no ktvā / kta etc. listed under अस्
- [ ] **ब्रू**: lṛṭ वक्ष्यति and kṛdantas उक्त्वा, वक्तुम्, उक्तः taken from वच् (ब्रुवो वचिः)
- [ ] root shown as **क्षल्** (क्षालयति), not क्षाल्; adanta curādi roots shown as कथ्, गण्, रच्, स्पृह्, सूच्, दण्ड्
- [ ] optional non-ṇic curādi forms (घोषति, चिन्तति, लोकति) left out on purpose
- [ ] valid alternates left out because no second engine has them: वेद / विदतुः / विदुः … (विद्), भ्रम्यति, some स्तवीति cells, अद्विषुः, बिभियाम्
- [ ] `level` (L1–L4) and English glosses (hand-written)

## 5. Kṛdantas

Accepted = primary oracle + (Heritage stem or ≥ 2 DCS attestations) + stem/nominative rule.
- [ ] 38 forms rest on DCS attestation alone (no Heritage stem)
- [ ] alternates and their order: सोढ्वा / सहित्वा, इष्ट्वा / एषित्वा, एष्टुम् / एषितुम्, लिखित्वा / लेखित्वा, मुदित्वा / मोदित्वा, रुचित्वा / रोचित्वा, श्रान्त्वा / श्रमित्वा, भ्रान्त्वा / भ्रमित्वा, क्रान्त्वा / क्रमित्वा, शिष्ट्वा / शासित्वा, लोब्धुम् / लोभितुम्, त्वरितः / तूर्णः, वरीतुम् / वरितुम्
- [ ] śatṛ of abhyasta roots without num: ददत्, दधत्, जुह्वत्, बिभ्यत्, जहत्, बिभ्रत्, जाग्रत्, शासत्
- [ ] gaps are acceptable (232 forms dropped, e.g. खेलित्वा, शिक्षित्वा, भाषमाणः, क्रामन्, यान्, स्नान्; कूर्द् and शिक्ष् have none)

## 6. Prefixed verbs and lyap

- [ ] 3 rest on "plain concatenation + listed in Monier-Williams" only: पुरस्करोति, प्रतिवदति, सम्मिलति
- [ ] 6 rest on a dictionary citation of a present-system form: उद्गच्छति, परिणयति, अनुवदति, उद्घाटयति, परिगणयति, निश्चिनोति
- [ ] pada with the prefix: आदत्ते, विक्रीणीते, उपयुङ्क्ते / नियुङ्क्ते / प्रयुङ्क्ते, उत्पद्यते, प्रतिपद्यते, आरभते, प्रकाशते given in Ā; समागच्छति, सञ्चरति, उत्तिष्ठति, अनुकरोति, उपकरोति in P
- [ ] sandhi at the junction: उत्तिष्ठति, उन्नयति, उद्धरति, संहरति, सङ्क्षिपति, सञ्चरति, सन्तरति, अलङ्करोति, प्रणमति, परिणयति, प्रणश्यति, निषीदति, विषीदति (but प्रसीदति, अवसीदति), अभिषिञ्चति, प्राप्नोति, परीक्षते, प्रतीक्षते, अपेक्षते, उपेक्षते, अवेक्षते, व्याहरति, प्रत्यागच्छति
- [ ] lyap list (96), e.g. उत्थाय, आहूय, अवतीर्य, उत्तीर्य, प्रणम्य, आगम्य / आगत्य, निश्चित्य, प्रशस्य; English gloss "having …" is generic (प्रकाश्य is glossed "having shone")
- [ ] rejected for lack of attestation (may be added by hand-review): उपागच्छति, आविष्करोति, प्ररभते, परिश्राम्यति, उल्लिखति
- [ ] gati / cvi words appear in the `upasarga` field: नमस्, अलम्, तिरस्, पुरस्, सत्, स्वी, अङ्गी

## 7. What the machine checks already cover (spot-check only)

12,385 finite forms: each in the same cell of ashtadhyayi.com and of SanskritVerb (11,926) and / or
Sanskrit Heritage (11,496); 11,037 in all three. Golden school tables in `dhatu.test.ts` (पठ् ×5, भू, अस्,
कृ, लभ्, गम्, दा, श्रु, ज्ञा, चुर्, शी, इ, हन्, ब्रू, युज्, ग्रह्, मृ …) were typed by hand and matched without
any edit to the data.

## Sign-off

| Reviewer | Date | Scope reviewed (sections) | Corrections filed |
|---|---|---|---|
| | | | |
