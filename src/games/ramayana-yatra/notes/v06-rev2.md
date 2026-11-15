# v06-rev2: second Sanskrit review of v0.6 (WP0, packages A–D), after rev1

Reviewer: v06-rev2 (a model, the second of two independent reviewers). Date: 2026-11-14. **This is not a human sign-off.**

**Scope.** Every new or changed Sanskrit string since commit d72f56a (`git diff d72f56a -- src/games/ramayana-yatra/content`),
read as it stands after rev1 and the two integration fixes (commit 2695c70). The owner's instruction: *"audit the
samskritam used and keep it simple as prior"*.
- Dialogue: sa-dialogue-10/11/12/13. Each `sa` was checked against its `en`, its `ctx`, the speaker and its place in
  story-ch*.json / cutscene-*.json, and the Vālmīki event.
- Interface: sa-ui-v06.json and sa-ui-v06-a/b/c/d.json.
- Names: names-3/4/5/6.json, and D's model हिमवत्.
- katha-verses-3/4/5: all 48 anvayas and 48 सरलार्थाः, each read against its verse, word by word.
- shlokas-3/4/5: all 48 verses. That is 573 word analyses (grammar, gloss, role), 134 sandhi notes, 11 meter notes (each
  vipulā re-scanned by hand) and 48 translations.
- Verse text: the 31 verses that rev1 did not fetch were fetched again from valmikiramayan.net and compared letter by letter.
- rev1's 23 changes, the two integration fixes, and rev1's ten "flagged" items. Each one is judged below.

House rules applied: notes/sambhashana.md, the notes/sa-ui.md glossary, the REVIEW.md v0.4.2 conventions, the v0.4
सरलार्थः register (katha.json), and the v05b-rev1/rev2 precedents. Every word I introduced passes the oracle
(`sa-ui/words.ts`, all at L1–L3). I changed only `sa` and `सरलार्थः` fields. No `en`, `ctx`, story file, verse text,
pāda, lexicon, translation, code or test was touched.

## Counts

| Area | Checked | rev1 changed | Changed here |
|---|---|---|---|
| sa-dialogue-10 (A) | 18 | 3 | 0 |
| sa-dialogue-11 (B) | 24 | 3 | 0 |
| sa-dialogue-12 (C) | 18 | 5 | 1 |
| sa-dialogue-13 (D) + model हिमवत् | 9 + 1 | 0 | 0 |
| sa-ui-v06 (5) · sa-ui-v06-c (4) · v06-a/b/d (empty) | 9 | 0 | 0 |
| names-3/4/5/6 | 6 + 3 + 5 + 2 = 16 | 0 | 0 |
| katha-verses-3 (19 anvaya + 19 सरलार्थः) | 38 | 4 | 2 सरलार्थः |
| katha-verses-4 (14 + 14) | 28 | 4 | 0 |
| katha-verses-5 (15 + 15) | 30 | 4 | 2 सरलार्थः |
| shlokas-3/4/5: 573 word analyses, 134 sandhi notes, 11 meter notes, 48 translations | 48 verses | 0 | 0 (two items for the integrator) |
| Verse text fetched again (the 31 that rev1 did not fetch) | 31 verses | — | 0 differences in the words |
| **Total** | **191 strings + 48 verses** | **23** | **5** (4 faithfulness, 1 consistency / grammar) |

rev1's 23 changes: I keep all of them (see "rev1's changes, judged"). I also keep both integration fixes.

## Gates (after my changes)
- `node tools/test.mjs unit games/ramayana-yatra` (the whole game suite): **382/382 pass**.
- `sa-oracle/check.ts`:
  - files 10, 11 and 12: 0 problems. Levels: file 10 L1 115 · L2 28 · L3 13; file 11 L1 181 · L2 30 · L3 17;
    file 12 L1 115 · L2 25 · L3 14 (+1 L1 for एवम्).
  - file 13: one report, हिमवन्तं. This is the tool's limit, not an error in the content: check.ts reads models only from
    files 1–4. The game's oracle accepts the word, and the sambhashana test is green.
- All 416 distinct words of the 48 सरलार्थाः pass `words.ts` at L1–L3.
- reader.json was not regenerated: no lexicon-relevant word changed, and the reader test is green.

## rev1's changes, judged (all kept)

