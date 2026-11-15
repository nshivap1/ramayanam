# REVIEW (v0.6 WP-C): Sundara, Yuddha (shlokas-5.json) — for the human Sanskrit reviewer

OWNER: v0.6 WP-C. content.test.ts and learning.test.ts read this file together with REVIEW.md (notes/v06-ownership.md):
every verse of your shlokas file needs a row in a sign-off table (same columns as REVIEW.md), a word you flag
`variant` needs its verse on a human-review list (`- **<verse id>**: …`), and the allowlist sections (Single-source
items, Sandhi-engine exceptions, Omitted names, Discrepancies found by independent verification) work as in REVIEW.md
(content.test.ts reads every section of that name). The integration folds this file into REVIEW.md at release.

## Sign-off table

All 15 verses are Kathā-only (heard, never restorable). Sources and decisions: notes/v06-c.md. Fetched 2026-11-14 by
v06-C (WebFetch, raw lines around each verse marker, both lines of the couplet). vr.net = valmikiramayan.net; CE =
Baroda critical edition (enjoylearningsanskrit.com); IITK = IIT Kanpur text (vedapath.app). Metre: one mark per pāda
(✓ pathyā, · vipulā with meterNote). Sandhi: the engine rebuilds both half-verses from the words.

| verse id | reference | sources (hosts) | engine checks | independent check | status |
|---|---|---|---|---|---|
| `s-yatha-raghava` | Sundara 5.1.39 | valmikiramayan.net, enjoylearningsanskrit.com, kasarabada.org | metre ✓✓✓✓; sandhi ✓ | CE 5.1.36 identical; kasarabada.org same words (visarga written as sibilant); vr.net typo गच्चेत् corrected to गच्छेत् | awaiting human review |
| `s-tvarate-karyakalo` | Sundara 5.1.132 | valmikiramayan.net, kasarabada.org, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✗ (listed exception: hiatus at the pāda break) | kasarabada.org same letters (इहान्तरे); **edition variant**: CE 5.1.117 reads इहान्तरा; vr.net typo इहान्त्तरे corrected | awaiting human review |
| `s-upavasa-krsham` | Sundara 5.15.19 | valmikiramayan.net, vedapath.app, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | IITK 5.15.19 same words (निश्श्वसन्तीं, visarga as sibilant); CE 5.13.18cd–ef same words (the site prints निःश्वसान्तीं); vr.net निह्श्वसन्तीम् = its spelling of the visarga | awaiting human review |
| `s-trnam-antaratah` | Sundara 5.21.3 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 5.19.3 identical | awaiting human review |
| `s-vanaro-ham` | Sundara 5.36.2 | valmikiramayan.net, vedapath.app, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | IITK 5.36.2 identical; CE 5.34.2ab–cd identical (the CE verse has a third line) | awaiting human review |
| `s-dhanyas-te` | Sundara 5.55.3 | vedapath.app, valmikiramayan.net, enjoylearningsanskrit.com, sa.wikisource.org | metre ✓✓✓✓; sandhi ✓ | IITK 5.55.3 identical (stored); **edition variant** in pāda 1: vr.net and CE 5.53.3 पुरुषश्रेष्ठ, Wikisource धन्याः खलु महात्मानो | awaiting human review |
| `s-drshta-devi` | Sundara 5.64.28 | valmikiramayan.net, vedapath.app, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | IITK 5.64.28cd + 29ab same letters; CE 5.61.16ab = pādas 3–4 only; **pādas 1–2 not in the CE** | awaiting human review |
| `s-vinashyed-dhi` | Yuddha 6.9.19 | valmikiramayan.net, enjoylearningsanskrit.com, vedapath.app | metre ✓✓✓✓; sandhi ✓ | CE 6.9.19 identical; IITK same words (misprint नयदि); vr.net typos विनश्येद्द्, आक्षसाः corrected | awaiting human review |
| `s-tato-madhyat` | Yuddha 6.22.17 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 6.15.1 lines 1–2 identical (the CE verse adds a third line); vr.net marker misprinted २-२२-१७ | awaiting human review |
| `s-vadhyamano` | Yuddha 6.60.54 | valmikiramayan.net, sa.wikisource.org, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | Wikisource 6.60.54cd + 55ab identical; **edition variant**: CE 6.48.46cd–47ab reads तु for च in pāda 3 | awaiting human review |
| `s-mrtasanjivani` | Yuddha 6.74.33 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 6.61.33 same words (anusvāra in मृतसंजीवनीं, संधानीं; orthography only) | awaiting human review |
| `s-dharmatma-satyasandhah` | Yuddha 6.90.71 (vr.net 71cd + 72ab) | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 6.78.31 same words (सत्यसंधश्च, orthography only); IITK 6.91.71 reported to read शरैनं (not re-checked) | awaiting human review |
| `s-esha-setuh` | Yuddha 6.123.16 (vr.net 16cd + 17ab) | valmikiramayan.net, vedapath.app, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | IITK 6.126.16 same words (बद्धस्सागरे); CE 6.111.10 identical | awaiting human review |
| `s-etat-te-rakshitam` | Yuddha 6.127.54 | valmikiramayan.net, enjoylearningsanskrit.com | metre ✓✓✓✓; sandhi ✓ | CE 6.115.43cd + 44ab identical | awaiting human review |
| `s-na-paryadevan` | Yuddha 6.128.99 | valmikiramayan.net, enjoylearningsanskrit.com | metre ·✓✓✓ (pāda 1: bha-vipulā, meterNote); sandhi ✓ | CE 6.116.84 identical; vr.net typo भयन् corrected to भयं | awaiting human review |

