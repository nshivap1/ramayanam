/**
 * Builds PREFIXED (upasarga / gati + dhātu, laṭ 3sg) and the lyap forms of the same combinations.
 *
 *   form  = joinPrefix(prefixes, verified base form)        — deterministic, conservative sandhi
 *   keep  ⇔ the exact joined form is attested (DCS token with the same tag, or vidyut's
 *           Kāśikā/Kaumudī-derived test assertions), or — only when the join is a plain
 *           concatenation — Monier-Williams lists the prefixed root.
 *
 * `joinPrefix` throws on every context it does not positively know (pararūpa, upasargād ṛti,
 * unlisted ṣatva …): such rows are rejected rather than guessed.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { devaToSlp1, normalizeDeva, slp1ToDeva, validateDeva } from '../../../src/sanskrit/translit';
import type { Level } from '../../../src/content/types';
import type { BuiltDhatu, Oracles } from './dhatu-build';
import { lyapStemsSlp, TAG_D } from './dhatu-build';
import { dcsCount, key, loadDictionarySanskrit, normSlp, oraclePath, PATHS } from './oracles';
import { PREFIXED_SPECS, type PrefixedSpec } from './prefixed-list';

const VOWELS = 'aAiIuUfFxXeEoO';
const isVowel = (c: string): boolean => c !== '' && VOWELS.includes(c);

/** ṣatva of a root-initial s after an i/u-final upasarga — explicit table; anything unlisted is refused. */
const SATVA: Record<string, 'yes' | 'no'> = {
  'sad-1p': 'yes', // सदिरप्रतेः 8.3.66 (निषीदति, विषीदति; but प्रतिसीदति)
  'sic-6u': 'yes', // 8.3.65 (अभिषिञ्चति)
  'smr-1p': 'no', // विस्मरति
  'srj-6p': 'no', // विसृजति
  'sprs-6p': 'no',
};

export interface JoinContext {
  baseId: string;
  /** root is ṇopadeśa (णम्, णी, णश् …): initial n → ṇ after pra, pari, nir … (8.4.14) */
  nopadesha: boolean;
}

export interface Joined {
  form: string;
  /** true when the result is the bare concatenation prefix + verb (no sound changed) */
  plain: boolean;
}

const CLASS_NASAL: Record<string, string> = {};
for (const [stops, nasal] of [['kKgG', 'N'], ['cCjJ', 'Y'], ['wWqQ', 'R'], ['tTdD', 'n'], ['pPbB', 'm']] as const) for (const c of stops) CLASS_NASAL[c] = nasal;