| rev1 change | Verdict |
|---|---|
| file 10 · पितुः कृते शोचति → पितरं शोचति | **Keep.** √śuc takes the accusative of the person mourned. पितुः कृते reads as "on his father's behalf". (कृते + genitive is classical for "for the sake of". The error was the case with this verb. So भवतः कृते किं करोमि in s-yathayodhya and अस्माकं कृते in file 11 are fine.) |
| file 10 · ग्रहीतुम् **अपि** | **Keep.** It restores "even". The sentence has 9 words. |
| file 10 · Daśaratha to Paraśurāma: भवतः … भवान् … ददातु | **Keep.** Vālmīki's plea is itself polite (… अभयं दातुम् अर्हसि, 1.75.7). In Sambhāṣaṇa, भवान् + loṭ is the equivalent. |
| file 11 · आर्यपुत्र, … किं भवान् … करिष्यति? | **Keep.** This is file 2's register for Sītā speaking to Rāma. |
| file 11 · सीताम् आकाशेन हृतवान् | **Keep.** √hṛ is the verb of the verse that follows (सीतां हरति रावणः). आकाशेन is an accepted v05b precedent. |
| file 11 · नदीं तीर्त्वा दक्षिणां दिशं गच्छाम | **Keep.** The ktvā has the same agent as गच्छाम (3.4.21). |
| file 12 · सिद्धः → सज्जः | **Keep.** "Ready" is a modern sense of सिद्ध. सज्ज is the game's word (sa-battle). |
| file 12 · मेघेभ्यः → मेघेषु स्थित्वा | **Keep.** मेघेभ्यः can also be read as a dative. The fix follows the v05b शाखासु स्थित्वा precedent. |
| file 12 · 'उत्तिष्ठ' इति **उच्चैः** वदन्ति | **Keep.** It restores "shout". |
| file 12 · title and line: जागर्ति → प्रबुध्यते | **Keep.** जागर्ति is "is awake". प्र+√budh is the verb of the verse heard next (न प्राबुध्यत). |
| kv-5 s-vadhyamano · … न प्रबुध्यते | **Keep.** Same reason. |
| kv-4 s-sulabhah-purusha · "किन्तु अप्रियं हितं च वदन्तः जनाः अल्पाः" | **Keep.** The removed sentence ("good advice is never pleasant") was false. The new one matches Vibhīṣaṇa's paraphrase in file 12. |
| kv-4 s-sa-visrshto · सप्त वृक्षान् पर्वतं च भित्त्वा | **Keep.** सप्त वृक्षाणाम् was a case error, and भित्त्वा is the verse's own word. |
| kv-4 s-rocate-yadi · polite form, भवाव | **Keep.** मित्रे is the correct neuter dual. The loṭ भवाव carries the verse's wish (बध्यताम्). |
| kv-4 s-rocate-yadi anvaya · यदि वा [ते] … | **Keep.** यदि वा stays together, and [ते] is the dative of the one pleased (1.4.33). |
| kv-3 s-yad-acarati · + अशुभस्य फलम् अशुभम् | **Keep.** The verse says "good **or bad**". |
| kv-3 s-madhuhantaram · … विष्णुः एव इति अहं जानामि | **Keep.** The content clause now closes with इति. |
| kv-3 s-agratas-te, s-yathayodhya; kv-5 s-vanaro-ham, s-drshta-devi, s-etat-te-rakshitam · polite forms | **Keep.** They follow the house register for these speakers (files 1–3, and the v0.4 s-golden-deer and s-maranantani). One echo shows the contrast well: the elder sage of s-kausalya-supraja keeps "हे राम, त्वं कौसल्यायाः उत्तमः पुत्रः", and the ally king of s-drshta-devi now says "हे राम, भवान् कौसल्यायाः उत्तमः पुत्रः". |
| Integration: 1.30.26 सत्यम् as a predicate adjective (lexId satya) | **Keep.** valmikiramayan.net glosses सत्यं कृतम् "true [to its name,] is rendered". The सरलार्थः (… सत्यं सिद्धाश्रमः) fits. |
| Integration: 1.75.3 जामदग्न्यम् "of Jamadagni's line" | **Keep.** The bow came to Rāma Jāmadagnya through his father (1.75.22, पितृपैतामहं 1.75.27). But the lexicon note still says "Paraśurāma's": see integrator 1. |

## My changes: before → after → why

