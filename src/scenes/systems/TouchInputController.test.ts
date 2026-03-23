import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TouchInputController } from './TouchInputController';

const createMockScene = () => ({
  cameras: {
    main: {
      height: 600,
    },
  },
  add: {
    graphics: vi.fn(() => ({
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
    })),
    zone: vi.fn(() => ({
      setInteractive: vi.fn().mockReturnThis(),
      on: vi.fn(),
    })),
  },
});

describe('TouchInputController', () => {
  let controller: TouchInputController;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    controller = new TouchInputController(mockScene as unknown as Phaser.Scene);
  });

  describe('getDirection', () => {
    it('returns zero direction initially', () => {
      const dir = controller.getDirection();
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('returns a copy of the direction', () => {
      const dir1 = controller.getDirection();
      const dir2 = controller.getDirection();
      expect(dir1).not.toBe(dir2); // Different objects
      expect(dir1.x).toBe(dir2.x);
      expect(dir1.y).toBe(dir2.y);
    });
  });

  describe('isActive', () => {
    it('returns false initially', () => {
      expect(controller.isActive()).toBe(false);
    });
  });
});
