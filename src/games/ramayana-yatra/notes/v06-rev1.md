# v06-rev1: first Sanskrit review of v0.6 (WP0, packages A–D)

Reviewer: v06-rev1 (model; first of two independent reviewers). Date: 2026-11-14. **Not a human sign-off.**

**Scope.** Every new or changed Sanskrit string since commit d72f56a (`git diff d72f56a -- src/games/ramayana-yatra/content`;
A–C in 98f1980, package D in 55161d0). The owner's instruction: *"audit the samskritam used and keep it simple as prior"*.
I checked each `sa` against its `en`, `ctx`, the speaker and the flow in story-ch*.json / cutscene-*.json, the house rules
(notes/sambhashana.md, the notes/sa-ui.md glossary, the REVIEW.md v0.4.2 conventions, notes/v05b-rev1.md precedents) and the
Vālmīki event. For katha-verses-3/4/5 I read every anvaya and सरलार्थः against its verse; for shlokas-3/4/5 I read the word
analyses, sandhi notes and translations of all 48 verses and re-fetched 17 of them from valmikiramayan.net. Only `sa`, `anvaya`
and `सरलार्थः` changed: no `en`, `ctx`, story file, verse text, pāda, lexicon, code or test was touched. Every word I introduced
passes the oracle (`sa-ui/words.ts`; `sa-oracle/check.ts` on files 10–13).

## Counts

| File | Checked | Changed |
|---|---|---|
| sa-dialogue-10.json (A: Bāla/Ayodhyā lines, Mithilā cutscene) | 18 | 3 |
| sa-dialogue-11.json (B: Araṇya/Kiṣkindhā) | 24 | 3 |
| sa-dialogue-12.json (C: Sundara/Yuddha, Kumbhakarṇa cutscene) | 18 | 5 |
| sa-dialogue-13.json (D: the herbs cutscene) + its model हिमवत् | 9 + 1 | 0 |
| sa-ui-v06.json (WP0: pause, resume, skip, skipAsk, look) | 5 | 0 |
| sa-ui-v06-c.json (echo titles) · sa-ui-v06-a/b/d.json (empty) | 4 · 0 | 0 |
| names-3/4/5/6.json | 6 + 3 + 5 + 2 = 16 | 0 |
| katha-verses-3.json (19 anvaya + 19 सरलार्थः) | 38 | 4 सरलार्थः |
| katha-verses-4.json (14 + 14) | 28 | 3 सरलार्थः + 1 anvaya |
| katha-verses-5.json (15 + 15) | 30 | 4 सरलार्थः |
| shlokas-3/4/5.json: 48 verses, 573 word analyses, 134 sandhi notes, 48 translations | 48 verses | 0 (flags below) |
| verse text re-fetched from valmikiramayan.net | 17 verses | 0 new discrepancies |
| **Total (strings, anvayas, सरलार्थाः, names)** | **191 + 48 verses** | **23** (15 accuracy / meaning / word choice, 8 register) |

**Gates (after my changes):**
- `check.ts` on files 10–13: 10, 11, 12 → 0 problems; 13 → 1 report that is the tool's, not the content's (check.ts reads models
  only from files 1–4 and sa-ui-common/a/b, so it does not see file 13's हिमवत् model; the game's oracle, `getOracle`, accepts
  हिमवन्तं, and `sambhashana.test` is green). Levels (easiest reading per token): file 10 L1 115 · L2 28 · L3 13; file 11 L1 181 ·
  L2 30 · L3 17; file 12 L1 114 · L2 25 · L3 14; file 13 L1 42 · L2 11 · L3 5.
- `node tools/test.mjs unit games/ramayana-yatra` (whole game suite, incl. sambhashana, sa-ui, katha-content, content, learning,
  reader, v06-hooks, v06-a/b/c/d, logic "v0.5b guard"): **382/382 pass** (run after all changes below).
- reader.json: not regenerated, because no lexicon or verse word changed (the reader test is green).

## Changes

