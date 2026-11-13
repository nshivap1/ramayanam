# SHABDA — human review sheet

Status: **machine-verified, not yet reviewed by a Sanskrit scholar.** No item has `humanReviewed: true`; only a human reviewer may set it
(in `tools/content/nominal/shabda-spec.ts` → regenerate), after signing the table below.

How to review: open `src/content/shabda/data.ts` (one line per vibhakti) or run any game in "table" view; compare with a printed
śabda-mañjarī / Samskrita Bharati śabda-rūpa book. Report an error by paradigm id + cell (e.g. `naman-n 8.1`).

## 1. Look here first (lower confidence)

### 1a. Forms accepted on a single source family plus a grammatical rule (24)

| Paradigm · cell | Form (second in the cell) | Why it was accepted |
|---|---|---|
| manas-n, shiras-n, payas-n, tapas-n, yashas-n, tejas-n, vayas-n, chandramas-m, vedhas-m, sumanas-m, shreyas-m, shreyas-n, gariyas-m, ahan-n · 7.3 | मनस्सु, शिरस्सु, पयस्सु, तपस्सु, यशस्सु, तेजस्सु, वयस्सु, चन्द्रमस्सु, वेधस्सु, सुमनस्सु, श्रेयस्सु (×2), गरीयस्सु, अहस्सु | 8.3.36 वा शरि; only vidyut lists it (Heritage lists the same alternation for आशिस्: आशीःषु / आशीष्षु) |
| havis-n, dhanus-n, chakshus-n, ayus-n, jyotis-n · 7.3 | हविष्षु, धनुष्षु, चक्षुष्षु, आयुष्षु, ज्योतिष्षु | same rule |
| vari-n, madhu-n, vastu-n, ashru-n · 8.1 | वारे, मधो, वस्तो, अश्रो | optional guṇa in the neuter vocative (SK: हे वारे / हे वारि); only vidyut lists it here, two families list it for अक्षि / दधि |
| brahman-n · 8.1 | ब्रह्मन् | हे ब्रह्मन् / हे ब्रह्म (8.2.8 + vārttika); two families list the pair for नामन् कर्मन् जन्मन् |

Question for the reviewer: should these second forms stay as accepted answers at learner levels 2–4, or be removed?

### 1b. Display-order choices (which optional form is shown first)

Display form = first in the cell. Chosen: मत्यै (not मतये), धेन्वै, श्रियै, भुवै, श्रीणाम्, भूनाम्, स्त्रियम्, नाम्नि, राज्ञि, अह्नि, नाम्नी,
हे नाम (not हे नामन्), हे कर्म, हे जन्म, हे ब्रह्म, हे वारि, हे अक्षि, अक्ष्णि (not अक्षणि), अष्ट / अष्टभिः / अष्टसु (not अष्टौ / अष्टाभिः / अष्टासु), मनःसु, full pronouns before enclitics (माम् before मा).
Please confirm these match the tables your students learn (some books print मतये first and हे नामन् first).

### 1c. Deliberate omissions that a table book may contain

- Vocative of pronouns and numerals is empty, including हे सर्व, हे अन्य, हे भवन्, हे पञ्च (grammatically possible; sources disagree on listing them).
- रामाद्, तद्, वाग् -type sandhi doublets; षट्त्सु, सम्राट्त्सु; मत्तः, त्वत्तः; Vedic सखाया, त्रीणाम्.
- जगत् dual only जगती; Heritage also prints जगन्ती (not accepted).

### 1d. Known disagreements between sources (resolved, pinned in `oracle.test.ts`)

| Cell | Pack | Other source | Resolution |
|---|---|---|---|
| mahat-m 8.1 | महन् (vidyut, Kale) | Heritage: महान् | no lengthening in sambuddhi (6.4.8, 6.4.10) → महन् |
| sakhi-m 7.3 | सखिषु | Kale CSV: सखीषु | typo in CSV |
| svasri-f 8.1 | स्वसः | Kale CSV: स्वसाः | typo in CSV |
| adas-m / adas-n 6.3 | अमीषाम् | Kale CSV: अमीनाम् | typo in CSV |
| shash 1.3 | षट् | Kale CSV: षष् | unsandhied stem in CSV |
| sarva-n, anya-n, eka-n, dvi-n 7.x; ashtan 2–6 | — | Kale CSV rows filed under the wrong case | data-entry slip in CSV |

