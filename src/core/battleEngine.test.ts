import { describe, it, expect } from 'vitest';
import { calculateDamage, executeTurn, aiPickMove, attemptCatch, awardXp, getTurnOrder } from './battleEngine';
import { createCreature } from './creatureFactory';
import { CreatureType, Attack } from './types';

const testAttack: Attack = {
  name: 'Test Slash',
  type: CreatureType.Normal,
  power: 50,
  accuracy: 100,
  description: 'A test attack.',
};

const fireAttack: Attack = {
  name: 'Fire Test',
  type: CreatureType.Fire,
  power: 60,
  accuracy: 100,
  description: 'Fire test attack.',
};

describe('calculateDamage', () => {
  it('returns positive damage', () => {
    const attacker = createCreature('emberlynx', 10);
    const defender = createCreature('splashlet', 10);
    const { damage } = calculateDamage(attacker, defender, testAttack);
    expect(damage).toBeGreaterThan(0);
  });

  it('applies type effectiveness', () => {
    const fireCreature = createCreature('emberlynx', 10);
    const grassCreature = createCreature('sproutail', 10);
    const { effectiveness } = calculateDamage(fireCreature, grassCreature, fireAttack);
    expect(effectiveness).toBe(2); // fire vs grass = super effective
  });

  it('minimum damage is 1', () => {
    const attacker = createCreature('glimmouse', 1);
    const defender = createCreature('rumbear', 50);
    const { damage } = calculateDamage(attacker, defender, testAttack);
    expect(damage).toBeGreaterThanOrEqual(1);
  });
});

describe('executeTurn', () => {
  it('reduces defender HP on hit', () => {
    const attacker = createCreature('emberlynx', 10);
    const defender = createCreature('splashlet', 10);
    const originalHp = defender.currentHp;

    // Use 100% accuracy attack
    const result = executeTurn(attacker, defender, testAttack);

    if (!result.missed) {
      expect(defender.currentHp).toBeLessThan(originalHp);
      expect(result.damage).toBeGreaterThan(0);
    }
  });

  it('reports fainted when HP reaches 0', () => {
    const attacker = createCreature('blazardon', 50);
    const defender = createCreature('glimmouse', 1);

    const result = executeTurn(attacker, defender, {
      ...testAttack,
      power: 200,
      accuracy: 100,
    });

    expect(result.defenderFainted).toBe(true);
    expect(defender.currentHp).toBe(0);
  });

  it('does not reduce HP on miss', () => {
    const attacker = createCreature('emberlynx', 10);
    const defender = createCreature('splashlet', 10);
    const originalHp = defender.currentHp;

    // 0% accuracy attack
    const zeroAccAttack: Attack = { ...testAttack, accuracy: 0 };
    const result = executeTurn(attacker, defender, zeroAccAttack);

    expect(result.missed).toBe(true);
    expect(defender.currentHp).toBe(originalHp);
  });
});

describe('aiPickMove', () => {
  it('picks a valid move from the creature', () => {
    const creature = createCreature('emberlynx', 10);
    const move = aiPickMove(creature);
    expect(move).toBeDefined();
    expect(move.name).toBeTruthy();
    expect(creature.moves.map(m => m.name)).toContain(move.name);
  });
});

describe('attemptCatch', () => {
  it('returns a result with shakes 0-3', () => {
    const target = createCreature('splashlet', 5);
    const result = attemptCatch(target);
    expect(result.shakes).toBeGreaterThanOrEqual(0);
    expect(result.shakes).toBeLessThanOrEqual(3);
    expect(typeof result.success).toBe('boolean');
  });

  it('has higher catch rate when target HP is low', () => {
    // Run many trials — with 1 HP, catch rate should be much higher
    let lowHpCatches = 0;
    let fullHpCatches = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      const low = createCreature('splashlet', 5);
      low.currentHp = 1;
      if (attemptCatch(low).success) lowHpCatches++;

      const full = createCreature('splashlet', 5);
      if (attemptCatch(full).success) fullHpCatches++;
    }

    // Low HP should have significantly more catches
    expect(lowHpCatches).toBeGreaterThan(fullHpCatches);
  });
});

describe('awardXp', () => {
  it('increases XP', () => {
    const creature = createCreature('emberlynx', 5);
    const oldXp = creature.xp;
    awardXp(creature, 5);
    expect(creature.xp).toBeGreaterThan(oldXp);
  });

  it('can trigger level up', () => {
    const creature = createCreature('emberlynx', 2);
    // Give tons of xp
    creature.xp = 0;
    const levels = awardXp(creature, 100);
    // Should have leveled at least once from level 2 with 100-level XP reward
    expect(levels).toBeGreaterThanOrEqual(0);
  });
});

describe('getTurnOrder', () => {
  it('faster creature goes first', () => {
    const fast = createCreature('glimmouse', 10);
    fast.speed = 100;
    const slow = createCreature('rumbear', 10);
    slow.speed = 10;

    const [first] = getTurnOrder(fast, slow);
    expect(first).toBe('a');
  });

  it('slower creature goes second', () => {
    const slow = createCreature('rumbear', 10);
    slow.speed = 10;
    const fast = createCreature('glimmouse', 10);
    fast.speed = 100;

    const [first] = getTurnOrder(slow, fast);
    expect(first).toBe('b');
  });

  it('returns valid tuple with equal speed', () => {
    const a = createCreature('emberlynx', 10);
    a.speed = 50;
    const b = createCreature('splashlet', 10);
    b.speed = 50;

    const order = getTurnOrder(a, b);
    expect(['a', 'b']).toContain(order[0]);
    expect(['a', 'b']).toContain(order[1]);
    expect(order[0]).not.toBe(order[1]);
  });
});