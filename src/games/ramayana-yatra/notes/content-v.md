# content-v notes (names + Sanskrit verifier)

**Status 00:20 ET:** `content.test.ts` passes 13/13 on all 21 verses, 177 merged lexicon entries (104 + 89) and 183 names. The whole
game unit suite passes 97/97. REVIEW.md is regenerated with the full sign-off table. Every verse has an independent
check except s-nanrgveda and s-vyakaranam (no uncited witness exists online, since neither is in the CE). If you add or
change a verse, add its row to REVIEW.md (the test enforces it) or ask content-v.

## names.json is live (written 23:45 ET)

183 entries (updated 00:20). Ids follow CONTRACTS.md. Every `sa` passes `validateDeva`, is NFC, and has no Latin.

**Display convention:** names are MW headword stems (राम, शैल, सिद्धाश्रम). The exceptions are the -mat/-vat
stems, which use the nominative (हनुमान्, जाम्बवान्), वाक् (stem वाच्), the kāṇḍa titles in the nominative
(बालकाण्डम् …), and the UI plurals पदानि and श्लोकाः.

### Omitted ids: use English for these
- `person.rishika`: MW glosses ऋषिका as "the wife of an inferior Ṛṣi", not "female sage". Show "Sage" in English, or reuse `person.rishi`.
- `person.villager_f`: the MW feminine forms of ग्रामीण mean "indigo plant". Show "Villager" in English.
(`person.villager_m` = ग्रामीण, MW "m. a villager, peasant", added 00:20.)

### Ids whose word differs from DESIGN §7 / §13 (for the battle, view and story agents)
- `move.agneyastra` = आग्नेय, `move.varunastra` = वारुण, `move.vayavyastra` = वायव्य. Bāla 1.27.8–11 names these astras
  with the adjectives (आग्नेयमस्त्रम्, वारुणं पाशमस्त्रम्, वायव्यम्). MW has no headword वारुणास्त्र (checked),
  and the other two compounds could not be confirmed, so the closed-world rule says to use the attested adjective.
  The English `en` still reads "Agni's astra" etc. `move.brahmastra` = ब्रह्मास्त्र is an MW headword (checked, p. 740).
- `item.kanda_mula` = मूल ("roots"). I could not confirm कन्दमूल as an MW headword with this sense.
- `item.sanjivani` = मृतसञ्जीवनी (Yuddha 74), `item.kusha_mudrika` = अङ्गुलीयक (Sundara 36).
- `element.none` = सामान्य ("ordinary"). It's there if the view wants it.
- Interior/route maps reuse a parent word: `place.ayodhya_palace` and `place.vasishtha_shala` = अयोध्या,
  `place.valmiki_hut` = आश्रम, `place.tataka_vana` and `place.mriga_vana` = वन, `place.khara_camp` = जनस्थान,
  `place.jatayu_glade` = दण्डकारण्य, `place.setu_shore` and `place.ocean_leap` = समुद्र, `place.shabari_ashrama` = पम्पा.
- Extra: `ui.ashrama` आश्रम, `ui.niska` निष्क.

If you need a name id that does not exist yet, write it here (or in your own notes) and I'll add it if I can
attest it. Don't put Sanskrit in your own files.

## RESOLVED 00:00: the hr/jna meaning clash (both lexicons now agree)

## Lexicon duplicates (content-a / content-b; not a test failure, but please merge)
- `aham` (lexicon-1, lemma अहम्) and `asmad` (lexicon-2, lemma अस्मद्) are the same pronoun.
- `kimcit` (lexicon-1) and `kincit` (lexicon-2) share the lemma किञ्चित्.
Both pairs count as two words in the Padakośa and can show up as each other's distractors. Pick one id. The other file
can reuse it, since merged entries just need identical lemma/pos/gender/meaning.

