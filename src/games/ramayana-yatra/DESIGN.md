# रामायणयात्रा · Rāmāyaṇa Yātrā — Game Design

*A retro-modern, Pokémon-style RPG in which real ślokas of Vālmīki's Rāmāyaṇa are the source of every power. Built for the Samskuru platform.*

## 1. Pitch

You are a young śiṣya (student) at **Vālmīki's āśrama on the Tamasā river**. You witness the birth of the very first śloka (*mā niṣāda*, Bāla 1.2.15). Then a rākṣasa illusion (*māyā*) scatters the *padas* (words) of the newly composed Rāmāyaṇa. Vālmīki gives you a palm-leaf **Śloka-kośa** and sends you *into the story* to witness each kāṇḍa, travel beside its heroes, and restore its verses.

In battle the heroes' **astras answer to mantras**: every move is invoked by a Sanskrit challenge drawn from the verses you have heard. Recite correctly and the astra lands. Recite swiftly and perfectly (*śuddha*) and it lands harder. Get it wrong and the move weakens, and the game shows you the right answer and why. That's the teaching moment. **Learning Sanskrit *is* the combat mechanic.**

Pokémon mapping:

| Pokémon | Rāmāyaṇa Yātrā |
|---|---|
| Professor Oak | Vālmīki (gives the Śloka-kośa) |
| Rival | **Bharadvāja**, Vālmīki's disciple, who was with him at the Tamasā (Bāla 1.2). Friendly *śāstrārtha* (verse-debate) duels |
| Pokédex | **Padakośa** (words, with mastery tiers) + **Ślokakośa** (verses) |
| Tall grass | **Kuśa grass**: random encounters with rākṣasas in forests |
| Pokémon Center | **Āśrama shrine**: rest (full heal), save, and *recite* verses to restore them |
| Gym leader / badge | Kāṇḍa boss. Each chapter's final gate needs its **key śloka** restored |
| Poké Mart | Haṭṭa (market) stall: *phala* (fruit, heals), *madhu* (honey, restores PP), *oṣadhi* (herb, revives) |
| Trainer battles | Śāstrārtha duels with paṇḍitas, Bharadvāja, and Hanumān (non-violent; "conviction" instead of HP) |
| Party | Heroes join as the story unfolds: Rāma, Lakṣmaṇa, Hanumān, Sugrīva, Jāmbavān, Vibhīṣaṇa, plus you (the reciter) |

## 2. Samskuru principles applied

1. **Real Sanskrit only.** Every Sanskrit string is either from a source-traced verse or a dictionary-backed lexicon entry. No pseudo-Sanskrit and no invented "mantras." Move names are real Sanskrit words (āgneyāstra, abhaya, jaya…).
2. **Source-traced and reviewable.** Each śloka carries its kāṇḍa.sarga.verse, edition note, source URLs, and review status. The validator fails on missing metadata.
3. **Devanagari-first** with a single **Script** setting (Devanagari / IAST). It applies everywhere Sanskrit appears: dialogue, cards, challenges, menus, Padakośa.
4. **The content registry is separate from the engine** (`/content/*.json`). The engine never hard-codes Sanskrit.
5. **Machine checks catch transcription errors.** Devanagari↔IAST agreement, 8 syllables per anuṣṭubh pāda, every verse word present in the lexicon, every lexicon form traceable to a verse.
6. **Mobile-first.** 100dvh, touch D-pad + A/B, keyboard, Devanagari never below 16px, no Sanskrit wrapping inside a word.
7. **Respect.** Rāma, Sītā, Hanumān and the sages are portrayed with dignity. No comic disrespect. Sītā never fights and is never shown being harmed. Abduction and deaths are narrated, not depicted. Vālī's death is not gamified. A hero at 0 HP is *śrānta* (exhausted), not "fainted."

## 3. Core loop

