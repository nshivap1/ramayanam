# content-b notes: verses of kāṇḍas 4–6 (for the human Sanskrit reviewer)

Files: `content/shlokas-2.json` (10 verses), `content/lexicon-2.json` (89 lemmas).
Generated from `/home/claude/scratch/content-b/data.ts` + `data2.ts` by `build.ts`. The builder runs the engine
checks. `check.ts` is an independent sanity pass over the written JSON: it parses both files, checks that every
lexId exists, that every pāda, word, lemma and form passes `validateDeva`, that each pāda has 8 syllables, that every
word form is listed in its lexicon entry, and that the sandhi notes match. Last run: **SANITY OK**.
`humanReviewed` is never set.

## How the text was sourced (read this first)
- The shell has no internet. All sources were read through the WebFetch tool, which goes through a summarising
  model with a 125-character quote limit. Quotes were requested half-verse by half-verse and cross-checked between
  sources, but **a reviewer should compare every pāda against a printed Gita Press copy.**
- **valmikiramayan.net** (Gita Press-based vulgate) is the numbering and word-by-word witness for every verse.
  Its Kiṣkindhā and some Sundara/Yuddha pages print the verse with the words separated (pada-pāṭha style), and some
  of those lines contain typos. Where it prints the verse with sandhi, it is the pāda-text source.
- Where it does not, the joined text comes from **prapatti.com** (romanised PDF, mechanically converted, with ē/ō = e/o)
  or from the **IIT Kanpur text** as reproduced by **vedapath.app**. vedapath often drops word spaces; spaces are not
  letters, so the word spacing follows the other witness.
- **Pāda boundaries with sandhi across them** (कृत्स्नमनेन, मूलमनिर्वेदः, जपेन्नित्यमक्षय्यं) are stored split at the
  boundary (कृत्स्नम् | अनेन). The sounds are the same (identical in SLP1), only divided at the pāda boundary. This is
  recorded in each verse's provenance.notes.
- Blocked or unreachable: valmiki.iitk.ac.in (robots.txt), sa.wikisource.org (no permission), several
  sanskritdocuments.org CE `utf`/`roman` pages (site errors). These were not used.

## Per-verse summary

| id | ref stored | text basis (letter for letter) | 2nd witness | metre | sandhi engine | review flags |
|---|---|---|---|---|---|---|
| s-nanrgveda | 4.3.28 | prapatti.com | valmikiramayan.net (split), vedapath | pāda 3 na-vipulā (meterNote) | ok | not in Baroda CE (CE sarga 3 has 25 verses) |
| s-vyakaranam | 4.3.29 | prapatti.com | valmikiramayan.net (split; typo व्यकरणम्), vedapath | ok | ok | not in CE; IITK writes व्याहरताऽनेन |
| s-naham-janami | "4.6.22" | prapatti.com | valmikiramayan.net (split) | ok | ok | **the couplet is 4.6.22cd + 4.6.23ab**; not in CE |
| s-anirvedah | 5.12.10 | vedapath (IITK) | valmikiramayan.net mirror (split), kasarabada.org | pāda 3 na-vipulā | ok (pāda 3 only at half-verse level) | prapatti/CE put the second half-line in the next verse |
| s-kalyani-bata | 5.34.6 | prapatti.com | valmikiramayan.net (split, typos) | ok | ok (half-verse level for pādas 1, 3) | **मा (prapatti) vs मे (valmikiramayan line, CE pages)** |
| s-jayatyatibalo | 5.42.33 | valmikiramayan.net (joined) | prapatti.com (identical) | ok | ok (half-verse level for pādas 1, 3) | none |
| s-dasoham | 5.42.34 | vedapath (IITK), spacing per valmikiramayan.net | valmikiramayan.net, prapatti.com | ok | **fails pāda 3** | हनुमान् vs हनूमान् (prapatti) |
| s-sakrdeva | "6.18.33" | enjoylearningsanskrit.com (CE 6.12.20) | valmikiramayan.net (split), vedapath | ok | ok (half-verse level for pāda 3) | **numbering: VR 33cd+34ab, IITK 6.18.32** |
| s-aditya-hrdayam | 6.105.4 | valmikiramayan.net (joined) | vedapath (IITK 6.107.4), hindunet itx | ok | ok (half-verse level for pāda 1) | not in CE constituted text; variant अक्षयं |
| s-maranantani | 6.109.25 | valmikiramayan.net (joined) | vedapath (IITK 6.112.25) | ok | ok (half-verse level for pāda 3) | **निर्वृत्तं (both sources), not निवृत्तं**; नः vs वः (IITK) |

