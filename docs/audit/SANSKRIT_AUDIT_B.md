# Sanskrit audit B — independent review of engine and sāhitya packs

Reviewer role: independent Sanskrit reviewer (vyākaraṇa, chandas, sāhitya). Date: 2026-11-11.
Scope: `src/sanskrit/` (sandhi, varṇa, chandas, numbers), `src/content/sandhi/`, `src/content/samasa/`, `src/content/subhashita/`.
Machine-readable list of the certain errors: `docs/audit/audit-b-certain.json`.

Overall verdict: the material is in good shape. Seven certain errors were found: two in verse texts, two in sandhi examples, three in the engine. None is in the samāsa pack. Most of the remaining notes are hazards for games rather than mistakes.

How the check was done: every item listed as "examined" below was read by me. Gītā texts were also collated by script against the independent `gita_gita` corpus. Other verses were read against the standard readings from memory, with corpus look-ups for the suspicious ones only. Engine behaviour was probed with my own pairs and scans; throw-away scripts are in `/home/claude/work/audit-b/`.

## (a) Summary

| Area | Items examined | Certain errors | Probable errors | Style / convention issues |
|---|---|---|---|---|
| 1. Engine: sandhi registry | 35 / 35 rules (names, sūtra number and text, summary, examples, counter-examples) | 0 | 0 | 3 |
| 1. Engine: `joinSandhiDeva` probes | 281 pairs of my own | 3 | 4 | 1 |
| 1. Engine: Śiva-sūtras, pratyāhāras, varṇa table | 14 sūtras, 48 pratyāhāras, 48 varṇas | 0 | 0 | 0 |
| 1. Engine: `METERS`, `scanLine` | 20 metres; 33 hand-scanned lines; all 540 pādas of the verse pack | 0 | 0 | 1 |
| 1. Engine: numbers | cardinals 1–100 and 1000; ordinals 1–20 in three genders; variants of 17 numbers | 0 | 0 | 0 |
| 2. Sandhi pack | 847 / 847 examples; 26 / 26 pending specials | 2 | 5 | 4 |
| 3. Samāsa pack | 244 / 244 compounds; 8 type hints | 0 | 2 | 2 |
| 4. Verse pack | 135 / 135 verses (text, pāda split, metre, source, translation); 56 word lists; 19 vipulā labels; 20 single-witness verses | 2 | 4 | 4 |

## (b) Certain errors

