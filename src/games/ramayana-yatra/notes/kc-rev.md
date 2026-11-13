# kc-rev: independent review of the Kathā Sanskrit (katha.json, sa-dialogue-5.json, sa-battle Kathā keys)

Reviewer: kc-rev (model; did not write this content). Scope: `content/katha.json` (`verses[].anvaya`, `verses[].saralarthah`,
`astras`), `content/sa-dialogue-5.json` (`sa`), the Kathā outcome keys of `content/sa-battle.json` (read only).
Every changed word was checked with `sa-ui/words.ts` / `sa-oracle/check.ts`; every anvaya is still a permutation of its verse's forms.
Gate: `node --import tsx --test src/games/ramayana-yatra/katha-content.test.ts src/games/ramayana-yatra/sambhashana.test.ts` passes 23/23.

## Changes

| # | Item | Before | After | Reason |
|---|---|---|---|---|
| 1 | katha `s-naham-janami` anvaya | … जानामि नित्यम् पादाभिवन्दनात् नूपुरे तु अभिजानामि | … जानामि नूपुरे तु नित्यम् पादाभिवन्दनात् अभिजानामि | तु comes second in its clause and marks the contrast (the anklets, as against the armlets and earrings). So नूपुरे तु opens the clause, then the reason, then the verb. |
| 2 | katha `s-ma-nishada` सरलार्थः | हे निषाद, द्वौ पक्षिणौ स्निह्यतः, आनन्देन गायतः च। त्वं तयोः एकं हतवान्। अतः दीर्घं कालं तव प्रतिष्ठा न भवतु। | हे निषाद, द्वौ क्रौञ्चौ स्नेहेन मुग्धौ आस्ताम्। त्वं तयोः एकं हतवान्। अतः शाश्वतं कालं तव प्रतिष्ठा मा भवतु। | (a) "Singing joyfully" is not in the verse. काममोहितम् means "lost in love", now स्नेहेन मुग्धौ, the same words file 1 uses for this verse. The past tense fits, since one bird is already dead. (b) दीर्घं कालं ("a long time") weakened शाश्वतीः समाः ("endless years"), now शाश्वतं कालं. (c) A curse or wish takes the prohibitive मा, not न. Sambhāṣaṇa uses मा + loṭ, file 1 already explains मा as "एवं मा भवतु", and it echoes the verse's own मा. |
| 3 | katha `s-kausalya-supraja` सरलार्थः | … देवानां कार्यं कर्तव्यम्। | … देवानां नित्यं कार्यं कर्तव्यम्। | आह्निकम् means the *daily* rite. The old sentence lost "daily". नित्यं कार्यम् ≈ नित्यकर्म. (दैनिक and प्रतिदिनम् do not verify.) |
| 4 | katha `s-jayatyatibalo` सरलार्थः | महाबलः रामः जयति। बलवान् लक्ष्मणः अपि जयति। … | अतिबलः रामः जयति। महाबलः लक्ष्मणः अपि जयति। … | The old text gave Lakṣmaṇa's epithet महाबलः to Rāma. A learner matching the सरलार्थः to the verse would pin the word on the wrong hero. Now each keeps his own epithet. |
| 5 | file 5, ch4.mendicant "Sugriva himself sent me here…" | सुग्रीवः एव माम् अत्र आदिष्टवान्। … | सुग्रीवस्य वचनेन एव अहम् अत्र आगतवान्। … | आदिष्टवान् means "commanded", not "sent", and "commanded me here" is elliptical. प्रेषितवान् does not verify. The new line uses the house pattern for "X sent me" (गुरोः वचनेन अहम् अत्र आगतवान्, files 1 and 3). |
| 6 | file 5, ch5.sita "Soon. Hanuman will take him the news, and then he will come." | शीघ्रम् एव। हनुमान् वार्तां नेष्यति, ततः सः आगमिष्यति। | शीघ्रम् एव। हनुमान् रामं प्रति वार्तां नेष्यति, ततः रामः आगमिष्यति। | Real ambiguity: सः most naturally points back to हनुमान्, the subject of the clause before it, which says Hanumān will come. Now it names Rāma, and "to him" (रामं प्रति) is restored. |

