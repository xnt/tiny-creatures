import { SaveData, SAVE_VERSION, ItemType } from './types';

const SAVE_KEY = 'tiny_creatures_save';

export function saveGame(data: SaveData): void {
  try {
    const json = JSON.stringify({ ...data, version: SAVE_VERSION });
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

/** Migrate older save versions to current version */
function migrateSave(data: Record<string, unknown>): SaveData {
  // Ensure items array exists (added in version 2)
  if (!data.items || !Array.isArray(data.items)) {
    data.items = [];
  }
  return data as unknown as SaveData;
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: Record<string, unknown> = JSON.parse(raw);

    // Handle version migrations
    const saveVersion = data.version as number;
    if (saveVersion === undefined || saveVersion > SAVE_VERSION) {
      console.warn('Save version incompatible, starting fresh.');
      return null;
    }

    // Migrate older versions
    const migrated = migrateSave(data);
    migrated.version = SAVE_VERSION;

    return migrated;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}