| String | Before → after | Why |
|---|---|---|
| file 12 · Vibhīṣaṇa (hidden): "I warned him: people who say only pleasant things …" | अहं तम् अवदम्। … → अहं तम् **एवम्** अवदम्। … | Without एवम् or इति, the two sentences that follow are not marked as the words he said. The house rule is that every direct quote closes with इति. Every other "he/she said this to X:" line in v0.6 introduces its quote with एवम् (10.0, 10.2–10.4, 11.18: … एवम् उक्तवान् / उक्तवती), so this line now matches them. 4 words. |
| kv-3 · s-gange सरलार्थः (Sītā to Gaṅgā, 2.52.83) | … सः पितुः वचनं **पालयति**। त्वं तं रक्ष। → … त्वं तं रक्ष। सः पितुः वचनं **पालयतु**। | The verse is a wish: "may he, **protected by you**, carry out this command" (पालयतु एनं … त्वदभिरक्षितः). The old सरलार्थः stated it as a fact ("he obeys"). It now teaches the verse's own verb form पालयतु, and puts "protect him" first, as the condition. |
| kv-3 · s-aropya सरलार्थः (1.76.5) | रामः तत् धनुः गृहीत्वा सज्जं कृतवान्। ततः … → रामः तत् धनुः सज्जं करोति। **सः तस्मिन् बाणं स्थापयति।** ततः रामः क्रुद्धः भूत्वा अन्यं रामं वदति। | The verse has two actions: he strung the bow, and **fitted the arrow** (शरं सज्यं चकार). The arrow was missing, and the next verses turn on where that arrow will strike. "गृहीत्वा" (took) is 1.76.4, not this verse, so it is dropped. The tenses are now all present, to agree with वदति. धनुषि (L4) and स्थापितवान् (fails the oracle) were avoided. तस्मिन् (L1) and स्थापयति (L2) pass. |
| kv-5 · s-tato-madhyat सरलार्थः (6.22.17) | रामः **समुद्रं प्रति** कुप्यति। … → रामः **समुद्राय** कुप्यति। … | √kup takes the dative of the one at whom the anger is aimed (1.4.37 क्रुधद्रुहेर्ष्यासूयार्थानां यं प्रति कोपः). The house already writes it so: file 1 कस्मै अपि न कुप्येः. The sentence stays: it is the event that the verse's ततः points back to, and the story line just before says the same ("…Rama took up his bow in anger"). |
| kv-5 · s-etat-te-rakshitam सरलार्थः (6.127.54) | … अद्य **अहं बहु सुखी अस्मि**। → … अद्य **मम मनोरथः पूर्णः अभवत्**। | The verse's second half says "today my life has reached its goal, and **my heart's wish has come true**" (मनोरथः संवृत्तः). "I am very happy" is a different idea. The new sentence uses the verse's own word मनोरथः (lexicon, L3) and the house's "… पूर्णः अभवत्". (पूर्णा and सफलम् fail the oracle.) |

## Considered and kept (no change)
- **s-pitur-vacana, the gloss of इति "(so I hold:) thus"** (rev1 item 6). I fetched sarga 26 again. valmikiramayan.net's own
  word gloss is "iti = thus as [deeming this as my mentor's word]", which supports the stored reading. It translates 1.26.3
  as a separate sentence. rev1's reading (इति closes the father's instruction, with अनुशिष्टोऽस्मि in 1.26.3) is also possible.
  The gloss is not clearly wrong, so I kept it. The सरलार्थः (मम पिता उक्तवान्, … पालय इति) gives the father's instruction
  either way.
- **12.7 "almost the same words" → एतानि एव वचनानि** (rev1 item 7). The glossary's प्रायः would render "almost", but MW also
  gives prāyas the sense "probably". Here that would say "Mārīca probably said…". Kept as rev1 kept it.
- **s-tasmajjato जातः and s-anena-tvam अनुप्राप्तम् labelled "past passive participle".** Both have an active sense ("born",
  "come"). This is the usual Western label for every -ta participle (Whitney), and the lexicon forms carry the same strings.
  It is not wrong, so I kept it.
- **s-dhanyas-te सरलार्थः** "ये एवं कुर्वन्ति, ते महान्तः". The antecedent is loose but readable. शमयन्ति and निवारयन्ति fail
  the oracle. Kept.
- **s-madhuhantaram सुखेन** ("easily"). This is a small addition, but it is implied by 1.76.4–5. Kept.
- **s-na-rajyad**, **s-tvarate-karyakalo**, **s-ito-dvipe**, **s-tasmajjato**. These सरलार्थाः simplify, but they do not
  distort the verse. Kept.
- **The quote pattern "X Y-acc. वदति।" + direct speech in सरलार्थाः** (s-iyam-sita, s-trnam-antaratah, s-esha-setuh,
  s-dharmatma-satyasandhah, s-etat-te-rakshitam). This is the v0.4 precedent (s-ko-nvasmin: वाल्मीकिः नारदं पृच्छति। …?).
  Kept.
