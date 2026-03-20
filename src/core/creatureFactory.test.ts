import { describe, it, expect } from 'vitest';
import {
  calcStat,
  randomIVs,
  createCreature,
  xpForLevel,
  xpFromBattle,
  tryLevelUp,
  pickRandomMoves,
  recalcStats,
} from './creatureFactory';
import { CREATURE_DEX, getSpeciesById } from '../data/creatures';
import { CreatureType } from './types';

describe('calcStat', () => {
  it('calculates HP stat correctly', () => {
    // HP formula: floor(((2*base + iv) * level) / 100) + level + 10
    const result = calcStat(50, 10, 10, true);
    // ((2*50 + 10) * 10) / 100 = 110 * 10 / 100 = 11 → floor(11) + 10 + 10 = 31
    expect(result).toBe(31);
  });

  it('calculates non-HP stat correctly', () => {
    // Non-HP formula: floor(((2*base + iv) * level) / 100) + 5
    const result = calcStat(50, 10, 10, false);
    // ((2*50 + 10) * 10) / 100 = 11 → floor(11) + 5 = 16
    expect(result).toBe(16);
  });

  it('increases with level', () => {
    const low = calcStat(50, 5, 5, false);
    const high = calcStat(50, 5, 50, false);
    expect(high).toBeGreaterThan(low);
  });
});

describe('randomIVs', () => {
  it('generates IVs in range 0-15', () => {
    for (let i = 0; i < 100; i++) {
      const ivs = randomIVs();
      expect(ivs.hp).toBeGreaterThanOrEqual(0);
      expect(ivs.hp).toBeLessThanOrEqual(15);
      expect(ivs.attack).toBeGreaterThanOrEqual(0);
      expect(ivs.attack).toBeLessThanOrEqual(15);
      expect(ivs.defense).toBeGreaterThanOrEqual(0);
      expect(ivs.defense).toBeLessThanOrEqual(15);
      expect(ivs.speed).toBeGreaterThanOrEqual(0);
      expect(ivs.speed).toBeLessThanOrEqual(15);
    }
  });
});

describe('createCreature', () => {
  it('creates a creature with correct species', () => {
    const creature = createCreature('emberlynx', 5);
    expect(creature.speciesId).toBe('emberlynx');
    expect(creature.level).toBe(5);
    expect(creature.nickname).toBe('Emberlynx');
  });

  it('creates a creature with exactly 4 moves (or max available)', () => {
    const creature = createCreature('emberlynx', 5);
    expect(creature.moves.length).toBeLessThanOrEqual(4);
    expect(creature.moves.length).toBeGreaterThan(0);
  });

  it('throws for unknown species', () => {
    expect(() => createCreature('nonexistent', 5)).toThrow('Unknown species');
  });

  it('has currentHp equal to maxHp on creation', () => {
    const creature = createCreature('splashlet', 10);
    expect(creature.currentHp).toBe(creature.maxHp);
  });

  it('generates a unique uid', () => {
    const a = createCreature('emberlynx', 5);
    const b = createCreature('emberlynx', 5);
    expect(a.uid).not.toBe(b.uid);
  });

  it('respects custom nickname', () => {
    const creature = createCreature('fluffkit', 5, 'Whiskers');
    expect(creature.nickname).toBe('Whiskers');
  });
});

describe('xpForLevel', () => {
  it('returns 0 for level 0', () => {
    expect(xpForLevel(0)).toBe(0);
  });

  it('increases with level', () => {
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(5));
    expect(xpForLevel(20)).toBeGreaterThan(xpForLevel(10));
  });

  it('follows cubic scaling', () => {
    // level^3 * 0.8
    expect(xpForLevel(10)).toBe(Math.floor(10 * 10 * 10 * 0.8));
  });
});

describe('xpFromBattle', () => {
  it('returns positive XP', () => {
    expect(xpFromBattle(5)).toBeGreaterThan(0);
  });

  it('scales with defeated level', () => {
    expect(xpFromBattle(20)).toBeGreaterThan(xpFromBattle(5));
  });
});

describe('tryLevelUp', () => {
  it('levels up when XP is sufficient', () => {
    const creature = createCreature('emberlynx', 5);
    creature.xp = xpForLevel(6) + 1; // enough for level 6
    const leveled = tryLevelUp(creature);
    expect(leveled).toBe(true);
    expect(creature.level).toBe(6);
  });

  it('does not level up when XP is insufficient', () => {
    const creature = createCreature('emberlynx', 5);
    creature.xp = 0;
    const leveled = tryLevelUp(creature);
    expect(leveled).toBe(false);
    expect(creature.level).toBe(5);
  });
});

describe('pickRandomMoves', () => {
  it('picks the requested number of moves', () => {
    const species = getSpeciesById('emberlynx')!;
    const moves = pickRandomMoves(species, 3);
    expect(moves.length).toBe(3);
  });

  it('does not duplicate moves', () => {
    const species = getSpeciesById('emberlynx')!;
    const moves = pickRandomMoves(species, 4);
    const names = moves.map(m => m.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('recalcStats', () => {
  it('increases maxHp on level up', () => {
    const creature = createCreature('rumbear', 10);
    const oldMaxHp = creature.maxHp;
    creature.level = 15;
    recalcStats(creature);
    expect(creature.maxHp).toBeGreaterThan(oldMaxHp);
  });
});

describe('CREATURE_DEX', () => {
  it('contains 20 creatures', () => {
    expect(CREATURE_DEX.length).toBe(20);
  });

  it('has unique IDs', () => {
    const ids = CREATURE_DEX.map(c => c.id);
    expect(new Set(ids).size).toBe(20);
  });

  it('every creature has at least 3 learnable attacks', () => {
    CREATURE_DEX.forEach(species => {
      expect(species.learnableAttacks.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('contains all four types', () => {
    const types = new Set(CREATURE_DEX.map(c => c.type));
    expect(types.has(CreatureType.Fire)).toBe(true);
    expect(types.has(CreatureType.Water)).toBe(true);
    expect(types.has(CreatureType.Grass)).toBe(true);
    expect(types.has(CreatureType.Normal)).toBe(true);
  });
});