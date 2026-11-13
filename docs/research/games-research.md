# Samskuru — Games Research

Product research for a consolidated PWA of Sanskrit learning games ("Duolingo + NYT Games + casual puzzle arcade") aimed at Samskrita Bharati learners. Researched 10 Nov 2026. All source material is paraphrased; links are at the end.

---

## 0. Executive summary and ground rules

### 0.1 Headline conclusions

1. **Build a shared content-and-progress core first, then many small games on top of it.** Duolingo's stickiness comes from the meta layer (streak, XP, quests, path), not from any one exercise; NYT's comes from one shared puzzle per day plus a spoiler-free share. Both layers work offline with local storage. Everything social (leagues, friend streaks, push) needs a backend and should wait.
2. **The current prototypes are skewed towards upper-level topics.** Sandhi is formally a Parichaya topic and samāsa and chandas are Kovida topics in the Samskrita Bharati syllabus, while the largest audience (10-day camp graduates, Pravesha students, SAFL level 1) is working on script, vocabulary, the seven vibhaktis and four lakāras. The first wave therefore deliberately adds vibhakti, kriyāpada, numbers/time and sentence-building games.
3. **Do not copy Duolingo's Energy/Hearts.** It is a monetisation gate with documented user backlash, and Samskuru has nothing to sell. Use lives only inside arcade games where the format needs them.
4. **The akṣara, not the code point, is the playable unit**, and every accepted answer must come from a verified lexicon or a deterministic rule table generated at build time. No runtime generation of "plausible" Sanskrit.
5. **Several formats fit Sanskrit structurally, not just cosmetically** (details in section 2): Set (3 puruṣa x 3 vacana x 3 lakāra x 3 dhātu = exactly 81 cards), Sudoku (the nine forms of a tiṅanta paradigm are a 3x3 box), Solitaire (vibhakti order as rank, stems as suits), Crillion (*varṇa* means both "colour" and "letter/class"), Snakes and Ladders (an Indian game to begin with), Antakshari (literally *antya-akṣara*).

### 0.2 Curriculum levels used in this document

| Tag | Who | What they are learning (per Samskrita Bharati India / USA pages) |
|---|---|---|
| **B** Beginner | 10-day spoken camp, SAFL level 1 | Sounds, Devanagari, simple vocabulary and sentences; vibhaktis absorbed through question-and-answer talk rather than rules |
| **Pv** Pravesha | first correspondence level (6 months) | Script; vowel-ending noun declensions in three genders, pronouns, all seven cases; numerals; present, past, future, imperative in both padas; past participles, infinitives, prefixes |
| **Pc** Parichaya | second level | Adjectives, ordinals, sandhi (vowel sandhi first), indeclinables, potential mood, passive, rearranging ślokas into prose order |
| **Sh** Shiksha | third level | Present participles, advanced sandhi, sati-saptamī, kṛt suffixes, detailed anvaya, Gītā excerpts |
| **Kv** Kovida | fourth level | Samāsa (five groups) and vigraha, taddhita, alaṅkāra, chandas, composition |

SAFL (grades 8–12, three years, weekly 1h45 online class) sits its students for Parichaya at level 2 and Shiksha at level 3. Notably, SAFL already uses a Moodle platform with gamified assignments and short daily quizzes that count towards grades, so Samskuru is entering a setting where daily digital practice is already expected.

### 0.3 Sanskrit constraint codes (referenced in the catalogue)

- **C1 Akṣara unit.** A tile is one orthographic syllable: the whole consonant cluster plus vowel sign plus anusvāra/visarga. *saṃskṛtam* is three tiles (सं·स्कृ·तम्); *kārtsnyam* is two. A word-final halanta consonant joins the preceding tile (ज·गत्). Do not rely on the browser alone: only Unicode 15.1-aware engines keep Devanagari conjuncts in one grapheme cluster, so ship one tested segmentation function used by every game.
- **C2 Varṇa unit.** Phoneme-level games (sandhi, hangman, ladders) work on a varṇa string (क् + अ) held in one internal scheme and rendered to either script.
- **C3 No pseudo-Sanskrit.** Every string shown as correct, and every accepted answer, exists in the verified lexicon or a build-time-generated, reviewed table. Distractors are real forms that are wrong in context, never invented look-alikes. An unknown player answer gets "not in our kośa", not "wrong".
- **C4 Sandhi moves boundaries.** Joined text does not split at tile edges (*sūryodayaḥ* hides the boundary inside यो). Store both pada-pāṭha and saṃhitā forms; never count tiles across unresolved sandhi.
- **C5 Free word order.** Sentence builders validate against the set of tagged words, accepting every permitted order; only position-sensitive particles (ca, na, eva, api, iti) are pinned.
- **C6 Syncretic forms.** One surface form often has several analyses (*rāmābhyām* is instrumental, dative and ablative dual; *phalam* is nominative and accusative). Accept all, or supply sentence context.
- **C7 Spelling variants.** Normalise anusvāra versus class nasal (अंक/अङ्क), Unicode composition, avagraha and final-m conventions before comparing.
- **C8 Metre is computed on the akṣara stream.** A syllable is guru if its vowel is long, or it carries anusvāra/visarga, or a conjunct follows — including a conjunct that begins the next word.
- **C9 Script parity.** Every item must round-trip Devanagari and IAST; fonts must cover rare conjuncts.
- **C10 Pedagogy and tone.** Samskrita Bharati teaches Sanskrit through Sanskrit: prefer pictures and Sanskrit prompts over English, use simple standard forms, attribute verses correctly, keep religious figures out of mascot and penalty roles.

### 0.4 Content packs (referenced as D1–D11)

| Code | Pack | Notes |
|---|---|---|
| D1 | Varṇamālā table | every varṇa with class (sthāna), IAST, confusable-shape groups |
| D2 | Core lexicon | 1,500 headwords to start: citation form, gender, stem class, gloss, picture, topic, level. Seed from Padaani's 180 picture words (its own metadata says they still need a proofing pass) |
| D3 | Śabda-rūpa tables | full paradigms for ~25 model stems and pronouns, generated then human-checked |
| D4 | Dhātu-rūpa tables | ~150 common dhātus x laṭ, laṅ, lṛṭ, loṭ, vidhiliṅ x puruṣa x vacana, with pada and gaṇa; plus ktvā/tumun/kta forms |
| D5 | Sandhi engine + pair corpus | deterministic rules (svara, visarga, vyañjana) with rule names, plus curated real pairs |
| D6 | Samāsa list | compound, vigraha sentence, type |
| D7 | Sentence bank | simple verified sentences, each word tagged with role and vibhakti |
| D8 | Verse bank | subhāṣitas and Gītā verses: pāda split, pada-ccheda, anvaya, gloss, scansion |
| D9 | Number/time generator | cardinal and ordinal words, clock expressions, weekdays |
| D10 | Quiz and category bank | synonym sets, antonyms, thematic groups, literature and grammar trivia |
| D11 | Chandas table | laghu–guru patterns of the common metres |

Candidate raw sources are already vendored under `/home/claude/refs/data` (vidyut, SanskritSubanta, SanskritVerb, csl-inflect, chanda, subhāṣita-db, Gītā); each needs a licence and accuracy review before use. Recommended pipeline: generate tables at build time (vidyut is MIT-licensed, has Python bindings, and describes its metre module as experimental), have a Sanskrit reader sign off, ship static JSON. Nothing unreviewed ships.

---

## 1. Duolingo engagement and feature teardown

Tags: **MUST** (v1), **SHOULD** (soon after), **LATER**. "Local" means it works offline from device storage; "Backend" means it cannot be done honestly without a server.

### 1.1 Course structure and lessons

