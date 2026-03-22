/** Elemental types – extensible later */
export enum CreatureType {
  Normal = 'normal',
  Fire = 'fire',
  Water = 'water',
  Grass = 'grass',
  Dark = 'dark',
  Psychic = 'psychic',
  Fighting = 'fighting',
}

/** Type effectiveness multipliers */
const EFFECTIVENESS: Record<CreatureType, Record<CreatureType, number>> = {
  [CreatureType.Normal]: {
    [CreatureType.Normal]: 1,
    [CreatureType.Fire]: 1,
    [CreatureType.Water]: 1,
    [CreatureType.Grass]: 1,
    [CreatureType.Dark]: 1,
    [CreatureType.Psychic]: 1,
    [CreatureType.Fighting]: 1,
  },
  [CreatureType.Fire]: {
    [CreatureType.Normal]: 1,
    [CreatureType.Fire]: 0.5,
    [CreatureType.Water]: 0.5,
    [CreatureType.Grass]: 2,
    [CreatureType.Dark]: 1,
    [CreatureType.Psychic]: 1,
    [CreatureType.Fighting]: 1,
  },
  [CreatureType.Water]: {
    [CreatureType.Normal]: 1,
    [CreatureType.Fire]: 2,
    [CreatureType.Water]: 0.5,
    [CreatureType.Grass]: 0.5,
    [CreatureType.Dark]: 1,
    [CreatureType.Psychic]: 1,
    [CreatureType.Fighting]: 1,
  },
  [CreatureType.Grass]: {
    [CreatureType.Normal]: 1,
    [CreatureType.Fire]: 0.5,
    [CreatureType.Water]: 2,
    [CreatureType.Grass]: 0.5,
    [CreatureType.Dark]: 1,
    [CreatureType.Psychic]: 1,
    [CreatureType.Fighting]: 1,
  },
  [CreatureType.Dark]: {
    [CreatureType.Normal]: 1,
    [CreatureType.Fire]: 1,
    [CreatureType.Water]: 1,
    [CreatureType.Grass]: 1,
    [CreatureType.Dark]: 0.5,
    [CreatureType.Psychic]: 2,
    [CreatureType.Fighting]: 0.5,
  },
  [CreatureType.Psychic]: {
    [CreatureType.Normal]: 1,
    [CreatureType.Fire]: 1,
    [CreatureType.Water]: 1,
    [CreatureType.Grass]: 1,
    [CreatureType.Dark]: 0.5,
    [CreatureType.Psychic]: 0.5,
    [CreatureType.Fighting]: 2,
  },
  [CreatureType.Fighting]: {
    [CreatureType.Normal]: 1,
    [CreatureType.Fire]: 1,
    [CreatureType.Water]: 1,
    [CreatureType.Grass]: 1,
    [CreatureType.Dark]: 2,
    [CreatureType.Psychic]: 0.5,
    [CreatureType.Fighting]: 0.5,
  },
};

export function getEffectiveness(attackType: CreatureType, defenderType: CreatureType): number {
  return EFFECTIVENESS[attackType]?.[defenderType] ?? 1;
}

/** Base stats for a creature species */
export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

/** An attack / move */
export interface Attack {
  name: string;
  type: CreatureType;
  power: number;
  accuracy: number; // 0-100
  description: string;
}

/** A creature species template */
export interface CreatureSpecies {
  id: string;
  name: string;
  type: CreatureType;
  baseStats: BaseStats;
  /** Pool of attacks this species can learn */
  learnableAttacks: Attack[];
  /** Shape descriptor for procedural graphics */
  shape: ShapeDescriptor;
  description: string;
}

/** Describes how to draw a creature procedurally */
export interface ShapeDescriptor {
  bodyColor: number;
  bodyShape: 'circle' | 'oval' | 'square' | 'diamond' | 'triangle';
  eyeColor: number;
  accentColor: number;
  hasTail: boolean;
  hasCrest: boolean;
  hasWings: boolean;
  size: number; // 0.5-1.5 scale multiplier
}

/** A concrete creature instance owned by the player or wild */
export interface CreatureInstance {
  uid: string;
  speciesId: string;
  nickname: string;
  level: number;
  xp: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  /** The 4 attacks this individual knows */
  moves: Attack[];
  /** Individual stat variance applied at creation */
  ivs: BaseStats;
}

/** Item types available in the game */
export enum ItemType {
  FishingRod = 'fishing_rod',
}

/** Save-game data structure */
export interface SaveData {
  party: CreatureInstance[];
  /** Creatures stored in the PC box */
  box: CreatureInstance[];
  playerName: string;
  playerX: number;
  playerY: number;
  /** Total battles won */
  wins: number;
  /** Total creatures caught */
  caught: number;
  /** Items the player owns */
  items: ItemType[];
  version: number;
}

export const SAVE_VERSION = 2;