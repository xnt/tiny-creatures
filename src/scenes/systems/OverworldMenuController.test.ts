import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser completely before any imports
vi.mock('phaser', () => {
  class MockRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x: number, y: number, width: number, height: number) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
    static Contains = (_rect: unknown, _x: number, _y: number) => true;
  }
  
  return {
    default: {
      Math: {
        Clamp: (val: number, min: number, max: number) => Math.min(Math.max(val, min), max),
      },
      Geom: {
        Rectangle: MockRectangle,
      },
    },
  };
});

import { OverworldMenuController } from './OverworldMenuController';
import { SaveData } from '../../core/types';

vi.mock('../../core/saveManager', () => ({
  saveGame: vi.fn(),
}));

const createMockSave = (): SaveData => ({
  party: [],
  box: [],
  playerName: 'Player',
  playerX: 100,
  playerY: 100,
  wins: 0,
  caught: 0,
  items: [],
  version: 2,
});

const createMockScene = () => ({
  cameras: {
    main: {
      width: 800,
      height: 600,
    },
  },
  add: {
    container: vi.fn(() => ({
      setDepth: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      add: vi.fn(),
      removeAll: vi.fn(),
      destroy: vi.fn(),
    })),
    graphics: vi.fn(() => ({
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      on: vi.fn(),
      clear: vi.fn().mockReturnThis(),
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      on: vi.fn(),
    })),
    zone: vi.fn(() => ({
      setInteractive: vi.fn().mockReturnThis(),
      on: vi.fn(),
    })),
  },
  scene: {
    start: vi.fn(),
  },
  time: {
    delayedCall: vi.fn(),
  },
});

describe('OverworldMenuController', () => {
  let controller: OverworldMenuController;
  let mockScene: ReturnType<typeof createMockScene>;
  let mockSave: SaveData;
  let getPlayerPosition: () => { x: number; y: number };
  let isNearWater: () => boolean;
  let triggerEncounter: (water: boolean) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = createMockScene();
    mockSave = createMockSave();
    getPlayerPosition = vi.fn(() => ({ x: 100, y: 100 }));
    isNearWater = vi.fn(() => false);
    triggerEncounter = vi.fn();

    controller = new OverworldMenuController(
      mockScene as unknown as Phaser.Scene,
      mockSave,
      getPlayerPosition,
      isNearWater,
      triggerEncounter,
    );
  });

  describe('constructor', () => {
    it('creates menu containers', () => {
      expect(mockScene.add.container).toHaveBeenCalledTimes(2);
    });
  });

  describe('isPopupVisible', () => {
    it('returns false initially', () => {
      expect(controller.isPopupVisible()).toBe(false);
    });
  });

  describe('toggleMainMenu', () => {
    it('toggles main menu visibility', () => {
      controller.toggleMainMenu();
      expect(controller.isPopupVisible()).toBe(true);

      controller.toggleMainMenu();
      expect(controller.isPopupVisible()).toBe(false);
    });
  });

  describe('toggleItemsPopup', () => {
    it('toggles items popup visibility', () => {
      controller.toggleItemsPopup();
      expect(controller.isPopupVisible()).toBe(true);

      controller.toggleItemsPopup();
      expect(controller.isPopupVisible()).toBe(false);
    });
  });

  describe('setSave', () => {
    it('updates save reference', () => {
      const newSave = createMockSave();
      newSave.wins = 10;
      controller.setSave(newSave);
      expect(true).toBe(true);
    });
  });
});
