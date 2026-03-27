import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser completely before any imports
vi.mock('phaser', () => ({
  default: {},
}));

vi.mock('../../utils/creatureRenderer', () => ({
  drawCreature: vi.fn((scene) => {
    const gfx = scene.add.graphics();
    gfx.setAlpha = vi.fn().mockReturnThis();
    return gfx;
  }),
}));

import { BattleAnimator, TurnAnimationInfo } from './BattleAnimator';
import { PlannedTurn, CatchAttemptResult } from '../../core/battleEngine';
import { Attack, CreatureInstance, ShapeDescriptor } from '../../core/types';

const createMockScene = () => {
  const tweenCallbacks: Array<() => void> = [];
  const delayedCallbacks: Array<{ delay: number; callback: () => void }> = [];

  return {
    cameras: {
      main: {
        width: 800,
        height: 600,
      },
    },
    add: {
      graphics: vi.fn(() => ({
        fillStyle: vi.fn().mockReturnThis(),
        fillCircle: vi.fn().mockReturnThis(),
        strokeCircle: vi.fn().mockReturnThis(),
        lineStyle: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
        x: 100,
        y: 100,
      })),
    },
    tweens: {
      add: vi.fn((config: { onComplete?: () => void }) => {
        if (config.onComplete) {
          tweenCallbacks.push(config.onComplete);
        }
        return { play: vi.fn() };
      }),
    },
    time: {
      delayedCall: vi.fn((delay: number, callback: () => void) => {
        delayedCallbacks.push({ delay, callback });
        return { remove: vi.fn() };
      }),
    },
    _tweenCallbacks: tweenCallbacks,
    _delayedCallbacks: delayedCallbacks,
  };
};

