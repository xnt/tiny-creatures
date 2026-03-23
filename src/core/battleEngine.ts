import { CreatureInstance, Attack, getEffectiveness } from './types';
import { getSpeciesById } from '../data/creatures';
import { xpFromBattle, tryLevelUp } from './creatureFactory';
import { RandomSource, defaultRandom } from './random';

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

/** A planned turn that hasn't been executed yet */
export interface PlannedTurn {
  attacker: CreatureInstance;
  defender: CreatureInstance;
  attack: Attack;
  damage: number;
  effectiveness: number;
  missed: boolean;
}

export interface CatchAttemptResult {
  success: boolean;
  shakes: number; // 0-3 visual shakes before result
}

/**
 * BattleEngine handles combat calculations with injectable randomness.
 */
export class BattleEngine {
  constructor(private random: RandomSource = defaultRandom) {}

  /**
   * Calculate damage for one attack.
   * Formula: ((2*Level/5 + 2) * Power * A/D) / 50 + 2) * effectiveness * random
   */
  calculateDamage(
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
    const randomFactor = 0.85 + this.random.random() * 0.15;
    const damage = Math.max(1, Math.floor(baseDamage * effectiveness * randomFactor));

    return { damage, effectiveness };
  }

  /** Execute one turn where attacker uses an attack on defender */
  executeTurn(
    attacker: CreatureInstance,
    defender: CreatureInstance,
    attack: Attack,
  ): BattleTurnResult {
    // Accuracy check
    const missed = this.random.random() * 100 > attack.accuracy;

    let damage = 0;
    let effectiveness = 1;

    if (!missed) {
      const result = this.calculateDamage(attacker, defender, attack);
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

  /** Plan a turn without applying damage (for sequential animation) */
  planTurn(
    attacker: CreatureInstance,
    defender: CreatureInstance,
    attack: Attack,
  ): PlannedTurn {
    // Accuracy check
    const missed = this.random.random() * 100 > attack.accuracy;

    let damage = 0;
    let effectiveness = 1;

    if (!missed) {
      const result = this.calculateDamage(attacker, defender, attack);
      damage = result.damage;
      effectiveness = result.effectiveness;
    }

    return {
      attacker,
      defender,
      attack,
      damage,
      effectiveness,
      missed,
    };
  }

  /** Apply a planned turn's damage to the defender */
  applyPlannedTurn(planned: PlannedTurn): BattleTurnResult {
    if (!planned.missed) {
      planned.defender.currentHp = Math.max(0, planned.defender.currentHp - planned.damage);
    }

    return {
      attackerName: planned.attacker.nickname,
      defenderName: planned.defender.nickname,
      attack: planned.attack,
      damage: planned.damage,
      effectiveness: planned.effectiveness,
      missed: planned.missed,
      defenderHpAfter: planned.defender.currentHp,
      defenderFainted: planned.defender.currentHp <= 0,
    };
  }

  /** AI picks a random move for a wild creature */
  aiPickMove(creature: CreatureInstance): Attack {
    const moves = creature.moves.filter(m => m != null);
    return this.random.randomElement(moves)!;
  }

  /**
   * Attempt to catch a wild creature.
   * Rate improves as HP decreases. Roughly:
   *   catchRate = (1 - currentHp/maxHp) * 0.8 + 0.65
   * Three shake checks - if all three pass, the catch succeeds.
   */
  attemptCatch(target: CreatureInstance): CatchAttemptResult {
    const hpRatio = target.currentHp / target.maxHp;
    const catchRate = (1 - hpRatio) * 0.8 + 0.65;

    // Each shake is a separate probability check
    let shakes = 0;
    for (let i = 0; i < 3; i++) {
      if (this.random.chance(catchRate)) {
        shakes++;
      } else {
        break;
      }
    }
    const success = shakes === 3;

    return { success, shakes };
  }

  /** Award XP after a battle win and handle level-ups. Returns levels gained. */
  awardXp(winner: CreatureInstance, defeatedLevel: number): number {
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
  getTurnOrder(
    a: CreatureInstance,
    b: CreatureInstance,
  ): ['a' | 'b', 'a' | 'b'] {
    if (a.speed > b.speed) return ['a', 'b'];
    if (b.speed > a.speed) return ['b', 'a'];
    return this.random.chance(0.5) ? ['a', 'b'] : ['b', 'a'];
  }
}

// Default instance for convenience
const defaultEngine = new BattleEngine();

// Export standalone functions that use the default engine (for backwards compatibility)
export const calculateDamage = defaultEngine.calculateDamage.bind(defaultEngine);
export const executeTurn = defaultEngine.executeTurn.bind(defaultEngine);
export const planTurn = defaultEngine.planTurn.bind(defaultEngine);
export const applyPlannedTurn = defaultEngine.applyPlannedTurn.bind(defaultEngine);
export const aiPickMove = defaultEngine.aiPickMove.bind(defaultEngine);
export const attemptCatch = defaultEngine.attemptCatch.bind(defaultEngine);
export const awardXp = defaultEngine.awardXp.bind(defaultEngine);
export const getTurnOrder = defaultEngine.getTurnOrder.bind(defaultEngine);
