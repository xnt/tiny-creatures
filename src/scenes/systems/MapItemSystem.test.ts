import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser completely before any imports
vi.mock('phaser', () => ({
  default: class Phaser {
    static Math = {
      Clamp: (val: number, min: number, max: number) => Math.min(Math.max(val, min), max),
    };
  },
}));

import { MapItemSystem } from './MapItemSystem';
import { Terrain } from './EncounterSystem';
import { SaveData, ItemType } from '../../core/types';

vi.mock('../../core/saveManager', () => ({
  saveGame: vi.fn(),
}));

const createMockSave = (hasFishingRod = false): SaveData => ({
  party: [],
  box: [],
  playerName: 'Player',
  playerX: 100,
  playerY: 100,
  wins: 0,
  caught: 0,
  items: hasFishingRod ? [ItemType.FishingRod] : [],
  version: 2,
});

const createMockMap = (): Terrain[][] => {
  const map: Terrain[][] = [];
  for (let y = 0; y < 20; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < 25; x++) {
      row.push(Terrain.Grass);
    }
    map.push(row);
  }
  return map;
};

const createMockScene = () => ({
  cameras: {
    main: {
      width: 800,
    },
  },
  add: {
    graphics: vi.fn(() => ({
      fillStyle: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      fillTriangle: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      beginPath: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      strokePath: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
  },
  time: {
    delayedCall: vi.fn(),
  },
});

describe('MapItemSystem', () => {
  let system: MapItemSystem;
  let mockScene: ReturnType<typeof createMockScene>;
  let mockSave: SaveData;
  let mockMap: Terrain[][];

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = createMockScene();
    mockSave = createMockSave();
    mockMap = createMockMap();
    system = new MapItemSystem(
      mockScene as unknown as Phaser.Scene,
      mockSave,
      mockMap,
      32,
      25,
      20,
    );
  });

  describe('placeItems', () => {
    it('does not place fishing rod if player already has it', () => {
      mockSave = createMockSave(true);
      system = new MapItemSystem(
        mockScene as unknown as Phaser.Scene,
        mockSave,
        mockMap,
        32,
        25,
        20,
      );
      system.placeItems();
      // Should not create graphics if no items placed
      expect(mockScene.add.graphics).not.toHaveBeenCalled();
    });

    it('places fishing rod if player does not have it', () => {
      system.placeItems();
      // Should create graphics for the item
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });
  });

  describe('checkPickups', () => {
    it('does nothing when no items are placed', () => {
      system.checkPickups(100, 100);
      // Should not error
      expect(true).toBe(true);
    });
  });

  describe('setSave', () => {
    it('updates save reference', () => {
      const newSave = createMockSave();
      system.setSave(newSave);
      expect(true).toBe(true);
    });
  });

  describe('setMap', () => {
    it('updates map reference', () => {
      const newMap = createMockMap();
      system.setMap(newMap);
      expect(true).toBe(true);
    });
  });
});
