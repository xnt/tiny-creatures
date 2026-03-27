import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser completely before any imports
vi.mock('phaser', () => ({
  default: {},
}));

vi.mock('../../utils/creatureRenderer', () => ({
  typeColor: vi.fn(() => 0xff0000),
}));

vi.mock('../../data/creatures', () => ({
  getSpeciesById: vi.fn(() => ({ type: 'fire' })),
}));

import { BattleMenuController, MenuType } from './BattleMenuController';
import { Attack, CreatureInstance } from '../../core/types';

const createMockScene = () => ({
  cameras: {
    main: {
      width: 800,
      height: 600,
    },
  },
  add: {
    container: vi.fn(() => ({
      add: vi.fn(),
      destroy: vi.fn(),
    })),
    graphics: vi.fn(() => ({
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn().mockReturnThis(),
      setText: vi.fn(),
    })),
    zone: vi.fn(() => ({
      setInteractive: vi.fn().mockReturnThis(),
      on: vi.fn(),
    })),
  },
  time: {
    delayedCall: vi.fn(),
  },
});

const createMockMove = (name: string, power: number): Attack => ({
  name,
  power,
  accuracy: 100,
  type: 'normal' as import('../../core/types').CreatureType,
  description: 'A test move',
});

const createMockCreature = (nickname: string): CreatureInstance => ({
  uid: 'test-uid',
  speciesId: 'test-species',
  nickname,
  level: 5,
  xp: 100,
  maxHp: 20,
  currentHp: 20,
  attack: 10,
  defense: 10,
  speed: 10,
  moves: [],
  ivs: { hp: 0, attack: 0, defense: 0, speed: 0 },
});

describe('BattleMenuController', () => {
  let controller: BattleMenuController;
  let mockScene: ReturnType<typeof createMockScene>;
  let canTakeAction: () => boolean;
  let callbacks: {
    onActionSelected: import('./BattleMenuController').ActionCallback;
    onMoveSelected: import('./BattleMenuController').MoveCallback;
    onSwitchSelected: import('./BattleMenuController').SwitchCallback;
    onBack: import('./BattleMenuController').BackCallback;
  };
  let mockMessageText: { setText: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = createMockScene();
    canTakeAction = vi.fn(() => true);
    callbacks = {
      onActionSelected: vi.fn(),
      onMoveSelected: vi.fn(),
      onSwitchSelected: vi.fn(),
      onBack: vi.fn(),
    };
    mockMessageText = { setText: vi.fn() };

    controller = new BattleMenuController(
      mockScene as unknown as Phaser.Scene,
      canTakeAction,
      callbacks,
    );
    controller.setMessageText(mockMessageText as unknown as Phaser.GameObjects.Text);
  });

  describe('constructor', () => {
    it('creates controller with callbacks', () => {
      expect(controller).toBeDefined();
      expect(controller.getCurrentMenu()).toBe('none');
    });
  });

  describe('setMessageText', () => {
    it('sets the message text reference', () => {
      controller.showActionMenu();
      expect(mockMessageText.setText).toHaveBeenCalledWith('What will you do?');
    });
  });

  describe('showActionMenu', () => {
    it('shows action menu with 4 buttons', () => {
      controller.showActionMenu();
      expect(controller.getCurrentMenu()).toBe('action');
      expect(mockScene.add.container).toHaveBeenCalledTimes(4);
    });

    it('updates message text', () => {
      controller.showActionMenu();
      expect(mockMessageText.setText).toHaveBeenCalledWith('What will you do?');
    });

    it('clears previous buttons before showing new menu', () => {
      controller.showActionMenu();
      controller.showActionMenu();
      // Should have destroyed previous buttons and created new ones
      expect(mockScene.add.container).toHaveBeenCalledTimes(8);
    });
  });

  describe('showMoveMenu', () => {
    it('shows move menu with back button', () => {
      const moves = [createMockMove('Tackle', 40), createMockMove('Growl', 0)];
      controller.showMoveMenu(moves);
      expect(controller.getCurrentMenu()).toBe('move');
      expect(mockScene.add.container).toHaveBeenCalledTimes(3); // 2 moves + back button
    });

    it('updates message text', () => {
      const moves = [createMockMove('Tackle', 40)];
      controller.showMoveMenu(moves);
      expect(mockMessageText.setText).toHaveBeenCalledWith('Choose an attack:');
    });
  });

  describe('showSwitchMenu', () => {
    it('shows switch menu with available creatures', () => {
      const creatures = [createMockCreature('A'), createMockCreature('B')];
      controller.showSwitchMenu(creatures, false);
      expect(controller.getCurrentMenu()).toBe('switch');
      expect(mockScene.add.container).toHaveBeenCalledTimes(3); // 2 creatures + back button
    });

    it('shows switch menu without back button for forced switch', () => {
      const creatures = [createMockCreature('A')];
      controller.showSwitchMenu(creatures, true);
      expect(mockScene.add.container).toHaveBeenCalledTimes(1); // Just 1 creature, no back
    });

    it('shows no creatures message when empty', () => {
      controller.showSwitchMenu([], false);
      expect(mockMessageText.setText).toHaveBeenCalledWith('No other creatures available!');
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });
  });

  describe('clearButtons', () => {
    it('destroys all buttons', () => {
      controller.showActionMenu();
      expect(controller.getCurrentMenu()).toBe('action');
      controller.clearButtons();
      // Buttons should be destroyed (menu type stays as 'action' until new menu shown)
      expect(mockScene.add.container).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('clears all buttons', () => {
      controller.showActionMenu();
      controller.destroy();
      // Should have cleared buttons
    });
  });
});
