# वर्णस्थानम् · Varṇa-sthānam — Where each sound is made

| | |
|---|---|
| **Id** | `varna-sthana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | arcade — after *sorting / bucket-tap games* |
| **Skills / levels** | akshara, sandhi (prerequisite knowledge) · L0, L3 |
| **Modes** | practice · timed |
| **Session** | ~2 min, 20 cards (practice) or 60 s (timed) |
| **Build size** | S |

## Learning objective
Know the place of articulation (uccāraṇa-sthāna) of every sound: कण्ठः, तालु, मूर्धा, दन्ताः, ओष्ठौ and the mixed places. This is what makes the varṇamālā chart meaningful at L0 and what sandhi rules (savarṇa, parasavarṇa, ścutva, ṣṭutva) silently assume at L3.

## Why people come back
A 60-second personal-best run, a combo counter, and four short stages that unlock in order. It is a pure reflex drill — ideal as a warm-up.

## Core loop
1. One letter card appears above a row of place buckets.
2. Tap the bucket (or press its digit). Right → the card drops in, combo +1. Wrong → the correct bucket pulses, all letters of that place light up for a moment, combo resets, one life lost in practice mode (3 lives).
3. Stages (each a separate level-select tile, unlocked by ≥ 2 stars on the previous one):
   1. **Sparśa**: the 25 stops → five buckets.
   2. **All consonants**: adds य र ल व श ष स ह and a sixth bucket दन्तोष्ठम् (for व).
   3. **Svara**: vowels → five simple buckets plus कण्ठतालु (ए ऐ) and कण्ठोष्ठम् (ओ औ).
   4. **Prayatna**: for a consonant, a two-way choice — घोष / अघोष, or अल्पप्राण / महाप्राण, or "is it anunāsika?".
4. Practice ends after 20 cards (`completed`) or at 0 lives (`lost`); timed ends at 0 s (`completed`).

## Sanskrit rules
- The answer key is **only** `VARNAS[i].sthana`, `ghosha`, `mahaprana`, `nasal` from `@sanskrit`. No table is typed in the game.
- Nasal stops list two places (their varga place and nāsikā). In stages 1–2 there is no nāsikā bucket: the accepted bucket is the varga place. Rule: accept any place in `sthana` that is on screen.
- Stage 4 labels (घोषः, अघोषः, अल्पप्राणः, महाप्राणः, अनुनासिकः) are fixed technical terms, listed in `content.ts` with source "Pāṇinīya-śikṣā terms as used in Samskrita Bharati primers", and checked by `validateDeva` in tests.
- Bucket names come from `STHANA_NAMES` and render through `<SaText>`.
- Letter cards are locked to Devanagari (`script="deva"`): the game teaches the script's own classification. Consonants show with inherent a (क), as in `VARNAS[i].deva`.
- Anusvāra and visarga (ayogavāha) are excluded from all stages in v1; ॠ is included in stage 3, ऌ only if `VARNAS` contains it (it does).
- Never invent mnemonics or śikṣā quotations; the "why" feedback is the list of sounds sharing the place, computed from `VARNAS`.

## Content
- Engine only: `VARNAS` (13 vowels, 33 consonants), `STHANA_NAMES`. No pack.
- Item counts: stage 1 = 25, stage 2 = 33, stage 3 = 13, stage 4 = 33 × up to 3 attributes. A session samples without replacement, refilling when exhausted, so a 20-card round never repeats a card in stages 1, 2 and 4.

## Modes, levels, scoring
- `ctx.level` 0 opens on stage 1; level ≥ 3 opens on stage 2 with all stages unlocked (the learner is here for sandhi).
- Practice: 10 points per correct + combo bonus (min(combo, 5) × 2); stars from accuracy (≥ 90 % → 3, ≥ 70 % → 2).
- Timed: 60 s via `useCountdown`; score = correct count × 10; no lives; a wrong tap costs 2 s. `best: { label: 'Most in 60 s', value }`.
- HUD: `progress` (practice), `timeLeftMs` (timed), `lives`, `combo`.
- Mastery: `akshara` · `sthana:<slp1>`; stage 4 · `ghosha:<slp1>`, `prana:<slp1>`, `nasal:<slp1>`. (SLP1 ids are case-sensitive; store them verbatim.)
- Unlocked stage is stored in `ctx.store` (`{ v: 1, stage }`).

## UX notes
Portrait: large `Tile` card (96 px) centred; buckets as a 3 × 2 grid of `Choice`-style buttons at the bottom, each ≥ 56 px tall with the Sanskrit name and a small English gloss. Digits 1–7 as hotkeys. Reduced motion: no drop animation, colour change only. `ctx.expose({ phase, card, accepted: [...] })`.

## Acceptance tests
- `logic.test.ts`: for every stage, every card has ≥ 1 accepted bucket on screen and at least one non-accepted bucket.
- `logic.test.ts`: named cases straight from the engine — क → kaṇṭha; च → tālu; ट → mūrdhā; त → danta; प → oṣṭha; ङ accepted at kaṇṭha in stage 1; व → dantoṣṭha only in stage 2; ए → kaṇṭhatālu in stage 3; ख is mahāprāṇa and aghoṣa; ग is alpaprāṇa and ghoṣa.
- `logic.test.ts`: `testMatrix([0, 3], 25)` × 4 stages — deterministic deck; no repeat within 20 cards where the pool allows.
- `logic.test.ts`: perfect bot → 20/20, 3 stars, next stage unlocks; always-wrong bot → `lost` after 3 mistakes; timed simulation with fixed `dt` ends exactly at 0 with score = 10 × correct.
- `logic.test.ts`: every fixed label passes `validateDeva`.
- `e2e.spec.ts`: perfect practice run at 390 px → result screen, stage 2 unlocked after reload; wrong tap shows the correct bucket; timed mode reaches the result screen; app script IAST still shows Devanagari cards; no console errors; no overflow.

## Out of scope / later
Audio of each sound (needs the audio capability); ābhyantara-prayatna (spṛṣṭa, īṣatspṛṣṭa …); a mouth diagram.

## Open questions
- Sanskrit reviewer: confirm the five stage-4 labels and whether ह should be taught as ghoṣa (the engine says voiced) at L0.
- Should anusvāra / visarga get their own stage?
