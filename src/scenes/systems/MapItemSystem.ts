import Phaser from 'phaser';
import { ItemType, SaveData } from '../../core/types';
import { saveGame } from '../../core/saveManager';
import { Terrain } from './EncounterSystem';
import { RandomSource, defaultRandom } from '../../core/random';
import { EventBus, gameEvents } from '../../core/eventBus';

/** Map item pickup */
interface MapItem {
  type: ItemType;
  x: number;
  y: number;
  collected: boolean;
}

/**
 * Manages map items (pickups) in the overworld.
 * Handles item placement, rendering, and collection.
 */
export class MapItemSystem {
  private scene: Phaser.Scene;
  private save: SaveData;
  private map: Terrain[][];
  private tileSize: number;
  private mapWidth: number;
  private mapHeight: number;
  private random: RandomSource;
  private events: EventBus;

  /** Items placed on the map */
  private mapItems: MapItem[] = [];
  /** Graphics for map items */
  private mapItemGraphics: Phaser.GameObjects.Graphics[] = [];

  constructor(
    scene: Phaser.Scene,
    save: SaveData,
    map: Terrain[][],
    tileSize: number,
    mapWidth: number,
    mapHeight: number,
    random: RandomSource = defaultRandom,
    events: EventBus = gameEvents,
  ) {
    this.scene = scene;
    this.save = save;
    this.map = map;
    this.tileSize = tileSize;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.random = random;
    this.events = events;
  }

  /**
   * Places map items on accessible tiles.
   * Currently places the fishing rod if not already owned.
   */
  placeItems(): void {
    // Find a random accessible grass tile for the fishing rod
    // Try to find a spot not too close to the starting position
    const grassTiles: { x: number; y: number }[] = [];

    for (let y = 1; y < this.mapHeight - 1; y++) {
      for (let x = 1; x < this.mapWidth - 1; x++) {
        if (this.map[y][x] === Terrain.Grass || this.map[y][x] === Terrain.Path) {
          // Check if it's not too close to start (400, 300)
          const worldX = x * this.tileSize + this.tileSize / 2;
          const worldY = y * this.tileSize + this.tileSize / 2;
          const dist = Math.sqrt((worldX - 400) ** 2 + (worldY - 300) ** 2);
          if (dist > 150) {
            // At least 150 pixels from start
            grassTiles.push({ x: worldX, y: worldY });
          }
        }
      }
    }

    if (grassTiles.length > 0 && !this.save.items.includes(ItemType.FishingRod)) {
      const spot = this.random.randomElement(grassTiles)!;
      this.mapItems.push({
        type: ItemType.FishingRod,
        x: spot.x,
        y: spot.y,
        collected: false,
      });
      this.drawItems();
    }
  }

  /**
   * Draws all uncollected map items.
   */
  private drawItems(): void {
    // Clear existing graphics
    this.mapItemGraphics.forEach((g) => g.destroy());
    this.mapItemGraphics = [];

    for (const item of this.mapItems) {
      if (item.collected) continue;

      const g = this.scene.add.graphics();

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
        g.fillTriangle(
          item.x,
          item.y - 20,
          item.x - 4,
          item.y - 16,
          item.x + 4,
          item.y - 16,
        );
        g.fillTriangle(
          item.x,
          item.y - 12,
          item.x - 4,
          item.y - 16,
          item.x + 4,
          item.y - 16,
        );
      }

      this.mapItemGraphics.push(g);
    }
  }

  /**
   * Checks for item pickups at the player's position.
   * @param playerX - Player's world X position
   * @param playerY - Player's world Y position
   */
  checkPickups(playerX: number, playerY: number): void {
    for (const item of this.mapItems) {
      if (item.collected) continue;

      const dist = Math.sqrt((playerX - item.x) ** 2 + (playerY - item.y) ** 2);
      if (dist < 25) {
        item.collected = true;
        this.save.items.push(item.type);
        saveGame(this.save);

        // Emit item:collected event
        this.events.emit('item:collected', {
          itemType: item.type,
          x: item.x,
          y: item.y,
        });

        // Remove graphic
        this.mapItemGraphics.forEach((g) => g.destroy());
        this.mapItemGraphics = [];
        this.drawItems();

        // Show pickup message briefly
        const msg = this.scene.add
          .text(
            this.scene.cameras.main.width / 2,
            60,
            `Found ${item.type === ItemType.FishingRod ? 'Fishing Rod' : item.type}!`,
            {
              fontSize: '16px',
              fontFamily: 'monospace',
              color: '#ffff00',
              fontStyle: 'bold',
              backgroundColor: '#000000aa',
              padding: { x: 10, y: 5 },
            },
          )
          .setOrigin(0.5)
          .setDepth(100);

        this.scene.time.delayedCall(2000, () => msg.destroy());
      }
    }
  }

  /**
   * Updates the save data reference.
   */
  setSave(save: SaveData): void {
    this.save = save;
  }

  /**
   * Updates the map reference.
   */
  setMap(map: Terrain[][]): void {
    this.map = map;
  }

  /**
   * Destroys all item graphics.
   */
  destroy(): void {
    this.mapItemGraphics.forEach((g) => g.destroy());
    this.mapItemGraphics = [];
  }
}