Reviewed and kept (no churn): the other 17 anvayas and 18 सरलार्थाः. The four known judgement calls:
- **s-anirvedah: धैर्यम् for अनिर्वेदः.** Kept. "दुःखे अपि … धैर्यं न त्यजेत्" glosses not losing heart well. No verified word is closer: निराश fails, and उत्साहः is the game's PP word.
- **s-ma-nishada: the curse as न भवतु.** Changed to मा भवतु (row 2).
- **s-pitari-shushrusha: anvaya with the यथा clause first.** Kept. यथा … names what अतः ("than this") refers to, so the clause that defines "this" comes before "nothing is greater than this". This follows the relative-before-correlative logic and matches the usual word-by-word order (e.g. valmikiramayan.net).
- **s-dasoham: कोसलेन्द्र as अयोध्यायाः राजा.** Kept. कोसल does not verify, and Ayodhyā is Kosala's capital.

## Astra bindings (no change; concerns)

- **dharma_vigraha → s-ramo-vigrahavan pāda 0 (रामो · विग्रहवान्धर्मः).** विग्रहवान्धर्मः contains the astra name धर्म, so the gap is **always रामो** and cannot rotate. Kept, because this is the line that carries the move. If a richer gap is wanted: pāda 1 साधुः · सत्यपराक्रमः ("good, true in valour", two gappable chunks).
- **jaya_ghosha → s-jayatyatibalo pāda 0 (जयत्यतिबलो · रामो).** जयत्यतिबलो contains जय, so the gap is **always रामो**. Kept as the iconic cry. Alternative: pāda 2 राजा · जयति · सुग्रीवो, still a victory cry, with gaps राजा / सुग्रीवो.
- **aditya_hrdaya (only पुण्यं) and abhaya (only सर्वभूतेभ्यो).** Also a single fixed gap. Acceptable, since both gaps are meaningful words.
- **suprabhata → pāda 2 (उत्तिष्ठ · नरशार्दूल).** Fits a party heal ("rise!"). Pāda 1 पूर्वा संध्या प्रवर्तते would name the dawn literally.
- **brahmastra → pāda 3 (अक्षय्यं · परमं · शिवम्).** Fine ("supreme"). The ideal सर्वशत्रुविनाशनम् is one chunk.
- **shoka_shloka, shuddha_vak, viddhi, anirveda.** Good.

## sa-dialogue-5 (62 lines)

Grammar, register (त्वम् / वत्स from elders, भवान् from the player to Rāma) and the question-word drills (कुतः, किमर्थम्,
कुत्र, किम्, कौ, कथम्, कति, कदा, केन सह) are sound. Every misread reply is clearly wrong in meaning (it answers a different question word),
polite and in character, and the answers turn back to the question. Two lines changed (rows 5–6). **"रक्षां याचते" for refuge: acceptable.**
It means "asks for protection", which is exactly the English gloss, and शरणम् / आश्रयः do not verify.

## sa-battle Kathā keys (owned by kc-core, committed in 1803122 while this review ran; not edited)

- `kathaRecite` "{x.nom} श्लोकं पठित्वा {m.acc} प्रयुङ्क्ते!" is grammatical, with two problems. (1) The English says *line* and श्लोकं says *verse*. (2) For shoka_shloka (acc. श्लोकम्) it renders **"रामः श्लोकं पठित्वा श्लोकम् प्रयुङ्क्ते!"**. Suggest "{x.nom} श्लोकस्य पादं पठित्वा {m.acc} प्रयुङ्क्ते!" (all words verify).
- `kathaDuelRecite` "{x.nom} श्लोकेन प्रतिवदति!" is good and matches duelCounters.
- `kathaHalf` "पाठः न पूर्णः, अतः फलं न्यूनम्।" is grammatical. It avoids उत्तरम् and never says "no effect", as the spec requires. But न्यूनम् ("less") drops "half". The house convention for shares gives "पाठः न पूर्णः, अतः फलं शते पञ्चाशत् एव।" (verifies). Optional.
- Not new, but read aloud by kathaRecite: {m.acc} for dharma_vigraha / jaya_ghosha is धर्मम् / जयम्, so the line says "employs dharma / employs victory". viddhi's pattern ("“विद्धि” इति मन्त्रम्") reads better.

## For a human teacher

