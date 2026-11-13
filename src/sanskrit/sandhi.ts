/**
 * External (pada) sandhi: joining two complete words.
 *
 * Design rule: correctness beats coverage. Every branch below implements a
 * Pāṇinian rule that is certain for two independent padas; where a result
 * depends on information that the two strings cannot carry (dual endings,
 * r-final words, upasarga + verb, lexical exceptions) the caller must say so
 * through {@link SandhiOptions}, and otherwise the function reports the
 * general result with a `note`, or "no rule" (`ruleId: null`).
 *
 * Orthography of results: a word whose sandhi form ends in a consonant is
 * written together with the next word (तच्च, हरिरत्र, तस्मिन्नेव, तत्पुस्तकम्); a
 * word ending in a vowel, anusvāra or visarga is written apart (रामो गच्छति,
 * अहं गच्छामि, रामः करोति) unless the vowels have fused (देवालयः, रामोऽपि).
 */
import { devaToSlp1, normalizeDeva, slp1ToDeva } from './translit';

export type SandhiFamily = 'svara' | 'visarga' | 'vyanjana';

/** Facts about the two words that cannot be read off their spelling. */
export interface SandhiOptions {
  /**
   * The first word is pragṛhya — exempt from vowel sandhi: a dual ending in
   * ī, ū or e (हरी एतौ, विष्णू इमौ, गङ्गे अमू; 1.1.11), or a one-vowel particle
   * (1.1.14). The words अमी, अमू and the particles अहो, अथो, आहो, उताहो, नो, हो
   * are recognised automatically.
   */
  pragrhya?: boolean;
  /**
   * The first word's visarga stands for an original `r` (अन्तः = antar, स्वः =
   * svar, मातः = mātar …), so it stays `r` before vowels and voiced consonants
   * even after a / ā. पुनः and प्रातः are recognised automatically, as is any
   * first word actually written with a final `r`.
   */
  rFinal?: boolean;
  /**
   * The two parts form a compound (samāsa): same sandhi, but the result is
   * written as one word (मनः + रथः → मनोरथः) and final e / o / ai before a
   * vowel takes the ay / av / āy form instead of the hiatus form.
   */
  compound?: boolean;
  /**
   * The junction is word-internal (stem / root + suffix, as in the textbook
   * derivations ने + अनम् = नयनम्): only the general vowel rules 6.1.77–6.1.101
   * are applied, without the pada-final specials (6.1.109 pūrvarūpa, 8.3.19).
   * Consonant junctions are NOT handled in this mode (returns "no rule").
   */
  internal?: boolean;
}

export interface SandhiRule {
  id: string;
  family: SandhiFamily;
  name: { sa: string; iast: string; en: string };
  /** Aṣṭādhyāyī reference and sūtra text in Devanagari. */
  sutra?: { ref: string; text: string };
  /** One-sentence learner explanation. */
  summary: string;
  /**
   * Devanagari. Each is verified by the test-suite through {@link joinSandhiDeva}; `options` are the options the
   * example needs; `alternative: true` marks a result that the engine returns among `alternatives` (an optional
   * form), not as its primary `result`.
   */
  examples: { first: string; second: string; result: string; options?: SandhiOptions; alternative?: boolean }[];
  /** Inputs that look similar but where this rule does NOT apply. */
  counterexamples?: { first: string; second: string; note: string; options?: SandhiOptions }[];
}

/**
 * Machine-readable warning: this pair matches a known lexical / gati / upasarga / word-internal special that
 * the engine does NOT apply. When present, `result` is only the outcome of the general rule for two
 * independent words and must not be presented as certainly correct for this pair.
 */
export interface SandhiSpecial {
  code:
    | 'upasarga-dhatu' // 6.1.91, 6.1.94: a-final upasarga + ṛ / e / o-initial verb (prārcchati, prejate)
    | 'vrddhi-special' // 6.1.89 vārttikas: svaira, prauḍha, akṣauhiṇī, sukhārta
    | 'shakandhu' // śakandhvādi pararūpa: manīṣā, kulaṭā, patañjali
    | 'gati-satva' // 8.3.40, 8.3.42: namaskāra, puraskāra, tiraskāra
    | 'samasa-satva' // 8.3.45, 8.3.46, 8.3.48: dhanuṣpāṇi, yaśaskara, ayaskāra, bhāskara
    | 'sut' // 6.1.137: saṃskṛta, saṃskāra
    | 'natva' // 8.4.3, 8.4.14 …: praṇāma, pariṇāma, rāmāyaṇa
    | 'shatva' // 8.3.65 …: niṣiddha, abhiṣeka, viṣama, yudhiṣṭhira, mātṛṣvasā
    | 'go' // 6.1.123–124: gavendra, gavākṣa
    | 'lexical' // established irregular words: ṣoḍaśa (6.3.109), ahorātra (8.2.69 vt.), puṃskokila (8.3.6)
    | 'not-a-pada' // the first word does not end in a pada-final sound (vāc, ac)
    | 'r-final-ambiguous'; // antaḥ / svaḥ / pitaḥ … may be r-final; pass { rFinal: true } if so
  /** Aṣṭādhyāyī reference(s) for the rule that is not applied. */
  ref: string;
}

export interface SandhiResult {
  /** The combined surface form. Contains exactly one space when `spaced` is true. */
  result: string;
  /** The rule that determined the result; `null` when no sandhi rule applies. */
  ruleId: string | null;
  /** Whether any sound changed (false for pure juxtaposition / "stays as it is" rules). */
  changed: boolean;
  /** True when the two words remain written apart. */
  spaced: boolean;
  /** Caveats: optional forms not listed, information the function could not know, etc. */
  note?: string;
  /** Present when the pair is a known special case that the engine does not handle — see {@link SandhiSpecial}. */
  special?: SandhiSpecial;
  /** Other equally correct outcomes for the same input (optional rules). */
  alternatives: { result: string; ruleId: string; spaced: boolean }[];
}

// ---------------------------------------------------------------------------
// Sound classes (SLP1)
// ---------------------------------------------------------------------------

const VOWELS = 'aAiIuUfFxXeEoO';
const SHORT_VOWELS = 'aiufx';
/** khar: voiceless stops and sibilants */
const KHAR = 'kKcCwWtTpPSzs';
/** haś: voiced consonants */
const HASH = 'gGjJqQdDbBNYRnmyrlvh';
/** am: vowels, h y v r l and nasals (the sounds after which 8.3.7 / 8.4.63-vt. look) */
const AM = `${VOWELS}hyvrlNYRnm`;
const SHAR = 'Szs';

const isVowel = (c: string): boolean => c !== '' && VOWELS.includes(c);
const isKhar = (c: string): boolean => c !== '' && KHAR.includes(c);
const isHash = (c: string): boolean => c !== '' && HASH.includes(c);
const isConsonant = (c: string): boolean => isKhar(c) || isHash(c);

const VOWEL_CLASS: Record<string, string> = { a: 'a', A: 'a', i: 'i', I: 'i', u: 'u', U: 'u', f: 'f', F: 'f', x: 'f', X: 'f' };
const LONG: Record<string, string> = { a: 'A', i: 'I', u: 'U', f: 'F' };
const SEMIVOWEL: Record<string, string> = { i: 'y', u: 'v', f: 'r' };

const VOICELESS: Record<string, string> = { k: 'k', g: 'k', w: 'w', q: 'w', t: 't', d: 't', p: 'p', b: 'p' };
const VOICED: Record<string, string> = { k: 'g', w: 'q', t: 'd', p: 'b' };
const NASAL: Record<string, string> = { k: 'N', w: 'R', t: 'n', p: 'm' };
const VOICED_ASPIRATE: Record<string, string> = { k: 'G', w: 'Q', t: 'D', p: 'B' };
/** homorganic nasal for each stop / nasal (anusvāra → parasavarṇa) */
const HOMORGANIC_NASAL: Record<string, string> = {
  k: 'N', K: 'N', g: 'N', G: 'N', N: 'N',
  c: 'Y', C: 'Y', j: 'Y', J: 'Y', Y: 'Y',
  w: 'R', W: 'R', q: 'R', Q: 'R', R: 'R',
  t: 'n', T: 'n', d: 'n', D: 'n', n: 'n',
  p: 'm', P: 'm', b: 'm', B: 'm', m: 'm',
};
const VISARGA_SIBILANT: Record<string, string> = { c: 'S', C: 'S', w: 'z', W: 'z', t: 's', T: 's' };

const AUTO_PRAGRHYA = new Set(['amI', 'amU', 'aho', 'aTo', 'Aho', 'utAho', 'no', 'ho']);
const AUTO_R_FINAL = new Set(['punaH', 'prAtaH']);
const MAYBE_R_FINAL = new Set(['antaH', 'svaH', 'ahaH', 'mAtaH', 'pitaH', 'BrAtaH', 'dvAH', 'vAH']);
const BHO_WORDS = new Set(['BoH', 'BagoH', 'aGoH']);
const SHATVA_WORDS = new Set(['niH', 'duH', 'bahiH', 'AviH', 'prAduH', 'catuH']);
const A_FINAL_UPASARGAS = new Set(['pra', 'parA', 'apa', 'ava', 'upa']);
/** e-initial forms of √i and √edh: after an upasarga they take the ordinary vṛddhi (6.1.89 etyedhatyūṭhsu), so nothing special */
const ETI_EDHATI = /^(eti|ezi|emi|etu|eD)/;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

interface Form {
  /** sandhi form of the first word */
  a: string;
  /** sandhi form of the second word */
  b: string;
  ruleId: string | null;
  /** fused = written as one word regardless of how `a` ends */
  fused?: boolean;
}

interface Outcome extends Form {
  note?: string;
  special?: SandhiSpecial;
  alts?: (Form & { ruleId: string })[];
}

function render(form: Form, compound: boolean): { result: string; spaced: boolean } {
  const last = form.a.charAt(form.a.length - 1);
  const first = form.b.charAt(0);
  let spaced: boolean;
  if (form.fused === true || form.a === '' || form.b === '') spaced = false;
  else if (isConsonant(last)) spaced = false;
  else if (compound) spaced = isVowel(last) && isVowel(first); // a hiatus cannot be written joined
  else spaced = true;
  return { result: spaced ? `${form.a} ${form.b}` : form.a + form.b, spaced };
}

