import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectNoOverflow, suite } from './harness';

suite('e2e: shell', (h) => {
  test('learn, games and profile screens render without overflow or errors (phone + desktop)', async () => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 1280, height: 800 }]) {
      for (const route of ['#/learn', '#/games', '#/profile']) {
        const s = await h.openRoute(route, viewport);
        await s.page.waitForSelector(`[data-testid="screen-${route.slice(2)}"]`);
        await expectNoOverflow(s);
        s.expectClean();
        await s.close();
      }
    }
  });

  test('every registered game has a card that opens the game host', async () => {
    const s = await h.openRoute('#/games');
    const ids = await s.page.locator('[data-testid^="card-"]').evaluateAll((els) => els.map((e) => (e.getAttribute('data-testid') ?? '').slice(5)));
    assert.ok(ids.length >= 2, 'catalogue lists games');
    assert.equal(new Set(ids).size, ids.length);
    await s.tap(`card-${ids[0]}`);
    await s.page.waitForSelector(`[data-testid="game-host"][data-game="${ids[0]}"]`);
    // first launch shows how-to-play
    await s.page.waitForSelector('[data-testid="help-sheet"]');
    await s.tap('help-start');
    await s.tap('game-close');
    await s.tap('confirm-exit');
    await s.page.waitForSelector('[data-testid="screen-games"]');
    s.expectClean();
    await s.close();
  });

  test('script setting switches Sanskrit between Devanagari and IAST everywhere and persists', async () => {
    const s = await h.openRoute('#/profile');
    await s.tap('script-iast');
    assert.equal(await s.page.locator('[data-testid="app"]').getAttribute('data-script'), 'iast');
    await s.tap('tab-games');
    const firstTitle = await s.page.locator('.app-card__title').first().innerText();
    assert.ok(!/[ऀ-ॿ]/.test(firstTitle), `expected IAST title, got ${firstTitle}`);
    await s.page.reload();
    await s.page.waitForSelector('[data-testid="app"][data-script="iast"]');
    await s.tap('tab-profile');
    await s.tap('script-deva');
    await s.tap('tab-games');
    assert.ok(/[ऀ-ॿ]/.test(await s.page.locator('.app-card__title').first().innerText()));
    s.expectClean();
    await s.close();
  });

  test('finishing a game awards XP and a streak that show on the home screen and survive reload', async () => {
    const s = await h.openRoute('#/play/smrti-yugala?e2e=1&seed=3&mode=practice');
    await s.waitForState("s => s.phase === 'playing'");
    const { cards } = await s.state<{ cards: { index: number; key: string }[] }>();
    const seen = new Set<string>();
    for (const c of cards) {
      if (seen.has(c.key)) continue;
      seen.add(c.key);
      await s.tap(`card-${c.index}`);
      await s.tap(`card-${cards.find((x) => x.key === c.key && x.index !== c.index)!.index}`);
    }
    const rec = await s.expectResult();
    await s.tap('result-exit');
    await s.tap('tab-learn');
    assert.equal(await s.page.locator('[data-testid="stat-xp"] b').innerText(), String(rec.xp));
    assert.equal(await s.page.locator('[data-testid="stat-streak"] b').innerText(), '1');
    await s.page.reload();
    await s.page.waitForSelector('[data-testid="screen-learn"]');
    assert.equal(await s.page.locator('[data-testid="stat-xp"] b').innerText(), String(rec.xp));
    s.expectClean();
    await s.close();
  });

  test('first run shows the welcome screen; chosen level and script are applied and it never shows again', async () => {
    const s = await h.openRoute('#/learn', { width: 390, height: 844 }, true);
    await expectNoOverflow(s);
    await s.tap('onboard-level-0');
    await s.tap('onboard-iast');
    await s.tap('onboard-start');
    await s.page.waitForSelector('[data-testid="screen-learn"]');
    assert.equal(await s.page.locator('[data-testid="app"]').getAttribute('data-script'), 'iast');
    assert.equal(await s.page.locator('[data-testid="level-0"]').getAttribute('aria-selected'), 'true');
    await s.page.reload();
    await s.page.waitForSelector('[data-testid="screen-learn"]');
    assert.equal(await s.page.locator('[data-testid="onboarding"]').count(), 0);
    s.expectClean();
    await s.close();
  });

  test('unknown game id shows a friendly not-found screen', async () => {
    const s = await h.openRoute('#/play/no-such-game');
    await s.page.waitForSelector('[data-testid="not-found"]');
    s.expectClean();
    await s.close();
  });

  test('PWA: manifest, icons and service worker are served; app shell works offline after first load', async () => {
    const s = await h.openRoute('#/learn');
    const manifest = await s.page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
    assert.equal(manifest.display, 'standalone');
    for (const icon of manifest.icons) assert.equal(await s.page.evaluate(async (src: string) => (await fetch(src)).status, icon.src), 200);
    await s.page.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise<void>((ok) => navigator.serviceWorker.addEventListener('controllerchange', () => ok(), { once: true }));
      return reg.scope;
    });
    await s.page.context().setOffline(true);
    await s.page.reload();
    await s.page.waitForSelector('[data-testid="screen-learn"]');
    await s.page.evaluate(() => (window.location.hash = '#/play/smrti-yugala?e2e=1&mode=practice&seed=1'));
    await s.waitForState("s => s.phase === 'playing'");
    await s.page.context().setOffline(false);
    await s.close();
  });
});
