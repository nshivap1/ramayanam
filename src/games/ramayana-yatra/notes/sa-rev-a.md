# sa-rev-a: Sanskrit review of `content/sa-dialogue-1.json` (opening, Bāla Kāṇḍa, Ayodhyā Kāṇḍa)

OWNER: sa-rev-a (independent reviewer, 2026-11-11). Scope: the `sa` field of all 345 entries, plus `models`. `en`/`ctx` untouched (verified by diff: 0 changed). Files 2 and 3 were not touched, and no merge scripts were run.

**Numbering.** `#N` is the **0-based** array index (`entries[N]`). The translator's flags use the same numbering: #7 is Nārada's "गुरोः उपकुरु" line, #29 is "एतत् श्लोकः अभवत्", and the वत्स list #3 … #259 matches.

**Gates after the last edit:** `check.ts content/sa-dialogue-1.json` → 345/345 translated, 0 with problems. `node tools/test.mjs unit games/ramayana-yatra/sambhashana.test` → 10/10 pass. JSON valid.

## Summary

| | count |
|---|---|
| lines checked | 345 (each read twice, against the English and the ctx/speaker) |
| lines changed | 57 |
| models added | 1 (सरयू f., `vadhu-f`, MW sarayU f.) |

Changes by category (a line can count in more than one):

