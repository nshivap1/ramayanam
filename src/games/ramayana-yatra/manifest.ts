import type { GameManifest } from '@sdk';

export const manifest: GameManifest = {
  id: 'ramayana-yatra',
  version: '0.4.5',
  title: { sa: 'रामायणयात्रा', iast: 'Rāmāyaṇa-yātrā', en: 'Journey through the Rāmāyaṇa' },
  tagline: 'A retro RPG where Rāmāyaṇa ślokas power every move',
  description:
    "Walk with Rāma, Lakṣmaṇa and Hanumān through all six kāṇḍas of Vālmīki's Rāmāyaṇa. Every astra draws its power from a real śloka: in the Story journey you follow the epic and recite the lines of its verses; in Practice each move is a Sanskrit challenge on words, sandhi and grammar. Restore the verses and defeat Rāvaṇa. Play in English, or switch the story and the whole game to simple spoken Sanskrit (Sambhāṣaṇa) when you are ready.",
  kind: 'arcade',
  skills: ['subhashita', 'shabdakosha', 'sandhi', 'vibhakti', 'chandas'],
  levels: [2, 3, 4],
  modes: ['practice'],
  minutes: 20,
  icon: 'रा',
  hue: 'saffron',
  status: 'beta',
  inspiredBy: 'Pokémon (Game Boy Advance era)',
  howToPlay: [
    'Walk with the arrow keys or the on-screen pad; press A (Z / Enter) to talk.',
    'Listen to each śloka in its story; tap any word to see its meaning.',
    'In battle, astras draw on real ślokas: in a Story journey recite a line of the verse; in Practice answer a Sanskrit question.',
    'Rest at āśrama shrines to recite verses, restore them and unlock new astras.',
    'Your journey is saved; end a session from the menu and continue later.',
    'Ready for more? Menu → Settings → Story text switches the dialogue to simple spoken Sanskrit.',
  ],
  content: [],
  credits: ['Verses: Vālmīki Rāmāyaṇa (sources listed per verse in PRD.md and REVIEW.md)', 'Pixel art and chiptune: original, made for Samskuru'],
};
