# v05b-rev1: first Sanskrit review of v0.5b (WP-A to WP-D)

Reviewer: v05-rev1 (model; first of two independent reviewers). Date: 2026-11-14. **Not a human sign-off.**

**Scope.** Every new or changed Sanskrit string since commit e16da00 (`git diff e16da00`). I checked the `sa` field against its `en` and `ctx`, the speaker and flow in `story-ch*.json`, the slot values in view-chain.tsx / logic-battle.ts, the house rules (notes/sambhashana.md, notes/sa-ui.md glossary, REVIEW.md v0.4.2 audit) and the Vālmīki event. Only `sa` changed: no `en`, `ctx` or `models` were touched. Every word I introduced passes the oracle (`sa-ui/words.ts`). I did not touch aditya-hridayam.json or the Āditya-hṛdayam cutscene.

## Counts

| File | Strings checked | Changed |
|---|---|---|
| sa-dialogue-6.json (WP-A) | 14 | 2 |
| sa-dialogue-7.json (WP-C) | 6 | 3 |
| sa-dialogue-8.json (WP-B) | 30 | 2 |
| sa-dialogue-9.json (WP-D) | 29 | 3 |
| sa-battle.json, new templates (WP-C) | 5 | 4 |
| sa-ui-chain.json | 8 | 4 |
| sa-ui-scene.json | 2 | 0 |
| sa-ui-setu.json | 13 | 0 |
| names.json (person.kusha कुश, person.lava लव) | 2 | 0 |
| sa-ui-katha.json | 0 (no key added or changed since e16da00) | 0 |
| **Total** | **109** | **18** (13 accuracy / meaning, 5 ease / consistency) |

Other content diffs since e16da00 (katha.json, katha-chain.json, story-ch1–6.json) hold no Sanskrit except Vālmīki quotations inside `source` notes.

**Gates:**
- `check.ts` on files 6–9: 79/79 entries, 0 problems. Levels: file 6 L1 80 · L2 7 · L3 5; file 7 L1 37 · L2 7 · L3 6; file 8 L1 188 · L2 52 · L3 7; file 9 L1 138 · L2 22 · L3 11.
- Required tests: `sambhashana`, `sa-ui`, `sa-battle`, `katha-content` → **45/45 pass**. `chain`, `v05b-hooks` and `setu` → 28/28 pass.

## Changes

