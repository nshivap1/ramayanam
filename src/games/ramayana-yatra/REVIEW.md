# REVIEW: रामायणयात्रा content (Sanskrit sign-off)

Owner: content-v (agent). This file is the human sign-off sheet for every Sanskrit item that ships in this
game, following `docs/SANSKRIT_ACCURACY.md`. **Only a human Sanskrit reviewer may set `humanReviewed: true`
or change a status to "approved".** Agents never do. `content.test.ts` keeps the lists below in sync with
the code (single-source allowlist, sandhi-engine exceptions, omitted names) and fails if they drift apart.

What "engine checks" means here: `validateDeva` and NFC on every string; `checkAnustubh` per pāda
(✓ = pathyā, · = not pathyā, which then needs a `meterNote`); the sandhi engine (`joinSandhi`) rebuilds
each half-verse (pādas 1–2, 3–4) from its `words[]` as one sequence, so sandhi across the pāda break is applied and
compared with the concatenated half-line, spaces ignored (every word must be present, in order). By the project convention
a pāda break inside a sandhi is stored at the word boundary (त्वम् | अगमः), and the test flags mid-syllable cuts; every sandhi note's split is a run of consecutive
verse words that the engine joins back to the printed form (viccheda challenges); and every word's `role` agrees with
its stated case (vibhakti challenges). Predicative participles may carry role "verb". "Independent check" means content-v fetched the verse from a source the author
did not cite and compared it letter for letter. A match counts as the second confirmation.

## Sign-off table

