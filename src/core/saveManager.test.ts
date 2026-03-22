import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveGame, loadGame, deleteSave, hasSave } from './saveManager';
import { SaveData, SAVE_VERSION, ItemType } from './types';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('saveManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('saveGame and loadGame', () => {
    it('saves and loads game data correctly', () => {
      const saveData: SaveData = {
        party: [],
        box: [],
        playerName: 'TestPlayer',
        playerX: 100,
        playerY: 200,
        wins: 5,
        caught: 3,
        items: [ItemType.FishingRod],
        version: SAVE_VERSION,
      };

      saveGame(saveData);
      const loaded = loadGame();

      expect(loaded).not.toBeNull();
      expect(loaded?.playerName).toBe('TestPlayer');
      expect(loaded?.playerX).toBe(100);
      expect(loaded?.playerY).toBe(200);
      expect(loaded?.wins).toBe(5);
      expect(loaded?.caught).toBe(3);
      expect(loaded?.items).toContain(ItemType.FishingRod);
    });

    it('returns null when no save exists', () => {
      expect(loadGame()).toBeNull();
    });

    it('migrates old saves without items array', () => {
      // Simulate an old save without items
      const oldSave = {
        party: [],
        box: [],
        playerName: 'OldPlayer',
        playerX: 50,
        playerY: 50,
        wins: 1,
        caught: 1,
        version: 1,
      };
      localStorageMock.setItem('tiny_creatures_save', JSON.stringify(oldSave));

      const loaded = loadGame();
      expect(loaded).not.toBeNull();
      expect(loaded?.items).toEqual([]);
      expect(loaded?.version).toBe(SAVE_VERSION);
    });

    it('handles save errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock setItem to throw
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => { throw new Error('Storage full'); };

      const saveData: SaveData = {
        party: [],
        box: [],
        playerName: 'Test',
        playerX: 0,
        playerY: 0,
        wins: 0,
        caught: 0,
        items: [],
        version: SAVE_VERSION,
      };
      
      // Should not throw
      expect(() => saveGame(saveData)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('handles load errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Set invalid JSON
      localStorageMock.setItem('tiny_creatures_save', 'not valid json');

      const result = loadGame();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('hasSave', () => {
    it('returns false when no save exists', () => {
      expect(hasSave()).toBe(false);
    });

    it('returns true when save exists', () => {
      const saveData: SaveData = {
        party: [],
        box: [],
        playerName: 'Test',
        playerX: 0,
        playerY: 0,
        wins: 0,
        caught: 0,
        items: [],
        version: SAVE_VERSION,
      };
      saveGame(saveData);
      expect(hasSave()).toBe(true);
    });
  });

  describe('deleteSave', () => {
    it('removes saved game', () => {
      const saveData: SaveData = {
        party: [],
        box: [],
        playerName: 'Test',
        playerX: 0,
        playerY: 0,
        wins: 0,
        caught: 0,
        items: [],
        version: SAVE_VERSION,
      };
      saveGame(saveData);
      expect(hasSave()).toBe(true);

      deleteSave();
      expect(hasSave()).toBe(false);
      expect(loadGame()).toBeNull();
    });
  });

  describe('version handling', () => {
    it('rejects saves with version higher than current', () => {
      const futureSave = {
        party: [],
        box: [],
        playerName: 'FuturePlayer',
        playerX: 0,
        playerY: 0,
        wins: 0,
        caught: 0,
        items: [],
        version: 999,
      };
      localStorageMock.setItem('tiny_creatures_save', JSON.stringify(futureSave));

      expect(loadGame()).toBeNull();
    });

    it('rejects saves without version', () => {
      const noVersionSave = {
        party: [],
        box: [],
        playerName: 'NoVersion',
        playerX: 0,
        playerY: 0,
        wins: 0,
        caught: 0,
      };
      localStorageMock.setItem('tiny_creatures_save', JSON.stringify(noVersionSave));

      expect(loadGame()).toBeNull();
    });
  });
});
