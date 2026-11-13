import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectNoOverflow, gameSuite, playQuiz } from '../../../tests/e2e/harness';

gameSuite('akshara-paricaya', ({ open }) => {
  test('perfect run through the vowel stage ends with 3 stars and unlocks the next stage', async () => {
    const g = await open({ seed: 11 });
    await g.page.waitForSelector('[data-testid="stage-menu"]');
    assert.equal(await g.page.locator('[data-testid="stage-1"]').isDisabled(), true, 'stage 2 starts locked');
    await g.tap('stage-0');
    const answered = await playQuiz(g);
    assert.equal(answered, 12);
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'completed');
    assert.equal(rec.stars, 3);
    assert.equal(rec.result.correct, 12);
    await expectNoOverflow(g);
    await g.tap('result-again');
    await g.page.waitForSelector('[data-testid="stage-menu"]');
    assert.equal(await g.page.locator('[data-testid="stage-1"]').isDisabled(), false, 'stage 2 unlocked after 3 stars');
    g.expectClean();
    await g.close();
  });

  test('mistakes show corrective feedback, cost hearts, and wrong items are retried', async () => {
    const g = await open({ seed: 5 });
    await g.tap('stage-0');
    const answered = await playQuiz(g, { wrongEvery: 6 });
    assert.ok(answered > 12, 'wrong answers are re-asked at the end');
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'completed');
    assert.ok((rec.result.correct ?? 0) < 12);
    g.expectClean();
    await g.close();
  });

  test('three mistakes lose the lesson', async () => {
    const g = await open({ seed: 5 });
    await g.tap('stage-0');
    await playQuiz(g, { wrongEvery: 1 });
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'lost');
    g.expectClean();
    await g.close();
  });

  test('prompts stay in Devanagari even when the app script is IAST; desktop layout has no overflow', async () => {
    const g = await open({ seed: 3, script: 'iast', viewport: { width: 1280, height: 800 } });
    await g.tap('stage-0');
    await g.waitForState("s => s.phase === 'asking' && s.kind === 'choice'");
    const prompt = await g.page.locator('[data-testid="prompt"]').innerText();
    const options = await g.page.locator('[data-testid^="choice-"]').allInnerTexts();
    const hasDeva = (s: string): boolean => /[ऀ-ॿ]/.test(s);
    assert.ok(hasDeva(prompt) !== options.some(hasDeva), 'exactly one side (prompt or options) is Devanagari');
    await expectNoOverflow(g);
    g.expectClean();
    await g.close();
  });
});