| # | Area | Item id (field) | What is there | What it should be | Justification |
|---|---|---|---|---|---|
| C1 | verses | `guna-gunajneshu-guna-bhavanti` (`padas[3]`, `text`) | समुद्रमासाद्य भवन्त्युपेयाः | समुद्रमासाद्य भवन्त्यपेयाः | The verse says rivers become *undrinkable* (अपेय) on reaching the sea; उपेय means "to be approached" and destroys the sense. The pack's own translation says "undrinkable". The single witness (GRETIL Hitopadeśa, Hit_0.46) has the typo `bhavanty upeyāḥ`, and it was copied. Metre is unaffected. |
| C2 | verses | `vidya-dadati-vinayam` (`padas[2]`, `text`) | पात्रत्वात् धनमाप्नोति | पात्रत्वाद्धनमाप्नोति | Within a half-verse sandhi is obligatory: त् + ध → द्ध (8.2.39 झलां जशोऽन्ते). The same line already has धनाद्धर्मं. The second witness under `refs/data` (a Hitopadeśa e-text in Devanagari) prints पात्रत्वाद्धन…. The `words` list (पात्रत्वात्, धनम्) is right and need not change. |
| C3 | sandhi pack | `sandhi-visarga-satva-29` (`first`, `ruleId`) | हरिः + चन्द्रः = हरिश्चन्द्रः, compound, rule `visarga-satva` | Remove, or move to `pending.ts` as हरि + चन्द्रः = हरिश्चन्द्रः under 6.1.153 | Inside a compound the first member is the stem हरि, with no case ending and so no visarga. The ś of हरिश्चन्द्र is the suṭ augment taught by nipātana in 6.1.153 प्रस्कण्वहरिश्चन्द्रावृषी, valid only for the ṛṣi's name. It is not an instance of 8.3.34. |
| C4 | sandhi pack | `sandhi-anunasika-25` (`alternatives`) | यत् + मया = यन्मया, no alternative | add alternative यद्मया | 8.4.45 is optional (वा). The nasal is obligatory only before a *suffix* (vārttika प्रत्यये भाषायां नित्यम्: -मय, -मात्र). मया here is the instrumental of अस्मद्, a separate word. The sibling item `sandhi-anunasika-26` (तत् + मे) correctly lists तद्मे. Cause: engine error C5. |
| C5 | engine | `joinSandhi`, rule `anunasika` | Any second word that begins with मय… or मात्र… is treated as the suffix: यत् + मया, तत् + मयि, तत् + मयूरः, तत् + मात्रा, तत् + मात्रे all return only the nasal form, with the note "Before a suffix (-maya, -mātra) the nasal is obligatory" | Suppress the optional voiced-stop form only for real -मय / -मात्र derivatives (compound or internal junction and a suffix-shaped second member); otherwise list तद्मया, तद्मयि, तद्मयूरः, तद्मात्रा | Same vārttika as C4. मया, मयि, मयूर, मात्रा are independent words. |
| C6 | engine | `joinSandhi` with `{ rFinal: true, compound: true }` | अहः + रात्रः → अहारात्रः; अहः + रूपम् → अहारूपम्; no `special` flag | अहोरात्रः, अहोरूपम् (or at least a `special` flag) | Vārttika रूपरात्रिरथन्तरेषु रुत्वं वाच्यम् (on 8.2.69 रोऽसुपि): before रूप, रात्रि, रथन्तर the n of अहन् becomes ru, not r, hence अहो-. अहारात्र is not a word. `sandhi-visarga-r-final-19/20` (अहर्निशम्, अहरहः) are unaffected and correct. |
| C7 | engine | `joinSandhi` with `{ compound: true }` | षट् + दश → षड्दश; no `special` flag | षोडश (or a `special` flag) | 6.3.109 पृषोदरादीनि यथोपदिष्टम् with the vārttika षष उत्वं दतृदशधासूत्तरपदादेः ष्टुत्वं च: षष् + दश = षोडश, षष् + दन्त = षोडन्. `numbers.ts` itself gives षोडश. As two separate words षड् दश is fine; the error is only in the compound reading. |

## (c) Probable errors / needs scholar decision

### Engine
- P1. पुम् + कोकिलः `{compound}` → पुंकोकिलः, unflagged. The word is पुंस्कोकिलः (8.3.6 पुमः खय्यम्परे). Add to the specials list.
- P2. अहः + पतिः `{rFinal, compound}` → only अहःपतिः. अहर्पतिः is equally valid (vārttika अहरादीनां पत्यादिषु वा रेफः).
- P3. Visarga before a sibilant that is itself followed by a voiceless stop (हरिः + स्फुरति, रामः + स्थाता, निः + स्पृहः): the third valid form with the visarga dropped (हरि स्फुरति, निस्पृहः; vārttika खर्परे शरि वा विसर्गलोपो वक्तव्यः on 8.3.36) is neither listed nor mentioned in a note. निस्पृहः is a spelling learners do meet.
- P4. n + ś (तान् + शत्रून्): the alternatives give ताञ्छत्रून् and ताञ्च्छत्रून् but omit ताञ्च्शत्रून् (8.3.31 शि तुक् without 8.4.63). किम् + ह्यः / ह्मलयति / ह्नुते: the optional forms of 8.3.26–27 are not mentioned in a note, unlike the other unlisted options.

### Sandhi pack
- P5. `sandhi-tuk-14` शिव + छाया = शिवच्छाया has no `compound` flag, but the gloss "Śiva's shadow" is the compound reading. Set `compound: true`.
- P6. `sandhi-vrddhi-01` (सदा + एव = सदैव) and `sandhi-yan-02` (यदि + अपि = यद्यपि) carry `compound: true`. These are two particles written together, not compounds. Siblings such as `sandhi-vrddhi-04` (तथैव) are correctly unflagged.
- P7. `sandhi-r-lopa-dirgha-12` निः + रजः = नीरजः "free from dust". With the s-stem रजस् the masculine is नीरजाः. नीरजः is right only as a neuter, or from the a-stem नीरज, and that form is far better known as "lotus" (नीर + ज). Replace with an unambiguous example.
- P8. `sandhi-guna-13` यथा + इच्छम् = यथेच्छम्: इच्छम् is not a word (the member is इच्छा; -अम् is the avyayībhāva ending). The same applies to the school splits सम् + घः (`sandhi-anusvara-parasavarna-18`) and स्वः + गः (`sandhi-visarga-r-final-21`), where घः and गः do not occur as independent words. Acceptable only if `second` may be a bound form.
- P9. `sandhi-shcutva-19` बृहत् + छन्दः = बृहच्छन्दः glossed "having a great metre". As a masculine bahuvrīhi the nominative is बृहच्छन्दाः. Either gloss it "a great metre" or drop it.