function vowelSandhi(f: string, second: string, opts: SandhiOptions): Outcome {
  const last = f.charAt(f.length - 1);
  const init = second.charAt(0);
  const stem = f.slice(0, -1);
  const rest = second.slice(1);
  const internal = opts.internal === true;

  if (!internal && (opts.pragrhya === true || AUTO_PRAGRHYA.has(f))) {
    return { a: f, b: second, ruleId: 'pragrhya' };
  }

  const lc = VOWEL_CLASS[last];
  const ic = VOWEL_CLASS[init];

  // 6.1.101 akaḥ savarṇe dīrghaḥ
  if (lc !== undefined && lc === ic) {
    return { a: stem + (LONG[lc] as string), b: rest, ruleId: 'savarna-dirgha', fused: true };
  }

  if (lc === 'a') {
    let note: string | undefined;
    if (!internal && A_FINAL_UPASARGAS.has(f) && 'fFeo'.includes(init) && !ETI_EDHATI.test(second)) {
      note =
        'If the second word is a verb form built on a root, special rules apply instead (6.1.91 upasargād ṛti dhātau: pra + ṛcchati = prārcchati; 6.1.94 eṅi pararūpam: pra + ejate = prejate); they are not applied here.';
    }
    // 6.1.88 vṛddhir eci
    if (init === 'e' || init === 'E') return { a: `${stem}E`, b: rest, ruleId: 'vrddhi', fused: true, note };
    if (init === 'o' || init === 'O') return { a: `${stem}O`, b: rest, ruleId: 'vrddhi', fused: true, note };
    // 6.1.87 ād guṇaḥ (+ 1.1.51 uraṇ raparaḥ)
    if (ic === 'i') return { a: `${stem}e`, b: rest, ruleId: 'guna', fused: true };
    if (ic === 'u') return { a: `${stem}o`, b: rest, ruleId: 'guna', fused: true };
    if (init === 'f' || init === 'F') return { a: `${stem}ar`, b: rest, ruleId: 'guna', fused: true, note };
    if (init === 'x' || init === 'X') return { a: `${stem}al`, b: rest, ruleId: 'guna', fused: true };
  }

  // 6.1.77 iko yaṇ aci
  if (lc === 'i' || lc === 'u' || lc === 'f') {
    const glide = last === 'x' || last === 'X' ? 'l' : (SEMIVOWEL[lc] as string);
    return { a: stem + glide, b: second, ruleId: 'yan', fused: true };
  }

  // e o ai au
  const AY: Record<string, string> = { e: 'ay', o: 'av', E: 'Ay', O: 'Av' };
  const ay = AY[last];
  if (ay !== undefined) {
    const ayadi: Form & { ruleId: string } = { a: stem + ay, b: second, ruleId: 'ayadi', fused: true };
    if (internal) return ayadi;
    if (f === 'go') {
      // The word go has its own rules (6.1.122 sarvatra vibhāṣā goḥ, 6.1.123 avaṅ sphoṭāyanasya, 6.1.124 indre ca).
      // Only what is certain for every such pair is produced; the rest is declined and flagged.
      if (second.startsWith('indr')) {
        return {
          a: f,
          b: second,
          ruleId: null,
          special: { code: 'go', ref: '6.1.124' },
          note: 'go + indra is gavendra: go obligatorily becomes gava- before indra (6.1.124 indre ca). The special rules for go are not implemented, so no sandhi form is produced.',
        };
      }
      if (init === 'a') {
        const out: Outcome = {
          a: `${f}'`,
          b: rest,
          ruleId: 'purvarupa',
          fused: true,
          note: 'go + a has three forms: go\u2019gram, gavāgram (6.1.123 avaṅ sphoṭāyanasya) and go agram without sandhi (6.1.122); only the first is produced.',
        };
        if (second.startsWith('akz')) {
          out.special = { code: 'go', ref: '6.1.123' };
          out.note = 'go + akṣa is gavākṣa in established usage (6.1.123 avaṅ sphoṭāyanasya); the special rules for go are not implemented.';
        }
        return out;
      }
      return { ...ayadi, note: 'go may also become gava- before a vowel (6.1.123 avaṅ sphoṭāyanasya: gaveśa beside gavīśa); that optional form is not listed.' };
    }
    // 6.1.109 eṅaḥ padāntād ati
    if ((last === 'e' || last === 'o') && init === 'a') {
      return { a: `${f}'`, b: rest, ruleId: 'purvarupa', fused: true };
    }
    // 8.3.19 lopaḥ śākalyasya: pada-final y / v optionally dropped
    const dropped: Form & { ruleId: string } = { a: stem + (last === 'e' || last === 'o' ? 'a' : 'A'), b: second, ruleId: 'yava-lopa' };
    if (opts.compound === true) return ayadi;
    if (last === 'O') return { ...ayadi, alts: [dropped] };
    return { ...dropped, alts: [ayadi] };
  }
  return { a: f, b: second, ruleId: null, note: 'unrecognised vowel junction' };
}

/** visarga (or its sources s / r) + khar */
function visargaBeforeKhar(stem: string, second: string, word: string): Outcome {
  const init = second.charAt(0);
  const after = second.charAt(1);
  const keep = `${stem}H`;
  const sib = VISARGA_SIBILANT[init];
  if (sib !== undefined) {
    // 8.3.35 śarpare visarjanīyaḥ
    if (SHAR.includes(after) && after !== '') {
      return { a: keep, b: second, ruleId: null, note: 'The visarga stays when the following voiceless stop is itself followed by a sibilant (8.3.35 śarpare visarjanīyaḥ).' };
    }
    // 8.3.34 visarjanīyasya saḥ (+ 8.4.40 / 8.4.41)
    return { a: stem + sib, b: second, ruleId: 'visarga-satva' };
  }
  if ('kKpP'.includes(init)) {
    const sharpare = after !== '' && SHAR.includes(after);
    if (!sharpare && SHATVA_WORDS.has(word)) {
      if (word === 'duH' && /^Ka(?!dir)/.test(second)) {
        return { a: keep, b: second, ruleId: 'visarga-kupvoh', note: 'duḥkha is the established spelling (the regular duṣkha is hardly used).' };
      }
      // 8.3.41 idudupadhasya cāpratyayasya
      return { a: `${stem}z`, b: second, ruleId: 'visarga-shatva' };
    }
    const out: Outcome = { a: keep, b: second, ruleId: 'visarga-kupvoh' };
    if (word === 'namaH' || word === 'puraH' || word === 'tiraH') {
      out.note = 'As a gati joined to a form of √kṛ this word keeps s (namaskāra, puraskāra, tiraskāra; 8.3.40, 8.3.42); not applied automatically.';
    } else {
      out.note = 'A few fixed compounds show s / ṣ here instead (bhāskara, vācaspati, ayaskāra … 8.3.38–8.3.48); they are lexical and not generated.';
    }
    return out;
  }
  // ś ṣ s : 8.3.36 vā śari
  return {
    a: keep,
    b: second,
    ruleId: 'visarga-shari',
    alts: [{ a: stem + init, b: second, ruleId: 'visarga-shari' }],
  };
}

function visargaSandhi(f: string, second: string, opts: SandhiOptions): Outcome {
  const literalR = f.endsWith('r');
  const stem = f.slice(0, -1);
  const word = `${stem}H`;
  const pv = stem.charAt(stem.length - 1);
  const init = second.charAt(0);
  if (!isVowel(pv)) return { a: f, b: second, ruleId: null, note: 'The first word does not end in vowel + visarga.' };
  const rFinal = literalR || opts.rFinal === true || AUTO_R_FINAL.has(word);

  // 6.1.132 etattadoḥ sulopo 'kor anañsamāse hali
  if ((word === 'saH' || word === 'ezaH') && isConsonant(init)) {
    return { a: stem, b: second, ruleId: 'visarga-sah-esah' };
  }
  if (isKhar(init)) return visargaBeforeKhar(stem, second, word);

  // from here on: a vowel or a voiced consonant follows (aś)
  if (BHO_WORDS.has(word)) return { a: stem, b: second, ruleId: 'visarga-bhoh' };

  const rLopa = (): Outcome => ({ a: stem.slice(0, -1) + (LONG[pv] !== undefined && pv !== 'f' ? (LONG[pv] as string) : pv), b: second, ruleId: 'r-lopa-dirgha' });

  if (rFinal) {
    if (init === 'r') return rLopa();
    return { a: `${stem}r`, b: second, ruleId: 'visarga-r-final' };
  }
  if (pv === 'a') {
    const note = MAYBE_R_FINAL.has(word) ? 'If this word is r-final (antar, svar, ahar, mātar …) pass { rFinal: true }: the r then stays.' : undefined;
    if (init === 'a') return { a: `${stem.slice(0, -1)}o'`, b: second.slice(1), ruleId: 'visarga-o-avagraha', fused: true, note };
    if (isVowel(init)) return { a: stem, b: second, ruleId: 'visarga-lopa-a', note };
    return { a: `${stem.slice(0, -1)}o`, b: second, ruleId: 'visarga-o', note };
  }
  if (pv === 'A') {
    const note = MAYBE_R_FINAL.has(word) ? 'If this word is r-final (dvār, vār) pass { rFinal: true }: the r then stays.' : undefined;
    return { a: stem, b: second, ruleId: 'visarga-lopa-aa', note };
  }
  if (init === 'r') return rLopa();
  return { a: `${stem}r`, b: second, ruleId: 'visarga-rutva' };
}

function mSandhi(f: string, second: string): Outcome {
  const stem = f.slice(0, -1);
  const init = second.charAt(0);
  if (isVowel(init)) return { a: f, b: second, ruleId: null };
  if (f === 'sam' && /^rA[jwq]/.test(second)) {
    return { a: f, b: second, ruleId: null, note: 'sam keeps its m before rāj (samrāṭ; 8.3.25 mo rāji samaḥ kvau).' };
  }
  const out: Outcome = { a: `${stem}M`, b: second, ruleId: 'anusvara' };
  if (f === 'sam' && /^(kf|kar|kAr|kur|kriy)/.test(second)) {
    out.note = 'With forms of √kṛ in the sense of refining, sam inserts s (saṃskṛta, saṃskāra; 6.1.137 samparyupebhyaḥ karotau bhūṣaṇe); that lexical rule is not applied here.';
  }
  const nasal = HOMORGANIC_NASAL[init];
  if (nasal !== undefined) out.alts = [{ a: stem + nasal, b: second, ruleId: 'anusvara-parasavarna' }];
  else if ('yvl'.includes(init) && out.note === undefined) out.note = 'Optionally the anusvāra becomes a nasalised y / v / l (8.4.59); that form is not listed.';
  return out;
}