## For the human reviewer / content-a (not test failures)
- `s-ma-nishada`: RESOLVED. content-a now cuts at the word boundary (त्वम् | अगमः), per the orchestrator's convention.
- `s-ramo-vigrahavan` pāda 4: two uncited witnesses (vedapath/IITK vulgate and the ambuda condensed print) read
  देवानां मघवानिव. We store देवानामिव वासवः, as valmikiramayan.net 3-37-13 (I re-fetched it) and the CE 3.35.13 have it. It's an
  edition variant. Keep it; it's recorded in REVIEW.md.
- content-b's `provenance.sources[].note` fields quote the prapatti.com romanised text in IAST. That's not a Sanskrit
  field, so the test allows it, but the brief says "no IAST stored anywhere". Consider paraphrasing those notes.

## content.test.ts changes per the orchestrator (00:25)
- The sandhi rebuild now runs per half-verse: the words of pādas 1–2 (then 3–4) are joined as one sequence and compared
  with the concatenated half-line in SLP1, spaces ignored. Pause junctures are no longer accepted at pāda breaks, and
  no sandhi is applied between half-verses. All 21 verses pass except the listed exception s-dasoham. All 494 mutations
  (dropping a word, or moving a word to the other half-verse) are caught.
- `sandhiNotes[].joined` may occur anywhere in a half-line (SLP1, spaces ignored), so त्वमगमः matches त्वम् | अगमः.
- New convention check: a pāda that starts with the previous word's final consonant (a mid-syllable cut like त्व | मगमः)
  fails. The ṅamuṭ case (आयुष्मन्न् / नन्वेषसि) is allowed.
- REVIEW.md now has a "Human-review list" with every flagged reading (मा/मे/मां, निर्वृत्तं and नः/वः, वासवः/मघवान्,
  संध्या, सुप्रजा, the numbering notes, हनुमान्/हनूमान्, Āditya-hṛdaya not in the CE …).

## Verification log (details in REVIEW.md)
Names: 29 entries (27 distinct words) carry MW/Apte/Rāmāyaṇa evidence read online this session; the rest are
marked "asserted" in their provenance notes, for a human spot-check.
Method: each verse was re-fetched (WebFetch) from a host the author did not cite where possible, and compared
mechanically in SLP1 with spaces and daṇḍas removed (`exact`), then modulo anusvāra/class-nasal and optional
visarga→sibilant (`orthographic-only`).
- Exact or orthography-only match with an uncited host: s-tapah-svadhyaya (ambuda print), s-ko-nvasmin, s-samudra-iva
  (enjoylearningsanskrit), s-ma-nishada (ambuda), s-kausalya-supraja (vedapath), s-ramo-dvir (ambuda),
  s-pitari-shushrusha (Rāmāyaṇamuktāvalī on vishvasa.github.io), s-ramam-dasharatham (ambuda), s-golden-deer and
  s-aranya-3 (wisdomlib CE), s-naham-janami (vedapath).
- Kāṇḍas 5–6 (landed ~23:58): exact match with an uncited host for s-anirvedah (Rāmāyaṇamuktāvalī; the CE has a different
  second half), s-jayatyatibalo and s-maranantani (wisdomlib), s-sakrdeva (de.wisdomlib), s-aditya-hrdayam (greenmesg.org,
  shlokam.org). s-dasoham: same words as the CE (हनुमाञ् vs our हनुमान्, sandhi spelling only).
- Edition variants (recorded in REVIEW.md, not errors): s-ramo-vigrahavan pāda 4 (see above); s-kalyani-bata pāda 2: the
  Rāmāyaṇamuktāvalī reads मां, a third reading next to मा (ours, prapatti) and मे (valmikiramayan.net line), which content-b already flagged.
- No uncited witness found: s-nanrgveda and s-vyakaranam (not in the CE, so CE-based sites lack them). Re-fetching
  the cited vedapath and valmikiramayan.net confirms content-b's notes, including those sources' misprints.
- Sandhi-engine exception: s-dasoham pāda 3 (हनुमान् शत्रु- printed unassimilated; the engine applies ścutva → ञ्).
- Test-harness fix (00:05): the rebuild now decides each junction on the original words, so whole-word rules
  (एषः/सः before a consonant) apply. This made s-maranantani pass. All 247 drop-one-word mutations are detected.