1. s-ma-nishada: मा + loṭ (मा भवतु) for a wish/curse is epic and Sambhāṣaṇa usage; Pāṇini has मा + augmentless luṅ. Also, the verse's own मा … अगमः keeps the augment (ārṣa). The word card says "(with augment)"; a note that classical grammar would write मा गमः may help.
2. s-pitari-shushrusha: confirm the यथा-first anvaya (vs. the main clause first: हि अतः महत्तरं धर्मचरणं किंचित् न अस्ति, यथा …).
3. s-anirvedah: धैर्यम् as the gloss of अनिर्वेदः (not despairing, not giving up).
4. s-dasoham: अयोध्यायाः राजा for कोसलेन्द्र, and the present tense while Rāma is in exile (honorific, as in the verse).
5. s-kausalya-supraja: the anvaya follows the content's reading (कौसल्या nom. + सुप्रजा nom. + [अस्ति]). Commentators also read कौसल्यासुप्रजाः as one vocative. Separately, नित्यं is meant as an adjective ("regular duty"); the oracle knows only the adverb.
6. s-ko-nvasmin: the anvaya "गुणवान् कः नु [अस्ति] वीर्यवान् च कः …" puts the predicate before the interrogative. Some teachers give कः नु गुणवान् … कः च वीर्यवान्.
7. s-nanrgveda: the anvaya keeps न अनृग्वेदविनीतस्य … (न + a negative compound, giving one negation of शक्यम्). A teacher may want to explain the न-न pattern.
8. File 5: "रक्षां याचते" for refuge (शरणं याचते would be the epic idiom if शरण were added to the vocabulary). Also "स्वर्णस्य मृगः" (genitive of material, consistent with file 2; classical सुवर्णमृगः / काञ्चनः मृगः), and "तौ स्वपितः, अस्तु" for "Let them sleep a little longer" (paraphrase; "तौ किञ्चित् कालं स्वपिताम्" verifies).
9. Bindings: dharma_vigraha and jaya_ghosha always gap रामो (see above); decide whether that is too easy.
10. sa-battle: kathaRecite's श्लोकं vs "line", and the shoka_shloka repetition; kathaHalf's न्यूनम् vs "half".

## v0.4.1 review (fx-rev)

Reviewer: fx-rev (model; did not write this content). Scope: the 18 new entries of `content/sa-dialogue-5.json` (12 Kathā story lines, 6 `katha.json moveText` descriptions) and `sa-ui-a.json` `title.howto3`. Each English line was checked against the game (notes/katha.md and the code: no random encounters in Kathā `logic-world.ts`; least-practised pāda first `astraPada`; study hall at every Kathā shrine `view-panel.tsx`; `timeLimitMs: 0`). Every word introduced was verified with `sa-ui/words.ts`. Gate: `sambhashana.test.ts`, `katha-content.test.ts` and `sa-ui.test.ts` pass 32/32.