function nSandhi(f: string, second: string): Outcome {
  const stem = f.slice(0, -1);
  const pv = stem.charAt(stem.length - 1);
  const init = second.charAt(0);
  const after = second.charAt(1);
  if (isVowel(init)) {
    // 8.3.32 ṅamo hrasvād aci ṅamuṇ nityam
    if (SHORT_VOWELS.includes(pv) && pv !== '') return { a: `${f}n`, b: second, ruleId: 'namut' };
    return { a: f, b: second, ruleId: null };
  }
  const sib = VISARGA_SIBILANT[init];
  if (sib !== undefined) {
    // 8.3.7 naś chavy apraśān (ampare)
    if (f !== 'praSAn' && after !== '' && AM.includes(after)) {
      return {
        a: `${stem}M${sib}`,
        b: second,
        ruleId: 'n-rutva',
        alts: [{ a: `${stem}~${sib}`, b: second, ruleId: 'n-rutva' }],
      };
    }
    const note = f === 'praSAn' ? 'praśān is expressly excepted from 8.3.7.' : 'No ṃ + sibilant here: the stop is not followed by a vowel, semivowel or nasal (8.3.7 ampare).';
    if (init === 'c' || init === 'C') return { a: `${stem}Y`, b: second, ruleId: 'shcutva', note };
    if (init === 'w' || init === 'W') return { a: `${stem}R`, b: second, ruleId: 'shtutva', note };
    return { a: f, b: second, ruleId: null, note };
  }
  if (init === 'j' || init === 'J' || init === 'Y') return { a: `${stem}Y`, b: second, ruleId: 'shcutva' };
  if (init === 'S') {
    const out: Outcome = { a: `${stem}Y`, b: second, ruleId: 'shcutva' };
    if (after !== '' && AM.includes(after)) {
      out.alts = [
        { a: `${stem}Y`, b: `C${second.slice(1)}`, ruleId: 'chatva' },
        { a: `${stem}Yc`, b: `C${second.slice(1)}`, ruleId: 'chatva' },
      ];
    }
    return out;
  }
  if (init === 'q' || init === 'Q' || init === 'R') return { a: `${stem}R`, b: second, ruleId: 'shtutva' };
  // 8.4.60 tor li (nasalised l)
  if (init === 'l') return { a: `${stem}~l`, b: second, ruleId: 'parasavarna-l' };
  const out: Outcome = { a: f, b: second, ruleId: null };
  if (init === 's') out.note = 'Optionally a t is inserted (san + saḥ = santsaḥ; 8.3.30 naś ca); that form is not listed.';
  return out;
}

function stopSandhi(f: string, second: string): Outcome {
  const last = f.charAt(f.length - 1);
  const k = VOICELESS[last] as string; // k w t p
  const stem = f.slice(0, -1);
  const init = second.charAt(0);
  const after = second.charAt(1);
  const voiced = VOICED[k] as string;
  const givenVoiced = last !== k;
  const jashtva = (): Form & { ruleId: string } => ({ a: stem + voiced, b: second, ruleId: 'jashtva' });

  if (isVowel(init)) return jashtva();

  // 8.4.61 udaḥ sthāstambhoḥ pūrvasya: ud + sthā- / stambh- → utthā- / uttambh-
  if ((f === 'ut' || f === 'ud') && /^(sT[Ai]|stamB|stab)/.test(second)) {
    return { a: 'ut', b: second.slice(1), ruleId: 'udah-stha' };
  }

  if (k === 't') {
    if (init === 'c' || init === 'C') return { a: `${stem}c`, b: second, ruleId: 'shcutva' };
    if (init === 'j' || init === 'J') return { a: `${stem}j`, b: second, ruleId: 'shcutva' };
    if (init === 'w' || init === 'W') return { a: `${stem}w`, b: second, ruleId: 'shtutva' };
    if (init === 'q' || init === 'Q') return { a: `${stem}q`, b: second, ruleId: 'shtutva' };
    if (init === 'l') return { a: `${stem}l`, b: second, ruleId: 'parasavarna-l' };
    if (init === 'S') {
      const plain: Form & { ruleId: string } = { a: `${stem}c`, b: second, ruleId: 'shcutva' };
      // 8.4.63 śaś cho 'ṭi (vt. chatvam amīti vācyam)
      if (after !== '' && AM.includes(after)) return { a: `${stem}c`, b: `C${second.slice(1)}`, ruleId: 'chatva', alts: [plain] };
      return plain;
    }
  }

  if ('NYRnm'.includes(init)) {
    // 8.4.45 yaro 'nunāsike 'nunāsiko vā
    const nasal = NASAL[k] as string;
    if (k === 'w' && init === 'n' && /^(navat|nagar)/.test(second)) {
      return {
        a: `${stem}R`,
        b: `R${second.slice(1)}`,
        ruleId: 'anunasika',
        note: 'ṣaṇṇavati / ṣaṇṇagarī: here the following n also becomes ṇ (vārttika on 8.4.42).',
      };
    }
    const out: Outcome = { a: stem + nasal, b: second, ruleId: 'anunasika' };
    // The nasal is obligatory only before the SUFFIXES -maya / -mātra (tanmaya, tanmātra); independent words that
    // merely begin with those letters (mayā, mayi, mayūra, mātrā) keep the optional voiced-stop form.
    if (/^(maya[HmM]?|mayI|mayAH|mAtra[HmM]?)$/.test(second)) out.note = 'Before a suffix (-maya, -mātra) the nasal is obligatory (vārttika pratyaye bhāṣāyāṃ nityam).';
    else out.alts = [jashtva()];
    return out;
  }

  if (init === 'h') {
    // 8.4.62 jhayo ho 'nyatarasyām
    return {
      a: stem + voiced,
      b: (VOICED_ASPIRATE[k] as string) + second.slice(1),
      ruleId: 'purvasavarna-h',
      alts: [jashtva()],
    };
  }

  if (isHash(init)) return jashtva();

  // a voiceless sound follows: the stop is voiceless (8.4.55 khari ca)
  const out: Outcome = { a: stem + k, b: second, ruleId: givenVoiced ? 'cartva' : null };
  if (init === 'S' && after !== '' && AM.includes(after)) {
    out.alts = [{ a: stem + k, b: `C${second.slice(1)}`, ruleId: 'chatva' }];
  }
  if (k === 'w' && init === 's') out.note = 'Optionally a t is inserted (ṣaṭ + santaḥ = ṣaṭtsantaḥ; 8.3.29 ḍaḥ si dhuṭ); that form is not listed.';
  return out;
}

function decide(f: string, second: string, opts: SandhiOptions): Outcome {
  const last = f.charAt(f.length - 1);
  const init = second.charAt(0);
  const lastOk = isVowel(last) || isConsonant(last) || last === 'H';
  const initOk = isVowel(init) || isConsonant(init);
  if (!lastOk || !initOk) return { a: f, b: second, ruleId: null, note: 'No Sanskrit sounds meet at this junction.' };

  if (opts.internal === true) {
    if (isVowel(last) && isVowel(init)) return vowelSandhi(f, second, opts);
    return { a: f, b: second, ruleId: null, note: 'Word-internal consonant sandhi is not implemented; only vowel + vowel is handled with { internal: true }.' };
  }

  if (isVowel(last)) {
    if (isVowel(init)) return vowelSandhi(f, second, opts);
    if (init === 'C') {
      // 6.1.73 che ca, 6.1.74 āṅmāṅoś ca, 6.1.76 padāntād vā
      const tuk: Form & { ruleId: string } = { a: `${f}c`, b: second, ruleId: 'tuk' };
      if (SHORT_VOWELS.includes(last) || f === 'A' || f === 'mA') return tuk;
      return { a: f, b: second, ruleId: null, alts: [tuk], note: 'After a word-final long vowel the doubling to cch is optional (6.1.76 padāntād vā).' };
    }
    return { a: f, b: second, ruleId: null };
  }
  if (last === 'H' || last === 's' || last === 'r') return visargaSandhi(f, second, opts);
  if (last === 'm') return mSandhi(f, second);
  if (last === 'n') return nSandhi(f, second);
  if (last === 'N' || last === 'R') {
    const pv = f.charAt(f.length - 2);
    if (isVowel(init) && pv !== '' && SHORT_VOWELS.includes(pv)) return { a: f + last, b: second, ruleId: 'namut' };
    return { a: f, b: second, ruleId: null };
  }
  if (VOICELESS[last] !== undefined) return stopSandhi(f, second);
  return {
    a: f,
    b: second,
    ruleId: null,
    note: 'The first word does not end in a sound that can end a Sanskrit word; give its pada form (e.g. vāk, not vāc).',
    special: { code: 'not-a-pada', ref: '8.2.30' },
  };
}

const KR_FORM = /^(kf|kar|kAr|kur|kriy)/;
const I_U_UPASARGAS = new Set(['ni', 'vi', 'aBi', 'prati', 'pari', 'anu', 'su', 'aDi', 'ati', 'api']);
const SHATVA_FIRST_MEMBERS = new Set(['yuDi', 'gavi', 'mAtf', 'pitf']);
const R_UPASARGAS = new Set(['pra', 'parA', 'pari', 'niH', 'nir', 'duH', 'dur', 'antaH', 'antar']);
/** śakandhvādi and similar fixed pararūpa formations: [first, start of second] */
const SHAKANDHU: readonly (readonly [RegExp, RegExp])[] = [
  [/^Saka$/, /^anD/],
  [/^karka$/, /^anD/],
  [/^kula$/, /^aw/],
  [/^mana[sH]$/, /^Iz/],
  [/^hala$/, /^Iz/],
  [/^lANgala$/, /^Iz/],
  [/^pata[td]$/, /^aYjal/],
  [/^sIma(n)?$/, /^anta/],
  [/^sAra$/, /^aNg/],
  [/^mArta$/, /^aRq/],
];

interface SpecialHit {
  special: SandhiSpecial;
  note: string;
}

