/**
 * Repo-level guards for the PLATFORM (shell, SDK, design system, build, docs). The per-game
 * contract lives next door in games.test.ts. Everything here is a static scan: no build, no browser.
 *
 * With `--game=<id>` (SAMSKURU_GAME set) only that game's import boundaries are checked, so a
 * contributor's isolated gate never fails because of somebody else's work in progress.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type GameManifest, validateManifest } from '../../src/sdk/index';

const root = fileURLToPath(new URL('../..', import.meta.url));
const onlyGame = process.env['SAMSKURU_GAME'];
/** Platform-wide guards are skipped in an isolated per-game run. */
const platform = { skip: onlyGame ? 'platform guards run in the full gate (npm run check)' : false };

const read = (rel: string): string => readFileSync(join(root, rel), 'utf8');
const exists = (rel: string): boolean => existsSync(join(root, rel));
const posix = (p: string): string => p.split(sep).join('/');
function walk(rel: string, out: string[] = []): string[] {
  const dir = join(root, rel);
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const child = `${rel}/${name}`;
    if (statSync(join(root, child)).isDirectory()) walk(child, out);
    else out.push(child);
  }
  return out;
}
const isCode = (p: string): boolean => /\.(ts|tsx)$/.test(p);
const isTestFile = (p: string): boolean => /\.(test|spec)\.tsx?$/.test(p);
/** Remove comments so that prose such as "never call Math.random()" or an import shown in a doc block is not scanned as code. */
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

// ───────────────────────────── 1. public indexes ─────────────────────────────

