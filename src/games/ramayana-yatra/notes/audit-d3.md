# audit-d3: Sanskrit audit of `content/sa-dialogue-3.json` (Sundara + Yuddha + enemy intro/defeat lines)

Auditor: au-d3 (model; brief v0.4.2). Date: 2026-11-12. Not a human sign-off.

**Scope.** I read the `sa` field of all 297 entries against its `en` and `ctx`, the speaker and portrait in `story-ch5.json` / `story-ch6.json`, and the enemy definitions in `defs.json` / `names.json` (all read-only). I checked accuracy, meaning, ease and register. Earlier reviews (`sa-rev-b.md` for this file, `sa-rev-c.md`, `kc-rev.md`) were read first. Their settled choices are not re-opened: the shrine is मन्दिरम्, प्रतीक्ष्, choice prompts are loṭ + वा, `{g:वत्स|वत्से}`, मास्तु, चालकः and तक्षकः.

**Edits.** Only `sa` changed. `en`, `ctx` and `models` are unchanged (verified by diff against the backup `/home/claude/scratch/au-d3/sa-dialogue-3.orig.json`). No models were added. Every new word was checked with `sa-ui/words.ts`. `#N` is the 0-based index in `entries`.

## Counts

| | n |
|---|---|
| strings checked | 297 |
| fixed (accuracy / meaning) | 3 (#36, #119, #126) |
| simplified / clarified (ease, consistency) | 4 (#11, #103, #166, #194) |
| flagged for a human | 9 new items (plus the earlier open items, which I re-checked and confirmed below) |

**Gates:**
- `check.ts content/sa-dialogue-3.json` → 297/297, 0 problems. Levels: L1 2447 · L2 631 · L3 181 · L4 1 (धनुः, a permitted story term). L3 went up by 1 because of विश्रान्ताः in #11.
- Required tests (sambhashana, sa-ui, katha-content, grammar-sa, sa-battle) → **48/48 pass**.

## Changes

| # · English (short) | before → after | why |
|---|---|---|
| #36 · "A fearsome figure bars the gate…" | तां दृष्ट्वा **भयं भवति**। → तां दृष्ट्वा **सर्वे भीताः भवन्ति**। | ktvā needs the same agent as the main verb (समानकर्तृकयोः पूर्वकाले, 3.4.21). In the old line "fear" became the one who sees. Samskrita Bharati teaches exactly this rule, so the line should model it. भीत is L1 and is already used in #106, #115 and #191. |
| #119 · "…camped on the southern shore of the ocean" | …वानराः **समुद्रस्य दक्षिणे तीरे** स्थितवन्तः। → …वानराः **दक्षिणस्य समुद्रस्य तीरे** स्थितवन्तः। | "समुद्रस्य दक्षिणे तीरे" literally means the sea's southern shore, which is Laṅkā's side. The army camps on the mainland shore of the southern sea (Vālmīki's दक्षिणः समुद्रः). Same length; दक्षिणस्य is L1. |
| #126 · "The vanara army covers the southern shore…" | वानराः **समुद्रस्य दक्षिणे तीरे** सर्वत्र सन्ति… → वानराः **दक्षिणस्य समुद्रस्य तीरे** सर्वत्र सन्ति… | Same fix as #119. Lanka is still across the water (#128). |
| #11 · "Your party is fully rested. …" | **सर्वे पुनः स्वस्थाः सन्ति।** … → **सर्वे सम्यक् विश्रान्ताः।** … | The same English sentence is "सर्वे सम्यक् विश्रान्ताः।" in file 2. स्वस्थ means "healthy" and विश्रान्त means "rested", so one wording now serves the same game message everywhere. |
| #103 · "A few words slipped…" | **अल्पाः** शब्दाः सम्यक् न आगताः। → **के अपि** शब्दाः सम्यक् न आगताः। | अल्पाः शब्दाः can be read as "few words (came right)". के अपि शब्दाः is file 1's wording for "some words" in the same feedback (के अपि शब्दाः … उचिते स्थाने न सन्ति). |
| #166 · "Rama sent me … with one last offer" | अहं **तस्य** अन्तिमं वचनम् उक्तवान्… → अहं **रामस्य** अन्तिमं वचनम् उक्तवान्… | तस्य could point to Rāvaṇa, the nearer referent in the sentence before. The offer is Rāma's, so the name is now given. Same length. |
| #194 · "Even he told Ravana that taking Sita was wrong" | …तत् **उचितं न**। → …तत् **न उचितम्**। | Normal order for a learner, as rev-b fixed "समीचीनं न" elsewhere. Same words. |

## Checked and kept (so the next reader need not redo them)

- **Participle and pronoun agreement** is correct throughout:
  - feminine ktavatu: आगतवती, दृष्टवती, उक्तवती, प्रतीक्षितवती, याचितवती, ज्वलितवती;
  - mixed-gender pairs: सीता रामः च … मिलितवन्तौ;
  - śatṛ forms: इच्छन्, गर्जन्तः, तिष्ठन्, उद्गच्छन्, पतन्तम्;
  - tavya: श्लोकाः … कर्तव्याः, दूतः न हन्तव्यः.
- **Every other ktvā/lyap** has the same agent as its main verb (#10, 23, 81, 82, 102, 103, 156, 176, 180, 183, 223, 230, 243, 274).
- **Ātmanepada verbs** are right: परीक्षते, वर्धते, कम्पते, शोभते, युध्यते/युध्यताम्/युध्यध्वम्, प्रतीक्षे/प्रतीक्षिष्ये, आरभामहे/आरभामहै, लभताम्, निवर्तस्व, शेष्व, प्रयतस्व, योत्स्यते, जायते, प्रबुध्यते.
- **Case government** is right:
  - परितः + acc.;
  - उपरि / पृष्ठतः / पार्श्वे + gen.;
  - बहिः + abl.;
  - पूर्वम् + abl.;
  - समानः + instr.;
  - स्निह् + loc.;
  - निर्धारण locative (युष्मासु एकः अपि, वानरेषु उत्तम).
- **Register:**
  - Hanumān, Sītā and Rāma are addressed with भवान्/भवती, देवि, हनुमन्.
  - Agastya, Vasiṣṭha, Suṣeṇa and Vālmīki use त्वम्/वत्स.
  - Enemies use त्वम्.
  - Every line that addresses or describes the player is either neutral or uses `{g:}`. The Child (#257, दत्तवान्) has a boy sprite (śikhā tuft), so the masculine form is right.
- **Vālmīki checks:**
  - Surasā was sent by the gods; Hanumān shrinks to thumb size.
  - Laṅkā is struck with the left fist, and Brahmā's prophecy follows.
  - The anirveda verse.
  - Trijaṭā's dream; she tells the others to ask Sītā's forgiveness.
  - The kiṅkaras and others are sent first, then Akṣa.
  - Hanumān is bound by the brahmāstra and accepts it.
  - Vibhīṣaṇa's plea that an envoy must not be killed.
  - Sītā's prayer to Agni.
  - Vibhīṣaṇa's arrival, Sugrīva's suspicion, and Rāma's vow (सकृत्, यदि वा रावणः स्वयम्).
  - Three days of prayer to the Ocean; Nala; five days of building; 100 yojanas.
  - Aṅgada breaks the palace top.
  - Agastya comes with the gods.
  - Lakṣmaṇa's oath arrow against Indrajit.
  - मरणान्तानि वैराणि.
  - The coronation: Śatrughna holds the umbrella; Sugrīva and Vibhīṣaṇa hold the fans; Sītā gives her necklace to Hanumān.
  - यावद् रामकथा.
- **Enemy name** `enemy.hanuman_duel` is "Hanumān" in both English and names.json, so हनुमान् in the intro (#295) is not a spoiler.

## For a human teacher (judgement calls; not changed)

1. **#68 "सः भयं लोभं च दर्शयति"** for "threats and promises". A learner may read it as "he shows (his own) fear and greed". भयं दर्शयति = "threatens" is idiomatic, but लोभं दर्शयति is weak for "promises/tempts". No verified verb for threaten, tempt or promise exists. A possible fix: "सः सीतायै भयं दर्शयति, धनं च दर्शयति।"
2. **#193 "रावणस्य महान् भ्राता"** for "giant brother". महान् here means big, not elder; Kumbhakarṇa is the younger brother. विशालः (L2) would say "huge" more plainly. Kept, because महान् is not wrong.
3. **#250 "एते पादुके … राजानौ आस्ताम्"**: a masculine predicate noun with a feminine dual subject. Grammatical, and the joke ("the sandals were the kings") works, but it may puzzle a learner.
4. **#69 "सीता तयोः मध्ये तृणं स्थापयति"**: "between the two" means herself and Rāvaṇa, which is clear only from context. आत्मनः रावणस्य च मध्ये is exact but longer.
5. **The Ādityahṛdaya hymn: singular or plural.** It is श्लोकाः (pl.) in #209, 214, 216, 218 and 222, but एषः श्लोकः in #213. In the game it is one verse in the verse book. Pick one: either "the hymn" = श्लोकाः everywhere, or एषः श्लोकः everywhere. स्तोत्रम् is not in the packs.
6. **#235 "रामः, सीता, लक्ष्मणः, सर्वाणि मित्राणि च … आरूढवन्तः"**: masculine plural over mixed genders that include a neuter (मित्राणि = persons). This is natural usage, though some grammars prefer the neuter when a neuter is present. Kept.
7. **#185 "अत्र शेष्व"**: √शी, L3. "अत्र विश्राम्य" is simpler but loses "lie down". Kept.
8. **#186 "हिमवान् यत्र अस्ति, तत्र"**: I confirmed that हिमालय is not in the packs (हिमवान् verifies as a verse form). It stays clumsy but correct.
9. **Earlier open items, re-checked; the missing words are still missing from the packs:**
   - #90 मा + loṭ;
   - #115 सीता कुशलेन आसीत् (कुशलिनी is absent);
   - #152 देवानां तक्षकस्य पुत्रः: तक्षकः is the vocab pack's word for "carpenter", so this is defensible;
   - #167 the tower paraphrase (शिखर is absent);
   - #224 चालकः (सारथि is absent);
   - #243 रत्नानां हारम् for the pearl necklace (मुक्ता verifies **only** as the kta "released": don't use it for pearls);
   - #138/#142 रक्षाम् इच्छामि for "refuge" (शरण is absent);
   - #139 दूतः for "spy" (चार is absent);
   - #261 यावत् + acc.;
   - #263 त्वया एव (hetu instr.).

**Out of scope (English, flagged only):**
- #186 conflates two herb episodes. In Vālmīki 6.74, Indrajit's brahmāstra fells both brothers and the army, and Jāmbavān sends Hanumān to the Himālaya. Suṣeṇa's herb errand comes after Rāvaṇa's śakti strikes Lakṣmaṇa.
- #212/#229 "the brahmāstra that Agastya blessed". In Vālmīki 6.108 (as I recall), the arrow was *given* to Rāma by Agastya earlier. The Sanskrit hedges with स्पृशति/स्पृष्टवान् ("touched").
- #236: Bharata meets Rāma at Nandigrāma, not in Ayodhyā itself.
- #119: the English "southern shore of the ocean" has the same ambiguity that the Sanskrit fix removes. "the shore of the southern ocean" would match.

## Proposals for the orchestrator (glossary / packs)

- **"Your party is fully rested" = सर्वे सम्यक् विश्रान्ताः।** Files 2 and 3 now agree. File 4's "Everyone is fully restored" (सर्वेषां बलं पुनः पूर्णं भवति) is a different message and is fine.
- **"some / a few words" = के अपि शब्दाः** (files 1 and 3).
- **Direction:** "the southern shore" (of the sea, mainland side) = दक्षिणस्य समुद्रस्य तीरे. Avoid समुद्रस्य दक्षिणे तीरे, which names the far (Laṅkā) shore.
- **Pack candidates** (human-reviewed vocab additions, not models) that would restore meaning lost in file 3:
  - शिखरम् (peak/top: #167),
  - सारथिः (#224),
  - शरणम् (#138, #142),
  - मुक्ता (pearl: #243, #54),
  - चारः (spy: #139, #267),
  - हिमालयः (#186),
  - आलिङ्गति (#146 "embraces", now बाहुभ्यां गृह्णाति).
