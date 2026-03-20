import Phaser from 'phaser';
import { loadGame, hasSave } from '../core/saveManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, w, h);

    // Title
    this.add.text(w / 2, h * 0.25, '🐾 TINY CREATURES 🐾', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.35, 'Gotta snag \'em all!', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Decorative creatures (little dots)
    for (let i = 0; i < 30; i++) {
      const dot = this.add.graphics();
      const dx = Math.random() * w;
      const dy = Math.random() * h;
      dot.fillStyle([0xff5533, 0x3399ff, 0x44cc44, 0xcccccc][Math.floor(Math.random() * 4)], 0.4);
      dot.fillCircle(dx, dy, 2 + Math.random() * 4);
    }

    const btnY = h * 0.55;
    const hasSaveFile = hasSave();

    if (hasSaveFile) {
      this.createButton(w / 2, btnY, 'Continue', () => {
        const save = loadGame();
        if (save) {
          this.scene.start('OverworldScene', { save });
        }
      });

      this.createButton(w / 2, btnY + 55, 'New Game', () => {
        this.scene.start('StarterSelectScene');
      });
    } else {
      this.createButton(w / 2, btnY, 'New Game', () => {
        this.scene.start('StarterSelectScene');
      });
    }

    this.createButton(w / 2, hasSaveFile ? btnY + 110 : btnY + 55, '⚙ Settings', () => {
      this.scene.start('SettingsScene');
    });
  }

  private createButton(x: number, y: number, label: string, callback: () => void): void {
    const bg = this.add.graphics();
    const bw = 200;
    const bh = 40;
    bg.fillStyle(0x333355, 1);
    bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    bg.lineStyle(2, 0x6666aa, 1);
    bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);

    const text = this.add.text(x, y, label, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    const hitArea = this.add.zone(x, y, bw, bh).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => { bg.clear(); bg.fillStyle(0x444477, 1); bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8); bg.lineStyle(2, 0x8888cc, 1); bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8); });
    hitArea.on('pointerout', () => { bg.clear(); bg.fillStyle(0x333355, 1); bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8); bg.lineStyle(2, 0x6666aa, 1); bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8); });
    hitArea.on('pointerdown', callback);
  }
}