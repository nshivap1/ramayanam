/**
 * Grammar labels in Sanskrit (OWNER: ui-g). content/sa-grammar.json → see notes/sa-grammar.md.
 *
 *   - coverage: every words[].grammar / forms[].grammar string, lexicon pos and gender has a Sanskrit entry; none stale
 *   - models: valid for the oracle (paradigm, gender, ṇatva, source), each used by some label
 *   - script: Devanagari only (NFC, validateDeva), no Latin / IAST / ASCII digits
 *   - words: every Sanskrit word verifies with the oracle (sa-verify.ts + this file's models); the technical labels the
 *     oracle cannot know (lakāra and pratyaya names, √roots, upasargas) are checked separately: names against the
 *     dhātu pack / @content/types and Pāṇini's lists, roots against DHATUS or the lexicon, IAST of the English
 *   - agreement: each label says what its English says, term by term (glossary `terms` and `notes`)
 *   - forms: wherever the dhātu pack knows a verse form, its analysis agrees with the label's lakāra, person, number,
 *     pada or kṛt suffix, case, number and gender
 * This file holds no Sanskrit: technical names are written in IAST and converted with iastToDeva.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DHATUS, LAKARAS } from '@content/dhatu';
import { GENDER_NAMES, LAKARA_NAMES, PURUSHA_NAMES, VACANA_NAMES, VIBHAKTI_NAMES } from '@content/types';
import { iastToDeva, validateDeva } from '@sanskrit';
import { bundledModels, createOracle, type SaModel } from './sa-verify';
import type { LexEntry, Shloka } from './types';
import shlokas1 from './content/shlokas-1.json';
import shlokas2 from './content/shlokas-2.json';
import lexicon1 from './content/lexicon-1.json';
import lexicon2 from './content/lexicon-2.json';
import grammarJson from './content/sa-grammar.json';

interface GrammarFile {
  version: number;
  models: SaModel[];
  terms: Record<string, string>;
  notes: Record<string, string>;
  grammar: Record<string, string>;
  pos: Record<string, string>;
  gender: Record<string, string>;
}
const G = grammarJson as unknown as GrammarFile;
const SHLOKAS: Shloka[] = [...(shlokas1 as unknown as { shlokas: Shloka[] }).shlokas, ...(shlokas2 as unknown as { shlokas: Shloka[] }).shlokas];
const LEXICON: LexEntry[] = [...(lexicon1 as unknown as { lexicon: LexEntry[] }).lexicon, ...(lexicon2 as unknown as { lexicon: LexEntry[] }).lexicon];
const LEX = new Map(LEXICON.map((e) => [e.id, e]));

/** Every (form, English grammar, lexicon entry) of the verses and the lexicon. */
const OCCURRENCES: { form: string; en: string; lex: LexEntry | undefined; where: string }[] = [
  ...SHLOKAS.flatMap((s) => s.words.map((w) => ({ form: w.form, en: w.grammar, lex: LEX.get(w.lexId), where: `${s.id} ${w.form}` }))),
  ...LEXICON.flatMap((e) => e.forms.map((f) => ({ form: f.form, en: f.grammar, lex: e, where: `lexicon ${e.id} ${f.form}` }))),
];

// ───────── technical names (IAST → Devanagari; the oracle's word index cannot hold them) ─────────

/** The lakāras of Pāṇini 3.4.77 ff. (liṅ taught as vidhiliṅ and āśīrliṅ). */
const LAKARA_IAST = ['laṭ', 'liṭ', 'luṭ', 'lṛṭ', 'leṭ', 'loṭ', 'laṅ', 'vidhiliṅ', 'āśīrliṅ', 'luṅ', 'lṛṅ'];
/** kṛt suffixes as a Sanskrit class names them, and the dhātu pack's key for each (undefined: not in the pack). */
const KRT_IAST: Record<string, string | undefined> = { kta: 'kta', ktavatu: 'ktavatu', 'śatṛ': 'shatr', 'śānac': 'shanac', tavyat: 'tavya', 'anīyar': 'aniyar', tumun: 'tumun', 'ktvā': 'ktva', lyap: 'lyap', yat: undefined };
/** taddhita: the comparative suffix (Pāṇini 5.3.57). */
const TADDHITA_IAST = ['tarap'];
/** The upasargas (prādi, 1.4.58), with the pausa forms ut / nis beside ud / nir. */
const UPASARGA_IAST = ['pra', 'parā', 'apa', 'sam', 'anu', 'ava', 'nis', 'nir', 'dus', 'dur', 'vi', 'ā', 'ni', 'adhi', 'api', 'ati', 'su', 'ut', 'ud', 'abhi', 'prati', 'pari', 'upa'];