| Mechanic (today) | What it does | Samskuru adaptation | Tag |
|---|---|---|---|
| **Learning path**: sections → themed units → a single line of nodes with only the next node open; chests and unit trophies a few nodes apart; lesson types rotate (lesson, story, radio, practice, roleplay) | Removes the "what should I do now" decision, makes progress visible, keeps a small win always close | **Mārga**: one line per level (B, Pv first), units mirroring textbook chapters so this week's class equals this week's unit. Nodes are either a mixed lesson or an arcade game pinned to that unit's content pack | MUST · Local |
| **Guidebook / unit notes** | Just-in-time explanation without lecturing | One-screen card per unit: a paradigm table and three examples, reachable from the "?" in any game | MUST · Local |
| **Jump ahead / placement** | Stops advanced learners quitting from boredom | Ask level at first launch; short placement quiz unlocks later sections | SHOULD · Local |
| **Lesson shape**: roughly 2–5 minutes, around ten short exercises of varying format, difficulty tuned so most answers are right, mistakes recycled at the end, a flagged "hard" item to finish | Short enough to start; variety prevents fatigue; high success rate protects motivation | **Pāṭha-mālā**: 10 items, under 3 minutes, wrong items re-queued until right, last item harder | MUST · Local |
| **Arrange words / word bank** (with or without distractor tiles) | Low-friction sentence production | **Vākya-racanā**; must honour free word order (C5) | MUST · Local |
| **Tap the pairs** | Fast recognition; satisfying rhythm | Word–picture, singular–plural, dhātu–form, vigraha–compound | MUST · Local |
| **Select / complete the missing word** | Tests one grammatical choice in context | The workhorse for vibhakti and lakāra: one blank, three real forms of the same word | MUST · Local |
| **Mark the meaning / picture flashcard** | Easiest entry-level recognition | Picture-first multiple choice, no English needed (C10) | MUST · Local |
| **Translate by typing** | Forces recall and spelling | Needs an input method; offer after the Roman IME and Devanagari composer exist | SHOULD · Local |
| **Listen-and-tap / type what you hear** | Trains the ear | Requires recorded human audio; do not ship synthetic Sanskrit of doubtful quality | LATER |
| **Speak the sentence** | Pronunciation and confidence | No dependable Sanskrit speech recognition; substitute record-and-compare-with-model later | LATER |
| **Script exercises** for non-Latin scripts (match character to sound, assemble a character from parts, trace) | Makes the writing system a game in itself | Akṣara builder: consonant + mātrā → akṣara; conjunct builder (क् + ष → क्ष) | MUST · Local |

### 1.2 Economy

| Mechanic | What it does | Samskuru adaptation | Tag |
|---|---|---|---|
| **Hearts → Energy.** In 2025 the mobile apps swapped Hearts (lose one per mistake) for an Energy battery: community measurements put it near 25 units, about one unit per exercise, refilling over roughly a day, with small refunds for runs of correct answers; ads or gems top it up and subscribers are unlimited. Duolingo's stated reason was that beginners ran out of hearts about twice as often. Reception was sharply mixed | Caps free usage and drives subscription | **Do not adopt.** No session cap of any kind. Lives exist only inside arcade games (three lamps, three misses) and reset per run | MUST (to omit) |
| **XP** for every activity, with bonuses and timed boosts | One number that feeds streak goals, quests and leagues | One XP currency across all games, normalised by time and accuracy (about 10 XP for a 2–3 minute session, small accuracy bonus) so no single easy game becomes the farm | MUST · Local |
| **Gems, chests, shop, boosts** | Variable rewards; a sink for a currency | Skip currency. Use cosmetic unlocks instead (tile skins, themes, Padaani-style painting reveal) | LATER · Local |
| **Happy hours, 24-hour chests, short event windows** | Manufactured urgency | Skip; the daily puzzle already supplies a natural deadline | LATER |

### 1.3 Habit loop

| Mechanic | What it does | Samskuru adaptation | Tag |
|---|---|---|---|
| **Streak**: consecutive days with at least one lesson; a 7/14/30-day target is chosen during onboarding; big animations only at 7, 30, 100, 365. Duolingo reports that learners reaching day 7 are 3.6 times likelier to finish a course, and that lowering the bar to a single lesson kept 40% more people on a week-long streak | Converts intention into a visible commitment; early on it rewards growth, later it works through loss aversion | Any completed session or daily puzzle keeps the day. Calendar view. Call the commitment a **saṅkalpa**. Keep the copy warm, never guilt-laden | MUST · Local |
| **Streak Freeze**: applied automatically on a missed day; free users hold up to two; allowing two measurably raised daily actives without increasing days off | Slack keeps one bad day from ending the habit | Two automatic rest days (**viśrāma**), re-earned by a seven-day run | MUST · Local |
| **Earn-back** when freezes are gone | A second safety net against the "I've blown it, why bother" effect | Restore a broken streak by finishing two sessions within 48 hours | SHOULD · Local |
| **Streak Society, Perfect Streak, milestone share cards** | Status tiers; milestone cards drive organic sharing | Milestones at 7, 30, **108**, 365 with a shareable card; a "perfect week" marker | SHOULD · Local |
| **Friend Streak**: shared with up to five friends; both must practise that day; Duolingo cites a 22% higher daily completion for people with one | Social accountability, nudges from a real person | Needs accounts. Natural future form is a class streak for a weekly study group | LATER · Backend |

### 1.4 Competition and social

| Mechanic | What it does | Samskuru adaptation | Tag |
|---|---|---|---|
| **Leagues**: ten tiers Bronze to Diamond, weekly cohorts of about 30 ranked on XP, promotion slots shrinking as tiers rise, demotion at the bottom | Weekly reason to do more than the minimum; status to defend | v1: "beat your own last week" and per-game personal bests. Later: class-code leaderboards for a teacher's batch, which suit this audience better than strangers | LATER · Backend |
| **Daily Quests**: three small goals a day paying chests | Nudges variety and a slightly longer session | Three local quests drawn from the daily seed and the learner's weakest skills ("finish today's Pada-śodhaḥ", "one sandhi game", "eight vibhakti answers in a row"). In a many-game app this is the main tool for spreading play across skills | MUST · Local |
| **Friends Quests**: weekly, auto-paired partner, shared target over five days | Cooperative rather than competitive pressure | Requires backend | LATER · Backend |
| **Monthly challenge badge**: complete a quota of quests in the month | A medium-term goal between day and year | Monthly badge named for the season or festival (for example Saṃskṛta-dinam in Śrāvaṇa) | SHOULD · Local |
| **Timed challenges**: Match Madness (pair-matching over rising rounds), Ramp Up, Rapid Review; extra tries cost gems | Arcade energy inside the course; big XP | A 90-second **tvarita** mode on every matching-type game; no paid retries | MUST · Local |
| **Feed, kudos, redesigned share cards** | Lightweight social proof | Share cards only, via the Web Share API | MUST (share) · Local; feed LATER |

### 1.5 Content formats, review and mastery

| Mechanic | What it does | Samskuru adaptation | Tag |
|---|---|---|---|
| **Stories**: short dialogues with inline tasks (multiple choice, arrange, pick the word that means X, pick the phrase heard, choose the continuation, closing match-pairs) | Reading in context with characters | **Kathā**: Pañcatantra/Hitopadeśa micro-stories and classroom dialogues with the same six task types, text first | SHOULD · Local (content-heavy) |
| **DuoRadio, Adventures, Roleplay, Video Call** (the last two AI-driven, top subscription tier) | Listening and free conversation | Generated conversation conflicts with the verified-content rule; revisit when a validation path exists | LATER |
| **Practice Hub**: Mistakes, Words, Listen, Speak, replay of stories | Targeted review outside the path | **Abhyāsa** tab: mistakes collected from *every* game, Padāni word review, a "weakest skill" session | MUST · Local |
| **Spaced repetition**: half-life regression predicts when each word is about to be forgotten; a separate model picks exercises a learner will probably get right | Review arrives when it is most useful; Duolingo measured clear retention gains | Per-item scheduling keyed by lexicon ID and shared across games. Leitner five-box in v1; FSRS (open-source TypeScript implementation, four ratings, four card states) later | MUST · Local |
| **Legendary**: optional harder replay of completed material that gilds the node | Mastery goal for completionists | **Suvarṇa** run: same unit, no hints, no word bank, two mistakes allowed | SHOULD · Local |
| **Achievements and personal records**, shown as a trophy shelf, some tiered, some surprises | Collection motive; shareable moments | Sanskrit-titled badges (*Sandhi-kuśalaḥ*), per-game bests | SHOULD · Local |
| **Duolingo Score** | One comparable proficiency number | Per-skill mastery wheel over eleven skills plus an "exam readiness" estimate per level | SHOULD · Local |

### 1.6 Re-engagement and personality

