import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser completely before any imports
vi.mock('phaser', () => ({
  default: {},
}));

vi.mock('../../core/creatureFactory', () => ({
  xpForLevel: vi.fn((level: number) => level * 100),
}));

vi.mock('../../data/creatures', () => ({
  getSpeciesById: vi.fn(() => ({ type: 'fire' })),
}));

import { BattleHud, BattleHudModel } from './BattleHud';
import { CreatureInstance } from '../../core/types';

const createMockScene = () => ({
  cameras: {
    main: {
      width: 800,
      height: 600,
    },
  },
  add: {
    graphics: vi.fn(() => ({
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
    text: vi.fn(() => ({
      setText: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
  },
});

const createMockCreature = (
  nickname: string,
  currentHp: number,
  maxHp: number,
  level: number,
): CreatureInstance => ({
  uid: 'test-uid',
  speciesId: 'test-species',
  nickname,
  level,
  xp: level * 100 + 50,
  maxHp,
  currentHp,
  attack: 10,
  defense: 10,
  speed: 10,
  moves: [],
  ivs: { hp: 0, attack: 0, defense: 0, speed: 0 },
});

const createMockModel = (
  playerHp: number = 20,
  wildHp: number = 15,
): BattleHudModel => ({
  playerCreature: createMockCreature('PlayerMon', playerHp, 20, 5),
  wildCreature: createMockCreature('WildMon', wildHp, 15, 3),
});

describe('BattleHud', () => {
  let hud: BattleHud;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = createMockScene();
    hud = new BattleHud(mockScene as unknown as Phaser.Scene);
  });

  describe('constructor', () => {
    it('creates HUD instance', () => {
      expect(hud).toBeDefined();
    });
  });

  describe('create', () => {
    it('creates all HUD elements', () => {
      const model = createMockModel();
      hud.create(model);

      // Should create graphics for both HP bars and both backgrounds
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(4);
      // Should create text for player info, wild info, and XP
      expect(mockScene.add.text).toHaveBeenCalledTimes(3);
    });

    it('formats creature info correctly', () => {
      const model = createMockModel();
      hud.create(model);

      const textCalls = mockScene.add.text.mock.calls;
      // Check that player and wild info are in the calls
      const allTexts = textCalls.map((call: unknown[]) => call[2]).join(' ');
      expect(allTexts).toContain('PlayerMon');
      expect(allTexts).toContain('Lv.5');
      expect(allTexts).toContain('WildMon');
      expect(allTexts).toContain('Lv.3');
    });

    it('calculates XP display correctly', () => {
      const model = createMockModel();
      hud.create(model);

      const textCalls = mockScene.add.text.mock.calls;
      // Check that XP is in one of the calls
      const allTexts = textCalls.map((call: unknown[]) => call[2]).join(' ');
      expect(allTexts).toContain('XP:');
    });
  });

  describe('update', () => {
    it('updates HP bars when creature takes damage', () => {
      const model = createMockModel(20, 15);
      hud.create(model);

      // Get the graphics instances created
      const graphicsCalls = mockScene.add.graphics.mock.results;
      
      // Clear any previous calls on all graphics
      graphicsCalls.forEach((result) => {
        if (result.value && result.value.clear) {
          result.value.clear.mockClear();
        }
      });

      // Update with damage
      const damagedModel = createMockModel(10, 5);
      hud.update(damagedModel);

      // Should have called clear on at least one HP bar
      const anyCleared = graphicsCalls.some(
        (result) => result.value && result.value.clear && result.value.clear.mock.calls.length > 0
      );
      expect(anyCleared).toBe(true);
    });

    it('updates text when creature info changes', () => {
      const model = createMockModel();
      hud.create(model);

      const textInstances = mockScene.add.text.mock.results;
      const playerInfoText = textInstances[0].value;

      // Update with new info
      const updatedModel = createMockModel();
      updatedModel.playerCreature.nickname = 'NewName';
      hud.update(updatedModel);

      expect(playerInfoText.setText).toHaveBeenCalledWith(expect.stringContaining('NewName'));
    });
  });

  describe('getCreaturePositions', () => {
    it('returns correct player creature position', () => {
      const model = createMockModel();
      hud.create(model);

      const x = hud.getPlayerCreatureX();
      const y = hud.getPlayerCreatureY();

      expect(x).toBe(200); // 800 * 0.25
      expect(y).toBe(252); // 600 * 0.42
    });

    it('returns correct wild creature position', () => {
      const model = createMockModel();
      hud.create(model);

      const x = hud.getWildCreatureX();
      const y = hud.getWildCreatureY();

      expect(x).toBe(600); // 800 * 0.75
      expect(y).toBe(100); // 20 + 80
    });
  });

  describe('destroy', () => {
    it('destroys all HUD elements', () => {
      const model = createMockModel();
      hud.create(model);

      hud.destroy();

      // All graphics and text should be destroyed
      const graphicsInstances = mockScene.add.graphics.mock.results;
      const textInstances = mockScene.add.text.mock.results;

      graphicsInstances.forEach((result) => {
        if (result.value && result.value.destroy) {
          expect(result.value.destroy).toHaveBeenCalled();
        }
      });

      textInstances.forEach((result) => {
        if (result.value && result.value.destroy) {
          expect(result.value.destroy).toHaveBeenCalled();
        }
      });
    });
  });
});
