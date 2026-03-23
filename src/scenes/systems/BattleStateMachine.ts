import { CreatureInstance, Attack, SaveData } from '../../core/types';
import {
  BattleEngine,
  PlannedTurn,
  BattleTurnResult,
  CatchAttemptResult,
} from '../../core/battleEngine';
import { RandomSource, defaultRandom } from '../../core/random';
import { EventBus, gameEvents } from '../../core/eventBus';

/** Battle phase states */
export type BattlePhase = 'choosing' | 'animating' | 'result' | 'catch_anim' | 'ended';

/** Battle action types that a player can take */
export type PlayerAction = 
  | { type: 'attack'; move: Attack }
  | { type: 'catch' }
  | { type: 'switch'; creature: CreatureInstance }
  | { type: 'run' };

/** A planned turn with metadata for the scene to animate */
export interface PlannedTurnInfo {
  planned: PlannedTurn;
  isPlayerAttacker: boolean;
}

/** Result of a player action that needs scene handling */
export interface BattleActionResult {
  type: 'attack_result' | 'catch_result' | 'switch_result' | 'run_result' | 'battle_end';
  plannedTurns?: PlannedTurnInfo[];
  turnResults?: BattleTurnResult[];
  catchResult?: CatchAttemptResult;
  escaped?: boolean;
  message: string;
  battleEnded?: boolean;
  victory?: boolean;
  caught?: boolean;
  switchRequired?: boolean;
  playerFainted?: boolean;
  wildFainted?: boolean;
}

/**
 * BattleStateMachine manages the state and flow of a battle.
 * Handles turn sequencing, phase transitions, and battle outcomes.
 * 
 * Uses a two-phase approach for attacks:
 * 1. planAction() - Plans what will happen without applying damage
 * 2. applyTurnDamage() - Called by scene after animation to apply damage
 */
export class BattleStateMachine {
  private phase: BattlePhase = 'choosing';
  private playerCreature: CreatureInstance;
  private wildCreature: CreatureInstance;
  private save: SaveData;
  private engine: BattleEngine;
  private random: RandomSource;
  private events: EventBus;

  // Store the current action plan for step-by-step execution
  private currentPlan: {
    action: PlayerAction;
    plannedTurns: PlannedTurnInfo[];
    currentIndex: number;
  } | null = null;

  constructor(
    save: SaveData,
    playerCreature: CreatureInstance,
    wildCreature: CreatureInstance,
    random: RandomSource = defaultRandom,
    events: EventBus = gameEvents,
  ) {
    this.save = save;
    this.playerCreature = playerCreature;
    this.wildCreature = wildCreature;
    this.random = random;
    this.events = events;
    this.engine = new BattleEngine(random);
  }

  /** Get current battle phase */
  getPhase(): BattlePhase {
    return this.phase;
  }

  /** Get current player creature */
  getPlayerCreature(): CreatureInstance {
    return this.playerCreature;
  }

  /** Get wild creature */
  getWildCreature(): CreatureInstance {
    return this.wildCreature;
  }

  /** Check if battle is in a state where player input is allowed */
  canTakeAction(): boolean {
    return this.phase === 'choosing';
  }

  /** Plan a player action without executing it (returns planned turns for animation) */
  planAction(action: PlayerAction): BattleActionResult {
    if (!this.canTakeAction()) {
      return { type: 'battle_end', message: 'Cannot take action now', battleEnded: true };
    }

    switch (action.type) {
      case 'attack':
        return this.planAttack(action);
      case 'catch':
        return this.planCatch();
      case 'switch':
        return this.planSwitch(action);
      case 'run':
        return this.planRun();
    }
  }

