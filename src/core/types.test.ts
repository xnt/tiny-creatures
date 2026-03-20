import { describe, it, expect } from 'vitest';
import { getEffectiveness, CreatureType } from './types';

describe('Type effectiveness', () => {
  it('fire is super effective against grass', () => {
    expect(getEffectiveness(CreatureType.Fire, CreatureType.Grass)).toBe(2);
  });

  it('water is super effective against fire', () => {
    expect(getEffectiveness(CreatureType.Water, CreatureType.Fire)).toBe(2);
  });

  it('grass is super effective against water', () => {
    expect(getEffectiveness(CreatureType.Grass, CreatureType.Water)).toBe(2);
  });

  it('fire is not effective against water', () => {
    expect(getEffectiveness(CreatureType.Fire, CreatureType.Water)).toBe(0.5);
  });

  it('water is not effective against grass', () => {
    expect(getEffectiveness(CreatureType.Water, CreatureType.Grass)).toBe(0.5);
  });

  it('grass is not effective against fire', () => {
    expect(getEffectiveness(CreatureType.Grass, CreatureType.Fire)).toBe(0.5);
  });

  it('normal is neutral against all types', () => {
    expect(getEffectiveness(CreatureType.Normal, CreatureType.Fire)).toBe(1);
    expect(getEffectiveness(CreatureType.Normal, CreatureType.Water)).toBe(1);
    expect(getEffectiveness(CreatureType.Normal, CreatureType.Grass)).toBe(1);
    expect(getEffectiveness(CreatureType.Normal, CreatureType.Normal)).toBe(1);
  });

  it('same type resists itself (except normal)', () => {
    expect(getEffectiveness(CreatureType.Fire, CreatureType.Fire)).toBe(0.5);
    expect(getEffectiveness(CreatureType.Water, CreatureType.Water)).toBe(0.5);
    expect(getEffectiveness(CreatureType.Grass, CreatureType.Grass)).toBe(0.5);
  });
});