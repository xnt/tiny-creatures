import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser before importing the controller
vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        KeyCodes: {
          W: 87,
          A: 65,
          S: 83,
          D: 68,
        },
      },
    },
  },
}));

import { OverworldInputController, MovementIntent } from './OverworldInputController';
import { TouchInputController } from './TouchInputController';

const createMockKey = (isDown = false) => ({
  isDown,
  isUp: !isDown,
});

const createMockKeyboard = () => {
  const cursors = {
    up: createMockKey(false),
    down: createMockKey(false),
    left: createMockKey(false),
    right: createMockKey(false),
  };
  return {
    createCursorKeys: vi.fn(() => cursors),
    addKey: vi.fn((code) => createMockKey(false)),
  };
};

const createMockScene = () => ({
  cameras: {
    main: {
      height: 600,
    },
  },
  input: {
    keyboard: createMockKeyboard(),
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

const createMockTouchInput = (dir = { x: 0, y: 0 }) => ({
  getDirection: vi.fn(() => ({ ...dir })),
  isActive: vi.fn(() => dir.x !== 0 || dir.y !== 0),
}) as unknown as TouchInputController;

describe('OverworldInputController', () => {
  let controller: OverworldInputController;
  let mockScene: ReturnType<typeof createMockScene>;
  let mockTouchInput: ReturnType<typeof createMockTouchInput>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = createMockScene();
    mockTouchInput = createMockTouchInput();
    controller = new OverworldInputController(
      mockScene as unknown as Phaser.Scene,
      mockTouchInput
    );
  });

  describe('constructor', () => {
    it('creates controller with injected TouchInputController', () => {
      expect(controller).toBeDefined();
      expect(controller.getTouchInput()).toBe(mockTouchInput);
    });

    it('accepts a custom TouchInputController', () => {
      const customTouch = createMockTouchInput({ x: 1, y: 0 });
      const ctrl = new OverworldInputController(mockScene as unknown as Phaser.Scene, customTouch);
      expect(ctrl.getTouchInput()).toBe(customTouch);
    });
  });

  describe('getMovementIntent', () => {
    it('returns zero intent initially', () => {
      const intent = controller.getMovementIntent();
      expect(intent).toEqual({ x: 0, y: 0 });
    });

    it('returns x: -1 when left is pressed (keyboard)', () => {
      // Simulate left key down
      mockScene.input.keyboard.createCursorKeys().left.isDown = true;
      const intent = controller.getMovementIntent();
      expect(intent.x).toBe(-1);
    });

    it('returns x: 1 when right is pressed (keyboard)', () => {
      mockScene.input.keyboard.createCursorKeys().right.isDown = true;
      const intent = controller.getMovementIntent();
      expect(intent.x).toBe(1);
    });

    it('returns y: -1 when up is pressed (keyboard)', () => {
      mockScene.input.keyboard.createCursorKeys().up.isDown = true;
      const intent = controller.getMovementIntent();
      expect(intent.y).toBe(-1);
    });

    it('returns y: 1 when down is pressed (keyboard)', () => {
      mockScene.input.keyboard.createCursorKeys().down.isDown = true;
      const intent = controller.getMovementIntent();
      expect(intent.y).toBe(1);
    });

    it('normalizes opposing horizontal inputs to x: 0', () => {
      const cursors = mockScene.input.keyboard.createCursorKeys();
      cursors.left.isDown = true;
      cursors.right.isDown = true;
      const intent = controller.getMovementIntent();
      expect(intent.x).toBe(0);
    });

    it('normalizes opposing vertical inputs to y: 0', () => {
      const cursors = mockScene.input.keyboard.createCursorKeys();
      cursors.up.isDown = true;
      cursors.down.isDown = true;
      const intent = controller.getMovementIntent();
      expect(intent.y).toBe(0);
    });
  });

  describe('isMovementActive', () => {
    it('returns false when no input', () => {
      expect(controller.isMovementActive()).toBe(false);
    });

    it('returns true when there is horizontal input', () => {
      mockScene.input.keyboard.createCursorKeys().left.isDown = true;
      expect(controller.isMovementActive()).toBe(true);
    });

    it('returns true when there is vertical input', () => {
      mockScene.input.keyboard.createCursorKeys().up.isDown = true;
      expect(controller.isMovementActive()).toBe(true);
    });

    it('returns false when opposing inputs cancel out', () => {
      const cursors = mockScene.input.keyboard.createCursorKeys();
      cursors.left.isDown = true;
      cursors.right.isDown = true;
      expect(controller.isMovementActive()).toBe(false);
    });
  });

  describe('getTouchInput', () => {
    it('returns the touch input controller', () => {
      const touch = controller.getTouchInput();
      expect(touch).toBeDefined();
      expect(touch.getDirection).toBeDefined();
    });
  });

  describe('touch + keyboard merging', () => {
    it('merges touch left with keyboard input', () => {
      // Create controller with touch pointing left
      const touchLeft = createMockTouchInput({ x: -1, y: 0 });
      const ctrl = new OverworldInputController(mockScene as unknown as Phaser.Scene, touchLeft);
      const intent = ctrl.getMovementIntent();
      expect(intent.x).toBe(-1);
    });

    it('merges touch up with keyboard input', () => {
      const touchUp = createMockTouchInput({ x: 0, y: -1 });
      const ctrl = new OverworldInputController(mockScene as unknown as Phaser.Scene, touchUp);
      const intent = ctrl.getMovementIntent();
      expect(intent.y).toBe(-1);
    });
  });
});
