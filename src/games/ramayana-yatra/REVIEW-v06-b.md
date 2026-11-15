# REVIEW (v0.6 WP-B): Araṇya, Kiṣkindhā (shlokas-4.json) — for the human Sanskrit reviewer

OWNER: v0.6 WP-B. content.test.ts and learning.test.ts read this file together with REVIEW.md (notes/v06-ownership.md):
every verse of your shlokas file needs a row in a sign-off table (same columns as REVIEW.md), a word you flag
`variant` needs its verse on a human-review list (`- **<verse id>**: …`), and the allowlist sections (Single-source
items, Sandhi-engine exceptions, Omitted names, Discrepancies found by independent verification) work as in REVIEW.md
(content.test.ts reads every section of that name). The integration folds this file into REVIEW.md at release.

## Sign-off table

| verse id | reference | sources (hosts) | engine checks | independent check | status |
|---|---|---|---|---|---|
| `s-apyaham-jivitam` | Araṇya 3.10.18 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓·✓ (pāda 3 (LGLGGGGL, 8 syll.): ma-vipulā (syllables 5–7 GGG). Text not edited; checkAnustubh accepts only the pathyā form.); sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-tasmajjato` | Araṇya 3.14.33 | valmikiramayan.net, enjoylearningsanskrit.com | metre ·✓✓✓ (pāda 1 (GGGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL). Text not edited; checkAnustubh accepts only the pathyā form.); sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-sulabhah-purusha` | Araṇya 3.37.2 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-amantraye` | Araṇya 3.49.30 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-asti-kaccit` | Araṇya 3.60.12 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-sarvatra-khalu` | Araṇya 3.68.24 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓·✓ (pāda 3 (GGLGGGGG, 8 syll.): ma-vipulā (syllables 5–7 GGG). Text not edited; checkAnustubh accepts only the pathyā form.); sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-maya-tu-vividham` | Araṇya 3.74.17 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-rocate-yadi` | Kiṣkindhā 4.5.11 | vedapath.app, enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓✓✓; sandhi ✓ | **edition variant** on वा, बध्यताम् (see the word notes) | awaiting human review (v0.6, Kathā only) |
| `s-sa-visrshto` | Kiṣkindhā 4.12.3 | enjoylearningsanskrit.com, vedapath.app, valmikiramayan.net | metre ·✓✓✓ (pāda 1 (LLGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL). Text not edited; checkAnustubh accepts only the pathyā form.); sandhi ✓ | **edition variant** on गिरिप्रस्थम् (see the word notes) | awaiting human review (v0.6, Kathā only) |
| `s-deshakalau` | Kiṣkindhā 4.22.20 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-esha-gharma` | Kiṣkindhā 4.28.7 | vedapath.app, valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-anena-tvam` | Kiṣkindhā 4.44.13 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-ito-dvipe` | Kiṣkindhā 4.58.20 | valmikiramayan.net, indology.info, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |
| `s-uttishtha-hari` | Kiṣkindhā 4.66.36 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | two cited witnesses agree (see provenance) | awaiting human review (v0.6, Kathā only) |

## Human-review list (readings and analyses flagged by the authors and the verifier)