| Mechanic | What it does | Samskuru adaptation | Tag |
|---|---|---|---|
| **Push notifications**: reminders, a late "last chance" streak saver, messages voiced by characters | The main channel for bringing people back | Web push needs a push service and, on iOS, an installed PWA. v1: none; offer a calendar reminder file and an install prompt | LATER · Backend |
| **Home-screen widget** whose mascot grows more anxious through the day | Ambient reminder | Not available to a PWA; skip | LATER |
| **Character cast** (Duo, Lily, Oscar the chess coach, Eddy, …) used in lessons, stories and notifications | Emotional attachment; a voice for feedback | A small cast of static illustrations: a parrot (*śuka*, the traditional talking bird), an elephant calf, a teacher. Short Sanskrit praise lines (*sādhu!*, *uttamam!*) | SHOULD · Local |
| **Onboarding**: try a lesson and set a goal before any sign-up | Value before friction | In a game within ten seconds; no account in v1; ask only level and script preference | MUST · Local |

### 1.7 Lessons from the non-language courses

| Course | Format | What to borrow | Tag |
|---|---|---|---|
| **Math** | Short lessons built on direct manipulation and practical mental arithmetic | Manipulatives for numbers and time: set the clock hands for *sapāda-pañcavādanam*; number line for cardinals | MUST (clock game) |
| **Music** | On-screen keyboard; pitch, rhythm and metre taught by playing in time | The model for chandas: tap laghu and guru in time with a verse | MUST (rhythm game) |
| **Chess** | About three-quarters puzzles, one-quarter matches against a coach bot that scales; tasks move from guided to open; player-versus-player with Elo came later | "Drill, then play": each skill has guided drills followed by an arcade round; simple bots for Uno- and chain-style games; PvP later | SHOULD |

**Backend-dependent list (defer all):** accounts and cross-device sync, leagues and class leaderboards, friend streaks and quests, push notifications, live classroom quiz, asynchronous multiplayer.

---

## 2. Popular game catalogue for adaptation

Columns: original and its hook → Sanskrit adaptation with core loop → skill and level → constraints and data → **Build** (S = hours on the shared SDK, M = a day or two, L = a week or more, or heavy authoring/backend) · **Eng**agement 1–5 · **Learn**ing value 1–5. Wave: ① first wave, ② second wave, – parked.

### 2.1 Daily word puzzles

| # | Original — why it sticks | Sanskrit adaptation — core loop | Skill · Level | Constraints · Data | Build · Eng · Learn | Wave |
|---|---|---|---|---|---|---|
| 1 | **Wordle** — one shared puzzle a day, six tries, three minutes, spoiler-free emoji share | **Pada-śodhaḥ** (पदशोधः, "word hunt"). Guess a 3-akṣara word (4–6 as harder modes) in six tries. Per tile: exact; present elsewhere; plus a split hint when only the consonant frame or only the vowel matches | Spelling, akṣara composition · B–Pv | C1 C3 C7 C9. Guesses must be lexicon words; answers from a smaller curated list in citation form. D2 | S (exists) · 5 · 3 | ① |
| 2 | **Connections** — sort 16 words into four hidden groups; red herrings; four mistakes | **Catuṣṭayam** (चतुष्टयम्, "set of four"). Sixteen padas; groups by meaning (words for water), grammar (all tṛtīyā; all laṅ) or culture (ṛtus, Pāṇḍavas) | Vocabulary + form recognition · Pv–Kv | C3 C6 (a syncretic form must not fit two grammar groups by accident). Hand-authored, validator-checked. D2 D3 D4 D10 | S engine, M content · 5 · 4 | ① |
| 3 | **Spelling Bee** — seven letters, centre letter compulsory, ranks, pangram | **Madhukośaḥ** (मधुकोशः, "honeycomb"). Seven varṇa keys (consonants and vowels); compose akṣaras by tapping consonant then vowel; every word uses the centre varṇa; rank by share of the curated answer list | Recall, composition · Pv–Sh | C2 C3 C7. Needs a large lexicon (5k+) and offline hive generation | M · 4 · 3 | ② |
| 4 | **Strands** — trace themed words through a letter grid; one word spans the board | **Sūtram** (सूत्रम्, "thread"). 6x6 akṣara grid; trace neighbours to find the day's themed words | Thematic vocabulary · Pv | C1 C3. D2 topics; generator plus hand check | M–L · 4 · 3 | ② |
| 5 | **Mini Crossword** — a 5x5 solved in a minute or two | **Laghu-pada-jālam** (लघुपदजालम्, "small word-grid"). 4x4 akṣara grid; picture, definition or fill-blank clues | Vocabulary, forms · Pv–Sh | C1: crossing cells must share a whole akṣara, so fills are scarce; expect small grids with blocks. Authored. D2 | M engine, L content · 4 · 4 | ② |
| 6 | **Letter Boxed** — chain words around a square; each starts with the last letter of the previous | **Akṣara-caturasram** (अक्षरचतुरस्रम्, "akṣara square"). Twelve akṣaras on four sides; chain words, never two in a row from one side; use all in five words or fewer | Recall; built-in antyākṣarī · Pc+ | C1 C3. Solver-generated from a large D2 | L · 3 · 3 | – |
| 7 | **Quordle** — four Wordles at once | **Catuṣpadī** (चतुष्पदी, "four words"). Four Pada-śodhaḥ boards, nine guesses | As #1 · Pv+ | Reuses #1 | S · 3 · 3 | ② |
| 8 | **Waffle** — unscramble a finished lattice by swapping tiles within a move budget | **Jāla-vinimayaḥ** (जालविनिमयः, "grid swap"). Six crossing words scrambled; restore in 15 swaps | Spelling · Pv | C1. D2; generator | M · 4 · 3 | ② |
| 9 | **Semantle / Contexto** — guess the secret word from meaning-closeness scores | **Artha-sāmīpyam** (अर्थसामीप्यम्, "nearness of meaning"). Closeness precomputed from synonym sets and thematic classes rather than a neural model | Synonymy · Sh–Kv | C3. D10 with graded relations | L · 3 · 3 | – |
| 10 | **Hangman** — letter guessing with a visible countdown | **Dīpa-rakṣā** (दीपरक्षा, "guard the lamps"). Seven lamps; guess varṇas to reveal a word or a verse quarter; consonants and vowels are guessed separately, so "ā" reveals every ā-sign | Varṇa decomposition, spelling · B–Pv | C2 C7. D2 D8 | S · 3 · 3 | ① |
| 11 | **Word search / Boggle** — pattern spotting; timed free-find | **Padānveṣaṇam** (पदान्वेषणम्, "seeking words"). Akṣara grid; find listed words (pictures as the list for beginners); a two-minute free-find mode | Recognition · B–Pv | C1 C3 (free-find scores lexicon words only). D2 | S · 3 · 2 | ② |
| 12 | **Scrabble / Words With Friends** — rack, board, premium squares, rivalry | **Akṣara-krīḍā** (अक्षरक्रीडा, "akṣara play"). Consonant tiles plus vowel-sign modifiers; versus a bot | Recall, spelling · Pc+ | C1 C3 C4 (no sandhi across plays; decide whether inflected forms count). Very large D2. Precedent: Aksharit | L · Backend for multiplayer · 4 · 3 | – |
| 13 | **Bananagrams** — race to arrange all your tiles into your own grid | **Svajālam** (स्वजालम्, "own grid"). Solo timed variant of #12 without a board | As #12 | As #12 | L · 3 · 3 | – |
| 14 | **Full crossword** — the long-form habit | **Pada-jālam** (पदजालम्). Weekly themed grid (a Gītā chapter, Rāmāyaṇa characters) | Vocabulary, literature · Sh–Kv | C1. Fully authored | L · 3 · 4 | – |
| 15 | **Cryptogram** — crack a substitution cipher on a quotation | **Gūḍha-lekhaḥ** (गूढलेखः, "hidden writing"). A subhāṣita with consonants enciphered and vowel signs intact; recurring endings are the way in. Bonus mode: decode Kaṭapayādi words into numbers | Morphological pattern sense · Pc–Kv | C2 C9. D8 | M · 3 · 3 | ② |
| 16 | **Jumble / anagram** — a quick unscramble | **Vyasta-padam** (व्यस्तपदम्, "scrambled word"). Reorder akṣaras to match a picture; five a day | Spelling · B–Pv | C1; accept every valid anagram (नदी / दीन). D2 | S · 3 · 3 | ② |
| 17 | **Text Twist** — as many words as possible from one rack against the clock | **Dhātu-vistāraḥ** (धातुविस्तारः, "root expansion"). One dhātu plus a tray of upasargas and endings; build every attested form in two minutes (gacchati, āgacchati, gatvā, gantum, āgamya …) | Derivation, upasarga, kṛdanta · Pc–Sh | C3 (attested forms only). D4 plus kṛdanta table | M · 3 · 5 | ② |

