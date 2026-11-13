# `src/sanskrit` — the shared Sanskrit core

Pure TypeScript, no dependencies, no DOM / Node APIs. Every game and content
validator imports from here (`import { … } from '@sanskrit'`); nothing else in
the platform is allowed to transliterate, segment, apply sandhi or scan metre.

**Design rule: correctness beats coverage.** A function implements only what
is certain. Where the answer depends on something the input strings cannot
carry (a dual ending, an r-final word, an upasarga before a verb, a lexical
exception) the caller passes an explicit option, and otherwise the function
returns "no rule / unknown" or attaches a `note` — it never guesses.

| Module | What it does |
|---|---|
| `translit.ts` | Devanagari ⇄ SLP1 ⇄ IAST ⇄ Harvard-Kyoto, normalisation, validation, digits |
| `akshara.ts` | Orthographic akṣara segmentation and composition |
| `varna.ts` | Varṇamālā with articulatory features, Śiva-sūtras, pratyāhāras, savarṇa |
| `sandhi.ts` | External (pada) sandhi with a self-verifying rule registry; ṇatva helper |
| `chandas.ts` | Laghu / guru scansion, gaṇas, 20 sama-vṛtta metres, anuṣṭubh check |
| `numbers.ts` | Cardinals 1–100 and 1000, ordinals 1–20 (hard-coded tables) |
| `testdata.ts` | Fixtures for the tests only (not exported from `index.ts`) |

Run the tests with `node tools/test.mjs unit src/sanskrit` (about 100 tests and
38,000 assertions).

---

## Representations

**Devanagari** is the human-facing source of truth for content. **SLP1** is
the internal phonemic encoding — exactly one ASCII character per sound, so it
is the right key for comparing, slicing and rule-matching. **IAST** is the
alternate display script. Harvard-Kyoto is supported for input convenience.

### SLP1 table

| | | | | | | | | | | | | | | |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| vowels | `a` अ | `A` आ | `i` इ | `I` ई | `u` उ | `U` ऊ | `f` ऋ | `F` ॠ | `x` ऌ | `X` ॡ | `e` ए | `E` ऐ | `o` ओ | `O` औ |

| | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| ka-varga | `k` क | `K` ख | `g` ग | `G` घ | `N` ङ |
| ca-varga | `c` च | `C` छ | `j` ज | `J` झ | `Y` ञ |
| ṭa-varga | `w` ट | `W` ठ | `q` ड | `Q` ढ | `R` ण |
| ta-varga | `t` त | `T` थ | `d` द | `D` ध | `n` न |
| pa-varga | `p` प | `P` फ | `b` ब | `B` भ | `m` म |

| | | | | | | | | | |
|---|---|---|---|---|---|---|---|---|---|
| others | `y` य | `r` र | `l` ल | `v` व | `S` श | `z` ष | `s` स | `h` ह | `L` ळ |
| signs | `M` ं | `H` ः | `~` ँ | `'` ऽ | | | | | |

### Transliteration conventions

- **Lossless round trips.** `deva → slp1 → deva`, `deva → iast → deva` and
  `deva → hk → deva` are exact on every string accepted by `validateDeva`
  (tested on a corpus, every consonant × vowel, every two-consonant cluster and
  every vowel-hiatus pair).
- **IAST `ai` / `au` are always the diphthongs ऐ / औ**, and a stop + `h` is
  always the aspirate. A real hiatus is written with a diaeresis on output
  (`प्रउग` → `praüga`, `अइउण्` → `aïuṇ`) and a real stop + ह with the ISO 15919
  colon (`अग्हि` → `ag:hi`). On input `aï`, `aü`, `a:i`, `a:u`, `k:h` are all
  understood. HK uses the colon for the same purpose (`pra:uga`).
- IAST output is NFC with the standard diacritics `ā ī ū ṛ ṝ ḷ ḹ ṅ ñ ṭ ḍ ṇ ś ṣ ṃ ḥ`;
  candrabindu is `m̐`, ळ is `ḻ`, avagraha is `'`. Input is lower-cased and
  accepts `ṃ` or `ṁ`, `'` or `’`, and the ISO vocalics `r̥ l̥`.