/** Cheap detection of known specials that the engine does not apply. */
function detectSpecial(f: string, second: string, opts: SandhiOptions, outcome: Outcome, result: string, spaced: boolean): SpecialHit | undefined {
  const init = second.charAt(0);
  const last = f.charAt(f.length - 1);
  const compound = opts.compound === true;
  const word = last === 's' || last === 'r' ? `${f.slice(0, -1)}H` : f;

  for (const [a, b] of SHAKANDHU) {
    if (a.test(f) && b.test(second)) {
      return {
        special: { code: 'shakandhu', ref: '6.1.94 vt.' },
        note: 'This is a śakandhvādi formation (śakandhu, kulaṭā, manīṣā, patañjali …): the final of the first member is dropped irregularly (vt. śakandhvādiṣu pararūpaṃ vācyam). Not applied.',
      };
    }
  }
  if ((f === 'sva' && /^Ir/.test(second)) || (f === 'pra' && /^(Uh|UQ)/.test(second)) || (f === 'akza' && /^Uhi/.test(second)) || (compound && /[aA]$/.test(f) && /^fta/.test(second))) {
    return {
      special: { code: 'vrddhi-special', ref: '6.1.89 vt.' },
      note: 'Special vṛddhi by the vārttikas on 6.1.89 (svaira, prauḍha, akṣauhiṇī, sukhārta) instead of guṇa. Not applied.',
    };
  }
  if (A_FINAL_UPASARGAS.has(f) && 'fFeo'.includes(init) && !ETI_EDHATI.test(second)) {
    return {
      special: { code: 'upasarga-dhatu', ref: '6.1.91, 6.1.94' },
      note: outcome.note ?? '',
    };
  }
  if ('kKpP'.includes(init)) {
    if ((word === 'namaH' || word === 'puraH' || word === 'tiraH') && KR_FORM.test(second)) {
      return { special: { code: 'gati-satva', ref: word === 'tiraH' ? '8.3.42' : '8.3.40' }, note: outcome.note ?? '' };
    }
    if (word === 'BAH' && /^kar/.test(second)) {
      return { special: { code: 'samasa-satva', ref: '8.3.48' }, note: 'bhāskara belongs to the kaskādi list (8.3.48 kaskādiṣu ca): s instead of visarga. Not applied.' };
    }
    if (compound && outcome.ruleId === 'visarga-kupvoh' && opts.rFinal !== true && !AUTO_R_FINAL.has(word) && !MAYBE_R_FINAL.has(word) && !SHATVA_WORDS.has(word)) {
      const pv = word.charAt(word.length - 2);
      if (pv === 'i' || pv === 'u') {
        return {
          special: { code: 'samasa-satva', ref: '8.3.45' },
          note: 'In a compound a first member in -is / -us takes ṣ before k kh p ph (dhanuṣpāṇi, sarpiṣkuṇḍikā; 8.3.45 nityaṃ samāse \u2019nuttarapadasthasya). Not applied.',
        };
      }
      if (pv === 'a' && /^(kf|kar|kAr|kAm|kaMs|kumB|pAtr|kuS|karR)/.test(second)) {
        return {
          special: { code: 'samasa-satva', ref: '8.3.46' },
          note: 'In a compound a first member in -as takes s before kṛ, kam, kaṃsa, kumbha, pātra, kuśā, karṇī (yaśaskara, ayaskāra, śreyaskara; 8.3.46). Not applied.',
        };
      }
    }
  }
  if (f === 'sam' && KR_FORM.test(second)) return { special: { code: 'sut', ref: '6.1.137' }, note: outcome.note ?? '' };
  if (init === 's' && (I_U_UPASARGAS.has(f) || SHATVA_FIRST_MEMBERS.has(f)) && /^s[aAiIuUfeEoOtTnmyv]/.test(second)) {
    return {
      special: { code: 'shatva', ref: '8.3.65, 8.3.84, 8.3.88, 8.3.95' },
      note: 'After this first member the initial s of certain roots and words becomes ṣ (niṣiddha, abhiṣeka, viṣama, yudhiṣṭhira, mātṛṣvasā). ṣatva is internal sandhi and is not applied.',
    };
  }
  if (compound || opts.internal === true) {
    if (/^za[wqz]$/.test(f) && /^(daS|dant|DA)/.test(second)) {
      return { special: { code: 'lexical', ref: '6.3.109 vt.' }, note: 'ṣaṣ + daśa / danta / dhā is ṣoḍaśa, ṣoḍan, ṣoḍhā (pṛṣodarādi, with the vārttika ṣaṣa utvam …). Not applied.' };
    }
    if (word === 'ahaH' && /^(rUp|rAtr|raTantar)/.test(second)) {
      return { special: { code: 'lexical', ref: '8.2.69 vt.' }, note: 'ahan before rūpa, rātri, rathantara takes ru: ahorātra, ahorūpa (vārttika rūparātrirathantareṣu rutvaṃ vācyam). Not applied.' };
    }
    if ((f === 'pum' || f === 'puM') && /^[kKcCwWtTpP]/.test(second)) {
      return { special: { code: 'lexical', ref: '8.3.6' }, note: 'pum before a voiceless stop followed by a vowel or semivowel takes s: puṃskokila (8.3.6 pumaḥ khayy ampare). Not applied.' };
    }
  }
  const natvaNote = 'If the two parts form one word (upasarga + root, or a name such as rāmāyaṇa) the n becomes ṇ (8.4.1–8.4.14: praṇāma, pariṇāma); in an ordinary compound it does not. ṇatva is internal sandhi and is not applied.';
  if (init === 'n' && R_UPASARGAS.has(f)) return { special: { code: 'natva', ref: '8.4.14' }, note: natvaNote };
  if ((compound || opts.internal === true) && !spaced && applyNatva(result) !== result) {
    return { special: { code: 'natva', ref: '8.4.1–8.4.14' }, note: natvaNote };
  }
  if (outcome.note !== undefined && outcome.note.includes('rFinal')) {
    return { special: { code: 'r-final-ambiguous', ref: '8.3.15' }, note: outcome.note };
  }
  return undefined;
}

/**
 * Joins two complete words (padas) given in SLP1 and returns the sandhi form.
 *
 * - `result` is the combined surface form; when the two words stay written
 *   apart (`spaced: true`) it contains exactly one space: `rAmaH + gacCati` →
 *   `rAmo gacCati`.
 * - `ruleId` is the id of the entry in {@link SANDHI_RULES} that decided the
 *   outcome, or `null` when no sandhi rule applies (the words are then simply
 *   juxtaposed: `rAma gacCati`, `tatpustakam`).
 * - `changed` is false when no sound changed — both for "no rule" and for
 *   rules that say "stays as it is" (`pragrhya`, `visarga-kupvoh`, `visarga-shari`).
 * - `alternatives` lists other equally correct outcomes where the grammar
 *   gives an option (jagannāthaḥ / jagadnāthaḥ, ahaṃ gacchāmi / ahaṅgacchāmi,
 *   hariḥ śete / hariśśete, hara ehi / harayehi …).
 * - `note` flags what the function could not know or did not apply.
 * - `special` is set when the pair is a known lexical / gati / upasarga special
 *   that the engine does not handle (namaskāra, saṃskṛta, praṇāma, niṣiddha,
 *   svaira, manīṣā …): `result` is then only the general-rule outcome and must
 *   not be shown as certainly correct. Check `special === undefined` before
 *   trusting a result in content pipelines.
 *
 * A final anusvāra on the first word is read as `m`; a final `s` as visarga.
 * See {@link SandhiOptions} for dual (pragṛhya) forms, r-final words,
 * compounds and word-internal junctions. ṇatva and ṣatva are internal sandhi
 * and are never applied here (see {@link applyNatva}).
 *
 * @example
 * joinSandhi('deva', 'AlayaH').result       // → 'devAlayaH'  (savarna-dirgha)
 * joinSandhi('rAmaH', 'api').result         // → "rAmo'pi"    (visarga-o-avagraha)
 * joinSandhi('rAmaH', 'gacCati')            // → { result: 'rAmo gacCati', ruleId: 'visarga-o', spaced: true, changed: true, … }
 * joinSandhi('tat', 'ca').result            // → 'tacca'      (shcutva)
 * joinSandhi('harI', 'etO', { pragrhya: true }).result // → 'harI etO'
 * joinSandhi('rAma', 'gacCati').ruleId      // → null
 */
export function joinSandhi(first: string, second: string, opts?: SandhiOptions): SandhiResult {
  const options = opts ?? {};
  if (first === '' || second === '') {
    return { result: first + second, ruleId: null, changed: false, spaced: false, alternatives: [] };
  }
  const f = first.endsWith('M') ? `${first.slice(0, -1)}m` : first;
  const outcome = decide(f, second, options);
  const compound = options.compound === true || options.internal === true;
  const main = render(outcome, compound);
  const base = f + second;
  const alternatives: SandhiResult['alternatives'] = [];
  for (const alt of outcome.alts ?? []) {
    const r = render(alt, compound);
    if (r.result !== main.result && !alternatives.some((x) => x.result === r.result)) {
      alternatives.push({ result: r.result, ruleId: alt.ruleId, spaced: r.spaced });
    }
  }
  const out: SandhiResult = {
    result: main.result,
    ruleId: outcome.ruleId,
    changed: main.result.replace(' ', '') !== base,
    spaced: main.spaced,
    alternatives,
  };
  let note = outcome.note;
  let special = outcome.special;
  if (special === undefined) {
    const hit = detectSpecial(f, second, options, outcome, main.result, main.spaced);
    if (hit !== undefined) {
      special = hit.special;
      if (note === undefined && hit.note !== '') note = hit.note;
    }
  }
  if (special !== undefined) out.special = special;
  if (outcome.ruleId === null && !main.spaced && isConsonant(f.charAt(f.length - 1)) && note === undefined) {
    note = 'No sound changes; a word ending in a consonant is written together with the next word (it may also be written apart with a virāma).';
  }
  if (note !== undefined) out.note = note;
  return out;
}

/**
 * {@link joinSandhi} for Devanagari input and output. Inputs are normalised
 * with `normalizeDeva`; `result` and the alternatives are Devanagari.
 *
 * @example
 * joinSandhiDeva('रामः', 'अपि').result      // → 'रामोऽपि'
 * joinSandhiDeva('अहम्', 'गच्छामि').result  // → 'अहं गच्छामि'
 * joinSandhiDeva('तान्', 'लोकान्').result   // → 'ताँल्लोकान्'
 * joinSandhiDeva('मनः', 'रथः', { compound: true }).result // → 'मनोरथः'
 */
export function joinSandhiDeva(first: string, second: string, opts?: SandhiOptions): SandhiResult {
  const r = joinSandhi(devaToSlp1(normalizeDeva(first)), devaToSlp1(normalizeDeva(second)), opts);
  return {
    ...r,
    result: slp1ToDeva(r.result),
    alternatives: r.alternatives.map((a) => ({ ...a, result: slp1ToDeva(a.result) })),
  };
}

// ---------------------------------------------------------------------------
// ṇatva (internal sandhi helper)
// ---------------------------------------------------------------------------

/** sounds that may stand between the trigger and n: vowels, h y v (aṭ), k-varga, p-varga, anusvāra */
const NATVA_TRANSPARENT = `${VOWELS}hyvkKgGNpPbBmM`;

/**
 * Applies ṇatva (रषाभ्यां नो णः समानपदे 8.4.1, अट्कुप्वाङ्नुम्व्यवायेऽपि 8.4.2)
 * inside each word of an SLP1 string: `n` becomes `R` (ण्) when an `r`, `z`
 * (ष्), `f` or `F` precedes it in the same word with nothing in between except
 * vowels, `h y v`, gutturals, labials and anusvāra — provided the `n` is not
 * word-final (8.4.37) and is itself followed by a vowel or by `n m y v`.
 * A following `n` is assimilated too (`nizanna` → `nizaRRa`).
 *
 * Scope: ONE uncompounded word per space-separated token (stem + ending, as in
 * `rAmena` → `rAmeRa`). Do not pass compounds (`raGunandana`, `rAmanAma`):
 * their members are separate padas and 8.4.1 does not reach across them. The
 * lexical exceptions of the kṣubhnādi list (8.4.39) are not known to this
 * function apart from `kzuBnA-` and `tfpnu-`.
 *
 * @example
 * applyNatva('rAmena')   // → 'rAmeRa'
 * applyNatva('putrena')  // → 'putreRa'
 * applyNatva('raTena')   // → 'raTena'   (th intervenes)
 * applyNatva('arjunena') // → 'arjunena' (j intervenes)
 * applyNatva('rAmAn')    // → 'rAmAn'    (word-final n)
 */
