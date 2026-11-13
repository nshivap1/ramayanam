# audit-d1: Sanskrit audit of `content/sa-dialogue-1.json` (common, ch1 Bāla, ch2 Ayodhyā)

Auditor: au-d1 (model, brief v0.4.2). This is an agent audit, **not** a human sign-off. Scope: the `sa` field of all
345 entries, each read against its `en` and `ctx` (speaker, situation), plus `models` (unchanged). I did not edit `en`
or `ctx` (checked by diff: 0 changed), and I edited no other file. I read sa-rev-a.md / sa-rev-a-ui.md first and did not
reopen their settled choices. Backup of the file before this audit: `/home/claude/scratch/audit/d1/sa-dialogue-1.orig.json`.

`#N` = 0-based index in `entries` (same numbering as sa-rev-a.md).

## Counts

| | |
|---|---|
| strings checked | 345 |
| entries changed | 12 |
| fixed: accuracy (grammar / meaning) | 9 (#4, #9, #27, #45, #71, #80, #103, #113, #237) |
| fixed: glossary consistency | 2 (#97, #282); #71 also |
| simplified (ease) | 2 (#113 second clause, #285) |
| flagged for a human | 8 (below) |
| new words / models | all new words pass `words.ts`; 0 new models |

Gate: `sambhashana.test.ts`, `sa-ui.test.ts`, `katha-content.test.ts`, `grammar-sa.test.ts`, `sa-battle.test.ts` →
48/48 pass. JSON valid.

## The main finding: `{w:…}` used as a word inside a sentence

`{w:lexId}` renders the lexicon **lemma**, i.e. the bare stem (view-markup.tsx `<SaText>{e.lemma}`). The style guide
allows it only when the line is about the word ("{w:dharma} इति शब्दः …"). Five lines used it as a sentence word, so
the player saw a stem where an inflected form is required:

| # | what the player saw | correct |
|---|---|---|
| 4 | तपस्विन् वाल्मीकिः नारदं पृच्छति। | तपस्वी वाल्मीकिः … |
| 27 | तदा एकः निषाद बाणं क्षिपति। | … एकः निषादः … |
| 103 | रामः गाम्भीर्ये समुद्र इव, धैर्ये च हिमवत् इव। | समुद्रः इव … हिमवान् इव |
| 113 | एषः तस्य धर्म। | एषः तस्य धर्मः। |
| 237 | मम भ्राता द्विस् न वदति। | द्विः (the real indeclinable form; द्विस् is only the lexicon spelling) |

All five now use the plain inflected form, which is the convention files 2 and 3 already follow ("रामः साक्षात् धर्मः",
"अनिर्वेदः एव श्रियः मूलम्"). The English line still has the tappable `{w:}` (shown under the Sanskrit in sa-en mode).
The lines that are about the word (#81, #84 सन्ध्या = nom., #121, #222, #256 अयोध्या = nom., #272) were kept.

## Change log

| # · English (short) | before → after | why |
|---|---|---|
| 4 · Valmiki, the {w:tapasvin}, questions Narada | {w:tapasvin} वाल्मीकिः → **तपस्वी** वाल्मीकिः | {w:} rendered the bare stem तपस्विन् as the subject's adjective |
| 9 · Now let us go down to the Tamasa (Vālmīki to the player) | तमसां **गच्छाम** → तमसां **गच्छाव** | two people (Nārada has left, Bharadvāja went ahead): dual loṭ, as sa-rev-a did for #42 आरभावहै |
| 27 · a {w:nishada} (hunter) looses an arrow | एकः {w:nishada} → एकः **निषादः** | {w:} rendered the bare stem निषाद after एकः |
| 45 · You nearly had me! (said when the player loses) | त्वं प्रायः **जयसि**! → त्वं प्रायः **{g:जितवान्\|जितवती}**! | प्रायः + present reads "you usually win"; past "you nearly won" says what the English says; gendered because it describes the player |
| 71 · Pick the script in your profile settings. I like Devanagari! | तव **पत्रे** अक्षराणि चिनु। **मम** तु … रोचन्ते → तव **इच्छासु** … **मह्यं** तु … रोचन्ते | (a) रुच् takes the dative of the person pleased (P. 1.4.33; Samskrita Bharati teaches मह्यं रोचते); (b) पत्रम् is this file's word for the verse card, so "in your card" misled; settings = इच्छाः (glossary) |
| 80 · may you find no lasting place for endless years | **बहून् संवत्सरान्** → **शाश्वतं कालं** | "many years" weakened शाश्वतीः समाः "endless years"; same wording kc-rev chose for the Kathā सरलार्थः of this verse |
| 97 · choose a move and answer its question | एकं **कार्यं** चिनु … **कार्यं** सिध्यति … **कार्यस्य** बलम् → **मन्त्रं** … **मन्त्रः** … **मन्त्रस्य** | glossary: moves are मन्त्राः (party screen मन्त्रान् चिनु, #50 नूतनं मन्त्रम्); one word for one thing |
| 103 · like the {w:samudra} … like the {w:himavat} | {w:samudra} इव, … {w:himavat} इव → **समुद्रः** इव, … **हिमवान्** इव | bare stems in sentence position |
| 113 · That is his {w:dharma}. She has emptied this land of people. | एषः तस्य {w:dharma}। … जनाः **अस्याः भूमेः गतवन्तः** → एषः तस्य **धर्मः**। … जनाः **इमां भूमिं त्यक्तवन्तः** | (a) bare stem as predicate; (b) ease: भूमेः is gen./abl. ambiguous and गम् + ablative is opaque; "left this land" is the same length and unambiguous |
| 237 · My brother never speaks {w:dvis} (twice) | {w:dvis} न वदति → **द्विः** न वदति | the stem spelling द्विस् is not a word in a sentence |
| 282 · turn on Relaxed in the menu's Settings | **सूच्यां** शान्तं मार्गं चिनु → **स्यूते इच्छासु** शान्तं मार्गं चिनु | glossary forbids सूची ("needle"); the UI labels are स्यूतः (menu), इच्छाः (settings), शान्तः मार्गः (relaxed), so the line now names what is on screen (flagged by sa-rev-a-ui) |
| 285 · the poem folding back on itself | कथा पुनः **तस्याः** आरम्भं गच्छति इव → कथा पुनः आरम्भं गच्छति इव | ease: non-reflexive तस्याः right after तमसा reads "to *her* (the river's) beginning"; dropping it is shorter and clear |

## Checked and kept (so nobody redoes them)

- Every भवान्/भवती takes a 3rd-person verb (#114, #221, #229, #234, #239, #241, #248, #289, #311, #313); sages use
  त्वम्/वत्स to the student and to Rāma; Rāma uses गुरो/भगवन्/मातः.
- Dual/plural agreement of "we / let us": #89 जागृवः … गच्छावः, #325 करिष्यावः (two), #139 चलाम, #293 तराम (three or more);
  dual imperatives to the princes #110, #115, #117, #142 are right.
- Ātmanepada forms: युध्यते/युध्यस्व, आरभे, लभसे, कम्पन्ते, परिवर्तते, याचते/याचिष्यते, शङ्कते, विक्रीणे (वि+क्री is
  ātmanepada, P. 1.3.18), प्रतीक्षते. Correct.
- `{g:}` covers every word that describes the player; the remaining participles agree with NPCs or nouns (त्वया श्रुतः
  = श्लोकः, त्वयि प्रसन्नः = गुरुः). मित्र for the player is neuter, so it needs no {g:}.
- Vālmīki facts checked: Bāla 2 (Tamasā ford, "अकर्दमम् … सन्मनुष्यमनो यथा", the kalaśa, श्लोको भवतु नान्यथा);
  Tāṭakā (yakṣī cursed by Agastya with Mārīca), Mānavāstra 100 yojanas, Āgneyāstra on Subāhu; Siddhāśrama/Vāmana;
  Kaikeyī's two boons; रामो द्विर्नाभिभाषते said to Kaikeyī; Sumitrā's रामं दशरथं विद्धि; Tamasā on the first night;
  Guha and Lakṣmaṇa's night watch; Sumantra sent back; Bharadvāja at Prayāga; Vālmīki's āśrama at Citrakūṭa; Bharata
  and the pādukās; leaving Citrakūṭa because of the Ayodhyā crowds. No line is presented as Vālmīki's words except the
  verse paraphrases, which are marked as meanings.
- Sentence length: only #36, #56, #66, #235, #303 reach 12–14 words, each with a clear clause break; left as is.

## Human-review list (uncertain, left as is)

1. **#298** "our boats are strong" is rendered अस्माकं **नाविकाः** बलवन्तः ("our boatmen are strong"). A small meaning
   shift; दृढ and बलवत्यः are not in the packs, so I did not force it.
2. **#159** "broke the bow" = धनुः **नष्टम्** ("was destroyed"). भग्न is not in the packs. Acceptable?
3. **#77** the mastery tiers in the sentence are "न दृष्टः, दृष्टः, ज्ञातः, सिद्धः", while the chip (names.json tier.unseen)
   shows **अदृष्ट**. अदृष्टः (masc.) does not verify, so the sentence keeps न दृष्टः.
4. **#69, #217** honey restores "the mantras' strength" (मन्त्राणां बलम्) while the PP stat is उत्साहः. The English talks
   about mantras ("If their mantras run dry"), so I kept the story wording. Should these lines say उत्साहः to teach the stat
   name?
5. **Tutorial register:** narration tutorials mix polite 3rd person (#10 चलतु / वदतु / पठतु) and 2nd singular
   (#97 चिनु / वद). Both are grammatical. sambhashana.md says objectives are polite, and
   sa-ui says instructions are 2nd singular. Does the teacher want one register for narration tutorials?
6. **#45** I used the gendered past {g:जितवान्|जितवती}. If the teacher prefers to keep the line gender-free, a
   passive needs a verified form for "almost defeated me" (e.g. अहं प्रायः पराजितः, not checked).
7. **#71** इच्छासु for the *Samskuru profile* settings (outside the game's own Settings tab, whose note says
   अन्याः इच्छाः अन्यत्र सन्ति). Clear enough?
8. **#0** "जलस्य उपरि श्वेतः धूमः इव अस्ति" (mist = "something like white smoke") has no separate subject. I read it as
   fine ("there is, as it were, white smoke"); confirm.

sa-rev-a's open human items (मा + loṭ #80/#81, सकृत् gloss #222, आरम्भः for intransitive आरभते, उप+कृ + gen.,
परिचारिका, सन्ध्यां कुर्वः, homographs शिवस्य / षष्ठी / जागृतः, मूढः, सा न महती, the सरयू model, आशीः/धनुः level, the
dropped names) remain open. I did not change them.

## Proposals for the orchestrator

1. **Gate rule for `{w:}`.** The oracle accepts `{w:id}` anywhere in a Sanskrit sentence, but it always renders the bare
   lemma. Proposal: in `sa-verify.ts`, flag a `{w:}` in a non-label `sa` line unless it is followed by इति / a dash /
   `:` (or the lemma is itself a verified nominative, e.g. -ā stems). That would have caught the five lines above.
   Cross-file: **sa-dialogue-2 #218** "एतत् एव {w:vyakarana} – …" shows the bare stem व्याकरण as a predicate (owner of file 2).
2. **Tappable inflected forms in Sanskrit lines.** If the team wants the word card reachable from the Sanskrit line, use
   `{f:shlokaId:index}` (renders the verse form, e.g. धर्मः, समुद्रः, हिमवान्, द्विः). The gate requires every sa markup to
   occur in the English, so this means changing the English source lines (story-ch1/ch2) from `{w:}` to `{f:}` there.
3. **Glossary note:** "move" = मन्त्रः is now used everywhere in file 1 (was कार्यम् in #97). Menu = स्यूतः and settings =
   इच्छाः are now used everywhere in file 1 (#11, #50, #71, #282); there is no सूची left.
