# content-a notes: verses of kāṇḍas 1–3 (`content/shlokas-1.json`, `content/lexicon-1.json`)

Status (00:35 ET): **11/11 verses complete**, 133 analysed words, 104 lexicon entries.
`node tools/test.mjs unit games/ramayana-yatra/content.test` passes with these files.

The JSON is generated from a scratch data file by a build script (`/home/claude/scratch/content-a/build.ts` +
`data.ts`). It runs every engine check, and a separate `sanity.ts` re-reads the JSON. Both are outside the repo.
Learner-facing English fields (sandhi `note`, `teaches`, word `grammar`/`gloss`, lexicon `notes`/form grammar) contain
**no Devanagari**: any Sanskrit in them is converted with `devaToIast` at build time (never typed by hand), because the
view shows these fields as plain text and `logic-learning.ts` drops Devanagari-bearing notes. `provenance.notes` and
`sources[].note` keep Devanagari on purpose: they quote the witnesses for the reviewer.

## Edition and numbering policy
- `sarga`/`verse` = **vulgate (Gita Press-based) numbering as on valmikiramayan.net**. This is what the ids/DESIGN expected.
  The critical-edition (Baroda, "CE") number is given in `edition` and in the source notes.
- **Bāla verses**: pāda text = valmikiramayan.net Devanagari (sandhied), letter for letter. Second source = the CE
  e-text (Tokunaga/Smith on the sanskritdocuments.org mirror, or the CE text on enjoylearningsanskrit.com), compared
  mechanically (my Devanagari → `devaToIast` against their IAST, spaces ignored). All 5 are identical.
- **Ayodhyā/Araṇya verses**: valmikiramayan.net prints these kāṇḍas **word-split** (padaccheda: रामः द्विर् न अभिभाषते),
  so its text can't be stored as the sandhied verse. Pāda text = the CE text (sanskritdocuments.org CE mirror or
  enjoylearningsanskrit.com), letter for letter. valmikiramayan.net confirms the same words and gives the vulgate
  number. Where possible a third witness confirms letters (wisdomlib CE, vedapath.app vulgate). `verifiedBy` says
  "(word-split; same words)" for valmikiramayan.net in these verses, so nobody reads it as a letter-level match.

## Per verse

