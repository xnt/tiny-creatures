import Phaser from 'phaser';
import { TouchInputController } from './TouchInputController';

/**
 * Normalized movement intent produced by input sources.
 * Values are -1, 0, or 1 for each axis.
 */
export interface MovementIntent {
  x: number; // -1 (left), 0 (none), 1 (right)
  y: number; // -1 (up), 0 (none), 1 (down)
}

/**
 * Consumes keyboard and touch input events and produces normalized MovementIntent.
 * Handles merging of multiple input sources (keyboard arrows, WASD, touch D-pad).
 */
export class OverworldInputController {
  private scene: Phaser.Scene;
  private touchInput: TouchInputController;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, touchInput?: TouchInputController) {
    this.scene = scene;
    this.touchInput = touchInput ?? new TouchInputController(scene);
    this.setupKeyboard();
  }

  private setupKeyboard(): void {
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  /**
   * Get the touch input controller (for external access if needed).
   */
  getTouchInput(): TouchInputController {
    return this.touchInput;
  }

  /**
   * Returns the current movement intent, normalized.
   * Merges keyboard (arrows + WASD) with touch D-pad input.
   */
  getMovementIntent(): MovementIntent {
    const dpadDir = this.touchInput.getDirection();

    // Check each direction from any input source
    const left = this.cursors?.left.isDown || this.wasd?.A.isDown || dpadDir.x < 0;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown || dpadDir.x > 0;
    const up = this.cursors?.up.isDown || this.wasd?.W.isDown || dpadDir.y < 0;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown || dpadDir.y > 0;

    // Normalize: if both left and right pressed, x=0; same for up/down
    const x = left === right ? 0 : left ? -1 : 1;
    const y = up === down ? 0 : up ? -1 : 1;

    return { x, y };
  }

  /**
   * Check if any movement input is active.
   */
  isMovementActive(): boolean {
    const intent = this.getMovementIntent();
    return intent.x !== 0 || intent.y !== 0;
  }

  /**
   * Destroy any resources if needed.
   */
  destroy(): void {
    // Keyboard keys are managed by Phaser scene; no explicit cleanup needed
    // TouchInputController owns its own graphics
  }
}
