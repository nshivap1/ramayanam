/**
 * Interface strings gate (OWNER: orchestrator). content/sa-ui-*.json → see notes/sa-ui.md.
 *   - keys are unique across the files; every entry has English and (strict) Sanskrit
 *   - {$slots} match between the languages; markup ids exist
 *   - every Sanskrit word verifies with the oracle (sa-verify.ts), `label` entries need no final ।
 *   - every key a source file asks for (ui.t('k') · ui.plain('k') · ui.en/sa('k') · uiToast(…, 'k') · uiEn/uiSa(…, 'k')
 *     · <UiText k="k">) exists; dynamic keys are written with a static prefix and listed in DYNAMIC below
 * This file holds no Sanskrit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { UI_FILES, UI_FILE_NAMES, uiMap } from './content';
import { getOracle } from './sa-verify';
import { fillSlots, slotNames } from './sa-ui';

const STRICT = process.env.RY_SA_LENIENT !== '1';
const NAMES: readonly string[] = UI_FILE_NAMES;
const DIR = new URL('.', import.meta.url).pathname;
const short = (s: string, n = 60): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

test('sa-ui: keys are unique across files and every entry is complete', () => {
  const seen = new Map<string, string>();
  const problems: string[] = [];
  let empty = 0;
  UI_FILES.forEach((f, i) => {
    const name = NAMES[i] ?? `#${i}`;
    for (const [k, e] of Object.entries(f.entries)) {
      const prev = seen.get(k);
      if (prev) problems.push(`${name}: key "${k}" is already defined in ${prev}`);
      seen.set(k, name);
      if (!/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/.test(k)) problems.push(`${name}: key "${k}" should look like area.name`);
      if (!e.en || !e.en.trim()) problems.push(`${name}: ${k} has no English`);
      if (!e.sa || !e.sa.trim()) empty++;
      else if (slotNames(e.en).join(',') !== slotNames(e.sa).join(',')) problems.push(`${name}: ${k} slots differ: en {${slotNames(e.en)}} sa {${slotNames(e.sa)}}`);
    }
    console.log(`# ${name}: ${Object.keys(f.entries).length} entries`);
  });
  assert.deepEqual(problems, [], problems.join('\n'));
  if (STRICT) assert.equal(empty, 0, `${empty} interface strings have no Sanskrit yet (or set RY_SA_LENIENT=1 while translating)`);
});

test('sa-ui (v0.5b): every interface file is bundled under its name; the package files keep to their key prefix', () => {
  assert.equal(UI_FILES.length, NAMES.length, 'UI_FILES and UI_FILE_NAMES line up');
  for (const [i, name] of NAMES.entries()) {
    const disk = JSON.parse(readFileSync(join(DIR, 'content', name), 'utf8')) as { entries: Record<string, unknown> };
    assert.deepEqual(Object.keys(UI_FILES[i]!.entries), Object.keys(disk.entries), `${name} is the bundled file #${i}`);
  }
  // v0.5b (notes/v05b-ownership.md): each package adds keys only to its own file, with its own prefix
  const PREFIX: Record<string, string> = { 'sa-ui-scene.json': 'scene.', 'sa-ui-setu.json': 'setu.', 'sa-ui-chain.json': 'chain.' };
  const problems: string[] = [];
  for (const [i, name] of NAMES.entries()) {
    const own = PREFIX[name];
    for (const k of Object.keys(UI_FILES[i]!.entries)) {
      if (own && !k.startsWith(own)) problems.push(`${name}: key "${k}" must start with "${own}"`);
      for (const [f, pre] of Object.entries(PREFIX)) if (f !== name && k.startsWith(pre)) problems.push(`${name}: key "${k}" belongs in ${f}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('sa-ui: every Sanskrit word verifies with the oracle', () => {
  const o = getOracle();
  const problems: string[] = [];
  let n = 0;
  UI_FILES.forEach((f, i) => {
    for (const [k, e] of Object.entries(f.entries)) {
      if (!e.sa || !e.sa.trim()) continue;
      n++;
      const r = o.verifyLine(e.sa, { en: e.en, ui: true, label: e.label === true });
      if (!r.ok) problems.push(`${NAMES[i]} ${k} "${short(e.sa)}": ${r.errors.join('; ')}`);
    }
  });
  console.log(`# ${n} Sanskrit interface strings verified`);
  assert.deepEqual(problems, [], `${problems.length} problem(s):\n  ${problems.slice(0, 80).join('\n  ')}`);
});

test('sa-ui: fillSlots fills numbers, strings and {en, sa} pairs', () => {
  assert.equal(fillSlots('owned {$n}', { n: 12 }, 'en'), 'owned 12');
  assert.equal(fillSlots('{$n}', { n: 12 }, 'sa'), '१२');
  assert.equal(fillSlots('{$x} and {$y}', { x: '{w:rama}', y: { en: 'E', sa: 'S' } }, 'sa'), '{w:rama} and S');
  assert.equal(fillSlots('{$missing}!', {}, 'en'), '!');
});

/** Keys built at run time: the static prefix + every suffix that exists must be defined. */
const DYNAMIC: Record<string, string[]> = {};

test('sa-ui: every key used in the source exists', () => {
  const table = uiMap();
  const files = readdirSync(DIR).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts') && f !== 'view-ui.tsx' && f !== 'sa-ui.ts');
  const RE = /(?:\bui\.(?:t|plain|en|sa)|\buiToast|\buiEn|\buiSa|\bUiText\b[^>]*?\bk)\s*(?:\(\s*(?:[A-Za-z_.]+\s*,\s*)?|=\s*\{?\s*)['"`]([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+)+)['"`]/g;
  const missing: string[] = [];
  const used = new Set<string>();
  for (const f of files) {
    const src = readFileSync(join(DIR, f), 'utf8');
    for (const m of src.matchAll(RE)) {
      const k = m[1] ?? '';
      used.add(k);
      if (!(k in table)) missing.push(`${f}: "${k}"`);
    }
  }
  for (const [prefix, suffixes] of Object.entries(DYNAMIC)) for (const s of suffixes) {
    used.add(prefix + s);
    if (!(prefix + s in table)) missing.push(`dynamic: "${prefix + s}"`);
  }
  const unused = Object.keys(table).filter((k) => !used.has(k) && !k.startsWith('common.'));
  console.log(`# ${used.size} keys used in source · ${unused.length} not referenced statically${unused.length ? `: ${unused.slice(0, 20).join(', ')}${unused.length > 20 ? ' …' : ''}` : ''}`);
  assert.deepEqual(missing, [], `keys used in source but missing from content/sa-ui-*.json:\n  ${missing.join('\n  ')}`);
});
