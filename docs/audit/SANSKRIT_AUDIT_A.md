# Sanskrit audit A — shabda, vocab, dhatu, sentences

Independent read-through of four content packs by a reviewer who did not write them.
Date: 2026-11-11. Machine-readable list of certain errors: `audit-a-certain.json` (29 entries).
Method: every item was printed from the packs with throw-away scripts and read; forms were judged against the
standard paradigms and Pāṇinian rules (sūtra numbers given), with Monier-Williams look-ups for doubtful words.
An independent ṇatva checker (8.4.1–2) was run over all 3,904 shabda forms and over 18,956 forms derived
through the 842 vocab → paradigm links. No test suite was run and no generator code was reviewed.

**Headline:** the inflected Sanskrit itself is clean — no wrong declined or conjugated form was found in any pack.
The problems are (1) one nonsense sentence, (2) wrong word-glosses in the 24 negated sentences, (3) kāraka labels
put on upapada-vibhaktis, and (4) a handful of display-form and consistency choices.

## (a) Summary

| Pack | Items examined | Certain errors | Probable / needs decision | Style / convention |
|---|---|---|---|---|
| shabda | 173 of 173 paradigms read in full (3,904 forms) | 0 | 0 | 4 |
| vocab | 1,121 of 1,121 entries read (all 29 categories; all 72 coinages, 16 modern senses, 34 phrases, 113 verbs) | 0 | 3 | 6 |
| dhatu | 199 roots: 4 key cells each (+5 for U roots); 57 roots read as paradigms; 155 prefixed verbs; ktvā/tumun/kta/śatṛ/śānac/anīyar of all 199; 96 lyap | 0 | 4 | 4 |
| sentences | 671 of 671 read (text + English); all 43 distinct prefixed-verb forms; every distinct (lemma, tag, form, role) combination; ~60 sentences word-by-word | 1 sentence + 24 word glosses + 31 role labels (4 groups) | 1 tag issue (3 sentences) + ~25 naturalness flags | 4 |

## (b) Certain errors