| String (English, short) | before → after | why |
|---|---|---|
| sa-battle **kathaChainRule** · "Answer with a line that begins with its last sound!" | यः पादः तस्य अन्तिमेन वर्णेन **आरभते**, तं वद! → तस्य अन्तिमेन वर्णेन त्वं पादम् **आरभस्व**! | आ+रभ् is transitive ("to begin something"). Every earlier use in the game is transitive (यज्ञम् आरभे, वदितुम् आरभते). "पादः … आरभते" (a line begins) is a modern intransitive use, and a learner could pick it up. Also, in यः पादः तस्य … the तस्य could be read as the line's own last sound. The new wording is Hanumān's own rule from file 7 (मम पादस्य अन्तिमेन वर्णेन त्वं पादम् आरभस्व), so the duel teaches one construction. |
| sa-battle **kathaChainStumped** · "{x} thinks, but no line begins with that sound!" | तेन वर्णेन कः अपि पादः न आरभते! → किन्तु सः वर्णः कस्य अपि पादस्य **आरम्भे** न अस्ति! | Same intransitive आरभते. "That sound is at the start of no line" uses आरम्भः (L2, a plain noun). किन्तु restores the English "but". |
| sa-ui-chain **chain.prompt** · "Which line begins with this sound?" | कः पादः अनेन वर्णेन आरभते? → कस्य पादस्य आरम्भे अयं वर्णः अस्ति? | Same intransitive आरभते. आरम्भे also pairs with the label अन्तिमः वर्णः just before it. |
| sa-ui-chain **chain.any** · "No line begins with this sound. Say any line!" | अनेन वर्णेन कः अपि पादः न आरभते। … → अयं वर्णः कस्य अपि पादस्य आरम्भे न अस्ति। … | Same. |
| sa-ui-chain **chain.srTurn** · "… Which line begins with it?" | … कः पादः अनेन वर्णेन आरभते? → … कस्य पादस्य आरम्भे अयं वर्णः अस्ति? | Same, so it matches chain.prompt. |
| sa-ui-chain **chain.srAny** · "No line begins with its last sound: say any line!" | … अनेन वर्णेन कः अपि पादः न आरभते। … → … तस्य अन्तिमः वर्णः कस्य अपि पादस्य आरम्भे न अस्ति। … | Same. "Its last sound" (तस्य अन्तिमः वर्णः) is now said, as in the English. |
| file 9 · Nala's bridge: "… A hundred yojanas in all." | सर्वं मिलित्वा १०० योजनानि। → एवं सेतुः शतं योजनानि दीर्घः। | सर्वं मिलित्वा is a calque of Hindi "sab milākar". The ktvā also has no agent (3.4.21 needs the main verb's agent), and सर्वम् cannot be one. आहत्य ("in total") is not in the packs. The new line says "Thus the bridge is a hundred yojanas long" (6.22.74 शतयोजनम् आयतम्). The accusative of extent goes with an adjective (2.3.5, क्रोशं कुटिला नदी). शतं योजनानि is the game's set phrase (files 2, 7). |
| file 7 · objective "Ask each vanara how far he can leap." | एकम् एकं वानरं तस्य बलं पृच्छतु। → सर्वान् वानरान् पृच्छतु। कः कति योजनानि उत्पतितुं शक्नोति? | A doubled एक is एकैक (8.1.9 एकं बहुव्रीहिवत्: the first member takes no ending), so एकम् एकम् is a non-standard form. एकैकम् is not in the packs. The new wording also restores "how far" (कति योजनानि, all L1–L3). It matches file 2's roll call (कः शतं योजनानि उत्पतितुं शक्नोति?). |
| file 8 · "… for Sita has prayed to Agni for his safety." | … न दहति। सीता तस्य कुशलाय अग्निं याचितवती। → … न दहति, यतः सीता अग्निं तस्य कुशलं याचितवती। | With याच्, a lone accusative is the thing asked for, so अग्निं याचितवती reads first as "begged for fire". The double accusative (1.4.51 अकथितं च: X-acc. Y-acc. याचते) says "asked Agni for his safety". यतः restores the English "for". (5.53: Sītā prays to Agni to be cool for Hanumān.) |
| sa-battle **kathaHeads** · "A head of Ravana falls, but a new head rises in its place!" | रावणस्य शिरः पतति। किन्तु नूतनं शिरः पुनः उद्भवति! → रावणस्य एकं शिरः पतति। किन्तु तस्य स्थाने नूतनं शिरः उद्भवति! | Restores "a head" (one of ten) and "in its place" (तस्य स्थाने), and drops the redundant पुनः next to नूतनं. Cf. 6.107.55–57 तस्यैव सदृशं चान्यद्रावणस्योत्थितं शिरः. |
| sa-battle **kathaMatali** · "Matali calls to Rama: why wait? Loose Brahma's weapon now!" | मातलिः रामं वदति — हे राम, अधुना ब्रह्मास्त्रं क्षिप! → मातलिः रामं वदति — हे राम, किमर्थं प्रतीक्षसे? अधुना ब्रह्मास्त्रं क्षिप! | Restores the dropped "why wait?". प्रतीक्षसे (L2) is the same verb as प्रतीक्षते elsewhere. Cf. 6.108.2–3, Mātali's reproach. |
| file 7 · Aṅgada: "First hear every vanara: how far can each one leap?" | प्रथमं सर्वेषां वानराणां वचनं शृणु। → … शृणु। कः कति योजनानि उत्पतितुं शक्नोति? | Restores the dropped question, in the same words as the objective. |
| file 6 · "In mid-stream Sita bows to the Ganga and prays." | … सीता गङ्गां नमस्करोति। → … सीता गङ्गां नमस्कृत्य वदति। | Restores "and prays": she bows, then speaks the prayer that follows. Vālmīki 2.52.82 says प्राञ्जलिर्भूत्वा … इदमब्रवीत्. नमस्कृत्य is L2, with the same agent as वदति. |
| file 6 · Sītā: "… Fourteen years we will live in the forest …" | वयं १४ वर्षाणि … → वयं चतुर्दश वर्षाणि … | Files 1–5 write numbers in sentences as words (चतुर्दश सहस्राणि, शतं योजनानि, विंशतिं योजनानि). The number is part of what a learner reads, and Vālmīki's own words are चतुर्दश हि वर्षाणि (2.52.84). |
| file 7 · "Every vanara has spoken. None can leap a hundred yojanas." | … कः अपि शतं योजनानि … → … **तेषु** कः अपि शतं योजनानि … | "None of them". The very next line is Aṅgada's "I could leap a hundred yojanas, but I am not sure I could come back" (file 2; Kiṣ 65). A bare कः अपि (no one at all) contradicts that line and Vālmīki. |
| file 8 · "From the branches, Hanuman sings Rama's story softly …" | हनुमान् शाखाभ्यः मन्दं … → हनुमान् शाखासु स्थित्वा मन्दं … | शाखाभ्यः is also the dative ("sings to the branches"). The ablative of place (ल्यब्लोपे पञ्चमी) is correct but hard at Level 3. "Staying in the branches" is unambiguous. |
| file 9 · Aṅgada: "He has come from our enemy. …" | सः अस्माकं शत्रोः आगतवान्। → सः अस्माकं शत्रोः पक्षात् आगतवान्। | शत्रोः is both ablative and genitive, so अस्माकं शत्रोः reads as "of our enemy". "From our enemy's side" is clear, and close to Vālmīki's शत्रोः सकाशात् (6.17; सकाश is not in the packs). |
| file 9 · Nala: "Let every stone sit true. …" | सर्वाः शिलाः सम्यक् भवन्तु। → सर्वाः शिलाः सम्यक् तिष्ठन्तु। | "Sit true" = stand properly. This matches the puzzle's own label setu.set सम्यक् स्थिता. सम्यक् भवन्तु ("be fine") is colloquial. |