### Samāsa pack
- P10. `samasa-tatpurusha-59` गृहप्रवेशः, vigraha गृहे प्रवेशः, सप्तमी-तत्पुरुषः. With the kṛt noun प्रवेश the object stands in the genitive (2.3.65 कर्तृकर्मणोः कृति), so गृहस्य प्रवेशः (षष्ठी-तत्पुरुषः) is the analysis a grammarian expects. Keep out of type questions until decided.
- P11. `samasa-karmadharaya-25`, `-26` (देवर्षिः, राजर्षिः): the vigraha is standard, but the subtype label विशेषणोभयपद-कर्मधारयः is the name for adjective + adjective compounds (शीतोष्णम्, कृताकृतम्). Both members here are nouns. Label them plain कर्मधारयः.

### Verse pack
- P12. `sarpah-krurah-khalah-krurah` pāda 4 न खलः शाम्यते कदा. This is what the single witness prints, but कदा without चन / अपि does not mean "ever"; the word gloss "कदा = ever" is forced. The reading usually memorised is मन्त्रौषधिवशः सर्पः खलः केन निवार्यते. Replace the reading or drop the verse.
- P13. `arthagamo-nityam-arogita-ca` translation lists five things and then says "these six". The verse counts प्रिया भार्या and प्रियवादिनी (भार्या) separately.
- P14. `bg-9-22` translation "I carry what they need and protect what they have" is very close to a widely circulated published rendering of योगक्षेमं वहाम्यहम् ("carry what they lack … preserve what they have"). Reword. No other translation struck me as echoing a published one.
- P15. `ya-kundendu-tushara-hara-dhavala` translation "a garland of snow": the usual analysis of कुन्देन्दुतुषारहार is four white things — jasmine, moon, snow and a pearl necklace.

## (d) Hazards for games

### Samāsa: do not ask "which type?" on these
- Karmadhāraya or bahuvrīhi depending only on the ending: पीताम्बरम् (`karmadharaya-04`) against पीताम्बरः (`bahuvrihi-01`); likewise श्वेताश्वः, महाबाहुः, अनन्तरूपः. Always show the full form with its gender.
- Nañ-bahuvrīhi against nañ-tatpuruṣa: अनादिः, अनन्तः, अपुत्रः (`bahuvrihi-33..35`); also अनित्यम्, अशुभम्, अप्रियम्, अनुचितम्, अकर्म.
- Upamita against rūpaka: पुरुषव्याघ्रः, पुरुषसिंहः, चरणकमलम्, मुखचन्द्रः, विद्याधनम्. The subtype is the debatable part; the type is safe.
- Upapada against case-tatpuruṣa: कुम्भकारः, स्वर्णकारः, ग्रन्थकारः, दिनकरः, प्रभाकरः, भास्करः, गृहस्थः, तटस्थः, खेचरः (aluk), मनोहरः, धनुर्धरः, गिरिधरः. Learners are often taught these as षष्ठी- or द्वितीया-तत्पुरुषः.
- Proper names and titles: देवदत्तः, गणेशः, सुरेशः, हिमालयः, पञ्चतन्त्रम् (also analysable as a bahuvrīhi), अष्टाध्यायी, त्रिफला, दम्पती.
- Avyayībhāvas more often met as adjectives: अनुरूपम्, निर्विघ्नम्. The Kaumudī examples अधिहरि, अनुविष्णु, अतिहिमम्, निर्मक्षिकम्, बहिर्ग्रामम् are rare.
- Case of the first member open to argument: गृहप्रवेशः (P10), वनवासः, शरणागतः, देवपूजा (देवस्य or देवानाम्), सुखप्राप्तः (also प्राप्तसुखः by 2.2.4).
- Dvandva word order follows usage rather than 2.2.33–34: कृष्णार्जुनौ, देवासुराः, लाभालाभौ, जयाजयौ, धर्माधर्मौ. Do not ask "which member comes first".

