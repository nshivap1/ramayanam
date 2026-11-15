# REVIEW (v0.6 WP-A): Bāla, Ayodhyā (shlokas-3.json) — for the human Sanskrit reviewer

OWNER: v0.6 WP-A. content.test.ts and learning.test.ts read this file together with REVIEW.md (notes/v06-ownership.md):
every verse of your shlokas file needs a row in a sign-off table (same columns as REVIEW.md), a word you flag
`variant` needs its verse on a human-review list (`- **<verse id>**: …`), and the allowlist sections (Single-source
items, Sandhi-engine exceptions, Omitted names, Discrepancies found by independent verification) work as in REVIEW.md
(content.test.ts reads every section of that name). The integration folds this file into REVIEW.md at release.

## Sign-off table

All 19 verses are Kathā-only (heard, never restorable). Sources and decisions: notes/v06-a.md. Fetched 2026-11-14 by v06-A
(WebFetch, raw lines around each verse marker). vr.net = valmikiramayan.net; CE = Baroda critical edition (enjoylearningsanskrit.com).

| verse id | reference | sources (hosts) | engine checks | independent check | status |
|---|---|---|---|---|---|
| `s-unashodasha` | Bāla 1.20.2 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 1.19.2 identical (letter for letter) | awaiting human review |
| `s-mantragramam` | Bāla 1.22.12 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 1.21.10cd + 11ab: same words (मन्त्र- class nasal; orthography only) | awaiting human review |
| `s-pitur-vacana` | Bāla 1.26.2 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 1.25.2 identical | awaiting human review |
| `s-krtartho-smi` | Bāla 1.30.26 | valmikiramayan.net, enjoylearningsanskrit.com, siva.sh | metre ✓✓✓✓; sandhi ✓ | **edition variant**: CE 1.29.23 reads राम for वीर in pāda 4; siva.sh (a vr.net mirror) = vr.net; vedapath (IITK) unreadable this session | awaiting human review |
| `s-ahalya` | Bāla 1.49.17 | valmikiramayan.net, enjoylearningsanskrit.com, siva.sh | metre ✓✓·✓ (pāda 3 (LGGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL).); sandhi ✓ | **edition variant**: CE 1.48.17 reads तदा for मुदा in pāda 2; siva.sh (mirror) = vr.net; vedapath numbers the passage differently | awaiting human review |
| `s-aropayitva` | Bāla 1.67.17 | valmikiramayan.net, enjoylearningsanskrit.com | metre ·✓✓✓ (pāda 1 (GGLGGGGL, 8 syll.): ma-vipulā (syllables 5–7 GGG, caesura after the 5th).); sandhi ✓ | CE 1.66.17: same words (बभञ्ज class nasal; orthography only); the research reports an IITK variant in pādas 1–2 (not re-checked) | awaiting human review |
| `s-nipetush` | Bāla 1.67.19 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓·✓ (pāda 3 (GLGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL).); sandhi ✓ | CE 1.66.19 identical; vr.net misprint व्रजयित्वा corrected to वर्जयित्वा (CE) | awaiting human review |
| `s-iyam-sita` | Bāla 1.73.26 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓·✓ (pāda 3 (LGGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL).); sandhi ✓ | CE 1.72.17 pādas 1–4: same words (कौसल्यानन्द- class nasal; orthography only) | awaiting human review |
| `s-purayasva` | Bāla 1.75.3 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 1.74.3 identical | awaiting human review |
| `s-aropya` | Bāla 1.76.5 | valmikiramayan.net, enjoylearningsanskrit.com, siva.sh | metre ✓✓✓✓; sandhi ✓ | **edition variant**: CE 1.75.5 reads अब्रवीद्वचः for अब्रवीदिदम् in pāda 4; siva.sh (mirror) = vr.net | awaiting human review |
| `s-madhuhantaram` | Bāla 1.76.17 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 1.75.17: same letters (space before the avagraha) | awaiting human review |
| `s-yan-mangalam` | Ayodhyā 2.25.32 | enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓·✓ (pāda 3 (GLGGLLLG, 8 syll.): na-vipulā (syllables 5–7 LLL).); sandhi ✓ | vr.net 2-25-32 word-split: same words (मन्गलम् = the site's spelling) | awaiting human review |
| `s-agratas-te` | Ayodhyā 2.27.6 | enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓✓✓; sandhi ✓ | vr.net 2-27-6 word-split: same words | awaiting human review |
| `s-yathayodhya` | Ayodhyā 2.50.36 | enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓✓✓; sandhi ✓ | vr.net 2-50-36 word-split: same words | awaiting human review |
| `s-gange` | Ayodhyā 2.52.83 | enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓✓✓; sandhi ✓ | **edition variant** (reading chosen by the owner): vr.net word-split = CE (पालयतु एनम्); vedapath (IITK) and siva.sh read पारयित्वेमं | awaiting human review |
| `s-yad-acarati` | Ayodhyā 2.63.6 | enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓✓✓; sandhi ✓ | vr.net 2-63-6 word-split: same words | awaiting human review |
| `s-na-rajyad` | Ayodhyā 2.94.3 | enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓✓✓; sandhi ✓ | vr.net 2-94-3 word-split: same words (विना भवः split) | awaiting human review |
| `s-kshayanta` | Ayodhyā 2.105.16 | enjoylearningsanskrit.com, valmikiramayan.net | metre ·✓✓✓ (pāda 1 (GGLGGLLG, 8 syll.): bha-vipulā (syllables 5–7 GLL, caesura after the 5th).); sandhi ✓ | vr.net 2-105-16 word-split: same words (misprints समुग्च्छ्रयाः, सम्योगा) | awaiting human review |
| `s-paduke` | Ayodhyā 2.112.21 | enjoylearningsanskrit.com, valmikiramayan.net | metre ✓✓✓✓; sandhi ✓ | vr.net 2-112-21 word-split: same words | awaiting human review |

## Discrepancies found by independent verification

| verse | field | we have | source has | URL | note |
|---|---|---|---|---|---|
| s-krtartho-smi | padas[3] | कृतं वीर महायशः | कृतं राम महायशः (CE) | https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-29/verse-23 | Edition variant; ours = vulgate (valmikiramayan.net, siva.sh). Reviewer decides. |
| s-ahalya | padas[1] | पादौ जगृहतुर्मुदा | पादौ जगृहतुस्तदा (CE) | https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-48/verse-17 | Edition variant; ours = vulgate. Reviewer decides. |
| s-aropya | padas[3] | रामः क्रुद्धोऽब्रवीदिदम् | रामः क्रुद्धो ऽब्रवीद्वचः (CE) | https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-75/ | Edition variant; ours = vulgate. Reviewer decides. |
| s-gange | padas[2] | निदेशं पालयत्वेनं | निदेशं पारयित्वेमं (IITK, siva.sh) | https://vedapath.app/en/ramayana/ayodhya-kanda/52/83 ; https://siva.sh/ramayana/ayodhya-kanda/52/83-84 | Edition variant; ours = valmikiramayan.net + CE (owner's choice). |
| s-nipetush | padas[2] | वर्जयित्वा मुनिवरं | व्रजयित्वा मुनिवरं (valmikiramayan.net misprint) | https://valmikiramayan.net/utf8/baala/sarga67/balasans67.htm | Source misprint, corrected with the CE. |

## Human-review list (readings and analyses flagged by the authors and the verifier)

- **s-krtartho-smi**: pāda 4 वीर (vulgate: valmikiramayan.net, siva.sh) vs राम (critical edition 1.29.23). Word flagged `variant`. Also: सिद्धाश्रमम् analysed as nom. sg. n. with इदम् / कृतम् (MW āśrama m. n.), सत्यम् as a predicate adjective (सत्यं कृतम् 'made true to its name'; changed from an adverb at integration after v06-rev1); the verse uses pādas 1–4 of the six-pāda vulgate 1.30.26.
- **s-ahalya**: pāda 2 जगृहतुर्मुदा (vulgate) vs जगृहतुस्तदा (critical edition 1.48.17). Word मुदा flagged `variant`.
- **s-aropya**: pāda 4 अब्रवीदिदम् (vulgate) vs अब्रवीद्वचः (critical edition 1.75.5). Word इदम् flagged `variant`.
- **s-gange**: pāda 3 निदेशं पालयत्वेनं (valmikiramayan.net, critical edition 2.46.68; the owner's choice) vs निदेशं पारयित्वेमं (vedapath.app / IIT Kanpur, siva.sh). Words पालयतु and एनम् flagged `variant`.
- **s-nipetush**: valmikiramayan.net prints व्रजयित्वा (a misprint, also on its mirror siva.sh); the game reads वर्जयित्वा with the critical edition 1.66.19 (owner-approved).
- **s-purayasva**: तत् … धनुः taken as the accusative object of पूरयस्व ("draw this bow full"); जामदग्न्यम् (lexicon id jamadagnya-2): see the next entry.
- **s-iyam-sita**: सहधर्मचरी read as the predicate ("she will be your partner in dharma"; anvaya adds [भवतु]).
- **s-aropayitva**: the research reports that the IIT Kanpur text reads pādas 1–2 as आरोपयित्वा धर्मात्मा पूरयामास तद्धनुः; vedapath could not be read this session to confirm. Ours = valmikiramayan.net = critical edition.
- **lexicon-3 (108 new lemmas)**: 9 MW entries were read online (atibalā, āśrama, sahadharmacarī, vinābhava, sajya, parāmarśa, aviśaṅkā, madhuhantṛ, bhraṃśana); the rest carry "Asserted from reference knowledge" in their provenance (the Cologne site refuses the fetch tool).
- **s-purayasva**: जामदग्न्यं महद्धनुः read as "the great bow of Jamadagni's line" (patronymic adjective; the bow came to Paraśurāma through his father Jamadagni, 1.75.22, and is the family's, पितृपैतामहं 1.75.27); changed at integration from "of Jamadagni's son" after v06-rev1. The translation's "that" follows the analysis of तत्.