## Human-review list (readings and analyses flagged by the authors and the verifier)

- **s-tvarate-karyakalo**: pāda 4 इहान्तरे (vulgate: valmikiramayan.net, kasarabada.org; stored) vs इहान्तरा (critical edition 5.1.117). Word अन्तरे flagged `variant`. Pādas 1–2 keep hiatus at the pāda break (मे | अहश्चा…) in every witness (sandhi-engine exception).
- **s-dhanyas-te**: pāda 1 धन्यास्ते पुरुषश्रेष्ठा (IIT Kanpur text; stored: nom. pl., agreeing with ते and ये, and the sense of valmikiramayan.net's own translation) vs धन्यास्ते पुरुषश्रेष्ठ (valmikiramayan.net word list; critical edition 5.53.3; only possible as a vocative) vs धन्याः खलु महात्मानो (Sanskrit Wikisource). Words ते and पुरुषश्रेष्ठाः flagged `variant`.
- **s-vadhyamano**: pāda 3 वारणानां सहस्रं च (valmikiramayan.net, Sanskrit Wikisource; stored) vs … तु (critical edition 6.48.47ab). Word च (pāda 3) flagged `variant`. The research had only the first half in a second source; Wikisource now confirms both halves (its 54cd + 55ab).
- **s-dharmatma-satyasandhah**: pāda 4 तदेनं (valmikiramayan.net, critical edition 6.78.31; stored) vs शरैनं (IIT Kanpur 6.91.71, as reported by the research; vedapath.app could not be read this session). Word तत् flagged `variant`. Numbering: vr.net prints the couplet as 71cd + 72ab (marker misprinted ९०-६-७१); customary 6.90.71 kept. Pāda 3 is stored with its sandhi ending चाप्रतिद्वन्द्वस् (before तदेनं).
- **s-drshta-devi**: pādas 1–2 (कौसल्या सुप्रजा राम समाश्वसिहि सुव्रत) are a vulgate line that the critical edition does not have (CE sarga 5.61 read in full; pādas 3–4 = CE 5.61.16ab with a different second line). Chosen because players know the first pāda from s-kausalya-supraja (1.23.2); सुप्रजा analysed as there (nom. sg. f. agreeing with कौसल्या). हनूमता spelled with ū in every witness.
- **s-tato-madhyat**: उदयन् read as the thematic (epic) present participle of ud + √i (stem udaya-; classical उद्यन्). Pāda break inside महाशैलान्मेरोः stored at the word boundary (महाशैलान् | मेरोरिव), as the CE print divides it; the t → n before m is the optional 8.4.45.
- **s-na-paryadevan**: पर्यदेवन् is an active (parasmaipada) imperfect of pari + √dev, as printed in every witness (classical परिदेवते is middle). Pāda 1 is a bha-vipulā (meterNote).
- **s-upavasa-krsham**: the accusatives describe Sītā, named only in the verses before (5.15.18cd); निःश्वसन्तीम् has the thematic feminine -न्ती (epic). The CE site prints निःश्वसान्तीं (long ā), taken as that site's typo.
- **s-esha-setuh**: numbering: vr.net 16cd + 17ab, IITK 6.126.16 (whole), CE 6.111.10; customary 6.123.16 kept. All witnesses print तवहेतोर्विशालाक्षि joined; a word space is added (same letters). हेतोः is the genitive with हेतु (2.3.26), "for your sake".
- **lexicon-5 (95 new lemmas)**: Monier-Williams could not be read this session (the Cologne lookup is refused to the fetch tool). Entries whose stem is in the repo's verified packs say so in their provenance (@content/vocab `oracle:mw#…`/`gloss:mw`, @content/dhatu, @content/shabda); the rest are marked as asserted for a human spot-check. Five ids shared with lexicon-3 copy package A's lemma / pos / meaning (dhimat, krtartha, madhya, rajya, tatas).

## Sandhi-engine exceptions

- `s-tvarate-karyakalo`: pādas 1–2: every witness (valmikiramayan.net, kasarabada.org, CE 5.1.117) prints त्वरते कार्यकालो मे अहश्चाप्यतिवर्तते with hiatus at the pāda break; the engine joins मे + अहः as मेऽहः (e + a). The text is kept as printed. (Needs the matching entry in content.test.ts `SANDHI_ENGINE_EXCEPTIONS`, requested from WP0.)

## Discrepancies found by independent verification

- `s-drshta-devi`: pādas 1–2 (कौसल्या सुप्रजा राम समाश्वसिहि सुव्रत) are **absent from the critical edition** (CE sarga 5.61 read in full on enjoylearningsanskrit.com; no line with कौसल्या, सुप्रजा or समाश्वसिहि). Pādas 3–4 = CE 5.61.16ab, which pairs them with a different second line (न ह्यन्यः साधने हेतुः कर्मणो ऽस्य हनूमतः). Kept: the game's text base is the vulgate (orchestrator, 14 Nov). valmikiramayan.net prints the couplet whole as 5.64.28; IIT Kanpur prints it as 5.64.28cd + 29ab with the same letters.
- `s-tvarate-karyakalo`: CE 5.1.117 reads इहान्तरा for the vulgate इहान्तरे (word flagged `variant`).
- `s-dhanyas-te`: CE 5.53.3 and valmikiramayan.net read पुरुषश्रेष्ठ; Sanskrit Wikisource reads धन्याः खलु महात्मानो (words flagged `variant`).
- `s-vadhyamano`: CE 6.48.47ab reads तु for च (word flagged `variant`).

## Kathā story lines of package C (v0.6 phase 2): model-written, machine-verified, awaiting human review

sa-dialogue-12.json (18 lines) and the 4 echo titles in sa-ui-v06-c.json. Every word verifies with the oracle at Level ≤ 3
and no sentence is longer than 8 words (v06-c.test). Points for the reviewer:
- The honey grove (hidden): वानराः सर्वं मधु पीतवन्तः (honey is "drunk", √pā, as in Sundara 5.61); Dadhimukha's तिष्ठत! (2nd pl.).
- The two counsellors (hidden): Vibhīṣaṇa's parting words (6.16.21) are given as a simple paraphrase (प्रियं वदन्तः जनाः
  सुलभाः। अप्रियं हितं च वदन् जनः दुर्लभः।), not as the verse; Mārīca's 3.37.2 is then heard as package B stores it.
- Waking Kumbhakarṇa: no word for "drum" or "conch" verifies with the oracle, so the Sanskrit says महान्तं शब्दं /
  दण्डैः ताडयन्ति / उच्चैः शब्दं करोषि; "yawns" is left out (no verified form of √jṛmbh).
- The herbs: Jāmbavān is "also hurt" (पीडितः); the scent of the herbs is left to package D's last line.
- Lakṣmaṇa: सः प्रतिज्ञां करोति ("he makes a vow"; the verse itself is the vow).
- Echo titles: उत्तिष्ठ इति रामाय हनुमते च · कौसल्या सुप्रजा इति द्विः · पादुके, राज्यं च पुनः रामाय · द्वौ मन्त्रिणौ, एकं वचनम्.
