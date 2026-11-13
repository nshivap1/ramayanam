# समस्यापूरणम् · Samasyā-pūraṇam — Complete the verse

| | |
|---|---|
| **Id** | `samasya-purana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | daily — after the traditional poets' game *samasyā-pūraṇa* |
| **Skills / levels** | subhashita, chandas · L3–L5 |
| **Modes** | daily · practice |
| **Session** | daily: 1 verse (~2 min); practice: 5 verses |
| **Build size** | S |

## Learning objective
Know subhāṣitas well enough to finish them. Three pādas are given; the learner picks the true missing pāda from metrically identical alternatives — so sense, not rhythm, must decide — and then confirms the meaning. After 20 sessions some twenty verses are half-memorised and the learner reads a śloka for its argument.

## Why people come back
A verse of the day in a game with deep roots in Sanskrit literary culture; a two-square share card; a growing personal anthology of completed verses.

## Core loop
1. The verse appears with one pāda replaced by a blank line (L3: always the fourth; L4–L5: any).
2. Four candidate pādas are listed. Tap one.
   - Right → the verse completes.
   - Wrong → the option is removed, the English translation of the *given* pādas appears as a hint; one more try. A second miss reveals the answer.
3. **Meaning check**: choose the verse's translation among three.
4. Daily: `ctx.finish` after one verse. Practice: five verses, then finish. Outcome is always `completed`.

## Sanskrit rules
- Verses, pāda division, metre and translation come verbatim from `@content/subhashita`. Nothing is edited to fit.
- **Distractor pādas are real pādas of other verses** that (a) are in the same metre, (b) stand in a position of the same parity for anuṣṭubh (odd pādas replace odd, even replace even — their cadences differ), (c) have the same akṣara count (`countAksharas`), and (d) for anuṣṭubh pass `checkAnustubh(pada, index)` for the target index (so vipulā pādas are never distractors); for other metres `matchMeter(weights(pada))?.id` equals that of the true pāda.
- A pāda that occurs in more than one verse (stock phrases, refrains) is never used as answer or distractor; equality is tested on a normalised key (`normalizeDeva`, spaces removed).
- **Clean pāda boundaries.** The pack splits pādas on akṣara boundaries, so when a word or sandhi cluster runs across a boundary the next pāda begins mid-word. Pāda *k* may be cut out, or used as a distractor, only if both of its edges fall on whitespace (or a daṇḍa / line break) in the verse's `text`.
- The correct answer is "the pāda this verse actually has": attestation, not plausibility. The game never claims a distractor is ungrammatical.
- Display with `<SaText shloka nowrap={false}>`; pādas wrap between words only.
- Translation distractors are translations of other verses of similar length; no two verses with the same translation text are opposed.

## Content
- `@content/subhashita` (135 verses: `id`, `padas`, `text`, `meter`, `meterNote`, `translation`, `source`, `level`).
- A verse is eligible if at least three other eligible pādas exist under the rules above. In practice this means the 105 anuṣṭubh verses and the upajāti / vasantatilakā groups; metres with a single verse are skipped.
- Minimum pool: ≥ 60 eligible verses overall, ≥ 25 at `level ≤ 3` (asserted with a printed table). If L3 falls short the manifest lists L4–L5 only.
- Daily order: eligible verses for the level sorted by id and shuffled once with a fixed seed; day `d = puzzleNumber(ctx.dateKey)` takes item `d mod n` — no repeats for *n* days. Option order and cut position come from `createRng(ctx.seed)`.

## Modes, levels, scoring
- Per verse: pāda — 2 points first try, 1 second try, 0 revealed; meaning — 1 point. Max 3.
- Daily stars = points (0–3). Practice: stars from total / 15 (≥ 13 → 3, ≥ 9 → 2, > 0 → 1). `correct` / `total` count the two questions per verse.
- Mastery: `subhashita` · `<verseId>:pada:<k>` (correct = first try) and `subhashita` · `<verseId>:artha`.
- Share card (daily): two squares — pāda 🟩 first try / 🟨 second / 🟥 revealed; meaning 🟩 / 🟥 — e.g. `🟨🟩`. `summary` names the source ("Hitopadeśa" …) but not the verse.
- Anthology: ids of verses completed first-try in `ctx.store` (`{ v: 1, done: string[] }`); count shown on the start card and as `best: { label: 'Verses completed', value }`.

## UX notes
Portrait: verse card (four lines, the blank as a dashed box), candidate list of four `Choice` rows (each a full pāda, wrapping allowed), then the meaning question in the same layout. After completion show attribution and translation. Hotkeys 1–4. `ctx.expose({ phase, verseId, cut, answer, options })`.

## Acceptance tests
- `logic.test.ts`: for every eligible verse and cut — four options, exactly one equal to the true pāda; every distractor satisfies rules (a)–(d); no option is a multi-verse pāda.
- `logic.test.ts`: boundary rule — the predicate is true for विद्या ददाति विनयं / विनयाद्याति पात्रताम् (verse `vidya-dadati-vinayam`) and false for every pack pāda that starts mid-word; no such pāda is ever an answer or a distractor.
- `logic.test.ts`: meaning question has exactly one correct translation and three distinct options.
- `logic.test.ts`: `testMatrix([3, 4, 5], 25)` deterministic; L3 always cuts pāda 4; daily order has no repeat within *n* days.
- `logic.test.ts`: scoring — first-try + meaning = 3 stars; second-try = 🟨; two misses reveal and score 0 for the pāda; perfect bot and worst-case bot both end `completed`.
- `logic.test.ts`: eligibility table and pool assertions.
- `e2e.spec.ts`: daily perfect run at 390 px → share `🟩🟩`; wrong-then-right path shows the hint and `🟨`; anthology count persists; IAST run; long pādas wrap without overflow at 360 px; no console errors.

## Out of scope / later
Composing one's own pāda (only metre could be checked, not grammar or sense); audio recitation; anvaya display.

## Open questions
- Sanskrit reviewer: are same-metre distractors from other verses ever *too* plausible (they may make acceptable sense)? Review a sample of 30 generated puzzles before launch.
- Platform: should the pack flag clean pāda boundaries and repeated pādas itself?