  private planAttack(action: { type: 'attack'; move: Attack }): BattleActionResult {
    this.phase = 'animating';
    const plannedTurns: PlannedTurnInfo[] = [];
    const order = this.engine.getTurnOrder(this.playerCreature, this.wildCreature);

    if (order[0] === 'a') {
      // Player goes first
      const playerPlan = this.engine.planTurn(this.playerCreature, this.wildCreature, action.move);
      plannedTurns.push({ planned: playerPlan, isPlayerAttacker: true });

      // Enemy turn (planned, but may not execute if player faints wild)
      const enemyMove = this.engine.aiPickMove(this.wildCreature);
      const enemyPlan = this.engine.planTurn(this.wildCreature, this.playerCreature, enemyMove);
      plannedTurns.push({ planned: enemyPlan, isPlayerAttacker: false });
    } else {
      // Enemy goes first
      const enemyMove = this.engine.aiPickMove(this.wildCreature);
      const enemyPlan = this.engine.planTurn(this.wildCreature, this.playerCreature, enemyMove);
      plannedTurns.push({ planned: enemyPlan, isPlayerAttacker: false });

      // Player turn (planned, but may not execute if enemy faints player)
      const playerPlan = this.engine.planTurn(this.playerCreature, this.wildCreature, action.move);
      plannedTurns.push({ planned: playerPlan, isPlayerAttacker: true });
    }

    // Store the plan for step-by-step execution
    this.currentPlan = {
      action,
      plannedTurns,
      currentIndex: 0,
    };

    return {
      type: 'attack_result',
      plannedTurns,
      message: 'What will you do?',
    };
  }

  private planCatch(): BattleActionResult {
    this.phase = 'catch_anim';
    const catchResult = this.engine.attemptCatch(this.wildCreature);

    if (catchResult.success) {
      const sentToBox = this.save.party.length >= 6;
      
      // Add to party or box
      if (!sentToBox) {
        this.save.party.push(this.wildCreature);
      } else {
        this.save.box.push(this.wildCreature);
      }
      this.save.caught++;

      // Emit battle:caught event
      this.events.emit('battle:caught', {
        creature: this.wildCreature,
        sentToBox,
      });

      this.phase = 'ended';
      return {
        type: 'catch_result',
        catchResult,
        message: `Gotcha! ${this.wildCreature.nickname} was caught!`,
        battleEnded: true,
        caught: true,
      };
    } else {
      // Failed catch - enemy gets a free attack
      const enemyMove = this.engine.aiPickMove(this.wildCreature);
      const enemyPlan = this.engine.planTurn(this.wildCreature, this.playerCreature, enemyMove);

      this.currentPlan = {
        action: { type: 'catch' },
        plannedTurns: [{ planned: enemyPlan, isPlayerAttacker: false }],
        currentIndex: 0,
      };

      return {
        type: 'catch_result',
        catchResult,
        plannedTurns: [{ planned: enemyPlan, isPlayerAttacker: false }],
        message: `${this.wildCreature.nickname} broke free!`,
      };
    }
  }

  private planSwitch(action: { type: 'switch'; creature: CreatureInstance }): BattleActionResult {
    this.phase = 'animating';
    const previousCreature = this.playerCreature;
    this.playerCreature = action.creature;

    // Emit creature:switched event
    this.events.emit('creature:switched', {
      from: previousCreature,
      to: action.creature,
    });

    // Enemy gets a free attack when switching
    const enemyMove = this.engine.aiPickMove(this.wildCreature);
    const enemyPlan = this.engine.planTurn(this.wildCreature, this.playerCreature, enemyMove);

    this.currentPlan = {
      action,
      plannedTurns: [{ planned: enemyPlan, isPlayerAttacker: false }],
      currentIndex: 0,
    };

    return {
      type: 'switch_result',
      plannedTurns: [{ planned: enemyPlan, isPlayerAttacker: false }],
      message: `Go, ${action.creature.nickname}!`,
    };
  }

  private planRun(): BattleActionResult {
    this.phase = 'animating';

    // Running chance: 80% or always if faster
    const escaped = this.random.chance(0.8) || this.playerCreature.speed > this.wildCreature.speed;

    if (escaped) {
      // Emit battle:fled event
      this.events.emit('battle:fled', {});

      this.phase = 'ended';
      return {
        type: 'run_result',
        escaped: true,
        message: 'Got away safely!',
        battleEnded: true,
      };
    } else {
      // Failed escape - enemy gets a free attack
      const enemyMove = this.engine.aiPickMove(this.wildCreature);
      const enemyPlan = this.engine.planTurn(this.wildCreature, this.playerCreature, enemyMove);

      this.currentPlan = {
        action: { type: 'run' },
        plannedTurns: [{ planned: enemyPlan, isPlayerAttacker: false }],
        currentIndex: 0,
      };

      return {
        type: 'run_result',
        escaped: false,
        plannedTurns: [{ planned: enemyPlan, isPlayerAttacker: false }],
        message: "Couldn't escape!",
      };
    }
  }

