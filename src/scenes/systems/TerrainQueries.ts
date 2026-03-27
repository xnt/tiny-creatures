import { Terrain } from './EncounterSystem';
import { GeneratedMap } from './OverworldMapGenerator';

/**
 * Configuration for terrain walkability.
 */
export interface WalkabilityConfig {
  blockedTerrains: Terrain[];
}

/**
 * Default walkability configuration.
 */
export const DEFAULT_WALKABILITY: WalkabilityConfig = {
  blockedTerrains: [Terrain.Tree, Terrain.Water],
};

/**
 * Pure functions for querying terrain data.
 * No Phaser dependencies - works entirely with terrain data.
 */
export class TerrainQueries {
  private map: GeneratedMap;
  private walkability: WalkabilityConfig;
  private tileSize: number;

  constructor(
    map: GeneratedMap,
    walkability: WalkabilityConfig = DEFAULT_WALKABILITY,
    tileSize: number = 32,
  ) {
    this.map = map;
    this.walkability = walkability;
    this.tileSize = tileSize;
  }

  /**
   * Get the terrain at a specific tile coordinate.
   */
  getTerrainAt(tileX: number, tileY: number): Terrain | undefined {
    if (!this.isInBounds(tileX, tileY)) return undefined;
    return this.map.terrain[tileY][tileX];
  }

  /**
   * Get the terrain at a world position.
   */
  getTerrainAtPosition(worldX: number, worldY: number): Terrain | undefined {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    return this.getTerrainAt(tileX, tileY);
  }

  /**
   * Check if a tile coordinate is within map bounds.
   */
  isInBounds(tileX: number, tileY: number): boolean {
    return (
      tileX >= 0 &&
      tileX < this.map.width &&
      tileY >= 0 &&
      tileY < this.map.height
    );
  }

  /**
   * Check if a world position is within map bounds.
   */
  isPositionInBounds(worldX: number, worldY: number): boolean {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    return this.isInBounds(tileX, tileY);
  }

  /**
   * Check if a specific terrain type is walkable.
   */
  isTerrainWalkable(terrain: Terrain): boolean {
    return !this.walkability.blockedTerrains.includes(terrain);
  }

  /**
   * Check if a tile is walkable.
   */
  isTileWalkable(tileX: number, tileY: number): boolean {
    const terrain = this.getTerrainAt(tileX, tileY);
    if (terrain === undefined) return false;
    return this.isTerrainWalkable(terrain);
  }

  /**
   * Check if a world position is walkable.
   */
  isPositionWalkable(worldX: number, worldY: number): boolean {
    const terrain = this.getTerrainAtPosition(worldX, worldY);
    if (terrain === undefined) return false;
    return this.isTerrainWalkable(terrain);
  }

  /**
   * Check if a specific terrain type is water.
   */
  isWater(terrain: Terrain): boolean {
    return terrain === Terrain.Water;
  }

  /**
   * Check if the terrain at a tile is water.
   */
  isTileWater(tileX: number, tileY: number): boolean {
    const terrain = this.getTerrainAt(tileX, tileY);
    return terrain !== undefined && this.isWater(terrain);
  }

  /**
   * Check if the terrain at a world position is water.
   */
  isPositionWater(worldX: number, worldY: number): boolean {
    const terrain = this.getTerrainAtPosition(worldX, worldY);
    return terrain !== undefined && this.isWater(terrain);
  }

  /**
   * Check if there is water adjacent to a tile (including diagonals).
   */
  hasAdjacentWater(tileX: number, tileY: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const tx = tileX + dx;
        const ty = tileY + dy;
        if (this.isTileWater(tx, ty)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if there is water adjacent to a world position (including diagonals).
   */
  hasAdjacentWaterAtPosition(worldX: number, worldY: number): boolean {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    return this.hasAdjacentWater(tileX, tileY);
  }

  /**
   * Get all adjacent tiles of a specific terrain type.
   */
  getAdjacentTilesOfType(
    tileX: number,
    tileY: number,
    terrainType: Terrain,
  ): Array<{ x: number; y: number }> {
    const result: Array<{ x: number; y: number }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const tx = tileX + dx;
        const ty = tileY + dy;
        if (this.getTerrainAt(tx, ty) === terrainType) {
          result.push({ x: tx, y: ty });
        }
      }
    }
    return result;
  }

  /**
   * Clamp world coordinates to map bounds.
   */
  clampToBounds(worldX: number, worldY: number): { x: number; y: number } {
    const minX = this.tileSize;
    const minY = this.tileSize + 30; // Original offset
    const maxX = this.map.width * this.tileSize - this.tileSize;
    const maxY = this.map.height * this.tileSize - this.tileSize;

    return {
      x: Math.max(minX, Math.min(worldX, maxX)),
      y: Math.max(minY, Math.min(worldY, maxY)),
    };
  }

  /**
   * Get the map data.
   */
  getMap(): GeneratedMap {
    return this.map;
  }

  /**
   * Get the tile size.
   */
  getTileSize(): number {
    return this.tileSize;
  }

  /**
   * Update the map data (useful for map transitions or modifications).
   */
  setMap(map: GeneratedMap): void {
    this.map = map;
  }
}
