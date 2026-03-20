import Phaser from 'phaser';
import { SaveData, CreatureInstance } from '../core/types';
import { getSpeciesById } from '../data/creatures';
import { drawCreature, typeColor } from '../utils/creatureRenderer';
import { saveGame } from '../core/saveManager';
import { xpForLevel } from '../core/creatureFactory';

export class PartyScene extends Phaser.Scene {
  private save!: SaveData;

  constructor() {
    super({ key: 'PartyScene' });
  }

  init(data: { save: SaveData }): void {
    this.save = data.save;
  }

  create(): void {
    this.drawUI();
  }

  /** (Re-)draw everything so we can refresh after healing */
  private drawUI(): void {
    // Wipe previous objects when refreshing
    this.children.removeAll(true);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // ── Background ──
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, w, h);

    // ── Title ──
    this.add.text(w / 2, 22, '🐾  YOUR PARTY', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── Party cards ──
    const party = this.save.party;
    const cardW = 230;
    const cardH = 155;
    const cols = 3;
    const padX = 18;
    const padY = 14;
    const startX = (w - (cols * cardW + (cols - 1) * padX)) / 2;
    const startY = 55;

    party.forEach((creature, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + padX);
      const cy = startY + row * (cardH + padY);
      this.drawCreatureCard(creature, cx, cy, cardW, cardH);
    });