### Sandhi: items with equally valid alternative results
- All 14 `chatva` items (तच्छिवः / तच्शिवः); `anunasika` items outside -मय / -मात्र (जगन्नाथः / जगद्नाथः); all 13 `purvasavarna-h` items; `anusvara` and `anusvara-parasavarna` (त्वं च / त्वञ्च, सङ्कल्पः / संकल्पः); `n-rutva` (तांश्च / ताँश्च); `visarga-shari` (हरिः शेते / हरिश्शेते, plus the third form of P3); pada-final औ (तावपि / ता अपि); `yava-lopa` (त इमे / तयिमे). A checker must accept `result` and every alternative. Multiple-choice distractors must never be drawn from the alternatives.
- The `yava-lopa` alternatives (तयिमे, वनयास्ते) and voiced-stop + nasal forms (जगद्नाथः) are grammatical but almost never written. Do not display them as model answers.
- After a pada-final long vowel, छ may or may not double (लक्ष्मीछाया / लक्ष्मीच्छाया). The engine's primary result is the undoubled form; printed books prefer the doubled one.
- अन्तः, स्वः, अहः, मातः, पितः, भ्रातः without `rFinal` give the s-stem result (अन्तोऽस्ति) with the `r-final-ambiguous` flag. Content must check the flag.
- `sandhi-anusvara-parasavarna-24`, `-25`, `-38` (मृत्युञ्जयः, धनञ्जयः, वसुन्धरा): strictly the nasal is the मुम् augment (6.3.67), not a case ending. Fine as recognition items; do not ask for the sūtra.
- Visarga-rutva attribution on underlying r-finals (चतुः + भुजः, पितुः + आज्ञा, मातुः + आज्ञा): the result is right, but 8.2.66 is not literally the operative sūtra. Avoid "name the sūtra" questions on these.

### Verses: wording with well-known variant readings
- `prarabhyate-na-khalu-vighnabhayena` (Pañcatantra reading against the Nītiśataka reading); `shrotram-shrutenaiva-na-kundalena` pādas 3–4; `vipadi-dhairyam-athabhyudaye-kshama` (चाभिरतिः here, चाभिरुचिः usually); `abhivadanashilasya` pāda 4 (Manu 2.121 reads differently); `hastasya-bhushanam-danam` (भूषणे / भूषणैः); `eko-devah-keshavo-va-shivo-va` (ह्येकं / एकं, भार्या / नारी); `bhavanti-namras-taravah` (भूरिविलम्बिनो / दूरविलम्बिनो); `papan-nivarayati` (निगूहति / च गूहति); `ya-srshtih-srashtur-adya` (सर्वबीजप्रकृतिः / सर्वभूतप्रकृतिः); `kashcit-kanta-viraha-guruna` (स्वाधिकारात्प्रमत्तः / स्वाधिकारप्रमत्तः); `yatha-hy-ekena-cakrena` (तथा / एवं); `ya-kundendu-tushara-hara-dhavala` (वन्दिता / पूजिता); `mata-shatruh-pita-vairi`, `shaile-shaile-na-manikyam`.
- Fill-the-gap and word-order games on these verses will mark as wrong what many learners know by heart. Restrict such games to the Gītā verses and verses not listed here, or accept the variants.
- `bg-17-16`: the pack prints मनः प्रसादः as two words; it is the compound मनःप्रसादः. Do not use it for word-count or word-boundary games.
- `bg-10-8` pāda 1 अहं सर्वस्य प्रभवो: the bha-vipulā label depends on counting स्य as guru before प्र. Under the traditional licence (see convention note 5) it is laghu and the pāda scans as na-vipulā. Avoid in metre games.
- `bg-15-7` pāda 3 and `bg-7-19` pāda 3: the vipulā label fits syllables 5–7, but the classical caesura and opening conditions are not met (epic usage). All 19 vipulā labels are otherwise correct by my hand scan.
- Pādas that begin with a carried-over conjunct (र्धीरस्तत्र, मश्वत्थं, न्सर्वान्पार्थ) are unsuitable for "which pāda comes first?" tiles and for audio alignment.