- `ॐ` is a sign, not a spelling: it passes through unchanged in every scheme
  (so it never collides with `ओं`). Metrically it is one guru syllable.
- `।` ⇄ `|`, `॥` ⇄ `||`, `०–९` ⇄ `0–9`; all other non-letters pass through.
- `normalizeDeva`: NFC, strips ZWJ / ZWNJ, removes nukta (क़ → क), rewrites `।।`
  as `॥`, collapses whitespace, trims. Run it on all imported content.
- `validateDeva` is strict: only Sanskrit code points plus space, newline,
  hyphen, daṇḍas and Devanagari digits. ASCII digits, `:` for visarga, `|` for
  daṇḍa, Latin letters, joiners and nukta letters are errors. Structural
  errors (dangling or doubled vowel signs, sign after an independent vowel,
  misplaced virāma / anusvāra / avagraha) are reported with their index, as is
  the common misspelling `श्रृ` for `शृ`. Extra punctuation can be whitelisted:
  `validateDeva(text, { allowPunctuation: ',?!' })`. The empty string is not ok.
- `detectScheme` is a heuristic for typed input (`'unknown'` for informal
  romanisation such as `krishna`); stored content should always state its scheme.

---

## API

```ts
// translit.ts
type Scheme = 'deva' | 'iast' | 'slp1' | 'hk';
transliterate(text, from, to): string
devaToSlp1 / slp1ToDeva / devaToIast / iastToDeva / slp1ToIast / iastToSlp1 (s): string
detectScheme(text): Scheme | 'unknown'
normalizeDeva(text): string
validateDeva(text, opts?: { allowPunctuation?: string }): { ok: boolean; errors: string[] }
toDevaDigits(n: number | string): string      fromDevaDigits(s): number   // NaN if not a number

// akshara.ts
splitAksharas(deva, opts?: { keepSeparators?: boolean }): string[]
countAksharas(deva): number
aksharaParts(akshara): AksharaParts   // { consonants, vowel, finals, modifiers }
composeAkshara(parts): string         // exact inverse

// varna.ts
VARNAS, varna(slp1Char), isVowel, isConsonant, isSavarna(a, b)
SHIVA_SUTRAS, PRATYAHARA_NAMES, pratyahara(name, opts?: { expandSavarna?: boolean; marker?: 1 | 2 })
STHANA_NAMES

// sandhi.ts
joinSandhi(first, second, opts?: SandhiOptions): SandhiResult        // SLP1
joinSandhiDeva(first, second, opts?: SandhiOptions): SandhiResult    // Devanagari
SANDHI_RULES, sandhiRule(id)
applyNatva(slp1): string

// chandas.ts
scanLine(deva): Syllable[]      weights(deva): string      ganas(pattern): string[]
METERS, matchMeter(pattern): Meter | undefined
checkAnustubh(pada, padaIndex): { ok, syllables, pattern, issues }
identifyVerse(padas): { meter, kind, perPada }

// numbers.ts
cardinal(n): string    cardinalVariants(n): string[]    ordinal(n, gender): string
```

Every exported function has TSDoc with examples.

### Akṣaras

`splitAksharas('रामम्')` → `['रा','मम्']`: a halanta consonant that is not
followed by another consonant closes the preceding akṣara; an avagraha also
attaches to the preceding akṣara (`रामोऽपि` → `['रा','मोऽ','पि']`). `ॐ` is one
akṣara. Separators are dropped unless `keepSeparators` is set (then the split
is lossless: joining the pieces gives the input back). `countAksharas` counts
only akṣaras that have a vowel, so it equals the syllable count.
`aksharaParts('क्षे')` → `{ consonants: ['क','ष'], vowel: 'ए', finals: [], modifiers: [] }`
— use it, never code points, to get the real letters of a tile.

### Varṇas

`VARNAS` is the 48-sound varṇamālā (13 vowels, ṃ, ḥ, 33 consonants) with
`sthana` per the śikṣā statements, `varga`, `cls`, `ghosha`, `mahaprana`,
`nasal`. Not listed (but transliterated): ॡ, ँ, ऽ, ळ. `pratyahara('ac')`
returns class representatives in Śiva-sūtra order; `{ expandSavarna: true }`
adds the long vowels. `aR` defaults to the first ण् (`a i u`), `iR` / `yaR` to
the second; `{ marker: 1 | 2 }` overrides. Unformable names give `[]`.

