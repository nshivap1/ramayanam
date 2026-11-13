import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { puzzleNumber } from './rng';
import { APP_URL, share, shareText } from './share';

const M = { id: 'pada-shodha', title: { sa: 'पदशोधः', iast: 'Pada-śodhaḥ', en: 'Word hunt' } };
const DAY = '2026-11-10';

// ───────────────────────────── shareText ─────────────────────────────

test('shareText (daily): title + puzzle number · summary / grid / streak / link', () => {
  const text = shareText(M, { share: '🟩🟨⬛\n🟩🟩🟩', summary: '2/6', score: 40 }, DAY, true, 12);
  assert.equal(text, ['पदशोधः #314 · 2/6', '🟩🟨⬛\n🟩🟩🟩', '🔥 12', 'https://samskuru.vercel.app/#/play/pada-shodha'].join('\n'));
  assert.equal(puzzleNumber(DAY), 314);
});

test('shareText: the puzzle number is the day number since the epoch and only appears for dailies', () => {
  assert.match(shareText(M, { score: 1 }, '2026-01-01', true, 0), /^पदशोधः #1 · 1\n/);
  assert.match(shareText(M, { score: 1 }, '2027-01-01', true, 0), /^पदशोधः #366 · 1\n/);
  const practice = shareText(M, { score: 1, summary: 'done' }, DAY, false, 0);
  assert.ok(!practice.includes('#3'), practice);
  assert.match(practice, /^पदशोधः · done\n/);
});

test('shareText: without a summary the score is shown — including a score of 0', () => {
  assert.equal(shareText(M, { score: 120 }, DAY, false, 0).split('\n')[0], 'पदशोधः · 120');
  assert.equal(shareText(M, { score: 0 }, DAY, false, 0).split('\n')[0], 'पदशोधः · 0');
  assert.equal(shareText(M, { score: 7, summary: '' }, DAY, false, 0).split('\n')[0], 'पदशोधः · 7', 'an empty summary falls back to the score');
});

test('shareText: the grid is optional and trimmed', () => {
  const none = shareText(M, { score: 5 }, DAY, false, 0);
  assert.deepEqual(none.split('\n'), ['पदशोधः · 5', `${APP_URL}/#/play/pada-shodha`]);
  const padded = shareText(M, { score: 5, share: '\n\n  🟪🟪  \n' }, DAY, false, 0);
  assert.deepEqual(padded.split('\n'), ['पदशोधः · 5', '🟪🟪', `${APP_URL}/#/play/pada-shodha`]);
});

test('shareText: the streak line needs a streak of at least 2', () => {
  for (const [streak, shown] of [[0, false], [1, false], [2, true], [108, true]] as const) {
    const text = shareText(M, { score: 5 }, DAY, true, streak);
    assert.equal(text.includes('🔥'), shown, `streak ${streak}`);
    if (shown) assert.ok(text.includes(`🔥 ${streak}`));
  }
});

test('shareText: always ends with a deep link to the game, and never leaks answers it was not given', () => {
  const text = shareText(M, { score: 5, share: '🟩', summary: 'x' }, DAY, true, 3);
  const lines = text.split('\n');
  assert.equal(lines[lines.length - 1], 'https://samskuru.vercel.app/#/play/pada-shodha');
  assert.equal(APP_URL, 'https://samskuru.vercel.app');
  assert.ok(!APP_URL.endsWith('/'));
  assert.ok(!text.includes('Pada-śodhaḥ') && !text.includes('Word hunt'), 'the Devanagari title is the brand');
  assert.equal(lines.length, 4);
});

// ───────────────────────────── share ─────────────────────────────

const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
function stubNavigator(value: unknown): void {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value });
}
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'navigator', original);
  else delete (globalThis as { navigator?: unknown }).navigator;
});

test('share: uses the Web Share API when available', async () => {
  const calls: unknown[] = [];
  let clipboard = 0;
  stubNavigator({
    share: async (data: unknown) => void calls.push(data),
    clipboard: { writeText: async () => void clipboard++ },
  });
  assert.equal(await share('पदशोधः #314'), 'shared');
  assert.deepEqual(calls, [{ text: 'पदशोधः #314' }]);
  assert.equal(clipboard, 0, 'no clipboard write when the share sheet worked');
});

test('share: falls back to the clipboard when there is no share sheet', async () => {
  const written: string[] = [];
  stubNavigator({ clipboard: { writeText: async (t: string) => void written.push(t) } });
  assert.equal(await share('🟩🟨'), 'copied');
  assert.deepEqual(written, ['🟩🟨']);
});

test('share: a cancelled share sheet reports "failed" and does not silently copy instead', async () => {
  let clipboard = 0;
  stubNavigator({
    share: async () => {
      throw new DOMException('Share canceled', 'AbortError');
    },
    clipboard: { writeText: async () => void clipboard++ },
  });
  assert.equal(await share('x'), 'failed');
  assert.equal(clipboard, 0);
});

test('share: clipboard permission denied → "failed", never a rejection', async () => {
  stubNavigator({
    clipboard: {
      writeText: async () => {
        throw new DOMException('denied', 'NotAllowedError');
      },
    },
  });
  assert.equal(await share('x'), 'failed');
});

test('share: no navigator, or a navigator with neither API → "failed"', async () => {
  stubNavigator(undefined);
  assert.equal(await share('x'), 'failed');
  stubNavigator({});
  assert.equal(await share('x'), 'failed');
  stubNavigator({ share: 'not a function' });
  assert.equal(await share('x'), 'failed');
});

test('share: synchronous throws from a broken implementation are contained too', async () => {
  stubNavigator({
    share: () => {
      throw new TypeError('boom');
    },
  });
  await assert.doesNotReject(share('x'));
  assert.equal(await share('x'), 'failed');
});