function joinOne(prefix: string, verb: string, ctx: JoinContext): Joined {
  const pEnd = prefix.charAt(prefix.length - 1);
  const v0 = verb.charAt(0);
  const stem = prefix.slice(0, -1);
  const rest = verb.slice(1);
  const refuse = (why: string): never => {
    throw new Error(`joinPrefix refuses ${prefix}+${verb}: ${why}`);
  };
  if (isVowel(pEnd)) {
    if (isVowel(v0)) {
      if ('aA'.includes(pEnd)) {
        if ('aA'.includes(v0)) return { form: stem + 'A' + rest, plain: false };
        if ('iI'.includes(v0)) return { form: stem + 'e' + rest, plain: false };
        if ('uU'.includes(v0)) return { form: stem + 'o' + rest, plain: false };
        return refuse('a/ā + ṛ, e, o, ai, au needs upasargād ṛti / eṅi pararūpam / etyedhatyūṭhsu');
      }
      if ('iI'.includes(pEnd)) {
        if ('iI'.includes(v0)) return { form: stem + 'I' + rest, plain: false };
        return { form: stem + 'y' + verb, plain: false };
      }
      if ('uU'.includes(pEnd)) {
        if ('uU'.includes(v0)) return { form: stem + 'U' + rest, plain: false };
        return { form: stem + 'v' + verb, plain: false };
      }
      return refuse('unsupported vowel junction');
    }
    if (v0 === 'n' && ctx.nopadesha && ['pra', 'pari', 'parA'].includes(prefix)) return { form: prefix + 'R' + rest, plain: false };
    if (v0 === 's' && 'iu'.includes(pEnd)) {
      const s = prefix === 'prati' && ctx.baseId === 'sad-1p' ? 'no' : SATVA[ctx.baseId];
      if (s === undefined) return refuse('ṣatva after an i/u-final prefix is not tabulated for this root');
      if (s === 'yes') return { form: prefix + 'z' + rest, plain: false };
      return { form: prefix + verb, plain: true };
    }
    if (v0 === 'C') return { form: prefix + 'c' + verb, plain: false }; // छे च 6.1.73
    return { form: prefix + verb, plain: true };
  }
  switch (prefix) {
    case 'ud': {
      if (verb.startsWith('sT') || verb.startsWith('stamB')) return { form: 'ut' + rest, plain: false }; // उदः स्थास्तम्भोः पूर्वस्य 8.4.61
      if (isVowel(v0) || 'gGdDbByrv'.includes(v0)) return { form: 'ud' + verb, plain: true };
      if ('kKpPtTs'.includes(v0)) return { form: 'ut' + verb, plain: false };
      if ('cC'.includes(v0)) return { form: 'uc' + verb, plain: false };
      if ('jJ'.includes(v0)) return { form: 'uj' + verb, plain: false };
      if (v0 === 'l') return { form: 'ul' + verb, plain: false };
      if ('nm'.includes(v0)) return { form: 'un' + verb, plain: false };
      if (v0 === 'h') return { form: 'udD' + rest, plain: false };
      if (v0 === 'S') return { form: 'ucC' + rest, plain: false };
      return refuse('ud + this initial is not tabulated');
    }
    case 'sam':
    case 'alam': {
      const base = prefix.slice(0, -1);
      if (prefix === 'sam' && ctx.baseId === 'kr-8u') return refuse('sam + kṛ takes suṭ (संस्करोति)');
      if (isVowel(v0) || v0 === 'm') return { form: prefix + verb, plain: true };
      const nasal = CLASS_NASAL[v0];
      if (nasal) return { form: base + nasal + verb, plain: nasal === 'm' };
      if (v0 === 'n') return { form: base + 'n' + verb, plain: false };
      if ('yrlvSzsh'.includes(v0)) return { form: base + 'M' + verb, plain: false };
      return refuse('unsupported initial after sam');
    }
    case 'nir': {
      if (v0 === 'n' && ctx.nopadesha) return { form: 'nirR' + rest, plain: false };
      if (isVowel(v0) || 'gGjJqQdDbBnmyrlvh'.includes(v0)) return v0 === 'r' ? refuse('nir + r (नीर…)') : { form: 'nir' + verb, plain: true };
      if ('kKpP'.includes(v0)) return { form: 'niz' + verb, plain: false };
      if ('cC'.includes(v0)) return { form: 'niS' + verb, plain: false };
      if ('tT'.includes(v0)) return { form: 'nis' + verb, plain: false };
      return refuse('nir + sibilant');
    }
    case 'namas':
    case 'tiras':
    case 'puras':
      // नमस्पुरसोर्गत्योः 8.3.40, तिरसोऽन्यतरस्याम् 8.3.42
      if ('kKpP'.includes(v0)) return { form: prefix + verb, plain: true };
      return refuse('gati word before a non-k/p initial');
    case 'Avis':
      if ('kKpP'.includes(v0)) return { form: 'Aviz' + verb, plain: false }; // इणः षः 8.3.39
      return refuse('āvis before a non-k/p initial');
    case 'sat':
      if ('kKpPtTs'.includes(v0)) return { form: prefix + verb, plain: true };
      return refuse('sat before a voiced initial');
    default:
      return refuse('consonant-final prefix not tabulated');
  }
}

