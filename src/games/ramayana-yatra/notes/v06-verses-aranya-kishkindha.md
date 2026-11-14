# Rāmāyaṇa-yātrā v0.6: new verse candidates for Araṇya (3) and Kiṣkindhā (4)

Researched 2026-11-14. Every verse below was fetched from valmikiramayan.net (vulgate / Gita Press numbering) and checked against at least one other rendering:
- **CE**: the Baroda critical-edition e-text in Roman at indology.info (Bombay mirror): https://indology.info/bombay/ramayana/text/UR/Ram03.txt and .../Ram04.txt. Its sarga numbers match the CE numbers the game already cites (for example, 3.37.13 = CE 3.35.13).
- **IIT-K**: the IIT Kanpur text on vedapath.app sarga pages (https://vedapath.app/en/ramayana/aranya-kanda/N, .../kishkindha-kanda/N). The per-verse vedapath URLs mostly refused to load; the sarga pages loaded.
- **itrans**: the same site's transliteration and translation page (…itrans…htm). It was used where I needed to know how the site splits a verse, or to confirm a word.

**Page-exact text.** valmikiramayan.net prints its Devanagari word by word, without sandhi (for example "अपि अहम् जीवितम्"). That text is copied below as the page prints it. Because the split form changes the syllable count, each verse also has a **saṃhitā (sandhi) form for the game**. That form follows CE or IIT-K where their reading matches the site's words. Where the site has its own reading, I applied sandhi to the site's words and marked the result "derived".

**Metre.** I scanned every saṃhitā pāda with a small script (/home/claude/scratch/v06/tools/meter.py, input in tools/verses.tsv). The game's `checkAnustubh` should re-run the scan. Wherever a pāda is a vipulā, the verse needs a meterNote naming that pāda.

**Already in the game; not repeated here:** 3.37.13, 3.43.10, 3.67.15, 4.3.28, 4.3.29, 4.6.22.

---

## BOOK 3 — ARAṆYA-KĀṆḌA (7 main + alternates)

| # | First pāda | Citation | Speaker → listener | Story moment | Placement in game | Why chosen | Metre | Difficulty notes | Source URL(s) | CE status |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | अप्यहं जीवितं जह्यां | **3.10.18cd–19ab** (crosses a verse boundary, like the existing 4.6.22cd–23ab) | Rāma → Sītā | Rāma's vow to protect the Daṇḍaka sages, even at the cost of his life and of Sītā and Lakṣmaṇa | `dandaka_vana` · NPC `sage_elder` · event `ch3.dandaka_sages`. Add it after Rāma's line "I will protect you…". Sītā voices her worry (her speech in 3.9), and Rāma answers with this couplet (mode hear). | One of the best-known lines in the book. It states the forest book's moral premise: a promise once given is not taken back. | anuṣṭubh; pāda 3 is a ma-vipulā (needs meterNote) | जह्याम् (optative of √hā, "I would give up"); सलक्ष्मणाम् (feminine adjective, "together with Lakṣmaṇa"); संश्रुत्य (absolutive, "having promised"). The verb is implied for the second line. Level 3–4. | utf8/aranya/sarga10/aranyasans10.htm ; aranyaitrans10.htm (the itrans page labels this pair "[4-10-18b, 19a]") ; IIT-K aranya-kanda/10 (a whole verse, numbered 19 there) | **In CE** as a whole verse, **3.9.18** (3009018a/c), same wording |
| A2 | तस्माज्जातोऽहमरुणात् | **3.14.33** | Jaṭāyu → Rāma | First meeting at Pañcavaṭī: Jaṭāyu names his father Aruṇa and his elder brother Sampāti, then says "know me as Jaṭāyu" | `panchavati` · onEnter `ch3.enter_panchavati` (Jaṭāyu's "Do not be alarmed, children…") or the NPC `jatayu` → `ch3.jatayu_meet` | It sets up a link across books. Sampāti appears in `vindhya_search` (`ch4.sampati`: "Jatayu? Who speaks of my younger brother?"). | anuṣṭubh; pāda 1 is a na-vipulā (needs meterNote) | मां विद्धि ("know me as…", imperative of √vid); अग्रजः ("elder-born"); अरुणात् (ablative, "from Aruṇa"); श्येनीपुत्रम्; अरिन्दम (vocative). The opening sandhi तस्माज्जातोऽहमरुणात् is the hardest part. Level 3. | utf8/aranya/sarga14/aranyasans14.htm ; IIT-K aranya-kanda/14 (numbered **3.14.32** there, reading सम्पातिस्तु ममाग्रजः) | **In CE**, 3.13.33, same wording as the site |
| A3 | सुलभाः पुरुषा राजन् | **3.37.2** | Mārīca → Rāvaṇa | Mārīca's first words when Rāvaṇa asks for his help, the opening of the same speech as the existing 3.37.13 | `khara_camp` · event `ch3.khara` onWin, in the Mārīca cutscene. It replaces "Ravana, do not do this! … Listen to me." (mode hear; 3.37.13 follows). If the designers want only one verse per scene, use the optional `panchavati` NPC `hermit` instead (`ch3.panchavati_hermit` already retells Mārīca's warning). | A famous subhāṣita: flatterers are easy to find, but someone who says the unwelcome thing that is good for you, and someone who will hear it, are rare. A strong turning point. | anuṣṭubh, all four pādas pathyā | सुलभ / दुर्लभ (an easy contrasting pair); प्रियवादिनः ("pleasant-talkers"); पथ्य ("wholesome"); वक्ता / श्रोता (nouns of agent). Level 2–3. The easiest verse of the book. | utf8/aranya/sarga37/aranyasans37.htm ; IIT-K aranya-kanda/37 (reads अप्रियस्य **तु** पथ्यस्य) | **In CE**, 3.35.2, same wording as the site (च) |
| A4 | आमन्त्रये जनस्थानं | **3.49.30** | Sītā → the karṇikāra trees of Janasthāna | Sītā, carried off by Rāvaṇa, asks the flowering trees to tell Rāma quickly: "Rāvaṇa is taking Sītā" | `panchavati`, in event `ch3.maricha_deer` onWin after the warp to the empty hut ("Flowers lie scattered on the ground. Sita is gone."). Make the flowers in the hut yard (tiles `f` at 15,8 / 17,8) speak her verse as a set piece. See special moment SM-A2 for a hidden extra. | Sītā gets her own voice at the turning point of the book. The refrain सीतां हरति रावणः is memorable and easy. | anuṣṭubh, all four pādas pathyā | आमन्त्रये (ā + √mantr, 1st singular middle, "I call on you, I bid farewell"); शंसध्वम् (2nd plural imperative of √śaṃs, "tell!"); हरति (present tense for an action now happening). Level 3. | utf8/aranya/sarga49/aranyasans49.htm ; IIT-K aranya-kanda/49 (reads आमन्त्रये **जनस्थाने** कर्णिकारान्**सुपुष्पितान्**) | **In CE**, 3.47.29, same wording as the site |
| A5 | अस्ति कच्चित्त्वया दृष्टा | **3.60.12** | Rāma → a kadamba tree | Rāma, half mad with grief, goes from tree to tree asking each one whether it has seen Sītā | `panchavati`, in event `ch3.maricha_deer` onWin: it replaces the narration "Rama searches every grove and riverbank, calling her name. The trees and the river give no answer." (mode hear, then Lakṣmaṇa's "broken flowers" line). | Rāma's lament to the trees is among the most loved passages in the Araṇya. The wordplay कदम्बप्रिया प्रिया ("my beloved, who loved the kadamba") is easy to explain. | anuṣṭubh, all four pādas pathyā | कच्चित् (question particle, "perhaps…?"); जानीषे (2nd singular middle of √jñā); शंस (imperative, "tell!"); शुभाननाम् ("fair-faced"). The kadamba/priyā pun needs a gloss. Level 3. | utf8/aranya/sarga60/aranyasans60.htm ; IIT-K aranya-kanda/60 (reads **अपि काचित्**त्वया दृष्टा) | **In CE**, 3.58.12, same wording as the site |
| A6 | सर्वत्र खलु दृश्यन्ते | **3.68.24** | Rāma → Lakṣmaṇa | Over the dead Jaṭāyu: everywhere there are good, dharma-following, brave protectors, even among creatures born as animals | `jatayu_glade` · NPC `jatayu` · event `ch3.jatayu`. Add it after Jaṭāyu dies, before "Rama himself performs the last rites…". It can replace or follow Lakṣmaṇa's "He gave his life for Sita." | A quotable moral that also prepares the player for the vanaras of Book 4, who are heroes "born as animals". | anuṣṭubh; pāda 3 is a ma-vipulā (needs meterNote) | खलु (emphatic particle); दृश्यन्ते (passive, "are seen"); शरण्याः ("givers of refuge"); तिर्यग्योनिगतेष्वपि (long compound, "even among those born as animals"). Level 3–4. | utf8/aranya/sarga68/aranyasans68.htm ; IIT-K aranya-kanda/68 (same reading) | **In CE**, 3.64.24, same wording |
| A7 (anchor) | अद्य प्राप्ता तपःसिद्धिः | **3.74.11** | Śabarī → Rāma | Śabarī greets Rāma: "Today, by seeing you, my austerity has reached its goal; today my birth bears fruit, and my teachers are truly honoured." | `shabari_ashrama` · NPC `shabari` · event `ch3.shabari`. It replaces "Now that I have seen you, my life is complete." (mode hear; it could also be the chapter's last quiz). | The required Śabarī moment, in Vālmīki's own words, and the emotional peak of her scene. It has no berry-tasting, which is a later tradition; see alternate A-alt2 for Vālmīki's own fruit verse. | anuṣṭubh, all four pādas pathyā | अद्य repeats ("today… today…"); प्राप्ता (past participle, feminine); तपःसिद्धिः; संदर्शनात् (ablative, "because of seeing"); सफलम्; सुपूजिताः. A sandhi runs across the pāda boundary (तपःसिद्धिस्तव); in the game, end pāda 1 with a visarga. Level 2–3. | utf8/aranya/sarga74/aranyasans74.htm ; aranyaitrans74.htm (same text) ; IIT-K aranya-kanda/74 (verse 11 reads सफलं **तप्तं**, and its verse 12 has सफलं **जन्म**; the two words are swapped compared with the site) | **Not in the CE constituted text.** CE 3.70 goes from 3.70.9 (śaśaṁsa śabarī vṛddhā) straight to 3.70.10 (citrakūṭaṁ tvayi prāpte), so vulgate 3.74.11–13 are absent. The game's 4.3.28–29 are in the same position. |

### Araṇya: full text as fetched, with saṃhitā form and gist

**A1 — 3.10.18cd–19ab** (Rāma → Sītā)
As printed on valmikiramayan.net. The site puts the "|| N" marker after the first half of the following verse, and on this page it misprints the markers as ४-१०-N instead of ३-१०-N.
```
अपि अहम् जीवितम् जह्याम् त्वाम् वा सीते स लक्ष्मणाम् || ४-१०-१८
न तु प्रतिज्ञाम् संश्रुत्य ब्राह्मणेभ्यो विशेषतः |
```
Saṃhitā for the game (as CE 3.9.18 and IIT-K 3.10.19 print it):
अप्यहं जीवितं जह्यां / त्वां वा सीते सलक्ष्मणाम् / न तु प्रतिज्ञां संश्रुत्य / ब्राह्मणेभ्यो विशेषतः
Gist: I would sooner give up my life, or even you, Sītā, and Lakṣmaṇa with you, than break a promise I have made, above all one made to the sages.

**A2 — 3.14.33** (Jaṭāyu → Rāma)
```
तस्मात् जातो अहम् अरुणात् संपातिः च मम अग्रजः |
जटायुर् इति माम् विद्धि श्येनी पुत्रम् अरिंदम || ३-१४-३३
```
Saṃhitā (derived from CE tasmāj jāto 'ham aruṇāt saṁpātiś ca mamāgrajaḥ / jaṭāyur iti māṁ viddhi śyenīputram ariṁdama):
तस्माज्जातोऽहमरुणात् / सम्पातिश्च ममाग्रजः / जटायुरिति मां विद्धि / श्येनीपुत्रमरिन्दम
Gist: I was born of Aruṇa, and Sampāti is my elder brother; know me as Jaṭāyu, son of Śyenī, O tamer of foes.

**A3 — 3.37.2** (Mārīca → Rāvaṇa)
```
सुलभाः पुरुषा राजन् सततम् प्रिय वादिनः |
अप्रियस्य च पथ्यस्य वक्ता श्रोता च दुर्लभः || ३-३७-२
```
Saṃhitā: सुलभाः पुरुषा राजन् / सततं प्रियवादिनः / अप्रियस्य च पथ्यस्य / वक्ता श्रोता च दुर्लभः
Gist: King, people who always say pleasant things are easy to find; someone who speaks the unwelcome but wholesome truth, and someone who listens to it, is rare.

**A4 — 3.49.30** (Sītā → the trees)
```
आमंत्रये जनस्थानम् कर्णिकारान् च पुष्पितान् |
क्षिप्रम् रामाय शंसध्वम् सीताम् हरति रावणः || ३-४९-३०
```
Saṃhitā (as CE 3.47.29): आमन्त्रये जनस्थानं / कर्णिकारांश्च पुष्पितान् / क्षिप्रं रामाय शंसध्वं / सीतां हरति रावणः
Gist: I call on Janasthāna and on you, flowering karṇikāra trees: tell Rāma quickly that Rāvaṇa is carrying Sītā away.

**A5 — 3.60.12** (Rāma → a kadamba)
```
अस्ति कच्चित् त्वया दृष्टा सा कदम्ब प्रिया प्रिया |
कदम्ब यदि जानीषे शंस सीताम् शुभ आननाम् || ३-६०-१२
```
Saṃhitā (as CE 3.58.12): अस्ति कच्चित्त्वया दृष्टा / सा कदम्बप्रिया प्रिया / कदम्ब यदि जानीषे / शंस सीतां शुभाननाम्
Gist: Kadamba, have you perhaps seen my beloved, who loved kadamba flowers? If you know her, tell me of fair-faced Sītā.

**A6 — 3.68.24** (Rāma → Lakṣmaṇa)
```
सर्वत्र खलु दृश्यन्ते साधवो धर्म चारिणः |
शूराः शरण्याः सौमित्रे तिर्यक् योनि गतेषु अपि || ३-६८-२४
```
Saṃhitā (as CE 3.64.24): सर्वत्र खलु दृश्यन्ते / साधवो धर्मचारिणः / शूराः शरण्याः सौमित्रे / तिर्यग्योनिगतेष्वपि
Gist: Lakṣmaṇa, good people who follow dharma, brave and ready to shelter others, are found everywhere, even among creatures born as animals.

**A7 — 3.74.11** (Śabarī → Rāma) — the required anchor
```
अद्य प्राप्ता तपः सिद्धिः तव संदर्शनात् मया |
अद्य मे सफलम् जन्म गुरवः च सुपूजिताः || ३-७४-११
```
Saṃhitā (derived from the site's words; IIT-K writes तपस्सिद्धिस्तव संदर्शनान्मया … सफलं तप्तं): अद्य प्राप्ता तपःसिद्धिः / तव संदर्शनान्मया / अद्य मे सफलं जन्म / गुरवश्च सुपूजिताः
Gist: Today, by seeing you, I have reached the goal of my austerities; today my life has borne fruit, and my teachers are truly honoured.

### Araṇya alternates (all fetched from the site)
- **A-alt1 — 3.14.3** (narrator, then Jaṭāyu → Rāma). A simpler option for the Pañcavaṭī meeting that matches the game's line "a friend of your father". All pādas pathyā. CE 3.13.3, same wording; IIT-K 3.14.3, same.
  `स तौ मधुरया वाचा सौम्यया प्रीणयन्न् इव | उवाच वत्स माम् विद्धि वयस्यम् पितुर् आत्मनः || ३-१४-३`
  Saṃhitā: स तौ मधुरया वाचा / सौम्यया प्रीणयन्निव / उवाच वत्स मां विद्धि / वयस्यं पितुरात्मनः. Gist: In a sweet, gentle voice, as if to please them, he said: "Child, know me as a friend of your father."
- **A-alt2 — 3.74.17cd–18ab** (Śabarī → Rāma: the forest fare). This is Vālmīki's only mention of the fruits. She gathered many kinds of forest food on the banks of the Pampā for Rāma; nothing is said about tasting them. On the site it crosses a verse boundary (the itrans page shows it as 17 + 18a). It is a **whole verse in CE (3.70.13)** and in **IIT-K (3.74.17)**. All pādas pathyā. It matches the game's existing line "Please accept these fruits. I gathered them from the forest for you."
  `मया तु विविधम् वन्यम् संचितम् पुरुषर्षभ || ३-७४-१७ / तव अर्थे पुरुषव्याघ्र पम्पायाः तीर संभवम् |`
  Saṃhitā (as IIT-K): मया तु विविधं वन्यं / संचितं पुरुषर्षभ / तवार्थे पुरुषव्याघ्र / पम्पायास्तीरसंभवम्. Gist: Bull among men, for your sake I have gathered many kinds of forest food that grow on the banks of the Pampā.
- **A-alt3 — 3.49.31** (Sītā → the Godāvarī). The same refrain addressed to the river. The site reads `हंस सारस संघुष्टाम् वन्दे गोदावरीम् नदीम् | क्षिप्रम् रामाय शंस त्वम् सीताम् हरति रावणः || ३-४९-३१`. CE 3.47.31 reads śaṁsadhvaṁ, and IIT-K (numbered 3.49.32) reads हंसकारण्डवाकीर्णां. Gist: I bow to the Godāvarī, loud with geese and cranes: tell Rāma quickly that Rāvaṇa is carrying Sītā away.
- **A-alt4 — 3.60.20** (Rāma → a karṇikāra): `अहो त्वम् कर्णिकार अद्य पुष्पितः शोभसे भृशम् | कर्णिकार प्रियाम् साध्वीम् शंस दृष्टा यदि प्रिया || ३-६०-२०`. It echoes A4 (see SM-A2). **Not found in the CE e-text** (the CE search found karṇikāra only at 3.40.20 and 3.47.29). IIT-K reads सुपुष्पैश्शोभसे … कर्णिकारप्रिया साध्वी. Gist: Karṇikāra, you shine today in full flower; if you have seen my good wife, who loved karṇikāras, tell me.
- **A-alt5 — 3.60.17** (Rāma → an aśoka). A pun: the aśoka is the "griefless" tree that removes grief (śoka), and Sītā will later be held in an aśoka grove. `अशोक शोक अपनुद शोक उपहत चेतनम् | त्वन् नामानम् कुरु क्षिप्रम् प्रिया संदर्शनेन माम् || ३-६०-१७`. CE 3.58.17 reads °cetasaṁ (the site and its sandhi form read °चेतनम्). Pāda 1 is a bha-vipulā. Level 4.
- **A-alt6 — 3.10.4** (Rāma → Sītā), a whole-verse option for the Daṇḍaka scene if a verse that crosses a boundary is unwanted: `ते च आर्ता दण्डकारण्ये मुनयः संशित व्रताः | माम् सीते स्वयम् आगम्य शरण्याः शरणम् गताः || ४-१०-४` (the site's marker misprint again). IIT-K 3.10.4 has the same wording. CE: not checked. Gist: Those suffering sages of the Daṇḍaka forest, firm in their vows, came to me themselves, Sītā, and took refuge with me.
- **A-alt7 — 3.74.8** (Rāma → Śabarī: a greeting of कच्चित् questions): `कच्चित् ते निर्जिता विघ्नाः कच्चित् ते वर्धते तपः | कच्चित् ते नियतः कोप आहारः च तपोधने || ३-७४-८`. CE 3.70.7, where the verse division differs. IIT-K reads **क्रोध** आहारश्च. Easy and repetitive. Level 2.
- **FLAGGED, do not use as is — 3.67.24** ("राज्यं भ्रष्टं वने वासः…", Rāma's list of his losses over Jaṭāyu). The site prints `राज्यम् भ्रष्टम् वने वासः सीता नष्टा मृते द्विजः | ईदृशी इयम् मम अलक्ष्मीः दहेत् अपि पावकम् || ३-६७-२४`. The itrans page confirms "mR^ite" and "dahet api paavakam". Pāda d is then **7 syllables** (दहेदपि पावकम्). CE 3.63.21 has different wording (rājyād bhraṁśo vane vāsaḥ…). Use it only if someone resolves the reading against a print edition.

---

## BOOK 4 — KIṢKINDHĀ-KĀṆḌA (7 main + alternates)

URL pattern: https://www.valmikiramayan.net/utf8/kish/sargaN/kishkindhasansN.htm (Devanagari) and …/kishkindhaitransN.htm.

| # | First pāda | Citation | Speaker → listener | Story moment | Placement in game | Why chosen | Metre | Difficulty notes | Source URL(s) | CE status |
|---|---|---|---|---|---|---|---|---|---|---|
| K1 | रोचते यदि मे सख्यं | **4.5.11** | Sugrīva → Rāma | The pact of friendship: "If my friendship pleases you, here is my arm stretched out; let hand clasp hand and let a firm bond be tied." Hanumān then kindles the fire (4.5.13–16). | `rishyamuka` · NPC `sugriva` (24,3) · event `ch4.sugriva_alliance`. It comes after "Sugriva welcomes the princes warmly" and before the fire is lit at the fire altar `X` (21,3). See SM-K2. | The friendship by the fire is one of the best-known moments of the book. This is the verse in which the friendship is offered. | anuṣṭubh, all four pādas pathyā | रोचते (√ruc, "is pleasing", with a genitive or dative); प्रसारितः (past participle); गृह्यताम् / बध्यताम् (passive imperatives); मर्यादा ("compact, bond"). Level 3. | kish/sarga5/kishkindhasans5.htm ; kishkindhaitrans5.htm (confirms "me" and "badhyataam") ; IIT-K kishkindha-kanda/5 (numbered **4.5.12**, reads यदि **वा**) | **In CE**, 4.5.12, with variants: rocate yadi **vā** sakhyaṁ … maryādā **vadhyatāṁ** dhruvā |
| K2 | स विसृष्टो बलवता | **4.12.3** | Narrator | Rāma's single arrow pierces the seven sāla trees and the hillside and goes into the earth. Sugrīva is convinced that Rāma can face Vālī. | `rishyamuka`: a new set piece after `ch4.alliance`. Sugrīva doubts and shows Rāma the sālas; the player looses the arrow. Plant 7 sāla trees in a row in the wooded south-east (rows 17–19). See SM-K1. | It was asked for, and it is one of the most visual moments in the epic. It is the turning point that leads to Vālī's fall. | anuṣṭubh; pāda 1 is a na-vipulā (needs meterNote) | विसृष्टः (past participle of vi + √sṛj); बलवता (instrumental, "by the mighty one"); स्वर्णपरिष्कृतः ("decked with gold"); भित्त्वा (absolutive of √bhid); विवेश (perfect of √viś); ह (particle). Level 3–4. | kish/sarga12/kishkindhasans12.htm ; kishkindhaitrans12.htm ("giri prastham") ; IIT-K kishkindha-kanda/12 (same wording) | **In CE**, 4.12.3, but reads giri**prasthe** (locative) where the site and IIT-K have गिरिप्रस्थम् |
| K3 | देशकालौ भजस्वाद्य | **4.22.20** | Vālī (dying) → Aṅgada | Vālī's last advice to his son: honour place and time, bear what is pleasant and unpleasant, endure joy and sorrow in their season, and live under Sugrīva's rule | `vindhya_search` · NPC `angada_v` · event `ch4.angada_despair` (else branch). Aṅgada, ready to fast to death for fear of Sugrīva, remembers his father's words, which is poignant at that moment. Option: `kishkindha_caves` NPC `angada` · `ch4.council`, after "I am Angada, son of Vali". | The user asked for "Vālī's words". It gives Vālī a dignified voice even though the game summarises his death. The famous advice also gives Aṅgada a character arc. | anuṣṭubh, all four pādas pathyā | देशकालौ and प्रियाप्रिये (dual dvandvas); भजस्व (imperative, middle); क्षममाणः (present participle, middle, of √kṣam); सुखदुःखसहः; वशगः ("obedient to"). The compounds are transparent. Level 3–4. | kish/sarga22/kishkindhasans22.htm ; IIT-K kishkindha-kanda/22 (same wording) | **In CE**, 4.22.20, same wording |
| K4 | एषा घर्मपरिक्लिष्टा | **4.28.7** | Rāma → Lakṣmaṇa | Rāma's lament in the rains on Mālyavān: the earth, scorched by summer and drenched by new rain, gives off vapour like Sītā burning with grief | `kishkindha_caves` · trigger `ch4.arrive_kishkindha`. It goes after "The rains came and went. Rama waited out the monsoon on a nearby hill…", with a brief rain overlay (mode hear). | It was asked for. The great description of the rains in 4.28 ties nature to Sītā in this single, clear simile. | anuṣṭubh, all four pādas pathyā | घर्मपरिक्लिष्टा and नववारिपरिप्लुता (two medium compounds); सीतेव = सीता + इव (a sandhi worth teaching); शोकसंतप्ता; बाष्पम् ("vapour, tears"); विमुञ्चति. Level 4. The hardest of the seven. | kish/sarga28/kishkindhasans28.htm (the page misprints its markers as ३-२८-N) ; IIT-K kishkindha-kanda/28 (same wording) | **In CE**, 4.27.7. The fetched e-text line reads "**dharma**parikliṣṭā" (probably an e-text or tool slip for gharma); the rest is the same. |
| K5 | अनेन त्वां हरिश्रेष्ठ | **4.44.13** | Rāma → Hanumān | Rāma gives Hanumān his name-engraved ring: "By this sign, best of monkeys, Janaka's daughter will see that you come from me, and will not be afraid." | `kishkindha_caves` · NPC `angada` · event `ch4.council`. It replaces "If you find her, give her this. She will know you come from me." (mode hear), just before `{give: kusha_mudrika}`. The item `kusha_mudrika` could cite 4.44.12 (alt K-alt5) in its description. | It was asked for ("Rāma's ring"), and it sets up Sundara 5.36 (the ring is already a key item in ch5). | anuṣṭubh, all four pādas pathyā | अनेन चिह्नेन (instrumental, "by this sign"); मत्सकाशात् ("from my presence"); अनुप्राप्तम् ("arrived"); अनुद्विग्ना ("not alarmed"); अनुपश्यति. The three अनु- words make it a good lesson on prefixes. Level 3–4. | kish/sarga44/kishkindhasans44.htm (the site prints जनकाअत्मजा, a display glitch for जनक-आत्मजा) ; IIT-K kishkindha-kanda/44 (same wording) | **In CE**, 4.43.12, same wording |
| K6 | इतो द्वीपे समुद्रस्य | **4.58.20** | Sampāti → the vanaras | The search parties find their first real clue: Laṅkā lies on an island, a full hundred yojanas across the sea, built by Viśvakarman | `vindhya_search` · NPC `sampati` (31,14) · event `ch4.sampati`. It replaces "She is held in Lanka, an island a hundred yojanas across this ocean…" (mode hear). | It covers the search-parties arc and puts a verse on `vindhya_search`, which otherwise has none. It is the turning point from despair to hope, and the verse names Laṅkā for the first time in the player's book. | anuṣṭubh, all four pādas pathyā | इतः ("from here"); द्वीपे (locative); सम्पूर्णे शतयोजने (locative of distance); निर्मिता विश्वकर्मणा (past participle with an instrumental agent). The sandhi तस्मिँल्लङ्का (n + l) is hard; the game could show it, or note it. Level 3. | kish/sarga58/kishkindhasans58.htm ; IIT-K kishkindha-kanda/58 (reads इतो **द्वीपस्**समुद्रस्य … तस्मिन्लङ्कापुरी) | **In CE**, 4.57.20, same wording as the site (CE prints tasmim̐l laṅkā) |
| K7 (anchor) | उत्तिष्ठ हरिशार्दूल | **4.66.36** | Jāmbavān → Hanumān | On Mahendra, Jāmbavān rouses Hanumān: "Rise, tiger among monkeys, leap across the great ocean, for your power of motion is the highest of all beings." | `mahendra_hill` · NPC `angada_m` · event `ch4.jambavan_speech`. It replaces "I remind you now. Rise, Hanuman! Cross the ocean and find Sita!" (mode hear, then the growth animation in SM-K3; this verse can be the chapter's final quiz). | The required anchor. It echoes the Bāla verse already in the game, उत्तिष्ठ **नर**शार्दूल (shlokas-1.json), with the same formula "rise, X-tiger". That makes a good learning callback. | anuṣṭubh, all four pādas pathyā | उत्तिष्ठ (imperative); हरिशार्दूल (vocative compound); लङ्घयस्व (causative imperative, middle, "leap over"); महार्णवम्; परा (feminine, "highest"); गतिः ("course, power of movement"); हनुमन् या becomes हनुमन्या in sandhi. The second line needs a gloss. Level 3. | kish/sarga66/kishkindhasans66.htm ; IIT-K kishkindha-kanda/66 (same wording) | **In CE**, 4.65.34 (4065034a/c), same wording |

### Kiṣkindhā: full text as fetched, with saṃhitā form and gist

**K1 — 4.5.11** (Sugrīva → Rāma)
```
रोचते यदि मे सख्यम् बाहुः एष प्रसारितः |
गृह्यताम् पाणिना पाणिः मर्यादा बध्यताम् ध्रुवा || ४-५-११
```
Saṃhitā (derived from the site's words; CE and IIT-K have वा for मे): रोचते यदि मे सख्यं / बाहुरेष प्रसारितः / गृह्यतां पाणिना पाणिः / मर्यादा बध्यतां ध्रुवा
Gist: If my friendship pleases you, here is my arm held out; take my hand in yours, and let a firm bond be made between us.

**K2 — 4.12.3** (narrator)
```
स विसृष्टो बलवता बाणः स्वर्ण परिष्कृतः |
भित्त्वा सालान् गिरि प्रस्थम् सप्त भूमिम् विवेश ह || ४-१२-३
```
Saṃhitā (as IIT-K): स विसृष्टो बलवता / बाणः स्वर्णपरिष्कृतः / भित्त्वा सालान्गिरिप्रस्थं / सप्त भूमिं विवेश ह
Gist: Loosed by the mighty Rāma, the gold-decked arrow tore through the seven sāla trees and the mountainside and sank into the earth.

**K3 — 4.22.20** (Vālī → Aṅgada)
```
देश कालौ भजस्व अद्य क्षममाणः प्रिय अप्रिये |
सुख दुःख सहः काले सुग्रीव वशगो भव || ४-२२-२०
```
Saṃhitā (as CE and IIT-K): देशकालौ भजस्वाद्य / क्षममाणः प्रियाप्रिये / सुखदुःखसहः काले / सुग्रीववशगो भव
Gist: From now on respect the right place and time, bear both pleasant and unpleasant things, endure joy and sorrow as they come, and live obedient to Sugrīva.

**K4 — 4.28.7** (Rāma → Lakṣmaṇa)
```
एषा घर्म परिक्लिष्टा नव वारि परिप्लुता |
सीता इव शोक संतप्ता मही बाष्पम् विमुंचति || ३-२८-७   ← the page's marker misprint
```
Saṃhitā (as IIT-K): एषा घर्मपरिक्लिष्टा / नववारिपरिप्लुता / सीतेव शोकसंतप्ता / मही बाष्पं विमुञ्चति
Gist: This earth, worn out by the summer heat and now soaked by fresh rain, gives off vapour like Sītā burning with grief and shedding tears.

**K5 — 4.44.13** (Rāma → Hanumān)
```
अनेन त्वाम् हरिश्रेष्ठ चिह्नेन जनकाअत्मजा |
मत् सकाशात् अनुप्राप्तम् अनुद्विग्ना अनुपश्यति || ४-४४-१३
```
Saṃhitā (as CE and IIT-K): अनेन त्वां हरिश्रेष्ठ / चिह्नेन जनकात्मजा / मत्सकाशादनुप्राप्तम् / अनुद्विग्नानुपश्यति
Gist: Best of monkeys, by this token Janaka's daughter will see that you have come from me, and she will not be afraid of you.

**K6 — 4.58.20** (Sampāti → the vanaras)
```
इतो द्वीपे समुद्रस्य संपूर्णे शत योजने |
तस्मिन् लंका पुरी रम्या निर्मिता विश्वकर्मणा || ४-५८-२०
```
Saṃhitā (as CE 4.57.20; pāda 3 could also be shown unjoined as तस्मिन् लङ्का पुरी रम्या): इतो द्वीपे समुद्रस्य / सम्पूर्णे शतयोजने / तस्मिँल्लङ्का पुरी रम्या / निर्मिता विश्वकर्मणा
Gist: From here, on an island in the ocean a full hundred yojanas away, stands the lovely city of Laṅkā, built by Viśvakarman.

**K7 — 4.66.36** (Jāmbavān → Hanumān) — the required anchor
```
उत्तिष्ठ हरि शार्दूल लंघयस्व महा अर्णवम् |
परा हि सर्व भूतानाम् हनुमन् या गतिः तव || ४-६६-३६
```
Saṃhitā (as CE 4.65.34 and IIT-K): उत्तिष्ठ हरिशार्दूल / लङ्घयस्व महार्णवम् / परा हि सर्वभूतानां / हनुमन्या गतिस्तव
Gist: Rise, tiger among monkeys, and leap across the great ocean, Hanumān, for your speed and reach surpass those of every living being.

### Kiṣkindhā alternates (all fetched from the site)
- **K-alt1 — 4.30.81** (Rāma → Sugrīva, carried by Lakṣmaṇa): "The path by which Vālī went when he was killed has not closed; keep to the agreement, Sugrīva, and do not follow Vālī's path." Famous, simple (Level 2–3), and all pādas pathyā. Placement: `kishkindha_caves` NPC `elder` → `ch4.vanara_elder` (who already tells of Lakṣmaṇa's anger).
  `न स संकुचितः पंथा येन वाली हतो गतः | समये तिष्ठ सुग्रीव मा वालि पथम् अन्वगाः || ४-३०-८१`. Saṃhitā: न स संकुचितः पन्था / येन वाली हतो गतः / समये तिष्ठ सुग्रीव / मा वालिपथमन्वगाः. CE 4.29.48 (reads **na ca** saṁkucitaḥ), repeated at CE 4.33.18.
- **K-alt2 — 4.66.37** (Jāmbavān → Hanumān): `विषाण्णा हरयः सर्वे हनुमन् किम् उपेक्षसे | विक्रमस्व महावेग विष्णुः त्रीन् विक्रमान् इव || ४-६६-३७`. Gist: All the monkeys are in despair; why do you hold back, Hanumān? Stride out, swift one, as Viṣṇu took his three strides. CE 4.65.35 (spelled viṣāṇṇā); IIT-K reads विषण्णा … महावेगो. All pādas pathyā.
- **K-alt3 — 4.66.2** (Jāmbavān → Hanumān): `वीर वानर लोकस्य सर्व शास्त्र विदाम् वर | तूष्णीम् एकांतम् आश्रित्य हनुमन् किम् न जल्पसि || ४-६६-२`. It matches the game's "Why are you silent, Hanuman?". CE 4.65.2, same wording. All pādas pathyā.
- **K-alt4 — 4.58.31** (Sampāti): `इह स्थः अहम् प्रपश्यामि रावणम् जानकीम् तथा | अस्माकम् अपि सौपर्णम् दिव्यम् चक्षुर् बलम् तथा || ४-५८-३१`. Gist: From right here I can see Rāvaṇa and Jānakī; we birds of Suparṇa's race have divine eyesight. It matches the game's line "my eyes are still the sharpest". CE 4.57.28cd (division differs); IIT-K 4.58.30 reads सौवर्णं.
- **K-alt5 — 4.44.12** (narrator: the ring itself), for the description of the `kusha_mudrika` item: `ददौ तस्य ततः प्रीतः स्व नामांक उपशोभितम् | अंगुलीयम् अभिज्ञानम् राजपुत्र्याः परंतपः || ४-४४-१२`. CE 4.43.11, same wording. All pādas pathyā.
- **K-alt6 — 4.22.23** (Vālī → Aṅgada): `न च अतिप्रणयः कार्यः कर्तव्यो अप्रणयः च ते | उभयम् हि महादोषम् तस्मात् अंतर दृक् भव || ४-२२-२३`. Gist: Show neither too much affection nor too little; both are serious faults, so keep to the middle. CE: not checked.
- **K-alt7 — 4.28.2** (Rāma: the rains have come; an easier rains verse, Level 2–3): `अयम् स कालः संप्राप्तः समयो अद्य जल आगमः | संपश्य त्वम् नभो मेघैः संवृतम् गिरि संनिभैः || ३-२८-२` (marker misprint as above). Pāda 1 is a ma-vipulā. IIT-K, same wording. CE: not checked.

---

## Special moments

### Araṇya
**SM-A1 — The river says nothing, and the deer point south** (main path; it replaces Lakṣmaṇa's "marks leading south" line).
Grounding: Araṇya sarga 64 on valmikiramayan.net. In 3.64.7–9 the Godāvarī, asked by Rāma, does not answer: "न च सा हि अवदत् सीताम् पृष्टा रामेण शोचता". The page says she keeps silent out of fear of Rāvaṇa. In 3.64.17–19 the deer rise together, face south and show the sky ("दक्षिण अभिमुखाः सर्वे दर्शयन्तो नभः स्थलम्"), then run south, looking back at Rāma.
The player sees: at the empty hut on `panchavati`, examining the river (rows 18–22) gives "The Godāvarī flows on and says nothing". A small herd of ordinary deer (not the golden-deer sprite) then gathers near the hut. When the player talks to them, they all turn to face south, raise their heads to the sky, run to the bridge (`H`, column 25) and stop to look back. Following them opens the south warp to `jatayu_glade`.
Note: the verse numbers come from the fetch tool's summary of that page, with short excerpts. Fetch the full text of 3.64.7–19 before writing the scene.

**SM-A2 — "The karṇikāras remember"** (hidden or optional echo).
Grounding: 3.49.30 (A4). As she is carried off, Sītā asks the flowering karṇikāras to tell Rāma. In 3.60.20 (A-alt4) Rāma later asks a karṇikāra whether it has seen his beloved, "who loved karṇikāras".
The player sees: after the abduction, one flowering tree beside the hut glows faintly. The first examination plays Sītā's verse as a faint echo. Coming back after A5 (Rāma's tree lament) plays Rāma's 3.60.20 in reply, and the verse book links the two as a pair ("she asked the trees; he asked the trees"). Caveat: 3.60.20 is vulgate only (not found in CE). Alternatively, pair A4 with A5 (the kadamba), which is in CE.

**SM-A3 — Śabarī's ascent** (main path animation, plus a hidden detail).
Grounding: 3.74.32–34 as fetched: "हुत्वा आत्मानम् हुत अशने | ज्वलत् पावक संकाशा स्वर्गम् एव जगाम सा", then "दिव्यम् आभरण संयुक्ता … विराजयन्ती तम् देशम् विद्युत् सौदामिनी यथा". She offers herself into the fire, becomes bright as blazing fire, appears in divine ornaments, garlands and clothes, and lights up the place like a flash of lightning. In 3.74.35 she goes to the realm where her teachers dwell.
The player sees: the fire altar on `shabari_ashrama` (`X` at 25,16) flares, and Śabarī's sprite changes to a radiant form and rises in a lightning-white flash. This fits the game's existing text ("enters the sacred fire and rises, radiant").
Hidden detail grounded in 3.74.26–27: "कृत अभिषेकैः तैः न्यस्ता वल्कलाः पादपेषु इह | अद्य अपि न विशुष्यन्ति" (the sages' bark cloths, hung on the trees after their bath, have still not dried) and "पुष्पैः कुवलयैः सार्धम् म्लानत्वम् न तु यान्ति" (their offerings and lotuses never wither). A tree near the hut can carry still-wet bark cloths; examining it gives this detail. The NPC `ch3.matanga_disciple` already mentions flowers that never fade.

**Hidden cross-book link — Jaṭāyu ↔ Sampāti.** A2 (3.14.33) has Jaṭāyu name "Sampāti, my elder brother". In Book 4, when Sampāti asks "Jatayu? Who speaks of my younger brother?" (`ch4.sampati`), the A2 card in the verse book could glow ("you heard of him at Pañcavaṭī").

### Kiṣkindhā
**SM-K1 — One arrow, seven sāla trees** (main-path set piece on `rishyamuka` after the alliance; the returning arrow is an extra flourish).
Grounding: 4.12.1–5 as fetched. 4.12.2: Rāma takes up the bow and a single arrow, aims at the sāla and shoots, filling the directions with sound. 4.12.3 (K2): it pierces the seven sālas and the hillside and enters the earth. 4.12.4: "सायकः तु मुहूर्तेन सालान् भित्त्वा महाजवः | निष्पत्य च पुनः तूर्णम् तम् एव प्रविवेश ह". In a moment it comes back up and re-enters "that same" one. The site's gloss supplies "the quiver", and IIT-K reads स्वतूणीं प्रविवेश ह, "entered its own quiver". 4.12.5: Sugrīva is astonished at seeing the seven trees pierced.
The player sees: seven sāla trees in a line; one press of A; a gold streak passes through all seven and hits the hill with a dust burst. A beat later the arrow flies back out of the ground into Rāma's quiver, and Sugrīva's sprite does a "!" jump. This is the moment the alliance is proved.

**SM-K2 — Friendship by the fire** (main path, interactive).
Grounding: Kiṣkindhā sarga 5. From the site's itrans page: 4.5.14 (labelled 13b–15a there), "diipyamaanam tato vahnim puShpaiH abhyarcya satkR^itam": Hanumān drops his mendicant disguise, makes fire with two fire-sticks, and honours the blazing fire with flowers. 4.5.15 (15b–16a): "tato agnim diipyamaanam tau cakratuH ca pradakShiNam": Rāma and Sugrīva walk around the fire. 4.5.16: "सुग्रीवो राघवः च एव वयस्यत्वम् उपागतौ", and so they become friends. K1 (4.5.11) is the offer just before.
The player sees: Hanumān rubs two sticks at the altar `X` (21,3) and a flame catches. The player then walks Rāma once clockwise around the altar beside Sugrīva (a short pradakṣiṇa path), and the two sprites clasp hands as K1 plays.

**SM-K3 — Hanumān grows as he is praised** (main path; the game already says "He grows and grows").
Grounding: 4.66.38: "ततः कपीनाम् ऋषभेण चोदितः … चकार रूपम् महत् आत्मनः तदा". Urged on by Jāmbavān, the Wind's son took on a huge form. 4.67.1–2: the vanaras see him swell to cross a hundred yojanas, drop their grief, roar and praise him. 4.67.4: "संस्तूयमानो हनुमान् व्यवर्धत महाबलः | समाविद्ध्य च लांगूलम् हर्षात् बलम् उपेयिवान्". Being praised, mighty Hanumān grew; he lashed his tail and in his joy came into his strength. 4.67.3 adds a simile: the vanaras watch him as beings watched Nārāyaṇa intent on his three strides.
The player sees: after K7, the four vanaras on the beach (Gaja, Gavākṣa, Śarabha, Mainda; their roll-call NPCs already exist) each cheer in turn. Hanumān's sprite grows a step with each cheer, then lashes his tail. As an optional extra, when he reaches full size his shadow on the cliff briefly takes the outline of Vāmana's stride (4.66.37 and 4.67.3).
Hidden learning echo: K7's उत्तिष्ठ हरिशार्दूल pairs with the Bāla verse already in the game, उत्तिष्ठ नरशार्दूल. The verse book could mark the shared pattern "uttiṣṭha ___-śārdūla" ("Rise, tiger among ___").

---

## Could not verify or still open
1. **Fetch method.** All page text came through WebFetch, which runs a model over the page; curl was blocked. Every main verse was matched against a second rendering: CE (A1–A6, K1–K7), IIT-K (all 14), and the site's itrans page (A1, A7, K1, K2). Small character choices in the site's Devanagari, such as anusvāra versus class nasal (लंघयस्व, संचितम्), are as the tool reported them.
2. **A7, 3.74.11 (Śabarī)** is not in the CE constituted text. IIT-K swaps सफलं तप्तं and सफलं जन्म between verses 11 and 12 compared with the site. I used the site's reading.
3. **CE readings that differ from the site:** K1 (vā / vadhyatāṁ), K2 (giriprasthe), K4 (the fetched e-text reads dharma- for gharma-), K-alt1 (na ca). For A3, A4 and A5, IIT-K differs from the site but CE agrees with it.
4. **3.67.24 is flagged:** the site's text has a 7-syllable pāda, and CE has other wording. It is excluded.
5. **Site numbering misprints:** the Araṇya sarga 10 page prints markers as ४-१०-N, the Kiṣkindhā sarga 28 page as ३-२८-N, and Kiṣkindhā sarga 22 has "४-२२-४-२२-६" at verse 6. In all three cases the verse identity is clear from the page title and content.
6. **Verses that cross a verse boundary** (A1 and A-alt2) follow the precedent of 4.6.22cd–23ab. In CE, both are single verses (3.9.18 and 3.70.13).
7. **SM-A1 (sarga 64)** verse numbers come from the tool's summary with short excerpts. The full verses were not fetched.
8. **CE status not checked:** A-alt6, K-alt6, K-alt7. For 3.74.31 (Rāma's "arcito 'haṁ…", not proposed) the CE search found no match.
9. **Not consulted:** wisdomlib (Shastri translation). vedapath's per-verse URLs mostly failed with client errors, but its sarga pages loaded and were used.
10. **Gists** are my own one-line paraphrases, not quotations of any translation.
