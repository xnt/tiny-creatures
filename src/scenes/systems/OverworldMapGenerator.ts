import { Terrain } from './EncounterSystem';
import { RandomSource } from '../../core/random';

/**
 * Configuration for map generation.
 */
export interface MapGenerationConfig {
  width: number;
  height: number;
  /** Probability thresholds for terrain types (cumulative) */
  probabilities: {
    tree: number;      // 0 to tree
    water: number;     // tree to water
    tallGrass: number; // water to tallGrass
    path: number;      // tallGrass to path
    // Remainder is grass
  };
}

/**
 * Result of map generation.
 */
export interface GeneratedMap {
  terrain: Terrain[][];
  width: number;
  height: number;
}

/**
 * Default configuration matching the original OverworldScene behavior.
 */
export const DEFAULT_MAP_CONFIG: MapGenerationConfig = {
  width: 25,
  height: 19,
  probabilities: {
    tree: 0.08,
    water: 0.14,
    tallGrass: 0.40,
    path: 0.55,
  },
};

/**
 * Pure function to generate terrain data for the overworld map.
 * Uses seed-based RNG for deterministic generation (useful for testing).
 */
export function generateOverworldMap(
  random: RandomSource,
  config: MapGenerationConfig = DEFAULT_MAP_CONFIG,
  playerStartX: number = 0,
  playerStartY: number = 0,
  tileSize: number = 32,
): GeneratedMap {
  const { width, height, probabilities } = config;
  const terrain: Terrain[][] = [];

  // Generate base terrain
  for (let y = 0; y < height; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < width; x++) {
      // Border trees
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        row.push(Terrain.Tree);
        continue;
      }

      const r = random.random();
      if (r < probabilities.tree) row.push(Terrain.Tree);
      else if (r < probabilities.water) row.push(Terrain.Water);
      else if (r < probabilities.tallGrass) row.push(Terrain.TallGrass);
      else if (r < probabilities.path) row.push(Terrain.Path);
      else row.push(Terrain.Grass);
    }
    terrain.push(row);
  }

  // Ensure player start area is walkable
  const startTileX = Math.floor(playerStartX / tileSize);
  const startTileY = Math.floor(playerStartY / tileSize);

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = startTileX + dx;
      const ty = startTileY + dy;
      if (ty >= 0 && ty < height && tx >= 0 && tx < width) {
        terrain[ty][tx] = Terrain.Grass;
      }
    }
  }

  return { terrain, width, height };
}

/**
 * Class wrapper for map generation with injected dependencies.
 * Useful when you need to generate multiple maps with the same configuration.
 */
export class OverworldMapGenerator {
  private config: MapGenerationConfig;
  private random: RandomSource;

  constructor(
    random: RandomSource,
    config: MapGenerationConfig = DEFAULT_MAP_CONFIG,
  ) {
    this.random = random;
    this.config = config;
  }

  /**
   * Generate a new map with the configured parameters.
   */
  generate(playerStartX: number = 0, playerStartY: number = 0, tileSize: number = 32): GeneratedMap {
    return generateOverworldMap(this.random, this.config, playerStartX, playerStartY, tileSize);
  }

  /**
   * Get the current configuration.
   */
  getConfig(): MapGenerationConfig {
    return { ...this.config };
  }
}
