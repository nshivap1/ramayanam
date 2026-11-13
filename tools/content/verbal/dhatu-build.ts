/**
 * Builds the dhātu pack from the oracles. Pure function of (curated list, oracle files):
 * no Sanskrit form is typed by hand anywhere in this pipeline.
 *
 * Acceptance rule for a finite form (lakāra, pada, puruṣa, vacana):
 *   it is in the primary oracle cell (A: ashtadhyayi.com / vidyut)   AND
 *   it is in the same cell of at least one independent engine
 *   (B: SanskritVerb, C: Sanskrit Heritage).
 * A cell with no accepted form is dropped (reported). Forms only A has are dropped (reported).
 */
import { slp1ToDeva, devaToSlp1, normalizeDeva, validateDeva } from '../../../src/sanskrit/translit';
import type { Lakara, Pada } from '../../../src/content/types';
import { DHATU_SPECS, type DhatuSpec } from './dhatu-list';
import {
  ashCell,
  cellKey,
  key,
  loadAshDhatupatha,
  loadAshKartari,
  loadAshKrut,
  loadDcs,
  dcsCount,
  loadHeritageKrt,
  loadHeritageRoots,
  loadSanskritVerb,
  normSlp,
  svKey,
  type AshDhatu,
  type DcsIndex,
  type HeritageData,
  type HeritageKrt,
  type KrutCell,
  type SvData,
} from './oracles';

export const LAKARAS: Lakara[] = ['lat', 'lan', 'lrt', 'lot', 'vidhilin'];
export const TAG_A = 'oracle:ashtadhyayi-com(vidyut)';
export const TAG_B = 'oracle:sanskritverb';
export const TAG_C = 'oracle:sanskrit-heritage';
export const TAG_D = 'attest:dcs';
export const TAG_RULE = 'rule:participle-stem';

export interface Oracles {
  dp: Map<string, AshDhatu>;
  kartari: Map<string, Map<string, string[][]>>;
  krut: Map<string, Map<string, KrutCell[]>>;
  sv: SvData;
  heritage: HeritageData;
  hkrt: HeritageKrt;
  dcs: DcsIndex;
}

export function loadOracles(): Oracles {
  return {
    dp: loadAshDhatupatha(),
    kartari: loadAshKartari(),
    krut: loadAshKrut(),
    sv: loadSanskritVerb(),
    heritage: loadHeritageRoots(),
    hkrt: loadHeritageKrt(),
    dcs: loadDcs(),
  };
}

const VOICED_FINAL: Record<string, string> = { d: 't', g: 'k', q: 'w', b: 'p' };

/** Drops pure sandhi doublets (अभवद् beside अभवत्): word-final voiced stop when the voiceless twin is in the cell. */
export function dropSandhiDoublets(cell: string[]): string[] {
  const keys = new Set(cell.map(key));
  return cell.filter((f) => {
    const k = key(f);
    const last = k.charAt(k.length - 1);
    const twin = VOICED_FINAL[last];
    return !(twin && keys.has(k.slice(0, -1) + twin));
  });
}

/**
 * तातङ् imperatives (भवतात्, शिष्टात्, दुग्धात् …) are valid but restricted to blessings (आशिषि,
 * तुह्योस्तातङ्ङाशिष्यन्यतरस्याम् 7.1.35): accepted, never displayed first. They occur only in
 * loṭ parasmaipada 3sg and 2sg, and no ordinary form of those two cells ends in -āt.
 */
export function isTatan(form: string, lakara: Lakara, pada: Pada, purusha: number, vacana: number): boolean {
  return lakara === 'lot' && pada === 'P' && vacana === 1 && purusha <= 2 && /ात्$/.test(form);
}

/** Simple-future forms with the iṭ augment (पठिष्यति, तरीष्यति) — displayed before their aniṭ twins. */
function isSetFuture(form: string): boolean {
  return /[िी]ष्य/.test(form);
}

export interface CellEvidence {
  form: string;
  b: boolean;
  c: boolean;
}

