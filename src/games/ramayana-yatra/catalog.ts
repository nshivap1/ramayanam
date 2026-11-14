/**
 * Canonical asset/id catalog (ids only — no Sanskrit here). OWNER: orchestrator.
 * - Art agent must provide a drawing for EVERY id below.
 * - World/story agents may ONLY use ids listed here.
 * - Audio agent must provide every track and sfx.
 * Tests assert completeness in both directions.
 */

export const TILE_IDS = [
  // ── nature ──
  'grass', 'grass_flowers', 'path', 'sand', 'kusha', // kusha = tall sacred grass: random encounters
  'tree', 'tree_palm', 'tree_ashoka', 'tree_banyan', 'bush', 'rock', 'boulder', 'cliff', 'mountain',
  'water', 'water_deep', 'ocean', 'shore_n', 'shore_s', 'shore_e', 'shore_w', 'lotus', 'reeds',
  'bridge_h', 'bridge_v', 'setu', // setu = stone bridge across the ocean (walkable)
  'cave_floor', 'cave_wall', 'cave_entrance', 'flowers_red', 'stump', 'log',
  // ── āśrama / village ──
  'hut_roof_l', 'hut_roof_m', 'hut_roof_r', 'hut_wall', 'hut_door', 'hut_window',
  'fence', 'well', 'shrine', 'fire_altar', 'mat_floor', 'wood_floor', 'wall_inner', 'stairs', 'sign', 'chest',
  // ── Ayodhyā / palace ──
  'stone_road', 'palace_wall', 'palace_roof', 'palace_door', 'palace_floor', 'pillar', 'carpet', 'throne',
  'lamp', 'gate', 'market_stall', 'banner', 'city_wall',
  // ── Laṅkā / battlefield ──
  'lanka_wall', 'lanka_floor', 'lanka_roof', 'lanka_door', 'battle_ground', 'torch',
  'roof_fire', // v0.5b (WP-B): a burning roof Hanumān steps onto (Sundara 5.53–55); walkable
  // ── misc ──
  'void',
] as const;
export type TileId = (typeof TILE_IDS)[number];

export interface TileProps {
  solid: boolean; // blocks movement
  encounter?: boolean; // random encounters when stepping on it
  water?: boolean; // animated water; solid
  interact?: boolean; // facing + A triggers something (sign/shrine/chest handled via map signs/npcs/triggers)
}

const SOLID: TileId[] = [
  'tree', 'tree_palm', 'tree_ashoka', 'tree_banyan', 'bush', 'rock', 'boulder', 'cliff', 'mountain',
  'water', 'water_deep', 'ocean', 'shore_n', 'shore_s', 'shore_e', 'shore_w', 'lotus', 'cave_wall', 'stump',
  'hut_roof_l', 'hut_roof_m', 'hut_roof_r', 'hut_wall', 'hut_window', 'fence', 'well', 'shrine', 'fire_altar',
  'wall_inner', 'sign', 'chest', 'palace_wall', 'palace_roof', 'pillar', 'throne', 'lamp', 'market_stall', 'banner',
  'city_wall', 'lanka_wall', 'lanka_roof', 'torch', 'void', 'log',
];
const WATER: TileId[] = ['water', 'water_deep', 'ocean', 'lotus'];

export const TILE_PROPS: Record<TileId, TileProps> = Object.fromEntries(
  TILE_IDS.map((id) => [
    id,
    {
      solid: SOLID.includes(id),
      encounter: id === 'kusha' ? true : undefined,
      water: WATER.includes(id) ? true : undefined,
      interact: ['sign', 'shrine', 'chest', 'well'].includes(id) ? true : undefined,
    },
  ]),
) as Record<TileId, TileProps>;

