import Phaser from 'phaser';
import { Terrain, TERRAIN_COLORS } from './EncounterSystem';
import { GeneratedMap } from './OverworldMapGenerator';

/**
 * Configuration for map rendering.
 */
export interface MapRenderConfig {
  tileSize: number;
  detailColors: {
    tallGrass: number;
    treeTrunk: number;
    treeLeaves: number;
    waterWave: number;
  };
}

/**
 * Default rendering configuration.
 */
export const DEFAULT_RENDER_CONFIG: MapRenderConfig = {
  tileSize: 32,
  detailColors: {
    tallGrass: 0x388e3c,
    treeTrunk: 0x795548,
    treeLeaves: 0x2e7d32,
    waterWave: 0x64b5f6,
  },
};

/**
 * Renders the overworld map terrain data to Phaser graphics.
 * Separates visual presentation from terrain data.
 */
export class OverworldMapRenderer {
  private scene: Phaser.Scene;
  private config: MapRenderConfig;
  private graphics?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: MapRenderConfig = DEFAULT_RENDER_CONFIG) {
    this.scene = scene;
    this.config = config;
  }

  /**
   * Render the map to Phaser graphics.
   * Creates and returns the Graphics object.
   */
  render(map: GeneratedMap): Phaser.GameObjects.Graphics {
    // Clean up previous graphics if any
    this.destroy();

    const g = this.scene.add.graphics();
    this.graphics = g;

    const { tileSize, detailColors } = this.config;
    const { terrain, width, height } = map;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = terrain[y][x];
        const px = x * tileSize;
        const py = y * tileSize;

        // Base terrain color
        g.fillStyle(TERRAIN_COLORS[t], 1);
        g.fillRect(px, py, tileSize, tileSize);

        // Add detail based on terrain type
        this.renderDetail(g, t, px, py, detailColors);
      }
    }

    return g;
  }

  /**
   * Render detail for a specific terrain tile.
   */
  private renderDetail(
    g: Phaser.GameObjects.Graphics,
    terrain: Terrain,
    x: number,
    y: number,
    colors: MapRenderConfig['detailColors'],
  ): void {
    const { tileSize } = this.config;

    switch (terrain) {
      case Terrain.TallGrass:
        // Three grass blades
        g.fillStyle(colors.tallGrass, 0.5);
        g.fillRect(x + 4, y + 4, 3, 12);
        g.fillRect(x + 14, y + 2, 3, 14);
        g.fillRect(x + 24, y + 6, 3, 10);
        break;

      case Terrain.Tree:
        // Trunk
        g.fillStyle(colors.treeTrunk, 1);
        g.fillRect(x + 12, y + 18, 8, 14);
        // Leaves
        g.fillStyle(colors.treeLeaves, 1);
        g.fillCircle(x + 16, y + 14, 12);
        break;

      case Terrain.Water:
        // Wave lines
        g.lineStyle(1, colors.waterWave, 0.4);
        g.beginPath();
        g.moveTo(x + 4, y + 16);
        g.lineTo(x + 12, y + 12);
        g.lineTo(x + 20, y + 16);
        g.lineTo(x + 28, y + 12);
        g.strokePath();
        break;

      default:
        // No detail for other terrain types
        break;
    }
  }

  /**
   * Get the tile size used for rendering.
   */
  getTileSize(): number {
    return this.config.tileSize;
  }

  /**
   * Destroy the rendered graphics.
   */
  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = undefined;
    }
  }
}
