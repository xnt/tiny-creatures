import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser before importing modules that depend on it
vi.mock('phaser', () => ({
  default: {},
}));

import {
  generateOverworldMap,
  OverworldMapGenerator,
  DEFAULT_MAP_CONFIG,
  MapGenerationConfig,
  GeneratedMap,
} from './OverworldMapGenerator';
import { Terrain } from './EncounterSystem';
import { MockRandomSource, SeededRandomSource } from '../../core/random';

describe('OverworldMapGenerator', () => {
  describe('generateOverworldMap', () => {
    it('should generate a map with correct dimensions', () => {
      const mockRandom = new MockRandomSource([0.5]); // Always generates grass
      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, 100, 100, 32);

      expect(map.width).toBe(DEFAULT_MAP_CONFIG.width);
      expect(map.height).toBe(DEFAULT_MAP_CONFIG.height);
      expect(map.terrain.length).toBe(DEFAULT_MAP_CONFIG.height);
      expect(map.terrain[0].length).toBe(DEFAULT_MAP_CONFIG.width);
    });

    it('should always place trees on borders', () => {
      const mockRandom = new MockRandomSource([0.5]); // Would generate grass
      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, 100, 100, 32);

      // Check all borders
      for (let x = 0; x < map.width; x++) {
        expect(map.terrain[0][x]).toBe(Terrain.Tree); // Top border
        expect(map.terrain[map.height - 1][x]).toBe(Terrain.Tree); // Bottom border
      }
      for (let y = 0; y < map.height; y++) {
        expect(map.terrain[y][0]).toBe(Terrain.Tree); // Left border
        expect(map.terrain[y][map.width - 1]).toBe(Terrain.Tree); // Right border
      }
    });

    it('should generate trees when random value is below tree threshold', () => {
      const mockRandom = new MockRandomSource([0.05]); // Below 0.08 tree threshold
      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, 1000, 1000, 32);

      // Check a non-border tile
      expect(map.terrain[5][5]).toBe(Terrain.Tree);
    });

    it('should generate water when random value is between tree and water thresholds', () => {
      const mockRandom = new MockRandomSource([0.10]); // Between 0.08 and 0.14
      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, 1000, 1000, 32);

      expect(map.terrain[5][5]).toBe(Terrain.Water);
    });

    it('should generate tall grass when random value is between water and tallGrass thresholds', () => {
      const mockRandom = new MockRandomSource([0.25]); // Between 0.14 and 0.40
      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, 1000, 1000, 32);

      expect(map.terrain[5][5]).toBe(Terrain.TallGrass);
    });

    it('should generate path when random value is between tallGrass and path thresholds', () => {
      const mockRandom = new MockRandomSource([0.45]); // Between 0.40 and 0.55
      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, 1000, 1000, 32);

      expect(map.terrain[5][5]).toBe(Terrain.Path);
    });

    it('should generate grass when random value is above path threshold', () => {
      const mockRandom = new MockRandomSource([0.60]); // Above 0.55
      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, 1000, 1000, 32);

      expect(map.terrain[5][5]).toBe(Terrain.Grass);
    });

    it('should clear player start area to grass', () => {
      const mockRandom = new MockRandomSource([0.05]); // Would generate trees
      const playerX = 5 * 32; // Tile 5
      const playerY = 5 * 32; // Tile 5
      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, playerX, playerY, 32);

      // Check the 3x3 area around player start
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = 5 + dx;
          const ty = 5 + dy;
          expect(map.terrain[ty][tx]).toBe(Terrain.Grass);
        }
      }
    });

    it('should be deterministic with the same seed', () => {
      const seed = 12345;
      const random1 = new SeededRandomSource(seed);
      const random2 = new SeededRandomSource(seed);

      const map1 = generateOverworldMap(random1, DEFAULT_MAP_CONFIG, 100, 100, 32);
      const map2 = generateOverworldMap(random2, DEFAULT_MAP_CONFIG, 100, 100, 32);

      expect(map1.terrain).toEqual(map2.terrain);
    });

    it('should generate different maps with different seeds', () => {
      const random1 = new SeededRandomSource(12345);
      const random2 = new SeededRandomSource(54321);

      const map1 = generateOverworldMap(random1, DEFAULT_MAP_CONFIG, 1000, 1000, 32);
      const map2 = generateOverworldMap(random2, DEFAULT_MAP_CONFIG, 1000, 1000, 32);

      // Maps should be different (with very high probability)
      let differences = 0;
      for (let y = 1; y < map1.height - 1; y++) {
        for (let x = 1; x < map1.width - 1; x++) {
          if (map1.terrain[y][x] !== map2.terrain[y][x]) {
            differences++;
          }
        }
      }
      expect(differences).toBeGreaterThan(0);
    });

    it('should respect custom dimensions', () => {
      const mockRandom = new MockRandomSource([0.5]);
      const customConfig: MapGenerationConfig = {
        width: 10,
        height: 8,
        probabilities: DEFAULT_MAP_CONFIG.probabilities,
      };

      const map = generateOverworldMap(mockRandom, customConfig, 100, 100, 32);

      expect(map.width).toBe(10);
      expect(map.height).toBe(8);
      expect(map.terrain.length).toBe(8);
      expect(map.terrain[0].length).toBe(10);
    });

    it('should respect custom probabilities', () => {
      // High tree probability
      const mockRandom = new MockRandomSource([0.5]);
      const customConfig: MapGenerationConfig = {
        width: 10,
        height: 10,
        probabilities: {
          tree: 0.60,      // 60% trees
          water: 0.70,     // 10% water
          tallGrass: 0.80, // 10% tall grass
          path: 0.90,      // 10% path
          // 10% grass
        },
      };

      const map = generateOverworldMap(mockRandom, customConfig, 1000, 1000, 32);

      // With random value 0.5, should get tree (0.5 < 0.60)
      expect(map.terrain[5][5]).toBe(Terrain.Tree);
    });

    it('should handle edge case where player start is at map edge', () => {
      const mockRandom = new MockRandomSource([0.05]); // Would generate trees
      const playerX = 32; // Near left edge (tile 1)
      const playerY = 32; // Near top edge (tile 1)

      const map = generateOverworldMap(mockRandom, DEFAULT_MAP_CONFIG, playerX, playerY, 32);

      // Should not throw and should clear valid tiles
      expect(map.terrain[1][1]).toBe(Terrain.Grass);
    });
  });

  describe('OverworldMapGenerator class', () => {
    let mockRandom: MockRandomSource;

    beforeEach(() => {
      mockRandom = new MockRandomSource([0.5]);
    });

    it('should generate maps with injected random source', () => {
      const generator = new OverworldMapGenerator(mockRandom);
      const map = generator.generate(100, 100, 32);

      expect(map.width).toBe(DEFAULT_MAP_CONFIG.width);
      expect(map.height).toBe(DEFAULT_MAP_CONFIG.height);
    });

    it('should use custom config when provided', () => {
      const customConfig: MapGenerationConfig = {
        width: 15,
        height: 12,
        probabilities: DEFAULT_MAP_CONFIG.probabilities,
      };

      const generator = new OverworldMapGenerator(mockRandom, customConfig);
      const map = generator.generate(100, 100, 32);

      expect(map.width).toBe(15);
      expect(map.height).toBe(12);
    });

    it('should return config copy from getConfig', () => {
      const generator = new OverworldMapGenerator(mockRandom);
      const config1 = generator.getConfig();
      const config2 = generator.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object references
    });

    it('should generate different maps on subsequent calls', () => {
      const seededRandom = new SeededRandomSource(12345);
      const generator = new OverworldMapGenerator(seededRandom);

      const map1 = generator.generate(1000, 1000, 32);
      const map2 = generator.generate(1000, 1000, 32);

      // With a seeded random, subsequent calls should produce different results
      // because the random sequence advances
      let identical = true;
      for (let y = 1; y < map1.height - 1; y++) {
        for (let x = 1; x < map1.width - 1; x++) {
          if (map1.terrain[y][x] !== map2.terrain[y][x]) {
            identical = false;
            break;
          }
        }
        if (!identical) break;
      }
      expect(identical).toBe(false);
    });
  });

  describe('DEFAULT_MAP_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_MAP_CONFIG.width).toBe(25);
      expect(DEFAULT_MAP_CONFIG.height).toBe(19);
      expect(DEFAULT_MAP_CONFIG.probabilities).toEqual({
        tree: 0.08,
        water: 0.14,
        tallGrass: 0.40,
        path: 0.55,
      });
    });

    it('should have valid probability ranges', () => {
      const probs = DEFAULT_MAP_CONFIG.probabilities;
      expect(probs.tree).toBeGreaterThanOrEqual(0);
      expect(probs.tree).toBeLessThanOrEqual(1);
      expect(probs.water).toBeGreaterThanOrEqual(probs.tree);
      expect(probs.tallGrass).toBeGreaterThanOrEqual(probs.water);
      expect(probs.path).toBeGreaterThanOrEqual(probs.tallGrass);
      expect(probs.path).toBeLessThanOrEqual(1);
    });
  });
});
