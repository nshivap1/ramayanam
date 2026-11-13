/**
 * Repo-wide contract: every game folder obeys the structure and rules in docs/GAME_CONTRACT.md.
 * These tests are what keeps 40+ independently contributed games consistent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type GameManifest, validateManifest } from '../../src/sdk/index';
import { validateDeva } from '../../src/sanskrit/index';

const root = fileURLToPath(new URL('../..', import.meta.url));
const REQUIRED = ['manifest.ts', 'Game.tsx', 'logic.ts', 'logic.test.ts', 'e2e.spec.ts', 'PRD.md'];

function folders(base: string): { id: string; dir: string; labs: boolean }[] {
  const dir = join(root, base);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => !n.startsWith('_') && !n.startsWith('.') && statSync(join(dir, n)).isDirectory())
    .map((id) => ({ id, dir: join(dir, id), labs: base === 'labs' }));
}
const onlyGame = process.env['SAMSKURU_GAME'];
const all = [...folders('src/games'), ...folders('labs')].filter((g) => !onlyGame || g.id === onlyGame);

function files(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) files(p, out);
    else out.push(p);
  }
  return out;
}

test('there is at least one game', () => {
  assert.ok(all.length > 0);
});

test('game ids are unique across src/games and labs', () => {
  const ids = all.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const g of all) {
  test(`${g.id}: required files exist`, () => {
    const required = g.labs ? ['manifest.ts', 'Game.tsx', 'logic.ts', 'logic.test.ts'] : REQUIRED;
    for (const f of required) assert.ok(existsSync(join(g.dir, f)), `${g.id}/${f} is missing`);
  });

  test(`${g.id}: manifest is valid`, async () => {
    const mod = (await import(pathToFileURL(join(g.dir, 'manifest.ts')).href)) as { manifest: GameManifest };
    assert.deepEqual(validateManifest(mod.manifest, g.id), []);
    if (g.labs) assert.equal(mod.manifest.status, 'labs', 'games under labs/ must have status "labs"');
    else assert.notEqual(mod.manifest.status, 'labs', 'games under src/games must not have status "labs" (move it to labs/)');
  });

  test(`${g.id}: logic.ts is pure (no React/DOM/ui imports, no Math.random/Date.now)`, () => {
    const src = readFileSync(join(g.dir, 'logic.ts'), 'utf8');
    assert.ok(!/from\s+['"]react/.test(src), 'logic.ts must not import react');
    assert.ok(!/from\s+['"](@ui|\.\.\/\.\.\/ui)/.test(src), 'logic.ts must not import the UI layer');
    assert.ok(!/\b(document|window|localStorage)\./.test(src), 'logic.ts must not touch the DOM');
    assert.ok(!/Math\.random\s*\(/.test(src), 'logic.ts must use the seeded Rng, not Math.random');
    assert.ok(!/Date\.now\s*\(|new Date\s*\(/.test(src), 'logic.ts must not read the clock (pass time in)');
  });

  test(`${g.id}: no Math.random anywhere in the game`, () => {
    for (const f of files(g.dir).filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.ts$|\.spec\.ts$/.test(p))) {
      assert.ok(!/Math\.random\s*\(/.test(readFileSync(f, 'utf8')), `${f} uses Math.random — use createRng(ctx.seed)`);
    }
  });

  test(`${g.id}: imports stay inside the game or the public platform APIs`, () => {
    for (const f of files(g.dir).filter((p) => /\.(ts|tsx)$/.test(p))) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        const spec = m[1] as string;
        const ok =
          spec.startsWith('./') ||
          /^@(sdk|ui|sanskrit|content)(\/|$)/.test(spec) ||
          spec === 'react' ||
          spec.startsWith('node:') ||
          spec === 'playwright' ||
          /^(\.\.\/)+tests\/e2e\/harness$/.test(spec);
        assert.ok(ok, `${f}: import "${spec}" is not allowed (use ./, @sdk, @ui, @sanskrit, @content, react)`);
        assert.ok(!/games\/(?!.*\/)/.test(spec) || spec.startsWith('./'), `${f}: games must not import other games`);
      }
    }
  });

  test(`${g.id}: style.css is scoped to .g-${g.id}`, () => {
    const p = join(g.dir, 'style.css');
    if (!existsSync(p)) return;
    const css = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const scope = `.g-${g.id}`;
    // crude but effective: every rule's selector list must mention the scope; @keyframes names must be prefixed
    const body = css.replace(/@keyframes\s+([\w-]+)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, (_m, name: string) => {
      assert.ok(name.startsWith(`g-${g.id}-`), `@keyframes ${name} must be named g-${g.id}-*`);
      return '';
    });
    for (const m of body.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      const sel = (m[1] as string).trim();
      if (sel.startsWith('@')) continue;
      for (const part of sel.split(',')) assert.ok(part.trim().includes(scope), `selector "${part.trim()}" in ${g.id}/style.css must be scoped under ${scope}`);
    }
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), `${g.id}/style.css hard-codes a colour — use design tokens (var(--…))`);
  });

  test(`${g.id}: Game.tsx renders Sanskrit only through <SaText>/renderSa and roots itself in .g-${g.id}`, () => {
    const src = readFileSync(join(g.dir, 'Game.tsx'), 'utf8');
    assert.ok(/export default/.test(src), 'Game.tsx must have a default export');
    assert.ok(src.includes(`g-${g.id}`) || src.includes('QuizRunner'), `Game.tsx root element must use class "g-${g.id}"`);
    assert.ok(/ctx\.finish\(|QuizRunner/.test(src) || files(g.dir).some((f) => /\.tsx?$/.test(f) && /ctx\.finish\(/.test(readFileSync(f, 'utf8'))), 'the game must call ctx.finish (or use QuizRunner)');
  });

  test(`${g.id}: every Devanagari string literal in source is structurally well-formed`, () => {
    for (const f of files(g.dir).filter((p) => /\.(ts|tsx)$/.test(p) && !/\.(test|spec)\.ts$/.test(p))) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/[\u0900-\u097F][\u0900-\u097F\u200c\u200d ऽ।॥-]*/g)) {
        const text = m[0].trim().replace(/[\s-]+$/, '');
        if (/^[\u093e-\u094d\u0901-\u0903]/.test(text)) continue; // a bare vowel sign / mark used as a key label or lookup key
        const res = validateDeva(text);
        assert.ok(res.ok, `${f}: malformed Devanagari "${text}": ${res.errors.join('; ')}`);
        assert.equal(text, text.normalize('NFC'), `${f}: "${text}" is not NFC`);
      }
    }
  });

  if (!g.labs) {
    test(`${g.id}: PRD.md has the required sections`, () => {
      const prd = readFileSync(join(g.dir, 'PRD.md'), 'utf8');
      for (const h of ['## Learning objective', '## Core loop', '## Sanskrit rules', '## Content', '## Acceptance tests']) assert.ok(prd.includes(h), `PRD.md is missing "${h}"`);
    });
  }
}
