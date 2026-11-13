/**
 * Generates src/content/shabda/data.ts from the reference datasets and writes the cross-check
 * report to tools/content/nominal/reports/shabda-report.md.
 *
 *   cd <repo> && node --import tsx tools/content/nominal/gen-shabda.ts          # regenerate
 *   cd <repo> && node --import tsx tools/content/nominal/gen-shabda.ts --check  # fail if data.ts is stale
 *
 * Oracles are read from $SAMSKURU_ORACLES (default /home/claude/refs/data). See README.md.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeva } from '../../../src/sanskrit/translit.ts';
import { type Derived, derive, toDeva } from './lib/derive.ts';
import { oraclesAvailable, ORACLE_ROOT } from './lib/oracles.ts';
import { SHABDA_SPECS } from './shabda-spec.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const OUT = join(repo, 'src', 'content', 'shabda', 'data.ts');
const REPORT = join(here, 'reports', 'shabda-report.md');

const SOURCE_NAMES: Record<string, string> = {
  vidyut: 'ashtadhyayi.com śabda tables (vidyut-prakriya)',
  huet: 'Sanskrit Heritage declension tables (G. Huet, via csl-inflect)',
  cologne: 'csl-inflect hand tables (Cologne)',
  kale: 'learnsanskrit.org tables after M. R. Kale, Higher Sanskrit Grammar',
};

function q(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export interface BuiltParadigm {
  derived: Derived;
  forms: string[][][]; // [8][3][n] Devanagari
  citation: string;
  verifiedBy: string[];
  source: string;
}

export function build(): { built: BuiltParadigm[]; dropped: { id: string; reason: string }[] } {
  const built: BuiltParadigm[] = [];
  const dropped: { id: string; reason: string }[] = [];
  const ids = new Set<string>();
  for (const spec of SHABDA_SPECS) {
    if (ids.has(spec.id)) throw new Error(`duplicate id ${spec.id}`);
    ids.add(spec.id);
    const d = derive(spec);
    const families = [...new Set(d.sources.map((s) => s.family))];
    if (families.length < 2) {
      dropped.push({ id: spec.id, reason: `only one source family (${families.join(', ') || 'none'})` });
      continue;
    }
    if (d.holes.length > 0) {
      dropped.push({ id: spec.id, reason: `cells without two-family agreement: ${d.holes.join(' ')}` });
      continue;
    }
    const forms: string[][][] = [];
    for (let v = 0; v < 8; v++) {
      const row: string[][] = [];
      for (let n = 0; n < 3; n++) {
        const cell = (d.cells[v * 3 + n] ?? []).map(toDeva);
        for (const f of cell) {
          const r = validateDeva(f);
          if (!r.ok) throw new Error(`${spec.id}: invalid Devanagari ${f}: ${r.errors.join('; ')}`);
        }
        row.push(cell);
      }
      forms.push(row);
    }
    const citation = forms[0]?.[0]?.[0] ?? forms[0]?.[1]?.[0] ?? forms[0]?.[2]?.[0];
    if (!citation) throw new Error(`${spec.id}: no nominative form`);
    built.push({
      derived: d,
      forms,
      citation,
      verifiedBy: d.sources.map((s) => s.tag),
      source: families.map((f) => SOURCE_NAMES[f]).join(' × '),
    });
  }
  return { built, dropped };
}

export function render(built: BuiltParadigm[]): string {
  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * GENERATED FILE — do not edit by hand.');
  lines.push(' * Source of truth: tools/content/nominal/shabda-spec.ts + the reference datasets.');
  lines.push(' * Regenerate: node --import tsx tools/content/nominal/gen-shabda.ts');
  lines.push(' * Every cell holds only forms confirmed by two independent source families (see ./README.md).');
  lines.push(' */');
  lines.push("import type { ShabdaParadigm } from './types';");
  lines.push('');
  lines.push('// prettier-ignore');
  lines.push('export const SHABDA_DATA: readonly ShabdaParadigm[] = [');
  for (const b of built) {
    const sp = b.derived.spec;
    lines.push('  {');
    lines.push(
      `    id: ${q(sp.id)}, stem: ${q(sp.stem)}, citation: ${q(b.citation)}, gender: ${q(sp.gender)},${sp.genderless ? ' genderless: true,' : ''} anta: ${q(sp.anta)}, kind: ${q(sp.kind)}, en: ${q(sp.en)}, level: ${sp.level},`,
    );
    lines.push('    forms: [');
    for (const row of b.forms) {
      lines.push(`      [${row.map((cell) => `[${cell.map(q).join(', ')}]`).join(', ')}],`);
    }
    lines.push('    ],');
    lines.push(`    provenance: { source: ${q(b.source)}, verifiedBy: [${b.verifiedBy.map(q).join(', ')}] },`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

function renderReport(built: BuiltParadigm[], dropped: { id: string; reason: string }[]): string {
  const out: string[] = [];
  out.push('# SHABDA cross-check report (generated)');
  out.push('');
  out.push(`Paradigms built: ${built.length}. Dropped: ${dropped.length}.`);
  out.push('');
  const famCount = new Map<string, number>();
  const tagCount = new Map<string, number>();
  for (const b of built) {
    const fams = [...new Set(b.derived.sources.map((s) => s.family))].sort().join(' + ');
    famCount.set(fams, (famCount.get(fams) ?? 0) + 1);
    for (const s of b.derived.sources) {
      const name = s.tag.split('#')[0]!;
      tagCount.set(name, (tagCount.get(name) ?? 0) + 1);
    }
  }
  out.push('## Source-family combinations');
  out.push('');
  for (const [k, v] of [...famCount].sort()) out.push(`- ${k}: ${v}`);
  out.push('');
  out.push('## Sources used');
  out.push('');
  for (const [k, v] of [...tagCount].sort()) out.push(`- ${k}: ${v} paradigms`);
  out.push('');
  if (dropped.length) {
    out.push('## Dropped paradigms');
    out.push('');
    for (const d of dropped) out.push(`- ${d.id}: ${d.reason}`);
    out.push('');
  }
  const verdictTotals = new Map<string, number>();
  for (const b of built) for (const l of b.derived.leftovers) verdictTotals.set(l.verdict, (verdictTotals.get(l.verdict) ?? 0) + 1);
  out.push('## Forms seen in a source but not confirmed by two families (totals)');
  out.push('');
  for (const [k, v] of [...verdictTotals].sort()) out.push(`- ${k}: ${v}`);
  out.push('');
  out.push('## Single-family forms that were accepted (rule or spec) — reviewer: look here first');
  out.push('');
  out.push('| paradigm | cell | form | attested by | reason |');
  out.push('|---|---|---|---|---|');
  for (const b of built)
    for (const l of b.derived.leftovers)
      if (l.verdict === 'accepted-by-rule' || l.verdict === 'accepted-by-spec')
        out.push(`| ${b.derived.spec.id} | ${l.cell} | ${toDeva(l.form)} | ${l.families.join(', ')} | ${l.why ?? ''} |`);
  out.push('');
  out.push('## Forms left out (single source, not in the Pāṇinian engine, or deliberately no vocative)');
  out.push('');
  out.push('| paradigm | verdict | cell:form (families) |');
  out.push('|---|---|---|');
  for (const b of built) {
    for (const verdict of ['single-source', 'not-in-vidyut', 'huet-extra', 'no-vocative', 'sandhi-variant'] as const) {
      const xs = b.derived.leftovers.filter((l) => l.verdict === verdict);
      if (xs.length) out.push(`| ${b.derived.spec.id} | ${verdict} | ${xs.map((l) => `${l.cell}:${toDeva(l.form)} (${l.families.join('+')})`).join(' · ')} |`);
    }
  }
  out.push('');
  out.push('## Cells with more than one accepted form (display form first)');
  out.push('');
  out.push('| paradigm | cells |');
  out.push('|---|---|');
  for (const b of built) {
    const multi: string[] = [];
    b.forms.forEach((row, v) => row.forEach((cell, n) => cell.length > 1 && multi.push(`${v + 1}.${n + 1} ${cell.join(' / ')}`)));
    if (multi.length) out.push(`| ${b.derived.spec.id} | ${multi.join(' · ')} |`);
  }
  out.push('');
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!oraclesAvailable()) {
    console.error(`Oracle datasets not found under ${ORACLE_ROOT} (set SAMSKURU_ORACLES).`);
    process.exit(2);
  }
  const { built, dropped } = build();
  const text = render(built);
  if (process.argv.includes('--check')) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (current !== text) {
      console.error('src/content/shabda/data.ts is stale: re-run gen-shabda.ts');
      process.exit(1);
    }
    console.log(`shabda data up to date (${built.length} paradigms)`);
  } else {
    writeFileSync(OUT, text);
    mkdirSync(dirname(REPORT), { recursive: true });
    writeFileSync(REPORT, renderReport(built, dropped));
    console.log(`wrote ${built.length} paradigms to ${OUT}; dropped ${dropped.length}${dropped.length ? ': ' + dropped.map((d) => `${d.id} (${d.reason})`).join('; ') : ''}`);
  }
}
