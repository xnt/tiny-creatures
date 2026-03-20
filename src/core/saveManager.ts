import { SaveData, SAVE_VERSION } from './types';

const SAVE_KEY = 'tiny_creatures_save';

export function saveGame(data: SaveData): void {
  try {
    const json = JSON.stringify({ ...data, version: SAVE_VERSION });
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) {
      console.warn('Save version mismatch, starting fresh.');
      return null;
    }
    return data;
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