import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EncounterSystem, Terrain } from './EncounterSystem';
import { CreatureType, SaveData } from '../../core/types';

// Mock Phaser before importing
vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (val: number, min: number, max: number) => Math.min(Math.max(val, min), max),
    },
  },
}));

const createMockScene = () => ({
  scene: {
    start: vi.fn(),
  },
  time: {
    delayedCall: vi.fn(),
  },
});

const createMockSave = (): SaveData => ({
  party: [
    { uid: 'p1', speciesId: 'test1', nickname: 'Testy', level: 5, xp: 0, currentHp: 10, maxHp: 10, attack: 5, defense: 5, speed: 5, moves: [], ivs: { hp: 0, attack: 0, defense: 0, speed: 0 } },
  ],
  box: [],
  playerName: 'Player',
  playerX: 100,
  playerY: 100,
  wins: 0,
  caught: 0,
  items: [],
  version: 2,
});

describe('EncounterSystem', () => {
  let system: EncounterSystem;
  let mockScene: ReturnType<typeof createMockScene>;
  let mockSave: SaveData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = createMockScene();
    mockSave = createMockSave();
    system = new EncounterSystem(mockScene as unknown as Phaser.Scene, mockSave);
  });

  describe('updateCooldown', () => {
    it('decreases cooldown over time', () => {
      system.setCooldown(1000);
      expect(system.isInCooldown()).toBe(true);

      system.updateCooldown(500);
      expect(system.isInCooldown()).toBe(true);

      system.updateCooldown(500);
      expect(system.isInCooldown()).toBe(false);
    });
  });

  describe('checkEncounter', () => {
    const createMap = (): Terrain[][] => {
      const map: Terrain[][] = [];
      for (let y = 0; y < 10; y++) {
        const row: Terrain[] = [];
        for (let x = 0; x < 10; x++) {
          row.push(Terrain.Grass);
        }
        map.push(row);
      }
      return map;
    };

    it('does not trigger encounter when not moving', () => {
      const map = createMap();
      const result = system.checkEncounter(50, 50, false, map, 32);
      expect(result.triggered).toBe(false);
    });

    it('does not trigger encounter when in cooldown', () => {
      system.setCooldown(1000);
      const map = createMap();
      const result = system.checkEncounter(50, 50, true, map, 32);
      expect(result.triggered).toBe(false);
    });

    it('does not trigger encounter on regular grass', () => {
      const map = createMap();
      const result = system.checkEncounter(50, 50, true, map, 32);
      expect(result.triggered).toBe(false);
    });

    it('can trigger encounter on tall grass', () => {
      const map = createMap();
      map[1][1] = Terrain.TallGrass;

      // With very high chance config
      const highChanceSystem = new EncounterSystem(mockScene as unknown as Phaser.Scene, mockSave, {
        encounterChance: 1.0, // 100% chance
        encounterCooldownMs: 2000,
      });

      const result = highChanceSystem.checkEncounter(48, 48, true, map, 32);
      expect(result.triggered).toBe(true);
      expect(result.waterEncounter).toBe(false);
    });
  });

  describe('setCooldown', () => {
    it('sets cooldown to specified value', () => {
      system.setCooldown(5000);
      expect(system.isInCooldown()).toBe(true);
    });
  });

  describe('isInCooldown', () => {
    it('returns false when no cooldown', () => {
      expect(system.isInCooldown()).toBe(false);
    });

    it('returns true when cooldown active', () => {
      system.setCooldown(100);
      expect(system.isInCooldown()).toBe(true);
    });
  });
});