export interface BuiltDhatu {
  spec: DhatuSpec;
  ash: AshDhatu;
  heritageRoots: string[];
  svRoot: string | undefined;
  /** lakāra → pada → 9 cells of accepted forms (display form first); [] = dropped cell */
  forms: Partial<Record<Lakara, Partial<Record<Pada, string[][]>>>>;
  evidence: Map<string, CellEvidence[]>;
  krdanta: Record<string, string[]>;
  krdantaEvidence: Record<string, { form: string; c: boolean; d: boolean; rule: boolean }[]>;
  /** filled by buildPrefixed: lyap forms of attested upasarga combinations */
  lyap: { upasarga: string; form: string; en: string }[];
  stats: { forms: number; byB: number; byC: number; byBoth: number; cells: number; droppedCells: string[]; droppedForms: string[]; multi: string[] };
}

export function padasFor(spec: DhatuSpec, lakara: Lakara): Pada[] {
  const o = spec.padaByLakara?.[lakara];
  if (o) return o;
  return spec.pada === 'U' ? ['P', 'A'] : [spec.pada];
}

/** Heritage root keys (see HeritageData) whose forms may confirm this dhātu. */
export function resolveHeritageRoots(spec: DhatuSpec, o: Oracles): string[] {
  if (spec.heritage) return spec.heritage.filter((r) => o.heritage.forms.has(r));
  const pada: Pada = padasFor(spec, 'lat')[0] ?? 'P';
  const allowCaus = spec.gana === 10;
  const allowPass = (spec.gana === 4 && spec.pada === 'A') || spec.heritagePassive === true;
  const cands = new Set<string>();
  for (const f of ashCell(o.kartari, spec.baseindex, 'lat', pada, 1, 1)) {
    for (const r of o.heritage.byLat3s.get(`${key(f)}|${pada}`) ?? []) {
      if (r.endsWith('!caus') && !allowCaus) continue;
      if (r.endsWith('!pass') && !allowPass) continue;
      cands.add(r);
    }
  }
  // several homonymous Heritage roots can share the form: per source (roots.csv / csl-inflect)
  // keep the one spelled like the taught root, else the one with the most cells
  const want = devaToSlp1(spec.dhatu);
  const bare = (r: string): string => r.replace(/^csl:/, '').replace(/[:!].*$/, '').replace(/#\d+$/, '');
  const size = (r: string): number => o.heritage.forms.get(r)?.size ?? 0;
  const out: string[] = [];
  for (const src of ['csl', 'csv'] as const) {
    const mine = [...cands].filter((r) => (r.startsWith('csl:') ? 'csl' : 'csv') === src);
    if (mine.length === 0) continue;
    const exact = mine.filter((r) => bare(r) === want);
    const pool = exact.length >= 1 ? exact : mine;
    const best = pool.sort((x, y) => size(y) - size(x))[0];
    if (best) out.push(best);
  }
  return out;
}

function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) (d[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const row = d[i] as number[];
      const prev = d[i - 1] as number[];
      row[j] = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    }
  }
  return (d[a.length] as number[])[b.length] ?? 0;
}

/**
 * SanskritVerb root key for a dhātu: explicit override, else same gaṇa + same upadeśa, else the
 * entry filed under the same dhātupāṭha number whose upadeśa differs by at most one anubandha letter.
 */
export function resolveSvRoot(spec: DhatuSpec, ash: AshDhatu, o: Oracles): string | undefined {
  if (spec.sv) return o.sv.forms.has(spec.sv) ? spec.sv : undefined;
  const mine = svKey(spec.gana, devaToSlp1(ash.aupadeshik));
  if (o.sv.forms.has(mine)) return mine;
  for (const cand of o.sv.byNum.get(spec.baseindex) ?? []) {
    if (cand.slice(0, 3) === mine.slice(0, 3) && editDistance(cand.slice(3), mine.slice(3)) <= 1) return cand;
  }
  return undefined;
}

function toDeva(k: string): string {
  return normalizeDeva(slp1ToDeva(k));
}

// ── kṛdanta ────────────────────────────────────────────────────────────────

