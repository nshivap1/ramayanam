# Rāmāyaṇa-yātrā v0.6: candidate verses for Bāla-kāṇḍa and Ayodhyā-kāṇḍa

Researched 2026-11-14. The repo was only read; no repo file was changed. The raw verification log is in `/home/claude/scratch/v06/bala-ayodhya.worknotes.txt`.

**How the verses were checked**
- **Primary source:** valmikiramayan.net, the vulgate with Gita Press numbering. Every verse number below is the number that page prints.
- **Bāla pages are printed in sandhi** (words joined), so the Bāla text below is the page's text letter for letter.
- **Ayodhyā pages are printed word-split** (padaccheda: तत् ब्रूहि वचनम् …). For each Ayodhyā verse I give that word-split text exactly as printed. I also give a joined (sandhied) reading from a second source, which is what the game would show as pādas. This follows the game's own precedent for 2.18.30, 2.19.22 and 2.40.9 in `content/shlokas-1.json`: the number comes from valmikiramayan.net and the pāda text from the critical-edition e-text.
- **Second sources:**
  - siva.sh: for Bāla it mirrors valmikiramayan.net, typos included; for Ayodhyā it gives a sandhied vulgate.
  - vedapath.app: IIT Kanpur text, vulgate numbering. It often failed with a client error.
  - enjoylearningsanskrit.com: critical-edition (CE) numbering. The game's existing provenance treats it as the CE text; its pages do not name the edition themselves.
- **CE status** means the verse was found, with its words compared, on the enjoylearningsanskrit chapter or verse page given.
- **Fetch notes:**
  - The www. host of valmikiramayan.net sometimes served a bot-check page, so the bare host `https://valmikiramayan.net/...` was used. Sargas 1.25 and 2.96 loaded only on www.
  - The fetch tool's reader sometimes misplaced the verse-number marker. Each verse was therefore asked for line by line (the line before the marker, then the marker line), and its line grouping was checked against siva.sh.
- **Metre:** all pādas were counted with a small script (8 syllables each). Odd pādas showing a non-pathyā 5–7 pattern are standard vipulā variants, noted as such.

---

## Book 1: Bāla-kāṇḍa (8 main + 6 alternates)

### Mithilā: how it could enter the game
Today `ch1.yajna` (Siddhāśrama, NPC `disciple`) only *narrates* Mithilā in its onWin ("Rama lifted the great bow of Shiva and broke it…") and then warps to `ayodhya_city`. Three options, from cheapest to fullest:

1. **Told scene, no new map (cheapest).** After the sacrifice, keep the warp. Before it, Viśvāmitra leads the princes out and the screen fades. A cutscene in the style of the Āditya-hṛdayam one (`cutscene3d.ts` / `logic-cutscene.ts`, which already alternates narration lines with timed pāda steps) shows the bow scene with B7 (1.67.17) and the gift with B8 (1.73.27). Each verse is played as `{"shloka": …, "mode": "hear"}`.
2. **One small new interior map, `mithila_sabha`.** Janaka's sacrificial hall, about 24×16; the `ayodhya_palace` legend and tileset can be reused.
   - The onWin of `ch1.yajna` warps there instead of to Ayodhyā.
   - A trigger strip at the door plays the bow set piece (NPCs: `janaka`, `vishvamitra`, a crowd of `guard`/`villager_m`/`rishi`, and the iron chest of the bow as a prop).
   - Talking to `janaka` afterwards gives B8.
   - The existing "Many happy years passed … Book of Youth" lines and the warp to `ayodhya_city` then move to the end of that event.
   - New sprite needed: `janaka`. A palette swap of `dasharatha` would do.
3. **Option 2 plus `gautama_ashrama`.** A small exterior grove, about 20×14, reusing the `siddhashrama` tiles. It sits between Siddhāśrama and Mithilā and holds the Ahalyā scene (B6, 1.49.17). This also gives Book 1 a walkable "road to Mithilā" beat.
   - New sprite needed: `ahalya` (or reuse `rishika`).

### Table: Bāla

