# sa-review: independent Sanskrit review of the analysis and teaching layer

Reviewer: agent sa-review (2026-11-11, 00:25–01:00 ET). I did not take part in writing this content. This is an agent
review, **not** a human sign-off: `humanReviewed` was left untouched everywhere.

Scope: the `words` analysis (pada-ccheda, grammar, gloss, role), `sandhiNotes`, translations, contexts, both lexicons,
`names.json` (read only), and ~300 generated challenges (all six kinds, levels 2–4, every verse heard; script in
`/home/claude/scratch/sa-review/gen.ts`). I did not re-verify the verse text. That is content-v's job, and I found no text
error I am sure of.

Files edited: `content/shlokas-1.json`, `content/shlokas-2.json`, `content/lexicon-1.json`, `content/lexicon-2.json`.
After each batch of edits: `content.test` 13/13, `learning.test` 14/14. Full game suite `node tools/test.mjs unit games/ramayana-yatra/` 100/100.

## Summary

| priority | found | fixed in content | open |
|---|---|---|---|
| P0: wrong Sanskrit a learner would absorb | 1 | 0 | 1 (learning logic) |
| P1: misleading | 11 | 8 | 3 (2 learning logic + view, 1 human: text reading) |
| P2: polish | 18 | 10 | 8 (3 learning logic, 3 human, 1 names/story spelling, 1 stale REVIEW.md text) |

The pada-ccheda is complete and in verse order in all 21 verses. Every case/number/gender, person/tense/voice, participle
and indeclinable label I checked is correct. Translations are faithful and respectful. Speakers and situations match the
epic, with two small fixes to context. The sandhi notes are accurate. The main problems were in the **teaching layer**:
- what the vibhakti questions claim about a word's role;
- near-synonym meanings that could be offered as "wrong" options;
- Devanagari printed as plain English text.

## Orchestrator request: duplicate lexicon ids

- `aham`/`asmad` and `kimcit`/`kincit` had **already been merged** before this review. No `asmad` or `kimcit` id or lexId
  exists in any content JSON. Both lexicons use `aham` (nominative lemma, the convention used for personal pronouns) and
  `kincit`.
- Story files: `grep -o '{w:[a-z0-9-]*}' content/story-*.json` finds 22 distinct ids. **None** is a dropped id, and all 22
  exist in the merged lexicon. No story text needs changing.
- Stale mentions remain only in prose: `REVIEW.md` lines 164–165 ("Lexicon observations"), `notes/content-v.md`
  ("Lexicon duplicates") and `notes/content-a.md`. Their owners should update them; I may not edit those files.

## Changes made (before → after, reason)

### P1: vibhakti roles that made the explanation state something false
The vibhakti explanation says, for example, "dāsaḥ … is the subject (nominative): it names who or what the sentence is about".
`GrammarRole` has no "predicate" value. So predicate nouns now carry **no role**: they are never asked, the same treatment
content-a already gave predicative participles (kartavyam, hṛtam). Their grammar is marked "(predicate)". Predicate
**adjectives** become `modifier`, like laukikī.

Homographic cells (enclitic me = dat./gen.; naḥ = acc./dat./gen.; conjunction yat = nom./acc. n.) carry no role, because
`syncreticRoles` cannot know them and "Recipient (dative)" could be offered as a wrong option while being arguably right
(SANSKRIT_ACCURACY: "accept all, or do not ask").

Forms of the lexicon entries were updated to the same grammar strings.

