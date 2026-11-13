// Run with:  npm run validate   (node --import tsx tools/validate-content.ts)
/**
 * Content gate + report:  npm run validate [-- --json]
 * For every pack under src/content/<pack>/ it checks, mechanically:
 *   - the pack exports `meta` and at least one data array
 *   - ids are unique within each array
 *   - every string containing Devanagari is NFC and structurally well-formed (validateDeva)
 *   - every item carries provenance { source, verifiedBy[≥1] }
 * and prints counts by level and by verification source. Deeper, pack-specific checks
 * (golden paradigms, engine cross-checks, agreement) live in each pack's own tests.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateDeva } from '../src/sanskrit/index';

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = join(root, 'src/content');
const asJson = process.argv.includes('--json');
const DEVA = /[ऀ-ॿ]/;

interface PackReport {
  pack: string;
  version?: string;
  license?: string;
  arrays: Record<string, { items: number; byLevel: Record<string, number>; verifiedBy: Record<string, number>; humanReviewed: number; strings: number }>;
  errors: string[];
}

function walkStrings(value: unknown, path: string, visit: (s: string, path: string) => void, depth = 0): void {
  if (depth > 12) return;
  if (typeof value === 'string') visit(value, path);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit, depth + 1));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walkStrings(v, `${path}.${k}`, visit, depth + 1);
}

const reports: PackReport[] = [];
const packs = readdirSync(contentDir).filter((n) => statSync(join(contentDir, n)).isDirectory() && existsSync(join(contentDir, n, 'index.ts')));

for (const pack of packs.sort()) {
  const report: PackReport = { pack, arrays: {}, errors: [] };
  reports.push(report);
  let mod: Record<string, unknown>;
  try {
    mod = (await import(pathToFileURL(join(contentDir, pack, 'index.ts')).href)) as Record<string, unknown>;
  } catch (err) {
    report.errors.push(`cannot import: ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  const meta = mod['meta'] as { version?: string; license?: string; id?: string } | undefined;
  if (!meta) report.errors.push('missing `meta` export');
  report.version = meta?.version;
  report.license = meta?.license;

  for (const [name, value] of Object.entries(mod)) {
    if (!Array.isArray(value) || value.length === 0 || typeof value[0] !== 'object' || value[0] === null) continue;
    const items = value as Record<string, unknown>[];
    const hasIds = items.every((it) => typeof it['id'] === 'string');
    const provenanced = items.some((it) => 'provenance' in it);
    if (!hasIds && !provenanced) continue; // helper tables (categories etc.) are checked for well-formed strings only
    if (/PENDING/.test(name)) continue; // parked items that are deliberately not served to games
    const stat = { items: items.length, byLevel: {} as Record<string, number>, verifiedBy: {} as Record<string, number>, humanReviewed: 0, strings: 0 };
    report.arrays[name] = stat;
    const seen = new Set<string>();
    for (const [i, it] of items.entries()) {
      const id = typeof it['id'] === 'string' ? it['id'] : `#${i}`;
      if (hasIds) {
        if (seen.has(id)) report.errors.push(`${name}: duplicate id "${id}"`);
        seen.add(id);
      }
      if (typeof it['level'] === 'number') stat.byLevel[`L${it['level']}`] = (stat.byLevel[`L${it['level']}`] ?? 0) + 1;
      if (provenanced) {
        const p = it['provenance'] as { source?: string; verifiedBy?: string[]; humanReviewed?: boolean } | undefined;
        if (!p || !p.source || !Array.isArray(p.verifiedBy) || p.verifiedBy.length === 0) report.errors.push(`${name}/${id}: missing provenance.source or provenance.verifiedBy`);
        else {
          // group by verification family: 'oracle:mw#rakta' / 'corpus:dcs(12)' / 'pack:dhatu/kr-8u' → 'oracle:mw', 'corpus:dcs', 'pack:dhatu'
          for (const v of new Set(p.verifiedBy.map((x) => (x.startsWith('word:') ? 'word:(per-word note)' : (x.split(/[#(/]/)[0] ?? x).trim())))) stat.verifiedBy[v] = (stat.verifiedBy[v] ?? 0) + 1;
          if (p.humanReviewed) stat.humanReviewed += 1;
        }
      }
      walkStrings(it, `${name}/${id}`, (s, path) => {
        if (!DEVA.test(s) || /\.(provenance|source)\b/.test(path)) return;
        stat.strings += 1;
        if (s !== s.normalize('NFC')) report.errors.push(`${path}: not NFC: "${s}"`);
        // validate each Devanagari run; mixed strings (e.g. vigraha with punctuation, glosses) are split on non-Devanagari
        for (const run of s.split(/[^ऀ-ॿ‌‍]+/).filter(Boolean)) {
          const res = validateDeva(run);
          if (!res.ok) report.errors.push(`${path}: malformed "${run}" in "${s}": ${res.errors.join('; ')}`);
        }
      });
    }
  }
  if (Object.keys(report.arrays).length === 0) report.errors.push('no data arrays with ids/provenance found');
}

const failed = reports.some((r) => r.errors.length > 0);
if (asJson) console.log(JSON.stringify(reports, null, 2));
else {
  console.log(`Content report — ${reports.length} pack(s)\n`);
  for (const r of reports) {
    console.log(`■ ${r.pack}${r.version ? ` v${r.version}` : ''}${r.license ? `  (${r.license})` : ''}`);
    for (const [name, a] of Object.entries(r.arrays)) {
      const levels = Object.entries(a.byLevel).sort().map(([k, v]) => `${k}:${v}`).join(' ');
      const verAll = Object.entries(a.verifiedBy).sort((x, y) => y[1] - x[1]);
      const ver = verAll.slice(0, 10).map(([k, v]) => `${k}×${v}`).join(', ') + (verAll.length > 10 ? `, … (+${verAll.length - 10} more kinds)` : '');
      console.log(`  ${name}: ${a.items} items, ${a.strings} Sanskrit strings${levels ? ` · ${levels}` : ''}`);
      if (ver) console.log(`    verified by: ${ver}`);
      console.log(`    human-reviewed: ${a.humanReviewed} / ${a.items}`);
    }
    for (const e of r.errors.slice(0, 40)) console.log(`  ✗ ${e}`);
    if (r.errors.length > 40) console.log(`  … and ${r.errors.length - 40} more`);
    console.log('');
  }
  console.log(failed ? 'CONTENT VALIDATION FAILED' : 'content ok');
}
process.exit(failed ? 1 : 0);
