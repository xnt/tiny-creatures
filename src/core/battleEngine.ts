import { CreatureInstance, Attack, getEffectiveness } from './types';
import { getSpeciesById } from '../data/creatures';
import { xpFromBattle, tryLevelUp } from './creatureFactory';

export interface BattleTurnResult {
  attackerName: string;
  defenderName: string;
  attack: Attack;
  damage: number;
  effectiveness: number; // 0.5, 1, 2
  missed: boolean;
  defenderHpAfter: number;
  defenderFainted: boolean;
}

export interface CatchAttemptResult {
  success: boolean;
  shakes: number; // 0-3 visual shakes before result
}

/**
 * Calculate damage for one attack.
 * Formula: ((2*Level/5 + 2) * Power * A/D) / 50 + 2) * effectiveness * random
 */
export function calculateDamage(
  attacker: CreatureInstance,
  defender: CreatureInstance,
  attack: Attack,
): { damage: number; effectiveness: number } {
  const defenderSpecies = getSpeciesById(defender.speciesId);
  const effectiveness = defenderSpecies
    ? getEffectiveness(attack.type, defenderSpecies.type)
    : 1;

  const levelFactor = (2 * attacker.level) / 5 + 2;
  const baseDamage = (levelFactor * attack.power * (attacker.attack / defender.defense)) / 50 + 2;
  const randomFactor = 0.85 + Math.random() * 0.15;
  const damage = Math.max(1, Math.floor(baseDamage * effectiveness * randomFactor));

  return { damage, effectiveness };
}

/** Execute one turn where attacker uses an attack on defender */
export function executeTurn(
  attacker: CreatureInstance,
  defender: CreatureInstance,
  attack: Attack,
): BattleTurnResult {
  // Accuracy check
  const missed = Math.random() * 100 > attack.accuracy;

  let damage = 0;
  let effectiveness = 1;

  if (!missed) {
    const result = calculateDamage(attacker, defender, attack);
    damage = result.damage;
    effectiveness = result.effectiveness;
    defender.currentHp = Math.max(0, defender.currentHp - damage);
  }

  return {
    attackerName: attacker.nickname,
    defenderName: defender.nickname,
    attack,
    damage,
    effectiveness,
    missed,
    defenderHpAfter: defender.currentHp,
    defenderFainted: defender.currentHp <= 0,
  };
}

/** AI picks a random move for a wild creature */
export function aiPickMove(creature: CreatureInstance): Attack {
  const moves = creature.moves.filter(m => m != null);
  return moves[Math.floor(Math.random() * moves.length)];
}

/**
 * Attempt to catch a wild creature.
 * Rate improves as HP decreases. Roughly:
 *   catchRate = (1 - currentHp/maxHp) * 0.65 + 0.3  → range 0.3 to 0.95
 * Three shake checks — if all three pass, the catch succeeds.
 */
export function attemptCatch(target: CreatureInstance): CatchAttemptResult {
  const hpRatio = target.currentHp / target.maxHp;
  const catchRate = (1 - hpRatio) * 0.65 + 0.3;

  // Each shake is a separate probability check
  let shakes = 0;
  for (let i = 0; i < 3; i++) {
    if (Math.random() < catchRate) {
      shakes++;
    } else {
      break;
    }
  }
  const success = shakes === 3;

  return { success, shakes };
}

/** Award XP after a battle win and handle level-ups. Returns levels gained. */
export function awardXp(winner: CreatureInstance, defeatedLevel: number): number {
  const xp = xpFromBattle(defeatedLevel);
  winner.xp += xp;

  let levelsGained = 0;
  while (tryLevelUp(winner)) {
    levelsGained++;
    if (levelsGained > 10) break; // safety
  }
  return levelsGained;
}

/** Determine turn order based on speed */
export function getTurnOrder(
  a: CreatureInstance,
  b: CreatureInstance,
): ['a' | 'b', 'a' | 'b'] {
  if (a.speed > b.speed) return ['a', 'b'];
  if (b.speed > a.speed) return ['b', 'a'];
  return Math.random() < 0.5 ? ['a', 'b'] : ['b', 'a'];
}