| verse id | reference | sources (hosts) | engine checks | independent check | status |
|---|---|---|---|---|---|
| `s-tapah-svadhyaya` | Bāla 1.1.1 | valmikiramayan.net, sanskritdocuments.org | metre ·✓✓✓ (pāda 1 (LGGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL). Text not edited; checkAnustubh accepts only the pathyā form.); sandhi ✓ | match: ambuda.org (exact; also enjoylearningsanskrit.com 1.1.1 = same words, prints मुनिपुंगवम् with anusvāra (orthography only)) | awaiting human review |
| `s-ko-nvasmin` | Bāla 1.1.2 | valmikiramayan.net, sanskritdocuments.org | metre ✓✓✓✓; sandhi ✓ | match: enjoylearningsanskrit.com (exact; ambuda condensed text prints सांप्रतं (anusvāra, orthography only)) | awaiting human review |
| `s-samudra-iva` | Bāla 1.1.17 | valmikiramayan.net, sanskritdocuments.org | metre ✓✓✓✓; sandhi ✓ | match: enjoylearningsanskrit.com (exact text; that site numbers it 1.1.16 (critical-edition numbering), as the author's edition note says) | awaiting human review |
| `s-ma-nishada` | Bāla 1.2.15 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | match: ambuda.org (same words; that Southern print writes अगमश्शाश्वतीस्समाः (optional visarga→sibilant, orthography only). The author cites enjoylearningsanskrit (CE 1.2.14), which I also re-fetched: exact.) | awaiting human review |
| `s-kausalya-supraja` | Bāla 1.23.2 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | match: vedapath.app (vedapath prints सन्ध्या (class nasal) where we and both cited sources have संध्या, orthography only) | awaiting human review |
| `s-ramo-dvir` | Ayodhyā 2.18.30 | sanskritdocuments.org, valmikiramayan.net, wisdomlib.org | metre ✓✓✓✓; sandhi ✓ | match: ambuda.org (exact (also exact against cited wisdomlib, 16.19)) | awaiting human review |
| `s-pitari-shushrusha` | Ayodhyā 2.19.22 | sanskritdocuments.org, valmikiramayan.net, enjoylearningsanskrit.com, vedapath.app | metre ·✓✓✓ (pāda 1 (GLGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL). Text not edited; checkAnustubh accepts only the pathyā form.); sandhi ✓ | match: vishvasa.github.io (exact (Rāmāyaṇamuktāvalī, ref 19_22); also exact against cited enjoylearningsanskrit) | awaiting human review |
| `s-ramam-dasharatham` | Ayodhyā 2.40.9 | enjoylearningsanskrit.com, valmikiramayan.net, vedapath.app | metre ✓✓✓✓; sandhi ✓ | match: ambuda.org (exact; vedapath 2.40.9 has the same words with the misprint विध्दि for विद्धि) | awaiting human review |
| `s-ramo-vigrahavan` | Araṇya 3.37.13 | enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓✓✓; sandhi ✓ | **edition variant**: vedapath.app (two uncited witnesses (vedapath/IITK vulgate and the ambuda condensed print) read pāda 4 देवानां मघवानिव; we have देवानामिव वासवः, as in valmikiramayan.net 3-37-13 (re-fetched) and the CE 3.35.13. An edition variant, not a transcription error; human reviewer to choose.) | awaiting human review |
| `s-golden-deer` | Araṇya 3.43.10 | sanskritdocuments.org, valmikiramayan.net, de.wisdomlib.org | metre ✓✓✓✓; sandhi ✓ | match: de.wisdomlib.org (exact (CE 3.41.9; avagraha written रामो ऽसौ with a space, orthography only)) [the author has since added this host to the verse's own sources] | awaiting human review |
| `s-aranya-3` | Araṇya 3.67.15 | enjoylearningsanskrit.com, valmikiramayan.net, vedapath.app | metre ✓✓✓✓; sandhi ✓ | match: de.wisdomlib.org (exact (CE 3.63.14); also exact in the ambuda condensed print) | awaiting human review |
| `s-nanrgveda` | Kiṣkindhā 4.3.28 | valmikiramayan.net, prapatti.com, vedapath.app, sanskritdocuments.org | metre ✓✓·✓ (pāda 3 (GGLGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL). Text not edited; checkAnustubh accepts only the pathyā form.); sandhi ✓ | no uncited witness: vedapath.app (no uncited witness found (verse not in the critical edition, so CE-based sites lack it). Re-fetched cited vedapath: same words, with the source's own misprint नायजुर्वेद्धारिणः and विदुषश्शक्यम्, both documented by the author. Three cited hosts already agree.) | awaiting human review |
| `s-vyakaranam` | Kiṣkindhā 4.3.29 | valmikiramayan.net, prapatti.com, vedapath.app, sanskritdocuments.org | metre ✓✓✓✓; sandhi ✓ | no uncited witness: valmikiramayan.net (no uncited witness found (not in the critical edition). Re-fetched cited valmikiramayan.net: same words word-split, with the source's misprint व्यकरणम् and किंचित् (anusvāra), both documented by the author.) | awaiting human review |
| `s-naham-janami` | Kiṣkindhā 4.6.22 | valmikiramayan.net, prapatti.com, sanskritdocuments.org | metre ✓✓✓✓; sandhi ✓ | match: vedapath.app (exact; vedapath also splits the couplet across 4.6.22cd/23ab, as the author's note says) | awaiting human review |
| `s-anirvedah` | Sundara 5.12.10 | sanskritdocuments.org, vedapath.app, kasarabada.org, prapatti.com | metre ✓✓·✓ (pāda 3 (LGGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL). Text not edited; checkAnustubh accepts only the pathyā form.); sandhi ✓ | match: vishvasa.github.io (exact (Rāmāyaṇamuktāvalī, ref 12_10). The CE 5.10.10 has a different second half (भूयस्तावद्विचेष्यामि …); ours is the vulgate, as cited.) | awaiting human review |
| `s-kalyani-bata` | Sundara 5.34.6 | prapatti.com, valmikiramayan.net, sanskritdocuments.org, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | **edition variant**: vishvasa.github.io (pāda 2 ends मां in the Rāmāyaṇamuktāvalī (ref 34_6). Ours has मा (prapatti.com); valmikiramayan.net's verse line has मे. A three-way reading that content-b already flagged for review.) | awaiting human review |
| `s-jayatyatibalo` | Sundara 5.42.33 | sanskritdocuments.org, prapatti.com | metre ✓✓✓✓; sandhi ✓ | match: wisdomlib.org (exact) | awaiting human review |
| `s-dasoham` | Sundara 5.42.34 | sanskritdocuments.org, vedapath.app, prapatti.com | metre ✓✓✓✓; sandhi: exception | match: enjoylearningsanskrit.com (same words (CE 5.41.7); the CE writes दासो ऽहं and हनुमाञ् शत्रु- (ścutva applied), orthography only) | awaiting human review |
| `s-sakrdeva` | Yuddha 6.18.33 | valmikiramayan.net, vedapath.app, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | match: de.wisdomlib.org (exact (CE 6.12.20)) | awaiting human review |
| `s-aditya-hrdayam` | Yuddha 6.105.4 | valmikiramayan.net, vedapath.app, hindunet.com, sanskritdocuments.org | metre ✓✓✓✓; sandhi ✓ | match: greenmesg.org (exact (stotra v.4); also exact on shlokam.org) | awaiting human review |
| `s-maranantani` | Yuddha 6.109.25 | valmikiramayan.net, vedapath.app | metre ✓✓✓✓; sandhi ✓ | match: wisdomlib.org (exact (CE 99.39): also reads निर्वृत्तं and नः, as content-b chose) | awaiting human review |

## Discrepancies found by independent verification

| verse | field | we have | source has | URL | note |
|---|---|---|---|---|---|
| s-ramo-vigrahavan | padas[3] | देवानामिव वासवः | देवानां मघवानिव | https://vedapath.app/en/ramayana/aranya-kanda/37/3.37.13 ; https://ambuda.org/proofing/ramayana-condensed-in-the-poet-s-own-words/download/text | Edition variant (same meaning: 'like Indra among the gods'). Ours agrees with valmikiramayan.net and the CE. Keep it; the reviewer decides. |
| s-kalyani-bata | padas[1] | लौकिकी प्रतिभाति मा | … प्रतिभाति मां | https://vishvasa.github.io/kAvyam/laxyam/padyam/subhAShitam/rAmAyaNamuktAvaliH | Third witness for a reading content-b already flagged (मा prapatti / मे valmikiramayan.net line / मां Rāmāyaṇamuktāvalī). Human reviewer to decide against Gita Press print. |
| s-nanrgveda | padas[1] | नायजुर्वेदधारिणः | नायजुर्वेद्धारिणः (vedapath misprint) | https://vedapath.app/en/ramayana/kishkindha-kanda/3/4.3.28 | Source misprint, already documented by content-b. No action. |
| s-vyakaranam | padas[0] | नूनं व्याकरणं | नूनम् व्यकरणम् (valmikiramayan.net misprint) | https://www.valmikiramayan.net/utf8/kish/sarga3/kishkindhasans3.htm | Source misprint, already documented by content-b. No action. |
| s-ramam-dasharatham | padas[2] | विद्धि | विध्दि (vedapath misprint) | https://vedapath.app/ta/ramayana/ayodhya-kanda/40/9 | Source misprint. No action. |
| s-dasoham | padas[2] | हनुमान् शत्रुसैन्यानां | हनुमाञ् शत्रुसैन्यानां (CE) | https://enjoylearningsanskrit.com/scriptures/ramayana/book-5/chapter-41/verse-7 | Sandhi spelling only; listed as a sandhi-engine exception. |

## Human-review list (readings and analyses flagged by the authors and the verifier)

A human Sanskrit reviewer with the Gita Press print should settle these before anyone sets `humanReviewed`.

- **s-kalyani-bata**: pāda 2 final word: मा (stored; prapatti.com and the valmikiramayan.net word list) vs मे (valmikiramayan.net verse line, the brief, and the CE pages on enjoylearningsanskrit.com 5.32.6 / 6.114.2) vs मां (Rāmāyaṇamuktāvalī, found by content-v). Decide against the Gita Press print. (content-b + content-v) Until then the word is flagged `variant` in the content and is never a pūraṇa gap (QA 11 Nov: मे was being offered, and judged wrong, against मा).
- **s-maranantani**: pāda 2: निर्वृत्तं (stored; valmikiramayan.net, IITK and the wisdomlib CE text) vs निवृत्तं (the brief); नः 'our' (stored; valmikiramayan.net and the wisdomlib CE text) vs वः 'your' (IITK). Numbering: 6.109.25 (valmikiramayan.net) / 6.112.25 (IITK) / 6.112.26 (brief) / CE 6.99.39. (content-b + content-v)
- **s-ramo-vigrahavan**: pāda 4: देवानामिव वासवः (stored; valmikiramayan.net and the CE) vs देवानां मघवानिव (vedapath/IITK and the ambuda condensed print). Same meaning, different epithet of Indra. (content-a + content-v)
- **s-kausalya-supraja**: संध्या with anusvāra as printed in both sources (the brief had सन्ध्या, the same word in class-nasal spelling; vedapath prints सन्ध्या). The analysis of सुप्रजा (nom. sg. f. of सुप्रज agreeing with कौसल्या, vs कौसल्यासुप्रजा as a vocative epithet of Rāma) needs a human. (content-a)
- **s-ma-nishada**: pādas stored at the word boundary per the project convention (त्वम् | अगमः, एकम् | अवधीः); the print joins त्वमगमः. मा + augmented aorist अगमः is an epic irregularity (classical मा गमः). (content-a)
- **s-aranya-3**: pāda break inside the ṅamuṭ junction आयुष्मन्नन्वेषसि; प्राणा = प्राणाः with the visarga dropped (epic usage). (content-a)
- **s-sakrdeva**: numbering: brief/customary 6.18.33; valmikiramayan.net 6-18-33cd + 34ab; IITK 6.18.32; CE 6.12.20. याचते read as the dative of the participle याचत्. (content-b)
- **s-naham-janami**: the couplet straddles vulgate 4.6.22cd + 4.6.23ab; the narrative frame lines are omitted. (content-b; vedapath confirms the division)
- **s-anirvedah**: the second half (अनिर्वेदो हि सततं …) follows the Gita Press / IITK division; prapatti.com and the CE put a different line here. (content-b; confirmed by content-v)
- **s-dasoham**: हनुमान् (stored; valmikiramayan.net, IITK) vs हनूमान् (prapatti.com); हनुमान् शत्रु- printed without ścutva (sandhi-engine exception). (content-b)
- **s-aditya-hrdayam**: a vulgate passage that is not in the CE constituted text; अक्षय्यं (stored) vs अक्षयं (one stotra file). (content-b)
- **s-nanrgveda, s-vyakaranam**: vulgate only (not in the CE), so no uncited online witness exists. Sources' misprints are documented (vedapath वेद्धारिणः; valmikiramayan.net व्यकरणम्). (content-b + content-v)
- **names.json**: the move names differ from DESIGN §13 (आग्नेय / वारुण / वायव्य for the three astras; मूल for kanda_mula); 154 headwords are asserted, not fetched (list above); `person.rishika` and `person.villager_f` are omitted. (content-v)

### Numbering notes (every verse; from its `edition` field)

- `s-tapah-svadhyaya` (1.1.1): Vulgate (Gita Press-based) numbering as on valmikiramayan.net; same number (1.1.1) in the Baroda critical edition
- `s-ko-nvasmin` (1.1.2): Vulgate (Gita Press-based) numbering as on valmikiramayan.net; same number (1.1.2) in the Baroda critical edition
- `s-samudra-iva` (1.1.17): Vulgate (Gita Press-based) numbering as on valmikiramayan.net; this verse is 1.1.16 in the Baroda critical edition (the vulgate verse 1.1.16 is not in the critical text)
- `s-ma-nishada` (1.2.15): Vulgate (Gita Press-based) numbering as on valmikiramayan.net; this verse is 1.2.14 in the Baroda critical edition
- `s-kausalya-supraja` (1.23.2): Vulgate (Gita Press-based) numbering as on valmikiramayan.net; this verse is 1.22.2 in the Baroda critical edition
- `s-ramo-dvir` (2.18.30): Vulgate (Gita Press-based) numbering 2.18.30 as on valmikiramayan.net; pāda text as printed in the critical-edition e-text, where the verse is 2.16.19
- `s-pitari-shushrusha` (2.19.22): Vulgate (Gita Press-based) numbering 2.19.22 as on valmikiramayan.net; pāda text as printed in the critical-edition e-text, where the verse is 2.16.48
- `s-ramam-dasharatham` (2.40.9): Vulgate (Gita Press-based) numbering 2.40.9 as on valmikiramayan.net; pāda text as printed in the critical-edition text, where the verse is 2.35.8
- `s-ramo-vigrahavan` (3.37.13): Vulgate (Gita Press-based) numbering 3.37.13 as on valmikiramayan.net; pāda text as printed in the critical-edition text, where the verse is 3.35.13
- `s-golden-deer` (3.43.10): Vulgate (Gita Press-based) numbering 3.43.10 as on valmikiramayan.net; pāda text as printed in the critical-edition e-text, where the verse is 3.41.9
- `s-aranya-3` (3.67.15): Vulgate (Gita Press-based) numbering 3.67.15 as on valmikiramayan.net; pāda text as printed in the critical-edition text, where the verse is 3.63.14
- `s-nanrgveda` (4.3.28): Vulgate (Gita Press-based) numbering as on valmikiramayan.net and prapatti.com (4.3.28); not in the constituted text of the Baroda critical edition (its Kiṣkindhā sarga 3 has 25 verses)
- `s-vyakaranam` (4.3.29): Vulgate (Gita Press-based) numbering as on valmikiramayan.net and prapatti.com (4.3.29); not in the constituted text of the Baroda critical edition
- `s-naham-janami` (4.6.22): Vulgate numbering as on valmikiramayan.net and prapatti.com: pādas 1–2 are 4.6.22cd and pādas 3–4 are 4.6.23ab (the well-known couplet straddles two numbered verses); not in the constituted text of the Baroda critical edition
- `s-anirvedah` (5.12.10): Vulgate (Gita Press-based) numbering as on valmikiramayan.net and the IIT Kanpur text (5.12.10); prapatti.com divides the passage differently (see notes); in the Baroda critical edition the passage is in Sundara sarga 10 (5.10.10–11)
- `s-kalyani-bata` (5.34.6): Vulgate numbering as on valmikiramayan.net and prapatti.com (5.34.6)
- `s-jayatyatibalo` (5.42.33): Vulgate numbering as on valmikiramayan.net and prapatti.com (5.42.33)
- `s-dasoham` (5.42.34): Vulgate numbering as on valmikiramayan.net, prapatti.com and the IIT Kanpur text (5.42.34)
- `s-sakrdeva` (6.18.33): Vulgate: valmikiramayan.net numbers the hemistichs so that this couplet is 6-18-33cd + 6-18-34ab; the IIT Kanpur text (vedapath.app) prints it whole as 6.18.32; the game keeps the customary reference 6.18.33. Baroda critical edition 6.12.20
- `s-aditya-hrdayam` (6.105.4): Vulgate (Gita Press-based) numbering as on valmikiramayan.net (6.105.4); the IIT Kanpur text and the southern recension number the hymn's sarga 107 (6.107.4). The Baroda critical edition does not include the hymn in its constituted text
- `s-maranantani` (6.109.25): Vulgate (Gita Press-based) numbering as on valmikiramayan.net (6.109.25); the IIT Kanpur text numbers it 6.112.25

## Single-source items

Verses whose text rests on one source and has no independent match yet. They ship only as release candidates.

_None._

## Sandhi-engine exceptions

Verses whose pādas the engine cannot rebuild exactly from their words. The text is NOT changed. The reason says why.

- `s-dasoham`: pāda 3: the cited editions write हनुमान् शत्रुसैन्यानां with न् unassimilated before श्. The engine applies ścutva (8.4.40: न् → ञ् before श्; optional छ् by 8.4.63) and gives हनुमाञ्शत्रु-/हनुमाञ्छत्रु-. The CE prints हनुमाञ् शत्रु-. The text is kept as printed.

## Omitted names

Name ids left out of `content/names.json` because no attested word was confirmed. The game shows English for them.

- `person.rishika`: MW glosses ऋषिका as "the wife of an inferior Ṛṣi" (Apte: "a female author composing the Ṛks"), not "female sage". Show "Sage" in English or reuse person.rishi. Checked online: https://www.wisdomlib.org/definition/rishika
- `person.villager_f`: MW's feminine forms of ग्रामीण (ग्रामीणा/ग्रामिणी) mean the indigo plant, so they're unusable. Show "Villager" in English. Checked online: https://www.wisdomlib.org/definition/gramina

## Names (content/names.json)

183 entries. All pass `validateDeva` and NFC, with no Latin. Every entry cites Monier-Williams (Cologne) and/or the Rāmāyaṇa
passage where the word occurs. Each entry's `provenance.notes` says which source was **read online this session** and which
was **asserted from reference knowledge**. Shell access had no network; lookups went through a web tool, so not every
headword was fetched.

**Read online this session (29):**
- `place.siddhashrama_road` सिद्धाश्रम: s.v. सिद्धाश्रम: "m. 'hermitage of the Blest', N. of a hermitage", cites R.
- `place.siddhashrama` सिद्धाश्रम: s.v. सिद्धाश्रम: "m. 'hermitage of the Blest', N. of a hermitage", cites R.
- `place.khara_camp` जनस्थान: s.v. जन-स्थान: "n. 'resort of men', N. of part of the Daṇḍaka forest in Deccan, MBh.; R.; Ragh."
- `place.rishyamuka` ऋश्यमूक: Apte, Practical Sanskrit-English Dictionary, s.v. ऋश्य (compound -मूकः "N. of a mountain"), with MW s.v. ऋश्य ("or (in later texts) ऋष्य")
- `place.ashoka_vatika` अशोकवनिका: s.v. अ-शोक-वनिका (p. 114): "f. a grove of Aśoka trees, R."
- `place.suvela_camp` सुवेल: s.v. सु-वेल: "m. N. of a mountain (= त्रि-कूट or चित्र-कूट), Mṛcch."
- `person.player_a` शिष्य: s.v. शिष्य: "m. a pupil, scholar, disciple (f(ā). a female pupil)"
- `person.player_b` शिष्या: s.v. शिष्य: "m. a pupil, scholar, disciple (f(ā). a female pupil)"
- `person.villager_m` ग्रामीण: s.v. ग्रामीण: "m. a villager, peasant" (the MW feminine forms mean the indigo plant, so no feminine is used)
- `ally.player` शिष्य: s.v. शिष्य: "m. a pupil, scholar, disciple (f(ā). a female pupil)"
- `enemy.nishachara` निशाचर: s.v. निशा-चर: "night-walking, R."; "m. a fiend or Rākṣasa, MBh.; Kāv."
- `enemy.yatudhana` यातुधान: s.v. यातु-धान: "= yātu, a kind of evil spirit or demon" (f. ई), RV. etc.
- `enemy.maya_mriga` मायामृग: त्वां तु मायामृगं दृष्ट्वा काञ्चनं जातविस्मया
- `enemy.simhika` सिंहिका: s.v. सिंहिका: "N. of the mother of Rāhu … of a Rākṣasī, R."
- `enemy.dhumraksha` धूम्राक्ष: s.v. धूम्राक्ष: "m. N. of a Rakṣas, MBh.; R."
- `move.suprabhata` सुप्रभात: s.v. सु-प्रभात: "n. a beautiful dawn or day break"; mf(ā)n. "beautifully illuminated by dawn, R."
- `move.agneyastra` आग्नेय: Bāla 1.27.10: आग्नेयमस्त्रं दयितं शिखरं नाम नामतः
- `move.varunastra` वारुण: Bāla 1.27.8–9: वारुणं पाशमस्त्रं च ददाम्यहमनुत्तमम्; s.v. वारुण: "in MBh. & R. also said of partic. weapons"
- `move.vayavyastra` वायव्य: Bāla 1.27.10–11: वायव्यं प्रथमं नाम ददामि तव चानघ
- `move.aditya_hrdaya` आदित्यहृदय: s.v. आदित्य-हृदय: "n. N. of a Stotra"
- `move.brahmastra` ब्रह्मास्त्र: s.v. ब्रह्मास्त्र: "Brahmā's missile, N. of a mythical weapon … MBh. R."; Monier-Williams, Sanskrit-English Dictionary (1899), Cologne Digital Sanskrit Dictionaries (scan p. 740, col. 3)
- `move.mantrana` मन्त्रण: s.v. मन्त्रण: "n. consultation, deliberation, MBh.; R."
- `move.garjana` गर्जन: s.v. गर्जन: "n. crying, roaring, rumbling (of clouds), growl, R.; Hit."
- `move.naga_pasha` नागपाश: s.v. नाग-पाश (MW 1872 and Apte; the MW 1899 compound was not shown on the page): "a sort of magical noose or lasso used in battle"
- `move.chandrahasa` चन्द्रहास: s.v. चन्द्र-हास: "a glittering scimitar … Rāvaṇa's sword, R. vii, 16, 43"
- `item.sanjivani` मृतसञ्जीवनी: मृतसंजीवनीं चैव विशल्यकरणीमपि (first of the four herbs Jāmbavān names); s.v. मृत-संजीवनी (p. 827): "f. revival of a dead person"
- `item.chudamani` चूडामणि: s.v. चूडा-मणि: "m. a jewel worn by men and women on the top of the head, MBh.; R."
- `element.none` सामान्य: s.v. सामान्य: "mf(ā)n. equal, alike, similar"; later senses "common, general, ordinary"
- `role.verb` क्रियापद: s.v. क्रिया-पद: "n. 'action-word', a verb"

**Asserted, not fetched (154), for a human spot-check against MW.** These are mostly very common words
(राम, अग्नि, जल, वन …) and proper names that occur in the cited Rāmāyaṇa passages:
`kanda.1` बालकाण्डम् · `kanda.2` अयोध्याकाण्डम् · `kanda.3` अरण्यकाण्डम् · `kanda.4` किष्किन्धाकाण्डम् · `kanda.5` सुन्दरकाण्डम् · `kanda.6` युद्धकाण्डम् · `place.tamasa_ashrama` तमसा · `place.valmiki_hut` आश्रम · `place.tamasa_bank` तमसा · `place.tataka_vana` वन · `place.ayodhya_city` अयोध्या · `place.ayodhya_palace` अयोध्या · `place.vasishtha_shala` अयोध्या · `place.shringaverapura` शृङ्गवेरपुर · `place.chitrakuta` चित्रकूट · `place.dandaka_vana` दण्डकारण्य · `place.panchavati` पञ्चवटी · `place.mriga_vana` वन · `place.jatayu_glade` दण्डकारण्य · `place.shabari_ashrama` पम्पा · `place.kishkindha_caves` किष्किन्धा · `place.vindhya_search` विन्ध्य · `place.mahendra_hill` महेन्द्र · `place.ocean_leap` समुद्र · `place.lanka_gate` लङ्का · `place.lanka_city` लङ्का · `place.setu_shore` समुद्र · `place.setu` सेतु · `place.lanka_battlefield` लङ्का · `place.lanka_palace` लङ्का · `place.ayodhya_return` अयोध्या · `person.valmiki` वाल्मीकि · `person.bharadvaja` भरद्वाज · `person.narada` नारद · `person.vishvamitra` विश्वामित्र · `person.rama` राम · `person.lakshmana` लक्ष्मण · `person.sita` सीता · `person.dasharatha` दशरथ · `person.kaikeyi` कैकेयी · `person.kausalya` कौसल्या · `person.sumitra` सुमित्रा · `person.bharata` भरत · `person.vasishtha` वसिष्ठ · `person.guha` गुह · `person.sumantra` सुमन्त्र · `person.shabari` शबरी · `person.jatayu` जटायु · `person.agastya` अगस्त्य · `person.hanuman` हनुमान् · `person.sugriva` सुग्रीव · `person.jambavan` जाम्बवान् · `person.angada` अङ्गद · `person.vibhishana` विभीषण · `person.ravana` रावण · `person.kumbhakarna` कुम्भकर्ण · `person.indrajit` इन्द्रजित् · `person.lanka_devi` लङ्का · `person.surasa` सुरसा · `person.rishi` ऋषि · `person.merchant` वणिज् · `person.guard` द्वारपाल · `person.pandita` पण्डित · `person.hunter` निषाद · `person.vanara` वानर · `person.rakshasa` राक्षस · `person.rakshasi` राक्षसी · `person.krauncha` क्रौञ्च · `person.golden_deer` मृग · `person.child` बाल · `ally.rama` राम · `ally.lakshmana` लक्ष्मण · `ally.hanuman` हनुमान् · `ally.sugriva` सुग्रीव · `ally.jambavan` जाम्बवान् · `ally.vibhishana` विभीषण · `enemy.rakshasi` राक्षसी · `enemy.vrka` वृक · `enemy.surasa_duel` सुरसा · `enemy.tataka` ताटका · `enemy.subahu` सुबाहु · `enemy.maricha` मारीच · `enemy.khara` खर · `enemy.dushana` दूषण · `enemy.kabandha` कबन्ध · `enemy.lanka_devi` लङ्का · `enemy.aksha` अक्ष · `enemy.kumbhakarna` कुम्भकर्ण · `enemy.indrajit` इन्द्रजित् · `enemy.ravana` रावण · `enemy.bharadvaja_duel` भरद्वाज · `enemy.pandita_duel` पण्डित · `enemy.hanuman_duel` हनुमान् · `move.pada_bana` वाक् · `move.lipi_raksha` रक्षा · `move.shoka_shloka` श्लोक · `move.shuddha_vak` व्याकरण · `move.bana` बाण · `move.dharma_vigraha` धर्म · `move.abhaya` अभय · `move.khadga` खड्ग · `move.viddhi` विद्धि · `move.agni_bana` अग्नि · `move.vayu_vega` वेग · `move.gada` गदा · `move.jaya_ghosha` जय · `move.anirveda` अनिर्वेद · `move.shaila` शैल · `move.vriksha` वृक्ष · `move.prajna` प्रज्ञा · `move.jala_dhara` जल · `move.nakha` नख · `move.maya_jala` माया · `move.shula` शूल · `move.andhakara` अन्धकार · `move.parigha` परिघ · `move.agni_varsha` अग्नि · `move.tarka` तर्क · `move.prashna` प्रश्न · `item.phala` फल · `item.kanda_mula` मूल · `item.madhu` मधु · `item.oshadhi` ओषधि · `item.kusha_mudrika` अङ्गुलीयक · `element.agni` अग्नि · `element.jala` जल · `element.vayu` वायु · `element.bhumi` भूमि · `element.divya` दिव्य · `element.maya` माया · `kind.artha` अर्थ · `kind.lipi` लिपि · `kind.purana` पूरण · `kind.krama` क्रम · `kind.viccheda` विच्छेद · `kind.vibhakti` विभक्ति · `tier.unseen` अदृष्ट · `tier.seen` दृष्ट · `tier.known` ज्ञात · `tier.mastered` सिद्ध · `role.subject` प्रथमा · `role.object` द्वितीया · `role.instrument` तृतीया · `role.recipient` चतुर्थी · `role.source` पञ्चमी · `role.possessor` षष्ठी · `role.location` सप्तमी · `role.address` सम्बोधन · `role.indeclinable` अव्यय · `role.modifier` विशेषण · `ui.words` पदानि · `ui.verses` श्लोकाः · `ui.ashrama` आश्रम · `ui.niska` निष्क

Display convention: MW headword stems (राम, शैल, सिद्धाश्रम). The exceptions are -mat/-vat stems in the nominative (हनुमान्, जाम्बवान्),
वाक् (stem वाच्), the kāṇḍa titles in the nominative (बालकाण्डम् …) and the UI plurals पदानि and श्लोकाः. Words that differ from DESIGN §13:
`move.agneyastra`/`varunastra`/`vayavyastra` use the adjectives आग्नेय/वारुण/वायव्य that Bāla 1.27 uses (the compounds were not
confirmed in MW), and `item.kanda_mula` uses मूल.

## Lexicon observations (not failures)

- The same word appears under two ids: `aham` (lexicon-1, lemma अहम्) and `asmad` (lexicon-2, lemma अस्मद्) are the same first-person
  pronoun; `kimcit` (lexicon-1, pronoun) and `kincit` (lexicon-2, pronoun; earlier indeclinable) share the lemma किञ्चित्. The word
  pool counts each twice. The authors should merge them, or challenges must never use one as a distractor for the other.
- `content.test.ts` prints a distractor-safety report: pairs of entries whose English meanings share content words (e.g. para/parama
  "highest, supreme"). The battle agent's distractor picker should avoid pairing them.

## QA 11 Nov (v0.1.1): fixes and open questions (needs human Sanskrit review)

QA findings QA-ramayana-yatra-01 … 08 (deep QA pass, 11 Nov 2026). No verse text, word form or gloss was changed. Each item
below needs a human Sanskrit reviewer; nothing here is human-reviewed.

- **S1-01 participles in vibhakti** (4.3.29 श्रुतम्, अपशब्दितम्; 6.109.25 निर्वृत्तम्; all keyed role "verb", grammar "… participle …, nom. sg. n."): "Nominative" was marked wrong and the feedback called them verbs "with person, number and tense". Now a word keyed "verb" whose grammar is a participle with a case is accepted under that case as well as "Verb"; the case's syncretic roles are never distractors; the feedback explains it as a participle (verbal adjective with case, number and gender, no person ending). Reviewer: confirm accepting both, or re-key these words as "modifier".
- **S1-02 anusvāra vs class nasal**: किंचित् (s-pitari-shushrusha, as printed) and किञ्चित् (s-vyakaranam, as printed) were offered against each other in pūraṇa and lipi. Options are now compared with the platform `spellingKey`, so spelling-equivalent forms are never two options. The two verse spellings stay as printed; the lexicon still holds both forms under `kincit` (see "Lexicon observations").
- **S2-03 edition variants never used as distractors / gaps**: the word that differs between witnesses carries an English `variant` note in the content and is never the gap of a pūraṇa challenge: s-kalyani-bata मा (मे / मां; मे is in the form pool and was offered as wrong); s-maranantani निर्वृत्तम् (निवृत्तं) and नः (वः); s-ramo-vigrahavan वासवः (देवानां मघवानिव). For 6.109.25 and 3.37.13 the other readings are not in the content, so they were never offered; the flag is a safeguard. Lipi (match the IAST to the Devanagari spelling) is unaffected: e.g. "mā" is never spelled मे, whatever the edition. Reviewer: choose the readings; then remove the flags or add the readings as accepted alternatives.
- **S3 adverbs in -am**: नित्यम्, सततम्, नूनम्, साम्प्रतम्, एवम्, यथासुखम् are keyed "Indeclinable", while बहु (4.3.29, "acc. sg. n., object of vyāharatā") is keyed "Accusative". The keys are unchanged; "Accusative" is simply never a wrong option for an indeclinable ending in -m (adverbial accusative). Reviewer: decide whether the content should key adverbial -am words as accusative.
- **S3 इदम् "this"** was offered "that; he, she, it" (तद्) as a wrong meaning, although the game's own glosses render इदम् forms "by him", "his". Demonstratives are no longer offered as wrong meanings of each other when one gloss includes "he, she, it". Reviewer: consider glossing इदम् "this; he, she, it".
- **S3 title epigraph**: it showed the learner split (त्वम् अगमः, एकम् अवधीः). It now shows each half-verse with the pāda-break junction written together as printed (त्वमगमः, …क्रौञ्चमिथुनादेकमवधीः); no letter changes (tested in SLP1). The verse card keeps the four-pāda learner layout.
- **S3 3.67.15 line break (not changed)**: s-aranya-3 pāda 1 is stored and shown as …आयुष्मन्न् with pāda 2 अन्वेषसि (the ṅamuṭ doubling kept at the end of pāda 1, the documented convention above). QA suggests showing this half-verse unbroken, as prints do. A display-convention decision for the reviewer; the text was not edited.
- **QA note on s-aranya-3 (S4)**: the human-review list above calls प्राणा "visarga dropped (epic usage)"; QA points out that -āḥ before a voiced sound losing its visarga is regular sandhi (8.3.17, 8.3.22), as the in-game sandhi note says. Left for the reviewer to reword.
- **S3 320 px layout**: the B button covered the verse-book button; below 360 px Menu and the verse book now sit in their own row above the D-pad.

## Human reviewer checklist

- [ ] Every verse row above compared with a printed edition (Gita Press) by a human
- [ ] Every name in names.json confirmed against MW by a human
- [ ] Glosses and translations read by a human
- [ ] Only then set `humanReviewed: true` (human reviewer only)


## Sambhāṣaṇa dialogue mode (v0.2.0): model-written, machine-verified, awaiting human review

The optional story-text setting (English · संस्कृतम् + English · संस्कृतम्) shows 919 story strings (say lines, choices, objectives, signs, battle intros, enemy lines) in simple spoken Sanskrit for learners up to Level 3. Files: `content/sa-dialogue-1.json` (opening, Bāla, Ayodhyā), `-2.json` (Araṇya, Kiṣkindhā), `-3.json` (Sundara, Yuddha, enemy lines). Battle narration templates: `content/sa-battle.json`.

**What is guaranteed by machine (`sambhashana.test.ts`, `sa-verify.ts`).** Every word is a verified form from:
- the platform packs: `@content/shabda` cells; `@content/vocab` words declined on their linked paradigm; `@content/dhatu` finite forms of level ≤ 3 roots, kṛdantas declined on models, lyap, and prefixed verbs under the sandhi-free join rule; `@content/sentences` words;
- the game's verse lexicon;
- names declined on models;
- `cardinal` numbers.

The text uses padaccheda (no sandhi between words), Devanagari only, and ends sentences with । ? !. Coverage of every story string is enforced. `{g:masculine|feminine}` marks words that address or describe the student (वत्स / वत्से): both variants are verified, and the view picks one by the chosen avatar.

**What is NOT guaranteed (needs a human Sanskrit teacher).** Agreement, case government, word choice, meaning and naturalness.
- Two independent model reviewers checked every line: `notes/sa-rev-a.md` (file 1: 57 lines changed) and `notes/sa-rev-b.md` (files 2–3: 113 lines changed).
- Their remaining questions are listed at the end of those notes.
- Translator notes are in the agent reports summarised in `notes/sambhashana.md`.

**Conventions to confirm:**
- मा + loṭ for prohibitions is kept in a few lines (modern spoken usage; classical grammar wants मा + augmentless luṅ).
- The ktavatu past (गतवान्/गतवती).
- भवान् + 3rd-person verbs for polite address.
- Shrine = मन्दिरम्; word book = शब्दानां पुस्तकम्; verse book = श्लोकानां पुस्तकम्; verse card = श्लोकस्य पत्रम्; book endings "एवं …काण्डं पूर्णम्"; "न सम्यक्" for "Not quite".
- Names and things absent from the packs are paraphrased or dropped (e.g. Śūrpaṇakhā → रावणस्य भगिनी; Indra → देवानां राजा; the Sarayū, Vāmana, Mithilā, Kubera, curses).

**Extra declension models (28 stems).** Each declines exactly like the named SHABDA paradigm (ending class, gender and ṇatva checked by the test). Every one is a review item:

| stem | gender | declines like | English | source |
|---|---|---|---|---|
| अस्त्र | n | `mitra-n` | missile weapon (divine weapon) | MW astra n. |
| इक्ष्वाकु | m | `guru-m` | Ikṣvāku (founder of the solar dynasty; pl. his descendants) | MW ikzvAku m. |
| इन्द्रजित् | m | `marut-m` | Indrajit (name) | MW indrajit m. 'conqueror of Indra', N. of a son of Rāvaṇa; consonant -t stem declined like marut (indrajitam, indrajitā) |
| ओषधि | f | `mati-f` | healing herb | MW oShadhi f. (herb, medicinal plant); i-stem like मति |
| गङ्गा | f | `lata-f` | the Gaṅgā river | MW gaNgA f. |
| गोदावरी | f | `nari-f` | the river Godāvarī | MW godAvarI f. (N. of a river); ī-stem with ṇatva like नारी |
| तीर | n | `mitra-n` | bank, shore (of a river) | MW tIra n. |
| त्रिजटा | f | `lata-f` | Trijaṭā (name of a rākṣasī) | MW trijaTA f. 'N. of a Rākṣasī (friendly to Sītā)' (R. v) |
| नल | m | `deva-m` | Nala (name of the vānara who built the bridge) | MW nala m. 'N. of a monkey-chief (son of Viśvakarman, who built Rāma's bridge)' |
| पुष्पक | n | `pushpa-n` | Puṣpaka, the flying chariot | MW puSpaka n. 'N. of the self-moving aerial car of Kubera (carried off by Rāvaṇa)'; ṇatva after ṣ as in puṣpa: puṣpakeṇa |
| प्रहस्त | m | `deva-m` | Prahasta (name of Rāvaṇa's chief general) | MW prahasta m. 'N. of a Rākṣasa (general of Rāvaṇa)'; dental s blocks ṇatva (prahastena) |
| बाण | m | `deva-m` | arrow | MW bARa m. |
| मतङ्ग | m | `deva-m` | the sage Mataṅga | MW mataMga m. (N. of a sage); no ṇatva, like देव |
| मन्त्र | m | `rama-m` | mantra, sacred formula | MW mantra m. |
| मन्दाकिनी | f | `nadi-f` | the Mandākinī river (at Citrakūṭa) | MW mandAkinI f. |
| मैनाक | m | `deva-m` | Maināka (name of a mountain in the ocean) | MW mainAka m. 'N. of a mountain (son of Himavat and Menā)'; R. v (rises from the ocean to offer Hanumān rest) |
| यज्ञ | m | `deva-m` | sacrifice, fire-ritual | MW yajYa m. |
| योजन | n | `vana-n` | yojana (a measure of distance) | MW yojana n. (a measure of distance); no ṇatva, like वन |
| वाद | m | `deva-m` | debate, discussion | MW vAda m. |
| वालिन् | m | `gunin-m` | Vālin (Vāli), brother of Sugrīva | MW vAlin m. (N. of a monkey-king); in-stem like गुणिन् |
| विष्णु | m | `sadhu-m` | Viṣṇu | MW vizRu m. |
| वीणा | f | `lata-f` | vīṇā, lute | MW vIRA f. |
| वेद | m | `deva-m` | Veda | MW veda m. (sacred knowledge, the Veda); no ṇatva, like देव |
| शत्रुघ्न | m | `deva-m` | Śatrughna (name, Rāma's youngest brother) | MW zatru-Gna m. 'N. of a son of Daśaratha and Sumitrā (twin brother of Lakṣmaṇa)'; dental n blocks ṇatva (śatrughnena) |
| सरयू | f | `vadhu-f` | the Sarayū river (at Ayodhyā) | MW sarayU f. |
| सहस्र | n | `mitra-n` | thousand | MW sahasra n. (a thousand); a-stem n. with ṇatva like मित्र |
| सिद्धाश्रम | m | `rama-m` | Siddhāśrama, Viśvāmitra's hermitage | MW siddhASrama m. |
| सुषेण | m | `deva-m` | Suṣeṇa (name of the vānara physician) | MW suSeNa m. 'N. of a monkey (father-in-law of Vālin)'; R. vi; final ṇ blocks further ṇatva (suṣeṇena) |

### Battle narration (`content/sa-battle.json`, verified by `sa-battle.test.ts`)
56 templates (6 with m/f variants) plus name forms for 7 allies, 22 enemies, 36 moves and 5 items. Every instantiation (each name × gender × numbers 1–999) verifies, 105,984 lines in all. Constructions for a teacher to confirm:
- "X M-acc प्रयुङ्क्ते" for every move.
- "शिष्यः {player}" (the typed name in apposition, uninflected).
- Numbers after a dash for any n ("…बलं न्यूनं भवति — द्वादश।"), with additive forms above 100 ("शतम् त्रयोविंशतिः च").
- सोपान for "level"; धन for "coins".
- Duel phrasing: उत्तरं ददाति, प्रतिवदति, विश्वासः न्यूनः भवति, "सत्यम् इति अङ्गीकरोति".
- जितः/जिता for defeated.
- "महत् फलम्!" / "अल्पं फलम्।" for type effectiveness; "अहो, अतीव तीक्ष्णम्!" for a critical hit.
- तेजः / धैर्यम् for attack / defence stages.
See `notes/sa-battle.md`.

## Sanskrit interface (v0.3.0): model-written, machine-verified, awaiting human review

In **संस्कृतम्** mode everything the game draws is Sanskrit (Devanagari, or IAST via the Script setting): buttons, headings, hints, numbers (Devanagari digits), toasts, battle menus and canvas labels (a DOM overlay replaces the pixel-font English), challenge prompts, feedback and grammar explanations, word and verse cards, shop, shrine, menu tabs, settings, chapter cards and the ending. **संस्कृतम् + English** adds a small English gloss. English mode is unchanged. The only English left in संस्कृतम् mode is the meaning being taught (English glosses of verse words, meaning-challenge options, the verse translation behind its toggle), citations of sources, the picker's own "English" label, and a name the player typed in Latin letters. Every such element carries `data-en-ok`; the e2e sweeps fail on any other Latin letter.

**Files.** `content/sa-ui-common.json` (20 shared terms), `sa-ui-a.json` (110: screens and menus), `sa-ui-b.json` (106: battle, challenges, cards, toasts), `content/sa-dialogue-4.json` (159 content strings: NPC titles, chapter summaries, move / item / ally / enemy descriptions, move origins, logic-made objectives), `content/sa-grammar.json` (grammar labels of the word-by-word tables). Rules and glossary: `notes/sa-ui.md`. The default player name is addressed as शिष्य / शिष्ये (`saPlayer`).

**Guaranteed by machine.** `sa-ui.test.ts` (every word verifies with the same oracle as the dialogue; slots match between languages; every key used in code exists), `sambhashana.test.ts` (file 4 coverage and verification; labels need no final ।), `learning.test.ts` / `logic.test.ts` (generated challenges and every toast kind carry verified Sanskrit), `grammar-sa.test.ts`, and the e2e "no Latin" sweeps.

**Reviewed by independent model reviewers** (not a substitute for a human): `notes/sa-rev-c.md` (file 4: 10 fixes), `notes/sa-rev-a-ui.md` (screens: 9 fixes), `notes/sa-rev-b-ui.md` (battle and learning: 14 fixes). Their "for a human teacher" lists are the review items. Choices to confirm first:
- menu = स्यूतः (bag); settings = इच्छाः; XP = ज्ञानम्; level = स्तरः (model); PP = उत्साहः; HP = बलम्; attack / defence = तेजः / धैर्यम्; restored = पूर्णः; owned N = तव पार्श्वे N; Book N = काण्डम् N (model); end session = अद्य अलम्.
- objectives and hints in the polite imperative (गच्छतु), buttons and toasts in the 2nd singular (गच्छ, त्वम्), battle narration with भवान् / भवती.
- percentages as "शते चत्वारिंशत्"; "×N" after a singular noun for quantities.
- grammar explanations: "{पदम्} इति पदे तृतीया विभक्तिः अस्ति। प्रश्नः — केन? कया?"; joined forms called सन्धिः.
- Speakers without a verified Sanskrit name get a description: Danu → कबन्धः, Sampāti → जटायोः भ्राता, Gavākṣa / Śarabha / Mainda → वानरः.

**Extra declension models (v0.3.0).** स्तर m (`rama-m`, MW stara), काण्ड n (`phala-n`, MW kāṇḍa), रूप n (`mitra-n`, MW rūpa), विभक्ति f (`mati-f`, MW vibhakti), सन्धि m (`muni-m`, MW saṃdhi), चूडामणि m (`muni-m`, MW cūḍāmaṇi), तापसी f (`nadi-f`, MW tāpasī), plus the grammar-term models listed in `notes/sa-grammar.md`.

**Content fix found in review:** Mainda now leaps sixty yojanas (Kiṣkindhā 65: Gaja 10 … Mainda 60 … Jāmbavān 90); the English line said ninety.

## Kathā content (v0.4): model-written, machine-verified, awaiting human review

Kathā is the story-first journey (`notes/katha.md`). Its Sanskrit content: `content/katha.json` (astra → pāda bindings; an **anvaya** and a **सरलार्थः** for each of the 21 verses) and `content/sa-dialogue-5.json` (62 lines: the Sambhāṣaṇa choices in 10 scenes, inside `{ "if": "style.katha", "then": [...] }` blocks of story-*.json; v0.4.1 adds 18: the Kathā wording of tutorial lines and move descriptions, see the last subsection). OWNER: kc-content. Nothing here has been reviewed by a human.

**Guaranteed by machine** (`katha-content.test.ts`, `sambhashana.test.ts`): every anvaya holds every pada-ccheda form of its verse exactly once, in a different order, and every [implied] word is a verified form; every सरलार्थः has 1–4 sentences of ≤ 14 words and every word verifies with the Sambhāṣaṇa oracle (padaccheda, । endings); every bound pāda prints as ≥ 2 chunks with a chunk that is not the astra's name; every choice block has 2–3 replies, exactly one continues the story, each misread gets an in-character answer and returns to the question, and nothing in the block changes flags, items or the epic; the practice game skips every block; the story bot reaches the ending in both journeys. **Not guaranteed:** that the prose order is the one a teacher would give, that the सरलार्थः is grammatical, faithful and natural, and that the register suits Level 1–3. No new declension models were needed.

### Astra bindings (`katha.json → astras`)

| move | verse | pāda recited | why |
|---|---|---|---|
| shoka_shloka (श्लोक) | s-ma-nishada | 1: मा निषाद प्रतिष्ठां त्वम् | the opening curse: grief become verse |
| suprabhata (सुप्रभात) | s-kausalya-supraja | 3: उत्तिष्ठ नरशार्दूल | "rise, tiger among men": the heroes rise restored (the Suprabhātam line) |
| shuddha_vak (व्याकरण) | s-vyakaranam | 1: नूनं व्याकरणं कृत्स्नम् | holds the move's name व्याकरण |
| dharma_vigraha (धर्म) | s-ramo-vigrahavan | 2: साधुः सत्यपराक्रमः | rebound from pāda 1 (whose only gap was रामो, too easy; kc-rev); both chunks can be the gap |
| abhaya (अभय) | s-sakrdeva | 3: अभयं सर्वभूतेभ्यो | holds the name अभय |
| aditya_hrdaya (आदित्यहृदय) | s-aditya-hrdayam | 1: आदित्यहृदयं पुण्यं | holds the hymn's name |
| brahmastra (ब्रह्मास्त्र) | s-aditya-hrdayam | 4: अक्षय्यं परमं शिवम् | "imperishable, supreme": the supreme missile (pāda 2 सर्वशत्रुविनाशनम् is one chunk) |
| viddhi (विद्धि) | s-ramam-dasharatham | 1: रामं दशरथं विद्धि | holds the name विद्धि (the spec's example) |
| jaya_ghosha (जय) | s-jayatyatibalo | 2: लक्ष्मणश्च महाबलः | rebound from pāda 1 (only gap रामो, too easy; kc-rev); the cry continues with Lakṣmaṇa; both chunks can be the gap |
| anirveda (अनिर्वेद) | s-anirvedah | 1: अनिर्वेदः श्रियो मूलम् | "the root of success" |

### Anvaya and सरलार्थः, verse by verse (`katha.json → verses`)

Each item: the printed verse, the anvaya (implied words in [brackets]), the सरलार्थः, and what to check first.

- [ ] **1. s-tapah-svadhyaya** (Narrator (Vālmīki)) — तपःस्वाध्यायनिरतं । तपस्वी वाग्विदां वरम् । नारदं परिपप्रच्छ । वाल्मीकिर्मुनिपुङ्गवम् ॥
  - अन्वयः: तपस्वी वाल्मीकिः तपःस्वाध्यायनिरतम् वाग्विदाम् वरम् मुनिपुङ्गवम् नारदम् परिपप्रच्छ
  - सरलार्थः: वाल्मीकिः तपस्वी मुनिः। सः नारदं प्रश्नं पृष्टवान्। नारदः सदा तपः करोति, वेदं च पठति। सः मुनिषु उत्तमः, वचने अपि कुशलः।
  - check: वाग्विदां वरम् rendered "वचने अपि कुशलः"; मुनिपुङ्गवम् as "मुनिषु उत्तमः".
- [ ] **2. s-ko-nvasmin** (Vālmīki (to Nārada)) — को न्वस्मिन् साम्प्रतं लोके । गुणवान् कश्च वीर्यवान् । धर्मज्ञश्च कृतज्ञश्च । सत्यवाक्यो दृढव्रतः ॥
  - अन्वयः: साम्प्रतम् अस्मिन् लोके गुणवान् कः नु [अस्ति] वीर्यवान् च कः धर्मज्ञः च कृतज्ञः च सत्यवाक्यः दृढव्रतः
  - सरलार्थः: वाल्मीकिः नारदं पृच्छति। अधुना अस्मिन् लोके गुणवान् वीरः च कः अस्ति? कः धर्मं जानाति, कृतज्ञः च अस्ति? कः सदा सत्यं वदति, व्रतं च न त्यजति?
  - check: [अस्ति] after the first question; the adjectives of pāda 4 depend on the second कः (no second bracket).
- [ ] **3. s-samudra-iva** (Nārada (to Vālmīki)) — स च सर्वगुणोपेतः । कौसल्यानन्दवर्धनः । समुद्र इव गाम्भीर्ये । धैर्येण हिमवानिव ॥
  - अन्वयः: सः च सर्वगुणोपेतः कौसल्यानन्दवर्धनः गाम्भीर्ये समुद्रः इव धैर्येण हिमवान् इव [अस्ति]
  - सरलार्थः: रामे सर्वे गुणाः सन्ति। सः कौसल्यायै आनन्दं ददाति। सः समुद्रः इव गभीरः, हिमवान् इव धीरः च।
  - check: कौसल्यानन्दवर्धनः rendered "कौसल्यायै आनन्दं ददाति".
- [ ] **4. s-ma-nishada** (Vālmīki (to the hunter)) — मा निषाद प्रतिष्ठां त्वम् । अगमः शाश्वतीः समाः । यत् क्रौञ्चमिथुनादेकम् । अवधीः काममोहितम् ॥
  - अन्वयः: निषाद त्वम् शाश्वतीः समाः प्रतिष्ठाम् मा अगमः यत् क्रौञ्चमिथुनात् काममोहितम् एकम् अवधीः
  - सरलार्थः: हे निषाद, द्वौ पक्षिणौ स्निह्यतः, आनन्देन गायतः च। त्वं तयोः एकं हतवान्। अतः दीर्घं कालं तव प्रतिष्ठा न भवतु।
  - check: Main clause first: यत् is a conjunction ("because"), not a relative with a correlative. सरलार्थः: काममोहितम् as "स्निह्यतः, आनन्देन गायतः च"; the curse as "न भवतु" (loṭ with न, not मा + luṅ); शाश्वतीः समाः as "दीर्घं कालम्".
- [ ] **5. s-kausalya-supraja** (Viśvāmitra (to Rāma)) — कौसल्या सुप्रजा राम । पूर्वा संध्या प्रवर्तते । उत्तिष्ठ नरशार्दूल । कर्तव्यं दैवमाह्निकम् ॥
  - अन्वयः: राम कौसल्या सुप्रजा [अस्ति] पूर्वा संध्या प्रवर्तते नरशार्दूल उत्तिष्ठ दैवम् आह्निकम् कर्तव्यम्
  - सरलार्थः: हे राम, त्वं कौसल्यायाः उत्तमः पुत्रः। प्रभातं भवति। हे वीर, उत्तिष्ठ। देवानां कार्यं कर्तव्यम्।
  - check: Each vocative opens its clause (राम … / नरशार्दूल उत्तिष्ठ); [अस्ति] with कौसल्या सुप्रजा. सरलार्थः gives the sense "you are Kausalyā's excellent son"; दैवम् आह्निकम् as "देवानां कार्यम्".
- [ ] **6. s-ramo-dvir** (Rāma (to Kaikeyī)) — तद्ब्रूहि वचनं देवि । राज्ञो यदभिकाङ्क्षितम् । करिष्ये प्रतिजाने च । रामो द्विर्नाभिभाषते ॥
  - अन्वयः: देवि राज्ञः यत् अभिकाङ्क्षितम् [अस्ति] तत् वचनम् ब्रूहि करिष्ये प्रतिजाने च रामः द्विः न अभिभाषते
  - सरलार्थः: हे देवि, राजा किम् इच्छति? तत् वचनं वदतु। अहं तत् करिष्यामि इति वचनं ददामि। रामः द्विः न वदति।
  - check: Relative before correlative (यत् … तत्); करिष्ये प्रतिजाने च kept as two verbs. सरलार्थः: Rāma to Kaikeyī in the polite form (वदतु); द्विः kept (verse form).
- [ ] **7. s-pitari-shushrusha** (Rāma (to Kaikeyī)) — न ह्यतो धर्मचरणं । किं चिदस्ति महत्तरम् । यथा पितरि शुश्रूषा । तस्य वा वचनक्रिया ॥
  - अन्वयः: यथा पितरि शुश्रूषा तस्य वचनक्रिया वा अतः महत्तरम् धर्मचरणम् किंचित् न हि अस्ति
  - सरलार्थः: पुत्रः पितरं सेवते। पुत्रः पितुः वचनं पालयति। एषः एव परमः धर्मः। एतस्मात् महत्तरः धर्मः न अस्ति।
  - check: यथा-clause first, then अतः महत्तरम् … न हि अस्ति (यथा here = "than"; check the order a teacher would give). सरलार्थः restates शुश्रूषा / वचनक्रिया as two sentences (सेवते, पालयति).
- [ ] **8. s-ramam-dasharatham** (Sumitrā (to Lakṣmaṇa)) — रामं दशरथं विद्धि । मां विद्धि जनकात्मजाम् । अयोध्यामटवीं विद्धि । गच्छ तात यथासुखम् ॥
  - अन्वयः: तात रामम् दशरथम् विद्धि जनकात्मजाम् माम् विद्धि अटवीम् अयोध्याम् विद्धि यथासुखम् गच्छ
  - सरलार्थः: हे पुत्र, रामं पितरं दशरथम् इव पश्य। सीतां माम् इव पश्य। वनम् अयोध्याम् इव पश्य। सुखेन गच्छ।
  - check: Object before complement in each clause: रामं दशरथं, जनकात्मजां मां, अटवीम् अयोध्याम्.
- [ ] **9. s-ramo-vigrahavan** (Mārīca (to Rāvaṇa)) — रामो विग्रहवान्धर्मः । साधुः सत्यपराक्रमः । राजा सर्वस्य लोकस्य । देवानामिव वासवः ॥
  - अन्वयः: रामः विग्रहवान् धर्मः साधुः सत्यपराक्रमः देवानाम् वासवः इव सर्वस्य लोकस्य राजा [अस्ति]
  - सरलार्थः: रामः धर्मस्य रूपम् एव। सः साधुः, सत्यः वीरः च। यथा वासवः देवानां राजा, तथा रामः सर्वस्य लोकस्य राजा।
  - check: [अस्ति] once at the end. विग्रहवान् धर्मः as "धर्मस्य रूपम् एव"; सत्यपराक्रमः as "सत्यः वीरः".
- [ ] **10. s-golden-deer** (Sītā (to Rāma)) — आर्यपुत्राभिरामोऽसौ । मृगो हरति मे मनः । आनयैनं महाबाहो । क्रीडार्थं नो भविष्यति ॥
  - अन्वयः: आर्यपुत्र असौ अभिरामः मृगः मे मनः हरति महाबाहो एनम् आनय [सः] नः क्रीडार्थम् भविष्यति
  - सरलार्थः: हे आर्यपुत्र, सः सुन्दरः मृगः मम मनः हरति। हे महाबाहो, तम् आनयतु। सः अस्माकं क्रीडायै भविष्यति।
  - check: [सः] as the implied subject of भविष्यति; असौ simplified to सः.
- [ ] **11. s-aranya-3** (Jaṭāyu (to Rāma)) — यामोषधिमिवायुष्मन्न् । अन्वेषसि महावने । सा देवी मम च प्राणा । रावणेनोभयं हृतम् ॥
  - अन्वयः: आयुष्मन् याम् ओषधिम् इव महावने अन्वेषसि सा देवी मम प्राणाः च उभयम् रावणेन हृतम्
  - सरलार्थः: हे आयुष्मन्, भवान् ओषधिम् इव सीतां वने मार्गयति। रावणः सीतां हृतवान्। सः मम प्राणान् अपि हृतवान्।
  - check: Relative before correlative (याम् … सा); अन्वेषसि as "मार्गयति".
- [ ] **12. s-nanrgveda** (Rāma (to Lakṣmaṇa)) — नानृग्वेदविनीतस्य । नायजुर्वेदधारिणः । नासामवेदविदुषः । शक्यमेवं विभाषितुम् ॥
  - अन्वयः: न अनृग्वेदविनीतस्य न अयजुर्वेदधारिणः न असामवेदविदुषः एवम् विभाषितुम् शक्यम्
  - सरलार्थः: एषः त्रीन् वेदान् सम्यक् जानाति। यः वेदान् न जानाति, सः एवं वक्तुं न शक्नोति।
  - check: The three न stay before their genitives (the verse's own pattern); only एवं विभाषितुं शक्यम् moves. सरलार्थः: "त्रीन् वेदान्".
- [ ] **13. s-vyakaranam** (Rāma (to Lakṣmaṇa)) — नूनं व्याकरणं कृत्स्नम् । अनेन बहुधा श्रुतम् । बहु व्याहरतानेन । न किञ्चिदपशब्दितम् ॥
  - अन्वयः: नूनम् अनेन कृत्स्नम् व्याकरणम् बहुधा श्रुतम् बहु व्याहरता अनेन किञ्चित् न अपशब्दितम्
  - सरलार्थः: एषः नूनं सर्वं व्याकरणं बहुधा पठितवान्। सः बहु उक्तवान्। परन्तु तस्य सर्वे शब्दाः समीचीनाः।
  - check: न किञ्चिद् अपशब्दितम् rendered positively: "तस्य सर्वे शब्दाः समीचीनाः".
- [ ] **14. s-naham-janami** (Lakṣmaṇa (to Rāma)) — नाहं जानामि केयूरे । नाहं जानामि कुण्डले । नूपुरे त्वभिजानामि । नित्यं पादाभिवन्दनात् ॥
  - अन्वयः: अहम् केयूरे न जानामि अहम् कुण्डले न जानामि नित्यम् पादाभिवन्दनात् नूपुरे तु अभिजानामि
  - सरलार्थः: अहं केयूरे न जानामि। कुण्डले अपि न जानामि। परन्तु नूपुरे जानामि, यतः अहं सदा सीतायाः पादौ नमस्कृतवान्।
  - check: नित्यं पादाभिवन्दनात् as "सदा … पादौ नमस्कृतवान्".
- [ ] **15. s-anirvedah** (Hanumān (to himself)) — अनिर्वेदः श्रियो मूलम् । अनिर्वेदः परं सुखम् । अनिर्वेदो हि सततं । सर्वार्थेषु प्रवर्तकः ॥
  - अन्वयः: अनिर्वेदः श्रियः मूलम् अनिर्वेदः परम् सुखम् अनिर्वेदः हि सर्वार्थेषु सततम् प्रवर्तकः [अस्ति]
  - सरलार्थः: दुःखे अपि मनुष्यः धैर्यं न त्यजेत्। एतत् धैर्यं श्रियः मूलम्, परमं सुखं च। तत् एव सर्वेषु कार्येषु सदा अस्मान् अग्रे नयति।
  - check: [अस्ति] at the end. सरलार्थः renders अनिर्वेदः by धैर्यम् ("courage, not giving up") after one sentence of maxim (न त्यजेत्): check the word choice.
- [ ] **16. s-kalyani-bata** (Sītā (to Hanumān)) — कल्याणी बत गाथेयं । लौकिकी प्रतिभाति मा । एति जीवन्तमानन्दो । नरं वर्षशतादपि ॥
  - अन्वयः: बत इयम् लौकिकी गाथा मा कल्याणी प्रतिभाति आनन्दः वर्षशतात् अपि जीवन्तम् नरम् एति
  - सरलार्थः: अहो, लोकस्य एतत् वचनं सत्यं शुभं च! यः नरः जीवति, सः आनन्दं प्राप्नोति। शतं वर्षाणि गच्छन्तु, तदा अपि आनन्दः आगच्छति।
  - check: कल्याणी as "सत्यं शुभं च"; वर्षशतात् अपि as "शतं वर्षाणि गच्छन्तु, तदा अपि".
- [ ] **17. s-jayatyatibalo** (Hanumān (to the rākṣasas)) — जयत्यतिबलो रामो । लक्ष्मणश्च महाबलः । राजा जयति सुग्रीवो । राघवेणाभिपालितः ॥
  - अन्वयः: अतिबलः रामः जयति महाबलः लक्ष्मणः च [जयति] राघवेण अभिपालितः राजा सुग्रीवः जयति
  - सरलार्थः: महाबलः रामः जयति। बलवान् लक्ष्मणः अपि जयति। रामः राजानं सुग्रीवं रक्षति। राजा सुग्रीवः अपि जयति।
  - check: [जयति] supplied for Lakṣmaṇa (the verse has one जयति per line).
- [ ] **18. s-dasoham** (Hanumān (to the rākṣasas)) — दासोऽहं कोसलेन्द्रस्य । रामस्याक्लिष्टकर्मणः । हनुमान् शत्रुसैन्यानां । निहन्ता मारुतात्मजः ॥
  - अन्वयः: अहम् अक्लिष्टकर्मणः कोसलेन्द्रस्य रामस्य दासः शत्रुसैन्यानाम् निहन्ता मारुतात्मजः हनुमान् [अस्मि]
  - सरलार्थः: अहं रामस्य दासः। रामः अयोध्यायाः राजा, सः कठिनानि कार्याणि अपि सुखेन करोति। अहं वायोः पुत्रः हनुमान्। अहं शत्रून् हन्मि।
  - check: [अस्मि] once at the end covers both predicates. कोसलेन्द्रस्य as "अयोध्यायाः राजा" (कोसल is not a verified stem); शत्रुसैन्यानां निहन्ता as "शत्रून् हन्मि".
- [ ] **19. s-sakrdeva** (Rāma (to Sugrīva)) — सकृदेव प्रपन्नाय । तवास्मीति च याचते । अभयं सर्वभूतेभ्यो । ददाम्येतद्व्रतं मम ॥
  - अन्वयः: सकृत् एव प्रपन्नाय तव अस्मि इति च याचते सर्वभूतेभ्यः अभयम् ददामि एतत् मम व्रतम्
  - सरलार्थः: यः मम पार्श्वम् आगत्य 'अहं तव अस्मि' इति वदति, तस्मै अहम् अभयं ददामि। सः सकृत् एव वदतु, तत् पर्याप्तम्। अहं तं सर्वेभ्यः भूतेभ्यः रक्षामि। एतत् मम व्रतम्।
  - check: सरलार्थः: a यः … तस्मै sentence (13 words, the longest); सकृत् एव kept; सर्वभूतेभ्यः as "सर्वेभ्यः भूतेभ्यः".
- [ ] **20. s-aditya-hrdayam** (Agastya (to Rāma)) — आदित्यहृदयं पुण्यं । सर्वशत्रुविनाशनम् । जयावहं जपेन्नित्यम् । अक्षय्यं परमं शिवम् ॥
  - अन्वयः: पुण्यम् सर्वशत्रुविनाशनम् जयावहम् अक्षय्यम् परमम् शिवम् आदित्यहृदयम् नित्यम् जपेत्
  - सरलार्थः: आदित्यहृदयं पुण्यं परमं शुभं च, तत् कदा अपि न नश्यति। तस्य पाठेन सर्वे शत्रवः नश्यन्ति। तत् जयं ददाति। अतः नित्यं तत् पठेत्।
  - check: शिवम् as शुभम्, अक्षय्यम् as "कदा अपि न नश्यति", जपेत् as पठेत्.
- [ ] **21. s-maranantani** (Rāma (to Vibhīṣaṇa)) — मरणान्तानि वैराणि । निर्वृत्तं नः प्रयोजनम् । क्रियतामस्य संस्कारो । ममाप्येष यथा तव ॥
  - अन्वयः: वैराणि मरणान्तानि नः प्रयोजनम् निर्वृत्तम् अस्य संस्कारः क्रियताम् एषः यथा तव [तथा] मम अपि
  - सरलार्थः: मृत्योः अनन्तरं वैरं न तिष्ठति। अस्माकं कार्यं पूर्णम्। भवान् अस्य संस्कारं करोतु। एषः यथा भवतः, तथा मम अपि।
  - check: [तथा] supplied for यथा … तथा. सरलार्थः: Rāma to Vibhīṣaṇa in the polite form (करोतु).

### Sambhāṣaṇa choices (story-*.json Kathā blocks; Sanskrit in `content/sa-dialogue-5.json`)

Each scene asks one question built on a question word; ✓ marks the reply that continues the story (the story bot picks it: the only reply without a `goto`). A reply that answers a different question (where instead of who, and so on) gets the answer shown after →, and the question is asked again. Every line is model-written; the Sanskrit is in file 5.

- [ ] **ch1.road_dawn** — कः / कुतः (who, from where): विश्वामित्रः पृच्छति, '{g:वत्स|वत्से}, त्वं {g:कः|का}? कुतः आगच्छसि?'
  - अहं पूर्वां दिशं गच्छामि, वनं प्रति। → अस्माभिः सह पूर्वां दिशम्? साधु। परन्तु त्वं {g:कः|का}, कुतः आगच्छसि इति अहं पृष्टवान्।
  - ✓ अहं {player}। वाल्मीकेः आश्रमात् आगच्छामि।
  - राजकुमारौ अधुना अपि स्वपितः। → तौ स्वपितः, अस्तु। परन्तु {g:वत्स|वत्से}, त्वं {g:कः|का}?
- [ ] **ch2.child** — किमर्थम् (why) — optional NPC: बालकः त्वां पृच्छति, 'रामः किमर्थं गच्छति?'
  - सः वनं गच्छति। → वनम्? परन्तु किमर्थम्?
  - चतुर्दश वर्षाणि। → चतुर्दश वर्षाणि! परन्तु सः किमर्थं गच्छति?
  - ✓ पितुः वचनं पालयितुम्।
  - then: रामः दुःखे अपि वचनं पालयति। अहम् अपि मम वचनं पालयिष्यामि!
- [ ] **ch2.guha** — कुत्र (where to): गुहः त्वां पृच्छति, 'मित्र, त्वं कुत्र गच्छसि?'
  - ✓ रामेण सह वनं गच्छामि।
  - अहम् अयोध्यायाः आगच्छामि। → अयोध्यायाः, आम्। परन्तु अधुना कुत्र गच्छसि?
  - अहं वाल्मीकेः {g:शिष्यः|शिष्या}। → महतः मुनेः {g:शिष्यः|शिष्या}! परन्तु वद, कुत्र गच्छसि?
  - then: तर्हि त्वं रामस्य मित्रम्, मम अपि मित्रम्।
- [ ] **ch3.sita** — किम् (what): सीता पृच्छति, '{player}, वृक्षाणां मध्ये तत् किम्?'
  - तत् वृक्षाणां मध्ये अस्ति। → आम्, तत्र। परन्तु तत् किम्?
  - ✓ स्वर्णस्य मृगः!
  - लक्ष्मणः तत् पश्यति। → लक्ष्मणः अपि पश्यति। परन्तु तत् किम्?
- [ ] **ch4.mendicant** — कौ (who, dual): भिक्षुकः त्वां पृच्छति, 'एतौ कौ?'
  - वयं सुग्रीवं द्रष्टुं गच्छामः। → सुग्रीवः एव माम् अत्र आदिष्टवान्। परन्तु प्रथमं वद, एतौ कौ?
  - ✓ रामः लक्ष्मणः च। तौ दशरथस्य राज्ञः पुत्रौ।
  - तौ अयोध्यायाः आगतवन्तौ। → अयोध्यायाः! परन्तु एतौ कौ?
  - then: दशरथस्य पुत्रौ! तर्हि मम राजा तौ दृष्ट्वा प्रसन्नः भविष्यति।
- [ ] **ch4.sampati** — कथम् (how): गृध्रः पृच्छति, 'मम भ्राता कथं मृतः?'
  - अङ्गदः तस्य नाम उक्तवान्। → {g:वत्स|वत्से}, अहं राजकुमारस्य वचनं श्रुतवान्। परन्तु मम भ्राता कथं मृतः?
  - ✓ सः सीतां रक्षितुं रावणेन सह युद्धं कृतवान्। रावणः तं हतवान्।
  - वने, पञ्चवट्याः पार्श्वे। → वने… परन्तु कथम्? तत् वद।
  - then: हा भ्रातः! सः वीरः आसीत्।
- [ ] **ch4.vanara_mainda** — कति (how many) — optional NPC: वानरः पृच्छति, 'इतः लङ्का कति योजनानि दूरे अस्ति?'
  - ✓ शतं योजनानि। जटायोः भ्राता तथा उक्तवान्।
  - सा दक्षिणस्यां दिशि, समुद्रस्य अन्यस्मिन् तीरे अस्ति। → दक्षिणस्यां दिशि, आम्। परन्तु कति योजनानि?
- [ ] **ch5.sita** — कदा (when): सीता त्वां पृच्छति, 'रामः कदा आगमिष्यति?'
  - किष्किन्धायाः। → किष्किन्धायाः… आम्। परन्तु कदा, {g:वत्स|वत्से}? कदा?
  - सुग्रीवेण सर्वैः वानरैः च सह। → वानरैः सह! परन्तु सः कदा आगमिष्यति?
  - ✓ शीघ्रम् एव। हनुमान् वार्तां नेष्यति, ततः सः आगमिष्यति।
  - then: शीघ्रम्… अहम् एतत् वचनं स्मरिष्यामि।
- [ ] **ch6.vibhishana_refuge** — किम् (what does he ask): रामः त्वां पृच्छति, '{player}, सः अस्मान् किं याचते?'
  - सः रावणस्य अनुजः। → {g:वत्स|वत्से}, सः कः इति अहं जानामि। सः किम् इच्छति इति अहं पृष्टवान्।
  - सः लङ्कायाः आगतवान्। → लङ्कायाः, आम्। परन्तु सः किं याचते?
  - ✓ सः भवतः रक्षां याचते।
  - then: आम्। सः रक्षां याचते।
- [ ] **ch6.epilogue_valmiki** — केन सह (with whom): वाल्मीकिः पृच्छति, '{g:वत्स|वत्से}, त्वं केन सह {g:गतवान्|गतवती}?'
  - लङ्कां प्रति, पुनः गृहं प्रति च। → लङ्का अतीव दूरे! परन्तु केन सह?
  - ✓ रामेण सीतया लक्ष्मणेन हनुमता च सह।

Constructions to confirm first (after fx-rev): सः स्वयं पूर्णः भवति for "a line you know well recites itself" (the oracle has no passive); यदि पादे रिक्तं स्थानम् अस्ति for "if a word is missing"; अहो, त्वं प्रायः जयसि for "you nearly had me" (copied from the practice line; प्रायः is often heard as "probably"); the interface's श्लोकाः स्वयं वदन्ति (`katha.autoReciteSub`) for automatic recitation; and कथायाम् in `title.howto3` naming the Story journey, beside `title.howto2`'s कथायाम् "in the story".

### Kathā wording of tutorial lines and move descriptions (v0.4.1; Sanskrit in `content/sa-dialogue-5.json`)

The playtest (kc-qa P1-3) found tutorial lines and move descriptions that describe the practice game ("every move is a question, answer swiftly", wild foes in the grass, the Relaxed timer). In story-*.json each such line now sits in a practice-only block `{ "if": "!style.katha", "then": [...] }` (its English and Sanskrit unchanged, still in files 1–3) with its Kathā wording beside it in `{ "if": "style.katha", "then": [...] }`; the move descriptions get `katha.json → moveText`. OWNER: fx-content. Machine-guaranteed (`katha-content.test.ts`): practice-only blocks hold only say lines and Kathā never meets them; the practice game never meets the Kathā wording (also on the story bot's walkthrough in both styles); no line a player can meet in Kathā, and no move description shown in Kathā, matches the practice-wording patterns; every word verifies with the oracle. No new declension models (अभ्यासशाला and अस्त्र use the existing ones). Nothing here has been reviewed by a human.

- **ch1.bharadvaja_duel** — Bharadvāja's two lines before the first debate were replaced in v0.4.3 (the tutorial duel: learning the new verse by heart; see "Kathā tutorial duel (v0.4.3)" at the end of this file).
- [ ] **ch1.bharadvaja_duel (onLose)** — Bharadvāja, after a lost debate. Practice: "You nearly had me! Every wrong answer shows you the right word …"
  - You nearly had me! When you forget a word, the line shows you the right one, so you learn either way.
    - अहो, त्वं प्रायः जयसि! यदा त्वं पदं विस्मरसि, तदा पादः समीचीनं पदं दर्शयति। अतः जयसि वा न वा, त्वं पठसि एव।
- [ ] **ch1.valmiki_shrine** — Vālmīki at the first shrine: a Kathā-only line after "This is the hermitage shrine …" (it replaces nothing)
  - There is a study hall here too, for practising words. Go there only when you wish.
    - अत्र अभ्यासशाला अपि अस्ति। तत्र शब्दानाम् अभ्यासं कर्तुं शक्नोषि। यदा इच्छसि, तदा एव तत्र गच्छ।
- [ ] **ch1.bharadvaja_ashrama** — Bharadvāja (optional NPC). Practice: "Did you know? Each word you answer correctly grows stronger in your word book …"
  - Did you know? Each line you recite in battle stays with you. A line you forget comes back more often, until it sticks.
    - किं त्वं जानासि? यं पादं त्वं युद्धे पठसि, सः तव मनसि तिष्ठति। यं पादं त्वं विस्मरसि, सः पुनः पुनः आगच्छति, यावत् त्वं तं सम्यक् न जानासि।
- [ ] **ch1.road_dawn** — narration (the battle tutorial). Practice: "Sacred kusha grass … Night-wanderers hide in it and may leap out …"
  - Sacred kusha grass grows tall along this road. On this journey the night-wanderers in it stay hidden; only the battles of the story await you.
    - मार्गस्य पार्श्वे उन्नतं तृणं वर्धते। तत्र निशाचराः सन्ति, परन्तु अस्यां यात्रायां ते न उत्पतन्ति। कथायाः युद्धानि एव भवन्ति।
- [ ] **ch1.road_dawn** — narration. Practice: "In battle, choose a move and answer its question … A swift and perfect answer …"
  - In battle, choose a move. For an astra, recite a line of its verse. Other moves are simple.
    - युद्धे एकं कार्यं चिनु। यदि अस्त्रं चिनोषि, तर्हि तस्य श्लोकात् एकं पादं पठ। अन्यानि कार्याणि सरलानि।
  - If a word is missing from the line, choose it with one tap. A line you know well recites itself.
    - यदि पादे रिक्तं स्थानम् अस्ति, तर्हि उचितं पदं चिनु। यं पादं त्वं सम्यक् जानासि, सः स्वयं पूर्णः भवति।
- [ ] **ch1.road_cowherd** — Cowherd (optional NPC). Practice: "If you get hurt in the tall grass, eat some fruit …"
  - If you get hurt in a battle, eat some fruit from your bag. And the hermitage shrines will always restore you.
    - युद्धे यदि तव वेदना भवति, तर्हि स्यूतात् फलं खाद। आश्रमाणां मन्दिरेषु अपि सदा पुनः बलं लभसे।
- [ ] **ch2.shala_student** — Young student (optional NPC). Practice: "In a debate … Answer well and you shake …"
  - In a debate, your conviction is your strength. Recite well and you shake the other side's conviction. Persuade them, and the debate is won!
    - वादे तव विश्वासः एव तव बलम्। सम्यक् पठ, तदा अन्यस्य विश्वासः कम्पते। तं जय, तदा त्वं वादं जयसि!
- [ ] **ch2.shala_student** — Young student. Practice: "If the questions come too fast, turn on Relaxed … no time limit at all."
  - On this journey there is no need to be quick: recite at your own pace. Want more practice? Every shrine has a study hall.
    - अस्यां यात्रायां शीघ्रं पठितुं न आवश्यकम्। शनैः पठ। किम् अधिकम् अभ्यासम् इच्छसि? सर्वेषु मन्दिरेषु अभ्यासशाला अस्ति।
- [ ] **ch3.dandaka_sage_b** — Sage of Daṇḍaka (optional NPC). Practice: "The tall kusha grass here is thick with night-wanderers. Do not walk through it unless you are ready to fight."
  - The tall kusha grass here is thick with night-wanderers, but they fear Rama's bow and stay hidden. Walk on in peace.
    - अत्र उन्नते तृणे बहवः निशाचराः सन्ति। परन्तु ते रामस्य धनुषः बिभ्यति, अतः बहिः न आगच्छन्ति। यूयं शान्त्या गच्छत।

Move descriptions shown in Kathā (`katha.json → moveText`; the plain moves need no input in Kathā, the astras are recited):

- [ ] **pada_bana** — A strike of speech: the word flies like an arrow. → वाक् एव बाणः। शब्दः बाणः इव गच्छति।
- [ ] **lipi_raksha** — Protection: the heroes' defence rises one stage. → रक्षा। वीराणां धैर्यं वर्धते।
- [ ] **shoka_shloka** — Grief become verse: recite a line of its verse to strike. Strong against illusion. → शोकः एव श्लोकः अभवत्। तस्य श्लोकस्य पादं पठ, तदा प्रहरसि। मायां प्रति एतत् तीक्ष्णम्।
- [ ] **shuddha_vak** — Grammar: recite a line of its verse, and the heroes' attack rises one stage. → व्याकरणम्। श्लोकस्य पादं पठ। तदा वीराणां तेजः वर्धते।
- [ ] **bana** — A plain arrow. → सरलः बाणः।
- [ ] **dharma_vigraha** — Righteousness embodied: recite a line of its verse to strike. Strong against illusion. → रामः एव धर्मः। श्लोकस्य पादं पठ, तदा प्रहरसि। मायां प्रति एतत् तीक्ष्णम्।

Constructions to confirm first: सः (पादः) स्वयं वदति for "a line recites itself" (the oracle has no passive, so not पठ्यते; as the interface's श्लोकाः स्वयं वदन्ति); यदि पादे एकं पदं रिक्तम् अस्ति for "a word is missing from the line" (रिक्त as in the recitation help); अस्त्रस्य कृते तस्य श्लोकस्य पादं पठ for "to cast an astra, recite a line of its verse", and तस्य श्लोकस्य ("its verse") in the move descriptions, where तस्य stands for the mantra; ते रामस्य धनुषः बिभ्यति (ablative of the cause of fear); शीघ्रं पठितुं न आवश्यकम् (impersonal) and शनैः पठ for "take your time"; कथायाः युद्धानि एव भवन्ति for "only the battles of the story await you"; पादः समीचीनं पदं दर्शयति for the shimmer that shows a missed word.


Interface strings added in v0.4.1 (`content/sa-ui-b.json`, `content/sa-battle.json`, `content/sa-ui-a.json`); fx-rev reviewed the story and move lines above (`notes/kc-rev.md`, 6 fixes applied):

- [ ] **recital.newMoveSwap** — New move for {$who}: {$move}, in place of {$old} → अधुना {$who} {$move} अपि जानाति! {$old} त्यक्त्वा तं मन्त्रं प्रयुङ्क्ते।
- [ ] **toast.astraArmed** — {$who} now uses {$move} in place of {$old} → अधुना {$who} {$old} त्यक्त्वा {$move} प्रयुङ्क्ते।
- [ ] **title.howto3** — In battle, astras draw on real ślokas: in a Story journey recite a line of the verse; in Practice answer a Sanskrit question. → युद्धे अस्त्राणि श्लोकेभ्यः बलं लभन्ते। कथायां श्लोकस्य पादं पठ। अभ्यासे प्रश्नस्य उत्तरं देहि।
- [ ] **kathaHalfBut** (battle) — But the line falters: only half the power lands. → किन्तु पाठः न पूर्णः, अतः फलं शते पञ्चाशत् एव।
## Sanskrit audit v0.4.2 (12 Nov 2026): every in-game string, for accuracy and ease

The owner asked for a full audit of the in-game Sanskrit. Six model auditors split the files, using one brief (accuracy, meaning, ease at Level 3, register). Every changed word passes the oracle, and the Sanskrit test files pass. **Nothing here is human-reviewed.** Each auditor's change table and teacher list is in `notes/audit-<id>.md`.

| Auditor | Files | Checked | Accuracy fixes | Ease / consistency | For a teacher |
|---|---|---|---|---|---|
| d1 | sa-dialogue-1 (common, ch1–2) | 345 | 9 | 4 | 8 |
| d2 | sa-dialogue-2 (ch3–4) | 277 | 9 | 4 | 14 |
| d3 | sa-dialogue-3 (ch5–6, enemies) | 297 | 3 | 4 | 9 |
| cb | sa-dialogue-4, sa-battle (+145 slot forms), sa-grammar | 375 | 14 | 2 | 10 |
| ui | sa-ui-common / a / b / katha | 265 | 3 | 3 | 13 |
| kt | katha.json (21 anvayas, 21 सरलार्थाः, bindings, moveText), sa-dialogue-5 | 122 | 2 | 1 | 11 |
| **Total** | | **1,681** | **40** | **18** | **65** |

**Kinds of error found:**
- `{w:}` used as a word inside a sentence, which renders the bare stem (तपस्विन्, धर्म). It is now kept only before इति, or where the stem is the needed form.
- Case errors: त्रिंशत् → त्रिंशतं; मम रोचन्ते → मह्यं रोचन्ते.
- Agreement errors, and a ktvā whose doer differed from the main verb's.
- Moves called by a name other than the one the battle menu shows.
- A "southern shore" that named Laṅkā's side.
- Help lines that said the opposite of their English (katha.help1).
- Concept-named moves that read as plain nouns: "रामः धर्मम् अपि जानाति". These are now quoted: “धर्मः” इति मन्त्रम्.

**Conventions settled in this audit** (also in notes/sa-ui.md):
- move = मन्त्रः, astra = अस्त्रम्
- menu = स्यूतः, settings = इच्छाः
- the player recites = पठ्; a verse that recites itself = स्वयं वदति (a mastered line completes itself = स्वयं पूर्णः भवति)
- a gap = रिक्तं स्थानम्; the right word = उचितं पदम्
- "nearly won" = प्रायः {g:जितवान्|जितवती}
- the mainland shore of the southern sea = दक्षिणस्य समुद्रस्य तीरे
- every direct quote closes with इति

**For a teacher first** (raised by more than one auditor, or affecting what learners study):
1. The anvaya order of s-ko-nvasmin, and the सरलार्थः of s-anirvedah, s-kalyani-bata and s-sakrdeva (audit-kt 1–6).
2. मा + loṭ for prohibitions (files 1–3, about 10 lines).
3. प्रायः for "almost" (files 1, 2, 5).
4. Register of tutorial narration: polite 3rd person versus 2nd singular (audit-d1 5, audit-ui 1).
5. The grammar labels: noun = नाम vs संज्ञा (audit-cb 10).
6. The quoted move names in battle lines (audit-cb 4).
7. पदच्छेदः / अन्वयः / सरलार्थः as tab names for Level-3 readers (audit-ui 5).
8. Words the packs lack, which force paraphrases: शरण, सारथि, शिखर, मुक्ता (pearl), चार (spy), हिमालय, आलिङ्गति, केचित्, सावधान. Adding them to the vocab pack, with a human review, would restore meaning in about 15 lines (audit-d3, audit-d2).

**English story text that departs from Vālmīki** (flagged by d3; the English was out of the audit's scope, so not changed):
- #186 merges two herb episodes (6.74 vs the later Suṣeṇa errand).
- #212/#229: the brahmāstra was given to Rāma by Agastya earlier, not "blessed" at the duel.
- #236: Bharata meets Rāma at Nandigrāma.
- #119: "the southern shore of the ocean" is ambiguous.

## Kathā tutorial duel (v0.4.3, fx-duel): model-written, machine-verified, awaiting human review

The owner could not follow the first duel. In Kathā it is now framed as what Vālmīki tells in Bāla-kāṇḍa 2 (the disciple, delighted, takes up the guru's new verse as he speaks it, 2.19; the guru is pleased): Bharadvāja and the student learn the new verse by heart, line by line, call and response (`notes/katha.md` → "v0.4.3: the tutorial duel"). The game's lines are its own dialogue, not quotations. The practice game keeps its wording. Every word verifies with the oracle (`sambhashana.test.ts`, `sa-battle.test.ts`, `sa-ui.test.ts`); no new declension models. Nothing here has been reviewed by a human.

Story lines (`content/sa-dialogue-5.json`; `{ "if": "style.katha" }` blocks of story-ch1.json, the practice wording in their `else`):
- [ ] **ch1.krauncha** — Vālmīki. Practice: "Bharadvaja, test our young friend. A verse is only truly ours when we can defend it."
  - Bharadvaja, learn this new verse by heart, and teach it to our young friend too. Then we walk back. → भरद्वाज, एतं नूतनं श्लोकं स्मर। एतस्मै मित्राय अपि तम् उपदिश। ततः आश्रमं गच्छामः।
- [ ] **ch1.krauncha / ch1.gate_locked** — objective. Practice: "Talk to Bharadvaja for a friendly verse-debate."
  - Talk to Bharadvaja and learn the new verse by heart. → भरद्वाजेन सह वदतु। नूतनं श्लोकं स्मरतु।
- [ ] **ch1.valmiki_bank** — Vālmīki. Practice: "Bharadvaja wishes to test you, child. Speak with him."
  - Learn the new verse by heart with Bharadvaja, child. Speak with him. → {g:वत्स|वत्से}, भरद्वाजेन सह नूतनं श्लोकं स्मर। तेन सह वद।
- [ ] **ch1.bharadvaja_duel** — Bharadvāja, before the duel.
  - The teacher's new verse! Let us learn it by heart first, then walk back. → गुरोः नूतनः श्लोकः! प्रथमं तं स्मराम, ततः आश्रमं गच्छामः।
  - I say a line, and you say it after me. Where a word is missing, tap the right one. → अहं पादं वदामि, त्वं तम् अनुवद। यत्र रिक्तं स्थानम् अस्ति, तत्र उचितं पदं चिनु।
- [ ] **ch1.bharadvaja_duel (onWin)** — Bharadvāja. Practice: "I am persuaded! You really did hear every word."
  - Now the verse lives in two memories. Let us tell the guru. → अधुना श्लोकः आवयोः मनसोः अस्ति। आगच्छ, गुरवे वदाम।
- [ ] **ch1.bharadvaja_duel** — Vālmīki, after. Practice: "Well argued, both of you. Come back to the hermitage now …"
  - I heard you both, and I am pleased. Come back to the hermitage now, {player}. At the shrine you will recite the verse and make it whole again. → अहं युवयोः पाठं श्रुतवान्। अहं प्रसन्नः अस्मि। {player}, अधुना आश्रमं प्रत्यागच्छ। मन्दिरे त्वं श्लोकं पठिष्यसि। तदा सः पुनः पूर्णः भविष्यति।

Battle lines of the tutorial duel (`content/sa-battle.json`) and interface strings (`content/sa-ui-katha.json`):
- [ ] **kathaEchoIntro** — {x} recites the new verse with you. → {x.nom} त्वया सह नूतनं श्लोकं पठति।
- [ ] **kathaEchoModel** — {x} says a line: listen, then say it back. → {x.nom} एकं पादं वदति। शृणु, ततः तम् अनुवद।
- [ ] **kathaEchoSay** — {x} says the line back! → {x.nom} तं पादम् अनुवदति!
- [ ] **kathaEchoDown** — {x} says: well done! You know every line! → {x.nom} वदति — साधु! त्वं सर्वान् पादान् जानासि!
- [ ] **kathaEchoWin** — The lesson is complete! → पाठः पूर्णः!
- [ ] **katha.coach** — Listen to the line. Where a word is missing, tap the right one. → पादं शृणु। रिक्ते स्थाने उचितं पदं चिनु।
- [ ] **katha.echoBar** (label) — recites with → पाठः

Constructions to confirm first: स्मर / स्मराम / स्मरतु for "learn by heart" (कण्ठस्थं कुरु is not in the packs); अनुवद for "say it after me" (the oracle glosses अनु+वद् "to repeat"); एतस्मै मित्राय … तम् उपदिश (dative of the person taught); आवयोः मनसोः (dual locative, "in our two minds"); गुरवे वदाम for "let us tell the guru".

## Kathā battle tactics (v0.5a, fx-strat): model-written, machine-verified, awaiting human review

The owner found Bāla-kāṇḍa's fights repetitive ("just spamming Rāma with the āgneyāstra"). Kathā fights now have a light strategic layer, grounded in the text where it says something (`notes/katha.md` → "v0.5a"; `content/katha.json → tactics`, every entry with its source). Textual claims, checked against the vulgate as printed on sanskritdocuments.org / valmikiramayan.net (read 13 Nov 2026):
- Bāla 1.30.12–13: Mārīca, Subāhu and their followers pour streams of blood (रुधिरौघान् अवासृजन्); the altar is drenched → Subāhu's / Mārīca's warning "rain of blood on the sacrifice".
- Bāla 1.30.17–20: Rāma looses the Mānava astra (मानवं परमोदारमस्त्रं) at Mārīca's chest; it hurls him a full hundred yojanas into the ocean (सम्पूर्णं योजनशतं क्षिप्तः सागरसम्प्लवे), senseless but alive (शीतेषु) → Mārīca's fitting astra (Book 1 only).
- Bāla 1.30.21–22: the Āgneya at Subāhu's chest; pierced, he falls (स विद्धः प्रापतद्भुवि) → Subāhu's fitting astra. (1.30.23, the Vāyavya against the followers, is not encoded: no battle has those followers as foes.)
- Bāla 1.26.16–17: by māyā Tāṭakā rains stones (शिलावर्षेण); Rāma meets the rain of stones with a rain of arrows (शरवर्षेण) → her warning, answered also by Rāma's / Lakṣmaṇa's bāṇa.
- Bāla 1.27 (prose list): the Mānava is among the astras Viśvāmitra gives Rāma → granted with the Vāyavya in Kathā when Tāṭakā falls.
- Yuddha 6.108.1–4, 18: Mātali reminds Rāma of the Paitāmaha astra; the arrow Agastya gave pierces Rāvaṇa's heart → the brahmāstra is decisive once Rāvaṇa is worn down to half.
Everything else is game logic, not a claim about the text: Lakṣmaṇa's guard role (रक्षा), the verse shield, fatigue, element affinities. Every Sanskrit word verifies with the oracle (`sa-battle.test.ts`, `sambhashana.test.ts`, `sa-ui.test.ts`, `tactics.test.ts`). One new declension model (मातलि, muni-m, file 5). Nothing here has been reviewed by a human.

New name (`content/names.json`) and move forms (`content/sa-battle.json → forms.move`):
- [ ] **move.manavastra** — मानव "Manu's astra" (the adjective names the weapon, as for आग्नेय / वारुण / वायव्य); acc. मानवम् अस्त्रम्, ins. मानवेन अस्त्रेण (cf. 1.30.18 मानवेन).
- [ ] **move manavastra · description** (file 4) — The missile of Manu: it carries a foe far away, but does not take its life. → मानवम् अस्त्रम्। शत्रुं दूरे क्षिपति, किन्तु न हन्ति।

Battle lines (`content/sa-battle.json` templates):
- [ ] **kathaWarn** — {x} is about to use {m}! → {x.nom} {m.acc} प्रयोक्ष्यते! (the future of the "uses" line प्रयुङ्क्ते: reading the tense is the warning)
- [ ] **kathaWarnStones** — {x} is about to rain stones on you! → {x.nom} शिलानां वृष्टिं करिष्यति!
- [ ] **kathaStrikeStones** — {x} rains stones down! → {x.nom} शिलानां वृष्टिं करोति!
- [ ] **kathaWarnBlood** — {x} is about to rain blood on the sacrifice! → {x.nom} यज्ञे रक्तस्य वृष्टिं करिष्यति! (रक्त for the text's रुधिर, which is not in the packs)
- [ ] **kathaStrikeBlood** — {x} rains blood on the sacrifice! → {x.nom} यज्ञे रक्तस्य वृष्टिं करोति!
- [ ] **kathaBlunt** — The heroes were ready: the blow lands softly. → वीराः सज्जाः आसन्। अतः फलम् अल्पम्।
- [ ] **kathaTired** — The astra is tired. → अस्त्रं श्रान्तम्।
- [ ] **kathaShield** — {x} recites a line of verse: the heroes stand ready! → {x.nom} श्लोकस्य पादं पठति। वीराः सज्जाः!
- [ ] **kathaFitManava** — Rāma looses the Mānava astra at Mārīca's chest. It hurls him a hundred leagues away into the ocean: stunned, but alive! → रामः मारीचस्य वक्षसि मानवम् अस्त्रं क्षिपति। मारीचः दूरे सागरे पतति, किन्तु जीवति!
- [ ] **kathaFitAgneya** — Rāma looses the Āgneya astra at Subāhu's chest. Pierced, Subāhu falls to the earth! → रामः सुबाहोः वक्षसि आग्नेयम् अस्त्रं क्षिपति। सुबाहुः भुवि पतति!
- [ ] **kathaFitBrahma** — Rāma looses the brahmāstra: it pierces Rāvaṇa's heart! → रामः ब्रह्मास्त्रं क्षिपति। तत् रावणस्य हृदयं भिनत्ति!

Story lines (`content/sa-dialogue-5.json`; `{ "if": "style.katha" }` blocks of story-ch1.json and story-ch6.json):
- [ ] **ch1.tataka** — Viśvāmitra: By her illusion she will rain stones on you. When she makes ready, guard yourselves, or recite a verse! → सा मायया शिलानां वृष्टिं करिष्यति। तदा रक्षां कुरु, अथवा श्लोकं पठ!
- [ ] **ch1.tataka (onWin)** — Viśvāmitra: The same astra, loosed again and again, grows tired. Choose another astra! → एकम् एव अस्त्रं पुनः पुनः प्रयुक्तं श्राम्यति। अन्यत् अस्त्रं चिनु!
- [ ] **ch1.yajna** — Rāma: See, Lakshmana: the weapon of Manu will throw Maricha far into the ocean, and Agni's weapon will strike down Subahu. → लक्ष्मण, पश्य। मानवम् अस्त्रं मारीचं दूरे सागरे क्षेप्स्यति। आग्नेयम् अस्त्रं सुबाहुं हनिष्यति। (cf. 1.30.15, 20: पश्य लक्ष्मण …)
- [ ] **ch1.yajna** — Rāma: If they make ready to rain blood on the altar, raise your guard, brother! → यदि ते यज्ञे रक्तस्य वृष्टिं करिष्यन्ति, तदा रक्षां कुरु, भ्रातः!
- [ ] **ch6.ravana** — narration: Matali, the charioteer of the gods, whispers to Rama: when Ravana's strength wanes, loose Brahma's weapon. → मातलिः रामं वदति — यदा रावणः श्रान्तः भवति, तदा ब्रह्मास्त्रं क्षिप।

Interface strings (`content/sa-ui-katha.json`):
- [ ] **katha.fitTag** (label) — Fitting: {$x} → उचितम्: {$x} (on the foe card)
- [ ] **katha.tired** (label) — tired → श्रान्तम् (agrees with अस्त्रम्)
- [ ] **katha.shield** (label) — Recite a verse → श्लोकं पठ
- [ ] **katha.cover** (label) — {$who}: {$move} (slots only, e.g. लक्ष्मणः: रक्षा)

Constructions to confirm first: प्रयोक्ष्यते (future ātmanepada of प्र+युज्) as "is about to use"; वृष्टिं करोति / करिष्यति for "rains"; क्षिप् with the locative (वक्षसि … क्षिपति, सागरे क्षेप्स्यति) for "looses at / hurls into"; मानवम् अस्त्रम् as the weapon's name; मातलि (i-stem like मुनि).

## Kathā story set pieces (v0.5b WP-A–D): model-written, machine-verified, two model reviews, awaiting human review

Fifteen scenes that were narrated are now played in the Kathā journey (PRD → "Story set pieces"; plan `notes/v05b-plan.md`, each package's design and sources in `notes/v05b-a.md` … `v05b-d.md`). Every Sanskrit word verifies with the oracle (`sambhashana.test.ts`, `sa-ui.test.ts`, `sa-battle.test.ts`, `katha-content.test.ts`). Two independent model reviews: **rev1** (`notes/v05b-rev1.md`: 109 strings, 18 changed — 13 accuracy / meaning, 5 ease / consistency) and **rev2** (`notes/v05b-rev2.md`: the same 109 re-read with fresh eyes, no further error; it agrees with all of rev1's changes). One wording both reviewers discussed was applied by the integrator: Mārīca "dies" is ततः मारीचः प्राणान् त्यजति (rev2: प्राणाः is already the chapter's word, जटायोः प्राणाः अल्पाः), not जीवनं त्यजति.

Facts of the story checked against Vālmīki (vulgate numbering, valmikiramayan.net unless said):
- Araṇya 3.68.10 — Jaṭāyu: सीतामादाय वैदेहीं प्रयातो दक्षिणां दिशम् → his gasped answer "to the south" (दक्षिणां दिशं गतवान्). (rev1 first doubted it, citing only 3.67.20; corrected.)
- Sundara 5.1 (Surasā: grow, then thumb-sized), 5.47.23 (Hanumān darts between Akṣa's arrows like the wind, शरान्तरे मारुतवद्विनिष्पतन् → his rush of wind answers Akṣa's warned blow, game data in `katha.json → tactics.warnings`), 5.53 (Sītā prays to Agni: the fire does not burn him), 5.54 (the roofs: Prahasta's house first, Rāvaṇa's last, Vibhīṣaṇa's spared; sanskritdocuments.org prose summary).
- Yuddha 6.17–18 (Aṅgada's counsel, the vow अभयं सर्वभूतेभ्यो), 6.22.66–70, 74 (the bridge: 14 · 20 · 21 · 22 · 23 yojanas, a hundred in all; re-fetched by rev2), 6.104–105 (the charioteer drives Rāvaṇa back; Agastya comes), 6.107–108 (the heads, Mātali), 6.123 (the Puṣpaka return, the places in order).
- Bāla 1.4 (Kuśa and Lava sing the poem in Rāma's court; Vālmīki is not said to be there, so he stays at the āśrama in the game).
- Not from 6.22 (shared text from before v0.5, both journeys): Nala's "Rāma's name on every stone" is a later tradition.

For the human teacher (both reviewers' open items, merged):
1. **आ+रभ् in the verse chain** — transitive "…वर्णेन पादम् आरभस्व" and "पादस्य आरम्भे … अस्ति" (rev1; rev2 agrees) vs the intransitive आरभते of spoken Sanskrit. And वर्णः (not अक्षरम्) for the key, a bare consonant with virāma.
2. **मारीचः, रामस्य वाचा** (speaker label) and "सः शब्दः रामस्य शब्दः इव" — वाक् / शब्द for Vālmīki's स्वर (3.44), which the packs lack.
3. **आकाशेन** ("through the sky", instrumental of route) at Level 3, or आकाशमार्गेण?
4. **लघुः for "tiny" / "small as a thumb / a cat"** — Vālmīki's अङ्गुष्ठमात्रः / पृषदंशकमात्रः (5.2.49) are not in the packs.
5. **अहं प्रविशामि** (present for the near future, 3.3.131) vs प्रवेक्ष्यामि.
6. **यावत् … सन्ति, तावत् … जीविष्यति** — or echo Vālmīki's स्थास्यन्ति … प्रचरिष्यति (प्रचरिष्यति is not in the packs)?
7. **Mātali to Rāma in the 2nd person** (क्षिप, प्रतीक्षसे, as Vālmīki's त्वम् / प्रभो, 6.108) — or the house's respectful भवान् … क्षिपतु?
8. **"सर्वेषु काण्डेषु एकं पादं पठ"** ("one line in every book") — the distributive is only implied; एकैकम् / प्रत्येकम् are not in the packs.
9. **"रामः आसने उपविशति"** for "throne" — सिंहासन is not in the packs.
10. **Direct quotes without इति** (file 8 चिन्तयति, '…?'; file 9 रामः मन्त्रिणः पृच्छति, '…') follow the file-5 choice-prompt precedent; the v0.4.2 convention closes every quote with इति. One rule for both, please.
11. **Digits in Nala's line** (प्रथमे दिने १४ योजनानि। ततः २०, २१, २२, २३ च।) mirror the puzzle's stone labels; files 1–5 write numbers as words.
12. **The genitive of material** (स्वर्णस्य मृगः, and भवनानि / रथः in files 2, 3, 5, 8; rev2) — स्वर्णमय or a compound would be classical; neither is in the packs.
13. **Outside v0.5b, pre-existing** (rev1): sa-dialogue-2 "एकः एकः वानरः आत्मनः बलं वदति" — the doubled एक should be एकैकः (8.1.9).

Story lines, books 1–3 (WP-A; `content/sa-dialogue-6.json`):
- [ ] **ch1.krauncha · person.valmiki (Kathā)** — Say the first quarter with me, {player}. → {player}, मया सह प्रथमं पादं वद।
- [ ] **ch2.guha · narration (Kathā)** — In mid-stream Sita bows to the Ganga and prays. → नद्याः मध्ये सीता गङ्गां नमस्कृत्य वदति।
- [ ] **ch2.guha · person.sita (Kathā)** — Mother Ganga, guard Rama. Fourteen years we will live in the forest. Bring us home again, and I will worship you. → हे गङ्गे मातः, रामं रक्ष। वयं चतुर्दश वर्षाणि वने वत्स्यामः। ततः अस्मान् पुनः गृहं नय। तदा अहं त्वां पूजयिष्यामि।
- [ ] **ch3.maricha_deer · narration (Kathā)** — Struck by Rama's arrow, the deer falls. There lies Maricha, in his true form. → रामस्य बाणेन मृगः पतति। सः मृगः न, सः मारीचः एव।
- [ ] **ch3.maricha_deer · speaker title (label) (Kathā)** — Maricha, in Rama's voice → मारीचः, रामस्य वाचा
- [ ] **ch3.maricha_deer · Maricha, in Rama's voice (Kathā)** — "Ha Sita! Ha Lakshmana!" → हा सीते! हा लक्ष्मण!
- [ ] **ch3.maricha_deer · narration (Kathā)** — Then Maricha dies. But his cry, in Rama's own voice, rings on through the forest. → ततः मारीचः प्राणान् त्यजति। परन्तु तस्य शब्दः वने सर्वत्र गच्छति। सः शब्दः रामस्य शब्दः इव।
- [ ] **ch3.jatayu · choice prompt (Kathā)** — Jatayu has breath for only a few words. What will you ask him? → जटायोः प्राणाः अल्पाः। त्वं किं पृच्छसि?
- [ ] **ch3.jatayu · choice option (player's reply, Kathā)** — Who took Sita? → सीतां कः हृतवान्?
- [ ] **ch3.jatayu · choice option (player's reply, Kathā)** — Which way did he take her? → सः तां कुत्र नीतवान्?
- [ ] **ch3.jatayu · choice option (player's reply, Kathā)** — Who are you? → भवान् कः?
- [ ] **ch3.jatayu · person.jatayu (Kathā)** — Ravana. The king of the rakshasas. → रावणः। राक्षसानां राजा।
- [ ] **ch3.jatayu · person.jatayu (Kathā)** — Through the sky... to the south. → आकाशेन… दक्षिणां दिशं गतवान्।
- [ ] **ch3.jatayu · narration (Kathā)** — Jatayu only gasps. His breath is almost gone. → जटायुः किम् अपि न वदति। तस्य प्राणाः अल्पाः।

Story lines, book 4 (WP-C; `content/sa-dialogue-7.json`):
- [ ] **ch4.mendicant · person.hanuman (Kathā)** — Let us play a game of verses, friend: a chain of lines. → मित्र, आवां पादानां क्रीडां करवाव।
- [ ] **ch4.mendicant · person.hanuman (Kathā)** — I say a line. You answer with a line that begins with my line's last sound. → अहं पादं वदामि। मम पादस्य अन्तिमेन वर्णेन त्वं पादम् आरभस्व।
- [ ] **ch4.mendicant · person.hanuman (Kathā)** — A fine chain! You know the verses line by line. → साधु! त्वं श्लोकानां पादान् सम्यक् जानासि।
- [ ] **ch4.mahendra_enter · objective (Kathā)** — Ask each vanara how far he can leap. → सर्वान् वानरान् पृच्छतु। कः कति योजनानि उत्पतितुं शक्नोति?
- [ ] **ch4.vanara_gaja · narration (Kathā)** — Every vanara has spoken. None can leap a hundred yojanas. → सर्वे वानराः उक्तवन्तः। तेषु कः अपि शतं योजनानि उत्पतितुं न शक्नोति।
- [ ] **ch4.jambavan_speech · person.angada (Kathā)** — First hear every vanara: how far can each one leap? → प्रथमं सर्वेषां वानराणां वचनं शृणु। कः कति योजनानि उत्पतितुं शक्नोति?

Story lines, book 5 (WP-B; `content/sa-dialogue-8.json`):
- [ ] **ch5.leap_start · narration (Kathā)** — Only Hanuman can make this crossing. You ride on his shoulder and guide his steps. → केवलं हनुमान् समुद्रं तरितुं शक्नोति। त्वं तस्य स्कन्धे उपविशसि। त्वं तस्मै मार्गं कथयसि।
- [ ] **ch5.surasa · person.hanuman (Kathā)** — Then open your mouth wide, and I will enter. → तर्हि भवती मुखं विशालं करोतु। अहं प्रविशामि।
- [ ] **ch5.surasa · narration (Kathā)** — Surasa opens her mouth wide, and Hanuman grows. She opens it wider, and he grows again. → सुरसा मुखं विशालं करोति। हनुमान् वर्धते। सा मुखं पुनः विशालं करोति। सः पुनः वर्धते।
- [ ] **ch5.surasa · choice prompt (Kathā)** — Her mouth is vast now. What should Hanuman do? → अधुना तस्याः मुखं बहु विशालम् अस्ति। हनुमान् किं करोतु?
- [ ] **ch5.surasa · choice option (player's reply, Kathā)** — Grow larger again! → पुनः वर्धताम्!
- [ ] **ch5.surasa · choice option (player's reply, Kathā)** — Become tiny! → अतीव लघुः भवतु!
- [ ] **ch5.surasa · narration (Kathā)** — Hanuman grows once more, and Surasa only opens her mouth wider. She waits. → हनुमान् पुनः वर्धते। सुरसा अपि मुखं पुनः विशालं करोति। सा प्रतीक्षते।
- [ ] **ch5.surasa · narration (Kathā)** — Suddenly Hanuman becomes as small as a thumb. → सहसा हनुमान् अङ्गुष्ठः इव लघुः भवति।
- [ ] **ch5.city_enter · narration (Kathā)** — Lamps light the streets, and guards watch the light. Lead Hanuman through the dark. → वीथिषु दीपाः प्रकाशन्ते। सैनिकाः प्रकाशं पश्यन्ति। त्वं हनुमन्तम् अन्धकारे एव नय।
- [ ] **ch5.patrol_a · narration (Kathā)** — A patrol marches past the palace gate. Small as a cat, Hanuman waits in the dark, and they never see him. → निशाचराः प्रासादस्य द्वारस्य पुरतः गच्छन्ति। हनुमान् मार्जारः इव लघुः अन्धकारे तिष्ठति। ते तं न पश्यन्ति।
- [ ] **ch5.patrol_b · narration (Kathā)** — The guard peers into the dark, but sees nothing. → सैनिकः अन्धकारं पश्यति, परन्तु किम् अपि न पश्यति।
- [ ] **ch5.patrol_c · narration (Kathā)** — The guards at the garden wall look the other way. Hanuman slips past them. → उद्यानस्य भित्तेः पार्श्वे सैनिकाः अन्यां दिशं पश्यन्ति। हनुमान् शनैः अग्रे गच्छति।
- [ ] **ch5.sita · narration (Kathā)** — The fire has not touched the grove. Sita is unharmed. → अशोकवनिकायाम् अग्निः न आगतवान्। सीतायाः किम् अपि न अभवत्।
- [ ] **ch5.sita · person.sita (Kathā)** — Hanuman, you are unhurt! Go now, and bring Rama soon. → हनुमन्, भवान् कुशलः अस्ति! अधुना गच्छतु। रामं शीघ्रम् आनयतु।
- [ ] **ch5.sita · narration (Kathā)** — Hanuman bows to her once more. Then he climbs a hill by the sea and leaps for home. → हनुमान् पुनः सीतां प्रणमति। ततः सः समुद्रस्य तीरे पर्वतम् आरोहति। सः पुनः समुद्रं तरितुम् उत्पतति।
- [ ] **ch5.sita · narration (Kathā)** — From the branches, Hanuman sings Rama's story softly, and you sing it with him. → हनुमान् शाखासु स्थित्वा मन्दं रामस्य कथां गायति। त्वम् अपि तेन सह गायसि।
- [ ] **ch5.sita · narration (Kathā)** — The princes of Ayodhya go to the forest. → अयोध्यायाः राजकुमारौ वनं गच्छतः।
- [ ] **ch5.sita · narration (Kathā)** — A golden deer appears in the forest. → वने स्वर्णस्य मृगः आगच्छति।
- [ ] **ch5.sita · narration (Kathā)** — Ravana carries Sita away, and Rama searches for her. → रावणः सीतां हरति। रामः तां मार्गयति।
- [ ] **ch5.sita · narration (Kathā)** — Rama finds a friend in Sugriva, and the search begins. → सुग्रीवः रामस्य मित्रम् अभवत्। ततः सर्वे सीतां मार्गयन्ति।
- [ ] **ch5.aksha · narration (Kathā)** — But the fire does not burn him, for Sita has prayed to Agni for his safety. Hanuman breaks free and springs onto the roofs. → परन्तु अग्निः तं न दहति, यतः सीता अग्निं तस्य कुशलं याचितवती। हनुमान् मुक्तः भवति, भवनानाम् उपरि उत्पतति च।
- [ ] **ch5.aksha · objective (Kathā)** — Leap from roof to roof with Hanuman's blazing tail. → हनुमतः पुच्छं ज्वलति। भवनात् भवनम् उत्पततु।
- [ ] **ch5.seen_s_n · narration (Kathā)** — A guard turns toward the light! Hanuman slips back into the shadows. → एकः सैनिकः प्रकाशं प्रति परिवर्तते! हनुमान् शीघ्रं पुनः अन्धकारं गच्छति।
- [ ] **ch5.roof_1 · narration (Kathā)** — Prahasta's house catches fire! → प्रहस्तस्य गृहं ज्वलति!
- [ ] **ch5.roof_1 · narration (Kathā)** — Only Vibhishana's house is spared. → केवलं विभीषणस्य गृहं न ज्वलति।
- [ ] **ch5.roof_1 · narration (Kathā)** — Hanuman dips his tail in the sea, and the fire goes out. Then fear grips him: is Sita safe? → हनुमान् पुच्छं समुद्रे स्थापयति। अग्निः शाम्यति। ततः सः भीतः चिन्तयति, 'सीतायाः कुशलं वा?'
- [ ] **ch5.roof_1 · objective (Kathā)** — Go to Sita in the Ashoka grove. → अशोकवनिकायां सीतां पश्यतु।
- [ ] **ch5.roof_2 · narration (Kathā)** — Kumbhakarna's mansion catches fire! → कुम्भकर्णस्य भवनं ज्वलति!
- [ ] **ch5.roof_3 · narration (Kathā)** — Mansion after mansion goes up in flames. → अग्निः भवनात् भवनं गच्छति।
- [ ] **ch5.roof_4 · narration (Kathā)** — Last of all, Ravana's own palace catches fire! → अन्ते रावणस्य प्रासादः अपि ज्वलति!

Story lines, book 6 (WP-D; `content/sa-dialogue-9.json`):
- [ ] **ch6.angada_shore · person.angada (Kathā) — Yuddha 6.17: Aṅgada's counsel — one who comes from the enemy must be tested first** — He has come from our enemy. Let Rama test him first. → सः अस्माकं शत्रोः पक्षात् आगतवान्। प्रथमं रामः तं परीक्षताम्।
- [ ] **ch6.angada_shore · objective (Kathā)** — Return to Vibhishana and hear what Rama decides. → विभीषणं प्रति गच्छतु। रामस्य वचनं शृणोतु।
- [ ] **ch6.vibhishana_refuge · narration (Kathā)** — Vibhishana waits. First ask Angada for his counsel. → विभीषणः प्रतीक्षते। प्रथमम् अङ्गदस्य मतं पृच्छ।
- [ ] **ch6.vibhishana_refuge · narration (Kathā)** — Rama turns to his counsellors: "What do you say?" → रामः मन्त्रिणः पृच्छति, 'भवन्तः किं वदन्ति?'
- [ ] **ch6.vibhishana_refuge · objective (Kathā)** — Ask Angada for his counsel. → अङ्गदस्य मतं पृच्छतु।
- [ ] **ch6.vibhishana_refuge · person.rama (Kathā) — Yuddha 6.18.34: आनयैनं … दत्तमस्याभयं मया (Rāma: bring him; I have given him fearlessness)** — Go, bring him to me. Say my vow to him. → गच्छ, तम् अत्र आनय। मम व्रतं तस्मै वद।
- [ ] **ch6.vibhishana_refuge · narration (Kathā)** — Vibhishana hears the vow and comes down from the sky. → विभीषणः व्रतं श्रुत्वा आकाशात् अवतरति।
- [ ] **ch6.nala · Nala (Kathā)** — Let every stone sit true. Then the bridge will reach Lanka. → सर्वाः शिलाः सम्यक् तिष्ठन्तु। तदा सेतुः लङ्कां प्राप्स्यति।
- [ ] **ch6.nala · narration (Kathā) — Yuddha 6.22.66–70 (14, 20, 21, 22, 23 yojanas a day), 6.22.74 (a hundred long); valmikiramayan.net** — Fourteen yojanas on the first day; then twenty, twenty-one, twenty-two and twenty-three. A hundred yojanas in all. → प्रथमे दिने १४ योजनानि। ततः २०, २१, २२, २३ च। एवं सेतुः शतं योजनानि दीर्घः।
- [ ] **ch6.ravana · narration (Kathā) — Yuddha 6.123 (Rāma shows Sītā Laṅkā, the setu, Kiṣkindhā, Ṛśyamūka, Pampā, Janasthāna, Pañcavaṭī … Ayodhyā)** — From the Pushpaka, Rama shows Sita the places of their story. → पुष्पकात् रामः सीतायै कथायाः स्थानानि दर्शयति।
- [ ] **ch6.ravana · choice prompt (Kathā)** — Rama asks you: "Where did we hear this verse?" → रामः त्वां पृच्छति, 'एतं श्लोकं वयं कुत्र श्रुतवन्तः?'
- [ ] **ch6.ravana · choice option (player's reply, Kathā)** — In Kishkindha. → किष्किन्धायाम्।
- [ ] **ch6.ravana · choice option (player's reply, Kathā)** — In Lanka. → लङ्कायाम्।
- [ ] **ch6.ravana · choice option (player's reply, Kathā)** — In Ayodhya. → अयोध्यायाम्।
- [ ] **ch6.ravana · person.rama (Kathā)** — Not there. Look down again. → तत्र न। पुनः अधः पश्य।
- [ ] **ch6.ravana · choice option (player's reply, Kathā)** — On the ocean shore. → समुद्रस्य तीरे।
- [ ] **ch6.ravana · choice option (player's reply, Kathā)** — By Lake Pampa. → पम्पायाः तीरे।
- [ ] **ch6.ravana · choice option (player's reply, Kathā)** — On Chitrakuta. → चित्रकूटे।
- [ ] **ch6.ravana · choice option (player's reply, Kathā)** — At Panchavati. → पञ्चवट्याम्।
- [ ] **ch6.ravana · choice option (player's reply, Kathā)** — On Rishyamuka hill. → ऋश्यमूके।
- [ ] **ch6.epilogue_valmiki · person.valmiki (Kathā) — Bāla 1.4.3–6, 12** — Kusha and Lava, two boys of this ashrama, have learned my whole story. → कुशः लवः च अस्य आश्रमस्य बालकौ। तौ मम सर्वां कथां पठितवन्तौ।
- [ ] **ch6.epilogue_valmiki · person.valmiki (Kathā)** — Go with them to Ayodhya, and sing it before Rama. → ताभ्यां सह अयोध्यां गच्छ। रामस्य पुरतः तां गाय।
- [ ] **ch6.epilogue_valmiki · narration (Kathā) — Bāla 1.4.27–30** — The twins sing in the streets of Ayodhya. Rama hears them and brings them into his palace. → कुशः लवः च अयोध्यायाः मार्गेषु गायतः। रामः तौ श्रुत्वा प्रासादं नयति।
- [ ] **ch6.epilogue_valmiki · narration (Kathā) — Bāla 1.4.30–31** — Rama sits on his throne. His brothers and ministers are with him. → रामः आसने उपविशति। तेन सह भ्रातरः मन्त्रिणः च सन्ति।
- [ ] **ch6.epilogue_valmiki · person.rama (Kathā) — Bāla 1.4.32–35 (Rāma to Lakṣmaṇa, Śatrughna and Bharata)** — Brothers, listen. These two sing a great story. → हे भ्रातरः, शृणुत। एतौ महतीं कथां गायतः।
- [ ] **ch6.epilogue_valmiki · narration (Kathā)** — {player}, sing with them: say one line in every book. → {player}, ताभ्यां सह गाय। सर्वेषु काण्डेषु एकं पादं पठ।
- [ ] **ch6.epilogue_valmiki · narration (Kathā)** — Kusha and Lava sing. → कुशः लवः च गायतः।
- [ ] **ch6.epilogue_valmiki · narration (Kathā) — Bāla 1.4.36** — Rama listens with his brothers. His whole mind is on the story. → रामः भ्रातृभिः सह शृणोति। तस्य मनः कथायाम् एव अस्ति।
- [ ] **ch6.epilogue_valmiki · person.valmiki (Kathā) — Bāla 2.36–37 (Brahmā's blessing to Vālmīki: यावत् स्थास्यन्ति गिरयः सरितश्च महीतले …), recalled by Vālmīki** — As long as there are mountains and rivers, Rama's story will live. → यावत् पर्वताः नद्यः च सन्ति, तावत् रामस्य कथा जीविष्यति।

Interface strings (`content/sa-ui-scene.json`, story recitations):
- [ ] **scene.your** (label) — Your line → तव पादः
- [ ] **scene.syllables** (label) — {$n} syllables → {$n} अक्षराणि

Interface strings (`content/sa-ui-chain.json`, the verse chain):
- [ ] **chain.badge** (label) — Verse chain → पादानां क्रीडा
- [ ] **chain.last** (label) — last sound → अन्तिमः वर्णः
- [ ] **chain.prompt** — Which line begins with this sound? → कस्य पादस्य आरम्भे अयं वर्णः अस्ति?
- [ ] **chain.any** — No line begins with this sound. Say any line! → अयं वर्णः कस्य अपि पादस्य आरम्भे न अस्ति। कम् अपि पादं वद!
- [ ] **chain.chips** (label) — three lines → त्रयः पादाः
- [ ] **chain.srTurn** — {$who} says: {$line}. The last sound: {$key}. Which line begins with it? → {$who} वदति — {$line}। अन्तिमः वर्णः — {$key}। कस्य पादस्य आरम्भे अयं वर्णः अस्ति?
- [ ] **chain.srAny** — {$who} says: {$line}. No line begins with its last sound: say any line! → {$who} वदति — {$line}। तस्य अन्तिमः वर्णः कस्य अपि पादस्य आरम्भे न अस्ति। कम् अपि पादं वद!
- [ ] **chain.srRight** — The right line: {$line}. → उचितः पादः — {$line}।

Interface strings (`content/sa-ui-setu.json`, Nala's bridge):
- [ ] **setu.title** (label) — Nala's bridge → नलस्य सेतुः
- [ ] **setu.help** — Tap a stone to turn it. Make the bridge whole. → शिलां स्पृश, सा परिवर्तते। सेतुं पूर्णं कुरु।
- [ ] **setu.hintSay** — Nala points at a stone. → नलः एकां शिलां दर्शयति।
- [ ] **setu.whole** — The bridge is whole! It reaches Laṅkā. → सेतुः पूर्णः! सः लङ्कां प्राप्तवान्।
- [ ] **setu.ask** (label) — Ask Nala → नलं पृच्छ
- [ ] **setu.stone** (label) — Stone {$n}: {$y} yojanas → शिला {$n}: {$y} योजनानि
- [ ] **setu.set** (label) — set true → सम्यक् स्थिता
- [ ] **setu.yojanas** (label) — {$n} yojanas → {$n} योजनानि
- [ ] **setu.days** (label) — Five days → पञ्च दिनानि
- [ ] **setu.built** (label) — Bridge: {$n} / {$t} yojanas → सेतुः: {$n} / {$t} योजनानि
- [ ] **setu.shore** (label) — Shore → तीरम्
- [ ] **setu.lanka** (label) — Laṅkā → लङ्का
- [ ] **setu.endAll** (label) — Every verse of the journey → यात्रायाः सर्वे श्लोकाः

Battle lines (`content/sa-battle.json` templates, WP-C):
- [ ] **kathaChainRule** — {x} says a line of verse. Answer with a line that begins with its last sound! → {x.nom} श्लोकस्य पादं वदति। तस्य अन्तिमेन वर्णेन त्वं पादम् आरभस्व!
- [ ] **kathaChainSays** — {x} says a line of verse. → {x.nom} श्लोकस्य पादं वदति।
- [ ] **kathaChainStumped** — {x} thinks, but no line begins with that sound! The link lands with extra force. → {x.nom} चिन्तयति। किन्तु सः वर्णः कस्य अपि पादस्य आरम्भे न अस्ति! अतः फलम् अधिकम्।
- [ ] **kathaHeads** — A head of {n:enemy.ravana} falls, but a new head rises in its place! → रावणस्य एकं शिरः पतति। किन्तु तस्य स्थाने नूतनं शिरः उद्भवति!
- [ ] **kathaMatali** — Matali calls to {n:ally.rama}: why wait? Loose Brahma's weapon now! → मातलिः रामं वदति — हे राम, किमर्थं प्रतीक्षसे? अधुना ब्रह्मास्त्रं क्षिप!

Names (`content/names.json`, WP-D):
- [ ] **person.kusha** — Kuśa, son of Rāma, Vālmīki's pupil → कुश
- [ ] **person.lava** — Lava, son of Rāma, Vālmīki's pupil → लव

## Āditya-hṛdayam cutscene (v0.5b WP-E): text chosen from four witnesses, English and narration model-written, awaiting human review

The owner's homage to Rāma learning the hymn from Agastya in the battle with Rāvaṇa (Yuddha 6.105.1–31, vulgate / Gita Press numbering; 6.107 in the IIT Kanpur text). A non-interactive 3D cutscene recites all 31 verses with an English line each (`content/aditya-hridayam.json`, `view-cutscene.tsx`, `notes/v05b-e.md`). Machine checks (`cutscene.test.ts`): every pāda scans (checkAnustubh; verse 31 puṣpitāgrā), every half-verse rebuilds from its padaccheda with joinSandhi (three printed pāda-break hiatuses noted), every difference of every witness is listed and explained, verse 4 equals the game verse `s-aditya-hrdayam`, every narration and interface word verifies with the oracle. Nothing here has been reviewed by a human.

Second review (v05b-rev2, `notes/v05b-rev2.md`): all 31 verses re-fetched from valmikiramayan.net and, in full, from the sanskritdocuments.org stotra, and compared pāda by pāda: the chosen text and every padaccheda stand. Applied after it: verse 1's English (the one who sees Rāma and Rāvaṇa is Agastya — दृष्ट्वा shares the agent of अब्रवीत् in verse 2), verse 7 "protects" (पाति), seven more stotra differences listed (two readings, 23 and 27, below), and narration 1 (भवति for चलति).

Text decisions to confirm (witnesses: vr = valmikiramayan.net, iitk = IIT Kanpur text via vedapath.app, sd = sanskritdocuments.org stotra, gm = greenmesg.org stotra; the rule is in the JSON `choice`):
- [ ] **6.105.2** — chosen उपागम्याब्रवीद् (against vr: उपगम्याब्रवीद्). उपागम्य in IITK, the sanskritdocuments.org stotra and greenmesg.org; valmikiramayan.net alone has उपगम्य (both scan). Majority reading.
- [ ] **6.105.3** — chosen विजयिष्यसे (against gm: विजयिष्यसि, sd: विजयिष्यसि). Both Rāmāyaṇa texts (valmikiramayan.net, IITK) read the middle ending -से (vi + √ji takes the middle voice); the stotra prints read विजयिष्यसि. Rāmāyaṇa reading kept.
- [ ] **6.105.4** — chosen अक्षय्यं (against sd: अक्षयं). Same choice as the game verse s-aditya-hrdayam (shlokas-2.json): अक्षय्यं in valmikiramayan.net, IITK, greenmesg.org and hindunet; the sanskritdocuments.org stotra file reads अक्षयं (checked 2026-11-11).
- [ ] **6.105.5** — chosen सर्वमङ्गलमङ्गल्यं (against gm: सर्वमङ्गलमाङ्गल्यं, sd: सर्वमङ्गलमाङ्गल्यं). मङ्गल्य (auspicious) in both Rāmāyaṇa texts; the stotra prints have the synonym माङ्गल्य. Both scan.
- [ ] **6.105.8** — chosen महेन्द्रो (against gm: माहेन्द्रो). महेन्द्र in valmikiramayan.net, IITK and the sanskritdocuments.org stotra; greenmesg.org alone has माहेन्द्रो.
- [ ] **6.105.9** — chosen वसवः साध्या अश्विनौ (against gm: वसवस्साध्याः ह्यश्विनौ, sd: वसवः साध्या ह्यश्विनौ). the stotra prints add हि (ह्यश्विनौ): greenmesg.org (which also keeps the visarga of साध्याः) and sanskritdocuments.org; both Rāmāyaṇa texts have no हि. Both scan.
- [ ] **6.105.9** — chosen प्रजाः प्राण (against gm: प्रजाप्राणा, sd: प्रजाप्राण). the stotra prints make one compound: greenmesg.org प्रजाप्राणा, sanskritdocuments.org प्रजाप्राण; both Rāmāyaṇa texts: प्रजाः प्राण (from प्राणः before ऋ).
- [ ] **6.105.10** — chosen हिरण्यरेता (against gm: हिरण्यरेतो). हिरण्यरेताः (nom. of हिरण्यरेतस्, visarga dropped before द) in valmikiramayan.net, IITK and the sanskritdocuments.org stotra; greenmesg.org: हिरण्यरेतो.
- [ ] **6.105.11** — chosen मार्तण्डकोऽंशुमान् (against gm: मार्ताण्ड अंशुमान्, sd: मार्ताण्ड). Both Rāmāyaṇa texts: मार्तण्डकः + अंशुमान् → मार्तण्डकोऽंशुमान्; the stotra prints read मार्ताण्ड अंशुमान् (with a hiatus).
- [ ] **6.105.12** — chosen तपनो भास्करो (against vr: तपनोऽहस्करो). तपनो भास्करो in IITK and both stotra prints; valmikiramayan.net alone has तपनोऽहस्करो (“maker of day”). Both scan; the two Rāmāyaṇa texts differ, so the reading of the other witnesses decides.
- [ ] **6.105.17** — chosen हर्यश्वाय (against vr: हर्याश्वाय). हर्यश्व (हरि + अश्व) in IITK and both stotra prints; valmikiramayan.net: हर्याश्वाय.
- [ ] **6.105.18** — chosen मार्ताण्डाय (against vr: प्रचण्डाय). मार्ताण्डाय in IITK and both stotra prints (greenmesg.org spells मार्तण्डाय); valmikiramayan.net: प्रचण्डाय (“the fierce”). The two Rāmāyaṇa texts differ, so the other witnesses decide. The sanskritdocuments.org stotra prints मार्ताण्डाय and notes “or मार्तण्डाय, प्रचण्डाय” in its margin.
- [ ] **6.105.18** — chosen मार्ताण्डाय नमोऽस्तु ते (against gm: मार्तण्डाय नमो नमः, sd: मार्ताण्डाय नमो नमः). Both Rāmāyaṇa texts end the verse नमोऽस्तु ते; the stotra prints have नमो नमः (and greenmesg.org spells मार्तण्ड).
- [ ] **6.105.19** — chosen सूर्यायादित्यवर्चसे (against gm: सूर्यादित्यवर्चसे). greenmesg.org: सूर्यादित्यवर्चसे, one syllable short of the pāda; valmikiramayan.net, IITK and the sanskritdocuments.org stotra have सूर्याय.
- [ ] **6.105.21** — chosen हरये (against gm: वह्नये, sd: वह्नये). Both Rāmāyaṇa texts: हरये; the stotra prints: वह्नये (“to fire”). The sanskritdocuments.org stotra itself notes “or हरये विश्वकर्मणे”.
- [ ] **6.105.23** — chosen एष चैवाग्निहोत्रं (against sd: एष एवाग्निहोत्रं). the sanskritdocuments.org stotra alone: एष एवाग्निहोत्रं (एव for च एव; both scan); valmikiramayan.net, IITK and greenmesg.org: एष चैवाग्निहोत्रं. Rāmāyaṇa reading kept.
- [ ] **6.105.24** — chosen वेदाश्च (against vr: देवाश्च). वेदाश्च in both stotra prints and (spelled वेदश्च) in IITK; valmikiramayan.net: देवाश्च (“the gods”). The two Rāmāyaṇa texts differ, so the other witnesses decide.
- [ ] **6.105.24** — chosen सर्वेषु परमप्रभुः (against gm: सर्व एष रविः प्रभुः, sd: एष रविः प्रभुः). Both Rāmāyaṇa texts: सर्वेषु परमप्रभुः; the stotra prints: सर्व एष रविः प्रभुः.
- [ ] **6.105.27** — chosen जगाम स (against gm: जगाम च, sd: जगाम च). Both Rāmāyaṇa texts: स (“he”); the stotra prints: च (“and”).
- [ ] **6.105.27** — chosen ततोऽगस्त्यो (against sd: तदाऽगस्त्यो). the sanskritdocuments.org stotra: तदाऽगस्त्यो (“then”, same sense); valmikiramayan.net, IITK and greenmesg.org: ततोऽगस्त्यो. Rāmāyaṇa reading kept.
- [ ] **6.105.30** — chosen युद्धार्थं (against gm: युद्धाय, sd: युद्धाय). Both Rāmāyaṇa texts: युद्धार्थं (“for battle”); the stotra prints: युद्धाय (same sense).
- [ ] **6.105.11** — मार्तण्डकोऽंशुमान् is printed with the anusvāra after the avagraha (as vr and joinSandhiDeva write it); many prints write कोंऽशुमान्.
- [ ] **Metre** — vipulās: 5.3, 7.3, 16.1, 30.3 (na), 12.1, 16.3 (bha); 10.4 हिरण्यरेता दिवाकरः has 9 syllables in every source (not emended). The sanskritdocuments.org stotra's margin offers “or भानुर्विश्वरेता”, which would scan (विश्वरेता दिवाकरः); no main text reads it.
- [ ] **Pāda-break hiatus** — 7 (…गणान् | लोकान्), 13 (…भेदी | ऋग्यजुः…), 17 (सहस्रांशो | आदित्याय): printed without sandhi in both Rāmāyaṇa texts and greenmesg.org, so left as printed; the sanskritdocuments.org stotra alone joins 7 as …गणाँल्लोकान् (second review, v05b-rev2).
- [ ] **Critical edition** — NOT VERIFIED: the Baroda edition is reported to keep the hymn out of the constituted text (Yuddhakāṇḍa appendix); please confirm with the printed volume.

English (original, one or two plain lines per verse; verse 4 is the game verse’s English):
- [ ] **6.105.1** — ततो युद्धपरिश्रान्तं · समरे चिन्तया स्थितम् · रावणं चाग्रतो दृष्ट्वा · युद्धाय समुपस्थितम् → Then the sage saw Rāma standing on the battlefield, worn out by the fighting and deep in thought, and Rāvaṇa before him, ready to fight.
- [ ] **6.105.2** — दैवतैश्च समागम्य · द्रष्टुमभ्यागतो रणम् · उपागम्याब्रवीद्रामम् · अगस्त्यो भगवान् ऋषिः → The holy sage Agastya, who had come with the gods to watch the battle, went up to Rāma and said:
- [ ] **6.105.3** — राम राम महाबाहो · शृणु गुह्यं सनातनम् · येन सर्वानरीन्वत्स · समरे विजयिष्यसे → “Rāma, Rāma, mighty-armed, listen to this eternal secret, my child, by which you will defeat all your enemies in battle.
- [ ] **6.105.4** — आदित्यहृदयं पुण्यं · सर्वशत्रुविनाशनम् · जयावहं जपेन्नित्यम् · अक्षय्यं परमं शिवम् → One should always recite the holy Āditya-hṛdaya, which destroys every enemy and brings victory: it is imperishable, supreme and auspicious.
- [ ] **6.105.5** — सर्वमङ्गलमङ्गल्यं · सर्वपापप्रणाशनम् · चिन्ताशोकप्रशमनम् · आयुर्वर्धनमुत्तमम् → It is the most auspicious of all blessings and destroys every sin; it calms worry and grief, and it is the best way to long life.
- [ ] **6.105.6** — रश्मिमन्तं समुद्यन्तं · देवासुरनमस्कृतम् · पूजयस्व विवस्वन्तं · भास्करं भुवनेश्वरम् → Worship the Sun, crowned with rays, as he rises, honoured by gods and asuras alike: Vivasvān, the maker of light, the lord of the worlds.
- [ ] **6.105.7** — सर्वदेवात्मको ह्येष · तेजस्वी रश्मिभावनः · एष देवासुरगणान् · लोकान् पाति गभस्तिभिः → He is the self of all the gods, radiant, the source of rays. With his rays he protects the hosts of gods and asuras, and all the worlds.
- [ ] **6.105.8** — एष ब्रह्मा च विष्णुश्च · शिवः स्कन्दः प्रजापतिः · महेन्द्रो धनदः कालो · यमः सोमो ह्यपांपतिः → He is Brahmā and Viṣṇu, Śiva, Skanda and Prajāpati; he is great Indra, Kubera the giver of wealth, Time, Yama, Soma and the lord of the waters.
- [ ] **6.105.9** — पितरो वसवः साध्या · अश्विनौ मरुतो मनुः · वायुर्वह्निः प्रजाः प्राण · ऋतुकर्ता प्रभाकरः → He is the ancestors, the Vasus, the Sādhyas, the two Aśvins, the Maruts and Manu; he is wind and fire, all creatures and their breath, the maker of the seasons, the maker of light.
- [ ] **6.105.10** — आदित्यः सविता सूर्यः · खगः पूषा गभस्तिमान् · सुवर्णसदृशो भानुर् · हिरण्यरेता दिवाकरः → He is Āditya, Savitṛ, Sūrya, the traveller of the sky, Pūṣan, the lord of rays; golden, the shining one, whose seed is gold, the maker of day.
- [ ] **6.105.11** — हरिदश्वः सहस्रार्चिः · सप्तसप्तिर्मरीचिमान् · तिमिरोन्मथनः शम्भुस् · त्वष्टा मार्तण्डकोऽंशुमान् → He has green horses and a thousand flames, seven steeds and countless rays; he scatters the darkness; he is Śambhu, Tvaṣṭṛ, Mārtaṇḍa, the radiant one.
- [ ] **6.105.12** — हिरण्यगर्भः शिशिरस् · तपनो भास्करो रविः · अग्निगर्भोऽदितेः पुत्रः · शङ्खः शिशिरनाशनः → He is the golden womb, the gentle one and the burning one, the maker of light, Ravi; he carries fire within; he is Aditi’s son, Śaṅkha, who ends the cold.
- [ ] **6.105.13** — व्योमनाथस्तमोभेदी · ऋग्यजुःसामपारगः · घनवृष्टिरपां मित्रो · विन्ध्यवीथीप्लवङ्गमः → Lord of the sky, he pierces the darkness; he has mastered the Ṛg, Yajus and Sāma; he sends the heavy rain, he is the friend of the waters, and he speeds along the Vindhya’s path.
- [ ] **6.105.14** — आतपी मण्डली मृत्युः · पिङ्गलः सर्वतापनः · कविर्विश्वो महातेजा · रक्तः सर्वभवोद्भवः → He is the blazing heat, the shining disc, death itself, the tawny one who scorches all; he is the seer, the universe, of great splendour, the red one, the source of all that comes to be.
- [ ] **6.105.15** — नक्षत्रग्रहताराणाम् · अधिपो विश्वभावनः · तेजसामपि तेजस्वी · द्वादशात्मन्नमोऽस्तु ते → Lord of the stars, the planets and the constellations, origin of all things, brightest of all that shines: you of twelve forms, salutations to you!
- [ ] **6.105.16** — नमः पूर्वाय गिरये · पश्चिमायाद्रये नमः · ज्योतिर्गणानां पतये · दिनाधिपतये नमः → Salutations to the eastern mountain, salutations to the western mountain; salutations to the lord of the hosts of light, the lord of the day.
- [ ] **6.105.17** — जयाय जयभद्राय · हर्यश्वाय नमो नमः · नमो नमः सहस्रांशो · आदित्याय नमो नमः → Salutations again and again to the victorious one, to the blessing of victory, to the lord of the green horses; salutations, O thousand-rayed one, salutations again and again to Āditya.
- [ ] **6.105.18** — नम उग्राय वीराय · सारङ्गाय नमो नमः · नमः पद्मप्रबोधाय · मार्ताण्डाय नमोऽस्तु ते → Salutations to the fierce one, the hero, the swift one; salutations to him who wakes the lotuses, to Mārtaṇḍa: salutations to you.
- [ ] **6.105.19** — ब्रह्मेशानाच्युतेशाय · सूर्यायादित्यवर्चसे · भास्वते सर्वभक्षाय · रौद्राय वपुषे नमः → To the lord of Brahmā, Īśāna and Acyuta, to Sūrya, with the splendour of Āditya, to the shining one who consumes all, to the one of fierce form: salutations.
- [ ] **6.105.20** — तमोघ्नाय हिमघ्नाय · शत्रुघ्नायामितात्मने · कृतघ्नघ्नाय देवाय · ज्योतिषां पतये नमः → To the destroyer of darkness, of cold and of enemies, to the boundless self; to the destroyer of the ungrateful, to the god, the lord of the lights: salutations.
- [ ] **6.105.21** — तप्तचामीकराभाय · हरये विश्वकर्मणे · नमस्तमोभिनिघ्नाय · रुचये लोकसाक्षिणे → To him who shines like molten gold, to Hari, the maker of all; salutations to the slayer of darkness, the radiance, the witness of the world.
- [ ] **6.105.22** — नाशयत्येष वै भूतं · तदेव सृजति प्रभुः · पायत्येष तपत्येष · वर्षत्येष गभस्तिभिः → This lord destroys all that has come to be, and creates it again; with his rays he dries, he burns and he sends the rain.
- [ ] **6.105.23** — एष सुप्तेषु जागर्ति · भूतेषु परिनिष्ठितः · एष चैवाग्निहोत्रं च · फलं चैवाग्निहोत्रिणाम् → He stays awake in those who sleep, dwelling within every being; he is the fire offering, and also the fruit of those who offer it.
- [ ] **6.105.24** — वेदाश्च क्रतवश्चैव · क्रतूनां फलमेव च · यानि कृत्यानि लोकेषु · सर्वेषु परमप्रभुः → He is the Vedas, the sacrifices and the fruit of the sacrifices; of every deed done in all the worlds he is the supreme lord.
- [ ] **6.105.25** — एनमापत्सु कृच्छ्रेषु · कान्तारेषु भयेषु च · कीर्तयन् पुरुषः कश्चिन् · नावसीदति राघव → Whoever sings his praise in disaster, in hardship, in the wilderness or in danger, O Rāghava, does not lose heart.
- [ ] **6.105.26** — पूजयस्वैनमेकाग्रो · देवदेवं जगत्पतिम् · एतत्त्रिगुणितं जप्त्वा · युद्धेषु विजयिष्यसि → Worship him with a single mind, the god of gods, the lord of the world. Recite this three times, and you will win your battles.
- [ ] **6.105.27** — अस्मिन् क्षणे महाबाहो · रावणं त्वं वधिष्यसि · एवमुक्त्वा ततोऽगस्त्यो · जगाम स यथागतम् → In this very hour, mighty-armed one, you will slay Rāvaṇa.” With these words Agastya went away, just as he had come.
- [ ] **6.105.28** — एतच्छ्रुत्वा महातेजा · नष्टशोकोऽभवत्तदा · धारयामास सुप्रीतो · राघवः प्रयतात्मवान् → When he heard this, the radiant Rāma was freed from his grief. Glad at heart and self-controlled, Rāghava held the hymn in his mind.
- [ ] **6.105.29** — आदित्यं प्रेक्ष्य जप्त्वा तु · परं हर्षमवाप्तवान् · त्रिराचम्य शुचिर्भूत्वा · धनुरादाय वीर्यवान् → Gazing at the Sun, he recited the hymn and was filled with the highest joy. Three times he sipped water and was purified; then the mighty one took up his bow.
- [ ] **6.105.30** — रावणं प्रेक्ष्य हृष्टात्मा · युद्धार्थं समुपागमत् · सर्वयत्नेन महता · वधे तस्य धृतोऽभवत् → Seeing Rāvaṇa, he came forward to battle with a joyful heart, resolved with all his great strength to slay him.
- [ ] **6.105.31** — अथ रविरवदन्निरीक्ष्य रामं · मुदितमनाः परमं प्रहृष्यमाणः · निशिचरपतिसंक्षयं विदित्वा · सुरगणमध्यगतो वचस्त्वरेति → Then the Sun, glad at heart and full of joy, standing among the hosts of the gods, looked at Rāma; knowing that the end of the lord of the night-wanderers had come, he said: “Make haste!”

Narration before verse 1 (Sanskrit + English, shown in every language):
- [ ] **narration 1** — Before Lanka, the battle has gone on for a long time. → लङ्कायाः पुरतः बहु कालं युद्धं भवति।
- [ ] **narration 2** — Ravana comes back to fight, his strength renewed. → रावणः पुनः युद्धाय आगच्छति। तस्य बलं नवम्।
- [ ] **narration 3** — Rama stands weary, deep in thought. → रामः श्रान्तः तिष्ठति। सः चिन्तयति।
- [ ] **narration 4** — The gods watch from the sky. → देवाः आकाशात् पश्यन्ति।
- [ ] **narration 5** — The sage Agastya comes to Rama. → अगस्त्यः मुनिः रामम् उपगच्छति।
- [ ] **narration 6** — He teaches Rama the Aditya-hridaya. → सः रामाय आदित्यहृदयम् उपदिशति।
- [ ] **narration 7** — Listen, and recite with Agastya. → शृणु। अगस्त्येन सह पठ।

Interface strings (`content/aditya-hridayam.json → ui`; labels need no ।):
- [ ] **title** (label) — Aditya-hridayam → आदित्यहृदयम्
- [ ] **speaker** (label) — Agastya → अगस्त्यः
- [ ] **pause** (label) — Pause → तिष्ठ
- [ ] **resume** (label) — Resume ▶ → अग्रे गच्छ ▶
- [ ] **skip** (label) — Skip ▶▶ → अलम् ▶▶
- [ ] **skipAsk** — Skip the hymn? → आदित्यहृदयं त्यजसि?
- [ ] **yes** (label) — Yes → आम्
- [ ] **no** (label) — No → न
- [ ] **verse** (label) — Verse → श्लोकः
- [ ] **replay** (label) — Aditya-hridayam ▶ → आदित्यहृदयम् ▶

Constructions to confirm first: बहु कालं युद्धं भवति for "the battle has gone on for a long time" (v05b-rev2: चलति, the modern idiom, replaced: the packs use it only for motion); तस्य बलं नवम् for "his strength renewed"; अगस्त्येन सह पठ ("recite with Agastya"); तिष्ठ for "pause" and अलम् for "skip"; आदित्यहृदयं त्यजसि? for "Skip the hymn?".

## v0.6: 48 Kathā verses, Paraśurāma, thirteen special moments — model-written, machine-verified, two model reviews, awaiting human review
Plan `notes/v06-plan.md`; packages `notes/v06-a.md` … `v06-d.md`. **Per-package sign-off sheets** (verse rows, discrepancies,
human-review lists and the single-source / sandhi-engine allowlists — `content.test` and `learning.test` read them with this
file): [REVIEW-v06-a.md](REVIEW-v06-a.md) (Bāla, Ayodhyā, Paraśurāma: 19 verses), [REVIEW-v06-b.md](REVIEW-v06-b.md)
(Araṇya, Kiṣkindhā: 14), [REVIEW-v06-c.md](REVIEW-v06-c.md) (Sundara, Yuddha: 15). Every verse was re-fetched from
valmikiramayan.net by its package and checked against a second source; both reviewers re-fetched the texts again between them
(rev1 17, rev2 the other 31): no difference beyond the variants and site misprints recorded per verse.

**Reviews.** [notes/v06-rev1.md](notes/v06-rev1.md): 191 strings + 48 verses checked, 23 changes (15 accuracy / meaning,
8 register). [notes/v06-rev2.md](notes/v06-rev2.md): kept all 23 and both integration fixes, 5 more changes (4 faithfulness of
a सरलार्थः to its verse, 1 a quote marked with एवम्). Gates after both: the whole game suite green; every सरलार्थः word L1–L3.

**Integration changes after the reviews (orchestrator).**
- 1.30.26 सत्यम्: a predicate adjective, सत्यं कृतम् "made true (to its name)" (lexicon `satya`, adjective), not the adverb
  "truly"; translation changed to match (valmikiramayan.net's gloss).
- 1.75.3 जामदग्न्यम्: "of Jamadagni's line" (the family's bow, 1.75.22, पितृपैतामहं 1.75.27), not "of Jamadagni's son";
  translation, gloss, lexicon meaning and note changed; the translation's "that" follows the analysis of तत्.
- 2.25.32 provenance note corrected: the page's own verse markers run one line early (not the fetch tool).

**Not in the critical edition, kept from the vulgate (owner's base text).** The deer showing the way (Araṇya
3.64.15cd–24ab; a set piece told in the game's own lines, no verse; the Godāvarī's silence, 3.64.7 = CE 3.60.7, is attested)
and the first half of Sugrīva's 5.64.28 (कौसल्या सुप्रजा राम …; its second half = CE 5.61.16ab). Śabarī's verse is her
critical-edition forest-food verse (vulgate 3.74.17cd–18ab = CE 3.70.13), by the owner's decision.

**New Sanskrit lines** (Level 1–3, ≤ ~10 words a sentence, oracle-verified): sa-dialogue-10 (A: 18, incl. the Mithilā /
Paraśurāma cutscene), 11 (B: 24), 12 (C: 18, incl. Kumbhakarṇa), 13 (D: 9, the herbs); interface `v06.skipAsk` एतत् त्यजसि?,
`v06.look` पश्य, and C's four echo titles; names ऋषभ, कैलास, जामदग्न्य and 13 more (names-3…6); D's हिमवत् declension model
(भगवत् type; every built form checked by rev1).

**For the human teacher** (from rev1 and rev2; details in their notes):
1. The register of the सरलार्थाः: allies and juniors use भवान् (3rd person) to Rāma and Sītā, elders and prayers त्वम्. An older
   exception: v0.4's s-aranya-3 (Jaṭāyu, an elder, uses भवान्). Whether a younger brother says भवान् to the king (Vibhīṣaṇa to
   Rāvaṇa) should be settled for both places at once.
2. सज्जं करोति for "strings a bow" (MW sajja "strung, placed on a bow-string"; Apte the same).
3. आरोपयित्वा (1.67.17) is an epic -tvā after a prefix (classical आरोप्य, 7.1.37); its grammar note could say so for learners
   taught "prefix → lyap" (the string sits in shlokas-3 and lexicon-3).
4. The gloss of इति in s-pitur-vacana ("so I hold: thus"): rev1 would change it, rev2 keeps it (the site's own gloss).
5. मन्त्रिणौ for Mārīca, an adviser Rāvaṇa consulted rather than his minister ("counsellor" covers it).
6. Liberties for play: "across the river" (Lakṣmaṇa's way-finding line), "the whole mountain" (the text says the peak), the
   herbs scene's gold horizon (the text sets the journey at night) and Hanumān growing at the roar (in the text, before he leaps).
7. Guha's भवतः कृते किं करोमि? (the verse's करवाणि is not in the packs); s-tato-madhyat's सरलार्थः keeps one sentence of
   context (Rāma's anger) that explains the verse's ततः.
8. Variant readings chosen and flagged `variant` (never a recitation gap): 1.30.26 वीर (CE राम), 1.49.17 मुदा (CE तदा), 1.76.5
   इदम् (CE वचः), 2.52.83 पालयत्वेनं (IITK पारयित्वेमं), 4.5.11 यदि वा (site मे), 4.12.3 गिरिप्रस्थं (CE °प्रस्थे), 5.1.132 इहान्तरे
   (CE इहान्तरा), 5.55.3 पुरुषश्रेष्ठा (site and CE °श्रेष्ठ), 6.60.54 च (CE तु), 6.90.71 तत्.
9. Most of the ≈ 300 new lexicon lemmas cite Monier-Williams as "asserted" (the Cologne site refused the fetch tool); about 50
   were read on wisdomlib / kosha.sanskrit.today or confirmed by the repo's packs. A spot-check is welcome.
