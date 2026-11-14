# Rāmāyaṇa-yātrā v0.6: candidate verses for Sundara-kāṇḍa (5) and Yuddha-kāṇḍa (6)

Researched 2026-11-14. Repo read only (content/story-ch5.json, story-ch6.json, shlokas-1/2.json); nothing in the repo was changed.

**Sources and conventions**
- **vr.net** = valmikiramayan.net, Devanagari "sans" pages (`/utf8/sundara/sargaN/sundarasansN.htm`, `/utf8/yuddha/sargaN/yuddhasansN.htm`). Primary source; citations use **its** verse numbers.
- **IITK** = IIT Kanpur text as shown on vedapath.app (sarga pages `vedapath.app/en/ramayana/<kanda>/<sarga>`; a few single-verse pages). IITK Yuddha numbering runs ahead of the vulgate in the late sargas: vulgate 6.123 = IITK 6.126, vulgate 6.125 = IITK 6.128 (checked: IITK 6.128 is Hanumān's errand to Bharata), vulgate 6.90 = IITK 6.91, vulgate 6.101 = IITK 6.102. Many vedapath pages returned errors (large sargas), as noted per verse.
- **CE** = Baroda critical edition, checked on enjoylearningsanskrit.com. I confirmed that this site uses CE numbering by loading its 6.12.20: it shows सकृदेव प्रपन्नाय, which the game already records as "Baroda critical edition 6.12.20". "CE: not checked" means I found no CE page for the verse.
- **Hemistich numbering.** vr.net often closes a verse number in the middle of a couplet. The game already handles one case (s-sakrdeva, "6-18-33cd + 6-18-34ab"). Where a couplet straddles a vr.net number, I say so and give the customary citation.
- **Text as fetched.** The fetch tool returns page text through a model and limits quotes to 125 characters. Each verse was therefore requested on its own, or as a "raw print" of the lines between two verse markers. vr.net's sarga-15/36/38/55 pages print words split apart (padapāṭha-like spacing). They also have typos (e.g. निह्श्वसन्तीम्, अन्कितम्, गच्चेत्). Section 2 gives the vr.net text exactly as returned, then a sandhi-joined reading confirmed by IITK and/or CE. **Use the joined reading in the game. A human reviewer decides on the variants flagged.**
- **Metre.** All picks are anuṣṭubh. I scanned them with a small script (8 syllables per pāda; positions 5–7 of the odd pādas). Most are pathyā. Where a verse uses a vipulā, I say so, because the game's `checkAnustubh` accepts only the pathyā form (see the meterNote on s-anirvedah).

---

## BOOK 5: SUNDARA-KĀṆḌA (7 core + alternates)

### 1. Table

| # | First pāda | Citation (vr.net) | Speaker → listener | Story moment | Placement in game | Why chosen | Metre | Difficulty notes | Source URL(s) | CE status |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | यथा राघवनिर्मुक्तः | 5.1.39 | Hanumān → the vānaras on Mahendra | The leap: "I will go to Laṅkā like an arrow loosed by Rāma" | **ocean_leap**, event `ch5.leap_start`, just after "He presses down with his feet, and the whole mountain trembles", before "Hanuman springs into the sky". NPC `vanara_cheer` can echo pāda 1 afterwards. Set piece: see Special moment S-A. | The famous launch line of book 5. Its image (Rāma's arrow) ties Hanumān's flight to Rāma. | anuṣṭubh, pathyā | Easy. Hard words: नि+मुक्त "released"; श्वसन-विक्रमः "with the speed of the wind"; गच्छेत् (optative) inside a यथा…तद्वत् comparison; रावण-पालिताम् (a compound). | vr.net sans + itrans sarga 1: https://www.valmikiramayan.net/utf8/sundara/sarga1/sundarasans1.htm · https://www.valmikiramayan.net/utf8/sundara/sarga1/sundaraitrans1.htm · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-5/chapter-1/verse-36 | **In CE, as 5.1.36** (same text, with गच्छेत्) |
| S2 | त्वरते कार्यकालो मे | 5.1.132 | Hanumān → Maināka | Maināka rises midway and offers rest. Hanumān declines: he has promised not to stop | **ocean_leap**, event `ch5.mainaka`, replacing or after "'I have promised not to stop,' he says gently." (the game line paraphrases this verse almost exactly) | A small scene about duty and keeping a promise. The words are short and common. | anuṣṭubh, pathyā | Easy. त्वरते "presses, hurries"; अहः "the day"; अति-वर्तते "is passing"; न स्थातव्यम् (gerundive: "I must not stop"); इह अन्तरे "here, on the way". | vr.net sans + itrans sarga 1 (URLs as S1) · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-5/chapter-1/verse-117 | **In CE, as 5.1.117**, variant **इहान्तरा** (vulgate इहान्तरे; vr.net misprints इहान्त्तरे) |
| S3 ⚓ | उपवासकृशां दीनां | 5.15.19 | Narrator (Vālmīki) | **ANCHOR: Hanumān's first sight of Sītā** in the Aśoka grove: thin from fasting, sighing, "like the first sliver of the moon in the bright fortnight" | **ashoka_vatika**, event `ch5.vatika_enter`, right after "…sits a lady in a faded yellow garment, pale with grief, guarded by rakshasis." Play in "hear" mode before "Hanuman knows at once: this is Sita". | The required anchor. The verse is gentle, and its crescent-moon image is easy to picture. | anuṣṭubh, pathyā | Easy. Hard words: उपवास-कृशाम् (a compound); निःश्वसन्तीम् (present participle, acc. f.); शुक्लपक्ष-आदौ (locative); चन्द्र-रेखाम् इव "like the crescent". All accusatives agree with an implied "her" (the line before, 15.18cd, also describes her). | vr.net: https://www.valmikiramayan.net/utf8/sundara/sarga15/sundarasans15.htm · IITK: https://vedapath.app/en/ramayana/sundara-kanda/15 | CE: not checked |
| S4 | तृणमन्तरतः कृत्वा | 5.21.3 | Sītā → Rāvaṇa | Rāvaṇa threatens and tempts her. She puts a blade of grass between them and tells him to turn his mind back to his own wives | **ashoka_vatika**, event `ch5.vatika_enter`, at "Sita places a blade of grass between herself and Ravana…". Optional: split Rāvaṇa's dawn visit into its own short event (e.g. new id `ch5.ravana_visit`), so that S3 and S4 do not crowd one cutscene. | Sītā's own voice of courage, a turning point, and an iconic image (the grass blade) that the game already narrates. Every word is short. | anuṣṭubh, pathyā | Easy. तृणम् "grass"; अन्तरतः "in between"; कृत्वा (gerund); शुचि-स्मिता "the pure-smiling one"; निवर्तय (causative imperative); मत्तः "from me" (ablative); क्रियताम् (passive imperative). Do not confuse मत्तः "from me" with मत्त "mad". | vr.net: https://www.valmikiramayan.net/utf8/sundara/sarga21/sundarasans21.htm · IITK: https://vedapath.app/en/ramayana/sundara-kanda/21 · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-5/chapter-19/verse-3 | **In CE, as 5.19.3** (same text). IITK divides it differently: 2ef + 3ab. |
| S5 | वानरोऽहं महाभागे | 5.36.2 | Hanumān → Sītā | Hanumān climbs down and shows Rāma's ring, "marked with Rāma's name" | **ashoka_vatika**, event `ch5.sita`, at "I am Hanuman, Rama's messenger. Here is his ring, engraved with his name." (just before `{"take":"kusha_mudrika"}`). The ring item's description can also carry pāda 3. | The ring scene is one of the best-loved in book 5, and this is its key line. Rāma's name is in it. | anuṣṭubh, pathyā | Easy. वानरः अहम् "I am a vānara"; दूतः "messenger"; राम-नाम-अङ्कितम् "marked with Rāma's name" (a compound worth teaching); अङ्गुलीयकम् "ring"; देवि (vocative). | vr.net: https://www.valmikiramayan.net/utf8/sundara/sarga36/sundarasans36.htm · IITK: https://vedapath.app/en/ramayana/sundara-kanda/36 | CE: not checked |
| S6 | धन्यास्ते पुरुषश्रेष्ठा | 5.55.3 | Hanumān → himself | After Laṅkā burns, Hanumān is struck with remorse and fear for Sītā: "Blessed are the great who check rising anger with wisdom, as one puts out a blazing fire with water" | **lanka_ablaze**, in the "all four roofs burnt" branch of `ch5.roof_1`…`roof_4`, at "Hanuman dips his tail in the sea, and the fire goes out. Then fear grips him: is Sita safe?". Non-kathā path: `ch5.aksha` onWin, at "Afraid for Sita, he hurried back to the grove". | Gives lanka_ablaze its own verse, after the fire. A different side of Hanumān (self-reproach) and a moral that children can carry away. | anuṣṭubh, pathyā | Medium. ये … ते (relative–correlative); बुद्ध्या (instrumental); कोपम् उत्थितम् "anger that has risen"; नि+रुन्धन्ति "restrain"; दीप्तम् अग्निम् इव अम्भसा "like a blazing fire with water". **Variant:** IITK reads पुरुषश्रेष्ठा(ः) (nom. pl., the grammatical reading); vr.net (पुरुष श्रेष्ठ) and the CE site read पुरुषश्रेष्ठ. | vr.net: https://www.valmikiramayan.net/utf8/sundara/sarga55/sundarasans55.htm · IITK: https://vedapath.app/en/ramayana/sundara-kanda/55 · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-5/chapter-53/verse-3 | **In CE, as 5.53.3** (reads धन्यास्ते पुरुषश्रेष्ठ) |
| S7 | कौसल्या सुप्रजा राम | 5.64.28 | Sugrīva → Rāma | The news arrives. Hearing that the vānaras have raided his honey-grove, Sugrīva knows the mission has succeeded: "Take heart, Rāma! The queen has been seen, no doubt, and by none other than Hanumān." | **setu_shore**, in the return cutscene shared by `ch5.sita` (ablaze branch) and `ch5.aksha` (non-kathā branch), just before "At Kishkindha, Hanuman bowed to Rama. 'I have seen Sita.'". Sugrīva speaks it (portrait sugriva), then Hanumān bows. | Book 5's "दृष्टा सीता" moment, in the form vr.net actually prints. Bonus: pāda 1 repeats **कौसल्या सुप्रजा राम**, which players already know from s-kausalya-supraja (1.23.2). That makes a natural `smarana` callback. | anuṣṭubh, pathyā | Easy. कौसल्या सुप्रजा "Kausalyā has a fine son" (a compound adjective; best explained as "blessed in her son"); समाश्वसिहि "take heart" (imperative); दृष्टा देवी "the queen has been seen" (participle as predicate); न संदेहः "no doubt"; हनूमता (instrumental of agent). | vr.net: https://www.valmikiramayan.net/utf8/sundara/sarga64/sundarasans64.htm · IITK: https://vedapath.app/en/ramayana/sundara-kanda/64 · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-5/chapter-61/verse-16 | **Pāda 3–4 in CE as 5.61.16ab** (दृष्टा देवी न संदेहो न चान्येन हनूमता). CE status of pāda 1–2 not checked. IITK divides it differently: 28cd + 29ab. |

**Sundara alternates** (all fetched from vr.net; use one if a core pick is dropped)

| # | First pāda | Citation (vr.net) | Speaker → listener | Moment / placement | Metre | Notes | Source | CE |
|---|---|---|---|---|---|---|---|---|
| S-alt1 | ततो वस्त्रगतं मुक्त्वा | 5.38.69 | Narrator | Sītā unties the crest-jewel from her garment and gives it to Hanumān for Rāma. `ch5.sita` at `{"give":"chudamani"}`, or as the chūḍāmaṇi item text | anuṣṭubh, pathyā | Very easy (चूडामणिम्, प्रदेयः "to be given", ददौ "gave"). It is the strongest alternate. I demoted it only because ashoka_vatika already holds 3 existing verses plus S3–S5. | vr.net https://www.valmikiramayan.net/utf8/sundara/sarga38/sundarasans38.htm · IITK https://vedapath.app/en/ramayana/sundara-kanda/38 (5.38.69, identical) | not checked |
| S-alt2 | शक्या लोभयितुं नाहम् | vr.net 5.21.15cd–16ab (IITK 5.21.15) | Sītā → Rāvaṇa | "I cannot be tempted by power or wealth; I am not separate from Rāghava, as light is not from the sun." `ch5.vatika_enter` (instead of S4) | anuṣṭubh, pathyā | Beautiful (अनन्या राघवेणाहं भास्करेण प्रभा यथा), but the couplet straddles vr.net's numbers 15/16 | vr.net sarga 21 · IITK sarga 21 | not checked |
| S-alt3 | अस्या देव्या मनस्तस्मिं- | 5.15.52 | Hanumān (thinking) | "Her mind is fixed on him and his on her; that is why both still live." End of `ch5.vatika_enter` | anuṣṭubh, pathyā | Medium (pronoun play तस्मिन्/अस्याम्). vr.net misprints मनः तस्मिमः | vr.net sarga 15 · IITK sarga 15 (5.15.52) | not checked |
| S-alt4 | दुष्करं कृतवान्कर्म | 5.1.112 | Maināka → Hanumān | Maināka's invitation: "Land on my peaks and rest as you please." Pairs with S2 in `ch5.mainaka` | anuṣṭubh, pathyā | Easy. vr.net misprints कृतावन्. Only one source (vr.net). | vr.net sarga 1 | not checked |
| S-alt5 | यदा त्वां वानरः कश्चिद् | vr.net 5.3.47cd–48ab | Laṅkā (city goddess) → Hanumān | Brahmā's old warning, "when a monkey overpowers you, know that fear has come to the rākṣasas". **lanka_gate**, `ch5.lanka_devi` onWin (the game paraphrases it already) | anuṣṭubh, pathyā | The vr.net page is typo-heavy here (भयामागतम्, म्, द्र्शनात्), and the couplet straddles two numbers. Normalise before use. | vr.net https://www.valmikiramayan.net/utf8/sundara/sarga3/sundarasans3.htm | not checked |
| S-alt6 | दृष्टा देवीति हनुमद्- | vr.net 5.64.37cd–38ab (IITK 5.64.38) | Narrator | "Hearing 'the queen has been seen' from Hanumān's mouth, like nectar, Rāma rejoiced with Lakṣmaṇa." Same placement as S7 | anuṣṭubh, pāda 1 **na-vipulā** | Long compound हनुमद्-वदनात् | vr.net / IITK sarga 64 | not checked |
| S-alt7 | यद्यस्ति पतिशुश्रूषा | vr.net 5.53.28cd–29ab | Sītā → Agni | Sītā prays to Fire to be cool for Hanumān. lanka_ablaze, start of the burning. **Sensitive:** it invokes wifely fidelity before Fire, close in theme to the later fire ordeal. Human review needed; do not make it an easter egg. | anuṣṭubh, pathyā | Easy words. Straddles two vr.net numbers. | vr.net https://www.valmikiramayan.net/utf8/sundara/sarga53/sundarasans53.htm | not checked |

### 2. Full text, Sundara (vr.net as fetched → joined reading)

**S1. 5.1.39** (vr.net prints this verse with sandhi joined)
vr.net: `यथा राघवनिर्मुक्तः शरः श्वसनविक्रमः | गच्चेत्तद्वद्गमिष्यामि लङ्कां रावणपालिताम् || ५-१-३९`
Joined (CE 5.1.36; corrects the vr.net typo गच्चेत्):
यथा राघवनिर्मुक्तः शरः श्वसनविक्रमः।
गच्छेत्तद्वद्गमिष्यामि लङ्कां रावणपालिताम्॥
*Gist:* Just as an arrow loosed by Rāma flies with the speed of the wind, so I will go to Laṅkā, the city Rāvaṇa guards.

**S2. 5.1.132**
vr.net: `त्वरते कार्यकालो मे अहश्चाप्यतिवर्तते | प्रतिज्ञा च मया दत्ता न स्थातव्यमिहान्त्तरे || ५-१-१३२`
Joined (vulgate reading; CE 5.1.117 ends इहान्तरा):
त्वरते कार्यकालो मे अहश्चाप्यतिवर्तते।
प्रतिज्ञा च मया दत्ता न स्थातव्यमिहान्तरे॥
*Gist:* The time for my task presses, and the day is passing. I have given my promise: I must not stop here on the way.

**S3. 5.15.19 ⚓**
vr.net (raw print; the line before is 15.18cd ततो मलिन सम्वीताम् राक्षसीभिः समावृताम् || ५-१५-१८):
`उपवास कृशाम् दीनाम् निह्श्वसन्तीम् पुनः पुनः |`
`ददर्श शुक्ल पक्ष आदौ चन्द्र रेखाम् इव अमलाम् || ५-१५-१९`
Joined (IITK 5.15.19 has उपवासकृशां दीनां निश्श्वसन्तीं पुनः पुनः। ददर्श शुक्लपक्षादौ चन्द्ररेखामिवामलाम्; vr.net's निह्श्वसन्तीम् is a typo for निःश्वसन्तीम्):
उपवासकृशां दीनां निःश्वसन्तीं पुनः पुनः।
ददर्श शुक्लपक्षादौ चन्द्ररेखामिवामलाम्॥
*Gist:* He saw her, thin from fasting and full of sorrow, sighing again and again, spotless like the first thin crescent of the moon at the start of the bright fortnight.

**S4. 5.21.3**
vr.net (raw print):
`तृणमन्तरतः कृत्वा प्रत्युवाच शुचिस्मिता |`
`निवर्तय मनो मत्तः स्वजने क्रियतां मनः || ५-२१-३`
Joined (CE 5.19.3, identical):
तृणमन्तरतः कृत्वा प्रत्युवाच शुचिस्मिता।
निवर्तय मनो मत्तः स्वजने क्रियतां मनः॥
*Gist:* Placing a blade of grass between them, she of the pure smile replied: "Turn your mind away from me. Set it on your own people."

**S5. 5.36.2**
vr.net: `वानरो अहम् महाभागे दूतो रामस्य धीमतः | राम नाम अन्कितम् च इदम् पश्य देवि अन्गुलीयकम् || ५-३६-२`
Joined (IITK 5.36.2; vr.net's अन्कितम्/अन्गुलीयकम् stand for अङ्कितम्/अङ्गुलीयकम्):
वानरोऽहं महाभागे दूतो रामस्य धीमतः।
रामनामाङ्कितं चेदं पश्य देव्यङ्गुलीयकम्॥
*Gist:* "Noble lady, I am a vānara, the messenger of wise Rāma. Look, my queen: this ring is marked with Rāma's name."

**S6. 5.55.3**
vr.net: `धन्याः ते पुरुष श्रेष्ठ ये बुद्ध्या कोपम् उत्थितम् | निरुन्धन्ति महात्मानो दीप्तम् अग्निम् इव अम्भसा || ५-५५-३`
Joined (IITK 5.55.3; CE 5.53.3 reads पुरुषश्रेष्ठ):
धन्यास्ते पुरुषश्रेष्ठा ये बुद्ध्या कोपमुत्थितम्।
निरुन्धन्ति महात्मानो दीप्तमग्निमिवाम्भसा॥
*Gist:* Blessed are the best of men, the great-souled ones, who hold back rising anger with good sense, as one puts out a blazing fire with water.

**S7. 5.64.28**
vr.net (the first line sits between markers २७ and २८; the second line closes ५-६४-२८):
`कौसल्या सुप्रजा राम समाश्वसिहि सुव्रत |`
`दृष्टा देवी न संदेहो न च अन्येन हनूमता || ५-६४-२८`
Joined (IITK prints कौसल्यासुप्रजा राम समाश्वसिहि सुव्रत as 5.64.28cd and दृष्टा देवी न सन्देहो न चान्येन हनूमता as 29ab; CE 5.61.16ab has the second line):
कौसल्या सुप्रजा राम समाश्वसिहि सुव्रत।
दृष्टा देवी न संदेहो न चान्येन हनूमता॥
*Gist:* "Rāma, Kausalyā's fine son, true to your vows, take heart! The queen has been found, no doubt about it, and by none other than Hanumān."

Alternates, as fetched:
- S-alt1 5.38.69, vr.net: `ततो वस्त्र गतम् मुक्त्वा दिव्यम् चूडा मणिम् शुभम् | प्रदेयो राघवाय इति सीता हनुमते ददौ || ५-३८-६९`. IITK 5.38.69: ततो वस्त्रगतं मुक्त्वा दिव्यं चूडामणिं शुभम्। प्रदेयो राघवायेति सीता हनुमते ददौ॥ *Gist:* Then Sītā untied the lovely, divine crest-jewel from her garment and gave it to Hanumān: "To be given to Rāghava."
- S-alt2, vr.net: `शक्या लोभयितुं नाहमैश्वर्येण धनेन वा || ५-२१-१५` / `अनन्या राघवेणाहं भास्करेण प्रभा यथा |` (16ab). IITK 5.21.15: शक्या लोभयितुं नाहमैश्वर्येण धनेन वा। अनन्या राघवेणाहं भास्करेण प्रभा यथा॥ *Gist:* I cannot be lured by power or riches; I am one with Rāma, as light is with the sun.
- S-alt3 5.15.52, vr.net: `अस्या देव्या मनः तस्मिमः तस्य च अस्याम् प्रतिष्ठितम् | तेन इयम् स च धर्म आत्मा मुहूर्तम् अपि जीवति || ५-१५-५२`. IITK: अस्या देव्या मनस्तस्मिंस्तस्य चास्यां प्रतिष्ठितम्। तेनेयं स च धर्मात्मा मुहूर्तमपि जीवति॥ *Gist:* Her heart rests in him and his in her; that alone keeps her, and that righteous man, alive from moment to moment.
- S-alt4 5.1.112, vr.net: `दुष्करं कृतावन्कर्म त्वमिदं वानरोत्तम | निपत्य मम शृङ्गेषु विश्रमस्व यथासुखम् || ५-१-११२` (read कृतवान्). *Gist:* You have done a hard deed, best of vānaras; come down on my peaks and rest as long as you like.
- S-alt5, vr.net: `स्वयम्भुवा पुरा दत्तम् वरदानम् यथा मम | यदा त्वाम् वानरः कश्चिद्विक्रमाद्वशमानयेत् || ५-३-४७` / `तदा त्वया हि विज्ञेयम् रक्षसाम् भयामागतम् | …|| ५-३-४८`. Read: यदा त्वां वानरः कश्चिद्विक्रमाद्वशमानयेत्। तदा त्वया हि विज्ञेयं रक्षसां भयमागतम्॥ *Gist:* When some monkey overpowers you by his might, know then that terror has come upon the rākṣasas.
- S-alt6, vr.net: `दृष्टा देवीति हनुमद्वदनादमृतोपमम् || ५-६४-३७` / `आकर्ण्य वचनम् रामो हर्षमाप सलक्ष्मणः |` (38ab). *Gist:* Hearing Hanumān's nectar-sweet words "the queen is found", Rāma rejoiced with Lakṣmaṇa.
- S-alt7, vr.net: `यदि अस्ति पति शुश्रूषा यदि अस्ति चरितम् तपः || ५-५३-२८` / `यदि च अस्ति एक पत्नीत्वम् शीतो भव हनूमतः |` (29ab). *Gist:* If I have served my husband, if I have practised austerity, if I have been faithful to one husband, be cool for Hanumān, O Fire.

### 3. Special moments, Sundara (new; not the existing ablaze/stealth set pieces)

**S-A. "Like Rāma's arrow": the launch from Mahendra (main path).**
*Grounding:* 5.1.39 (S1). In `ch5.leap_start` the game already narrates the trembling mountain.
*What the player sees and does:* Hanumān crouches on Mahendra; a hold-to-charge prompt lets the player "press down". The peak shakes and loose rocks fall. On release, Hanumān streaks off-screen with an arrow-trail across the sky, the camera follows into ocean_leap, and pāda 1 of S1 writes itself along the trail. About 5 seconds. Main path, on the existing trigger.

**S-B. Hanumān grows to prove himself to Sītā (main path, or an optional choice).**
*Grounding:* 5.37.30: Sītā doubts that a vānara with so small a body could carry her (page summary). 5.37.34: `स तस्मात् पादपात् धीमान् आप्लुत्य प्लवग ऋषभः | ततो वर्धितुम् आरेभे सीता प्रत्यय कारणात् ||` (he jumps down from the tree and begins to grow, to win Sītā's trust). 5.37.35: he becomes like Meru or Mandara. URL: https://www.valmikiramayan.net/utf8/sundara/sarga37/sundarasans37.htm
*What the player sees and does:* In `ch5.sita`, after "My lady, sit on my back…", a choice appears: "Show her your strength?" Hanumān's sprite swells tile by tile until it towers over the grove, its head above the śiṃśapā canopy, the guards still asleep. Then he shrinks back, and Sītā gives her refusal: Rāma himself must come. The game's existing line stays. Main path, or optional through the choice.

**S-C. Hidden: the Madhuvana honey-grove revel (optional).**
*Grounding:* 5.61.10–23 (page summary): the returning vānaras enter Sugrīva's protected honey-grove with Aṅgada's leave (10–13); they sing, dance, laugh, leap and tumble (13–18, e.g. 5.61.14 गायन्ति केचित् प्रणमन्ति केचिन्…); the guardian Dadhimukha tries to stop them and is overpowered (19–23). From exactly this, Sugrīva deduces that Sītā has been found (5.64.28, S7). URL: https://www.valmikiramayan.net/utf8/sundara/sarga61/sundarasans61.htm
*What the player sees and does:* On the flight home, before the warp to setu_shore, a short optional stop shows the vānaras in a honey grove (render it as a honey-and-fruit feast; the text says they grew "wild with merriment", so keep it light for children). The player can join the dance, a rhythm mini-game, while an indignant Dadhimukha chases them. Finding it sets a flag. Sugrīva's S7 line then adds a wink ("they wrecked my honey-grove, so they must have found her"). Hidden/optional.

---

## BOOK 6: YUDDHA-KĀṆḌA (8 core + alternates)

### 1. Table

| # | First pāda | Citation (vr.net) | Speaker → listener | Story moment | Placement in game | Why chosen | Metre | Difficulty notes | Source URL(s) | CE status |
|---|---|---|---|---|---|---|---|---|---|---|
| Y1 | विनश्येद्धि पुरी लङ्का | 6.9.19 | Vibhīṣaṇa → Rāvaṇa | Vibhīṣaṇa's counsel in Rāvaṇa's court: "Laṅkā will perish, and all its brave rākṣasas, if Rāma's beloved wife is not given back of your own accord" | **setu_shore**, event `ch6.vibhishana_refuge`, after "I begged him to return Sita, and he shamed me before his whole court." Vibhīṣaṇa quotes the warning he gave. | The brief asks for Vibhīṣaṇa's counsel. This is the core of it (give Sītā back), a turning point, and it is what makes him leave Laṅkā. It replaces 6.16.21, which the Araṇya report already uses as 3.37.2 (see Y-alt0). | anuṣṭubh, all pathyā | Easy–medium. विनश्येत् (optative) "would perish"; हि "surely"; शूराः सर्वे च राक्षसाः; रामस्य दयिता पत्नी "Rāma's beloved wife"; न स्वयं यदि दीयते "if she is not given (back) of your own accord" (passive present; यदि placed late). vr.net typos: विनश्येद्द्, आक्षसाः (read राक्षसाः). IITK typo: नयदि for यदि. | vr.net (raw print): https://www.valmikiramayan.net/utf8/yuddha/sarga9/yuddhasans9.htm · IITK: https://vedapath.app/en/ramayana/yuddha-kanda/9 (6.9.19) | CE: not checked (no CE hit found by search) |
| Y2 | ततो मध्यात्समुद्रस्य | 6.22.17 | Narrator | Rāma has bent his bow against the sea; the Ocean-lord rises from mid-ocean "like the sun rising from great Meru" | **setu_shore**, event `ch6.nala`, at "Then the Ocean rose in person and bowed." Set piece: see Special moment Y-A. | The brief asks for Samudra's appearance. This is the verse of the rising itself, and very visual. | anuṣṭubh, pathyā | Easy–medium. सागरः स्वयम् उत्थितः "the Ocean himself rose" (the past participle is the predicate); उदयन् (present participle) "rising"; महाशैलान् = महाशैलात् before म (sandhi -त् → -न्), so "from the great mountain Meru". vr.net misprints the marker as २-२२-१७. | vr.net: https://www.valmikiramayan.net/utf8/yuddha/sarga22/yuddhasans22.htm · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-6/chapter-15/verse-1 | **In CE as 6.15.1ab–cd.** CE adds a third line, पन्नगैः सह दीप्तास्यैः समुद्रः प्रत्यदृश्यत, so the CE sentence is three lines. IITK: page failed. |
| Y3 | वध्यमानो महाकायो | 6.60.54 | Narrator | Waking Kumbhakarṇa: beaten with clubs, the giant does not wake, and a thousand elephants run over his body | **lanka_battlefield**, event `ch6.kumbhakarna`, at its opening ("The ground shakes. Kumbhakarna… has been woken from his long sleep"), as a flash-back cutscene. See Special moment Y-B. | The brief asks for Kumbhakarṇa woken. Funny, memorable, and very easy. | anuṣṭubh, pathyā | Easy. वध्यमानः (present passive participle) "being beaten"; महाकायः; न प्राबुध्यत (imperfect of pra-√budh) "did not wake"; वारणानाम् सहस्रम् "a thousand elephants"; प्रधावितम् "ran over". | vr.net (raw print): https://www.valmikiramayan.net/utf8/yuddha/sarga60/yuddhasans60.htm · IITK 6.60.53 page: https://vedapath.app/hi/ramayana/yuddha-kanda/60/53 | CE: not checked. IITK divides it differently: वध्यमानो… is IITK 53cd. |
| Y4 | मृतसञ्जीवनीं चैव | 6.74.33 | Jāmbavān → Hanumān | After Indrajit's weapon fells Rāma's army, Jāmbavān sends Hanumān to the Himālaya for four great herbs, the first of them "mṛta-sañjīvanī", reviver of the dead | **lanka_battlefield**, event `ch6.sushena`, at the `{"give":"sanjivani"}` step: Suṣeṇa recounts "Jambavan told Hanuman…". The verse can also be the inscription on the sanjivani item. Set piece: see Special moment Y-C. | The brief asks for the herb mountain. This is the anuṣṭubh verse of that episode (the uprooting itself is told in upajāti, too hard), and it names the game's own item. | anuṣṭubh, pathyā | Medium: four compound herb names, but transparent. मृत-सञ्जीवनी "reviver of the dead"; विशल्य-करणी "the one that removes arrows"; सौवर्ण-करणी "restorer of (golden) complexion"; सन्धानी "the joiner (of wounds)"; महौषधी. Good for the -करणी agent suffix. | vr.net (raw print): https://www.valmikiramayan.net/utf8/yuddha/sarga74/yuddhasans74.htm · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-6/chapter-61/verse-33 | **In CE, as 6.61.33** (मृतसंजीवनीं… संधानीं) |
| Y5 | धर्मात्मा सत्यसन्धश्च | 6.90.71–72 (vr.net prints the couplet across 71cd–72ab, marker misprinted ९०-६-७१) | Lakṣmaṇa → his arrow (an act of truth) | Lakṣmaṇa fits the Aindra arrow: "If Rāma, son of Daśaratha, is righteous and true to his word, peerless in valour, then slay this son of Rāvaṇa!" Indrajit falls. | **lanka_battlefield**, event `ch6.indrajit` onWin, replacing the paraphrase "Lakshmana looses a final arrow with a vow: 'If Rama is truthful and devoted to dharma, let this arrow strike.'" | The climax of the Indrajit fight and a famous satya-kriyā. Speaker variety (Lakṣmaṇa). The game already paraphrases it. | anuṣṭubh, pathyā | Medium. A यदि … तत् conditional; धर्मात्मा, सत्यसन्धः (compounds); दाशरथिः "son of Daśaratha" (patronymic -इ); अप्रतिद्वन्द्वः "without rival"; जहि (imperative of √han) "slay!"; रावणिम् "Rāvaṇa's son". **Variant:** IITK 6.91.71 reads शरैनं जहि (vr.net and CE: तदेनं जहि). | vr.net: https://www.valmikiramayan.net/utf8/yuddha/sarga90/yuddhasans90.htm · IITK: https://vedapath.app/en/ramayana/yuddha-kanda/91/71 · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-6/chapter-78/verse-31 | **In CE, as 6.78.31** (धर्मात्मा सत्यसंधश्च… तदेनं जहि रावणिम्) |
| Y6 | एष सेतुर्मया बद्धः | 6.123.16–17 (vr.net prints the couplet across 16cd–17ab; IITK prints it whole as 6.126.16) | Rāma → Sītā | Flying home in the Puṣpaka, Rāma shows Sītā the bridge from the sky: "This is the setu I had built over the ocean for your sake, wide-eyed one: Nala's bridge, so hard to make." | `ch6.ravana`, in the Puṣpaka sequence (after "…rose into the sky, toward Ayodhya", at "From the Pushpaka, Rama shows Sita the places of their story"). Today that sequence plays only in kathā style; suggest showing this one verse in both styles over a fly-over of the **setu** map. | Brings the bridge back as the story closes. Rāma speaks to Sītā tenderly. Very easy words. | anuṣṭubh, pathyā | Easy. एषः "this"; मया बद्धः "built by me" (passive with instrumental); सलिल-अर्णवे; तव हेतोः "for your sake"; विशाल-अक्षि (vocative) "wide-eyed one"; सु-दुष्करः. | vr.net: https://www.valmikiramayan.net/utf8/yuddha/sarga123/yuddhasans123.htm · IITK: https://vedapath.app/en/ramayana/yuddha-kanda/126/6.126.16 | CE: not checked |
| Y7 | एतत्ते रक्षितं राजन् | 6.127.54 | Bharata → Rāma | Bharata puts Rāma's sandals back on his feet (6.127.52) and hands back the kingdom: "This kingdom, kept safe for you, I now return. Today my life has its purpose, and my wish has come true." | **ayodhya_return**, NPC `bharata` (event `ch6.bharata`, now "I only kept the throne warm…"), or the arrival narration at the end of `ch6.ravana` ("Bharata comes out to meet his brother, carrying the sandals…"). | The return to Ayodhyā from Bharata's side, a beloved moment of loyalty. Speaker variety. | anuṣṭubh, pathyā | Easy–medium. रक्षितम् "kept safe"; निर्यातितम् "returned, handed back" (causative participle of nir-√yat); कृत-अर्थम् "fulfilled"; संवृत्तः "has come about"; मनोरथः "heart's wish". | vr.net: https://www.valmikiramayan.net/utf8/yuddha/sarga127/yuddhasans127.htm · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-6/chapter-115/verse-43 and …/verse-44 | **In CE as 6.115.43cd + 44ab** (CE divides it differently; text identical) |
| Y8 ⚓ | न पर्यदेवन्विधवा | 6.128.99 | Narrator | **ANCHOR: Rāma-rājya.** "No widows wept, there was no fear of snakes or of sickness, while Rāma ruled the kingdom." | **ayodhya_return**, event `ch6.coronation`, at "Rama ruled for many years, and in his kingdom no one knew fear, sickness or sorrow." (the existing line paraphrases this verse). The refrain रामे राज्यं प्रशासति can also run on a palace-gate sign. | The required anchor. The refrain recurs in 6.128.99, 102 and 103 and is the classic statement of Rāma-rājya. | anuṣṭubh. **Pāda 1 is a bha-vipulā** (syllables 5–7 heavy-light-light); the other pādas are regular. It needs a meterNote like s-anirvedah's, or `checkAnustubh` will reject it. | Medium. पर्यदेवन् (imperfect 3pl of pari-√dev "lamented", the hardest word); व्याल-कृतम् "caused by beasts of prey/snakes"; व्याधि-जम् "born of disease"; **रामे राज्यं प्रशासति = locative absolute** "while Rāma ruled", a perfect teaching point. vr.net typo भयन् for भयं. | vr.net (raw print): https://www.valmikiramayan.net/utf8/yuddha/sarga128/yuddhasans128.htm · CE: https://enjoylearningsanskrit.com/scriptures/ramayana/book-6/chapter-116/verse-84 | **In CE, as 6.116.84** (identical). IITK (= 6.131) page failed. |

**Yuddha alternates**

| # | First pāda | Citation (vr.net) | Speaker → listener | Moment / placement | Metre | Notes | Source | CE |
|---|---|---|---|---|---|---|---|---|
| Y-alt0 | सुलभाः पुरुषा राजन् | 6.16.21 (customary; vr.net prints the couplet across 21cd–22ab; IITK prints it whole as 6.16.21) | Vibhīṣaṇa → Rāvaṇa | His parting words as he leaves Laṅkā: flatterers are easy to find, but whoever speaks, or will hear, unwelcome but wholesome advice is rare. `ch6.vibhishana_refuge` | anuṣṭubh, pathyā | **Duplicate across books:** the same couplet stands at Araṇya 3.37.2 (Mārīca → Rāvaṇa), and the sibling report aranya-kishkindha.md already makes 3.37.2 a core pick (A3). Use it in only one book. If the Araṇya pick is dropped, this is a strong Yuddha verse. Variants: IITK सुलभाः पुरुषराजन् … च पथ्यस्य; vr.net and CE पुरुषा राजन् … तु पथ्यस्य. | vr.net https://www.valmikiramayan.net/utf8/yuddha/sarga16/yuddhasans16.htm · IITK https://vedapath.app/en/ramayana/yuddha-kanda/16 · CE https://enjoylearningsanskrit.com/scriptures/ramayana/book-6/chapter-10 | **In CE, as 6.10.16** |
| Y-alt0b | प्रसादये त्वां बन्धुत्वात् | 6.9.20 | Vibhīṣaṇa → Rāvaṇa | "I beg you, as your brother: do as I say. I speak what is good and wholesome: let Maithilī be given back to him." The verse right after Y1; it could replace Y1 | anuṣṭubh; pāda 1 **ma-vipulā** | Medium (प्रसादये causative, कुरुष्व, epic ब्रूमि). Variant: vr.net हितं पथ्यं vs IITK हितं तथ्यम्. | vr.net sarga 9 (raw print) · IITK yuddha-kanda/9 (6.9.20) | not checked |
| Y-alt1 | सर्वं मुदितमेवासीत् | 6.128.101 | Narrator | Rāma-rājya: "All were joyful, all devoted to dharma; looking to Rāma alone, they did not harm one another." `ch6.coronation` or citizen NPCs | anuṣṭubh, **all pathyā** | Easier than Y8 (imperfects आसीत्, अभवत्, अभ्यहिंसन्). The anchor alternative if a pathyā-only verse is wanted. vr.net typos: धर्मपरोअभवत्, नाभ्यहिन्सन्. | vr.net sarga 128 | **In CE, as 6.116.86** |
| Y-alt2 | रामो रामो राम इति | 6.128.103 | Narrator | "'Rāma, Rāma, Rāma' was all the people talked of; the world became Rāma while Rāma ruled." For `citizen` / `citizen_2` / `child_lamps` in ayodhya_return | anuṣṭubh; pāda 1 bha-vipulā, pāda 3 na-vipulā | Much loved and memorable, but **not in CE 6.116** (I searched the whole sarga text). vr.net misprints जगाभूद् for जगदभूद्. | vr.net sarga 128 | **Not in CE 6.116** |
| Y-alt3 | देशे देशे कलत्राणि | 6.101.15 (IITK 6.102.15) | Rāma (lament) | Rāma over the fallen Lakṣmaṇa: "In every land there are wives, in every land kin, but I see no land where a brother born of one mother can be found." For `ch6.sushena` (Lakṣmaṇa's fall) | anuṣṭubh, pathyā | Very easy and very famous. Not found on the CE site (likely an interpolation). Note सहोदरः "born of the same womb", although Lakṣmaṇa is Sumitrā's son. | vr.net https://www.valmikiramayan.net/utf8/yuddha/sarga101/yuddhasans101.htm · IITK listed at vedapath yuddha-kanda/102/15 (search) | not found in CE |
| Y-alt4 | पृथिवी वायुराकाशम् | 6.22.25 | Samudra → Rāma | The Ocean's first words: earth, wind, sky, water and light keep to their own nature (so he cannot make himself shallow). `ch6.nala` | anuṣṭubh, pathyā | vr.net misprints राघवः for vocative राघव, and the marker as २-२२-२५ | vr.net sarga 22 | not checked |
| Y-alt5 | अयं सौम्य नलो नाम | 6.22.44 | Samudra → Rāma | "This gentle one is Nala, son of Viśvakarman…" For NPC `nala` | anuṣṭubh, pathyā | Quoted by the tool, not raw-printed | vr.net sarga 22 | not checked |
| Y-alt6 | स जृम्भमाणोऽतिबलः | 6.60.58 | Narrator | Kumbhakarṇa yawns awake; his breath is like wind from a mountain. Follows Y3 | anuṣṭubh, pāda 1 bha-vipulā | vr.net typos सम्जज्ञे, पर्वदादिव (read सञ्जज्ञे, पर्वतादिव?) | vr.net sarga 60 | not checked |

### 2. Full text, Yuddha (vr.net as fetched → joined reading)

**Y1. 6.9.19**
vr.net (raw print; Vibhīṣaṇa speaking):
`विनश्येद्द् हि पुरी लंका शूराः सर्वे च आक्षसाः |`
`रामस्य दयिता पत्नी न स्वयम् यदि दीयते || ६-९-१९`
Joined (IITK 6.9.19 reads विनश्येद्धि पुरी लङ्का शूरास्सर्वे च राक्षसाः । रामस्य दयिता पत्नी न स्वयं नयदि [sic] दीयते; it confirms राक्षसाः against vr.net's आक्षसाः):
विनश्येद्धि पुरी लङ्का शूराः सर्वे च राक्षसाः।
रामस्य दयिता पत्नी न स्वयं यदि दीयते॥
*Gist:* "If Rāma's beloved wife is not given back of your own free will, the city of Laṅkā will surely perish, and every brave rākṣasa with it."

**Y2. 6.22.17**
vr.net (raw print): `ततो मध्यात् समुद्रस्य सागरः स्वयम् उत्थितः |` / `उदयन् हि महाशैलान् मेरोर् इव दिवा करः || २-२२-१७` [sic: २ for ६]
Joined (CE 6.15.1, first two lines):
ततो मध्यात्समुद्रस्य सागरः स्वयमुत्थितः।
उदयन् हि महाशैलान्मेरोरिव दिवाकरः॥
*Gist:* Then from the middle of the sea the Ocean-lord himself rose up, like the sun rising from the great mountain Meru.

**Y3. 6.60.54**
vr.net (raw print): `वध्यमानो महाकायो न प्राबुध्यत राक्षसः |` / `वारणानाम् सहस्रम् च शरीरेऽस्य प्रधावितम् || ६-६०-५४`
Joined:
वध्यमानो महाकायो न प्राबुध्यत राक्षसः।
वारणानां सहस्रं च शरीरेऽस्य प्रधावितम्॥
*Gist:* Though they pounded him, the huge rākṣasa did not wake, and a thousand elephants were driven across his body.

**Y4. 6.74.33**
vr.net (raw print): `मृतसञ्जीवनीं चैव विशल्यकरणीम् अपि |` / `सौवर्णकरणीं चैव सन्धानीं च महौषधीम् || ६-७४-३३`
Joined (CE 6.61.33 spells it मृतसंजीवनीं … संधानीं):
मृतसञ्जीवनीं चैव विशल्यकरणीमपि।
सौवर्णकरणीं चैव सन्धानीं च महौषधीम्॥
*Gist:* (Bring) the herb that revives the dead, the one that draws out arrows, the one that restores the body's golden glow, and the great herb that knits wounds together.

**Y5. 6.90.71–72 (vr.net 71cd–72ab)**
vr.net (raw print):
`लक्ष्मीवान् लक्ष्मणो वाक्यमर्थसाधकमात्मनः |` (71ab)
`धर्मात्मा सत्यसन्धश्च रामो दाशरथिर्यदि || ९०-६-७१` [sic]
`पौरुषे चाप्रतिद्वन्द्वस्तदेनं जहि रावणिम् |` (72ab)
Joined (CE 6.78.31; IITK 6.91.71 reads शरैनं जहि):
धर्मात्मा सत्यसन्धश्च रामो दाशरथिर्यदि।
पौरुषे चाप्रतिद्वन्द्वस्तदेनं जहि रावणिम्॥
*Gist:* "If Rāma, son of Daśaratha, is righteous, true to his word and unrivalled in valour, then, arrow, slay this son of Rāvaṇa!"

**Y6. 6.123.16–17 (vr.net 16cd–17ab)**
vr.net (raw print):
`यत्र सागरमुत्तीर्य तान् रात्रिमुषिता वयम् |` (16ab)
`एष सेतुर्मया बद्धः सागरे सलिलार्णवे || ६-१२३-१६`
`तवहेतोर्विशालाक्षि नलसेतुः सुदुष्करः |` (17ab)
Joined (IITK 6.126.16 prints exactly this couplet: एष सेतुर्मया बद्धस्सागरे सलिलार्णवे। तव हेतोर्विशालाक्षि नलसेतुः सुदुष्करः):
एष सेतुर्मया बद्धः सागरे सलिलार्णवे।
तव हेतोर्विशालाक्षि नलसेतुः सुदुष्करः॥
*Gist:* "There is the bridge I had built across the ocean, the great sea of waters, for your sake, wide-eyed one: Nala's bridge, a feat hard to achieve."

**Y7. 6.127.54**
vr.net (raw print; the line before is 53cd अब्रवीच्च तदा रामं भरतः स कृताञ्जलिः):
`एतत्ते रक्षितं राजन्राज्यं निर्यातितं मया |`
`अद्य जन्म कृतार्थं मे संवृत्तश्च मनोरथः || ६-१२७-५४`
Joined (CE 6.115.43cd + 44ab, identical):
एतत्ते रक्षितं राजन् राज्यं निर्यातितं मया।
अद्य जन्म कृतार्थं मे संवृत्तश्च मनोरथः॥
*Gist:* "King, here is your kingdom, kept safe; I give it back to you. Today my life has found its purpose, and my heart's wish has come true."

**Y8. 6.128.99 ⚓**
vr.net (raw print): `न पर्यदेवन्विधवा न च व्यालकृतं भयम् |` / `न व्याधिजं भयन् वापि रामे राज्यं प्रशासति || ६-१२८-९९`
Joined (CE 6.116.84, identical apart from the vr.net typo भयन्):
न पर्यदेवन्विधवा न च व्यालकृतं भयम्।
न व्याधिजं भयं वापि रामे राज्यं प्रशासति॥
*Gist:* While Rāma ruled, no widow had cause to mourn, and no one feared wild beasts or sickness.

Alternates, as fetched:
- Y-alt0 6.16.21, vr.net (raw print): `न गृह्णन्ति अकृत आत्मानः कालस्य वशमागताः |` (21ab) / `सुलभाः पुरुषा राजन् सततम् प्रिय वादिनः || ६-१६-२१` / `अप्रियस्य तु पथ्यस्य वक्ता श्रोता च दुर्लभः |` (22ab). Joined (CE 6.10.16): सुलभाः पुरुषा राजन् सततं प्रियवादिनः। अप्रियस्य तु पथ्यस्य वक्ता श्रोता च दुर्लभः॥ *Gist:* "O king, people who always say pleasant things are easy to find. Rare is the one who speaks, or will listen to, advice that is unwelcome but good."
- Y-alt0b 6.9.20, vr.net (raw print): `प्रसादये त्वाम् बन्धुत्वात् कुरुष्व वचनम् मम | हितम् पथ्यम् त्व् अहम् ब्रूमि दीयताम् अस्य मैथिली || ६-९-२०`. Joined: प्रसादये त्वां बन्धुत्वात्कुरुष्व वचनं मम। हितं पथ्यं त्वहं ब्रूमि दीयतामस्य मैथिली॥ (IITK 6.9.20: …हितं तथ्यमहं ब्रूमि…). *Gist:* "As your brother I implore you, heed my words. I tell you what is good for you: give Maithilī back to him."
- Y-alt1 6.128.101, vr.net: `सर्वं मुदितमेवासीत्सर्वो धर्मपरोअभवत् | राममेवानुपश्यन्तो नाभ्यहिन्सन्परस्परम् || ६-१२८-१०१`. Read: सर्वं मुदितमेवासीत्सर्वो धर्मपरोऽभवत्। राममेवानुपश्यन्तो नाभ्यहिंसन्परस्परम्॥ (CE 6.116.86, second line confirmed). *Gist:* Everyone was happy and everyone lived by dharma; with their eyes on Rāma, no one harmed another.
- Y-alt2 6.128.103, vr.net: `रामो रामो राम इति प्रजानामभवन् कथाः | रामभूतं जगाभूद्रामे राज्यं प्रशासति || ६-१२८-१०३`. Read जगदभूद्. *Gist:* "Rāma, Rāma, Rāma" was all the people spoke of; while Rāma ruled, the whole world was full of Rāma.
- Y-alt3 6.101.15, vr.net: `देशे देशे कलत्राणि देशे देशे च बान्धवाः | तं तु देशं न पश्यामि यत्र भ्राता सहोदरः || ६-१०१-१५`. *Gist:* In land after land one finds wives and kin, but I know no land where I could find a brother like mine.
- Y-alt4 6.22.25, vr.net: `पृथिवी वायुर् आकाशम् आपो ज्योतिः च राघवः | स्वभावे सौम्य तिष्ठन्ति शाश्वतम् मार्गम् आश्रिताः || २-२२-२५` [sic]. Read राघव. *Gist:* Earth, wind, sky, water and light, gentle Rāghava, all keep to their own nature, following their eternal way.
- Y-alt5 6.22.44, vr.net (tool quote): `अयम् सौम्य नलो नाम तनुजो विश्व कर्मणः | पित्रा दत्त वरः श्रीमान् प्रतिमो विश्व कर्मणः || २-२२-४४`. *Gist:* This is Nala, son of Viśvakarman, blessed with a boon by his father and his father's equal.
- Y-alt6 6.60.58, vr.net (raw print): `स जृम्भमाणोऽतिबलः प्रबुद्धस्तु निशाचरः | निःश्वासश्चास्य सम्जज्ञे पर्वदादिव मारुतः || ६-६०-५८`. *Gist:* Yawning, the mighty night-prowler woke; his breath rushed out like a wind from a mountain.

### 3. Special moments, Yuddha (new; not the bridge puzzle, Rāvaṇa's heads or the Āditya-hṛdayam cutscene)

**Y-A. Samudra rises before Rāma (main path).**
*Grounding:* 6.22.17 (Y2): the Ocean rises from mid-sea like the sun from Meru. 6.22.24 (raw print) `अब्रवीत् प्रान्जलिर् वाक्यम् राघवम् शर पाणिनम् ||` (he speaks with joined palms to Rāghava, who holds an arrow). CE 6.15.1 adds that he appeared with serpents of blazing mouths (पन्नगैः सह दीप्तास्यैः). 6.22.25 and 6.22.44: his speech, and his naming of Nala.
*What the player sees and does:* In `ch6.nala`, after "Rama took up his bow in anger": the player holds to draw Rāma's bow; the sea darkens and churns. A golden glow then swells at the horizon, and Samudra rises out of the water like a sunrise, surrounded by bright serpents, and joins his palms. The Y2 verse appears; Samudra names Nala (Y-alt5), and the scene hands off to the existing bridge puzzle. Main path.

**Y-B. Waking Kumbhakarṇa (main path cutscene, with an optional gag).**
*Grounding:* 6.60.35 (conches blown, a tumult of shouting; tool quote `शङ्खांश्च पूरयामासुः शशाङ्कसदृशप्रभान् || ६-६०-३५`). 6.60.53–54 (pounded on all sides with rope-tied śataghnīs, `रज्जुबन्धनबद्धाभिः शतग्नीभिश्च सर्वशः`, he still does not wake; a thousand elephants run over him; Y3). 6.60.55–57 (he finally wakes, stretches his arms, and yawns with a mouth like the underworld). 6.60.58 (his breath like wind from a mountain). All from the vr.net raw print of sarga 60.
*What the player sees and does:* Before the `ch6.kumbhakarna` boss, a comic cutscene runs inside Laṅkā: rākṣasas beat drums and blow conches beside a snoring mountain of a giant, whose snores blow them backwards. Optional gag: the player times button presses to "help" the drummers, and nothing happens. Then a line of elephants trots across his body (Y3 appears), he yawns hugely, and the screen shakes. Cut to the battlefield and the existing boss intro. Main path; the drum gag is optional.

**Y-C. Hanumān brings the mountain of herbs (optional flashback flight, or main-path cutscene).**
*Grounding:* 6.74.33 (Y4): Jāmbavān names the herbs. Tool summary of 6.74: 6.74.64, the herbs hide themselves; 6.74.66, Hanumān angrily asks the mountain why it shows no pity to Rāghava (`किमेतदेवं सुविनिश्चितं ते | यद्राघवे नासि कृतानुकम्पः…`); 6.74.67, he tears the peak off with its trees and creatures (`स तस्य शृङ्गं सनगं सनागं …`); 6.74.68, he leaps into the sky with it, as swift as Garuḍa (`स तं समुत्पाट्य खमुत्पपात … जगाम वेगाद्गरुडोग्रवीर्यः`). These climax verses are upajāti, so the game shows the anuṣṭubh Y4 and uses them only as script.
*What the player sees and does:* The first time the player talks to `sushena`, a short playable flashback can run. Hanumān flies north to a glowing Himālayan peak, and the herbs wink out of sight as he lands. A prompt follows: "The herbs are hiding! What will Hanumān do?" The player chooses "Take the whole mountain". Hanumān lifts the entire peak overhead and flies back over the sea. Then the existing `{"give":"sanjivani"}` step. Optional/hidden if it is a playable flight; main path if it is a 10-second cutscene.

*Small extra (no new art needed):* in `ch6.bharata` the player can be asked to hand Bharata the sandals, so that Bharata places them on Rāma's feet (6.127.52, `पादुके ते तु रामस्य गृहीत्वा भरतः स्वयम् … चरणाभ्यां नरेन्द्रस्य योजयामास धर्मवित्`) before Y7 plays.

**Sītā's fire ordeal (6.116–118 in the vulgate):** I did not select it or propose it as a special moment. If the team mentions it at all, keep it to a line of narration with human review. It is not an easter egg. S-alt7 (Sītā's prayer to Agni in 5.53) is adjacent in theme and is flagged for review for the same reason.

---

## 4. Not verified / open points

1. **IITK second source missing** for 5.1.39, 5.1.132 (vedapath sarga 1 would not load), 6.22.17, 6.74.33, 6.127.54 and 6.128.99 (IITK 6.131 would not load). Each of these has the CE (enjoylearningsanskrit.com) as its second source instead. 5.1.39 and 5.1.132 were also checked on vr.net's own itrans page.
2. **CE not checked** for 5.15.19, 5.36.2, 5.38.69, 6.9.19, 6.60.54 and 6.123.16–17. Pāda 1–2 of 5.64.28 (कौसल्या सुप्रजा राम…) not checked in CE.
3. **Variants needing a reviewer:** 5.1.132 इहान्तरे (vulgate) vs इहान्तरा (CE). 5.55.3 पुरुषश्रेष्ठाः (IITK) vs पुरुषश्रेष्ठ (vr.net, CE site). 6.16.21 (Y-alt0) पुरुषा राजन् … तु (vr.net, CE) vs पुरुषराजन् … च (IITK). 6.9.20 (Y-alt0b) पथ्यम् (vr.net) vs तथ्यम् (IITK). 6.90.71 तदेनं (vr.net, CE) vs शरैनं (IITK).
4. **vr.net typos** that the game must not copy: निह्श्वसन्तीम् (5.15.19), तस्मिमः (5.15.52), गच्चेत् (5.1.39), इहान्त्तरे (5.1.132), कृतावन् (5.1.112), भयामागतम् / म् / द्र्शनात् (5.3.47–48), भयन् (6.128.99), जगाभूद् (6.128.103), धर्मपरोअभवत् / नाभ्यहिन्सन् (6.128.101), राघवः for राघव (6.22.25), विनश्येद्द् / आक्षसाः (6.9.19), सम्जज्ञे / पर्वदादिव (6.60.58). Misprinted markers: २-२२-… for ६-२२-…, and ९०-६-७१ for ६-९०-७१.
5. **Fetch-tool caveat:** the vr.net text came through a model with a 125-character quote limit. I asked for raw line-by-line prints wherever possible, and every core verse matches a second source except 6.60.54 (IITK showed only its first half, as 6.60.53cd). A last human check against the live pages is still advised before shipping.
6. **Vipulā metre:** the anchor 6.128.99 (pāda 1, bha-vipulā) needs a meterNote. So do the alternates 5.64.37, 6.128.103 and 6.60.58.
7. **Out of scope, but noticed in the current content:** `ch6.nala` has Nala shout "Rama's name on every stone!", and the narration says the stones float. The brief itself says the Rāma-nāma floating stones are a later tradition. In vr.net 6.22 it is the Ocean who promises to bear what Nala builds (game: "I will hold up whatever he places on my waters"). Worth a fix in the story-ch6 pass.
8. **Cross-book duplication:** सुलभाः पुरुषा राजन्… appears at both 3.37.2 (Mārīca) and 6.16.21 (Vibhīṣaṇa). The sibling report aranya-kishkindha.md already picks 3.37.2 as core A3, so I moved 6.16.21 to Y-alt0 and made Vibhīṣaṇa's 6.9.19 the core Y1. The team should choose one book for the couplet.