### 2.2 Tile, merge and arcade

| # | Original — why it sticks | Sanskrit adaptation — core loop | Skill · Level | Constraints · Data | Build · Eng · Learn | Wave |
|---|---|---|---|---|---|---|
| 18 | **2048** — slide, merge, one more move | **Sandhi-melanam** (सन्धिमेलनम्, "sandhi merge"; the existing prototype). Slide phoneme-string tiles; compatible neighbours fuse by a sandhi rule; build target words, or an anuṣṭubh quarter in verse mode | Sandhi · Pc–Sh | C2 C4 C8. The verse validator must accept the vipulā variants, not only the textbook pathyā pattern. D5 D8 | exists · 5 · 5 | ① |
| 19 | **Threes** — only complementary tiles merge at the bottom rung | **Prakṛti-pratyayaḥ** (प्रकृतिप्रत्ययः, "base and suffix"). A stem tile merges only with a compatible ending tile (rāma + ending → rāmeṇa); equal forms then merge up the vibhakti ladder | Declension endings · Pv | C3: forms come from tables, never string-gluing (rāmeṇa but devena). D3 | M · 4 · 4 | – |
| 20 | **Tetris** — falling pieces, clearing lines, rising speed | **Pada-pātaḥ** (पदपातः, "word fall"). Declined words fall; steer each into its vibhakti column; a full row clears. Start with three columns and add more | Vibhakti recognition · Pv | C6 (any valid column accepted). D3 | S · 4 · 4 | ① |
| 21 | **Candy Crush** — match three, cascades, level goals | **Trika-yojanam** (त्रिकयोजनम्, "joining threes"). Swap word tiles to align three that share the level's feature (case, gender or tense) | Feature recognition · Pv–Pc | C6. D3 D4 | M · 5 · 3 | ② |
| 22 | **Bejeweled** — timed gem matching | **Varga-ratnāni** (वर्गरत्नानि, "class jewels"). Akṣara gems coloured by place of articulation; match three of one varga in a 60-second blitz | Varṇamālā structure (a sandhi prerequisite) · B | C1. D1 | M · 4 · 2 | – |
| 23 | **Snake** — grow without crashing | **Sarpākṣaram** (सर्पाक्षरम्, "snake of akṣaras"; existing prototype). Eat akṣaras in order to spell the pictured word | Akṣara order, spelling · B | C1. D2 | exists · 4 · 3 | ① |
| 24 | **Flappy Bird** — one-tap, brutal, instant retry | **Śukoḍḍayanam** (शुकोड्डयनम्, "parrot flight"). A prompt such as *bālakāḥ ___* appears; each obstacle offers two labelled gaps; fly through the correct verb | Subject–verb agreement, lakāra · Pv | C3 C6. D4 D7 | S · 4 · 4 | ① |
| 25 | **Fruit Ninja** — swipe to slice, combos | **Sandhi-chedaḥ** (सन्धिच्छेदः, "sandhi split"; the Sandhi Ninja prototype). Joined words fly up; swipe through the true split point (*sūryodayaḥ* → sūrya / udayaḥ) | Sandhi analysis · Pc | C2 C4: the cut lies between varṇas, often inside an akṣara, so render a varṇa-spaced view. D5 | S–M · 5 · 4 | ① |
| 26 | **Breakout / Arkanoid** — paddle, ball, bricks, power-ups | **Iṣṭikā-bhedaḥ** (इष्टिकाभेदः, "brick breaking"). Bricks hide the words of a subhāṣita; catch falling words in prose order for a bonus | Verse familiarity · Pv–Pc | C5. D8 | M · 4 · 2 | ② |
| 27 | **Crillion** — see note below | **Varṇa-golaḥ** (वर्णगोलः, "colour/letter ball"). The ball carries a category shown by colour and label (masculine, feminine, neuter; later a case or a tense). It dissolves only word-blocks of that category; changer blocks switch it; skulls end the life; clear the screen against a draining bonus | Gender, then case and tense · Pv–Pc | C6. Hand-built levels. D2 D3 D4 | M · 4 · 4 | ① |
| 28 | **Bubble Shooter** — aim, cluster, pop | **Budbuda-kṣepaḥ** (बुद्बुदक्षेपः, "bubble shot"). Fire a word bubble at the cluster of its category; three pop | Categorisation · B–Pv | D2 D10 | M · 4 · 3 | ② |
| 29 | **Pac-Man** — maze, pursuit, power reversal | **Modaka-mārgaḥ** (मोदकमार्गः, "sweet trail"). Eat akṣaras or number words in the required order while being chased | Alphabet and number order · B | C1. D1 D9 | M · 4 · 2 | ② |
| 30 | **Doodle Jump** — endless climb | **Sopānārohaṇam** (सोपानारोहणम्, "climbing the steps"). Only the platform with the next correct item holds: next case of *rāma*, next number, next word of the verse | Paradigm and sequence recall · Pv | D3 D8 D9 | S–M · 4 · 3 | ② |
| 31 | **Whac-a-Mole** — reflex tapping with don't-hit decoys | **Akṣara-tāḍanam** (अक्षरताडनम्, "tap the akṣara"). A prompt in IAST (audio later); tap the matching Devanagari among look-alikes (घ/ध, भ/म, ब/व). Later packs: tap only neuter nouns, only past-tense verbs | Script recognition · B (then Pv) | C1 C9. D1 D2 | S · 4 · 4 | ① |
| 32 | **Suika (Watermelon) Game** — drop, physics, merge up a chain; chaos makes stories | **Phala-melanam** (फलमेलनम्, "fruit/result merge"). Drop vowel-fruits; touching pairs fuse by vowel sandhi (a+a→ā, a+i→e, a+u→o, a+e→ai) into a larger fruit | Svara-sandhi table · Pc | C2. Unlike Suika, unlike pairs merge. D5. Needs a physics engine | M–L · 5 · 3 | ② |
| 33 | **ZType / TypeRacer** — type to shoot; race a text | **Lekhana-vegaḥ** (लेखनवेगः, "writing speed"). Words descend; type them through the Roman-to-Devanagari input engine; race mode against your own ghost on a subhāṣita | Spelling, input fluency · Pv+ | C7 C9. Needs the IME. D2 D8 | M · 3 · 3 | ② |

**Crillion, confirmed.** A Commodore 64 game by Oliver Kirwa, published through Markt & Technik's *Happy Computer* magazine; the sources I found date it to 1988 rather than 1987, with Plus/4 and Amiga versions and a later "Crillion '93". It is a paddle-less Breakout: the ball bounces up and down by itself and the player only nudges it sideways. The ball removes only blocks of its own colour; special blocks recolour it; "slider" blocks shift one cell when hit in the matching colour; skull blocks cost a life; there are 25 single-screen levels and a time bonus. The appeal is route-planning under arcade pressure, which maps cleanly onto "only words of the current grammatical category can be cleared".

### 2.3 Logic

