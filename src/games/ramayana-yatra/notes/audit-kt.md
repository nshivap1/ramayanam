# audit-kt: Sanskrit audit of the Kathā study aids and Kathā lines (v0.4.2)

Auditor: au-kt (model; did not write this content). Brief: /home/claude/scratch/audit/BRIEF.md.
Scope: `content/katha.json` (the 21 `verses[].anvaya` and `verses[].saralarthah`, the 10 `astras` bindings, the 6
`moveText` strings) and `content/sa-dialogue-5.json` (all 80 `sa` lines: tutorial, verse-moment framing, choice
prompts/options/answers, move descriptions). Each verse was read against its pada-ccheda words, grammar notes, English
translation, speaker and context in `shlokas-*.json` (read-only). Each dialogue line was read in its story block
(story-ch*.json Kathā branches) and against the UI glossary (sa-ui.md, sa-battle.json, sa-ui-a/b/katha.json).
Every word introduced was checked with `sa-ui/words.ts`.

## Counts

| | n |
|---|---|
| Strings checked | 122 (21 anvaya + 21 सरलार्थः + 80 file-5 lines); plus 10 astra bindings and the 6 moveText English strings |
| Fixed (accuracy / meaning) | 2 |
| Simplified / made consistent (ease) | 1 |
| Flagged for a human | 11 (5 new, 6 carried forward from kc-rev / fx-rev, with my view) |

Tests: `sambhashana`, `sa-ui`, `katha-content`, `grammar-sa`, `sa-battle`: 48 / 48 pass (before and after the edits).

## Changes

| # | Key / English (short) | Before → After | Why |
|---|---|---|---|
| 1 | katha `s-ramo-dvir` सरलार्थः, sentence 2 ("Tell me, my queen…") | हे देवि, राजा किम् इच्छति? तत् वचनं वदतु। → हे देवि, राजा किम् इच्छति? **भवती** तत् वचनं वदतु। | Meaning. The sentence before has राजा as its subject, so a bare 3rd-person वदतु reads "let him (the king) say it", the opposite of the verse (ब्रूहि: Rāma asks Kaikeyī to speak). भवती names the addressee and is the respectful register for Rāma to the queen. |
| 2 | file 5, ch1.bharadvaja_duel onLose "You nearly had me!…" | अहो, त्वं प्रायः जयसि! → अहो, त्वं प्रायः {g:जितवान्\|जितवती}! | Meaning + house tense rule. The duel is over (the player lost). With the present, प्रायः जयसि most naturally reads "you usually win" (प्रायः = "mostly / generally" in Sambhāṣaṇa). The ktavatu past (house rule for past events) with प्रायः gives "you almost won". The file-1 practice line was changed the same way in parallel, so both modes now match. |
| 3 | file 5, ch1.road_dawn "In battle, choose a move. For an astra…" | युद्धे एकं कार्यं चिनु। … अन्यानि कार्याणि सरलानि। → युद्धे एकं **मन्त्रं** चिनु। … **अन्ये मन्त्राः सरलाः**। | Consistency (ease). "Move" is मन्त्रः everywhere the Kathā player sees it: party screen (मन्त्रान् चिनु), toasts (तं मन्त्रं प्रयुङ्क्ते), battle lines (मन्त्रः दुर्बलः, मन्त्राणाम् उत्साहः), and the sambhashana.md convention. The file-1 practice line now also says मन्त्रं. |

## Reviewed and kept

**Anvayas (21).** All are permutations of the verse's own forms (test), with vocatives first (निषाद, राम, देवि, तात,
आर्यपुत्र, आयुष्मन्; a second vocative stands before its own imperative: नरशार्दूल उत्तिष्ठ, महाबाहो एनम् आनय),
subject–object–verb, and epithets next to their nouns (तपस्वी वाल्मीकिः … मुनिपुङ्गवम् नारदम् परिपप्रच्छ; असौ अभिरामः मृगः;
अक्लिष्टकर्मणः कोसलेन्द्रस्य रामस्य दासः). Implied words ([अस्ति], [अस्मि], [सः], [जयति], [तथा]) are minimal and correct.
No change. Two order questions remain for the teacher (rows 1–2 below).

**सरलार्थाः (21).** Checked for agreement, case government (प्रच्छ् with two accusatives: नारदं प्रश्नं पृष्टवान्;
भी with the ablative: धनुषः बिभ्यति; रक्ष् with the ablative: सर्वेभ्यः भूतेभ्यः रक्षामि; dative of purpose: क्रीडायै भविष्यति),
pronoun reference, register (Jaṭāyu, Rāma to Vibhīṣaṇa: भवान्; Viśvāmitra and Sumitrā: त्वम्), and faithfulness
to the translation. Apart from row 1 they say what the verse says in plain words, in 2–4 sentences. Every word verifies.
Words above level 2 are the verse's own words or story terms (केयूरे, आयुष्मन्, वासवः, हिमवान्, अतिबलः …), as intended.