  /** Apply damage from a planned turn (called by scene after animation) */
  applyTurnDamage(plannedTurn: PlannedTurn): BattleTurnResult {
    const result = this.engine.applyPlannedTurn(plannedTurn);

    // Check for faint and emit event
    if (result.defenderFainted) {
      const isPlayer = plannedTurn.defender === this.playerCreature;
      this.events.emit('creature:fainted', {
        creature: plannedTurn.defender,
        isPlayer,
      });
    }

    return result;
  }

  /** Check if a turn resulted in a faint and handle it */
  checkTurnResult(result: BattleTurnResult): { 
    playerFainted: boolean; 
    wildFainted: boolean;
    shouldContinue: boolean;
  } {
    const playerFainted = this.playerCreature.currentHp <= 0;
    const wildFainted = this.wildCreature.currentHp <= 0;

    return {
      playerFainted,
      wildFainted,
      shouldContinue: !playerFainted && !wildFainted,
    };
  }

  /** Called when all planned turns have been animated */
  onTurnsComplete(): BattleActionResult {
    // Check for faints
    if (this.wildCreature.currentHp <= 0) {
      return this.handleWildFainted();
    }
    if (this.playerCreature.currentHp <= 0) {
      return this.handlePlayerFainted();
    }

    this.phase = 'choosing';
    this.currentPlan = null;
    return {
      type: 'attack_result',
      message: 'What will you do?',
    };
  }

  private handleWildFainted(): BattleActionResult {
    this.phase = 'ended';
    
    // Award XP
    const levelsGained = this.engine.awardXp(this.playerCreature, this.wildCreature.level);
    this.save.wins++;

    // Emit battle:won event
    this.events.emit('battle:won', {
      defeatedCreature: this.wildCreature,
      levelsGained,
    });

    let message = `${this.wildCreature.nickname} fainted! ${this.playerCreature.nickname} gained experience!`;
    if (levelsGained > 0) {
      message += ` Leveled up to ${this.playerCreature.level}!`;
    }

    return {
      type: 'attack_result',
      message,
      battleEnded: true,
      victory: true,
      wildFainted: true,
    };
  }

  private handlePlayerFainted(): BattleActionResult {
    // Check for other alive party members
    const nextAlive = this.save.party.find(
      c => c.currentHp > 0 && c.uid !== this.playerCreature.uid
    );

    if (nextAlive) {
      // Set phase to choosing to allow forced switch
      this.phase = 'choosing';
      return {
        type: 'attack_result',
        message: `${this.playerCreature.nickname} fainted! Send next creature?`,
        switchRequired: true,
        playerFainted: true,
      };
    } else {
      // All creatures fainted - blackout
      this.phase = 'ended';
      this.save.party.forEach(c => { c.currentHp = c.maxHp; });

      // Emit battle:lost event
      this.events.emit('battle:lost', {
        blackout: true,
      });

      return {
        type: 'attack_result',
        message: 'All your creatures fainted! You blacked out...',
        battleEnded: true,
        victory: false,
        playerFainted: true,
      };
    }
  }

  /** Switch to a new creature after faint */
  switchToFaintedCreature(creature: CreatureInstance): void {
    const previousCreature = this.playerCreature;
    this.playerCreature = creature;
    this.phase = 'choosing';

    // Emit creature:switched event
    this.events.emit('creature:switched', {
      from: previousCreature,
      to: creature,
    });
  }

  /** Get available creatures for switching (alive and not current) */
  getAvailableSwitchTargets(): CreatureInstance[] {
    return this.save.party.filter(
      c => c.currentHp > 0 && c.uid !== this.playerCreature.uid
    );
  }

  /** Check if player has any alive creatures left */
  hasAliveCreatures(): boolean {
    return this.save.party.some(c => c.currentHp > 0);
  }
}