/** Overworld characters: 16x24, 4 directions x 3 walk frames. */
export const SPRITE_IDS = [
  'player_a', 'player_b', // player avatar choices (young śiṣya, two looks)
  'valmiki', 'bharadvaja', 'narada', 'vishvamitra', 'rama', 'lakshmana', 'sita',
  'dasharatha', 'kaikeyi', 'kausalya', 'sumitra', 'bharata', 'vasishtha', 'guha', 'sumantra',
  'rishi', 'rishika', 'villager_m', 'villager_f', 'child', 'merchant', 'guard', 'pandita',
  'shabari', 'jatayu', 'agastya',
  'hanuman', 'sugriva', 'jambavan', 'angada', 'vanara',
  'vibhishana', 'rakshasa', 'rakshasi', 'ravana', 'kumbhakarna', 'indrajit', 'lanka_devi', 'surasa',
  'golden_deer', 'krauncha', 'hunter',
  'kusha', 'lava', // v0.5b (WP-D): Kuśa and Lava, Vālmīki's pupils who sing the poem in Rāma's court (Bāla 1.4)
] as const;
export type SpriteId = (typeof SPRITE_IDS)[number];

/** Battle sprites: 64x64, drawn facing LEFT (enemies). Allies are drawn mirrored. */
export const BATTLER_IDS = [
  // allies
  'b_player_a', 'b_player_b', 'b_rama', 'b_lakshmana', 'b_hanuman', 'b_sugriva', 'b_jambavan', 'b_vibhishana',
  // duelists (non-violent śāstrārtha opponents)
  'b_bharadvaja', 'b_pandita', 'b_hanuman_duel',
  // foes
  'b_nishachara', 'b_yatudhana', 'b_rakshasi', 'b_maya_mriga', 'b_tataka', 'b_subahu', 'b_maricha',
  'b_khara', 'b_dushana', 'b_kabandha', 'b_lanka_devi', 'b_aksha', 'b_dhumraksha', 'b_kumbhakarna',
  'b_indrajit', 'b_ravana', 'b_vrka', 'b_simhika', 'b_surasa',
] as const;
export type BattlerId = (typeof BATTLER_IDS)[number];

export const TRACK_IDS = [
  'title', 'ashrama', 'ayodhya', 'forest', 'kishkindha', 'ocean', 'lanka', 'battle', 'boss', 'duel',
  'victory', 'shloka', 'sorrow', 'ending',
] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export const SFX_IDS = [
  'select', 'confirm', 'cancel', 'step', 'bump', 'hit', 'crit', 'heal', 'levelup', 'correct', 'wrong',
  'encounter', 'door', 'item', 'learn', 'faint', 'run', 'buff', 'debuff', 'restore', 'text',
] as const;
export type SfxId = (typeof SFX_IDS)[number];

export const BATTLE_BG_IDS = ['ashrama', 'forest', 'river', 'palace', 'cave', 'ocean', 'lanka', 'battlefield'] as const;
export type BattleBgId = (typeof BATTLE_BG_IDS)[number];

/** Element chart: ATTACKER element -> DEFENDER element -> multiplier (missing = 1). */
export const ELEMENT_CHART: Record<string, Record<string, number>> = {
  jala: { agni: 2, bhumi: 0.5, jala: 0.5 },
  agni: { vayu: 2, jala: 0.5, agni: 0.5 },
  vayu: { bhumi: 2, agni: 0.5, vayu: 0.5 },
  bhumi: { jala: 2, vayu: 0.5, bhumi: 0.5 },
  divya: { maya: 2 },
  maya: { divya: 0.5, none: 1.25 },
};

/** Canonical gameplay ids shared by the world/story, battle and art agents. */
export const ALLY_IDS = ['player', 'rama', 'lakshmana', 'hanuman', 'sugriva', 'jambavan', 'vibhishana'] as const;
export const ENEMY_IDS = [
  'nishachara', 'yatudhana', 'rakshasi', 'maya_mriga', 'vrka', 'simhika', 'surasa_duel',
  'tataka', 'subahu', 'maricha', 'khara', 'dushana', 'kabandha', 'lanka_devi', 'aksha', 'dhumraksha',
  'kumbhakarna', 'indrajit', 'ravana',
  'bharadvaja_duel', 'pandita_duel', 'hanuman_duel',
] as const;
