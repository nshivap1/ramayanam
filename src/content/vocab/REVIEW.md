# VOCAB — human review sheet

Status: **machine-verified, not yet reviewed by a Sanskrit scholar / Samskrita Bharati teacher.** No entry has `humanReviewed: true`.
Review from `src/content/vocab/data.ts` (one entry per line) or `tools/content/nominal/reports/vocab-report.md`. Report errors by entry id.

## 1. Look here first (lower confidence)

### 1a. Modern coinages — not in the classical dictionaries (72 nouns + परह्यः)

Accepted on the author's knowledge of Samskrita Bharati usage only; gender of compounds follows the dictionary gender of the last member.
Please confirm each is the form your materials use.

- Food: चायम्, काफी, फलरसः, अल्पाहारः, कदलीफलम्
- House/kitchen: शौचालयः, उत्पीठिका, दन्तकूर्चः, स्थालिका, अग्निपेटिका, शीतकम्
- School: पाठशाला, छात्रा, शिक्षिका, अध्यापिका, प्रधानाचार्यः, अङ्कनी, कृष्णफलकम्, सुधाखण्डः, गृहपाठः, क्रीडाङ्गणम्, ग्रन्थालयः, मानचित्रम्
- Clothing: ऊरुकम्, पादरक्षा, करवस्त्रम्, उपनेत्रम्
- Professions: गायिका, न्यायाधीशः, पत्रवाहकः, अभियन्ता, वैज्ञानिकः
- Places: चिकित्सालयः, औषधालयः, कार्यालयः, वित्तकोषः, पत्रालयः, पुस्तकालयः, न्यायालयः, सङ्ग्रहालयः, महाविद्यालयः, विश्वविद्यालयः, उपाहारगृहम्, भोजनालयः, चित्रमन्दिरम्, जन्तुशाला, रेलस्थानकम्, विमानपत्तनम्
- Transport: कारयानम्, लोकयानम्, रेलयानम्, द्विचक्रिका, त्रिचक्रिका
- Modern objects: दूरवाणी, जङ्गमदूरवाणी, सङ्गणकम्, दूरदर्शनम्, अन्तर्जालम्, चलच्चित्रम्, छायाचित्रम्, समाचारपत्रम्, विद्युद्दीपः, करदीपः, पादकन्दुकः, रूप्यकम्, पत्रपेटिका
- Time/days: सायङ्कालः, दिनाङ्कः, बुधवासरः, गुरुवासरः; other: चित्रपतङ्गः, शुभाशयः; avyaya: परह्यः