for (const pkg of ['sdk', 'ui'] as const) {
  test(`src/${pkg}/index.ts: every re-exported module exists, and every module in the folder is re-exported`, platform, () => {
    const index = read(`src/${pkg}/index.ts`);
    const exported = [...index.matchAll(/export\s+\*\s+from\s+['"]\.\/([^'"]+)['"]/g)].map((m) => m[1] as string);
    assert.ok(exported.length >= 7, `expected the ${pkg} index to re-export its modules, found ${exported.length}`);
    assert.equal(new Set(exported).size, exported.length, 'a module is re-exported twice');
    for (const name of exported) {
      assert.ok(exists(`src/${pkg}/${name}.ts`) || exists(`src/${pkg}/${name}.tsx`), `src/${pkg}/index.ts re-exports ./${name}, which does not exist`);
    }
    const modules = readdirSync(join(root, 'src', pkg))
      .filter((n) => isCode(n) && !isTestFile(n) && n !== 'index.ts')
      .map((n) => n.replace(/\.tsx?$/, ''));
    for (const name of modules) assert.ok(exported.includes(name), `src/${pkg}/${name} is not re-exported from the index, so games cannot use it`);
    assert.ok(!/from\s+['"]\.\.\//.test(index), 'an index only re-exports its own folder');
  });
}

test('tsconfig path aliases point at index files that exist; content packs are imported one by one as @content/<pack>', platform, () => {
  const paths = (JSON.parse(read('tsconfig.json')) as { compilerOptions: { paths: Record<string, string[]> } }).compilerOptions.paths;
  assert.deepEqual(Object.keys(paths).sort(), ['@content', '@content/*', '@sanskrit', '@sanskrit/*', '@sdk', '@sdk/*', '@ui', '@ui/*']);
  for (const alias of ['@sdk', '@ui', '@sanskrit']) {
    const target = (paths[alias] as string[])[0] as string;
    assert.ok(exists(target.replace(/^\.\//, '')), `${alias} → ${target} does not exist`);
  }
  for (const [alias, targets] of Object.entries(paths)) assert.match(targets[0] as string, new RegExp(`^\\./src/${alias.slice(1).replace('/*', '')}/`), alias);
  const packs = readdirSync(join(root, 'src/content')).filter((n) => statSync(join(root, 'src/content', n)).isDirectory());
  assert.ok(packs.length >= 7, `expected the seven content packs, found ${packs.join(', ')}`);
  for (const pack of packs) {
    for (const f of ['index.ts', 'README.md', 'REVIEW.md']) assert.ok(exists(`src/content/${pack}/${f}`), `src/content/${pack}/${f} is missing (every pack needs an entry point, its sources and a human sign-off table)`);
  }
});

// ───────────────────────────── 2. layering ─────────────────────────────

const LAYERS = ['sanskrit', 'content', 'sdk', 'ui', 'games', 'app'] as const;
type Layer = (typeof LAYERS)[number];

/**
 * The import rule, as data. A file in layer L may import (at runtime) from L itself and from MAY_IMPORT[L].
 *   sanskrit ← content ← sdk ← ui ← games ← app      (arrows point at the importer)
 */
const MAY_IMPORT: Record<Layer, readonly Layer[]> = {
  sanskrit: [],
  content: ['sanskrit'],
  sdk: ['sanskrit', 'content'],
  ui: ['sanskrit', 'content', 'sdk'],
  games: ['sanskrit', 'content', 'sdk', 'ui'],
  app: ['sanskrit', 'content', 'sdk', 'ui', 'games'],
};
/** `import type` only (erased at build time, so it cannot create a runtime cycle). */
const MAY_IMPORT_TYPES: Partial<Record<Layer, readonly Layer[]>> = {
  content: ['sdk'], // content packs tag items with the SDK's `Level`
};
/** npm packages a layer may import at runtime. */
const PACKAGES: Record<Layer, readonly string[]> = {
  sanskrit: [],
  content: [],
  sdk: [],
  ui: ['react'],
  games: ['react'],
  app: ['react', 'react-dom'],
};
/** npm packages a layer may import with `import type` only. */
const TYPE_PACKAGES: Partial<Record<Layer, readonly string[]>> = {
  sdk: ['react'], // GameComponent = ComponentType<GameProps>
};
/** Extra freedom for *.test.ts / *.spec.ts files: Node built-ins, the browser driver, and repo folders outside src/. */
const TEST_PACKAGES = ['node:', 'playwright'];

interface Import {
  spec: string;
  typeOnly: boolean;
}
function importsOf(source: string): Import[] {
  const src = stripComments(source);
  const out: Import[] = [];
  for (const m of src.matchAll(/\bimport\s+(type\s+)?(?:[\w*\s{},$]+?\s+from\s+)?['"]([^'"\n]+)['"]/g)) out.push({ spec: m[2] as string, typeOnly: m[1] !== undefined });
  for (const m of src.matchAll(/\bexport\s+(type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s+['"]([^'"\n]+)['"]/g)) out.push({ spec: m[2] as string, typeOnly: m[1] !== undefined });
  for (const m of src.matchAll(/\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g)) out.push({ spec: m[1] as string, typeOnly: false });
  return out;
}
/** Layer of a repo-relative path; labs/ experiments obey the same rules as games. */
function layerOf(rel: string): Layer | null {
  const p = posix(rel);
  if (p.startsWith('labs/')) return 'games';
  const m = /^src\/([^/]+)\//.exec(p);
  return m && (LAYERS as readonly string[]).includes(m[1] as string) ? (m[1] as Layer) : null;
}
const gameFolder = (rel: string): string | null => /^(src\/games|labs)\/[^/]+/.exec(posix(rel))?.[0] ?? null;

type Target = { kind: 'layer'; layer: Layer; rel: string } | { kind: 'package'; name: string } | { kind: 'outside'; rel: string };
function resolveImport(spec: string, fromRel: string): Target {
  const alias = /^@(sanskrit|content|sdk|ui)(\/.*)?$/.exec(spec);
  if (alias) return { kind: 'layer', layer: alias[1] as Layer, rel: `src/${alias[1]}${alias[2] ?? ''}` };
  if (spec.startsWith('.')) {
    const rel = posix(relative(root, resolve(join(root, dirname(fromRel)), spec)));
    const layer = layerOf(`${rel}/`);
    return layer ? { kind: 'layer', layer, rel } : { kind: 'outside', rel };
  }
  return { kind: 'package', name: spec };
}
const pkgMatches = (name: string, allowed: readonly string[]): boolean => allowed.some((a) => (a.endsWith(':') ? name.startsWith(a) : name === a || name.startsWith(`${a}/`)));

/** Returns a description of the violation, or null when the import is allowed. */
function violation(fromRel: string, imp: Import): string | null {
  const from = layerOf(fromRel);
  if (!from) return null;
  const testFile = isTestFile(fromRel);
  const target = resolveImport(imp.spec, fromRel);
  const where = `${fromRel}: import "${imp.spec}"`;
  if (target.kind === 'package') {
    if (pkgMatches(target.name, PACKAGES[from])) return null;
    if (imp.typeOnly && pkgMatches(target.name, TYPE_PACKAGES[from] ?? [])) return null;
    if (testFile && pkgMatches(target.name, TEST_PACKAGES)) return null;
    return `${where} — package not allowed in src/${from}${pkgMatches(target.name, TYPE_PACKAGES[from] ?? []) ? ' except as `import type`' : ''}`;
  }
  if (target.kind === 'outside') return testFile ? null : `${where} — leaves src/ (only tests may import tools/ or tests/)`;
  if (target.layer === from) {
    if (from === 'games' && gameFolder(fromRel) !== gameFolder(`${target.rel}/`)) return `${where} — a game must not import another game`;
    return null;
  }
  if (MAY_IMPORT[from].includes(target.layer)) return null;
  if (imp.typeOnly && (MAY_IMPORT_TYPES[from] ?? []).includes(target.layer)) return null;
  return `${where} — ${from} must not depend on ${target.layer} (allowed: ${MAY_IMPORT[from].join(', ') || 'nothing'})`;
}

test('layering matrix is a strict order: each layer may import exactly the layers before it', () => {
  LAYERS.forEach((layer, i) => assert.deepEqual([...MAY_IMPORT[layer]], LAYERS.slice(0, i), layer));
  for (const [layer, extra] of Object.entries(MAY_IMPORT_TYPES)) for (const t of extra) assert.ok(!MAY_IMPORT[layer as Layer].includes(t), 'a type-only exception must be a real exception');
});

test('layering scanner: understands every import form and reports the classic mistakes (self-test)', () => {
  const src = `
    // import { nope } from 'commented-out';
    /* import x from "also-commented"; */
    import a from 'pkg-default';
    import { b,
      c } from "pkg-multi-line";
    import type { T } from 'pkg-type';
    import * as ns from 'pkg-ns';
    import 'pkg-side-effect';
    export * from './re-export';
    export { d } from './named-re-export';
    export type { U } from './type-re-export';
    const lazy = () => import('./lazy');
    const url = 'https://example.org/x'; import late from 'after-url';
  `;
  assert.deepEqual(
    importsOf(src).map((i) => `${i.typeOnly ? 'type ' : ''}${i.spec}`).sort(),
    ['./lazy', './named-re-export', './re-export', 'after-url', 'pkg-default', 'pkg-multi-line', 'pkg-ns', 'pkg-side-effect', 'type ./type-re-export', 'type pkg-type'].sort(),
  );
  const bad: [string, Import][] = [
    ['src/sdk/quiz.ts', { spec: 'react', typeOnly: false }],
    ['src/sdk/quiz.ts', { spec: '@ui', typeOnly: false }],
    ['src/sdk/quiz.ts', { spec: '../ui/hooks', typeOnly: false }],
    ['src/sdk/quiz.ts', { spec: '../app/router', typeOnly: true }],
    ['src/sdk/quiz.ts', { spec: '../games/smrti-yugala/logic', typeOnly: false }],
    ['src/sanskrit/translit.ts', { spec: '@sdk', typeOnly: false }],
    ['src/sanskrit/translit.ts', { spec: '../content/types', typeOnly: true }],
    ['src/sanskrit/translit.ts', { spec: 'node:fs', typeOnly: false }],
    ['src/content/vocab/index.ts', { spec: '../../sdk/rng', typeOnly: false }],
    ['src/content/vocab/index.ts', { spec: '../../../tools/content/lib', typeOnly: false }],
    ['src/ui/primitives.tsx', { spec: '../app/router', typeOnly: false }],
    ['src/ui/primitives.tsx', { spec: '../games/smrti-yugala/logic', typeOnly: false }],
    ['src/ui/primitives.tsx', { spec: 'react-dom', typeOnly: false }],
    ['src/games/a/Game.tsx', { spec: '../b/logic', typeOnly: false }],
    ['src/games/a/Game.tsx', { spec: '../../app/router', typeOnly: false }],
    ['src/games/a/Game.tsx', { spec: 'lodash', typeOnly: false }],
    ['src/games/a/logic.ts', { spec: 'node:crypto', typeOnly: false }],
    ['labs/x/Game.tsx', { spec: '../../src/app/GameHost', typeOnly: false }],
    ['labs/x/Game.tsx', { spec: '../../src/games/a/logic', typeOnly: false }],
    ['src/app/App.tsx', { spec: 'some-analytics-sdk', typeOnly: false }],
  ];
  for (const [file, imp] of bad) assert.notEqual(violation(file, imp), null, `${file} importing ${imp.spec} should be rejected`);
  const good: [string, Import][] = [
    ['src/sdk/types.ts', { spec: 'react', typeOnly: true }],
    ['src/sdk/quiz.ts', { spec: './types', typeOnly: false }],
    ['src/sdk/quiz.ts', { spec: '@sanskrit', typeOnly: false }],
    ['src/sdk/quiz.test.ts', { spec: 'node:test', typeOnly: false }],
    ['src/content/types.ts', { spec: '../sdk/types', typeOnly: true }],
    ['src/content/vocab/index.ts', { spec: '../../sanskrit/translit', typeOnly: false }],
    ['src/content/shabda/oracle.test.ts', { spec: '../../../tools/content/nominal/lib/derive', typeOnly: false }],
    ['src/ui/SaText.tsx', { spec: '@sdk', typeOnly: false }],
    ['src/ui/SaText.tsx', { spec: 'react', typeOnly: false }],
    ['src/ui/keyboardLogic.test.ts', { spec: '../sanskrit', typeOnly: false }],
    ['src/games/a/Game.tsx', { spec: './logic', typeOnly: false }],
    ['src/games/a/Game.tsx', { spec: '@ui', typeOnly: false }],
    ['src/games/a/Game.tsx', { spec: 'react', typeOnly: false }],
    ['src/games/a/e2e.spec.ts', { spec: '../../../tests/e2e/harness', typeOnly: false }],
    ['labs/x/logic.ts', { spec: '@content', typeOnly: false }],
    ['src/app/registry.gen.ts', { spec: '../games/a/manifest', typeOnly: false }],
    ['src/app/main.tsx', { spec: 'react-dom/client', typeOnly: false }],
    ['src/app/main.tsx', { spec: './styles.gen.css', typeOnly: false }],
  ];
  for (const [file, imp] of good) assert.equal(violation(file, imp), null, `${file} importing ${imp.spec} should be allowed`);
});

const scanRoots: string[] = onlyGame ? [`src/games/${onlyGame}`, `labs/${onlyGame}`] : [...LAYERS.map((l) => `src/${l}`), 'labs'];
test(`layering: every source file${onlyGame ? ` of ${onlyGame}` : ''} imports only what its layer allows`, () => {
  const files = scanRoots.flatMap((r) => walk(r)).filter(isCode);
  if (!onlyGame) assert.ok(files.length > 30, `scanned only ${files.length} files — is the walker broken?`);
  const problems: string[] = [];
  let imports = 0;
  for (const file of files) {
    for (const imp of importsOf(read(file))) {
      imports++;
      const v = violation(file, imp);
      if (v) problems.push(v);
    }
  }
  if (!onlyGame) assert.ok(imports > 100, `found only ${imports} imports — is the scanner broken?`);
  assert.deepEqual(problems, [], `\n${problems.join('\n')}\n`);
});

test('src/sdk never imports react at runtime (types via `import type` only) and never imports ui, app or games', platform, () => {
  const files = walk('src/sdk').filter(isCode);
  assert.ok(files.length >= 8);
  for (const file of files) {
    for (const imp of importsOf(read(file))) {
      if (/^react(-dom)?(\/|$)/.test(imp.spec)) assert.ok(imp.typeOnly, `${file}: runtime import of "${imp.spec}" — the SDK must stay usable without React (use \`import type\`)`);
      assert.ok(!/^@ui(\/|$)|(^|\/)(ui|app|games)(\/|$)/.test(imp.spec), `${file}: the SDK must not import "${imp.spec}"`);
    }
  }
  assert.ok(importsOf(read('src/sdk/types.ts')).some((i) => i.spec === 'react' && i.typeOnly), 'guard is vacuous if the one known react type import is not detected');
});

test('src/sanskrit never imports ui, app, games, sdk or content', platform, () => {
  const files = walk('src/sanskrit').filter(isCode);
  assert.ok(files.length >= 5);
  for (const file of files) {
    for (const imp of importsOf(read(file))) {
      assert.ok(!/^@(ui|sdk|content)(\/|$)|(^|\/)(ui|app|games|sdk|content)(\/|$)/.test(imp.spec), `${file}: the Sanskrit engine must not import "${imp.spec}"`);
    }
  }
});

// ───────────────────────────── 3. determinism and purity of the lower layers ─────────────────────────────

test('no Math.random anywhere in src/sdk (not even in tests): all randomness is seeded', platform, () => {
  const files = walk('src/sdk').filter(isCode);
  for (const file of files) assert.ok(!/Math\s*\.\s*random/.test(stripComments(read(file))), `${file} uses Math.random — use createRng(seed)`);
  assert.ok(/Math\s*\.\s*random/.test(stripComments('const x = Math.random(); // seeded? no')), 'self-test: the pattern detects a real call');
  assert.ok(!/Math\s*\.\s*random/.test(stripComments('// never call Math.random()\n/* Math.random */ const x = 1;')), 'self-test: comments are ignored');
});

test('no Math.random in the Sanskrit engine, the content packs or the UI kit', platform, () => {
  for (const file of [...walk('src/sanskrit'), ...walk('src/content'), ...walk('src/ui')].filter((f) => isCode(f) && !isTestFile(f))) {
    assert.ok(!/Math\s*\.\s*random/.test(stripComments(read(file))), `${file} uses Math.random`);
  }
});

test('src/sdk, src/sanskrit and src/content do not touch the DOM (they must run in Node, workers and native wrappers)', platform, () => {
  for (const file of [...walk('src/sdk'), ...walk('src/sanskrit'), ...walk('src/content')].filter((f) => isCode(f) && !isTestFile(f))) {
    const src = stripComments(read(file));
    assert.ok(!/(^|[^.\w])(document|window)\s*\./.test(src), `${file} touches document/window — reach browser APIs through globalThis with a guard, or move the code to src/ui or src/app`);
  }
});

// ───────────────────────────── 4. test hooks used by the e2e harness ─────────────────────────────

interface TestIds {
  exact: Set<string>;
  prefixes: Set<string>;
}
/** data-testid values a source file can render: literal ids and the fixed prefixes of template ids. */
function renderedTestIds(files: readonly string[]): TestIds {
  const exact = new Set<string>();
  const prefixes = new Set<string>();
  for (const file of files) {
    const src = read(file);
    for (const m of src.matchAll(/data-testid=(?:"([^"]+)"|\{'([^']+)'\}|\{"([^"]+)"\})/g)) exact.add((m[1] ?? m[2] ?? m[3]) as string);
    for (const m of src.matchAll(/data-testid=\{`([^`$]+)\$\{/g)) prefixes.add(m[1] as string);
  }
  return { exact, prefixes };
}
/** data-testid values a test file looks for. */
function usedTestIds(src: string): TestIds {
  const exact = new Set<string>();
  const prefixes = new Set<string>();
  for (const m of src.matchAll(/data-testid(\^)?=\\?"([^"\\$]+)(\$\{)?/g)) (m[1] || m[3] ? prefixes : exact).add(m[2] as string);
  for (const m of src.matchAll(/\.tap\(\s*['"`]([^'"`$]+)(\$\{)?/g)) (m[2] ? prefixes : exact).add(m[1] as string);
  return { exact, prefixes };
}
function assertRendered(used: TestIds, rendered: TestIds, who: string): void {
  for (const id of used.exact) {
    const ok = rendered.exact.has(id) || [...rendered.prefixes].some((p) => id.startsWith(p));
    assert.ok(ok, `${who} looks for data-testid="${id}", which nothing in src/ui or src/app renders`);
  }
  for (const prefix of used.prefixes) {
    const ok = [...rendered.prefixes].some((p) => p.startsWith(prefix) || prefix.startsWith(p)) || [...rendered.exact].some((id) => id.startsWith(prefix));
    assert.ok(ok, `${who} looks for data-testid^="${prefix}", which nothing in src/ui or src/app renders`);
  }
}

test('every data-testid the e2e harness relies on is rendered by src/ui or src/app', platform, () => {
  const rendered = renderedTestIds([...walk('src/ui'), ...walk('src/app')].filter((f) => f.endsWith('.tsx')));
  const used = usedTestIds(read('tests/e2e/harness.ts'));
  // not vacuous: the scan must find the hooks we know the harness uses
  for (const id of ['app', 'result', 'game-host', 'game-loading', 'feedback', 'check', 'continue']) assert.ok(used.exact.has(id), `harness scan missed "${id}"`);
  for (const p of ['choice-', 'token-', 'left-', 'right-', 'key-']) assert.ok(used.prefixes.has(p), `harness scan missed prefix "${p}"`);
  assert.ok(rendered.exact.size > 30 && rendered.prefixes.size >= 8, 'source scan found suspiciously few test ids');
  assertRendered(used, rendered, 'tests/e2e/harness.ts');
});

test('every data-testid the shell browser test relies on is rendered by src/ui or src/app', platform, () => {
  const rendered = renderedTestIds([...walk('src/ui'), ...walk('src/app')].filter((f) => f.endsWith('.tsx')));
  const used = usedTestIds(read('tests/e2e/shell.spec.ts'));
  assert.ok(used.exact.size >= 10, 'shell spec scan found suspiciously few test ids');
  assertRendered(used, rendered, 'tests/e2e/shell.spec.ts');
});

test('test ids rendered by the platform are unique literals (no two components claim the same fixed id)', platform, () => {
  const counts = new Map<string, string[]>();
  for (const file of [...walk('src/ui'), ...walk('src/app')].filter((f) => f.endsWith('.tsx'))) {
    for (const m of read(file).matchAll(/data-testid="([^"]+)"/g)) counts.set(m[1] as string, [...(counts.get(m[1] as string) ?? []), file]);
  }
  // game-error is intentionally rendered by two branches (load failure and crash boundary) of the same host.
  const dupes = [...counts].filter(([id, files]) => files.length > 1 && id !== 'game-error').map(([id, files]) => `${id} ← ${files.join(', ')}`);
  assert.deepEqual(dupes, []);
});

// ───────────────────────────── 5. PWA shell files ─────────────────────────────

function pngSize(rel: string): { width: number; height: number } {
  const buf = readFileSync(join(root, rel));
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${rel} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('public/manifest.webmanifest: valid JSON with the fields an installable PWA needs', platform, () => {
  let manifest: Record<string, unknown> = {};
  assert.doesNotThrow(() => {
    manifest = JSON.parse(read('public/manifest.webmanifest')) as Record<string, unknown>;
  }, 'manifest must be valid JSON');
  for (const field of ['name', 'short_name', 'description', 'start_url', 'scope', 'display', 'background_color', 'theme_color', 'icons']) assert.ok(manifest[field] !== undefined && manifest[field] !== '', `manifest.${field} is required`);
  assert.ok(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest['display'] as string), 'display must make the app installable');
  assert.equal(manifest['start_url'], './', 'start_url must be relative so the app can be hosted under any path');
  assert.equal(manifest['scope'], './', 'scope must be relative so the app can be hosted under any path');
  assert.match(manifest['background_color'] as string, /^#[0-9a-f]{6}$/i);
  assert.match(manifest['theme_color'] as string, /^#[0-9a-f]{6}$/i);
  assert.ok((manifest['short_name'] as string).length <= 12, 'short_name must fit under a home-screen icon');
  assert.match(manifest['name'] as string, /Samskuru/);
});

test('public/manifest.webmanifest: icons exist on disk, are relative, and really have the declared size', platform, () => {
  const { icons } = JSON.parse(read('public/manifest.webmanifest')) as { icons: { src: string; sizes: string; type: string; purpose?: string }[] };
  assert.ok(Array.isArray(icons) && icons.length >= 3);
  for (const icon of icons) {
    assert.ok(icon.src.startsWith('./'), `${icon.src}: icon paths must be relative`);
    const rel = `public/${icon.src.slice(2)}`;
    assert.ok(exists(rel), `${rel} is missing`);
    assert.ok(statSync(join(root, rel)).size > 100, `${rel} is empty`);
    if (icon.type === 'image/png') {
      const [w, h] = icon.sizes.split('x').map(Number) as [number, number];
      assert.deepEqual(pngSize(rel), { width: w, height: h }, `${rel} is not ${icon.sizes}`);
    } else {
      assert.equal(icon.type, 'image/svg+xml');
      assert.match(read(rel), /<svg[\s>]/);
    }
  }
  const has = (size: string, purpose: string): boolean => icons.some((i) => i.sizes === size && i.type === 'image/png' && (i.purpose ?? 'any').split(' ').includes(purpose));
  assert.ok(has('192x192', 'any'), 'a 192×192 PNG icon is required for install prompts');
  assert.ok(has('512x512', 'any'), 'a 512×512 PNG icon is required for splash screens');
  assert.ok(has('512x512', 'maskable'), 'a maskable 512×512 icon is required for Android adaptive icons');
});

test('public/index.html: build placeholders, relative asset URLs, manifest link and mobile meta tags', platform, () => {
  const html = read('public/index.html');
  const build = read('tools/build.mjs');
  for (const placeholder of ['<!--CSS-->', '<!--JS-->']) {
    assert.equal(html.split(placeholder).length - 1, 1, `index.html must contain ${placeholder} exactly once`);
    assert.ok(build.includes(`'${placeholder}'`), `tools/build.mjs no longer replaces ${placeholder}`);
  }
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /<meta name="viewport" content="[^"]*width=device-width[^"]*viewport-fit=cover/);
  assert.match(html, /<meta name="theme-color"/);
  assert.match(html, /<meta charset="utf-8"/);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1] as string;
    assert.ok(url.startsWith('./'), `index.html references "${url}" — URLs must be relative (./…) so the build can be hosted anywhere`);
    assert.ok(exists(`public/${url.slice(2)}`), `index.html references ${url}, which is not in public/`);
  }
});

test('public/sw.js: contains each placeholder the build replaces exactly once, and the build still replaces them', platform, () => {
  const sw = read('public/sw.js');
  const build = read('tools/build.mjs');
  for (const placeholder of ['__VERSION__', '"__PRECACHE__"']) {
    assert.equal(sw.split(placeholder).length - 1, 1, `sw.js must contain ${placeholder} exactly once (String.replace only fills the first)`);
    assert.ok(build.includes(`'${placeholder}'`), `tools/build.mjs no longer replaces ${placeholder}`);
  }
  for (const event of ['install', 'activate', 'fetch']) assert.match(sw, new RegExp(`addEventListener\\('${event}'`), `sw.js must handle ${event}`);
  assert.ok(!/https?:\/\//.test(stripComments(sw)), 'the service worker must not hard-code an origin');
  assert.match(read('src/app/main.tsx'), /serviceWorker\.register\('\.\/sw\.js'\)/, 'the app must register ./sw.js (relative)');
});

test('fonts: every font file the stylesheet and index.html reference is shipped, with its licence', platform, () => {
  const css = read('src/ui/tokens.css');
  const fonts = [...css.matchAll(/url\('\.\.\/fonts\/([^']+)'\)/g)].map((m) => m[1] as string);
  assert.ok(fonts.length >= 2, 'tokens.css should declare the Devanagari and śloka fonts');
  for (const f of fonts) assert.ok(exists(`public/fonts/${f}`), `public/fonts/${f} is missing`);
  const shipped = readdirSync(join(root, 'public/fonts'));
  for (const f of shipped.filter((n) => /\.(ttf|woff2?)$/.test(n))) {
    assert.ok(fonts.includes(f), `public/fonts/${f} is shipped but never used`);
    const family = f.replace(/[-.].*$/, '');
    assert.ok(shipped.some((n) => n === `OFL-${family}.txt`), `public/fonts/OFL-${family}.txt (licence for ${f}) is missing`);
  }
  assert.ok(read('tools/build.mjs').includes("'../fonts/*'"), 'the bundler must leave ../fonts/* URLs alone');
});

// ───────────────────────────── 6. design tokens ─────────────────────────────

const HUES = ['saffron', 'maroon', 'indigo', 'teal', 'gold', 'rose', 'leaf', 'plum'];
function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `tokens.css has no ${selector} block`);
  return css.slice(start, css.indexOf('\n}', start));
}
const definedIn = (css: string): Set<string> => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] as string));

test('design tokens: every manifest hue has its accent triple, its .hue-* class, and the validator knows it', platform, () => {
  const css = read('src/ui/tokens.css');
  const light = definedIn(block(css, ':root'));
  const dark = definedIn(block(css, ":root[data-theme='dark']"));
  const m: GameManifest = { id: 'x', version: '1.0.0', title: { sa: 'क', iast: 'ka', en: 'ka' }, tagline: 't', description: 'd'.repeat(20), kind: 'quiz', skills: ['akshara'], levels: [0], modes: ['practice'], minutes: 1, icon: 'क', hue: 'teal', status: 'beta', howToPlay: ['a', 'b'], content: [] };
  for (const hue of HUES) {
    for (const token of [`--${hue}`, `--${hue}-ink`, `--${hue}-soft`]) {
      assert.ok(light.has(token), `${token} is not defined for the light theme`);
      assert.ok(dark.has(token), `${token} is not defined for the dark theme`);
    }
    assert.match(css, new RegExp(`\\.hue-${hue}\\s*\\{\\s*--accent: var\\(--${hue}\\); --accent-ink: var\\(--${hue}-ink\\); --accent-soft: var\\(--${hue}-soft\\);`), `.hue-${hue} must set the accent triple`);
    assert.deepEqual(validateManifest({ ...m, hue: hue as GameManifest['hue'] }), [], `validateManifest rejects hue ${hue}`);
  }
  const classes = [...css.matchAll(/\.hue-([\w-]+)/g)].map((x) => x[1] as string);
  assert.deepEqual(classes.sort(), [...HUES].sort(), 'tokens.css and the Hue type have drifted apart');
  const hueType = /export type Hue =([^;]+);/.exec(read('src/sdk/types.ts'))?.[1] ?? '';
  assert.deepEqual([...hueType.matchAll(/'([a-z]+)'/g)].map((x) => x[1] as string).sort(), [...HUES].sort(), 'the Hue type and this test have drifted apart');
});

test('design tokens: every colour token of the light theme is overridden in the dark theme', platform, () => {
  const css = read('src/ui/tokens.css');
  const lightBlock = block(css, ':root');
  const dark = definedIn(block(css, ":root[data-theme='dark']"));
  const colours = [...lightBlock.matchAll(/(--[\w-]+)\s*:\s*#[0-9a-fA-F]{3,8}\s*;/g)].map((m) => m[1] as string);
  assert.ok(colours.length >= 40, `expected the full palette, found ${colours.length} colour tokens`);
  for (const token of colours) assert.ok(dark.has(token), `${token} has no dark-theme value`);
});

test('design tokens: every var(--token) used by the UI kit, the shell and the reference games is defined', platform, () => {
  const tokens = definedIn(read('src/ui/tokens.css'));
  const sheets = ['src/ui/ui.css', 'src/app/app.css', ...walk('src/games/akshara-paricaya'), ...walk('src/games/smrti-yugala')].filter((f) => f.endsWith('.css'));
  const inline = new Set([...walk('src/ui'), ...walk('src/app')].filter((f) => f.endsWith('.tsx')).flatMap((f) => [...read(f).matchAll(/'(--[\w-]+)'/g)].map((m) => m[1] as string)));
  assert.ok(sheets.length >= 3);
  let uses = 0;
  for (const sheet of sheets) {
    const css = read(sheet);
    const local = definedIn(css);
    for (const m of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
      uses++;
      const name = m[1] as string;
      assert.ok(tokens.has(name) || local.has(name) || inline.has(name), `${sheet} uses var(${name}), which is not a design token (typo?)`);
    }
  }
  assert.ok(uses > 300, `only ${uses} var() uses scanned`);
});

test('design system: components and the shell use no colour that bypasses a token, except white-on-accent and shadows', platform, () => {
  for (const sheet of ['src/ui/ui.css', 'src/app/app.css']) {
    const css = read(sheet).replace(/\/\*[\s\S]*?\*\//g, '');
    const hexes = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
    assert.deepEqual([...new Set(hexes)].filter((h) => h !== '#fff'), [], `${sheet} hard-codes a colour — add a token to tokens.css instead`);
  }
});

test('typography: Sanskrit text never inherits letter-spacing or text-transform from its container (e.g. an uppercase button)', platform, () => {
  const css = read('src/ui/ui.css');
  const rule = /\.sk-sa\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(rule, /letter-spacing:\s*normal/, '.sk-sa must reset letter-spacing: tracking breaks the Devanagari head-line and conjunct shaping');
  assert.match(rule, /text-transform:\s*none/, '.sk-sa must reset text-transform: IAST must not be upper-cased by a button');
  assert.match(rule, /hyphens:\s*none/);
  assert.match(rule, /word-break:\s*keep-all/);
  const inheritsTracking = [...css.matchAll(/(\.sk-[\w-]+)[^{}]*\{[^}]*(?:letter-spacing:\s*0\.0[1-9]|text-transform:\s*uppercase)[^}]*\}/g)].map((m) => m[1]);
  assert.ok(inheritsTracking.includes('.sk-btn'), 'self-test: the button is the known container with tracking + uppercase');
  const deva = /\.sk-sa--deva\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.ok(!/letter-spacing/.test(deva), 'never letter-space Devanagari');
});

// ───────────────────────────── 7. tooling ─────────────────────────────

test('package.json: every script runs a tool that exists; the gate is wired to the documented commands', platform, () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string>; type: string; dependencies: Record<string, string>; engines: { node: string } };
  for (const name of ['dev', 'build', 'preview', 'gen', 'new-game', 'typecheck', 'test', 'test:unit', 'test:contract', 'test:e2e', 'validate', 'check']) assert.ok(pkg.scripts[name], `npm script "${name}" is missing`);
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    const tool = /\btools\/[\w./-]+/.exec(cmd)?.[0];
    assert.ok(tool, `script "${name}" should run a file under tools/`);
    assert.ok(exists(tool), `script "${name}" runs ${tool}, which does not exist`);
  }
  assert.equal(pkg.type, 'module');
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['react', 'react-dom'], 'the runtime is React only — new runtime dependencies need an ADR');
});

test('dev and production bundles of two games build without output-name collisions', platform, async () => {
  // Regression: dev builds used un-hashed chunk names, and every game's lazy chunk is called "Game".
  const { build } = await import('esbuild');
  // @ts-expect-error — plain .mjs build script without types
  const { esbuildOptions } = (await import('../../tools/build.mjs')) as { esbuildOptions: (dev: boolean, only: string[]) => Record<string, unknown> };
  for (const dev of [true, false]) {
    const result = await build({ ...esbuildOptions(dev, ['akshara-paricaya', 'smrti-yugala']), outdir: join(root, '.e2e', 'contract-build'), write: false, logLevel: 'silent' });
    assert.deepEqual(result.errors, [], `${dev ? 'dev' : 'production'} build failed`);
    const outputs = result.outputFiles.map((f) => posix(relative(join(root, '.e2e', 'contract-build'), f.path)));
    assert.equal(new Set(outputs).size, outputs.length);
    assert.equal(outputs.filter((o) => /^chunks\/Game-[A-Z0-9]+\.js$/.test(o)).length, 2, `expected one lazy chunk per game, got ${outputs.join(', ')}`);
    assert.ok(outputs.some((o) => (dev ? o === 'app.js' : /^app-[A-Z0-9]+\.js$/.test(o))), `entry bundle missing from ${outputs.join(', ')}`);
    assert.ok(outputs.some((o) => (dev ? o === 'app.css' : /^app-[A-Z0-9]+\.css$/.test(o))), `stylesheet missing from ${outputs.join(', ')}`);
    if (!dev) {
      // Performance budget (docs/ARCHITECTURE.md): what every visitor downloads before the first paint.
      const size = (re: RegExp): number => result.outputFiles.filter((f) => re.test(posix(relative(join(root, '.e2e', 'contract-build'), f.path)))).reduce((n, f) => n + f.contents.length, 0);
      assert.ok(size(/^app-[A-Z0-9]+\.js$/) < 300_000, `entry JS is ${size(/^app-[A-Z0-9]+\.js$/)} bytes (budget 300 kB minified)`);
      assert.ok(size(/^app-[A-Z0-9]+\.css$/) < 60_000, `CSS is ${size(/^app-[A-Z0-9]+\.css$/)} bytes (budget 60 kB)`);
      for (const f of result.outputFiles.filter((x) => /chunks[\\/]Game-/.test(x.path))) assert.ok(f.contents.length < 30_000, `${f.path} is ${f.contents.length} bytes (budget 30 kB per game chunk)`);
    }
  }
});

test('.gitignore: generated and build output is never committed', platform, () => {
  const ignored = read('.gitignore').split('\n').map((l) => l.trim());
  for (const entry of ['node_modules/', 'dist/', '.dev/', '.e2e/', '.shots/', 'src/app/registry.gen.ts', 'src/app/styles.gen.css']) assert.ok(ignored.includes(entry), `.gitignore must list ${entry}`);
});

test('generated registry: header marks it as generated and it lists exactly the game folders on disk', platform, () => {
  const folders = (base: string): string[] =>
    existsSync(join(root, base))
      ? readdirSync(join(root, base)).filter((n) => !n.startsWith('_') && !n.startsWith('.') && statSync(join(root, base, n)).isDirectory() && exists(`${base}/${n}/manifest.ts`) && exists(`${base}/${n}/Game.tsx`))
      : [];
  const expected = [...folders('src/games'), ...folders('labs')].sort();
  if (!exists('src/app/registry.gen.ts')) return; // not generated yet on a fresh clone; every tool regenerates it
  const reg = read('src/app/registry.gen.ts');
  assert.match(reg, /^\/\/ GENERATED by tools\/gen-registry\.mjs — do not edit\./);
  const listed = [...reg.matchAll(/load: \(\) => import\('[^']*\/([^/']+)\/Game'\)/g)].map((m) => m[1] as string).sort();
  assert.deepEqual(listed, expected, 'src/app/registry.gen.ts is stale — run `npm run gen`');
});

// ───────────────────────────── 8. documentation ─────────────────────────────

const REQUIRED_DOCS = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  '.github/pull_request_template.md',
  '.github/workflows/ci.yml',
  'docs/ARCHITECTURE.md',
  'docs/DESIGN_SYSTEM.md',
  'docs/GAME_CONTRACT.md',
  'docs/ROADMAP.md',
  'docs/SANSKRIT_ACCURACY.md',
  'docs/TESTING.md',
  'docs/prd/TEMPLATE.md',
  'docs/adr/0001-react-typescript-esbuild.md',
  'docs/adr/0002-game-as-self-contained-folder-with-generated-registry.md',
  'docs/adr/0003-pure-logic-and-seeded-randomness.md',
  'docs/adr/0004-verified-content-packs-and-closed-world-sanskrit.md',
  'docs/adr/0005-shell-owned-session-chrome-and-result-flow.md',
  'docs/adr/0006-local-first-progress-no-backend-in-v1.md',
  'docs/adr/0007-node-test-plus-playwright-no-test-framework-dependency.md',
];
const mdIn = (dir: string): string[] => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((n) => n.endsWith('.md')).map((n) => `${dir}/${n}`) : []);
/** Contributor-facing docs whose links, commands and quotes are verified. (Research notes and the PRD backlog are working papers and are not.) */
const checkedDocs = (): string[] => [...new Set([...REQUIRED_DOCS.filter((d) => d.endsWith('.md')), 'labs/README.md', ...mdIn('docs'), ...mdIn('docs/adr')])].filter(exists);
/** Markdown with fenced blocks and inline code removed (so examples are not mistaken for links). */
const prose = (md: string): string => md.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '').replace(/`[^`\n]*`/g, '');
const codeSpans = (md: string): string[] => [...md.matchAll(/`([^`\n]+)`/g)].map((m) => m[1] as string);
const fenced = (md: string): string[] => [...md.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map((m) => m[1] as string);
/** GitHub's heading → anchor rule. */
const slug = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '')
    .replace(/ /g, '-');
