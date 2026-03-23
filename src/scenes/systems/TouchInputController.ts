import Phaser from 'phaser';

/**
 * Manages virtual D-pad touch controls for mobile/touch devices.
 * Provides directional input via on-screen buttons.
 */
export class TouchInputController {
  private scene: Phaser.Scene;
  private dpadDir: { x: number; y: number } = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const h = this.scene.cameras.main.height;
    const cx = 90; // centre of the D-pad
    const cy = h - 90;
    const btnSize = 40; // each direction button
    const gap = 2;
    const alpha = 0.3; // resting opacity
    const alphaActive = 0.55; // pressed opacity

    // Centre circle (cosmetic)
    const centre = this.scene.add.graphics();
    centre.fillStyle(0xffffff, alpha * 0.4);
    centre.fillCircle(cx, cy, 12);

    const makeDpadBtn = (
      ox: number,
      oy: number,
      dirX: number,
      dirY: number,
      arrow: string,
    ) => {
      const bx = cx + ox - btnSize / 2;
      const by = cy + oy - btnSize / 2;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0xffffff, alpha);
      bg.fillRoundedRect(bx, by, btnSize, btnSize, 6);

      this.scene.add
        .text(cx + ox, cy + oy, arrow, {
          fontSize: '18px',
          fontFamily: 'monospace',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setAlpha(alpha + 0.15);

      const zone = this.scene.add
        .zone(cx + ox, cy + oy, btnSize, btnSize)
        .setInteractive({ useHandCursor: false });

      zone.on('pointerdown', () => {
        this.dpadDir.x = dirX;
        this.dpadDir.y = dirY;
        bg.clear();
        bg.fillStyle(0xffffff, alphaActive);
        bg.fillRoundedRect(bx, by, btnSize, btnSize, 6);
      });

      // Release on this specific button
      zone.on('pointerup', () => {
        if (dirX !== 0) this.dpadDir.x = 0;
        if (dirY !== 0) this.dpadDir.y = 0;
        bg.clear();
        bg.fillStyle(0xffffff, alpha);
        bg.fillRoundedRect(bx, by, btnSize, btnSize, 6);
      });
      zone.on('pointerout', () => {
        if (dirX !== 0) this.dpadDir.x = 0;
        if (dirY !== 0) this.dpadDir.y = 0;
        bg.clear();
        bg.fillStyle(0xffffff, alpha);
        bg.fillRoundedRect(bx, by, btnSize, btnSize, 6);
      });
    };

    const offset = btnSize + gap;
    makeDpadBtn(0, -offset, 0, -1, '\u25B2'); // Up
    makeDpadBtn(0, offset, 0, 1, '\u25BC'); // Down
    makeDpadBtn(-offset, 0, -1, 0, '\u25C0'); // Left
    makeDpadBtn(offset, 0, 1, 0, '\u25B6'); // Right
  }

  /**
   * Returns the current D-pad direction.
   * x: -1 (left), 0 (none), 1 (right)
   * y: -1 (up), 0 (none), 1 (down)
   */
  getDirection(): { x: number; y: number } {
    return { ...this.dpadDir };
  }

  /**
   * Returns true if any D-pad direction is active.
   */
  isActive(): boolean {
    return this.dpadDir.x !== 0 || this.dpadDir.y !== 0;
  }
}
