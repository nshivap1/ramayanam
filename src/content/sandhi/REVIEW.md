# Sandhi pack — review sheet for a Sanskrit scholar

Status: **machine-verified, not yet human-reviewed** (`provenance.humanReviewed` is unset on every item).
Sign off by adding your name and date at the bottom; per-item sign-off is recorded by setting
`humanReviewed: true` through the generator (ask the maintainers), never by editing `data.ts`.

What the machines already guarantee: every `first + second = result` is reproduced by the sandhi engine under the
stated rule (847 / 847), 697 are also confirmed by an independent CC0 rule table, and compound results were looked
up in Monier-Williams / Apte. What they cannot judge is listed below, least certain first.

## 1. Lower-confidence items — please read these first

### 1a. Compound results found in neither dictionary nor corpus (38)

The sandhi is regular; the question is only whether each is a natural, acceptable word.

पुस्तकालयः · भानूदयः · गुरूपदेशः · वधूत्सवः · जलोर्मिः · ग्रीष्मर्तुः · गङ्गौघः · देवैश्वर्यम् · मध्वरिः · पित्राज्ञा · मात्राज्ञा ·
अत्युत्तमः · अत्यधिकम् · उपर्युक्तम् · गुर्वाज्ञा · मनोबलम् · रजोगुणः · दुर्गुणः · दुश्चरित्रम् · निश्छलः · धनुष्टङ्कारः · अधःपतनम् ·
मनःशान्तिः · निःस्वार्थः · अहरहः · सदुपदेशः · जगज्जननी · तट्टीका · तल्लीनः · तल्लयः · भगवल्लीला · मच्छिष्यः · श्रीमन्नारायणः ·
वाग्घरिः · तद्धेतुः · परन्तु · एकच्छत्रम् · उत्थातुम्

### 1b. Derivational (`internal`) ayādi examples (16)

ने + अनम् = नयनम्, गै + अकः = गायकः, भौ + उकः = भावुकः, नौ + इकः = नाविकः, भे + अम् = भयम्, जे + अः = जयः … These follow the
usual textbook presentation (guṇa / vṛddhi form of the root + suffix). Please confirm each split is one you would
teach; गै + अकः = गायकः in particular is the school analysis, whereas the strict prakriyā is गा + युक् + अक.

### 1c. Artificial but rule-true examples

Grammar-book sentences kept only to illustrate rare rules: रामष्टीकते, चलंष्टिट्टिभः, तड्ढौकते, महाण्डमरुः, तड्डमरुः, सुगण्णीशः,
प्रत्यङ्ङात्मा, शिवच्छाया, वसुम् + धरा = वसुन्धरा (aluk first member), किम् + नरः = किन्नरः.

### 1d. Items verified by the engine only (63)

Rules the independent table does not cover: pragrhya (15), visarga-sah-esah (11), visarga-bhoh (10),
visarga-shari (10), namut (8), purvarupa with vocatives in -o (4), and a few others. A wrong engine rule here would
not be caught by a second source.

### 1e. Stem-final द् in `cartva`

उद् + साहः = उत्साहः, तद् + परः = तत्परः, शरद् + कालः = शरत्कालः …: the first member is given in its stem form (उद्, तद्,
शरद्, विपद्, आपद्, सुहृद्) so that खरि च (8.4.55) is visible. Confirm this presentation.

## 2. Checklist for the whole pack

- [ ] Every `result` is the form you would write (spacing convention: consonant-final words joined, vowel /
      anusvāra / visarga-final words apart).
- [ ] `alternatives` list only genuinely optional forms; none is missing that a learner might legitimately answer.
- [ ] `compound: true` marks exactly the word-internal junctions.
- [ ] Levels: common vowel sandhi 2–3, visarga 3 (rarer 4), consonant 3–4.
- [ ] English glosses are accurate.
- [ ] `pending.ts`: each of the 26 special forms carries the right sūtra / vārttika.

## 3. Sign-off

| reviewer | date | scope | remarks |
|---|---|---|---|
| | | | |


## Corrections applied after the independent audit (11 Nov 2026, docs/audit/SANSKRIT_AUDIT_B.md)

- Removed `sandhi-visarga-satva-29` (हरिः + चन्द्रः = हरिश्चन्द्रः): not visarga sandhi — the ś is the suṭ augment of 6.1.153 on the stem हरि.
- `sandhi-anunasika-25` (यत् + मया): added the optional form यद्मया (8.4.45 is optional before an independent word; the nasal is obligatory only before the suffixes -मय / -मात्र).