| # | Pack | Id (cell) | Found | Should be | Justification |
|---|---|---|---|---|---|
| C1 | sentences | `karta-karma-kriya-016` (whole sentence) | रामाः मोदकम् खादन्ति — "Rama eat the sweetmeat." | Remove, or singular रामः मोदकम् खादति — "Rama eats the sweetmeat." | Proper name राम in prathamā bahuvacana (tag `1.3.m`); the English is ungrammatical. It is the only proper noun in a non-singular slot (checked all 671); the generator should bar राम / सीता from dual and plural. |
| C2 | sentences | `na-kriya-001` … `na-kriya-016`, `vina-001` … `vina-008` (the kriyā word's `en`) | गच्छति = "does not go", जीवति = "does not live", … while न is separately glossed "not" | "goes", "lives", … (24 exact pairs in the JSON) | The word-level gloss must translate the word. A "what does गच्छति mean?" game built on these would teach "does not go". Sentence text and sentence translation are correct. |
| C3 | sentences | `saha-001` … `saha-016` (`role` of the tṛtīyā word) | `karana` | a non-kāraka label, e.g. `upapada` | सहयुक्तेऽप्रधाने (2.3.19): the tṛtīyā marks the secondary companion; it is an upapada-vibhakti, not the instrument (साधकतमं करणम् 1.4.42). Keep the sentences. |
| C4 | sentences | `vina-002` … `vina-006` (tṛtīyā word): `karana`; `vina-001`, `-007`, `-008` (dvitīyā word): `karma` | as stated | `upapada` | पृथग्विनानानाभिस्तृतीयान्यतरस्याम् (2.3.32): case governed by विना. जीवति is akarmaka, so `karma` is doubly wrong. |
| C5 | sentences | `namah-001` … `namah-007` (`role` of the caturthī word) | `sampradana` | `upapada` | नमःस्वस्तिस्वाहास्वधालंवषड्योगाच्च (2.3.16): caturthī by association with नमः; no act of giving, so no sampradāna (1.4.32). |

On the reported सह issue: the report is right. Tagging मित्रेण in मित्रेण सह as `karana` is a real grammatical
mislabel, not a harmless convention, because the pack's `role` field is otherwise a kāraka field. Recommendation:
add one role value (`upapada`) to `Role`, use it for the nouns governed by सह, विना and नमः, and let games show
"tṛtīyā with सह" instead of "karaṇa". Until then no game should ask for the kāraka of these words.
The dvitīyā with प्रति (`prati-001` … `-008`, tagged `karma`) is the same kind of case (कर्मप्रवचनीययुक्ते द्वितीया 2.3.8),
but since the noun can also be read as the goal of गच्छति I list it as a decision, not an error. The dvitīyā of
motion (विद्यालयम् गच्छति → `karma`) is correct as tagged.

No certain error was found in shabda, vocab or dhatu.

## (c) Probable errors / needs a scholar's decision

### sentences
- **शाक tagged masculine** (`apadana-009`, `karta-karma-kriya-057`, `tumun-shaknoti-012`: शाकम् `2.1.m`) while the vocab pack has `saka` शाकम् as neuter. MW gives n. first ("or m., ardharcādi"). The surface form is the same; make the tag `2.1.n` so the two packs agree.
- **Naturalness** (grammatical, but a teacher would not say them):
  - `vina-006`, `vina-007` छात्रः पुस्तकेन / पुस्तकम् विना न जीवति ("the student does not live without the book").
  - Future or past of stative and involuntary verbs with a day adverb: `shvah-lrt-007` (will forget the lesson tomorrow), `shvah-lrt-022` (will want milk tomorrow), `shvah-lrt-021`, `hyah-lan-017` (knew the answer yesterday), `hyah-lan-014`.
  - Plural kin terms with a singular object: `karta-kriya-003`, `-028`, `karta-karma-kriya-029`, `-031`, `-044`, `-054`, `-056`, `-080`, `-086`, `hyah-lan-010`, `adhikarana-005`, `-020`, `adya-lat-010`, `-015`, `ktva-002`, `-010`.
  - सर्वदा + vidhiliṅ with a one-off object: `vidhilin-002` (should always read the letter), `-005`, `-008`, `-018`.
  - Animals wanting or being able: `tumun-icchati-013`; odd ability: `tumun-shaknoti-010`, `-014`; `visheshana-karma-013` (sees the long rivers).
- **English**: "by the vehicle / by the chariot" (`karana-005`, `-011`, `-016`, `-020`, `-024`) should be "by vehicle / by chariot"; "meets with", "does work" are literal; स्थूलम् गजम् is glossed "big" (`visheshana-karma-021`) but vocab glosses स्थूलः "fat, thick".

### vocab
- `marica` **मरीचम्** "pepper": MW has marīca n. only as a lexicographers' variant; the attested and usual word is **मरिचम्** (Suśruta). Its emoji 🌶️ shows a chilli, which spoken Sanskrit calls मरीचिका; either change the emoji or the word.
- `vittakosa` **वित्तकोषः** vs `sabdakosa` **शब्दकोशः**: both spellings of कोश / कोष are legitimate, but one pack should use one. (Samskrita Bharati prints वित्तकोषः; शब्दकोशः is the usual dictionary spelling — decide and note it in the README.)
- `budhavasara` बुधवासरः: correct, but Samskrita Bharati calendars usually print सौम्यवासरः for Wednesday; likewise भानुवासरः / इन्दुवासरः / भौमवासरः / स्थिरवासरः exist beside the forms chosen. Accept both in any typing game.

### dhatu
- `lok-10u` and `marg-10u`: the **displayed** ktvā / tumun are लोकित्वा, लोकितुम्, मार्गित्वा, मार्गितुम् — the non-ṇic forms that the README says are "deliberately not listed". For लोकयति / मार्गयति the display forms must be लोकयित्वा, लोकयितुम्, मार्गयित्वा, मार्गयितुम् (swap the order or drop the short forms).
- `vid-6u` (विन्दति "find"): kta displayed as **विदितः** and ktvā as **विदित्वा**, which learners know as forms of विद् "know" (`vid-2p` has the same two). For विद्लृ लाभे the expected participle is वित्तः / विन्नः (नुदविदोन्दत्राघ्राह्रीभ्योऽन्यतरस्याम् 8.2.56). Show विन्नः and वित्त्वा first; consider dropping विदितः here.
- `vid-2p` laṅ madhyama eka has only अवेत्; **अवेः** is equally correct (दश्च 8.2.75) and is the form most tables print first. A typing game would reject a right answer. Same class of gap: अद्विषुः, बिभियाम्, वेद / विदुः (already listed in REVIEW §4).
- `vrt-1a` ktvā shows only वृत्त्वा; वर्तित्वा (the commoner form, उदितो वा 7.2.56) is missing.
- Withheld cells (REVIEW §2) — my reading: `vid-2p` laṅ prathama bahu = **अविदुः** (सिजभ्यस्तविदिभ्यश्च 3.4.109; Heritage's अविदन् is not the adādi form); `bru-2u` lṛṭ Ā prathama bahu = **वक्ष्यन्ते**; `ghat-10u` = **अघाटयत, घाटयताम्, घाटयेताम्, घाटयेत**. All six can be filled.

### shabda
Nothing probable. Answers to REVIEW §1: the 24 single-source forms (मनस्सु-type by वा शरि 8.3.36, हविष्षु-type, हे वारे / मधो / वस्तो / अश्रो, हे ब्रह्मन्) are all grammatical; keep them as accepted answers, never as display forms. The nine ending-table paradigms (रमा, बालिका, जननी, नारी, महती, विद्वस्, गच्छत्, कुर्वत्, सत्) and अक्षि / दधि are correct in every cell. महन् (not महान्) is the right vocative.

## (d) Ambiguity hazards for games

**Vocab — same English gloss, several words** (127 groups; the ones at the same level are the dangerous ones for "pick the word for X"):
- Both at L1: पिता / जनकः; माता / जननी / अम्बा; स्त्री / महिला; शुनकः / कुक्कुरः; आहारः / अन्नम् (also भोजनम्, ओदनम्); वृष्टिः / वर्षा; विद्यालयः / पाठशाला; शिक्षकः / अध्यापकः / गुरुः; शिक्षिका / अध्यापिका; प्रभातम् / प्रातःकालः; दिनम् / वासरः; शोभनः / सुन्दरः / शुभः; इदानीम् / अधुना; सदा / सर्वदा; किन्तु / परन्तु; वा / अथवा; शनैः / मन्दम्; एव / केवलम्; अतीव / बहु; अस्ति / भवति; नमस्ते / हरिः ओम्; पृथिवी / भूमिः; पुरातनः / वृद्धः.
- Across levels: पुत्री / दुहिता; भगिनी / स्वसा; पत्नी / भार्या; कुटुम्बम् / परिवारः; पुरुषः / नरः; बालकः / कुमारः / बालः; बालिका / कन्या; शरीरम् / देहः; नेत्रम् / नयनम् / अक्षि; कण्ठः / ग्रीवा; हस्तः / करः; पादः / चरणः; दुग्धम् / क्षीरम्; पानीयम् / पेयम्; मृगः / हरिणः; धेनुः / गौः; गजः / हस्ती; भल्लूकः / ऋक्षः; वानरः / कपिः; श्वा; मार्जारः / बिडालः; कूर्मः / कच्छपः; मकरः / नक्रः; पक्षी / खगः / विहगः; भ्रमरः / मधुकरः; तारा / नक्षत्रम्; आकाशः / गगनम्; पर्वतः / गिरिः; समुद्रः / सागरः; वनम् / अरण्यम्; पर्णम् / पत्रम्; शिला / पाषाणः; जगत् / लोकः; मञ्चः / शय्या; पीठम् / आसनम्; पुस्तकम् / ग्रन्थः; ग्रन्थालयः / पुस्तकालयः; वस्त्रम् / वसनम्; पादरक्षा / पादत्राणम् / उपानत् / पादुका; आभरणम् / अलङ्कारः; श्वेतः / शुक्लः / धवलः; रक्तः / लोहितः; कृषकः / कृषीवलः; सेवकः / भृत्यः; वैद्यः / चिकित्सकः; आपणः / विपणिः / पण्यशाला; मन्दिरम् / देवालयः; यानम् / वाहनम्; नौका / नौः / पोतः / जलयानम्; समयः / कालः; दिवसः; रात्रिः / निशा; वर्षम् / संवत्सरः; क्षणः / निमेषः; तिथिः / दिनाङ्कः; पुरतः / अग्रे; पृष्ठतः / पश्चात्; उन्नतः / उच्चः; नूतनः / नवः; स्वच्छः / निर्मलः / शुद्धः; कठिनः / कठोरः; उचितः / समीचीनः; दया / करुणा / कृपा; यदि / चेत्; तदा / ततः / तर्हि / अथ; वदति / भाषते; ददाति / यच्छति / प्रयच्छति; शेते / स्वपिति; वसति / निवसति / जीवति; क्षालयति / प्रक्षालयति; चिन्तयति / मन्यते; नमति / वन्दते; लभते / प्राप्नोति; रक्षति / पालयति; छिनत्ति / कृन्तति.
- Masculine / feminine pairs sharing a gloss word: छात्रः / छात्रा, गायकः / गायिका, नर्तकः / नर्तकी, भवान् / भवती, भवतः / भवत्याः, कः / का, एषः / एषा / एतत्.
- **English homonyms that collide**: "light" (प्रकाशः, लघुः); "well" (कूपः, कुशलः, सम्यक्); "date" (खर्जूरम्, तिथिः, दिनाङ्कः); "right" (दक्षिणः, समीचीनः); "letter" (अक्षरम्, पत्रम्); "state" (राज्यम्, भावः); "serves" (सेवते, परिवेषयति); "old" (पुरातनः, जीर्णः, वृद्धः); "high" (उन्नतः, उच्चैः).
- **Sanskrit homographs inside the pack**: पत्रम् (leaf / letter), पक्षः (wing / fortnight), पृष्ठम् (back / page), गुरुः (teacher / heavy), साधुः (holy man / good), वृद्धः (old man / old), किम् (pronoun / particle), and **अन्तः** = अन्त "end" (noun, `anta`) vs अन्तर् "inside" (avyaya, `antah`).
- **Gender varies by sense or usage**: मित्रम् n. "friend" (मित्रः m. is the sun); वर्षम् n. "year" / वर्षा f. "rain"; पत्रम्; उत्तरम् n. "answer" / उत्तरः adj. "northern"; दक्षिणः "southern" and "right"; रक्तम् n. "blood" / रक्तः "red"; सत्यम् n. / सत्यः adj.; बाहुः, नखः, चरणः, कपाटः, आकाशः, ओदनम्, शकटम्, शाकम्, तिथिः, कुटुम्बम्, पुच्छम्, नीडम्, द्वीपः (two genders in the dictionaries — do not use these for gender quizzes).
- **Emoji** are unique only within a category; 76 emoji recur across categories. Misleading for emoji → word games: 🐘 गजः / महान्; 🦊 शृगालः / चतुरः (and a fox is not a jackal); 🐢 कूर्मः / मन्दः; 🪨 शिला / कठिनः; 🧸 क्रीडनकम् / मृदुः; 🥇 स्वर्णम् / प्रथमः; 🍽️ आहारः / स्थालिका / बुभुक्षितः / खादति; 💡 प्रकाशः / विद्युद्दीपः / जानाति; 🙏 भक्तिः / नमः / वन्दते; ➡️ ⬅️ ⬆️ ⬇️ for पूर्वः / पश्चिमः / उत्तरः / दक्षिणः (➡️ reads as "right", but "right" is दक्षिणः, which carries ⬇️); 👄 for ओष्ठः (lip) while मुखम् has none; 💐 for माला; 📿 for हारः; 🌶️ for मरीचम्.

**Shabda — one form, several cells**
- Across paradigms: ते (तद् m. 1.3, f./n. 1.2 and 2.2, युष्मद् enclitic 4.1 / 6.1); every एन- form is shared by एतद् and इदम्; महति / महती (महत् vs महती); go-m and go-f are identical tables; ब्रह्मन् m. / n. and श्रेयस् m. / n. share all oblique cells.
- Nominal forms that are also finite verbs: भवति (भवत् 7.1 = laṭ of भू), गच्छति / गच्छते / गच्छतः (गच्छत् 7.1, 4.1, 5.1 = laṭ forms), कुर्वते, कुर्वतः, सति.
- Usual syncretism (dual 1 = 2 = 8, 3 = 4 = 5, 6 = 7; plural 4 = 5; neuter 1 = 2): "which vibhakti is this?" needs multi-answer acceptance.

**Dhatu — one form, several cells or roots**
- Ubhayapadī a-class roots (all bhvādi, divādi, tudādi, curādi `U` entries): पचेत = vidhiliṅ P madhyama bahu and Ā prathama eka; अपचत = laṅ P madhyama bahu and Ā prathama eka; पचताम् = loṭ P prathama dvi and Ā prathama eka; पचेताम् = vidhiliṅ P prathama dvi and loṭ Ā prathama dvi.
- Within one table: laṅ prathama eka = madhyama eka in अहन्, अवेत्, अधोक्, अद्वेट्, अभुनक्, अयुनक्, अपिनट्, अजागः, अबिभः, अरुणत्, अभिनत्, अच्छिनत्, अहिनत्; रुन्द्धः, दुग्धः (prathama dvi = madhyama dvi).
- Across roots: वक्ष्यति (ब्रू, वह्); करिष्यति and करणीयः (कृ, कॄ); हित्वा (धा, हा); इष्ट्वा / इष्टः (यज्, इष्); विदित्वा / वेदितुम् / वेदनीयः (`vid-2p`, `vid-6u`); मोक्ष्यति (मुच्; alternate of मुह्); every non-present form of `krs-1p` and `krs-6u`; **आस्त** = laṅ prathama eka of आस् and laṅ madhyama bahu of अस्; आसीत (आस् vidhiliṅ) vs आसीत् (अस् laṅ); भविष्यति listed under both भू and अस्; यानि (या loṭ uttama eka = यद् n. plural).
- श्रु is gaṇa 1 in the data. That is the correct dhātupāṭha classification (श्रु श्रवणे, bhvādi; श्रुवः शृ च 3.1.74), and the note is accurate. Samskrita Bharati's dhāturūpa booklets also file it under bhvādi; Western school grammars say class 5. A "which gaṇa?" game must skip श्रु or accept 1 and 5.

## (e) Convention observations

- **Nasals / final म्**: consistent in all four packs — class nasal before stops (गच्छन्ति, सङ्गणकम्, भुङ्क्ते), anusvāra before sibilants and ह (मनांसि, हंसि, पिंष्टः, संहरति), word-final म्. Only vocab phrases write anusvāra (कुशलं वा, सर्वं कुशलम्, शुभं भवतु), as documented.
- **Sandhi between words**: the sentences pack applies none, consistently, in all 671 (न आगच्छति, सः उपाविशत्, बालिका अपि, फलम् अत्र); `sentenceTextAnusvara` changes म् only before a consonant and never sentence-finally — correct. Vocab phrases are mixed: नमो नमः, पुनर्मिलामः, चिन्ता मास्तु are joined (all three correctly), but पुनः वदतु, हरिः ओम्, भवतः नाम किम् are not. Acceptable as spoken usage; say so in the README.
- **Augment with prefixes**: all six prefixed laṅ forms that occur are right — प्राविशत्, उपाविशत्, अवागच्छत्, आगच्छः, आनयन्, उदतिष्ठत — as are the prefixed lṛṭ / loṭ forms (आनेष्यति, प्रवेक्ष्यथ, उपवेक्ष्यति, उत्थास्यन्ति, आगमिष्यथ, अवगमिष्यन्ति, विस्मरिष्यति, उद्घाटयिष्यति). निरगच्छत् and अन्वभवत् do not occur.
- **भवान् / भवती** always take the prathama-puruṣa verb (checked in all sentences that use them, including loṭ).
- **Shabda display forms** (judgement calls, all defensible): मत्यै before मतये and नाम्नि before नामनि match the common śabdarūpāvalīs; श्रीणाम् before श्रियाम् and भूनाम् before भुवाम् are the reverse of many printed tables; अष्ट before अष्टौ suits spoken counting but classical tables print अष्टौ first; हे नाम before हे नामन् is fine.
- **Dhatu display forms**: शृणुवः, बिभीतः, रुन्द्धः, भिन्त्तः, स्पर्क्ष्यति, नर्तिष्यति, ब्रवीति, अयान्, अरोदीत् are acceptable first forms (many books print भिन्तः / छिन्तः; both are accepted). The stated rule "laṅ 2sg in visarga first" is applied to अशाः / अशात् and अहिनः / अहिनत् but not to अरुणत् / अरुणः, अभिनत् / अभिनः, अच्छिनत् / अच्छिनः.
- **Vocab levels**: nothing at level ≤ 1 is out of place for a camp learner. Borderline for L1: वित्तकोषः, जङ्गमदूरवाणी, प्रकोष्ठः, परह्यः, एकत्र, अन्यत्र.
- **Coinages and modern senses**: all 72 + 16 are forms I recognise from Samskrita Bharati usage; none looks invented. Alternatives a learner will also meet: बस्यानम् (लोकयानम्), वार्तापत्रिका (समाचारपत्रम्), विमाननिलयः (विमानपत्तनम्), कार्यानम् (कारयानम्), प्राणिसङ्ग्रहालयः (जन्तुशाला). This judgement is from memory, not checked against printed Samskrita Bharati material.
- **Pattern count**: `data.ts` contains 27 pattern ids, not 28.

## (f) Not examined — do not over-trust this audit

- Nothing was compared with a printed śabda-mañjarī, dhāturūpāvalī or Samskrita Bharati book; all judgements rest on the standard paradigms as I know them, Pāṇinian rules, and MW look-ups for six words.
- **dhatu**: full paradigms were read for 57 of 199 roots (अस्, कृ, दा, धा, हन्, इ, ब्रू, शी, आस्, विद् ×2 (`vid-2p`, `vid-6u`), रुद्, स्वप्, या, स्ना, हु, भी, श्रु, शक्, आप्, चि, ज्ञा, क्री, ग्रह्, बन्ध्, रुध्, भुज्, युज्, भिद्, छिद्, तन्, दृश्, स्था, पा, गम्, इष्, प्रच्छ्, मृ, जन्, अद्, जागृ, शास्, स्तु, दुह्, द्विष्, हा, भृ, मा, मन्, तृप्, पिष्, हिंस्, पू, अश्, घट्, शिक्ष्, कूर्द्). For these, the vidhiliṅ and the Ā tables of lṛṭ / loṭ were skipped for about half. For the other 142 roots only laṅ 3sg, lṛṭ 3sg, loṭ 2sg, vidhiliṅ 3sg (and the Ā counterparts) were read — about 11,000 of 12,385 finite forms were not read individually. Of the 373 multi-form cells about 130 were seen. ktavatu and tavya were checked only by script against kta and tumun. `artha`, `upadesha`, `dhatupatha` numbers and `evidence` were not checked.
- **vocab**: glosses were read once; `paradigm` links were verified only for ṇatva and stem class (by script), not form by form for consonant stems; provenance tags not checked; emoji judged from the code point, not as rendered.
- **sentences**: per-word `en` / `role` / `lemma` / `tag` were read for about 60 sentences plus every distinct combination; `topic`, `level` and provenance were not reviewed.
- **shabda**: `level` tags were only skimmed for plausibility; provenance not checked.
- The samasa, sandhi and subhashita packs, all games, and all generator and test code are outside this audit.
