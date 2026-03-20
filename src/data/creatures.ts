import { CreatureSpecies, CreatureType } from '../core/types';
import * as A from './attacks';

export const CREATURE_DEX: CreatureSpecies[] = [
  // ── FIRE ──────────────────────────────────────────────────
  {
    id: 'emberlynx', name: 'Emberlynx', type: CreatureType.Fire,
    baseStats: { hp: 45, attack: 55, defense: 35, speed: 60 },
    learnableAttacks: [A.Ember, A.FireFang, A.FlameBurst, A.Tackle, A.QuickStrike],
    shape: { bodyColor: 0xff6633, bodyShape: 'oval', eyeColor: 0xffff00, accentColor: 0xff3300, hasTail: true, hasCrest: false, hasWings: false, size: 0.9 },
    description: 'A fiery feline that prowls volcanic slopes.',
  },
  {
    id: 'pyrowl', name: 'Pyrowl', type: CreatureType.Fire,
    baseStats: { hp: 50, attack: 60, defense: 40, speed: 50 },
    learnableAttacks: [A.Ember, A.HeatWave, A.Inferno, A.Headbutt, A.Slam],
    shape: { bodyColor: 0xcc3300, bodyShape: 'circle', eyeColor: 0xff9900, accentColor: 0xff6600, hasTail: false, hasCrest: true, hasWings: false, size: 1.1 },
    description: 'An owl wreathed in perpetual flames.',
  },
  {
    id: 'magmite', name: 'Magmite', type: CreatureType.Fire,
    baseStats: { hp: 60, attack: 50, defense: 55, speed: 35 },
    learnableAttacks: [A.FlameBurst, A.Inferno, A.BodyPress, A.Tackle, A.HeatWave],
    shape: { bodyColor: 0xff4400, bodyShape: 'square', eyeColor: 0xffcc00, accentColor: 0x993300, hasTail: false, hasCrest: false, hasWings: false, size: 1.0 },
    description: 'A living lump of molten rock.',
  },
  {
    id: 'cinderpup', name: 'Cinderpup', type: CreatureType.Fire,
    baseStats: { hp: 40, attack: 45, defense: 30, speed: 70 },
    learnableAttacks: [A.Ember, A.FireFang, A.QuickStrike, A.Scratch, A.FlameBurst],
    shape: { bodyColor: 0xff8855, bodyShape: 'circle', eyeColor: 0x331100, accentColor: 0xff5500, hasTail: true, hasCrest: false, hasWings: false, size: 0.7 },
    description: 'A playful pup that leaves embers in its wake.',
  },
  {
    id: 'blazardon', name: 'Blazardon', type: CreatureType.Fire,
    baseStats: { hp: 65, attack: 70, defense: 50, speed: 45 },
    learnableAttacks: [A.Inferno, A.HeatWave, A.FlameBurst, A.Slam, A.BodyPress],
    shape: { bodyColor: 0xdd2200, bodyShape: 'triangle', eyeColor: 0xffff33, accentColor: 0xff8800, hasTail: true, hasCrest: true, hasWings: true, size: 1.4 },
    description: 'A fearsome fire dragon that scorches the sky.',
  },

  // ── WATER ─────────────────────────────────────────────────
  {
    id: 'splashlet', name: 'Splashlet', type: CreatureType.Water,
    baseStats: { hp: 50, attack: 40, defense: 50, speed: 55 },
    learnableAttacks: [A.WaterGun, A.BubbleBeam, A.AquaJet, A.Tackle, A.QuickStrike],
    shape: { bodyColor: 0x3399ff, bodyShape: 'circle', eyeColor: 0x001155, accentColor: 0x66ccff, hasTail: true, hasCrest: false, hasWings: false, size: 0.8 },
    description: 'A cheerful tadpole creature.',
  },
  {
    id: 'tideclaw', name: 'Tideclaw', type: CreatureType.Water,
    baseStats: { hp: 55, attack: 60, defense: 55, speed: 40 },
    learnableAttacks: [A.AquaJet, A.Whirlpool, A.Torrent, A.Scratch, A.Slam],
    shape: { bodyColor: 0x1166cc, bodyShape: 'oval', eyeColor: 0xff6600, accentColor: 0x0044aa, hasTail: false, hasCrest: true, hasWings: false, size: 1.1 },
    description: 'A crustacean with razor-sharp claws.',
  },
  {
    id: 'coralisk', name: 'Coralisk', type: CreatureType.Water,
    baseStats: { hp: 65, attack: 45, defense: 65, speed: 30 },
    learnableAttacks: [A.BubbleBeam, A.Torrent, A.WaterGun, A.BodyPress, A.Headbutt],
    shape: { bodyColor: 0x2288bb, bodyShape: 'diamond', eyeColor: 0xffaacc, accentColor: 0xff66aa, hasTail: false, hasCrest: true, hasWings: false, size: 1.0 },
    description: 'Coral growths form its armored shell.',
  },
  {
    id: 'drizzowl', name: 'Drizzowl', type: CreatureType.Water,
    baseStats: { hp: 45, attack: 50, defense: 40, speed: 65 },
    learnableAttacks: [A.WaterGun, A.AquaJet, A.BubbleBeam, A.QuickStrike, A.Tackle],
    shape: { bodyColor: 0x4477cc, bodyShape: 'circle', eyeColor: 0xffee00, accentColor: 0x99ccff, hasTail: false, hasCrest: true, hasWings: true, size: 0.9 },
    description: 'An owl that summons rain wherever it flies.',
  },
  {
    id: 'abyssail', name: 'Abyssail', type: CreatureType.Water,
    baseStats: { hp: 70, attack: 65, defense: 55, speed: 35 },
    learnableAttacks: [A.Torrent, A.Whirlpool, A.AquaJet, A.Slam, A.BodyPress],
    shape: { bodyColor: 0x003366, bodyShape: 'oval', eyeColor: 0x00ffcc, accentColor: 0x0088ff, hasTail: true, hasCrest: false, hasWings: false, size: 1.3 },
    description: 'A deep-sea leviathan that commands the abyss.',
  },

  // ── GRASS ─────────────────────────────────────────────────
  {
    id: 'sproutail', name: 'Sproutail', type: CreatureType.Grass,
    baseStats: { hp: 50, attack: 45, defense: 50, speed: 50 },
    learnableAttacks: [A.VineWhip, A.RazorLeaf, A.LeechSeed, A.Tackle, A.QuickStrike],
    shape: { bodyColor: 0x33cc33, bodyShape: 'circle', eyeColor: 0x663300, accentColor: 0x88ff44, hasTail: true, hasCrest: false, hasWings: false, size: 0.8 },
    description: 'A small lizard with a leafy tail.',
  },
  {
    id: 'thornbug', name: 'Thornbug', type: CreatureType.Grass,
    baseStats: { hp: 45, attack: 50, defense: 55, speed: 45 },
    learnableAttacks: [A.ThornLash, A.RazorLeaf, A.VineWhip, A.Scratch, A.Headbutt],
    shape: { bodyColor: 0x228822, bodyShape: 'oval', eyeColor: 0xff0000, accentColor: 0x44aa22, hasTail: false, hasCrest: true, hasWings: false, size: 0.9 },
    description: 'An insect covered in thorny armor.',
  },
  {
    id: 'bloomox', name: 'Bloomox', type: CreatureType.Grass,
    baseStats: { hp: 70, attack: 55, defense: 60, speed: 25 },
    learnableAttacks: [A.SolarBeam, A.ThornLash, A.VineWhip, A.Slam, A.BodyPress],
    shape: { bodyColor: 0x44aa44, bodyShape: 'square', eyeColor: 0x332200, accentColor: 0xff88cc, hasTail: false, hasCrest: true, hasWings: false, size: 1.3 },
    description: 'A bovine creature with flowers on its back.',
  },
  {
    id: 'fungowl', name: 'Fungowl', type: CreatureType.Grass,
    baseStats: { hp: 55, attack: 45, defense: 45, speed: 55 },
    learnableAttacks: [A.LeechSeed, A.RazorLeaf, A.VineWhip, A.QuickStrike, A.Tackle],
    shape: { bodyColor: 0x889944, bodyShape: 'circle', eyeColor: 0xff3300, accentColor: 0xccdd66, hasTail: false, hasCrest: true, hasWings: true, size: 0.85 },
    description: 'A mushroom-capped owl that drifts through forests.',
  },
  {
    id: 'terravine', name: 'Terravine', type: CreatureType.Grass,
    baseStats: { hp: 60, attack: 65, defense: 55, speed: 40 },
    learnableAttacks: [A.SolarBeam, A.ThornLash, A.RazorLeaf, A.Slam, A.VineWhip],
    shape: { bodyColor: 0x116611, bodyShape: 'triangle', eyeColor: 0xffcc00, accentColor: 0x66dd44, hasTail: true, hasCrest: false, hasWings: false, size: 1.2 },
    description: 'A walking tangle of vines with glowing eyes.',
  },

  // ── NORMAL ────────────────────────────────────────────────
  {
    id: 'fluffkit', name: 'Fluffkit', type: CreatureType.Normal,
    baseStats: { hp: 50, attack: 40, defense: 40, speed: 60 },
    learnableAttacks: [A.Tackle, A.Scratch, A.QuickStrike, A.Headbutt, A.Slam],
    shape: { bodyColor: 0xeecc99, bodyShape: 'circle', eyeColor: 0x332211, accentColor: 0xffeedd, hasTail: true, hasCrest: false, hasWings: false, size: 0.7 },
    description: 'An impossibly fluffy kitten creature.',
  },
  {
    id: 'rumbear', name: 'Rumbear', type: CreatureType.Normal,
    baseStats: { hp: 75, attack: 60, defense: 55, speed: 25 },
    learnableAttacks: [A.Slam, A.BodyPress, A.Headbutt, A.Tackle, A.Scratch],
    shape: { bodyColor: 0x886644, bodyShape: 'square', eyeColor: 0x221100, accentColor: 0xaa8866, hasTail: false, hasCrest: false, hasWings: false, size: 1.4 },
    description: 'A large, sleepy bear that packs a wallop.',
  },
  {
    id: 'skychick', name: 'Skychick', type: CreatureType.Normal,
    baseStats: { hp: 40, attack: 45, defense: 35, speed: 70 },
    learnableAttacks: [A.QuickStrike, A.Scratch, A.Tackle, A.Headbutt, A.Slam],
    shape: { bodyColor: 0xffdd88, bodyShape: 'circle', eyeColor: 0x111111, accentColor: 0xffffff, hasTail: true, hasCrest: true, hasWings: true, size: 0.6 },
    description: 'A tiny chick that zooms through the sky.',
  },
  {
    id: 'ironsnout', name: 'Ironsnout', type: CreatureType.Normal,
    baseStats: { hp: 60, attack: 55, defense: 65, speed: 30 },
    learnableAttacks: [A.Headbutt, A.BodyPress, A.Slam, A.Tackle, A.Scratch],
    shape: { bodyColor: 0x999999, bodyShape: 'diamond', eyeColor: 0x440000, accentColor: 0xbbbbbb, hasTail: false, hasCrest: false, hasWings: false, size: 1.1 },
    description: 'An armored boar with a metallic snout.',
  },
  {
    id: 'glimmouse', name: 'Glimmouse', type: CreatureType.Normal,
    baseStats: { hp: 35, attack: 40, defense: 30, speed: 75 },
    learnableAttacks: [A.QuickStrike, A.Tackle, A.Scratch, A.Headbutt, A.Slam],
    shape: { bodyColor: 0xddddff, bodyShape: 'circle', eyeColor: 0xff0066, accentColor: 0xaaaaff, hasTail: true, hasCrest: false, hasWings: false, size: 0.55 },
    description: 'A tiny glowing mouse, fast as lightning.',
  },
];

export function getSpeciesById(id: string): CreatureSpecies | undefined {
  return CREATURE_DEX.find(s => s.id === id);
}