const KRT: { field: string; ash: string; col: 'stem' | 'm'; heritage?: (h: HeritageKrt, root: string) => Set<string> | undefined; kind: 'avyaya' | 'a' | 'vat' | 'at' }[] = [
  { field: 'ktva', ash: 'क्त्वा', col: 'stem', heritage: (h, r) => h.ktva.get(r), kind: 'avyaya' },
  { field: 'tumun', ash: 'तुमुन्', col: 'stem', heritage: (h, r) => h.infinitive.get(r), kind: 'avyaya' },
  { field: 'kta', ash: 'क्त', col: 'm', heritage: (h, r) => h.parts.get(r)?.get('past.pass'), kind: 'a' },
  { field: 'ktavatu', ash: 'क्तवतु', col: 'm', heritage: (h, r) => h.parts.get(r)?.get('past.active'), kind: 'vat' },
  { field: 'shatr', ash: 'शतृ', col: 'm', heritage: (h, r) => h.parts.get(r)?.get('pres.para'), kind: 'at' },
  { field: 'shanac', ash: 'शानच्', col: 'm', heritage: (h, r) => h.parts.get(r)?.get('pres.atma'), kind: 'a' },
  { field: 'tavya', ash: 'तव्य', col: 'm', heritage: (h, r) => h.parts.get(r)?.get('fut.pass'), kind: 'a' },
  { field: 'aniyar', ash: 'अनीयर्', col: 'm', heritage: (h, r) => h.parts.get(r)?.get('fut.pass'), kind: 'a' },
];

/**
 * Independent derivation of the masculine nominative singular from a participle stem
 * (used only to double-check the oracle's own m. column):
 *   -a → -aḥ;  -vat (ktavatu) → -vān;  -at (śatṛ) → -an, but unchanged after a reduplicated
 *   (abhyasta) stem — gaṇa 3 and जक्षादि (नाभ्यस्ताच्छतुः 7.1.78).
 */
export function nomSgM(stemSlp: string, kind: 'a' | 'vat' | 'at', abhyasta: boolean): string | undefined {
  if (kind === 'a') return stemSlp.endsWith('a') ? stemSlp + 'H' : undefined;
  if (kind === 'vat') return stemSlp.endsWith('vat') ? stemSlp.slice(0, -3) + 'vAn' : undefined;
  if (!/[aA]t$/.test(stemSlp)) return undefined;
  return abhyasta ? stemSlp : stemSlp.slice(0, -1) + 'n';
}

/** Roots whose present stem is abhyasta: gaṇa 3, plus जक्ष्, जागृ, दरिद्रा, चकास्, शास् … (6.1.6). */
const ABHYASTA_EXTRA = new Set(['02.0067', '02.0070', '02.0066', '02.0068', '02.0069']);