    // ── Empty slots ──
    for (let i = party.length; i < 6; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + padX);
      const cy = startY + row * (cardH + padY);
      const empty = this.add.graphics();
      empty.lineStyle(1, 0x444466, 0.4);
      empty.strokeRoundedRect(cx, cy, cardW, cardH, 6);
      this.add.text(cx + cardW / 2, cy + cardH / 2, '— empty —', {
        fontSize: '12px', fontFamily: 'monospace', color: '#444466',
      }).setOrigin(0.5);
    }

    // ── Bottom bar ──
    const barY = h - 50;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x000000, 0.5);
    barBg.fillRoundedRect(20, barY, w - 40, 40, 8);

    // Heal All button
    this.drawButton(w / 2 - 120, barY + 4, 110, 32, '💚 Heal All', 0x226644, () => {
      this.save.party.forEach(c => { c.currentHp = c.maxHp; });
      saveGame(this.save);
      this.drawUI();
    });

    // Back button
    this.drawButton(w / 2 + 10, barY + 4, 110, 32, '← Back', 0x333355, () => {
      saveGame(this.save);
      this.scene.start('OverworldScene', { save: this.save });
    });

    // Box count
    if (this.save.box.length > 0) {
      this.add.text(w - 40, barY + 20, `Box: ${this.save.box.length}`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#8888aa',
      }).setOrigin(1, 0.5);
    }
  }

  // ─── Creature card ────────────────────────────────────────
  private drawCreatureCard(
    creature: CreatureInstance,
    x: number, y: number,
    cw: number, ch: number,
  ): void {
    const species = getSpeciesById(creature.speciesId)!;

    // Card background
    const card = this.add.graphics();
    card.fillStyle(0x222244, 0.9);
    card.fillRoundedRect(x, y, cw, ch, 6);
    card.lineStyle(1, 0x555577, 0.8);
    card.strokeRoundedRect(x, y, cw, ch, 6);

    // Tap to open creature detail
    const cardZone = this.add.zone(x + cw / 2, y + ch / 2, cw, ch)
      .setInteractive({ useHandCursor: true });
    cardZone.on('pointerover', () => { card.clear(); card.fillStyle(0x2a2a55, 0.95); card.fillRoundedRect(x, y, cw, ch, 6); card.lineStyle(1, 0x7777aa, 1); card.strokeRoundedRect(x, y, cw, ch, 6); });
    cardZone.on('pointerout', () => { card.clear(); card.fillStyle(0x222244, 0.9); card.fillRoundedRect(x, y, cw, ch, 6); card.lineStyle(1, 0x555577, 0.8); card.strokeRoundedRect(x, y, cw, ch, 6); });
    cardZone.on('pointerdown', () => {
      this.scene.start('CreatureDetailScene', {
        creature,
        save: this.save,
        returnScene: 'PartyScene',
      });
    });

    // ── Creature sprite (small) ──
    const spriteX = x + 38;
    const spriteY = y + 42;
    const gfx = drawCreature(this, spriteX, spriteY, {
      ...species.shape,
      size: species.shape.size * 0.55, // scaled down
    });

    // ── Name + level ──
    this.add.text(x + 72, y + 10, creature.nickname, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    });
    this.add.text(x + 72, y + 26, `Lv. ${creature.level}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ccccdd',
    });

    // ── Type badge ──
    const badge = this.add.graphics();
    badge.fillStyle(typeColor(species.type), 1);
    badge.fillRoundedRect(x + 72, y + 40, 48, 14, 3);
    this.add.text(x + 96, y + 47, species.type.toUpperCase(), {
      fontSize: '9px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── HP bar ──
    const hpBarX = x + 72;
    const hpBarY = y + 60;
    const hpBarW = cw - 82;
    const hpRatio = Math.max(0, creature.currentHp / creature.maxHp);
    const hpColor = hpRatio > 0.5 ? 0x44cc44 : hpRatio > 0.2 ? 0xcccc44 : 0xcc4444;

    const hpBar = this.add.graphics();
    hpBar.fillStyle(0x333333, 1);
    hpBar.fillRoundedRect(hpBarX, hpBarY, hpBarW, 8, 2);
    hpBar.fillStyle(hpColor, 1);
    hpBar.fillRoundedRect(hpBarX, hpBarY, Math.max(0, hpBarW * hpRatio), 8, 2);

    this.add.text(hpBarX, hpBarY + 12, `HP  ${creature.currentHp} / ${creature.maxHp}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#aaaacc',
    });

    // ── XP bar ──
    const xpNeeded = xpForLevel(creature.level + 1);
    const xpBase = xpForLevel(creature.level);
    const xpCurrent = creature.xp - xpBase;
    const xpTotal = xpNeeded - xpBase;
    const xpRatio = xpTotal > 0 ? Math.min(1, xpCurrent / xpTotal) : 1;

    const xpBar = this.add.graphics();
    xpBar.fillStyle(0x333333, 1);
    xpBar.fillRoundedRect(hpBarX, hpBarY + 24, hpBarW, 5, 2);
    xpBar.fillStyle(0x4488ff, 1);
    xpBar.fillRoundedRect(hpBarX, hpBarY + 24, Math.max(0, hpBarW * xpRatio), 5, 2);

    this.add.text(hpBarX, hpBarY + 32, `XP  ${xpCurrent} / ${xpTotal}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#7799cc',
    });

    // ── Stats row ──
    this.add.text(x + 8, y + 108, `ATK ${creature.attack}   DEF ${creature.defense}   SPD ${creature.speed}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#8888aa',
    });

    // ── Moves ──
    const moveNames = creature.moves.map(m => m.name).join(' · ');
    this.add.text(x + 8, y + 124, moveNames, {
      fontSize: '9px', fontFamily: 'monospace', color: '#666688',
      wordWrap: { width: cw - 16 },
    });

    // ── Individual heal button ──
    if (creature.currentHp < creature.maxHp) {
      this.drawButton(x + cw - 50, y + 6, 42, 18, 'Heal', 0x226644, () => {
        creature.currentHp = creature.maxHp;
        saveGame(this.save);
        this.drawUI();
      }, '10px');
    }
  }

  // ─── Reusable button ─────────────────────────────────────
  private drawButton(
    x: number, y: number, bw: number, bh: number,
    label: string, color: number, callback: () => void,
    fontSize: string = '13px',
  ): void {
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x, y, bw, bh, 5);
    bg.lineStyle(1, 0x88aa88, 0.5);
    bg.strokeRoundedRect(x, y, bw, bh, 5);

    this.add.text(x + bw / 2, y + bh / 2, label, {
      fontSize, fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x + bw / 2, y + bh / 2, bw, bh)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.7);
      bg.fillRoundedRect(x, y, bw, bh, 5);
      bg.lineStyle(1, 0xccddcc, 0.8);
      bg.strokeRoundedRect(x, y, bw, bh, 5);
    });
    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(x, y, bw, bh, 5);
      bg.lineStyle(1, 0x88aa88, 0.5);
      bg.strokeRoundedRect(x, y, bw, bh, 5);
    });
    zone.on('pointerdown', callback);
  }
}