const anchorsOf = (md: string): Set<string> => new Set([...md.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '').matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)].map((m) => slug((m[1] as string).replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'))));

test('docs: the contributor documentation set exists', platform, () => {
  for (const doc of REQUIRED_DOCS) {
    assert.ok(exists(doc), `${doc} is missing`);
    assert.ok(read(doc).trim().length > 200, `${doc} is a stub`);
  }
});

test('docs: every relative markdown link points to a file (and heading) that exists', platform, () => {
  const docs = checkedDocs();
  assert.ok(docs.length >= 6, 'expected AGENTS.md and docs/*.md to be checked');
  const broken: string[] = [];
  let links = 0;
  for (const doc of docs) {
    const md = read(doc);
    for (const m of prose(md).matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      const target = m[1] as string;
      if (/^(https?:|mailto:)/.test(target)) continue;
      links++;
      const [file = '', fragment] = target.split('#') as [string, string | undefined];
      const rel = file === '' ? doc : posix(relative(root, resolve(join(root, dirname(doc)), decodeURIComponent(file))));
      if (rel.startsWith('..') || !exists(rel)) {
        broken.push(`${doc}: link to "${target}" — ${rel} does not exist`);
        continue;
      }
      if (fragment && rel.endsWith('.md') && !anchorsOf(read(rel)).has(decodeURIComponent(fragment).toLowerCase())) broken.push(`${doc}: link to "${target}" — no heading "#${fragment}" in ${rel}`);
    }
  }
  assert.ok(links >= 20, `only ${links} relative links found — is the scanner broken?`);
  assert.deepEqual(broken, [], `\n${broken.join('\n')}\n`);
});

test('docs: link checker self-test (it must catch a dead file, a dead anchor, and skip code)', () => {
  const md = '# Title\n\n## Sanskrit rules (v2)\n\nSee [a](docs/GAME_CONTRACT.md) and `[not a link](nowhere.md)`.\n\n```md\n[also not](nowhere-else.md)\n```\n';
  assert.deepEqual([...prose(md).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]), ['docs/GAME_CONTRACT.md']);
  assert.deepEqual([...anchorsOf(md)], ['title', 'sanskrit-rules-v2']);
  assert.equal(slug('7. Recipes'), '7-recipes');
  assert.equal(slug('What a game folder contains (all required)'), 'what-a-game-folder-contains-all-required');
  assert.equal(slug('State & persistence'), 'state--persistence');
  assert.equal(slug('`ctx.expose` — test hooks'), 'ctxexpose--test-hooks');
});

test('docs: every `npm run <script>` mentioned in the docs exists in package.json', platform, () => {
  const scripts = Object.keys((JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts);
  let mentions = 0;
  for (const doc of [...checkedDocs(), '.github/workflows/ci.yml'].filter(exists)) {
    for (const m of read(doc).matchAll(/npm run ([a-z][\w:-]*)/g)) {
      mentions++;
      assert.ok(scripts.includes(m[1] as string), `${doc} mentions \`npm run ${m[1]}\`, which is not a script in package.json`);
    }
  }
  assert.ok(mentions >= 10);
});

test('docs: every tools/… file and every flag of the documented commands exists', platform, () => {
  const flagsOf = (tool: string): string[] => [...read(tool).matchAll(/['"`](--[a-z][\w-]*)/g)].map((m) => m[1] as string);
  const known: Record<string, string[]> = {
    'new-game': flagsOf('tools/new-game.mjs'),
    check: [...flagsOf('tools/check.mjs'), '--'],
    'tools/screenshot.mjs': [...flagsOf('tools/screenshot.mjs'), '--desktop', '--dark', '--full', '--click', '--wait', '--game'],
    'tools/build.mjs': flagsOf('tools/build.mjs'),
    'tools/typecheck.mjs': flagsOf('tools/typecheck.mjs'),
  };
  assert.ok(known['new-game']!.includes('--labs') && known['new-game']!.includes('--custom'));
  for (const doc of checkedDocs()) {
    const md = read(doc);
    for (const m of md.matchAll(/\btools\/[\w-]+\.(?:mjs|ts)\b/g)) {
      assert.ok(exists(m[0]), `${doc} mentions ${m[0]}, which does not exist`);
    }
    const commands = [...codeSpans(md), ...fenced(md).flatMap((b) => b.split('\n'))];
    for (const line of commands) {
      const cmd = /npm run (new-game|check)\b(.*)$/.exec(line) ?? /node (tools\/(?:screenshot|build|typecheck)\.mjs)\b(.*)$/.exec(line);
      if (!cmd) continue;
      const allowed = known[cmd[1] as string] as string[];
      for (const f of (cmd[2] as string).replace(/#.*$/, '').matchAll(/(?:^|[\s[])(--[a-z][\w-]*)/g)) {
        assert.ok(allowed.includes(f[1] as string), `${doc}: \`${line.trim()}\` uses ${f[1]}, which ${cmd[1]} does not support`);
      }
    }
  }
});

test('docs: every concrete repo path written in backticks exists', platform, () => {
  /** Paths the docs deliberately name before they exist. Keep this list short and explained. */
  const PLANNED = new Set<string>([]);
  const looksConcrete = (s: string): boolean => /^(src|tools|tests|docs|public|labs|\.github)\/[\w@./-]*\w$/.test(s) && !/\.\.\./.test(s);
  const missing: string[] = [];
  let checked = 0;
  for (const doc of checkedDocs()) {
    for (const span of codeSpans(read(doc))) {
      if (!looksConcrete(span) || PLANNED.has(span)) continue;
      // names under a not-yet-contributed content pack or game are examples, not promises
      if (/^src\/(content|games)\//.test(span) && !exists(span.split('/').slice(0, 3).join('/'))) continue;
      checked++;
      if (!exists(span)) missing.push(`${doc}: \`${span}\``);
    }
  }
  assert.ok(checked >= 40, `only ${checked} paths checked`);
  assert.deepEqual(missing, [], `\n${missing.join('\n')}\n`);
});

/** Fenced blocks of a markdown file with their language tag. */
const blocks = (md: string): { lang: string; code: string }[] => [...md.matchAll(/^```(\w*)[^\n]*\n([\s\S]*?)^```/gm)].map((m) => ({ lang: m[1] as string, code: m[2] as string }));
const meaningful = (code: string): string[] => code.split('\n').map((l) => l.trim()).filter((l) => l !== '');
/** True when `needle` lines occur in `haystack` lines in the same order (each as a whole trimmed line). */
function inOrder(needle: readonly string[], haystack: readonly string[]): string | null {
  let at = 0;
  for (const line of needle) {
    const found = haystack.indexOf(line, at);
    if (found < 0) return line;
    at = found + 1;
  }
  return null;
}

test('docs: every tsx example in DESIGN_SYSTEM.md is compiled code from tests/docs/design-system.examples.tsx', platform, () => {
  const source = read('tests/docs/design-system.examples.tsx');
  const sourceLines = meaningful(source);
  const examples = blocks(read('docs/DESIGN_SYSTEM.md')).filter((b) => b.lang === 'tsx');
  assert.ok(examples.length >= 15, `expected an example per component and hook, found ${examples.length}`);
  for (const ex of examples) {
    const lines = meaningful(ex.code);
    const contiguous = sourceLines.some((l, i) => l === lines[0] && sourceLines.slice(i, i + lines.length).join('\n') === lines.join('\n'));
    if (!contiguous) {
      const missing = inOrder(lines, sourceLines);
      assert.fail(`docs/DESIGN_SYSTEM.md has an example that is not in tests/docs/design-system.examples.tsx${missing ? ` — first line not found: ${missing}` : ' as one contiguous block'}:\n${ex.code}`);
    }
  }
  // every exported component and hook of the UI kit is demonstrated
  for (const name of ['Button', 'IconButton', 'Choice', 'Tile', 'Chip', 'ProgressBar', 'Hearts', 'Pill', 'Card', 'Sheet', 'FeedbackBar', 'SaText', 'renderSa', 'AksharaKeyboard', 'QuizRunner', 'useSwipe', 'useKeydown', 'useCountdown', 'useInterval', 'useRafLoop', 'useLatest', 'useOnce', 'useSettings', 'cx']) {
    assert.ok(examples.some((ex) => new RegExp(`(<|\\b)${name}\\b`).test(ex.code)), `docs/DESIGN_SYSTEM.md has no compiled example using ${name}`);
    assert.match(read('src/ui/index.ts') + ['context', 'SaText', 'primitives', 'AksharaKeyboard', 'QuizRunner', 'hooks'].map((f) => read(exists(`src/ui/${f}.tsx`) ? `src/ui/${f}.tsx` : `src/ui/${f}.ts`)).join('\n'), new RegExp(`export (?:function|const|\\{[^}]*\\b)\\s*${name}\\b|export \\{ ${name} \\}`), `${name} is documented but not exported by src/ui`);
  }
});

test('docs: every prop documented for a component in DESIGN_SYSTEM.md exists in its source, and no prop is left out', platform, () => {
  const doc = read('docs/DESIGN_SYSTEM.md');
  const section = (title: string): string => {
    const start = doc.indexOf(`\n### ${title}\n`);
    assert.ok(start >= 0, `DESIGN_SYSTEM.md has no "### ${title}" section`);
    const end = doc.indexOf('\n### ', start + 5);
    const end2 = doc.indexOf('\n## ', start + 5);
    return doc.slice(start, Math.min(end < 0 ? doc.length : end, end2 < 0 ? doc.length : end2));
  };
  const documented = (title: string): Set<string> => new Set([...section(title).matchAll(/^\| ((?:`[\w-]+`(?:, )?)+) \|/gm)].flatMap((m) => [...(m[1] as string).matchAll(/`([\w-]+)`/g)].map((x) => x[1] as string)));
  const declared = (file: string, iface: string): Set<string> => {
    const body = new RegExp(`export interface ${iface}[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(read(file))?.[1];
    assert.ok(body, `${iface} not found in ${file}`);
    return new Set([...body.matchAll(/^\s*'?([\w-]+)'?\??:/gm)].map((m) => m[1] as string));
  };
  const cases: [string, string, string][] = [
    ['Button', 'src/ui/primitives.tsx', 'ButtonProps'],
    ['IconButton', 'src/ui/primitives.tsx', 'IconButtonProps'],
    ['Choice', 'src/ui/primitives.tsx', 'ChoiceProps'],
    ['Tile', 'src/ui/primitives.tsx', 'TileProps'],
    ['Chip', 'src/ui/primitives.tsx', 'ChipProps'],
    ['Sheet', 'src/ui/primitives.tsx', 'SheetProps'],
    ['FeedbackBar', 'src/ui/primitives.tsx', 'FeedbackBarProps'],
    ['SaText and renderSa', 'src/ui/SaText.tsx', 'SaTextProps'],
    ['AksharaKeyboard', 'src/ui/AksharaKeyboard.tsx', 'AksharaKeyboardProps'],
    ['QuizRunner', 'src/ui/QuizRunner.tsx', 'QuizRunnerProps'],
  ];
  for (const [title, file, iface] of cases) {
    const inDoc = documented(title);
    const inCode = declared(file, iface);
    if (iface === 'IconButtonProps') inCode.add('children'); // inherited from the native button, documented because it is the glyph
    assert.ok(inDoc.size >= 2, `no props table found for ${title}`);
    assert.deepEqual([...inDoc].sort(), [...inCode].sort(), `props documented for ${title} differ from ${iface} in ${file}`);
  }
});

test('docs: code blocks that start with a repo path are quoted from that file, in order', platform, () => {
  let quoted = 0;
  for (const doc of checkedDocs()) {
    for (const b of blocks(read(doc))) {
      const lines = meaningful(b.code);
      const path = /^(?:\/\/|\/\*)\s*((?:src|tests|tools|public)\/[\w@./-]+\.\w+)\s*(?:\*\/)?$/.exec(lines[0] ?? '')?.[1];
      if (!path) continue;
      quoted++;
      assert.ok(exists(path), `${doc}: a code block claims to quote ${path}, which does not exist`);
      const body = lines.slice(1);
      assert.ok(body.length >= 2, `${doc}: the quote from ${path} is empty`);
      const missing = inOrder(body, meaningful(read(path)));
      assert.equal(missing, null, `${doc}: this line is quoted from ${path} but is not in it (or is out of order):\n  ${missing}`);
    }
  }
  assert.ok(quoted >= 10, `only ${quoted} quoted blocks found — docs should show real code`);
});

test('docs: every ADR has Context / Decision / Consequences / Alternatives considered, a status, and a unique number', platform, () => {
  const adrs = mdIn('docs/adr');
  assert.ok(adrs.length >= 7);
  const numbers = adrs.map((a) => /\/(\d{4})-[a-z0-9-]+\.md$/.exec(a)?.[1]);
  assert.ok(numbers.every(Boolean), 'ADR files are named NNNN-kebab-title.md');
  assert.equal(new Set(numbers).size, numbers.length, 'two ADRs share a number');
  for (const adr of adrs) {
    const md = read(adr);
    assert.match(md, /^# ADR \d{4}: .+/m, `${adr}: title must be "# ADR NNNN: …"`);
    assert.match(md, /^\*\*Status:\*\* (Accepted|Proposed|Superseded by .+)/m, `${adr}: missing status line`);
    for (const h of ['## Context', '## Decision', '## Consequences', '## Alternatives considered']) assert.ok(md.includes(`\n${h}\n`), `${adr} is missing "${h}"`);
  }
});

test('docs: README keeps the marker the games table is generated into; the PR template keeps agent and human boxes apart', platform, () => {
  assert.equal(read('README.md').split('<!-- GAMES-TABLE -->').length - 1, 1, 'README.md must contain <!-- GAMES-TABLE --> exactly once');
  const pr = read('.github/pull_request_template.md');
  const author = pr.indexOf('## Author');
  const human = pr.indexOf('## Human reviewers only');
  assert.ok(author >= 0 && human > author, 'the PR template needs "## Author …" followed by "## Human reviewers only"');
  assert.match(pr.slice(human), /Sanskrit review/);
  assert.match(pr.slice(human), /Code review/);
  assert.ok(!/\[x\]/i.test(pr), 'the template must ship with every box unticked');
  assert.match(pr, /npm run check -- --e2e/);
});

test('CI workflow runs the same gate contributors run locally', platform, () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /node-version:\s*['"]?22/);
  assert.match(ci, /npm ci/);
  assert.match(ci, /npx playwright install --with-deps chromium/);
  assert.match(ci, /npm run check -- --e2e/);
  assert.ok(ci.indexOf('npm ci') < ci.indexOf('playwright install') && ci.indexOf('playwright install') < ci.indexOf('npm run check'), 'install → browsers → gate, in that order');
});
