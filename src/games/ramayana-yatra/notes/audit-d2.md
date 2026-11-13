# audit-d2: Sanskrit audit of `content/sa-dialogue-2.json` (Araṇya + Kiṣkindhā, ch3–ch4), brief v0.4.2

Auditor: au-d2 (model; did not write these lines). Date: 2026-11-12. Scope: the `sa` field of all 277 entries. Each one was read against its `en`, its `ctx` and speaker, the story flow in story-ch3/ch4.json, names.json (move names, item names) and defs.json (move effects). It was also checked against the earlier reviews (notes/sa-rev-b.md, which covers this file, plus notes/kc-rev.md and notes/sa-rev-c.md for cross-file conventions). Settled choices were not re-opened.

**Numbering:** `#N` is the 0-based index in `entries`, the same numbering sa-rev-b uses.
**Untouched:** `en`, `ctx` and `models` (checked by script diff against a backup at `/home/claude/scratch/au-d2/sa-dialogue-2.before.json`). No models were added. JSON is valid.

## Counts

| | count |
|---|---|
| strings checked | 277 |
| fixed (accuracy: grammar, wrong name or term, broken markup render, quotation syntax) | 9 (#213, #218, #254, and #56 #73 #77 #185 #245 with a missing इति; #104 consistency with #101 and the EN) |
| simplified (ease) | 4 (#9, #28, #97, #138) |
| flagged for a human | 14 items (below; 9 of them were already on sa-rev-b's list and are still open) |
| lines changed in total | 13 |

## Changes

| # · English (short) | before → after | why |
|---|---|---|
| #254 · "Thirty yojanas for me." | अहं **त्रिंशत्** योजनानि उत्पतितुं शक्नोमि। → अहं **त्रिंशतं** योजनानि … | **Case error.** त्रिंशत् is a feminine noun, and here it is the object of उत्पतितुम् (accusative of distance), so the form must be acc. त्रिंशतम्. The two lines beside it already do this correctly: विंशतिं (#253) and षष्टिं (#255). |
| #213 · "A new mantra wakes in you: {n:move.shuddha_vak}. It strengthens the whole party." | …लब्धः – **शुद्धा वाक्**। सः सर्वान् **बलवतः** करोति। → …लब्धः – **व्याकरणम्**। तेन सर्वेषां वीराणां **तेजः वर्धते**। | **Wrong move name.** In Sanskrit mode the battle menu shows this move as **व्याकरण** (names.json `move.shuddha_vak`), and **वाक्** is the name of a different move (`move.pada_bana`), so the old line pointed the player to the wrong mantra. The effect is `buff-atk` on the party, which the glossary calls तेजः … वर्धते (file 4 blurb: "तदा वीराणां तेजः वर्धते"). Also, बलवतः (acc. pl.) reads as a genitive singular, and बल is the HP word. |
| #218 · "That is {w:vyakarana}: every word in its right form." | एतत् एव **{w:vyakarana}** – … → एतत् एव **व्याकरणम्** – … | **Render bug** (orchestrator's note): `{w:}` shows the bare lemma, so the line printed "एतत् एव व्याकरण –". The sentence needs the nominative. The only other `{w:}` in the file (#29, "{w:vigrahavat} इति शब्दस्य अर्थः") is about the word itself, so it was kept. |
| #73 · Ravana's plan forms | …चिन्तयति च – अहं रामस्य पत्नीं हरिष्यामि। → …हरिष्यामि **इति**। | A direct quote is closed with इति. Without it, a narration line ends with "अहं … हरिष्यामि", which a learner can read as the narrator speaking. This is the house pattern (#49, #187, #192, #241). |
| #77 · Ravana commands Maricha | …न चेत् त्वां हनिष्यामि। → …हनिष्यामि **इति**। | Same as #73. |
| #56 · Valmiki's whisper | …मन्दिरे मुनिः त्वां श्रोष्यति। → …श्रोष्यति **इति**। | Same as #73. The quote runs over two sentences, so without इति the second one reads as narration. |
| #185 · Sugriva: "we saw a lady carried…" | …रावणः एकां नारीम् आकाशेन हरति। → …हरति **इति**। | A report of what was seen (present tense inside दृष्टवन्तः) needs इति. The next sentence in the same line already closes its quote with इति. |
| #245 · Sampati: "I saw Ravana carry a lady…" | अहं दृष्टवान् – रावणः एकां नारीं हरति। → …हरति **इति**। | Same as #185. |
| #104 · Jatayu: "I broke his chariot" | अहं तस्य **विमानं** नष्टं कृतवान् → अहं तस्य **रथं** नष्टं कृतवान् | Uses the same word for the same thing. The narration just before it (#101) shows "महान् **रथः** नष्टः", and the English says "his chariot". "Flying chariot" stays विमाने, as the EN has both words. Vālmīki also calls it a रथ, which Jaṭāyu breaks. |
| #9 · "The sages give you a healing herb." | …यच्छन्ति। → …**ददति**। | Ease: दा is L1, यम् is L3. The rest of the file uses दा for "give" (ददाति #206, ददातु #207, दास्यति #270). |
| #97 · "The trees and the river give no answer." | …उत्तरं न यच्छन्ति। → …उत्तरं न **ददति**। | Same as #9. |
| #28 · "They say even Maricha… warned Ravana: 'Rama is dharma…'" | जनाः वदन्ति – रामस्य पुरातनः शत्रुः मारीचः अपि रावणम् उक्तवान् – रामः … इति। → मारीचः रामस्य पुरातनः शत्रुः। सः अपि रावणम् उक्तवान् – रामः विग्रहवान् धर्मः, साधुः, सत्यपराक्रमः च इति। एवं जनाः वदन्ति। | Ease: the old line was one 16-word sentence with two nested dash-quotes, and the outer quote was never closed. Now it is three short sentences with one quote. The meaning is kept, including "even" (सः अपि) and "they say". The verse words are unchanged. |
| #138 · "The flowers Matanga's students wore never fade, they say." | मतङ्गस्य शिष्याः यानि पुष्पाणि धृतवन्तः, तानि कदा अपि न शुष्यन्ति इति जनाः वदन्ति। → मतङ्गस्य शिष्याः पुष्पाणि धृतवन्तः। तानि कदा अपि न शुष्यन्ति इति जनाः वदन्ति। | Ease: the यानि … तानि relative clause inside an इति clause becomes two short sentences, with one word fewer. |

Every changed word passes the oracle (`check.ts content/sa-dialogue-2.json`: 277/277, 0 problems; L3 tokens 151 → 149).

## Checked and found sound (no change)
- **Agreement:** every ktavatu and kta checked against its subject (गतवान्/गतवती/गतवन्तः, the dual पीडितवन्तौ, द्वे ओषधी लब्धे, वर्षाः आगताः, शरत् आगता, पक्षौ दग्धौ, and so on), every dual (युध्यावहे, करवाव, गच्छतः, तिष्ठतः, मित्रे भवतः, धनुषी स्तः) and every vocative (जटायो, शबरि, हनुमन्, भगवन्तः, आयुष्मन्, पितुः मित्र).
- **Pada:** युध्यस्व/युध्यताम्/युध्ये, विक्रीणे (वि+क्री ātm.), प्रतीक्षते, शोभन्ते, मन्ये, शेते, सेवितवती.
- **Case government:** बहिः + abl., अनन्तरम् + abl., उप+कृ + gen., वद् + dat. (#131), नी with two accusatives (#42), and the ablative of comparison with अधिकम्.
- **Register:** sages, Danu and Śabarī use भवान् to Rāma. Sītā uses आर्यपुत्र with the 3rd person, and Lakṣmaṇa uses भ्रातः with the 3rd person. Elders (Jaṭāyu, Jāmbavān, Sampāti) use त्वम्/वत्स. Hanumān uses भवन्तौ to the princes and मित्र/त्वम् to the student.
- **Player gender:** the only gendered address is #56 `{g:वत्स|वत्से}`. Other lines that address the player are gender-neutral (passives in #36 and #200, मित्र, 2nd-person verbs).
- **Form:** padaccheda (the only sandhi-looking token is the vocative जटायो), final ं only before consonants, every line ends in । ? or !, and there is no Latin.
- **Terms:** shrine मन्दिरम्, hermitage आश्रमः, verse card श्लोकस्य पत्रम्, word card शब्दस्य पत्रम्, verse book श्लोकानां पुस्तकम्, "Not quite" न सम्यक् (files 1 and 3 now match), the colophon एवं …काण्डं पूर्णम् (matches file 1), and the items फल/मूल/मधु/ओषधि/अङ्गुलीयक (match names.json).

## For a human teacher (uncertain, not clearly wrong; left as is)
1. **#183 vs Vālmīki.** The EN says Hanumān "kindles a fire between two stones", and the Sanskrit says द्वाभ्यां पाषाणाभ्याम् अग्निं रचयति ("with two stones"). Vālmīki 4.5.14 has him make the fire from two pieces of wood (काष्ठयोः … जनयामास पावकम्). The EN is the source line, so I did not change it. If the EN is corrected, use द्वाभ्यां काष्ठाभ्याम् (verified, L2).
2. **प्रायः for "almost"** (#215 प्रायः पूर्णः, #236 सः प्रायः गतः; files 1 and 3 use प्रायः समीचीनम्/सम्यक्). Classical usage is "mostly, nearly", but Sambhāṣaṇa learners often learn प्रायः as "probably". The fx-rev note raised the same issue. This needs a decision for all files.
3. **#7 `भवतः रक्षिष्यामि`** (acc. pl.). It is correct, but learners read भवतः as gen. sg. One option is भवतः सर्वान् रक्षिष्यामि (+1 word; it adds "all"). Still open from sa-rev-b.
4. **मा + loṭ** in #30, #31, #43, #75 and #235 (sa-rev-b list; still open). In #235, मा पश्यत stands in for "close your eyes", because निमीलय्/पिधा do not verify.
5. **एके = "some"** (#83, #237). केचित्/केचन/कतिपये still do not verify (re-checked).
6. **#45, #46 `सम्यक् पश्यतु`** for "go carefully". सावधान still does not verify (re-checked).
7. **Intercardinal paraphrases** (#208, #228, #231, #275): sa-rev-b list, still open.
8. **#89 `सः रामः इव उच्चैः क्रन्दति`** for "in Rama's own voice". स्वर does not verify. रामस्य वाचा (वाक्, L3) would be closer. I kept the current line because "like Rāma" carries the sense.
9. **#153 `मां प्रष्टुम् अत्र आदिष्टवान्`** for "sent me to ask". It is grammatical, because the tumun keeps it from being elliptical. kc-rev replaced a similar आदिष्टवान् in file 5 with सुग्रीवस्य वचनेन अहम् अत्र आगतवान्. Unify if a single "X sent me" pattern is wanted.
10. **Dropped content** in #118, #119 and #261 ("curse"), #260 (Garuḍa) and #235 (Svayamprabhā's name): listed by sa-rev-b, still unverifiable (गरुड re-checked: absent).
11. **#161** speaks only to the student, while the EN half addresses Rāma (sa-rev-b, still open).
12. **#219 `जम्बूः`** for the fruit (the tree name) and **#100 `पक्षाः`** for feathers (sa-rev-b list).
13. **#253 `कदाचित्`** for "perhaps". MW gives the sense, but the vocab pack glosses it only "sometimes, once". A teacher may prefer अपि नाम or a rephrase.
14. **#257 `पुनः प्रत्यागन्तुम्`** is slightly redundant (प्रति already means "back"). It is harmless, so I left it.

## Glossary / cross-file proposals for the orchestrator
- **"The verse of perfect speech"**: file 2 has शुद्धस्य वचनस्य श्लोकः four times (#208, #209, #227, #228). File 4 has the move origin as शुद्धायाः वाचः श्लोकं पूर्णं कुरु. I suggest file 4 use **शुद्धस्य वचनस्य श्लोकं पूर्णं कुरु।** (वचन is the more common word, and वाक् is the pada_bana move's name, so it could mislead).
- **Move names in dialogue** must match the names.json `sa` the battle menu shows (here व्याकरण, not शुद्धा वाक्). Other auditors should check any line that names a mantra.
- **Quotations:** close every direct quote with इति, including dash-quotes in narration. Files 1 and 3 may have dash-quotes without it.
- **प्रायः** (see human item 2): decide game-wide.
