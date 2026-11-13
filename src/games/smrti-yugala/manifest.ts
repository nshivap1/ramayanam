import type { GameManifest } from '@sdk';

export const manifest: GameManifest = {
  id: 'smrti-yugala',
  version: '1.0.0',
  title: { sa: 'स्मृतियुगलम्', iast: 'Smṛti-yugalam', en: 'Memory pairs' },
  tagline: 'Flip the cards, find each akṣara and its sound',
  description: 'The classic memory game with Devanagari: every akṣara card has a partner showing its sound. Remember where they are and clear the board in as few moves as you can.',
  kind: 'puzzle',
  skills: ['akshara'],
  levels: [0],
  modes: ['practice', 'daily'],
  minutes: 2,
  icon: 'स्मृ',
  hue: 'plum',
  status: 'stable',
  inspiredBy: 'Memory / Concentration',
  howToPlay: ['Tap a card to flip it, then tap a second card.', 'An akṣara and its sound make a pair and stay face up.', 'Clear all 8 pairs. Fewer moves earn more stars.'],
  content: [],
};