const LAKARA_DEVA = new Set(LAKARA_IAST.map(iastToDeva));
const KRT_DEVA = new Map(Object.entries(KRT_IAST).map(([iast, key]) => [iastToDeva(iast), key]));
const TECH_DEVA = new Set([...LAKARA_DEVA, ...KRT_DEVA.keys(), ...TADDHITA_IAST.map(iastToDeva)]);
const UPASARGA_DEVA = new Set(UPASARGA_IAST.map(iastToDeva));
const ROOTS = new Set([...DHATUS.map((d) => d.dhatu), ...LEXICON.filter((e) => e.pos === 'verb').map((e) => e.lemma)]);

/** "upasarga + … + √root" (Devanagari) — a root expression. */
const ROOT_EXPR = /(?:[^\s,;:()+√]+ \+ )*√[^\s,;:()]+/gu;

// ───────── parsing ─────────

/** Text outside parentheses and the parenthetical groups (one level; quotes inside a group are fine). */
function splitGroups(s: string): { core: string; groups: string[] } {
  let core = '';
  let cur = '';
  let depth = 0;
  const groups: string[] = [];
  for (const ch of s) {
    if (ch === '(') {
      if (depth++ === 0) {
        cur = '';
        continue;
      }
    } else if (ch === ')') {
      if (--depth === 0) {
        groups.push(cur.trim());
        core += ' ';
        continue;
      }
    }
    if (depth > 0) cur += ch;
    else core += ch;
  }
  assert.equal(depth, 0, `unbalanced parentheses in "${s}"`);
  return { core, groups };
}

const PHRASES = Object.keys(G.terms)
  .filter((k) => /[\s-]/.test(k))
  .sort((a, b) => b.length - a.length);
const IGNORED_EN = new Set(['use', 'of']);

/** English core (outside parentheses) → glossary keys, in order. Unknown words are reported. */
function enCoreKeys(core: string, problems: string[], where: string): string[] {
  const keys: string[] = [];
  let rest = core;
  for (const p of PHRASES) {
    while (rest.includes(p)) {
      keys.push(p);
      rest = rest.replace(p, ' ');
    }
  }
  for (const tok of rest.split(/[\s,/]+/).filter(Boolean)) {
    if (tok in G.terms) keys.push(tok);
    else if (!IGNORED_EN.has(tok)) problems.push(`${where}: English word "${tok}" has no term in sa-grammar.json "terms"`);
  }
  return keys;
}

/** A glossary value may list alternatives with "|" (gerundive: tavyat | anīyar | yat, chosen by the form). */
const alternatives = (v: string): string[] => v.split('|');

