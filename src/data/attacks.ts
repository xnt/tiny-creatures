import { Attack, CreatureType } from '../core/types';

// ── Normal attacks ──────────────────────────────────────────
export const Tackle: Attack = { name: 'Tackle', type: CreatureType.Normal, power: 40, accuracy: 95, description: 'A full-body charge.' };
export const Scratch: Attack = { name: 'Scratch', type: CreatureType.Normal, power: 35, accuracy: 100, description: 'Scratches with claws.' };
export const Slam: Attack = { name: 'Slam', type: CreatureType.Normal, power: 60, accuracy: 85, description: 'A heavy slam.' };
export const QuickStrike: Attack = { name: 'Quick Strike', type: CreatureType.Normal, power: 30, accuracy: 100, description: 'A lightning-fast jab.' };
export const Headbutt: Attack = { name: 'Headbutt', type: CreatureType.Normal, power: 55, accuracy: 90, description: 'A forceful headbutt.' };
export const BodyPress: Attack = { name: 'Body Press', type: CreatureType.Normal, power: 65, accuracy: 80, description: 'Presses with full weight.' };

// ── Fire attacks ────────────────────────────────────────────
export const Ember: Attack = { name: 'Ember', type: CreatureType.Fire, power: 40, accuracy: 100, description: 'Small fireballs.' };
export const FlameBurst: Attack = { name: 'Flame Burst', type: CreatureType.Fire, power: 60, accuracy: 90, description: 'A burst of flames.' };
export const Inferno: Attack = { name: 'Inferno', type: CreatureType.Fire, power: 80, accuracy: 75, description: 'A raging inferno.' };
export const HeatWave: Attack = { name: 'Heat Wave', type: CreatureType.Fire, power: 70, accuracy: 85, description: 'Scorching wave of heat.' };
export const FireFang: Attack = { name: 'Fire Fang', type: CreatureType.Fire, power: 50, accuracy: 95, description: 'Bites with flaming fangs.' };

// ── Water attacks ───────────────────────────────────────────
export const WaterGun: Attack = { name: 'Water Gun', type: CreatureType.Water, power: 40, accuracy: 100, description: 'A blast of water.' };
export const AquaJet: Attack = { name: 'Aqua Jet', type: CreatureType.Water, power: 50, accuracy: 95, description: 'Jets forward in water.' };
export const Torrent: Attack = { name: 'Torrent', type: CreatureType.Water, power: 70, accuracy: 85, description: 'A powerful torrent.' };
export const BubbleBeam: Attack = { name: 'Bubble Beam', type: CreatureType.Water, power: 55, accuracy: 95, description: 'Shoots a beam of bubbles.' };
export const Whirlpool: Attack = { name: 'Whirlpool', type: CreatureType.Water, power: 65, accuracy: 80, description: 'Traps foe in a whirlpool.' };

// ── Grass attacks ───────────────────────────────────────────
export const VineWhip: Attack = { name: 'Vine Whip', type: CreatureType.Grass, power: 40, accuracy: 100, description: 'Whips with vines.' };
export const RazorLeaf: Attack = { name: 'Razor Leaf', type: CreatureType.Grass, power: 55, accuracy: 95, description: 'Hurls sharp leaves.' };
export const SolarBeam: Attack = { name: 'Solar Beam', type: CreatureType.Grass, power: 80, accuracy: 80, description: 'A beam of solar energy.' };
export const LeechSeed: Attack = { name: 'Leech Seed', type: CreatureType.Grass, power: 35, accuracy: 90, description: 'Drains energy with seeds.' };
export const ThornLash: Attack = { name: 'Thorn Lash', type: CreatureType.Grass, power: 60, accuracy: 90, description: 'Lashes with thorny vines.' };

/** Master list for lookup */
export const ALL_ATTACKS: Attack[] = [
  Tackle, Scratch, Slam, QuickStrike, Headbutt, BodyPress,
  Ember, FlameBurst, Inferno, HeatWave, FireFang,
  WaterGun, AquaJet, Torrent, BubbleBeam, Whirlpool,
  VineWhip, RazorLeaf, SolarBeam, LeechSeed, ThornLash,
];