Explore → talk to people (hear ślokas in context; verse cards teach word by word) → walk through kuśa grass and fight rākṣasas (each move = a challenge) → collect words (mastery rises) → rest at an āśrama and **recite** verses to restore them (which unlocks astras) → beat the kāṇḍa boss → next kāṇḍa.

Target length: 45–75 minutes for a full playthrough.

## 4. Learning system

### 4.1 Challenge kinds (unlock by chapter)

| Kind | Name | Unlocks | Mechanic |
|---|---|---|---|
| `artha` | अर्थ meaning | ch1 | Word (current script) → pick its English meaning (4 options; distractors share pos/tags) |
| `lipi` | लिपि script | ch1 | Word shown in IAST → pick its Devanagari (or the reverse when Script = IAST) |
| `purana` | पूरण fill | ch2 | A pāda with one word blanked (＿＿) → pick the missing word |
| `krama` | क्रम order | ch3 | The words of a pāda, shuffled → tap them in order |
| `viccheda` | विच्छेद split | ch4 | A sandhi-joined form → pick the correct split |
| `vibhakti` | विभक्ति role | ch5 | A word in its verse → pick its role (subject/object/address/…) |

If a kind lacks data (for example, no sandhi notes heard yet), fall back: `vibhakti→artha`, `viccheda→artha`, `krama→purana→artha`, `purana→artha`.

### 4.2 Word pool and SRS
- Pool = words from ślokas the player has **heard**, plus words restored by defeating foes. Current-chapter words are weighted ×2.
- Leitner boxes 0–5. Correct: box+1. Wrong: box=max(0, box−2). Selection weight ∝ (6 − box) × recency factor.
- Mastery tiers: box 0 & seen=0 → *unseen* (अदृष्ट); seen → *seen* (दृष्ट); box ≥ 2 → *known* (ज्ञात); box ≥ 4 → *mastered* (सिद्ध).

### 4.3 Timers
Default limits: 15 s (choice kinds), 25 s (krama). *Swift* = answered within 40% of the limit. The **Relaxed** setting removes timers (swift is then awarded for correct-on-first-try).

### 4.4 Teaching moments
After every answer, show the correct answer, the word's lemma, grammar, gloss and its verse reference (e.g. "अगमः — 2nd sg. aorist of √gam 'go'; with मा = 'may you not attain' — Bāla 1.2.15"). Keep it short and skippable.

### 4.5 Verse lifecycle
1. **Heard**: an NPC recites the verse in story context. The verse card shows pādas, word-by-word gloss, our own translation, context and source. Marks words *seen*.
2. **Restored**: at an āśrama shrine, **Recite** runs a sequence: one `krama` per pāda (or `purana` before ch3), then 2 `artha`/`vibhakti` questions on key words. Accuracy ≥ 75% restores it, unlocks its move (`MoveDef.unlockShloka`), plays the `restore` sfx and shows the verse in gold in the Ślokakośa.
3. Each chapter's **key śloka** must be restored to pass the final gate (an NPC or barrier explains this kindly and points to the nearest shrine).

## 5. Battle system

