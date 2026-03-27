import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser before importing modules that depend on it
vi.mock('phaser', () => ({
  default: {},
}));

import { TerrainQueries, DEFAULT_WALKABILITY, WalkabilityConfig } from './TerrainQueries';
import { Terrain } from './EncounterSystem';
import { GeneratedMap } from './OverworldMapGenerator';

function createTestMap(terrain: Terrain[][]): GeneratedMap {
  return {
    terrain,
    width: terrain[0]?.length ?? 0,
    height: terrain.length,
  };
}

describe('TerrainQueries', () => {
  describe('getTerrainAt', () => {
    it('should return terrain at valid tile coordinates', () => {
      const map = createTestMap([
        [Terrain.Tree, Terrain.Grass],
        [Terrain.Water, Terrain.TallGrass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.getTerrainAt(0, 0)).toBe(Terrain.Tree);
      expect(queries.getTerrainAt(1, 0)).toBe(Terrain.Grass);
      expect(queries.getTerrainAt(0, 1)).toBe(Terrain.Water);
      expect(queries.getTerrainAt(1, 1)).toBe(Terrain.TallGrass);
    });

    it('should return undefined for out-of-bounds coordinates', () => {
      const map = createTestMap([[Terrain.Grass]]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.getTerrainAt(-1, 0)).toBeUndefined();
      expect(queries.getTerrainAt(0, -1)).toBeUndefined();
      expect(queries.getTerrainAt(1, 0)).toBeUndefined();
      expect(queries.getTerrainAt(0, 1)).toBeUndefined();
    });
  });

  describe('getTerrainAtPosition', () => {
    it('should convert world position to terrain', () => {
      const map = createTestMap([
        [Terrain.Tree, Terrain.Grass],
        [Terrain.Water, Terrain.TallGrass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // World (0, 0) is tile (0, 0) - Tree
      expect(queries.getTerrainAtPosition(0, 0)).toBe(Terrain.Tree);
      // World (32, 0) is tile (1, 0) - Grass
      expect(queries.getTerrainAtPosition(32, 0)).toBe(Terrain.Grass);
      // World (0, 32) is tile (0, 1) - Water
      expect(queries.getTerrainAtPosition(0, 32)).toBe(Terrain.Water);
      // World (48, 48) is tile (1, 1) - TallGrass
      expect(queries.getTerrainAtPosition(48, 48)).toBe(Terrain.TallGrass);
    });

    it('should handle positions within tiles', () => {
      const map = createTestMap([[Terrain.Grass, Terrain.Tree]]);
      const queries = new TerrainQueries(map, undefined, 32);

      // Any position in tile 0 should return Grass
      expect(queries.getTerrainAtPosition(0, 0)).toBe(Terrain.Grass);
      expect(queries.getTerrainAtPosition(15, 15)).toBe(Terrain.Grass);
      expect(queries.getTerrainAtPosition(31, 31)).toBe(Terrain.Grass);

      // Any position in tile 1 should return Tree
      expect(queries.getTerrainAtPosition(32, 0)).toBe(Terrain.Tree);
      expect(queries.getTerrainAtPosition(48, 15)).toBe(Terrain.Tree);
      expect(queries.getTerrainAtPosition(63, 31)).toBe(Terrain.Tree);
    });
  });

  describe('isInBounds', () => {
    it('should return true for valid tile coordinates', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isInBounds(0, 0)).toBe(true);
      expect(queries.isInBounds(1, 1)).toBe(true);
      expect(queries.isInBounds(0, 1)).toBe(true);
      expect(queries.isInBounds(1, 0)).toBe(true);
    });

    it('should return false for out-of-bounds coordinates', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isInBounds(-1, 0)).toBe(false);
      expect(queries.isInBounds(0, -1)).toBe(false);
      expect(queries.isInBounds(2, 0)).toBe(false);
      expect(queries.isInBounds(0, 2)).toBe(false);
    });
  });

  describe('isPositionInBounds', () => {
    it('should return true for positions within map bounds', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isPositionInBounds(0, 0)).toBe(true);
      expect(queries.isPositionInBounds(32, 32)).toBe(true);
      expect(queries.isPositionInBounds(63, 63)).toBe(true);
    });

    it('should return false for positions outside map bounds', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isPositionInBounds(-1, 0)).toBe(false);
      expect(queries.isPositionInBounds(0, -1)).toBe(false);
      expect(queries.isPositionInBounds(64, 0)).toBe(false);
      expect(queries.isPositionInBounds(0, 64)).toBe(false);
    });
  });

  describe('walkability', () => {
    it('should consider Tree and Water as non-walkable by default', () => {
      const queries = new TerrainQueries(createTestMap([]), undefined, 32);

      expect(queries.isTerrainWalkable(Terrain.Grass)).toBe(true);
      expect(queries.isTerrainWalkable(Terrain.TallGrass)).toBe(true);
      expect(queries.isTerrainWalkable(Terrain.Path)).toBe(true);
      expect(queries.isTerrainWalkable(Terrain.Tree)).toBe(false);
      expect(queries.isTerrainWalkable(Terrain.Water)).toBe(false);
    });

    it('should respect custom walkability config', () => {
      const customConfig: WalkabilityConfig = {
        blockedTerrains: [Terrain.TallGrass, Terrain.Path],
      };
      const queries = new TerrainQueries(createTestMap([]), customConfig, 32);

      expect(queries.isTerrainWalkable(Terrain.Grass)).toBe(true);
      expect(queries.isTerrainWalkable(Terrain.TallGrass)).toBe(false);
      expect(queries.isTerrainWalkable(Terrain.Path)).toBe(false);
      expect(queries.isTerrainWalkable(Terrain.Tree)).toBe(true);
      expect(queries.isTerrainWalkable(Terrain.Water)).toBe(true);
    });

    it('should check tile walkability correctly', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Tree],
        [Terrain.Water, Terrain.TallGrass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isTileWalkable(0, 0)).toBe(true); // Grass
      expect(queries.isTileWalkable(1, 0)).toBe(false); // Tree
      expect(queries.isTileWalkable(0, 1)).toBe(false); // Water
      expect(queries.isTileWalkable(1, 1)).toBe(true); // TallGrass
    });

    it('should return false for out-of-bounds tile walkability', () => {
      const map = createTestMap([[Terrain.Grass]]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isTileWalkable(-1, 0)).toBe(false);
      expect(queries.isTileWalkable(0, -1)).toBe(false);
      expect(queries.isTileWalkable(1, 0)).toBe(false);
    });

    it('should check position walkability correctly', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Tree],
        [Terrain.Water, Terrain.TallGrass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isPositionWalkable(0, 0)).toBe(true); // Grass
      expect(queries.isPositionWalkable(32, 0)).toBe(false); // Tree
      expect(queries.isPositionWalkable(0, 32)).toBe(false); // Water
      expect(queries.isPositionWalkable(32, 32)).toBe(true); // TallGrass
    });

    it('should return false for out-of-bounds position walkability', () => {
      const map = createTestMap([[Terrain.Grass]]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isPositionWalkable(-1, 0)).toBe(false);
      expect(queries.isPositionWalkable(32, 0)).toBe(false);
    });
  });

  describe('water detection', () => {
    it('should correctly identify water terrain', () => {
      const queries = new TerrainQueries(createTestMap([]), undefined, 32);

      expect(queries.isWater(Terrain.Water)).toBe(true);
      expect(queries.isWater(Terrain.Grass)).toBe(false);
      expect(queries.isWater(Terrain.Tree)).toBe(false);
      expect(queries.isWater(Terrain.TallGrass)).toBe(false);
      expect(queries.isWater(Terrain.Path)).toBe(false);
    });

    it('should check tile water status correctly', () => {
      const map = createTestMap([
        [Terrain.Water, Terrain.Grass],
        [Terrain.Tree, Terrain.Water],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isTileWater(0, 0)).toBe(true);
      expect(queries.isTileWater(1, 0)).toBe(false);
      expect(queries.isTileWater(0, 1)).toBe(false);
      expect(queries.isTileWater(1, 1)).toBe(true);
    });

    it('should return false for out-of-bounds tile water check', () => {
      const map = createTestMap([[Terrain.Water]]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isTileWater(-1, 0)).toBe(false);
      expect(queries.isTileWater(0, -1)).toBe(false);
      expect(queries.isTileWater(1, 0)).toBe(false);
    });

    it('should check position water status correctly', () => {
      const map = createTestMap([
        [Terrain.Water, Terrain.Grass],
        [Terrain.Tree, Terrain.Water],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.isPositionWater(0, 0)).toBe(true);
      expect(queries.isPositionWater(32, 0)).toBe(false);
      expect(queries.isPositionWater(0, 32)).toBe(false);
      expect(queries.isPositionWater(32, 32)).toBe(true);
    });
  });

  describe('hasAdjacentWater', () => {
    it('should return true when water is adjacent (including diagonals)', () => {
      const map = createTestMap([
        [Terrain.Water, Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // Tile (1, 1) has water at (0, 0) - diagonal
      expect(queries.hasAdjacentWater(1, 1)).toBe(true);
      // Tile (1, 0) has water at (0, 0) - adjacent
      expect(queries.hasAdjacentWater(1, 0)).toBe(true);
      // Tile (0, 1) has water at (0, 0) - adjacent
      expect(queries.hasAdjacentWater(0, 1)).toBe(true);
    });

    it('should return false when no water is adjacent', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Tree, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.hasAdjacentWater(1, 1)).toBe(false);
    });

    it('should not count the tile itself as adjacent', () => {
      const map = createTestMap([
        [Terrain.Water, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // Water at (0, 0) - checking itself should not count
      expect(queries.hasAdjacentWater(0, 0)).toBe(false);
    });

    it('should handle out-of-bounds adjacent checks gracefully', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // Edge tile checking for water - no water nearby
      expect(queries.hasAdjacentWater(0, 0)).toBe(false);
      expect(queries.hasAdjacentWater(1, 1)).toBe(false);
    });
  });

  describe('hasAdjacentWaterAtPosition', () => {
    it('should convert world position to tile and check adjacent water', () => {
      const map = createTestMap([
        [Terrain.Water, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // World position (48, 48) is tile (1, 1)
      // Water is at tile (0, 0) which is diagonal
      expect(queries.hasAdjacentWaterAtPosition(48, 48)).toBe(true);

      // World position (48, 16) is tile (1, 0)
      // Water is at tile (0, 0) which is adjacent
      expect(queries.hasAdjacentWaterAtPosition(48, 16)).toBe(true);
    });
  });

  describe('getAdjacentTilesOfType', () => {
    it('should return all adjacent tiles of specified type', () => {
      const map = createTestMap([
        [Terrain.Water, Terrain.Water, Terrain.Grass],
        [Terrain.Water, Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // From center (1, 1), adjacent water tiles are at:
      // (0, 0), (1, 0), (0, 1)
      const waterTiles = queries.getAdjacentTilesOfType(1, 1, Terrain.Water);
      expect(waterTiles).toHaveLength(3);
      expect(waterTiles).toContainEqual({ x: 0, y: 0 });
      expect(waterTiles).toContainEqual({ x: 1, y: 0 });
      expect(waterTiles).toContainEqual({ x: 0, y: 1 });
    });

    it('should return empty array when no adjacent tiles match', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Tree, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      const waterTiles = queries.getAdjacentTilesOfType(1, 1, Terrain.Water);
      expect(waterTiles).toHaveLength(0);
    });

    it('should not include the center tile', () => {
      const map = createTestMap([
        [Terrain.Water, Terrain.Water],
        [Terrain.Water, Terrain.Water],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      const waterTiles = queries.getAdjacentTilesOfType(1, 1, Terrain.Water);
      // Should only return (0,0), (1,0), (0,1) - not (1,1) itself
      expect(waterTiles).toHaveLength(3);
      expect(waterTiles).not.toContainEqual({ x: 1, y: 1 });
    });
  });

  describe('clampToBounds', () => {
    it('should clamp coordinates within map bounds', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // Within bounds - should not change
      const clamped = queries.clampToBounds(64, 64);
      expect(clamped.x).toBe(64);
      expect(clamped.y).toBe(64);
    });

    it('should clamp coordinates below minimum', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // Below minimum (tileSize = 32, minY = tileSize + 30 = 62)
      const clamped = queries.clampToBounds(0, 0);
      expect(clamped.x).toBe(32); // minX
      expect(clamped.y).toBe(62); // minY (32 + 30)
    });

    it('should clamp coordinates above maximum', () => {
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);
      const queries = new TerrainQueries(map, undefined, 32);

      // Above maximum - clampToBounds applies: Math.max(min, Math.min(value, max))
      // For a 2x2 map with 32px tiles:
      // maxX = 2 * 32 - 32 = 32, maxY = 2 * 32 - 32 = 32
      // minX = 32, minY = 32 + 30 = 62
      const clamped = queries.clampToBounds(1000, 1000);
      expect(clamped.x).toBe(32); // maxX
      expect(clamped.y).toBe(62); // minY takes precedence for y
    });
  });

  describe('getMap', () => {
    it('should return the map data', () => {
      const map = createTestMap([[Terrain.Grass]]);
      const queries = new TerrainQueries(map, undefined, 32);

      expect(queries.getMap()).toBe(map);
    });
  });

  describe('getTileSize', () => {
    it('should return the tile size', () => {
      const queries = new TerrainQueries(createTestMap([]), undefined, 64);

      expect(queries.getTileSize()).toBe(64);
    });

    it('should default to 32', () => {
      const queries = new TerrainQueries(createTestMap([]));

      expect(queries.getTileSize()).toBe(32);
    });
  });

  describe('setMap', () => {
    it('should update the map data', () => {
      const map1 = createTestMap([[Terrain.Grass]]);
      const map2 = createTestMap([[Terrain.Water]]);
      const queries = new TerrainQueries(map1, undefined, 32);

      expect(queries.getTerrainAt(0, 0)).toBe(Terrain.Grass);

      queries.setMap(map2);

      expect(queries.getTerrainAt(0, 0)).toBe(Terrain.Water);
    });
  });

  describe('DEFAULT_WALKABILITY', () => {
    it('should block Tree and Water by default', () => {
      expect(DEFAULT_WALKABILITY.blockedTerrains).toContain(Terrain.Tree);
      expect(DEFAULT_WALKABILITY.blockedTerrains).toContain(Terrain.Water);
      expect(DEFAULT_WALKABILITY.blockedTerrains).not.toContain(Terrain.Grass);
      expect(DEFAULT_WALKABILITY.blockedTerrains).not.toContain(Terrain.TallGrass);
      expect(DEFAULT_WALKABILITY.blockedTerrains).not.toContain(Terrain.Path);
    });
  });
});