export function applyNatva(slp1: string): string {
  let out = '';
  let armed = false;
  const n = slp1.length;
  for (let i = 0; i < n; i++) {
    const ch = slp1.charAt(i);
    if (ch === 'r' || ch === 'z' || ch === 'f' || ch === 'F') {
      armed = true;
      out += ch;
    } else if (ch === 'n') {
      const next = slp1.charAt(i + 1);
      const followOk = next !== '' && (VOWELS.includes(next) || 'nmyv'.includes(next));
      const excepted = out.endsWith('kzuB') || out.endsWith('tfp');
      if (armed && followOk && !excepted) {
        out += 'R';
        if (next === 'n') {
          out += 'R';
          i += 1;
        }
      } else out += 'n';
      armed = false;
    } else if (NATVA_TRANSPARENT.includes(ch)) {
      out += ch;
    } else {
      armed = false;
      out += ch;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

/**
 * The sandhi rules implemented by {@link joinSandhi}, with sūtra references,
 * learner summaries, and textbook examples. The registry is self-verifying:
 * the test-suite runs every example through {@link joinSandhiDeva} and checks
 * that no counterexample is attributed to its rule.
 */
export const SANDHI_RULES: readonly SandhiRule[] = [
  // ----- svara -----
  {
    id: 'savarna-dirgha',
    family: 'svara',
    name: { sa: 'सवर्णदीर्घसन्धिः', iast: 'savarṇadīrghasandhiḥ', en: 'Lengthening of like vowels' },
    sutra: { ref: '6.1.101', text: 'अकः सवर्णे दीर्घः' },
    summary: 'Two like simple vowels (a/ā, i/ī, u/ū, ṛ/ṝ), short or long, merge into the one long vowel.',
    examples: [
      { first: 'देव', second: 'आलयः', result: 'देवालयः' },
      { first: 'विद्या', second: 'अर्थी', result: 'विद्यार्थी' },
      { first: 'कवि', second: 'इन्द्रः', result: 'कवीन्द्रः' },
      { first: 'मही', second: 'ईशः', result: 'महीशः' },
      { first: 'भानु', second: 'उदयः', result: 'भानूदयः' },
      { first: 'पितृ', second: 'ऋणम्', result: 'पितॄणम्' },
    ],
    counterexamples: [
      { first: 'देव', second: 'इन्द्रः', note: 'a and i are not like vowels: guṇa gives देवेन्द्रः.' },
      { first: 'इति', second: 'आदि', note: 'i before an unlike vowel becomes y: इत्यादि.' },
    ],
  },
  {
    id: 'guna',
    family: 'svara',
    name: { sa: 'गुणसन्धिः', iast: 'guṇasandhiḥ', en: 'Guṇa' },
    sutra: { ref: '6.1.87', text: 'आद्गुणः' },
    summary: 'a or ā followed by i/ī, u/ū, ṛ/ṝ, ḷ merges into e, o, ar, al respectively.',
    examples: [
      { first: 'देव', second: 'इन्द्रः', result: 'देवेन्द्रः' },
      { first: 'गण', second: 'ईशः', result: 'गणेशः' },
      { first: 'सूर्य', second: 'उदयः', result: 'सूर्योदयः' },
      { first: 'महा', second: 'उत्सवः', result: 'महोत्सवः' },
      { first: 'महा', second: 'ऋषिः', result: 'महर्षिः' },
      { first: 'तव', second: 'ऌकारः', result: 'तवल्कारः' },
    ],
    counterexamples: [
      { first: 'सदा', second: 'एव', note: 'a/ā before e gives vṛddhi ai: सदैव.' },
      { first: 'देव', second: 'आलयः', note: 'a + ā are like vowels: देवालयः.' },
    ],
  },
  {
    id: 'vrddhi',
    family: 'svara',
    name: { sa: 'वृद्धिसन्धिः', iast: 'vṛddhisandhiḥ', en: 'Vṛddhi' },
    sutra: { ref: '6.1.88', text: 'वृद्धिरेचि' },
    summary: 'a or ā followed by e/ai merges into ai, and followed by o/au into au.',
    examples: [
      { first: 'सदा', second: 'एव', result: 'सदैव' },
      { first: 'तव', second: 'एव', result: 'तवैव' },
      { first: 'देव', second: 'ऐश्वर्यम्', result: 'देवैश्वर्यम्' },
      { first: 'महा', second: 'ओषधिः', result: 'महौषधिः' },
      { first: 'महा', second: 'औत्सुक्यम्', result: 'महौत्सुक्यम्' },
      { first: 'एक', second: 'एकम्', result: 'एकैकम्' },
    ],
    counterexamples: [{ first: 'देव', second: 'इन्द्रः', note: 'a + i is guṇa (e), not vṛddhi.' }],
  },
  {
    id: 'yan',
    family: 'svara',
    name: { sa: 'यण्सन्धिः', iast: 'yaṇsandhiḥ', en: 'Semivowel substitution' },
    sutra: { ref: '6.1.77', text: 'इको यणचि' },
    summary: 'i/ī, u/ū, ṛ/ṝ, ḷ before an unlike vowel become y, v, r, l.',
    examples: [
      { first: 'इति', second: 'आदि', result: 'इत्यादि' },
      { first: 'यदि', second: 'अपि', result: 'यद्यपि' },
      { first: 'प्रति', second: 'एकम्', result: 'प्रत्येकम्' },
      { first: 'सु', second: 'आगतम्', result: 'स्वागतम्' },
      { first: 'मधु', second: 'अरिः', result: 'मध्वरिः' },
      { first: 'पितृ', second: 'आज्ञा', result: 'पित्राज्ञा' },
      { first: 'ऌ', second: 'आकृतिः', result: 'लाकृतिः' },
    ],
    counterexamples: [
      { first: 'कवि', second: 'इन्द्रः', note: 'i + i are like vowels: कवीन्द्रः.' },
      { first: 'हरी', second: 'एतौ', options: { pragrhya: true }, note: 'A dual in ī is pragṛhya and stays unchanged.' },
    ],
  },
  {
    id: 'ayadi',
    family: 'svara',
    name: { sa: 'अयादिसन्धिः', iast: 'ayādisandhiḥ', en: 'ay / av / āy / āv substitution' },
    sutra: { ref: '6.1.78', text: 'एचोऽयवायावः' },
    summary: 'e, o, ai, au before a vowel become ay, av, āy, āv (word-internally always; at the end of a word regularly only au → āv).',
    examples: [
      { first: 'ने', second: 'अनम्', result: 'नयनम्', options: { internal: true } },
      { first: 'भो', second: 'अनम्', result: 'भवनम्', options: { internal: true } },
      { first: 'नै', second: 'अकः', result: 'नायकः', options: { internal: true } },
      { first: 'पौ', second: 'अकः', result: 'पावकः' },
      { first: 'तौ', second: 'अत्र', result: 'तावत्र' },
      { first: 'गो', second: 'ईशः', result: 'गवीशः' },
    ],
    counterexamples: [
      { first: 'वने', second: 'अत्र', note: 'Word-final e before short a: the a is absorbed (वनेऽत्र).' },
      { first: 'वने', second: 'आस्ते', note: 'Word-final e before another vowel normally becomes a with hiatus (वन आस्ते).' },
    ],
  },
  {
    id: 'purvarupa',
    family: 'svara',
    name: { sa: 'पूर्वरूपसन्धिः', iast: 'pūrvarūpasandhiḥ', en: 'Absorption of a after e / o' },
    sutra: { ref: '6.1.109', text: 'एङः पदान्तादति' },
    summary: 'After a word-final e or o, a following short a is absorbed and marked by the avagraha (ऽ).',
    examples: [
      { first: 'वने', second: 'अत्र', result: 'वनेऽत्र' },
      { first: 'ते', second: 'अपि', result: 'तेऽपि' },
      { first: 'हरे', second: 'अव', result: 'हरेऽव' },
      { first: 'विष्णो', second: 'अव', result: 'विष्णोऽव' },
      { first: 'प्रभो', second: 'अत्र', result: 'प्रभोऽत्र' },
    ],
    counterexamples: [
      { first: 'वने', second: 'आस्ते', note: 'Only short a is absorbed; before ā the result is वन आस्ते.' },
      { first: 'ने', second: 'अनम्', options: { internal: true }, note: 'Inside a word e + a gives aya: नयनम्.' },
    ],
  },
  {
    id: 'yava-lopa',
    family: 'svara',
    name: { sa: 'पदान्तयवलोपः', iast: 'padāntayavalopaḥ', en: 'Hiatus after word-final e / o / ai' },
    sutra: { ref: '8.3.19', text: 'लोपः शाकल्यस्य' },
    summary: 'Word-final e or o before a vowel other than short a becomes a, and ai becomes ā; the two words then stay apart with no further sandhi.',
    examples: [
      { first: 'वने', second: 'आस्ते', result: 'वन आस्ते' },
      { first: 'ते', second: 'इमे', result: 'त इमे' },
      { first: 'सर्वे', second: 'एव', result: 'सर्व एव' },
      { first: 'हरे', second: 'एहि', result: 'हर एहि' },
      { first: 'विष्णो', second: 'इह', result: 'विष्ण इह' },
      { first: 'तस्मै', second: 'अदात्', result: 'तस्मा अदात्' },
    ],
    counterexamples: [
      { first: 'ते', second: 'अपि', note: 'Before short a the a is absorbed instead: तेऽपि.' },
      { first: 'तौ', second: 'अत्र', note: 'au regularly becomes āv: तावत्र.' },
    ],
  },
  {
    id: 'pragrhya',
    family: 'svara',
    name: { sa: 'प्रकृतिभावः', iast: 'prakṛtibhāvaḥ', en: 'Pragṛhya: no vowel sandhi' },
    sutra: { ref: '1.1.11', text: 'ईदूदेद्द्विवचनं प्रगृह्यम्' },
    summary: 'A dual form ending in ī, ū or e (and a few particles such as अहो, and अमी) stays unchanged before a vowel (6.1.125).',
    examples: [
      { first: 'हरी', second: 'एतौ', result: 'हरी एतौ', options: { pragrhya: true } },
      { first: 'विष्णू', second: 'इमौ', result: 'विष्णू इमौ', options: { pragrhya: true } },
      { first: 'गङ्गे', second: 'अमू', result: 'गङ्गे अमू', options: { pragrhya: true } },
      { first: 'अमी', second: 'ईशाः', result: 'अमी ईशाः' },
      { first: 'अहो', second: 'ईशाः', result: 'अहो ईशाः' },
    ],
    counterexamples: [{ first: 'नदी', second: 'ईशः', note: 'A singular in ī is not pragṛhya: नदीशः.' }],
  },
  // ----- visarga -----
  {
    id: 'visarga-o-avagraha',
    family: 'visarga',
    name: { sa: 'उत्वसन्धिः (अति)', iast: 'utvasandhiḥ (ati)', en: 'aḥ + a → o ऽ' },
    sutra: { ref: '6.1.113', text: 'अतो रोरप्लुतादप्लुते' },
    summary: 'aḥ followed by short a becomes o, and the following a is absorbed (written ऽ).',
    examples: [
      { first: 'रामः', second: 'अपि', result: 'रामोऽपि' },
      { first: 'सः', second: 'अहम्', result: 'सोऽहम्' },
      { first: 'कः', second: 'अपि', result: 'कोऽपि' },
      { first: 'शिवः', second: 'अर्च्यः', result: 'शिवोऽर्च्यः' },
      { first: 'नमः', second: 'अस्तु', result: 'नमोऽस्तु' },
    ],
    counterexamples: [
      { first: 'रामः', second: 'इति', note: 'Before any other vowel the visarga is simply dropped: राम इति.' },
      { first: 'देवाः', second: 'अत्र', note: 'āḥ loses its visarga: देवा अत्र.' },
      { first: 'पुनः', second: 'अपि', note: 'पुनः is r-final (punar): पुनरपि.' },
    ],
  },
  {
    id: 'visarga-o',
    family: 'visarga',
    name: { sa: 'उत्वसन्धिः (हशि)', iast: 'utvasandhiḥ (haśi)', en: 'aḥ + voiced consonant → o' },
    sutra: { ref: '6.1.114', text: 'हशि च' },
    summary: 'aḥ before a voiced consonant becomes o.',
    examples: [
      { first: 'रामः', second: 'गच्छति', result: 'रामो गच्छति' },
      { first: 'शिवः', second: 'वन्द्यः', result: 'शिवो वन्द्यः' },
      { first: 'बालः', second: 'हसति', result: 'बालो हसति' },
      { first: 'नमः', second: 'नमः', result: 'नमो नमः' },
      { first: 'मनः', second: 'रथः', result: 'मनोरथः', options: { compound: true } },
      { first: 'तपः', second: 'वनम्', result: 'तपोवनम्', options: { compound: true } },
    ],
    counterexamples: [
      { first: 'रामः', second: 'करोति', note: 'k is voiceless: the visarga stays.' },
      { first: 'देवाः', second: 'गच्छन्ति', note: 'āḥ loses its visarga: देवा गच्छन्ति.' },
      { first: 'हरिः', second: 'गच्छति', note: 'After i the visarga becomes r: हरिर्गच्छति.' },
    ],
  },
  {
    id: 'visarga-lopa-a',
    family: 'visarga',
    name: { sa: 'विसर्गलोपः (अतः परम्)', iast: 'visargalopaḥ (ataḥ param)', en: 'aḥ + vowel other than a → a' },
    sutra: { ref: '8.3.17', text: 'भोभगोअघोअपूर्वस्य योऽशि' },
    summary: 'aḥ before any vowel except short a loses its visarga; the two vowels stay apart (8.3.17 with 8.3.19 लोपः शाकल्यस्य).',
    examples: [
      { first: 'रामः', second: 'इति', result: 'राम इति' },
      { first: 'अतः', second: 'एव', result: 'अत एव' },
      { first: 'सूर्यः', second: 'उदेति', result: 'सूर्य उदेति' },
      { first: 'बालः', second: 'आगच्छति', result: 'बाल आगच्छति' },
      { first: 'कः', second: 'एषः', result: 'क एषः' },
    ],
    counterexamples: [{ first: 'रामः', second: 'अपि', note: 'Before short a: रामोऽपि.' }],
  },
  {
    id: 'visarga-lopa-aa',
    family: 'visarga',
    name: { sa: 'विसर्गलोपः (आतः परम्)', iast: 'visargalopaḥ (ātaḥ param)', en: 'āḥ + vowel / voiced consonant → ā' },
    sutra: { ref: '8.3.22', text: 'हलि सर्वेषाम्' },
    summary: 'āḥ loses its visarga before any vowel or voiced consonant (8.3.17 with 8.3.19 before vowels, 8.3.22 before consonants).',
    examples: [
      { first: 'देवाः', second: 'गच्छन्ति', result: 'देवा गच्छन्ति' },
      { first: 'बालाः', second: 'हसन्ति', result: 'बाला हसन्ति' },
      { first: 'अश्वाः', second: 'धावन्ति', result: 'अश्वा धावन्ति' },
      { first: 'देवाः', second: 'इह', result: 'देवा इह' },
      { first: 'नराः', second: 'अत्र', result: 'नरा अत्र' },
    ],
    counterexamples: [
      { first: 'देवाः', second: 'तत्र', note: 'Before t the visarga becomes s: देवास्तत्र.' },
      { first: 'बालाः', second: 'पठन्ति', note: 'Before p the visarga stays.' },
    ],
  },
  {
    id: 'visarga-rutva',
    family: 'visarga',
    name: { sa: 'रुत्वसन्धिः', iast: 'rutvasandhiḥ', en: 'visarga → r' },
    sutra: { ref: '8.2.66', text: 'ससजुषो रुः' },
    summary: 'A visarga after any vowel other than a / ā becomes r before a vowel or a voiced consonant.',
    examples: [
      { first: 'हरिः', second: 'अत्र', result: 'हरिरत्र' },
      { first: 'मुनिः', second: 'अयम्', result: 'मुनिरयम्' },
      { first: 'गुरुः', second: 'गच्छति', result: 'गुरुर्गच्छति' },
      { first: 'साधुः', second: 'इति', result: 'साधुरिति' },
      { first: 'पितुः', second: 'आज्ञा', result: 'पितुराज्ञा' },
      { first: 'कवेः', second: 'इदम्', result: 'कवेरिदम्' },
      { first: 'गौः', second: 'इयम्', result: 'गौरियम्' },
    ],
    counterexamples: [
      { first: 'हरिः', second: 'करोति', note: 'Before a voiceless k the visarga stays.' },
      { first: 'रामः', second: 'गच्छति', note: 'After a the visarga gives o: रामो गच्छति.' },
      { first: 'हरिः', second: 'रम्यः', note: 'Before r the r is dropped and the vowel lengthened: हरी रम्यः.' },
    ],
  },
  {
    id: 'visarga-satva',
    family: 'visarga',
    name: { sa: 'सत्वसन्धिः', iast: 'satvasandhiḥ', en: 'visarga → ś / ṣ / s' },
    sutra: { ref: '8.3.34', text: 'विसर्जनीयस्य सः' },
    summary: 'A visarga becomes ś before c / ch, ṣ before ṭ / ṭh, and s before t / th (8.3.34 with 8.4.40, 8.4.41).',
    examples: [
      { first: 'रामः', second: 'च', result: 'रामश्च' },
      { first: 'कः', second: 'चित्', result: 'कश्चित्' },
      { first: 'हरिः', second: 'चरति', result: 'हरिश्चरति' },
      { first: 'रामः', second: 'टीकते', result: 'रामष्टीकते' },
      { first: 'धनुः', second: 'टङ्कारः', result: 'धनुष्टङ्कारः' },
      { first: 'रामः', second: 'तिष्ठति', result: 'रामस्तिष्ठति' },
      { first: 'नमः', second: 'ते', result: 'नमस्ते' },
      { first: 'पुनः', second: 'च', result: 'पुनश्च' },
    ],
    counterexamples: [
      { first: 'रामः', second: 'करोति', note: 'Before k the visarga stays.' },
      { first: 'सः', second: 'तिष्ठति', note: 'सः simply drops its visarga before a consonant: स तिष्ठति.' },
    ],
  },
  {
    id: 'visarga-kupvoh',
    family: 'visarga',
    name: { sa: 'विसर्गस्य स्थितिः (कुप्वोः)', iast: 'visargasya sthitiḥ (kupvoḥ)', en: 'visarga stays before k kh p ph' },
    sutra: { ref: '8.3.37', text: 'कुप्वोः ≍क≍पौ च' },
    summary: 'Before k, kh, p, ph the visarga remains (pronounced as jihvāmūlīya / upadhmānīya or as plain visarga).',
    examples: [
      { first: 'रामः', second: 'करोति', result: 'रामः करोति' },
      { first: 'बालः', second: 'पठति', result: 'बालः पठति' },
      { first: 'देवाः', second: 'खादन्ति', result: 'देवाः खादन्ति' },
      { first: 'वृक्षः', second: 'फलति', result: 'वृक्षः फलति' },
      { first: 'अन्तः', second: 'करणम्', result: 'अन्तःकरणम्', options: { compound: true } },
      { first: 'प्रातः', second: 'कालः', result: 'प्रातःकालः', options: { compound: true } },
    ],
    counterexamples: [
      { first: 'रामः', second: 'च', note: 'Before c the visarga becomes ś.' },
      { first: 'निः', second: 'कामः', note: 'The prefix nis takes ṣ: निष्कामः.' },
    ],
  },
  {
    id: 'visarga-shari',
    family: 'visarga',
    name: { sa: 'विसर्गस्य स्थितिः (शरि)', iast: 'visargasya sthitiḥ (śari)', en: 'visarga before ś ṣ s' },
    sutra: { ref: '8.3.36', text: 'वा शरि' },
    summary: 'Before ś, ṣ, s the visarga remains, or optionally becomes the same sibilant (हरिः शेते / हरिश्शेते).',
    examples: [
      { first: 'हरिः', second: 'शेते', result: 'हरिः शेते' },
      { first: 'रामः', second: 'षष्ठः', result: 'रामः षष्ठः' },
      { first: 'बालः', second: 'सरति', result: 'बालः सरति' },
      { first: 'देवाः', second: 'सन्ति', result: 'देवाः सन्ति' },
    ],
    counterexamples: [{ first: 'सः', second: 'शम्भुः', note: 'सः drops its visarga before any consonant: स शम्भुः.' }],
  },
  {
    id: 'visarga-sah-esah',
    family: 'visarga',
    name: { sa: 'सुलोपः (सः, एषः)', iast: 'sulopaḥ (saḥ, eṣaḥ)', en: 'saḥ / eṣaḥ drop the visarga' },
    sutra: { ref: '6.1.132', text: 'एतत्तदोः सुलोपोऽकोरनञ्समासे हलि' },
    summary: 'The pronouns सः and एषः lose their visarga before every consonant.',
    examples: [
      { first: 'सः', second: 'गच्छति', result: 'स गच्छति' },
      { first: 'सः', second: 'करोति', result: 'स करोति' },
      { first: 'सः', second: 'तिष्ठति', result: 'स तिष्ठति' },
      { first: 'सः', second: 'शम्भुः', result: 'स शम्भुः' },
      { first: 'एषः', second: 'विष्णुः', result: 'एष विष्णुः' },
      { first: 'एषः', second: 'पठति', result: 'एष पठति' },
    ],
    counterexamples: [
      { first: 'सः', second: 'अपि', note: 'Before short a the regular rule applies: सोऽपि.' },
      { first: 'कः', second: 'गच्छति', note: 'Only सः and एषः: को गच्छति.' },
    ],
  },
  {
    id: 'visarga-r-final',
    family: 'visarga',
    name: { sa: 'रेफान्तपदस्य रेफः', iast: 'rephāntapadasya rephaḥ', en: 'r-final words keep r' },
    sutra: { ref: '8.3.15', text: 'खरवसानयोर्विसर्जनीयः' },
    summary: 'In words that really end in r (punar, prātar, antar …) the r becomes visarga only before a voiceless sound or a pause; before vowels and voiced consonants it stays r, even after a.',
    examples: [
      { first: 'पुनः', second: 'अपि', result: 'पुनरपि' },
      { first: 'पुनः', second: 'जन्म', result: 'पुनर्जन्म' },
      { first: 'प्रातः', second: 'एव', result: 'प्रातरेव' },
      { first: 'अन्तः', second: 'गतम्', result: 'अन्तर्गतम्', options: { rFinal: true } },
      { first: 'अन्तः', second: 'आत्मा', result: 'अन्तरात्मा', options: { rFinal: true } },
      { first: 'स्वः', second: 'गतः', result: 'स्वर्गतः', options: { rFinal: true } },
    ],
    counterexamples: [
      { first: 'पुनः', second: 'च', note: 'Before a voiceless sound the r is a visarga, which here becomes ś: पुनश्च.' },
      { first: 'रामः', second: 'अपि', note: 'रामः ends in s, not r: रामोऽपि.' },
    ],
  },
  {
    id: 'r-lopa-dirgha',
    family: 'visarga',
    name: { sa: 'रेफलोपः पूर्वदीर्घश्च', iast: 'rephalopaḥ pūrvadīrghaś ca', en: 'r + r → long vowel + r' },
    sutra: { ref: '8.3.14', text: 'रो रि' },
    summary: 'When r (from a visarga or original) meets a following r, the first r is dropped and a preceding a, i, u is lengthened (6.3.111 ढ्रलोपे पूर्वस्य दीर्घोऽणः).',
    examples: [
      { first: 'हरिः', second: 'रम्यः', result: 'हरी रम्यः' },
      { first: 'शम्भुः', second: 'राजते', result: 'शम्भू राजते' },
      { first: 'पुनः', second: 'रमते', result: 'पुना रमते' },
      { first: 'निः', second: 'रसः', result: 'नीरसः', options: { compound: true } },
      { first: 'निः', second: 'रोगः', result: 'नीरोगः', options: { compound: true } },
    ],
    counterexamples: [
      { first: 'रामः', second: 'राजते', note: 'aḥ from s becomes o before the voiced r: रामो राजते.' },
      { first: 'देवाः', second: 'रक्षन्ति', note: 'āḥ just drops its visarga: देवा रक्षन्ति.' },
    ],
  },
  {
    id: 'visarga-bhoh',
    family: 'visarga',
    name: { sa: 'भोःशब्दस्य विसर्गलोपः', iast: 'bhoḥśabdasya visargalopaḥ', en: 'bhoḥ drops the visarga' },
    sutra: { ref: '8.3.17', text: 'भोभगोअघोअपूर्वस्य योऽशि' },
    summary: 'The vocative particles भोः, भगोः, अघोः lose their visarga before vowels and voiced consonants (8.3.17 with 8.3.19, 8.3.22).',
    examples: [
      { first: 'भोः', second: 'देवाः', result: 'भो देवाः' },
      { first: 'भोः', second: 'अच्युत', result: 'भो अच्युत' },
      { first: 'भोः', second: 'राजन्', result: 'भो राजन्' },
      { first: 'भगोः', second: 'नमस्ते', result: 'भगो नमस्ते' },
      { first: 'अघोः', second: 'याहि', result: 'अघो याहि' },
    ],
    counterexamples: [{ first: 'भोः', second: 'कृष्ण', note: 'Before a voiceless sound the visarga stays.' }],
  },
  {
    id: 'visarga-shatva',
    family: 'visarga',
    name: { sa: 'विसर्गस्य षत्वम्', iast: 'visargasya ṣatvam', en: 'niḥ / duḥ + k p → ṣ' },
    sutra: { ref: '8.3.41', text: 'इदुदुपधस्य चाप्रत्ययस्य' },
    summary: 'The visarga of निः, दुः, बहिः, आविः, प्रादुः, चतुः (not a case-ending) becomes ṣ before k, kh, p, ph.',
    examples: [
      { first: 'निः', second: 'कामः', result: 'निष्कामः' },
      { first: 'निः', second: 'फलम्', result: 'निष्फलम्' },
      { first: 'दुः', second: 'कृतम्', result: 'दुष्कृतम्' },
      { first: 'दुः', second: 'प्रापः', result: 'दुष्प्रापः' },
      { first: 'बहिः', second: 'कृतः', result: 'बहिष्कृतः' },
      { first: 'आविः', second: 'कृतम्', result: 'आविष्कृतम्' },
      { first: 'चतुः', second: 'पादः', result: 'चतुष्पादः' },
    ],
    counterexamples: [
      { first: 'हरिः', second: 'करोति', note: 'The visarga of a case-ending stays.' },
      { first: 'निः', second: 'चलः', note: 'Before c the visarga becomes ś: निश्चलः.' },
    ],
  },
  // ----- vyañjana -----
  {
    id: 'jashtva',
    family: 'vyanjana',
    name: { sa: 'जश्त्वसन्धिः', iast: 'jaśtvasandhiḥ', en: 'Voicing of a final stop' },
    sutra: { ref: '8.2.39', text: 'झलां जशोऽन्ते' },
    summary: 'A word-final k, ṭ, t, p becomes g, ḍ, d, b before a vowel or a voiced consonant.',
    examples: [
      { first: 'वाक्', second: 'ईशः', result: 'वागीशः' },
      { first: 'जगत्', second: 'ईशः', result: 'जगदीशः' },
      { first: 'तत्', second: 'एव', result: 'तदेव' },
      { first: 'षट्', second: 'आननः', result: 'षडाननः' },
      { first: 'दिक्', second: 'गजः', result: 'दिग्गजः' },
      { first: 'अप्', second: 'जः', result: 'अब्जः' },
      { first: 'भगवत्', second: 'गीता', result: 'भगवद्गीता' },
      { first: 'उत्', second: 'घाटनम्', result: 'उद्घाटनम्' },
    ],
    counterexamples: [
      { first: 'तत्', second: 'करोति', note: 'Before a voiceless sound the stop stays voiceless.' },
      { first: 'जगत्', second: 'नाथः', note: 'Before a nasal the stop usually becomes a nasal: जगन्नाथः.' },
    ],
  },
  {
    id: 'cartva',
    family: 'vyanjana',
    name: { sa: 'चर्त्वसन्धिः', iast: 'cartvasandhiḥ', en: 'Devoicing before a voiceless sound' },
    sutra: { ref: '8.4.55', text: 'खरि च' },
    summary: 'A stop is voiceless before a voiceless consonant (तद् + परः → तत्परः).',
    examples: [
      { first: 'तद्', second: 'परः', result: 'तत्परः' },
      { first: 'सद्', second: 'कारः', result: 'सत्कारः' },
      { first: 'उद्', second: 'साहः', result: 'उत्साहः' },
      { first: 'विपद्', second: 'कालः', result: 'विपत्कालः' },
    ],
    counterexamples: [{ first: 'तद्', second: 'एव', note: 'Before a vowel the stop is voiced: तदेव.' }],
  },
  {
    id: 'shcutva',
    family: 'vyanjana',
    name: { sa: 'श्चुत्वसन्धिः', iast: 'ścutvasandhiḥ', en: 'Palatalisation' },
    sutra: { ref: '8.4.40', text: 'स्तोः श्चुना श्चुः' },
    summary: 'A dental (t, d, n) meeting a palatal becomes the corresponding palatal: t + c → cc, t + j → jj, n + j → ñj.',
    examples: [
      { first: 'सत्', second: 'चित्', result: 'सच्चित्' },
      { first: 'तत्', second: 'च', result: 'तच्च' },
      { first: 'शरत्', second: 'चन्द्रः', result: 'शरच्चन्द्रः' },
      { first: 'सत्', second: 'जनः', result: 'सज्जनः' },
      { first: 'उत्', second: 'ज्वलः', result: 'उज्ज्वलः' },
      { first: 'तान्', second: 'जनान्', result: 'ताञ्जनान्' },
      { first: 'शार्ङ्गिन्', second: 'जय', result: 'शार्ङ्गिञ्जय' },
    ],
    counterexamples: [
      { first: 'तत्', second: 'टीका', note: 'Before a retroflex the dental becomes retroflex: तट्टीका.' },
      { first: 'तत्', second: 'शिवः', note: 'Before ś the usual result also changes ś to ch: तच्छिवः.' },
    ],
  },
  {
    id: 'shtutva',
    family: 'vyanjana',
    name: { sa: 'ष्टुत्वसन्धिः', iast: 'ṣṭutvasandhiḥ', en: 'Retroflexion' },
    sutra: { ref: '8.4.41', text: 'ष्टुना ष्टुः' },
    summary: 'A dental (t, d, n) meeting a retroflex stop becomes the corresponding retroflex: t + ṭ → ṭṭ, t + ḍ → ḍḍ, n + ḍh → ṇḍh.',
    examples: [
      { first: 'तत्', second: 'टीका', result: 'तट्टीका' },
      { first: 'बृहत्', second: 'टीका', result: 'बृहट्टीका' },
      { first: 'उत्', second: 'डीनः', result: 'उड्डीनः' },
      { first: 'चक्रिन्', second: 'ढौकसे', result: 'चक्रिण्ढौकसे' },
    ],
    counterexamples: [
      { first: 'षट्', second: 'ते', note: 'After a word-final retroflex the following dental does not change (8.4.42).' },
      { first: 'सत्', second: 'षष्ठः', note: 'A dental before ṣ does not change (8.4.43 तोः षि).' },
    ],
  },
  {
    id: 'parasavarna-l',
    family: 'vyanjana',
    name: { sa: 'परसवर्णसन्धिः (लि)', iast: 'parasavarṇasandhiḥ (li)', en: 'Assimilation to l' },
    sutra: { ref: '8.4.60', text: 'तोर्लि' },
    summary: 'A dental before l becomes l: t + l → ll, and n + l → nasalised l\u0310l (written ँल्ल).',
    examples: [
      { first: 'तत्', second: 'लीनः', result: 'तल्लीनः' },
      { first: 'तत्', second: 'लयः', result: 'तल्लयः' },
      { first: 'उत्', second: 'लेखः', result: 'उल्लेखः' },
      { first: 'विद्वान्', second: 'लिखति', result: 'विद्वाँल्लिखति' },
      { first: 'तान्', second: 'लोकान्', result: 'ताँल्लोकान्' },
    ],
    counterexamples: [{ first: 'वाक्', second: 'लाघवम्', note: 'Only dentals assimilate; k is just voiced: वाग्लाघवम्.' }],
  },
  {
    id: 'chatva',
    family: 'vyanjana',
    name: { sa: 'छत्वसन्धिः', iast: 'chatvasandhiḥ', en: 'ś → ch after a stop' },
    sutra: { ref: '8.4.63', text: 'शश्छोऽटि' },
    summary: 'After a word-final stop, ś (followed by a vowel, semivowel or nasal) may become ch; with a final t this gives the usual cch: तत् + शिवः → तच्छिवः.',
    examples: [
      { first: 'तत्', second: 'शिवः', result: 'तच्छिवः' },
      { first: 'तत्', second: 'श्रुत्वा', result: 'तच्छ्रुत्वा' },
      { first: 'सत्', second: 'शास्त्रम्', result: 'सच्छास्त्रम्' },
      { first: 'उत्', second: 'श्वासः', result: 'उच्छ्वासः' },
      { first: 'तत्', second: 'श्लोकेन', result: 'तच्छ्लोकेन' },
    ],
    counterexamples: [{ first: 'तत्', second: 'च', note: 'Plain palatalisation: तच्च.' }],
  },
  {
    id: 'anunasika',
    family: 'vyanjana',
    name: { sa: 'अनुनासिकसन्धिः', iast: 'anunāsikasandhiḥ', en: 'Stop → nasal before a nasal' },
    sutra: { ref: '8.4.45', text: 'यरोऽनुनासिकेऽनुनासिको वा' },
    summary: 'A word-final stop before a nasal usually becomes the nasal of its own class (k → ṅ, ṭ → ṇ, t → n, p → m); the voiced stop is the permitted alternative.',
    examples: [
      { first: 'जगत्', second: 'नाथः', result: 'जगन्नाथः' },
      { first: 'एतत्', second: 'मुरारिः', result: 'एतन्मुरारिः' },
      { first: 'सत्', second: 'मार्गः', result: 'सन्मार्गः' },
      { first: 'वाक्', second: 'मयम्', result: 'वाङ्मयम्' },
      { first: 'तत्', second: 'मात्रम्', result: 'तन्मात्रम्' },
      { first: 'षट्', second: 'मासाः', result: 'षण्मासाः' },
      { first: 'दिक्', second: 'नागः', result: 'दिङ्नागः' },
    ],
    counterexamples: [{ first: 'तत्', second: 'गच्छति', note: 'Before a voiced non-nasal the stop is only voiced: तद्गच्छति.' }],
  },
  {
    id: 'purvasavarna-h',
    family: 'vyanjana',
    name: { sa: 'पूर्वसवर्णसन्धिः (हकारस्य)', iast: 'pūrvasavarṇasandhiḥ (hakārasya)', en: 'stop + h → voiced stop + aspirate' },
    sutra: { ref: '8.4.62', text: 'झयो होऽन्यतरस्याम्' },
    summary: 'After a word-final stop, h usually becomes the voiced aspirate of that stop\u2019s class: k + h → ggh, t + h → ddh.',
    examples: [
      { first: 'वाक्', second: 'हरिः', result: 'वाग्घरिः' },
      { first: 'तत्', second: 'हितम्', result: 'तद्धितम्' },
      { first: 'उत्', second: 'हारः', result: 'उद्धारः' },
      { first: 'एतत्', second: 'हि', result: 'एतद्धि' },
    ],
    counterexamples: [{ first: 'तत्', second: 'एव', note: 'Before a vowel there is only voicing: तदेव.' }],
  },
  {
    id: 'udah-stha',
    family: 'vyanjana',
    name: { sa: 'पूर्वसवर्णसन्धिः (उदः स्थास्तम्भोः)', iast: 'pūrvasavarṇasandhiḥ (udaḥ sthāstambhoḥ)', en: 'ud + sthā / stambh' },
    sutra: { ref: '8.4.61', text: 'उदः स्थास्तम्भोः पूर्वस्य' },
    summary: 'After the prefix ud, the initial s of the roots sthā and stambh is lost: ud + sthāna → utthāna.',
    examples: [
      { first: 'उत्', second: 'स्थानम्', result: 'उत्थानम्' },
      { first: 'उत्', second: 'स्थितः', result: 'उत्थितः' },
      { first: 'उत्', second: 'स्थापनम्', result: 'उत्थापनम्' },
      { first: 'उत्', second: 'स्तम्भनम्', result: 'उत्तम्भनम्' },
    ],
    counterexamples: [
      { first: 'उत्', second: 'साहः', note: 'Only the roots sthā and stambh: उत्साहः.' },
      { first: 'तत्', second: 'स्थानम्', note: 'Only after the prefix ud: तत्स्थानम्.' },
    ],
  },
  {
    id: 'anusvara',
    family: 'vyanjana',
    name: { sa: 'अनुस्वारसन्धिः', iast: 'anusvārasandhiḥ', en: 'm → anusvāra' },
    sutra: { ref: '8.3.23', text: 'मोऽनुस्वारः' },
    summary: 'A word-final m becomes anusvāra before any consonant; before a vowel it stays m and joins the vowel.',
    examples: [
      { first: 'अहम्', second: 'गच्छामि', result: 'अहं गच्छामि' },
      { first: 'हरिम्', second: 'वन्दे', result: 'हरिं वन्दे' },
      { first: 'गृहम्', second: 'गच्छति', result: 'गृहं गच्छति' },
      { first: 'सत्यम्', second: 'वद', result: 'सत्यं वद' },
      { first: 'धर्मम्', second: 'चर', result: 'धर्मं चर' },
      { first: 'त्वम्', second: 'करोषि', result: 'त्वं करोषि' },
    ],
    counterexamples: [{ first: 'अहम्', second: 'अत्र', note: 'Before a vowel m stays: अहमत्र.' }],
  },
  {
    id: 'anusvara-parasavarna',
    family: 'vyanjana',
    name: { sa: 'परसवर्णसन्धिः (अनुस्वारस्य)', iast: 'parasavarṇasandhiḥ (anusvārasya)', en: 'anusvāra → class nasal (optional)' },
    sutra: { ref: '8.4.59', text: 'वा पदान्तस्य' },
    summary: 'A word-final anusvāra may instead be written as the nasal of the following stop\u2019s class (त्वं करोषि or त्वङ्करोषि); inside a word this is the rule (8.4.58).',
    examples: [
      { first: 'त्वम्', second: 'करोषि', result: 'त्वङ्करोषि', alternative: true },
      { first: 'अहम्', second: 'च', result: 'अहञ्च', alternative: true },
      { first: 'किम्', second: 'तु', result: 'किन्तु', alternative: true },
      { first: 'सम्', second: 'पूर्णम्', result: 'सम्पूर्णम्', alternative: true },
      { first: 'शम्', second: 'करः', result: 'शङ्करः', alternative: true },
    ],
    counterexamples: [{ first: 'अहम्', second: 'हसामि', note: 'h has no class nasal: only अहं हसामि.' }],
  },
  {
    id: 'n-rutva',
    family: 'vyanjana',
    name: { sa: 'नकारस्य रुत्वम्', iast: 'nakārasya rutvam', en: 'n + c / ṭ / t → ṃś / ṃṣ / ṃs' },
    sutra: { ref: '8.3.7', text: 'नश्छव्यप्रशान्' },
    summary: 'A word-final n before c/ch, ṭ/ṭh, t/th becomes anusvāra + ś, ṣ, s respectively (the vowel may instead be nasalised: कस्मिँश्चित्).',
    examples: [
      { first: 'कस्मिन्', second: 'चित्', result: 'कस्मिंश्चित्' },
      { first: 'तान्', second: 'च', result: 'तांश्च' },
      { first: 'शार्ङ्गिन्', second: 'छिन्धि', result: 'शार्ङ्गिंश्छिन्धि' },
      { first: 'महान्', second: 'टङ्कारः', result: 'महांष्टङ्कारः' },
      { first: 'तान्', second: 'तान्', result: 'तांस्तान्' },
      { first: 'चक्रिन्', second: 'त्रायस्व', result: 'चक्रिंस्त्रायस्व' },
    ],
    counterexamples: [
      { first: 'प्रशान्', second: 'तनोति', note: 'प्रशान् is expressly excepted.' },
      { first: 'सन्', second: 'त्सरुः', note: 'The t must be followed by a vowel, semivowel or nasal: सन्त्सरुः.' },
      { first: 'तान्', second: 'जनान्', note: 'Before a voiced palatal n just becomes ñ: ताञ्जनान्.' },
    ],
  },
  {
    id: 'namut',
    family: 'vyanjana',
    name: { sa: 'ङमुडागमः', iast: 'ṅamuḍāgamaḥ', en: 'Doubling of a final nasal' },
    sutra: { ref: '8.3.32', text: 'ङमो ह्रस्वादचि ङमुण्नित्यम्' },
    summary: 'A word-final ṅ, ṇ or n after a short vowel is doubled before a vowel.',
    examples: [
      { first: 'तस्मिन्', second: 'एव', result: 'तस्मिन्नेव' },
      { first: 'गच्छन्', second: 'अस्ति', result: 'गच्छन्नस्ति' },
      { first: 'सन्', second: 'अच्युतः', result: 'सन्नच्युतः' },
      { first: 'प्रत्यङ्', second: 'आत्मा', result: 'प्रत्यङ्ङात्मा' },
      { first: 'सुगण्', second: 'ईशः', result: 'सुगण्णीशः' },
    ],
    counterexamples: [{ first: 'तान्', second: 'अपि', note: 'After a long vowel there is no doubling: तानपि.' }],
  },
  {
    id: 'tuk',
    family: 'vyanjana',
    name: { sa: 'तुगागमः', iast: 'tugāgamaḥ', en: 'ch → cch after a short vowel' },
    sutra: { ref: '6.1.73', text: 'छे च' },
    summary: 'After a short vowel (and after the particles ā and mā) ch is doubled to cch.',
    examples: [
      { first: 'वृक्ष', second: 'छाया', result: 'वृक्षच्छाया' },
      { first: 'स्व', second: 'छन्दः', result: 'स्वच्छन्दः' },
      { first: 'तरु', second: 'छाया', result: 'तरुच्छाया' },
      { first: 'वि', second: 'छेदः', result: 'विच्छेदः' },
      { first: 'आ', second: 'छादनम्', result: 'आच्छादनम्' },
    ],
    counterexamples: [{ first: 'लक्ष्मी', second: 'छाया', note: 'After a word-final long vowel the doubling is only optional (6.1.76).' }],
  },
];

const RULES_BY_ID = new Map(SANDHI_RULES.map((r) => [r.id, r]));

/**
 * Looks up a rule of {@link SANDHI_RULES} by id.
 * @example sandhiRule('guna')?.sutra?.ref // → '6.1.87'
 */
export function sandhiRule(id: string): SandhiRule | undefined {
  return RULES_BY_ID.get(id);
}