## (e) Convention observations

1. Sūtra readings: `pending.ts` quotes 6.1.137 as सम्परिभ्यां करोतौ भूषणे, while the engine note and README quote the Kāśikā reading *samparyupebhyaḥ karotau bhūṣaṇe*. Pick one.
2. `chatva` cites only 8.4.63 शश्छोऽटि, but the example तच्छ्लोकेन and the summary ("vowel, semivowel or nasal") rest on the vārttika छत्वममीति वाच्यम्. Name it.
3. `ayadi` summary says pada-final औ → आव् "regularly"; by 8.3.19 the hiatus form (ता अत्र) is equally Pāṇinian, and the engine lists it. The wording is fine for learners.
4. `compound: true` is used for three different things: real compounds, upasarga + kṛdanta (उत्साहः), and stem + taddhita (उत्तमः, सुहृत्तमः, तेजोमयः). `sandhi-visarga-r-final-20` अहरहः is a repetition (āmreḍita), not a compound. If a game says "compound", restrict it to the first kind.
5. `scanLine` always makes a short vowel guru before प्र / ह्र / क्र. Tradition allows it to stay laghu there (Piṅgala's प्रह्रे वा). This is a defensible choice, but say so in the README.
6. Pāda division: most pādas carry a word-final consonant over to the next pāda (प्राप्ति / र्धीरः), but `bg-11-38` (पुराणस्) and `bg-15-5` (संज्ञैर्) end the pāda with a virāma. Make it uniform; the virāma form is the better one for display.
7. Spelling varies with the witness: सिद्ध्यति / सिध्यति, सङ्गो / संपृक्तौ / परसंताप, अपोहनञ्च. Normalise per pack.
8. `source` names an anthology where the original work is known: `vajrad-api-kathorani` (Uttararāmacarita 2.7), `bhavanti-namras-taravah` (Abhijñānaśākuntala 5.12; Nītiśataka), `vipadi-dhairyam…` (Nītiśataka), `prarabhyate…` (Nītiśataka; Mudrārākṣasa). `lalayet-panca-varshani` and `shad-doshah-purusheneha` name one work in `source` and another in `provenance`.
9. Samāsa pack: `bahuvrihi-12` uses the singular vigraha बहुः व्रीहिः यस्य सः (many books give बहवो व्रीहयः); `upapada-17..21` use जायते where the suffix ड has past sense (जातः). Both are normal school practice.
10. Cardinals 1–4 are given in the neuter (एकम्, द्वे, त्रीणि, चत्वारि). Correct, but games that count masculine or feminine nouns need the gendered forms.

Verified correct with nothing to report: all 35 sūtra numbers and texts in `SANDHI_RULES`; the 26 sūtras and vārttikas in `pending.ts`; the 14 Māheśvara-sūtras; 48 pratyāhāra expansions (including अण् / इण् with both markers, शल्, झय्, छव्); sthāna and prayatna of all 48 varṇas; all 20 metre definitions against the Vṛttaratnākara lakṣaṇas; cardinals 1–100 (including द्वाविंशतिः, त्रयस्त्रिंशत्, चतुष्पञ्चाशत्, चतुःषष्टिः, द्व्यशीतिः, षण्णवतिः) and the listed variants; ordinals 1–20; all 68 Gītā texts (identical to the second corpus apart from nasal spelling); all metre labels and syllable counts of the 135 verses.

## (f) Not examined

- `translit.ts`, `akshara.ts`, `equivalence.ts`, `applyNatva`; the engine's own test tables (`KNOWN_SPECIALS`, `CASES`).
- `cardinalVariants` beyond 17 sampled numbers.
- The 67 non-Gītā verses were not collated letter by letter against a second corpus by script. They were read against the standard readings, and only three suspicious readings were looked up. A typo that leaves a plausible word could have escaped me. The 20 single-witness verses still need proof-reading against print.
- `source.ref` verse numbers were not checked against printed editions.
- `level` and `theme` values in all three packs were not judged systematically.
- Sandhi glosses longer than about 100 characters were read only up to that length.
- Other packs (dhatu, shabda, vocab, sentences) are outside this audit.