| # | Original — why it sticks | Sanskrit adaptation — core loop | Skill · Level | Constraints · Data | Build · Eng · Learn | Wave |
|---|---|---|---|---|---|---|
| 34 | **Sudoku** — pure deduction | **Rūpa-sudoku** (रूपसुडोकु). The nine symbols are the nine forms of one verb in one tense (3 persons x 3 numbers); Devanagari digits for beginners | Paradigm familiarity, numerals · B–Pv | D4 | S · 3 · 3 | ② |
| 35 | **Kakuro** — crossword of sums | **Saṅkhyā-yogaḥ** (सङ्ख्यायोगः, "number sum"). Clue totals as number words, entries in Devanagari digits | Number words · Pv | D9 | M · 2 · 2 | – |
| 36 | **Nonogram** — reveal a picture from run counts | **Citra-saṅketaḥ** (चित्रसङ्केतः, "picture clues"). Clues in Devanagari numerals; then name the revealed object | Numerals, one noun · B | D2 | M · 3 · 1 | – |
| 37 | **LinkedIn Queens** — one crown per row, column and region | **Rājñī-sthāpanam** (राज्ञीस्थापनम्). Sanskrit interface only | None beyond immersion | — | M · 4 · 1 | – |
| 38 | **LinkedIn Tango** — balance two symbols, never three in a row | **Laghu-guru-tulā** (लघुगुरुतुला, "light–heavy balance"). The symbols are । and ऽ | Metrical notation only · Kv | — | S–M · 3 · 1 | – |
| 39 | **LinkedIn Zip** — one path through numbered checkpoints covering every cell | **Krama-mārgaḥ** (क्रममार्गः, "path in order"). Checkpoints are the words of a verse in order, or number words | Verse order, numbers · Pv | D8 D9; generator | M · 4 · 3 | ② |
| 40 | **LinkedIn Pinpoint** — guess the category from clues revealed one at a time | **Vargānumānam** (वर्गानुमानम्, "guess the class"). Five clue words; fewer clues means a better score; answer from six options | Vocabulary, grammar classes · Pv–Kv | C3. D10 | S · 4 · 4 | ② |
| 41 | **LinkedIn Crossclimb / word ladder** — solve clues, then order the words so neighbours differ by one letter | **Sopāna-padāni** (सोपानपदानि, "ladder words"). Neighbours differ by one varṇa (kāla → bāla → bāṇa) | Minimal pairs, vocabulary · Pv–Pc | C2. Ladders precomputed from D2; supply is thin | M–L · 3 · 3 | ② |
| 42 | **Minesweeper** — risk and inference | **Doṣānveṣaṇam** (दोषान्वेषणम्). Counts in Devanagari digits | Numerals only | — | S · 3 · 1 | – |
| 43 | **Mastermind** — deduce a hidden code from feature feedback | **Rūpa-rahasyam** (रूपरहस्यम्, "the secret form"). The secret is a grammatical analysis (for a noun: case, number, gender; for a verb: tense, person, number). Guess with real forms; feedback says how many features match | Morphological analysis · Pv–Pc | C6. D3 D4 | M · 4 · 5 | ② |
| 44 | **KenKen** — arithmetic cages | **Gaṇita-koṣṭhakam** (गणितकोष्ठकम्). Targets as number words; operations named *yogaḥ, viyogaḥ, guṇanam, bhāgaḥ* | Number words | D9 | M · 2 · 2 | – |
| 45 | **Tower of Hanoi** — recursive stacking | **Brahma-stambhaḥ** (ब्रह्मस्तम्भः). Discs labelled in case or number order | Sequence only | D3 D9 | S · 2 · 1 | – |

LinkedIn's line-up (Pinpoint, Queens and Crossclimb from May 2024; later Tango, Zip, Mini Sudoku, Patches and the word-path game Wend) confirms that once-a-day, under-five-minute logic puzzles hold a professional adult audience. For Samskuru the pure-logic ones score low on learning and are parked; Pinpoint and Zip are the two worth adapting.

### 2.4 Card, memory and board

| # | Original — why it sticks | Sanskrit adaptation — core loop | Skill · Level | Constraints · Data | Build · Eng · Learn | Wave |
|---|---|---|---|---|---|---|
| 46 | **Memory / Concentration** — flip two, remember positions | **Smṛti-yugalam** (स्मृतियुगलम्, "memory pair"). Pairs are word–picture, word–gloss, singular–plural, dhātu–form, or split–joined | Vocabulary (any pairing) · B–Pc | C3 C9. D2–D5 | S · 4 · 3 | ① |
| 47 | **Solitaire (Klondike)** — ordering under hidden information | **Vibhakti-patrāṇi** (विभक्तिपत्राणि, "case cards"). Four model stems are the suits; the eight singular case-forms in order are the ranks; build each stem from prathamā to sambodhana | Paradigm order · Pv | C6 (identical forms need rank labels). D3 | M · 4 · 4 | ② |
| 48 | **Uno** — match one attribute; action cards; shout on the last card | **Ekam!** (एकम्!, "one!"). Cards are declined words; play one that matches the top card in case, number or gender; versus bots | Feature recognition under speed · Pv | C6. D3 | M · 4 · 4 | ② |
| 49 | **Set** — find three cards alike or all different on each of four features | **Rūpa-trikam** (रूपत्रिकम्, "triad of forms"). The deck is 3 dhātus x 3 tenses x 3 persons x 3 numbers = 81 verb forms, the exact size of a Set deck | Verb analysis · Pv–Pc | C3. Choose three regular dhātus with no clashing forms. D4 | S · 4 · 5 | ① |
| 50 | **Dominoes** — chain matching ends | **Śṛṅkhalā** (शृङ्खला, "chain"). Each tile has a word and an unrelated gloss or picture; join gloss to word; a sandhi variant joins final and initial sounds | Vocabulary, sandhi contexts · B–Pc | D2 D5 | S–M · 3 · 3 | ② |
| 51 | **Snakes and Ladders** — pure luck, family play | **Mokṣa-paṭam** (मोक्षपटम्). Its Indian ancestor, with ladders as virtues and snakes as vices. A correct answer climbs the ladder or dodges the snake; dice read out in Sanskrit; pass-and-play | Mixed review, numbers · B–Pv | C10. D10 D9 | S · 3 · 3 | ② |
| 52 | **Bingo / Tambola** — listen, mark, shout | **Saṅkhyā-paṭṭikā** (सङ्ख्यापट्टिका, "number card"). The caller shows a number word (*saptatriṃśat*); mark ३७ on your card. Word mode: caller shows a picture, mark the word. Teacher-caller mode for class | Numbers 1–100, vocabulary · B–Pv | C9. D9 D2 | S · 4 · 4 | ① |
| 53 | **Jigsaw / sequencing** — restore order from fragments | **Śloka-yojanam** (श्लोकयोजनम्, "verse assembly"). Put four shuffled quarters of the daily subhāṣita in order; next stage, its words into prose order; then meaning check | Subhāṣita, anvaya · Pv–Sh | C4 C5 C8. D8 | S · 4 · 4 | ① |

### 2.5 Quiz and party

