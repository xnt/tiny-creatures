import Phaser from 'phaser';
import { SaveData, CreatureInstance, ItemType, CreatureType } from '../core/types';
import { saveGame } from '../core/saveManager';
import { CREATURE_DEX } from '../data/creatures';
import { createCreature } from '../core/creatureFactory';

const TILE = 32;
const MAP_W = 25;
const MAP_H = 19;
const PLAYER_SPEED = 160;

/** Terrain types */
enum Terrain { Grass, TallGrass, Water, Path, Tree }

const TERRAIN_COLORS: Record<Terrain, number> = {
  [Terrain.Grass]: 0x4caf50,
  [Terrain.TallGrass]: 0x2e7d32,
  [Terrain.Water]: 0x1976d2,
  [Terrain.Path]: 0xbcaaa4,
  [Terrain.Tree]: 0x1b5e20,
};

/** Map item pickup */
interface MapItem {
  type: ItemType;
  x: number;
  y: number;
  collected: boolean;
}

export class OverworldScene extends Phaser.Scene {
  private save!: SaveData;
  private player!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private map: Terrain[][] = [];
  private playerVelX = 0;
  private playerVelY = 0;
  private encounterCooldown = 0;
  private partyText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private itemsText!: Phaser.GameObjects.Text;
  private itemsPopup!: Phaser.GameObjects.Container;
  private itemsPopupBg!: Phaser.GameObjects.Graphics;
  private itemsPopupVisible = false;
  private mainMenuPopup!: Phaser.GameObjects.Container;
  private mainMenuVisible = false;

  /** Items placed on the map */
  private mapItems: MapItem[] = [];
  /** Graphics for map items */
  private mapItemGraphics: Phaser.GameObjects.Graphics[] = [];

