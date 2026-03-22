import Phaser from 'phaser';
import { SaveData, CreatureSpecies } from '../core/types';
import { CREATURE_DEX } from '../data/creatures';
import { drawCreature, typeColor } from '../utils/creatureRenderer';

export class CreatureDexScene extends Phaser.Scene {
  private save!: SaveData;
  private contentContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private minScrollY = 0;
  private maxScrollY = 0;
  private isDragging = false;
  private dragStartY = 0;
  private dragStartScrollY = 0;

  constructor() {
    super({ key: 'CreatureDexScene' });
  }

  init(data: { save: SaveData }): void {
    this.save = data.save;
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Collect captured species IDs
    const ownedIds = new Set<string>();
    for (const c of this.save.party) ownedIds.add(c.speciesId);
    for (const c of this.save.box) ownedIds.add(c.speciesId);

    // ── Background ──
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, w, h);

    // ── Title (fixed, not scrollable) ──
    this.add.text(w / 2, 22, `\uD83D\uDCD6  CREATURE DEX  (${ownedIds.size}/${CREATURE_DEX.length})`, {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);

    // ── Scrollable content container ──
    this.contentContainer = this.add.container(0, 0);

    // ── Grid of creatures ──
    const cols = 5;
    const cardW = 140;
    const cardH = 100;
    const padX = 10;
    const padY = 10;
    const startX = (w - (cols * cardW + (cols - 1) * padX)) / 2;
    const startY = 52;

    CREATURE_DEX.forEach((species, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + padX);
      const cy = startY + row * (cardH + padY);
      const owned = ownedIds.has(species.id);

      // Draw card into the container (pass relative coords)
      this.drawDexCardToContainer(species, cx, cy, cardW, cardH, owned);
    });

    // ── Calculate scroll bounds ──
    const totalRows = Math.ceil(CREATURE_DEX.length / cols);
    const contentHeight = startY + totalRows * (cardH + padY) + 20; // extra padding
    this.minScrollY = 0;
    this.maxScrollY = Math.max(0, contentHeight - (h - 70)); // leave room for title and back button

    // ── Back button (fixed, not scrollable) ──
    this.drawButton(w / 2, h - 28, 140, 30, '\u2190 Back', 0x333355, () => {
      this.scene.start('OverworldScene', { save: this.save });
    }).setScrollFactor(0);