### All edits (generated log)
- [P2] s-tapah-svadhyaya / paripapraccha / grammar: "3rd sg. perfect active (pari + √prach)" → "3rd sg. perfect active (pari + √pracch)" — root spelled as in the lemma pracch (प्रच्छ्)
- [P1] s-golden-deer / me / role: "possessor" → (removed) — enclitic me is dat. = gen. sg.; "Recipient (dative)" could be offered as a wrong option though arguably right (homographic cell: do not ask)
- [P2] s-golden-deer / me / grammar: "gen. sg. (enclitic)" → "gen. sg. (enclitic; same form as dat. sg.)" — flag the homograph
- [P1] s-ramo-vigrahavan / dharmaḥ / role: "subject" → (removed) — predicate noun ("Rāma IS dharma embodied"), not the subject; GrammarRole has no predicate value, so no role (same treatment as other predicate words)
- [P2] s-ramo-vigrahavan / dharmaḥ / grammar: "nom. sg. m." → "nom. sg. m. (predicate)" — mark the predicate
- [P1] s-ramo-vigrahavan / rājā / role: "subject" → (removed) — predicate noun ("[he is] king of the whole world")
- [P2] s-ramo-vigrahavan / rājā / grammar: "nom. sg. m." → "nom. sg. m. (predicate)" — mark the predicate
- [P1] s-kalyani-bata / kalyāṇī / role: "subject" → "modifier" — predicate ADJECTIVE agreeing with gāthā (like laukikī), not the subject
- [P2] s-kalyani-bata / kalyāṇī / grammar: "nom. sg. f." → "nom. sg. f. (predicate)" — mark the predicate
- [P1] s-kalyani-bata / mā / role: "object" → (removed) — gloss is "to me" (experiencer of prati-bhā); keyed "Object: it receives the action" is misleading and "Recipient (dative)" would be arguably right
- [P1] s-maranantani / maraṇāntāni / role: "subject" → "modifier" — predicate adjective (bahuvrīhi) agreeing with vairāṇi, not the subject
- [P2] s-maranantani / maraṇāntāni / grammar: "nom. pl. n. (compound)" → "nom. pl. n. (compound, predicate)" — mark the predicate
- [P2] s-maranantani / maraṇāntāni / gloss: "end with death" → "ending in death" — English: "end with death" read as a verb
- [P1] s-maranantani / naḥ / role: "possessor" → (removed) — enclitic naḥ = acc./dat./gen. pl.; a dative reading ("accomplished for us") is possible, and "Recipient (dative)" can be offered as a wrong option (content-a already leaves naḥ unroled)
- [P2] s-maranantani / naḥ / grammar: "gen. pl. (enclitic)" → "gen. pl. (enclitic; same form as acc./dat. pl.)" — flag the homograph
- [P1] s-nanrgveda / śakyam / role: "subject" → (removed) — impersonal predicate gerundive ("[it is] possible"); it is not the subject (the infinitive clause is). Same treatment as kartavyam
- [P2] s-nanrgveda / śakyam / grammar: "nom. sg. n. (gerundive)" → "nom. sg. n. (gerundive, impersonal predicate)" — mark the predicate
- [P1] s-vyakaranam / bahu / role: "modifier" → "object" — bahu is the object of vyāharatā ("speaking much"); it agrees with no noun, so "Modifier: it describes a noun and agrees with it" was false
- [P2] s-vyakaranam / bahu / grammar: "acc. sg. n. (adverbial)" → "acc. sg. n. (object of vyāharatā)" — state the construction
- [P1] s-anirvedah / mūlam / role: "subject" → (removed) — predicate noun of anirvedaḥ ("not losing heart IS the root / the highest happiness / the driver"), not the subject
- [P2] s-anirvedah / mūlam / grammar: "nom. sg. n." → "nom. sg. n. (predicate)" — mark the predicate
- [P1] s-anirvedah / sukham / role: "subject" → (removed) — predicate noun of anirvedaḥ ("not losing heart IS the root / the highest happiness / the driver"), not the subject
- [P2] s-anirvedah / sukham / grammar: "nom. sg. n." → "nom. sg. n. (predicate)" — mark the predicate
- [P1] s-anirvedah / pravartakaḥ / role: "subject" → (removed) — predicate noun of anirvedaḥ ("not losing heart IS the root / the highest happiness / the driver"), not the subject
- [P2] s-anirvedah / pravartakaḥ / grammar: "nom. sg. m." → "nom. sg. m. (predicate)" — mark the predicate
- [P1] s-dasoham / dāsaḥ / role: "subject" → (removed) — predicate noun ("I am the servant"); aham is the subject
- [P2] s-dasoham / dāsaḥ / grammar: "nom. sg. m." → "nom. sg. m. (predicate)" — mark the predicate
- [P1] s-sakrdeva / vratam / role: "subject" → (removed) — predicate noun ("this is my vow"); etat is the subject
- [P2] s-sakrdeva / vratam / grammar: "nom. sg. n." → "nom. sg. n. (predicate)" — mark the predicate
- [P1] s-sakrdeva / eva / gloss: "even (just)" → "just, only (here: \"just once\")" — eva restricts ("just, only"); "even" is api's meaning and made api's lexicon meaning look right in an artha question on eva
- [P2] s-kalyani-bata / translation: "How true and lovely this old saying now seems to me: joy does come to a man who stays alive, even if it takes a hundred years." → "How true and lovely this popular saying now seems to me: joy does come to a man who stays alive, even if it takes a hundred years." — laukikī = "popular, current among people", not "old"
- [P1] s-kalyani-bata / sandhiNotes[0].note: "ā + i merge into e (guṇa): गाथा + इयम् → गाथेयम्; final m then becomes anusvāra before the next pāda." → "ā + i merge into e (guṇa): gāthā + iyam → gātheyam; final m then becomes anusvāra before the consonant l that begins the next pāda." — precision (anusvāra is caused by the following consonant) + IAST instead of Devanagari
- [P2] s-naham-janami / context: "In Kiṣkindhā, Sugrīva shows Rāma the ornaments that Sītā dropped as she was carried off. Rāma asks Lakṣmaṇa whether he knows them; out of reverence Lakṣmaṇa had only ever looked at his sister-in-law's feet." → "On Mount Ṛṣyamūka, Sugrīva shows Rāma the ornaments that Sītā dropped as she was carried off. Rāma asks Lakṣmaṇa whether he knows them; out of reverence Lakṣmaṇa had only ever looked at his sister-in-law's feet." — the scene (Kiṣk. 6) is on Ṛṣyamūka, where the exiled Sugrīva lives, not in Kiṣkindhā city
- [P2] s-aditya-hrdayam / context: "Rāma stands weary before his final battle with Rāvaṇa. The sage Agastya comes to him on the battlefield and teaches him this hymn to the Sun." → "Weary from battle, Rāma stands deep in thought on the battlefield as Rāvaṇa comes forward to fight again. The sage Agastya approaches him and teaches him this hymn to the Sun." — Yuddha 105.1–2: Rāma is yuddha-pariśrānta, already in the final battle, not "before" it
- [P1] lex atibala / meaning: "exceedingly strong" → "exceedingly strong, mighty" (1 file) — near-synonym of mahābala "very powerful, mighty" with no shared word, so each could be the other's "wrong" option
- [P1] lex viryavat / meaning: "valiant, heroic" → "valiant, heroic, mighty" (1 file) — MW vīryavat "strong, powerful, mighty"; same clash with mahābala/atibala
- [P1] lex as / meaning: "to be" → "to be, exist" (2 files) — "to be" (as) and "to be, become" (bhū) / "to turn; to be, exist" (vṛt) shared no content word ("be" is a stop word), so a correct sense was offered as a distractor
- [P1] lex bhu / meaning: "to be, become" → "to be, become, exist" (1 file) — MW bhū "to become, be, arise, exist"; links it to as/vṛt
- [P1] lex ish / meaning: "to wish, seek" → "to wish, desire; seek" (1 file) — clash with kāṅkṣ "to desire, long for" (MW iṣ "to wish, desire")
- [P1] lex nunam / meaning: "surely, certainly" → "surely, certainly, indeed" (1 file) — MW nūnam "certainly, assuredly, indeed"; clash with hi/eva "indeed"
- [P1] lex yatha / meaning: "as, in which way" → "as, like, in which way" (2 files) — MW yathā "as, like"; "as" is a stop word so iva "like, as" was a possible distractor though also correct
- [P1] lex parama / meaning: "highest, supreme" → "highest, supreme, best" (1 file) — MW parama "best, most excellent"; clash with vara "best, most excellent"
- [P1] lex para / meaning: "highest, supreme; other" → "highest, supreme, best; other" (1 file) — same clash with vara
- [P1] lex punya / meaning: "holy, pure, meritorious" → "holy, pure, auspicious, virtuous" (1 file) — MW puṇya "auspicious, good, virtuous, pure, holy"; clash with kalyāṇa/śiva "auspicious", sādhu "good, virtuous"
- [P1] lex akshayya / meaning: "imperishable, undecaying" → "imperishable, undecaying, everlasting" (1 file) — clash with śāśvata "eternal, endless"
- [P1] lex shashvata / meaning: "eternal, endless" → "eternal, endless, everlasting" (1 file) — same clash with akṣayya
- [P1] lex sadhu / meaning: "good, virtuous" → "good, virtuous, righteous" (1 file) — MW sādhu "good, virtuous, righteous"; clash with dharmajña "knowing dharma, righteous"
- [P2] lex tapahsvadhyayanirata / notes: "tapas \"austerity\" + svādhyāya \"Vedic recitation\" + nirata \"devoted to\" (tatpuruṣa, used as an adjective)." → "tapas \"austerity\" + svādhyāya \"Vedic recitation\" (a dvandva: \"austerity and Vedic study\") + nirata \"devoted to\" (tatpuruṣa); used as an adjective." (1 file) — the first two members form a dvandva
- [P1] s-vyakaranam / kiñcit / gloss: "anything (with न: nothing)" → "anything (with na: nothing)" — Devanagari → IAST
- [P1] 72 further English fields (teaches, sandhi notes, lexicon notes) in shlokas-2/lexicon-2: Devanagari runs converted to IAST with devaToIast (engine), as content-a did
- [P1] s-ma-nishada / yat / role: "indeclinable" → (removed) — conjunction yat is formally nom./acc. sg. n. (the grammar says so), so "Subject"/"Object" could be offered as wrong options although arguable; do not ask
- [P2] lex aham / notes (both files): "Stem asmad: acc. sg. mām, gen. sg. mama / me; pl. enclitic naḥ \"us, for us\"." | "First-person pronoun (stem asmad): nom. sg. aham, acc. sg. enclitic mā, gen. sg. mama, gen. pl. enclitic naḥ." → "First-person pronoun (stem asmad): nom. sg. aham; acc. sg. mām, enclitic mā; gen. sg. mama, enclitic me (also dat.); pl. enclitic naḥ (acc./dat./gen.)." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. aham) were never explained on the word card
- [P2] lex as / notes (both files): "Present asti." | "Present 1st sg. asmi." → "Present 3rd sg. asti, 1st sg. asmi." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. as) were never explained on the word card
- [P2] lex bhash / notes (both files): "Middle: bhāṣate; with abhi- \"speak to, address\"." | "With vi-: to speak, express (vibhāṣitum, infinitive)." → "Middle: bhāṣate; with abhi- \"speak to, address\"; with vi- \"speak, express\" (infinitive vibhāṣitum)." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. bhash) were never explained on the word card
- [P2] lex hi / notes (both files): "Never first in its clause." | null → "Never first in its clause." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. hi) were never explained on the word card
- [P2] lex hr / notes (both files): "Present harati (also \"captivate\"); past participle hṛta." | "With vi + ā: to utter, speak (vyāharatā, present participle)." → "Present harati (also \"captivate\"); past participle hṛta; with vi + ā- \"utter, speak\" (present participle vyāharat)." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. hr) were never explained on the word card
- [P2] lex idam / notes (both files): "Demonstrative; loc. sg. m. asmin." | null → "Demonstrative \"this\": loc. sg. m. asmin, instr. sg. m. anena, gen. sg. m. asya, nom. sg. f. iyam." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. idam) were never explained on the word card
- [P2] lex jna / notes (both files): "Present jānāti; with prati- (middle) \"promise\"." | "Present stem jānā- (jānāmi). With abhi-: to recognise, know well." → "Present jānāti (1st sg. jānāmi); with abhi- \"recognise, know well\"; with prati- (middle) \"promise\"." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. jna) were never explained on the word card
- [P2] lex kincit / notes (both files): "kim + the particle cit. Printed kiṃcit / kiṃ cit in the sources." | "kim + the particle cit; with na: \"nothing at all\". MW lists it as kiṃcit." → "kim + the particle cit; with na: \"nothing at all\". Printed kiṃcit / kiṃ cit in the sources; MW lists it as kiṃcit." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. kincit) were never explained on the word card
- [P2] lex kr / notes (both files): "Present karoti; future kariṣyati/-te; gerundive kartavya \"to be done\"." | "Passive imperative kriyatām \"let it be done\"." → "Present karoti; future kariṣyati/-te; gerundive kartavya \"to be done\"; passive imperative kriyatām \"let it be done\"." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. kr) were never explained on the word card
- [P2] lex rajan / notes (both files): "-an stem: nom. sg. rājā, gen. sg. rājñaḥ." | null → "-an stem: nom. sg. rājā, gen. sg. rājñaḥ." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. rajan) were never explained on the word card
- [P2] lex tvam / notes (both files): "Second-person pronoun (stem yuṣmad); nom. sg. tvam." | "Second-person pronoun (stem yuṣmad); gen. sg. tava." → "Second-person pronoun (stem yuṣmad): nom. sg. tvam, gen. sg. tava." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. tvam) were never explained on the word card
- [P2] lex vrt / notes (both files): "Present vartate (middle); with pra- \"begin, set in\"." | "With nis-: to be accomplished (nirvṛtta \"completed\")." → "Present vartate (middle); with pra- \"begin, set in\"; with nis- \"be accomplished\" (past participle nirvṛtta)." — mergeLexicons keeps lexicon-1's notes, so content-b's forms (e.g. vrt) were never explained on the word card
- [P2] s-aranya-3 / sandhiNotes: the note "rāvaṇenobhayaṃ hṛtam" was extended to "prāṇā rāvaṇenobhayaṃ hṛtam" = prāṇāḥ + rāvaṇena + ubhayam + hṛtam, with the visarga-loss rule added (a separate note "prāṇā rāvaṇena" is impossible: the a of rāvaṇena is fused into o in the printed text).
- [P2] s-sakrdeva / prapannāya / grammar: "past passive participle (pra + √pad), dat. sg. m." → "past participle in -ta (pra + √pad; active sense, as with verbs of motion), dat. sg. m." — pad "go" is intransitive: prapanna means "one who has resorted (for refuge)", not a passive; "past passive participle" invites the reading "one who has been approached"
- [P2] s-maranantani / nirvṛttam / grammar: "past passive participle (nis + √vṛt), nom. sg. n." → "past participle in -ta (nis + √vṛt; intransitive: \"has come about\"), nom. sg. n." — nis-vṛt is intransitive ("come to an end, be accomplished"); not a passive of a transitive verb
- [P2] s-ko-nvasmin / sandhiNotes: added dharmajñaśca kṛtajñaśca = dharmajñaḥ + ca + kṛtajñaḥ + ca — the printed text shows a sandhi form of dharmajñaḥ that no note explained (found by checking every word against its printed pāda)
- [P2] s-ma-nishada / sandhiNotes: added krauñcamithunādekam = krauñcamithunāt + ekam — the printed text shows a sandhi form of krauñcamithunāt that no note explained (found by checking every word against its printed pāda)
- [P2] s-golden-deer / sandhiNotes: added mṛgo harati = mṛgaḥ + harati — the printed text shows a sandhi form of mṛgaḥ that no note explained (found by checking every word against its printed pāda)
- [P2] s-nanrgveda / sandhiNotes: added nāsāmavedaviduṣaḥ = na + asāmavedaviduṣaḥ — the printed text shows a sandhi form of na that no note explained (found by checking every word against its printed pāda)
- [P2] s-jayatyatibalo / sandhiNotes: added rāmo lakṣmaṇaśca = rāmaḥ + lakṣmaṇaḥ + ca — the printed text shows a sandhi form of rāmaḥ that no note explained (found by checking every word against its printed pāda)
- [P2] s-jayatyatibalo / sandhiNotes: added sugrīvo rāghaveṇābhipālitaḥ = sugrīvaḥ + rāghaveṇa + abhipālitaḥ — the printed text shows a sandhi form of sugrīvaḥ that no note explained (found by checking every word against its printed pāda)
- [P2] s-sakrdeva / sandhiNotes: added sarvabhūtebhyo dadāmyetadvrataṃ = sarvabhūtebhyaḥ + dadāmi + etat + vratam — the printed text shows a sandhi form of sarvabhūtebhyaḥ that no note explained (found by checking every word against its printed pāda)
- [P2] s-maranantani / sandhiNotes: added saṃskāro mamāpyeṣa = saṃskāraḥ + mama + api + eṣaḥ — the printed text shows a sandhi form of saṃskāraḥ that no note explained (found by checking every word against its printed pāda)