export function buildOne(spec: DhatuSpec, o: Oracles): BuiltDhatu {
  const ash = o.dp.get(spec.baseindex);
  if (!ash) throw new Error(`${spec.id}: baseindex ${spec.baseindex} not in dhātupāṭha`);
  const heritageRoots = resolveHeritageRoots(spec, o);
  const stats: BuiltDhatu['stats'] = { forms: 0, byB: 0, byC: 0, byBoth: 0, cells: 0, droppedCells: [], droppedForms: [], multi: [] };
  const forms: BuiltDhatu['forms'] = {};
  const evidence = new Map<string, CellEvidence[]>();
  const prefer = new Set((spec.prefer ?? []).map(key));
  const exclude = new Set((spec.exclude ?? []).map(key));
  const svRoot = resolveSvRoot(spec, ash, o);
  const svCells = svRoot ? o.sv.forms.get(svRoot) : undefined;
  const hCells = heritageRoots.map((r) => o.heritage.forms.get(r)).filter((m) => m !== undefined);

  for (const lakara of LAKARAS) {
    for (const pada of padasFor(spec, lakara)) {
      const table: string[][] = [];
      let any = false;
      for (let pu = 1; pu <= 3; pu++) {
        for (let va = 1; va <= 3; va++) {
          const ck = cellKey(lakara, pada, pu, va);
          const raw = dropSandhiDoublets(ashCell(o.kartari, spec.baseindex, lakara, pada, pu, va));
          const kept: CellEvidence[] = [];
          for (const f of raw) {
            const k = key(f);
            const b = svCells?.get(ck)?.has(k) ?? false;
            const c = hCells.some((m) => m.get(ck)?.has(k) ?? false);
            const deva = toDeva(k);
            if (spec.gana === 10 && !k.includes('ay')) {
              // optional non-ṇic forms of curādi roots (घोषति, चिन्तति, लोकिष्यति) are not taught
              stats.droppedForms.push(`${spec.id} ${ck} ${deva} (curādi form without ṇic)`);
              continue;
            }
            if (exclude.has(k)) {
              stats.droppedForms.push(`${spec.id} ${ck} ${deva} (excluded by curation)`);
              continue;
            }
            if (b || c) kept.push({ form: deva, b, c });
            else stats.droppedForms.push(`${spec.id} ${ck} ${deva} (only in A)`);
          }
          const rank = (e: CellEvidence): number => {
            let r = 0;
            if (isTatan(e.form, lakara, pada, pu, va)) r += 1000;
            if (!prefer.has(key(e.form))) r += 100;
            if (!(e.b && e.c)) r += 10;
            if (lakara === 'lrt' && !isSetFuture(e.form)) r += 1;
            // laṅ of consonant-final roots: 2sg shown with visarga (अरुणः), 3sg with the stop (अरुणत्)
            if (lakara === 'lan' && pada === 'P' && va === 1 && pu === 2 && !e.form.endsWith('ः')) r += 1;
            if (lakara === 'lan' && pada === 'P' && va === 1 && pu === 1 && e.form.endsWith('ः')) r += 1;
            return r;
          };
          kept.sort((x, y) => rank(x) - rank(y) || x.form.length - y.form.length || (x.form < y.form ? -1 : 1));
          // a cell whose only survivors are तातङ् forms is not a usable cell
          const usable = kept.some((e) => !isTatan(e.form, lakara, pada, pu, va));
          if (!usable) {
            if (raw.length > 0) stats.droppedCells.push(`${spec.id} ${ck} [A: ${raw.join(', ')}]`);
            else stats.droppedCells.push(`${spec.id} ${ck} [A: —]`);
            table.push([]);
            continue;
          }
          any = true;
          stats.cells++;
          for (const e of kept) {
            stats.forms++;
            if (e.b) stats.byB++;
            if (e.c) stats.byC++;
            if (e.b && e.c) stats.byBoth++;
            const v = validateDeva(e.form);
            if (!v.ok) throw new Error(`${spec.id} ${ck}: invalid Devanagari ${e.form}: ${v.errors.join('; ')}`);
          }
          const nonTatan = kept.filter((e) => !isTatan(e.form, lakara, pada, pu, va));
          if (nonTatan.length > 1) stats.multi.push(`${spec.id} ${ck} ${nonTatan.map((e) => `${e.form}${e.b ? 'ᴮ' : ''}${e.c ? 'ᶜ' : ''}`).join(' / ')}`);
          evidence.set(ck, kept);
          table.push(kept.map((e) => e.form));
        }
      }
      if (any) {
        const rows: string[][] = table;
        (forms[lakara] ??= {})[pada] = rows;
      }
    }
  }

  // kṛdanta: A's form, confirmed at stem level by Heritage and, for declinables, by the nominative rule
  const krdanta: Record<string, string[]> = {};
  const krdantaEvidence: BuiltDhatu['krdantaEvidence'] = {};
  const abhyasta = spec.gana === 3 || ABHYASTA_EXTRA.has(spec.baseindex);
  // participles are filed under the plain root (or its causative for curādi), never under '!pass'
  const krtRoots = [...new Set([...heritageRoots.filter((r) => !r.startsWith('csl:')).map((r) => r.replace(/!pass$/, '')), ...(spec.heritageKrt ?? [])])];
  const lat3 = (forms.lat?.P ?? forms.lat?.A)?.[0]?.[0];
  const dcsLemmas = [
    ...new Set([
      devaToSlp1(spec.dhatu),
      ...krtRoots.map((r) => r.replace(/[:!].*$/, '').replace(/#\d+$/, '')),
      ...(spec.gana === 10 && lat3 ? [key(lat3).replace(/a(ti|te)$/, '')] : []),
      ...(spec.dcs ?? []),
    ]),
  ];
  for (const k of KRT) {
    if (k.field === 'shatr' && !forms.lat?.P) continue;
    if (k.field === 'shanac' && !forms.lat?.A) continue;
    const cells = o.krut.get(spec.baseindex)?.get(k.ash) ?? [];
    const hsets = k.heritage ? krtRoots.map((r) => k.heritage?.(o.hkrt, r)).filter((x) => x !== undefined) : [];
    const out: { form: string; c: boolean; d: boolean; rule: boolean }[] = [];
    for (const cell of cells) {
      const stemK = key(cell.stem);
      const shown = k.col === 'stem' ? cell.stem : cell.m;
      if (!shown) continue;
      // the m. column may hold '/'-separated sandhi doublets
      const shownForms = dropSandhiDoublets(shown.split('/').filter((x) => x.length > 0));
      const c = hsets.some((x) => x.has(stemK));
      for (const sf of shownForms) {
        const fk = key(sf);
        let rule = true;
        if (k.kind !== 'avyaya') rule = nomSgM(stemK, k.kind, abhyasta) === fk;
        // present participles must be built on the pack's own present stem: laṭ 3pl -anti → -an
        // (abhyasta -ati → -at); thematic -ante → -amānaḥ. Catches e.g. a śatṛ क्रमन् beside laṭ क्रामन्ति.
        if (k.field === 'shatr') {
          const expected = new Set((forms.lat?.P?.[2] ?? []).map((f) => key(f)).map((x) => (x.endsWith('nti') ? x.slice(0, -3) + 'n' : x.endsWith('ati') ? x.slice(0, -1) : '')));
          if (!expected.has(fk)) rule = false;
        }
        if (k.field === 'shanac') {
          const pl = (forms.lat?.A?.[2] ?? []).map((f) => key(f));
          const thematic = pl.filter((x) => x.endsWith('ante')).map((x) => x.slice(0, -4) + 'amAn');
          if (thematic.length > 0 && !thematic.some((t) => fk.replace(/R/g, 'n').startsWith(t.replace(/R/g, 'n')))) rule = false;
        }
        if (k.field === 'ktavatu' && !(krdanta.kta ?? []).some((x) => key(x).slice(0, -1) + 'vAn' === fk)) rule = false;
        const deva = toDeva(fk);
        if (!validateDeva(deva).ok) throw new Error(`${spec.id} ${k.field}: invalid ${deva}`);
        // DCS attestation: the form (in its common sandhi shapes) tagged with this root, at least twice
        const shapes = [fk];
        if (k.kind === 'a') shapes.push(fk.slice(0, -2) + 'o', fk.slice(0, -1) + 's', fk.slice(0, -1) + 'S');
        if (k.kind === 'at' && fk.endsWith('n')) shapes.push(fk + 'n');
        const tagOk = k.kind === 'avyaya' ? (t: string): boolean => t.startsWith('pos=vi') : (t: string): boolean => t.startsWith('pos=va') && t.includes('g=m') && t.includes('c=1') && t.includes('n=s');
        const d = dcsCount(o.dcs, shapes, dcsLemmas, tagOk) >= 2;
        if (!out.some((x) => x.form === deva)) out.push({ form: deva, c, d, rule });
      }
    }
    const accepted = out.filter((x) => (x.c || x.d) && x.rule);
    for (const x of out) if (!((x.c || x.d) && x.rule)) stats.droppedForms.push(`${spec.id} ${k.field} ${x.form} (${x.c || x.d ? '' : 'neither in Heritage nor attested in DCS'}${x.rule ? '' : ' stem / nominative rule mismatch'})`);
    if (accepted.length > 0) {
      const pref = (x: { form: string; c: boolean; d: boolean }): number => (prefer.has(key(x.form)) ? 0 : 10) + (x.c && x.d ? 0 : 1);
      accepted.sort((x, y) => pref(x) - pref(y));
      krdanta[k.field] = accepted.map((x) => x.form);
      krdantaEvidence[k.field] = accepted;
      if (accepted.length > 1) stats.multi.push(`${spec.id} ${k.field} ${accepted.map((x) => `${x.form}${x.c ? 'ᶜ' : ''}${x.d ? 'ᵈ' : ''}`).join(' / ')}`);
    }
  }

  return { spec, ash, heritageRoots, svRoot, forms, evidence, krdanta, krdantaEvidence, lyap: [], stats };
}

export function buildAll(o: Oracles, specs: DhatuSpec[] = DHATU_SPECS): BuiltDhatu[] {
  return specs.map((s) => buildOne(s, o));
}

/** lyap of a root as the oracle stores it (with dummy प्र), stripped of the prefix; SLP1 keys. */
export function lyapStemsSlp(o: Oracles, baseindex: string): string[] {
  const cells = o.krut.get(baseindex)?.get('ल्यप्') ?? [];
  return cells.map((c) => normSlp(devaToSlp1(c.stem))).filter((s) => s.startsWith('pra')).map((s) => s.slice(3));
}