**File 5 (80 lines).** Choice blocks: every misread reply answers a different question word (कुतः / कुत्र / किमर्थम् / कथम्
/ कति / कदा / किम् / केन सह), and the answer turns back to the question in character. The gender markup is right
(त्वं {g:कः|का}, {g:वत्स|वत्से}, {g:शिष्यः|शिष्या}, {g:गतवान्|गतवती}); `{player}` is in address or nominative position
only. Shrine = मन्दिरम्, bag = स्यूतः, astra = अस्त्रम्, gap = रिक्तं स्थानम् … उचितं पदं चिनु, as in the UI files.
The night-wanderers "stay hidden" lines (न उत्पतन्ति in ch1, बहिः न आगच्छन्ति in ch3) both echo their practice lines
(उत्पतन्ति = "leap out"), so they stay.

**Astras.** The kc-rev concern is resolved: dharma_vigraha and jaya_ghosha are now bound to pāda 1 (साधुः · सत्यपराक्रमः;
लक्ष्मणश्च · महाबलः), so the gap is no longer always रामो. No change.

## For a human teacher

New in this audit:
1. **s-anirvedah सरलार्थः, sentence 1** "दुःखे अपि मनुष्यः धैर्यं न त्यजेत्।" turns the maxim into a rule ("one should not
   give up"). I kept it: it glosses अनिर्वेदः for the learner, and it fits Hanumān's own resolve. A purely descriptive
   wording would need the hard word itself.
2. **s-tapah-svadhyaya** "वचने अपि कुशलः" ("skilled in speech too") is weaker than वाग्विदां वरम् ("best of the eloquent").
   वक्तृ does not verify, and "ये सम्यक् वदन्ति, तेषु अपि सः उत्तमः" would double the length. Kept.
3. **s-kalyani-bata**: "seems to me" (मा … प्रतिभाति) is not rendered, and "शतं वर्षाणि गच्छन्तु, तदा अपि …" uses the
   concessive imperative ("let a hundred years pass, even then"). Idiomatic, but a teacher may prefer another form.
4. **s-sakrdeva**, sentence 1 is 13 words with the quotation ('अहं तव अस्मि'). Sentences 1 and 3 overlap (अभयं ददामि /
   रक्षामि). Kept, because the overlap explains अभयम् ("I protect him from all beings").
5. **File 5, row 2 above**: confirm प्रायः + ktavatu for "nearly (won)" (MW gives प्रायः "almost, nearly"). If a teacher
   prefers no प्रायः at all, both files 1 and 5 should change together.

Carried forward (already listed by kc-rev / fx-rev, with my view):
6. **s-ko-nvasmin anvaya** "गुणवान् कः नु [अस्ति] वीर्यवान् च कः …". I lean to **कः नु गुणवान् [अस्ति], कः च वीर्यवान्,
   धर्मज्ञः च …** (subject before predicate, and the verse's own pairing कः … गुणवान् / कः च वीर्यवान्). Not changed:
   both orders are taught, and this one was reviewed.
7. **s-pitari-shushrusha anvaya** with the यथा clause first. Kept, as kc-rev reasoned.
8. **s-kausalya-supraja**: कौसल्या + सुप्रजा as two nominatives vs. the vocative compound कौसल्यासुप्रजाः; नित्यं as an adjective.
9. **s-nanrgveda**: the three न with negative compounds (one negation of शक्यम्, repeated). Worth one line of explanation.
10. **File 5 "Let them sleep a little longer"**: "तौ स्वपितः, अस्तु" is a paraphrase ("they sleep; so be it"). "तौ स्वपिताम्।"
    verifies, is shorter and closer, but loṭ 3du is a rarer form at Level 3. Also "किम् आरभावहै?" ("Ready?") is right
    (आ+रभ् is ātmanepada; loṭ 1du) but a hard form; "किं त्वं {g:सज्जः|सज्जा}?" verifies (L2) if a simpler line is wanted.
11. **File 5 terms**: "स्वर्णस्य मृगः" (genitive of material, as in file 2) and "रक्षां याचते" for refuge (शरण does not
    verify).

## Proposals for the orchestrator (glossary)

- **"recites itself"** now has two renderings: file 5 (ch1.road_dawn tutorial) "सः स्वयं पूर्णः भवति" (fx-rev's choice:
  वद् is a speaker's verb) and sa-ui-katha `katha.autoReciteSub` / `katha.help1` "श्लोकाः स्वयं वदन्ति" / "श्लोकः स्वयं
  वदति". Both are correct. If one phrase is wanted, pick it centrally and I (or the owner) will align file 5.
- Moves = मन्त्रः and "nearly won" = प्रायः {g:जितवान्|जितवती} are now the same in files 1 and 5. No further action.
