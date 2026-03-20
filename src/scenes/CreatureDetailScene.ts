import Phaser from 'phaser';
import { CreatureInstance, SaveData, Attack } from '../core/types';
import { getSpeciesById } from '../data/creatures';
import { drawCreature, typeColor } from '../utils/creatureRenderer';
import { xpForLevel } from '../core/creatureFactory';

interface DetailData {
  creature: CreatureInstance;
  save: SaveData;
  returnScene: string;
}

export class CreatureDetailScene extends Phaser.Scene {
  private creature!: CreatureInstance;
  private save!: SaveData;
  private returnScene!: string;

  constructor() {
    super({ key: 'CreatureDetailScene' });
  }

  init(data: DetailData): void {
    this.creature = data.creature;
    this.save = data.save;
    this.returnScene = data.returnScene;
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const species = getSpeciesById(this.creature.speciesId)!;

    // ── Background ──
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, w, h);

    // ── Left panel: creature visual ──
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x222244, 0.8);
    panelBg.fillRoundedRect(20, 20, w * 0.4 - 10, h - 80, 8);

    // Creature sprite (large)
    drawCreature(this, w * 0.2, 150, species.shape);

    // Name
    this.add.text(w * 0.2, 230, this.creature.nickname, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Species (if nicknamed differently)
    if (this.creature.nickname !== species.name) {
      this.add.text(w * 0.2, 252, species.name, {
        fontSize: '12px', fontFamily: 'monospace', color: '#8888aa',
      }).setOrigin(0.5);
    }

    // Type badge
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(typeColor(species.type), 1);
    badgeBg.fillRoundedRect(w * 0.2 - 32, 262, 64, 18, 4);
    this.add.text(w * 0.2, 271, species.type.toUpperCase(), {
      fontSize: '11px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Level
    this.add.text(w * 0.2, 295, `Level ${this.creature.level}`, {
      fontSize: '16px', fontFamily: 'monospace', color: '#ccccdd',
    }).setOrigin(0.5);

    // Description
    this.add.text(w * 0.2, 325, species.description, {
      fontSize: '11px', fontFamily: 'monospace', color: '#8899bb',
      wordWrap: { width: w * 0.35 }, align: 'center',
    }).setOrigin(0.5, 0);

    // IVs
    const ivs = this.creature.ivs;
    this.add.text(w * 0.2, 375, `IVs: HP ${ivs.hp}  ATK ${ivs.attack}  DEF ${ivs.defense}  SPD ${ivs.speed}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#666688',
    }).setOrigin(0.5);

    // ── Right panel: stats + moves ──
    const rPanelX = w * 0.4 + 20;
    const rPanelW = w * 0.6 - 40;

    const rBg = this.add.graphics();
    rBg.fillStyle(0x222244, 0.8);
    rBg.fillRoundedRect(rPanelX, 20, rPanelW, h - 80, 8);

    const rx = rPanelX + 20;
    let ry = 35;

    // ── Stats section ──
    this.add.text(rx, ry, 'STATS', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    });
    ry += 24;

    this.drawStatBar(rx, ry, 'HP', this.creature.currentHp, this.creature.maxHp, rPanelW - 40, 0x44cc44, `${this.creature.currentHp} / ${this.creature.maxHp}`);
    ry += 28;
    this.drawStatBar(rx, ry, 'ATK', this.creature.attack, 80, rPanelW - 40, 0xff6644);
    ry += 28;
    this.drawStatBar(rx, ry, 'DEF', this.creature.defense, 80, rPanelW - 40, 0x4488ff);
    ry += 28;
    this.drawStatBar(rx, ry, 'SPD', this.creature.speed, 80, rPanelW - 40, 0xffcc44);
    ry += 28;

    // XP bar
    const xpBase = xpForLevel(this.creature.level);
    const xpNext = xpForLevel(this.creature.level + 1);
    const xpCurr = this.creature.xp - xpBase;
    const xpTotal = xpNext - xpBase;
    this.drawStatBar(rx, ry, 'XP', xpCurr, xpTotal, rPanelW - 40, 0x8866ff, `${xpCurr} / ${xpTotal}`);
    ry += 38;

    // ── Moves section ──
    this.add.text(rx, ry, 'MOVES', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    });
    ry += 24;

    this.creature.moves.forEach((move) => {
      if (!move) return;
      this.drawMoveCard(rx, ry, rPanelW - 40, move);
      ry += 62;
    });

    // ── Back button ──
    this.drawButton(w / 2, h - 38, 140, 32, '\u2190 Back', 0x333355, () => {
      this.scene.start(this.returnScene, { save: this.save });
    });
  }

  private drawStatBar(
    x: number, y: number,
    label: string, value: number, max: number,
    barW: number, color: number, valueText?: string,
  ): void {
    const labelW = 36;
    this.add.text(x, y + 2, label, {
      fontSize: '11px', fontFamily: 'monospace', color: '#8888aa', fontStyle: 'bold',
    });

    const bx = x + labelW;
    const bw = barW - labelW - 50;
    const ratio = Math.min(1, Math.max(0, value / max));

    const bar = this.add.graphics();
    bar.fillStyle(0x333355, 1);
    bar.fillRoundedRect(bx, y, bw, 14, 3);
    bar.fillStyle(color, 1);
    bar.fillRoundedRect(bx, y, Math.max(0, bw * ratio), 14, 3);

    this.add.text(bx + bw + 8, y + 1, valueText ?? `${value}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ccccdd',
    });
  }

  private drawMoveCard(x: number, y: number, cardW: number, move: Attack): void {
    const species = getSpeciesById(this.creature.speciesId)!;

    const card = this.add.graphics();
    card.fillStyle(typeColor(move.type), 0.15);
    card.fillRoundedRect(x, y, cardW, 52, 5);
    card.lineStyle(1, typeColor(move.type), 0.4);
    card.strokeRoundedRect(x, y, cardW, 52, 5);

    // Move name
    this.add.text(x + 8, y + 4, move.name, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    });

    // Type badge
    const badgeX = x + cardW - 60;
    const badge = this.add.graphics();
    badge.fillStyle(typeColor(move.type), 1);
    badge.fillRoundedRect(badgeX, y + 4, 50, 14, 3);
    this.add.text(badgeX + 25, y + 11, move.type.toUpperCase(), {
      fontSize: '9px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stats row: Power · Accuracy · Description
    this.add.text(x + 8, y + 22, `PWR ${move.power}    ACC ${move.accuracy}%`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaaacc',
    });

    // Estimated damage (using this creature's attack stat, level, against a neutral target)
    const levelFactor = (2 * this.creature.level) / 5 + 2;
    const estDmg = Math.floor((levelFactor * move.power * (this.creature.attack / 20)) / 50 + 2);
    this.add.text(x + cardW - 8, y + 22, `~${estDmg} dmg`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffcc44',
    }).setOrigin(1, 0);

    // Description
    this.add.text(x + 8, y + 37, move.description, {
      fontSize: '9px', fontFamily: 'monospace', color: '#666688',
    });
  }

  private drawButton(
    cx: number, cy: number, bw: number, bh: number,
    label: string, color: number, callback: () => void,
  ): void {
    const x = cx - bw / 2;
    const y = cy - bh / 2;
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x, y, bw, bh, 6);
    bg.lineStyle(1, 0x666688, 0.6);
    bg.strokeRoundedRect(x, y, bw, bh, 6);

    this.add.text(cx, cy, label, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, cy, bw, bh).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { bg.clear(); bg.fillStyle(color, 0.7); bg.fillRoundedRect(x, y, bw, bh, 6); bg.lineStyle(1, 0xaaaacc, 0.8); bg.strokeRoundedRect(x, y, bw, bh, 6); });
    zone.on('pointerout', () => { bg.clear(); bg.fillStyle(color, 1); bg.fillRoundedRect(x, y, bw, bh, 6); bg.lineStyle(1, 0x666688, 0.6); bg.strokeRoundedRect(x, y, bw, bh, 6); });
    zone.on('pointerdown', callback);
  }
}