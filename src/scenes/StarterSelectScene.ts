import Phaser from 'phaser';
import { CREATURE_DEX } from '../data/creatures';
import { createCreature } from '../core/creatureFactory';
import { drawCreature, typeColor } from '../utils/creatureRenderer';
import { SaveData, SAVE_VERSION, CreatureType } from '../core/types';
import { saveGame } from '../core/saveManager';

/** Let the player pick one of three starters (one per main type) */
export class StarterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StarterSelectScene' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f3460, 0x0f3460, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, w, h);

    this.add.text(w / 2, 40, 'Choose Your Starter!', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Pick one starter per type (exclude normal — those are wild-only)
    const starters = [
      CREATURE_DEX.find(c => c.type === CreatureType.Fire)!,
      CREATURE_DEX.find(c => c.type === CreatureType.Water)!,
      CREATURE_DEX.find(c => c.type === CreatureType.Grass)!,
    ];

    const spacing = w / (starters.length + 1);

    starters.forEach((species, i) => {
      const cx = spacing * (i + 1);
      const cy = h * 0.42;

      // Draw creature
      drawCreature(this, cx, cy, species.shape);

      // Name + type
      this.add.text(cx, cy + 60, species.name, {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Type badge
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(typeColor(species.type), 1);
      badgeBg.fillRoundedRect(cx - 30, cy + 75, 60, 20, 4);
      this.add.text(cx, cy + 85, species.type.toUpperCase(), {
        fontSize: '11px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Description
      this.add.text(cx, cy + 110, species.description, {
        fontSize: '10px', fontFamily: 'monospace', color: '#aaaacc',
        wordWrap: { width: 140 }, align: 'center',
      }).setOrigin(0.5);

      // Stats preview
      const stats = species.baseStats;
      this.add.text(cx, cy + 150, `HP:${stats.hp} ATK:${stats.attack}\nDEF:${stats.defense} SPD:${stats.speed}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#88aacc', align: 'center',
      }).setOrigin(0.5);

      // Select button
      const btn = this.add.graphics();
      const bw = 100, bh = 32;
      btn.fillStyle(0x225588, 1);
      btn.fillRoundedRect(cx - bw / 2, cy + 175, bw, bh, 6);
      btn.lineStyle(2, 0x44aaff, 1);
      btn.strokeRoundedRect(cx - bw / 2, cy + 175, bw, bh, 6);

      this.add.text(cx, cy + 191, 'CHOOSE', {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      const zone = this.add.zone(cx, cy + 191, bw, bh).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => { btn.clear(); btn.fillStyle(0x336699, 1); btn.fillRoundedRect(cx - bw / 2, cy + 175, bw, bh, 6); btn.lineStyle(2, 0x66ccff, 1); btn.strokeRoundedRect(cx - bw / 2, cy + 175, bw, bh, 6); });
      zone.on('pointerout', () => { btn.clear(); btn.fillStyle(0x225588, 1); btn.fillRoundedRect(cx - bw / 2, cy + 175, bw, bh, 6); btn.lineStyle(2, 0x44aaff, 1); btn.strokeRoundedRect(cx - bw / 2, cy + 175, bw, bh, 6); });
      zone.on('pointerdown', () => this.selectStarter(species.id));
    });
  }

  private selectStarter(speciesId: string): void {
    const starter = createCreature(speciesId, 5);
    const save: SaveData = {
      party: [starter],
      box: [],
      playerName: 'Trainer',
      playerX: 400,
      playerY: 300,
      wins: 0,
      caught: 1,
      items: [],
      version: SAVE_VERSION,
    };
    saveGame(save);
    this.scene.start('OverworldScene', { save, fresh: true });
  }
}