/** Share-card text for daily puzzles (Wordle-style). */
import type { GameManifest, SessionResult } from './types';
import { puzzleNumber } from './rng';

export const APP_URL = 'https://samskuru.vercel.app';

export function shareText(manifest: Pick<GameManifest, 'title' | 'id'>, result: Pick<SessionResult, 'share' | 'summary' | 'score'>, dateKey: string, daily: boolean, streak: number): string {
  const lines: string[] = [];
  const head = daily ? `${manifest.title.sa} #${puzzleNumber(dateKey)}` : manifest.title.sa;
  lines.push(result.summary ? `${head} · ${result.summary}` : `${head} · ${result.score}`);
  if (result.share) lines.push(result.share.trim());
  if (streak > 1) lines.push(`🔥 ${streak}`);
  lines.push(`${APP_URL}/#/play/${manifest.id}`);
  return lines.join('\n');
}

/** Uses the Web Share API when present, else clipboard. Resolves to how it was delivered. */
export async function share(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav && typeof nav.share === 'function') {
      await nav.share({ text });
      return 'shared';
    }
    if (nav?.clipboard) {
      await nav.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    /* user cancelled or permission denied */
  }
  return 'failed';
}