## Open findings

### For the learning-logic owner (`logic-learning.ts`; the view owner for item 2)
1. **P0: lipi explanations describe a different form.** `occurrenceNote(cx, lexId)` takes the first heard occurrence of
   the lexeme, not of the stimulus form. In 26 of 450 generated lipi challenges the explanation gives the grammar of
   another form. Examples:
   - gaccha "… it is 2nd sg. aorist active (with augment), 'attain'" (that is agamaḥ);
   - rāmasya "… voc. sg. m.";
   - rājā "… gen. sg. m.";
   - anena "… loc. sg. m.";
   - eṣaḥ "… nom. sg. n.".

   Fix: pass the stimulus and prefer `o.w.form` equal to it (normalizeDeva). Fall back to the lemma-only sentence when no
   occurrence matches.
2. **P1: `{w:lexId}` renders the lemma where the sentence means the inflected form.**
   - purana: "The verse has «kṛ» here: 1st sg. future middle". The verse has kariṣye.
   - viccheda: "It splits into «nī» + «enad» + «mahābāhu»". The split just tested is ānaya + enam + mahābāho.
   - vibhakti: "«aham» (acc. sg., …)". That is the lemma aham labelled acc. sg.
   - krama glosses have the same problem.

   A learner pairs a root or stem with a case label it does not have. This needs a form-rendering markup, e.g.
   `{f:<shlokaId>:<wordIndex>}`: it renders the verse form with `<SaText>` and opens the lexId card on tap. view-markup
   must support it.