- **All anvayas** (48). Each is a correct prose order, and each implied word is apt: [अस्ति], [भवतु], [भविष्यति], [ते],
  [इति], [तर्हि], [आनय], [सीताम्], [ताम्], [जह्याम्]. No change.
- **Translations** (48). Each matches its verse. The two that the integration changed (1.30.26, 1.75.3) now agree with their
  analyses.
- **Sandhi notes** (134). All are correct, for example: 8.3.7 karṇikārāṃś ca; 8.4.60 tasmim̐l laṅkā; 6.1.132 eṣa / sa before
  a consonant; 8.3.14 + 6.3.111 dhanū rāmaḥ; 8.3.36 bāṇaḥ / bāṇas svarṇa…; the optional 8.4.45 महाशैलान्मेरोः.
- **Meter notes** (11). I re-scanned each by hand. All match: ma-vipulā s-aropayitva 1, s-apyaham-jivitam 3,
  s-sarvatra-khalu 3; na-vipulā s-ahalya 3, s-nipetush 3, s-iyam-sita 3, s-yan-mangalam 3, s-tasmajjato 1,
  s-sa-visrshto 1; bha-vipulā s-kshayanta 1, s-na-paryadevan 1.
- **UI.** No change to तिष्ठ, अग्रे गच्छ ▶, अलम् ▶▶ or एतत् त्यजसि?. पश्य stays as the label for "Look closer". The four echo
  titles are correct labels, and इति marks the quoted words.
- **Names and model.** No change. जनक, अहल्या, गौतम, जामदग्न्य, मिथिला, गङ्गा, सम्पाति, गोदावरी, मृग, सागर, मैनाक, दधिमुख,
  नल, मधुवन, ऋषभ and कैलास are all correct stems. हिमवत् on the bhagavat-m model gives हिमवान्, हिमवन्तम् and voc. हिमवन्:
  the classical vat-declension.

## Verse text: the other 31 verses, fetched again (valmikiramayan.net, WebFetch, 14 Nov 2026)
Fetched: 1.20.2, 1.22.12, 1.26.2, 1.30.26 (pādas 1–4), 1.49.17, 1.73.26, 2.25.32, 2.27.6, 2.50.36, 2.63.6, 2.94.3,
2.105.16, 3.10.18cd–19ab, 3.14.33, 3.49.30, 3.60.12, 3.68.24, 4.5.11, 4.22.20, 4.28.7, 4.44.13, 4.58.20, 5.1.39, 5.1.132,
5.15.19, 5.21.3, 5.36.2, 6.9.19, 6.60.54, 6.123.16cd–17ab and 6.127.54. With rev1's 17, all 48 verses have now been fetched
again by a reviewer.

**Result: all 31 agree word for word with the stored pādas.** I allowed for the site's word-split printing in Ayodhyā to
Yuddha, its न्ग / न्क for ङ्ग / ङ्क, and anusvāra against class nasal. The variants already recorded were seen again:
- 4.5.11: the site reads यदि मे; वा is stored.
- 2.105.16: समुग्च्छ्रयाः and सम्योगा.
- 5.1.39: गच्चेत्.
- 5.1.132: इहान्त्तरे.
- 5.15.19: निह्श्वसन्तीम्.
- 6.9.19: विनश्येद्द्, आक्षसाः.
- 4.44.13: जनकाअत्मजा.
- The misprinted markers ४-१०-N (Araṇya 10) and ३-२८-N (Kiṣkindhā 28).
- 6.123: तवहेतोर्… printed joined.
- The orthography that the packages already note: आमंत्रये, सम्परिष्वज्य, संतप्ता / विमुंचति, मंत्र-, कौसल्यानंद-.

Two remarks:
- **Fetch order is not reliable.** My first fetch of 4.22 printed 4.22.20's first line before the end of 4.22.19. A second,
  targeted fetch showed that the page order is correct. Each order question below was settled by a targeted second fetch.
- **2.25.32.** In two separate fetches the page itself prints the marker २-२५-३२ after "यन् मन्गलम् … नमः कृते", with
  "दक्षिणाम् प्रददौ … चेदमब्रवीत्" before it. "वृत्र नाशे … मन्गलम्" follows unmarked, and the next "यन् मन्गलम् सुपर्णस्य …"
  closes ३३. The page also misprints ततस्तस्मै as ततस्तन्मै at ३१. So the page's markers run one line early in this passage.
  It is not the fetch reader, as A's provenance note says. The sense units, and the parallel यन्मङ्गलं … तत्ते भवतु मङ्गलम्
  couplets, support the stored number 2.25.32. The words are unaffected (integrator 3).