/** Joins prefixes (outermost first) to a verb form or root. SLP1 in, SLP1 out (anusvāra-normalised). */
export function joinPrefix(prefixes: string[], verb: string, ctx: JoinContext): Joined {
  let form = verb;
  let plain = true;
  for (let i = prefixes.length - 1; i >= 0; i--) {
    // an outer prefix meets the inner prefix, not the root: no ṇatva/ṣatva lookups there
    const inner = i === prefixes.length - 1;
    const j = joinOne(prefixes[i] ?? '', form, inner ? ctx : { baseId: '', nopadesha: false });
    form = j.form;
    plain = plain && j.plain;
  }
  return { form: normSlp(form), plain };
}

/** Citation form of a prefix for display: उद्, निर्, सम्, आ … ('+'-joined when several). */
function prefixDisplay(prefixes: string[]): string {
  return prefixes.map((p) => slp1ToDeva(p)).join('+');
}

/** All double-quoted SLP1 strings in vidyut-prakriya's integration tests (Kāśikā / Kaumudī examples). */
function loadVidyutTestStrings(): Set<string> {
  const out = new Set<string>();
  const root = oraclePath(PATHS.vidyutTests);
  if (!existsSync(root)) return out;
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.rs')) {
        const text = readFileSync(p, 'utf8');
        for (const m of text.matchAll(/"([A-Za-z']+)"/g)) out.add(normSlp(m[1] ?? ''));
      }
    }
  };
  walk(root);
  return out;
}

function loadMwPrefixed(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const p = oraclePath(PATHS.mwPrefixed);
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split('\n').slice(1)) {
    const [prefixed = '', root = ''] = line.split(',');
    if (!prefixed) continue;
    let s = out.get(normSlp(prefixed));
    if (!s) out.set(normSlp(prefixed), (s = new Set()));
    s.add(root);
  }
  return out;
}

export interface BuiltPrefixed {
  id: string;
  upasarga: string;
  base: string;
  lat3s: string;
  en: string;
  level: Level;
  verifiedBy: string[];
}

export interface PrefixedResult {
  accepted: BuiltPrefixed[];
  rejected: string[];
}