/** Multiset match: every expected item (a list of acceptable strings) is matched by one distinct actual item. */
function sameMultiset(expected: string[][], actual: string[]): boolean {
  const left = [...actual];
  for (const alts of expected) {
    const i = left.findIndex((a) => alts.includes(a));
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return left.length === 0;
}

const isRootExprEn = (part: string): boolean => part.includes('√');
/** "vi + ā + √hṛ" → "वि + आ + √हृ" */
const rootExprDeva = (part: string): string =>
  part
    .split(' + ')
    .map((x) => (x.startsWith('√') ? `√${iastToDeva(x.slice(1))}` : iastToDeva(x)))
    .join(' + ');

const splitParts = (group: string): string[] => group.split(/[;,]\s+/).map((x) => x.trim()).filter(Boolean);

// ───────── tests ─────────

test('sa-grammar: every grammar string, part of speech and gender has a Sanskrit entry (none stale)', () => {
  const used = new Set(OCCURRENCES.map((o) => o.en));
  const missing = [...used].filter((en) => !G.grammar[en]?.trim());
  const stale = Object.keys(G.grammar).filter((en) => !used.has(en));
  const pos = new Set<string>(LEXICON.map((e) => e.pos));
  const genders = new Set(LEXICON.flatMap((e) => (e.gender ? [e.gender] : [])));
  const missingPos = [...pos].filter((p) => !G.pos[p]?.trim());
  const missingGender = [...genders].filter((g) => !G.gender[g]?.trim());
  console.log(`# ${used.size} grammar strings · ${pos.size} parts of speech · ${genders.size} genders · ${G.models.length} models`);
  assert.deepEqual(missing, [], `grammar strings without Sanskrit in content/sa-grammar.json:\n  ${missing.join('\n  ')}`);
  assert.deepEqual(stale, [], `stale entries (no verse word or lexicon form uses them):\n  ${stale.join('\n  ')}`);
  assert.deepEqual(missingPos, [], `parts of speech without Sanskrit: ${missingPos.join(', ')}`);
  assert.deepEqual(missingGender, [], `genders without Sanskrit: ${missingGender.join(', ')}`);
  assert.deepEqual(Object.keys(G.pos).filter((p) => !pos.has(p)), [], 'stale parts of speech');
});

test('sa-grammar: the core terms are the platform names (@content/types) and the lakāra list', () => {
  const expect: Record<string, string> = {
    'nom.': VIBHAKTI_NAMES[1].sa,
    'acc.': VIBHAKTI_NAMES[2].sa,
    'instr.': VIBHAKTI_NAMES[3].sa,
    'dat.': VIBHAKTI_NAMES[4].sa,
    'abl.': VIBHAKTI_NAMES[5].sa,
    'gen.': VIBHAKTI_NAMES[6].sa,
    'loc.': VIBHAKTI_NAMES[7].sa,
    'voc.': VIBHAKTI_NAMES[8].sa,
    'sg.': VACANA_NAMES[1].sa,
    'du.': VACANA_NAMES[2].sa,
    'pl.': VACANA_NAMES[3].sa,
    'm.': GENDER_NAMES.m.sa,
    'f.': GENDER_NAMES.f.sa,
    'n.': GENDER_NAMES.n.sa,
    '3rd': PURUSHA_NAMES[1].sa,
    '2nd': PURUSHA_NAMES[2].sa,
    '1st': PURUSHA_NAMES[3].sa,
    present: LAKARA_NAMES.lat.sa,
    future: LAKARA_NAMES.lrt.sa,
    imperative: LAKARA_NAMES.lot.sa,
    optative: LAKARA_NAMES.vidhilin.sa,
    perfect: iastToDeva('liṭ'), // 3.2.115 parokṣe liṭ (not in the dhātu pack)
    aorist: iastToDeva('luṅ'), // 3.2.110 luṅ (not in the dhātu pack)
    'past passive participle': iastToDeva('kta'),
    'past participle in -ta': iastToDeva('kta'),
    'present active participle': iastToDeva('śatṛ'),
    infinitive: iastToDeva('tumun'),
    gerundive: ['tavyat', 'anīyar', 'yat'].map(iastToDeva).join('|'),
    comparative: iastToDeva('tarap'),
  };
  const problems: string[] = [];
  for (const [k, v] of Object.entries(expect)) if (G.terms[k] !== v) problems.push(`terms["${k}"] is "${G.terms[k] ?? ''}", expected "${v}"`);
  for (const g of ['m', 'f', 'n'] as const) if (G.gender[g] !== GENDER_NAMES[g].sa) problems.push(`gender.${g} should be ${GENDER_NAMES[g].sa}`);
  // the five lakāras of the dhātu pack are in the list, with the pack's own names
  for (const l of LAKARAS) if (!LAKARA_DEVA.has(LAKARA_NAMES[l].sa)) problems.push(`lakāra ${l}: ${LAKARA_NAMES[l].sa} not in the lakāra list`);
  // every kṛt suffix the pack ships has its class name here
  const packKrt = new Set(DHATUS.flatMap((d) => Object.keys(d.krdanta)));
  for (const k of packKrt) if (![...KRT_DEVA.values()].includes(k)) problems.push(`the dhātu pack's kṛt "${k}" has no Sanskrit name in KRT_IAST`);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('sa-grammar: models are valid and each is used', () => {
  const o = createOracle({ models: [...bundledModels(), ...G.models] });
  const mine = new Set(G.models.map((m) => m.stem));
  const errors = o.modelErrors.filter((e) => [...mine].some((s) => e.startsWith(`model ${s}:`)));
  assert.deepEqual(errors, [], errors.join('\n'));
  const problems: string[] = [];
  const others = new Map(bundledModels().map((m) => [m.stem, m]));
  const allSa = [...Object.values(G.grammar), ...Object.values(G.pos), ...Object.values(G.gender), ...Object.values(G.notes)].join(' ');
  for (const m of G.models) {
    if (!m.source.trim() || !m.en.trim()) problems.push(`model ${m.stem}: needs en and source`);
    const prev = others.get(m.stem);
    if (prev && (prev.paradigm !== m.paradigm || prev.gender !== m.gender)) problems.push(`model ${m.stem}: another file declines it as ${prev.gender} ${prev.paradigm}`);
    if (!allSa.split(/[\s,;:()/]+/).some((tok) => o.analyse(tok).some((a) => a.source === 'model' && a.lemma === m.stem))) problems.push(`model ${m.stem} is not used by any label`);
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('sa-grammar: Devanagari only, and every word verifies (technical names checked against the packs)', () => {
  const o = createOracle({ models: [...bundledModels(), ...G.models] });
  const problems: string[] = [];
  const values: [string, string][] = [
    ...Object.entries(G.grammar).map(([k, v]): [string, string] => [`grammar "${k}"`, v]),
    ...Object.entries(G.pos).map(([k, v]): [string, string] => [`pos ${k}`, v]),
    ...Object.entries(G.gender).map(([k, v]): [string, string] => [`gender ${k}`, v]),
    ...Object.entries(G.terms).flatMap(([k, v]) => alternatives(v).map((x): [string, string] => [`terms "${k}"`, x])),
    ...Object.entries(G.notes).filter(([, v]) => v).map(([k, v]): [string, string] => [`notes "${k}"`, v]),
  ];
  let words = 0;
  let tech = 0;
  for (const [where, sa] of values) {
    if (sa !== sa.normalize('NFC')) problems.push(`${where}: not NFC`);
    if (/[A-Za-z0-9]/.test(sa) || /[āīūṛṝḷṅñṭḍṇśṣḥṃ]/.test(sa)) problems.push(`${where}: Latin / IAST / ASCII digits in "${sa}"`);
    const body = sa.replace(/[√+/():;,]/g, ' ').replace(/\s+/g, ' ').trim();
    const v = validateDeva(body);
    if (!v.ok) problems.push(`${where}: validateDeva: ${v.errors.join('; ')}`);
    // root expressions: upasargas from Pāṇini's list, roots in DHATUS or the verse lexicon
    let rest = sa.replace(ROOT_EXPR, (expr) => {
      for (const part of expr.split(' + ')) {
        tech++;
        if (part.startsWith('√')) {
          if (!ROOTS.has(part.slice(1))) problems.push(`${where}: root ${part} is neither in the dhātu pack nor a verb of the lexicon`);
        } else if (!UPASARGA_DEVA.has(part)) problems.push(`${where}: "${part}" is not an upasarga`);
      }
      return ' ';
    });
    // lakāra and pratyaya names
    rest = rest
      .split(/([\s,;:()/]+)/)
      .map((tok) => {
        if (TECH_DEVA.has(tok)) {
          tech++;
          return ' ';
        }
        return tok;
      })
      .join('');
    if (rest.includes('√')) problems.push(`${where}: a √ outside a root expression`);
    const words_ = rest.replace(/[()/:;,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!words_) continue;
    const r = o.verifyLine(words_, { ui: true, label: true });
    words += r.tokens.length;
    if (!r.ok) problems.push(`${where} "${sa}": ${r.errors.join('; ')}`);
  }
  console.log(`# ${words} words verified by the oracle · ${tech} technical names checked`);
  assert.deepEqual(problems, [], `${problems.length} problem(s):\n  ${problems.slice(0, 60).join('\n  ')}`);
});

test('sa-grammar: each label says what its English says, term by term', () => {
  const problems: string[] = [];
  const termValues = new Set(Object.values(G.terms).flatMap(alternatives));
  for (const [en, sa] of Object.entries(G.grammar)) {
    const where = `"${en}"`;
    const E = splitGroups(en);
    const S = splitGroups(sa);
    // outside parentheses: the same terms (order may differ: लट्, प्रथमपुरुषः … for "3rd sg. present")
    const expected = enCoreKeys(E.core, problems, where).map((k) => alternatives(G.terms[k] ?? ''));
    const actual = S.core.split(/[\s,;:/]+/).filter(Boolean);
    for (const tok of actual) if (!termValues.has(tok)) problems.push(`${where}: "${tok}" outside parentheses is not a glossary term`);
    if (!sameMultiset(expected, actual)) problems.push(`${where}: terms ${JSON.stringify(expected.map((a) => a.join('|')))} ≠ "${S.core.trim()}"`);
    // inside parentheses: roots (transliterated), terms (gerundive, comparative) and notes (glossary; "" = dropped)
    const want: string[][] = [];
    for (const part of E.groups.flatMap(splitParts)) {
      if (isRootExprEn(part)) want.push([rootExprDeva(part)]);
      else if (part in G.terms) want.push(alternatives(G.terms[part] ?? ''));
      else if (part in G.notes) for (const x of splitParts(G.notes[part] ?? '')) want.push([x]);
      else problems.push(`${where}: note "${part}" has no entry in sa-grammar.json "notes"`);
    }
    const got = S.groups.flatMap(splitParts);
    if (!sameMultiset(want, got)) problems.push(`${where}: notes ${JSON.stringify(want.map((a) => a.join('|')))} ≠ ${JSON.stringify(got)}`);
  }
  assert.deepEqual(problems, [], `${problems.length} problem(s):\n  ${problems.slice(0, 60).join('\n  ')}`);
});

test('sa-grammar: where the dhātu pack knows a verse form, it agrees with the label', () => {
  const o = createOracle({ models: [...bundledModels(), ...G.models] });
  const inv = new Map<string, string>(); // Sanskrit term → glossary key
  for (const [k, v] of Object.entries(G.terms)) for (const x of alternatives(v)) if (!inv.has(x)) inv.set(x, k);
  const ORACLE_CASE: Record<string, string> = { nom: 'nom.', acc: 'acc.', ins: 'instr.', dat: 'dat.', abl: 'abl.', gen: 'gen.', loc: 'loc.', voc: 'voc.' };
  const PERSON: Record<string, string> = { '1': '1st', '2': '2nd', '3': '3rd' };
  const LAKARA_EN: Record<string, string> = { 'laṭ': 'present', 'laṅ': 'imperfect', 'lṛṭ': 'future', 'loṭ': 'imperative', 'vidhiliṅ': 'optative' };
  const problems: string[] = [];
  let checked = 0;
  const seen = new Set<string>();
  for (const occ of OCCURRENCES) {
    const sa = G.grammar[occ.en];
    if (!sa || seen.has(`${occ.form}|${occ.en}`)) continue;
    seen.add(`${occ.form}|${occ.en}`);
    const tokens = sa.split(/[\s,;:()/]+/).filter(Boolean);
    const keys = new Set(tokens.map((t) => inv.get(t)).filter((k): k is string => !!k));
    const krt = tokens.find((t) => KRT_DEVA.has(t));
    const hasLakara = tokens.some((t) => LAKARA_DEVA.has(t));
    if (!krt && !hasLakara) continue;
    // the root: from the label, else the lexicon lemma of a verb
    const rootExpr = sa.match(ROOT_EXPR)?.[0];
    const root = rootExpr ? rootExpr.slice(rootExpr.indexOf('√') + 1) : occ.lex?.pos === 'verb' ? occ.lex.lemma : undefined;
    const prefix = rootExpr ? rootExpr.split(' + ').filter((x) => !x.startsWith('√')).join('') : '';
    const forms = [occ.form, ...(prefix && occ.form.startsWith(prefix) && occ.form.length > prefix.length ? [occ.form.slice(prefix.length)] : [])];
    const analyses = forms
      .flatMap((f) => o.analyse(f))
      .filter((a) => (a.source === 'dhatu' || a.source === 'krdanta' || a.source === 'prefixed') && (!root || a.lemma === root || a.lemma.endsWith(`+${root}`)));
    if (!analyses.length) continue;
    checked++;
    const agrees = analyses.some((a) => {
      const fin = a.grammar.match(/^(laṭ|laṅ|lṛṭ|loṭ|vidhiliṅ) ([123])(sg|du|pl)(?: ([PA]))?/u);
      if (fin) {
        const [, lak = '', p = '', n = '', pada] = fin;
        if (!hasLakara || krt) return false;
        if (!keys.has(LAKARA_EN[lak] ?? '?') || !keys.has(PERSON[p] ?? '?') || !keys.has(`${n}.`)) return false;
        if (pada && keys.has('active') && pada !== 'P') return false;
        if (pada && keys.has('middle') && pada !== 'A') return false;
        return true;
      }
      const k = a.grammar.match(/^(kta|ktavatu|shatr|shanac|tavya|aniyar|tumun|ktvā|lyap)(?: → (nom|acc|ins|dat|abl|gen|loc|voc)\. (sg|du|pl)\. ([mfn])\.)?/u);
      if (k) {
        const [, id = '', c, n, g] = k;
        const want = id === 'ktvā' ? 'ktva' : id;
        if (!krt || KRT_DEVA.get(krt) !== want) return false;
        if (c && (!keys.has(ORACLE_CASE[c] ?? '?') || !keys.has(`${n}.`) || !keys.has(`${g}.`))) return false;
        return true;
      }
      return false;
    });
    if (!agrees) problems.push(`${occ.where}: label "${sa}" disagrees with the dhātu pack: ${analyses.map((a) => `${a.lemma} ${a.grammar}`).join(' | ')}`);
  }
  console.log(`# ${checked} verb / kṛdanta forms cross-checked with the dhātu pack`);
  assert.ok(checked >= 20, `only ${checked} forms could be cross-checked (expected ≥ 20): is the oracle index intact?`);
  assert.deepEqual(problems, [], problems.join('\n'));
});