  /** Virtual D-pad state for touch controls */
  private dpadDir: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super({ key: 'OverworldScene' });
  }

  init(data: { save: SaveData }): void {
    this.save = data.save;
  }

  create(): void {
    this.generateMap();
    this.drawMap();

    // Place map items (fishing rod)
    this.placeMapItems();

    // Player character (simple triangle)
    this.player = this.add.graphics();
    this.player.setPosition(this.save.playerX, this.save.playerY);
    this.drawPlayer();

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // HUD
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.6);
    hudBg.fillRect(0, 0, this.cameras.main.width, 30);

    this.partyText = this.add.text(10, 6, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
    });

    this.statsText = this.add.text(this.cameras.main.width - 10, 6, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(1, 0);

    this.updateHud();

    // Single Menu button (replaces multiple buttons for narrow screens)
    const menuBtn = this.add.text(this.cameras.main.width / 2, 6, '[ MENU ]', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaaff',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.toggleMainMenu();
    });

    // Create items popup (hidden by default)
    this.createItemsPopup();

    // Create main menu popup (hidden by default)
    this.createMainMenuPopup();

    // Virtual D-pad (touch / mobile)
    this.createDpad();
  }

  update(_time: number, delta: number): void {
    // Close popup if clicking outside
    if (this.itemsPopupVisible || this.mainMenuVisible) return; // Pause game while popup is open

    // Movement
    this.playerVelX = 0;
    this.playerVelY = 0;

    const left = this.cursors?.left.isDown || this.wasd?.A.isDown || this.dpadDir.x < 0;
    const right = this.cursors?.right.isDown || this.wasd?.D.isDown || this.dpadDir.x > 0;
    const up = this.cursors?.up.isDown || this.wasd?.W.isDown || this.dpadDir.y < 0;
    const down = this.cursors?.down.isDown || this.wasd?.S.isDown || this.dpadDir.y > 0;

    if (left) this.playerVelX = -PLAYER_SPEED;
    else if (right) this.playerVelX = PLAYER_SPEED;
    if (up) this.playerVelY = -PLAYER_SPEED;
    else if (down) this.playerVelY = PLAYER_SPEED;

    const dt = delta / 1000;
    let nx = this.player.x + this.playerVelX * dt;
    let ny = this.player.y + this.playerVelY * dt;

    // Clamp to map bounds
    nx = Phaser.Math.Clamp(nx, TILE, MAP_W * TILE - TILE);
    ny = Phaser.Math.Clamp(ny, TILE + 30, MAP_H * TILE - TILE);

    // Collision check — block trees and water
    const tileX = Math.floor(nx / TILE);
    const tileY = Math.floor(ny / TILE);
    if (tileX >= 0 && tileX < MAP_W && tileY >= 0 && tileY < MAP_H) {
      const terrain = this.map[tileY]?.[tileX];
      if (terrain !== Terrain.Tree && terrain !== Terrain.Water) {
        this.player.setPosition(nx, ny);
      }
    }

    // Check for item pickups
    this.checkItemPickups();

    // Encounter check
    if (this.encounterCooldown > 0) {
      this.encounterCooldown -= delta;
    } else if (this.isMoving()) {
      const tx = Math.floor(this.player.x / TILE);
      const ty = Math.floor(this.player.y / TILE);
      if (this.map[ty]?.[tx] === Terrain.TallGrass) {
        // ~8% chance per frame while moving in tall grass
        if (Math.random() < 0.008) {
          this.triggerEncounter();
        }
      }
    }
  }

  private isMoving(): boolean {
    return this.playerVelX !== 0 || this.playerVelY !== 0;
  }

  private generateMap(): void {
    this.map = [];
    for (let y = 0; y < MAP_H; y++) {
      const row: Terrain[] = [];
      for (let x = 0; x < MAP_W; x++) {
        // Border trees
        if (x === 0 || x === MAP_W - 1 || y === 0 || y === MAP_H - 1) {
          row.push(Terrain.Tree);
          continue;
        }
        const r = Math.random();
        if (r < 0.08) row.push(Terrain.Tree);
        else if (r < 0.14) row.push(Terrain.Water);
        else if (r < 0.40) row.push(Terrain.TallGrass);
        else if (r < 0.55) row.push(Terrain.Path);
        else row.push(Terrain.Grass);
      }
      this.map.push(row);
    }

    // Ensure player start area is walkable
    const sx = Math.floor(this.save.playerX / TILE);
    const sy = Math.floor(this.save.playerY / TILE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = sx + dx;
        const ty = sy + dy;
        if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
          this.map[ty][tx] = Terrain.Grass;
        }
      }
    }
  }

  private drawMap(): void {
    const g = this.add.graphics();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const terrain = this.map[y][x];
        g.fillStyle(TERRAIN_COLORS[terrain], 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);

        // Add detail to tall grass
        if (terrain === Terrain.TallGrass) {
          g.fillStyle(0x388e3c, 0.5);
          g.fillRect(x * TILE + 4, y * TILE + 4, 3, 12);
          g.fillRect(x * TILE + 14, y * TILE + 2, 3, 14);
          g.fillRect(x * TILE + 24, y * TILE + 6, 3, 10);
        }

        // Tree detail
        if (terrain === Terrain.Tree) {
          g.fillStyle(0x795548, 1);
          g.fillRect(x * TILE + 12, y * TILE + 18, 8, 14);
          g.fillStyle(0x2e7d32, 1);
          g.fillCircle(x * TILE + 16, y * TILE + 14, 12);
        }

        // Water waves
        if (terrain === Terrain.Water) {
          g.lineStyle(1, 0x64b5f6, 0.4);
          g.beginPath();
          g.moveTo(x * TILE + 4, y * TILE + 16);
          g.lineTo(x * TILE + 12, y * TILE + 12);
          g.lineTo(x * TILE + 20, y * TILE + 16);
          g.lineTo(x * TILE + 28, y * TILE + 12);
          g.strokePath();
        }
      }
    }
  }

  private drawPlayer(): void {
    const p = this.player;
    p.clear();

    // ── Shadow ──
    p.fillStyle(0x000000, 0.18);
    p.fillEllipse(0, 14, 20, 6);

    // ── Legs ──
    p.fillStyle(0x2255aa, 1);          // dark-blue jeans
    p.fillRoundedRect(-6, 6, 5, 9, 1);
    p.fillRoundedRect(1, 6, 5, 9, 1);
    // Shoes
    p.fillStyle(0x443322, 1);
    p.fillRoundedRect(-7, 13, 6, 3, 1);
    p.fillRoundedRect(1, 13, 6, 3, 1);

    // ── Torso / jacket ──
    p.fillStyle(0x3366cc, 1);          // blue jacket
    p.fillRoundedRect(-7, -4, 14, 12, 2);
    // Jacket zipper line
    p.lineStyle(1, 0x2244aa, 0.6);
    p.beginPath(); p.moveTo(0, -2); p.lineTo(0, 7); p.strokePath();

    // ── Backpack (visible behind right shoulder) ──
    p.fillStyle(0xcc4422, 1);
    p.fillRoundedRect(6, -3, 5, 9, 2);
    p.lineStyle(1, 0x993311, 0.5);
    p.strokeRoundedRect(6, -3, 5, 9, 2);

    // ── Arms ──
    p.fillStyle(0x3366cc, 1);
    // Left arm
    p.fillRoundedRect(-10, -2, 4, 9, 1);
    // Right arm
    p.fillRoundedRect(6, -2, 4, 9, 1);
    // Hands (skin)
    p.fillStyle(0xffccaa, 1);
    p.fillCircle(-8, 8, 2);
    p.fillCircle(8, 8, 2);

    // ── Neck ──
    p.fillStyle(0xffccaa, 1);
    p.fillRect(-2, -6, 4, 3);

    // ── Head ──
    p.fillStyle(0xffccaa, 1);           // skin tone
    p.fillCircle(0, -11, 8);

    // ── Hair ──
    p.fillStyle(0x332211, 1);           // dark brown hair
    // Hair top
    p.beginPath();
    p.arc(0, -13, 8.5, Math.PI + 0.3, -0.3, false);
    p.fillPath();
    // Side tufts
    p.fillRect(-8, -15, 3, 5);
    p.fillRect(5, -15, 3, 5);

    // ── Cap ──
    p.fillStyle(0xcc2222, 1);           // red cap
    p.beginPath();
    p.arc(0, -14, 8, Math.PI + 0.15, -0.15, false);
    p.fillPath();
    // Cap brim
    p.fillStyle(0xaa1111, 1);
    p.fillRoundedRect(-9, -14, 18, 3, 1);
    // Cap logo dot
    p.fillStyle(0xffffff, 1);
    p.fillCircle(0, -17, 1.5);

    // ── Face ──
    // Eyes
    p.fillStyle(0xffffff, 1);
    p.fillEllipse(-3, -11, 4, 3.5);
    p.fillEllipse(3, -11, 4, 3.5);
    // Irises
    p.fillStyle(0x224488, 1);
    p.fillCircle(-3, -11, 1.4);
    p.fillCircle(3, -11, 1.4);
    // Pupils
    p.fillStyle(0x000000, 1);
    p.fillCircle(-3, -11, 0.7);
    p.fillCircle(3, -11, 0.7);
    // Highlights
    p.fillStyle(0xffffff, 0.9);
    p.fillCircle(-3.5, -11.5, 0.5);
    p.fillCircle(2.5, -11.5, 0.5);
    // Mouth
    p.lineStyle(1, 0xcc8877, 0.7);
    p.beginPath();
    p.arc(0, -7.5, 2, 0.2, Math.PI - 0.2, false);
    p.strokePath();
  }

  // ─── Virtual D-pad ─────────────────────────────────────────
  private createDpad(): void {
    const h = this.cameras.main.height;
    const cx = 90;            // centre of the D-pad
    const cy = h - 90;
    const btnSize = 40;       // each direction button
    const gap = 2;
    const alpha = 0.3;        // resting opacity
    const alphaActive = 0.55; // pressed opacity

    // Centre circle (cosmetic)
    const centre = this.add.graphics();
    centre.fillStyle(0xffffff, alpha * 0.4);
    centre.fillCircle(cx, cy, 12);

    const makeDpadBtn = (
      ox: number, oy: number,
      dirX: number, dirY: number,
      arrow: string,
    ) => {
      const bx = cx + ox - btnSize / 2;
      const by = cy + oy - btnSize / 2;

      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, alpha);
      bg.fillRoundedRect(bx, by, btnSize, btnSize, 6);

      this.add.text(cx + ox, cy + oy, arrow, {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(0.5).setAlpha(alpha + 0.15);

      const zone = this.add.zone(cx + ox, cy + oy, btnSize, btnSize)
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
    makeDpadBtn(0, -offset, 0, -1, '\u25B2');       // Up
    makeDpadBtn(0, offset, 0, 1, '\u25BC');          // Down
    makeDpadBtn(-offset, 0, -1, 0, '\u25C0');        // Left
    makeDpadBtn(offset, 0, 1, 0, '\u25B6');          // Right
  }

  private triggerEncounter(waterEncounter = false): void {
    this.encounterCooldown = 2000; // prevent instant re-encounter

    // Determine average party level for scaling
    const avgLevel = Math.max(3, Math.round(
      this.save.party.reduce((sum, c) => sum + c.level, 0) / this.save.party.length
    ));

    // Pick random species - exclude water creatures from tall grass
    let availableSpecies = CREATURE_DEX;
    if (!waterEncounter) {
      // In tall grass, exclude water-type creatures
      availableSpecies = CREATURE_DEX.filter(s => s.type !== CreatureType.Water);
    } else {
      // Fishing encounters are water-type only
      availableSpecies = CREATURE_DEX.filter(s => s.type === CreatureType.Water);
    }

    const species = availableSpecies[Math.floor(Math.random() * availableSpecies.length)];

    // Wild creature level: avgLevel ± 2, but when the player only has
    // a single creature the wild level is always strictly lower.
    let wildLevel: number;
    if (this.save.party.length === 1) {
      const maxWild = Math.max(2, avgLevel - 1);
      wildLevel = Phaser.Math.Clamp(
        maxWild - Math.floor(Math.random() * 3),   // 0-2 below cap
        2, maxWild,
      );
    } else {
      wildLevel = Phaser.Math.Clamp(
        avgLevel + Math.floor(Math.random() * 5) - 2,
        2, 50,
      );
    }
    const wildCreature = createCreature(species.id, wildLevel);

    // Save position
    this.save.playerX = this.player.x;
    this.save.playerY = this.player.y;

    this.scene.start('BattleScene', {
      save: this.save,
      wildCreature,
    });
  }

  private updateHud(): void {
    const lead = this.save.party[0];
    if (lead) {
      this.partyText.setText(
        `${lead.nickname} Lv.${lead.level}  HP:${lead.currentHp}/${lead.maxHp}  Party:${this.save.party.length}`
      );
    }
    this.statsText.setText(`Wins:${this.save.wins} Caught:${this.save.caught}`);
  }

  // ─── Map Items ─────────────────────────────────────────────

  private placeMapItems(): void {
    // Find a random accessible grass tile for the fishing rod
    // Try to find a spot not too close to the starting position
    const grassTiles: { x: number; y: number }[] = [];

    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        if (this.map[y][x] === Terrain.Grass || this.map[y][x] === Terrain.Path) {
          // Check if it's not too close to start (400, 300)
          const worldX = x * TILE + TILE / 2;
          const worldY = y * TILE + TILE / 2;
          const dist = Math.sqrt((worldX - 400) ** 2 + (worldY - 300) ** 2);
          if (dist > 150) { // At least 150 pixels from start
            grassTiles.push({ x: worldX, y: worldY });
          }
        }
      }
    }

    if (grassTiles.length > 0 && !this.save.items.includes(ItemType.FishingRod)) {
      const spot = grassTiles[Math.floor(Math.random() * grassTiles.length)];
      this.mapItems.push({
        type: ItemType.FishingRod,
        x: spot.x,
        y: spot.y,
        collected: false,
      });
      this.drawMapItems();
    }
  }

  private drawMapItems(): void {
    // Clear existing graphics
    this.mapItemGraphics.forEach(g => g.destroy());
    this.mapItemGraphics = [];

    for (const item of this.mapItems) {
      if (item.collected) continue;

      const g = this.add.graphics();

      if (item.type === ItemType.FishingRod) {
        // Draw a fishing rod icon
        g.fillStyle(0x8b4513, 1); // Brown rod
        g.fillRect(item.x - 2, item.y - 12, 4, 20);
        g.fillStyle(0x888888, 1); // Gray reel
        g.fillCircle(item.x, item.y - 8, 4);
        g.lineStyle(2, 0xcccccc, 1); // Line
        g.beginPath();
        g.moveTo(item.x, item.y - 4);
        g.lineTo(item.x + 8, item.y + 4);
        g.strokePath();
        // Sparkle effect (simple diamond shape)
        g.fillStyle(0xffff00, 0.8);
        g.fillTriangle(item.x, item.y - 20, item.x - 4, item.y - 16, item.x + 4, item.y - 16);
        g.fillTriangle(item.x, item.y - 12, item.x - 4, item.y - 16, item.x + 4, item.y - 16);
      }

      this.mapItemGraphics.push(g);
    }
  }

  private checkItemPickups(): void {
    for (const item of this.mapItems) {
      if (item.collected) continue;

      const dist = Math.sqrt((this.player.x - item.x) ** 2 + (this.player.y - item.y) ** 2);
      if (dist < 25) {
        item.collected = true;
        this.save.items.push(item.type);
        saveGame(this.save);

        // Remove graphic
        this.mapItemGraphics.forEach(g => g.destroy());
        this.mapItemGraphics = [];
        this.drawMapItems();

        // Show pickup message briefly
        const msg = this.add.text(this.cameras.main.width / 2, 60,
          `Found ${item.type === ItemType.FishingRod ? 'Fishing Rod' : item.type}!`, {
          fontSize: '16px', fontFamily: 'monospace', color: '#ffff00', fontStyle: 'bold',
          backgroundColor: '#000000aa', padding: { x: 10, y: 5 },
        }).setOrigin(0.5).setDepth(100);

        this.time.delayedCall(2000, () => msg.destroy());
      }
    }
  }

  // ─── Items Popup ───────────────────────────────────────────

  private createItemsPopup(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.itemsPopup = this.add.container(0, 0);
    this.itemsPopup.setDepth(200);

    // Background overlay
    this.itemsPopupBg = this.add.graphics();
    this.itemsPopupBg.fillStyle(0x000000, 0.7);
    this.itemsPopupBg.fillRect(0, 0, w, h);
    this.itemsPopup.add(this.itemsPopupBg);

    // Close on background click
    this.itemsPopupBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    this.itemsPopupBg.on('pointerdown', () => this.toggleItemsPopup());

    // Popup panel
    const panelW = 280;
    const panelH = 200;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x222244, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0x6688cc, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    this.itemsPopup.add(panel);

    // Title
    const title = this.add.text(w / 2, panelY + 20, '🎒 ITEMS', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.itemsPopup.add(title);

    // Items list will be populated in toggleItemsPopup
    this.itemsPopup.setVisible(false);
  }

  private toggleItemsPopup(): void {
    this.itemsPopupVisible = !this.itemsPopupVisible;

    if (this.itemsPopupVisible) {
      this.itemsPopup.removeAll(true);
      this.rebuildItemsPopup();
      this.itemsPopup.setVisible(true);
    } else {
      this.itemsPopup.setVisible(false);
    }
  }

  private rebuildItemsPopup(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, w, h);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerdown', () => this.toggleItemsPopup());
    this.itemsPopup.add(bg);

    // Popup panel
    const panelW = 280;
    const panelH = 220;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x222244, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0x6688cc, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    this.itemsPopup.add(panel);

    // Title
    const title = this.add.text(w / 2, panelY + 20, '🎒 ITEMS', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.itemsPopup.add(title);

    // Items list
    if (this.save.items.length === 0) {
      const emptyText = this.add.text(w / 2, panelY + 80, 'No items yet!\nExplore to find items.', {
        fontSize: '14px', fontFamily: 'monospace', color: '#888888', align: 'center',
      }).setOrigin(0.5);
      this.itemsPopup.add(emptyText);
    } else {
      let itemY = panelY + 50;

      for (const itemType of this.save.items) {
        const itemName = itemType === ItemType.FishingRod ? '🎣 Fishing Rod' : itemType;
        const itemDesc = itemType === ItemType.FishingRod ? 'Use near water to fish' : '';

        // Item button
        const btnW = 240;
        const btnH = 45;
        const btnX = (w - btnW) / 2;
        const currentBtnY = itemY; // Capture Y position for this button

        const btn = this.add.graphics();
        btn.fillStyle(0x335566, 1);
        btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        btn.lineStyle(1, 0x66aacc, 1);
        btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        this.itemsPopup.add(btn);

        const itemLabel = this.add.text(btnX + 10, currentBtnY + 8, itemName, {
          fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
        });
        this.itemsPopup.add(itemLabel);

        const descLabel = this.add.text(btnX + 10, currentBtnY + 26, itemDesc, {
          fontSize: '10px', fontFamily: 'monospace', color: '#88aacc',
        });
        this.itemsPopup.add(descLabel);

        // Interactive zone
        const zone = this.add.zone(btnX + btnW / 2, currentBtnY + btnH / 2, btnW, btnH)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => {
          btn.clear();
          btn.fillStyle(0x446688, 1);
          btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
          btn.lineStyle(2, 0x88ccff, 1);
          btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        });
        zone.on('pointerout', () => {
          btn.clear();
          btn.fillStyle(0x335566, 1);
          btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
          btn.lineStyle(1, 0x66aacc, 1);
          btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        });
        zone.on('pointerdown', () => {
          this.useItem(itemType);
        });
        this.itemsPopup.add(zone);

        itemY += btnH + 8;
      }
    }

    // Close button
    const closeBtn = this.add.text(w / 2, panelY + panelH - 25, '[ CLOSE ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaaff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleItemsPopup());
    this.itemsPopup.add(closeBtn);
  }

  private useItem(itemType: ItemType): void {
    if (itemType === ItemType.FishingRod) {
      // Check if near water
      const nearWater = this.isNearWater();

      if (nearWater) {
        this.toggleItemsPopup(); // Close popup
        this.triggerEncounter(true); // Water encounter
      } else {
        // Show message that you need to be near water
        const msg = this.add.text(this.cameras.main.width / 2, 80,
          'You need to be near water to fish!', {
          fontSize: '14px', fontFamily: 'monospace', color: '#ff6666',
          backgroundColor: '#000000aa', padding: { x: 10, y: 5 },
        }).setOrigin(0.5).setDepth(300);

        this.time.delayedCall(1500, () => msg.destroy());
      }
    }
  }

  private isNearWater(): boolean {
    const playerTileX = Math.floor(this.player.x / TILE);
    const playerTileY = Math.floor(this.player.y / TILE);

    // Check adjacent tiles for water
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = playerTileX + dx;
        const ty = playerTileY + dy;
        if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
          if (this.map[ty][tx] === Terrain.Water) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // ─── Main Menu Popup ───────────────────────────────────────

  private createMainMenuPopup(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.mainMenuPopup = this.add.container(0, 0);
    this.mainMenuPopup.setDepth(250);
    this.mainMenuPopup.setVisible(false);
  }

  private toggleMainMenu(): void {
    this.mainMenuVisible = !this.mainMenuVisible;

    if (this.mainMenuVisible) {
      this.mainMenuPopup.removeAll(true);
      this.rebuildMainMenuPopup();
      this.mainMenuPopup.setVisible(true);
    } else {
      this.mainMenuPopup.setVisible(false);
    }
  }

  private rebuildMainMenuPopup(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, w, h);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerdown', () => this.toggleMainMenu());
    this.mainMenuPopup.add(bg);

    // Popup panel
    const panelW = 260;
    const panelH = 260;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x222244, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panel.lineStyle(2, 0x6688cc, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    this.mainMenuPopup.add(panel);

    // Title
    const title = this.add.text(w / 2, panelY + 20, '📋 MENU', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.mainMenuPopup.add(title);

    // Menu options
    const menuOptions = [
      { label: '🐾 Party', color: 0x336644, callback: () => { this.toggleMainMenu(); this.persistSave(); this.scene.start('PartyScene', { save: this.save }); } },
      { label: '📖 Dex', color: 0x664433, callback: () => { this.toggleMainMenu(); this.persistSave(); this.scene.start('CreatureDexScene', { save: this.save }); } },
      { label: '🎒 Items', color: 0x335566, callback: () => { this.toggleMainMenu(); this.toggleItemsPopup(); } },
      { label: '⚙ Settings', color: 0x444466, callback: () => { this.toggleMainMenu(); this.persistSave(); this.scene.start('SettingsScene'); } },
    ];

    let optionY = panelY + 55;
    const btnW = 200;
    const btnH = 40;

    for (const option of menuOptions) {
      const btnX = (w - btnW) / 2;
      const currentBtnY = optionY; // Capture Y position for this button

      const btn = this.add.graphics();
      btn.fillStyle(option.color, 1);
      btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
      btn.lineStyle(1, 0x88aacc, 1);
      btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
      this.mainMenuPopup.add(btn);

      const label = this.add.text(w / 2, currentBtnY + btnH / 2, option.label, {
        fontSize: '15px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.mainMenuPopup.add(label);

      const zone = this.add.zone(btnX + btnW / 2, currentBtnY + btnH / 2, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        btn.clear();
        btn.fillStyle(option.color, 0.8);
        btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        btn.lineStyle(2, 0xaaccff, 1);
        btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
      });
      zone.on('pointerout', () => {
        btn.clear();
        btn.fillStyle(option.color, 1);
        btn.fillRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
        btn.lineStyle(1, 0x88aacc, 1);
        btn.strokeRoundedRect(btnX, currentBtnY, btnW, btnH, 6);
      });
      zone.on('pointerdown', option.callback);
      this.mainMenuPopup.add(zone);

      optionY += btnH + 8;
    }

    // Close button
    const closeBtn = this.add.text(w / 2, panelY + panelH - 25, '[ CLOSE ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaaaff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleMainMenu());
    this.mainMenuPopup.add(closeBtn);
  }

  private persistSave(): void {
    this.save.playerX = this.player.x;
    this.save.playerY = this.player.y;
    saveGame(this.save);
  }
}