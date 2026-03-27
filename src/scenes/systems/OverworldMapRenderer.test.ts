import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// Mock Phaser before importing modules that depend on it
vi.mock('phaser', () => ({
  default: {},
}));

import { OverworldMapRenderer, DEFAULT_RENDER_CONFIG, MapRenderConfig } from './OverworldMapRenderer';
import { Terrain, TERRAIN_COLORS } from './EncounterSystem';
import { GeneratedMap } from './OverworldMapGenerator';

// Mock Phaser
const mockGraphics = {
  fillStyle: vi.fn().mockReturnThis(),
  fillRect: vi.fn().mockReturnThis(),
  fillCircle: vi.fn().mockReturnThis(),
  lineStyle: vi.fn().mockReturnThis(),
  beginPath: vi.fn().mockReturnThis(),
  moveTo: vi.fn().mockReturnThis(),
  lineTo: vi.fn().mockReturnThis(),
  strokePath: vi.fn().mockReturnThis(),
  destroy: vi.fn(),
};

const mockScene = {
  add: {
    graphics: vi.fn().mockReturnValue(mockGraphics),
  },
};

describe('OverworldMapRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createTestMap(terrain: Terrain[][]): GeneratedMap {
    return {
      terrain,
      width: terrain[0]?.length ?? 0,
      height: terrain.length,
    };
  }

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);

      expect(renderer.getTileSize()).toBe(DEFAULT_RENDER_CONFIG.tileSize);
    });

    it('should initialize with custom config', () => {
      const customConfig: MapRenderConfig = {
        tileSize: 64,
        detailColors: DEFAULT_RENDER_CONFIG.detailColors,
      };
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene, customConfig);

      expect(renderer.getTileSize()).toBe(64);
    });
  });

  describe('render', () => {
    it('should create graphics object', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Grass]]);

      renderer.render(map);

      expect(mockScene.add.graphics).toHaveBeenCalledTimes(1);
    });

    it('should render grass with correct color', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Grass]]);

      renderer.render(map);

      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.Grass], 1);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(0, 0, 32, 32);
    });

    it('should render all terrain types with correct colors', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([
        [Terrain.Grass, Terrain.TallGrass],
        [Terrain.Tree, Terrain.Water],
        [Terrain.Path, Terrain.Grass],
      ]);

      renderer.render(map);

      // Verify each terrain color was used (at least once for each terrain type)
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.Grass], 1);
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.TallGrass], 1);
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.Tree], 1);
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.Water], 1);
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.Path], 1);
    });

    it('should render at correct positions based on tile size', () => {
      const customConfig: MapRenderConfig = {
        tileSize: 64,
        detailColors: DEFAULT_RENDER_CONFIG.detailColors,
      };
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene, customConfig);
      const map = createTestMap([
        [Terrain.Grass, Terrain.Grass],
        [Terrain.Grass, Terrain.Grass],
      ]);

      renderer.render(map);

      // Check positions for 2x2 grid with 64px tiles
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(0, 0, 64, 64);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(64, 0, 64, 64);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(0, 64, 64, 64);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(64, 64, 64, 64);
    });

    it('should add detail to tall grass tiles', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.TallGrass]]);

      renderer.render(map);

      // Should fill base color first
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.TallGrass], 1);

      // Should draw three grass blades with detail color
      const detailCalls = (mockGraphics.fillStyle as MockedFunction<typeof mockGraphics.fillStyle>).mock.calls.filter(
        (call) => call[0] === DEFAULT_RENDER_CONFIG.detailColors.tallGrass
      );
      expect(detailCalls.length).toBeGreaterThanOrEqual(1);

      // Should have fillRect calls for grass blades
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(4, 4, 3, 12);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(14, 2, 3, 14);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(24, 6, 3, 10);
    });

    it('should add detail to tree tiles', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Tree]]);

      renderer.render(map);

      // Should fill base color first
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.Tree], 1);

      // Should draw trunk with tree trunk color
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(DEFAULT_RENDER_CONFIG.detailColors.treeTrunk, 1);
      expect(mockGraphics.fillRect).toHaveBeenCalledWith(12, 18, 8, 14);

      // Should draw leaves with tree leaves color
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(DEFAULT_RENDER_CONFIG.detailColors.treeLeaves, 1);
      expect(mockGraphics.fillCircle).toHaveBeenCalledWith(16, 14, 12);
    });

    it('should add detail to water tiles', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Water]]);

      renderer.render(map);

      // Should fill base color first
      expect(mockGraphics.fillStyle).toHaveBeenCalledWith(TERRAIN_COLORS[Terrain.Water], 1);

      // Should draw wave lines
      expect(mockGraphics.lineStyle).toHaveBeenCalledWith(1, DEFAULT_RENDER_CONFIG.detailColors.waterWave, 0.4);
      expect(mockGraphics.beginPath).toHaveBeenCalled();
      expect(mockGraphics.moveTo).toHaveBeenCalledWith(4, 16);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(12, 12);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(20, 16);
      expect(mockGraphics.lineTo).toHaveBeenCalledWith(28, 12);
      expect(mockGraphics.strokePath).toHaveBeenCalled();
    });

    it('should not add detail to grass or path tiles', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([
        [Terrain.Grass, Terrain.Path],
      ]);

      renderer.render(map);

      // Should only have base color fill, no extra detail calls
      // The fillRect count should be exactly 2 (one per tile)
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(2);
    });

    it('should destroy previous graphics when rendering again', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Grass]]);

      renderer.render(map);
      renderer.render(map);

      expect(mockGraphics.destroy).toHaveBeenCalledTimes(1);
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(2);
    });

    it('should return the graphics object', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Grass]]);

      const result = renderer.render(map);

      expect(result).toBe(mockGraphics);
    });

    it('should handle empty map', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([]);

      expect(() => renderer.render(map)).not.toThrow();
    });

    it('should handle single row map', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Grass, Terrain.Path, Terrain.Grass]]);

      renderer.render(map);

      // Only base tiles, no detail (Grass and Path have no detail)
      expect(mockGraphics.fillRect).toHaveBeenCalledTimes(3);
    });
  });

  describe('destroy', () => {
    it('should destroy the graphics object', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Grass]]);

      renderer.render(map);
      renderer.destroy();

      expect(mockGraphics.destroy).toHaveBeenCalledTimes(1);
    });

    it('should not throw when destroying without rendering', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);

      expect(() => renderer.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls gracefully', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);
      const map = createTestMap([[Terrain.Grass]]);

      renderer.render(map);
      renderer.destroy();
      renderer.destroy(); // Second destroy should not throw

      expect(mockGraphics.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTileSize', () => {
    it('should return default tile size', () => {
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene);

      expect(renderer.getTileSize()).toBe(32);
    });

    it('should return custom tile size', () => {
      const customConfig: MapRenderConfig = {
        tileSize: 48,
        detailColors: DEFAULT_RENDER_CONFIG.detailColors,
      };
      const renderer = new OverworldMapRenderer(mockScene as unknown as Phaser.Scene, customConfig);

      expect(renderer.getTileSize()).toBe(48);
    });
  });

  describe('DEFAULT_RENDER_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_RENDER_CONFIG.tileSize).toBe(32);
      expect(DEFAULT_RENDER_CONFIG.detailColors.tallGrass).toBe(0x388e3c);
      expect(DEFAULT_RENDER_CONFIG.detailColors.treeTrunk).toBe(0x795548);
      expect(DEFAULT_RENDER_CONFIG.detailColors.treeLeaves).toBe(0x2e7d32);
      expect(DEFAULT_RENDER_CONFIG.detailColors.waterWave).toBe(0x64b5f6);
    });
  });
});
