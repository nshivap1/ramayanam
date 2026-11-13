# Samāsa pack — review sheet for a Sanskrit scholar

Status: **machine-checked for form, not yet human-reviewed.** In this pack the essential content — the type and
the vigraha of each compound — is a grammatical judgement. Programs verified only that every vigraha word is a real
inflected form, that member stems exist, and (for 214 of 244) that the compound is a dictionary headword. A reviewer's
sign-off is therefore required before `humanReviewed: true` is set.

## 1. Lower-confidence items — please read these first

### 1a. Classification choices a grammarian might state differently

| compound | as stored | remark |
|---|---|---|
| शरणागतः | द्वितीया-तत्पुरुषः (शरणम् आगतः) | आगत is not literally in the list of 2.1.24 (श्रितातीतपतितगतात्यस्तप्राप्तापन्नैः); school books accept it |
| जलमग्नः, ध्यानमग्नः, वनवासः, गृहप्रवेशः, रणशूरः | सप्तमी-तत्पुरुषः | common school examples; not from the śauṇḍādi list |
| देवदत्तः | तृतीया-तत्पुरुषः (देवेन दत्तः) | as an appellative; as a proper name it is unanalysed |
| गणेशः, सुरेशः, नरपतिः | षष्ठी-तत्पुरुषः with a plural first member | |
| पुरुषव्याघ्रः, पुरुषसिंहः, चरणकमलम् | उपमानोत्तरपद-कर्मधारयः (उपमितसमासः) | चरणकमलम् may also be read as rūpaka (चरणम् एव कमलम्) |
| मुखचन्द्रः, विद्याधनम् | अवधारणापूर्वपद-कर्मधारयः (rūpaka) | मुखचन्द्रः may also be read as upamita (मुखं चन्द्रः इव) |
| दिगम्बरः | बहुव्रीहिः (दिक् एव अम्बरं यस्य सः) | |
| गजाननः, मृगनयना, कमलनयनः, चन्द्रमुखी | उपमान-बहुव्रीहिः | vigraha given in the short school form (गजस्य इव आननं यस्य सः) |
| अनादिः, अनन्तः, अपुत्रः | नञ्-बहुव्रीहिः (न विद्यते … यस्य सः) | filed under `bahuvrihi`, not `nan-tatpurusha` |
| निर्धनः | प्रादि-बहुव्रीहिः (निर्गतं धनं यस्मात् सः) | |
| पञ्चतन्त्रम्, अष्टाध्यायी, त्रिफला | समाहार-द्विगुः | titles / names analysed in the usual way |
| दम्पती | द्वन्द्वः (जाया च पतिः च) | जाया → दम् is irregular |
| अधिहरि, अनुविष्णु, अतिहिमम्, बहिर्ग्रामम्, निर्मक्षिकम् | अव्ययीभावः | classical Kāśikā / Kaumudī examples, rare in use |
| भास्करः | उपपद (भासं करोति इति) | |
| द्विजः, अग्रजः | उपपद (द्विः / अग्रे जायते इति) | जायते is used in the vigraha for ‘is born’ |
| नृपः, गोपः | उपपद with पाति (‘protects’) | मधुपः, पादपः with पिबति (‘drinks’) |

### 1b. Compounds that are in neither Monier-Williams nor Apte (30)

कृष्णश्रितः · ज्ञानशून्यः · मातृसदृशः · कुण्डलहिरण्यम् · चोरभयम् · व्याघ्रभीतः · स्वर्गपतितः · वृक्षपतितः · ऋणमुक्तः · देवमन्दिरम् ·
देशसेवा · मातृभाषा · पुस्तकालयः · गृहस्वामी · कार्यालयः · शास्त्रप्रवीणः · युद्धनिपुणः · ध्यानमग्नः · सभापण्डितः · वज्रकठोरः ·
रामलक्ष्मणौ · कृष्णार्जुनौ · भीमार्जुनौ · नकुलसहदेवौ · गुरुशिष्यौ · जन्ममरणे · पार्वतीपरमेश्वरौ · फलपुष्पाणि · कन्दमूलफलानि · उपगङ्गम्

(Grammar-book examples, dvandvas of names, and modern school words such as पुस्तकालयः, कार्यालयः, मातृभाषा.)

### 1c. Subtype labels of avyayībhāvas

Stored as the sense condition in the locative (पदार्थानतिवृत्तौ, वीप्सायाम्, सामीप्ये, अभावे, योग्यतायाम्, विभक्त्यर्थे, पश्चादर्थे,
अत्यये, पञ्चम्यन्तेन). Confirm wording.

## 2. Checklist for every item

- [ ] The type is the one a standard textbook gives.
- [ ] The vigraha is the conventional one, each word in the right case, number and gender.
- [ ] The citation form (gender, number) is correct.
- [ ] Member stems are right (`राजन्` not `राज`, `महत्` not `महा`, `पञ्चन्`, `मनस्` …).
- [ ] The English gloss matches the analysis (bahuvrīhis glossed "he whose …").
- [ ] Level 4 items are really common enough for recognition at Śikṣā level.
- [ ] `SAMASA_TYPES` in `index.ts`: names, IAST and hints are correct.

## 3. Sign-off

| reviewer | date | scope | remarks |
|---|---|---|---|
| | | | |
