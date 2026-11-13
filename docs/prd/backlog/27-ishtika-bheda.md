# इष्टिकाभेदः · Iṣṭikā-bhedaḥ — Verse breakout

| | |
|---|---|
| **Id** | `ishtika-bheda` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | arcade — after *Breakout / Arkanoid* |
| **Skills / levels** | subhashita · L2–L4 |
| **Modes** | practice · endless |
| **Session** | ~4 min, one verse (four waves) |
| **Build size** | M |

## Learning objective
Learn a subhāṣita by heart through play. The bricks are the words of the verse; a broken brick drops its word, and the player must catch **only the next word of the verse** — "what comes next?" a dozen times per run. Honest note: no grammar is practised; the value is memorisation and exposure.

## Why people come back
A classic arcade loop, a new verse every run, levels that turn reading into recall, and the verse with its meaning as the reward.

## Core loop
1. A verse is chosen. Its four pādas are four waves. The **ribbon** at the top shows the pāda being built, word slot by word slot.
2. Wave *k*: the words of pāda *k* appear as bricks (shuffled positions). A ball bounces; the paddle moves with drag or arrow keys.
3. The ball breaks a brick → its word falls slowly.
   - Catch the word that belongs in the **next empty slot** → it fills the ribbon (+30).
   - Catch any other word → a lamp (life) is lost and the word returns as a brick.
   - Let a word fall past → it returns as a brick after 2 s (no penalty).
4. Missing the ball costs a lamp and relaunches. Three lamps.
5. Ribbon full → next wave. After wave 4 the whole verse is shown with its translation and one meaning question (three translations). Then `ctx.finish`: `won`, or `lost` at 0 lamps.

## Sanskrit rules
- Verse text is verbatim from `@content/subhashita`. **Bricks are the whitespace-separated chunks of a pāda exactly as stored** — sandhi-joined chunks stay whole and are never split further.
- The pack splits pādas on akṣara boundaries, so some pādas begin mid-word. A verse is eligible only if all four pādas begin and end on whitespace (or a daṇḍa / line break) in its `text`.
- Eligibility also requires every pāda to have 2–6 chunks and every chunk ≤ 8 akṣaras (`countAksharas`), so bricks fit a phone.
- Identical chunks within a pāda (काकः … काकः) are interchangeable: the catch test compares text with the next slot's text, not brick identity.
- Ribbon help by level — L2: the full pāda is shown greyed (recognition: read and catch). L3: only the first akṣara of each slot (`splitAksharas(chunk)[0]`). L4: empty slots (recall).
- Text is drawn with `renderSa` (canvas) or `<SaText>` (DOM); brick width comes from measured text.
- The meaning question's distractors are translations of other verses.

## Content
- `versesForLevel(ctx.level)` filtered as above. The pack has 135 verses, 105 in anuṣṭubh (8-syllable pādas, typically 2–4 chunks) — most should qualify.
- Minimum pool: ≥ 30 eligible verses per level (asserted, with a count of verses rejected by each rule). If L2 has fewer, the manifest starts at L3.
- Practice plays one seeded verse; endless continues with a faster ball until the lamps run out.

## Modes, levels, scoring
- Score: 10 per brick, 30 per correct catch, 50 per completed pāda, 100 per verse, +50 per lamp left.
- Stars: verse completed with 3 lamps and no wrong catch → 3; completed → 2; two pādas → 1.
- `correct` = correct catches + meaning answer; `total` = all catches + 1.
- HUD: `lives`, `score`, `progress` (slots filled).
- Mastery: `subhashita` · `<verseId>:recite` (correct = completed with no wrong catch) and `subhashita` · `<verseId>:artha`.
- `best: { label: 'Verses in a row', value }` (endless).

## UX notes
Portrait: a 9 : 12 playfield scaled to width, ribbon above (≥ 18 px text). Simulation in `logic.ts` as `step(state, dtMs, input)` with a fixed 8 ms sub-step, axis-aligned collisions and a speed cap; driven by `useRafLoop`. Paddle: pointer drag or ←/→. **Calm mode** (start-card toggle; forced under `reducedMotion`): the ball is 40 % slower and cannot be lost — the catching decision, which is the learning part, is unchanged. `ctx.announce` reads each filled slot. `ctx.expose({ phase, wave, nextChunk, bricks, falling, ball, paddle })`.

## Acceptance tests
- `logic.test.ts`: eligibility — every selected verse passes the boundary, chunk-count and chunk-length rules; joining the chunks of a pāda with spaces reproduces the pāda.
- `logic.test.ts`: named case — in काकः कृष्णः पिकः कृष्णः either कृष्णः brick fills either कृष्णः slot when it is the next slot; a कृष्णः caught when the next slot is पिकः is a wrong catch.
- `logic.test.ts`: catch rules — correct catch fills exactly one slot; wrong catch costs one lamp and restores the brick; a missed word restores the brick after 2,000 ms of simulated time.
- `logic.test.ts`: determinism — same seed and input script → identical state after 10,000 steps; no tunnelling at the speed cap.
- `logic.test.ts`: simulation over `testMatrix([2, 3, 4], 25)` — a perfect bot (tracks the ball, catches only the next chunk) wins every verse; an idle bot loses; a catch-everything bot loses by wrong catches; calm mode never loses a lamp to the ball.
- `logic.test.ts`: ribbon help per level (L3 shows first akṣara only); meaning question has one correct option.
- `e2e.spec.ts`: with an e2e autopilot flag that steers the paddle from `window.__game`, clear one pāda at 390 px, make one wrong catch (lamp lost), finish the verse and answer the meaning question → result; calm mode; IAST; no console errors; no overflow.

## Out of scope / later
Catching in prose (anvaya) order — the pack has no anvaya; power-ups; audio.

## Open questions
- Sanskrit reviewer: are whitespace chunks the right unit, given that sandhi-joined chunks can be long and opaque? Would padaccheda words (`words` in the pack) be better for L2?
- Product: should Gītā verses be excluded from an arcade setting?