| category | lines | entries |
|---|---|---|
| player gender `{g:वत्स\|वत्से}` | 12 | 3, 7, 17, 19, 61, 62, 72, 85, 253, 257, 258, 259 |
| meaning / clarity / learner trap | 28 | 11, 36, 56, 60, 66, 72, 81, 84, 91, 97, 104, 107, 111, 148, 159, 160, 209, 217, 222, 229, 235, 248, 261, 262, 279, 282, 284, 294 |
| case / valency | 8 | 3, 102, 113, 161, 162, 224, 235, 335 |
| agreement | 6 | 29, 42, 111, 173, 290, 291 |
| tense / mood | 5 | 42, 240, 255, 325, 328 |
| consistency (terms, directions) | 4 | 11, 52, 105, 242 |
| register | 1 | 217 |
| level | 1 | 104 |
| translator doubts resolved | 8 changed + 2 kept | changed: 7*, 29, 36, 102, 104, 173, 222, 282 (*#7: {g:} only, the grammar was kept) · kept: 80, and #224 (see below) |

### Real grammar errors found (the ones a teacher would mark)
- **#291** `ते … वदतः`: ते is not the masculine dual. Two men → **तौ**.
- **#290** `तव स्नेहः … पर्याप्तम्`: the predicate adjective does not agree with masculine स्नेहः → rephrased "तव स्नेहेन एव अहं प्रसन्नः".
- **#66** `यावत् त्वं तान् न विस्मरसि` meant "as long as you do *not forget* them", the opposite of "until they stick" → "यावत् त्वं तान् सम्यक् न जानासि".
- **#42** `आरभामहे वा?` is plural, but there are two speakers → dual loṭ **आरभावहै**.
- **#29** `एतत् श्लोकः अभवत्` → "मम शोकः श्लोकः अभवत्" (also Vālmīki's own idea: शोकः श्लोकत्वम् आगतः).
- **#111** the elliptical `तस्याः पुत्रः मारीचः अपि` left Mārīca with the feminine राक्षसी → a full clause with राक्षसः. Also "her strength is like a thousand elephants" → "the strength of a thousand elephants".
- **#60, #209** `सर्वे शब्दाः … न सन्ति` reads "no word is in place"; EN "some words are still out of place" → के अपि शब्दाः अद्य अपि उचिते स्थाने न सन्ति.
- **#3, #161, #162, #335** intransitive आरभते ("the story/book begins"): आ+रभ् is transitive. The passive आरभ्यते is not in the packs, so the noun is used instead: अयोध्याकाण्डस्य आरम्भः.
- **#224** `देवेभ्यः उपकर्तुम्`: उप+कृ takes the genitive (as in #7 and #240) → देवानाम्.
- **#325, #328** present प्रेषयति for "the teacher *sent* me" (प्रेषितवान् is not in the packs) → "गुरोः वचनेन अहम् अत्र आगतवान्".

### Translator's doubts: resolutions
- **#29** "एतत् श्लोकः अभवत्": fixed (above).
- **#173** "लघुः पेटिका": the feminine लघुः is grammatical (P. 4.1.44 वोतो गुणवचनात्: लघुः/लघ्वी optional), but a learner sees a masculine-looking adjective on a feminine noun, and the checker only knows masculine लघुः. लघ्वी and अल्पा are not in the packs → "एका पेटिका अस्ति, सा न महती".
- **#222** gloss of {w:dvis}: "प्रथमं पुनः च" → "सकृत्, पुनः च सकृत्" ("once, and once again"). This pairs with the next sentence's सकृत् एव. वारद्वयम्/द्विवारम्/द्वौ वारौ are not in the packs.
- **#102** "यं … गीतवान्": गै + accusative of the person praised is possible but opaque → "यस्य कथां … गीतवान्"; "तं नारदं श्रुतवान्" → "नारदस्य गीतं श्रुतवान्".
- **#7** "गुरोः उपकुरु": **kept**. उप+कृ with the genitive of the person helped is standard (Apte: "with gen."), and साहाय्यम् is not in the packs. Added {g:}.
- **#104**: `श्लोकान् पठतः जनस्य` (śatṛ genitive) is a homograph of the verb पठतः "the two read", a learner trap. Also "एते शब्दाः" = "these very words", not "words like these" (एतादृशाः is not in the packs) → "यः श्लोकान् पठति, तस्य शब्दाः एव बाणाः".
- **#36**: the dangling "कथायाः आरम्भात् पूर्वम् एव" (no verb) → "कथा अद्य अपि न कथिता, परन्तु एषा छाया पूर्वम् एव कथायाः शत्रुः". द्वेष्टि verifies but is an L4 root, so I avoided it.
- **#282** vagueness ("तव पत्रे"): → सूच्याम् ("in the menu/list"). #11 uses the same word for Menu.
- **मा + loṭ** (task list #80, #224, #255; in the file, मा + loṭ occurs at #80, #81, #240, #255):
  - #240 मा कुप्य → **न कुप्येः**, and #255 मा त्यज → **न त्यजेः** (न + vidhiliṅ, fully standard, natural for advice);
  - #80 **मा लभस्व kept**: it mirrors the verse's मा, and #81 explains that very word;
  - #81 "एवं मा भवतु" **kept**: it illustrates मा;
  - #224 has no मा. Its issue was उपकृ + dative (fixed above).
  - मास्तु in "चिन्ता मास्तु" (#60, #61) is the vocab phrase. Fine.

### Checked and deliberately kept (so the next reader doesn't redo them)
- मित्र (vocative, #192, #201, #296, #297) and मित्रम्/मित्रस्य for the player (#39, #90, #91) are neuter, so they are gender-neutral for either avatar. No {g:} is needed.
- #135 "साधु, वत्स": addressed to Rāma, not the player, so masculine is correct.
- NPC genders were checked against sprites (story maps + `art-sprites.ts`): Guest = rishi (m) → आगतवान्; merchant has a mustache → चितवान्; the Siddhāśrama "Young student" uses the `child` sprite (tuft) → वदन्; grandpa/citizen_a are villager_m → दृष्टवान्, मां दरिद्रम्.
- भवान्/भवती always take 3rd-person verbs (#114, #229, #239, #241, #289, #311, #313, and the polite objectives). Elders use त्वम्/वत्स to the student.
- सह + instrumental, कृते + genitive, कुप् + dative (#240), भी + ablative (#251), स्निह् + locative (#261, #300), पृच्छ् with two accusatives (#5), कथय् + dative (#86, #235): all OK.
- Directions: motion पूर्वां दिशं गच्छतु; location पूर्वस्यां दिशि / पश्चिमायां दिशि (fixed #52, #242). Signs use the nominative "पूर्वा दिक्:".
- Terms: shrine = मन्दिरम् everywhere; word book = शब्दानां पुस्तकम्; verse book = श्लोकानां पुस्तकम्; verse card = श्लोकस्य पत्रम् (#105 fixed; #11 now names both books).

## Human-review list (needs a Sanskrit teacher's judgement)
1. **मा + loṭ kept** at #80 "मा लभस्व" and #81 "एवं मा भवतु" (the verse-explanation lines). Classical would be मा + aorist (as in the verse itself: मा … अगमः) or न + vidhiliṅ (न लभेथाः verifies, if preferred).
2. **#222** gloss "सकृत्, पुनः च सकृत्" for "twice". Is it clear enough, or does the teacher prefer द्विवारम्/वारद्वयम् (which would need a pack addition)? सकृत् is not a Sambhāṣaṇa-core word (spoken: एकवारम्, which is not in the packs).
3. **Menu = सूची** (#11, #282) and "Relaxed" = शान्तः मार्गः (#282). Also #71 "तव पत्रे अक्षराणि चिनु" for "pick the script in your Samskuru profile settings" (kept; no verified word for settings/profile). The UI labels themselves are English.
4. **#3/#161/#162/#335**: I replaced intransitive आरभते with आरम्भः. If the teacher accepts the modern intransitive use (कार्यक्रमः आरभते), the originals were fine. **#99** "दिनम् आरब्धम्" (kta, "has begun") was kept.
5. **#7, #240** उप+कृ + genitive ("गुरोः उपकुरु", "मम उपकुरु"): kept as standard. Confirm for the level (spoken usage prefers साहाय्यं करोतु, not in the packs).
6. **#229** "कैकेय्याः एका परिचारिका" for "her maid Manthara": the vocab gloss of परिचारिका is "nurse" (Mantharā is traditionally Kaikeyī's nurse-maid). The name मन्थरा is not in the packs.
7. **#28** "ते शब्दाः सुन्दराः पूर्णाः च" for "measured and whole": "measured" (metrical) is simplified to "beautiful". Acceptable?
8. **#89** "प्रथमं सन्ध्यां कुर्वः" (colloquial for सन्ध्याम् उपास्महे / सन्ध्यावन्दनं कुर्वः).
9. **Homograph verifications** the checker accepted for another sense: #159 शिवस्य (lexicon शिव "auspicious", used for the god Śiva); #148 षष्ठी (verified as the case-name, used as the ordinal "sixth night"); #291 जागृतः (laṭ 3du of जागृ, also kta). The forms are right, but confirm that the readings are clear.
10. **#155** "मारीचः तत्र मूढः पतति" for "stunned": मूढ = stupefied, but learners know it as "foolish". मूर्च्छितः is not in the packs.
11. **#173** "सा न महती" for "small" (to avoid feminine लघुः, see above). If the teacher is happy with "लघुः पेटिका" (P. 4.1.44), the original can return.
12. **New model** सरयू f. (`vadhu-f`, ṇatva re-derived, MW sarayU f.) for #84 "सरय्वाः नद्याः तीरे". Existing models in this file (unchanged): तीर n., इक्ष्वाकु m. (guru-m → इक्ष्वाकूणाम्), वीणा, वाद, मन्त्र, यज्ञ, अस्त्र, गङ्गा, विष्णु, बाण, सिद्धाश्रम m., मन्दाकिनी.
13. **Level**: आशीः/आशिषम्/आशिषा (L4, ashis-f) ×8 in the Sumitrā blessing lines, and धनुः (L4) ×4. These are story-essential and were kept. शुश्रूषायाः (#269) is a verse word, kept.
14. **Simplifications that drop a name** (the name is not in the packs): Vāmana → "ह्रस्वः बालः" (#140, #166); Mithilā → "जनकस्य नगरम्" (#159); Prayāga dropped (#295); "weapon of Manu" → "एकम् अस्त्रम्" (#155).

## Change log (entry, before → after, reason)

### #3 · common.intro · person.narada
- EN: Every story worth telling begins with a question, child. Listen to how this one begins.
- before: वत्स, सर्वाः कथाः प्रश्नेन आरभन्ते। एषा कथा कथम् आरभते? शृणु।
- after: {g:वत्स|वत्से}, सर्वासाम् उत्तमानां कथानाम् आरम्भे प्रश्नः भवति। एतस्याः कथायाः आरम्भं शृणु।
- why (player gender, case/valency): player gender {g:}; intransitive आरभन्ते/आरभते ('a story begins') is not standard: आ+रभ् is transitive (the intransitive sense needs the passive आरभ्यते, not in the packs) → noun आरम्भ; 'worth telling' → उत्तमानाम्

### #7 · common.intro · person.narada
- EN: I must go on my way. Tell his story well, and let this child help you.
- before: अहम् इदानीं गच्छामि। वाल्मीके, रामस्य कथां सम्यक् कथय। वत्स, त्वम् अपि गुरोः उपकुरु।
- after: अहम् इदानीं गच्छामि। वाल्मीके, रामस्य कथां सम्यक् कथय। {g:वत्स|वत्से}, त्वम् अपि गुरोः उपकुरु।
- why (player gender, translator doubt): player gender {g:}; translator doubt 'गुरोः उपकुरु' resolved: उप+कृ with genitive of the person helped is standard (Apte s.v. upakṛ: 'with gen.'), kept

### #11 · common.intro · narration
- EN: Press Menu (M) to see your party, your items, your word book {n:ui.words}, your verse book {n:ui.verses}, and the settings.
- before: सर्वदा मित्राणि, वस्तूनि, शब्दान्, श्लोकान् च पश्यतु।
- after: सूच्यां मित्राणि, वस्तूनि, शब्दानां पुस्तकम्, श्लोकानां पुस्तकं च पश्यतु।
- why (consistency, meaning/clarity): word book / verse book were missing ('शब्दान्, श्लोकान्' = words, verses); game-wide terms शब्दानां पुस्तकम् / श्लोकानां पुस्तकम्; 'Menu' → सूची (list), same word as #282

### #17 · ch1.narada · person.narada
- EN: Listen well, child. A great story is about to be born.
- before: वत्स, सम्यक् शृणु। महती कथा अधुना जायते।
- after: {g:वत्स|वत्से}, सम्यक् शृणु। महती कथा अधुना जायते।
- why (player gender): player gender {g:}

### #19 · ch1.valmiki_bank · person.valmiki
- EN: Bharadvaja wishes to test you, child. Speak with him.
- before: वत्स, भरद्वाजः तव परीक्षां कर्तुम् इच्छति। तेन सह वद।
- after: {g:वत्स|वत्से}, भरद्वाजः तव परीक्षां कर्तुम् इच्छति। तेन सह वद।
- why (player gender): player gender {g:}

### #29 · ch1.krauncha · person.valmiki
- EN: What have I spoken? It came from grief, and it has become a verse.
- before: अहं किम् उक्तवान्? एतत् शोकात् आगतम्। एतत् श्लोकः अभवत्।
- after: अहं किम् उक्तवान्? एतत् शोकात् आगतम्। मम शोकः श्लोकः अभवत्।
- why (agreement, translator doubt): translator doubt 'एतत् श्लोकः अभवत्': neuter pronoun with a masculine predicate noun after 'became' is unidiomatic → 'मम शोकः श्लोकः अभवत्' (echoes Vālmīki's own शोकः श्लोकत्वम् आगतः, Bāla 2)

### #36 · ch1.krauncha · person.valmiki
- EN: This is illusion: a shadow that hates the story before it is even told. It has scattered every verse I am yet to sing.
- before: एषा माया। एषा छाया कथायाः शत्रुः, कथायाः आरम्भात् पूर्वम् एव। यान् श्लोकान् अहं गास्यामि, तान् सर्वान् एषा विक्षिप्तवती।
- after: एषा माया, एका छाया। कथा अद्य अपि न कथिता, परन्तु एषा छाया पूर्वम् एव कथायाः शत्रुः। यान् श्लोकान् अहं गास्यामि, तान् सर्वान् एषा विक्षिप्तवती।
- why (meaning/clarity, translator doubt): translator doubt: the dangling phrase 'कथायाः आरम्भात् पूर्वम् एव' (no verb, unclear attachment) → a full clause 'the story is not yet told, but this shadow is already its enemy' (द्वेष्टि 'hates' verifies but is an L4 root, so शत्रुः kept)

### #42 · ch1.bharadvaja_duel · person.bharadvaja
- EN: Answer swiftly and perfectly, and it lands even harder. Ready?
- before: शीघ्रं सम्यक् च उत्तरं वद, तदा तव वाक्यम् अधिकं बलं प्राप्नोति। आरभामहे वा?
- after: शीघ्रं सम्यक् च उत्तरं वद, तदा तव वाक्यम् अधिकं बलं प्राप्नोति। किम् आरभावहै?
- why (agreement, tense/mood): 'आरभामहे वा?' = plural present 'do we (3+) begin?'; Bharadvāja and the player are two → dual loṭ आरभावहै 'shall we two begin?'

### #52 · ch1.valmiki_shrine · person.valmiki
- EN: Go into the story, {player}. Walk beside Rama, hear each verse where it is spoken, and restore it at a shrine. The east gate will open for you.
- before: {player}, कथां प्रविश। रामेण सह चल। यत्र जनाः श्लोकं वदन्ति, तत्र तं शृणु। ततः मन्दिरे तं पूर्णं कुरु। पूर्वां दिशं प्रति द्वारम् अस्ति। तत् तुभ्यम् उद्घाटितं भविष्यति।
- after: {player}, कथां प्रविश। रामेण सह चल। यत्र जनाः श्लोकं वदन्ति, तत्र तं शृणु। ततः मन्दिरे तं पूर्णं कुरु। पूर्वस्यां दिशि द्वारम् अस्ति। तत् तुभ्यम् उद्घाटितं भविष्यति।
- why (consistency): location of the east gate: पूर्वस्यां दिशि (locative), not motion 'पूर्वां दिशं प्रति'

### #56 · ch1.valmiki_shrine · person.valmiki
- EN: To recite is to put the scattered words back in their places, quarter by quarter. Recite the verse of the krauncha for me.
- before: यदा त्वं पठसि, तदा विक्षिप्ताः शब्दाः पुनः तेषां स्थानं गच्छन्ति, पादे पादे। मम कृते क्रौञ्चस्य श्लोकं पठ।
- after: यदा त्वं पठसि, तदा विक्षिप्ताः शब्दाः पुनः उचितं स्थानं गच्छन्ति, पादे पादे। मम कृते क्रौञ्चस्य श्लोकं पठ।
- why (meaning/clarity): 'तेषां स्थानं' (non-reflexive 'their place', could be someone else's) → उचितं स्थानम् (the right place), same wording as #60/#209

### #60 · ch1.valmiki_shrine · person.valmiki
- EN: Some words are still out of place. Do not worry: rest, look at the verse card again, and recite it for me once more.
- before: सर्वे शब्दाः तेषां स्थाने न सन्ति। चिन्ता मास्तु। विश्राम्य, श्लोकस्य पत्रं पुनः पश्य, मम कृते पुनः पठ च।
- after: के अपि शब्दाः अद्य अपि उचिते स्थाने न सन्ति। चिन्ता मास्तु। विश्राम्य, श्लोकस्य पत्रं पुनः पश्य, मम कृते पुनः पठ च।
- why (meaning/clarity): 'सर्वे शब्दाः … न सन्ति' reads 'no word is in its place' (सर्व + न ambiguity); EN 'some words are still out of place' → के अपि शब्दाः अद्य अपि उचिते स्थाने न सन्ति

### #61 · ch1.valmiki_shrine · person.valmiki
- EN: Take your time, child. Speak to me again when you are ready.
- before: वत्स, चिन्ता मास्तु। यदा इच्छसि, तदा पुनः मया सह वद।
- after: {g:वत्स|वत्से}, चिन्ता मास्तु। यदा इच्छसि, तदा पुनः मया सह वद।
- why (player gender): player gender {g:}

### #62 · ch1.gate_locked · narration
- EN: The path east shimmers like heat over sand. Valmiki calls after you: "Restore the verse at the shrine first, child. Talk to me there when you are ready."
- before: पूर्वां दिशं प्रति मार्गः वालुकायाम् आतपः इव कम्पते। वाल्मीकिः त्वाम् आह्वयति, "वत्स, प्रथमं मन्दिरे श्लोकं पूर्णं कुरु। यदा इच्छसि, तदा तत्र मया सह वद।"
- after: पूर्वां दिशं प्रति मार्गः वालुकायाम् आतपः इव कम्पते। वाल्मीकिः त्वाम् आह्वयति, "{g:वत्स|वत्से}, प्रथमं मन्दिरे श्लोकं पूर्णं कुरु। यदा इच्छसि, तदा तत्र मया सह वद।"
- why (player gender): player gender {g:}

### #66 · ch1.bharadvaja_ashrama · person.bharadvaja
- EN: Did you know? Each word you answer correctly grows stronger in your word book. Words you miss come back more often, until they stick.
- before: किं त्वं जानासि? यस्य शब्दस्य उत्तरं त्वं सम्यक् ददासि, सः शब्दानां पुस्तके बलवान् भवति। यान् शब्दान् विस्मरसि, ते पुनः पुनः आगच्छन्ति, यावत् त्वं तान् न विस्मरसि।
- after: किं त्वं जानासि? यस्य शब्दस्य उत्तरं त्वं सम्यक् ददासि, सः शब्दानां पुस्तके बलवान् भवति। यान् शब्दान् त्वं विस्मरसि, ते पुनः पुनः आगच्छन्ति, यावत् त्वं तान् सम्यक् न जानासि।
- why (meaning/clarity): 'यावत् त्वं तान् न विस्मरसि' = 'as long as you do not forget them' (the opposite of 'until they stick') → 'यावत् त्वं तान् सम्यक् न जानासि' = until you know them well

### #72 · ch1.cowherd · Cowherd
- EN: The cows were restless last night, as if a shadow walked among the trees. Stay on the path, young one.
- before: ह्यः रात्रौ धेनवः चञ्चलाः आसन्। वृक्षाणां मध्ये छाया इव अचलत्। वत्स, मार्गे एव चल।
- after: ह्यः रात्रौ धेनवः चञ्चलाः आसन्। वृक्षाणां मध्ये का अपि छाया अचलत् इव। {g:वत्स|वत्से}, मार्गे एव चल।
- why (player gender, meaning/clarity): player gender {g:}; 'छाया इव अचलत्' had no subject ('[it] moved like a shadow') → 'का अपि छाया अचलत् इव' (as if some shadow walked)

### #81 · ch1.young_student · Young student
- EN: The first word, {w:ma}, means "may you not". And {w:nishada} is the hunter. The whole verse is a wish, born of grief!
- before: प्रथमः शब्दः {w:ma}। तस्य अर्थः, एवं मा भवतु। {w:nishada} इति वनस्य जनः, यः पक्षिणः हन्ति। सर्वः श्लोकः एका इच्छा, शोकात् जाता!
- after: प्रथमः शब्दः {w:ma}। तस्य अर्थः, एवं मा भवतु। {w:nishada} इति वनस्य जनः, यः पक्षिणः हन्ति। अयं श्लोकः एका इच्छा, शोकात् जाता!
- why (meaning/clarity): 'सर्वः श्लोकः' is read by a learner as 'every verse' → 'अयं श्लोकः'

### #84 · ch1.road_dawn · narration
- EN: You stand on the bank of the Sarayu in the {w:sandhya} (twilight) before dawn. Two young men sleep on beds of leaves, and a sage in white sits beside them.
- before: प्रभातात् पूर्वम् {w:sandhya} अस्ति। त्वम् अन्यस्याः नद्याः तीरे तिष्ठसि। द्वौ युवकौ पर्णानां शय्यासु स्वपितः। तयोः पार्श्वे एकः मुनिः उपविशति। तस्य वस्त्रं श्वेतम्।
- after: प्रभातात् पूर्वम् {w:sandhya} अस्ति। त्वं सरय्वाः नद्याः तीरे तिष्ठसि। द्वौ युवकौ पर्णानां शय्यासु स्वपितः। तयोः पार्श्वे एकः मुनिः उपविशति। तस्य वस्त्रं श्वेतम्।
- why (meaning/clarity): 'अन्यस्याः नद्याः' ('another river') lost the Sarayū named in the English → सरय्वाः नद्याः; new model सरयू f. (vadhu-f, MW sarayU f.)

### #85 · ch1.road_dawn · person.vishvamitra
- EN: Who are you, child? You have the look of a student from a poet's hermitage.
- before: वत्स, किं तव नाम? किं त्वं कवेः आश्रमात् आगच्छसि?
- after: {g:वत्स|वत्से}, किं तव नाम? किं त्वं कवेः आश्रमात् आगच्छसि?
- why (player gender): player gender {g:}

### #91 · ch1.road_dawn · person.vishvamitra
- EN: A student of the poet who will one day sing of you. Let the child walk with us.
- before: यः कविः एकदा तव कथां गास्यति, तस्य आश्रमात् एतत् मित्रम् आगतम्। एतत् मित्रम् अपि अस्माभिः सह चलतु।
- after: यः कविः युवयोः कथां गास्यति, तस्य आश्रमात् एतत् मित्रम् आगतम्। एतत् मित्रम् अपि अस्माभिः सह चलतु।
- why (meaning/clarity): Viśvāmitra answers Lakṣmaṇa: 'तव कथाम्' would make the poem about Lakṣmaṇa alone → युवयोः (of you two); dropped 'एकदा' (normally 'once, in the past') with a future verb

### #97 · ch1.road_dawn · narration
- EN: In battle, choose a move and answer its question. A correct answer makes the move land. A swift and perfect answer lands it harder.
- before: युद्धे एकं कार्यं चिनु। ततः तस्य प्रश्नस्य उत्तरं वद। उत्तरं समीचीनं चेत्, कार्यं सिध्यति। शीघ्रं सम्यक् च उत्तरं चेत्, कार्यस्य बलम् अधिकं भवति।
- after: युद्धे एकं कार्यं चिनु। ततः तस्य प्रश्नस्य उत्तरं वद। उत्तरं समीचीनं चेत्, कार्यं सिध्यति। शीघ्रं सम्यक् च उत्तरं ददासि चेत्, कार्यस्य बलम् अधिकं भवति।
- why (meaning/clarity): 'शीघ्रं सम्यक् च उत्तरं चेत्' had adverbs with no verb → '… उत्तरं ददासि चेत्'

### #102 · ch1.road_sage · Wandering sage
- EN: So this is the prince the sage Narada sang of! I heard him once, by the Ganga.
- before: अहो, एषः एव सः राजकुमारः, यं नारदः मुनिः गीतवान्! अहम् एकदा गङ्गायाः तीरे तं नारदं श्रुतवान्।
- after: अहो, एषः एव सः राजकुमारः, यस्य कथां नारदः मुनिः गीतवान्! अहम् एकदा गङ्गायाः तीरे नारदस्य गीतं श्रुतवान्।
- why (case/valency, translator doubt): translator doubt 'यं … गीतवान्': गै + acc. of the person praised is possible but opaque to a learner → 'यस्य कथां … गीतवान्' (whose story Nārada sang); 'तं नारदं श्रुतवान्' → 'नारदस्य गीतं श्रुतवान्'

### #104 · ch1.road_sage · Wandering sage
- EN: Just so! Words like these are the arrows of a reciter.
- before: सत्यम्! एते शब्दाः एव श्लोकान् पठतः जनस्य बाणाः।
- after: सत्यम्! यः श्लोकान् पठति, तस्य शब्दाः एव बाणाः।
- why (meaning/clarity, level, translator doubt): translator doubt: 'श्लोकान् पठतः जनस्य' (śatṛ gen.) is a homograph of the verb पठतः 'the two read' and a learner trap; 'एते शब्दाः' meant 'these very words' not 'words like these' → relative clause 'for one who recites verses, words are the arrows'

### #105 · ch1.road_sage · Wandering sage
- EN: Look again at the card in your verse book. Each word has its meaning beside it.
- before: श्लोकानां पुस्तके पत्रं पुनः पश्य। सर्वेषां शब्दानां पार्श्वे तेषाम् अर्थः अस्ति।
- after: श्लोकानां पुस्तके श्लोकस्य पत्रं पुनः पश्य। सर्वेषां शब्दानां पार्श्वे तेषाम् अर्थः अस्ति।
- why (consistency): verse card = श्लोकस्य पत्रम् (game-wide term)

### #107 · ch1.road_cowherd · Cowherd
- EN: If you get hurt in the tall grass, eat some fruit from your bag. And the hermitage shrines will always restore you.
- before: उन्नते तृणे यदि वेदना भवति, तर्हि स्यूतात् फलं खाद। आश्रमस्य मन्दिरेषु अपि सदा पुनः बलं लभसे।
- after: उन्नते तृणे यदि तव वेदना भवति, तर्हि स्यूतात् फलं खाद। आश्रमाणां मन्दिरेषु अपि सदा पुनः बलं लभसे।
- why (meaning/clarity): 'यदि वेदना भवति' had no person ('if pain occurs') → तव वेदना; 'hermitage shrines' (all of them) → आश्रमाणां मन्दिरेषु

### #111 · ch1.tataka_story · person.vishvamitra
- EN: It is haunted by Tataka, a yakshi with the strength of a thousand elephants. The sage Agastya cursed her, and her son Maricha with her.
- before: तत्र ताटका वसति। तस्याः बलं गजानां सहस्रम् इव। अगस्त्यस्य मुनेः क्रोधात् सा राक्षसी अभवत्, तस्याः पुत्रः मारीचः अपि।
- after: तत्र ताटका वसति। तस्याः शरीरे सहस्रस्य गजानां बलम् अस्ति। अगस्त्यस्य मुनेः क्रोधात् सा राक्षसी अभवत्। तस्याः पुत्रः मारीचः अपि राक्षसः अभवत्।
- why (meaning/clarity, agreement): 'तस्याः बलं गजानां सहस्रम् इव' compared her strength to the elephants themselves → 'the strength of a thousand elephants is in her body'; elliptical 'तस्याः पुत्रः मारीचः अपि' left Mārīca with the feminine राक्षसी → full clause with राक्षसः

### #113 · ch1.tataka_story · person.vishvamitra
- EN: A king's son protects those who cannot protect themselves, Rama. That is his {w:dharma} (duty). She has emptied this whole land of people.
- before: राम, राज्ञः पुत्रः तान् जनान् रक्षति, ये स्वयं रक्षितुं न शक्नुवन्ति। एषः तस्य {w:dharma}। तस्याः भयात् सर्वे जनाः अस्याः भूमेः गतवन्तः।
- after: राम, राज्ञः पुत्रः तान् जनान् रक्षति, ये आत्मानं रक्षितुं न शक्नुवन्ति। एषः तस्य {w:dharma}। तस्याः भयात् सर्वे जनाः अस्याः भूमेः गतवन्तः।
- why (case/valency): 'स्वयं रक्षितुं' has no object ('to protect by themselves') → आत्मानं रक्षितुम् (protect themselves)

### #148 · ch1.yajna · Disciple
- EN: Five days have passed in peace. Tonight is the sixth night, the last. Are the princes ready?
- before: पञ्च दिनानि शान्त्या गतानि। अद्य रात्रिः यज्ञस्य अन्तः। किं राजकुमारौ सज्जौ?
- after: पञ्च दिनानि शान्त्या गतानि। अद्य षष्ठी रात्रिः। अद्य रात्रौ यज्ञस्य अन्तः। किं राजकुमारौ सज्जौ?
- why (meaning/clarity): 'अद्य रात्रिः यज्ञस्य अन्तः' is loose; restored 'the sixth night' and 'tonight' as locative अद्य रात्रौ

### #159 · ch1.yajna · narration
- EN: From Siddhashrama, Vishvamitra led the princes to Mithila. There Rama lifted the great bow of Shiva and broke it, and King Janaka gave him his daughter Sita in marriage.
- before: सिद्धाश्रमात् विश्वामित्रः राजकुमारौ जनकस्य नगरं नीतवान्। तत्र एकं दिव्यं महत् धनुः आसीत्। रामः तत् धनुः गृहीत्वा बलेन आकृष्टवान्। तदा धनुः नष्टम्। ततः जनकः राजा आत्मनः पुत्रीं सीतां रामाय दत्तवान्।
- after: सिद्धाश्रमात् विश्वामित्रः राजकुमारौ जनकस्य नगरं नीतवान्। तत्र शिवस्य महत् धनुः आसीत्। रामः तत् धनुः गृहीत्वा बलेन आकृष्टवान्। तदा धनुः नष्टम्। ततः जनकः राजा आत्मनः पुत्रीं सीतां रामाय दत्तवान्।
- why (meaning/clarity): restored 'the bow of Śiva' (EN) for 'एकं दिव्यं महत् धनुः'

### #160 · ch1.yajna · narration
- EN: Many happy years passed in Ayodhya. So ends the first book, the Book of Youth.
- before: अयोध्यायां बहवः सुखिनः संवत्सराः गताः। इति बालकाण्डम्।
- after: अयोध्यायां बहवः संवत्सराः सुखेन गताः। इति बालकाण्डम्।
- why (meaning/clarity): 'सुखिनः संवत्सराः' (सुखिन् = a happy person) → adverb सुखेन

### #161 · ch1.yajna · narration
- EN: From far away, you hear Valmiki's voice: "Well done, {player}. Turn the page. The next book begins in Ayodhya."
- before: दूरे वाल्मीकिः वदति, "साधु, {player}! नूतनं पृष्ठं पठ। अधुना अयोध्याकाण्डम् आरभते।"
- after: दूरे वाल्मीकिः वदति, "साधु, {player}! नूतनं पृष्ठं पठ। अधुना अयोध्याकाण्डस्य आरम्भः।"
- why (case/valency): intransitive 'अयोध्याकाण्डम् आरभते' (see #3) → अयोध्याकाण्डस्य आरम्भः

### #162 · ch1.yajna · objective (quest-log line, imperative to the player)
- EN: Walk into Ayodhya to begin Book 2.
- before: अयोध्यां प्रविशतु। तत्र अयोध्याकाण्डम् आरभते।
- after: अयोध्यां प्रविशतु। तत्र अयोध्याकाण्डस्य आरम्भः।
- why (case/valency): intransitive आरभते → noun आरम्भः (see #3)

### #173 · ch1.road_chest · narration
- EN: A small chest is tucked between the trees. Some traveller left it for the next one.
- before: वृक्षाणां मध्ये एका लघुः पेटिका अस्ति। कः अपि यात्रिकः ताम् अन्यस्य यात्रिकस्य कृते अत्र त्यक्तवान्।
- after: वृक्षाणां मध्ये एका पेटिका अस्ति, सा न महती। कः अपि यात्रिकः ताम् अन्यस्य यात्रिकस्य कृते अत्र त्यक्तवान्।
- why (agreement, translator doubt): translator doubt 'लघुः पेटिका': feminine लघुः is grammatical (u-stem guṇa adjective, fem. optional लघुः/लघ्वी, P. 4.1.44) but looks like a masculine mismatch to a learner, and the checker knows only the masculine; लघ्वी/अल्पा are not in the packs → 'सा न महती' (it is not big)

### #209 · ch2.priest · Temple priest
- EN: Almost. Some words are still out of place. Try again when you are ready.
- before: प्रायः समीचीनम्। सर्वे शब्दाः तेषां स्थाने न सन्ति। यदा इच्छसि, तदा पुनः यतस्व।
- after: प्रायः समीचीनम्। के अपि शब्दाः अद्य अपि उचिते स्थाने न सन्ति। यदा इच्छसि, तदा पुनः यतस्व।
- why (meaning/clarity): same सर्व + न ambiguity as #60

### #217 · ch2.citizen_c · Citizen
- EN: The market of Ayodhya has everything. If your heroes are weary, buy fruit. If their mantras run dry, buy honey.
- before: अयोध्यायाः आपणे सर्वम् अस्ति। वीराः श्रान्ताः चेत्, फलानि क्रीणातु। मन्त्राणां बलं नष्टं चेत्, मधु क्रीणातु।
- after: अयोध्यायाः आपणे सर्वम् अस्ति। भवतः वीराः श्रान्ताः चेत्, फलानि क्रीणातु। मन्त्राणां बलं नष्टं चेत्, मधु क्रीणातु।
- why (register, meaning/clarity): 'your heroes': added भवतः to match the polite क्रीणातु

### #222 · ch2.weaver · Citizen
- EN: {w:dvis} means "twice". Rama gives his word once, and keeps it, whatever it costs him.
- before: {w:dvis} इति शब्दस्य अर्थः, प्रथमं पुनः च। रामः वचनं सकृत् एव ददाति। तत् वचनं सः सदा पालयति, दुःखे अपि।
- after: {w:dvis} इति शब्दस्य अर्थः: सकृत्, पुनः च सकृत्। रामः वचनं सकृत् एव ददाति। तत् वचनं सः सदा पालयति, दुःखे अपि।
- why (meaning/clarity, translator doubt): translator doubt: gloss 'प्रथमं पुनः च' ('first and again') is unclear; 'twice' = 'once, and once again' (सकृत्, पुनः च सकृत्), which pairs with the next sentence's सकृत् एव. (वारद्वयम्/द्विवारम्/द्वौ वारौ are not in the packs)

### #224 · ch2.grandpa · Citizen
- EN: In my youth I saw King Dasharatha ride out to help the gods in battle. Queen Kaikeyi drove his chariot and saved his life that day.
- before: यदा अहं युवा आसम्, तदा दशरथं राजानं दृष्टवान्। सः देवेभ्यः उपकर्तुं युद्धं गतवान्। राज्ञी कैकेयी तस्य रथम् अनयत्। तस्मिन् दिने सा तस्य जीवनं रक्षितवती।
- after: यदा अहं युवा आसम्, तदा दशरथं राजानं दृष्टवान्। सः देवानाम् उपकर्तुं युद्धं गतवान्। राज्ञी कैकेयी तस्य रथम् अनयत्। तस्मिन् दिने सा तस्य जीवनं रक्षितवती।
- why (case/valency): उप+कृ takes the genitive (as in #7, #240), not the dative: देवेभ्यः → देवानाम्

### #229 · ch2.palace_scene · narration
- EN: Queen Kaikeyi, stirred up by her maid Manthara, reminded the king of the two boons he had promised her long ago, when she saved his life in battle.
- before: कैकेय्याः पार्श्वे एका वृद्धा आसीत्। सा कैकेय्याः मनः दुष्टं कृतवती। ततः कैकेयी राज्ञे उक्तवती, "पुरा भवान् मह्यं द्वौ वरौ दत्तवान्। तदा अहं युद्धे भवतः जीवनं रक्षितवती।"
- after: कैकेय्याः एका परिचारिका आसीत्। सा कैकेय्याः मनः दुष्टं कृतवती। ततः कैकेयी राज्ञे उक्तवती, "पुरा भवान् मह्यं द्वौ वरौ दत्तवान्। तदा अहं युद्धे भवतः जीवनं रक्षितवती।"
- why (meaning/clarity): 'an old woman beside Kaikeyī' → 'Kaikeyī's maid' (EN 'her maid Manthara'; परिचारिका = attendant/nurse; the name मन्थरा is not in the packs)

### #235 · ch2.palace_scene · narration
- EN: Kaikeyi tells him of the boons: Bharata will be crowned, and Rama must live in the forest for fourteen years.
- before: कैकेयी वरौ कथयति: भरतः राजा भविष्यति, रामः चतुर्दश वर्षाणि वने वसतु।
- after: कैकेयी रामाय वरौ कथयति: भरतः राजा भविष्यति, रामः चतुर्दश वर्षाणि वने वसतु।
- why (case/valency, meaning/clarity): EN 'tells him': कथयति had no person → रामाय (कथयति + dative of the person told)

### #240 · ch2.palace_scene · person.rama
- EN: Lakshmana, it is our father's word. Do not be angry with anyone. Help me keep it.
- before: लक्ष्मण, एतत् पितुः वचनम्। कस्मै अपि मा कुप्य। तत् पालयितुं मम उपकुरु।
- after: लक्ष्मण, एतत् पितुः वचनम्। कस्मै अपि न कुप्येः। तत् पालयितुं मम उपकुरु।
- why (tense/mood): prohibition मा कुप्य (मा + loṭ) → न कुप्येः (न + vidhiliṅ 'you should not be angry'), fully standard; कुप् + dative kept

### #242 · ch2.palace_scene · objective (quest-log line, imperative to the player)
- EN: Speak with Queen Sumitra, Lakshmana's mother, in the east chamber.
- before: पूर्वां दिशं गत्वा प्रकोष्ठे लक्ष्मणस्य मात्रा राज्ञ्या सुमित्रया सह वदतु।
- after: पूर्वस्मिन् प्रकोष्ठे लक्ष्मणस्य मात्रा राज्ञ्या सुमित्रया सह वदतु।
- why (consistency): 'in the east chamber' is a location → पूर्वस्मिन् प्रकोष्ठे, not 'पूर्वां दिशं गत्वा'

### #248 · ch2.kausalya · person.kausalya
- EN: My son is going to the forest. I asked to go with him, but he told me my place is beside the king.
- before: मम पुत्रः वनं गच्छति। अहं तेन सह गन्तुं याचितवती। परन्तु सः उक्तवान्, भवत्याः स्थानं राज्ञः पार्श्वे इति।
- after: मम पुत्रः वनं गच्छति। अहं तेन सह गन्तुं याचितवती। परन्तु सः उक्तवान्, 'भवत्याः स्थानं राज्ञः पार्श्वे' इति।
- why (meaning/clarity): Rāma's words are quoted directly (भवत्याः = Kausalyā); quote marks so the learner does not read 'your' as the listener

### #253 · ch2.sumitra · person.sumitra
- EN: Go with my blessing, my son. And you, child, keep these words safe.
- before: पुत्र, मम आशिषा सह गच्छ। वत्स, त्वम् अपि एतान् शब्दान् सम्यक् रक्ष।
- after: पुत्र, मम आशिषा सह गच्छ। {g:वत्स|वत्से}, त्वम् अपि एतान् शब्दान् सम्यक् रक्ष।
- why (player gender): player gender {g:}

### #255 · ch2.sumitra · person.sumitra
- EN: My son, you were born to stand beside Rama. In good fortune or in hardship, never neglect him.
- before: पुत्र, त्वं रामस्य पार्श्वे स्थातुं जातः। सुखे वा दुःखे वा, तं कदा अपि मा त्यज।
- after: पुत्र, त्वं रामस्य पार्श्वे स्थातुं जातः। सुखे वा दुःखे वा, तं कदा अपि न त्यजेः।
- why (tense/mood): मा त्यज (मा + loṭ) → न त्यजेः (vidhiliṅ of advice), natural for a mother's counsel

### #257 · ch2.sumitra · person.sumitra
- EN: You understand it well, child.
- before: वत्स, त्वं सम्यक् अवगच्छसि।
- after: {g:वत्स|वत्से}, त्वं सम्यक् अवगच्छसि।
- why (player gender): player gender {g:}

### #258 · ch2.sumitra · person.sumitra
- EN: Look at the verse card again, child. Each word is a gift.
- before: वत्स, श्लोकस्य पत्रं पुनः पश्य। तत्र सर्वे शब्दाः रत्नानि इव।
- after: {g:वत्स|वत्से}, श्लोकस्य पत्रं पुनः पश्य। तत्र सर्वे शब्दाः रत्नानि इव।
- why (player gender): player gender {g:}

### #259 · ch2.sumitra · person.sumitra
- EN: Child, this is the blessing I most want the world to keep. Recite it at a shrine to make it whole: the temple priest near the market will hear you.
- before: वत्स, एषा मम आशीः। लोकः एताम् आशिषं सदा स्मरतु इति मम इच्छा। मन्दिरे तां पठ, तदा तस्याः शब्दाः पुनः पूर्णाः भविष्यन्ति। आपणस्य पार्श्वे मन्दिरस्य पण्डितः त्वां श्रोष्यति।
- after: {g:वत्स|वत्से}, एषा मम आशीः। लोकः एताम् आशिषं सदा स्मरतु इति मम इच्छा। मन्दिरे तां पठ, तदा तस्याः शब्दाः पुनः पूर्णाः भविष्यन्ति। आपणस्य पार्श्वे मन्दिरस्य पण्डितः त्वां श्रोष्यति।
- why (player gender): player gender {g:}

### #261 · ch2.sumitra · person.sumitra
- EN: My sons Lakshmana and Shatrughna love their brothers more than themselves.
- before: मम पुत्रौ, लक्ष्मणः तस्य अनुजः च, भ्रातृषु आत्मनः अपि अधिकं स्निह्यतः।
- after: मम पुत्रौ, लक्ष्मणः शत्रुघ्नः च, भ्रातृषु आत्मनः अपि अधिकं स्निह्यतः।
- why (meaning/clarity): restored the name Śatrughna (EN) for 'तस्य अनुजः'

### #262 · ch2.pandita_1 · Scholar
- EN: A student of Valmiki? Then answer me this: why should a prince give up a kingdom for a promise someone else made? Defend your view!
- before: किं त्वं वाल्मीकेः आश्रमात् आगच्छसि? तर्हि वद। अन्यस्य वचनस्य कृते राजकुमारः राज्यं किमर्थं त्यजेत्? तव मतं रक्ष!
- after: किं त्वं वाल्मीकेः आश्रमात् आगच्छसि? तर्हि वद। अन्यः जनः यत् वचनं दत्तवान्, तस्य कृते राजकुमारः राज्यं किमर्थं त्यजेत्? तव मतं रक्ष!
- why (meaning/clarity): 'अन्यस्य वचनस्य कृते' also reads 'for the sake of another promise' (अन्य agreeing with वचन) → 'a promise that another person gave'

### #279 · ch2.vasishtha · person.vasishtha
- EN: Debate my three students. Each has a question about what you heard today. Persuade them all, then come to me.
- before: मम त्रिभिः शिष्यैः सह वादं कुरु। तेषां प्रश्नाः अद्य श्रुतानां श्लोकानां सन्ति। तान् सर्वान् जय, ततः मां प्रति आगच्छ।
- after: मम त्रिभिः शिष्यैः सह वादं कुरु। तेषां प्रश्नाः अद्य श्रुतेभ्यः श्लोकेभ्यः आगच्छन्ति। तान् सर्वान् जय, ततः मां प्रति आगच्छ।
- why (meaning/clarity): 'तेषां प्रश्नाः … श्लोकानां सन्ति' (questions 'of' the verses) → 'their questions come from the verses heard today'

### #282 · ch2.shala_student · Young student
- EN: If the questions come too fast, turn on Relaxed in the menu's Settings. Then there is no time limit at all.
- before: यदि प्रश्नाः अतीव शीघ्रम् आगच्छन्ति, तर्हि तव पत्रे शान्तं मार्गं चिनु। तदा यावत् इच्छसि, तावत् चिन्तयितुं शक्नोषि।
- after: यदि प्रश्नाः अतीव शीघ्रम् आगच्छन्ति, तर्हि सूच्यां शान्तं मार्गं चिनु। तदा यावत् इच्छसि, तावत् चिन्तयितुं शक्नोषि।
- why (meaning/clarity, translator doubt): translator doubt (vagueness): 'तव पत्रे' ('in your leaf') named no place → सूच्याम् (in the menu/list), as in #11

### #284 · ch2.enter_shringaverapura · narration
- EN: On the first night they rest on the bank of the Tamasa, and before dawn they slip away, so that the people will go home.
- before: प्रथमे दिने रात्रौ ते तमसायाः तीरे विश्राम्यन्ति। जनाः गृहं प्रत्यागच्छन्तु इति ते प्रभातात् पूर्वं तूष्णीं गच्छन्ति।
- after: प्रथमायां रात्रौ ते तमसायाः तीरे विश्राम्यन्ति। जनाः गृहं प्रत्यागच्छन्तु इति ते प्रभातात् पूर्वं तूष्णीं गच्छन्ति।
- why (meaning/clarity): 'प्रथमे दिने रात्रौ' → 'on the first night' प्रथमायां रात्रौ

### #290 · ch2.guha · person.rama
- EN: Guha, I have vowed to live as a hermit in the forest. Your love is gift enough.
- before: गुह, अहं वने मुनिः इव वत्स्यामि इति व्रतं कृतवान्। तव स्नेहः एव मम कृते पर्याप्तम्।
- after: गुह, अहं वने मुनिः इव वत्स्यामि इति व्रतं कृतवान्। तव स्नेहेन एव अहं प्रसन्नः।
- why (agreement): 'तव स्नेहः … पर्याप्तम्': predicate adjective must agree with masculine स्नेहः (पर्याप्तः is not in the packs) → 'I am pleased by your love alone'

### #291 · ch2.guha · narration
- EN: That night Guha and Lakshmana keep watch together, speaking of Rama until dawn.
- before: तस्यां रात्रौ गुहः लक्ष्मणः च सह जागृतः। ते प्रभातं यावत् रामस्य कथां वदतः।
- after: तस्यां रात्रौ गुहः लक्ष्मणः च सह जागृतः। तौ प्रभातं यावत् रामस्य कथां वदतः।
- why (agreement): 'ते … वदतः': ते is not the masculine dual; two men = तौ

### #294 · ch2.guha · narration
- EN: Guha's boatmen row them across the wide, shining Ganga.
- before: गुहस्य नाविकाः तान् नौकया अन्यत् तीरं नयन्ति। गङ्गायाः जलम् अतीव विशालं शोभते च।
- after: गुहस्य नाविकाः तान् नौकया अन्यत् तीरं नयन्ति। गङ्गायाः जलम् अतीव विशालम् अस्ति, तत् शोभते च।
- why (meaning/clarity): 'जलम् अतीव विशालं शोभते च' left विशालम् without a verb → '… विशालम् अस्ति, तत् शोभते च'

### #325 · ch2.bharadvaja · person.bharadvaja
- EN: {player}! The teacher sent me to see how you are doing. But look: a great crowd is coming up the hill. Go and see; we can debate later.
- before: {player}! तव कुशलं ज्ञातुं गुरुः माम् अत्र प्रेषयति। परन्तु पश्य, बहवः जनाः पर्वतम् आरोहन्ति। गत्वा पश्य। वादं पश्चात् करिष्यावः।
- after: {player}! तव कुशलं ज्ञातुं गुरोः वचनेन अहम् अत्र आगतवान्। परन्तु पश्य, बहवः जनाः पर्वतम् आरोहन्ति। गत्वा पश्य। वादं पश्चात् करिष्यावः।
- why (tense/mood): 'गुरुः माम् अत्र प्रेषयति' = 'sends' for 'sent' (प्रेषितवान् is not in the packs) → 'at the teacher's word I have come here' (ktavatu)

### #328 · ch2.bharadvaja · person.bharadvaja
- EN: A great sage of Prayaga shares my name, so I must live up to it! The teacher sent me to test you once more.
- before: एकस्य महतः मुनेः नाम अपि भरद्वाजः। अतः अहम् अपि उत्तमः भवेयम्! गुरुः पुनः तव परीक्षां कर्तुं माम् अत्र प्रेषयति।
- after: एकस्य महतः मुनेः नाम अपि भरद्वाजः। अतः अहम् अपि उत्तमः भवेयम्! गुरोः वचनेन अहं पुनः तव परीक्षां कर्तुम् आगतवान्।
- why (tense/mood): same as #325: present प्रेषयति for a past sending → ktavatu आगतवान्

### #335 · ch2.bharadvaja · objective (quest-log line, imperative to the player)
- EN: Step into the Dandaka forest to begin Book 3.
- before: दण्डकारण्यं प्रविशतु। तत्र अरण्यकाण्डम् आरभते।
- after: दण्डकारण्यं प्रविशतु। तत्र अरण्यकाण्डस्य आरम्भः।
- why (case/valency): intransitive आरभते → noun आरम्भः (see #3)