## Packages' first flags: verdicts

| String | Verdict |
|---|---|
| हे गङ्गे मातः, रामं रक्ष। वयं १४ वर्षाणि वने वत्स्यामः। … | Correct. मातः is the vocative of मातृ. वत्स्यामः is the regular lṛṭ of वस् (7.4.49). पूजयिष्यामि is correct. The address with त्वम् suits a prayer. Only the digits changed (to चतुर्दश). |
| मारीचः, रामस्य वाचा | Correct as a label: वाचा is the instrumental of वाक् ("with Rāma's voice"). Kept. Vālmīki's word, स्वर, is not in the packs (teacher item 2). |
| आकाशेन… दक्षिणां दिशं गतवान्। | Grammar correct: the instrumental of route, as in आकाशेन गच्छति. The subject comes from the question. Kept. The "south" is Vālmīki's own: 3.68.10 प्रयातो दक्षिणां दिशम् (see teacher item 3). |
| तर्हि भवती मुखं विशालं करोतु। अहं प्रविशामि। | Correct. भवती + 3rd-person loṭ is the polite form to Surasā. The present stands for the near future (3.3.131). Faithful to 5.1 (कुरु वै वदनं महत्). Kept. |
| पुनः वर्धताम्! / अतीव लघुः भवतु! | Correct. वृध् is ātmanepada, so its loṭ 3sg is वर्धताम्. Both replies are polite 3rd-person imperatives that answer हनुमान् किं करोतु?. Kept (लघु: teacher item 4). |
| सीता तस्य कुशलाय अग्निं याचितवती। | Changed (see above): misreadable as "begged for fire". |
| यः पादः तस्य अन्तिमेन वर्णेन आरभते, तं वद! | Changed: intransitive आरभते, and तस्य is ambiguous. |
| मम पादस्य अन्तिमेन वर्णेन त्वं पादम् आरभस्व। | Correct. आरभस्व is transitive loṭ 2sg ātmanepada, and the instrumental names the sound the line is begun with. It is now the model for the battle rule line. Kept. |
| …नूतनं शिरः पुनः उद्भवति! | Changed: "in its place" was missing and पुनः was redundant. उद्+भू उद्भवति itself is correct. |
| गच्छ, तम् अत्र आनय। मम व्रतं तस्मै वद। | Correct. व्रतम् is exactly Vālmīki's word (6.18.33 … एतद् व्रतं मम). वद + dative follows the house precedent (गुरवे वदाम). Rāma uses त्वम् to the student. Kept. |
| …सर्वं मिलित्वा १०० योजनानि। | Changed: a calque, and the ktvā has no agent. |
| यावत् पर्वताः नद्यः च सन्ति, तावत् रामस्य कथा जीविष्यति। | Correct. With यावत्, laṭ can carry the future (3.3.4 यावत्पुरानिपातयोर्लट्). यावत्–तावत् is the plain correlative. Kept. Vālmīki 1.2.36 has स्थास्यन्ति … प्रचरिष्यति (teacher item 6). |

