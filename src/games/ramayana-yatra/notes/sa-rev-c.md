# sa-rev-c: Sanskrit review of `content/sa-dialogue-4.json` (speaker titles, chapter summaries, move / ally / enemy / item blurbs, move origins, logic objectives)

Reviewer: agent sa-rev-c (independent; did not write these lines). Date: 2026-11-11.

**Scope.** The `sa` field of all 159 entries. I read each line against its English, its `ctx`, the real speakers behind each title (story-ch1…6 `who` + portrait), the actual effects in `defs.json` (who uses which move, the heal amounts) and files 1–3. Only `sa` was edited: `en`, `ctx`, `label` and `models` are unchanged (verified by diff). No models were added. **Numbering:** `#N` is the 0-based index in `entries`.

**Gates after the last edit:**
- `node --import tsx --test src/games/ramayana-yatra/sambhashana.test.ts` → 12/12 pass.
- `node --import tsx /home/claude/scratch/sa-oracle/check.ts` → exit 0. File 4: 159/159 translated, 0 with problems. Level summary: L4 tokens went from 2 to 1; the one left is धनुषा, a permitted story term.
- Extra check: `content.test` and `sa-ui.test` → 17/17 pass.

## Summary: 10 lines changed

| category | lines | entries |
|---|---|---|
| player/speaker gender (labels) | 2 | #47, #59 |
| meaning (wrong side, time order, clarity) | 3 | #69, #70, #109 |
| grammar | 1 | #124 |
| register / consistency (polite objective; blurb mood) | 3 | #8, #87, #91 |
| level | 1 | #144 |

## Changes

| # · en | before → after | reason |
|---|---|---|
| #8 · The journey is complete. Rest well, student. (objective) | …सुखेन **विश्राम्य**। → …सुखेन **विश्राम्यतु**। | Objectives use the polite imperative, like every objective in files 1–3 and the other eight objectives in this file. This was the only plain 2sg loṭ. |
| #47 · Vanara (label) | वानराणां नारी → **वानरः** | The English key "Vanara" is shared by six speakers: ch4.vanara_home (the woman whose husband joins the search) plus ch5.vanara_cheer, ch6.camp_vanara ×3, ch6.field_vanara and ch6.vanara_city, who are soldiers in the camp and on the battlefield. Every one of them was shown as "a vanara woman". By the house rule (generic masculine unless *every* speaker is a woman), the title is वानरः. The example in notes/sambhashana.md §File 4 ("Vanara at home → वानराणां नारी") is now out of date. |
| #59 · Night trader (label) | रात्रेः वणिक् → **आपणस्य राक्षसी** | The only speaker is a rākṣasī (portrait `rakshasi`, and the next line reads "She does not notice…"). वणिज् is masculine, and the feminine forms (विक्रेत्री, वणिक्स्त्री) are not in the packs. The new title follows the house pattern for a woman speaker (ग्रामस्य नारी, निषादानां नारी). It also drops the odd "merchant of the night". |
| #69 · ch2 summary | श्वः रामः राजा भविष्यति। **तदा** कैकेयी द्वौ वरौ याचते। … → …। **परन्तु अद्य** कैकेयी द्वौ वरौ याचते। … | After a sentence about tomorrow, तदा ("at that time / then") puts Kaikeyī's demand on the coronation day or after it. The English says *on the eve*, and the demand is the turn of the plot. The rest of the line is unchanged. |
| #70 · ch3 summary | …**जटायुः म्रियते, परन्तु पूर्वं** रामाय सर्वं वदति।… → …**जटायुः रामाय सर्वं वदति, ततः म्रियते।**… | पूर्वम् had nothing to be "before" (मरणात् is not in the packs), and परन्तु is not adversative here. A learner reads "Jaṭāyu dies, but earlier tells". The new order follows the events: he tells Rāma everything, then dies. The rest of the line is unchanged. |
| #87 · A sword stroke. (Lakṣmaṇa's move) | खड्गेन प्रहर। → **वीरः खड्गेन प्रहरति।** | An imperative to the player ("strike with the sword!") is not a description. The English is a noun phrase, and the player does not wield the sword. The new line matches the other hero-attack blurbs (वीरः … शिलां क्षिपति, वीरः वृक्षम् उद्धृत्य … प्रहरति) and the enemy ones (शत्रुः शूलेन प्रहरति). |
| #91 · A blow of the mace. Strong against water. (Hanumān, Sugrīva) | गदया प्रहर। जलं प्रति… → **वीरः गदया प्रहरति।** जलं प्रति… | Same reason as #87. Without a subject, "एतत् तीक्ष्णम्" also had no clear antecedent. |
| #109 · A probing question that lowers attack. | कठिनः प्रश्नः। तेन **शत्रोः** तेजः न्यूनं भवति। → …तेन **वीरस्य** तेजः न्यूनं भवति। | `prashna` is a duelist move: only the duel opponents (Bharadvāja, the paṇḍita, Hanumān in disguise, Surasā) use it, and it lowers the attack of *the player's hero*. The old line said the foe's own attack falls, which is the opposite. (mantrana and viddhi, which are hero moves, rightly keep शत्रोः.) |
| #124 · Prince of Ayodhyā…; the strongest of the heroes. | वीरेषु सः एव **अधिकः** बलवान्। → वीरेषु सः एव **अधिकं** बलवान्। | The comparative degree word is adverbial अधिकम् ("more strong"), as rev-b uses it (सर्वेभ्यः … अधिकं …). अधिकः, agreeing with सः, reads "he is excessive/extra, strong". |
| #144 · A young prince of the island city (Akṣa) | द्वीपस्य नगरस्य **युवा** राजकुमारः। → …**तरुणः** राजकुमारः। | युवा (yuvan-m) is level 4 in the oracle. तरुणः is an L1 adjective with the same meaning. |