Least certain among these (author's own ranking): त्रिचक्रिका, करदीपः, शीतकम्, लोकयानम् (vs बस्यानम्), वित्तकोषः, रेलस्थानकम्, विमानपत्तनम्, जन्तुशाला, चित्रमन्दिरम्, पादकन्दुकः, काफी.

### 1b. Dictionary words used in a modern sense (16)

आलुकम् potato · घटी clock · कक्षा class · पृष्ठम् page · शाटिका sari · युतकम् shirt · चालकः driver · विमानम् aeroplane · स्थानकम् station ·
आकाशवाणी radio · सप्ताहः week · वादनम् o'clock · and the fused indeclinables कदाचित्, किन्तु, परन्तु, किञ्चित् (parts verified, meaning by usage).

### 1c. Gender / spelling choices

- Two genders in the dictionary, one chosen: ओदनम्, वर्षम्, शकटम्, नूपुरम्, कुण्डलम् (n.); नखः, चरणः, कपाटः, आकाशः, चषकः, उष्णीषः, कार्पासः, चतुष्पथः (m.).
- सायङ्कालः is masculine here (as काल; Apte lists सायंकालः) although Monier-Williams marks sāyaṃkāla as n.
- आम्रम्, नारङ्गम्, बदरम्, खर्जूरम्, दाडिमम्, आमलकम् are the neuter fruit names; नारिकेलः, पनसः, निम्बूकः masculine as in the dictionaries.
- Spelling: पत्रम् / छत्रम् / वार्ता (dictionary: पत्त्र / छत्त्र / वार्त्ता); कार्त्तिकः, ज्यैष्ठः (dictionary headwords; ज्येष्ठः / कार्तिकः are also current).

### 1d. Phrases (34) — usage, with every word verified; sandhi joined by hand in five

नमस्ते (नमः + ते) · नमो नमः · चिन्ता मास्तु (मा + अस्तु) · पुनर्मिलामः (पुनः + मिलामः) · मास्तु. Please check the sandhi and that the phrases
are the ones taught (हरिः ओम्, कुशलं वा, ज्ञातम्, समीचीनम्, जन्मदिनस्य शुभाशयाः, शुभरात्रिः …). The English glosses of phrases are free renderings.

### 1e. Verbs

- Meaning of prefixed verbs comes from the MW article of the prefixed root (keyword match) — check the 25 glosses, especially
  अवगच्छति understands, अनुभवति experiences, उत्पतति flies up, परिवेषयति serves (food), सम्मार्जयति sweeps, उपदिशति instructs.
- प्रेषयति: the form is attested in the corpus and MW (pra-√iṣ); the generator's "base" tag points at a homophonous root (एष्) — harmless but imprecise.
- विस्मरति: junction attested in the corpus for vi-√smṛ (no ṣatva).
- Glosses of Ā-verbs: शेते lies down/sleeps, मन्यते thinks, वर्तते is/exists, रोचते pleases (takes dative), विक्रीणीते sells.

### 1f. Glosses, levels, emoji, paradigm links

- The dictionary gloss check is a keyword heuristic; a reviewer should skim all glosses (≤ 4 words each) once.
- `level` (545 at ≤ 1) and emoji assignments are editorial.
- `paradigm` links (842) are mechanical: same class, gender and ṇatva; compounds whose trigger (र् ष् ऋ) is only in the first member were checked by hand
  (पत्रवाहकेण by 8.4.13). Words with irregular tables are deliberately unlinked (अम्बा, निशा, उत्तरम्, पूर्वः …).
- Category names in Sanskrit (कुटुम्बम्, जनाः, … आधुनिकानि वस्तूनि, शिष्टाचारः): every word is a verified form; wording is editorial.

## 2. Sign-off table

| # | Category id | Entries | Checked | Reviewer | Date |
|---|---|---|---|---|---|
| 1 | family | 38 | ☐ | | |
| 2 | people | 37 | ☐ | | |
| 3 | body | 45 | ☐ | | |
| 4 | food | 42 | ☐ | | |
| 5 | fruits | 18 | ☐ | | |
| 6 | vegetables | 24 | ☐ | | |
| 7 | animals | 44 | ☐ | | |
| 8 | birds | 27 | ☐ | | |
| 9 | nature | 54 | ☐ | | |
| 10 | house | 41 | ☐ | | |
| 11 | kitchen | 17 | ☐ | | |
| 12 | school | 56 | ☐ | | |
| 13 | clothing | 32 | ☐ | | |
| 14 | colours | 17 | ☐ | | |
| 15 | professions | 46 | ☐ | | |
| 16 | places | 42 | ☐ | | |
| 17 | transport | 21 | ☐ | | |
| 18 | modern | 24 | ☐ | | |
| 19 | time | 31 | ☐ | | |
| 20 | days | 7 | ☐ | | |
| 21 | months | 18 | ☐ | | |
| 22 | directions | 25 | ☐ | | |
| 23 | qualities | 89 | ☐ | | |
| 24 | feelings | 47 | ☐ | | |
| 25 | pronouns | 34 | ☐ | | |
| 26 | questions | 12 | ☐ | | |
| 27 | avyaya | 86 | ☐ | | |
| 28 | verbs | 113 | ☐ | | |
| 29 | greetings | 34 | ☐ | | |
| | **Total** | **1121** | | | |

## 3. Awaiting human review

All 1,121 entries.