- 1 active hero vs 1 foe at a time (foes may come in sequence). Turn order by `spd`. The player can **Fight** (choose 1 of up to 4 moves, which runs that move's challenge), **Switch**, use an **Item**, or **Run** (wild only).
- Damage: `base = floor(((2*L/5 + 2) * power * atk/def) / 50) + 2`; × element multiplier (ELEMENT_CHART) × 1.25 if move.element == user.element × quality. Quality: swift-correct 1.5 (*śuddha!* crit text), correct 1.0, wrong 0.35 (the move still partly lands). Enemy moves use quality 1.0 with ±15% random variance, and 1.5 on a 1/16 crit.
- Status moves: correct → full effect; wrong → no effect. Buff stages ±3 max, each stage ×1.25/×0.8.
- PP per move. At 0 PP the move can't be chosen. *Madhu* restores PP.
- XP: `enemy.xp * enemyLevel / 5`, shared by heroes who took part. Level curve: `xpToNext(L) = round(12 * L^1.8)`. On level up: stats += growth, learn moves by level, and the `levelup` sfx plays.
- Losing (all heroes śrānta, `canLose=false`): fade out, return to the last āśrama (`state.respawn`) fully healed, and lose 10% niṣka. Message: "The heroes rest at the āśrama and recover."
- Duels (`kind: 'duel'`) use the same engine with a different vocabulary: HP is "conviction" (*śraddhā*), and the defeated duelist is "persuaded" (*pratyāyita*).
- Defeating a foe with `restoresWords` pops word cards ("Restored पद: वनम् — forest") and marks them seen.

## 6. Party & progression

| Ally id | Joins | Element | Role |
|---|---|---|---|
| `player` | start | `none` | Reciter: support (heal/buffs), weak attacks. Uses `artha`/`lipi`-type mantras |
| `rama` | ch1 (Viśvāmitra takes the princes) | `divya` | Archer, strongest hero |
| `lakshmana` | ch1 | `agni` | Fast striker, defensive buffs |
| `hanuman` | ch4 (after friendly duel) | `vayu` | Wind-son, huge hp/atk |
| `sugriva` | ch4 | `bhumi` | Bruiser |
| `jambavan` | ch4 | `bhumi` | Tank, wisdom heals |
| `vibhishana` | ch6 | `jala` | Counsel: debuffs vs Laṅkā foes |

Party max 6, with all members usable in battle via Switch. In ch5 (Sundara), only Hanumān and the player are in the party (the leap). Leave/rejoin the others with `leave`/`join` events. Joining allies come in at the party's average level.

Recommended levels: ch1 boss L6, ch2 duel L10, ch3 boss L14, ch4 duel L18, ch5 boss L22, ch6 final L28.

## 7. Moves (ids are canonical — define in content/moves.json)

| id | Sanskrit | User | Elem | Power | Challenge | Origin |
|---|---|---|---|---|---|---|
| `pada_bana` | पदबाण "word-arrow" | player | none | 35 | artha | start |
| `lipi_raksha` | लिपिरक्षा "script-guard" | player | none | 0 (buff-def party +1) | lipi | start |
| `shoka_shloka` | शोकश्लोक "grief become verse" | player | divya | 60 | purana | restore s-ma-nishada |
| `suprabhata` | सुप्रभात "auspicious dawn" | player | divya | 0 (heal party 0.35) | artha | restore s-kausalya-supraja |
| `shuddha_vak` | शुद्धवाक् "flawless speech" | player | divya | 0 (buff-atk party +1) | viccheda | restore s-vyakaranam |
| `bana` | बाण "arrow" | rama, lakshmana | none | 40 | artha | start |
| `agneyastra` | आग्नेयास्त्र | rama | agni | 75 | lipi | Viśvāmitra (ch1) |
| `varunastra` | वारुणास्त्र | rama | jala | 75 | lipi | Viśvāmitra (ch1) |
| `vayavyastra` | वायव्यास्त्र | rama | vayu | 75 | purana | Viśvāmitra (ch1) |
| `dharma_vigraha` | धर्मविग्रह "dharma embodied" | rama | divya | 95 | krama | restore s-ramo-vigrahavan |
| `abhaya` | अभय "fearlessness" | rama | divya | 0 (buff-def party +2) | krama | restore s-sakrdeva |
| `aditya_hrdaya` | आदित्यहृदय | rama | divya | 0 (heal party 0.5 + buff-atk +1) | vibhakti | restore s-aditya-hrdayam |
| `brahmastra` | ब्रह्मास्त्र | rama | divya | 130 | krama | Agastya (ch6, after Āditya-hṛdaya) |
| `khadga` | खड्ग "sword" | lakshmana | none | 50 | artha | start |
| `viddhi` | विद्धि "know (this)!" | lakshmana | none | 0 (debuff-def enemy −2) | purana | restore s-ramam-dasharatham |
| `agni_bana` | अग्निबाण | lakshmana | agni | 70 | lipi | level 8 |
| `vayu_vega` | वायुवेग "wind-speed" | hanuman | vayu | 70 | artha | start |
| `gada` | गदा "mace" | hanuman, sugriva | bhumi | 65 | artha | start |
| `jaya_ghosha` | जयघोष "victory cry" | hanuman | divya | 0 (buff-atk party +2) | krama | restore s-jayatyatibalo |
| `anirveda` | अनिर्वेद "undaunted" | hanuman | none | 0 (heal self 0.5) | purana | restore s-anirvedah |
| `shaila` | शैल "mountain-crag" | sugriva, jambavan | bhumi | 80 | purana | level 18 |
| `vriksha` | वृक्ष "uprooted tree" | sugriva | bhumi | 60 | artha | start |
| `prajna` | प्रज्ञा "wisdom" | jambavan | none | 0 (heal party 0.3) | vibhakti | start |
| `mantrana` | मन्त्रण "counsel" | vibhishana | jala | 0 (debuff-atk enemy −2) | viccheda | start |
| `jala_dhara` | जलधारा "torrent" | vibhishana | jala | 70 | artha | start |

Enemy moves (always "correct" quality): `nakha` नख claw (40), `maya_jala` मायाजाल illusion-net (55, maya, debuff-def), `shula` शूल spear (60), `garjana` गर्जन roar (0, buff-atk self), `andhakara` अन्धकार darkness (65, maya), `parigha` परिघ iron club (80, bhumi), `agni_varsha` अग्निवर्ष rain of fire (85, agni), `naga_pasha` नागपाश serpent-noose (90, maya, stun 0.3), `chandrahasa` चन्द्रहास (Rāvaṇa's sword, 110, maya), `tarka` तर्क argument (duelists, 45), `prashna` प्रश्न question (duelists, 0, debuff-atk).

## 8. Enemies (ids canonical — define in content/enemies.json)

Wild: `nishachara` (night-wanderer, maya), `yatudhana` (maya), `rakshasi` (maya), `maya_mriga` (illusory deer, maya), `vana_spirit` (forest spirit, bhumi), `sea_serpent` (jala, ch5 ocean).
Bosses: `tataka` (ch1), `subahu` & `maricha` (ch1 yajña defence, maricha flees per canon), `khara` & `dushana` (ch3), `maricha` as golden deer (ch3 boss), `kabandha` (ch3 optional), `lankini` (ch5 gate), `aksha` (ch5), `dhumraksha`, `kumbhakarna`, `indrajit` (ch6), `ravana` (final).
Duelists: `bharadvaja_duel` (ch1 tutorial duel + ch2 chapter duel), `pandita_duel` (ch2 Ayodhyā assembly), `hanuman_duel` (ch4, a friendly test of eloquence after which Hanumān joins).

## 9. Chapters, maps and beats

Map ids are canonical. Map sizes are roughly 20–40 × 14–30 tiles. Every chapter has ≥1 āśrama shrine (rest/save/recite) and ≥1 market.

### Ch1 · बालकाण्डम् Bāla Kāṇḍa (Book of Youth): `ch1.json`
Maps: `tamasa_ashrama` (hub: Vālmīki's hut interior `valmiki_hut`, shrine, Bharadvāja), `tamasa_bank` (riverbank: the krauñca scene), `siddhashrama_road` (route with kuśa grass), `tataka_vana` (dark forest, Tāṭakā boss), `siddhashrama` (Viśvāmitra's āśrama: yajña defence).
Beats:
1. Name and avatar → wake in the āśrama. Vālmīki has just heard **Nārada** describe the ideal man: **s-tapah-svadhyaya** + **s-ko-nvasmin** (Vālmīki's question). Tutorial: movement, talking, the first verse card.
2. Walk with Vālmīki and Bharadvāja to the Tamasā. A hunter (`hunter`) shoots one of a pair of krauñca birds. Vālmīki's grief becomes verse: **s-ma-nishada** (the first śloka). The game explains the anuṣṭubh (4 pādas × 8 syllables).
3. A shadow of māyā scatters words. Vālmīki gives the Śloka-kośa. First **tutorial duel vs Bharadvāja** (`bharadvaja_duel` L3, canLose=true). Tutorial: restore **s-ma-nishada** at the shrine (key śloka; unlocks `shoka_shloka`).
4. Enter the story: Viśvāmitra leads Rāma and Lakṣmaṇa (both join). Dawn on the road: **s-kausalya-supraja** (Viśvāmitra wakes Rāma). Viśvāmitra grants `agneyastra`, `varunastra`, `vayavyastra`.
5. Kuśa grass encounters (`nishachara`, `vana_spirit`). Description of Rāma: **s-samudra-iva**.
6. Boss **Tāṭakā** in `tataka_vana`. Then defend the yajña at `siddhashrama`: **Subāhu** then **Mārīca** (Mārīca is blown far away into the ocean, not killed, which is canon).

### Ch2 · अयोध्याकाण्डम् Ayodhyā Kāṇḍa (Book of Ayodhyā): `ch2.json`
Maps: `ayodhya_city` (hub, market, Vasiṣṭha's school), `ayodhya_palace` (interior), `vasishtha_shala` (school, the "gym" with 3 paṇḍita duels), `shringaverapura` (Gaṅgā ghāṭ, Guha), `chitrakuta` (forest hermitage, shrine).
Beats: coronation preparations → Kaikeyī's boons, narrated with restraint → Rāma accepts exile: **s-ramo-dvir** (Rāma never speaks twice) and **s-pitari-shushrusha** (no dharma greater than obeying one's father) → Sumitrā's blessing to Lakṣmaṇa: **s-ramam-dasharatham** (key śloka) → Vasiṣṭha's school: 3 `pandita_duel` duels (L8–10) → Guha ferries them across the Gaṅgā → Chitrakūṭa: Bharata comes and takes the pādukās (narrated) → chapter duel vs **Bharadvāja** (L10) at the Chitrakūṭa gate (needs the key śloka restored).

### Ch3 · अरण्यकाण्डम् Araṇya Kāṇḍa (Book of the Forest): `ch3.json`
Maps: `dandaka_vana` (big route, lots of kuśa), `panchavati` (hut hub, shrine), `khara_camp` (boss: Khara + Dūṣaṇa), `mriga_vana` (golden deer chase → Mārīca boss), `jatayu_glade` (narrated), `shabari_ashrama` (Pampā, shrine + market).
Beats: sages of Daṇḍaka ask for protection → Pañcavaṭī → Khara and Dūṣaṇa's army (bosses L12–13) → Mārīca, terrified, warns Rāvaṇa about Rāma: **s-ramo-vigrahavan** (key śloka, heard as a flashback scene) → the golden deer appears: Sītā's wish (third Araṇya verse, chosen by research) → chase through `mriga_vana`: `maya_mriga` encounters → **Mārīca** boss (L14) → Jaṭāyu tells of the abduction (narrated respectfully, no fight shown) → Śabarī's āśrama (rest; she points them to Ṛṣyamūka) → optional Kabandha.

### Ch4 · किष्किन्धाकाण्डम् Kiṣkindhā Kāṇḍa (Book of Kiṣkindhā): `ch4.json`
Maps: `rishyamuka` (hills; Hanumān in disguise), `kishkindha_caves` (vānara city hub, market, shrine), `vindhya_search` (search route), `mahendra_hill` (ocean shore; Jāmbavān's speech).
Beats: Hanumān approaches disguised as a mendicant and speaks flawlessly → Rāma praises his speech: **s-nanrgveda** and **s-vyakaranam** (key śloka; the game's meta-moment: perfect grammar!) → **friendly duel vs Hanumān** (`hanuman_duel` L16), then Hanumān, Sugrīva and Jāmbavān join → Sugrīva shows Sītā's jewels; Lakṣmaṇa recognizes only her anklets: **s-naham-janami** → search parties (narrate Vālī briefly: "Sugrīva regained his kingdom"; no Vālī battle) → `vindhya_search` encounters → Mahendra hill: Jāmbavān reminds Hanumān of his strength → leap at chapter end.

### Ch5 · सुन्दरकाण्डम् Sundara Kāṇḍa (Book of Beauty): `ch5.json`
Maps: `ocean_leap` (short scrolling flight scene: `sea_serpent` encounters, Mainaka narrated), `lanka_gate` (Laṅkinī boss), `lanka_city` (night streets; patrols = trainer-style fixed battles), `ashoka_vatika` (garden; Sītā).
Party: Hanumān + player only (others `leave` at Mahendra and rejoin in ch6).
Beats: leap → **Laṅkinī** (L19) → searching the city in despair, Hanumān steels himself: **s-anirvedah** → Aśoka-vāṭikā: Sītā; Hanumān sings Rāma's story softly; Sītā's joy: **s-kalyani-bata** → Hanumān announces himself: **s-jayatyatibalo** (key śloka) + **s-dasoham** → **Akṣa** (L22) → (Laṅkā burning narrated) → return.

### Ch6 · युद्धकाण्डम् Yuddha Kāṇḍa (Book of War): `ch6.json`
Maps: `setu_shore` (vānaras build the setu), `setu` (bridge walk with encounters), `suvela_camp` (hub, shrine, market; Vibhīṣaṇa), `lanka_battlefield` (Dhūmrākṣa, Kumbhakarṇa, Indrajit), `lanka_palace` (final: Rāvaṇa). Then epilogue maps `ayodhya_return` (coronation) and back to `tamasa_ashrama`.
Beats: (party rejoins) → Vibhīṣaṇa seeks refuge; Rāma's vow: **s-sakrdeva** (Vibhīṣaṇa joins) → setu → battlefield bosses: **Dhūmrākṣa** L24, **Kumbhakarṇa** L26, **Indrajit** L27 → Agastya teaches Rāma the Āditya-hṛdaya: **s-aditya-hrdayam** (key śloka; Agastya also grants `brahmastra`) → **Rāvaṇa** (L30) → Rāma to Vibhīṣaṇa: **s-maranantani** (enmity ends with death) → return to Ayodhyā: coronation → epilogue at the Tamasā: Vālmīki thanks you. Credits list every restored śloka.

## 10. Ślokas (ids canonical; text, numbering and glosses verified by research)

| id | Kāṇḍa | Expected ref (verify) | Opening |
|---|---|---|---|
| s-tapah-svadhyaya | 1 | 1.1.1 | तपःस्वाध्यायनिरतं… |
| s-ko-nvasmin | 1 | 1.1.2 | को न्वस्मिन् साम्प्रतं लोके… |
| s-samudra-iva | 1 | 1.1.17 | …समुद्र इव गाम्भीर्ये धैर्येण हिमवानिव |
| s-ma-nishada | 1 | 1.2.15 | मा निषाद प्रतिष्ठां त्वम्… |
| s-kausalya-supraja | 1 | 1.23.2 | कौसल्या सुप्रजा राम… |
| s-ramo-dvir | 2 | 2.18.30 | …रामो द्विर्नाभिभाषते |
| s-pitari-shushrusha | 2 | 2.19.22 | न ह्यतो धर्मचरणं… |
| s-ramam-dasharatham | 2 | 2.40.9 | रामं दशरथं विद्धि… |
| s-ramo-vigrahavan | 3 | 3.37.13 | रामो विग्रहवान् धर्मः… |
| s-golden-deer | 3 | (research picks a verifiable verse of Sītā on the deer) | |
| s-aranya-3 | 3 | (research picks a 3rd verifiable Araṇya verse, e.g. Jaṭāyu or Śabarī) | |
| s-nanrgveda | 4 | 4.3.28 | नानृग्वेदविनीतस्य… |
| s-vyakaranam | 4 | 4.3.29 | नूनं व्याकरणं कृत्स्नम्… |
| s-naham-janami | 4 | 4.6.22 | नाहं जानामि केयूरे… |
| s-anirvedah | 5 | 5.12.10 | अनिर्वेदः श्रियो मूलम्… |
| s-kalyani-bata | 5 | 5.34.6 | कल्याणी बत गाथेयं… |
| s-jayatyatibalo | 5 | 5.42.33 | जयत्यतिबलो रामो… |
| s-dasoham | 5 | 5.42.34 | दासोऽहं कोसलेन्द्रस्य… |
| s-sakrdeva | 6 | 6.18.33 | सकृदेव प्रपन्नाय… |
| s-aditya-hrdayam | 6 | Āditya-hṛdaya v.4 (6.105/6.107) | आदित्यहृदयं पुण्यं… |
| s-maranantani | 6 | 6.109.25 / 6.112.26 | मरणान्तानि वैराणि… |

Key ślokas: ch1 s-ma-nishada · ch2 s-ramam-dasharatham · ch3 s-ramo-vigrahavan · ch4 s-vyakaranam · ch5 s-jayatyatibalo · ch6 s-aditya-hrdayam.

## 11. Items (ids canonical)
`phala` फल fruit (heal 0.4, 20 niṣka) · `kanda_mula` कन्दमूल roots (heal 0.7, 45) · `madhu` मधु honey (pp +5 all moves, 30) · `oshadhi` ओषधि healing herb (revive 0.5, 80) · `sanjivani` सञ्जीवनी (revive 1.0 whole party, key/rare, not sold) · `kusha_mudrika` (key: Rāma's ring given to Hanumān, ch4–5) · `chudamani` चूडामणि (key: Sītā's jewel, ch5).

## 12. Presentation
- Internal canvas 320×180 (16:9), 16px tiles, 16×24 characters, 64×64 battlers, scaled with crisp pixels. DOM overlay for all text.
- **Retro-modern**: limited palettes, chunky pixel borders, plus modern smoothness: eased camera, screen-shake, particles for astras, day-tinted lighting per map, parallax battle backgrounds, smooth fades.
- Audio: original chiptune (square/triangle/noise). Melodies are original and use rāga-flavoured scales (e.g. Bhūpālī/Mohanam pentatonic for the āśrama, Bhairav-like for Laṅkā). Silent until the first user gesture.
- Controls: arrows/WASD move; Z/Enter/Space = A (confirm/interact); X/Escape/Backspace = B (cancel/run); Enter/M = Start (menu). Touch: on-screen D-pad (left) and A/B (right), shown below or over the stage on touch devices. Challenges are tap/click targets with number keys 1–4 as shortcuts.
- Menu (Start): Party · Padakośa · Ślokakośa · Items · Settings (Script, music, sfx, text speed, IAST hints, Relaxed, reduce motion) · Save.

---

## 13. Samskuru framework adaptation. This section OVERRIDES anything above it.

The Samskuru contribution framework landed (React PWA, one folder per game, closed-world Sanskrit). These rules take precedence:

**Closed-world Sanskrit.** Every Devanagari string lives in `content/*.json` with provenance and is validated by tests (`validateDeva`, `checkAnustubh`, engine sandhi checks). Code never contains Sanskrit literals. **Never coin Sanskrit compounds.** Every name must be an *attested* word or proper noun, citing Monier-Williams (MW) or the Rāmāyaṇa verse where it occurs. Revised move names (ids unchanged unless noted):

| move id | Sanskrit name (attested) | note |
|---|---|---|
| `pada_bana` | वाक् "speech" | player's basic mantra-strike |
| `lipi_raksha` | रक्षा "protection" | |
| `shoka_shloka` | श्लोक "verse" | Bāla 1.2: grief (śoka) became verse (śloka) |
| `suprabhata` | सुप्रभात "auspicious dawn" | MW suprabhāta |
| `shuddha_vak` | व्याकरण "grammar" | from s-vyakaranam |
| `bana` | बाण · `khadga` खड्ग · `gada` गदा · `vriksha` वृक्ष · `shaila` शैल | plain attested nouns |
| `agneyastra` आग्नेयास्त्र · `varunastra` वारुणास्त्र · `vayavyastra` वायव्यास्त्र · `brahmastra` ब्रह्मास्त्र | | astras named in the Rāmāyaṇa |
| `dharma_vigraha` | धर्म | |
| `abhaya` | अभय | from s-sakrdeva |
| `aditya_hrdaya` | आदित्यहृदय | name of the hymn |
| `viddhi` | विद्धि | the verb form in s-ramam-dasharatham |
| `agni_bana` | अग्नि | |
| `vayu_vega` | वेग "speed, rush" | |
| `jaya_ghosha` | जय "victory" | from s-jayatyatibalo |
| `anirveda` | अनिर्वेद | from s-anirvedah |
| `prajna` | प्रज्ञा · `mantrana` मन्त्रण · `jala_dhara` जल | |
| enemy moves | नख · माया · शूल · गर्जन · अन्धकार · परिघ · अग्नि · नागपाश · चन्द्रहास · तर्क · प्रश्न | ids: nakha, maya_jala, shula, garjana, andhakara, parigha, agni_varsha, naga_pasha, chandrahasa, tarka, prashna |

**Enemy changes (canon fidelity).** The ch5 gate guardian is the city-goddess **Laṅkā** (लङ्का; Vālmīki does not call her Laṅkinī), id `lanka_devi`. Ocean leap: **Surasā** (सुरसा) tests Hanumān (`surasa_duel`, a duelist) and **Siṃhikā** (सिंहिका) is the leap's foe (`simhika`). Forest wild beast: **vṛka** (वृक, wolf), id `vrka` (replaces vana_spirit). Rival duelist: Bharadvāja (भरद्वाज, Vālmīki's disciple, Bāla 1.2).

**Player.** The player's party entry is ally `player` with name शिष्य (śiṣya, "student"). The player also types a display name, which is English UI text and not Sanskrit.

**Layout: "two-screen" retro-modern (DS-style), mobile-first.**
- Top: the 320×180 pixel canvas (overworld or battle), scaled to the width with crisp pixels.
- Bottom: the context panel (DOM, `@ui` components, `<SaText>`). Explore shows the D-pad, A/B, Menu, Kośa and the current objective. Dialogue shows a portrait, the text and ▶. Battles show commands, moves and challenges. Cards show verse and word cards.
- At 360×640 everything fits without horizontal scroll and touch targets are ≥ 44 px. On desktop the column is centred (max ~720 px). Keyboard: arrows/WASD, Z/Enter/Space = A, X/Esc = B, M = menu, 1–4 = options.
- Light and dark themes: panels use tokens (`--surface`, `--ink`, `--accent`…). The canvas art is the same in both themes.

**Sound.** Use `ctx.sfx` names only for effects. Optional original chiptune music (`audio.ts`, WebAudio) plays only when `ctx.settings.sound` is on, has an in-game toggle, and stops on unmount.

**Sessions.** The save persists in `ctx.store` (`save-v1`). A session ends (one `ctx.finish`) when the player completes a kāṇḍa (outcome `completed`, or `won` after Rāvaṇa) or chooses **Rest & end session** from the menu (`completed`). The result lists the words practised (review) and emits mastery ids `subhashita:ramayana:<shlokaId>`, `shabdakosha:ramayana:<lexId>` (skills `subhashita` / `shabdakosha`). The next session resumes from the save.

**Levels.** Supported levels are `[2, 3, 4]` (Praveśa, Paricaya, Śikṣā), and `ctx.level` tunes difficulty only: L2 gets 3 options, ×1.5 timers and IAST hints on Devanagari stimuli; L3 is standard; L4 gets 4 options, ×0.8 timers, and earlier `viccheda`/`vibhakti` unlocks (one chapter earlier). The story is the same for every level.