- **s-rocate-yadi**: pāda 1 reads यदि वा (IIT Kanpur vulgate text 4.5.12 and the critical edition 4.5.12; stored) where valmikiramayan.net 4.5.11 reads यदि मे (its Devanagari and its transliteration page). Pāda 4 reads बध्यतां (valmikiramayan.net, IIT Kanpur; stored); the critical edition spells वध्यतां. Both words carry a `variant` note and are never a gap. Reviewer: check the Gita Press print.
- **s-sa-visrshto**: pāda 3 reads गिरिप्रस्थं, accusative (valmikiramayan.net with its word gloss, IIT Kanpur text; stored): the arrow pierced the sālas and the mountain slope. The critical edition reads गिरिप्रस्थे, locative (the sālas on the mountain slope). The word carries a `variant` note and is never a gap.
- **s-esha-gharma**: the critical-edition e-text (enjoylearningsanskrit.com and indology.info alike) prints धर्मपरिक्लिष्टा; both vulgate witnesses print घर्म- ("summer heat"), which the sense needs. Treated as an e-text slip; pādas follow the IIT Kanpur text.
- **s-ito-dvipe**: pāda 3 तस्मिँल्लङ्का as the critical-edition e-text prints it (tasmim̐l laṅkā; enjoylearningsanskrit writes तस्मिंल् लङ्का). The IIT Kanpur text reads द्वीपस्समुद्रस्य … तस्मिन्लङ्कापुरी (not followed).
- **s-maya-tu-vividham**: the owner's choice for Śabarī (14 Nov): her critical-edition verse (CE 3.70.13 = vulgate 3.74.17cd–18ab) about the forest food she gathered for Rāma. No berry tasting (a later tradition). The vulgate 3.74.11 (अद्य प्राप्ता तपःसिद्धिः) is not in the CE and is not used.
- **s-apyaham-jivitam**, **s-maya-tu-vividham**: each straddles two vulgate verses (3.10.18cd–19ab, 3.74.17cd–18ab); each is one whole verse in the CE (3.9.18, 3.70.13). The id keeps the first vulgate number, like s-naham-janami.
- **s-sulabhah-purusha**: the same couplet recurs at Yuddha 6.16.21cd–22ab on valmikiramayan.net (spoken by Vibhīṣaṇa), there with अप्रियस्य तु पथ्यस्य; Araṇya 3.37.2 reads च (site and CE). Package C uses the repeat for a hidden moment.
- Lexicon (lexicon-4.json): the MW entries of सम्पाति, अरिंदम, प्रियवादिन्, कर्णिकार, शुभानन, शरण्य, वन्य, मर्यादा, गिरिप्रस्थ (and the compound members श्येनी, सकाश, वशग) were read on kosha.sanskrit.today (Monier-Williams, Cologne); सलक्ष्मण has no MW entry (stored as a compound). The other new lemmas are marked "asserted from MW, not fetched" or "compound: members are MW headwords" in their provenance.

## Discrepancies found by independent verification

| verse | field | we have | source has | URL | note |
|---|---|---|---|---|---|
| s-rocate-yadi | words (वा, बध्यताम्) | यदि वा … बध्यतां | यदि मे … बध्यताम् (valmikiramayan.net); … वध्यतां (CE) | https://www.valmikiramayan.net/utf8/kish/sarga5/kishkindhasans5.htm ; https://enjoylearningsanskrit.com/scriptures/ramayana/book-4/chapter-5/verse-12 | Edition variants; we follow the IIT Kanpur text (vedapath.app 4.5.12). Human reviewer decides. |
| s-sa-visrshto | padas[2] | गिरिप्रस्थं | गिरिप्रस्थे (CE) | https://enjoylearningsanskrit.com/scriptures/ramayana/book-4/chapter-12/verse-3 | Edition variant (acc. vs loc.); we follow the two vulgate witnesses. |
| s-esha-gharma | padas[0] | घर्मपरिक्लिष्टा | धर्मपरिक्लिष्टा (CE e-text) | https://enjoylearningsanskrit.com/scriptures/ramayana/book-4/chapter-27/verse-7 | E-text slip in the CE transcription; no action. |
| (set piece) the deer show the way | story-ch3 Kathā block | the deer rise, face south and lead Rāma (vulgate 3.64.15cd–23) | the CE 3.60 has no deer: it goes from 3.60.14 (= vulgate 3.64.14cd–15ab) to 3.60.15 (= vulgate 3.64.24cd–25ab) | https://indology.info/bombay/ramayana/text/UR/Ram03.txt | The deer passage (vulgate 3.64.15cd–24ab) is absent from the critical edition; the set piece follows the vulgate (the game's text base; owner's decision 14 Nov). The Godāvarī's silence that comes first is in both (vulgate 3.64.7 = CE 3.60.7). Told in the game's own lines; no verse. |