No suspected error in any stored verse text or pāda.

## Flagged for the human reviewer
1. **rev1 item 1, the register of the सरलार्थाः.** I agree with the convention: polite forms from allies and juniors, and
   त्वम् from elders and in prayers. Note one older exception: v0.4's s-aranya-3 has Jaṭāyu, an elder, using भवान् to Rāma.
   v0.6's Śabarī (s-maya-tu-vividham) keeps त्वम्, as Vālmīki does (तव). Vibhīṣaṇa's सीतां रामाय पुनः देहि to his elder
   brother the king stays in the 2nd person, so that it matches file 3's quoted plea. Whether a younger brother should say
   भवान् … ददातु to the king should be settled for both places at once.
2. **rev1 item 2.** I agree.
3. **rev1 item 3, सज्जं करोति for "strings (a bow)".** This is supported by the dictionaries:
   - MW sajja, sense 4: "having a bowstring, strung, placed on a bow-string" (often v.l. for sa-jya).
   - Apte, sense 6: "Strung, placed on a bow-string" (read via wisdomlib, which reproduces both).

   The game's gloss of सज्ज is "ready". So a learner meets the bow sense only through these lines. That is acceptable.
4. **rev1 item 4, प्रबुध्यते.** I agree.
5. **rev1 item 5, आरोपयित्वा.** I agree that a note would help: an epic -tvā after a prefix, where classical Sanskrit uses
   आरोप्य (7.1.37). The game teaches "prefix → lyap". The grammar string sits in both shlokas-3 and lexicon-3, so this is for
   the integrator (2), not a shlokas-only edit.
6. **rev1 item 6.** I disagree that it needs a change: the site's own gloss supports the stored reading (see above). Both
   readings are possible.
7. **rev1 items 7–10.** I agree with each. On item 8, मन्त्रिणौ: Mārīca was an adviser whom Rāvaṇa consulted, not his
   minister. मन्त्रिन् "counsellor" covers this, and the English says "counsellors".
8. **New: s-yathayodhya's भवतः कृते किं करोमि?** (Guha). कृते + genitive "for (your) sake" is classical. The verse's own
   करवाणि (loṭ 1sg) would be closer, but it is not in the packs. Present for the deliberative question is Sambhāṣaṇa usage.
9. **New: s-tato-madhyat.** The सरलार्थः keeps one sentence of context (Rāma's anger) that is not in the verse. It explains the
   verse's ततः. Remove it if a teacher wants the सरलार्थः strictly to the verse. "ततः सागरः स्वयं …" would then open it.

## For the integrator
1. **lexicon-3 `jamadagnya-2`, `notes`.** It still reads "Taddhita adjective of the patronymic: 'Paraśurāma's' (here of the
   bow)". This contradicts the new `meaning` "of Jamadagni's line" and the shlokas gloss.
   - Suggested: "Patronymic jāmadagnya used adjectivally of the bow: 'of Jamadagni's line', the bow handed down from
     Jamadagni (1.75.22, पितृपैतामहं 1.75.27)."
   - A human may confirm the derivation. Classically, "of Jamadagni" would be jāmadagna, and "of the Jāmadagnya" would be
     jāmadagnīya (4.2.114). The epic usage stands either way.
2. **आरोपयित्वा (1.67.17), its grammar string** in shlokas-3 `s-aropayitva` and in lexicon-3 `ruh`. Optionally append
   "(epic -tvā after a prefix; classical āropya, 7.1.37)" in both places together, so that the verse analysis and the reader
   agree (rev1 item 5).
3. **s-yan-mangalam, the provenance note.** "the fetch reader placed the verse marker after the first line" should say that
   the page itself prints this passage's markers one line early (see above). Text and number are unaffected.
4. **REVIEW.md fold-in.** Put this report's counts and change table into the v0.6 section beside rev1's, and add items 1–9
   above to the human-review list. The four सरलार्थः changes alter text that REVIEW-v06-a/c may quote, so re-copy them if
   the fold-in lists the सरलार्थाः.
5. **check.ts** (scratch) does not see file 13's model. This is the tool's limit (rev1 integrator 4).
6. **Working tree.** `PRD.md` and `notes/katha.md` are modified in the working tree by someone else. I did not touch them.
   Nothing is committed.
