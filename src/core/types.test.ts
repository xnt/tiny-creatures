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

describe('Dark/Psychic/Fighting type triad', () => {
  it('dark is super effective against psychic', () => {
    expect(getEffectiveness(CreatureType.Dark, CreatureType.Psychic)).toBe(2);
  });

  it('psychic is super effective against fighting', () => {
    expect(getEffectiveness(CreatureType.Psychic, CreatureType.Fighting)).toBe(2);
  });

  it('fighting is super effective against dark', () => {
    expect(getEffectiveness(CreatureType.Fighting, CreatureType.Dark)).toBe(2);
  });

  it('psychic is not effective against dark', () => {
    expect(getEffectiveness(CreatureType.Psychic, CreatureType.Dark)).toBe(0.5);
  });

  it('fighting is not effective against psychic', () => {
    expect(getEffectiveness(CreatureType.Fighting, CreatureType.Psychic)).toBe(0.5);
  });

  it('dark is not effective against fighting', () => {
    expect(getEffectiveness(CreatureType.Dark, CreatureType.Fighting)).toBe(0.5);
  });

  it('new types resist themselves', () => {
    expect(getEffectiveness(CreatureType.Dark, CreatureType.Dark)).toBe(0.5);
    expect(getEffectiveness(CreatureType.Psychic, CreatureType.Psychic)).toBe(0.5);
    expect(getEffectiveness(CreatureType.Fighting, CreatureType.Fighting)).toBe(0.5);
  });

  it('new types are neutral against original types', () => {
    expect(getEffectiveness(CreatureType.Dark, CreatureType.Fire)).toBe(1);
    expect(getEffectiveness(CreatureType.Dark, CreatureType.Water)).toBe(1);
    expect(getEffectiveness(CreatureType.Dark, CreatureType.Grass)).toBe(1);
    expect(getEffectiveness(CreatureType.Dark, CreatureType.Normal)).toBe(1);

    expect(getEffectiveness(CreatureType.Psychic, CreatureType.Fire)).toBe(1);
    expect(getEffectiveness(CreatureType.Psychic, CreatureType.Water)).toBe(1);
    expect(getEffectiveness(CreatureType.Psychic, CreatureType.Grass)).toBe(1);
    expect(getEffectiveness(CreatureType.Psychic, CreatureType.Normal)).toBe(1);

    expect(getEffectiveness(CreatureType.Fighting, CreatureType.Fire)).toBe(1);
    expect(getEffectiveness(CreatureType.Fighting, CreatureType.Water)).toBe(1);
    expect(getEffectiveness(CreatureType.Fighting, CreatureType.Grass)).toBe(1);
    expect(getEffectiveness(CreatureType.Fighting, CreatureType.Normal)).toBe(1);
  });

  it('original types are neutral against new types', () => {
    expect(getEffectiveness(CreatureType.Fire, CreatureType.Dark)).toBe(1);
    expect(getEffectiveness(CreatureType.Water, CreatureType.Dark)).toBe(1);
    expect(getEffectiveness(CreatureType.Grass, CreatureType.Dark)).toBe(1);
    expect(getEffectiveness(CreatureType.Normal, CreatureType.Dark)).toBe(1);

    expect(getEffectiveness(CreatureType.Fire, CreatureType.Psychic)).toBe(1);
    expect(getEffectiveness(CreatureType.Water, CreatureType.Psychic)).toBe(1);
    expect(getEffectiveness(CreatureType.Grass, CreatureType.Psychic)).toBe(1);
    expect(getEffectiveness(CreatureType.Normal, CreatureType.Psychic)).toBe(1);

    expect(getEffectiveness(CreatureType.Fire, CreatureType.Fighting)).toBe(1);
    expect(getEffectiveness(CreatureType.Water, CreatureType.Fighting)).toBe(1);
    expect(getEffectiveness(CreatureType.Grass, CreatureType.Fighting)).toBe(1);
    expect(getEffectiveness(CreatureType.Normal, CreatureType.Fighting)).toBe(1);
  });
});

describe('getEffectiveness fallback', () => {
  it('returns 1 for invalid attacker type', () => {
    expect(getEffectiveness('invalid' as CreatureType, CreatureType.Fire)).toBe(1);
  });

  it('returns 1 for invalid defender type', () => {
    expect(getEffectiveness(CreatureType.Fire, 'invalid' as CreatureType)).toBe(1);
  });
});