| # | Original — why it sticks | Sanskrit adaptation — core loop | Skill · Level | Constraints · Data | Build · Eng · Learn | Wave |
|---|---|---|---|---|---|---|
| 54 | **Jeopardy!** — category board, rising values | **Praśna-mañcaḥ** (प्रश्नमञ्चः, "quiz stage"). Five skill categories x five values; solo or two teams on one device | Mixed · all | D10 | S–M · 3 · 3 | ② |
| 55 | **Kahoot!** — live class quiz, speed points, podium | **Kakṣyā-spardhā** (कक्ष्यास्पर्धा, "class contest"). Teacher projects; students answer on phones | Mixed · all | Backend (real-time). Stop-gap: shared room code yields the same seeded question set, self-reported scores | L · 5 · 3 | ② |
| 56 | **Who Wants to Be a Millionaire** — a ladder of rising stakes with lifelines | **Koṭipatiḥ** (कोटिपतिः, "crorepati"). Fifteen questions climbing from Beginner to Kovida; three lifelines (remove two, hint, swap) | Mixed · all | C3. D10 with difficulty tags | S · 4 · 3 | ① |
| 57 | **Heads Up!** — phone on forehead, friends give clues | **Śiraḥ-saṅketaḥ** (शिरःसङ्केतः, "head clue"). The word shows on the phone; friends describe it in Sanskrit only; tilt to score | Spoken fluency · B–Pc | C10. D2; device-tilt sensor | S–M · 4 · 4 | ② |
| 58 | **Antakshari** — start with the previous item's last sound | **Antyākṣarī** (अन्त्याक्षरी). Word mode: answer the bot's word with a lexicon word beginning with its final akṣara, no repeats, 15-second clock. Verse mode: pick the verse that begins correctly | Recall, akṣara awareness · B–Sh | C1 C3 C7 (a convention for final visarga/m). D2 D8 | S–M · 4 · 4 | ① |
| 59 | **Daily trivia** — five quick questions | **Jñāna-parīkṣā** (ज्ञानपरीक्षा). Five seeded questions a day | Mixed | D10 | S · 3 · 3 | – (covered by #56 and quests) |
| 60 | **Flashcards (Quizlet / Anki)** — know / don't know, spaced review | **Padāni** (पदानि, "words"; existing prototype). Picture cards, painting reveal, wired to the shared scheduler | Vocabulary · B–Pv | C9; proof the existing 180 words. D2 | exists · 3 · 5 | ① |
| 61 | **Samasyā-pūraṇam** — the traditional poets' pastime of completing a verse | **Samasyā-pūraṇam** (समस्यापूरणम्). Three quarters are given; choose the true fourth from metrically valid alternatives | Verse memory, metre · Sh–Kv | C8. D8 | S · 3 · 4 | ② |

### 2.6 Rhythm

| # | Original — why it sticks | Sanskrit adaptation — core loop | Skill · Level | Constraints · Data | Build · Eng · Learn | Wave |
|---|---|---|---|---|---|---|
| 62 | **Guitar Hero / rhythm tap** — hit notes on the beat; streak multipliers | **Chando-layaḥ** (छन्दोलयः, "metre rhythm"). Akṣaras of a verse cross a line one by one; tap for laghu, hold for guru. Stage one is untimed scansion; stage two adds tempo | Laghu/guru, then metres · Pc–Kv | C1 C8. Scansion precomputed and reviewed. D8 D11 | M · 4 · 5 | ① |
| 63 | **Simon** — repeat a growing sequence | **Anukaraṇam** (अनुकरणम्, "imitation"). Repeat growing light–heavy patterns that turn out to be named metres | Metre patterns · Kv | D11 | S · 3 · 3 | – |

### 2.7 Duolingo-format modules

| # | Original | Sanskrit adaptation — core loop | Skill · Level | Constraints · Data | Build · Eng · Learn | Wave |
|---|---|---|---|---|---|---|
| 64 | **Duolingo lesson** | **Pāṭha-mālā** (पाठमाला, "garland of lessons"). Ten mixed exercises drawn from one unit and the review queue | All · B–Pv first | C3 C5 C6. All packs | M (it is the exercise engine) · 4 · 5 | ① |
| 65 | **Word-bank sentence builder** | **Vākya-racanā** (वाक्यरचना, "sentence making"). Picture or prompt; assemble the sentence from tiles including two wrong-form distractors | Sentence building, case use · B–Pc | C5 C6. D7 | S · 3 · 5 | ① |
| 66 | **Match Madness** | **Samāsa-setuḥ** (समाससेतुः, "compound bridge"). Timed rounds pairing each vigraha (*rājñaḥ puruṣaḥ*) with its compound (*rājapuruṣaḥ*); bonus tap on the compound type | Samāsa · Pc recognition, Kv proper | C3 C4. D6 | S · 4 · 4 | ① |
| 67 | **Duolingo Math manipulative** | **Kaḥ samayaḥ?** (कः समयः?, "what time is it?"). Drag clock hands to match *sārdha-pañcavādanam*, or pick the phrase for a shown clock | Time, numbers · B–Pv | D9 (rule-generated) | S · 3 · 4 | ① |
| 68 | **Duolingo Stories** | **Kathā** (कथा). Tap-through story with inline questions | Reading · Pv–Sh | C4 C10. Authored | M engine, L content · 4 · 5 | ② |

Sixty-eight formats in total.

---

## 3. Ranked recommendation

### 3.1 First wave — 22 games to build now

Selection rules: each skill area has at least one game; styles are mixed (4 daily, 7 arcade, 6 puzzle/card, 5 lesson-style); every game runs client-side from static, reviewed data; each is a few hours of work on a shared SDK (tile renderer, akṣara utilities, seed, scoring, event log). Ordered by priority.

| # | Game | Format | Skill | Level | Style |
|---|---|---|---|---|---|
| 1 | Pada-śodhaḥ | Wordle | Akṣara spelling, vocabulary | B–Pv | Daily |
| 2 | Pāṭha-mālā | Duolingo lesson | Mixed, path backbone | B–Pv | Lesson |
| 3 | Padāni | Flashcards + SRS | Vocabulary | B–Pv | Lesson |
| 4 | Sandhi-melanam | 2048 | Sandhi | Pc–Sh | Merge |
| 5 | Catuṣṭayam | Connections | Vocabulary and grammar classes | Pv–Kv | Daily |
| 6 | Vākya-racanā | Word bank | Sentence building | B–Pc | Lesson |
| 7 | Pada-pātaḥ | Tetris-style sorter | Vibhakti | Pv | Arcade |
| 8 | Śukoḍḍayanam | Flappy Bird | Kriyāpada agreement, lakāra | Pv | Arcade |
| 9 | Rūpa-trikam | Set | Kriyāpada analysis | Pv–Pc | Card puzzle |
| 10 | Sandhi-chedaḥ | Fruit Ninja | Sandhi splitting | Pc | Arcade |
| 11 | Akṣara-tāḍanam | Whac-a-Mole | Script recognition | B | Arcade |
| 12 | Sarpākṣaram | Snake | Akṣara order, spelling | B | Arcade |
| 13 | Śloka-yojanam | Jigsaw / ordering | Subhāṣita, anvaya | Pv–Sh | Daily |
| 14 | Chando-layaḥ | Rhythm tap | Chandas (laghu/guru) | Pc–Kv | Rhythm |
| 15 | Samāsa-setuḥ | Match Madness | Samāsa | Pc–Kv | Timed match |
| 16 | Saṅkhyā-paṭṭikā | Bingo / Tambola | Numbers | B–Pv | Board |
| 17 | Kaḥ samayaḥ? | Clock manipulative | Time | B–Pv | Lesson |
| 18 | Varṇa-golaḥ | Crillion | Liṅga, then vibhakti/lakāra | Pv–Pc | Arcade puzzle |
| 19 | Smṛti-yugalam | Memory | Vocabulary pairs | B–Pc | Card |
| 20 | Antyākṣarī | Antakshari | Vocabulary recall | B–Sh | Party / bot |
| 21 | Koṭipatiḥ | Millionaire | Quiz across all skills | All | Quiz |
| 22 | Dīpa-rakṣā | Hangman | Varṇa-level spelling | B–Pv | Daily-capable |

**Rationale.**

1. **Pada-śodhaḥ.** The proven daily ritual and the share-grid generator that markets everything else. The prototype already exists with an akṣara model and Roman input engine; the work is confirming conjunct handling, curating the answer list and wiring the shared seed.
2. **Pāṭha-mālā.** This is the exercise engine (pairs, fill-blank, picture choice, word bank, akṣara builder) packaged as a ten-item lesson, and the path cannot exist without it. It also gives every other pack a default, low-stress way to be practised.
3. **Padāni.** Already built and credited to Samskrita Bharati's picture dictionary; it becomes the face of the spaced-repetition scheduler. Its word list must be proofed first, because every vocabulary game will draw from it.
4. **Sandhi-melanam.** The flagship and the most original idea in the portfolio, with a rule engine and tests already in place. Port it onto the shared shell and make sure its verse mode tolerates legitimate metrical variants.
5. **Catuṣṭayam.** A second daily with a different mental flavour (grouping rather than spelling) that scales from Pravesha to Kovida by changing categories. The engine is trivial; value lies in well-crafted, validator-checked puzzles, so start authoring early.
6. **Vākya-racanā.** Sentence production is the gap between class and real use that the founding deck describes. Tile-based building needs no keyboard, and role-tagged sentences make free word order checkable by rule.
7. **Pada-pātaḥ.** Vibhakti recognition is the core Pravesha skill and currently has no prototype. Falling-word sorting gives hundreds of fast, low-stakes repetitions from a generated paradigm table.
8. **Śukoḍḍayanam.** One-tap arcade play applied to the most common beginner error, verb–subject agreement. Content is a prompt plus two real forms, generated from the dhātu table.
9. **Rūpa-trikam.** The 81-card verb deck is a perfect structural match with Set, so the game needs no content authoring at all. Finding a set forces attention to person, number and tense at once, which drill formats rarely achieve.
10. **Sandhi-chedaḥ.** Splitting is the reading-side counterpart to the merging practised in the 2048 game, and the one Parichaya students need for verse work. The prototype exists; the main design task is showing a cut that falls inside an akṣara.
11. **Akṣara-tāḍanam.** True beginners need script fluency before anything else, and look-alike discrimination is best trained by fast forced choice. The same shell later hosts "tap only the neuter nouns" packs.
12. **Sarpākṣaram.** Exists; teaches left-to-right akṣara sequencing of whole words with pictures. Good first-session game for children and SAFL students.
13. **Śloka-yojanam.** A daily subhāṣita gives cultural reward and a reason to share that pure grammar cannot. Three stages (order the quarters, order the words, confirm the meaning) carry one verse from Pravesha to Shiksha difficulty.
14. **Chando-layaḥ.** Metre is the most distinctive thing Sanskrit offers a rhythm game, and the untimed scansion stage is useful from Parichaya onwards even though chandas is examined at Kovida. Syllable weights are fully deterministic, so content is safe.
15. **Samāsa-setuḥ.** Gives samāsa a first-wave presence at recognition level with a small curated list of perhaps 150 transparent compounds. The timed pair-matching shell is shared with other packs.
16. **Saṅkhyā-paṭṭikā.** Numbers are taught early and drilled rarely; Tambola is culturally familiar and works with a teacher as caller in a weekly class. Entirely rule-generated.
17. **Kaḥ samayaḥ?** Telling the time with *sapāda, sārdha, pādona* is a staple of spoken-Sanskrit camps and is ideal for a direct-manipulation clock. Rule-generated and tiny.
18. **Varṇa-golaḥ.** An unusual arcade-puzzle that makes grammatical gender tangible, with a name that puns on *varṇa*. It needs hand-made levels, so ship ten and let contributors add more.
19. **Smṛti-yugalam.** The cheapest game to build and the most flexible content host: any two-column table becomes a deck. Useful for families and young learners.
20. **Antyākṣarī.** A game the audience already knows by name, tied to the akṣara concept, playable against a simple bot or aloud in class. It trains free recall, which recognition games do not.
21. **Koṭipatiḥ.** One quiz shell that samples every skill, giving learners a sense of the road from Beginner to Kovida. It also consumes the trivia bank that quests and class modes will reuse.
22. **Dīpa-rakṣā.** Guessing consonants and vowels separately teaches that an akṣara is built from varṇas, the idea underneath sandhi. Small, relaxing, and a good home for a verse quarter of the day.

Suggested build order: shared SDK and D1–D4 → games 1, 2, 3, 6, 7, 11 (the Beginner/Pravesha core) → ports 4, 10, 12 → the rest.

### 3.2 Second wave — 26 for later contributors

1. **Rūpa-rahasyam (Mastermind).** Highest learning value outside wave one: every guess is a full morphological analysis. Held back only because feedback design for syncretic forms needs care.
2. **Vibhakti-patrāṇi (Solitaire).** A relaxed long session for adults that rehearses paradigm order. A day or two of work for a contributor who knows Klondike rules.
3. **Ekam! (Uno).** The natural family and classroom card game for case, number and gender. Needs simple bot players first and real multiplayer later.
4. **Vargānumānam (Pinpoint).** A third daily with tiny authoring cost per puzzle. Reuses the category bank from Catuṣṭayam.
5. **Rūpa-sudoku.** Standard generator, new symbol set; keeps a paradigm in view for ten minutes. Good low-effort starter task.
6. **Kathā (Stories).** The main route to connected reading. Engine is modest; the cost is authoring and reviewing stories.
7. **Dhātu-vistāraḥ (Text Twist).** Excellent for prefixes and kṛdantas at Parichaya and Shiksha. Waits on a verified derived-form table.
8. **Madhukośaḥ (Spelling Bee).** Strong daily habit, but needs a much larger lexicon and offline hive generation to guarantee enough answers.
9. **Trika-yojanam (match-3).** The most commercially proven casual loop, useful for volume recognition practice. Level design takes time.
10. **Phala-melanam (Suika).** A physical, funny way to absorb the vowel-sandhi table. Needs a physics library and tuning.
11. **Jāla-vinimayaḥ (Waffle).** Compact daily that reuses Wordle tiles. Needs a lattice generator over akṣaras.
12. **Catuṣpadī (Quordle).** Almost free once Pada-śodhaḥ is solid. Serves keen players.
13. **Padānveṣaṇam (word search).** Easy, child-friendly, printable for class. Low learning value, so not earlier.
14. **Vyasta-padam (Jumble).** Trivial to build on the tile renderer. A good warm-up inside lessons too.
15. **Laghu-pada-jālam (mini crossword).** High prestige and good learning, but akṣara crossings make grids hard to fill. Needs a constructor tool and editors.
16. **Sūtram (Strands).** Themed vocabulary with a pleasing reveal. Generation plus hand review per puzzle.
17. **Krama-mārgaḥ (Zip).** Light verse-order practice in a logic wrapper. Standard path generator.
18. **Sopāna-padāni (word ladder).** Sharpens attention to single-sound differences. Limited by how many clean ladders the lexicon yields.
19. **Gūḍha-lekhaḥ (cryptogram and Kaṭapayādi).** Appeals to puzzle enthusiasts and introduces a genuine Sanskrit encoding tradition. Niche.
20. **Samasyā-pūraṇam.** A traditional literary game for upper levels. Needs careful distractor verses.
21. **Mokṣa-paṭam (Snakes and Ladders).** Heritage value and pass-and-play for families. Mostly art and a question feed.
22. **Śṛṅkhalā (Dominoes).** Simple chain matching with a sandhi variant. Good small contribution.
23. **Śiraḥ-saṅketaḥ (Heads Up).** The only format here that makes people speak Sanskrit to each other. Needs motion-sensor permissions handled well.
24. **Praśna-mañcaḥ (Jeopardy) and Kakṣyā-spardhā (Kahoot).** Class-night formats that teachers will ask for. The live version is the first real reason to add a backend.
25. **Lekhana-vegaḥ (typing).** Builds input fluency for learners who will write Sanskrit. Depends on the shared input engine being robust.
26. **Budbuda-kṣepaḥ, Sopānārohaṇam, Modaka-mārgaḥ, Iṣṭikā-bhedaḥ (Bubble Shooter, Doodle Jump, Pac-Man, Breakout).** Four arcade skins that reuse existing packs. Fun and contributor-friendly, but modest learning value, so they follow the rest.

Parked for now: Scrabble-style play, Bananagrams, full crossword, Letter Boxed, Semantle, Threes, Bejeweled, and the pure-logic set (Queens, Tango, Kakuro, KenKen, Nonogram, Minesweeper, Hanoi, Simon).

---

## 4. Cross-cutting platform features

**Daily puzzle seed.** Puzzle number = whole days since a fixed epoch in the player's local date, as Wordle does. The number indexes a pre-authored, pre-validated list shipped in the bundle; it never drives free generation. Where shuffling is needed, use a seeded generator keyed on puzzle number and game ID. Provide an archive, and a practice mode that does not affect streak statistics.

**Share cards.** One formatter for every game: Devanagari game name, puzzle number, score line, an emoji grid that reveals nothing, the streak and a link. Example: `पदशोधः #212 · 4/6` followed by rows such as 🟩🟨⬜. Use the Web Share API with clipboard fallback; add shapes as well as colours for colour-blind players. Image cards for milestones later.

**Streak.** One app-wide streak (any finished session or daily puzzle), two automatic rest days, a 48-hour earn-back, a calendar. Add per-daily-game streak counts as secondary numbers. Never shame the learner.

**XP and quests.** One time-normalised XP currency, three seeded daily quests weighted to weak skills, a weekly self-comparison instead of leagues.

**Per-skill mastery.** Eleven skills (akṣara, śabda/vocabulary, vibhakti, kriyāpada, sandhi, samāsa, vākya, chandas, subhāṣita, saṅkhyā/samaya, general knowledge). Every game reports the same events (item seen, correct or wrong, response time) with lexicon or rule IDs into one local log; mastery bars and the Mistakes queue are computed from it.

**Spaced repetition.** Item-level scheduling shared by all games: an item answered in the Tetris-style sorter updates the same record that the flashcards read. Start with five Leitner boxes; move to FSRS once there is enough data.

**Script toggle.** Devanagari is the default; IAST is a global setting and a per-tile long-press peek. Store both forms for every item and verify round-trips at build time. In IAST mode a tile is still one akṣara.

**Input.** Prefer tapping tiles; most first-wave games need no typing. For typing provide (a) an on-screen akṣara composer — consonant grid, vowel-sign row, halanta key for conjuncts, anusvāra and visarga — and (b) the Roman input engine already written for the Wordle prototype, accepting IAST and a common ASCII scheme. Normalise input before comparison (C7).

**Akṣara utilities and fonts.** One shared library for segmentation, varṇa decomposition, syllable weight, transliteration and normalisation, with test vectors covering conjuncts, repha, avagraha and final halanta. Bundle a Devanagari web font with strong conjunct coverage and cache it offline; test rare clusters on low-end Android.

**Storage and offline.** Service-worker app shell with all content cached; IndexedDB for the event log, small key-value storage for preferences. Request persistent storage, and steer iPhone users to install to the home screen: Safari can purge script-written storage for sites left unused for seven days of browser use, while installed web apps keep their own usage clock. Offer export and import of progress as a file until accounts exist.

**Accessibility.** Large tiles (Devanagari needs more height than Latin), adjustable text size, high-contrast and colour-blind palettes, reduced-motion setting, full keyboard play, screen-reader labels with the language marked as Sanskrit, a one-handed layout, and an untimed "śānta" mode for every arcade game.

**Content governance.** Every item carries its source, level and reviewer. Items marked for review are excluded from builds. A validator runs in continuous integration: lexicon membership, paradigm consistency, script round-trip, puzzle solvability and uniqueness.

**Game SDK contract for contributors.** Each game is a self-contained module with a manifest (ID, Sanskrit and English names, skills, levels, required packs, modes). It receives a seed, content and settings, and returns standard events and a session result. This is what makes "open to contribution" practical.

**Class mode.** No-login teacher view for projector use (caller in Tambola, quiz host), plus printable versions of the daily puzzles.

**Audio (later).** Recorded human pronunciation keyed by lexicon ID, chanted verses for the rhythm game, then listening exercises. Until then, no game should depend on sound.

**Backend (later).** Accounts and sync, class leaderboards, friend or class streaks, push reminders, live quiz rooms, optional privacy-respecting analytics.

---

## 5. Landscape notes

- **Existing Sanskrit game sites are broad but shallow.** One site lists over seventy mini-games covering sandhi, vibhakti, metre and more; The Sanskrit Channel's Krida offers six polished word games (word search, clue grid, matching, jumbles, spelling, quizzes); the Samskrit Promotion Foundation's Android app has about ten children's activities behind phone-number registration and roughly a thousand installs. None was seen offering a shared daily puzzle, share cards, cross-game progress or an explicit Samskrita Bharati level map — Samskuru's differentiators.
- **Earlier Sanskrit Wordle attempts** on the sanskrit-programmers list ran into exactly the issues coded above: how to count letters, halanta endings, conjunct conventions, confusing feedback for repeated akṣaras, and thin word lists that rejected valid inflected forms. A Kannada version solved feedback with separate consonant and vowel hints, which this document adopts.
- **Verse validation.** The schoolbook anuṣṭubh rule (fifth syllable light, sixth heavy, seventh alternating) describes only the normal form; roughly a tenth of classical half-verses use accepted variants. Any "build a verse" mode must allow them or restrict itself to curated verses.

---

## Sources

Duolingo
- [Duolingo blog — Energy](https://blog.duolingo.com/duolingo-energy/)
- [Duolingo Wiki — Energy](https://duolingo.fandom.com/wiki/Energy)
- [Duolingo Guides — Energy system explained (2026)](https://duolingoguides.com/?p=7320)
- [Deconstructor of Fun — Duolingo teardown index](https://duolingo.deconstructoroffun.com/)
- [Deconstructor of Fun — Streaks](https://duolingo.deconstructoroffun.com/mechanics/streaks)
- [Deconstructor of Fun — Leagues](https://duolingo.deconstructoroffun.com/mechanics/leagues)
- [Deconstructor of Fun — Lesson Path](https://duolingo.deconstructoroffun.com/mechanics/lesson-path)
- [Deconstructor of Fun — How Duolingo uses gaming principles (2025)](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth)
- [Duolingo blog — How the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit)
- [Mobbin — Streaks are about losing: a study of 859 streak designs](https://mobbin.com/blog/streaks-are-about-losing-a-study-of-859-streak-designs)
- [Duoplanet — Friend streaks](https://newsletter.duoplanet.com/posts/duolingos-got-a-new-type-of-streak)
- [Duolingo blog — Friends Quests](https://blog.duolingo.com/friends-quests/)
- [Duolingo Guides — Quests](https://duolingoguides.com/what-is-a-quest-in-duolingo/)
- [Lingoly — Timed challenges](https://lingoly.io/duolingo-timed-challenges/)
- [Duolingo blog — Practice Hub guide](https://blog.duolingo.com/guide-to-duolingo-practice-hub/)
- [Duolingo blog — Duolingo 101](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo)
- [Duolingo blog — Product highlights](https://blog.duolingo.com/product-highlights/)
- [Duolingo Wiki — Exercise types](https://duolingo.fandom.com/wiki/Exercise)
- [Duostories — Story exercise types](https://duostories.org/docs/story-editing/exercises)
- [Duolingo blog — Achievement badges](https://blog.duolingo.com/achievement-badges)
- [Duolingo blog — How we learn how you learn (half-life regression)](https://blog.duolingo.com/how-we-learn-how-you-learn)
- [Duolingo blog — Chess course](https://blog.duolingo.com/chess-course)
- [Duolingo Guides — Chess course explained](https://duolingoguides.com/duolingo-chess-course-explained/)
- [Duolingo investor release — Music and Math](https://investors.duolingo.com/news-releases/news-release-details/duolingo-launches-music-and-math-its-flagship-app)
- [ts-fsrs README](https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/README.md)

Games
- [Wikipedia — The New York Times Games](https://en.wikipedia.org/wiki/The_New_York_Times_Games)
- [Wikipedia — Wordle](https://en.wikipedia.org/wiki/Wordle)
- [Beebom — All LinkedIn games explained](https://beebom.com/puzzle/all-linkedin-games-explained/)
- [Wikipedia — LinkedIn](https://en.wikipedia.org/wiki/LinkedIn)
- [C64-Wiki — Crillion](https://www.c64-wiki.com/wiki/Crillion)
- [MobyGames — Crillion](https://www.mobygames.com/game/49572/crillion/)
- [shdon.com — Crillion remake notes](https://shdon.com/software/games/crillion)
- [Wikipedia — Suika Game](https://en.wikipedia.org/wiki/Suika_Game)
- [Wikipedia — Antakshari](https://en.wikipedia.org/wiki/Antakshari)
- [Wikipedia — Snakes and ladders](https://en.wikipedia.org/wiki/Snakes_and_ladders)
- [Wikipedia — Aksharit](https://en.wikipedia.org/wiki/Aksharit)
- [Wikipedia — Katapayadi system](https://en.wikipedia.org/wiki/Katapayadi_system)

Curriculum
- [Samskrita Bharati — Correspondence course](https://www.samskritabharati.in/correspondence)
- [Samskrita Bharati USA — Distance Learning adult syllabus](https://samskritabharatiusa.org/index.php/distance-learning-program/tutorials/dlp-tutorial-classes/dlp-adult-syllabus)
- [Samskrita Bharati USA — DLP exam syllabus and samples](https://dlp.samskritabharatiusa.org/dlp-exams/syllabus-and-samples)
- [Samskrita Bharati USA — SAFL overview](https://samskritabharatiusa.org/blog/safl-overview/)
- [Sanskrit Today hub — Certificate courses](https://hub.sanskrit.today/info/learning/certificate-courses)

Sanskrit games, tooling and text handling
- [Krida — The Sanskrit Channel](https://krida.thesanskritchannel.org/)
- [VidyaWhiz — Online Sanskrit games](https://vidyawhiz.com/games/)
- [Samskritakrida — Google Play](https://play.google.com/store/apps/details?id=com.samskritkreeda&hl=en)
- [SanskritPlayground](https://sanskritplayground.com/index.html)
- [sanskrit-programmers — "Sanskrit wordle anyone?"](https://groups.google.com/g/sanskrit-programmers/c/G5rv0hpyfkI)
- [Jinswara — Devanagari Wordle](https://www.jinswara.com/wordle)
- [Ambuda — vidyut toolkit](https://github.com/ambuda-org/vidyut)
- [W3C — Typographic character units in complex scripts](https://www.w3.org/International/questions/qa-indic-graphemes)
- [WebKit — Full third-party cookie blocking and more (7-day storage cap)](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- [Wikipedia — Shloka](https://en.wikipedia.org/wiki/Shloka)
