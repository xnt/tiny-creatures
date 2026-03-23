import Phaser from 'phaser';
import { SaveData } from '../../core/types';

/**
 * Manages the HUD display for the overworld scene.
 * Shows party info, stats, and the menu button.
 */
export class OverworldHub {
  private scene: Phaser.Scene;
  private save: SaveData;
  private partyText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private menuBtn!: Phaser.GameObjects.Text;
  private onMenuToggle: () => void;

  constructor(
    scene: Phaser.Scene,
    save: SaveData,
    onMenuToggle: () => void,
  ) {
    this.scene = scene;
    this.save = save;
    this.onMenuToggle = onMenuToggle;
    this.create();
  }

  private create(): void {
    const width = this.scene.cameras.main.width;

    // HUD background
    const hudBg = this.scene.add.graphics();
    hudBg.fillStyle(0x000000, 0.6);
    hudBg.fillRect(0, 0, width, 30);

    // Party text (left side)
    this.partyText = this.scene.add.text(10, 6, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });

    // Stats text (right side)
    this.statsText = this.scene.add.text(width - 10, 6, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(1, 0);

    // Menu button (center)
    this.menuBtn = this.scene.add.text(width / 2, 6, '[ MENU ]', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#aaaaff',
    })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    this.menuBtn.on('pointerdown', () => {
      this.onMenuToggle();
    });

    this.update();
  }

  /**
   * Updates the HUD display with current save data.
   */
  update(): void {
    const lead = this.save.party[0];
    if (lead) {
      this.partyText.setText(
        `${lead.nickname} Lv.${lead.level}  HP:${lead.currentHp}/${lead.maxHp}  Party:${this.save.party.length}`,
      );
    }
    this.statsText.setText(`Wins:${this.save.wins} Caught:${this.save.caught}`);
  }

  /**
   * Updates the save data reference and refreshes display.
   */
  setSave(save: SaveData): void {
    this.save = save;
    this.update();
  }

  /**
   * Destroys all HUD elements.
   */
  destroy(): void {
    this.partyText.destroy();
    this.statsText.destroy();
    this.menuBtn.destroy();
  }
}