| String (English, short) | before → after | why |
|---|---|---|
| file 10 · "Rama grieves for his father, then comforts his brother:" | रामः पितुः कृते शोचति। → रामः **पितरं** शोचति। | √śuc takes the accusative of the one mourned (Gītā 2.11 अशोच्यान् अन्वशोचः; 2.27 न त्वं शोचितुम् अर्हसि). पितुः कृते is the Hindi "ke liye" pattern and reads "grieves on his father's behalf". |
| file 10 · Janaka: "No king could even take hold of Shiva's bow. …" | … धनुः ग्रहीतुं न शक्तः। → … धनुः ग्रहीतुम् **अपि** न शक्तः। | Restores "even": in Janaka's account the kings could not even lift it. 8 words. |
| file 10 · Daśaratha to Paraśurāma: "Sage, your anger is over now. Grant safety to my young sons!" | हे मुने, तव क्रोधः शान्तः। मम बालेभ्यः पुत्रेभ्यः अभयं देहि। → हे मुने, **भवतः** क्रोधः शान्तः। **भवान्** मम बालेभ्यः पुत्रेभ्यः अभयं **ददातु**। | A pleading king to an elder sage: the house rule is भवान् + 3rd person for elders. A bare देहि sounds like an order. Vālmīki's own plea is polite too: बालानां मम पुत्राणाम् अभयं दातुम् अर्हसि (1.75.7). |
| file 11 · Sītā: "Rama, these rakshasas have done us no harm. Must you fight them?" | राम, … किं तैः सह युद्धं करिष्यसि? → **आर्यपुत्र**, … किं **भवान्** तैः सह युद्धं **करिष्यति**? | The house register for Sītā speaking to Rāma: file 2 always has आर्यपुत्र + polite 3rd person, even where the English says "Rama" (आर्यपुत्र, पश्यतु! · गच्छतु). |
| file 11 · "As Ravana carried her off through the sky, Sita had called out to the trees." | रावणः सीतां **नीतवान्**। तदा … → रावणः सीताम् **आकाशेन हृतवान्**। तदा … | "Carried off" is √hṛ, the word of the verse heard next (सीतां हरति रावणः, 3.49.30) and of the game's s-aranya-3 सरलार्थः (रावणः सीतां हृतवान्). नीतवान् is only "took". आकाशेन restores "through the sky" (file 9 precedent, accepted in v05b). |
| file 11 · Lakṣmaṇa: "… South, across the river!" | … दक्षिणां दिशं गच्छाम! → … **नदीं तीर्त्वा** दक्षिणां दिशं गच्छाम! | Restores "across the river", the way-finding hint, which a संस्कृतम्-only player otherwise misses. The ktvā has the same agent as गच्छाम (3.4.21). (दर्शयन्ति for सूचयन्ति does not pass the oracle; सूचयन्ति kept.) |
| file 12 · "… Hanuman crouches low, ready to spring." | … उत्पतितुं **सिद्धः** भवति। → … उत्पतितुं **सज्जः** भवति। | सिद्ध is "accomplished"; "ready" is a modern colloquial sense (भोजनं सिद्धम्). सज्ज is the game's word for "ready" (sa-battle kathaShield वीराः सज्जाः). |
| file 12 · "Then Indrajit strikes from the clouds with Brahma's weapon. …" | इन्द्रजित् **मेघेभ्यः** ब्रह्मास्त्रं क्षिपति। → इन्द्रजित् **मेघेषु स्थित्वा** ब्रह्मास्त्रं क्षिपति। | मेघेभ्यः is also the dative: "throws it at the clouds". Same fix as v05b-rev1's शाखाभ्यः → शाखासु स्थित्वा. |
| file 12 · "The rakshasas shout at the sleeping giant: 'Get up!'" | … 'उत्तिष्ठ' इति वदन्ति। → … 'उत्तिष्ठ' इति **उच्चैः** वदन्ति। | Restores "shout" (उच्चैः, as in the drum gag's उच्चैः शब्दं करोषि). |
| file 12 · title "Kumbhakarna wakes" and "At last he wakes." | कुम्भकर्णः **जागर्ति** · अन्ते सः **जागर्ति**। → कुम्भकर्णः **प्रबुध्यते** · अन्ते सः **प्रबुध्यते**। | √jāgṛ is "to be awake" (the game's own Āditya-hṛdayam: एष सुप्तेषु जागर्ति). "Wakes up" is प्र+√budh, the verb of the verse heard right after (न प्राबुध्यत, 6.60.54). Same level (L2). |
| katha-verses-5 · s-vadhyamano सरलार्थः | … परन्तु सः न **जागर्ति**। … → … परन्तु सः न **प्रबुध्यते**। … | Same reason: it now mirrors the verse's न प्राबुध्यत. |
| katha-verses-4 · s-sulabhah-purusha सरलार्थः | हे राजन्, बहवः जनाः सदा प्रियं वदन्ति। **हितं वचनं कदा अपि प्रियं न भवति।** तत् वदन्तः जनाः अल्पाः। तत् शृण्वन्तः जनाः अपि अल्पाः। → हे राजन्, बहवः जनाः सदा प्रियं वदन्ति। **किन्तु अप्रियं हितं च वदन्तः जनाः अल्पाः।** तत् शृण्वन्तः जनाः अपि अल्पाः। | The removed sentence said "good advice is never pleasant", which is false and is not what the verse says (अप्रियस्य च पथ्यस्य: what is unpleasant *and yet* wholesome). The new sentence says it. It is also in the same words as Vibhīṣaṇa's paraphrase in file 12 (अप्रियं हितं च वदन् जनः दुर्लभः), so the "two counsellors" echo matches. 3 sentences. |
| katha-verses-4 · s-sa-visrshto सरलार्थः | … सः बाणः **सप्त वृक्षाणां पर्वतस्य च मध्ये गत्वा** भूमिं प्रविष्टवान्। → … सः बाणः **सप्त वृक्षान् पर्वतं च भित्त्वा** भूमिं प्रविष्टवान्। | A case error: सप्तन् agrees in case with its noun (gen. सप्तानाम्), so सप्त वृक्षाणाम् is wrong. मध्ये गत्वा ("going into the middle") also did not say "pierced". भित्त्वा is the verse's own absolutive (L3). |
| katha-verses-4 · s-rocate-yadi सरलार्थः | यदि **त्वं** मां मित्रम् **इच्छसि**, एषः मम हस्तः। मम हस्तं तव हस्तेन **गृहाण**। आवां सदा मित्रे **भवावः**। → यदि **भवान्** मां मित्रम् **इच्छति**, एषः मम हस्तः। **भवान्** मम हस्तं **गृह्णातु**। आवां सदा मित्रे **भवाव**। | Sugrīva meets Rāma as a king and an equal. The verse is itself polite (passive imperatives गृह्यताम्, बध्यताम्), and so is the house rule. भवाव (loṭ) "let us be" keeps the wish of बध्यताम्, where भवावः only states "we are". |
| katha-verses-4 · s-rocate-yadi anvaya | यदि सख्यम् रोचते वा … → यदि वा **[ते]** सख्यम् रोचते … | यदि वा stays together (वा after रोचते reads as "or"). [ते] supplies the dative of the one pleased (1.4.33 रुच्यर्थानां प्रीयमाणः). Still a permutation of the verse's forms. |
| katha-verses-3 · s-yad-acarati सरलार्थः | … शुभस्य कर्मणः फलं शुभं भवति। → … शुभस्य कर्मणः फलं शुभम्, **अशुभस्य फलम् अशुभम्**। | The verse says "good *or bad*", and the bad deed is its point: Daśaratha goes on to confess the deed whose fruit he now reaps (2.63.7ff). |
| katha-verses-3 · s-madhuhantaram सरलार्थः | अतः अहं जानामि, त्वं विष्णुः एव। → अतः त्वं विष्णुः एव **इति** अहं जानामि। | A content clause after जानामि closes with इति (the house rule for quotes). "जानामि, त्वं …" copies the English / Hindi "that"-clause. |
| katha-verses-3 · s-agratas-te सरलार्थः (Sītā → Rāma) | हे राम, त्वम् … गच्छसि चेत् … तव अग्रे … → हे राम, **भवान्** … **गच्छति** चेत् … **भवतः** अग्रे … | The register of v0.4's s-golden-deer सरलार्थः (Sītā: तम् आनयतु) and of file 2. |
| katha-verses-3 · s-yathayodhya सरलार्थः (Guha → Rāma) | … राज्यम् अपि **तव**। अहं **तव** कृते किं करोमि? → … राज्यम् अपि **भवतः**। अहं **भवतः** कृते किं करोमि? | File 1's Guha says to Rāma: भवान् मम प्रियं मित्रम्! एषा भूमिः भवतः. |
| katha-verses-5 · s-vanaro-ham सरलार्थः (Hanumān → Sītā) | … एतत् अङ्गुलीयकं **पश्य**। … → … एतत् अङ्गुलीयकं **पश्यतु**। … | File 3's Hanumān speaks to Sītā politely (देवि, मम पृष्ठे उपविशतु … भवतीम्). |
| katha-verses-5 · s-drshta-devi सरलार्थः (Sugrīva → Rāma) | हे राम, **त्वं** … पुत्रः। दुःखं **त्यज**। … → हे राम, **भवान्** … पुत्रः। दुःखं **त्यजतु**। … | Same as s-rocate-yadi, which has the same speaker and addressee. |
| katha-verses-5 · s-etat-te-rakshitam सरलार्थः (Bharata → Rāma) | … अहं **तव** राज्यं रक्षितवान्। अधुना तत् **तुभ्यं** ददामि। … → … अहं **भवतः** राज्यं रक्षितवान्। अधुना तत् **भवते** ददामि। … | Its echo partner s-paduke (the same speaker and addressee) and file 1's Bharata are already polite (भ्रातः, राज्यं भवतः … प्रत्यागच्छतु). |

## Packages' first flags: verdicts

| String / analysis | Verdict |
|---|---|
| WP0 v06.skipAsk एतत् त्यजसि? | Correct. It follows the reviewed आदित्यहृदयं त्यजसि?, with neuter एतत् "this". A yes/no question by intonation, as there. Kept. |
| WP0 v06.look पश्य | Correct as a label (2sg loṭ of √dṛś). "closer" is not rendered: सम्यक् पश्य would say it, if rev2 / the teacher prefers. Kept. |
| A · सज्जं करोति for "strings (a bow)" (file 10; s-aropayitva, s-aropya सरलार्थः) | Kept (teacher item 3). |
| A · मृत्योः पूर्वं रात्रौ "on the night before he died" | Correct. पूर्वम् governs the ablative (2.3.29, a dik-word), and मृत्योः is the ablative. Kept. |
| A · जामदग्न्यः रामः for "Parashurama, the son of Jamadagni" | Correct. Vālmīki's own name for him (1.74.24, 1.76.5), and the patronymic is the "son of". Kept. |
| A · दीर्घं कालं सा केन अपि न दृष्टा (Ahalyā unseen) | Correct passive kta + instrumental. Kept. कः अपि तां न दृष्टवान् (the house's ktavatu) is the simpler alternative. |
| A analyses: सिद्धाश्रमम् nom. sg. n.; सहधर्मचरी as predicate + [भवतु] | Correct. |
| A analyses: सत्यम् as an adverb (1.30.26); तत् as acc. sg. n. (1.75.3) | Possible, but see "For the integrator" 2–3. |
| B · सम्पातिः in a सरलार्थः through names-4 | Correct, and the game's oracle accepts it. |
| C · वानराः सर्वं मधु पीतवन्तः; तिष्ठत!; पीडितः; सः प्रतिज्ञां करोति; the counsellors' paraphrase; the drum lines | Correct. Kept. |
| C · echo titles (उत्तिष्ठ इति रामाय हनुमते च · कौसल्या सुप्रजा इति द्विः · पादुके, राज्यं च पुनः रामाय · द्वौ मन्त्रिणौ, एकं वचनम्) | Correct labels. इति marks the quoted words. Kept. |
| C analyses: उदयन् (thematic, ud + √i), पर्यदेवन् (active), निःश्वसन्तीम् (thematic -न्ती) | Agree: epic forms, labelled as such in the reviewer list. The classical forms would be उद्यन्, पर्यदेवन्त, निःश्वसतीम्. |
| D · रामे तव दया न अस्ति वा? | Correct. The locative is the object of compassion, and final वा? is the Sambhāṣaṇa question tag. Kept. |
| D · ओषधयः तम् आगतं जानन्ति | Correct. ज्ञा takes an accusative with a predicative participle (as 1.76.17 जानामि त्वां सुरेश्वरम्). Kept. |
| D · ते निद्रायाः इव उत्तिष्ठन्ति | Correct. With उत्तिष्ठन्ति, निद्रायाः reads as the ablative (the genitive is the same form). Kept. |
| D · model हिमवत् (bhagavat-m) | Correct. I checked every cell the oracle builds: हिमवान्, हिमवन्तौ, हिमवन्तः, हिमवन्तम्, हिमवता, हिमवते, हिमवतः, हिमवति, voc. हिमवन्, हिमवद्भिः, हिमवत्सु, हिमवताम्. That is the classical vat-declension, with no ṇatva issue. |
| D · names-6 ऋषभ, कैलास (m. a-stems); names-3/4/5 (जनक, अहल्या, गौतम, जामदग्न्य, मिथिला, गङ्गा, सम्पाति, गोदावरी, मृग, सागर, मैनाक, दधिमुख, नल, मधुवन) | Correct stems. जामदग्न्य is Vālmīki's name for him (परशु is only his axe). Kept. |

## Vālmīki and text checks (done in this review)
- **Verse text re-fetched** (valmikiramayan.net, WebFetch asking for the raw lines, 14 Nov 2026): 1.67.17, 1.67.19, 1.75.3,
  1.76.5, 1.76.17, 2.52.83, 2.112.21, 3.37.2, 3.74.17cd–18ab, 4.12.3, 4.66.36, 5.55.3, 5.64.28 (both lines, under ५-६४-२८),
  6.22.17, 6.74.33, 6.90.71cd–72ab, 6.128.99. All 17 agree with the stored words. The site's slips are the ones the packages
  already recorded: व्रजयित्वा (1.67.19), पुरुष श्रेष्ठ (5.55.3), the markers २-२२-१७ and ९०-६-७१, and भयन् (6.128.99). I found
  no new discrepancy.
- 1.75.21–22 and 27: the Vaiṣṇava bow went from Viṣṇu to Ṛcīka, and from Ṛcīka to his son Jamadagni, "my father" (पितुर्मम ददौ …
  जमदग्नेर्महात्मनः); Paraśurāma calls it पितृपैतामहं (1.75.27). This bears on जामदग्न्यम् in 1.75.3 (integrator 2).
- 1.30.26: the site glosses सत्यं कृतम् as "true [to its name,] is rendered" (integrator 3).
- 6.74.30–31, 33, 64, 66: Ṛṣabha and the peak of Kailāsa, the herb mountain between them, the four herbs, the herbs going out
  of sight (ततो जग्मुरदर्शनम्), and Hanumān's words to the mountain (यद्राघवे नासि कृतानुकम्पः). File 13 agrees with each.
- From the ctx notes and memory, not re-fetched: 1.49 (Ahalyā), 1.66 (Janaka's account of the bow), 1.73.25–28, 1.75.6–7
  (Daśaratha's plea), 1.76.12–24, 3.9–10, 3.49.30–31 (Sītā addresses the trees and the Godāvarī), 3.64, 4.5, 4.12, 4.67.1
  (praised, Hanumān grows), 5.61–64, 6.16.21, 6.60, 6.73, 6.90, 6.127.52–54. The Sanskrit agrees with each event as cited.

## Flagged for the human reviewer
1. **The register of the सरलार्थाः.** I made the speakers who address Rāma or Sītā as elders or equals (Sītā, Guha, Bharata,
   Hanumān to Sītā, Sugrīva) use भवान् + 3rd person, following v0.4's s-golden-deer / s-ramo-dvir / s-maranantani and the
   dialogue files. Elders to Rāma (Viśvāmitra, Janaka, Kausalyā, Paraśurāma, Jāmbavān to Hanumān) and prayers (Sītā to Gaṅgā)
   keep त्वम्. Vibhīṣaṇa's सीतां रामाय पुनः देहि to Rāvaṇa matches his own quoted plea in file 3 ('सीतां रामाय देहि' इति), so
   it was kept. Please confirm the convention.
2. **Daśaratha to Paraśurāma in the polite form** (file 10). Vālmīki has प्रशान्तस्त्वं … दातुमर्हसि (त्वम् with a polite verb).
3. **सज्जं करोति for "strings (a bow)"** (file 10 Janaka; s-aropayitva and s-aropya सरलार्थाः). MW sajja is "ready, equipped".
   Whether it also covers "strung (of a bow)" should be confirmed. सज्य (in the s-aropya verse) or गुणम् आरोपयति are not
   Level-3 words.
4. **प्रबुध्यते for "wakes"** (Kumbhakarṇa title and line, s-vadhyamano सरलार्थः), replacing जागर्ति. The vocab pack glosses
   जागर्ति "is awake, wakes", so the old wording was not wrong, only weaker.
5. **आरोपयित्वा (1.67.17)** is a ktvā with a prefix, an epic form (classical आरोप्य, which 1.76.5 uses). Its grammar field says
   only "absolutive of the causative (ā + √ruh)". A note would help learners who are taught "prefix → lyap".
6. **इति in s-pitur-vacana** is glossed "(so I hold:) thus". In Vālmīki it closes the father's instruction ("Kauśika's word
   must be done", with अनुशिष्टोऽस्मि in 1.26.3). "thus (ends the instruction)" would be closer.
7. **"almost the same words"** (file 12, Mārīca): the Sanskrit says एतानि एव वचनानि ("these very words"). The two couplets
   differ by one particle (च / तु), so this is accurate enough. प्रायः would render "almost", but it is the word teachers
   already flagged ("probably").
8. **मन्त्रिणौ for Mārīca and Vibhīṣaṇa** (file 12, echo title). Mārīca was not Rāvaṇa's minister. मन्त्रिन् as "one who
   counsels" is fine in MW, but a teacher may prefer a different word.
9. **"across the river"** (file 11, Lakṣmaṇa) is the game's geography: Vālmīki's deer face and lead south (3.64.18–23) and
   name no river. **"the whole mountain"** (file 13) is the peak (शृङ्ग, 6.74.67), as D's notes say.
10. Kept simplifications worth a glance: तत्र मृगाः उपविशन्ति for "Nearby, a herd of deer is resting"; सः च वर्धते for "with
    every word of praise he grows"; वृद्धः जाम्बवान् … ओषधीनां पर्वतं प्रेषयति without "north".

## For the integrator
1. **REVIEW.md fold-in:** put this report's counts and change table into the v0.6 section, beside REVIEW-v06-a/b/c and D's
   lines. Add teacher items 1–10 above to the human-review list.
2. **s-purayasva (1.75.3), जामदग्न्यम्** (not mine to change: the English translation and the lexicon meaning). The game reads it
   as "of Jamadagni's son (Paraśurāma)": the translation "great bow of Jamadagni's son", the word gloss, and lexicon-3
   `jamadagnya-2` "Paraśurāma's". valmikiramayan.net glosses jaamadagnyam "[received through Sage] Jamadagni". Vālmīki's
   context agrees with that gloss: the bow came to "my father Jamadagni" (1.75.22) and is पितृपैतामहं (1.75.27).
   Suggested: translation "this great bow of Jamadagni's", gloss "of Jamadagni (handed down from him)", lexicon meaning "of
   Jamadagni". This is package A's call, because the lexicon id is A's reference. In the same verse, the translation's "So
   here is …" reads तत् as the adverb ("so"), but the word analysis says तत् acc. sg. n. "that (very)". Make the two agree.
3. **s-krtartho-smi (1.30.26), सत्यम्.** It is stored as `satyam` "indecl. (adverb) — truly", and the translation says "you have
   truly made this place Siddhāśrama". valmikiramayan.net glosses सत्यं कृतम् "true [to its name,] is rendered": a predicative
   adjective (nom. sg. n. with सिद्धाश्रमम्). Changing it needs a new lexId (the adjective) and a new translation, so it is
   not mine. The सरलार्थः (अयम् आश्रमः इदानीं सत्यं सिद्धाश्रमः) fits either reading.
4. **The scratch tool `sa-oracle/check.ts`** builds its oracle from the models of files 1–4 and sa-ui-common/a/b only. It
   reports file 13's हिमवन्तं as unverified although the game's oracle accepts it. This is a tool limitation, not a content
   error.
5. **No reader.json change** was needed (no lexicon or verse word changed). If rev2 changes lexicon-relevant words, regenerate
   it with `RY_WRITE_READER=1 node --import tsx --test --test-name-pattern="basic words" src/games/ramayana-yatra/reader.test.ts`.