| id | vulgate ref | CE ref | pāda text from | other confirmations | variants / remarks | metre | sandhi engine |
|---|---|---|---|---|---|---|---|
| s-tapah-svadhyaya | 1.1.1 | 1.1.1 | valmikiramayan.net balasans1 | CE e-text (sanskritdocuments roman): identical | none | **pāda 1 na-vipulā** (LGGGLLLG); meterNote set | ✔ |
| s-ko-nvasmin | 1.1.2 | 1.1.2 | valmikiramayan.net balasans1 | CE e-text: identical letters | CE joins न्वस्मिन्साम्प्रतं, गुणवान्कश्च (spacing only) | ✔ pathyā | ✔ |
| s-samudra-iva | 1.1.17 | **1.1.16** | valmikiramayan.net balasans1 | CE e-text: identical | vulgate 1.1.16 (सर्वदाभिगतः…) isn't in the CE | ✔ | ✔ |
| s-ma-nishada | 1.2.15 | 1.2.14 | valmikiramayan.net balasans2 | enjoylearningsanskrit (CE): identical | see "pāda cuts" below | ✔ | ✔ |
| s-kausalya-supraja | 1.23.2 | 1.22.2 | valmikiramayan.net balasans23 | enjoylearningsanskrit (CE): identical | both print **संध्या** (anusvāra); the brief had सन्ध्या. Stored as printed | ✔ | ✔ |
| s-ramo-dvir | 2.18.30 | 2.16.19 | CE e-text (sanskritdocuments utf 2_ayodhyakanda_16) | wisdomlib CE: identical; valmikiramayan.net 2-18-30 word-split: same words (its अभिकान्क्षितम् is a typographic variant) | | ✔ | ✔ |
| s-pitari-shushrusha | 2.19.22 | 2.16.48 | CE e-text (same page) | enjoylearningsanskrit CE: identical; valmikiramayan.net 2-19-22 word-split: same words; vedapath 2.19.22: same letters | **CE prints किं चिदस्ति** (space inside किंचित्), stored so; vedapath किञ्चिदस्ति, पितरिशुश्रूषा | **pāda 1 na-vipulā** (GLGGLLLG) | ✔ |
| s-ramam-dasharatham | 2.40.9 | 2.35.8 | enjoylearningsanskrit (CE) | valmikiramayan.net 2-40-9 word-split: same words; vedapath 2.40.9: same letters (typo विध्दि) | | ✔ | ✔ |
| s-ramo-vigrahavan | 3.37.13 | 3.35.13 | enjoylearningsanskrit (CE) | valmikiramayan.net 3-37-13: same letters (partly word-split) | **VARIANT**: vedapath/IITK vulgate reads …धर्मस्साधुस्सत्यपराक्रमः … **देवानां मघवानिव** (मघवान्, also Indra). We follow CE + valmikiramayan.net (देवानामिव वासवः) | ✔ | ✔ |
| s-golden-deer | **3.43.10** | 3.41.9 | CE e-text (sanskritdocuments utf 3_aranyakanda_41) | wisdomlib CE: same letters; valmikiramayan.net 3-43-10 word-split: same words | chosen verse: Sītā: आर्यपुत्राभिरामोऽसौ मृगो हरति मे मनः … | ✔ | ✔ |
| s-aranya-3 | **3.67.15** | 3.63.14 | enjoylearningsanskrit (CE) | vedapath 3.67.15 (vulgate): same letters; valmikiramayan.net 3-67-15 word-split: same words | chosen verse: **Jaṭāyu's dying words to Rāma** (यामोषधिमिवायुष्मन्…रावणेनोभयं हृतम्), for `jatayu_glade` | ✔ | ✔ |

Engine summary: `validateDeva` OK on every Sanskrit string. `checkAnustubh`: 9/11 verses fully pathyā (`engine:checkAnustubh`).
s-tapah-svadhyaya and s-pitari-shushrusha have a **na-vipulā first pāda** (meterNote names "pāda 1"; text not edited).
`joinSandhiDeva` (whole-verse rebuild, same algorithm as content.test.ts) reproduces **all 11** verses from their words
(`engine:joinSandhiDeva`). No verse needs a SANDHI_ENGINE_EXCEPTIONS entry. The sandhi of सः + च (visarga drop) and the
doubled n of आयुष्मन् + अन्वेषसि were handled by the engine without options.