## Details and uncertainties

### s-nanrgveda (Kiṣkindhā 4.3.28)
- Both vulgate witnesses agree on every word. vedapath/IITK: नासामवेदविदुषश्शक्यमेवं (optional ś-assimilation), and
  misprint नायजुर्वेद्धारिणः. The verse is absent from the Baroda critical text (sanskritdocuments.org CE mirror, sarga 3 = 25 verses).
- Analysis: न + a(n)-negated genitive compounds (अनृग्वेदविनीतस्य, अयजुर्वेदधारिणः, असामवेदविदुषः), each kept as one
  compound lexeme. The genitive goes with शक्यम्. Metre: pāda 3 GGLGLLLG = na-vipulā.

### s-vyakaranam (4.3.29), the ch4 key verse
- valmikiramayan.net misprints व्यकरणम् in its verse line (its gloss has vyākaraṇam). Gita Press prints किंचिद् with
  anusvāra; prapatti prints kiñcid, which is the repo convention (class nasal).
- किञ्चित् is analysed as the nom. sg. n. indefinite pronoun ("not anything was mis-spoken"), id `kincit`, which is
  also the id content-a uses (as of 00:04).
- अपशब्दित is taken from the verse. MW has अपशब्द; the participle was not checked as a headword.

### s-naham-janami (4.6.22–23)
- In the vulgate (valmikiramayan.net, prapatti.com), 4.6.22 = एवमुक्तस्तु रामेण लक्ष्मणो वाक्यमब्रवीत् । नाहं जानामि केयूरे नाहं जानामि कुण्डले ॥
  and 4.6.23 = नूपुरे त्वभिजानामि नित्यं पादाभिवन्दनात् । ततस्तु राघवो वाक्यं सुग्रीवमिदमब्रवीत् ॥. The stored verse is the
  famous contiguous couplet (22cd + 23ab), with verse = 22. Not in the CE (sarga 6 has 23 verses and no केयूरे).

### s-anirvedah (Sundara 5.12.10)
- Gita Press division (valmikiramayan.net, IITK, kasarabada): अनिर्वेदः श्रियो मूलमनिर्वेदः परं सुखम् । अनिर्वेदो हि सततं सर्वार्थेषु प्रवर्तकः ॥.
- prapatti.com: 5.12.10cd = भूयस्तत्र विचेष्यामि न यत्र विचयः कृतः, and अनिर्वेदो हि… opens 5.12.11. The CE has the
  passage at 5.10.10–11.

### s-kalyani-bata (5.34.6): **reading to decide**
- prapatti.com: …लौकिकी प्रतिभाति **मा** (enclitic acc. of अहम्), and valmikiramayan.net's word list also glosses "mā = to me".
- valmikiramayan.net verse line and the CE pages on enjoylearningsanskrit.com read **मे**. The valmikiramayan line has
  three typos (गथा, एहि, आनदो), and the enjoylearningsanskrit 5.32.6 page repeats them, so it is probably copied. The proverb's
  repeat at CE 6.114.2 reads मे. **I followed the primary source (मा).** If the Gita Press print reads मे, change the
  pāda to लौकिकी प्रतिभाति मे, the word to {form मे, lexId aham, grammar "gen. sg. (enclitic)"}, and rebuild.

### s-dasoham (5.42.34)
- हनुमान् (valmikiramayan.net, IITK) vs हनूमान् (prapatti). Followed हनुमान्.
- joinSandhiDeva gives हनुमाञ्शत्रुसैन्यानाम्, because it applies ścutva to n + ś. The sources leave the words apart:
  हनुमान् शत्रुसैन्यानां. So there is no `engine:joinSandhiDeva`. The text was not changed.