/** Also fills `lyap` on the base dhātus (mutates `built`). */
export function buildPrefixed(o: Oracles, built: BuiltDhatu[], specs: PrefixedSpec[] = PREFIXED_SPECS): PrefixedResult {
  const byId = new Map(built.map((b) => [b.spec.id, b]));
  const vidyut = loadVidyutTestStrings();
  const mw = loadMwPrefixed();
  const dict = loadDictionarySanskrit();
  const accepted: BuiltPrefixed[] = [];
  const rejected: string[] = [];
  for (const b of built) b.lyap = [];
  for (const spec of specs) {
    const base = byId.get(spec.base);
    if (!base) {
      rejected.push(`${spec.id}: base ${spec.base} is not in the pack`);
      continue;
    }
    const baseForm = base.forms.lat?.[spec.pada]?.[0]?.[0];
    if (!baseForm) {
      rejected.push(`${spec.id}: base has no laṭ ${spec.pada} 3sg`);
      continue;
    }
    const ctx: JoinContext = { baseId: spec.base, nopadesha: base.ash.aupadeshik.startsWith('ण') };
    let joined: Joined;
    try {
      joined = joinPrefix(spec.prefixes, key(baseForm), ctx);
    } catch (e) {
      rejected.push(`${spec.id}: ${(e as Error).message}`);
      continue;
    }
    const f = joined.form;
    // (1) junction attested in DCS: the same prefix joined to any present-system form of the same
    //     pada (laṭ, loṭ, vidhiliṅ share the stem, hence the junction) occurs with the matching tag
    let dcsExact = 0;
    let dcsParadigm = 0;
    let cited = false;
    for (const lakara of ['lat', 'lot', 'vidhilin'] as const) {
      const table = base.forms[lakara]?.[spec.pada];
      if (!table) continue;
      table.forEach((cell, i) => {
        const pu = Math.floor(i / 3) + 1;
        const va = (i % 3) + 1;
        const tag = `pos=v,p=${4 - pu},n=${'sdp'.charAt(va - 1)},l=${lakara}`;
        for (const cf of cell) {
          let jf: string;
          try {
            jf = joinPrefix(spec.prefixes, key(cf), ctx).form;
          } catch {
            continue;
          }
          // surface shapes inside a sentence: -ti/-te before a vowel, visarga sandhi, final m → anusvāra
          const shapes = [jf];
          if (jf.endsWith('i')) shapes.push(jf.slice(0, -1) + 'y');
          if (jf.endsWith('H')) shapes.push(jf.slice(0, -1) + 's', jf.slice(0, -1) + 'S', jf.slice(0, -1) + 'r', jf.slice(0, -2) + 'o');
          // (1b) a long present-system form quoted in Apte or MW (substring of a Sanskrit span)
          if (jf.length >= 9 && dict.includes(jf.replace(/H$/, ''))) cited = true;
          const n = dcsCount(o.dcs, shapes, null, (t) => t === tag);
          dcsParadigm += n;
          if (lakara === 'lat' && i === 0) dcsExact += n;
        }
      });
    }
    const inVidyut = vidyut.has(f);
    // (2) existence of the prefixed root in MW: same join applied to the bare root
    const rootNames = [...new Set([devaToSlp1(base.spec.dhatu), ...base.heritageRoots.map((r) => r.replace(/^csl:/, '').replace(/[:!].*$/, '').replace(/#\d+$/, ''))])];
    let inMw = false;
    for (const rn of rootNames) {
      try {
        if (mw.has(joinPrefix(spec.prefixes, rn, ctx).form)) inMw = true;
      } catch {
        /* root-level join unsupported: no MW evidence */
      }
    }
    const verifiedBy = [`pack:dhatu/${spec.base}`, joined.plain ? 'rule:upasarga-join(plain)' : 'rule:upasarga-join(sandhi)'];
    if (dcsExact >= 1) verifiedBy.push(TAG_D);
    else if (dcsParadigm >= 1) verifiedBy.push('attest:dcs(paradigm)');
    if (cited) verifiedBy.push('attest:dictionary-citation');
    if (inVidyut) verifiedBy.push('oracle:vidyut-tests');
    if (inMw) verifiedBy.push('oracle:mw-prefixed-roots');
    const ok = dcsParadigm >= 1 || cited || inVidyut || (joined.plain && inMw);
    const deva = normalizeDeva(slp1ToDeva(f));
    if (!ok) {
      rejected.push(`${spec.id}: ${deva} not attested (dcs=${dcsParadigm}, vidyut-tests=${inVidyut}, mw=${inMw}, plain=${joined.plain})`);
      continue;
    }
    if (!validateDeva(deva).ok) throw new Error(`${spec.id}: invalid ${deva}`);
    accepted.push({ id: spec.id, upasarga: prefixDisplay(spec.prefixes), base: spec.base, lat3s: deva, en: spec.en, level: spec.level, verifiedBy });

    // lyap of the same combination: oracle stem (stored with dummy प्र) re-prefixed; must be attested in DCS as a gerund
    for (const stem0 of lyapStemsSlp(o, base.spec.baseindex)) {
      const stem = ctx.nopadesha && stem0.startsWith('R') ? 'n' + stem0.slice(1) : stem0;
      let lj: Joined;
      try {
        lj = joinPrefix(spec.prefixes, stem, ctx);
      } catch {
        continue;
      }
      const n = dcsCount(o.dcs, [lj.form], null, (t) => t.startsWith('pos=vi'));
      if (n < 2) continue;
      const ldeva = normalizeDeva(slp1ToDeva(lj.form));
      if (!validateDeva(ldeva).ok) continue;
      if (!base.lyap.some((x) => x.form === ldeva)) base.lyap.push({ upasarga: prefixDisplay(spec.prefixes), form: ldeva, en: `having ${spec.pp}` });
    }
  }
  return { accepted, rejected };
}