| # | first pāda | citation (k.s.v) | speaker → listener | story moment | placement in game | why chosen | metre | difficulty notes | source URL(s) | CE status |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 | ततो यज्ञे समाप्ते तु | 1.18.8 | Narrator (Vālmīki) → audience | Rāma's birth season: after the sacrifice, in Caitra, on the ninth tithi (the Rāma-navamī verse) | `valmiki_hut`, NPC `guest` (`ch1.hut_guest`): the guest who "came with Narada" tells how Rāma was born. Optional, before the story. Could also be a shrine inscription in `valmiki_hut` | Beloved (Rāma-navamī); gives the pre-story hermitage a story beat; the only birth verse that is easy to read | anuṣṭubh | Easy words. ऋतूनां (gen. pl. of ṛtu); समत्ययुः (sam-ati-√i, perfect 3 pl., a hard form); नावमिके "ninth"; तिथौ (loc.). The main verb (अजनयत्) is in 1.18.10, so the gist must add "…Rāma was born" | https://valmikiramayan.net/utf8/baala/sarga18/balasans18.htm | **Not in CE.** Not found in CE 1.17, which tells the birth at 1.17.6 in other words (https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-17/) |
| B2 | ऊनषोडशवर्षो मे | 1.20.2 | Daśaratha → Viśvāmitra | The old king refuses to send his not-yet-sixteen son against rākṣasas | `siddhashrama_road`, event `ch1.road_dawn`, right after Viśvāmitra says "King Dasharatha has entrusted his sons to me": he quotes the king's fear (hear). Alternatives: optional talk with NPC `vishvamitra` (`ch1.vishvamitra_road`), or Lakṣmaṇa teasing Rāma with it | Famous; gives Daśaratha a voice in Book 1; shows Rāma's youth before Tāṭakā | anuṣṭubh | ऊनषोडशवर्षः (bahuvrīhi "less than sixteen years old", hard); राजीवलोचनः "lotus-eyed"; युद्धयोग्यताम् (compound + abstract -tā). Everything else simple | https://valmikiramayan.net/utf8/baala/sarga20/balasans20.htm | CE 1.19.2, identical (https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-19/verse-2/) |
| B3 | मंत्रग्रामं गृहाण त्वं | 1.22.12 | Viśvāmitra → Rāma | On the Sarayu bank Viśvāmitra gives Rāma the mantras Balā and Atibalā: no fatigue, no fever | `siddhashrama_road` (the game's Sarayu bank), `ch1.road_dawn` after Rāma joins: Lakṣmaṇa or Rāma recalls "last evening by this river the teacher gave us two mantras", then hear. Design hook: when restored, the verse could give a support move that clears astra fatigue (श्रान्तम्, the v0.5a rule), because the verse says न श्रमो "no weariness" | Story moment that fits the game's mantra mechanics; short, clear words | anuṣṭubh | Easy. मंत्रग्रामम् "set of mantras"; बलामतिबलां (two names, acc.); ज्वरः, विपर्ययः "change". Page prints मंत्र- with anusvāra; siva.sh prints मन्त्र- | https://valmikiramayan.net/utf8/baala/sarga22/balasans22.htm ; siva.sh https://siva.sh/ramayana/bala-kanda/22/11-14 | In CE, split across CE 1.21.10cd + 11ab, same words (मन्त्रग्रामं) (https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-21/) |
| B4 | पितुर्वचननिर्देशात् | 1.26.2 | Rāma → Viśvāmitra | Rāma agrees to fight Tāṭakā because his father told him to obey Kauśika | `siddhashrama_road`, NPC `vishvamitra_edge`, event `ch1.tataka_story`. It replaces the paraphrase "My father told me to obey your word. For the sake of the people…" (main path) | Rāma's first own words in Book 1; the turning point before the first boss; the game already paraphrases it | anuṣṭubh | Two parallel ablatives of cause (…निर्देशात्, …गौरवात्); कौशिकस्य (patronymic of Viśvāmitra); इति-clause; कर्तव्यम् (gerundive) + अविशङ्कया (instr. "without hesitation") | https://valmikiramayan.net/utf8/baala/sarga26/balasans26.htm | CE 1.25.2, identical (https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-25/) |
| B5 | कृतार्थोऽस्मि महाबाहो | 1.30.26 | Viśvāmitra → Rāma | The sacrifice is complete; the hermitage has truly become Siddhāśrama, "the hermitage of fulfilment" | `siddhashrama`, `ch1.yajna` onWin. It replaces "My purpose is fulfilled, Rama. You have honoured your father's word…" (main path). Also good as the `siddhashrama` shrine inscription after `ch1.yajna_done` | End of the Siddhāśrama arc; names the place the player is standing in | anuṣṭubh, **6 pādas** (the last 2 are narration) | कृतार्थः; गुरुवचः (s-stem) → गुरुवचस्त्वया (sandhi); सिद्धाश्रमम् इदम् सत्यं कृतम् "made truly *siddha*" (wordplay on the name). Pādas 5–6 (प्रशस्य, उपागमत्) are harder; the game could show pādas 1–4 as the speech | https://valmikiramayan.net/utf8/baala/sarga30/balasans30.htm ; siva.sh https://siva.sh/ramayana/bala-kanda/30/25-26 | CE 1.29.23 has only pādas 1–4 and reads कृतं **राम** महायशः (vulgate वीर) (https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-29/) |
| B6 | राघवौ तु ततस्तस्याः | 1.49.17 | Narrator → audience | The princes touch Ahalyā's feet; remembering Gautama's word, she receives them | New map `gautama_ashrama` (option 3 above): set piece when Rāma, as party lead, steps into the empty hermitage (see SB-2). With option 1, a told line in the Mithilā cutscene | Beloved; a gentle scene between two battles; on the road to Mithilā | anuṣṭubh (pāda 3 na-vipulā) | Duals: राघवौ, तौ; जगृहतुः (perfect 3 dual of √grah, hard); स्मरन्ती (pres. part. f.); प्रतिजग्राह (perfect) | https://valmikiramayan.net/utf8/baala/sarga49/balasans49.htm ; siva.sh https://siva.sh/ramayana/bala-kanda/49/16-18 | CE 1.48.17, but reads जगृहतुस्**तदा** for vulgate जगृहतुर्**मुदा** (https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-48/) |
| **B7 (anchor)** | आरोपयित्वा मौर्वीं च | 1.67.17 | Narrator → audience | **Rāma strings Śiva's bow, draws it, and breaks it in the middle** | Mithilā set piece: `mithila_sabha` (option 2) or the told cutscene (option 1). Climax of Book 1; see SB-1 | Required anchor; the most famous moment of the book | anuṣṭubh (pāda 1 ma-vipulā) | आरोपयित्वा (causative absolutive "having strung"); मौर्वीम् "bowstring"; पूरयामास (periphrastic perfect "drew it full"); बभंज (perfect of √bhañj "broke"). Good for teaching the perfect tense. Page prints बभंज (anusvāra) | https://valmikiramayan.net/utf8/baala/sarga67/balasans67.htm ; siva.sh https://siva.sh/ramayana/bala-kanda/67/16-20 ; vedapath (IITK) https://vedapath.app/sa/ramayana/bala-kanda/67/17 | CE 1.66.17, same words (तद्बभञ्ज) (https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-66/). Note: the IITK text on vedapath reads pādas 1–2 differently: आरोपयित्वा धर्मात्मा पूरयामास तद्धनु: |
| B8 | प्रतीच्छ चैनां भद्रं ते | 1.73.27 | Janaka → Rāma | Janaka gives Sītā: "take her hand in yours… devoted, following you always like a shadow" | `mithila_sabha`, NPC `janaka` (new), after the bow set piece. With option 1, the last line of the Mithilā cutscene before "Many happy years passed…". Pair with B-alt5 (1.73.26), which opens the speech with इयं सीता मम सुता | Beloved; Sītā enters the story; a speaker new to the game (Janaka) | anuṣṭubh (pāda 1 ma-vipulā) | प्रतीच्छ (imperative of prati-√iṣ "accept"); गृह्णीष्व (imperative middle of √grah); पाणिना (instr.); छायेव = छाया + इव. **Page typo:** महभागा for महाभागा. IITK/vedapath reads महाभागा, so fix it in game and note it in provenance | https://valmikiramayan.net/utf8/baala/sarga73/balasans73.htm ; siva.sh https://siva.sh/ramayana/bala-kanda/73/26-27 ; vedapath https://vedapath.app/vi/ramayana/bala-kanda/73/28 | **Partly in CE.** CE 1.72.17 ends with प्रतीच्छ चैनां … पाणिना; the line **पतिव्रता महाभागा छायेवानुगता सदा was not found in CE ch.72** (vulgate-only) (https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-72/verse-17/) |

**Bāla alternates**

| # | first pāda | citation | speaker → listener | moment / placement | notes | source | CE |
|---|---|---|---|---|---|---|---|
| B-alt1 | नृशंसमनृशंसं वा | 1.25.18 | Viśvāmitra → Rāma | "A protector must do what protects the people, cruel or not": answer to Rāma's "she is a woman" in `ch1.tataka_story` (now the line "A king's son protects those who cannot protect themselves…"). Pairs with B4 | anuṣṭubh; नृशंसम् / अनृशंसम्, प्रजारक्षणकारणात् (long compound), पातकम्, रक्षता (pres. part. instr.). Morally heavy | https://www.valmikiramayan.net/utf8/baala/sarga25/balasans25.htm (www host) | **Not found** in CE 1.24 or 1.25 → probably not in CE |
| B-alt2 | इह राम महाबाहो (+ 1.29.3) | 1.29.2–3 | Viśvāmitra → Rāma | Siddhāśrama was Viṣṇu's hermitage for ages, the old hermitage of Vāmana: `siddhashrama` sign at (3,10), or `ch1.siddha_arrive` / NPC `sage_a` (`ch1.siddha_sage`) | 1.29.2 has no verb; its verb उवास is in 1.29.3, so use both as a pair. Easy words; युगशतानि | https://valmikiramayan.net/utf8/baala/sarga29/balasans29.htm | 1.29.2 **not in CE** 1.28; CE 1.28.2 = 1.29.3cd (एष पूर्वाश्रमो राम…) |
| B-alt3 | तस्य शब्दो महानासीन् | 1.67.18 | Narrator | The thunderclap and earthquake of the breaking bow (SB-1) | anuṣṭubh; निर्घातसमनिःस्वनः (compound "with a sound like a thunderbolt"), दीर्यतः (gen. pres. part. "splitting") | vr.net sarga67 (above); siva.sh 67/16-20 | CE not checked |
| B-alt4 | निपेतुश्च नराः सर्वे | 1.67.19 | Narrator | Everyone falls stunned except Viśvāmitra, Janaka and the two Rāghavas (SB-1) | **Page typo** व्रजयित्वा for वर्जयित्वा (siva.sh has the same typo; CE has वर्जयित्वा) | vr.net sarga67; siva.sh | CE 1.66.19 (वर्जयित्वा) |
| B-alt5 | अब्रवीज्जनको राजा | 1.73.26 | Narrator, then Janaka → Rāma | Opens Janaka's gift speech: "This is Sītā, my daughter, your partner in dharma" | Very easy second half (इयं सीता मम सुता सहधर्मचरी तव); no typo; fully in CE | vr.net sarga73; siva.sh 73/26-27 | CE 1.72.17 pādas 1–4 |
| B-alt6 | प्रोद्यमाने जगन्नाथं | 1.18.10 | Narrator | Completes B1: Kausalyā bore Rāma | Long compounds (सर्वलोकनमस्कृतम्, सर्वलक्षणसंयुतम्) | vr.net sarga18 | CE 1.17.6 has only a variant line (कौसल्याजनयद् रामं दिव्यलक्षणसंयुतम्) |

### Full text: Bāla (Devanagari exactly as fetched from valmikiramayan.net)

**B1 · 1.18.8**
ततो यज्ञे समाप्ते तु ऋतूनां षट् समत्ययुः |
ततश्च द्वादशे मासे चैत्रे नावमिके तिथौ || १-१८-८
*Gist:* After the sacrifice ended, six seasons went by; then in the twelfth month, Caitra, on the ninth day of the moon (Rāma was born; the sentence finishes in 1.18.10).

**B2 · 1.20.2**
ऊनषोडशवर्षो मे रामो राजीवलोचनः |
न युद्धयोग्यतामस्य पश्यामि सह राक्षसैः || १-२०-२
*Gist:* My lotus-eyed Rāma is not yet sixteen; I do not see that he is ready to fight rākṣasas.

**B3 · 1.22.12**
मंत्रग्रामं गृहाण त्वं बलामतिबलां तथा |
न श्रमो न ज्वरो वा ते न रूपस्य विपर्ययः || १-२२-१२
*Gist:* Take this set of mantras, Balā and Atibalā: you will feel no weariness, no fever, and your form will not change.

**B4 · 1.26.2**
पितुर्वचननिर्देशात् पितुर्वचनगौरवात् |
वचनं कौशिकस्येति कर्तव्यमविशङ्कया || १-२६-२
*Gist:* Because my father told me to, and out of respect for his word, I must do what Kauśika says without hesitating.

**B5 · 1.30.26** (six pādas)
कृतार्थोऽस्मि महाबाहो कृतं गुरुवचस्त्वया |
सिद्धाश्रममिदं सत्यं कृतं वीर महायशः |
स हि रामं प्रशस्यैवं ताभ्यां संध्यामुपागमत् || १-३०-२६
*Gist:* "My purpose is fulfilled, mighty one; you have done your teacher's bidding; you have made this hermitage truly Siddhāśrama." Praising Rāma like this, he went with the two princes to the evening prayers.

**B6 · 1.49.17**
राघवौ तु ततस्तस्याः पादौ जगृहतुर्मुदा |
स्मरन्ती गौतमवचः प्रतिजग्राह सा च तौ ||
*(The page puts "| १-४९-१७" after line 1 and "||" after line 2; siva.sh prints the same two lines as 1-49-17.)*
*Gist:* Then the two Rāghavas joyfully touched her feet, and she, remembering Gautama's words, welcomed them both.

**B7 · 1.67.17 (anchor)**
आरोपयित्वा मौर्वीं च पूरयामास वीर्यवान् |
तद्बभंज धनुर्मध्ये नरश्रेष्ठो महायशाः || १-६७-१७
*Gist:* The mighty one strung the bow and drew it to the full, and the famous best of men broke it in the middle.

**B8 · 1.73.27**
प्रतीच्छ चैनां भद्रं ते पाणिं गृह्णीष्व पाणिना |
पतिव्रता महभागा छायेवानुगता सदा || १-७३-२७
*(Page typo महभागा; standard and IITK read महाभागा.)*
*Gist:* Accept her, bless you; take her hand in yours. Devoted to her husband and greatly blessed, she will follow you always like your shadow.

**Bāla alternates: full text**

- **B-alt1 · 1.25.18** (fetched from the www host)
  नृशंसमनृशंसं वा प्रजारक्षणकारणात् |
  पातकं वा सदोषं वा कर्तव्यं रक्षता सदा || १-२५-१८
  *Gist:* To protect the people, one who guards them must always do what is needed, cruel or kind, sinful or faulty.
- **B-alt2 · 1.29.2–3**
  इह राम महाबाहो विष्णुर्देवनमस्कृतः |
  वर्षाणि सुबहूनीह तथा युगशतानि च || १-२९-२
  तपश्चरणयोगार्थमुवास सुमहातपाः |
  एष पूर्वाश्रमो राम वामनस्य महात्मनः || १-२९-३
  *Gist:* Here, Rāma, Viṣṇu, whom the gods revere, lived for very many years and hundreds of ages to practise austerity. This was once the hermitage of the great Vāmana.
- **B-alt3 · 1.67.18**
  तस्य शब्दो महानासीन्निर्घातसमनिःस्वनः |
  भूमिकंपश्च सुमहान् पर्वतस्येव दीर्यतः || १-६७-१८
  *Gist:* Its crack was huge, like a thunderbolt, and the earth shook hard, as when a mountain splits.
- **B-alt4 · 1.67.19**
  निपेतुश्च नराः सर्वे तेन शब्देन मोहिताः |
  व्रजयित्वा मुनिवरं राजानं तौ च राघवौ || १-६७-१९
  *(Page typo व्रजयित्वा for वर्जयित्वा.)*
  *Gist:* Stunned by the sound, all the men fell down, except the great sage, the king and the two Rāghavas.
- **B-alt5 · 1.73.26**
  अब्रवीज्जनको राजा कौसल्यानंदवर्धनम् |
  इयं सीता मम सुता सहधर्मचरी तव || १-७३-२६
  *Gist:* King Janaka said to Rāma, the joy of Kausalyā: "This is Sītā, my daughter, your partner in dharma."
- **B-alt6 · 1.18.10**
  प्रोद्यमाने जगन्नाथं सर्वलोकनमस्कृतम् |
  कौसल्याजनयद्रामं सर्वलक्षणसंयुतम् || १-१८-१०
  *Gist:* Kausalyā gave birth to Rāma, lord of the world, honoured by all, bearing every auspicious mark.

### Special moments: Bāla

**SB-1. The bow breaks: thunderclap, and everyone falls but four (main path).**
- *Text:* 1.67.16–20.
  - Before thousands of watching men, Rāma raises the bow "as if in play" (सलीलमिव, 1.67.16), strings it, draws it and breaks it in the middle (1.67.17).
  - The sound is like a thunderbolt, with a great earthquake "as when a mountain splits" (1.67.18).
  - All the men fall, stunned, **except Viśvāmitra, King Janaka and the two Rāghavas** (1.67.19, …मुनिवरं राजानं तौ च राघवौ).
  - When the people come to (प्रत्याश्वस्तो जने तस्मिन्, 1.67.20), Janaka speaks.
- *What the player sees:*
  1. In `mithila_sabha` the crowd of NPCs watches as Rāma walks to the iron chest.
  2. A slow pull as the bow is strung, then a white flash, a thunder sfx and a 1-second screen shake.
  3. Every NPC sprite topples, **the player's own sprite included**. Only four stay standing: Viśvāmitra, Janaka, Rāma, Lakṣmaṇa.
  4. A held beat, then everyone gets back up and Janaka speaks.
- *Hidden touch:* if the player presses A during the held beat, the player's character mumbles from the floor; a verse card of 1.67.19 shows who is still standing.
- *Needs:* new fx commands. The event vocabulary today is say / move / face / fade / wait / sfx / music, with no shake or topple.
- *Verses:* 1.67.16, 18, 19 and 20 were all read on valmikiramayan.net. 1.67.16 is पश्यतां नृसहस्राणां बहूनां रघुनंदनः | आरोपयत्स धर्मात्मा सलीलमिव तद्धनुः || १-६७-१६.

**SB-2. Ahalyā, hidden until Rāma sees her (optional / hidden).**
- *Text:*
  - 1.49.16: by Gautama's word she was "hard to see" (दुर्निरीक्ष्या बभूव ह) for the three worlds "until she saw Rāma" (यावद्रामस्य दर्शनम्).
  - 1.49.17: the princes touch her feet (B6).
  - 1.49.19: पुष्पवृष्टिर्महत्यासीद्देवदुंदुभिनिस्वनैः | गन्धर्वाप्सरसां चैव महानासीत् समुत्सवः || १-४९-१९, "a great rain of flowers with the sound of the gods' drums, and a great festival of gandharvas and apsarases".
- *What the player sees:*
  - In `gautama_ashrama` there is a faint shimmer on one tile. Interacting with it does nothing unless **Rāma is party lead**. Then the shimmer resolves into Ahalyā; B6 plays, followed by a petal-rain particle effect and drum sfx.
  - The hidden element: a player who explores with another lead never sees her.
- *Verses confirmed on valmikiramayan.net:* 1.49.16 (lines 1–2) and 1.49.19 (full).

**SB-3. The wedding: flower rain and drums (optional).**
- *Text:*
  - 1.73.28: as Janaka pours the mantra-purified water, gods and sages cry "sādhu, sādhu".
  - 1.73.29: देवदुंदुभिनिर्घोषः पुष्पवर्षो महानभूत्, "the gods' drums thundered and a great rain of flowers fell".
- *What the player sees:* after B8, petals fall over `mithila_sabha` and the crowd sprites bow. It reuses the SB-2 effect.
- *Caveat:* 1.73.28–29 were read **only on siva.sh** (which mirrors valmikiramayan.net for Bāla), so re-check them on valmikiramayan.net before use.

---

## Book 2: Ayodhyā-kāṇḍa (8 main + 6 alternates)

Note on text form: valmikiramayan.net prints Ayodhyā word-split, so its text is given first exactly as printed. The **suggested in-game pādas** are the sandhied CE reading wherever it has the same words, following the game's precedent; differences are flagged.

### Table: Ayodhyā

| # | first pāda (sandhied) | citation (k.s.v) | speaker → listener | story moment | placement in game | why chosen | metre | difficulty notes | source URL(s) | CE status |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | यन्मङ्गलं सहस्राक्षे | 2.25.32 | Kausalyā → Rāma | Kausalyā's blessing as Rāma leaves: "the good fortune Indra had when Vṛtra died, may it be yours" | `ayodhya_palace`, NPC `kausalya`, event `ch2.kausalya` (boons_done branch). It replaces "May the forest, the rivers and the mountains protect him…" (optional NPC, but on the walk to Sumitra) | Beloved svasti verse; Kausalyā gets a voice; its refrain तत्ते भवतु मङ्गलम् repeats in the next verses (2.25.33–35, read on siva.sh), a natural chant for learners | anuṣṭubh (pāda 3 na-vipulā) | सहस्राक्षे (loc. "thousand-eyed" = Indra); सर्वदेवनमस्कृते (long compound); वृत्रनाशे (loc.); भवतु (imperative). Page spells मन्गलम् (न्ग) | https://valmikiramayan.net/utf8/ayodhya/sarga25/ayodhyasans25.htm ; siva.sh https://siva.sh/ramayana/ayodhya-kanda/25/31-35 | CE 2.22.13, identical (https://enjoylearningsanskrit.com/scriptures/ramayana/book-2/chapter-22/verse-13/) |
| A2 | यदि त्वं प्रस्थितो दुर्गं | 2.27.6 | Sītā → Rāma | Sītā insists on going: "I will walk ahead of you, crushing the kuśa grass and thorns" | `ayodhya_palace`, NPC `sita`, event `ch2.sita` (boons_done). Or main path in `ch2.palace_scene`, replacing the narrated "Where you go, I go" | Famous; Sītā's own choice; vivid image | anuṣṭubh | प्रस्थितः (ppp); दुर्गम् "hard to pass"; अग्रतः "in front"; गमिष्यामि (future); मृद्नन्ती (pres. part. f. of √mṛd, hard); कुशकण्टकान् (dvandva) | https://valmikiramayan.net/utf8/ayodhya/sarga27/ayodhyasans27.htm ; siva.sh https://siva.sh/ramayana/ayodhya-kanda/27/6 | CE 2.24.5, identical (https://enjoylearningsanskrit.com/scriptures/ramayana/book-2/chapter-24/) |
| A3 | तमार्तः संपरिष्वज्य | 2.50.36 | Guha → Rāma (pādas 1–2 narration) | Guha embraces Rāma: "This land is yours as Ayodhyā is; what can I do for you?" | `shringaverapura`, NPC `guha`, event `ch2.guha` (left_city branch). It replaces "Rama, my dear friend! This land is yours…" (main path) | Friendship across rank; the second half is very easy | anuṣṭubh | आर्तः; संपरिष्वज्य (absolutive with two prefixes); यथा…तथा; करवाणि (1 sg. imperative "what shall I do?"). **Use इदम्** (page and CE); siva.sh's तथेयं is a variant | https://valmikiramayan.net/utf8/ayodhya/sarga50/ayodhyasans50.htm ; siva.sh https://siva.sh/ramayana/ayodhya-kanda/50/36 | CE 2.44.12 (संपरिष्वज्य, तथेदं), same as the page (https://enjoylearningsanskrit.com/scriptures/ramayana/book-2/chapter-44/verse-12) |
| A4 | पुत्रो दशरथस्यायं | 2.52.83 | Sītā → Gaṅgā | Mid-stream, Sītā prays to Gaṅgā to guard Rāma while he keeps his father's command | `shringaverapura`, `ch2.guha` ferry set piece (Kathā branch). It replaces "Mother Ganga, guard Rama…" (main path) | The scene is already in the game; a prayer to a river; Sītā's second voice. Optional extra: A-alt6 (2.52.84) | anuṣṭubh | पालयतु (3 sg. imperative); एनम्; त्वदभिरक्षितः (compound "guarded by you", hard); गङ्गे (voc.). **Reading conflict:** page and CE read पालयतु एनम् / पालयत्वेनं; IITK (vedapath) and siva.sh read पारयित्वेमं. Follow page + CE | https://valmikiramayan.net/utf8/ayodhya/sarga52/ayodhyasans52.htm ; vedapath https://vedapath.app/en/ramayana/ayodhya-kanda/52/83 (names the speaker as Sītā) ; siva.sh https://siva.sh/ramayana/ayodhya-kanda/52/83-84 | CE 2.46.68 (निदेशं पालयत्वेनं) (https://enjoylearningsanskrit.com/scriptures/ramayana/book-2/chapter-46/) |
| A5 | यदाचरति कल्याणि | 2.63.6 | Daśaratha → Kausalyā | At night, dying of grief, Daśaratha begins confessing his old sin (the ascetic boy he shot by the Sarayu): "whatever one does, good or bad, the doer reaps" | **Optional** new event, `ch2.dasharatha_night`, in `ayodhya_palace` on NPC `dasharatha`, shown if the player walks back from `shringaverapura` after `ch2.left_city` and before `ch2.bharata_done` (the warp north exists). Fallback: a narrated memory inside `ch2.bharata`, after "King Dasharatha has died of grief" | Famous maxim; Daśaratha's last words in the game. It echoes Book 1's hunter and krauncha: a fatal arrow by a river | anuṣṭubh | Very readable. यद्…तद् correlative; आचरति; कल्याणि, भद्रे (voc. f.); कर्मजम् "born of action"; आत्मनः (gen.) | https://valmikiramayan.net/utf8/ayodhya/sarga63/ayodhyasans63.htm ; siva.sh https://siva.sh/ramayana/ayodhya-kanda/63/6 (names Daśaratha → Kausalyā) | CE 2.57.4 (वाशुभम्, no avagraha) (https://enjoylearningsanskrit.com/scriptures/ramayana/book-2/chapter-57/verse-4) |
| A6 | न राज्याद्भ्रंशनं भद्रे | 2.94.3 | Rāma → Sītā | At Citrakūṭa: "Neither losing the kingdom nor being away from friends troubles me, now that I see this lovely hill" | `chitrakuta`, event `ch2.enter_chitrakuta`. It replaces "Sita, see the Mandakini… I do not miss the kingdom at all" (main path) | The game already paraphrases it; a calm, happy beat before Bharata comes | anuṣṭubh | भ्रंशनम् "fall, loss"; विनाभवः "separation"; बाधते; दृष्ट्वा (absolutive); रमणीयम् इमम् गिरिम्. Syntax hint needed: न… न… बाधते "neither… nor… troubles" | https://valmikiramayan.net/utf8/ayodhya/sarga94/ayodhyasans94.htm ; siva.sh https://siva.sh/ramayana/ayodhya-kanda/94/3 | CE 2.88.3, identical (https://enjoylearningsanskrit.com/scriptures/ramayana/book-2/chapter-88/verse-3/) |
| A7 | सर्वे क्षयान्ता निचयाः | 2.105.16 | Rāma → Bharata | Rāma consoles Bharata over their father's death: all hoards end in loss, every rise in a fall, every meeting in parting, life in death | `chitrakuta`, NPC `bharata`, event `ch2.bharata`, after "King Dasharatha has died of grief" and before Rāma's refusal (main path) | One of the most quoted verses of the epic; Rāma's wisdom at the turning point | anuṣṭubh (pāda 1 ma-vipulā) | Four parallel -अन्त compounds ("ending in…"), a good pattern to teach; निचयाः "hoards"; समुच्छ्रयाः "risings"; संयोगाः / विप्रयोगाः. Page typos: समुग्च्छ्रयाः, सम्योगा | https://valmikiramayan.net/utf8/ayodhya/sarga105/ayodhyasans105.htm ; siva.sh https://siva.sh/ramayana/ayodhya-kanda/105/16 | CE 2.98.16, identical (https://enjoylearningsanskrit.com/scriptures/ramayana/book-2/chapter-98/verse-16/) |
| **A8 (anchor)** | अधिरोहार्य पादाभ्यां | 2.112.21 | Bharata → Rāma | **Bharata asks Rāma to step onto the gold-adorned sandals: "these will secure the welfare of the whole world"** | `chitrakuta`, NPC `bharata`, event `ch2.bharata`. It replaces the narrated "At last Bharata asks for Rama's sandals…"; set piece SA-1 | Required anchor; the image of the book | anuṣṭubh | अधिरोह (imperative) + आर्य (voc.) → अधिरोहार्य; पादाभ्याम् (instr. dual); पादुके (acc. dual f.); हेमभूषिते; योगक्षेमम् (idiom "welfare"); विधास्यतः (future 3 dual of vi-√dhā, hard) | https://valmikiramayan.net/utf8/ayodhya/sarga112/ayodhyasans112.htm ; vedapath https://vedapath.app/ja/ramayana/ayodhya-kanda/112/21 | CE 2.104.21, identical sandhied text (https://enjoylearningsanskrit.com/scriptures/ramayana/book-2/chapter-104/verse-21/) |

**Ayodhyā alternates**

| # | first pāda | citation | speaker → listener | moment / placement | notes | source | CE |
|---|---|---|---|---|---|---|---|
| A-alt1 | यथा काष्ठं च काष्ठं च | 2.105.26 | Rāma → Bharata | Beings meet and part like two logs on the ocean (`ch2.bharata`, after A7) | Famous image; easy words (काष्ठम्, महार्णवे, समेत्य); व्यपेयाताम् is an optative dual (hard) | https://valmikiramayan.net/utf8/ayodhya/sarga105/ayodhyasans105.htm | not checked |
| A-alt2 | अग्निम् संशमयतु आर्यः (page form) | 2.96.14 | Lakṣmaṇa → Rāma | Seeing the host from a tree: "put out the fire, let Sītā hide in the cave, string the bow" (`chitrakuta`, prelude to `ch2.bharata`; SA-2) | Gives Lakṣmaṇa a verse in Book 2. **Page typo** शरामः (for शरांश्च). A sandhied source was not fetched, so take the in-game pādas from one | https://www.valmikiramayan.net/utf8/ayodhya/sarga96/ayodhyasans96.htm (www host) | not checked |
| A-alt3 | स लक्ष्मणः सम्त्वरितः (page form) | 2.96.11 | Narrator | Lakṣmaṇa climbs a flowering śāla tree and looks east (SA-2) | Narration | vr.net sarga96 (www) | not checked |
| A-alt4 | सो अधिरुह्य नर व्याघ्रः (page form) | 2.112.22 | Narrator | Rāma steps on and off the sandals and gives them to Bharata (SA-1) | Page typo प्रायग्च्छत् | vr.net sarga112 | not checked |
| A-alt5 | ततः शिरसि कृत्वा तु (page form) | 2.113.1 | Narrator | Bharata puts the sandals on his head and mounts his chariot with Śatrughna (end of SA-1; the game already says "places the sandals on his head") | Easy words | https://valmikiramayan.net/utf8/ayodhya/sarga113/ayodhyasans113.htm | not checked |
| A-alt6 | चतुर् दश हि वर्षाणि (page form) | 2.52.84 | Sītā → Gaṅgā | Continues A4: "after fourteen years in the forest he will come back with his brother and me" | Easy; उष्य | vr.net sarga52 | not checked |

### Full text: Ayodhyā (page text exactly as fetched, then suggested in-game pādas)

**A1 · 2.25.32**
Page (word-split):
यन् मन्गलम् सहस्र अक्षे सर्व देव नमः कृते |
वृत्र नाशे समभवत् तत् ते भवतु मन्गलम् || २-२५-३२
*(The fetch reader placed the marker after line 1; siva.sh shows both lines as 2-25-32.)*
In-game pādas (CE 2.22.13 = siva.sh): यन्मङ्गलं सहस्राक्षे | सर्वदेवनमस्कृते | वृत्रनाशे समभवत् | तत्ते भवतु मङ्गलम्
*Gist:* The good fortune that came to thousand-eyed Indra, honoured by all the gods, when Vṛtra was destroyed: may that good fortune be yours.

**A2 · 2.27.6**
Page:
यदि त्वम् प्रस्थितः दुर्गम् वनम् अद्य एव राघव |
अग्रतः ते गमिष्यामि मृद्नन्ती कुश कण्टकान् || २-२७-६
In-game pādas (CE 2.24.5 = siva.sh): यदि त्वं प्रस्थितो दुर्गं | वनमद्यैव राघव | अग्रतस्ते गमिष्यामि | मृद्नन्ती कुशकण्टकान्
*Gist:* If you are setting out today for the hard forest, Rāghava, I will walk in front of you, treading down the grass and thorns.

**A3 · 2.50.36**
Page:
तम् आर्तः सम्परिष्वज्य गुहो राघवम् अब्रवीत् |
यथा अयोध्या तथा इदम् ते राम किम् करवाणि ते || २-५०-३६
In-game pādas (CE 2.44.12): तमार्तः संपरिष्वज्य | गुहो राघवमब्रवीत् | यथायोध्या तथेदं ते | राम किं करवाणि ते
*Gist:* Grieving, Guha embraced Rāghava and said: "This place is yours just as Ayodhyā is. Rāma, what can I do for you?"

**A4 · 2.52.83**
Page:
पुत्रः दशरथस्य अयम् महा राजस्य धीमतः |
निदेशम् पालयतु एनम् गन्गे त्वद् अभिरक्षितः || २-५२-८३
In-game pādas (CE 2.46.68): पुत्रो दशरथस्यायं | महाराजस्य धीमतः | निदेशं पालयत्वेनं | गङ्गे त्वदभिरक्षितः
*(Variant: IITK/vedapath and siva.sh read निदेशं पारयित्वेमं.)*
*Gist:* This son of the wise great king Daśaratha: Gaṅgā, guarded by you, may he carry out this command of his.

**A5 · 2.63.6**
Page:
यद् आचरति कल्याणि शुभम् वा यदि वा अशुभम् |
तत् एव लभते भद्रे कर्ता कर्मजम् आत्मनः || २-६३-६
In-game pādas (siva.sh, vulgate): यदाचरति कल्याणि | शुभं वा यदि वाऽशुभम् | तदेव लभते भद्रे | कर्ता कर्मजमात्मनः (CE 2.57.4 has वाशुभम्, without the avagraha)
*Gist:* Whatever a person does, good lady, good or bad, the doer receives exactly that: the fruit born of his own deed.

**A6 · 2.94.3**
Page:
न राज्याद् भ्रंशनम् भद्रे न सुहृद्भिर् विना भवः |
मनो मे बाधते दृष्ट्वा रमणीयम् इमम् गिरिम् || २-९४-३
In-game pādas (CE 2.88.3 = siva.sh): न राज्याद्भ्रंशनं भद्रे | न सुहृद्भिर्विनाभवः | मनो मे बाधते दृष्ट्वा | रमणीयमिमं गिरिम्
*Gist:* Now that I see this lovely hill, my dear, neither losing the kingdom nor being apart from my friends troubles my heart.

**A7 · 2.105.16**
Page:
सर्वे क्षय अन्ता निचयाः पतन अन्ताः समुग्च्छ्रयाः |
सम्योगा विप्रयोग अन्ता मरण अन्तम् च जीवितम् || २-१०५-१६
*(Page typos समुग्च्छ्रयाः, सम्योगा.)*
In-game pādas (CE 2.98.16): सर्वे क्षयान्ता निचयाः | पतनान्ताः समुच्छ्रयाः | संयोगा विप्रयोगान्ता | मरणान्तं च जीवितम्
*(siva.sh prints क्षयान्ताः … पतनान्ता with the visarga misplaced; don't use it here.)*
*Gist:* Every hoard ends in loss, every rise ends in a fall, every meeting ends in parting, and every life ends in death.

**A8 · 2.112.21 (anchor)**
Page:
अधिरोह आर्य पादाभ्याम् पादुके हेम भूषिते |
एते हि सर्व लोकस्य योग क्षेमम् विधास्यतः || २-११२-२१
In-game pādas (CE 2.104.21): अधिरोहार्य पादाभ्यां | पादुके हेमभूषिते | एते हि सर्वलोकस्य | योगक्षेमं विधास्यतः
*(vedapath/IITK prints आधिरोहाऽर्य … एतेहि …, a variant orthography.)*
*Gist:* Noble brother, step with your feet onto these gold-adorned sandals; they will secure the welfare of the whole world.

**Ayodhyā alternates: page text**

- **A-alt1 · 2.105.26**
  यथा काष्ठम् च काष्ठम् च समेयाताम् महा अर्णवे |
  समेत्य च व्यपेयाताम् कालम् आसाद्य कंचन || २-१०५-२६
  *Gist:* As two pieces of wood may meet on the great ocean and, having met, drift apart in time… (the comparison finishes in the next verse, not fetched).
- **A-alt2 · 2.96.14** (www host)
  अग्निम् संशमयतु आर्यः सीता च भजताम् गुहाम् |
  सज्यम् कुरुष्व चापम् च शरामः च कवचम् तथा || २-९६-१४
  *(Page typo शरामः.)*
  *Gist:* Let my noble brother put out the fire and Sītā take shelter in the cave; string your bow, and take your arrows and armour.
- **A-alt3 · 2.96.11** (www host)
  स लक्ष्मणः सम्त्वरितः सालम् आरुह्य पुष्पितम् |
  प्रेक्षमाणो दिशः सर्वाः पूर्वाम् दिशम् अवैक्षत || २-९६-११
  *Gist:* Lakṣmaṇa quickly climbed a flowering śāla tree, scanned every direction and looked east.
- **A-alt4 · 2.112.22**
  सो अधिरुह्य नर व्याघ्रः पादुके ह्य् अवरुह्य च |
  प्रायग्च्छत् सुमहा तेजा भरताय महात्मने || २-११२-२२
  *(Page typo प्रायग्च्छत्.)*
  *Gist:* The tiger among men stepped onto the sandals, stepped off again, and gave them to great-souled Bharata.
- **A-alt5 · 2.113.1**
  ततः शिरसि कृत्वा तु पादुके भरतः तदा |
  आरुरोह रथम् हृष्टः शत्रुघ्नेन समन्वितः || २-११३-१
  *Gist:* Then Bharata placed the sandals on his head and, glad at heart, mounted his chariot with Śatrughna.
- **A-alt6 · 2.52.84**
  चतुर् दश हि वर्षाणि समग्राणि उष्य कानने |
  भ्रात्रा सह मया चैव पुनः प्रत्यागमिष्यति || २-५२-८४
  *Gist:* After living fourteen full years in the forest, he will come back again with his brother and with me.

### Special moments: Ayodhyā

**SA-1. The golden sandals (main path; the book's set piece).**
- *Text:*
  - Bharata asks Rāma to step onto the gold-adorned sandals (2.112.21).
  - Rāma steps on them, steps off again and gives them to Bharata (2.112.22).
  - Bharata bows to them and vows to live 14 years in bark and matted hair outside the city, entrusting the kingdom to the sandals. If Rāma is not back when the 14 years end, he will enter the fire (2.112.23–26). See section 4 for the page's irregular line grouping here.
  - Bharata puts the sandals on his head and mounts his chariot with Śatrughna (2.113.1).
- *What the player sees:*
  1. In `chitrakuta`, a close-up insert of two golden sandals with a sparkle.
  2. Rāma's sprite steps forward onto a sandal prop and back (`move`). The prop slides to Bharata, who kneels (`face`).
  3. A "sandals on head" overlay on Bharata's sprite; he walks off north with Śatrughna (a `guard`-style extra) as the music swells.
- *Optional touch:* the word पादुके floats over the prop the first time it appears.
- *Needs:* a small prop sprite and a sprite overlay. Movement already exists.

**SA-2. Lakṣmaṇa in the śāla tree (main-path prelude, or optional).**
- *Text:*
  - Lakṣmaṇa quickly climbs a flowering śāla tree and looks east (2.96.11).
  - He cries: put out the fire, let Sītā shelter in the cave, string the bow, take arrows and armour (2.96.14).
- *What the player sees:*
  1. Before `ch2.bharata`, a dust cloud rises at the east edge of `chitrakuta` and drums rumble.
  2. Lakṣmaṇa's sprite hops up onto a tree tile.
  3. The camp-fire tile goes out (a tile swap) and Sītā's sprite walks into a cave or hut tile.
  4. Lakṣmaṇa shouts A-alt2 (hear).
  5. Then the reveal: Bharata arrives on foot, in bark cloth. The game already narrates "Lakshmana fears an attack", so this makes it playable.

**SA-3. Where the sandals rule: Nandigrāma (hidden).**
- *Text:* the 2.115 page says Bharata consecrated the sandals and lived at Nandigrāma (पादुके त्वभिषिच्याथ नन्दिग्रामेऽवसत्तथा). He himself held the white umbrella and the yak-tail fan (स वालव्यजनम् चत्रम् धारयामास स स्वयम्), referred all business to the sandals (भरतः शासनम् सर्वम् पादुकाभ्याम् निवेदयन्), and ruled under them (ततस्तु भरतः श्रीमानभिषिच्यार्यपादुके … तदधीनस्तदा राज्यम् कारयामास सर्वदा).
- *Exact verse numbers:* around **2.115.24–26**. The reader placed the markers mid-line, so the line grouping is **not confirmed**. Re-fetch before citing. Source: https://valmikiramayan.net/utf8/ayodhya/sarga115/ayodhyasans115.htm
- *What the player sees:* if the player walks back to `ayodhya_city` after `ch2.bharata_done`:
  - A guard says the throne room is empty: Bharata lives outside the city at Nandigrāma, where the sandals sit under the royal umbrella.
  - Optionally, a tiny `nandigrama` interior shows the two sandals on a throne under a white umbrella, with Bharata in bark cloth holding the fan.
  - Hidden: no objective points there.
- *Keep it true to the text:* the sandals are **not** in the Ayodhyā palace.

---

## 4. What I could not verify, and other cautions

**Typos printed on valmikiramayan.net.** Copied as printed; correct them in the game and note it in provenance:
- 1.67.19 व्रजयित्वा (CE वर्जयित्वा)
- 1.73.27 महभागा (IITK महाभागा)
- 2.105.16 समुग्च्छ्रयाः, सम्योगा
- 2.112.22 प्रायग्च्छत्
- 2.96.14 शरामः
- 2.25.32 मन्गलम् (the site's usual न्ग spelling)

**Readings that differ between sources:**
- **2.52.83:** page and CE read पालयतु एनम् / पालयत्वेनं; IITK (vedapath) and siva.sh read पारयित्वेमं. I recommend the page + CE reading.
- **2.50.36:** page and CE read इदम् / तथेदं; siva.sh reads तथेयं. Use तथेदं.
- **1.67.17:** pādas 1–2 differ in IITK (vedapath): आरोपयित्वा धर्मात्मा पूरयामास तद्धनु:. Page and CE agree on आरोपयित्वा मौर्वीं च पूरयामास वीर्यवान्.
- **1.49.17:** CE reads जगृहतुस्तदा; vulgate reads जगृहतुर्मुदा.
- **1.30.26:** CE reads कृतं राम महायशः and has no pādas 5–6.
- **1.73.26–27:** IITK divides these verses differently; vedapath's 1.73.28 begins पतिव्रता महाभागा….

**Not in the critical edition** (fine under the vulgate rule, but flag them in provenance):
- 1.18.8 (B1): the birth-date verse.
- The line पतिव्रता महाभागा छायेवानुगता सदा in 1.73.27 (B8).
- 1.25.18 (B-alt1).
- 1.29.2 (B-alt2).
- If only CE-backed verses are wanted:
  - Drop B1. It has no same-words CE equivalent; CE 1.17.6 tells the birth differently.
  - Use B-alt5 (1.73.26, fully in CE, no typo) as the main Janaka verse instead of B8.

**CE not checked:** 1.67.18, 2.105.26, 2.96.11, 2.96.14, 2.112.22, 2.113.1, 2.52.84.

**Line grouping and verse division:**
- **2.112.23–26 (Bharata's vow):** the page's line grouping is irregular. Read through the fetch tool, verse 23 seems to be "स पादुके सम्प्रणम्य रामं वचनम्ब्रवीत् | चतुर्दश हि वर्षाणि जटाचीरधरो ह्यहम्", with the vow running on across 24–26. I did not confirm which lines belong to which number, so I have not proposed these as verses; they are cited only in SA-1.
- **2.115.24–26 (Nandigrāma):** same problem; cited only in SA-3.
- **1.19.14** (अहं वेद्मि महात्मानं रामं सत्यपराक्रमम्, a famous line): the page seems to divide the verse differently (marker after this line, with वसिष्ठोऽपि… opening the next verse). I dropped it rather than guess.

**Read only on siva.sh** (a mirror of valmikiramayan.net for Bāla), not re-fetched from valmikiramayan.net:
- 1.73.28–29: the wedding flower rain in SB-3.
- 2.25.33–35: the refrain verses mentioned under A1.
- The third line of 1.49.16.

**Sites that failed:**
- vedapath.app often returned a client error; only four of its pages loaded.
- sanskritdocuments.org (the CE e-text mirror) failed.
- wisdomlib was not reached.
- enjoylearningsanskrit.com rate-limited parallel fetches, so its pages were read one at a time.

**Translations:** the gists are my own. I did not fetch the valmikiramayan.net translation pages. Speaker and listener come from the verse text and its neighbours (1.22.11, 1.30.25 and 1.73.26 name the speaker), plus the siva.sh and vedapath speaker notes.

**Engine notes:**
- SB-1 (shake and topple) needs new fx commands. Today's event commands are say, move, face, fade, wait, sfx, music, warp, shloka, quiz, battle, and so on.
- SA-1 needs a prop and an overlay. SB-2 and SB-3 need a petal particle effect.
- New sprites: `janaka` and `ahalya`. Neither is in `art-sprites.ts`.

**Placement ids** were read from `content/story-ch1.json` and `content/story-ch2.json` (maps, NPCs and events as of 2026-11-14).
