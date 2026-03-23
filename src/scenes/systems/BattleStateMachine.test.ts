import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BattleStateMachine, BattlePhase } from './BattleStateMachine';
import { SaveData, CreatureInstance, Attack, CreatureType } from '../../core/types';

// Mock battleEngine module - must be defined inline to avoid hoisting issues
vi.mock('../../core/battleEngine', () => {
  // Create a mock BattleEngine class inline
  return {
    BattleEngine: class MockBattleEngine {
      planTurn(attacker: CreatureInstance, defender: CreatureInstance, attack: Attack) {
        return {
          attacker,
          defender,
          attack,
          damage: 10,
          effectiveness: 1,
          missed: false,
        };
      }
      
      applyPlannedTurn(planned: any) {
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
      
      aiPickMove() {
        return { name: 'Tackle', power: 40, accuracy: 100, type: 'normal', description: 'Test' };
      }
      
      attemptCatch() {
        return { success: false, shakes: 2 };
      }
      
      awardXp() {
        return 0;
      }
      
      getTurnOrder() {
        return ['a', 'b'] as const;
      }
    },
    // Also export standalone functions for backwards compatibility
    planTurn: vi.fn((attacker, defender, attack) => ({
      attacker,
      defender,
      attack,
      damage: 10,
      effectiveness: 1,
      missed: false,
    })),
    applyPlannedTurn: vi.fn((planned) => {
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
    }),
    aiPickMove: vi.fn(() => ({ name: 'Tackle', power: 40, accuracy: 100, type: 'normal', description: 'Test' })),
    attemptCatch: vi.fn(() => ({ success: false, shakes: 2 })),
    awardXp: vi.fn(() => 0),
    getTurnOrder: vi.fn(() => ['a', 'b'] as const),
  };
});

const createMockCreature = (overrides: Partial<CreatureInstance> = {}): CreatureInstance => ({
  uid: 'test-1',
  speciesId: 'test',
  nickname: 'Testy',
  level: 5,
  xp: 0,
  currentHp: 50,
  maxHp: 50,
  attack: 10,
  defense: 10,
  speed: 10,
  moves: [
    { name: 'Tackle', power: 40, accuracy: 100, type: CreatureType.Normal, description: 'Test move' }
  ],
  ivs: { hp: 0, attack: 0, defense: 0, speed: 0 },
  ...overrides,
});

describe('BattleStateMachine', () => {
  let stateMachine: BattleStateMachine;
  let playerCreature: CreatureInstance;
  let wildCreature: CreatureInstance;
  let save: SaveData;

  beforeEach(() => {
    vi.clearAllMocks();
    playerCreature = createMockCreature({ uid: 'player-1', nickname: 'PlayerMon' });
    save = {
      party: [playerCreature],
      box: [],
      playerName: 'Player',
      playerX: 100,
      playerY: 100,
      wins: 0,
      caught: 0,
      items: [],
      version: 2,
    };
    wildCreature = createMockCreature({ uid: 'wild-1', nickname: 'WildMon' });
    stateMachine = new BattleStateMachine(save, playerCreature, wildCreature);
  });

  describe('constructor', () => {
    it('initializes with choosing phase', () => {
      expect(stateMachine.getPhase()).toBe('choosing');
    });

    it('stores player and wild creatures', () => {
      expect(stateMachine.getPlayerCreature()).toBe(playerCreature);
      expect(stateMachine.getWildCreature()).toBe(wildCreature);
    });
  });

  describe('getPhase', () => {
    it('returns current battle phase', () => {
      expect(stateMachine.getPhase()).toBe('choosing');
    });
  });

  describe('canTakeAction', () => {
    it('returns true when in choosing phase', () => {
      expect(stateMachine.canTakeAction()).toBe(true);
    });
  });

  describe('planAction - attack', () => {
    it('plans an attack action', () => {
      const move = playerCreature.moves[0];
      const result = stateMachine.planAction({ type: 'attack', move });
      
      expect(result.type).toBe('attack_result');
      expect(result.plannedTurns).toBeDefined();
      expect(result.plannedTurns!.length).toBeGreaterThan(0);
    });

    it('transitions to animating phase during attack', () => {
      const move = playerCreature.moves[0];
      stateMachine.planAction({ type: 'attack', move });
      // After planning, should be in animating phase
      expect(stateMachine.getPhase()).toBe('animating');
    });
  });

  describe('planAction - run', () => {
    it('returns run result', () => {
      const result = stateMachine.planAction({ type: 'run' });
      
      expect(result.type).toBe('run_result');
      expect(result.escaped).toBeDefined();
      expect(typeof result.escaped).toBe('boolean');
    });
  });

  describe('getAvailableSwitchTargets', () => {
    it('returns empty array when no other creatures', () => {
      const available = stateMachine.getAvailableSwitchTargets();
      expect(available).toEqual([]);
    });

    it('returns available creatures when present', () => {
      const otherCreature = createMockCreature({ uid: 'other-1', nickname: 'OtherMon' });
      save.party.push(otherCreature);
      
      const available = stateMachine.getAvailableSwitchTargets();
      expect(available.length).toBe(1);
      expect(available[0].uid).toBe('other-1');
    });

    it('excludes fainted creatures', () => {
      const faintedCreature = createMockCreature({ uid: 'fainted-1', currentHp: 0 });
      save.party.push(faintedCreature);
      
      const available = stateMachine.getAvailableSwitchTargets();
      expect(available).toEqual([]);
    });
  });

  describe('hasAliveCreatures', () => {
    it('returns true when creatures have HP', () => {
      expect(stateMachine.hasAliveCreatures()).toBe(true);
    });

    it('returns false when all creatures fainted', () => {
      save.party[0].currentHp = 0;
      expect(stateMachine.hasAliveCreatures()).toBe(false);
    });
  });

  describe('switchToFaintedCreature', () => {
    it('switches player creature', () => {
      const newCreature = createMockCreature({ uid: 'new-1', nickname: 'NewMon' });
      stateMachine.switchToFaintedCreature(newCreature);
      
      expect(stateMachine.getPlayerCreature()).toBe(newCreature);
      expect(stateMachine.getPhase()).toBe('choosing');
    });
  });

  describe('forced switch after faint', () => {
    it('sets phase to choosing when player faints with other creatures available', () => {
      const otherCreature = createMockCreature({ uid: 'other-1', nickname: 'OtherMon' });
      save.party.push(otherCreature);
      
      // Simulate player creature fainting
      playerCreature.currentHp = 0;
      
      // Call onTurnsComplete which triggers handlePlayerFainted
      const result = stateMachine.onTurnsComplete();
      
      expect(result.switchRequired).toBe(true);
      expect(result.playerFainted).toBe(true);
      expect(stateMachine.getPhase()).toBe('choosing');
      expect(stateMachine.canTakeAction()).toBe(true);
    });

    it('getAvailableSwitchTargets excludes fainted current creature', () => {
      const otherCreature = createMockCreature({ uid: 'other-1', nickname: 'OtherMon', currentHp: 30 });
      const faintedCreature = createMockCreature({ uid: 'fainted-1', nickname: 'FaintedMon', currentHp: 0 });
      save.party.push(otherCreature, faintedCreature);
      
      // Current creature faints
      playerCreature.currentHp = 0;
      
      const available = stateMachine.getAvailableSwitchTargets();
      
      // Should only include otherCreature (alive and not current)
      expect(available.length).toBe(1);
      expect(available[0].uid).toBe('other-1');
    });

    it('allows forced switch after faint', () => {
      const otherCreature = createMockCreature({ uid: 'other-1', nickname: 'OtherMon' });
      save.party.push(otherCreature);
      
      // Simulate faint
      playerCreature.currentHp = 0;
      stateMachine.onTurnsComplete();
      
      // Should be able to switch
      expect(stateMachine.canTakeAction()).toBe(true);
      
      stateMachine.switchToFaintedCreature(otherCreature);
      expect(stateMachine.getPlayerCreature()).toBe(otherCreature);
    });
  });

  describe('applyTurnDamage', () => {
    it('applies damage from a planned turn', () => {
      const move = playerCreature.moves[0];
      const result = stateMachine.planAction({ type: 'attack', move });
      
      const plannedTurn = result.plannedTurns![0].planned;
      const turnResult = stateMachine.applyTurnDamage(plannedTurn);
      
      expect(turnResult.damage).toBe(10);
      expect(turnResult.defenderHpAfter).toBe(40);
    });
  });

  describe('checkTurnResult', () => {
    it('detects player fainted', () => {
      playerCreature.currentHp = 0;
      const check = stateMachine.checkTurnResult({} as any);
      expect(check.playerFainted).toBe(true);
    });

    it('detects wild fainted', () => {
      wildCreature.currentHp = 0;
      const check = stateMachine.checkTurnResult({} as any);
      expect(check.wildFainted).toBe(true);
    });

    it('returns shouldContinue when no faints', () => {
      const check = stateMachine.checkTurnResult({} as any);
      expect(check.shouldContinue).toBe(true);
    });
  });
});