## Vālmīki checks (done in this review)
- Sundara 54 (sanskritdocuments.org prose summary, read 14 Nov 2026): Prahasta's house burns first, Kumbhakarṇa's is in the list, Vibhīṣaṇa's is spared, and Rāvaṇa's own house comes last. Files 8 roof_1–roof_4 agree.
- Araṇya 67 (valmikiramayan.net, read 14 Nov 2026): Jaṭāyu says only that Rāvaṇa took Sītā and flew up into the sky (3.67.20 सीताम् आदाय वैदेहीम् उत्पपात विहायसम्). He gives no direction. See teacher item 3.
- Bāla 1.4 (twins, court), 2.52 (Sītā's prayer to Gaṅgā), 5.1–2 (Surasā, cat-size), 5.53 (Sītā prays to Agni), 6.17–19 (Aṅgada's counsel, the vow, the descent from the sky), 6.22 (14 + 20 + 21 + 22 + 23 = 100 yojanas), 6.107–108 (heads, Mātali): the Sanskrit agrees with each event as the ctx cites it. These were checked from memory and from the ctx notes, not re-fetched.

## For the human teacher
1. **आ+रभ् in the verse chain.** I replaced the intransitive "पादः … आरभते" with the transitive "…वर्णेन पादम् आरभस्व" and "पादस्य आरम्भे … अस्ति". Please confirm both, or accept intransitive आरभते (common in modern spoken Sanskrit) and say which you prefer. Please also confirm वर्णः, not अक्षरम्, for the key: it is a bare consonant shown with a virāma.
2. **मारीचः, रामस्य वाचा** (speaker label) and "सः शब्दः रामस्य शब्दः इव" (file 6). वाक् / शब्द stand for Vālmīki's स्वर (3.44, सदृशं राघवस्यैव), which the packs lack. Adding स्वर would make these exact.
3. **आकाशेन for "through the sky" (Jaṭāyu).** Resolved on the direction: the integrator checked Vālmīki 3.68.10, परिश्रान्तस्य मे तात पक्षौ छित्वा स राक्षसः। सीतामादाय वैदेहीं प्रयातो दक्षिणां दिशम्॥ ("…took Sītā and went to the southern quarter"), so दक्षिणां दिशं गतवान् is faithful and stays. Still open: is आकाशेन (instrumental of route) clear at Level 3, or is आकाशमार्गेण better?
4. **लघुः for "tiny" / "small as a thumb / a cat"** (file 8). लघु is first "light", and also "small" in MW. Vālmīki's अङ्गुष्ठमात्रः and पृषदंशकमात्रः (5.2.49) are compounds the packs lack.
5. **अहं प्रविशामि** (present for near future) vs प्रवेक्ष्यामि (verified, L2). Kept the easier present.
6. **यावत् … सन्ति, तावत् … जीविष्यति.** Kept (3.3.4). Should it echo Vālmīki's स्थास्यन्ति … प्रचरिष्यति instead? स्थास्यन्ति passes the oracle; प्रचरिष्यति does not.
7. **Mātali to Rāma in the 2nd person** (क्षिप, प्रतीक्षसे; kathaMatali and the v0.5a line). Vālmīki's Mātali uses त्वम् / प्रभो (6.108). Does the house rule of respectful forms for Rāma call for भवान् … क्षिपतु here?
8. **"सर्वेषु काण्डेषु एकं पादं पठ"** (file 9, "one line in every book"). The distributive is only implied. एकैकम् / प्रत्येकम् are not in the packs.
9. **"रामः आसने उपविशति"** for "throne". सिंहासन is not in the packs. As I recall, Bāla 1.4 seats Rāma on a golden throne (not re-checked).
10. **ततः मारीचः जीवनं त्यजति** for "Maricha dies" (file 6). Kept. म्रियते (L2) or प्राणान् त्यजति are the alternatives, if the teacher prefers either.
11. **Direct quotes without इति** (file 8 चिन्तयति, '…?'; file 9 रामः मन्त्रिणः पृच्छति, '…' and रामः त्वां पृच्छति, '…'). These follow the file-5 choice-prompt precedent, but the v0.4.2 convention says every direct quote closes with इति. Please decide one rule for both.
12. **Digits in Nala's line** (प्रथमे दिने १४ योजनानि। ततः २०, २१, २२, २३ च।). Kept, because they mirror the puzzle's stone labels. Files 1–5 otherwise write numbers as words.
13. **Outside this review's scope, pre-existing:** sa-dialogue-2 (ch4 roll call) has "एकः एकः वानरः आत्मनः बलं वदति". The same doubling of एक should be एकैकः (8.1.9). Not changed, because that file is not part of v0.5b.
