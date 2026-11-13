import type { GameManifest } from '@sdk';

export const manifest: GameManifest = {
  id: 'akshara-paricaya',
  version: '1.0.0',
  title: { sa: 'अक्षरपरिचयः', iast: 'Akṣara-paricayaḥ', en: 'Meet the letters' },
  tagline: 'Learn to read Devanagari, one akṣara at a time',
  description: 'A guided lesson through the varṇamālā: vowels, consonants, vowel signs and conjuncts. Match each akṣara with its sound, with look-alike letters as the tricky choices.',
  kind: 'lesson',
  skills: ['akshara'],
  levels: [0],
  modes: ['practice'],
  minutes: 3,
  icon: 'अ',
  hue: 'saffron',
  status: 'stable',
  inspiredBy: 'Duolingo character lessons',
  howToPlay: [
    'You see an akṣara (or its sound) and pick the match.',
    'Tap an answer, then Check. Number keys 1–4 and Enter work too.',
    'Finish a stage with 2+ stars to unlock the next: vowels → consonants → vowel signs → conjuncts.',
  ],
  content: [],
};
