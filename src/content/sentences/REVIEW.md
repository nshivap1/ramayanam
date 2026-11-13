# sentences pack — review sheet for a Sanskrit scholar

Status: **machine-verified, not yet human-reviewed.** Least certain first.
Read the sentences in `data.ts` (one per line) or print them with `sentenceText`.

## 1. Naturalness and meaning (the machine cannot judge this)

- [ ] every sentence is something a teacher would say; flag stilted ones. Known literal spots:
      `X सर्वदा … -एत्` (vidhiliṅ with सर्वदा), `X Y विना न जीवति`, animals as subjects of इच्छति / शक्नोति,
      plural kin terms (जनकाः गच्छन्ति), "मधुरम् मोदकम्", तौ / आवाम् / युवाम् sentences without context
- [ ] kāraka choices: क्रीडति with tṛtīyā (कन्दुकेन क्रीडति); मिलति with सह + tṛtīyā; नमति / वन्दते / सेवते with
      dvitīyā; क्रीणाति with pañcamī of the shop (आपणात्); बिभेति with pañcamī; विना with dvitīyā and tṛtīyā;
      प्रति after its dvitīyā; saptamī of वृक्ष for "on the tree", of जल for "in water"
- [ ] vocative pattern `हे पुत्र गृहम् गच्छ` without comma and without त्वम्
- [ ] word order (time adverb first; सर्वदा after the kartā; adjective directly before its noun)

## 2. Spelling policy

- [ ] padaccheda with final म् kept (`बालकः पुस्तकम् पठति।`) as the stored form, and
      `sentenceTextAnusvara` (`पुस्तकं पठति`) as the display form — confirm this is what the games should show
- [ ] no other sandhi is applied (`सः उपाविशत्`, `छात्रः अपि`, `बालिका अपि`) — as in beginner materials

## 3. Nouns declined by model (not headwords in the oracle)

बालक, बालिका, शिक्षक, चोर, गायक, विद्यालय, नगर, मोदक, कार्य, उत्तर (n), लेखनी, चमस, नौका, पुस्तक —
forms built from देव / वन / लता / नदी endings with ṇatva and confirmed by the CC0 ending table (and by the
`shabda` pack for बालक, बालिका, पुस्तक).
- [ ] ṇatva: शिक्षकेण, शिक्षकाणाम्, नगरेण, नगराणि, कार्येण, कार्याणि, चोरेण vs बालकेन, विद्यालयेन, पुस्तकानि, मोदकेन
- [ ] gender of the hand-typed stems (मित्र n, पुस्तक n, शाक m, मोदक m, उत्तर n, आपण m, तडाग m) and the choice of
      मातृ / जननी, कन्या / बालिका; बालिका's gender rests on the `shabda` pack only
- [ ] adjectives with feminine in -ā (मधुरा, शीतला, नूतना, दीर्घा, रक्ता, पक्वा, निर्मला, कुशला, अलसा, स्थूला)

## 4. Prefixed verb forms outside laṭ 3sg (built by joining, not individually attested)

- [ ] laṅ with the augment after the prefix: आगच्छत्, उपाविशत्, प्राविशत्, अवागच्छत्, आनयत्, उदतिष्ठत् and their
      other persons (आगच्छः, उदतिष्ठत, आनयन् …)
- [ ] lṛṭ / loṭ / vidhiliṅ of आ-गम्, उप-विश्, उद्-स्था, आ-नी, प्र-विश्, अव-गम्, वि-स्मृ, प्र-क्षल्, उद्-घट्
      (आनेष्यति, प्रवेक्ष्यति, उत्थास्यति, आगमिष्यति, प्रक्षालयतु, उद्घाटय …)

## 5. Pronouns and honorifics

- [ ] भवान् / भवती always with a prathama-puruṣa verb; glossed "you (sir / madam)"
- [ ] ते (m. pl.) / ताः (f. pl.) / तौ; मम, तव, तस्य, तस्याः, भवतः as sambandha
- [ ] tag gender `x` for अस्मद् / युष्मद्

## 6. English

- [ ] translations are grammatical and match (present simple for laṭ, "should always" for vidhiliṅ,
      "Please …" for भवान् + loṭ, "Let him …" for 3rd-person loṭ)

## 7. Already machine-checked (spot-check only)

Every verb form is in the tagged cell of the dhātu pack; every nominal form is re-derived from the
reference declensions; agreement, government and tense–adverb pairing are recomputed in the tests.

## Sign-off

| Reviewer | Date | Scope reviewed (sections / ids) | Corrections filed |
|---|---|---|---|
| | | | |