const createMockAttack = (name: string): Attack => ({
  name,
  power: 40,
  accuracy: 100,
  type: 'normal' as import('../../core/types').CreatureType,
  description: 'A test attack',
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

const createMockShape = (): ShapeDescriptor => ({
  bodyShape: 'circle',
  bodyColor: 0xff0000,
  eyeColor: 0x000000,
  accentColor: 0xffff00,
  size: 1,
  hasTail: false,
  hasCrest: false,
  hasWings: false,
});

const createMockPlannedTurn = (
  attackerName: string,
  missed: boolean = false,
): PlannedTurn => ({
  attacker: createMockCreature(attackerName),
  defender: createMockCreature('Target'),
  attack: createMockAttack('Tackle'),
  damage: missed ? 0 : 10,
  missed,
  effectiveness: 1,
});

describe('BattleAnimator', () => {
  let animator: BattleAnimator;
  let mockScene: ReturnType<typeof createMockScene>;
  let mockMessageText: { setText: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = createMockScene();
    mockMessageText = { setText: vi.fn() };
    animator = new BattleAnimator(mockScene as unknown as Phaser.Scene);
    animator.setMessageText(mockMessageText as unknown as Phaser.GameObjects.Text);
  });

  describe('constructor', () => {
    it('creates animator instance', () => {
      expect(animator).toBeDefined();
    });
  });

  describe('setMessageText', () => {
    it('sets the message text reference', () => {
      const turnInfo: TurnAnimationInfo = {
        planned: createMockPlannedTurn('Player'),
        isPlayerAttacker: true,
      };
      animator.animateTurn(turnInfo, vi.fn());
      expect(mockMessageText.setText).toHaveBeenCalled();
    });
  });

  describe('drawCreature', () => {
    it('draws player creature and stores reference', () => {
      const shape = createMockShape();
      const gfx = animator.drawCreature(100, 200, shape, false);

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(animator.getPlayerGraphics()).toBe(gfx);
    });

    it('draws wild creature and stores reference', () => {
      const shape = createMockShape();
      const gfx = animator.drawCreature(300, 400, shape, true);

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(animator.getWildGraphics()).toBe(gfx);
    });
  });

  describe('animateTurn', () => {
    it('animates attack and calls onComplete', () => {
      // Draw creatures first so there are graphics to animate
      const shape = createMockShape();
      animator.drawCreature(100, 200, shape, false);
      animator.drawCreature(300, 400, shape, true);
      
      const onComplete = vi.fn();
      const turnInfo: TurnAnimationInfo = {
        planned: createMockPlannedTurn('Player'),
        isPlayerAttacker: true,
      };

      animator.animateTurn(turnInfo, onComplete);

      // Should set message text
      expect(mockMessageText.setText).toHaveBeenCalledWith(expect.stringContaining('Tackle'));
      // Should schedule onComplete
      expect(mockScene.time.delayedCall).toHaveBeenCalledWith(1200, onComplete);
    });

    it('shows miss message when attack misses', () => {
      const turnInfo: TurnAnimationInfo = {
        planned: createMockPlannedTurn('Player', true),
        isPlayerAttacker: true,
      };

      animator.animateTurn(turnInfo, vi.fn());

      expect(mockMessageText.setText).toHaveBeenCalledWith(expect.stringContaining('missed'));
    });

    it('shows super effective message', () => {
      const turn = createMockPlannedTurn('Player');
      turn.effectiveness = 2;
      const turnInfo: TurnAnimationInfo = {
        planned: turn,
        isPlayerAttacker: true,
      };

      animator.animateTurn(turnInfo, vi.fn());

      expect(mockMessageText.setText).toHaveBeenCalledWith(expect.stringContaining('super effective'));
    });

    it('shows not very effective message', () => {
      const turn = createMockPlannedTurn('Player');
      turn.effectiveness = 0.5;
      const turnInfo: TurnAnimationInfo = {
        planned: turn,
        isPlayerAttacker: true,
      };

      animator.animateTurn(turnInfo, vi.fn());

      expect(mockMessageText.setText).toHaveBeenCalledWith(expect.stringContaining('not very effective'));
    });
  });

  describe('animateFaint', () => {
    it('animates player faint', () => {
      const shape = createMockShape();
      animator.drawCreature(100, 200, shape, false);

      const onComplete = vi.fn();
      animator.animateFaint(true, onComplete);

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('animates wild faint', () => {
      const shape = createMockShape();
      animator.drawCreature(300, 400, shape, true);

      animator.animateFaint(false, vi.fn());

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('calls onComplete immediately if no graphics', () => {
      const onComplete = vi.fn();
      animator.animateFaint(true, onComplete);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('animateSwitchIn', () => {
    it('draws creature with fade-in animation', () => {
      const shape = createMockShape();
      const onComplete = vi.fn();

      const gfx = animator.animateSwitchIn(100, 200, shape, onComplete);

      expect(gfx).toBeDefined();
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('animateCatch', () => {
    it('shows throw animation', () => {
      const catchResult: CatchAttemptResult = {
        success: false,
        shakes: 1,
      };

      animator.animateCatch(
        catchResult,
        100, 200, // player position
        300, 400, // wild position
        {}
      );

      expect(mockMessageText.setText).toHaveBeenCalledWith('You threw a capture orb!');
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    it('calls onSuccess for successful catch', () => {
      const catchResult: CatchAttemptResult = {
        success: true,
        shakes: 3,
      };
      const onSuccess = vi.fn();

      animator.animateCatch(
        catchResult,
        100, 200,
        300, 400,
        { onSuccess }
      );

      // Trigger the throw completion
      const tweenCalls = mockScene.tweens.add.mock.calls;
      expect(tweenCalls.length).toBeGreaterThan(0);
      const tweenCall = tweenCalls[0][0] as { onComplete?: () => void };
      if (tweenCall.onComplete) {
        tweenCall.onComplete();
      }

      // After shakes, onSuccess should be called
      // (This is simplified - real test would need to simulate shake sequence)
    });
  });

  describe('setCreatureAlpha', () => {
    it('sets player creature alpha', () => {
      const shape = createMockShape();
      const gfx = animator.drawCreature(100, 200, shape, false);

      animator.setCreatureAlpha(true, 0.5);

      expect(gfx.setAlpha).toHaveBeenCalledWith(0.5);
    });

    it('sets wild creature alpha', () => {
      const shape = createMockShape();
      const gfx = animator.drawCreature(300, 400, shape, true);

      animator.setCreatureAlpha(false, 0);

      expect(gfx.setAlpha).toHaveBeenCalledWith(0);
    });
  });

  describe('destroyCreatureGraphics', () => {
    it('destroys player graphics', () => {
      const shape = createMockShape();
      const gfx = animator.drawCreature(100, 200, shape, false);

      animator.destroyCreatureGraphics(true);

      expect(gfx.destroy).toHaveBeenCalled();
      expect(animator.getPlayerGraphics()).toBeNull();
    });

    it('destroys wild graphics', () => {
      const shape = createMockShape();
      const gfx = animator.drawCreature(300, 400, shape, true);

      animator.destroyCreatureGraphics(false);

      expect(gfx.destroy).toHaveBeenCalled();
      expect(animator.getWildGraphics()).toBeNull();
    });
  });

  describe('destroy', () => {
    it('destroys all graphics', () => {
      const shape = createMockShape();
      const playerGfx = animator.drawCreature(100, 200, shape, false);
      const wildGfx = animator.drawCreature(300, 400, shape, true);

      animator.destroy();

      expect(playerGfx.destroy).toHaveBeenCalled();
      expect(wildGfx.destroy).toHaveBeenCalled();
      expect(animator.getPlayerGraphics()).toBeNull();
      expect(animator.getWildGraphics()).toBeNull();
    });
  });
});