### 1e. Paradigms whose second source is an ending table applied by our tool (not a whole-word table)

rama-f, balika-f, janani-f, nari-f, mahati-f, vidvas-m, gacchat-m, kurvat-m, sat-m (vidyut + Kale endings); akshi-n, dadhi-n (vidyut + Kale whole-word).
balaka-m, pustaka-n, balika-f are declined by model (देव, फल, लता) because ashtadhyayi.com has no such headword.

### 1f. Non-linguistic judgements

- `level` tags (when a learner meets the table) and the English glosses.
- Stem naming आशिस् / धनुस् / हविस् … (सकारान्त) rather than आशिष् / धनुष् ….

## 2. Sign-off table

Tick a group only after checking every table in it. Name + date in the last columns.

| # | Group | Paradigm ids | Tables | Checked | Reviewer | Date |
|---|---|---|---|---|---|---|
| 1 | अकारान्त m | rama-m balaka-m deva-m vriksha-m nara-m jana-m | 6 | ☐ | | |
| 2 | अकारान्त n | phala-n vana-n pustaka-n mitra-n pushpa-n jnana-n | 6 | ☐ | | |
| 3 | आकारान्त f | rama-f lata-f balika-f mala-f vidya-f | 5 | ☐ | | |
| 4 | इकारान्त m | hari-m muni-m kavi-m agni-m pati-m sakhi-m | 6 | ☐ | | |
| 5 | इकारान्त f / n | mati-f buddhi-f bhumi-f ratri-f · vari-n akshi-n dadhi-n | 7 | ☐ | | |
| 6 | ईकारान्त f | nadi-f devi-f janani-f nari-f stri-f shri-f lakshmi-f mahati-f | 8 | ☐ | | |
| 7 | उ / ऊ | guru-m sadhu-m shishu-m bhanu-m dhenu-f madhu-n vastu-n ashru-n vadhu-f bhu-f | 10 | ☐ | | |
| 8 | ऋकारान्त | pitri-m bhratri-m matri-f svasri-f duhitri-f kartri-m datri-m netri-m | 8 | ☐ | | |
| 9 | ओ / औ | go-m go-f nau-f | 3 | ☐ | | |
| 10 | अन्-stems | rajan-m atman-m brahman-m yuvan-m shvan-m naman-n karman-n janman-n brahman-n ahan-n | 10 | ☐ | | |
| 11 | इन्-stems | gunin-m svamin-m yogin-m jnanin-m pakshin-m mantrin-m hastin-m pathin-m | 8 | ☐ | | |
| 12 | अस्-stems | manas-n shiras-n payas-n tapas-n yashas-n tejas-n vayas-n chandramas-m vedhas-m sumanas-m | 10 | ☐ | | |
| 13 | इस् / उस् / वस् / यस् | havis-n dhanus-n chakshus-n ayus-n jyotis-n ashis-f vidvas-m shreyas-m shreyas-n gariyas-m | 10 | ☐ | | |
| 14 | त् / द् stems | marut-m sarit-f vidyut-f jagat-n suhrid-m sharad-f apad-f sampad-f | 8 | ☐ | | |
| 15 | मत् / वत् / महत् / śatṛ | bhagavat-m dhimat-m balavat-m shrimat-m shrimat-n gacchat-m kurvat-m sat-m mahat-m mahat-n | 10 | ☐ | | |
| 16 | other consonant stems | vac-f tvac-f vanij-m bhishaj-m samraj-m sraj-f dish-f kshudh-f gir-f dvar-f ap-f | 11 | ☐ | | |
| 17 | तद् एतद् यद् किम् | tad-m/f/n etad-m/f/n yad-m/f/n kim-m/f/n | 12 | ☐ | | |
| 18 | इदम् अदस् | idam-m/f/n adas-m/f/n | 6 | ☐ | | |
| 19 | सर्व अन्य भवत् | sarva-m/f/n anya-m/f/n bhavat-m bhavati-f | 8 | ☐ | | |
| 20 | अस्मद् युष्मद् | asmad yushmad | 2 | ☐ | | |
| 21 | सङ्ख्या 1–4 | eka-m/f/n dvi-m/f/n tri-m/f/n chatur-m/f/n | 12 | ☐ | | |
| 22 | सङ्ख्या 5–10, कति | panchan shash saptan ashtan navan dashan kati | 7 | ☐ | | |
| | **Total** | | **173** | | | |

## 3. Awaiting human review

All 173 paradigms.