3. **P1: `ROLE_EXPLAIN` makes semantic claims that are false for ordinary non-prototypical case uses.** The keyed case is
   right; the sentence after the colon is wrong:
   - "it shows where or when": gāmbhīrye "in depth" (locative of respect, s-samudra-iva); pitari "towards a father"
     (s-pitari-shushrusha).
   - "it is the means or the agent": dhairyeṇa "in steadfastness" (instrumental of respect).
   - "it shows whose": anṛgvedavinītasya / ayajurvedadhāriṇaḥ / asāmavedaviduṣaḥ "for one not …" (genitive with śakyam,
     s-nanrgveda).
   - "the point the action starts from": pādābhivandanāt "because of bowing" (ablative of cause).
   - "names who or what the sentence is about": samudraḥ, himavān, vāsavaḥ (standards of comparison in iva-similes) and
     appositions such as tapasvī, hanumān, nihantā, mārutātmajaḥ.

   Suggest case-centred wording: "{form} is in the locative (saptamī). The locative usually shows where or when; here it
   means "in depth"." Alternatively, rename the prompt "Which case is this word in?". I fixed the cases that were plain
   content errors (see above) and left the rest, because the content is right under the `GrammarRole` = case mapping in
   types.ts.
4. **P2: trivial viccheda items.** Some notes' joined form equals the split apart from spaces and anusvāra, so the answer
   looks exactly like the stimulus:
   - śāśvatīḥ samāḥ is identical;
   - rāmaṃ daśarathaṃ, nirvṛttaṃ naḥ, vāgvidāṃ varam, nūnaṃ vyākaraṇaṃ, ādityahṛdayaṃ puṇyaṃ differ only by anusvāra.

   Suggest skipping notes where SLP1(joined) with spaces removed and M→m equals the concatenated split. The notes stay
   useful on the verse card.