## Checked and deliberately kept (so the next reader does not redo them)
- **Numbers** match `defs.json`: suprabhāta 0.35 → शते पञ्चत्रिंशत्; prajñā 0.30 → शते त्रिंशत्; āditya-hṛdaya and anirveda 0.5 → शते पञ्चाशत्; items 40 / 70 / 5 PP / 0.5. Every "foe's"/"hero's" possessor was checked against the move's user (only #109 was wrong).
- **Rāmāyaṇa facts:**
  - Kabandha (once Danu) is headless, with long arms → शिरः विना … बाहू अतीव दीर्घौ.
  - Sampāti → जटायोः भ्राता.
  - Surasā → सर्पाणां माता.
  - Siṃhikā seizes shadows.
  - Hanumān's test is in a bhikṣu's disguise.
  - Brahmāstra and Ādityahṛdaya are credited as the English credits them.
- **Grammar checked and correct:** विक्रीणीते (वि+क्री is ātmanepada, 1.3.18), तस्याः बिभ्यति (ablative with भी), परीक्षते, युध्यते, याचते, शिरः विना (accusative), उद्धृत्य, सुप्तवान्, उपदिष्टवान्.
- **मित्रे भवतः** (ch4): a neuter predicate noun in the dual is grammatical. सखायौ is the alternative (see the human list).
- **वद् with the accusative or dative of the person** (लक्ष्मणं वदति, रावणं वदति, हनुमते वदति, रामाय … वदति): both appear in files 1–3. Not marked.
- **Labels kept:**
  - यात्रिकः मुनिः ("traveller sage", L2; भ्रमन् मुनिः would be L3).
  - बालः शिष्यः, छात्रः.
  - वानरः दूतः and राक्षसः दूतः: file 3 itself renders "Ravana's spies" as रावणस्य दूताः.
  - गजः (see below).

## For a human teacher (judgement calls)
1. **Danu → कबन्धः (#38).** He speaks *after* the curse is lifted, as the shining celestial (file 2 narrates "देवः इव एकः पुरुषः उत्तिष्ठति"). The identity is right, but strictly the speaker is no longer in the Kabandha form. दनुः is not in the packs (it would need a u-stem model, MW danu m.). Options: keep, or `मुक्तः कबन्धः` (verifies), or add a model.
2. **"एवं मा कुरु" (#70, Mārīca)**: मा + loṭ is kept. It echoes the scene line "रावण, एतत् मा कुरु!" in file 2, which rev-b also kept, and it is ordinary Sambhāṣaṇa. The Pāṇinian **एवं न कुर्याः** verifies, if you prefer it.
3. **Night trader → आपणस्य राक्षसी (#59)** drops "night". The alternative रात्रौ आपणे राक्षसी also verifies.
4. **Temple priest → मन्दिरस्य आचार्यः (#26)**: kept. पुरोहितः, अर्चकः and पूजकः are not in the packs, and आचार्य is "preceptor". It is acceptable for an officiating priest, but not exact.
5. **Gaja → गजः (#53)** is his real name (Vālmīki 4.65, the leap-boasting scene), but the oracle verifies it only as "elephant". Next to three वानरः labels in the same scene, a learner may read "an elephant says…".
6. **Losses where the packs lack the word:**
   - "iron" club → कठिनः महान् दण्डः (#104; लोह is missing);
   - "royal assembly" → राज्ञः भवने (#150; सभा is missing);
   - Lakṣmaṇa "fierce" → बलवान् (#125; उग्र/तीव्र are missing).
7. **"Learned at level 8" → यदा स्तरः अष्टौ भवति (#119)**: kept. A cardinal used as a counting label in the nominative (like SB's "क्रमाङ्कः पञ्च"). The ordinal अष्टमः is not in the packs.
8. **Same verse, two wordings**: the move origin (#112) says शुद्धायाः वाचः श्लोकम्, and file 2's objectives say शुद्धस्य वचनस्य श्लोकम्. Both are correct. Align them if you want the learner to see one name.
9. **Out of scope (English, file 3), flagged only:** Mainda says "Ninety yojanas". In Vālmīki 4.65, as I recall it, Mainda claims 60 and Jāmbavān 90. Please check against the text.
10. **notes/sambhashana.md §File 4** still gives "Vanara at home → वानराणां नारी" as its example. The owner should update it to match #47.