| # | Line (ctx) | Verdict |
|---|---|---|
| 1 | ch1.bharadvaja_duel "A debate of verses! In it you recite…" | ok. Duels go straight to a recitation of a heard verse's pāda. |
| 2 | ch1.bharadvaja_duel "Take your time. If a word is missing…" | **fixed:** यदि पादे एकं पदं रिक्तम् अस्ति, तर्हि तत् पदं चिनु → यदि पादे रिक्तं स्थानम् अस्ति, तर्हि उचितं पदं चिनु. It is the place that is empty, not the word: "पदं रिक्तम्" says "the word is empty". रिक्तं स्थानम् is the classroom term for a gap, already used by `learn.puranaPrompt` (sa-rev-b-ui). "Choose the right word" also fits the three chips. |
| 3 | ch1.bharadvaja_duel (onLose) "You nearly had me!…" | ok. The new clause (पादः समीचीनं पदं दर्शयति) matches the miss animation. अहो, त्वं प्रायः जयसि is copied from the practice line, which was reviewed earlier. |
| 4 | ch1.valmiki_shrine "There is a study hall here too…" | ok. यदा इच्छसि, तदा एव तत्र गच्छ reads "only when you wish" (restrictive एव). |
| 5 | ch1.bharadvaja_ashrama "Each line you recite in battle stays with you…" | ok. True in the game: a miss lowers the pāda's level, and `astraPada` picks the least-practised pāda first. |
| 6 | ch1.road_dawn "…the night-wanderers in it stay hidden…" | ok. Kathā never rolls encounters (`logic-world.ts`). |
| 7 | ch1.road_dawn "In battle, choose a move. For an astra…" | **fixed:** अस्त्रस्य कृते तस्य श्लोकस्य पादं पठ → यदि अस्त्रं चिनोषि, तर्हि तस्य श्लोकात् एकं पादं पठ. (a) कृते means "for the sake of", not "to cast". (b) In तस्य श्लोकस्य the default reading is "of THAT verse", but no verse has been named. With the ablative श्लोकात्, तस्य can only mean "its" (the astra's). Reading a line *from* a verse (पुस्तकात् पठति) is natural. |
| 8 | ch1.road_dawn "If a word is missing… A line you know well recites itself." | **fixed:** …एकं पदं रिक्तम् अस्ति, तर्हि तत् पदं चिनु। … सः स्वयं वदति → …रिक्तं स्थानम् अस्ति, तर्हि उचितं पदं चिनु। … सः स्वयं पूर्णः भवति. The gap is fixed as in row 2. वद् is a speaker's verb ("a line speaks itself"), and a learner could take वदति for "recites". पूर्णः भवति is accurate (a mastered line needs no pick) and echoes row 2's पादः पुनः पूर्णः भवति. |
| 9 | ch1.road_cowherd "If you get hurt in a battle, eat some fruit…" | ok. Items are a secondary battle button in Kathā. |
| 10 | ch2.shala_student "In a debate, your conviction is your strength. Recite well…" | ok (practice line with पठ for उत्तरं वद). |
| 11 | ch2.shala_student "On this journey there is no need to be quick…" | ok. शीघ्रं पठितुं न आवश्यकम् (tumun + आवश्यकम्) is standard modern / Sambhāṣaṇa ("मया गन्तुम् आवश्यकम्"). Kathā has no timer and no swift bonus. Every Kathā shrine has the study hall. |
| 12 | ch3.dandaka_sage_b "…they fear Rama's bow and stay hidden. Walk on in peace." | **fixed (small):** अतः न आगच्छन्ति → अतः बहिः न आगच्छन्ति ("do not come out" = stay hidden). The flagged रामस्य धनुषः बिभ्यति is correct: बिभ्यति is the 3pl laṭ of भी (3rd class, no न in the 3pl), and fear takes the ablative of its cause (भीत्रार्थानां भयहेतुः, 1.4.25). |
| 13 | move pada_bana "A strike of speech: the word flies like an arrow." | ok |
| 14 | move lipi_raksha "Protection: the heroes' defence rises one stage." | ok (house blurb convention) |
| 15 | move shoka_shloka "Grief become verse: recite a line of its verse…" | ok. Here तस्य श्लोकस्य has an antecedent (शोकः एव श्लोकः अभवत्), so "that verse" is the verse that grief became, which is right. |
| 16 | move shuddha_vak "Grammar: recite a line of its verse…" | **fixed:** तस्य श्लोकस्य पादं पठ → श्लोकस्य पादं पठ. No verse is named before it, so "of that verse" has nothing to point to. Sanskrit needs no article here, and this matches the practice blurbs (श्लोकस्य पादं पूर्णं कुरु). |
| 17 | move bana "A plain arrow." | ok |
| 18 | move dharma_vigraha "Righteousness embodied: recite a line of its verse…" | **fixed:** तस्य श्लोकस्य पादं पठ → श्लोकस्य पादं पठ. After रामः एव धर्मः, तस्य reads as "his (Rāma's) verse", which suggests Rāma made it (Mārīca speaks it). |
| 19 | sa-ui-a `title.howto3` | ok. अस्त्राणि श्लोकेभ्यः बलं लभन्ते: a neuter plural subject with a plural ātmanepada verb and the ablative of source. कथायाम् / अभ्यासे map onto the picker's कथा / अभ्यासः, and the pair contrast makes the mode reading clear. |

For a human teacher:
1. Row 7: the ablative तस्य श्लोकात् एकं पादं पठ vs. the plain genitive (श्लोकस्य पादं पठ, as in the blurbs). Both are correct; the ablative keeps the English "its".
2. Row 8: स्वयं पूर्णः भवति for "recites itself". Not edited (sa-ui-katha.json, kc-view's file): `katha.autoReciteSub` still says श्लोकाः स्वयं वदन्ति. Consider श्लोकाः स्वयं पूर्णाः भवन्ति, or keep it as an accepted personification.
3. `title.howto3`: just above it, `title.howto2` uses कथायाम् in the plain sense ("in the story"). If that reads as ambiguous, कथायाः यात्रायाम् / अभ्यासस्य यात्रायाम् (all verify) names the journeys explicitly, at the cost of length.
4. Row 3 (copied from the practice line): अहो, त्वं प्रायः जयसि for "You nearly had me" uses the present for a just-finished event (वर्तमानसामीप्ये) and प्रायः for "almost". In Sambhāṣaṇa, प्रायः often means "probably".
