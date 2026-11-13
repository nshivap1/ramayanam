import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectNoOverflow, gameSuite } from '../../../tests/e2e/harness';

interface Snap {
  phase: string;
  cards: { index: number; key: string }[];
  matched: string[];
  moves: number;
}

gameSuite('smrti-yugala', ({ open }) => {
  test('a perfect memory clears the board in 8 moves for 3 stars', async () => {
    const g = await open({ mode: 'practice', seed: 21 });
    await g.waitForState("s => s.phase === 'playing'");
    const { cards } = await g.state<Snap>();
    assert.equal(cards.length, 16);
    const done = new Set<string>();
    for (const c of cards) {
      if (done.has(c.key)) continue;
      done.add(c.key);
      const partner = cards.find((x) => x.key === c.key && x.index !== c.index)!;
      await g.tap(`card-${c.index}`);
      await g.tap(`card-${partner.index}`);
    }
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'won');
    assert.equal(rec.stars, 3);
    assert.equal(rec.result.score, 160);
    assert.match(rec.result.share ?? '', /8 moves/);
    await expectNoOverflow(g);
    g.expectClean();
    await g.close();
  });

  test('a mismatch shows both cards, turns them back, and blocks input meanwhile', async () => {
    const g = await open({ mode: 'practice', seed: 21 });
    await g.waitForState("s => s.phase === 'playing'");
    const { cards } = await g.state<Snap>();
    const a = cards[0]!;
    const other = cards.find((x) => x.key !== a.key)!;
    await g.tap(`card-${a.index}`);
    await g.tap(`card-${other.index}`);
    await g.waitForState("s => s.phase === 'pending'");
    assert.equal(await g.page.locator(`[data-testid="card-${a.index}"]`).getAttribute('data-up'), 'true');
    const third = cards.find((x) => x.index !== a.index && x.index !== other.index)!;
    await g.tap(`card-${third.index}`);
    assert.equal(await g.page.locator(`[data-testid="card-${third.index}"]`).getAttribute('data-up'), 'false', 'input ignored while pending');
    await g.waitForState("s => s.phase === 'playing'");
    assert.equal(await g.page.locator(`[data-testid="card-${a.index}"]`).getAttribute('data-up'), 'false');
    assert.equal((await g.state<Snap>()).moves, 1);
    g.expectClean();
    await g.close();
  });

  test('daily mode deals the same board to everyone today and records the daily', async () => {
    const g1 = await open({ mode: 'daily' });
    await g1.waitForState("s => s.phase === 'playing'");
    const b1 = (await g1.state<Snap>()).cards.map((c) => c.key).join(',');
    await g1.close();
    const g2 = await open({ mode: 'daily' });
    await g2.waitForState("s => s.phase === 'playing'");
    const b2 = (await g2.state<Snap>()).cards.map((c) => c.key).join(',');
    assert.equal(b1, b2);
    g2.expectClean();
    await g2.close();
  });
});
