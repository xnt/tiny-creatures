import Phaser from 'phaser';
import { deleteSave, hasSave, loadGame } from '../core/saveManager';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f3460, 0x0f3460, 1);
    bg.fillRect(0, 0, w, h);

    this.add.text(w / 2, 40, '⚙  SETTINGS', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    let yPos = 120;

    // ── Save info ──
    if (hasSave()) {
      const save = loadGame();
      if (save) {
        this.add.text(w / 2, yPos, 'Save Data Found', {
          fontSize: '16px', fontFamily: 'monospace', color: '#88ff88',
        }).setOrigin(0.5);
        yPos += 30;

        this.add.text(w / 2, yPos, [
          `Party: ${save.party.length} creature(s)`,
          `Box: ${save.box.length} creature(s)`,
          `Wins: ${save.wins}`,
          `Caught: ${save.caught}`,
          `Lead: ${save.party[0]?.nickname ?? 'None'} Lv.${save.party[0]?.level ?? 0}`,
        ].join('\n'), {
          fontSize: '13px', fontFamily: 'monospace', color: '#aaaacc',
          align: 'center', lineSpacing: 4,
        }).setOrigin(0.5, 0);
        yPos += 120;
      }
    } else {
      this.add.text(w / 2, yPos, 'No save data found.', {
        fontSize: '14px', fontFamily: 'monospace', color: '#ff8888',
      }).setOrigin(0.5);
      yPos += 40;
    }

    // ── Fresh Start button ──
    this.createButton(w / 2, yPos, '🗑  FRESH START', 0x882222, () => {
      this.showConfirmDialog(w, h);
    });
    yPos += 60;

    // ── Back button ──
    this.createButton(w / 2, yPos, '← Back to Title', 0x333355, () => {
      this.scene.start('BootScene');
    });
  }

  private showConfirmDialog(w: number, h: number): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);

    const boxW = 320, boxH = 160;
    const bx = w / 2 - boxW / 2, by = h / 2 - boxH / 2;
    overlay.fillStyle(0x222244, 1);
    overlay.fillRoundedRect(bx, by, boxW, boxH, 10);
    overlay.lineStyle(2, 0xff4444, 1);
    overlay.strokeRoundedRect(bx, by, boxW, boxH, 10);

    this.add.text(w / 2, by + 25, '⚠  Are you sure?', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ff6644', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(w / 2, by + 55, 'This will delete ALL save data.\nThis cannot be undone!', {
      fontSize: '12px', fontFamily: 'monospace', color: '#cccccc', align: 'center',
    }).setOrigin(0.5);

    // Confirm
    const confirmBtn = this.add.graphics();
    const cbw = 120, cbh = 35;
    confirmBtn.fillStyle(0xcc2222, 1);
    confirmBtn.fillRoundedRect(w / 2 - cbw - 10, by + 100, cbw, cbh, 6);
    this.add.text(w / 2 - cbw / 2 - 10, by + 117, 'DELETE', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const confirmZone = this.add.zone(w / 2 - cbw / 2 - 10, by + 117, cbw, cbh).setInteractive({ useHandCursor: true });
    confirmZone.on('pointerdown', () => {
      deleteSave();
      this.scene.start('BootScene');
    });

    // Cancel
    const cancelBtn = this.add.graphics();
    cancelBtn.fillStyle(0x444466, 1);
    cancelBtn.fillRoundedRect(w / 2 + 10, by + 100, cbw, cbh, 6);
    this.add.text(w / 2 + cbw / 2 + 10, by + 117, 'CANCEL', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const cancelZone = this.add.zone(w / 2 + cbw / 2 + 10, by + 117, cbw, cbh).setInteractive({ useHandCursor: true });
    cancelZone.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private createButton(x: number, y: number, label: string, color: number, callback: () => void): void {
    const bw = 220, bh = 40;
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    bg.lineStyle(2, 0x666688, 1);
    bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);

    this.add.text(x, y, label, {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.7);
      bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
      bg.lineStyle(2, 0xaaaacc, 1);
      bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
      bg.lineStyle(2, 0x666688, 1);
      bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    });
    zone.on('pointerdown', callback);
  }
}