5. **P2: `sharesContentWord` STOP list contains "be" and "as".** So "to be" (as) and "to be, become" (bhū) were not seen as
   overlapping, and neither were "as, in which way" (yathā) and "like, as" (iva). I fixed this in the content by adding a
   shared word. A logic-side guard would stop it coming back, e.g. treat a meaning whose only content is stop words as
   overlapping any meaning that contains them.
6. **P2: `syncreticRoles` does not cover neuter dual -e = loc. sg.** (keyūre, kuṇḍale, nūpure in s-naham-janami). In context
   the dual object is unambiguous, so no question is wrong today. Matters only if questions ever drop the verse context.

### For a human Sanskrit scholar
- **P1 (text reading, already in REVIEW.md): s-kalyani-bata pāda 2 मा / मे / मां.** The analysis depends on it. With मे,
  the word becomes {form मे, lexId aham, grammar "gen./dat. sg. (enclitic)"} and should stay **without a role**. With मां,
  the grammar is "acc. sg.". Either way, update the lexicon `aham` forms.
- P2: s-kausalya-supraja suprajā as nom. f. predicate of Kausalyā (content-a's analysis, MW su-praja mf(ā)n.) versus the
  traditional reading of the pāda as an address to Rāma. The translation follows the first reading.
- P2: s-sakrdeva sarvabhūtebhyaḥ is analysed as ablative ("safety from all beings", the cause of fear). This is the
  commentators' reading; a dative "to all beings" is also printed in translations. `syncreticRoles` already bans
  "Recipient" as a distractor, so the question is safe. The scholar should confirm the gloss. yācate as a dative participle
  versus a 3rd sg. middle present is content-b's flag.
- P2: s-ma-nishada mā + augmented aorist agamaḥ (epic usage, flagged by content-a). Lemma choices वध्, एनद्, द्विस्, अतस्
  and the headword status of विग्रहवत् / अपशब्दित (unchanged).

### For names.json / story owners
- names.json: every entry I read is attested and used correctly. That covers the astras (āgneya / vāruṇa / vāyavya
  adjectives, brahmāstra), places, characters, enemies (Laṅkā, Surasā, Siṃhikā), items and UI terms. Nothing doubtful
  beyond what content-v already lists.
- P2: spelling. names.json has ऋश्यमूक (Ṛśyamūka; CE, Apte). The English verse contexts (s-nanrgveda, s-naham-janami) write
  Ṛṣyamūka, the vulgate / Gita Press spelling. Both are attested. Pick one for the English UI.

### Notes for content authors (no action needed)
- `teaches` is not displayed anywhere. I converted its Devanagari to IAST anyway, for consistency.
- `mergeLexicons` keeps the **first** file's `notes` for a shared id. Shared ids now have identical notes in both files;
  keep them in sync if you edit one.

## Method and references
- MW, through kosha.sanskrit.today (Cologne MW data): puṇya "auspicious, propitious, fair, pleasant, good, right, virtuous,
  meritorious, pure, holy, sacred".
- MW, through wisdomlib.org/definition/nunam: nūnam "… certainly, assuredly, indeed".
- From MW/Apte as I know them, not fetched this session: vīryavat "strong, powerful, mighty"; parama "best, most excellent";
  sādhu "good, virtuous, righteous"; iṣ "to wish, desire"; bhū "to become, be, exist"; yathā "as, like"; akṣayya
  "undecaying, imperishable"; śāśvata "eternal, perpetual". A human should spot-check them.
- **Blocked URLs** (permission not granted in time):
  - https://www.sanskrit-lexicon.uni-koeln.de/scans/csl-apidev/getword.php?dict=mw&key=puRya&input=slp1&output=iast
  - https://www.sanskrit-lexicon.uni-koeln.de/
  - https://kosha.sanskrit.today/word/sa/नूनम्
- Narrative checks:
  - Kiṣkindhā 6 takes place on Ṛṣyamūka, where the exiled Sugrīva lives.
  - Yuddha 105.1–2: Rāma is yuddha-pariśrānta, standing in thought on the battlefield as Rāvaṇa comes up to fight.
  - Sundara 34: Sītā says the proverb after Hanumān reports that Rāma and Lakṣmaṇa are well.
- Scripts (outside the repo): `/home/claude/scratch/sa-review/`.
  - `dump.ts` / `dumplex.ts`: readable dumps.
  - `gen.ts`: challenge sampler. `sample-after.txt` is the post-fix sample.
  - `l1.ts`: lipi form-mismatch count.
  - `unexpl.ts`: finds verse words whose printed sandhi form no note explains. It now finds none.
  - `fix1.ts`–`fix5.ts`: the edits, re-runnable only on the pre-review JSON.