    // ── Enable scrolling ──
    this.setupScrolling();
  }

  private setupScrolling(): void {
    if (this.maxScrollY <= 0) return; // No need to scroll if all content fits

    // Mouse wheel scrolling
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, _dy: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, this.minScrollY, this.maxScrollY);
      this.contentContainer.setY(-this.scrollY);
    });

    // Drag to scroll
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > 40 && pointer.y < this.cameras.main.height - 50) {
        this.isDragging = true;
        this.dragStartY = pointer.y;
        this.dragStartScrollY = this.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const delta = this.dragStartY - pointer.y;
        this.scrollY = Phaser.Math.Clamp(this.dragStartScrollY + delta, this.minScrollY, this.maxScrollY);
        this.contentContainer.setY(-this.scrollY);
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  private drawDexCard(
    species: CreatureSpecies,
    x: number, y: number,
    cw: number, ch: number,
    owned: boolean,
  ): void {
    const card = this.add.graphics();

    if (owned) {
      // Full card
      card.fillStyle(0x222244, 0.9);
      card.fillRoundedRect(x, y, cw, ch, 5);
      card.lineStyle(1, typeColor(species.type), 0.6);
      card.strokeRoundedRect(x, y, cw, ch, 5);

      // Creature sprite (tiny)
      drawCreature(this, x + 28, y + 32, {
        ...species.shape,
        size: species.shape.size * 0.4,
      });

      // Name
      this.add.text(x + 55, y + 8, species.name, {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      });

      // Type badge
      const badge = this.add.graphics();
      badge.fillStyle(typeColor(species.type), 1);
      badge.fillRoundedRect(x + 55, y + 24, 44, 12, 3);
      this.add.text(x + 77, y + 30, species.type.toUpperCase(), {
        fontSize: '8px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Base stats
      const bs = species.baseStats;
      this.add.text(x + 55, y + 42, `HP ${bs.hp}  ATK ${bs.attack}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#8888aa',
      });
      this.add.text(x + 55, y + 54, `DEF ${bs.defense}  SPD ${bs.speed}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#8888aa',
      });

      // Description (truncated)
      const desc = species.description.length > 30
        ? species.description.slice(0, 28) + '...'
        : species.description;
      this.add.text(x + 5, y + 70, desc, {
        fontSize: '8px', fontFamily: 'monospace', color: '#666688',
      });

      // Tap to view detail – find an owned instance
      const instance = this.save.party.find(c => c.speciesId === species.id)
        ?? this.save.box.find(c => c.speciesId === species.id);
      if (instance) {
        const zone = this.add.zone(x + cw / 2, y + ch / 2, cw, ch)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this.scene.start('CreatureDetailScene', {
            creature: instance,
            save: this.save,
            returnScene: 'CreatureDexScene',
          });
        });
      }
    } else {
      // Unknown card – silhouette style
      card.fillStyle(0x191930, 0.9);
      card.fillRoundedRect(x, y, cw, ch, 5);
      card.lineStyle(1, 0x333355, 0.4);
      card.strokeRoundedRect(x, y, cw, ch, 5);

      // Silhouette circle
      const silhouette = this.add.graphics();
      silhouette.fillStyle(0x111122, 1);
      silhouette.fillCircle(x + 28, y + 32, 16);
      this.add.text(x + 28, y + 32, '?', {
        fontSize: '18px', fontFamily: 'monospace', color: '#333355', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Name
      this.add.text(x + 55, y + 8, species.name, {
        fontSize: '11px', fontFamily: 'monospace', color: '#555577', fontStyle: 'bold',
      });

      // Type badge (dimmed)
      const badge = this.add.graphics();
      badge.fillStyle(typeColor(species.type), 0.3);
      badge.fillRoundedRect(x + 55, y + 24, 44, 12, 3);
      this.add.text(x + 77, y + 30, species.type.toUpperCase(), {
        fontSize: '8px', fontFamily: 'monospace', color: '#333344', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Hidden stats
      this.add.text(x + 55, y + 42, 'HP ??  ATK ??', {
        fontSize: '9px', fontFamily: 'monospace', color: '#444466',
      });
      this.add.text(x + 55, y + 54, 'DEF ?? SPD ??', {
        fontSize: '9px', fontFamily: 'monospace', color: '#444466',
      });

      this.add.text(x + 5, y + 70, 'Not yet captured...', {
        fontSize: '8px', fontFamily: 'monospace', color: '#444466', fontStyle: 'italic',
      });
    }
  }

  /** Same as drawDexCard but adds all elements to the scrollable content container */
  private drawDexCardToContainer(
    species: CreatureSpecies,
    x: number, y: number,
    cw: number, ch: number,
    owned: boolean,
  ): void {
    if (owned) {
      // Full card
      const card = this.add.graphics();
      card.fillStyle(0x222244, 0.9);
      card.fillRoundedRect(x, y, cw, ch, 5);
      card.lineStyle(1, typeColor(species.type), 0.6);
      card.strokeRoundedRect(x, y, cw, ch, 5);
      this.contentContainer.add(card);

      // Creature sprite (tiny)
      const sprite = drawCreature(this, x + 28, y + 32, {
        ...species.shape,
        size: species.shape.size * 0.4,
      });
      this.contentContainer.add(sprite);

      // Name
      const nameText = this.add.text(x + 55, y + 8, species.name, {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      });
      this.contentContainer.add(nameText);

      // Type badge
      const badge = this.add.graphics();
      badge.fillStyle(typeColor(species.type), 1);
      badge.fillRoundedRect(x + 55, y + 24, 44, 12, 3);
      this.contentContainer.add(badge);

      const typeText = this.add.text(x + 77, y + 30, species.type.toUpperCase(), {
        fontSize: '8px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentContainer.add(typeText);

      // Base stats
      const bs = species.baseStats;
      const stats1 = this.add.text(x + 55, y + 42, `HP ${bs.hp}  ATK ${bs.attack}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#8888aa',
      });
      this.contentContainer.add(stats1);

      const stats2 = this.add.text(x + 55, y + 54, `DEF ${bs.defense}  SPD ${bs.speed}`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#8888aa',
      });
      this.contentContainer.add(stats2);

      // Description (truncated)
      const desc = species.description.length > 30
        ? species.description.slice(0, 28) + '...'
        : species.description;
      const descText = this.add.text(x + 5, y + 70, desc, {
        fontSize: '8px', fontFamily: 'monospace', color: '#666688',
      });
      this.contentContainer.add(descText);

      // Tap to view detail – find an owned instance
      const instance = this.save.party.find(c => c.speciesId === species.id)
        ?? this.save.box.find(c => c.speciesId === species.id);
      if (instance) {
        const zone = this.add.zone(x + cw / 2, y + ch / 2, cw, ch)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this.scene.start('CreatureDetailScene', {
            creature: instance,
            save: this.save,
            returnScene: 'CreatureDexScene',
          });
        });
        this.contentContainer.add(zone);
      }
    } else {
      // Unknown card – silhouette style
      const card = this.add.graphics();
      card.fillStyle(0x191930, 0.9);
      card.fillRoundedRect(x, y, cw, ch, 5);
      card.lineStyle(1, 0x333355, 0.4);
      card.strokeRoundedRect(x, y, cw, ch, 5);
      this.contentContainer.add(card);

      // Silhouette circle
      const silhouette = this.add.graphics();
      silhouette.fillStyle(0x111122, 1);
      silhouette.fillCircle(x + 28, y + 32, 16);
      this.contentContainer.add(silhouette);

      const qText = this.add.text(x + 28, y + 32, '?', {
        fontSize: '18px', fontFamily: 'monospace', color: '#333355', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentContainer.add(qText);

      // Name
      const nameText = this.add.text(x + 55, y + 8, species.name, {
        fontSize: '11px', fontFamily: 'monospace', color: '#555577', fontStyle: 'bold',
      });
      this.contentContainer.add(nameText);

      // Type badge (dimmed)
      const badge = this.add.graphics();
      badge.fillStyle(typeColor(species.type), 0.3);
      badge.fillRoundedRect(x + 55, y + 24, 44, 12, 3);
      this.contentContainer.add(badge);

      const typeText = this.add.text(x + 77, y + 30, species.type.toUpperCase(), {
        fontSize: '8px', fontFamily: 'monospace', color: '#333344', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentContainer.add(typeText);

      // Hidden stats
      const hidden1 = this.add.text(x + 55, y + 42, 'HP ??  ATK ??', {
        fontSize: '9px', fontFamily: 'monospace', color: '#444466',
      });
      this.contentContainer.add(hidden1);

      const hidden2 = this.add.text(x + 55, y + 54, 'DEF ?? SPD ??', {
        fontSize: '9px', fontFamily: 'monospace', color: '#444466',
      });
      this.contentContainer.add(hidden2);

      const notYet = this.add.text(x + 5, y + 70, 'Not yet captured...', {
        fontSize: '8px', fontFamily: 'monospace', color: '#444466', fontStyle: 'italic',
      });
      this.contentContainer.add(notYet);
    }
  }

  private drawButton(
    cx: number, cy: number, bw: number, bh: number,
    label: string, color: number, callback: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const x = cx - bw / 2;
    const y = cy - bh / 2;
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x, y, bw, bh, 6);
    bg.lineStyle(1, 0x666688, 0.6);
    bg.strokeRoundedRect(x, y, bw, bh, 6);
    container.add(bg);

    const text = this.add.text(cx, cy, label, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    const zone = this.add.zone(cx, cy, bw, bh).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { bg.clear(); bg.fillStyle(color, 0.7); bg.fillRoundedRect(x, y, bw, bh, 6); bg.lineStyle(1, 0xaaaacc, 0.8); bg.strokeRoundedRect(x, y, bw, bh, 6); });
    zone.on('pointerout', () => { bg.clear(); bg.fillStyle(color, 1); bg.fillRoundedRect(x, y, bw, bh, 6); bg.lineStyle(1, 0x666688, 0.6); bg.strokeRoundedRect(x, y, bw, bh, 6); });
    zone.on('pointerdown', callback);
    container.add(zone);

    return container;
  }
}