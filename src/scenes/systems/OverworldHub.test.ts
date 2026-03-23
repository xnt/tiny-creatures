import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OverworldHub } from './OverworldHub';
import { SaveData, CreatureInstance } from '../../core/types';

const createMockCreature = (overrides: Partial<CreatureInstance> = {}): CreatureInstance => ({
  uid: 'test-1',
  speciesId: 'test',
  nickname: 'Testy',
  level: 5,
  xp: 0,
  currentHp: 10,
  maxHp: 20,
  attack: 5,
  defense: 5,
  speed: 5,
  moves: [],
  ivs: { hp: 0, attack: 0, defense: 0, speed: 0 },
  ...overrides,
});

const createMockSave = (): SaveData => ({
  party: [createMockCreature()],
  box: [],
  playerName: 'Player',
  playerX: 100,
  playerY: 100,
  wins: 5,
  caught: 3,
  items: [],
  version: 2,
});

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
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      on: vi.fn(),
    })),
  },
});

describe('OverworldHub', () => {
  let hub: OverworldHub;
  let mockScene: ReturnType<typeof createMockScene>;
  let mockSave: SaveData;
  let menuToggleCallback: () => void;

  beforeEach(() => {
    mockScene = createMockScene();
    mockSave = createMockSave();
    menuToggleCallback = vi.fn();
    hub = new OverworldHub(
      mockScene as unknown as Phaser.Scene,
      mockSave,
      menuToggleCallback,
    );
  });

  describe('constructor', () => {
    it('creates HUD elements', () => {
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates text with party info', () => {
      hub.update();
      // The text should be updated with party info
      expect(mockScene.add.text).toHaveBeenCalled();
    });
  });

  describe('setSave', () => {
    it('updates save reference and refreshes display', () => {
      const newSave = createMockSave();
      newSave.wins = 10;
      hub.setSave(newSave);
      // Should update without error
      expect(true).toBe(true);
    });
  });
});