## Things a reviewer or another agent should know
1. **Pāda cuts at word boundaries (orchestrator's decision, 00:30 ET).** Where the printed sandhi spans a pāda break, the pādas
   are cut at the word boundary, and provenance.notes says so. s-ma-nishada: `मा निषाद प्रतिष्ठां त्वम् | अगमः शाश्वतीः समाः |
   यत् क्रौञ्चमिथुनादेकम् | अवधीः काममोहितम्` (printed त्वमगमः, …देकमवधीः; the sounds are identical, and I kept the printed
   space in यत् क्रौञ्च…). The sandhiNote त्वमगमः is back, checked per half-verse in SLP1 by the relaxed content.test.
   s-aranya-3: `यामोषधिमिवायुष्मन्न् | अन्वेषसि महावने`. The doubled n stays at the end of pāda 1, as IAST editions write
   āyuṣmann anveṣasi, so no sound is lost. There's a new half-verse sandhiNote आयुष्मन्नन्वेषसि = आयुष्मन् + अन्वेषसि.
2. **s-aranya-3**: प्राणा (end of pāda 3) = प्राणाः before the र of pāda 4. The cut is already at the word boundary.
3. **सुप्रजा (s-kausalya-supraja)**: analysed as nom. sg. f. of MW *su-praja* mf(ā)n. "having good or numerous children"
   (MW cites the Rāmāyaṇa), agreeing with कौसल्या. Some readers take कौसल्यासुप्रजा as a vocative epithet of Rāma. Reviewer.
4. **Predicate participles** (कर्तव्यम्, अभिकाङ्क्षितम्, हृतम्), the adverbial क्रीडार्थम्, the ambiguous enclitic नः (dat./gen.) and
   the duration accusative समाः have **no `role`**, so they are never asked in vibhakti challenges. Every other word has one.
5. **Double accusative (s-ramam-dasharatham)**: both members are `object` (रामम्/दशरथम्, माम्/जनकात्मजाम्, अयोध्याम्/अटवीम्);
   the gloss says which is the predicate ("(as) Daśaratha").
6. Rejected for slot s-aranya-3: Jaṭāyu's "न तत्समाचरेद्धीरो…" (vulgate 3.50.7 / CE 3.48.7). The editions differ
   (vulgate विपश्चिता vs CE विमर्शनात्, and the vulgate has a 6-pāda form).

## Lexicon (lexicon-1.json)
- One entry per lemma; `forms` are generated from the verse words (form + grammar + shlokaIds), so every form traces to a verse.
- Ids follow the slug rule on the class-nasal lemma, e.g. किञ्चित् → `kincit` (renamed from my earlier `kimcit` to match content-b).
  `sama-2` = समा "year" (slug `sama` is left for the adjective सम).
- Shared ids with lexicon-2 (aham, as, bhash, ca, hi, hr, idam, jna, kr, na, rajan, rama, tvam, vrt, yatha, kincit) agree on
  lemma/pos/gender/meaning (content.test passes).
- Pronouns: personal pronouns use the nominative lemma (अहम् with forms माम्/मे/मम/नः; त्वम्); other pronouns use the stem
  (तद्, यद्, किम्, इदम्, अदस्, एनद्). Roots without anubandhas (गम्, प्रच्छ्, वध्, स्था, वृत्, ज्ञा, ब्रू …). Prefixed verb forms
  (परिपप्रच्छ, उत्तिष्ठ, प्रवर्तते, प्रतिजाने, अभिभाषते, आनय, अन्वेषसि) are under the simple root, and the prefix is given in the word's grammar.
- MW looked up for this run: su-praja and āhnika (exact senses confirmed), vigraha (sense "form, body"). The others are
  standard MW/Apte senses that I didn't look up one by one. `verifiedBy` says "source:monier-williams (looked up)" only for
  the entries I checked.
- Words treated as one unit with a `compound` entry (members in `notes`): तपःस्वाध्यायनिरत, मुनिपुङ्गव, सत्यवाक्य, दृढव्रत,
  सर्वगुणोपेत, कौसल्यानन्दवर्धन, क्रौञ्चमिथुन, काममोहित, नरशार्दूल, धर्मचरण, वचनक्रिया, जनकात्मजा, सत्यपराक्रम, महाबाहु,
  क्रीडार्थ, महावन. Lexicalised upapada/derivatives are adjectives: धर्मज्ञ, कृतज्ञ, वाग्विद्, गुणवत्, वीर्यवत्, विग्रहवत्.

## Needs a human Sanskrit reviewer
- s-kausalya-supraja: सुप्रजा analysis (item 3).
- s-ramo-vigrahavan: vulgate variant देवानां मघवानिव vs stored देवानामिव वासवः (check against a printed Gita Press copy).
- s-ma-nishada and s-aranya-3: the word-boundary pāda cuts (item 1). Also s-ma-nishada's मा + augmented aorist अगमः, flagged as an epic irregularity.
- s-pitari-shushrusha: stored CE spacing किं चिदस्ति, analysed as one word किंचित्.
- Lemma choices वध् (aorist अवधीः), एनद्, द्विस्, अतस्, and विग्रहवत् (the -vat derivative wasn't looked up as a headword).

## URLs that could not be fetched (permission/site errors)
sa.wikisource.org Rāmāyaṇa pages; sanskritdocuments.org/mirrors/ramayana/utf/1_balakanda_1.html and 1_balakanda_2.html;
wisdomlib.org/definition/vigrahavat. The other sources listed in the JSON were fetched on 2026-11-10/11 (accessed field: 2026-11-11).