### s-sakrdeva (Yuddha 6.18.33): **numbering to confirm**
- valmikiramayan.net puts ६-१८-३३ after the half-line सकृद् एव प्रपन्नाय तव अस्मि इति च याचते, so its 33 = धर्मिष्ठं च… + सकृदेव…,
  and अभयं… opens 34. The IITK text prints the whole couplet as 6.18.32. Baroda CE 6.12.20. The wording is identical in all.
  I kept the brief's 6.18.33 (the customary citation); a reviewer with the Gita Press print should confirm.
- याचते is read as the dative of the present participle याचत् (parallel to प्रपन्नाय). It can also be read as a 3rd sg.
  ātmanepada present.

### s-aditya-hrdayam (Āditya-hṛdaya v. 4)
- 6.105.4 on valmikiramayan.net (Gita Press-based); 6.107.4 in the IITK text and the southern numbering (hindunet says "107th sarga").
  The Baroda critical edition does not admit the hymn to its constituted text. This is from the brief and hindunet's remark that
  "some official texts do not include it"; I did not check the CE appendix number.
- Variant: अक्षय्यं (valmikiramayan.net, IITK, hindunet) vs अक्षयं (current sanskritdocuments.org stotra file). Followed अक्षय्यं.

### s-maranantani (6.109.25)
- Both witnesses read **निर्वृत्तं** ("accomplished"), not निवृत्तं as in the brief. Followed the sources.
- नः "our" (valmikiramayan.net) vs वः "your" (IITK). Followed नः. Numbering: 6.109.25 (valmikiramayan.net) / 6.112.25 (IITK).

## Engine-check summary
- `checkAnustubh`: 8 of 10 verses pass all four pādas (pathyā). s-nanrgveda pāda 3 and s-anirvedah pāda 3 are na-vipulā
  (syllables 5–7 LLL), and each has a `meterNote`. Every pāda has 8 syllables.
- `joinSandhiDeva` (left-to-right fold of the words, compared in SLP1 with spaces ignored):
  - Every pāda reproduced at pāda level: s-nanrgveda, s-vyakaranam, s-naham-janami.
  - Reproduced only when a pāda is folded together with the next pāda of its half-verse, because the pāda-final sound
    depends on the next pāda's first sound (गाथेयं before ल, रामो before ल, सततं before स, सर्वभूतेभ्यो before द,
    पुण्यं before स, संस्कारो before म): s-anirvedah (3), s-kalyani-bata (1, 3), s-jayatyatibalo (1, 3), s-sakrdeva (3),
    s-aditya-hrdayam (1), s-maranantani (3). I counted these as reproduced and say so in each provenance.notes.
  - Not reproduced: **s-dasoham** pāda 3 (n + ś left unassimilated in the sources; see above).
  - The fold computes each junction from the two word forms, so सः/एषः is recognised (ममाप्येष यथा). Note: passing an
    already-joined string to joinSandhiDeva (e.g. "ममाप्येषः" + "यथा") misses the एषः rule.

## Lexicon
- 89 entries, one per lemma, with forms generated from the verse words. Lemma = stem or root (content-a's convention).
  Compounds kept as single words carry pos `compound` and notes naming their members. Provenance is Monier-Williams
  (Cologne). For compounds made in the verse, provenance adds the verse, and pnotes say that only the members were checked.
- Shared ids aligned with lexicon-1 (lemma/pos/gender/meaning identical, checked 00:04): aham, as, bhash, ca, hi, hr,
  idam, jna, kincit, kr, na, rajan, rama, tvam, vrt, yatha. For hr, the sense "speak" (with vi-ā-) is in my notes only.
  `content.test.ts` passes (11/11) with both files in place.
- Other uncertainties: केयूर and नूपुर are given gender n. from the dual -e forms (MW: m. n.). The headword status in MW of
  अक्लिष्टकर्मन्, आदित्यहृदय, सर्वभूत, सर्वार्थ, कोसलेन्द्र, शत्रुसैन्य and मारुतात्मज was not checked (members only).