---

## Sandhi

`joinSandhi(first, second, opts?)` joins two **complete words** and returns

```ts
{ result, ruleId, changed, spaced, note?, special?, alternatives: [{ result, ruleId, spaced }] }
```

- `ruleId` is the registry entry that decided the outcome, or `null` when no
  rule applies (the words are then simply juxtaposed).
- `changed` is false when no sound changed — also for the rules that say "it
  stays" (`pragrhya`, `visarga-kupvoh`, `visarga-shari`).
- `alternatives` are other **equally correct** outcomes (optional rules). An
  answer checker should accept `result` and every alternative.
- `note` says what could not be known or was deliberately not applied.
- `special: { code, ref }` is the **machine-readable warning** that the pair is
  a known special the engine does not handle (see "Known exceptions not
  applied"). `result` is then only the general-rule outcome for two independent
  words. **Content pipelines must require `special === undefined`** before
  storing or grading an engine result.

**Orthography of results.** A word whose sandhi form ends in a consonant is
written together with the next (`तच्च`, `हरिरत्र`, `तस्मिन्नेव`, `अहमत्र`,
`तत्पुस्तकम्`); one ending in a vowel, anusvāra or visarga is written apart
(`रामो गच्छति`, `अहं गच्छामि`, `राम इति`) unless the vowels fused (`देवालयः`,
`रामोऽपि`). `spaced` tells which. A hiatus result (`राम इति`) must not be
re-joined.

**Options** (facts the strings cannot carry):

| option | meaning |
|---|---|
| `pragrhya` | first word is a dual in ī / ū / e or a one-vowel particle: no vowel sandhi. `अमी`, `अमू`, `अहो`, `अथो`, `आहो`, `उताहो`, `नो`, `हो` are automatic. |
| `rFinal` | the visarga is an original r (`अन्तः`, `स्वः`, `पितः`, `मातः` …). `पुनः`, `प्रातः` and words written with final `r` are automatic. |
| `compound` | samāsa: same sandhi, written as one word (`मनोरथः`); e / o / ai + vowel take the ay / av / āy form. |
| `internal` | stem + suffix (`ने + अनम् = नयनम्`): general vowel rules only, without the pada-final specials. Consonant junctions are not handled in this mode. |

A final anusvāra on the first word is read as `m`, a final `s` as visarga, and
a voiced final stop (`तद्`) as its pada form. A first word that cannot end a
pada (`वाच्`, `दिश्`) gets "no rule" with a note — pass `वाक्`, `दिक्`.

### Rules implemented (`SANDHI_RULES`)

| id | sūtra | effect |
|---|---|---|
| `savarna-dirgha` | 6.1.101 | a/ā+a/ā → ā, i+i → ī, u+u → ū, ṛ+ṛ → ṝ |
| `guna` | 6.1.87 | a/ā + i u ṛ ḷ → e o ar al |
| `vrddhi` | 6.1.88 | a/ā + e/ai → ai, + o/au → au |
| `yan` | 6.1.77 | i u ṛ ḷ + unlike vowel → y v r l |
| `ayadi` | 6.1.78 | e o ai au + vowel → ay av āy āv (internal; pada-final au; `गो`) |
| `purvarupa` | 6.1.109 | pada-final e/o + a → e/o + ऽ |
| `yava-lopa` | 8.3.19 | pada-final e/o → a, ai → ā before other vowels, hiatus (alt.: ay / av / āy) |
| `pragrhya` | 1.1.11 | no sandhi |
| `visarga-o-avagraha` | 6.1.113 | aḥ + a → o ऽ |
| `visarga-o` | 6.1.114 | aḥ + voiced consonant → o |
| `visarga-lopa-a` | 8.3.17, 8.3.19 | aḥ + other vowel → a, hiatus |
| `visarga-lopa-aa` | 8.3.17, 8.3.22 | āḥ + vowel / voiced → ā |
| `visarga-rutva` | 8.2.66 | iḥ uḥ eḥ … + vowel / voiced → r |
| `visarga-satva` | 8.3.34 | ḥ + c/ch → ś, ṭ/ṭh → ṣ, t/th → s (not before ts-: 8.3.35) |
| `visarga-kupvoh` | 8.3.37 | ḥ stays before k kh p ph |
| `visarga-shari` | 8.3.36 | ḥ stays before ś ṣ s (alt.: assimilates) |
| `visarga-sah-esah` | 6.1.132 | सः / एषः drop ḥ before any consonant |
| `visarga-r-final` | 8.3.15 | r-final words keep r before vowel / voiced |
| `r-lopa-dirgha` | 8.3.14, 6.3.111 | r + r → long vowel + r |
| `visarga-bhoh` | 8.3.17 | भोः भगोः अघोः drop ḥ before vowel / voiced |
| `visarga-shatva` | 8.3.41 | निः दुः बहिः आविः प्रादुः चतुः + k/p → ṣ (but दुःख) |
| `jashtva` | 8.2.39 | final k ṭ t p → g ḍ d b before vowel / voiced |
| `cartva` | 8.4.55 | voiced stop → voiceless before voiceless |
| `shcutva` | 8.4.40 | t/d/n + palatal → c/j/ñ |
| `shtutva` | 8.4.41 | t/d/n + retroflex stop → ṭ/ḍ/ṇ (blocked by 8.4.42, 8.4.43) |
| `parasavarna-l` | 8.4.60 | t + l → ll; n + l → ँल्ल |
| `chatva` | 8.4.63 | stop + ś → stop + ch (t + ś → cch; alt.: cś) |
| `anunasika` | 8.4.45 | stop + nasal → class nasal (alt.: voiced stop; obligatory before -maya, -mātra) |
| `purvasavarna-h` | 8.4.62 | stop + h → voiced stop + voiced aspirate (alt.: plain h) |
| `udah-stha` | 8.4.61 | ud + sthā- / stambh- → utthā- / uttambh- |
| `anusvara` | 8.3.23 | final m + consonant → ṃ |
| `anusvara-parasavarna` | 8.4.59 | alternative only: ṃ → class nasal (`अहङ्गच्छामि`) |
| `n-rutva` | 8.3.7 | n + c/ch ṭ/ṭh t/th → ṃś ṃṣ ṃs (alt.: nasalised vowel; not `प्रशान्`) |
| `namut` | 8.3.32 | ṅ ṇ n after a short vowel doubled before a vowel |
| `tuk` | 6.1.73 | short vowel (or ā, mā) + ch → cch (optional after other long vowels, 6.1.76) |

The registry is **self-verifying**: `sandhi.test.ts` runs every example
through `joinSandhiDeva` and checks that no counterexample is attributed to its
rule; all sūtra texts were checked against the ashtadhyayi.com sūtra list, and
the engine agrees with the 47,000 distinct join pairs of the sanskrit_parser
corpus wherever that (noisy) corpus is itself correct.

### Known exceptions not applied

These are lexical, gati, upasarga or word-internal specials. The engine does
**not** produce the special form; it returns the general-rule outcome with a
`note` and — wherever the pair can be recognised cheaply — the `special` flag.
`sandhi.test.ts` (`KNOWN_SPECIALS`) asserts for every pair below that the flag
is set and that the special form is never claimed.

| `special.code` | not applied | examples (expected form) | detected when |
|---|---|---|---|
| `upasarga-dhatu` | 6.1.91, 6.1.94 | `प्र + ऋच्छति = प्रार्च्छति`, `प्र + एजते = प्रेजते`, `उप + ओषति = उपोषति` | first is `प्र परा अप अव उप`, second begins with ṛ / e / o (forms of एति, एधते excepted: `उपैति` is regular) |
| `vrddhi-special` | 6.1.89 vārttikas | `स्व + ईरम् = स्वैरम्`, `प्र + ऊढः = प्रौढः`, `अक्ष + ऊहिनी = अक्षौहिणी`, `सुख + ऋतः = सुखार्तः` | those first members; `-a + ऋत…` in a compound |
| `shakandhu` | śakandhvādi pararūpa | `मनस् + ईषा = मनीषा`, `कुल + अटा = कुलटा`, `पतत् + अञ्जलिः = पतञ्जलिः`, `शक + अन्धुः = शकन्धुः`, also कर्कन्धु, हलीषा, लाङ्गलीषा, सीमन्त, सारङ्ग, मार्तण्ड | fixed list |
| `gati-satva` | 8.3.40, 8.3.42 | `नमः + कारः = नमस्कारः`, `पुरः + कारः = पुरस्कारः`, `तिरः + कारः = तिरस्कारः` | `नमः पुरः तिरः` + a form of √kṛ |
| `samasa-satva` | 8.3.45, 8.3.46, 8.3.48 | `यशः + करः = यशस्करः`, `श्रेयः + करः = श्रेयस्करः`, `अयः + कारः = अयस्कारः`, `धनुः + पाणिः = धनुष्पाणिः`, `भाः + करः = भास्करः` | `compound: true` and -iḥ / -uḥ + k kh p ph, or -aḥ + कृ कम् कंस कुम्भ पात्र कुशा कर्णी; `भाः + कर…` always |
| `sut` | 6.1.137 | `सम् + कृतम् = संस्कृतम्`, `सम् + कारः = संस्कारः` | `सम्` + a form of √kṛ |
| `natva` | 8.4.3, 8.4.14 … | `प्र + नामः = प्रणामः`, `परि + नामः = परिणामः`, `राम + अयनम् = रामायणम्` | r-upasarga + n-; or `compound` / `internal` and ṇatva would apply if the result were one word (so ordinary compounds like `रामनाम` are flagged too — the engine cannot tell) |
| `shatva` | 8.3.65, 8.3.84, 8.3.88, 8.3.95 | `नि + सिद्धः = निषिद्धः`, `अभि + सेकः = अभिषेकः`, `वि + समः = विषमः`, `युधि + स्थिरः = युधिष्ठिरः`, `मातृ + स्वसा = मातृष्वसा` | first is `नि वि अभि प्रति परि अनु सु अधि अति अपि युधि गवि मातृ पितृ`, second begins with s |
| `go` | 6.1.123, 6.1.124 | `गो + इन्द्रः = गवेन्द्रः` (obligatory; the engine returns **no** sandhi form, `ruleId: null`), `गो + अक्षः = गवाक्षः` (engine returns the general `गोऽक्षः`, flagged) | first is `गो`, second begins with `इन्द्र…` / `अक्ष…`. Other `गो` + vowel pairs give the regular, correct `गोऽग्रम्` / `गवीशः` unflagged; the optional `गवाग्रम्`, `गो अग्रम्`, `गवेशः` are only mentioned in the `note` |
| `not-a-pada` | 8.2.30 etc. | `अच् + अन्तः = अजन्तः`, `वाच् + ईशः` (give `वाक्`) | first ends in a sound that cannot end a word (`ruleId` is `null`) |
| `r-final-ambiguous` | 8.3.15 | `अन्तः + अस्ति` = `अन्तोऽस्ति` (anta) or `अन्तरस्ति` (antar) | `अन्तः स्वः अहः मातः पितः भ्रातः द्वाः वाः` without `rFinal` |

Not detectable from the two strings, and therefore **not flagged** (keep such
items out of engine-generated content): other kaskādi words (`वाचस्पति`,
`बृहस्पति`, `दिवस्पति`), saṃjñā-ṇatva and ṣatva outside the lists above,
`परि + कृत = परिष्कृत`, om-pararūpa (6.1.95), and any compound whose first
member is not passed in its pada form.

Rarely written optional forms that are simply not listed among
`alternatives`: nasalised y / v / l for ṃ (8.4.59), the inserted stops of
8.3.28–31, the retained light y of 8.3.18, the gava- forms of `गो` (6.1.122–123).

Out of scope altogether: internal consonant sandhi and ṣatva; Vedic sandhi;
pluta; sandhi splitting. `applyNatva` covers ṇatva (8.4.1–2, 8.4.37) for ONE
uncompounded word: `rAmena` → `rAmeRa`, but `raTena`, `arjunena`, `rAmAn`
unchanged. Do not feed it compounds.

### How to add a sandhi rule

1. Be certain. Find the sūtra, read the Kāśikā / Siddhānta-kaumudī examples and
   counter-examples, and note every condition (what precedes, what follows,
   pada-final or not, optional or obligatory, named exceptions).
2. Add the branch in `sandhi.ts` in the function for the relevant final sound
   (`vowelSandhi`, `visargaSandhi`, `mSandhi`, `nSandhi`, `stopSandhi`). Return
   `{ a, b, ruleId }` — the sandhi forms of the two words; spacing is derived.
   Optional variants go in `alts`; anything not knowable from the strings
   becomes a `SandhiOptions` flag or a `note`, not a heuristic.
3. Add the entry to `SANDHI_RULES`: id, family, names, `sutra` (reference and
   Devanagari text), a one-sentence `summary`, at least three textbook
   `examples` (mark one with `alternative: true` if the engine returns that
   form among `alternatives` rather than as `result`), and `counterexamples`
   for the nearest look-alikes. If the rule has lexical exceptions you cannot
   generate, add a detector to `detectSpecial` and a row to `KNOWN_SPECIALS`.
4. Add independent cases to the `CASES` table in `sandhi.test.ts`, then
   run `node tools/test.mjs unit src/sanskrit`. The registry tests fail if an
   example does not reproduce, if a counterexample triggers the rule, or if a
   produced `ruleId` has no registry entry.

---

## Chandas

`scanLine` works on akṣaras. A syllable is **guru** if its vowel is long, or
it has anusvāra / visarga, or two or more consonants follow before the next
vowel — counted across word boundaries within the line — or it ends the line
in a consonant. Spaces, daṇḍas, digits, hyphens and avagrahas are ignored.
The line-final syllable keeps its natural weight; `matchMeter` treats it as
free. The licence of a light syllable before `pr`, `hr` … is not applied.

`METERS` holds 20 sama-vṛttas defined by gaṇa formula (pattern, yati and the
traditional lakṣaṇa line, which the tests scan against its own metre):
indravajrā, upendravajrā, vaṃśastha, indravaṃśā, vasantatilakā, mālinī,
mandākrāntā, śikhariṇī, śārdūlavikrīḍita, sragdharā, bhujaṅgaprayāta, toṭaka,
drutavilambita, rathoddhatā, svāgatā, śālinī, hariṇī, pṛthvī, praharṣiṇī,
pañcacāmara.

`checkAnustubh` applies the pathyā rule (5th laghu, 6th guru, 7th guru in
pādas 1 / 3 and laghu in 2 / 4). **Vipulā** odd pādas, which real ślokas use
about one time in eight, are reported as issues, and `identifyVerse` then
answers `'unknown'` rather than guessing — choose pathyā verses for games, or
check the even pādas only. `identifyVerse` also recognises upajāti
(indravajrā + upendravajrā, or vaṃśastha + indravaṃśā) and accepts an
anuṣṭubh as 4 pādas, 2 half-verses or 1 string. Mātrā metres (āryā) and
ardhasama metres are out of scope.

## Numbers

`cardinal(n)` returns the counting form of standard tables — एकम् द्वे त्रीणि
चत्वारि (neuter), पञ्च … नवदश, विंशतिः … नवनवतिः, शतम्; 1000 = सहस्रम् — from a
hard-coded table; `cardinalVariants(n)` lists other correct forms (अष्टौ,
एकोनविंशतिः, द्वाचत्वारिंशत् …). 54 is चतुष्पञ्चाशत् (8.3.41; so Monier-Williams).
`ordinal(n, 'm' | 'f' | 'n')` covers 1–20 (प्रथमः / प्रथमा / प्रथमम् …
चतुर्थी … विंशः). Both throw `RangeError` outside their range. Number words
are not inflected for case; declension belongs to the verified data packs.

## Not in this library

Declension and conjugation generators, dictionaries, sandhi splitting, and
answer-equivalence helpers (e.g. treating `गंगा` and `गङ्गा` as the same
answer) are intentionally absent; forms come from verified data packs.
